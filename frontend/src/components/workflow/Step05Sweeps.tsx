'use client';

import React, { useState } from 'react';
import { CanonicalSimulationState, SweepResponse } from '@/types/unifiedSimulation';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  Activity,
  Play,
  Sliders,
  Table,
  BarChart2,
  AlertCircle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileCode,
  Info,
  Layers,
  Calculator,
  Flame,
} from 'lucide-react';
import { MathBlock, InlineMath } from '@/components/common/MathBlock';

interface Props {
  protocol: string;
  simulationState?: CanonicalSimulationState | null;
  sweepResult: SweepResponse | null;
  onRunSweep: (
    parameter: string,
    values: number[],
    pulseCount: number,
    attack?: string
  ) => Promise<void>;
  loading: boolean;
  onNext: () => void;
  onBack: () => void;
}

interface SweepModeDef {
  id: string;
  name: string;
  graphTitle: string;
  param: string;
  defaultMin: number;
  defaultMax: number;
  defaultStep: number;
  attack?: string;
  pulseCount: number;
  formula: string;
  description: string;
}

const REQUIRED_SWEEPS: SweepModeDef[] = [
  {
    id: 'gamma_intercept',
    name: '1. QBER vs Attack Strength (γ)',
    graphTitle: 'QBER vs Attack Strength (γ) [FR-E3 Intercept-Resend]',
    param: 'intensity',
    defaultMin: 0.0,
    defaultMax: 1.0,
    defaultStep: 0.1,
    attack: 'INTERCEPT_RESEND',
    pulseCount: 2000,
    formula: 'e_{\\text{obs}} = e_0 + 0.5\\,\\gamma\\,(1 - 2e_0), \\quad \\text{abort if } e_{\\text{obs}} > T_A',
    description: 'Evaluates intercept-resend eavesdropping where Eve intercepts fraction γ of pulses, elevating observed QBER toward 50%.',
  },
  {
    id: 'pulse_failure',
    name: '2. Failure Probability vs Pulse Count (N)',
    graphTitle: 'Security Failure Probability vs Pulse Count (N)',
    param: 'pulse_count',
    defaultMin: 1000,
    defaultMax: 10000,
    defaultStep: 1500,
    attack: 'FORGERY',
    pulseCount: 2000,
    formula: '\\varepsilon_1 \\leq \\exp\\left(-\\frac{(S_C - T_V)^2}{2 S_C} \\cdot P_{C^c} \\cdot M_u\\right)',
    description: 'Demonstrates exponential suppression of existential forgery bound ε₁ as transmitted pulse count N and untested register M_u grow.',
  },
  {
    id: 'distance_rate',
    name: '3. Signature Rate vs Distance (km)',
    graphTitle: 'Signature Rate R = M_u / (2·N) vs Distance (km)',
    param: 'distance_km',
    defaultMin: 5,
    defaultMax: 80,
    defaultStep: 15,
    pulseCount: 3000,
    formula: 'R = \\frac{M_u}{2N} \\quad \\text{(conclusive untested bits per total optical pulses)}',
    description: 'Measures effective signature generation rate R = M_u / (2N). Here N represents pulses sent to each recipient (2N total per signature bit).',
  },
  {
    id: 'gap_repudiation',
    name: '4. Repudiation Probability vs Ta/Tv Gap',
    graphTitle: 'Repudiation Bound (ε₂) vs Authentication Threshold (Ta)',
    param: 'authentication_threshold',
    defaultMin: 0.005,
    defaultMax: 0.045,
    defaultStep: 0.008,
    attack: 'REPUDIATION',
    pulseCount: 2000,
    formula: '\\varepsilon_2 \\leq \\exp\\left(-\\frac{2(T_V - T_A - \\Delta)^2 M_u^2 \\beta^2}{n_{\\text{test}}}\\right)',
    description: 'Examines signer repudiation probability ε₂ as the threshold gap (T_v - T_a) narrows when T_a increases toward T_v = 0.065.',
  },
  {
    id: 'tv_forgery',
    name: '5. Forgery Probability vs Verification Threshold (Tv)',
    graphTitle: 'Forgery Bound (ε₁) vs Verification Threshold (Tv)',
    param: 'verification_threshold',
    defaultMin: 0.02,
    defaultMax: 0.12,
    defaultStep: 0.02,
    attack: 'FORGERY',
    pulseCount: 3000,
    formula: '\\varepsilon_1 \\leq \\exp\\left(-\\frac{(S_C - T_V)^2}{2 S_C} \\cdot P_{C^c} \\cdot M_u\\right)',
    description: 'Analyzes unforgeability guarantee ε₁ as verification threshold T_v approaches the minimal conclusive fraction S_c.',
  },
  {
    id: 'distance_qber',
    name: '6. QBER vs Distance (km)',
    graphTitle: 'Channel QBER (%) vs Optical Transmission Distance (km)',
    param: 'distance_km',
    defaultMin: 0,
    defaultMax: 100,
    defaultStep: 20,
    pulseCount: 2000,
    formula: '\\text{QBER} = \\frac{e_{\\text{det}} \\eta + 0.5 p_{\\text{dark}}}{\\eta + p_{\\text{dark}}}, \\quad \\eta = 10^{-\\alpha L / 10}',
    description: 'Evaluates baseline physical channel error rate elevation as fiber attenuation reduces signal intensity relative to detector dark counts.',
  },
];

