"use client";

import React from "react";
import { ShieldAlert, EyeOff, CreditCard, Zap, Target, Globe } from "lucide-react";
import { motion } from "framer-motion";

const FEATURES = [
  {
    title: "ThreatGuard X-Ray",
    description: "Multi-layered behavioral analysis engine that detects injection, phishing, and automated bot patterns in real-time.",
    icon: ShieldAlert,
    color: "text-error",
    bg: "bg-error/10"
  },
  {
    title: "Steganography Shield",
    description: "Industry-leading image-based data exfiltration detection. Unmask hidden payloads within financial documents.",
    icon: EyeOff,
    color: "text-secondary",
    bg: "bg-secondary/10"
  },
  {
    title: "Full Spectrum Ledger",
    description: "A centralized intelligence stream for all transactional behavior, enriched with AI risk scoring and geo-spatial data.",
    icon: CreditCard,
    color: "text-primary",
    bg: "bg-primary/10"
  },
  {
    title: "Neural Engine",
    description: "Proprietary architecture trained on 400M+ fraud vectors, providing 99.4% detection accuracy.",
    icon: Zap,
    color: "text-tertiary",
    bg: "bg-tertiary/10"
  },
  {
    title: "Geo-Spatial Mapping",
    description: "Detect anomalies by cross-referencing IP origin, session history, and physical device telemetry metadata.",
    icon: Globe,
    color: "text-primary",
    bg: "bg-primary/10"
  },
  {
    title: "Precision Targeting",
    description: "Minimize false positives with context-aware evaluation that learns your business's unique risk profile.",
    icon: Target,
    color: "text-secondary",
    bg: "bg-secondary/10"
  }
];

export default function LandingFeatures() {
  return (
    <section id="features" className="py-32 relative overflow-hidden">
      <div className="container mx-auto px-6">
        <div className="text-center mb-24">
          <div className="text-[10px] font-bold font-space uppercase tracking-[0.4em] text-primary mb-4">Core Capabilities</div>
          <h2 className="text-4xl md:text-5xl font-bold font-space tracking-tight text-foreground uppercase">
             ENGINEERED FOR <span className="text-primary/60">ADAPTIVE DEFENSE</span>
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              viewport={{ once: true }}
              className="glass-card p-10 rounded-[2.5rem] border border-white/5 hover:border-white/10 transition-all group relative overflow-hidden"
            >
              <div className={`h-16 w-16 rounded-2xl ${feature.bg} flex items-center justify-center ${feature.color} mb-8 group-hover:scale-110 transition-transform duration-500`}>
                <feature.icon size={28} />
              </div>
              <h3 className="text-2xl font-bold font-space text-foreground mb-4 tracking-tight group-hover:text-primary transition-colors">{feature.title}</h3>
              <p className="text-muted-foreground text-sm font-medium leading-relaxed">
                {feature.description}
              </p>
              
              <div className="absolute -bottom-1 -right-1 h-32 w-32 bg-primary/5 blur-[40px] opacity-0 group-hover:opacity-100 transition-opacity" />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
