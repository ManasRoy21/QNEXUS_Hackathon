"""Shot-based CHSH witness. A simulator or same-chip QPU is not a loophole-free Bell test."""
import math
import qiskit
import qiskit_aer
from qiskit import QuantumCircuit
from qiskit_aer import AerSimulator
from qiskit_aer.noise import depolarizing_error, pauli_error
from app.schemas.quantum_lab import BellRequest

SETTINGS = [(0, 0), (0, 1), (1, 0), (1, 1)]


def bell_circuits(config: BellRequest):
    circuits = []
    for a, b in SETTINGS:
        circuit = QuantumCircuit(2, name=f'CHSH_A{a}B{b}')
        if config.state == 'bell':
            circuit.h(0)
            circuit.cx(0, 1)
        circuit.barrier()
        if config.interception:
            # Random Z/X measurement-and-resend, averaged over Eve's outcomes.
            f = config.interception
            circuit.append(pauli_error([('I', 1-f/2), ('X', f/4), ('Z', f/4)]).to_instruction(), [1])
        if config.noise:
            circuit.append(depolarizing_error(config.noise, 1).to_instruction(), [1])
        circuit.ry(-[0, math.pi/2][a], 0)
        circuit.ry(-[math.pi/4, -math.pi/4][b], 1)
        circuit.measure_all()
        circuits.append(circuit)
    return circuits


def analyze_counts(counts_list):
    if len(counts_list) != 4:
        raise ValueError('CHSH requires exactly four measurement settings.')
    rows, margin = [], 0.0
    for (a, b), raw in zip(SETTINGS, counts_list):
        counts = {str(k).replace(' ', ''): int(v) for k, v in raw.items()}
        if any(k not in ('00', '01', '10', '11') or v < 0 for k, v in counts.items()):
            raise ValueError('Expected two-bit measurement counts.')
        shots = sum(counts.values())
        if not shots:
            raise ValueError('Measurement counts are empty.')
        correlation = sum((1 if k[0] == k[1] else -1)*v for k, v in counts.items())/shots
        # Hoeffding on ±1 observations; union bound over four settings, alpha=.05.
        radius = math.sqrt(2*math.log(8/.05)/shots)
        margin += radius
        rows.append(dict(setting=f'A{a}B{b}', counts=counts, shots=shots,
                         correlation=correlation, radius_95_simultaneous=radius))
    signed_s = sum(r['correlation'] * sign for r, sign in zip(rows, [1, 1, 1, -1]))
    s = abs(signed_s)
    lower, upper = max(0, s-margin), min(4, s+margin)
    return dict(settings=rows, s=s, interval_95=[lower, upper], local_bound=2,
                quantum_max=2*math.sqrt(2), violation_supported=lower > 2,
                verdict='WITNESS_ABOVE_BOUND' if lower > 2 else 'NO_CONFIDENT_VIOLATION',
                confidence_note='Conservative 95% simultaneous Hoeffding bound, assuming independent shots. No loophole-free nonlocality or channel-security claim.')


def run_bell(config: BellRequest):
    circuits = bell_circuits(config)
    result = AerSimulator(method='density_matrix', max_parallel_threads=1).run(
        circuits, shots=config.shots, seed_simulator=config.seed).result()
    if not result.success:
        raise RuntimeError('Aer did not complete the Bell experiment.')
    report = analyze_counts([result.get_counts(i) for i in range(4)])
    ideal = 2*math.sqrt(2) if config.state == 'bell' else math.sqrt(2)
    return {**report, 'execution': 'simulator', 'backend': 'Qiskit Aer',
            'qiskit_version': qiskit.__version__, 'aer_version': qiskit_aer.__version__,
            'config': config.model_dump(), 'expected_s': ideal*(1-config.noise)*(1-config.interception/2),
            'circuit_text': str(circuits[0].draw(output='text', fold=100)),
            'scope': 'Small circuits simulated classically. Observed correlations do not demonstrate computational quantum advantage.'}
