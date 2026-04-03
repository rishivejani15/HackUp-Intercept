"use client";

import React, { useState, useMemo } from "react";
import { fraudData, FraudTransaction } from "@/data/fraudData";
import { Play, ShieldAlert, Crosshair, Network, TrendingUp, AlertOctagon, Activity, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface FraudSimulationProps {
   onSimulate: (scenario: string, transactions: FraudTransaction[]) => void;
   activeScenario: string | null;
   isStreaming: boolean;
   onToggleStreaming: (val: boolean) => void;
   transactions: FraudTransaction[];
}

export default function FraudSimulation({ onSimulate, activeScenario, isStreaming, onToggleStreaming, transactions }: FraudSimulationProps) {

   const handleSimulate = (scenario: string) => {
      if (activeScenario === scenario) {
         onSimulate("", []);
         return;
      }
      const baseTXs = fraudData.filter(t => t.scenario_type === "normal");
      const attackTXs = fraudData.filter(t => t.scenario_type === scenario);
      onSimulate(scenario, [...baseTXs, ...attackTXs]);
   };

   const scenarios = [
      { id: "ato_attack", label: "ATO Attack", icon: Crosshair, color: "text-error" },
      { id: "fraud_ring", label: "Fraud Ring", icon: Network, color: "text-secondary" },
      { id: "coordinated_attack", label: "Coordinated Attack", icon: ShieldAlert, color: "text-warning" },
      { id: "money_laundering", label: "AML Structuring", icon: TrendingUp, color: "text-[#a855f7]" }
   ];

   // Financial Metrics Calculation
   const stats = useMemo(() => {
      const total = transactions.reduce((acc, curr) => acc + curr.amount, 0);
      const blocked = transactions
         .filter(t => t.decision === "BLOCK")
         .reduce((acc, curr) => acc + curr.amount, 0);
      const risk = transactions
         .filter(t => t.decision === "REVIEW")
         .reduce((acc, curr) => acc + curr.amount, 0);

      return { total, blocked, risk };
   }, [transactions]);

   // Recent high-value flows for the ticker
   const recentFlows = useMemo(() => {
      return [...transactions].reverse().slice(0, 5);
   }, [transactions]);

   return (
      <div className="glass-card rounded-[2rem] p-8 border border-white/5 mb-10 overflow-hidden relative group">
         {/* Background Decorative Grid */}
         <div className="absolute inset-0 opacity-[0.02] bg-[url('/grid.svg')] pointer-events-none"></div>

         <div className="relative z-10 flex flex-col xl:flex-row items-center gap-10">

            {/* Controls Section */}
            <div className="flex-1 flex flex-col md:flex-row items-start md:items-center justify-between gap-8 w-full border-r border-white/5 pr-0 xl:pr-10">
               <div className="space-y-4 w-full md:w-auto">
                  <div className="flex items-center gap-6">
                     <div>
                        <h2 className="text-2xl font-bold font-space uppercase tracking-tight text-foreground flex items-center gap-3">
                           <Activity size={22} className="text-primary animate-pulse" />
                           Forensic SIMULATOR
                        </h2>
                        <p className="text-[10px] text-muted-foreground mt-1 font-bold uppercase tracking-[0.2em] opacity-60">
                           Injected Telemetry: <span className={cn(isStreaming ? "text-error animate-pulse" : "text-muted-foreground")}>{isStreaming ? 'ACTIVE' : 'IDLE'}</span>
                        </p>
                     </div>

                     <button
                        onClick={() => onToggleStreaming(!isStreaming)}
                        className={cn(
                           "flex items-center gap-3 px-8 py-4 rounded-2xl border transition-all duration-500",
                           isStreaming
                              ? "bg-error text-white border-error shadow-[0_0_25px_rgba(239,68,68,0.4)]"
                              : "bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10"
                        )}
                     >
                        <Play size={18} fill={isStreaming ? "white" : "none"} />
                        <span className="text-xs font-bold uppercase tracking-[0.25em]">
                           {isStreaming ? 'STOP STREAM' : 'START STREAM'}
                        </span>
                     </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                     {scenarios.map(s => {
                        const isActive = activeScenario === s.id;
                        return (
                           <button
                              key={s.id}
                              onClick={() => handleSimulate(s.id)}
                              className={cn(
                                 "flex items-center gap-3 px-5 py-3 rounded-xl border text-[10px] font-bold font-space uppercase tracking-[0.15em] transition-all",
                                 isActive
                                    ? `bg-primary/20 border-primary/40 text-primary shadow-[0_0_20px_rgba(185,199,224,0.15)]`
                                    : "bg-white/[0.02] border-white/5 text-muted-foreground hover:bg-white/[0.05] hover:text-foreground"
                              )}
                           >
                              <s.icon size={14} className={isActive ? "text-primary animate-pulse" : "opacity-40"} />
                              <span>{s.label}</span>
                           </button>
                        )
                     })}
                  </div>
               </div>
            </div>

            {/* Cash Flow Metrics Section */}
            <div className="w-full xl:w-[45%] grid grid-cols-2 lg:grid-cols-3 gap-6">
               <div className="space-y-1.5 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                  <div className="flex items-center gap-2 text-muted-foreground/60">
                     <TrendingUp size={12} />
                     <span className="text-[9px] font-bold uppercase tracking-widest">Total Flow</span>
                  </div>
                  <p className="text-lg font-bold font-space text-foreground">${stats.total.toLocaleString()}</p>
               </div>

               <div className="space-y-1.5 p-4 rounded-2xl bg-secondary/5 border border-secondary/10">
                  <div className="flex items-center gap-2 text-secondary/60">
                     <AlertOctagon size={12} />
                     <span className="text-[9px] font-bold uppercase tracking-widest">Intercepted</span>
                  </div>
                  <p className="text-lg font-bold font-space text-secondary">${stats.blocked.toLocaleString()}</p>
               </div>

               <div className="hidden lg:block space-y-1.5 p-4 rounded-2xl bg-white/[0.02] border border-white/5 overflow-hidden relative">
                  <div className="flex items-center gap-2 text-muted-foreground/40 mb-2">
                     <DollarSign size={10} />
                     <span className="text-[8px] font-bold uppercase tracking-widest">Live Flow</span>
                  </div>
                  <div className="flex flex-col gap-2 h-10 overflow-hidden">
                     <AnimatePresence mode="popLayout">
                        {recentFlows.map((tx, idx) => (
                           <motion.div
                              key={`${tx.id}-${idx}`}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.9 }}
                              className="flex items-center justify-between text-[10px] font-mono font-bold"
                           >
                              <span className={cn(
                                 tx.decision === "BLOCK" ? "text-error" :
                                    tx.decision === "REVIEW" ? "text-warning" : "text-secondary"
                              )}>${tx.amount}</span>
                              <span className="text-muted-foreground/40 shrink-0">→ {tx.merchant_id?.slice(0, 5) || "MKT"}</span>
                           </motion.div>
                        ))}
                     </AnimatePresence>
                  </div>
               </div>
            </div>
         </div>
      </div>
   );
}

