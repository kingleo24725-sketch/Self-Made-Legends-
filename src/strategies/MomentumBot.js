class MomentumBot {
  constructor() {
    this.name = "Momentum Bot";
  }

  analyze(currentPrice, priceHistory, volumeHistory) {
    const priceChange = this.calculatePriceChange(priceHistory);
    const volumeChange = this.calculateVolumeChange(volumeHistory);
    const momentum = this.calculateMomentum(priceHistory);
    const rateOfChange = this.calculateROC(priceHistory);

    return this.generateSignal({
      priceChange,
      volumeChange,
      momentum,
      rateOfChange,
      currentPrice,
    });
  }

  calculatePriceChange(prices, period = 5) {
    if (prices.length < period) return 0;
    const recentPrices = prices.slice(-period);
    const change = ((recentPrices[recentPrices.length - 1] - recentPrices[0]) / recentPrices[0]) * 100;
    return change;
  }

  calculateVolumeChange(volumes, period = 5) {
    if (volumes.length < period) return 0;
    const recentVolumes = volumes.slice(-period);
    const avgVolume = recentVolumes.reduce((a, b) => a + b, 0) / period;
    const prevVolumes = volumes.slice(-period * 2, -period);
    const prevAvgVolume = prevVolumes.reduce((a, b) => a + b, 0) / period;

    return prevAvgVolume === 0 ? 0 : ((avgVolume - prevAvgVolume) / prevAvgVolume) * 100;
  }

  calculateMomentum(prices, period = 10) {
    if (prices.length < period + 1) return 0;
    return prices[prices.length - 1] - prices[prices.length - period - 1];
  }

  calculateROC(prices, period = 12) {
    if (prices.length < period + 1) return 0;
    const currentPrice = prices[prices.length - 1];
    const pastPrice = prices[prices.length - period - 1];
    return ((currentPrice - pastPrice) / pastPrice) * 100;
  }

  generateSignal(data) {
    let score = 50;

    if (data.priceChange > 2) score += 15;
    else if (data.priceChange < -2) score -= 15;

    if (data.volumeChange > 20) score += 10;
    else if (data.volumeChange < -20) score -= 10;

    if (data.momentum > 0) score += 10;
    else score -= 10;

    if (data.rateOfChange > 5) score += 15;
    else if (data.rateOfChange < -5) score -= 15;

    return {
      action: score > 60 ? "BUY" : score < 40 ? "SELL" : "HOLD",
      confidence: Math.abs(score - 50) / 50,
      score,
      metrics: {
        priceChange: data.priceChange,
        momentum: data.momentum,
      },
    };
  }
}

module.exports = MomentumBot;
