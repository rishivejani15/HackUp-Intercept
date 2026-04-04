"use client";

import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface EntityProfile {
  entity_id: string;
  entity_type: "user" | "merchant";
  name: string;
  email?: string;
  phone?: string;
  ip_address?: string;
  geo_location?: string;
  device_fingerprint?: string;
  account_age_days?: number;
  cluster_id?: string;
  scenario_type: string;
  risk_score: number;
  flagged: boolean;
  flag_reasons: string[];
  linked_entities: string[];
  mcc_code?: string;
  registration_country?: string;
}

function parseFirestoreDoc(data: any): EntityProfile | null {
  if (!data) return null;
  return {
    entity_id: data.entity_id || "",
    entity_type: data.entity_type || "user",
    name: data.name || "Unknown",
    email: data.email,
    phone: data.phone,
    ip_address: data.ip_address,
    geo_location: data.geo_location,
    device_fingerprint: data.device_fingerprint,
    account_age_days: data.account_age_days,
    cluster_id: data.cluster_id,
    scenario_type: data.scenario_type || "unknown",
    risk_score: data.risk_score || 0,
    flagged: data.flagged || false,
    flag_reasons: data.flag_reasons || [],
    linked_entities: data.linked_entities || [],
    mcc_code: data.mcc_code,
    registration_country: data.registration_country,
  };
}

export function useEntityProfile(entityId: string | null) {
  const [profile, setProfile] = useState<EntityProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!entityId) {
      setProfile(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    const fetchProfile = async () => {
      try {
        const docRef = doc(db, "fraud_entities", entityId);
        const docSnap = await getDoc(docRef);

        if (!cancelled) {
          if (docSnap.exists()) {
            setProfile(parseFirestoreDoc(docSnap.data()));
          } else {
            setProfile(null);
            setError("Entity not found in database");
          }
          setLoading(false);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message || "Failed to fetch entity");
          setLoading(false);
        }
      }
    };

    fetchProfile();

    return () => {
      cancelled = true;
    };
  }, [entityId]);

  return { profile, loading, error };
}
