import logging
from typing import List, Optional
from datetime import datetime, timezone
import time
from email.utils import parsedate_to_datetime
import feedparser
from bs4 import BeautifulSoup
from fastapi import APIRouter, Query
from pydantic import BaseModel

router = APIRouter()
logger = logging.getLogger(__name__)

class NewsItem(BaseModel):
    id: str
    title: str
    description: str
    link: str
    source: str
    publishedAt: str
    imageUrl: Optional[str] = None
    timeAgo: str

# RSS feeds map
RSS_FEEDS = {
    "THE HACKER NEWS": "https://feeds.feedburner.com/TheHackersNews",
    "KREBS ON SECURITY": "https://krebsonsecurity.com/feed/",
    "BLEEPINGCOMPUTER": "https://www.bleepingcomputer.com/feed/",
    "SECURITYWEEK": "https://feeds.feedburner.com/Securityweek",
    "DARK READING": "https://www.darkreading.com/rss.xml"
}

FALLBACK_IMAGES = {
    "THE HACKER NEWS": "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?q=80&w=800&auto=format&fit=crop",
    "KREBS ON SECURITY": "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=800&auto=format&fit=crop",
    "BLEEPINGCOMPUTER": "https://images.unsplash.com/photo-1563206767-5b18f218e8de?q=80&w=800&auto=format&fit=crop",
    "SECURITYWEEK": "https://images.unsplash.com/photo-1614064641936-38204b3ce577?q=80&w=800&auto=format&fit=crop",
    "DARK READING": "https://images.unsplash.com/photo-1510511459019-5d01a80fad35?q=80&w=800&auto=format&fit=crop"
}

# Simple in-memory cache
news_cache = {
    "data": [],
    "last_fetched": 0
}
CACHE_TTL = 600  # 10 minutes

def clean_html(raw_html: str) -> str:
    if not raw_html:
        return ""
    try:
        soup = BeautifulSoup(raw_html, "html.parser")
        return soup.get_text(separator=' ', strip=True)
    except Exception:
        return raw_html

def check_valid_url(url: str) -> Optional[str]:
    if not url: return None
    if "feedburner.com/~r/" in url: return None
    if url.startswith("//"): return "https:" + url
    if url.startswith("http"): return url
    return None

def extract_image(entry: dict, raw_html: str) -> Optional[str]:
    # Try media_content
    if 'media_content' in entry and len(entry.media_content) > 0:
        for media in entry.media_content:
            if 'url' in media:
                valid = check_valid_url(media['url'])
                if valid: return valid
                
    # Try enclosures
    if 'enclosures' in entry and len(entry.enclosures) > 0:
        for enclosure in entry.enclosures:
            if 'href' in enclosure and 'image' in enclosure.get('type', ''):
                valid = check_valid_url(enclosure['href'])
                if valid: return valid
                
    # Try parsing HTML from description
    if raw_html:
        try:
            soup = BeautifulSoup(raw_html, 'html.parser')
            for img_tag in soup.find_all('img'):
                if img_tag.get('width') == '1' or img_tag.get('height') == '1': continue
                if 'src' in img_tag.attrs:
                    valid = check_valid_url(img_tag['src'])
                    if valid: return valid
        except Exception:
            pass

    # Try parsing HTML from content:encoded
    if 'content' in entry and len(entry.content) > 0:
        try:
            content_html = entry.content[0].get('value', '')
            soup = BeautifulSoup(content_html, 'html.parser')
            for img_tag in soup.find_all('img'):
                if img_tag.get('width') == '1' or img_tag.get('height') == '1': continue
                if 'src' in img_tag.attrs:
                    valid = check_valid_url(img_tag['src'])
                    if valid: return valid
        except Exception:
            pass
            
    return None

