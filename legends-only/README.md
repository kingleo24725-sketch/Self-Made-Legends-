# Legends Only

*Inside the app: Self-Made Legends. Outside: Legends Only. By Self-Made Legends LLC.*

**© 2026 Self-Made Legends LLC. All rights reserved.** Proprietary. No license is granted to copy, modify, or reuse any part of this code or design. See [LICENSE](LICENSE).
**Your own crew of AI agents studies the real world every night and hands you a personal, legal, full-day money plan every morning. Everyone with the app competes on one world leaderboard.**

Legends Only is a standalone, phone-first app. It shares nothing with any other project: its own server, its own database, its own accounts.

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

## The fun

The work is real, so the payoff has to hit. Every one of these is earned, none can be bought.

- **Your bot talks.** Name it. It has a line for every moment: the morning, an approval, a combo, the Boss going down, an idle afternoon, the Bench, holding #1, the last hours. Approvals come with a full-screen splash, confetti, a chime, and a buzz.
- **Boss of the Day.** The hardest play on your plan wears the crown. Take it down and it pays its points twice, you get the Boss Slayer badge, and the feed hears about it.
- **Power Play.** Once a day, before you start it, you pick one play and call your shot. Approved, it pays +50%. You can move it until it locks.
- **Combos.** Every approved play after the first pays +10% of its base, up to +50% by the sixth. The combo pill burns in the hero and the bot's voice changes.
- **Weekly quests.** Three a week, different for every player: approve five plays, verify $100, beat two Bosses, hit a x3 combo, show up four days, pass three lessons, finish three hard plays, go live, finish a full day. Progress bars on Today, a badge and 3,000 to 10,000 points on completion.
- **Titles.** Earned, shown next to your name on every board: Untouchable, Boss Slayer, Money Machine, Iron Streak, Crowd Favorite, The Closer, Early Bird, Combo King, Grinder.
- **The climb.** Pass someone on the world board and the bot names them. Rank up (Pro, All Star, Superstar) and the screen takes over.
- **Callouts.** Tap the target next to any name on the board, pick a line ("Bring receipts, not excuses."), and it lands in their inbox and on the feed. Three a day. They can accept it and it is a head-to-head tomorrow.

Bonuses live in their own bucket (`tasks.bonus_points`, `daily_scores.quest_points`), so base grading never changes and the daily cap still holds.

## Seasons: three crowns a month

Points add up all month. Money never decides merit, so the crowns are kept apart.

