# 03 — Stripe Subscription Flow

> **BEAUTY BOND™ — A SELF-MADE LEGENDS LLC (SML) PRODUCT**
> © 2026 **Self-Made Legends LLC (SML)**. All rights reserved.
> Owner: **Self-Made Legends LLC (SML)** · Proprietary and confidential.
> A standalone SML product — **not** part of The Self-Made Legends Come Up.

**Merchant of record:** Self-Made Legends LLC (SML).

**Billing topology:** Beauty Bond ships from its **own repository** but bills through
the **shared SML Stripe account** — the same account The Self-Made Legends Come Up
already uses. One account, one payout, one dashboard, two products. Because the
account is shared, product isolation is not automatic; it is enforced in code at four
layers described in §3.2. **Read §3.2 before writing any billing code.**

Card statements read `SML* BEAUTY BOND` — distinct from the game's descriptor, so a
family never sees a trading-game charge on their statement.

Stripe API version pinned: **`2024-06-20`**. All amounts USD; multi-currency via
Stripe Adaptive Pricing.

---

## 3.1 Plan Tiers

| Tier | Code | Monthly | Yearly | Child accounts |
|---|---|---|---|---|
| Sparkle | `sparkle` | Free | Free | 1 |
| Bond | `bond` | $6.99 | $58.99 (30% off) | 3 |
| Legacy | `legacy` | $12.99 | $109.99 | 6 |
| Studio | `studio` | $24.99 | $209.99 | 6 |

**Add-ons (one-time / metered):**

| Add-on | Code | Price | Type |
|---|---|---|---|
| Bond Book (printed) | `bondbook_print` | $34.99 | one-time |
| Bond Book (PDF) | `bondbook_pdf` | $9.99 | one-time |
| Extra child seat | `seat_child` | $2.99/mo | recurring, quantity-based |
| Legacy Vault +100 GB | `vault_100` | $3.99/mo | recurring |
| Gift subscription (12 mo Bond) | `gift_bond_12` | $58.99 | one-time → coupon |

### Entitlement matrix (single source of truth)

```ts
// packages/shared/entitlements.ts
export const TIERS = ['sparkle', 'bond', 'legacy', 'studio'] as const
export type Tier = (typeof TIERS)[number]

export type Entitlements = {
  learningMaxLevel: 1 | 2 | 3 | 4 | 5 | 6
  culturalCollections: number | 'all'
  tryOnPerMonth: number | 'unlimited'
  culturalGlamSets: boolean
  familyRoomMinutesPerMonth: number | 'unlimited'
  globalRooms: 'none' | 'listen' | 'full'
  vaultItems: number | 'unlimited'
  lettersForward: boolean
  bondBooksPerYear: number | 'unlimited'
  childSeats: number
  creatorTools: boolean
}

export const ENTITLEMENTS: Record<Tier, Entitlements> = {
  sparkle: {
    learningMaxLevel: 2, culturalCollections: 1, tryOnPerMonth: 5,
    culturalGlamSets: false, familyRoomMinutesPerMonth: 20,
    globalRooms: 'listen', vaultItems: 3, lettersForward: false,
    bondBooksPerYear: 0, childSeats: 1, creatorTools: false,
  },
  bond: {
    learningMaxLevel: 6, culturalCollections: 'all', tryOnPerMonth: 'unlimited',
    culturalGlamSets: true, familyRoomMinutesPerMonth: 300,
    globalRooms: 'full', vaultItems: 25, lettersForward: false,
    bondBooksPerYear: 1, childSeats: 3, creatorTools: false,
  },
  legacy: {
    learningMaxLevel: 6, culturalCollections: 'all', tryOnPerMonth: 'unlimited',
    culturalGlamSets: true, familyRoomMinutesPerMonth: 'unlimited',
    globalRooms: 'full', vaultItems: 'unlimited', lettersForward: true,
    bondBooksPerYear: 4, childSeats: 6, creatorTools: false,
  },
  studio: {
    learningMaxLevel: 6, culturalCollections: 'all', tryOnPerMonth: 'unlimited',
    culturalGlamSets: true, familyRoomMinutesPerMonth: 'unlimited',
    globalRooms: 'full', vaultItems: 'unlimited', lettersForward: true,
    bondBooksPerYear: 'unlimited', childSeats: 6, creatorTools: true,
  },
}

/** Capabilities that are NEVER gated, at any tier, in any state. */
export const ALWAYS_FREE = [
  'safety.panic_button',
  'safety.report',
  'safety.block',
  'guardian.console',
  'guardian.permissions',
  'privacy.data_export',
  'privacy.account_delete',
  'learning.hygiene',          // Levels 1–2 hygiene lessons
  'legacy.letter_delivery',    // already-recorded letters ALWAYS deliver
] as const
```

