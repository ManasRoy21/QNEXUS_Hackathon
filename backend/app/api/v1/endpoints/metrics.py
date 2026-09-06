"""Module E: System Metrics & WebSocket Live Telemetry Stream."""

from typing import Optional
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.schemas.qds_schemas import MetricsResponse
from app.services.simulation_service import simulation_service

router = APIRouter()


@router.get("/metrics", response_model=MetricsResponse, summary="Retrieve Backend Metrics & Detection Stats")
async def get_metrics() -> MetricsResponse:
    """GET /api/v1/metrics - Returns cumulative simulation runs, average QBER, and detection rates."""
    return simulation_service.get_metrics()


@router.websocket("/stream")
async def stream_metrics(
    websocket: WebSocket,
    session_id: Optional[str] = None,
):
    """WS /ws/stream or /api/v1/stream - Live feed of quantum simulation events and threat analytics."""
    await websocket.accept()
    sid = session_id or websocket.query_params.get("session_id") or "default-stream"

    try:
        # Stream progressive simulation lifecycle telemetry frames
        async for frame in simulation_service.stream_simulation_telemetry(sid):
            await websocket.send_json(frame)

        # Keep connection open for interactive client ping/query frames
        while True:
            client_msg = await websocket.receive_text()
            # Echo back updated telemetry frame on ping
            async for frame in simulation_service.stream_simulation_telemetry(sid):
                await websocket.send_json(frame)
                break
    except WebSocketDisconnect:
        pass
    except Exception:
        pass
