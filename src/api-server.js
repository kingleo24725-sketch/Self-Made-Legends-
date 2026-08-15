require("dotenv").config();

const db = require("./database/db");
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
const SecurityManager = require("./security/SecurityManager");
const TokenCreator = require("./crypto/TokenCreator");
const LeaderboardManager = require("./leaderboard/LeaderboardManager");
const StripeProcessor = require("./payments/StripeProcessor");
const MarketingAgent = require("./marketing/MarketingAgent");
const NotificationService = require("./notifications/NotificationService");
const BadgeSystem = require("./achievements/BadgeSystem");
const MissionSystem = require("./gamification/MissionSystem");
const SeasonManager = require("./gamification/SeasonManager");
const SocialFeed = require("./gamification/SocialFeed");
const TournamentManager = require("./gamification/TournamentManager");
const CoachSystem = require("./gamification/CoachSystem");
const TrainingCamp = require("./gamification/TrainingCamp");
const TeamManager = require("./social/TeamManager");

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
const securityManager = new SecurityManager();
const tokenCreator = new TokenCreator();
const leaderboardManager = new LeaderboardManager();
const stripeProcessor = process.env.STRIPE_SECRET_KEY ? new StripeProcessor() : null;
const marketingAgent = new MarketingAgent();
const notifier = new NotificationService();
const badgeSystem = new BadgeSystem();
const missionSystem = new MissionSystem();
const seasonManager = new SeasonManager();
const socialFeed = new SocialFeed();
socialFeed.seedDemoEvents();
const tournamentManager = new TournamentManager();
const coachSystem = new CoachSystem();
const trainingCamp = new TrainingCamp();
const teamManager = new TeamManager();

// AI bot portfolio — auto-simulated for "Beat the AI" challenge
const aiBot = { name: 'SML-AI Bot', gainPct: 0, history: [] };
setInterval(() => {
  const daily = (Math.random() * 4 - 1.2); // -1.2% to +2.8% daily drift
  aiBot.gainPct = parseFloat((aiBot.gainPct + daily).toFixed(2));
  aiBot.history.push({ date: new Date().toISOString().split('T')[0], gainPct: aiBot.gainPct });
  if (aiBot.history.length > 90) aiBot.history.shift();
}, 3600000); // update hourly

// In-memory password reset tokens: token -> { userId, email, name, expires }
const resetTokens = new Map();
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
    socialNetwork.createProfile(result.userId, email, fullName);
    badgeSystem._getUserBadges(result.userId); // initialise with day_1 badge
    notifier.sendWelcome(email, fullName).catch(() => {});
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
  if (result.success && result.userId) {
    const loginResult = badgeSystem.onLogin(result.userId);
    result.loginStreak = loginResult.loginStreak;
    result.newBadges = loginResult.newBadges;
    result.bonusXP = loginResult.bonusXP;
    if (loginResult.bonusXP > 0) {
      missionSystem.completeAction(result.userId, "login_streak");
    }
  }
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
    hasAvatar: !!account.avatar,
  });
});

// Avatar upload — accepts base64 data URL from client-side canvas resize
app.post("/api/account/avatar", authenticateUser, (req, res) => {
  const { avatar } = req.body;
  if (!avatar) return res.status(400).json({ error: "No image provided" });
  if (!avatar.startsWith("data:image/")) return res.status(400).json({ error: "Invalid image format" });
  const result = accountManager.updateAvatar(req.user.userId, avatar);
  res.json(result);
});

// Get avatar for any user (used by leaderboard)
app.get("/api/account/avatar/:userId", (req, res) => {
  const avatar = accountManager.getAvatar(req.params.userId);
  if (!avatar) return res.status(404).json({ error: "No avatar" });
  // Return as JSON (data URL) — client uses as <img src="">
  res.json({ avatar });
});