def get_time_ago(dt: datetime) -> str:
    now = datetime.now(timezone.utc)
    diff = now - dt
    
    seconds = diff.total_seconds()
    
    if seconds < 60:
        return f"{int(seconds)}s ago"
    elif seconds < 3600:
        return f"{int(seconds / 60)}m ago"
    elif seconds < 86400:
        return f"{int(seconds / 3600)}h ago"
    else:
        return f"{int(seconds / 86400)}d ago"

def fetch_and_parse_feeds() -> List[dict]:
    all_articles = []
    
    for source_name, url in RSS_FEEDS.items():
        try:
            feed = feedparser.parse(url)
            for entry in feed.entries:
                # Parse date
                pub_date = None
                if hasattr(entry, 'published'):
                    try:
                        pub_date = parsedate_to_datetime(entry.published)
                    except Exception:
                        pass
                        
                if not pub_date:
                    pub_date = datetime.now(timezone.utc) # fallback
                
                # Ensure it's timezone aware
                if pub_date.tzinfo is None:
                    pub_date = pub_date.replace(tzinfo=timezone.utc)
                
                # Content
                raw_desc = entry.get('summary', '') or entry.get('description', '')
                clean_desc = clean_html(raw_desc)
                
                # Image extraction
                image_url = extract_image(entry, raw_desc)
                
                # Only include articles that have a native image!
                if not image_url:
                    continue
                
                # Truncate description
                if len(clean_desc) > 150:
                    clean_desc = clean_desc[:147] + "..."
                    
                article = {
                    "id": entry.get('id', entry.get('link', str(time.time()))),
                    "title": entry.get('title', 'Unknown Title'),
                    "description": clean_desc,
                    "link": entry.get('link', '#'),
                    "source": source_name,
                    "publishedAt": pub_date.isoformat(),
                    "dt": pub_date,  # Used for sorting
                    "imageUrl": image_url,
                    "timeAgo": get_time_ago(pub_date)
                }
                all_articles.append(article)
                
        except Exception as e:
            logger.error(f"Error fetching {source_name}: {e}")
            
    # Sort completely by date descending
    all_articles.sort(key=lambda x: x['dt'], reverse=True)
    return all_articles

def get_news_data() -> List[dict]:
    global news_cache
    now = time.time()
    
    # Refresh cache if expired or empty
    if now - news_cache["last_fetched"] > 30 or not news_cache["data"]:
        logger.info("Refreshing news cache from RSS feeds")
        articles = fetch_and_parse_feeds()
        news_cache["data"] = articles
        news_cache["last_fetched"] = now
        
    # Always update the 'timeAgo' string dynamically since time passes
    current_articles = []
    for article in news_cache["data"]:
        updated_article = dict(article)
        updated_article["timeAgo"] = get_time_ago(article["dt"])
        current_articles.append(updated_article)
        
    return current_articles

@router.get("/")
async def get_cyber_news(
    limit: int = Query(10, ge=1, le=50),
    page: int = Query(1, ge=1),
    source: Optional[str] = Query(None),
    search: Optional[str] = Query(None)
):
    """
    Get aggregated cybersecurity news with pagination.
    """
    all_articles = get_news_data()
    
    # Filter by source
    if source and source != "ALL":
        source_upper = source.upper()
        # Handle "THE HACKER NEWS" matching "THE HACKER NEWS" etc
        all_articles = [a for a in all_articles if a["source"] == source_upper]
        
    # Filter by search
    if search:
        search_lower = search.lower()
        all_articles = [a for a in all_articles if search_lower in a["title"].lower() or search_lower in a["description"].lower()]
        
    # Paginate
    total = len(all_articles)
    start_idx = (page - 1) * limit
    end_idx = start_idx + limit
    paginated = all_articles[start_idx:end_idx]
    
    # Remove internal 'dt' before returning
    results = []
    for article in paginated:
        safe_a = {k: v for k, v in article.items() if k != 'dt'}
        results.append(NewsItem(**safe_a))
        
    return {
        "items": results,
        "total": total,
        "page": page,
        "limit": limit,
        "hasMore": end_idx < total
    }
