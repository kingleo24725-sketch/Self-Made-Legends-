'use strict';

// Ops: the alarms that tell the owner when something is wrong before a
// player does, and the nightly money reconciliation against Stripe.
//
// Alerts land in ops_alerts, in the owner's inbox (OWNER_USER_ID), and at
// ALERT_WEBHOOK_URL as a JSON POST (Slack, Discord, an SMS gateway, anything).

class Ops {
  constructor(db, { engine, money, stripe, now, env } = {}) {
    this.db = db; this.engine = engine; this.money = money; this.stripe = stripe || null;
    this.now = now || (() => Date.now()); this.env = env || process.env;
    this.webhook = this.env.ALERT_WEBHOOK_URL || null;
    this.owner = this.env.OWNER_USER_ID || null;
    this.post = null; // test hook: async (url, payload)
  }

  logError(source, err) {
    this.db.prepare('INSERT INTO ops_errors (source, message, created_at) VALUES (?, ?, ?)').run(String(source).slice(0, 60), String(err && err.message ? err.message : err).slice(0, 500), this.now());
    this.db.prepare('DELETE FROM ops_errors WHERE created_at < ?').run(this.now() - 7 * 86_400_000);
  }

  async alert(kind, message, { severity = 'warn', data = null, dedupeMs = 6 * 3600_000 } = {}) {
    const recent = this.db.prepare('SELECT 1 FROM ops_alerts WHERE kind = ? AND resolved = 0 AND created_at > ?').get(kind, this.now() - dedupeMs);
    if (recent) return null;
    const r = this.db.prepare('INSERT INTO ops_alerts (kind, severity, message, data, created_at) VALUES (?, ?, ?, ?, ?)').run(kind, severity, message, data ? JSON.stringify(data) : null, this.now());
    if (this.owner && this.engine) { try { this.engine.notify(this.owner, 'ops', `[${severity}] ${kind}`, message); } catch (_) {} }
    if (this.webhook) {
      const payload = { text: `Legends Only [${severity}] ${kind}: ${message}`, kind, severity, message, data };
      try { if (this.post) await this.post(this.webhook, payload); else await fetch(this.webhook, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); } catch (e) { this.logError('alert-webhook', e); }
    }
    return r.lastInsertRowid;
  }
  resolve(id) { this.db.prepare('UPDATE ops_alerts SET resolved = 1 WHERE id = ?').run(id); }
  alerts(limit = 50) { return this.db.prepare('SELECT * FROM ops_alerts ORDER BY created_at DESC LIMIT ?').all(limit).map(a => ({ id: a.id, kind: a.kind, severity: a.severity, message: a.message, data: a.data ? JSON.parse(a.data) : null, resolved: !!a.resolved, at: a.created_at })); }

  // ── Health checks ────────────────────────────────────────────────────────
  health() {
    const now = this.now();
    const todayUTC = new Date(now).toISOString().slice(0, 10);
    const active = this.db.prepare('SELECT * FROM profiles WHERE active = 1').all();
    // Plans late: players past their 4am window with no plan for their local day.
    let late = 0;
    for (const p of active) {
      const prof = this.engine._rowToProfile(p);
      const local = this.engine.localDateKey(prof);
      if (this.engine.localHour(prof) >= 6 && !this.db.prepare('SELECT 1 FROM plans WHERE user_id = ? AND date = ?').get(prof.userId, local)) late++;
    }
    const errors1h = this.db.prepare('SELECT COUNT(*) AS c FROM ops_errors WHERE created_at > ?').get(now - 3600_000).c;
    const backlog = this.db.prepare("SELECT COUNT(*) AS c FROM tasks WHERE status = 'done' AND approval = 'pending' AND completed_at < ?").get(now - 2 * 3600_000).c;
    const openLive = this.db.prepare("SELECT COUNT(*) AS c FROM live_rooms WHERE status = 'live' AND started_at < ?").get(now - 12 * 3600_000).c;
    const owed = this.db.prepare('SELECT COALESCE(SUM(payout_balance_cents),0) AS b FROM users').get().b;
    const lastTick = this.db.prepare("SELECT value FROM settings WHERE key = 'ops.lastTick'").get();
    const tickAge = lastTick ? now - Number(lastTick.value) : null;
    return { at: now, todayUTC, activePlayers: active.length, plansLate: late, errorsLastHour: errors1h, approvalsBacklog: backlog, staleLives: openLive, owedToLegendsCents: owed, schedulerAgeMs: tickAge, crewOnline: !!(this.engine.crew && this.engine.crew.online), stripe: !!this.stripe, ok: late === 0 && errors1h < 20 && backlog < 50 && (tickAge == null || tickAge < 15 * 60_000) };
  }

