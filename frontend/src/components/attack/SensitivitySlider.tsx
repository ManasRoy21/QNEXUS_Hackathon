'use client';

import React from 'react';
import { AttackType } from '@/types';

interface SensitivitySliderProps {
  intensity: number;
  onChange: (value: number) => void;
  selectedAttack?: AttackType | null;
  spoofedKey?: string;
  onSpoofedKeyChange?: (val: string) => void;
  replayAge?: number;
  onReplayAgeChange?: (val: number) => void;
  asymmetryRate?: number;
  onAsymmetryRateChange?: (val: number) => void;
  pathBias?: number;
  onPathBiasChange?: (val: number) => void;
  targetVerifier?: 'bob' | 'charlie';
  onTargetVerifierChange?: (val: 'bob' | 'charlie') => void;
  disabled?: boolean;
}

export default function SensitivitySlider({
  intensity,
  onChange,
  selectedAttack,
  spoofedKey = 'mallory-unauthorized-key-0xDEADBEEF',
  onSpoofedKeyChange,
  replayAge = 300,
  onReplayAgeChange,
  asymmetryRate = 0.4,
  onAsymmetryRateChange,
  pathBias = 0.45,
  onPathBiasChange,
  targetVerifier = 'charlie',
  onTargetVerifierChange,
  disabled = false,
}: SensitivitySliderProps) {
  const intensityPct = (intensity * 100).toFixed(0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3 text-xs font-mono">
        <h3 className="font-bold text-[#64748B] uppercase tracking-wider">
          PERTURBATION PARAMETERS
        </h3>
        <span className="font-bold text-[#071842] bg-[#F1F5F9] px-2.5 py-0.5 rounded border border-[#CBD5E1]">
          Intensity: {intensityPct}%
        </span>
      </div>

      {/* Main Intensity Slider */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs font-mono text-[#475569]">
          <span className="font-semibold uppercase text-[10px]">Scalar Perturbation Strength</span>
          <span className="font-bold text-[#071842]">{intensity.toFixed(2)}</span>
        </div>
        <input
          type="range"
          min="0.05"
          max="1.0"
          step="0.05"
          value={intensity}
          disabled={disabled}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="w-full h-2 bg-[#E2E8F0] rounded-lg appearance-none cursor-pointer accent-[#071842] disabled:opacity-50"
        />
        <div className="flex justify-between text-[10px] font-mono text-[#64748B]">
          <span>5% (Subtle Noise)</span>
          <span>45% (Eavesdropping)</span>
          <span>100% (Total Blinding)</span>
        </div>
      </div>

      {/* Preset Buttons */}
      <div className="flex space-x-2 pt-1 font-mono">
        {[
          { label: 'Low (20%)', val: 0.2 },
          { label: 'Medium (45%)', val: 0.45 },
          { label: 'High (75%)', val: 0.75 },
          { label: 'Max (100%)', val: 1.0 },
        ].map((p) => (
          <button
            key={p.label}
            type="button"
            disabled={disabled}
            onClick={() => onChange(p.val)}
            className={`flex-1 py-1.5 text-[11px] rounded transition-all font-semibold ${
              Math.abs(intensity - p.val) < 0.02
                ? 'btn-dark'
                : 'bg-[#F8FAF9] border border-[#CBD5E1] text-[#475569] hover:text-[#071842]'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Attack-Specific Contextual Fields */}
      <div className="pt-3 border-t border-[#E2E8F0] space-y-3 font-mono">
        {selectedAttack === 'IMPERSONATION' && (
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-[#64748B] uppercase block">
              Spoofed Public Key Credential (Mallory)
            </label>
            <input
              type="text"
              value={spoofedKey}
              onChange={(e) => onSpoofedKeyChange?.(e.target.value)}
              className="w-full text-xs font-mono bg-[#F8FAF9] border border-[#CBD5E1] rounded px-3 py-2 text-[#071842] font-semibold focus:border-[#20C8A7] focus:outline-none"
            />
          </div>
        )}

        {selectedAttack === 'REPLAY' && (
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-[#64748B] uppercase block">
              Replay Age Offset (Seconds beyond 60s window)
            </label>
            <input
              type="number"
              value={replayAge}
              onChange={(e) => onReplayAgeChange?.(parseFloat(e.target.value))}
              className="w-full text-xs font-mono bg-[#F8FAF9] border border-[#CBD5E1] rounded px-3 py-2 text-[#071842] font-semibold focus:border-[#20C8A7] focus:outline-none"
            />
          </div>
        )}

        {selectedAttack === 'REPUDIATION' && (
          <div className="space-y-2">
            <div className="flex justify-between text-[11px] text-[#475569]">
              <span className="font-semibold uppercase">Dishonest Alice Asymmetry Ratio (Charlie block)</span>
              <span className="text-[#071842] font-bold">{(asymmetryRate * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.05"
              value={asymmetryRate}
              onChange={(e) => onAsymmetryRateChange?.(parseFloat(e.target.value))}
              className="w-full h-2 bg-[#E2E8F0] rounded-lg appearance-none cursor-pointer accent-[#263EDC]"
            />
          </div>
        )}

        {selectedAttack === 'DETECTOR_SIDE_CHANNEL' && (
          <div className="space-y-2">
            <div className="flex justify-between text-[11px] text-[#475569]">
              <span className="font-semibold uppercase">Path B Laser Blinding Asymmetry</span>
              <span className="text-rose-600 font-bold">{(pathBias * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.05"
              value={pathBias}
              onChange={(e) => onPathBiasChange?.(parseFloat(e.target.value))}
              className="w-full h-2 bg-[#E2E8F0] rounded-lg appearance-none cursor-pointer accent-rose-600"
            />
          </div>
        )}

        {/* Target Verifier Toggle */}
        <div className="flex items-center justify-between text-xs pt-1">
          <span className="text-[#64748B] font-semibold uppercase text-[10px]">Target Fiber Channel</span>
          <div className="flex space-x-1.5">
            {(['bob', 'charlie'] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => onTargetVerifierChange?.(v)}
                className={`px-3 py-1 text-[11px] uppercase rounded transition-colors font-semibold ${
                  targetVerifier === v
                    ? 'btn-dark'
                    : 'bg-[#F8FAF9] border border-[#CBD5E1] text-[#475569] hover:text-[#071842]'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
