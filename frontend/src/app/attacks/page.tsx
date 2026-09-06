'use client';

import React, { useState } from 'react';
import AttackTogglePanel, { ATTACKS } from '@/components/attack/AttackTogglePanel';
import SensitivitySlider from '@/components/attack/SensitivitySlider';
import ThreatVerdictGauge from '@/components/dashboard/ThreatVerdictGauge';
import ReasonCodeBadges from '@/components/dashboard/ReasonCodeBadges';
import { useSimulation } from '@/hooks/useSimulation';
import { AttackType } from '@/types';

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

  // Workflow A: One-click full attack pipeline (Keygen -> Sign -> Attack -> Verify)
  const handleFullAttackWorkflow = async () => {
    if (!selectedAttack) return;
    try {
      // 1. Keygen
      const kRes = await runKeygen(16);
      // 2. Sign
      await runSign('QDS-TRANSACTION-ATTACK-TEST');
      // 3. Inject Attack
      await runAttack(selectedAttack, intensity, {
        spoofed_public_key: spoofedKey,
        replay_age_seconds: replayAge,
        asymmetry_rate: asymmetryRate,
        path_bias_intensity: pathBias,
        target_verifier: targetVerifier,
      });
      // 4. If Repudiation, evaluate both; otherwise evaluate targetVerifier
      await runVerify(selectedAttack === 'REPUDIATION' ? 'both' : targetVerifier);
    } catch (err) {
      console.error('Attack workflow error:', err);
    }
  };

  // Workflow B: Inject Symmetrization Guard (Module G) and re-verify
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
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-slate-900/90 border border-slate-800/90 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-black text-slate-100 tracking-wide">
              Quantum Threat Injection & Stress Suite
            </h2>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-rose-950/80 border border-rose-800 text-rose-300">
              Active Perturbation
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Inject classical, quantum physical, and hardware side-channel attacks against live QDS state channels.
          </p>
        </div>

        {/* Action Triggers */}
        <div className="flex items-center space-x-3">
          <button
            onClick={handleFullAttackWorkflow}
            disabled={loading || !selectedAttack}
            className={`px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center space-x-2 ${
              loading || !selectedAttack
                ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                : 'bg-rose-600 hover:bg-rose-500 text-white shadow-[0_0_15px_rgba(244,63,94,0.4)] cursor-pointer'
            }`}
          >
            {loading ? (
              <>
                <span className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Simulating Attack...</span>
              </>
            ) : (
              <>
                <span>⚡ Inject & Verify ({selectedMeta?.label || 'Select Vector'})</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Session Context Banner */}
      {sessionId && (
        <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-800 text-xs font-mono">
          <div className="text-slate-400">
            Current Target Session: <strong className="text-cyan-400">{sessionId}</strong>
          </div>
          {symmetrizeData && (
            <div className="text-purple-400">
              ✓ Symmetrization Swapped {symmetrizeData.swap_count}/{symmetrizeData.total_bits} bits (Alice informed: False)
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-300 text-xs font-mono">
          <strong>ERROR:</strong> {error}
        </div>
      )}

      {/* Control Panels: Toggle Panel (Left) & Slider/Params (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 lg:col-span-7 shadow-md">
          <AttackTogglePanel
            selectedAttack={selectedAttack}
            onSelect={setSelectedAttack}
            disabled={loading}
          />
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 lg:col-span-5 shadow-md flex flex-col justify-between">
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

          {/* Symmetrization Guard Trigger for Repudiation */}
          {selectedAttack === 'REPUDIATION' && (
            <div className="mt-4 pt-3 border-t border-slate-800">
              <button
                onClick={handleSymmetrizeAndVerify}
                disabled={loading || !sessionId}
                className="w-full py-2 px-3 rounded-lg bg-purple-950/80 hover:bg-purple-900 border border-purple-700 text-purple-200 text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center space-x-2"
              >
                <span>🛡 Trigger Module G Symmetrization Guard</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Verification & Detection Results Panel */}
      {verifyData && (
        <div className="space-y-4 pt-2">
          <div className="flex items-center space-x-2">
            <span className="h-2 w-2 rounded-full bg-rose-400 animate-pulse" />
            <h3 className="text-sm font-bold font-mono text-slate-200 uppercase tracking-wider">
              Post-Perturbation Detection Output
            </h3>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-md">
              <ThreatVerdictGauge
                verdict={verifyData.verdict}
                severity={verifyData.severity}
                qber={verifyData.qber}
                e_rob={verifyData.e_rob}
                primaryAttackVector={verifyData.primary_attack_vector}
                fidelity={verifyData.fidelity}
                loading={loading}
              />
            </div>
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 lg:col-span-2 shadow-md">
              <ReasonCodeBadges
                reasonCodes={verifyData.reason_codes}
                diagnosticMessage={verifyData.diagnostic_message}
                postselectedShots={verifyData.postselected_shots}
                discardedShots={verifyData.discarded_shots}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
