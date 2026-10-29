"""Background, persisted, cancellable, repeated-trial simulation studies."""
import hashlib
import logging
import statistics
import threading
import time
from concurrent.futures import ThreadPoolExecutor

from app.engine.protocol.practical_qds_engine import PracticalQDSEngine
from app.engine.quantum.image_channel import wilson_interval
from app.schemas.canonical_models import GenerateMaterialRequest
from app.schemas.experiments import ExperimentRequest
from app.storage.repository import encode, repository

logger = logging.getLogger(__name__)
MODEL = 'four-state-distribution-v2.1'


def summarize(request, observations):
    points = []
    for value in request.values:
        trials = [t for t in observations if t['parameter_value'] == value]
        if not trials:
            continue
        rejected = sum(t['decision'] == 'rejected' for t in trials)
        accepted = sum(t['decision'] == 'passed' for t in trials)
        inconclusive = len(trials) - rejected - accepted
        qbers = [v['qber'] for t in trials for v in t['verifiers'] if v['qber'] is not None]
        has_attack = trials[0]['interception_fraction'] > 0
        points.append({'value': value, 'trials': len(trials), 'rejected': rejected,
            'passed': accepted, 'inconclusive': inconclusive,
            'rejection_rate': rejected / len(trials),
            'rejection_rate_interval_95': wilson_interval(rejected, len(trials)),
            'false_alarm_count': rejected if not has_attack else None,
            'missed_attack_count': accepted if has_attack else None,
            'attack_detection_rate': rejected / len(trials) if has_attack else None,
            'mean_qber': statistics.mean(qbers) if qbers else None,
            'qber_std': statistics.stdev(qbers) if len(qbers) > 1 else 0 if qbers else None,
            'expected_qber': trials[0]['expected_qber'],
            'mean_tested_bits': statistics.mean(v['tested'] for t in trials for v in t['verifiers'])})
    # Omit UUIDs/timestamps/timing: fingerprint only replayable observations.
    deterministic = [{k: v for k, v in t.items() if k not in ('simulation_id', 'elapsed_ms')} for t in observations]
    return {'model': MODEL, 'points': points,
        'trials_completed': len(observations),
        'evidence_sha256': hashlib.sha256(encode({'model': MODEL,
            'parameters': request.model_dump(mode='json', exclude={'label'}),
            'observations': deterministic}).encode()).hexdigest(),
        'interpretation': 'Rejection means a test mismatch policy failed. It does not identify an attacker; honest noise can also reject. Inconclusive trials remain in all-trial rate denominators.',
        'assumptions': ['Independent lossy channels and uniform basis choices.',
            'Qiskit Aer samples signals; NumPy samples erasure, dark counts and test selection.',
            'Serfling estimates retained mismatch rates from samples without replacement.',
            'Seeded local simulation, not quantum hardware or a full QDS security proof.',
            'Repeated-trial Wilson intervals are approximate binomial summaries; trial counts can be small.']}


class ExperimentRunner:
    def __init__(self):
        self._executor = None
        self._lock = threading.Lock()
        self._stopping = threading.Event()

    def startup(self):
        repository().recover_interrupted()
        self._stopping.clear()

    def submit(self, request, idempotency_key=None):
        repo = repository()
        job, created = repo.create_experiment(request.model_dump(mode='json'), len(request.values) * request.repeats, idempotency_key)
        if created:
            with self._lock:
                if self._executor is None:
                    self._executor = ThreadPoolExecutor(max_workers=1, thread_name_prefix='qds-experiment')
                self._executor.submit(self.execute, repo, job['id'])
        return job, created

    def execute(self, repo, identifier):
        if not repo.start_job(identifier):
            return
        try:
            request = ExperimentRequest.model_validate(repo.get_job(identifier)['request'])
            observations = []
            for value_index, value in enumerate(request.values):
                for repeat in range(request.repeats):
                    job = repo.get_job(identifier)
                    if self._stopping.is_set() or job['cancel_requested']:
                        repo.finish_job(identifier, 'interrupted' if self._stopping.is_set() else 'cancelled', summarize(request, observations))
                        return
                    payload = request.base.model_dump()
                    payload[request.parameter] = int(value) if request.parameter == 'pulse_count' else value
                    # Same seed across sweep values pairs preparation/loss draws;
                    # independent repeats use separate PRNG streams.
                    payload['seed'] = ((request.base.seed or 0) + repeat * 104729) % (2**31 - 1)
                    started = time.perf_counter()
                    state = PracticalQDSEngine.generate_simulation(GenerateMaterialRequest.model_validate(payload))
                    verifiers = []
                    for name in ('bob', 'charlie'):
                        estimate = state.parameter_estimation[name]
                        total = getattr(state.measurement_statistics, f'conclusive_count_{name}')
                        errors = getattr(state.measurement_statistics, f'mismatch_count_{name}')
                        verifiers.append({'verifier': name, 'conclusive': total, 'errors': errors,
                            'qber': errors / total if total else None, **estimate})
                    decision = ('rejected' if any(v['decision'] == 'SAMPLE_REJECT' for v in verifiers)
                                else 'passed' if all(v['decision'] == 'PASS' for v in verifiers) else 'inconclusive')
                    observation = {'simulation_id': state.simulation_id, 'parameter_value': value,
                        'repeat': repeat, 'seed': state.seed, 'backend': request.base.measurement_backend,
                        'interception_fraction': state.configuration.interception_fraction,
                        'decision': decision, 'expected_qber': state.execution['expected_qber_given_click'],
                        'transcript_sha256': state.execution['transcript_sha256'],
                        'verifiers': verifiers, 'elapsed_ms': round((time.perf_counter() - started) * 1000, 2)}
                    repo.record_trial(identifier, len(observations), observation, state)
                    observations.append(observation)
            if repo.get_job(identifier)['cancel_requested']:
                repo.finish_job(identifier, 'cancelled', summarize(request, observations))
            else:
                repo.finish_job(identifier, 'completed', summarize(request, observations))
        except Exception:
            logger.exception('Experiment %s failed', identifier)
            repo.finish_job(identifier, 'failed', error='Simulation failed. Inspect server logs; completed trials remain available.')

    def shutdown(self):
        self._stopping.set()
        with self._lock:
            if self._executor:
                self._executor.shutdown(wait=True, cancel_futures=True)
                self._executor = None


experiment_runner = ExperimentRunner()
