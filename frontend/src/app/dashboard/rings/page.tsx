"use client";

import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Network } from "lucide-react";
import FraudSimulation from "@/components/dashboard/rings/FraudSimulation";
import NetworkGraph from "@/components/dashboard/rings/NetworkGraph";
import LiveAlertPanel from "@/components/dashboard/rings/LiveAlertPanel";
import TransactionTable from "@/components/dashboard/rings/TransactionTable";
import SideDrillPanel from "@/components/dashboard/rings/SideDrillPanel";
import ForensicSimulatorPanel from "@/components/dashboard/rings/ForensicSimulatorPanel";
import { collection, limit, onSnapshot, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { mapFirestoreDocToRingsTransaction } from "@/lib/ringsMapper";
import { FirestoreFraudTransaction, RingsGraphNode, RingsTransaction } from "@/types/rings";
import { useAuth } from "@/context/AuthContext";

const DEFAULT_FRAUD_ORG_ID = "Fj3o8mxoqOcCNrOBcdTXmOmAtsi1";

function getTransactionTime(tx: RingsTransaction): number {
  if (!tx.checked_at) {
    return 0;
  }
  const parsed = Date.parse(tx.checked_at);
  return Number.isFinite(parsed) ? parsed : 0;
}

export default function GraphRingsPage() {
  const { user, loading } = useAuth();
  const [orgId] = useState<string>(
    process.env.NEXT_PUBLIC_FRAUD_ORG_ID || DEFAULT_FRAUD_ORG_ID
  );
  const [allTransactions, setAllTransactions] = useState<RingsTransaction[]>([]);
  const [pausedTransactions, setPausedTransactions] = useState<RingsTransaction[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [selectedNode, setSelectedNode] = useState<RingsGraphNode | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<RingsTransaction | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Subscribe to nested collection: fraud_detection/{orgId}/transactions
  useEffect(() => {
    if (!orgId) return;
    if (loading) return;
    if (!user) return;

    const txQuery = query(
      collection(db, "fraud_detection", orgId, "transactions"),
      limit(500)
    );

    const unsubscribe = onSnapshot(
      txQuery,
      (snapshot) => {
        const mapped = snapshot.docs
          .map((docSnap) => mapFirestoreDocToRingsTransaction(docSnap.id, docSnap.data() as FirestoreFraudTransaction))
          .sort((a, b) => getTransactionTime(a) - getTransactionTime(b));

        setFetchError(null);
        setAllTransactions(mapped);
        setPausedTransactions((prev) => {
          if (isStreaming || prev.length > 0) {
            return prev;
          }
          return mapped;
        });
      },
      (error) => {
        console.error("Failed to read rings transactions:", error);
        if (error.code === "permission-denied") {
          setFetchError(
            "Missing or insufficient permissions. Ensure firestore.rules allows authenticated read on fraud_detection/{orgId}/transactions and deploy updated rules."
          );
          return;
        }
        setFetchError(error.message);
      }
    );

    return () => unsubscribe();
  }, [orgId, isStreaming, loading, user]);

  const activeTransactions = isStreaming ? allTransactions : pausedTransactions;
  const displayError = !loading && !user ? "Please sign in to view Rings telemetry." : fetchError;

  const handleToggleStreaming = (nextValue: boolean) => {
    if (!nextValue) {
      setPausedTransactions(allTransactions);
    }
    setIsStreaming(nextValue);
  };

  const handleNodeSelect = (node: any) => {
    setSelectedNode(node);
    // Find the first transaction related to this node
    const relatedTx = activeTransactions.find(
      (tx) => tx.user_id === node.id || tx.merchant_id === node.id
    );
    if (relatedTx) {
      setSelectedTransaction(relatedTx);
    }
  };

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
        isStreaming={isStreaming}
        onToggleStreaming={handleToggleStreaming}
        transactions={activeTransactions}
        orgId={orgId}
      />

      {displayError && (
        <div className="mb-8 rounded-2xl border border-error/30 bg-error/10 px-4 py-3 text-xs text-error">
          Failed to fetch Firestore data for org {orgId}: {displayError}
        </div>
      )}

      <div className="flex flex-col space-y-24 w-full relative">
        {/* Top Section: Visualization & Alerts */}
        <div className="relative z-10 grid lg:grid-cols-4 gap-8 min-h-[700px] w-full">
          {/* Network Graph spans 3 cols */}
          <div className="lg:col-span-3 min-h-[600px] h-full relative">
             <NetworkGraph 
                transactions={activeTransactions} 
                onNodeSelect={handleNodeSelect}
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

      {/* Forensic Simulator Panel */}
      {selectedTransaction && (
        <ForensicSimulatorPanel
          transaction={selectedTransaction}
          onClose={() => setSelectedTransaction(null)}
        />
      )}
    </DashboardLayout>
  );
}