> **§3.6 rule, encoded above:** a lapsed subscription never withholds a
> already-recorded Letter Forward, and never disables a safety control.

---

## 3.2 Shared Stripe Account — Isolation Architecture

> **The governing rule:** Beauty Bond and The Self-Made Legends Come Up share one
> Stripe account. **Stripe fans out every event to every webhook endpoint on the
> account.** Beauty Bond's endpoint will therefore receive the game's events, and the
> game's endpoint will receive Beauty Bond's. Neither app may act on the other's
> events. Isolation is enforced in code, at four layers.

### Layer 1 — Namespace every object

Every Stripe object Beauty Bond creates carries a product tag. No exceptions.

| Object | Requirement |
|---|---|
| Product | `metadata.sml_product = 'beauty_bond'` |
| Price | `metadata.sml_product = 'beauty_bond'`, `lookup_key` prefixed **`bb_`** |
| Customer | `metadata.sml_product = 'beauty_bond'`, `metadata.bb_user_id` |
| Subscription | `metadata.sml_product = 'beauty_bond'`, `metadata.bb_user_id` |
| Checkout Session | `metadata.sml_product = 'beauty_bond'`, `client_reference_id = bb:<userId>` |
| Coupon / Promo | code prefixed `BB-` |

**Metadata key collision rule (verified against the live Come Up handler):** the Come
Up app reads `metadata.userId` and `metadata.type`. Beauty Bond **must never write
those two keys.** It writes `bb_user_id` and `sml_product` instead. Come Up's handler
early-returns when `userId`/`type` are absent, so Beauty Bond events no-op there —
that safety depends entirely on Beauty Bond honoring this namespace. Writing a
`userId` key from Beauty Bond would cause the game to grant SML Bucks on a Beauty
Bond payment.

### Layer 2 — Separate Customer objects per product

**A human who buys both products gets two Stripe Customers**, one per product, each
tagged. Do not reuse one Customer across products.

Why: entitlement lookups resolve `customer → user`. With a shared Customer, a Come Up
subscription event would resolve to a Beauty Bond user and could grant a Beauty Bond
tier — a silent cross-product entitlement grant. Separate Customers make that
structurally impossible. The duplicate-customer cost (two rows for one human) is worth
far more than the failure it prevents.

```ts
// Every customer lookup is product-scoped. There is no unscoped variant.
async function findOrCreateBBCustomer(user: User): Promise<string> {
  if (user.stripe_customer_id) return user.stripe_customer_id   // BB customer only

  const customer = await stripe.customers.create({
    email: user.email,
    metadata: { sml_product: 'beauty_bond', bb_user_id: user.id },
  }, { idempotencyKey: `bb_cust_${user.id}` })

  await db.users.update(user.id, { stripe_customer_id: customer.id })
  return customer.id
}
```

```ts
// db/users.ts — the scoped lookup. NEVER add an unscoped byStripeCustomer().
export async function byStripeCustomer(customerId: string) {
  return db.query(
    `SELECT * FROM users WHERE stripe_customer_id = $1 AND deleted_at IS NULL`,
    [customerId])   // only ever holds beauty_bond customers
}
```

### Layer 3 — Webhook ownership filter (the critical one)

Beauty Bond's handler resolves the owning product **before** any processing, and
**fails closed** — an event it cannot attribute is ignored, never granted.

