'use client';

import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  CartesianGrid,
} from 'recharts';
import { QBERHistoryPoint } from '@/types';

interface QBERChartProps {
  history?: QBERHistoryPoint[];
  currentQBER?: number | null;
  e_rob?: number | null;
  e_rep?: number | null;
  e_forg?: number | null;
}

export default function QBERChart({
  history = [],
  currentQBER,
  e_rob = 0.0658,
  e_rep = 0.1358,
  e_forg = 0.2058,
}: QBERChartProps) {
  const chartData = useMemo(() => {
    if (history && history.length > 0) return history;

    return [
      { time: 'T-4', qber: 0.005, e_rob: 0.0658, e_rep: 0.1358, threat: 'CLEAN' },
      { time: 'T-3', qber: 0.012, e_rob: 0.0658, e_rep: 0.1358, threat: 'CLEAN' },
      { time: 'T-2', qber: 0.008, e_rob: 0.0658, e_rep: 0.1358, threat: 'CLEAN' },
      { time: 'T-1', qber: 0.015, e_rob: 0.0658, e_rep: 0.1358, threat: 'CLEAN' },
      {
        time: 'Now',
        qber: currentQBER !== null && currentQBER !== undefined ? currentQBER : 0.01,
        e_rob: e_rob ?? 0.0658,
        e_rep: e_rep ?? 0.1358,
        threat: currentQBER && e_rep && currentQBER > e_rep ? 'EAVESDROP' : 'CLEAN',
      },
    ];
  }, [history, currentQBER, e_rob, e_rep]);

  const erobVal = e_rob ?? 0.0658;
  const erepVal = e_rep ?? 0.1358;

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E2E8F0] pb-3">
        <div>
          <h3 className="text-xs font-mono font-bold text-[#64748B] uppercase tracking-wider">
            REAL-TIME QBER VS HOEFFDING BOUNDS
          </h3>
          <p className="text-[11px] text-[#071842] font-mono font-semibold">
            Born-Rule Error Rate vs e_rob (6.58%) &amp; e_rep (13.58%)
          </p>
        </div>
        <div className="flex items-center space-x-3 text-[10px] font-mono">
          <span className="flex items-center space-x-1.5 text-[#071842]">
            <span className="h-1 w-3 bg-[#071842] inline-block rounded" />
            <span className="font-bold">QBER Trace</span>
          </span>
          <span className="flex items-center space-x-1.5 text-emerald-600">
            <span className="h-1 w-3 bg-emerald-500 inline-block rounded" />
            <span className="font-semibold">e_rob ({(erobVal * 100).toFixed(1)}%)</span>
          </span>
          <span className="flex items-center space-x-1.5 text-rose-600">
            <span className="h-1 w-3 bg-rose-500 inline-block rounded" />
            <span className="font-semibold">e_rep ({(erepVal * 100).toFixed(1)}%)</span>
          </span>
        </div>
      </div>

      <div className="h-64 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 15, right: 25, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
            <XAxis
              dataKey="time"
              stroke="#94A3B8"
              tick={{ fontSize: 11, fill: '#475569', fontFamily: 'JetBrains Mono' }}
            />
            <YAxis
              stroke="#94A3B8"
              tick={{ fontSize: 11, fill: '#475569', fontFamily: 'JetBrains Mono' }}
              domain={[0, Math.max(0.25, (currentQBER || 0) + 0.05)]}
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
              formatter={(value: any, name: string) => [
                `${(Number(value) * 100).toFixed(2)}%`,
                name === 'qber' ? 'Observed QBER' : name,
              ]}
            />
            <ReferenceLine
              y={erobVal}
              stroke="#10B981"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{
                value: `e_rob (${(erobVal * 100).toFixed(1)}%)`,
                fill: '#10B981',
                fontSize: 10,
                position: 'right',
                fontFamily: 'JetBrains Mono',
              }}
            />
            <ReferenceLine
              y={erepVal}
              stroke="#E11D48"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{
                value: `e_rep (${(erepVal * 100).toFixed(1)}%)`,
                fill: '#E11D48',
                fontSize: 10,
                position: 'right',
                fontFamily: 'JetBrains Mono',
              }}
            />
            <Line
              type="monotone"
              dataKey="qber"
              stroke="#071842"
              strokeWidth={2.5}
              dot={{ fill: '#071842', r: 4 }}
              activeDot={{ r: 6, fill: '#20C8A7' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
