"use client";

import React from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface KPICardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
  color?: "primary" | "success" | "destructive" | "warning";
}

export default function KPICard({
  title,
  value,
  icon: Icon,
  trend,
  trendUp,
  color = "primary"
}: KPICardProps) {
  const colorMap = {
    primary: "text-primary bg-primary/10 border-primary/20 shadow-primary/5",
    success: "text-secondary bg-secondary/10 border-secondary/20 shadow-secondary/5",
    destructive: "text-error bg-error/10 border-error/20 shadow-error/5",
    warning: "text-tertiary bg-tertiary/10 border-tertiary/20 shadow-tertiary/5",
  };

  const glowMap = {
    primary: "shadow-[0_0_20px_-5px_rgba(185,199,224,0.3)]",
    success: "shadow-[0_0_20px_-5px_rgba(78,222,163,0.3)]",
    destructive: "shadow-[0_0_20px_-5px_rgba(255,82,80,0.3)]",
    warning: "shadow-[0_0_20px_-5px_rgba(255,179,173,0.3)]",
  };

  return (
    <div className={cn(
      "glass-card relative overflow-hidden p-6 rounded-3xl transition-all duration-500 hover:scale-[1.02] group",
      glowMap[color]
    )}>
      {/* Decorative Gradient Flare */}
      <div className={cn(
        "absolute -right-4 -top-4 h-24 w-24 rounded-full blur-3xl opacity-20 transition-opacity group-hover:opacity-40",
        color === "primary" ? "bg-primary" : 
        color === "success" ? "bg-secondary" :
        color === "destructive" ? "bg-error" : "bg-tertiary"
      )} />

      <div className="flex items-start justify-between relative z-10">
        <div className="space-y-4">
          <p className="text-[10px] font-space font-bold uppercase tracking-[0.2em] text-muted-foreground/80">
            {title}
          </p>
          <h3 className="text-3xl font-space font-bold tracking-tight text-foreground">
            {value}
          </h3>
          {trend && (
            <div className="flex items-center space-x-2">
              <span className={cn(
                "text-[10px] font-mono font-bold px-2 py-0.5 rounded-md",
                trendUp ? "text-secondary bg-secondary/10" : "text-error bg-error/10"
              )}>
                {trend}
              </span>
              <span className="text-[10px] font-space font-bold uppercase tracking-widest text-muted-foreground/40">
                vs last session
              </span>
            </div>
          )}
        </div>

        <div className={cn(
          "h-12 w-12 rounded-2xl flex items-center justify-center transition-transform duration-500 group-hover:rotate-12",
          colorMap[color]
        )}>
          <Icon size={24} strokeWidth={2} />
        </div>
      </div>
      
      {/* Micro-Progress Bar */}
      <div className="absolute bottom-0 left-0 h-1 bg-white/[0.03] w-full">
         <div className={cn(
           "h-full transition-all duration-1000 w-2/3",
           color === "primary" ? "bg-primary/40" : 
           color === "success" ? "bg-secondary/40" :
           color === "destructive" ? "bg-error/40" : "bg-tertiary/40"
         )} />
      </div>
    </div>
  );
}
