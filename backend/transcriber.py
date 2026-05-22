import os
import tempfile
import numpy as np
from scipy.io.wavfile import write as wav_write
from groq import Groq
from config import SAMPLE_RATE, SILENCE_THRESHOLD

_client = None


def _get_client():
    global _client
    if _client is None:
        _client = Groq(api_key=os.environ.get("GROQ_API_KEY"))
    return _client


def transcribe_audio(audio_bytes):
    if len(audio_bytes) < 2000:
        return None

    audio_f32 = np.frombuffer(audio_bytes, dtype=np.float32)
    if np.max(np.abs(audio_f32)) < SILENCE_THRESHOLD:
        return None

    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
        wav_write(f.name, SAMPLE_RATE, audio_f32)
        tmp_path = f.name

    try:
        with open(tmp_path, "rb") as audio_file:
            result = _get_client().audio.transcriptions.create(
                file=("segment.wav", audio_file.read()),
                model="whisper-large-v3-turbo",
                response_format="text",
                language="en"
            )
        text = result.strip() if result else None
        return text or None
    except Exception as e:
        print(f"[TRANSCRIPTION ERROR] {e}")
        return None
    finally:
        os.remove(tmp_path)
