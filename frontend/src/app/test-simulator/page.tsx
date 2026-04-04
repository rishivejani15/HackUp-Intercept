"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Play, Square, ArrowLeft, Clock, X, Loader2, Sparkles } from "lucide-react";
import { useFirestoreCollection } from "@/hooks/useFirestoreCollection";

const API_BASE_URL = process.env.NEXT_PUBLIC_INTERCEPT_API_BASE_URL || "/api/v1";

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

function renderStructuredExplanation(summary: string): React.ReactNode {
  const sections = summary
    .split(/\n{2,}/)
    .map((section) => section.trim())
    .filter(Boolean);

  if (sections.length === 0) {
    return <div className="whitespace-pre-wrap leading-relaxed">{summary}</div>;
  }

  return (
    <div className="space-y-5">
      {sections.map((section, index) => {
        const lines = section.split(/\n/).map((line) => line.trim()).filter(Boolean);
        const [heading, ...bodyLines] = lines;
        const hasBullets = bodyLines.some((line) => /^[-*•]/.test(line));

        return (
          <div key={`${heading}-${index}`} className="rounded-2xl border border-blue-100 bg-white/70 p-4 shadow-sm">
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600 mb-3">
              {heading || `Section ${index + 1}`}
            </div>
            <div className={hasBullets ? "space-y-2" : "space-y-3"}>
              {bodyLines.length > 0 ? (
                bodyLines.map((line, lineIndex) => {
                  const isBullet = /^[-*•]/.test(line);
                  const content = isBullet ? line.replace(/^[-*•]\s*/, "") : line;
                  return (
                    <div key={`${lineIndex}-${content}`} className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                      {isBullet ? <span className="font-bold text-blue-600 mr-2">•</span> : null}
                      {content}
                    </div>
                  );
                })
              ) : (
                <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{section}</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

type DisplayRow = {
  id: string;
  merchant: string;
  amount: number;
  risk: number;
  fraudProbability?: number;
  decision: "APPROVE" | "BLOCK" | "REVIEW" | "ERROR";
  reason: string;
  time: string;
  paymentMethod: string;
  transactionTimestamp: string;
  features: Record<string, number>;
  explainability?: ExplainabilityDetails | null;
};

type WaterfallPoint = {
  key: string;
  label: string;
  shapValue: number;
  direction: "increased risk" | "reduced risk";
};

const FEATURE_LABELS: Record<string, string> = {
  amount: "Transaction Amount",
  amount_deviation: "Spending Deviation",
  anomaly_score: "Anomaly Score",
  acct_open_date: "Account Start",
  current_age: "Age",
  credit_score: "Credit Score",
  user_avg_amount: "Average Spending",
  user_std_amount: "Spending Variability",
  user_tx_frequency: "Transaction Frequency",
  transaction_velocity: "Transaction Speed",
  merchant_risk_score: "Merchant Risk Score",
  merchant_fraud_rate: "Merchant Fraud Rate",
  merchant_avg_amount: "Merchant Average Ticket",
  merchant_std_amount: "Merchant Amount Variability",
  geo_cluster_fraud_rate: "Location Risk",
  peer_cluster_fraud_rate: "Peer Risk",
  card_to_history_ratio: "Card Usage Ratio",
  is_new_user: "User Status",
  rolling_mean_amount: "Recent Spending Average",
  rolling_std_amount: "Recent Spending Spread",
  transaction_history_length: "Account History Length",
  transaction_gap_from_first_day: "Time Since First Activity",
  merchant_tx_count: "Merchant Activity Volume",
  merchant_outlier_score: "Merchant Outlier Score",
  cluster_outlier_score: "Cluster Outlier Score",
  high_card_velocity_flag: "High Velocity Flag",
  mcc_description: "Merchant Category",
  payment_method: "Payment Method",
  timestamp: "Timestamp",
};

const HIDDEN_FEATURES = new Set([
  "cvv",
  "card_number",
  "client_id_card",
  "transaction_id",
  "source_doc_id",
  "id",
  "_docId",
  "address",
  "zip",
  "latitude",
  "longitude",
]);

function humanizeKey(key: string): string {
  if (FEATURE_LABELS[key]) return FEATURE_LABELS[key];
  return key
    .replaceAll(/_/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase())
    .trim();
}

function formatFeatureValue(key: string, value: number | string | undefined): string {
  if (value === undefined || value === null || value === "") return "--";

  if (key === "is_new_user") {
    return Number(value) === 1 ? "New User" : "Existing User";
  }

  if (key === "acct_open_date") {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return "--";
    const year = Math.floor(numeric / 100);
    const month = numeric % 100;
    if (!year || !month) return "--";

    const opened = new Date(year, month - 1, 1);
    const now = new Date();
    const months = Math.max(0, (now.getFullYear() - opened.getFullYear()) * 12 + (now.getMonth() - opened.getMonth()));
    const years = Math.floor(months / 12);
    const remainder = months % 12;
    return years > 0 ? `${years}y ${remainder}m` : `${remainder}m`;
  }

  if (key === "payment_method") {
    const method = String(value).replaceAll("_", " ");
    return method.replace(/\b\w/g, (match) => match.toUpperCase());
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    if (Math.abs(value) >= 1000 && Number.isInteger(value)) return value.toLocaleString();
    if (Math.abs(value) < 1 && value !== 0) return value.toFixed(3);
    if (Math.abs(value) < 10) return value.toFixed(2);
    return value.toLocaleString();
  }

  return String(value);
}

function getFeatureValue(features: Record<string, number>, key: string, fallback = 0): number {
  const value = features[key];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function parseTimestamp(value: unknown): string {
  if (!value) return "--";
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function formatProcessingTime(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return "--";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function getRiskBand(risk: number): "Low" | "Medium" | "High" {
  if (risk >= 80) return "High";
  if (risk >= 50) return "Medium";
  return "Low";
}

function getDecisionLabel(decision: DisplayRow["decision"]): string {
  if (decision === "REVIEW") return "MFA";
  return decision;
}

function getCategoryLabel(key: string): string {
  return humanizeKey(key);
}

function normalizeDecision(value: unknown): "APPROVE" | "BLOCK" | "REVIEW" {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "fraud" || normalized === "fraudulent") return "BLOCK";
  if (normalized === "legitimate" || normalized === "safe") return "APPROVE";
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

function toFiniteNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function toDisplayRowFromFirestore(tx: FirestoreTransaction): DisplayRow | null {
  const txId = String(tx.transaction_id || tx.id || tx._docId || "").trim();
  if (!txId) return null;

  const rawDecision = String(tx.status || tx.fraud || "").toLowerCase();
  const decision: DisplayRow["decision"] =
    rawDecision === "fraud" || rawDecision === "yes"
      ? "BLOCK"
      : rawDecision === "safe" || rawDecision === "legitimate" || rawDecision === "no"
        ? "APPROVE"
        : rawDecision === "error"
          ? "ERROR"
          : "REVIEW";

  const ts = toDateText(tx.timestamp || tx.created_at || tx.time);
  return {
    id: txId,
    merchant: String(tx.merchant_name || tx.merchant || "Unknown Merchant"),
    amount: toFiniteNumber(tx.amount, 0),
    risk: toFiniteNumber((tx as Record<string, unknown>).risk_score, 0),
    fraudProbability: toFiniteNumber((tx as Record<string, unknown>).fraud_probability, 0),
    decision,
    reason: String((tx as Record<string, unknown>).top_feature || "Model analysis complete"),
    time: ts,
    paymentMethod: String(tx.payment_method || (tx.meta as Record<string, unknown> | undefined)?.payment_method || "card"),
    transactionTimestamp: ts,
    features: (tx.features || {}) as Record<string, number>,
    explainability: ((tx as Record<string, unknown>).explainability as ExplainabilityDetails | undefined) || null,
  };
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
  const [statusMessage, setStatusMessage] = useState("Click Simulate to start the realtime bridge.");
  const [rows, setRows] = useState<DisplayRow[]>([]);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [runStartedAt, setRunStartedAt] = useState<number | null>(null);
  const [runCompletedAt, setRunCompletedAt] = useState<number | null>(null);
  const [configOpen, setConfigOpen] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);
  const [bridgeConfig, setBridgeConfig] = useState({
    apiKey: "",
    supabaseUrl: "",
    supabaseKey: "",
  });
  const [loadingExplain, setLoadingExplain] = useState<Record<string, boolean>>({});

  const runningRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const websocketRef = useRef<WebSocket | null>(null);

  const { data: liveTransactions, loading, error } = useFirestoreCollection<FirestoreTransaction>("transactions");

  const pushDebug = (message: string, payload?: unknown) => {
    console.debug("[SIM-DEBUG]", message, payload || "");
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

  useEffect(() => {
    if (orderedLiveTransactions.length === 0) return;

    const mappedRows = orderedLiveTransactions
      .map((tx) => toDisplayRowFromFirestore(tx))
      .filter((item): item is DisplayRow => Boolean(item));

    if (mappedRows.length === 0) return;

    setRows((prev) => {
      const byId = new Map(prev.map((item) => [item.id, item] as const));
      for (const nextRow of mappedRows) {
        const existing = byId.get(nextRow.id);
        byId.set(nextRow.id, existing ? { ...existing, ...nextRow } : nextRow);
      }
      return Array.from(byId.values()).sort(
        (left, right) => toMillis(left.transactionTimestamp) - toMillis(right.transactionTimestamp)
      );
    });
  }, [orderedLiveTransactions]);

  const stats = useMemo(() => {
    const total = rows.length;
    const fraud = rows.filter((row) => row.decision === "BLOCK").length;
    const safe = rows.filter((row) => row.decision === "APPROVE").length;
    const errors = rows.filter((row) => row.decision === "ERROR").length;
    const avgConfidence = rows.length
      ? rows.reduce((sum, row) => {
          const confidence = Math.max(Number(row.fraudProbability || 0), Number(row.risk || 0) / 100);
          return sum + confidence;
        }, 0) / rows.length
      : 0;

    return { total, fraud, safe, errors, avgConfidence };
  }, [rows]);

  const selectedRow = useMemo(() => {
    if (rows.length === 0) return null;
    if (!selectedRowId) return rows[rows.length - 1];
    return rows.find((row) => row.id === selectedRowId) || rows[rows.length - 1];
  }, [rows, selectedRowId]);

  useEffect(() => {
    if (!selectedRow || selectedRow.explainability || loadingExplain[selectedRow.id]) return;

    const tx = orderedLiveTransactions.find((t) => String(t.transaction_id || t.id || t._docId) === selectedRow.id);
    if (!tx) return;

    const payload = buildExplainPayload(tx);
    setLoadingExplain((prev) => ({ ...prev, [selectedRow.id]: true }));

    fetch(`/api/simulator/explain`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then((res) => res.json())
      .then((data: ExplainApiResponse) => {
        if (data.status === "success" && data.data?.explainability) {
          setRows((prev) =>
            prev.map((r) => (r.id === selectedRow.id ? { ...r, explainability: data.data!.explainability } : r))
          );
        }
      })
      .catch((err) => console.error("Explain fetch error", err))
      .finally(() => {
        setLoadingExplain((prev) => ({ ...prev, [selectedRow.id]: false }));
      });
  }, [selectedRow, loadingExplain, orderedLiveTransactions]);

  const processingTimeMs = useMemo(() => {
    if (!runStartedAt) return 0;
    const end = runCompletedAt || (running ? Date.now() : runCompletedAt || Date.now());
    return Math.max(0, end - runStartedAt);
  }, [runStartedAt, runCompletedAt, running]);

  const detectionAccuracy = useMemo(() => {
    if (rows.length === 0) return 0;
    return Math.round(Math.max(0, Math.min(1, stats.avgConfidence)) * 100);
  }, [rows.length, stats.avgConfidence]);

  const selectedRowFeatures = selectedRow?.features || {};
  const selectedShapPoints = useMemo(() => getWaterfallPoints(selectedRow?.explainability).slice(0, 6), [selectedRow]);
  const categoryScores = useMemo(() => {
    const scores = selectedRow?.explainability?.category_scores || {};
    return Object.entries(scores)
      .map(([key, value]) => ({ key, label: getCategoryLabel(key), value: Number(value || 0) }))
      .sort((left, right) => right.value - left.value);
  }, [selectedRow]);

  const detailBlocks = useMemo(() => {
    if (!selectedRow) return null;

    const transactionInfo = [
      { label: "Amount", value: `$${selectedRow.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
      { label: "Merchant", value: selectedRow.merchant },
      { label: "Payment Method", value: formatFeatureValue("payment_method", selectedRow.paymentMethod) },
      { label: "Timestamp", value: parseTimestamp(selectedRow.transactionTimestamp) },
    ];

    const userInfo = [
      { label: "Age", value: formatFeatureValue("current_age", getFeatureValue(selectedRowFeatures, "current_age")) },
      { label: "Credit Score", value: formatFeatureValue("credit_score", getFeatureValue(selectedRowFeatures, "credit_score")) },
      { label: "Account Age", value: formatFeatureValue("acct_open_date", getFeatureValue(selectedRowFeatures, "acct_open_date")) },
      { label: "User Type", value: formatFeatureValue("is_new_user", getFeatureValue(selectedRowFeatures, "is_new_user")) },
    ];

    const behaviorInfo = [
      { label: "Transaction Speed", value: formatFeatureValue("transaction_velocity", getFeatureValue(selectedRowFeatures, "transaction_velocity")) },
      { label: "Average Spending", value: formatFeatureValue("user_avg_amount", getFeatureValue(selectedRowFeatures, "user_avg_amount")) },
      { label: "Transaction Frequency", value: formatFeatureValue("user_tx_frequency", getFeatureValue(selectedRowFeatures, "user_tx_frequency")) },
      { label: "Spending Deviation", value: formatFeatureValue("amount_deviation", getFeatureValue(selectedRowFeatures, "amount_deviation")) },
    ];

    const riskInfo = [
      { label: "Merchant Risk Score", value: formatFeatureValue("merchant_risk_score", getFeatureValue(selectedRowFeatures, "merchant_risk_score")) },
      { label: "Merchant Fraud Rate", value: formatFeatureValue("merchant_fraud_rate", getFeatureValue(selectedRowFeatures, "merchant_fraud_rate")) },
      { label: "Anomaly Score", value: formatFeatureValue("anomaly_score", getFeatureValue(selectedRowFeatures, "anomaly_score")) },
    ];

    return { transactionInfo, userInfo, behaviorInfo, riskInfo };
  }, [selectedRow, selectedRowFeatures]);

  const startSimulation = async () => {
    if (runningRef.current) return;

    if (!bridgeConfig.apiKey.trim() || !bridgeConfig.supabaseUrl.trim() || !bridgeConfig.supabaseKey.trim()) {
      setConfigError("API key, Supabase URL and Supabase key are required.");
      setConfigOpen(true);
      return;
    }

    setRows([]);
    setSelectedRowId(null);
    setRunStartedAt(Date.now());
    setRunCompletedAt(null);
    setStatusMessage("Starting realtime Supabase listener...");
    setRunning(true);
    runningRef.current = true;

    abortRef.current?.abort();
    abortRef.current = new AbortController();
    websocketRef.current?.close();

    try {
      const bootstrapResponse = await fetch(`${API_BASE_URL}/supabase-bridge/run-e2e`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          credential: bridgeConfig.apiKey.trim(),
          supabase_url: bridgeConfig.supabaseUrl.trim(),
          supabase_key: bridgeConfig.supabaseKey.trim(),
          base_url: "https://samyak000-fraud-detection-model.hf.space",
          limit: 500,
        }),
        signal: abortRef.current.signal,
      });

      if (!bootstrapResponse.ok) {
        let detail = "Bootstrap request failed";
        try {
          const payload = (await bootstrapResponse.json()) as { detail?: string };
          if (payload?.detail) detail = payload.detail;
        } catch {
          const errText = await bootstrapResponse.text();
          if (errText) detail = errText;
        }
        throw new Error(`${bootstrapResponse.status} ${detail}`);
      }

      const bootstrapResult = (await bootstrapResponse.json()) as {
        total_processed: number;
        total_saved: number;
        rows: Array<{
          transaction_id: string;
          classification: string;
          risk_score: number;
          fraud_probability?: number;
          reason?: string;
        }>;
      };

      for (const row of bootstrapResult.rows) {
        const decision = normalizeDecision(row.classification);
        const risk = Number(row.risk_score || 0);
        setRows((prev) => {
          const byId = new Map(prev.map((item) => [item.id, item] as const));
          byId.set(row.transaction_id, {
            id: row.transaction_id,
            merchant: "Supabase Merchant",
            amount: 0,
            risk,
            fraudProbability: Number(row.fraud_probability || 0),
            decision,
            reason: row.reason || "Model analysis complete",
            time: new Date().toISOString(),
            transactionTimestamp: new Date().toISOString(),
            paymentMethod: "card",
            features: {},
            explainability: null,
          });
          return Array.from(byId.values());
        });
      }

      setStatusMessage(
        `Bootstrap complete. Processed ${bootstrapResult.total_processed}, saved ${bootstrapResult.total_saved}. Connecting realtime...`
      );
    } catch (bootstrapError) {
      const message = bootstrapError instanceof Error ? bootstrapError.message : "Unknown error";
      setStatusMessage(`Pipeline failed: ${message}`);
      pushDebug("Bootstrap failed", { error: message });
      runningRef.current = false;
      setRunning(false);
      setRunCompletedAt(Date.now());
      return;
    }

    const wsBase = API_BASE_URL
      .replace(/\/api\/v1\/?$/, "")
      .replace(/^http:\/\//i, "ws://")
      .replace(/^https:\/\//i, "wss://");

    const wsUrl = `${wsBase}/api/v1/supabase-bridge/ws-realtime`;
    const ws = new WebSocket(wsUrl);
    websocketRef.current = ws;

    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          credential: bridgeConfig.apiKey.trim(),
          supabase_url: bridgeConfig.supabaseUrl.trim(),
          supabase_key: bridgeConfig.supabaseKey.trim(),
          base_url: "https://samyak000-fraud-detection-model.hf.space",
          limit: 200,
        })
      );
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(String(event.data || "{}")) as {
          type?: string;
          detail?: string;
          listener_started?: boolean;
          listener_error?: string | null;
          total_processed?: number;
          total_saved?: number;
          row?: {
            transaction_id: string;
            classification: string;
            risk_score: number;
            fraud_probability?: number;
            reason?: string;
          };
        };

        if (payload.type === "error") {
          setStatusMessage(`Pipeline failed: ${payload.detail || "Unknown error"}`);
          runningRef.current = false;
          setRunning(false);
          setRunCompletedAt(Date.now());
          return;
        }

        if (payload.type === "ready") {
          if (payload.listener_started) {
            setStatusMessage("Realtime listener active. New incoming transactions will stream automatically.");
          } else {
            setStatusMessage(`Realtime listener unavailable: ${payload.listener_error || "unknown error"}`);
          }
          return;
        }

        if (payload.type === "live_row" && payload.row) {
          const row = payload.row;
          const decision = normalizeDecision(row.classification);
          const risk = Number(row.risk_score || 0);

          setRows((prev) => {
            const byId = new Map(prev.map((item) => [item.id, item] as const));
            byId.set(row.transaction_id, {
              id: row.transaction_id,
              merchant: "Supabase Merchant",
              amount: 0,
              risk,
              fraudProbability: Number(row.fraud_probability || 0),
              decision,
              reason: row.reason || "Model analysis complete",
              time: new Date().toISOString(),
              transactionTimestamp: new Date().toISOString(),
              paymentMethod: "card",
              features: {},
              explainability: null,
            });
            return Array.from(byId.values());
          });

          setSelectedRowId(row.transaction_id);
          setStatusMessage(
            `Live: ${row.transaction_id.slice(0, 14)}... -> ${decision} (Risk ${risk.toFixed(2)})`
          );
          return;
        }
      } catch (err) {
        pushDebug("WS parse error", err);
      }
    };

    ws.onerror = () => {
      setStatusMessage("Realtime websocket error. Check backend status and credentials.");
    };

    ws.onclose = () => {
      if (runningRef.current) {
        setStatusMessage("Realtime websocket disconnected.");
      }
      runningRef.current = false;
      setRunning(false);
      setRunCompletedAt(Date.now());
    };
  };

  const stopSimulation = () => {
    runningRef.current = false;
    abortRef.current?.abort();
    websocketRef.current?.close();
    websocketRef.current = null;
    setRunning(false);
    setRunCompletedAt(Date.now());
    setStatusMessage("Simulation stopped.");
    pushDebug("Processing stopped by user");
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3 max-w-3xl">
            <Link href="/dashboard/settings" className="text-xs font-bold uppercase tracking-widest text-primary inline-flex items-center gap-2">
              <ArrowLeft size={14} />
              Back to Key Settings
            </Link>
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-secondary">Analyst Intelligence Console</p>
              <h1 className="text-4xl md:text-5xl font-bold font-space tracking-tight text-foreground">Transaction Intelligence Dashboard</h1>
              <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
                A human-readable view of live transaction risk. The interface focuses on what happened, why it happened, and how risky it is.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => {
                setConfigError(null);
                setConfigOpen(true);
              }}
              disabled={running}
              className="h-12 px-6 rounded-2xl bg-primary text-primary-foreground text-[10px] font-bold font-space uppercase tracking-widest inline-flex items-center gap-2 shadow-lg shadow-primary/20 disabled:opacity-50"
            >
              <Play size={14} />
              Simulate
            </button>
            <button
              onClick={stopSimulation}
              disabled={!running}
              className="h-12 px-6 rounded-2xl border border-black/10 bg-white text-[10px] font-bold font-space uppercase tracking-widest inline-flex items-center gap-2 disabled:opacity-50"
            >
              <Square size={14} />
              Stop
            </button>
            <div className="h-12 px-4 rounded-2xl border border-black/10 bg-white text-[10px] font-bold uppercase tracking-widest text-muted-foreground inline-flex items-center gap-2">
              <Clock size={14} />
              {formatProcessingTime(processingTimeMs)}
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 text-xs font-bold uppercase tracking-widest">
          <div className="rounded-2xl border border-green-200 bg-white px-5 py-4 shadow-sm">
            <div className="text-[10px] text-green-600 mb-1">Total Transactions</div>
            <div className="text-3xl font-black text-slate-900">{stats.total}</div>
          </div>
          <div className="rounded-2xl border border-red-200 bg-white px-5 py-4 shadow-sm">
            <div className="text-[10px] text-red-500 mb-1">Fraud Detected</div>
            <div className="text-3xl font-black text-slate-900">{stats.fraud}</div>
          </div>
          <div className="rounded-2xl border border-blue-200 bg-white px-5 py-4 shadow-sm">
            <div className="text-[10px] text-blue-600 mb-1">Processing Time</div>
            <div className="text-3xl font-black text-slate-900">{formatProcessingTime(processingTimeMs)}</div>
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-white px-5 py-4 shadow-sm">
            <div className="text-[10px] text-emerald-600 mb-1">Detection Accuracy</div>
            <div className="text-3xl font-black text-slate-900">{detectionAccuracy}%</div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-6 text-xs font-bold uppercase tracking-widest">
          <span className="text-muted-foreground">{statusMessage}</span>
          <div className="flex items-center gap-4 pl-4 border-l border-black/10">
            <span className="text-muted-foreground">Streamed: <span className="text-foreground">{stats.total}</span></span>
            <span className="text-emerald-600">Safe: <span className="text-emerald-700">{stats.safe}</span></span>
            <span className="text-red-600">Fraud: <span className="text-red-700">{stats.fraud}</span></span>
            <span className="text-red-500">Errors: <span className="text-red-600">{stats.errors}</span></span>
          </div>
        </div>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-bold uppercase tracking-widest text-error">
            Firestore read error: {error.message}
          </div>
        ) : null}

        <div className="grid gap-8 xl:grid-cols-[420px_minmax(0,1fr)]">
          <section className="rounded-[2rem] border border-black/10 bg-white shadow-sm overflow-hidden flex flex-col">
            <div className="border-b border-black/10 px-6 py-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold font-space text-slate-900">Live Transaction Feed</h2>
                <p className="text-xs text-muted-foreground mt-1">Click a transaction to inspect the human-readable breakdown.</p>
              </div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground bg-slate-50 px-3 py-1 rounded-full border border-black/5">{rows.length} items</div>
            </div>

            <div className="flex-1 max-h-[760px] overflow-y-auto p-3 space-y-3 no-scrollbar">
              {rows.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-black/10 bg-slate-50 px-4 py-10 text-center text-sm text-muted-foreground">
                  Start the stream to load transactions here.
                </div>
              ) : (
                [...rows].slice().reverse().map((row) => {
                  const isSelected = selectedRow?.id === row.id;
                  const decision = getDecisionLabel(row.decision);
                  const decisionTone =
                    row.decision === "BLOCK"
                      ? "text-red-600 bg-red-50 border-red-200"
                      : row.decision === "REVIEW"
                        ? "text-amber-600 bg-amber-50 border-amber-200"
                        : "text-emerald-600 bg-emerald-50 border-emerald-200";

                  return (
                    <button
                      key={row.id}
                      onClick={() => setSelectedRowId(row.id)}
                      className={`w-full text-left rounded-2xl border px-4 py-4 transition-all duration-200 ${isSelected ? "border-primary bg-blue-50 shadow-[0_0_0_2px_rgba(59,130,246,0.1)]" : "border-black/10 bg-white hover:border-blue-200 hover:bg-blue-50/30"}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold font-space text-slate-900 truncate">{row.id}</span>
                            <span className={`text-[9px] font-bold uppercase tracking-widest border rounded-full px-2 py-1 flex-shrink-0 ${decisionTone}`}>{decision}</span>
                          </div>
                          <div className="mt-2 text-sm text-slate-700 font-semibold truncate">{row.merchant}</div>
                          <div className="mt-1 text-[10px] text-muted-foreground">{parseTimestamp(row.transactionTimestamp)}</div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-base font-black text-slate-900">${row.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                          <div className={`mt-1 text-[10px] font-bold uppercase tracking-widest ${row.decision === "BLOCK" ? "text-red-500" : row.decision === "REVIEW" ? "text-amber-500" : "text-emerald-600"}`}>
                            {row.decision === "REVIEW" ? "MFA" : row.decision}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </section>

          <section className="space-y-8">
            <div className="rounded-[2rem] border border-black/10 bg-white shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-black/10 flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold font-space text-slate-900">Transaction Detail Panel</h2>
                  <p className="text-xs text-muted-foreground mt-1">What happened, why it happened, and how risky it is.</p>
                </div>
                <div className="rounded-full border border-black/10 bg-slate-50 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground whitespace-nowrap">
                  Risk: <span className={selectedRow ? (selectedRow.risk >= 80 ? "text-red-600" : selectedRow.risk >= 50 ? "text-amber-600" : "text-emerald-600") : "text-gray-600"}>{selectedRow ? selectedRow.risk.toFixed(1) : "N/A"}</span>
                </div>
              </div>

              {selectedRow && detailBlocks ? (
                <div className="p-6 space-y-6">
                  <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)] items-start">
                    <div className="rounded-[1.75rem] border border-black/10 bg-gradient-to-b from-slate-50 to-white p-5 shadow-sm">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Risk Score</div>
                      <div className="mt-3 flex items-end gap-2">
                        <span className="text-5xl font-black text-slate-900">{selectedRow.risk.toFixed(1)}</span>
                        <span className="text-sm font-bold text-muted-foreground mb-2">/100</span>
                      </div>
                      <div className="mt-4 h-3 rounded-full bg-slate-200 overflow-hidden border border-black/5 shadow-inner">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${selectedRow.risk >= 80 ? "bg-gradient-to-r from-red-400 to-red-500 shadow-lg shadow-red-200" : selectedRow.risk >= 50 ? "bg-gradient-to-r from-amber-400 to-amber-500 shadow-lg shadow-amber-200" : "bg-gradient-to-r from-emerald-400 to-emerald-500 shadow-lg shadow-emerald-200"}`}
                          style={{ width: `${Math.max(2, Math.min(100, selectedRow.risk))}%` }}
                        />
                      </div>
                      <div className="mt-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">{getRiskBand(selectedRow.risk)} Risk</div>
                    </div>

                    <div className="rounded-[1.75rem] border border-black/10 bg-white p-5">
                      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        {detailBlocks.transactionInfo.map((item) => (
                          <div key={item.label} className="rounded-2xl border border-black/10 bg-slate-50 px-4 py-3">
                            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{item.label}</div>
                            <div className="mt-1 text-sm font-bold text-slate-900">{item.value}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-[1.75rem] border border-black/10 bg-gradient-to-b from-slate-50 to-white p-4 shadow-sm">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">User Info</div>
                      <div className="space-y-3">
                        {detailBlocks.userInfo.map((item) => (
                          <div key={item.label} className="flex items-center justify-between gap-3">
                            <span className="text-xs text-muted-foreground">{item.label}</span>
                            <span className="font-bold text-slate-900 text-right text-sm">{item.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-[1.75rem] border border-black/10 bg-gradient-to-b from-slate-50 to-white p-4 shadow-sm">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Behavior Insights</div>
                      <div className="space-y-3">
                        {detailBlocks.behaviorInfo.map((item) => (
                          <div key={item.label} className="flex items-center justify-between gap-3">
                            <span className="text-xs text-muted-foreground">{item.label}</span>
                            <span className="font-bold text-slate-900 text-right text-sm">{item.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-[1.75rem] border border-black/10 bg-gradient-to-b from-slate-50 to-white p-4 shadow-sm">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Risk Insights</div>
                      <div className="space-y-3">
                        {detailBlocks.riskInfo.map((item) => (
                          <div key={item.label} className="flex items-center justify-between gap-3">
                            <span className="text-xs text-muted-foreground">{item.label}</span>
                            <span className="font-bold text-slate-900 text-right text-sm">{item.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-[1.75rem] border border-black/10 bg-gradient-to-b from-slate-50 to-white p-4 shadow-sm">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Decision</div>
                      <div className={`inline-flex items-center justify-center rounded-2xl px-3 py-2 text-xs font-bold uppercase tracking-[0.2em] border mb-3 ${selectedRow.decision === "BLOCK" ? "bg-red-50 border-red-200 text-red-600" : selectedRow.decision === "REVIEW" ? "bg-amber-50 border-amber-200 text-amber-600" : "bg-emerald-50 border-emerald-200 text-emerald-600"}`}>
                        {getDecisionLabel(selectedRow.decision)}
                      </div>
                      <div className="text-xs text-slate-700 leading-relaxed max-h-32 overflow-y-auto whitespace-pre-wrap no-scrollbar">{selectedRow.reason}</div>
                    </div>
                  </div>

                  <div className="rounded-[1.75rem] border border-blue-100 bg-gradient-to-b from-blue-50/50 to-white p-5 shadow-sm mt-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Sparkles className="w-5 h-5 text-blue-500" />
                      <div className="text-xs font-bold uppercase tracking-widest text-blue-600">AI Analyst Explanation</div>
                    </div>
                    {loadingExplain[selectedRow.id] ? (
                      <div className="flex items-center gap-3 text-sm text-blue-600/70 py-6">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Generating AI insights based on transaction features...</span>
                      </div>
                    ) : selectedRow.explainability?.explanation_summary ? (
                      <div className="max-h-[32rem] overflow-y-auto no-scrollbar bg-white/50 rounded-2xl p-4 border border-blue-50">
                        {renderStructuredExplanation(selectedRow.explainability.explanation_summary)}
                      </div>
                    ) : (
                      <div className="text-sm text-slate-500 italic bg-white/50 rounded-2xl p-4 border border-slate-50">
                        No AI explanation available. {selectedRow.reason}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="px-6 py-16 text-center text-muted-foreground">
                  Start the stream and select a transaction to see the detail breakdown.
                </div>
              )}
            </div>

            <div className="grid gap-8 xl:grid-cols-2">
              <div className="rounded-[2rem] border border-black/10 bg-white shadow-sm p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-bold font-space text-slate-900">SHAP Feature Influence</h3>
                    <p className="text-xs text-muted-foreground mt-1">Red increases risk, green reduces it.</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {selectedShapPoints.length === 0 ? (
                    <div className="text-sm text-muted-foreground rounded-[1.5rem] border border-dashed border-black/10 bg-slate-50 px-4 py-10 text-center">
                      No explanation signals available yet.
                    </div>
                  ) : (
                    selectedShapPoints.map((point) => {
                      const maxValue = Math.max(...selectedShapPoints.map((entry) => Math.abs(entry.shapValue)), 1);
                      const width = Math.max(8, (Math.abs(point.shapValue) / maxValue) * 100);
                      const isPositive = point.shapValue > 0;
                      return (
                        <div key={point.key} className="space-y-2">
                          <div className="flex items-center justify-between gap-3">
                            <span className="font-semibold text-slate-900 text-sm">{point.label}</span>
                            <span className={`font-mono text-xs font-bold ${isPositive ? "text-red-500" : "text-emerald-600"}`}>
                              {isPositive ? "+" : ""}{point.shapValue.toFixed(4)}
                            </span>
                          </div>
                          <div className="h-3 rounded-full bg-slate-200 border border-black/5 overflow-hidden shadow-sm">
                            <div className={`h-full rounded-full transition-all ${isPositive ? "bg-gradient-to-r from-red-400 to-red-500 shadow-lg shadow-red-200/50" : "bg-gradient-to-r from-emerald-400 to-emerald-500 shadow-lg shadow-emerald-200/50"}`} style={{ width: `${width}%` }} />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="rounded-[2rem] border border-black/10 bg-white shadow-sm p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-bold font-space text-slate-900">Fraud Category Breakdown</h3>
                    <p className="text-xs text-muted-foreground mt-1">Category weights summarized into a readable split.</p>
                  </div>
                </div>

                {categoryScores.length === 0 ? (
                  <div className="text-sm text-muted-foreground rounded-[1.5rem] border border-dashed border-black/10 bg-slate-50 px-4 py-10 text-center">
                    No category score data available.
                  </div>
                ) : (
                  <div className="grid gap-6 md:grid-cols-[200px_minmax(0,1fr)] items-center">
                    <div className="mx-auto flex h-48 w-48 items-center justify-center rounded-full border border-black/10 bg-gradient-to-b from-slate-50 to-slate-100 shadow-inner">
                      <div
                        className="h-40 w-40 rounded-full border border-black/5 shadow-lg"
                        style={{
                          background: `conic-gradient(${categoryScores
                            .map((entry, index) => {
                              const palette = ["#2563eb", "#ef4444", "#14b8a6", "#f59e0b", "#8b5cf6", "#0ea5e9"];
                              return `${palette[index % palette.length]} ${entry.value * 100}%`;
                            })
                            .join(", ")})`,
                        }}
                      />
                    </div>

                    <div className="space-y-4">
                      {categoryScores.map((entry, index) => {
                        const palette = ["#2563eb", "#ef4444", "#14b8a6", "#f59e0b", "#8b5cf6", "#0ea5e9"];
                        const color = palette[index % palette.length];
                        const percent = Math.max(4, entry.value * 100);
                        return (
                          <div key={entry.key} className="space-y-2">
                            <div className="flex items-center justify-between gap-3">
                              <span className="font-semibold text-slate-900 text-sm">{entry.label}</span>
                              <span className="font-mono text-sm font-bold text-slate-700">{(entry.value * 100).toFixed(1)}%</span>
                            </div>
                            <div className="h-2 rounded-full bg-slate-200 overflow-hidden border border-black/5">
                              <div className="h-full rounded-full transition-all shadow-md" style={{ width: `${percent}%`, backgroundColor: color }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>

      {configOpen ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 px-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-[2rem] border border-black/10 bg-white shadow-2xl shadow-black/20 overflow-hidden">
            <div className="flex items-center justify-between border-b border-black/10 px-6 py-5">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-secondary">Simulation Setup</p>
                <h3 className="mt-1 text-xl font-bold font-space text-slate-900">Connect Supabase Pipeline</h3>
              </div>
              <button
                onClick={() => setConfigOpen(false)}
                className="h-10 w-10 rounded-xl border border-black/10 bg-slate-50 text-slate-500 inline-flex items-center justify-center hover:bg-slate-100"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {configError ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-bold uppercase tracking-widest text-amber-700">
                  {configError}
                </div>
              ) : null}
              <label className="block space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Our API key / SIM code</span>
                <input
                  type="password"
                  value={bridgeConfig.apiKey}
                  onChange={(event) => setBridgeConfig((current) => ({ ...current, apiKey: event.target.value }))}
                  className="w-full rounded-2xl border border-black/10 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-primary focus:bg-white"
                  placeholder="ik_live_... or SIM-..."
                />
              </label>
              <label className="block space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Supabase URL</span>
                <input
                  type="text"
                  value={bridgeConfig.supabaseUrl}
                  onChange={(event) => setBridgeConfig((current) => ({ ...current, supabaseUrl: event.target.value }))}
                  className="w-full rounded-2xl border border-black/10 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-primary focus:bg-white"
                  placeholder="https://project.supabase.co"
                />
              </label>
              <label className="block space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Supabase key</span>
                <input
                  type="password"
                  value={bridgeConfig.supabaseKey}
                  onChange={(event) => setBridgeConfig((current) => ({ ...current, supabaseKey: event.target.value }))}
                  className="w-full rounded-2xl border border-black/10 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-primary focus:bg-white"
                  placeholder="service role key"
                />
              </label>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setConfigOpen(false)}
                  className="h-11 rounded-2xl border border-black/10 bg-white px-5 text-[10px] font-bold uppercase tracking-widest text-slate-700"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    setConfigOpen(false);
                    await startSimulation();
                  }}
                  disabled={running}
                  className="h-11 rounded-2xl bg-primary px-5 text-[10px] font-bold uppercase tracking-widest text-white shadow-lg shadow-primary/20 disabled:opacity-50 inline-flex items-center gap-2"
                >
                  {running ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                  Start Simulation
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </DashboardLayout>
  );
}
