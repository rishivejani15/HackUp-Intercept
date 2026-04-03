"use client";

import React, { useState, useEffect, useCallback } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { 
  Globe, 
  Share2, 
  ExternalLink, 
  Shield, 
  Search, 
  Filter, 
  CheckCircle2, 
  Clock, 
  Zap, 
  AlertTriangle,
  Loader2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useInView } from "react-intersection-observer";

const API_BASE_URL = process.env.NEXT_PUBLIC_INTERCEPT_API_BASE_URL || "http://localhost:8000/api/v1";

// Defining the types that correspond to our new backend router
export interface NewsItem {
  id: string;
  title: string;
  description: string;
  link: string;
  source: "THE HACKER NEWS" | "KREBS ON SECURITY" | "BLEEPINGCOMPUTER" | "SECURITYWEEK" | "DARK READING" | string;
  publishedAt: string;
  imageUrl?: string;
  timeAgo: string;
}

// Map each specific source to a brand color strategy
const SOURCE_STYLES: Record<string, { brand: string, text: string, bg: string, border: string }> = {
  "THE HACKER NEWS": {
    brand: "text-[#00ff00]",
    text: "text-[#00ff00]",
    bg: "bg-[#00ff00]/10",
    border: "border-[#00ff00]/20"
  },
  "KREBS ON SECURITY": {
    brand: "text-[#00f0ff]",
    text: "text-[#00f0ff]",
    bg: "bg-[#00f0ff]/10",
    border: "border-[#00f0ff]/20"
  },
  "BLEEPINGCOMPUTER": {
    brand: "text-[#b200ff]",
    text: "text-[#b200ff]",
    bg: "bg-[#b200ff]/10",
    border: "border-[#b200ff]/20"
  },
  "SECURITYWEEK": {
    brand: "text-[#ffaa00]",
    text: "text-[#ffaa00]",
    bg: "bg-[#ffaa00]/10",
    border: "border-[#ffaa00]/20"
  },
  "DARK READING": {
    brand: "text-[#ff0055]",
    text: "text-[#ff0055]",
    bg: "bg-[#ff0055]/10",
    border: "border-[#ff0055]/20"
  }
};

const DEFAULT_STYLE = {
  brand: "text-primary",
  text: "text-primary",
  bg: "bg-primary/10",
  border: "border-primary/20"
};

const ArticleCard = ({ item }: { item: NewsItem }) => {
  const styles = SOURCE_STYLES[item.source] || DEFAULT_STYLE;

  return (
    <motion.a
      href={item.link}
      target="_blank"
      rel="noopener noreferrer"
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={cn(
        "glass-card rounded-[1.5rem] border transition-all group relative flex flex-col h-full bg-card overflow-hidden",
        styles.border,
        "hover:bg-slate-100"
      )}
    >
      {/* If Image exists */}
      {item.imageUrl && (
        <div className="h-40 w-full overflow-hidden border-b border-black/10">
          <img 
            src={item.imageUrl} 
            alt={item.title} 
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        </div>
      )}

      <div className="p-6 flex-1 flex flex-col">
        {/* Header telemetry */}
        <div className="flex items-center justify-between mb-4">
          <div className={cn(
            "px-2.5 py-1 rounded-full text-[10px] font-bold tracking-[0.1em]",
            styles.bg,
            styles.text
          )}>
            {item.source}
          </div>
          <div className="flex items-center space-x-1.5 text-[10px] font-bold text-muted-foreground/60 tracking-wider">
            <Clock size={12} />
            <span>{item.timeAgo}</span>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 space-y-3">
          <h2 className="text-lg font-bold font-space tracking-tight leading-snug text-foreground group-hover:text-foreground transition-colors line-clamp-3">
            {item.title}
          </h2>
          
          <p className="text-xs text-muted-foreground font-medium leading-relaxed line-clamp-4">
            {item.description}
          </p>
        </div>

        {/* Footer Link */}
        <div className="mt-6 pt-4 border-t border-black/10 flex items-center gap-1.5">
            <span className={cn(
              "text-[9px] font-bold uppercase tracking-[0.2em] transition-colors",
              styles.text
            )}>
              Read Full Article
            </span>
            <ExternalLink size={12} className={cn("transition-colors", styles.text)} />
        </div>
      </div>
      
      {/* Subtle Glow */}
      <div className={cn("absolute -bottom-1 -right-1 h-32 w-32 blur-[50px] opacity-10 pointer-events-none", styles.bg)} />
    </motion.a>
  );
};

// --- Main Page ---

