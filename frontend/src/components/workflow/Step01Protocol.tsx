'use client';

import { ProtocolEntry } from '@/types/unifiedSimulation';
import { ArrowRight, Check, BookOpen, Radio, ShieldCheck, Layers } from 'lucide-react';
import styles from './workflow.module.css';

interface Props {
  protocols: ProtocolEntry[];
  selectedProtocol: string;
  onSelectProtocol: (id: string) => void;
  onNext: () => void;
}

const attackNames: Record<string, string> = {
  FORGERY: 'Forgery', REPUDIATION: 'Repudiation', INTERCEPT_RESEND: 'Intercept–resend',
  DETECTOR_COMPROMISE: 'Detector compromise', PNS_ATTACK: 'Photon splitting',
};
const modelNotes: Record<string, { description: string; focus: string[] }> = {
  practical_qds: { description: 'Prepare four-state channel material, inspect measured errors, and bind a text message to the recorded experiment. The reference path for this research workspace.', focus: ['State distribution', 'Channel sampling', 'Message evidence'] },
  mdi_qds: { description: 'Explore a measurement-device-independent architecture and its untrusted relay assumptions through a qualitative model.', focus: ['Untrusted relay', 'Detector assumptions'] },
  otuh_qds: { description: 'Explore the role of one-time universal hashing in quantum-signature research through a qualitative model.', focus: ['Universal hashing', 'Message signing'] },
  tf_qds: { description: 'Explore twin-field architecture and the effects of channel transmission through a qualitative model.', focus: ['Twin-field architecture', 'Channel transmission'] },
  decoy_qds: { description: 'Explore multi-intensity pulse settings and photon-splitting considerations through a qualitative model.', focus: ['Decoy intensities', 'Photon splitting'] },
};

export default function Step01Protocol({ protocols, selectedProtocol, onSelectProtocol, onNext }: Props) {
  const current = protocols.find(p => p.id === selectedProtocol);
  return <div>
    <div className={styles.sectionHeading}><div><span className={styles.overline}>01 / CONFIGURATION</span><h2>Choose your protocol</h2><p>Select a reference model for your experiment. You can configure its channel parameters in the next step.</p></div><span className={styles.countBadge}>{protocols.length} available models</span></div>
    {!protocols.length && <div className={styles.protocolEmpty}>The protocol catalogue is loading or unavailable. Check the connection status above.</div>}
    <div className={styles.protocolGrid} role="group" aria-label="Protocol selection">
      {protocols.map(p => {
        const selected = p.id === selectedProtocol;
        const reference = p.id === 'practical_qds';
        const Icon = reference ? ShieldCheck : Layers;
        const notes = modelNotes[p.id];
        return <button type="button" key={p.id} className={`${styles.protocolCard} ${reference ? styles.referenceCard : ''} ${selected ? styles.selectedCard : ''}`} aria-pressed={selected} onClick={() => onSelectProtocol(p.id)}>
          <div className={styles.protocolTop}><span className={styles.protocolIcon}><Icon size={20} strokeWidth={1.5} /></span><span className={styles.modelBadge}>{reference ? 'REFERENCE MODEL' : 'QUALITATIVE MODEL'}</span><span className={styles.selectIndicator}>{selected && <Check size={12} strokeWidth={3} />}</span></div>
          <div className={styles.protocolBody}><div><h3>{p.name}</h3><p>{notes?.description || p.description}</p></div>
            <div className={styles.threats}><span>MODEL FOCUS</span><div>{(notes?.focus || p.supported_attacks?.map(attack => attackNames[attack] || attack.replace(/_/g, ' ').toLowerCase()) || ['Protocol exploration']).map(focus => <span key={focus}>{focus}</span>)}</div></div>
          </div>
          <div className={styles.protocolFoot}><span><BookOpen size={13} />{p.citation || 'Literature-inspired research model'}</span><span><Radio size={13} />Configure in step 02</span></div>
        </button>;
      })}
    </div>
    <div className={styles.stepFooter}><div><span>SELECTED PROTOCOL</span><strong>{current?.name || 'Choose a model to continue'}</strong></div><button className={styles.primaryButton} disabled={!current} onClick={onNext}>Configure material <ArrowRight size={16} /></button></div>
  </div>;
}
