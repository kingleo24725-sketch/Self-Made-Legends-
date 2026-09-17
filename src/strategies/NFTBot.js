class NFTBot {
  constructor() {
    this.name = "NFT Bot";
  }

  analyze(nftData) {
    const floorPriceTrend = this.calculateFloorPriceTrend(nftData);
    const volumeMetrics = this.calculateVolumeMetrics(nftData);
    const rarity = nftData.rarity || 50;
    const holders = nftData.uniqueHolders || 0;
    const tradingActivity = this.calculateTradingActivity(nftData);

    return this.generateSignal({
      floorPriceTrend,
      volumeMetrics,
      rarity,
      holders,
      tradingActivity,
    });
  }

  calculateFloorPriceTrend(nftData) {
    if (!nftData.priceHistory || nftData.priceHistory.length < 7) return 0;

    const prices = nftData.priceHistory.slice(-7);
    const change = ((prices[prices.length - 1] - prices[0]) / prices[0]) * 100;
    return change;
  }

  calculateVolumeMetrics(nftData) {
    if (!nftData.trades || nftData.trades.length === 0) return 0;

    const recentTrades = nftData.trades.filter(
      t => Date.now() - new Date(t.timestamp).getTime() < 24 * 60 * 60 * 1000
    );

    return {
      dailyVolume: recentTrades.length,
      avgPrice: recentTrades.length > 0
        ? recentTrades.reduce((sum, t) => sum + t.price, 0) / recentTrades.length
        : 0,
    };
  }

  calculateTradingActivity(nftData) {
    const holders = nftData.uniqueHolders || 1;
    const totalSupply = nftData.totalSupply || 10000;
    const circulation = holders / totalSupply;

    return {
      holderConcentration: holders / totalSupply,
      distribution: circulation > 0.5 ? 'wide' : 'concentrated',
    };
  }

  generateSignal(data) {
    let score = 50;

    if (data.floorPriceTrend > 5) score += 20;
    else if (data.floorPriceTrend < -10) score -= 20;

    if (data.volumeMetrics.dailyVolume > 10) score += 15;
    else if (data.volumeMetrics.dailyVolume < 2) score -= 10;

    if (data.rarity > 70) score += 15;
    else if (data.rarity < 30) score -= 10;

    if (data.tradingActivity.distribution === 'wide') score += 10;
    else score -= 5;

    if (data.holders > 100) score += 10;

    return {
      action: score > 60 ? "BUY" : score < 40 ? "SELL" : "HOLD",
      confidence: Math.abs(score - 50) / 50,
      score,
      metrics: {
        floorPrice: data.volumeMetrics.avgPrice,
        rarity: data.rarity,
        holders: data.holders,
      },
    };
  }
}

module.exports = NFTBot;
