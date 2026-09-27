'use client';

import React, { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  Activity,
  Play,
  FileSpreadsheet,
  FileCode,
  Calculator,
  CheckCircle2,
  AlertCircle,
  Info,
} from 'lucide-react';
import SimulatedBadge from '@/components/common/SimulatedBadge';
import { qdsClient } from '@/services/qdsClient';
import { SweepResponse } from '@/types/unifiedSimulation';

/* ─────────────────────────────────────────────────────────────────────────── */
/* Sweep Preset Definitions — 6 Required Benchmark Graphs                      */
/* ─────────────────────────────────────────────────────────────────────────── */

interface SweepPreset {
  id: string;
  label: string;
  graphTitle: string;
  param: string;
  defaultMin: number;
  defaultMax: number;
  defaultStep: number;
  defaultAttack: string;
  defaultPulseCount: number;
  formula: string;
  description: string;
}

const SWEEP_PRESETS: SweepPreset[] = [
  {
    id: 'gamma_qber',
    label: '1. QBER vs Attack Strength (γ)',
    graphTitle: 'QBER vs Attack Strength γ [FR-E3 Intercept-Resend]',
    param: 'intensity',
    defaultMin: 0.0,
    defaultMax: 1.0,
    defaultStep: 0.1,
    defaultAttack: 'INTERCEPT_RESEND',
    defaultPulseCount: 2000,
    formula: 'e_obs = e_0 + 0.5·γ·(1 − 2·e_0),   abort if e_obs > T_a',
    description:
      'Evaluates intercept-resend eavesdropping (FR-E3). Eve intercepts fraction γ of pulses, elevating QBER toward 50%. The protocol aborts when e_obs > T_a.',
  },
  {
    id: 'n_failure',
    label: '2. Failure Probability vs Pulse Count (N)',
    graphTitle: 'Security Failure Probability ε₁ vs Pulse Count N',
    param: 'pulse_count',
    defaultMin: 1000,
    defaultMax: 10000,
    defaultStep: 1500,
    defaultAttack: 'FORGERY',
    defaultPulseCount: 2000,
    formula: 'ε₁ ≤ exp(−(S_c − T_v)² / (2·S_c) · P_C^c · M_u)',
    description:
      'Demonstrates exponential suppression of existential forgery bound ε₁ as total pulse count N and untested register M_u grow.',
  },
  {
    id: 'dist_rate',
    label: '3. Signature Rate vs Distance (km)',
    graphTitle: 'Signature Rate R = M_u / (2·N) vs Distance (km)',
    param: 'distance_km',
    defaultMin: 5,
    defaultMax: 80,
    defaultStep: 15,
    defaultAttack: 'NONE',
    defaultPulseCount: 3000,
    formula: 'R = M_u / (2·N)   (conclusive untested bits per total optical pulses)',
    description:
      'Measures effective signature generation rate R = M_u / (2N). N represents pulses sent to each recipient; 2N total optical pulses are used per signature bit.',
  },
  {
    id: 'ta_repudiation',
    label: '4. Repudiation Probability vs Ta/Tv Gap',
    graphTitle: 'Repudiation Bound ε₂ vs Authentication Threshold T_a',
    param: 'authentication_threshold',
    defaultMin: 0.005,
    defaultMax: 0.045,
    defaultStep: 0.008,
    defaultAttack: 'REPUDIATION',
    defaultPulseCount: 2000,
    formula: 'ε₂ ≤ exp(−2·(T_v − T_a − Δ)²·M_u²·β² / n_test)',
    description:
      'Examines signer repudiation probability ε₂ as the threshold gap (T_v − T_a) narrows when T_a increases toward T_v = 0.065.',
  },
  {
    id: 'tv_forgery',
    label: '5. Forgery Probability vs Verification Threshold (Tv)',
    graphTitle: 'Forgery Bound ε₁ vs Verification Threshold T_v',
    param: 'verification_threshold',
    defaultMin: 0.02,
    defaultMax: 0.12,
    defaultStep: 0.02,
    defaultAttack: 'FORGERY',
    defaultPulseCount: 3000,
    formula: 'ε₁ ≤ exp(−(S_c − T_v)² / (2·S_c) · P_C^c · M_u)',
    description:
      'Analyzes unforgeability guarantee ε₁ as verification threshold T_v approaches the minimal conclusive fraction S_c.',
  },
  {
    id: 'dist_qber',
    label: '6. QBER vs Distance (km)',
    graphTitle: 'Channel QBER (%) vs Optical Transmission Distance (km)',
    param: 'distance_km',
    defaultMin: 0,
    defaultMax: 100,
    defaultStep: 20,
    defaultAttack: 'NONE',
    defaultPulseCount: 2000,
    formula: 'QBER = (e_det·η + 0.5·p_dark) / (η + p_dark),   η = 10^(−α·L/10)',
    description:
      'Evaluates baseline physical channel error rate elevation as fiber attenuation reduces signal intensity relative to detector dark counts.',
  },
];

