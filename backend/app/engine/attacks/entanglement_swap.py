"""Entanglement swap attack: Entanglement relationship tampering."""
from qiskit import QuantumCircuit

def inject_entanglement_swap(qc: QuantumCircuit, qubit_a: int, qubit_b: int) -> QuantumCircuit:
    """Tampering with entangled channel pairs via unauthorized Bell measurement."""
    qc.cx(qubit_a, qubit_b)
    qc.h(qubit_a)
    return qc
