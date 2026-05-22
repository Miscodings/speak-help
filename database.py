import sqlite3
from config import DB_FILE


def init_db():
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()

    c.execute('''CREATE TABLE IF NOT EXISTS users (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        email         TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        tier          TEXT DEFAULT 'free',
        created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
    )''')

    c.execute('''CREATE TABLE IF NOT EXISTS sessions (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp     DATETIME DEFAULT CURRENT_TIMESTAMP,
        transcription TEXT NOT NULL,
        avg_wpm       INTEGER NOT NULL,
        filler_count  INTEGER NOT NULL,
        duration      REAL NOT NULL,
        user_id       INTEGER REFERENCES users(id)
    )''')

    # Migrate existing sessions table if user_id column is missing
    c.execute("PRAGMA table_info(sessions)")
    cols = [row[1] for row in c.fetchall()]
    if 'user_id' not in cols:
        c.execute("ALTER TABLE sessions ADD COLUMN user_id INTEGER REFERENCES users(id)")

    conn.commit()
    conn.close()


# ── User queries ──────────────────────────────────────────────────

def get_user_by_id(user_id):
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    conn.close()
    return dict(row) if row else None


def get_user_by_email(email):
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    row = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
    conn.close()
    return dict(row) if row else None


def create_user(email, password_hash):
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute(
        "INSERT INTO users (email, password_hash) VALUES (?, ?)",
        (email, password_hash)
    )
    user_id = c.lastrowid
    conn.commit()
    conn.close()
    return user_id


# ── Session queries ───────────────────────────────────────────────

def get_sessions_for_user(user_id):
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    rows = conn.execute(
        "SELECT * FROM sessions WHERE user_id = ? ORDER BY timestamp DESC",
        (user_id,)
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def save_session(transcription, avg_wpm, filler_count, duration, user_id=None):
    conn = sqlite3.connect(DB_FILE)
    conn.execute(
        "INSERT INTO sessions (transcription, avg_wpm, filler_count, duration, user_id) VALUES (?,?,?,?,?)",
        (transcription, avg_wpm, filler_count, round(duration, 2), user_id)
    )
    conn.commit()
    conn.close()
