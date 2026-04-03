"use client";

import React from "react";
import { ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}

export default function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md space-y-8 animate-in fade-in zoom-in duration-500">
        <div className="flex flex-col items-center justify-center space-y-2 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20 animate-glow">
            <ShieldAlert size={28} />
          </div>
          <h1 className="text-3xl font-bold tracking-tight font-outfit text-foreground mt-4">
            {title}
          </h1>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>

        <div className="glass-card rounded-3xl p-8 shadow-2xl">
          {children}
        </div>
      </div>
    </div>
  );
}