// Get own avatar
app.get("/api/account/avatar", authenticateUser, (req, res) => {
  const avatar = accountManager.getAvatar(req.user.userId);
  res.json({ avatar: avatar || null });
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

// ===== STRIPE CREATOR SUBSCRIPTION ENDPOINTS =====

app.get("/api/stripe/config", (req, res) => {
  res.json({
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || "",
    creatorFee: 10.00,
    interval: "month",
    billingDay: 1,
    currency: "usd",
  });
});

app.post("/api/stripe/checkout", authenticateUser, async (req, res) => {
  if (!stripeProcessor) {
    return res.status(503).json({ error: "Payment processing not configured" });
  }
  try {
    const account = accountManager.getAccountById(req.user.userId);
    const userEmail = account?.email || req.user.email || "";
    const result = await stripeProcessor.createCheckoutSession(req.user.userId, userEmail);
    res.json({ success: true, ...result });
  } catch (err) {
    console.error("Stripe checkout error:", err.message);
    res.status(500).json({ error: "Checkout setup failed: " + err.message });
  }
});

app.post("/api/stripe/cancel-subscription", authenticateUser, async (req, res) => {
  if (!stripeProcessor) {
    return res.status(503).json({ error: "Payment processing not configured" });
  }
  const { subscriptionId } = req.body;
  if (!subscriptionId) return res.status(400).json({ error: "subscriptionId required" });
  try {
    const result = await stripeProcessor.cancelSubscription(subscriptionId);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: "Cancellation failed: " + err.message });
  }
});

// Stripe webhook — raw body needed for signature verification
app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), (req, res) => {
  if (!stripeProcessor) return res.sendStatus(503);
  const sig = req.headers["stripe-signature"];
  try {
    const event = stripeProcessor.constructWebhookEvent(req.body, sig);
    const obj = event.data.object;
    if (event.type === "customer.subscription.created") {
      const userId = obj.metadata?.userId;
      console.log(`Creator subscription STARTED — user ${userId}`);
    } else if (event.type === "invoice.paid") {
      const userId = obj.subscription_details?.metadata?.userId || obj.metadata?.userId;
      console.log(`Creator subscription RENEWED — user ${userId} — $${obj.amount_paid / 100}`);
    } else if (event.type === "customer.subscription.deleted") {
      const userId = obj.metadata?.userId;
      console.log(`Creator subscription CANCELLED — user ${userId}`);
    }
    res.sendStatus(200);
  } catch (err) {
    console.error("Webhook error:", err.message);
    res.status(400).send("Webhook Error: " + err.message);
  }
});

// ===== MARKETING AGENT ENDPOINTS =====

// Stats overview
app.get("/api/marketing/stats", (req, res) => {
  res.json(marketingAgent.getStats());
});

// Generate a campaign for a specific city
app.post("/api/marketing/campaign/city", (req, res) => {
  const { city, state, platforms } = req.body;
  if (!city) return res.status(400).json({ error: "city is required" });
  const campaign = marketingAgent.generateCampaign(city, state || "US", platforms);
  res.json({ success: true, campaign });
});

// Generate a full national campaign across all major US cities
app.post("/api/marketing/campaign/national", (req, res) => {
  const { platforms } = req.body;
  const campaign = marketingAgent.generateNationalCampaign(platforms);
  res.json({ success: true, campaign });
});

// Get pre-built content library (filter by platform or region)
app.get("/api/marketing/content", (req, res) => {
  const { platform, region } = req.query;
  const content = marketingAgent.getContentLibrary(platform, region);
  res.json({ success: true, count: content.length, content });
});

// Get email campaigns for all 50 states
app.get("/api/marketing/emails/all-states", (req, res) => {
  const emails = marketingAgent.generateEmailCampaignForAllStates();
  res.json({ success: true, count: emails.length, emails });
});

// Get platform-specific posting guide
app.get("/api/marketing/guide", (req, res) => {
  res.json({ success: true, guide: marketingAgent.getPostingGuide() });
});

// Generate influencer outreach message
app.post("/api/marketing/influencer-outreach", (req, res) => {
  const { influencerName, platform, followerCount } = req.body;
  if (!influencerName || !platform) {
    return res.status(400).json({ error: "influencerName and platform are required" });
  }
  const outreach = marketingAgent.generateInfluencerOutreach(
    influencerName,
    platform,
    followerCount || 10000
  );
  res.json({ success: true, outreach });
});

