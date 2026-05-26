import os
from dotenv import load_dotenv
load_dotenv()

SAMPLE_RATE = 16000
FILLER_WORDS = [
    # vocal fillers
    "um", "uh", "er", "ah",
    # discourse fillers
    "like", "basically", "actually", "you know", "so", "literally",
    "i mean", "well", "okay", "ok", "right", "anyway", "honestly",
    "totally", "seriously", "obviously", "sort of", "kind of", "you see",
]
DB_FILE = os.environ.get("DATABASE_PATH", "history.db")
SILENCE_THRESHOLD = 0.01

TIER_LIMITS = {
    'free':   {'transcription_seconds': 3600, 'ai_tips': 20},
    'pro':    {'transcription_seconds': None,  'ai_tips': None},
    'studio': {'transcription_seconds': None,  'ai_tips': None},
}