```ts
// apps/api/src/routes/webhooks.ts
const OURS = 'beauty_bond'

/** Resolve which SML product an event belongs to. Fails closed. */
async function belongsToBeautyBond(event: Stripe.Event): Promise<boolean> {
  const obj = event.data.object as any

  // 1. Direct tag — covers subscription, checkout.session, PI, charge, customer
  if (obj?.metadata?.sml_product) return obj.metadata.sml_product === OURS

  // 2. Invoices carry no metadata of their own — resolve via subscription…
  if (obj?.object === 'invoice') {
    if (typeof obj.subscription === 'string') {
      const sub = await stripe.subscriptions.retrieve(obj.subscription)
      if (sub.metadata?.sml_product) return sub.metadata.sml_product === OURS
    }
    // …or via the line items' price lookup_key prefix
    const key = obj.lines?.data?.[0]?.price?.lookup_key
    if (key) return key.startsWith('bb_')
  }

  // 3. Fall back to the customer's tag
  const customerId = typeof obj?.customer === 'string' ? obj.customer : null
  if (customerId) {
    const customer = await stripe.customers.retrieve(customerId)
    if (!('deleted' in customer)) return customer.metadata?.sml_product === OURS
  }

  // 4. Unattributable → NOT ours. Fail closed: never grant on an unknown event.
  logger.warn({ eventId: event.id, type: event.type }, 'unattributable_stripe_event')
  metrics.increment('stripe.unattributable_event')
  return false
}

webhooks.post('/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(
      req.body, req.headers['stripe-signature'] as string,
      process.env.STRIPE_WEBHOOK_SECRET_BB!)
  } catch (err: any) {
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }

  // ── OWNERSHIP GATE — before idempotency, before any write ──
  if (!(await belongsToBeautyBond(event))) {
    return res.json({ received: true, ignored: 'not_beauty_bond' })
  }

  const fresh = await db.webhookEvents.insertIfAbsent({
    id: event.id, provider: 'stripe', type: event.type, payload: event,
  })
  if (!fresh) return res.json({ received: true, duplicate: true })

  res.json({ received: true })
  await handle(event).catch(err => db.webhookEvents.markFailed(event.id, String(err)))
})
```

**The gate runs before the idempotency insert** so the `webhook_events` ledger stays
free of the game's traffic.

`syncSubscription` carries a defense-in-depth assertion — belt and braces, because a
wrong grant here is a revenue and trust bug:

```ts
async function syncSubscription(sub: Stripe.Subscription) {
  if (sub.metadata?.sml_product !== OURS) {
    throw new Error(`refusing to sync foreign subscription ${sub.id}`)
  }
  // …
}
```

### Layer 4 — Separate restricted API keys

Beauty Bond never uses the account's unrestricted secret key.

| Key | Scope |
|---|---|
| `STRIPE_SECRET_KEY_BB` | **Restricted key.** Write: Customers, Subscriptions, Prices (read), Checkout Sessions, Billing Portal, Invoices (read). No Connect, no Payouts, no Radar config, no account settings. |
| `STRIPE_WEBHOOK_SECRET_BB` | Beauty Bond's **own endpoint** signing secret — a distinct endpoint URL from the game's |
| `STRIPE_PUBLISHABLE_KEY` | Shared, public, safe |

Two endpoints on one account, each with its own secret: a leaked Beauty Bond key
cannot read the game's customers or trigger payouts, and rotating one doesn't disturb
the other.

### What sharing the account does and doesn't give you

| | Effect |
|---|---|
| ✅ | One payout schedule, one bank account, one tax registration, one dashboard |
| ✅ | One place to reconcile revenue across both products |
| ✅ | No new business verification for Beauty Bond |
| ⚠️ | **Account-level risk is shared.** A dispute spike or a Radar block on the game affects the account Beauty Bond depends on to charge families. |
| ⚠️ | Radar rules are account-wide — scope any custom rule with `metadata['sml_product']` or it will apply to both products. |
| ⚠️ | Reporting mixes both products by default — filter every report by `metadata.sml_product`. |
| ⚠️ | Both apps receive both apps' webhooks — Layer 3 is mandatory, not optional. |

> **Worth knowing:** one Stripe *login* can own multiple Stripe *accounts* with a
> dashboard switcher — separate data, separate risk, still one place to look. If the
> shared-risk row above becomes a concern, that's the migration path, and the Layer 1
> namespacing above makes moving Beauty Bond's objects out straightforward. Building
> it this way keeps that door open.

### Required change to the Come Up app

