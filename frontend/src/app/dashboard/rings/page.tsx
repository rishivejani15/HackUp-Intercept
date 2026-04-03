"use client";

import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { fraudData, FraudTransaction } from "@/data/fraudData";
import { Network } from "lucide-react";
import FraudSimulation from "@/components/dashboard/rings/FraudSimulation";
import NetworkGraph from "@/components/dashboard/rings/NetworkGraph";
import LiveAlertPanel from "@/components/dashboard/rings/LiveAlertPanel";
import TransactionTable from "@/components/dashboard/rings/TransactionTable";
import SideDrillPanel from "@/components/dashboard/rings/SideDrillPanel";

export default function GraphRingsPage() {
  const [activeScenario, setActiveScenario] = useState<string | null>(null);
  const [activeTransactions, setActiveTransactions] = useState<FraudTransaction[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [fullScenarioTXs, setFullScenarioTXs] = useState<FraudTransaction[]>([]);
  const [streamIndex, setStreamIndex] = useState(0);
  const [selectedNode, setSelectedNode] = useState<any>(null);

  // Load normal baseline initially
  useEffect(() => {
    setActiveTransactions(fraudData.filter(t => t.scenario_type === "normal"));
    setIsStreaming(false);
  }, []);

  const handleSimulate = (scenario: string, transactions: FraudTransaction[]) => {
    setActiveScenario(scenario === "" ? null : scenario);
    
    // Reset to normal baseline before starting attack stream
    const normalBase = fraudData.filter(t => t.scenario_type === "normal");
    setActiveTransactions(normalBase);
    setStreamIndex(0);

    if (scenario !== "") {
       // Filter out just the attack-specific ones to stream
       const attackOnly = transactions.filter(t => t.scenario_type === scenario);
       setFullScenarioTXs(attackOnly);
       setIsStreaming(true); 
    } else {
       setFullScenarioTXs([]);
       setIsStreaming(false);
    }
  };

  // Streaming Engine
  useEffect(() => {
    if (!isStreaming || fullScenarioTXs.length === 0) return;

    if (streamIndex >= fullScenarioTXs.length) {
       setIsStreaming(false);
       return;
    }

    const interval = setInterval(() => {
       const nextTx = fullScenarioTXs[streamIndex];
       setActiveTransactions(prev => [...prev, nextTx]);
       setStreamIndex(prev => prev + 1);
    }, 1200); // 1.2s for a slightly faster, snappy forensic flow

    return () => clearInterval(interval);
  }, [isStreaming, fullScenarioTXs, streamIndex]);

  return (
    <DashboardLayout>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div className="space-y-4">
          <div className="flex items-center space-x-3 text-primary font-bold text-[10px] uppercase tracking-[0.3em]">
             <Network size={14} />
             <span>Graph Topology Analysis</span>
          </div>
          <h1 className="text-5xl font-bold font-space tracking-tight text-foreground uppercase">
            GRAPH <span className="text-primary/60">RINGS</span>
          </h1>
          <p className="text-muted-foreground max-w-xl text-sm leading-relaxed font-medium">
             Detect organized fraud rings and ATO coordination through real-time relationship linkage.
          </p>
        </div>
      </div>

      <FraudSimulation 
        onSimulate={handleSimulate} 
        activeScenario={activeScenario} 
        isStreaming={isStreaming}
        onToggleStreaming={setIsStreaming}
        transactions={activeTransactions}
      />

      <div className="flex flex-col space-y-24 w-full relative">
        {/* Top Section: Visualization & Alerts */}
        <div className="relative z-10 grid lg:grid-cols-4 gap-8 min-h-[700px] w-full">
          {/* Network Graph spans 3 cols */}
          <div className="lg:col-span-3 min-h-[600px] h-full relative">
             <NetworkGraph 
                transactions={activeTransactions} 
                onNodeSelect={(node) => setSelectedNode(node)}
             />
          </div>
          
          {/* Alert Panel spans 1 col */}
          <div className="lg:col-span-1 min-h-[600px] h-full">
             <LiveAlertPanel transactions={activeTransactions} />
          </div>
        </div>

        {/* Bottom Section: Raw Telemetry Table */}
        <div className="relative z-20 w-full pt-12">
          <TransactionTable transactions={activeTransactions} />
        </div>
      </div>

      {/* Forensics Side Panel */}
      <SideDrillPanel 
        node={selectedNode} 
        transactions={activeTransactions} 
        onClose={() => setSelectedNode(null)} 
      />
    </DashboardLayout>
  );
}
