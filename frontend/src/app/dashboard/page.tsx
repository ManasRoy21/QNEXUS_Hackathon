'use client';

import React, { useState } from 'react';
import ThreatVerdictGauge from '@/components/dashboard/ThreatVerdictGauge';
import ReasonCodeBadges from '@/components/dashboard/ReasonCodeBadges';
import LiveHistogram from '@/components/dashboard/LiveHistogram';
import CircuitVisualizer from '@/components/circuit/CircuitVisualizer';
import { useSimulation } from '@/hooks/useSimulation';
import { useWebSocket } from '@/hooks/useWebSocket';
import { Play, RotateCcw, Activity, Shield, Key, FileCheck, Layers } from 'lucide-react';

export default function DashboardPage() {
  const [numBits, setNumBits] = useState<number>(16);
  const [verifierId, setVerifierId] = useState<'bob' | 'charlie' | 'both'>('bob');

  const {
    sessionId,
    step,
    loading,
    error,
    verifyData,
    runFullLifecycle,
    runKeygen,
    runSign,
    runVerify,
    reset,
  } = useSimulation();

  const {
    latestTelemetry,
    telemetryLog,
    connected: wsConnected,
  } = useWebSocket(undefined, { sessionId, autoConnect: true });

  const handleRunLifecycle = async () => {
    try {
      await runFullLifecycle(numBits, verifierId);
    } catch (err) {
      console.error('Lifecycle error:', err);
    }
  };

  const currentQber = verifyData?.qber ?? latestTelemetry?.qber ?? null;
  const currentErob = verifyData?.e_rob ?? 0.0658;

  return (
    <div className="space-y-8">
      {/* ── Top Operations Control Banner (Quvora Blueprint Header) ── */}
      <div className="bg-white border border-[#CBD5E1] rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-6">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono font-bold text-[#64748B] uppercase tracking-wider">
                MODULE C: REAL-TIME SOC
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#E6FBF7] text-[#071842] border border-[#20C8A7] font-semibold">
                DETERMINISTIC V1
              </span>
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl text-[#071842] tracking-tight">
              Quantum Operations Console
            </h1>
            <p className="text-xs sm:text-sm text-[#475569] font-sans max-w-2xl">
              Real-time continuous-variable quantum signature evaluation against finite-key Hoeffding concentration bounds.
            </p>
          </div>

          {/* Quick Session Readout */}
          <div className="flex items-center space-x-3 text-xs font-mono">
            <div className="bg-[#F8FAF9] border border-[#E2E8F0] px-3.5 py-2 rounded-lg">
              <span className="text-[#64748B] block text-[10px] uppercase">Session ID</span>
              <span className="font-bold text-[#071842]">{sessionId ? sessionId.slice(0, 8) + '...' : 'Standby'}</span>
            </div>
            <div className="bg-[#F8FAF9] border border-[#E2E8F0] px-3.5 py-2 rounded-lg">
              <span className="text-[#64748B] block text-[10px] uppercase">Socket Stream</span>
              <span className={`font-bold ${wsConnected ? 'text-[#20C8A7]' : 'text-amber-600'}`}>
                {wsConnected ? 'LIVE' : 'DISCONNECTED'}
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-4 font-mono">
          <div className="flex flex-wrap items-center gap-3">
            {/* Bit Length Selector */}
            <div className="flex items-center space-x-1.5 bg-[#F8FAF9] border border-[#CBD5E1] rounded-lg p-1 text-xs">
              <span className="text-[#64748B] px-2 font-semibold uppercase text-[10px]">Bits:</span>
              {[16, 32, 64].map((b) => (
                <button
                  key={b}
                  disabled={loading}
                  onClick={() => setNumBits(b)}
                  className={`px-3 py-1 rounded transition-all font-semibold ${
                    numBits === b
                      ? 'btn-dark'
                      : 'text-[#475569] hover:text-[#071842]'
                  }`}
                >
                  {b}
                </button>
              ))}
            </div>

            {/* Verifier Selector */}
            <div className="flex items-center space-x-1.5 bg-[#F8FAF9] border border-[#CBD5E1] rounded-lg p-1 text-xs">
              <span className="text-[#64748B] px-2 font-semibold uppercase text-[10px]">Verifier:</span>
              {(['bob', 'charlie', 'both'] as const).map((v) => (
                <button
                  key={v}
                  disabled={loading}
                  onClick={() => setVerifierId(v)}
                  className={`px-3 py-1 uppercase rounded transition-all font-semibold ${
                    verifierId === v
                      ? 'btn-dark'
                      : 'text-[#475569] hover:text-[#071842]'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          {/* Primary Operations Actions */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <button
              onClick={handleRunLifecycle}
              disabled={loading}
              className="btn-dark px-5 py-2 rounded-lg text-xs font-semibold inline-flex items-center space-x-2 shadow-sm disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 text-[#20C8A7]" />
              <span>{loading ? 'Executing Protocol...' : 'Run Full Lifecycle'}</span>
            </button>

            <button
              onClick={() => runKeygen(numBits)}
              disabled={loading}
              className="px-3 py-2 rounded-lg text-xs font-semibold bg-white border border-[#CBD5E1] text-[#071842] hover:bg-slate-50 transition-colors disabled:opacity-50"
              title="Keygen only"
            >
              <Key className="w-3.5 h-3.5 inline mr-1" />
              <span>Keygen</span>
            </button>

            <button
              onClick={() => runSign('QDS-DEFENSE-CONTRACT-VALIDATION')}
              disabled={loading || step === 'idle'}
              className="px-3 py-2 rounded-lg text-xs font-semibold bg-white border border-[#CBD5E1] text-[#071842] hover:bg-slate-50 transition-colors disabled:opacity-50"
              title="Sign message"
            >
              <FileCheck className="w-3.5 h-3.5 inline mr-1" />
              <span>Sign</span>
            </button>

            <button
              onClick={() => runVerify(verifierId)}
              disabled={loading || (step !== 'sign' && step !== 'attack' && step !== 'symmetrize')}
              className="px-3 py-2 rounded-lg text-xs font-semibold bg-white border border-[#CBD5E1] text-[#071842] hover:bg-slate-50 transition-colors disabled:opacity-50"
              title="Verify signature"
            >
              <Shield className="w-3.5 h-3.5 inline mr-1" />
              <span>Verify</span>
            </button>

            <button
              onClick={reset}
              disabled={loading}
              className="p-2 rounded-lg text-xs bg-[#F8FAF9] border border-[#CBD5E1] text-[#64748B] hover:text-[#071842] transition-colors"
              title="Reset Console"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-300 rounded-lg text-xs font-mono text-rose-700">
            <strong>ERROR:</strong> {error}
          </div>
        )}
      </div>

      {/* ── Main Dashboard Grid (Quvora Numbered Cards) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Card 1: Security Verdict */}
          <div className="bg-white border border-[#CBD5E1] rounded-2xl p-6 shadow-xs">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3 mb-4 text-xs font-mono">
              <span className="font-bold text-[#64748B] uppercase tracking-wider">
                CATEGORY: PHYSICAL BOUNDS
              </span>
              <span className="font-bold text-[#071842] text-sm">01</span>
            </div>
            <ThreatVerdictGauge
              verdict={verifyData?.verdict}
              severity={verifyData?.severity}
              qber={currentQber}
              e_rob={currentErob}
              primaryAttackVector={verifyData?.primary_attack_vector}
              fidelity={verifyData?.fidelity}
              loading={loading}
            />
          </div>

          {/* Card 2: Reason Codes & Diagnostics */}
          <div className="bg-white border border-[#CBD5E1] rounded-2xl p-6 shadow-xs">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3 mb-4 text-xs font-mono">
              <span className="font-bold text-[#64748B] uppercase tracking-wider">
                CATEGORY: DIAGNOSTIC TELEMETRY
              </span>
              <span className="font-bold text-[#071842] text-sm">02</span>
            </div>
            <ReasonCodeBadges
              reasonCodes={verifyData?.reason_codes}
              diagnosticMessage={verifyData?.diagnostic_message}
              postselectedShots={verifyData?.postselected_shots}
              discardedShots={verifyData?.discarded_shots}
            />
          </div>
        </div>

        {/* Right Column (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Card 3: Bell Measurement Histogram */}
          <div className="bg-white border border-[#CBD5E1] rounded-2xl p-6 shadow-xs">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3 mb-4 text-xs font-mono">
              <span className="font-bold text-[#64748B] uppercase tracking-wider">
                CATEGORY: BORN-RULE PROJECTIONS
              </span>
              <span className="font-bold text-[#071842] text-sm">03</span>
            </div>
            <LiveHistogram
              qber={currentQber}
              shots={4096}
              postselectedShots={verifyData?.postselected_shots}
            />
          </div>

          {/* Card 4: Quantum Circuit Stage */}
          <div className="bg-white border border-[#CBD5E1] rounded-2xl p-6 shadow-xs">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3 mb-4 text-xs font-mono">
              <span className="font-bold text-[#64748B] uppercase tracking-wider">
                CATEGORY: OPTICAL HARDWARE CIRCUIT
              </span>
              <span className="font-bold text-[#071842] text-sm">04</span>
            </div>
            <CircuitVisualizer currentStage={step === 'idle' ? 'keygen' : (step as any)} />
          </div>
        </div>
      </div>

      {/* ── Real-Time Stream Telemetry Log Table ── */}
      <div className="bg-white border border-[#CBD5E1] rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3 text-xs font-mono">
          <div className="flex items-center space-x-2">
            <Activity className="w-4 h-4 text-[#20C8A7]" />
            <span className="font-bold text-[#071842] uppercase tracking-wider">
              REAL-TIME QUANTUM STREAM TELEMETRY
            </span>
          </div>
          <span className="text-[#64748B]">
            {telemetryLog.length} Packets Received
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#F8FAF9] border-b border-[#CBD5E1] text-[#64748B] uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-3 font-semibold">Timestamp</th>
                <th className="py-2.5 px-3 font-semibold">Stage</th>
                <th className="py-2.5 px-3 font-semibold">QBER</th>
                <th className="py-2.5 px-3 font-semibold">e_rob</th>
                <th className="py-2.5 px-3 font-semibold">Verdict</th>
                <th className="py-2.5 px-3 font-semibold">Postselection</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] text-[#334155]">
              {telemetryLog.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[#94A3B8]">
                    No live telemetry stream captured yet. Click &ldquo;Run Full Lifecycle&rdquo; to begin.
                  </td>
                </tr>
              ) : (
                telemetryLog.slice(0, 8).map((entry, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-3 text-[#64748B]">
                      {entry.timestamp ? new Date(entry.timestamp).toLocaleTimeString() : 'NOW'}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-[#071842] uppercase">{entry.event_type || 'VERIFY'}</td>
                    <td className="py-2.5 px-3 font-semibold">
                      {entry.qber !== undefined ? `${(entry.qber * 100).toFixed(2)}%` : '--'}
                    </td>
                    <td className="py-2.5 px-3 text-[#475569]">
                      {entry.hoeffding_threshold !== undefined ? `≤ ${(entry.hoeffding_threshold * 100).toFixed(2)}%` : '6.58%'}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          entry.active_threat === 'CLEAN'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                            : 'bg-rose-50 text-rose-700 border border-rose-300'
                        }`}
                      >
                        {entry.active_threat === 'CLEAN' ? 'SECURE' : (entry.active_threat || 'EVAL')}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-[#64748B]">
                      {entry.channel_telemetry?.postselected ? `${entry.channel_telemetry.postselected} shots` : '--'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
