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

const HF_EXPLAIN_API_URL = process.env.HF_EXPLAIN_API_URL || "https://samyak000-fraud-detection-model.hf.space/explain";
const REQUEST_TIMEOUT_MS = Number(process.env.HF_EXPLAIN_TIMEOUT_MS || 45000);

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
      let parsed: unknown = null;
      try {
        parsed = rawText ? JSON.parse(rawText) : null;
      } catch {
        parsed = { detail: rawText || "Explain API returned non-JSON response" };
      }

      if (!response.ok) {
        return NextResponse.json(
          {
            detail: "Explain API request failed",
            upstream_status: response.status,
            upstream_body: parsed,
          },
          { status: 502 }
        );
      }

      return NextResponse.json(parsed, { status: 200 });
    } finally {
      clearTimeout(timeout);
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
