# Deploying the API to Railway

> **DAD + DAUGHTER BEAUTY BOND™ — A SELF-MADE LEGENDS LLC (SML) PRODUCT**
> © 2026 **Self-Made Legends LLC (SML)**. All rights reserved.
> Owner: **Self-Made Legends LLC (SML)** · Proprietary and confidential.

This deploys `backend/` only. The React Native app ships through EAS to the app
stores; Railway serves the API it talks to.

**Its own Railway project.** Not a service inside The Self-Made Legends Come Up's
project — separate project, separate database, separate variables, same reasoning as
the separate Stripe account (`docs/stripe-flow.md` §3.2).

---

## 1. Create the project

Railway → **New Project** → **Deploy from GitHub repo** → `beauty-bond`.

Then in the service's **Settings**:

| Setting | Value |
|---|---|
| **Root Directory** | `backend` |
| Branch | `main` |
| Builder | Nixpacks (auto-detected) |

**Root Directory is the one that catches people out.** The repo root holds `app/`,
`backend/`, `infra/`, and `docs/`; without it Railway tries to build the whole tree
and fails.

`backend/railway.json` supplies the rest — start command, health check, restart
policy, and the pre-deploy migration.

---

## 2. Add Postgres

**+ New** → **Database** → **Add PostgreSQL**, in the same project.

Railway injects `DATABASE_URL` into the API service automatically. Don't paste it
by hand — the reference stays correct when Railway rotates credentials.

The schema is applied by `preDeployCommand` (`npm run migrate`) on every deploy.
Migrations are tracked in `schema_migrations`, so re-running is a no-op.

---

## 3. Set the variables

Service → **Variables**. Only three are needed for the first deploy:

```
NODE_ENV=production
JWT_SECRET=<64 random chars>
REFRESH_SECRET=<64 different random chars>
```

Generate them properly — these sign every session token:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

`DATABASE_URL` and `PORT` come from Railway. Everything else is optional and turns
a feature on when set:

| Feature | Variables | Without them |
|---|---|---|
| Billing | `STRIPE_SECRET_KEY_BB`, `STRIPE_WEBHOOK_SECRET_BB` | Billing routes return 503; the rest of the API works |
| Glam Rooms | `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `LIVEKIT_WS_URL` | Room routes return 503 |
| AI try-on | `ML_SERVICE_URL`, `ML_PROVIDER=http` | Try-on returns 502 |

This split is deliberate: the API boots and serves auth, profiles, learning, and the
guardian console before Stripe or LiveKit exist. Each disabled feature **fails
closed** — Stripe rejects unsigned webhooks, LiveKit refuses to mint tokens — so a
partial deploy cannot quietly do the wrong thing.

Boot logs say plainly what is off:

```
[config] billing DISABLED — set STRIPE_SECRET_KEY_BB, STRIPE_WEBHOOK_SECRET_BB to enable it.
```

**Never paste a Stripe key into a chat, a PR, or a commit.** Railway variables and
your password manager, nothing else.

---

## 4. Verify

Generate a domain under **Settings → Networking → Generate Domain**, then:

```bash
curl https://<your-app>.up.railway.app/health
```

```jsonc
{
  "ok": true,
  "product": "beauty-bond",
  "env": "production",
  "version": "0.1.0",
  "features": { "billing": false, "video": false, "ml": false }
}
```

`ok: true` with features `false` is a **correct** first deploy. Flip them on as each
account is set up.

---

## 5. Point the app at it

`app/app.json` → `expo.extra.apiBaseUrl`:

```json
"apiBaseUrl": "https://<your-app>.up.railway.app/api"
```

Rebuild the dev client or run `npx expo start --clear`.

---

## 6. Stripe webhooks

Once billing is on: Stripe → Developers → **Webhooks** → Add endpoint.

```
https://<your-app>.up.railway.app/api/webhooks/stripe
```

Send these twelve events (`docs/stripe-flow.md` §3.4):

```
checkout.session.completed
customer.subscription.created
customer.subscription.updated
customer.subscription.deleted
customer.subscription.trial_will_end
invoice.paid
invoice.payment_failed
invoice.payment_action_required
payment_method.attached
charge.refunded
customer.deleted
radar.early_fraud_warning.created
```

Copy the signing secret into `STRIPE_WEBHOOK_SECRET_BB` and redeploy.

**Entitlement is granted by the webhook, never by the client returning from the
payment sheet.** If the webhook is not wired up, payments succeed and nobody gets
their plan.

---

## Operations

| Task | How |
|---|---|
| Logs | Railway → service → **Deployments** → **View Logs** |
| Roll back | Deployments → previous → **Redeploy** |
| Run a migration by hand | `railway run npm run migrate` |
| Open a psql shell | `railway connect Postgres` |
| Scale | Settings → Replicas (raise only after checking the DB connection cap) |

### Backups

Railway's Postgres backup policy depends on your plan. **Check it before real
families are on this.** The Legacy Vault holds voice notes and Letters Forward — the
one dataset here that cannot be regenerated from anything.

---

## Troubleshooting

| Symptom | Cause |
|---|---|
| Build can't find `package.json` | Root Directory not set to `backend` |
| `Cannot start: missing JWT_SECRET` | Boot-critical variable unset — see §3 |
| Health check timing out | `preDeployCommand` migration failing; check deploy logs |
| `ECONNREFUSED` to Postgres | Postgres service not attached to this project |
| Billing routes 503 | Expected until Stripe variables are set |
| Webhook 400s | `STRIPE_WEBHOOK_SECRET_BB` is from a different endpoint or account |