| Crown | Decided by | What you get |
|---|---|---|
| **Legend of the Month** | Most approved points in the month | The Legends Only Chain, engraved. Hall of Fame for life (survives a cancelled subscription). A numbered Legends Only jacket (#001, #002, ...). The app is yours next month: your face on the landing page as "Presented by", gold frame on your cards, your story on the feed. Any cash the owner announces in advance. |
| **People's Champion** | Most fan votes among the top 50 of the month | The chain, and the fan-funded check: a set share of the month's vote revenue (default 20%, owner sets it) plus any cash announced up front. |
| **Crew of the Month** | Squad with the most combined points | The Squad Belt: the squad's name under the leaderboard for the next month, badge for every member. |
| **Fan of the Month** | Most fan points | On the show, the Legends Only fan jacket, the badge. |

**Votes.** 50¢ each, sold in packs (5 for $2.50, 20 for $10, 100 for $50) through Stripe Checkout. Every cent is platform revenue, in the ledger. You cannot vote for yourself. The ballot opens to everyone on the 2nd; Fan Club members vote from the 1st. On web and Android, votes, Fan Club, and memberships are bought in the app. Inside the iOS wrapper the same buttons open Safari and the web app finishes the purchase, so Apple's 30% never applies (see `native/README.md`).

**Settling.** The scheduler settles a month once every day of it has closed. Prizes for a month are set before it starts and shown on the season card; nothing changes mid-month. The owner console has the prize editor, the vote revenue, and a settle button. `/hall-of-fame` carries the wall: every Legend of the Month with jacket number, People's Champions, Squad Belts, Fans of the Month.

## The Fan Club

Sign-up has two doors: **I'm here to grind** and **I'm here to watch**. A fan has no bot, no plan, no score, and never shows on a board. Same app, same feed, same lives.

- **Free:** follow Legends and squads (My Legends shows their day live), watch and chat in lives, rate bots, tip, ask mentors, vote, and **call today's Legend of the Day** before 2pm ET: 1,000 fan points for the right call, 300 for a podium finish. Votes on the eventual People's Champion pay 50 fan points each, double in the first ten days. Top Fans board each month. Fan points cannot be bought.
- **Fan callouts.** "Ava, go get Ben." Lands in Ava's inbox with the fan's name, on the feed, and Ava can accept it as a head-to-head. Three a day.
- **Fan Club, $4.99 a month (`STRIPE_PRICE_FANCLUB`):** ten votes a month, gold name and star in live chat, the early ballot, a nightly recap of your Legends, a push when one of them goes live, passes someone, or takes down the Boss, and the badge.
- A fan can flip to player any time and starts at Rookie. Fan points and follows stay.

## Day one, trust, squads, employers, clips

- **Day one.** The first plan carries a three-move card: finish one play, tell your bot, get approved. The first approval on any path (note, receipt, employer confirmation) earns the First Play Approved badge.
- **One account per phone.** The app keeps a random device id; a phone that already carries an account cannot register another. **Phone verification** by text (Twilio; the code prints to the server log without it). Banned accounts lose their sessions and cannot sign in.
- **Trust score, 0 to 100.** Up with a verified phone, approved days, receipts, approvals, and good crowd ratings; down with rejections and shared devices. It decides how much proof the Auditor wants: under 30, anything claiming more than $150 needs a receipt or a photo; over 60, a short note is enough. Shown on the Me tab and on the public résumé.
- **Ops alarms.** `/api/health` for the load balancer. The scheduler checks for late plans, error spikes, approval backlogs, and unpaid balances, posts alarms to `ALERT_WEBHOOK_URL` and the owner's inbox, and ends lives left open. **Money reconciliation** runs nightly: ledger against Stripe's balance transactions when Stripe is on, otherwise the ledger against payout balances; a mismatch is an alarm. All of it is on the owner console.
- **Squads.** Two to five Legends, a code to join, a squad board by the week's points, and a **crew call** (mesh video for the squad) from the World tab.
- **Bot vs bot.** Put your bot up against theirs for a day; the crowd votes on the two plans, the score at close decides it, and the winner gets the badge.
- **Local sponsor tiles.** The owner sells the featured tile in a city for a date range; it sits at the top of the Gig Finder for players there and counts clicks. Paid in full to the platform.
- **Employers.** Any account can register a business and **post a shift straight into the Gig Finder** for its city ($5 a posting). A player claims it and it becomes a graded play on their day. When the employer confirms the work, the play is approved and receipt-verified, the pay lands in the player's balance, and the platform keeps 10%. Employers can search **verified track records** and open a full one for $2.
- **Verified résumé.** Every public Legend has `/u/<name>/resume`: days, approved plays by type, receipt-verified dollars, employer confirmations, trust. Nothing on it is self-reported.
- **City data report.** `/report/<city>?month=YYYY-MM`: anonymized, what paid per hour, done rates, grades. Minimum three plans per play to appear. The first data product.
- **Clips.** While a host is live, the phone records in ten-second chunks; when the live ends, the busiest minute by chat uploads as a clip with a share page and the day's receipt card next to it.
- **Native wrappers.** `capacitor.config.json` and `native/README.md` put the same app in the stores with Capacitor. Built on a laptop with Xcode and Android Studio, not here.

**Not built: a Rise N Grind Bank.** Holding balances, cards, or instant cash-out is banking and needs a partner (Stripe Treasury, Unit, or similar) with KYC and a compliance program. The payout balance and Stripe Connect are the honest version today; the partner integration is the next step once the app has volume.

## How the platform gets paid

Every dollar that moves through the app goes through one ledger, and the owner console shows it by month.

| Stream | Platform cut (default, adjustable in the console) |
|---|---|
| Veteran and Hall of Fame memberships | 100% |
| Tips from fans to Legends | 15% |
| Mentor questions | 20% |
| Bracket entry fees and sponsored prize pools | 10% |
| **Legend Fee** on receipt-verified earnings | 5% per month, invoiced through Stripe to players with a card on file |
| Employer shift postings | $5 per posting, plus 10% of the pay when the work is confirmed |
| Employer résumé views | $2 per full record, once per 30 days per Legend |
| Local sponsor tiles | 100% |
| People's Champion vote packs | 100% |
| Fan Club memberships | 100% |

The Legend Fee is the "fee on money made through the app." It is charged only on earnings the app can prove (receipts), and only to players who can be billed, because that is the only version of it that is enforceable and fair. Unverified earnings are never charged.

The **owner console** at `/admin.html` (needs `ADMIN_KEY`) shows revenue, sets fees, publishes Challenge Days and prize pools, marks manual payouts, changes tiers, and reads the **crew's weekly ideas**: every Monday the agents look at anonymized app-wide numbers and propose specific changes with the evidence.

## Scoring

**Nobody gets points until their own bot approves the work.** Marking a play done puts it in front of your Self-Made Legends bot at zero points. A receipt screenshot approves it on the spot. Otherwise you tell the bot what you did, add a photo of the work if you have one, and the Auditor decides: approve and grade, or send it back with exactly what is missing. Approved points count for the leaderboard, the streak, and the Legend Fee. Work that is done but not yet approved still counts as showing up, so it never earns the idle penalty.

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

## Ranks and memberships

**Ranks are free and earned.** Everyone starts as a Self-Made Legends Rookie. Pro at 7 active days, 50,000 approved points, or a world win. All Star at 30 days, 250,000 points, or 3 wins. Superstar at 100 days, 1,000,000 points, or 10 wins. The leaderboard filters by rank.

**Everything the crew does is free for every rank:** live research every night, the Gig Finder, chat and rebuilds, receipt verification, local boards, video calls, going live.

**Only two things cost money.**

| | Member (free) | Veteran $12.99 | Hall of Fame $14.99 |
|---|---|---|---|
| The whole crew, all boards, calls, live, University | ✓ | ✓ | ✓ |
| Fees | tips 15%, Legend Fee 5% | tips 10%, Legend Fee 3% | tips 5%, no Legend Fee |
| Rebuilds a day / streak saves a week | 1 / 1 | 2 / 2 | 3 / 2 |
| Scout refresh | hourly | every 30 minutes | every 30 minutes |
| Frame | | Veteran | Hall of Fame frame and crown |
| Hall of Fame page, name your bot, top of the mentor list | | | ✓ |

Stripe price IDs: `STRIPE_PRICE_VETERAN`, `STRIPE_PRICE_HOF`. The Hall of Fame page is public at `/hall-of-fame`.

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
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_VETERAN`, `STRIPE_PRICE_HOF` | Paid plans, tips through Checkout, Connect payouts to Legends, Legend Fee invoices |
| `TIP_FEE_PCT`, `MENTOR_FEE_PCT`, `POOL_FEE_PCT`, `SUCCESS_FEE_PCT` | Starting fee percentages (the console can change them later) |
| `APP_URL` | Absolute URL for invite links and Stripe redirects |
| `DB_PATH` | Where the SQLite file lives (mount a volume in production) |
| `DEFAULT_TIER` | Membership for players who have not paid (`free`; set `hof` to unlock everything while testing) |
| `STRIPE_PRICE_FANCLUB` | Fan Club subscription price ($4.99). `ALLOW_FREE_CLUB=1` turns it on without billing while testing |
| `FAN_PRIZE_PCT` | Default share of monthly vote revenue that funds the People's Champion check (20) |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM` | Phone verification texts (without them the code prints to the server log) |
| `ALERT_WEBHOOK_URL`, `OWNER_USER_ID` | Where ops alarms go |
| `DATA_DIR` | Clips and other files (mount a volume) |

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
src/trust.js       Phone verification, one account per device, trust score, bans
src/ops.js         Health checks, alarms, nightly money reconciliation
src/squads.js      Squads, squad board, crew calls, bot vs bot
src/market.js      Sponsor tiles, employers and postings, verified résumés, city reports
src/clips.js       Clips from lives
src/fun.js         Bot voice, Boss of the Day, Power Play, combos, quests, titles, the climb, callouts
src/season.js      Monthly races, the ballot, vote packs, prizes, settle, the wall
src/fans.js        Fan accounts, follows, picks, fan points, Fan Club, fan callouts, nightly recap
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
POST /api/auth/register {email,password,displayName,acceptTerms,referralCode?,role?:'fan',city?,deviceId?}
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
POST /api/phone/send {phone}   POST /api/phone/verify {code}   GET /api/trust   GET /api/health
GET/POST/DELETE /api/squads   POST /api/squads/join {code}   POST /api/squads/room   POST /api/squads/room/:id/leave|signal
GET/POST /api/bot-duels   POST /api/bot-duels/:id/vote {pick}
GET /api/sponsor/:id/click   GET /api/postings   POST /api/postings/:id/claim   GET/POST /api/employer   POST /api/employer/postings   POST /api/employer/claims/:id/confirm   GET /api/employer/search   GET /api/employer/resume/:userId
POST /api/tasks/:id/power   GET /api/quests   GET /api/callouts   POST /api/callouts/:userId {line}   POST /api/callouts/:id/accept   POST /api/me/bot-name {name}
GET /api/season   GET /api/season/:month   POST /api/season/vote {userId,n}   POST /api/season/votes/buy {pack}   GET /api/season/wall
GET /api/fans/home   POST /api/fans/join|become-player|follow|pick|callout|club   DELETE /api/fans/follow/:type/:id   GET /api/fans/following|top|club   GET /api/u/:name/fan
GET /api/admin/season   POST /api/admin/season/prizes   POST /api/admin/season/:month/settle   POST /api/admin/fans/:userId/club   POST /api/admin/votes/:userId/grant
GET /api/u/:name/resume   GET /api/reports/city?city=&month=   GET /api/clips   GET /api/clips/mine   POST /api/clips (raw video)   GET /api/clips/:id/video   DELETE /api/clips/:id   GET /api/live/:id/best-window
GET /api/admin/health|sponsor-tiles|postings|reports   POST /api/admin/alerts/:id/resolve|reconcile|ban/:userId|sponsor-tiles|employers/:userId/verify
Public pages: /u/:name  /u/:name/resume  /card/:userId/:date  /story/:id  /safe/:token  /challenge/:slug  /show/:week  /hall-of-fame  /report/:city  /clip/:id  /admin.html
```

Authenticated routes take `Authorization: Bearer <token>`.
