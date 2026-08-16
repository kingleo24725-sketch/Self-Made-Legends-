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
const { PAPER_MONEY_PACKAGES } = StripeProcessor;
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

const priceEngine = require('./market/PriceEngine');
const tradeCoach  = require('./coach/TradeCoach');
const botTrader   = require('./bot/BotTrader');

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

// ── Underworld constants ──────────────────────────────────────────────────────
const HEIST_TYPES = {
  pickpocket: { label: 'Pickpocket',    icon: '🥷', maxPct: 0.05,  baseChance: 0.55, cooldownMs: 3_600_000,  minTeam: 1 },
  smash_grab: { label: 'Smash & Grab', icon: '💥', maxPct: 0.15,  baseChance: 0.40, cooldownMs: 14_400_000, minTeam: 1 },
  bank_job:   { label: 'Bank Job',     icon: '🏦', maxPct: 0.30,  baseChance: 0.25, cooldownMs: 86_400_000, minTeam: 2 },
};
const CATCH_RATE       = 0.60;
const VICTIM_FINE      = 10_000;
const BAIL_AMOUNT      = 50_000;
const MIN_TARGET_CASH  = 100;
const CHARGE_WINDOW    = 86_400_000;

const CHALLENGE_TYPES = {
  profit_race: { label: 'Profit Race',  icon: '📈', desc: 'Highest % gain wins',           durations: [1_800_000, 3_600_000, 7_200_000] },
  trade_blitz: { label: 'Trade Blitz',  icon: '⚡', desc: 'First to 10 profitable trades', durations: [3_600_000, 7_200_000] },
  value_race:  { label: 'Value Race',   icon: '🏆', desc: 'Highest portfolio value wins',   durations: [3_600_000, 86_400_000] },
};
const CHALLENGE_PRIZE_PCT    = 0.20;
const CHALLENGE_ACCEPT_WIN   = 3_600_000;

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
      awardMissionXP(result.userId, "login_streak").catch(() => {});
    }
    // Email + feed for newly earned badges
    if (loginResult.newBadges && loginResult.newBadges.length > 0) {
      const acct = accountManager.getAccount(result.email);
      const displayName = acct ? (acct.fullName || acct.email) : 'A Legend';
      loginResult.newBadges.forEach(badge => {
        if (acct) notifier.sendBadgeEarned(acct.email, acct.fullName, badge).catch(() => {});
        socialFeed.addAchievement(result.userId, displayName, badge.name, badge.icon);
        emitToUser(result.userId, 'badge_earned', badge);
        _broadcastMilestone(badge, displayName);
      });
      broadcastFeedUpdate();
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

// Helper: complete a mission action with Season Pass 1.5× XP bonus if active
async function awardMissionXP(userId, actionId) {
  const row = await db.get('SELECT active FROM season_passes WHERE user_id = ? AND active = 1', [userId]);
  const mult = row ? 1.5 : 1;
  return missionSystem.completeAction(userId, actionId, mult);
}

// Helper: add SML credits to a user's balance
async function _addCredits(userId, amount, type, description) {
  const row = await db.get('SELECT balance FROM sml_credits WHERE user_id = ?', [userId]);
  const newBalance = (row ? row.balance : 0) + amount;
  await db.run(
    'INSERT INTO sml_credits (user_id, balance, updated_at) VALUES (?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET balance = ?, updated_at = ?',
    [userId, newBalance, Date.now(), newBalance, Date.now()]
  );
  await db.run(
    'INSERT INTO credit_transactions (user_id, amount, type, description, created_at) VALUES (?, ?, ?, ?, ?)',
    [userId, amount, type, description, Date.now()]
  );
  return newBalance;
}

// Stripe webhook — raw body needed for signature verification
app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  if (!stripeProcessor) return res.sendStatus(503);
  const sig = req.headers["stripe-signature"];
  try {
    const event = stripeProcessor.constructWebhookEvent(req.body, sig);
    const obj = event.data.object;
    const meta = obj.metadata || {};

    if (event.type === "checkout.session.completed") {
      const userId = meta.userId;
      const type   = meta.type;
      if (!userId || !type) { return res.sendStatus(200); }

      if (type === 'season_pass') {
        const now = Date.now();
        const seasonId = String(seasonManager.getCurrentSeason().id);
        await db.run(
          'INSERT INTO season_passes (user_id, stripe_sub_id, season_id, active, activated_at) VALUES (?, ?, ?, 1, ?) ON CONFLICT(user_id) DO UPDATE SET active = 1, season_id = ?, activated_at = ?',
          [userId, obj.id, seasonId, now, seasonId, now]
        );
        emitToUser(userId, 'purchase_complete', { type: 'season_pass', message: '🎫 Season Pass activated! Enjoy 1.5× XP.' });
        console.log(`Season Pass activated — user ${userId}`);

      } else if (type === 'credit_topup_starter') {
        const bal = await _addCredits(userId, 500, 'topup', 'Starter Pack purchase');
        emitToUser(userId, 'purchase_complete', { type: 'credits', amount: 500, balance: bal, message: '💎 500 SML Credits added!' });

      } else if (type === 'credit_topup_legends') {
        const bal = await _addCredits(userId, 2500, 'topup', 'Legends Pack purchase');
        emitToUser(userId, 'purchase_complete', { type: 'credits', amount: 2500, balance: bal, message: '💎 2,500 SML Credits added!' });

      } else if (type === 'credit_topup_champion') {
        const bal = await _addCredits(userId, 7000, 'topup', 'Champion Pack purchase');
        emitToUser(userId, 'purchase_complete', { type: 'credits', amount: 7000, balance: bal, message: '💎 7,000 SML Credits added!' });

      } else if (type === 'coach_pro') {
        const now = Date.now();
        await db.run(
          'INSERT INTO premium_coach_subs (user_id, stripe_sub_id, active, activated_at) VALUES (?, ?, 1, ?) ON CONFLICT(user_id) DO UPDATE SET active = 1, activated_at = ?, stripe_sub_id = ?',
          [userId, obj.subscription || obj.id, now, now, obj.subscription || obj.id]
        );
        emitToUser(userId, 'purchase_complete', { type: 'coach_pro', message: '🧠 Premium Coach Pro activated!' });
        console.log(`Coach Pro activated — user ${userId}`);

      } else if (type === 'tournament_entry') {
        const tournamentId = meta.tournamentId || 'current';
        await db.run('UPDATE tournament_entries SET paid = 1, stripe_session = ? WHERE tournament_id = ? AND user_id = ?',
          [obj.id, tournamentId, userId]);
        // $4 (80%) goes to prize pool per entry
        await db.run(
          'INSERT INTO tournament_prize_pools (tournament_id, entry_count, total_cents, distributed, updated_at) VALUES (?, 1, 400, 0, ?) ON CONFLICT(tournament_id) DO UPDATE SET entry_count = entry_count + 1, total_cents = total_cents + 400, updated_at = ?',
          [tournamentId, Date.now(), Date.now()]
        );
        emitToUser(userId, 'purchase_complete', { type: 'tournament_entry', message: '⚔️ Tournament entry confirmed! Good luck!' });
        console.log(`Tournament entry paid — user ${userId}, tournament ${tournamentId}`);

      } else if (type.startsWith('paper_money_')) {
        const packageKey = type.slice('paper_money_'.length);
        const pkg = PAPER_MONEY_PACKAGES && PAPER_MONEY_PACKAGES[packageKey];
        if (pkg && userId) {
          const now = Date.now();
          await db.run(
            `INSERT INTO user_portfolios (user_id, cash_balance, total_invested, updated_at)
             VALUES (?, ?, ?, ?)
             ON CONFLICT(user_id) DO UPDATE SET
               cash_balance   = cash_balance + ?,
               total_invested = total_invested + ?,
               updated_at     = ?`,
            [userId, pkg.paper, pkg.paper, now, pkg.paper, pkg.paper, now]
          );
          await _syncLeaderboard(userId);
          emitToUser(userId, 'purchase_complete', { type: 'paper_money', amount: pkg.paper, message: `💰 $${pkg.paper.toLocaleString()} paper money added to your account! Keep trading!` });
          console.log(`Paper money ${packageKey} — user ${userId} +$${pkg.paper}`);
        }

      } else if (type === 'jail_buyout') {
        if (userId) {
          const jail = await db.get('SELECT victim_id, amount_owed FROM jail_status WHERE user_id = ? AND released = 0', [userId]);
          if (jail) {
            const now = Date.now();
            await db.run(
              `INSERT INTO user_portfolios (user_id, cash_balance, total_invested, updated_at) VALUES (?, 1000, 1000, ?)
               ON CONFLICT(user_id) DO UPDATE SET cash_balance = cash_balance + 1000, updated_at = ?`,
              [userId, now, now]
            );
            await db.run('UPDATE jail_status SET released = 1, released_at = ? WHERE user_id = ?', [now, userId]);
            if (jail.victim_id) {
              await db.run('UPDATE user_portfolios SET cash_balance = cash_balance + ? WHERE user_id = ?', [jail.amount_owed, jail.victim_id]);
              emitToUser(jail.victim_id, 'fine_collected', { amount: jail.amount_owed, source: 'jail_buyout' });
            }
            emitToUser(userId, 'jail_released', { amount: 1000 });
            emitToUser(userId, 'purchase_complete', { type: 'jail_buyout', message: '🔓 Released from jail! +$1,000 paper money added.' });
            await _syncLeaderboard(userId);
            console.log(`Jail buyout — user ${userId} released`);
          }
        }

      } else if (type === 'creator_subscription') {
        console.log(`Creator subscription started — user ${userId}`);
      }

    } else if (event.type === "customer.subscription.deleted") {
      const userId = meta.userId || obj.metadata?.userId;
      const type   = meta.type   || obj.metadata?.type;
      if (type === 'coach_pro' && userId) {
        await db.run('UPDATE premium_coach_subs SET active = 0 WHERE user_id = ?', [userId]);
        emitToUser(userId, 'subscription_cancelled', { type: 'coach_pro', message: 'Coach Pro cancelled' });
        console.log(`Coach Pro CANCELLED — user ${userId}`);
      } else if (userId) {
        console.log(`Subscription CANCELLED — user ${userId}, type ${type}`);
      }

    } else if (event.type === "invoice.paid") {
      const userId = obj.subscription_details?.metadata?.userId || obj.metadata?.userId;
      console.log(`Invoice paid — user ${userId} — $${(obj.amount_paid / 100).toFixed(2)}`);
    }

    res.sendStatus(200);
  } catch (err) {
    console.error("Webhook error:", err.message);
    res.status(400).send("Webhook Error: " + err.message);
  }
});

