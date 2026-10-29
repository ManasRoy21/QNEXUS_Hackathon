'use client';

import React, { useState, useEffect } from 'react';
import {
  ProtocolEntry,
  CanonicalSimulationState,
  MaterialGenerationRequest,
  AttackSimulationResponse,
  SweepResponse,
  StatisticalBoundResponse,
  StatisticalBoundRequest,
} from '@/types/unifiedSimulation';
import { qdsClient } from '@/services/qdsClient';
import Step01Protocol from './Step01Protocol';
import Step02Material from './Step02Material';
import Step03Signing from './Step03Signing';
import Step04Attack from './Step04Attack';
import Step05Sweeps from './Step05Sweeps';
import Step06StatBounds from './Step06StatBounds';
import Step07Report from './Step07Report';
import { Check, Lock, RotateCcw, Layers, Radio, Fingerprint, ShieldAlert, BarChart3, Sigma, Loader2, AlertCircle } from 'lucide-react';
import styles from './workflow.module.css';

const STEPS = [
  { num: 1, label: 'Protocol', detail: 'Choose a model', icon: Layers },
  { num: 2, label: 'Material', detail: 'Prepare the channel', icon: Radio },
  { num: 3, label: 'Signing', detail: 'Verify your message', icon: Fingerprint },
  { num: 4, label: 'Attack', detail: 'Test disturbance', icon: ShieldAlert },
  { num: 5, label: 'Sweeps', detail: 'Compare parameters', icon: BarChart3 },
  { num: 6, label: 'Statistics', detail: 'Inspect the bounds', icon: Sigma },
];

