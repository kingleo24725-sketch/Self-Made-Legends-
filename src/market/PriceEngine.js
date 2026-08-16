'use strict';

// Seed prices roughly matching real-world mid-2025 levels
const SEED_PRICES = {
  AAPL:  189.50, MSFT:  415.20, GOOGL: 178.40, TSLA:  248.30, AMZN:  192.60,
  META:  512.80, NVDA:  875.40, AMD:   168.90, NFLX:  638.20, JPM:   208.50,
  V:     278.30, MA:    468.70, DIS:    95.40, PYPL:   66.80, UBER:   74.20,
  LYFT:   14.80, COIN:  228.60, HOOD:   22.40, GME:    26.50, AMC:     5.80,
};

const SYMBOLS = Object.keys(SEED_PRICES);

class PriceEngine {
  constructor() {
    this._prices    = {};   // symbol -> { price, prev, change }
    this._history   = {};   // symbol -> last 10 prices (for momentum)
    this._listeners = [];
    this._interval  = null;

    for (const [sym, price] of Object.entries(SEED_PRICES)) {
      this._prices[sym]  = { price, prev: price, change: 0 };
      this._history[sym] = [price];
    }
  }

  start() {
    // Tick every 30 seconds — ±0.5% random walk with slight upward bias
    this._interval = setInterval(() => this._tick(), 30_000);
  }

  stop() {
    if (this._interval) { clearInterval(this._interval); this._interval = null; }
  }

  _tick() {
    const updates = {};
    for (const sym of SYMBOLS) {
      const prev  = this._prices[sym].price;
      const drift = (Math.random() * 0.012) - 0.005;  // -0.5% to +0.7%
      const next  = parseFloat((prev * (1 + drift)).toFixed(2));
      const change = parseFloat((((next - prev) / prev) * 100).toFixed(3));
      this._prices[sym] = { price: next, prev, change };

      const hist = this._history[sym];
      hist.push(next);
      if (hist.length > 10) hist.shift();

      updates[sym] = { price: next, change };
    }
    for (const cb of this._listeners) cb(updates);
  }

  getPrice(symbol) {
    return this._prices[symbol] ? this._prices[symbol].price : null;
  }

  getAllPrices() {
    const result = {};
    for (const [sym, data] of Object.entries(this._prices)) {
      result[sym] = { price: data.price, change: data.change };
    }
    return result;
  }

  getHistory(symbol) {
    return this._history[symbol] || [];
  }

  getSymbols() { return SYMBOLS; }

  // Register a callback fired on every tick with { symbol: { price, change } }
  subscribe(cb) { this._listeners.push(cb); }
}

module.exports = new PriceEngine();
