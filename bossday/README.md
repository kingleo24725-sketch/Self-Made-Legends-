# BossDay

**Your own crew of AI agents studies the real world every night and hands you a personal, legal, full-day money plan every morning. Everyone with the app competes on one world leaderboard.**

BossDay is a standalone, phone-first app. It shares nothing with any other project: its own server, its own database, its own accounts.

## How a day works

1. **Overnight (by 4am, your local time)** the crew goes to work for you:
   - **Scout** reads today's news, weather, gig demand, same-day hiring and what is selling near you (live web search).
   - **Strategist** turns that brief plus everything the crew knows about you into a to-do list that fills your working day, on the clock, highest-paying realistic play first.
   - **Coach** has already read yesterday's results and updated what the crew remembers, so the plan fits you better every day.
2. **Morning.** You wake up, open the app, and the plan is waiting: the brief, each play with a time block, the exact steps, an honest earnings range, and why it fits you.
3. **The day.** Check plays off, skip what does not fit, log what you actually earned. Your world rank updates live.
4. **Midnight (your local time).** The day closes, the Coach writes your debrief, the world podium is crowned, and the crew starts on tomorrow.

You are your own boss. The crew plans, you decide.

## Scoring

| Source | Points |
|---|---|
| Each play finished | 100 |
| Each hour worked | 50 |
| Each dollar you log (self-reported, capped at $1,000/day) | 1 |
| Every play finished | +250 |
| Streak (consecutive days with at least one play done) | +25/day, capped at 10 days |

Daily world leaderboard, yesterday's podium, and an all-time board with wins and best streaks.

## Guard rails

- The crew only ever suggests **legal, ethical** work that fits what you actually have. No gambling, speculation, MLM, or hype. This is enforced in the crew's instructions and in the built-in playbook.
- Earnings ranges are **estimates, never promises**. The app says so on every plan.
- Logged earnings are **self-reported** and flagged as unverified on the leaderboard. The score cap limits what a fake number can do.
- Only what you enter is stored. No bank connection, no location tracking.

## Run it

```bash
npm install
cp .env.example .env      # add ANTHROPIC_API_KEY to turn the crew on
npm start                 # http://localhost:3000
npm test
```

Without an API key the app runs in **playbook mode**: every player still gets a deterministic full-day plan from the built-in library of vetted plays, so nothing in the product depends on the API being up.

## Deploy

`Procfile` and `railway.json` are included. Set `ANTHROPIC_API_KEY`, and point `DB_PATH` at a mounted volume so plans survive deploys. The health check is `/api/config`.

Open the site on your phone and tap **Install** (or "Add to Home Screen"). It runs as a standalone app with an offline shell.

## Layout

```
server.js          Express app, routes, live events, scheduler
src/agents.js      The crew: Scout, Strategist, Coach (Claude) with playbook fallback
src/engine.js      Plans, tasks, scoring, leaderboards, nightly close
src/playbook.js    Vetted plays + deterministic offline plan builder
src/auth.js        Accounts and sessions
src/db.js          SQLite schema
public/            The app (PWA)
tests/             Engine and API test suites
```

## API

```
POST /api/auth/register {email,password,displayName}   POST /api/auth/login   POST /api/auth/logout
GET  /api/me            GET /api/config                 POST /api/profile
GET  /api/today         POST /api/today/regenerate      POST /api/today/close
POST /api/tasks/:id {status?, earningsDollars?, note?}
GET  /api/history       GET /api/inbox
GET  /api/leaderboard?date=YYYY-MM-DD   (public)
GET  /api/events?token=  (server-sent events)
```

Authenticated routes take `Authorization: Bearer <token>`.
