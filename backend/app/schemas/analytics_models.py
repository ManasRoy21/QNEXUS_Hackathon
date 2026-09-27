"""Analytics, Benchmark, and Parameter Sweep Schemas (Phase 4).

Covers:
  - SweepConfiguration: input configuration specifying sweep bounds/step/parameters
  - SweepPointResult: single evaluated physical/security simulation point
  - SweepSeries: multi-point metric series for graphing
  - SweepResponse / SweepResult: complete aggregated parameter sweep results
  - BenchmarkResult: protocol comparison and performance benchmarks
  - StatisticalBoundRequest & StatisticalBoundResponse: concentration bounds
"""

from __future__ import annotations

import math
from typing import Any, Dict, List, Optional, Union
from pydantic import BaseModel, ConfigDict, Field, model_validator


class SweepConfiguration(BaseModel):
    """Configuration for executing a multi-point parameter sweep."""

    model_config = ConfigDict(populate_by_name=True)

    simulation_id: Optional[str] = Field(
        default=None,
        description="Optional base simulation ID to inherit physical configuration from.",
    )
    protocol: str = Field(
        default="practical_qds",
        description="Target protocol identifier (e.g. 'practical_qds', 'mdi_qds', 'otuh_qds').",
    )
    attack: Optional[str] = Field(
        default=None,
        description="Attack vector to evaluate at each point (e.g., 'FORGERY', 'REPUDIATION', 'INTERCEPT_RESEND').",
    )
    parameter_name: str = Field(
        ...,
        description="Parameter name to sweep over: 'distance_km', 'pulse_count', 'intensity' (gamma), 'tv', 'ta', 'beta', 'baseline_qber'.",
    )
    min_value: float = Field(
        default=0.0,
        alias="min",
        description="Minimum parameter boundary value.",
    )
    max_value: float = Field(
        default=1.0,
        alias="max",
        description="Maximum parameter boundary value.",
    )
    step: float = Field(
        default=0.1,
        gt=0.0,
        description="Step increment between consecutive sweep points.",
    )
    fixed_parameters: Dict[str, Any] = Field(
        default_factory=dict,
        description="Constant parameters held fixed across the sweep.",
    )
    seed: int = Field(
        default=42,
        description="Deterministic RNG seed for reproducibility.",
    )
    pulse_count: int = Field(
        default=2000,
        ge=64,
        le=50000,
        description="Pulse count per party if not the swept parameter.",
    )


class SweepRequest(BaseModel):
    """Request payload for running a multi-point parameter sweep."""

    model_config = ConfigDict(populate_by_name=True)

    protocol: str = Field(
        default="practical_qds",
        description="Protocol identifier (e.g., 'practical_qds').",
    )

    parameter: str = Field(
        ...,
        description=(
            "Parameter to sweep over: 'distance_km', 'pulse_count', 'baseline_qber', "
            "'detector_efficiency', 'dark_count_rate', 'beta', 'authentication_threshold', "
            "'verification_threshold', 'intensity' (or 'gamma'), 'delta'."
        ),
    )
    values: Optional[List[float]] = Field(
        default=None,
        min_length=1,
        max_length=50,
        description="Explicit list of values to evaluate (max 50 points). Generated from min/max/step if omitted.",
    )
    min_value: Optional[float] = Field(default=None, alias="min")
    max_value: Optional[float] = Field(default=None, alias="max")
    step: Optional[float] = Field(default=None)

    pulse_count: int = Field(
        default=2000,
        ge=64,
        le=50000,
        description="Base pulse count for state distribution if not the swept parameter.",
    )
    seed: int = Field(
        default=42,
        description="Base deterministic seed for the sweep.",
    )
    attack: Optional[str] = Field(
        default=None,
        description="Optional attack to evaluate at each point (e.g., 'FORGERY', 'REPUDIATION', 'INTERCEPT_RESEND').",
    )
    attack_parameters: Dict[str, Any] = Field(
        default_factory=dict,
        description="Additional parameters passed to the attack dispatcher (e.g. {'delta': 0.005}).",
    )
    # Default base configurations
    distance_km: float = Field(default=25.0, ge=0.0)
    baseline_qber: float = Field(default=0.010, ge=0.0, le=0.5)
    detector_efficiency: float = Field(default=0.93, gt=0.0, le=1.0)
    dark_count_rate: float = Field(default=1.0e-7, ge=0.0, le=1.0e-2)
    beta: float = Field(default=0.30, gt=0.0, lt=1.0)
    authentication_threshold: float = Field(default=0.0150, ge=0.0, le=0.5)
    verification_threshold: float = Field(default=0.0645, ge=0.0, le=0.5)
    intensity: float = Field(default=1.0, ge=0.0, le=1.0)

    @model_validator(mode="after")
    def populate_values_if_range_provided(self) -> "SweepRequest":
        if not self.values:
            if self.min_value is not None and self.max_value is not None and self.step is not None:
                if self.step <= 0:
                    raise ValueError("Sweep step must be strictly positive.")
                if self.max_value < self.min_value:
                    raise ValueError("Sweep max value cannot be less than min value.")
                num_points = int(math.floor((self.max_value - self.min_value) / self.step)) + 1
                if num_points > 50:
                    raise ValueError(f"Sweep step yields {num_points} points, exceeding max 50 points limit.")
                vals = [round(self.min_value + i * self.step, 6) for i in range(num_points)]
                if vals and vals[-1] < self.max_value - 1e-9 and len(vals) < 50:
                    vals.append(round(self.max_value, 6))
                self.values = vals
            else:
                raise ValueError("Must provide either 'values' list or 'min', 'max', and 'step' range.")
        return self


