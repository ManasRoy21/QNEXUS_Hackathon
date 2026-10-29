"""Intercept/resend evaluation by fresh canonical Aer execution."""
from app.engine.attack_engine import state_store
from app.engine.protocol.practical_qds_engine import PracticalQDSEngine
from app.schemas.canonical_models import GenerateMaterialRequest
from app.schemas.attack_models import AttackSimulationResponse, FourLayerExplanation, MathematicalModel


def evaluate(request, original):
    payload = original.configuration.model_dump(exclude={'security_target'})
    payload.update(seed=request.seed if request.seed is not None else original.seed,
                   message=original.signing.message, interception_fraction=request.intensity,
                   estimation_failure_probability=original.parameter_estimation.get('joint_failure_probability', .01))
    attacked = PracticalQDSEngine.generate_simulation(GenerateMaterialRequest.model_validate(payload))
    state_store.save(attacked)
    estimates = [attacked.parameter_estimation[name] for name in ('bob', 'charlie')]
    rejected = any(e['decision'] == 'SAMPLE_REJECT' for e in estimates)
    passed = all(e['decision'] == 'PASS' for e in estimates)
    verdict = 'CHANNEL_POLICY_REJECTED' if rejected else 'CHANNEL_POLICY_PASSED' if passed else 'INSUFFICIENT_EVIDENCE'
    stats = attacked.measurement_statistics
    interpretation = 'A sample-error policy decision based on fresh Qiskit counts, not a causal identification of Eve or a full QDS security proof.'
    return AttackSimulationResponse(
        simulation_id=original.simulation_id, seed=attacked.seed, protocol='practical_qds',
        attack=request.attack.upper(), model_status='QUANTITATIVE', applicable=True,
        verdict=verdict, attack_detected=rejected and request.intensity > 0,
        protocol_resisted=rejected and request.intensity > 0, model_version='aer-distribution-attack-v2',
        four_layer_explanation=FourLayerExplanation(
            layer_1_attacker_action=f'Measure and resend fraction {request.intensity:.3f} in a uniformly chosen X or Z basis.',
            layer_2_physical_effect='Nonselective measurement dephases the transmitted state. Aer executes this channel before optical noise and receiver measurement.',
            layer_3_observable_effect=f'Bob: {stats.mismatch_count_bob}/{stats.conclusive_count_bob} mismatches; Charlie: {stats.mismatch_count_charlie}/{stats.conclusive_count_charlie}. Uniform test subsets determine the decision.',
            layer_4_security_consequence=interpretation),
        mathematical_model=MathematicalModel(
            formula=r'e_{expected}=e_0+(1-2e_0)f/4;\quad \hat e=k_{mismatch}/n_{conclusive}',
            inputs={'fraction': request.intensity, 'noise': attacked.configuration.baseline_qber,
                    'sample_estimation': attacked.parameter_estimation},
            intermediate_calculation='Execute preparation, interception, noise and measurement circuits; apply erasure/dark events; sift matched bases; randomly partition test and retained bits.',
            final_result={'QBER_obs': stats.qber_bob, 'verdict': verdict}, interpretation=interpretation),
        metadata={'attack_simulation_id': attacked.simulation_id, 'execution': attacked.execution,
                  'parameter_estimation': attacked.parameter_estimation, 'QBER_obs': stats.qber_bob,
                  'QBER_base': original.measurement_statistics.qber_bob,
                  'causal_attacker_identification': False})
