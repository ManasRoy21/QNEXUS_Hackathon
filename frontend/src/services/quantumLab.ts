export type ExchangeConfig = { pulses: number; seed: number; noise: number; interception: number; message: string };
export type BellConfig = { shots: number; seed: number; noise: number; interception: number; state: 'bell' | 'product' };
export type Pulse = { index: number; alice_bit: number; alice_basis: string; bob_basis: string; bob_bit: number; intercepted: boolean; eve_basis: string | null; eve_bit: number | null; sifted: boolean; tested: boolean };
export type ExchangeResult = {
  execution: string; backend: string; scope: string; verdict: string; explanation: string;
  transmitted: number; sifted: number; tested: number; retained: number; errors: number; qber: number; interval_95: number[];
  circuit_count: number; circuit_text: string; pulse_preview: Pulse[]; illustrative_key_budget?: number; budget_note?: string;
  reconciliation: null | { disclosed_bits: number; corrected_bits: number; verification_bits: number; matches: boolean; passes: { block_size: number; corrected: number }[] };
  key: null | { alice_hex: string; bob_hex: string; bits: number; method: string; public_toeplitz_seed: string };
  encryption: null | { algorithm: string; nonce: string; ciphertext: string; plaintext: string };
};
export type BellResult = {
  s: number; interval_95: number[]; local_bound: number; quantum_max: number; violation_supported: boolean;
  verdict: string; confidence_note: string; settings: { setting: string; counts: Record<string, number>; shots: number; correlation: number }[];
  execution?: string; backend?: string; circuit_text?: string; expected_s?: number; scope?: string;
};
export type HardwareStatus = { available: boolean; backend: string | null; explanation: string; scope: string };
export type HardwareJob = { job_id: string; status: string; backend: string; execution: string; result?: BellResult | null; explanation?: string };
const API = (process.env.NEXT_PUBLIC_API_URL || '/api/v1').replace(/\/$/, '');
async function request<T>(path: string, body?: unknown, operator?: string): Promise<T> {
  const response = await fetch(`${API}/quantum-lab${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(operator ? { 'X-Quantum-Operator': operator } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(120000),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(typeof data.detail === 'string' ? data.detail : `Request rejected (${response.status}). Check the settings and connection.`);
  }
  return response.json();
}
export const quantumLab = {
  exchange: (config: ExchangeConfig) => request<ExchangeResult>('/key-exchange', config),
  bell: (config: BellConfig) => request<BellResult>('/bell', config),
  check: (key_hex: string, nonce: string, ciphertext: string) => request<{ authenticated: boolean; plaintext: string | null }>('/message-check', { key_hex, nonce, ciphertext }),
  hardware: () => request<HardwareStatus>('/hardware'),
  submit: (shots: number, password: string) => request<HardwareJob>('/hardware/jobs', { shots, confirm_hardware_use: true }, password),
  job: (id: string, password: string) => request<HardwareJob>(`/hardware/jobs/${encodeURIComponent(id)}`, undefined, password),
};
