"use client";

import React from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Users, Shield, MessageSquare, Globe, Zap, Search, UserPlus, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";

export default function CommunityPage() {
  const analysts = [
    { name: "Analyst-04", status: "ACTIVE", location: "Singapore", role: "Network Specialist" },
    { name: "Analyst-12", status: "IDLE", location: "Berlin", role: "Biometric Architect" },
    { name: "Analyst-09", status: "ACTIVE", location: "San Francisco", role: "Forensic Lead" },
  ];

  return (
    <DashboardLayout>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div className="space-y-4">
          <div className="flex items-center space-x-3 text-primary font-bold text-[10px] uppercase tracking-[0.3em]">
             <Users size={14} />
             <span>Global Analyst Network</span>
          </div>
          <h1 className="text-5xl font-bold font-space tracking-tight text-foreground">
            DEFENSE <span className="text-primary/60">COLLECTIVE</span>
          </h1>
          <p className="text-muted-foreground max-w-xl text-sm leading-relaxed font-medium">
             Collaborative intelligence hub for real-time threat sharing and multi-agency response coordination.
          </p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-4">
         <div className="lg:col-span-3 space-y-8">
            <div className="glass-card rounded-[2.5rem] p-12 border border-white/5 relative overflow-hidden">
               <div className="absolute top-0 right-0 p-8">
                  <Globe size={120} className="text-primary/5 -mr-16 -mt-16 rotate-12" />
               </div>
               
               <div className="relative z-10 space-y-10">
                  <div className="flex items-center justify-between">
                     <h2 className="text-2xl font-bold font-space uppercase tracking-tight">Active Operation Channels</h2>
                     <button className="h-10 px-6 rounded-xl bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold font-space uppercase tracking-widest hover:bg-primary/20 transition-all">Join Secure Lobby</button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/5 hover:border-primary/20 transition-colors cursor-pointer group">
                        <div className="flex items-center justify-between mb-4">
                           <div className="h-10 w-10 rounded-xl bg-secondary/10 flex items-center justify-center text-secondary">
                              <MessageSquare size={20} />
                           </div>
                           <span className="text-[9px] font-bold text-secondary uppercase tracking-widest animate-pulse">42 Analysts Active</span>
                        </div>
                        <h3 className="text-lg font-bold font-space text-foreground uppercase tracking-tight group-hover:text-primary transition-colors">#Stego-Response-Beta</h3>
                        <p className="text-xs text-muted-foreground mt-2">Real-time coordination for the ongoing LSB steganography outbreak.</p>
                     </div>

                     <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/5 hover:border-primary/20 transition-colors cursor-pointer group">
                        <div className="flex items-center justify-between mb-4">
                           <div className="h-10 w-10 rounded-xl bg-tertiary/10 flex items-center justify-center text-tertiary">
                              <Shield size={20} />
                           </div>
                           <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Global Protocol</span>
                        </div>
                        <h3 className="text-lg font-bold font-space text-foreground uppercase tracking-tight group-hover:text-primary transition-colors">#Consensus-Verification</h3>
                        <p className="text-xs text-muted-foreground mt-2">Multi-model consensus audits for high-confidence forensic reporting.</p>
                     </div>
                  </div>
               </div>
            </div>
         </div>

         <div className="space-y-6">
            <div className="glass-card rounded-[2rem] p-8 border border-white/5">
                <div className="flex items-center justify-between mb-8">
                   <h3 className="text-sm font-bold font-space uppercase tracking-tight flex items-center space-x-2">
                       <TrendingUp size={16} className="text-primary" />
                       <span>Top Contributors</span>
                   </h3>
                </div>
                <div className="space-y-6">
                   {analysts.map((analyst, idx) => (
                      <div key={idx} className="flex items-center space-x-4 group">
                         <div className="h-10 w-10 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-center text-muted-foreground group-hover:bg-primary/20 group-hover:text-primary transition-all">
                            <Users size={18} />
                         </div>
                         <div className="flex-1">
                            <p className="text-xs font-bold text-foreground font-space uppercase tracking-tight">{analyst.name}</p>
                            <p className="text-[9px] text-muted-foreground font-bold tracking-widest uppercase mt-0.5">{analyst.role}</p>
                         </div>
                         <div className={cn(
                             "h-1.5 w-1.5 rounded-full",
                             analyst.status === "ACTIVE" ? "bg-secondary shadow-[0_0_8px_rgba(78,222,163,0.6)]" : "bg-muted-foreground/30"
                         )} />
                      </div>
                   ))}
                </div>
                <button className="w-full mt-8 py-4 rounded-2xl border border-white/5 bg-white/[0.02] text-[10px] font-bold font-space uppercase tracking-widest hover:bg-white/5 transition-all text-primary flex items-center justify-center space-x-3">
                   <UserPlus size={14} />
                   <span>Invite Intelligence Partner</span>
                </button>
            </div>
         </div>
      </div>
    </DashboardLayout>
  );
}
