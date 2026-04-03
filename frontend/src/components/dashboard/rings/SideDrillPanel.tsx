"use client";

import React from "react";
import { X, Shield, User, Store, AlertTriangle, CheckCircle, Activity, ExternalLink } from "lucide-react";
import { FraudTransaction } from "@/data/fraudData";

interface SideDrillPanelProps {
  node: any; // The selected node from the graph
  transactions: FraudTransaction[];
  onClose: () => void;
}

export default function SideDrillPanel({ node, transactions, onClose }: SideDrillPanelProps) {
  if (!node) return null;

  const isMerchant = node.group === "Merchant";
  const entityId = node.id;
  
  // Filter transactions related to this entity
  const relatedTx = transactions.filter(t => 
    isMerchant ? t.merchant_id === entityId : t.user_id === entityId
  );

  const highestRisk = Math.max(...relatedTx.map(t => t.final_risk_score), 0);
  const totalAmount = relatedTx.reduce((sum, t) => sum + t.amount, 0);
  const decision = relatedTx.some(t => t.decision === "BLOCK") ? "BLOCK" : 
                   relatedTx.some(t => t.decision === "REVIEW") ? "REVIEW" : "APPROVE";

  return (
    <div className="fixed inset-y-0 right-0 w-96 z-[100] animate-in slide-in-from-right duration-300">
      {/* Backdrop for closing */}
      <div 
        className="absolute inset-0 bg-black/20 backdrop-blur-sm -left-[100vw]" 
        onClick={onClose}
      />
      
      {/* The Panel */}
      <div className="relative h-full w-full bg-[#0B0E14]/90 backdrop-blur-2xl border-l border-white/10 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className={`p-2 rounded-lg ${isMerchant ? 'bg-indigo-500/20 text-indigo-400' : 'bg-primary-500/20 text-primary-400'}`}>
                {isMerchant ? <Store size={20} /> : <User size={20} />}
             </div>
             <div>
                <h3 className="text-sm font-bold font-space uppercase tracking-widest text-foreground">
                   {isMerchant ? 'Merchant Profile' : 'User Forensic'}
                </h3>
                <p className="text-[10px] font-mono text-muted-foreground">{entityId}</p>
             </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/5 rounded-full transition-colors text-muted-foreground hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
          
          {/* Risk Card */}
          <div className="relative overflow-hidden p-6 rounded-[2rem] bg-white/5 border border-white/5">
             <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Aggregate Risk</span>
                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase ${
                   decision === "BLOCK" ? 'bg-error/20 text-error' :
                   decision === "REVIEW" ? 'bg-warning/20 text-warning' : 'bg-secondary/20 text-secondary'
                }`}>
                   {decision === "BLOCK" ? <AlertTriangle size={12} /> : <CheckCircle size={12} />}
                   {decision}
                </div>
             </div>
             <div className="flex items-end gap-2">
                <span className="text-4xl font-bold font-space">{(highestRisk * 100).toFixed(1)}</span>
                <span className="text-xs font-bold text-muted-foreground mb-1.5">%</span>
             </div>
             {/* Progress bar */}
             <div className="h-1.5 w-full bg-white/5 rounded-full mt-4 overflow-hidden">
                <div 
                   className={`h-full rounded-full transition-all duration-1000 ${
                      decision === "BLOCK" ? 'bg-error shadow-[0_0_10px_rgba(239,68,68,0.5)]' :
                      decision === "REVIEW" ? 'bg-warning' : 'bg-secondary'
                   }`}
                   style={{ width: `${highestRisk * 100}%` }}
                />
             </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
             <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                <span className="text-[9px] font-bold uppercase tracking-tighter text-muted-foreground block mb-1">Total Volume</span>
                <span className="text-lg font-bold font-space">${totalAmount.toLocaleString()}</span>
             </div>
             <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                <span className="text-[9px] font-bold uppercase tracking-tighter text-muted-foreground block mb-1">TX Count</span>
                <span className="text-lg font-bold font-space">{relatedTx.length}</span>
             </div>
          </div>

          {/* Recent Activity */}
          <div className="space-y-4">
             <div className="flex items-center gap-2 mb-2">
                <Activity size={14} className="text-primary" />
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-foreground">Recent Telemetry</h4>
             </div>
             <div className="space-y-3">
                {relatedTx.map(tx => (
                   <div key={tx.transaction_id} className="p-3 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors group cursor-pointer">
                      <div className="flex items-center justify-between mb-1">
                         <span className="text-[10px] font-mono text-white/70">{tx.transaction_id}</span>
                         <span className={`text-[9px] font-bold ${
                            tx.decision === "BLOCK" ? 'text-error' : 'text-secondary'
                         }`}>${tx.amount}</span>
                      </div>
                      <p className="text-[9px] text-muted-foreground line-clamp-1">{tx.scenario_type.replace('_', ' ').toUpperCase()}</p>
                   </div>
                ))}
             </div>
          </div>
        </div>

        {/* Actions Footer */}
        <div className="p-6 border-t border-white/5 bg-white/5 space-y-3">
           <button className="w-full py-3 rounded-xl bg-error text-white text-xs font-bold uppercase tracking-widest shadow-lg shadow-error/20 hover:scale-[1.02] active:scale-95 transition-all">
              Initiate Hard Block
           </button>
           <button className="w-full py-3 rounded-xl bg-white/10 text-white text-xs font-bold uppercase tracking-widest border border-white/10 hover:bg-white/15 transition-all">
              Request Forensic Audit
           </button>
        </div>
      </div>
    </div>
  );
}
