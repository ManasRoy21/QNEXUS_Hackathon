"""Binary Shannon Entropy & Mutual Information Root Solver.

Supports Practical QDS signature forgery bound calculation:
    H(S_c) >= 1 - I(B:C)

Provides:
  - binary_entropy(p): Safe binary Shannon entropy function with p=0 and p=1 limits.
  - solve_minimum_sc(I_BC, tolerance, max_iterations): Numerical root solver finding
    the minimal mismatch rate S_c in [0, 0.5] satisfying H(S_c) >= 1 - I(B:C).
"""

import math
from typing import Any, Dict, Optional


def binary_entropy(p: float) -> float:
    """Computes the binary Shannon entropy H(p) = -p log2(p) - (1-p) log2(1-p).

    Safely handles edge cases:
        H(0.0) = 0.0
        H(1.0) = 0.0

    Args:
        p: Probability value in [0.0, 1.0].

    Returns:
        Binary entropy in bits (range [0.0, 1.0]).

    Raises:
        ValueError: If p < 0.0 or p > 1.0.
    """
    if p < 0.0 or p > 1.0:
        raise ValueError(f"Probability p must be in [0.0, 1.0], received {p}")

    # Exact boundary handling
    if p == 0.0 or p == 1.0:
        return 0.0

    # Numerical guard for extreme precision near bounds
    if p < 1e-15 or (1.0 - p) < 1e-15:
        return 0.0

    return float(-p * math.log2(p) - (1.0 - p) * math.log2(1.0 - p))


def solve_minimum_sc(
    I_BC: float,
    tolerance: float = 1e-9,
    max_iterations: int = 100,
) -> Dict[str, Any]:
    """Finds the minimum mismatch rate S_c in [0.0, 0.5] satisfying H(S_c) >= 1 - I(B:C).

    In Practical QDS (Yin, Fu & Chen), Bob's uncertainty regarding Charlie's key is
    bounded by the mutual information I(B:C). The minimum mismatch rate achievable
    by an optimal forgery attack is S_c.

    Because H(p) is strictly monotonically increasing on [0.0, 0.5] from H(0)=0 to H(0.5)=1,
    the inequality H(S_c) >= 1 - I(B:C) has a unique minimal solution in [0.0, 0.5]:
      - If 1 - I(B:C) <= 0: S_c = 0.0 (Bob already has complete information)
      - If 1 - I(B:C) > 1.0: No physical solution in [0.0, 0.5] (I(B:C) < 0)
      - If 0 < 1 - I(B:C) <= 1.0: S_c is the unique root where H(S_c) = 1 - I(B:C)

    Args:
        I_BC: Mutual information between Bob and Charlie (typically in [0.0, 1.0]).
        tolerance: Convergence tolerance for bisection.
        max_iterations: Maximum bisection iterations.

    Returns:
        Dict containing:
          - I_BC: input mutual information
          - target_entropy: 1.0 - I_BC
          - S_c: minimal mismatch rate root
          - H_Sc: evaluated entropy H(S_c)
          - iterations: number of bisection steps
          - solution_exists: boolean
          - details: explanatory mathematical message
    """
    target = 1.0 - I_BC

    # Case 1: Target entropy <= 0 (Mutual information >= 1.0)
    if target <= 0.0:
        return {
            "I_BC": I_BC,
            "target_entropy": target,
            "S_c": 0.0,
            "H_Sc": 0.0,
            "iterations": 0,
            "solution_exists": True,
            "details": f"Target entropy 1 - I(B:C) = {target:.4f} <= 0; minimal S_c is trivially 0.0",
        }

    # Case 2: Target entropy > 1.0 (Mutual information < 0.0)
    if target > 1.0:
        return {
            "I_BC": I_BC,
            "target_entropy": target,
            "S_c": None,
            "H_Sc": None,
            "iterations": 0,
            "solution_exists": False,
            "details": f"Target entropy 1 - I(B:C) = {target:.4f} > 1.0 exceeds maximum binary entropy H(0.5)=1.0",
        }

    # Case 3: Target entropy == 1.0 (I(B:C) == 0.0) -> S_c = 0.5 (maximum uncertainty)
    if abs(target - 1.0) < tolerance:
        return {
            "I_BC": I_BC,
            "target_entropy": 1.0,
            "S_c": 0.5,
            "H_Sc": 1.0,
            "iterations": 0,
            "solution_exists": True,
            "details": "Target entropy is 1.0 (zero mutual information); minimal S_c is 0.50 (maximum uncertainty)",
        }

    # Case 4: 0 < target < 1 -> Bisection on [low, high] = [0.0, 0.5]
    low = 0.0
    high = 0.5
    iterations = 0

    while (high - low) > tolerance and iterations < max_iterations:
        mid = (low + high) / 2.0
        h_mid = binary_entropy(mid)
        if h_mid < target:
            low = mid
        else:
            high = mid
        iterations += 1

    s_c = round((low + high) / 2.0, 8)
    h_sc = round(binary_entropy(s_c), 8)

    return {
        "I_BC": I_BC,
        "target_entropy": round(target, 8),
        "S_c": s_c,
        "H_Sc": h_sc,
        "iterations": iterations,
        "solution_exists": True,
        "details": f"Root S_c = {s_c} satisfies H({s_c}) = {h_sc} >= {round(target, 6)}",
    }