export default function SimulationWorkflow() {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [protocols, setProtocols] = useState<ProtocolEntry[]>([]);
  const [selectedProtocol, setSelectedProtocol] = useState<string>('practical_qds');
  const [simulationState, setSimulationState] = useState<CanonicalSimulationState | null>(null);
  const [attackResult, setAttackResult] = useState<AttackSimulationResponse | null>(null);
  const [sweepResult, setSweepResult] = useState<SweepResponse | null>(null);
  const [statBoundResult, setStatBoundResult] = useState<StatisticalBoundResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [signingDone, setSigningDone] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const stepParam = params.get('step');
      if (stepParam) {
        const stepNum = parseInt(stepParam, 10);
        if (stepNum >= 1 && stepNum <= 6) {
          setCurrentStep(stepNum);
        }
      }
    }
  }, []);

  useEffect(() => {
    async function loadProtocols() {
      try {
        const res = await qdsClient.getProtocols();
        // Surface only the 5 interactive protocols
        const interactive = (res.protocols as ProtocolEntry[]).filter((p) => p.is_interactive);
        setProtocols(interactive);
        if (interactive.length > 0 && !selectedProtocol) {
          setSelectedProtocol(interactive[0].id);
        }
      } catch (err: any) {
        setProtocols([]);
        setError('Protocol API is unavailable. Start the backend and reload; no simulated results have been substituted.');
      }
    }
    loadProtocols();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Gating logic ──────────────────────────────────────────────────────────────
  const stepUnlocked = (step: number): boolean => {
    if (step === 1) return true;
    if (step === 2) return protocols.some(protocol => protocol.id === selectedProtocol);
    // Steps 3–7 require material generated
    return !!simulationState;
  };

  const stepCompleted = (step: number): boolean => {
    if (step === 1) return !!selectedProtocol;
    if (step === 2) return !!simulationState;
    if (step === 3) return signingDone;
    if (step === 4) return !!attackResult;
    if (step === 5) return !!sweepResult;
    if (step === 6) return !!statBoundResult;
    if (step === 7) return !!simulationState;
    return false;
  };

  const goToStep = (step: number) => {
    if (stepUnlocked(step)) setCurrentStep(step);
  };

  // ── Handlers ──────────────────────────────────────────────────────────────────
  const handleSelectProtocol = (id: string) => {
    setSelectedProtocol(id);
    // Cascade reset downstream
    setSimulationState(null);
    setAttackResult(null);
    setSweepResult(null);
    setStatBoundResult(null);
    setSigningDone(false);
  };

  const handleGenerateMaterial = async (req: MaterialGenerationRequest) => {
    try {
      setLoading(true);
      setError(null);
      const res = await qdsClient.generateMaterial(req);
      setSimulationState(res);
      setAttackResult(null);
      setSweepResult(null);
      setStatBoundResult(null);
      setSigningDone(false);
    } catch (err: any) {
      setSimulationState(null);
      setAttackResult(null);
      setError(err?.response?.data?.detail || err?.message || 'Material generation failed. No fallback data was generated.');
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteAttack = async (attack: string, intensity: number) => {
    if (!simulationState) return;
    try {
      setLoading(true);
      setError(null);
      const res = await qdsClient.runAttack(
        simulationState.simulation_id,
        selectedProtocol,
        attack,
        intensity
      );
      setAttackResult(res);
    } catch (err: any) {
      console.error('Attack execution failed:', err);
      setError(err?.response?.data?.detail || err?.message || 'Attack execution failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRunSweep = async (
    parameter: string,
    values: number[],
    pulseCount: number,
    attack?: string
  ) => {
    try {
      setLoading(true);
      setError(null);
      const res = await qdsClient.runSweep(
        selectedProtocol,
        parameter,
        values,
        pulseCount,
        simulationState?.seed || 42,
        attack
      );
      setSweepResult(res);
    } catch (err: any) {
      console.error('Sweep execution failed:', err);
      setError(err?.response?.data?.detail || err?.message || 'Sweep execution failed');
    } finally {
      setLoading(false);
    }
  };

  const handleComputeBound = async (
    reqOrMethod: string | StatisticalBoundRequest,
    sampleSize?: number,
    delta?: number,
    parameters?: Record<string, any>
  ) => {
    try {
      setLoading(true);
      setError(null);
      let res;
      if (typeof reqOrMethod === 'object') {
        res = await qdsClient.computeStatisticalBound({
          ...reqOrMethod,
          simulation_id: reqOrMethod.simulation_id || simulationState?.simulation_id,
        });
      } else {
        res = await qdsClient.computeStatisticalBound(
          reqOrMethod,
          sampleSize,
          delta,
          undefined,
          undefined,
          parameters || {},
          simulationState?.simulation_id
        );
      }
      setStatBoundResult(res);
    } catch (err: any) {
      console.error('Bound computation failed:', err);
      setError(err?.response?.data?.detail || err?.message || 'Bound computation failed');
    } finally {
      setLoading(false);
    }
  };


  const handleReset = () => {
    setCurrentStep(1);
    setSelectedProtocol(protocols.length > 0 ? protocols[0].id : '');
    setSimulationState(null);
    setAttackResult(null);
    setSweepResult(null);
    setStatBoundResult(null);
    setSigningDone(false);
    setError(null);
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className={styles.console}>
      <section className={styles.journey} aria-label="Six-step research workflow">
        <div className={styles.journeyHeader}><div><span className={styles.overline}>EXPERIMENT WORKFLOW</span><span className={styles.progressCaption}>{STEPS.filter(step => stepCompleted(step.num)).length} of 6 milestones completed</span></div><button onClick={handleReset} disabled={loading} className={styles.resetButton}><RotateCcw size={13} /> Reset experiment</button></div>
        <nav aria-label="Experiment steps"><ol className={styles.steps}>
          {STEPS.map(s => {
            const active = s.num === currentStep;
            const done = stepCompleted(s.num);
            const locked = !stepUnlocked(s.num);
            const Icon = s.icon;
            return <li key={s.num}><button onClick={() => goToStep(s.num)} disabled={locked || loading} aria-current={active ? 'step' : undefined} title={locked ? 'Generate material in step 02 to unlock this step' : s.detail} className={`${styles.step} ${active ? styles.activeStep : ''} ${done && !active ? styles.completedStep : ''}`}>
              <span className={styles.stepTop}><span className={styles.stepIcon}>{done && !active ? <Check size={16} /> : <Icon size={16} />}</span><span>{String(s.num).padStart(2, '0')}</span>{locked && <Lock size={10} />}</span>
              <strong>{s.label}</strong><small>{s.detail}</small>
            </button></li>;
          })}
        </ol></nav>
      </section>
      <div className={styles.sessionBar} aria-live="polite"><div><span className={`${styles.statusDot} ${!protocols.length ? styles.statusOffline : ''}`} /><strong>{loading ? 'Processing experiment' : protocols.length ? 'Protocol API available' : error ? 'Protocol API unavailable' : 'Connecting to protocol API'}</strong>{loading && <Loader2 size={12} className={styles.spinner} />}</div><span>MODEL <b>{protocols.find(p => p.id === selectedProtocol)?.name || 'Awaiting selection'}</b></span><span>{simulationState ? <>RUN <b title={simulationState.simulation_id}>{simulationState.simulation_id.slice(0, 12)}…</b></> : 'No measurement run yet'}</span></div>

      {/* ── Global error ──────────────────────────────────────────────────────── */}
      {error && (
        <div className={styles.error} role="alert">
          <AlertCircle size={18} /><div><strong>Unable to complete the request</strong><p>{typeof error === 'string' ? error : 'Check your inputs and try again.'}</p></div>
          <button onClick={() => setError(null)} aria-label="Dismiss error">×</button>
        </div>
      )}

      {/* ── Step content ──────────────────────────────────────────────────────── */}
      <div className={styles.stepContent} id="workflow-step-content" aria-busy={loading}>
        {currentStep === 1 && (
          <Step01Protocol
            protocols={protocols}
            selectedProtocol={selectedProtocol}
            onSelectProtocol={handleSelectProtocol}
            onNext={() => goToStep(2)}
          />
        )}

        {currentStep === 2 && (
          <Step02Material
            protocol={selectedProtocol}
            simulationState={simulationState}
            onGenerate={handleGenerateMaterial}
            loading={loading}
            onNext={() => goToStep(3)}
            onBack={() => goToStep(1)}
          />
        )}

        {currentStep === 3 && (
          <Step03Signing
            simulationState={simulationState}
            signingDone={signingDone}
            onSigningComplete={() => setSigningDone(true)}
            onNext={() => goToStep(4)}
            onBack={() => goToStep(2)}
          />
        )}

        {currentStep === 4 && (
          <Step04Attack
            protocol={selectedProtocol}
            simulationState={simulationState}
            attackResult={attackResult}
            onExecuteAttack={handleExecuteAttack}
            loading={loading}
            onNext={() => goToStep(5)}
            onBack={() => goToStep(3)}
          />
        )}

        {currentStep === 5 && (
          <Step05Sweeps
            protocol={selectedProtocol}
            simulationState={simulationState}
            sweepResult={sweepResult}
            onRunSweep={handleRunSweep}
            loading={loading}
            onNext={() => goToStep(6)}
            onBack={() => goToStep(4)}
          />
        )}

        {currentStep === 6 && (
          <Step06StatBounds
            protocol={selectedProtocol}
            simulationState={simulationState}
            attackResult={attackResult}
            sweepResult={sweepResult}
            statBoundResult={statBoundResult}
            onComputeBound={handleComputeBound}
            loading={loading}
            onBack={() => goToStep(5)}
            onNext={() => goToStep(7)}
            onRestart={handleReset}
          />
        )}

        {currentStep === 7 && (
          <Step07Report
            protocol={selectedProtocol}
            simulationState={simulationState}
            attackResult={attackResult}
            sweepResult={sweepResult}
            statBoundResult={statBoundResult}
            signingDone={signingDone}
            onRestart={handleReset}
            onBack={() => goToStep(6)}
          />
        )}
      </div>
    </div>
  );
}
