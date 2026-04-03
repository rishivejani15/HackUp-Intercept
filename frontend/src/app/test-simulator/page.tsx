"use client";

import React, { useMemo, useRef, useState } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Play, Square, ArrowLeft, ShieldAlert, CheckCircle2, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { useFirestoreCollection } from "@/hooks/useFirestoreCollection";

type FirestoreTransaction = {
  id?: string;
  _docId?: string;
  transaction_id?: string;
  amount?: number;
  merchant?: string;
  merchant_name?: string;
  payment_method?: string;
  meta?: {
    payment_method?: string;
    merchant_name?: string;
    timestamp?: string;
  } | Record<string, unknown>;
  time?: unknown;
  timestamp?: unknown;
  created_at?: unknown;
  features?: Record<string, number>;
  [key: string]: unknown;
};

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

type ExplainApiResponse = {
  status: string;
  data?: {
    transaction_id?: string;
    classification?: string;
    fraud_probability?: number;
    risk_score?: number;
    explainability?: ExplainabilityDetails;
  };
};

type ExplainSignal = {
  feature?: string;
  label?: string;
  value?: number;
  shap_value?: number;
  direction?: string;
};

type ExplainabilityDetails = {
  base_value?: number;
  fraud_type?: string;
  fraud_type_confidence?: number;
  fraud_probability?: number;
  explanation_summary?: string;
  category_scores?: Record<string, number>;
  top_positive_signals?: ExplainSignal[];
  top_negative_signals?: ExplainSignal[];
};

type DisplayRow = {
  id: string;
  merchant: string;
  amount: number;
  risk: number;
  fraudProbability?: number;
  decision: string;
  reason: string;
  time: string;
  explainability?: ExplainabilityDetails | null;
};

type WaterfallPoint = {
  key: string;
  label: string;
  shapValue: number;
  direction: "increased risk" | "reduced risk";
};

function normalizeDecision(value: unknown): "FRAUD" | "LEGITIMATE" | "REVIEW" {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "fraud" || normalized === "fraudulent") return "FRAUD";
  if (normalized === "legitimate" || normalized === "safe") return "LEGITIMATE";
  return "REVIEW";
}

function toDateText(value: unknown): string {
  if (!value) return new Date().toISOString();
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();

  if (typeof value === "object") {
    const candidate = value as { seconds?: number; toDate?: () => Date };
    if (typeof candidate.toDate === "function") return candidate.toDate().toISOString();
    if (typeof candidate.seconds === "number") return new Date(candidate.seconds * 1000).toISOString();
  }

  return String(value);
}

function toMillis(value: unknown): number {
  if (!value) return 0;
  if (typeof value === "string") return new Date(value).getTime() || 0;
  if (value instanceof Date) return value.getTime();

  if (typeof value === "object") {
    const candidate = value as { seconds?: number; toDate?: () => Date };
    if (typeof candidate.toDate === "function") return candidate.toDate().getTime();
    if (typeof candidate.seconds === "number") return candidate.seconds * 1000;
  }

  return 0;
}

