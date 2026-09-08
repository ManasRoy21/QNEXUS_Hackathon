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
      <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
        <h3 className="text-xs font-mono font-bold text-[#64748B] uppercase tracking-wider">
          QUANTUM OPTICAL CIRCUIT STAGE
        </h3>
        <div className="flex space-x-1 font-mono">
          {(['keygen', 'sign', 'verify'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`px-2.5 py-1 text-[10px] rounded uppercase font-semibold transition-all ${
                stage === t
                  ? 'btn-dark shadow-xs'
                  : 'bg-[#F1F5F9] text-[#475569] hover:text-[#071842] border border-[#CBD5E1]'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 bg-[#071842] text-white rounded-xl border border-[#0B1E4E] font-mono text-xs overflow-x-auto min-h-[170px] flex flex-col justify-center shadow-inner">
        {stage === 'keygen' && (
          <div className="space-y-2">
            <div className="text-[11px] text-[#20C8A7] font-semibold">
              STAGE 1: TRIPARTITE EPR STATE PREPARATION (|Φ⁺⟩ = (|00⟩+|11⟩)/√2)
            </div>
            <pre className="text-slate-200 leading-relaxed">
{`qA (Alice Signer):   ───[H]───■─────── [To Teleportation Stage]
                              │
qB (Bob Verifier):   ─────────■─────── [Optical Fiber Channel 1]
                              │
qC (Charlie Verif):  ─────────■─────── [Optical Fiber Channel 2]`}
            </pre>
            <div className="text-[11px] text-[#94A3B8] pt-1">
              • Tripartite entanglement distributed via continuous-variable Bell state generation.
            </div>
          </div>
        )}

        {stage === 'sign' && (
          <div className="space-y-2">
            <div className="text-[11px] text-[#38BDF8] font-semibold">
              STAGE 2: PAULI STATE ENCODING (DIGEST m ∈ &#123;0,1&#125;^L)
            </div>
            <pre className="text-slate-200 leading-relaxed">
{`|ψ_m⟩ (Digest):      ───[U_m]───■─────── [Quantum Teleportation State]
                                │
qA (Alice Signer):   ──────────[X]───[M] ══ Classical Bell Broadcast`}
            </pre>
            <div className="text-[11px] text-[#94A3B8] pt-1">
              • Alice modulates non-orthogonal Pauli states (|0⟩, |1⟩, |+⟩, |-⟩) according to cryptographic hash digest.
            </div>
          </div>
        )}

        {stage === 'verify' && (
          <div className="space-y-2">
            <div className="text-[11px] text-[#20C8A7] font-semibold">
              STAGE 3: MDI DUAL-PATH HOMODYNE CROSS-CHECK &amp; BOUND EVALUATION
            </div>
            <pre className="text-slate-200 leading-relaxed">
{`Path A (Homodyne):   ───[BeamSplitter]───[Detector A]─── (QBER vs e_rob Check)
                              │
Path B (Cross-Check): ───────■─────────[Detector B]─── (Zero-Transmission Check)`}
            </pre>
            <div className="text-[11px] text-[#94A3B8] pt-1">
              • Dual-path homodyne detector defends against CW laser side-channel blinding; Hoeffding inequalities calculate e_rob, e_rep.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
