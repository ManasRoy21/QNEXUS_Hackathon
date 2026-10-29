'use client';

import React, { useState } from 'react';
import { MaterialGenerationRequest, CanonicalSimulationState } from '@/types/unifiedSimulation';
import { Play, Sliders, CheckCircle2, Info, ChevronDown, ChevronUp } from 'lucide-react';
import VirtualOpticalLaboratory from './VirtualOpticalLaboratory';

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
  // Hardware and channel parameters matching Reference Image 1
  const [pulseCount, setPulseCount] = useState<number>(10000);
  const [distanceKm, setDistanceKm] = useState<number>(25.0);
  const [fiberAttenuation, setFiberAttenuation] = useState<number>(0.20);
  const [detectorEfficiency, setDetectorEfficiency] = useState<number>(0.80);
  const [darkCountRate, setDarkCountRate] = useState<number>(0.000001);
  const [baselineQber, setBaselineQber] = useState<number>(0.020);
  const [beta, setBeta] = useState<number>(0.20);
  const [ta, setTa] = useState<number>(0.10);
  const [tv, setTv] = useState<number>(0.15);
  const [seed, setSeed] = useState<number>(12345);
  const [measurementBackend, setMeasurementBackend] = useState<'numpy' | 'qiskit_aer'>('qiskit_aer');

  const [showSliders, setShowSliders] = useState<boolean>(false);

  const handleGenerateClick = () => {
    onGenerate({
      measurement_backend: measurementBackend,
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
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center gap-4 text-xs">
        <label htmlFor="measurement-backend" className="font-semibold">Measurement engine</label>
        <select id="measurement-backend" disabled={loading} value={measurementBackend} onChange={e => setMeasurementBackend(e.target.value as 'numpy' | 'qiskit_aer')} className="border rounded px-3 py-2 bg-white">
          <option value="qiskit_aer">Qiskit Aer · actual circuit outcomes</option>
          <option value="numpy">NumPy · statistical approximation</option>
        </select>
        <a href="/experiments" className="text-[#8d77b0] ml-auto">Run repeated attack trials ↗</a>
        {simulationState?.execution?.backend && <p className="w-full text-slate-500">Last result: {simulationState.execution.backend}. Sampling decisions: Bob {simulationState.parameter_estimation?.bob?.decision}; Charlie {simulationState.parameter_estimation?.charlie?.decision}. These estimate mismatch rates, not complete QDS security.</p>}
      </div>
      {/* ── Virtual Quantum Optical Laboratory Component ───────────────────── */}
      <VirtualOpticalLaboratory
        distanceKm={distanceKm}
        fiberAttenuation={fiberAttenuation}
        pulseCount={pulseCount}
        simulationState={simulationState}
        onGenerate={handleGenerateClick}
        loading={loading}
      />

      {/* ── Two-Column Bottom Section (Matching Reference Image 1) ─────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Left Card: Simulation Parameters ──────────────────────────────── */}
        <div className="bg-white border border-[#CBD5E1] rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0] mb-4">
              <h3 className="text-sm font-mono font-bold text-[#071842] flex items-center gap-2 uppercase tracking-wide">
                <span className="text-[#2563EB]">⚙</span>
                <span>Simulation Parameters</span>
              </h3>

              <button
                type="button"
                onClick={() => setShowSliders(!showSliders)}
                className="text-xs font-mono text-[#2563EB] hover:text-[#1D4ED8] flex items-center gap-1 font-semibold cursor-pointer"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>{showSliders ? 'Hide Sliders' : 'Adjust Parameters'}</span>
                {showSliders ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Clean 2-column parameter view (Exact match to Reference Image 1) */}
            <div className="grid grid-cols-2 gap-x-8 gap-y-3 font-mono text-xs">
              {/* Col 1 */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[#64748B]">Pulse Count (N)</span>
                  <strong className="text-[#071842] font-semibold">{pulseCount.toLocaleString()}</strong>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[#64748B]">Transmission Distance</span>
                  <strong className="text-[#071842] font-semibold">{distanceKm} km</strong>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[#64748B]">Fiber Loss (dB/km)</span>
                  <strong className="text-[#071842] font-semibold">{fiberAttenuation.toFixed(2)}</strong>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[#64748B]">Detector Efficiency (η)</span>
                  <strong className="text-[#071842] font-semibold">{detectorEfficiency.toFixed(2)}</strong>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[#64748B]">RNG Seed</span>
                  <strong className="text-[#071842] font-semibold">{seed}</strong>
                </div>
              </div>

              {/* Col 2 */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[#64748B]">Baseline QBER</span>
                  <strong className="text-[#071842] font-semibold">{baselineQber.toFixed(2)}</strong>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[#64748B]">Sampling Ratio (β)</span>
                  <strong className="text-[#071842] font-semibold">{beta.toFixed(2)}</strong>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[#64748B]">Authentication Threshold (Ta)</span>
                  <strong className="text-[#071842] font-semibold">{ta.toFixed(2)}</strong>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[#64748B]">Verification Threshold (Tv)</span>
                  <strong className="text-[#071842] font-semibold">{tv.toFixed(2)}</strong>
                </div>
              </div>
            </div>

            {/* Expandable sliders drawer */}
            {showSliders && (
              <div className="mt-5 pt-4 border-t border-[#E2E8F0] space-y-4">
                <div>
                  <div className="flex justify-between text-[11px] font-mono text-[#475569] mb-1">
                    <span>Pulse Count: {pulseCount.toLocaleString()}</span>
                  </div>
                  <input
                    type="range"
                    min="1000"
                    max="20000"
                    step="500"
                    value={pulseCount}
                    onChange={(e) => setPulseCount(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[11px] font-mono text-[#475569] mb-1">
                    <span>Distance: {distanceKm} km</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="100"
                    step="5"
                    value={distanceKm}
                    onChange={(e) => setDistanceKm(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                  <div>
                    <label className="text-[10px] text-[#64748B] block mb-1">Fiber Loss (dB/km)</label>
                    <input
                      type="number"
                      step="0.05"
                      value={fiberAttenuation}
                      onChange={(e) => setFiberAttenuation(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 border border-[#CBD5E1] rounded-lg bg-[#F8FAF9]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-[#64748B] block mb-1">Detector Efficiency (η)</label>
                    <input
                      type="number"
                      step="0.05"
                      value={detectorEfficiency}
                      onChange={(e) => setDetectorEfficiency(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 border border-[#CBD5E1] rounded-lg bg-[#F8FAF9]"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="mt-5 pt-3 border-t border-[#E2E8F0] flex items-center justify-between">
            <span className="text-[11px] font-mono text-[#64748B]">
              Protocol: <strong className="text-[#071842]">{protocol || 'Practical QDS'}</strong>
            </span>

            <button
              onClick={handleGenerateClick}
              disabled={loading}
              className="px-4 py-2 rounded-lg text-xs font-mono font-bold text-white bg-[#2563EB] hover:bg-[#1D4ED8] transition-colors shadow-xs inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{loading ? 'Simulating...' : 'Run Simulation'}</span>
            </button>
          </div>
        </div>

        {/* ── Right Card: Simulation Telemetry ─────────────────────────────── */}
        <div className="bg-white border border-[#CBD5E1] rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0] mb-4">
              <h3 className="text-sm font-mono font-bold text-[#071842] flex items-center gap-2 uppercase tracking-wide">
                <span className="text-[#2563EB]">📊</span>
                <span>Simulation Telemetry</span>
              </h3>

              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-mono font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Ready</span>
              </div>
            </div>

            {/* Simulation Outputs Subsection */}
            <div className="mb-4">
              <h4 className="text-[11px] font-mono font-bold text-[#071842] uppercase tracking-wider mb-2.5">
                Simulation Outputs
              </h4>

              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs font-mono">
                <div className="flex items-center justify-between">
                  <span className="text-[#64748B]">Transmitted Pulses</span>
                  <span className="text-[#071842] font-semibold">
                    {simulationState ? simulationState.measurement_statistics.transmitted_pulses.toLocaleString() : '-'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[#64748B]">Test Bits</span>
                  <span className="text-[#071842] font-semibold">
                    {simulationState ? simulationState.material.test_bits.bob_test_count.toLocaleString() : '-'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[#64748B]">Detected Events</span>
                  <span className="text-[#071842] font-semibold">
                    {simulationState ? simulationState.measurement_statistics.detected_events.toLocaleString() : '-'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[#64748B]">Untested Signature Bits (Mu)</span>
                  <span className="text-[#071842] font-semibold">
                    {simulationState ? simulationState.material.untested_bits.M_u_bob.toLocaleString() : '-'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[#64748B]">Bob Conclusive Results (KB)</span>
                  <span className="text-[#071842] font-semibold">
                    {simulationState ? simulationState.measurement_statistics.conclusive_count_bob.toLocaleString() : '-'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[#64748B]">Charlie Conclusive Results (KC)</span>
                  <span className="text-[#071842] font-semibold">
                    {simulationState ? simulationState.measurement_statistics.conclusive_count_charlie.toLocaleString() : '-'}
                  </span>
                </div>
              </div>
            </div>

            {/* QBER / Mismatch Rate Subsection */}
            <div className="mb-4 pt-3 border-t border-[#F1F5F9]">
              <h4 className="text-[11px] font-mono font-bold text-[#071842] uppercase tracking-wider mb-2.5">
                QBER / Mismatch Rate
              </h4>

              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs font-mono">
                <div className="flex items-center justify-between">
                  <span className="text-[#64748B]">Bob QBER / Mismatch Rate</span>
                  <span className="text-[#071842] font-semibold">
                    {simulationState ? `${(simulationState.measurement_statistics.qber_bob * 100).toFixed(2)}%` : '-'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[#64748B]">Charlie Mismatch Rate</span>
                  <span className="text-[#071842] font-semibold">
                    {simulationState ? `${(simulationState.measurement_statistics.qber_charlie * 100).toFixed(2)}%` : '-'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom callout matching Reference Image 1 */}
          <div className="mt-4">
            {simulationState ? (
              <div className="bg-[#F0FDF4] border border-emerald-200 rounded-xl p-3 flex items-start gap-2.5 text-xs font-mono text-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-bold">Signature Material Generated Successfully</strong>
                  <span>
                    Measurement run saved. Bob sampling decision: {simulationState.parameter_estimation?.bob?.decision || 'not available'}; Charlie: {simulationState.parameter_estimation?.charlie?.decision || 'not available'}. Generating material does not certify a secure channel.
                  </span>
                </div>
              </div>
            ) : (
              <div className="bg-[#EFF6FF] border border-blue-200 rounded-xl p-3 flex items-start gap-2.5 text-xs font-mono text-[#1E40AF]">
                <Info className="w-4 h-4 text-[#2563EB] flex-shrink-0 mt-0.5" />
                <span>Results will be populated after running the simulation.</span>
              </div>
            )}
          </div>
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
          className="px-6 py-2.5 rounded-lg text-xs font-mono font-semibold text-white bg-[#071842] hover:bg-slate-800 transition-colors shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          Proceed to Step 03: Alice Signs Message →
        </button>
      </div>
    </div>
  );
}
