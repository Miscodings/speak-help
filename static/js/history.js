/* history.js — session history page logic */

document.addEventListener('DOMContentLoaded', () => {
  const container  = document.getElementById('historyContainer');
  const totalEl    = document.getElementById('ovTotal');
  const avgWpmEl   = document.getElementById('ovAvgWpm');
  const bestWpmEl  = document.getElementById('ovBestWpm');

  fetch('/api/history')
    .then(r => r.json())
    .then(sessions => {
      if (sessions.length) {
        const avg  = Math.round(sessions.reduce((s, x) => s + x.avg_wpm, 0) / sessions.length);
        const best = Math.max(...sessions.map(s => s.avg_wpm));
        if (totalEl)   totalEl.textContent  = sessions.length;
        if (avgWpmEl)  avgWpmEl.textContent  = avg;
        if (bestWpmEl) bestWpmEl.textContent = best;
      }

      renderSessions(sessions);
    })
    .catch(err => {
      console.error(err);
      container.innerHTML = `
        <div class="empty">
          <div class="empty-icon">⚠️</div>
          <p>Could not load history.<br>Please try again later.</p>
        </div>`;
    });

  function renderSessions(sessions) {
    container.innerHTML = '';

    if (!sessions.length) {
      container.innerHTML = `
        <div class="empty">
          <div class="empty-icon">🎙️</div>
          <p>No sessions yet.<br>Head to the Studio and start speaking!</p>
        </div>`;
      return;
    }

    sessions.forEach(s => {
      const card = document.createElement('div');
      card.className = 'session-card';

      const date = new Date(s.timestamp).toLocaleString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });

      card.innerHTML = `
        <div class="sc-head">
          <span class="sc-date">${date}</span>
          <div class="sc-chips">
            <span class="chip">${s.avg_wpm} WPM</span>
            <span class="chip chip-green">${s.duration}s</span>
            <span class="chip chip-amber">${s.filler_count} fillers</span>
          </div>
        </div>
        <div class="sc-text">${s.transcription}</div>
      `;

      container.appendChild(card);
    });

    /* trigger GSAP tilt + scroll animations after cards are in the DOM */
    if (typeof window.animateSessionCards === 'function') {
      window.animateSessionCards();
    }
  }
});
