import { FraudDetectionRecord } from '@/hooks/useFraudDetection';

export interface RiskDistributionData {
  range: string;
  count: number;
  color: string;
}

export interface CategoryScorePoint {
  name: string;
  value: number;
  color: string;
}

function toRiskPercent(value: unknown): number {
  const parsed = Number(value ?? 0);
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  return parsed <= 1 ? parsed * 100 : Math.min(parsed, 100);
}

function isRecordFlagged(record: FraudDetectionRecord): boolean {
  if (record.flagged === true) return true;
  const decision = String(record.decision || '').toUpperCase().trim();
  if (decision === 'BLOCK' || decision === 'REVIEW' || decision === 'FRAUD' || decision === 'SUSPICIOUS') {
    return true;
  }
  return toRiskPercent(record.risk_score) >= 60;
}

/**
 * Calculate risk distribution from fraud detection records
 */
export function calculateRiskDistribution(records: FraudDetectionRecord[]): RiskDistributionData[] {
  const ranges: RiskDistributionData[] = [
    { range: "0-20", count: 0, color: "#10b981" },
    { range: "20-40", count: 0, color: "#3b82f6" },
    { range: "40-60", count: 0, color: "#f59e0b" },
    { range: "60-80", count: 0, color: "#ef4444" },
    { range: "80-100", count: 0, color: "#991b1b" },
  ];

  records.forEach((record) => {
    const riskScore = toRiskPercent(record.risk_score);
    if (riskScore < 20) ranges[0].count++;
    else if (riskScore < 40) ranges[1].count++;
    else if (riskScore < 60) ranges[2].count++;
    else if (riskScore < 80) ranges[3].count++;
    else ranges[4].count++;
  });

  console.log('Risk Distribution:', ranges);
  return ranges;
}

/**
 * Extract category scores or scenario types from fraud detection records
 */
export function getCategoryScores(records: FraudDetectionRecord[]): CategoryScorePoint[] {
  if (!records || records.length === 0) {
    return [
      { name: "Money Laundering", value: 0, color: "#3b82f6" },
      { name: "AML Ring", value: 0, color: "#10b981" },
      { name: "Account Takeover", value: 0, color: "#f59e0b" },
      { name: "Circular Fraud", value: 0, color: "#8b5cf6" },
      { name: "Structuring", value: 0, color: "#ef4444" },
    ];
  }

  // Try to use category_scores from explainability first
  const latestWithScores = records.find(r => r.explainability?.category_scores);
  
  if (latestWithScores && latestWithScores.explainability?.category_scores) {
    const scores = latestWithScores.explainability.category_scores;
    return [
      { name: "Account Takeover", value: scores.account_takeover || 0, color: "#3b82f6" },
      { name: "Geo Anomaly", value: scores.geo_anomaly || 0, color: "#10b981" },
      { name: "Merchant Risk", value: scores.merchant_risk || 0, color: "#f59e0b" },
      { name: "Card Testing", value: scores.card_testing || 0, color: "#8b5cf6" },
      { name: "Synthetic ID", value: scores.synthetic_identity || 0, color: "#ef4444" },
    ].sort((a, b) => b.value - a.value);
  }

  // Fall back to scenario type distribution
  const scenarioCount: Record<string, number> = {};
  const scenarioMaxRisk: Record<string, number> = {};
  const scenarioColors: Record<string, string> = {
    'money_laundering': '#3b82f6',
    'aml_ring': '#10b981',
    'account_takeover': '#f59e0b',
    'circular_fraud': '#8b5cf6',
    'structuring': '#ef4444',
    'friendly_fraud': '#a78bfa',
    'synthetic_identity': '#06b6d4',
  };

  records.forEach((record) => {
    const scenario = record.scenario_type || 'unknown';
    scenarioCount[scenario] = (scenarioCount[scenario] || 0) + 1;
    scenarioMaxRisk[scenario] = Math.max(scenarioMaxRisk[scenario] || 0, record.risk_score || 0);
  });

  const scenarios = Object.entries(scenarioCount)
    .map(([name, count]) => ({
      name: name.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
      value: scenarioMaxRisk[name] || 0,
      color: scenarioColors[name] || '#6b7280',
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  console.log('Scenario distribution:', scenarios);

  return scenarios.length > 0 ? scenarios : [
    { name: "Money Laundering", value: 0, color: "#3b82f6" },
    { name: "AML Ring", value: 0, color: "#10b981" },
    { name: "Account Takeover", value: 0, color: "#f59e0b" },
    { name: "Circular Fraud", value: 0, color: "#8b5cf6" },
    { name: "Structuring", value: 0, color: "#ef4444" },
  ];
}

/**
 * Calculate KPI statistics from fraud records
 */
export function calculateKPIStats(records: FraudDetectionRecord[]) {
  if (!records || records.length === 0) {
    return {
      totalTransactions: 0,
      fraudDetected: 0,
      avgProcessingTime: "24.8",
      detectionRate: "0",
    };
  }

  const totalTransactions = records.length;
  
  // Count flagged entities as fraud detected
  const fraudDetected = records.filter(isRecordFlagged).length;
  
  // Keep average risk in 0-100 regardless of source scale.
  const avgRiskScore = records.length > 0
    ? (records.reduce((sum, r) => sum + toRiskPercent(r.risk_score), 0) / records.length).toFixed(1)
    : "0";
  
  // Detection rate as percentage of flagged
  const detectionRate = totalTransactions > 0 
    ? ((fraudDetected / totalTransactions) * 100).toFixed(1)
    : "0";
  
  console.log('KPI Stats:', {
    totalTransactions,
    fraudDetected,
    avgRiskScore,
    detectionRate,
  });
  
  return {
    totalTransactions,
    fraudDetected,
    avgProcessingTime: avgRiskScore,
    detectionRate,
  };
}
