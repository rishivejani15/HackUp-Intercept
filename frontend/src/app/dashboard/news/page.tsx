"use client";

import React, { useState, useEffect, useCallback } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import IntelTicker from "@/components/dashboard/news/IntelTicker";
import ArticleDossier from "@/components/dashboard/news/ArticleDossier";
import { 
  Globe, 
  ExternalLink, 
  Shield, 
  Search, 
  Filter, 
  Clock, 
  Zap, 
  AlertTriangle,
  Loader2,
  Cpu,
  Fingerprint,
  Target
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useInView } from "react-intersection-observer";

// Defining the types that correspond to our new backend router
export interface NewsItem {
  id: string;
  title: string;
  description: string;
  link: string;
  source: string;
  publishedAt: string;
  imageUrl?: string;
  timeAgo: string;
}

// Map each specific source to a brand color strategy
const SOURCE_STYLES: Record<string, { brand: string, text: string, bg: string, border: string }> = {
  "THE HACKER NEWS": { brand: "text-[#00ff00]", text: "text-[#00ff00]", bg: "bg-[#00ff00]/10", border: "border-[#00ff00]/20" },
  "KREBS ON SECURITY": { brand: "text-[#00f0ff]", text: "text-[#00f0ff]", bg: "bg-[#00f0ff]/10", border: "border-[#00f0ff]/20" },
  "BLEEPINGCOMPUTER": { brand: "text-[#b200ff]", text: "text-[#b200ff]", bg: "bg-[#b200ff]/10", border: "border-[#b200ff]/20" },
  "SECURITYWEEK": { brand: "text-[#ffaa00]", text: "text-[#ffaa00]", bg: "bg-[#ffaa00]/10", border: "border-[#ffaa00]/20" },
  "DARK READING": { brand: "text-[#ff0055]", text: "text-[#ff0055]", bg: "bg-[#ff0055]/10", border: "border-[#ff0055]/20" }
};

const DEFAULT_STYLE = { brand: "text-primary", text: "text-primary", bg: "bg-primary/10", border: "border-primary/20" };

// Utility to determine risk level based on content
const getRiskLevel = (text: string) => {
   const criticalKeywords = ["zero-day", "exploit", "critical", "vulnerability", "rce", "breach", "ransomware", "unpatched"];
   const warningKeywords = ["phishing", "malware", "leak", "vulnerable", "warning", "flaw", "attack"];
   
   const lowerText = text.toLowerCase();
   if (criticalKeywords.some(k => lowerText.includes(k))) return "CRITICAL";
   if (warningKeywords.some(k => lowerText.includes(k))) return "WARNING";
   return "INFO";
}

const ArticleCard = ({ item, onClick }: { item: NewsItem, onClick: () => void }) => {
  const styles = SOURCE_STYLES[item.source] || DEFAULT_STYLE;
  const risk = getRiskLevel(item.title + " " + item.description);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      onClick={onClick}
      className={cn(
        "glass-card rounded-[1.8rem] border transition-all group relative flex flex-col h-full bg-[#0B0E14] overflow-hidden cursor-pointer",
        styles.border,
        "hover:bg-white/[0.04] hover:-translate-y-1 active:scale-[0.98]"
      )}
    >
      {/* Risk Badge Overlay */}
      <div className="absolute top-4 right-4 z-20">
         <div className={cn(
            "px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest border",
            risk === "CRITICAL" ? "bg-error/20 text-error border-error/30 animate-pulse" : 
            risk === "WARNING" ? "bg-warning/20 text-warning border-warning/30" : 
            "bg-secondary/20 text-secondary border-secondary/30"
         )}>
            {risk}
         </div>
      </div>

      {item.imageUrl && (
        <div className="h-44 w-full overflow-hidden border-b border-white/5 relative">
          <img 
            src={item.imageUrl} 
            alt={item.title} 
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0B0E14] to-transparent opacity-40"></div>
        </div>
      )}

      <div className="p-6 flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div className={cn(
            "px-2.5 py-1 rounded-lg text-[9px] font-bold tracking-[0.1em]",
            styles.bg,
            styles.text
          )}>
            {item.source}
          </div>
          <div className="flex items-center space-x-1.5 text-[10px] font-bold text-muted-foreground/50 tracking-wider font-mono">
            <Clock size={12} />
            <span>{item.timeAgo}</span>
          </div>
        </div>

        <div className="flex-1 space-y-3">
          <h2 className="text-md font-bold font-space tracking-tight leading-snug text-white/90 group-hover:text-white transition-colors line-clamp-3">
            {item.title}
          </h2>
          <p className="text-[11px] text-muted-foreground/70 font-medium leading-relaxed line-clamp-3">
            {item.description}
          </p>
        </div>

        <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
               <span className={cn("text-[8px] font-bold uppercase tracking-[0.2em]", styles.text)}>Forensic DOSSIER</span>
               <ExternalLink size={10} className={cn(styles.text)} />
            </div>
            <div className="flex -space-x-1">
               <div className="h-4 w-4 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                  <Fingerprint size={8} className="text-muted-foreground" />
               </div>
               <div className="h-4 w-4 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                  <Target size={8} className="text-muted-foreground" />
               </div>
            </div>
        </div>
      </div>
      
      <div className={cn("absolute -bottom-1 -right-1 h-32 w-32 blur-[60px] opacity-10 pointer-events-none transition-opacity group-hover:opacity-20", styles.bg)} />
    </motion.div>
  );
};

