# POST /api/v1/extract — downloads audio and returns F0/intensity contours
import logging
import time
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, Request

from app.auth import verify_api_key
from app.models import ExtractRequest, ExtractResponse
from app.services.audio import AudioDownloadError, cleanup_audio_paths, download_and_convert_audio
from app.services.contour import ContourExtractionError, extract_contour

router = APIRouter(prefix="/api/v1", tags=["extract"])
logger = logging.getLogger("praat.extract")


@router.post("/extract", response_model=ExtractResponse, dependencies=[Depends(verify_api_key)])
async def extract_endpoint(request: Request, body: ExtractRequest) -> ExtractResponse:
    request_id = request.headers.get("X-Request-Id", uuid.uuid4().hex)
    started = time.perf_counter()
    wav_path: Path | None = None

    logger.info(
        "extract_started request_id=%s duration_secs=%.2f",
        request_id,
        body.duration_secs,
    )

    try:
        wav_path = download_and_convert_audio(str(body.audio_url), body.sample_rate)
        contour = extract_contour(str(wav_path), body.duration_secs)
        response = ExtractResponse(status="ok", contour=contour)
    except (AudioDownloadError, ContourExtractionError) as exc:
        logger.warning("extract_failed request_id=%s error=%s", request_id, exc)
        response = ExtractResponse(status="error", error=str(exc))
    except Exception as exc:
        logger.exception("extract_unexpected request_id=%s", request_id)
        response = ExtractResponse(status="error", error="Unexpected extraction failure")
    finally:
        if wav_path is not None:
            cleanup_audio_paths(wav_path)

    elapsed_ms = int((time.perf_counter() - started) * 1000)
    request.state.response_time_ms = elapsed_ms
    logger.info(
        "extract_finished request_id=%s status=%s elapsed_ms=%d",
        request_id,
        response.status,
        elapsed_ms,
    )
    return response
