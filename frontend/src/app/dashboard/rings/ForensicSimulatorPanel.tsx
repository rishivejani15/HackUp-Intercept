"use client";

import React, { useState, useMemo } from "react";
import {
  X,
  ChevronRight,
  AlertCircle,
  AlertTriangle,
  AlertOctagon,
  CheckCircle,
  Zap,
  TrendingUp,
  Network,
  MapPin,
  Smartphone,
  Activity,
  Brain,
} from "lucide-react";
import { RingsTransaction } from "@/types/rings";
import {
  generateForensicAnalysis,
  ForensicAnalysis,
  DetectionStep,
} from "@/lib/forensicAnalysis";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface ForensicSimulatorPanelProps {
  transaction: RingsTransaction | null;
  onClose: () => void;
}

const StepIcons: Record<number, React.ReactNode> = {
  1: <TrendingUp size={18} />,
  2: <AlertOctagon size={18} />,
  3: <MapPin size={18} />,
  4: <Activity size={18} />,
  5: <Network size={18} />,
  6: <Brain size={18} />,
};

const SeverityStyles = {
  low: "border-secondary/30 bg-secondary/5 text-secondary",
  medium: "border-warning/30 bg-warning/5 text-warning",
  high: "border-error/30 bg-error/5 text-error",
  critical: "border-error/50 bg-error/10 text-error",
};

const SeverityIcons = {
  low: <CheckCircle size={14} />,
  medium: <AlertCircle size={14} />,
  high: <AlertTriangle size={14} />,
  critical: <AlertOctagon size={14} />,
};

