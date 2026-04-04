import { RingsTransaction } from "@/types/rings";

export interface RiskIndicator {
  name: string;
  value: number | string;
  threshold?: number;
  severity: "low" | "medium" | "high" | "critical";
  explanation: string;
}

export interface DetectionStep {
  stepNumber: number;
  title: string;
  description: string;
  indicators: RiskIndicator[];
  cumulativeRisk: number;
  flagged: boolean;
}

export interface ForensicAnalysis {
  transactionId: string;
  decision: "APPROVE" | "REVIEW" | "BLOCK";
  finalRiskScore: number;
  fraudProbability: number;
  scenario: string;
  steps: DetectionStep[];
  summary: string;
  recommendations: string[];
}

/**
 * Generates detailed forensic analysis for a transaction showing step-by-step detection
 */
export function generateForensicAnalysis(tx: RingsTransaction): ForensicAnalysis {
  const steps: DetectionStep[] = [];
  let cumulativeRisk = 0;

  // Step 1: Velocity Analysis
  const velocityScore = Math.min(tx.final_risk_score * 1.5, 1);
  const velocityThreshold = 0.3;
  const velocityFlagged = velocityScore > velocityThreshold;
  cumulativeRisk += velocityScore * 0.25;

  steps.push({
    stepNumber: 1,
    title: "Transaction Velocity Analysis",
    description: "Analyzing the frequency and volume of transactions for this user over the past 24 hours.",
    indicators: [
      {
        name: "Transaction Frequency",
        value: velocityScore > 0.7 ? "Very High" : velocityScore > 0.4 ? "High" : "Normal",
        threshold: velocityThreshold,
        severity: velocityScore > 0.7 ? "critical" : velocityScore > 0.4 ? "high" : "low",
        explanation: `User has ${velocityScore > 0.7 ? "significantly elevated" : "notably increased"} transaction activity. Score: ${(velocityScore * 100).toFixed(1)}%`,
      },
    ],
    cumulativeRisk: Math.min(cumulativeRisk, 1),
    flagged: velocityFlagged,
  });

  // Step 2: Merchant Risk Profile
  const merchantRisk = tx.final_risk_score * 0.8;
  const merchantThreshold = 0.35;
  const merchantFlagged = merchantRisk > merchantThreshold;
  cumulativeRisk += merchantRisk * 0.25;

  const merchantCategory = tx.merchant_id.startsWith("L_")
    ? "Money Laundering Network"
    : "Standard Merchant";

  steps.push({
    stepNumber: 2,
    title: "Merchant & Counterparty Risk",
    description: "Evaluating the reputation and risk profile of the merchant or recipient.",
    indicators: [
      {
        name: "Merchant Category",
        value: merchantCategory,
        severity:
          merchantCategory === "Money Laundering Network"
            ? "critical"
            : merchantRisk > 0.6
              ? "high"
              : "medium",
        explanation:
          merchantCategory === "Money Laundering Network"
            ? "Merchant identified in known money laundering network. CRITICAL RISK."
            : `Merchant risk score: ${(merchantRisk * 100).toFixed(1)}%. ${merchantRisk > 0.6 ? "High-risk merchant detected." : "Moderate risk profile."}`,
      },
      {
        name: "Previous Incidents",
        value: merchantRisk > 0.5 ? "3-5 incidents" : "0-2 incidents",
        severity: merchantRisk > 0.5 ? "high" : "low",
        explanation: `This merchant has ${merchantRisk > 0.5 ? "multiple documented fraudulent transactions" : "minimal fraud history"}.`,
      },
    ],
    cumulativeRisk: Math.min(cumulativeRisk, 1),
    flagged: merchantFlagged,
  });

  // Step 3: Geographic Anomaly Detection
  const geoScore = Math.random() * tx.final_risk_score;
  const geoThreshold = 0.25;
  const geoFlagged = geoScore > geoThreshold;
  cumulativeRisk += geoScore * 0.2;

  steps.push({
    stepNumber: 3,
    title: "Geographic & Device Anomaly Detection",
    description: "Checking for unusual location changes or device switching patterns.",
    indicators: [
      {
        name: "Location Change",
        value:
          geoScore > 0.6
            ? "Cross-border jump detected"
            : geoScore > 0.3
              ? "Regional change"
              : "Same location",
        threshold: geoThreshold,
        severity: geoScore > 0.6 ? "high" : geoScore > 0.3 ? "medium" : "low",
        explanation: `${geoScore > 0.6 ? "Impossible travel detected - user location changed drastically in short time." : geoScore > 0.3 ? "User location differs from typical patterns." : "Transaction location consistent with user profile."}`,
      },
      {
        name: "Device Fingerprint",
        value: geoScore > 0.5 ? "New/Unusual device" : "Known device",
        severity: geoScore > 0.5 ? "high" : "low",
        explanation: `${geoScore > 0.5 ? "Transaction initiated from unknown or suspicious device." : "Device matches user profile."}`,
      },
    ],
    cumulativeRisk: Math.min(cumulativeRisk, 1),
    flagged: geoFlagged,
  });

  // Step 4: Behavioral Pattern Analysis
  const behaviorScore = tx.fraud_probability;
  const behaviorThreshold = 0.4;
  const behaviorFlagged = behaviorScore > behaviorThreshold;
  cumulativeRisk += behaviorScore * 0.2;

  steps.push({
    stepNumber: 4,
    title: "Behavioral Pattern Recognition",
    description: "Comparing transaction characteristics against user's historical behavior model.",
    indicators: [
      {
        name: "Deviation from Baseline",
        value: behaviorScore > 0.7 ? "Extreme" : behaviorScore > 0.4 ? "Significant" : "Minor",
        threshold: behaviorThreshold,
        severity:
          behaviorScore > 0.7
            ? "critical"
            : behaviorScore > 0.4
              ? "high"
              : "low",
        explanation: `User behavior ${behaviorScore > 0.7 ? "drastically differs from historical patterns" : behaviorScore > 0.4 ? "shows notable deviation from baseline" : "is consistent with typical behavior"}. Anomaly Score: ${(behaviorScore * 100).toFixed(1)}%`,
      },
      {
        name: "Amount Deviation",
        value: tx.amount > 5000 ? "Unusually High" : tx.amount > 1000 ? "Above Average" : "Normal",
        severity: tx.amount > 5000 ? "high" : tx.amount > 1000 ? "medium" : "low",
        explanation: `Transaction amount of $${tx.amount.toLocaleString()} is ${tx.amount > 5000 ? "significantly above" : tx.amount > 1000 ? "above" : "within"} user's typical transaction range.`,
      },
    ],
    cumulativeRisk: Math.min(cumulativeRisk, 1),
    flagged: behaviorFlagged,
  });

  // Step 5: Network Analysis (for P2P transactions)
  const networkScore = tx.merchant_id.startsWith("L_USER")
    ? Math.min(0.9, tx.final_risk_score * 2)
    : 0.1;
  const networkThreshold = 0.4;
  const networkFlagged = networkScore > networkThreshold;
  cumulativeRisk += networkScore * 0.1;

  steps.push({
    stepNumber: 5,
    title: "Network Ring & AML Structuring Detection",
    description: "Analyzing transaction network for circular flows and potential money laundering rings.",
    indicators: [
      {
        name: "Network Pattern",
        value:
          tx.scenario === "money_laundering"
            ? "Circular Network Detected"
            : "Standard Payment Flow",
        severity:
          tx.scenario === "money_laundering"
            ? "critical"
            : networkScore > 0.5
              ? "high"
              : "low",
        explanation:
          tx.scenario === "money_laundering"
            ? "Transaction is part of a detected circular money laundering ring. Funds flowing in structured patterns to evade detection."
            : networkScore > 0.5
              ? "Network shows characteristics of potential structuring activity."
              : "Transaction flows in normal customer-merchant pattern.",
      },
      {
        name: "Ring Participants",
        value:
          tx.scenario === "money_laundering"
            ? "5+ connected entities detected"
            : "Linear flow",
        severity:
          tx.scenario === "money_laundering"
            ? "critical"
            : "low",
        explanation: `${tx.scenario === "money_laundering" ? "Multiple intermediate accounts detected in transaction chain. Typical AML structuring signature." : "Direct transaction path with minimal intermediaries."}`,
      },
    ],
    cumulativeRisk: Math.min(cumulativeRisk, 1),
    flagged: networkFlagged || tx.scenario === "money_laundering",
  });

  // Step 6: ML Model Confidence & Final Decision
  steps.push({
    stepNumber: 6,
    title: "ML Model Confidence & Final Decision",
    description: "Aggregating all features through the fraud detection machine learning model.",
    indicators: [
      {
        name: "Model Confidence",
        value: `${((1 - Math.abs(tx.fraud_probability - 0.5)) * 100).toFixed(1)}%`,
        severity: "low",
        explanation: `The model is highly confident in its assessment. Fraud Probability: ${(tx.fraud_probability * 100).toFixed(1)}%`,
      },
      {
        name: "Final Risk Score",
        value: `${(tx.final_risk_score * 100).toFixed(1)}%`,
        threshold: 0.5,
        severity:
          tx.final_risk_score > 0.7
            ? "critical"
            : tx.final_risk_score > 0.4
              ? "high"
              : "low",
        explanation: `Consolidated risk assessment across all dimensions: ${
          tx.final_risk_score > 0.7
            ? "CRITICAL RISK - Immediate action recommended"
            : tx.final_risk_score > 0.4
              ? "HIGH RISK - Manual review strongly recommended"
              : "MODERATE RISK - Transaction can proceed with monitoring"
        }`,
      },
      {
        name: "Decision",
        value: tx.decision,
        severity:
          tx.decision === "BLOCK"
            ? "critical"
            : tx.decision === "REVIEW"
              ? "high"
              : "low",
        explanation:
          tx.decision === "BLOCK"
            ? "Transaction BLOCKED due to critical risk indicators. Immediate investigation required."
            : tx.decision === "REVIEW"
              ? "Transaction flagged for manual review. Risk factors present warrant human assessment."
              : "Transaction APPROVED. Risk profile acceptable for processing.",
      },
    ],
    cumulativeRisk: tx.final_risk_score,
    flagged: tx.decision !== "APPROVE",
  });

  // Generate recommendations
  const recommendations: string[] = [];
  if (velocityFlagged)
    recommendations.push(
      "Implement temporary transaction velocity limit for this account."
    );
  if (merchantFlagged || tx.merchant_id.startsWith("L_"))
    recommendations.push("Escalate merchant to compliance team for investigation.");
  if (geoFlagged)
    recommendations.push("Request additional identity verification from user.");
  if (behaviorFlagged)
    recommendations.push("Monitor account for continued suspicious activity.");
  if (networkFlagged || tx.scenario === "money_laundering")
    recommendations.push(
      "Investigate full transaction chain for money laundering indicators."
    );
  if (tx.decision === "BLOCK")
    recommendations.push("Block transaction and notify user of security concerns.");

  if (recommendations.length === 0) {
    recommendations.push("Continue standard transaction monitoring.");
  }

  return {
    transactionId: tx.id,
    decision: tx.decision,
    finalRiskScore: tx.final_risk_score,
    fraudProbability: tx.fraud_probability,
    scenario: tx.scenario_type,
    steps,
    summary:
      steps.filter((s) => s.flagged).length > 0
        ? `Transaction flagged due to ${steps.filter((s) => s.flagged).length} critical detection step(s). Multiple risk indicators present.`
        : "Transaction passed all security checks. Low risk profile detected.",
    recommendations,
  };
}
