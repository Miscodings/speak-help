import numpy as np
import tempfile
import os
from scipy.io.wavfile import write
from faster_whisper import WhisperModel
from config import DEVICE, COMPUTE_TYPE, MODEL_SIZE, SAMPLE_RATE, SILENCE_THRESHOLD

print(f"Loading faster-whisper model: {MODEL_SIZE}...")
model = WhisperModel(MODEL_SIZE, device=DEVICE, compute_type=COMPUTE_TYPE)
print("Model loaded.")


def transcribe_audio(audio_bytes):
    if len(audio_bytes) < 2000:
        return None

    audio_float32 = np.frombuffer(audio_bytes, dtype=np.float32)
    if np.max(np.abs(audio_float32)) < SILENCE_THRESHOLD:
        return None

    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
        write(f.name, SAMPLE_RATE, audio_float32)
        tmp_path = f.name

    try:
        segments, _ = model.transcribe(
            tmp_path, beam_size=5, temperature=0.0, log_prob_threshold=-1.0
        )
        return " ".join(seg.text for seg in segments).strip()
    finally:
        os.remove(tmp_path)
