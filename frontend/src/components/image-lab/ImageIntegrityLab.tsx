'use client';

/* Native img elements keep local data-URL uploads exact, without an image proxy. */
/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowDownToLine, ArrowRight, Check, CheckCircle2, ChevronDown, Code2, FileImage, Fingerprint, FlaskConical, ImagePlus, Loader2, Play, RotateCcw, ScanLine, ShieldCheck, ShieldX, Sparkles, Upload, X } from 'lucide-react';
import { Capabilities, ChannelConfig, ImageAsset, Receipt, Verification, downloadFile, downloadImage, editImage, imageLab, readImage, sampleImage } from '@/services/imageLab';
import styles from './lab.module.css';
import LabTabs from './LabTabs';

const DEFAULT_CONFIG: ChannelConfig = { shots: 4096, seed: 42, noise: 0.01, interception: 0 };
const percent = (value: number) => `${(value * 100).toFixed(2)}%`;
const verdictLabels = { VERIFIED: 'Image verified', IMAGE_CHANGED: 'Image alteration detected', CHANNEL_REJECTED: 'Channel policy failed', UNTRUSTED_RECEIPT: 'Receipt is not trusted' };

export default function ImageIntegrityLab() {
  const [source, setSource] = useState<ImageAsset | null>(null);
  const [candidate, setCandidate] = useState<ImageAsset | null>(null);
  const [config, setConfig] = useState<ChannelConfig>(DEFAULT_CONFIG);
  const [capabilities, setCapabilities] = useState<Capabilities | null>(null);
  const [connectionError, setConnectionError] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [verification, setVerification] = useState<Verification | null>(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [edit, setEdit] = useState('Original pixels');
  const [events, setEvents] = useState<string[]>([]);
  const [circuitOpen, setCircuitOpen] = useState(false);
  const sourceInput = useRef<HTMLInputElement>(null);
  const candidateInput = useRef<HTMLInputElement>(null);
  const experiment = receipt?.manifest.experiment;

  async function connect() {
    try { setCapabilities(await imageLab.capabilities()); setConnectionError(false); }
    catch { setCapabilities(null); setConnectionError(true); }
  }
  useEffect(() => {
    let active = true;
    sampleImage().then(image => { if (active) { setSource(image); setCandidate(image); } }).catch(() => { if (active) setError('Sample could not load. Upload an image to begin.'); });
    connect();
    return () => { active = false; };
  }, []);

  async function action(label: string, task: () => Promise<void>) {
    setBusy(label); setError('');
    try { await task(); } catch (err) { setError(err instanceof Error ? err.message : 'Something went wrong. Try again.'); }
    finally { setBusy(''); }
  }
  function resetEvidence() { setReceipt(null); setVerification(null); setEvents([]); }
  function changeConfig(next: ChannelConfig) { setConfig(next); resetEvidence(); }
  async function changeSource(image: ImageAsset) {
    setSource(image); setCandidate(image); setEdit('Original pixels'); resetEvidence();
  }
  async function upload(file: File | undefined, target: 'source' | 'candidate') {
    if (!file) return;
    await action('Reading image…', async () => {
      const image = await readImage(file);
      if (target === 'source') await changeSource(image);
      else { setCandidate(image); setVerification(null); setEdit('Comparison file'); }
    });
  }
  async function seal() {
    if (!source) return;
    await action('Running Qiskit & sealing…', async () => {
      const sealed = await imageLab.seal(source, config);
      setCapabilities(await imageLab.capabilities());
      setReceipt(sealed); setVerification(null); setEvents(['Qiskit circuits executed for Bob and Charlie.', 'Original image fingerprint and experiment signed with Ed25519.']);
    });
  }
  async function tamper(kind: 'region' | 'pixel') {
    if (!source) return;
    await action('Editing candidate…', async () => {
      setCandidate(await editImage(source, kind)); setVerification(null);
      setEdit(kind === 'pixel' ? 'One pixel changed' : 'Region replaced');
      setEvents(previous => [...previous, kind === 'pixel' ? 'Changed one red-channel byte in the candidate image.' : 'Replaced a region in the candidate image.']);
    });
  }
  async function verify() {
    if (!candidate || !receipt) return;
    await action('Checking signature & pixels…', async () => {
      const result = await imageLab.verify(candidate, receipt);
      setVerification(result); setEvents(previous => [...previous, verdictLabels[result.verdict] + '.']);
    });
  }
  async function runDemo() {
    if (!source) return;
    await action('Running guided experiment…', async () => {
      setConfig(DEFAULT_CONFIG); setCandidate(source); setEdit('Original pixels'); resetEvidence();
      const sealed = await imageLab.seal(source, DEFAULT_CONFIG);
      setCapabilities(await imageLab.capabilities());
      setReceipt(sealed);
      const clean = await imageLab.verify(source, sealed);
      if (clean.verdict !== 'VERIFIED') throw new Error('Baseline did not pass. Inspect the backend before continuing.');
      const altered = await editImage(source, 'region');
      const result = await imageLab.verify(altered, sealed);
      setCandidate(altered); setEdit('Region replaced'); setVerification(result);
      setEvents(['Executed real Qiskit Aer circuits with seed 42.', 'Signed the original image and experiment.', 'Unchanged image: signature and pixels verified.', 'Replaced a region; kept the original signed receipt.', `Altered image: ${result.changed_tile_count} of 64 tiles differ. Both verifiers reject.`]);
    });
  }
  function exportReport() {
    if (!receipt || !capabilities) return;
    if (capabilities.key_id !== receipt.manifest.key_id) { setError('Issuer key changed. Reseal the original before exporting.'); return; }
    downloadFile('qds-image-experiment.json', JSON.stringify({ receipt, verification, public_key: capabilities.public_key, trust_note: 'Pin the issuer public key through a trusted channel. This field alone does not establish identity.', limitations: capabilities.limitations }, null, 2));
  }
  const disabled = !!busy;

  return <div className={styles.lab}>
    <LabTabs active="image" />
    <section className={styles.hero}>
      <div>
        <div className={styles.eyebrow}><span className={styles.dot} /> IMAGE INTEGRITY × QUANTUM EXPERIMENTS</div>
        <h1>Trust the image.<br /><em>Test the channel.</em></h1>
        <p>One altered pixel tells a different story. Seal an image, try to change it, and see what two verifiers discover—with a real Qiskit simulation behind the experiment.</p>
        <div className={styles.heroActions}>
          <button className={styles.primary} onClick={runDemo} disabled={disabled || !source || !capabilities}><Play size={15} fill="currentColor" /> Run guided demo <ArrowRight size={17} /></button>
          <Link className={styles.textLink} href="/quantum-lab">Explore quantum experiments <ArrowRight size={15} /></Link>
        </div>
      </div>
      <div className={styles.heroAside}>
        <div className={styles.orbit} aria-hidden="true"><div /><div /><span><Fingerprint size={36} strokeWidth={1.2} /></span><i /><b /></div>
        <div className={styles.asideCaption}><span>01 / PREPARE</span><span>02 / DISTURB</span><span>03 / VERIFY</span></div>
        <p>A visible experiment.<br />A verifiable result.</p>
      </div>
    </section>

    <section className={styles.workbench} aria-label="Image integrity workbench">
      <div className={styles.workbenchHeader}>
        <div><span className={styles.sectionNumber}>01</span><h2>Image integrity lab</h2><span className={styles.tag}>INTERACTIVE</span></div>
        <button onClick={connect} disabled={disabled} className={styles.connection} title="Check backend connection"><span className={`${styles.dot} ${!capabilities ? styles.offline : ''}`} />{capabilities ? 'Simulator connected' : connectionError ? 'Offline · reconnect' : 'Connecting…'}</button>
      </div>
      {connectionError && <div className={styles.notice} role="status">Start the Python API on port 8000 to run experiments. The image preview works locally. <code>npm run dev:backend</code></div>}
      <div className={styles.presetBar}>
        <span>CHANNEL SCENARIO</span>
        <div className={styles.presets}>
          {[{ name: 'Clean channel', noise: 0.01, interception: 0 }, { name: 'Noisy channel', noise: 0.18, interception: 0 }, { name: 'Eve intercepts', noise: 0.01, interception: 1 }].map(preset => <button key={preset.name} disabled={disabled} aria-pressed={config.noise === preset.noise && config.interception === preset.interception} onClick={() => changeConfig({ ...config, noise: preset.noise, interception: preset.interception })}>{preset.interception ? <ShieldX size={14} /> : <span className={styles.presetDot} />}{preset.name}</button>)}
        </div>
        <details className={styles.settings}><summary>Experiment settings <ChevronDown size={13} /></summary><div>
          <label>Shots per verifier<select disabled={disabled} value={config.shots} onChange={e => changeConfig({ ...config, shots: Number(e.target.value) as ChannelConfig['shots'] })}>{[1024, 4096, 16384].map(n => <option key={n} value={n}>{n.toLocaleString()}</option>)}</select></label>
          <label>Reproducible seed<input type="number" min="0" max="2147483647" value={config.seed} disabled={disabled} onChange={e => changeConfig({ ...config, seed: Math.max(0, Math.min(2147483647, Math.trunc(Number(e.target.value) || 0))) })} /></label>
          <label>Channel noise: {percent(config.noise)}<input aria-label="Channel noise" type="range" min="0" max="0.3" step="0.005" value={config.noise} disabled={disabled} onChange={e => changeConfig({ ...config, noise: Number(e.target.value) })} /></label>
          <label>Intercepted fraction: {percent(config.interception)}<input aria-label="Intercepted fraction" type="range" min="0" max="1" step="0.05" value={config.interception} disabled={disabled} onChange={e => changeConfig({ ...config, interception: Number(e.target.value) })} /></label>
        </div></details>
      </div>
      <div className={styles.imageGrid}>
        <div className={styles.imagePanel}>
          <div className={styles.imageHeading}><div><span className={styles.avatar}>A</span><strong>Alice’s original</strong></div><span className={styles.smallBadge}>{receipt ? <><Check size={12} /> SEALED</> : 'SOURCE'}</span></div>
          <div className={styles.imageStage}>
            {source ? <div className={styles.imageWrap} style={{ aspectRatio: `${source.width}/${source.height}` }}><img src={source.data} alt="Original image supplied by Alice" /></div> : <div className={styles.imagePlaceholder}><ImagePlus size={28} />Preparing sample…</div>}
          </div>
          <div className={styles.imageMeta}><span>{source?.name || 'No image'}</span><span>{source ? `${source.width} × ${source.height}` : ''}</span></div>
          <div className={styles.imageTools}><button disabled={disabled} onClick={() => sourceInput.current?.click()}><Upload size={14} /> Upload original</button><button disabled={disabled || !source} onClick={() => source && downloadImage(source)} aria-label="Download original image"><ArrowDownToLine size={13} /></button><button disabled={disabled} onClick={() => action('Loading sample…', async () => changeSource(await sampleImage()))}>Use sample</button></div>
        </div>
        <div className={styles.imagePanel}>
          <div className={styles.imageHeading}><div><span className={`${styles.avatar} ${styles.candidateAvatar}`}><ScanLine size={14} /></span><strong>Image under inspection</strong></div><span className={`${styles.smallBadge} ${edit !== 'Original pixels' ? styles.editedBadge : ''}`}>{edit}</span></div>
          <div className={styles.imageStage}>
            {candidate ? <div className={styles.imageWrap} style={{ aspectRatio: `${candidate.width}/${candidate.height}` }}><img src={candidate.data} alt="Candidate image being checked for changes" />{verification?.signature_valid && verification.changed_tile_count > 0 && <div className={styles.heatmap} aria-label={`${verification.changed_tile_count} changed tiles highlighted`}>{Array.from({ length: 64 }, (_, i) => <div key={i} className={verification.changed_tiles.includes(i) ? styles.changedTile : ''} />)}</div>}</div> : <div className={styles.imagePlaceholder}><ScanLine size={28} />Waiting for an image</div>}
          </div>
          <div className={styles.imageMeta}><span>{candidate?.name || 'No candidate'}</span><span>{verification ? `${verification.changed_tile_count}/64 tiles changed` : '8 × 8 change map'}</span></div>
          <div className={styles.imageTools}><button disabled={disabled || !receipt} onClick={() => candidateInput.current?.click()}><FileImage size={14} /> Compare file</button><button disabled={disabled || !candidate} onClick={() => candidate && downloadImage(candidate)} aria-label="Download candidate image"><ArrowDownToLine size={13} /></button><button disabled={disabled || !source} onClick={() => { setCandidate(source); setEdit('Original pixels'); setVerification(null); }}><RotateCcw size={13} /> Restore</button></div>
        </div>
      </div>
      <input ref={sourceInput} type="file" accept="image/png,image/jpeg,image/webp" hidden aria-label="Upload original image" disabled={disabled} onChange={e => { upload(e.target.files?.[0], 'source'); e.target.value = ''; }} />
      <input ref={candidateInput} type="file" accept="image/png,image/jpeg,image/webp" hidden aria-label="Upload comparison image" disabled={disabled} onChange={e => { upload(e.target.files?.[0], 'candidate'); e.target.value = ''; }} />
      <div className={styles.actionBar}>
        <button className={styles.stepAction} disabled={disabled || !source || !capabilities} onClick={seal}><span>1</span><div><strong>{receipt ? 'Reseal original' : 'Seal original'}</strong><small>Run circuits + sign receipt</small></div><Fingerprint size={20} /></button>
        <div className={styles.tamperActions}><button className={styles.stepAction} disabled={disabled || !receipt} onClick={() => tamper('region')}><span>2</span><div><strong>Alter a region</strong><small>Simulate an image edit</small></div><ScanLine size={20} /></button><button className={styles.pixelButton} disabled={disabled || !receipt} onClick={() => tamper('pixel')}>Try a 1-pixel edit ↗</button></div>
        <button className={`${styles.stepAction} ${styles.verifyAction}`} disabled={disabled || !candidate || !receipt} onClick={verify}><span>3</span><div><strong>Verify image</strong><small>Check Bob + Charlie</small></div><ArrowRight size={22} /></button>
      </div>
      <div className={styles.workbenchFoot}><span><ShieldCheck size={13} /> Images processed by your configured API; no image files stored.</span><span>PNG / JPEG / WEBP · ≤ 2 MiB · ≤ 2 MP</span></div>
    </section>
    {busy && <div className={styles.loading} role="status"><Loader2 size={17} className={styles.spinner} />{busy}</div>}
    {error && <div className={styles.error} role="alert"><ShieldX size={18} /><span>{error}</span><button aria-label="Dismiss error" onClick={() => setError('')}><X size={16} /></button></div>}

    <section className={styles.evidenceGrid} aria-label="Experiment results">
      <div className={styles.evidencePanel}>
        <div className={styles.panelTitle}><span className={styles.sectionNumber}>02</span><h2>Verification evidence</h2><Fingerprint size={19} /></div>
        {verification ? <>
          <div className={`${styles.verdict} ${verification.verdict === 'VERIFIED' ? styles.verdictPass : styles.verdictFail}`} role="status">
            {verification.verdict === 'VERIFIED' ? <ShieldCheck size={29} /> : <ShieldX size={29} />}<div><strong>{verdictLabels[verification.verdict]}</strong><p>{verification.explanation}</p></div>
          </div>
          <div className={styles.evidenceChecks}><span><CheckCircle2 size={15} /> Receipt: {verification.signature_valid ? 'authentic' : 'invalid'}</span><span>{verification.pixels_match ? <CheckCircle2 size={15} /> : <X size={15} />} Pixels: {verification.pixels_match ? 'match' : 'changed'}</span><span>File bytes: {verification.file_match ? 'match' : 'differ'}</span></div>
          <div className={styles.verifierCards}>{verification.verifiers.map(v => <div key={v.verifier}><span>{v.verifier}</span><strong className={v.accepted ? styles.passText : styles.failText}>{v.accepted ? 'ACCEPT' : 'REJECT'}</strong><small>{!verification.pixels_match ? 'Image fingerprint mismatch' : v.channel_accepted ? 'Image + channel checks pass' : 'Channel error policy failed'}</small></div>)}</div>
        </> : <div className={styles.emptyState}><Fingerprint size={31} strokeWidth={1.2} /><strong>{receipt ? 'Receipt sealed. Ready to inspect.' : 'Every result starts with evidence.'}</strong><p>{receipt ? 'Verify the original first, then alter a region or a single pixel and verify again.' : 'Seal the original to execute the quantum experiment and create a signed image fingerprint.'}</p></div>}
        {receipt && <div className={styles.digest}><span>ORIGINAL PIXEL FINGERPRINT · SHA-256</span><code>{receipt.manifest.image.pixel_sha256}</code>{verification && <><span>CANDIDATE PIXEL FINGERPRINT</span><code className={!verification.pixels_match ? styles.failText : ''}>{verification.candidate_sha256}</code></>}</div>}
        <button className={styles.exportButton} disabled={disabled || !receipt || !capabilities} onClick={exportReport}><ArrowDownToLine size={15} /> Download experiment receipt <span>JSON ↗</span></button>
      </div>
      <div className={styles.evidencePanel}>
        <div className={styles.panelTitle}><span className={styles.sectionNumber}>03</span><h2>Inside the quantum channel</h2><FlaskConical size={19} /></div>
        <p className={styles.channelIntro}>Qiskit prepares and measures single qubits in two bases. Interception disturbs their statistics; image edits change the fingerprint. These are separate checks.</p>
        {experiment ? <>
          <div className={styles.runMeta}><span>QISKIT {experiment.qiskit_version}</span><span>AER {experiment.aer_version}</span><span>SEED {experiment.config.seed}</span><span>{experiment.circuit_count} CIRCUITS</span></div>
          <div className={styles.qberScale}><span>MEASURED ERROR RATE</span><span>0 — 50%</span></div>
          {experiment.measurements.map(m => <div className={styles.measurement} key={m.verifier}>
            <div><strong>{m.verifier}</strong><span>{m.errors} errors / {m.sifted.toLocaleString()} sifted bits</span><b className={m.accepted ? styles.passText : styles.failText}>{percent(m.qber)}</b></div>
            <div className={styles.barTrack}><div style={{ width: `${Math.min(100, m.qber * 200)}%` }} className={m.accepted ? styles.barClean : styles.barDanger} /><i style={{ left: `${experiment.cutoff * 200}%` }} /></div>
            <small>95% Wilson interval: {percent(m.interval_95[0])}–{percent(m.interval_95[1])}</small>
          </div>)}
          <div className={styles.channelPolicy}><span><i /> 11% illustrative cutoff</span><span>Expected: {percent(experiment.measurements[0].expected_qber)}</span></div>
          <button className={styles.circuitToggle} aria-expanded={circuitOpen} onClick={() => setCircuitOpen(!circuitOpen)}><Code2 size={15} /> Inspect actual circuit <ChevronDown size={15} /></button>
          {circuitOpen && <div className={styles.circuit}><p>Representative X-basis circuit. Other preparations and bases are sampled in balanced groups.</p><pre>{experiment.circuit_text}</pre><button onClick={() => downloadFile('ideal-preparation.qasm', experiment.circuit_qasm, 'text/plain')}>Download ideal circuit · OpenQASM 2 ↗</button><small>QASM exports ideal preparation and measurement; Aer noise instructions appear in the diagram and receipt configuration.</small></div>}
        </> : <div className={styles.channelEmpty}><div className={styles.miniCircuit}><span>|0⟩</span><i /><b>H</b><i /><b>CHANNEL</b><i /><ScanLine size={19} /></div><p>Live error rates, confidence intervals, and circuit evidence appear after sealing.</p><span>LOCAL AER SIMULATION · NO IBM ACCOUNT REQUIRED</span></div>}
      </div>
    </section>
    {events.length > 0 && <section className={styles.eventLog}><div><span className={styles.dot} /><strong>Experiment trace</strong><span>SESSION ONLY</span></div><ol>{events.map((event, index) => <li key={`${index}-${event}`}><span>{String(index + 1).padStart(2, '0')}</span>{event}</li>)}</ol></section>}
    <section id="how-it-works" className={styles.explainer}>
      <div className={styles.explainerTitle}><span className={styles.eyebrow}>THE IDEA, WITHOUT THE JARGON</span><h2>A crash-test lab<br />for digital trust.</h2><Link href="/workflow">Explore the research workflow <ArrowRight size={15} /></Link></div>
      <div className={styles.explainerSteps}>{[{ icon: FileImage, title: 'An image gets a fingerprint.', text: 'Hash decoded pixels and 64 tiles. Sign that fingerprint and the experiment with Ed25519, so an edited receipt cannot silently pass.' }, { icon: Sparkles, title: 'The channel gets a stress test.', text: 'Prepare four quantum states, add noise or Eve’s measure-and-resend attack, then measure with Qiskit Aer. Keep matching bases to calculate errors.' }, { icon: ShieldCheck, title: 'The evidence tells you what changed.', text: 'Check the signed receipt, compare image fingerprints, and apply a visible error policy to both simulated channels. Export the evidence for review.' }].map((item, index) => <div key={item.title}><span className={styles.explainIcon}><item.icon size={20} /></span><div><small>0{index + 1}</small><h3>{item.title}</h3><p>{item.text}</p></div></div>)}</div>
    </section>
    <details className={styles.modelNotes}><summary><FlaskConical size={15} /> What this experiment proves—and its limits <ChevronDown size={15} /></summary><div><p>This is a QDS-inspired teaching lab combining a BB84 channel experiment with a classical signed image manifest. It does not implement a complete QDS protocol or prove non-repudiation. The quantum channel experiment is bound to the receipt; image pixels are not sent through a quantum device.</p><p>Qiskit Aer runs on your computer. The seeded, balanced sampling is reproducible; no secret key is derived from its measurements. The 11% policy and Wilson intervals are educational diagnostics, not finite-key QDS security guarantees. Ed25519 and SHA-256 provide the classical receipt checks; this is not a claim of post-quantum signature security.</p><p>{capabilities?.persistent_key ? 'The server has a configured signing key.' : 'The default signing key lasts for one API process. A restart changes the issuer; previous receipts will be rejected. Configure IMAGE_LAB_SIGNING_KEY for consistent local receipts.'} Anyone with API access can request a receipt: it proves this server sealed these pixels, not a photographer’s identity or the truth of the image.</p><div className={styles.references}><a href="https://qiskit.github.io/qiskit-aer/" target="_blank" rel="noreferrer">Qiskit Aer documentation ↗</a><a href="https://arxiv.org/abs/1507.03333" target="_blank" rel="noreferrer">Practical QDS research ↗</a></div></div></details>
  </div>;
}
