'use client';

import React, { useState } from 'react';
import { MaterialGenerationRequest, CanonicalSimulationState } from '@/types/unifiedSimulation';
import { Play, Activity, Binary, ArrowRight, CheckCircle2, Shield, Info, Layers } from 'lucide-react';
import { InlineMath } from '@/components/common/MathBlock';

interface Props {
  protocol: string;
  simulationState: CanonicalSimulationState | null;
  onGenerate: (req: MaterialGenerationRequest) => Promise<void>;
  loading: boolean;
  onNext: () => void;
  onBack: () => void;
}

export default function Step02Material({
  protocol,
  simulationState,
  onGenerate,
  loading,
  onNext,
  onBack,
}: Props) {
  const [pulseCount, setPulseCount] = useState<number>(2000);
  const [distanceKm, setDistanceKm] = useState<number>(25.0);
  const [fiberAttenuation, setFiberAttenuation] = useState<number>(0.2);
  const [detectorEfficiency, setDetectorEfficiency] = useState<number>(0.1);
  const [darkCountRate, setDarkCountRate] = useState<number>(0.000001);
  const [baselineQber, setBaselineQber] = useState<number>(0.010);
  const [beta, setBeta] = useState<number>(0.30);
  const [ta, setTa] = useState<number>(0.0150);
  const [tv, setTv] = useState<number>(0.0645);
  const [seed, setSeed] = useState<number>(42);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onGenerate({
      protocol,
      pulse_count: pulseCount,
      distance_km: distanceKm,
      fiber_attenuation: fiberAttenuation,
      detector_efficiency: detectorEfficiency,
      dark_count_rate: darkCountRate,
      baseline_qber: baselineQber,
      beta,
      authentication_threshold: ta,
      verification_threshold: tv,
      seed,
    });
  };

  return (
    <div className="space-y-6">
      {/* ── Step Header ──────────────────────────────────────────────────────── */}
      <div className="border-b border-[#CBD5E1] pb-3">
        <span className="text-xs font-mono font-bold text-[#64748B] uppercase tracking-wider block">
          STEP 02 OF 06
        </span>
        <h2 className="font-serif text-2xl text-[#071842]">Generate Quantum Signature Material</h2>
        <p className="text-xs text-[#475569] mt-1">
          Distribute quantum optical states through simulated fiber channels. Alice emits coherent pulses to Bob and Charlie, who measure conclusive bit registers and split them into test bits and untested signature material.
        </p>
      </div>

      {/* ── Visual Quantum Pipeline Diagram ──────────────────────────────────── */}
      <div className="bg-white border border-[#CBD5E1] rounded-xl p-4 shadow-xs">
        <span className="text-[10px] font-mono font-bold text-[#64748B] uppercase tracking-wider block mb-3">
          Quantum Distribution &amp; Sifting Pipeline
        </span>
        <div className="grid grid-cols-2 md:grid-cols-7 gap-2 text-center text-xs font-mono items-center">
          <div className="p-2.5 rounded-lg bg-[#071842] text-white">
            <span className="text-[9px] text-[#20C8A7] block font-bold">SOURCE</span>
            <span className="font-bold text-[11px] block">Alice</span>
            <span className="text-[9px] text-[#94A3B8]">Pulses: {pulseCount}</span>
          </div>

          <div className="hidden md:flex justify-center text-[#64748B]">
            <ArrowRight className="w-4 h-4" />
          </div>

          <div className="p-2.5 rounded-lg bg-[#F8FAF9] border border-[#CBD5E1]">
            <span className="text-[9px] text-[#64748B] block font-bold">CHANNELS</span>
            <span className="font-bold text-[#071842] text-[11px] block">{distanceKm} km Fiber</span>
            <span className="text-[9px] text-[#64748B]">Loss: {(distanceKm * fiberAttenuation).toFixed(1)} dB</span>
          </div>

          <div className="hidden md:flex justify-center text-[#64748B]">
            <ArrowRight className="w-4 h-4" />
          </div>

          <div className="p-2.5 rounded-lg bg-[#F8FAF9] border border-[#CBD5E1]">
            <span className="text-[9px] text-[#64748B] block font-bold">RECEIVERS</span>
            <span className="font-bold text-[#071842] text-[11px] block">Bob &amp; Charlie</span>
            <span className="text-[9px] text-[#64748B]">
              {simulationState ? (
                <>
                  <InlineMath math="K_B" />: {simulationState.measurement_statistics.conclusive_count_bob} |{' '}
                  <InlineMath math="K_C" />: {simulationState.measurement_statistics.conclusive_count_charlie}
                </>
              ) : (
                'Conclusive detection'
              )}
            </span>
          </div>

          <div className="hidden md:flex justify-center text-[#64748B]">
            <ArrowRight className="w-4 h-4" />
          </div>

          <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900">
            <span className="text-[9px] text-emerald-700 block font-bold">SIGNATURE MATERIAL</span>
            <span className="font-bold text-[11px] block">
              Test (<InlineMath math="\beta" />) + Untested (<InlineMath math="M_u" />)
            </span>
            <span className="text-[9px] text-emerald-700">
              {simulationState ? (
                <>
                  <InlineMath math="M_u" /> = {simulationState.material.untested_bits.M_u_bob}
                </>
              ) : (
                'Ready to split'
              )}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left 1-col: Configuration form ──────────────────────────────────── */}
        <form onSubmit={handleSubmit} className="bg-white border border-[#CBD5E1] rounded-xl p-5 space-y-4 shadow-xs">
          <h3 className="text-xs font-mono font-bold text-[#071842] uppercase tracking-wider border-b border-[#E2E8F0] pb-2">
            Channel &amp; Hardware Parameters
          </h3>

          <div>
            <div className="flex justify-between items-center text-[11px] font-mono text-[#475569] mb-1">
              <span>Pulse Count (N):</span>
              <strong className="text-[#071842]">{pulseCount.toLocaleString()}</strong>
            </div>
            <input
              type="range"
              min="200"
              max="10000"
              step="200"
              value={pulseCount}
              onChange={(e) => setPulseCount(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between items-center text-[11px] font-mono text-[#475569] mb-1">
              <span>Distance:</span>
              <strong className="text-[#071842]">{distanceKm} km</strong>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={distanceKm}
              onChange={(e) => setDistanceKm(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-mono text-[#475569] block mb-0.5">Fiber Loss (dB/km)</label>
              <input
                type="number"
                step="0.05"
                value={fiberAttenuation}
                onChange={(e) => setFiberAttenuation(Number(e.target.value))}
                className="w-full px-2 py-1 text-xs font-mono border border-[#CBD5E1] rounded-md bg-[#F8FAF9]"
              />
            </div>
            <div>
              <label className="text-[10px] font-mono text-[#475569] block mb-0.5">Detector Eff (η)</label>
              <input
                type="number"
                step="0.05"
                value={detectorEfficiency}
                onChange={(e) => setDetectorEfficiency(Number(e.target.value))}
                className="w-full px-2 py-1 text-xs font-mono border border-[#CBD5E1] rounded-md bg-[#F8FAF9]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-mono text-[#475569] block mb-0.5">Seed (RNG)</label>
              <input
                type="number"
                value={seed}
                onChange={(e) => setSeed(Number(e.target.value))}
                className="w-full px-2 py-1 text-xs font-mono border border-[#CBD5E1] rounded-md bg-[#F8FAF9]"
              />
            </div>
            <div>
              <label className="text-[10px] font-mono text-[#475569] block mb-0.5">Baseline QBER (e₀)</label>
              <input
                type="number"
                step="0.005"
                value={baselineQber}
                onChange={(e) => setBaselineQber(Number(e.target.value))}
                className="w-full px-2 py-1 text-xs font-mono border border-[#CBD5E1] rounded-md bg-[#F8FAF9]"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[10px] font-mono text-[#475569] block mb-0.5">Beta (β)</label>
              <input
                type="number"
                step="0.05"
                value={beta}
                onChange={(e) => setBeta(Number(e.target.value))}
                className="w-full px-2 py-1 text-xs font-mono border border-[#CBD5E1] rounded-md bg-[#F8FAF9]"
              />
            </div>
            <div>
              <label className="text-[10px] font-mono text-[#475569] block mb-0.5">Auth (Ta)</label>
              <input
                type="number"
                step="0.005"
                value={ta}
                onChange={(e) => setTa(Number(e.target.value))}
                className="w-full px-2 py-1 text-xs font-mono border border-[#CBD5E1] rounded-md bg-[#F8FAF9]"
              />
            </div>
            <div>
              <label className="text-[10px] font-mono text-[#475569] block mb-0.5">Verif (Tv)</label>
              <input
                type="number"
                step="0.005"
                value={tv}
                onChange={(e) => setTv(Number(e.target.value))}
                className="w-full px-2 py-1 text-xs font-mono border border-[#CBD5E1] rounded-md bg-[#F8FAF9]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-teal py-2.5 rounded-lg text-xs font-mono font-bold shadow-xs inline-flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5" />
            <span>{loading ? 'Simulating Optical Channels...' : 'Generate Signature Material'}</span>
          </button>
        </form>

        {/* ── Right 2-cols: Live State Telemetry ──────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">
          {simulationState ? (
            <div className="bg-white border border-[#CBD5E1] rounded-xl p-5 space-y-4 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E2E8F0] pb-2">
                <div>
                  <span className="text-xs font-mono font-bold text-[#071842] uppercase tracking-wider block">
                    Simulation Telemetry
                  </span>
                  <span className="text-[10px] font-mono text-[#64748B]">
                    ID: {simulationState.simulation_id} · Model: {simulationState.model_version}
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-50 text-emerald-700 border border-emerald-200">
                  DETERMINISTIC SEED: {simulationState.seed}
                </span>
              </div>

              {/* 4 Primary Metric Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
                <div className="bg-[#F8FAF9] p-3 rounded-lg border border-[#E2E8F0]">
                  <span className="text-[10px] text-[#64748B] block font-semibold">BOB CONCLUSIVE</span>
                  <span className="text-lg font-bold text-[#071842]">
                    {simulationState.measurement_statistics.conclusive_count_bob}
                  </span>
                  <span className="text-[10px] text-[#64748B] block mt-0.5">
                    Rate: {((simulationState.measurement_statistics.conclusive_count_bob / simulationState.configuration.pulse_count) * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="bg-[#F8FAF9] p-3 rounded-lg border border-[#E2E8F0]">
                  <span className="text-[10px] text-[#64748B] block font-semibold">CHARLIE CONCLUSIVE</span>
                  <span className="text-lg font-bold text-[#071842]">
                    {simulationState.measurement_statistics.conclusive_count_charlie}
                  </span>
                  <span className="text-[10px] text-[#64748B] block mt-0.5">
                    Rate: {((simulationState.measurement_statistics.conclusive_count_charlie / simulationState.configuration.pulse_count) * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="bg-[#F8FAF9] p-3 rounded-lg border border-[#E2E8F0]">
                  <span className="text-[10px] text-[#64748B] block font-semibold">
                    BOB QBER (<InlineMath math="e_B" />)
                  </span>
                  <span className="text-lg font-bold text-[#20C8A7]">
                    {(simulationState.measurement_statistics.qber_bob * 100).toFixed(2)}%
                  </span>
                  <span className="text-[10px] text-emerald-600 block mt-0.5">
                    {simulationState.measurement_statistics.qber_bob <= simulationState.configuration.authentication_threshold
                      ? '✓ Below Auth Thresh'
                      : '⚠ Exceeds Auth Thresh'}
                  </span>
                </div>
                <div className="bg-[#F8FAF9] p-3 rounded-lg border border-[#E2E8F0]">
                  <span className="text-[10px] text-[#64748B] block font-semibold">
                    UNTESTED BITS (<InlineMath math="M_u" />)
                  </span>
                  <span className="text-lg font-bold text-[#263EDC]">
                    {simulationState.material.untested_bits.M_u_bob}
                  </span>
                  <span className="text-[10px] text-[#64748B] block mt-0.5">
                    Test: {simulationState.material.test_bits.bob_test_count} (
                    <InlineMath math={`\\beta=${simulationState.material.test_bits.beta}`} />)
                  </span>
                </div>
              </div>

              {/* Extended Measurement Details */}
              <div className="p-3 bg-[#F8FAF9] rounded-lg border border-[#E2E8F0] grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
                <div>
                  <span className="text-[#64748B] block">Transmitted:</span>
                  <strong className="text-[#071842]">{simulationState.measurement_statistics.transmitted_pulses}</strong>
                </div>
                <div>
                  <span className="text-[#64748B] block">Detected Events:</span>
                  <strong className="text-[#071842]">{simulationState.measurement_statistics.detected_events}</strong>
                </div>
                <div>
                  <span className="text-[#64748B] block">Bob Mismatches:</span>
                  <strong className="text-[#071842]">{simulationState.measurement_statistics.mismatch_count_bob}</strong>
                </div>
                <div>
                  <span className="text-[#64748B] block">Charlie Mismatches:</span>
                  <strong className="text-[#071842]">{simulationState.measurement_statistics.mismatch_count_charlie}</strong>
                </div>
              </div>

              {/* Sample Bit Registers */}
              <div className="space-y-2">
                <span className="text-[11px] font-mono text-[#64748B] block font-semibold">
                  Sample Conclusive Registers (<InlineMath math="K_B" /> &amp; <InlineMath math="K_C" />):
                </span>
                <div className="bg-[#071842] text-[#20C8A7] font-mono text-xs p-3 rounded-lg overflow-x-auto space-y-1">
                  <div>
                    <span className="text-[#94A3B8]">
                      Bob (<InlineMath math="K_B" />):{' '}
                    </span>
                    {simulationState.material.bob_conclusive_bits.slice(0, 48)}...
                  </div>
                  <div>
                    <span className="text-[#94A3B8]">
                      Charlie (<InlineMath math="K_C" />):{' '}
                    </span>
                    {simulationState.material.charlie_conclusive_bits.slice(0, 48)}...
                  </div>
                </div>
              </div>

              {/* Model Assumptions & Simplifications if available */}
              {simulationState.model_metadata && (
                <div className="pt-2 border-t border-[#E2E8F0] text-[10px] font-mono text-[#64748B] space-y-1">
                  <div>
                    <strong className="text-[#071842]">Assumptions:</strong>{' '}
                    {simulationState.model_metadata.assumptions?.join('; ') || 'Standard phase randomized weak coherent states'}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white border border-[#CBD5E1] rounded-xl p-12 text-center space-y-3">
              <Binary className="w-12 h-12 text-[#94A3B8] mx-auto opacity-40" />
              <h4 className="font-serif text-lg text-[#071842]">No Signature Material Generated Yet</h4>
              <p className="text-xs text-[#64748B] max-w-md mx-auto">
                Configure channel parameters on the left and click &ldquo;Generate Signature Material&rdquo; to simulate physical state distribution and measure conclusive registers.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Footer Navigation ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between pt-4 border-t border-[#CBD5E1]">
        <button
          onClick={onBack}
          className="px-4 py-2 rounded-lg text-xs font-mono font-semibold bg-white border border-[#CBD5E1] text-[#071842] hover:bg-slate-50 cursor-pointer"
        >
          ← Back to Step 01
        </button>
        <button
          onClick={onNext}
          disabled={!simulationState}
          className="btn-dark px-6 py-2.5 rounded-lg text-xs font-mono font-semibold shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          Proceed to Step 03: Alice Signs Message →
        </button>
      </div>
    </div>
  );
}
