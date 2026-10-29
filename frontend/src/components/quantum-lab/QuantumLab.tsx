'use client';
import { useEffect, useState } from 'react';
import { ArrowDownToLine, ArrowRight, Atom, Check, ChevronDown, Cpu, Fingerprint, KeyRound, Loader2, Lock, Play, Radio, RefreshCw, ShieldCheck, ShieldX } from 'lucide-react';
import { BellConfig, BellResult, ExchangeConfig, ExchangeResult, HardwareJob, HardwareStatus, quantumLab } from '@/services/quantumLab';
import { downloadFile } from '@/services/imageLab';
import styles from './quantum.module.css';
import BellEvidence from './BellEvidence';
import Link from 'next/link';

const pct = (n: number) => `${(n*100).toFixed(2)}%`;
const DEFAULT: ExchangeConfig = { pulses: 4096, seed: 42, noise: 0, interception: 0, message: 'Pay ₹10,000 to Rahul. Reference QN-204.' };
const BELL: BellConfig = { shots: 4096, seed: 42, noise: 0, interception: 0, state: 'bell' };

export default function QuantumLab() {
  const [tab, setTab] = useState<'key' | 'bell' | 'hardware'>('key');
  const [config, setConfig] = useState<ExchangeConfig>(DEFAULT);
  const [bellConfig, setBellConfig] = useState<BellConfig>(BELL);
  const [exchange, setExchange] = useState<ExchangeResult | null>(null);
  const [bell, setBell] = useState<BellResult | null>(null);
  const [hardware, setHardware] = useState<HardwareStatus | null>(null);
  const [job, setJob] = useState<HardwareJob | null>(null);
  const [jobId, setJobId] = useState('');
  const [password, setPassword] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const [hardwareShots, setHardwareShots] = useState(1024);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [messageCheck, setMessageCheck] = useState<string | null>(null);
  const disabled = !!busy;
  async function action(label: string, task: () => Promise<void>) {
    setBusy(label); setError('');
    try { await task(); } catch (err) { setError(err instanceof Error ? err.message : 'Request failed.'); }
    finally { setBusy(''); }
  }
  useEffect(() => { quantumLab.hardware().then(setHardware).catch(() => setError('Cannot reach the quantum lab API. Reconnect or check the deployment.')); }, []);
  function editExchange(next: ExchangeConfig) { setConfig(next); setExchange(null); setMessageCheck(null); }
  function editBell(next: BellConfig) { setBellConfig(next); setBell(null); }
  async function runExchange() { await action('Preparing, intercepting, measuring and reconciling…', async () => { setExchange(null); setMessageCheck(null); setExchange(await quantumLab.exchange(config)); }); }
  async function testMessage(tamper: boolean) {
    if (!exchange?.key || !exchange.encryption) return;
    await action('Checking encrypted payment…', async () => {
      let ciphertext = exchange.encryption!.ciphertext;
      if (tamper) { const bytes = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0)); bytes[0] ^= 1; ciphertext = btoa(Array.from(bytes, x => String.fromCharCode(x)).join('')); }
      const checked = await quantumLab.check(exchange.key!.alice_hex, exchange.encryption!.nonce, ciphertext);
      setMessageCheck(checked.authenticated ? `Original authenticated and decrypted: ${checked.plaintext}` : 'Altered ciphertext rejected. AES-GCM authentication failed; no plaintext was released.');
    });
  }
  const scenarios = [{ name: 'Clean channel', noise: 0, interception: 0 }, { name: 'Add noise', noise: .08, interception: 0 }, { name: 'Eve intercepts', noise: 0, interception: 1 }];
  const scenario = tab === 'bell' ? bellConfig : config;

  return <div className={styles.lab}>
    <header className={styles.hero}><div className={styles.eyebrow}><Atom size={16} /> QUANTUM EXPLORER</div><h1>Make the quantum part visible.</h1><p>Establish a demonstration key, inspect entanglement, and connect supported circuits to a physical quantum processor.</p><div className={styles.disclosure}><Radio size={14} /> Key exchange and entanglement run in Qiskit Aer. Hardware results are labelled separately and require IBM Quantum access.</div><Link href="/demo" className={styles.demoLink}>Present the three-step guided demo <ArrowRight size={14} /></Link></header>
    <nav className={styles.tabs} aria-label="Quantum experiments">{[{ id: 'key', name: 'Key exchange', detail: 'From signals to a payment', Icon: KeyRound }, { id: 'bell', name: 'Entanglement', detail: 'Measure the correlations', Icon: Atom }, { id: 'hardware', name: 'Real hardware', detail: 'Submit a physical QPU job', Icon: Cpu }].map(({ id, name, detail, Icon }) => <button key={id} disabled={disabled} aria-pressed={tab === id} onClick={() => { setTab(id as typeof tab); setError(''); }}><Icon size={19} /><span><strong>{name}</strong><small>{detail}</small></span><ArrowRight size={14} /></button>)}</nav>

    {tab !== 'hardware' && <section className={styles.panel}>
      <div className={styles.panelHeading}><div><span className={styles.eyebrow}>01 / PREPARE</span><h2>{tab === 'key' ? 'Alice and Bob need a shared key.' : 'Two qubits. Four measurement settings.'}</h2></div><span className={styles.badge}>SIMULATOR</span></div>
      <div className={styles.scenarios}>{scenarios.map(p => <button key={p.name} disabled={disabled} aria-pressed={scenario.noise === p.noise && scenario.interception === p.interception} onClick={() => tab === 'key' ? editExchange({ ...config, noise: p.noise, interception: p.interception }) : editBell({ ...bellConfig, noise: p.noise, interception: p.interception })}>{p.interception ? <ShieldX size={14} /> : <Radio size={14} />}{p.name}</button>)}</div>
      <div className={styles.controls}>
        {tab === 'key' ? <label>Signals sent<select disabled={disabled} value={config.pulses} onChange={e => editExchange({ ...config, pulses: Number(e.target.value) })}>{[2048,4096,8192].map(n => <option key={n} value={n}>{n.toLocaleString()}</option>)}</select></label> : <><label>State<select disabled={disabled} value={bellConfig.state} onChange={e => editBell({ ...bellConfig, state: e.target.value as BellConfig['state'] })}><option value="bell">Entangled Bell pair</option><option value="product">Independent qubits |00⟩</option></select></label><label>Shots per setting<select disabled={disabled} value={bellConfig.shots} onChange={e => editBell({ ...bellConfig, shots: Number(e.target.value) })}>{[1024,4096,8192].map(n => <option key={n} value={n}>{n.toLocaleString()}</option>)}</select></label></>}
        <label>Seed<input type="number" min="0" max="2147483647" disabled={disabled} value={scenario.seed} onChange={e => { const seed = Math.max(0, Math.min(2147483647, Math.trunc(Number(e.target.value) || 0))); tab === 'key' ? editExchange({ ...config, seed }) : editBell({ ...bellConfig, seed }); }} /></label>
        <label>Noise: {pct(scenario.noise)}<input aria-label="Quantum channel noise" type="range" min="0" max={tab === 'key' ? '.3' : '1'} step=".01" disabled={disabled} value={scenario.noise} onChange={e => tab === 'key' ? editExchange({ ...config, noise: Number(e.target.value) }) : editBell({ ...bellConfig, noise: Number(e.target.value) })} /></label>
        <label>Intercepted: {pct(scenario.interception)}<input aria-label="Quantum intercepted fraction" type="range" min="0" max="1" step=".05" disabled={disabled} value={scenario.interception} onChange={e => tab === 'key' ? editExchange({ ...config, interception: Number(e.target.value) }) : editBell({ ...bellConfig, interception: Number(e.target.value) })} /></label>
      </div>
      {tab === 'key' && <label className={styles.message}>Sample payment message<textarea aria-label="Sample payment message" disabled={disabled} maxLength={512} rows={2} value={config.message} onChange={e => editExchange({ ...config, message: e.target.value })} /><small>Use demonstration text. These keys are reproducible and deliberately displayed.</small></label>}
      <div className={styles.actionRow}><p>{tab === 'key' ? 'Prepare → measure → sift → test → reconcile → shorten → encrypt.' : 'Prepare the pair → choose measurement settings → count outcomes → calculate the Bell witness.'}</p><button className={styles.primary} disabled={disabled || (tab === 'key' && !config.message)} onClick={tab === 'key' ? runExchange : () => action('Measuring Bell correlations…', async () => { setBell(null); setBell(await quantumLab.bell(bellConfig)); })}><Play size={14} />{tab === 'key' ? 'Run key exchange' : 'Run Bell experiment'}</button></div>
    </section>}

    {busy && <div className={styles.loading} role="status"><Loader2 size={16} className={styles.spinner} />{busy}</div>}
    {error && <div className={`${styles.result} ${styles.fail}`} role="alert"><ShieldX size={20} /><p>{error}</p></div>}

    {tab === 'key' && exchange && <>
      <section className={styles.panel}><div className={styles.panelHeading}><div><span className={styles.eyebrow}>02 / INSPECT</span><h2>The measured exchange</h2></div><button className={styles.download} onClick={() => downloadFile('qnexus-key-exchange.json', JSON.stringify(exchange, null, 2))}><ArrowDownToLine size={14} /> Export demo evidence</button></div>
        <div className={styles.metrics}>{[{ label:'Signals sent', value:exchange.transmitted.toLocaleString() }, { label:'Matching settings', value:exchange.sifted.toLocaleString() }, { label:'Sample disclosed', value:exchange.tested.toLocaleString() }, { label:'Sample error rate', value:pct(exchange.qber) }].map(m => <div key={m.label}><span>{m.label}</span><strong>{m.value}</strong></div>)}</div>
        <div className={`${styles.result} ${exchange.key ? styles.pass : styles.neutral}`} role="status"><ShieldCheck size={21} /><div><strong>{exchange.verdict.replace(/_/g, ' ')}</strong><p>{exchange.explanation}</p><p>Sample 95% Wilson interval: {pct(exchange.interval_95[0])}–{pct(exchange.interval_95[1])}. The 11% cutoff is an illustrative policy.</p></div></div>
        <div className={styles.pipeline}><div><span>1 / KEEP MATCHING SETTINGS</span><strong>{exchange.retained.toLocaleString()} retained bits</strong><p>Discard the mismatched settings and the public test sample.</p></div><div><span>2 / RECONCILE</span><strong>{exchange.reconciliation ? `${exchange.reconciliation.corrected_bits} bits corrected` : 'Stopped before reconciliation'}</strong><p>{exchange.reconciliation ? `${exchange.reconciliation.disclosed_bits} parity bits disclosed; ${exchange.reconciliation.matches ? 'the retained strings match' : 'verification failed'}.` : 'A rejected or inconclusive channel produces no demonstration key.'}</p></div><div><span>3 / SHORTEN THE KEY</span><strong>{exchange.key ? '256 demonstration bits' : 'No key released'}</strong><p>{exchange.illustrative_key_budget !== undefined ? `Illustrative budget: ${exchange.illustrative_key_budget} bits. Toeplitz hashing shortens the reconciled string.` : 'The exchange must pass its earlier checks first.'}</p></div></div>
        {exchange.key && <div className={styles.keyGrid}>{[{ name: 'Alice’s demonstration key', key: exchange.key.alice_hex }, { name: 'Bob’s demonstration key', key: exchange.key.bob_hex }].map(k => <div key={k.name}><span><KeyRound size={14} />{k.name}</span><code>{k.key}</code></div>)}</div>}
        <details className={styles.details}><summary>Follow individual signals <ChevronDown size={14} /></summary><p>The first 48 signals are an audit view from the shared simulator. Real parties would not publish retained secret bits or Eve’s private outcomes.</p><div className={styles.tableWrap}><table><thead><tr>{['#','Alice bit','Alice setting','Bob setting','Bob bit','Eve','Keep?'].map(h => <th key={h}>{h}</th>)}</tr></thead><tbody>{exchange.pulse_preview.map(p => <tr key={p.index}><td>{p.index+1}</td><td>{p.alice_bit}</td><td>{p.alice_basis}</td><td>{p.bob_basis}</td><td>{p.bob_bit}</td><td>{p.intercepted ? `${p.eve_basis} → ${p.eve_bit}` : '—'}</td><td>{p.tested ? 'Public sample' : p.sifted ? 'Retained' : 'Discarded'}</td></tr>)}</tbody></table></div></details>
        <details className={styles.details}><summary>Inspect circuits and assumptions <ChevronDown size={14} /></summary><p>{exchange.scope}</p><p>{exchange.budget_note}</p><p>{exchange.circuit_count} circuit groups executed. Eve uses an explicit measurement, reset and conditional resend in intercepted groups.</p><pre>{exchange.circuit_text}</pre></details>
      </section>
      {exchange.encryption && <section className={styles.panel}><div className={styles.panelHeading}><div><span className={styles.eyebrow}>03 / USE THE DEMONSTRATION KEY</span><h2>A payment, encrypted and checked.</h2></div><Lock size={22} /></div><p className={styles.note}>AES-256-GCM performs the encryption and authentication. The key came from the teaching workflow; its reproducibility means this is not secure banking encryption.</p><div className={styles.envelope}><span>CIPHERTEXT / AES-256-GCM</span><code>{exchange.encryption.ciphertext}</code><span>RECOVERED SAMPLE MESSAGE</span><p>{exchange.encryption.plaintext}</p></div><div className={styles.buttonRow}><button className={styles.secondary} disabled={disabled} onClick={() => testMessage(false)}><ShieldCheck size={14} /> Check original ciphertext</button><button className={styles.secondary} disabled={disabled} onClick={() => testMessage(true)}><Fingerprint size={14} /> Alter encrypted payment</button></div>{messageCheck && <p className={styles.checkMessage} role="status">{messageCheck}</p>}</section>}
    </>}

    {tab === 'bell' && bell && <section className={styles.panel}><div className={styles.panelHeading}><div><span className={styles.eyebrow}>02 / MEASURE THE RELATIONSHIP</span><h2>Entanglement evidence</h2></div><button className={styles.download} onClick={() => downloadFile('qnexus-bell-experiment.json', JSON.stringify(bell, null, 2))}><ArrowDownToLine size={14} /> Export evidence</button></div><BellEvidence result={bell} /><details className={styles.details}><summary>Inspect the circuit and prediction <ChevronDown size={14} /></summary><p>Model prediction: S = {bell.expected_s?.toFixed(3)}. Measured results vary with sampling.</p><pre>{bell.circuit_text}</pre></details></section>}

    {tab === 'hardware' && <section className={styles.panel}><div className={styles.panelHeading}><div><span className={styles.eyebrow}>IBM QUANTUM / OWNER ACCESS</span><h2>Execute a Bell experiment on a physical QPU.</h2></div><span className={styles.badge}>{hardware?.available ? 'CONFIGURED' : 'SETUP REQUIRED'}</span></div>
      <p className={styles.note}>{hardware?.explanation || 'Checking hardware configuration…'} {hardware?.scope} Errors and missing credentials never fall back to simulated hardware results.</p>
      <Link href="/demo" className={styles.demoLink}>View the guided demo and completed IBM hardware evidence <ArrowRight size={14} /></Link>
      {!hardware?.available && <div className={styles.setup}><Cpu size={25} /><div><h3>Connect your IBM Quantum account</h3><p>The owner configures the API key, instance, backend and operator password on the server. The browser never asks for your IBM API key.</p><a href="https://quantum.cloud.ibm.com/docs/en/guides/save-credentials" target="_blank" rel="noreferrer">IBM account setup instructions ↗</a></div></div>}
      <div className={styles.controls}><label>Processor<input aria-label="Configured processor" disabled value={hardware?.backend || 'Not configured'} /></label><label>Shots per setting<select value={hardwareShots} disabled={disabled || !hardware?.available} onChange={e => setHardwareShots(Number(e.target.value))}><option value={1024}>1,024</option><option value={2048}>2,048</option></select></label><label>Operator password<input aria-label="Quantum operator password" type="password" autoComplete="off" value={password} disabled={disabled || !hardware?.available} onChange={e => setPassword(e.target.value)} /></label></div>
      <label className={styles.acknowledge}><input type="checkbox" checked={acknowledged} disabled={disabled || !hardware?.available} onChange={e => setAcknowledged(e.target.checked)} /> I understand this submits four circuits and uses the configured IBM Quantum account’s quota. Any billing follows that account’s plan.</label>
      <div className={styles.buttonRow}><button className={styles.primary} disabled={disabled || !hardware?.available || !password || !acknowledged} onClick={() => action('Submitting to IBM Quantum…', async () => { const submitted = await quantumLab.submit(hardwareShots, password); setJob(submitted); setJobId(submitted.job_id); })}><Cpu size={15} /> Submit hardware job</button><button className={styles.secondary} disabled={disabled} onClick={() => action('Checking hardware configuration…', async () => setHardware(await quantumLab.hardware()))}><RefreshCw size={14} /> Recheck setup</button></div>
      <div className={styles.jobLookup}><label>Retrieve an existing QNexus job<input aria-label="IBM Quantum job ID" placeholder="Job ID returned by IBM Quantum" value={jobId} disabled={disabled} onChange={e => { setJobId(e.target.value); setJob(null); }} /></label><button className={styles.secondary} disabled={disabled || !hardware?.available || !password || !jobId} onClick={() => action('Reading IBM Quantum job…', async () => setJob(await quantumLab.job(jobId, password)))}>Check job status</button></div>
      {job && <div className={styles.hardwareResult}><div className={styles.hardwareMeta}><span>IBM QUANTUM HARDWARE</span><strong>{job.backend}</strong><code>{job.job_id}</code><span>{job.status}</span></div>{job.explanation && <p className={styles.note}>{job.explanation}</p>}{job.result ? <><BellEvidence result={job.result} /><button className={styles.download} onClick={() => downloadFile('qnexus-hardware-job.json', JSON.stringify(job, null, 2))}><ArrowDownToLine size={14} /> Export hardware evidence</button></> : <p className={styles.note}>No measurement result is available yet. Use “Check job status” after the queue or execution finishes.</p>}</div>}
    </section>}

    <details className={styles.explain}><summary><Check size={16} /> How to explain this to the judges <ChevronDown size={15} /></summary><div><p><strong>Why quantum?</strong> We study how measurement disturbance and entangled correlations behave, then connect a teaching key-exchange workflow to a sample payment. Ordinary cryptography handles the payment encryption.</p><p><strong>Why not classical?</strong> A classical computer can simulate these small experiments and already protects document integrity. Physical quantum communication offers different security assumptions; this app does not claim a speed advantage or complete banking security.</p><p><strong>What is real here?</strong> The simulator executes quantum circuits mathematically. Hardware mode submits four Bell-test circuits to a physical IBM processor when configured, and displays its job ID and returned counts. Two qubits on one chip are not a distributed quantum network.</p><p>Source methods: <a href="https://quantum.cloud.ibm.com/learning/en/modules/computer-science/quantum-key-distribution" target="_blank" rel="noreferrer">IBM QKD learning module</a> · <a href="https://quantum.cloud.ibm.com/docs/en/tutorials/chsh-inequality" target="_blank" rel="noreferrer">IBM CHSH tutorial</a>.</p></div></details>
  </div>;
}