const SOURCES = ["ALL", "THE HACKER NEWS", "KREBS ON SECURITY", "BLEEPINGCOMPUTER", "SECURITYWEEK", "DARK READING"];

export default function NewsPage() {
  const [filter, setFilter] = useState<string>("ALL");
  const [search, setSearch] = useState<string>("");
  const [articles, setArticles] = useState<NewsItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<NewsItem | null>(null);

  const { ref, inView } = useInView({ threshold: 0, rootMargin: "400px" });

  const fetchNews = useCallback(async (pageNum: number, isNewSearch: boolean) => {
    if (loading) return;
    setLoading(true);

    try {
      const params = new URLSearchParams({ page: pageNum.toString(), limit: "15" });
      if (filter !== "ALL") params.append("source", filter);
      if (search) params.append("search", search);

      const res = await fetch(`http://localhost:8000/api/v1/news?${params.toString()}`);
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();

      setArticles(prev => isNewSearch ? data.items : [...prev, ...data.items]);
      setHasMore(data.hasMore);
      setPage(pageNum);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filter, search, loading]);

  useEffect(() => {
    const timeout = setTimeout(() => { fetchNews(1, true); }, 400);
    return () => clearTimeout(timeout);
  }, [filter, search]);

  useEffect(() => {
    if (inView && hasMore && !loading && articles.length > 0) {
      fetchNews(page + 1, false);
    }
  }, [inView, hasMore, loading, articles.length, page, fetchNews]);

  return (
    <DashboardLayout>
      <div className="mb-10 -mx-6 lg:-mx-10 shrink-0">
         <IntelTicker />
      </div>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
             <div className="p-2.5 rounded-xl bg-primary/20 text-primary animate-glow">
                <Globe size={22} />
             </div>
             <h1 className="text-4xl font-bold font-space tracking-tight text-foreground uppercase">
                Intelligence INTERCEPT
             </h1>
          </div>
          <p className="text-sm text-muted-foreground flex items-center gap-2 font-mono">
             <Shield size={14} className="text-primary" />
             Real-time Scraping & Threat Analysis of the Cyber Landscape
          </p>
        </div>

        <div className="flex items-center space-x-1.5 p-1 bg-white/[0.02] border border-white/5 rounded-[1.2rem]">
           <div className="pl-3 pr-2 flex items-center text-muted-foreground/30">
             <Filter size={14} />
           </div>
           {SOURCES.map((f) => (
             <button
               key={f}
               onClick={() => setFilter(f)}
               className={cn(
                 "px-4 py-2 rounded-xl text-[9px] font-bold font-space uppercase tracking-widest transition-all whitespace-nowrap",
                 filter === f ? "bg-primary/20 text-primary shadow-lg shadow-primary/10" : "text-muted-foreground hover:bg-white/5"
               )}
             >
               {f}
             </button>
           ))}
        </div>
      </div>

      <div className="relative mb-12 group max-w-2xl">
         <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
         <input
            type="text"
            placeholder="Search Neural Stream for Vulnerabilities..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white/[0.02] border border-white/5 focus:border-primary/30 text-white rounded-[1.5rem] pl-12 pr-6 py-4 placeholder:text-muted-foreground/30 transition-all font-bold text-sm outline-none font-space tracking-wide shadow-inner"
         />
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 auto-rows-fr">
         <AnimatePresence mode="popLayout">
            {articles.map((item) => (
               <ArticleCard 
                  key={item.id} 
                  item={item} 
                  onClick={() => setSelectedArticle(item)}
               />
            ))}
         </AnimatePresence>
      </div>

      <div ref={ref} className="w-full py-20 flex justify-center mt-6">
         {loading && (
           <div className="flex items-center space-x-4 text-primary">
             <Loader2 size={24} className="animate-spin" />
             <span className="text-xs font-bold font-space tracking-[0.3em] uppercase">Scraping Global Neuro-Web</span>
           </div>
         )}
         {!loading && !hasMore && articles.length > 0 && (
           <div className="flex flex-col items-center gap-4 text-muted-foreground">
              <span className="text-[10px] font-bold font-space tracking-[0.2em] uppercase opacity-30">End of Data Stream</span>
              <div className="h-px w-24 bg-white/5"></div>
           </div>
         )}
      </div>

      <ArticleDossier 
         article={selectedArticle}
         isOpen={!!selectedArticle}
         onClose={() => setSelectedArticle(null)}
      />
    </DashboardLayout>
  );
}

