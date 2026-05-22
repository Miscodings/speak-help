"""Clerk JWT verification for Flask routes and Socket.IO."""
import os
import base64
import json
from functools import wraps

import jwt
import requests
from flask import request, jsonify, g

_jwks_cache = None


def _get_clerk_domain():
    """Derive Clerk domain from CLERK_DOMAIN env var or from the publishable key."""
    domain = os.environ.get('CLERK_DOMAIN')
    if domain:
        return domain
    pub = os.environ.get('CLERK_PUBLISHABLE_KEY', '')
    if pub.startswith(('pk_test_', 'pk_live_')):
        b64 = pub.split('_', 2)[2]
        b64 += '=' * (-len(b64) % 4)
        return base64.b64decode(b64).decode().rstrip('$')
    raise RuntimeError(
        "Set CLERK_PUBLISHABLE_KEY (or CLERK_DOMAIN) in backend/.env"
    )


def _get_jwks():
    global _jwks_cache
    if _jwks_cache is None:
        url = f"https://{_get_clerk_domain()}/.well-known/jwks.json"
        print(f"[AUTH] Fetching JWKS from {url}")
        _jwks_cache = requests.get(url, timeout=5).json()
    return _jwks_cache


def verify_clerk_token(token):
    """Verify a Clerk session JWT. Returns payload or raises on failure."""
    jwks = _get_jwks()
    header = jwt.get_unverified_header(token)
    key = next((k for k in jwks['keys'] if k['kid'] == header['kid']), None)
    if key is None:
        raise ValueError("No matching key found in JWKS")
    public_key = jwt.algorithms.RSAAlgorithm.from_jwk(json.dumps(key))
    return jwt.decode(
        token, public_key,
        algorithms=['RS256'],
        options={"verify_aud": False}
    )


def require_auth(f):
    """Decorator for HTTP routes — extracts Clerk user_id into flask.g."""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization', '').removeprefix('Bearer ').strip()
        if not token:
            return jsonify({'error': 'Missing token'}), 401
        try:
            payload = verify_clerk_token(token)
            g.user_id = payload['sub']
        except Exception as e:
            print(f"[AUTH ERROR] {e}")
            return jsonify({'error': 'Invalid token'}), 401
        return f(*args, **kwargs)
    return decorated
