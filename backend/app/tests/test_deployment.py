"""Deployment regressions: cloud routing and work must not depend on localhost threads."""
import json
from pathlib import Path

from app.core.config import settings
from app.schemas.canonical_models import GenerateMaterialRequest
from app.schemas.experiments import ExperimentRequest
from app.services.experiment_service import ExperimentRunner
from app.storage.repository import repository


def test_serverless_study_completes_before_response(monkeypatch):
    monkeypatch.setattr(settings, 'SERVERLESS_EXECUTION', True)
    request = ExperimentRequest(base=GenerateMaterialRequest(
        measurement_backend='qiskit_aer', pulse_count=1024, seed=42,
        distance_km=0, detector_efficiency=1, baseline_qber=0,
        authentication_threshold=.15, verification_threshold=.2), values=[0], repeats=1)
    runner = ExperimentRunner()
    job, created = runner.submit(request, 'cloud-inline-test')
    assert created
    assert job['status'] == 'completed'
    assert job['completed'] == 1
    assert runner._executor is None
    assert len(repository().trials(job['id'])) == 1
    reused, created_again = runner.submit(request, 'cloud-inline-test')
    assert not created_again
    assert reused['id'] == job['id']


def test_vercel_routes_preserve_backend_prefixes():
    config = json.loads((Path(__file__).resolve().parents[3] / 'vercel.json').read_text())
    assert config['services']['backend']['entrypoint'] == 'main:app'
    assert config['services']['frontend']['root'] == 'frontend'
    assert config['rewrites'][0] == {'source': '/api/v1/(.*)?', 'destination': {'service': 'backend'}}
