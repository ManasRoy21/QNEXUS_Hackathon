"""Parameter Sweep Execution Engine.

Executes real, deterministic simulations for each parameter value using:
SweepEngine
    ↓
PracticalQDSEngine
    ↓
AttackDispatcher
    ↓
Statistical Analysis
    ↓
Aggregated Result

Every single point is genuinely simulated. No fake values, no hardcoded curves.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from app.engine.analytics.result_aggregation import aggregate_sweep_summary
from app.engine.analytics.validators import validate_sweep_parameter, validate_sweep_values
from app.engine.attack_engine.dispatcher import dispatch
from app.engine.attack_engine import state_store
from app.engine.protocol.practical_qds_engine import PracticalQDSEngine
from app.schemas.analytics_models import (
    SweepPointResult,
    SweepRequest,
    SweepResponse,
    SweepSeries,
)
from app.schemas.attack_models import (
    AttackSimulationRequest,
    AttackSimulationResponse,
    SimulationModelNotAvailableResponse,
)
from app.schemas.canonical_models import GenerateMaterialRequest


class SweepEngine:
    """Executes multi-point parameter sweeps against the genuine simulation engine."""

    @classmethod
    def execute_sweep(cls, req: SweepRequest) -> SweepResponse:
        norm_param = validate_sweep_parameter(req.parameter)
        validate_sweep_values(norm_param, req.values)

        protocol = req.protocol.lower().strip()
        points: List[SweepPointResult] = []

        base_seed = req.seed

        for idx, val in enumerate(req.values):
            # Deterministic seed derivation for this specific point
            point_seed = (base_seed + idx * 7919) % (2**31 - 1)

            # Build GenerateMaterialRequest overriding the swept parameter
            pulse_count = int(val) if norm_param == "pulse_count" else req.pulse_count
            distance_km = val if norm_param == "distance_km" else req.distance_km
            baseline_qber = val if norm_param == "baseline_qber" else req.baseline_qber
            detector_efficiency = val if norm_param == "detector_efficiency" else req.detector_efficiency
            dark_count_rate = val if norm_param == "dark_count_rate" else req.dark_count_rate
            beta = val if norm_param == "beta" else req.beta
            ta = val if norm_param == "authentication_threshold" else req.authentication_threshold
            tv = val if norm_param == "verification_threshold" else req.verification_threshold

            intensity = val if norm_param == "intensity" else req.intensity
            delta = val if norm_param == "delta" else req.attack_parameters.get("delta")

            # 1. Physical Simulation Run
            mat_req = GenerateMaterialRequest(
                protocol=protocol,
                pulse_count=pulse_count,
                distance_km=distance_km,
                detector_efficiency=detector_efficiency,
                dark_count_rate=dark_count_rate,
                baseline_qber=baseline_qber,
                beta=beta,
                authentication_threshold=ta,
                verification_threshold=tv,
                seed=point_seed,
            )

            sim_state = PracticalQDSEngine.generate_simulation(mat_req)
            state_store.save(sim_state)

            m_u = sim_state.material.untested_bits.get("M_u_bob", 0)
            n_test = sim_state.material.test_bits.get("bob_test_count", 0)
            conc_rate_bob = sim_state.measurement_statistics.conclusive_count_bob / float(pulse_count)
            # Signature rate: R = M_u / (2*N) [untested conclusive bits per total transmitted optical pulses across Alice->Bob and Alice->Charlie]
            sig_rate = round(m_u / (2.0 * pulse_count), 8) if pulse_count > 0 else 0.0

            point = SweepPointResult(
                parameter_value=val,
                seed=point_seed,
                simulation_id=sim_state.simulation_id,
                qber_bob=sim_state.measurement_statistics.qber_bob,
                qber_charlie=sim_state.measurement_statistics.qber_charlie,
                conclusive_count_bob=sim_state.measurement_statistics.conclusive_count_bob,
                conclusive_count_charlie=sim_state.measurement_statistics.conclusive_count_charlie,
                conclusive_rate_bob=round(conc_rate_bob, 6),
                M_u=m_u,
                n_test=n_test,
                signature_rate=sig_rate,
                signature_rate_formula="R = M_u / (2·N) [untested bits per 2N pulses]",
            )

            # 2. Attack Simulation if requested
            if req.attack:
                atk_name = req.attack.strip().upper()
                atk_params = dict(req.attack_parameters)
                if delta is not None:
                    atk_params["delta"] = delta

                atk_req = AttackSimulationRequest(
                    simulation_id=sim_state.simulation_id,
                    protocol=protocol,
                    attack=atk_name,
                    seed=point_seed,
                    intensity=intensity,
                    parameters=atk_params,
                )

                atk_res = dispatch(atk_req, state=sim_state)

                point.attack = atk_name
                point.attack_applicable = atk_res.applicable
                point.model_status = atk_res.model_status
                point.verdict = atk_res.verdict

                if isinstance(atk_res, AttackSimulationResponse):
                    point.attack_detected = atk_res.attack_detected
                    point.protocol_resisted = atk_res.protocol_resisted
                    # Extract specific security metrics
                    if "epsilon_1" in atk_res.metadata:
                        point.epsilon_1 = atk_res.metadata["epsilon_1"]
                        point.epsilon_sec = atk_res.metadata["epsilon_1"]
                        point.metric_name = "epsilon_1"
                        point.metric_value = atk_res.metadata["epsilon_1"]
                    elif "epsilon_2" in atk_res.metadata:
                        point.epsilon_2 = atk_res.metadata["epsilon_2"]
                        point.epsilon_sec = atk_res.metadata["epsilon_2"]
                        point.metric_name = "epsilon_2"
                        point.metric_value = atk_res.metadata["epsilon_2"]
                    elif "QBER_obs" in atk_res.metadata:
                        point.qber_obs = atk_res.metadata["QBER_obs"]
                        point.metric_name = "QBER_obs"
                        point.metric_value = atk_res.metadata["QBER_obs"]

                    point.details = {
                        "metadata": atk_res.metadata,
                        "formula": atk_res.mathematical_model.formula if atk_res.mathematical_model else None,
                    }
                elif isinstance(atk_res, SimulationModelNotAvailableResponse):
                    point.details = {"reason": atk_res.reason}

            points.append(point)

        summary = aggregate_sweep_summary(norm_param, points)

        # Build Graph Series (FR-F2 / Phase 4 Required Graphs)
        series_list: List[SweepSeries] = []

        # Series 1: QBER series
        series_list.append(
            SweepSeries(
                series_id="qber_baseline",
                name="Baseline QBER Bob (%)",
                metric="qber_bob",
                x_label=norm_param,
                y_label="QBER (%)",
                points=[{"x": p.parameter_value, "y": round(p.qber_bob * 100, 4)} for p in points],
            )
        )

        if any(p.qber_obs is not None for p in points):
            series_list.append(
                SweepSeries(
                    series_id="qber_observed_attack",
                    name="Observed QBER under Attack (%)",
                    metric="qber_obs",
                    x_label=norm_param,
                    y_label="QBER (%)",
                    points=[
                        {"x": p.parameter_value, "y": round(p.qber_obs * 100, 4)}
                        for p in points
                        if p.qber_obs is not None
                    ],
                )
            )

        if any(p.epsilon_1 is not None for p in points):
            series_list.append(
                SweepSeries(
                    series_id="forgery_bound_epsilon_1",
                    name="Forgery Bound (ε₁)",
                    metric="epsilon_1",
                    x_label=norm_param,
                    y_label="Probability (ε₁)",
                    points=[
                        {"x": p.parameter_value, "y": p.epsilon_1}
                        for p in points
                        if p.epsilon_1 is not None
                    ],
                )
            )

        if any(p.epsilon_2 is not None for p in points):
            series_list.append(
                SweepSeries(
                    series_id="repudiation_bound_epsilon_2",
                    name="Repudiation Bound (ε₂)",
                    metric="epsilon_2",
                    x_label=norm_param,
                    y_label="Probability (ε₂)",
                    points=[
                        {"x": p.parameter_value, "y": p.epsilon_2}
                        for p in points
                        if p.epsilon_2 is not None
                    ],
                )
            )

        series_list.append(
            SweepSeries(
                series_id="signature_rate",
                name="Signature Rate R = M_u / (2·N)",
                metric="signature_rate",
                x_label=norm_param,
                y_label="Rate (bits/pulse)",
                points=[{"x": p.parameter_value, "y": p.signature_rate} for p in points],
            )
        )

        vals = [p.parameter_value for p in points]
        step_val = round(vals[1] - vals[0], 6) if len(vals) > 1 else 0.0

        return SweepResponse(
            simulation_id=points[0].simulation_id if points else None,
            protocol=protocol,
            parameter=norm_param,
            parameter_name=norm_param,
            attack=req.attack,
            min_value=min(vals) if vals else 0.0,
            max_value=max(vals) if vals else 0.0,
            step=step_val,
            fixed_parameters={
                "distance_km": req.distance_km if norm_param != "distance_km" else None,
                "pulse_count": req.pulse_count if norm_param != "pulse_count" else None,
                "baseline_qber": req.baseline_qber if norm_param != "baseline_qber" else None,
                "detector_efficiency": req.detector_efficiency if norm_param != "detector_efficiency" else None,
                "dark_count_rate": req.dark_count_rate if norm_param != "dark_count_rate" else None,
                "beta": req.beta if norm_param != "beta" else None,
                "authentication_threshold": req.authentication_threshold if norm_param != "authentication_threshold" else None,
                "verification_threshold": req.verification_threshold if norm_param != "verification_threshold" else None,
            },
            seed=base_seed,
            points=points,
            results=points,
            series=series_list,
            summary=summary,
        )

