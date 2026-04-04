"use client";

import React, { useMemo } from "react";
import { FraudTransaction } from "@/data/fraudData";
import { AlertCircle, ShieldAlert, Zap, TrendingUp } from "lucide-react";

interface LiveAlertPanelProps {
  transactions: FraudTransaction[];
}

export default function LiveAlertPanel({ transactions }: LiveAlertPanelProps) {
  
  const alerts = useMemo(() => {
    const blocks = transactions.filter(t => t.decision === "BLOCK");
    
    // Detect merchant receiving multiple blocks
    const merchantBlockCount: Record<string, number> = {};
    blocks.forEach(t => {
      merchantBlockCount[t.merchant_id] = (merchantBlockCount[t.merchant_id] || 0) + 1;
    });

    const ringAlerts = Object.entries(merchantBlockCount)
       .filter(([mId, count]) => count > 1)
       .map(([mId]) => ({
          id: `ring-${mId}`,
          type: "RING",
          title: "🚨 Fraud Ring Detected",
          merchant: mId,
          user: undefined,
          color: "bg-error/10 border-error/20 text-error",
          reason: "Multiple critical block rules triggered on single merchant cluster."
       }));

    // Detect Money Laundering Chains
    const mlTXs = transactions.filter(t => t.scenario_type === "money_laundering");
    const mlAlerts = mlTXs.length > 0 ? [{
       id: "aml-cycle-1",
       type: "AML",
       title: "🌀 AML Cycle Detected",
       merchant: "CIRCULAR FLOW",
       user: "MULTI-NODE",
       color: "bg-[#a855f7]/20 border-[#a855f7]/40 text-[#a855f7]",
       reason: "Circular fund movement across 5+ accounts [Layering detected]."
    }] : [];

    const txAlerts = blocks.map(t => ({
      id: t.transaction_id,
      user: t.user_id,
      type: "TX",
      title: "🚨 Fraud Detected",
      merchant: t.merchant_id,
      color: "bg-error/10 border-error/20 text-error",
      reason: `Risk Score High (${(t.final_risk_score * 100).toFixed(1)}%)`,
    }));

    const sortedTxAlerts = [...txAlerts].reverse();

    // Specific ordering: AML first (Critical), then Rings, then newest individual blocks
    return [...mlAlerts, ...ringAlerts, ...sortedTxAlerts].slice(0, 10);
  }, [transactions]);

  return (
    <div className="rounded-[2rem] p-6 border border-slate-200 bg-white h-full flex flex-col overflow-hidden shadow-sm">
       <div className="flex items-center gap-3 mb-6">
          <div className="h-2 w-2 rounded-full bg-error animate-ping" />
          <h3 className="text-sm font-bold font-space uppercase tracking-widest text-slate-900">Live Telemetry</h3>
       </div>

       <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
          {alerts.length === 0 ? (
             <div className="h-full flex flex-col items-center justify-center text-slate-400 h-32 space-y-3">
                <ShieldAlert size={32} className="opacity-20" />
                <span className="text-[10px] font-space tracking-widest uppercase">System Secure</span>
             </div>
          ) : (
             alerts.map(alert => (
               <div key={alert.id} className={`p-4 rounded-2xl border animate-in fade-in slide-in-from-bottom-2 duration-300 shadow-sm overflow-hidden ${alert.color}`}>
                  <div className="flex items-start justify-between gap-3 min-w-0">
                     <h4 className={`text-xs font-bold font-space uppercase tracking-tight mb-2 flex items-center gap-2 min-w-0 break-words ${alert.type === "AML" ? "text-slate-900" : "text-slate-900"}`}>
                        {alert.type === "RING" ? <Zap size={14} /> : alert.type === "AML" ? <TrendingUp size={14} className="text-[#a855f7]" /> : <AlertCircle size={14} />}
                        {alert.title}
                     </h4>
                  </div>
                  <div className="flex flex-col gap-1.5 mb-2 min-w-0">
                     <div className="flex items-center gap-2">
                        <div className={`h-2 w-2 rounded-full ${alert.type === "AML" ? "bg-[#a855f7]" : "bg-[#ef4444]"}`} title="Node Status" />
                        <p className="text-[10px] text-slate-600 font-mono break-all leading-snug">{alert.user || "ANALYST"}</p>
                     </div>
                     <div className="flex items-center gap-2 min-w-0">
                        <div className="h-2 w-2 rounded-full bg-[#6366f1]" title="Merchant Status" />
                        <p className={`text-[10px] font-bold uppercase tracking-widest break-words leading-snug ${alert.type === "AML" ? "text-[#a855f7]" : "text-error"}`}>Target: {alert.merchant}</p>
                     </div>
                  </div>
                  <p className="text-[10px] text-slate-500 break-words leading-snug">{alert.reason}</p>
               </div>
             ))
          )}
       </div>
    </div>
  );
}
