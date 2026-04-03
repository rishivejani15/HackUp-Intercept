"use client";

import React from "react";
import { ExternalLink, MoreVertical, ShieldAlert, ShieldCheck, ShieldQuestion, Loader2, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFirestoreCollection } from "@/hooks/useFirestoreCollection";

interface LiveTransactionRow {
  id?: string;
  transaction_id?: string;
  amount?: number;
  status?: string;
  merchant?: string;
  risk_score?: number;
  top_feature?: string;
  time?: string;
  fraud?: string;
  userId?: string;
  user_id?: string;
  created_at?: string;
  timestamp?: string;
}

function toDateText(value: unknown): string {
  if (!value) return "Live from Firestore";
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();

  if (typeof value === "object") {
    const candidate = value as { seconds?: number; nanoseconds?: number; toDate?: () => Date };

    if (typeof candidate.toDate === "function") {
      return candidate.toDate().toISOString();
    }

    if (typeof candidate.seconds === "number") {
      return new Date(candidate.seconds * 1000).toISOString();
    }
  }

  return String(value);
}

function toMillis(value: unknown): number {
  if (!value) return 0;
  if (typeof value === "string") return new Date(value).getTime() || 0;
  if (value instanceof Date) return value.getTime();

  if (typeof value === "object") {
    const candidate = value as { seconds?: number; toDate?: () => Date };
    if (typeof candidate.toDate === "function") {
      return candidate.toDate().getTime();
    }
    if (typeof candidate.seconds === "number") {
      return candidate.seconds * 1000;
    }
  }

  return 0;
}

function normalizeStatus(value: unknown): "safe" | "suspicious" | "fraud" {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "safe" || normalized === "legitimate") return "safe";
  if (normalized === "suspicious" || normalized === "review") return "suspicious";
  if (normalized === "fraud" || normalized === "fraudulent") return "fraud";
  return "suspicious";
}

export default function TransactionTable() {
  const { data, loading } = useFirestoreCollection<LiveTransactionRow>("transactions");

  const rows = [...data].sort((left, right) => {
    const leftStamp = toMillis(left.created_at || left.timestamp || left.time);
    const rightStamp = toMillis(right.created_at || right.timestamp || right.time);
    return rightStamp - leftStamp;
  });

  if (loading && data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-4 animate-glow">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
        <p className="text-muted-foreground text-sm font-medium uppercase tracking-widest animate-pulse">
          Establishing Secure Stream...
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-border/50 text-muted-foreground font-outfit uppercase tracking-widest text-[10px] font-bold">
            <th className="px-4 py-4">Transaction ID</th>
            <th className="px-4 py-4">Merchant</th>
            <th className="px-4 py-4">Amount</th>
            <th className="px-4 py-4">Fraud</th>
            <th className="px-4 py-4">Timestamp</th>
            <th className="px-4 py-4">User ID</th>
            <th className="px-4 py-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/30">
          {rows.map((txn, idx) => {
            const statusValue = normalizeStatus(txn.status || txn.fraud || "safe");
            const displayTime = toDateText(txn.time || txn.timestamp || txn.created_at);
            return (
              <tr key={`${txn.transaction_id || txn.id || "row"}-${idx}`} className="group hover:bg-secondary/20 transition-all duration-200">
                <td className="px-4 py-4 font-mono text-xs font-bold text-foreground">
                  {txn.transaction_id || txn.id || "--"}
                </td>
                <td className="px-4 py-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">{txn.merchant || "Unknown Merchant"}</p>
                    <p className="text-xs text-muted-foreground">{displayTime}</p>
                  </div>
                </td>
                <td className="px-4 py-4 text-sm font-bold text-foreground">
                  ${Number(txn.amount || 0).toLocaleString()}
                </td>
                <td className="px-4 py-4">
                  <StatusBadge status={statusValue} />
                </td>
                <td className="px-4 py-4">
                  <span className="text-xs text-muted-foreground">{displayTime}</span>
                </td>
                <td className="px-4 py-4">
                  <span className="inline-flex items-center space-x-1 px-2 py-1 rounded-md bg-secondary text-[10px] font-bold text-muted-foreground uppercase border border-border/50">
                    <Info size={10} className="text-primary" />
                    <span>{(txn as any).userId || (txn as any).user_id || "banker-simulator"}</span>
                  </span>
                </td>
                <td className="px-4 py-4 text-right">
                  <div className="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-2 hover:bg-primary/10 rounded-lg text-primary transition-colors">
                      <ExternalLink size={16} />
                    </button>
                    <button className="p-2 hover:bg-secondary rounded-lg text-muted-foreground transition-colors">
                      <MoreVertical size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  const config =
    normalized === "safe"
      ? {
          label: "Safe",
          icon: ShieldCheck,
          classes: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
        }
      : normalized === "suspicious"
      ? {
          label: "Review",
          icon: ShieldQuestion,
          classes: "text-amber-500 bg-amber-500/10 border-amber-500/20",
        }
      : {
          label: "Fraud",
          icon: ShieldAlert,
          classes: "text-destructive bg-destructive/10 border-destructive/20",
        };

  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border",
        config.classes
      )}
    >
      <Icon size={12} className="animate-pulse" />
      <span>{config.label}</span>
    </span>
  );
}
