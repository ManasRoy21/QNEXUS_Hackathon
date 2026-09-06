// ============================================================================
// TypeScript Schema Definitions for QDS Threat Detection Frontend & API
// Synchronized 1:1 with backend/app/schemas/qds_schemas.py (Day 8 Module E)
// ============================================================================

export type AttackType =
  | 'INTERCEPT_RESEND'
  | 'FORGERY'
  | 'IMPERSONATION'
  | 'REPLAY'
  | 'REPUDIATION'
  | 'DETECTOR_SIDE_CHANNEL'
  | 'INTERCEPT_RESEND_EAVESDROPPING'
  | 'FORGERY_ATTEMPT'
  | 'IMPERSONATION_ATTEMPT'
  | 'REPLAY_ATTACK'
  | 'REPUDIATION_ATTACK';

export type SecurityVerdict = 'SECURE' | 'THREAT DETECTED';
export type ThreatSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface KeygenRequest {
  session_id?: string;
  num_bits?: number;
  parties?: string[];
}

export interface KeygenResponse {
  status: string;
  session_id: string;
  num_bits: number;
  bell_pairs_generated: number;
  parties: string[];
  timestamp: number;
  message: string;
}

export interface SignRequest {
  session_id: string;
  message?: string;
  message_digest?: string;
  signer_public_key?: string;
}

export interface SignResponse {
  status: string;
  session_id: string;
  digest: string;
  target_bases: ('Z' | 'X')[];
  pauli_states: ('0' | '1' | '+' | '-')[];
  signer_public_key: string;
  timestamp: number;
  nonce: string;
  message: string;
}

export interface VerifyRequest {
  session_id: string;
  verifier_id?: 'bob' | 'charlie' | 'both';
  expected_public_key?: string;
  shots?: number;
  apply_postselection?: boolean;
  ambiguity_margin?: number;
}

export interface SingleVerifierReport {
  qber: number;
  fidelity: number;
  e_rob: number;
  e_rep: number;
  e_forg: number;
  threat_detected: boolean;
  primary_attack_vector: string;
  severity: ThreatSeverity;
  reason_codes: string[];
  diagnostic_message: string;
  postselected_shots: number;
  discarded_shots: number;
}

export interface VerifyResponse {
  status: string;
  session_id: string;
  verifier_id: string;
  threat_detected: boolean;
  verdict: SecurityVerdict;
  primary_attack_vector: string;
  severity: ThreatSeverity;
  qber: number;
  fidelity: number;
  e_rob: number;
  e_rep: number;
  e_forg: number;
  hoeffding_threshold: number;
  reason_codes: string[];
  diagnostic_message: string;
  postselected_shots: number;
  discarded_shots: number;
  both_reports?: {
    bob?: SingleVerifierReport;
    charlie?: SingleVerifierReport;
    disagreement?: boolean;
    disagreement_explanation?: string;
  };
}

export interface AttackInjectRequest {
  session_id: string;
  attack_type: AttackType | string;
  intensity?: number;
  spoofed_public_key?: string;
  replay_age_seconds?: number;
  asymmetry_rate?: number;
  path_bias_intensity?: number;
  target_verifier?: 'bob' | 'charlie';
}

export interface AttackInjectResponse {
  status: string;
  session_id: string;
  attack_type: string;
  intensity: number;
  description: string;
  metadata: Record<string, any>;
}

export interface SymmetrizeRequest {
  session_id: string;
  swap_ratio?: number;
  seed?: number;
}

export interface SymmetrizeResponse {
  status: string;
  session_id: string;
  swap_count: number;
  total_bits: number;
  swap_ratio_actual: number;
  alice_informed: boolean;
  swap_indices: number[];
  message: string;
}

export interface LiveTelemetryMessage {
  timestamp: number;
  event_type:
    | 'CONNECTED'
    | 'KEYGEN'
    | 'SIGN'
    | 'STATE_PREPARATION'
    | 'CHANNEL_TRANSIT'
    | 'ATTACK_INJECT'
    | 'SYMMETRIZE'
    | 'POSTSELECTION'
    | 'VERIFY_STEP'
    | 'VERDICT'
    | 'COMPLETE'
    | string;
  session_id: string;
  qber: number;
  hoeffding_threshold: number;
  active_threat: string;
  severity: ThreatSeverity | string;
  channel_telemetry: {
    message?: string;
    shots?: number;
    postselected?: number;
    discarded?: number;
    disagreement?: boolean;
    bob_qber?: number;
    charlie_qber?: number;
    [key: string]: any;
  };
}

export interface MetricsResponse {
  total_simulations: number;
  total_verifications: number;
  threats_detected: number;
  clean_runs: number;
  detection_rate: number;
  average_qber: number;
  active_sessions: number;
  supported_attack_classes: string[];
}

export interface HistogramDataPoint {
  state: string;
  count: number;
  type?: 'correlated' | 'error' | string;
}

export interface QBERHistoryPoint {
  time: string;
  qber: number;
  e_rob: number;
  e_rep: number;
  e_forg?: number;
  threat: string;
}
