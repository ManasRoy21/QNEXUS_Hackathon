'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowDownToLine, ArrowRight, FlaskConical, Loader2, Play, RotateCcw, X } from 'lucide-react';
import { downloadFile } from '@/services/imageLab';

type Point = { value: number; trials: number; rejected: number; passed: number; inconclusive: number; rejection_rate: number; rejection_rate_interval_95: number[]; false_alarm_count: number | null; missed_attack_count: number | null; mean_qber: number | null; expected_qber: number | null };
type Job = { id: string; label?: string; status: string; cancel_requested: boolean; completed: number; total: number; error: string | null; result: { evidence_sha256: string; points: Point[] } | null; request: { label: string; base: { measurement_backend: string } } };
type Trial = { simulation_id: string; parameter_value: number; repeat: number; seed: number; decision: string; transcript_sha256: string; verifiers: { verifier: string; tested: number; test_qber: number | null; remaining_error_upper_bound: number | null; decision: string }[] };
const API = (process.env.NEXT_PUBLIC_API_URL || '/api/v1').replace(/\/$/, '');
const terminal = new Set(['completed', 'failed', 'cancelled', 'interrupted']);
const pct = (v: number | null) => v === null ? 'No data' : `${(v * 100).toFixed(2)}%`;
async function api<T>(path: string, payload?: unknown, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${API}${path}`, { method: payload === undefined ? 'GET' : 'POST', headers: payload === undefined ? undefined : { 'Content-Type': 'application/json' }, body: payload === undefined ? undefined : JSON.stringify(payload), signal });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(typeof data.detail === 'string' ? data.detail : `API error ${response.status}. Check the parameters or start the backend.`);
  }
  return response.json();
}

export default function ExperimentsPage() {
  const [job, setJob] = useState<Job | null>(null);
  const [history, setHistory] = useState<Job[]>([]);
  const [trials, setTrials] = useState<Trial[]>([]);
  const [backend, setBackend] = useState('qiskit_aer');
  const [pulses, setPulses] = useState(8192);
  const [repeats, setRepeats] = useState(4);
  const [distance, setDistance] = useState(10);
  const [seed, setSeed] = useState(42);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [selectedRun, setSelectedRun] = useState<Record<string, any> | null>(null);
  const pollController = useRef<AbortController | null>(null);
  const active = job && !terminal.has(job.status);
  const jobId = job?.id;
  async function refreshHistory() {
    const data = await api<{ experiments: Job[] }>('/experiments?limit=15');
    setHistory(data.experiments);
  }
  useEffect(() => { refreshHistory().catch(() => setError('Cannot reach the API. Start the backend to run or load saved studies.')); }, []);
  useEffect(() => {
    if (!jobId) return;
    const controller = new AbortController();
    pollController.current = controller;
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try {
        const updated = await api<Job>(`/experiments/${jobId}`, undefined, controller.signal);
        if (controller.signal.aborted) return;
        setJob(updated);
        if (terminal.has(updated.status)) {
          const exported = await api<{ trials: Trial[] }>(`/experiments/${updated.id}/export`, undefined, controller.signal);
          if (!controller.signal.aborted) { setTrials(exported.trials); await refreshHistory(); }
        } else timer = setTimeout(poll, 900);
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(err instanceof Error ? err.message : 'Progress unavailable; reconnecting to the saved job.');
          timer = setTimeout(poll, 2500);
        }
      }
    }
    poll();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [jobId]);

  async function command(task: () => Promise<void>) {
    setBusy(true); setError('');
    try { await task(); } catch (err) { setError(err instanceof Error ? err.message : 'Request failed'); }
    finally { setBusy(false); }
  }
  async function selectJob(item: Job) {
    await command(async () => {
      const current = await api<Job>(`/experiments/${item.id}`);
      const exported = await api<{trials: Trial[]}>(`/experiments/${item.id}/export`);
      setJob(current); setTrials(exported.trials); setSelectedRun(null);
    });
  }
  async function start() {
    await command(async () => {
      const created = await api<Job>('/experiments', { label: 'Intercept-resend detection study', parameter: 'interception_fraction', values: [0, .05, .15, .4, 1], repeats,
        base: { measurement_backend: backend, pulse_count: pulses, distance_km: distance, seed, baseline_qber: .01, authentication_threshold: .1, verification_threshold: .15, beta: .3 } });
      setJob(created); setTrials([]); setSelectedRun(null); await refreshHistory();
    });
  }
  async function exportFile(format: 'json' | 'csv') {
    if (!job) return;
    await command(async () => {
      const response = await fetch(`${API}/experiments/${job.id}/export${format === 'csv' ? '.csv' : ''}`);
      if (!response.ok) throw new Error('Export failed.');
      downloadFile(`${job.id}.${format}`, format === 'csv' ? await response.text() : JSON.stringify(await response.json(), null, 2), format === 'csv' ? 'text/csv' : 'application/json');
    });
  }
  const button = 'inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-xs border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed';
  return <div className="space-y-7 text-[#243047]">
    <section className="max-w-3xl pt-3"><span className="font-mono text-[10px] tracking-widest text-[#8b79ac]">BACKEND EXPERIMENT ENGINE / V2</span><h1 className="text-4xl sm:text-6xl mt-5 mb-5 leading-tight">Put the protocol<br /><em>under pressure.</em></h1><p className="text-sm text-slate-500 leading-7">Run repeated attacks against the actual distribution engine. Measure false alarms, missed attacks, and inconclusive trials. Every trial has a saved run, circuit backend, seed, and transcript fingerprint.</p></section>
    <section className="bg-white border border-slate-200 rounded-xl p-5 sm:p-7 space-y-5">
      <div className="flex justify-between items-center gap-4"><h2 className="text-2xl flex gap-3 items-center"><FlaskConical size={22} className="text-[#a28dbb]" /> Configure a study</h2><Link href="/workflow" className="text-[11px] text-[#907cac]">Protocol workflow <ArrowRight size={13} className="inline" /></Link></div>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 text-xs">
        <label>Measurement backend<select className="w-full border rounded p-2.5 mt-2 bg-white" value={backend} disabled={!!active || busy} onChange={e => setBackend(e.target.value)}><option value="qiskit_aer">Qiskit Aer circuits</option><option value="numpy">NumPy approximation</option></select></label>
        <label>Pulses per trial<select className="w-full border rounded p-2.5 mt-2 bg-white" disabled={!!active || busy} value={pulses} onChange={e => setPulses(Number(e.target.value))}>{[2048,8192,16384,32768].map(n => <option key={n} value={n}>{n.toLocaleString()}</option>)}</select></label>
        <label>Independent repeats<select className="w-full border rounded p-2.5 mt-2 bg-white" disabled={!!active || busy} value={repeats} onChange={e => setRepeats(Number(e.target.value))}>{[2,4,8].map(n => <option key={n}>{n}</option>)}</select></label>
        <label>Distance (km)<input className="w-full border rounded p-2.5 mt-2" disabled={!!active || busy} type="number" min="0" max="500" value={distance} onChange={e => setDistance(Math.max(0,Math.min(500,Number(e.target.value))))} /></label>
        <label>Reproducible seed<input className="w-full border rounded p-2.5 mt-2" disabled={!!active || busy} type="number" min="0" max="2147483647" value={seed} onChange={e => setSeed(Math.max(0,Math.min(2147483647,Math.trunc(Number(e.target.value)))))} /></label>
      </div>
      <p className="text-[11px] text-slate-500">Intercepted fractions: 0%, 5%, 15%, 40%, 100%. Each point runs {repeats} trials. Baseline noise 1%; test split 30%; Bob policy 10%, Charlie policy 15%. The backend enforces a 2-million-pulse workload limit.</p>
      <div className="flex flex-wrap gap-3"><button className={`${button} bg-[#202b42] text-white hover:!bg-[#303d59]`} disabled={!!active || busy} onClick={start}>{busy ? <Loader2 size={15} className="animate-spin" /> : <Play size={14} />} Start repeated-trial study</button>{active && <button className={button} disabled={busy || job.cancel_requested} onClick={() => command(async () => setJob(await api<Job>(`/experiments/${job.id}/cancel`, {})))}><X size={14} /> Cancel after current trial</button>}</div>
    </section>
    {error && <p role="alert" className="bg-rose-50 border border-rose-200 text-rose-700 rounded-lg p-4 text-xs">{error}</p>}
    {job && <section className="bg-white border border-slate-200 rounded-xl p-5 sm:p-7 space-y-5" aria-label="Study results">
      <div className="flex justify-between flex-wrap items-center gap-4"><div><span className="uppercase font-mono text-[10px] text-[#907aab]">{job.status}</span><h2 className="text-2xl mt-1">{job.completed} / {job.total} trials recorded</h2><p className="font-mono text-[9px] text-slate-400 mt-1 break-all">{job.id}</p></div><div className="flex flex-wrap gap-2"><button className={button} disabled={busy || !!active} onClick={() => command(async () => { setJob(await api<Job>(`/experiments/${job.id}/replay`, {})); setTrials([]); setSelectedRun(null); })}><RotateCcw size={13} /> Replay</button><button className={button} disabled={busy} onClick={() => exportFile('json')}><ArrowDownToLine size={13} /> JSON</button><button className={button} disabled={busy} onClick={() => exportFile('csv')}>CSV</button></div></div>
      <div className="bg-slate-100 h-2 rounded overflow-hidden"><div className="bg-[#a696c4] h-full transition-all" style={{width:`${job.completed / job.total * 100}%`}} /></div>
      {job.error && <p className="text-xs text-rose-600">{job.error}</p>}
      {job.result && <><div className="grid sm:grid-cols-2 gap-6"><div><h3 className="font-sans text-sm font-semibold mb-5">Observed channel errors</h3>{job.result.points.map(p => <div key={p.value} className="mb-4 text-xs"><div className="flex justify-between mb-1.5"><span>{pct(p.value)} intercepted</span><strong>{pct(p.mean_qber)}</strong></div><div className="bg-slate-100 h-3 relative rounded"><span className="block h-full bg-[#a794c1] rounded" style={{width:`${Math.min(100,(p.mean_qber || 0)*200)}%`}} /><i className="absolute top-[-3px] w-[2px] h-[18px] bg-[#5a9b86]" title={`Expected ${pct(p.expected_qber)}`} style={{left:`${Math.min(100,(p.expected_qber || 0)*200)}%`}} /></div></div>)}<p className="text-[10px] text-slate-400">Purple: measured QBER. Green marker: analytic expectation. Scale 0–50%.</p></div><div><h3 className="font-sans text-sm font-semibold mb-5">Decisions across repeated trials</h3>{job.result.points.map(p => <div key={p.value} className="mb-4"><div className="flex justify-between text-xs mb-1.5"><span>{pct(p.value)} intercepted</span><span>{p.rejected} reject / {p.passed} pass / {p.inconclusive} inconclusive</span></div><div className="h-3 flex bg-slate-100 rounded overflow-hidden"><span className="bg-[#cf9282]" style={{width:`${p.rejected/p.trials*100}%`}} /><span className="bg-[#8ab3a0]" style={{width:`${p.passed/p.trials*100}%`}} /><span className="bg-[#d1c9df]" style={{width:`${p.inconclusive/p.trials*100}%`}} /></div></div>)}<p className="text-[10px] text-slate-400">A weak attack may pass. Honest noise may reject. A small test sample may remain inconclusive.</p></div></div>
        <div className="overflow-x-auto"><table className="w-full text-xs text-left"><thead className="bg-slate-50 text-slate-500"><tr>{['Intercepted','Rejection rate','95% rate interval','False alarms','Missed attacks','Inconclusive'].map(h => <th className="p-3 whitespace-nowrap font-medium" key={h}>{h}</th>)}</tr></thead><tbody>{job.result.points.map(p => <tr className="border-b border-slate-100" key={p.value}><td className="p-3">{pct(p.value)}</td><td className="p-3">{pct(p.rejection_rate)}</td><td className="p-3 whitespace-nowrap">{pct(p.rejection_rate_interval_95[0])}–{pct(p.rejection_rate_interval_95[1])}</td><td className="p-3">{p.false_alarm_count ?? '—'}</td><td className="p-3">{p.missed_attack_count ?? '—'}</td><td className="p-3">{p.inconclusive}</td></tr>)}</tbody></table></div><p className="font-mono text-[9px] text-slate-400 break-all">Replayable evidence SHA-256: {job.result.evidence_sha256}</p></>}
      {trials.length > 0 && <details><summary className="text-xs text-[#8e79aa] cursor-pointer">Inspect individual trials and persisted circuit runs</summary><div className="overflow-x-auto mt-4"><table className="w-full text-[10px] text-left"><thead><tr>{['Intercepted','Repeat','Seed','Decision','Evidence'].map(h => <th className="p-2" key={h}>{h}</th>)}</tr></thead><tbody>{trials.map(t => <tr className="border-t border-slate-100" key={t.simulation_id}><td className="p-2">{pct(t.parameter_value)}</td><td className="p-2">{t.repeat + 1}</td><td className="p-2 font-mono">{t.seed}</td><td className="p-2">{t.decision}</td><td className="p-2"><button className="text-[#8e79aa]" onClick={() => command(async () => setSelectedRun(await api<Record<string,any>>(`/runs/${t.simulation_id}`)))}>Inspect run ↗</button></td></tr>)}</tbody></table></div></details>}
      {selectedRun && <div className="bg-[#18243b] rounded-lg p-5 text-slate-300 text-xs"><div className="flex justify-between"><strong className="font-normal">Saved measurement evidence · {selectedRun.seed}</strong><button aria-label="Close run details" onClick={() => setSelectedRun(null)}><X size={14} /></button></div><pre className="overflow-auto text-[10px] mt-4 leading-5 max-h-96">{JSON.stringify({execution:selectedRun.execution,parameter_estimation:selectedRun.parameter_estimation},null,2)}</pre></div>}
    </section>}
    <section className="grid md:grid-cols-2 gap-6"><div className="border border-slate-200 bg-white rounded-xl p-6"><h2 className="text-2xl mb-4">Saved studies</h2>{history.length ? <ul className="space-y-3">{history.map(item => <li key={item.id}><button className="w-full text-left flex justify-between items-center border-b border-slate-100 pb-3 text-xs gap-5" disabled={busy} onClick={() => selectJob(item)}><span><strong className="font-medium block">{item.request.label}</strong><span className="text-[9px] text-slate-400 font-mono">{item.id.slice(0,20)}… · {item.request.base.measurement_backend}</span></span><span className="text-[#8d7ca9]">{item.status}</span></button></li>)}</ul> : <p className="text-xs text-slate-400">Studies and per-trial progress are saved in SQLite and survive API restarts.</p>}</div><div className="p-6 text-xs text-slate-500 leading-7"><h2 className="text-2xl text-slate-700 mb-4">What the backend is checking</h2><p>Prepare four quantum states → execute noisy/intercepted measurements → apply optical loss and detector events → sift matching bases → select a random test subset → estimate retained errors with a Serfling bound.</p><p className="mt-3">A failed mismatch policy can be caused by interception or ordinary noise. “Inconclusive” is reported when available data cannot support the policy. This is a channel-distribution study, not a complete QDS forgery or non-repudiation proof.</p><p className="mt-3">Same seeds replay on the tested versions. Each sweep value shares preparation/loss seeds with its paired repeat. The evidence fingerprint omits UUIDs, timestamps, and timings.</p></div></section>
  </div>;
}