The game's handler is currently safe **by accident** — it early-returns when
`metadata.userId` and `metadata.type` are missing, which Beauty Bond events will be.
Make it safe **on purpose** by adding the mirror-image gate at the top of its
webhook handler:

```js
// src/api-server.js — Come Up webhook, add before any branch
const meta = obj.metadata || {};
if (meta.sml_product && meta.sml_product !== 'come_up') {
  return res.sendStatus(200);   // Beauty Bond's event — not ours
}
```

Track this as a prerequisite ticket on the Come Up side before Beauty Bond's first
live charge.

---

## 3.2.1 Stripe Object Setup

One **Product** per tier, two **Prices** each (monthly/yearly). Seed script:

```ts
// scripts/seed-stripe.ts
import Stripe from 'stripe'
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY_BB!, { apiVersion: '2024-06-20' })

const PLANS = [
  { code: 'bond',   name: 'Bond',   monthly: 699,  yearly: 5899  },
  { code: 'legacy', name: 'Legacy', monthly: 1299, yearly: 10999 },
  { code: 'studio', name: 'Studio', monthly: 2499, yearly: 20999 },
]

for (const p of PLANS) {
  const product = await stripe.products.create({
    name: `Beauty Bond ${p.name}`,
    statement_descriptor: 'SML BEAUTY BOND',        // distinct from the game's
    metadata: { tier: p.code, sml_product: 'beauty_bond' },
  })
  for (const [interval, amount] of [['month', p.monthly], ['year', p.yearly]] as const) {
    await stripe.prices.create({
      product: product.id,
      currency: 'usd',
      unit_amount: amount,
      recurring: { interval },
      lookup_key: `bb_${p.code}_${interval}ly`,     // bb_bond_monthly, bb_bond_yearly
      metadata: { tier: p.code, sml_product: 'beauty_bond' },
    })
  }
}
```

**Rules:**

- The app never hardcodes `price_...` IDs. It resolves prices by `lookup_key`, so
  test/live/regional catalogs stay swappable.
- Every `lookup_key` is **`bb_`-prefixed** — on a shared account this is what keeps
  Beauty Bond's price resolution from ever matching a Come Up price.
- Price lookups filter on the prefix, never on a bare tier name:

```ts
async function priceIdFor(lookupKey: string): Promise<string> {
  if (!lookupKey.startsWith('bb_')) throw new Error('non_beauty_bond_price')
  const { data } = await stripe.prices.list({ lookup_keys: [lookupKey], active: true })
  const price = data.find(p => p.metadata.sml_product === 'beauty_bond')
  if (!price) throw new Error('unknown_plan')
  return price.id
}
```

**Statement descriptor:** the SML account's static prefix stays `SML`; Beauty Bond
sets its product-level descriptor so charges read `SML* BEAUTY BOND`. Verify the exact
descriptor fields against the pinned API version at implementation time — Stripe has
moved this between `Product`, `Invoice`, and `PaymentIntent.statement_descriptor_suffix`
across versions. The requirement is the outcome, not the field: **a family's statement
must never show a trading-game descriptor.**

**Tax:** Stripe Tax enabled (`automatic_tax: { enabled: true }`); customer address
collected at checkout. **Billing thresholds:** none — no surprise charges.

---

## 3.3 Plan Selection Screen → Checkout

Client (React Native) never touches the secret key. It asks the API for a session.

```ts
// apps/mobile/src/features/billing/useCheckout.ts
export function useCheckout() {
  const { presentPaymentSheet, initPaymentSheet } = useStripe()

  return async function checkout(lookupKey: string) {
    // 1. Server creates customer + subscription in `incomplete` state
    const res = await api.post('/v1/billing/checkout', { lookupKey })
    const { clientSecret, ephemeralKey, customerId, subscriptionId } = res.data

    // 2. Native payment sheet (Apple Pay / Google Pay / card)
    const { error: initErr } = await initPaymentSheet({
      merchantDisplayName: 'Beauty Bond',
      customerId,
      customerEphemeralKeySecret: ephemeralKey,
      paymentIntentClientSecret: clientSecret,
      allowsDelayedPaymentMethods: false,
      applePay: { merchantCountryCode: 'US' },
      googlePay: { merchantCountryCode: 'US', testEnv: __DEV__ },
    })
    if (initErr) throw initErr

    const { error } = await presentPaymentSheet()
    if (error) return { status: 'failed' as const, message: error.message }

    // 3. DO NOT grant access here. Poll for the webhook-written entitlement.
    return { status: 'pending' as const, subscriptionId }
  }
}
```

