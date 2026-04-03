"use client";

import React from "react";
import { motion } from "framer-motion";
import { Zap, AlertTriangle, Info, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

const TICKER_ITEMS = [
  { level: "CRITICAL", text: "Zero-day vulnerability discovered in major banking API - CVE-2026-0402", icon: ShieldAlert },
  { level: "WARNING", text: "New phishing campaign targeting financial analysts reported in EU region", icon: AlertTriangle },
  { level: "INFO", text: "FraudShield AI core updated to v4.2.1 Stable - Neural pathing improved", icon: Zap },
  { level: "CRITICAL", text: "Russian threat group 'Bears-22' active in retail sector - Patch immediate", icon: ShieldAlert },
  { level: "WARNING", text: "Anomaly detected in global transaction latency - Monitoring active", icon: Info },
];

export default function IntelTicker() {
  return (
    <div className="relative w-full h-10 bg-primary/5 border-y border-primary/20 overflow-hidden flex items-center group/ticker">
      {/* Decorative Left Label */}
      <div className="absolute left-0 top-0 bottom-0 px-4 bg-[#0B0E14] border-r border-primary/20 z-10 flex items-center gap-2">
         <div className="h-2 w-2 rounded-full bg-primary animate-pulse shadow-[0_0_8px_#B9C7E0]"></div>
         <span className="text-[10px] font-bold font-space uppercase tracking-[0.2em] text-primary">LIVE_INTEL_FEED</span>
      </div>

      {/* Marquee Container */}
      <motion.div 
        className="flex whitespace-nowrap gap-12 pl-[180px]"
        animate={{ x: ["0%", "-50%"] }}
        transition={{ 
           duration: 40, 
           repeat: Infinity, 
           ease: "linear" 
        }}
      >
        {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, idx) => (
          <div key={idx} className="flex items-center gap-3">
             <span className={cn(
                "text-[9px] font-bold px-2 py-0.5 rounded-sm tracking-widest uppercase",
                item.level === "CRITICAL" ? "bg-error/20 text-error border border-error/20" : 
                item.level === "WARNING" ? "bg-warning/20 text-warning border border-warning/20" : 
                "bg-secondary/20 text-secondary border border-secondary/20"
             )}>
                {item.level}
             </span>
             <span className="text-[11px] font-medium text-white/70 font-space uppercase tracking-wider group-hover/ticker:text-white transition-colors">
                {item.text}
             </span>
             <span className="mx-4 text-white/10">|</span>
          </div>
        ))}
      </motion.div>

      {/* Decorative Right Label */}
      <div className="absolute right-0 top-0 bottom-0 px-4 bg-[#0B0E14] border-l border-primary/20 z-10 flex items-center">
         <span className="text-[9px] font-mono text-muted-foreground/60">SENS_INTEL_0x4F2A</span>
      </div>
    </div>
  );
}