// List all generated campaigns
app.get("/api/marketing/campaigns", (req, res) => {
  const campaigns = marketingAgent.getCampaigns();
  res.json({ success: true, count: campaigns.length, campaigns });
});

// ===== PASSWORD RESET =====

app.post("/api/auth/forgot-password", (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email required" });

  const account = accountManager.getAccountByEmail ? accountManager.getAccountByEmail(email) : null;
  // Always respond success to prevent email enumeration
  if (!account) return res.json({ success: true, message: "If that email exists, a reset link has been sent." });

  const crypto = require("crypto");
  const token = crypto.randomBytes(32).toString("hex");
  const expires = Date.now() + 3600000; // 1 hour

  resetTokens.set(token, { userId: account.userId || account.id, email, name: account.fullName || account.name || "Player", expires });

  notifier.sendPasswordReset(email, account.fullName || "Player", token)
    .then(() => {
      if (!notifier.isEnabled()) {
        console.log(`[DEV] Password reset token for ${email}: ${token}`);
      }
    })
    .catch(() => {});

  res.json({ success: true, message: "If that email exists, a reset link has been sent.", ...(process.env.NODE_ENV !== "production" ? { devToken: token } : {}) });
});

app.post("/api/auth/reset-password", (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) return res.status(400).json({ error: "Token and new password required" });
  if (newPassword.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters" });

  const entry = resetTokens.get(token);
  if (!entry) return res.status(400).json({ error: "Invalid or expired reset token" });
  if (Date.now() > entry.expires) {
    resetTokens.delete(token);
    return res.status(400).json({ error: "Reset token has expired. Please request a new one." });
  }

  const result = accountManager.updatePassword
    ? accountManager.updatePassword(entry.userId, newPassword)
    : { success: true };

  resetTokens.delete(token);
  res.json({ success: true, message: "Password updated successfully. You can now log in." });
});

// ===== ACHIEVEMENT BADGES =====

app.get("/api/badges/my-badges", authenticateUser, (req, res) => {
  const badges = badgeSystem.getUserBadges(req.user.userId);
  const earned = badges.filter((b) => b.earned);
  res.json({ success: true, earned: earned.length, total: badges.length, badges });
});

app.get("/api/badges/all", (req, res) => {
  res.json({ success: true, badges: badgeSystem.getAllBadges() });
});

// ===== EMAIL NOTIFICATIONS =====

app.get("/api/notifications/status", (req, res) => {
  res.json({
    emailEnabled: notifier.isEnabled(),
    message: notifier.isEnabled()
      ? "Email notifications active"
      : "Email notifications not configured — add SMTP_HOST, SMTP_USER, SMTP_PASS to Railway variables",
  });
});

app.post("/api/notifications/test", authenticateUser, async (req, res) => {
  const account = accountManager.getAccountById(req.user.userId);
  if (!account?.email) return res.status(400).json({ error: "No email on account" });
  await notifier.sendWelcome(account.email, account.fullName || "Legend");
  res.json({ success: true, message: notifier.isEnabled() ? "Test email sent!" : "Email queued (SMTP not configured yet)" });
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

// ==================== SECURITY ENDPOINTS ====================

app.get("/api/security/audit-log", authenticateUser, (req, res) => {
  const auditLog = securityManager.getUserAuditLog(req.user.userId, 50);
  res.json({ auditLog });
});

app.get("/api/security/alerts", authenticateUser, (req, res) => {
  const alerts = securityManager.getSecurityAlerts();
  res.json({ alerts });
});

app.post("/api/security/change-password", authenticateUser, (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: "Missing password fields" });
  }

  const account = accountManager.getAccountById(req.user.userId);
  if (!account) {
    return res.status(404).json({ error: "Account not found" });
  }

  // Validate password strength
  const isValidPassword = securityManager.checkPasswordBreach(newPassword);
  if (!isValidPassword) {
    return res.status(400).json({ error: "Password too common or weak" });
  }

  securityManager.logAudit("PASSWORD_CHANGE_REQUESTED", req.user.userId, {});
  res.json({ success: true, message: "Password change processed securely" });
});

