"""Module G: Symmetrization & Repudiation Guard (CV-QDS, Thornton et al.).

Implements classical post-distribution symmetrization between Bob and Charlie.
Alice distributes quantum state preparation data (target_bases, pauli_states) to
both verifiers during the signing phase. Before verifying, Bob and Charlie execute
a classical encrypted exchange — swapping a secret subset of indices between
themselves — so that any asymmetry Alice injected is redistributed equally.

Key properties:
  - Alice receives NO information about which indices were swapped.
  - Swap fraction is configurable (default 50% of signature bits).
  - Purely classical post-processing: zero new Qiskit circuits.
  - Closes the repudiation gap: a dishonest Alice who distributes inconsistent
    states to Bob vs. Charlie can no longer cause verifier disagreement.
"""

import random
from copy import deepcopy
from dataclasses import dataclass
from typing import Any, Dict, List, Set, Tuple

from app.engine.protocol.qds_protocol import QDSSignatureBlock


@dataclass
class SymmetrizationTelemetry:
    """Structured telemetry emitted after a symmetrization exchange.

    Attributes:
        swap_indices: Sorted list of digest-bit indices selected for swapping.
        swap_count: Number of indices swapped (= len(swap_indices)).
        total_bits: Total number of bits in the signature digest.
        swap_ratio_actual: Actual swap fraction achieved (may differ from target due to rounding).
        alice_informed: Always False — Alice is cryptographically excluded from swap metadata.
    """

    swap_indices: List[int]
    swap_count: int
    total_bits: int
    swap_ratio_actual: float
    alice_informed: bool = False


class SymmetrizationGuard:
    """Performs authenticated classical symmetrization between Bob and Charlie verifiers.

    Protocol (per Thornton et al. CV-QDS):
        1. Bob and Charlie each hold a QDSSignatureBlock prepared by Alice.
        2. They agree on a secret random subset S ⊂ {0, …, N-1} of swap positions
           over an authenticated, encrypted classical channel.
        3. For each i ∈ S, Bob and Charlie exchange:
              target_bases[i]  (the basis choice: 'Z' or 'X')
              pauli_states[i]  (the Pauli state: '0', '1', '+', '-')
        4. Both verifiers run their now-symmetrized blocks through the QDS detector.
        5. A dishonest Alice's asymmetric state preparation is exposed because the
           injected mismatch is shared equally — both verifiers see elevated error rates.
    """

    def perform_symmetrization(
        self,
        bob_block: QDSSignatureBlock,
        charlie_block: QDSSignatureBlock,
        swap_ratio: float = 0.5,
        seed: int = None,
    ) -> Tuple[QDSSignatureBlock, QDSSignatureBlock, SymmetrizationTelemetry]:
        """Executes the classical symmetrization swap between Bob and Charlie.

        Args:
            bob_block: Bob's QDSSignatureBlock as distributed by Alice.
            charlie_block: Charlie's QDSSignatureBlock as distributed by Alice.
            swap_ratio: Fraction of signature bits to exchange (0.0–1.0, default 0.5).
            seed: Optional RNG seed for reproducible experiments.

        Returns:
            Tuple of:
              - symmetrized_bob: Bob's updated block after swapping S indices with Charlie.
              - symmetrized_charlie: Charlie's updated block after swapping S indices with Bob.
              - telemetry: SymmetrizationTelemetry with swap indices and metadata.

        Raises:
            ValueError: If blocks have different digest lengths or swap_ratio is out of range.
        """
        if len(bob_block.target_bases) != len(charlie_block.target_bases):
            raise ValueError(
                f"Symmetrization requires equal-length signature blocks: "
                f"Bob={len(bob_block.target_bases)}, Charlie={len(charlie_block.target_bases)}"
            )
        if not 0.0 <= swap_ratio <= 1.0:
            raise ValueError(f"swap_ratio must be in [0.0, 1.0], got {swap_ratio}")

        n_bits = len(bob_block.target_bases)
        n_swap = max(1, round(swap_ratio * n_bits))

        # Deep-copy to avoid mutating caller's originals
        sym_bob = deepcopy(bob_block)
        sym_charlie = deepcopy(charlie_block)

        # Secret index selection — Alice cannot observe this
        rng = random.Random(seed)
        swap_indices: List[int] = sorted(rng.sample(range(n_bits), min(n_swap, n_bits)))

        # Classical encrypted swap over authenticated channel
        for idx in swap_indices:
            # Swap target_bases at position idx
            sym_bob.target_bases[idx], sym_charlie.target_bases[idx] = (
                sym_charlie.target_bases[idx],
                sym_bob.target_bases[idx],
            )
            # Swap pauli_states at position idx
            sym_bob.pauli_states[idx], sym_charlie.pauli_states[idx] = (
                sym_charlie.pauli_states[idx],
                sym_bob.pauli_states[idx],
            )

        # Tag symmetrization metadata on each block (for audit trail, NOT shared with Alice)
        sym_bob.public_key_registers["symmetrized"] = True
        sym_bob.public_key_registers["symmetrization_swap_count"] = len(swap_indices)
        sym_charlie.public_key_registers["symmetrized"] = True
        sym_charlie.public_key_registers["symmetrization_swap_count"] = len(swap_indices)

        telemetry = SymmetrizationTelemetry(
            swap_indices=swap_indices,
            swap_count=len(swap_indices),
            total_bits=n_bits,
            swap_ratio_actual=len(swap_indices) / n_bits,
            alice_informed=False,
        )

        return sym_bob, sym_charlie, telemetry

    def compute_state_mismatch_rate(
        self,
        bob_block: QDSSignatureBlock,
        charlie_block: QDSSignatureBlock,
    ) -> Dict[str, Any]:
        """Computes per-index basis and state mismatches between Bob's and Charlie's blocks.

        Used by the repudiation detector to quantify how asymmetric Alice's state
        distribution was before and after symmetrization.

        Args:
            bob_block: Bob's signature block.
            charlie_block: Charlie's signature block.

        Returns:
            Dict with keys:
              - mismatch_rate (float): fraction of positions where bases differ.
              - basis_mismatches (int): number of positions with different target_bases.
              - state_mismatches (int): number of positions with different pauli_states.
              - mismatch_indices (List[int]): indices of any basis mismatch.
        """
        n = len(bob_block.target_bases)
        basis_mm: List[int] = [
            i for i in range(n) if bob_block.target_bases[i] != charlie_block.target_bases[i]
        ]
        state_mm: List[int] = [
            i for i in range(n) if bob_block.pauli_states[i] != charlie_block.pauli_states[i]
        ]
        mismatch_rate = len(basis_mm) / max(1, n)

        return {
            "mismatch_rate": mismatch_rate,
            "basis_mismatches": len(basis_mm),
            "state_mismatches": len(state_mm),
            "mismatch_indices": basis_mm,
            "total_bits": n,
        }