> **App Store / Play Store note:** Apple and Google require IAP for digital content
> consumed in-app. Ship **StoreKit 2 / Play Billing** as the mobile purchase path and
> use Stripe for **web checkout, gift purchases, printed Bond Books (physical good),
> and creator payouts**. The entitlement service normalizes all three sources into one
> `subscriptions` row (`source: 'stripe' | 'apple' | 'google'`) so nothing downstream
> cares where the money came from. Skipping this gets the app rejected.

### Backend: create checkout

```ts
// apps/api/src/routes/billing.ts
import { Router } from 'express'
import Stripe from 'stripe'
import { requireAuth, requireAdult } from '../middleware/auth'
import { db } from '../db'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY_BB!, { apiVersion: '2024-06-20' })
export const billing = Router()

// Purchases are adults-only. A child account can never reach this route.
billing.post('/checkout', requireAuth, requireAdult, async (req, res) => {
  const { lookupKey } = req.body as { lookupKey: string }
  const user = req.user!

  if (!lookupKey.startsWith('bb_')) return res.status(400).json({ error: 'unknown_plan' })
  const prices = await stripe.prices.list({ lookup_keys: [lookupKey], expand: ['data.product'] })
  const price = prices.data.find(p => p.metadata.sml_product === 'beauty_bond')
  if (!price) return res.status(400).json({ error: 'unknown_plan' })

  // Product-scoped customer — see §3.2 Layer 2
  const customerId = await findOrCreateBBCustomer(user)

  const subscription = await stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: price.id }],
    payment_behavior: 'default_incomplete',
    payment_settings: { save_default_payment_method: 'on_subscription' },
    automatic_tax: { enabled: true },
    trial_period_days: 7,
    // NOTE: `bb_user_id`, never `userId` — see §3.2 Layer 1 collision rule
    metadata: {
      bb_user_id: user.id,
      tier: (price.metadata as any).tier,
      sml_product: 'beauty_bond',
    },
    expand: ['latest_invoice.payment_intent'],
  }, { idempotencyKey: `bb_sub_${user.id}_${price.id}_${req.body.nonce ?? ''}` })

  const ephemeralKey = await stripe.ephemeralKeys.create(
    { customer: customerId }, { apiVersion: '2024-06-20' }
  )

  const pi = (subscription.latest_invoice as any).payment_intent
  res.json({
    subscriptionId: subscription.id,
    clientSecret: pi.client_secret,
    ephemeralKey: ephemeralKey.secret,
    customerId,
  })
})
```

### Web path (Stripe Checkout hosted)

```ts
billing.post('/checkout-session', requireAuth, requireAdult, async (req, res) => {
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: req.user!.stripe_customer_id ?? undefined,
    customer_email: req.user!.stripe_customer_id ? undefined : req.user!.email,
    line_items: [{ price: await priceIdFor(req.body.lookupKey), quantity: 1 }],
    subscription_data: {
      trial_period_days: 7,
      metadata: { bb_user_id: req.user!.id, sml_product: 'beauty_bond' },
    },
    metadata: { bb_user_id: req.user!.id, sml_product: 'beauty_bond' },
    client_reference_id: `bb:${req.user!.id}`,
    automatic_tax: { enabled: true },
    allow_promotion_codes: true,
    success_url: `${process.env.WEB_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.WEB_URL}/plans`,
  })
  res.json({ url: session.url })
})
```

---

## 3.4 Webhooks

**Endpoint:** `POST /v1/webhooks/stripe` — raw body, signature-verified, idempotent.

### Events consumed