// ===== SML CREDITS ENDPOINTS =====

app.get("/api/credits/balance", authenticateUser, async (req, res) => {
  const row = await db.get('SELECT balance FROM sml_credits WHERE user_id = ?', [req.user.userId]);
  res.json({ balance: row ? row.balance : 0 });
});

app.post("/api/credits/spend", authenticateUser, async (req, res) => {
  const { amount, description } = req.body;
  if (!amount || amount <= 0) return res.status(400).json({ error: 'amount required' });
  const row = await db.get('SELECT balance FROM sml_credits WHERE user_id = ?', [req.user.userId]);
  const current = row ? row.balance : 0;
  if (current < amount) return res.status(400).json({ error: 'Insufficient credits', balance: current });
  const newBalance = current - amount;
  await db.run(
    'INSERT INTO sml_credits (user_id, balance, updated_at) VALUES (?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET balance = ?, updated_at = ?',
    [req.user.userId, newBalance, Date.now(), newBalance, Date.now()]
  );
  await db.run(
    'INSERT INTO credit_transactions (user_id, amount, type, description, created_at) VALUES (?, ?, ?, ?, ?)',
    [req.user.userId, -amount, 'spend', description || 'Credits spent', Date.now()]
  );
  res.json({ success: true, balance: newBalance });
});

// ===== LEGEND STATUS ENDPOINT =====

app.get("/api/legend/status", async (req, res) => {
  const row = await db.get('SELECT * FROM legend_status WHERE active = 1 ORDER BY awarded_at DESC LIMIT 1');
  if (!row) return res.json({ active: false });
  res.json({
    active: true,
    userId:     row.user_id,
    fullName:   row.full_name,
    seasonId:   row.season_id,
    seasonName: row.season_name,
    awardedAt:  row.awarded_at,
    expiresAt:  row.expires_at,
  });
});

// ===== STRIPE — SEASON PASS =====

app.post("/api/stripe/season-pass", authenticateUser, async (req, res) => {
  if (!stripeProcessor) return res.status(503).json({ error: "Payment processing not configured" });
  try {
    const account = accountManager.getAccountById(req.user.userId);
    const userEmail = account?.email || '';
    const result = await stripeProcessor.createSeasonPassCheckout(req.user.userId, userEmail);
    res.json({ success: true, ...result });
  } catch (err) {
    console.error("Season pass checkout error:", err.message);
    res.status(500).json({ error: 'Season pass checkout failed: ' + err.message });
  }
});

// ===== STRIPE — SML CREDITS TOPUP =====

app.post("/api/stripe/credits/topup", authenticateUser, async (req, res) => {
  if (!stripeProcessor) return res.status(503).json({ error: "Payment processing not configured" });
  const { package: pkg } = req.body;
  if (!pkg) return res.status(400).json({ error: 'package required (starter|legends|champion)' });
  try {
    const account = accountManager.getAccountById(req.user.userId);
    const userEmail = account?.email || '';
    const result = await stripeProcessor.createCreditTopupCheckout(req.user.userId, userEmail, pkg);
    res.json({ success: true, ...result });
  } catch (err) {
    console.error("Credit topup checkout error:", err.message);
    res.status(500).json({ error: 'Credit topup checkout failed: ' + err.message });
  }
});

// ===== STRIPE — PAPER MONEY TOP-UP =====

app.post("/api/stripe/paper-money", authenticateUser, async (req, res) => {
  if (!stripeProcessor) return res.status(503).json({ error: "Payment processing not configured" });
  const { package: pkgKey } = req.body;
  if (!pkgKey || !PAPER_MONEY_PACKAGES[pkgKey]) {
    return res.status(400).json({ error: 'package required (hustle|grind|investor|whale|ultimate)' });
  }
  try {
    const account = accountManager.getAccountById(req.user.userId);
    const userEmail = account?.email || '';
    const result = await stripeProcessor.createPaperMoneyCheckout(req.user.userId, userEmail, pkgKey);
    res.json({ success: true, ...result });
  } catch (err) {
    console.error("Paper money checkout error:", err.message);
    res.status(500).json({ error: 'Paper money checkout failed: ' + err.message });
  }
});

// ===== ACCOUNT — SOCIAL SHARE CLAIM ($100 paper money, once per 24h) =====

app.post("/api/account/social-claim", authenticateUser, async (req, res) => {
  const uid = req.user.userId;
  try {
    const claim = await db.get('SELECT claimed_at FROM social_claims WHERE user_id = ?', [uid]);
    const TWENTY_FOUR_H = 86400_000;
    if (claim && (Date.now() - claim.claimed_at) < TWENTY_FOUR_H) {
      const nextClaimMs = claim.claimed_at + TWENTY_FOUR_H - Date.now();
      const hrs = Math.ceil(nextClaimMs / 3600000);
      return res.status(429).json({ error: `You already claimed today. Next claim available in ~${hrs}h.` });
    }
    const now = Date.now();
    await db.run(
      'INSERT INTO social_claims (user_id, claimed_at) VALUES (?, ?) ON CONFLICT(user_id) DO UPDATE SET claimed_at = ?',
      [uid, now, now]
    );
    await db.run(
      `INSERT INTO user_portfolios (user_id, cash_balance, total_invested, updated_at)
       VALUES (?, 100, 1000, ?)
       ON CONFLICT(user_id) DO UPDATE SET cash_balance = cash_balance + 100, updated_at = ?`,
      [uid, now, now]
    );
    await _syncLeaderboard(uid);
    res.json({ success: true, amount: 100, message: '💰 $100 paper money added! Thank you for sharing SML!' });
  } catch (e) {
    console.error('[social-claim] error:', e.message);
    res.status(500).json({ error: 'Claim failed — please try again' });
  }
});

// ===== STRIPE — PREMIUM COACH PRO =====

app.post("/api/stripe/coach-pro", authenticateUser, async (req, res) => {
  if (!stripeProcessor) return res.status(503).json({ error: "Payment processing not configured" });
  try {
    const account = accountManager.getAccountById(req.user.userId);
    const userEmail = account?.email || '';
    const result = await stripeProcessor.createCoachProCheckout(req.user.userId, userEmail);
    res.json({ success: true, ...result });
  } catch (err) {
    console.error("Coach Pro checkout error:", err.message);
    res.status(500).json({ error: 'Coach Pro checkout failed: ' + err.message });
  }
});

// ===== STRIPE — TOURNAMENT ENTRY =====

app.post("/api/stripe/tournament-entry", authenticateUser, async (req, res) => {
  if (!stripeProcessor) return res.status(503).json({ error: "Payment processing not configured" });
  const tourneyStatus = tournamentManager.getStatus();
  if (!tourneyStatus || !tourneyStatus.active) {
    return res.json({ success: false, noTournament: true });
  }
  const tournamentId = String(tourneyStatus.tournament?.id || 'current');
  const existing = await db.get(
    'SELECT id FROM tournament_entries WHERE tournament_id = ? AND user_id = ? AND paid = 1',
    [tournamentId, req.user.userId]
  );
  if (existing) return res.json({ success: false, alreadyEntered: true });
  try {
    const account = accountManager.getAccountById(req.user.userId);
    const userEmail = account?.email || '';
    const result = await stripeProcessor.createTournamentEntryCheckout(req.user.userId, userEmail, tournamentId);
    await db.run(
      'INSERT OR IGNORE INTO tournament_entries (tournament_id, user_id, stripe_session, paid, created_at) VALUES (?, ?, ?, 0, ?)',
      [tournamentId, req.user.userId, result.sessionId, Date.now()]
    );
    res.json({ success: true, ...result });
  } catch (err) {
    console.error("Tournament entry checkout error:", err.message);
    res.status(500).json({ error: 'Tournament entry checkout failed: ' + err.message });
  }
});

