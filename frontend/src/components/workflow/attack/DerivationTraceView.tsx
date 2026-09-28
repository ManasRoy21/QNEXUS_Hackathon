'use client';

import React, { useMemo } from 'react';
import { InlineMath, MathBlock, formatScientific } from '@/components/common/MathBlock';

interface DerivationTraceViewProps {
  intermediateCalculation: string;
  attackId?: string;
}

interface StepItem {
  stepNum: string;
  header?: string;
  formulaLatex?: string;
  substitutionLatex?: string;
  resultLatex?: string;
  rawText?: string;
}

/**
 * Format raw numbers with scientific notation if they match e.g. 9.406e-01 or 9.4058e-01
 */
function cleanScientific(valStr: string): string {
  if (!valStr) return '';
  const match = valStr.match(/([+-]?\d+(?:\.\d+)?)[eE]([+-]?\d+)/);
  if (match) {
    const mantissa = parseFloat(match[1]).toString();
    const exp = parseInt(match[2], 10);
    return `${mantissa} \\times 10^{${exp}}`;
  }
  return valStr;
}

/**
 * Parse the intermediate calculation string into structured steps
 */
function parseTraceSteps(raw: string): StepItem[] {
  if (!raw) return [];

  // Split by "Step <number>:"
  const rawSteps = raw.split(/(?=Step\s+\d+:)/g).filter((s) => s.trim().length > 0);

  return rawSteps.map((chunk) => {
    const match = chunk.match(/^Step\s+(\d+):\s*([\s\S]*)$/);
    if (!match) {
      return { stepNum: '', rawText: chunk.trim() };
    }

    const stepNum = `Step ${match[1]}`;
    const body = match[2].trim();
    const lines = body.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);

    // ── Forgery specific parsing ──
    // Step 1: QBER_bob = 0.037040
    if (/^QBER_bob\s*=\s*([\d.]+)/i.test(body)) {
      const val = body.match(/=\s*([\d.]+)/)?.[1] || '';
      return {
        stepNum,
        formulaLatex: `\\text{QBER}_B = ${val}`,
      };
    }

    // Step 2: H(QBER) = 0.228552
    if (/^H\(QBER\)\s*=\s*([\d.]+)/i.test(body)) {
      const val = body.match(/=\s*([\d.]+)/)?.[1] || '';
      return {
        stepNum,
        formulaLatex: `H(\\text{QBER}_B) = ${val}`,
      };
    }

    // Step 3: I(B:C) = 1 - H(QBER) = 0.000000
    if (/^I\(B:C\)/i.test(body)) {
      const val = body.split('=').pop()?.trim() || '';
      return {
        stepNum,
        formulaLatex: `I(B:C) = 1 - H(\\text{QBER}_B) = ${val}`,
      };
    }

    // Step 4: Solve H(S_c) = 1 - I(B:C) → S_c = 0.500000
    if (/H\(S_c\)/i.test(body) || /S_c/i.test(body)) {
      const scVal = body.match(/S_c\s*=\s*([\d.]+)/i)?.[1] || '';
      return {
        stepNum,
        formulaLatex: `H(S_C) = 1 - I(B:C) \\implies S_C = ${scVal}`,
      };
    }

    // Step 5: P_C^c = 34 / 2000 = 0.017000
    if (/P_C\^?c/i.test(body) && body.includes('/')) {
      const parts = body.split('=').map((p) => p.trim());
      const fracPart = parts.find((p) => p.includes('/')) || '';
      const [num, denom] = fracPart.split('/').map((s) => s.trim());
      const finalVal = parts[parts.length - 1];
      return {
        stepNum,
        formulaLatex: `P_{C^c} = \\frac{${num}}{${denom}} = ${finalVal}`,
      };
    }

    // Step 6: Exponent calculation (multi-line)
    if (/^exponent\s*=/i.test(lines[0])) {
      const finalVal = lines[lines.length - 1].replace(/^=\s*/, '').trim();
      return {
        stepNum,
        header: 'Chernoff Exponent Calculation:',
        formulaLatex: `\\text{Exponent} = -\\frac{(S_C - T_V)^2}{2 S_C} \\cdot P_{C^c} \\cdot M_u`,
        resultLatex: `= ${finalVal}`,
      };
    }

    // Step 7: ε₁ = exp(...) = 9.4058e-01
    if (/(?:ε₁|epsilon_1)\s*=/i.test(body)) {
      const expMatch = body.match(/exp\(([^)]+)\)/i)?.[1] || '';
      const finalPart = body.split('=').pop()?.trim() || '';
      const formattedFinal = cleanScientific(finalPart);
      return {
        stepNum,
        formulaLatex: `\\varepsilon_1 = \\exp(${expMatch}) = ${formattedFinal}`,
      };
    }

    // ── Repudiation specific parsing ──
    // Step 1: T_v = 0.0645, T_a = 0.0150, Δ = 0.000000
    if (/T_v\s*=/i.test(body) && /T_a\s*=/i.test(body)) {
      const tv = body.match(/T_v\s*=\s*([\d.]+)/i)?.[1] || '';
      const ta = body.match(/T_a\s*=\s*([\d.]+)/i)?.[1] || '';
      const delta = body.match(/[ΔDelta]\s*=\s*([\d.]+)/i)?.[1] || '0.000000';
      return {
        stepNum,
        formulaLatex: `T_V = ${tv},\\quad T_A = ${ta},\\quad \\Delta = ${delta}`,
      };
    }

    // Step 2: gap = T_v - T_a - Δ = ...
    if (/gap\s*=/i.test(body)) {
      const finalGap = body.split('=').pop()?.trim() || '';
      return {
        stepNum,
        formulaLatex: `\\text{gap} = T_V - T_A - \\Delta = ${finalGap}`,
      };
    }

    // Step 3: M_u = 128, β = 0.30, n_test = 55
    if (/M_u\s*=/i.test(body) && /n_test\s*=/i.test(body)) {
      const mu = body.match(/M_u\s*=\s*(\d+)/i)?.[1] || '';
      const beta = body.match(/[βbeta]\s*=\s*([\d.]+)/i)?.[1] || '';
      const nTest = body.match(/n_test\s*=\s*(\d+)/i)?.[1] || '';
      return {
        stepNum,
        formulaLatex: `M_u = ${mu},\\quad \\beta = ${beta},\\quad n_{\\text{test}} = ${nTest}`,
      };
    }

    // Step 4 (Repudiation exponent): exponent = -2·gap²·M_u²·β² / n_test
    if (/exponent.*gap/i.test(chunk)) {
      const finalVal = lines[lines.length - 1].replace(/^=\s*/, '').trim();
      return {
        stepNum,
        header: 'Repudiation Exponent Calculation:',
        formulaLatex: `\\text{Exponent} = -\\frac{2(T_V - T_A - \\Delta)^2 M_u^2 \\beta^2}{n_{\\text{test}}}`,
        resultLatex: `= ${finalVal}`,
      };
    }

    // Step 5 (Repudiation): ε₂ = exp(...) = ...
    if (/(?:ε₂|epsilon_2)\s*=/i.test(body)) {
      const expMatch = body.match(/exp\(([^)]+)\)/i)?.[1] || '';
      const finalPart = body.split('=').pop()?.trim() || '';
      const formattedFinal = cleanScientific(finalPart);
      return {
        stepNum,
        formulaLatex: `\\varepsilon_2 = \\exp(${expMatch}) = ${formattedFinal}`,
      };
    }

    // ── Eavesdropping specific parsing ──
    // Step 1: QBER_base = 0.010000 (from simulation)
    if (/QBER_base\s*=/i.test(body)) {
      const val = body.match(/QBER_base\s*=\s*([\d.]+)/i)?.[1] || '';
      return {
        stepNum,
        formulaLatex: `\\text{QBER}_{\\text{base}} = ${val}\\quad \\text{(from simulation)}`,
      };
    }

    // Step 2: Incremental QBER = 0.5 × γ × (1 − 2 × QBER_base)
    if (/Incremental\s+QBER/i.test(body)) {
      const finalVal = lines[lines.length - 1].replace(/^=\s*/, '').trim();
      return {
        stepNum,
        header: 'Incremental Channel Disturbance:',
        formulaLatex: `\\Delta\\text{QBER} = 0.5\\,\\gamma\\,(1 - 2\\,\\text{QBER}_{\\text{base}})`,
        resultLatex: `= ${finalVal}`,
      };
    }

    // Step 3: QBER_obs = 0.010000 + 0.035000 = 0.045000
    if (/QBER_obs\s*=/i.test(body) && body.includes('+')) {
      const finalVal = body.split('=').pop()?.trim() || '';
      return {
        stepNum,
        formulaLatex: `e_{\\text{obs}} = \\text{QBER}_{\\text{base}} + \\Delta\\text{QBER} = ${finalVal}`,
      };
    }

    // Step 4: Compare QBER_obs vs T_a
    if (/Compare\s+QBER_obs/i.test(body)) {
      const qobs = body.match(/QBER_obs\s*\(([\d.]+)\)/i)?.[1] || '';
      const ta = body.match(/T_a\s*\(([\d.]+)\)/i)?.[1] || '';
      return {
        stepNum,
        formulaLatex: `\\text{Compare: } e_{\\text{obs}} = ${qobs}\\quad \\text{vs}\\quad T_A = ${ta}`,
      };
    }

    // Step 5: ABORT / CONTINUE
    if (/ABORT|CONTINUE/i.test(body)) {
      return {
        stepNum,
        rawText: body,
      };
    }

    // General fallback
    return {
      stepNum,
      rawText: body,
    };
  });
}

