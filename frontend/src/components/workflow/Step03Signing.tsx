'use client';

import React, { useState } from 'react';
import { CanonicalSimulationState } from '@/types/unifiedSimulation';
import { Lock, CheckCircle2, ArrowRight, ShieldCheck, FileCheck, Binary, Info } from 'lucide-react';
import { InlineMath } from '@/components/common/MathBlock';

interface Props {
  simulationState: CanonicalSimulationState | null;
  signingDone?: boolean;
  onSigningComplete?: () => void;
  onNext: () => void;
  onBack: () => void;
}

export default function Step03Signing({
  simulationState,
  signingDone = false,
  onSigningComplete,
  onNext,
  onBack,
}: Props) {
  // Message input – default to a neutral test message
  const [message, setMessage] = useState<string>(
    simulationState?.signing?.message || 'QDS Research Test Message'
  );
  const [isSigned, setIsSigned] = useState<boolean>(signingDone);
  const [verified, setVerified] = useState<boolean>(signingDone);

  // SHA‑256 hash of the current message (fallback to empty hash)
  const msgHash =
    simulationState?.signing?.sha256_hash ||
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

  // Authoritative untested signature material (μ) from backend
  const untestedMu = simulationState?.material?.untested_bits ?? {};
  // For display purposes, we show the total untested bits if available
  const muDisplay =
    typeof untestedMu === 'object'
      ? Object.values(untestedMu)
          .filter((v) => typeof v === 'number')
          .reduce((sum, v) => sum + (v as number), 0)
      : undefined;

  // Preserve old sigLength fallback only for backward compatibility (will be removed later)
  const sigLength = muDisplay ?? simulationState?.material?.untested_bits?.M_u_bob ?? 128;
  const authThreshold = simulationState?.configuration.authentication_threshold ?? 0.0150;
  const verifThreshold = simulationState?.configuration.verification_threshold ?? 0.0645;
  const qberBob = simulationState?.measurement_statistics.qber_bob ?? 0.010;
  const qberCharlie = simulationState?.measurement_statistics.qber_charlie ?? 0.010;

  const handleSign = () => {
    setIsSigned(true);
    setVerified(false);
    if (onSigningComplete) onSigningComplete();
  };

  const handleVerify = () => {
    setVerified(true);
    if (onSigningComplete) onSigningComplete();
  };

  return (
    <div className="space-y-6">
      {/* ── Step Header ──────────────────────────────────────────────────────── */}
      <div className="border-b border-[#CBD5E1] pb-3">
        <span className="text-xs font-mono font-bold text-[#64748B] uppercase tracking-wider block">
          STEP 03 OF 06
        </span>
        <h2 className="font-serif text-2xl text-[#071842]">Alice Signs Message &amp; Verifiers Validate</h2>
        <p className="text-xs text-[#475569] mt-1">
          Alice binds the cryptographic document digest to her quantum signature registers. Bob and Charlie independently verify against their respective conclusive key shares using authentication (Ta) and verification (Tv) thresholds.
        </p>
      </div>

      {/* ── Signing Telemetry Summary ────────────────────────────────────────── */}
      <div className="bg-white border border-[#CBD5E1] rounded-xl p-4 shadow-xs">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
          <div className="bg-[#F8FAF9] p-3 rounded-lg border border-[#E2E8F0]">
            <span className="text-[10px] text-[#64748B] block font-semibold">SIGNATURE LENGTH</span>
            <span className="text-lg font-bold text-[#071842]">{sigLength} bits</span>
            <span className="text-[10px] text-[#64748B] block mt-0.5">
              From Untested Register <InlineMath math="M_u" />
            </span>
          </div>

          <div className="bg-[#F8FAF9] p-3 rounded-lg border border-[#E2E8F0]">
            <span className="text-[10px] text-[#64748B] block font-semibold">BOB MATERIAL</span>
            <span className="text-lg font-bold text-[#20C8A7]">
              {simulationState?.material.untested_bits.M_u_bob ?? '—'} bits
            </span>
            <span className="text-[10px] text-[#64748B] block mt-0.5">Test: {simulationState?.material.test_bits.bob_test_count ?? '—'}</span>
          </div>

          <div className="bg-[#F8FAF9] p-3 rounded-lg border border-[#E2E8F0]">
            <span className="text-[10px] text-[#64748B] block font-semibold">CHARLIE MATERIAL</span>
            <span className="text-lg font-bold text-[#20C8A7]">
              {simulationState?.material.untested_bits.M_u_charlie ?? '—'} bits
            </span>
            <span className="text-[10px] text-[#64748B] block mt-0.5">Test: {simulationState?.material.test_bits.charlie_test_count ?? '—'}</span>
          </div>

          <div className="bg-[#F8FAF9] p-3 rounded-lg border border-[#E2E8F0]">
            <span className="text-[10px] text-[#64748B] block font-semibold">SECURITY THRESHOLDS</span>
            <span className="text-sm font-bold text-[#263EDC] inline-flex items-center space-x-1.5 flex-wrap">
              <span>
                <InlineMath math={`T_A = ${(authThreshold * 100).toFixed(2)}\\%`} />
              </span>
              <span>|</span>
              <span>
                <InlineMath math={`T_V = ${(verifThreshold * 100).toFixed(2)}\\%`} />
              </span>
            </span>
            <span className="text-[10px] text-[#64748B] block mt-0.5">
              <InlineMath math="T_V > T_A" /> (Non-repudiation gap)
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* ── Signer Console (Alice) ────────────────────────────────────────── */}
        <div className="bg-white border border-[#CBD5E1] rounded-xl p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2 text-xs font-mono">
            <span className="font-bold text-[#071842] uppercase tracking-wider">
              ALICE (SIGNER ROLE)
            </span>
            <span className="text-[#64748B]">OTP Register Binding</span>
          </div>

          <div>
            <label className="text-[11px] font-mono text-[#475569] block mb-1">
              Document Message / Directive:
            </label>
            <textarea
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full p-2.5 text-xs font-mono border border-[#CBD5E1] rounded-md bg-[#F8FAF9] focus:outline-none focus:ring-1 focus:ring-[#071842]"
            />
          </div>

          <div className="p-3 bg-[#F8FAF9] rounded-lg border border-[#E2E8F0] font-mono text-xs space-y-1">
            <span className="text-[10px] text-[#64748B] block font-semibold uppercase">
              SHA-256 Message Digest:
            </span>
            <span className="text-[#071842] break-all font-bold text-[11px]">{msgHash}</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs font-mono text-[#475569] space-y-1">
            <span className="font-bold text-[#071842] block">Signature Token Binding:</span>
            <p className="text-[11px] leading-relaxed">
              Alice encodes the message bit string into signature tokens using her private untested quantum registers, preparing shares for Bob and Charlie.
            </p>
          </div>

          <button
            onClick={handleSign}
            className="w-full btn-dark py-2.5 rounded-lg text-xs font-mono font-semibold shadow-xs inline-flex items-center justify-center space-x-2 cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5 text-[#20C8A7]" />
            <span>{isSigned ? 'Re-bind Signature Tokens' : 'Alice Signs Document'}</span>
          </button>
        </div>

        {/* ── Verifier Consoles (Bob & Charlie) ──────────────────────────────── */}
        <div className="bg-white border border-[#CBD5E1] rounded-xl p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2 text-xs font-mono">
            <span className="font-bold text-[#071842] uppercase tracking-wider">
              BOB &amp; CHARLIE (VERIFIERS)
            </span>
            <span className="text-[#20C8A7] font-semibold">Independent Verification</span>
          </div>

          <div className="space-y-3 font-mono text-xs">
            {/* Bob Direct Verification */}
            <div className="p-3 bg-[#F8FAF9] rounded-lg border border-[#E2E8F0] flex items-center justify-between">
              <div>
                <span className="font-bold text-[#071842] block">Bob Authentication Check</span>
                <span className="text-[10px] text-[#64748B]">
                  Observed <InlineMath math={`e_B = ${(qberBob * 100).toFixed(2)}\\%`} /> vs Threshold{' '}
                  <InlineMath math={`T_A = ${(authThreshold * 100).toFixed(2)}\\%`} />
                </span>
              </div>
              <div>
                {verified ? (
                  <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[11px] inline-flex items-center space-x-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>AUTHENTICATED</span>
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-500 text-[10px]">
                    PENDING SIGN
                  </span>
                )}
              </div>
            </div>

            {/* Charlie Forwarding / Transferability Verification */}
            <div className="p-3 bg-[#F8FAF9] rounded-lg border border-[#E2E8F0] flex items-center justify-between">
              <div>
                <span className="font-bold text-[#071842] block">Charlie Transferability Check</span>
                <span className="text-[10px] text-[#64748B]">
                  Cross-share test vs Verification Threshold{' '}
                  <InlineMath math={`T_V = ${(verifThreshold * 100).toFixed(2)}\\%`} />
                </span>
              </div>
              <div>
                {verified ? (
                  <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[11px] inline-flex items-center space-x-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>
                      TRANSFERABLE (<InlineMath math="T_V" />)
                    </span>
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-500 text-[10px]">
                    PENDING SIGN
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 text-xs font-mono text-blue-900 space-y-1">
            <span className="font-bold block">Non-Repudiation Assurance:</span>
            <p className="text-[11px] leading-relaxed">
              Because <InlineMath math="T_V > T_A" />, if Bob accepts the signature from Alice (error{' '}
              <InlineMath math="\leq T_A" />), Charlie is guaranteed to also accept the forwarded signature (error{' '}
              <InlineMath math="\leq T_V" />) with probability <InlineMath math="\geq 1 - \varepsilon_2" />.
            </p>
          </div>

          <button
            onClick={handleVerify}
            disabled={!isSigned}
            className="w-full btn-teal py-2.5 rounded-lg text-xs font-mono font-bold shadow-xs disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center space-x-2 cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Verify Signature &amp; Non-Repudiation</span>
          </button>
        </div>
      </div>

      {/* ── Footer Navigation ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between pt-4 border-t border-[#CBD5E1]">
        <button
          onClick={onBack}
          className="px-4 py-2 rounded-lg text-xs font-mono font-semibold bg-white border border-[#CBD5E1] text-[#071842] hover:bg-slate-50 cursor-pointer"
        >
          ← Back to Step 02
        </button>
        <button
          onClick={onNext}
          className="btn-dark px-6 py-2.5 rounded-lg text-xs font-mono font-semibold shadow-xs cursor-pointer"
        >
          Proceed to Step 04: Threat Simulation →
        </button>
      </div>
    </div>
  );
}
