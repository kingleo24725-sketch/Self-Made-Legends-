require("dotenv").config();

const express = require("express");
const cors = require("cors");
const http = require("http");
const socketIo = require("socket.io");

const Portfolio = require("./core/Portfolio");
const RiskManager = require("./core/RiskManager");
const TradingEngine = require("./core/TradingEngine");
const DataFetcher = require("./data/DataFetcher");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: { origin: "*" },
});

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

const portfolio = new Portfolio(parseInt(process.env.INITIAL_CAPITAL) || 10000);
const riskManager = new RiskManager({
  maxPositionSize: parseFloat(process.env.MAX_POSITION_SIZE) || 0.2,
  maxLossPercent: parseFloat(process.env.MAX_LOSS_PERCENT) || 2,
  minGainPercent: parseFloat(process.env.MIN_GAIN_PERCENT) || 1.5,
});

const engine = new TradingEngine(portfolio, riskManager);
const dataFetcher = new DataFetcher(process.env.ALPHA_VANTAGE_API_KEY || "demo");
const stocks = (process.env.STOCKS || "AAPL,MSFT,GOOGL").split(",");

let analysisResults = new Map();
let tradingActive = false;

app.get("/api/portfolio", (req, res) => {
  const currentPrices = {};
  for (const [symbol, data] of analysisResults) {
    currentPrices[symbol] = data.price;
  }

  const status = engine.getPortfolioStatus(currentPrices);
  res.json(status);
});

app.get("/api/analysis", (req, res) => {
  const results = Object.fromEntries(analysisResults);
  res.json(results);
});

app.get("/api/trades", (req, res) => {
  res.json({
    totalTrades: portfolio.tradeHistory.length,
    trades: portfolio.tradeHistory.slice(-20),
  });
});

app.get("/api/positions", (req, res) => {
  const currentPrices = {};
  for (const [symbol, data] of analysisResults) {
    currentPrices[symbol] = data.price;
  }

  const composition = portfolio.getPortfolioComposition(currentPrices);
  res.json(composition);
});

app.post("/api/trading/toggle", (req, res) => {
  tradingActive = !tradingActive;
  res.json({ tradingActive });
});

app.get("/api/trading/status", (req, res) => {
  res.json({ tradingActive, stocks });
});

async function runAnalysis() {
  if (!tradingActive) return;

  const stocksData = await dataFetcher.fetchMultipleStocks(stocks);
  const currentPrices = {};

  for (const symbol of stocks) {
    if (stocksData[symbol].error) {
      console.log(`⚠️  ${symbol}: ${stocksData[symbol].error}`);
      continue;
    }

    const data = stocksData[symbol];
    currentPrices[symbol] = data.currentPrice;

    const signal = await engine.analyzeStock(
      symbol,
      data.priceData,
      data.volumeData
    );

    analysisResults.set(symbol, {
      signal,
      price: data.currentPrice,
      timestamp: new Date(),
    });

    const execution = engine.executeSignal(
      signal,
      symbol,
      data.currentPrice,
      data.priceData
    );

    if (execution.executed) {
      io.emit("trade", {
        ...execution.trade,
        timestamp: new Date(),
      });
    }
  }

  const stopLosses = engine.checkStopLoss(currentPrices);
  if (stopLosses.length > 0) {
    io.emit("stopLoss", stopLosses);
  }

  const status = engine.getPortfolioStatus(currentPrices);
  io.emit("update", {
    analysis: Object.fromEntries(analysisResults),
    portfolio: status,
  });
}

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

setInterval(runAnalysis, 60000);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Trading Bot Server running on http://localhost:${PORT}`);
  console.log(`📊 Dashboard: http://localhost:${PORT}/dashboard.html`);
});

module.exports = { app, server, io };
