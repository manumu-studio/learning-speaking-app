# Pydantic request/response models for contour extraction API
from typing import Literal

from pydantic import BaseModel, ConfigDict, HttpUrl


class ExtractRequest(BaseModel):
    model_config = ConfigDict(frozen=True)

    audio_url: HttpUrl
    duration_secs: float
    sample_rate: int = 16_000


class ContourData(BaseModel):
    model_config = ConfigDict(frozen=True)

    frame_ms: int
    f0_hz: list[float]
    intensity_db: list[float]
    voiced: list[bool]
    duration_ms: int


class ExtractResponse(BaseModel):
    model_config = ConfigDict(frozen=True)

    status: Literal["ok", "error"]
    contour: ContourData | None = None
    error: str | None = None
