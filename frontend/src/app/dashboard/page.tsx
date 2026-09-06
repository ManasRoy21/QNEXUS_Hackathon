'use client';

import React, { useState, useEffect } from 'react';
import ThreatVerdictGauge from '@/components/dashboard/ThreatVerdictGauge';
import ReasonCodeBadges from '@/components/dashboard/ReasonCodeBadges';
import LiveHistogram from '@/components/dashboard/LiveHistogram';
import CircuitVisualizer from '@/components/circuit/CircuitVisualizer';
import { useSimulation } from '@/hooks/useSimulation';
import { useWebSocket } from '@/hooks/useWebSocket';

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

  // Handle full lifecycle run
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
    <div className="space-y-6">
      {/* Top Operations Header & Control Bar */}
      <div className="bg-slate-900/90 border border-slate-800/90 rounded-xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg shadow-black/40">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-black text-slate-100 tracking-wide">
              Quantum SOC Operations Console
            </h2>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-cyan-950/70 border border-cyan-800 text-cyan-300">
              Deterministic v1
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Real-time multi-party Quantum Digital Signatures (QDS) security evaluation and Hoeffding statistical bounds.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Bit Length Selector */}
          <div className="flex items-center space-x-1 bg-slate-950 border border-slate-800 rounded-lg p-1 text-xs">
            <span className="text-slate-500 px-2 font-mono">Bits:</span>
            {[16, 32, 64].map((b) => (
              <button
                key={b}
                disabled={loading}
                onClick={() => setNumBits(b)}
                className={`px-2 py-1 font-mono rounded transition-colors ${
                  numBits === b
                    ? 'bg-cyan-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {b}
              </button>
            ))}
          </div>

          {/* Verifier Selector */}
          <div className="flex items-center space-x-1 bg-slate-950 border border-slate-800 rounded-lg p-1 text-xs">
            <span className="text-slate-500 px-2 font-mono">Verifier:</span>
            {(['bob', 'charlie', 'both'] as const).map((v) => (
              <button
                key={v}
                disabled={loading}
                onClick={() => setVerifierId(v)}
                className={`px-2 py-1 font-mono uppercase rounded transition-colors ${
                  verifierId === v
                    ? 'bg-indigo-600 text-white font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {v}
              </button>
            ))}
          </div>

          {/* Run Full Lifecycle Button */}
          <button
            onClick={handleRunLifecycle}
            disabled={loading}
            className={`px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition-all flex items-center space-x-2 ${
              loading
                ? 'bg-cyan-900/60 text-cyan-300 border border-cyan-700 cursor-wait'
                : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.4)] cursor-pointer'
            }`}
          >
            {loading ? (
              <>
                <span className="h-3 w-3 border-2 border-slate-950 border-t-cyan-200 rounded-full animate-spin" />
                <span>Simulating...</span>
              </>
            ) : (
              <>
                <span>▶ Run Clean Lifecycle</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Session Metadata & Status Pill */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs font-mono text-slate-400">
        <div className="flex items-center space-x-3">
          <span>
            Active Session:{' '}
            <strong className="text-cyan-400">{sessionId || 'None (Click Run to Start)'}</strong>
          </span>
          {step !== 'idle' && (
            <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300 uppercase">
              Phase: {step}
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <span
            className={`h-2 w-2 rounded-full ${
              wsConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
            }`}
          />
          <span>{wsConnected ? 'WebSocket Live Feed Online' : 'WebSocket Standby'}</span>
        </div>
      </div>

      {/* Error Alert if any */}
      {error && (
        <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-300 text-xs font-mono">
          <strong>ERROR:</strong> {error}
        </div>
      )}

      {/* Main Grid: Gauge (1 col) and Reason Codes (2 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-md">
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
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 lg:col-span-2 shadow-md flex flex-col justify-between">
          <ReasonCodeBadges
            reasonCodes={verifyData?.reason_codes || []}
            diagnosticMessage={verifyData?.diagnostic_message}
            postselectedShots={verifyData?.postselected_shots}
            discardedShots={verifyData?.discarded_shots}
          />
        </div>
      </div>

      {/* Secondary Grid: Live Histogram and Circuit Visualizer */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-md">
          <LiveHistogram
            qber={currentQber}
            postselectedShots={verifyData?.postselected_shots}
          />
        </div>
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-md">
          <CircuitVisualizer
            currentStage={step === 'idle' ? 'keygen' : (step as any)}
          />
        </div>
      </div>

      {/* WebSocket Real-Time Frame Telemetry Terminal */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-md space-y-2">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center space-x-2">
            <span className="h-2 w-2 rounded-full bg-cyan-400" />
            <h3 className="text-xs font-mono font-medium text-slate-300 uppercase tracking-wider">
              WebSocket Telemetry Stream (/ws/stream)
            </h3>
          </div>
          <span className="text-[11px] font-mono text-slate-500">
            {telemetryLog.length} frames captured
          </span>
        </div>
        <div className="bg-slate-950 rounded-lg p-3 max-h-44 overflow-y-auto font-mono text-[11px] space-y-1">
          {telemetryLog.length === 0 ? (
            <div className="text-slate-600 italic">
              Awaiting telemetry broadcast... (Trigger a simulation to stream live frames)
            </div>
          ) : (
            telemetryLog.map((frame, idx) => (
              <div key={idx} className="flex items-center space-x-3 text-slate-300">
                <span className="text-slate-500">
                  {new Date(frame.timestamp * 1000).toLocaleTimeString()}
                </span>
                <span className="px-1.5 py-0.2 rounded bg-slate-900 border border-slate-800 text-cyan-400 font-bold">
                  {frame.event_type}
                </span>
                <span className="text-slate-400">
                  QBER: {(frame.qber * 100).toFixed(2)}%
                </span>
                <span className="text-slate-400">
                  Threat: <strong className={frame.active_threat !== 'CLEAN' ? 'text-rose-400' : 'text-emerald-400'}>{frame.active_threat}</strong>
                </span>
                <span className="text-slate-500 truncate max-w-xs">
                  {frame.channel_telemetry?.message || ''}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
