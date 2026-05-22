/* animations.js — GSAP orchestration, navbar, tilt, theme */

(function () {
  'use strict';

  /* ── Theme ───────────────────────────────────────────────────── */
  function initTheme() {
    const html    = document.documentElement;
    const btn     = document.getElementById('themeBtn');
    const icon    = btn && btn.querySelector('.theme-icon');
    const saved   = localStorage.getItem('speakhelp-theme') || 'light';

    apply(saved);

    btn && btn.addEventListener('click', () => {
      const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      apply(next);
      localStorage.setItem('speakhelp-theme', next);
    });

    function apply(t) {
      html.setAttribute('data-theme', t);
      if (icon) icon.textContent = t === 'dark' ? '🌙' : '☀️';
    }
  }

  /* ── Navbar shrink ───────────────────────────────────────────── */
  function initNavbar() {
    const nav = document.getElementById('navbar');
    if (!nav) return;

    const tick = () => nav.classList.toggle('scrolled', window.scrollY > 44);
    window.addEventListener('scroll', tick, { passive: true });
    tick();
  }

  /* ── Cursor-tracking glow on cards ──────────────────────────── */
  function initCardGlow(selector) {
    document.querySelectorAll(selector).forEach(el => {
      el.addEventListener('mousemove', e => {
        const r = el.getBoundingClientRect();
        el.style.setProperty('--mx', `${e.clientX - r.left}px`);
        el.style.setProperty('--my', `${e.clientY - r.top}px`);
      });
    });
  }

  /* ── 3-D tilt (GSAP) ────────────────────────────────────────── */
  function initTilt(selector) {
    if (typeof gsap === 'undefined') return;

    document.querySelectorAll(selector).forEach(card => {
      let bounds;

      card.addEventListener('mouseenter', () => {
        bounds = card.getBoundingClientRect();
      });

      card.addEventListener('mousemove', e => {
        if (!bounds) bounds = card.getBoundingClientRect();
        const cx = bounds.width  / 2;
        const cy = bounds.height / 2;
        const dx = e.clientX - bounds.left - cx;
        const dy = e.clientY - bounds.top  - cy;

        gsap.to(card, {
          rotateY:             (dx / cx) * 9,
          rotateX:            -(dy / cy) * 9,
          transformPerspective: 900,
          ease:                'power2.out',
          duration:             0.35
        });
      });

      card.addEventListener('mouseleave', () => {
        gsap.to(card, {
          rotateX:  0,
          rotateY:  0,
          ease:     'elastic.out(1, 0.45)',
          duration: 0.85
        });
      });
    });
  }

  /* ── Studio entrance ─────────────────────────────────────────── */
  function initHero() {
    if (typeof gsap === 'undefined') return;

    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

    tl.from('.page-strip',  { y: 14, opacity: 0, duration: 0.45 })
      .from('.stats-row',   { y: 22, opacity: 0, duration: 0.5 }, '-=0.2')
      .from('.mic-stage',   { scale: 0.88, opacity: 0, duration: 0.5, ease: 'back.out(1.7)' }, '-=0.3')
      .from('.stop-btn',    { y: 8,  opacity: 0, duration: 0.35 }, '-=0.4')
      .from('.tx-panel',    { y: 18, opacity: 0, duration: 0.5 }, '-=0.35');
  }

  /* ── Scroll-triggered fade-ups ───────────────────────────────── */
  function initScrollReveal() {
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

    /* page hero (history) */
    const ph = document.querySelector('.page-hero');
    if (ph) {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      tl.from('.page-title', { y: 28, opacity: 0, duration: 0.65 })
        .from('.page-sub',   { y: 18, opacity: 0, duration: 0.5 }, '-=0.4');
    }

    /* overview cards */
    gsap.from('.overview-card', {
      scrollTrigger: { trigger: '.overview-grid', start: 'top 88%' },
      y: 28, opacity: 0, duration: 0.55,
      stagger: 0.08, ease: 'power3.out'
    });
  }

  /* ── Session cards (dynamic) ─────────────────────────────────── */
  window.animateSessionCards = function () {
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

    document.querySelectorAll('.session-card').forEach((card, i) => {
      gsap.from(card, {
        scrollTrigger: { trigger: card, start: 'top 92%' },
        y: 36, opacity: 0,
        duration: 0.58,
        delay: i * 0.06,
        ease: 'power3.out'
      });
    });

    initTilt('.session-card');
    initCardGlow('.session-card');
  };

  /* ── Init ────────────────────────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', () => {
    if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
      gsap.registerPlugin(ScrollTrigger);
    }

    initTheme();
    initNavbar();
    initCardGlow('.stat-card');

    if (document.querySelector('.hero'))      initHero();
    if (document.querySelector('.page-hero')) initScrollReveal();
    initScrollReveal();
  });
})();
