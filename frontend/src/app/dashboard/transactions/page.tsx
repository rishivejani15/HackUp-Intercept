"use client";

import React from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { 
  Search, 
  Filter, 
  Download, 
  ExternalLink,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  CreditCard
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useFirestoreCollection } from "@/hooks/useFirestoreCollection";
import { orderBy, limit } from "firebase/firestore";
import { motion } from "framer-motion";

const MOCK_TRANSACTIONS = [
  { id: "TX-992810", date: "2024-04-02 14:42", type: "PURCHASE", amount: 1240.00, status: "SUCCESS", merchant: "Amazon Services", score: 12, account: "**** 8291" },
  { id: "TX-992811", date: "2024-04-02 14:40", type: "TRANSFER", amount: 50.00, status: "FLAGGED", merchant: "Internal Transfer", score: 84, account: "**** 4410" },
  { id: "TX-992812", date: "2024-04-02 14:38", type: "PURCHASE", amount: 210.50, status: "SUCCESS", merchant: "Starbucks Coffee", score: 5, account: "**** 1102" },
  { id: "TX-992813", date: "2024-04-02 14:35", type: "PURCHASE", amount: 4500.00, status: "BLOCKED", merchant: "GoldReserve LLC", score: 98, account: "**** 9928" },
  { id: "TX-992814", date: "2024-04-02 14:30", type: "REFUND", amount: 120.00, status: "SUCCESS", merchant: "Walmart Inc", score: 2, account: "**** 8291" },
  { id: "TX-992815", date: "2024-04-02 14:25", type: "PURCHASE", amount: 890.00, status: "SUCCESS", merchant: "Apple Store", score: 18, account: "**** 4410" },
  { id: "TX-992816", date: "2024-04-02 14:20", type: "TRANSFER", amount: 12.00, status: "FLAGGED", merchant: "P2P Payment", score: 72, account: "**** 1102" },
];

