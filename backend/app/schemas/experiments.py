"""Bounded repeatable experiments. Every sweep point re-executes the backend."""
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, model_validator
from app.schemas.canonical_models import GenerateMaterialRequest


class ExperimentRequest(BaseModel):
    model_config = ConfigDict(extra='forbid', allow_inf_nan=False)
    label: str = Field(default='Intercept-resend detection study', min_length=1, max_length=120)
    base: GenerateMaterialRequest = Field(default_factory=lambda: GenerateMaterialRequest(
        measurement_backend='qiskit_aer', pulse_count=8192, distance_km=10,
        authentication_threshold=.1, verification_threshold=.15, baseline_qber=.01, seed=42))
    parameter: Literal['interception_fraction', 'distance_km', 'baseline_qber', 'pulse_count'] = 'interception_fraction'
    values: list[float] = Field(default_factory=lambda: [0, .1, .3, .6, 1], min_length=1, max_length=8)
    repeats: int = Field(default=4, ge=1, le=12)

    @model_validator(mode='after')
    def validate_budget(self):
        if self.base.protocol not in ('practical_qds', 'practical-qds', 'yin_2016'):
            raise ValueError('This experiment implements only the four-state practical-QDS-inspired distribution model.')
        if len(set(self.values)) != len(self.values):
            raise ValueError('Sweep values must be distinct.')
        total_pulses = 0
        for value in self.values:
            if self.parameter == 'pulse_count' and value != int(value):
                raise ValueError('Pulse counts must be integers.')
            payload = self.base.model_dump()
            payload[self.parameter] = int(value) if self.parameter == 'pulse_count' else value
            validated = GenerateMaterialRequest.model_validate(payload)
            total_pulses += validated.pulse_count * self.repeats
        if len(self.values) * self.repeats > 64 or total_pulses > 2_000_000:
            raise ValueError('Experiment budget: at most 64 trials and 2,000,000 transmitted pulses.')
        return self