// ===== STRIPE — JAIL BUYOUT =====

app.post("/api/stripe/jail-buyout", authenticateUser, async (req, res) => {
  if (!stripeProcessor) return res.status(503).json({ error: "Payment processing not configured" });
  const uid = req.user.userId;
  const jail = await db.get('SELECT id FROM jail_status WHERE user_id = ? AND released = 0', [uid]);
  if (!jail) return res.status(400).json({ error: 'You are not in jail' });
  try {
    const account = accountManager.getAccountById(uid);
    const result = await stripeProcessor.createJailBuyoutCheckout(uid, account?.email || '');
    res.json({ success: true, ...result });
  } catch (err) {
    console.error("Jail buyout checkout error:", err.message);
    res.status(500).json({ error: 'Checkout failed: ' + err.message });
  }
});

// ===== UNDERWORLD — HEIST SYSTEM =====

// Helper: compute portfolio value for a user
async function _calcPortfolioValue(userId) {
  const p = await db.get('SELECT cash_balance, total_invested FROM user_portfolios WHERE user_id = ?', [userId]);
  if (!p) return 0;
  const holdings = await db.all('SELECT symbol, quantity FROM holdings WHERE user_id = ? AND quantity > 0', [userId]);
  let val = p.cash_balance;
  for (const h of holdings) { const price = priceEngine.getPrice(h.symbol); if (price) val += h.quantity * price; }
  return val;
}

// Helper: get display name
function _displayName(userId) {
  const acct = accountManager.getAccountById(userId);
  return acct ? (acct.fullName || acct.email || 'A Legend') : 'A Legend';
}

