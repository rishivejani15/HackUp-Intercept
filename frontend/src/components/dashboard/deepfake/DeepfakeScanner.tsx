"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Scan, 
  Upload, 
  ShieldCheck, 
  Cpu, 
  Database, 
  Activity,
  Zap,
  Fingerprint,
  Maximize2
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DeepfakeScannerProps {
  isScanning: boolean;
  onScanComplete: () => void;
  onStartScan: () => void;
}

export default function DeepfakeScanner({ isScanning, onScanComplete, onStartScan }: DeepfakeScannerProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isScanning) {
      setProgress(0);
      interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            setTimeout(onScanComplete, 800);
            return 100;
          }
          return prev + 1.5;
        });
      }, 50);
    }
    return () => clearInterval(interval);
  }, [isScanning, onScanComplete]);

  return (
    <div className="relative group">
       {/* Background Glow */}
       <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-secondary/20 to-primary/20 rounded-[2.5rem] blur-2xl opacity-50 group-hover:opacity-100 transition duration-1000"></div>
       
       <div className="relative glass-card rounded-[2.5rem] border border-white/10 overflow-hidden bg-[#0A0D11]/80 backdrop-blur-3xl min-h-[500px] flex flex-col lg:flex-row">
          
          {/* Main Scanner Area */}
          <div className="flex-1 p-8 flex flex-col">
             <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                   <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-[0_0_15px_rgba(185,199,224,0.1)]">
                      <Scan size={20} className={cn(isScanning && "animate-pulse")} />
                   </div>
                   <div>
                      <h3 className="text-sm font-bold font-space uppercase tracking-widest text-foreground">Biometric Neural Scanner</h3>
                      <p className="text-[10px] font-mono text-muted-foreground">ENGINE: DEEPGUARD-V4_STABLE</p>
                   </div>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5">
                   <div className={cn("h-1.5 w-1.5 rounded-full", isScanning ? "bg-primary animate-pulse" : "bg-muted-foreground")} />
                   <span className="text-[9px] font-bold uppercase tracking-tighter text-muted-foreground">
                      {isScanning ? 'Neural Scan Active' : 'Ready for Ingest'}
                   </span>
                </div>
             </div>

             {/* The Viewport */}
             <div className="relative flex-1 rounded-[2rem] bg-black/40 border border-white/5 overflow-hidden group/viewport cursor-crosshair">
                <AnimatePresence>
                   {!isScanning && progress === 0 && (
                      <motion.div 
                         initial={{ opacity: 0 }}
                         animate={{ opacity: 1 }}
                         exit={{ opacity: 0 }}
                         className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center"
                      >
                         <div className="relative mb-6">
                            <div className="absolute inset-0 bg-primary/20 blur-3xl animate-pulse"></div>
                            <div className="relative h-20 w-20 flex items-center justify-center rounded-2xl bg-white/5 border border-white/10">
                               <Upload size={32} className="text-muted-foreground group-hover/viewport:text-primary transition-colors" />
                            </div>
                         </div>
                         <h4 className="text-lg font-bold font-space text-foreground mb-2">Drop Media for Analysis</h4>
                         <p className="text-xs text-muted-foreground max-w-xs">
                            Upload a JPEG, PNG, or MP4 to perform high-frequency neural artifact detection.
                         </p>
                         <button 
                            onClick={onStartScan}
                            className="mt-8 px-8 py-3 rounded-xl bg-white text-black text-xs font-bold uppercase tracking-[0.15em] hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)]"
                         >
                            Initialize System Scan
                         </button>
                      </motion.div>
                   )}

                   {isScanning && (
                      <motion.div 
                         initial={{ opacity: 0 }}
                         animate={{ opacity: 1 }}
                         exit={{ opacity: 0 }}
                         className="absolute inset-0"
                      >
                         {/* Mock Scan Image */}
                         <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=1000')] bg-cover bg-center opacity-40 grayscale blur-sm"></div>
                         
                         {/* Scan Overlays */}
                         <div className="absolute inset-0 bg-primary/5"></div>
                         
                         {/* Laser Bar */}
                         <motion.div 
                            animate={{ top: ["0%", "100%", "0%"] }}
                            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                            className="absolute left-0 right-0 h-0.5 bg-primary shadow-[0_0_15px_#B9C7E0] z-20"
                         />

                         {/* Bounding Boxes Simulation */}
                         <div className="absolute top-1/4 left-1/3 w-32 h-32 border border-primary/50 rounded-lg animate-pulse">
                            <div className="absolute -top-1 -left-1 w-2 h-2 border-t-2 border-l-2 border-primary"></div>
                            <div className="absolute -top-1 -right-1 w-2 h-2 border-t-2 border-r-2 border-primary"></div>
                         </div>

                         {/* Scanner HUD */}
                         <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between">
                            <div className="space-y-1">
                               <p className="text-[10px] font-mono text-primary uppercase font-bold tracking-widest">Scanning Facial Geometry...</p>
                               <div className="h-1 w-48 bg-white/10 rounded-full overflow-hidden">
                                  <motion.div 
                                    className="h-full bg-primary shadow-[0_0_10px_#B9C7E0]"
                                    style={{ width: `${progress}%` }}
                                  />
                               </div>
                            </div>
                            <div className="text-right">
                               <p className="text-2xl font-bold font-space text-primary">{(progress).toFixed(0)}%</p>
                               <p className="text-[8px] font-mono text-muted-foreground uppercase">Neural Ingest Active</p>
                            </div>
                         </div>
                      </motion.div>
                   )}
                </AnimatePresence>
             </div>
          </div>

          {/* Right Metrics Sidebar */}
          <div className="w-full lg:w-80 bg-black/40 border-l border-white/5 p-8 flex flex-col">
             <div className="mb-8">
                <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-4 flex items-center gap-2">
                   <Activity size={12} className="text-primary" />
                   Stream Metadata
                </h4>
                <div className="space-y-4">
                   {[
                      { label: "Neural Load", val: isScanning ? "84%" : "0.0%", icon: Cpu },
                      { label: "Buffer State", val: isScanning ? "Syncing..." : "Idle", icon: Database },
                      { label: "Latency", val: isScanning ? "12ms" : "---", icon: Zap },
                      { label: "Entropy", val: isScanning ? "0.842" : "0.000", icon: Fingerprint }
                   ].map(item => (
                      <div key={item.label} className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between">
                         <div className="flex items-center gap-3">
                            <item.icon size={14} className="text-muted-foreground" />
                            <span className="text-[10px] font-bold text-muted-foreground uppercase">{item.label}</span>
                         </div>
                         <span className="text-xs font-bold font-mono text-foreground">{item.val}</span>
                      </div>
                   ))}
                </div>
             </div>

             <div className="mt-auto space-y-4">
                <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10">
                   <div className="flex items-center gap-2 mb-2">
                      <ShieldCheck size={14} className="text-primary" />
                      <span className="text-[10px] font-bold uppercase text-primary tracking-widest">Defense Ready</span>
                   </div>
                   <p className="text-[10px] leading-relaxed text-muted-foreground">
                      Model weight: <span className="text-foreground">Llama-3-Vision-Fine-Tuned</span>. Optimized for 4K video frame extraction.
                   </p>
                </div>
                
                {/* Secondary Action */}
                <button className="w-full py-4 rounded-xl bg-white/5 border border-white/5 text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground hover:bg-white/10 hover:text-foreground transition-all flex items-center justify-center gap-2">
                   <Maximize2 size={12} />
                   Enter Forensic Viewport
                </button>
             </div>
          </div>
       </div>
    </div>
  );
}
