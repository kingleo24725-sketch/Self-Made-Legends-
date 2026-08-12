require("dotenv").config();

const express = require("express");
const cors = require("cors");
const http = require("http");
const socketIo = require("socket.io");

const Portfolio = require("./core/Portfolio");
const RiskManager = require("./core/RiskManager");
const MultiAssetTradingEngine = require("./core/MultiAssetTradingEngine");
const DataFetcher = require("./data/DataFetcher");
const CryptoDataFetcher = require("./data/CryptoDataFetcher");
const NFTDataFetcher = require("./data/NFTDataFetcher");
const AccountManager = require("./accounts/AccountManager");
const PaymentProcessor = require("./payments/PaymentProcessor");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: { origin: "*" },
});

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

const accountManager = new AccountManager();
const paymentProcessor = new PaymentProcessor();
const portfolio = new Portfolio(Math.max(1, parseInt(process.env.INITIAL_CAPITAL) || 1));
const riskManager = new RiskManager({
  maxPositionSize: parseFloat(process.env.MAX_POSITION_SIZE) || 0.2,
  maxLossPercent: parseFloat(process.env.MAX_LOSS_PERCENT) || 2,
  minGainPercent: parseFloat(process.env.MIN_GAIN_PERCENT) || 1.5,
});

const engine = new MultiAssetTradingEngine(portfolio, riskManager);
const dataFetcher = new DataFetcher(process.env.ALPHA_VANTAGE_API_KEY || "demo");
const cryptoFetcher = new CryptoDataFetcher();
const nftFetcher = new NFTDataFetcher(process.env.OPENSEA_API_KEY);

const stocks = (process.env.STOCKS || "AAPL,MSFT,GOOGL").split(",");
const cryptos = ["bitcoin", "ethereum", "cardano", "solana", "ripple"];
const nfts = ["pudgy-penguins", "boredapeyachtclub", "azuki"];

let tradingActive = false;
let analysisResults = new Map();

const authenticateUser = (req, res, next) => {
  const sessionId = req.headers["x-session-id"];
  if (!sessionId) return res.status(401).json({ error: "No session" });

  const session = accountManager.verifySession(sessionId);
  if (!session.valid) return res.status(401).json({ error: session.error });

  req.user = session;
  next();
};

app.post("/api/auth/register", (req, res) => {
  const { email, password, fullName } = req.body;

  if (!email || !password || !fullName) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const result = accountManager.createAccount(email, password, fullName);
  res.json(result);
});

app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Missing email or password" });
  }

  const result = accountManager.login(email, password);
  res.json(result);
});

app.post("/api/auth/logout", authenticateUser, (req, res) => {
  const sessionId = req.headers["x-session-id"];
  const result = accountManager.logout(sessionId);
  res.json(result);
});

app.get("/api/account/profile", authenticateUser, (req, res) => {
  const account = accountManager.getAccountById(req.user.userId);
  if (!account) return res.status(404).json({ error: "Account not found" });

  res.json({
    userId: account.userId,
    email: account.email,
    fullName: account.fullName,
    createdAt: account.createdAt,
    verified: account.verified,
  });
});

app.get("/api/account/balance", authenticateUser, (req, res) => {
  const account = accountManager.getAccountById(req.user.userId);
  if (!account) return res.status(404).json({ error: "Account not found" });

  res.json({
    usd: account.balances.usd,
    crypto: account.balances.crypto,
    nft: account.balances.nft,
  });
});

app.get("/api/account/portfolio-value", authenticateUser, (req, res) => {
  const account = accountManager.getAccountById(req.user.userId);
  if (!account) return res.status(404).json({ error: "Account not found" });

  const currentPrices = {};
  for (const [symbol, data] of analysisResults) {
    currentPrices[symbol] = data.price;
  }

  const totalValue = accountManager.getTotalPortfolioValue(req.user.email, currentPrices);

  res.json({
    totalPortfolioValue: totalValue,
    usdBalance: account.balances.usd,
    timestamp: new Date(),
  });
});

app.get("/api/account/wallets", authenticateUser, (req, res) => {
  const account = accountManager.getAccountById(req.user.userId);
  if (!account) return res.status(404).json({ error: "Account not found" });

  res.json({ wallets: account.wallets });
});

app.post("/api/account/wallets", authenticateUser, (req, res) => {
  const { walletType, walletAddress, label } = req.body;

  if (!walletType || !walletAddress) {
    return res.status(400).json({ error: "Missing wallet details" });
  }

  if (!paymentProcessor.verifyWithdrawalAddress(walletAddress, walletType)) {
    return res.status(400).json({ error: "Invalid wallet address format" });
  }

  const result = accountManager.addWallet(req.user.email, walletType, walletAddress, label);
  res.json(result);
});

