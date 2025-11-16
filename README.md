# SpeakHelp

**SpeakHelp** is a real-time speech transcription and analysis tool designed to help users improve their speaking skills. It tracks speaking pace, detects filler words, and provides a detailed session history with metrics like average words per minute (WPM) and filler word count.

## Features

- **Live Transcription**: See your speech converted to text in real time.
- **Speaking Metrics**: Track average WPM and filler word usage during sessions.
- **Session History**: Store and review past sessions with detailed stats.
- **Filler Word Detection**: Automatically identifies common filler words like "um", "uh", "like", and "so".
- **Cross-Platform**: Web-based interface accessible from any modern browser.

## Technologies Used

- **Backend:** Python, Flask, Flask-SocketIO
- **Frontend:** HTML, JavaScript, Socket.IO
- **Audio Processing:** NumPy, SciPy, WAV file handling
- **AI/ML:** Faster-Whisper for speech-to-text transcription
- **Database:** SQLite for persistent session storage

## Getting Started

### Prerequisites
- Python 3.9+
- Node.js and npm (for frontend dependencies if applicable)
- Required Python packages: `flask`, `flask-socketio`, `faster-whisper`, `numpy`, `scipy`, `torch`

### Installation
1. Clone the repository:
  ```
  bash
  git clone https://github.com/miscodings/speakhelp.git
  cd speakhelp
  ```

2. Install Python dependencies:
  ```
  pip install -r requirements.txt
  ```

3. Initialize the database:
  ```
  python app.py
  ```

The database history.db will be created automatically on first run.

4. Run the app:
  ```
  python app.py
  ```

Then open your browser and navigate to http://localhost:5000 to start using SpeakHelp.

Usage:
- Click Start Recording to begin a session.
- Speak naturally while the app transcribes your speech in real time.
- View metrics such as average WPM and filler word count live.
- Click Stop Recording to save the session and review detailed stats.

Contributing:
- Contributions are welcome! Feel free to submit pull requests or open issues for feature requests and bug fixes.

License:
- MIT License
