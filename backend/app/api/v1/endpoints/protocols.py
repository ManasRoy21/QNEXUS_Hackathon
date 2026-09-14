"""Phase 2: Protocol Catalogue Endpoints (FR-A1, FR-A3, Appendix A)."""

from fastapi import APIRouter, HTTPException
from app.engine.adapters.registry import protocol_registry
from app.schemas.phase2_schemas import ProtocolCatalogueResponse, ProtocolInfo

router = APIRouter()


@router.get("/protocols", response_model=ProtocolCatalogueResponse, summary="List Protocol Catalogue")
def list_protocols() -> ProtocolCatalogueResponse:
    """GET /api/v1/protocols - Lists both experimentally proven practical adapters and theoretical references."""
    items = protocol_registry.list_all_protocols()
    parsed = [ProtocolInfo(**item) for item in items]
    return ProtocolCatalogueResponse(
        total=len(parsed),
        protocols=parsed,
    )


@router.get("/protocols/{protocol_id}", response_model=ProtocolInfo, summary="Get Protocol Details")
def get_protocol(protocol_id: str) -> ProtocolInfo:
    """GET /api/v1/protocols/{protocol_id} - Fetches detailed info and limits for a specific protocol."""
    info = protocol_registry.get_protocol_info(protocol_id)
    if not info:
        raise HTTPException(status_code=404, detail=f"Protocol '{protocol_id}' not found in registry.")
    return ProtocolInfo(**info)
