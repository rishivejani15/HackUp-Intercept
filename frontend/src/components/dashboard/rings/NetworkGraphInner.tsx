"use client";

import React, { useMemo, useEffect, useRef, useState } from "react";
import ForceGraph2D from "react-force-graph-2d";
import { FraudTransaction } from "@/data/fraudData";
import { Network } from "lucide-react";

interface NetworkGraphInnerProps {
  transactions: FraudTransaction[];
  onNodeSelect?: (node: any) => void;
  width?: number;
  height?: number;
  isStreaming?: boolean;
}

export default function NetworkGraphInner({ transactions, onNodeSelect, isStreaming = false }: NetworkGraphInnerProps) {
  const fgRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [animationTick, setAnimationTick] = useState(0);

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

  useEffect(() => {
    if (!isStreaming) {
      setAnimationTick(0);
      return;
    }

    const timer = window.setInterval(() => {
      setAnimationTick((value) => value + 1);
    }, 60);

    return () => window.clearInterval(timer);
  }, [isStreaming]);

  const graphData = useMemo(() => {
    const nodes = new Map<string, any>();
    const links: any[] = [];
    const merchantToUsers = new Map<string, Set<string>>();

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

      // Logic: If mId starts with 'L_USER', it's a P2P laundering node, not a static merchant
      const isP2P = mId.startsWith("L_USER");

      if (!nodes.has(mId)) {
        if (isP2P) {
           // Treat as a Risk Node (User)
           nodes.set(mId, { id: mId, group: "User", val: 3, color: riskColor });
        } else {
           // Treat as a System Hub (Merchant)
           nodes.set(mId, { id: mId, group: "Merchant", val: 6, color: merchantBaseColor });
        }
      }

      const uNode = nodes.get(uId);
      const mNode = nodes.get(mId);

      // Upgrade node color if they have a worse transaction status
      const upgradeColor = (node: any, newColor: string) => {
        if (newColor === "#ef4444") node.color = "#ef4444";
        else if (newColor === "#f59e0b" && node.color !== "#ef4444") node.color = "#f59e0b";
      };
      
      upgradeColor(uNode, riskColor);
      if (isP2P) upgradeColor(mNode, riskColor);
      
      // Merchants stay Indigo but grow in size; Users remain specialized
      if (!isP2P) mNode.val += 2;

      // Edge (User -> Merchant)
      links.push({
        source: uId,
        target: mId,
        amount: tx.amount,
        decision: tx.decision,
        scenario: tx.scenario_type,
        color: tx.scenario_type === "money_laundering" ? "rgba(168, 85, 247, 0.6)" : 
               decision === "BLOCK" ? "rgba(239, 68, 68, 0.4)" : 
               decision === "REVIEW" ? "rgba(245, 158, 11, 0.4)" : "rgba(16, 185, 129, 0.15)"
      });

      if (!merchantToUsers.has(mId)) {
        merchantToUsers.set(mId, new Set());
      }
      merchantToUsers.get(mId)?.add(uId);
    });

    if (isStreaming) {
      const merchantNodes = Array.from(nodes.values())
        .filter((node) => node.group === "Merchant")
        .sort((left, right) => {
          const valueDelta = (right.val || 0) - (left.val || 0);
          return valueDelta !== 0 ? valueDelta : String(left.id).localeCompare(String(right.id));
        });

      merchantNodes.forEach((node, index) => {
        const nextNode = merchantNodes[(index + 1) % merchantNodes.length];
        if (!nextNode || nextNode.id === node.id) return;

        links.push({
          source: node.id,
          target: nextNode.id,
          amount: 0,
          decision: "STREAM",
          scenario: "merchant_backbone",
          bridge: true,
          backbone: true,
          color: "rgba(99, 102, 241, 0.42)",
        });
      });

      merchantToUsers.forEach((userIds, merchantId) => {
        const orderedUsers = Array.from(userIds);
        if (orderedUsers.length < 2) return;

        orderedUsers.forEach((userId, index) => {
          const nextUserId = orderedUsers[(index + 1) % orderedUsers.length];
          if (!nextUserId || nextUserId === userId) return;

          links.push({
            source: userId,
            target: nextUserId,
            amount: 0,
            decision: "STREAM",
            scenario: "network_bridge",
            bridge: true,
            backbone: false,
            anchor: merchantId,
            color: "rgba(99, 102, 241, 0.35)",
          });
        });
      });
    }

    return {
      nodes: Array.from(nodes.values()),
      links
    };
  }, [transactions, isStreaming]);

  // Handle zoom and cash burst when data changes
  const prevLinksCount = useRef(0);
  useEffect(() => {
    if (fgRef.current) {
      fgRef.current.d3ReheatSimulation();
      
      // If new links appeared, emit a single burst particle for each NEW link
      const currentLinks = graphData.links;
      if (currentLinks.length > prevLinksCount.current) {
         const newLinks = currentLinks.slice(prevLinksCount.current);
         newLinks.forEach((link: any) => {
            fgRef.current.emitParticle(link);
         });
      }
      prevLinksCount.current = currentLinks.length;

      setTimeout(() => {
        fgRef.current.zoomToFit(600, 100); 
      }, 300); 
    }
  }, [graphData]);

  return (
    <div ref={containerRef} className="relative w-full h-full rounded-2xl overflow-hidden bg-white border border-slate-200 shadow-sm shadow-slate-200/60">
      {dimensions.width > 0 && dimensions.height > 0 && (
        <ForceGraph2D
          ref={fgRef}
          width={dimensions.width}
          height={dimensions.height}
        graphData={graphData}
        nodeColor={(node: any) => node.color}
        nodeRelSize={6}
        linkColor={(link: any) => link.color}
        linkWidth={(link: any) => link.backbone ? 3.2 : link.bridge ? 2.4 : link.scenario === "money_laundering" ? 2.5 : 1.5}
        
        // --- CASH FLOW (One-Time Burst Configuration) ---
        linkDirectionalParticleWidth={(link: any) => {
            if (link.backbone) return isStreaming ? 3.2 : 0;
            if (link.bridge) return isStreaming ? 2.4 : 0;
            const base = Math.min(Math.max(link.amount / 2000, 1.2), 4);
            return link.scenario === "money_laundering" ? base * 1.5 : base;
        }}
        linkDirectionalParticleSpeed={(link: any) => {
            if (link.backbone) return 0.09;
            if (link.bridge) return 0.07;
            return Math.min(Math.max(link.amount / 10000, 0.01), 0.08); // Snappy burst
        }}
        linkDirectionalParticleColor={(link: any) => {
            if (link.backbone) return "#c7d2fe";
            if (link.bridge) return "#93c5fd";
           if (link.scenario === "money_laundering") return "#a855f7"; // Royal Purple AML
           return link.decision === "BLOCK" ? "#ef4444" : 
                  link.decision === "REVIEW" ? "#f59e0b" : "#10b981";
        }}
          linkTitle={(link: any) => `${link.backbone ? "[MERCHANT BACKBONE]" : link.bridge ? "[NETWORK BRIDGE]" : link.scenario === "money_laundering" ? "[AML STRUCTURING]" : ""} Transaction: $${Number(link.amount || 0).toLocaleString()} [${link.decision}]`}
        
        backgroundColor="#ffffff"
        enableNodeDrag={true}
        enablePointerInteraction={true}
        
        // --- STABILITY & CONTAINMENT ---
        warmupTicks={150} 
        cooldownTicks={100}
        d3VelocityDecay={0.4} 
        d3AlphaDecay={0.02} 
        d3AlphaMin={0.01} 
        
        // --- FORCE FIELD TUNING & AML RING ALIGNMENT ---
        {...({
          d3Force: (force: any) => {
            force.get('charge').strength(-400); 
            force.get('link').distance((link: any) => link.scenario === "money_laundering" ? 60 : 100);
            
            // Special Force: Pull AML nodes into a central ring
            const mlNodes = graphData.nodes.filter(n => n.id.startsWith("L_USER"));
            if (mlNodes.length > 0) {
               // We apply a radial force just to the ML nodes
               // In react-force-graph, we can use a custom force that targets by ID
               const radialForce = (alpha: number) => {
                  const radius = 120;
                  mlNodes.forEach(node => {
                     const dx = node.x || 0;
                     const dy = node.y || 0;
                     const dist = Math.sqrt(dx * dx + dy * dy);
                     const strength = 0.8 * alpha;
                     if (dist > 0) {
                        node.vx += (dx / dist * radius - dx) * strength;
                        node.vy += (dy / dist * radius - dy) * strength;
                     }
                  });
               };
               force.force('ml-ring', radialForce);
            }
          }
        } as any)}
        
        onEngineStop={() => {
          fgRef.current.zoomToFit(800, 150);
        }}
        
        onNodeClick={(node: any) => {
          fgRef.current.centerAt(node.x, node.y, 1000);
          fgRef.current.zoom(8, 2000);
          if (onNodeSelect) onNodeSelect(node);
        }}
        nodeCanvasObjectMode={() => "after"}
        nodeCanvasObject={(node: any, ctx, globalScale) => {
          const label = node.id;
          const fontSize = 12 / globalScale;

          const radius = Math.max(node.group === "Merchant" ? 10 : 6, (node.val || 3) * 1.5) / globalScale;
          ctx.save();
          ctx.beginPath();
          ctx.arc(node.x, node.y, radius * (node.group === "Merchant" ? (isStreaming ? 2.25 : 1.85) : isStreaming ? 1.9 : 1.5), 0, Math.PI * 2);
          ctx.fillStyle = node.group === "Merchant" ? (isStreaming ? "rgba(99, 102, 241, 0.12)" : "rgba(99, 102, 241, 0.06)") : (isStreaming ? "rgba(99, 102, 241, 0.08)" : "rgba(15, 23, 42, 0.04)");
          ctx.shadowBlur = isStreaming ? (node.group === "Merchant" ? 28 : 24) / globalScale : 10 / globalScale;
          ctx.shadowColor = node.group === "Merchant" ? "#6366f1" : node.color || "rgba(99, 102, 241, 0.8)";
          ctx.fill();
          ctx.restore();

          if (node.group === "Merchant") {
            ctx.save();
            ctx.beginPath();
            ctx.arc(node.x, node.y, radius * (isStreaming ? 1.35 : 1.15), 0, Math.PI * 2);
            ctx.strokeStyle = isStreaming ? "rgba(255,255,255,0.25)" : "rgba(99,102,241,0.2)";
            ctx.lineWidth = Math.max(1, 2 / globalScale);
            ctx.shadowBlur = 18 / globalScale;
            ctx.shadowColor = "#6366f1";
            ctx.stroke();
            ctx.restore();
          }

          if (isStreaming) {
            const pulse = 1 + ((animationTick % 18) / 18) * 0.25;
            ctx.save();
            ctx.beginPath();
            ctx.arc(node.x, node.y, radius * pulse, 0, Math.PI * 2);
            ctx.strokeStyle = node.group === "Merchant" ? "rgba(255,255,255,0.5)" : `${node.color || "#6366f1"}55`;
            ctx.lineWidth = Math.max(1, (node.group === "Merchant" ? 2 : 1.5) / globalScale);
            ctx.shadowBlur = 16 / globalScale;
            ctx.shadowColor = node.group === "Merchant" ? "#6366f1" : node.color || "#6366f1";
            ctx.stroke();
            ctx.restore();
          }

          ctx.font = `${fontSize}px Inter, Sans-Serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = "rgba(15, 23, 42, 0.75)";
          ctx.fillText(label, node.x, node.y + 10);
        }}
        linkCanvasObject={(link: any, ctx, globalScale) => {
          const source = link.source;
          const target = link.target;
          if (!source || !target || typeof source === "string" || typeof target === "string") return;

          const sx = source.x;
          const sy = source.y;
          const tx = target.x;
          const ty = target.y;
          if (typeof sx !== "number" || typeof sy !== "number" || typeof tx !== "number" || typeof ty !== "number") return;

          const midX = (sx + tx) / 2;
          const midY = (sy + ty) / 2;
          const dx = tx - sx;
          const dy = ty - sy;
          const distance = Math.sqrt(dx * dx + dy * dy) || 1;
          const bend = link.backbone ? 0.28 : link.bridge ? 0.22 : 0.12;
          const offsetX = (-dy / distance) * distance * bend;
          const offsetY = (dx / distance) * distance * bend;

          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.quadraticCurveTo(midX + offsetX, midY + offsetY, tx, ty);
          ctx.strokeStyle = link.backbone
            ? "rgba(199, 210, 254, 0.28)"
            : link.bridge
              ? "rgba(147, 197, 253, 0.22)"
            : link.scenario === "money_laundering"
              ? "rgba(168, 85, 247, 0.20)"
              : link.decision === "BLOCK"
                ? "rgba(239, 68, 68, 0.18)"
                : link.decision === "REVIEW"
                  ? "rgba(245, 158, 11, 0.16)"
                  : "rgba(16, 185, 129, 0.10)";
          ctx.lineWidth = Math.max(1, (link.backbone ? 3.2 : link.bridge ? 2.4 : 1.4) / globalScale);
          ctx.shadowBlur = (isStreaming ? (link.backbone ? 22 : 16) : 6) / globalScale;
          ctx.shadowColor = link.backbone ? "#c7d2fe" : link.bridge ? "#93c5fd" : link.color || "rgba(99, 102, 241, 0.5)";
          ctx.setLineDash(isStreaming ? [10 / globalScale, 10 / globalScale] : []);
          ctx.lineDashOffset = isStreaming ? -(animationTick * (link.backbone ? 3.5 : 2.5)) : 0;
          ctx.stroke();

          if (isStreaming) {
            ctx.setLineDash([]);
            ctx.strokeStyle = link.backbone ? "rgba(255, 255, 255, 0.42)" : link.bridge ? "rgba(255, 255, 255, 0.36)" : "rgba(255, 255, 255, 0.2)";
            ctx.lineWidth = Math.max(1, (link.backbone ? 1.2 : 0.75) / globalScale);
            ctx.stroke();
          }

          ctx.restore();
        }}
      />
      )}
      
      {transactions.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-slate-500 font-space tracking-widest uppercase text-xs">Waiting for Telemetry...</span>
         </div>
      )}

      {/* Visual Legend */}
      <div className="absolute top-4 left-4 flex flex-col gap-2 p-3 bg-white/90 backdrop-blur-md rounded-xl border border-slate-200 pointer-events-none shadow-sm">
        <div className="flex items-center gap-2">
           <div className="h-2 w-2 rounded-full bg-[#ef4444]" />
          <span className="text-[9px] font-bold text-slate-700 uppercase tracking-tighter text-error">Anomaly Detected (Block)</span>
        </div>
        <div className="flex items-center gap-2">
           <div className="h-2 w-2 rounded-full bg-[#f59e0b]" />
          <span className="text-[9px] font-bold text-slate-700 uppercase tracking-tighter text-warning">Suspicious Pattern (Review)</span>
        </div>
        <div className="flex items-center gap-2">
           <div className="h-2 w-2 rounded-full bg-[#a855f7]" />
          <span className="text-[9px] font-bold text-slate-700 uppercase tracking-tighter text-[#a855f7]">AML Structuring (Structuring)</span>
        </div>
        <div className="flex items-center gap-2">
           <div className="h-2 w-2 rounded-full bg-[#10b981]" />
          <span className="text-[9px] font-bold text-slate-700 uppercase tracking-tighter text-secondary">Verified Safe (Approve)</span>
        </div>
        <div className="flex items-center gap-2 mt-1 pt-1 border-t border-white/5">
           <div className="h-2 w-2 rounded-full bg-[#6366f1]" />
          <span className="text-[9px] font-bold text-slate-700 uppercase tracking-tighter">System Merchant (Target)</span>
        </div>
      </div>
    </div>
  );
}
