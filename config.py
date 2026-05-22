from dotenv import load_dotenv
load_dotenv()

SAMPLE_RATE = 16000
FILLER_WORDS = ["um", "uh", "like", "basically", "actually", "you know", "so", "literally", "i mean", "well"]
DB_FILE = "history.db"
SILENCE_THRESHOLD = 0.01
