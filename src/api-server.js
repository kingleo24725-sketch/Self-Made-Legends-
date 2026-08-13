require("dotenv").config();

const express = require("express");
const cors = require("cors");
const http = require("http");
const socketIo = require("socket.io");

const Portfolio = require("./core/Portfolio");
const RiskManager = require("./core/RiskManager");
const MultiAssetTradingEngine = require("./core/MultiAssetTradingEngine");
const UserControlCenter = require("./core/UserControlCenter");
const DataFetcher = require("./data/DataFetcher");
const CryptoDataFetcher = require("./data/CryptoDataFetcher");
const NFTDataFetcher = require("./data/NFTDataFetcher");
const AccountManager = require("./accounts/AccountManager");
const PaymentProcessor = require("./payments/PaymentProcessor");
const CreatorEarningsProcessor = require("./payments/CreatorEarningsProcessor");
const UniversalCardProcessor = require("./payments/UniversalCardProcessor");

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
const cardProcessor = new UniversalCardProcessor();
const userControl = new UserControlCenter();
const creatorEarnings = new CreatorEarningsProcessor(
  "creator_self_made_legends",
  { bankName: "Creator Bank Account" }
);
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

// ===== USER CONTROL ENDPOINTS =====

app.get("/api/control/status", authenticateUser, (req, res) => {
  const status = userControl.getControlStatus(req.user.userId);
  res.json(status);
});

app.post("/api/control/enable-ai", authenticateUser, (req, res) => {
  const result = userControl.enableAI(req.user.userId);
  res.json(result);
});

app.post("/api/control/disable-ai", authenticateUser, (req, res) => {
  const result = userControl.disableAI(req.user.userId);
  res.json(result);
});

app.post("/api/control/pause-trading", authenticateUser, (req, res) => {
  const result = userControl.pauseTrading(req.user.userId);
  res.json(result);
});

app.post("/api/control/resume-trading", authenticateUser, (req, res) => {
  const result = userControl.resumeTrading(req.user.userId);
  res.json(result);
});

app.get("/api/control/ai-status", authenticateUser, (req, res) => {
  const status = userControl.getAIStatus(req.user.userId);
  res.json(status);
});

// ===== USER WITHDRAWAL CONTROL =====

app.post("/api/withdraw/request", authenticateUser, (req, res) => {
  const { amount, destination } = req.body;

  if (!amount || amount < 0.01) {
    return res.status(400).json({ error: "Invalid amount" });
  }

  const account = accountManager.getAccountById(req.user.userId);
  if (account.balances.usd < amount) {
    return res.status(400).json({ error: "Insufficient balance" });
  }

  const result = userControl.requestWithdrawal(
    req.user.userId,
    amount,
    destination
  );

  if (result.success) {
    creatorEarnings.recordTransaction(
      req.user.userId,
      amount,
      "withdrawal",
      "card"
    );
  }

  res.json(result);
});

app.get("/api/withdraw/pending", authenticateUser, (req, res) => {
  const pending = userControl.getPendingWithdrawals(req.user.userId);
  res.json({ pendingWithdrawals: pending });
});

app.get("/api/withdraw/history", authenticateUser, (req, res) => {
  const history = userControl.getWithdrawalHistory(req.user.userId);
  res.json({ withdrawalHistory: history });
});

// ===== CARD PROCESSING ENDPOINTS =====

app.post("/api/cards/deposit", authenticateUser, (req, res) => {
  const { amount, cardType, cardLast4, bankName } = req.body;

  if (!amount || !cardType || !bankName) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const result = cardProcessor.processCardDeposit(
    req.user.userId,
    amount,
    cardType,
    cardLast4,
    bankName
  );

  if (result.success) {
    const earning = creatorEarnings.recordTransaction(
      req.user.userId,
      amount,
      "deposit",
      cardType
    );
    creatorEarnings.completeEarning(earning.id);
  }

  res.json(result);
});

app.post("/api/cards/withdraw", authenticateUser, (req, res) => {
  const { amount, cardType, cardLast4, bankName } = req.body;

  const account = accountManager.getAccountById(req.user.userId);
  if (account.balances.usd < amount) {
    return res.status(400).json({ error: "Insufficient balance" });
  }

  const result = cardProcessor.processCardWithdrawal(
    req.user.userId,
    amount,
    cardType,
    cardLast4,
    bankName
  );

  if (result.success) {
    const earning = creatorEarnings.recordTransaction(
      req.user.userId,
      amount,
      "withdrawal",
      cardType
    );
    creatorEarnings.completeEarning(earning.id);
  }

  res.json(result);
});

app.get("/api/cards/supported", (req, res) => {
  const cards = cardProcessor.getSupportedCards();
  const banks = cardProcessor.getSupportedBanks();
  res.json({
    supportedCards: cards,
    supportedBanks: banks,
    totalCards: cards.length,
    totalBanks: banks.length,
  });
});

// ===== CREATOR EARNINGS ENDPOINTS =====

app.get("/api/creator/earnings", (req, res) => {
  const stats = creatorEarnings.getEarningsStats();
  res.json(stats);
});

app.get("/api/creator/earnings/:period", (req, res) => {
  const period = req.params.period;
  let startDate, endDate;

  const now = new Date();

  if (period === "today") {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    endDate = new Date();
  } else if (period === "week") {
    startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    endDate = new Date();
  } else if (period === "month") {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    endDate = new Date();
  } else if (period === "year") {
    startDate = new Date(now.getFullYear(), 0, 1);
    endDate = new Date();
  }

  const earnings = creatorEarnings.getEarnings({ startDate, endDate });
  res.json(earnings);
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
