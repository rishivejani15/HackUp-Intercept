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
import { calculateRiskDistribution } from "@/services/fraudDetectionService";
import { FraudDetectionRecord } from "@/hooks/useFraudDetection";

interface RiskHistogramProps {
  data?: FraudDetectionRecord[];
  loading?: boolean;
}

export default function RiskHistogram({ data = [], loading = false }: RiskHistogramProps) {
  const chartData = useMemo(() => {
    return calculateRiskDistribution(data);
  }, [data]);

  return (
    <div className="w-full h-full space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold font-outfit">Risk Distribution</h3>
        <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">
          {loading ? "Updating..." : "Live Analysis"}
        </p>
      </div>

      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
            <XAxis 
              dataKey="range" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#71717a', fontSize: 12 }} 
              dy={10}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#71717a', fontSize: 12 }} 
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
            />
            <Bar dataKey="count" radius={[6, 6, 0, 0]}>
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
