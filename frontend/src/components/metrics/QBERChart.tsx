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
  // Synthesize realistic default history if empty
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
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div>
          <h3 className="text-xs font-mono font-medium text-slate-400 uppercase tracking-wider">
            Real-Time QBER vs Hoeffding Security Bounds
          </h3>
          <p className="text-[11px] text-slate-500 font-mono">
            Analytical Born-Rule Error Rate vs e_rob (6.58%) & e_rep (13.58%)
          </p>
        </div>
        <div className="flex items-center space-x-3 text-[10px] font-mono">
          <span className="flex items-center space-x-1 text-cyan-400">
            <span className="h-0.5 w-3 bg-cyan-400 inline-block" />
            <span>QBER Trace</span>
          </span>
          <span className="flex items-center space-x-1 text-emerald-400">
            <span className="h-0.5 w-3 bg-emerald-400 inline-block" />
            <span>e_rob ({(erobVal * 100).toFixed(1)}%)</span>
          </span>
          <span className="flex items-center space-x-1 text-rose-400">
            <span className="h-0.5 w-3 bg-rose-400 inline-block" />
            <span>e_rep ({(erepVal * 100).toFixed(1)}%)</span>
          </span>
        </div>
      </div>

      <div className="h-60 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 11, fill: '#94a3b8' }} />
            <YAxis
              stroke="#64748b"
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              domain={[0, Math.max(0.25, (currentQBER || 0) + 0.05)]}
              tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#090d16',
                borderColor: '#1e293b',
                borderRadius: '6px',
                fontSize: '12px',
              }}
              formatter={(value: any, name: string) => [
                `${(Number(value) * 100).toFixed(2)}%`,
                name === 'qber' ? 'Observed QBER' : name,
              ]}
            />
            {/* Reference bounds */}
            <ReferenceLine
              y={erobVal}
              stroke="#10b981"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{
                value: `e_rob (${(erobVal * 100).toFixed(1)}%)`,
                fill: '#10b981',
                fontSize: 10,
                position: 'right',
              }}
            />
            <ReferenceLine
              y={erepVal}
              stroke="#f43f5e"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{
                value: `e_rep (${(erepVal * 100).toFixed(1)}%)`,
                fill: '#f43f5e',
                fontSize: 10,
                position: 'right',
              }}
            />
            <Line
              type="monotone"
              dataKey="qber"
              stroke="#22d3ee"
              strokeWidth={2.5}
              dot={{ fill: '#22d3ee', r: 4 }}
              activeDot={{ r: 6, fill: '#67e8f9' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
