'use client';

import React from 'react';
import { SecurityVerdict, ThreatSeverity } from '@/types';

interface ThreatVerdictGaugeProps {
  verdict?: SecurityVerdict | string | null;
  severity?: ThreatSeverity | string | null;
  qber?: number | null;
  e_rob?: number | null;
  primaryAttackVector?: string | null;
  fidelity?: number | null;
  loading?: boolean;
}

export default function ThreatVerdictGauge({
  verdict,
  severity = 'LOW',
  qber,
  e_rob,
  primaryAttackVector = 'CLEAN',
  fidelity,
  loading = false,
}: ThreatVerdictGaugeProps) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-6 space-y-3 min-h-[220px]">
        <div className="h-10 w-10 border-4 border-cyan-500/20 border-t-cyan-400 rounded-full animate-spin" />
        <span className="text-sm text-cyan-300 font-mono animate-pulse">
          Evaluating Hoeffding Bounds...
        </span>
      </div>
    );
  }

  if (!verdict) {
    return (
      <div className="flex flex-col items-center justify-center p-6 space-y-2 min-h-[220px] text-center">
        <div className="h-12 w-12 rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-400 text-xl font-mono">
          Ψ
        </div>
        <span className="text-sm font-semibold text-slate-300">Engine Standby</span>
        <p className="text-xs text-slate-500 max-w-xs">
          Execute a signature verification or attack injection to evaluate quantum channel security.
        </p>
      </div>
    );
  }

  const isSecure = verdict === 'SECURE';
  const qberPct = qber !== null && qber !== undefined ? (qber * 100).toFixed(2) : null;
  const erobPct = e_rob !== null && e_rob !== undefined ? (e_rob * 100).toFixed(2) : null;
  const fidelityPct = fidelity !== null && fidelity !== undefined ? (fidelity * 100).toFixed(1) : null;

  const severityColors: Record<string, string> = {
    LOW: 'text-emerald-400 bg-emerald-950/60 border-emerald-800/80',
    MEDIUM: 'text-amber-400 bg-amber-950/60 border-amber-800/80',
    HIGH: 'text-orange-400 bg-orange-950/60 border-orange-800/80',
    CRITICAL: 'text-rose-400 bg-rose-950/60 border-rose-800/80 animate-pulse',
  };

  const sevClass = severityColors[severity?.toUpperCase() || 'LOW'] || severityColors.LOW;

  return (
    <div className="flex flex-col items-center justify-between p-4 space-y-4">
      <div className="w-full flex items-center justify-between text-xs text-slate-400 font-mono border-b border-slate-800 pb-2">
        <span>SECURITY VERDICT</span>
        <span className={`px-2 py-0.5 rounded border text-[11px] font-bold ${sevClass}`}>
          {severity?.toUpperCase() || 'LOW'} SEVERITY
        </span>
      </div>

      <div
        className={`w-full py-4 px-3 rounded-lg border text-center font-black tracking-wider transition-all duration-300 ${
          isSecure
            ? 'bg-emerald-950/50 border-emerald-600/70 text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.15)]'
            : 'bg-rose-950/50 border-rose-600/70 text-rose-300 shadow-[0_0_20px_rgba(244,63,94,0.2)]'
        }`}
      >
        <div className="text-2xl font-black">{verdict}</div>
        <div className="text-xs font-mono font-medium mt-1 opacity-90">
          {isSecure ? 'No Physical Anomaly Detected' : `VECTOR: ${primaryAttackVector}`}
        </div>
      </div>

      {/* Metric Readout Grid */}
      <div className="grid grid-cols-3 gap-2 w-full text-center">
        <div className="p-2 rounded bg-slate-950 border border-slate-800/80">
          <div className="text-[10px] text-slate-400 uppercase font-mono">QBER</div>
          <div
            className={`text-sm font-bold font-mono ${
              qber && e_rob && qber > e_rob ? 'text-rose-400 font-black' : 'text-slate-200'
            }`}
          >
            {qberPct !== null ? `${qberPct}%` : '0.00%'}
          </div>
        </div>

        <div className="p-2 rounded bg-slate-950 border border-slate-800/80">
          <div className="text-[10px] text-slate-400 uppercase font-mono">e_rob Bound</div>
          <div className="text-sm font-bold font-mono text-cyan-400">
            {erobPct !== null ? `≤ ${erobPct}%` : 'N/A'}
          </div>
        </div>

        <div className="p-2 rounded bg-slate-950 border border-slate-800/80">
          <div className="text-[10px] text-slate-400 uppercase font-mono">State Fidelity</div>
          <div className="text-sm font-bold font-mono text-emerald-400">
            {fidelityPct !== null ? `${fidelityPct}%` : '100%'}
          </div>
        </div>
      </div>
    </div>
  );
}
