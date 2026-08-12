class TechnicalAnalysisBot {
  constructor() {
    this.name = "Technical Analysis Bot";
    this.signals = [];
  }

  analyze(priceData) {
    const signals = {
      rsi: this.calculateRSI(priceData),
      macd: this.calculateMACD(priceData),
      bollingerBands: this.calculateBollingerBands(priceData),
      movingAverages: this.calculateMovingAverages(priceData),
    };

    return this.generateSignal(signals);
  }

  calculateRSI(prices, period = 14) {
    if (prices.length < period + 1) return null;

    let gains = 0, losses = 0;
    for (let i = 1; i <= period; i++) {
      const change = prices[prices.length - i] - prices[prices.length - i - 1];
      if (change > 0) gains += change;
      else losses += Math.abs(change);
    }

    const avgGain = gains / period;
    const avgLoss = losses / period;
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    const rsi = 100 - 100 / (1 + rs);

    return rsi;
  }

  calculateMACD(prices) {
    const ema12 = this.calculateEMA(prices, 12);
    const ema26 = this.calculateEMA(prices, 26);

    if (!ema12 || !ema26) return null;

    const macdLine = ema12 - ema26;
    const signalLine = this.calculateEMA([macdLine], 9);

    return {
      macdLine,
      signalLine,
      histogram: macdLine - (signalLine || 0),
    };
  }

  calculateEMA(prices, period) {
    if (prices.length < period) return null;

    const multiplier = 2 / (period + 1);
    let ema = prices.slice(0, period).reduce((a, b) => a + b) / period;

    for (let i = period; i < prices.length; i++) {
      ema = prices[i] * multiplier + ema * (1 - multiplier);
    }

    return ema;
  }

  calculateBollingerBands(prices, period = 20, stdDev = 2) {
    if (prices.length < period) return null;

    const recentPrices = prices.slice(-period);
    const sma = recentPrices.reduce((a, b) => a + b) / period;
    const variance =
      recentPrices.reduce((sum, price) => sum + Math.pow(price - sma, 2), 0) /
      period;
    const std = Math.sqrt(variance);

    return {
      upper: sma + stdDev * std,
      middle: sma,
      lower: sma - stdDev * std,
    };
  }

  calculateMovingAverages(prices) {
    const ma20 = this.calculateSMA(prices, 20);
    const ma50 = this.calculateSMA(prices, 50);
    const ma200 = this.calculateSMA(prices, 200);

    return { ma20, ma50, ma200 };
  }

  calculateSMA(prices, period) {
    if (prices.length < period) return null;
    return (
      prices.slice(-period).reduce((a, b) => a + b, 0) / period
    );
  }

  generateSignal(signals) {
    let score = 50;

    if (signals.rsi !== null) {
      if (signals.rsi < 30) score += 20;
      else if (signals.rsi > 70) score -= 20;
    }

    if (signals.macd) {
      if (signals.macd.histogram > 0) score += 15;
      else score -= 15;
    }

    if (signals.bollingerBands) {
      const price = 0;
      if (price < signals.bollingerBands.lower) score += 10;
      else if (price > signals.bollingerBands.upper) score -= 10;
    }

    if (signals.movingAverages.ma20 && signals.movingAverages.ma50) {
      if (signals.movingAverages.ma20 > signals.movingAverages.ma50) score += 10;
    }

    return {
      action: score > 60 ? "BUY" : score < 40 ? "SELL" : "HOLD",
      confidence: Math.abs(score - 50) / 50,
      score,
    };
  }
}

module.exports = TechnicalAnalysisBot;
