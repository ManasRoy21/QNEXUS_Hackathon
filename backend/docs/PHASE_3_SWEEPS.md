# Phase 3 — Parameter Sweeps & Statistical Analysis

## Overview
Phase 3 transforms the QDS Simulation Prototype into a reproducible experimental research platform.
Multi-point parameter sweeps simulate genuine physical channel instances and attack evaluations.
No curves are hardcoded or fabricated.

## Architecture
```
SweepEngine
    ↓
PracticalQDSEngine
    ↓
AttackDispatcher
    ↓
StatisticalBoundsEngine
    ↓
Aggregated Result
```

## Supported Sweep Parameters
- `distance_km`: Optical channel length (km)
- `pulse_count`: Total distributed optical pulses
- `baseline_qber`: Optical alignment error rate $e_0$
- `detector_efficiency`: $\eta_d \in (0, 1]$
- `dark_count_rate`: $p_{\text{dark}}$
- `beta`: Test-bit fraction $\beta \in (0, 1)$
- `authentication_threshold`: $T_a \in [0, 0.5]$
- `verification_threshold`: $T_v \in [0, 0.5]$
- `intensity` ($\gamma$): Intercept-resend attack intensity $\in [0, 1]$
- `delta`: Inter-verifier fluctuation tolerance $\Delta$

## Statistical Bounds Module
1. **Hoeffding**: $P(|p - \hat{p}| \ge t) \le 2\exp(-2nt^2)$
2. **Chernoff**: $P(X \ge (1+\delta)\mu) \le \exp\left(-\frac{\delta^2}{2+\delta/3}\mu\right)$
3. **Serfling (Finite Population)**: $P(|f_n - F_N| \ge t) \le 2\exp\left(-\frac{2nt^2}{1 - (n-1)/N}\right)$
4. **Practical QDS Forgery ($\epsilon_1$) & Repudiation ($\epsilon_2$)**
