# Operations Manual

**The Self-Made Legends Come Up**
Owned by Self-Made Legends LLC (Missouri)

---

## Who this is for

This is written for someone who has to run this business **without being able
to ask the person who built it.** A family member, a hired developer, a
successor trustee.

If that's you: you don't need to understand all 6,400 lines of the server.
You need to know how to keep it running, how to not lose the data, and who to
call. That's what's here.

Read **§1 Orientation** and **§4 The Database** first. Those two sections
cover the ways this business actually dies.

> **Keep this file current.** It is worth as much as the code. An asset
> nobody can operate is not an inheritance.

---

## 1. Orientation — read this first

**What it is.** A web-based trading simulation game. Players trade simulated
stocks, crypto, and NFTs with virtual currency ("SML Bucks"), compete on a
leaderboard, and buy cosmetic and convenience items with real money through
Stripe. No real securities are traded. No real money is paid out to players.

**How it makes money.** Stripe. Subscriptions (memberships, premium coach)
and one-time purchases (currency packs, loot boxes, cosmetics).

**What it runs on.**

| Piece | What | Where |
|---|---|---|
| Application | Node.js / Express | Railway |
| Real-time | Socket.io | same process |
| Database | SQLite, single file | disk on the Railway container |
| Payments | Stripe | stripe.com |
| Source control | GitHub | `kingleo24725-sketch/Self-Made-Legends-` |
| Email | SMTP via nodemailer | `[FILL IN PROVIDER]` |

**The whole thing is one Node process.** One server file
(`src/api-server.js`, ~6,400 lines) holds every API route. There is no
separate worker, no queue, no external cache. That is simple to operate and
it has one consequence that matters — see §5.

---

## 2. The three-minute runbook

### Start it locally

```bash
npm install
npm start
# open http://localhost:3000
```

`npm start` and `npm run web` both run `src/api-server.js` — the same file
production runs (see `Procfile` and `railway.json`).

> **Historical note:** `npm start` used to run `src/index.js`, a leftover
> command-line bot from the project this grew out of, which is *not* the web
> server. That was corrected. The two legacy entry points are still reachable
> as `npm run legacy:bot` and `npm run legacy:server`; neither is used in
> production.

### Deploy

Railway watches the `main` branch and deploys on push. To ship:

```bash
git checkout main
git merge <your-branch>
git push origin main      # Railway builds and deploys automatically
```

Build config lives in `railway.json`:
- Builder: NIXPACKS
- Start command: `node src/api-server.js`
- Health check: `GET /`
- Restarts on failure, up to 10 retries

### Restart

Railway dashboard → the service → **Restart**. The process is stateless in
memory; a restart is safe. Everything durable is in the database.

### Roll back a bad deploy

Railway dashboard → **Deployments** → pick the last known-good one →
**Redeploy**. This is faster than fixing forward and is almost always the
right first move when production is down.

> Rolling back the *code* does **not** roll back the *database*. If a bad
> deploy corrupted or deleted data, you need the backup (§4).

---

## 3. Environment variables

Set these in the Railway dashboard under the service's **Variables** tab.
They are never committed — `.env` is in `.gitignore` and must stay there.

### Required for the app to function

| Variable | Purpose | Breaks if missing |
|---|---|---|
| `PORT` | Port to listen on | Railway sets this itself |
| `DATA_DIR` | **Where the database file lives** | **See §4 — this is the critical one** |
| `STRIPE_SECRET_KEY` | Server-side Stripe calls | All payments fail |
| `STRIPE_PUBLISHABLE_KEY` | Client-side Stripe checkout | Checkout won't load |
| `STRIPE_WEBHOOK_SECRET` | Verifies webhooks are really from Stripe | Purchases never fulfill |
| `ADMIN_SECRET_KEY` | Gates the admin panel | Admin returns 503 |

### Optional / feature-specific

