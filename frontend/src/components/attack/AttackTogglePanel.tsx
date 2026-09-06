'use client';

import React from 'react';
import { AttackType } from '@/types';

export interface AttackInfo {
  id: AttackType;
  label: string;
  category: 'Physical' | 'Cryptographic' | 'Protocol' | 'Hardware';
  tag: string;
  description: string;
  color: string;
}

export const ATTACKS: AttackInfo[] = [
  {
    id: 'INTERCEPT_RESEND',
    label: 'Intercept-Resend Eavesdropping',
    category: 'Physical',
    tag: 'Eve Physical Tap',
    description: 'Eve measures transit qubits in random bases and resends, inducing ~25%-50% QBER.',
    color: 'border-rose-500/50 hover:border-rose-400 bg-rose-950/20 text-rose-300',
  },
  {
    id: 'FORGERY',
    label: 'Quantum Payload Forgery',
    category: 'Cryptographic',
    tag: 'Digest Tampering',
    description: 'Adversary flips message digest bits without corresponding Alice Pauli state knowledge.',
    color: 'border-amber-500/50 hover:border-amber-400 bg-amber-950/20 text-amber-300',
  },
  {
    id: 'IMPERSONATION',
    label: 'Signer Key Impersonation',
    category: 'Cryptographic',
    tag: 'Mallory Spoofing',
    description: 'Mallory transmits an unauthorized public key asserting false identity as Alice.',
    color: 'border-orange-500/50 hover:border-orange-400 bg-orange-950/20 text-orange-300',
  },
  {
    id: 'REPLAY',
    label: 'Signature Replay Attack',
    category: 'Protocol',
    tag: 'Stale Nonce',
    description: 'Adversary intercepts valid historical signature and attempts re-verification with stale timestamp.',
    color: 'border-yellow-500/50 hover:border-yellow-400 bg-yellow-950/20 text-yellow-300',
  },
  {
    id: 'REPUDIATION',
    label: 'Dishonest-Alice Repudiation',
    category: 'Protocol',
    tag: 'Module G Guard Target',
    description: 'Dishonest Alice distributes conflicting quantum blocks to Bob vs Charlie to create dispute.',
    color: 'border-purple-500/50 hover:border-purple-400 bg-purple-950/20 text-purple-300',
  },
  {
    id: 'DETECTOR_SIDE_CHANNEL',
    label: 'Detector Blinding (Side-Channel)',
    category: 'Hardware',
    tag: 'MDI Cross-Check Target',
    description: 'Adversary blinds Path B detector with strong CW laser, creating distribution asymmetry.',
    color: 'border-pink-500/50 hover:border-pink-400 bg-pink-950/20 text-pink-300',
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
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <h3 className="text-xs font-mono font-medium text-slate-400 uppercase tracking-wider">
          Threat Vector Selection (6 Classical/Quantum Classes)
        </h3>
        {selectedAttack && (
          <button
            onClick={() => onSelect(null)}
            className="text-[11px] font-mono text-slate-400 hover:text-slate-200 underline"
            disabled={disabled}
          >
            Clear Selection
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {ATTACKS.map((attack) => {
          const isSelected = selectedAttack === attack.id;
          return (
            <button
              key={attack.id}
              disabled={disabled}
              onClick={() => onSelect(isSelected ? null : attack.id)}
              className={`p-3.5 rounded-lg border text-left transition-all relative overflow-hidden ${
                isSelected
                  ? 'bg-slate-900 border-cyan-400 ring-1 ring-cyan-400/50 shadow-[0_0_15px_rgba(34,211,238,0.15)]'
                  : `${attack.color} bg-slate-950/70 border-slate-800/80`
              } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold tracking-wide text-slate-100">
                  {attack.label}
                </span>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-400">
                  {attack.category}
                </span>
              </div>
              <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-2">
                {attack.description}
              </p>
              <div className="flex items-center space-x-2 text-[10px] font-mono">
                <span className="text-cyan-400">TAG:</span>
                <span className="text-slate-300">{attack.tag}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
