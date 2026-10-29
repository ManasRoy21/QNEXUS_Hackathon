"""Educational BB84 with explicit Eve measurement, parity reconciliation, Toeplitz hashing.

All parties share one seeded classical simulator. The key-length budget is a
teaching estimate, not a finite-key security proof or a source of secret entropy.
"""
import base64
import hashlib
import math
import secrets
from itertools import product
import numpy as np
import qiskit
import qiskit_aer
from qiskit import QuantumCircuit
from qiskit_aer import AerSimulator
from qiskit_aer.noise import depolarizing_error
from cryptography.exceptions import InvalidTag
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from app.engine.quantum.image_channel import wilson_interval
from app.schemas.quantum_lab import KeyExchangeRequest, DemoEnvelope

SCOPE = ('Educational only: all parties run on one server, simulator randomness is seeded, '
         'the classical discussion is assumed authenticated, and the key-length budget is not a '
         'finite-key proof. Keys are deliberately displayed. Never use these keys for real secrets.')


def measure_pulses(config, bits, bases, bob_bases, intercepted, eve_bases):
    groups, circuits = [], []
    for bit, basis, receiver, tapped, eve in product(range(2), range(2), range(2), range(2), range(2)):
        if not tapped and eve:
            continue
        mask = (bits == bit) & (bases == basis) & (bob_bases == receiver) & (intercepted == tapped)
        if tapped:
            mask &= eve_bases == eve
        indices = np.flatnonzero(mask)
        if not len(indices):
            continue
        qc = QuantumCircuit(1, 2)
        if bit: qc.x(0)
        if basis: qc.h(0)
        if tapped:
            if eve: qc.h(0)
            qc.measure(0, 0)
            qc.reset(0)
            with qc.if_test((qc.clbits[0], 1)):
                qc.x(0)
            if eve: qc.h(0)
        if config.noise:
            qc.append(depolarizing_error(2*config.noise, 1).to_instruction(), [0])
        if receiver: qc.h(0)
        qc.measure(0, 1)
        groups.append((indices, tapped))
        circuits.append(qc)
    results = AerSimulator(method='density_matrix', max_parallel_threads=1).run(
        circuits, shots=max(len(g[0]) for g in groups), memory=True,
        seed_simulator=config.seed).result()
    if not results.success:
        raise RuntimeError('Aer did not complete the key-exchange measurements.')
    measured, eve_bits = np.zeros(len(bits), dtype=np.uint8), np.full(len(bits), -1, dtype=np.int8)
    for i, (indices, tapped) in enumerate(groups):
        memory = [x.replace(' ', '').zfill(2) for x in results.get_memory(i)[:len(indices)]]
        measured[indices] = [int(x[-2]) for x in memory]
        if tapped: eve_bits[indices] = [int(x[-1]) for x in memory]
    return measured, eve_bits, len(circuits), str(circuits[-1].draw(output='text', fold=100))


