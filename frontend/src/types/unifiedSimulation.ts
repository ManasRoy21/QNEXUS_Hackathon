/**
 * Canonical Unified Frontend Simulation Types.
 * Models the entire 6-step workflow:
 * 01 PROTOCOL -> 02 MATERIAL -> 03 SIGNING -> 04 ATTACK -> 05 SWEEPS -> 06 STAT BOUNDS
 */

export type ProtocolCategory = 'experimental_hardware' | 'theoretical';

export interface ProtocolEntry {
  id: string;
  name: string;
  category: ProtocolCategory;
  description: string;
  citation: string;
  status: string;
  is_interactive: boolean;
  default_config: {
    distance_km: number;
    num_bits: number;
    source_rate_mhz: number;
  };
  supported_attacks: string[];
}

export interface MaterialGenerationRequest {
  protocol: string;
  pulse_count: number;
  distance_km: number;
  fiber_attenuation?: number;
  detector_efficiency?: number;
  dark_count_rate?: number;
  baseline_qber?: number;
  beta?: number;
  authentication_threshold?: number;
  verification_threshold?: number;
  seed?: number;
}

export interface CanonicalSimulationState {
  simulation_id: string;
  seed: number;
  protocol: string;
  model_version: string;
  configuration: {
    pulse_count: number;
    distance_km: number;
    fiber_attenuation: number;
    detector_efficiency: number;
    dark_count_rate: number;
    baseline_qber: number;
    beta: number;
    authentication_threshold: number;
    verification_threshold: number;
  };
  material: {
    bob_conclusive_bits: string;
    charlie_conclusive_bits: string;
    test_bits: {
      beta: number;
      bob_test_count: number;
      charlie_test_count: number;
      sample_test_indices_bob: number[];
      sample_test_indices_charlie: number[];
    };
    untested_bits: {
      M_u_bob: number;
      M_u_charlie: number;
      total_M_u: number;
      sample_untested_bits_bob: string;
      sample_untested_bits_charlie: string;
    };
  };
  measurement_statistics: {
    transmitted_pulses: number;
    detected_events: number;
    conclusive_count_bob: number;
    conclusive_count_charlie: number;
    mismatch_count_bob: number;
    mismatch_count_charlie: number;
    qber_bob: number;
    qber_charlie: number;
  };
  signing?: {
    message: string;
    sha256_hash: string;
    signature_length: number;
  };
  model_metadata?: {
    model_name: string;
    model_version: string;
    assumptions: string[];
    simplifications: string[];
  };
}

export interface FourLayerExplanation {
  layer_1_attacker_action: string;
  layer_2_physical_effect: string;
  layer_3_observable_effect: string;
  layer_4_security_consequence: string;
}

export interface MathematicalModel {
  formula: string;
  inputs: Record<string, any>;
  intermediate_calculation: string;
  final_result: any;
  interpretation: string;
}

export interface AttackSimulationResponse {
  simulation_id: string;
  seed?: number;
  protocol: string;
  attack: string;
  model_status: 'QUANTITATIVE' | 'QUALITATIVE' | 'UNIMPLEMENTED';
  applicable: boolean;
  verdict: string;
  attack_detected?: boolean;
  protocol_resisted?: boolean;
  model_version?: string;
  timestamp: string;
  four_layer_explanation?: FourLayerExplanation;
  mathematical_model?: MathematicalModel;
  reason?: string;
  references?: string[];
  metadata?: Record<string, any>;
}

export interface SweepConfiguration {
  simulation_id?: string;
  protocol: string;
  attack?: string;
  parameter_name: string;
  min: number;
  max: number;
  step: number;
  fixed_parameters?: Record<string, any>;
  seed: number;
  pulse_count?: number;
}

export interface SweepPointResult {
  parameter_value: number;
  seed: number;
  simulation_id: string;
  qber_bob: number;
  qber_charlie: number;
  conclusive_count_bob: number;
  conclusive_count_charlie: number;
  conclusive_rate_bob: number;
  M_u: number;
  n_test: number;
  attack?: string;
  attack_applicable?: boolean;
  model_status?: string;
  verdict?: string;
  attack_detected?: boolean;
  protocol_resisted?: boolean;
  epsilon_1?: number;
  epsilon_2?: number;
  epsilon_sec?: number;
  qber_obs?: number;
  signature_rate?: number;
  signature_rate_formula?: string;
  metric_name?: string;
  metric_value?: number;
  details?: Record<string, any>;
}

export interface SweepSeries {
  series_id: string;
  name: string;
  metric: string;
  x_label: string;
  y_label: string;
  points: Array<{ x: number; y: number }>;
}

export interface SweepResponse {
  simulation_id?: string;
  protocol: string;
  parameter: string;
  parameter_name?: string;
  attack?: string;
  min_value?: number;
  max_value?: number;
  step?: number;
  fixed_parameters?: Record<string, any>;
  seed?: number;
  points: SweepPointResult[];
  results?: SweepPointResult[];
  series?: SweepSeries[];
  summary: Record<string, any>;
  model_version: string;
}

export type SweepResult = SweepResponse;

export interface BenchmarkResult {
  benchmark_id: string;
  protocol: string;
  distance_km: number;
  pulse_count: number;
  signature_rate_bps: number;
  qber: number;
  unforgeability_bound?: number;
  repudiation_bound?: number;
  security_standard: string;
  timestamp: number;
}

export interface StatisticalBoundRequest {
  method: string;
  simulation_id?: string;
  sample_size?: number;
  delta?: number;
  observed_rate?: number;
  population_size?: number;
  parameters?: Record<string, any>;
}

export interface StatisticalBoundResponse {
  method: string;
  formula: string;
  inputs: Record<string, any>;
  substitution?: string;
  calculation_steps?: string[];
  intermediate_calculation: string;
  result?: number;
  final_bound: number;
  failure_probability: number;
  confidence?: number;
  interpretation: string;
  simulation_id?: string;
  scientific_disclaimer?: string;
  details?: Record<string, any>;
  model_version: string;
}


export interface UnifiedWorkflowState {
  currentStep: number; // 1 to 6
  protocol: string;
  simulationState: CanonicalSimulationState | null;
  signingState: {
    message: string;
    hash: string;
    signatureTokens: string[];
    isSigned: boolean;
    bobVerified: boolean | null;
    charlieVerified: boolean | null;
  } | null;
  selectedAttack: string;
  attackIntensity: number;
  attackResult: AttackSimulationResponse | null;
  sweepConfig: {
    parameter: string;
    values: number[];
    attack: string;
  };
  sweepResult: SweepResponse | null;
  statBoundResult: StatisticalBoundResponse | null;
}
