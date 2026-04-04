"use client";

import React from "react";
import { FraudTransaction } from "@/data/fraudData";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface TransactionTableProps {
  transactions: FraudTransaction[];
}

export default function TransactionTable({ transactions }: TransactionTableProps) {
  
  const getDecisionBadge = (decision: string) => {
    switch(decision) {
      case "APPROVE":
        return <span className="px-2 py-1 rounded bg-secondary/10 border border-secondary/20 text-secondary text-[9px] font-bold tracking-widest uppercase">Approve</span>;
      case "REVIEW":
        return <span className="px-2 py-1 rounded bg-warning/10 border border-warning/20 text-warning text-[9px] font-bold tracking-widest uppercase">Review</span>;
      case "BLOCK":
        return <span className="px-2 py-1 rounded bg-error/10 border border-error/20 text-error text-[9px] font-bold tracking-widest uppercase animate-pulse">Block</span>;
      default:
        return null;
    }
  };

  const getRiskColorClass = (score: number) => {
    if (score >= 0.8) return "bg-error shadow-[0_0_8px_rgba(239,68,68,0.8)]";
    if (score >= 0.5) return "bg-warning shadow-[0_0_8px_rgba(245,158,11,0.8)]";
    return "bg-secondary shadow-[0_0_8px_rgba(78,222,163,0.8)]";
  };

  return (
    <div className="rounded-[2rem] overflow-hidden border border-slate-200 bg-white mt-8 shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 text-[10px] font-bold font-space uppercase tracking-widest text-slate-500 w-32">TX ID</th>
              <th className="px-6 py-4 text-[10px] font-bold font-space uppercase tracking-widest text-slate-500">Entity Flow</th>
              <th className="px-6 py-4 text-[10px] font-bold font-space uppercase tracking-widest text-slate-500">Amount</th>
              <th className="px-6 py-4 text-[10px] font-bold font-space uppercase tracking-widest text-slate-500">Scenario</th>
              <th className="px-6 py-4 text-[10px] font-bold font-space uppercase tracking-widest text-slate-500 w-40">Probability</th>
              <th className="px-6 py-4 text-[10px] font-bold font-space uppercase tracking-widest text-slate-500 w-40">Risk Score</th>
              <th className="px-6 py-4 text-[10px] font-bold font-space uppercase tracking-widest text-slate-500 w-24">Decision</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {transactions.length === 0 ? (
               <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-xs text-slate-500 uppercase tracking-widest font-space">
                     No Telemetry Data
                  </td>
               </tr>
            ) : transactions.map((t) => (
              <tr key={t.transaction_id} className="hover:bg-slate-50 transition-colors group">
                 <td className="px-6 py-4 max-w-[14rem]">
                   <span className="font-mono text-xs text-slate-800 break-all leading-snug block">{t.transaction_id}</span>
                </td>
                 <td className="px-6 py-4 max-w-[18rem]">
                   <div className="flex items-center gap-2 min-w-0 flex-wrap">
                    <span className="px-2 py-1 bg-slate-100 rounded text-[10px] text-slate-700 break-all">{t.user_id}</span>
                     <ArrowRight size={12} className="text-slate-400" />
                    <span className="px-2 py-1 bg-slate-100 rounded text-[10px] text-slate-700 break-all">{t.merchant_id}</span>
                   </div>
                </td>
                <td className="px-6 py-4 font-mono text-xs text-slate-800">${t.amount.toLocaleString()}</td>
                <td className="px-6 py-4">
                   <span className="text-[10px] uppercase text-white/60 tracking-wider break-words">
                     {t.scenario_type.replace('_', ' ')}
                   </span>
                </td>
                
                <td className="px-6 py-4">
                   <div className="flex items-center gap-2">
                     <span className="text-[10px] font-mono text-slate-700 w-8">{(t.fraud_probability * 100).toFixed(1)}%</span>
                     <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className={cn("h-full rounded-full transition-all duration-1000", getRiskColorClass(t.fraud_probability))}
                          style={{ width: `${t.fraud_probability * 100}%` }}
                        />
                     </div>
                   </div>
                </td>
                <td className="px-6 py-4">
                   <div className="flex items-center gap-2">
                     <span className="text-[10px] font-mono text-slate-700 w-8">{(t.final_risk_score * 100).toFixed(1)}%</span>
                     <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className={cn("h-full rounded-full transition-all duration-1000", getRiskColorClass(t.final_risk_score))}
                          style={{ width: `${t.final_risk_score * 100}%` }}
                        />
                     </div>
                   </div>
                </td>
                
                <td className="px-6 py-4">
                  {getDecisionBadge(t.decision)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
