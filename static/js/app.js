/* app.js — recording + real-time transcription logic */

document.addEventListener('DOMContentLoaded', () => {
  const socket       = io();
  const startBtn     = document.getElementById('startBtn');
  const stopBtn      = document.getElementById('stopBtn');
  const txDiv        = document.getElementById('transcription');
  const micStage     = document.getElementById('micStage');
  const recBadge     = document.getElementById('recBadge');
  const txPanel      = document.getElementById('txPanel');
  const wpmEl        = document.getElementById('wpmVal');
  const fillerEl     = document.getElementById('fillerVal');
  const feedbackEl   = document.getElementById('feedbackVal');

  const SAMPLE_RATE  = 16000;
  const FILLERS      = ["um","uh","like","basically","actually","you know","so","literally","i mean","well"];

  let audioContext, audioStream, processor;
  let statsTimer, startTime;

  /* ── Helpers ─────────────────────────────────────────────────── */
  function highlight(text) {
    let out = text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    FILLERS.forEach(w => {
      out = out.replace(new RegExp(`\\b${w}\\b`, 'gi'), m => `<span class="filler-word">${m}</span>`);
    });
    return out;
  }

  function updateStats() {
    const raw    = txDiv.innerText.trim();
    const words  = raw.split(/\s+/).filter(Boolean);
    const mins   = (Date.now() - startTime) / 60000;
    const wpm    = mins > 0 ? Math.round(words.length / mins) : 0;
    const fc     = FILLERS.reduce((n, f) => n + (raw.match(new RegExp(`\\b${f}\\b`, 'gi')) || []).length, 0);
    const ratio  = words.length ? fc / words.length : 0;

    wpmEl.textContent    = wpm;
    fillerEl.textContent = fc;

    if (words.length < 5)       setFeedback('😮‍💨', 'deep breaths, you got this.');
    else if (ratio > 0.15)      setFeedback('💬', 'watch your filler words!');
    else if (wpm > 160)         setFeedback('⏳', 'slow it down a notch.');
    else if (wpm < 90)          setFeedback('🎙️', 'project your voice!');
    else                        setFeedback('👍', 'great pace, keep going!');
  }

  function setFeedback(icon, msg) {
    feedbackEl.innerHTML = `${icon} ${msg}`;
  }

  function setRecordingState(on) {
    if (micStage) micStage.classList.toggle('recording', on);
    if (recBadge) recBadge.classList.toggle('on', on);
    if (txPanel)  txPanel.classList.toggle('live', on);
    startBtn.disabled = on;
    stopBtn.disabled  = !on;
  }

  /* ── Socket events ───────────────────────────────────────────── */
  socket.on('connect',    () => console.log('[socket] connected'));
  socket.on('disconnect', () => console.log('[socket] disconnected'));

  socket.on('transcription_update', text => {
    const ph = txDiv.querySelector('.tx-placeholder');
    if (ph) txDiv.innerHTML = '';
    txDiv.innerHTML += highlight(text) + ' ';
  });

  socket.on('final_stats_update', ({ avg_wpm, filler_count }) => {
    wpmEl.textContent    = avg_wpm;
    fillerEl.textContent = filler_count;
  });

  /* ── Start ───────────────────────────────────────────────────── */
  startBtn.addEventListener('click', async () => {
    socket.emit('start_recording');

    txDiv.innerHTML        = '<span class="tx-placeholder">recording… speak now!</span>';
    wpmEl.textContent      = '0';
    fillerEl.textContent   = '0';
    setFeedback('😮‍💨', 'deep breaths, you got this.');

    startTime = Date.now();
    clearInterval(statsTimer);
    statsTimer = setInterval(updateStats, 2000);
    setRecordingState(true);

    try {
      audioStream  = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: SAMPLE_RATE });
      const src    = audioContext.createMediaStreamSource(audioStream);
      processor    = audioContext.createScriptProcessor(4096, 1, 1);

      processor.onaudioprocess = e => {
        socket.emit('audio_chunk', e.inputBuffer.getChannelData(0).buffer);
      };

      src.connect(processor);
      processor.connect(audioContext.destination);
    } catch (err) {
      console.error('Microphone error:', err);
      setRecordingState(false);
      clearInterval(statsTimer);
      alert('Could not access microphone. Please grant permission and try again.');
    }
  });

  /* ── Stop ────────────────────────────────────────────────────── */
  stopBtn.addEventListener('click', () => {
    if (processor)    { processor.disconnect();  processor    = null; }
    if (audioStream)  { audioStream.getTracks().forEach(t => t.stop()); }
    if (audioContext) { audioContext.close();    audioContext = null; }

    clearInterval(statsTimer);
    updateStats();
    setRecordingState(false);

    socket.emit('stop_recording', txDiv.innerText);
  });
});