  /** Runs with the scheduler: raise alarms, clear stale lives, mark the tick. */
  async check() {
    this.db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('ops.lastTick', ?)").run(String(this.now()));
    const h = this.health();
    if (h.plansLate > 0) await this.alert('plans-late', `${h.plansLate} player${h.plansLate === 1 ? '' : 's'} past 6am local with no plan. Check the crew and the API key.`, { severity: 'error', data: { plansLate: h.plansLate } });
    if (h.errorsLastHour >= 20) await this.alert('error-spike', `${h.errorsLastHour} errors in the last hour.`, { severity: 'error', data: { errors: h.errorsLastHour } });
    if (h.approvalsBacklog >= 50) await this.alert('approvals-backlog', `${h.approvalsBacklog} plays waiting on approval for over two hours.`, { data: { backlog: h.approvalsBacklog } });
    if (h.owedToLegendsCents > 100_000) await this.alert('payouts-owed', `$${(h.owedToLegendsCents / 100).toFixed(2)} owed to Legends in payout balances. Pay out or connect Stripe.`, { dedupeMs: 24 * 3600_000, data: { owedCents: h.owedToLegendsCents } });
    if (h.staleLives) { this.db.prepare("UPDATE live_rooms SET status = 'ended', ended_at = ? WHERE status = 'live' AND started_at < ?").run(this.now(), this.now() - 12 * 3600_000); }
    return h;
  }

  // ── Money reconciliation ─────────────────────────────────────────────────
  /**
   * Compare what the ledger says came in on a day with what Stripe says it
   * collected. Without Stripe, check the ledger against itself: paid tips and
   * mentor fees must equal what is owed plus what was paid out.
   */
  async reconcile(day) {
    const start = Date.parse(day + 'T00:00:00Z'), end = start + 86_400_000;
    const ledger = this.db.prepare("SELECT COALESCE(SUM(gross_cents),0) AS g FROM ledger WHERE status = 'paid' AND gross_cents > 0 AND kind IN ('tip','subscription','bracket_entry','sponsorship','posting','resume_view','sponsor_tile') AND created_at >= ? AND created_at < ?").get(start, end).g;
    let stripeCents = null, notes = '';
    if (this.stripe) {
      try {
        let sum = 0, starting_after;
        do {
          const page = await this.stripe.balanceTransactions.list({ limit: 100, created: { gte: Math.floor(start / 1000), lt: Math.floor(end / 1000) }, ...(starting_after ? { starting_after } : {}) });
          for (const t of page.data) if (['charge', 'payment'].includes(t.type)) sum += t.amount;
          starting_after = page.has_more ? page.data[page.data.length - 1].id : null;
        } while (starting_after);
        stripeCents = sum;
      } catch (e) { notes = 'Stripe unreachable: ' + e.message; }
    } else {
      const inflow = this.db.prepare("SELECT COALESCE(SUM(net_cents),0) AS n FROM ledger WHERE status = 'paid' AND kind IN ('tip','mentor','bracket_prize','prize') AND created_at < ?").get(end).n;
      const outflow = this.db.prepare("SELECT COALESCE(SUM(amount_cents),0) AS n FROM payouts WHERE created_at < ?").get(end).n;
      const owed = this.db.prepare('SELECT COALESCE(SUM(payout_balance_cents),0) AS b FROM users').get().b;
      const connected = this.db.prepare("SELECT COALESCE(SUM(t.net_cents),0) AS n FROM tips t JOIN users u ON u.id = t.to_user_id WHERE t.status = 'paid' AND u.stripe_account_id IS NOT NULL AND t.created_at < ?").get(end).n;
      const expectedOwed = inflow - outflow - connected;
      notes = `internal: inflow ${inflow} - payouts ${outflow} - direct ${connected} = ${expectedOwed}, balances ${owed}`;
      stripeCents = null;
      const diff = expectedOwed - owed;
      const ok = Math.abs(diff) < 1;
      this.db.prepare('INSERT INTO reconciliations (day, ledger_cents, stripe_cents, diff_cents, notes, ok, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(day, ledger, null, diff, notes, ok ? 1 : 0, this.now());
      if (!ok) await this.alert('reconcile', `Ledger and payout balances disagree by $${(Math.abs(diff) / 100).toFixed(2)} on ${day}.`, { severity: 'error', data: { day, diff } });
      return { day, ledgerCents: ledger, stripeCents: null, diffCents: diff, ok, notes };
    }
    const diff = stripeCents == null ? 0 : stripeCents - ledger;
    const ok = stripeCents != null && Math.abs(diff) < 1;
    this.db.prepare('INSERT INTO reconciliations (day, ledger_cents, stripe_cents, diff_cents, notes, ok, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(day, ledger, stripeCents, diff, notes, ok ? 1 : 0, this.now());
    if (!ok) await this.alert('reconcile', stripeCents == null ? `Could not reconcile ${day}: ${notes}` : `Stripe collected $${(stripeCents / 100).toFixed(2)} but the ledger says $${(ledger / 100).toFixed(2)} on ${day}.`, { severity: 'error', data: { day, ledger, stripeCents } });
    return { day, ledgerCents: ledger, stripeCents, diffCents: diff, ok, notes };
  }
  reconciliations(limit = 30) { return this.db.prepare('SELECT * FROM reconciliations ORDER BY created_at DESC LIMIT ?').all(limit); }
}

module.exports = Ops;
