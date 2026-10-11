'use client';
/* eslint-disable @next/next/no-img-element */

import React, { useState, useCallback } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Info,
  Layers,
  ChevronDown,
  Maximize2,
  ExternalLink,
  Sliders,
  MoreHorizontal
} from 'lucide-react';

interface Props {
  distanceKm: number;
  fiberAttenuation: number;
  pulseCount: number;
  simulationState?: any;
  onGenerate?: () => void;
  loading?: boolean;
}

type SchemeType = 'scheme1' | 'scheme2';
type HighlightStation = 'All' | 'Alice' | 'Bob' | 'Charlie';

interface ComponentInfo {
  id: string;
  name: string;
  type: string;
  role: string;
  description: string;
  specs: string;
  station: 'Alice' | 'Bob' | 'Charlie' | 'Channel';
  color: string;
  abbr: string;
  thumbImg: string;
}

const COMPONENT_DETAILS: Record<string, ComponentInfo> = {
  laser: {
    id: 'laser',
    name: 'Laser Source',
    type: 'Weak Coherent Source',
    role: 'Quantum state emission',
    description:
      'Phase-randomized pulsed laser diode operating at 1550 nm telecommunications window. Emits weak coherent states |α⟩ with Poissonian photon number distribution, establishing the physical foundation for decoy-state QDS protocol.',
    specs: 'λ = 1550 nm · Rep Rate: 100 MHz · FWHM: 50 ps',
    station: 'Alice',
    color: '#F59E0B',
    abbr: 'L',
    thumbImg: '/assets/components/laser.png',
  },
  am: {
    id: 'am',
    name: 'Amplitude Modulator (AM)',
    type: 'Intensity Modulator',
    role: 'Decoy state preparation',
    description:
      'Randomly prepares signal and decoy pulse intensities for the decoy-state QDS protocol. High-speed Lithium Niobate (LiNbO₃) Mach-Zehnder modulator defeating photon-number-splitting (PNS) attacks.',
    specs: 'Vπ = 3.2 V · Extinction Ratio > 30 dB · BW: 10 GHz',
    station: 'Alice',
    color: '#EF4444',
    abbr: 'AM',
    thumbImg: '/assets/components/am.png',
  },
  pm_alice: {
    id: 'pm_alice',
    name: 'Polarization Modulator (PM)',
    type: 'State Preparation Modulator',
    role: 'Quantum bit encoding',
    description:
      'Electro-optic phase/polarization modulator driven by an FPGA-controlled random sequence. Encodes random bit values {0, 1} across rectilinear (|H⟩, |V⟩) and diagonal (|+⟩, |-⟩) mutually unbiased bases.',
    specs: 'Insertion Loss < 2.5 dB · Switching Rate: 100 MHz',
    station: 'Alice',
    color: '#F59E0B',
    abbr: 'PM',
    thumbImg: '/assets/components/pm.png',
  },
  bs: {
    id: 'bs',
    name: '50:50 Beam Splitter (BS)',
    type: 'Passive Optical Splitter',
    role: 'State distribution',
    description:
      'Non-polarizing cube beam splitter dividing Alice’s modulated quantum pulses equally between Bob and Charlie channels with 50% theoretical split ratio, maintaining optical state purity.',
    specs: 'Split: 50:50 ± 1% · AR Coating: 1550 nm',
    station: 'Alice',
    color: '#94A3B8',
    abbr: 'BS',
    thumbImg: '/assets/components/bs.png',
  },
  pm_bob: {
    id: 'pm_bob',
    name: 'Bob Polarization Modulator (PM)',
    type: 'Basis Selector',
    role: 'Measurement basis selection',
    description:
      'Receiver polarization controller actively rotating Bob’s measurement basis between rectilinear (Z) and diagonal (X) to detect polarization-encoded quantum signature material.',
    specs: 'Active basis switching · Loss < 2.2 dB',
    station: 'Bob',
    color: '#F59E0B',
    abbr: 'PM',
    thumbImg: '/assets/components/pm.png',
  },
  pbs_bob: {
    id: 'pbs_bob',
    name: 'Bob Polarizing Beam Splitter (PBS)',
    type: 'Polarization Demultiplexer',
    role: 'Bit discrimination',
    description:
      'Transmits horizontally polarized photons (|H⟩) directly to detector D1 and reflects vertically polarized photons (|V⟩) at 90° towards detector D2 for deterministic bit measurement.',
    specs: 'Extinction: Tp/Ts > 1000:1 · 1550 nm',
    station: 'Bob',
    color: '#3B82F6',
    abbr: 'PBS',
    thumbImg: '/assets/components/pbs.png',
  },
  d1: {
    id: 'd1',
    name: 'Single-Photon Detector D1',
    type: 'InGaAs SPAD',
    role: 'Bit 0 detection (Bob)',
    description:
      'Gated InGaAs/InP avalanche photodiode operating in Geiger mode to register single-photon arrival events for orthogonal polarization channel 0 on Bob’s receiver.',
    specs: 'Efficiency η: 10–20% · Dark count: 10⁻⁶/gate',
    station: 'Bob',
    color: '#22C55E',
    abbr: 'D1',
    thumbImg: '/assets/components/detector.png',
  },
  d2: {
    id: 'd2',
    name: 'Single-Photon Detector D2',
    type: 'InGaAs SPAD',
    role: 'Bit 1 detection (Bob)',
    description:
      'Gated InGaAs/InP single-photon detector registering arrival events for orthogonal polarization channel 1 on Bob’s receiver.',
    specs: 'Efficiency η: 10–20% · Dark count: 10⁻⁶/gate',
    station: 'Bob',
    color: '#EF4444',
    abbr: 'D2',
    thumbImg: '/assets/components/detector.png',
  },
  pm_charlie: {
    id: 'pm_charlie',
    name: 'Charlie Polarization Modulator (PM)',
    type: 'Basis Selector',
    role: 'Measurement basis selection',
    description:
      'Charlie’s receiver polarization modulator performing random measurement basis switching between rectilinear and diagonal bases independently of Bob.',
    specs: 'Active basis switching · Loss < 2.2 dB',
    station: 'Charlie',
    color: '#F59E0B',
    abbr: 'PM',
    thumbImg: '/assets/components/pm.png',
  },
  pbs_charlie: {
    id: 'pbs_charlie',
    name: 'Charlie Polarizing Beam Splitter (PBS)',
    type: 'Polarization Demultiplexer',
    role: 'Bit discrimination',
    description:
      'Separates Charlie’s incoming states into transmitted channel (detector D3) and reflected channel (detector D4) for conclusive bit registration.',
    specs: 'Extinction: Tp/Ts > 1000:1 · 1550 nm',
    station: 'Charlie',
    color: '#3B82F6',
    abbr: 'PBS',
    thumbImg: '/assets/components/pbs.png',
  },
  d3: {
    id: 'd3',
    name: 'Single-Photon Detector D3',
    type: 'InGaAs SPAD',
    role: 'Bit 0 detection (Charlie)',
    description:
      'Single-photon detector registering arrival events for bit 0 on Charlie’s receiver to compile conclusive bit register KC.',
    specs: 'Efficiency η: 10–20% · Dark count: 10⁻⁶/gate',
    station: 'Charlie',
    color: '#22C55E',
    abbr: 'D3',
    thumbImg: '/assets/components/detector.png',
  },
  d4: {
    id: 'd4',
    name: 'Single-Photon Detector D4',
    type: 'InGaAs SPAD',
    role: 'Bit 1 detection (Charlie)',
    description:
      'Single-photon detector registering arrival events for bit 1 on Charlie’s receiver to verify non-repudiation bounds.',
    specs: 'Efficiency η: 10–20% · Dark count: 10⁻⁶/gate',
    station: 'Charlie',
    color: '#EF4444',
    abbr: 'D4',
    thumbImg: '/assets/components/detector.png',
  },
};

