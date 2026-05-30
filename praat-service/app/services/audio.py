# Downloads remote audio and converts it to mono 16 kHz WAV via ffmpeg
import shutil
import subprocess
import tempfile
import uuid
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import urlopen

DOWNLOAD_TIMEOUT_SECS = 30


class AudioDownloadError(Exception):
    """Raised when audio cannot be downloaded or converted."""


def download_and_convert_audio(audio_url: str, sample_rate: int = 16_000) -> Path:
    work_dir = Path(tempfile.mkdtemp(prefix="praat-audio-"))
    raw_path = work_dir / f"{uuid.uuid4().hex}.bin"
    wav_path = work_dir / "converted.wav"

    try:
        with urlopen(audio_url, timeout=DOWNLOAD_TIMEOUT_SECS) as response:
            raw_path.write_bytes(response.read())
    except (HTTPError, URLError, TimeoutError) as exc:
        cleanup_audio_paths(raw_path, wav_path)
        raise AudioDownloadError(f"Failed to download audio: {exc}") from exc

    ffmpeg = shutil.which("ffmpeg")
    if ffmpeg is None:
        cleanup_audio_paths(raw_path, wav_path)
        raise AudioDownloadError("ffmpeg is not installed")

    result = subprocess.run(
        [
            ffmpeg,
            "-y",
            "-i",
            str(raw_path),
            "-ac",
            "1",
            "-ar",
            str(sample_rate),
            str(wav_path),
        ],
        capture_output=True,
        text=True,
        check=False,
    )

    raw_path.unlink(missing_ok=True)

    if result.returncode != 0 or not wav_path.exists():
        cleanup_audio_paths(wav_path)
        detail = (result.stderr or result.stdout or "unknown ffmpeg error").strip()
        raise AudioDownloadError(f"ffmpeg conversion failed: {detail}")

    return wav_path


def cleanup_audio_paths(*paths: Path) -> None:
    seen_dirs: set[Path] = set()
    for path in paths:
        if path.exists():
            path.unlink(missing_ok=True)
        parent = path.parent
        if parent.name.startswith("praat-audio-") and parent not in seen_dirs:
            seen_dirs.add(parent)
            shutil.rmtree(parent, ignore_errors=True)