const SOURCES = ["ALL", "THE HACKER NEWS", "KREBS ON SECURITY", "BLEEPINGCOMPUTER", "SECURITYWEEK", "DARK READING"];

export default function NewsPage() {
  const [filter, setFilter] = useState<string>("ALL");
  const [search, setSearch] = useState<string>("");
  
  const [articles, setArticles] = useState<NewsItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  // InView hook to trigger load more
  const { ref, inView } = useInView({
    threshold: 0,
    rootMargin: "400px",
  });

  const fetchNews = useCallback(async (pageNum: number, isNewSearch: boolean) => {
    if (loading) return;
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        page: pageNum.toString(),
        limit: "15"
      });
      if (filter !== "ALL") params.append("source", filter);
      if (search) params.append("search", search);

      const res = await fetch(`/api/v1/news?${params.toString()}`);
      
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();

      setArticles(prev => isNewSearch ? data.items : [...prev, ...data.items]);
      setHasMore(data.hasMore);
      setPage(pageNum);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch news";
      setError(message);
      console.error("News fetch failed:", err);
    } finally {
      setLoading(false);
    }
  }, [filter, search]);

  // Effect to handle new searches/filter changes
  useEffect(() => {
    // Debounce search slightly
    const timeout = setTimeout(() => {
      fetchNews(1, true);
    }, 400);
    return () => clearTimeout(timeout);
  }, [filter, search, fetchNews]);

  // Effect to handle infinite scroll loading
  useEffect(() => {
    if (inView && hasMore && !loading && articles.length > 0) {
      fetchNews(page + 1, false);
    }
  }, [inView, hasMore, loading, articles.length, page, fetchNews]);

  return (
    <DashboardLayout>
      {/* Top Header metrics (optional based on mockup, they have a top row) */}
      <div className="flex flex-wrap items-center gap-4 text-xs font-space tracking-widest mb-10">
         {Object.entries(SOURCE_STYLES).map(([name, style]) => {
           // We can count items or just display them as a telemetry header like the mockup
           return (
             <div key={name} className="flex items-center gap-2">
                <span className={cn("w-2 h-2 rounded-full", style.bg.replace('/10', ''))} />
                <span className={cn("font-bold uppercase", style.text)}>{name}</span>
             </div>
           )
         })}
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
        
        {/* Search */}
        <div className="relative max-w-sm w-full group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors">
            <Search size={16} />
          </div>
          <input
            type="text"
            placeholder="Search articles..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-card border border-black/10 focus:border-primary/50 text-foreground rounded-xl pl-11 pr-4 py-3 placeholder:text-muted-foreground/50 transition-all font-medium text-sm outline-none"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center space-x-1.5 p-1 bg-card border border-black/10 rounded-[1rem] overflow-x-auto hide-scrollbar">
          <div className="pl-3 pr-2 flex items-center text-muted-foreground/50">
            <Filter size={14} />
          </div>
          {SOURCES.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-4 py-2.5 rounded-xl text-[10px] font-bold font-space uppercase tracking-widest transition-all whitespace-nowrap",
                filter === f 
                  ? "bg-slate-200 text-foreground shadow-lg" 
                  : "text-muted-foreground hover:bg-slate-100 hover:text-foreground"
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <div className="mb-6 rounded-2xl border border-black/10 bg-slate-100 px-4 py-3 text-xs font-bold uppercase tracking-widest text-error">
          News feed unavailable: {error}
        </div>
      ) : null}

      {/* Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 auto-rows-fr">
         <AnimatePresence mode="popLayout">
            {articles.map((item, idx) => (
               <ArticleCard key={`${item.id}-${idx}`} item={item} />
            ))}
         </AnimatePresence>
      </div>

      {/* Loader & Intersection Target */}
      <div ref={ref} className="w-full py-12 flex justify-center mt-6">
         {loading && (
           <div className="flex items-center space-x-3 text-primary animate-pulse">
             <Loader2 size={18} className="animate-spin" />
             <span className="text-xs font-bold font-space tracking-widest uppercase">Scraping Neuro-Web</span>
           </div>
         )}
         {!loading && !hasMore && articles.length > 0 && (
           <span className="text-xs text-muted-foreground font-space tracking-widest uppercase font-bold">End of Stream</span>
         )}
         {!loading && articles.length === 0 && (
           <div className="text-center w-full py-12">
             <Shield size={32} className="mx-auto text-muted-foreground/30 mb-4" />
             <span className="text-sm text-muted-foreground font-medium">No intelligence intercepts found.</span>
           </div>
         )}
      </div>

    </DashboardLayout>
  );
}
