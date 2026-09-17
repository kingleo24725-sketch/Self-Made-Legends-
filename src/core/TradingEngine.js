const TechnicalAnalysisBot = require("../strategies/TechnicalAnalysisBot");
const MomentumBot = require("../strategies/MomentumBot");

class TradingEngine {
  constructor(portfolio, riskManager) {
    this.portfolio = portfolio;
    this.riskManager = riskManager;
    this.bots = [
      new TechnicalAnalysisBot(),
      new MomentumBot(),
    ];
    this.signals = new Map();
    this.executedTrades = [];
  }

  async analyzeStock(symbol, priceData, volumeData) {
    const botSignals = [];

    for (const bot of this.bots) {
      let signal;

      if (bot.name === "Technical Analysis Bot") {
        signal = bot.analyze(priceData);
      } else if (bot.name === "Momentum Bot") {
        signal = bot.analyze(
          priceData[priceData.length - 1],
          priceData,
          volumeData
        );
      }

      if (signal) {
        botSignals.push({
          bot: bot.name,
          ...signal,
        });
      }
    }

    return this.aggregateSignals(botSignals);
  }

  aggregateSignals(botSignals) {
    if (botSignals.length === 0) return { action: "HOLD", confidence: 0 };

    const weights = {
      BUY: 0,
      SELL: 0,
      HOLD: 0,
    };

    let totalConfidence = 0;

    for (const signal of botSignals) {
      const weight = signal.confidence || 0.5;
      weights[signal.action] += weight;
      totalConfidence += weight;
    }

    const action = Object.keys(weights).reduce((a, b) =>
      weights[a] > weights[b] ? a : b
    );

    return {
      action,
      confidence: totalConfidence > 0 ? weights[action] / totalConfidence : 0,
      botSignals,
      consensus: botSignals.filter((s) => s.action === action).length,
      totalBots: botSignals.length,
    };
  }

  executeSignal(signal, symbol, currentPrice, priceData) {
    if (signal.confidence < 0.6) {
      return {
        executed: false,
        reason: "Low confidence",
      };
    }

    const riskMetrics = this.riskManager.getPortfolioRiskMetrics(
      this.portfolio,
      { [symbol]: currentPrice }
    );

    if (!riskMetrics.isHealthy) {
      return {
        executed: false,
        reason: "Portfolio risk limit exceeded",
      };
    }

    if (signal.action === "BUY") {
      return this.executeBuy(symbol, currentPrice, signal.confidence);
    } else if (signal.action === "SELL") {
      return this.executeSell(symbol, currentPrice);
    }

    return {
      executed: false,
      reason: "HOLD signal",
    };
  }

  executeBuy(symbol, currentPrice, confidence) {
    const quantity = this.riskManager.calculatePositionSize(
      this.portfolio,
      symbol,
      currentPrice,
      confidence
    );

    if (quantity < 1) {
      return {
        executed: false,
        reason: "Insufficient funds or position size too small",
      };
    }

    const result = this.portfolio.buyStock(
      symbol,
      quantity,
      currentPrice,
      confidence
    );

    if (result.success) {
      this.executedTrades.push({
        ...result.trade,
        signal: "BUY",
      });
      return {
        executed: true,
        trade: result.trade,
      };
    }

    return {
      executed: false,
      reason: result.error,
    };
  }

  executeSell(symbol, currentPrice) {
    if (!this.portfolio.positions.has(symbol)) {
      return {
        executed: false,
        reason: "No position to sell",
      };
    }

    const position = this.portfolio.positions.get(symbol);
    const result = this.portfolio.sellStock(symbol, position.quantity, currentPrice);

    if (result.success) {
      this.executedTrades.push({
        ...result.trade,
        signal: "SELL",
      });
      return {
        executed: true,
        trade: result.trade,
      };
    }

    return {
      executed: false,
      reason: result.error,
    };
  }

  checkStopLoss(currentPrices) {
    const stopLossExecutions = [];

    for (const position of this.portfolio.getOpenPositions()) {
      const currentPrice = currentPrices[position.symbol];
      if (!currentPrice) continue;

      const shouldSell = this.riskManager.shouldSellPosition(position, currentPrice);

      if (shouldSell.shouldSell) {
        const result = this.executeSell(position.symbol, currentPrice);
        if (result.executed) {
          stopLossExecutions.push({
            ...result.trade,
            reason: shouldSell.reason,
          });
        }
      }
    }

    return stopLossExecutions;
  }

  getPortfolioStatus(currentPrices) {
    const metrics = this.portfolio.calculateMetrics(currentPrices);
    const composition = this.portfolio.getPortfolioComposition(currentPrices);
    const riskMetrics = this.riskManager.getPortfolioRiskMetrics(
      this.portfolio,
      currentPrices
    );

    return {
      metrics,
      composition,
      riskMetrics,
      openPositions: this.portfolio.getOpenPositions().length,
    };
  }
}

module.exports = TradingEngine;
