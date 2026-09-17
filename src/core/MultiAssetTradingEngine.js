const TechnicalAnalysisBot = require("../strategies/TechnicalAnalysisBot");
const MomentumBot = require("../strategies/MomentumBot");
const CryptoBot = require("../strategies/CryptoBot");
const NFTBot = require("../strategies/NFTBot");

class MultiAssetTradingEngine {
  constructor(portfolio, riskManager) {
    this.portfolio = portfolio;
    this.riskManager = riskManager;
    this.bots = {
      stocks: [new TechnicalAnalysisBot(), new MomentumBot()],
      crypto: [new CryptoBot()],
      nft: [new NFTBot()],
    };
    this.executedTrades = [];
  }

  async analyzeStock(symbol, priceData, volumeData) {
    const botSignals = [];

    for (const bot of this.bots.stocks) {
      let signal;

      if (bot.name === "Technical Analysis Bot") {
        signal = bot.analyze(priceData);
      } else if (bot.name === "Momentum Bot") {
        signal = bot.analyze(priceData[priceData.length - 1], priceData, volumeData);
      }

      if (signal) {
        botSignals.push({
          bot: bot.name,
          assetType: "stock",
          ...signal,
        });
      }
    }

    return this.aggregateSignals(botSignals);
  }

  async analyzeCrypto(cryptoId, cryptoData) {
    const botSignals = [];

    for (const bot of this.bots.crypto) {
      const signal = bot.analyze(cryptoData.priceData, [cryptoData.volume24h]);

      if (signal) {
        botSignals.push({
          bot: bot.name,
          assetType: "crypto",
          symbol: cryptoData.symbol,
          ...signal,
        });
      }
    }

    return this.aggregateSignals(botSignals);
  }

  async analyzeNFT(nftSlug, nftData) {
    const botSignals = [];

    for (const bot of this.bots.nft) {
      const signal = bot.analyze(nftData);

      if (signal) {
        botSignals.push({
          bot: bot.name,
          assetType: "nft",
          collection: nftSlug,
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

  executeSignal(signal, asset, currentPrice, assetType = "stock") {
    if (signal.confidence < 0.6) {
      return {
        executed: false,
        reason: "Low confidence",
      };
    }

    if (signal.action === "BUY") {
      return this.executeBuy(asset, currentPrice, signal.confidence, assetType);
    } else if (signal.action === "SELL") {
      return this.executeSell(asset, currentPrice, assetType);
    }

    return {
      executed: false,
      reason: "HOLD signal",
    };
  }

  executeBuy(asset, currentPrice, confidence, assetType) {
    const quantity = this.riskManager.calculatePositionSize(
      this.portfolio,
      asset,
      currentPrice,
      confidence
    );

    if (quantity < 1) {
      return {
        executed: false,
        reason: "Insufficient funds",
      };
    }

    const result = this.portfolio.buyStock(asset, quantity, currentPrice, confidence);

    if (result.success) {
      this.executedTrades.push({
        ...result.trade,
        signal: "BUY",
        assetType,
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

  executeSell(asset, currentPrice, assetType) {
    if (!this.portfolio.positions.has(asset)) {
      return {
        executed: false,
        reason: "No position to sell",
      };
    }

    const position = this.portfolio.positions.get(asset);
    const result = this.portfolio.sellStock(asset, position.quantity, currentPrice);

    if (result.success) {
      this.executedTrades.push({
        ...result.trade,
        signal: "SELL",
        assetType,
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

  getTradeHistory(limit = 50) {
    return this.executedTrades.slice(-limit);
  }
}

module.exports = MultiAssetTradingEngine;
