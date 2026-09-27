# Phase 2 — Protocol-Aware Attack Engine & Applicability Matrix

## Executive Summary

Phase 2 replaces the legacy generic attack handlers with a strict, scientifically sound threat analysis engine:
$$\text{PROTOCOL} \longrightarrow \text{ATTACK VECTOR} \longrightarrow \text{APPLICABILITY CHECK} \longrightarrow \text{MODEL STATUS} \longrightarrow \text{QUANTITATIVE} \mid \text{QUALITATIVE} \mid \text{UNIMPLEMENTED}$$

Key accomplishments:
- **No silent CLEAN verdicts**: Unimplemented attacks explicitly return `SIMULATION_MODEL_NOT_AVAILABLE` with structured reasons and references.
- **Machine-readable Applicability Matrix**: Per-protocol, per-attack matrix mapping all 5 interactive protocols against 5 canonical threat vectors.
- **Quantitative Physics Models for Practical QDS**:
  - **FR-E1 Forgery**: Conclusive bit mutual information $I(B:C)$, binary Shannon entropy solver for $S_c$, and Chernoff tail bound $\epsilon_1 \le \exp\left(-\frac{(S_c - T_v)^2}{2 S_c} P_C^c M_u\right)$.
  - **FR-E2 Repudiation**: Threshold gap $(T_v - T_a - \Delta)$ with random sampling bound $\epsilon_2 \le \exp\left(-\frac{2(T_v - T_a - \Delta)^2 M_u^2 \beta^2}{n_{\text{test}}}\right)$.
  - **FR-E3 Intercept-Resend**: Analytical QBER injection model $\text{QBER}_{\text{obs}} = \text{QBER}_{\text{base}} + 0.5\gamma(1 - 2\cdot\text{QBER}_{\text{base}})$ with strict $\gamma \in [0, 1]$ validation and $T_a$ threshold abort decision.
- **Protocol Isolation**: Strict separation of protocol explanations. No MDI-QDS untrusted relay concepts or Decoy-State PNS explanations leak into Practical QDS results.
- **Four-Layer Explanation Engine**: Standardized 4-tier narrative (Attacker Action, Physical Effect, Observable Effect, Security Consequence).
- **Mathematical Transparency**: Structured formula, inputs, intermediate calculation narrative, and final result returned for all quantitative models.
- **Centralized Dispatcher & State Store**: `POST /api/v1/simulation/attack` retrieves previously generated canonical simulation states by `simulation_id`.

---

## 1. Attack Applicability Matrix

| Protocol | Attack Vector | Status | Applicable | Quantitative | Qualitative | Model Version |
| :--- | :--- | :--- | :---: | :---: | :---: | :--- |
| **Practical QDS** | Forgery | `QUANTITATIVE` | Yes | Yes | Yes | `practical_qds_attack_v1` |
| **Practical QDS** | Repudiation | `QUANTITATIVE` | Yes | Yes | Yes | `practical_qds_attack_v1` |
| **Practical QDS** | Intercept-Resend | `QUANTITATIVE` | Yes | Yes | Yes | `practical_qds_attack_v1` |
| **Practical QDS** | Detector Compromise | `UNIMPLEMENTED` | No | No | No | None (`NOT_AVAILABLE`) |
| **Practical QDS** | PNS Attack | `UNIMPLEMENTED` | No | No | No | None (`NOT_AVAILABLE`) |
| **MDI-QDS** | Forgery | `QUALITATIVE` | Yes | No | Yes | `mdi_qualitative_v1` |
| **MDI-QDS** | Repudiation | `QUALITATIVE` | Yes | No | Yes | `mdi_qualitative_v1` |
| **MDI-QDS** | Intercept-Resend | `UNIMPLEMENTED` | No | No | No | None (`NOT_AVAILABLE`) |
| **MDI-QDS** | Detector Compromise | `QUALITATIVE` | Yes | No | Yes | `mdi_qualitative_v1` (Immune) |
| **MDI-QDS** | PNS Attack | `UNIMPLEMENTED` | No | No | No | None (`NOT_AVAILABLE`) |
| **OTUH-QDS** | Forgery | `QUALITATIVE` | Yes | No | Yes | `otuh_qualitative_v1` |
| **OTUH-QDS** | Repudiation | `QUALITATIVE` | Yes | No | Yes | `otuh_qualitative_v1` |
| **OTUH-QDS** | Intercept-Resend | `QUALITATIVE` | Yes | No | Yes | `otuh_qualitative_v1` |
| **OTUH-QDS** | Detector Compromise | `UNIMPLEMENTED` | No | No | No | None (`NOT_AVAILABLE`) |
| **OTUH-QDS** | PNS Attack | `UNIMPLEMENTED` | No | No | No | None (`NOT_AVAILABLE`) |
| **TF-QDS** | Forgery | `QUALITATIVE` | Yes | No | Yes | `tf_qualitative_v1` |
| **TF-QDS** | Repudiation / Other | `UNIMPLEMENTED` | No | No | No | None (`NOT_AVAILABLE`) |
| **Decoy-State QDS** | PNS Attack | `QUALITATIVE` | Yes | No | Yes | `decoy_qualitative_v1` |
| **Decoy-State QDS** | Forgery / Repud / Other | `UNIMPLEMENTED` | No | No | No | None (`NOT_AVAILABLE`) |

---

## 2. API Endpoints

### `POST /api/v1/simulation/generate-material`
- Generates canonical simulation state with deterministic PRNG seed control.
- Persists state in the in-process state store.
- Returns `CanonicalSimulationState`.

### `POST /api/v1/simulation/attack`
- Request body: `AttackSimulationRequest` (`simulation_id`, `protocol`, `attack`, `intensity`, `parameters`).
- Evaluates attack through `AttackDispatcher`.
- Returns `AttackSimulationResponse` (for `QUANTITATIVE` / `QUALITATIVE`) or `SimulationModelNotAvailableResponse` (for `UNIMPLEMENTED`).

---

## 3. Mathematical Models Implemented

### 3.1 Forgery Bound ($\epsilon_1$) — Practical QDS (Yin, Fu & Chen 2016)
$$\varepsilon_1 \le \exp\left(-\frac{(S_c - T_v)^2}{2 S_c} \cdot P_C^c \cdot M_u\right) \quad \text{when } S_c > T_v$$
- Mutual information $I(B:C)$ estimated from conclusive-bit mismatch rate between $K_B$ and $K_C$.
- Minimal mismatch rate $S_c$ obtained from $H(S_c) \ge 1 - I(B:C)$ via bisection root solver in `entropy.py`.
- Evaluated on $M_u$ untested conclusive bits.

### 3.2 Repudiation Bound ($\epsilon_2$) — Practical QDS
$$\varepsilon_2 \le \exp\left(-\frac{2(T_v - T_a - \Delta)^2 M_u^2 \beta^2}{n_{\text{test}}}\right)$$
- $\Delta$ is the explicit maximum statistical fluctuation between verifiers.
- $T_v - T_a - \Delta$ defines the security margin preventing asymmetric verification.

### 3.3 Eavesdropping Detection — Practical QDS
$$\text{QBER}_{\text{obs}} = \text{QBER}_{\text{base}} + 0.5\gamma(1 - 2\cdot\text{QBER}_{\text{base}})$$
$$\text{Decision} = \begin{cases} \text{DETECTED (ABORT)} & \text{if } \text{QBER}_{\text{obs}} > T_a \\ \text{UNDETECTED (PASS)} & \text{if } \text{QBER}_{\text{obs}} \le T_a \end{cases}$$
