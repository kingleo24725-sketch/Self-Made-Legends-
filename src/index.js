require("dotenv").config();

const Portfolio = require("./core/Portfolio");
const RiskManager = require("./core/RiskManager");
const TradingEngine = require("./core/TradingEngine");
const DataFetcher = require("./data/DataFetcher");

class TradingBot {
  constructor() {
    this.apiKey = process.env.ALPHA_VANTAGE_API_KEY || "demo";
    this.initialCapital = parseInt(process.env.INITIAL_CAPITAL) || 10000;
    this.tradingEnabled = process.env.TRADING_ENABLED === "true";

    this.portfolio = new Portfolio(this.initialCapital);
    this.riskManager = new RiskManager({
      maxPositionSize: parseFloat(process.env.MAX_POSITION_SIZE) || 0.2,
      maxLossPercent: parseFloat(process.env.MAX_LOSS_PERCENT) || 2,
      minGainPercent: parseFloat(process.env.MIN_GAIN_PERCENT) || 1.5,
    });

    this.engine = new TradingEngine(this.portfolio, this.riskManager);
    this.dataFetcher = new DataFetcher(this.apiKey);

    this.stocks = (process.env.STOCKS || "AAPL,MSFT,GOOGL").split(",");
    this.isRunning = false;
    this.analysisResults = new Map();
  }

  async start() {
    console.log("\n🤖 AI Stock Trading Bot Started");
    console.log(`📊 Initial Capital: $${this.initialCapital.toFixed(2)}`);
    console.log(`📈 Monitoring Stocks: ${this.stocks.join(", ")}`);
    console.log(`🛡️  Risk Management: ${this.riskManager.maxLossPercent}% stop loss`);
    console.log(`⏱️  Trading Mode: ${this.tradingEnabled ? "LIVE" : "PAPER TRADING"}\n`);

    this.isRunning = true;

    while (this.isRunning) {
      try {
        await this.analyzeAndTrade();
        await this.sleep(60000);
      } catch (error) {
        console.error("Error in trading loop:", error.message);
        await this.sleep(30000);
      }
    }
  }

  async analyzeAndTrade() {
    console.log(`\n[${new Date().toLocaleTimeString()}] Analyzing markets...`);

    const stocksData = await this.dataFetcher.fetchMultipleStocks(this.stocks);
    const currentPrices = {};

    for (const symbol of this.stocks) {
      if (stocksData[symbol].error) {
        console.log(`⚠️  ${symbol}: ${stocksData[symbol].error}`);
        continue;
      }

      const data = stocksData[symbol];
      currentPrices[symbol] = data.currentPrice;

      const signal = await this.engine.analyzeStock(
        symbol,
        data.priceData,
        data.volumeData
      );

      this.analysisResults.set(symbol, {
        signal,
        price: data.currentPrice,
        timestamp: new Date(),
      });

      console.log(
        `${symbol}: $${data.currentPrice.toFixed(2)} | Signal: ${signal.action} | Confidence: ${(signal.confidence * 100).toFixed(0)}% | Bots: ${signal.consensus}/${signal.totalBots}`
      );

      if (this.tradingEnabled) {
        const execution = this.engine.executeSignal(
          signal,
          symbol,
          data.currentPrice,
          data.priceData
        );

        if (execution.executed) {
          console.log(`✅ Trade executed: ${execution.trade.type} ${execution.trade.quantity} ${symbol}`);
        }
      }
    }

    await this.checkStopLosses(currentPrices);
    this.printPortfolioStatus(currentPrices);
  }

  async checkStopLosses(currentPrices) {
    const stopLosses = this.engine.checkStopLoss(currentPrices);

    if (stopLosses.length > 0) {
      console.log("\n🛑 Stop Loss Executed:");
      for (const trade of stopLosses) {
        console.log(
          `   ${trade.symbol}: Sold at $${trade.price.toFixed(2)} | Loss: ${trade.gainLossPercent.toFixed(2)}%`
        );
      }
    }
  }

  printPortfolioStatus(currentPrices) {
    const status = this.engine.getPortfolioStatus(currentPrices);

    console.log("\n💰 Portfolio Status:");
    console.log(`   Value: $${status.metrics.portfolioValue.toFixed(2)}`);
    console.log(`   Return: ${status.metrics.totalReturn.toFixed(2)}%`);
    console.log(`   Win Rate: ${status.metrics.winRate}%`);
    console.log(`   Open Positions: ${status.metrics.positions}`);
    console.log(`   Available Cash: $${status.metrics.availableCash.toFixed(2)}`);

    if (status.composition.length > 1) {
      console.log("\n📋 Portfolio Composition:");
      for (const asset of status.composition.slice(0, 5)) {
        if (asset.symbol !== "CASH") {
          console.log(
            `   ${asset.symbol}: ${asset.quantity} @ $${asset.currentPrice.toFixed(2)} | ${asset.gainLossPercent.toFixed(2)}%`
          );
        }
      }
    }
  }

  getAnalysisResults() {
    return Object.fromEntries(this.analysisResults);
  }

  getPortfolioMetrics() {
    const currentPrices = {};
    for (const [symbol, data] of this.analysisResults) {
      currentPrices[symbol] = data.price;
    }
    return this.engine.getPortfolioStatus(currentPrices);
  }

  stop() {
    this.isRunning = false;
    console.log("\n🛑 Trading Bot Stopped");
  }

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

const bot = new TradingBot();
bot.start().catch(console.error);

process.on("SIGINT", () => {
  console.log("\n\nShutting down gracefully...");
  bot.stop();
  process.exit(0);
});

module.exports = TradingBot;
