'use client';

import React, { useState } from 'react';
import {
  CanonicalSimulationState,
  AttackSimulationResponse,
} from '@/types/unifiedSimulation';
import {
  Zap,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Play,
  RotateCcw,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Binary,
  Layers,
  FileCode2,
  Activity,
  Calculator,
  Flame,
  Scale,
  Crosshair,
  Info,
} from 'lucide-react';
import { MathBlock, InlineMath, formatScientific } from '@/components/common/MathBlock';
import DerivationTraceView from './attack/DerivationTraceView';
import InterpretationView from './attack/InterpretationView';
import ComputedOutputView from './attack/ComputedOutputView';

interface Props {
  protocol: string;
  simulationState: CanonicalSimulationState | null;
  attackResult: AttackSimulationResponse | null;
  onExecuteAttack: (attack: string, intensity: number) => Promise<void>;
  loading: boolean;
  onNext: () => void;
  onBack: () => void;
}

interface AttackDef {
  id: string;
  name: string;
  code: string;
  description: string;
}

const ATTACK_DEFINITIONS: AttackDef[] = [
  {
    id: 'FORGERY',
    code: 'FR-E1',
    name: 'Existential Forgery',
    description: 'Adversary (Charlie) constructs a counterfeit signature using her partial key share without Alice authorization.',
  },
  {
    id: 'REPUDIATION',
    code: 'FR-E2',
    name: 'Signer Repudiation',
    description: 'Dishonest Alice generates asymmetric signature shares so Bob accepts but Charlie subsequently rejects.',
  },
  {
    id: 'INTERCEPT_RESEND',
    code: 'FR-E3',
    name: 'Intercept-Resend / Eavesdropping',
    description: 'Eve taps quantum fiber channels, measuring pulses in random bases and resending guesses to Bob & Charlie.',
  },
  {
    id: 'DETECTOR_COMPROMISE',
    code: 'FR-E4',
    name: 'Detector Blinding / Side-Channel',
    description: 'Bright continuous-wave laser blinding targeting single-photon avalanche detectors (SPADs).',
  },
  {
    id: 'PNS_ATTACK',
    code: 'FR-B3',
    name: 'Photon Number Splitting (PNS)',
    description: 'Eve exploits multi-photon emissions in weak coherent pulse trains by siphoning off excess photons.',
  },
];

// Protocol-aware applicability helper
function getApplicability(protocol: string, attackId: string): { status: 'QUANTITATIVE' | 'QUALITATIVE' | 'UNIMPLEMENTED'; label: string } {
  if (protocol === 'practical_qds') {
    if (['FORGERY', 'REPUDIATION', 'INTERCEPT_RESEND'].includes(attackId)) {
      return { status: 'QUANTITATIVE', label: 'QUANTITATIVE MODEL' };
    }
    return { status: 'UNIMPLEMENTED', label: 'UNIMPLEMENTED (NOT AVAILABLE)' };
  }

  if (protocol === 'mdi_qds') {
    if (['FORGERY', 'REPUDIATION', 'DETECTOR_COMPROMISE'].includes(attackId)) {
      return { status: 'QUALITATIVE', label: 'QUALITATIVE ANALYSIS' };
    }
    return { status: 'UNIMPLEMENTED', label: 'UNIMPLEMENTED' };
  }

  if (protocol === 'otuh_qds') {
    if (['FORGERY', 'REPUDIATION', 'INTERCEPT_RESEND'].includes(attackId)) {
      return { status: 'QUALITATIVE', label: 'QUALITATIVE ANALYSIS' };
    }
    return { status: 'UNIMPLEMENTED', label: 'UNIMPLEMENTED' };
  }

  if (protocol === 'tf_qds') {
    if (attackId === 'FORGERY') {
      return { status: 'QUALITATIVE', label: 'QUALITATIVE ANALYSIS' };
    }
    return { status: 'UNIMPLEMENTED', label: 'UNIMPLEMENTED' };
  }

  if (protocol === 'decoy_qds') {
    if (attackId === 'PNS_ATTACK') {
      return { status: 'QUALITATIVE', label: 'QUALITATIVE IMMUNITY' };
    }
    return { status: 'UNIMPLEMENTED', label: 'UNIMPLEMENTED' };
  }

  return { status: 'UNIMPLEMENTED', label: 'UNIMPLEMENTED' };
}