export default function Step05Sweeps({
  protocol,
  simulationState,
  sweepResult,
  onRunSweep,
  loading,
  onNext,
  onBack,
}: Props) {
  const [selectedModeId, setSelectedModeId] = useState<string>('gamma_intercept');
  const [customParam, setCustomParam] = useState<string>('intensity');
  const [minVal, setMinVal] = useState<number>(0.0);
  const [maxVal, setMaxVal] = useState<number>(1.0);
  const [stepVal, setStepVal] = useState<number>(0.1);
  const [customPulse, setCustomPulse] = useState<number>(2000);
  const [customAttack, setCustomAttack] = useState<string>('INTERCEPT_RESEND');

  const selectedDef = REQUIRED_SWEEPS.find((s) => s.id === selectedModeId) || REQUIRED_SWEEPS[0];

  const handleSelectMode = (def: SweepModeDef) => {
    setSelectedModeId(def.id);
    setCustomParam(def.param);
    setMinVal(def.defaultMin);
    setMaxVal(def.defaultMax);
    setStepVal(def.defaultStep);
    setCustomPulse(def.pulseCount);
    setCustomAttack(def.attack || 'NONE');
  };

  const handleLaunchSweep = () => {
    const points: number[] = [];
    if (stepVal <= 0) return;
    for (let v = minVal; v <= maxVal + 1e-9; v += stepVal) {
      points.push(Number(v.toFixed(6)));
      if (points.length >= 50) break;
    }
    if (points.length === 0) points.push(minVal);

    const atk = customAttack === 'NONE' ? undefined : customAttack;
    onRunSweep(customParam, points, customPulse, atk);
  };

  // Prepare chart data from genuine backend points
  const chartData =
    sweepResult?.points.map((pt) => ({
      x: pt.parameter_value,
      qber_bob: pt.qber_bob !== undefined ? Number((pt.qber_bob * 100).toFixed(3)) : undefined,
      qber_obs:
        pt.qber_obs !== null && pt.qber_obs !== undefined
          ? Number((pt.qber_obs * 100).toFixed(3))
          : undefined,
      epsilon_1: pt.epsilon_1 !== null && pt.epsilon_1 !== undefined ? pt.epsilon_1 : undefined,
      epsilon_2: pt.epsilon_2 !== null && pt.epsilon_2 !== undefined ? pt.epsilon_2 : undefined,
      signature_rate: pt.signature_rate !== null && pt.signature_rate !== undefined ? pt.signature_rate : undefined,
      conclusive_count: pt.conclusive_count_bob,
      M_u: pt.M_u,
    })) || [];

  const hasData = chartData.length > 0;

  const exportJSON = () => {
    if (!sweepResult) return;
    const blob = new Blob([JSON.stringify(sweepResult, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `qds_sweep_${sweepResult.parameter}_${Date.now()}.json`;
    a.click();
  };

  const exportCSV = () => {
    if (!sweepResult) return;
    const headers = ['parameter_value', 'seed', 'simulation_id', 'qber_bob', 'qber_obs', 'M_u', 'n_test', 'epsilon_1', 'epsilon_2', 'signature_rate', 'verdict'];
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
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `qds_sweep_${sweepResult.parameter}_${Date.now()}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* ── Step Header ──────────────────────────────────────────────────────── */}
      <div className="border-b border-[#CBD5E1] pb-3">
        <span className="text-xs font-mono font-bold text-[#64748B] uppercase tracking-wider block">
          STEP 05 OF 06
        </span>
        <h2 className="font-serif text-2xl text-[#071842]">Benchmarks &amp; Parameter Sweep Engine</h2>
        <p className="text-xs text-[#475569] mt-1">
          Execute multi-point parameter sweeps against the genuine quantum simulation engine. Every point reuses the exact physical and attack simulation state.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left Column: Sweep Controls & Presets ───────────────────────────── */}
        <div className="space-y-4">
          {/* Preset Selector */}
          <div className="bg-white border border-[#CBD5E1] rounded-xl p-4 space-y-2.5 shadow-xs">
            <span className="text-xs font-mono font-bold text-[#071842] uppercase tracking-wider block border-b border-[#E2E8F0] pb-1.5">
              Required Benchmark Graphs
            </span>

            <div className="space-y-1.5">
              {REQUIRED_SWEEPS.map((sw) => {
                const isSelected = sw.id === selectedModeId;
                return (
                  <div
                    key={sw.id}
                    onClick={() => handleSelectMode(sw)}
                    className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                      isSelected
                        ? 'border-[#263EDC] bg-[#F0F4FF] ring-2 ring-[#263EDC]/30 shadow-xs'
                        : 'border-[#CBD5E1] bg-white hover:border-[#94A3B8]'
                    }`}
                  >
                    <span className="font-mono font-bold text-[#071842] block text-[11px]">{sw.name}</span>
                    <p className="text-[10px] text-[#64748B] mt-0.5 leading-snug line-clamp-2">{sw.description}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Config Controls */}
          <div className="bg-white border border-[#CBD5E1] rounded-xl p-4 space-y-3 shadow-xs">
            <span className="text-xs font-mono font-bold text-[#071842] uppercase tracking-wider block border-b border-[#E2E8F0] pb-1.5">
              Sweep Parameters
            </span>

            <div className="space-y-2 text-xs font-mono">
              <div>
                <label className="text-[10px] text-[#64748B] block uppercase">Swept Parameter</label>
                <select
                  value={customParam}
                  onChange={(e) => setCustomParam(e.target.value)}
                  className="w-full mt-1 p-2 bg-[#F8FAF9] border border-[#CBD5E1] rounded-lg font-mono text-xs text-[#071842]"
                >
                  <option value="intensity">intensity (γ) [0 to 1]</option>
                  <option value="pulse_count">pulse_count (N) [64 to 50000]</option>
                  <option value="distance_km">distance_km [0 to 150]</option>
                  <option value="authentication_threshold">authentication_threshold (Ta)</option>
                  <option value="verification_threshold">verification_threshold (Tv)</option>
                  <option value="beta">beta (β test fraction) [0 to 1]</option>
                  <option value="baseline_qber">baseline_qber (e0)</option>
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] text-[#64748B] block uppercase">Min</label>
                  <input
                    type="number"
                    step="any"
                    value={minVal}
                    onChange={(e) => setMinVal(Number(e.target.value))}
                    className="w-full mt-1 p-1.5 bg-[#F8FAF9] border border-[#CBD5E1] rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-[#64748B] block uppercase">Max</label>
                  <input
                    type="number"
                    step="any"
                    value={maxVal}
                    onChange={(e) => setMaxVal(Number(e.target.value))}
                    className="w-full mt-1 p-1.5 bg-[#F8FAF9] border border-[#CBD5E1] rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-[#64748B] block uppercase">Step</label>
                  <input
                    type="number"
                    step="any"
                    value={stepVal}
                    onChange={(e) => setStepVal(Number(e.target.value))}
                    className="w-full mt-1 p-1.5 bg-[#F8FAF9] border border-[#CBD5E1] rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-[#64748B] block uppercase">Pulse Count (N)</label>
                  <input
                    type="number"
                    step="500"
                    value={customPulse}
                    onChange={(e) => setCustomPulse(Number(e.target.value))}
                    className="w-full mt-1 p-1.5 bg-[#F8FAF9] border border-[#CBD5E1] rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-[#64748B] block uppercase">Attack Vector</label>
                  <select
                    value={customAttack}
                    onChange={(e) => setCustomAttack(e.target.value)}
                    className="w-full mt-1 p-1.5 bg-[#F8FAF9] border border-[#CBD5E1] rounded-lg text-xs"
                  >
                    <option value="NONE">None (Channel Only)</option>
                    <option value="INTERCEPT_RESEND">Intercept-Resend</option>
                    <option value="FORGERY">Existential Forgery</option>
                    <option value="REPUDIATION">Signer Repudiation</option>
                  </select>
                </div>
              </div>
            </div>

            <button
              onClick={handleLaunchSweep}
              disabled={loading}
              className="w-full btn-dark py-2.5 rounded-lg text-xs font-mono font-bold shadow-xs inline-flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50 mt-2"
            >
              <Play className="w-3.5 h-3.5 text-[#20C8A7]" />
              <span>{loading ? 'Simulating Multi-Point Sweep...' : 'EXECUTE SWEEP'}</span>
            </button>
          </div>
        </div>

        {/* ── Right 2-cols: Chart, Formulas & Table ───────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">
          {sweepResult && hasData ? (
            <div className="space-y-4">
              {/* Formula & Explanation Card */}
              <div className="bg-white border border-[#CBD5E1] rounded-xl p-4 shadow-xs space-y-2">
                <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2">
                  <div className="flex items-center space-x-2">
                    <Calculator className="w-4 h-4 text-[#263EDC]" />
                    <span className="text-xs font-mono font-bold text-[#071842] uppercase tracking-wider">
                      {selectedDef.graphTitle}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    SIMULATION ID: {sweepResult.simulation_id || 'sim-sweep'}
                  </span>
                </div>

                <div className="bg-[#071842] text-white p-3.5 rounded-lg font-mono text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[#20C8A7] font-bold block text-[11px]">Formula Model:</span>
                    <span className="text-[10px] text-slate-400 font-mono">KaTeX Rendered</span>
                  </div>
                  <div className="bg-slate-900/80 p-3 rounded border border-slate-800 text-center dark-math">
                    <MathBlock formula={selectedDef.formula} ariaLabel={selectedDef.name} />
                  </div>
                  <p className="text-[10px] text-[#94A3B8] pt-1">{selectedDef.description}</p>
                </div>
              </div>

              {/* Interactive Line Chart */}
              <div className="bg-white border border-[#CBD5E1] rounded-xl p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2">
                  <span className="text-xs font-mono font-bold text-[#071842] uppercase tracking-wider">
                    Interactive Scaling Curve
                  </span>
                  <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    {sweepResult.points.length} Genuinely Simulated Points
                  </span>
                </div>

                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                      <XAxis
                        dataKey="x"
                        stroke="#64748B"
                        fontSize={11}
                        fontFamily="monospace"
                        label={{
                          value: `${sweepResult.parameter}`,
                          position: 'insideBottom',
                          offset: -5,
                          fontSize: 11,
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

                      {/* Always show Baseline QBER if relevant */}
                      <Line
                        type="monotone"
                        dataKey="qber_bob"
                        name="QBER Bob (%)"
                        stroke="#20C8A7"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                      />

                      {/* Observed QBER under attack */}
                      {chartData.some((d) => d.qber_obs !== undefined) && (
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
                      {chartData.some((d) => d.epsilon_1 !== undefined) && (
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
                      {chartData.some((d) => d.epsilon_2 !== undefined) && (
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
                      {chartData.some((d) => d.signature_rate !== undefined) && (
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

                {/* Factual Summary Observations */}
                {sweepResult.summary?.factual_observations && sweepResult.summary.factual_observations.length > 0 && (
                  <div className="p-3 bg-[#F8FAF9] rounded-lg border border-[#E2E8F0] text-xs font-mono text-[#334155] space-y-1">
                    <span className="text-[10px] font-bold text-[#64748B] uppercase block">Factual Observations:</span>
                    <ul className="list-disc list-inside space-y-0.5">
                      {sweepResult.summary.factual_observations.map((obs: string, i: number) => (
                        <li key={i}>{obs}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Data Table with Export Buttons */}
              <div className="bg-white border border-[#CBD5E1] rounded-xl p-5 shadow-xs space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E2E8F0] pb-2">
                  <span className="text-xs font-mono font-bold text-[#071842] uppercase tracking-wider block">
                    Empirical Sweep Measurement Table
                  </span>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={exportJSON}
                      className="px-3 py-1 rounded border border-[#CBD5E1] bg-[#F8FAF9] hover:bg-slate-100 text-[11px] font-mono text-[#071842] font-semibold flex items-center space-x-1 cursor-pointer"
                    >
                      <FileCode className="w-3 h-3 text-[#263EDC]" />
                      <span>Export JSON</span>
                    </button>
                    <button
                      onClick={exportCSV}
                      className="px-3 py-1 rounded border border-[#CBD5E1] bg-[#F8FAF9] hover:bg-slate-100 text-[11px] font-mono text-[#071842] font-semibold flex items-center space-x-1 cursor-pointer"
                    >
                      <FileSpreadsheet className="w-3 h-3 text-emerald-600" />
                      <span>Export CSV</span>
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto max-h-56">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-[#F8FAF9] text-[#64748B] border-b border-[#CBD5E1]">
                      <tr>
                        <th className="py-2 px-3 font-semibold">{sweepResult.parameter}</th>
                        <th className="py-2 px-3 font-semibold">Seed</th>
                        <th className="py-2 px-3 font-semibold">M_u (Untested)</th>
                        <th className="py-2 px-3 font-semibold">QBER Bob</th>
                        {chartData.some((d) => d.qber_obs !== undefined) && (
                          <th className="py-2 px-3 font-semibold">QBER Obs</th>
                        )}
                        <th className="py-2 px-3 font-semibold">Rate R</th>
                        <th className="py-2 px-3 font-semibold">Security Metric</th>
                        <th className="py-2 px-3 font-semibold">Verdict</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8F0] text-[#334155]">
                      {sweepResult.points.map((pt, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="py-1.5 px-3 font-bold text-[#071842]">{pt.parameter_value}</td>
                          <td className="py-1.5 px-3 text-[#64748B]">{pt.seed}</td>
                          <td className="py-1.5 px-3">{pt.M_u}</td>
                          <td className="py-1.5 px-3 text-[#20C8A7]">{(pt.qber_bob * 100).toFixed(2)}%</td>
                          {chartData.some((d) => d.qber_obs !== undefined) && (
                            <td className="py-1.5 px-3 text-rose-600 font-bold">
                              {pt.qber_obs !== null && pt.qber_obs !== undefined ? `${(pt.qber_obs * 100).toFixed(2)}%` : '—'}
                            </td>
                          )}
                          <td className="py-1.5 px-3 text-[#8B5CF6]">{pt.signature_rate?.toFixed(6) ?? '—'}</td>
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
                                pt.verdict?.includes('BOUNDED') || pt.verdict?.includes('DETECTED')
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
              </div>
            </div>
          ) : (
            <div className="bg-white border border-[#CBD5E1] rounded-xl p-12 text-center space-y-3">
              <Activity className="w-12 h-12 text-[#94A3B8] mx-auto opacity-40" />
              <h4 className="font-serif text-lg text-[#071842]">Benchmarks &amp; Parameter Sweeps Console</h4>
              <p className="text-xs text-[#64748B] max-w-md mx-auto">
                Select one of the 6 required benchmark graphs on the left or customize parameter ranges, then click &ldquo;EXECUTE SWEEP&rdquo; to simulate real physical scaling.
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
          ← Back to Step 04
        </button>
        <button
          onClick={onNext}
          className="btn-dark px-6 py-2.5 rounded-lg text-xs font-mono font-semibold shadow-xs cursor-pointer"
        >
          Proceed to Step 06: Statistical Bounds →
        </button>
      </div>
    </div>
  );
}

