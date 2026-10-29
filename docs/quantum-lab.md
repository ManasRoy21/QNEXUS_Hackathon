# Quantum explorer

Open `/quantum-lab`. All simulator experiments run actual Qiskit Aer circuits. These small circuits remain efficiently classically simulable; there is no computational quantum-advantage claim.

## Hackathon explanation

Classical signatures already protect a document's integrity. The new experiments investigate a different question: how quantum-state preparation, measurement disturbance and entangled correlations behave. In the key-exchange lab, two simulated parties keep matching preparation/measurement settings, reveal a random test sample, reconcile disagreements, shorten their retained bit strings, and use the resulting demonstration key with ordinary AES-256-GCM. In the entanglement lab, an H and CNOT prepare a Bell pair; four rotated measurement settings produce a CHSH witness. The hardware adapter can submit those Bell circuits to an actual IBM Quantum processor when configured.

This is not a distributed bank-to-bank quantum channel. A simulated Bell violation is an outcome of the simulated quantum model. A same-chip hardware Bell witness is not a loophole-free Bell experiment and does not establish quantum key distribution security.

## Key exchange: what is implemented

- Uniform seeded preparation bits and Z/X settings; independently sampled Bob settings and intercepted signals.
- Intercepted circuits explicitly measure Eve's basis, reset, and conditionally prepare the measured bit before Bob measures. Circuit groups batch identical inputs; actual Aer memory supplies outcomes.
- Discard mismatched settings. Uniformly reveal one quarter of sifted positions for error estimation; none of those test positions enters the key.
- A descriptive Wilson interval and illustrative 11% policy classify the sample as rejected, inconclusive, or eligible for the next teaching stage.
- Four randomly shuffled parity/bisection reconciliation passes (blocks 16, 16, 16, 8), counting both parties' disclosed parity bits. A 64-bit hash comparison plus shared-simulator audit rejects unresolved mismatches.
- A teaching key budget: `floor(retained × (1 − h2(sample_upper))) − parity_disclosure − 64 − 64`. If fewer than 256 bits remain, stop. This is **not a finite-key BB84 entropy bound**: Wilson sample intervals do not constitute a phase-error bound or a composable security proof.
- Public-seed binary Toeplitz hashing shortens the agreed retained strings to 256 bits. Alice/Bob display their keys for teaching. These seeded, exposed keys must never protect real secrets.
- AES-256-GCM encrypts a sample payment with a fresh random 12-byte nonce. Ciphertext alterations fail authentication. A repeated seed may reproduce the key but never deliberately reuses a GCM nonce.

All parties, keys and preview bits exist on one server. The public discussion is assumed authenticated; the app does not implement an authenticated network between independent parties. Changing a seed does not make the simulator a secure source of quantum entropy.

## Entanglement

Prepare `|Phi+>` or an independent `|00>` control. Alice angles are `0, pi/2`; Bob angles are `pi/4, -pi/4`. Calculate `S = |E00 + E01 + E10 − E11|` from measured two-bit counts.

The local-hidden-variable bound is 2, while the ideal Bell model reaches `2 sqrt(2)`. A 95% simultaneous Hoeffding bound assumes independent shots; the UI only reports a supported violation when the lower bound exceeds 2. An absent violation does not prove absence of entanglement.

Bob's depolarization strength `p` and random-Z/X intercept fraction `f` give expected Bell `S = 2 sqrt(2) (1−p)(1−f/2)` for these settings. Interception is an averaged measure/resend channel in this Bell experiment. The key-exchange experiment separately uses explicit Eve measurements.

## IBM Quantum setup

1. Create an [IBM Quantum account](https://quantum.cloud.ibm.com/) and an instance with access to an actual processor. Check its plan and quota; this app does not create an IBM account or accept terms for you.
2. Follow [IBM's credential guide](https://quantum.cloud.ibm.com/docs/en/guides/save-credentials). Configure the following as private backend environment variables (Vercel Project → Settings → Environment Variables, Production and Preview as appropriate):
   - `IBM_QUANTUM_ENABLED=true`
   - `IBM_QUANTUM_API_KEY`: IBM API key, stored as a secret
   - `IBM_QUANTUM_INSTANCE`: the intended instance CRN
   - `IBM_QUANTUM_BACKEND`: an operational physical QPU available to that instance
   - `QUANTUM_OPERATOR_TOKEN`: a long independently generated operator password, stored as a secret
3. Redeploy after changing the server configuration. Never use a `NEXT_PUBLIC_` name for a credential. Do not paste an IBM API key into the app or chat.
4. Open Real hardware. Enter only the operator password, acknowledge account quota usage, and explicitly submit a job. Four circuits use 1,024 or 2,048 shots each, with a maximum QPU execution-time setting of 60 seconds. IBM queue times, quota and billing still follow the configured plan; the time cap is not a monetary spending limit.
5. Retrieve by the returned job ID. Queued jobs do not block a server request waiting for completion. Only completed results from a job tagged `qnexus-chsh-v1` on the configured backend are analyzed. The API key stays server-side; the browser's operator password is held in component memory and excluded from exports.

Submission uses `SamplerV2` and backend-specific ISA transpilation. The adapter never substitutes a simulator result after a provider failure. Public visitors can run simulations, but both submission and job retrieval require the operator secret. A physical run cannot be claimed until IBM actually returns its measurements.

## API

- `POST /api/v1/quantum-lab/key-exchange`
- `POST /api/v1/quantum-lab/message-check` (demonstration key + nonce + ciphertext only)
- `POST /api/v1/quantum-lab/bell`
- `GET /api/v1/quantum-lab/hardware` (nonsecret configuration status)
- `POST /api/v1/quantum-lab/hardware/jobs` (operator header and explicit acknowledgement required)
- `GET /api/v1/quantum-lab/hardware/jobs/{id}` (operator header required)

Sources: [IBM QKD teaching module](https://quantum.cloud.ibm.com/learning/en/modules/computer-science/quantum-key-distribution), [IBM CHSH tutorial](https://quantum.cloud.ibm.com/docs/en/tutorials/chsh-inequality), [Sampler job tags](https://quantum.cloud.ibm.com/docs/en/guides/add-job-tags).
