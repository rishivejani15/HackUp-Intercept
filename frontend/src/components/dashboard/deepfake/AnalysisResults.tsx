"use client";

import React from "react";
import { motion } from "framer-motion";
import { 
  AlertTriangle, 
  CheckCircle2, 
  Info, 
  Waves, 
  Eye, 
  ScanFace,
  BrainCircuit,
  Share2,
  FileDown,
  ShieldCheck
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AnalysisResultsProps {
  onReset: () => void;
}

export default function AnalysisResults({ onReset }: AnalysisResultsProps) {
  // Mock results for a detected deepfake
  const probability = 0.943;
  const isDeepfake = probability > 0.5;

  const metrics = [
    { label: "Blink Frequency", val: "Inconsistent", score: 0.12, status: "Critical" },
    { label: "Lip-Sync Sync", val: "12ms Delay", score: 0.89, status: "High Risk" },
    { label: "Spectral Continuity", val: "Fractured", score: 0.05, status: "Critical" },
    { label: "Skin Texture Noise", val: "Compressed", score: 0.45, status: "Medium Risk" },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div className="grid lg:grid-cols-3 gap-8">
        
        {/* Risk Overview Card */}
        <div className="lg:col-span-2 glass-card rounded-[2.5rem] p-8 border border-white/10 relative overflow-hidden">
           <div className="absolute top-0 right-0 p-8 opacity-10">
              {isDeepfake ? <AlertTriangle size={120} className="text-error" /> : <ShieldCheck size={120} className="text-secondary" />}
           </div>
           
           <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-8">
              {/* Probability Gauge */}
              <div className="relative h-48 w-48 flex items-center justify-center">
                 <svg className="w-full h-full -rotate-90">
                    <circle cx="96" cy="96" r="88" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-white/5" />
                    <motion.circle 
                       cx="96" cy="96" r="88" stroke="currentColor" strokeWidth="12" fill="transparent" 
                       strokeDasharray={2 * Math.PI * 88}
                       initial={{ strokeDashoffset: 2 * Math.PI * 88 }}
                       animate={{ strokeDashoffset: (2 * Math.PI * 88) * (1 - probability) }}
                       transition={{ duration: 1.5, ease: "easeOut" }}
                       className={cn(isDeepfake ? "text-error" : "text-secondary")}
                       strokeLinecap="round"
                    />
                 </svg>
                 <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-5xl font-bold font-space">{(probability * 100).toFixed(1)}</span>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-1">Deepfake Prob</span>
                 </div>
              </div>

              <div className="flex-1 space-y-6">
                 <div>
                    <h2 className={cn("text-3xl font-bold font-space uppercase mb-2", isDeepfake ? "text-error" : "text-secondary")}>
                       {isDeepfake ? "Synthetic Content Detected" : "Human Liveness Verified"}
                    </h2>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                       Neural fingerprints match 94% of known AI models (GAN, Diffusion). Spectral noise in the 400Hz range suggests frame synthesis.
                    </p>
                 </div>

                 <div className="flex flex-wrap gap-3">
                    <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/5 flex items-center gap-2">
                       <CheckCircle2 size={14} className="text-secondary" />
                       <span className="text-[10px] font-bold text-white/70 uppercase">Liveness: Failed</span>
                    </div>
                    <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/5 flex items-center gap-2">
                       <Waves size={14} className="text-primary" />
                       <span className="text-[10px] font-bold text-white/70 uppercase">Freq: Anomalous</span>
                    </div>
                 </div>
              </div>
           </div>

           {/* Forensic Marker Tags */}
           <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4 pt-8 border-t border-white/5">
              {metrics.map(m => (
                 <div key={m.label} className="space-y-1.5">
                    <span className="text-[9px] font-bold uppercase text-muted-foreground tracking-tighter block">{m.label}</span>
                    <div className="flex items-center justify-between">
                       <span className="text-xs font-bold text-foreground">{m.val}</span>
                       <span className={cn("text-[8px] px-1.5 py-0.5 rounded-sm font-bold uppercase", 
                          m.status === "Critical" ? "bg-error/20 text-error" : "bg-warning/20 text-warning")}>
                          {m.status}
                       </span>
                    </div>
                    <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                       <div 
                          className={cn("h-full rounded-full", m.status === "Critical" ? "bg-error" : "bg-warning")}
                          style={{ width: `${(1 - m.score) * 100}%` }}
                       />
                    </div>
                 </div>
              ))}
           </div>
        </div>

        {/* Action Panel */}
        <div className="flex flex-col gap-4">
           <div className="glass-card rounded-[2.5rem] p-6 border border-white/10 flex-1 space-y-6">
              <h4 className="text-[11px] font-bold uppercase tracking-widest text-foreground flex items-center gap-2">
                 <BrainCircuit size={16} className="text-primary" />
                 Defense Actions
              </h4>
              <div className="space-y-3">
                 <button className="w-full py-4 rounded-2xl bg-error text-white text-xs font-bold uppercase tracking-[0.15em] shadow-lg shadow-error/20 hover:scale-[1.02] active:scale-95 transition-all">
                    Flag for Review
                 </button>
                 <button className="w-full py-4 rounded-2xl bg-white/5 border border-white/5 text-white text-xs font-bold uppercase tracking-[0.15em] hover:bg-white/10 transition-all flex items-center justify-center gap-2">
                    <FileDown size={14} />
                    Download PDF Report
                 </button>
                 <button className="w-full py-4 rounded-2xl bg-white/5 border border-white/5 text-white text-xs font-bold uppercase tracking-[0.15em] hover:bg-white/10 transition-all flex items-center justify-center gap-2">
                    <Share2 size={14} />
                    Integrate evidence
                 </button>
              </div>

              <div className="pt-6 border-t border-white/5">
                 <div className="flex items-start gap-3 p-4 rounded-2xl bg-warning/5 border border-warning/10">
                    <Info size={16} className="text-warning shrink-0" />
                    <p className="text-[9px] leading-relaxed text-warning/80 italic font-medium">
                       CAUTION: This content has a High probability of being synthetic. Internal protocol INF-09 recommends blocking the associated user account.
                    </p>
                 </div>
              </div>
           </div>

           <button 
              onClick={onReset}
              className="w-full py-4 rounded-2xl bg-primary text-black text-xs font-bold uppercase tracking-[0.15em] shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
           >
              New Analysis
           </button>
        </div>
      </div>

      {/* Visual Heatmap Preview */}
      <div className="glass-card rounded-[2.5rem] p-8 border border-white/10">
         <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
               <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
                  <ScanFace size={18} />
               </div>
               <h3 className="text-sm font-bold font-space uppercase tracking-widest text-foreground">Spectral Noise Comparison</h3>
            </div>
            <div className="flex gap-4">
               <span className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-2 transition-colors cursor-pointer hover:text-white">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary" /> Neural Map
               </span>
               <span className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-2 transition-colors cursor-pointer hover:text-white">
                   Liveness Frame
               </span>
            </div>
         </div>
         
         <div className="grid md:grid-cols-2 gap-8 h-80">
            <div className="relative rounded-2xl bg-black/40 border border-white/5 flex items-center justify-center overflow-hidden">
               <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=1000')] bg-cover bg-center grayscale opacity-60"></div>
               <div className="absolute inset-0 bg-primary/20 mix-blend-overlay"></div>
               <div className="relative text-center">
                  <Eye size={32} className="text-primary/50 mb-2 mx-auto" />
                  <span className="text-[9px] font-bold uppercase tracking-widest text-white/40">Base Texture Analysis</span>
               </div>
            </div>
            <div className="relative rounded-2xl bg-black/40 border border-white/5 flex items-center justify-center overflow-hidden">
               <div className="absolute inset-0 bg-gradient-to-br from-error/40 via-transparent to-primary/40 opacity-40"></div>
               <div className="relative text-center">
                  <Waves size={32} className="text-error/50 mb-2 mx-auto" />
                  <span className="text-[9px] font-bold uppercase tracking-widest text-white/40">Frequency Anomalies Detected</span>
               </div>
            </div>
         </div>
      </div>
    </motion.div>
  );
}
