# Validation of the image lab

Validated locally on 24 October 2026 with Python 3.12.14, Qiskit 2.6.1, Aer 0.18.0, Node 23.10.0, and Next.js 14.2.35.

- Full pytest suite: **140 passed** (109 existing + 31 new).
- Next.js production build: succeeded, including TypeScript checks.
- Browser guided demo: original verified; region edit rejected; six changed tiles highlighted.
- Browser one-pixel edit: rejected with exactly one changed tile.
- Browser intercept/resend: original pixels still match; both channel checks reject.
- Browser evidence shows actual Qiskit/Aer versions, seeds, shot counts, measured errors, expected error, and circuit inspection.

Observed examples at seed 42, 4096 transmitted shots per verifier (2048 retained after matching-basis selection):

| Scenario | Noise | Interception | Expected QBER | Bob errors / QBER | Charlie errors / QBER |
|---|---:|---:|---:|---:|---:|
| Clean baseline | 1% | 0% | 1% | 19 / 0.928% | 16 / 0.781% |
| Eve intercepts | 1% | 100% | 25.5% | 515 / 25.146% | 513 / 25.049% |

These are observed simulation results, not detection guarantees or hardware measurements. The 31 new tests include theoretical/observed QBER comparisons across six configurations, seeded repetition, pixel localization, recompression behavior, resize handling, invalid/animated/oversized images, signed-manifest tampering, cross-issuer rejection, offline verification, persistent issuer configuration, and bounded input/API checks.

Pytest reports an upstream FastAPI/Starlette TestClient deprecation warning concerning the next HTTP client integration. It does not affect the passing tests. Browser layout was inspected at the available desktop viewport; responsive CSS is included, but a separate physical mobile-device check was not performed.

## Backend expansion

Full suite after the backend expansion: **176 passed**, including 28 new physics/persistence/job tests and 8 new message-evidence tests. The production build passes with TypeScript validation.

New checks cover matched/conjugate-basis Born-rule behavior, expected intercepted/noisy QBER, dark-count-dominated channels, zero-arrival refusal, direct use of sampler outcomes, full transcript replay, the Serfling expression and sampled coverage, SQLite reopening, immutable baseline attack execution, job idempotency/capacity/cancellation/failure/interruption, CSV/JSON/run APIs, real thread-pool completion, current-message signing, altered-message detection, forged receipt rejection, and binding to saved evidence.

Browser checks confirm Aer material generation in the original workflow, live 20-trial job completion, and persisted study replay. At seed 42, 8192 pulses, 10 km, four repeats per interception fraction, the first integrated study observed:

| Intercepted fraction | Mean QBER | Rejected | Passed | Inconclusive |
|---:|---:|---:|---:|---:|
| 0% | 0.920% | 0 | 4 | 0 |
| 5% | 2.380% | 0 | 4 | 0 |
| 15% | 4.732% | 0 | 0 | 4 |
| 40% | 11.162% | 4 | 0 | 0 |
| 100% | 25.815% | 4 | 0 | 0 |

These are settings-specific simulated outcomes, not general security claims. Four-trial rate intervals are intentionally wide. Per-run QBER means are averaged across the two channels and repeats. The v2.1 reproducibility fingerprint additionally binds model and request parameters; it is not a digital signature.

Final browser validation also loaded a canonical run created before an actual API restart, signed a new receipt against that persisted run, displayed a valid signature with an inconclusive channel policy, and rejected a one-character message alteration as `MESSAGE_CHANGED` for both verifier views.

The final v2.1 twenty-trial study and its browser-triggered replay produced the same evidence fingerprint:

`fa30ae6c11f4d6f5a8d68c06b5cdc577c683e763b42e1bfe6ff9392b3bc7eda7`

Actual endpoint exports are included in [JSON](experiments/qiskit-attack-study.json) and [CSV](experiments/qiskit-attack-study.csv). The backend results screenshot is [here](screenshots/backend-study.png).
