'use client';

import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { HistogramDataPoint } from '@/types';

interface LiveHistogramProps {
  qber?: number | null;
  shots?: number;
  postselectedShots?: number;
  customData?: HistogramDataPoint[];
}

export default function LiveHistogram({
  qber,
  shots = 4096,
  postselectedShots,
  customData,
}: LiveHistogramProps) {
  const chartData = useMemo(() => {
    if (customData && customData.length > 0) return customData;

    const effectiveShots = postselectedShots ?? shots;
    const errorRate = qber !== null && qber !== undefined ? Math.min(Math.max(qber, 0), 1) : 0.01;
    const correctShots = Math.round(effectiveShots * (1 - errorRate));
    const errorShots = Math.round(effectiveShots * errorRate);

    return [
      { state: '|00⟩ (Correlated)', count: Math.round(correctShots * 0.51), type: 'correlated' },
      { state: '|01⟩ (Error)', count: Math.round(errorShots * 0.49), type: 'error' },
      { state: '|10⟩ (Error)', count: Math.round(errorShots * 0.51), type: 'error' },
      { state: '|11⟩ (Correlated)', count: Math.round(correctShots * 0.49), type: 'correlated' },
    ];
  }, [customData, qber, shots, postselectedShots]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div>
          <h3 className="text-xs font-mono font-medium text-slate-400 uppercase tracking-wider">
            Bell State Measurement Histogram
          </h3>
          <p className="text-[11px] text-slate-500 font-mono">
            {postselectedShots ? `${postselectedShots} Postselected Shots` : `${shots} Raw Aer Shots`}
          </p>
        </div>
        <div className="flex items-center space-x-3 text-[11px] font-mono">
          <span className="flex items-center space-x-1">
            <span className="h-2 w-2 rounded-sm bg-cyan-400 inline-block" />
            <span className="text-slate-400">Correlated</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="h-2 w-2 rounded-sm bg-rose-400 inline-block" />
            <span className="text-slate-400">Errors (Bit/Phase)</span>
          </span>
        </div>
      </div>

      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <XAxis dataKey="state" stroke="#64748b" tick={{ fontSize: 11, fill: '#94a3b8' }} />
            <YAxis stroke="#64748b" tick={{ fontSize: 11, fill: '#94a3b8' }} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#090d16',
                borderColor: '#1e293b',
                borderRadius: '6px',
                fontSize: '12px',
              }}
              formatter={(value: any) => [`${value} shots`, 'Counts']}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={(entry as any).type === 'error' ? '#f43f5e' : '#22d3ee'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
