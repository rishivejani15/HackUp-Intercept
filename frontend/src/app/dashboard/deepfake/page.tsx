"use client";

import React, { useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import DeepfakeScanner from "@/components/dashboard/deepfake/DeepfakeScanner";
import AnalysisResults from "@/components/dashboard/deepfake/AnalysisResults";
import { UserRound, History, Info, ShieldAlert } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function DeepfakePage() {
  const [view, setView] = useState<"IDLE" | "SCANNING" | "RESULTS">("IDLE");

  const startScan = () => {
    setView("SCANNING");
  };

  const handleScanComplete = () => {
    setView("RESULTS");
  };

  const resetScanner = () => {
    setView("IDLE");
  };

  return (
    <DashboardLayout>
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
             <div className="p-2.5 rounded-xl bg-primary/20 text-primary animate-glow">
                <UserRound size={22} />
             </div>
             <h1 className="text-4xl font-bold font-space tracking-tight text-foreground uppercase">
                Neural Biometrics
             </h1>
          </div>
          <p className="text-sm text-muted-foreground flex items-center gap-2">
             <ShieldAlert size={14} className="text-primary" />
             Deepfake Detection & AI Artifact Analysis Engine
          </p>
        </div>

        <div className="flex items-center gap-3">
           <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 border border-white/5 text-[10px] font-bold font-space uppercase tracking-widest text-muted-foreground hover:bg-white/10 hover:text-foreground transition-all">
              <History size={14} />
              Scan History
           </button>
           <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 border border-white/5 text-[10px] font-bold font-space uppercase tracking-widest text-muted-foreground hover:bg-white/10 hover:text-foreground transition-all">
              <Info size={14} />
              Engine Specs
           </button>
        </div>
      </div>

      <div className="relative min-h-[600px]">
         <AnimatePresence mode="wait">
            {view === "IDLE" || view === "SCANNING" ? (
               <motion.div
                  key="scanner"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.02 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
               >
                  <DeepfakeScanner 
                     isScanning={view === "SCANNING"} 
                     onScanComplete={handleScanComplete}
                     onStartScan={startScan}
                  />
               </motion.div>
            ) : (
               <motion.div
                  key="results"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.02 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
               >
                  <AnalysisResults onReset={resetScanner} />
               </motion.div>
            )}
         </AnimatePresence>
      </div>

      {/* Footer Info Hub */}
      <div className="mt-16 grid md:grid-cols-3 gap-8 pt-10 border-t border-white/5">
         {[
            { 
               title: "rPPG Analysis", 
               desc: "Remote plethysmography monitors micro-vascular blood flow consistency.", 
               icon: History 
            },
            { 
               title: "Spectral Noise", 
               desc: "Analyzes artifacts in the high-frequency domain of the image.", 
               icon: ShieldAlert 
            },
            { 
               title: "Mouth-Sync Phase", 
               desc: "Detects misalignments between phonemes and visemes in video frames.", 
               icon: Info 
            }
         ].map(item => (
            <div key={item.title} className="p-6 rounded-[2rem] bg-white/[0.02] border border-white/5 group hover:bg-white/[0.05] transition-all">
               <h4 className="text-[11px] font-bold uppercase tracking-widest text-primary mb-3 flex items-center gap-2">
                  <item.icon size={12} />
                  {item.title}
               </h4>
               <p className="text-xs leading-relaxed text-muted-foreground group-hover:text-white/70 transition-colors">
                  {item.desc}
               </p>
            </div>
         ))}
      </div>
    </DashboardLayout>
  );
}

