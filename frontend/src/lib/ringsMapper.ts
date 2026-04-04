import { FirestoreFraudTransaction, RingsTransaction, DecisionAction } from "@/types/rings";

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
}

function toDecision(value: unknown): DecisionAction {
  if (value === "BLOCK" || value === "REVIEW" || value === "APPROVE") {
    return value;
  }
  return "APPROVE";
}

function normalizeRiskToUnit(value: number): number {
  // Some pipelines send risk as 0-100 while others send 0-1.
  if (value > 1) {
    return value / 100;
  }
  return value;
}

function normalizeRiskBand(value: unknown, riskScore: number): string {
  if (typeof value === "string" && value.trim()) {
    return value.toUpperCase();
  }
  if (riskScore >= 0.66) return "HIGH";
  if (riskScore >= 0.33) return "MEDIUM";
  return "LOW";
}

function normalizeScenario(source: unknown, riskBand: string): string {
  if (typeof source === "string" && source.trim()) {
    return source.trim().toLowerCase().replace(/\s+/g, "_");
  }
  return `risk_${riskBand.toLowerCase()}`;
}

export function mapFirestoreDocToRingsTransaction(
  docId: string,
  raw: FirestoreFraudTransaction
): RingsTransaction {
  const decisionOutput = raw.analysis?.decision_output;
  const reasonOutput = raw.analysis?.reason_output;
  const explainability = raw.analysis?.explainability;
  const supabaseRow = raw.supabase_row;
  const analysis = raw.analysis;

  const amount = toNumber(raw.amount ?? supabaseRow?.amount, 0);
  const riskScoreRaw = toNumber(
    decisionOutput?.risk_score ??
      reasonOutput?.risk_score ??
      analysis?.risk_score ??
      raw.risk_score ??
      raw.risk,
    0
  );
  const riskScore = normalizeRiskToUnit(riskScoreRaw);

  const fraudProbability = toNumber(
    decisionOutput?.fraud_probability ??
      analysis?.fraud_probability ??
      raw.fraud_probability ??
      raw.fraudProbability ??
      explainability?.fraud_probability,
    0
  );

  const decision = toDecision(
    decisionOutput?.action ??
      analysis?.decision ??
      reasonOutput?.recommended_action ??
      supabaseRow?.decision
  );

  const classification =
    decisionOutput?.classification ??
    raw.analysis?.classification ??
    raw.classification ??
    supabaseRow?.classification ??
    "unknown";

  const rawClientId =
    (supabaseRow?.features?.client_id_card as number | string | undefined) ??
    (supabaseRow?.raw_features?.client_id_card as number | string | undefined);
  const userId = rawClientId !== undefined ? `U${rawClientId}` : `U-${docId.slice(0, 6)}`;

  const merchantId =
    supabaseRow?.merchant ??
    supabaseRow?.meta?.merchant_name ??
    `M-${docId.slice(0, 6)}`;

  const riskBand = normalizeRiskBand(
    decisionOutput?.risk_band ?? reasonOutput?.risk_level ?? analysis?.classification,
    riskScore
  );

  const source = raw.source ?? supabaseRow?.meta?.source ?? "firestore_fraud_detection";

  return {
    id: docId,
    transaction_id: raw.transaction_id ?? docId,
    user_id: userId,
    merchant_id: merchantId,
    amount,
    scenario_type: normalizeScenario(source, riskBand),
    fraud_probability: Math.max(0, Math.min(1, fraudProbability)),
    final_risk_score: Math.max(0, Math.min(1, riskScore)),
    decision,
    classification,
    risk_band: riskBand,
    checked_at: raw.checked_at ?? raw.time ?? raw.transactionTimestamp ?? raw.timestamp ?? supabaseRow?.created_at,
    source,
    reason_summary: reasonOutput?.summary ?? explainability?.explanation_summary,
    raw: raw as unknown as Record<string, unknown>,
  };
}