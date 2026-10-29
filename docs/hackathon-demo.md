# Three-minute hackathon demo

## The pitch (20 seconds)

“An image can change without looking different. Our lab makes that visible. We seal the image with an authenticated fingerprint, try to alter it, and show exactly which regions fail verification. Alongside that, real Qiskit circuits let us stress a simulated quantum communication channel and inspect its error statistics.”

Audience: quantum-communication students and researchers who need an accessible, reproducible teaching and experimentation tool.

## Before presenting

Run `npm run demo`. Confirm **Simulator connected**. Keep one API process alive because default signing keys are ephemeral. Use the bundled synthetic image; no external network or IBM account is required after installing dependencies. Rehearse on the machine you will present from.

## Live sequence (2 minutes)

1. **Clean channel → Seal original → Verify image.** Show authentic receipt, matching pixels, both verifiers accepting, and actual QBER with seed/shots.
2. **Try a 1-pixel edit → Verify image.** The image looks unchanged, but one tile is highlighted and the candidate is rejected. The signed original is unchanged.
3. **Restore → Verify image.** Show that exact pixel integrity is restored.
4. **Eve intercepts → Seal original → Verify image.** Keep candidate pixels original. Show matching pixels and failing channel policy. QBER should be around 25.5% at the default 1% channel noise; do not promise exact counts.
5. **Inspect actual circuit.** Point to state preparation, Eve’s averaged measurement/resend channel, noise, and final measurement. This is actual Qiskit Aer execution.
6. **Download experiment receipt.** Show the seed, configuration, measurements, image hashes, and Ed25519 signature. Explain how a trusted public key enables offline verification.

For a fast fallback, **Run guided demo** executes the clean baseline plus region-edit checks. It uses the current original and resets channel settings to the default clean configuration.

## Closing (20 seconds)

“Instead of a green security badge with no explanation, we show the evidence: which pixels changed, which channel check failed, and which experiment produced the result. Every result has a model, a seed, and a signed receipt.”

## Questions to prepare for

**What part is quantum?** The channel experiment: four-state preparation, measurement in two bases, quantum noise, and interception-induced disturbance, executed with Qiskit Aer.

**Would ordinary signatures already detect image edits?** Yes. Ed25519 and SHA-256 provide the image integrity checks. Our contribution is the interactive teaching experience, spatial change evidence, and reproducible quantum-channel experiment tied to the receipt. We do not claim quantum advantage for image hashing.

**Is this a complete QDS implementation?** No. It is a QDS-inspired demonstrator and channel teaching model. Full QDS needs protocol-specific distribution, symmetrization, and security analysis. The repository’s existing research workflow is separate and has its own assumptions.

**Does this detect AI-generated images?** No. It detects changes since sealing; it does not establish that an original image is truthful.

**Does Eve always get caught?** No. Weak attacks can fall below the illustrative policy; noisy honest channels can exceed it. Results depend on attack fraction, noise, sample count, and assumptions.

**Why an 11% threshold?** It is a visible educational policy, not a security theorem for this implementation. Do not describe it as a proven finite-key QDS limit.

**Who are Bob and Charlie?** Separate seeded channel trials and policy views in the local simulation. They are not independent machines or distributed key holders.

**What is new compared with the cloned repository?** The image workflow, signed receipts, exact tile localization, guided demo, dedicated Aer channel experiment with measured evidence, offline verifier, and scientific/integrity regression tests.

## Stronger backend demonstration

After the image introduction, open `/experiments` and run the default 20-trial Qiskit study:

1. Point out that actual measurement outcomes feed the protocol-distribution registers.
2. Compare the clean point, weak attacks that pass, intermediate attacks with inconclusive evidence, and stronger attacks that reject. Read measured results from the current run.
3. Open an individual trial to show simulator versions, separate seeds, actual circuit counts, and sample/retained error evidence.
4. Replay the study. Compare its evidence fingerprint; timings and record IDs may change while deterministic evidence repeats on the tested versions.
5. Export JSON/CSV. Reload the page to demonstrate persisted studies. A stopped unfinished job becomes interrupted and can be replayed.
6. In `/workflow`, select Aer, generate material, and open the message evidence step. Sign, verify, change a character without re-signing, and verify again. Explain the classical signature and quantum-distribution evidence separately.

These observed failure modes and replayable backend records are stronger evidence than a universal “100% detection” badge. Small repeated-trial samples have wide confidence intervals; the UI displays those limits.
