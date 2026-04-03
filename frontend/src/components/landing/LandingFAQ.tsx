"use client";

import React from "react";
import { Plus } from "lucide-react";

const FAQS = [
  {
    q: "How does InterceptAI integrate with existing platforms?",
    a: "InterceptAI provides high-performance SDKs and REST APIs that can be integrated into your existing financial pipeline in less than 30 minutes."
  },
  {
    q: "What makes the InterceptAI engine superior?",
    a: "Unlike traditional rule-based systems, our engine uses self-learning neural networks that adapt to new fraud patterns in milliseconds, not days."
  },
  {
    q: "Is my data secure and compliant?",
    a: "Yes. InterceptAI is built on a zero-knowledge architecture. All sensitive metadata is encrypted at the edge and exceeds SOC2 and GDPR requirements."
  }
];

export default function LandingFAQ() {
  return (
    <section id="faq" className="py-32 bg-white/[0.01]">
      <div className="container mx-auto px-6 max-w-4xl">
        <div className="text-center mb-16">
          <div className="text-[10px] font-bold font-space uppercase tracking-[0.4em] text-primary mb-4">Support Intelligence</div>
          <h2 className="text-3xl font-bold font-space uppercase tracking-tight">Intelligence briefing</h2>
        </div>
        
        <div className="space-y-4">
          {FAQS.map((faq, idx) => (
            <div key={idx} className="glass p-8 rounded-3xl border border-white/5 group hover:border-white/10 transition-all cursor-pointer">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold font-space uppercase tracking-tight">{faq.q}</h3>
                <Plus className="text-primary group-hover:rotate-45 transition-transform duration-300" />
              </div>
              <p className="mt-6 text-muted-foreground text-sm font-medium leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                {faq.a}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
