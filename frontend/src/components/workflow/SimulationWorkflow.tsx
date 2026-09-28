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
import { CheckCircle2, Lock, RotateCcw } from 'lucide-react';

const STEPS = [
  { num: 1, label: '01 PROTOCOL' },
  { num: 2, label: '02 MATERIAL' },
  { num: 3, label: '03 SIGNING' },
  { num: 4, label: '04 ATTACK' },
  { num: 5, label: '05 SWEEPS' },
  { num: 6, label: '06 STAT BOUNDS' },
];

export default function SimulationWorkflow() {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [protocols, setProtocols] = useState<ProtocolEntry[]>([]);
  const [selectedProtocol, setSelectedProtocol] = useState<string>('');
  const [simulationState, setSimulationState] = useState<CanonicalSimulationState | null>(null);
  const [attackResult, setAttackResult] = useState<AttackSimulationResponse | null>(null);
  const [sweepResult, setSweepResult] = useState<SweepResponse | null>(null);
  const [statBoundResult, setStatBoundResult] = useState<StatisticalBoundResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [signingDone, setSigningDone] = useState<boolean>(false);

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
        console.error('Failed to load protocols:', err);
        setError('Backend is currently unreachable. Please verify the FastAPI backend service is running.');
      }
    }
    loadProtocols();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Gating logic ──────────────────────────────────────────────────────────────
  const stepUnlocked = (step: number): boolean => {
    if (step === 1) return true;
    if (step === 2) return !!selectedProtocol;
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
      console.error('Material generation failed:', err);
      setError(err?.response?.data?.detail || err?.message || 'Material generation failed');
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
    <div className="space-y-6">
      {/* ── Stepper bar ──────────────────────────────────────────────────────── */}
      <div className="bg-white border border-[#CBD5E1] rounded-2xl p-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5 flex-1 min-w-0">
            {STEPS.map((s) => {
              const isActive = s.num === currentStep;
              const isDone = stepCompleted(s.num);
              const isLocked = !stepUnlocked(s.num);

              return (
                <button
                  key={s.num}
                  onClick={() => goToStep(s.num)}
                  disabled={isLocked}
                  title={isLocked ? `Complete earlier steps first` : s.label}
                  className={`relative py-2 px-2 rounded-lg text-[11px] font-mono font-bold text-center transition-all select-none
                    ${isActive
                      ? 'bg-[#071842] text-white shadow-sm'
                      : isDone
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 cursor-pointer'
                      : isLocked
                      ? 'bg-[#F8FAF9] text-[#CBD5E1] cursor-not-allowed'
                      : 'bg-[#F8FAF9] text-[#64748B] hover:bg-slate-100 cursor-pointer'
                    }`}
                >
                  {isDone && !isActive && (
                    <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600 absolute top-1 right-1" />
                  )}
                  {isLocked && (
                    <Lock className="w-2 h-2 text-[#CBD5E1] absolute top-1 right-1" />
                  )}
                  {s.label}
                </button>
              );
            })}
          </div>

          {/* Reset */}
          <button
            onClick={handleReset}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-lg text-[11px] font-mono font-semibold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-all whitespace-nowrap flex-shrink-0"
          >
            <RotateCcw className="w-3 h-3" />
            <span>RESET WORKFLOW</span>
          </button>
        </div>
      </div>

      {/* ── Global error ──────────────────────────────────────────────────────── */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs font-mono text-rose-800 flex items-start justify-between gap-4">
          <div><strong>ERROR:</strong> {error}</div>
          <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700 text-lg leading-none">×</button>
        </div>
      )}

      {/* ── Step content ──────────────────────────────────────────────────────── */}
      <div className="bg-[#F8FAF9] rounded-2xl p-6 border border-[#CBD5E1]">
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
