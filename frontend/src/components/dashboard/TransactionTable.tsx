"use client";

import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { 
  ShieldCheck, 
  ShieldAlert, 
  ShieldQuestion,
  MoreVertical,
  ExternalLink,
  Info
} from "lucide-react";

interface Transaction {
  id: string;
  amount: number;
  riskScore: number;
  status: "safe" | "suspicious" | "fraud";
  time: string;
  merchant: string;
  topFeature: string;
}

const mockTransactions: Transaction[] = [
  {
    id: "TX-5902",
    amount: 1240.50,
    riskScore: 92,
    status: "fraud",
    time: "2 mins ago",
    merchant: "Electronics Hub",
    topFeature: "Unusual Amount"
  },
  {
    id: "TX-5899",
    amount: 45.00,
    riskScore: 12,
    status: "safe",
    time: "15 mins ago",
    merchant: "Daily Brew Coffee",
    topFeature: "Normal Pattern"
  },
  {
    id: "TX-5894",
    amount: 890.99,
    riskScore: 68,
    status: "suspicious",
    time: "45 mins ago",
    merchant: "Luxury Watches Inc",
    topFeature: "Velocity Alert"
  },
  {
    id: "TX-5882",
    amount: 15.20,
    riskScore: 5,
    status: "safe",
    time: "1 hour ago",
    merchant: "City Transit",
    topFeature: "Verified User"
  },
  {
    id: "TX-5871",
    amount: 2400.00,
    riskScore: 88,
    status: "fraud",
    time: "3 hours ago",
    merchant: "Global Resorts",
    topFeature: "Geo-Shift"
  }
];

export default function TransactionTable() {
  const [data, setData] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate real data fetching
    const timer = setTimeout(() => {
      setData(mockTransactions);
      setLoading(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-4 animate-glow">
          <LoaderCircle className="h-6 w-6 animate-spin" />
        </div>
        <p className="text-muted-foreground text-sm font-medium uppercase tracking-widest animate-pulse">
            Establishing Secure Stream...
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-border/50 text-muted-foreground font-outfit uppercase tracking-widest text-[10px] font-bold">
            <th className="px-4 py-4">Transaction ID</th>
            <th className="px-4 py-4">Status</th>
            <th className="px-4 py-4">Merchant</th>
            <th className="px-4 py-4">Amount</th>
            <th className="px-4 py-4">Risk Score</th>
            <th className="px-4 py-4">Primary Factor</th>
            <th className="px-4 py-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/30">
          {data.map((txn) => (
            <tr key={txn.id} className="group hover:bg-secondary/20 transition-all duration-200">
              <td className="px-4 py-4 font-mono text-xs font-bold text-foreground">
                {txn.id}
              </td>
              <td className="px-4 py-4">
                <StatusBadge status={txn.status} />
              </td>
              <td className="px-4 py-4">
                <div>
                  <p className="text-sm font-medium text-foreground">{txn.merchant}</p>
                  <p className="text-xs text-muted-foreground">{txn.time}</p>
                </div>
              </td>
              <td className="px-4 py-4 text-sm font-bold text-foreground">
                ${txn.amount.toLocaleString()}
              </td>
              <td className="px-4 py-4">
                <RiskBar score={txn.riskScore} />
              </td>
              <td className="px-4 py-4">
                <span className="inline-flex items-center space-x-1 px-2 py-1 rounded-md bg-secondary text-[10px] font-bold text-muted-foreground uppercase border border-border/50">
                   <Info size={10} className="text-primary" />
                   <span>{txn.topFeature}</span>
                </span>
              </td>
              <td className="px-4 py-4 text-right">
                <div className="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="p-2 hover:bg-primary/10 rounded-lg text-primary transition-colors">
                    <ExternalLink size={16} />
                  </button>
                  <button className="p-2 hover:bg-secondary rounded-lg text-muted-foreground transition-colors">
                    <MoreVertical size={16} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatusBadge({ status }: { status: Transaction["status"] }) {
  const configs = {
    safe: {
      label: "Safe",
      icon: ShieldCheck,
      classes: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
    },
    suspicious: {
      label: "Review",
      icon: ShieldQuestion,
      classes: "text-amber-500 bg-amber-500/10 border-amber-500/20",
    },
    fraud: {
      label: "Fraud",
      icon: ShieldAlert,
      classes: "text-destructive bg-destructive/10 border-destructive/20",
    },
  };

  const config = configs[status];
  const Icon = config.icon;

  return (
    <span className={cn(
      "inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border",
      config.classes
    )}>
      <Icon size={12} className="animate-pulse" />
      <span>{config.label}</span>
    </span>
  );
}

function RiskBar({ score }: { score: number }) {
  let colorClass = "bg-emerald-500";
  if (score > 40) colorClass = "bg-amber-500";
  if (score > 75) colorClass = "bg-destructive";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-[10px] font-bold">
        <span className="text-foreground">{score}%</span>
      </div>
      <div className="h-1 w-24 bg-border/50 rounded-full overflow-hidden">
        <div 
          className={cn("h-full rounded-full animate-glow", colorClass)} 
          style={{ width: `${score}%` }} 
        />
      </div>
    </div>
  );
}

function LoaderCircle(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}
