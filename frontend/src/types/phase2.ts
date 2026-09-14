export interface ProtocolInfo {
  id: string;
  name: string;
  status: string;
  category: 'experimental' | 'theoretical';
  is_interactive: boolean;
  description: string;
  year?: string;
  key_strength?: string;
  best_result?: string;
  citation?: string;
  supported_parameters?: {
    distance_km?: { min: number; max: number; default: number };
    channel_loss_db?: { min: number; max: number; default: number };
    message_size_bytes?: { min: number; max: number; default: number };
    decoy_state_count?: { min: number; max: number; default: number };
    failure_probability?: { min: number; max: number; default: number };
  };
}

export interface ProtocolCatalogueResponse {
  total: number;
  protocols: ProtocolInfo[];
  simulated_disclosure: string;
}

export interface CreateSessionRequest {
  protocol_id: string;
  distance_km?: number;
  channel_loss_db?: number;
  message_size_bytes?: number;
  decoy_state_count?: number;
  failure_probability?: number;
  untrusted_node_compromised?: boolean;
}

export interface TraceEvent {
  step: string;
  description: string;
  timestamp: number;
  data: Record<string, any>;
}

export interface KeyMaterialData {
  raw_key_length: number;
  effective_key_rate_bps: number;
  quantum_bit_error_rate: number;
  channel_loss_db: number;
  distance_km: number;
  generation_latency_ms: number;
  decoy_statistics?: Record<string, any>;
  metadata?: Record<string, any>;
  is_simulated: boolean;
}

export interface SignatureData {
  signature_id: string;
  message_digest: string;
  message_size_bytes: number;
  signature_tokens: string[];
  signer_public_key: string;
  signer_role: string;
  signing_latency_ms: number;
  key_consumed_bits: number;
  key_to_message_ratio: number;
  algorithm_details?: Record<string, any>;
  is_simulated: boolean;
}

export interface VerificationData {
  verifier_role: string;
  verdict: 'ACCEPT' | 'REJECT';
  is_valid: boolean;
  qber: number;
  disagreement_rate: number;
  security_threshold: number;
  reason_code: string;
  reasoning_trace: string[];
  internal_checks: Record<string, any>;
  verification_latency_ms: number;
  untrusted_node_status?: string;
  is_simulated: boolean;
}

export interface AttackData {
  attack_type: string;
  attack_detected: boolean;
  protocol_resisted: boolean;
  verdict: string;
  reason_code: string;
  explanation: string;
  resulting_qber: number;
  resulting_verdict_bob: string;
  resulting_verdict_charlie: string;
  is_simulated: boolean;
}

export interface SessionState {
  session_id: string;
  protocol_id: string;
  protocol_name: string;
  distance_km: number;
  channel_loss_db: number;
  message_size_bytes: number;
  untrusted_node_compromised: boolean;
  status: string;
  key_material?: KeyMaterialData | null;
  signature?: SignatureData | null;
  bob_verification?: VerificationData | null;
  charlie_verification?: VerificationData | null;
  transfer_status?: string | null;
  last_attack?: AttackData | null;
  protocol_trace: TraceEvent[];
  is_simulated: boolean;
  created_at: number;
}

export interface BenchmarkPoint {
  distance_km: number;
  channel_loss_db: number;
  effective_key_rate_bps: number;
  simulated_qber: number;
  signing_latency_ms: number;
  verification_latency_ms: number;
  key_consumed_bits: number;
  key_to_message_ratio: number;
  verdict: string;
}

export interface ProtocolBenchmarkSeries {
  protocol_id: string;
  protocol_name: string;
  points: BenchmarkPoint[];
}

export interface BenchmarkSweepResponse {
  sweep_id: string;
  parameters: {
    protocol_ids: string[];
    distance_points_km: number[];
    message_size_bytes: number;
  };
  series: ProtocolBenchmarkSeries[];
  total_execution_time_ms: number;
  is_simulated: boolean;
}
