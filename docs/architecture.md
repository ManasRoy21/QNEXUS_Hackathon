# Quantum Digital Signatures (QDS) System Architecture

This document details the architectural blueprints, protocol sequence specifications, and deterministic threat detection pipelines for the **Quantum Digital Signatures (QDS) Threat Detection Engine**.

---

## 1. High-Level System Component Architecture

The system is structured as a decoupled, multi-tier reactive stack operating under a strict **Zero-AI/ML deterministic security standard**.

```mermaid
graph TB
    subgraph "Frontend Presentation Layer (Next.js 14 / React 18)"
        UI_SOC["SOC Operations Console<br/>(/dashboard)"]
        UI_ATTACK["Attack Injection Suite<br/>(/attacks)"]
        UI_METRICS["Hoeffding Analytics<br/>(/analytics)"]
        WS_CLIENT["Reactive WebSocket Client<br/>(useWebSocket.ts)"]
        API_CLIENT["Type-Safe Axios Client<br/>(useSimulation.ts)"]
    end

    subgraph "FastAPI Application Gateway (:8000 / :8001)"
        REST_ROUTER["REST API Router (/api/v1)"]
        WS_ENDPOINT["Telemetry Stream (/ws/stream)"]
        CORS["CORS & Request Security Middleware"]
    end

    subgraph "Simulation & Session Orchestrator"
        SESSION_MGR["In-Memory SimulationSession Manager"]
        EVENT_BUS["Async Protocol Lifecycle Broadcaster"]
    end

    subgraph "Core Quantum Protocol & Security Modules"
        MOD_A["Module A: Physics & Bell Engine<br/>(|Φ⁺⟩ Entanglement & Teleportation)"]
        MOD_B["Module B: Protocol Engine<br/>(Tripartite Keygen, Sign, Verify)"]
        MOD_G["Module G: Symmetrization Guard<br/>(Bob-Charlie Classical Swap)"]
        MOD_D["Module D: Attack Injection Suite<br/>(6 Quantum Cryptanalytic Vectors)"]
        MOD_C["Module C: Threat Detection Engine<br/>(Hoeffding Bounds & Postselection)"]
    end

    subgraph "Simulation Execution Backend"
        QISKIT_AER["Qiskit Aer Quantum Simulator (v0.17+ / v2.5+)"]
        BORN_EVAL["Born-Rule Analytical Evaluator"]
    end

    UI_SOC --> API_CLIENT
    UI_ATTACK --> API_CLIENT
    UI_METRICS --> API_CLIENT
    WS_CLIENT <--> WS_ENDPOINT

    API_CLIENT --> REST_ROUTER
    REST_ROUTER --> SESSION_MGR
    WS_ENDPOINT --> EVENT_BUS
    EVENT_BUS <--> SESSION_MGR

    SESSION_MGR --> MOD_B
    SESSION_MGR --> MOD_D
    SESSION_MGR --> MOD_G
    SESSION_MGR --> MOD_C

    MOD_B --> MOD_A
    MOD_A --> QISKIT_AER
    MOD_C --> BORN_EVAL
```

---

## 2. Tripartite QDS Protocol & Symmetrization Sequence

The protocol distribution sequence demonstrates the transmission of EPR states from Alice to Bob and Charlie, followed by the classical encrypted symmetrization swap (Module G) that guarantees verifier agreement and eliminates dishonest-signer repudiation.

```mermaid
sequenceDiagram
    autonumber
    actor Alice as Alice (Signer)
    participant Channel as Quantum Channel (Fibers)
    actor Bob as Bob (Verifier 1)
    actor Charlie as Charlie (Verifier 2)
    participant Guard as Module G Symmetrization Guard

    Note over Alice, Charlie: Phase 1: Key Distribution (Bell-Pair Generation)
    Alice->>Channel: Transmit |Φ⁺⟩ Entangled Half to Bob
    Alice->>Channel: Transmit |Φ⁺⟩ Entangled Half to Charlie
    Channel->>Bob: Receive Bob's Qubit Register
    Channel->>Charlie: Receive Charlie's Qubit Register

    Note over Alice, Charlie: Phase 2: Signature Encoding (Pauli Bases)
    Alice->>Alice: Encode Digest m ∈ {0,1}^L into Pauli States {|0⟩,|1⟩,|+⟩,|-⟩}
    Alice->>Bob: Broadcast Classical Teleportation & Basis Tokens
    Alice->>Charlie: Broadcast Classical Teleportation & Basis Tokens

    Note over Bob, Charlie: Phase 3: Module G Classical Symmetrization Swap
    Note right of Guard: Alice learns ZERO swap metadata (Alice_informed = False)
    Bob->>Guard: Submit 50% Random Secret Bit Indices
    Charlie->>Guard: Submit Corresponding Secret Bit Indices
    Guard->>Bob: Receive Swapped States from Charlie
    Guard->>Charlie: Receive Swapped States from Bob

    Note over Bob, Charlie: Phase 4: Verification & Hoeffding Threat Evaluation
    Bob->>Bob: Measure in Alice's Target Bases (Z or X)
    Bob->>Bob: Evaluate QBER vs Dynamic e_rob & e_rep Bounds
    Charlie->>Charlie: Measure in Alice's Target Bases (Z or X)
    Charlie->>Charlie: Evaluate QBER vs Dynamic e_rob & e_rep Bounds

    alt QBER ≤ e_rob (Clean Verification)
        Bob-->>Alice: Signature ACCEPTED (Verdict: SECURE)
        Charlie-->>Alice: Signature ACCEPTED (Verdict: SECURE)
    else QBER > e_rep or Forgery/Repudiation
        Bob-->>Alice: Signature REJECTED (Verdict: THREAT DETECTED)
        Charlie-->>Alice: Signature REJECTED (Verdict: THREAT DETECTED)
    end
```

