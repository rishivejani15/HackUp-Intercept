"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import {
  Search,
  Filter,
  Download,
  ExternalLink,
  Calendar,
  CreditCard,
  Play,
  Square,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useFirestoreCollection } from "@/hooks/useFirestoreCollection";
import { motion } from "framer-motion";
import { LOCAL_SIM_CODE_CACHE } from "@/lib/simulatorCode";

const API_BASE_URL = process.env.NEXT_PUBLIC_INTERCEPT_API_BASE_URL || "http://localhost:8000/api/v1";

type FirestoreTransaction = {
  id?: string;
  _docId?: string;
  transaction_id?: string;
  amount?: number;
  status?: string;
  merchant?: string;
  risk_score?: number;
  top_feature?: string;
  time?: string;
  timestamp?: string;
  created_at?: string;
  fraud?: string;
  account?: string;
  type?: string;
  userId?: string;
  user_id?: string;
  fraud_probability?: number;
  payment_method?: string;
  explainability?: {
    explanation_summary?: string;
  } | null;
  features?: Record<string, number>;
};

type ExplainApiResponse = {
  status: string;
  data?: {
    classification?: string;
    risk_score?: number;
  };
};

function normalizeStatus(value: unknown): "fraud" | "safe" | "review" {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "fraud" || normalized === "fraudulent") return "fraud";
  if (normalized === "safe" || normalized === "legitimate") return "safe";
  return "review";
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

type ExplainRequestPayload = {
  transaction_id: string;
  features: Record<string, number>;
  meta: {
    payment_method: string;
    merchant_name: string;
    timestamp: string;
  };
  source_doc_id?: string;
};

function buildExplainPayload(tx: FirestoreTransaction): ExplainRequestPayload {
  const amount = Number(tx.amount || 0);
  const timestamp =
    typeof tx.timestamp === "string"
      ? tx.timestamp
      : typeof tx.created_at === "string"
      ? tx.created_at
      : new Date().toISOString();
  const transactionId = tx.transaction_id || tx.id || tx._docId || `TXN-${Date.now()}`;

  const sourceFeatures = tx.features || {};
  const getFeature = (name: string, fallback: number) => {
    const value = sourceFeatures[name];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    const raw = (tx as Record<string, unknown>)[name];
    if (typeof raw === "number" && Number.isFinite(raw)) {
      return raw;
    }

    return fallback;
  };

  const mappedFeatures: Record<string, number> = {
    amount: getFeature("amount", amount),
    use_chip: getFeature("use_chip", 1),
    merchant_city: getFeature("merchant_city", 58),
    merchant_state: getFeature("merchant_state", 12),
    zip: getFeature("zip", 30309),
    mcc: getFeature("mcc", 5411),
    errors: getFeature("errors", 2),
    current_age: getFeature("current_age", 34),
    retirement_age: getFeature("retirement_age", 65),
    birth_year: getFeature("birth_year", 1992),
    birth_month: getFeature("birth_month", 5),
    gender: getFeature("gender", 0),
    address: getFeature("address", 44102),
    latitude: getFeature("latitude", 33.7488),
    longitude: getFeature("longitude", -84.3877),
    per_capita_income: getFeature("per_capita_income", 48000),
    yearly_income: getFeature("yearly_income", 92000),
    total_debt: getFeature("total_debt", 18000),
    credit_score: getFeature("credit_score", 640),
    num_credit_cards: getFeature("num_credit_cards", 4),
    client_id_card: getFeature("client_id_card", 552201),
    card_brand: getFeature("card_brand", 1),
    card_type: getFeature("card_type", 1),
    card_number: getFeature("card_number", 410221),
    expires: getFeature("expires", 202911),
    cvv: getFeature("cvv", 321),
    has_chip: getFeature("has_chip", 1),
    num_cards_issued: getFeature("num_cards_issued", 2),
    credit_limit: getFeature("credit_limit", 7000),
    acct_open_date: getFeature("acct_open_date", 201905),
    year_pin_last_changed: getFeature("year_pin_last_changed", 2022),
    card_on_dark_web: getFeature("card_on_dark_web", 1),
    mcc_description: getFeature("mcc_description", 12),
    transaction_day_index: getFeature("transaction_day_index", 2332),
    user_avg_amount: getFeature("user_avg_amount", 210),
    user_std_amount: getFeature("user_std_amount", 95),
    user_tx_frequency: getFeature("user_tx_frequency", 2.1),
    user_active_day_index: getFeature("user_active_day_index", 2328),
    amount_deviation: getFeature("amount_deviation", Math.max(0, amount - 210)),
    transaction_velocity: getFeature("transaction_velocity", 8),
    rolling_mean_amount: getFeature("rolling_mean_amount", 220),
    rolling_std_amount: getFeature("rolling_std_amount", 1500),
    transaction_gap_from_first_day: getFeature("transaction_gap_from_first_day", 2332),
    transaction_history_length: getFeature("transaction_history_length", 980),
    is_new_user: getFeature("is_new_user", 0),
    card_to_history_ratio: getFeature("card_to_history_ratio", 0.002),
    high_card_velocity_flag: getFeature("high_card_velocity_flag", 1),
    merchant_fraud_rate: getFeature("merchant_fraud_rate", 0.7),
    merchant_tx_count: getFeature("merchant_tx_count", 120),
    merchant_avg_amount: getFeature("merchant_avg_amount", 260),
    merchant_std_amount: getFeature("merchant_std_amount", 150),
    merchant_risk_score: getFeature("merchant_risk_score", 0.25),
    geo_cluster_fraud_rate: getFeature("geo_cluster_fraud_rate", 0.09),
    geo_cluster_size: getFeature("geo_cluster_size", 900),
    peer_cluster_fraud_rate: getFeature("peer_cluster_fraud_rate", 0.08),
    peer_cluster_size: getFeature("peer_cluster_size", 1100),
    merchant_outlier_score: getFeature("merchant_outlier_score", 3.5),
    cluster_avg_amount: getFeature("cluster_avg_amount", 240),
    cluster_std_amount: getFeature("cluster_std_amount", 135),
    cluster_outlier_score: getFeature("cluster_outlier_score", 7),
    anomaly_score: getFeature("anomaly_score", 0.95),
  };

  return {
    transaction_id: transactionId,
    source_doc_id: tx._docId || tx.id,
    features: mappedFeatures,
    meta: {
      payment_method: tx.payment_method || "credit_card",
      merchant_name: tx.merchant || "Unknown Merchant",
      timestamp,
    },
  };
}

