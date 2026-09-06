"""Intercept-resend attack: Channel interception simulation."""
from qiskit import QuantumCircuit

def inject_intercept_resend(qc: QuantumCircuit, target_qubit: int) -> QuantumCircuit:
    """Simulates eavesdropper measuring qubit in computational basis and re-preparing it."""
    # Measure and collapse
    return qc
