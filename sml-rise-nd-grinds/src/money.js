'use strict';

// Money that moves through Self-Made Legends, and the platform's cut of it.
//
// Every dollar that touches the app goes through here and lands in the ledger
// with the fee split out, so the revenue dashboard is always the truth:
//   - subscriptions (Free / Pro / Boss)              -> 100% platform
//   - tips from fans to Legends                     -> TIP_FEE_PCT
//   - mentor questions                              -> MENTOR_FEE_PCT
//   - bracket entries and sponsored prize pools     -> POOL_FEE_PCT
//   - the Legend Fee on receipt-verified earnings   -> SUCCESS_FEE_PCT, billed monthly through Stripe
//
// The success fee is the "fee from all money made through the app". It can only
// be charged on earnings we can prove (receipt-verified) and only to players
// with a card on file, so it is billed as a monthly Stripe usage invoice; the
// ledger records it either way so nothing is lost when billing turns on later.

const DEFAULT_FEES = {
  TIP_FEE_PCT: 15,
  MENTOR_FEE_PCT: 20,
  POOL_FEE_PCT: 10,
  SUCCESS_FEE_PCT: 5,
  SUCCESS_FEE_MIN_CENTS: 100,      // do not invoice under $1
  TIP_MIN_CENTS: 100,
  TIP_MAX_CENTS: 50_000,
};

class Money {
  constructor(db, opts = {}) {
    this.db = db;
    this.now = opts.now || (() => Date.now());
    this.stripe = opts.stripe || null;
    this.env = opts.env || process.env;
    this.defaultTier = opts.defaultTier || null;
    this.fees = { ...DEFAULT_FEES };
    for (const k of Object.keys(DEFAULT_FEES)) {
      const v = this.env[k]; if (v !== undefined && v !== '' && Number.isFinite(Number(v))) this.fees[k] = Number(v);
      const s = this.db.prepare('SELECT value FROM settings WHERE key = ?').get('fee.' + k); if (s) this.fees[k] = Number(s.value);
    }
  }

  setFee(key, pct) {
    if (!(key in DEFAULT_FEES)) throw new Error('Unknown fee');
    const v = Math.max(0, Math.min(key.endsWith('CENTS') ? 10_000_000 : 100, Number(pct) || 0));
    this.fees[key] = v;
    this.db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('fee.' + key, String(v));
    return this.fees;
  }

  /** Members pay less: Veteran and Hall of Fame keep more of every tip and pay a smaller (or no) Legend Fee. */
  tierFees(tier) {
    const f = { tipPct: this.fees.TIP_FEE_PCT, successPct: this.fees.SUCCESS_FEE_PCT };
    if (tier === 'veteran') { f.tipPct = Math.min(f.tipPct, 10); f.successPct = Math.min(f.successPct, 3); }
    if (tier === 'hof') { f.tipPct = Math.min(f.tipPct, 5); f.successPct = 0; }
    return f;
  }
  tierOf(userId) { const r = this.db.prepare('SELECT tier FROM users WHERE id = ?').get(userId); const t = r && r.tier; return t === 'boss' ? 'allstar' : (t && t !== 'free' ? t : (this.defaultTier || 'free')); }

  split(grossCents, pct) {
    const fee = Math.round(grossCents * pct / 100);
    return { gross: grossCents, fee, net: grossCents - fee };
  }

  record(kind, { userId = null, gross = 0, fee = 0, net = null, status = 'recorded', ref = null, note = null } = {}) {
    const r = this.db.prepare('INSERT INTO ledger (kind, user_id, gross_cents, fee_cents, net_cents, status, ref, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(kind, userId, gross, fee, net == null ? gross - fee : net, status, ref, note, this.now());
    return r.lastInsertRowid;
  }

