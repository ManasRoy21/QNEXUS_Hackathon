'use client';

import React from 'react';
import { ProtocolEntry } from '@/types/unifiedSimulation';
import { Shield, BookOpen, CheckCircle, Cpu, AlertCircle, Radio } from 'lucide-react';

interface Props {
  protocols: ProtocolEntry[];
  selectedProtocol: string;
  onSelectProtocol: (id: string) => void;
  onNext: () => void;
}

export default function Step01Protocol({
  protocols,
  selectedProtocol,
  onSelectProtocol,
  onNext,
}: Props) {
  const current = protocols.find((p) => p.id === selectedProtocol);

  return (
    <div className="space-y-6">
      <div className="border-b border-[#CBD5E1] pb-3">
        <span className="text-xs font-mono font-bold text-[#64748B] uppercase tracking-wider block">
          STEP 01 OF 06
        </span>
        <h2 className="font-serif text-2xl text-[#071842]">Select Quantum Digital Signature Protocol</h2>
        <p className="text-xs text-[#475569] mt-1">
          Select an interactive QDS protocol to configure physical quantum channels, generate signature material, and evaluate attack resistance.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {protocols.map((p) => {
          const isSelected = p.id === selectedProtocol;
          const isPractical = p.id === 'practical_qds';

          return (
            <div
              key={p.id}
              onClick={() => onSelectProtocol(p.id)}
              className={`p-5 rounded-xl border transition-all cursor-pointer relative flex flex-col justify-between ${
                isSelected
                  ? 'border-[#20C8A7] bg-[#F0FDF4]/50 ring-2 ring-[#20C8A7]/40 shadow-xs'
                  : 'border-[#CBD5E1] bg-white hover:border-[#94A3B8] hover:shadow-xs'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center space-x-2">
                    <span
                      className={`w-3 h-3 rounded-full border-2 flex items-center justify-center ${
                        isSelected
                          ? 'border-[#20C8A7] bg-[#20C8A7]'
                          : 'border-[#CBD5E1] bg-white'
                      }`}
                    >
                      {isSelected && <span className="w-1 h-1 rounded-full bg-white" />}
                    </span>
                    <span className="font-serif font-bold text-base text-[#071842]">{p.name}</span>
                  </div>
                  <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                    {isPractical ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#071842] text-[#20C8A7]">
                        QUANTITATIVE REFERENCE
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                        QUALITATIVE ANALYSIS
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-50 text-emerald-700 border border-emerald-200">
                      INTERACTIVE
                    </span>
                  </div>
                </div>

                <p className="text-xs text-[#475569] leading-relaxed mb-3">{p.description}</p>

                {p.supported_attacks && p.supported_attacks.length > 0 && (
                  <div className="mb-3 flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-mono text-[#64748B]">Applicable Threats:</span>
                    {p.supported_attacks.map((atk) => (
                      <span
                        key={atk}
                        className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-[#F8FAF9] text-[#071842] border border-[#E2E8F0]"
                      >
                        {atk}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-[#E2E8F0] flex items-center justify-between text-[11px] font-mono text-[#64748B]">
                <span className="truncate max-w-[240px]" title={p.citation}>
                  {p.citation}
                </span>
                <span className="text-[#071842] font-semibold">
                  Default Distance: {p.default_config?.distance_km ?? 25} km
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-[#CBD5E1]">
        <div className="text-xs text-[#64748B] font-mono">
          Selected Protocol:{' '}
          <strong className="text-[#071842]">
            {current?.name || (selectedProtocol ? selectedProtocol : 'None')}
          </strong>{' '}
          {current && (
            <span className="text-[11px] text-[#64748B]">
              ({current.id === 'practical_qds' ? 'Full Physics Engine' : 'Theoretical Model Engine'})
            </span>
          )}
        </div>
        <button
          onClick={onNext}
          disabled={!selectedProtocol}
          className="btn-dark px-6 py-2.5 rounded-lg text-xs font-mono font-semibold shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          Proceed to Step 02: Generate Signature Material →
        </button>
      </div>
    </div>
  );
}
