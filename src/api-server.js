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
const ReferralSystem = require("./social/ReferralSystem");
const SocialNetwork = require("./social/SocialNetwork");
const ReferralBonusPool = require("./social/ReferralBonusPool");
const AIImprovementEngine = require("./ai/AIImprovementEngine");
const ContinuousUpdateEngine = require("./updates/ContinuousUpdateEngine");

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
const referralSystem = new ReferralSystem();
const socialNetwork = new SocialNetwork();
const referralBonusPool = new ReferralBonusPool();
const aiEngine = new AIImprovementEngine();
const updateEngine = new ContinuousUpdateEngine();
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
  const { email, password, fullName, referralCode } = req.body;

  if (!email || !password || !fullName) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const result = accountManager.createAccount(email, password, fullName);

  if (result.success) {
    // Create social profile
    socialNetwork.createProfile(result.userId, email, fullName);

    // Process referral if provided
    if (referralCode) {
      referralSystem.processReferral(referralCode, result.userId, email);
    }
  }

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

    // Process any pending referral bonuses from dedicated bonus pool
    const referralResult = referralSystem.completedDeposit(req.user.userId, amount);
    if (referralResult.success) {
      // Award from separate referral bonus pool (NOT from creator earnings)
      referralBonusPool.awardBonus(req.user.userId, 20);
    }
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

// ===== REFERRAL ENDPOINTS =====

app.post("/api/referrals/generate-link", authenticateUser, (req, res) => {
  const account = accountManager.getAccountById(req.user.userId);
  const link = referralSystem.generateReferralLink(req.user.userId, account.email);
  res.json(link);
});

app.get("/api/referrals/my-link", authenticateUser, (req, res) => {
  const link = referralSystem.getReferralLink(req.user.userId);
  if (!link) {
    const account = accountManager.getAccountById(req.user.userId);
    return res.json(referralSystem.generateReferralLink(req.user.userId, account.email));
  }
  res.json(link);
});

app.get("/api/referrals/stats", authenticateUser, (req, res) => {
  const stats = referralSystem.getReferralStats(req.user.userId);
  res.json(stats);
});

app.get("/api/referrals/leaderboard", (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  const leaderboard = referralSystem.getLeaderboard(limit);
  res.json({ leaderboard, totalUsers: leaderboard.length });
});

app.get("/api/referrals/track/:code", (req, res) => {
  const tracked = referralSystem.trackReferralClick(req.params.code);
  res.json({ tracked });
});

// ===== REFERRAL BONUS POOL ENDPOINTS =====

app.get("/api/referrals/bonus-pool/status", (req, res) => {
  const status = referralBonusPool.getPoolStatus();
  res.json({
    ...status,
    note: "Referral bonuses come from dedicated pool, NOT creator earnings",
  });
});

app.post("/api/referrals/bonus-pool/fund", (req, res) => {
  const { amount, source } = req.body;
  if (!amount || amount <= 0) {
    return res.status(400).json({ error: "Invalid amount" });
  }

  const result = referralBonusPool.fundBonusPool(amount, source || "platform_allocation");
  res.json(result);
});

app.get("/api/referrals/bonus-pool/verification", (req, res) => {
  const verification = referralBonusPool.verifySeparation();
  res.json(verification);
});

// ===== SOCIAL ENDPOINTS - FRIENDS =====

app.post("/api/social/friends/add", authenticateUser, (req, res) => {
  const { friendEmail } = req.body;
  if (!friendEmail) {
    return res.status(400).json({ error: "Friend email required" });
  }

  const result = socialNetwork.addFriend(req.user.userId, friendEmail);
  res.json(result);
});

app.get("/api/social/friends", authenticateUser, (req, res) => {
  const friends = socialNetwork.getFriendsList(req.user.userId);
  res.json({ friends, totalFriends: friends.length });
});

app.post("/api/social/friends/remove", authenticateUser, (req, res) => {
  const { friendId } = req.body;
  if (!friendId) {
    return res.status(400).json({ error: "Friend ID required" });
  }

  const result = socialNetwork.removeFriend(req.user.userId, friendId);
  res.json(result);
});

app.get("/api/social/search", authenticateUser, (req, res) => {
  const query = req.query.q || "";
  if (query.length < 2) {
    return res.json({ results: [] });
  }

  const results = socialNetwork.searchFriends(req.user.userId, query);
  res.json({ results });
});

// ===== SOCIAL ENDPOINTS - MESSAGING =====

app.post("/api/social/messages/send", authenticateUser, (req, res) => {
  const { recipientId, content } = req.body;
  if (!recipientId || !content) {
    return res.status(400).json({ error: "Recipient and content required" });
  }

  const result = socialNetwork.sendMessage(req.user.userId, recipientId, content);
  res.json(result);
});

app.get("/api/social/messages/:friendId", authenticateUser, (req, res) => {
  const messages = socialNetwork.getMessages(req.user.userId, req.params.friendId);
  const unread = messages.filter((m) => !m.read && m.recipientId === req.user.userId).length;
  res.json({ messages, unread });
});

app.post("/api/social/messages/:messageId/read", authenticateUser, (req, res) => {
  const result = socialNetwork.markMessageAsRead(req.params.messageId);
  res.json(result);
});

app.post("/api/social/messages/:messageId/delete", authenticateUser, (req, res) => {
  const result = socialNetwork.deleteMessage(req.params.messageId, req.user.userId);
  res.json(result);
});

app.get("/api/social/messages/unread/count", authenticateUser, (req, res) => {
  const count = socialNetwork.getUnreadMessageCount(req.user.userId);
  res.json({ unreadCount: count });
});

