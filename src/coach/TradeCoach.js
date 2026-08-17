'use strict';

const db          = require('../database/db');
const priceEngine = require('../market/PriceEngine');

// Tips rotated every 10 minutes to all online users
const TIPS = [
  "📚 Diversify! Spreading across 3–5 stocks reduces risk.",
  "⏱️ Patience pays — don't panic-sell on small dips.",
  "📊 Buy when others are fearful, sell when they're greedy.",
  "💡 Set a mental stop-loss at -8% to protect your capital.",
  "🔥 Momentum stocks tend to keep moving in the same direction short-term.",
  "🏆 The top traders on the leaderboard average 3–5 trades per day.",
  "💰 Take partial profits — sell half when up 15%, ride the rest.",
  "📉 A stock down 3% in one session can be an entry opportunity.",
];

let _tipIdx = 0;

class TradeCoach {
  constructor() {
    this._io         = null;
    this._intervals  = [];
  }

  // Must be called after Socket.io is initialised
  init(io) {
    this._io = io;

    // Analyse all portfolios every 60 seconds
    const analysisId = setInterval(() => this._analyseAll(), 60_000);
    // Rotating tip broadcast every 10 minutes
    const tipId      = setInterval(() => this._broadcastTip(), 600_000);

    this._intervals.push(analysisId, tipId);
  }

  stop() {
    this._intervals.forEach(clearInterval);
    this._intervals = [];
  }

  // Called by the trade routes so coach can react in near-real-time
  async onTrade(userId, trade) {
    // Small delay so the DB write settles first
    setTimeout(() => this._analyseUser(userId), 2000);
  }

  async _analyseAll() {
    try {
      const rows = await db.all('SELECT DISTINCT user_id FROM holdings WHERE quantity > 0');
      for (const { user_id } of rows) {
        await this._analyseUser(user_id);
      }
    } catch (e) {
      console.error('[TradeCoach] analyseAll error:', e.message);
    }
  }

  async _analyseUser(userId) {
    try {
      const holdings = await db.all(
        'SELECT symbol, quantity, avg_price FROM holdings WHERE user_id = ? AND quantity > 0',
        [userId]
      );
      if (!holdings.length) return;

      for (const h of holdings) {
        const current = priceEngine.getPrice(h.symbol);
        if (!current) continue;
        const changePct = ((current - h.avg_price) / h.avg_price) * 100;

        if (changePct <= -8) {
          this._suggest(userId, {
            type: 'cut_loss',
            symbol: h.symbol,
            message: `⚠️ ${h.symbol} is down ${Math.abs(changePct).toFixed(1)}% from your buy price of $${h.avg_price.toFixed(2)}. Want me to sell it to cut your losses?`,
            action: 'sell',
            quantity: h.quantity,
          });
        } else if (changePct >= 15) {
          this._suggest(userId, {
            type: 'take_profit',
            symbol: h.symbol,
            message: `💰 ${h.symbol} is up ${changePct.toFixed(1)}%! Lock in profits? I can sell your ${h.quantity} share${h.quantity !== 1 ? 's' : ''} now.`,
            action: 'sell',
            quantity: h.quantity,
          });
        }
      }

      // Entry opportunity — stocks dipping that user doesn't own
      const owned = new Set(holdings.map(h => h.symbol));
      const prices = priceEngine.getAllPrices();
      for (const [sym, data] of Object.entries(prices)) {
        if (owned.has(sym)) continue;
        if (data.change <= -3) {
          const qty = Math.max(1, Math.floor(100 / data.price)); // ~$100 worth
          this._suggest(userId, {
            type: 'entry',
            symbol: sym,
            message: `📉 ${sym} just dipped ${Math.abs(data.change).toFixed(1)}% — possible entry. Buy ${qty} share${qty !== 1 ? 's' : ''} at $${data.price.toFixed(2)}?`,
            action: 'buy',
            quantity: qty,
          });
          break; // one entry tip per cycle
        }
      }
    } catch (e) {
      console.error(`[TradeCoach] analyseUser ${userId} error:`, e.message);
    }
  }

  _suggest(userId, payload) {
    if (!this._io) return;
    this._io.to(`user:${userId}`).emit('coach_suggestion', {
      ...payload,
      disclaimer: '📋 For entertainment only — not real financial advice.',
    });
  }

  _broadcastTip() {
    if (!this._io) return;
    const tip = TIPS[_tipIdx % TIPS.length];
    _tipIdx++;
    this._io.emit('coach_tip', { message: tip });
  }
}

module.exports = new TradeCoach();
