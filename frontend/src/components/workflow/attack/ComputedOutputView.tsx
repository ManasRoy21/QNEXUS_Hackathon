'use client';

import React from 'react';
import { InlineMath, formatScientific } from '@/components/common/MathBlock';

interface ComputedOutputViewProps {
  finalResult: any;
  attackId?: string;
}

export const ComputedOutputView: React.FC<ComputedOutputViewProps> = ({
  finalResult,
  attackId,
}) => {
  if (finalResult === null || finalResult === undefined) {
    return <span className="text-slate-400 font-mono">—</span>;
  }

  // ── Scalar Number Output ──
  if (typeof finalResult === 'number') {
    const formatted = formatScientific(finalResult);
    const varName =
      attackId === 'FORGERY' ? '\\varepsilon_1' : attackId === 'REPUDIATION' ? '\\varepsilon_2' : 'Result';

    return (
      <div className="inline-flex items-center space-x-2 bg-slate-900 border border-slate-700 px-3 py-1.5 rounded-lg">
        <span className="text-xs text-[#94A3B8] font-mono">Bound:</span>
        <span className="text-white font-mono font-bold text-xs">
          <InlineMath math={`${varName} = ${formatted}`} />
        </span>
      </div>
    );
  }

  // ── Object Output (e.g. Eavesdropping) ──
  if (typeof finalResult === 'object') {
    return (
      <div className="flex flex-wrap items-center gap-2">
        {finalResult.QBER_obs !== undefined && (
          <div className="bg-slate-900 border border-slate-700 px-2.5 py-1 rounded text-xs font-mono">
            <span className="text-[#94A3B8] mr-1.5">
              <InlineMath math="e_{\text{obs}}" />:
            </span>
            <strong className="text-white">{Number(finalResult.QBER_obs).toFixed(4)}</strong>
          </div>
        )}

        {finalResult.threshold_T_a !== undefined && (
          <div className="bg-slate-900 border border-slate-700 px-2.5 py-1 rounded text-xs font-mono">
            <span className="text-[#94A3B8] mr-1.5">
              <InlineMath math="T_A" />:
            </span>
            <strong className="text-[#20C8A7]">{Number(finalResult.threshold_T_a).toFixed(4)}</strong>
          </div>
        )}

        {finalResult.detected !== undefined && (
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider ${
              finalResult.detected
                ? 'bg-rose-950/60 text-rose-300 border border-rose-800'
                : 'bg-emerald-950/60 text-emerald-300 border border-emerald-800'
            }`}
          >
            {finalResult.detected ? 'ABORT TRIGGERED' : 'UNDETECTED'}
          </span>
        )}
      </div>
    );
  }

  return (
    <strong className="text-white font-mono bg-slate-800 px-2 py-1 rounded text-xs">
      {String(finalResult)}
    </strong>
  );
};

export default ComputedOutputView;