export default function ForensicSimulatorPanel({
  transaction,
  onClose,
}: ForensicSimulatorPanelProps) {
  const [expandedStep, setExpandedStep] = useState<number | null>(null);
  const [animatingSteps, setAnimatingSteps] = useState<Set<number>>(new Set());

  const analysis = useMemo(() => {
    if (!transaction) return null;
    return generateForensicAnalysis(transaction);
  }, [transaction]);

  if (!transaction || !analysis) return null;

  const handleStepClick = (stepNumber: number) => {
    if (!animatingSteps.has(stepNumber)) {
      setAnimatingSteps((prev) => new Set(prev).add(stepNumber));
      setTimeout(() => {
        setAnimatingSteps((prev) => {
          const next = new Set(prev);
          next.delete(stepNumber);
          return next;
        });
      }, 600);
    }
    setExpandedStep(expandedStep === stepNumber ? null : stepNumber);
  };

  return (
    <div className="fixed inset-0 z-[101] pointer-events-none">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto"
      />

      {/* Panel */}
      <motion.div
        initial={{ opacity: 0, x: 400 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 400 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="absolute inset-y-0 right-0 w-[600px] max-w-[90vw] bg-[#0B0E14]/95 backdrop-blur-2xl border-l border-white/10 shadow-2xl flex flex-col pointer-events-auto"
      >
        {/* Header */}
        <div className="p-8 border-b border-white/5 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold font-space uppercase tracking-tight text-foreground flex items-center gap-3">
                <Zap size={20} className="text-primary animate-pulse" />
                Forensic Simulator
              </h2>
              <p className="text-[10px] text-muted-foreground mt-1 upper tracking-widest">
                STEP-BY-STEP FRAUD DETECTION ANALYSIS
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors text-muted-foreground hover:text-white"
            >
              <X size={20} />
            </button>
          </div>

          {/* Transaction Info */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-white/5 border border-white/5">
              <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/70">
                Transaction ID
              </p>
              <p className="text-xs font-mono text-foreground mt-1 truncate">
                {transaction.id.slice(0, 12)}...
              </p>
            </div>
            <div className="p-3 rounded-lg bg-white/5 border border-white/5">
              <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/70">
                Amount
              </p>
              <p className="text-xs font-bold text-foreground mt-1">
                ${transaction.amount.toLocaleString()}
              </p>
            </div>
            <div
              className={cn(
                "p-3 rounded-lg border",
                transaction.decision === "BLOCK"
                  ? "bg-error/10 border-error/30"
                  : transaction.decision === "REVIEW"
                    ? "bg-warning/10 border-warning/30"
                    : "bg-secondary/10 border-secondary/30"
              )}
            >
              <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/70">
                Decision
              </p>
              <p
                className={cn(
                  "text-xs font-bold mt-1",
                  transaction.decision === "BLOCK"
                    ? "text-error"
                    : transaction.decision === "REVIEW"
                      ? "text-warning"
                      : "text-secondary"
                )}
              >
                {transaction.decision}
              </p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
          {/* Summary Alert */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className={cn(
              "p-4 rounded-xl border",
              analysis.steps.filter((s) => s.flagged).length > 0
                ? "bg-error/10 border-error/30"
                : "bg-secondary/10 border-secondary/30"
            )}
          >
            <p className="text-sm font-bold text-foreground">
              {analysis.summary}
            </p>
          </motion.div>

          {/* Risk Score Visualization */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="p-6 rounded-2xl bg-white/5 border border-white/10"
          >
            <div className="flex items-end gap-4 mb-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                  Final Risk Score
                </p>
                <p className="text-4xl font-bold font-space text-foreground">
                  {(analysis.finalRiskScore * 100).toFixed(1)}
                  <span className="text-lg text-muted-foreground">%</span>
                </p>
              </div>
              <div className="flex-1">
                <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${analysis.finalRiskScore * 100}%` }}
                    transition={{ duration: 1, ease: "easeInOut" }}
                    className={cn(
                      "h-full",
                      analysis.finalRiskScore > 0.7
                        ? "bg-error"
                        : analysis.finalRiskScore > 0.4
                          ? "bg-warning"
                          : "bg-secondary"
                    )}
                  />
                </div>
              </div>
            </div>
            <div className="text-[10px] text-muted-foreground/70">
              Fraud Probability: {(analysis.fraudProbability * 100).toFixed(1)}% |
              Scenario: <span className="text-foreground capitalize">{analysis.scenario}</span>
            </div>
          </motion.div>

          {/* Detection Steps */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-widest text-foreground">
              Detection Steps
            </h3>

            {analysis.steps.map((step, idx) => (
              <motion.div
                key={step.stepNumber}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + idx * 0.1 }}
              >
                <button
                  onClick={() => handleStepClick(step.stepNumber)}
                  className={cn(
                    "w-full p-4 rounded-xl border transition-all duration-300",
                    expandedStep === step.stepNumber
                      ? "bg-white/10 border-white/20 shadow-lg"
                      : "bg-white/5 border-white/10 hover:bg-white/[0.07]",
                    step.flagged && "ring-1 ring-warn/50"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div
                        className={cn(
                          "p-2 rounded-lg",
                          step.flagged
                            ? "bg-error/20 text-error"
                            : "bg-white/10 text-white/50"
                        )}
                      >
                        {StepIcons[step.stepNumber] || <Activity size={18} />}
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-bold leading-tight text-foreground flex items-center gap-2">
                          Step {step.stepNumber}: {step.title}
                          {step.flagged && (
                            <AlertTriangle size={14} className="text-error" />
                          )}
                        </p>
                        <p className="text-[10px] text-muted-foreground/60 mt-1">
                          {step.description}
                        </p>
                      </div>
                    </div>
                    <motion.div
                      animate={{
                        rotate: expandedStep === step.stepNumber ? 90 : 0,
                      }}
                    >
                      <ChevronRight size={18} className="text-muted-foreground" />
                    </motion.div>
                  </div>
                </button>

                {/* Expanded Content */}
                <AnimatePresence>
                  {expandedStep === step.stepNumber && (
                    <motion.div
                      initial={{ opacity: 0, height: 0, marginTop: 0 }}
                      animate={{ opacity: 1, height: "auto", marginTop: 8 }}
                      exit={{ opacity: 0, height: 0, marginTop: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="p-4 rounded-lg bg-white/[0.02] border border-white/5 space-y-4">
                        {step.indicators.map((indicator, indIdx) => (
                          <motion.div
                            key={indIdx}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: indIdx * 0.1 }}
                            className={cn(
                              "p-3 rounded-lg border",
                              SeverityStyles[indicator.severity]
                            )}
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2">
                                {SeverityIcons[indicator.severity]}
                                <p className="text-xs font-bold leading-tight">
                                  {indicator.name}
                                </p>
                              </div>
                              <p className="text-xs font-mono font-bold bg-black/20 px-2 py-1 rounded">
                                {indicator.value}
                              </p>
                            </div>
                            <p className="text-[10px] opacity-80 leading-relaxed">
                              {indicator.explanation}
                            </p>
                            {indicator.threshold !== undefined && (
                              <p className="text-[9px] opacity-60 mt-2">
                                Threshold: {(indicator.threshold * 100).toFixed(1)}%
                              </p>
                            )}
                          </motion.div>
                        ))}

                        <div className="p-3 rounded-lg bg-white/10 border border-white/20">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-bold text-foreground">
                              Cumulative Risk at Step {step.stepNumber}
                            </p>
                            <p className="text-sm font-bold font-space">
                              {(step.cumulativeRisk * 100).toFixed(1)}%
                            </p>
                          </div>
                          <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{
                                width: `${step.cumulativeRisk * 100}%`,
                              }}
                              transition={{ duration: 0.5, ease: "easeInOut" }}
                              className={cn(
                                "h-full",
                                step.cumulativeRisk > 0.7
                                  ? "bg-error"
                                  : step.cumulativeRisk > 0.4
                                    ? "bg-warning"
                                    : "bg-secondary"
                              )}
                            />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>

          {/* Recommendations */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="p-6 rounded-2xl bg-white/5 border border-white/10"
          >
            <h3 className="text-sm font-bold uppercase tracking-widest text-foreground mb-4">
              Recommended Actions
            </h3>
            <ul className="space-y-3">
              {analysis.recommendations.map((rec, idx) => (
                <motion.li
                  key={idx}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + idx * 0.1 }}
                  className="flex items-start gap-3 text-sm text-muted-foreground/80"
                >
                  <ChevronRight size={16} className="mt-0.5 flex-shrink-0 text-primary" />
                  <span>{rec}</span>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
