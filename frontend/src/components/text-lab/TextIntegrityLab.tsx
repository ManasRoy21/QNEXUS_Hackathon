'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowDownToLine, ArrowRight, CheckCircle2, ChevronDown, Code2, FileText, Fingerprint, FlaskConical, Loader2, Play, RotateCcw, ShieldCheck, ShieldX } from 'lucide-react';
import LabTabs from '../image-lab/LabTabs';
import styles from '../image-lab/lab.module.css';
import { Capabilities, ChannelConfig, downloadFile, imageLab } from '@/services/imageLab';
import { TextReceipt, TextVerification, textLab } from '@/services/textLab';

const SAMPLE = 'Authorize transfer of research dataset QN-204 to Bob and Charlie.\nApproved by Alice.';
const DEFAULT: ChannelConfig = { shots: 4096, seed: 42, noise: 0.01, interception: 0 };
const percent = (n: number) => `${(n * 100).toFixed(2)}%`;
const labels = { VERIFIED: 'Text verified', MESSAGE_CHANGED: 'Text alteration detected', CHANNEL_REJECTED: 'Channel policy failed', UNTRUSTED_RECEIPT: 'Receipt is not trusted' };

function alter(message: string) {
  const chars = Array.from(message);
  return (chars[0] === 'Q' ? 'R' : 'Q') + chars.slice(1).join('');
}
function difference(original: string, candidate: string) {
  const a = Array.from(original), b = Array.from(candidate);
  let start = 0, end = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start++;
  while (end < a.length - start && end < b.length - start && a[a.length - 1 - end] === b[b.length - 1 - end]) end++;
  return { before: b.slice(0, start).join(''), added: b.slice(start, b.length - end).join(''),
    removed: a.slice(start, a.length - end).join(''), after: end ? b.slice(-end).join('') : '' };
}

