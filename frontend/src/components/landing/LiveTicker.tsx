"use client";

import React from "react";
import { ShieldAlert, Zap, Globe, Cpu } from "lucide-react";

const TICKER_ITEMS = [
  { icon: ShieldAlert, text: "High-Velocity Transaction Blocked: $4,200.00 - NEW YORK, US", color: "text-error" },
  { icon: Zap, text: "Neural Protection Active: 98.4% Confidence Internal Transfer", color: "text-primary" },
  { icon: Globe, text: "Geo-Mismatch Detected: Session PARIS, FR vs IP TAIPEI, TW", color: "text-tertiary" },
  { icon: Cpu, text: "Neural Fingerprinting: Bot Pattern Recognized - 12.4ms Latency", color: "text-secondary" },
  { icon: ShieldAlert, text: "Steganographic Payload Isolated: Image X-Ray Alpha-7", color: "text-error" },
];

export default function LiveTicker() {
  return (
    <div className="bg-white/[0.02] border-y border-white/5 py-3 overflow-hidden select-none relative z-40">
      <div className="flex animate-marquee whitespace-nowrap">
        {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, idx) => (
          <div key={idx} className="flex items-center space-x-6 mx-12">
            <item.icon size={14} className={item.color} />
            <span className="text-[10px] font-mono font-bold uppercase tracking-[0.25em] text-muted-foreground/80">
              {item.text}
            </span>
            <span className="text-white/10 ml-6">•</span>
          </div>
        ))}
      </div>
    </div>
  );
}
