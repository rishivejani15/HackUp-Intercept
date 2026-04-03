"use client";

import React, { useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import KPICard from "@/components/dashboard/KPICard";
import RiskHistogram from "@/components/dashboard/RiskHistogram";
import FeatureImportance from "@/components/dashboard/FeatureImportance";
import TransactionTable from "@/components/dashboard/TransactionTable";
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
          title="Total Transactions"
          value="152,342"
          icon={Users}
          trend="+12.5%"
          trendUp={true}
          color="primary"
        />
        <KPICard
          title="Fraud Detected"
          value="48"
          icon={ShieldAlert}
          trend="+2.4%"
          trendUp={false}
          color="destructive"
        />
        <KPICard
          title="Processing Time"
          value="24.8ms"
          icon={Zap}
          trend="-2.1ms"
          trendUp={true}
          color="success"
        />
        <KPICard
          title="Detection Radius"
          value="99.4%"
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
          <RiskHistogram />
        </div>
        
        <div className="glass-card rounded-[2rem] p-10 relative overflow-hidden group">
          <div className="flex items-center justify-between mb-8">
             <h2 className="text-xl font-bold font-space uppercase tracking-wider">Influence Vectors</h2>
             <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center text-muted-foreground">
                <ChevronRight size={16} />
             </div>
          </div>
          <FeatureImportance />
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
        
        <TransactionTable />
      </div>
    </DashboardLayout>
  );
}