function buildExplainPayload(tx: FirestoreTransaction): ExplainRequestPayload {
  const sourceFeatures = tx.features || {};
  const sourceMeta = (tx.meta || {}) as Record<string, unknown>;

  return {
    transaction_id: String(tx.transaction_id || tx.id || tx._docId || `TXN-${Date.now()}`),
    source_doc_id: tx._docId || tx.id,
    features: sourceFeatures,
    meta: {
      payment_method: String(sourceMeta.payment_method || ""),
      merchant_name: String(sourceMeta.merchant_name || ""),
      timestamp: toDateText(sourceMeta.timestamp),
    },
  };
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toFiniteNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function getWaterfallPoints(explainability?: ExplainabilityDetails | null): WaterfallPoint[] {
  if (!explainability) return [];

  const positives = (explainability.top_positive_signals || []).map((signal, index) => ({
    key: `pos-${signal.feature || index}`,
    label: signal.label || signal.feature || `Positive ${index + 1}`,
    shapValue: Math.abs(toFiniteNumber(signal.shap_value, 0)),
    direction: "increased risk" as const,
  }));

  const negatives = (explainability.top_negative_signals || []).map((signal, index) => ({
    key: `neg-${signal.feature || index}`,
    label: signal.label || signal.feature || `Negative ${index + 1}`,
    shapValue: -Math.abs(toFiniteNumber(signal.shap_value, 0)),
    direction: "reduced risk" as const,
  }));

  return [...positives, ...negatives]
    .filter((point) => Number.isFinite(point.shapValue) && point.shapValue !== 0)
    .sort((a, b) => Math.abs(b.shapValue) - Math.abs(a.shapValue))
    .slice(0, 10);
}

export default function TestSimulatorPage() {
  const [running, setRunning] = useState(false);
  const [intervalMs, setIntervalMs] = useState(1200);
  const [statusMessage, setStatusMessage] = useState("Click Start Transactions to process Firebase data one by one.");
  const [rows, setRows] = useState<DisplayRow[]>([]);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  const runningRef = useRef(false);

  const { data: liveTransactions, loading, error } = useFirestoreCollection<FirestoreTransaction>("transactions");

  const pushDebug = (message: string, payload?: unknown) => {
    const now = new Date().toISOString();
    const serialized = payload ? ` ${JSON.stringify(payload)}` : "";
    const entry = `[${now}] ${message}${serialized}`;
    console.debug("[SIM-DEBUG]", message, payload || "");
    setDebugLogs((prev) => [entry, ...prev].slice(0, 16));
  };

  const orderedLiveTransactions = useMemo(() => {
    return [...liveTransactions].sort((left, right) => {
      const leftStamp = toMillis(left.created_at || left.timestamp || left.time);
      const rightStamp = toMillis(right.created_at || right.timestamp || right.time);
      return rightStamp - leftStamp;
    });
  }, [liveTransactions]);

  const validTransactions = useMemo(() => {
    return orderedLiveTransactions.filter((tx) => {
      const hasTransactionId = typeof tx.transaction_id === "string" && tx.transaction_id.trim().length > 0;
      const hasFeatures = Boolean(tx.features && Object.keys(tx.features).length > 0);
      const meta = tx.meta as Record<string, unknown> | undefined;
      const hasMeta = Boolean(
        meta &&
          typeof meta === "object" &&
          typeof meta.merchant_name === "string" &&
          typeof meta.payment_method === "string" &&
          typeof meta.timestamp === "string"
      );
      return hasTransactionId && hasFeatures && hasMeta;
    });
  }, [orderedLiveTransactions]);

  const stats = useMemo(() => {
    const total = rows.length;
    const fraud = rows.filter((row) => row.decision === "FRAUD").length;
    const safe = rows.filter((row) => row.decision === "SAFE" || row.decision === "LEGITIMATE").length;
    const errors = rows.filter((row) => row.decision === "ERROR").length;
    return { total, fraud, safe, errors };
  }, [rows]);

  const startSimulation = async () => {
    if (runningRef.current) return;

    setRows([]);
    setExpandedRowId(null);
    setDebugLogs([]);
    setStatusMessage("Starting sequential explainability checks from Firebase...");
    setRunning(true);
    runningRef.current = true;

    pushDebug("Start pressed - loaded transactions", {
      total: orderedLiveTransactions.length,
      valid_for_api: validTransactions.length,
      skipped: orderedLiveTransactions.length - validTransactions.length,
    });

    if (validTransactions.length === 0) {
      setStatusMessage("No valid records found: require transaction_id + features + meta.");
      pushDebug("No valid transactions to process");
      runningRef.current = false;
      setRunning(false);
      return;
    }

    let processedCount = 0;

    for (const tx of validTransactions) {
      if (!runningRef.current) {
        break;
      }

      const payload = buildExplainPayload(tx);
      const txId = payload.transaction_id;
      const txTime = payload.meta.timestamp;

      pushDebug("Calling explain API", {
        endpoint: "/api/simulator/explain",
        transaction_id: payload.transaction_id,
        merchant_name: payload.meta.merchant_name,
        payment_method: payload.meta.payment_method,
        amount: payload.features.amount,
        source_doc_id: payload.source_doc_id,
        features_count: Object.keys(payload.features).length,
      });

      try {
        const response = await fetch(`/api/simulator/explain`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(errText || "Explain API request failed");
        }

        const result = (await response.json()) as ExplainApiResponse;
        pushDebug("Explain API success", {
          transaction_id: txId,
          status: result.status,
          classification: result.data?.classification,
          risk_score: result.data?.risk_score,
        });
        const decision = normalizeDecision(result.data?.classification);
        const risk = Number(result.data?.risk_score || 0);
        const reason = result.data?.explainability?.explanation_summary || "Model explanation generated";
        const fraudProbability = toFiniteNumber(
          result.data?.fraud_probability ?? result.data?.explainability?.fraud_probability,
          0
        );

        setRows((prev) => [
          ...prev,
          {
            id: txId,
            merchant: payload.meta.merchant_name,
            amount: Number(payload.features.amount || 0),
            risk,
            fraudProbability,
            decision,
            reason,
            time: txTime,
            explainability: result.data?.explainability || null,
          },
        ]);

        setStatusMessage(`Processed ${txId.slice(0, 14)}... -> ${decision} (Risk ${risk.toFixed(2)})`);
        processedCount += 1;
      } catch (fetchError) {
        const message = fetchError instanceof Error ? fetchError.message : "Unknown error";
        pushDebug("Explain API failed", {
          transaction_id: txId,
          error: message,
        });

        setRows((prev) => [
          ...prev,
          {
            id: txId,
            merchant: payload.meta.merchant_name,
            amount: Number(payload.features.amount || 0),
            risk: 0,
            fraudProbability: 0,
            decision: "ERROR",
            reason: message,
            time: txTime,
            explainability: null,
          },
        ]);

        setStatusMessage(`Failed ${txId.slice(0, 14)}... -> ${message}`);
        processedCount += 1;
      }

      await wait(intervalMs);
    }

    runningRef.current = false;
    setRunning(false);
    setStatusMessage("Processing complete.");
    pushDebug("Processing complete", {
      processed: processedCount,
      attempted: validTransactions.length,
    });
  };

  const stopSimulation = () => {
    runningRef.current = false;
    setRunning(false);
    setStatusMessage("Simulation stopped.");
    pushDebug("Processing stopped by user");
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="space-y-2">
            <Link href="/dashboard/settings" className="text-xs font-bold uppercase tracking-widest text-primary inline-flex items-center gap-2">
              <ArrowLeft size={14} />
              Back to Key Settings
            </Link>
            <h1 className="text-4xl font-bold font-space tracking-tight text-foreground">Transaction Simulator Test Bench</h1>
            <p className="text-sm text-muted-foreground max-w-2xl">
              Fetches transactions from Firebase, sends them one-by-one to explain API, then displays returned risk.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-bold uppercase tracking-widest">
            <div className="bg-slate-100 border border-black/10 rounded-xl px-4 py-3">Shown: {stats.total}</div>
            <div className="bg-slate-100 border border-black/10 rounded-xl px-4 py-3">Fraud: {stats.fraud}</div>
            <div className="bg-slate-100 border border-black/10 rounded-xl px-4 py-3">Safe: {stats.safe}</div>
            <div className="bg-slate-100 border border-black/10 rounded-xl px-4 py-3">Errors: {stats.errors}</div>
          </div>
        </div>

        <div className="glass-card rounded-3xl border border-black/10 p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Processing Interval (ms)</label>
            <input
              type="number"
              min={250}
              value={intervalMs}
              onChange={(e) => setIntervalMs(Number(e.target.value || 1200))}
              className="mt-2 h-11 w-full rounded-xl border border-black/10 bg-slate-100 px-3 text-xs font-bold"
            />
          </div>
          <div className="md:col-span-2 flex items-end">
            <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{statusMessage}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-bold uppercase tracking-widest">
          <div className="bg-slate-100 border border-black/10 rounded-xl px-4 py-3">Firebase Total: {orderedLiveTransactions.length}</div>
          <div className="bg-slate-100 border border-black/10 rounded-xl px-4 py-3">Valid For API: {validTransactions.length}</div>
          <div className="bg-slate-100 border border-black/10 rounded-xl px-4 py-3">Skipped: {orderedLiveTransactions.length - validTransactions.length}</div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={startSimulation}
            disabled={running || loading}
            className="h-12 px-6 rounded-2xl bg-primary text-primary-foreground text-[10px] font-bold font-space uppercase tracking-widest inline-flex items-center gap-2 disabled:opacity-50"
          >
            <Play size={14} />
            Start Transactions
          </button>
          <button
            onClick={stopSimulation}
            disabled={!running}
            className="h-12 px-6 rounded-2xl border border-black/10 bg-slate-100 text-[10px] font-bold font-space uppercase tracking-widest inline-flex items-center gap-2 disabled:opacity-50"
          >
            <Square size={14} />
            Stop
          </button>
        </div>

        <div className="glass-card rounded-2xl border border-black/10 p-4">
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Debug Trace</div>
          <div className="max-h-40 overflow-y-auto space-y-2">
            {debugLogs.length === 0 ? (
              <div className="text-xs text-muted-foreground">No debug events yet. Click Start Transactions.</div>
            ) : (
              debugLogs.map((line, index) => (
                <div key={`${line}-${index}`} className="text-[11px] font-mono text-muted-foreground break-all">
                  {line}
                </div>
              ))
            )}
          </div>
        </div>

        {error ? (
          <div className="text-xs font-bold uppercase tracking-widest text-error">
            Firestore read error: {error.message}
          </div>
        ) : null}

        <div className="glass-card rounded-3xl border border-black/10 p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b border-black/10 bg-slate-100">
                  <th className="text-left px-4 py-3 text-[10px] uppercase tracking-widest">More</th>
                  <th className="text-left px-4 py-3 text-[10px] uppercase tracking-widest">Transaction</th>
                  <th className="text-left px-4 py-3 text-[10px] uppercase tracking-widest">Merchant</th>
                  <th className="text-left px-4 py-3 text-[10px] uppercase tracking-widest">Amount</th>
                  <th className="text-left px-4 py-3 text-[10px] uppercase tracking-widest">Risk</th>
                  <th className="text-left px-4 py-3 text-[10px] uppercase tracking-widest">Fraud Prob</th>
                  <th className="text-left px-4 py-3 text-[10px] uppercase tracking-widest">Decision</th>
                  <th className="text-left px-4 py-3 text-[10px] uppercase tracking-widest">Reason</th>
                  <th className="text-left px-4 py-3 text-[10px] uppercase tracking-widest">Time</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const decision = row.decision.toUpperCase();
                  const isExpanded = expandedRowId === row.id;
                  const waterfallPoints = getWaterfallPoints(row.explainability);
                  const maxAbsShap = Math.max(...waterfallPoints.map((point) => Math.abs(point.shapValue)), 1);
                  const categoryEntries = Object.entries(row.explainability?.category_scores || {}).sort((a, b) => b[1] - a[1]);

                  return (
                    <React.Fragment key={row.id}>
                      <tr className="border-b border-black/10">
                        <td className="px-4 py-3">
                          <button
                            onClick={() => setExpandedRowId((prev) => (prev === row.id ? null : row.id))}
                            className="h-7 w-7 rounded-lg border border-black/15 bg-slate-100 inline-flex items-center justify-center hover:bg-slate-200 transition-colors"
                            aria-label={isExpanded ? "Collapse transaction details" : "Expand transaction details"}
                          >
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-xs font-mono">{row.id.slice(0, 14)}...</td>
                        <td className="px-4 py-3 text-xs font-bold">{row.merchant}</td>
                        <td className="px-4 py-3 text-xs font-bold">${row.amount.toFixed(2)}</td>
                        <td className="px-4 py-3 text-xs font-bold">{row.risk.toFixed(2)}</td>
                        <td className="px-4 py-3 text-xs font-bold">{(toFiniteNumber(row.fraudProbability, 0) * 100).toFixed(3)}%</td>
                        <td className="px-4 py-3">
                          {decision === "FRAUD" ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase text-error">
                              <ShieldAlert size={12} />
                              Fraud
                            </span>
                          ) : decision === "SAFE" || decision === "LEGITIMATE" ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase text-secondary">
                              <CheckCircle2 size={12} />
                              Legitimate
                            </span>
                          ) : decision === "ERROR" ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase text-error">
                              <ShieldAlert size={12} />
                              Error
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase text-tertiary">
                              <Clock size={12} />
                              Review
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{row.reason}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{row.time}</td>
                      </tr>

                      {isExpanded ? (
                        <tr className="border-b border-black/10 bg-slate-50/60">
                          <td colSpan={9} className="p-4 md:p-6">
                            <div className="rounded-2xl border border-black/10 bg-white p-4 md:p-6 space-y-5">
                              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-[10px] font-bold uppercase tracking-widest">
                                <div className="rounded-xl border border-black/10 bg-slate-100 px-3 py-2">Risk Score: {row.risk.toFixed(2)}</div>
                                <div className="rounded-xl border border-black/10 bg-slate-100 px-3 py-2">Fraud Prob: {(toFiniteNumber(row.fraudProbability, 0) * 100).toFixed(3)}%</div>
                                <div className="rounded-xl border border-black/10 bg-slate-100 px-3 py-2">Base Value: {toFiniteNumber(row.explainability?.base_value, 0).toFixed(6)}</div>
                                <div className="rounded-xl border border-black/10 bg-slate-100 px-3 py-2">Fraud Type: {String(row.explainability?.fraud_type || row.decision).toUpperCase()}</div>
                                <div className="rounded-xl border border-black/10 bg-slate-100 px-3 py-2">Type Conf: {toFiniteNumber(row.explainability?.fraud_type_confidence, 0).toFixed(4)}</div>
                              </div>

                              <div>
                                <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Summary</div>
                                <div className="rounded-xl border border-black/10 bg-slate-100 px-4 py-3 text-xs text-foreground">
                                  {row.explainability?.explanation_summary || row.reason}
                                </div>
                              </div>

                              <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                                <div>
                                  <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Waterfall Signals</div>
                                  <div className="rounded-xl border border-black/10 bg-slate-100 p-4 space-y-3">
                                    {waterfallPoints.length === 0 ? (
                                      <div className="text-xs text-muted-foreground">No SHAP signals available for this transaction.</div>
                                    ) : (
                                      waterfallPoints.map((point) => {
                                        const widthPct = Math.max(4, (Math.abs(point.shapValue) / maxAbsShap) * 100);
                                        const isPositive = point.shapValue > 0;
                                        return (
                                          <div key={point.key} className="space-y-1">
                                            <div className="flex items-center justify-between text-[11px]">
                                              <span className="font-semibold text-foreground">{point.label}</span>
                                              <span className={isPositive ? "font-mono text-error" : "font-mono text-secondary"}>
                                                {point.shapValue > 0 ? "+" : ""}{point.shapValue.toFixed(6)}
                                              </span>
                                            </div>
                                            <div className="relative h-2 rounded-full bg-white border border-black/10 overflow-hidden">
                                              <div className="absolute left-1/2 top-0 bottom-0 w-px bg-black/20" />
                                              {isPositive ? (
                                                <div className="absolute left-1/2 top-0 h-full bg-error/70" style={{ width: `${Math.min(50, widthPct / 2)}%` }} />
                                              ) : (
                                                <div className="absolute right-1/2 top-0 h-full bg-secondary/80" style={{ width: `${Math.min(50, widthPct / 2)}%` }} />
                                              )}
                                            </div>
                                            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{point.direction}</div>
                                          </div>
                                        );
                                      })
                                    )}
                                  </div>
                                </div>

                                <div className="space-y-5">
                                  <div>
                                    <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Category Scores</div>
                                    <div className="rounded-xl border border-black/10 bg-slate-100 p-3 space-y-2">
                                      {categoryEntries.length === 0 ? (
                                        <div className="text-xs text-muted-foreground">No category score data.</div>
                                      ) : (
                                        categoryEntries.map(([name, score]) => (
                                          <div key={name} className="text-xs flex items-center justify-between gap-3">
                                            <span className="font-semibold text-foreground">{name.replaceAll("_", " ")}</span>
                                            <span className="font-mono text-muted-foreground">{toFiniteNumber(score, 0).toFixed(6)}</span>
                                          </div>
                                        ))
                                      )}
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                      <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Top Positive</div>
                                      <div className="rounded-xl border border-black/10 bg-slate-100 p-3 space-y-2">
                                        {(row.explainability?.top_positive_signals || []).slice(0, 5).map((signal, idx) => (
                                          <div key={`${signal.feature || "p"}-${idx}`} className="text-xs">
                                            <div className="font-semibold text-foreground">{signal.label || signal.feature || `Signal ${idx + 1}`}</div>
                                            <div className="text-muted-foreground font-mono">
                                              value: {toFiniteNumber(signal.value, 0).toFixed(4)} | shap: +{Math.abs(toFiniteNumber(signal.shap_value, 0)).toFixed(6)}
                                            </div>
                                          </div>
                                        ))}
                                        {(row.explainability?.top_positive_signals || []).length === 0 ? (
                                          <div className="text-xs text-muted-foreground">No positive signals.</div>
                                        ) : null}
                                      </div>
                                    </div>

                                    <div>
                                      <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Top Negative</div>
                                      <div className="rounded-xl border border-black/10 bg-slate-100 p-3 space-y-2">
                                        {(row.explainability?.top_negative_signals || []).slice(0, 5).map((signal, idx) => (
                                          <div key={`${signal.feature || "n"}-${idx}`} className="text-xs">
                                            <div className="font-semibold text-foreground">{signal.label || signal.feature || `Signal ${idx + 1}`}</div>
                                            <div className="text-muted-foreground font-mono">
                                              value: {toFiniteNumber(signal.value, 0).toFixed(4)} | shap: -{Math.abs(toFiniteNumber(signal.shap_value, 0)).toFixed(6)}
                                            </div>
                                          </div>
                                        ))}
                                        {(row.explainability?.top_negative_signals || []).length === 0 ? (
                                          <div className="text-xs text-muted-foreground">No negative signals.</div>
                                        ) : null}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </React.Fragment>
                  );
                })}
                {!loading && rows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-sm text-muted-foreground">
                      Click Start Transactions to fetch from Firebase and display one-by-one results.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