// ===== SOCIAL ENDPOINTS - COMMENTS =====

app.post("/api/social/comments/post", authenticateUser, (req, res) => {
  const { tradeId, content } = req.body;
  if (!tradeId || !content) {
    return res.status(400).json({ error: "Trade ID and content required" });
  }

  const result = socialNetwork.commentOnTrade(req.user.userId, tradeId, content);
  res.json(result);
});

app.get("/api/social/comments/:tradeId", (req, res) => {
  const comments = socialNetwork.getTradeComments(req.params.tradeId);
  res.json({ comments, totalComments: comments.length });
});

app.post("/api/social/comments/:commentId/like", authenticateUser, (req, res) => {
  const result = socialNetwork.likeComment(req.params.commentId, req.user.userId);
  res.json(result);
});

app.post("/api/social/comments/:commentId/reply", authenticateUser, (req, res) => {
  const { content } = req.body;
  if (!content) {
    return res.status(400).json({ error: "Content required" });
  }

  const result = socialNetwork.replyToComment(req.params.commentId, req.user.userId, content);
  res.json(result);
});

app.post("/api/social/comments/:commentId/delete", authenticateUser, (req, res) => {
  const result = socialNetwork.deleteComment(req.params.commentId, req.user.userId);
  res.json(result);
});

// ===== SOCIAL ENDPOINTS - PROFILES & BLOCKING =====

app.get("/api/social/profile/:userId", (req, res) => {
  const profile = socialNetwork.getPublicProfile(req.params.userId);
  if (!profile) {
    return res.status(404).json({ error: "Profile not found or private" });
  }
  res.json(profile);
});

app.post("/api/social/profile/update", authenticateUser, (req, res) => {
  const { bio, isPublic } = req.body;
  const result = socialNetwork.updateProfile(req.user.userId, { bio, isPublic });
  res.json(result);
});

app.post("/api/social/block", authenticateUser, (req, res) => {
  const { blockedUserId } = req.body;
  if (!blockedUserId) {
    return res.status(400).json({ error: "User ID required" });
  }

  const result = socialNetwork.blockUser(req.user.userId, blockedUserId);
  res.json(result);
});

app.post("/api/social/unblock", authenticateUser, (req, res) => {
  const { blockedUserId } = req.body;
  if (!blockedUserId) {
    return res.status(400).json({ error: "User ID required" });
  }

  const result = socialNetwork.unblockUser(req.user.userId, blockedUserId);
  res.json(result);
});

app.get("/api/social/feed", authenticateUser, (req, res) => {
  const feed = socialNetwork.getActivityFeed(req.user.userId);
  res.json({ feed, totalItems: feed.length });
});

// ===== AI IMPROVEMENT & CONTINUOUS UPDATE ENDPOINTS =====

app.get("/api/ai/performance", (req, res) => {
  const metrics = aiEngine.getPerformanceMetrics();
  res.json(metrics);
});

app.get("/api/ai/accuracy", (req, res) => {
  const accuracy = aiEngine.calculateModelAccuracy();
  res.json({ accuracy: `${accuracy.toFixed(2)}%` });
});

app.get("/api/ai/improvements", (req, res) => {
  const timeline = aiEngine.getImprovementTimeline(20);
  res.json({ improvements: timeline, total: timeline.length });
});

app.post("/api/ai/improvements/record", (req, res) => {
  const { category, description, metrics } = req.body;
  if (!category || !description) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const result = aiEngine.recordImprovement({ category, description, metrics });
  res.json(result);
});

app.get("/api/ai/improvements-needed", (req, res) => {
  const areas = aiEngine.getImprovedAreasNeeded();
  res.json(areas);
});

app.get("/api/ai/update-plan", (req, res) => {
  const plan = aiEngine.getContinuousUpdatePlan();
  res.json(plan);
});

app.get("/api/ai/learning-stats", (req, res) => {
  const stats = aiEngine.getLearningStatistics();
  res.json(stats);
});

app.post("/api/ai/feedback", authenticateUser, (req, res) => {
  const { feedback, category } = req.body;
  if (!feedback || !category) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const result = aiEngine.integrateUserFeedback({
    userId: req.user.userId,
    feedback,
    category,
  });
  res.json(result);
});

// ===== CONTINUOUS UPDATE ENDPOINTS =====

app.get("/api/updates/current-version", (req, res) => {
  const version = updateEngine.getCurrentVersionInfo();
  res.json(version);
});

app.get("/api/updates/history", (req, res) => {
  const limit = parseInt(req.query.limit) || 20;
  const history = updateEngine.getReleaseHistory(limit);
  res.json({ updates: history, total: history.length });
});

app.get("/api/updates/roadmap", (req, res) => {
  const roadmap = updateEngine.getRoadmap();
  res.json(roadmap);
});

app.get("/api/updates/upcoming", (req, res) => {
  const upcoming = updateEngine.getUpcomingUpdates();
  res.json(upcoming);
});

app.get("/api/updates/queue", (req, res) => {
  const queue = updateEngine.getUpdateQueue();
  res.json(queue);
});

app.post("/api/updates/queue", (req, res) => {
  const { title, description, category, priority } = req.body;
  if (!title || !description || !category) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const result = updateEngine.queueUpdate({
    title,
    description,
    category,
    priority,
  });
  res.json(result);
});

app.get("/api/updates/metrics", (req, res) => {
  const metrics = updateEngine.getDeploymentMetrics();
  res.json(metrics);
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
