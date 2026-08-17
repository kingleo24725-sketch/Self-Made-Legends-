'use strict';

const db          = require('../database/db');
const priceEngine = require('../market/PriceEngine');

const BOT_ID    = 'sml-bot';
const BOT_EMAIL = 'bot@sml.gg';
const BOT_NAME  = 'SML Bot (AI)';
const STARTING_CASH = 1000;

class BotTrader {
  constructor() {
    this._interval       = null;
    this._updateLeaderboard = null; // injected
  }

  // Call once after DB is ready
  async init(updateLeaderboardFn) {
    this._updateLeaderboard = updateLeaderboardFn;

    // Ensure bot account exists
    const existing = await db.get('SELECT user_id FROM accounts WHERE user_id = ?', [BOT_ID]);
    if (!existing) {
      await db.run(
        `INSERT OR IGNORE INTO accounts (email, user_id, full_name, tier, is_bot, gender, created_at)
         VALUES (?, ?, ?, 'free', 1, 'male', ?)`,
        [BOT_EMAIL, BOT_ID, BOT_NAME, Date.now()]
      );
    } else {
      // Ensure is_bot flag and gender are set on existing bot row
      await db.run('UPDATE accounts SET is_bot = 1, gender = COALESCE(NULLIF(gender,""), "male") WHERE user_id = ?', [BOT_ID]);
    }

    // Ensure bot portfolio
    await db.run(
      `INSERT OR IGNORE INTO user_portfolios (user_id, cash_balance, total_invested, updated_at)
       VALUES (?, ?, ?, ?)`,
      [BOT_ID, STARTING_CASH, STARTING_CASH, Date.now()]
    );

    // Start trading loop — every 90 seconds
    this._interval = setInterval(() => this._trade(), 90_000);
    console.log('🤖 SML Bot trader initialised');
  }

  stop() {
    if (this._interval) { clearInterval(this._interval); this._interval = null; }
  }

  async _trade() {
    try {
      const symbols  = priceEngine.getSymbols();
      const portfolio = await db.get('SELECT cash_balance FROM user_portfolios WHERE user_id = ?', [BOT_ID]);
      if (!portfolio) return;

      // Momentum signal: compare current price vs 5-bar SMA
      const candidates = [];
      for (const sym of symbols) {
        const hist = priceEngine.getHistory(sym);
        if (hist.length < 3) continue;
        const current = hist[hist.length - 1];
        const sma     = hist.slice(-5).reduce((a, b) => a + b, 0) / Math.min(hist.length, 5);
        const signal  = current > sma ? 'BUY' : 'SELL';
        candidates.push({ sym, current, signal, strength: Math.abs(current - sma) / sma });
      }
      if (!candidates.length) return;

      // Pick strongest signal
      candidates.sort((a, b) => b.strength - a.strength);
      const top = candidates[0];

      if (top.signal === 'BUY' && portfolio.cash_balance >= top.current) {
        const qty   = Math.min(3, Math.floor(portfolio.cash_balance / top.current));
        if (qty < 1) return;
        const cost  = qty * top.current;
        const now   = Date.now();

        await db.run(
          `UPDATE user_portfolios SET cash_balance = cash_balance - ?, updated_at = ? WHERE user_id = ?`,
          [cost, now, BOT_ID]
        );
        await db.run(
          `INSERT INTO holdings (user_id, symbol, quantity, avg_price)
           VALUES (?, ?, ?, ?)
           ON CONFLICT(user_id, symbol) DO UPDATE SET
             avg_price = (avg_price * quantity + ? * ?) / (quantity + ?),
             quantity  = quantity + ?`,
          [BOT_ID, top.sym, qty, top.current, top.current, qty, qty, qty]
        );
        await db.run(
          `INSERT INTO trades (user_id, symbol, type, quantity, price, source, timestamp)
           VALUES (?, ?, 'BUY', ?, ?, 'bot', ?)`,
          [BOT_ID, top.sym, qty, top.current, now]
        );
      } else if (top.signal === 'SELL') {
        const holding = await db.get(
          'SELECT quantity FROM holdings WHERE user_id = ? AND symbol = ?',
          [BOT_ID, top.sym]
        );
        if (!holding || holding.quantity < 1) return;
        const qty      = Math.min(3, Math.floor(holding.quantity));
        const proceeds = qty * top.current;
        const now      = Date.now();

        await db.run(
          `UPDATE user_portfolios SET cash_balance = cash_balance + ?, updated_at = ? WHERE user_id = ?`,
          [proceeds, now, BOT_ID]
        );
        const newQty = holding.quantity - qty;
        if (newQty <= 0) {
          await db.run('DELETE FROM holdings WHERE user_id = ? AND symbol = ?', [BOT_ID, top.sym]);
        } else {
          await db.run('UPDATE holdings SET quantity = ? WHERE user_id = ? AND symbol = ?', [newQty, BOT_ID, top.sym]);
        }
        await db.run(
          `INSERT INTO trades (user_id, symbol, type, quantity, price, source, timestamp)
           VALUES (?, ?, 'SELL', ?, ?, 'bot', ?)`,
          [BOT_ID, top.sym, qty, top.current, now]
        );
      }

      // Refresh bot leaderboard score
      if (this._updateLeaderboard) await this._updateLeaderboard(BOT_ID);
    } catch (e) {
      console.error('[BotTrader] trade error:', e.message);
    }
  }
}

module.exports = new BotTrader();
module.exports.BOT_ID = BOT_ID;
