import React from 'react';
import { TraceEvent } from '@/types/phase2';
import {
  ArrowRight,
  ShieldCheck,
  Send,
  Key,
  FileCheck,
  CheckCircle,
  XCircle,
  Clock,
  Layers,
} from 'lucide-react';

interface ProtocolSequenceTraceProps {
  trace: TraceEvent[];
  activeStep?: string;
}

export default function ProtocolSequenceTrace({
  trace = [],
  activeStep,
}: ProtocolSequenceTraceProps) {
  // Ordered sequence per SRS Figure 2
  const sequenceNodes = [
    { id: 'Alice', label: 'Alice (Signer)', role: 'Alice' },
    { id: 'Engine', label: 'Key & State Generation', role: 'Engine' },
    { id: 'Bob', label: 'Bob (Verifier 1)', role: 'Bob' },
    { id: 'Charlie', label: 'Charlie (Arbitrator)', role: 'Charlie' },
  ];

  return (
    <div className="bg-white border border-[#CBD5E1] rounded-2xl p-6 shadow-xs space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E2E8F0] pb-4">
        <div>
          <span className="text-xs font-mono font-bold text-[#64748B] uppercase tracking-wider block">
            FR-G2: PROTOCOL SEQUENCE TRACE
          </span>
          <h3 className="font-serif text-xl text-[#071842] font-semibold">
            Live Tripartite Message Exchange (SRS Figure 2)
          </h3>
        </div>
        <div className="flex items-center space-x-2 text-xs font-mono text-[#64748B]">
          <Clock className="w-3.5 h-3.5 text-[#20C8A7]" />
          <span>{trace.length} Audit Events Recorded</span>
        </div>
      </div>

      {/* Visual Sequence Diagrams Columns (Entities) */}
      <div className="grid grid-cols-4 gap-2 sm:gap-4 text-center font-mono">
        {sequenceNodes.map((node) => (
          <div
            key={node.id}
            className="p-3 rounded-xl border border-[#CBD5E1] bg-[#F8FAF9] shadow-xs"
          >
            <div className="w-8 h-8 mx-auto rounded-full bg-[#071842] text-[#20C8A7] flex items-center justify-center text-xs font-bold mb-1">
              {node.id[0]}
            </div>
            <span className="text-xs font-semibold text-[#071842] block truncate">
              {node.label}
            </span>
          </div>
        ))}
      </div>

      {/* Stepped Event List / Arrow Trace */}
      <div className="space-y-3 pt-2">
        {trace.length === 0 ? (
          <div className="text-center py-8 text-xs font-mono text-[#64748B] bg-slate-50 border border-dashed border-slate-200 rounded-xl">
            Awaiting session execution... Initialize keys to view Figure 2 protocol sequence exchange.
          </div>
        ) : (
          trace.map((item, idx) => {
            const isReject = item.step.includes('REJECT') || item.description.toLowerCase().includes('reject');
            const isAccept = item.step.includes('ACCEPTED') || item.step.includes('VERIFIED');

            return (
              <div
                key={idx}
                className={`p-3.5 rounded-xl border text-xs font-mono transition-all flex items-start space-x-3 ${
                  isReject
                    ? 'bg-rose-50/70 border-rose-200 text-rose-900'
                    : isAccept
                    ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                    : 'bg-white border-[#E2E8F0] text-[#071842]'
                }`}
              >
                <div className="mt-0.5">
                  {isReject ? (
                    <XCircle className="w-4 h-4 text-rose-600" />
                  ) : isAccept ? (
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <span className="w-5 h-5 rounded-full bg-[#071842] text-white flex items-center justify-center text-[10px] font-bold">
                      {idx + 1}
                    </span>
                  )}
                </div>

                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold tracking-wider uppercase text-[11px]">
                      {item.step}
                    </span>
                    <span className="text-[10px] text-[#64748B]">
                      {new Date(item.timestamp * 1000).toISOString().substr(11, 8)}
                    </span>
                  </div>
                  <p className="text-[#475569] font-sans text-xs">
                    {item.description}
                  </p>
                  {item.data && Object.keys(item.data).length > 0 && (
                    <div className="text-[10px] text-[#64748B] bg-white/80 p-1.5 rounded border border-[#E2E8F0] inline-block mt-1">
                      {Object.entries(item.data)
                        .map(([k, v]) => `${k}: ${typeof v === 'number' ? v.toFixed(2) : v}`)
                        .join(' | ')}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
