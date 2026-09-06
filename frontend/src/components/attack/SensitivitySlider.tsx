'use client';

import React from 'react';
import { AttackType } from '@/types';

interface SensitivitySliderProps {
  intensity: number;
  onChange: (value: number) => void;
  selectedAttack?: AttackType | null;
  // Specific options
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
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <h3 className="text-xs font-mono font-medium text-slate-400 uppercase tracking-wider">
          Threat Perturbation Parameters
        </h3>
        <span className="text-xs font-mono font-bold text-rose-400">
          Intensity: {intensityPct}%
        </span>
      </div>

      {/* Main Intensity Slider */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-slate-400">
          <span>Scalar Perturbation</span>
          <span className="font-mono text-cyan-300">{intensity.toFixed(2)}</span>
        </div>
        <input
          type="range"
          min="0.05"
          max="1.0"
          step="0.05"
          value={intensity}
          disabled={disabled}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500 disabled:opacity-50"
        />
        <div className="flex justify-between text-[10px] font-mono text-slate-500">
          <span>5% (Subtle)</span>
          <span>50% (Standard)</span>
          <span>100% (Total Sabotage)</span>
        </div>
      </div>

      {/* Preset Buttons */}
      <div className="flex space-x-2 pt-1">
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
            className={`flex-1 py-1 text-[11px] font-mono rounded border transition-colors ${
              Math.abs(intensity - p.val) < 0.02
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/50'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Attack-Specific Contextual Fields */}
      <div className="pt-2 border-t border-slate-800/80 space-y-3">
        {selectedAttack === 'IMPERSONATION' && (
          <div className="space-y-1">
            <label className="text-[11px] font-mono text-slate-400">Spoofed Public Key Credential</label>
            <input
              type="text"
              value={spoofedKey}
              onChange={(e) => onSpoofedKeyChange?.(e.target.value)}
              className="w-full text-xs font-mono bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-amber-300"
            />
          </div>
        )}

        {selectedAttack === 'REPLAY' && (
          <div className="space-y-1">
            <label className="text-[11px] font-mono text-slate-400">Replay Age Offset (Seconds)</label>
            <input
              type="number"
              value={replayAge}
              onChange={(e) => onReplayAgeChange?.(parseFloat(e.target.value))}
              className="w-full text-xs font-mono bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-yellow-300"
            />
          </div>
        )}

        {selectedAttack === 'REPUDIATION' && (
          <div className="space-y-2">
            <div className="flex justify-between text-[11px] font-mono text-slate-400">
              <span>Dishonest Asymmetry Ratio (Charlie block)</span>
              <span className="text-purple-300 font-bold">{(asymmetryRate * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.05"
              value={asymmetryRate}
              onChange={(e) => onAsymmetryRateChange?.(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
            />
          </div>
        )}

        {selectedAttack === 'DETECTOR_SIDE_CHANNEL' && (
          <div className="space-y-2">
            <div className="flex justify-between text-[11px] font-mono text-slate-400">
              <span>Path B Blinding Asymmetry Bias</span>
              <span className="text-pink-300 font-bold">{(pathBias * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.05"
              value={pathBias}
              onChange={(e) => onPathBiasChange?.(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-pink-500"
            />
          </div>
        )}

        {/* Target Verifier Toggle */}
        <div className="flex items-center justify-between text-xs pt-1">
          <span className="text-slate-400 font-mono">Target Channel</span>
          <div className="flex space-x-1">
            {(['bob', 'charlie'] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => onTargetVerifierChange?.(v)}
                className={`px-2.5 py-1 text-[11px] font-mono uppercase rounded transition-colors ${
                  targetVerifier === v
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50'
                    : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
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
