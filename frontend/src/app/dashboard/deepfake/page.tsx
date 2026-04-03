"use client";

import React from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { UserRound, Shield, Search, Filter, AlertTriangle, Zap, Video, Fingerprint, Lock } from "lucide-react";
import { motion } from "framer-motion";

export default function DeepfakePage() {
  const detections = [
    { id: "DF-201", type: "Synthetic Audio", confidence: 99.8, status: "CRITICAL", source: "voice_note_112.m4a" },
    { id: "DF-205", type: "Face Swap", confidence: 92.1, status: "SUSPICIOUS", source: "id_scan_822.jpg" },
  ];

  return (
    <DashboardLayout>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div className="space-y-4">
          <div className="flex items-center space-x-3 text-tertiary font-bold text-[10px] uppercase tracking-[0.3em]">
             <Video size={14} />
             <span>Synthetic Media Detection</span>
          </div>
          <h1 className="text-5xl font-bold font-space tracking-tight text-foreground">
            DEEPFAKE <span className="text-tertiary/60">RADAR</span>
          </h1>
          <p className="text-muted-foreground max-w-xl text-sm leading-relaxed font-medium">
             Real-time biometric and synthetic media analysis to detect deepfake audio, video, and imagery.
          </p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-4">
         <div className="lg:col-span-3 space-y-6">
            <div className="glass-card rounded-[2.5rem] p-12 border border-white/5 flex flex-col items-center justify-center text-center min-h-[500px]">
               <div className="relative mb-8 text-tertiary">
                  <div className="absolute inset-0 bg-tertiary/20 blur-3xl rounded-full" />
                  <div className="relative h-24 w-24 rounded-3xl bg-tertiary/10 border border-tertiary/20 flex items-center justify-center">
                     <UserRound size={48} className="animate-pulse" />
                  </div>
               </div>
               <h2 className="text-2xl font-bold font-space tracking-tight text-foreground mb-4">ANALYZE SYNTHETIC ASSET</h2>
               <p className="text-muted-foreground text-sm max-w-md mb-8">
                  Upload audio or video files to run a multi-model behavioral and biometric consistency check.
               </p>
               <button className="h-14 px-10 rounded-2xl bg-tertiary text-foreground text-[10px] font-bold font-space uppercase tracking-widest hover:shadow-[0_0_20px_rgba(255,179,173,0.3)] transition-all">
                  Run Radar Diagnostic
               </button>
            </div>
         </div>

         <div className="space-y-6">
            <div className="glass-card rounded-[2rem] p-8 border border-white/5 h-full">
                <div className="flex items-center space-x-3 mb-6">
                   <Shield size={18} className="text-tertiary" />
                   <h3 className="text-sm font-bold font-space uppercase tracking-tight">Detection Queue</h3>
                </div>
                <div className="space-y-4">
                   {detections.map((det) => (
                      <div key={det.id} className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                         <div className="flex justify-between items-start mb-2">
                            <span className="text-[10px] font-mono text-muted-foreground">{det.id}</span>
                            <span className="text-[10px] font-bold text-tertiary">{det.confidence}%</span>
                         </div>
                         <h4 className="text-xs font-bold text-foreground mb-1">{det.type}</h4>
                         <p className="text-[10px] text-muted-foreground uppercase tracking-widest truncate">{det.source}</p>
                      </div>
                   ))}
                </div>
            </div>
         </div>
      </div>
    </DashboardLayout>
  );
}
