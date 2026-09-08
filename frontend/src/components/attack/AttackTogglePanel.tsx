'use client';

import React from 'react';
import { AttackType } from '@/types';

export interface AttackInfo {
  id: AttackType;
  index: string;
  label: string;
  category: 'Physical' | 'Cryptographic' | 'Protocol' | 'Hardware';
  tag: string;
  description: string;
  targetBound: string;
}

export const ATTACKS: AttackInfo[] = [
  {
    id: 'INTERCEPT_RESEND',
    index: '01',
    label: 'Intercept-Resend Eavesdropping',
    category: 'Physical',
    tag: 'Eve Physical Tap',
    description: 'Eve measures transit qubits in random bases and resends, inducing ~25%-50% QBER.',
    targetBound: 'Breaches e_rep (13.58%)',
  },
  {
    id: 'FORGERY',
    index: '02',
    label: 'Quantum Payload Forgery',
    category: 'Cryptographic',
    tag: 'Digest Tampering',
    description: 'Adversary flips message digest bits without corresponding Alice Pauli state knowledge.',
    targetBound: 'Breaches e_forg (20.58%)',
  },
  {
    id: 'IMPERSONATION',
    index: '03',
    label: 'Signer Key Impersonation',
    category: 'Cryptographic',
    tag: 'Mallory Spoofing',
    description: 'Mallory transmits an unauthorized public key asserting false identity as Alice.',
    targetBound: 'PKI Identity Mismatch',
  },
  {
    id: 'REPLAY',
    index: '04',
    label: 'Signature Replay Attack',
    category: 'Protocol',
    tag: 'Stale Nonce / Reused State',
    description: 'Adversary intercepts valid historical signature and attempts re-verification with stale timestamp.',
    targetBound: 'Nonce / Δt > 60s Replay',
  },
  {
    id: 'REPUDIATION',
    index: '05',
    label: 'Dishonest-Alice Repudiation',
    category: 'Protocol',
    tag: 'Module G Guard Target',
    description: 'Dishonest Alice distributes conflicting quantum blocks to Bob vs Charlie to create verifier dispute.',
    targetBound: 'Module G Symmetrization Swap',
  },
  {
    id: 'DETECTOR_SIDE_CHANNEL',
    index: '06',
    label: 'Detector Blinding (Side-Channel)',
    category: 'Hardware',
    tag: 'MDI Dual-Path Cross-Check',
    description: 'Adversary blinds Path B detector with strong CW laser, creating distribution asymmetry.',
    targetBound: 'Breaches τ_bias Threshold',
  },
];

interface AttackTogglePanelProps {
  selectedAttack: AttackType | null;
  onSelect: (attack: AttackType | null) => void;
  disabled?: boolean;
}

export default function AttackTogglePanel({
  selectedAttack,
  onSelect,
  disabled = false,
}: AttackTogglePanelProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3 text-xs font-mono">
        <h3 className="font-bold text-[#64748B] uppercase tracking-wider">
          SELECT THREAT VECTOR (6 CLASSES)
        </h3>
        {selectedAttack && (
          <button
            onClick={() => onSelect(null)}
            className="text-[11px] font-semibold text-[#071842] hover:text-[#263EDC] underline"
            disabled={disabled}
          >
            Clear Selection
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {ATTACKS.map((attack) => {
          const isSelected = selectedAttack === attack.id;
          return (
            <button
              key={attack.id}
              disabled={disabled}
              onClick={() => onSelect(isSelected ? null : attack.id)}
              className={`p-4 rounded-xl border text-left transition-all relative ${
                isSelected
                  ? 'bg-[#E6FBF7] border-[#071842] ring-2 ring-[#071842] shadow-sm'
                  : 'bg-white border-[#CBD5E1] hover:border-[#071842]/40 hover:shadow-xs'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <div className="flex items-center justify-between border-b border-[#E2E8F0]/70 pb-2 mb-2 text-xs font-mono">
                <span className="font-bold text-[#64748B] uppercase tracking-wider text-[10px]">
                  CATEGORY: {attack.category}
                </span>
                <span className="font-bold text-[#071842] text-xs font-mono">{attack.index}</span>
              </div>

              <h4 className="text-sm font-bold text-[#071842] font-grotesk mb-1 leading-snug">
                {attack.label}
              </h4>
              <p className="text-xs text-[#475569] font-sans leading-relaxed mb-3">
                {attack.description}
              </p>

              <div className="pt-2 border-t border-[#E2E8F0] flex items-center justify-between text-[10px] font-mono">
                <span className="text-[#64748B] uppercase">{attack.tag}</span>
                <span className="font-semibold text-[#071842] bg-[#F1F5F9] px-2 py-0.5 rounded border border-[#E2E8F0]">
                  {attack.targetBound}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
