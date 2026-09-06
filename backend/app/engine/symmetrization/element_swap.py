"""Bob & Charlie encrypted classical swap for QDS Symmetrization Guard."""

def perform_element_swap(bob_key: list, charlie_key: list, swap_indices: list[int]):
    """Swaps half of key elements between Bob and Charlie to guarantee non-repudiation."""
    new_bob = list(bob_key)
    new_charlie = list(charlie_key)
    for idx in swap_indices:
        if idx < len(new_bob) and idx < len(new_charlie):
            new_bob[idx], new_charlie[idx] = new_charlie[idx], new_bob[idx]
    return new_bob, new_charlie
