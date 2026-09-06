'use client';

import React, { useState } from 'react';

interface CircuitVisualizerProps {
  currentStage?: 'keygen' | 'sign' | 'verify' | 'attack';
}

export default function CircuitVisualizer({ currentStage = 'keygen' }: CircuitVisualizerProps) {
  const [activeTab, setActiveTab] = useState<'keygen' | 'sign' | 'verify'>('keygen');
  const stage = currentStage === 'attack' ? 'sign' : currentStage || activeTab;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <h3 className="text-xs font-mono font-medium text-slate-400 uppercase tracking-wider">
          Quantum Protocol Circuit Stage
        </h3>
        <div className="flex space-x-1">
          {(['keygen', 'sign', 'verify'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`px-2 py-0.5 text-[10px] font-mono rounded uppercase transition-colors ${
                stage === t
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50'
                  : 'bg-slate-900 text-slate-500 hover:text-slate-300'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="p-3 bg-slate-950 rounded-lg border border-slate-800/80 font-mono text-xs overflow-x-auto min-h-[170px] flex flex-col justify-center">
        {stage === 'keygen' && (
          <div className="text-cyan-400 space-y-1">
            <div className="text-[11px] text-slate-500 mb-1">Stage 1: EPR Pair Generation (|Φ⁺⟩ = (|00⟩+|11⟩)/√2)</div>
            <pre className="text-cyan-300">
{`qA (Alice):    ───[H]───■─────── [To Teleportation Stage]
                        │
qB (Bob):      ─────────■─────── [Optical Fiber -> Bob]
`}
            </pre>
            <div className="text-[11px] text-slate-400 mt-2">
              • Tripartite entanglement distributed among Alice, Bob, and Charlie.
            </div>
          </div>
        )}

        {stage === 'sign' && (
          <div className="text-indigo-400 space-y-1">
            <div className="text-[11px] text-slate-500 mb-1">Stage 2: Pauli Basis Encoding (Digest m ∈ &#123;0,1&#125;^L)</div>
            <pre className="text-indigo-300">
{`|ψ_m⟩ (State): ───[U_m]───■─────── [Quantum Teleportation]
                          │
qA (Alice):    ──────────[X]───[M] ══ Classical Bell Broadcast
`}
            </pre>
            <div className="text-[11px] text-slate-400 mt-2">
              • Alice encodes message hash digest using non-orthogonal Pauli states ({'|0⟩, |1⟩, |+⟩, |-⟩'}).
            </div>
          </div>
        )}

        {stage === 'verify' && (
          <div className="text-emerald-400 space-y-1">
            <div className="text-[11px] text-slate-500 mb-1">Stage 3: Verifier Cross-Check & Postselection</div>
            <pre className="text-emerald-300">
{`Path A (Homodyne): ───[BeamSplitter]───[Detector A]─── (e_rob Check)
                             │
Path B (Cross-Check): ───────■─────────[Detector B]─── (Zero-Trans Check)
`}
            </pre>
            <div className="text-[11px] text-slate-400 mt-2">
              • Dual-path cross-check monitors detector blinding; Hoeffding bound calculates e_rob and e_rep.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
