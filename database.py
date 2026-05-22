import sqlite3
from config import DB_FILE


def init_db():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            transcription TEXT NOT NULL,
            avg_wpm INTEGER NOT NULL,
            filler_count INTEGER NOT NULL,
            duration REAL NOT NULL
        )
    ''')
    conn.commit()
    conn.close()


def get_all_sessions():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM sessions ORDER BY timestamp DESC")
    sessions = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return sessions


def save_session(transcription, avg_wpm, filler_count, duration):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO sessions (transcription, avg_wpm, filler_count, duration) VALUES (?, ?, ?, ?)",
        (transcription, avg_wpm, filler_count, round(duration, 2))
    )
    conn.commit()
    conn.close()
