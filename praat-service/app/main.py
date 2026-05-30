# FastAPI entrypoint for the Praat parselmouth contour microservice
import logging
from collections.abc import Awaitable, Callable

from fastapi import FastAPI, Request, Response

from app.config import settings
from app.routes.extract import router as extract_router

logging.basicConfig(level=settings.log_level.upper())

app = FastAPI(title="Praat Contour Service", version=settings.service_version)
app.include_router(extract_router)


@app.middleware("http")
async def attach_response_time(
    request: Request,
    call_next: Callable[[Request], Awaitable[Response]],
) -> Response:
    response = await call_next(request)
    elapsed_ms = getattr(request.state, "response_time_ms", None)
    if isinstance(elapsed_ms, int):
        response.headers["X-Response-Time-Ms"] = str(elapsed_ms)
    return response


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "version": settings.service_version}
