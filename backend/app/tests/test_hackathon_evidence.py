"""Independently audit the public physical-run artifact used by the guided demo."""
import json
import math
from pathlib import Path

import pytest

EVIDENCE = Path(__file__).resolve().parents[3] / 'frontend/src/data/hardware-bell-evidence.json'


def test_recorded_physical_counts_reproduce_published_witness():
    data = json.loads(EVIDENCE.read_text())
    assert data['status'] == 'DONE'
    assert data['execution'] == 'ibm_quantum_hardware'
    assert data['job_id'] == 'dbhpl1o1h92s73827stg'
    assert data['backend'] == 'ibm_marrakesh'
    result = data['result']
    correlations = []
    for row, setting in zip(result['settings'], ['A0B0', 'A0B1', 'A1B0', 'A1B1'], strict=True):
        assert row['setting'] == setting
        counts = row['counts']
        assert set(counts) <= {'00', '01', '10', '11'}
        assert all(isinstance(n, int) and n >= 0 for n in counts.values())
        assert sum(counts.values()) == row['shots'] == 1024
        e = (counts.get('00', 0) + counts.get('11', 0) - counts.get('01', 0) - counts.get('10', 0)) / 1024
        assert row['correlation'] == pytest.approx(e)
        correlations.append(e)
    witness = abs(correlations[0] + correlations[1] + correlations[2] - correlations[3])
    assert result['s'] == pytest.approx(witness)
    radius = 4 * math.sqrt(2 * math.log(8 / .05) / 1024)
    assert result['interval_95'] == pytest.approx([max(0, witness - radius), min(4, witness + radius)])
    assert result['violation_supported'] is False
    assert result['verdict'] == 'NO_CONFIDENT_VIOLATION'
    assert result['interval_95'][0] < 2 < result['interval_95'][1]


def test_public_hardware_artifact_does_not_include_credentials():
    data = json.loads(EVIDENCE.read_text())
    assert set(data) == {'job_id', 'status', 'backend', 'execution', 'result', 'retrieved_at', 'provenance', 'scope'}
    for secret_field in ['IBM_QUANTUM_API_KEY', 'QUANTUM_OPERATOR_TOKEN', 'IBM_QUANTUM_INSTANCE', 'X-Quantum-Operator']:
        assert secret_field not in EVIDENCE.read_text()
