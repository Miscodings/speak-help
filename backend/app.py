import os
import time

from flask import Flask, jsonify, request, g
from flask_socketio import SocketIO
from flask_cors import CORS

from config import FILLER_WORDS
from database import init_db, get_sessions_for_user, save_session
from transcriber import transcribe_audio
from feedback import get_coaching_tip
from auth import require_auth, verify_clerk_token

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-only')

CORS(app, origins="*")
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')

clients = {}


# ── API routes ────────────────────────────────────────────────────

@app.route('/api/history')
@require_auth
def get_history():
    return jsonify(get_sessions_for_user(g.user_id))


@app.route('/api/health')
def health():
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

    sid = request.sid
    print(f"[CONNECTED] {sid} (user {user_id})")
    clients[sid] = {
        "buffer": [], "is_transcribing": False,
        "start_time": None, "last_trigger_time": None,
        "transcript": "", "words_since_feedback": 0,
        "user_id": user_id
    }


@socketio.on('disconnect')
def handle_disconnect():
    clients.pop(request.sid, None)


@socketio.on('start_recording')
def handle_start_recording():
    state = clients.get(request.sid)
    if state:
        state.update({
            "start_time": time.time(),
            "buffer": [],
            "last_trigger_time": time.time(),
            "transcript": "",
            "words_since_feedback": 0
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
    try:
        text = transcribe_audio(audio_bytes)
        if text:
            state["transcript"] = (state.get("transcript", "") + " " + text).strip()
            with app.app_context():
                socketio.emit('transcription_update', text, room=sid)
            state["words_since_feedback"] += len(text.split())
            if state["words_since_feedback"] >= 20:
                state["words_since_feedback"] = 0
                tip = get_coaching_tip(state["transcript"])
                if tip:
                    elapsed = int(time.time() - state["start_time"])
                    with app.app_context():
                        socketio.emit('ai_feedback', {'tip': tip, 'elapsed': elapsed}, room=sid)
    finally:
        if sid in clients:
            clients[sid]["is_transcribing"] = False


@socketio.on('stop_recording')
def handle_stop_recording(final_text):
    state = clients.get(request.sid)
    if not state or not state.get("start_time"):
        return
    duration = time.time() - state["start_time"]
    words = final_text.strip().split()
    avg_wpm = round((len(words) / duration) * 60) if duration > 0.5 else 0
    filler_count = sum(1 for w in words if w.lower().strip(".,?!") in FILLER_WORDS)
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
    socketio.run(app, debug=False, use_reloader=False, port=5000)
