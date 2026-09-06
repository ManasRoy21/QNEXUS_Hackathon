"""Phase flip attack: Phase shift injector."""
from qiskit import QuantumCircuit

def inject_phase_flip(qc: QuantumCircuit, target_qubit: int, phi: float = 3.14159265) -> QuantumCircuit:
    """Injects Pauli-Z / Phase gate on target qubit."""
    qc.p(phi, target_qubit)
    return qc
