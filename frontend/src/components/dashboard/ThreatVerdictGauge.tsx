'use client';

import React from 'react';
import { SecurityVerdict, ThreatSeverity } from '@/types';
import { ShieldCheck, AlertOctagon, CheckCircle2, Cpu } from 'lucide-react';

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
      <div className="flex flex-col items-center justify-center p-8 space-y-3 min-h-[240px]">
        <div className="h-10 w-10 border-4 border-[#071842]/20 border-t-[#20C8A7] rounded-full animate-spin" />
        <span className="text-xs text-[#071842] font-mono font-semibold animate-pulse uppercase tracking-wider">
          Evaluating Hoeffding Bounds &amp; Pauli States...
        </span>
      </div>
    );
  }

  if (!verdict) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-3 min-h-[240px] text-center">
        <div className="h-12 w-12 rounded-full bg-[#F1F5F9] border border-[#CBD5E1] flex items-center justify-center text-[#071842] text-xl font-serif">
          Ψ
        </div>
        <div>
          <span className="text-sm font-bold text-[#071842] font-grotesk block">
            Hoeffding Engine Standby
          </span>
          <p className="text-xs text-[#64748B] max-w-xs mt-1 font-sans">
            Execute a quantum signature verification to compute physical channel QBER and Born-rule bounds.
          </p>
        </div>
      </div>
    );
  }

  const isSecure = verdict === 'SECURE';
  const qberPct = qber !== null && qber !== undefined ? (qber * 100).toFixed(2) : null;
  const erobPct = e_rob !== null && e_rob !== undefined ? (e_rob * 100).toFixed(2) : null;
  const fidelityPct = fidelity !== null && fidelity !== undefined ? (fidelity * 100).toFixed(1) : null;

  const severityStyles: Record<string, { badge: string; label: string }> = {
    LOW: {
      badge: 'bg-emerald-50 text-emerald-700 border-emerald-300',
      label: 'LOW SEVERITY',
    },
    MEDIUM: {
      badge: 'bg-amber-50 text-amber-700 border-amber-300',
      label: 'MEDIUM SEVERITY',
    },
    HIGH: {
      badge: 'bg-orange-50 text-orange-700 border-orange-300',
      label: 'HIGH SEVERITY',
    },
    CRITICAL: {
      badge: 'bg-rose-50 text-rose-700 border-rose-300 animate-pulse font-black',
      label: 'CRITICAL BREACH',
    },
  };

  const sevClass = severityStyles[severity?.toUpperCase() || 'LOW'] || severityStyles.LOW;

  return (
    <div className="flex flex-col justify-between space-y-4">
      {/* Top Category Tag */}
      <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3 text-xs font-mono">
        <div className="flex items-center space-x-2">
          <span className="font-bold text-[#64748B] uppercase tracking-wider">
            SECURITY VERDICT
          </span>
        </div>
        <span className={`px-2 py-0.5 rounded border text-[10px] font-mono font-bold uppercase tracking-wider ${sevClass.badge}`}>
          {sevClass.label}
        </span>
      </div>

      {/* Main Verdict Display Banner */}
      <div
        className={`p-5 rounded-xl border text-center transition-all ${
          isSecure
            ? 'bg-[#E6FBF7] border-[#20C8A7] text-[#071842]'
            : 'bg-rose-50 border-rose-300 text-rose-950'
        }`}
      >
        <div className="flex items-center justify-center space-x-2">
          {isSecure ? (
            <CheckCircle2 className="w-6 h-6 text-[#20C8A7]" />
          ) : (
            <AlertOctagon className="w-6 h-6 text-rose-600 animate-bounce" />
          )}
          <span className="font-serif text-2xl sm:text-3xl font-bold tracking-tight">
            {verdict}
          </span>
        </div>
        <div className="text-xs font-mono font-semibold mt-1 tracking-wider uppercase opacity-80">
          {isSecure ? 'Physical Channel Verified • ITS Certified' : `BREACH DETECTED: ${primaryAttackVector}`}
        </div>
      </div>

      {/* Precision Metric Readout Grid */}
      <div className="grid grid-cols-3 gap-2.5 w-full text-center font-mono">
        <div className="p-3 rounded-lg bg-[#F8FAF9] border border-[#E2E8F0]">
          <div className="text-[10px] text-[#64748B] uppercase font-semibold">QBER</div>
          <div
            className={`text-base sm:text-lg font-bold mt-0.5 ${
              qber && e_rob && qber > e_rob ? 'text-rose-600 font-black' : 'text-[#071842]'
            }`}
          >
            {qberPct !== null ? `${qberPct}%` : '0.00%'}
          </div>
        </div>

        <div className="p-3 rounded-lg bg-[#F8FAF9] border border-[#E2E8F0]">
          <div className="text-[10px] text-[#64748B] uppercase font-semibold">e_rob Bound</div>
          <div className="text-base sm:text-lg font-bold text-[#071842] mt-0.5">
            {erobPct !== null ? `≤ ${erobPct}%` : '6.58%'}
          </div>
        </div>

        <div className="p-3 rounded-lg bg-[#F8FAF9] border border-[#E2E8F0]">
          <div className="text-[10px] text-[#64748B] uppercase font-semibold">Fidelity</div>
          <div className="text-base sm:text-lg font-bold text-[#20C8A7] mt-0.5">
            {fidelityPct !== null ? `${fidelityPct}%` : '100%'}
          </div>
        </div>
      </div>
    </div>
  );
}