const LEGEND_ITEMS = [
  { key: 'laser', label: 'Laser', desc: 'Weak coherent source', bg: '#292524', abbr: '▲' },
  { key: 'am', label: 'AM', desc: 'Amplitude Modulator', bg: '#EF4444', abbr: 'AM' },
  { key: 'pm_alice', label: 'PM', desc: 'Polarization Modulator', bg: '#F59E0B', abbr: 'PM' },
  { key: 'bs', label: 'BS', desc: '50:50 Beam Splitter', bg: '#64748B', abbr: 'BS' },
  { key: 'pbs_bob', label: 'PBS', desc: 'Polarizing Beam Splitter', bg: '#3B82F6', abbr: 'PBS' },
  { key: 'd1', label: 'D1-D4', desc: 'Single Photon Detectors', bg: '#1E293B', abbr: 'D1', hasLed: true },
  { key: 'fiber', label: 'Fiber Channel', desc: 'Quantum channel (with loss)', isLine: true },
];

export default function VirtualOpticalLaboratory({
  distanceKm,
  fiberAttenuation,
  pulseCount,
  simulationState,
  onGenerate,
  loading = false,
}: Props) {
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [scheme, setScheme] = useState<SchemeType>('scheme1');
  const [showLabels, setShowLabels] = useState<boolean>(true);
  const [showDirection, setShowDirection] = useState<boolean>(true);
  const [selectedComp, setSelectedComp] = useState<string>('am');
  const [highlight, setHighlight] = useState<HighlightStation>('Alice');
  const [zoom, setZoom] = useState<number>(1);
  const [rotationAngle, setRotationAngle] = useState<number>(0);
  const [replayKey, setReplayKey] = useState<number>(0);

  const activeInfo = COMPONENT_DETAILS[selectedComp] || COMPONENT_DETAILS.am;
  const channelLossDb = (distanceKm * fiberAttenuation).toFixed(2);

  const handleResetView = useCallback(() => {
    setZoom(1);
    setRotationAngle(0);
    setHighlight('All');
    setReplayKey((k) => k + 1);
    setIsPlaying(true);
  }, []);

  const handleReplay = useCallback(() => {
    setIsPlaying(false);
    setTimeout(() => {
      setReplayKey((k) => k + 1);
      setIsPlaying(true);
    }, 100);
  }, []);

  const isAliceDimmed = highlight !== 'All' && highlight !== 'Alice';
  const isBobDimmed = highlight !== 'All' && highlight !== 'Bob';
  const isCharlieDimmed = highlight !== 'All' && highlight !== 'Charlie';

  return (
    <div className="bg-white border border-[#CBD5E1] rounded-2xl overflow-hidden shadow-sm transition-all">
      {/* ── Top Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 border-b border-[#E2E8F0]">
        <div>
          <h2 className="text-2xl font-bold text-[#071842] tracking-tight font-serif">
            Virtual Quantum Optical Laboratory
          </h2>
          <p className="text-xs text-[#64748B] font-mono mt-0.5">
            Practical QDS Hardware Simulation
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={onGenerate}
            disabled={loading}
            className="px-4 py-2 rounded-lg text-xs font-mono font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] transition-colors shadow-xs inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{loading ? 'Simulating Channels...' : 'Generate Signature Material'}</span>
          </button>

          <button
            onClick={handleResetView}
            className="px-3.5 py-2 rounded-lg text-xs font-mono font-medium text-[#475569] bg-white border border-[#CBD5E1] hover:bg-slate-50 transition-colors shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset View</span>
          </button>

          <button
            title="More Options"
            className="p-2 rounded-lg text-[#64748B] bg-white border border-[#CBD5E1] hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Scheme Switcher Tabs ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-6 pt-3.5 pb-2 bg-[#FAFCFF] border-b border-[#F1F5F9]">
        <button
          onClick={() => setScheme('scheme1')}
          className={`px-4 py-2 rounded-md text-xs font-mono font-semibold transition-all cursor-pointer inline-flex items-center gap-2 ${
            scheme === 'scheme1'
              ? 'bg-[#2563EB] text-white shadow-xs'
              : 'bg-white text-[#475569] border border-[#CBD5E1] hover:bg-slate-50'
          }`}
        >
          <span>Scheme I</span>
          <span className={scheme === 'scheme1' ? 'text-blue-100 font-normal' : 'text-[#64748B] font-normal'}>
            (Laser → AM → PM → BS)
          </span>
        </button>

        <button
          onClick={() => setScheme('scheme2')}
          className={`px-4 py-2 rounded-md text-xs font-mono font-semibold transition-all cursor-pointer inline-flex items-center gap-2 ${
            scheme === 'scheme2'
              ? 'bg-[#2563EB] text-white shadow-xs'
              : 'bg-white text-[#475569] border border-[#CBD5E1] hover:bg-slate-50'
          }`}
        >
          <span>Scheme II</span>
          <span className={scheme === 'scheme2' ? 'text-blue-100 font-normal' : 'text-[#64748B] font-normal'}>
            (Laser → PM → BS + AM Paths)
          </span>
        </button>
      </div>

      {/* ── Main Virtual Stage Area + Sidebar ─────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[500px] border-b border-[#E2E8F0]">
        {/* Stage Visualization (9 cols) */}
        <div className="lg:col-span-9 relative bg-[#EEF2F6] overflow-hidden select-none flex items-center justify-center min-h-[480px]">
          {/* Photorealistic 3D Stage Background Image */}
          <div
            className="absolute inset-0 transition-transform duration-300 ease-out"
            style={{
              transform: `scale(${zoom}) rotate(${rotationAngle}deg)`,
              transformOrigin: 'center center',
            }}
          >
            <img
              src="/assets/raw_optical_stage_clean.png"
              alt="Virtual Optical Laboratory 3D Hardware Simulation"
              className="w-full h-full object-cover object-center pointer-events-none"
            />

            {/* Animated photon pulse overlay on fiber channels */}
            {isPlaying && (
              <svg
                key={replayKey}
                className="absolute inset-0 w-full h-full pointer-events-none"
                viewBox="0 0 1110 455"
                preserveAspectRatio="none"
              >
                <defs>
                  <filter id="photonGlowPulse" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                  <path id="fiberPulseBob" d="M 420,185 C 490,175 600,120 660,115" fill="none" />
                  <path id="fiberPulseCharlie" d="M 420,205 C 490,215 600,285 660,290" fill="none" />
                </defs>

                {[0, 0.7, 1.4].map((delay, i) => (
                  <circle key={`pb-${i}`} r="4.5" fill="#67E8F9" filter="url(#photonGlowPulse)" opacity="0.95">
                    <animateMotion dur="2.1s" begin={`${delay}s`} repeatCount="indefinite">
                      <mpath href="#fiberPulseBob" />
                    </animateMotion>
                  </circle>
                ))}

                {[0.35, 1.05, 1.75].map((delay, i) => (
                  <circle key={`pc-${i}`} r="4.5" fill="#67E8F9" filter="url(#photonGlowPulse)" opacity="0.95">
                    <animateMotion dur="2.1s" begin={`${delay}s`} repeatCount="indefinite">
                      <mpath href="#fiberPulseCharlie" />
                    </animateMotion>
                  </circle>
                ))}
              </svg>
            )}

            {/* ── Interactive Station & Component Click Hitboxes ─────────────── */}
            {/* Alice Hotspots */}
            <div
              className={`absolute transition-opacity duration-300 ${isAliceDimmed ? 'opacity-25 pointer-events-none' : 'opacity-100'}`}
              style={{ left: '0%', top: '25%', width: '48%', height: '55%' }}
            >
              {/* Laser */}
              <button
                onClick={() => setSelectedComp('laser')}
                title="Laser Source"
                className={`absolute left-[5%] top-[44%] w-[18%] h-[36%] rounded-lg cursor-pointer transition-all ${
                  selectedComp === 'laser' ? 'ring-2 ring-blue-400 bg-blue-500/20' : 'hover:bg-white/10'
                }`}
              />

              {/* AM */}
              <button
                onClick={() => setSelectedComp('am')}
                title="Amplitude Modulator"
                className={`absolute left-[26%] top-[50%] w-[16%] h-[32%] rounded-lg cursor-pointer transition-all ${
                  selectedComp === 'am' ? 'ring-2 ring-blue-400 bg-blue-500/20' : 'hover:bg-white/10'
                }`}
              />

              {/* PM Alice */}
              <button
                onClick={() => setSelectedComp('pm_alice')}
                title="Polarization Modulator"
                className={`absolute left-[45%] top-[50%] w-[16%] h-[34%] rounded-lg cursor-pointer transition-all ${
                  selectedComp === 'pm_alice' ? 'ring-2 ring-blue-400 bg-blue-500/20' : 'hover:bg-white/10'
                }`}
              />

              {/* BS */}
              <button
                onClick={() => setSelectedComp('bs')}
                title="50:50 Beam Splitter"
                className={`absolute left-[65%] top-[48%] w-[16%] h-[36%] rounded-lg cursor-pointer transition-all ${
                  selectedComp === 'bs' ? 'ring-2 ring-blue-400 bg-blue-500/20' : 'hover:bg-white/10'
                }`}
              />
            </div>

            {/* Bob Hotspots */}
            <div
              className={`absolute transition-opacity duration-300 ${isBobDimmed ? 'opacity-25 pointer-events-none' : 'opacity-100'}`}
              style={{ left: '50%', top: '5%', width: '50%', height: '48%' }}
            >
              {/* PM Bob */}
              <button
                onClick={() => setSelectedComp('pm_bob')}
                className={`absolute left-[16%] top-[34%] w-[18%] h-[40%] rounded-lg cursor-pointer transition-all ${
                  selectedComp === 'pm_bob' ? 'ring-2 ring-blue-400 bg-blue-500/20' : 'hover:bg-white/10'
                }`}
              />

              {/* PBS Bob */}
              <button
                onClick={() => setSelectedComp('pbs_bob')}
                className={`absolute left-[37%] top-[32%] w-[16%] h-[44%] rounded-lg cursor-pointer transition-all ${
                  selectedComp === 'pbs_bob' ? 'ring-2 ring-blue-400 bg-blue-500/20' : 'hover:bg-white/10'
                }`}
              />

              {/* D1 */}
              <button
                onClick={() => setSelectedComp('d1')}
                className={`absolute left-[63%] top-[20%] w-[16%] h-[32%] rounded-lg cursor-pointer transition-all ${
                  selectedComp === 'd1' ? 'ring-2 ring-blue-400 bg-blue-500/20' : 'hover:bg-white/10'
                }`}
              />

              {/* D2 */}
              <button
                onClick={() => setSelectedComp('d2')}
                className={`absolute left-[65%] top-[56%] w-[16%] h-[32%] rounded-lg cursor-pointer transition-all ${
                  selectedComp === 'd2' ? 'ring-2 ring-blue-400 bg-blue-500/20' : 'hover:bg-white/10'
                }`}
              />
            </div>

            {/* Charlie Hotspots */}
            <div
              className={`absolute transition-opacity duration-300 ${isCharlieDimmed ? 'opacity-25 pointer-events-none' : 'opacity-100'}`}
              style={{ left: '50%', top: '52%', width: '50%', height: '48%' }}
            >
              {/* PM Charlie */}
              <button
                onClick={() => setSelectedComp('pm_charlie')}
                className={`absolute left-[16%] top-[34%] w-[18%] h-[40%] rounded-lg cursor-pointer transition-all ${
                  selectedComp === 'pm_charlie' ? 'ring-2 ring-blue-400 bg-blue-500/20' : 'hover:bg-white/10'
                }`}
              />

              {/* PBS Charlie */}
              <button
                onClick={() => setSelectedComp('pbs_charlie')}
                className={`absolute left-[37%] top-[32%] w-[16%] h-[44%] rounded-lg cursor-pointer transition-all ${
                  selectedComp === 'pbs_charlie' ? 'ring-2 ring-blue-400 bg-blue-500/20' : 'hover:bg-white/10'
                }`}
              />

              {/* D3 */}
              <button
                onClick={() => setSelectedComp('d3')}
                className={`absolute left-[63%] top-[20%] w-[16%] h-[32%] rounded-lg cursor-pointer transition-all ${
                  selectedComp === 'd3' ? 'ring-2 ring-blue-400 bg-blue-500/20' : 'hover:bg-white/10'
                }`}
              />

              {/* D4 */}
              <button
                onClick={() => setSelectedComp('d4')}
                className={`absolute left-[65%] top-[56%] w-[16%] h-[32%] rounded-lg cursor-pointer transition-all ${
                  selectedComp === 'd4' ? 'ring-2 ring-blue-400 bg-blue-500/20' : 'hover:bg-white/10'
                }`}
              />
            </div>

            {/* ── Floating Fiber Channel Badges (Matching Reference Image 1) ── */}
            {/* Alice → Bob Fiber Channel Badge */}
            <div
              className={`absolute pointer-events-auto bg-white/95 backdrop-blur-xs border border-slate-200/90 rounded-xl px-3.5 py-2 shadow-sm text-left transition-opacity duration-200 ${showLabels ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
              style={{ left: '40%', top: '16%' }}
            >
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-mono font-bold text-[#071842]">
                  Fiber Channel — {distanceKm} km
                </span>
                {showDirection && <span className="text-amber-500 font-bold text-xs">→</span>}
              </div>
              <div className="text-[10px] font-mono text-[#64748B]">
                Loss: {fiberAttenuation.toFixed(2)} dB/km
              </div>
            </div>

            {/* Alice → Charlie Fiber Channel Badge */}
            <div
              className={`absolute pointer-events-auto bg-white/95 backdrop-blur-xs border border-slate-200/90 rounded-xl px-3.5 py-2 shadow-sm text-left transition-opacity duration-200 ${showLabels ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
              style={{ left: '40%', top: '64%' }}
            >
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-mono font-bold text-[#071842]">
                  Fiber Channel — {distanceKm} km
                </span>
                {showDirection && <span className="text-amber-500 font-bold text-xs">→</span>}
              </div>
              <div className="text-[10px] font-mono text-[#64748B]">
                Loss: {fiberAttenuation.toFixed(2)} dB/km
              </div>
            </div>
          </div>

          {/* ── Implementation View Mini-Card Overlay (Bottom Left of Canvas) ── */}
          <div className="absolute bottom-3 left-4 bg-white/95 backdrop-blur-xs border border-[#CBD5E1] rounded-xl p-3 shadow-sm max-w-[270px] z-10 text-left">
            <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-[#475569] mb-2">
              <span className="text-[#2563EB]">◇</span>
              <span>Implementation View</span>
            </div>

            {/* Scheme I diagram */}
            <div
              onClick={() => setScheme('scheme1')}
              className={`p-1.5 rounded-lg border transition-all cursor-pointer mb-1.5 ${
                scheme === 'scheme1' ? 'border-blue-300 bg-blue-50/60 ring-1 ring-blue-300' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
              }`}
            >
              <div className="text-[9px] font-mono text-[#64748B] mb-1 font-semibold flex items-center justify-between">
                <span>Scheme I</span>
                {scheme === 'scheme1' && <span className="text-[#2563EB] text-[8px] font-bold">ACTIVE</span>}
              </div>
              <div className="flex items-center gap-1 text-[8px] font-mono font-bold">
                <span className="px-1.5 py-0.5 rounded bg-stone-800 text-white">Laser</span>
                <span className="text-slate-400">→</span>
                <span className="px-1.5 py-0.5 rounded bg-red-600 text-white">AM</span>
                <span className="text-slate-400">→</span>
                <span className="px-1.5 py-0.5 rounded bg-amber-600 text-white">PM</span>
                <span className="text-slate-400">→</span>
                <span className="px-1.5 py-0.5 rounded bg-slate-600 text-white">BS</span>
                <span className="text-blue-500 font-bold">➔</span>
              </div>
            </div>

            {/* Scheme II diagram */}
            <div
              onClick={() => setScheme('scheme2')}
              className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                scheme === 'scheme2' ? 'border-blue-300 bg-blue-50/60 ring-1 ring-blue-300' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
              }`}
            >
              <div className="text-[9px] font-mono text-[#64748B] mb-1 font-semibold flex items-center justify-between">
                <span>Scheme II</span>
                {scheme === 'scheme2' && <span className="text-[#2563EB] text-[8px] font-bold">ACTIVE</span>}
              </div>
              <div className="flex items-center gap-1 text-[8px] font-mono font-bold">
                <span className="px-1.5 py-0.5 rounded bg-stone-800 text-white">Laser</span>
                <span className="text-slate-400">→</span>
                <span className="px-1.5 py-0.5 rounded bg-amber-600 text-white">PM</span>
                <span className="text-slate-400">→</span>
                <span className="px-1.5 py-0.5 rounded bg-slate-600 text-white">BS</span>
                <span className="text-slate-400">➔</span>
                <div className="flex flex-col gap-0.5">
                  <span className="px-1 py-0.2 rounded bg-red-600 text-white text-[7px]">AM</span>
                  <span className="px-1 py-0.2 rounded bg-red-600 text-white text-[7px]">AM</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Right Sidebar: Legend & Component Inspector (3 cols) ───────────── */}
        <div className="lg:col-span-3 border-l border-[#E2E8F0] bg-white flex flex-col justify-between">
          {/* Top Section: Component Legend */}
          <div className="p-4 border-b border-[#F1F5F9]">
            <h3 className="text-xs font-mono font-bold text-[#071842] uppercase tracking-wider mb-2.5 flex items-center justify-between">
              <span>Component Legend</span>
            </h3>

            <div className="space-y-1.5">
              {LEGEND_ITEMS.map((item) => (
                <button
                  key={item.key}
                  onClick={() => item.key !== 'fiber' && setSelectedComp(item.key)}
                  className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-left transition-all cursor-pointer ${
                    selectedComp === item.key
                      ? 'bg-blue-50 border border-blue-200/80 shadow-2xs'
                      : 'hover:bg-slate-50 border border-transparent'
                  }`}
                >
                  {item.isLine ? (
                    <div className="w-7 h-4 flex items-center justify-center flex-shrink-0">
                      <div className="w-full h-1 rounded-full bg-amber-400 shadow-xs" />
                    </div>
                  ) : (
                    <div
                      className="w-7 h-5 rounded flex items-center justify-center flex-shrink-0 text-[8px] font-mono font-bold text-white shadow-2xs relative"
                      style={{ background: item.bg }}
                    >
                      {item.abbr}
                      {item.hasLed && (
                        <span className="absolute top-0.5 right-0.5 w-1 h-1 rounded-full bg-emerald-400 animate-ping" />
                      )}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-mono font-bold text-[#1E293B] leading-tight truncate">
                      {item.label}
                    </div>
                    <div className="text-[9px] text-[#64748B] truncate">
                      {item.desc}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Bottom Section: Component Inspector */}
          <div className="p-4 bg-[#F8FAFC]/50 flex-1 flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-mono font-bold text-[#071842] uppercase tracking-wider mb-2.5">
                Component Inspector
              </h3>

              <div className="bg-white border border-[#CBD5E1] rounded-xl p-3.5 shadow-2xs space-y-3">
                {/* Header with thumbnail image */}
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-slate-900 border border-slate-700 overflow-hidden flex-shrink-0 flex items-center justify-center shadow-xs">
                    <img
                      src={activeInfo.thumbImg}
                      alt={activeInfo.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-mono font-bold text-[#071842] truncate leading-tight">
                      {activeInfo.name}
                    </h4>
                    <span className="text-[10px] font-mono text-[#64748B] block mt-0.5">
                      {activeInfo.type}
                    </span>
                  </div>
                </div>

                {/* Role / Description */}
                <p className="text-[10px] text-[#475569] leading-relaxed">
                  {activeInfo.description}
                </p>

                {/* Technical Specifications */}
                <div className="bg-[#F1F5F9]/80 rounded-lg p-2 border border-[#E2E8F0] text-[9px] font-mono text-[#334155] leading-normal">
                  <strong className="text-[#071842] block mb-0.5">Physical Specifications:</strong>
                  {activeInfo.specs}
                </div>

                {/* Station Tag */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[9px] font-mono text-[#64748B]">Assigned Station:</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[9px] font-mono font-semibold ${
                      activeInfo.station === 'Alice'
                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                        : activeInfo.station === 'Bob'
                        ? 'bg-blue-100 text-blue-800 border border-blue-200'
                        : activeInfo.station === 'Charlie'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {activeInfo.station}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom Control Toolbar (Matching Reference Image 1) ─────────────── */}
      <div className="px-6 py-3 bg-[#F8FAFC] flex flex-wrap items-center justify-between gap-4">
        {/* View Controls */}
        <div className="flex items-center gap-4">
          <div>
            <span className="text-[10px] font-mono text-[#64748B] block mb-1 uppercase font-semibold">
              View Controls
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setRotationAngle((a) => (a === 0 ? 5 : a === 5 ? -5 : 0))}
                className="px-2.5 py-1.5 rounded-lg text-xs font-mono font-medium text-[#475569] bg-white border border-[#CBD5E1] hover:bg-slate-50 transition-colors shadow-2xs inline-flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Rotate</span>
              </button>

              <button
                onClick={() => setZoom((z) => Math.min(z + 0.15, 2.0))}
                className="px-2.5 py-1.5 rounded-lg text-xs font-mono font-medium text-[#475569] bg-white border border-[#CBD5E1] hover:bg-slate-50 transition-colors shadow-2xs inline-flex items-center gap-1 cursor-pointer"
              >
                <ZoomIn className="w-3 h-3" />
                <span>Zoom In</span>
              </button>

              <button
                onClick={() => setZoom((z) => Math.max(z - 0.15, 0.65))}
                className="px-2.5 py-1.5 rounded-lg text-xs font-mono font-medium text-[#475569] bg-white border border-[#CBD5E1] hover:bg-slate-50 transition-colors shadow-2xs inline-flex items-center gap-1 cursor-pointer"
              >
                <ZoomOut className="w-3 h-3" />
                <span>Zoom Out</span>
              </button>

              <button
                onClick={() => {
                  setZoom(1);
                  setRotationAngle(0);
                }}
                className="px-2.5 py-1.5 rounded-lg text-xs font-mono font-medium text-[#475569] bg-white border border-[#CBD5E1] hover:bg-slate-50 transition-colors shadow-2xs inline-flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            </div>
          </div>

          {/* Display Options */}
          <div>
            <span className="text-[10px] font-mono text-[#64748B] block mb-1 uppercase font-semibold">
              Display Options
            </span>
            <div className="flex items-center gap-3">
              {/* Show Labels Toggle */}
              <label className="flex items-center gap-1.5 cursor-pointer">
                <div
                  onClick={() => setShowLabels((v) => !v)}
                  className={`relative w-8 h-4.5 rounded-full transition-colors cursor-pointer ${
                    showLabels ? 'bg-[#2563EB]' : 'bg-[#CBD5E1]'
                  }`}
                >
                  <div
                    className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white shadow-xs transition-transform ${
                      showLabels ? 'translate-x-4' : 'translate-x-0.5'
                    }`}
                  />
                </div>
                <span className="text-[11px] font-mono text-[#334155]">Show Labels</span>
              </label>

              {/* Show Direction Toggle */}
              <label className="flex items-center gap-1.5 cursor-pointer">
                <div
                  onClick={() => setShowDirection((v) => !v)}
                  className={`relative w-8 h-4.5 rounded-full transition-colors cursor-pointer ${
                    showDirection ? 'bg-[#2563EB]' : 'bg-[#CBD5E1]'
                  }`}
                >
                  <div
                    className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white shadow-xs transition-transform ${
                      showDirection ? 'translate-x-4' : 'translate-x-0.5'
                    }`}
                  />
                </div>
                <span className="text-[11px] font-mono text-[#334155]">Show Direction</span>
              </label>
            </div>
          </div>

          {/* Highlight Filter */}
          <div>
            <span className="text-[10px] font-mono text-[#64748B] block mb-1 uppercase font-semibold">
              Highlight
            </span>
            <select
              value={highlight}
              onChange={(e) => setHighlight(e.target.value as HighlightStation)}
              className="px-3 py-1.5 rounded-lg text-xs font-mono font-medium text-[#1E293B] bg-white border border-[#CBD5E1] hover:border-slate-400 focus:outline-hidden focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              <option value="All">All Stations</option>
              <option value="Alice">Alice</option>
              <option value="Bob">Bob</option>
              <option value="Charlie">Charlie</option>
            </select>
          </div>
        </div>

        {/* Simulation Controls */}
        <div>
          <span className="text-[10px] font-mono text-[#64748B] block mb-1 uppercase font-semibold text-right">
            Simulation Controls
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPlaying((p) => !p)}
              className={`px-4 py-1.5 rounded-lg text-xs font-mono font-semibold transition-colors shadow-xs inline-flex items-center gap-1.5 cursor-pointer ${
                isPlaying
                  ? 'bg-[#2563EB] text-white hover:bg-[#1D4ED8]'
                  : 'bg-[#071842] text-white hover:bg-slate-800'
              }`}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              <span>{isPlaying ? 'Pause' : 'Start Simulation'}</span>
            </button>

            <button
              onClick={handleReplay}
              className="px-3 py-1.5 rounded-lg text-xs font-mono font-medium text-[#475569] bg-white border border-[#CBD5E1] hover:bg-slate-50 transition-colors shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Replay</span>
            </button>

            <div className="flex items-center gap-1 px-2 py-1 rounded bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-mono font-semibold ml-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Ready</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