app.post("/api/payments/deposit", authenticateUser, (req, res) => {
  const { amount, currency, method } = req.body;

  if (!amount || amount <= 0) {
    return res.status(400).json({ error: "Invalid amount" });
  }

  const result = paymentProcessor.createDeposit(req.user.userId, amount, currency, method);
  res.json(result);
});

app.post("/api/payments/withdraw", authenticateUser, (req, res) => {
  const { amount, currency, method, destination } = req.body;

  if (!amount || amount <= 0) {
    return res.status(400).json({ error: "Invalid amount" });
  }

  const account = accountManager.getAccountById(req.user.userId);
  if (account.balances.usd < amount) {
    return res.status(400).json({ error: "Insufficient balance" });
  }

  const result = paymentProcessor.createWithdrawal(
    req.user.userId,
    amount,
    currency,
    method,
    destination
  );
  res.json(result);
});

app.get("/api/payments/history", authenticateUser, (req, res) => {
  const history = paymentProcessor.getTransactionHistory(req.user.userId);
  res.json(history);
});

app.get("/api/crypto/prices", async (req, res) => {
  const prices = await cryptoFetcher.fetchCryptoPrices(cryptos);
  res.json(prices);
});

app.get("/api/crypto/top", async (req, res) => {
  const topCryptos = await cryptoFetcher.fetchTopCryptos(10);
  res.json({ cryptos: topCryptos });
});

app.get("/api/crypto/:id", async (req, res) => {
  const data = await cryptoFetcher.fetchCryptoData(req.params.id);
  res.json(data);
});

app.get("/api/nft/trending", async (req, res) => {
  const trending = await nftFetcher.fetchTrendingCollections(20);
  res.json({ collections: trending });
});

app.get("/api/nft/collection/:slug", async (req, res) => {
  const data = await nftFetcher.fetchCollectionData(req.params.slug);
  res.json(data);
});

app.get("/api/portfolio", authenticateUser, (req, res) => {
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

app.get("/api/trades", authenticateUser, (req, res) => {
  const trades = engine.getTradeHistory(50);
  res.json({
    totalTrades: trades.length,
    trades,
  });
});

app.post("/api/trading/toggle", authenticateUser, (req, res) => {
  tradingActive = !tradingActive;
  res.json({ tradingActive });
});

app.get("/api/trading/status", (req, res) => {
  res.json({ tradingActive, stocks, cryptos, nfts });
});

async function runAnalysis() {
  if (!tradingActive) return;

  const stocksData = await dataFetcher.fetchMultipleStocks(stocks);
  const currentPrices = {};

  for (const symbol of stocks) {
    if (stocksData[symbol].error) continue;

    const data = stocksData[symbol];
    currentPrices[symbol] = data.currentPrice;

    const signal = await engine.analyzeStock(symbol, data.priceData, data.volumeData);
    analysisResults.set(symbol, { signal, price: data.currentPrice, type: "stock" });

    const execution = engine.executeSignal(signal, symbol, data.currentPrice, "stock");
    if (execution.executed) {
      io.emit("trade", { ...execution.trade, assetType: "stock" });
    }
  }

  const cryptosData = await cryptoFetcher.fetchMultipleCryptos(cryptos);

  for (const cryptoId of cryptos) {
    if (cryptosData[cryptoId].error) continue;

    const data = cryptosData[cryptoId];
    currentPrices[data.symbol] = data.currentPrice;

    const signal = await engine.analyzeCrypto(cryptoId, data);
    analysisResults.set(data.symbol, { signal, price: data.currentPrice, type: "crypto" });

    const execution = engine.executeSignal(signal, cryptoId, data.currentPrice, "crypto");
    if (execution.executed) {
      io.emit("trade", { ...execution.trade, assetType: "crypto" });
    }
  }

  const nftsData = await Promise.all(nfts.map((nft) => nftFetcher.fetchCollectionData(nft)));

  for (const data of nftsData) {
    if (data.error) continue;

    const signal = await engine.analyzeNFT(data.slug, data);
    analysisResults.set(data.slug, { signal, price: data.floorPrice, type: "nft" });
  }

  const status = engine.getPortfolioStatus(currentPrices);
  io.emit("update", {
    analysis: Object.fromEntries(analysisResults),
    portfolio: status,
  });
}

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);
});

setInterval(runAnalysis, 60000);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Multi-Asset Trading Bot Server running on http://localhost:${PORT}`);
  console.log(`📊 Dashboard: http://localhost:${PORT}/dashboard.html`);
});

module.exports = { app, server, io };
