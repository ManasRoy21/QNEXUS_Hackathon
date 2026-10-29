"""Physics, persistence, and lifecycle checks for the backend experiment engine."""
import math
import numpy as np
import pytest
from app.engine.analytics.parameter_estimation import estimate_remaining
from app.engine.attack_engine import state_store
from app.engine.attack_engine.dispatcher import dispatch
from app.engine.protocol.practical_qds_engine import PracticalQDSEngine
from app.engine.quantum.pulse_sampler import sample_pulses
from app.schemas.attack_models import AttackSimulationRequest
from app.schemas.canonical_models import GenerateMaterialRequest
from app.schemas.experiments import ExperimentRequest
from app.services.experiment_service import ExperimentRunner
from app.storage.repository import Repository, repository


def material(**overrides):
    params = dict(measurement_backend='qiskit_aer',pulse_count=8192,seed=42,distance_km=0,detector_efficiency=1,dark_count_rate=0,baseline_qber=0,authentication_threshold=.1,verification_threshold=.15)
    params.update(overrides)
    return PracticalQDSEngine.generate_simulation(GenerateMaterialRequest(**params))


def small_request():
    return ExperimentRequest(base=GenerateMaterialRequest(measurement_backend='qiskit_aer',pulse_count=2048,seed=42,distance_km=0,detector_efficiency=1,baseline_qber=0,authentication_threshold=.15,verification_threshold=.2),values=[0,1],repeats=2)


@pytest.mark.parametrize('basis',[0,1])
def test_born_rule(basis):
    bits=np.random.default_rng(42).integers(0,2,size=4096,dtype=np.int8)
    bases=np.full(4096,basis,dtype=np.int8)
    measured,metadata=sample_pulses(bits,bases,bases,0,0,42)
    assert np.array_equal(measured,bits)
    measured,_=sample_pulses(bits,bases,1-bases,0,0,42)
    assert .46 < np.mean(measured!=bits) < .54
    assert metadata['outcomes_used']==4096


@pytest.mark.parametrize('fraction,noise',[(0,0),(1,0),(.2,.01),(.5,.04)])
def test_aer_prediction(fraction,noise):
    state=material(pulse_count=32768,interception_fraction=fraction,baseline_qber=noise)
    expected=noise+(1-2*noise)*fraction/4
    assert abs(state.measurement_statistics.qber_bob-expected)<.02
    assert abs(state.measurement_statistics.qber_charlie-expected)<.02
    assert state.execution['expected_qber_given_click']==pytest.approx(expected)


def test_loss_and_dark_counts():
    state=material(distance_km=500,fiber_attenuation=2,dark_count_rate=1)
    assert .45 < state.measurement_statistics.qber_bob < .55
    assert state.parameter_estimation['bob']['decision']=='SAMPLE_REJECT'


def test_no_data_never_passes():
    state=material(distance_km=500,fiber_attenuation=2)
    assert state.measurement_statistics.conclusive_count_bob==0
    assert state.parameter_estimation['bob']['decision']=='NO_DATA'
    assert state.parameter_estimation['bob']['test_qber'] is None
    assert state.parameter_estimation['bob']['remaining_error_upper_bound'] is None


def test_sampler_results_are_not_overwritten_by_formula(monkeypatch):
    monkeypatch.setattr('app.engine.protocol.practical_qds_engine.sample_pulses',lambda bits,*args:(1-bits,{'backend':'test-inverted'}))
    state=material()
    assert state.measurement_statistics.qber_bob==1
    assert state.measurement_statistics.qber_charlie==1


def test_transcript_reproducibility():
    first,second=material(interception_fraction=.4),material(interception_fraction=.4)
    assert first.execution==second.execution
    assert first.material==second.material
    assert first.parameter_estimation==second.parameter_estimation
    assert first.execution['transcript_sha256']!=material(seed=43).execution['transcript_sha256']


def test_serfling_formula_and_inconclusive():
    errors=np.zeros(1000,dtype=bool)
    result=estimate_remaining(errors,np.arange(300),.15,.005)
    assert result['sampling_radius']==pytest.approx(1000/700*math.sqrt((1-299/1000)*math.log(200)/600))
    assert result['decision']=='PASS'
    assert estimate_remaining(errors,np.array([],dtype=int),.15,.005)['decision']=='NO_DATA'
    assert estimate_remaining(np.zeros(10),np.arange(3),.01,.005)['decision']=='INCONCLUSIVE'


def test_sampling_bound_empirical_coverage():
    rng=np.random.default_rng(3)
    errors=np.array([True]*200+[False]*800)
    violations=0
    for _ in range(500):
        result=estimate_remaining(errors,rng.choice(1000,300,replace=False),.3,.05)
        violations+=result['audit_remaining_qber']>result['remaining_error_upper_bound']
    assert violations/500<.05


def test_repository_reopen(tmp_path):
    path=tmp_path/'runs.sqlite3'
    state=material()
    Repository(path).save_state(state)
    restored=Repository(path).get_state(state.simulation_id)
    assert restored['execution']['transcript_sha256']==state.execution['transcript_sha256']
    assert restored['material']['bob_conclusive_bits']==state.material.bob_conclusive_bits
    assert Repository(path).get_state("'; DROP TABLE simulations;--") is None