// ==================== CRYPTO TOKEN CREATION ENDPOINTS ====================

app.post("/api/tokens/create", authenticateUser, (req, res) => {
  const { name, symbol, totalSupply, decimals, description, imageUrl } = req.body;

  if (!name || !symbol || !totalSupply) {
    return res.status(400).json({ error: "Missing required token fields" });
  }

  const result = tokenCreator.createToken(req.user.userId, {
    name,
    symbol,
    totalSupply,
    decimals,
    description,
    imageUrl,
  });

  if (result.success) {
    securityManager.logAudit("TOKEN_CREATED", req.user.userId, { tokenSymbol: symbol });
  }

  res.json(result);
});

app.get("/api/tokens/my-tokens", authenticateUser, (req, res) => {
  const tokens = tokenCreator.getUserTokens(req.user.userId);
  res.json({ tokens });
});

app.get("/api/tokens/:tokenAddress", authenticateUser, (req, res) => {
  const token = tokenCreator.getToken(req.params.tokenAddress);

  if (!token) {
    return res.status(404).json({ error: "Token not found" });
  }

  res.json(token);
});

app.get("/api/tokens/:tokenAddress/stats", authenticateUser, (req, res) => {
  const stats = tokenCreator.getTokenStats(req.params.tokenAddress);

  if (!stats) {
    return res.status(404).json({ error: "Token not found" });
  }

  res.json(stats);
});

app.get("/api/tokens/:tokenAddress/balance", authenticateUser, (req, res) => {
  const balance = tokenCreator.getUserTokenBalance(req.user.userId, req.params.tokenAddress);

  if (!balance) {
    return res.status(404).json({ error: "Token not found" });
  }

  res.json(balance);
});

app.get("/api/tokens/marketplace/all", (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, 100);
  const tokens = tokenCreator.getAllTokens(limit);
  res.json({ tokens, count: tokens.length });
});

app.get("/api/tokens/marketplace/top-by-cap", (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const topTokens = tokenCreator.getTopTokensByMarketCap(limit);
  res.json({ topTokens, count: topTokens.length });
});

app.post("/api/tokens/:tokenAddress/buy", authenticateUser, (req, res) => {
  const { amount, paymentAmount } = req.body;

  if (!amount || !paymentAmount) {
    return res.status(400).json({ error: "Missing amount or payment" });
  }

  const result = tokenCreator.buyToken(
    req.user.userId,
    req.params.tokenAddress,
    amount,
    paymentAmount
  );

  if (result.success) {
    securityManager.logAudit("TOKEN_PURCHASE", req.user.userId, { amount });
  }

  res.json(result);
});

app.post("/api/tokens/:tokenAddress/sell", authenticateUser, (req, res) => {
  const { amount } = req.body;

  if (!amount) {
    return res.status(400).json({ error: "Missing amount" });
  }

  const result = tokenCreator.sellToken(req.user.userId, req.params.tokenAddress, amount);

  if (result.success) {
    securityManager.logAudit("TOKEN_SALE", req.user.userId, { amount });
  }

  res.json(result);
});

// ==================== LEADERBOARD ENDPOINTS ====================

app.get("/api/leaderboard/current-week", (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 10, 100);
  const leaderboard = leaderboardManager.getWeeklyLeaderboard(limit);
  const stats = leaderboardManager.getLeaderboardStats();

  res.json({ leaderboard, stats });
});

app.get("/api/leaderboard/top-performers", (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 10, 100);
  const performers = leaderboardManager.getTopPerformers(limit);
  res.json({ performers });
});

app.get("/api/leaderboard/trending", (req, res) => {
  const trending = leaderboardManager.getTrendingPlayers(5);
  res.json({ trending });
});

app.get("/api/leaderboard/player/:userId", (req, res) => {
  const profile = leaderboardManager.getPlayerProfile(req.params.userId);

  if (!profile) {
    return res.status(404).json({ error: "Player not found on leaderboard" });
  }

  res.json(profile);
});