---

## 3. Zero-ML Threat Detection Engine Pipeline (Module C)

All detection logic is deterministic, backed by Hoeffding's finite-key concentration inequality and counterfactual physical measurements. No machine learning models, statistical heuristics, or non-deterministic classifiers are permitted.

```mermaid
flowchart TD
    IN[Incoming Verifier Quantum States & Classical Packet] --> PS[Layer 1: Boundary Postselection Filter]

    PS -->|Discard Ambiguous Shots| REJ[Discarded Buffer (e.g. 123 Shots)]
    PS -->|Retain Confident Shots| DUAL[Layer 2: Dual-Path MDI Detector Cross-Check]

    DUAL --> PATH_A[Path A: Primary Homodyne Channel]
    DUAL --> PATH_B[Path B: Counterfactual Zero-Transmission Monitor]

    PATH_A --> BIAS_CHK{Path A vs Path B Disagreement > Margin?}
    PATH_B --> BIAS_CHK

    BIAS_CHK -->|Yes: Blinding Detected| BLIND_ALERT[Flag ERR_DETECTOR_SIDE_CHANNEL_BIAS<br/>Severity: CRITICAL]
    BIAS_CHK -->|No: Symmetrical| STATS[Layer 3: Quantum Error & Credential Evaluation]

    STATS --> KEY_CHK{Signer Public Key == Authorized Alice?}
    KEY_CHK -->|Mismatch| IMP_ALERT[Flag ERR_SIGNER_IDENTITY_MISMATCH<br/>Severity: HIGH]
    KEY_CHK -->|Match| REPLAY_CHK{Nonce Fresh & Timestamp < Window?}

    REPLAY_CHK -->|Stale / Reused| REP_ALERT[Flag ERR_REPLAY_STALE_OR_DUPLICATE_NONCE<br/>Severity: HIGH]
    REPLAY_CHK -->|Valid Nonce| H_EVAL[Layer 4: Hoeffding Bound Evaluator]

    H_EVAL --> CALC_BOUNDS["Compute Dynamic Bounds:<br/>e_rob = δ + sqrt(ln(1/ε) / 2n)<br/>e_rep = e_rob + margin<br/>e_forg = 2 * e_rob + margin"]

    CALC_BOUNDS --> FORG_CHK{Tampered Digest Disagreement > e_forg?}
    FORG_CHK -->|Yes| FORG_ALERT[Flag ERR_PAYLOAD_FORGERY_DETECTED<br/>Severity: HIGH]
    FORG_CHK -->|No| QBER_CHK{Measured QBER > e_rep?}

    QBER_CHK -->|Yes: Eavesdropping| EAVE_ALERT[Flag ERR_HOEFFDING_QBER_ANOMALY<br/>Severity: CRITICAL]
    QBER_CHK -->|No| SYM_CHK{Verifier Block Divergence > e_rep?}

    SYM_CHK -->|Yes: Repudiation Intercepted| REPUD_ALERT[Flag ERR_HOEFFDING_REPUDIATION_BOUND_BREACH<br/>Severity: CRITICAL]
    SYM_CHK -->|No: QBER ≤ e_rob| CLEAN_PASS[VERDICT: SECURE<br/>Confidence > 99.9%<br/>Severity: LOW]

    BLIND_ALERT --> AGG[Verdict Assembler]
    IMP_ALERT --> AGG
    REP_ALERT --> AGG
    FORG_ALERT --> AGG
    EAVE_ALERT --> AGG
    REPUD_ALERT --> AGG
    CLEAN_PASS --> AGG

    AGG --> OUT[Generate VerifyResponse & Broadcast Live Telemetry Frame]
```

---

## 4. Finite State Machine: Session Lifecycle

```mermaid
stateDiagram-v2
    [*] --> Idle: Init
    Idle --> Keygen: POST /api/v1/simulate/keygen
    Keygen --> Signed: POST /api/v1/simulate/sign
    
    Signed --> AttackInjected: POST /api/v1/attack/inject
    AttackInjected --> Symmetrized: POST /api/v1/symmetrize (Module G)
    Signed --> Symmetrized: POST /api/v1/symmetrize

    Signed --> Verified: POST /api/v1/simulate/verify
    AttackInjected --> Verified: POST /api/v1/simulate/verify
    Symmetrized --> Verified: POST /api/v1/simulate/verify

    Verified --> Idle: Reset Session
```
