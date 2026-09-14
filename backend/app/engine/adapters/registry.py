"""Phase 2: Protocol Registry & Catalogue.

Implements FR-A1, FR-A3, and Appendix A:
  - Manages active protocol adapters implementing the 4-method interface (Section 5.1)
  - Stores read-only theoretical protocol reference records (Gottesman-Chuang, ACJ, AQS, IBQS, Counterfactual)
  - Provides metadata, descriptions, experimental milestones, and parameter boundaries
"""

from typing import Any, Dict, List, Optional
from app.engine.adapters.base import BaseProtocolAdapter
from app.engine.adapters.practical_qds import PracticalQDSAdapter
from app.engine.adapters.mdi_qds import MDIQDSAdapter
from app.engine.adapters.otuh_qds import OTUHQDSAdapter
from app.engine.adapters.tf_qds import TFQDSAdapter
from app.engine.adapters.decoy_qds import DecoyStateQDSAdapter


class ProtocolRegistry:
    """Central registry of practical executable adapters and theoretical references."""

    def __init__(self):
        self._adapters: Dict[str, BaseProtocolAdapter] = {}
        self._theoretical_references: Dict[str, Dict[str, Any]] = {}
        self._register_default_adapters()
        self._register_theoretical_references()

    def _register_default_adapters(self):
        """Registers the 5 experimentally demonstrated practical protocol adapters."""
        self.register_adapter(PracticalQDSAdapter())
        self.register_adapter(MDIQDSAdapter())
        self.register_adapter(OTUHQDSAdapter())
        self.register_adapter(TFQDSAdapter())
        self.register_adapter(DecoyStateQDSAdapter())

    def register_adapter(self, adapter: BaseProtocolAdapter):
        """Registers an active executable protocol adapter."""
        self._adapters[adapter.protocol_id] = adapter

    def get_adapter(self, protocol_id: str) -> Optional[BaseProtocolAdapter]:
        """Retrieves an executable protocol adapter by ID."""
        return self._adapters.get(protocol_id)

    def _register_theoretical_references(self):
        """Populates read-only reference entries sourced from Phase-1 brief (FR-A3, Appendix A)."""
        self._theoretical_references = {
            "gottesman_chuang": {
                "id": "gottesman_chuang",
                "name": "Gottesman-Chuang (2001)",
                "status": "Theoretical reference",
                "category": "theoretical",
                "is_interactive": False,
                "year": "2001",
                "key_strength": "First proof that Quantum Digital Signatures are theoretically possible",
                "best_result": "Proof of concept only (requires long-term quantum memory)",
                "description": (
                    "The seminal Gottesman-Chuang protocol established that quantum states can provide "
                    "information-theoretically secure digital signatures with non-repudiation. However, it "
                    "relies on swap tests and long-term coherent quantum memories which remain technologically "
                    "unavailable. Provided here as a foundational theoretical benchmark."
                ),
                "citation": "Gottesman, D. & Chuang, I. — arXiv:quant-ph/0105032 (2001)",
            },
            "acj_coherent_state": {
                "id": "acj_coherent_state",
                "name": "ACJ Coherent-State (2006)",
                "status": "Theoretical reference",
                "category": "theoretical",
                "is_interactive": False,
                "year": "2006",
                "key_strength": "Simplified quantum states to standard laser light pulses",
                "best_result": "Enabled later experimental laboratory trials",
                "description": (
                    "Andersson, Curty, and Jex (ACJ) replaced complex single-photon and entangled state "
                    "requirements with phase-encoded coherent states produced by standard semiconductor lasers. "
                    "While it paved the way for modern fiber implementations, initial formulations still required "
                    "unrealistic optical multiport hardware."
                ),
                "citation": "Andersson, Curty & Jex — Phys. Rev. A 74, 022304 (2006)",
            },
            "aqs_arbitrated": {
                "id": "aqs_arbitrated",
                "name": "Arbitrated Quantum Signatures (AQS)",
                "status": "Mostly theoretical",
                "category": "theoretical",
                "is_interactive": False,
                "year": "2000s–2020s",
                "key_strength": "Multi-particle entanglement with a central trusted arbitrator",
                "best_result": "Simulation-level / Small laboratory tests",
                "description": (
                    "AQS schemes rely on an active, trusted arbitrator (Charlie) who mediates signature verification "
                    "using Greenberger-Horne-Zeilinger (GHZ) or Bell entangled states. Vulnerable to trusted-insider "
                    "compromise, inspiring modern arbitrator-independent protocols like Practical QDS and MDI-QDS."
                ),
                "citation": "Zeng, G. & Keitel, C. H. — Phys. Rev. A 65, 042312 (2002)",
            },
            "ibqs_identity": {
                "id": "ibqs_identity",
                "name": "Identity-Based Quantum Signatures (IBQS)",
                "status": "Theoretical / early PoC",
                "category": "theoretical",
                "is_interactive": False,
                "year": "2019–2024",
                "key_strength": "Public identity string (email/IP) acts directly as public key",
                "best_result": "Small proof-of-concept laboratory validation",
                "description": (
                    "Integrates identity-based cryptography with quantum key distributions, allowing Alice's "
                    "public identifier to derive quantum verification keys without public-key certificates. "
                    "Currently in theoretical refinement for quantum metropolitan networks."
                ),
                "citation": "Gu et al. — IEEE Trans. Quantum Eng. (2022)",
            },
            "counterfactual_qds": {
                "id": "counterfactual_qds",
                "name": "Counterfactual / TF-Counterfactual QDS",
                "status": "Theoretical / early experiments",
                "category": "theoretical",
                "is_interactive": False,
                "year": "2023+",
                "key_strength": "Zero-transmission signatures: signs messages with virtually zero travelling photons",
                "best_result": "Formal security proofs published; optical table PoC",
                "description": (
                    "Exploits the quantum Zeno effect to execute digital signatures without photons actually "
                    "traversing the transit channel between signer and verifier, fundamentally eliminating channel "
                    "interception vulnerabilities."
                ),
                "citation": "Rao, P. et al. — Phys. Rev. A (2022); Zhang et al. (2023)",
            },
        }

    def list_all_protocols(self) -> List[Dict[str, Any]]:
        """Returns catalogue of all protocols (active + theoretical) for UI selection."""
        catalogue = []

        # Active practical protocols
        for pid, adapter in self._adapters.items():
            catalogue.append({
                "id": pid,
                "name": adapter.name,
                "status": "Experimentally proven",
                "category": "experimental",
                "is_interactive": True,
                "description": adapter.description,
                "supported_parameters": {
                    "distance_km": {"min": 0.0, "max": 500.0, "default": 20.0},
                    "channel_loss_db": {"min": 0.0, "max": 100.0, "default": 4.0},
                    "message_size_bytes": {"min": 1, "max": 10485760, "default": 256},
                    "decoy_state_count": {"min": 1, "max": 5, "default": 3},
                    "failure_probability": {"min": 1e-12, "max": 1e-3, "default": 1e-9},
                },
            })

        # Theoretical reference protocols
        for pid, ref in self._theoretical_references.items():
            catalogue.append(ref)

        return catalogue

    def get_protocol_info(self, protocol_id: str) -> Optional[Dict[str, Any]]:
        """Retrieves details of any protocol by ID."""
        if protocol_id in self._adapters:
            adapter = self._adapters[protocol_id]
            return {
                "id": adapter.protocol_id,
                "name": adapter.name,
                "status": "Experimentally proven",
                "category": "experimental",
                "is_interactive": True,
                "description": adapter.description,
            }
        elif protocol_id in self._theoretical_references:
            return self._theoretical_references[protocol_id]
        return None


# Global Singleton Registry Instance
protocol_registry = ProtocolRegistry()
