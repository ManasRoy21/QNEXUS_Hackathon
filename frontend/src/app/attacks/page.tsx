'use client';

import React, { useState } from 'react';
import {
  Zap,
  ShieldAlert,
  ShieldCheck,
  Play,
  RotateCcw,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Cpu,
  Info,
} from 'lucide-react';
import SimulatedBadge from '@/components/common/SimulatedBadge';
import { phase2Api } from '@/services/phase2Api';
import { SessionState } from '@/types/phase2';

export default function AttacksPage() {
  const [selectedProtocol, setSelectedProtocol] = useState<string>('practical_qds');
  const [selectedAttack, setSelectedAttack] = useState<string>('FORGERY');
  const [intensity, setIntensity] = useState<number>(1.0);
  const [loading, setLoading] = useState<boolean>(false);
  const [sessionState, setSessionState] = useState<SessionState | null>(null);

  const attacksList = [
    {
      id: 'FORGERY',
      name: 'Signature Forgery Attempt (FR-E1)',
      targetProperty: 'Unforgeability',
      description:
        'Adversary attempts to fabricate signature tokens without holding genuine private quantum key material. Bob and Charlie test disagreement against e_forg.',
      expectedOutcome: 'REJECT_FORGERY',
      severity: 'HIGH',
    },
    {
      id: 'REPUDIATION',
      name: 'Dishonest Alice Repudiation (FR-E2)',
      targetProperty: 'Non-Repudiation',
      description:
        'Alice attempts to deny a previously issued signature. Tripartite cross-verification between Bob and Charlie definitively contradicts Alice.',
      expectedOutcome: 'REPUDIATION_BLOCKED',
      severity: 'CRITICAL',
    },
    {
      id: 'EAVESDROPPING',
      name: 'Channel Eavesdropping / Intercept-Resend (FR-E3)',
      targetProperty: 'Secrecy / Integrity',
      description:
        'Eve intercepts optical transit line in non-aligned Pauli bases, injecting 25-40% QBER. Practical QDS aborts session before signature validity.',
      expectedOutcome: 'SESSION_ABORTED',
      severity: 'CRITICAL',
    },
    {
      id: 'DETECTOR_COMPROMISE',
      name: 'Detector Blinding / Side-Channel (FR-E3)',
      targetProperty: 'Device Independence',
      description:
        'Laser blinding injected into measurement apparatus. MDI-QDS remains 100% secure, while non-MDI protocols suffer key leakage.',
      expectedOutcome: 'SECURE_IMMUNE (MDI-QDS)',
      severity: 'CRITICAL',
    },
    {
      id: 'PNS_ATTACK',
      name: 'Photon Number Splitting (PNS) Attack (FR-B3)',
      targetProperty: 'Multi-Photon Defense',
      description:
        'Eve siphons single photons from coherent pulses. Decoy-State QDS monitors mu/nu/omega yield ratios and flags PNS intrusion.',
      expectedOutcome: 'REJECT_PNS_BREACH (Decoy QDS)',
      severity: 'HIGH',
    },
  ];

  const handleExecuteAttack = async () => {
    try {
      setLoading(true);
      // 1. Create fresh session with selected protocol
      const sess = await phase2Api.createSession({
        protocol_id: selectedProtocol,
        distance_km: 30.0,
      });
      // 2. Run attack simulation
      const result = await phase2Api.simulateAttack(
        sess.session_id,
        selectedAttack,
        intensity,
        'Bob'
      );
      setSessionState(result);
    } catch (err) {
      console.error('Attack execution failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const currentMeta = attacksList.find((a) => a.id === selectedAttack) || attacksList[0];
  const atk = sessionState?.last_attack;

  return (
    <div className="space-y-8">
      {/* ── Header Banner ── */}
      <div className="bg-white border border-[#CBD5E1] rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-6">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono font-bold text-[#64748B] uppercase tracking-wider">
                MODULE E: ATTACK SIMULATION CONSOLE
              </span>
              <SimulatedBadge size="sm" />
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl text-[#071842] tracking-tight">
              Quantum &amp; Classical Adversary Suite
            </h1>
            <p className="text-xs sm:text-sm text-[#475569] font-sans max-w-2xl">
              Execute active forgery, repudiation, eavesdropping, and detector blinding attacks against
              running protocol instances to verify mathematical security guarantees (FR-E1, FR-E2, FR-E3).
            </p>
          </div>

          <button
            onClick={handleExecuteAttack}
            disabled={loading}
            className="px-6 py-3 rounded-lg bg-[#071842] hover:bg-[#0c2464] text-white font-mono text-xs font-semibold transition-all shadow-md flex items-center space-x-2 cursor-pointer disabled:opacity-50"
          >
            <Zap className="w-4 h-4 text-[#20C8A7]" />
            <span>{loading ? 'Simulating Adversary...' : 'Launch Attack Vector'}</span>
          </button>
        </div>

        {/* Protocol Selector for Attack Testing */}
        <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
          <span className="text-[#64748B] font-bold uppercase">Target Protocol:</span>
          {[
            { id: 'practical_qds', label: 'Practical QDS' },
            { id: 'mdi_qds', label: 'MDI-QDS (Detector Immune)' },
            { id: 'otuh_qds', label: 'OTUH-QDS (Universal Hash)' },
            { id: 'decoy_qds', label: 'Decoy-State QDS' },
          ].map((proto) => (
            <button
              key={proto.id}
              onClick={() => setSelectedProtocol(proto.id)}
              className={`px-3 py-1.5 rounded-lg border font-semibold transition-all ${
                selectedProtocol === proto.id
                  ? 'bg-[#071842] text-white border-[#071842] shadow-xs'
                  : 'bg-[#F8FAF9] text-[#475569] border-[#CBD5E1] hover:bg-slate-100'
              }`}
            >
              {proto.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Attack Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Attack Classes */}
        <div className="lg:col-span-5 space-y-3">
          <span className="text-xs font-mono font-bold text-[#64748B] uppercase block">
            Select Threat Class:
          </span>
          {attacksList.map((item) => {
            const isSelected = selectedAttack === item.id;
            return (
              <div
                key={item.id}
                onClick={() => setSelectedAttack(item.id)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  isSelected
                    ? 'border-[#20C8A7] bg-[#E6FBF7]/30 shadow-xs ring-1 ring-[#20C8A7]'
                    : 'border-[#E2E8F0] hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-mono font-bold text-[#071842]">
                    {item.name}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
                    {item.targetProperty}
                  </span>
                </div>
                <p className="text-xs text-[#475569] line-clamp-2">
                  {item.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* Right Column: Execution Parameters & Live Verdict Card */}
        <div className="lg:col-span-7 space-y-6">
          {/* Selected Attack Details */}
          <div className="bg-[#F8FAF9] border border-[#E2E8F0] rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <div>
                <h3 className="font-serif text-lg font-bold text-[#071842]">
                  {currentMeta.name}
                </h3>
                <span className="text-xs font-mono text-[#64748B]">
                  Guaranteed Security Property: <strong>{currentMeta.targetProperty}</strong>
                </span>
              </div>
              <SimulatedBadge size="sm" />
            </div>

            <p className="text-xs sm:text-sm text-[#475569] leading-relaxed">
              {currentMeta.description}
            </p>

            <div className="p-3 bg-white border border-[#CBD5E1] rounded-xl flex items-center justify-between text-xs font-mono">
              <span className="text-[#64748B]">Expected Protocol Response:</span>
              <span className="font-bold text-[#071842]">{currentMeta.expectedOutcome}</span>
            </div>
          </div>

          {/* Attack Evaluation Outcome */}
          {atk ? (
            <div
              className={`p-6 rounded-2xl border space-y-4 shadow-xs animate-in fade-in duration-200 ${
                atk.protocol_resisted
                  ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950'
                  : 'bg-rose-50/70 border-rose-300 text-rose-950'
              }`}
            >
              <div className="flex items-center justify-between border-b border-black/10 pb-3">
                <div className="flex items-center space-x-2 font-mono text-sm font-bold">
                  {atk.protocol_resisted ? (
                    <ShieldCheck className="w-5 h-5 text-emerald-700" />
                  ) : (
                    <ShieldAlert className="w-5 h-5 text-rose-700" />
                  )}
                  <span>ATTACK VERDICT: {atk.verdict}</span>
                </div>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-white/80 border border-black/10">
                  {atk.reason_code}
                </span>
              </div>

              <div className="space-y-2 text-xs font-mono">
                <div>
                  <strong>Adversarial Perturbation:</strong> {atk.attack_type} against {sessionState?.protocol_name}
                </div>
                <div>
                  <strong>Bob Verdict:</strong> {atk.resulting_verdict_bob} | <strong>Charlie Verdict:</strong> {atk.resulting_verdict_charlie}
                </div>
                <div>
                  <strong>Resulting QBER:</strong> {(atk.resulting_qber * 100).toFixed(2)}%
                </div>
              </div>

              <div className="p-4 bg-white/90 border border-black/10 rounded-xl text-xs sm:text-sm font-sans leading-relaxed text-[#071842]">
                <strong>Physical &amp; Cryptographic Explanation:</strong><br />
                {atk.explanation}
              </div>
            </div>
          ) : (
            <div className="p-12 text-center border border-dashed border-slate-300 rounded-2xl text-xs font-mono text-[#64748B] bg-white">
              Select an attack vector and click <strong>&quot;Launch Attack Vector&quot;</strong> to observe protocol defense.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