class SweepPointResult(BaseModel):
    """Single point in a parameter sweep evaluated against the real simulation model."""

    parameter_value: float
    seed: int
    simulation_id: str
    qber_bob: float
    qber_charlie: float
    conclusive_count_bob: int
    conclusive_count_charlie: int
    conclusive_rate_bob: float
    M_u: int
    n_test: int
    attack: Optional[str] = None
    attack_applicable: Optional[bool] = None
    model_status: Optional[str] = None  # QUANTITATIVE, QUALITATIVE, UNIMPLEMENTED, NONE
    verdict: Optional[str] = None
    attack_detected: Optional[bool] = None
    protocol_resisted: Optional[bool] = None
    # Security metrics
    epsilon_1: Optional[float] = None
    epsilon_2: Optional[float] = None
    epsilon_sec: Optional[float] = None
    qber_obs: Optional[float] = None
    signature_rate: Optional[float] = None  # R = M_u / (2N)
    signature_rate_formula: Optional[str] = None
    metric_name: Optional[str] = None
    metric_value: Optional[float] = None
    details: Dict[str, Any] = Field(default_factory=dict)


class SweepSeries(BaseModel):
    """Graph series containing ordered coordinate pairs for visualization."""

    series_id: str
    name: str
    metric: str
    x_label: str
    y_label: str
    points: List[Dict[str, Any]] = Field(default_factory=list)


class SweepResponse(BaseModel):
    """Complete aggregated response for a parameter sweep."""

    simulation_id: Optional[str] = None
    protocol: str
    parameter: str
    parameter_name: Optional[str] = None
    attack: Optional[str] = None
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    step: Optional[float] = None
    fixed_parameters: Dict[str, Any] = Field(default_factory=dict)
    seed: int = 42
    points: List[SweepPointResult] = Field(default_factory=list)
    results: Optional[List[SweepPointResult]] = None
    series: List[SweepSeries] = Field(default_factory=list)
    summary: Dict[str, Any] = Field(default_factory=dict)
    model_version: str = "qds_sweep_v1"

    @model_validator(mode="after")
    def sync_aliases(self) -> "SweepResponse":
        if self.parameter_name is None:
            self.parameter_name = self.parameter
        if self.results is None:
            self.results = self.points
        return self


# Alias for canonical architecture
SweepResult = SweepResponse


class BenchmarkResult(BaseModel):
    """Comparative performance benchmark entry."""

    benchmark_id: str
    protocol: str
    distance_km: float
    pulse_count: int
    signature_rate_bps: float
    qber: float
    unforgeability_bound: Optional[float] = None
    repudiation_bound: Optional[float] = None
    security_standard: str = "Chernoff & Hoeffding Concentration (Zero ML)"
    timestamp: float