def reconcile(alice, bob, rng):
    corrected = bob.copy()
    disclosed, flips, passes = 0, 0, []
    for block_size in [16, 16, 16, 8]:
        order = rng.permutation(len(alice))
        pass_flips = 0
        for start in range(0, len(order), block_size):
            block = order[start:start+block_size]
            disclosed += 2  # Both parties reveal one parity bit.
            if int(alice[block].sum()) % 2 == int(corrected[block].sum()) % 2:
                continue
            while len(block) > 1:
                left = block[:len(block)//2]
                disclosed += 2
                block = left if int(alice[left].sum()) % 2 != int(corrected[left].sum()) % 2 else block[len(left):]
            corrected[block[0]] ^= 1
            flips += 1
            pass_flips += 1
        passes.append(dict(block_size=block_size, corrected=pass_flips))
    return corrected, disclosed, flips, passes


def toeplitz_hash(bits, public_seed, length=256):
    n = len(bits)
    if len(public_seed) != n+length-1:
        raise ValueError('Invalid Toeplitz seed length.')
    matrix = np.asarray([public_seed[n-1+i-np.arange(n)] for i in range(length)], dtype=np.int64)
    return (matrix @ np.asarray(bits, dtype=np.int64) % 2).astype(np.uint8)


def entropy(p):
    if p <= 0 or p >= 1: return 0.0
    return -p*math.log2(p)-(1-p)*math.log2(1-p)


def check_envelope(request: DemoEnvelope):
    try:
        nonce = base64.b64decode(request.nonce, validate=True)
        ciphertext = base64.b64decode(request.ciphertext, validate=True)
        if len(nonce) != 12:
            raise ValueError('Nonce must contain 12 bytes.')
        plaintext = AESGCM(bytes.fromhex(request.key_hex)).decrypt(nonce, ciphertext, b'qnexus-demo-v1')
        return dict(authenticated=True, plaintext=plaintext.decode('utf-8'))
    except InvalidTag:
        return dict(authenticated=False, plaintext=None)
    except (ValueError, UnicodeDecodeError) as exc:
        raise ValueError('Invalid demo envelope encoding.') from exc


def run_key_exchange(config: KeyExchangeRequest):
    rng = np.random.default_rng(config.seed)
    bits = rng.integers(0, 2, config.pulses, dtype=np.uint8)
    bases = rng.integers(0, 2, config.pulses, dtype=np.uint8)
    bob_bases = rng.integers(0, 2, config.pulses, dtype=np.uint8)
    intercepted = rng.random(config.pulses) < config.interception
    eve_bases = rng.integers(0, 2, config.pulses, dtype=np.uint8)
    measured, eve_bits, circuits, diagram = measure_pulses(config, bits, bases, bob_bases, intercepted, eve_bases)
    sifted = np.flatnonzero(bases == bob_bases)
    tested = rng.choice(sifted, size=max(1, len(sifted)//4), replace=False)
    retained = np.setdiff1d(sifted, tested)
    errors = int(np.count_nonzero(bits[tested] != measured[tested]))
    qber = errors/len(tested)
    interval = wilson_interval(errors, len(tested))
    preview = [dict(index=i, alice_bit=int(bits[i]), alice_basis='X' if bases[i] else 'Z',
                    bob_basis='X' if bob_bases[i] else 'Z', bob_bit=int(measured[i]),
                    intercepted=bool(intercepted[i]), eve_basis=('X' if eve_bases[i] else 'Z') if intercepted[i] else None,
                    eve_bit=int(eve_bits[i]) if intercepted[i] else None,
                    sifted=bool(bases[i] == bob_bases[i]), tested=bool(i in tested)) for i in range(48)]
    report = dict(execution='simulator', backend='Qiskit Aer', qiskit_version=qiskit.__version__,
                  aer_version=qiskit_aer.__version__, config=config.model_dump(exclude={'message'}),
                  transmitted=config.pulses, sifted=len(sifted), tested=len(tested), retained=len(retained),
                  errors=errors, qber=qber, interval_95=interval, cutoff=.11,
                  circuit_count=circuits, circuit_text=diagram, pulse_preview=preview,
                  scope=SCOPE, key=None, encryption=None, reconciliation=None)
    if interval[0] > .11:
        return {**report, 'verdict': 'CHANNEL_REJECTED', 'explanation': 'The sampled errors exceed the illustrative channel policy. No key or encrypted payment was produced.'}
    if interval[1] > .11:
        return {**report, 'verdict': 'INCONCLUSIVE', 'explanation': 'The sample cannot support the illustrative channel policy. No key was produced.'}
    alice, bob = bits[retained], measured[retained]
    bob, leak, flips, passes = reconcile(alice, bob, rng)
    alice_check = hashlib.sha256(np.packbits(alice).tobytes()).digest()[:8]
    bob_check = hashlib.sha256(np.packbits(bob).tobytes()).digest()[:8]
    matches = alice_check == bob_check and np.array_equal(alice, bob)
    report['reconciliation'] = dict(disclosed_bits=leak, corrected_bits=flips, passes=passes,
                                    verification_bits=64, matches=bool(matches),
                                    method='Four shuffled parity/bisection passes; 64-bit hash comparison and simulator audit.')
    if not matches:
        return {**report, 'verdict': 'RECONCILIATION_FAILED', 'explanation': 'The parties could not reconcile all retained bits. The demonstration stops rather than inventing a shared key.'}
    budget = max(0, math.floor(len(alice)*(1-entropy(interval[1])))-leak-64-64)
    report['illustrative_key_budget'] = budget
    report['budget_note'] = 'Retained bits × (1 − binary entropy(sample Wilson upper bound)) − disclosed parity bits − 64 verification bits − 64 margin. Teaching estimate only: no phase-error/finite-key security proof.'
    if budget < 256:
        return {**report, 'verdict': 'INSUFFICIENT_KEY', 'explanation': 'Fewer than 256 bits remain in the illustrative budget. Increase pulses or reduce noise.'}
    public_seed = rng.integers(0, 2, len(alice)+255, dtype=np.uint8)
    a_key, b_key = toeplitz_hash(alice, public_seed), toeplitz_hash(bob, public_seed)
    key = np.packbits(a_key).tobytes()
    assert np.array_equal(a_key, b_key)
    nonce = secrets.token_bytes(12)  # Never reuse a deterministic AES-GCM nonce.
    ciphertext = AESGCM(key).encrypt(nonce, config.message.encode('utf-8'), b'qnexus-demo-v1')
    return {**report, 'verdict': 'DEMO_KEY_READY',
            'explanation': 'Both simulated parties agree on a 256-bit demonstration key. The sample payment uses classical AES-256-GCM.',
            'key': dict(alice_hex=key.hex(), bob_hex=np.packbits(b_key).tobytes().hex(), bits=256,
                        public_toeplitz_seed=''.join(map(str, public_seed.tolist())), method='Toeplitz universal hashing'),
            'encryption': dict(algorithm='AES-256-GCM', nonce=base64.b64encode(nonce).decode(),
                               ciphertext=base64.b64encode(ciphertext).decode(),
                               plaintext=check_envelope(DemoEnvelope(key_hex=key.hex(), nonce=base64.b64encode(nonce).decode(), ciphertext=base64.b64encode(ciphertext).decode()))['plaintext'])}
