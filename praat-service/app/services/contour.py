# Extracts F0 and intensity contours from WAV audio using parselmouth
import math

import parselmouth

from app.models import ContourData

FRAME_STEP_SECS = 0.01
MIN_DURATION_SECS = 1.0


class ContourExtractionError(Exception):
    """Raised when contour extraction fails."""


def extract_contour(wav_path: str, expected_duration_secs: float) -> ContourData:
    try:
        sound = parselmouth.Sound(wav_path)
    except Exception as exc:
        raise ContourExtractionError(f"Invalid WAV file: {exc}") from exc

    duration_secs = float(sound.duration)
    if duration_secs < MIN_DURATION_SECS:
        raise ContourExtractionError("Audio shorter than 1 second")

    pitch = sound.to_pitch(time_step=FRAME_STEP_SECS)
    intensity = sound.to_intensity(time_step=FRAME_STEP_SECS)

    f0_values = pitch.selected_array["frequency"]
    intensity_values = intensity.values[0]

    frame_count = min(len(f0_values), len(intensity_values))
    f0_hz: list[float] = []
    intensity_db: list[float] = []
    voiced: list[bool] = []

    for index in range(frame_count):
        raw_f0 = float(f0_values[index])
        is_voiced = not math.isnan(raw_f0) and raw_f0 > 0
        f0_hz.append(raw_f0 if is_voiced else 0.0)
        voiced.append(is_voiced)
        intensity_db.append(float(intensity_values[index]))

    duration_ms = max(
        int(round(expected_duration_secs * 1000)),
        int(round(duration_secs * 1000)),
    )

    return ContourData(
        frame_ms=int(FRAME_STEP_SECS * 1000),
        f0_hz=f0_hz,
        intensity_db=intensity_db,
        voiced=voiced,
        duration_ms=duration_ms,
    )
