class CryptoBot {
  constructor() {
    this.name = "Crypto Bot";
  }

  analyze(priceData, volumeData) {
    const priceChange = this.calculatePriceChange(priceData);
    const volumeTrend = this.calculateVolumeTrend(volumeData);
    const volatility = this.calculateVolatility(priceData);
    const rsi = this.calculateRSI(priceData);

    return this.generateSignal({
      priceChange,
      volumeTrend,
      volatility,
      rsi,
    });
  }

  calculatePriceChange(prices, period = 24) {
    if (prices.length < period) return 0;
    const recentPrices = prices.slice(-period);
    return ((recentPrices[recentPrices.length - 1] - recentPrices[0]) / recentPrices[0]) * 100;
  }

  calculateVolumeTrend(volumes, period = 24) {
    if (volumes.length < period) return 0;
    const recent = volumes.slice(-period);
    const avg = recent.reduce((a, b) => a + b) / period;
    const current = recent[recent.length - 1];
    return ((current - avg) / avg) * 100;
  }

  calculateVolatility(prices, period = 20) {
    if (prices.length < period) return 0;
    const recentPrices = prices.slice(-period);
    const mean = recentPrices.reduce((a, b) => a + b) / period;
    const variance = recentPrices.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / period;
    return Math.sqrt(variance) / mean * 100;
  }

  calculateRSI(prices, period = 14) {
    if (prices.length < period + 1) return 50;

    let gains = 0, losses = 0;
    for (let i = 1; i <= period; i++) {
      const change = prices[prices.length - i] - prices[prices.length - i - 1];
      if (change > 0) gains += change;
      else losses += Math.abs(change);
    }

    const avgGain = gains / period;
    const avgLoss = losses / period;
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  generateSignal(data) {
    let score = 50;

    if (data.priceChange > 3) score += 15;
    else if (data.priceChange < -3) score -= 15;

    if (data.volumeTrend > 20) score += 15;
    else if (data.volumeTrend < -20) score -= 10;

    if (data.volatility < 5) score += 5;
    else if (data.volatility > 15) score -= 10;

    if (data.rsi < 30) score += 15;
    else if (data.rsi > 70) score -= 15;

    return {
      action: score > 60 ? "BUY" : score < 40 ? "SELL" : "HOLD",
      confidence: Math.abs(score - 50) / 50,
      score,
      volatility: data.volatility,
    };
  }
}

module.exports = CryptoBot;
