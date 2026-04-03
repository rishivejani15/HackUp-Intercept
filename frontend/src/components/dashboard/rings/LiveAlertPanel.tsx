"use client";

import React, { useMemo } from "react";
import { FraudTransaction } from "@/data/fraudData";
import { AlertCircle, ShieldAlert, Zap } from "lucide-react";

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
          title: `🚨 Fraud Ring Detected: ${mId}`,
          merchant: mId,
          reason: "Multiple critical block rules triggered on single merchant."
       }));

    const txAlerts = blocks.map(t => ({
      id: t.transaction_id,
      user: t.user_id,
      type: "TX",
      title: "🚨 Fraud Detected",
      merchant: t.merchant_id,
      reason: `Risk Score High (${(t.final_risk_score * 100).toFixed(1)}%)`,
    }));

    // Specific ordering: Rings first, then individual blocks
    return [...ringAlerts, ...txAlerts].slice(0, 10);
  }, [transactions]);

  return (
    <div className="glass-card rounded-[2rem] p-6 border border-white/5 h-full flex flex-col overflow-hidden">
       <div className="flex items-center gap-3 mb-6">
          <div className="h-2 w-2 rounded-full bg-error animate-ping" />
          <h3 className="text-sm font-bold font-space uppercase tracking-widest text-foreground">Live Telemetry</h3>
       </div>

       <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
          {alerts.length === 0 ? (
             <div className="h-full flex flex-col items-center justify-center text-muted-foreground/50 h-32 space-y-3">
                <ShieldAlert size={32} className="opacity-20" />
                <span className="text-[10px] font-space tracking-widest uppercase">System Secure</span>
             </div>
          ) : (
             alerts.map(alert => (
               <div key={alert.id} className="p-4 rounded-2xl bg-error/10 border border-error/20 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="flex items-start justify-between">
                     <h4 className="text-xs font-bold font-space uppercase tracking-tight text-white mb-2 flex items-center gap-2">
                        {alert.type === "RING" ? <Zap size={14} className="text-error" /> : <AlertCircle size={14} className="text-error" />}
                        {alert.title}
                     </h4>
                  </div>
                  <div className="flex flex-col gap-1.5 mb-2">
                     <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-[#ef4444]" title="User Status: Blocked" />
                        <p className="text-[10px] text-white/70 font-mono">{alert.type === "RING" ? "MULTI-NODE CLUSTER" : `USER: ${alert.user || 'ANALYST'}`}</p>
                     </div>
                     <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-[#6366f1]" title="Merchant Status: Active" />
                        <p className="text-[10px] text-error font-bold uppercase tracking-widest">Target: {alert.merchant}</p>
                     </div>
                  </div>
                  <p className="text-[10px] text-white/50">{alert.reason}</p>
               </div>
             ))
          )}
       </div>
    </div>
  );
}
