import React, { useState } from 'react';
import { ProtocolInfo, CreateSessionRequest } from '@/types/phase2';
import {
  X,
  CheckCircle2,
  BookOpen,
  Sliders,
  Layers,
  Shield,
  Zap,
  Info,
  ExternalLink,
} from 'lucide-react';
import SimulatedBadge from '../common/SimulatedBadge';
import ResetButton from '../common/ResetButton';

interface ProtocolCatalogueModalProps {
  isOpen: boolean;
  onClose: () => void;
  protocols: ProtocolInfo[];
  currentProtocolId: string;
  onSelectProtocol: (req: CreateSessionRequest) => void;
}

export default function ProtocolCatalogueModal({
  isOpen,
  onClose,
  protocols,
  currentProtocolId,
  onSelectProtocol,
}: ProtocolCatalogueModalProps) {
  const [activeTab, setActiveTab] = useState<'interactive' | 'theoretical'>('interactive');
  const [selectedId, setSelectedId] = useState<string>(currentProtocolId || 'practical_qds');
  
  // Parameter settings
  const [distanceKm, setDistanceKm] = useState<number>(20);
  const [messageSizeBytes, setMessageSizeBytes] = useState<number>(256);
  const [untrustedNodeCompromised, setUntrustedNodeCompromised] = useState<boolean>(false);
  const [decoyStateCount, setDecoyStateCount] = useState<number>(3);

  const handleResetParameters = () => {
    setDistanceKm(20);
    setMessageSizeBytes(256);
    setUntrustedNodeCompromised(false);
    setDecoyStateCount(3);
  };

  if (!isOpen) return null;

  const interactiveList = protocols.filter((p) => p.category === 'experimental');
  const theoreticalList = protocols.filter((p) => p.category === 'theoretical');

  const selectedProto = protocols.find((p) => p.id === selectedId) || interactiveList[0];

  const handleApply = () => {
    onSelectProtocol({
      protocol_id: selectedId,
      distance_km: distanceKm,
      message_size_bytes: messageSizeBytes,
      untrusted_node_compromised: untrustedNodeCompromised,
      decoy_state_count: decoyStateCount,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#071842]/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="bg-white border border-[#CBD5E1] rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="p-6 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAF9]">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono font-bold text-[#64748B] uppercase tracking-wider">
                MODULE A: PROTOCOL CATALOGUE & CONFIGURATION
              </span>
              <SimulatedBadge size="sm" />
            </div>
            <h2 className="font-serif text-2xl text-[#071842] font-semibold">
              Select Quantum Digital Signature Protocol
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-200 text-[#64748B] hover:text-[#071842] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 border-b border-[#E2E8F0] flex space-x-6 text-sm font-mono font-medium">
          <button
            onClick={() => setActiveTab('interactive')}
            className={`py-3 border-b-2 transition-colors flex items-center space-x-2 ${
              activeTab === 'interactive'
                ? 'border-[#20C8A7] text-[#071842] font-bold'
                : 'border-transparent text-[#64748B] hover:text-[#071842]'
            }`}
          >
            <Zap className="w-4 h-4 text-[#20C8A7]" />
            <span>Interactive Adapters ({interactiveList.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('theoretical')}
            className={`py-3 border-b-2 transition-colors flex items-center space-x-2 ${
              activeTab === 'theoretical'
                ? 'border-[#263EDC] text-[#071842] font-bold'
                : 'border-transparent text-[#64748B] hover:text-[#071842]'
            }`}
          >
            <BookOpen className="w-4 h-4 text-[#263EDC]" />
            <span>Theoretical Reference View ({theoreticalList.length})</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Left Column: Protocol List */}
          <div className="md:col-span-5 space-y-3">
            {activeTab === 'interactive' ? (
              interactiveList.map((proto) => {
                const isSelected = proto.id === selectedId;
                return (
                  <div
                    key={proto.id}
                    onClick={() => setSelectedId(proto.id)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-[#20C8A7] bg-[#E6FBF7]/30 shadow-xs ring-1 ring-[#20C8A7]'
                        : 'border-[#E2E8F0] hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-semibold text-[#071842]">
                        {proto.name}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {proto.status}
                      </span>
                    </div>
                    <p className="text-xs text-[#475569] mt-2 line-clamp-2">
                      {proto.description}
                    </p>
                  </div>
                );
              })
            ) : (
              theoreticalList.map((proto) => {
                const isSelected = proto.id === selectedId;
                return (
                  <div
                    key={proto.id}
                    onClick={() => setSelectedId(proto.id)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-[#263EDC] bg-blue-50/30 shadow-xs ring-1 ring-[#263EDC]'
                        : 'border-[#E2E8F0] hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-semibold text-[#071842]">
                        {proto.name}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                        Reference
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-[#64748B] block mt-1">
                      {proto.year} · {proto.key_strength}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          {/* Right Column: Selected Protocol Deep Dive & Configuration Form */}
          <div className="md:col-span-7 bg-[#F8FAF9] border border-[#E2E8F0] rounded-xl p-6 space-y-6">
            {selectedProto ? (
              <>
                <div className="space-y-2 border-b border-[#E2E8F0] pb-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-serif text-xl font-bold text-[#071842]">
                      {selectedProto.name}
                    </h3>
                    <span
                      className={`text-xs font-mono font-bold px-2.5 py-1 rounded ${
                        selectedProto.is_interactive
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {selectedProto.status}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-[#475569] leading-relaxed">
                    {selectedProto.description}
                  </p>
                  {selectedProto.citation && (
                    <p className="text-[11px] font-mono text-[#64748B] italic pt-1">
                      Citation: {selectedProto.citation}
                    </p>
                  )}
                </div>

                {/* Read-Only Notice for Theoretical Protocols (FR-A3) */}
                {!selectedProto.is_interactive ? (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-2">
                    <div className="flex items-center space-x-2 text-amber-800 font-mono text-xs font-bold">
                      <Info className="w-4 h-4 text-amber-600" />
                      <span>THEORETICAL REFERENCE ONLY (FR-A3)</span>
                    </div>
                    <p className="text-xs text-amber-700">
                      Per Phase-1 and Phase-2 SRS Section 3.1, this protocol is classified as theoretical
                      or early laboratory PoC. No interactive simulation is provided to preserve the historical
                      accuracy of the Phase-1 classification. Please select an experimentally proven protocol
                      to execute live simulations.
                    </p>
                    {selectedProto.best_result && (
                      <div className="text-xs font-mono text-amber-900 pt-1">
                        <strong>Best Experimental Result:</strong> {selectedProto.best_result}
                      </div>
                    )}
                  </div>
                ) : (
                  /* Parameter Configuration Controls (FR-A2) */
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-[#071842] uppercase flex items-center space-x-1.5">
                        <Sliders className="w-3.5 h-3.5 text-[#20C8A7]" />
                        <span>Parameter Configuration (FR-A2)</span>
                      </span>
                      <ResetButton
                        size="xs"
                        variant="ghost"
                        label="Reset Parameters"
                        disabled={distanceKm === 20 && messageSizeBytes === 256 && !untrustedNodeCompromised && decoyStateCount === 3}
                        onReset={handleResetParameters}
                        title="Reset parameters to defaults"
                      />
                    </div>

                    {/* Distance Slider */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-mono">
                        <label className="text-[#475569]">Simulated Distance (km)</label>
                        <span className="font-bold text-[#071842]">{distanceKm} km (Loss: {(distanceKm * 0.2).toFixed(1)} dB)</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max={selectedProto.id === 'tf_qds' ? 500 : 200}
                        step="5"
                        value={distanceKm}
                        onChange={(e) => setDistanceKm(Number(e.target.value))}
                        className="w-full accent-[#20C8A7]"
                      />
                      <span className="text-[10px] text-[#64748B] block">
                        Optical silica fiber attenuation modeled at 0.20 dB/km (1550nm).
                      </span>
                    </div>

                    {/* Message Size */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-mono">
                        <label className="text-[#475569]">Simulated Document Size</label>
                        <span className="font-bold text-[#071842]">
                          {messageSizeBytes >= 1048576
                            ? `${(messageSizeBytes / 1048576).toFixed(1)} MB`
                            : messageSizeBytes >= 1024
                            ? `${(messageSizeBytes / 1024).toFixed(0)} KB`
                            : `${messageSizeBytes} Bytes`}
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-2 text-xs font-mono">
                        {[
                          { label: '256 B', val: 256 },
                          { label: '64 KB', val: 65536 },
                          { label: '1 MB', val: 1048576 },
                          { label: '10 MB', val: 10485760 },
                        ].map((opt) => (
                          <button
                            key={opt.val}
                            type="button"
                            onClick={() => setMessageSizeBytes(opt.val)}
                            className={`py-1.5 px-2 rounded border text-center transition-colors ${
                              messageSizeBytes === opt.val
                                ? 'bg-[#071842] text-white border-[#071842]'
                                : 'bg-white border-[#CBD5E1] text-[#475569] hover:bg-slate-100'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* MDI Untrusted Node Compromise Toggle (FR-D3) */}
                    {selectedProto.id === 'mdi_qds' && (
                      <div className="p-3 bg-white border border-[#CBD5E1] rounded-lg space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono font-bold text-[#071842]">
                            Untrusted Relay Compromised (FR-D3)
                          </span>
                          <input
                            type="checkbox"
                            checked={untrustedNodeCompromised}
                            onChange={(e) => setUntrustedNodeCompromised(e.target.checked)}
                            className="w-4 h-4 accent-amber-600 rounded"
                          />
                        </div>
                        <p className="text-[11px] text-[#64748B]">
                          Simulates an adversarial measurement node. MDI-QDS mathematically preserves verification validity regardless of node honesty.
                        </p>
                      </div>
                    )}

                    {/* Decoy State Count (FR-B3) */}
                    {selectedProto.id === 'decoy_qds' && (
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs font-mono">
                          <label className="text-[#475569]">Decoy Intensities (FR-B3)</label>
                          <span className="font-bold text-[#071842]">{decoyStateCount} States (Signal, Decoy, Vacuum)</span>
                        </div>
                        <input
                          type="range"
                          min="2"
                          max="4"
                          value={decoyStateCount}
                          onChange={(e) => setDecoyStateCount(Number(e.target.value))}
                          className="w-full accent-[#20C8A7]"
                        />
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : null}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-6 border-t border-[#E2E8F0] flex items-center justify-between bg-white">
          <div className="flex items-center space-x-2 text-xs font-mono text-[#64748B]">
            <CheckCircle2 className="w-4 h-4 text-[#20C8A7]" />
            <span>Standardized CSPRNG Protocol Engine</span>
          </div>
          <div className="flex items-center space-x-3">
            <ResetButton
              size="sm"
              variant="outline"
              label="Reset Params"
              disabled={distanceKm === 20 && messageSizeBytes === 256 && !untrustedNodeCompromised && decoyStateCount === 3}
              onReset={handleResetParameters}
              title="Reset simulation parameters to default values"
            />
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-[#CBD5E1] text-xs font-mono font-semibold text-[#475569] hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              disabled={!selectedProto?.is_interactive}
              className={`px-5 py-2 rounded-lg text-xs font-mono font-semibold text-white transition-all ${
                selectedProto?.is_interactive
                  ? 'bg-[#071842] hover:bg-[#0c2464] shadow-md cursor-pointer'
                  : 'bg-slate-300 cursor-not-allowed text-slate-500'
              }`}
            >
              Load & Initialize Protocol
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
