"use client";

import React, { useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { 
  User, 
  Settings, 
  Shield, 
  Bell, 
  Key, 
  ExternalLink, 
  Cpu, 
  CheckCircle,
  Copy,
  Zap,
  Save
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("profile");
  const [threshold, setThreshold] = useState(85);

  const tabs = [
    { id: "profile", label: "User Profile", icon: User },
    { id: "model", label: "Model Configuration", icon: Cpu },
    { id: "security", label: "Security & Keys", icon: Key },
    { id: "notifications", label: "Intelligence Alerts", icon: Bell },
  ];

  return (
    <DashboardLayout>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div className="space-y-4">
          <div className="flex items-center space-x-3 text-primary font-bold text-[10px] uppercase tracking-[0.3em]">
             <Settings size={14} />
             <span>Core Configuration</span>
          </div>
          <h1 className="text-5xl font-bold font-space tracking-tight text-foreground">
            SYSTEM <span className="text-primary/60">SETTINGS</span>
          </h1>
          <p className="text-muted-foreground max-w-xl text-sm leading-relaxed font-medium">
            Fine-tune behavioral thresholds, manage intelligence API keys, and configure analyst profiles.
          </p>
        </div>

        <div className="flex items-center space-x-3">
           <button className="h-12 px-6 rounded-2xl bg-primary text-primary-foreground text-[10px] font-bold font-space uppercase tracking-widest hover:bg-primary/90 transition-all flex items-center justify-center space-x-3 shadow-lg shadow-primary/20">
              <Save size={16} />
              <span>Save Configuration</span>
           </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
         {/* Navigation Tab Rail */}
         <div className="lg:w-64 flex flex-col space-y-2">
            {tabs.map((tab) => (
               <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                     "relative flex items-center px-4 py-4 text-[10px] font-bold font-space uppercase tracking-widest rounded-xl transition-all duration-300",
                     activeTab === tab.id 
                       ? "bg-primary/10 text-primary border border-primary/20 shadow-lg shadow-primary/5" 
                       : "text-muted-foreground hover:bg-white/5 hover:text-foreground border border-transparent"
                  )}
               >
                  <tab.icon size={16} className="mr-3" />
                  {tab.label}
                  {activeTab === tab.id && (
                     <div className="absolute right-3 h-1.5 w-1.5 rounded-full bg-primary pulse-primary" />
                  )}
               </button>
            ))}
         </div>

         {/* Content Area */}
         <div className="flex-1">
            <div className="glass-card rounded-[2.5rem] p-10 border border-white/5 min-h-[600px] relative overflow-hidden">
               {activeTab === "profile" && (
                 <div className="space-y-10 animate-in fade-in duration-500">
                    <div className="flex items-center space-x-8 pb-10 border-b border-white/5">
                        <div className="relative group">
                           <div className="h-32 w-32 rounded-3xl bg-primary/10 border-2 border-primary/20 flex items-center justify-center group-hover:scale-105 transition-transform duration-500 overflow-hidden">
                              <User size={64} className="text-primary/40" />
                              <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                 <span className="text-[10px] font-bold text-white uppercase tracking-widest">Update Avatar</span>
                              </div>
                           </div>
                           <div className="absolute -bottom-2 -right-2 h-8 w-8 rounded-xl bg-secondary flex items-center justify-center text-white border-4 border-background shadow-lg">
                              <CheckCircle size={14} />
                           </div>
                        </div>
                        <div>
                           <h3 className="text-2xl font-bold font-space tracking-tight text-foreground">Analyst-01 Internal</h3>
                           <p className="text-xs font-bold text-primary/60 uppercase tracking-widest mt-1">Sr. Technical Forensic Investigator</p>
                           <div className="flex items-center space-x-2 mt-4">
                              <div className="px-2 py-1 rounded bg-white/5 border border-white/10 text-[9px] font-mono text-muted-foreground flex items-center space-x-2">
                                 <Zap size={10} className="text-primary" />
                                 <span>SESSION ACTIVE: 4H 12M</span>
                              </div>
                           </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       <div className="space-y-4">
                          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block ml-1">Professional Identifier</label>
                          <input 
                             type="text" 
                             defaultValue="Samyak G"
                             className="h-12 w-full rounded-xl bg-white/[0.03] border border-white/5 px-4 text-xs font-space font-bold uppercase tracking-widest focus:outline-none focus:ring-1 focus:ring-primary/20"
                          />
                       </div>
                       <div className="space-y-4">
                          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block ml-1">Internal Endpoint (Email)</label>
                          <input 
                             type="email" 
                             defaultValue="analyst-01@interceptai.io"
                             className="h-12 w-full rounded-xl bg-white/[0.03] border border-white/5 px-4 text-xs font-space font-bold uppercase tracking-widest focus:outline-none focus:ring-1 focus:ring-primary/20"
                          />
                       </div>
                       <div className="space-y-4 md:col-span-2">
                          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block ml-1">Operations Narrative (Bio)</label>
                          <textarea 
                             rows={4}
                             defaultValue="Lead forensic architect focusing on real-time P2P behavioral anomalies and automated bot detection."
                             className="w-full rounded-2xl bg-white/[0.03] border border-white/5 p-4 text-xs font-space font-bold uppercase tracking-widest focus:outline-none focus:ring-1 focus:ring-primary/20 resize-none"
                          />
                       </div>
                    </div>
                 </div>
               )}

               {activeTab === "model" && (
                 <div className="space-y-10 animate-in fade-in duration-500">
                    <div>
                       <h3 className="text-xl font-bold font-space uppercase tracking-widest text-foreground">Aegis Neural Thresholds</h3>
                       <p className="text-[10px] text-muted-foreground font-bold tracking-widest uppercase mt-1">Calibrate model sensitivity to prevent false-positives</p>
                    </div>

                    <div className="space-y-12">
                       <div className="space-y-4">
                          <div className="flex items-center justify-between">
                             <span className="text-xs font-bold text-foreground font-space uppercase tracking-widest">Global Risk Sensitivity</span>
                             <span className="text-xl font-mono font-bold text-primary">{threshold}%</span>
                          </div>
                          <input 
                             type="range" 
                             min="0" 
                             max="100" 
                             value={threshold}
                             onChange={(e) => setThreshold(parseInt(e.target.value))}
                             className="w-full h-1 bg-white/5 rounded-full appearance-none cursor-pointer accent-primary"
                          />
                          <div className="flex justify-between text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest px-1">
                             <span>Relaxed (High Passive)</span>
                             <span>Balanced</span>
                             <span>Aggressive (Hyper Vigilant)</span>
                          </div>
                       </div>

                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-white/5">
                          <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center space-x-6">
                             <div className="h-12 w-12 rounded-xl bg-secondary/10 flex items-center justify-center text-secondary">
                                <Shield size={24} />
                             </div>
                             <div>
                                <h4 className="text-xs font-bold font-space uppercase tracking-widest text-foreground">Auto-Guard</h4>
                                <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest mt-1">Automatically block scores above 95%</p>
                             </div>
                             <div className="ml-auto">
                                <div className="h-6 w-11 rounded-full bg-secondary relative cursor-pointer shadow-[0_0_10px_rgba(78,222,163,0.3)]">
                                   <div className="absolute right-1 top-1 h-4 w-4 rounded-full bg-white transition-all" />
                                </div>
                             </div>
                          </div>
                          <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center space-x-6">
                             <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                <Cpu size={24} />
                             </div>
                             <div>
                                <h4 className="text-xs font-bold font-space uppercase tracking-widest text-foreground">Shadow Evaluation</h4>
                                <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest mt-1">Run experimental model in background</p>
                             </div>
                             <div className="ml-auto">
                                <div className="h-6 w-11 rounded-full bg-white/10 relative cursor-pointer">
                                   <div className="absolute left-1 top-1 h-4 w-4 rounded-full bg-muted-foreground transition-all" />
                                </div>
                             </div>
                          </div>
                       </div>
                    </div>
                 </div>
               )}

               {activeTab === "security" && (
                 <div className="space-y-10 animate-in fade-in duration-500">
                    <div>
                       <h3 className="text-xl font-bold font-space uppercase tracking-widest text-foreground">Intelligence API Protocols</h3>
                       <p className="text-[10px] text-muted-foreground font-bold tracking-widest uppercase mt-1">Manage core encryption keys and service credentials</p>
                    </div>

                    <div className="space-y-6">
                       <div className="glass p-6 rounded-2xl border border-white/5 space-y-4">
                          <div className="flex items-center justify-between">
                             <div className="flex items-center space-x-3">
                                <Key size={16} className="text-primary/60" />
                                <span className="text-[10px] font-bold text-foreground uppercase tracking-widest">Main Production Key (v2)</span>
                             </div>
                             <span className="text-[9px] font-bold text-secondary uppercase tracking-[0.2em] animate-pulse">Live / Active</span>
                          </div>
                          <div className="relative">
                             <input 
                                type="password" 
                                readOnly
                                value="sh-fs-8291-x992-neural-alpha-001"
                                className="h-12 w-full rounded-xl bg-black px-4 text-xs font-mono font-bold text-primary tracking-widest"
                             />
                             <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center space-x-2">
                                <button className="h-8 w-8 rounded-lg bg-white/5 flex items-center justify-center text-muted-foreground hover:text-white"><Copy size={14} /></button>
                             </div>
                          </div>
                       </div>

                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <button className="h-14 rounded-2xl border border-white/5 bg-white/[0.02] text-[10px] font-bold font-space uppercase tracking-widest hover:bg-white/5 transition-all">Rotate All Keys</button>
                          <button className="h-14 rounded-2xl border border-white/5 bg-white/[0.02] text-[10px] font-bold font-space uppercase tracking-widest hover:bg-white/5 transition-all text-error">Revoke Access</button>
                       </div>
                    </div>
                 </div>
               )}
            </div>
         </div>
      </div>
    </DashboardLayout>
  );
}
