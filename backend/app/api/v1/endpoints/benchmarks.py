"""Phase 2: Cross-Protocol Benchmarks & Export Endpoints (FR-F2, FR-F3)."""

from fastapi import APIRouter, HTTPException, Query, Response
from app.schemas.phase2_schemas import BenchmarkSweepRequest, BenchmarkSweepResponse
from app.services.phase2_service import phase2_service

router = APIRouter()


@router.post("/benchmarks/sweep", response_model=BenchmarkSweepResponse, summary="Execute Cross-Protocol Benchmark Sweep")
def run_sweep(request: BenchmarkSweepRequest) -> BenchmarkSweepResponse:
    """POST /api/v1/benchmarks/sweep - Evaluates multiple protocols across distance points."""
    try:
        return phase2_service.run_benchmark_sweep(request)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/benchmarks/export/csv", summary="Export Session or Audit Data as CSV")
def export_csv(session_id: str = Query(None, description="Optional specific session ID to export")) -> Response:
    """GET /api/v1/benchmarks/export/csv - Downloads CSV audit report."""
    csv_content = phase2_service.export_csv(session_id)
    filename = f"qds-phase2-report-{session_id or 'all'}.csv"
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/benchmarks/export/report/{session_id}", summary="Export Printable HTML/PDF Audit Report")
def export_html_report(session_id: str) -> Response:
    """GET /api/v1/benchmarks/export/report/{session_id} - Printable audit report with SIMULATED badging."""
    try:
        html = phase2_service.export_html_report(session_id)
        return Response(content=html, media_type="text/html")
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
