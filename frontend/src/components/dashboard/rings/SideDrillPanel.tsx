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
      <div className="fixed inset-0 z-[100] animate-in fade-in duration-200 pointer-events-none">
         {/* Backdrop for closing */}
         <div
            className="absolute inset-0 bg-black/20 backdrop-blur-sm pointer-events-auto"
            onClick={onClose}
         />

         {/* The Panel */}
         <div className="absolute top-0 right-0 h-full w-full max-w-[calc(100vw-0.75rem)] sm:max-w-96 bg-white backdrop-blur-2xl border-l border-slate-200 shadow-2xl shadow-slate-200/60 flex flex-col pointer-events-auto overflow-hidden">
        {/* Header */}
            <div className="p-5 sm:p-6 border-b border-slate-200 flex items-center justify-between gap-3 min-w-0">
               <div className="flex items-center gap-3 min-w-0">
             <div className={`p-2 rounded-lg ${isMerchant ? 'bg-indigo-500/10 text-indigo-600' : 'bg-primary-500/10 text-primary-600'}`}>
                {isMerchant ? <Store size={20} /> : <User size={20} />}
             </div>
                   <div className="min-w-0">
                        <h3 className="text-sm font-bold font-space uppercase tracking-widest text-slate-900 break-words">
                   {isMerchant ? 'Merchant Profile' : 'User Forensic'}
                </h3>
                        <p className="text-[10px] font-mono text-slate-500 break-all leading-snug">{entityId}</p>
             </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500 hover:text-slate-900"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto p-5 sm:p-6 space-y-8 custom-scrollbar">
          
          {/* Risk Card */}
          <div className="relative overflow-hidden p-6 rounded-[2rem] bg-slate-50 border border-slate-200">
             <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Aggregate Risk</span>
                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase ${
                   decision === "BLOCK" ? 'bg-error/10 text-error' :
                   decision === "REVIEW" ? 'bg-warning/10 text-warning' : 'bg-secondary/10 text-secondary'
                }`}>
                   {decision === "BLOCK" ? <AlertTriangle size={12} /> : <CheckCircle size={12} />}
                   {decision}
                </div>
             </div>
             <div className="flex items-end gap-2 min-w-0">
                <span className="text-4xl font-bold font-space text-slate-900 tabular-nums">{(highestRisk * 100).toFixed(1)}</span>
                <span className="text-xs font-bold text-slate-500 mb-1.5">%</span>
             </div>
             {/* Progress bar */}
             <div className="h-1.5 w-full bg-slate-200 rounded-full mt-4 overflow-hidden">
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
          <div className="grid grid-cols-2 gap-4 min-w-0">
             <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 min-w-0">
                <span className="text-[9px] font-bold uppercase tracking-tighter text-slate-500 block mb-1">Total Volume</span>
                <span className="text-lg font-bold font-space text-slate-900 break-words tabular-nums">${totalAmount.toLocaleString()}</span>
             </div>
             <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 min-w-0">
                <span className="text-[9px] font-bold uppercase tracking-tighter text-slate-500 block mb-1">TX Count</span>
                <span className="text-lg font-bold font-space text-slate-900">{relatedTx.length}</span>
             </div>
          </div>

          {/* Recent Activity */}
          <div className="space-y-4">
             <div className="flex items-center gap-2 mb-2">
                <Activity size={14} className="text-primary" />
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-900">Recent Telemetry</h4>
             </div>
             <div className="space-y-3 min-w-0">
                {relatedTx.map(tx => (
                   <div key={tx.transaction_id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 hover:border-slate-300 transition-colors group cursor-pointer min-w-0 overflow-hidden">
                      <div className="flex items-center justify-between gap-3 mb-1 min-w-0">
                         <span className="text-[10px] font-mono text-slate-700 break-all leading-snug min-w-0">{tx.transaction_id}</span>
                         <span className={`text-[9px] font-bold ${
                            tx.decision === "BLOCK" ? 'text-error' : 'text-secondary'
                         } tabular-nums shrink-0`}>${tx.amount}</span>
                      </div>
                      <p className="text-[9px] text-slate-500 line-clamp-2 break-words">{tx.scenario_type.replace('_', ' ').toUpperCase()}</p>
                   </div>
                ))}
             </div>
          </div>
        </div>

        {/* Actions Footer */}
        <div className="p-5 sm:p-6 border-t border-slate-200 bg-slate-50 space-y-3">
           <button className="w-full py-3 rounded-xl bg-error text-white text-xs font-bold uppercase tracking-widest shadow-lg shadow-error/20 hover:scale-[1.02] active:scale-95 transition-all whitespace-normal text-center">
              Initiate Hard Block
           </button>
           <button className="w-full py-3 rounded-xl bg-white text-slate-900 text-xs font-bold uppercase tracking-widest border border-slate-200 hover:bg-slate-100 transition-all whitespace-normal text-center">
              Request Forensic Audit
           </button>
        </div>
      </div>
    </div>
  );
}
