'use client';

import React, { useState } from 'react';
import AttackTogglePanel, { ATTACKS } from '@/components/attack/AttackTogglePanel';
import SensitivitySlider from '@/components/attack/SensitivitySlider';
import ThreatVerdictGauge from '@/components/dashboard/ThreatVerdictGauge';
import ReasonCodeBadges from '@/components/dashboard/ReasonCodeBadges';
import { useSimulation } from '@/hooks/useSimulation';
import { AttackType } from '@/types';
import { Zap, ShieldCheck, Play, ArrowRight, ShieldAlert, CheckCircle2 } from 'lucide-react';

export default function AttacksPage() {
  const [selectedAttack, setSelectedAttack] = useState<AttackType | null>('INTERCEPT_RESEND');
  const [intensity, setIntensity] = useState<number>(0.45);
  const [spoofedKey, setSpoofedKey] = useState<string>('mallory-unauthorized-key-0xDEADBEEF');
  const [replayAge, setReplayAge] = useState<number>(300);
  const [asymmetryRate, setAsymmetryRate] = useState<number>(0.4);
  const [pathBias, setPathBias] = useState<number>(0.45);
  const [targetVerifier, setTargetVerifier] = useState<'bob' | 'charlie'>('charlie');

  const {
    sessionId,
    loading,
    error,
    attackData,
    symmetrizeData,
    verifyData,
    runKeygen,
    runSign,
    runAttack,
    runSymmetrize,
    runVerify,
  } = useSimulation();

  const handleFullAttackWorkflow = async () => {
    if (!selectedAttack) return;
    try {
      await runKeygen(16);
      await runSign('QDS-DEFENSE-ATTACK-TEST');
      await runAttack(selectedAttack, intensity, {
        spoofed_public_key: spoofedKey,
        replay_age_seconds: replayAge,
        asymmetry_rate: asymmetryRate,
        path_bias_intensity: pathBias,
        target_verifier: targetVerifier,
      });
      await runVerify(selectedAttack === 'REPUDIATION' ? 'both' : targetVerifier);
    } catch (err) {
      console.error('Attack workflow error:', err);
    }
  };

  const handleSymmetrizeAndVerify = async () => {
    try {
      await runSymmetrize(0.5);
      await runVerify('both');
    } catch (err) {
      console.error('Symmetrize error:', err);
    }
  };

  const selectedMeta = ATTACKS.find((a) => a.id === selectedAttack);

  return (
    <div className="space-y-8">
      {/* ── Top Header Banner ── */}
      <div className="bg-white border border-[#CBD5E1] rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-6">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono font-bold text-[#64748B] uppercase tracking-wider">
                THREAT INJECTION SUITE
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 font-semibold">
                ACTIVE PERTURBATION
              </span>
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl text-[#071842] tracking-tight">
              Quantum Threat Injection &amp; Stress Suite
            </h1>
            <p className="text-xs sm:text-sm text-[#475569] font-sans max-w-2xl">
              Inject eavesdropping, forgery, impersonation, replay, repudiation, or side-channel laser blinding directly into the transit fiber.
            </p>
          </div>

          {/* Quick Action Button */}
          <div>
            <button
              onClick={handleFullAttackWorkflow}
              disabled={loading || !selectedAttack}
              className="btn-dark px-6 py-3 rounded-lg text-xs font-mono font-semibold inline-flex items-center space-x-2 shadow-sm disabled:opacity-50"
            >
              <Zap className="w-4 h-4 text-[#20C8A7]" />
              <span>{loading ? 'Injecting & Evaluating...' : 'Inject Threat Vector & Evaluate'}</span>
            </button>
          </div>
        </div>

        {/* Selected Threat Summary Bar */}
        {selectedMeta && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-[#F8FAF9] rounded-xl border border-[#CBD5E1] text-xs font-mono">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-[#071842]">TARGET:</span>
              <span className="font-bold text-[#263EDC]">{selectedMeta.label}</span>
              <span className="text-[#94A3B8]">·</span>
              <span className="text-[#64748B] font-sans">{selectedMeta.tag}</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-[#64748B]">EXPECTED BREACH:</span>
              <span className="font-bold text-rose-600 bg-white px-2 py-0.5 rounded border border-[#E2E8F0]">
                {selectedMeta.targetBound}
              </span>
            </div>
          </div>
        )}

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-300 rounded-lg text-xs font-mono text-rose-700">
            <strong>ERROR:</strong> {error}
          </div>
        )}
      </div>

      {/* ── Main Workspace Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 Cols): Threat Vector Selector & Slider */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white border border-[#CBD5E1] rounded-2xl p-6 shadow-xs">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3 mb-4 text-xs font-mono">
              <span className="font-bold text-[#64748B] uppercase tracking-wider">
                CATEGORY: ADVERSARY PROFILE
              </span>
              <span className="font-bold text-[#071842] text-sm">01</span>
            </div>
            <AttackTogglePanel
              selectedAttack={selectedAttack}
              onSelect={(atk) => setSelectedAttack(atk)}
              disabled={loading}
            />
          </div>

          <div className="bg-white border border-[#CBD5E1] rounded-2xl p-6 shadow-xs">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3 mb-4 text-xs font-mono">
              <span className="font-bold text-[#64748B] uppercase tracking-wider">
                CATEGORY: PHYSICAL CHANNEL PARAMETERS
              </span>
              <span className="font-bold text-[#071842] text-sm">02</span>
            </div>
            <SensitivitySlider
              intensity={intensity}
              onChange={setIntensity}
              selectedAttack={selectedAttack}
              spoofedKey={spoofedKey}
              onSpoofedKeyChange={setSpoofedKey}
              replayAge={replayAge}
              onReplayAgeChange={setReplayAge}
              asymmetryRate={asymmetryRate}
              onAsymmetryRateChange={setAsymmetryRate}
              pathBias={pathBias}
              onPathBiasChange={setPathBias}
              targetVerifier={targetVerifier}
              onTargetVerifierChange={setTargetVerifier}
              disabled={loading}
            />
          </div>
        </div>

        {/* Right Column (5 Cols): Verdict, Diagnostics, & Module G Guard */}
        <div className="lg:col-span-5 space-y-6">
          {/* Card 3: Live Threat Verdict */}
          <div className="bg-white border border-[#CBD5E1] rounded-2xl p-6 shadow-xs">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3 mb-4 text-xs font-mono">
              <span className="font-bold text-[#64748B] uppercase tracking-wider">
                CATEGORY: DETECTED VERDICT
              </span>
              <span className="font-bold text-[#071842] text-sm">03</span>
            </div>
            <ThreatVerdictGauge
              verdict={verifyData?.verdict}
              severity={verifyData?.severity}
              qber={verifyData?.qber}
              e_rob={verifyData?.e_rob}
              primaryAttackVector={verifyData?.primary_attack_vector || selectedAttack}
              fidelity={verifyData?.fidelity}
              loading={loading}
            />
          </div>

          {/* Card 4: Reason Codes */}
          <div className="bg-white border border-[#CBD5E1] rounded-2xl p-6 shadow-xs">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3 mb-4 text-xs font-mono">
              <span className="font-bold text-[#64748B] uppercase tracking-wider">
                CATEGORY: BREACH CODES
              </span>
              <span className="font-bold text-[#071842] text-sm">04</span>
            </div>
            <ReasonCodeBadges
              reasonCodes={verifyData?.reason_codes}
              diagnosticMessage={verifyData?.diagnostic_message}
              postselectedShots={verifyData?.postselected_shots}
              discardedShots={verifyData?.discarded_shots}
            />
          </div>

          {/* Card 5: Module G Symmetrization Guard Action Banner */}
          <div className="bg-[#071842] text-white rounded-2xl p-6 border border-[#0B1E4E] shadow-sm space-y-4">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-5 h-5 text-[#20C8A7]" />
              <h3 className="font-serif text-lg text-white font-bold">
                Module G Symmetrization Guard
              </h3>
            </div>
            <p className="text-xs text-[#94A3B8] font-sans leading-relaxed">
              When dishonest Alice attempts repudiation by distributing mismatched quantum states to Bob vs Charlie, execute an encrypted 50% swap. This distributes asymmetry equally and guarantees simultaneous rejection.
            </p>
            <button
              onClick={handleSymmetrizeAndVerify}
              disabled={loading}
              className="btn-teal w-full py-2.5 rounded-lg text-xs font-mono font-bold inline-flex items-center justify-center space-x-2 shadow-xs disabled:opacity-50"
            >
              <span>Apply Symmetrization &amp; Cross-Verify</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            {symmetrizeData && (
              <div className="p-3 bg-[#0B1E4E] rounded-lg border border-[#1D293D] text-[11px] font-mono text-[#CBD5E1]">
                <span className="text-[#20C8A7] font-bold block">GUARD ENGAGED:</span>
                Swapped {symmetrizeData.swap_count} register indices between Bob &amp; Charlie.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
