"use client";

import React from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import RiskHistogram from "@/components/dashboard/RiskHistogram";
import FeatureImportance from "@/components/dashboard/FeatureImportance";
import { 
  BarChart3, 
  TrendingUp, 
  ShieldCheck, 
  Map as MapIcon, 
  Calendar,
  ChevronRight,
  ArrowUpRight,
  Zap,
  Target
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell
} from "recharts";

const MOCK_FLOW_DATA = [
  { name: "Mon", fraud: 4, safe: 240 },
  { name: "Tue", fraud: 7, safe: 198 },
  { name: "Wed", fraud: 3, safe: 310 },
  { name: "Thu", fraud: 12, safe: 280 },
  { name: "Fri", fraud: 5, safe: 320 },
  { name: "Sat", fraud: 15, safe: 150 },
  { name: "Sun", fraud: 9, safe: 120 },
];

const SEGMENT_DATA = [
  { name: "E-Commerce", value: 45, color: "#b9c7e0" },
  { name: "P2P Transfer", value: 25, color: "#4edea3" },
  { name: "Atm Withdraw", value: 20, color: "#ffb3ad" },
  { name: "Subscription", value: 10, color: "#ff5250" },
];

export default function AnalyticsPage() {
  return (
    <DashboardLayout>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div className="space-y-4">
          <div className="flex items-center space-x-3 text-secondary font-bold text-[10px] uppercase tracking-[0.3em]">
             <TrendingUp size={14} />
             <span>Neural Analytics Engine</span>
          </div>
          <h1 className="text-5xl font-bold font-space tracking-tight text-foreground">
            ANALYTICS <span className="text-primary/60">HUB</span>
          </h1>
          <p className="text-muted-foreground max-w-xl text-sm leading-relaxed font-medium">
            Projected behavioral trends and risk segmentation derived from ensemble model weights.
          </p>
        </div>

        <div className="flex items-center space-x-3">
           <div className="glass px-5 py-3 rounded-2xl border border-white/5 flex items-center space-x-4">
              <Calendar size={16} className="text-primary/60" />
              <div className="flex flex-col">
                 <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest leading-none">Window</span>
                 <span className="text-xs font-bold text-foreground uppercase mt-1">LAST 7 DAYS</span>
              </div>
           </div>
        </div>
      </div>

      {/* Advanced Macro Metrics */}
      <div className="grid gap-6 grid-cols-1 md:grid-cols-3 mb-10">
         <div className="glass-card p-6 rounded-3xl border border-white/5 relative overflow-hidden group">
            <div className="flex items-center justify-between mb-2">
               <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Fraud Velocity</span>
               <ArrowUpRight size={14} className="text-error" />
            </div>
            <div className="text-2xl font-bold font-space tracking-tight text-foreground mb-4">12.4% <span className="text-xs text-error font-medium ml-1">↑ 2.4%</span></div>
            <div className="h-1 bg-white/[0.03] rounded-full overflow-hidden">
               <div className="h-full w-[65%] bg-error/40 rounded-full" />
            </div>
         </div>
         <div className="glass-card p-6 rounded-3xl border border-white/5 relative overflow-hidden group">
            <div className="flex items-center justify-between mb-2">
               <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Model Precision</span>
               <ShieldCheck size={14} className="text-secondary" />
            </div>
            <div className="text-2xl font-bold font-space tracking-tight text-foreground mb-4">98.2% <span className="text-xs text-secondary font-medium ml-1">↑ 0.5%</span></div>
            <div className="h-1 bg-white/[0.03] rounded-full overflow-hidden">
               <div className="h-full w-[98%] bg-secondary/40 rounded-full" />
            </div>
         </div>
         <div className="glass-card p-6 rounded-3xl border border-white/5 relative overflow-hidden group">
            <div className="flex items-center justify-between mb-2">
               <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Threat Radius</span>
               <Target size={14} className="text-primary" />
            </div>
            <div className="text-2xl font-bold font-space tracking-tight text-foreground mb-4">2.4k <span className="text-xs text-muted-foreground font-medium ml-1">Stable</span></div>
            <div className="h-1 bg-white/[0.03] rounded-full overflow-hidden">
               <div className="h-full w-[45%] bg-primary/40 rounded-full" />
            </div>
         </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
         {/* Main Chart Column (65%) */}
         <div className="lg:col-span-2 space-y-8">
            <div className="glass-card rounded-[2rem] p-10 relative overflow-hidden group">
               <div className="flex items-center justify-between mb-10">
                  <div>
                     <h3 className="text-lg font-bold font-space uppercase tracking-widest text-foreground">Threat Evolution</h3>
                     <p className="text-[10px] text-muted-foreground font-bold tracking-widest uppercase mt-1">Temporal behavioral variance detection</p>
                  </div>
                  <div className="flex items-center space-x-2">
                     <div className="flex items-center space-x-1">
                        <div className="h-2 w-2 rounded-full bg-error" />
                        <span className="text-[9px] font-bold text-muted-foreground uppercase">Fraud</span>
                     </div>
                     <div className="flex items-center space-x-1">
                        <div className="h-2 w-2 rounded-full bg-primary" />
                        <span className="text-[9px] font-bold text-muted-foreground uppercase">Verified</span>
                     </div>
                  </div>
               </div>

               <div className="h-[400px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                     <AreaChart data={MOCK_FLOW_DATA}>
                        <defs>
                           <linearGradient id="colorFraud" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="var(--color-error)" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="var(--color-error)" stopOpacity={0}/>
                           </linearGradient>
                           <linearGradient id="colorSafe" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.1}/>
                              <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0}/>
                           </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)" vertical={false} />
                        <XAxis 
                           dataKey="name" 
                           stroke="rgba(255,255,255,0.2)" 
                           fontSize={10} 
                           tickLine={false} 
                           axisLine={false} 
                           tick={{fontFamily: 'Roboto Mono', fontWeight: 700}}
                        />
                        <YAxis 
                           stroke="rgba(255,255,255,0.2)" 
                           fontSize={10} 
                           tickLine={false} 
                           axisLine={false} 
                           tick={{fontFamily: 'Roboto Mono', fontWeight: 700}}
                        />
                        <Tooltip 
                           contentStyle={{ backgroundColor: '#10131a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                           itemStyle={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase' }}
                        />
                        <Area type="monotone" dataKey="fraud" stroke="var(--color-error)" fillOpacity={1} fill="url(#colorFraud)" strokeWidth={2} />
                        <Area type="monotone" dataKey="safe" stroke="var(--color-primary)" fillOpacity={1} fill="url(#colorSafe)" strokeWidth={2} />
                     </AreaChart>
                  </ResponsiveContainer>
               </div>
            </div>

            <div className="glass-card rounded-[2rem] p-10 border border-white/5">
                <div className="flex items-center justify-between mb-8">
                   <h2 className="text-xl font-bold font-space uppercase tracking-wider">Influence Vector Variance</h2>
                   <div className="h-8 w-8 rounded-lg bg-white/5 flex items-center justify-center text-muted-foreground">
                      <ChevronRight size={16} />
                   </div>
                </div>
                <FeatureImportance />
            </div>
         </div>

         {/* Technical Context Column (35%) */}
         <div className="space-y-8">
            <div className="glass-card rounded-[2rem] p-10 border border-white/5 relative overflow-hidden group min-h-[450px]">
               <div className="flex items-center justify-between mb-10">
                  <h3 className="text-lg font-bold font-space uppercase tracking-widest text-foreground">Risk Segments</h3>
                  <Target size={18} className="text-primary/40" />
               </div>

               <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                     <PieChart>
                        <Pie
                           data={SEGMENT_DATA}
                           cx="50%"
                           cy="50%"
                           innerRadius={60}
                           outerRadius={90}
                           paddingAngle={8}
                           dataKey="value"
                           stroke="none"
                        >
                           {SEGMENT_DATA.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                           ))}
                        </Pie>
                        <Tooltip />
                     </PieChart>
                  </ResponsiveContainer>
               </div>

               <div className="space-y-4 pt-6">
                  {SEGMENT_DATA.map((item, idx) => (
                     <div key={item.name} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                           <div className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                           <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{item.name}</span>
                        </div>
                        <span className="text-xs font-mono font-bold">{item.value}%</span>
                     </div>
                  ))}
               </div>
            </div>

            <div className="glass-card rounded-[2rem] p-8 border border-white/5 space-y-6">
               <div className="flex items-center space-x-3">
                  <div className="h-8 w-8 rounded-lg bg-white/5 flex items-center justify-center text-primary">
                     <Zap size={16} />
                  </div>
                  <h3 className="text-xs font-bold font-space uppercase tracking-[0.2em]">Compute Status</h3>
               </div>
               
               <div className="space-y-4">
                  <div>
                     <div className="flex justify-between text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-2">
                        <span>Neural Load</span>
                        <span>42%</span>
                     </div>
                     <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full w-[42%] bg-primary/40 rounded-full" />
                     </div>
                  </div>
                  <div>
                     <div className="flex justify-between text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-2">
                        <span>I/O Latency</span>
                        <span>0.4ms</span>
                     </div>
                     <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full w-[15%] bg-secondary/40 rounded-full" />
                     </div>
                  </div>
               </div>
            </div>
         </div>
      </div>
    </DashboardLayout>
  );
}