| Event | Action |
|---|---|
| `checkout.session.completed` | Link customer → user (web path) |
| `customer.subscription.created` | Upsert subscription, grant entitlement |
| `customer.subscription.updated` | Re-sync tier/status (upgrade, downgrade, trial end, cancel-at-period-end) |
| `customer.subscription.deleted` | Downgrade to `sparkle` |
| `customer.subscription.trial_will_end` | Notify (3 days out) |
| `invoice.paid` | Extend `current_period_end`, clear dunning |
| `invoice.payment_failed` | Enter dunning, notify, keep access during grace |
| `invoice.payment_action_required` | Push 3DS prompt |
| `payment_method.attached` | Update default PM display |
| `charge.refunded` | Revoke/adjust, log |
| `customer.deleted` | Detach, downgrade |
| `radar.early_fraud_warning.created` | Flag account, alert ops |

```ts
// apps/api/src/routes/webhooks.ts
import express, { Router } from 'express'
import Stripe from 'stripe'
import { db } from '../db'
import { setEntitlement } from '../services/entitlements'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY_BB!, { apiVersion: '2024-06-20' })
export const webhooks = Router()

webhooks.post('/stripe',
  express.raw({ type: 'application/json' }),   // MUST be raw, before any json parser
  async (req, res) => {
    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(
        req.body, req.headers['stripe-signature'] as string,
        process.env.STRIPE_WEBHOOK_SECRET_BB!
      )
    } catch (err: any) {
      return res.status(400).send(`Webhook Error: ${err.message}`)
    }

    // Idempotency: Stripe retries. Insert-or-skip on event.id.
    const fresh = await db.webhookEvents.insertIfAbsent({
      id: event.id, type: event.type, payload: event,
    })
    if (!fresh) return res.json({ received: true, duplicate: true })

    // ACK fast; process async. Stripe times out at 20s.
    res.json({ received: true })
    await handle(event).catch(async (err) => {
      await db.webhookEvents.markFailed(event.id, String(err))
      // dead-letter queue → retried with backoff, alerts after 3 failures
    })
  })

async function handle(event: Stripe.Event) {
  switch (event.type) {
    case 'checkout.session.completed': {
      const s = event.data.object as Stripe.Checkout.Session
      // client_reference_id is `bb:<userId>` — strip the namespace prefix
      const ref = s.client_reference_id?.startsWith('bb:')
        ? s.client_reference_id.slice(3) : null
      if (ref && typeof s.customer === 'string') {
        await db.users.update(ref, { stripe_customer_id: s.customer })
      }
      break
    }

    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      await syncSubscription(sub)
      break
    }

    case 'invoice.paid': {
      const inv = event.data.object as Stripe.Invoice
      if (typeof inv.subscription === 'string') {
        await syncSubscription(await stripe.subscriptions.retrieve(inv.subscription))
        await db.dunning.clear(inv.customer as string)
      }
      break
    }

    case 'invoice.payment_failed': {
      const inv = event.data.object as Stripe.Invoice
      const user = await db.users.byStripeCustomer(inv.customer as string)
      if (user) {
        await db.dunning.upsert({
          user_id: user.id,
          attempt: inv.attempt_count ?? 1,
          grace_ends_at: addDays(new Date(), 7),   // access preserved for 7 days
        })
        await notify(user, 'payment_failed', { hostedInvoiceUrl: inv.hosted_invoice_url })
      }
      break
    }

    case 'customer.subscription.trial_will_end': {
      const sub = event.data.object as Stripe.Subscription
      const user = await db.users.byStripeCustomer(sub.customer as string)
      if (user) await notify(user, 'trial_ending', { endsAt: sub.trial_end })
      break
    }

    case 'charge.refunded': {
      const ch = event.data.object as Stripe.Charge
      await db.billingEvents.log('refund', ch.customer as string, ch.amount_refunded)
      break
    }
  }
}

async function syncSubscription(sub: Stripe.Subscription) {
  const userId = sub.metadata.bb_user_id
    ?? (await db.users.byStripeCustomer(sub.customer as string))?.id
  if (!userId) return

  const price = sub.items.data[0]?.price
  const tier = (price?.metadata as any)?.tier ?? 'sparkle'

  // Active-ish statuses keep access. `past_due` keeps access during the grace window.
  const ACTIVE = ['active', 'trialing', 'past_due']
  const effectiveTier = ACTIVE.includes(sub.status) ? tier : 'sparkle'

  await db.subscriptions.upsert({
    id: sub.id,
    user_id: userId,
    source: 'stripe',
    tier,
    status: sub.status,
    price_lookup_key: price?.lookup_key ?? null,
    current_period_end: new Date(sub.current_period_end * 1000),
    cancel_at_period_end: sub.cancel_at_period_end,
    trial_end: sub.trial_end ? new Date(sub.trial_end * 1000) : null,
    seats: sub.items.data.find(i => i.price.lookup_key === 'seat_child')?.quantity ?? 0,
  })

  await setEntitlement(userId, effectiveTier)   // writes cache + audit row
}
```

