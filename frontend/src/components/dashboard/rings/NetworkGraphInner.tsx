"use client";

import React, { useMemo, useEffect, useRef, useState } from "react";
import ForceGraph2D from "react-force-graph-2d";
import { FraudTransaction } from "@/data/fraudData";
import { Network } from "lucide-react";

interface NetworkGraphInnerProps {
  transactions: FraudTransaction[];
  width?: number;
  height?: number;
}

export default function NetworkGraphInner({ transactions }: NetworkGraphInnerProps) {
  const fgRef = useRef<any>();
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
         setDimensions({
            width: entry.contentRect.width,
            height: entry.contentRect.height
         });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const graphData = useMemo(() => {
    const nodes = new Map<string, any>();
    const links: any[] = [];

    transactions.forEach((tx) => {
      const mId = tx.merchant_id;
      const uId = tx.user_id;
      const decision = tx.decision;

      // Risk colors for interactive elements (Users & Links)
      const riskColor = 
        decision === "BLOCK" ? "#ef4444" : 
        decision === "REVIEW" ? "#f59e0b" : "#10b981";

      // Merchant is a fixed "Target" color to avoid the Green-to-Green issue
      const merchantBaseColor = "#6366f1"; // Indigo hub

      // Initialize nodes
      if (!nodes.has(uId)) {
        nodes.set(uId, { id: uId, group: "User", val: 3, color: riskColor });
      }
      if (!nodes.has(mId)) {
        nodes.set(mId, { id: mId, group: "Merchant", val: 6, color: merchantBaseColor });
      }

      const uNode = nodes.get(uId);
      const mNode = nodes.get(mId);

      // Upgrade user color if they have a worse transaction in this set
      const upgradeColor = (node: any, newColor: string) => {
        if (newColor === "#ef4444") node.color = "#ef4444";
        else if (newColor === "#f59e0b" && node.color !== "#ef4444") node.color = "#f59e0b";
      };
      
      upgradeColor(uNode, riskColor);
      
      // Merchants stay Indigo but grow in size
      mNode.val += 2;

      // Edge
      links.push({
        source: uId,
        target: mId,
        color: decision === "BLOCK" ? "rgba(239, 68, 68, 0.5)" : 
               decision === "REVIEW" ? "rgba(245, 158, 11, 0.5)" : "rgba(16, 185, 129, 0.2)"
      });
    });

    return {
      nodes: Array.from(nodes.values()),
      links
    };
  }, [transactions]);

  // Handle zoom to fit when data changes
  useEffect(() => {
    if (fgRef.current) {
      // Reset simulation alpha to re-run layout smoothly
      fgRef.current.d3ReheatSimulation();
      
      setTimeout(() => {
        fgRef.current.zoomToFit(600, 100); // Increased padding and duration for smoother 'in' animation
      }, 300); 
    }
  }, [graphData]);

  return (
    <div ref={containerRef} className="relative w-full h-full rounded-2xl overflow-hidden bg-[#0A0D11] border border-white/5 shadow-inner">
      {dimensions.width > 0 && dimensions.height > 0 && (
        <ForceGraph2D
          ref={fgRef}
          width={dimensions.width}
          height={dimensions.height}
        graphData={graphData}
        nodeColor={(node: any) => node.color}
        nodeRelSize={6}
        linkColor={(link: any) => link.color}
        linkWidth={1.5}
        backgroundColor="#0A0D11"
        enableNodeDrag={true}
        enableNodeDrag={true}
        
        // --- STABILITY & CONTAINMENT ---
        warmupTicks={150} // More ticks for extra pre-settling
        cooldownTicks={100}
        d3VelocityDecay={0.6} // Even more friction for a 'heavy' stable feel
        d3AlphaDecay={0.03} // Slows down energy loss for smoother settling
        d3AlphaMin={0.01} // Stops early when stable
        
        onEngineStop={() => {
          // Final adjustment to ensure centering
          fgRef.current.zoomToFit(800, 150);
        }}
        
        onNodeClick={(node: any) => {
          fgRef.current.centerAt(node.x, node.y, 1000);
          fgRef.current.zoom(8, 2000);
        }}
        nodeCanvasObjectMode={() => "after"}
        nodeCanvasObject={(node: any, ctx, globalScale) => {
          const label = node.id;
          const fontSize = 12 / globalScale;
          ctx.font = `${fontSize}px Inter, Sans-Serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
          ctx.fillText(label, node.x, node.y + 10);
        }}
      />
      )}
      
      {transactions.length === 0 && (
         <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-muted-foreground/50 font-space tracking-widest uppercase text-xs">Waiting for Telemetry...</span>
         </div>
      )}

      {/* Visual Legend */}
      <div className="absolute top-4 left-4 flex flex-col gap-2 p-3 bg-black/40 backdrop-blur-md rounded-xl border border-white/5 pointer-events-none">
        <div className="flex items-center gap-2">
           <div className="h-2 w-2 rounded-full bg-[#ef4444]" />
           <span className="text-[9px] font-bold text-white/70 uppercase tracking-tighter text-error">Anomaly Detected (Block)</span>
        </div>
        <div className="flex items-center gap-2">
           <div className="h-2 w-2 rounded-full bg-[#f59e0b]" />
           <span className="text-[9px] font-bold text-white/70 uppercase tracking-tighter text-warning">Suspicious Pattern (Review)</span>
        </div>
        <div className="flex items-center gap-2">
           <div className="h-2 w-2 rounded-full bg-[#10b981]" />
           <span className="text-[9px] font-bold text-white/70 uppercase tracking-tighter text-secondary">Verified Safe (Approve)</span>
        </div>
        <div className="flex items-center gap-2 mt-1 pt-1 border-t border-white/5">
           <div className="h-2 w-2 rounded-full bg-[#6366f1]" />
           <span className="text-[9px] font-bold text-white/70 uppercase tracking-tighter">System Merchant (Target)</span>
        </div>
      </div>
    </div>
  );
}
