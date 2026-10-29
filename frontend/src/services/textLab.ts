import { ChannelConfig, Experiment } from './imageLab';

export type TextReceipt = {
  algorithm: 'Ed25519'; signature: string;
  manifest: { version: 'qds-text-lab/v1'; receipt_id: string; issued_at: string; key_id: string;
    message_sha256: string; utf8_bytes: number; experiment: Experiment };
};
export type TextVerification = {
  signature_valid: boolean; message_matches: boolean; candidate_sha256: string;
  verdict: 'VERIFIED' | 'MESSAGE_CHANGED' | 'CHANNEL_REJECTED' | 'UNTRUSTED_RECEIPT';
  explanation: string;
  verifiers: { verifier: string; accepted: boolean; channel_accepted: boolean; qber: number }[];
};
const API = (process.env.NEXT_PUBLIC_API_URL || '/api/v1').replace(/\/$/, '');
async function request<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${API}/text-lab/${path}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body), signal: AbortSignal.timeout(60000),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(typeof error.detail === 'string' ? error.detail : `Request failed (${response.status}). Use at most 4,096 characters and check the API connection.`);
  }
  return response.json();
}
export const textLab = {
  seal: (message: string, config: ChannelConfig) => request<TextReceipt>('seal', { message, config }),
  verify: (message: string, receipt: TextReceipt) => request<TextVerification>('verify', { message, receipt }),
};
