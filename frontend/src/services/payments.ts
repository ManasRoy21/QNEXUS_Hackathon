import { downloadFile } from './imageLab';

export type Instruction = { version: string; session_id: string; transaction_id: string; nonce: string; sender_bank: string; receiver_bank: string; payer: string; payee: string; amount_paise: number; currency: string; issued_at: number; expires_at: number };
export type Envelope = { version: string; suite: string; session_id: string; sender_key_id: string; receiver_key_id: string; kem_ciphertext: string; nonce: string; ciphertext: string };
export type Sandbox = { session_id: string; session_token: string; expires_at: number; balances: Record<string, number>; public_keys: Record<string, string>; key_ids: Record<string, string>; suite: string; scope: string; storage: string };
export type Draft = { instruction: Instruction; envelope: Envelope; metrics: Record<string, number>; explanation: string };
export type SignedReceipt = { receipt: Record<string, unknown>; signature: string };
export type Decision = { accepted: boolean; verdict: string; explanation: string; balances: Record<string, number>; metrics: Record<string, number>; receipt: SignedReceipt | null; scope: string };
export type Attack = 'amount' | 'beneficiary' | 'expired' | 'ciphertext';
export type Trial = { name: string; decision: Decision; injection?: string };
type Timing = { median_ms: number; p95_ms: number };
type BenchRow = { sign: Timing; verify: Timing; key_establishment: Timing; signature_bytes: number; signing_public_key_bytes: number; key_exchange_wire_bytes: number };
export type Benchmark = { classical: BenchRow; post_quantum: BenchRow; samples: number; cryptography_version: string; note: string };
const API = (process.env.NEXT_PUBLIC_API_URL || '/api/v1').replace(/\/$/, '');
async function request<T>(path: string, session?: Sandbox, body?: unknown): Promise<T> {
  const response = await fetch(`${API}/payments${path}`, { method: body === undefined ? 'GET' : 'POST',
    headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(session ? { 'X-Sandbox-Token': session.session_token } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(60000), cache: 'no-store' });
  if (!response.ok) { const data = await response.json().catch(() => ({})); throw new Error(typeof data.detail === 'string' ? data.detail : `Gateway request failed (${response.status}).`); }
  return response.json();
}
const route = (s: Sandbox, suffix = '') => `/sessions/${s.session_id}${suffix}`;
export const payments = {
  create: () => request<Sandbox>('/sessions', undefined, {}),
  snapshot: (s: Sandbox) => request<{ balances: Record<string, number>; ledger: SignedReceipt[] }>(route(s), s),
  draft: (s: Sandbox, amount: number) => request<Draft>(route(s, '/draft'), s, { amount_paise: amount, payee: 'rahul@demo' }),
  receive: (s: Sandbox, envelope: Envelope) => request<Decision>(route(s, '/receive'), s, { envelope }),
  attack: (s: Sandbox, envelope: Envelope, kind: Attack) => request<{ envelope: Envelope; model: string }>(route(s, '/attack'), s, { envelope, kind }),
  verifyReceipt: (s: Sandbox, receipt: SignedReceipt) => request<{ valid: boolean; algorithm: string }>(route(s, '/verify-receipt'), s, receipt),
  benchmark: (s: Sandbox) => request<Benchmark>(route(s, '/benchmark'), s, {}),
};
export function exportPaymentEvidence(session: Sandbox, draft: Draft | null, trials: Trial[], benchmark: Benchmark | null) {
  // Deliberately whitelist public fields. Session tokens and private keys are never exported.
  downloadFile('qnexus-payment-evidence.json', JSON.stringify({ version: 'qnexus-gateway-evidence/v1', exported_at: new Date().toISOString(),
    sandbox: { session_id: session.session_id, public_keys: session.public_keys, key_ids: session.key_ids, suite: session.suite, scope: session.scope }, draft, trials, benchmark }, null, 2));
}
