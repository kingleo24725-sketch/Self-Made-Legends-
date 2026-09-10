# SML Rise Nd Grinds

*Inside the app: Self-Made Legends. Outside: SML Rise Nd Grinds. By Self-Made Legends LLC.*
**Your own crew of AI agents studies the real world every night and hands you a personal, legal, full-day money plan every morning. Everyone with the app competes on one world leaderboard.**

SML Rise Nd Grinds is a standalone, phone-first app. It shares nothing with any other project: its own server, its own database, its own accounts.

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
- **Self-Made Legends University.** One lesson and one quiz question a day inside the plan. Correct answers add points.
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

Your Self-Made Legends bot grades every play 1 to 10 on how hard it really was: skill, effort, risk, and how competitive the gig is. Easy work earns little. Hard work earns a lot. When the crew is online the Auditor regrades a play after you finish it, using your notes and what you earned.

| Source | Points |
|---|---|
| Each play finished | difficulty x hours x 250 (a 10/10, 4-hour job is 10,000) |
| Each dollar verified from a receipt (capped at $5,000/day) | 10 |
| Each dollar self-reported (same cap) | 5 |
| Every play finished | +5,000 |
| Streak (consecutive days with at least one play done) | +1,000/day, capped at 10 |
| Self-Made Legends University, correct answer | +500 |
| **Daily cap** | **100,000** |
| Idle day (nothing finished, no streak save) | -1,000, then -2,000, -3,000... up to -10,000 a day |

Two idle days in a row and you are on **the Bench**, a public board of players whose week added up to less than nothing. One finished play gets you off it.

## The bots

- **Gig Finder.** Every morning, and every hour after that for members, the Scout goes out to Indeed, Craigslist, Instawork, TaskRabbit, Care.com, Rover, Upwork, StyleSeat and the rest looking for real, paying, posted work that fits this person, and grades each one. Claim a gig and it joins your day as a graded play with a link to the real posting. Without a key the finder still gives real, working search links for your city and gear.
- **They learn every event.** Every play you finish or skip, and every dollar you log against the estimate, updates three layers of memory: yours, your city's, and the world's. Your **Bot IQ** is a number you can watch grow. Nightly, the Coach rewrites what it knows about you. Weekly, the crew reports ideas to the owner.
- **The crowd grades the bot.** Go live, tell people how hard you worked and whether your bot was amazing or garbage, and viewers rate it 1 to 5.

## Faces, friends, calls, live

- A photo of you or a likeness (initials on a colour that is yours, or the crown) on the feed, your Legend page, and your cards.
- Message anyone. Add friends. **Video call** a friend face to face. **Go live** to the world with chat and bot ratings. Video is WebRTC, peer to peer; the server only relays signaling. Add a TURN server (`TURN_URL`, `TURN_USER`, `TURN_PASS`) for calls across strict networks.

## Memberships

| | Free | Pro $4.99 | All Star $9.99 | Veteran $12.99 | Hall of Fame $14.99 |
|---|---|---|---|---|---|
| Playbook plans, world board, University, messages | ✓ | ✓ | ✓ | ✓ | ✓ |
| Live crew with real research every night, Gig Finder hourly, push | | ✓ | ✓ | ✓ | ✓ |
| Talk to your crew, receipt verification, local boards, video calls, Go Live | | | ✓ | ✓ | ✓ |
| Lower fees (tips 10%, Legend Fee 3%), two streak saves, two rebuilds, Scout every 30 min, Veteran frame | | | | ✓ | ✓ |
| No Legend Fee, tips fee 5%, Hall of Fame frame and crown, your name on the Hall of Fame page, three rebuilds | | | | | ✓ |

Until Stripe is configured every player gets `DEFAULT_TIER` (defaults to `hof`). With Stripe keys and price IDs (`STRIPE_PRICE_PRO`, `STRIPE_PRICE_ALLSTAR`, `STRIPE_PRICE_VETERAN`, `STRIPE_PRICE_HOF`) set, new players start free and upgrade in the app. The Hall of Fame page is public at `/hall-of-fame`.

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
src/social.js      Faces, friends, messages, call signaling, live rooms, bot ratings
src/gigs.js        Gig Finder: real gigs and real search links, claims
src/learning.js    Per-user, per-city, global learning and Bot IQ
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
GET  /api/people?q=   GET/POST/DELETE /api/friends/:id   POST /api/block/:id   GET /api/messages   GET/POST /api/messages/:id   POST /api/calls/:id/signal
GET/POST/DELETE /api/live   POST /api/live/:id/join|leave|signal|chat|rate   GET /api/live/:id/chat   GET /api/avatar/:userId   POST/DELETE /api/me/avatar
POST /api/gigs/refresh   POST /api/gigs/:id/claim|dismiss   GET /api/bot   GET /api/hall-of-fame
Public pages: /u/:name  /card/:userId/:date  /story/:id  /safe/:token  /challenge/:slug  /show/:week  /hall-of-fame  /admin.html
```

Authenticated routes take `Authorization: Bearer <token>`.
