import os
import json
import pytest
from unittest.mock import patch, MagicMock


def test_health(client):
    resp = client.get("/api/health")
    assert resp.status_code == 200
    assert resp.get_json()["status"] == "ok"


def test_usage_requires_auth(client):
    resp = client.get("/api/usage")
    assert resp.status_code == 401


def test_usage_invalid_token(client):
    resp = client.get("/api/usage", headers={"Authorization": "Bearer bad-token"})
    assert resp.status_code == 401


def test_usage_returns_correct_structure(client, auth_headers, tmp_db):
    import database
    database.get_or_create_profile("user_test123")
    resp = client.get("/api/usage", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.get_json()
    assert "tier" in data
    assert "transcription_seconds_used" in data
    assert "ai_tips_used" in data
    assert "limits" in data


def test_usage_returns_free_tier_by_default(client, auth_headers, tmp_db):
    import database
    database.get_or_create_profile("user_test123")
    resp = client.get("/api/usage", headers=auth_headers)
    assert resp.get_json()["tier"] == "free"


def test_history_requires_auth(client):
    resp = client.get("/api/history")
    assert resp.status_code == 401


def test_history_returns_list(client, auth_headers, tmp_db):
    import database
    database.get_or_create_profile("user_test123")
    database.save_session("Test session transcript", 110, 2, 40.0, "user_test123")
    resp = client.get("/api/history", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.get_json()
    assert isinstance(data, list)
    assert data[0]["avg_wpm"] == 110


def test_generate_report_free_tier_blocked(client, auth_headers, tmp_db):
    import database
    database.get_or_create_profile("user_test123")
    # user is free tier by default
    resp = client.post(
        "/api/generate-report",
        json={"transcript": "Hello world", "duration_secs": 60, "filler_count": 2, "avg_wpm": 120},
        headers=auth_headers,
    )
    assert resp.status_code == 403


def test_generate_report_pro_tier_works(client, auth_headers, tmp_db):
    import database
    database.get_or_create_profile("user_test123")
    database.update_tier("user_test123", "pro")

    mock_report = {
        "score": 80,
        "pacing": "Good steady pace throughout.",
        "fillers": "Used 'like' twice near the start.",
        "improvements": ["Pause more at sentence ends.", "Vary your pitch.", "Avoid filler words."],
    }

    with patch("app.generate_report", return_value=mock_report):
        resp = client.post(
            "/api/generate-report",
            json={
                "transcript": "This is a longer test transcript with enough content to analyse.",
                "duration_secs": 60,
                "filler_count": 2,
                "avg_wpm": 120,
            },
            headers=auth_headers,
        )

    assert resp.status_code == 200
    data = resp.get_json()
    assert data["score"] == 80
    assert "improvements" in data
    assert len(data["improvements"]) == 3


def test_create_checkout_session_invalid_plan(client, auth_headers, tmp_db):
    import database
    database.get_or_create_profile("user_test123")
    resp = client.post(
        "/api/create-checkout-session",
        json={"plan": "nonexistent"},
        headers=auth_headers,
    )
    assert resp.status_code == 400
    assert "error" in resp.get_json()


def test_create_checkout_session_valid_plan(client, auth_headers, tmp_db, monkeypatch):
    import database
    database.get_or_create_profile("user_test123")
    monkeypatch.setenv("STRIPE_PRICE_PRO", "price_pro_test123")

    mock_customer = MagicMock()
    mock_customer.id = "cus_test_new"

    mock_session = MagicMock()
    mock_session.url = "https://checkout.stripe.com/test_session"

    with patch("stripe.Customer.create", return_value=mock_customer):
        with patch("stripe.checkout.Session.create", return_value=mock_session):
            resp = client.post(
                "/api/create-checkout-session",
                json={"plan": "pro"},
                headers=auth_headers,
            )

    assert resp.status_code == 200
    assert resp.get_json()["url"] == "https://checkout.stripe.com/test_session"


def test_stripe_webhook_bad_signature(client):
    with patch("stripe.Webhook.construct_event", side_effect=Exception("bad sig")):
        resp = client.post(
            "/api/webhook/stripe",
            data=b"{}",
            headers={"Stripe-Signature": "bad"},
        )
    assert resp.status_code == 400


def test_stripe_webhook_checkout_upgrades_tier(client, tmp_db, monkeypatch):
    import database
    database.get_or_create_profile("user_webhook")
    database.update_stripe_customer("user_webhook", "cus_webhook123")
    monkeypatch.setenv("STRIPE_PRICE_PRO", "price_pro_wh")

    mock_event = {
        "type": "checkout.session.completed",
        "data": {"object": {"customer": "cus_webhook123", "subscription": "sub_wh456"}},
    }
    mock_sub = {"items": {"data": [{"price": {"id": "price_pro_wh"}}]}}

    with patch("stripe.Webhook.construct_event", return_value=mock_event):
        with patch("stripe.Subscription.retrieve", return_value=mock_sub):
            resp = client.post(
                "/api/webhook/stripe",
                data=b"{}",
                headers={"Stripe-Signature": "test"},
            )

    assert resp.status_code == 200
    assert database.get_profile("user_webhook")["tier"] == "pro"


def test_stripe_webhook_subscription_deleted_downgrades(client, tmp_db):
    import database
    database.get_or_create_profile("user_cancel")
    database.update_stripe_customer("user_cancel", "cus_cancel123")
    database.update_tier("user_cancel", "pro", "sub_cancel")

    mock_event = {
        "type": "customer.subscription.deleted",
        "data": {"object": {"customer": "cus_cancel123", "id": "sub_cancel"}},
    }

    with patch("stripe.Webhook.construct_event", return_value=mock_event):
        resp = client.post(
            "/api/webhook/stripe",
            data=b"{}",
            headers={"Stripe-Signature": "test"},
        )

    assert resp.status_code == 200
    assert database.get_profile("user_cancel")["tier"] == "free"