const PROTOCOLS = [
  { id: 'practical_qds', label: 'Practical QDS (Yin, Fu, Chen)' },
  { id: 'mdi_qds', label: 'MDI-QDS (Roberts et al.)' },
  { id: 'otuh_qds', label: 'OTUH-QDS (2023)' },
  { id: 'tf_qds', label: 'Twin-Field QDS' },
];

const ATTACKS = [
  { id: 'NONE', label: 'None (Channel Only)' },
  { id: 'INTERCEPT_RESEND', label: 'Intercept-Resend (FR-E3)' },
  { id: 'FORGERY', label: 'Existential Forgery (FR-E1)' },
  { id: 'REPUDIATION', label: 'Signer Repudiation (FR-E2)' },
];

const PARAMS = [
  { id: 'intensity', label: 'intensity (γ) — attack strength [0,1]' },
  { id: 'pulse_count', label: 'pulse_count (N) — total pulses [64,50000]' },
  { id: 'distance_km', label: 'distance_km — fibre distance [0,150]' },
  { id: 'authentication_threshold', label: 'authentication_threshold (T_a)' },
  { id: 'verification_threshold', label: 'verification_threshold (T_v)' },
  { id: 'beta', label: 'beta (β) — test-bit fraction [0,1]' },
  { id: 'baseline_qber', label: 'baseline_qber (e_0) — base error rate' },
];

/* ─────────────────────────────────────────────────────────────────────────── */
/* Page Component                                                               */
/* ─────────────────────────────────────────────────────────────────────────── */