  // ── Tips ─────────────────────────────────────────────────────────────────
  /** Create a tip. With Stripe: returns a Checkout URL; the webhook marks it paid. Without: recorded as pending. */
  async createTip(toUser, { amountCents, fromName, message, successUrl, cancelUrl }) {
    amountCents = Math.round(Number(amountCents) || 0);
    if (amountCents < this.fees.TIP_MIN_CENTS || amountCents > this.fees.TIP_MAX_CENTS) throw new Error(`Tips are $${this.fees.TIP_MIN_CENTS / 100} to $${this.fees.TIP_MAX_CENTS / 100}`);
    const { fee, net } = this.split(amountCents, this.tierFees(this.tierOf(toUser.id)).tipPct);
    const r = this.db.prepare('INSERT INTO tips (to_user_id, from_name, message, gross_cents, fee_cents, net_cents, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(toUser.id, String(fromName || 'A fan').slice(0, 40), String(message || '').slice(0, 200), amountCents, fee, net, 'pending', this.now());
    const tipId = r.lastInsertRowid;
    if (!this.stripe) return { tipId, url: null, status: 'pending', fee, net };
    const params = {
      mode: 'payment',
      line_items: [{ quantity: 1, price_data: { currency: 'usd', unit_amount: amountCents, product_data: { name: `Tip for ${toUser.displayName} on Self-Made Legends` } } }],
      metadata: { kind: 'tip', tipId: String(tipId), toUserId: toUser.id },
      success_url: successUrl, cancel_url: cancelUrl,
    };
    // Paid straight to a connected Legend, minus the platform fee; otherwise the platform holds it as payout balance.
    if (toUser.stripeAccountId) params.payment_intent_data = { application_fee_amount: fee, transfer_data: { destination: toUser.stripeAccountId } };
    const session = await this.stripe.checkout.sessions.create(params);
    this.db.prepare('UPDATE tips SET stripe_ref = ? WHERE id = ?').run(session.id, tipId);
    return { tipId, url: session.url, status: 'pending', fee, net };
  }

  /** Called from the Stripe webhook (or tests) when a tip is paid. Idempotent. */
  markTipPaid(tipId, ref = null) {
    const t = this.db.prepare('SELECT * FROM tips WHERE id = ?').get(tipId);
    if (!t || t.status === 'paid') return t;
    const u = this.db.prepare('SELECT stripe_account_id FROM users WHERE id = ?').get(t.to_user_id);
    const tx = this.db.transaction(() => {
      this.db.prepare('UPDATE tips SET status = ?, paid_at = ?, stripe_ref = COALESCE(?, stripe_ref) WHERE id = ?').run('paid', this.now(), ref, tipId);
      // Direct transfer to a connected account means the platform never holds the net; otherwise it owes the Legend.
      if (!(u && u.stripe_account_id)) this.db.prepare('UPDATE users SET payout_balance_cents = payout_balance_cents + ? WHERE id = ?').run(t.net_cents, t.to_user_id);
      this.record('tip', { userId: t.to_user_id, gross: t.gross_cents, fee: t.fee_cents, net: t.net_cents, status: 'paid', ref: ref || t.stripe_ref, note: t.from_name });
    });
    tx();
    return this.db.prepare('SELECT * FROM tips WHERE id = ?').get(tipId);
  }

  tipsFor(userId, limit = 20) {
    return this.db.prepare("SELECT id, from_name, message, gross_cents, net_cents, status, created_at FROM tips WHERE to_user_id = ? AND status = 'paid' ORDER BY created_at DESC LIMIT ?").all(userId, limit)
      .map(t => ({ id: t.id, fromName: t.from_name, message: t.message, grossCents: t.gross_cents, netCents: t.net_cents, at: t.created_at }));
  }

  // ── Payouts (what the platform owes a Legend from tips and mentoring) ────
  balance(userId) { return (this.db.prepare('SELECT payout_balance_cents AS b FROM users WHERE id = ?').get(userId) || {}).b || 0; }

  /** Start Stripe Connect Express onboarding so tips go straight to the Legend. */
  async connectAccount(user, { refreshUrl, returnUrl }) {
    if (!this.stripe) throw new Error('Payouts are not switched on yet');
    let accountId = user.stripeAccountId;
    if (!accountId) {
      const acct = await this.stripe.accounts.create({ type: 'express', email: user.email, capabilities: { transfers: { requested: true } }, business_type: 'individual' });
      accountId = acct.id;
      this.db.prepare('UPDATE users SET stripe_account_id = ? WHERE id = ?').run(accountId, user.id);
    }
    const link = await this.stripe.accountLinks.create({ account: accountId, refresh_url: refreshUrl, return_url: returnUrl, type: 'account_onboarding' });
    return { url: link.url, accountId };
  }

  /** Pay out a held balance. With Stripe and a connected account it transfers; otherwise an admin records a manual payout. */
  async payout(userId, { method = 'manual', ref = null } = {}) {
    const amount = this.balance(userId);
    if (amount <= 0) throw new Error('Nothing to pay out');
    const u = this.db.prepare('SELECT stripe_account_id FROM users WHERE id = ?').get(userId);
    let transferRef = ref;
    if (method === 'stripe') {
      if (!this.stripe || !u.stripe_account_id) throw new Error('No connected payout account');
      const t = await this.stripe.transfers.create({ amount, currency: 'usd', destination: u.stripe_account_id, metadata: { userId } });
      transferRef = t.id;
    }
    const tx = this.db.transaction(() => {
      this.db.prepare('UPDATE users SET payout_balance_cents = 0 WHERE id = ?').run(userId);
      this.db.prepare('INSERT INTO payouts (user_id, amount_cents, method, ref, created_at) VALUES (?, ?, ?, ?, ?)').run(userId, amount, method, transferRef, this.now());
      this.record('payout', { userId, gross: -amount, fee: 0, net: -amount, status: 'paid', ref: transferRef });
    });
    tx();
    return { amountCents: amount, method, ref: transferRef };
  }

  // ── Mentor questions ─────────────────────────────────────────────────────
  mentorSplit(priceCents) { return this.split(priceCents, this.fees.MENTOR_FEE_PCT); }

  // ── Pools (brackets, sponsored prizes) ───────────────────────────────────
  poolSplit(cents) { return this.split(cents, this.fees.POOL_FEE_PCT); }

  // ── Legend Fee (success fee on verified earnings) ────────────────────────
  /** What a player owes for a month of verified earnings, and whether it is billable. */
  successFeeFor(userId, month) {
    const u = this.db.prepare('SELECT success_fee_optin, stripe_customer_id, tier FROM users WHERE id = ?').get(userId);
    const r = this.db.prepare("SELECT COALESCE(SUM(verified_cents), 0) AS v FROM daily_scores WHERE user_id = ? AND substr(date, 1, 7) = ? AND closed = 1").get(userId, month);
    const pct = this.tierFees(this.tierOf(userId)).successPct;
    const fee = Math.round(r.v * pct / 100);
    return { month, verifiedCents: r.v, feeCents: fee, pct, optedIn: !!(u && u.success_fee_optin), billable: !!(u && u.stripe_customer_id) && fee >= this.fees.SUCCESS_FEE_MIN_CENTS };
  }

  /** Month-end: record the fee for every player and invoice the ones we can. Idempotent per (user, month). */
  async closeMonth(month) {
    const users = this.db.prepare('SELECT id, stripe_customer_id, success_fee_optin FROM users').all();
    const results = [];
    for (const u of users) {
      const ref = `legendfee:${u.id}:${month}`;
      if (this.db.prepare('SELECT 1 FROM ledger WHERE ref = ?').get(ref)) continue;
      const f = this.successFeeFor(u.id, month);
      if (f.feeCents <= 0 || !f.optedIn) continue;
      let status = 'recorded';
      if (f.billable && this.stripe) {
        try {
          await this.stripe.invoiceItems.create({ customer: u.stripe_customer_id, amount: f.feeCents, currency: 'usd', description: `Self-Made Legends Legend Fee, ${f.pct}% of $${(f.verifiedCents / 100).toFixed(2)} verified in ${month}` });
          const inv = await this.stripe.invoices.create({ customer: u.stripe_customer_id, auto_advance: true, collection_method: 'charge_automatically' });
          await this.stripe.invoices.finalizeInvoice(inv.id);
          status = 'invoiced';
        } catch (e) { status = 'failed:' + e.message.slice(0, 60); }
      } else if (f.billable === false) status = 'uncollectable';
      this.record('success_fee', { userId: u.id, gross: f.verifiedCents, fee: f.feeCents, net: 0, status, ref, note: `${f.pct}% of verified earnings` });
      results.push({ userId: u.id, ...f, status });
    }
    return results;
  }

  // ── Revenue dashboard ────────────────────────────────────────────────────
  revenue({ months = 6 } = {}) {
    const rows = this.db.prepare(
      `SELECT substr(datetime(created_at / 1000, 'unixepoch'), 1, 7) AS month, kind, status, COUNT(*) AS n, SUM(gross_cents) AS gross, SUM(fee_cents) AS fee
       FROM ledger GROUP BY month, kind, status ORDER BY month DESC`
    ).all();
    const byMonth = {};
    for (const r of rows) {
      const m = byMonth[r.month] || (byMonth[r.month] = { month: r.month, platformCents: 0, grossCents: 0, lines: [] });
      const collected = ['paid', 'invoiced'].includes(r.status);
      m.lines.push({ kind: r.kind, status: r.status, count: r.n, grossCents: r.gross, feeCents: r.fee, collected });
      if (collected) m.platformCents += r.kind === 'subscription' ? r.gross : r.fee;
      m.grossCents += Math.max(0, r.gross);
    }
    const list = Object.values(byMonth).sort((a, b) => b.month.localeCompare(a.month)).slice(0, months);
    const owed = this.db.prepare('SELECT COALESCE(SUM(payout_balance_cents), 0) AS b FROM users').get().b;
    const players = this.db.prepare('SELECT COUNT(*) AS c FROM users').get().c;
    const paying = this.db.prepare("SELECT COUNT(*) AS c FROM users WHERE tier IN ('pro','allstar','veteran','hof','boss')").get().c;
    const verified = this.db.prepare('SELECT COALESCE(SUM(verified_cents), 0) AS v, COALESCE(SUM(earnings_cents), 0) AS e FROM daily_scores').get();
    return { fees: this.fees, months: list, owedToLegendsCents: owed, players, paying, verifiedCents: verified.v, loggedCents: verified.e };
  }
}

module.exports = Money;
module.exports.DEFAULT_FEES = DEFAULT_FEES;
