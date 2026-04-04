"use client";

import React, { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { getCategoryScores } from "@/services/fraudDetectionService";
import { FraudDetectionRecord } from "@/hooks/useFraudDetection";

interface FeatureImportanceProps {
  data?: FraudDetectionRecord[];
  loading?: boolean;
}

const defaultData = [
  { name: "Txn Amount", value: 0.35, color: "#3b82f6" },
  { name: "Merchant Cat", value: 0.28, color: "#10b981" },
  { name: "Time Offset", value: 0.18, color: "#f59e0b" },
  { name: "V11 PCA", value: 0.12, color: "#8b5cf6" },
  { name: "V14 PCA", value: 0.07, color: "#ef4444" },
];

export default function FeatureImportance({ data = [], loading = false }: FeatureImportanceProps) {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) {
      return defaultData;
    }
    return getCategoryScores(data);
  }, [data]);

  return (
    <div className="w-full h-full space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold font-outfit">Fraud Attack Scenarios</h3>
        <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">
          {loading ? "Updating..." : "Risk by Type"}
        </p>
      </div>

      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart 
            data={chartData} 
            layout="vertical"
            margin={{ top: 5, right: 30, left: 120, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#27272a" />
            <XAxis 
              type="number"
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#71717a', fontSize: 12 }} 
            />
            <YAxis 
              dataKey="name" 
              type="category"
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#71717a', fontSize: 11 }} 
              dx={-10}
              width={115}
            />
            <Tooltip
              cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
              contentStyle={{
                backgroundColor: '#09090b',
                border: '1px solid #27272a',
                borderRadius: '12px',
                fontSize: '12px',
              }}
              itemStyle={{ color: '#fafafa' }}
              formatter={(value: any) => typeof value === 'number' ? value.toFixed(4) : value}
            />
            <Bar dataKey="value" radius={[0, 6, 6, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={0.8} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