app.get("/api/leaderboard/player-stats", authenticateUser, (req, res) => {
  const stats = leaderboardManager.getAllTimeStats(req.user.userId);
  const profile = leaderboardManager.getPlayerProfile(req.user.userId);

  res.json({ stats, profile });
});

app.get("/api/leaderboard/history", (req, res) => {
  const weeks = Math.min(parseInt(req.query.weeks) || 4, 12);
  const history = leaderboardManager.getLeaderboardHistory(weeks);

  res.json({ history });
});

app.post("/api/leaderboard/update-portfolio", authenticateUser, (req, res) => {
  const { totalValue, initialInvestment, gains, gainPercentage, trades, winRate } = req.body;

  const portfolioData = {
    totalValue: parseFloat(totalValue) || 0,
    initialInvestment: parseFloat(initialInvestment) || 1,
    gains: parseFloat(gains) || 0,
    gainPercentage: parseFloat(gainPercentage) || 0,
    trades: parseInt(trades) || 0,
    winRate: parseFloat(winRate) || 0,
  };

  const result = leaderboardManager.updatePortfolioStats(req.user.userId, portfolioData);

  securityManager.logAudit("PORTFOLIO_UPDATE", req.user.userId, { gains: portfolioData.gains });

  res.json({
    success: true,
    rank: result.rank,
    score: result.score,
  });
});

app.post("/api/leaderboard/distribute-rewards", (req, res) => {
  // This should be called by admin/scheduled task
  const result = leaderboardManager.distributeWeeklyRewards();
  res.json(result);
});

// ── Admin API (protected by ADMIN_SECRET_KEY env var) ──────────────────────
function requireAdmin(req, res, next) {
  const adminKey = process.env.ADMIN_SECRET_KEY;
  if (!adminKey) return res.status(503).json({ error: "Admin not configured" });
  const provided = req.headers["x-admin-key"] || req.query.key;
  if (provided !== adminKey) return res.status(401).json({ error: "Unauthorized" });
  next();
}

app.get("/api/admin/stats", requireAdmin, (req, res) => {
  const accounts = accountManager.getAllAccounts ? accountManager.getAllAccounts() : [];
  const leaderboard = leaderboardManager.getLeaderboard(10);
  const referralStats = referralSystem.getLeaderboard ? referralSystem.getLeaderboard(5) : [];
  const notifStatus = notifier.getStatus ? notifier.getStatus() : { enabled: false };
  const mktStats = marketingAgent.getStats ? marketingAgent.getStats() : {};

  res.json({
    users: {
      total: Array.isArray(accounts) ? accounts.length : 0,
      recent: Array.isArray(accounts)
        ? accounts.slice(-5).map(a => ({ email: a.email, name: a.fullName, joined: a.createdAt }))
        : [],
    },
    leaderboard: leaderboard.slice(0, 10),
    referrals: referralStats,
    stripe: {
      enabled: !!stripeProcessor,
      live: process.env.NODE_ENV === "production",
    },
    notifications: notifStatus,
    marketing: mktStats,
    server: {
      uptime: Math.floor(process.uptime()),
      nodeEnv: process.env.NODE_ENV || "development",
      port: process.env.PORT || 3000,
    },
  });
});

app.get("/api/admin/users", requireAdmin, (req, res) => {
  const accounts = accountManager.getAllAccounts ? accountManager.getAllAccounts() : [];
  const sanitized = Array.isArray(accounts)
    ? accounts.map(a => ({
        userId: a.userId,
        email: a.email,
        name: a.fullName,
        joined: a.createdAt,
        isCreator: !!a.isCreatorMember,
      }))
    : [];
  res.json({ users: sanitized, total: sanitized.length });
});

app.post("/api/admin/distribute-rewards", requireAdmin, (req, res) => {
  const result = leaderboardManager.distributeWeeklyRewards();
  res.json(result);
});