export const DerivationTraceView: React.FC<DerivationTraceViewProps> = ({
  intermediateCalculation,
}) => {
  const steps = useMemo(() => {
    return parseTraceSteps(intermediateCalculation);
  }, [intermediateCalculation]);

  if (!intermediateCalculation) return null;

  return (
    <div className="space-y-2">
      <span className="text-[10px] text-[#94A3B8] font-mono uppercase tracking-wider block">
        Step-by-Step Derivation Trace:
      </span>

      <div className="bg-[#030d22] border border-slate-800 rounded-xl p-3.5 space-y-2.5">
        {steps.map((item, idx) => {
          const isAbort = item.rawText?.includes('ABORT');
          const isContinue = item.rawText?.includes('CONTINUE');

          return (
            <div
              key={idx}
              className="flex flex-col sm:flex-row sm:items-baseline gap-2 py-1.5 px-2.5 rounded-lg bg-slate-900/70 border border-slate-800/80 transition-colors hover:border-slate-700 text-xs font-mono"
            >
              {item.stepNum && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider bg-[#071842] text-[#20C8A7] border border-[#20C8A7]/30 shrink-0 self-start">
                  {item.stepNum}
                </span>
              )}

              <div className="flex-1 overflow-x-auto min-w-0">
                {item.header && (
                  <span className="text-[11px] text-[#94A3B8] block mb-1">{item.header}</span>
                )}

                {item.formulaLatex && (
                  <div className="text-[#E2E8F0] font-medium py-0.5">
                    <InlineMath math={item.formulaLatex} />
                    {item.resultLatex && (
                      <span className="ml-2 font-bold text-[#20C8A7]">
                        <InlineMath math={item.resultLatex} />
                      </span>
                    )}
                  </div>
                )}

                {item.rawText && (
                  <div
                    className={`text-[11px] font-semibold ${
                      isAbort
                        ? 'text-rose-400 bg-rose-950/40 p-1.5 rounded border border-rose-800/50'
                        : isContinue
                        ? 'text-emerald-400 bg-emerald-950/40 p-1.5 rounded border border-emerald-800/50'
                        : 'text-slate-300'
                    }`}
                  >
                    {item.rawText}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DerivationTraceView;
