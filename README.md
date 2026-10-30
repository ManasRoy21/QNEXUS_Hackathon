# QNexus — Quantum-Safe Payment Gateway

A hackathon prototype for evaluating **post-quantum payment protection** between two mock banks. The home page uses actual ML-KEM-768, ML-DSA-65 and AES-256-GCM, with atomic mock settlement, replay rejection, signed receipts, controlled attacks and measured classical/PQ tradeoffs. A separate view shows recorded measurements of two logical qubits on a real IBM processor. Existing image/text and quantum research labs remain available.

> Pitch: “Help payment engineers evaluate quantum-resistant security: preserve the exact instruction, settle it once, and measure the migration cost.”

Open `/`, `/payments` or `/demo`, then **Run the complete linked demo**. Seal one invoice image, seal its exact approval, and bind both fingerprints plus their Ed25519 receipt digests into one ML-DSA-signed payment instruction. Bank B checks actual candidate evidence and emits a receipt with the same transaction ID. Fake funds only; no UPI integration. The cloud ledger is temporary and instance-local, and missing sessions fail closed. See [protocol, API, limits and IBM separation](docs/payment-gateway.md) and the [runnable API example](examples/payment_gateway_client.py).

## Backend experiment engine

The new `/experiments` console runs repeated attacks on the canonical distribution engine, with actual per-pulse Qiskit measurement outcomes, erasure/detector sampling, uniform test subsets, and Serfling bounds on retained errors. It reports passed, rejected and inconclusive trials, false alarms and missed weak attacks. Studies, progress and full runs persist in SQLite. Replay, cancellation, JSON/CSV exports and idempotency are implemented.

The main `/workflow` now defaults to Aer in its engine selector. Its material-generation API no longer falls back to invented browser results when the Python backend fails. Aer intercept/resend evaluations re-execute circuits; they do not use the legacy formula-only attack response.

See [backend design, equations, limits and API](docs/backend-engine.md). The older NumPy analysis tools remain separate from the new measured study path.

## What works

- `/demo`: the same connected invoice → text approval → post-quantum payment → settlement receipt workflow, with actual candidate checks and one shared transaction ID. The separate IBM view retains completed hardware job `dbhpl1o1h92s73827stg`, score 1.943, without a confident Bell violation or new QPU submissions.
- `/quantum-lab`: explicit-interception BB84 teaching workflow with sifting, sample testing, shuffled parity reconciliation, Toeplitz key shortening, and AES-GCM sample-payment authentication; shot-based CHSH entanglement experiments; opt-in, operator-protected IBM Quantum hardware jobs. See [setup, assumptions, and the hackathon explanation](docs/quantum-lab.md).
- `/text-lab`: exact UTF-8 message integrity alongside the image lab. Seal text and a real Qiskit channel experiment in an Ed25519 receipt, edit a separate candidate, verify, restore, and download the evidence. Includes clean/noisy/intercepted scenarios and a guided text demo.
- Original/candidate image comparison with a bundled synthetic orbital image, or your own still PNG/JPEG/WebP.
- SHA-256 fingerprints of decoded RGBA pixels, dimensions, file bytes, and an 8×8 tile grid.
- Region replacement, one-pixel edits, alternate-file comparison, and restoration.
- Signed Ed25519 receipts covering the original fingerprint **and** the complete channel experiment. Changing a hash, threshold, or experiment invalidates the signature.
- Actual one-qubit Qiskit circuits executed using `AerSimulator(method="density_matrix")` for Bob and Charlie, separately seeded.
- Clean, noisy, and intercept/resend scenarios; adjustable shots, seed, noise, and interception fraction.
- Measured QBER, expected QBER, pooled Wilson intervals, circuit diagrams, and ideal OpenQASM export.
- Guided demo: verify pristine image → alter region → reject changed image.
- JSON evidence export and offline verifier with an independently trusted public key.
- Existing research workflow and benchmark pages remain available.

## The scientific boundary

This is a **QDS-inspired educational lab**, combining a **BB84 channel model** with a **classical signed image manifest**. It is not a complete implementation of Practical QDS. The image is not encoded or transmitted through quantum hardware. Qiskit measurements characterize the simulated channel; ordinary cryptography checks image integrity.