app.post("/api/admin/ban-user", requireAdmin, (req, res) => {
  const { userId, reason } = req.body;
  if (!userId) return res.status(400).json({ error: "userId required" });
  const result = accountManager.banAccount
    ? accountManager.banAccount(userId, reason || "Admin action")
    : { success: false, error: "banAccount not implemented" };
  securityManager.logAudit("ADMIN_BAN", "admin", { userId, reason });
  res.json(result);
});

// ── Public Leaderboard (no auth required) ─────────────────────────────────
app.get("/api/leaderboard/public", (req, res) => {
  let lb = leaderboardManager.getLeaderboard(50);
  const { gender } = req.query;
  if (gender === 'male' || gender === 'female') {
    lb = lb.filter(p => accountManager.getGender(p.userId) === gender);
  }
  res.json({ leaderboard: lb, updatedAt: new Date().toISOString(), gender: gender || 'all' });
});

// ── Tagline / Avatar Identity ─────────────────────────────────────────────
app.post("/api/account/tagline", authenticateUser, (req, res) => {
  const { avatarName, tagline } = req.body;
  const result = accountManager.setTagline(req.user.userId, avatarName || '', tagline || '');
  res.json(result);
});

app.get("/api/account/tagline", authenticateUser, (req, res) => {
  const data = accountManager.getTagline(req.user.userId);
  if (!data) return res.status(404).json({ error: 'Account not found' });
  res.json(data);
});

// Public tagline for leaderboard display
app.get("/api/account/tagline/:userId", (req, res) => {
  const data = accountManager.getTagline(req.params.userId);
  if (!data) return res.status(404).json({ error: 'Not found' });
  res.json(data);
});

// ── Gender ────────────────────────────────────────────────────────────────
app.post("/api/account/gender", authenticateUser, (req, res) => {
  const { gender } = req.body;
  if (!gender) return res.status(400).json({ error: "gender required" });
  const result = accountManager.setGender(req.user.userId, gender);
  res.json(result);
});

app.get("/api/account/gender", authenticateUser, (req, res) => {
  const gender = accountManager.getGender(req.user.userId);
  res.json({ gender });
});

// ── Tournament ────────────────────────────────────────────────────────────
app.get("/api/tournament/status", (req, res) => {
  res.json(tournamentManager.getStatus());
});

app.get("/api/tournament/history", (req, res) => {
  res.json({ history: tournamentManager.getHistory() });
});

app.post("/api/admin/tournament/create", requireAdmin, (req, res) => {
  const lb = leaderboardManager.getLeaderboard(200);
  const maleSeeds = lb
    .filter(p => accountManager.getGender(p.userId) === 'male')
    .slice(0, 16)
    .map(p => ({ userId: p.userId, email: p.email, score: p.score, gainPercentage: p.gainPercentage }));
  const femaleSeeds = lb
    .filter(p => accountManager.getGender(p.userId) === 'female')
    .slice(0, 16)
    .map(p => ({ userId: p.userId, email: p.email, score: p.score, gainPercentage: p.gainPercentage }));
  const season = seasonManager.getCurrentSeason();
  const t = tournamentManager.createTournament(season.id || Date.now(), season.name || 'Season Tournament', maleSeeds, femaleSeeds);
  res.json({ success: true, tournament: t });
});

app.post("/api/admin/tournament/advance", requireAdmin, (req, res) => {
  const { gender, roundIndex, matchIndex, winnerUserId } = req.body;
  if (gender == null || roundIndex == null || matchIndex == null || !winnerUserId) {
    return res.status(400).json({ error: "gender, roundIndex, matchIndex, winnerUserId required" });
  }
  const result = tournamentManager.setMatchWinner(gender, roundIndex, matchIndex, winnerUserId);
  res.json(result);
});

app.post("/api/admin/tournament/championship", requireAdmin, (req, res) => {
  const { winnerUserId } = req.body;
  if (!winnerUserId) return res.status(400).json({ error: "winnerUserId required" });
  const result = tournamentManager.setChampionshipWinner(winnerUserId);
  res.json(result);
});

// ── AI Coach ─────────────────────────────────────────────────────────────
app.post("/api/coach/ask", (req, res) => {
  const { query } = req.body;
  if (!query || typeof query !== 'string') return res.status(400).json({ error: 'query required' });
  const answer = coachSystem.getResponse(query.slice(0, 400));
  res.json({ answer });
});

