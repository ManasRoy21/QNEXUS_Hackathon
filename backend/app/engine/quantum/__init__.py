"""Module A: Quantum Physics Engine.

Deterministic quantum state mechanics, projective measurements,
and Pauli operators using modern Qiskit 1.x and Qiskit Aer simulation.
"""

from app.engine.quantum.bell_pairs import create_bell_pair
from app.engine.quantum.pauli_ops import encode_pauli_state
from app.engine.quantum.teleportation import (
    build_teleportation_circuit,
    run_teleportation_circuit,
)

__all__ = [
    "create_bell_pair",
    "encode_pauli_state",
    "build_teleportation_circuit",
    "run_teleportation_circuit",
]
