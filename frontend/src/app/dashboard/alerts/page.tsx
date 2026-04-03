"use client";

import React, { useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { 
  ShieldAlert, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Eye, 
  CheckCircle, 
  XCircle,
  AlertTriangle,
  History,
  Zap
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

import { useFirestoreCollection } from "@/hooks/useFirestoreCollection";
import { query, orderBy, limit } from "firebase/firestore";

const MOCK_ALERTS = [
  {
    id: "AL-8291",
    timestamp: "2024-04-02 14:24:12",
    type: "High Velocity",
    severity: "CRITICAL",
    entity: "Acc: 8291-XX",
    score: 98.4,
    status: "UNRESOLVED",
    details: "14 transactions detected in 2.4 seconds across 3 geo-locations."
  },
  {
    id: "AL-8292",
    timestamp: "2024-04-02 14:20:05",
    type: "Mismatched Geo",
    severity: "HIGH",
    entity: "Acc: 4410-XX",
    score: 82.1,
    status: "INVESTIGATING",
    details: "Transaction initiated in Warsaw, Poland. Previous session active in New York."
  },
  {
    id: "AL-8293",
    timestamp: "2024-04-02 14:15:33",
    type: "Unusual Merchant",
    severity: "MEDIUM",
    entity: "Acc: 1102-XX",
    score: 64.8,
    status: "UNRESOLVED",
    details: "High-value purchase at atypical luxury merchant 'GoldReserve LLC'."
  },
  {
    id: "AL-8294",
    timestamp: "2024-04-02 14:02:11",
    type: "Scripted Pattern",
    severity: "CRITICAL",
    entity: "Acc: 9928-XX",
    score: 94.2,
    status: "RESOLVED",
    details: "Behavioral fingerprint indicates automated bot interaction during checkout."
  }
];

export default function AlertsPage() {
  const [selectedAlert, setSelectedAlert] = useState<string | null>(null);

  const { data: firestoreAlerts } = useFirestoreCollection("alerts", [
    orderBy("timestamp", "desc"),
    limit(20)
  ]);

  const alerts = firestoreAlerts.length > 0 ? firestoreAlerts : MOCK_ALERTS;
  const activeAlert = alerts.find(a => a.id === selectedAlert);

  return (
    <DashboardLayout>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div className="space-y-4">
          <div className="flex items-center space-x-3 text-error font-bold text-[10px] uppercase tracking-[0.3em]">
            <div className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-error opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-error shadow-[0_0_8px_rgba(255,82,80,0.8)]"></span>
            </div>
            <span>Alert Intelligence Hub</span>
          </div>
          <h1 className="text-5xl font-bold font-space tracking-tight text-foreground">
            THREAT <span className="text-primary/60">ALERTS</span>
          </h1>
          <p className="text-muted-foreground max-w-xl text-sm leading-relaxed font-medium">
            Active behavioral anomalies requiring human intervention or model evaluation.
          </p>
        </div>

        <div className="flex items-center space-x-3">
           <div className="glass px-5 py-3 rounded-2xl border border-black/10 flex items-center space-x-4">
              <History size={16} className="text-primary/60" />
              <div className="flex flex-col">
                 <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest leading-none">Last Audit</span>
                 <span className="text-xs font-bold text-foreground uppercase mt-1">14:24:12</span>
              </div>
           </div>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main Feed */}
        <div className="lg:col-span-2 space-y-6">
           {/* Filters Bar */}
           <div className="glass rounded-[1.5rem] p-4 border border-black/10 flex items-center justify-between gap-4">
              <div className="relative flex-1 group">
                 <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/40 group-focus-within:text-primary transition-colors" />
                 <input 
                    type="text" 
                    placeholder="Search by Entity or ID..." 
                    className="h-12 w-full rounded-2xl bg-slate-100 border border-black/10 pl-12 pr-4 text-xs font-space font-bold uppercase tracking-widest focus:outline-none focus:ring-1 focus:ring-primary/20"
                 />
              </div>
              <button className="h-12 w-12 rounded-2xl glass border border-black/10 flex items-center justify-center text-muted-foreground hover:bg-slate-100">
                 <Filter size={18} />
              </button>
           </div>

           {/* Alerts Stream */}
           <div className="space-y-4">
              {alerts.map((alert, idx) => (
                <motion.div 
                   key={alert.id}
                   initial={{ opacity: 0, y: 20 }}
                   animate={{ opacity: 1, y: 0 }}
                   transition={{ delay: idx * 0.1 }}
                   onClick={() => setSelectedAlert(alert.id)}
                   className={cn(
                     "glass-card cursor-pointer relative overflow-hidden p-6 rounded-3xl border border-black/10 transition-all duration-300 hover:bg-slate-100",
                     selectedAlert === alert.id && "ring-1 ring-primary/40 bg-white/[0.05]"
                   )}
                >
                   {/* Status Indicator Pillar */}
                   <div className={cn(
                     "absolute left-0 top-0 bottom-0 w-1",
                     alert.severity === "CRITICAL" ? "bg-error shadow-[0_0_10px_rgba(255,82,80,0.5)]" :
                     alert.severity === "HIGH" ? "bg-tertiary" : "bg-primary"
                   )} />

                   <div className="flex items-start justify-between">
                      <div className="space-y-3">
                         <div className="flex items-center space-x-3">
                            <span className="text-[10px] font-mono font-bold text-muted-foreground/60">{alert.id}</span>
                            <span className={cn(
                              "text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-[0.1em]",
                              alert.severity === "CRITICAL" ? "text-error bg-error/10" :
                              alert.severity === "HIGH" ? "text-tertiary bg-tertiary/10" : "text-primary bg-primary/10"
                            )}>
                               {alert.severity}
                            </span>
                         </div>
                         <h3 className="text-xl font-bold font-space text-foreground tracking-tight">{alert.type}</h3>
                         <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-2">
                               <div className="h-1.5 w-1.5 rounded-full bg-primary/40 shadow-[0_0_4px_rgba(185,199,224,0.4)]" />
                               <span className="text-xs font-bold text-muted-foreground uppercase">{alert.entity}</span>
                            </div>
                            <div className="text-[10px] font-mono text-muted-foreground/40">{alert.timestamp}</div>
                         </div>
                      </div>

                      <div className="text-right space-y-2">
                         <div className="text-xs font-space font-bold uppercase tracking-widest text-muted-foreground/40 leading-none">Risk Score</div>
                         <div className={cn(
                           "text-3xl font-space font-bold tracking-tighter",
                           alert.score > 90 ? "text-error" : alert.score > 70 ? "text-tertiary" : "text-primary"
                         )}>
                            {alert.score}%
                         </div>
                      </div>
                   </div>
                </motion.div>
              ))}
           </div>
        </div>

        {/* Intelligence Sidepanel */}
        <div className="space-y-6">
           <div className="glass-card rounded-[2rem] p-8 border border-black/10 sticky top-24">
              <div className="flex items-center space-x-3 mb-8">
                 <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <Zap size={20} />
                 </div>
                 <h2 className="text-lg font-bold font-space uppercase tracking-tight">Active Intel</h2>
              </div>

              {activeAlert ? (
                <div className="space-y-8 animate-in fade-in duration-500">
                   <div>
                      <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Narrative Breakdown</h4>
                      <p className="text-sm font-medium leading-relaxed">
                         {activeAlert.details}
                      </p>
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 rounded-2xl bg-slate-100 border border-black/10">
                         <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Status</span>
                         <span className="text-xs font-bold text-foreground">PENDING REVIEW</span>
                      </div>
                      <div className="p-4 rounded-2xl bg-slate-100 border border-black/10">
                         <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Assignee</span>
                         <span className="text-xs font-bold text-foreground">Analyst-01</span>
                      </div>
                   </div>

                   <div className="space-y-3 pt-6 border-t border-black/10">
                      <button className="w-full h-14 rounded-2xl bg-error text-white text-[10px] font-bold font-space uppercase tracking-[0.2em] hover:bg-error/90 transition-all flex items-center justify-center space-x-2 shadow-lg shadow-error/10">
                         <XCircle size={16} />
                         <span>Execute Block</span>
                      </button>
                      <button className="w-full h-14 rounded-2xl glass border border-black/15 text-foreground text-[10px] font-bold font-space uppercase tracking-[0.2em] hover:bg-slate-100 transition-all flex items-center justify-center space-x-2">
                         <CheckCircle size={16} className="text-secondary" />
                         <span>Dismiss / False Pos</span>
                      </button>
                   </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center h-[300px]">
                   <AlertTriangle className="text-muted-foreground/20 mb-4" size={48} />
                   <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest leading-relaxed">
                      Select a detection signal<br/>for deep intelligence breakdown.
                   </p>
                </div>
              )}
           </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