export default function BenchmarksPage() {
  /* Preset selector */
  const [selectedPresetId, setSelectedPresetId] = useState<string>('gamma_qber');

  /* Controls */
  const [protocol, setProtocol] = useState<string>('practical_qds');
  const [param, setParam] = useState<string>('intensity');
  const [minVal, setMinVal] = useState<number>(0.0);
  const [maxVal, setMaxVal] = useState<number>(1.0);
  const [stepVal, setStepVal] = useState<number>(0.1);
  const [seed, setSeed] = useState<number>(42);
  const [attack, setAttack] = useState<string>('INTERCEPT_RESEND');
  const [pulseCount, setPulseCount] = useState<number>(2000);

  /* State */
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [sweepResult, setSweepResult] = useState<SweepResponse | null>(null);

  /* Active preset definition for formula display */
  const activeDef =
    SWEEP_PRESETS.find((p) => p.id === selectedPresetId) || SWEEP_PRESETS[0];

  /* Load a preset into controls */
  const handleSelectPreset = (def: SweepPreset) => {
    setSelectedPresetId(def.id);
    setParam(def.param);
    setMinVal(def.defaultMin);
    setMaxVal(def.defaultMax);
    setStepVal(def.defaultStep);
    setAttack(def.defaultAttack);
    setPulseCount(def.defaultPulseCount);
    setSweepResult(null);
    setError(null);
  };

  /* Build values array from min/max/step */
  const buildValues = (): number[] => {
    const vals: number[] = [];
    if (stepVal <= 0) return [minVal];
    for (let v = minVal; v <= maxVal + 1e-9; v += stepVal) {
      vals.push(Number(v.toFixed(8)));
      if (vals.length >= 50) break;
    }
    if (vals.length === 0) vals.push(minVal);
    return vals;
  };

  /* Execute sweep */
  const handleExecuteSweep = async () => {
    setLoading(true);
    setError(null);
    try {
      const values = buildValues();
      const atk = attack === 'NONE' ? undefined : attack;
      const result = await qdsClient.runSweep(protocol, param, values, pulseCount, seed, atk);
      setSweepResult(result);
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail ||
        err?.message ||
        'Sweep execution failed.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  /* Chart data — map each point to Recharts-friendly entry */
  const chartData =
    sweepResult?.points.map((pt) => ({
      x: pt.parameter_value,
      qber_bob:
        pt.qber_bob !== undefined && pt.qber_bob !== null
          ? Number((pt.qber_bob * 100).toFixed(3))
          : undefined,
      qber_obs:
        pt.qber_obs !== undefined && pt.qber_obs !== null
          ? Number((pt.qber_obs * 100).toFixed(3))
          : undefined,
      epsilon_1:
        pt.epsilon_1 !== undefined && pt.epsilon_1 !== null ? pt.epsilon_1 : undefined,
      epsilon_2:
        pt.epsilon_2 !== undefined && pt.epsilon_2 !== null ? pt.epsilon_2 : undefined,
      signature_rate:
        pt.signature_rate !== undefined && pt.signature_rate !== null
          ? pt.signature_rate
          : undefined,
    })) || [];

  const hasObs = chartData.some((d) => d.qber_obs !== undefined);
  const hasEps1 = chartData.some((d) => d.epsilon_1 !== undefined);
  const hasEps2 = chartData.some((d) => d.epsilon_2 !== undefined);
  const hasSigRate = chartData.some((d) => d.signature_rate !== undefined);
  const hasData = chartData.length > 0;

  /* Export helpers */
  const exportJSON = () => {
    if (!sweepResult) return;
    const blob = new Blob([JSON.stringify(sweepResult, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `qds_sweep_${sweepResult.parameter}_${Date.now()}.json`;
    a.click();
  };

  const exportCSV = () => {
    if (!sweepResult) return;
    const headers = [
      'parameter_value',
      'seed',
      'simulation_id',
      'qber_bob',
      'qber_obs',
      'M_u',
      'n_test',
      'epsilon_1',
      'epsilon_2',
      'signature_rate',
      'verdict',
    ];
    const rows = sweepResult.points.map((pt) => [
      pt.parameter_value,
      pt.seed,
      pt.simulation_id,
      pt.qber_bob,
      pt.qber_obs ?? '',
      pt.M_u,
      pt.n_test,
      pt.epsilon_1 ?? '',
      pt.epsilon_2 ?? '',
      pt.signature_rate ?? '',
      pt.verdict ?? '',
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `qds_sweep_${sweepResult.parameter}_${Date.now()}.csv`;
    a.click();
  };

  return (
    <div className="space-y-8">
      {/* ── Page Header ── */}
      <div className="bg-white border border-[#CBD5E1] rounded-2xl p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-6">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono font-bold text-[#64748B] uppercase tracking-wider">
                PHASE 4: BENCHMARK & PARAMETER SWEEP ENGINE
              </span>
              <SimulatedBadge size="sm" />
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl text-[#071842] tracking-tight">
              Benchmarks &amp; Sweeps
            </h1>
            <p className="text-xs sm:text-sm text-[#475569] font-sans max-w-2xl">
              Multi-point parameter sweeps against the genuine quantum simulation engine. Every
              chart point reuses the exact physical simulation state produced by the Practical QDS
              engine — no disconnected analytics layer.
            </p>
          </div>

          {sweepResult && (
            <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
              <button
                onClick={exportJSON}
                className="px-4 py-2.5 rounded-lg border border-[#CBD5E1] bg-[#F8FAF9] hover:bg-slate-100 text-[#071842] font-semibold transition-colors flex items-center space-x-1.5 shadow-xs cursor-pointer"
              >
                <FileCode className="w-3.5 h-3.5 text-[#263EDC]" />
                <span>Export JSON</span>
              </button>
              <button
                onClick={exportCSV}
                className="px-4 py-2.5 rounded-lg border border-[#CBD5E1] bg-[#F8FAF9] hover:bg-slate-100 text-[#071842] font-semibold transition-colors flex items-center space-x-1.5 shadow-xs cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Export CSV</span>
              </button>
            </div>
          )}
        </div>

        {/* Inline preset chips */}
        <div className="pt-4 flex flex-wrap gap-2">
          {SWEEP_PRESETS.map((def) => {
            const isActive = def.id === selectedPresetId;
            return (
              <button
                key={def.id}
                onClick={() => handleSelectPreset(def)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-mono transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#071842] text-white border-[#071842] font-bold shadow-xs'
                    : 'bg-white text-[#475569] border-[#CBD5E1] hover:border-[#94A3B8]'
                }`}
              >
                {def.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Main Layout: Controls (left) + Results (right) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Controls Panel ── */}
        <div className="space-y-4">
          {/* Configuration Box */}
          <div className="bg-white border border-[#CBD5E1] rounded-xl p-4 space-y-3 shadow-xs">
            <span className="text-xs font-mono font-bold text-[#071842] uppercase tracking-wider block border-b border-[#E2E8F0] pb-1.5">
              Configuration
            </span>

            <div className="space-y-2 text-xs font-mono">
              {/* Protocol */}
              <div>
                <label className="text-[10px] text-[#64748B] block uppercase mb-1">
                  Protocol
                </label>
                <select
                  value={protocol}
                  onChange={(e) => setProtocol(e.target.value)}
                  className="w-full p-2 bg-[#F8FAF9] border border-[#CBD5E1] rounded-lg font-mono text-xs text-[#071842]"
                >
                  {PROTOCOLS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Swept Parameter */}
              <div>
                <label className="text-[10px] text-[#64748B] block uppercase mb-1">
                  Swept Parameter
                </label>
                <select
                  value={param}
                  onChange={(e) => setParam(e.target.value)}
                  className="w-full p-2 bg-[#F8FAF9] border border-[#CBD5E1] rounded-lg font-mono text-xs text-[#071842]"
                >
                  {PARAMS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Min / Max / Step */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Min', val: minVal, setter: setMinVal },
                  { label: 'Max', val: maxVal, setter: setMaxVal },
                  { label: 'Step', val: stepVal, setter: setStepVal },
                ].map(({ label, val, setter }) => (
                  <div key={label}>
                    <label className="text-[10px] text-[#64748B] block uppercase mb-1">
                      {label}
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={val}
                      onChange={(e) => setter(Number(e.target.value))}
                      className="w-full p-1.5 bg-[#F8FAF9] border border-[#CBD5E1] rounded-lg text-xs"
                    />
                  </div>
                ))}
              </div>

              {/* Seed / Pulse Count */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-[#64748B] block uppercase mb-1">
                    Seed
                  </label>
                  <input
                    type="number"
                    value={seed}
                    onChange={(e) => setSeed(Number(e.target.value))}
                    className="w-full p-1.5 bg-[#F8FAF9] border border-[#CBD5E1] rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-[#64748B] block uppercase mb-1">
                    Pulse Count (N)
                  </label>
                  <input
                    type="number"
                    step="500"
                    value={pulseCount}
                    onChange={(e) => setPulseCount(Number(e.target.value))}
                    className="w-full p-1.5 bg-[#F8FAF9] border border-[#CBD5E1] rounded-lg text-xs"
                  />
                </div>
              </div>

              {/* Attack */}
              <div>
                <label className="text-[10px] text-[#64748B] block uppercase mb-1">
                  Attack Vector
                </label>
                <select
                  value={attack}
                  onChange={(e) => setAttack(e.target.value)}
                  className="w-full p-2 bg-[#F8FAF9] border border-[#CBD5E1] rounded-lg font-mono text-xs text-[#071842]"
                >
                  {ATTACKS.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Points preview */}
            <div className="text-[10px] font-mono text-[#64748B] bg-[#F8FAF9] border border-[#E2E8F0] rounded px-2 py-1">
              ≈{' '}
              {stepVal > 0
                ? Math.min(50, Math.ceil((maxVal - minVal) / stepVal) + 1)
                : 1}{' '}
              sweep points
            </div>

            {/* Execute */}
            <button
              onClick={handleExecuteSweep}
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-[#071842] hover:bg-[#0f2460] text-white font-mono text-xs font-bold shadow-xs inline-flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50 transition-colors mt-1"
            >
              <Play className="w-3.5 h-3.5 text-[#20C8A7] fill-current" />
              <span>{loading ? 'Simulating Sweep...' : 'EXECUTE SWEEP'}</span>
            </button>
          </div>

          {/* Formula Card */}
          <div className="bg-white border border-[#CBD5E1] rounded-xl p-4 shadow-xs space-y-2">
            <div className="flex items-center space-x-2 border-b border-[#E2E8F0] pb-2">
              <Calculator className="w-4 h-4 text-[#263EDC]" />
              <span className="text-xs font-mono font-bold text-[#071842] uppercase tracking-wider">
                Model Formula
              </span>
            </div>
            <div className="bg-[#071842] text-white p-3 rounded-lg font-mono text-[11px] space-y-1.5">
              <span className="text-[#20C8A7] font-bold block">{activeDef.graphTitle}</span>
              <code className="text-[#E2E8F0] block leading-relaxed">{activeDef.formula}</code>
              <p className="text-[10px] text-[#94A3B8] pt-1 leading-snug">{activeDef.description}</p>
            </div>
          </div>
        </div>

        {/* ── Results Panel ── */}
        <div className="lg:col-span-2 space-y-4">
          {/* Error state */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start space-x-3">
              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-mono font-bold text-red-700 uppercase">Sweep Error</p>
                <p className="text-xs font-mono text-red-600 mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {/* Empty state */}
          {!hasData && !loading && !error && (
            <div className="bg-white border border-[#CBD5E1] rounded-xl p-16 text-center space-y-3">
              <Activity className="w-12 h-12 text-[#94A3B8] mx-auto opacity-30" />
              <h4 className="font-serif text-lg text-[#071842]">
                Parameter Sweep Console
              </h4>
              <p className="text-xs text-[#64748B] max-w-md mx-auto">
                Select one of the 6 required benchmark presets above, configure parameters, then
                click{' '}
                <span className="font-bold font-mono text-[#071842]">EXECUTE SWEEP</span> to
                generate genuine simulation data.
              </p>
            </div>
          )}

          {/* Loading state */}
          {loading && (
            <div className="bg-white border border-[#CBD5E1] rounded-xl p-16 text-center space-y-3">
              <div className="w-10 h-10 border-4 border-[#071842] border-t-[#20C8A7] rounded-full animate-spin mx-auto" />
              <p className="text-xs font-mono text-[#071842] font-bold uppercase">
                Simulating sweep points...
              </p>
              <p className="text-[11px] text-[#64748B] font-mono">
                Each point runs the full Practical QDS quantum engine
              </p>
            </div>
          )}

          {/* Results */}
          {hasData && !loading && (
            <div className="space-y-4">
              {/* Simulation ID banner */}
              <div className="flex flex-wrap items-center justify-between gap-2 bg-[#F0F4FF] border border-[#CBD8FF] rounded-xl px-4 py-2.5">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-[#263EDC]" />
                  <span className="text-xs font-mono font-bold text-[#071842]">
                    Sweep Complete — {sweepResult?.points.length} genuinely simulated points
                  </span>
                </div>
                <span className="text-[10px] font-mono text-blue-700 bg-white px-2 py-0.5 rounded border border-blue-200">
                  SIM: {sweepResult?.simulation_id || '—'}
                </span>
              </div>

              {/* Chart */}
              <div className="bg-white border border-[#CBD5E1] rounded-xl p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2">
                  <span className="text-xs font-mono font-bold text-[#071842] uppercase tracking-wider">
                    {activeDef.graphTitle}
                  </span>
                  <SimulatedBadge size="sm" />
                </div>

                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={chartData}
                      margin={{ top: 10, right: 20, left: 10, bottom: 15 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                      <XAxis
                        dataKey="x"
                        stroke="#64748B"
                        fontSize={11}
                        fontFamily="monospace"
                        label={{
                          value: sweepResult?.parameter ?? param,
                          position: 'insideBottom',
                          offset: -8,
                          fontSize: 11,
                          fill: '#475569',
                        }}
                      />
                      <YAxis stroke="#64748B" fontSize={11} fontFamily="monospace" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#071842',
                          borderColor: '#334155',
                          borderRadius: '8px',
                          color: '#fff',
                          fontFamily: 'monospace',
                          fontSize: '11px',
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace' }} />

                      {/* Baseline QBER (always shown) */}
                      <Line
                        type="monotone"
                        dataKey="qber_bob"
                        name="QBER Bob (%)"
                        stroke="#20C8A7"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                      />

                      {/* Observed QBER under attack */}
                      {hasObs && (
                        <Line
                          type="monotone"
                          dataKey="qber_obs"
                          name="Observed QBER Eve (%)"
                          stroke="#EF4444"
                          strokeWidth={2.5}
                          dot={{ r: 4 }}
                        />
                      )}

                      {/* Forgery ε₁ */}
                      {hasEps1 && (
                        <Line
                          type="monotone"
                          dataKey="epsilon_1"
                          name="Forgery Bound (ε₁)"
                          stroke="#263EDC"
                          strokeWidth={2}
                          dot={{ r: 3 }}
                        />
                      )}

                      {/* Repudiation ε₂ */}
                      {hasEps2 && (
                        <Line
                          type="monotone"
                          dataKey="epsilon_2"
                          name="Repudiation Bound (ε₂)"
                          stroke="#F59E0B"
                          strokeWidth={2}
                          dot={{ r: 3 }}
                        />
                      )}

                      {/* Signature rate */}
                      {hasSigRate && (
                        <Line
                          type="monotone"
                          dataKey="signature_rate"
                          name="Signature Rate R = Mu/(2N)"
                          stroke="#8B5CF6"
                          strokeWidth={2}
                          dot={{ r: 3 }}
                        />
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Factual observations */}
                {sweepResult?.summary?.factual_observations &&
                  sweepResult.summary.factual_observations.length > 0 && (
                    <div className="p-3 bg-[#F8FAF9] rounded-lg border border-[#E2E8F0] text-xs font-mono text-[#334155] space-y-1">
                      <div className="flex items-center space-x-1.5 mb-1">
                        <Info className="w-3 h-3 text-[#64748B]" />
                        <span className="text-[10px] font-bold text-[#64748B] uppercase">
                          Factual Observations:
                        </span>
                      </div>
                      <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                        {sweepResult.summary.factual_observations.map(
                          (obs: string, i: number) => (
                            <li key={i}>{obs}</li>
                          )
                        )}
                      </ul>
                    </div>
                  )}
              </div>

              {/* Data Table */}
              <div className="bg-white border border-[#CBD5E1] rounded-xl p-5 shadow-xs space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E2E8F0] pb-2">
                  <span className="text-xs font-mono font-bold text-[#071842] uppercase tracking-wider">
                    Empirical Sweep Measurement Table
                  </span>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={exportJSON}
                      className="px-3 py-1 rounded border border-[#CBD5E1] bg-[#F8FAF9] hover:bg-slate-100 text-[11px] font-mono text-[#071842] font-semibold flex items-center space-x-1 cursor-pointer"
                    >
                      <FileCode className="w-3 h-3 text-[#263EDC]" />
                      <span>JSON</span>
                    </button>
                    <button
                      onClick={exportCSV}
                      className="px-3 py-1 rounded border border-[#CBD5E1] bg-[#F8FAF9] hover:bg-slate-100 text-[11px] font-mono text-[#071842] font-semibold flex items-center space-x-1 cursor-pointer"
                    >
                      <FileSpreadsheet className="w-3 h-3 text-emerald-600" />
                      <span>CSV</span>
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto max-h-64">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-[#F8FAF9] text-[#64748B] border-b border-[#CBD5E1] sticky top-0">
                      <tr>
                        <th className="py-2 px-3 font-semibold">
                          {sweepResult?.parameter ?? param}
                        </th>
                        <th className="py-2 px-3 font-semibold">Seed</th>
                        <th className="py-2 px-3 font-semibold">M_u</th>
                        <th className="py-2 px-3 font-semibold">QBER Bob</th>
                        {hasObs && (
                          <th className="py-2 px-3 font-semibold">QBER Obs</th>
                        )}
                        <th className="py-2 px-3 font-semibold">Rate R</th>
                        <th className="py-2 px-3 font-semibold">Security Metric</th>
                        <th className="py-2 px-3 font-semibold">Verdict</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8F0] text-[#334155]">
                      {sweepResult?.points.map((pt, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="py-1.5 px-3 font-bold text-[#071842]">
                            {pt.parameter_value}
                          </td>
                          <td className="py-1.5 px-3 text-[#64748B]">{pt.seed}</td>
                          <td className="py-1.5 px-3">{pt.M_u}</td>
                          <td className="py-1.5 px-3 text-[#20C8A7]">
                            {(pt.qber_bob * 100).toFixed(2)}%
                          </td>
                          {hasObs && (
                            <td className="py-1.5 px-3 text-rose-600 font-bold">
                              {pt.qber_obs !== null && pt.qber_obs !== undefined
                                ? `${(pt.qber_obs * 100).toFixed(2)}%`
                                : '—'}
                            </td>
                          )}
                          <td className="py-1.5 px-3 text-[#8B5CF6]">
                            {pt.signature_rate !== null && pt.signature_rate !== undefined
                              ? pt.signature_rate.toFixed(6)
                              : '—'}
                          </td>
                          <td className="py-1.5 px-3 font-bold text-[#263EDC]">
                            {pt.metric_value !== null && pt.metric_value !== undefined
                              ? pt.metric_value < 0.001
                                ? pt.metric_value.toExponential(3)
                                : pt.metric_value.toFixed(4)
                              : '—'}
                          </td>
                          <td className="py-1.5 px-3 text-[10px]">
                            <span
                              className={`px-1.5 py-0.5 rounded font-semibold ${
                                pt.verdict?.includes('BOUNDED') ||
                                pt.verdict?.includes('DETECTED')
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {pt.verdict || 'OK'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Fixed parameters footnote */}
                {sweepResult?.fixed_parameters &&
                  Object.keys(sweepResult.fixed_parameters).length > 0 && (
                    <div className="text-[10px] font-mono text-[#64748B] pt-1 border-t border-[#E2E8F0]">
                      <span className="font-bold uppercase">Fixed parameters: </span>
                      {Object.entries(sweepResult.fixed_parameters)
                        .map(([k, v]) => `${k}=${v}`)
                        .join('  ·  ')}
                    </div>
                  )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
