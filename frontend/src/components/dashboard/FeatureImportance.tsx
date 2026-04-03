"use client";

import React from "react";
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

const data = [
  { name: "Txn Amount", value: 0.35, color: "#3b82f6" },
  { name: "Merchant Cat", value: 0.28, color: "#10b981" },
  { name: "Time Offset", value: 0.18, color: "#f59e0b" },
  { name: "V11 PCA", value: 0.12, color: "#8b5cf6" },
  { name: "V14 PCA", value: 0.07, color: "#ef4444" },
];

export default function FeatureImportance() {
  return (
    <div className="w-full h-full space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold font-outfit">SHAP Feature Influence</h3>
        <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">
          Top Contributors
        </p>
      </div>

      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart 
            data={data} 
            layout="vertical"
            margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
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
              tick={{ fill: '#71717a', fontSize: 12 }} 
              dx={-10}
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
            <Bar dataKey="value" radius={[0, 6, 6, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={0.8} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
