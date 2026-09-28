'use client';

import React from 'react';
import { InlineMath } from '@/components/common/MathBlock';
import { AlertTriangle, CheckCircle, Info } from 'lucide-react';

interface InterpretationViewProps {
  interpretation: string;
}

/**
 * Format scientific notation in text e.g. 9.406e-01 -> 9.406 \times 10^{-1}
 */
function formatExp(numStr: string): string {
  const match = numStr.match(/([+-]?\d+(?:\.\d+)?)[eE]([+-]?\d+)/);
  if (match) {
    const mantissa = parseFloat(match[1]).toString();
    const exp = parseInt(match[2], 10);
    return `${mantissa} \\times 10^{${exp}}`;
  }
  return numStr;
}

export const InterpretationView: React.FC<InterpretationViewProps> = ({ interpretation }) => {
  if (!interpretation) return null;

  const hasWarning = interpretation.includes('WARNING:');

  // ── Case 1: Forgery with Warning ──
  // "The forgery probability ε₁ = 9.406e-01. WARNING: S_c ≤ T_v — conclusive-bit overlap is too high to bound forgery. Security parameters require adjustment."
  if (hasWarning && /forgery/i.test(interpretation)) {
    const valMatch = interpretation.match(/(?:ε₁|epsilon_1)\s*=\s*([0-9.e+-]+)/i);
    const rawVal = valMatch ? valMatch[1] : '';
    const formattedVal = formatExp(rawVal);

    return (
      <div className="space-y-2 pt-1 font-mono text-xs">
        {/* Metric Value */}
        <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-700/80 flex items-center justify-between">
          <span className="text-[#94A3B8]">Forgery probability:</span>
          <span className="text-[#20C8A7] font-bold text-sm">
            <InlineMath math={`\\varepsilon_1 = ${formattedVal}`} />
          </span>
        </div>

        {/* Warning Banner */}
        <div className="bg-amber-950/30 border border-amber-500/40 rounded-lg p-3 text-amber-200 space-y-1.5">
          <div className="flex items-center space-x-2 text-amber-400 font-bold">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span className="uppercase text-[10px] tracking-wider">Warning:</span>
            <span className="text-white">
              <InlineMath math="S_C \leq T_V" />
            </span>
          </div>
          <p className="text-[11px] text-amber-200/90 leading-relaxed font-sans">
            Conclusive-bit overlap is too high to establish a useful forgery bound. Security parameters require adjustment.
          </p>
        </div>
      </div>
    );
  }

  // ── Case 2: Repudiation with Warning ──
  // "The repudiation probability ε₂ = 1.000e+00. WARNING: threshold gap T_v − T_a − Δ ≤ 0 — repudiation bound is vacuous. Review security parameters."
  if (hasWarning && /repudiation/i.test(interpretation)) {
    const valMatch = interpretation.match(/(?:ε₂|epsilon_2)\s*=\s*([0-9.e+-]+)/i);
    const rawVal = valMatch ? valMatch[1] : '';
    const formattedVal = formatExp(rawVal);

    return (
      <div className="space-y-2 pt-1 font-mono text-xs">
        <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-700/80 flex items-center justify-between">
          <span className="text-[#94A3B8]">Repudiation probability:</span>
          <span className="text-[#20C8A7] font-bold text-sm">
            <InlineMath math={`\\varepsilon_2 = ${formattedVal}`} />
          </span>
        </div>

        <div className="bg-amber-950/30 border border-amber-500/40 rounded-lg p-3 text-amber-200 space-y-1.5">
          <div className="flex items-center space-x-2 text-amber-400 font-bold">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span className="uppercase text-[10px] tracking-wider">Warning:</span>
            <span className="text-white">
              <InlineMath math="T_V - T_A - \Delta \leq 0" />
            </span>
          </div>
          <p className="text-[11px] text-amber-200/90 leading-relaxed font-sans">
            Threshold gap is non-positive; repudiation bound is vacuous. Adjust verification or authentication thresholds.
          </p>
        </div>
      </div>
    );
  }

  // ── Case 3: Forgery Normal Guarantee ──
  if (/forgery/i.test(interpretation) && !hasWarning) {
    const valMatch = interpretation.match(/(?:ε₁|epsilon_1)\s*=\s*([0-9.e+-]+)/i);
    const rawVal = valMatch ? valMatch[1] : '';
    const formattedVal = formatExp(rawVal);

    return (
      <div className="space-y-2 pt-1 font-mono text-xs">
        <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-700/80 flex items-center justify-between">
          <span className="text-[#94A3B8]">Forgery probability:</span>
          <span className="text-[#20C8A7] font-bold text-sm">
            <InlineMath math={`\\varepsilon_1 = ${formattedVal}`} />
          </span>
        </div>

        <div className="bg-emerald-950/30 border border-emerald-500/40 rounded-lg p-3 text-emerald-200 flex items-start space-x-2">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <p className="text-[11px] text-emerald-200 leading-relaxed font-sans">
            Protocol provides quantitative unforgeability guarantee (
            <InlineMath math="\varepsilon_1 \ll 1" />
            ). Counterfeit signatures will be rejected by verifiers.
          </p>
        </div>
      </div>
    );
  }

  // ── Case 4: Repudiation Normal Guarantee ──
  if (/repudiation/i.test(interpretation) && !hasWarning) {
    const valMatch = interpretation.match(/(?:ε₂|epsilon_2)\s*=\s*([0-9.e+-]+)/i);
    const rawVal = valMatch ? valMatch[1] : '';
    const formattedVal = formatExp(rawVal);

    return (
      <div className="space-y-2 pt-1 font-mono text-xs">
        <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-700/80 flex items-center justify-between">
          <span className="text-[#94A3B8]">Repudiation probability:</span>
          <span className="text-[#20C8A7] font-bold text-sm">
            <InlineMath math={`\\varepsilon_2 = ${formattedVal}`} />
          </span>
        </div>

        <div className="bg-emerald-950/30 border border-emerald-500/40 rounded-lg p-3 text-emerald-200 flex items-start space-x-2">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <p className="text-[11px] text-emerald-200 leading-relaxed font-sans">
            Protocol provides non-repudiation guarantee (
            <InlineMath math="\varepsilon_2 \ll 1" />
            ). Verifiers achieve consensus on message authenticity.
          </p>
        </div>
      </div>
    );
  }

  // ── Case 5: Eavesdropping (γ and QBER) ──
  if (/γ|QBER/i.test(interpretation)) {
    const isDetected = /exceeds/i.test(interpretation) || /aborted/i.test(interpretation);
    const qberObsMatch = interpretation.match(/observed\s+QBER\s*=\s*([\d.]+)/i);
    const taMatch = interpretation.match(/T_a\s*=\s*([\d.]+)/i);

    return (
      <div className="space-y-2 pt-1 font-mono text-xs">
        <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-700/80 flex items-center justify-between">
          <span className="text-[#94A3B8]">Observed Channel Error:</span>
          <span className="text-[#20C8A7] font-bold text-sm">
            {qberObsMatch && <InlineMath math={`e_{\\text{obs}} = ${qberObsMatch[1]}`} />}
            {taMatch && (
              <span className="text-slate-400 text-xs ml-2">
                (<InlineMath math={`T_A = ${taMatch[1]}`} />)
              </span>
            )}
          </span>
        </div>

        <div
          className={`rounded-lg p-3 flex items-start space-x-2 border text-xs font-sans ${
            isDetected
              ? 'bg-rose-950/30 border-rose-500/40 text-rose-200'
              : 'bg-blue-950/30 border-blue-500/40 text-blue-200'
          }`}
        >
          {isDetected ? (
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          ) : (
            <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
          )}
          <p className="leading-relaxed">{interpretation}</p>
        </div>
      </div>
    );
  }

  // Default fallback
  return (
    <div className="bg-slate-900/80 text-[#CBD5E1] p-3 rounded-lg border border-slate-700/60 font-mono text-xs">
      {interpretation}
    </div>
  );
};

export default InterpretationView;
