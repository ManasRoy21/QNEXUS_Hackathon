"""Timestamp, nonce & Bell-pair ID check."""
import time

class ReplayGuard:
    def __init__(self, ttl_seconds: int = 300):
        self.ttl_seconds = ttl_seconds
        self.seen_nonces = set()
        self.seen_bell_ids = set()

    def validate(self, nonce: str, bell_pair_id: str, timestamp: float) -> bool:
        """Validates that token timestamp is within TTL and nonce/Bell pair ID is unique."""
        now = time.time()
        if abs(now - timestamp) > self.ttl_seconds:
            return False
        if nonce in self.seen_nonces or bell_pair_id in self.seen_bell_ids:
            return False
        self.seen_nonces.add(nonce)
        self.seen_bell_ids.add(bell_pair_id)
        return True
