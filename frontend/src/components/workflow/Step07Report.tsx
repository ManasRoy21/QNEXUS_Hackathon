'use client';

import React, { useState, useRef } from 'react';
import {
  CanonicalSimulationState,
  AttackSimulationResponse,
  SweepResponse,
  StatisticalBoundResponse,
} from '@/types/unifiedSimulation';
import { MathBlock, InlineMath } from '@/components/common/MathBlock';
import {
  FileText,
  Download,
  RotateCcw,
  CheckCircle2,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Copy,
  Cpu,
  Activity,
  Calculator,
  Info,
  Clock,
  Binary,
  Hash,
  ChevronDown,
  ChevronRight,
  Fingerprint,
} from 'lucide-react';

interface Props {
  protocol: string;
  simulationState: CanonicalSimulationState | null;
  attackResult: AttackSimulationResponse | null;
  sweepResult: SweepResponse | null;
  statBoundResult: StatisticalBoundResponse | null;
  signingDone: boolean;
  onRestart: () => void;
  onBack: () => void;
}

function SectionHeader({ num, title, icon: Icon }: { num: string; title: string; icon: any }) {
  return (
    <div className="flex items-center space-x-3 border-b border-[#CBD5E1] pb-3 mb-4">
      <span className="text-xs font-mono font-bold text-[#64748B] w-8">{num}</span>
      <Icon className="w-4 h-4 text-[#263EDC]" />
      <h3 className="text-sm font-mono font-bold text-[#071842] uppercase tracking-wider">{title}</h3>
    </div>
  );
}

function KVRow({ label, value, mono = true, highlight = false }: { label: string; value: any; mono?: boolean; highlight?: boolean }) {
  return (
    <div className="flex items-start justify-between py-1.5 border-b border-[#F1F5F9] last:border-0 gap-4">
      <span className="text-[11px] font-mono text-[#64748B] shrink-0 w-48">{label}</span>
      <span className={`text-[11px] ${mono ? 'font-mono' : 'font-sans'} ${highlight ? 'text-[#071842] font-bold' : 'text-[#334155]'} text-right break-all`}>
        {String(value)}
      </span>
    </div>
  );
}

