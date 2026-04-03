"use client";

import React, { useState } from "react";
import { fraudData, FraudTransaction } from "@/data/fraudData";
import { Play, ShieldAlert, Crosshair, Network } from "lucide-react";
import { cn } from "@/lib/utils";

interface FraudSimulationProps {
  onSimulate: (scenario: string, transactions: FraudTransaction[]) => void;
  activeScenario: string | null;
}

export default function FraudSimulation({ onSimulate, activeScenario }: FraudSimulationProps) {
  
  const handleSimulate = (scenario: string) => {
    // If selecting same scenario, act as clear/reset
    if (activeScenario === scenario) {
       onSimulate("", []);
       return;
    }
    
    // Base normal transactions
    const baseTXs = fraudData.filter(t => t.scenario_type === "normal");
    
    // Active attack transactions
    const attackTXs = fraudData.filter(t => t.scenario_type === scenario);
    
    onSimulate(scenario, [...baseTXs, ...attackTXs]);
  };

  const scenarios = [
    { id: "ato_attack", label: "ATO Attack", icon: Crosshair, color: "text-error" },
    { id: "fraud_ring", label: "Fraud Ring", icon: Network, color: "text-secondary" },
    { id: "coordinated_attack", label: "Coordinated Attack", icon: ShieldAlert, color: "text-warning" }
  ];

  return (
    <div className="glass-card rounded-[2rem] p-6 border border-white/5 mb-8">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
         <div>
            <h2 className="text-xl font-bold font-space uppercase tracking-tight text-foreground flex items-center gap-2">
               <Play size={18} className="text-secondary" />
               Live Simulation Deck
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
               Inject active adversary telemetry into the live graph.
            </p>
         </div>

         <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {scenarios.map(s => {
               const isActive = activeScenario === s.id;
               return (
                 <button 
                   key={s.id}
                   onClick={() => handleSimulate(s.id)}
                   className={cn(
                     "flex items-center gap-2 px-5 py-3 rounded-xl border border-white/5 text-xs font-bold font-space uppercase tracking-widest transition-all",
                     isActive 
                        ? `bg-white/10 border-white/20 shadow-[0_0_15px_rgba(255,255,255,0.1)]` 
                        : "bg-white/[0.02] hover:bg-white/[0.06] text-muted-foreground hover:text-foreground"
                   )}
                 >
                    <s.icon size={14} className={isActive ? s.color : "opacity-50"} />
                    <span className={isActive ? "text-foreground" : ""}>{s.label}</span>
                 </button>
               )
            })}
         </div>
      </div>
    </div>
  );
}
