class Portfolio {
  constructor(initialCapital = 10000) {
    this.totalCapital = initialCapital;
    this.availableCash = initialCapital;
    this.positions = new Map();
    this.trades = [];
    this.tradeHistory = [];
    this.performance = {
      totalReturn: 0,
      winRate: 0,
      maxDrawdown: 0,
    };
  }

  buyStock(symbol, quantity, price, confidence) {
    const cost = quantity * price;

    if (cost > this.availableCash) {
      return {
        success: false,
        error: "Insufficient funds",
      };
    }

    this.availableCash -= cost;

    if (this.positions.has(symbol)) {
      const existing = this.positions.get(symbol);
      existing.quantity += quantity;
      existing.totalCost += cost;
      existing.avgPrice = existing.totalCost / existing.quantity;
    } else {
      this.positions.set(symbol, {
        symbol,
        quantity,
        entryPrice: price,
        avgPrice: price,
        totalCost: cost,
        entryTime: new Date(),
        confidence,
      });
    }

    const trade = {
      type: "BUY",
      symbol,
      quantity,
      price,
      timestamp: new Date(),
      cash: cost,
    };

    this.trades.push(trade);
    this.tradeHistory.push(trade);

    return {
      success: true,
      trade,
    };
  }

  sellStock(symbol, quantity, price) {
    if (!this.positions.has(symbol)) {
      return {
        success: false,
        error: "No position in this symbol",
      };
    }

    const position = this.positions.get(symbol);

    if (quantity > position.quantity) {
      return {
        success: false,
        error: "Insufficient shares",
      };
    }

    const revenue = quantity * price;
    const gainLoss = (price - position.avgPrice) * quantity;
    this.availableCash += revenue;

    if (quantity === position.quantity) {
      this.positions.delete(symbol);
    } else {
      position.quantity -= quantity;
    }

    const trade = {
      type: "SELL",
      symbol,
      quantity,
      price,
      timestamp: new Date(),
      cash: revenue,
      gainLoss,
      gainLossPercent: (gainLoss / (position.avgPrice * quantity)) * 100,
    };

    this.trades.push(trade);
    this.tradeHistory.push(trade);

    return {
      success: true,
      trade,
    };
  }

  getPortfolioValue(currentPrices) {
    let positionValue = 0;

    for (const [symbol, position] of this.positions) {
      if (currentPrices[symbol]) {
        positionValue += position.quantity * currentPrices[symbol];
      }
    }

    return this.availableCash + positionValue;
  }

  getPortfolioComposition(currentPrices) {
    const composition = [];
    let totalValue = this.getPortfolioValue(currentPrices);

    for (const [symbol, position] of this.positions) {
      if (currentPrices[symbol]) {
        const value = position.quantity * currentPrices[symbol];
        composition.push({
          symbol,
          quantity: position.quantity,
          currentPrice: currentPrices[symbol],
          value,
          percentage: (value / totalValue) * 100,
          gainLoss: (currentPrices[symbol] - position.avgPrice) * position.quantity,
          gainLossPercent: ((currentPrices[symbol] - position.avgPrice) / position.avgPrice) * 100,
        });
      }
    }

    composition.push({
      symbol: "CASH",
      value: this.availableCash,
      percentage: (this.availableCash / totalValue) * 100,
    });

    return composition;
  }

  calculateMetrics(currentPrices) {
    const portfolioValue = this.getPortfolioValue(currentPrices);
    const totalReturn = ((portfolioValue - this.totalCapital) / this.totalCapital) * 100;

    const successfulTrades = this.tradeHistory.filter(
      (trade) => trade.type === "SELL" && trade.gainLoss > 0
    );
    const winRate =
      this.tradeHistory.length > 0
        ? (successfulTrades.length / (this.tradeHistory.filter((t) => t.type === "SELL").length || 1)) * 100
        : 0;

    return {
      portfolioValue,
      totalReturn,
      winRate: Math.round(winRate),
      totalTrades: this.tradeHistory.length,
      positions: this.positions.size,
      availableCash: this.availableCash,
    };
  }

  getOpenPositions() {
    return Array.from(this.positions.values());
  }

  closeAllPositions(currentPrices) {
    const closedPositions = [];

    for (const [symbol, position] of this.positions) {
      if (currentPrices[symbol]) {
        const result = this.sellStock(symbol, position.quantity, currentPrices[symbol]);
        if (result.success) {
          closedPositions.push(result.trade);
        }
      }
    }

    return closedPositions;
  }
}

module.exports = Portfolio;
