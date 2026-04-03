"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, 
  ExternalLink, 
  FileText, 
  ShieldAlert, 
  Target, 
  Globe, 
  Info, 
  Activity,
  UserCheck2,
  FileDown
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NewsItem } from "@/app/dashboard/news/page";

interface ArticleDossierProps {
  article: NewsItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function ArticleDossier({ article, isOpen, onClose }: ArticleDossierProps) {
  if (!article) return null;

  // Mock Risk Analysis
  const riskAnalysis = {
    level: "CRITICAL",
    score: 0.89,
    affectedEntities: ["Banking APIs", "Retail Customers", "FinTech Infrastructure"],
    attackVector: "Zero-day Payload Injection",
    summary: article.description + " This threat represents a high-velocity attack targeting specific neural nodes within the global banking infrastructure. Our models suggest a 92% likelihood of lateral movement if unpatched."
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden glass-card rounded-[2.5rem] border border-white/10 flex flex-col bg-[#0B0E14] shadow-2xl"
          >
            {/* Header / Top Bar */}
            <div className="p-8 border-b border-white/5 flex items-center justify-between shrink-0">
               <div className="flex items-center gap-4">
                  <div className="p-3 rounded-2xl bg-error/10 text-error border border-error/20 animate-pulse">
                     <ShieldAlert size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold font-space uppercase tracking-tight text-white mb-1">Threat Dossier: {article.source}</h2>
                    <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Case ID: INT_0x{article.id.slice(0, 8)}</p>
                  </div>
               </div>
               <button 
                  onClick={onClose}
                  className="h-10 w-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/5 text-muted-foreground hover:bg-white/10 hover:text-white transition-all"
               >
                  <X size={20} />
               </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-12 custom-scrollbar">
               <div className="grid lg:grid-cols-5 gap-12">
                  {/* Left: Article Details */}
                  <div className="lg:col-span-3 space-y-8">
                     <div>
                        <div className="flex items-center gap-2 mb-4">
                           <Globe size={14} className="text-primary" />
                           <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Original Intelligence Intercept</span>
                        </div>
                        <h1 className="text-3xl font-bold font-space leading-tight text-foreground mb-6">
                           {article.title}
                        </h1>
                        <p className="text-sm leading-relaxed text-muted-foreground font-medium mb-8">
                           {article.description}
                        </p>
                        
                        <a 
                           href={article.link} 
                           target="_blank" 
                           rel="noopener noreferrer"
                           className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/5 border border-white/5 text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 transition-all font-space"
                        >
                           <ExternalLink size={14} />
                           View Source intel
                        </a>
                     </div>

                     <div className="pt-8 border-t border-white/5 space-y-6">
                        <h4 className="text-[11px] font-bold uppercase tracking-widest text-foreground flex items-center gap-2">
                           <Activity size={16} className="text-primary" />
                           Attack Lifecycle Analysis
                        </h4>
                        <div className="grid grid-cols-3 gap-4">
                           {[
                              { label: 'Ingress', val: 'DNSSEC', icon: Info },
                              { label: 'Payload', val: 'RCE', icon: Target },
                              { label: 'Exfil', val: 'HTTPS', icon: FileText }
                           ].map(item => (
                              <div key={item.label} className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 text-center">
                                 <item.icon size={14} className="mx-auto text-primary mb-2" />
                                 <p className="text-[8px] font-bold uppercase text-muted-foreground mb-1">{item.label}</p>
                                 <p className="text-xs font-bold text-foreground">{item.val}</p>
                              </div>
                           ))}
                        </div>
                     </div>
                  </div>

                  {/* Right: AI Risk Engine */}
                  <div className="lg:col-span-2 space-y-6">
                     <div className="p-6 rounded-[2rem] bg-error/5 border border-error/10 relative overflow-hidden group">
                        <div className="relative z-10 space-y-6">
                           <div className="flex items-center justify-between">
                              <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-error">Risk Analysis</h3>
                              <span className="text-2xl font-bold font-space text-error">89%</span>
                           </div>
                           
                           <div className="h-1.5 w-full bg-error/10 rounded-full overflow-hidden">
                              <motion.div 
                                 className="h-full bg-error shadow-[0_0_10px_#ef4444]"
                                 initial={{ width: 0 }}
                                 animate={{ width: "89%" }}
                              />
                           </div>

                           <div className="space-y-4">
                              <p className="text-[10px] leading-relaxed text-error/80 italic font-medium">
                                 {riskAnalysis.summary}
                              </p>
                              <div className="flex flex-wrap gap-2">
                                 {riskAnalysis.affectedEntities.map(e => (
                                    <span key={e} className="px-2 py-1 rounded bg-error/20 text-[8px] font-bold text-error uppercase border border-error/20">
                                       {e}
                                    </span>
                                 ))}
                              </div>
                           </div>
                        </div>
                        {/* Static Grids Background */}
                        <div className="absolute inset-0 opacity-[0.03] bg-[url('/grid.svg')] [mask-image:radial-gradient(ellipse_at_center,black,transparent)] group-hover:scale-110 transition-transform duration-1000"></div>
                     </div>

                     <div className="p-6 rounded-[2rem] bg-white/[0.03] border border-white/5 space-y-6">
                        <div className="flex items-center gap-2 mb-2">
                           <UserCheck2 size={16} className="text-primary" />
                           <h4 className="text-[10px] font-bold uppercase tracking-widest text-foreground">Next Active Steps</h4>
                        </div>
                        <ul className="space-y-3">
                           {[
                              "Scan perimeter for CVE-2026-0402",
                              "Verify integrity of Banking API tokens",
                              "Isolate affected retail sub-nets"
                           ].map((step, i) => (
                              <li key={i} className="flex items-center gap-3 text-[10px] font-bold text-muted-foreground uppercase leading-tight">
                                 <div className="h-1 w-1 rounded-full bg-primary" />
                                 {step}
                              </li>
                           ))}
                        </ul>
                     </div>

                     <button className="w-full py-4 rounded-xl bg-white text-black text-xs font-bold uppercase tracking-[0.15em] hover:scale-[1.02] active:scale-95 transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)] flex items-center justify-center gap-2">
                        <FileDown size={14} />
                        Export to PDF
                     </button>
                  </div>
               </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