There is no claim of quantum advantage, universal threat detection, or production security. The channel simulation does not add security to Ed25519. It does not implement QDS symmetrization, privacy amplification, authentication of a real optical channel, or a non-repudiation proof. No cryptographic keys are derived from reproducible simulator output.

The bundled image is an original, code-generated illustration labeled as synthetic. Image verification shows whether pixels changed since sealing; it does **not** detect deepfakes, establish photographer identity, or prove an image depicts a real event. Anyone with access to this demo API can request a seal.

## Run locally

Tested with Python 3.12, Node 23.10, Qiskit 2.6.1 and Aer 0.18.0. No IBM account or API token required.

```sh
# From the repository root; use Python 3.11 or 3.12
python3.12 -m venv backend/.venv
backend/.venv/bin/python -m pip install -r backend/requirements-lock.txt
npm ci --prefix frontend
npm run demo
```

Open [localhost:3000](http://localhost:3000). The API listens on `127.0.0.1:8000`; Next proxies `/api/v1` to it. Stop both services with Ctrl+C. `DEMO_PORT=3001 npm run demo` selects another frontend port.

### Text integrity demo

Open **Text lab** in the navigation, or visit `/text-lab`. Keep the sample message and **Clean channel**, then choose **Seal original text → Verify text**. Choose **Change one character → Verify text** to reject the candidate without re-signing. **Restore original → Verify text** accepts the original again. **Run guided text demo** executes and checks all three outcomes automatically, finishing with the restored text.

Choose **Eve intercepts** or **Noisy channel**, reseal, and verify unchanged text to see matching text with failing channel policy. Changing settings or the original clears the previous receipt. Editing the candidate preserves it. Empty candidates can be checked as deletion tests; originals must contain 1–4,096 characters. Spaces, case, line breaks, and Unicode representation count: the backend hashes exact UTF-8 without normalization.

The text lab reuses the workflow's message hashing, the image lab's Ed25519 issuer, and the same bounded Qiskit channel engine. Its self-contained receipt includes the message hash and full channel experiment, without requiring the research workflow's saved distribution run. Text is processed in memory and is not included in the downloaded JSON. The receipt does not conceal predictable text from guessing and is not proof of quantum transmission or complete QDS security.

`POST /api/v1/text-lab/seal` accepts `{ "message": "...", "config": { "shots": 4096, "seed": 42, "noise": 0.01, "interception": 0 } }`. `POST /api/v1/text-lab/verify` accepts `{ "message": "candidate", "receipt": <seal response> }` and returns separate signature, message, and verifier channel checks. As with images, an API restart changes the default ephemeral issuer; old receipts require resealing.

Or start them separately in two terminals:

```sh
npm run dev:backend
npm run dev
```

The lock file includes test dependencies for a reproducible development environment. For minimal server installs, use `backend/requirements.txt`; for tests with that install, also use `backend/requirements-dev.txt`.

If the frontend is hosted separately, set `NEXT_PUBLIC_API_URL` to your Python API’s `/api/v1` URL before building. `API_PROXY_URL` configures the Next server’s proxy target (default `http://127.0.0.1:8000`). Docker Compose uses `http://backend:8000`.

### Signing-key lifetime

By default, one random Ed25519 key is generated per API process. A restart changes the issuer and earlier receipts fail verification on that server. For consistent receipts, set `IMAGE_LAB_SIGNING_KEY` in `backend/.env` to a privately generated 32-byte seed encoded as 64 hex characters. Do not commit or share it. All workers must use the same configured key if you run more than one.

`GET /api/v1/image-lab/capabilities` returns the public key and its ID. Pin the public key through a trusted channel. A public key included in an untrusted JSON export does not establish trust by itself. This local demo has no account authentication or external timestamp authority.

### Image handling

Image bytes are sent to the configured API for processing and are not saved to disk or session storage. Receipts contain hashes and experiment data, not image bytes. Still PNG, JPEG, and WebP only; maximum 2 MiB, 2048 pixels on either side, and 2 megapixels total; minimum 8×8.

Fingerprints use EXIF-transposed RGBA pixels and dimensions. Lossless recompression can change file bytes while preserving pixel integrity; the UI reports both. A resize invalidates dimensions and marks all tiles as changed. JPEG recompression generally changes decoded pixels and is expected to fail the pixel check. This is exact integrity, not perceptual similarity.

## What Qiskit executes

For each verifier:

1. Prepare `|0⟩`, `|1⟩`, `|+⟩`, or `|−⟩` using X and H gates.
2. Enumerate balanced preparation/receiver basis combinations; if Eve is enabled, enumerate her two bases too. Batch identical circuits into equal shot groups.
3. Model interception fraction `f` as the averaged measure/resend channel. In Eve’s Z basis this is `I` with probability `1-f/2` and `Z` with probability `f/2`; conjugate with H for X. This is equivalent to projective measurement and resend after averaging over Eve’s outcomes.
4. Apply depolarization of strength `2e`, so matched-basis channel noise has error probability `e`.
5. Measure, discard mismatched preparation/receiver bases, and compute QBER from actual counts. Half the transmitted shots are retained by construction.

Expected matched-basis error is `e + (1 - 2e)f/4`. Full interception with no noise produces approximately 25% QBER; ideal clean channels produce zero. Stratified sampling and Aer PRNGs are deliberate educational simplifications. Seeds repeat on the tested dependency versions; different platforms/versions need not produce identical counts.

The 11% acceptance cutoff is an **illustrative policy**, not a Practical-QDS theorem or finite-key security threshold. Pooled Wilson intervals are descriptive approximations for the stratified experiment, not QDS security bounds. Circuit text includes Aer channels; the OpenQASM 2 export contains only ideal preparation/measurement because it cannot represent Aer noise instructions.

## API

| Method | Path | Behavior |
|---|---|---|
| GET | `/api/v1/image-lab/capabilities` | Public key, limits, model assumptions |
| POST | `/api/v1/image-lab/channel` | Execute a bounded channel experiment |
| POST | `/api/v1/image-lab/seal` | Validate image, execute experiment, sign manifest |
| POST | `/api/v1/image-lab/verify` | Validate signature, compare pixels/tiles, combine image and channel checks |

Seal body: `{ "image_base64": "<raw base64, no data URL prefix>", "config": { "shots": 4096, "seed": 42, "noise": 0.01, "interception": 0 } }`.

Verify body: `{ "image_base64": "...", "receipt": <seal response> }`.

An intact image can fail channel policy. A changed image can fail with a clean channel. The UI keeps these outcomes separate. Bob and Charlie represent separate channel trials and policy checks, not independent remote parties holding distributed secrets.

### Offline verification

Download the JSON report and obtain the issuer public key independently. With the backend dependencies installed:

```sh
backend/.venv/bin/python backend/verify_image_receipt.py experiment.json candidate.png --trusted-public-key '<trusted base64 public key>'
```

Exit codes: 0 accepted; 1 image/channel check failed; 2 invalid input or untrusted signature. This validates the receipt and candidate without calling a server. It does not re-execute the quantum experiment or create a proof that it ran on hardware.

## Validation

```sh
cd backend
.venv/bin/python -m pytest -q
cd ../frontend
npm run build
```

The new tests cover theoretical/observed QBER agreement, seed replay, image edits, compression, dimensions, invalid files, receipt alteration, issuer mismatch, and API validation. Existing protocol tests are retained; they are not a security certification. See [the hackathon runbook](docs/hackathon-demo.md) for the pitch and demo sequence.

## Existing research tools

- `/workflow`: six-step protocol console with Qiskit Aer or NumPy material generation. Aer interception re-executes actual measurement circuits.
- `/benchmarks`: existing sweeps and statistical analyses.
- `/research`: concise explanation of the research tools.
- `/experiments`: persistent repeated-trial studies and measured backend evidence.

Older documents in `backend/docs` and the legacy architecture notes describe earlier iterations. Historical performance and security claims there should not be presented as validated results for this new lab. The authoritative boundary for the new experiment is documented above and in its source.

## References

- [Qiskit Aer documentation](https://qiskit.github.io/qiskit-aer/)
- [Yin, Fu & Chen, Practical Quantum Digital Signature](https://arxiv.org/abs/1507.03333)

This improvement builds on the upstream QDS repository; its existing research engines remain identifiable. Review upstream licensing before redistribution; this checkout did not contain a license file at clone time.
