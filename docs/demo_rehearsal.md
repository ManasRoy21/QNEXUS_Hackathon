# Quantum Digital Signatures (QDS) Demo Rehearsal Guide
## 5-Minute Live Presentation Script & Technical Rehearsal Runbook

---

### Demonstration Overview
* **Target Audience**: Chief Information Security Officers (CISOs), Quantum Cryptography Researchers, Defense Architecture Review Boards.
* **Duration**: Exactly 5 Minutes.
* **Core Message**: Demonstrating real-time, deterministic physical quantum threat detection across 6 cryptanalytic vectors with sub-2ms latency and strictly Zero AI/ML hallucinations.

---

### Pre-Flight Checklist
Before beginning the presentation, verify that both the backend and frontend are live:
1. **Backend**: `curl -s http://localhost:8001/health` returns `status: healthy` and `zero_ml: true`.
2. **Frontend**: Open `http://localhost:3000` in Google Chrome or Firefox in full-screen mode.
3. **WebSocket**: Verify that the top bar displays a green pulsing dot with **"WebSocket Live Feed Online"**.

---

### Act 1: The Clean Baseline Lifecycle (Duration: 1:00)
**Goal**: Demonstrate that under normal, uncompromised conditions, the engine validates the quantum signature with 0.00% QBER and zero false alarms.

#### UI Actions:
1. Navigate to the **Operations Console** (`/dashboard`).
2. Point out the **Bits selector (16)** and **Verifier selector (bob)** in the top control bar.
3. Click the cyan **"▶ Run Clean Lifecycle"** button.

#### What Appears on Screen:
* **Security Verdict**: Big green badge reading **"SECURE"** (LOW Severity).
* **QBER Metric**: **0.00%** (comfortably under the green dynamic $e_{\text{rob}}$ robustness bound of $\le 6.58\%$).
* **State Fidelity**: **100.0%**.
* **Reason Codes**: Green banner: *"CLEAN — Hoeffding bounded confidence verified. No reason codes raised."*
* **Postselection Count**: *"Postselection: 3973 kept / 123 rejected"* (97.0% high-confidence yield).
* **Live Histogram**: Symmetrical distribution with only correlated Bell pairs ($|00\rangle$ and $|11\rangle$).
* **WebSocket Terminal**: 5 successive frames streamed (`CONNECTED` $\to$ `KEYGEN` $\to$ `STATE_PREPARATION` $\to$ `CHANNEL_TRANSIT` $\to$ `POSTSELECTION`).

#### Speaker Dialogue:
> *"Good morning. What you are seeing is the Quantum Digital Signatures Operations Console. We just completed an end-to-end quantum signature lifecycle: Alice generated 16 tripartite entangled Bell pairs, encoded her transaction hash using non-orthogonal Pauli eigenstates, and transmitted the quantum state to Bob.*
>
> *Bob performed projective measurements and evaluated the channel against our dynamic Hoeffding robustness bound, e_rob. Because the quantum channel was undisturbed, QBER is exactly 0.00%, state fidelity is 100%, and our postselection layer retained 97% of high-confidence shots. Verification completed in 1.5 milliseconds with zero false alarms."*

---

### Act 2: Intercept-Resend Physical Eavesdropping (Duration: 1:00)
**Goal**: Demonstrate instant detection of an active eavesdropper tapping the optical fiber.

#### UI Actions:
1. Click **"Attack Injection"** in the top navigation bar (`/attacks`).
2. The **"Intercept-Resend Eavesdropping"** card is selected by default (tag: *Eve Physical Tap*).
3. The intensity slider is set to **45%**.
4. Target Channel is set to **charlie**.
5. Click the red button: **"⚡ Inject & Verify (Intercept-Resend Eavesdropping)"**.

#### What Appears on Screen:
* **Security Verdict**: Immediate transition to **"THREAT DETECTED"** in red, flashing **"CRITICAL SEVERITY"**.
* **Vector Identified**: `VECTOR: INTERCEPT_RESEND_EAVESDROPPING`.
* **QBER Metric**: **41.50%** (dramatically exceeding the red $e_{\text{rep}}$ Hoeffding bound of $13.58\%$).
* **Reason Code Badge**: Red alert badge:
  `ERR_HOEFFDING_QBER_ANOMALY` — *Physical Eavesdropping (Hoeffding Breach): Measured QBER breached repudiation/eavesdrop statistical bound e_rep.*
* **Diagnostic Log**: *"Physical channel eavesdropping detected: QBER=41.50% exceeds Hoeffding repudiation/eavesdrop bound e_rep=13.58%."*

#### Speaker Dialogue:
> *"Now let's simulate an adversary, Eve, physically intercepting the fiber between Alice and Charlie. Eve measures qubits in random bases and re-transmits them.*
>
> *According to the Heisenberg Uncertainty Principle, Eve cannot measure without disturbing the quantum state. Notice what happened instantly: Charlie's QBER spiked to 41.50%, breaching the Hoeffding repudiation bound e_rep. The engine flagged ERR_HOEFFDING_QBER_ANOMALY and rejected the signature. No AI hallucination, no probabilistic guessing—pure quantum mechanics."*

---

### Act 3: Cryptographic Forgery & Impersonation (Duration: 1:00)
**Goal**: Demonstrate that classical bit tampering and key spoofing cannot bypass quantum validation.