export default function LedgerPage() {
  const [running, setRunning] = useState(false);
  const [streamMessage, setStreamMessage] = useState("Click Start to process Firestore transactions one by one.");
  const [streamCount, setStreamCount] = useState(0);
  const runningRef = useRef(false);
  const processedRef = useRef<Set<string>>(new Set());
  const [visibleTransactionIds, setVisibleTransactionIds] = useState<string[]>([]);

  const { data: firestoreTransactions, loading } = useFirestoreCollection<FirestoreTransaction>("transactions");

  useEffect(() => {
    runningRef.current = running;
  }, [running]);

  const stats = useMemo(() => {
    const total = firestoreTransactions.length;
    const fraud = firestoreTransactions.filter((item) => normalizeStatus(item.status || item.fraud || "") === "fraud").length;
    const safe = firestoreTransactions.filter((item) => normalizeStatus(item.status || item.fraud || "") === "safe").length;
    const review = firestoreTransactions.filter((item) => {
      return normalizeStatus(item.status || item.fraud || "") === "review";
    }).length;
    return { total, fraud, safe, review };
  }, [firestoreTransactions]);

  const orderedTransactions = useMemo(() => {
    return [...firestoreTransactions].sort((left, right) => {
      const leftStamp = toMillis(left.created_at || left.timestamp || left.time);
      const rightStamp = toMillis(right.created_at || right.timestamp || right.time);
      return rightStamp - leftStamp;
    });
  }, [firestoreTransactions]);

  const transactionById = useMemo(() => {
    const map = new Map<string, FirestoreTransaction>();
    for (const tx of orderedTransactions) {
      const txId = tx.transaction_id || tx._docId || tx.id;
      if (txId) {
        map.set(txId, tx);
      }
    }
    return map;
  }, [orderedTransactions]);

  const displayedTransactions = useMemo(() => {
    return visibleTransactionIds
      .map((id) => transactionById.get(id))
      .filter((item): item is FirestoreTransaction => Boolean(item));
  }, [visibleTransactionIds, transactionById]);

  const processTransaction = async (tx: FirestoreTransaction) => {
    const payload = buildExplainPayload(tx);
    const txId = payload.transaction_id;
    try {
      const response = await fetch(`${API_BASE_URL}/simulator/explain`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Explain API rejected the transaction");
      }

      const result = (await response.json()) as ExplainApiResponse;
      setStreamCount((value) => value + 1);
      const risk = Number(result?.data?.risk_score || 0).toFixed(2);
      const label = String(result?.data?.classification || "review").toUpperCase();
      setStreamMessage(`Processed ${txId.slice(0, 12)}... -> ${label} (Risk ${risk})`);
      processedRef.current.add(txId);
      setVisibleTransactionIds((prev) => (prev.includes(txId) ? prev : [...prev, txId]));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setStreamMessage(`Failed ${txId.slice(0, 12)}... -> ${message}`);
      setVisibleTransactionIds((prev) => (prev.includes(txId) ? prev : [...prev, txId]));
    }
  };

  const processQueue = async () => {
    for (const tx of orderedTransactions) {
      if (!runningRef.current) {
        return;
      }

      const txId = tx.transaction_id || tx.id || tx._docId;
      if (!txId || processedRef.current.has(txId)) {
        continue;
      }

      await processTransaction(tx);
    }

    if (runningRef.current) {
      setStreamMessage("All visible Firestore transactions processed.");
      setRunning(false);
    }
  };

  const startStream = async () => {
    if (running) return;
    processedRef.current.clear();
    setVisibleTransactionIds([]);
    setStreamCount(0);
    setRunning(true);
    setStreamMessage("Starting banker explainability stream...");
    await processQueue();
  };

  const stopStream = () => {
    setRunning(false);
    setStreamMessage("Banker explainability stream stopped.");
  };

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
            Live Firestore-backed transaction stream. Start to send each transaction one by one for explainability risk scoring.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
           <button
             onClick={startStream}
             disabled={running}
             className="h-12 px-6 rounded-2xl bg-primary text-primary-foreground text-[10px] font-bold font-space uppercase tracking-widest hover:bg-primary/90 transition-all flex items-center justify-center space-x-2 shadow-lg shadow-primary/20 disabled:opacity-60"
           >
              <Play size={14} />
              <span>Start Banker Stream</span>
           </button>
           <button
             onClick={stopStream}
             disabled={!running}
             className="h-12 px-6 rounded-2xl glass border border-black/15 text-[10px] font-bold font-space uppercase tracking-widest hover:bg-slate-100 transition-all flex items-center justify-center space-x-2 disabled:opacity-60"
           >
              <Square size={14} />
              <span>Stop</span>
           </button>
           <button className="h-12 px-6 rounded-2xl glass border border-black/15 text-[10px] font-bold font-space uppercase tracking-widest hover:bg-slate-100 transition-all flex items-center justify-center space-x-2">
              <Download size={14} />
              <span>Export CSV</span>
           </button>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">
        <span>{streamMessage}</span>
        <span className="text-primary">Streamed: {streamCount}</span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-8 text-xs font-bold uppercase tracking-widest">
        <div className="rounded-2xl border border-black/10 bg-slate-100 px-4 py-3">Total: {stats.total}</div>
        <div className="rounded-2xl border border-black/10 bg-slate-100 px-4 py-3">Fraud: {stats.fraud}</div>
        <div className="rounded-2xl border border-black/10 bg-slate-100 px-4 py-3">Safe: {stats.safe}</div>
        <div className="rounded-2xl border border-black/10 bg-slate-100 px-4 py-3">Review: {stats.review}</div>
      </div>

      {/* Advanced Filter Rail */}
      <div className="glass rounded-[2rem] p-6 border border-black/10 mb-8 flex flex-wrap items-center gap-6">
         <div className="flex-1 min-w-[300px] relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/40 group-focus-within:text-primary transition-colors" />
            <input 
               type="text" 
               placeholder="Filter by Hash, Merchant, or Account..." 
               className="h-12 w-full rounded-2xl bg-slate-100 border border-black/10 pl-12 pr-4 text-[10px] font-space font-bold uppercase tracking-widest focus:outline-none focus:ring-1 focus:ring-primary/20"
            />
         </div>
         
         <div className="flex items-center space-x-3">
            <div className="h-12 px-4 rounded-xl bg-slate-100 border border-black/10 flex items-center space-x-3 text-xs font-bold text-muted-foreground">
               <Calendar size={14} />
               <span>LAST 24 HOURS</span>
            </div>
            <div className="h-12 px-4 rounded-xl bg-slate-100 border border-black/10 flex items-center space-x-3 text-xs font-bold text-muted-foreground">
               <Filter size={14} />
               <span>ALL STATUSES</span>
            </div>
         </div>
      </div>

      {/* Transaction Matrix */}
      <div className="glass-card rounded-[2.5rem] p-10 relative overflow-hidden">
        {loading && firestoreTransactions.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Loading live Firestore transactions...
          </div>
        ) : (
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full">
              <thead>
                <tr className="border-b border-black/10">
                  <th className="text-left py-6 text-[10px] font-bold font-space uppercase tracking-[0.2em] text-muted-foreground/60 w-36">Index ID</th>
                  <th className="text-left py-6 text-[10px] font-bold font-space uppercase tracking-[0.2em] text-muted-foreground/60">Entity / Merchant</th>
                  <th className="text-left py-6 text-[10px] font-bold font-space uppercase tracking-[0.2em] text-muted-foreground/60">Transaction Mode</th>
                  <th className="text-left py-6 text-[10px] font-bold font-space uppercase tracking-[0.2em] text-muted-foreground/60">Value (USD)</th>
                  <th className="text-left py-6 text-[10px] font-bold font-space uppercase tracking-[0.2em] text-muted-foreground/60">Risk Vector</th>
                  <th className="text-left py-6 text-[10px] font-bold font-space uppercase tracking-[0.2em] text-muted-foreground/60">Status</th>
                  <th className="text-left py-6 text-[10px] font-bold font-space uppercase tracking-[0.2em] text-muted-foreground/60">User ID</th>
                  <th className="text-right py-6 text-[10px] font-bold font-space uppercase tracking-[0.2em] text-muted-foreground/60">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {(displayedTransactions.length > 0 ? displayedTransactions : []).map((tx, idx) => {
                  const status = normalizeStatus(tx.status || tx.fraud || "safe");
                  const userId = tx.userId || tx.user_id || "banker-simulator";
                  const timestamp = toDateText(tx.timestamp || tx.time || tx.created_at);
                  return (
                    <motion.tr 
                      key={tx.id || tx.transaction_id || idx}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      className="group hover:bg-slate-100 transition-all"
                    >
                      <td className="py-6">
                        <span className="text-[10px] font-mono font-bold text-primary/60">{tx.transaction_id || tx.id || "--"}</span>
                      </td>
                      <td className="py-6">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold font-space text-foreground tracking-tight">{tx.merchant || "Unknown Merchant"}</span>
                          <span className="text-[9px] font-mono text-muted-foreground/40">{timestamp}</span>
                        </div>
                      </td>
                      <td className="py-6">
                         <span className="text-[10px] font-space font-bold border border-black/10 bg-slate-100 px-2 py-1 rounded-md text-muted-foreground uppercase">{tx.type || status}</span>
                      </td>
                      <td className="py-6">
                        <div className="flex items-center space-x-2">
                           <span className={cn(
                              "h-1.5 w-1.5 rounded-full",
                            "bg-primary"
                           )} />
                           <span className="text-sm font-bold font-mono text-foreground">${Number(tx.amount || 0).toLocaleString()}</span>
                        </div>
                      </td>
                      <td className="py-6">
                        <div className="flex items-center space-x-4 w-32">
                           <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
                              <div 
                                 className={cn(
                                   "h-full rounded-full",
                                   Number(tx.risk_score || 0) > 80 ? "bg-error" : Number(tx.risk_score || 0) > 60 ? "bg-tertiary" : "bg-secondary"
                                 )} 
                                 style={{ width: `${Number(tx.risk_score || 0)}%` }}
                              />
                           </div>
                           <span className="text-[10px] font-mono font-bold text-muted-foreground">{Number(tx.risk_score || 0)}%</span>
                        </div>
                      </td>
                      <td className="py-6">
                        <span className={cn(
                          "text-[9px] font-bold px-3 py-1 rounded-full uppercase tracking-widest",
                          status === "safe" ? "text-secondary bg-secondary/10" :
                          status === "fraud" ? "text-error bg-error/10" : "text-tertiary bg-tertiary/10"
                        )}>
                          {status}
                        </span>
                      </td>
                      <td className="py-6">
                        <span className="text-[10px] font-mono font-bold text-muted-foreground">{userId}</span>
                      </td>
                      <td className="py-6 text-right">
                        <button className="h-8 w-8 rounded-lg glass border border-black/10 flex items-center justify-center text-muted-foreground hover:bg-slate-200 hover:text-primary transition-all">
                           <ExternalLink size={14} />
                        </button>
                      </td>
                    </motion.tr>
                  );
                })}
                {displayedTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-16 text-center text-muted-foreground">
                      <div className="flex flex-col items-center gap-3">
                        <AlertTriangle className="h-6 w-6 text-muted-foreground/40" />
                        <div className="text-sm font-medium">Click Start Transactions to process and display transactions one by one.</div>
                      </div>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