function CollapsibleSection({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-[#E2E8F0] rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-[#F8FAF9] hover:bg-slate-100 transition-colors text-left"
      >
        <span className="text-xs font-mono font-semibold text-[#071842] uppercase tracking-wider">{title}</span>
        {open ? <ChevronDown className="w-4 h-4 text-[#64748B]" /> : <ChevronRight className="w-4 h-4 text-[#64748B]" />}
      </button>
      {open && <div className="px-4 py-3 bg-white">{children}</div>}
    </div>
  );
}

export default function Step07Report({
  protocol,
  simulationState,
  attackResult,
  sweepResult,
  statBoundResult,
  signingDone,
  onRestart,
  onBack,
}: Props) {
  const [copied, setCopied] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const timestamp = new Date().toISOString();

  const getProtocolLabel = (id: string) => {
    const map: Record<string, string> = {
      practical_qds: 'Practical QDS (Yin, Fu & Chen 2016)',
      mdi_qds: 'MDI-QDS (Measurement-Device-Independent)',
      twin_field_qds: 'Twin-Field QDS',
      otuh_qds: 'OTUH-QDS (One-Time Universal Hash)',
      decoy_state_qds: 'Decoy-State QDS',
    };
    return map[id] || id;
  };

  const getAttackLabel = (id: string) => {
    const map: Record<string, string> = {
      FORGERY: 'FR-E1 Existential Forgery',
      REPUDIATION: 'FR-E2 Dishonest Alice / Repudiation',
      INTERCEPT_RESEND: 'FR-E3 Channel Eavesdropping / Intercept-Resend',
      DETECTOR_BLINDING: 'FR-E4 Detector Blinding / Side Channel',
      PNS: 'FR-B3 Photon Number Splitting',
    };
    return map[id] || id;
  };

  const buildReport = () => {
    const cfg = simulationState?.configuration;
    const mat = simulationState?.measurement_statistics;
    const atk = attackResult;
    const bnd = statBoundResult;

    return {
      report_type: 'QDS_SECURITY_ANALYSIS_REPORT',
      report_version: 'v1.0',
      generated_at: timestamp,
      reproducibility: {
        simulation_id: simulationState?.simulation_id,
        seed: simulationState?.seed,
        model_version: simulationState?.model_version,
        protocol: protocol,
      },
      section_1_protocol: {
        protocol_id: protocol,
        protocol_name: getProtocolLabel(protocol),
        model_version: simulationState?.model_version,
      },
      section_2_configuration: cfg,
      section_3_signature_material: {
        bob_conclusive_bits_sample: simulationState?.material?.bob_conclusive_bits?.slice(0, 16) + '...',
        charlie_conclusive_bits_sample: simulationState?.material?.charlie_conclusive_bits?.slice(0, 16) + '...',
        test_bits: simulationState?.material?.test_bits,
        untested_bits: simulationState?.material?.untested_bits,
        signing_complete: signingDone,
        signing_info: simulationState?.signing,
      },
      section_4_attack_scenario: atk ? {
        attack_id: atk.attack,
        attack_name: getAttackLabel(atk.attack),
        model_status: atk.model_status,
      } : null,
      section_5_physical_mechanism: atk?.four_layer_explanation?.layer_2_physical_effect,
      section_6_observable_effects: atk?.four_layer_explanation?.layer_3_observable_effect,
      section_7_mathematical_analysis: atk?.mathematical_model,
      section_8_security_thresholds: {
        authentication_threshold: cfg?.authentication_threshold,
        verification_threshold: cfg?.verification_threshold,
        qber_bob: mat?.qber_bob,
        qber_charlie: mat?.qber_charlie,
      },
      section_9_attack_result: atk ? {
        verdict: atk.verdict,
        attack_detected: atk.attack_detected,
        protocol_resisted: atk.protocol_resisted,
        applicable: atk.applicable,
      } : null,
      section_10_benchmark_results: sweepResult ? {
        protocol: sweepResult.protocol,
        parameter: sweepResult.parameter,
        points: sweepResult.points?.length,
        model_version: sweepResult.model_version,
      } : null,
      section_11_sweep_results: sweepResult?.summary,
      section_12_statistical_bounds: bnd ? {
        method: bnd.method,
        formula: bnd.formula,
        final_bound: bnd.final_bound,
        interpretation: bnd.interpretation,
        model_version: bnd.model_version,
      } : null,
    };
  };

  const handleExportJSON = () => {
    const report = buildReport();
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `qds_security_report_${simulationState?.simulation_id || 'unknown'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const buildTextReport = () => {
    const cfg = simulationState?.configuration;
    const mat = simulationState?.measurement_statistics;
    const atk = attackResult;
    const bnd = statBoundResult;
    const lines: string[] = [
      '═══════════════════════════════════════════════════════════════════════',
      '         QDS SECURITY ANALYSIS REPORT',
      '═══════════════════════════════════════════════════════════════════════',
      '',
      `Simulation ID : ${simulationState?.simulation_id || 'N/A'}`,
      `Seed          : ${simulationState?.seed ?? 'N/A'}`,
      `Model Version : ${simulationState?.model_version || 'N/A'}`,
      `Generated     : ${timestamp}`,
      '',
      '───────────────────────────────────────────────────────────────────────',
      '  SECTION 1 — PROTOCOL',
      '───────────────────────────────────────────────────────────────────────',
      `  Protocol   : ${getProtocolLabel(protocol)}`,
      `  Model Ver  : ${simulationState?.model_version || 'N/A'}`,
      '',
      '───────────────────────────────────────────────────────────────────────',
      '  SECTION 2 — SIMULATION CONFIGURATION',
      '───────────────────────────────────────────────────────────────────────',
      `  Pulse Count   : ${cfg?.pulse_count ?? 'N/A'}`,
      `  Distance (km) : ${cfg?.distance_km ?? 'N/A'}`,
      `  Fiber Att.    : ${cfg?.fiber_attenuation ?? 'N/A'} dB/km`,
      `  Det. Eff.     : ${cfg?.detector_efficiency ?? 'N/A'}`,
      `  Baseline QBER : ${cfg?.baseline_qber ?? 'N/A'}`,
      `  β (test frac) : ${cfg?.beta ?? 'N/A'}`,
      `  Ta (auth thr) : ${cfg?.authentication_threshold ?? 'N/A'}`,
      `  Tv (verif thr): ${cfg?.verification_threshold ?? 'N/A'}`,
      '',
      '───────────────────────────────────────────────────────────────────────',
      '  SECTION 3 — SIGNATURE MATERIAL',
      '───────────────────────────────────────────────────────────────────────',
      `  Transmitted Pulses  : ${mat?.transmitted_pulses ?? 'N/A'}`,
      `  Detected Events     : ${mat?.detected_events ?? 'N/A'}`,
      `  Conclusive Bob      : ${mat?.conclusive_count_bob ?? 'N/A'}`,
      `  Conclusive Charlie  : ${mat?.conclusive_count_charlie ?? 'N/A'}`,
      `  QBER Bob            : ${mat?.qber_bob !== undefined ? (mat.qber_bob * 100).toFixed(3) + '%' : 'N/A'}`,
      `  QBER Charlie        : ${mat?.qber_charlie !== undefined ? (mat.qber_charlie * 100).toFixed(3) + '%' : 'N/A'}`,
      `  M_u (untested Bob)  : ${simulationState?.material?.untested_bits?.M_u_bob ?? 'N/A'}`,
      `  Signing Complete    : ${signingDone ? 'YES' : 'NO'}`,
      '',
    ];

    if (atk) {
      lines.push(
        '───────────────────────────────────────────────────────────────────────',
        '  SECTION 4 — ATTACK SCENARIO',
        '───────────────────────────────────────────────────────────────────────',
        `  Attack       : ${getAttackLabel(atk.attack)}`,
        `  Model Status : ${atk.model_status}`,
        '',
        '───────────────────────────────────────────────────────────────────────',
        '  SECTION 5 — PHYSICAL MECHANISM',
        '───────────────────────────────────────────────────────────────────────',
        `  ${atk.four_layer_explanation?.layer_2_physical_effect || 'N/A'}`,
        '',
        '───────────────────────────────────────────────────────────────────────',
        '  SECTION 6 — OBSERVABLE EFFECTS',
        '───────────────────────────────────────────────────────────────────────',
        `  ${atk.four_layer_explanation?.layer_3_observable_effect || 'N/A'}`,
        '',
        '───────────────────────────────────────────────────────────────────────',
        '  SECTION 7 — MATHEMATICAL ANALYSIS',
        '───────────────────────────────────────────────────────────────────────',
      );
      if (atk.mathematical_model) {
        lines.push(
          `  Formula : ${atk.mathematical_model.formula}`,
          `  Result  : ${JSON.stringify(atk.mathematical_model.final_result)}`,
          `  Interp. : ${atk.mathematical_model.interpretation}`,
        );
      } else {
        lines.push('  N/A — model not available for this attack/protocol combination');
      }
      lines.push(
        '',
        '───────────────────────────────────────────────────────────────────────',
        '  SECTION 8 — SECURITY THRESHOLDS',
        '───────────────────────────────────────────────────────────────────────',
        `  Ta (Authentication) : ${cfg?.authentication_threshold ?? 'N/A'}`,
        `  Tv (Verification)   : ${cfg?.verification_threshold ?? 'N/A'}`,
        `  QBER Bob            : ${mat?.qber_bob !== undefined ? (mat.qber_bob * 100).toFixed(3) + '%' : 'N/A'}`,
        `  QBER Charlie        : ${mat?.qber_charlie !== undefined ? (mat.qber_charlie * 100).toFixed(3) + '%' : 'N/A'}`,
        '',
        '───────────────────────────────────────────────────────────────────────',
        '  SECTION 9 — ATTACK RESULT',
        '───────────────────────────────────────────────────────────────────────',
        `  Verdict           : ${atk.verdict}`,
        `  Attack Detected   : ${atk.attack_detected ? 'YES' : 'NO'}`,
        `  Protocol Resisted : ${atk.protocol_resisted ? 'YES' : 'NO'}`,
        '',
      );
    }

    if (sweepResult) {
      lines.push(
        '───────────────────────────────────────────────────────────────────────',
        '  SECTION 10 — BENCHMARK RESULTS',
        '───────────────────────────────────────────────────────────────────────',
        `  Protocol  : ${sweepResult.protocol}`,
        `  Parameter : ${sweepResult.parameter}`,
        `  Points    : ${sweepResult.points?.length ?? 0}`,
        '',
        '───────────────────────────────────────────────────────────────────────',
        '  SECTION 11 — PARAMETER SWEEP RESULTS',
        '───────────────────────────────────────────────────────────────────────',
      );
      if (sweepResult.summary) {
        Object.entries(sweepResult.summary).forEach(([k, v]) => {
          lines.push(`  ${k} : ${v}`);
        });
      }
      lines.push('');
    }

    if (bnd) {
      lines.push(
        '───────────────────────────────────────────────────────────────────────',
        '  SECTION 12 — STATISTICAL BOUNDS',
        '───────────────────────────────────────────────────────────────────────',
        `  Method      : ${bnd.method}`,
        `  Formula     : ${bnd.formula}`,
        `  Final Bound : ${bnd.final_bound}`,
        `  Confidence  : ${bnd.confidence !== undefined ? (bnd.confidence * 100).toFixed(2) + '%' : 'N/A'}`,
        `  Interp.     : ${bnd.interpretation}`,
        '',
      );
    }

    lines.push(
      '───────────────────────────────────────────────────────────────────────',
      '  SECTION 13 — REPRODUCIBILITY',
      '───────────────────────────────────────────────────────────────────────',
      `  Simulation ID : ${simulationState?.simulation_id || 'N/A'}`,
      `  Seed          : ${simulationState?.seed ?? 'N/A'}`,
      `  Model Version : ${simulationState?.model_version || 'N/A'}`,
      `  Timestamp     : ${timestamp}`,
      '',
      '═══════════════════════════════════════════════════════════════════════',
      '  END OF REPORT',
      '═══════════════════════════════════════════════════════════════════════',
    );
    return lines.join('\n');
  };

  const handleExportText = () => {
    const text = buildTextReport();
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `qds_security_report_${simulationState?.simulation_id || 'unknown'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyID = () => {
    if (simulationState?.simulation_id) {
      navigator.clipboard.writeText(simulationState.simulation_id);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  const cfg = simulationState?.configuration;
  const mat = simulationState?.measurement_statistics;
  const atk = attackResult;
  const bnd = statBoundResult;

  const completedSections = [
    !!simulationState,
    signingDone,
    !!attackResult,
    !!sweepResult,
    !!statBoundResult,
  ].filter(Boolean).length;

  return (
    <div className="space-y-6" ref={reportRef}>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <FileText className="w-5 h-5 text-[#263EDC]" />
            <h2 className="text-base font-mono font-bold text-[#071842] uppercase tracking-wider">
              07 — QDS Security Analysis Report
            </h2>
          </div>
          <p className="text-xs font-mono text-[#64748B]">
            Consolidated research report from shared simulation state. All values are traceable.
          </p>
        </div>

        {/* Export buttons */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <button
            onClick={handleExportJSON}
            disabled={!simulationState}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-lg text-xs font-mono font-semibold bg-[#071842] text-white hover:bg-[#0c2464] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>EXPORT JSON</span>
          </button>
          <button
            onClick={handleExportText}
            disabled={!simulationState}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-lg text-xs font-mono font-semibold bg-[#20C8A7] text-[#071842] hover:bg-[#17a98d] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>EXPORT REPORT</span>
          </button>
          <button
            onClick={onRestart}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-lg text-xs font-mono font-semibold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>RE-RUN SIMULATION</span>
          </button>
        </div>
      </div>

      {/* Reproducibility Banner */}
      {simulationState && (
        <div className="bg-[#071842] text-white rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="text-[10px] font-mono text-[#20C8A7] uppercase tracking-widest">Reproducibility Information</div>
            <div className="flex items-center space-x-2">
              <Fingerprint className="w-3.5 h-3.5 text-[#20C8A7]" />
              <span className="text-xs font-mono text-white break-all">{simulationState.simulation_id}</span>
              <button onClick={handleCopyID} className="text-[10px] font-mono text-[#20C8A7] hover:text-white border border-[#20C8A7]/40 px-1.5 py-0.5 rounded transition-colors">
                {copied ? 'COPIED!' : 'COPY'}
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-4 text-[11px] font-mono shrink-0">
            <div className="text-center">
              <div className="text-[#94A3B8]">SEED</div>
              <div className="text-white font-bold">{simulationState.seed}</div>
            </div>
            <div className="text-center">
              <div className="text-[#94A3B8]">MODEL</div>
              <div className="text-white font-bold">{simulationState.model_version}</div>
            </div>
            <div className="text-center">
              <div className="text-[#94A3B8]">PROTOCOL</div>
              <div className="text-white font-bold">{protocol.toUpperCase()}</div>
            </div>
            <div className="text-center">
              <div className="text-[#94A3B8]">SECTIONS</div>
              <div className="text-[#20C8A7] font-bold">{completedSections}/5</div>
            </div>
          </div>
        </div>
      )}

      {/* Missing simulation state guard */}
      {!simulationState && (
        <div className="border border-amber-200 bg-amber-50 rounded-xl p-6 text-center space-y-2">
          <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
          <p className="text-sm font-mono font-bold text-amber-800">NO SIMULATION STATE</p>
          <p className="text-xs font-mono text-amber-700">Complete Steps 01–02 to generate a simulation and populate this report.</p>
        </div>
      )}

      {simulationState && (
        <div className="space-y-4">
          {/* S1: Protocol */}
          <CollapsibleSection title="01 — Protocol" defaultOpen={true}>
            <SectionHeader num="01" title="Protocol" icon={Binary} />
            <KVRow label="Protocol ID" value={protocol} highlight />
            <KVRow label="Protocol Name" value={getProtocolLabel(protocol)} mono={false} />
            <KVRow label="Model Version" value={simulationState.model_version} />
          </CollapsibleSection>

          {/* S2: Configuration */}
          <CollapsibleSection title="02 — Simulation Configuration" defaultOpen={true}>
            <SectionHeader num="02" title="Simulation Configuration" icon={Cpu} />
            {cfg && (
              <>
                <KVRow label="Pulse Count N" value={cfg.pulse_count} />
                <KVRow label="Distance (km)" value={cfg.distance_km} />
                <KVRow label="Fiber Attenuation (dB/km)" value={cfg.fiber_attenuation} />
                <KVRow label="Detector Efficiency η" value={cfg.detector_efficiency} />
                <KVRow label="Dark Count Rate p_d" value={cfg.dark_count_rate} />
                <KVRow label="Baseline QBER e_0" value={cfg.baseline_qber} />
                <KVRow label="Test Bit Fraction β" value={cfg.beta} />
                <KVRow label="Authentication Threshold Ta" value={cfg.authentication_threshold} highlight />
                <KVRow label="Verification Threshold Tv" value={cfg.verification_threshold} highlight />
              </>
            )}
          </CollapsibleSection>

          {/* S3: Signature Material */}
          <CollapsibleSection title="03 — Signature Material" defaultOpen={true}>
            <SectionHeader num="03" title="Signature Material" icon={Hash} />
            {mat && (
              <>
                <KVRow label="Transmitted Pulses" value={mat.transmitted_pulses} />
                <KVRow label="Detected Events" value={mat.detected_events} />
                <KVRow label="Conclusive Count (Bob)" value={mat.conclusive_count_bob} />
                <KVRow label="Conclusive Count (Charlie)" value={mat.conclusive_count_charlie} />
                <KVRow label="QBER Bob" value={(mat.qber_bob * 100).toFixed(4) + '%'} highlight />
                <KVRow label="QBER Charlie" value={(mat.qber_charlie * 100).toFixed(4) + '%'} highlight />
                <KVRow label="M_u Bob (untested bits)" value={simulationState.material?.untested_bits?.M_u_bob ?? 'N/A'} />
                <KVRow label="M_u Charlie (untested bits)" value={simulationState.material?.untested_bits?.M_u_charlie ?? 'N/A'} />
                <KVRow label="n_test Bob" value={simulationState.material?.test_bits?.bob_test_count ?? 'N/A'} />
              </>
            )}
            <KVRow label="Signing Complete" value={signingDone ? '✓ YES' : '✗ NO'} highlight />
            {simulationState.signing && (
              <>
                <KVRow label="Message" value={simulationState.signing.message} mono={false} />
                <KVRow label="SHA-256 Hash" value={simulationState.signing.sha256_hash} />
                <KVRow label="Signature Length" value={simulationState.signing.signature_length} />
              </>
            )}
          </CollapsibleSection>

          {/* S4–S9: Attack */}
          {atk ? (
            <CollapsibleSection title="04–09 — Attack Analysis" defaultOpen={true}>
              <SectionHeader num="04" title="Attack Scenario" icon={Activity} />
              <KVRow label="Attack ID" value={atk.attack} highlight />
              <KVRow label="Attack Name" value={getAttackLabel(atk.attack)} mono={false} />
              <KVRow label="Model Status" value={atk.model_status} highlight />

              {atk.model_status === 'UNIMPLEMENTED' ? (
                <div className="mt-4 border border-amber-200 bg-amber-50 rounded-lg p-4 space-y-2">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span className="text-xs font-mono font-bold text-amber-800 uppercase">SIMULATION MODEL NOT AVAILABLE</span>
                  </div>
                  <KVRow label="Protocol" value={protocol} />
                  <KVRow label="Attack" value={atk.attack} />
                  <KVRow label="Implementation Status" value="NOT IMPLEMENTED" />
                  <KVRow label="Reason" value={atk.reason || 'Quantitative model for this protocol/attack combination is not yet implemented.'} mono={false} />
                  <KVRow label="Available Analysis Mode" value="QUALITATIVE / MANUAL" />
                </div>
              ) : (
                <>
                  <div className="mt-4 space-y-3">
                    <div className="bg-[#F8FAF9] rounded-lg p-3 border border-[#E2E8F0]">
                      <p className="text-[10px] font-mono text-[#64748B] uppercase tracking-wider mb-1">05 — Physical Mechanism</p>
                      <p className="text-xs font-mono text-[#334155] leading-relaxed">{atk.four_layer_explanation?.layer_2_physical_effect || 'N/A'}</p>
                    </div>
                    <div className="bg-[#F8FAF9] rounded-lg p-3 border border-[#E2E8F0]">
                      <p className="text-[10px] font-mono text-[#64748B] uppercase tracking-wider mb-1">06 — Observable Effects</p>
                      <p className="text-xs font-mono text-[#334155] leading-relaxed">{atk.four_layer_explanation?.layer_3_observable_effect || 'N/A'}</p>
                    </div>
                    {atk.mathematical_model && (
                      <div className="bg-[#071842] text-white rounded-lg p-3 space-y-2">
                        <p className="text-[10px] font-mono text-[#20C8A7] uppercase tracking-widest">07 — Mathematical Analysis</p>
                        <div className="bg-slate-900/80 p-2.5 rounded border border-slate-800 text-center dark-math">
                          <MathBlock formula={atk.mathematical_model.formula} ariaLabel="Mathematical Analysis Formula" />
                        </div>
                        <div className="text-[11px] text-[#94A3B8] font-mono">{atk.mathematical_model.interpretation}</div>
                      </div>
                    )}
                  </div>

                  <div className="mt-4">
                    <p className="text-[10px] font-mono text-[#64748B] uppercase tracking-wider mb-2">08 — Security Thresholds</p>
                    <KVRow label="Authentication Threshold Ta" value={cfg?.authentication_threshold ?? 'N/A'} highlight />
                    <KVRow label="Verification Threshold Tv" value={cfg?.verification_threshold ?? 'N/A'} highlight />
                    <KVRow label="Observed QBER (Bob)" value={mat ? (mat.qber_bob * 100).toFixed(4) + '%' : 'N/A'} />
                    <KVRow label="Observed QBER (Charlie)" value={mat ? (mat.qber_charlie * 100).toFixed(4) + '%' : 'N/A'} />
                  </div>

                  <div className="mt-4 p-4 rounded-xl border-2 border-[#CBD5E1]" style={{
                    borderColor: atk.protocol_resisted ? '#10B981' : '#EF4444',
                    background: atk.protocol_resisted ? '#F0FDF4' : '#FFF5F5',
                  }}>
                    <p className="text-[10px] font-mono text-[#64748B] uppercase tracking-wider mb-2">09 — Attack Result</p>
                    <div className="flex items-center space-x-3">
                      {atk.protocol_resisted ? (
                        <ShieldCheck className="w-8 h-8 text-emerald-600" />
                      ) : (
                        <ShieldAlert className="w-8 h-8 text-rose-600" />
                      )}
                      <div>
                        <p className="text-sm font-mono font-bold" style={{ color: atk.protocol_resisted ? '#065F46' : '#991B1B' }}>
                          {atk.verdict}
                        </p>
                        <p className="text-[11px] font-mono text-[#64748B]">
                          {atk.attack_detected ? 'Attack Detected' : 'Attack Not Detected'} · {atk.protocol_resisted ? 'Protocol Resisted' : 'Protocol Compromised'}
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </CollapsibleSection>
          ) : (
            <CollapsibleSection title="04–09 — Attack Analysis" defaultOpen={false}>
              <div className="py-4 text-center text-xs font-mono text-[#64748B]">
                No attack executed. Run Step 04 to include attack analysis in this report.
              </div>
            </CollapsibleSection>
          )}

          {/* S10–S11: Sweeps */}
          {sweepResult ? (
            <CollapsibleSection title="10–11 — Benchmark & Parameter Sweep Results" defaultOpen={true}>
              <SectionHeader num="10" title="Benchmark & Sweep Results" icon={Activity} />
              <KVRow label="Protocol" value={sweepResult.protocol} />
              <KVRow label="Parameter Swept" value={sweepResult.parameter} highlight />
              <KVRow label="Data Points" value={sweepResult.points?.length ?? 0} />
              <KVRow label="Model Version" value={sweepResult.model_version} />
              {sweepResult.summary && Object.entries(sweepResult.summary).map(([k, v]) => (
                <KVRow key={k} label={k} value={String(v)} />
              ))}
              {sweepResult.points && sweepResult.points.length > 0 && (
                <div className="mt-3">
                  <p className="text-[10px] font-mono text-[#64748B] uppercase tracking-wider mb-2">SWEEP DATA SAMPLE (first 5 points)</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-[10px] font-mono border border-[#E2E8F0] rounded">
                      <thead className="bg-[#F8FAF9]">
                        <tr>
                          <th className="px-2 py-1 text-left text-[#64748B] border-b border-[#E2E8F0]">Param</th>
                          <th className="px-2 py-1 text-left text-[#64748B] border-b border-[#E2E8F0]">QBER Bob</th>
                          <th className="px-2 py-1 text-left text-[#64748B] border-b border-[#E2E8F0]">ε₁</th>
                          <th className="px-2 py-1 text-left text-[#64748B] border-b border-[#E2E8F0]">ε₂</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sweepResult.points.slice(0, 5).map((pt, i) => (
                          <tr key={i} className="border-b border-[#F1F5F9]">
                            <td className="px-2 py-1 text-[#071842]">{pt.parameter_value}</td>
                            <td className="px-2 py-1 text-[#334155]">{(pt.qber_bob * 100).toFixed(3)}%</td>
                            <td className="px-2 py-1 text-[#334155]">{pt.epsilon_1?.toExponential(3) ?? 'N/A'}</td>
                            <td className="px-2 py-1 text-[#334155]">{pt.epsilon_2?.toExponential(3) ?? 'N/A'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </CollapsibleSection>
          ) : (
            <CollapsibleSection title="10–11 — Benchmark & Parameter Sweep Results" defaultOpen={false}>
              <div className="py-4 text-center text-xs font-mono text-[#64748B]">
                No sweep executed. Run Step 05 to include benchmark data in this report.
              </div>
            </CollapsibleSection>
          )}

          {/* S12: Statistical Bounds */}
          {bnd ? (
            <CollapsibleSection title="12 — Statistical Bounds" defaultOpen={true}>
              <SectionHeader num="12" title="Statistical Bounds" icon={Calculator} />
              <KVRow label="Method" value={bnd.method} highlight />
              <div className="py-2 border-b border-[#E2E8F0]">
                <span className="text-[10px] font-mono text-[#64748B] uppercase tracking-wider block mb-1">Formula</span>
                <div className="bg-[#071842] text-white p-2.5 rounded-lg text-center dark-math">
                  <MathBlock formula={bnd.formula} ariaLabel="Statistical Bound Formula" />
                </div>
              </div>
              <KVRow label="Final Bound" value={bnd.final_bound} highlight />
              {bnd.confidence !== undefined && (
                <KVRow label="Confidence" value={(bnd.confidence * 100).toFixed(4) + '%'} />
              )}
              <KVRow label="Interpretation" value={bnd.interpretation} mono={false} />
              {bnd.scientific_disclaimer && (
                <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-[10px] font-mono text-amber-700 leading-relaxed">{bnd.scientific_disclaimer}</p>
                </div>
              )}
            </CollapsibleSection>
          ) : (
            <CollapsibleSection title="12 — Statistical Bounds" defaultOpen={false}>
              <div className="py-4 text-center text-xs font-mono text-[#64748B]">
                No bounds computed. Run Step 06 to include statistical bounds in this report.
              </div>
            </CollapsibleSection>
          )}

          {/* S13: Reproducibility */}
          <CollapsibleSection title="13 — Reproducibility Information" defaultOpen={true}>
            <SectionHeader num="13" title="Reproducibility Information" icon={Clock} />
            <KVRow label="Simulation ID" value={simulationState.simulation_id} highlight />
            <KVRow label="Random Seed" value={simulationState.seed} highlight />
            <KVRow label="Model Version" value={simulationState.model_version} />
            <KVRow label="Report Generated" value={timestamp} />
            <div className="mt-3 p-3 bg-[#F8FAF9] rounded-lg border border-[#E2E8F0]">
              <p className="text-[10px] font-mono text-[#64748B] mb-1">Re-run with same seed to reproduce all values:</p>
              <code className="text-[10px] font-mono text-[#071842] break-all">
                {`POST /api/v1/simulation/generate-material {"protocol": "${protocol}", "seed": ${simulationState.seed}}`}
              </code>
            </div>
          </CollapsibleSection>
        </div>
      )}

      {/* Navigation footer */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={onBack}
          className="px-4 py-2 rounded-lg text-xs font-mono font-semibold bg-white border border-[#CBD5E1] text-[#475569] hover:bg-slate-50 transition-all"
        >
          ← BACK TO STAT BOUNDS
        </button>
        <button
          onClick={onRestart}
          className="flex items-center space-x-2 px-5 py-2 rounded-lg text-xs font-mono font-semibold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-all"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>RESET WORKFLOW</span>
        </button>
      </div>
    </div>
  );
}