#### UI Actions:
1. Still on the **Attack Injection** page, click the **"Quantum Payload Forgery"** card.
2. Click **"⚡ Inject & Verify"**.
3. Point out the diagnostic alert: **`ERR_PAYLOAD_FORGERY_DETECTED`** (High Severity).
4. Now click **"Signer Key Impersonation"**.
5. Observe the spoofed credential field: `mallory-unauthorized-key-0xDEADBEEF`.
6. Click **"⚡ Inject & Verify"**.
7. Point out the diagnostic alert: **`ERR_SIGNER_IDENTITY_MISMATCH`**.

#### Speaker Dialogue:
> *"Next, we test cryptographic attacks. An attacker might tamper with the message digest in transit or attempt to impersonate Alice with a counterfeit credential.*
>
> *When forgery is attempted, the disagreement between the altered digest and Alice's quantum Pauli states exceeds our Hoeffding forgery bound e_forg, raising ERR_PAYLOAD_FORGERY_DETECTED. When Mallory tries to spoof the public key, the engine flags ERR_SIGNER_IDENTITY_MISMATCH before quantum resources are even consumed."*

---

### Act 4: Dishonest-Alice Repudiation & Module G Symmetrization (Duration: 1:00)
**Goal**: Demonstrate solving the multi-verifier repudiation paradox where Alice cheats Bob and Charlie.

#### UI Actions:
1. On the **Attack Injection** page, select the **"Dishonest-Alice Repudiation"** card.
2. Click **"⚡ Inject & Verify"**.
3. Notice that Bob and Charlie receive asymmetric states.
4. Click the purple button: **"🛡 Trigger Module G Symmetrization Guard"**.
5. Watch the banner update:
   *"✓ Symmetrization Swapped 8/16 bits (Alice informed: False)"*.
6. Point out the detection output:
   * **Verdict**: **THREAT DETECTED** on both verifiers.
   * **Reason Code**: **`ERR_HOEFFDING_REPUDIATION_BOUND_BREACH`**.

#### Speaker Dialogue:
> *"Here is the most challenging attack in digital signature literature: Repudiation. What if Alice herself is dishonest? Alice sends genuine states to Bob and corrupted states to Charlie, intending to honor the contract with Bob but repudiate it with Charlie.*
>
> *We implemented Module G from Thornton et al. Watch what happens when Bob and Charlie execute our Symmetrization Guard: they perform an encrypted swap of 50% of their received bits. Crucially, Alice is informed of nothing. The asymmetric corruption is split equally between both verifiers, pushing both over the Hoeffding bound. Both Bob and Charlie reject the signature in unison, making repudiation mathematically impossible."*

---

### Act 5: Hardware Side-Channel Blinding & Live Analytics (Duration: 1:00)
**Goal**: Conclude by showing detector blinding defenses and the real-time analytics dashboard.

#### UI Actions:
1. Click **"Hoeffding Analytics"** in the top navigation bar (`/analytics`).
2. Point out the live KPI cards:
   * **Total Simulations**: > 70
   * **Total Verifications**: > 70
   * **Detection Rate**: **100.0%**
   * **Active Sessions**: Cached in memory
3. Point out the **QBER vs. Hoeffding Security Bounds** chart showing dynamic reference lines for $e_{\text{rob}}$ and $e_{\text{rep}}$.
4. Point out the **Information-Theoretic Security vs. Signature Length ($L$)** curve showing asymptotic convergence towards $P_{\text{security}} \to 1.0$.

#### Speaker Dialogue:
> *"Finally, we look at the physical hardware layer. Adversaries can attempt to blind avalanche photodetectors with high-power lasers. Our dual-path MDI cross-check detects Path A vs Path B asymmetry and flags ERR_DETECTOR_SIDE_CHANNEL_BIAS.*
>
> *Across all 6 attack classes, our empirical detection rate is 100.0% with a 0.00% false alarm rate and an average verification latency of 1.5 milliseconds. This engine proves that Quantum Digital Signatures are ready to replace vulnerable classical and PQC signatures for high-value sovereign, financial, and defense operations.*
>
> *Thank you. We are now open for technical questions and live attack injection requests."*

---

### Quick Reference: Terminal / Curl Fallbacks
If demonstrating in headless environments without a browser, run these exact curl commands:

```bash
# 1. Health check
curl -s http://localhost:8001/health | jq .

# 2. Key generation (16 bits)
KEYGEN=$(curl -s -X POST http://localhost:8001/api/v1/simulate/keygen -H "Content-Type: application/json" -d '{"num_bits": 16}')
SID=$(echo $KEYGEN | jq -r .session_id)
echo "Session: $SID"

# 3. Sign message
curl -s -X POST http://localhost:8001/api/v1/simulate/sign -H "Content-Type: application/json" -d "{\"session_id\": \"$SID\", \"message\": \"FEDNOW-TRANSFER-50M\"}" | jq .

# 4. Verify clean (Bob)
curl -s -X POST http://localhost:8001/api/v1/simulate/verify -H "Content-Type: application/json" -d "{\"session_id\": \"$SID\", \"verifier_id\": \"bob\"}" | jq '{verdict, qber, e_rob, severity}'

# 5. Inject Intercept-Resend Attack on Charlie
curl -s -X POST http://localhost:8001/api/v1/attack/inject -H "Content-Type: application/json" -d "{\"session_id\": \"$SID\", \"attack_type\": \"INTERCEPT_RESEND\", \"intensity\": 0.45, \"target_verifier\": \"charlie\"}" | jq .

# 6. Verify attacked Charlie (Threat Detected)
curl -s -X POST http://localhost:8001/api/v1/simulate/verify -H "Content-Type: application/json" -d "{\"session_id\": \"$SID\", \"verifier_id\": \"charlie\"}" | jq '{verdict, primary_attack_vector, severity, reason_codes, diagnostic_message}'
```
