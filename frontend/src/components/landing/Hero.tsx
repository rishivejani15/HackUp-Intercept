"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronRight, Play, ShieldCheck } from "lucide-react";

export default function Hero() {
  return (
    <section className="relative min-h-[80vh] flex items-center justify-center overflow-hidden pt-16 pb-20">
      {/* Background Gradients */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/5 rounded-full blur-[120px] animate-pulse delay-700" />
      </div>

      <div className="container mx-auto px-6 relative z-10 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="space-y-6"
        >
          <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full glass border border-white/5 text-[10px] font-bold font-space uppercase tracking-[0.3em] text-primary">
            <ShieldCheck size={14} />
            <span>Neural Defense Active</span>
          </div>

          <h1 className="text-5xl md:text-8xl font-bold font-space tracking-tighter leading-[0.9] text-foreground">
            AUTONOMOUS PROTECTION<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-secondary to-primary bg-[length:200%_auto] animate-gradient pb-2 inline-block">
              AGAINST FRAUD
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-lg text-muted-foreground font-medium leading-relaxed">
            InterceptAI deploys advanced behavioral synthesis and autonomous neural fingerprinting to neutralize financial threats before they materialize.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
            <Link 
              href="/signup" 
              className="h-16 px-10 rounded-2xl bg-primary text-primary-foreground text-[10px] font-bold font-space uppercase tracking-[0.3em] hover:bg-primary/90 transition-all shadow-[0_0_40px_-5px_rgba(185,199,224,0.4)] flex items-center justify-center space-x-3 group"
            >
              <span>Initialize Monitor</span>
              <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            
            <button className="h-16 px-10 rounded-2xl glass border border-white/10 text-foreground text-[10px] font-bold font-space uppercase tracking-[0.3em] hover:bg-white/5 transition-all flex items-center justify-center space-x-3 group">
              <Play size={16} className="fill-current" />
              <span>Watch Intelligence Demo</span>
            </button>
          </div>
        </motion.div>

        {/* Hero Visual */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4, duration: 1 }}
          className="mt-24 relative max-w-5xl mx-auto group"
        >
          <div className="glass rounded-[3.5rem] p-4 border border-white/10 shadow-2xl relative overflow-hidden">
             <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-[3.5rem] blur opacity-50 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
             <img 
               src="https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=2070&auto=format&fit=crop" 
               alt="InterceptAI Command Center" 
               className="rounded-[3rem] w-full h-auto grayscale opacity-80"
             />
             
             {/* Dynamic Overlay Elements */}
             <div className="absolute top-12 left-12 glass p-4 rounded-2xl border border-white/10 animate-float translate-y-[-5px]">
                <div className="flex items-center space-x-3">
                   <div className="h-2 w-2 rounded-full bg-secondary animate-ping" />
                   <span className="text-[10px] font-mono font-bold text-white uppercase tracking-widest leading-none">Detection Active</span>
                </div>
             </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