### Local & CI testing

```bash
stripe listen --forward-to localhost:4000/v1/webhooks/stripe
stripe trigger customer.subscription.created
stripe trigger invoice.payment_failed
stripe trigger customer.subscription.deleted
```

CI runs a fixture suite replaying all 12 events, asserting the resulting
`entitlements` row — including **duplicate delivery** and **out-of-order delivery**
(an `updated` arriving before its `created`; `syncSubscription` is order-independent
because it always reads the full object).

---

## 3.5 Access Control

**Rule: entitlement is server-side truth. The client only renders it.**

```ts
// apps/api/src/services/entitlements.ts
import { ENTITLEMENTS, ALWAYS_FREE, type Tier } from '@bb/shared/entitlements'

export async function getTier(userId: string): Promise<Tier> {
  const sub = await db.subscriptions.activeFor(userId)   // any source
  if (!sub) return 'sparkle'

  const inGrace = sub.status === 'past_due'
    && (await db.dunning.get(userId))?.grace_ends_at > new Date()

  if (['active', 'trialing'].includes(sub.status) || inGrace) return sub.tier
  return 'sparkle'
}

/** A guardian's tier flows down to every linked child. Kids never pay. */
export async function effectiveTierFor(profileId: string): Promise<Tier> {
  const profile = await db.profiles.get(profileId)
  const payerId = profile.guardian_id ?? profile.user_id
  return getTier(payerId)
}
```

```ts
// apps/api/src/middleware/requireEntitlement.ts
export function requireEntitlement(
  check: (e: Entitlements, req: Request) => boolean,
  capability?: string,
) {
  return async (req, res, next) => {
    if (capability && ALWAYS_FREE.includes(capability as any)) return next()

    const tier = await effectiveTierFor(req.profile!.id)
    if (check(ENTITLEMENTS[tier], req)) return next()

    return res.status(402).json({
      error: 'upgrade_required',
      currentTier: tier,
      capability,
      // The client turns this into a soft paywall sheet, never a hard wall.
    })
  }
}
```

Usage:

```ts
router.get('/lessons/:id',
  requireAuth,
  requireAgeBand(),                              // age gate FIRST — never purchasable
  requireEntitlement((e, req) => req.lesson.level <= e.learningMaxLevel),
  getLesson)

router.post('/tryon',
  requireAuth,
  requireConsent('camera'),
  requireEntitlement((e) => e.tryOnPerMonth === 'unlimited' || quotaLeft(req) > 0),
  runTryOn)

router.post('/rooms/:id/panic',
  requireAuth,
  requireEntitlement(() => true, 'safety.panic_button'),   // ALWAYS_FREE short-circuit
  panicExit)
```

**Two independent gates, checked in this order:**

1. **Age gate** (`requireAgeBand`) — a 9-year-old cannot buy access to Level 6.
   No tier, coupon, or promo overrides an age lock. This is a compliance boundary.
2. **Entitlement gate** (`requireEntitlement`) — commercial.

Client mirrors entitlements from `GET /v1/me/entitlements` (cached 60 s, refetched on
app foreground and on push after a webhook lands) purely for UI affordances.
**A client that lies gets a 402 from the API.**

### Quota metering (free-tier try-on)

```sql
-- Monthly counter, reset by period not by cron
CREATE TABLE usage_counters (
  profile_id  uuid NOT NULL,
  metric      text NOT NULL,          -- 'tryon', 'room_minutes'
  period      text NOT NULL,          -- '2026-08'
  used        int  NOT NULL DEFAULT 0,
  PRIMARY KEY (profile_id, metric, period)
);
```

