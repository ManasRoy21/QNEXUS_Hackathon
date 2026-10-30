# QNexus payment gateway prototype

The home page and `/payments` implement a fake-money gateway between two mock banks. Real post-quantum operations protect the application envelope. They execute classically using `cryptography==50.0.2` and its bundled OpenSSL backend. Algorithms are standardized; this application and custom protocol have not undergone independent security review or FIPS validation.

## The problem and product

Bank/payment engineers need to evaluate migration from quantum-vulnerable public-key systems while preserving exact transaction intent and understanding CPU/bandwidth costs. NIST describes the long-term confidentiality threat as [harvest now, decrypt later](https://www.nist.gov/cybersecurity-and-privacy/what-post-quantum-cryptography). [BIS Project Leap](https://www.bis.org/project/leap) is a real payment-system migration experiment, not an endorsement of this application.

This prototype provides actual encryption, signatures, validation and atomic mock settlement over an API. It is not an NPCI/UPI integration. It cannot stop a user willingly authorizing a scam or an attacker controlling a bank's signing system. Tamper detection, expiry and replay protection also work classically; post-quantum primitives address future cryptanalytic threats.

## Cryptographic flow

1. Create an isolated 30-minute sandbox: Bank A's ML-DSA-65 signing key, Bank B's ML-KEM-768 decryption key and Bank B's ML-DSA-65 receipt key are generated with system entropy. Seed representations remain in a private, mode-0600 SQLite database. They never enter the browser, exports, URLs or Git.
2. The signing API represents an already-authorized **mock** bank. Its high-entropy sandbox credential is a demo-controller capability, not a bank customer's authentication. Both bank roles and their trusted public-key directory are on one server.
3. Canonical JSON uses sorted keys, compact separators, ASCII escaping, integer paise and integer timestamps. The signed instruction includes version, sandbox, sender/receiver banks, payer, beneficiary, amount, currency, transaction ID, random nonce, issue time and expiry. The current instruction is v2; its ML-DSA context is `QNEXUS_PAYMENT_V2`. It also binds the evidence described below.
4. ML-KEM-768 encapsulates a fresh shared secret to Bank B's pinned public key. HKDF-SHA256 derives a 32-byte AES key with the routing-header digest as salt and a versioned context string. AES-256-GCM uses a fresh 12-byte random nonce. Its additional authenticated data binds the complete envelope header and KEM ciphertext. The encrypted content is the instruction plus sender signature.
5. Bank B checks its trusted key IDs, decapsulates, authenticates/decrypts, validates the instruction schema, verifies the ML-DSA signature, and checks lifetime (at most 120 seconds, allowing at most five seconds future issue skew). No client-supplied public key becomes trusted.
6. A SQLite `BEGIN IMMEDIATE` transaction checks both transaction-ID and nonce reuse plus available balance. Unique database constraints enforce `(sandbox, transaction ID)` and `(sandbox, nonce)`. Debit, credit and receipt insertion commit together. Concurrent submissions cannot overdraw or settle twice. The sum of demo balances remains constant.
7. Bank B signs the receipt under separate key material and context `QNEXUS_RECEIPT_V1`. Receipts bind transaction, amount, beneficiary, instruction digest and resulting balances. Verification uses Bank B's pinned sandbox public key. Exported public keys permit offline mathematical verification; independent identity certification is not implemented.

Sources: [ML-KEM API](https://cryptography.io/en/50.0.2/hazmat/primitives/asymmetric/mlkem/), [ML-DSA API](https://cryptography.io/en/stable/hazmat/primitives/asymmetric/mldsa/), [FIPS 203](https://csrc.nist.gov/pubs/fips/203/final), [FIPS 204](https://csrc.nist.gov/pubs/fips/204/final).

## Controlled attack model

- **Amount/beneficiary:** the authenticated test harness decrypts an intact packet, edits the instruction, retains its original signature, and re-encrypts with the receiver's public key. The sender signature fails. This models plaintext-aware fault injection; it does not demonstrate an attacker defeating confidentiality or forging a signature.
- **Expired instruction:** the mock sender signs an already-expired message. Cryptographic checks pass; the freshness policy rejects it.
- **Ciphertext:** flip one encrypted byte; GCM authentication rejects it.
- **Replay:** resubmit the exact settled packet; a ledger uniqueness check rejects it with no second debit.
- The complete demo first runs four rejected tests, then settles a ₹1,000 original and rejects its replay. It verifies the receipt and measures primitive performance. Every asserted result comes from actual API responses.

## API

Prefix `/api/v1/payments`:

- `POST /sessions` → fake balances and `session_token` (no-store response).
- `GET /sessions/{id}` → balances and signed ledger (no-store).
- `POST /sessions/{id}/cases` creates the linked transaction with `{amount_paise, payee, invoice_reference}`. Seal its invoice and approval using the endpoints in the v2 section below.
- `POST /sessions/{id}/draft` requires `{amount_paise, payee, invoice_reference, case_id, candidate: {image_base64, approval_text}}`.
- `POST /sessions/{id}/receive` body `{envelope: <draft.envelope>, candidate: {image_base64, approval_text}}`.
- `POST /sessions/{id}/attack` body `{ "envelope": <draft.envelope>, "kind": "amount" | "beneficiary" | "expired" | "ciphertext" }` (test harness only).
- `POST /sessions/{id}/verify-receipt` body `{ "receipt": <receipt>, "signature": <base64> }`.
- `POST /sessions/{id}/benchmark` → nine warmed samples per algorithm.

All per-session calls require `X-Sandbox-Token`. The UI holds it in component memory, with no browser persistence. Evidence export explicitly whitelists public data and omits the token. A refresh requires creating a new sandbox. IDs, keys and funds from other sessions are rejected.

See [the runnable integration example](../examples/payment_gateway_client.py). Use only demonstration data and balances.

## Benchmark interpretation

Ed25519 and X25519 are compared with ML-DSA-65 and ML-KEM-768. Key generation happens before timing. One warm-up is discarded, followed by nine serial measured sign, verify and key-establishment samples. Median and nearest-rank p95 (maximum of nine) are returned. Key-establishment measures both sides' primitive operations. X25519's 32-byte public key is compared with an ML-KEM 1,088-byte encapsulation ciphertext, not with a full transport handshake. Network latency, authentication, certificates, TLS, database work and throughput are excluded. Timings describe this server/library run, not a quantum speedup.

## Storage and deployment limits

`payment-sandbox.sqlite3` is alongside `QDS_DATABASE_PATH` and isolated from the research DB. Session creation cleans expired rows, caps an instance at 128 active sandboxes, and limits each sandbox to 100 mutating/benchmark requests. All money is fake. Balance/replay state is durable only within this instance and sandbox lifetime. On Vercel, `/tmp` is ephemeral and not shared between instances. A missing session returns an authentication error and **fails closed**; it never recreates balances or silently accepts a payment. The UI exposes a new-sandbox action.

Production would require durable shared transactional storage, independent bank identities and mutual authentication, managed keys/HSMs, a reviewed standard transport/protocol, fraud controls, authorization policy, threat modelling, rate limits and operational compliance. This prototype does not claim global replay protection across disposable instances or long-term secrecy for stored server keys.

## Real IBM qubits

The separate IBM hardware view displays **recorded** physical measurements from `ibm_marrakesh`, job `dbhpl1o1h92s73827stg`. Logical H + CNOT and four rotated settings were executed on one QPU. Bars show the actual two-bit counts; q0/q1 in the diagram are logical labels, not claimed physical addresses. The measured CHSH score is **1.943**, without a confident violation. Viewing the saved data needs no additional job or quota. It does not generate payment keys or certify the gateway. Owner-authorized new jobs remain in `/quantum-lab`.

## Connected invoice → approval → payment flow (v2)

The home page, `/payments` and `/demo` now present one workflow. Payment preparation no longer accepts an unbound amount-only request. The original Image Lab and Text Lab receipt services are reused directly on the backend; the standalone research screens remain available.

1. `POST /sessions/{id}/cases` with `{amount_paise, payee, invoice_reference}` allocates the transaction ID before either document is sealed. The case fixes those payment details.
2. `POST /sessions/{id}/cases/{case_id}/invoice` with `{image_base64}` invokes the image lab at a bounded, clean 1,024-shot configuration and pins its actual Ed25519 receipt to this case. The API returns a generated approval message containing the exact amount, beneficiary, invoice reference, transaction ID and invoice-pixel fingerprint.
3. `POST /sessions/{id}/cases/{case_id}/approval` with `{message}` requires exactly that generated message and invokes the text lab. It pins the Ed25519 receipt. Arbitrary edited payment details cannot be silently approved. This demonstrates exact-text integrity; it does not authenticate a real bank officer's identity.
4. `POST /sessions/{id}/draft` now requires `{amount_paise, payee, invoice_reference, case_id, candidate: {image_base64, approval_text}}`. Payment details must equal the case. The server validates actual candidate image bytes/pixels and text against its pinned receipts. It constructs a v2 instruction using the case ID as transaction ID and includes image file/pixel hashes, approval hash, both canonical receipt digests, invoice reference, evidence revision and original receipt algorithm. ML-DSA signs this full object in context `QNEXUS_PAYMENT_V2` before the existing ML-KEM/AES encryption.
5. `POST /sessions/{id}/receive` requires both `{envelope, candidate: {image_base64, approval_text}}`. After payment signature and time validation, it verifies the actual invoice file, pixels, exact approval text, pinned receipt signatures and signed linkage. Edited or missing evidence rejects without changing balances. The bank's v2 settlement receipt carries the same evidence binding and transaction ID.

Invoice matching in the linked flow requires **both exact file bytes and decoded pixels**. A recompressed invoice with identical pixels still differs at the file level and is rejected. The standalone image lab retains its documented pixel-first comparison semantics. Hashes and receipts do not establish original invoice legitimacy, perform OCR, validate that a photographed total equals the manually entered amount, or authenticate a supplier. The image/text receipts remain classical Ed25519; wrapping their digests in a post-quantum payment signature does not turn their original endorsements into independently post-quantum authentication. Submitted document attachments are separate HTTPS request data; their content is not encrypted inside the ML-KEM/AES payment envelope. The signed fingerprints authenticate linkage, not post-quantum confidentiality of the attachments.

Resealing an open invoice increments the evidence revision and clears its approval; approving a case increments the revision again. Old prepared payments become stale. Settlement rechecks both the evidence revision and expiry under the SQLite write lock, preventing document reseal or expiry races. A settled case is frozen; different evidence requires a new case. Replay uniqueness applies per transaction/case, not as a business rule deduplicating the same invoice across separately authorized cases.

The complete UI demo creates an invoice, seals it, seals the generated approval, prepares a linked payment, rejects an altered invoice and altered approval, runs four packet/instruction attacks, settles the intact chain once, rejects replay, and verifies the final receipt. Its export includes both actual lab receipts, the signed linkage, packet, receiver decisions and bank receipt; session credentials and raw document bytes are excluded. The displayed transaction ID is the same throughout the workflow. The IBM hardware view stays separate and does not feed payment keys or settlement decisions.
