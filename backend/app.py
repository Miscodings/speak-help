import os
import time
import stripe

from flask import Flask, jsonify, request, g
from flask_socketio import SocketIO
from flask_cors import CORS

from config import FILLER_WORDS, SAMPLE_RATE
from database import (
    init_db, get_sessions_for_user, save_session,
    get_or_create_profile, get_profile, get_profile_by_stripe_customer,
    update_tier, update_stripe_customer,
    get_usage, try_increment_transcription, try_increment_tips,
)
from transcriber import transcribe_audio
from feedback import get_coaching_tip, generate_report
from auth import require_auth, verify_clerk_token

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-only')

CORS(app, origins="*")
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')

stripe.api_key = os.environ.get('STRIPE_SECRET_KEY')

init_db()
clients = {}


# ── Core API ──────────────────────────────────────────────────────

@app.route('/api/health')
def health():
    return jsonify({'status': 'ok'})


@app.route('/api/history')
@require_auth
def get_history():
    return jsonify(get_sessions_for_user(g.user_id))


@app.route('/api/usage')
@require_auth
def usage_route():
    return jsonify(get_usage(g.user_id))


@app.route('/api/generate-report', methods=['POST'])
@require_auth
def generate_report_route():
    profile = get_profile(g.user_id)
    if not profile or profile.get('tier', 'free') == 'free':
        return jsonify({'error': 'Pro feature'}), 403
    data = request.json or {}
    result = generate_report(
        transcript=data.get('transcript', ''),
        duration_secs=float(data.get('duration_secs', 0)),
        filler_count=int(data.get('filler_count', 0)),
        avg_wpm=int(data.get('avg_wpm', 0)),
    )
    if not result:
        return jsonify({'error': 'Could not generate report'}), 500
    return jsonify(result)


# ── Stripe ────────────────────────────────────────────────────────

@app.route('/api/create-checkout-session', methods=['POST'])
@require_auth
def create_checkout_session():
    plan = (request.json or {}).get('plan', '')
    price_id = os.environ.get(f'STRIPE_PRICE_{plan.upper()}')
    if not price_id:
        return jsonify({'error': 'Invalid plan'}), 400

    profile = get_or_create_profile(g.user_id)
    customer_id = profile.get('stripe_customer_id')

    if not customer_id:
        customer = stripe.Customer.create(metadata={'clerk_id': g.user_id})
        customer_id = customer.id
        update_stripe_customer(g.user_id, customer_id)

    frontend = os.environ.get('FRONTEND_URL', 'http://localhost:3000')
    session = stripe.checkout.Session.create(
        customer=customer_id,
        payment_method_types=['card'],
        line_items=[{'price': price_id, 'quantity': 1}],
        mode='subscription',
        success_url=f"{frontend}/success?session_id={{CHECKOUT_SESSION_ID}}",
        cancel_url=f"{frontend}/pricing",
    )
    return jsonify({'url': session.url})


@app.route('/api/billing-portal', methods=['POST'])
@require_auth
def billing_portal():
    profile = get_profile(g.user_id)
    if not profile or not profile.get('stripe_customer_id'):
        return jsonify({'error': 'No billing info found'}), 400
    session = stripe.billing_portal.Session.create(
        customer=profile['stripe_customer_id'],
        return_url=os.environ.get('FRONTEND_URL', 'http://localhost:3000'),
    )
    return jsonify({'url': session.url})


@app.route('/api/webhook/stripe', methods=['POST'])
def stripe_webhook():
    payload = request.get_data()
    sig = request.headers.get('Stripe-Signature')
    try:
        event = stripe.Webhook.construct_event(
            payload, sig, os.environ.get('STRIPE_WEBHOOK_SECRET')
        )
    except Exception as e:
        print(f"[WEBHOOK ERROR] {e}")
        return jsonify({'error': str(e)}), 400

    etype = event['type']
    obj = event['data']['object']

    if etype == 'checkout.session.completed':
        profile = get_profile_by_stripe_customer(obj.get('customer'))
        if profile and obj.get('subscription'):
            sub = stripe.Subscription.retrieve(obj['subscription'])
            price_id = sub['items']['data'][0]['price']['id']
            tier = 'studio' if price_id == os.environ.get('STRIPE_PRICE_STUDIO') else 'pro'
            update_tier(profile['clerk_id'], tier, obj['subscription'])
            print(f"[STRIPE] {profile['clerk_id']} upgraded to {tier}")

    elif etype == 'customer.subscription.deleted':
        profile = get_profile_by_stripe_customer(obj.get('customer'))
        if profile:
            update_tier(profile['clerk_id'], 'free', None)
            print(f"[STRIPE] {profile['clerk_id']} downgraded to free")

    elif etype == 'customer.subscription.updated':
        profile = get_profile_by_stripe_customer(obj.get('customer'))
        if profile:
            price_id = obj['items']['data'][0]['price']['id']
            tier = 'free'
            if obj['status'] == 'active':
                tier = 'studio' if price_id == os.environ.get('STRIPE_PRICE_STUDIO') else 'pro'
            update_tier(profile['clerk_id'], tier, obj.get('id'))

    return jsonify({'status': 'ok'})