```ts
await db.query(
  `INSERT INTO usage_counters (profile_id, metric, period, used)
   VALUES ($1, $2, to_char(now(),'YYYY-MM'), 1)
   ON CONFLICT (profile_id, metric, period)
   DO UPDATE SET used = usage_counters.used + 1
   RETURNING used`, [profileId, 'tryon'])
```

---

## 3.6 Lifecycle Rules

| Event | Behavior |
|---|---|
| **Trial** | 7 days, card required, reminder at day 4. One trial per user, ever (`trials_used`). |
| **Upgrade** | Immediate, prorated (`proration_behavior: 'create_prorations'`). Access unlocks on webhook. |
| **Downgrade** | Scheduled at period end. User keeps what they paid for. If child seats exceed the new tier, the *guardian chooses* which to keep — never auto-delete a child's account. |
| **Cancel** | `cancel_at_period_end: true`. Access continues to the end of the paid period. |
| **Dunning** | Smart Retries, 7-day grace with **full access**, then downgrade to `sparkle`. Data is retained, never deleted. |
| **Reactivate** | Resume within 30 days → same customer, prior data intact. |
| **Refund** | Self-serve within 14 days of first charge, no questions. |
| **Gift** | One-time payment → coupon code → redeemer's subscription. Gifter never sees recipient data. |

**Hard lifecycle guarantees (encoded in `ALWAYS_FREE`):**

- **Letters Forward already recorded are delivered forever**, at any tier, including
  after full cancellation. A lapsed card must never withhold a dead parent's message
  to their child. Delivery job checks `letters.status`, never `subscriptions.tier`.
- **Legacy Vault content is never deleted for non-payment.** On downgrade past the
  item limit, content becomes read-only, not destroyed.
- **Safety features never lapse.** Panic button, reporting, blocking, and the entire
  Guardian Console are outside billing.
- **Data export and account deletion are always free**, in every region.

---

## 3.7 Billing Portal

```ts
billing.post('/portal', requireAuth, requireAdult, async (req, res) => {
  const session = await stripe.billingPortal.sessions.create({
    customer: req.user!.stripe_customer_id!,
    return_url: `${process.env.WEB_URL}/settings/billing`,
    configuration: process.env.STRIPE_PORTAL_CONFIG_ID,
  })
  res.json({ url: session.url })
})
```

Portal configuration enables: update payment method, view invoices, switch plan
(within the tier ladder), cancel. **Cancellation flow has no retention-offer maze** —
one optional "mind telling us why?" screen, skippable, then done.

Mobile: if the subscription's `source` is `apple` or `google`, the Settings row deep-links
to the OS subscription manager instead of the Stripe portal. The API returns
`{ manageUrl, source }` so the client never guesses.

---

## 3.8 Failure Modes & Guarantees

| Risk | Mitigation |
|---|---|
| Webhook lost/delayed | Client shows W-B1 "Finishing up"; API reconciles via a 15-min sweep comparing Stripe subs to local rows |
| Duplicate webhook | `webhook_events` primary key on `event.id` |
| Out-of-order webhook | `syncSubscription` reads the full object; last write is correct regardless of order |
| Client-side entitlement spoof | All gates server-side; client state is advisory only |
| Child triggers a purchase | `requireAdult` on every billing route + hard purchase lock on child profiles |
| Refund abuse | Radar rules + one self-serve refund per customer per 12 months |
| Price change | New `lookup_key` version; existing subscribers grandfathered on their price |
| Stripe outage | Access is read from the local `entitlements` cache, which never fails closed for existing subscribers |
| **Cross-product event leak** | §3.2 Layer 3 ownership gate runs before any write; unattributable events fail closed and alert |
| **Cross-product customer collision** | §3.2 Layer 2 — separate Customer per product; no unscoped `byStripeCustomer()` exists |
| **Come Up grants on a BB payment** | BB never writes `metadata.userId`/`type`; Come Up gate added as a prerequisite ticket |
| **BB key leak exposes game data** | §3.2 Layer 4 — restricted key, no Connect/Payouts/account scope |
| **Account-level risk from the game** | Monitored: dispute rate and Radar blocks are account-wide. Migration path to a second account under the same login is kept open by Layer 1 namespacing. |

---

*Continue to `04-ai-tryon.md`.*
