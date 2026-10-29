"""Durable experiment lifecycle, replay, and evidence downloads."""
import csv
import io
from typing import Annotated
from fastapi import APIRouter, Header, HTTPException, Query, Response
from app.engine.attack_engine import state_store
from app.schemas.experiments import ExperimentRequest
from app.services.experiment_service import experiment_runner
from app.storage.repository import repository
from app.schemas.message_evidence import SignMessageRequest, VerifyMessageRequest, MessageReceipt
from app.services.message_evidence_service import sign_message, verify_message

router = APIRouter()


def require_job(identifier):
    job = repository().get_job(identifier)
    if job is None:
        raise HTTPException(status_code=404, detail='Experiment not found.')
    return job


@router.post('/experiments', status_code=202)
def create(request: ExperimentRequest, idempotency_key: Annotated[str | None, Header(min_length=1, max_length=128)] = None):
    try:
        job, created = experiment_runner.submit(request, idempotency_key)
        return {**job, 'reused': not created}
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except OverflowError as exc:
        raise HTTPException(status_code=429, detail=str(exc)) from exc


@router.get('/experiments')
def list_experiments(limit: int = Query(20, ge=1, le=100)):
    return {'experiments': repository().list_jobs(limit)}


@router.get('/experiments/{identifier}')
def get_experiment(identifier: str):
    return require_job(identifier)


@router.post('/experiments/{identifier}/cancel')
def cancel(identifier: str):
    require_job(identifier)
    return repository().request_cancel(identifier)


@router.post('/experiments/{identifier}/replay', status_code=202)
def replay(identifier: str):
    request = ExperimentRequest.model_validate(require_job(identifier)['request'])
    return create(request)


@router.get('/experiments/{identifier}/export')
def export(identifier: str):
    job = require_job(identifier)
    return {**job, 'trials': repository().trials(identifier),
            'trust_note': 'evidence_sha256 is a reproducibility fingerprint, not an authenticated signature.'}


@router.get('/experiments/{identifier}/export.csv')
def export_csv(identifier: str):
    require_job(identifier)
    output = io.StringIO()
    columns = ['parameter_value', 'repeat', 'seed', 'backend', 'simulation_id', 'trial_decision', 'verifier_decision',
               'verifier', 'conclusive', 'errors', 'qber', 'tested', 'test_qber',
               'remaining_error_upper_bound', 'audit_remaining_qber']
    writer = csv.DictWriter(output, fieldnames=columns)
    writer.writeheader()
    for trial in repository().trials(identifier):
        for verifier in trial['verifiers']:
            row = {key: trial.get(key) for key in columns}
            row.update({key: verifier.get(key) for key in columns if key in verifier})
            row['trial_decision'] = trial['decision']
            row['verifier_decision'] = verifier['decision']
            writer.writerow(row)
    return Response(output.getvalue(), media_type='text/csv', headers={'Content-Disposition': f'attachment; filename="{identifier}.csv"'})


@router.get('/runs')
def runs(limit: int = Query(20, ge=1, le=100)):
    return {'runs': [{'simulation_id': s['simulation_id'], 'seed': s['seed'],
                     'timestamp': s['timestamp'], 'configuration': s['configuration'],
                     'measurement_statistics': s['measurement_statistics'],
                     'execution': s.get('execution', {}), 'parameter_estimation': s.get('parameter_estimation', {})}
                    for s in repository().list_states(limit)]}


@router.get('/runs/{identifier}')
def get_run(identifier: str):
    state = state_store.get(identifier)
    if state is None:
        raise HTTPException(status_code=404, detail='Simulation run not found.')
    return state


@router.post('/runs/{identifier}/sign-message', response_model=MessageReceipt)
def sign_run_message(identifier: str, request: SignMessageRequest):
    try:
        return sign_message(identifier, request.message)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.post('/verify-message')
def verify_run_message(request: VerifyMessageRequest):
    try:
        return verify_message(request.message, request.receipt)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
