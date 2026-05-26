import pytest
from unittest.mock import MagicMock, patch


def _make_mock_client(content: str):
    mock_client = MagicMock()
    mock_resp = MagicMock()
    mock_resp.choices[0].message.content = content
    mock_client.chat.completions.create.return_value = mock_resp
    return mock_client


def test_coaching_tip_returns_none_for_short_text():
    from feedback import get_coaching_tip
    assert get_coaching_tip("Hello") is None
    assert get_coaching_tip("") is None


def test_coaching_tip_returns_tip_from_groq():
    from feedback import get_coaching_tip
    mock_client = _make_mock_client("Slow down and pause between key points.")
    with patch("feedback._get_client", return_value=mock_client):
        tip = get_coaching_tip("This is a longer test speech with quite a few words in it so it passes the minimum.")
    assert tip == "Slow down and pause between key points."


def test_coaching_tip_discards_too_short_response():
    from feedback import get_coaching_tip
    mock_client = _make_mock_client("Ok.")  # too short (< 8 chars)
    with patch("feedback._get_client", return_value=mock_client):
        result = get_coaching_tip("This is a longer test speech with quite a few words in it so it passes the minimum.")
    assert result is None


def test_coaching_tip_strips_quotes():
    from feedback import get_coaching_tip
    mock_client = _make_mock_client('"Great pace, keep it steady and confident."')
    with patch("feedback._get_client", return_value=mock_client):
        tip = get_coaching_tip("This is a longer test speech with quite a few words in it so it passes the minimum.")
    assert not tip.startswith('"')


def test_generate_report_returns_none_for_short_transcript():
    from feedback import generate_report
    assert generate_report("Short text.", 10, 0, 100) is None


def test_generate_report_parses_groq_json():
    from feedback import generate_report
    import json
    report_data = {
        "score": 75,
        "pacing": "Steady pace with a slight rush near the end.",
        "fillers": "Used 'like' three times in the opening.",
        "improvements": ["Pause after key points.", "Reduce filler words.", "Project more confidence."],
    }
    mock_client = _make_mock_client(json.dumps(report_data))
    long_transcript = "word " * 30  # 30 words — exceeds minimum
    with patch("feedback._get_client", return_value=mock_client):
        result = generate_report(long_transcript, 60, 3, 120)
    assert result is not None
    assert result["score"] == 75
    assert len(result["improvements"]) == 3


def test_generate_report_returns_none_on_invalid_json():
    from feedback import generate_report
    mock_client = _make_mock_client("This is not JSON at all.")
    long_transcript = "word " * 30
    with patch("feedback._get_client", return_value=mock_client):
        result = generate_report(long_transcript, 60, 3, 120)
    assert result is None


def test_coaching_tip_returns_none_when_no_api_key():
    from feedback import get_coaching_tip
    with patch("feedback._get_client", return_value=None):
        result = get_coaching_tip("This is a long enough sentence to trigger a tip normally.")
    assert result is None
