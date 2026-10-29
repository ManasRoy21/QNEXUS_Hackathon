'use client';
import { useEffect, useState } from 'react';
import { CanonicalSimulationState, MessageReceipt, MessageVerification } from '@/types/unifiedSimulation';
import { qdsClient } from '@/services/qdsClient';
import { downloadFile } from '@/services/imageLab';
import { ArrowDownToLine, Fingerprint, Loader2, ShieldCheck } from 'lucide-react';

interface Props {
  simulationState: CanonicalSimulationState | null;
  signingDone?: boolean;
  onSigningComplete?: () => void;
  onNext: () => void;
  onBack: () => void;
}
export default function Step03Signing({ simulationState, onSigningComplete, onNext, onBack }: Props) {
  const [message, setMessage] = useState(simulationState?.signing?.message || 'QDS research evidence');
  const [digest, setDigest] = useState('');
  const [receipt, setReceipt] = useState<MessageReceipt | null>(null);
  const [result, setResult] = useState<MessageVerification | null>(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    crypto.subtle.digest('SHA-256', new TextEncoder().encode(message)).then(bytes => {
      if (active) setDigest(Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2,'0')).join(''));
    }).catch(() => { if (active) setDigest('Preview unavailable; the backend calculates the authoritative digest.'); });
    return () => { active = false; };
  }, [message]);
  async function sign() {
    if (!simulationState) return;
    setBusy('Signing on backend…'); setError('');
    try { setReceipt(await qdsClient.signRunMessage(simulationState.simulation_id, message)); setResult(null); }
    catch (err: any) { setError(err?.response?.data?.detail || err.message || 'Signing failed.'); }
    finally { setBusy(''); }
  }
  async function verify() {
    if (!receipt) return;
    setBusy('Checking receipt, message and saved run…'); setError('');
    try {
      const response = await qdsClient.verifyRunMessage(message, receipt);
      setResult(response);
      if (response.verdict === 'VERIFIED') onSigningComplete?.();
    } catch (err: any) { setError(err?.response?.data?.detail || err.message || 'Verification failed.'); }
    finally { setBusy(''); }
  }
  const button = 'inline-flex items-center justify-center gap-2 border border-slate-200 rounded-lg px-4 py-3 text-xs disabled:opacity-40 disabled:cursor-not-allowed';
  return <div className="space-y-6">
    <div className="border-b border-slate-200 pb-4"><span className="font-mono text-[10px] text-slate-400">STEP 03 OF 06</span><h2 className="text-3xl mt-2">Bind a message to the experiment.</h2><p className="text-xs text-slate-500 mt-3 leading-6 max-w-3xl">The Python backend signs the message fingerprint, saved measurement transcript and configuration with Ed25519. Verification checks all three and evaluates Bob and Charlie’s recorded sampling policies. This is a classical evidence receipt, not a quantum signature or non-repudiation proof.</p></div>
    <div className="grid md:grid-cols-2 gap-6">
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <h3 className="font-sans text-sm font-semibold flex items-center gap-2"><Fingerprint size={18} className="text-[#9d87b6]" /> Alice · message evidence</h3>
        <label className="block text-xs text-slate-500">Message to sign or verify<textarea aria-label="Message to sign or verify" rows={4} maxLength={4096} value={message} disabled={!!busy} onChange={e => { setMessage(e.target.value); setResult(null); }} className="w-full mt-2 p-3 border border-slate-200 rounded-lg text-xs text-slate-700 leading-6" /></label>
        <div className="bg-slate-50 rounded-lg p-3"><span className="block text-[9px] tracking-wide text-slate-400">CURRENT MESSAGE · SHA-256 PREVIEW</span><code className="break-all text-[10px] text-slate-600">{digest}</code></div>
        <div className="text-[10px] text-slate-500 leading-6"><p>Saved run: <code>{simulationState?.simulation_id || 'No run'}</code></p><p>Backend: {simulationState?.execution?.backend || 'Unknown'}</p><p>Retained material: Bob {simulationState?.material.untested_bits.M_u_bob ?? '—'} / Charlie {simulationState?.material.untested_bits.M_u_charlie ?? '—'} bits. These are experiment registers; they are not the Ed25519 signing key.</p></div>
        <button className={`${button} w-full bg-[#202b42] text-white`} disabled={!!busy || !simulationState || !message.length} onClick={sign}>{busy ? <Loader2 className="animate-spin" size={14} /> : <Fingerprint size={15} />}{receipt ? 'Sign current message on backend' : 'Create signed evidence receipt'}</button>
        {receipt && <div className="space-y-2"><p className="text-[10px] text-slate-500">Signed message fingerprint</p><code className="block text-[10px] text-[#8b78a9] break-all">{receipt.manifest.message_sha256}</code><p className="text-[10px] text-slate-400">Issuer {receipt.manifest.key_id} · {receipt.algorithm}</p><button className={`${button} w-full`} onClick={() => downloadFile('message-evidence.json',JSON.stringify({receipt,verification:result},null,2))}><ArrowDownToLine size={14} /> Download signed receipt</button></div>}
      </div>
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <h3 className="font-sans text-sm font-semibold flex items-center gap-2"><ShieldCheck size={18} className="text-[#89aa9c]" /> Bob + Charlie · backend checks</h3>
        {result ? <><div role="status" className={`p-4 rounded-lg text-xs ${result.verdict === 'VERIFIED' ? 'bg-emerald-50 text-emerald-800' : result.verdict === 'INCONCLUSIVE' ? 'bg-amber-50 text-amber-800' : 'bg-rose-50 text-rose-800'}`}><strong>{result.verdict.replace(/_/g,' ')}</strong><p className="mt-2 leading-6">Receipt signature: {result.signature_valid ? 'valid' : 'invalid'}. Message: {result.message_matches ? 'matches' : 'changed or untrusted'}. Saved measurement evidence: {result.evidence_matches ? 'matches' : 'does not match or is untrusted'}.</p></div>{result.verifiers.map(v => <div className="p-4 border border-slate-200 rounded-lg text-xs" key={v.verifier}><div className="flex justify-between"><strong className="capitalize">{v.verifier}</strong><span>{v.status}</span></div><p className="text-slate-500 text-[10px] mt-2">Sampling: {v.sampling_decision}. Retained error upper bound: {v.remaining_error_upper_bound === null ? 'No data' : `${(v.remaining_error_upper_bound*100).toFixed(2)}%`}.</p></div>)}</> : <div className="p-6 bg-slate-50 rounded-lg text-xs text-slate-500 leading-7">Create a receipt, then verify. After signing, edit one character and verify again without re-signing: the backend should report MESSAGE CHANGED. If channel evidence is too weak, it reports INCONCLUSIVE even when the message and signature match.</div>}
        <button className={`${button} w-full bg-[#ece8f4] text-[#74618f]`} disabled={!!busy || !receipt || !message.length} onClick={verify}><ShieldCheck size={15} /> Verify with the Python backend</button>
        <p className="text-[10px] text-slate-400 leading-6">These are two policy views of stored simulation data on one server. Threshold ordering alone does not prove transferability. Default issuer keys last one API process; configure a private signing seed for stable receipts across restarts.</p>
      </div>
    </div>
    {busy && <p role="status" className="text-xs text-[#8d7ca6]">{busy}</p>}
    {error && <p role="alert" className="p-4 bg-rose-50 text-rose-700 text-xs rounded-lg">{typeof error === 'string' ? error : 'Request rejected. Check the message and backend connection.'}</p>}
    <div className="flex justify-between gap-3 pt-3 border-t border-slate-200"><button className={button} onClick={onBack}>← Back to material</button><button className={`${button} bg-[#202b42] text-white`} onClick={onNext}>Explore attacks →</button></div>
  </div>;
}
