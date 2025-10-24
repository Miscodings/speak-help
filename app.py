from flask import Flask, render_template, request, jsonify
from flask_socketio import SocketIO
from faster_whisper import WhisperModel
import os
import numpy as np
import torch
from scipy.io.wavfile import write
import tempfile
import time
import sqlite3
import json

app = Flask(__name__)
app.config['SECRET_KEY'] = 'the-final-live-demo-key-with-history'
socketio = SocketIO(app, cors_allowed_origins="*")

# --- DATABASE SETUP ---
DB_FILE = "history.db"
def init_db():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            transcription TEXT NOT NULL,
            avg_wpm INTEGER NOT NULL,
            filler_count INTEGER NOT NULL,
            duration REAL NOT NULL
        )
    ''')
    conn.commit()
    conn.close()

# --- FASTER-WHISPER CONFIGURATION ---
DEVICE = "cpu"
COMPUTE_TYPE = "int8"
MODEL_SIZE = "small.en"
print("--- SERVER STARTING FOR LIVE DEMO ---")
print(f"Loading faster-whisper model: {MODEL_SIZE}...")
model = WhisperModel(MODEL_SIZE, device=DEVICE, compute_type=COMPUTE_TYPE)
print("--- MODEL LOADED, SERVER READY ---")

clients = {}
SAMPLE_RATE = 16000
FILLER_WORDS = ["um", "uh", "like", "basically", "actually", "you know", "so", "literally", "i mean", "well"]

def transcribe_task(sid):
    # This function remains correct and unchanged.
    state = clients[sid]
    full_audio_buffer = b"".join(state.get("buffer", []))
    state["buffer"] = []
    if len(full_audio_buffer) < 2000:
        state["is_transcribing"] = False
        return
    audio_float32 = np.frombuffer(full_audio_buffer, dtype=np.float32)
    SILENCE_THRESHOLD = 0.01 
    if np.max(np.abs(audio_float32)) < SILENCE_THRESHOLD:
        state["is_transcribing"] = False
        return
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_wav_file:
        write(temp_wav_file.name, SAMPLE_RATE, audio_float32)
        temp_wav_filename = temp_wav_file.name
    try:
        segments, info = model.transcribe(
            temp_wav_filename, beam_size=5, temperature=0.0, log_prob_threshold=-1.0
        )
        text = " ".join(segment.text for segment in segments).strip()
        with app.app_context():
             socketio.emit('transcription_update', text, room=sid)
    except Exception as e:
        print(f"Error during background transcription: {e}")
    finally:
        os.remove(temp_wav_filename)
        state["is_transcribing"] = False

@app.route('/')
def index(): return render_template('index.html')
@app.route('/history')
def history(): return render_template('history.html')
@app.route('/api/history')
def get_history():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM sessions ORDER BY timestamp DESC")
    sessions = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return jsonify(sessions)

@socketio.on('connect')
def handle_connect():
    print(f"\n[CLIENT CONNECTED] SID: {request.sid}")
    clients[request.sid] = { "buffer": [], "is_transcribing": False, "start_time": None }

@socketio.on('disconnect')
def handle_disconnect():
    print(f"\n[CLIENT DISCONNECTED] SID: {request.sid}")
    if request.sid in clients:
        del clients[request.sid]

# --- NEW: EVENT HANDLER TO START THE SERVER'S CLOCK ---
@socketio.on('start_recording')
def handle_start_recording():
    print(f"[ACTION] Start recording signal received for SID: {request.sid}")
    if request.sid in clients:
        clients[request.sid]["start_time"] = time.time()
        clients[request.sid]["buffer"] = [] # Clear any old buffer data
        clients[request.sid]["last_trigger_time"] = time.time()

@socketio.on('audio_chunk')
def handle_audio_chunk(chunk):
    if request.sid in clients and clients[request.sid].get("start_time"):
        state = clients[request.sid]
        state["buffer"].append(chunk)
        now = time.time()
        if now - state["last_trigger_time"] > 2 and not state["is_transcribing"]:
            state["is_transcribing"] = True
            state["last_trigger_time"] = now
            socketio.start_background_task(transcribe_task, sid=request.sid)

@socketio.on('stop_recording')
def handle_stop_recording(final_text):
    print(f"[ACTION] Stop recording received for SID: {request.sid}. Saving session.")
    if request.sid in clients and clients[request.sid].get("start_time"):
        state = clients[request.sid]
        
        duration_seconds = time.time() - state["start_time"]
        words = final_text.strip().split()
        word_count = len(words)
        
        avg_wpm = 0
        if duration_seconds > 0.5: # Prevent division by zero on very fast clicks
            avg_wpm = round((word_count / duration_seconds) * 60)
        
        filler_count = sum(1 for word in words if word.lower().strip(".,?!") in FILLER_WORDS)

        final_stats = { 'avg_wpm': avg_wpm, 'filler_count': filler_count }
        socketio.emit('final_stats_update', final_stats, room=request.sid)

        if word_count > 0:
            try:
                conn = sqlite3.connect(DB_FILE)
                cursor = conn.cursor()
                cursor.execute(
                    "INSERT INTO sessions (transcription, avg_wpm, filler_count, duration) VALUES (?, ?, ?, ?)",
                    (final_text, avg_wpm, filler_count, round(duration_seconds, 2))
                )
                conn.commit()
                conn.close()
                print(f"[DB] Saved session with WPM: {avg_wpm}, Fillers: {filler_count}")
            except Exception as e:
                print(f"Error saving to database: {e}")
        
        state["start_time"] = None # Reset the start time

if __name__ == '__main__':
    init_db()
    socketio.run(app, debug=False, use_reloader=False)