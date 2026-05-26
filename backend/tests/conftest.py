import os
import sys
import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))


@pytest.fixture
def tmp_db(monkeypatch, tmp_path):
    """Patch DB_FILE to a temp file and initialise schema."""
    db_path = str(tmp_path / "test.db")
    import database
    monkeypatch.setattr(database, "DB_FILE", db_path)
    database.init_db()
    yield db_path


@pytest.fixture
def mock_auth(monkeypatch):
    """Stub verify_clerk_token so routes can be tested without real JWTs."""
    import auth

    def _verify(token):
        if token == "test-token":
            return {"sub": "user_test123"}
        raise ValueError("Invalid token")

    monkeypatch.setattr(auth, "verify_clerk_token", _verify)


@pytest.fixture
def flask_app(tmp_db, mock_auth):
    import app as flask_module
    flask_module.app.config["TESTING"] = True
    return flask_module.app


@pytest.fixture
def client(flask_app):
    return flask_app.test_client()


@pytest.fixture
def auth_headers():
    return {"Authorization": "Bearer test-token"}
