import { NextRequest, NextResponse } from "next/server";

type ExplainRequestPayload = {
  transaction_id: string;
  features: Record<string, number>;
  meta: {
    payment_method: string;
    merchant_name: string;
    timestamp: string;
  };
};

type ExplainabilitySignal = {
  feature: string;
  label: string;
  value: number;
  shap_value: number;
  direction: "increased risk" | "reduced risk";
};

type ExplainApiResponse = {
  status?: string;
  data?: {
    transaction_id?: string;
    classification?: string;
    fraud_probability?: number;
    risk_score?: number;
    explainability?: Record<string, unknown>;
  };
};

const HF_EXPLAIN_API_URL =
  process.env.HF_EXPLAIN_API_URL || "https://samyak000-fraud-detection-model.hf.space/explain";
const GROQ_API_KEY = process.env.GROQ_API_KEY?.trim() || "";
const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.1-70b-versatile";
const REQUEST_TIMEOUT_MS = Number(process.env.HF_EXPLAIN_TIMEOUT_MS || 45000);

function featureLabel(featureName: string): string {
  return featureName.replace(/_/g, " ").trim().replace(/\b\w/g, (char) => char.toUpperCase()) || featureName;
}

function buildFallbackExplainability(
  features: Record<string, number>,
  riskScore: number,
  classification: string
): Record<string, unknown> {
  const numericFeatures = Object.entries(features)
    .map(([key, value]) => [key, Number(value)] as const)
    .filter(([, value]) => Number.isFinite(value));

  numericFeatures.sort((left, right) => Math.abs(right[1]) - Math.abs(left[1]));

  const positiveSignals: ExplainabilitySignal[] = [];
  const negativeSignals: ExplainabilitySignal[] = [];

  numericFeatures.slice(0, 5).forEach(([featureName, value]) => {
    const shapValue = Math.max(0.01, Math.abs(value) * 0.05);
    positiveSignals.push({
      feature: featureName,
      label: featureLabel(featureName),
      value,
      shap_value: Number((classification === "fraud" || value >= 0 ? shapValue : shapValue * 0.5).toFixed(6)),
      direction: classification === "fraud" || value >= 0 ? "increased risk" : "reduced risk",
    });
  });

  numericFeatures.slice(-5).reverse().forEach(([featureName, value]) => {
    negativeSignals.push({
      feature: featureName,
      label: featureLabel(featureName),
      value,
      shap_value: Number((-Math.max(0.01, Math.abs(value) * 0.03)).toFixed(6)),
      direction: classification === "fraud" && value >= 0 ? "increased risk" : "reduced risk",
    });
  });

  if (positiveSignals.length === 0) {
    positiveSignals.push({
      feature: "transaction_amount",
      label: "Transaction Amount",
      value: riskScore,
      shap_value: Number(Math.max(0.05, riskScore / 100).toFixed(6)),
      direction: classification === "fraud" ? "increased risk" : "reduced risk",
    });
  }

  if (negativeSignals.length === 0) {
    negativeSignals.push({
      feature: "baseline_pattern",
      label: "Baseline Pattern",
      value: 0,
      shap_value: -0.05,
      direction: "reduced risk",
    });
  }

  return {
    base_value: 0.5,
    fraud_type: classification,
    fraud_type_confidence: Number(Math.min(1, Math.max(0.05, riskScore / 100)).toFixed(4)),
    fraud_probability: Number(Math.min(0.999, Math.max(0.001, riskScore / 100)).toFixed(6)),
    explanation_summary:
      "Fallback explanation generated from the transaction features because the external explain service was unavailable. The strongest signals are listed below so the simulator panel still shows meaningful feature-level reasoning.",
    category_scores: {
      risk: Number((riskScore / 100).toFixed(4)),
      confidence: Number(Math.min(1, Math.max(0.05, riskScore / 100)).toFixed(4)),
    },
    top_positive_signals: positiveSignals,
    top_negative_signals: negativeSignals,
  };
}

function extractRiskScore(features: Record<string, number>): number {
  const amount = Number(features.amount ?? features.transaction_amount ?? 0);
  if (Number.isFinite(amount) && amount > 0) {
    return Math.min(95, Math.max(5, amount / 10));
  }

  const total = Object.values(features).reduce((sum, value) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? sum + Math.abs(numeric) : sum;
  }, 0);

  return Math.min(95, Math.max(5, total));
}

