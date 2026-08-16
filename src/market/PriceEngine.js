'use strict';

const SEED_PRICES = {
  // Stocks
  AAPL:  189.50, MSFT:  415.20, GOOGL: 178.40, TSLA:  248.30, AMZN:  192.60,
  META:  512.80, NVDA:  875.40, AMD:   168.90, NFLX:  638.20, JPM:   208.50,
  V:     278.30, MA:    468.70, DIS:    95.40, PYPL:   66.80, UBER:   74.20,
  LYFT:   14.80, COIN:  228.60, HOOD:   22.40, GME:    26.50, AMC:     5.80,
  // Crypto (approximate mid-2025 USD prices)
  BTC:  97000.00, ETH:   3400.00, SOL:   190.00, BNB:   620.00, ADA:     0.88,
  DOGE:     0.17, XRP:     2.40, AVAX:   35.00, MATIC:   0.47, DOT:     6.50,
  LINK:    14.50, LTC:   105.00, ATOM:    6.20, BCH:   430.00, NEAR:    5.80,
};

const CRYPTO_SET = new Set([
  'BTC','ETH','SOL','BNB','ADA','DOGE','XRP','AVAX','MATIC','DOT','LINK','LTC','ATOM','BCH','NEAR',
]);

const SYMBOLS = Object.keys(SEED_PRICES);

function _round(val, sym) {
  if (val < 0.001) return parseFloat(val.toFixed(8));
  if (val < 1)     return parseFloat(val.toFixed(6));
  if (val >= 10000) return parseFloat(val.toFixed(0));
  return parseFloat(val.toFixed(2));
}

class PriceEngine {
  constructor() {
    this._prices    = {};
    this._history   = {};
    this._listeners = [];
    this._interval  = null;

    for (const [sym, price] of Object.entries(SEED_PRICES)) {
      this._prices[sym]  = { price, prev: price, change: 0 };
      this._history[sym] = [price];
    }
  }

  start() {
    this._interval = setInterval(() => this._tick(), 30_000);
  }

  stop() {
    if (this._interval) { clearInterval(this._interval); this._interval = null; }
  }

  // Inject a real-world price (e.g. from CoinGecko) to keep the random walk grounded
  updatePrice(symbol, realPrice) {
    if (!this._prices[symbol] || !realPrice || realPrice <= 0) return;
    const prev   = this._prices[symbol].price;
    const change = prev > 0 ? parseFloat((((realPrice - prev) / prev) * 100).toFixed(3)) : 0;
    this._prices[symbol] = { price: _round(realPrice, symbol), prev, change };
    const hist = this._history[symbol];
    hist.push(realPrice);
    if (hist.length > 10) hist.shift();
  }

  _tick() {
    const updates = {};
    for (const sym of SYMBOLS) {
      const prev    = this._prices[sym].price;
      const isCrypto = CRYPTO_SET.has(sym);
      // Crypto: ±1.8% per tick  |  Stock: ±0.5% per tick (slight upward bias on both)
      const spread  = isCrypto ? 0.036 : 0.012;
      const bias    = isCrypto ? -0.018 : -0.005;
      const drift   = (Math.random() * spread) + bias;
      const next    = _round(prev * (1 + drift), sym);
      const change  = prev > 0 ? parseFloat((((next - prev) / prev) * 100).toFixed(3)) : 0;
      this._prices[sym] = { price: next, prev, change };

      const hist = this._history[sym];
      hist.push(next);
      if (hist.length > 10) hist.shift();

      updates[sym] = { price: next, change, type: isCrypto ? 'crypto' : 'stock' };
    }
    for (const cb of this._listeners) cb(updates);
  }

  isCrypto(symbol)    { return CRYPTO_SET.has(symbol); }
  getPrice(symbol)    { return this._prices[symbol] ? this._prices[symbol].price : null; }
  getHistory(symbol)  { return this._history[symbol] || []; }
  getSymbols()        { return SYMBOLS; }
  getCryptoSymbols()  { return [...CRYPTO_SET]; }

  getAllPrices() {
    const result = {};
    for (const [sym, data] of Object.entries(this._prices)) {
      result[sym] = { price: data.price, change: data.change, type: CRYPTO_SET.has(sym) ? 'crypto' : 'stock' };
    }
    return result;
  }

  subscribe(cb) { this._listeners.push(cb); }
}

module.exports = new PriceEngine();
module.exports.CRYPTO_SET = CRYPTO_SET;
