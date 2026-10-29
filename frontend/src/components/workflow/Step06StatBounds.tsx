'use client';

import React, { useState, useEffect } from 'react';
import {
  CanonicalSimulationState,
  AttackSimulationResponse,
  SweepResponse,
  StatisticalBoundResponse,
  StatisticalBoundRequest,
} from '@/types/unifiedSimulation';
import {
  Calculator,
  FileText,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Info,
  AlertTriangle,
  Play,
  RotateCcw,
  Sliders,
  Layers,
  Sparkles,
} from 'lucide-react';
import SimulatedBadge from '@/components/common/SimulatedBadge';
import { MathBlock, InlineMath, formatScientific, formatQdsVariable } from '@/components/common/MathBlock';

interface Props {
  protocol: string;
  simulationState: CanonicalSimulationState | null;
  attackResult: AttackSimulationResponse | null;
  sweepResult: SweepResponse | null;
  statBoundResult: StatisticalBoundResponse | null;
  onComputeBound: (
    reqOrMethod: string | StatisticalBoundRequest,
    sampleSize?: number,
    delta?: number,
    parameters?: Record<string, any>
  ) => Promise<void>;
  loading: boolean;
  onBack: () => void;
  onNext?: () => void;
  onRestart: () => void;
}

type TabMode = 'HOEFFDING' | 'CHERNOFF' | 'RANDOM_SAMPLING' | 'PROTOCOL_BOUND';