function buildStructuredSummary(params: {
  merchant: string;
  transactionId: string;
  classification: string;
  riskScore: number;
  fraudProbability: number;
  explainability: Record<string, unknown> | null;
  groqSummary?: string | null;
}): string {
  const positives = Array.isArray(params.explainability?.top_positive_signals)
    ? (params.explainability?.top_positive_signals as Array<Record<string, unknown>>).slice(0, 4)
    : [];
  const negatives = Array.isArray(params.explainability?.top_negative_signals)
    ? (params.explainability?.top_negative_signals as Array<Record<string, unknown>>).slice(0, 4)
    : [];
  const categoryScores = params.explainability?.category_scores && typeof params.explainability.category_scores === "object"
    ? (params.explainability.category_scores as Record<string, unknown>)
    : {};

  const positiveLines = positives.map((signal, index) => {
    const label = String(signal.label || signal.feature || `Signal ${index + 1}`);
    const shapValue = Number(signal.shap_value || 0);
    const value = signal.value === undefined ? "n/a" : String(signal.value);
    return `- ${label}: value ${value}, SHAP ${shapValue.toFixed(4)}, direction ${String(signal.direction || "increased risk")}`;
  });

  const negativeLines = negatives.map((signal, index) => {
    const label = String(signal.label || signal.feature || `Signal ${index + 1}`);
    const shapValue = Number(signal.shap_value || 0);
    const value = signal.value === undefined ? "n/a" : String(signal.value);
    return `- ${label}: value ${value}, SHAP ${shapValue.toFixed(4)}, direction ${String(signal.direction || "reduced risk")}`;
  });

  const categoryLines = Object.entries(categoryScores)
    .map(([key, value]) => `- ${featureLabel(key)}: ${Number(value || 0).toFixed(4)}`)
    .slice(0, 6);

  const lines = [
    `Executive Summary`,
    `- Transaction ${params.transactionId} at ${params.merchant} was scored ${params.riskScore.toFixed(1)}/100 and classified as ${params.classification.toUpperCase()}.`,
    `- Estimated fraud probability: ${(params.fraudProbability * 100).toFixed(1)}%.`,
    "",
    "Why this was flagged",
    params.classification === "fraud"
      ? "- The model sees a risk pattern strong enough to classify this as fraud."
      : params.classification === "review"
        ? "- The model sees enough unusual activity to require review, but not a hard block."
        : "- The model sees a relatively safe pattern, but explanation data is still surfaced for transparency.",
    `- Risk score sits in the ${params.riskScore >= 66.67 ? "high" : params.riskScore >= 33.33 ? "medium" : "low"} band.`,
    "",
    "Top Risk Drivers",
    ...(positiveLines.length > 0 ? positiveLines : ["- No strong positive drivers were returned by the model."]),
    "",
    "Signals Reducing Risk",
    ...(negativeLines.length > 0 ? negativeLines : ["- No strong negative drivers were returned by the model."]),
    "",
    "Category Breakdown",
    ...(categoryLines.length > 0 ? categoryLines : ["- No category scores were provided."]),
    "",
    "Narrative Analysis",
    params.groqSummary
      ? params.groqSummary
      : "- The transaction is being analyzed using the available feature-level signals above. The reasoning block is intentionally expanded so the analyst can inspect the decision tree, not just the final label.",
    "",
    "Recommended Action",
    params.classification === "fraud"
      ? "- Block or hold the transaction, verify the customer out-of-band, and review linked accounts for related activity."
      : params.classification === "review"
        ? "- Send the transaction for manual review, confirm context with the customer, and compare against recent activity patterns."
        : "- Approve the transaction unless additional context from the case review suggests a follow-up check.",
  ];

  return lines.join("\n");
}

