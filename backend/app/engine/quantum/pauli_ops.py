"""Module A: Pauli Eigenstate Encoding.

Prepares quantum states encoding signature bits into standard mutually unbiased
Pauli eigenstates (|0>, |1>, |+>, |->) for QDS protocol execution.
"""

from typing import Optional, Set, Union
from qiskit import QuantumCircuit
from qiskit.circuit import Qubit

VALID_PAULI_STATES: Set[str] = {"0", "1", "+", "-"}


def encode_pauli_state(
    qc: Optional[QuantumCircuit] = None,
    qubit_index: Union[int, Qubit] = 0,
    state: str = "0",
) -> QuantumCircuit:
    """Prepares a single qubit in one of the 4 standard Pauli eigenstates: '0', '1', '+', '-'.

    Eigenstate Mappings:
        - '0' -> |0> (Computational Z-basis eigenstate, eigenvalue +1: ground state, no gates)
        - '1' -> |1> (Computational Z-basis eigenstate, eigenvalue -1: Pauli-X gate)
        - '+' -> |+> = (|0> + |1>)/sqrt(2) (X-basis eigenstate, eigenvalue +1: Hadamard H gate)
        - '-' -> |-> = (|0> - |1>)/sqrt(2) (X-basis eigenstate, eigenvalue -1: Pauli-X then Hadamard H gate)

    Args:
        qc: Target QuantumCircuit to append preparation gates to. If None,
            a new 1-qubit QuantumCircuit is instantiated.
        qubit_index: Target qubit index or Qubit object.
        state: State descriptor from ['0', '1', '+', '-'].

    Returns:
        QuantumCircuit with the Pauli eigenstate prepared on the specified qubit.

    Raises:
        ValueError: If state is not in ['0', '1', '+', '-'].
    """
    # Facilitate single-argument invocation e.g. encode_pauli_state("+")
    if isinstance(qc, str) and qubit_index == 0 and state == "0":
        state = qc
        qc = QuantumCircuit(1, name=f"state_{state}")
        qubit_index = 0
    elif qc is None:
        qc = QuantumCircuit(1, name=f"state_{state}")

    if state == "1":
        qc.x(qubit_index)
    elif state == "+":
        qc.h(qubit_index)
    elif state == "-":
        qc.x(qubit_index)
        qc.h(qubit_index)
    elif state != "0":
        raise ValueError(f"Invalid Pauli state: {state}. Choose from ['0', '1', '+', '-'].")

    return qc
