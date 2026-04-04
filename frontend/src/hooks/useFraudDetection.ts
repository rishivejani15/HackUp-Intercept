import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  onSnapshot, 
  limit,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { fraudData as seededFraudData } from '@/data/fraudData';

export interface FraudDetectionRecord {
  id?: string;
  entity_id: string;
  name?: string;
  email?: string;
  risk_score: number;
  scenario_type: string;
  flagged: boolean;
  flag_reasons?: string[];
  linked_entities?: string[];
  account_age_days?: number;
  cluster_id?: string;
  device_fingerprint?: string;
  geo_location?: string;
  ip_address?: string;
  // Legacy fields for compatibility
  transaction_id?: string;
  amount?: number;
  classification?: string;
  fraud_probability?: number;
  fraud_type?: string;
  decision?: string;
  merchant?: string;
  time?: string;
  explainability?: {
    base_value?: number;
    category_scores?: {
      account_takeover?: number;
      card_testing?: number;
      geo_anomaly?: number;
      merchant_risk?: number;
      synthetic_identity?: number;
    };
    explanation_summary?: string;
    top_negative_signals?: Array<{
      feature: string;
      label: string;
      shap_value: number;
      direction: string;
    }>;
    top_positive_signals?: Array<{
      feature: string;
      label: string;
      shap_value: number;
      direction: string;
    }>;
  };
  features?: Record<string, any>;
}

export function useFraudDetection(limitCount: number = 100) {
  const [data, setData] = useState<FraudDetectionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const normalizeRisk = (value: unknown): number => {
      const parsed = Number(value ?? 0);
      if (!Number.isFinite(parsed) || parsed <= 0) return 0;
      // Accept both 0-1 and 0-100 source scales.
      if (parsed <= 1) return parsed;
      return Math.min(parsed / 100, 1);
    };

    const toRecord = (id: string, raw: any): FraudDetectionRecord => {
      const scenarioType =
        raw.scenario_type || raw.classification || raw.fraud_type || 'unknown';
      const decision = String(raw.decision || raw.status || '').toUpperCase().trim();
      const riskScore = normalizeRisk(
        raw.risk_score ?? raw.final_risk_score ?? raw.fraud_probability
      );
      const probability = normalizeRisk(raw.fraud_probability ?? raw.final_risk_score ?? riskScore);

      const flaggedByState =
        decision === 'BLOCK' ||
        decision === 'REVIEW' ||
        decision === 'FRAUD' ||
        decision === 'SUSPICIOUS' ||
        decision === 'HIGH_RISK';

      const flaggedByText = ['fraud', 'suspicious', 'block', 'review', 'high_risk'].some((token) =>
        String(raw.fraud ?? raw.status ?? raw.classification ?? '').toLowerCase().includes(token)
      );

      return {
        id,
        entity_id: String(raw.entity_id || raw.user_id || raw.transaction_id || id),
        transaction_id: raw.transaction_id || id,
        risk_score: riskScore,
        scenario_type: String(scenarioType),
        flagged:
          raw.flagged === true ||
          flaggedByState ||
          flaggedByText ||
          riskScore >= 0.6 ||
          probability >= 0.6,
        amount: Number(raw.amount || 0),
        decision: raw.decision || raw.status || 'APPROVE',
        merchant: raw.merchant || raw.merchant_id,
        time: raw.time || raw.timestamp || raw.created_at,
        fraud_probability: probability,
        fraud_type: raw.fraud_type,
        user_id: raw.user_id,
      };
    };

    const useLocalFallback = () => {
      const records = seededFraudData.slice(0, limitCount).map((item, idx) => ({
        id: `${item.transaction_id}-${idx}`,
        entity_id: item.user_id,
        transaction_id: item.transaction_id,
        risk_score: Number(item.final_risk_score || item.fraud_probability || 0),
        scenario_type: item.scenario_type || 'unknown',
        flagged: item.decision === 'BLOCK' || item.decision === 'REVIEW',
        amount: item.amount,
        decision: item.decision,
        merchant: item.merchant_id,
        time: undefined,
        fraud_probability: item.fraud_probability,
        user_id: item.user_id,
      } as FraudDetectionRecord));

      records.sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0));
      setData(records);
      setError(null);
      setLoading(false);
    };

    const setupListener = async () => {
      try {
        // `transactions` is readable for authenticated users per firestore.rules.
        const fraudRef = collection(db, 'transactions');
        const q = query(fraudRef, limit(limitCount));

        unsubscribe = onSnapshot(
          q,
          (snapshot) => {
            const items: FraudDetectionRecord[] = [];
            snapshot.forEach((doc) => {
              items.push(toRecord(doc.id, doc.data()));
            });
            
            // Sort by risk_score descending
            items.sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0));
            
            setData(items);
            setError(null);
            setLoading(false);
          },
          (err) => {
            if (err?.code === 'permission-denied') {
              // Avoid surfacing a blocking error in UI; keep dashboard usable.
              useLocalFallback();
              return;
            }
            console.error('Error fetching transactions:', err);
            setError(err);
            setLoading(false);
          }
        );
      } catch (err: any) {
        console.error('Error setting up fraud listener:', err);
        useLocalFallback();
      }
    };

    setupListener();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [limitCount]);

  return { data, loading, error };
}
