# BossDay

**Your own crew of AI agents studies the real world every night and hands you a personal, legal, full-day money plan every morning. Everyone with the app competes on one world leaderboard.**

BossDay is a standalone, phone-first app. It shares nothing with any other project: its own server, its own database, its own accounts.

## How a day works

1. **Overnight (by 4am, your local time)** the crew goes to work for you:
   - **Scout** reads today's news, weather, gig demand, same-day hiring and what is selling near you (live web search). One research pass per city per day is shared by everyone there.
   - **Strategist** turns that brief plus everything the crew knows about you (your track record by play, your 30-day goal, blocked hours, today's conditions) into a to-do list that fills your working day, on the clock.
   - **Coach** has already read yesterday's results and updated what the crew remembers.
   The **crew activity log** on the Today screen shows exactly what each agent did.
2. **Morning.** The plan is waiting: the brief, each play with a time block, the exact steps, an honest earnings range, and why it fits you. Push notification when it lands.
3. **The day.** Check plays off, skip what does not fit, log what you earned, or **verify it from a payout screenshot**. After each time block the crew checks in. Something fell through? **Talk to your crew** and it rebuilds the rest of the day around the hours you have left.
4. **Midnight (your local time).** The day closes, the Coach writes your debrief, the world podium is crowned, head-to-heads settle, and the crew starts on tomorrow. On Sundays the Coach writes your **weekly recap**.

You are your own boss. The crew plans, you decide.

## Competition

- **World leaderboard** for the day, yesterday's podium, and an all-time board with wins and best streaks.
- **Champion's plan.** Every morning you can see what yesterday's world champion actually did and logged.
- **Leagues.** Bronze (phone only), Silver (one of car / laptop / bike / a skill), Gold (more than one). **Boss** league for two podiums or a 7-day streak in the last two weeks.
- **Local boards.** World, country, state, city.
- **Head-to-head.** Challenge anyone by name. Same day, higher score wins, badge for the winner.
- **Invite a rival.** Your invite link makes the newcomer's first day a duel against you.
- **Badges** for world wins, podiums, full days, 7-day streaks, duel wins, recruiting.

## Scoring

| Source | Points |
|---|---|
| Each play finished | 100 |
| Each hour worked | 50 |
| Each dollar verified from a receipt (capped at $1,000/day) | 1 |
| Each dollar self-reported (same cap) | 0.5 |
| Every play finished | +250 |
| Streak (consecutive days with at least one play done) | +25/day, capped at 10 |

The board has an **Everyone** view and a **Verified only** view. **Streak insurance** saves one empty day per week so a sick day does not erase the work.

## Plans

| | Free | Pro | Boss |
|---|---|---|---|
| Daily plan | Playbook | Live crew with research | Live crew with research |
| World leaderboard, leagues, duels, badges | ✓ | ✓ | ✓ |
| Talk to your crew (mid-day replans) | | | ✓ |
| Receipt verification | | | ✓ |
| Local boards | | | ✓ |

Until Stripe is configured every player gets the `DEFAULT_TIER` (defaults to `boss`). With Stripe keys set, new players start free and upgrade in the app.

## Guard rails

- The crew only ever suggests **legal, ethical** work that fits what you actually have. No gambling, speculation, MLM, or hype. Enforced in the crew's instructions and in the built-in playbook.
- Earnings ranges are **estimates, never promises**. Every plan says so. Terms and privacy pages are built in and accepted at sign-up.
- Self-reported earnings count half and are flagged. Receipt images are read by Claude, then discarded; only the amount and a fingerprint are kept.
- Only what you enter is stored. No bank connection, no location tracking.

## Run it

```bash
npm install
cp .env.example .env      # add ANTHROPIC_API_KEY to turn the crew on
npm start                 # http://localhost:3000
npm test
```

Without an API key the app runs in **playbook mode**: every player still gets a deterministic full-day plan, chat replans, and recaps from the built-in library, so nothing in the product depends on the API being up.

### Optional services

| Env | Turns on |
|---|---|
| `ANTHROPIC_API_KEY` | The live crew (Scout, Strategist, Coach, Auditor) |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | Push notifications (`npx web-push generate-vapid-keys`) |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_BOSS` | Paid plans |
| `APP_URL` | Absolute URL for invite links and Stripe redirects |
| `DB_PATH` | Where the SQLite file lives (mount a volume in production) |
| `DEFAULT_TIER` | Tier for players who have not paid (`boss` until billing is on) |

## Deploy

`Procfile` and `railway.json` are included. Set the env above, point `DB_PATH` at a mounted volume, and use `/api/config` as the health check. Open the site on a phone and tap **Install**. It runs as a standalone app with an offline shell and push.

## Layout

```
server.js          Express app, routes, live events, billing webhook, scheduler
src/agents.js      The crew: Scout, Strategist, Coach, Auditor (Claude) with playbook fallback
src/engine.js      Plans, tasks, verified earnings, scoring, leagues, boards, duels, recaps, nightly close
src/playbook.js    Vetted plays, blocked-hour layout, learning weights, offline replans
src/auth.js        Accounts, sessions, invite codes
src/push.js        Web push
src/db.js          SQLite schema and migrations
public/            The app (PWA), terms, privacy
tests/             Engine and API suites
```

## API

```
POST /api/auth/register {email,password,displayName,acceptTerms,referralCode?}
POST /api/auth/login    POST /api/auth/logout    GET /api/me    GET /api/config
POST /api/profile       {location,country,resources,skills,goals,comfort,targetHours,startHour,tzOffset,blockedHours,goal}
GET  /api/today         POST /api/today/regenerate   POST /api/today/conditions   POST /api/today/chat   POST /api/today/close
POST /api/tasks/:id     {status?, earningsDollars?, note?}      POST /api/tasks/:id/receipt {image, mediaType}
GET  /api/history       GET /api/inbox
GET  /api/challenges    POST /api/challenges {opponent, date?}   POST /api/challenges/:id/respond {accept}
POST /api/push/subscribe   POST /api/push/unsubscribe
GET  /api/billing       POST /api/billing/checkout {tier}        POST /api/billing/webhook (Stripe)
GET  /api/leaderboard?date=&scope=world|country|region|city&league=&mode=all|verified   (public; local scopes need a Boss session)
GET  /api/champion?date=   GET /api/events?token=  (server-sent events)
```

Authenticated routes take `Authorization: Bearer <token>`.
