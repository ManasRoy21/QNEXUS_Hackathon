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
import { InlineMath } from '@/components/common/MathBlock';

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E2E8F0] pb-3">
        <div>
          <h3 className="text-xs font-mono font-bold text-[#64748B] uppercase tracking-wider">
            SECURITY CONVERGENCE VS LENGTH (L)
          </h3>
          <div className="text-[11px] text-[#071842] py-0.5">
            <InlineMath math="P(\text{Failure}) \leq 2 \exp\left(-2 L (e_{\text{rep}} - e_{\text{rob}})^2\right)" />
          </div>
        </div>
        <span className="text-[11px] font-mono font-bold text-[#263EDC] bg-[#EFF4FF] px-2.5 py-0.5 rounded border border-[#CBD5E1]">
          Exponential Hoeffding Decay
        </span>
      </div>

      <div className="h-64 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={HOEFFDING_CURVE_DATA} margin={{ top: 15, right: 25, left: -20, bottom: 15 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
            <XAxis
              dataKey="length"
              stroke="#94A3B8"
              tick={{ fontSize: 11, fill: '#475569', fontFamily: 'JetBrains Mono' }}
              label={{
                value: 'Digest Bit Length (L)',
                position: 'insideBottom',
                offset: -8,
                fill: '#64748B',
                fontSize: 10,
                fontFamily: 'JetBrains Mono',
              }}
            />
            <YAxis
              stroke="#94A3B8"
              tick={{ fontSize: 11, fill: '#475569', fontFamily: 'JetBrains Mono' }}
              domain={[0.8, 1.0]}
              tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#071842',
                borderColor: '#1D293D',
                borderRadius: '8px',
                color: '#FFFFFF',
                fontFamily: 'JetBrains Mono',
                fontSize: '12px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
              }}
              formatter={(value: any, _: string, props: any) => [
                `${(Number(value) * 100).toFixed(4)}% (P_fail: ${props?.payload?.failureProb})`,
                'Information-Theoretic Security',
              ]}
            />
            <Line
              type="monotone"
              dataKey="security"
              stroke="#263EDC"
              strokeWidth={2.5}
              dot={{ fill: '#263EDC', r: 4 }}
              activeDot={{ r: 6, fill: '#20C8A7' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
