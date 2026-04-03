"use client";

import React from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Newspaper, Shield, Search, Filter, AlertTriangle, Zap, Globe, Share2, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";

export default function NewsPage() {
  const news = [
    { title: "New LSB Steganography Technique Detected in Global Invoices", date: "2H AGO", source: "Intel Hub", category: "TECHNET" },
    { title: "Deepfake Voice Scams Targeting Banking High-Net-Worth Entities", date: "4H AGO", source: "FS-ISAC", category: "THREAT" },
    { title: "InterceptAI Model-v4 Now Live for Enterprise Alpha Testing", date: "1D AGO", source: "System", category: "UPDATE" },
  ];

  return (
    <DashboardLayout>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div className="space-y-4">
          <div className="flex items-center space-x-3 text-secondary font-bold text-[10px] uppercase tracking-[0.3em]">
             <Globe size={14} />
             <span>Security Intelligence Feed</span>
          </div>
          <h1 className="text-5xl font-bold font-space tracking-tight text-foreground">
            SECURE <span className="text-secondary/60">NEWS</span>
          </h1>
          <p className="text-muted-foreground max-w-xl text-sm leading-relaxed font-medium">
             Consolidated stream of global threat intelligence, zero-day alerts, and InterceptAI updates.
          </p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-4">
         <div className="lg:col-span-3 space-y-6">
            {news.map((item, idx) => (
               <motion.div 
                 key={idx}
                 initial={{ opacity: 0, x: -20 }}
                 animate={{ opacity: 1, x: 0 }}
                 transition={{ delay: idx * 0.1 }}
                 className="glass-card p-8 rounded-[2rem] border border-white/5 hover:bg-white/[0.03] transition-all cursor-pointer group"
               >
                  <div className="flex items-start justify-between">
                     <div className="space-y-4 flex-1">
                        <div className="flex items-center space-x-3">
                           <span className="px-2 py-0.5 rounded bg-secondary/10 text-secondary text-[9px] font-bold tracking-widest uppercase">{item.category}</span>
                           <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">{item.date}</span>
                        </div>
                        <h2 className="text-2xl font-bold font-space tracking-tight text-foreground group-hover:text-primary transition-colors">{item.title}</h2>
                        <div className="flex items-center space-x-4 text-[10px] text-muted-foreground font-bold tracking-widest uppercase">
                           <span>Source: {item.source}</span>
                           <span>•</span>
                           <span className="flex items-center space-x-1"><Share2 size={10} /> <span>3.2k Shares</span></span>
                        </div>
                     </div>
                     <div className="h-12 w-12 rounded-xl border border-white/10 flex items-center justify-center text-muted-foreground group-hover:bg-primary/20 group-hover:text-primary transition-all">
                        <ExternalLink size={20} />
                     </div>
                  </div>
               </motion.div>
            ))}
         </div>

         <div className="space-y-6">
            <div className="glass-card rounded-[2rem] p-8 border border-white/5">
                <div className="flex items-center space-x-3 mb-6">
                   <Shield size={18} className="text-primary" />
                   <h3 className="text-sm font-bold font-space uppercase tracking-tight">System Status</h3>
                </div>
                <div className="space-y-6">
                   <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest">
                      <span className="text-muted-foreground">Neural Engine</span>
                      <span className="text-secondary">Optimal</span>
                   </div>
                   <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest">
                      <span className="text-muted-foreground">Sentinel Nodes</span>
                      <span className="text-secondary">482 Online</span>
                   </div>
                   <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest">
                      <span className="text-muted-foreground">Detection Latency</span>
                      <span className="text-primary">42ms</span>
                   </div>
                </div>
            </div>
         </div>
      </div>
    </DashboardLayout>
  );
}
