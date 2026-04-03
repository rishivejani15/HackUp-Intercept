"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { 
  ChevronRight, 
  Play, 
  ShieldCheck, 
  Zap, 
  TrendingUp, 
  Globe, 
  Activity, 
  Lock, 
  Database,
  Cpu
} from "lucide-react";
import { cn } from "@/lib/utils";

// --- Sub-components (Compartments) ---

const Compartment = ({ title, children, className }: { title: string, children: React.ReactNode, className?: string }) => (
  <div className={cn("glass-panel p-5 rounded-3xl group relative overflow-hidden flex flex-col h-full", className)}>
    <div className="flex items-center justify-between mb-4">
      <h4 className="text-[10px] font-bold font-space uppercase tracking-[0.2em] text-muted-foreground/60">{title}</h4>
      <div className="h-1.5 w-1.5 rounded-full bg-secondary animate-pulse" />
    </div>
    <div className="flex-1">{children}</div>
    <div className="absolute top-0 right-0 p-2 opacity-5">
      <Database size={40} />
    </div>
  </div>
);

const RiskGauge = ({ value, label }: { value: number, label: string }) => (
  <div className="flex items-center space-x-4">
    <div className="relative h-12 w-12 flex items-center justify-center">
       <svg className="absolute inset-0 h-full w-full rotate-[-90deg]">
          <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="3" fill="transparent" className="text-black/10" />
          <circle 
            cx="24" cy="24" r="20" 
            stroke="currentColor" strokeWidth="3" fill="transparent" 
            className="text-primary transition-all duration-1000" 
            strokeDasharray={126} 
            strokeDashoffset={126 - (126 * value) / 100}
          />
       </svg>
      <span className="text-[10px] font-bold font-space text-foreground">{value}%</span>
    </div>
    <div className="flex flex-col">
       <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{label}</div>
      <div className="text-[10px] font-bold text-foreground uppercase opacity-80">Synced</div>
    </div>
  </div>
);

const CapitalFlow = () => (
  <div className="space-y-4">
    {[
      { label: "USD-TRANSFER", color: "bg-primary", w: "w-[70%]" },
      { label: "EUR-SWIFT", color: "bg-secondary", w: "w-[45%]" },
      { label: "GBP-CHATS", color: "bg-tertiary", w: "w-[30%]" },
    ].map((item, i) => (
      <div key={i} className="space-y-1.5">
        <div className="flex justify-between text-[8px] font-bold uppercase tracking-widest text-muted-foreground/80">
          <span>{item.label}</span>
          <span>Active</span>
        </div>
        <div className="h-1 rounded-full bg-slate-100 overflow-hidden">
          <motion.div 
            initial={{ x: "-100%" }}
            animate={{ x: "0%" }}
            transition={{ repeat: Infinity, duration: 2 + i, ease: "linear" }}
            className={cn("h-full", item.color, item.w)} 
          />
        </div>
      </div>
    ))}
  </div>
);

const TelemetryFeed = () => {
   const [mounted, setMounted] = React.useState(false);
   
   React.useEffect(() => {
     setMounted(true);
   }, []);

   if (!mounted) return <div className="animate-pulse bg-slate-100 h-20 rounded-xl" />;

   return (
      <div className="space-y-2 font-mono text-[9px] text-muted-foreground">
         {[1,2,3,4].map(i => (
           <div key={i} className="flex items-center space-x-2 border-b border-black/10 pb-1 last:border-0 opacity-80">
             <span className="text-secondary font-bold">[{new Date().toLocaleTimeString().split(' ')[0]}]</span>
             <span>SIG_DETECTED: AUTH_{i}</span>
             <span className="ml-auto text-primary">0.0{i}ms</span>
           </div>
         ))}
      </div>
   );
};

// --- Main Hero ---

