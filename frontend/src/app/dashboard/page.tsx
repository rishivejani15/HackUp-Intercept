"use client";

import React, { useState, useMemo, useEffect } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import KPICard from "@/components/dashboard/KPICard";
import RiskHistogram from "@/components/dashboard/RiskHistogram";
import FeatureImportance from "@/components/dashboard/FeatureImportance";
import TransactionTable from "@/components/dashboard/TransactionTable";
import { useFraudDetection } from "@/hooks/useFraudDetection";
import { calculateKPIStats } from "@/services/fraudDetectionService";
import { 
  Users, 
  ShieldAlert, 
  Zap, 
  Target,
  ChevronRight,
  Shield,
  Key,
  Copy
} from "lucide-react";
import Link from "next/link";
import { generateSimulatorCode, LOCAL_SIM_CODE_CACHE } from "@/lib/simulatorCode";

export default function DashboardPage() {
  const [issuedKey, setIssuedKey] = useState("");
  const [keyMessage, setKeyMessage] = useState("");
  const [keyLoading, setKeyLoading] = useState(false);
  
  // Fetch fraud detection data from Firebase
  const { data: fraudData, loading: fraudLoading, error: fraudError } = useFraudDetection(200);

  const aggregatedFraudRows = useMemo(() => {
    const grouped = new Map<
      string,
      { scenario: string; count: number; flagged: number; riskTotal: number }
    >();

    for (const row of fraudData) {
      const scenario = row.scenario_type || "unknown";
      const bucket = grouped.get(scenario) || {
        scenario,
        count: 0,
        flagged: 0,
        riskTotal: 0,
      };

      bucket.count += 1;
      bucket.flagged += row.flagged ? 1 : 0;
      bucket.riskTotal += Number(row.risk_score || 0);
      grouped.set(scenario, bucket);
    }

    return [...grouped.values()]
      .map((item) => ({
        ...item,
        avgRisk: item.count > 0 ? (item.riskTotal / item.count) * 100 : 0,
      }))
      .sort((a, b) => b.avgRisk - a.avgRisk);
  }, [fraudData]);

  // Calculate KPI statistics from fraud data
  const kpiStats = useMemo(() => {
    if (fraudData.length > 0) {
      console.log('Dashboard: Processing', fraudData.length, 'fraud records');
    }
    return calculateKPIStats(fraudData);
  }, [fraudData]);
  
  // Show error if data fetch fails
  useEffect(() => {
    if (fraudError) {
      console.error('Dashboard: Fraud data error:', fraudError);
    }
  }, [fraudError]);

  const handleGetKey = async () => {
    if (keyLoading) return;

    setKeyLoading(true);
    setKeyMessage("");

    try {
      const localCode = generateSimulatorCode();
      setIssuedKey(localCode);
      window.localStorage.setItem(LOCAL_SIM_CODE_CACHE, localCode);
      setKeyMessage("Unique simulator code generated successfully.");
    } catch {
      setKeyMessage("Unable to generate code right now. Please retry.");
    } finally {
      setKeyLoading(false);
    }
  };

  const handleRegenerateKey = async () => {
    if (keyLoading) return;

    const confirmed = window.confirm(
      "Regenerate simulator code? Your previous code will be replaced."
    );
    if (!confirmed) return;

    setKeyLoading(true);
    setKeyMessage("");

    try {
      const localCode = generateSimulatorCode();
      setIssuedKey(localCode);
      window.localStorage.setItem(LOCAL_SIM_CODE_CACHE, localCode);
      setKeyMessage("Simulator code regenerated successfully.");
    } catch {
      setKeyMessage("Unable to regenerate code right now. Please retry.");
    } finally {
      setKeyLoading(false);
    }
  };

  const copyKey = async () => {
    if (!issuedKey) return;
    try {
      await navigator.clipboard.writeText(issuedKey);
      setKeyMessage("Key copied. Paste it in Test Simulator.");
    } catch {
      setKeyMessage("Copy failed. Please copy manually.");
    }
  };

  return (
    <DashboardLayout>
      {/* Hero Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div className="space-y-4">
          <div className="flex items-center space-x-3 text-secondary font-bold text-[10px] uppercase tracking-[0.3em]">
            <div className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-secondary shadow-[0_0_8px_rgba(78,222,163,0.8)]"></span>
            </div>
            <span>Surveillance Active</span>
          </div>
          <h1 className="text-5xl font-bold font-space tracking-tight text-foreground">
            COMMAND <span className="text-primary/60">CENTER</span>
          </h1>
          <p className="text-muted-foreground max-w-xl text-sm leading-relaxed font-medium">
            Projected risk vectors and behavioral anomalies detected within the last 24-hour cycle. 
            <span className="text-primary/80 ml-1">AI Engine: Aegis-v2.1 Stable.</span>
          </p>
        </div>

        <div className="flex items-center space-x-4">
           <div className="glass px-6 py-3 rounded-2xl border border-black/10 flex items-center space-x-4">
              <div className="flex flex-col">
                 <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Threat Level</span>
                 <span className="text-xs font-bold text-error uppercase glow-error">Elevated Risk</span>
              </div>
              <div className="h-8 w-[1px] bg-slate-200" />
              <Shield className="text-error animate-pulse" size={18} />
           </div>

           <button
             onClick={handleGetKey}
             disabled={keyLoading}
             className="h-12 px-6 rounded-2xl bg-primary text-primary-foreground text-[10px] font-bold font-space uppercase tracking-widest hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 flex items-center justify-center space-x-2 disabled:opacity-60"
           >
             <Key size={14} />
             <span>{keyLoading ? "Generating..." : "Get Code"}</span>
           </button>
        </div>
      </div>

      {(issuedKey || keyMessage) ? (
        <div className="glass-card rounded-2xl border border-black/10 p-5 mb-8 flex flex-col md:flex-row md:items-center gap-4 justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-bold font-space uppercase tracking-[0.2em] text-primary">Simulator Access Code</p>
            {issuedKey ? (
              <p className="text-xs font-mono font-bold text-foreground break-all">{issuedKey}</p>
            ) : (
              <p className="text-xs text-muted-foreground font-medium">Generate a code and paste it in the simulator page.</p>
            )}
            {keyMessage ? <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{keyMessage}</p> : null}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleRegenerateKey}
              disabled={keyLoading}
              className="h-10 px-4 rounded-xl border border-black/10 bg-slate-100 text-[10px] font-bold font-space uppercase tracking-widest flex items-center gap-2 disabled:opacity-60"
            >
              Regenerate Code
            </button>
            {issuedKey ? (
              <button
                onClick={copyKey}
                className="h-10 px-4 rounded-xl border border-black/10 bg-slate-100 text-[10px] font-bold font-space uppercase tracking-widest flex items-center gap-2"
              >
                <Copy size={12} />
                Copy Code
              </button>
            ) : null}
            <Link
              href="/test-simulator"
              className="h-10 px-4 rounded-xl border border-black/10 bg-slate-100 text-[10px] font-bold font-space uppercase tracking-widest flex items-center"
            >
              Open Test Simulator
            </Link>
          </div>
        </div>
      ) : null}

      {/* KPI Cards Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Total Entities"
          value={kpiStats.totalTransactions.toLocaleString()}
          icon={Users}
          trend="+12.5%"
          trendUp={true}
          color="primary"
        />
        <KPICard
          title="Flagged Entities"
          value={kpiStats.fraudDetected.toString()}
          icon={ShieldAlert}
          trend="+2.4%"
          trendUp={false}
          color="destructive"
        />
        <KPICard
          title="Avg Risk Score"
          value={`${kpiStats.avgProcessingTime}%`}
          icon={Zap}
          trend="+1.2%"
          trendUp={true}
          color="success"
        />
        <KPICard
          title="Detection Rate"
          value={`${kpiStats.detectionRate}%`}
          icon={Target}
          trend="+0.2%"
          trendUp={true}
          color="warning"
        />
      </div>

      {/* Analytics Matrix Section */}
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="glass-card rounded-[2rem] p-10 relative overflow-hidden group">
          <div className="flex items-center justify-between mb-8">
             <h2 className="text-xl font-bold font-space uppercase tracking-wider">Risk Distribution</h2>
             <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center text-muted-foreground">
                <ChevronRight size={16} />
             </div>
          </div>
          <RiskHistogram data={fraudData} loading={fraudLoading} />
        </div>
        
        <div className="glass-card rounded-[2rem] p-10 relative overflow-hidden group">
          <div className="flex items-center justify-between mb-8">
             <h2 className="text-xl font-bold font-space uppercase tracking-wider">Attack Vectors</h2>
             <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center text-muted-foreground">
                <ChevronRight size={16} />
             </div>
          </div>
          <FeatureImportance data={fraudData} loading={fraudLoading} />
        </div>
      </div>

      {/* Ledger Stream Section */}
      <div className="glass-card rounded-[2.5rem] p-10 min-h-[500px] relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6 relative z-10">
          <div>
            <div className="flex items-center space-x-2 mb-2">
               <div className="h-1.5 w-1.5 rounded-full bg-secondary shine" />
               <h2 className="text-2xl font-bold font-space uppercase tracking-tight">Live Ledger Stream</h2>
            </div>
            <p className="text-xs font-medium text-muted-foreground tracking-wide uppercase">Monitoring real-time behavioral streams across global endpoints.</p>
          </div>
          <div className="flex items-center space-x-3">
            <Link href="/dashboard/transactions" className="h-12 px-6 rounded-2xl glass border border-black/15 text-[10px] font-bold font-space uppercase tracking-widest hover:bg-slate-100 transition-all flex items-center justify-center">
              Full Spectrum Ledger
            </Link>
            <button className="h-12 px-6 rounded-2xl bg-primary text-primary-foreground text-[10px] font-bold font-space uppercase tracking-widest hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 flex items-center justify-center">
              Generate Audit
            </button>
          </div>
        </div>

        <div className="mb-8 overflow-x-auto rounded-2xl border border-black/10 bg-white/60">
          <table className="w-full min-w-[640px] text-left border-collapse">
            <thead>
              <tr className="border-b border-black/10 text-[10px] font-bold font-space uppercase tracking-widest text-muted-foreground">
                <th className="px-4 py-3">Scenario</th>
                <th className="px-4 py-3">Entities</th>
                <th className="px-4 py-3">Flagged</th>
                <th className="px-4 py-3">Avg Risk</th>
              </tr>
            </thead>
            <tbody>
              {aggregatedFraudRows.length === 0 ? (
                <tr>
                  <td className="px-4 py-4 text-xs text-muted-foreground" colSpan={4}>
                    {fraudLoading
                      ? "Loading fraud aggregates..."
                      : "No fraud records available yet."}
                  </td>
                </tr>
              ) : (
                aggregatedFraudRows.slice(0, 8).map((row) => (
                  <tr key={row.scenario} className="border-b border-black/5 text-xs">
                    <td className="px-4 py-3 font-semibold text-foreground">
                      {row.scenario.replaceAll("_", " ")}
                    </td>
                    <td className="px-4 py-3">{row.count}</td>
                    <td className="px-4 py-3">{row.flagged}</td>
                    <td className="px-4 py-3">{row.avgRisk.toFixed(1)}%</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        <TransactionTable />
      </div>
    </DashboardLayout>
  );
}
