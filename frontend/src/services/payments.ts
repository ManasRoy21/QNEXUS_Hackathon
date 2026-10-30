import { downloadFile } from './imageLab';
import { Receipt } from './imageLab';
import { TextReceipt } from './textLab';

export type Binding = { invoice_reference: string; revision: number; invoice_pixel_sha256: string; invoice_file_sha256: string; approval_sha256: string; invoice_receipt_sha256: string; approval_receipt_sha256: string; receipt_algorithm: 'Ed25519' };
export type PaymentCase = { case_id: string; transaction_id: string; amount_paise: number; payee: string; invoice_reference: string; revision: number; invoice_receipt: Receipt | null; approval_receipt: TextReceipt | null; expected_approval: string | null; evidence_binding: Binding | null; phase: string; document_signer: {algorithm:'Ed25519';key_id:string;public_key:string} };
export type Candidate = { image_base64: string; approval_text: string };
export type Instruction = { version: string; session_id: string; transaction_id: string; nonce: string; sender_bank: string; receiver_bank: string; payer: string; payee: string; amount_paise: number; currency: string; issued_at: number; expires_at: number; evidence: Binding };
export type Envelope = { version: string; suite: string; session_id: string; sender_key_id: string; receiver_key_id: string; kem_ciphertext: string; nonce: string; ciphertext: string };
export type Sandbox = { session_id: string; session_token: string; expires_at: number; balances: Record<string, number>; public_keys: Record<string, string>; key_ids: Record<string, string>; suite: string; scope: string; storage: string };
export type Draft = { instruction: Instruction; envelope: Envelope; metrics: Record<string, number>; explanation: string; evidence: PaymentCase; evidence_check: EvidenceCheck };
export type EvidenceCheck = { valid: boolean; verdict: string; explanation: string; binding?: Binding };
export type SignedReceipt = { receipt: Record<string, unknown>; signature: string };
export type Decision = { accepted: boolean; verdict: string; explanation: string; balances: Record<string, number>; metrics: Record<string, number>; receipt: SignedReceipt | null; scope: string; evidence_check?: EvidenceCheck };
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
  createCase: (s: Sandbox, amount: number, invoice_reference: string) => request<PaymentCase>(route(s,'/cases'),s,{ amount_paise:amount,payee:'rahul@demo',invoice_reference }),
  sealInvoice: (s: Sandbox, c: PaymentCase, image_base64: string) => request<PaymentCase>(route(s,`/cases/${c.case_id}/invoice`),s,{image_base64}),
  sealApproval: (s: Sandbox, c: PaymentCase, message: string) => request<PaymentCase>(route(s,`/cases/${c.case_id}/approval`),s,{message}),
  draft: (s: Sandbox, c: PaymentCase, candidate: Candidate) => request<Draft>(route(s, '/draft'), s, { amount_paise:c.amount_paise,payee:c.payee,invoice_reference:c.invoice_reference,case_id:c.case_id,candidate }),
  receive: (s: Sandbox, envelope: Envelope, candidate: Candidate) => request<Decision>(route(s, '/receive'), s, { envelope,candidate }),
  attack: (s: Sandbox, envelope: Envelope, kind: Attack) => request<{ envelope: Envelope; model: string }>(route(s, '/attack'), s, { envelope, kind }),
  verifyReceipt: (s: Sandbox, receipt: SignedReceipt) => request<{ valid: boolean; algorithm: string }>(route(s, '/verify-receipt'), s, receipt),
  benchmark: (s: Sandbox) => request<Benchmark>(route(s, '/benchmark'), s, {}),
};
export function exportPaymentEvidence(session: Sandbox, draft: Draft | null, trials: Trial[], benchmark: Benchmark | null) {
  // Deliberately whitelist public fields. Session tokens and private keys are never exported.
  downloadFile('qnexus-payment-evidence.json', JSON.stringify({ version: 'qnexus-linked-payment-evidence/v2', exported_at: new Date().toISOString(),
    sandbox: { session_id: session.session_id, public_keys: session.public_keys, key_ids: session.key_ids, suite: session.suite, scope: session.scope }, draft, trials, benchmark }, null, 2));
}
