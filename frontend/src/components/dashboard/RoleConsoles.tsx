import React, { useState } from 'react';
import { SessionState } from '@/types/phase2';
import {
  ShieldCheck,
  Send,
  Key,
  FileCheck,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Sparkles,
  AlertTriangle,
  RotateCcw,
  Zap,
  Lock,
} from 'lucide-react';
import SimulatedBadge from '../common/SimulatedBadge';
import ResetButton from '../common/ResetButton';

interface RoleConsolesProps {
  session: SessionState | null;
  loading: boolean;
  onKeygen: () => Promise<void>;
  onSign: (message: string, largeDocKb?: number) => Promise<void>;
  onVerifyBob: () => Promise<void>;
  onTransferCharlie: () => Promise<void>;
  onVerifyCharlie: () => Promise<void>;
}

const DEFAULT_MESSAGE = 'Certified Quantum Sovereign Bond Issuance #9042: 100,000,000 USD';

export default function RoleConsoles({
  session,
  loading,
  onKeygen,
  onSign,
  onVerifyBob,
  onTransferCharlie,
  onVerifyCharlie,
}: RoleConsolesProps) {
  const [activeRole, setActiveRole] = useState<'all' | 'alice' | 'bob' | 'charlie'>('all');
  const [messageText, setMessageText] = useState<string>(DEFAULT_MESSAGE);
  const [largeDocKb, setLargeDocKb] = useState<number | undefined>(undefined);

  const km = session?.key_material;
  const sig = session?.signature;
  const bob = session?.bob_verification;
  const charlie = session?.charlie_verification;

  return (
    <div className="space-y-6">
      {/* Role Selector Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-[#CBD5E1] rounded-2xl p-4 sm:p-6 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-mono font-bold text-[#64748B] uppercase tracking-wider">
              FR-G1: THREE-PANE MULTI-PARTY CONSOLE
            </span>
            <SimulatedBadge size="sm" />
          </div>
          <h2 className="font-serif text-2xl text-[#071842] font-semibold">
            Role-Based Presentation Console
          </h2>
        </div>

        {/* Role Filter Tabs */}
        <div className="inline-flex rounded-lg border border-[#CBD5E1] p-1 bg-[#F8FAF9] text-xs font-mono">
          {[
            { id: 'all', label: 'All Parties (3-Pane)' },
            { id: 'alice', label: 'Alice (Signer)' },
            { id: 'bob', label: 'Bob (Verifier)' },
            { id: 'charlie', label: 'Charlie (Arbitrator)' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveRole(tab.id as any)}
              className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${
                activeRole === tab.id
                  ? 'bg-[#071842] text-white shadow-xs'
                  : 'text-[#475569] hover:text-[#071842]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3-Pane Layout */}
      <div
        className={`grid gap-6 ${
          activeRole === 'all'
            ? 'grid-cols-1 lg:grid-cols-3'
            : 'grid-cols-1 max-w-2xl mx-auto'
        }`}
      >
        {/* ── ALICE'S CONSOLE (SIGNER) ── */}
        {(activeRole === 'all' || activeRole === 'alice') && (
          <div className="bg-white border border-[#CBD5E1] rounded-2xl p-6 shadow-xs flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 rounded-lg bg-[#071842] text-[#20C8A7] flex items-center justify-center font-mono text-xs font-bold">
                    A
                  </div>
                  <div>
                    <h3 className="font-serif text-lg font-bold text-[#071842]">
                      Alice (Signer)
                    </h3>
                    <span className="text-[10px] font-mono text-[#64748B] block">
                      Quantum Sender / Transmitter
                    </span>
                  </div>
                </div>
                <SimulatedBadge size="sm" />
              </div>

              {/* Step 1: Keygen Trigger */}
              <div className="space-y-2">
                <label className="text-xs font-mono font-bold text-[#475569] block">
                  1. Quantum Key Material
                </label>
                {km ? (
                  <div className="p-3 rounded-xl bg-[#E6FBF7]/50 border border-[#20C8A7]/40 text-xs font-mono space-y-1">
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Raw Key Bits:</span>
                      <span className="font-bold text-[#071842]">{km.raw_key_length} bits</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Simulated QBER:</span>
                      <span className="font-bold text-[#071842]">{(km.quantum_bit_error_rate * 100).toFixed(2)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Channel Loss:</span>
                      <span className="font-bold text-[#071842]">{km.channel_loss_db} dB ({km.distance_km} km)</span>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={onKeygen}
                    disabled={loading}
                    className="w-full py-2.5 px-4 rounded-lg bg-[#071842] hover:bg-[#0c2464] text-white text-xs font-mono font-semibold transition-all shadow-xs flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
                  >
                    <Key className="w-3.5 h-3.5 text-[#20C8A7]" />
                    <span>Generate Quantum Keys</span>
                  </button>
                )}
              </div>

              {/* Step 2: Message Input & Large Document Demo */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono font-bold text-[#475569]">
                    2. Document / Message to Sign
                  </label>
                  {(messageText !== DEFAULT_MESSAGE || largeDocKb !== undefined) && (
                    <ResetButton
                      size="xs"
                      variant="ghost"
                      label="Reset Text"
                      onReset={() => {
                        setMessageText(DEFAULT_MESSAGE);
                        setLargeDocKb(undefined);
                      }}
                      title="Reset document text to default"
                    />
                  )}
                </div>
                <textarea
                  rows={3}
                  value={messageText}
                  onChange={(e) => {
                    setMessageText(e.target.value);
                    setLargeDocKb(undefined);
                  }}
                  className="w-full text-xs font-mono p-3 rounded-lg border border-[#CBD5E1] bg-[#F8FAF9] focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#20C8A7]"
                />

                {/* OTUH-QDS Large Document Button (FR-C2) */}
                {session?.protocol_id === 'otuh_qds' && (
                  <div className="pt-1 flex items-center justify-between">
                    <span className="text-[10px] font-mono text-[#64748B]">
                      Simulate Large Document (FR-C2):
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setMessageText('[SIMULATED 10 MB DEFENSE MANIFEST]');
                        setLargeDocKb(10240);
                      }}
                      className="text-[10px] font-mono px-2 py-1 rounded bg-[#E6FBF7] text-[#071842] border border-[#20C8A7] hover:bg-[#d0f6ee] font-semibold"
                    >
                      Load 10 MB Document
                    </button>
                  </div>
                )}
              </div>

              {/* Step 3: Sign Action */}
              <div>
                <button
                  onClick={() => onSign(messageText, largeDocKb)}
                  disabled={loading}
                  className="w-full py-2.5 px-4 rounded-lg bg-[#071842] hover:bg-[#0c2464] text-white text-xs font-mono font-semibold transition-all shadow-md flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
                >
                  <FileCheck className="w-3.5 h-3.5 text-[#20C8A7]" />
                  <span>Alice: Sign Message (FR-C1)</span>
                </button>
              </div>

              {/* Signature Output Card */}
              {sig && (
                <div className="p-3.5 rounded-xl bg-slate-50 border border-[#E2E8F0] text-xs font-mono space-y-1.5">
                  <div className="flex justify-between items-center text-[11px] text-[#64748B] border-b border-[#E2E8F0] pb-1">
                    <span>SIGNATURE GENERATED</span>
                    <span className="font-bold text-[#071842]">{sig.signing_latency_ms} ms</span>
                  </div>
                  <div className="truncate text-[#071842]">
                    <span className="text-[#64748B]">Digest:</span> {sig.message_digest.slice(0, 16)}...
                  </div>
                  <div className="text-[#071842]">
                    <span className="text-[#64748B]">Key Consumed:</span> {sig.key_consumed_bits} bits
                  </div>
                  {sig.key_to_message_ratio && (
                    <div className="text-emerald-700 font-bold">
                      <span>Efficiency Ratio:</span> {sig.key_to_message_ratio} (Gain: {sig.algorithm_details?.efficiency_multiplier || '10^8x'})
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="text-[11px] font-mono text-[#64748B] border-t border-[#E2E8F0] pt-3 flex items-center space-x-1.5">
              <Lock className="w-3.5 h-3.5 text-[#20C8A7]" />
              <span>Signer Key: alice-authorized-01</span>
            </div>
          </div>
        )}

        {/* ── BOB'S CONSOLE (VERIFIER 1) ── */}
        {(activeRole === 'all' || activeRole === 'bob') && (
          <div className="bg-white border border-[#CBD5E1] rounded-2xl p-6 shadow-xs flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 rounded-lg bg-[#263EDC] text-white flex items-center justify-center font-mono text-xs font-bold">
                    B
                  </div>
                  <div>
                    <h3 className="font-serif text-lg font-bold text-[#071842]">
                      Bob (Verifier 1)
                    </h3>
                    <span className="text-[10px] font-mono text-[#64748B] block">
                      Primary Verification Recipient
                    </span>
                  </div>
                </div>
                <SimulatedBadge size="sm" />
              </div>

              {/* Status of received signature */}
              <div className="space-y-2">
                <label className="text-xs font-mono font-bold text-[#475569] block">
                  Received Signature Payload
                </label>
                <div className="p-3 rounded-xl bg-slate-50 border border-[#E2E8F0] text-xs font-mono text-[#64748B]">
                  {sig ? (
                    <div className="space-y-1 text-[#071842]">
                      <div className="flex items-center text-emerald-700 space-x-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Ready for Verification</span>
                      </div>
                      <div className="truncate text-[11px] text-[#64748B]">
                        Tokens: {sig.signature_tokens[0] || 'Present'}
                      </div>
                    </div>
                  ) : (
                    <span>Awaiting Alice signature dispatch...</span>
                  )}
                </div>
              </div>

              {/* Verify Trigger */}
              <div>
                <button
                  onClick={onVerifyBob}
                  disabled={loading || !sig}
                  className="w-full py-2.5 px-4 rounded-lg bg-[#263EDC] hover:bg-[#1f32b5] text-white text-xs font-mono font-semibold transition-all shadow-md flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Bob: Verify Signature (FR-D1)</span>
                </button>
              </div>

              {/* Bob Verification Output */}
              {bob && (
                <div
                  className={`p-4 rounded-xl border text-xs font-mono space-y-2 ${
                    bob.is_valid
                      ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950'
                      : 'bg-rose-50/70 border-rose-300 text-rose-950'
                  }`}
                >
                  <div className="flex justify-between items-center border-b border-black/10 pb-1.5">
                    <span className="font-bold">VERDICT: {bob.verdict}</span>
                    <span>{bob.verification_latency_ms} ms</span>
                  </div>
                  <div className="space-y-0.5 text-[11px]">
                    <div>QBER / Disagreement: {(bob.disagreement_rate * 100).toFixed(2)}%</div>
                    <div>Threshold Cutoff: {(bob.security_threshold * 100).toFixed(2)}%</div>
                    {bob.untrusted_node_status && (
                      <div className="text-amber-800 font-bold">Relay Node: {bob.untrusted_node_status}</div>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-700 font-sans italic border-t border-black/10 pt-1">
                    {bob.reasoning_trace[0] || 'Hoeffding concentration evaluated.'}
                  </p>
                </div>
              )}

              {/* Forward to Charlie Action (FR-D2 Transferability) */}
              {bob && bob.is_valid && (
                <div className="pt-2 border-t border-[#E2E8F0]">
                  <button
                    onClick={onTransferCharlie}
                    disabled={loading}
                    className="w-full py-2.5 px-4 rounded-lg bg-white border border-[#20C8A7] text-[#071842] hover:bg-[#E6FBF7] text-xs font-mono font-semibold transition-all shadow-xs flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    <span>Forward to Charlie (FR-D2 Transfer)</span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#20C8A7]" />
                  </button>
                </div>
              )}
            </div>

            <div className="text-[11px] font-mono text-[#64748B] border-t border-[#E2E8F0] pt-3">
              Verifier: Bob (Direct Symmetrized Share)
            </div>
          </div>
        )}

        {/* ── CHARLIE'S CONSOLE (ARBITRATOR / VERIFIER 2) ── */}
        {(activeRole === 'all' || activeRole === 'charlie') && (
          <div className="bg-white border border-[#CBD5E1] rounded-2xl p-6 shadow-xs flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 rounded-lg bg-purple-900 text-white flex items-center justify-center font-mono text-xs font-bold">
                    C
                  </div>
                  <div>
                    <h3 className="font-serif text-lg font-bold text-[#071842]">
                      Charlie (Arbitrator)
                    </h3>
                    <span className="text-[10px] font-mono text-[#64748B] block">
                      Third-Party Transferability Auditor
                    </span>
                  </div>
                </div>
                <SimulatedBadge size="sm" />
              </div>

              {/* Transferability Status */}
              <div className="space-y-2">
                <label className="text-xs font-mono font-bold text-[#475569] block">
                  Forwarded Signature Status
                </label>
                <div className="p-3 rounded-xl bg-slate-50 border border-[#E2E8F0] text-xs font-mono text-[#64748B]">
                  {session?.transfer_status ? (
                    <div className="flex items-center space-x-1 text-purple-900 font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5 text-purple-700" />
                      <span>{session.transfer_status}</span>
                    </div>
                  ) : bob?.is_valid ? (
                    <span>Signature ready to receive from Bob...</span>
                  ) : (
                    <span>Awaiting Bob verification before forward...</span>
                  )}
                </div>
              </div>

              {/* Charlie Independent Verify */}
              <div>
                <button
                  onClick={onVerifyCharlie}
                  disabled={loading || !sig}
                  className="w-full py-2.5 px-4 rounded-lg bg-purple-900 hover:bg-purple-950 text-white text-xs font-mono font-semibold transition-all shadow-md flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-[#20C8A7]" />
                  <span>Charlie: Independent Verify (FR-D2)</span>
                </button>
              </div>

              {/* Charlie Verification Output */}
              {charlie && (
                <div
                  className={`p-4 rounded-xl border text-xs font-mono space-y-2 ${
                    charlie.is_valid
                      ? 'bg-purple-50/70 border-purple-300 text-purple-950'
                      : 'bg-rose-50/70 border-rose-300 text-rose-950'
                  }`}
                >
                  <div className="flex justify-between items-center border-b border-black/10 pb-1.5">
                    <span className="font-bold">VERDICT: {charlie.verdict}</span>
                    <span>{charlie.verification_latency_ms} ms</span>
                  </div>
                  <div className="space-y-0.5 text-[11px]">
                    <div>Transferability: {charlie.is_valid ? 'CONFIRMED' : 'REJECTED'}</div>
                    <div>Reason Code: {charlie.reason_code}</div>
                  </div>
                  <p className="text-[11px] text-slate-700 font-sans italic border-t border-black/10 pt-1">
                    {charlie.reasoning_trace[0] || 'Arbitration shares verified.'}
                  </p>
                </div>
              )}
            </div>

            <div className="text-[11px] font-mono text-[#64748B] border-t border-[#E2E8F0] pt-3">
              Arbitrator: Charlie (Independent Share Verification)
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
