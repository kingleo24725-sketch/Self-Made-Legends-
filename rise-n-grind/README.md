# Rise N Grind

*by SML (Self-Made Legends LLC)*
**Your own crew of AI agents studies the real world every night and hands you a personal, legal, full-day money plan every morning. Everyone with the app competes on one world leaderboard.**

Rise N Grind is a standalone, phone-first app. It shares nothing with any other project: its own server, its own database, its own accounts.

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

## Competition and the spotlight

- **World leaderboard** for the day, yesterday's podium, and an all-time board with wins and best streaks. The top league is **Legend**.
- **Live Grind Feed.** First name and city, in real time: "Ava in Atlanta just verified $85 from a car detail." On the landing page and the World tab.
- **Receipt cards.** Every closed day becomes a shareable 1080x1080 image with score, plays, hours, logged and verified dollars, rank and streak. One tap to TikTok, Instagram, X.
- **Legend pages.** Every public player has `/u/<name>`: stats, badges, stories, last days, and a **tip button**.
- **Streak stories.** 7, 30 and 100 days straight get a written story the player can publish.
- **Final Call.** 8pm local: your rank and the gap to the leader, four hours before the day closes.
- **Monday Money Bracket.** Up to 64 players, seeded by last week's verified earnings, one round per day. Optional entry fee pools into the prize.
- **City vs City.** Weekly city board by verified dollars and a featured matchup.
- **Challenge Days.** A celebrity or brand posts a score to beat for a week; everyone who beats it gets the badge. Public challenge page.
- **Sponsored prize pools.** A sponsor funds a monthly prize for the top verified earner. Skill contest, published rules.
- **Legend of the Week.** A written weekly show about the champion's week, the numbers, and the city of the week.
- **Women's Grind** board and daily champion, plus category boards (beauty, care, food, gig, local, online).
- **Head-to-head duels**, invite-a-rival, and badges for all of it.
- **Rise N Grind University.** One lesson and one quiz question a day inside the plan. Correct answers add points.
- **Mentors.** Players with seven closed days or a world win can take paid questions from newcomers.
- **Safety mode.** In-person plays get a "share where I am" link with I'm here / I'm done / need help check-ins that a contact can watch live.

## How the platform gets paid

Every dollar that moves through the app goes through one ledger, and the owner console shows it by month.

| Stream | Platform cut (default, adjustable in the console) |
|---|---|
| Pro and Boss subscriptions | 100% |
| Tips from fans to Legends | 15% |
| Mentor questions | 20% |
| Bracket entry fees and sponsored prize pools | 10% |
| **Legend Fee** on receipt-verified earnings | 5% per month, invoiced through Stripe to players with a card on file |

The Legend Fee is the "fee on money made through the app." It is charged only on earnings the app can prove (receipts), and only to players who can be billed, because that is the only version of it that is enforceable and fair. Unverified earnings are never charged.

The **owner console** at `/admin.html` (needs `ADMIN_KEY`) shows revenue, sets fees, publishes Challenge Days and prize pools, marks manual payouts, changes tiers, and reads the **crew's weekly ideas**: every Monday the agents look at anonymized app-wide numbers and propose specific changes with the evidence.

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
| `ADMIN_KEY` | The owner console at `/admin.html` |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | Push notifications (`npx web-push generate-vapid-keys`) |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_BOSS` | Paid plans, tips through Checkout, Connect payouts to Legends, Legend Fee invoices |
| `TIP_FEE_PCT`, `MENTOR_FEE_PCT`, `POOL_FEE_PCT`, `SUCCESS_FEE_PCT` | Starting fee percentages (the console can change them later) |
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
src/community.js   Feed, cards, stories, Final Call, University, safety, mentors, cities, brackets, challenge days, prizes, show, ideas
src/money.js       Fees, ledger, tips, payouts, Legend Fee, revenue
src/university.js  Lessons and quizzes
src/auth.js        Accounts, sessions, invite codes
src/push.js        Web push
src/db.js          SQLite schema and migrations
public/            The app (PWA), owner console, terms, privacy
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
GET  /api/feed   GET /api/cities   GET /api/bracket   POST /api/bracket/enter   GET /api/challenge-days   GET /api/prize   GET /api/shows   GET /api/stories/latest
GET  /api/u/:name   POST /api/tips/:name {amountCents, fromName, message}   GET /api/payouts   POST /api/payouts/connect   POST /api/payouts/request
POST /api/lesson/answer   POST /api/safety/start   POST /api/safety/:token {status}
GET  /api/mentors   POST /api/mentors   DELETE /api/mentors   POST /api/mentors/:userId/ask   POST /api/mentors/questions/:id/answer
GET  /api/admin/revenue|fees|ideas|players   POST /api/admin/fees|challenge-days|prize-pools|payouts/:userId|close-month|tier/:userId   (x-admin-key)
Public pages: /u/:name  /card/:userId/:date  /story/:id  /safe/:token  /challenge/:slug  /show/:week  /admin.html
```

Authenticated routes take `Authorization: Bearer <token>`.