class StatisticalBoundRequest(BaseModel):
    """Request to compute a rigorous statistical bound.
    
    Supports the 4 analytical modes:
      1. HOEFFDING: P(|X̄ - E[X]| >= ε) <= 2 exp(-2nε²)
      2. CHERNOFF: P(X <= (1-δ)μ) <= exp(-δ²μ/2)
      3. RANDOM_SAMPLING: Practical QDS test-bit vs untested register finite sampling
      4. PROTOCOL_BOUND: Protocol information-theoretic security bound (forgery, repudiation, ε_sec)
    """

    model_config = ConfigDict(extra="allow", populate_by_name=True)

    method: str = Field(
        ...,
        description="Statistical analytical mode: 'HOEFFDING', 'CHERNOFF', 'RANDOM_SAMPLING', 'PROTOCOL_BOUND'.",
    )
    simulation_id: Optional[str] = Field(
        default=None,
        description="Optional simulation_id to automatically retrieve physical parameters from stored state.",
    )
    observed_rate: Optional[float] = Field(
        default=None,
        ge=0.0,
        le=1.0,
        description="Empirical observed error rate or sample mean (e.g. 0.012).",
    )
    sample_size: Optional[int] = Field(
        default=None,
        ge=1,
        description="Number of sampled bits / trials (e.g. n, n_test or M_u).",
    )
    delta: Optional[float] = Field(
        default=None,
        gt=0.0,
        description="Deviation parameter, relative margin, or security tolerance.",
    )
    population_size: Optional[int] = Field(
        default=None,
        ge=1,
        description="Total population size (for finite population sampling without replacement).",
    )
    parameters: Dict[str, Any] = Field(
        default_factory=dict,
        description="Additional mode-specific parameters (e.g. n, epsilon, mu, Ta, Tv, Delta, beta, Mu, Sc).",
    )

    @model_validator(mode="before")
    @classmethod
    def populate_from_parameters(cls, data: Any) -> Any:
        if isinstance(data, dict):
            params = data.get("parameters") or {}
            # If sample_size not directly provided, check parameters
            if data.get("sample_size") is None:
                for k in ("n", "sample_size", "n_test", "N", "Mu", "M_u"):
                    if k in params:
                        try:
                            data["sample_size"] = int(params[k])
                            break
                        except (ValueError, TypeError):
                            pass
            # If delta not provided, check parameters
            if data.get("delta") is None:
                for k in ("epsilon", "delta", "Delta", "t"):
                    if k in params:
                        try:
                            data["delta"] = float(params[k])
                            break
                        except (ValueError, TypeError):
                            pass
            # If observed_rate not provided, check parameters
            if data.get("observed_rate") is None:
                for k in ("observed_value", "observed_rate", "p", "qber"):
                    if k in params:
                        try:
                            data["observed_rate"] = float(params[k])
                            break
                        except (ValueError, TypeError):
                            pass
        return data


class StatisticalBoundResponse(BaseModel):
    """Detailed mathematical transparency for statistical bound calculation."""

    method: str
    formula: str
    inputs: Dict[str, Any] = Field(default_factory=dict)
    substitution: str = ""
    calculation_steps: List[str] = Field(default_factory=list)
    intermediate_calculation: str = ""
    result: float = 0.0
    final_bound: float = 0.0
    failure_probability: float = 0.0
    confidence: Optional[float] = None
    interpretation: str = ""
    simulation_id: Optional[str] = None
    scientific_disclaimer: str = (
        "Theoretical analytical model approximation. "
        "Does not claim experimental laboratory validation."
    )
    details: Dict[str, Any] = Field(default_factory=dict)
    model_version: str = "stat_bounds_v2"

    @model_validator(mode="after")
    def sync_transparency_fields(self) -> "StatisticalBoundResponse":
        # Keep result, final_bound and failure_probability consistent
        if self.result == 0.0 and self.failure_probability != 0.0:
            self.result = self.failure_probability
        if self.final_bound == 0.0 and self.result != 0.0:
            self.final_bound = self.result
        if self.failure_probability == 0.0 and self.result != 0.0:
            self.failure_probability = self.result

        # Sync intermediate_calculation with calculation_steps
        if not self.intermediate_calculation and self.calculation_steps:
            sub = f"Substitution:\n{self.substitution}\n\n" if self.substitution else ""
            self.intermediate_calculation = sub + "\n".join(self.calculation_steps)
        elif self.intermediate_calculation and not self.calculation_steps:
            self.calculation_steps = [
                s.strip() for s in self.intermediate_calculation.split("\n") if s.strip()
            ]

        return self