export default function TextIntegrityLab() {
  const [source, setSource] = useState(SAMPLE);
  const [candidate, setCandidate] = useState(SAMPLE);
  const [config, setConfig] = useState<ChannelConfig>(DEFAULT);
  const [capabilities, setCapabilities] = useState<Capabilities | null>(null);
  const [connectionError, setConnectionError] = useState(false);
  const [receipt, setReceipt] = useState<TextReceipt | null>(null);
  const [result, setResult] = useState<TextVerification | null>(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [events, setEvents] = useState<string[]>([]);
  const [circuitOpen, setCircuitOpen] = useState(false);
  const experiment = receipt?.manifest.experiment;
  const diff = difference(source, candidate);
  const disabled = !!busy;

  async function connect() {
    try { setCapabilities(await imageLab.capabilities()); setConnectionError(false); }
    catch { setCapabilities(null); setConnectionError(true); }
  }
  useEffect(() => { connect(); }, []);
  async function action(label: string, task: () => Promise<void>) {
    setBusy(label); setError('');
    try { await task(); } catch (err) { setError(err instanceof Error ? err.message : 'Request failed. Try again.'); }
    finally { setBusy(''); }
  }
  function reset() { setReceipt(null); setResult(null); setEvents([]); setError(''); }
  function changeConfig(next: ChannelConfig) { setConfig(next); reset(); }
  function changeSource(message: string) { setSource(message); setCandidate(message); reset(); }
  async function seal() {
    await action('Running Qiskit & sealing text…', async () => {
      setReceipt(null); setResult(null); setEvents([]);
      const sealed = await textLab.seal(source, config);
      setReceipt(sealed);
      await connect();
      setEvents(['Executed Qiskit Aer channel experiments for Bob and Charlie.', 'Signed the exact UTF-8 message fingerprint and channel results with Ed25519.']);
    });
  }
  async function verify() {
    if (!receipt) return;
    await action('Checking signature, text & channel…', async () => {
      const checked = await textLab.verify(candidate, receipt);
      setResult(checked); setEvents(previous => [...previous, `${labels[checked.verdict]}.`]);
    });
  }
  async function demo() {
    await action('Running guided text experiment…', async () => {
      reset(); setConfig(DEFAULT); setCandidate(source);
      const sealed = await textLab.seal(source, DEFAULT);
      setReceipt(sealed); await connect();
      const baseline = await textLab.verify(source, sealed);
      if (baseline.verdict !== 'VERIFIED') throw new Error(`Clean baseline: ${baseline.explanation}`);
      const changed = alter(source);
      const tampered = await textLab.verify(changed, sealed);
      if (tampered.verdict !== 'MESSAGE_CHANGED') throw new Error('The altered candidate was not rejected. Inspect the backend.');
      const restored = await textLab.verify(source, sealed);
      if (restored.verdict !== 'VERIFIED') throw new Error('The restored text did not verify. Inspect the backend.');
      setCandidate(source); setResult(restored);
      setEvents(['SEALED · Original fingerprint and clean channel experiment signed.',
        'VERIFIED · Unchanged text accepted by both verifiers.',
        'MESSAGE CHANGED · Replaced the first character without re-signing; both verifiers rejected.',
        'VERIFIED · Restored the original; the same receipt verified again.']);
    });
  }
  async function exportReport() {
    if (!receipt) return;
    await action('Preparing receipt download…', async () => {
      const current = await imageLab.capabilities();
      setCapabilities(current);
      if (current.key_id !== receipt.manifest.key_id) throw new Error('Server signing key changed. Reseal the original before exporting.');
      downloadFile('qds-text-experiment.json', JSON.stringify({ receipt, verification: result,
        public_key: current.public_key,
        trust_note: 'Obtain and pin the issuer public key through an independent trusted channel. An included public key does not establish identity.',
        scope: 'Exact UTF-8 text integrity using SHA-256 and Ed25519, plus a local simulated BB84 channel experiment. No text content is included in this export. Not a complete QDS protocol.',
      }, null, 2));
    });
  }

  return <div className={styles.lab}>
    <LabTabs active="text" />
    <section className={styles.hero}>
      <div><div className={styles.eyebrow}><span className={styles.dot} /> TEXT INTEGRITY × QUANTUM EXPERIMENTS</div>
        <h1>Every character counts.<br /><em>Test the trust.</em></h1>
        <p>Seal a message, change one character, and see what fails. Pair exact text verification with a measured quantum channel experiment.</p>
        <div className={styles.heroActions}><button className={styles.primary} disabled={disabled || !source || !capabilities} onClick={demo}><Play size={15} /> Run guided text demo <ArrowRight size={17} /></button><Link className={styles.textLink} href="/workflow">Research workflow <ArrowRight size={15} /></Link></div>
      </div>
      <div className={styles.heroAside}><div className={styles.orbit} aria-hidden="true"><div /><div /><span><FileText size={36} strokeWidth={1.2} /></span><i /><b /></div><div className={styles.asideCaption}><span>01 / SEAL</span><span>02 / EDIT</span><span>03 / VERIFY</span></div><p>One character changes.<br />The evidence follows.</p></div>
    </section>

    <section className={styles.workbench} aria-label="Text integrity workbench">
      <div className={styles.workbenchHeader}><div><span className={styles.sectionNumber}>01</span><h2>Text integrity lab</h2><span className={styles.tag}>INTERACTIVE</span></div><button className={styles.connection} disabled={disabled} onClick={connect}><span className={`${styles.dot} ${!capabilities ? styles.offline : ''}`} />{capabilities ? 'Simulator connected' : connectionError ? 'Offline · reconnect' : 'Connecting…'}</button></div>
      {connectionError && <div className={styles.notice} role="status">The simulator is unavailable. Reconnect after starting the backend.</div>}
      <div className={styles.presetBar}><span>CHANNEL SCENARIO</span><div className={styles.presets}>
        {[{ name: 'Clean channel', noise: .01, interception: 0 }, { name: 'Noisy channel', noise: .18, interception: 0 }, { name: 'Eve intercepts', noise: .01, interception: 1 }].map(p => <button key={p.name} disabled={disabled} aria-pressed={config.noise === p.noise && config.interception === p.interception} onClick={() => changeConfig({ ...config, noise: p.noise, interception: p.interception })}>{p.interception ? <ShieldX size={14} /> : <span className={styles.presetDot} />}{p.name}</button>)}
      </div><details className={styles.settings}><summary>Experiment settings <ChevronDown size={13} /></summary><div>
        <label>Shots per verifier<select value={config.shots} disabled={disabled} onChange={e => changeConfig({ ...config, shots: Number(e.target.value) as ChannelConfig['shots'] })}>{[1024,4096,16384].map(n => <option value={n} key={n}>{n.toLocaleString()}</option>)}</select></label>
        <label>Reproducible seed<input type="number" min="0" max="2147483647" disabled={disabled} value={config.seed} onChange={e => changeConfig({ ...config, seed: Math.max(0, Math.min(2147483647, Math.trunc(Number(e.target.value) || 0))) })} /></label>
        <label>Channel noise: {percent(config.noise)}<input aria-label="Channel noise" type="range" min="0" max="0.3" step="0.005" disabled={disabled} value={config.noise} onChange={e => changeConfig({ ...config, noise: Number(e.target.value) })} /></label>
        <label>Intercepted fraction: {percent(config.interception)}<input aria-label="Intercepted fraction" type="range" min="0" max="1" step="0.05" disabled={disabled} value={config.interception} onChange={e => changeConfig({ ...config, interception: Number(e.target.value) })} /></label>
      </div></details></div>

      <div className={styles.imageGrid}>
        <div><div className={styles.imageHeading}><div><span className={styles.avatar}>A</span><strong>Alice’s original text</strong></div><span className={styles.smallBadge}>{receipt ? 'SEALED' : 'SOURCE'}</span></div>
          <textarea className={styles.textEditor} aria-label="Original text" maxLength={4096} value={source} disabled={disabled} spellCheck={false} onChange={e => changeSource(e.target.value)} />
          <div className={styles.imageMeta}><span>{Array.from(source).length.toLocaleString()} / 4,096 characters</span><span>Exact UTF-8</span></div>
          <div className={styles.imageTools}><button disabled={disabled} onClick={() => changeSource(SAMPLE)}>Use sample message</button><span className={styles.textHint}>Editing the original clears its receipt.</span></div>
        </div>
        <div><div className={styles.imageHeading}><div><span className={`${styles.avatar} ${styles.candidateAvatar}`}><FileText size={14} /></span><strong>Text under inspection</strong></div><span className={`${styles.smallBadge} ${source !== candidate ? styles.editedBadge : ''}`}>{source === candidate ? 'UNCHANGED' : 'EDITED'}</span></div>
          <textarea className={styles.textEditor} aria-label="Candidate text" maxLength={4096} value={candidate} disabled={disabled} spellCheck={false} onChange={e => { setCandidate(e.target.value); setResult(null); }} />
          <div className={styles.imageMeta}><span>{Array.from(candidate).length.toLocaleString()} characters</span><span>Case & whitespace count</span></div>
          <div className={styles.imageTools}><span className={styles.textHint}>Edit this text after sealing.</span><button disabled={disabled} onClick={() => { setCandidate(source); setResult(null); }}><RotateCcw size={13} /> Restore original</button></div>
        </div>
      </div>
      <div className={styles.actionBar}>
        <button className={styles.stepAction} disabled={disabled || !source || !capabilities} onClick={seal}><span>1</span><div><strong>{receipt ? 'Reseal original text' : 'Seal original text'}</strong><small>Run circuits + sign receipt</small></div><Fingerprint size={20} /></button>
        <div className={styles.tamperActions}><button className={styles.stepAction} disabled={disabled || !receipt} onClick={() => { setCandidate(alter(source)); setResult(null); setEvents(previous => [...previous, 'Changed one character; original receipt retained.']); }}><span>2</span><div><strong>Change one character</strong><small>Keep the original receipt</small></div><FileText size={20} /></button></div>
        <button className={`${styles.stepAction} ${styles.verifyAction}`} disabled={disabled || !receipt} onClick={verify}><span>3</span><div><strong>Verify text</strong><small>Check Bob + Charlie</small></div><ArrowRight size={22} /></button>
      </div>
      <div className={styles.workbenchFoot}><span><ShieldCheck size={13} /> Text is sent to your configured API for processing; the text lab does not save it.</span><span>SHA-256 · ED25519 · QISKIT AER</span></div>
    </section>
    {busy && <div className={styles.loading} role="status"><Loader2 size={17} className={styles.spinner} />{busy}</div>}
    {error && <div className={styles.error} role="alert"><ShieldX size={18} />{error}</div>}

    <section className={styles.evidenceGrid} aria-label="Text experiment results">
      <div className={styles.evidencePanel}><div className={styles.panelTitle}><span className={styles.sectionNumber}>02</span><h2>Message integrity</h2><Fingerprint size={19} /></div>
        {result ? <><div className={`${styles.verdict} ${result.verdict === 'VERIFIED' ? styles.verdictPass : styles.verdictFail}`} role="status"><ShieldCheck size={25} /><div><strong>{labels[result.verdict]}</strong><p>{result.explanation}</p></div></div>
          <div className={styles.evidenceChecks}><span>Receipt: {result.signature_valid ? 'authentic' : 'untrusted'}</span><span>Text: {!result.signature_valid ? 'not trusted' : result.message_matches ? 'matches' : 'changed'}</span></div>
          <div className={styles.verifierCards}>{result.verifiers.map(v => <div key={v.verifier}><span>{v.verifier}</span><strong className={v.accepted ? styles.passText : styles.failText}>{v.accepted ? 'ACCEPT' : 'REJECT'}</strong><small>Text {result.message_matches ? 'matches' : 'changed'} · channel {v.channel_accepted ? 'passes' : 'fails'}</small></div>)}</div>
        </> : <div className={styles.emptyState}><FileText size={30} /><strong>{receipt ? 'Text sealed. Ready to verify.' : 'Seal a message to begin.'}</strong><p>Verify the unchanged text, then change a character and verify again without re-signing.</p></div>}
        {receipt && <div className={styles.digest}><span>SEALED ORIGINAL · SHA-256</span><code>{receipt.manifest.message_sha256}</code>{result && <><span>CANDIDATE · SHA-256</span><code className={result.message_matches ? '' : styles.failText}>{result.candidate_sha256}</code></>}<span>ISSUER {receipt.manifest.key_id} · {receipt.algorithm} · {receipt.manifest.utf8_bytes} UTF-8 BYTES</span></div>}
        {receipt && source !== candidate && <div className={styles.textDiff}><strong>Local edit preview</strong><p>This highlights the changed span between the two editors. Backend hashes decide integrity.</p><pre>{diff.before}<mark>{diff.added}</mark>{diff.after}</pre>{diff.removed && <p>Removed / replaced: <del>{diff.removed}</del></p>}</div>}
        <button className={styles.exportButton} disabled={disabled || !receipt} onClick={exportReport}><ArrowDownToLine size={15} /> Download text experiment receipt <span>JSON ↗</span></button>
      </div>
      <div className={styles.evidencePanel}><div className={styles.panelTitle}><span className={styles.sectionNumber}>03</span><h2>Quantum channel status</h2><FlaskConical size={19} /></div>
        <p className={styles.channelIntro}>These measurements characterize a simulated BB84 channel. The message stays classical; its characters are not encoded into these qubits. Noise and interception can both cause errors.</p>
        {experiment ? <>
          <div className={styles.runMeta}><span>QISKIT {experiment.qiskit_version}</span><span>AER {experiment.aer_version}</span><span>SEED {experiment.config.seed}</span><span>{experiment.circuit_count} CIRCUITS</span></div>
          <div className={`${styles.verdict} ${experiment.measurements.every(m => m.accepted) ? styles.verdictPass : styles.verdictFail}`}><div><strong>{experiment.measurements.every(m => m.accepted) ? 'Both channels pass policy' : 'Channel disturbance exceeds policy'}</strong><p>Channel status is independent of whether the candidate text changed.</p></div></div>
          {experiment.measurements.map(m => <div className={styles.measurement} key={m.verifier}><div><strong>{m.verifier}</strong><span>{m.errors} errors / {m.sifted.toLocaleString()} sifted bits</span><b className={m.accepted ? styles.passText : styles.failText}>{percent(m.qber)}</b></div><div className={styles.barTrack}><div style={{ width: `${Math.min(100, m.qber * 200)}%` }} className={m.accepted ? styles.barClean : styles.barDanger} /><i style={{ left: `${experiment.cutoff * 200}%` }} /></div><small>95% Wilson interval: {percent(m.interval_95[0])}–{percent(m.interval_95[1])}</small></div>)}
          <div className={styles.channelPolicy}><span><i /> {percent(experiment.cutoff)} illustrative cutoff</span><span>Expected: {percent(experiment.measurements[0].expected_qber)}</span></div>
          <button className={styles.circuitToggle} aria-expanded={circuitOpen} onClick={() => setCircuitOpen(!circuitOpen)}><Code2 size={15} /> Inspect actual circuit <ChevronDown size={15} /></button>
          {circuitOpen && <div className={styles.circuit}><p>Representative circuit; interception uses an averaged measure-and-resend channel.</p><pre>{experiment.circuit_text}</pre><button onClick={() => downloadFile('text-channel.qasm', experiment.circuit_qasm, 'text/plain')}>Download ideal OpenQASM ↗</button><small>Ideal QASM omits Aer noise channels.</small></div>}
        </> : <div className={styles.emptyState}><FlaskConical size={30} /><strong>Measurement evidence appears here.</strong><p>Seal the text to prepare and measure quantum states for two simulated receivers.</p></div>}
      </div>
    </section>
    {!!events.length && <section className={styles.eventLog} aria-label="Text experiment log"><div><CheckCircle2 size={15} /><strong>Experiment trail</strong><span>BACKEND RESULTS</span></div><ol>{events.map((event, i) => <li key={`${i}-${event}`}><span>{String(i + 1).padStart(2, '0')}</span>{event}</li>)}</ol></section>}
    <details className={styles.modelNotes}><summary><FlaskConical size={15} /> What protects the message? <ChevronDown size={15} /></summary><div>
      <p>SHA-256 fingerprints exact UTF-8 bytes, without trimming, case folding, or Unicode normalization. Spaces, line breaks, and visually identical characters with different encodings can change the hash. Ed25519 authenticates the message fingerprint and recorded channel experiment together.</p>
      <p>Quantum simulation tests channel disturbance; it does not strengthen SHA-256, encrypt the text, or establish that its author is Alice. Bob and Charlie are two simulated checks on one server. This is not complete QDS, quantum key distribution, or a proof of non-repudiation. The 11% cutoff is an educational policy.</p>
      <p>{capabilities?.persistent_key ? 'The server uses a configured signing key.' : 'The default signing key changes on backend restart; reseal old messages afterward.'} The downloaded receipt contains hashes and measurements, not the message. A hash does not hide predictable text from guessing.</p>
    </div></details>
  </div>;
}
