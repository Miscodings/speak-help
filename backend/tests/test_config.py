from config import FILLER_WORDS, TIER_LIMITS


def test_filler_words_contains_vocal_fillers():
    for word in ["um", "uh", "er", "ah"]:
        assert word in FILLER_WORDS, f"Expected '{word}' in FILLER_WORDS"


def test_filler_words_contains_discourse_fillers():
    for phrase in ["like", "basically", "you know", "i mean", "literally"]:
        assert phrase in FILLER_WORDS, f"Expected '{phrase}' in FILLER_WORDS"


def test_tier_limits_free_has_caps():
    free = TIER_LIMITS["free"]
    assert free["transcription_seconds"] is not None
    assert free["ai_tips"] is not None
    assert free["transcription_seconds"] > 0
    assert free["ai_tips"] > 0


def test_tier_limits_pro_and_studio_unlimited():
    for tier in ("pro", "studio"):
        limits = TIER_LIMITS[tier]
        assert limits["transcription_seconds"] is None, f"{tier} should have unlimited transcription"
        assert limits["ai_tips"] is None, f"{tier} should have unlimited tips"


def test_all_tiers_defined():
    for tier in ("free", "pro", "studio"):
        assert tier in TIER_LIMITS