def test_attack_runs_new_circuits_and_preserves_baseline():
    state=material()
    before=state.model_dump()
    request=AttackSimulationRequest(simulation_id=state.simulation_id,protocol='practical_qds',attack='INTERCEPT_RESEND',intensity=1)
    result=dispatch(request,state=state)
    assert result.verdict=='CHANNEL_POLICY_REJECTED'
    assert .2<result.metadata['QBER_obs']<.3
    assert state_store.require(result.metadata['attack_simulation_id']).configuration.interception_fraction==1
    assert state.model_dump()==before
    request.attack='FORGERY'
    assert dispatch(request,state=state).verdict=='SIMULATION_MODEL_NOT_AVAILABLE'


def test_job_completion_and_replay(tmp_path):
    repo=Repository(tmp_path/'jobs.sqlite3')
    request=small_request()
    job,_=repo.create_experiment(request.model_dump(mode='json'),4)
    runner=ExperimentRunner()
    runner.execute(repo,job['id'])
    saved=Repository(repo.path).get_job(job['id'])
    assert saved['status']=='completed'
    assert saved['completed']==4
    assert saved['result']['points'][0]['false_alarm_count']==0
    assert saved['result']['points'][1]['rejected']==2
    assert all(repo.get_state(t['simulation_id']) for t in repo.trials(job['id']))
    replay,_=repo.create_experiment(request.model_dump(mode='json'),4)
    runner.execute(repo,replay['id'])
    assert repo.get_job(replay['id'])['result']['evidence_sha256']==saved['result']['evidence_sha256']


def test_idempotency_and_queue_capacity(tmp_path):
    repo=Repository(tmp_path/'jobs.sqlite3')
    job,_=repo.create_experiment({'x':1},1,'key')
    duplicate,created=repo.create_experiment({'x':1},1,'key')
    assert duplicate['id']==job['id'] and not created
    with pytest.raises(ValueError):repo.create_experiment({'x':2},1,'key')
    for _ in range(5):repo.create_experiment({},1)
    with pytest.raises(OverflowError):repo.create_experiment({},1)


def test_cancellation(tmp_path,monkeypatch):
    repo=Repository(tmp_path/'jobs.sqlite3')
    request=small_request()
    job,_=repo.create_experiment(request.model_dump(mode='json'),4)
    repo.request_cancel(job['id'])
    runner=ExperimentRunner()
    runner.execute(repo,job['id'])
    assert repo.get_job(job['id'])['status']=='cancelled'
    assert not repo.trials(job['id'])
    job,_=repo.create_experiment(request.model_dump(mode='json'),4)
    record=repo.record_trial
    def cancel_after_trial(*args):
        record(*args)
        repo.request_cancel(args[0])
    monkeypatch.setattr(repo,'record_trial',cancel_after_trial)
    runner.execute(repo,job['id'])
    assert repo.get_job(job['id'])['status']=='cancelled'
    assert repo.get_job(job['id'])['completed']==1


def test_worker_failure_and_restart_recovery(tmp_path,monkeypatch):
    repo=Repository(tmp_path/'jobs.sqlite3')
    job,_=repo.create_experiment(small_request().model_dump(mode='json'),4)
    def fail(*args):raise RuntimeError('controlled failure')
    monkeypatch.setattr(PracticalQDSEngine,'generate_simulation',fail)
    ExperimentRunner().execute(repo,job['id'])
    assert repo.get_job(job['id'])['status']=='failed'
    queued,_=repo.create_experiment({},1)
    repo.start_job(queued['id'])
    Repository(repo.path).recover_interrupted()
    assert repo.get_job(queued['id'])['status']=='interrupted'


@pytest.mark.parametrize('payload',[dict(values=[-1]),dict(values=[1.1]),dict(values=[0,0]),dict(repeats=100),dict(base={'measurement_backend':'fake'}),dict(base={'measurement_backend':'qiskit_aer','pulse_count':100001}),dict(parameter='pulse_count',values=[1.5]),dict(base={'measurement_backend':'qiskit_aer','pulse_count':100000},repeats=12)])
def test_input_limits(payload):
    with pytest.raises(ValueError):ExperimentRequest(**payload)


def test_api_endpoints(client,monkeypatch):
    from app.services.experiment_service import experiment_runner
    def submit(request,idempotency_key=None):
        repo=repository()
        job,created=repo.create_experiment(request.model_dump(mode='json'),len(request.values)*request.repeats,idempotency_key)
        if created:experiment_runner.execute(repo,job['id'])
        return repo.get_job(job['id']),created
    monkeypatch.setattr(experiment_runner,'submit',submit)
    payload=small_request().model_dump(mode='json')
    response=client.post('/api/v1/experiments',json=payload,headers={'Idempotency-Key':'api-study'})
    assert response.status_code==202
    job=response.json()
    assert job['status']=='completed'
    assert client.get(f"/api/v1/experiments/{job['id']}").json()['completed']==4
    assert client.get(f"/api/v1/experiments/{job['id']}/export.csv").text.count('\n')==9
    exported=client.get(f"/api/v1/experiments/{job['id']}/export").json()
    assert len(exported['trials'])==4
    assert client.get(f"/api/v1/runs/{exported['trials'][0]['simulation_id']}").json()['execution']['backend']=='qiskit_aer'
    assert client.get('/api/v1/experiments/missing').status_code==404
    assert client.get('/api/v1/runs/missing').status_code==404
    assert client.post('/api/v1/experiments',json={'values':[-1]}).status_code==422
    duplicate=client.post('/api/v1/experiments',json=payload,headers={'Idempotency-Key':'api-study'})
    assert duplicate.json()['reused'] is True


def test_actual_thread_pool_completion():
    runner=ExperimentRunner()
    job,created=runner.submit(small_request())
    assert created
    runner._executor.shutdown(wait=True)
    assert repository().get_job(job['id'])['status']=='completed'