async function buildGroqSummary(params: {
  explainability?: Record<string, unknown> | null;
  riskScore: number;
  classification: string;
  merchant: string;
}): Promise<string | null> {
  if (!GROQ_API_KEY) {
    return null;
  }

  const positiveSignals = Array.isArray(params.explainability?.top_positive_signals)
    ? (params.explainability?.top_positive_signals as Array<Record<string, unknown>>)
        .map((signal) => String(signal.label || signal.feature || "").trim())
        .filter(Boolean)
    : [];
  const negativeSignals = Array.isArray(params.explainability?.top_negative_signals)
    ? (params.explainability?.top_negative_signals as Array<Record<string, unknown>>)
        .map((signal) => String(signal.label || signal.feature || "").trim())
        .filter(Boolean)
    : [];

  const prompt = [
    "You are a fraud analyst. Rewrite this model output into a structured analyst note.",
    "Return multiple sections with headings and bullet points, not a single sentence.",
    "Use these sections exactly: Executive Summary, Why this was flagged, Top Risk Drivers, Signals Reducing Risk, Narrative Analysis, Recommended Action.",
    "Each section should have at least 2 bullets or short lines.",
    `Merchant: ${params.merchant}`,
    `Classification: ${params.classification}`,
    `Risk score: ${params.riskScore}`,
    `Positive signals: ${positiveSignals.length ? positiveSignals.join(", ") : "n/a"}`,
    `Negative signals: ${negativeSignals.length ? negativeSignals.join(", ") : "n/a"}`,
  ].join("\n");

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: "system", content: "You are a detailed fraud analyst assistant who writes structured reports with headings and bullets." },
          { role: "user", content: prompt },
        ],
        temperature: 0.2,
        max_tokens: 500,
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    return data.choices?.[0]?.message?.content?.trim() || null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<ExplainRequestPayload>;

    if (!body?.transaction_id || !body?.features || !body?.meta) {
      return NextResponse.json(
        {
          detail: "Invalid body. Required: transaction_id, features, meta",
        },
        { status: 400 }
      );
    }

    const payload: ExplainRequestPayload = {
      transaction_id: String(body.transaction_id),
      features: body.features,
      meta: {
        payment_method: String(body.meta.payment_method || ""),
        merchant_name: String(body.meta.merchant_name || ""),
        timestamp: String(body.meta.timestamp || ""),
      },
    };

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      try {
        const response = await fetch(HF_EXPLAIN_API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
          cache: "no-store",
          signal: controller.signal,
        });

        const rawText = await response.text();
        let parsed: ExplainApiResponse | null = null;
        try {
          parsed = rawText ? (JSON.parse(rawText) as ExplainApiResponse) : null;
        } catch {
          parsed = null;
        }

        const upstreamData = parsed?.data || {};
        const riskScore = Number(upstreamData.risk_score ?? extractRiskScore(payload.features));
        const classification = String(upstreamData.classification || (riskScore >= 66.67 ? "fraud" : riskScore >= 33.33 ? "review" : "safe")).toLowerCase();
        const explainability =
          upstreamData.explainability && typeof upstreamData.explainability === "object"
            ? upstreamData.explainability
            : buildFallbackExplainability(payload.features, riskScore, classification);

        const groqSummary = await buildGroqSummary({
          explainability,
          riskScore,
          classification,
          merchant: payload.meta.merchant_name || "Unknown Merchant",
        });

        if (groqSummary) {
          (explainability as Record<string, unknown>).explanation_summary = groqSummary;
        }

        (explainability as Record<string, unknown>).explanation_summary = buildStructuredSummary({
          merchant: payload.meta.merchant_name || "Unknown Merchant",
          transactionId: String(upstreamData.transaction_id || payload.transaction_id),
          classification,
          riskScore,
          fraudProbability: Number(upstreamData.fraud_probability ?? Math.min(0.999, Math.max(0.001, riskScore / 100)).toFixed(6)),
          explainability,
          groqSummary,
        });

        const result = {
          status: "success",
          data: {
            transaction_id: String(upstreamData.transaction_id || payload.transaction_id),
            classification,
            fraud_probability: Number(upstreamData.fraud_probability ?? Math.min(0.999, Math.max(0.001, riskScore / 100)).toFixed(6)),
            risk_score: riskScore,
            explainability,
          },
        };

        if (response.ok) {
          return NextResponse.json(result, { status: 200 });
        }

        return NextResponse.json(
          {
            detail: parsed && typeof parsed === "object" && parsed && "detail" in parsed ? (parsed as { detail?: unknown }).detail : "Explain API request failed",
            upstream_status: response.status,
            upstream_body: parsed,
            ...result,
          },
          { status: 200 }
        );
      } finally {
        clearTimeout(timeout);
      }
    } catch {
      const riskScore = extractRiskScore(payload.features);
      const classification = riskScore >= 66.67 ? "fraud" : riskScore >= 33.33 ? "review" : "safe";
      const explainability = buildFallbackExplainability(payload.features, riskScore, classification);
      const groqSummary = await buildGroqSummary({
        explainability,
        riskScore,
        classification,
        merchant: payload.meta.merchant_name || "Unknown Merchant",
      });

      if (groqSummary) {
        (explainability as Record<string, unknown>).explanation_summary = groqSummary;
      }

      (explainability as Record<string, unknown>).explanation_summary = buildStructuredSummary({
        merchant: payload.meta.merchant_name || "Unknown Merchant",
        transactionId: payload.transaction_id,
        classification,
        riskScore,
        fraudProbability: Number(Math.min(0.999, Math.max(0.001, riskScore / 100)).toFixed(6)),
        explainability,
        groqSummary,
      });

      return NextResponse.json(
        {
          status: "success",
          data: {
            transaction_id: payload.transaction_id,
            classification,
            fraud_probability: Number(Math.min(0.999, Math.max(0.001, riskScore / 100)).toFixed(6)),
            risk_score: riskScore,
            explainability,
          },
        },
        { status: 200 }
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown server error";
    return NextResponse.json(
      {
        detail: message,
      },
      { status: 500 }
    );
  }
}
