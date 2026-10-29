"""Per-pulse Aer measurements for the canonical distribution workflow.

Loss/detector events are sampled externally. Within each identical preparation /
receiver / Eve-basis group, Aer returns individual measurement outcomes. No
analytic error-rate draws replace circuit execution on this backend.
"""
from itertools import product
import numpy as np
import qiskit
import qiskit_aer
from qiskit import QuantumCircuit
from qiskit_aer import AerSimulator
from qiskit_aer.noise import depolarizing_error, pauli_error


def sample_pulses(bits, bases, receiver_bases, noise, interception, seed):
    rng = np.random.default_rng(seed)
    eve_bases = rng.integers(0, 2, size=len(bits)) if interception else np.zeros(len(bits), dtype=np.int8)
    groups, circuits = [], []
    for bit, basis, receiver, eve in product(range(2), range(2), range(2), range(2) if interception else range(1)):
        indices = np.flatnonzero((bits == bit) & (bases == basis) & (receiver_bases == receiver) & (eve_bases == eve))
        if not len(indices):
            continue
        qc = QuantumCircuit(1, 1)
        if bit: qc.x(0)
        if basis: qc.h(0)
        qc.barrier()
        if interception:
            if eve: qc.h(0)
            instruction = pauli_error([('Z', interception / 2), ('I', 1 - interception / 2)]).to_instruction()
            instruction.label = 'Eve measure/resend'
            qc.append(instruction, [0])
            if eve: qc.h(0)
        if noise:
            instruction = depolarizing_error(2 * noise, 1).to_instruction()
            instruction.label = 'Optical noise'
            qc.append(instruction, [0])
        qc.barrier()
        if receiver: qc.h(0)
        qc.measure(0, 0)
        groups.append(indices)
        circuits.append(qc)
    max_shots = max(map(len, groups))
    simulator = AerSimulator(method='density_matrix', max_parallel_threads=1)
    result = simulator.run(circuits, shots=max_shots, memory=True, seed_simulator=seed).result()
    if not result.success:
        raise RuntimeError('Qiskit Aer did not complete the measurement job.')
    measured = np.empty(len(bits), dtype=np.int8)
    for index, indices in enumerate(groups):
        memory = result.get_memory(index)[:len(indices)]
        measured[indices] = np.fromiter((int(outcome) for outcome in memory), dtype=np.int8)
    return measured, {
        'backend': 'qiskit_aer', 'method': 'density_matrix',
        'qiskit_version': qiskit.__version__, 'aer_version': qiskit_aer.__version__,
        'seed_simulator': seed, 'circuits_executed': len(circuits),
        'aer_shots_executed': max_shots * len(circuits), 'outcomes_used': len(bits),
        'batching': 'Equal-shot batches; surplus outcomes discarded, never resampled analytically.',
        'representative_circuit': str(circuits[0].draw(output='text', fold=100)),
    }
