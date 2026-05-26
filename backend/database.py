import sqlite3
from datetime import datetime
from config import DB_FILE, TIER_LIMITS


def _current_month():
    return datetime.now().strftime('%Y-%m')


def init_db():
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()

    c.execute('''CREATE TABLE IF NOT EXISTS sessions (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp     DATETIME DEFAULT CURRENT_TIMESTAMP,
        transcription TEXT NOT NULL,
        avg_wpm       INTEGER NOT NULL,
        filler_count  INTEGER NOT NULL,
        duration      REAL NOT NULL,
        user_id       TEXT
    )''')

    c.execute("PRAGMA table_info(sessions)")
    cols = [row[1] for row in c.fetchall()]
    if 'user_id' not in cols:
        c.execute("ALTER TABLE sessions ADD COLUMN user_id TEXT")

    c.execute('''CREATE TABLE IF NOT EXISTS user_profiles (
        clerk_id                   TEXT PRIMARY KEY,
        tier                       TEXT DEFAULT 'free',
        stripe_customer_id         TEXT,
        stripe_subscription_id     TEXT,
        transcription_seconds_used INTEGER DEFAULT 0,
        ai_tips_used               INTEGER DEFAULT 0,
        usage_reset_month          TEXT,
        created_at                 DATETIME DEFAULT CURRENT_TIMESTAMP
    )''')

    conn.commit()
    conn.close()


# ── Profile ───────────────────────────────────────────────────────

def get_or_create_profile(clerk_id):
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    row = conn.execute(
        "SELECT * FROM user_profiles WHERE clerk_id = ?", (clerk_id,)
    ).fetchone()
    if not row:
        conn.execute(
            "INSERT INTO user_profiles (clerk_id, usage_reset_month) VALUES (?, ?)",
            (clerk_id, _current_month())
        )
        conn.commit()
        row = conn.execute(
            "SELECT * FROM user_profiles WHERE clerk_id = ?", (clerk_id,)
        ).fetchone()
    conn.close()
    return dict(row)


def get_profile(clerk_id):
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    row = conn.execute(
        "SELECT * FROM user_profiles WHERE clerk_id = ?", (clerk_id,)
    ).fetchone()
    conn.close()
    return dict(row) if row else None


def get_profile_by_stripe_customer(customer_id):
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    row = conn.execute(
        "SELECT * FROM user_profiles WHERE stripe_customer_id = ?", (customer_id,)
    ).fetchone()
    conn.close()
    return dict(row) if row else None


def update_tier(clerk_id, tier, subscription_id=None):
    conn = sqlite3.connect(DB_FILE)
    conn.execute(
        "UPDATE user_profiles SET tier = ?, stripe_subscription_id = ? WHERE clerk_id = ?",
        (tier, subscription_id, clerk_id)
    )
    conn.commit()
    conn.close()


def update_stripe_customer(clerk_id, customer_id):
    conn = sqlite3.connect(DB_FILE)
    conn.execute(
        "UPDATE user_profiles SET stripe_customer_id = ? WHERE clerk_id = ?",
        (customer_id, clerk_id)
    )
    conn.commit()
    conn.close()


# ── Usage ─────────────────────────────────────────────────────────

def _reset_if_new_month(clerk_id):
    current = _current_month()
    conn = sqlite3.connect(DB_FILE)
    conn.execute(
        """UPDATE user_profiles
           SET transcription_seconds_used = 0, ai_tips_used = 0, usage_reset_month = ?
           WHERE clerk_id = ? AND (usage_reset_month IS NULL OR usage_reset_month != ?)""",
        (current, clerk_id, current)
    )
    conn.commit()
    conn.close()


def get_usage(clerk_id):
    _reset_if_new_month(clerk_id)
    profile = get_or_create_profile(clerk_id)
    tier = profile['tier']
    limits = TIER_LIMITS.get(tier, TIER_LIMITS['free'])
    tx = profile['transcription_seconds_used']
    tips = profile['ai_tips_used']
    return {
        'tier': tier,
        'transcription_seconds_used': tx,
        'ai_tips_used': tips,
        'limits': limits,
        'transcription_ok': limits['transcription_seconds'] is None or tx < limits['transcription_seconds'],
        'tips_ok': limits['ai_tips'] is None or tips < limits['ai_tips'],
    }


def increment_transcription(clerk_id, seconds):
    _reset_if_new_month(clerk_id)
    conn = sqlite3.connect(DB_FILE)
    conn.execute(
        "UPDATE user_profiles SET transcription_seconds_used = transcription_seconds_used + ? WHERE clerk_id = ?",
        (max(1, int(seconds)), clerk_id)
    )
    conn.commit()
    conn.close()


def increment_tips(clerk_id):
    _reset_if_new_month(clerk_id)
    conn = sqlite3.connect(DB_FILE)
    conn.execute(
        "UPDATE user_profiles SET ai_tips_used = ai_tips_used + 1 WHERE clerk_id = ?",
        (clerk_id,)
    )
    conn.commit()
    conn.close()


# ── Sessions ──────────────────────────────────────────────────────

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
