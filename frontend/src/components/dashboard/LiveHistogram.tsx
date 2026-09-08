'use client';

import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';
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
      <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
        <div>
          <h3 className="text-xs font-mono font-bold text-[#64748B] uppercase tracking-wider">
            BELL MEASUREMENT HISTOGRAM
          </h3>
          <p className="text-[11px] text-[#071842] font-mono font-medium">
            {postselectedShots ? `${postselectedShots} Postselected Samples` : `${shots} Raw Aer Shots`}
          </p>
        </div>
        <div className="flex items-center space-x-3 text-[11px] font-mono">
          <span className="flex items-center space-x-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-[#071842] inline-block" />
            <span className="text-[#475569]">Correlated</span>
          </span>
          <span className="flex items-center space-x-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-rose-500 inline-block" />
            <span className="text-[#475569]">Errors (QBER)</span>
          </span>
        </div>
      </div>

      <div className="h-60 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
            <XAxis
              dataKey="state"
              stroke="#94A3B8"
              tick={{ fontSize: 11, fill: '#475569', fontFamily: 'JetBrains Mono' }}
            />
            <YAxis
              stroke="#94A3B8"
              tick={{ fontSize: 11, fill: '#475569', fontFamily: 'JetBrains Mono' }}
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
              formatter={(value: any) => [`${value} shots`, 'Detected Outcomes']}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={(entry as any).type === 'error' ? '#E11D48' : '#071842'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
