import sqlite3
import pytest


def test_get_or_create_profile_creates_new(tmp_db):
    import database
    profile = database.get_or_create_profile("user_new")
    assert profile["clerk_id"] == "user_new"
    assert profile["tier"] == "free"
    assert profile["transcription_seconds_used"] == 0
    assert profile["ai_tips_used"] == 0


def test_get_or_create_profile_is_idempotent(tmp_db):
    import database
    p1 = database.get_or_create_profile("user_idem")
    p2 = database.get_or_create_profile("user_idem")
    assert p1["clerk_id"] == p2["clerk_id"]


def test_get_profile_returns_none_for_unknown(tmp_db):
    import database
    assert database.get_profile("user_does_not_exist") is None


def test_update_tier(tmp_db):
    import database
    database.get_or_create_profile("user_tier")
    database.update_tier("user_tier", "pro", "sub_123")
    profile = database.get_profile("user_tier")
    assert profile["tier"] == "pro"
    assert profile["stripe_subscription_id"] == "sub_123"


def test_update_stripe_customer(tmp_db):
    import database
    database.get_or_create_profile("user_stripe")
    database.update_stripe_customer("user_stripe", "cus_abc")
    profile = database.get_profile("user_stripe")
    assert profile["stripe_customer_id"] == "cus_abc"


def test_get_profile_by_stripe_customer(tmp_db):
    import database
    database.get_or_create_profile("user_cus")
    database.update_stripe_customer("user_cus", "cus_lookup")
    profile = database.get_profile_by_stripe_customer("cus_lookup")
    assert profile is not None
    assert profile["clerk_id"] == "user_cus"


def test_increment_transcription(tmp_db):
    import database
    database.get_or_create_profile("user_tx")
    database.increment_transcription("user_tx", 120)
    usage = database.get_usage("user_tx")
    assert usage["transcription_seconds_used"] == 120


def test_increment_tips(tmp_db):
    import database
    database.get_or_create_profile("user_tips")
    database.increment_tips("user_tips")
    database.increment_tips("user_tips")
    usage = database.get_usage("user_tips")
    assert usage["ai_tips_used"] == 2


def test_transcription_limit_reached(tmp_db):
    import database
    from config import TIER_LIMITS
    database.get_or_create_profile("user_txlimit")
    limit = TIER_LIMITS["free"]["transcription_seconds"]
    database.increment_transcription("user_txlimit", limit)
    usage = database.get_usage("user_txlimit")
    assert not usage["transcription_ok"]


def test_tips_limit_reached(tmp_db):
    import database
    from config import TIER_LIMITS
    database.get_or_create_profile("user_tipslimit")
    limit = TIER_LIMITS["free"]["ai_tips"]
    for _ in range(limit):
        database.increment_tips("user_tipslimit")
    usage = database.get_usage("user_tipslimit")
    assert not usage["tips_ok"]


def test_pro_tier_never_hits_limit(tmp_db):
    import database
    database.get_or_create_profile("user_pro")
    database.update_tier("user_pro", "pro")
    # Exceed free limits
    database.increment_transcription("user_pro", 99999)
    for _ in range(100):
        database.increment_tips("user_pro")
    usage = database.get_usage("user_pro")
    assert usage["transcription_ok"]
    assert usage["tips_ok"]


def test_usage_resets_each_month(tmp_db):
    import database
    database.get_or_create_profile("user_reset")
    # Simulate usage from a past month
    conn = sqlite3.connect(tmp_db)
    conn.execute(
        "UPDATE user_profiles SET usage_reset_month='2020-01', "
        "transcription_seconds_used=3000, ai_tips_used=18 WHERE clerk_id='user_reset'"
    )
    conn.commit()
    conn.close()

    usage = database.get_usage("user_reset")
    assert usage["transcription_seconds_used"] == 0
    assert usage["ai_tips_used"] == 0


def test_save_and_retrieve_session(tmp_db):
    import database
    database.get_or_create_profile("user_sess")
    database.save_session("Hello world test", 120, 3, 45.5, "user_sess")
    sessions = database.get_sessions_for_user("user_sess")
    assert len(sessions) == 1
    assert sessions[0]["avg_wpm"] == 120
    assert sessions[0]["filler_count"] == 3
    assert sessions[0]["user_id"] == "user_sess"


def test_sessions_are_user_scoped(tmp_db):
    import database
    database.save_session("User A session", 100, 1, 30.0, "user_a")
    database.save_session("User B session", 110, 2, 35.0, "user_b")
    a_sessions = database.get_sessions_for_user("user_a")
    b_sessions = database.get_sessions_for_user("user_b")
    assert len(a_sessions) == 1
    assert len(b_sessions) == 1
    assert a_sessions[0]["transcription"] == "User A session"