export default function LedgerPage() {
  const { data: firestoreTransactions, loading } = useFirestoreCollection("transactions", [
    orderBy("date", "desc"),
    limit(50)
  ]);

  const transactions = firestoreTransactions.length > 0 ? firestoreTransactions : MOCK_TRANSACTIONS;
  return (
    <DashboardLayout>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div className="space-y-4">
          <div className="flex items-center space-x-3 text-primary font-bold text-[10px] uppercase tracking-[0.3em]">
             <CreditCard size={14} />
             <span>Financial Intelligence</span>
          </div>
          <h1 className="text-5xl font-bold font-space tracking-tight text-foreground">
            FULL SPECTRUM <span className="text-primary/60">LEDGER</span>
          </h1>
          <p className="text-muted-foreground max-w-xl text-sm leading-relaxed font-medium">
            Deep-dive into verified transaction streams and behavioral audit logs.
          </p>
        </div>

        <div className="flex items-center space-x-3">
           <button className="h-12 px-6 rounded-2xl glass border border-white/10 text-[10px] font-bold font-space uppercase tracking-widest hover:bg-white/5 transition-all flex items-center justify-center space-x-2">
              <Download size={14} />
              <span>Export CSV</span>
           </button>
           <button className="h-12 px-6 rounded-2xl bg-primary text-primary-foreground text-[10px] font-bold font-space uppercase tracking-widest hover:bg-primary/90 transition-all flex items-center justify-center space-x-2 shadow-lg shadow-primary/20">
              <Search size={14} />
              <span>Deep Analysis</span>
           </button>
        </div>
      </div>

      {/* Advanced Filter Rail */}
      <div className="glass rounded-[2rem] p-6 border border-white/5 mb-8 flex flex-wrap items-center gap-6">
         <div className="flex-1 min-w-[300px] relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/40 group-focus-within:text-primary transition-colors" />
            <input 
               type="text" 
               placeholder="Filter by Hash, Merchant, or Account..." 
               className="h-12 w-full rounded-2xl bg-white/[0.03] border border-white/5 pl-12 pr-4 text-[10px] font-space font-bold uppercase tracking-widest focus:outline-none focus:ring-1 focus:ring-primary/20"
            />
         </div>
         
         <div className="flex items-center space-x-3">
            <div className="h-12 px-4 rounded-xl bg-white/[0.03] border border-white/5 flex items-center space-x-3 text-xs font-bold text-muted-foreground">
               <Calendar size={14} />
               <span>LAST 24 HOURS</span>
            </div>
            <div className="h-12 px-4 rounded-xl bg-white/[0.03] border border-white/5 flex items-center space-x-3 text-xs font-bold text-muted-foreground">
               <Filter size={14} />
               <span>ALL STATUSES</span>
            </div>
         </div>
      </div>

      {/* Transaction Matrix */}
      <div className="glass-card rounded-[2.5rem] p-10 relative overflow-hidden">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left py-6 text-[10px] font-bold font-space uppercase tracking-[0.2em] text-muted-foreground/60 w-32">Index ID</th>
                <th className="text-left py-6 text-[10px] font-bold font-space uppercase tracking-[0.2em] text-muted-foreground/60">Entity / Merchant</th>
                <th className="text-left py-6 text-[10px] font-bold font-space uppercase tracking-[0.2em] text-muted-foreground/60">Transaction Mode</th>
                <th className="text-left py-6 text-[10px] font-bold font-space uppercase tracking-[0.2em] text-muted-foreground/60">Value (USD)</th>
                <th className="text-left py-6 text-[10px] font-bold font-space uppercase tracking-[0.2em] text-muted-foreground/60">Risk Vector</th>
                <th className="text-left py-6 text-[10px] font-bold font-space uppercase tracking-[0.2em] text-muted-foreground/60">Status</th>
                <th className="text-right py-6 text-[10px] font-bold font-space uppercase tracking-[0.2em] text-muted-foreground/60">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.02]">
              {transactions.map((tx, idx) => (
                <motion.tr 
                   key={tx.id}
                   initial={{ opacity: 0, x: -10 }}
                   animate={{ opacity: 1, x: 0 }}
                   transition={{ delay: idx * 0.05 }}
                   className="group hover:bg-white/[0.02] transition-all"
                >
                  <td className="py-6">
                    <span className="text-[10px] font-mono font-bold text-primary/60">{tx.id}</span>
                  </td>
                  <td className="py-6">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold font-space text-foreground tracking-tight">{tx.merchant}</span>
                      <span className="text-[9px] font-mono text-muted-foreground/40">{tx.account}</span>
                    </div>
                  </td>
                  <td className="py-6">
                     <span className="text-[10px] font-space font-bold border border-white/5 bg-white/5 px-2 py-1 rounded-md text-muted-foreground uppercase">{tx.type}</span>
                  </td>
                  <td className="py-6">
                    <div className="flex items-center space-x-2">
                       <span className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          tx.type === "REFUND" ? "bg-secondary" : "bg-primary"
                       )} />
                       <span className="text-sm font-bold font-mono text-foreground">${tx.amount.toLocaleString()}</span>
                    </div>
                  </td>
                  <td className="py-6">
                    <div className="flex items-center space-x-4 w-32">
                       <div className="flex-1 h-1 bg-white/[0.03] rounded-full overflow-hidden">
                          <div 
                             className={cn(
                               "h-full rounded-full",
                               tx.score > 80 ? "bg-error" : tx.score > 60 ? "bg-tertiary" : "bg-secondary"
                             )} 
                             style={{ width: `${tx.score}%` }}
                          />
                       </div>
                       <span className="text-[10px] font-mono font-bold text-muted-foreground">{tx.score}%</span>
                    </div>
                  </td>
                  <td className="py-6">
                    <span className={cn(
                      "text-[9px] font-bold px-3 py-1 rounded-full uppercase tracking-widest",
                      tx.status === "SUCCESS" ? "text-secondary bg-secondary/10" :
                      tx.status === "FLAGGED" ? "text-tertiary bg-tertiary/10" : "text-error bg-error/10"
                    )}>
                      {tx.status}
                    </span>
                  </td>
                  <td className="py-6 text-right">
                    <button className="h-8 w-8 rounded-lg glass border border-white/5 flex items-center justify-center text-muted-foreground hover:bg-white/10 hover:text-primary transition-all">
                       <ExternalLink size={14} />
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