| Variable | Purpose |
|---|---|
| `NODE_ENV` | `production` in production |
| `APP_URL` / `BASE_URL` | Absolute links in emails and redirects |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS` | Outbound email |
| `EMAIL_FROM` | From address on outbound mail |
| `STRIPE_CREATOR_PRICE_ID` | Stripe price ID for Creator Membership |
| `ALPHA_VANTAGE_API_KEY` | Market data source |
| `OPENSEA_API_KEY` | NFT data source |
| `INITIAL_CAPITAL`, `STOCKS`, `TRADING_ENABLED`, `MAX_POSITION_SIZE`, `MAX_LOSS_PERCENT`, `MIN_GAIN_PERCENT` | Legacy trading-bot settings, from the original project |

### Notes

- **`JWT_SECRET` is documented in the README but is not used anywhere in the
  code.** Setting it does nothing. (Sessions are handled by a generated
  per-account API key stored in the `accounts` table.) The README is stale
  on this point.
- `.env.example` contains a **live Stripe publishable key**. Publishable keys
  are designed to be exposed in browser code, so this is not a secret leak —
  but it does identify the live Stripe account, and it should be a
  placeholder like the other values in that file.
- **The admin endpoint accepts its key via `?key=` in the URL** as well as
  the `x-admin-key` header. URLs end up in server logs, browser history, and
  referrer headers. Prefer the header; treat the key as compromised if it has
  ever been used in a URL and rotate it.

---

## 4. The database — the part that can end the business

**Read this section twice.**

### Where it is

- One SQLite file: **`sml.db`**
- Location: the directory in `DATA_DIR`, defaulting to `data/` inside the app
- Journal mode: WAL — so there are also `sml.db-wal` and `sml.db-shm`
  alongside it. **A backup must include all three, or be taken with a proper
  SQLite backup command.**
- Roughly 80 tables: accounts, portfolios, trades, credits, subscriptions,
  teams, cards, pets, casino, and everything else

**This file is the entire business.** Every player account, every balance,
every purchase, every subscription. The code can be rebuilt from GitHub in an
afternoon. This file cannot be rebuilt from anything.

### ⚠️ Risk 1 — the disk may not survive a deploy

Railway container filesystems are **ephemeral by default**. Unless a
persistent **volume** is attached to the service and `DATA_DIR` points at the
volume's mount path, the database file lives on disk that is **destroyed and
recreated on every deploy and every restart.**

`railway.json` in this repo declares **no volume**. Volumes can also be
attached through the Railway dashboard, which is not visible from the code —
so this needs to be checked, not assumed.

**Verify right now, and write the answer here:**

```
Railway volume attached?     [ YES / NO ]
Volume mount path:           [ FILL IN, e.g. /data ]
DATA_DIR is set to:          [ FILL IN — must match the mount path ]
Verified on (date):          [ FILL IN ]
```

**How to verify:** Railway dashboard → the service → **Settings** → look for
a mounted **Volume**. Then check that the `DATA_DIR` variable equals the
volume's mount path.

**If there is no volume:** stop and fix this before anything else in this
document. Attach a volume, set `DATA_DIR` to its mount path, and migrate the
existing database file onto it. Until that is done, every deploy resets the
game to zero and every player loses their account.

### ⚠️ Risk 2 — there are no backups

Nothing in this codebase, and nothing in the deploy configuration, backs up
the database. `data/*.db` is in `.gitignore`, correctly — so it is not in
GitHub either. **As of this writing there is no copy of the player data
anywhere except the running server.**

One corrupted write, one wrong command, one platform incident, and it is
gone permanently.

**Minimum acceptable backup:**

1. A scheduled job that runs `sqlite3 $DATA_DIR/sml.db ".backup /tmp/sml-backup.db"`
   — use `.backup`, not a file copy, so WAL state is captured consistently
2. Upload the result to off-platform storage (S3, Backblaze, anything not
   Railway)
3. Daily at minimum. Keep 30 days.
4. **Test a restore once.** A backup nobody has restored is a guess.

Record it here once it exists:

```
Backup runs:        [ HOW / WHERE ]
Backups stored at:  [ WHERE ]
Retention:          [ HOW LONG ]
Last restore test:  [ DATE ]
```

### Inspecting the database

```bash
sqlite3 "$DATA_DIR/sml.db"
.tables                                    # list all tables
SELECT COUNT(*) FROM accounts;             # how many players
SELECT COUNT(*) FROM trades;               # how many trades ever
.quit
```

Player data is personal data. Handle it consistently with the published
privacy policy (`public/privacy-policy.html`).

---

## 5. Scheduled jobs — and why you must run exactly one instance

Around twenty recurring jobs run **inside the web process** on `setInterval`
timers. They start when the server starts and stop when it stops. Among them:

| Roughly every | What runs |
|---|---|
| 30 seconds | Simulated price engine tick |
| 60 seconds | Market analysis; crypto price sync; Trade War tick |
| 90 seconds | Bot trader activity |
| 2 minutes | Horse race resolution |
| 10 minutes | Coach broadcast tips; territory income payouts |
| varies | Flash challenges, car races, and others |

### The constraint

**Run exactly one instance of this service. Never scale it to two.**

There is no leader election, no job lock, and no shared coordination. A
second instance runs a second copy of every timer — races resolve twice,
territory income pays twice, prices tick twice. That silently corrupts the
game economy, and because nothing errors, you would not find out until
players started reporting impossible balances.

The same applies to the SQLite database: one file on one disk cannot be
shared across instances.

**If you ever need to handle more traffic**, that is a real engineering
project — move the database to Postgres and move the jobs out of the web
process. It is not a dashboard setting. Do not just turn up the replica
count.

---

## 6. Accounts and credentials

**Fill this in.** Nobody can operate the business without it, and it is the
single most common thing missing when someone inherits a company.

Do **not** put passwords in this file — it's in version control. Put them in
a password manager and record here only *which vault* and *who has access*.

| Service | What it does | Login is | Who has access |
|---|---|---|---|
| Railway | Hosting, deploys, env vars | `[EMAIL]` | `[WHO]` |
| Stripe | All revenue | `[EMAIL]` | `[WHO]` |
| GitHub | Source code | `kingleo24725-sketch` | `[WHO]` |
| Domain registrar | The domain name | `[REGISTRAR]` / `[EMAIL]` | `[WHO]` |
| SMTP / email | Outbound mail | `[PROVIDER]` | `[WHO]` |
| Business bank | Where Stripe pays out | `[BANK]` | `[WHO]` |
| Password manager | Everything above | `[WHICH ONE]` | `[WHO]` |

```
Password vault:              [ WHICH SERVICE ]
Emergency access granted to: [ WHO ]
2FA recovery codes stored:   [ WHERE ]
```

> **Set up emergency access.** Most password managers offer it — a named
> person can request access and receive it after a waiting period. Without
> it, a locked vault means the business is unrecoverable regardless of what
> any legal document says.

**Registered agent (Missouri):** § 347.030 RSMo requires the LLC to
continuously maintain a registered agent and registered office. Missouri
requires no annual report, so nothing will remind you.

```
Registered agent:   [ NAME ]
Registered office:  [ ADDRESS ]
Last confirmed:     [ DATE ]
```

---

## 7. When something breaks

### The site is down

1. Railway dashboard → **Deployments** → read the logs for the crash
2. Did a deploy just go out? → **Redeploy the previous one.** Fix after.
3. No recent deploy? → **Restart** the service
4. Still down → check [status.railway.app](https://status.railway.app) and
   [status.stripe.com](https://status.stripe.com)

### Payments aren't going through

- Check the **Stripe dashboard → Developers → Webhooks**. Failed webhook
  deliveries are the usual cause: the player paid, but the game never
  credited them.
- Confirm `STRIPE_WEBHOOK_SECRET` in Railway matches the signing secret shown
  in Stripe for that exact endpoint. These drift when an endpoint is
  recreated.
- Stripe lets you **resend** failed webhook events — that usually fixes an
  individual player without touching the database.

### A player says they lost their balance / account

1. Look them up: `SELECT * FROM accounts WHERE email = '...';`
2. If the row is gone entirely, suspect the ephemeral-disk problem in §4 —
   check whether a deploy happened around that time
3. Check `audit_log` for their `user_id`

### The game economy looks wrong

Check whether more than one instance is running (§5). Duplicate scheduled
jobs are the most likely cause of balances that inflate on their own.

---

## 8. Known gaps

An honest list. None of these are emergencies today; all of them are things a
buyer's or successor's technical reviewer will find.

| Gap | Why it matters |
|---|---|
| **No database backups** | §4. The single largest risk to the business. |
| **Volume persistence unverified** | §4. If absent, data is lost on every deploy. |
| **No automated tests** | `npm test` runs jest, but no test files exist. Every change is verified by hand. |
| **CI auto-merges to main without review** | `.github/workflows/auto-deploy.yml` merges pushes on `claude/ai-stock-trading-bot-hwyx7b` straight into `main`, which deploys to production. No tests, no approval. Anyone who can push to that branch can ship to production. |
| **One 6,400-line server file** | `src/api-server.js` holds every route. Workable, but slow and risky to change. |
| **Dead entry points** | `src/index.js` and `src/server.js` are leftovers from the original trading-bot project and are not what production runs. Kept as `legacy:*` scripts; safe to delete once confirmed unused. |
| **README is stale** | Documents `JWT_SECRET`, which is unused; omits `DATA_DIR`, `ADMIN_SECRET_KEY`, and the SMTP variables. |
| **Single point of failure: the owner** | Reduced by this document. Keep it current. |

---

## 9. If the owner is unavailable

For a successor trustee or family member, in order:

1. **Don't panic — nothing needs to be decided today.** The service runs on
   its own. It will keep running and keep taking payments.
2. **Get into the password manager first** (§6). Everything else depends on
   it. If emergency access was set up, start that process now, because it
   has a waiting period.
3. **Verify the money is still arriving.** Log into Stripe. Confirm payouts
   are going to a bank account you can access.
4. **Make a backup of the database immediately** (§4), before changing
   anything at all.
5. **Then decide, unhurried:** keep operating it, hire someone to operate it,
   or sell it. All three are real options, and none of them get worse by
   taking a few weeks.
6. **Before selling**, the buyer will ask for: the IP assignment
   (`legal/IP-ASSIGNMENT-DRAFT.md`), the trademark registration, revenue
   history from Stripe, and player counts from the database. Having those
   ready is worth real money in the price.

```
Contact if technical help is needed:  [ NAME / FIRM / PHONE ]
Attorney:                             [ NAME / FIRM / PHONE ]
Accountant:                           [ NAME / FIRM / PHONE ]
```

---

*Last updated: August 19, 2026. Update the date whenever you change
anything here.*