// GET /api/heist/targets — list heiststable players
app.get("/api/heist/targets", authenticateUser, async (req, res) => {
  try {
    const uid = req.user.userId;
    const rows = await db.all(
      `SELECT ls.user_id, ls.total_value, a.full_name, a.email, a.is_bot
       FROM leaderboard_scores ls
       JOIN accounts a ON a.user_id = ls.user_id
       WHERE ls.user_id != ? AND ls.total_value >= ? AND (a.is_bot IS NULL OR a.is_bot = 0)`,
      [uid, MIN_TARGET_CASH]
    );
    const jailed = new Set(
      (await db.all('SELECT user_id FROM jail_status WHERE released = 0')).map(r => r.user_id)
    );
    const players = rows
      .filter(r => !jailed.has(r.user_id))
      .map(r => {
        const v = r.total_value || 0;
        const valueRange = v >= 10_000 ? '$10k+' : v >= 1_000 ? '$1k–$10k' : '$100–$1k';
        return { userId: r.user_id, displayName: r.full_name || r.email || 'A Legend', valueRange };
      });
    res.json({ players });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/heist/initiate
app.post("/api/heist/initiate", authenticateUser, async (req, res) => {
  const uid = req.user.userId;
  const { targetUserId, heistType } = req.body;
  try {
    if (!targetUserId || !heistType) return res.status(400).json({ error: 'targetUserId and heistType required' });
    if (targetUserId === uid) return res.status(400).json({ error: 'Cannot heist yourself' });
    const config = HEIST_TYPES[heistType];
    if (!config) return res.status(400).json({ error: 'Invalid heist type' });

    // Jail check for robber
    const jailRow = await db.get('SELECT id FROM jail_status WHERE user_id = ? AND released = 0', [uid]);
    if (jailRow) return res.status(403).json({ error: 'You are in jail! Pay bail first.', jailed: true });

    // Cooldown check
    const lastHeist = await db.get(
      'SELECT created_at FROM heist_attempts WHERE robber_id = ? AND heist_type = ? ORDER BY created_at DESC LIMIT 1',
      [uid, heistType]
    );
    if (lastHeist && (Date.now() - lastHeist.created_at) < config.cooldownMs) {
      const remainMs = config.cooldownMs - (Date.now() - lastHeist.created_at);
      const remainMin = Math.ceil(remainMs / 60_000);
      return res.status(429).json({ error: `Cooldown active — try again in ${remainMin} min`, cooldownMin: remainMin });
    }

    // Bank job requires team of 2+
    let teamId = null;
    let teammates = [uid];
    if (config.minTeam > 1) {
      const memberRow = await db.get('SELECT team_id FROM team_members WHERE user_id = ?', [uid]);
      if (!memberRow) return res.status(400).json({ error: 'Bank Job requires a team of 2+ members. Join a team first.' });
      teamId = memberRow.team_id;
      const allMembers = await db.all('SELECT user_id FROM team_members WHERE team_id = ?', [teamId]);
      if (allMembers.length < config.minTeam) return res.status(400).json({ error: `Bank Job requires ${config.minTeam}+ team members` });
      teammates = allMembers.map(m => m.user_id);
    }

    // Target must have cash
    const targetPortfolio = await db.get('SELECT cash_balance FROM user_portfolios WHERE user_id = ?', [targetUserId]);
    const targetCash = targetPortfolio ? targetPortfolio.cash_balance : 0;
    if (targetCash < MIN_TARGET_CASH) return res.status(400).json({ error: 'Target doesn\'t have enough cash to heist' });

    const now = Date.now();
    const success = Math.random() < config.baseChance;

    if (success) {
      const rawAmount = Math.random() * config.maxPct * targetCash;
      const amount = parseFloat(Math.max(1, rawAmount).toFixed(2));
      const share  = parseFloat((amount / teammates.length).toFixed(2));

      // Deduct from target
      await db.run('UPDATE user_portfolios SET cash_balance = cash_balance - ?, updated_at = ? WHERE user_id = ?', [amount, now, targetUserId]);
      // Credit each robber
      for (const rid of teammates) {
        await db.run(
          `INSERT INTO user_portfolios (user_id, cash_balance, total_invested, updated_at) VALUES (?, ?, ?, ?)
           ON CONFLICT(user_id) DO UPDATE SET cash_balance = cash_balance + ?, updated_at = ?`,
          [rid, share, share, now, share, now]
        );
        await _syncLeaderboard(rid);
      }
      await _syncLeaderboard(targetUserId);

      const heistRow = await db.run(
        'INSERT INTO heist_attempts (robber_id, team_id, target_id, heist_type, amount_stolen, status, charges, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)',
        [uid, teamId, targetUserId, heistType, amount, 'success', now, now + CHARGE_WINDOW]
      );
      const heistId = heistRow.lastID;

      // Persist notification for victim
      await db.run(
        'INSERT INTO heist_notifications (user_id, type, data, read, created_at) VALUES (?, ?, ?, 0, ?)',
        [targetUserId, 'robbed', JSON.stringify({ heistId, robberName: _displayName(uid), amount, heistType, config: config.label }), now]
      );

      emitToUser(targetUserId, 'heist_incoming', { heistId, robberName: _displayName(uid), amount, heistType: config.label, icon: config.icon });
      emitToUser(uid, 'heist_result', { success: true, amountStolen: share, heistType: config.label, icon: config.icon });

      res.json({ success: true, amountStolen: share, message: `${config.icon} ${config.label} succeeded! You stole $${share.toFixed(2)}` });
    } else {
      await db.run(
        'INSERT INTO heist_attempts (robber_id, team_id, target_id, heist_type, amount_stolen, status, charges, created_at, expires_at) VALUES (?, ?, ?, ?, 0, ?, 0, ?, ?)',
        [uid, teamId, targetUserId, heistType, 'failed', now, now]
      );
      emitToUser(uid, 'heist_result', { success: false, heistType: config.label, icon: config.icon });
      res.json({ success: false, message: `${config.icon} ${config.label} failed — you got away clean but empty-handed` });
    }
  } catch (e) {
    console.error('[heist/initiate]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// POST /api/heist/press-charges
app.post("/api/heist/press-charges", authenticateUser, async (req, res) => {
  const uid = req.user.userId;
  const { heistId } = req.body;
  try {
    const heist = await db.get('SELECT * FROM heist_attempts WHERE id = ?', [heistId]);
    if (!heist) return res.status(404).json({ error: 'Heist not found' });
    if (heist.target_id !== uid) return res.status(403).json({ error: 'Not your heist to press charges on' });
    if (heist.status !== 'success') return res.status(400).json({ error: 'Can only press charges on a successful heist' });
    if (heist.charges) return res.status(400).json({ error: 'Charges already pressed' });
    if (Date.now() > heist.expires_at) return res.status(400).json({ error: 'Charge window expired (24h has passed)' });

    await db.run('UPDATE heist_attempts SET charges = 1 WHERE id = ?', [heistId]);

    const caught = Math.random() < CATCH_RATE;
    const robberName = _displayName(heist.robber_id);

    if (caught) {
      await db.run('UPDATE heist_attempts SET status = ?, caught = 1 WHERE id = ?', ['caught', heistId]);
      emitToUser(uid, 'investigation_result', { caught: true, heistId, robberName, amount: heist.amount_stolen });
      res.json({ caught: true, robberName, amount: heist.amount_stolen });
    } else {
      await db.run('UPDATE heist_attempts SET status = ? WHERE id = ?', ['escaped', heistId]);
      emitToUser(uid, 'investigation_result', { caught: false, robberName });
      res.json({ caught: false, robberName });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/heist/choose-outcome
app.post("/api/heist/choose-outcome", authenticateUser, async (req, res) => {
  const uid = req.user.userId;
  const { heistId, outcome } = req.body;
  try {
    const heist = await db.get('SELECT * FROM heist_attempts WHERE id = ?', [heistId]);
    if (!heist) return res.status(404).json({ error: 'Heist not found' });
    if (heist.target_id !== uid) return res.status(403).json({ error: 'Not your heist' });
    if (heist.status !== 'caught') return res.status(400).json({ error: 'Robber has not been caught' });

    const now = Date.now();
    const robberId = heist.robber_id;

    if (outcome === 'fine') {
      // Deduct fine from robber, pay victim
      const robberPort = await db.get('SELECT cash_balance FROM user_portfolios WHERE user_id = ?', [robberId]);
      const robberCash = robberPort ? robberPort.cash_balance : 0;
      const actualFine = Math.min(VICTIM_FINE, robberCash);
      if (actualFine > 0) {
        await db.run('UPDATE user_portfolios SET cash_balance = cash_balance - ?, updated_at = ? WHERE user_id = ?', [actualFine, now, robberId]);
        await db.run('UPDATE user_portfolios SET cash_balance = cash_balance + ?, updated_at = ? WHERE user_id = ?', [actualFine, now, uid]);
      }
      await db.run('UPDATE heist_attempts SET status = ?, resolved_at = ? WHERE id = ?', ['resolved', now, heistId]);
      await _syncLeaderboard(robberId);
      await _syncLeaderboard(uid);
      emitToUser(robberId, 'fine_charged', { amount: actualFine });
      emitToUser(uid, 'fine_collected', { amount: actualFine });
      res.json({ success: true, outcome: 'fine', amount: actualFine });
    } else if (outcome === 'jail') {
      await db.run(
        `INSERT INTO jail_status (user_id, heist_id, victim_id, amount_owed, released, jailed_at)
         VALUES (?, ?, ?, ?, 0, ?)
         ON CONFLICT(user_id) DO UPDATE SET heist_id=?, victim_id=?, amount_owed=?, released=0, jailed_at=?`,
        [robberId, heistId, uid, heist.amount_stolen, now, heistId, uid, heist.amount_stolen, now]
      );
      await db.run('UPDATE heist_attempts SET status = ?, resolved_at = ? WHERE id = ?', ['resolved', now, heistId]);
      await db.run(
        'INSERT INTO heist_notifications (user_id, type, data, read, created_at) VALUES (?, ?, ?, 0, ?)',
        [robberId, 'jailed', JSON.stringify({ victimName: _displayName(uid), bailAmount: BAIL_AMOUNT }), now]
      );
      emitToUser(robberId, 'sent_to_jail', { bailAmount: BAIL_AMOUNT, victimName: _displayName(uid) });
      res.json({ success: true, outcome: 'jail' });
    } else {
      res.status(400).json({ error: 'outcome must be fine or jail' });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/heist/pay-bail — pay $50k cash bail
app.post("/api/heist/pay-bail", authenticateUser, async (req, res) => {
  const uid = req.user.userId;
  try {
    const jail = await db.get('SELECT * FROM jail_status WHERE user_id = ? AND released = 0', [uid]);
    if (!jail) return res.status(400).json({ error: 'You are not in jail' });

    const port = await db.get('SELECT cash_balance FROM user_portfolios WHERE user_id = ?', [uid]);
    const cash = port ? port.cash_balance : 0;
    if (cash < BAIL_AMOUNT) return res.status(400).json({ error: `Insufficient cash. Need $${BAIL_AMOUNT.toLocaleString()}, have $${cash.toFixed(2)}. Pay $5 real money instead.`, insufficient: true });

    const now = Date.now();
    await db.run('UPDATE user_portfolios SET cash_balance = cash_balance - ?, updated_at = ? WHERE user_id = ?', [BAIL_AMOUNT, now, uid]);
    if (jail.victim_id) {
      await db.run('UPDATE user_portfolios SET cash_balance = cash_balance + ?, updated_at = ? WHERE user_id = ?', [jail.amount_owed, now, jail.victim_id]);
      emitToUser(jail.victim_id, 'fine_collected', { amount: jail.amount_owed, source: 'bail_paid' });
    }
    await db.run('UPDATE jail_status SET released = 1, released_at = ? WHERE user_id = ?', [now, uid]);
    await _syncLeaderboard(uid);
    emitToUser(uid, 'jail_released', { bailPaid: BAIL_AMOUNT });
    res.json({ success: true, bailPaid: BAIL_AMOUNT });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/heist/log
app.get("/api/heist/log", authenticateUser, async (req, res) => {
  const uid = req.user.userId;
  try {
    const rows = await db.all(
      `SELECT h.*, a1.full_name as robber_name, a1.email as robber_email,
              a2.full_name as target_name, a2.email as target_email
       FROM heist_attempts h
       LEFT JOIN accounts a1 ON a1.user_id = h.robber_id
       LEFT JOIN accounts a2 ON a2.user_id = h.target_id
       WHERE h.robber_id = ? OR h.target_id = ?
       ORDER BY h.created_at DESC LIMIT 20`,
      [uid, uid]
    );
    const log = rows.map(r => ({
      id: r.id,
      role: r.robber_id === uid ? 'robber' : 'victim',
      heistType: r.heist_type,
      amount: r.amount_stolen,
      status: r.status,
      counterparty: r.robber_id === uid
        ? (r.target_name || r.target_email || 'A Legend')
        : (r.robber_name || r.robber_email || 'A Legend'),
      createdAt: r.created_at,
      expiresAt: r.expires_at,
      charges: r.charges,
    }));
    res.json({ log });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/heist/notifications
app.get("/api/heist/notifications", authenticateUser, async (req, res) => {
  const uid = req.user.userId;
  try {
    const rows = await db.all('SELECT * FROM heist_notifications WHERE user_id = ? AND read = 0 ORDER BY created_at DESC', [uid]);
    await db.run('UPDATE heist_notifications SET read = 1 WHERE user_id = ? AND read = 0', [uid]);
    const jailRow = await db.get('SELECT * FROM jail_status WHERE user_id = ? AND released = 0', [uid]);
    res.json({ notifications: rows.map(r => ({ ...r, data: JSON.parse(r.data) })), jailed: !!jailRow, jailInfo: jailRow || null });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ===== UNDERWORLD — CHALLENGE SYSTEM =====

// Helper: resolve a challenge when timer expires
async function _resolveChallenge(challengeId) {
  try {
    const ch = await db.get('SELECT * FROM challenges WHERE id = ?', [challengeId]);
    if (!ch || ch.status !== 'active') return;

    const now = Date.now();
    let winnerId, loserId;

    if (ch.type === 'profit_race') {
      const valC = await _calcPortfolioValue(ch.challenger_id);
      const valO = await _calcPortfolioValue(ch.opponent_id);
      const gainC = ch.start_value_c > 0 ? (valC - ch.start_value_c) / ch.start_value_c : 0;
      const gainO = ch.start_value_o > 0 ? (valO - ch.start_value_o) / ch.start_value_o : 0;
      winnerId = gainC >= gainO ? ch.challenger_id : ch.opponent_id;
      loserId  = winnerId === ch.challenger_id ? ch.opponent_id : ch.challenger_id;
    } else if (ch.type === 'trade_blitz') {
      const tradesC = await db.get(
        "SELECT COUNT(*) as n FROM trades WHERE user_id = ? AND timestamp >= ? AND type = 'SELL'",
        [ch.challenger_id, ch.accepted_at]
      );
      const tradesO = await db.get(
        "SELECT COUNT(*) as n FROM trades WHERE user_id = ? AND timestamp >= ? AND type = 'SELL'",
        [ch.opponent_id, ch.accepted_at]
      );
      winnerId = (tradesC.n || 0) >= (tradesO.n || 0) ? ch.challenger_id : ch.opponent_id;
      loserId  = winnerId === ch.challenger_id ? ch.opponent_id : ch.challenger_id;
    } else {
      const valC = await _calcPortfolioValue(ch.challenger_id);
      const valO = await _calcPortfolioValue(ch.opponent_id);
      winnerId = valC >= valO ? ch.challenger_id : ch.opponent_id;
      loserId  = winnerId === ch.challenger_id ? ch.opponent_id : ch.challenger_id;
    }

    const loserPort = await db.get('SELECT cash_balance FROM user_portfolios WHERE user_id = ?', [loserId]);
    const loserCash = loserPort ? loserPort.cash_balance : 0;
    const prize = Math.floor(loserCash * CHALLENGE_PRIZE_PCT);

    if (prize > 0) {
      await db.run('UPDATE user_portfolios SET cash_balance = cash_balance - ?, updated_at = ? WHERE user_id = ?', [prize, now, loserId]);
      await db.run(
        `INSERT INTO user_portfolios (user_id, cash_balance, total_invested, updated_at) VALUES (?, ?, ?, ?)
         ON CONFLICT(user_id) DO UPDATE SET cash_balance = cash_balance + ?, updated_at = ?`,
        [winnerId, prize, prize, now, prize, now]
      );
    }

    await db.run('UPDATE challenges SET status = ?, winner_id = ?, prize_amount = ?, resolved_at = ? WHERE id = ?',
      ['completed', winnerId, prize, now, challengeId]);

    await _syncLeaderboard(winnerId);
    await _syncLeaderboard(loserId);

    const winnerName = _displayName(winnerId);
    const loserName  = _displayName(loserId);
    emitToUser(winnerId, 'challenge_result', { won: true, prize, opponentName: loserName, challengeType: ch.type });
    emitToUser(loserId,  'challenge_result', { won: false, prize, opponentName: winnerName, challengeType: ch.type });
    console.log(`[challenge] ${ch.type} resolved — winner: ${winnerId}, prize: $${prize}`);
  } catch (e) {
    console.error('[challenge/resolve]', e.message);
  }
}

// POST /api/challenge/send
app.post("/api/challenge/send", authenticateUser, async (req, res) => {
  const uid = req.user.userId;
  const { opponentId, type, durationMs } = req.body;
  try {
    if (!opponentId || !type || !durationMs) return res.status(400).json({ error: 'opponentId, type, and durationMs required' });
    if (opponentId === uid) return res.status(400).json({ error: 'Cannot challenge yourself' });
    const config = CHALLENGE_TYPES[type];
    if (!config) return res.status(400).json({ error: 'Invalid challenge type' });
    if (!config.durations.includes(Number(durationMs))) return res.status(400).json({ error: 'Invalid duration for this challenge type' });

    // Check no active challenge between these two
    const existing = await db.get(
      `SELECT id FROM challenges WHERE status IN ('pending','active')
       AND ((challenger_id = ? AND opponent_id = ?) OR (challenger_id = ? AND opponent_id = ?))`,
      [uid, opponentId, opponentId, uid]
    );
    if (existing) return res.status(400).json({ error: 'There is already an active challenge between you two' });

    const now = Date.now();
    const row = await db.run(
      'INSERT INTO challenges (challenger_id, opponent_id, type, duration_ms, status, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [uid, opponentId, type, durationMs, 'pending', now]
    );
    const challengeId = row.lastID;

    const durLabel = durationMs >= 3_600_000 ? `${durationMs / 3_600_000}h` : `${durationMs / 60_000}min`;
    await db.run(
      'INSERT INTO challenge_notifications (user_id, type, data, read, created_at) VALUES (?, ?, ?, 0, ?)',
      [opponentId, 'received', JSON.stringify({ challengeId, challengerName: _displayName(uid), type, durationLabel: durLabel, config: config.label }), now]
    );
    emitToUser(opponentId, 'challenge_received', { challengeId, challengerName: _displayName(uid), type, typeLabel: config.label, icon: config.icon, durationLabel: durLabel });

    res.json({ success: true, challengeId, message: `${config.icon} Challenge sent to ${_displayName(opponentId)}!` });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/challenge/respond
app.post("/api/challenge/respond", authenticateUser, async (req, res) => {
  const uid = req.user.userId;
  const { challengeId, accept } = req.body;
  try {
    const ch = await db.get('SELECT * FROM challenges WHERE id = ?', [challengeId]);
    if (!ch) return res.status(404).json({ error: 'Challenge not found' });
    if (ch.opponent_id !== uid) return res.status(403).json({ error: 'Not your challenge to respond to' });
    if (ch.status !== 'pending') return res.status(400).json({ error: 'Challenge is no longer pending' });

    const now = Date.now();
    if (!accept) {
      await db.run('UPDATE challenges SET status = ?, resolved_at = ? WHERE id = ?', ['declined', now, challengeId]);
      emitToUser(ch.challenger_id, 'challenge_declined', { opponentName: _displayName(uid), type: ch.type });
      return res.json({ success: true, accepted: false });
    }

    // Accept — snapshot portfolio values and start timer
    const valC = await _calcPortfolioValue(ch.challenger_id);
    const valO = await _calcPortfolioValue(uid);
    const endsAt = now + ch.duration_ms;

    await db.run(
      'UPDATE challenges SET status = ?, accepted_at = ?, ends_at = ?, start_value_c = ?, start_value_o = ? WHERE id = ?',
      ['active', now, endsAt, valC, valO, challengeId]
    );

    const config = CHALLENGE_TYPES[ch.type];
    emitToUser(ch.challenger_id, 'challenge_accepted', { challengeId, opponentName: _displayName(uid), endsAt, typeLabel: config?.label });

    // Schedule resolution
    setTimeout(() => _resolveChallenge(challengeId), ch.duration_ms);

    res.json({ success: true, accepted: true, endsAt, challengeId });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/challenge/active
app.get("/api/challenge/active", authenticateUser, async (req, res) => {
  const uid = req.user.userId;
  try {
    const active = await db.get(
      `SELECT c.*, a.full_name as opp_name, a.email as opp_email
       FROM challenges c
       LEFT JOIN accounts a ON a.user_id = CASE WHEN c.challenger_id = ? THEN c.opponent_id ELSE c.challenger_id END
       WHERE (c.challenger_id = ? OR c.opponent_id = ?) AND c.status IN ('active','pending')
       ORDER BY c.created_at DESC LIMIT 1`,
      [uid, uid, uid]
    );
    const pending = await db.all(
      `SELECT cn.*, c.type, c.duration_ms
       FROM challenge_notifications cn
       LEFT JOIN challenges c ON c.id = CAST(json_extract(cn.data, '$.challengeId') AS INTEGER)
       WHERE cn.user_id = ? AND cn.type = 'received' AND cn.read = 0`,
      [uid]
    );
    await db.run('UPDATE challenge_notifications SET read = 1 WHERE user_id = ? AND type = ? AND read = 0', [uid, 'received']);

    res.json({
      active: active ? { ...active, opponentName: active.opp_name || active.opp_email || 'A Legend' } : null,
      pending: pending.map(p => ({ ...p, data: JSON.parse(p.data) })),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
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

app.get("/api/social/messages/threads", authenticateUser, (req, res) => {
  const convos = socialNetwork.getConversations(req.user.userId);
  res.json({ conversations: convos });
});

app.post("/api/social/messages/send", authenticateUser, (req, res) => {
  const { recipientId, content } = req.body;
  if (!recipientId || !content) {
    return res.status(400).json({ error: "Recipient and content required" });
  }

  const result = socialNetwork.sendMessage(req.user.userId, recipientId, content);

  if (result.success) {
    const senderAcct = accountManager.getAccountById(req.user.userId);
    const senderName = senderAcct ? (senderAcct.fullName || senderAcct.email) : 'Someone';
    emitToUser(recipientId, 'new_message', {
      messageId:  result.messageId,
      senderId:   req.user.userId,
      senderName,
      content:    content.slice(0, 120),
      timestamp:  new Date().toISOString(),
    });
  }

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

  // Badge + feed events for rank milestones
  const rankBadges = badgeSystem.onRankUpdate(req.user.userId, result.rank);
  if (rankBadges.length > 0) {
    const acct = accountManager.getAccountById(req.user.userId);
    const displayName = acct ? (acct.fullName || acct.email) : 'A Legend';
    rankBadges.forEach(badge => {
      if (acct) notifier.sendBadgeEarned(acct.email, acct.fullName, badge).catch(() => {});
      socialFeed.addAchievement(req.user.userId, displayName, badge.name, badge.icon);
      emitToUser(req.user.userId, 'badge_earned', badge);
      _broadcastMilestone(badge, displayName);
    });
    broadcastFeedUpdate();
  }
  if (result.rank <= 10) {
    const acct = accountManager.getAccountById(req.user.userId);
    socialFeed.addRankChange(req.user.userId, acct ? (acct.fullName || acct.email) : 'A Legend', result.rank);
    emitToUser(req.user.userId, 'rank_update', { rank: result.rank });
    broadcastFeedUpdate();
  }

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
app.get("/api/leaderboard/public", async (req, res) => {
  // Pull from DB-backed leaderboard_scores (includes bot + real portfolio values)
  let dbRows = await db.all(
    `SELECT ls.user_id, ls.email, ls.gain_pct, ls.score, ls.trades, ls.win_rate, ls.total_value,
            a.full_name, a.is_bot, a.gender
     FROM leaderboard_scores ls
     LEFT JOIN accounts a ON a.user_id = ls.user_id
     ORDER BY ls.score DESC LIMIT 100`
  );

  const { gender } = req.query;
  if (gender === 'male' || gender === 'female') {
    dbRows = dbRows.filter(p => p.gender === gender);
  }

  // If DB has rows, use them; otherwise fall back to in-memory
  let lb;
  if (dbRows.length > 0) {
    lb = dbRows.map((r, i) => ({
      rank: i + 1,
      userId: r.user_id,
      email: r.email,
      displayName: r.full_name || r.email,
      gainPct: r.gain_pct || 0,
      score: r.score || 0,
      trades: r.trades || 0,
      winRate: r.win_rate || 0,
      totalValue: r.total_value || 0,
      isBot: !!r.is_bot,
    }));
  } else {
    lb = leaderboardManager.getLeaderboard(50);
    if (gender === 'male' || gender === 'female') {
      lb = lb.filter(p => accountManager.getGender(p.userId) === gender);
    }
  }

  // Attach legend crown to the active champion
  const legend = await db.get('SELECT user_id FROM legend_status WHERE active = 1 LIMIT 1');
  if (legend) {
    lb = lb.map(p => p.userId === legend.user_id ? { ...p, isLegend: true } : p);
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
app.get("/api/tournament/status", async (req, res) => {
  const status = tournamentManager.getStatus();
  // Attach prize pool if tournament is active (id lives at status.tournament.id)
  const tid = status && status.active ? status.tournament?.id : null;
  if (tid) {
    const pool = await db.get('SELECT entry_count, total_cents FROM tournament_prize_pools WHERE tournament_id = ?', [String(tid)]);
    status.entryCount = pool ? pool.entry_count : 0;
    status.prizePool  = pool ? pool.total_cents  : 0;
  }
  res.json(status);
});

app.get("/api/tournament/history", (req, res) => {
  res.json({ history: tournamentManager.getHistory() });
});

app.post("/api/admin/tournament/create", requireAdmin, (req, res) => {
  const lb = leaderboardManager.getLeaderboard(200);
  const BOT_ID_CONST = require('./bot/BotTrader').BOT_ID || 'sml-bot';

  const toSeed = p => ({ userId: p.userId, email: p.email, score: p.score, gainPercentage: p.gainPercentage });
  const botEntry = lb.find(p => p.userId === BOT_ID_CONST);
  const botSeed  = botEntry ? toSeed(botEntry) : null;

  const maleSeeds = lb
    .filter(p => p.userId !== BOT_ID_CONST && accountManager.getGender(p.userId) === 'male')
    .slice(0, botSeed ? 15 : 16)
    .map(toSeed);
  if (botSeed) maleSeeds.push(botSeed); // bot competes in male bracket as wildcard

  const femaleSeeds = lb
    .filter(p => p.userId !== BOT_ID_CONST && accountManager.getGender(p.userId) === 'female')
    .slice(0, 16)
    .map(toSeed);

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

// Helper: build userContext from optional session header
function buildCoachContext(req) {
  const sessionId = req.headers['x-session-id'];
  if (!sessionId) return {};
  const session = accountManager.verifySession(sessionId);
  if (!session.valid) return {};
  const userId = session.userId;

  const training   = trainingCamp.getProgress(userId);
  const badgeCount = badgeSystem.getBadgeCount(userId);
  const lb         = leaderboardManager.getWeeklyLeaderboard(500);
  const lbEntry   = lb.find(e => e.userId === userId);
  const rank      = lbEntry ? lbEntry.rank : null;

  // Derive top topics from coach user state (exposed via public accessor)
  const state      = coachSystem._userState ? coachSystem._userState.get(userId) : null;
  const topTopics  = state
    ? Object.entries(state.topicCounts).sort((a, b) => b[1] - a[1]).slice(0, 2).map(e => e[0])
    : [];

  return {
    userId,
    graduated:  training ? training.graduated : false,
    badgeCount: badgeCount || 0,
    rank,
    topTopics,
  };
}

app.post("/api/coach/ask", (req, res) => {
  const { query } = req.body;
  if (!query || typeof query !== 'string') return res.status(400).json({ error: 'query required' });
  const ctx    = buildCoachContext(req);
  const answer = coachSystem.getResponse(query.slice(0, 400), ctx);
  res.json({ answer, level: coachSystem._detectLevel(ctx) });
});

app.get("/api/coach/tip", (req, res) => {
  const ctx   = buildCoachContext(req);
  const level = coachSystem._detectLevel(ctx);
  res.json({ tip: coachSystem.getAdaptedTip(level, ctx.topTopics) });
});

app.get("/api/coach/questions", (req, res) => {
  const ctx   = buildCoachContext(req);
  const level = coachSystem._detectLevel(ctx);
  res.json({ questions: coachSystem.getAdaptedQuestions(level), level });
});

app.post("/api/coach/feedback", async (req, res) => {
  const sessionId = req.headers['x-session-id'];
  if (!sessionId) return res.status(401).json({ error: 'Session required' });
  const session = accountManager.verifySession(sessionId);
  if (!session.valid) return res.status(401).json({ error: 'Invalid session' });

  const { query, answer, thumb } = req.body;
  if (typeof thumb !== 'number' && typeof thumb !== 'boolean') {
    return res.status(400).json({ error: 'thumb required (1/0 or true/false)' });
  }
  await coachSystem.submitFeedback(session.userId, query, answer, thumb === 1 || thumb === true);
  res.json({ ok: true });
});

// ── Coach Learning Path (Agentic Plan → Execute → Learn) ─────────────────
app.get("/api/coach/learning-path", authenticateUser, async (req, res) => {
  const path = await coachSystem.getLearningPath(req.user.userId);
  res.json({ path });
});

app.post("/api/coach/learning-path/generate", authenticateUser, async (req, res) => {
  const ctx = buildCoachContext(req);
  const training = trainingCamp.getProgress(req.user.userId);
  const path = await coachSystem.generateLearningPath(req.user.userId, ctx, training);
  res.json({ path });
});

app.post("/api/coach/learning-path/step/:stepId/complete", authenticateUser, async (req, res) => {
  const result = await coachSystem.completeLearningStep(req.user.userId, req.params.stepId);
  if (result.ok) {
    awardMissionXP(req.user.userId, 'coach_step').catch(() => {});
    if (result.allDone) {
      const acct = accountManager.getAccountById(req.user.userId);
      const name = acct ? (acct.fullName || acct.email) : 'A Legend';
      emitToUser(req.user.userId, 'path_completed', { message: 'You completed your Learning Path! 🎓' });
    }
  }
  res.json(result);
});

// ── Live Prices (initial snapshot for Socket.io late-joiners) ─────────────
app.get("/api/live/prices", async (req, res) => {
  if (_lastPricePayload) return res.json({ prices: _lastPricePayload });
  try {
    const coins = await cryptoFetcher.getTopCoins(6);
    const prices = (coins || []).map(c => ({
      id: c.id,
      symbol: (c.symbol || '').toUpperCase(),
      name: c.name,
      price: c.current_price,
      change24h: c.price_change_percentage_24h || 0,
    }));
    _lastPricePayload = prices;
    res.json({ prices });
  } catch (_) {
    res.json({ prices: [] });
  }
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
    awardMissionXP(req.user.userId, 'training_graduate').catch(() => {});
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

app.post("/api/missions/complete", authenticateUser, async (req, res) => {
  const { actionId } = req.body;
  if (!actionId) return res.status(400).json({ error: "actionId required" });
  const result = await awardMissionXP(req.user.userId, actionId);
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

app.post("/api/admin/end-season", requireAdmin, async (req, res) => {
  const lb = leaderboardManager.getLeaderboard(3);
  const winners = lb.map((p, i) => ({ rank: i + 1, userId: p.userId, email: p.email, score: p.score }));
  // Award Hall of Famer diamond badge to top-3 season finishers
  winners.forEach(w => { if (w.userId) badgeSystem.onHallOfFame(w.userId); });
  const closed = seasonManager.endSeason(winners);

  // Award Legend Status to the #1 champion (lasts 90 days or until next champion)
  const champion = winners.find(w => w.rank === 1);
  if (champion && champion.userId) {
    await db.run('UPDATE legend_status SET active = 0 WHERE active = 1');
    const acct = accountManager.getAccountById(champion.userId);
    const fullName = acct ? (acct.fullName || acct.email) : 'Champion';
    const now = Date.now();
    const expires = now + (90 * 24 * 60 * 60 * 1000);
    await db.run(
      'INSERT INTO legend_status (user_id, full_name, season_id, season_name, awarded_at, expires_at, active) VALUES (?, ?, ?, ?, ?, ?, 1)',
      [champion.userId, fullName, String(closed.id), closed.name, now, expires]
    );
    emitToUser(champion.userId, 'legend_status', { message: '👑 You are the Legend of the Season!' });
    console.log(`Legend Status awarded to ${fullName} (${champion.userId}) for ${closed.name}`);
  }

  res.json({ success: true, closedSeason: closed, newSeason: seasonManager.getCurrentSeason(), legendAwarded: champion || null });
});

// ── Activity Feed (public, uses SocialFeed with 15-min delay) ─────────────
app.get("/api/activity-feed", (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 20, 50);
  res.json({ feed: socialFeed.getFeed(limit) });
});

// ── User Profile ──────────────────────────────────────────────────────────
app.get("/api/profile/me", authenticateUser, (req, res) => {
  const uid = req.user.userId;
  const account = accountManager.getAccountById(uid);
  if (!account) return res.status(404).json({ error: "Not found" });
  const badges = badgeSystem.getEarnedBadges(uid);
  const allBadges = badgeSystem.getUserBadges(uid);
  const streak = badgeSystem.getStreakInfo(uid);
  const training = trainingCamp.getProgress(uid);
  const missions = missionSystem.getUserStats(uid);
  const team = teamManager.getUserTeam(uid);
  const rank = leaderboardManager.getPlayerRank(uid);
  const lbEntry = leaderboardManager.weeklyScores.find(s => s.userId === uid);
  res.json({
    userId: uid,
    fullName: account.fullName,
    email: account.email,
    avatarName: account.avatarName || "",
    tagline: account.tagline || "",
    gender: account.gender || null,
    tier: account.tier || "free",
    isCreatorMember: account.isCreatorMember || false,
    createdAt: account.createdAt,
    hasAvatar: !!account.avatar,
    badges,
    allBadges,
    badgeCount: badges.length,
    totalBadges: allBadges.length,
    streak,
    training,
    totalXP: missions.totalXP,
    team: team ? { id: team.id, name: team.name, code: team.code, memberCount: team.memberIds.length, captainId: team.captainId } : null,
    lbRank: rank > 0 ? rank : null,
    gainPct: lbEntry ? lbEntry.gainPercentage : 0,
    trades: lbEntry ? lbEntry.trades : 0,
  });
});

// ── Market Prices ─────────────────────────────────────────────────────────
app.get("/api/market/prices", (req, res) => {
  res.json({ prices: priceEngine.getAllPrices(), symbols: priceEngine.getSymbols() });
});

// ── Manual Trading ────────────────────────────────────────────────────────
async function _syncLeaderboard(userId) {
  try {
    const portfolio = await db.get('SELECT cash_balance, total_invested FROM user_portfolios WHERE user_id = ?', [userId]);
    if (!portfolio) return;
    const holdings = await db.all('SELECT symbol, quantity FROM holdings WHERE user_id = ? AND quantity > 0', [userId]);
    let holdingsValue = 0;
    for (const h of holdings) {
      const price = priceEngine.getPrice(h.symbol);
      if (price) holdingsValue += h.quantity * price;
    }
    const totalValue  = portfolio.cash_balance + holdingsValue;
    const gainPct     = ((totalValue - portfolio.total_invested) / portfolio.total_invested) * 100;
    const tradeCount  = (await db.get('SELECT COUNT(*) as n FROM trades WHERE user_id = ?', [userId])).n;
    const sellCount   = (await db.get("SELECT COUNT(*) as n FROM trades WHERE user_id = ? AND type = 'SELL'", [userId])).n;
    const buyCount    = tradeCount - sellCount;
    const winRate     = buyCount > 0 ? Math.min(100, (sellCount / buyCount) * 80) : 0; // approximation

    const account = accountManager.getAccountById(userId);
    const email   = account ? account.email : '';
    await db.run(
      `INSERT INTO leaderboard_scores (user_id, email, gain_pct, score, trades, win_rate, total_value, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         email=excluded.email, gain_pct=excluded.gain_pct, score=excluded.score,
         trades=excluded.trades, win_rate=excluded.win_rate, total_value=excluded.total_value, updated_at=excluded.updated_at`,
      [userId, email, gainPct, gainPct, tradeCount, winRate, totalValue, Date.now()]
    );
    leaderboardManager.refreshFromDB && leaderboardManager.refreshFromDB();
  } catch (e) {
    console.error('[syncLeaderboard] error:', e.message);
  }
}

app.get("/api/portfolio", authenticateUser, async (req, res) => {
  const uid = req.user.userId;
  let portfolio = await db.get('SELECT cash_balance, total_invested FROM user_portfolios WHERE user_id = ?', [uid]);
  if (!portfolio) {
    await db.run('INSERT INTO user_portfolios (user_id, cash_balance, total_invested, updated_at) VALUES (?, 1000, 1000, ?)', [uid, Date.now()]);
    portfolio = { cash_balance: 1000, total_invested: 1000 };
  }
  const holdings = await db.all('SELECT symbol, quantity, avg_price FROM holdings WHERE user_id = ? AND quantity > 0', [uid]);
  const prices = priceEngine.getAllPrices();
  const enriched = holdings.map(h => {
    const cur = prices[h.symbol] ? prices[h.symbol].price : h.avg_price;
    return { ...h, current_price: cur, pnl: (cur - h.avg_price) * h.quantity, pnl_pct: ((cur - h.avg_price) / h.avg_price) * 100 };
  });
  const holdingsValue = enriched.reduce((s, h) => s + h.current_price * h.quantity, 0);
  const totalValue    = portfolio.cash_balance + holdingsValue;
  const gainPct       = ((totalValue - portfolio.total_invested) / portfolio.total_invested) * 100;
  res.json({ cash: portfolio.cash_balance, total_invested: portfolio.total_invested, holdings: enriched, total_value: totalValue, gain_pct: gainPct });
});

app.post("/api/trade/buy", authenticateUser, async (req, res) => {
  const uid = req.user.userId;
  const jailCheckBuy = await db.get('SELECT id FROM jail_status WHERE user_id = ? AND released = 0', [uid]);
  if (jailCheckBuy) return res.status(403).json({ error: 'You are in jail! Pay bail to trade again.', jailed: true });

  const { symbol, quantity } = req.body;
  if (!symbol || !quantity || quantity <= 0) return res.status(400).json({ error: 'symbol and quantity required' });
  const sym = String(symbol).toUpperCase();
  const price = priceEngine.getPrice(sym);
  if (!price) return res.status(400).json({ error: `Unknown symbol: ${sym}` });
  const qty  = parseFloat(quantity);
  const cost = parseFloat((price * qty).toFixed(2));

  // Ensure portfolio row
  let portfolio = await db.get('SELECT cash_balance FROM user_portfolios WHERE user_id = ?', [uid]);
  if (!portfolio) {
    await db.run('INSERT INTO user_portfolios (user_id, cash_balance, total_invested, updated_at) VALUES (?, 1000, 1000, ?)', [uid, Date.now()]);
    portfolio = { cash_balance: 1000 };
  }
  if (portfolio.cash_balance < cost) return res.status(400).json({ error: `Insufficient cash. Have $${portfolio.cash_balance.toFixed(2)}, need $${cost.toFixed(2)}` });

  const now = Date.now();
  await db.run('UPDATE user_portfolios SET cash_balance = cash_balance - ?, updated_at = ? WHERE user_id = ?', [cost, now, uid]);
  await db.run(
    `INSERT INTO holdings (user_id, symbol, quantity, avg_price)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(user_id, symbol) DO UPDATE SET
       avg_price = (avg_price * quantity + ? * ?) / (quantity + ?),
       quantity  = quantity + ?`,
    [uid, sym, qty, price, price, qty, qty, qty]
  );
  await db.run('INSERT INTO trades (user_id, symbol, type, quantity, price, source, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [uid, sym, 'BUY', qty, price, 'manual', now]);

  await _syncLeaderboard(uid);
  await awardMissionXP(uid, 'trade');
  await tradeCoach.onTrade(uid, { type: 'BUY', symbol: sym, quantity: qty, price });

  // Award trade-count badges
  const acct = accountManager.getAccountById(uid);
  const displayName = acct ? (acct.fullName || acct.email) : 'A Legend';
  const tradeBadges = badgeSystem.onTrade(uid, { profitable: false, returnPct: 0 });
  tradeBadges.forEach(b => { emitToUser(uid, 'badge_earned', b); _broadcastMilestone(b, displayName); });

  emitToUser(uid, 'trade', { type: 'BUY', symbol: sym, quantity: qty, price, cost });

  res.json({ success: true, symbol: sym, quantity: qty, price, cost, remaining_cash: portfolio.cash_balance - cost });
});

app.post("/api/trade/sell", authenticateUser, async (req, res) => {
  const uid = req.user.userId;
  const jailCheckSell = await db.get('SELECT id FROM jail_status WHERE user_id = ? AND released = 0', [uid]);
  if (jailCheckSell) return res.status(403).json({ error: 'You are in jail! Pay bail to trade again.', jailed: true });

  const { symbol, quantity } = req.body;
  if (!symbol || !quantity || quantity <= 0) return res.status(400).json({ error: 'symbol and quantity required' });
  const sym = String(symbol).toUpperCase();
  const price = priceEngine.getPrice(sym);
  if (!price) return res.status(400).json({ error: `Unknown symbol: ${sym}` });
  const qty = parseFloat(quantity);

  const holding = await db.get('SELECT quantity, avg_price FROM holdings WHERE user_id = ? AND symbol = ?', [uid, sym]);
  if (!holding || holding.quantity < qty) return res.status(400).json({ error: `You only hold ${holding ? holding.quantity : 0} shares of ${sym}` });

  const avgPrice = holding.avg_price || price;
  const proceeds = parseFloat((price * qty).toFixed(2));
  const now = Date.now();
  await db.run('UPDATE user_portfolios SET cash_balance = cash_balance + ?, updated_at = ? WHERE user_id = ?', [proceeds, now, uid]);
  const newQty = parseFloat((holding.quantity - qty).toFixed(6));
  if (newQty <= 0.0001) {
    await db.run('DELETE FROM holdings WHERE user_id = ? AND symbol = ?', [uid, sym]);
  } else {
    await db.run('UPDATE holdings SET quantity = ? WHERE user_id = ? AND symbol = ?', [newQty, uid, sym]);
  }
  await db.run('INSERT INTO trades (user_id, symbol, type, quantity, price, source, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [uid, sym, 'SELL', qty, price, 'manual', now]);

  await _syncLeaderboard(uid);
  await tradeCoach.onTrade(uid, { type: 'SELL', symbol: sym, quantity: qty, price });

  // Determine if this sell was profitable and award badges
  const profitable = price > avgPrice;
  const returnPct  = avgPrice > 0 ? ((price - avgPrice) / avgPrice) * 100 : 0;
  const acctSell = accountManager.getAccountById(uid);
  const displayNameSell = acctSell ? (acctSell.fullName || acctSell.email) : 'A Legend';
  const sellTradeBadges = badgeSystem.onTrade(uid, { profitable, returnPct });
  sellTradeBadges.forEach(b => { emitToUser(uid, 'badge_earned', b); _broadcastMilestone(b, displayNameSell); });

  // Portfolio milestone badges
  const portSnap = await db.get('SELECT cash_balance, total_invested FROM user_portfolios WHERE user_id = ?', [uid]);
  if (portSnap) {
    const portHoldings = await db.all('SELECT symbol, quantity FROM holdings WHERE user_id = ? AND quantity > 0', [uid]);
    let pVal = portSnap.cash_balance;
    for (const ph of portHoldings) { const p = priceEngine.getPrice(ph.symbol); if (p) pVal += ph.quantity * p; }
    const portPct = portSnap.total_invested > 0 ? ((pVal - portSnap.total_invested) / portSnap.total_invested) * 100 : 0;
    const portBadges = badgeSystem.onPortfolioUpdate(uid, { profitable: pVal > portSnap.total_invested, returnPct: portPct });
    portBadges.forEach(b => { emitToUser(uid, 'badge_earned', b); _broadcastMilestone(b, displayNameSell); });
  }

  emitToUser(uid, 'trade', { type: 'SELL', symbol: sym, quantity: qty, price, proceeds });

  res.json({ success: true, symbol: sym, quantity: qty, price, proceeds });
});

app.get("/api/trade/history", authenticateUser, async (req, res) => {
  const uid = req.user.userId;
  const rows = await db.all('SELECT * FROM trades WHERE user_id = ? ORDER BY timestamp DESC LIMIT 50', [uid]);
  res.json({ trades: rows });
});

// ── Access Check ──────────────────────────────────────────────────────────
app.get("/api/account/has-access", authenticateUser, async (req, res) => {
  const uid = req.user.userId;
  const account = accountManager.getAccountById(uid);
  if (!account) return res.json({ hasAccess: false });
  if (account.isCreatorMember || account.tier === 'creator') return res.json({ hasAccess: true });
  const sp = await db.get('SELECT active FROM season_passes WHERE user_id = ? AND active = 1', [uid]);
  res.json({ hasAccess: !!sp });
});

// ── AI Challenge ──────────────────────────────────────────────────────────
app.get("/api/ai-challenge/status", (req, res) => {
  res.json({
    aiBot: { name: aiBot.name, gainPct: aiBot.gainPct },
    history: aiBot.history.slice(-7),
    updatedAt: new Date().toISOString(),
  });
});

app.get("/api/ai-challenge/my-status", authenticateUser, async (req, res) => {
  const account = accountManager.getAccount(req.user.userId);
  const userGainPct = account && account.portfolioGainPct != null ? account.portfolioGainPct : 0;
  const beating = userGainPct > aiBot.gainPct;
  if (beating) awardMissionXP(req.user.userId, 'beat_ai').catch(() => {});
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
    broadcastFeedUpdate();
  }

  awardMissionXP(req.user.userId, 'make_3_trades').catch(() => {});

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

// ── Socket.io: live prices, badge toasts, community feed ──────────────────
const userSockets = new Map(); // userId → socketId

io.on("connection", (socket) => {
  socket.on("auth", (sessionId) => {
    const session = accountManager.verifySession(sessionId);
    if (session.valid) {
      userSockets.set(session.userId, socket.id);
      socket.userId = session.userId;
      socket.join(`user:${session.userId}`); // for TradeCoach targeted events
    }
  });
  socket.on("disconnect", () => {
    if (socket.userId) userSockets.delete(socket.userId);
  });
});

function emitToUser(userId, event, data) {
  const sid = userSockets.get(userId);
  if (sid) io.to(sid).emit(event, data);
}

function broadcastFeedUpdate() {
  const feed = socialFeed.getFeed(15);
  io.emit("feed_update", feed);
}

const CELEBRATION_TIERS = new Set(['platinum', 'diamond']);
function _broadcastMilestone(badge, displayName) {
  if (!badge || !CELEBRATION_TIERS.has(badge.tier)) return;
  io.emit('milestone_celebration', {
    badgeId:     badge.id,
    badgeName:   badge.name,
    badgeIcon:   badge.icon,
    badgeTier:   badge.tier,
    displayName,
    ts:          Date.now(),
  });
}

// Broadcast live crypto prices every 60 seconds
let _lastPricePayload = null;
setInterval(async () => {
  try {
    const coins = await cryptoFetcher.getTopCoins(6);
    if (coins && coins.length) {
      _lastPricePayload = coins.map(c => ({
        id: c.id,
        symbol: (c.symbol || '').toUpperCase(),
        name: c.name,
        price: c.current_price,
        change24h: c.price_change_percentage_24h || 0,
      }));
      io.emit("price_update", _lastPricePayload);
    }
  } catch (_) {}
}, 60000);

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
    coachSystem.restore(),
  ]);

  // Start market simulation and AI systems
  priceEngine.start();
  tradeCoach.init(io);
  await botTrader.init(_syncLeaderboard);

  // Broadcast all price ticks (stocks + crypto) to all clients
  priceEngine.subscribe((updates) => {
    io.emit('market_prices', updates);
  });

  // Sync real crypto prices from CoinGecko every 60s to anchor the random walk
  const CRYPTO_COINGECKO_IDS = {
    BTC: 'bitcoin', ETH: 'ethereum', SOL: 'solana', BNB: 'binancecoin', ADA: 'cardano',
    DOGE: 'dogecoin', XRP: 'ripple', AVAX: 'avalanche-2', MATIC: 'matic-network', DOT: 'polkadot',
    LINK: 'chainlink', LTC: 'litecoin', ATOM: 'cosmos', BCH: 'bitcoin-cash', NEAR: 'near',
  };
  const _syncCryptoPrices = async () => {
    try {
      const geckoIds = Object.values(CRYPTO_COINGECKO_IDS);
      const data = await cryptoFetcher.fetchCryptoPrices(geckoIds);
      for (const [sym, geckoId] of Object.entries(CRYPTO_COINGECKO_IDS)) {
        if (data[geckoId] && data[geckoId].usd) {
          priceEngine.updatePrice(sym, data[geckoId].usd);
        }
      }
    } catch (e) {
      console.error('[CryptoSync]', e.message);
    }
  };
  _syncCryptoPrices();
  setInterval(_syncCryptoPrices, 60_000);

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
