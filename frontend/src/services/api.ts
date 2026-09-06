import axios from 'axios';
import {
  KeygenRequest,
  KeygenResponse,
  SignRequest,
  SignResponse,
  VerifyRequest,
  VerifyResponse,
  AttackInjectRequest,
  AttackInjectResponse,
  SymmetrizeRequest,
  SymmetrizeResponse,
  MetricsResponse,
} from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

export const qdsApi = {
  // 1. Health check (at backend root)
  async checkHealth(): Promise<{ status: string; service: string; active_sessions: number; timestamp: number }> {
    const rootBase = API_BASE_URL.replace('/api/v1', '');
    const res = await axios.get(`${rootBase}/health`, { timeout: 3000 });
    return res.data;
  },

  // 2. Key Generation
  async keygen(params: KeygenRequest = {}): Promise<KeygenResponse> {
    const res = await api.post<KeygenResponse>('/simulate/keygen', {
      num_bits: params.num_bits ?? 16,
      parties: params.parties ?? ['alice', 'bob', 'charlie'],
      ...(params.session_id ? { session_id: params.session_id } : {}),
    });
    return res.data;
  },

  // 3. Signature Preparation
  async sign(params: SignRequest): Promise<SignResponse> {
    const res = await api.post<SignResponse>('/simulate/sign', {
      session_id: params.session_id,
      message: params.message ?? 'QDS-TRANSACTION-001',
      ...(params.message_digest ? { message_digest: params.message_digest } : {}),
      signer_public_key: params.signer_public_key ?? 'alice-authorized-master-key-001',
    });
    return res.data;
  },

  // 4. Verification & Hoeffding Threat Detection
  async verify(params: VerifyRequest): Promise<VerifyResponse> {
    const res = await api.post<VerifyResponse>('/simulate/verify', {
      session_id: params.session_id,
      verifier_id: params.verifier_id ?? 'bob',
      expected_public_key: params.expected_public_key ?? 'alice-authorized-master-key-001',
      shots: params.shots ?? 4096,
      apply_postselection: params.apply_postselection ?? true,
      ambiguity_margin: params.ambiguity_margin ?? 0.03,
    });
    return res.data;
  },

  // 5. Attack Injection
  async injectAttack(params: AttackInjectRequest): Promise<AttackInjectResponse> {
    const res = await api.post<AttackInjectResponse>('/attack/inject', {
      session_id: params.session_id,
      attack_type: params.attack_type,
      intensity: params.intensity ?? 0.45,
      ...(params.spoofed_public_key ? { spoofed_public_key: params.spoofed_public_key } : {}),
      ...(params.replay_age_seconds !== undefined ? { replay_age_seconds: params.replay_age_seconds } : {}),
      ...(params.asymmetry_rate !== undefined ? { asymmetry_rate: params.asymmetry_rate } : {}),
      ...(params.path_bias_intensity !== undefined ? { path_bias_intensity: params.path_bias_intensity } : {}),
      ...(params.target_verifier ? { target_verifier: params.target_verifier } : {}),
    });
    return res.data;
  },

  // 6. Symmetrization Guard (Module G)
  async symmetrize(params: SymmetrizeRequest): Promise<SymmetrizeResponse> {
    const res = await api.post<SymmetrizeResponse>('/symmetrize', {
      session_id: params.session_id,
      swap_ratio: params.swap_ratio ?? 0.5,
      ...(params.seed !== undefined ? { seed: params.seed } : {}),
    });
    return res.data;
  },

  // 7. Aggregate System Metrics
  async getMetrics(): Promise<MetricsResponse> {
    const res = await api.get<MetricsResponse>('/metrics');
    return res.data;
  },
};
