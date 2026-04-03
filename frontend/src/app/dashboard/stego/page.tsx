"use client";

import React from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { EyeOff, Shield, Search, Filter, AlertTriangle, Zap, Fingerprint, Lock } from "lucide-react";
import { motion } from "framer-motion";

export default function StegoPage() {
  const mockDetections = [
    { id: "ST-102", type: "LSB Encoding", status: "CRITICAL", source: "invoice_829.png", confidence: 99.2 },
    { id: "ST-105", type: "DCT Manipulation", status: "SUSPICIOUS", source: "contract_v2.pdf", confidence: 84.5 },
  ];

  return (
    <DashboardLayout>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div className="space-y-4">
          <div className="flex items-center space-x-3 text-primary font-bold text-[10px] uppercase tracking-[0.3em]">
             <EyeOff size={14} />
             <span>Hidden Payload Analysis</span>
          </div>
          <h1 className="text-5xl font-bold font-space tracking-tight text-foreground">
            STEGANO <span className="text-primary/60">SCANNER</span>
          </h1>
          <p className="text-muted-foreground max-w-xl text-sm leading-relaxed font-medium">
             Advanced AI detection for data hidden within images, PDFs, and multimedia streams.
          </p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-4">
         <div className="lg:col-span-3 space-y-6">
            <div className="glass-card rounded-[2.5rem] p-12 border border-white/5 flex flex-col items-center justify-center text-center min-h-[500px]">
               <div className="relative mb-8">
                  <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
                  <div className="relative h-24 w-24 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                     <Fingerprint size={48} className="animate-pulse" />
                  </div>
               </div>
               <h2 className="text-2xl font-bold font-space tracking-tight text-foreground mb-4">DRAG & DROP SECURE FILES</h2>
               <p className="text-muted-foreground text-sm max-w-md mb-8">
                  Upload any digital asset to perform deep-packet inspection for embedded malicious payloads.
               </p>
               <button className="h-14 px-10 rounded-2xl bg-primary text-primary-foreground text-[10px] font-bold font-space uppercase tracking-widest hover:shadow-[0_0_20px_rgba(185,199,224,0.3)] transition-all">
                  Initialize Scan Engine
               </button>
            </div>
         </div>

         <div className="space-y-6">
            <div className="glass-card rounded-[2rem] p-8 border border-white/5">
                <div className="flex items-center space-x-3 mb-6">
                   <Zap size={18} className="text-secondary" />
                   <h3 className="text-sm font-bold font-space uppercase tracking-tight">Active Detections</h3>
                </div>
                <div className="space-y-4">
                   {mockDetections.map((det) => (
                      <div key={det.id} className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                         <div className="flex justify-between items-start mb-2">
                            <span className="text-[10px] font-mono text-muted-foreground">{det.id}</span>
                            <span className="text-[10px] font-bold text-error">{det.confidence}%</span>
                         </div>
                         <h4 className="text-xs font-bold text-foreground mb-1">{det.type}</h4>
                         <p className="text-[10px] text-muted-foreground uppercase tracking-widest">{det.source}</p>
                      </div>
                   ))}
                </div>
            </div>
         </div>
      </div>
    </DashboardLayout>
  );
}