export default function Hero() {
  const heroVideoPath = "/videos/hero_video.mp4";

  return (
    <section className="relative min-h-[95vh] flex items-center justify-center overflow-hidden pt-12 pb-20">
      {/* Background Grids */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 grid-subtle opacity-20" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[150px] animate-pulse" />
      </div>

      <div className="container mx-auto px-6 relative z-10 flex flex-col items-center">
        {/* Intro */}
        <div className="w-full max-w-7xl mx-auto mb-14 px-2 md:px-4">
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 xl:gap-20 items-start xl:items-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="xl:col-span-6 xl:pr-4 space-y-8 text-left"
            >
              <h1 className="text-5xl md:text-[6.5rem] font-bold font-space tracking-tighter leading-[0.85] text-foreground">
                NEURAL PROTECTION <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-secondary to-primary bg-[length:200%_auto] animate-gradient pb-2 inline-block">
                  AGAINST FRAUD.
                </span>
              </h1>

              <p className="max-w-2xl text-lg text-muted-foreground font-medium leading-relaxed">
                Autonomous financial intelligence built to neutralize cross-border threats at the speed of capital flow.
              </p>

              <div className="flex flex-col sm:flex-row items-start gap-4 pt-0">
                <Link
                  href="/signup"
                  className="h-16 px-10 rounded-2xl bg-primary text-primary-foreground text-[10px] font-bold font-space uppercase tracking-[0.3em] hover:bg-primary/90 transition-all shadow-lg flex items-center justify-center space-x-3 group"
                >
                  <span>Initialize Vault</span>
                  <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </Link>

                <button className="h-16 px-10 rounded-2xl glass border border-black/15 text-foreground text-[10px] font-bold font-space uppercase tracking-[0.3em] hover:bg-slate-100 transition-all flex items-center justify-center space-x-3 group">
                  <Play size={16} className="fill-current" />
                  <span>Watch Analysis Demo</span>
                </button>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.8 }}
              className="xl:col-span-6 xl:self-center xl:-mt-26"
            >
              <div className="max-w-[760px] xl:ml-0">
                <div className="aspect-[4/3] overflow-hidden rounded-[1.75rem] bg-slate-100 shadow-xl shadow-primary/10">
                  <video
                    className="h-full w-full object-cover"
                    src={heroVideoPath}
                    autoPlay
                    muted
                    loop
                    playsInline
                  >
                    Your browser does not support the video tag.
                  </video>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Neural Grid Dashboard (NO IMAGES) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4, duration: 1 }}
          className="w-full max-w-6xl h-auto relative p-2"
        >
          <div className="w-full glass rounded-[3rem] p-8 border border-black/10 grid grid-cols-1 md:grid-cols-12 gap-4 relative overflow-hidden">
             
             {/* Central Focal Point (Neural Orb) */}
             <div className="md:col-span-12 lg:col-span-6 flex items-center justify-center py-10 relative">
                <div className="absolute inset-0 bg-primary/5 rounded-full blur-[100px] " />
                
                {/* Orbital Rings */}
                <div className="absolute h-64 w-64 rounded-full border border-black/10 orbital opacity-20" />
                <div className="absolute h-48 w-48 rounded-full border border-black/15 orbital [animation-duration:10s] opacity-40" />
                
                {/* Core Orb */}
                <div className="relative h-40 w-40 rounded-full bg-gradient-to-br from-primary via-secondary to-primary p-[1px] animate-pulse">
                  <div className="h-full w-full rounded-full bg-background flex items-center justify-center overflow-hidden">
                    <div className="absolute inset-0 bg-primary/10" />
                    <Cpu size={60} className="text-primary/40 animate-pulse" />
                    
                    {/* Inner Signal Stream */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-30">
                       <Zap size={100} className="text-secondary animate-pulse" />
                    </div>
                  </div>
                  
                  {/* Floating Signal Dots */}
                  <div className="absolute -top-4 -left-4 h-4 w-4 bg-primary rounded-full blur-md animate-ping" />
                  <div className="absolute -bottom-6 -right-6 h-6 w-6 bg-secondary rounded-full blur-lg animate-pulse" />
                </div>
             </div>

             {/* Side Compartments */}
             <div className="md:col-span-6 lg:col-span-3">
                <Compartment title="Market Threat Intelligence">
                   <div className="space-y-6 mt-4">
                      <RiskGauge value={98.4} label="Interception" />
                      <RiskGauge value={12.5} label="Risk Velocity" />
                   </div>
                </Compartment>
             </div>

             <div className="md:col-span-6 lg:col-span-3">
                <Compartment title="Capital Flow Stream">
                   <div className="mt-4">
                      <CapitalFlow />
                   </div>
                </Compartment>
             </div>

             <div className="md:col-span-6 lg:col-span-3">
                <Compartment title="Neural Telemetry">
                   <div className="mt-4 h-full min-h-[120px]">
                      <TelemetryFeed />
                   </div>
                </Compartment>
             </div>

             <div className="md:col-span-6 lg:col-span-3">
                <Compartment title="Shield Protocol">
                   <div className="mt-4 space-y-4">
                      {[
                        { label: "Neural Fingerprint", active: true },
                        { label: "Geo-Spatial Sync", active: true },
                        { label: "Capital Vault Alpha", active: false },
                      ].map((item, i) => (
                        <div key={i} className="flex items-center space-x-3 text-[10px] font-bold uppercase tracking-widest">
                           <div className={cn("h-1.5 w-1.5 rounded-full", item.active ? "bg-secondary animate-pulse" : "bg-slate-200")} />
                           <span className={item.active ? "text-foreground" : "text-muted-foreground"}>{item.label}</span>
                        </div>
                      ))}
                   </div>
                </Compartment>
             </div>

          </div>
        </motion.div>
      </div>
    </section>
  );
}