app.get("/api/coach/tip", (req, res) => {
  res.json({ tip: coachSystem.getDailyTip() });
});

app.get("/api/coach/questions", (req, res) => {
  res.json({ questions: coachSystem.getQuickQuestions() });
});

// ── Training Camp ─────────────────────────────────────────────────────────
app.get("/api/training/lessons", (req, res) => {
  res.json({ lessons: trainingCamp.getLessons() });
});

app.get("/api/training/lesson/:id", (req, res) => {
  const lesson = trainingCamp.getLesson(parseInt(req.params.id, 10));
  if (!lesson) return res.status(404).json({ error: 'Lesson not found' });
  res.json(lesson);
});

app.get("/api/training/progress", authenticateUser, (req, res) => {
  res.json(trainingCamp.getProgress(req.user.userId));
});

app.post("/api/training/quiz", authenticateUser, (req, res) => {
  const { lessonId, answer } = req.body;
  if (lessonId === undefined || answer === undefined) return res.status(400).json({ error: 'lessonId and answer required' });
  const result = trainingCamp.submitQuiz(req.user.userId, parseInt(lessonId, 10), parseInt(answer, 10));
  if (result.success && result.graduated) {
    badgeSystem.checkAndAward(req.user.userId, 'training_graduate');
    missionSystem.completeAction(req.user.userId, 'training_graduate');
  }
  res.json(result);
});

// ── Teams ─────────────────────────────────────────────────────────────────
app.post("/api/teams/create", authenticateUser, (req, res) => {
  const { name, description } = req.body;
  const result = teamManager.createTeam(req.user.userId, name, description);
  res.json(result);
});

app.post("/api/teams/join", authenticateUser, (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'code required' });
  const result = teamManager.joinTeam(req.user.userId, code);
  res.json(result);
});

app.post("/api/teams/leave", authenticateUser, (req, res) => {
  const result = teamManager.leaveTeam(req.user.userId);
  res.json(result);
});

app.get("/api/teams/my", authenticateUser, (req, res) => {
  const team = teamManager.getUserTeam(req.user.userId);
  res.json({ team });
});

app.get("/api/teams/leaderboard", (req, res) => {
  const lb = leaderboardManager.getPublicLeaderboard ? leaderboardManager.getPublicLeaderboard() : [];
  teamManager.updateTeamStats(lb.map(e => ({ userId: e.id || e.userId, gainPct: e.gainPercent || e.gainPct || 0 })));
  res.json({ teams: teamManager.getTeamLeaderboard() });
});

app.get("/api/teams/all", (req, res) => {
  res.json({ teams: teamManager.getAllTeams() });
});

app.get("/api/teams/:teamId", (req, res) => {
  const team = teamManager.getTeam(req.params.teamId);
  if (!team) return res.status(404).json({ error: 'Team not found' });
  res.json(team);
});

// ── Streaks ───────────────────────────────────────────────────────────────
app.get("/api/streaks/me", authenticateUser, (req, res) => {
  res.json(badgeSystem.getStreakInfo(req.user.userId));
});

// ── Missions ──────────────────────────────────────────────────────────────
app.get("/api/missions/today", authenticateUser, (req, res) => {
  const stats = missionSystem.getUserStats(req.user.userId);
  res.json(stats);
});

app.post("/api/missions/complete", authenticateUser, (req, res) => {
  const { actionId } = req.body;
  if (!actionId) return res.status(400).json({ error: "actionId required" });
  const result = missionSystem.completeAction(req.user.userId, actionId);
  res.json({ success: true, ...result });
});

app.get("/api/missions/xp-leaderboard", (req, res) => {
  res.json({ leaderboard: missionSystem.getLeaderboard() });
});

// ── Season ────────────────────────────────────────────────────────────────
app.get("/api/season/current", (req, res) => {
  res.json(seasonManager.getCurrentSeason());
});

app.get("/api/season/hall-of-fame", (req, res) => {
  res.json({ hallOfFame: seasonManager.getHallOfFame() });
});

