class RiskManager {
  constructor(config = {}) {
    this.maxPositionSize = config.maxPositionSize || 0.2;
    this.maxLossPercent = config.maxLossPercent || 2;
    this.minGainPercent = config.minGainPercent || 1.5;
    this.maxDrawdown = config.maxDrawdown || 10;
    this.riskRewardRatio = config.riskRewardRatio || 2;
  }

  validateTrade(trade, portfolio, currentPrice) {
    const issues = [];

    const positionValue = trade.quantity * trade.price;
    const portfolioValue = portfolio.getPortfolioValue({ [trade.symbol]: currentPrice });
    const positionPercent = (positionValue / portfolioValue) * 100;

    if (positionPercent > this.maxPositionSize * 100) {
      issues.push({
        type: "POSITION_SIZE",
        message: `Position size ${positionPercent.toFixed(2)}% exceeds max ${this.maxPositionSize * 100}%`,
      });
    }

    if (trade.quantity * trade.price > portfolio.availableCash) {
      issues.push({
        type: "INSUFFICIENT_FUNDS",
        message: "Insufficient cash for this trade",
      });
    }

    return {
      isValid: issues.length === 0,
      issues,
    };
  }

  calculatePositionSize(portfolio, symbol, price, confidence = 1) {
    const availableCash = portfolio.availableCash;
    const portfolioValue = portfolio.getPortfolioValue({ [symbol]: price });

    const maxCashToUse = portfolioValue * this.maxPositionSize * confidence;
    const maxQuantity = Math.floor(maxCashToUse / price);

    return Math.max(1, maxQuantity);
  }

  shouldSellPosition(position, currentPrice) {
    const gainLoss = (currentPrice - position.avgPrice) / position.avgPrice;
    const gainLossPercent = gainLoss * 100;

    if (gainLossPercent <= -this.maxLossPercent) {
      return {
        shouldSell: true,
        reason: "STOP_LOSS",
        message: `Stop loss triggered at ${gainLossPercent.toFixed(2)}% loss`,
      };
    }

    if (gainLossPercent >= this.minGainPercent) {
      return {
        shouldSell: true,
        reason: "TAKE_PROFIT",
        message: `Take profit triggered at ${gainLossPercent.toFixed(2)}% gain`,
      };
    }

    return {
      shouldSell: false,
      reason: null,
    };
  }

  getPortfolioRiskMetrics(portfolio, currentPrices) {
    let totalRisk = 0;
    let unrealizedLoss = 0;
    let maxLoss = 0;

    for (const position of portfolio.getOpenPositions()) {
      const currentPrice = currentPrices[position.symbol];
      if (currentPrice) {
        const loss = (position.avgPrice - currentPrice) * position.quantity;
        if (loss > 0) {
          unrealizedLoss += loss;
          maxLoss = Math.max(maxLoss, loss);
        }
      }
    }

    const portfolioValue = portfolio.getPortfolioValue(currentPrices);
    const riskPercent = (unrealizedLoss / portfolioValue) * 100;

    return {
      totalUnrealizedLoss: unrealizedLoss,
      maxLoss,
      riskPercent,
      isHealthy: riskPercent < this.maxDrawdown,
    };
  }

  diversifyAllocation(portfolio, availableStocks, allocation = 0.9) {
    const numStocks = Math.min(availableStocks.length, 10);
    return (allocation / numStocks) * 100;
  }
}

module.exports = RiskManager;
