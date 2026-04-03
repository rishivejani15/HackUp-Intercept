import React from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Hammer } from "lucide-react";

interface ComingSoonProps {
  title: string;
}

export default function ComingSoon({ title }: ComingSoonProps) {
  return (
    <DashboardLayout>
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
        <div className="h-24 w-24 rounded-[2rem] bg-primary/10 border border-primary/20 flex flex-col items-center justify-center text-primary relative shadow-[0_0_50px_rgba(185,199,224,0.1)]">
          <Hammer size={48} className="animate-pulse" />
          <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
        </div>
        
        <h1 className="text-4xl md:text-5xl font-bold font-space uppercase tracking-tight text-foreground">
          {title} <span className="text-primary/60">COMMENCING SOON</span>
        </h1>
        
        <p className="text-muted-foreground max-w-lg mx-auto text-sm leading-relaxed">
          This intelligence module is currently under active development. Our engineering team is finalizing the AI models and integration protocols for a future release.
        </p>
      </div>
    </DashboardLayout>
  );
}