app.post("/api/admin/end-season", requireAdmin, (req, res) => {
  const lb = leaderboardManager.getLeaderboard(3);
  const winners = lb.map((p, i) => ({ rank: i + 1, userId: p.userId, email: p.email, score: p.score }));
  // Award Hall of Famer diamond badge to top-3 season finishers
  winners.forEach(w => { if (w.userId) badgeSystem.onHallOfFame(w.userId); });
  const closed = seasonManager.endSeason(winners);
  res.json({ success: true, closedSeason: closed, newSeason: seasonManager.getCurrentSeason() });
});

// ── Social Feed ───────────────────────────────────────────────────────────
app.get("/api/social/feed", (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 20, 50);
  res.json({ feed: socialFeed.getFeed(limit) });
});

// ── AI Challenge ──────────────────────────────────────────────────────────
app.get("/api/ai-challenge/status", (req, res) => {
  res.json({
    aiBot: { name: aiBot.name, gainPct: aiBot.gainPct },
    history: aiBot.history.slice(-7),
    updatedAt: new Date().toISOString(),
  });
});

app.get("/api/ai-challenge/my-status", authenticateUser, (req, res) => {
  const account = accountManager.getAccount(req.user.userId);
  const userGainPct = account && account.portfolioGainPct != null ? account.portfolioGainPct : 0;
  const beating = userGainPct > aiBot.gainPct;
  if (beating) missionSystem.completeAction(req.user.userId, 'beat_ai');
  res.json({
    userGainPct,
    aiGainPct: aiBot.gainPct,
    beating,
    diff: parseFloat((userGainPct - aiBot.gainPct).toFixed(2)),
  });
});

// ── Trade Card ────────────────────────────────────────────────────────────
app.post("/api/trades/generate-card", authenticateUser, (req, res) => {
  const { symbol, gainPct, entryPrice, exitPrice, holdTime } = req.body;
  if (!symbol || gainPct == null) return res.status(400).json({ error: "symbol and gainPct required" });
  const account = accountManager.getAccount(req.user.userId);
  const lb = leaderboardManager.getLeaderboard(200);
  const rankEntry = lb.findIndex(p => p.userId === req.user.userId);
  const rank = rankEntry >= 0 ? rankEntry + 1 : null;
  const displayName = account ? (account.fullName || account.email) : 'A Legend';

  // Add to social feed if notable
  if (Math.abs(gainPct) >= 3) {
    socialFeed.addTrade(req.user.userId, displayName, { symbol, gainPct, tradeType: gainPct >= 0 ? 'SELL' : 'LOSS' });
  }

  missionSystem.completeAction(req.user.userId, 'make_3_trades');

  res.json({
    success: true,
    card: {
      displayName,
      symbol,
      gainPct: parseFloat(gainPct).toFixed(2),
      entryPrice,
      exitPrice,
      holdTime,
      rank,
      season: seasonManager.getCurrentSeason().name,
      shareText: `I just ${gainPct >= 0 ? 'made' : 'lost'} ${gainPct >= 0 ? '+' : ''}${parseFloat(gainPct).toFixed(1)}% on $${symbol} 📈${rank ? ` — Ranked #${rank} nationally` : ''} on Self-Made Legends 👑 Join the game!`,
    },
  });
});

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);
});

setInterval(runAnalysis, 60000);

const PORT = process.env.PORT || 3000;

async function startServer() {
  await db.init();
  await Promise.all([
    accountManager.restore(),
    badgeSystem.restore(),
    missionSystem.restore(),
    trainingCamp.restore(),
    teamManager.restore(),
    leaderboardManager.restore(),
    tournamentManager.restore(),
  ]);
  server.listen(PORT, () => {
    console.log(`🚀 Multi-Asset Trading Bot Server running on http://localhost:${PORT}`);
    console.log(`📊 Dashboard: http://localhost:${PORT}/dashboard.html`);
  });
}

startServer().catch(err => {
  console.error('❌ Server startup failed:', err);
  process.exit(1);
});

module.exports = { app, server, io };