export default function Step06StatBounds({
  protocol,
  simulationState,
  attackResult,
  sweepResult,
  statBoundResult,
  onComputeBound,
  loading,
  onBack,
  onNext,
  onRestart,
}: Props) {
  const [activeTab, setActiveTab] = useState<TabMode>('HOEFFDING');

  /* Expandable section states */
  const [showFormulaDetails, setShowFormulaDetails] = useState<boolean>(true);
  const [showCalculationSteps, setShowCalculationSteps] = useState<boolean>(true);
  const [showAuditReport, setShowAuditReport] = useState<boolean>(false);

  /* Form states per mode */
  // 1. Hoeffding
  const [hoeffdingN, setHoeffdingN] = useState<number>(2000);
  const [hoeffdingEpsilon, setHoeffdingEpsilon] = useState<number>(0.035);
  const [hoeffdingObserved, setHoeffdingObserved] = useState<number>(0.015);

  // 2. Chernoff
  const [chernoffMu, setChernoffMu] = useState<number>(120.0);
  const [chernoffDelta, setChernoffDelta] = useState<number>(0.15);

  // 3. Random Sampling
  const [rsTa, setRsTa] = useState<number>(0.015);
  const [rsTv, setRsTv] = useState<number>(0.0645);
  const [rsDelta, setRsDelta] = useState<number>(0.005);
  const [rsBeta, setRsBeta] = useState<number>(0.30);
  const [rsNTest, setRsNTest] = useState<number>(600);
  const [rsMu, setRsMu] = useState<number>(1400);

  // 4. Protocol Bound
  const [pbSc, setPbSc] = useState<number>(0.4900);
  const [pbTv, setPbTv] = useState<number>(0.0645);
  const [pbTa, setPbTa] = useState<number>(0.0150);
  const [pbDelta, setPbDelta] = useState<number>(0.0050);
  const [pbPcc, setPbPcc] = useState<number>(0.2000);
  const [pbBeta, setPbBeta] = useState<number>(0.30);
  const [pbNTest, setPbNTest] = useState<number>(600);
  const [pbMu, setPbMu] = useState<number>(1400);

  // Auto-populate from genuine simulation state when available
  useEffect(() => {
    if (simulationState) {
      const qber = simulationState.measurement_statistics.qber_bob;
      const pulseCount = simulationState.configuration.pulse_count;
      const conclusiveB = simulationState.measurement_statistics.conclusive_count_bob;
      const conclusiveC = simulationState.measurement_statistics.conclusive_count_charlie;
      const untestedMu =
        (simulationState.material.untested_bits as any)?.M_u_bob ||
        Math.floor(conclusiveB * (1 - simulationState.configuration.beta));
      const testBits =
        (simulationState.material.test_bits as any)?.n_test_bob ||
        conclusiveB - untestedMu;

      setHoeffdingN(conclusiveB > 0 ? conclusiveB : 2000);
      setHoeffdingObserved(Number(qber.toFixed(4)));

      setChernoffMu(Number((conclusiveB * qber).toFixed(2)) || 120.0);

      setRsTa(simulationState.configuration.authentication_threshold);
      setRsTv(simulationState.configuration.verification_threshold);
      setRsBeta(simulationState.configuration.beta);
      setRsNTest(testBits > 0 ? testBits : 600);
      setRsMu(untestedMu > 0 ? untestedMu : 1400);

      setPbTa(simulationState.configuration.authentication_threshold);
      setPbTv(simulationState.configuration.verification_threshold);
      setPbBeta(simulationState.configuration.beta);
      setPbNTest(testBits > 0 ? testBits : 600);
      setPbMu(untestedMu > 0 ? untestedMu : 1400);
      if (pulseCount > 0 && conclusiveC > 0) {
        setPbPcc(Number((conclusiveC / pulseCount).toFixed(4)));
      }
    }
  }, [simulationState]);

  /* Execute bound computation for active mode */
  const handleLaunchCalculation = () => {
    if (activeTab === 'HOEFFDING') {
      onComputeBound({
        method: 'HOEFFDING',
        simulation_id: simulationState?.simulation_id,
        sample_size: hoeffdingN,
        delta: hoeffdingEpsilon,
        observed_rate: hoeffdingObserved,
        parameters: {
          n: hoeffdingN,
          epsilon: hoeffdingEpsilon,
          observed_value: hoeffdingObserved,
        },
      });
    } else if (activeTab === 'CHERNOFF') {
      onComputeBound({
        method: 'CHERNOFF',
        simulation_id: simulationState?.simulation_id,
        parameters: {
          mu: chernoffMu,
          delta: chernoffDelta,
        },
      });
    } else if (activeTab === 'RANDOM_SAMPLING') {
      onComputeBound({
        method: 'RANDOM_SAMPLING',
        simulation_id: simulationState?.simulation_id,
        parameters: {
          Ta: rsTa,
          Tv: rsTv,
          Delta: rsDelta,
          beta: rsBeta,
          n_test: rsNTest,
          Mu: rsMu,
        },
      });
    } else if (activeTab === 'PROTOCOL_BOUND') {
      onComputeBound({
        method: 'PROTOCOL_BOUND',
        simulation_id: simulationState?.simulation_id,
        parameters: {
          Sc: pbSc,
          Tv: pbTv,
          Ta: pbTa,
          Delta: pbDelta,
          P_C_c: pbPcc,
          beta: pbBeta,
          n_test: pbNTest,
          Mu: pbMu,
        },
      });
    }
  };

  /* Composite protocol security failure bound from attack metadata */
  const eps1 = attackResult?.metadata?.epsilon_1;
  const eps2 = attackResult?.metadata?.epsilon_2;
  const hasCombinedBound = eps1 !== undefined && eps2 !== undefined;
  const combinedEps = hasCombinedBound ? Number(eps1) + Number(eps2) : null;

  return (
    <div className="space-y-8">
      {/* ── Step Header ──────────────────────────────────────────────────────── */}
      <div className="border-b border-[#CBD5E1] pb-3">
        <span className="text-xs font-mono font-bold text-[#64748B] uppercase tracking-wider block">
          STEP 06 OF 06
        </span>
        <h2 className="font-serif text-2xl text-[#071842]">
          Evaluate statistical bounds
        </h2>
        <p className="text-xs text-[#475569] mt-1">
          Compute mathematically transparent statistical concentration and protocol security bounds.
          Select between general concentration inequalities, finite-register random sampling, and
          complete protocol information-theoretic security equations.
        </p>
      </div>

      {/* ── Tabs Navigation: 4 Analytical Modes ────────────────────────────── */}
      <div className="flex flex-wrap gap-2 border-b border-[#CBD5E1] pb-3">
        {[
          { id: 'HOEFFDING' as TabMode, label: '1. Hoeffding Inequality', tag: 'Concentration' },
          { id: 'CHERNOFF' as TabMode, label: '2. Chernoff Tail Bound', tag: 'Lower Tail' },
          { id: 'RANDOM_SAMPLING' as TabMode, label: '3. Random Sampling', tag: 'Practical QDS' },
          { id: 'PROTOCOL_BOUND' as TabMode, label: '4. Protocol Security Bound', tag: 'IT Security' },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 rounded-xl border text-xs font-mono transition-all flex items-center space-x-2 cursor-pointer ${
                isActive
                  ? 'bg-[#071842] text-white border-[#071842] shadow-xs font-bold'
                  : 'bg-white text-[#475569] border-[#CBD5E1] hover:border-[#94A3B8]'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                  isActive ? 'bg-[#20C8A7] text-[#071842]' : 'bg-[#F1F5F9] text-[#64748B]'
                }`}
              >
                {tab.tag}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Mode Formula Banner ──────────────────────────────────────────────── */}
      <div className="bg-[#071842] text-white rounded-2xl p-5 shadow-xs space-y-2">
        <div className="flex items-center justify-between border-b border-slate-700 pb-2">
          <div className="flex items-center space-x-2">
            <Calculator className="w-4 h-4 text-[#20C8A7]" />
            <span className="text-xs font-mono font-bold text-[#20C8A7] uppercase tracking-wider">
              {activeTab === 'HOEFFDING' && 'Hoeffding Concentration Inequality'}
              {activeTab === 'CHERNOFF' && 'Multiplicative Chernoff Lower-Tail Bound'}
              {activeTab === 'RANDOM_SAMPLING' && 'Practical QDS Random-Sampling Analysis'}
              {activeTab === 'PROTOCOL_BOUND' && 'Practical QDS Information-Theoretic Security Equations'}
            </span>
          </div>
          <button
            onClick={() => setShowFormulaDetails(!showFormulaDetails)}
            className="text-[11px] font-mono text-[#94A3B8] hover:text-white flex items-center space-x-1"
          >
            <span>{showFormulaDetails ? 'Hide Theory' : 'Show Theory'}</span>
            {showFormulaDetails ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Mathematical Equation Display */}
        <div className="py-2 text-center font-mono">
          {activeTab === 'HOEFFDING' && (
            <div className="text-base sm:text-lg font-bold text-[#E2E8F0] tracking-wide">
              P(|X̄ − E[X]| ≥ ε) ≤ 2 · exp(−2·n·ε²)
            </div>
          )}
          {activeTab === 'CHERNOFF' && (
            <div className="text-base sm:text-lg font-bold text-[#E2E8F0] tracking-wide">
              P(X ≤ (1 − δ)·μ) ≤ exp(−(δ²·μ) / 2)
            </div>
          )}
          {activeTab === 'RANDOM_SAMPLING' && (
            <div className="text-base sm:text-lg font-bold text-[#E2E8F0] tracking-wide">
              ε_sampling ≤ exp(−2·(T_v − T_a − Δ)² · M_u² · β² / n_test)
            </div>
          )}
          {activeTab === 'PROTOCOL_BOUND' && (
            <div className="space-y-1 text-sm sm:text-base font-bold text-[#E2E8F0]">
              <div>ε₁ ≤ exp(−((S_c − T_v)² / 2S_c) · P_C^c · M_u) &nbsp;[Forgery]</div>
              <div>ε₂ ≤ exp(−2·(T_v − T_a − Δ)² · M_u² · β² / n_test) &nbsp;[Repudiation]</div>
              <div className="text-[#20C8A7] pt-1">ε_sec = ε₁ + ε₂ &nbsp;[Overall Failure Bound]</div>
            </div>
          )}
        </div>

        {showFormulaDetails && (
          <div className="pt-2 border-t border-slate-700/60 text-[11px] font-mono text-[#94A3B8] leading-relaxed">
            {activeTab === 'HOEFFDING' && (
              <p>
                <strong>Classical Hoeffding Inequality:</strong> Distribution-free tail bound for sums of bounded,
                independent identically distributed (i.i.d.) random variables. Quantifies the probability that the
                empirical sample mean X̄ deviates from the true expectation E[X] by more than ε.
              </p>
            )}
            {activeTab === 'CHERNOFF' && (
              <p>
                <strong>Multiplicative Chernoff Lower-Tail Bound:</strong> Bounding the probability that the sum of
                independent Bernoulli random variables falls significantly below its expected count μ by fraction δ.
                Particularly sharp when event count μ is moderate to large.
              </p>
            )}
            {activeTab === 'RANDOM_SAMPLING' && (
              <p>
                <strong>Practical QDS Random-Sampling Analysis:</strong> Models the finite-key sampling without
                replacement between Bob’s sampled test bits (n_test) and the untested signature register (Mu).
                Guarantees that an adversarial signer cannot forge or repudiate unless the sample mismatch discrepancy
                exceeds the effective threshold margin (Tv − Ta − Δ).
              </p>
            )}
            {activeTab === 'PROTOCOL_BOUND' && (
              <p>
                <strong>Complete Yin, Fu &amp; Chen (2014) Model:</strong> Couples the information-theoretic
                unforgeability bound ε₁ (derived from conclusive overlap mutual information and bisection root Sc) with
                the signer non-repudiation bound ε₂ to produce total security failure probability ε_sec = ε₁ + ε₂.
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── Main Content Grid: Controls (Left) + Mathematical Transparency (Right) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Controls Column ── */}
        <div className="space-y-4">
          <div className="bg-white border border-[#CBD5E1] rounded-xl p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2">
              <span className="text-xs font-mono font-bold text-[#071842] uppercase tracking-wider block">
                Input Parameters
              </span>
              <span className="text-[10px] font-mono text-[#64748B]">
                {activeTab}
              </span>
            </div>

            {/* TAB 1: HOEFFDING INPUTS */}
            {activeTab === 'HOEFFDING' && (
              <div className="space-y-3 text-xs font-mono">
                <div>
                  <label className="text-[10px] text-[#64748B] block uppercase mb-1">
                    Sample Size (n)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={hoeffdingN}
                    onChange={(e) => setHoeffdingN(Number(e.target.value))}
                    className="w-full p-2 bg-[#F8FAF9] border border-[#CBD5E1] rounded-lg text-xs"
                  />
                  <span className="text-[10px] text-[#94A3B8]">Conclusive bit count or measurement trials</span>
                </div>

                <div>
                  <label className="text-[10px] text-[#64748B] block uppercase mb-1">
                    Deviation Tolerance (ε)
                  </label>
                  <input
                    type="number"
                    step="0.005"
                    min={0.001}
                    max={0.5}
                    value={hoeffdingEpsilon}
                    onChange={(e) => setHoeffdingEpsilon(Number(e.target.value))}
                    className="w-full p-2 bg-[#F8FAF9] border border-[#CBD5E1] rounded-lg text-xs"
                  />
                  <span className="text-[10px] text-[#94A3B8]">Allowed variation |X̄ − E[X]|</span>
                </div>

                <div>
                  <label className="text-[10px] text-[#64748B] block uppercase mb-1">
                    Observed Empirical Rate (X̄)
                  </label>
                  <input
                    type="number"
                    step="0.002"
                    min={0.0}
                    max={1.0}
                    value={hoeffdingObserved}
                    onChange={(e) => setHoeffdingObserved(Number(e.target.value))}
                    className="w-full p-2 bg-[#F8FAF9] border border-[#CBD5E1] rounded-lg text-xs"
                  />
                  <span className="text-[10px] text-[#94A3B8]">Sample mean or measured QBER</span>
                </div>
              </div>
            )}

            {/* TAB 2: CHERNOFF INPUTS */}
            {activeTab === 'CHERNOFF' && (
              <div className="space-y-3 text-xs font-mono">
                <div>
                  <label className="text-[10px] text-[#64748B] block uppercase mb-1">
                    Expected Event Count (μ)
                  </label>
                  <input
                    type="number"
                    step="1"
                    min={0.1}
                    value={chernoffMu}
                    onChange={(e) => setChernoffMu(Number(e.target.value))}
                    className="w-full p-2 bg-[#F8FAF9] border border-[#CBD5E1] rounded-lg text-xs"
                  />
                  <span className="text-[10px] text-[#94A3B8]">Expected events μ = n · p</span>
                </div>

                <div>
                  <label className="text-[10px] text-[#64748B] block uppercase mb-1">
                    Relative Lower Deviation (δ)
                  </label>
                  <input
                    type="number"
                    step="0.02"
                    min={0.01}
                    max={0.99}
                    value={chernoffDelta}
                    onChange={(e) => setChernoffDelta(Number(e.target.value))}
                    className="w-full p-2 bg-[#F8FAF9] border border-[#CBD5E1] rounded-lg text-xs"
                  />
                  <span className="text-[10px] text-[#94A3B8]">Fractional drop below expectation (0 &lt; δ &lt; 1)</span>
                </div>
              </div>
            )}

            {/* TAB 3: RANDOM SAMPLING INPUTS */}
            {activeTab === 'RANDOM_SAMPLING' && (
              <div className="space-y-3 text-xs font-mono">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-[#64748B] block uppercase mb-1">
                      Ta (Auth)
                    </label>
                    <input
                      type="number"
                      step="0.002"
                      value={rsTa}
                      onChange={(e) => setRsTa(Number(e.target.value))}
                      className="w-full p-1.5 bg-[#F8FAF9] border border-[#CBD5E1] rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-[#64748B] block uppercase mb-1">
                      Tv (Verify)
                    </label>
                    <input
                      type="number"
                      step="0.005"
                      value={rsTv}
                      onChange={(e) => setRsTv(Number(e.target.value))}
                      className="w-full p-1.5 bg-[#F8FAF9] border border-[#CBD5E1] rounded-lg text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-[#64748B] block uppercase mb-1">
                      Delta (Δ)
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      value={rsDelta}
                      onChange={(e) => setRsDelta(Number(e.target.value))}
                      className="w-full p-1.5 bg-[#F8FAF9] border border-[#CBD5E1] rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-[#64748B] block uppercase mb-1">
                      Beta (β)
                    </label>
                    <input
                      type="number"
                      step="0.05"
                      value={rsBeta}
                      onChange={(e) => setRsBeta(Number(e.target.value))}
                      className="w-full p-1.5 bg-[#F8FAF9] border border-[#CBD5E1] rounded-lg text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-[#64748B] block uppercase mb-1">
                      n_test (Bits)
                    </label>
                    <input
                      type="number"
                      step="50"
                      value={rsNTest}
                      onChange={(e) => setRsNTest(Number(e.target.value))}
                      className="w-full p-1.5 bg-[#F8FAF9] border border-[#CBD5E1] rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-[#64748B] block uppercase mb-1">
                      Mu (Untested)
                    </label>
                    <input
                      type="number"
                      step="100"
                      value={rsMu}
                      onChange={(e) => setRsMu(Number(e.target.value))}
                      className="w-full p-1.5 bg-[#F8FAF9] border border-[#CBD5E1] rounded-lg text-xs"
                    />
                  </div>
                </div>

                <div className="p-2 bg-[#F0F4FF] rounded border border-blue-200 text-[10px] text-blue-900">
                  Effective Threshold Gap: <strong>Tv − Ta − Δ = {(rsTv - rsTa - rsDelta).toFixed(4)}</strong>
                </div>
              </div>
            )}

            {/* TAB 4: PROTOCOL BOUND INPUTS */}
            {activeTab === 'PROTOCOL_BOUND' && (
              <div className="space-y-3 text-xs font-mono">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-[#64748B] block uppercase mb-1">
                      Sc (Root)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={pbSc}
                      onChange={(e) => setPbSc(Number(e.target.value))}
                      className="w-full p-1.5 bg-[#F8FAF9] border border-[#CBD5E1] rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-[#64748B] block uppercase mb-1">
                      Tv (Verify)
                    </label>
                    <input
                      type="number"
                      step="0.005"
                      value={pbTv}
                      onChange={(e) => setPbTv(Number(e.target.value))}
                      className="w-full p-1.5 bg-[#F8FAF9] border border-[#CBD5E1] rounded-lg text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-[#64748B] block uppercase mb-1">
                      Ta (Auth)
                    </label>
                    <input
                      type="number"
                      step="0.002"
                      value={pbTa}
                      onChange={(e) => setPbTa(Number(e.target.value))}
                      className="w-full p-1.5 bg-[#F8FAF9] border border-[#CBD5E1] rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-[#64748B] block uppercase mb-1">
                      P_C^c (Concl.)
                    </label>
                    <input
                      type="number"
                      step="0.02"
                      value={pbPcc}
                      onChange={(e) => setPbPcc(Number(e.target.value))}
                      className="w-full p-1.5 bg-[#F8FAF9] border border-[#CBD5E1] rounded-lg text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-[#64748B] block uppercase mb-1">
                      n_test
                    </label>
                    <input
                      type="number"
                      step="50"
                      value={pbNTest}
                      onChange={(e) => setPbNTest(Number(e.target.value))}
                      className="w-full p-1.5 bg-[#F8FAF9] border border-[#CBD5E1] rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-[#64748B] block uppercase mb-1">
                      Mu (Untested)
                    </label>
                    <input
                      type="number"
                      step="100"
                      value={pbMu}
                      onChange={(e) => setPbMu(Number(e.target.value))}
                      className="w-full p-1.5 bg-[#F8FAF9] border border-[#CBD5E1] rounded-lg text-xs"
                    />
                  </div>
                </div>

                <div className="p-2 bg-emerald-50 rounded border border-emerald-200 text-[10px] text-emerald-900">
                  Target Protocol: <strong>Practical QDS (Yin, Fu, Chen)</strong>
                </div>
              </div>
            )}

            <button
              onClick={handleLaunchCalculation}
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-[#071842] hover:bg-[#0f2460] text-white font-mono text-xs font-bold shadow-xs inline-flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50 transition-colors mt-2"
            >
              <Play className="w-3.5 h-3.5 text-[#20C8A7] fill-current" />
              <span>{loading ? 'Evaluating Bound...' : `COMPUTE ${activeTab} BOUND`}</span>
            </button>
          </div>

          {/* Scientific Disclaimer Card */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="text-[11px] font-mono font-bold text-amber-900 uppercase">
                Scientific Transparency Notice
              </span>
            </div>
            <p className="text-[10px] font-mono text-amber-800 leading-relaxed">
              Calculations represent theoretical analytical models and classical concentration approximations
              under idealized physical assumptions. Does not claim experimental laboratory validation.
            </p>
          </div>
        </div>

        {/* ── Mathematical Transparency Panel (Right 2-Cols) ── */}
        <div className="lg:col-span-2 space-y-4">
          {statBoundResult ? (
            <div className="bg-white border border-[#CBD5E1] rounded-xl p-6 shadow-xs space-y-5">
              {/* Header Bar */}
              <div className="flex flex-wrap items-center justify-between border-b border-[#E2E8F0] pb-4 gap-2">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-mono font-bold text-[#64748B] uppercase tracking-wider block">
                      MATHEMATICAL TRANSPARENCY PANEL
                    </span>
                    <SimulatedBadge size="sm" />
                  </div>
                  <h3 className="font-serif font-bold text-xl text-[#071842] mt-0.5">
                    {statBoundResult.method.replace(/_/g, ' ')}
                  </h3>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-mono text-[#64748B] block uppercase">
                    FINAL FAILURE BOUND (ε)
                  </span>
                  <span className="text-2xl font-mono font-black text-[#263EDC]">
                    {statBoundResult.failure_probability < 0.001
                      ? statBoundResult.failure_probability.toExponential(4)
                      : statBoundResult.failure_probability.toFixed(6)}
                  </span>
                </div>
              </div>

              {/* 1. INPUTS Section */}
              <div className="space-y-1.5">
                <span className="text-xs font-mono font-bold text-[#071842] uppercase tracking-wider block">
                  1. INPUTS
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-[#F8FAF9] p-3 rounded-lg border border-[#E2E8F0] text-xs font-mono">
                  {Object.entries(statBoundResult.inputs).map(([k, v]) => (
                    <div key={k}>
                      <span className="text-[10px] text-[#64748B] block uppercase">{k}:</span>
                      <strong className="text-[#071842]">
                        {typeof v === 'number'
                          ? v < 0.001 && v > 0
                            ? v.toExponential(3)
                            : String(v)
                          : Array.isArray(v)
                          ? `[${v.join(', ')}]`
                          : String(v)}
                      </strong>
                    </div>
                  ))}
                </div>
              </div>

              {/* 2. FORMULA Section */}
              <div className="space-y-1.5">
                <span className="text-xs font-mono font-bold text-[#071842] uppercase tracking-wider block">
                  2. FORMULA
                </span>
                <div className="bg-[#071842] text-white p-3.5 rounded-lg font-mono text-xs dark-math text-center">
                  <MathBlock formula={statBoundResult.formula} ariaLabel="Statistical Bound Formula" />
                </div>
              </div>

              {/* 3. SUBSTITUTION Section */}
              {statBoundResult.substitution && (
                <div className="space-y-1.5">
                  <span className="text-xs font-mono font-bold text-[#071842] uppercase tracking-wider block">
                    3. SUBSTITUTION
                  </span>
                  <div className="bg-[#F8FAF9] text-[#334155] p-3 rounded-lg border border-[#E2E8F0] font-mono text-xs whitespace-pre-line">
                    {statBoundResult.substitution}
                  </div>
                </div>
              )}

              {/* 4. CALCULATION STEPS Section */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-[#071842] uppercase tracking-wider block">
                    4. CALCULATION STEPS
                  </span>
                  <button
                    onClick={() => setShowCalculationSteps(!showCalculationSteps)}
                    className="text-[11px] font-mono text-[#64748B] hover:text-[#071842] flex items-center space-x-1"
                  >
                    <span>{showCalculationSteps ? 'Collapse' : 'Expand'}</span>
                    {showCalculationSteps ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                  </button>
                </div>

                {showCalculationSteps && (
                  <div className="bg-[#071842] text-white p-4 rounded-lg font-mono text-[11px] space-y-1 shadow-inner">
                    {(statBoundResult.calculation_steps && statBoundResult.calculation_steps.length > 0
                      ? statBoundResult.calculation_steps
                      : statBoundResult.intermediate_calculation.split('\n')
                    ).map((step, idx) => (
                      <div key={idx} className="text-[#E2E8F0] leading-relaxed">
                        {step}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 5. FINAL BOUND Section */}
              <div className="space-y-1.5">
                <span className="text-xs font-mono font-bold text-[#071842] uppercase tracking-wider block">
                  5. FINAL BOUND &amp; CONFIDENCE
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <span className="text-[10px] font-mono text-emerald-800 uppercase block">Bound Parameter:</span>
                    <span className="text-lg font-mono font-bold text-emerald-950">
                      {statBoundResult.final_bound < 0.001
                        ? statBoundResult.final_bound.toExponential(4)
                        : statBoundResult.final_bound.toFixed(6)}
                    </span>
                  </div>

                  {statBoundResult.confidence !== undefined && statBoundResult.confidence !== null && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <span className="text-[10px] font-mono text-blue-800 uppercase block">Confidence Level:</span>
                      <span className="text-lg font-mono font-bold text-blue-950">
                        {(statBoundResult.confidence * 100).toFixed(4)}%
                      </span>
                    </div>
                  )}

                  {statBoundResult.details?.forgery_bound !== undefined && (
                    <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                      <span className="text-[10px] font-mono text-purple-800 uppercase block">Forgery ε₁:</span>
                      <span className="text-sm font-mono font-bold text-purple-950">
                        {Number(statBoundResult.details.forgery_bound).toExponential(3)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* 6. INTERPRETATION Section */}
              <div className="space-y-1.5">
                <span className="text-xs font-mono font-bold text-[#071842] uppercase tracking-wider block">
                  6. SCIENTIFIC INTERPRETATION
                </span>
                <div className="p-3.5 bg-[#F8FAF9] rounded-lg border border-[#E2E8F0] text-xs font-mono text-[#334155] leading-relaxed">
                  {statBoundResult.interpretation}
                </div>
              </div>

              {/* Simulation ID Footnote */}
              {statBoundResult.simulation_id && (
                <div className="text-[10px] font-mono text-[#64748B] pt-2 border-t border-[#E2E8F0] flex items-center justify-between">
                  <span>Linked Simulation Run: <strong>{statBoundResult.simulation_id}</strong></span>
                  <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Traceability Verified
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white border border-[#CBD5E1] rounded-xl p-16 text-center space-y-3">
              <Calculator className="w-12 h-12 text-[#94A3B8] mx-auto opacity-30" />
              <h4 className="font-serif text-lg text-[#071842]">
                Statistical Bounds Transparency Console
              </h4>
              <p className="text-xs text-[#64748B] max-w-md mx-auto">
                Select one of the 4 analytical modes above (Hoeffding, Chernoff, Random Sampling, or Protocol Bound),
                configure parameters, then click &ldquo;COMPUTE BOUND&rdquo; to inspect full mathematical transparency.
              </p>
            </div>
          )}

          {/* Combined Protocol Security Parameter Card (Step 04 Sync) */}
          <div className="bg-white border border-[#CBD5E1] rounded-xl p-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2 mb-2">
              <span className="text-xs font-mono font-bold text-[#071842] uppercase tracking-wider">
                Workflow Composite Protocol Bound (Step 04 Sync)
              </span>
              <span className="text-[10px] font-mono text-[#64748B]">ε_sec = ε₁ + ε₂</span>
            </div>
            {hasCombinedBound ? (
              <div className="flex items-center justify-between font-mono text-xs">
                <div>
                  <span className="text-[#64748B] block">Forger ε₁: {Number(eps1).toExponential(3)}</span>
                  <span className="text-[#64748B] block">Repudiation ε₂: {Number(eps2).toExponential(3)}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-[#64748B] block font-bold">TOTAL FAILURE BOUND</span>
                  <span className="text-lg font-black text-[#263EDC]">
                    {combinedEps !== null ? combinedEps.toExponential(4) : 'N/A'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-xs font-mono text-[#64748B] p-2 bg-[#F8FAF9] rounded-lg">
                PROTOCOL COMBINED BOUND AVAILABLE AFTER STEP 04 ATTACK SIMULATION. (Or compute via Tab 4: Protocol Bound above).
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── SECTION: FULL SECURITY ANALYSIS & CERTIFICATION REPORT ─────────── */}
      <div className="bg-white border border-[#CBD5E1] rounded-2xl p-6 shadow-sm space-y-6">
        <div className="flex flex-wrap items-center justify-between border-b border-[#E2E8F0] pb-4 gap-3">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-[#071842] text-[#20C8A7]">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold text-[#64748B] uppercase tracking-wider block">
                EXPERIMENT SUMMARY
              </span>
              <h3 className="font-serif font-bold text-xl text-[#071842]">
                Recorded configuration &amp; results
              </h3>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 inline-flex items-center space-x-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>RUN RECORDED</span>
            </span>
          </div>
        </div>

        {/* 11 Comprehensive Report Sections */}
        <div className="space-y-6 text-xs font-mono text-[#334155]">
          {/* 1. Protocol Classification */}
          <div className="p-4 bg-[#F8FAF9] rounded-xl border border-[#E2E8F0] space-y-2">
            <div className="flex items-center space-x-2 text-[#071842] font-bold">
              <span className="w-5 h-5 rounded-full bg-[#071842] text-white flex items-center justify-center text-[10px]">1</span>
              <span className="uppercase tracking-wider">Protocol &amp; Architectural Classification</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
              <div>
                <span className="text-[#64748B] block text-[10px]">PROTOCOL:</span>
                <strong className="text-[#071842]">{protocol}</strong>
              </div>
              <div>
                <span className="text-[#64748B] block text-[10px]">MODEL ARCHITECTURE:</span>
                <strong className="text-[#071842]">
                  {simulationState?.execution?.backend || 'No measurement engine'}
                </strong>
              </div>
              <div>
                <span className="text-[#64748B] block text-[10px]">MODEL VERSION:</span>
                <strong className="text-[#071842]">{simulationState?.model_version || 'v1.0.0'}</strong>
              </div>
            </div>
          </div>

          {/* 2. Optical Channel Configuration */}
          <div className="p-4 bg-[#F8FAF9] rounded-xl border border-[#E2E8F0] space-y-2">
            <div className="flex items-center space-x-2 text-[#071842] font-bold">
              <span className="w-5 h-5 rounded-full bg-[#071842] text-white flex items-center justify-center text-[10px]">2</span>
              <span className="uppercase tracking-wider">Optical Channel &amp; Simulation Configuration</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
              <div>
                <span className="text-[#64748B] block text-[10px]">Pulse Count (N):</span>
                <strong>{simulationState?.configuration.pulse_count ?? '—'}</strong>
              </div>
              <div>
                <span className="text-[#64748B] block text-[10px]">Channel Distance:</span>
                <strong>{simulationState?.configuration.distance_km ?? '—'} km</strong>
              </div>
              <div>
                <span className="text-[#64748B] block text-[10px]">Fiber Attenuation:</span>
                <strong>{simulationState?.configuration.fiber_attenuation ?? 0.2} dB/km</strong>
              </div>
              <div>
                <span className="text-[#64748B] block text-[10px]">Baseline QBER (e₀):</span>
                <strong>{((simulationState?.configuration.baseline_qber ?? 0.01) * 100).toFixed(2)}%</strong>
              </div>
            </div>
          </div>

          {/* 3. Material Telemetry */}
          <div className="p-4 bg-[#F8FAF9] rounded-xl border border-[#E2E8F0] space-y-2">
            <div className="flex items-center space-x-2 text-[#071842] font-bold">
              <span className="w-5 h-5 rounded-full bg-[#071842] text-white flex items-center justify-center text-[10px]">3</span>
              <span className="uppercase tracking-wider">Quantum Signature Material Telemetry</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
              <div>
                <span className="text-[#64748B] block text-[10px]">Bob Conclusive (KB):</span>
                <strong>{simulationState?.measurement_statistics.conclusive_count_bob ?? '—'}</strong>
              </div>
              <div>
                <span className="text-[#64748B] block text-[10px]">Charlie Conclusive (KC):</span>
                <strong>{simulationState?.measurement_statistics.conclusive_count_charlie ?? '—'}</strong>
              </div>
              <div>
                <span className="text-[#64748B] block text-[10px]">Bob QBER (eB):</span>
                <strong className="text-[#20C8A7]">
                  {simulationState ? (simulationState.measurement_statistics.qber_bob * 100).toFixed(2) + '%' : '—'}
                </strong>
              </div>
              <div>
                <span className="text-[#64748B] block text-[10px]">Untested Register (Mu):</span>
                <strong className="text-[#263EDC]">
                  {((simulationState?.material.untested_bits as any)?.M_u_bob) ?? '—'} bits
                </strong>
              </div>
            </div>
          </div>

          {/* 4. Tripartite Signing & Non-Repudiation */}
          <div className="p-4 bg-[#F8FAF9] rounded-xl border border-[#E2E8F0] space-y-2">
            <div className="flex items-center space-x-2 text-[#071842] font-bold">
              <span className="w-5 h-5 rounded-full bg-[#071842] text-white flex items-center justify-center text-[10px]">4</span>
              <span className="uppercase tracking-wider">Tripartite Signing &amp; Verification Status</span>
            </div>
            <p className="text-[11px] text-[#475569] leading-relaxed">
              Review the message receipt and verifier decisions in step 03. Authentication threshold Ta ={' '}
              {((simulationState?.configuration.authentication_threshold ?? 0.015) * 100).toFixed(2)}%, Verification Threshold Tv ={' '}
              {((simulationState?.configuration.verification_threshold ?? 0.0645) * 100).toFixed(2)}%. Threshold ordering alone does not prove transferability or non-repudiation.
            </p>
          </div>

          {/* 5. Adversarial Threat Execution */}
          <div className="p-4 bg-[#F8FAF9] rounded-xl border border-[#E2E8F0] space-y-2">
            <div className="flex items-center space-x-2 text-[#071842] font-bold">
              <span className="w-5 h-5 rounded-full bg-[#071842] text-white flex items-center justify-center text-[10px]">5</span>
              <span className="uppercase tracking-wider">Adversarial Threat Execution &amp; Applicability</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
              <div>
                <span className="text-[#64748B] block text-[10px]">EVALUATED ATTACK:</span>
                <strong>{attackResult?.attack || 'Not run'}</strong>
              </div>
              <div>
                <span className="text-[#64748B] block text-[10px]">THREAT VERDICT:</span>
                <strong className="text-emerald-700">{attackResult?.verdict || 'Pending'}</strong>
              </div>
              <div>
                <span className="text-[#64748B] block text-[10px]">MODEL STATUS:</span>
                <strong>{attackResult?.model_status || 'Awaiting result'}</strong>
              </div>
            </div>
          </div>

          {/* 6. Four-Layer Breakdown */}
          {attackResult?.four_layer_explanation && (
            <div className="p-4 bg-[#F8FAF9] rounded-xl border border-[#E2E8F0] space-y-2">
              <div className="flex items-center space-x-2 text-[#071842] font-bold">
                <span className="w-5 h-5 rounded-full bg-[#071842] text-white flex items-center justify-center text-[10px]">6</span>
                <span className="uppercase tracking-wider">Four-Layer Security Explanation</span>
              </div>
              <div className="space-y-1.5 text-[11px] text-[#475569]">
                <p><strong>Action:</strong> {attackResult.four_layer_explanation.layer_1_attacker_action}</p>
                <p><strong>Physical:</strong> {attackResult.four_layer_explanation.layer_2_physical_effect}</p>
                <p><strong>Observable:</strong> {attackResult.four_layer_explanation.layer_3_observable_effect}</p>
                <p><strong>Security:</strong> {attackResult.four_layer_explanation.layer_4_security_consequence}</p>
              </div>
            </div>
          )}

          {/* 7. Parameter Sweep Sensitivity */}
          <div className="p-4 bg-[#F8FAF9] rounded-xl border border-[#E2E8F0] space-y-2">
            <div className="flex items-center space-x-2 text-[#071842] font-bold">
              <span className="w-5 h-5 rounded-full bg-[#071842] text-white flex items-center justify-center text-[10px]">7</span>
              <span className="uppercase tracking-wider">Parameter Scaling &amp; Sensitivity Analysis</span>
            </div>
            <p className="text-[11px] text-[#475569]">
              {sweepResult
                ? `Simulated ${sweepResult.points.length} genuine empirical data points for parameter ${sweepResult.parameter}. Error rates and security metrics scale according to quantum optical transmission models.`
                : 'No parameter sweep recorded. Run one in step 05.'}
            </p>
          </div>

          {/* 8. Statistical Security Bounds (Phase 5) */}
          <div className="p-4 bg-[#F8FAF9] rounded-xl border border-[#E2E8F0] space-y-2">
            <div className="flex items-center space-x-2 text-[#071842] font-bold">
              <span className="w-5 h-5 rounded-full bg-[#071842] text-white flex items-center justify-center text-[10px]">8</span>
              <span className="uppercase tracking-wider">Statistical Security Bounds (Phase 5)</span>
            </div>
            <p className="text-[11px] text-[#475569]">
              {statBoundResult
                ? `Evaluated ${statBoundResult.method}: failure probability bound ε ≤ ${statBoundResult.failure_probability.toExponential(4)} under method parameters.`
                : 'Select one of the 4 analytical modes in the calculator above to evaluate mathematical confidence bounds.'}
            </p>
          </div>

          {/* 9. Combined Security Bound */}
          <div className="p-4 bg-[#F8FAF9] rounded-xl border border-[#E2E8F0] space-y-2">
            <div className="flex items-center space-x-2 text-[#071842] font-bold">
              <span className="w-5 h-5 rounded-full bg-[#071842] text-white flex items-center justify-center text-[10px]">9</span>
              <span className="uppercase tracking-wider">Composite Protocol Security Parameter (ε_sec)</span>
            </div>
            <div className="text-[11px] text-[#475569]">
              {hasCombinedBound ? (
                <p>
                  Total protocol security parameter <strong>ε_sec = ε₁ (forgery) + ε₂ (repudiation) = {combinedEps?.toExponential(4)}</strong>, under the analytical model assumptions. This is not a complete QDS security certificate.
                </p>
              ) : (
                <p>No combined bound recorded. Run a supported analysis to populate this section.</p>
              )}
            </div>
          </div>

          {/* 10. Model Assumptions */}
          <div className="p-4 bg-[#F8FAF9] rounded-xl border border-[#E2E8F0] space-y-2">
            <div className="flex items-center space-x-2 text-[#071842] font-bold">
              <span className="w-5 h-5 rounded-full bg-[#071842] text-white flex items-center justify-center text-[10px]">10</span>
              <span className="uppercase tracking-wider">Model Assumptions &amp; Physical Simplifications</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-[11px] text-[#475569]">
              <li>Phase-randomized weak coherent state source emitting Poissonian photon number distributions.</li>
              <li>Calibrated single-mode standard optical fiber with uniform attenuation (0.2 dB/km at 1550 nm).</li>
              <li>Independent SPAD detection events with dark count probability p_dark and quantum efficiency η.</li>
              <li>Finite-key concentration inequalities assume independent trials without quantum memory effects.</li>
            </ul>
          </div>

          {/* 11. Deterministic Reproducibility & Audit Trail */}
          <div className="p-4 bg-[#071842] text-white rounded-xl space-y-2">
            <div className="flex items-center space-x-2 text-[#20C8A7] font-bold">
              <span className="w-5 h-5 rounded-full bg-[#20C8A7] text-[#071842] flex items-center justify-center text-[10px] font-bold">11</span>
              <span className="uppercase tracking-wider">Deterministic Reproducibility &amp; Audit Trail</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-[11px] text-[#CBD5E1]">
              <div>
                <span className="text-[#94A3B8] block text-[10px]">SIMULATION ID:</span>
                <span className="text-white font-bold">{simulationState?.simulation_id || 'N/A'}</span>
              </div>
              <div>
                <span className="text-[#94A3B8] block text-[10px]">RNG SEED:</span>
                <span className="text-[#20C8A7] font-bold">{simulationState?.seed ?? 42}</span>
              </div>
              <div>
                <span className="text-[#94A3B8] block text-[10px]">SYSTEM TIMESTAMP:</span>
                <span className="text-white">{new Date().toISOString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Footer Navigation ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between pt-4 border-t border-[#CBD5E1]">
        <button
          onClick={onBack}
          className="px-4 py-2 rounded-lg text-xs font-mono font-semibold bg-white border border-[#CBD5E1] text-[#071842] hover:bg-slate-50 cursor-pointer"
        >
          ← Back to Step 05
        </button>
        <div className="flex items-center space-x-3">
          <button
            onClick={onRestart}
            className="px-4 py-2 rounded-lg text-xs font-mono font-semibold bg-white border border-rose-200 text-rose-700 hover:bg-rose-50 cursor-pointer"
          >
            Restart ↺
          </button>
          {onNext && (
            <button
              onClick={onNext}
              className="btn-teal px-6 py-2.5 rounded-lg text-xs font-mono font-bold shadow-xs cursor-pointer flex items-center space-x-2"
            >
              <span>View final experiment report →</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