# ── Socket.IO ─────────────────────────────────────────────────────

@socketio.on('connect')
def handle_connect(auth):
    token = (auth or {}).get('token')
    if not token:
        return False
    try:
        payload = verify_clerk_token(token)
        user_id = payload['sub']
    except Exception:
        return False

    profile = get_or_create_profile(user_id)
    sid = request.sid
    print(f"[CONNECTED] {sid} ({user_id}, {profile['tier']})")
    clients[sid] = {
        "buffer": [], "is_transcribing": False,
        "start_time": None, "last_trigger_time": None,
        "transcript": "", "words_since_feedback": 0,
        "user_id": user_id, "tier": profile['tier'],
    }


@socketio.on('disconnect')
def handle_disconnect():
    clients.pop(request.sid, None)


@socketio.on('start_recording')
def handle_start_recording():
    state = clients.get(request.sid)
    if state:
        profile = get_or_create_profile(state['user_id'])
        state.update({
            "start_time": time.time(),
            "buffer": [],
            "last_trigger_time": time.time(),
            "transcript": "",
            "words_since_feedback": 0,
            "tier": profile['tier'],
        })


@socketio.on('audio_chunk')
def handle_audio_chunk(chunk):
    state = clients.get(request.sid)
    if not state or not state.get("start_time"):
        return
    state["buffer"].append(chunk)
    now = time.time()
    if now - state["last_trigger_time"] > 2 and not state["is_transcribing"]:
        state["is_transcribing"] = True
        state["last_trigger_time"] = now
        socketio.start_background_task(_transcribe_task, request.sid)


def _transcribe_task(sid):
    state = clients.get(sid)
    if not state:
        return
    audio_bytes = b"".join(state.get("buffer", []))
    state["buffer"] = []
    user_id = state.get("user_id")

    try:
        duration_secs = len(audio_bytes) / 4 / SAMPLE_RATE
        if not try_increment_transcription(user_id, duration_secs):
            with app.app_context():
                socketio.emit('limit_reached', {'type': 'transcription'}, room=sid)
            return

        text = transcribe_audio(audio_bytes)
        if text:
            state["transcript"] = (state.get("transcript", "") + " " + text).strip()
            with app.app_context():
                socketio.emit('transcription_update', text, room=sid)

            state["words_since_feedback"] += len(text.split())
            if state["words_since_feedback"] >= 20:
                state["words_since_feedback"] = 0
                usage = get_usage(user_id)
                if usage['tips_ok']:
                    tip = get_coaching_tip(state["transcript"])
                    if tip:
                        if try_increment_tips(user_id):
                            elapsed = int(time.time() - state["start_time"])
                            with app.app_context():
                                socketio.emit('ai_feedback', {'tip': tip, 'elapsed': elapsed}, room=sid)
                        else:
                            with app.app_context():
                                socketio.emit('limit_reached', {'type': 'ai_tips'}, room=sid)
                else:
                    with app.app_context():
                        socketio.emit('limit_reached', {'type': 'ai_tips'}, room=sid)
    finally:
        if sid in clients:
            clients[sid]["is_transcribing"] = False


@socketio.on('stop_recording')
def handle_stop_recording(final_text):
    state = clients.get(request.sid)
    if not state or not state.get("start_time"):
        return
    import re
    duration = time.time() - state["start_time"]
    words = final_text.strip().split()
    avg_wpm = round((len(words) / duration) * 60) if duration > 0.5 else 0
    text_lower = final_text.lower()
    filler_count = sum(
        len(re.findall(r'\b' + re.escape(f) + r'\b', text_lower))
        for f in FILLER_WORDS
    )
    socketio.emit(
        'final_stats_update',
        {'avg_wpm': avg_wpm, 'filler_count': filler_count},
        room=request.sid
    )
    if words:
        try:
            save_session(final_text, avg_wpm, filler_count, duration, state.get("user_id"))
        except Exception as e:
            print(f"[DB ERROR] {e}")
    state["start_time"] = None


if __name__ == '__main__':
    init_db()
    port = int(os.environ.get('PORT', 5000))
    socketio.run(app, debug=False, use_reloader=False, port=port, host='0.0.0.0')
