"""A bounded, stratified BB84 channel experiment executed by Qiskit Aer.

This is a channel teaching model, not a complete QDS implementation. Each circuit
represents one preparation/measurement combination. Equal-sized groups avoid
building thousands of identical circuits. Mismatched bases are discarded.
"""

import math
from itertools import product

import qiskit
import qiskit_aer
from qiskit import QuantumCircuit, qasm2
from qiskit_aer import AerSimulator
from qiskit_aer.noise import depolarizing_error, pauli_error

from app.schemas.image_lab import ChannelConfig, ChannelExperiment, ChannelMeasurement

CUTOFF = 0.11  # Illustrative policy only; not a QDS security theorem.


def build_channel_circuit(bit: int, basis: int, receiver_basis: int,
                          eve_basis: int | None, config: ChannelConfig) -> QuantumCircuit:
    circuit = QuantumCircuit(1, 1)
    if bit:
        circuit.x(0)
    if basis:
        circuit.h(0)
    circuit.barrier()
    if eve_basis is not None:
        if eve_basis:
            circuit.h(0)
        # Averaging a projective measurement and resend in Z is exactly a
        # dephasing channel: I with p=1-f/2, Z with p=f/2. H conjugates it to X.
        attack = pauli_error([("Z", config.interception / 2),
                              ("I", 1 - config.interception / 2)]).to_instruction()
        attack.label = "Eve: measure/resend"
        circuit.append(attack, [0])
        if eve_basis:
            circuit.h(0)
    if config.noise:
        # Depolarization strength 2e gives matched-basis error probability e.
        noise = depolarizing_error(2 * config.noise, 1).to_instruction()
        noise.label = "Channel noise"
        circuit.append(noise, [0])
    circuit.barrier()
    if receiver_basis:
        circuit.h(0)
    circuit.measure(0, 0)
    return circuit


def wilson_interval(errors: int, sample_size: int) -> list[float]:
    z = 1.959963984540054
    p = errors / sample_size
    denominator = 1 + z * z / sample_size
    center = (p + z * z / (2 * sample_size)) / denominator
    half = z * math.sqrt(p * (1 - p) / sample_size + z * z / (4 * sample_size**2)) / denominator
    return [max(0, center - half), min(1, center + half)]


def run_channel(config: ChannelConfig) -> ChannelExperiment:
    eve_bases = [0, 1] if config.interception > 0 else [None]
    combinations = list(product([0, 1], [0, 1], [0, 1], eve_bases))
    circuits = [build_channel_circuit(*combo, config) for combo in combinations]
    simulator = AerSimulator(method="density_matrix", max_parallel_threads=1)
    measurements = []
    expected = config.noise + (1 - 2 * config.noise) * config.interception / 4
    for index, verifier in enumerate(["Bob", "Charlie"]):
        result = simulator.run(circuits, shots=config.shots // len(circuits),
                               seed_simulator=config.seed + index).result()
        errors, sifted = 0, 0
        totals = {"0": 0, "1": 0}
        for i, (bit, basis, receiver_basis, _) in enumerate(combinations):
            if basis != receiver_basis:
                continue
            counts = result.get_counts(i)
            errors += int(counts.get(str(1 - bit), 0))
            sifted += sum(counts.values())
            for outcome in totals:
                totals[outcome] += int(counts.get(outcome, 0))
        qber = errors / sifted
        measurements.append(ChannelMeasurement(
            verifier=verifier, transmitted=config.shots, sifted=sifted, errors=errors,
            qber=qber, expected_qber=expected, interval_95=wilson_interval(errors, sifted),
            accepted=qber <= CUTOFF, matched_counts=totals,
        ))
    # OpenQASM 2 cannot serialize Aer noise instructions. Export the ideal
    # preparation/measurement circuit; the text diagram includes actual channels.
    ideal = build_channel_circuit(0, 1, 1, None, ChannelConfig(noise=0))
    representative = build_channel_circuit(0, 1, 1, 0 if config.interception else None, config)
    return ChannelExperiment(
        backend="Qiskit Aer · density_matrix (local simulator)",
        qiskit_version=qiskit.__version__, aer_version=qiskit_aer.__version__,
        config=config, cutoff=CUTOFF, circuit_count=len(circuits) * 2,
        circuit_text=str(representative.draw(output="text", fold=100)),
        circuit_qasm=qasm2.dumps(ideal), measurements=measurements,
    )