function renderMetaKey(key: string) {
  const map: Record<string, string> = {
    epsilon_1: '\\varepsilon_1',
    epsilon_2: '\\varepsilon_2',
    I_BC: 'I(B:C)',
    S_c: 'S_C',
    T_v: 'T_V',
    T_a: 'T_A',
    P_C_c: 'P_{C^c}',
    M_u: 'M_u',
    n_test: 'n_{\\text{test}}',
    beta: '\\beta',
    gamma: '\\gamma',
    delta: '\\Delta',
    gap: '\\text{gap}',
    qber_obs: 'e_{\\text{obs}}',
    qber_base: 'e_0',
  };
  if (map[key]) {
    return <InlineMath math={map[key]} />;
  }
  return key;
}

export default function Step04Attack({
  protocol,
  simulationState,
  attackResult,
  onExecuteAttack,
  loading,
  onNext,
  onBack,
}: Props) {
  const [selectedAttack, setSelectedAttack] = useState<string>('FORGERY');
  const [intensity, setIntensity] = useState<number>(1.0);

  const handleLaunch = () => {
    onExecuteAttack(selectedAttack, intensity);
  };

  const appInfo = getApplicability(protocol, selectedAttack);
  const selectedDef = ATTACK_DEFINITIONS.find((a) => a.id === selectedAttack);

  return (
    <div className="space-y-6">
      {/* ── Step Header ──────────────────────────────────────────────────────── */}
      <div className="border-b border-[#CBD5E1] pb-3">
        <span className="text-xs font-mono font-bold text-[#64748B] uppercase tracking-wider block">
          STEP 04 OF 06
        </span>
        <h2 className="font-serif text-2xl text-[#071842]">Investigate an attack</h2>
        <p className="text-xs text-[#475569] mt-1">
          Execute protocol-isolated adversarial simulations. Quantitative models provide complete mathematical derivations, while unimplemented attacks return explicit notices without false claims.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left Column: Threat Vector Selector ────────────────────────────── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-[#071842] uppercase tracking-wider block">
              Threat Vectors
            </span>
            <span className="text-[10px] font-mono text-[#64748B]">Protocol: {protocol}</span>
          </div>

          <div className="space-y-2">
            {ATTACK_DEFINITIONS.map((atk) => {
              const isSelected = atk.id === selectedAttack;
              const { status } = getApplicability(protocol, atk.id);

              return (
                <div
                  key={atk.id}
                  onClick={() => setSelectedAttack(atk.id)}
                  className={`p-3.5 rounded-xl border text-xs cursor-pointer transition-all ${
                    isSelected
                      ? 'border-[#263EDC] bg-[#F0F4FF] ring-2 ring-[#263EDC]/30 shadow-xs'
                      : 'border-[#CBD5E1] bg-white hover:border-[#94A3B8]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1 gap-1">
                    <span className="font-mono font-bold text-[#071842]">
                      [{atk.code}] {atk.name}
                    </span>
                    <span
                      className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-semibold whitespace-nowrap ${
                        status === 'QUANTITATIVE'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : status === 'QUALITATIVE'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {status}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#64748B] leading-relaxed">{atk.description}</p>
                </div>
              );
            })}
          </div>

          {selectedAttack === 'INTERCEPT_RESEND' && (
            <div className="p-3 bg-white border border-[#CBD5E1] rounded-xl space-y-2">
              <div className="flex justify-between items-center text-[11px] font-mono text-[#475569]">
                <span>Attack Intensity (<InlineMath math="\gamma" />):</span>
                <strong className="text-[#071842]">{(intensity * 100).toFixed(0)}%</strong>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={intensity}
                onChange={(e) => setIntensity(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
              />
              <p className="text-[10px] text-[#64748B] font-mono">
                Fraction of quantum pulses intercepted and measured in random bases.
              </p>
            </div>
          )}

          <button
            onClick={handleLaunch}
            disabled={loading || !simulationState}
            className="w-full btn-dark py-2.5 rounded-lg text-xs font-mono font-semibold shadow-xs disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center space-x-2 cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5 text-[#20C8A7]" />
            <span>{loading ? 'Simulating Threat Model...' : 'Execute Threat Simulation'}</span>
          </button>
        </div>

        {/* ── Right 2-cols: 5-Panel Attack Outcome & Mathematics ─────────────── */}
        <div className="lg:col-span-2 space-y-4">
          {attackResult ? (
            attackResult.model_status === 'UNIMPLEMENTED' || attackResult.verdict === 'SIMULATION_MODEL_NOT_AVAILABLE' ? (
              /* Unimplemented / Unavailable Model Screen */
              <div className="bg-white border border-amber-300 rounded-xl p-6 space-y-4 shadow-xs">
                <div className="flex items-center space-x-3 text-amber-700">
                  <AlertTriangle className="w-6 h-6 flex-shrink-0" />
                  <div>
                    <h3 className="font-mono font-bold text-sm">SIMULATION MODEL NOT AVAILABLE</h3>
                    <p className="text-xs text-amber-800">
                      Protocol: <span className="font-bold">{attackResult.protocol}</span> | Attack: <span className="font-bold">{attackResult.attack}</span>
                    </p>
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3.5 text-xs text-amber-900 space-y-2 font-mono">
                  <div className="grid grid-cols-2 gap-2 text-[11px] pb-2 border-b border-amber-200/60">
                    <div>
                      <span className="font-bold text-amber-950 block">PROTOCOL:</span>
                      <span>{attackResult.protocol}</span>
                    </div>
                    <div>
                      <span className="font-bold text-amber-950 block">ATTACK:</span>
                      <span>{attackResult.attack}</span>
                    </div>
                    <div>
                      <span className="font-bold text-amber-950 block">IMPLEMENTATION STATUS:</span>
                      <span className="text-rose-700 font-bold">NOT IMPLEMENTED</span>
                    </div>
                    <div>
                      <span className="font-bold text-amber-950 block">AVAILABLE ANALYSIS MODE:</span>
                      <span>QUALITATIVE / LITERATURE ONLY</span>
                    </div>
                  </div>
                  <div>
                    <span className="font-bold block text-amber-950 uppercase">REASON:</span>
                    <p className="mt-0.5">{attackResult.reason || 'Quantitative physical simulation model for this attack on the selected protocol is not implemented.'}</p>
                  </div>
                  <div className="pt-2 border-t border-amber-200/60 text-[11px] text-amber-800">
                    <span className="font-bold">Protocol Isolation Policy:</span> The engine strictly prevents cross-protocol fallback (e.g., displaying MDI-QDS detector immunity on Practical QDS). Unsupported combinations return explicit non-availability.
                  </div>
                </div>

                {attackResult.references && attackResult.references.length > 0 && (
                  <div className="text-[11px] font-mono text-[#64748B] pt-2 border-t border-[#E2E8F0]">
                    <span className="font-bold text-[#071842]">Literature References:</span>
                    <ul className="list-disc list-inside mt-1 space-y-0.5">
                      {attackResult.references.map((ref, idx) => (
                        <li key={idx}>{ref}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              /* 5 Explicit Visual Sections for Available Models */
              <div className="space-y-4">
                {/* ── 1. ATTACK SCENARIO ────────────────────────────────────── */}
                <div className="bg-white border border-[#CBD5E1] rounded-xl p-4 space-y-2.5 shadow-xs">
                  <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2">
                    <div className="flex items-center space-x-2">
                      <Crosshair className="w-4 h-4 text-[#263EDC]" />
                      <span className="text-xs font-mono font-bold text-[#071842] uppercase tracking-wider">
                        1. Attack Scenario &amp; Threat Model
                      </span>
                    </div>
                    <span className="text-[10px] font-mono bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded font-bold">
                      {attackResult.model_status} MODEL
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    <div className="bg-[#F8FAF9] p-2.5 rounded-lg border border-[#E2E8F0] space-y-1">
                      <span className="text-[10px] font-mono text-[#64748B] uppercase block">Target Protocol</span>
                      <strong className="text-[#071842] font-mono">{attackResult.protocol}</strong>
                    </div>
                    <div className="bg-[#F8FAF9] p-2.5 rounded-lg border border-[#E2E8F0] space-y-1">
                      <span className="text-[10px] font-mono text-[#64748B] uppercase block">Attack Vector</span>
                      <strong className="text-[#071842] font-mono">[{selectedDef?.code}] {attackResult.attack}</strong>
                    </div>
                    <div className="bg-[#F8FAF9] p-2.5 rounded-lg border border-[#E2E8F0] space-y-1">
                      <span className="text-[10px] font-mono text-[#64748B] uppercase block">Model Implementation</span>
                      <strong className="text-[#071842] font-mono">{attackResult.model_version || 'practical_qds_attack_v1'}</strong>
                    </div>
                  </div>

                  {attackResult.four_layer_explanation?.layer_1_attacker_action && (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
                      <span className="text-[10px] font-mono font-bold text-[#475569] uppercase block">
                        Attacker Action (Layer 1)
                      </span>
                      <p className="text-[#334155] leading-relaxed">
                        {attackResult.four_layer_explanation.layer_1_attacker_action}
                      </p>
                    </div>
                  )}
                </div>

                {/* ── 2. PHYSICAL EFFECT ────────────────────────────────────── */}
                <div className="bg-white border border-[#CBD5E1] rounded-xl p-4 space-y-2.5 shadow-xs">
                  <div className="flex items-center space-x-2 border-b border-[#E2E8F0] pb-2">
                    <Flame className="w-4 h-4 text-amber-600" />
                    <span className="text-xs font-mono font-bold text-[#071842] uppercase tracking-wider">
                      2. Physical Effect on Quantum Channel &amp; States
                    </span>
                  </div>
                  <div className="p-3 bg-amber-50/50 border border-amber-200/70 rounded-lg text-xs space-y-1">
                    <p className="text-[#334155] leading-relaxed">
                      {attackResult.four_layer_explanation?.layer_2_physical_effect ||
                        'Optical state disturbance induced on the transmission channel.'}
                    </p>
                  </div>
                </div>

                {/* ── 3. MEASURED EFFECT ────────────────────────────────────── */}
                <div className="bg-white border border-[#CBD5E1] rounded-xl p-4 space-y-2.5 shadow-xs">
                  <div className="flex items-center space-x-2 border-b border-[#E2E8F0] pb-2">
                    <Activity className="w-4 h-4 text-[#20C8A7]" />
                    <span className="text-xs font-mono font-bold text-[#071842] uppercase tracking-wider">
                      3. Measured Statistical &amp; Detection Telemetry
                    </span>
                  </div>

                  {attackResult.four_layer_explanation?.layer_3_observable_effect && (
                    <p className="text-xs text-[#334155] leading-relaxed bg-[#F8FAF9] p-3 rounded-lg border border-[#E2E8F0]">
                      {attackResult.four_layer_explanation.layer_3_observable_effect}
                    </p>
                  )}

                  {attackResult.metadata && Object.keys(attackResult.metadata).length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-xs">
                      {Object.entries(attackResult.metadata).map(([key, val]) => (
                        <div key={key} className="bg-[#F8FAF9] p-2.5 rounded-lg border border-[#E2E8F0]">
                          <span className="text-[10px] text-[#64748B] block truncate uppercase" title={key}>
                            {renderMetaKey(key)}
                          </span>
                          <span className="text-sm font-bold text-[#071842]">
                            {typeof val === 'number' ? (
                              val < 0.0001 && val > 0 ? (
                                <InlineMath math={formatScientific(val, 3)} />
                              ) : (
                                val.toFixed(4)
                              )
                            ) : (
                              String(val)
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* ── 4. MATHEMATICAL ANALYSIS ──────────────────────────────── */}
                {attackResult.mathematical_model && (
                  <div className="bg-white border border-[#CBD5E1] rounded-xl p-4 space-y-2.5 shadow-xs">
                    <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2">
                      <div className="flex items-center space-x-2">
                        <Calculator className="w-4 h-4 text-[#263EDC]" />
                        <span className="text-xs font-mono font-bold text-[#071842] uppercase tracking-wider">
                          4. Mathematical Transparency Model
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-[#20C8A7] bg-[#071842] px-2 py-0.5 rounded font-bold">
                        FORMAL QUANTITATIVE PROOF
                      </span>
                    </div>

                    <div className="bg-[#071842] text-white p-4 rounded-xl font-mono text-xs space-y-4">
                      {/* Formula Display Area */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-[#94A3B8] uppercase tracking-wider block">
                            Security Bound Equation:
                          </span>
                          <span className="text-[10px] font-mono text-[#20C8A7] bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700/60">
                            {selectedDef?.code || 'QDS'} FORMULATION
                          </span>
                        </div>
                        <div className="bg-slate-900/90 p-4 rounded-lg border border-slate-800 text-center dark-math">
                          <MathBlock
                            formula={attackResult.mathematical_model.formula}
                            ariaLabel={`${selectedDef?.name || 'Security Bound'} Formula`}
                          />
                        </div>
                      </div>

                      {/* Step-by-Step Derivation Trace */}
                      {attackResult.mathematical_model.intermediate_calculation && (
                        <DerivationTraceView
                          intermediateCalculation={attackResult.mathematical_model.intermediate_calculation}
                          attackId={selectedAttack}
                        />
                      )}

                      {/* Computed Output */}
                      <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                        <span className="text-slate-300 font-mono">Computed Output:</span>
                        <ComputedOutputView
                          finalResult={attackResult.mathematical_model.final_result}
                          attackId={selectedAttack}
                        />
                      </div>

                      {/* Clean Warning & Interpretation Banner */}
                      {attackResult.mathematical_model.interpretation && (
                        <InterpretationView
                          interpretation={attackResult.mathematical_model.interpretation}
                        />
                      )}
                    </div>
                  </div>
                )}

                {/* ── 5. SECURITY DECISION ──────────────────────────────────── */}
                <div className="bg-white border border-[#CBD5E1] rounded-xl p-4 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2">
                    <div className="flex items-center space-x-2">
                      <Scale className="w-4 h-4 text-emerald-600" />
                      <span className="text-xs font-mono font-bold text-[#071842] uppercase tracking-wider">
                        5. Security Decision &amp; Protocol Consequence
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {attackResult.protocol_resisted ? (
                        <span className="flex items-center space-x-1 text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded">
                          <ShieldCheck className="w-3 h-3" />
                          <span>PROTOCOL RESISTED</span>
                        </span>
                      ) : (
                        <span className="flex items-center space-x-1 text-[10px] font-mono font-bold bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded">
                          <ShieldAlert className="w-3 h-3" />
                          <span>UNBOUNDED / VULNERABLE</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between bg-[#F8FAF9] p-3 rounded-lg border border-[#E2E8F0]">
                    <div>
                      <span className="text-[10px] font-mono text-[#64748B] uppercase block">
                        Final Security Verdict:
                      </span>
                      <span
                        className={`text-lg font-mono font-black ${
                          attackResult.protocol_resisted || attackResult.attack_detected
                            ? 'text-emerald-600'
                            : 'text-rose-600'
                        }`}
                      >
                        {attackResult.verdict}
                      </span>
                    </div>

                    <div className="text-right text-[11px] font-mono text-[#64748B]">
                      <span>Attack Detected: <strong className="text-[#071842]">{attackResult.attack_detected ? 'YES' : 'NO'}</strong></span>
                    </div>
                  </div>

                  {attackResult.four_layer_explanation?.layer_4_security_consequence && (
                    <div className="p-3 bg-emerald-50/40 border border-emerald-200 rounded-lg text-xs space-y-1">
                      <span className="text-[10px] font-mono font-bold text-emerald-900 uppercase block">
                        Layer 4: Security Consequence
                      </span>
                      <p className="text-[#1E293B] leading-relaxed">
                        {attackResult.four_layer_explanation.layer_4_security_consequence}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )
          ) : (
            <div className="bg-white border border-[#CBD5E1] rounded-xl p-12 text-center space-y-3">
              <Zap className="w-12 h-12 text-[#94A3B8] mx-auto opacity-40" />
              <h4 className="font-serif text-lg text-[#071842]">Threat Simulation Console</h4>
              <p className="text-xs text-[#64748B] max-w-md mx-auto">
                Select a threat vector on the left and click &ldquo;Execute Threat Simulation&rdquo; to evaluate unforgeability, non-repudiation, or eavesdropping detection bounds.
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
          ← Back to Step 03
        </button>
        <button
          onClick={onNext}
          className="btn-dark px-6 py-2.5 rounded-lg text-xs font-mono font-semibold shadow-xs cursor-pointer"
        >
          Proceed to Step 05: Parameter Sweeps →
        </button>
      </div>
    </div>
  );
}

