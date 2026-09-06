'use client';

import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

const HOEFFDING_CURVE_DATA = [
  { length: 8, security: 0.82, failureProb: '1.8e-1' },
  { length: 16, security: 0.934, failureProb: '6.6e-2' },
  { length: 32, security: 0.985, failureProb: '1.5e-2' },
  { length: 64, security: 0.9982, failureProb: '1.8e-3' },
  { length: 128, security: 0.99991, failureProb: '9.0e-5' },
  { length: 256, security: 0.999998, failureProb: '2.0e-6' },
  { length: 512, security: 0.9999999, failureProb: '1.0e-7' },
];

export default function SecurityVsLengthCurve() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div>
          <h3 className="text-xs font-mono font-medium text-slate-400 uppercase tracking-wider">
            Information-Theoretic Security vs Signature Length (L)
          </h3>
          <p className="text-[11px] text-slate-500 font-mono">
            Hoeffding Inequality P(Error) ≤ 2 exp(-2 · L · (e_rep - e_rob)²)
          </p>
        </div>
        <span className="text-[11px] font-mono text-indigo-400">
          Asymptotic Convergence
        </span>
      </div>

      <div className="h-60 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={HOEFFDING_CURVE_DATA} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis
              dataKey="length"
              stroke="#64748b"
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              label={{ value: 'Bit Length (L)', position: 'insideBottom', offset: -4, fill: '#64748b', fontSize: 10 }}
            />
            <YAxis
              stroke="#64748b"
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              domain={[0.8, 1.0]}
              tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#090d16',
                borderColor: '#1e293b',
                borderRadius: '6px',
                fontSize: '12px',
              }}
              formatter={(value: any, _: string, props: any) => [
                `${(Number(value) * 100).toFixed(4)}% (P_fail: ${props?.payload?.failureProb})`,
                'Security Level',
              ]}
            />
            <Line
              type="monotone"
              dataKey="security"
              stroke="#818cf8"
              strokeWidth={2.5}
              dot={{ fill: '#818cf8', r: 4 }}
              activeDot={{ r: 6, fill: '#a5b4fc' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
