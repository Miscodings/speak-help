# SpeakHelp

A real-time AI speech coaching app. Record yourself speaking, get live transcription and in-ear coaching tips, then review your sessions with filler word highlighting, WPM stats, and AI-generated post-session reports.

Live at **[speak-help.vercel.app](https://speak-help.vercel.app)**

---

## Features

**Studio (home page)**
- Real-time transcription via Groq Whisper (whisper-large-v3-turbo)
- 28-bar animated waveform while recording
- Live pace, filler count, WPM, and duration stats
- In-ear AI coaching tips updated every ~20 words (llama-3.1-8b-instant)
- Post-session AI report with score, pacing analysis, and 3 improvement tips (Pro/Studio, llama-3.3-70b-versatile)

**Progress (history page)**
- Overview stats: total sessions, avg WPM, total practice time, best filler ratio
- Per-session cards with filler word highlighting, duration, WPM, and filler rate %
- Show more/less transcript toggle

**Pricing**
- Free: 1 hour transcription/month, 20 AI tips/month
- Pro ($9/mo): unlimited transcription and tips, AI session reports
- Studio ($19/mo): same as Pro (advanced features coming)

**Auth & Billing**
- Clerk authentication (sign in / sign up)
- Stripe Checkout for subscriptions; billing portal for plan management
- `/api/sync-subscription` pulls live Stripe status on demand (handles webhook delivery delays)

---

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 16 App Router, TypeScript, Tailwind CSS, Framer Motion |
| Auth | Clerk (JWT / JWKS verification, 24h key cache) |
| Backend | Python, Flask, Flask-SocketIO (threading mode, polling transport) |
| AI | Groq API — Whisper, Llama 3.1 8B, Llama 3.3 70B |
| Payments | Stripe Checkout + webhooks |
| Database | SQLite with WAL mode |
| Hosting | Vercel (frontend) + Render (backend, Gunicorn 1 worker 4 threads) |
| CI | GitHub Actions — pytest (backend) + Jest (frontend) |

---

## Project Structure

```
speak-help/
├── backend/
│   ├── app.py          # Flask app, Socket.IO events, Stripe routes
│   ├── auth.py         # Clerk JWT verification, JWKS cache
│   ├── database.py     # SQLite schema, atomic usage enforcement
│   ├── feedback.py     # Groq coaching tips + session report generation
│   ├── transcriber.py  # Groq Whisper transcription
│   ├── config.py       # Filler word list, tier limits
│   └── tests/          # pytest test suite
└── frontend/
    ├── app/
    │   ├── page.tsx          # Studio (recorder)
    │   ├── history/          # Progress page
    │   ├── pricing/          # Pricing + Stripe checkout
    │   └── success/          # Post-payment confirmation
    └── components/
        ├── Navbar.tsx
        ├── SessionCard.tsx
        └── CoachPanel.tsx
```

---

## Self-Hosting

SpeakHelp started as a simple local Flask + HTML app and has since been rebuilt as a full SaaS product with paid tiers, Stripe billing, and Clerk authentication. The current codebase is designed for the hosted version, but it's fully self-hostable with a few changes:

- **Remove Clerk**: Replace `require_auth` in `backend/auth.py` with your own session or API-key middleware. Remove the `@clerk/nextjs` package from the frontend and any `<ClerkProvider>` / `<UserButton>` usage.
- **Remove Stripe**: Delete the billing routes in `app.py` (`/api/create-checkout-session`, `/api/billing-portal`, `/api/webhook/stripe`, `/api/sync-subscription`) and set all users to an unlimited tier in `database.py`.
- **Remove usage limits**: Set `TIER_LIMITS` in `config.py` so the free tier has `None` (unlimited) for all limits, or remove the `try_increment_*` checks from `_transcribe_task` entirely.
- **Groq is still required**: The transcription and AI coaching are powered by the Groq API. Get a free key at [console.groq.com](https://console.groq.com).

With those changes, the app runs as a single-user or internal tool with no auth or billing overhead.

---

## Local Development

### Prerequisites
- Python 3.9+
- Node.js 18+
- A [Groq](https://console.groq.com) API key
- A [Clerk](https://clerk.com) application
- A [Stripe](https://stripe.com) account (optional for billing)

### Backend

```bash
cd backend
python -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Create `backend/.env`:
```
GROQ_API_KEY=...
CLERK_JWKS_URL=https://<your-clerk-domain>/.well-known/jwks.json
STRIPE_SECRET_KEY=...
STRIPE_PRICE_PRO=price_...
STRIPE_PRICE_STUDIO=price_...
STRIPE_WEBHOOK_SECRET=whsec_...
FRONTEND_URL=http://localhost:3000
SECRET_KEY=any-random-string
```

```bash
python app.py
```

### Frontend

```bash
cd frontend
npm install
```

Create `frontend/.env.local`:
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
NEXT_PUBLIC_BACKEND_URL=http://localhost:5000
```

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Usage Limits

| Tier | Transcription | AI Tips |
|---|---|---|
| Free | 1 hr / month | 20 / month |
| Pro | Unlimited | Unlimited |
| Studio | Unlimited | Unlimited |

Limits are enforced atomically in the database — concurrent requests cannot bypass them.

---

## Known Limitations

- SQLite data resets on Render redeploys (acceptable for MVP; Postgres needed for production)
- Single Gunicorn worker — fine for current scale; Redis + multiple workers needed to scale horizontally
- `ScriptProcessorNode` (audio capture) is deprecated; migration to `AudioWorkletNode` is deferred
- WebSocket transport disabled — Werkzeug's gthread mode is incompatible with Flask-SocketIO WebSockets; polling only

---

## License

MIT
