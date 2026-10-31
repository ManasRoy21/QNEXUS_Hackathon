# QNexus

QNexus is a payment-verification prototype that links an invoice image, exact approval text, and a post-quantum-protected payment instruction under one transaction ID. It verifies the evidence before mock settlement, rejects altered or repeated instructions, and issues a signed receipt.

[Live application](https://qnexus-hackathon.vercel.app/payments) · [Repository](https://github.com/ManasRoy21/QNEXUS_Hackathon)

## Components

| Component | Function |
| --- | --- |
| **Image Lab** | Fingerprints images, signs receipts, detects pixel changes, and highlights altered regions. |
| **Text Lab** | Signs exact UTF-8 text fingerprints and detects changes to the recorded approval. |
| **Payment Gateway** | Binds invoice and approval evidence to payment details, verifies the chain, and settles mock funds once. |
| **Quantum Lab** | Provides simulated BB84/Bell experiments and a separate recorded IBM hardware result. |
| **Research tools** | Six-step protocol workflow, repeated attack studies, benchmarks, and evidence exports. |

The connected payment flow reuses the image/text backend services. Standalone lab tabs do not automatically transfer their receipts.

## Payment workflow

1. Create a sandbox and seal an invoice image.
2. Seal the generated approval containing its amount, beneficiary, reference, transaction ID, and invoice fingerprint.
3. Sign the payment details and evidence references, then encrypt the payment envelope.
4. Verify the instruction, submitted evidence, expiry, available balance, and replay status.
5. Atomically debit and credit mock balances, then issue a signed settlement receipt.

The app includes controlled tests for altered invoices, edited approvals, changed payment details, expired instructions, corrupted ciphertext, and replay. Open **Payments → Run the complete linked demo** to execute the flow.

## Cryptography

| Purpose | Implementation |
| --- | --- |
| Document fingerprints | SHA-256 |
| Image and text receipt signatures | Ed25519 |
| Payment and settlement signatures | ML-DSA-65 |
| Shared-secret establishment | ML-KEM-768 |
| Key derivation | HKDF-SHA256 |
| Payment-envelope encryption | AES-256-GCM |

Payment protection runs on ordinary CPUs. ML-KEM and ML-DSA address future quantum threats; image/text receipts remain classical. Seeded simulator output is not used to generate payment keys.

The separate IBM Bell experiment ran on `ibm_marrakesh` with two logical qubits and 4 × 1,024 shots. Its measured CHSH score was **1.943**, without a confident Bell violation. These measurements do not secure the payment or demonstrate quantum advantage.

## Technology

- **Frontend:** Next.js, React, TypeScript, Tailwind CSS.
- **Backend:** FastAPI, Python, SQLite.
- **Cryptography:** Python `cryptography` / OpenSSL.
- **Quantum experiments:** Qiskit Aer; optional IBM Quantum Runtime.

## Run locally

Use Python 3.12, Git, and a supported Node.js release with npm compatible with Next.js 14.

```sh
git clone https://github.com/ManasRoy21/QNEXUS_Hackathon.git
cd QNEXUS_Hackathon
python3.12 -m venv backend/.venv
backend/.venv/bin/python -m pip install -r backend/requirements-lock.txt
npm ci --prefix frontend
npm run demo
```

Open [localhost:3000](http://localhost:3000). The API runs at [127.0.0.1:8000](http://127.0.0.1:8000), with interactive documentation at [`/docs`](http://127.0.0.1:8000/docs). Stop both services with **Ctrl+C**. No IBM account is required for local simulations or the recorded hardware view.

On Windows, create the environment with `py -3.12 -m venv backend/.venv` and install dependencies using `backend\.venv\Scripts\python.exe`. The demo launcher selects the platform's Python path automatically.

### Configuration

Defaults support local use. See [`backend/.env.example`](backend/.env.example) and [`frontend/.env.example`](frontend/.env.example).

| Variable | Purpose |
| --- | --- |
| `IMAGE_LAB_SIGNING_KEY` | Private 32-byte seed encoded as 64 hex characters for stable image/text receipts across API restarts. |
| `QDS_DATABASE_PATH` | Writable SQLite path; the payment database is stored alongside it. |
| `NEXT_PUBLIC_API_URL` | Browser API base, defaulting to `/api/v1`. |
| `API_PROXY_URL` | Local API proxy target, defaulting to `http://127.0.0.1:8000`. |

Keep credentials server-side and out of Git. Optional hardware configuration is covered in the [Quantum Lab guide](docs/quantum-lab.md#ibm-quantum-setup).

## Source structure

```text
frontend/src/components/         Payment flow and lab interfaces
frontend/src/services/           Typed API clients
backend/app/services/            Evidence verification and payment logic
backend/app/engine/quantum/      Qiskit experiment engines
backend/app/api/v1/endpoints/    HTTP endpoints
backend/app/tests/               Backend tests
docs/                           Technical documentation
examples/                       API client example
```

Payment logic is in [`payment_gateway.py`](backend/app/services/payment_gateway.py); invoice/approval linkage is in [`payment_evidence.py`](backend/app/services/payment_evidence.py).

## Validation

From the repository root after installing dependencies:

```sh
cd backend
.venv/bin/python -m pytest -q
cd ../frontend
npm run build
```

Tests cover evidence tampering, cryptographic verification, expiry, replay, concurrent settlement, quantum models, and API validation.

## Limits

- Uses mock banks and funds; no live UPI/NPCI integration. The prototype has not undergone independent security review or FIPS validation.
- Fingerprints establish integrity after sealing, not supplier identity or invoice legitimacy. The app does not read invoice totals with OCR or authenticate a real bank officer.
- Linked payments require exact image bytes/pixels and approval text. Uploads accept still PNG/JPEG/WebP: 8 × 8 minimum, 2,048 pixels per side maximum, 2 megapixels total, and 2 MiB.
- Document attachments travel separately over HTTPS; the post-quantum envelope protects the payment instruction and binds the document fingerprints.
- Payment instructions expire after 120 seconds; sandboxes last 30 minutes. On Vercel, SQLite state is temporary and instance-local. Missing sessions fail closed; replay protection is scoped to the sandbox.
- Quantum channel simulations are educational and do not transmit the documents through quantum hardware or constitute a complete QDS/QKD security proof.

## Documentation

- [Payment protocol, API, attacks, and benchmarks](docs/payment-gateway.md)
- [Quantum experiments and IBM hardware setup](docs/quantum-lab.md)
- [Backend experiment engine](docs/backend-engine.md)
- [Vercel deployment](docs/vercel-deployment.md)
- [API client example](examples/payment_gateway_client.py)
- [NIST ML-KEM standard](https://csrc.nist.gov/pubs/fips/203/final)
- [NIST ML-DSA standard](https://csrc.nist.gov/pubs/fips/204/final)

## Acknowledgements and licensing

Built on the [upstream QDS research repository](https://github.com/krishnaher9232-cloud/QDS). This checkout has no license file; review upstream licensing and obtain the necessary permissions before redistribution.
