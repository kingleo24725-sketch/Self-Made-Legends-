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

// ── Underworld Armory ─────────────────────────────────────────────────────────
const WEAPONS = {
  rusty_shiv:       { tier:1,  label:'Rusty Shiv',          icon:'🔪', price_cents:  599, successBonus:0.03, maxPctBonus:0.01, catchReduction:0.00 },
  switchblade:      { tier:2,  label:'Switchblade',         icon:'⚔️', price_cents:  699, successBonus:0.05, maxPctBonus:0.02, catchReduction:0.00 },
  baseball_bat:     { tier:3,  label:'Baseball Bat',        icon:'🏏', price_cents:  799, successBonus:0.08, maxPctBonus:0.03, catchReduction:0.00 },
  crowbar:          { tier:4,  label:'Crowbar',             icon:'🪝', price_cents:  999, successBonus:0.10, maxPctBonus:0.05, catchReduction:0.03 },
  brass_knuckles:   { tier:5,  label:'Brass Knuckles',      icon:'👊', price_cents: 1299, successBonus:0.12, maxPctBonus:0.07, catchReduction:0.05 },
  taser:            { tier:6,  label:'Taser',               icon:'⚡', price_cents: 1499, successBonus:0.15, maxPctBonus:0.09, catchReduction:0.08 },
  smoke_grenade:    { tier:7,  label:'Smoke Grenade',       icon:'💨', price_cents: 1999, successBonus:0.18, maxPctBonus:0.12, catchReduction:0.10 },
  glock:            { tier:8,  label:'Glock 19',            icon:'🔫', price_cents: 2499, successBonus:0.22, maxPctBonus:0.15, catchReduction:0.13 },
  ak47:             { tier:9,  label:'AK-47',               icon:'🪖', price_cents: 3999, successBonus:0.28, maxPctBonus:0.20, catchReduction:0.18 },
  military_arsenal: { tier:10, label:'Military Arsenal',    icon:'💣', price_cents: 5499, successBonus:0.35, maxPctBonus:0.25, catchReduction:0.22 },
};

const GUARD_DOGS = {
  chihuahua:        { tier:1,  label:'Chihuahua',           icon:'🐕', price_cents:  599, biteChance:0.15, biteDamagePct:0.03 },
  pomeranian:       { tier:2,  label:'Pomeranian',          icon:'🐩', price_cents:  699, biteChance:0.20, biteDamagePct:0.05 },
  beagle:           { tier:3,  label:'Beagle',              icon:'🦴', price_cents:  899, biteChance:0.25, biteDamagePct:0.07 },
  pit_bull:         { tier:4,  label:'Pit Bull',            icon:'🐾', price_cents: 1099, biteChance:0.30, biteDamagePct:0.10 },
  german_shepherd:  { tier:5,  label:'German Shepherd',     icon:'🦮', price_cents: 1499, biteChance:0.35, biteDamagePct:0.13 },
  doberman:         { tier:6,  label:'Doberman',            icon:'🐕', price_cents: 1999, biteChance:0.40, biteDamagePct:0.16 },
  rottweiler:       { tier:7,  label:'Rottweiler',          icon:'🐕', price_cents: 2499, biteChance:0.45, biteDamagePct:0.20 },
  belgian_malinois: { tier:8,  label:'Belgian Malinois',    icon:'🐆', price_cents: 3499, biteChance:0.50, biteDamagePct:0.24 },
  wolf_hybrid:      { tier:9,  label:'Wolf Hybrid',         icon:'🐺', price_cents: 4499, biteChance:0.55, biteDamagePct:0.28 },
  hellhounds:       { tier:10, label:'Pack of Hellhounds',  icon:'🔥', price_cents: 6499, biteChance:0.65, biteDamagePct:0.35 },
};

// Durability decrements on every heist attempt against the owner; row deleted at 0
const SHIELDS = {
  iron:     { tier:1, label:'Iron Shield',     icon:'🛡️',   price_cents:   0, maxDurability:  3, successReduction:0.10, maxPctReduction:0.00 },
  steel:    { tier:2, label:'Steel Shield',    icon:'⚡🛡️',  price_cents: 800, maxDurability:  7, successReduction:0.25, maxPctReduction:0.10 },
  titanium: { tier:3, label:'Titanium Shield', icon:'💎🛡️',  price_cents:1100, maxDurability: 12, successReduction:0.40, maxPctReduction:0.20 },
};

// Daily perk amounts by streak day (index 0 = day 1). Days 7+ hold at $100.
const DAILY_PERK_AMOUNTS = [25, 25, 50, 50, 75, 75, 100];
function _dailyPerkAmount(streak) {
  return DAILY_PERK_AMOUNTS[Math.min(streak - 1, DAILY_PERK_AMOUNTS.length - 1)];
}

// ── Getaway Vehicles ──────────────────────────────────────────────────────────
const GETAWAY_VEHICLES = {
  bicycle:    { tier:1, label:'Bicycle',    icon:'🚲', price_cents:  649, catchReduction:0.05, bailReduction:0.05 },
  moped:      { tier:2, label:'Moped',      icon:'🛵', price_cents:  799, catchReduction:0.10, bailReduction:0.10 },
  motorcycle: { tier:3, label:'Motorcycle', icon:'🏍️', price_cents:  999, catchReduction:0.18, bailReduction:0.15 },
  sports_car: { tier:4, label:'Sports Car', icon:'🚗', price_cents: 1299, catchReduction:0.25, bailReduction:0.20 },
  supercar:   { tier:5, label:'Supercar',   icon:'🏎️', price_cents: 1799, catchReduction:0.33, bailReduction:0.30 },
  helicopter: { tier:6, label:'Helicopter', icon:'🚁', price_cents: 2499, catchReduction:0.42, bailReduction:0.40 },
};

// ── Virtual Real Estate ───────────────────────────────────────────────────────
const REAL_ESTATE = {
  corner_store: { tier:1, label:'Corner Store', icon:'🏪', price_cents:  999, daily_income:   50 },
  apartment:    { tier:2, label:'Apartment',    icon:'🏢', price_cents: 1499, daily_income:  150 },
  restaurant:   { tier:3, label:'Restaurant',   icon:'🍽️', price_cents: 2499, daily_income:  400 },
  nightclub:    { tier:4, label:'Nightclub',    icon:'🎭', price_cents: 3999, daily_income:  900 },
  casino:       { tier:5, label:'Casino',       icon:'🎰', price_cents: 6499, daily_income: 2000 },
  skyscraper:   { tier:6, label:'Skyscraper',   icon:'🏙️', price_cents:10499, daily_income: 5000 },
};

// ── Cars / Garage ─────────────────────────────────────────────────────────────
const CARS = {
  beater:    { tier:1, label:'Beater',        icon:'🚘', price_cents:  999, speed:20, stealth:10, style:5,  desc:'Gets you from A to B. Barely.' },
  street:    { tier:2, label:'Street Racer',  icon:'🚗', price_cents: 1499, speed:40, stealth:20, style:20, desc:'A solid street-level runner.' },
  sports:    { tier:3, label:'Sports Car',    icon:'🏎️', price_cents: 2499, speed:60, stealth:35, style:45, desc:'Turns heads and outrruns cops.' },
  luxury:    { tier:4, label:'Luxury Sedan',  icon:'🚙', price_cents: 4499, speed:65, stealth:60, style:70, desc:'Low-key rich. The dream.' },
  supercar:  { tier:5, label:'Supercar',      icon:'🏎️', price_cents: 7499, speed:85, stealth:50, style:85, desc:'0-60 in the time it takes to blink.' },
  hypercar:  { tier:6, label:'Hypercar',      icon:'🚀', price_cents:10499, speed:99, stealth:70, style:99, desc:'The pinnacle. Legends only.' },
};

// ── Pets ─────────────────────────────────────────────────────────────────────
const PETS = {
  dog:    { key:'dog',    label:'Dog',    icon:'🐕', price_cents: 999,  rarity:'common',    daily_income: 500,   guard_bonus:0.05, desc:'Man\'s best friend.' },
  cat:    { key:'cat',    label:'Cat',    icon:'🐈', price_cents: 999,  rarity:'common',    daily_income: 400,   guard_bonus:0.03, desc:'Does what it wants.' },
  snake:  { key:'snake',  label:'Snake',  icon:'🐍', price_cents: 1999, rarity:'uncommon',  daily_income: 1500,  guard_bonus:0.08, desc:'Intimidates trespassers.' },
  hawk:   { key:'hawk',   label:'Hawk',   icon:'🦅', price_cents: 1999, rarity:'uncommon',  daily_income: 2000,  guard_bonus:0.10, desc:'Watches your back from above.' },
  tiger:  { key:'tiger',  label:'Tiger',  icon:'🐯', price_cents: 1999, rarity:'rare',      daily_income: 5000,  guard_bonus:0.20, desc:'Nobody tests a tiger owner.' },
  dragon: { key:'dragon', label:'Dragon', icon:'🐉', price_cents: 3499, rarity:'legendary', daily_income:10000,  guard_bonus:0.35, desc:'Absolute legend status.' },
};

// ── Weapon Ability Unlocks (level 10) ────────────────────────────────────────
const WEAPON_ABILITIES = {
  rusty_shiv:       { ability:'First Blood',     desc:'First heist each day gets +5% success rate' },
  switchblade:      { ability:'Silent Strike',    desc:'Catch rate reduced extra 5% on every heist' },
  baseball_bat:     { ability:'Intimidation',     desc:'Target loses 10% more cash per heist' },
  crowbar:          { ability:'Safe Cracker',     desc:'+3% max steal percentage on all heists' },
  brass_knuckles:   { ability:'Iron Will',        desc:'On failed heist escape with 50% loot instead of 0%' },
  taser:            { ability:'Overcharge',       desc:'Defender guard dog bite reduced 50%' },
  smoke_grenade:    { ability:'Ghost Protocol',   desc:'20% chance heist leaves no trace — no heat gain' },
  glock:            { ability:'Head of the Pack', desc:'Team heists: +3% success per extra teammate' },
  ak47:             { ability:'War Economy',      desc:'+10% value when converted from heist payout' },
  military_arsenal: { ability:'Full Arsenal',     desc:'All heist bonuses stack; +5% across success/steal/catch' },
};

const WEAPON_MODS_CATALOG = {
  silencer: { key:'silencer', label:'Silencer',      icon:'🔇', desc:'Catch rate -8%',    price_credits:300, catchReduction:0.08 },
  scope:    { key:'scope',    label:'Scope',          icon:'🔭', desc:'Success rate +5%',  price_credits:300, successBonus:0.05 },
  laser:    { key:'laser',    label:'Laser Sight',    icon:'🔴', desc:'Max steal +3%',     price_credits:400, maxPctBonus:0.03 },
  grip:     { key:'grip',     label:'Tactical Grip',  icon:'🖐️', desc:'Escape speed +5%', price_credits:250, bailReduction:0.05 },
};

const WEAPON_SKINS_CATALOG = {
  gold:    { key:'gold',    label:'Gold Plated',    icon:'🏆', desc:'Drip so hard.',           price_credits:500 },
  diamond: { key:'diamond', label:'Diamond Coated', icon:'💎', desc:'For the real legends.',   price_credits:800 },
  crimson: { key:'crimson', label:'Crimson Blaze',  icon:'🔴', desc:"They'll see you coming.", price_credits:400 },
  phantom: { key:'phantom', label:'Phantom Black',  icon:'🖤', desc:'Darkness personified.',   price_credits:600 },
};

const WEAPON_XP_PER_HEIST = 15;

// ── Crew Territory ────────────────────────────────────────────────────────────
const NEIGHBORHOODS = [
  { id:'downtown',   name:'Downtown',          icon:'🏙️', baseIncome:5000 },
  { id:'harbor',     name:'Harbor District',   icon:'⚓',  baseIncome:4000 },
  { id:'eastside',   name:'East Side',         icon:'🏚️', baseIncome:3000 },
  { id:'westside',   name:'West Side',         icon:'🏘️', baseIncome:3000 },
  { id:'uptown',     name:'Uptown',            icon:'🏰', baseIncome:7000 },
  { id:'strip',      name:'The Strip',         icon:'🎰', baseIncome:6000 },
  { id:'industrial', name:'Industrial Zone',   icon:'🏭', baseIncome:2500 },
  { id:'airport',    name:'Airport',           icon:'✈️', baseIncome:5500 },
  { id:'financial',  name:'Financial District',icon:'📊', baseIncome:8000 },
  { id:'projects',   name:'The Projects',      icon:'🏗️', baseIncome:2000 },
];

// ── Seasonal Story Mode ───────────────────────────────────────────────────────
const CURRENT_SEASON = 'S1';
const SEASON_CHAPTERS = {
  S1: [
    { num:1, title:'First Dollar',  icon:'💵', xp_required:0,    reward_credits:500,  reward_paper:10000,   reward_badge:'Chapter1', body:"Every legend starts broke. You scraped together your first trade, watched the market, and made your first dollar. The journey begins." },
    { num:2, title:'First Deal',    icon:'🤝', xp_required:500,  reward_credits:1000, reward_paper:50000,   reward_badge:'Chapter2', body:"Word got out. Someone needed a plug and you were there. Your first real deal went down — no middleman, no safety net. Pure hustle." },
    { num:3, title:'First Enemy',   icon:'⚔️', xp_required:1500, reward_credits:2000, reward_paper:100000,  reward_badge:'Chapter3', body:"You moved into someone else's territory. They noticed. Your first enemy made themselves known — and you realized this game has real stakes." },
    { num:4, title:'First Crew',    icon:'👥', xp_required:3000, reward_credits:3000, reward_paper:250000,  reward_badge:'Chapter4', body:"Lone wolves don't build empires. You linked up with riders who move like you move. The crew is official. Now you operate as one." },
    { num:5, title:'The Come Up',   icon:'👑', xp_required:5000, reward_credits:5000, reward_paper:1000000, reward_badge:'SelfMade', body:"From nothing to something. Every bet, every trade, every risk paid off. You're not the same person who started. You're Self-Made." },
  ],
};

// ── Loot Box drop table ───────────────────────────────────────────────────────
const LOOT_DROPS = {
  common:    [
    { weight:40, type:'paper',   value:10000,  label:'$10,000 Paper Money' },
    { weight:30, type:'paper',   value:25000,  label:'$25,000 Paper Money' },
    { weight:20, type:'credits', value:50,     label:'50 SML Credits' },
    { weight:10, type:'paper',   value:50000,  label:'$50,000 Paper Money' },
  ],
  premium:   [
    { weight:30, type:'paper',   value:100000, label:'$100,000 Paper Money' },
    { weight:25, type:'credits', value:500,    label:'500 SML Credits' },
    { weight:20, type:'credits', value:1000,   label:'1,000 SML Credits' },
    { weight:15, type:'paper',   value:500000, label:'$500,000 Paper Money' },
    { weight:7,  type:'credits', value:2000,   label:'2,000 SML Credits' },
    { weight:3,  type:'paper',   value:1000000,label:'$1,000,000 Paper Money' },
  ],
};

// ── Flash Challenge pool ──────────────────────────────────────────────────────
const FLASH_CHALLENGES = [
  { type:'trade',  title:'Bull Rush',   description:'Make 3 profitable trades in the next 20 minutes',    reward_type:'paper',   reward_value:25000,  duration_mins:20 },
  { type:'heist',  title:'Heist Hour',  description:'Complete 1 successful heist in the next 30 minutes', reward_type:'credits', reward_value:200,    duration_mins:30 },
  { type:'dice',   title:'Lucky Roll',  description:'Roll the dice 5 times in the next 15 minutes',       reward_type:'box',     reward_value:1,      duration_mins:15 },
  { type:'spin',   title:'Spin Fever',  description:'Spin the wheel 3 times in the next 10 minutes',      reward_type:'paper',   reward_value:50000,  duration_mins:10 },
  { type:'login',  title:'Early Bird',  description:'Be online in the next 5 minutes to claim your reward', reward_type:'credits', reward_value:100,  duration_mins:5  },
  { type:'trade',  title:'Crypto Surge',description:'Make 2 crypto trades in the next 25 minutes',        reward_type:'paper',   reward_value:75000,  duration_mins:25 },
  { type:'heist',  title:'Crew Run',    description:'Initiate any heist in the next 20 minutes',           reward_type:'box',     reward_value:1,      duration_mins:20 },
];

// ── Spin the Wheel prizes (weight-based) ─────────────────────────────────────
const SPIN_PRIZES = [
  { weight:28, type:'paper',   amount:25,   label:'$25 Paper Money'    },
  { weight:22, type:'paper',   amount:50,   label:'$50 Paper Money'    },
  { weight:15, type:'paper',   amount:100,  label:'$100 Paper Money'   },
  { weight:12, type:'paper',   amount:250,  label:'$250 Paper Money'   },
  { weight:8,  type:'paper',   amount:500,  label:'$500 Paper Money'   },
  { weight:5,  type:'paper',   amount:1000, label:'$1,000 Paper Money' },
  { weight:5,  type:'credits', amount:100,  label:'100 SML Credits'    },
  { weight:3,  type:'credits', amount:500,  label:'500 SML Credits'    },
  { weight:2,  type:'credits', amount:1000, label:'1,000 SML Credits'  },
];

// ── Battle Pass ───────────────────────────────────────────────────────────────
const BATTLE_PASS_SEASON = 'S1';
const BATTLE_PASS_PRICE_CENTS = 499;
const BATTLE_PASS_TIERS = [
  { tier:1,  xp:  100, free:{ type:'paper',   amount:  50 }, paid:{ type:'paper',   amount:  150 } },
  { tier:2,  xp:  250, free:{ type:'paper',   amount:  75 }, paid:{ type:'credits', amount:  200 } },
  { tier:3,  xp:  500, free:{ type:'credits', amount: 100 }, paid:{ type:'paper',   amount:  250 } },
  { tier:4,  xp:  800, free:{ type:'paper',   amount: 100 }, paid:{ type:'credits', amount:  300 } },
  { tier:5,  xp: 1200, free:{ type:'paper',   amount: 150 }, paid:{ type:'paper',   amount:  500 } },
  { tier:6,  xp: 1700, free:{ type:'credits', amount: 150 }, paid:{ type:'credits', amount:  500 } },
  { tier:7,  xp: 2300, free:{ type:'paper',   amount: 200 }, paid:{ type:'paper',   amount:  750 } },
  { tier:8,  xp: 3000, free:{ type:'paper',   amount: 300 }, paid:{ type:'credits', amount:  750 } },
  { tier:9,  xp: 3800, free:{ type:'credits', amount: 250 }, paid:{ type:'paper',   amount: 1000 } },
  { tier:10, xp: 5000, free:{ type:'paper',   amount: 500 }, paid:{ type:'paper',   amount: 2500 } },
];

// ── Boss Heist & Community Challenge ─────────────────────────────────────────
const BOSS_HEIST_HP   = 5000;
const BOSS_HEIST_LOOT = 50000;
const COMMUNITY_CHALLENGE_TARGET = 1000;
const COMMUNITY_CHALLENGE_REWARD = 500;

// ── Market News Events ────────────────────────────────────────────────────────
const MARKET_SYMBOLS = ['AAPL','MSFT','GOOGL','TSLA','AMZN','META','NVDA','BTC','ETH','SOL'];
const MARKET_NEWS_UP = [
  { headline:'{{sym}} announces record earnings — analysts raise price target',  pct: 0.35 },
  { headline:'{{sym}} lands massive government contract — shares surge',          pct: 0.28 },
  { headline:'{{sym}} CEO reveals groundbreaking product — market erupts',        pct: 0.40 },
  { headline:'{{sym}} partnership with tech giant confirmed — investors celebrate', pct: 0.32 },
  { headline:'Retail investors pile into {{sym}} — short squeeze incoming',       pct: 0.50 },
  { headline:'{{sym}} reports 3× analyst estimate growth',                        pct: 0.22 },
];
const MARKET_NEWS_DOWN = [
  { headline:'{{sym}} CEO under investigation — shares plummet',                  pct:-0.38 },
  { headline:'Regulators launch probe into {{sym}} — stock crashes',              pct:-0.45 },
  { headline:'{{sym}} misses earnings by wide margin — panic selling begins',     pct:-0.30 },
  { headline:'Major {{sym}} product recall announced — investors flee',           pct:-0.35 },
  { headline:'Whistleblower exposes {{sym}} fraud — circuit breakers triggered',  pct:-0.55 },
  { headline:'{{sym}} halves its dividend — holders rush to exit',                pct:-0.25 },
];

// ── Referral Milestone Rewards ────────────────────────────────────────────────
const REFERRAL_MILESTONES = [
  { count:1,  credits:500,   paper:0,      badge:'Recruiter',    label:'First Recruit' },
  { count:5,  credits:2500,  paper:0,      badge:'Connector',    label:'5 Signups' },
  { count:10, credits:10000, paper:0,      badge:'LegendMaker',  label:'10 Signups' },
  { count:25, credits:25000, paper:500000, badge:'TopRecruiter', label:'25 Signups' },
];

// ── Casino ────────────────────────────────────────────────────────────────────
const HORSE_NAMES = ['Lightning','Thunder','Shadow','Blaze','Storm','Ghost'];
const HORSE_ODDS  = [2.5, 3.0, 4.0, 5.0, 7.0, 10.0]; // fixed odds for simplicity
const BLACKJACK_SUITS = ['♠','♥','♦','♣'];
const BLACKJACK_RANKS = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
const CASINO_MIN_BET = 1000;
const CASINO_VIP_MIN = 500000;
function _buildDeck() {
  const deck = [];
  for (const s of BLACKJACK_SUITS) for (const r of BLACKJACK_RANKS) deck.push(`${r}${s}`);
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}
function _cardValue(card) {
  const r = card.slice(0, -1);
  if (r === 'A') return 11;
  if (['J','Q','K'].includes(r)) return 10;
  return parseInt(r);
}
function _handTotal(cards) {
  let total = cards.reduce((s, c) => s + _cardValue(c), 0);
  let aces  = cards.filter(c => c.startsWith('A')).length;
  while (total > 21 && aces > 0) { total -= 10; aces--; }
  return total;
}

// ── Trade War ─────────────────────────────────────────────────────────────────
const TRADE_WAR_ENTRY_CREDITS = 500;
const TRADE_WAR_START_CASH    = 100000;
const TRADE_WAR_DURATION_MS   = 60 * 60 * 1000; // 1 hour
const TRADE_WAR_PRIZES        = [10000, 5000, 2500]; // credits for top 3

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
      // Persist referral event and give both parties instant signup bonus
      (async () => {
        try {
          const refRow = await db.get('SELECT user_id FROM referral_links WHERE code = ?', [referralCode]);
          if (refRow) {
            const referrerId = refRow.user_id;
            const now = Date.now();
            await db.run('UPDATE referral_links SET signups = signups + 1 WHERE code = ?', [referralCode]);
            await db.run('INSERT INTO referral_events (code, referrer_id, referee_id, event_type, bonus_paid, created_at) VALUES (?, ?, ?, ?, ?, ?)',
              [referralCode, referrerId, result.userId, 'signup', 500, now]);
            // Give referee 500 paper money immediately
            await db.run('UPDATE user_portfolios SET cash_balance = cash_balance + 500, updated_at = ? WHERE user_id = ?', [now, result.userId]);
            // Give referrer 500 paper money immediately
            await db.run('UPDATE user_portfolios SET cash_balance = cash_balance + 500, updated_at = ? WHERE user_id = ?', [now, referrerId]);
            await _syncLeaderboard(referrerId);
            emitToUser(referrerId, 'referral_bonus', { amount: 500, message: '🔗 +$500 paper money — your referral just signed up!' });
          }
        } catch (_) {}
      })();
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

// Helper: complete a mission action with Season Pass and XP Booster multipliers
async function awardMissionXP(userId, actionId) {
  const [passRow, boostRow, eliteRow] = await Promise.all([
    db.get('SELECT active FROM season_passes WHERE user_id = ? AND active = 1', [userId]),
    db.get('SELECT active_until, multiplier FROM xp_boosts WHERE user_id = ?', [userId]),
    db.get('SELECT active FROM elite_memberships WHERE user_id = ?', [userId]),
  ]);
  let mult = 1;
  if (passRow) mult *= 1.5;
  if (eliteRow && eliteRow.active) mult *= 2;
  if (boostRow && boostRow.active_until > Date.now()) mult *= boostRow.multiplier;
  return missionSystem.completeAction(userId, actionId, mult);
}

// Helper: create a persistent notification and emit socket event
async function _notify(userId, type, title, body) {
  try {
    await db.run(
      'INSERT INTO notifications (user_id, type, title, body, read, created_at) VALUES (?, ?, ?, ?, 0, ?)',
      [userId, type, title, body, Date.now()]
    );
    emitToUser(userId, 'notification', { type, title, body, timestamp: Date.now() });
  } catch (_) {}
}


// Helper: award creator commission when a referred user makes a purchase
async function _awardCreatorCommission(buyerUserId, purchaseType, credits) {
  try {
    const commissionCredits = Math.floor(credits * 0.10);
    if (commissionCredits < 1) return;
    const ref = await db.get(
      "SELECT referrer_id FROM referral_events WHERE referee_id = ? AND event_type = 'signup' LIMIT 1",
      [buyerUserId]
    );
    if (!ref) return;
    const creatorRow = await db.get('SELECT active FROM creator_memberships WHERE user_id = ? AND active = 1', [ref.referrer_id]);
    if (!creatorRow) return;
    const bal = await _addCredits(ref.referrer_id, commissionCredits, 'creator_commission', `Creator commission from ${purchaseType}`);
    await db.run(
      'INSERT INTO creator_commissions (creator_id, source_user_id, purchase_type, credits_awarded, created_at) VALUES (?, ?, ?, ?, ?)',
      [ref.referrer_id, buyerUserId, purchaseType, commissionCredits, Date.now()]
    );
    emitToUser(ref.referrer_id, 'creator_commission', { amount: commissionCredits, balance: bal, type: purchaseType });
  } catch (_) {}
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
        await _awardCreatorCommission(userId, 'credits_500', 500);

      } else if (type === 'credit_topup_legends') {
        const bal = await _addCredits(userId, 2500, 'topup', 'Legends Pack purchase');
        emitToUser(userId, 'purchase_complete', { type: 'credits', amount: 2500, balance: bal, message: '💎 2,500 SML Credits added!' });
        await _awardCreatorCommission(userId, 'credits_2500', 2500);

      } else if (type === 'credit_topup_champion') {
        const bal = await _addCredits(userId, 7000, 'topup', 'Champion Pack purchase');
        emitToUser(userId, 'purchase_complete', { type: 'credits', amount: 7000, balance: bal, message: '💎 7,000 SML Credits added!' });
        await _awardCreatorCommission(userId, 'credits_7000', 7000);

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

      } else if (type && type.startsWith('weapon_')) {
        const weaponKey = type.slice('weapon_'.length);
        if (userId && WEAPONS[weaponKey]) {
          await db.run(
            'INSERT OR IGNORE INTO player_weapons (user_id, weapon_key, purchased_at) VALUES (?, ?, ?)',
            [userId, weaponKey, Date.now()]
          );
          const w = WEAPONS[weaponKey];
          emitToUser(userId, 'purchase_complete', { type: 'weapon', message: `${w.icon} ${w.label} equipped permanently!` });
          emitToUser(userId, 'inventory_updated', {});
          console.log(`Weapon purchased — user ${userId} weapon ${weaponKey}`);
        }

      } else if (type && type.startsWith('guard_dog_')) {
        const dogKey = type.slice('guard_dog_'.length);
        if (userId && GUARD_DOGS[dogKey]) {
          await db.run(
            'INSERT OR IGNORE INTO player_guard_dogs (user_id, dog_key, purchased_at) VALUES (?, ?, ?)',
            [userId, dogKey, Date.now()]
          );
          const d = GUARD_DOGS[dogKey];
          emitToUser(userId, 'purchase_complete', { type: 'guard_dog', message: `${d.icon} ${d.label} is now guarding you!` });
          emitToUser(userId, 'inventory_updated', {});
          console.log(`Guard dog purchased — user ${userId} dog ${dogKey}`);
        }

      } else if (type && type.startsWith('shield_')) {
        const shieldKey = type.slice('shield_'.length);
        if (userId && SHIELDS[shieldKey]) {
          const s = SHIELDS[shieldKey];
          await db.run(
            'INSERT OR REPLACE INTO player_shields (user_id, shield_key, durability, purchased_at) VALUES (?, ?, ?, ?)',
            [userId, shieldKey, s.maxDurability, Date.now()]
          );
          emitToUser(userId, 'purchase_complete', { type: 'shield', message: `${s.icon} ${s.label} activated! (${s.maxDurability} hits)` });
          emitToUser(userId, 'inventory_updated', {});
          console.log(`Shield purchased — user ${userId} shield ${shieldKey}`);
        }

      } else if (type && type.startsWith('gift_paper_money_')) {
        const packageKey = type.slice('gift_paper_money_'.length);
        const pkg = PAPER_MONEY_PACKAGES[packageKey];
        const recipientId = obj.metadata?.recipientId;
        if (userId && recipientId && pkg) {
          const now = Date.now();
          await db.run(
            `INSERT INTO user_portfolios (user_id, cash_balance, total_invested, updated_at) VALUES (?, ?, ?, ?)
             ON CONFLICT(user_id) DO UPDATE SET cash_balance = cash_balance + ?, updated_at = ?`,
            [recipientId, pkg.paper, pkg.paper, now, pkg.paper, now]
          );
          await db.run(
            'INSERT INTO paper_money_gifts (sender_id, recipient_id, amount, gift_type, stripe_session, created_at) VALUES (?, ?, ?, ?, ?, ?)',
            [userId, recipientId, pkg.paper, 'real_money_gift', obj.id, now]
          );
          await _syncLeaderboard(recipientId);
          emitToUser(recipientId, 'transfer_received', { amount: pkg.paper, senderName: _displayName(userId), isGift: true });
          console.log(`Gift paper money — sender ${userId} → recipient ${recipientId} $${pkg.paper}`);
        }

      } else if (type && type.startsWith('getaway_')) {
        const vehicleKey = type.slice('getaway_'.length);
        if (userId && GETAWAY_VEHICLES[vehicleKey]) {
          await db.run(
            'INSERT OR IGNORE INTO player_getaways (user_id, vehicle_key, purchased_at) VALUES (?, ?, ?)',
            [userId, vehicleKey, Date.now()]
          );
          const v = GETAWAY_VEHICLES[vehicleKey];
          emitToUser(userId, 'purchase_complete', { type: 'getaway', message: `${v.icon} ${v.label} ready — escape rate boosted!` });
          emitToUser(userId, 'inventory_updated', {});
          console.log(`Getaway purchased — user ${userId} vehicle ${vehicleKey}`);
        }

      } else if (type && type.startsWith('realestate_')) {
        const propKey = type.slice('realestate_'.length);
        if (userId && REAL_ESTATE[propKey]) {
          const now = Date.now();
          await db.run(
            'INSERT OR IGNORE INTO player_real_estate (user_id, property_key, purchased_at, last_collect) VALUES (?, ?, ?, ?)',
            [userId, propKey, now, now]
          );
          const p = REAL_ESTATE[propKey];
          emitToUser(userId, 'purchase_complete', { type: 'realestate', message: `${p.icon} ${p.label} acquired! Earning $${p.daily_income}/day.` });
          console.log(`Real estate purchased — user ${userId} property ${propKey}`);
        }

      } else if (type === 'battle_pass') {
        if (userId) {
          const now = Date.now();
          await db.run(
            `INSERT INTO battle_pass (user_id, season_id, pass_type, claimed_tiers, activated_at)
             VALUES (?, ?, 'paid', '[]', ?)
             ON CONFLICT(user_id) DO UPDATE SET pass_type = 'paid', activated_at = ?`,
            [userId, BATTLE_PASS_SEASON, now, now]
          );
          emitToUser(userId, 'purchase_complete', { type: 'battle_pass', message: 'Battle Pass activated! Claim your premium rewards.' });
          console.log(`Battle Pass purchased — user ${userId}`);
        }

      } else if (type === 'creator_subscription') {
        if (userId) {
          const now = Date.now();
          await db.run('INSERT OR IGNORE INTO creator_memberships (user_id, activated_at, active) VALUES (?, ?, 1)', [userId, now]);
          await db.run('UPDATE creator_memberships SET active = 1, activated_at = ? WHERE user_id = ?', [now, userId]);
          await db.run('UPDATE accounts SET is_creator = 1 WHERE id = ?', [userId]);
          emitToUser(userId, 'purchase_complete', { type: 'creator_membership', message: '👑 Creator Membership activated! Your exclusive perks are live.' });
        }
        console.log(`Creator Membership activated — user ${userId}`);

      } else if (type === 'elite_membership') {
        if (userId) {
          const now = Date.now();
          await db.run('INSERT OR IGNORE INTO elite_memberships (user_id, activated_at, active) VALUES (?, ?, 1)', [userId, now]);
          await db.run('UPDATE elite_memberships SET active = 1, activated_at = ? WHERE user_id = ?', [now, userId]);
          await db.run('UPDATE accounts SET is_elite = 1 WHERE id = ?', [userId]);
          emitToUser(userId, 'purchase_complete', { type: 'elite_membership', message: '💎 Elite Membership activated! You are in the top tier — exclusive perks unlocked.' });
          await _awardCreatorCommission(userId, 'elite_membership', 250);
        }

      } else if (type === 'legend_bundle') {
        if (userId) {
          const now = Date.now();
          await _addCredits(userId, 2500, 'bundle', 'Legend Starter Bundle — 2,500 Credits');
          await db.run('UPDATE user_portfolios SET cash_balance = cash_balance + 5000, updated_at = ? WHERE user_id = ?', [now, userId]);
          await db.run('UPDATE accounts SET is_season_pass = 1 WHERE id = ?', [userId]);
          await db.run('INSERT OR IGNORE INTO player_cosmetics (user_id, frame_style, updated_at) VALUES (?, ?, ?)', [userId, 'neon', now]);
          await db.run('UPDATE player_cosmetics SET frame_style = CASE WHEN frame_style = \'default\' THEN \'neon\' ELSE frame_style END, updated_at = ? WHERE user_id = ?', [now, userId]);
          await _syncLeaderboard(userId);
          emitToUser(userId, 'purchase_complete', { type: 'legend_bundle', message: '🎁 Legend Bundle activated! 2,500 Credits + $5,000 + Neon Frame added.' });
        }

      } else if (type && type.startsWith('gift_credits_')) {
        const packageKey = type.slice('gift_credits_'.length);
        const recipientId = obj.metadata?.recipientId;
        const creditAmounts = { starter: 500, legends: 2500, champion: 7000 };
        const credits = creditAmounts[packageKey];
        if (recipientId && credits) {
          await _addCredits(recipientId, credits, 'gift', `${credits} Credits gifted by a friend`);
          emitToUser(recipientId, 'credits_received', { amount: credits, message: `🎁 You received ${credits} SML Credits as a gift!` });
          if (userId) emitToUser(userId, 'purchase_complete', { type: 'gift_credits', message: `🎁 Gift of ${credits} credits sent successfully!` });
        }

      } else if (type && type.startsWith('pet_')) {
        const petKey = type.slice('pet_'.length);
        if (userId && PETS[petKey]) {
          const p = PETS[petKey];
          const now = Date.now();
          await db.run(
            'INSERT INTO player_pets (user_id, pet_key, pet_name, happiness, xp, level, last_fed, acquired_at) VALUES (?, ?, ?, 100, 0, 1, ?, ?)',
            [userId, petKey, p.label, now, now]
          );
          await _awardBox(userId, 'pet_bonus');
          emitToUser(userId, 'purchase_complete', { type: 'pet', message: `${p.icon} Your ${p.label} has arrived! Feed it daily to keep it happy.` });
          emitToUser(userId, 'inventory_updated', {});
          console.log(`Pet purchased — user ${userId} pet ${petKey}`);
        }

      } else if (type && type.startsWith('car_')) {
        const carKey = type.slice('car_'.length);
        if (userId && CARS[carKey]) {
          const c = CARS[carKey];
          const now = Date.now();
          await db.run(
            'INSERT INTO player_cars (user_id, car_key, car_name, paint_color, acquired_at) VALUES (?, ?, ?, ?, ?)',
            [userId, carKey, c.label, '#1a1a2e', now]
          );
          emitToUser(userId, 'purchase_complete', { type: 'car', message: `${c.icon} ${c.label} added to your garage! Speed: ${c.speed}, Stealth: ${c.stealth}.` });
          emitToUser(userId, 'inventory_updated', {});
          console.log(`Car purchased — user ${userId} car ${carKey}`);
        }

      } else if (type && type.startsWith('card_pack_')) {
        const packType = type.slice('card_pack_'.length);
        if (userId) {
          const now = Date.now();
          const cards = [];
          for (let i = 0; i < 5; i++) {
            const card = await _drawCard(packType);
            if (card) {
              await db.run('INSERT INTO player_cards (user_id, card_key, acquired_at) VALUES (?, ?, ?)', [userId, card.card_key, now]);
              cards.push(card);
            }
          }
          emitToUser(userId, 'purchase_complete', { type: 'card_pack', cards, message: `🃏 ${packType === 'legendary' ? 'Legendary' : 'Rare'} Pack opened! ${cards.length} cards added to your collection.` });
          console.log(`Card pack purchased — user ${userId} pack ${packType} got ${cards.length} cards`);
        }

      } else if (type === 'loot_box_premium') {
        if (userId) {
          for (let i = 0; i < 5; i++) {
            await _awardBox(userId, 'premium_purchase');
          }
          emitToUser(userId, 'purchase_complete', { type: 'loot_box', count: 5, message: '🎁 5 Premium Mystery Boxes added to your account!' });
          console.log(`Premium loot boxes purchased — user ${userId} +5 boxes`);
        }

      } else if (type === 'casino_vip') {
        if (userId) {
          const now = Date.now();
          await db.run(
            'INSERT OR IGNORE INTO elite_memberships (user_id, activated_at, active) VALUES (?, ?, 1)',
            [userId, now]
          );
          await db.run('UPDATE accounts SET casino_vip = 1 WHERE id = ?', [userId]);
          emitToUser(userId, 'purchase_complete', { type: 'casino_vip', message: '🎰 VIP Casino Access activated! High-stakes tables unlocked.' });
          console.log(`Casino VIP activated — user ${userId}`);
        }
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

// POST /api/stripe/buy-weapon
app.post("/api/stripe/buy-weapon", authenticateUser, async (req, res) => {
  if (!stripeProcessor) return res.status(503).json({ error: "Payment processing not configured" });
  const uid = req.user.userId;
  const { weaponKey } = req.body;
  const weapon = WEAPONS[weaponKey];
  if (!weapon) return res.status(400).json({ error: 'Unknown weapon' });
  try {
    const account = accountManager.getAccountById(uid);
    const result = await stripeProcessor.createWeaponCheckout(uid, account?.email || '', weaponKey, weapon.label, weapon.price_cents);
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('[buy-weapon]', err.message);
    res.status(500).json({ error: 'Checkout failed: ' + err.message });
  }
});

// POST /api/stripe/buy-guard-dog
app.post("/api/stripe/buy-guard-dog", authenticateUser, async (req, res) => {
  if (!stripeProcessor) return res.status(503).json({ error: "Payment processing not configured" });
  const uid = req.user.userId;
  const { dogKey } = req.body;
  const dog = GUARD_DOGS[dogKey];
  if (!dog) return res.status(400).json({ error: 'Unknown guard dog' });
  try {
    const account = accountManager.getAccountById(uid);
    const result = await stripeProcessor.createGuardDogCheckout(uid, account?.email || '', dogKey, dog.label, dog.price_cents);
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('[buy-guard-dog]', err.message);
    res.status(500).json({ error: 'Checkout failed: ' + err.message });
  }
});

// POST /api/stripe/buy-shield  (steel and titanium only — iron is free via claim endpoint)
app.post("/api/stripe/buy-shield", authenticateUser, async (req, res) => {
  if (!stripeProcessor) return res.status(503).json({ error: "Payment processing not configured" });
  const uid = req.user.userId;
  const { shieldKey } = req.body;
  const shield = SHIELDS[shieldKey];
  if (!shield) return res.status(400).json({ error: 'Unknown shield' });
  if (shield.price_cents === 0) return res.status(400).json({ error: 'Iron Shield is free — use /api/shield/claim-free' });
  try {
    const account = accountManager.getAccountById(uid);
    const result = await stripeProcessor.createShieldCheckout(uid, account?.email || '', shieldKey, shield.label, shield.price_cents);
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('[buy-shield]', err.message);
    res.status(500).json({ error: 'Checkout failed: ' + err.message });
  }
});

// POST /api/shield/claim-free  (claim Iron Shield — must actively claim from Defense Shop)
app.post("/api/shield/claim-free", authenticateUser, async (req, res) => {
  const uid = req.user.userId;
  try {
    const existing = await db.get('SELECT shield_key FROM player_shields WHERE user_id = ?', [uid]);
    if (existing) return res.status(400).json({ error: `You already have a ${SHIELDS[existing.shield_key]?.label || 'shield'} active` });
    const s = SHIELDS.iron;
    await db.run(
      'INSERT INTO player_shields (user_id, shield_key, durability, purchased_at) VALUES (?, ?, ?, ?)',
      [uid, 'iron', s.maxDurability, Date.now()]
    );
    res.json({ success: true, shield: { key: 'iron', ...s, durability: s.maxDurability }, message: `${s.icon} ${s.label} claimed! (${s.maxDurability} hits)` });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/transfer/send-paper  (direct paper money transfer between players)
app.post("/api/transfer/send-paper", authenticateUser, async (req, res) => {
  const uid = req.user.userId;
  const { recipientId, amount } = req.body;
  if (!recipientId || !amount || amount <= 0) return res.status(400).json({ error: 'recipientId and positive amount required' });
  if (recipientId === uid) return res.status(400).json({ error: 'Cannot send to yourself' });
  try {
    const recipient = accountManager.getAccountById(recipientId);
    if (!recipient) return res.status(404).json({ error: 'Recipient not found' });
    const senderPortfolio = await db.get('SELECT cash_balance FROM user_portfolios WHERE user_id = ?', [uid]);
    const senderCash = senderPortfolio ? senderPortfolio.cash_balance : 0;
    if (senderCash < amount) return res.status(400).json({ error: 'Insufficient paper money' });
    const now = Date.now();
    await db.run('UPDATE user_portfolios SET cash_balance = cash_balance - ?, updated_at = ? WHERE user_id = ?', [amount, now, uid]);
    await db.run(
      `INSERT INTO user_portfolios (user_id, cash_balance, total_invested, updated_at) VALUES (?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET cash_balance = cash_balance + ?, updated_at = ?`,
      [recipientId, amount, amount, now, amount, now]
    );
    await db.run(
      'INSERT INTO paper_money_gifts (sender_id, recipient_id, amount, gift_type, created_at) VALUES (?, ?, ?, ?, ?)',
      [uid, recipientId, amount, 'paper', now]
    );
    await _syncLeaderboard(uid);
    await _syncLeaderboard(recipientId);
    emitToUser(recipientId, 'transfer_received', { amount, senderName: _displayName(uid), isGift: false });
    res.json({ success: true, message: `Sent $${amount.toFixed(2)} paper money to ${_displayName(recipientId)}` });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/stripe/gift-paper-money  (buy paper money as a Stripe gift for another player)
app.post("/api/stripe/gift-paper-money", authenticateUser, async (req, res) => {
  if (!stripeProcessor) return res.status(503).json({ error: "Payment processing not configured" });
  const uid = req.user.userId;
  const { recipientId, packageKey } = req.body;
  if (!recipientId || !packageKey) return res.status(400).json({ error: 'recipientId and packageKey required' });
  if (recipientId === uid) return res.status(400).json({ error: 'Cannot gift to yourself' });
  const pkg = PAPER_MONEY_PACKAGES[packageKey];
  if (!pkg) return res.status(400).json({ error: 'Unknown package' });
  const recipient = accountManager.getAccountById(recipientId);
  if (!recipient) return res.status(404).json({ error: 'Recipient not found' });
  try {
    const account = accountManager.getAccountById(uid);
    const result = await stripeProcessor.createGiftPaperMoneyCheckout(uid, account?.email || '', recipientId, packageKey, pkg);
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('[gift-paper-money]', err.message);
    res.status(500).json({ error: 'Checkout failed: ' + err.message });
  }
});

// GET /api/underworld/inventory  (weapons, dogs, shield for requesting user)
app.get("/api/underworld/inventory", authenticateUser, async (req, res) => {
  const uid = req.user.userId;
  try {
    const weaponRows = await db.all('SELECT weapon_key FROM player_weapons WHERE user_id = ?', [uid]);
    const dogRows    = await db.all('SELECT dog_key FROM player_guard_dogs WHERE user_id = ?', [uid]);
    const shieldRow  = await db.get('SELECT shield_key, durability FROM player_shields WHERE user_id = ?', [uid]);

    const weapons = weaponRows.map(r => r.weapon_key);
    const dogs    = dogRows.map(r => r.dog_key);

    const bestWeapon = weapons.length
      ? weapons.map(k => ({ key: k, ...WEAPONS[k] })).filter(w => w.tier).sort((a, b) => b.tier - a.tier)[0]
      : null;
    const bestDog = dogs.length
      ? dogs.map(k => ({ key: k, ...GUARD_DOGS[k] })).filter(d => d.tier).sort((a, b) => b.tier - a.tier)[0]
      : null;
    const shield = shieldRow && SHIELDS[shieldRow.shield_key]
      ? { key: shieldRow.shield_key, ...SHIELDS[shieldRow.shield_key], durability: shieldRow.durability }
      : null;

    res.json({ weapons, dogs, shield, bestWeapon, bestDog, WEAPONS, GUARD_DOGS, SHIELDS });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ===== SPIN THE WHEEL =====

app.get("/api/spin/status", authenticateUser, async (req, res) => {
  const uid = req.user.userId;
  try {
    const row = await db.get('SELECT last_spin, extra_spins FROM spin_claims WHERE user_id = ?', [uid]);
    const now = Date.now();
    const SPIN_COOLDOWN = 86400_000;
    const lastSpin = row ? row.last_spin : null;
    const canSpin = !lastSpin || (now - lastSpin) >= SPIN_COOLDOWN;
    const extraSpins = row ? (row.extra_spins || 0) : 0;
    res.json({ canSpin, extraSpins, lastSpin, nextSpinAt: lastSpin ? lastSpin + SPIN_COOLDOWN : null });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/spin/spin", authenticateUser, async (req, res) => {
  const uid = req.user.userId;
  try {
    const now = Date.now();
    const SPIN_COOLDOWN = 86400_000;
    let row = await db.get('SELECT last_spin, extra_spins FROM spin_claims WHERE user_id = ?', [uid]);
    const canFreeSpin = !row || !row.last_spin || (now - row.last_spin) >= SPIN_COOLDOWN;
    const extraSpins = row ? (row.extra_spins || 0) : 0;
    if (!canFreeSpin && extraSpins <= 0) return res.status(400).json({ error: 'No spins available — wait for daily reset or buy extra' });

    const prize = _spinWheel();
    if (canFreeSpin) {
      await db.run(
        'INSERT INTO spin_claims (user_id, last_spin, extra_spins) VALUES (?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET last_spin = ?',
        [uid, now, extraSpins, now]
      );
    } else {
      await db.run('UPDATE spin_claims SET extra_spins = extra_spins - 1 WHERE user_id = ?', [uid]);
    }

    if (prize.type === 'paper') {
      await db.run(
        `INSERT INTO user_portfolios (user_id, cash_balance, total_invested, updated_at) VALUES (?, ?, ?, ?)
         ON CONFLICT(user_id) DO UPDATE SET cash_balance = cash_balance + ?, updated_at = ?`,
        [uid, prize.amount, prize.amount, now, prize.amount, now]
      );
      await _syncLeaderboard(uid);
    } else if (prize.type === 'credits') {
      await db.run(
        'INSERT INTO sml_credits (user_id, balance, updated_at) VALUES (?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET balance = balance + ?, updated_at = ?',
        [uid, prize.amount, now, prize.amount, now]
      );
    }
    emitToUser(uid, 'spin_result', { ...prize });
    res.json({ success: true, prize });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/spin/buy-extra", authenticateUser, async (req, res) => {
  const uid = req.user.userId;
  const COST = 100;
  try {
    const credits = await db.get('SELECT balance FROM sml_credits WHERE user_id = ?', [uid]);
    if (!credits || credits.balance < COST) return res.status(400).json({ error: 'Not enough SML Credits (need 100)' });
    const now = Date.now();
    await db.run('UPDATE sml_credits SET balance = balance - ?, updated_at = ? WHERE user_id = ?', [COST, now, uid]);
    await db.run(
      'INSERT INTO spin_claims (user_id, last_spin, extra_spins) VALUES (?, NULL, 1) ON CONFLICT(user_id) DO UPDATE SET extra_spins = extra_spins + 1',
      [uid]
    );
    res.json({ success: true, message: 'Extra spin purchased! Go spin the wheel.' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ===== BOUNTY SYSTEM =====

app.get("/api/bounty/list", authenticateUser, async (req, res) => {
  try {
    const rows = await db.all(
      'SELECT id, placer_id, target_id, amount, created_at FROM bounties WHERE active = 1 ORDER BY amount DESC LIMIT 10'
    );
    const enriched = rows.map(r => ({
      ...r,
      placerName: _displayName(r.placer_id),
      targetName: _displayName(r.target_id),
    }));
    res.json({ bounties: enriched });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/bounty/place", authenticateUser, async (req, res) => {
  const uid = req.user.userId;
  const { targetId, amount } = req.body;
  if (!targetId || !amount || amount < 10) return res.status(400).json({ error: 'targetId and amount >= $10 required' });
  if (targetId === uid) return res.status(400).json({ error: 'Cannot place bounty on yourself' });
  try {
    const portfolio = await db.get('SELECT cash_balance FROM user_portfolios WHERE user_id = ?', [uid]);
    if (!portfolio || portfolio.cash_balance < amount) return res.status(400).json({ error: 'Insufficient paper money' });
    const now = Date.now();
    await db.run('UPDATE user_portfolios SET cash_balance = cash_balance - ?, updated_at = ? WHERE user_id = ?', [amount, now, uid]);
    await db.run('INSERT INTO bounties (placer_id, target_id, amount, created_at) VALUES (?, ?, ?, ?)', [uid, targetId, amount, now]);
    await _syncLeaderboard(uid);
    emitToUser(targetId, 'bounty_placed', { amount, placerName: _displayName(uid) });
    res.json({ success: true, message: `Bounty of $${amount.toFixed(2)} placed on ${_displayName(targetId)}` });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get("/api/bounty/on-me", authenticateUser, async (req, res) => {
  const uid = req.user.userId;
  try {
    const rows = await db.all(
      'SELECT id, placer_id, amount, created_at FROM bounties WHERE target_id = ? AND active = 1 ORDER BY amount DESC',
      [uid]
    );
    const total = rows.reduce((s, r) => s + r.amount, 0);
    res.json({ bounties: rows.map(r => ({ ...r, placerName: _displayName(r.placer_id) })), total });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ===== WITNESS PROTECTION =====

app.get("/api/witness-protection/status", authenticateUser, async (req, res) => {
  const uid = req.user.userId;
  try {
    const row = await db.get('SELECT active_until FROM witness_protection WHERE user_id = ?', [uid]);
    const active = row && row.active_until > Date.now();
    res.json({ active: !!active, activeUntil: row ? row.active_until : null });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/witness-protection/activate", authenticateUser, async (req, res) => {
  const uid = req.user.userId;
  const COST = 200;
  try {
    const existing = await db.get('SELECT active_until FROM witness_protection WHERE user_id = ?', [uid]);
    if (existing && existing.active_until > Date.now()) return res.status(400).json({ error: 'Already in Witness Protection' });
    const credits = await db.get('SELECT balance FROM sml_credits WHERE user_id = ?', [uid]);
    if (!credits || credits.balance < COST) return res.status(400).json({ error: 'Not enough SML Credits (need 200)' });
    const now = Date.now();
    await db.run('UPDATE sml_credits SET balance = balance - ?, updated_at = ? WHERE user_id = ?', [COST, now, uid]);
    const activeUntil = now + 86400_000;
    await db.run(
      'INSERT INTO witness_protection (user_id, active_until, activated_at) VALUES (?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET active_until = ?, activated_at = ?',
      [uid, activeUntil, now, activeUntil, now]
    );
    res.json({ success: true, activeUntil, message: 'You are now in Witness Protection for 24 hours!' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ===== WANTED LEVEL =====

app.get("/api/wanted/level", authenticateUser, async (req, res) => {
  const uid = req.user.userId;
  try {
    const since = Date.now() - 7 * 86400_000;
    const row = await db.get(
      'SELECT COUNT(*) as cnt FROM heist_attempts WHERE robber_id = ? AND status = ? AND created_at > ?',
      [uid, 'success', since]
    );
    const cnt = row ? row.cnt : 0;
    const stars = cnt === 0 ? 0 : cnt <= 2 ? 1 : cnt <= 5 ? 2 : cnt <= 10 ? 3 : cnt <= 20 ? 4 : 5;
    res.json({ stars, heistWins: cnt });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ===== GETAWAY VEHICLES =====

app.get("/api/getaway/catalog", authenticateUser, async (req, res) => {
  const uid = req.user.userId;
  try {
    const owned = (await db.all('SELECT vehicle_key FROM player_getaways WHERE user_id = ?', [uid])).map(r => r.vehicle_key);
    res.json({ catalog: GETAWAY_VEHICLES, owned });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/stripe/buy-getaway", authenticateUser, async (req, res) => {
  if (!stripeProcessor) return res.status(503).json({ error: 'Payment processing not configured' });
  const uid = req.user.userId;
  const { vehicleKey } = req.body;
  const vehicle = GETAWAY_VEHICLES[vehicleKey];
  if (!vehicle) return res.status(400).json({ error: 'Unknown vehicle' });
  try {
    const account = accountManager.getAccountById(uid);
    const result = await stripeProcessor.createGetawayCheckout(uid, account?.email || '', vehicleKey, vehicle.label, vehicle.price_cents);
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('[buy-getaway]', err.message);
    res.status(500).json({ error: 'Checkout failed: ' + err.message });
  }
});

// ===== HEIST INSURANCE =====

app.get("/api/insurance/status", authenticateUser, async (req, res) => {
  const uid = req.user.userId;
  try {
    const row = await db.get('SELECT active_until, coverage_pct FROM heist_insurance WHERE user_id = ?', [uid]);
    const active = row && row.active_until > Date.now();
    res.json({ active: !!active, activeUntil: row ? row.active_until : null, coveragePct: active ? row.coverage_pct : 0 });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/insurance/activate", authenticateUser, async (req, res) => {
  const uid = req.user.userId;
  const COST = 150;
  try {
    const existing = await db.get('SELECT active_until FROM heist_insurance WHERE user_id = ?', [uid]);
    if (existing && existing.active_until > Date.now()) return res.status(400).json({ error: 'Insurance already active' });
    const credits = await db.get('SELECT balance FROM sml_credits WHERE user_id = ?', [uid]);
    if (!credits || credits.balance < COST) return res.status(400).json({ error: 'Not enough SML Credits (need 150)' });
    const now = Date.now();
    await db.run('UPDATE sml_credits SET balance = balance - ?, updated_at = ? WHERE user_id = ?', [COST, now, uid]);
    const activeUntil = now + 86400_000;
    await db.run(
      'INSERT INTO heist_insurance (user_id, active_until, coverage_pct, activated_at) VALUES (?, ?, 0.5, ?) ON CONFLICT(user_id) DO UPDATE SET active_until = ?, activated_at = ?',
      [uid, activeUntil, now, activeUntil, now]
    );
    res.json({ success: true, activeUntil, message: 'Heist Insurance activated! You recover 50% if robbed in the next 24h.' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ===== PRICE ALERTS =====

app.get("/api/alerts", authenticateUser, async (req, res) => {
  const uid = req.user.userId;
  try {
    const rows = await db.all('SELECT id, symbol, target_price, direction, triggered, created_at FROM price_alerts WHERE user_id = ? ORDER BY created_at DESC', [uid]);
    res.json({ alerts: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/alerts/set", authenticateUser, async (req, res) => {
  const uid = req.user.userId;
  const { symbol, targetPrice, direction } = req.body;
  if (!symbol || !targetPrice || !direction) return res.status(400).json({ error: 'symbol, targetPrice, and direction required' });
  if (!['above', 'below'].includes(direction)) return res.status(400).json({ error: 'direction must be "above" or "below"' });
  if (isNaN(targetPrice) || targetPrice <= 0) return res.status(400).json({ error: 'targetPrice must be a positive number' });
  try {
    const now = Date.now();
    await db.run(
      `INSERT INTO price_alerts (user_id, symbol, target_price, direction, triggered, created_at)
       VALUES (?, ?, ?, ?, 0, ?)
       ON CONFLICT(user_id, symbol) DO UPDATE SET target_price = ?, direction = ?, triggered = 0, created_at = ?`,
      [uid, symbol.toUpperCase(), targetPrice, direction, now, targetPrice, direction, now]
    );
    res.json({ success: true, message: `Alert set: ${symbol.toUpperCase()} ${direction} $${targetPrice}` });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete("/api/alerts/:id", authenticateUser, async (req, res) => {
  const uid = req.user.userId;
  const { id } = req.params;
  try {
    const row = await db.get('SELECT id FROM price_alerts WHERE id = ? AND user_id = ?', [id, uid]);
    if (!row) return res.status(404).json({ error: 'Alert not found' });
    await db.run('DELETE FROM price_alerts WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ===== COMMUNITY CHALLENGE =====

app.get("/api/challenge/weekly", authenticateUser, async (req, res) => {
  try {
    const wk = _weekKey();
    await db.run(
      'INSERT OR IGNORE INTO community_challenges (week_key, type, target, reward_paper) VALUES (?, ?, ?, ?)',
      [wk, 'heist', COMMUNITY_CHALLENGE_TARGET, COMMUNITY_CHALLENGE_REWARD]
    );
    const ch = await db.get('SELECT * FROM community_challenges WHERE week_key = ?', [wk]);
    const uid = req.user.userId;
    const myContrib = await db.get('SELECT contrib FROM challenge_participants WHERE week_key = ? AND user_id = ?', [wk, uid]);
    res.json({ challenge: ch, myContrib: myContrib ? myContrib.contrib : 0 });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ===== BOSS HEIST =====

app.get("/api/boss-heist/status", authenticateUser, async (req, res) => {
  const uid = req.user.userId;
  try {
    const wk = _weekKey();
    await db.run(
      'INSERT OR IGNORE INTO boss_heist (week_key, hp_remaining, max_hp, loot_pool) VALUES (?, ?, ?, ?)',
      [wk, BOSS_HEIST_HP, BOSS_HEIST_HP, BOSS_HEIST_LOOT]
    );
    const boss = await db.get('SELECT * FROM boss_heist WHERE week_key = ?', [wk]);
    const myAttack = await db.get('SELECT total_dmg, last_attack FROM boss_heist_attacks WHERE week_key = ? AND user_id = ?', [wk, uid]);
    const attackers = await db.get('SELECT COUNT(*) as cnt FROM boss_heist_attacks WHERE week_key = ?', [wk]);
    res.json({ boss, myDamage: myAttack ? myAttack.total_dmg : 0, lastAttack: myAttack ? myAttack.last_attack : null, totalAttackers: attackers ? attackers.cnt : 0 });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/boss-heist/attack", authenticateUser, async (req, res) => {
  const uid = req.user.userId;
  try {
    const wk = _weekKey();
    const boss = await db.get('SELECT * FROM boss_heist WHERE week_key = ?', [wk]);
    if (!boss) return res.status(404).json({ error: 'No boss this week' });
    if (boss.killed) return res.status(400).json({ error: 'Boss is already defeated — new boss spawns next week' });

    const myAttack = await db.get('SELECT last_attack FROM boss_heist_attacks WHERE week_key = ? AND user_id = ?', [wk, uid]);
    const ATTACK_COOLDOWN = 3600_000;
    if (myAttack && myAttack.last_attack && (Date.now() - myAttack.last_attack) < ATTACK_COOLDOWN) {
      const waitMin = Math.ceil((ATTACK_COOLDOWN - (Date.now() - myAttack.last_attack)) / 60000);
      return res.status(429).json({ error: `Attack cooldown — try again in ${waitMin} min` });
    }

    const dmg = Math.floor(Math.random() * 181) + 20; // 20–200
    const now = Date.now();
    await db.run(
      `INSERT INTO boss_heist_attacks (week_key, user_id, total_dmg, last_attack) VALUES (?, ?, ?, ?)
       ON CONFLICT(week_key, user_id) DO UPDATE SET total_dmg = total_dmg + ?, last_attack = ?`,
      [wk, uid, dmg, now, dmg, now]
    );

    const newHp = Math.max(0, boss.hp_remaining - dmg);
    await db.run('UPDATE boss_heist SET hp_remaining = ? WHERE week_key = ?', [newHp, wk]);

    if (newHp <= 0 && !boss.killed) {
      await db.run('UPDATE boss_heist SET killed = 1, killed_at = ? WHERE week_key = ?', [now, wk]);
      // Distribute loot proportionally
      const allAttackers = await db.all('SELECT user_id, total_dmg FROM boss_heist_attacks WHERE week_key = ? AND rewarded = 0', [wk]);
      const totalDmg = allAttackers.reduce((s, a) => s + a.total_dmg, 0) || 1;
      for (const a of allAttackers) {
        const loot = parseFloat((boss.loot_pool * (a.total_dmg / totalDmg)).toFixed(2));
        await db.run(
          `INSERT INTO user_portfolios (user_id, cash_balance, total_invested, updated_at) VALUES (?, ?, ?, ?)
           ON CONFLICT(user_id) DO UPDATE SET cash_balance = cash_balance + ?, updated_at = ?`,
          [a.user_id, loot, loot, now, loot, now]
        );
        await db.run('UPDATE boss_heist_attacks SET rewarded = 1 WHERE week_key = ? AND user_id = ?', [wk, a.user_id]);
        await _syncLeaderboard(a.user_id);
        emitToUser(a.user_id, 'boss_heist_killed', { loot, damage: a.total_dmg });
      }
      res.json({ success: true, dmg, newHp: 0, bossKilled: true, message: `You dealt ${dmg} damage and finished off the boss!` });
    } else {
      res.json({ success: true, dmg, newHp, bossKilled: false, message: `You dealt ${dmg} damage! Boss HP: ${newHp}` });
    }
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ===== MINI GAMES =====

app.post("/api/game/dice", authenticateUser, async (req, res) => {
  const uid = req.user.userId;
  const wager = parseFloat(req.body.wager);
  if (isNaN(wager) || wager <= 0) return res.status(400).json({ error: 'wager must be a positive number' });
  const MAX_WAGER = 10000;
  try {
    const portfolio = await db.get('SELECT cash_balance FROM user_portfolios WHERE user_id = ?', [uid]);
    const cash = portfolio ? portfolio.cash_balance : 0;
    const actualWager = Math.min(wager, cash, MAX_WAGER);
    if (actualWager < wager) return res.status(400).json({ error: `Wager capped at $${MAX_WAGER.toLocaleString()} max or your balance`, max: MAX_WAGER });
    if (cash < actualWager) return res.status(400).json({ error: 'Insufficient paper money' });
    const roll1 = Math.floor(Math.random() * 6) + 1;
    const roll2 = Math.floor(Math.random() * 6) + 1;
    const sum = roll1 + roll2;
    const won = sum >= 8; // 8–12 wins (house-favorable: 41.7% win rate)
    const payout = won ? parseFloat((actualWager * 1.8).toFixed(2)) : 0;
    const net = won ? payout - actualWager : -actualWager;
    const now = Date.now();
    await db.run('UPDATE user_portfolios SET cash_balance = cash_balance + ?, updated_at = ? WHERE user_id = ?', [net, now, uid]);
    await _syncLeaderboard(uid);
    res.json({ success: true, roll1, roll2, sum, won, wager: actualWager, payout, net });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/game/card-flip", authenticateUser, async (req, res) => {
  const uid = req.user.userId;
  const wager = parseFloat(req.body.wager);
  if (isNaN(wager) || wager <= 0) return res.status(400).json({ error: 'wager must be a positive number' });
  const MAX_WAGER = 10000;
  try {
    const portfolio = await db.get('SELECT cash_balance FROM user_portfolios WHERE user_id = ?', [uid]);
    const cash = portfolio ? portfolio.cash_balance : 0;
    const actualWager = Math.min(wager, cash, MAX_WAGER);
    if (actualWager < wager) return res.status(400).json({ error: `Wager capped at $${MAX_WAGER.toLocaleString()} max or your balance`, max: MAX_WAGER });
    if (cash < actualWager) return res.status(400).json({ error: 'Insufficient paper money' });
    const color = Math.random() < 0.5 ? 'Red' : 'Black';
    const won = color === 'Red';
    const payout = won ? parseFloat((actualWager * 1.8).toFixed(2)) : 0; // 1.8× (house +10% EV)
    const net = won ? payout - actualWager : -actualWager;
    const now = Date.now();
    await db.run('UPDATE user_portfolios SET cash_balance = cash_balance + ?, updated_at = ? WHERE user_id = ?', [net, now, uid]);
    await _syncLeaderboard(uid);
    res.json({ success: true, color, won, wager: actualWager, payout, net });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ===== FEED REACTIONS =====

app.post("/api/feed/react", authenticateUser, async (req, res) => {
  const uid = req.user.userId;
  const { postId, emoji } = req.body;
  const VALID_EMOJIS = ['🔥', '💀', '👑', '😂'];
  if (!postId || !emoji || !VALID_EMOJIS.includes(emoji)) return res.status(400).json({ error: 'postId and valid emoji required' });
  try {
    const now = Date.now();
    await db.run(
      `INSERT INTO feed_reactions (post_id, user_id, emoji, created_at) VALUES (?, ?, ?, ?)
       ON CONFLICT(post_id, user_id) DO UPDATE SET emoji = ?, created_at = ?`,
      [postId, uid, emoji, now, emoji, now]
    );
    const counts = await db.all('SELECT emoji, COUNT(*) as cnt FROM feed_reactions WHERE post_id = ? GROUP BY emoji', [postId]);
    res.json({ success: true, counts });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get("/api/feed/reactions/:postId", authenticateUser, async (req, res) => {
  const { postId } = req.params;
  try {
    const counts = await db.all('SELECT emoji, COUNT(*) as cnt FROM feed_reactions WHERE post_id = ? GROUP BY emoji', [postId]);
    const myReaction = await db.get('SELECT emoji FROM feed_reactions WHERE post_id = ? AND user_id = ?', [postId, req.user.userId]);
    res.json({ counts, myEmoji: myReaction ? myReaction.emoji : null });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ===== STOCK TIPS MARKETPLACE =====

app.get("/api/tips/marketplace", authenticateUser, async (req, res) => {
  try {
    const tips = await db.all(
      `SELECT t.id, t.author_id, t.symbol, t.direction, t.note, t.credits_cost, t.price_at_create, t.created_at,
              COUNT(p.user_id) as buyers
       FROM stock_tips t
       LEFT JOIN stock_tip_purchases p ON p.tip_id = t.id
       WHERE t.active = 1
       GROUP BY t.id ORDER BY t.created_at DESC LIMIT 50`
    );
    const uid = req.user.userId;
    const purchased = (await db.all('SELECT tip_id FROM stock_tip_purchases WHERE user_id = ?', [uid])).map(r => r.tip_id);
    res.json({
      tips: tips.map(t => ({
        ...t,
        authorName: _displayName(t.author_id),
        currentPrice: priceEngine.getPrice(t.symbol) || null,
        purchased: purchased.includes(t.id),
        isOwn: t.author_id === uid,
      }))
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/tips/create", authenticateUser, async (req, res) => {
  const uid = req.user.userId;
  const { symbol, direction, note, creditsCost } = req.body;
  if (!symbol || !direction || !['up', 'down'].includes(direction)) return res.status(400).json({ error: 'symbol and direction (up/down) required' });
  const cost = Math.max(10, parseInt(creditsCost) || 50);
  try {
    const now = Date.now();
    const price = priceEngine.getPrice(symbol.toUpperCase()) || null;
    await db.run(
      'INSERT INTO stock_tips (author_id, symbol, direction, note, credits_cost, price_at_create, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [uid, symbol.toUpperCase(), direction, note || '', cost, price, now]
    );
    res.json({ success: true, message: `Tip listed for ${symbol.toUpperCase()} (${direction})` });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/tips/buy/:tipId", authenticateUser, async (req, res) => {
  const uid = req.user.userId;
  const tipId = parseInt(req.params.tipId);
  try {
    const tip = await db.get('SELECT * FROM stock_tips WHERE id = ? AND active = 1', [tipId]);
    if (!tip) return res.status(404).json({ error: 'Tip not found' });
    if (tip.author_id === uid) return res.status(400).json({ error: 'Cannot buy your own tip' });
    const already = await db.get('SELECT tip_id FROM stock_tip_purchases WHERE tip_id = ? AND user_id = ?', [tipId, uid]);
    if (already) return res.status(400).json({ error: 'Already purchased this tip' });
    const credits = await db.get('SELECT balance FROM sml_credits WHERE user_id = ?', [uid]);
    if (!credits || credits.balance < tip.credits_cost) return res.status(400).json({ error: `Not enough credits (need ${tip.credits_cost})` });
    const now = Date.now();
    await db.run('UPDATE sml_credits SET balance = balance - ?, updated_at = ? WHERE user_id = ?', [tip.credits_cost, now, uid]);
    // Creators keep 100% of tip credits; non-creators get 80% (20% platform cut)
    const authorCreator = await db.get('SELECT active FROM creator_memberships WHERE user_id = ? AND active = 1', [tip.author_id]);
    const authorShare = authorCreator ? tip.credits_cost : Math.floor(tip.credits_cost * 0.8);
    if (authorShare > 0) {
      await db.run(
        'INSERT INTO sml_credits (user_id, balance, updated_at) VALUES (?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET balance = balance + ?, updated_at = ?',
        [tip.author_id, authorShare, now, authorShare, now]
      );
    }
    await db.run('INSERT INTO stock_tip_purchases (tip_id, user_id, purchased_at) VALUES (?, ?, ?)', [tipId, uid, now]);
    emitToUser(tip.author_id, 'tip_sold', { symbol: tip.symbol, credits: authorShare });
    res.json({ success: true, tip: { symbol: tip.symbol, direction: tip.direction, note: tip.note } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ===== VIRTUAL REAL ESTATE =====

app.get("/api/realestate/catalog", authenticateUser, async (req, res) => {
  const uid = req.user.userId;
  try {
    const owned = await db.all('SELECT property_key, purchased_at, last_collect FROM player_real_estate WHERE user_id = ?', [uid]);
    const now = Date.now();
    const MAX_DAYS = 7;
    const enriched = owned.map(r => {
      const prop = REAL_ESTATE[r.property_key];
      if (!prop) return null;
      const elapsedDays = Math.min(MAX_DAYS, (now - (r.last_collect || r.purchased_at)) / 86400_000);
      const pending = parseFloat((elapsedDays * prop.daily_income).toFixed(2));
      return { key: r.property_key, ...prop, pending, purchasedAt: r.purchased_at, lastCollect: r.last_collect };
    }).filter(Boolean);
    const totalPending = enriched.reduce((s, p) => s + p.pending, 0);
    res.json({ catalog: REAL_ESTATE, owned: enriched, totalPending });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/stripe/buy-realestate", authenticateUser, async (req, res) => {
  if (!stripeProcessor) return res.status(503).json({ error: 'Payment processing not configured' });
  const uid = req.user.userId;
  const { propertyKey } = req.body;
  const prop = REAL_ESTATE[propertyKey];
  if (!prop) return res.status(400).json({ error: 'Unknown property' });
  try {
    const account = accountManager.getAccountById(uid);
    const result = await stripeProcessor.createRealEstateCheckout(uid, account?.email || '', propertyKey, prop.label, prop.price_cents);
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('[buy-realestate]', err.message);
    res.status(500).json({ error: 'Checkout failed: ' + err.message });
  }
});

app.post("/api/realestate/collect", authenticateUser, async (req, res) => {
  const uid = req.user.userId;
  try {
    const properties = await db.all('SELECT property_key, purchased_at, last_collect FROM player_real_estate WHERE user_id = ?', [uid]);
    if (!properties.length) return res.status(400).json({ error: 'No properties owned' });
    const now = Date.now();
    const MAX_DAYS = 7;
    let total = 0;
    for (const r of properties) {
      const prop = REAL_ESTATE[r.property_key];
      if (!prop) continue;
      const elapsedDays = Math.min(MAX_DAYS, (now - (r.last_collect || r.purchased_at)) / 86400_000);
      const income = parseFloat((elapsedDays * prop.daily_income).toFixed(2));
      if (income > 0) {
        total += income;
        await db.run('UPDATE player_real_estate SET last_collect = ? WHERE user_id = ? AND property_key = ?', [now, uid, r.property_key]);
      }
    }
    if (total <= 0) return res.status(400).json({ error: 'No income available yet — check back later' });
    await db.run(
      `INSERT INTO user_portfolios (user_id, cash_balance, total_invested, updated_at) VALUES (?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET cash_balance = cash_balance + ?, updated_at = ?`,
      [uid, total, total, now, total, now]
    );
    await _syncLeaderboard(uid);
    res.json({ success: true, collected: total, message: `Collected $${total.toFixed(2)} from your properties!` });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ===== BATTLE PASS =====

app.get("/api/battlepass/status", authenticateUser, async (req, res) => {
  const uid = req.user.userId;
  try {
    await db.run(
      'INSERT OR IGNORE INTO battle_pass (user_id, season_id, pass_type, claimed_tiers) VALUES (?, ?, ?, ?)',
      [uid, BATTLE_PASS_SEASON, 'free', '[]']
    );
    const bp = await db.get('SELECT * FROM battle_pass WHERE user_id = ?', [uid]);
    const xpRow = await db.get('SELECT total_xp FROM user_xp WHERE user_id = ?', [uid]);
    const xp = xpRow ? xpRow.total_xp : 0;
    const claimedTiers = JSON.parse(bp.claimed_tiers || '[]');
    const tiers = BATTLE_PASS_TIERS.map(t => ({
      ...t,
      unlocked: xp >= t.xp,
      claimed: claimedTiers.includes(t.tier),
    }));
    res.json({ passType: bp.pass_type, xp, tiers, season: BATTLE_PASS_SEASON });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/battlepass/claim", authenticateUser, async (req, res) => {
  const uid = req.user.userId;
  const { tier } = req.body;
  if (!tier) return res.status(400).json({ error: 'tier required' });
  try {
    const tierDef = BATTLE_PASS_TIERS.find(t => t.tier === tier);
    if (!tierDef) return res.status(400).json({ error: 'Invalid tier' });
    const bp = await db.get('SELECT * FROM battle_pass WHERE user_id = ?', [uid]);
    if (!bp) return res.status(400).json({ error: 'No battle pass found' });
    const claimedTiers = JSON.parse(bp.claimed_tiers || '[]');
    if (claimedTiers.includes(tier)) return res.status(400).json({ error: 'Already claimed this tier' });
    const xpRow = await db.get('SELECT total_xp FROM user_xp WHERE user_id = ?', [uid]);
    const xp = xpRow ? xpRow.total_xp : 0;
    if (xp < tierDef.xp) return res.status(400).json({ error: `Not enough XP. Need ${tierDef.xp}, have ${xp}` });

    const track = bp.pass_type === 'paid' ? tierDef.paid : tierDef.free;
    const now = Date.now();
    if (track.type === 'paper') {
      await db.run(
        `INSERT INTO user_portfolios (user_id, cash_balance, total_invested, updated_at) VALUES (?, ?, ?, ?)
         ON CONFLICT(user_id) DO UPDATE SET cash_balance = cash_balance + ?, updated_at = ?`,
        [uid, track.amount, track.amount, now, track.amount, now]
      );
      await _syncLeaderboard(uid);
    } else if (track.type === 'credits') {
      await db.run(
        'INSERT INTO sml_credits (user_id, balance, updated_at) VALUES (?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET balance = balance + ?, updated_at = ?',
        [uid, track.amount, now, track.amount, now]
      );
    }
    claimedTiers.push(tier);
    await db.run('UPDATE battle_pass SET claimed_tiers = ? WHERE user_id = ?', [JSON.stringify(claimedTiers), uid]);
    res.json({ success: true, reward: track, message: `Tier ${tier} claimed! You received ${track.type === 'paper' ? '$' + track.amount + ' paper money' : track.amount + ' SML Credits'}` });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/stripe/buy-battlepass", authenticateUser, async (req, res) => {
  if (!stripeProcessor) return res.status(503).json({ error: 'Payment processing not configured' });
  const uid = req.user.userId;
  try {
    const existing = await db.get('SELECT pass_type FROM battle_pass WHERE user_id = ?', [uid]);
    if (existing && existing.pass_type === 'paid') return res.status(400).json({ error: 'Already have the paid Battle Pass' });
    const account = accountManager.getAccountById(uid);
    const result = await stripeProcessor.createBattlePassCheckout(uid, account?.email || '');
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('[buy-battlepass]', err.message);
    res.status(500).json({ error: 'Checkout failed: ' + err.message });
  }
});

// ===== STREET CRED =====

app.get("/api/street-cred", authenticateUser, async (req, res) => {
  const uid = req.user.userId;
  try {
    const heistWins = (await db.get('SELECT COUNT(*) as cnt FROM heist_attempts WHERE robber_id = ? AND status = ?', [uid, 'success']))?.cnt || 0;
    const badges = (await db.get('SELECT COUNT(*) as cnt FROM user_badges WHERE user_id = ?', [uid]))?.cnt || 0;
    const trades = (await db.get('SELECT COUNT(*) as cnt FROM trades WHERE user_id = ?', [uid]))?.cnt || 0;
    const lb = await db.get('SELECT win_rate FROM leaderboard_scores WHERE user_id = ?', [uid]);
    const winRate = lb ? (lb.win_rate || 0) : 0;
    const score = Math.floor(heistWins * 50 + badges * 20 + trades * 5 + winRate * 200);
    res.json({ score, breakdown: { heistWins, badges, trades, winRate } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ===== DAILY REWARDS =====

const TWENTY_FOUR_H = 86400_000;
const FORTY_EIGHT_H = 172800_000;

app.get("/api/rewards/daily-status", authenticateUser, async (req, res) => {
  const uid = req.user.userId;
  try {
    const row = await db.get('SELECT streak, last_claim FROM daily_perks WHERE user_id = ?', [uid]);
    const now = Date.now();
    if (!row || !row.last_claim) {
      return res.json({ canClaim: true, streak: 0, nextAmount: 25, nextClaimAt: null });
    }
    const elapsed = now - row.last_claim;
    const canClaim = elapsed >= TWENTY_FOUR_H;
    const streakBroken = elapsed >= FORTY_EIGHT_H;
    const currentStreak = streakBroken ? 0 : row.streak;
    const nextStreak = currentStreak + 1;
    res.json({
      canClaim,
      streak: currentStreak,
      nextAmount: _dailyPerkAmount(nextStreak),
      nextClaimAt: canClaim ? null : row.last_claim + TWENTY_FOUR_H,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/rewards/daily-claim", authenticateUser, async (req, res) => {
  const uid = req.user.userId;
  try {
    const row = await db.get('SELECT streak, last_claim FROM daily_perks WHERE user_id = ?', [uid]);
    const now = Date.now();
    if (row && row.last_claim && (now - row.last_claim) < TWENTY_FOUR_H) {
      const hrs = Math.ceil((row.last_claim + TWENTY_FOUR_H - now) / 3600000);
      return res.status(429).json({ error: `Already claimed today. Come back in ~${hrs}h!` });
    }
    const streakBroken = row && row.last_claim && (now - row.last_claim) >= FORTY_EIGHT_H;
    const currentStreak = (!row || !row.last_claim || streakBroken) ? 0 : row.streak;
    const newStreak = currentStreak + 1;
    const amount = _dailyPerkAmount(newStreak);
    await db.run(
      `INSERT INTO daily_perks (user_id, streak, last_claim, total_earned) VALUES (?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET streak = ?, last_claim = ?, total_earned = total_earned + ?`,
      [uid, newStreak, now, amount, newStreak, now, amount]
    );
    await db.run(
      `INSERT INTO user_portfolios (user_id, cash_balance, total_invested, updated_at) VALUES (?, ?, 1000, ?)
       ON CONFLICT(user_id) DO UPDATE SET cash_balance = cash_balance + ?, updated_at = ?`,
      [uid, amount, now, amount, now]
    );
    await _syncLeaderboard(uid);
    emitToUser(uid, 'reward_claimed', { amount, streak: newStreak });
    res.json({
      success: true,
      amount,
      streak: newStreak,
      nextAmount: _dailyPerkAmount(newStreak + 1),
      message: `🎁 Day ${newStreak} streak! +$${amount} paper money added`,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
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

async function _getBestWeaponKey(userId) {
  const rows = await db.all('SELECT weapon_key FROM player_weapons WHERE user_id = ?', [userId]);
  return rows.filter(r => WEAPONS[r.weapon_key]).sort((a, b) => WEAPONS[b.weapon_key].tier - WEAPONS[a.weapon_key].tier)[0]?.weapon_key || null;
}

async function _getBestWeapon(userId) {
  const rows = await db.all('SELECT weapon_key FROM player_weapons WHERE user_id = ?', [userId]);
  if (!rows.length) return null;
  return rows.map(r => WEAPONS[r.weapon_key]).filter(Boolean).sort((a, b) => b.tier - a.tier)[0] || null;
}

async function _getBestDog(userId) {
  const rows = await db.all('SELECT dog_key FROM player_guard_dogs WHERE user_id = ?', [userId]);
  if (!rows.length) return null;
  return rows.map(r => GUARD_DOGS[r.dog_key]).filter(Boolean).sort((a, b) => b.tier - a.tier)[0] || null;
}

async function _getActiveShield(userId) {
  const row = await db.get('SELECT shield_key, durability FROM player_shields WHERE user_id = ?', [userId]);
  if (!row) return null;
  const def = SHIELDS[row.shield_key];
  if (!def) return null;
  return { ...def, key: row.shield_key, durability: row.durability };
}

async function _getBestGetaway(userId) {
  const rows = await db.all('SELECT vehicle_key FROM player_getaways WHERE user_id = ?', [userId]);
  if (!rows.length) return null;
  return rows.map(r => GETAWAY_VEHICLES[r.vehicle_key]).filter(Boolean).sort((a, b) => b.tier - a.tier)[0] || null;
}

function _weekKey() {
  const d = new Date();
  const startOfYear = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d - startOfYear) / 86400000 + startOfYear.getUTCDay() + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

function _spinWheel() {
  const total = SPIN_PRIZES.reduce((s, p) => s + p.weight, 0);
  let rand = Math.random() * total;
  for (const p of SPIN_PRIZES) { rand -= p.weight; if (rand <= 0) return p; }
  return SPIN_PRIZES[0];
}

async function _incrementCommunityChallenge(type, amount, userId) {
  try {
    const wk = _weekKey();
    await db.run(
      'INSERT OR IGNORE INTO community_challenges (week_key, type, target, reward_paper) VALUES (?, ?, ?, ?)',
      [wk, type, COMMUNITY_CHALLENGE_TARGET, COMMUNITY_CHALLENGE_REWARD]
    );
    const ch = await db.get('SELECT * FROM community_challenges WHERE week_key = ?', [wk]);
    if (!ch || ch.completed) return;
    await db.run('UPDATE community_challenges SET progress = progress + ? WHERE week_key = ?', [amount, wk]);
    if (userId) {
      await db.run('INSERT OR IGNORE INTO challenge_participants (week_key, user_id) VALUES (?, ?)', [wk, userId]);
      await db.run('UPDATE challenge_participants SET contrib = contrib + ? WHERE week_key = ? AND user_id = ?', [amount, wk, userId]);
    }
    const updated = await db.get('SELECT progress FROM community_challenges WHERE week_key = ?', [wk]);
    if (updated && updated.progress >= COMMUNITY_CHALLENGE_TARGET) {
      const now = Date.now();
      await db.run('UPDATE community_challenges SET completed = 1, completed_at = ? WHERE week_key = ?', [now, wk]);
      const participants = await db.all('SELECT user_id FROM challenge_participants WHERE week_key = ? AND rewarded = 0', [wk]);
      for (const p of participants) {
        await db.run(
          'UPDATE user_portfolios SET cash_balance = cash_balance + ?, updated_at = ? WHERE user_id = ?',
          [COMMUNITY_CHALLENGE_REWARD, now, p.user_id]
        );
        await db.run('UPDATE challenge_participants SET rewarded = 1 WHERE week_key = ? AND user_id = ?', [wk, p.user_id]);
        await _syncLeaderboard(p.user_id);
        emitToUser(p.user_id, 'weekly_challenge_complete', { reward: COMMUNITY_CHALLENGE_REWARD });
      }
    }
  } catch (_) {}
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

    // Witness protection check
    const wpRow = await db.get('SELECT active_until FROM witness_protection WHERE user_id = ?', [targetUserId]);
    if (wpRow && wpRow.active_until > Date.now()) {
      return res.status(400).json({ error: 'Target is in Witness Protection — cannot be heisted right now' });
    }

    // Target must have cash
    const targetPortfolio = await db.get('SELECT cash_balance FROM user_portfolios WHERE user_id = ?', [targetUserId]);
    const targetCash = targetPortfolio ? targetPortfolio.cash_balance : 0;
    if (targetCash < MIN_TARGET_CASH) return res.status(400).json({ error: 'Target doesn\'t have enough cash to heist' });

    // Armory modifiers — best weapon among all teammates for success roll; defender's weapon fights back
    const teammateWeapons = await Promise.all(teammates.map(rid => _getBestWeapon(rid)));
    const bestTeamWeapon  = teammateWeapons.filter(Boolean).sort((a, b) => b.tier - a.tier)[0] || null;
    const targetShield    = await _getActiveShield(targetUserId);
    const defenderWeapon  = await _getBestWeapon(targetUserId);

    // Defender weapon counters at 50% efficiency — stacks with shield
    const effectiveChance = Math.min(0.95, Math.max(0.01,
      (bestTeamWeapon ? config.baseChance + bestTeamWeapon.successBonus : config.baseChance)
      - (targetShield ? targetShield.successReduction : 0)
      - (defenderWeapon ? defenderWeapon.successBonus * 0.5 : 0)
    ));
    const effectiveMaxPct = Math.min(0.50, Math.max(0.01,
      (bestTeamWeapon ? config.maxPct + bestTeamWeapon.maxPctBonus : config.maxPct)
      - (targetShield ? targetShield.maxPctReduction : 0)
      - (defenderWeapon ? defenderWeapon.maxPctBonus * 0.5 : 0)
    ));

    const now = Date.now();
    const success = Math.random() < effectiveChance;

    if (success) {
      const rawAmount = Math.random() * effectiveMaxPct * targetCash;
      const amount = parseFloat(Math.max(1, rawAmount).toFixed(2));
      const share  = parseFloat((amount / teammates.length).toFixed(2));

      // Deduct from target
      await db.run('UPDATE user_portfolios SET cash_balance = cash_balance - ?, updated_at = ? WHERE user_id = ?', [amount, now, targetUserId]);
      // Credit each teammate (even those who get individually caught still receive their share)
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

      // Team heists: each member rolls their own individual catch check
      if (teamId && teammates.length > 1) {
        for (const rid of teammates) {
          const memberWeapon = teammateWeapons[teammates.indexOf(rid)];
          const memberCatchRate = memberWeapon ? Math.max(0.05, CATCH_RATE - memberWeapon.catchReduction) : CATCH_RATE;
          if (Math.random() < memberCatchRate) {
            const alreadyJailed = await db.get('SELECT id FROM jail_status WHERE user_id = ? AND released = 0', [rid]);
            if (!alreadyJailed) {
              await db.run(
                'INSERT OR REPLACE INTO jail_status (user_id, heist_id, victim_id, amount_owed, released, jailed_at) VALUES (?, ?, ?, ?, 0, ?)',
                [rid, heistId, targetUserId, BAIL_AMOUNT, now]
              );
              await db.run(
                'INSERT INTO heist_notifications (user_id, type, data, read, created_at) VALUES (?, ?, ?, 0, ?)',
                [rid, 'jailed', JSON.stringify({ heistId, reason: 'Caught after team heist', bail: BAIL_AMOUNT }), now]
              );
              emitToUser(rid, 'heist_jailed', { heistId, bail: BAIL_AMOUNT, share, message: `Busted! You still got your $${share.toFixed(2)} cut but you\'re in jail.` });
            }
          } else {
            emitToUser(rid, 'heist_result', { success: true, amountStolen: share, heistType: config.label, icon: config.icon });
          }
        }
      } else {
        emitToUser(uid, 'heist_result', { success: true, amountStolen: share, heistType: config.label, icon: config.icon });
      }

      // Raise heat level on successful heist (max 5)
      await db.run('UPDATE accounts SET heat_level = MIN(5, heat_level + 1) WHERE id = ?', [uid]);
      if (teamId && teammates.length > 1) {
        for (const rid of teammates) {
          await db.run('UPDATE accounts SET heat_level = MIN(5, heat_level + 1) WHERE id = ?', [rid]);
        }
      }
      await _awardBox(uid, 'heist_win');

      // Grant weapon XP to best weapon on heist success
      const _wKey = await _getBestWeaponKey(uid);
      if (_wKey) {
        const curXpRow = await db.get('SELECT xp, level FROM weapon_xp WHERE user_id=? AND weapon_key=?', [uid, _wKey]);
        const newXp = Math.min(999, (curXpRow?.xp || 0) + WEAPON_XP_PER_HEIST);
        const newLevel = Math.min(10, Math.floor(newXp / 100) + 1);
        await db.run('INSERT INTO weapon_xp (user_id, weapon_key, xp, level) VALUES (?,?,?,?) ON CONFLICT(user_id, weapon_key) DO UPDATE SET xp=?, level=?',
          [uid, _wKey, newXp, newLevel, newXp, newLevel]);
        if (newLevel > (curXpRow?.level || 1)) {
          await _notify(uid, 'weapon_level', '⚔️ Weapon Level Up!', `${WEAPONS[_wKey]?.label} reached Level ${newLevel}!${newLevel === 10 ? ' 🔥 Ability unlocked!' : ''}`);
          emitToUser(uid, 'weapon_xp_update', { weaponKey: _wKey, xp: newXp, level: newLevel, abilityUnlocked: newLevel === 10 });
        }
      }

      res.json({ success: true, amountStolen: share, message: `${config.icon} ${config.label} succeeded! You stole $${share.toFixed(2)}` });
    } else {
      await db.run(
        'INSERT INTO heist_attempts (robber_id, team_id, target_id, heist_type, amount_stolen, status, charges, created_at, expires_at) VALUES (?, ?, ?, ?, 0, ?, 0, ?, ?)',
        [uid, teamId, targetUserId, heistType, 'failed', now, now]
      );
      emitToUser(uid, 'heist_result', { success: false, heistType: config.label, icon: config.icon });
      res.json({ success: false, message: `${config.icon} ${config.label} failed — you got away clean but empty-handed` });
    }

    // Insurance refund — fires on heist success only
    if (success) {
      const insure = await db.get('SELECT active_until, coverage_pct FROM heist_insurance WHERE user_id = ?', [targetUserId]);
      if (insure && insure.active_until > now) {
        const stolenAmount = parseFloat(((success ? Math.random() : 0) * 1).toFixed(2)); // already assigned above
        // Re-fetch amount from heist record
        const heistRecord = await db.get('SELECT amount_stolen FROM heist_attempts WHERE robber_id = ? AND target_id = ? ORDER BY created_at DESC LIMIT 1', [uid, targetUserId]);
        const stolenAmt = heistRecord ? heistRecord.amount_stolen : 0;
        if (stolenAmt > 0) {
          const refund = parseFloat((stolenAmt * insure.coverage_pct).toFixed(2));
          await db.run('UPDATE user_portfolios SET cash_balance = cash_balance + ?, updated_at = ? WHERE user_id = ?', [refund, now, targetUserId]);
          await _syncLeaderboard(targetUserId);
          emitToUser(targetUserId, 'insurance_payout', { refund, stolen: stolenAmt });
        }
      }

      // Bounty payout — highest active bounty on this target goes to robber
      const bounty = await db.get('SELECT id, placer_id, amount FROM bounties WHERE target_id = ? AND active = 1 ORDER BY amount DESC LIMIT 1', [targetUserId]);
      if (bounty) {
        await db.run('UPDATE bounties SET active = 0, collected_by = ?, resolved_at = ? WHERE id = ?', [uid, now, bounty.id]);
        await db.run(
          `INSERT INTO user_portfolios (user_id, cash_balance, total_invested, updated_at) VALUES (?, ?, ?, ?)
           ON CONFLICT(user_id) DO UPDATE SET cash_balance = cash_balance + ?, updated_at = ?`,
          [uid, bounty.amount, bounty.amount, now, bounty.amount, now]
        );
        await _syncLeaderboard(uid);
        emitToUser(uid, 'bounty_collected', { amount: bounty.amount, targetName: _displayName(targetUserId) });
        emitToUser(bounty.placer_id, 'bounty_executed', { amount: bounty.amount, targetName: _displayName(targetUserId) });
      }
    }

    // Community challenge increment — count every heist attempt
    await _incrementCommunityChallenge('heist', 1, uid);

    // Shield degradation — fires on every heist attempt against a shielded target
    if (targetShield) {
      const newDur = targetShield.durability - 1;
      if (newDur <= 0) {
        await db.run('DELETE FROM player_shields WHERE user_id = ?', [targetUserId]);
        emitToUser(targetUserId, 'shield_broken', { shieldName: targetShield.label, icon: targetShield.icon });
      } else {
        await db.run('UPDATE player_shields SET durability = ? WHERE user_id = ?', [newDur, targetUserId]);
        emitToUser(targetUserId, 'shield_hit', { shieldName: targetShield.label, icon: targetShield.icon, durabilityLeft: newDur });
      }
    }

    // Defender weapon counter-notification
    if (defenderWeapon) {
      emitToUser(targetUserId, 'weapon_defense', {
        weaponName: defenderWeapon.label,
        icon: defenderWeapon.icon,
        robberName: _displayName(uid),
      });
    }

    // Guard dog bite — fires regardless of heist outcome
    const dog = await _getBestDog(targetUserId);
    if (dog && Math.random() < dog.biteChance) {
      const robberPortfolio = await db.get('SELECT cash_balance FROM user_portfolios WHERE user_id = ?', [uid]);
      const robberCash = robberPortfolio ? robberPortfolio.cash_balance : 0;
      const biteAmount = parseFloat(Math.max(1, robberCash * dog.biteDamagePct).toFixed(2));
      await db.run(
        'UPDATE user_portfolios SET cash_balance = MAX(0, cash_balance - ?), updated_at = ? WHERE user_id = ?',
        [biteAmount, Date.now(), uid]
      );
      await _syncLeaderboard(uid);
      emitToUser(uid, 'dog_bite', { dogName: dog.label, dogIcon: dog.icon, biteAmount });
      emitToUser(targetUserId, 'dog_defended', { dogName: dog.label, dogIcon: dog.icon, biteAmount, robberName: _displayName(uid) });
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

    const robberWeapon   = await _getBestWeapon(heist.robber_id);
    const robberGetaway  = await _getBestGetaway(heist.robber_id);
    const defenderWeapon = await _getBestWeapon(heist.target_id);
    const effectiveCatchRate = Math.min(0.95, Math.max(0.05,
      CATCH_RATE
      - (robberWeapon   ? robberWeapon.catchReduction * 1.0   : 0)   // robber weapon reduces catch chance
      - (robberGetaway  ? robberGetaway.catchReduction         : 0)   // getaway vehicle further reduces catch chance
      + (defenderWeapon ? defenderWeapon.catchReduction * 0.5  : 0)  // defender weapon boosts catch chance
    ));
    const caught = Math.random() < effectiveCatchRate;
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

app.post("/api/referrals/generate-link", authenticateUser, async (req, res) => {
  const uid = req.user.userId;
  const account = accountManager.getAccountById(uid);
  // Check DB first
  let row = await db.get('SELECT code FROM referral_links WHERE user_id = ?', [uid]);
  if (!row) {
    const link = referralSystem.generateReferralLink(uid, account.email);
    await db.run('INSERT OR IGNORE INTO referral_links (user_id, code, created_at) VALUES (?, ?, ?)',
      [uid, link.code, Date.now()]);
    row = { code: link.code };
  }
  const BASE = process.env.BASE_URL || 'https://web-production-576d9.up.railway.app';
  res.json({ code: row.code, link: `${BASE}/?ref=${row.code}`, userId: uid });
});

app.get("/api/referrals/my-link", authenticateUser, async (req, res) => {
  const uid = req.user.userId;
  let row = await db.get('SELECT code, clicks, signups, converted FROM referral_links WHERE user_id = ?', [uid]);
  if (!row) {
    const account = accountManager.getAccountById(uid);
    const link = referralSystem.generateReferralLink(uid, account.email);
    await db.run('INSERT OR IGNORE INTO referral_links (user_id, code, created_at) VALUES (?, ?, ?)',
      [uid, link.code, Date.now()]);
    row = { code: link.code, clicks: 0, signups: 0, converted: 0 };
  }
  const BASE = process.env.BASE_URL || 'https://web-production-576d9.up.railway.app';
  res.json({ code: row.code, link: `${BASE}/?ref=${row.code}`, userId: uid, clicks: row.clicks, signups: row.signups, converted: row.converted });
});

app.get("/api/referrals/stats", authenticateUser, async (req, res) => {
  const uid = req.user.userId;
  const row = await db.get('SELECT clicks, signups, converted FROM referral_links WHERE user_id = ?', [uid]);
  const events = await db.all('SELECT event_type, bonus_paid FROM referral_events WHERE referrer_id = ?', [uid]);
  const totalBonuses = events.reduce((s, e) => s + (e.bonus_paid || 0), 0);
  res.json({ clicks: row ? row.clicks : 0, signups: row ? row.signups : 0, converted: row ? row.converted : 0, totalBonusesPaid: totalBonuses });
});

app.get("/api/referrals/leaderboard", async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  const rows = await db.all('SELECT user_id, signups, converted FROM referral_links ORDER BY signups DESC LIMIT ?', [limit]);
  res.json({ leaderboard: rows, totalUsers: rows.length });
});

app.get("/api/referrals/track/:code", async (req, res) => {
  const code = req.params.code;
  await db.run('UPDATE referral_links SET clicks = clicks + 1 WHERE code = ?', [code]);
  referralSystem.trackReferralClick(code); // keep in-memory in sync
  res.json({ tracked: true });
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

// ===== REFERRAL MILESTONE ENDPOINTS =====

app.post("/api/referrals/claim-milestone", authenticateUser, async (req, res) => {
  try {
    const uid = req.user.userId;
    const row = await db.get('SELECT signups FROM referral_links WHERE user_id = ?', [uid]);
    const signups = row ? row.signups : 0;
    const claimed = (await db.all('SELECT milestone FROM referral_milestones WHERE user_id = ?', [uid])).map(r => r.milestone);
    const rewards = [];
    for (const m of REFERRAL_MILESTONES) {
      if (signups >= m.count && !claimed.includes(m.count)) {
        await db.run('INSERT OR IGNORE INTO referral_milestones (user_id, milestone, claimed_at) VALUES (?,?,?)', [uid, m.count, Date.now()]);
        if (m.credits) await _addCredits(uid, m.credits, 'referral_milestone', `Referral milestone: ${m.label}`);
        if (m.paper) {
          await db.run('UPDATE user_portfolios SET cash_balance = cash_balance + ? WHERE user_id = ?', [m.paper, uid]);
          await _syncLeaderboard(uid);
        }
        await _notify(uid, 'badge', `🏆 ${m.badge} Badge Unlocked!`, `You earned the ${m.badge} badge + ${m.credits.toLocaleString()} credits for ${m.label}!`);
        rewards.push(m);
      }
    }
    res.json({ ok: true, claimed: rewards, signups });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get("/api/referrals/milestones", authenticateUser, async (req, res) => {
  try {
    const uid = req.user.userId;
    const row = await db.get('SELECT signups FROM referral_links WHERE user_id = ?', [uid]);
    const signups = row ? row.signups : 0;
    const claimed = (await db.all('SELECT milestone FROM referral_milestones WHERE user_id = ?', [uid])).map(r => r.milestone);
    const milestones = REFERRAL_MILESTONES.map(m => ({
      ...m, reached: signups >= m.count, claimed: claimed.includes(m.count)
    }));
    res.json({ signups, milestones });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ===== MARKET NEWS EVENTS =====

app.get("/api/market/news", async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const events = await db.all('SELECT * FROM market_news_events ORDER BY created_at DESC LIMIT ?', [limit]);
    res.json({ events });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/market/pump-dump", authenticateUser, async (req, res) => {
  try {
    const uid = req.user.userId;
    const { symbol, direction } = req.body;
    if (!symbol || !['up','down'].includes(direction)) return res.status(400).json({ error: 'symbol and direction (up/down) required' });
    if (!MARKET_SYMBOLS.includes(symbol)) return res.status(400).json({ error: 'Symbol not available for events' });
    const acct = await db.get('SELECT credits FROM accounts WHERE id = ?', [uid]);
    if (!acct || acct.credits < 1000) return res.status(400).json({ error: 'Not enough credits (need 1,000)' });
    await db.run('UPDATE accounts SET credits = credits - 1000 WHERE id = ?', [uid]);
    emitToUser(uid, 'credits_update', { credits: (acct.credits - 1000) });
    const pool = direction === 'up' ? MARKET_NEWS_UP : MARKET_NEWS_DOWN;
    const tpl = pool[Math.floor(Math.random() * pool.length)];
    const headline = tpl.headline.replace('{{sym}}', symbol);
    const now = Date.now();
    const pct = tpl.pct * 0.5; // player-triggered = half the impact
    await db.run('INSERT INTO market_news_events (symbol, headline, pct_change, direction, warning_at, created_at) VALUES (?,?,?,?,?,?)',
      [symbol, `[PLAYER ALERT] ${headline}`, pct, direction, now, now]);
    const cur = priceEngine.getPrice(symbol);
    if (cur) {
      priceEngine.updatePrice(symbol, parseFloat((cur * (1 + pct)).toFixed(4)));
      setTimeout(() => { if (cur) priceEngine.updatePrice(symbol, cur); }, 15 * 60 * 1000);
    }
    io.emit('market_news', { symbol, headline: `[PLAYER ALERT] ${headline}`, pct_change: pct, direction });
    res.json({ ok: true, symbol, direction, headline, pct: (pct * 100).toFixed(1) + '%' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ===== IN-GAME LEGEND NFT ENDPOINTS =====

const _nftRarityFromStats = (totalXp, heatLevel) => {
  if (totalXp >= 50000 || heatLevel >= 5) return 'legendary';
  if (totalXp >= 20000 || heatLevel >= 3) return 'epic';
  if (totalXp >= 5000  || heatLevel >= 2) return 'rare';
  if (totalXp >= 1000) return 'uncommon';
  return 'common';
};

app.post("/api/nfts/legend/mint", authenticateUser, async (req, res) => {
  try {
    const uid = req.user.userId;
    const existing = await db.get('SELECT id FROM legend_nfts WHERE owner_id = ?', [uid]);
    if (existing) return res.status(400).json({ error: 'You already minted your Legend NFT. Trade the old one first.' });
    const acct = await db.get('SELECT credits, heat_level, full_name FROM accounts WHERE id = ?', [uid]);
    if (!acct || acct.credits < 500) return res.status(400).json({ error: 'Minting costs 500 credits' });
    const xpRow = await db.get('SELECT total_xp FROM user_xp WHERE user_id = ?', [uid]);
    const totalXp = xpRow ? xpRow.total_xp : 0;
    const rarity = _nftRarityFromStats(totalXp, acct.heat_level || 0);
    const icons = { common:'🥉', uncommon:'🥈', rare:'🥇', epic:'💎', legendary:'👑' };
    const nftName = `${acct.full_name || 'Legend'} #${Math.floor(Math.random() * 9000) + 1000}`;
    const mintStats = JSON.stringify({ xp: totalXp, heat: acct.heat_level || 0, mintedAt: Date.now() });
    await db.run('UPDATE accounts SET credits = credits - 500 WHERE id = ?', [uid]);
    const result = await db.run('INSERT INTO legend_nfts (owner_id, nft_name, nft_icon, rarity, mint_stats, minted_at) VALUES (?,?,?,?,?,?)',
      [uid, nftName, icons[rarity], rarity, mintStats, Date.now()]);
    await _notify(uid, 'nft_mint', '🎨 Legend NFT Minted!', `Your ${rarity} Legend NFT "${nftName}" is ready!`);
    res.json({ ok: true, nftId: result.lastID, nftName, rarity, icon: icons[rarity] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get("/api/nfts/legend/my-nft", authenticateUser, async (req, res) => {
  try {
    const nft = await db.get('SELECT * FROM legend_nfts WHERE owner_id = ?', [req.user.userId]);
    const listing = nft ? await db.get('SELECT * FROM nft_listings WHERE nft_id = ? AND sold_at IS NULL', [nft.id]) : null;
    res.json({ nft, listing });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/nfts/legend/list", authenticateUser, async (req, res) => {
  try {
    const uid = req.user.userId;
    const { price } = req.body;
    if (!price || price < 1000) return res.status(400).json({ error: 'Minimum listing price is $1,000 paper' });
    const nft = await db.get('SELECT * FROM legend_nfts WHERE owner_id = ?', [uid]);
    if (!nft) return res.status(404).json({ error: 'You have no Legend NFT to list' });
    const existing = await db.get('SELECT id FROM nft_listings WHERE nft_id = ? AND sold_at IS NULL', [nft.id]);
    if (existing) return res.status(400).json({ error: 'Already listed. Delist first.' });
    await db.run('INSERT INTO nft_listings (nft_id, seller_id, price_paper, listed_at) VALUES (?,?,?,?)',
      [nft.id, uid, price, Date.now()]);
    res.json({ ok: true, nftId: nft.id, price });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/nfts/legend/delist", authenticateUser, async (req, res) => {
  try {
    const uid = req.user.userId;
    const nft = await db.get('SELECT id FROM legend_nfts WHERE owner_id = ?', [uid]);
    if (!nft) return res.status(404).json({ error: 'No NFT found' });
    await db.run('DELETE FROM nft_listings WHERE nft_id = ? AND seller_id = ? AND sold_at IS NULL', [nft.id, uid]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/nfts/legend/buy/:id", authenticateUser, async (req, res) => {
  try {
    const uid = req.user.userId;
    const listingId = parseInt(req.params.id);
    const listing = await db.get('SELECT * FROM nft_listings WHERE id = ? AND sold_at IS NULL', [listingId]);
    if (!listing) return res.status(404).json({ error: 'Listing not found' });
    if (listing.seller_id === uid) return res.status(400).json({ error: "Can't buy your own NFT" });
    const buyer = await db.get('SELECT cash_balance FROM user_portfolios WHERE user_id = ?', [uid]);
    if (!buyer || buyer.cash_balance < listing.price_paper) return res.status(400).json({ error: 'Not enough paper money' });
    const now = Date.now();
    await db.run('UPDATE user_portfolios SET cash_balance = cash_balance - ? WHERE user_id = ?', [listing.price_paper, uid]);
    await db.run('UPDATE user_portfolios SET cash_balance = cash_balance + ? WHERE user_id = ?', [listing.price_paper, listing.seller_id]);
    await db.run('UPDATE legend_nfts SET owner_id = ? WHERE id = ?', [uid, listing.nft_id]);
    await db.run('UPDATE nft_listings SET sold_at = ? WHERE id = ?', [now, listingId]);
    await _syncLeaderboard(uid);
    await _syncLeaderboard(listing.seller_id);
    const nft = await db.get('SELECT * FROM legend_nfts WHERE id = ?', [listing.nft_id]);
    emitToUser(listing.seller_id, 'nft_sold', { nftName: nft.nft_name, price: listing.price_paper });
    await _notify(listing.seller_id, 'nft_sold', '💰 NFT Sold!', `Your "${nft.nft_name}" sold for $${listing.price_paper.toLocaleString()}!`);
    await _notify(uid, 'nft_bought', '🎨 NFT Purchased!', `You now own "${nft.nft_name}"!`);
    res.json({ ok: true, nft });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get("/api/nfts/legend/marketplace", async (req, res) => {
  try {
    const listings = await db.all(`
      SELECT nl.*, ln.nft_name, ln.nft_icon, ln.rarity, a.full_name AS seller_name
      FROM nft_listings nl
      JOIN legend_nfts ln ON ln.id = nl.nft_id
      LEFT JOIN accounts a ON a.id = nl.seller_id
      WHERE nl.sold_at IS NULL
      ORDER BY nl.listed_at DESC LIMIT 50
    `);
    res.json({ listings });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ===== CASINO: BLACKJACK =====

app.post("/api/casino/blackjack/start", authenticateUser, async (req, res) => {
  try {
    const uid = req.user.userId;
    const { bet } = req.body;
    if (!bet || bet < CASINO_MIN_BET) return res.status(400).json({ error: `Minimum bet is $${CASINO_MIN_BET.toLocaleString()}` });
    const acct = await db.get('SELECT casino_vip FROM accounts WHERE id = ?', [uid]);
    if (bet >= CASINO_VIP_MIN && !acct?.casino_vip) return res.status(403).json({ error: 'VIP Casino access required for bets $500k+' });
    const port = await db.get('SELECT cash_balance FROM user_portfolios WHERE user_id = ?', [uid]);
    if (!port || port.cash_balance < bet) return res.status(400).json({ error: 'Not enough paper money' });
    // Cancel any active game first
    await db.run("UPDATE casino_blackjack SET status='forfeited' WHERE user_id = ? AND status = 'active'", [uid]);
    const deck = _buildDeck();
    const player = [deck.pop(), deck.pop()];
    const dealer = [deck.pop(), deck.pop()];
    await db.run('UPDATE user_portfolios SET cash_balance = cash_balance - ? WHERE user_id = ?', [bet, uid]);
    await _syncLeaderboard(uid);
    const result = await db.run(
      "INSERT INTO casino_blackjack (user_id, bet_paper, player_hand, dealer_hand, deck, status, created_at) VALUES (?,?,?,?,?,'active',?)",
      [uid, bet, JSON.stringify(player), JSON.stringify(dealer), JSON.stringify(deck), Date.now()]
    );
    const playerTotal = _handTotal(player);
    const dealerVisible = dealer[0];
    // Check natural blackjack
    if (playerTotal === 21) {
      const dealerTotal = _handTotal(dealer);
      if (dealerTotal === 21) {
        await db.run("UPDATE casino_blackjack SET status='push', outcome='push', payout=?, resolved_at=? WHERE id=?", [bet, Date.now(), result.lastID]);
        await db.run('UPDATE user_portfolios SET cash_balance = cash_balance + ? WHERE user_id = ?', [bet, uid]);
        return res.json({ gameId: result.lastID, player, dealer, playerTotal: 21, dealerTotal: 21, outcome: 'push', payout: 0, message: 'Push! Both have Blackjack.' });
      }
      const payout = Math.floor(bet * 2.5);
      await db.run("UPDATE casino_blackjack SET status='blackjack', outcome='win', payout=?, resolved_at=? WHERE id=?", [payout, Date.now(), result.lastID]);
      await db.run('UPDATE user_portfolios SET cash_balance = cash_balance + ? WHERE user_id = ?', [payout, uid]);
      await _syncLeaderboard(uid);
      return res.json({ gameId: result.lastID, player, dealer, playerTotal: 21, dealerVisible, outcome: 'blackjack', payout, message: '🃏 Blackjack! You win 2.5x!' });
    }
    res.json({ gameId: result.lastID, player, dealer: [dealerVisible], playerTotal, status: 'active' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/casino/blackjack/hit", authenticateUser, async (req, res) => {
  try {
    const uid = req.user.userId;
    const { gameId } = req.body;
    const game = await db.get("SELECT * FROM casino_blackjack WHERE id=? AND user_id=? AND status='active'", [gameId, uid]);
    if (!game) return res.status(404).json({ error: 'No active game found' });
    const deck = JSON.parse(game.deck);
    const player = JSON.parse(game.player_hand);
    player.push(deck.pop());
    const total = _handTotal(player);
    if (total > 21) {
      await db.run("UPDATE casino_blackjack SET status='bust', outcome='lose', player_hand=?, deck=?, resolved_at=? WHERE id=?",
        [JSON.stringify(player), JSON.stringify(deck), Date.now(), gameId]);
      return res.json({ gameId, player, total, outcome: 'bust', payout: 0, message: '💥 Bust! Over 21.' });
    }
    await db.run('UPDATE casino_blackjack SET player_hand=?, deck=? WHERE id=?',
      [JSON.stringify(player), JSON.stringify(deck), gameId]);
    res.json({ gameId, player, total, status: 'active' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/casino/blackjack/stand", authenticateUser, async (req, res) => {
  try {
    const uid = req.user.userId;
    const { gameId } = req.body;
    const game = await db.get("SELECT * FROM casino_blackjack WHERE id=? AND user_id=? AND status='active'", [gameId, uid]);
    if (!game) return res.status(404).json({ error: 'No active game found' });
    const deck = JSON.parse(game.deck);
    const player = JSON.parse(game.player_hand);
    const dealer = JSON.parse(game.dealer_hand);
    // Dealer draws to 17+
    while (_handTotal(dealer) < 17) dealer.push(deck.pop());
    const playerTotal = _handTotal(player);
    const dealerTotal = _handTotal(dealer);
    let outcome, payout, message;
    if (dealerTotal > 21 || playerTotal > dealerTotal) {
      outcome = 'win'; payout = game.bet_paper * 2;
      message = dealerTotal > 21 ? '🎉 Dealer busts! You win!' : '🎉 You win!';
    } else if (playerTotal === dealerTotal) {
      outcome = 'push'; payout = game.bet_paper;
      message = '🤝 Push! Bet returned.';
    } else {
      outcome = 'lose'; payout = 0;
      message = '😞 Dealer wins.';
    }
    await db.run("UPDATE casino_blackjack SET status='done', outcome=?, payout=?, player_hand=?, dealer_hand=?, deck=?, resolved_at=? WHERE id=?",
      [outcome, payout, JSON.stringify(player), JSON.stringify(dealer), JSON.stringify(deck), Date.now(), gameId]);
    if (payout > 0) {
      await db.run('UPDATE user_portfolios SET cash_balance = cash_balance + ? WHERE user_id = ?', [payout, uid]);
      await _syncLeaderboard(uid);
    }
    res.json({ gameId, player, dealer, playerTotal, dealerTotal, outcome, payout, message });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ===== CASINO: HORSE RACING =====

app.get("/api/casino/horses/current", async (req, res) => {
  try {
    let race = await db.get("SELECT * FROM horse_races WHERE status IN ('betting','running') ORDER BY created_at DESC LIMIT 1");
    if (!race) {
      const now = Date.now();
      const starts = now + 5 * 60 * 1000; // 5 min betting window
      await db.run("INSERT INTO horse_races (status, starts_at, created_at) VALUES ('betting',?,?)", [starts, now]);
      race = await db.get("SELECT * FROM horse_races WHERE status='betting' ORDER BY created_at DESC LIMIT 1");
    }
    const totalBets = await db.get('SELECT COALESCE(SUM(bet_paper),0) as total FROM horse_bets WHERE race_id=?', [race.id]);
    const betsByHorse = await db.all('SELECT horse_num, SUM(bet_paper) as total FROM horse_bets WHERE race_id=? GROUP BY horse_num', [race.id]);
    const horses = HORSE_NAMES.map((n, i) => ({
      num: i + 1, name: n, odds: HORSE_ODDS[i],
      totalBets: (betsByHorse.find(b => b.horse_num === i + 1) || {}).total || 0,
    }));
    res.json({ race, horses, totalPool: totalBets.total });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/casino/horses/bet", authenticateUser, async (req, res) => {
  try {
    const uid = req.user.userId;
    const { raceId, horseNum, bet } = req.body;
    if (!raceId || !horseNum || !bet || bet < 1000) return res.status(400).json({ error: 'raceId, horseNum, and bet (min $1,000) required' });
    if (horseNum < 1 || horseNum > 6) return res.status(400).json({ error: 'Horse number must be 1–6' });
    const race = await db.get("SELECT * FROM horse_races WHERE id=? AND status='betting'", [raceId]);
    if (!race) return res.status(404).json({ error: 'Race not in betting phase' });
    if (Date.now() >= race.starts_at) return res.status(400).json({ error: 'Betting window closed' });
    const port = await db.get('SELECT cash_balance FROM user_portfolios WHERE user_id = ?', [uid]);
    if (!port || port.cash_balance < bet) return res.status(400).json({ error: 'Not enough paper money' });
    const existingBet = await db.get('SELECT id FROM horse_bets WHERE race_id=? AND user_id=?', [raceId, uid]);
    if (existingBet) return res.status(400).json({ error: 'Already placed a bet in this race' });
    await db.run('UPDATE user_portfolios SET cash_balance = cash_balance - ? WHERE user_id = ?', [bet, uid]);
    await db.run('INSERT INTO horse_bets (race_id, user_id, horse_num, bet_paper, placed_at) VALUES (?,?,?,?,?)',
      [raceId, uid, horseNum, bet, Date.now()]);
    await _syncLeaderboard(uid);
    res.json({ ok: true, raceId, horseNum, horseName: HORSE_NAMES[horseNum - 1], bet });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get("/api/casino/horses/my-bet", authenticateUser, async (req, res) => {
  try {
    const uid = req.user.userId;
    const race = await db.get("SELECT * FROM horse_races WHERE status IN ('betting','running') ORDER BY created_at DESC LIMIT 1");
    if (!race) return res.json({ bet: null });
    const bet = await db.get('SELECT * FROM horse_bets WHERE race_id=? AND user_id=?', [race.id, uid]);
    res.json({ bet, race });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ===== TRADE WAR =====

app.get("/api/trade-war/status", async (req, res) => {
  try {
    const war = await db.get("SELECT * FROM trade_war_events WHERE status IN ('upcoming','active') ORDER BY starts_at ASC LIMIT 1");
    if (!war) return res.json({ war: null });
    const entryCount = await db.get('SELECT COUNT(*) as c FROM trade_war_entries WHERE war_id = ?', [war.id]);
    res.json({ war, entryCount: entryCount.c });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/trade-war/enter", authenticateUser, async (req, res) => {
  try {
    const uid = req.user.userId;
    const war = await db.get("SELECT * FROM trade_war_events WHERE status = 'upcoming' ORDER BY starts_at ASC LIMIT 1");
    if (!war) return res.status(404).json({ error: 'No upcoming Trade War' });
    const existing = await db.get('SELECT id FROM trade_war_entries WHERE war_id=? AND user_id=?', [war.id, uid]);
    if (existing) return res.status(400).json({ error: 'Already entered' });
    const acct = await db.get('SELECT credits FROM accounts WHERE id = ?', [uid]);
    if (!acct || acct.credits < TRADE_WAR_ENTRY_CREDITS) return res.status(400).json({ error: `Entry costs ${TRADE_WAR_ENTRY_CREDITS} credits` });
    await db.run('UPDATE accounts SET credits = credits - ? WHERE id = ?', [TRADE_WAR_ENTRY_CREDITS, uid]);
    await db.run('INSERT INTO trade_war_entries (war_id, user_id, cash, portfolio_json, entered_at) VALUES (?,?,?,?,?)',
      [war.id, uid, TRADE_WAR_START_CASH, '{}', Date.now()]);
    res.json({ ok: true, warId: war.id, startCash: TRADE_WAR_START_CASH, startsAt: war.starts_at });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/trade-war/trade", authenticateUser, async (req, res) => {
  try {
    const uid = req.user.userId;
    const { symbol, type, quantity } = req.body;
    if (!symbol || !type || !quantity || quantity <= 0) return res.status(400).json({ error: 'symbol, type (buy/sell), quantity required' });
    const war = await db.get("SELECT * FROM trade_war_events WHERE status = 'active' ORDER BY starts_at DESC LIMIT 1");
    if (!war) return res.status(400).json({ error: 'No active Trade War' });
    const entry = await db.get('SELECT * FROM trade_war_entries WHERE war_id=? AND user_id=?', [war.id, uid]);
    if (!entry) return res.status(403).json({ error: 'You did not enter this Trade War' });
    const price = priceEngine.getPrice(symbol);
    if (!price) return res.status(400).json({ error: 'Symbol price unavailable' });
    const portfolio = JSON.parse(entry.portfolio_json || '{}');
    if (type === 'buy') {
      const cost = price * quantity;
      if (entry.cash < cost) return res.status(400).json({ error: 'Not enough Trade War cash' });
      await db.run('UPDATE trade_war_entries SET cash = cash - ? WHERE war_id=? AND user_id=?', [cost, war.id, uid]);
      portfolio[symbol] = (portfolio[symbol] || 0) + quantity;
    } else {
      if (!portfolio[symbol] || portfolio[symbol] < quantity) return res.status(400).json({ error: 'Not enough shares' });
      const proceeds = price * quantity;
      await db.run('UPDATE trade_war_entries SET cash = cash + ? WHERE war_id=? AND user_id=?', [proceeds, war.id, uid]);
      portfolio[symbol] -= quantity;
      if (portfolio[symbol] <= 0) delete portfolio[symbol];
    }
    await db.run('UPDATE trade_war_entries SET portfolio_json=? WHERE war_id=? AND user_id=?',
      [JSON.stringify(portfolio), war.id, uid]);
    const newEntry = await db.get('SELECT * FROM trade_war_entries WHERE war_id=? AND user_id=?', [war.id, uid]);
    const portfolioValue = Object.entries(portfolio).reduce((s, [sym, qty]) => s + (priceEngine.getPrice(sym) || 0) * qty, 0);
    const totalValue = newEntry.cash + portfolioValue;
    res.json({ ok: true, cash: newEntry.cash, portfolio, portfolioValue, totalValue });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get("/api/trade-war/leaderboard", async (req, res) => {
  try {
    const war = await db.get("SELECT * FROM trade_war_events WHERE status IN ('active','ended') ORDER BY starts_at DESC LIMIT 1");
    if (!war) return res.json({ entries: [] });
    const entries = await db.all('SELECT te.*, a.full_name FROM trade_war_entries te LEFT JOIN accounts a ON a.id = te.user_id WHERE war_id=?', [war.id]);
    const ranked = entries.map(e => {
      const port = JSON.parse(e.portfolio_json || '{}');
      const portVal = Object.entries(port).reduce((s, [sym, qty]) => s + (priceEngine.getPrice(sym) || 0) * qty, 0);
      return { ...e, totalValue: e.cash + portVal };
    }).sort((a, b) => b.totalValue - a.totalValue);
    res.json({ war, entries: ranked });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get("/api/trade-war/my-entry", authenticateUser, async (req, res) => {
  try {
    const uid = req.user.userId;
    const war = await db.get("SELECT * FROM trade_war_events WHERE status IN ('upcoming','active') ORDER BY starts_at ASC LIMIT 1");
    if (!war) return res.json({ entry: null });
    const entry = await db.get('SELECT * FROM trade_war_entries WHERE war_id=? AND user_id=?', [war.id, uid]);
    if (!entry) return res.json({ entry: null, war });
    const port = JSON.parse(entry.portfolio_json || '{}');
    const portVal = Object.entries(port).reduce((s, [sym, qty]) => s + (priceEngine.getPrice(sym) || 0) * qty, 0);
    res.json({ entry: { ...entry, totalValue: entry.cash + portVal }, war, portfolio: port });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ===== CREW TERRITORY =====

app.get('/api/territory/map', authenticateUser, async (req, res) => {
  try {
    const uid = req.user.userId;
    const territories = await db.all('SELECT * FROM crew_territories');
    const memberRow = await db.get('SELECT team_id FROM team_members WHERE user_id=?', [uid]);
    const crewId = memberRow?.team_id || null;
    const crewRow = crewId ? await db.get('SELECT name FROM teams WHERE id=?', [crewId]) : null;
    const map = NEIGHBORHOODS.map(n => {
      const t = territories.find(x => x.neighborhood === n.id) || {};
      return { ...n, crew_id: t.crew_id || null, captured_at: t.captured_at || null };
    });
    const crewCount = crewId ? map.filter(n => n.crew_id === crewId).length : 0;
    const totalIncome = NEIGHBORHOODS.filter(n => map.find(m => m.id === n.id)?.crew_id === crewId).reduce((s, n) => s + n.baseIncome, 0);
    res.json({ map, crewId, crewName: crewRow?.name || null, crewCount, totalIncome });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/territory/raid/:neighborhoodId', authenticateUser, async (req, res) => {
  try {
    const uid = req.user.userId;
    const { neighborhoodId } = req.params;
    const neighborhood = NEIGHBORHOODS.find(n => n.id === neighborhoodId);
    if (!neighborhood) return res.status(400).json({ error: 'Unknown neighborhood' });

    const memberRow = await db.get('SELECT team_id FROM team_members WHERE user_id=?', [uid]);
    if (!memberRow) return res.status(400).json({ error: 'You must be in a crew to raid territories' });
    const crewId = memberRow.team_id;

    const territory = await db.get('SELECT * FROM crew_territories WHERE neighborhood=?', [neighborhoodId]);
    if (territory?.crew_id === crewId) return res.status(400).json({ error: 'Your crew already controls this neighborhood' });

    // 4-hour cooldown per crew per neighborhood
    const cooldown = 4 * 60 * 60 * 1000;
    const lastRaid = await db.get('SELECT created_at FROM territory_raids WHERE neighborhood=? AND attacker_crew=? ORDER BY created_at DESC LIMIT 1', [neighborhoodId, crewId]);
    if (lastRaid && Date.now() - lastRaid.created_at < cooldown) {
      const mins = Math.ceil((cooldown - (Date.now() - lastRaid.created_at)) / 60000);
      return res.status(429).json({ error: `Raid cooldown: ${mins} minutes remaining` });
    }

    const acct = await db.get('SELECT heat_level FROM accounts WHERE id=?', [uid]);
    const heatPenalty = (acct?.heat_level || 0) >= 4 ? 0.10 : 0;
    const success = Math.random() < (0.55 - heatPenalty);
    const now = Date.now();

    await db.run('INSERT INTO territory_raids (neighborhood, attacker_crew, defender_crew, success, created_at) VALUES (?,?,?,?,?)',
      [neighborhoodId, crewId, territory?.crew_id || null, success ? 1 : 0, now]);
    await db.run('UPDATE accounts SET heat_level = MIN(5, heat_level + 1) WHERE id=?', [uid]);

    if (success) {
      const oldCrew = territory?.crew_id;
      await db.run('UPDATE crew_territories SET crew_id=?, captured_at=? WHERE neighborhood=?', [crewId, now, neighborhoodId]);
      // Notify attackers
      const attackers = await db.all('SELECT user_id FROM team_members WHERE team_id=?', [crewId]);
      for (const m of attackers) {
        await _notify(m.user_id, 'territory', '🗺️ Territory Captured!', `Your crew seized ${neighborhood.icon} ${neighborhood.name}!`);
        emitToUser(m.user_id, 'territory_captured', { neighborhood: neighborhoodId, icon: neighborhood.icon, name: neighborhood.name, crewId });
      }
      // Notify defenders
      if (oldCrew) {
        const defenders = await db.all('SELECT user_id FROM team_members WHERE team_id=?', [oldCrew]);
        for (const m of defenders) {
          await _notify(m.user_id, 'territory_lost', '⚠️ Territory Lost!', `Enemy crew took ${neighborhood.icon} ${neighborhood.name}!`);
          emitToUser(m.user_id, 'territory_lost', { neighborhood: neighborhoodId });
        }
      }
      io.emit('territory_update', { neighborhood: neighborhoodId, crewId, icon: neighborhood.icon, name: neighborhood.name });
      return res.json({ success: true, message: `${neighborhood.icon} ${neighborhood.name} is now yours!` });
    }
    res.json({ success: false, message: `Raid on ${neighborhood.icon} ${neighborhood.name} failed. Try again later.` });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ===== SEASON STORY MODE =====

app.get('/api/season/story', authenticateUser, async (req, res) => {
  try {
    const uid = req.user.userId;
    const chapters = SEASON_CHAPTERS[CURRENT_SEASON] || [];
    const xpRow = await db.get('SELECT total_xp FROM user_xp WHERE user_id=?', [uid]);
    const totalXp = xpRow?.total_xp || 0;
    const progress = await db.all('SELECT chapter_num FROM season_progress WHERE user_id=? AND season_key=?', [uid, CURRENT_SEASON]);
    const completed = new Set(progress.map(r => r.chapter_num));
    const result = chapters.map(ch => ({
      ...ch,
      completed: completed.has(ch.num),
      unlocked: totalXp >= ch.xp_required,
      claimable: totalXp >= ch.xp_required && !completed.has(ch.num) && (ch.num === 1 || completed.has(ch.num - 1)),
    }));
    res.json({ season: CURRENT_SEASON, chapters: result, totalXp });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/season/story/complete/:chapterNum', authenticateUser, async (req, res) => {
  try {
    const uid = req.user.userId;
    const chapterNum = parseInt(req.params.chapterNum, 10);
    const chapter = (SEASON_CHAPTERS[CURRENT_SEASON] || []).find(c => c.num === chapterNum);
    if (!chapter) return res.status(400).json({ error: 'Chapter not found' });

    const xpRow = await db.get('SELECT total_xp FROM user_xp WHERE user_id=?', [uid]);
    if ((xpRow?.total_xp || 0) < chapter.xp_required) {
      return res.status(400).json({ error: `Need ${chapter.xp_required} XP (you have ${xpRow?.total_xp || 0})` });
    }
    if (chapterNum > 1) {
      const prev = await db.get('SELECT id FROM season_progress WHERE user_id=? AND season_key=? AND chapter_num=?', [uid, CURRENT_SEASON, chapterNum - 1]);
      if (!prev) return res.status(400).json({ error: 'Complete the previous chapter first' });
    }
    const existing = await db.get('SELECT id FROM season_progress WHERE user_id=? AND season_key=? AND chapter_num=?', [uid, CURRENT_SEASON, chapterNum]);
    if (existing) return res.status(400).json({ error: 'Chapter already completed' });

    const now = Date.now();
    await db.run('INSERT INTO season_progress (user_id, season_key, chapter_num, completed_at) VALUES (?,?,?,?)', [uid, CURRENT_SEASON, chapterNum, now]);

    if (chapter.reward_credits > 0) await _addCredits(uid, chapter.reward_credits, 'season_story', `Season story Ch.${chapterNum}: ${chapter.title}`);
    if (chapter.reward_paper > 0) {
      await db.run('UPDATE user_portfolios SET cash_balance = cash_balance + ? WHERE user_id=?', [chapter.reward_paper, uid]);
      await _syncLeaderboard(uid);
    }
    if (chapter.reward_badge) {
      await db.run('INSERT OR IGNORE INTO badge_awards (user_id, badge_key, awarded_at) VALUES (?,?,?)', [uid, chapter.reward_badge, now]).catch(() => {});
    }

    await _notify(uid, 'season_chapter', `📖 Chapter ${chapterNum} Complete!`, `"${chapter.title}" — ${chapter.reward_credits} Credits & $${chapter.reward_paper.toLocaleString()} paper money!`);
    emitToUser(uid, 'season_chapter_complete', { chapterNum, title: chapter.title, rewards: { credits: chapter.reward_credits, paper: chapter.reward_paper } });

    res.json({ ok: true, chapter: { ...chapter, completed: true }, rewards: { credits: chapter.reward_credits, paper: chapter.reward_paper, badge: chapter.reward_badge } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ===== WEAPONS ARMORY =====

app.get('/api/weapons/armory', authenticateUser, async (req, res) => {
  try {
    const uid = req.user.userId;
    const ownedRows = await db.all('SELECT weapon_key FROM player_weapons WHERE user_id=?', [uid]);
    const xpRows    = await db.all('SELECT weapon_key, xp, level FROM weapon_xp WHERE user_id=?', [uid]);
    const modRows   = await db.all('SELECT weapon_key, mod_key, equipped FROM weapon_mods WHERE user_id=?', [uid]);
    const skinRows  = await db.all('SELECT weapon_key, skin_key, active FROM weapon_skins WHERE user_id=?', [uid]);

    const xpMap = Object.fromEntries(xpRows.map(r => [r.weapon_key, r]));
    const modsByKey = {};
    for (const r of modRows) { if (!modsByKey[r.weapon_key]) modsByKey[r.weapon_key] = []; modsByKey[r.weapon_key].push(r); }
    const skinsByKey = {};
    for (const r of skinRows) { if (!skinsByKey[r.weapon_key]) skinsByKey[r.weapon_key] = []; skinsByKey[r.weapon_key].push(r); }

    const weapons = ownedRows.map(r => {
      const w = WEAPONS[r.weapon_key];
      if (!w) return null;
      const xpData = xpMap[r.weapon_key] || { xp: 0, level: 1 };
      const activeSkin = (skinsByKey[r.weapon_key] || []).find(s => s.active);
      const equippedMods = (modsByKey[r.weapon_key] || []).filter(m => m.equipped).map(m => ({ key: m.mod_key, ...WEAPON_MODS_CATALOG[m.mod_key] }));
      const ownedMods  = (modsByKey[r.weapon_key] || []).map(m => ({ key: m.mod_key, equipped: m.equipped, ...WEAPON_MODS_CATALOG[m.mod_key] }));
      const ownedSkins = (skinsByKey[r.weapon_key] || []).map(s => ({ key: s.skin_key, active: s.active, ...WEAPON_SKINS_CATALOG[s.skin_key] }));
      const ability = xpData.level >= 10 ? WEAPON_ABILITIES[r.weapon_key] : null;
      return {
        key: r.weapon_key, ...w,
        xp: xpData.xp, level: xpData.level,
        xpToNext: xpData.level < 10 ? (xpData.level * 100) - xpData.xp : null,
        equippedMods, ownedMods, ownedSkins,
        activeSkin: activeSkin ? { key: activeSkin.skin_key, ...WEAPON_SKINS_CATALOG[activeSkin.skin_key] } : null,
        ability, abilityHint: WEAPON_ABILITIES[r.weapon_key],
      };
    }).filter(Boolean).sort((a, b) => b.tier - a.tier);

    res.json({ weapons, WEAPON_MODS_CATALOG, WEAPON_SKINS_CATALOG });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/weapons/mods/buy', authenticateUser, async (req, res) => {
  try {
    const uid = req.user.userId;
    const { weaponKey, modKey } = req.body;
    if (!WEAPONS[weaponKey]) return res.status(400).json({ error: 'Invalid weapon' });
    const mod = WEAPON_MODS_CATALOG[modKey];
    if (!mod) return res.status(400).json({ error: 'Invalid mod' });
    if (!await db.get('SELECT id FROM player_weapons WHERE user_id=? AND weapon_key=?', [uid, weaponKey]))
      return res.status(400).json({ error: "You don't own this weapon" });
    if (await db.get('SELECT id FROM weapon_mods WHERE user_id=? AND weapon_key=? AND mod_key=?', [uid, weaponKey, modKey]))
      return res.status(400).json({ error: 'Mod already owned' });
    const acct = await db.get('SELECT sml_credits FROM accounts WHERE id=?', [uid]);
    if ((acct?.sml_credits || 0) < mod.price_credits) return res.status(400).json({ error: 'Insufficient credits' });
    await db.run('UPDATE accounts SET sml_credits = sml_credits - ? WHERE id=?', [mod.price_credits, uid]);
    await db.run('INSERT INTO weapon_mods (user_id, weapon_key, mod_key, equipped, purchased_at) VALUES (?,?,?,0,?)', [uid, weaponKey, modKey, Date.now()]);
    res.json({ ok: true, message: `${mod.icon} ${mod.label} purchased!` });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/weapons/mods/equip', authenticateUser, async (req, res) => {
  try {
    const uid = req.user.userId;
    const { weaponKey, modKey } = req.body;
    const owned = await db.get('SELECT id, equipped FROM weapon_mods WHERE user_id=? AND weapon_key=? AND mod_key=?', [uid, weaponKey, modKey]);
    if (!owned) return res.status(400).json({ error: 'Mod not owned' });
    await db.run('UPDATE weapon_mods SET equipped = 1 - equipped WHERE id=?', [owned.id]);
    res.json({ ok: true, equipped: owned.equipped === 0 });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/weapons/skins/buy', authenticateUser, async (req, res) => {
  try {
    const uid = req.user.userId;
    const { weaponKey, skinKey } = req.body;
    if (!WEAPONS[weaponKey]) return res.status(400).json({ error: 'Invalid weapon' });
    const skin = WEAPON_SKINS_CATALOG[skinKey];
    if (!skin) return res.status(400).json({ error: 'Invalid skin' });
    if (!await db.get('SELECT id FROM player_weapons WHERE user_id=? AND weapon_key=?', [uid, weaponKey]))
      return res.status(400).json({ error: "You don't own this weapon" });
    if (await db.get('SELECT id FROM weapon_skins WHERE user_id=? AND weapon_key=? AND skin_key=?', [uid, weaponKey, skinKey]))
      return res.status(400).json({ error: 'Skin already owned' });
    const acct = await db.get('SELECT sml_credits FROM accounts WHERE id=?', [uid]);
    if ((acct?.sml_credits || 0) < skin.price_credits) return res.status(400).json({ error: 'Insufficient credits' });
    await db.run('UPDATE accounts SET sml_credits = sml_credits - ? WHERE id=?', [skin.price_credits, uid]);
    await db.run('INSERT INTO weapon_skins (user_id, weapon_key, skin_key, active, purchased_at) VALUES (?,?,?,0,?)', [uid, weaponKey, skinKey, Date.now()]);
    res.json({ ok: true, message: `${skin.icon} ${skin.label} skin unlocked!` });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/weapons/skins/equip', authenticateUser, async (req, res) => {
  try {
    const uid = req.user.userId;
    const { weaponKey, skinKey } = req.body;
    if (!await db.get('SELECT id FROM weapon_skins WHERE user_id=? AND weapon_key=? AND skin_key=?', [uid, weaponKey, skinKey]))
      return res.status(400).json({ error: 'Skin not owned' });
    await db.run('UPDATE weapon_skins SET active=0 WHERE user_id=? AND weapon_key=?', [uid, weaponKey]);
    await db.run('UPDATE weapon_skins SET active=1 WHERE user_id=? AND weapon_key=? AND skin_key=?', [uid, weaponKey, skinKey]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
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

// ── Creator Follow System ──────────────────────────────────────────────────
app.post("/api/social/follow/:userId", authenticateUser, async (req, res) => {
  const uid = req.user.userId;
  const targetId = req.params.userId;
  if (uid === targetId) return res.status(400).json({ error: 'Cannot follow yourself' });
  try {
    await db.run(
      'INSERT OR IGNORE INTO creator_followers (creator_id, follower_id, created_at) VALUES (?, ?, ?)',
      [targetId, uid, Date.now()]
    );
    const count = await db.get('SELECT COUNT(*) AS c FROM creator_followers WHERE creator_id = ?', [targetId]);
    _notify(targetId, 'follow', '👥 New Follower', 'Someone started following your creator profile!');
    res.json({ success: true, followerCount: count.c });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete("/api/social/follow/:userId", authenticateUser, async (req, res) => {
  const uid = req.user.userId;
  const targetId = req.params.userId;
  try {
    await db.run('DELETE FROM creator_followers WHERE creator_id = ? AND follower_id = ?', [targetId, uid]);
    const count = await db.get('SELECT COUNT(*) AS c FROM creator_followers WHERE creator_id = ?', [targetId]);
    res.json({ success: true, followerCount: count.c });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get("/api/social/followers/me", authenticateUser, async (req, res) => {
  const uid = req.user.userId;
  try {
    const count = await db.get('SELECT COUNT(*) AS c FROM creator_followers WHERE creator_id = ?', [uid]);
    const followers = await db.all(
      `SELECT a.id, a.full_name, a.email FROM creator_followers cf
       JOIN accounts a ON a.id = cf.follower_id
       WHERE cf.creator_id = ? ORDER BY cf.created_at DESC LIMIT 50`,
      [uid]
    );
    res.json({ followerCount: count.c, followers });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get("/api/social/following/me", authenticateUser, async (req, res) => {
  const uid = req.user.userId;
  try {
    const following = await db.all(
      `SELECT a.id, a.full_name, a.email FROM creator_followers cf
       JOIN accounts a ON a.id = cf.creator_id
       WHERE cf.follower_id = ? ORDER BY cf.created_at DESC LIMIT 50`,
      [uid]
    );
    res.json({ following, followingCount: following.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Creator Dashboard ──────────────────────────────────────────────────────
app.get("/api/creator/dashboard", authenticateUser, async (req, res) => {
  const uid = req.user.userId;
  try {
    const membership = await db.get('SELECT active, activated_at FROM creator_memberships WHERE user_id = ?', [uid]);
    if (!membership || !membership.active) return res.status(403).json({ error: 'Creator Membership required' });

    const followerCount = (await db.get('SELECT COUNT(*) AS c FROM creator_followers WHERE creator_id = ?', [uid])).c;
    const totalCommissions = await db.get(
      'SELECT COALESCE(SUM(credits_awarded), 0) AS total FROM creator_commissions WHERE creator_id = ?', [uid]
    );
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0,0,0,0);
    const monthCommissions = await db.get(
      'SELECT COALESCE(SUM(credits_awarded), 0) AS total FROM creator_commissions WHERE creator_id = ? AND created_at >= ?',
      [uid, monthStart.getTime()]
    );
    const recentCommissions = await db.all(
      'SELECT source_user_id, purchase_type, credits_awarded, created_at FROM creator_commissions WHERE creator_id = ? ORDER BY created_at DESC LIMIT 10',
      [uid]
    );
    const tipIncome = await db.get(
      `SELECT COALESCE(SUM(cl.amount), 0) AS total FROM credit_ledger cl WHERE cl.user_id = ? AND cl.type = 'tip_income'`,
      [uid]
    );
    const creditBalance = await db.get('SELECT balance FROM sml_credits WHERE user_id = ?', [uid]);

    res.json({
      followerCount,
      totalCommissionCredits: totalCommissions.total,
      thisMonthCredits: monthCommissions.total,
      totalTipIncome: tipIncome ? tipIncome.total : 0,
      creditBalance: creditBalance ? creditBalance.balance : 0,
      recentCommissions,
      activeSince: membership.activated_at
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
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
  awardMissionXP(uid, 'make_3_trades').catch(() => {});
  awardMissionXP(uid, 'make_5_trades').catch(() => {});
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
  // Free to play — Season Pass is a competitive upgrade, not a gate
  res.json({ hasAccess: true });
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

// ===== CREATOR / ELITE STATUS =====

app.get("/api/creator/status", authenticateUser, async (req, res) => {
  const uid = req.user.userId;
  const [creatorRow, eliteRow] = await Promise.all([
    db.get('SELECT activated_at, active FROM creator_memberships WHERE user_id = ?', [uid]),
    db.get('SELECT activated_at, active FROM elite_memberships WHERE user_id = ?', [uid]),
  ]);
  res.json({
    isCreator: !!(creatorRow && creatorRow.active),
    isElite:   !!(eliteRow && eliteRow.active),
    creatorActivatedAt: creatorRow ? creatorRow.activated_at : null,
    eliteActivatedAt:   eliteRow   ? eliteRow.activated_at   : null,
  });
});

app.get("/api/subscriptions/status", authenticateUser, async (req, res) => {
  const uid = req.user.userId;
  const [creatorRow, eliteRow, coachRow] = await Promise.all([
    db.get('SELECT active, activated_at FROM creator_memberships WHERE user_id = ?', [uid]),
    db.get('SELECT active, activated_at FROM elite_memberships WHERE user_id = ?', [uid]),
    db.get('SELECT active, activated_at FROM premium_coach_subs WHERE user_id = ?', [uid]),
  ]);
  res.json({
    creator: { active: !!(creatorRow && creatorRow.active), activatedAt: creatorRow ? creatorRow.activated_at : null },
    elite:   { active: !!(eliteRow   && eliteRow.active),   activatedAt: eliteRow   ? eliteRow.activated_at   : null },
    coachPro:{ active: !!(coachRow   && coachRow.active),   activatedAt: coachRow   ? coachRow.activated_at   : null },
  });
});

// ===== STRIPE — NEW CHECKOUT ENDPOINTS =====

app.post("/api/stripe/elite-membership", authenticateUser, async (req, res) => {
  const uid = req.user.userId;
  const existing = await db.get('SELECT active FROM elite_memberships WHERE user_id = ?', [uid]);
  if (existing && existing.active) return res.status(400).json({ error: 'Elite Membership already active' });
  const acct = accountManager.getAccountById(uid);
  const { checkoutUrl } = await stripeProcessor.createEliteCheckout(uid, acct ? acct.email : null);
  res.json({ checkoutUrl });
});

app.post("/api/stripe/gift-credits", authenticateUser, async (req, res) => {
  const { recipientEmail, packageKey } = req.body;
  if (!recipientEmail || !packageKey) return res.status(400).json({ error: 'recipientEmail and packageKey required' });
  const CREDIT_PACKAGES_MAP = { starter: { credits: 500, amount_cents: 500, label: 'Starter Pack (500 Credits)' }, legends: { credits: 2500, amount_cents: 2000, label: 'Legends Pack (2,500 Credits)' }, champion: { credits: 7000, amount_cents: 5000, label: 'Champion Pack (7,000 Credits)' } };
  const pkg = CREDIT_PACKAGES_MAP[packageKey];
  if (!pkg) return res.status(400).json({ error: 'Invalid package' });
  const recipient = accountManager.getAccount(recipientEmail);
  if (!recipient) return res.status(404).json({ error: 'Recipient not found' });
  const uid = req.user.userId;
  const senderAcct = accountManager.getAccountById(uid);
  const { checkoutUrl } = await stripeProcessor.createGiftCreditsCheckout(uid, senderAcct ? senderAcct.email : null, recipient.id, packageKey, pkg);
  res.json({ checkoutUrl });
});

app.post("/api/stripe/legend-bundle", authenticateUser, async (req, res) => {
  const uid = req.user.userId;
  const acct = accountManager.getAccountById(uid);
  const { checkoutUrl } = await stripeProcessor.createLegendBundleCheckout(uid, acct ? acct.email : null);
  res.json({ checkoutUrl });
});

// ===== XP BOOSTER =====

app.get("/api/boost/status", authenticateUser, async (req, res) => {
  const row = await db.get('SELECT active_until, multiplier, activated_at FROM xp_boosts WHERE user_id = ?', [req.user.userId]);
  const active = row && row.active_until > Date.now();
  res.json({ active: !!active, activeUntil: row ? row.active_until : null, multiplier: active ? row.multiplier : 1 });
});

app.post("/api/boost/activate", authenticateUser, async (req, res) => {
  const uid = req.user.userId;
  const COST = 500;
  const credits = await db.get('SELECT balance FROM sml_credits WHERE user_id = ?', [uid]);
  if (!credits || credits.balance < COST) return res.status(400).json({ error: `Insufficient credits (need ${COST})`, balance: credits ? credits.balance : 0 });
  const now = Date.now();
  const activeUntil = now + 86_400_000;
  await db.run('UPDATE sml_credits SET balance = balance - ?, updated_at = ? WHERE user_id = ?', [COST, now, uid]);
  await db.run('INSERT INTO credit_transactions (user_id, amount, type, description, created_at) VALUES (?, ?, ?, ?, ?)',
    [uid, -COST, 'spend', 'XP Booster 24h', now]);
  await db.run(`INSERT INTO xp_boosts (user_id, active_until, multiplier, activated_at) VALUES (?, ?, 2.0, ?)
    ON CONFLICT(user_id) DO UPDATE SET active_until = ?, multiplier = 2.0, activated_at = ?`,
    [uid, activeUntil, now, activeUntil, now]);
  const newBalance = credits.balance - COST;
  res.json({ success: true, activeUntil, multiplier: 2, creditsBalance: newBalance });
});

// ===== COSMETICS STORE =====

const COSMETICS_CATALOG = {
  frames: [
    { key: 'silver',    label: 'Silver Frame',    icon: '🥈', cost: 100 },
    { key: 'gold',      label: 'Gold Frame',      icon: '🥇', cost: 200 },
    { key: 'neon',      label: 'Neon Frame',      icon: '⚡', cost: 300 },
    { key: 'diamond',   label: 'Diamond Frame',   icon: '💎', cost: 500 },
    { key: 'legendary', label: 'Legendary Frame', icon: '👑', cost: 1000 },
  ],
  nameplates: [
    { key: 'red',     label: 'Red Nameplate',     icon: '🔴', cost: 100 },
    { key: 'blue',    label: 'Blue Nameplate',    icon: '🔵', cost: 100 },
    { key: 'purple',  label: 'Purple Nameplate',  icon: '🟣', cost: 200 },
    { key: 'rainbow', label: 'Rainbow Nameplate', icon: '🌈', cost: 500 },
  ],
};

app.get("/api/cosmetics/catalog", authenticateUser, async (req, res) => {
  const row = await db.get('SELECT frame_style, nameplate_color FROM player_cosmetics WHERE user_id = ?', [req.user.userId]);
  res.json({ catalog: COSMETICS_CATALOG, equipped: row || { frame_style: 'default', nameplate_color: 'default' } });
});

app.post("/api/cosmetics/buy", authenticateUser, async (req, res) => {
  const uid = req.user.userId;
  const { type, item } = req.body;
  if (!type || !item) return res.status(400).json({ error: 'type and item required' });
  const catalog = type === 'frame' ? COSMETICS_CATALOG.frames : type === 'nameplate' ? COSMETICS_CATALOG.nameplates : null;
  if (!catalog) return res.status(400).json({ error: 'type must be "frame" or "nameplate"' });
  const cosmetic = catalog.find(c => c.key === item);
  if (!cosmetic) return res.status(404).json({ error: 'Item not found in catalog' });
  const credits = await db.get('SELECT balance FROM sml_credits WHERE user_id = ?', [uid]);
  const bal = credits ? credits.balance : 0;
  if (bal < cosmetic.cost) return res.status(400).json({ error: `Insufficient credits (need ${cosmetic.cost})`, balance: bal });
  const now = Date.now();
  await db.run('UPDATE sml_credits SET balance = balance - ?, updated_at = ? WHERE user_id = ?', [cosmetic.cost, now, uid]);
  await db.run('INSERT INTO credit_transactions (user_id, amount, type, description, created_at) VALUES (?, ?, ?, ?, ?)',
    [uid, -cosmetic.cost, 'spend', `Cosmetic: ${cosmetic.label}`, now]);
  const col = type === 'frame' ? 'frame_style' : 'nameplate_color';
  await db.run(`INSERT INTO player_cosmetics (user_id, ${col}, updated_at) VALUES (?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET ${col} = ?, updated_at = ?`, [uid, item, now, item, now]);
  res.json({ success: true, equipped: item, creditsBalance: bal - cosmetic.cost });
});

app.get("/api/cosmetics/mine", authenticateUser, async (req, res) => {
  const row = await db.get('SELECT frame_style, nameplate_color FROM player_cosmetics WHERE user_id = ?', [req.user.userId]);
  res.json(row || { frame_style: 'default', nameplate_color: 'default' });
});

// ===== NOTIFICATION INBOX =====

app.get("/api/notifications", authenticateUser, async (req, res) => {
  const rows = await db.all(
    'SELECT id, type, title, body, read, created_at FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
    [req.user.userId]
  );
  const unread = rows.filter(r => !r.read).length;
  res.json({ notifications: rows, unread });
});

app.post("/api/notifications/read", authenticateUser, async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids)) return res.status(400).json({ error: 'ids array required' });
  if (ids.length === 0) return res.json({ success: true });
  const placeholders = ids.map(() => '?').join(',');
  await db.run(`UPDATE notifications SET read = 1 WHERE user_id = ? AND id IN (${placeholders})`,
    [req.user.userId, ...ids]);
  res.json({ success: true });
});

app.delete("/api/notifications/:id", authenticateUser, async (req, res) => {
  await db.run('DELETE FROM notifications WHERE id = ? AND user_id = ?', [req.params.id, req.user.userId]);
  res.json({ success: true });
});

// ===== DAILY CHECKLIST =====

app.get("/api/daily-checklist", authenticateUser, async (req, res) => {
  const uid = req.user.userId;
  const todayStart = new Date(); todayStart.setUTCHours(0, 0, 0, 0);
  const todayTs = todayStart.getTime();
  const [spinRow, tradeRow, heistRow, missionRow] = await Promise.all([
    db.get('SELECT last_spin FROM spin_claims WHERE user_id = ?', [uid]),
    db.get('SELECT COUNT(*) as cnt FROM trades WHERE user_id = ? AND timestamp >= ?', [uid, todayTs]),
    db.get('SELECT COUNT(*) as cnt FROM heist_attempts WHERE robber_id = ? AND created_at >= ?', [uid, todayTs]),
    db.get('SELECT COUNT(*) as cnt FROM user_missions WHERE user_id = ? AND status = ?', [uid, 'in_progress']),
  ]);
  const loginBadge = badgeSystem.getLoginStreak ? badgeSystem.getLoginStreak(uid) : null;
  res.json({
    streak: loginBadge ? loginBadge.streak : 0,
    spinDone:      !!(spinRow && spinRow.last_spin && spinRow.last_spin > Date.now() - 86_400_000),
    tradedToday:   !!(tradeRow && tradeRow.cnt > 0),
    heistedToday:  !!(heistRow && heistRow.cnt > 0),
    missionActive: !!(missionRow && missionRow.cnt > 0),
  });
});

// ===== WEEKLY PERFORMANCE CARD =====

app.get("/api/stats/weekly-card", authenticateUser, async (req, res) => {
  const uid = req.user.userId;
  const weekStart = new Date(); weekStart.setUTCHours(0, 0, 0, 0);
  weekStart.setUTCDate(weekStart.getUTCDate() - weekStart.getUTCDay());
  const weekTs = weekStart.getTime();
  const [portfolio, tradeCount, lb] = await Promise.all([
    db.get('SELECT cash_balance, total_invested FROM user_portfolios WHERE user_id = ?', [uid]),
    db.get('SELECT COUNT(*) as cnt FROM trades WHERE user_id = ? AND timestamp >= ?', [uid, weekTs]),
    db.all('SELECT user_id FROM leaderboard_scores ORDER BY score DESC LIMIT 500'),
  ]);
  const rankEntry = lb.findIndex(r => r.user_id === uid);
  const rank = rankEntry >= 0 ? rankEntry + 1 : null;
  const gainPct = portfolio && portfolio.total_invested > 0
    ? ((portfolio.cash_balance - portfolio.total_invested) / portfolio.total_invested * 100).toFixed(2)
    : '0.00';
  const acct = accountManager.getAccountById(uid);
  const refRow = await db.get('SELECT code FROM referral_links WHERE user_id = ?', [uid]);
  const BASE = process.env.BASE_URL || 'https://web-production-576d9.up.railway.app';
  const refLink = refRow ? `${BASE}/?ref=${refRow.code}` : BASE;
  res.json({
    gainPct, rank, totalPlayers: lb.length,
    trades: tradeCount ? tradeCount.cnt : 0,
    name: acct ? (acct.fullName || acct.email) : 'A Legend',
    shareText: `I ${parseFloat(gainPct) >= 0 ? 'gained' : 'lost'} ${parseFloat(gainPct) >= 0 ? '+' : ''}${gainPct}% this week on Self-Made Legends${rank ? `, ranked #${rank}` : ''}! Play free → ${refLink} 🚀`,
  });
});

// ===== LIMIT ORDERS =====

app.post("/api/trade/limit-order", authenticateUser, async (req, res) => {
  const uid = req.user.userId;
  const { symbol, order_type, quantity, limit_price } = req.body;
  if (!symbol || !order_type || !quantity || !limit_price) return res.status(400).json({ error: 'symbol, order_type, quantity, limit_price required' });
  if (!['buy', 'sell'].includes(order_type)) return res.status(400).json({ error: 'order_type must be "buy" or "sell"' });
  const qty = parseFloat(quantity);
  const price = parseFloat(limit_price);
  if (isNaN(qty) || qty <= 0 || isNaN(price) || price <= 0) return res.status(400).json({ error: 'quantity and limit_price must be positive numbers' });
  if (!priceEngine.getPrice(symbol)) return res.status(400).json({ error: 'Unknown symbol' });
  const now = Date.now();
  const result = await db.run(
    'INSERT INTO limit_orders (user_id, symbol, order_type, quantity, limit_price, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [uid, symbol.toUpperCase(), order_type, qty, price, 'pending', now]
  );
  res.json({ success: true, orderId: result.lastID, symbol, order_type, quantity: qty, limit_price: price });
});

app.get("/api/trade/limit-orders", authenticateUser, async (req, res) => {
  const rows = await db.all(
    'SELECT id, symbol, order_type, quantity, limit_price, status, created_at, filled_at FROM limit_orders WHERE user_id = ? ORDER BY created_at DESC',
    [req.user.userId]
  );
  res.json({ orders: rows });
});

app.delete("/api/trade/limit-order/:id", authenticateUser, async (req, res) => {
  const result = await db.run(
    'UPDATE limit_orders SET status = ? WHERE id = ? AND user_id = ? AND status = ?',
    ['cancelled', req.params.id, req.user.userId, 'pending']
  );
  if (result.changes === 0) return res.status(404).json({ error: 'Order not found or already filled/cancelled' });
  res.json({ success: true });
});

// ===== TOURNAMENT PAYOUT =====

app.post("/api/admin/tournament/payout", requireAdmin, async (req, res) => {
  const { tournamentId, winners } = req.body;
  if (!tournamentId || !Array.isArray(winners) || winners.length === 0) {
    return res.status(400).json({ error: 'tournamentId and winners array required' });
  }
  const poolRow = await db.get('SELECT prize_pool FROM tournament_prize_pools WHERE tournament_id = ?', [tournamentId]);
  if (!poolRow || poolRow.prize_pool <= 0) return res.status(400).json({ error: 'No prize pool for this tournament' });
  const pool = poolRow.prize_pool;
  const splits = [0.60, 0.25, 0.15];
  const now = Date.now();
  const payouts = [];
  for (let i = 0; i < Math.min(winners.length, 3); i++) {
    const { userId, placement } = winners[i];
    const amount = parseFloat((pool * splits[i]).toFixed(2));
    await db.run('UPDATE user_portfolios SET cash_balance = cash_balance + ?, updated_at = ? WHERE user_id = ?', [amount, now, userId]);
    await _syncLeaderboard(userId);
    emitToUser(userId, 'tournament_payout', { placement: placement || (i + 1), amount, tournamentId });
    await _notify(userId, 'tournament_payout', '🏆 Tournament Payout!', `You earned $${amount.toLocaleString()} as placement #${placement || (i + 1)} in Tournament #${tournamentId}`);
    payouts.push({ userId, placement: placement || (i + 1), amount });
  }
  await db.run('UPDATE tournament_prize_pools SET prize_pool = 0 WHERE tournament_id = ?', [tournamentId]);
  res.json({ success: true, payouts, totalPaid: pool });
});

app.get("/api/tournament/my-winnings", authenticateUser, async (req, res) => {
  const portfolio = await db.get('SELECT cash_balance FROM user_portfolios WHERE user_id = ?', [req.user.userId]);
  res.json({ balance: portfolio ? portfolio.cash_balance : 0, note: 'Tournament winnings are credited directly to your paper money balance.' });
});

// ═══════════════════════════════════════════════════════════════════════════════
// LOOT BOXES
// ═══════════════════════════════════════════════════════════════════════════════
function _lootDraw(rarity) {
  const table = LOOT_DROPS[rarity] || LOOT_DROPS.common;
  const total = table.reduce((s, d) => s + d.weight, 0);
  let roll = Math.random() * total;
  for (const drop of table) { roll -= drop.weight; if (roll <= 0) return drop; }
  return table[table.length - 1];
}

async function _awardBox(userId, source) {
  await db.run('INSERT INTO mystery_boxes (user_id, rarity, source, created_at) VALUES (?, ?, ?, ?)',
    [userId, 'common', source, Date.now()]);
}

app.get('/api/boxes/my', authenticateUser, async (req, res) => {
  const boxes = await db.all('SELECT id, rarity, source, created_at FROM mystery_boxes WHERE user_id = ? AND opened_at IS NULL ORDER BY created_at DESC', [req.user.userId]);
  res.json({ boxes, count: boxes.length });
});

app.post('/api/boxes/open', authenticateUser, async (req, res) => {
  const { boxId } = req.body;
  const box = await db.get('SELECT * FROM mystery_boxes WHERE id = ? AND user_id = ? AND opened_at IS NULL', [boxId, req.user.userId]);
  if (!box) return res.status(404).json({ error: 'Box not found or already opened' });
  const drop = _lootDraw(box.rarity);
  await db.run('UPDATE mystery_boxes SET opened_at = ? WHERE id = ?', [Date.now(), boxId]);
  if (drop.type === 'paper') {
    await db.run('UPDATE user_portfolios SET cash_balance = cash_balance + ? WHERE user_id = ?', [drop.value, req.user.userId]);
    await _syncLeaderboard(req.user.userId);
  } else if (drop.type === 'credits') {
    await _addCredits(req.user.userId, drop.value, 'loot_box', 'Loot box reward');
  }
  await _notify(req.user.userId, 'loot_box', '🎁 Loot Box Opened!', `You got: ${drop.label}`);
  res.json({ success: true, drop });
});

app.post('/api/stripe/loot-box-premium', authenticateUser, async (req, res) => {
  try {
    const acc = await db.get('SELECT email FROM accounts WHERE id = ?', [req.user.userId]);
    const { checkoutUrl } = await stripeProcessor.createLootBoxCheckout(req.user.userId, acc.email);
    res.json({ checkoutUrl });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// FLASH CHALLENGES
// ═══════════════════════════════════════════════════════════════════════════════
app.get('/api/flash-challenge/current', async (req, res) => {
  const now = Date.now();
  const challenge = await db.get('SELECT * FROM flash_challenges WHERE expires_at > ? ORDER BY created_at DESC LIMIT 1', [now]);
  res.json({ challenge: challenge || null });
});

app.post('/api/flash-challenge/claim', authenticateUser, async (req, res) => {
  const { challengeId } = req.body;
  const uid = req.user.userId;
  const now = Date.now();
  const ch = await db.get('SELECT * FROM flash_challenges WHERE id = ? AND expires_at > ?', [challengeId, now]);
  if (!ch) return res.status(404).json({ error: 'Challenge expired or not found' });
  const already = await db.get('SELECT id FROM flash_challenge_completions WHERE challenge_id = ? AND user_id = ?', [challengeId, uid]);
  if (already) return res.status(400).json({ error: 'Already claimed' });
  await db.run('INSERT INTO flash_challenge_completions (challenge_id, user_id, completed_at) VALUES (?, ?, ?)', [challengeId, uid, now]);
  if (ch.reward_type === 'paper') {
    await db.run('UPDATE user_portfolios SET cash_balance = cash_balance + ? WHERE user_id = ?', [ch.reward_value, uid]);
    await _syncLeaderboard(uid);
  } else if (ch.reward_type === 'credits') {
    await _addCredits(uid, ch.reward_value, 'flash_challenge', ch.title);
  } else if (ch.reward_type === 'box') {
    await _awardBox(uid, 'flash_challenge');
  }
  await _notify(uid, 'flash_challenge', '⚡ Flash Challenge Complete!', `You earned: ${ch.reward_type === 'box' ? '1 Mystery Box' : ch.reward_value + ' ' + ch.reward_type}`);
  const rewardLabel = ch.reward_type === 'box' ? '1 Mystery Box' : `${ch.reward_value.toLocaleString()} ${ch.reward_type}`;
  res.json({ success: true, reward_type: ch.reward_type, reward_value: ch.reward_value, message: `⚡ Claimed! You earned ${rewardLabel}!` });
});

// ═══════════════════════════════════════════════════════════════════════════════
// CARDS
// ═══════════════════════════════════════════════════════════════════════════════
const PACK_RARITY_WEIGHTS = {
  common:    { common:60, uncommon:30, rare:8, epic:2, legendary:0 },
  rare:      { common:10, uncommon:30, rare:40, epic:17, legendary:3 },
  legendary: { common:0,  uncommon:5,  rare:20, epic:40, legendary:35 },
};

async function _drawCard(packType) {
  const weights = PACK_RARITY_WEIGHTS[packType] || PACK_RARITY_WEIGHTS.common;
  const total = Object.values(weights).reduce((s, w) => s + w, 0);
  let roll = Math.random() * total;
  let rarity = 'common';
  for (const [r, w] of Object.entries(weights)) { roll -= w; if (roll <= 0) { rarity = r; break; } }
  const cards = await db.all('SELECT * FROM card_definitions WHERE rarity = ?', [rarity]);
  if (!cards.length) {
    const fallback = await db.all('SELECT * FROM card_definitions WHERE rarity = ?', ['common']);
    return fallback[Math.floor(Math.random() * fallback.length)];
  }
  return cards[Math.floor(Math.random() * cards.length)];
}

app.get('/api/cards/catalog', async (req, res) => {
  const cards = await db.all('SELECT * FROM card_definitions ORDER BY rarity, name');
  res.json({ cards });
});

app.get('/api/cards/collection', authenticateUser, async (req, res) => {
  const uid = req.user.userId;
  const owned = await db.all(
    `SELECT pc.id, pc.card_key, pc.level, pc.acquired_at, cd.name, cd.rarity, cd.icon, cd.attack, cd.defense, cd.hustle, cd.luck, cd.archetype
     FROM player_cards pc JOIN card_definitions cd ON cd.card_key = pc.card_key
     WHERE pc.user_id = ? ORDER BY cd.rarity DESC, cd.name`, [uid]);
  res.json({ cards: owned });
});

app.post('/api/cards/pack/open', authenticateUser, async (req, res) => {
  const { packType } = req.body; // 'common' | 'rare' | 'legendary'
  const uid = req.user.userId;
  const COSTS = { common: 100, rare: 300, legendary: 1000 };
  const cost = COSTS[packType];
  if (!cost) return res.status(400).json({ error: 'Invalid pack type' });
  const cred = await db.get('SELECT credits FROM sml_credits WHERE user_id = ?', [uid]);
  if (!cred || cred.credits < cost) return res.status(400).json({ error: 'Not enough SML Credits' });
  await db.run('UPDATE sml_credits SET credits = credits - ? WHERE user_id = ?', [cost, uid]);
  const drawn = [];
  for (let i = 0; i < 5; i++) {
    const card = await _drawCard(packType);
    await db.run('INSERT INTO player_cards (user_id, card_key, level, acquired_at) VALUES (?, ?, 1, ?)', [uid, card.card_key, Date.now()]);
    drawn.push(card);
  }
  res.json({ success: true, cards: drawn, creditsSpent: cost });
});

app.post('/api/stripe/card-pack', authenticateUser, async (req, res) => {
  const { packType } = req.body;
  if (!['rare', 'legendary'].includes(packType)) return res.status(400).json({ error: 'Invalid pack type' });
  try {
    const acc = await db.get('SELECT email FROM accounts WHERE id = ?', [req.user.userId]);
    const { checkoutUrl } = await stripeProcessor.createCardPackCheckout(req.user.userId, acc.email, packType);
    res.json({ checkoutUrl });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/cards/market', async (req, res) => {
  const listings = await db.all(
    `SELECT cml.id, cml.seller_id, cml.card_key, cml.price_credits, cml.listed_at,
            cd.name, cd.rarity, cd.icon, cd.attack, cd.defense, cd.hustle, cd.luck,
            a.full_name AS seller_name
     FROM card_market_listings cml
     JOIN card_definitions cd ON cd.card_key = cml.card_key
     JOIN accounts a ON a.id = cml.seller_id
     WHERE cml.sold_at IS NULL ORDER BY cml.listed_at DESC LIMIT 50`);
  res.json({ listings });
});

app.post('/api/cards/market/list', authenticateUser, async (req, res) => {
  const { playerCardId, priceCredits } = req.body;
  const uid = req.user.userId;
  const card = await db.get('SELECT * FROM player_cards WHERE id = ? AND user_id = ?', [playerCardId, uid]);
  if (!card) return res.status(404).json({ error: 'Card not found' });
  await db.run('INSERT INTO card_market_listings (seller_id, player_card_id, card_key, price_credits, listed_at) VALUES (?, ?, ?, ?, ?)',
    [uid, playerCardId, card.card_key, priceCredits, Date.now()]);
  res.json({ success: true });
});

app.post('/api/cards/market/buy/:listingId', authenticateUser, async (req, res) => {
  const uid = req.user.userId;
  const listing = await db.get('SELECT * FROM card_market_listings WHERE id = ? AND sold_at IS NULL', [req.params.listingId]);
  if (!listing) return res.status(404).json({ error: 'Listing not found or already sold' });
  if (listing.seller_id === uid) return res.status(400).json({ error: 'Cannot buy your own listing' });
  const cred = await db.get('SELECT credits FROM sml_credits WHERE user_id = ?', [uid]);
  if (!cred || cred.credits < listing.price_credits) return res.status(400).json({ error: 'Not enough credits' });
  await db.run('UPDATE sml_credits SET credits = credits - ? WHERE user_id = ?', [listing.price_credits, uid]);
  await _addCredits(listing.seller_id, listing.price_credits, 'card_sale', `Card sold: ${listing.card_key}`);
  await db.run('UPDATE player_cards SET user_id = ? WHERE id = ?', [uid, listing.player_card_id]);
  await db.run('UPDATE card_market_listings SET sold_at = ? WHERE id = ?', [Date.now(), listing.id]);
  await _notify(listing.seller_id, 'card_sold', '💳 Card Sold!', `Your card sold for ${listing.price_credits} credits`);
  res.json({ success: true });
});

app.post('/api/cards/duel/send', authenticateUser, async (req, res) => {
  const { opponentId, wagerPaper } = req.body;
  const uid = req.user.userId;
  const portfolio = await db.get('SELECT cash_balance FROM user_portfolios WHERE user_id = ?', [uid]);
  if (!portfolio || portfolio.cash_balance < (wagerPaper || 0)) return res.status(400).json({ error: 'Insufficient funds for wager' });
  await db.run('INSERT INTO card_duels (challenger_id, opponent_id, wager_paper, status, created_at) VALUES (?, ?, ?, ?, ?)',
    [uid, opponentId, wagerPaper || 0, 'pending', Date.now()]);
  await _notify(opponentId, 'card_duel_challenge', '🃏 Card Duel Challenge!', 'Someone challenged you to a card duel! Check the Cards tab to respond.');
  res.json({ success: true });
});

app.post('/api/cards/duel/resolve/:duelId', authenticateUser, async (req, res) => {
  const uid = req.user.userId;
  const duel = await db.get('SELECT * FROM card_duels WHERE id = ? AND (challenger_id = ? OR opponent_id = ?) AND status = ?',
    [req.params.duelId, uid, uid, 'pending']);
  if (!duel) return res.status(404).json({ error: 'Duel not found' });
  const cCards = await db.all('SELECT pc.*, cd.attack+cd.defense+cd.hustle+cd.luck AS power FROM player_cards pc JOIN card_definitions cd ON cd.card_key = pc.card_key WHERE pc.user_id = ? ORDER BY power DESC LIMIT 3', [duel.challenger_id]);
  const oCards = await db.all('SELECT pc.*, cd.attack+cd.defense+cd.hustle+cd.luck AS power FROM player_cards pc JOIN card_definitions cd ON cd.card_key = pc.card_key WHERE pc.user_id = ? ORDER BY power DESC LIMIT 3', [duel.opponent_id]);
  const cPower = cCards.reduce((s, c) => s + c.power, 0) + Math.floor(Math.random() * 50);
  const oPower = oCards.reduce((s, c) => s + c.power, 0) + Math.floor(Math.random() * 50);
  const winnerId = cPower >= oPower ? duel.challenger_id : duel.opponent_id;
  const loserId  = winnerId === duel.challenger_id ? duel.opponent_id : duel.challenger_id;
  if (duel.wager_paper > 0) {
    await db.run('UPDATE user_portfolios SET cash_balance = cash_balance + ? WHERE user_id = ?', [duel.wager_paper, winnerId]);
    await db.run('UPDATE user_portfolios SET cash_balance = cash_balance - ? WHERE user_id = ?', [duel.wager_paper, loserId]);
    await _syncLeaderboard(winnerId); await _syncLeaderboard(loserId);
  }
  await db.run('UPDATE card_duels SET winner_id = ?, status = ?, resolved_at = ? WHERE id = ?', [winnerId, 'resolved', Date.now(), duel.id]);
  await _notify(winnerId, 'card_duel_win', '🃏 Card Duel Win!', `You won the duel${duel.wager_paper ? ' and $'+duel.wager_paper.toLocaleString()+' paper money!' : '!'}`);
  await _notify(loserId, 'card_duel_loss', '🃏 Card Duel Lost', 'Better luck next time!');
  res.json({ success: true, winnerId, challengerPower: cPower, opponentPower: oPower });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PETS
// ═══════════════════════════════════════════════════════════════════════════════
app.get('/api/pets/catalog', (req, res) => res.json({ pets: PETS }));

app.get('/api/pets/mine', authenticateUser, async (req, res) => {
  const rows = await db.all('SELECT * FROM player_pets WHERE user_id = ? ORDER BY acquired_at DESC', [req.user.userId]);
  const pets = rows.map(r => {
    const def = PETS[r.pet_key] || {};
    return { ...r, icon: def.icon, daily_income_cached: def.daily_income || 0, guard_bonus: def.guard_bonus || 0 };
  });
  res.json({ pets });
});

app.post('/api/pets/feed/:petId', authenticateUser, async (req, res) => {
  const uid = req.user.userId;
  const pet = await db.get('SELECT * FROM player_pets WHERE id = ? AND user_id = ?', [req.params.petId, uid]);
  if (!pet) return res.status(404).json({ error: 'Pet not found' });
  const now = Date.now();
  const lastFed = pet.last_fed_at || 0;
  const hoursSince = (now - lastFed) / 3600000;
  if (hoursSince < 20) return res.status(400).json({ error: 'Pet was fed recently. Come back in a few hours!' });
  const newHappiness = Math.min(100, pet.happiness + 20);
  await db.run('UPDATE player_pets SET last_fed_at = ?, happiness = ?, xp = xp + 10 WHERE id = ?', [now, newHappiness, pet.id]);
  res.json({ success: true, happiness: newHappiness });
});

app.post('/api/pets/name/:petId', authenticateUser, async (req, res) => {
  const { name } = req.body;
  if (!name || name.length > 24) return res.status(400).json({ error: 'Name must be 1–24 chars' });
  const pet = await db.get('SELECT id FROM player_pets WHERE id = ? AND user_id = ?', [req.params.petId, req.user.userId]);
  if (!pet) return res.status(404).json({ error: 'Pet not found' });
  await db.run('UPDATE player_pets SET name = ? WHERE id = ?', [name, pet.id]);
  res.json({ success: true });
});

app.post('/api/stripe/buy-pet', authenticateUser, async (req, res) => {
  const { petKey } = req.body;
  const pet = PETS[petKey];
  if (!pet) return res.status(400).json({ error: 'Unknown pet' });
  try {
    const acc = await db.get('SELECT email FROM accounts WHERE id = ?', [req.user.userId]);
    const { checkoutUrl } = await stripeProcessor.createPetCheckout(req.user.userId, acc.email, petKey, pet.label, pet.price_cents);
    res.json({ checkoutUrl });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Collect passive pet income
app.post('/api/pets/collect', authenticateUser, async (req, res) => {
  const uid = req.user.userId;
  const pets = await db.all('SELECT * FROM player_pets WHERE user_id = ?', [uid]);
  if (!pets.length) return res.status(400).json({ error: 'No pets' });
  let total = 0;
  const now = Date.now();
  for (const pet of pets) {
    const petDef = PETS[pet.pet_key];
    if (!petDef) continue;
    const hoursOwned = Math.min((now - pet.acquired_at) / 3600000, 24);
    const happinessMult = pet.happiness / 100;
    const income = Math.floor(petDef.daily_income * hoursOwned / 24 * happinessMult * (1 + pet.level * 0.1));
    total += income;
    const newHappiness = Math.max(0, pet.happiness - 5);
    await db.run('UPDATE player_pets SET happiness = ?, xp = xp + 5 WHERE id = ?', [newHappiness, pet.id]);
  }
  if (total > 0) {
    await db.run('UPDATE user_portfolios SET cash_balance = cash_balance + ? WHERE user_id = ?', [total, uid]);
    await _syncLeaderboard(uid);
  }
  res.json({ success: true, earned: total });
});

// ═══════════════════════════════════════════════════════════════════════════════
// CARS / GARAGE
// ═══════════════════════════════════════════════════════════════════════════════
app.get('/api/cars/catalog', (req, res) => res.json({ cars: CARS }));

app.get('/api/cars/mine', authenticateUser, async (req, res) => {
  const rows = await db.all('SELECT * FROM player_cars WHERE user_id = ? ORDER BY acquired_at DESC', [req.user.userId]);
  const cars = rows.map(r => ({ ...r, ...(CARS[r.car_key] || {}) }));
  res.json({ cars });
});

app.post('/api/stripe/buy-car', authenticateUser, async (req, res) => {
  const { carKey } = req.body;
  const car = CARS[carKey];
  if (!car) return res.status(400).json({ error: 'Unknown car' });
  try {
    const acc = await db.get('SELECT email FROM accounts WHERE id = ?', [req.user.userId]);
    const { checkoutUrl } = await stripeProcessor.createCarCheckout(req.user.userId, acc.email, carKey, car.label, car.price_cents);
    res.json({ checkoutUrl });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/stripe/casino-vip', authenticateUser, async (req, res) => {
  try {
    const acc = await db.get('SELECT email FROM accounts WHERE id = ?', [req.user.userId]);
    const { checkoutUrl } = await stripeProcessor.createCasinoVIPCheckout(req.user.userId, acc.email);
    res.json({ checkoutUrl });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/races/current', async (req, res) => {
  const race = await db.get("SELECT re.*, (SELECT COUNT(*) FROM race_entries WHERE race_id = re.id) AS entrants FROM race_events re WHERE re.status = 'open' ORDER BY re.created_at DESC LIMIT 1");
  res.json({ race: race || null });
});

app.post('/api/races/enter', authenticateUser, async (req, res) => {
  const uid = req.user.userId;
  const now = Date.now();
  const race = await db.get('SELECT * FROM race_events WHERE status = ? AND ends_at > ?', ['open', now]);
  if (!race) return res.status(404).json({ error: 'No race currently open' });
  const already = await db.get('SELECT id FROM race_entries WHERE race_id = ? AND user_id = ?', [race.id, uid]);
  if (already) return res.status(400).json({ error: 'Already entered this race' });
  const portfolio = await db.get('SELECT cash_balance FROM user_portfolios WHERE user_id = ?', [uid]);
  if (!portfolio || portfolio.cash_balance < race.entry_fee) return res.status(400).json({ error: 'Not enough paper money for entry fee' });
  const myBestCar = await db.get('SELECT car_key FROM player_cars WHERE user_id = ? ORDER BY acquired_at DESC LIMIT 1', [uid]);
  const carKey = myBestCar ? myBestCar.car_key : 'beater';
  const carDef = CARS[carKey] || CARS.beater;
  const speedScore = carDef.speed + Math.floor(Math.random() * 30);
  await db.run('UPDATE user_portfolios SET cash_balance = cash_balance - ? WHERE user_id = ?', [race.entry_fee, uid]);
  await db.run('UPDATE race_events SET prize_pool = prize_pool + ? WHERE id = ?', [race.entry_fee, race.id]);
  await db.run('INSERT INTO race_entries (race_id, user_id, car_key, speed_score, entered_at) VALUES (?, ?, ?, ?, ?)', [race.id, uid, carKey, speedScore, now]);
  await _syncLeaderboard(uid);
  res.json({ success: true, carKey, speedScore });
});

// ═══════════════════════════════════════════════════════════════════════════════
// HEAT LEVEL
// ═══════════════════════════════════════════════════════════════════════════════
app.get('/api/heat/level', authenticateUser, async (req, res) => {
  const acc = await db.get('SELECT heat_level FROM accounts WHERE id = ?', [req.user.userId]);
  res.json({ heatLevel: acc ? acc.heat_level : 0 });
});

app.post('/api/heat/bribe', authenticateUser, async (req, res) => {
  const uid = req.user.userId;
  const BRIBE_COST = 500;
  const cred = await db.get('SELECT credits FROM sml_credits WHERE user_id = ?', [uid]);
  if (!cred || cred.credits < BRIBE_COST) return res.status(400).json({ error: 'Need 500 SML Credits to bribe' });
  const acc = await db.get('SELECT heat_level FROM accounts WHERE id = ?', [uid]);
  if (!acc || acc.heat_level === 0) return res.status(400).json({ error: 'You have no heat to cool down' });
  await db.run('UPDATE sml_credits SET credits = credits - ? WHERE user_id = ?', [BRIBE_COST, uid]);
  await db.run('UPDATE accounts SET heat_level = MAX(0, heat_level - 1) WHERE id = ?', [uid]);
  const updated = await db.get('SELECT heat_level FROM accounts WHERE id = ?', [uid]);
  res.json({ success: true, heatLevel: updated.heat_level });
});

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

  // Init weekly community challenge and boss heist on startup
  const _wk = _weekKey();
  await db.run('INSERT OR IGNORE INTO community_challenges (week_key, type, target, reward_paper) VALUES (?, ?, ?, ?)',
    [_wk, 'heist', COMMUNITY_CHALLENGE_TARGET, COMMUNITY_CHALLENGE_REWARD]);
  await db.run('INSERT OR IGNORE INTO boss_heist (week_key, hp_remaining, max_hp, loot_pool) VALUES (?, ?, ?, ?)',
    [_wk, BOSS_HEIST_HP, BOSS_HEIST_HP, BOSS_HEIST_LOOT]);

  // Price alert checker — every 30 seconds
  setInterval(async () => {
    try {
      const alerts = await db.all('SELECT id, user_id, symbol, target_price, direction FROM price_alerts WHERE triggered = 0');
      for (const a of alerts) {
        const cur = priceEngine.getPrice(a.symbol);
        if (!cur) continue;
        const hit = (a.direction === 'above' && cur >= a.target_price) || (a.direction === 'below' && cur <= a.target_price);
        if (hit) {
          await db.run('UPDATE price_alerts SET triggered = 1 WHERE id = ?', [a.id]);
          emitToUser(a.user_id, 'price_alert', { symbol: a.symbol, price: cur, target: a.target_price, direction: a.direction });
          await _notify(a.user_id, 'price_alert', '🔔 Price Alert!', `${a.symbol} hit $${cur.toFixed(2)} (target: $${a.target_price}, direction: ${a.direction})`);
        }
      }
    } catch (_) {}
  }, 30_000);

  // Weekly Boss Heist auto-init — ensure a boss row exists for current week
  setInterval(async () => {
    const wk = _weekKey();
    await db.run('INSERT OR IGNORE INTO boss_heist (week_key, hp_remaining, max_hp, loot_pool) VALUES (?, ?, ?, ?)',
      [wk, BOSS_HEIST_HP, BOSS_HEIST_HP, BOSS_HEIST_LOOT]);
    await db.run('INSERT OR IGNORE INTO community_challenges (week_key, type, target, reward_paper) VALUES (?, ?, ?, ?)',
      [wk, 'heist', COMMUNITY_CHALLENGE_TARGET, COMMUNITY_CHALLENGE_REWARD]);
  }, 3_600_000);

  // Flash Challenge scheduler — fires 4× daily at roughly 6-hour intervals
  const FLASH_SCHEDULE_MS = 6 * 60 * 60 * 1000;
  const _emitFlashChallenge = async () => {
    try {
      const tpl = FLASH_CHALLENGES[Math.floor(Math.random() * FLASH_CHALLENGES.length)];
      const now = Date.now();
      const durationMs = (tpl.duration_mins || 20) * 60 * 1000;
      const expiresAt = now + durationMs;
      const label = tpl.title || tpl.label || tpl.type;
      const rewardAmount = tpl.reward_value || tpl.reward_amount || 0;
      const result = await db.run(
        'INSERT INTO flash_challenges (type, title, description, reward_type, reward_value, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [tpl.type, label, tpl.description, tpl.reward_type, rewardAmount, expiresAt, now]
      );
      const challenge = await db.get('SELECT * FROM flash_challenges WHERE id = ?', [result.lastID]);
      if (challenge) {
        io.emit('flash_challenge', { challenge, expiresAt });
        console.log(`[FlashChallenge] Emitted: ${label} (expires in ${tpl.duration_mins}min)`);
      }
    } catch (e) { console.error('[FlashChallenge]', e.message); }
  };
  await _emitFlashChallenge();
  setInterval(_emitFlashChallenge, FLASH_SCHEDULE_MS);

  // Heat Level cooldown — reduce by 1 every 6 hours for players above 0
  setInterval(async () => {
    try {
      await db.run('UPDATE accounts SET heat_level = heat_level - 1 WHERE heat_level > 0');
      console.log('[HeatCooldown] Reduced heat by 1 for all hot players');
    } catch (e) { console.error('[HeatCooldown]', e.message); }
  }, 6 * 60 * 60 * 1000);

  // Race resolution — every 4 hours, close current race and pay winners
  const RACE_INTERVAL_MS = 4 * 60 * 60 * 1000;
  const _resolveRace = async () => {
    try {
      const race = await db.get("SELECT * FROM race_events WHERE status = 'open' ORDER BY created_at ASC LIMIT 1");
      if (!race) {
        // Create a new race
        const now = Date.now();
        await db.run("INSERT INTO race_events (status, prize_pool, starts_at, ends_at, created_at) VALUES ('open', 0, ?, ?, ?)", [now, now + RACE_INTERVAL_MS, now]);
        console.log('[Race] New race opened');
        return;
      }
      const entries = await db.all('SELECT * FROM race_entries WHERE race_id = ? ORDER BY speed_score DESC', [race.id]);
      if (entries.length < 2) { return; } // wait for more entrants
      await db.run("UPDATE race_events SET status = 'closed', closed_at = ? WHERE id = ?", [Date.now(), race.id]);
      const prizePool = race.prize_pool;
      const payouts = [0.5, 0.3, 0.2];
      for (let i = 0; i < Math.min(3, entries.length); i++) {
        const winner = entries[i];
        const winAmount = Math.floor(prizePool * payouts[i]);
        if (winAmount > 0) {
          const now = Date.now();
          await db.run('UPDATE user_portfolios SET cash_balance = cash_balance + ?, updated_at = ? WHERE user_id = ?', [winAmount, now, winner.user_id]);
          await _syncLeaderboard(winner.user_id);
          emitToUser(winner.user_id, 'race_result', { place: i + 1, prize: winAmount, totalEntrants: entries.length });
          await _notify(winner.user_id, 'race_win', `🏁 Race Result: #${i + 1} Place!`, `You won $${winAmount.toLocaleString()} from the race prize pool!`);
        }
      }
      // Open the next race
      const _nextNow = Date.now();
      await db.run("INSERT INTO race_events (status, prize_pool, starts_at, ends_at, created_at) VALUES ('open', 0, ?, ?, ?)", [_nextNow, _nextNow + RACE_INTERVAL_MS, _nextNow]);
      console.log(`[Race] Resolved race ${race.id} — paid ${Math.min(3, entries.length)} winners from $${prizePool} pool`);
    } catch (e) { console.error('[Race]', e.message); }
  };
  await _resolveRace();
  setInterval(_resolveRace, RACE_INTERVAL_MS);

  // Market News Events — fire every 2–4 hours randomly
  const _fireMarketNews = async () => {
    try {
      const symbol = MARKET_SYMBOLS[Math.floor(Math.random() * MARKET_SYMBOLS.length)];
      const isUp   = Math.random() > 0.45; // slight positive bias
      const pool   = isUp ? MARKET_NEWS_UP : MARKET_NEWS_DOWN;
      const tpl    = pool[Math.floor(Math.random() * pool.length)];
      const headline = tpl.headline.replace('{{sym}}', symbol);
      const pct      = tpl.pct;
      const now      = Date.now();
      await db.run('INSERT INTO market_news_events (symbol, headline, pct_change, direction, warning_at, created_at) VALUES (?,?,?,?,?,?)',
        [symbol, headline, pct, isUp ? 'up' : 'down', now, now]);
      // 5-minute warning to all users
      io.emit('market_news_warning', { symbol, headline, pct_change: pct, direction: isUp ? 'up' : 'down', appliesIn: 300 });
      console.log(`[MarketNews] Warning: ${symbol} ${isUp ? '+' : ''}${(pct*100).toFixed(0)}% in 5min`);
      // Apply the price change after 5 minutes
      setTimeout(async () => {
        try {
          const cur = priceEngine.getPrice(symbol);
          if (cur) {
            const newPrice = parseFloat((cur * (1 + pct)).toFixed(4));
            priceEngine.updatePrice(symbol, newPrice);
            io.emit('market_news_applied', { symbol, headline, pct_change: pct, newPrice });
            await db.run('UPDATE market_news_events SET applied_at = ? WHERE symbol = ? AND applied_at IS NULL ORDER BY created_at DESC LIMIT 1',
              [Date.now(), symbol]);
            // Revert after 15 minutes
            setTimeout(() => { priceEngine.updatePrice(symbol, cur); }, 15 * 60 * 1000);
          }
        } catch (_) {}
      }, 5 * 60 * 1000);
    } catch (e) { console.error('[MarketNews]', e.message); }
  };
  // Random interval: 2–4 hours
  const _scheduleNextNews = () => {
    const delay = (2 + Math.random() * 2) * 60 * 60 * 1000;
    setTimeout(async () => { await _fireMarketNews(); _scheduleNextNews(); }, delay);
  };
  _scheduleNextNews();

  // Horse Race auto-resolution — check every 2 minutes
  const _resolveHorseRace = async () => {
    try {
      const race = await db.get("SELECT * FROM horse_races WHERE status IN ('betting','running') ORDER BY created_at ASC LIMIT 1");
      if (!race) return;
      const now = Date.now();
      if (race.status === 'betting' && now >= race.starts_at) {
        await db.run("UPDATE horse_races SET status='running' WHERE id=?", [race.id]);
        io.emit('horse_race_started', { raceId: race.id, horses: HORSE_NAMES });
      } else if (race.status === 'running') {
        // Resolve with weighted random based on odds (lower odds = more likely to win)
        const weights = HORSE_ODDS.map(o => 1 / o);
        const total   = weights.reduce((s, w) => s + w, 0);
        let roll = Math.random() * total;
        let winner = 0;
        for (let i = 0; i < weights.length; i++) { roll -= weights[i]; if (roll <= 0) { winner = i + 1; break; } }
        if (!winner) winner = 1;
        await db.run("UPDATE horse_races SET status='done', result_json=?, resolved_at=? WHERE id=?",
          [JSON.stringify({ winner, horseName: HORSE_NAMES[winner - 1] }), now, race.id]);
        const winBets = await db.all('SELECT * FROM horse_bets WHERE race_id=? AND horse_num=?', [race.id, winner]);
        const totalPool = (await db.get('SELECT COALESCE(SUM(bet_paper),0) as total FROM horse_bets WHERE race_id=?', [race.id])).total;
        const totalWinBets = winBets.reduce((s, b) => s + b.bet_paper, 0);
        for (const b of winBets) {
          const payout = totalWinBets > 0 ? Math.floor((b.bet_paper / totalWinBets) * totalPool * 0.9) : 0;
          if (payout > 0) {
            await db.run('UPDATE user_portfolios SET cash_balance = cash_balance + ? WHERE user_id = ?', [payout, b.user_id]);
            await db.run('UPDATE horse_bets SET payout=? WHERE id=?', [payout, b.id]);
            await _syncLeaderboard(b.user_id);
            emitToUser(b.user_id, 'horse_win', { raceid: race.id, horseName: HORSE_NAMES[winner - 1], payout });
            await _notify(b.user_id, 'horse_win', `🏇 ${HORSE_NAMES[winner - 1]} Wins!`, `You won $${payout.toLocaleString()} from the horse race!`);
          }
        }
        io.emit('horse_race_result', { raceId: race.id, winner, horseName: HORSE_NAMES[winner - 1] });
        // Open next race in 2 minutes
        setTimeout(async () => {
          const starts = Date.now() + 5 * 60 * 1000;
          await db.run("INSERT INTO horse_races (status, starts_at, created_at) VALUES ('betting',?,?)", [starts, Date.now()]);
          io.emit('horse_race_new', { startsIn: 300 });
        }, 2 * 60 * 1000);
      }
    } catch (e) { console.error('[HorseRace]', e.message); }
  };
  setInterval(_resolveHorseRace, 2 * 60 * 1000);
  await _resolveHorseRace();

  // Trade War scheduler — opens every Sunday 8pm EST (Mon 1am UTC), runs 1 hour
  const _ensureTradeWar = async () => {
    try {
      const existing = await db.get("SELECT id FROM trade_war_events WHERE status IN ('upcoming','active')");
      if (existing) return;
      // Find next Sunday 8pm EST = next Mon 1am UTC
      const now = new Date();
      const nextMon = new Date(now);
      nextMon.setUTCHours(1, 0, 0, 0);
      const dayOfWeek = nextMon.getUTCDay();
      const daysUntilMon = dayOfWeek === 1 ? (now.getUTCHours() >= 1 ? 7 : 0) : (8 - dayOfWeek) % 7 || 7;
      nextMon.setUTCDate(nextMon.getUTCDate() + daysUntilMon);
      const startsAt = nextMon.getTime();
      const endsAt   = startsAt + TRADE_WAR_DURATION_MS;
      await db.run("INSERT INTO trade_war_events (status, starts_at, ends_at, entry_credits, created_at) VALUES ('upcoming',?,?,?,?)",
        [startsAt, endsAt, TRADE_WAR_ENTRY_CREDITS, Date.now()]);
      io.emit('trade_war_announced', { startsAt, endsAt, entryCredits: TRADE_WAR_ENTRY_CREDITS });
      console.log(`[TradeWar] Scheduled for ${new Date(startsAt).toISOString()}`);
    } catch (e) { console.error('[TradeWar]', e.message); }
  };
  const _tickTradeWar = async () => {
    try {
      const now = Date.now();
      const upcoming = await db.get("SELECT * FROM trade_war_events WHERE status = 'upcoming' AND starts_at <= ?", [now]);
      if (upcoming) {
        await db.run("UPDATE trade_war_events SET status='active' WHERE id=?", [upcoming.id]);
        io.emit('trade_war_started', { warId: upcoming.id, endsAt: upcoming.ends_at });
        console.log(`[TradeWar] War ${upcoming.id} started!`);
      }
      const active = await db.get("SELECT * FROM trade_war_events WHERE status = 'active' AND ends_at <= ?", [now]);
      if (active) {
        const entries = await db.all('SELECT * FROM trade_war_entries WHERE war_id=?', [active.id]);
        const ranked = entries.map(e => {
          const port = JSON.parse(e.portfolio_json || '{}');
          const portVal = Object.entries(port).reduce((s, [sym, qty]) => s + (priceEngine.getPrice(sym) || 0) * qty, 0);
          return { ...e, totalValue: e.cash + portVal };
        }).sort((a, b) => b.totalValue - a.totalValue);
        for (let i = 0; i < ranked.length; i++) {
          const e = ranked[i];
          await db.run('UPDATE trade_war_entries SET final_value=?, rank=? WHERE id=?', [e.totalValue, i + 1, e.id]);
          if (i < TRADE_WAR_PRIZES.length) {
            await _addCredits(e.user_id, TRADE_WAR_PRIZES[i], 'trade_war', `Trade War #${active.id} — #${i + 1} place`);
            emitToUser(e.user_id, 'trade_war_result', { rank: i + 1, prize: TRADE_WAR_PRIZES[i], totalValue: e.totalValue });
            await _notify(e.user_id, 'trade_war', `🏆 Trade War Result: #${i + 1}!`, `You placed #${i + 1} and earned ${TRADE_WAR_PRIZES[i].toLocaleString()} credits!`);
          }
        }
        await db.run("UPDATE trade_war_events SET status='ended' WHERE id=?", [active.id]);
        io.emit('trade_war_ended', { warId: active.id, winners: ranked.slice(0, 3).map(e => ({ userId: e.user_id, totalValue: e.totalValue })) });
        console.log(`[TradeWar] War ${active.id} ended — ${ranked.length} players`);
        await _ensureTradeWar();
      }
    } catch (e) { console.error('[TradeWar]', e.message); }
  };
  await _ensureTradeWar();
  setInterval(_tickTradeWar, 60 * 1000); // check every minute

  // Territory passive income — pay crew members for each controlled neighborhood every 30 min
  const _payTerritoryIncome = async () => {
    try {
      const now = Date.now();
      const INCOME_INTERVAL = 30 * 60 * 1000;
      const territories = await db.all("SELECT * FROM crew_territories WHERE crew_id IS NOT NULL");
      for (const t of territories) {
        if (now - (t.last_income_at || 0) < INCOME_INTERVAL) continue;
        const hood = NEIGHBORHOODS.find(n => n.id === t.neighborhood);
        if (!hood) continue;
        const members = await db.all('SELECT user_id FROM team_members WHERE team_id=?', [t.crew_id]);
        if (!members.length) continue;
        const share = Math.floor(hood.baseIncome / members.length);
        for (const m of members) {
          await db.run('UPDATE user_portfolios SET cash_balance = cash_balance + ? WHERE user_id=?', [share, m.user_id]);
          await _syncLeaderboard(m.user_id);
          emitToUser(m.user_id, 'territory_income', { neighborhood: hood.name, icon: hood.icon, income: share });
        }
        await db.run('UPDATE crew_territories SET last_income_at=? WHERE neighborhood=?', [now, t.neighborhood]);
      }
    } catch (e) { console.error('[Territory]', e.message); }
  };
  setInterval(_payTerritoryIncome, 10 * 60 * 1000); // check every 10 min

  // Limit Order checker — every 30 seconds
  setInterval(async () => {
    try {
      const orders = await db.all('SELECT id, user_id, symbol, order_type, quantity, limit_price FROM limit_orders WHERE status = ?', ['pending']);
      for (const o of orders) {
        const cur = priceEngine.getPrice(o.symbol);
        if (!cur) continue;
        const triggered = (o.order_type === 'buy' && cur <= o.limit_price) || (o.order_type === 'sell' && cur >= o.limit_price);
        if (!triggered) continue;
        const now = Date.now();
        // Execute the trade
        if (o.order_type === 'buy') {
          const cost = parseFloat((o.quantity * cur).toFixed(2));
          const port = await db.get('SELECT cash_balance FROM user_portfolios WHERE user_id = ?', [o.user_id]);
          if (!port || port.cash_balance < cost) {
            await db.run('UPDATE limit_orders SET status = ? WHERE id = ?', ['cancelled', o.id]);
            emitToUser(o.user_id, 'limit_order_cancelled', { orderId: o.id, reason: 'Insufficient funds when triggered' });
            continue;
          }
          await db.run('UPDATE user_portfolios SET cash_balance = cash_balance - ?, updated_at = ? WHERE user_id = ?', [cost, now, o.user_id]);
          await db.run('INSERT INTO holdings (user_id, symbol, quantity, avg_price) VALUES (?, ?, ?, ?) ON CONFLICT(user_id, symbol) DO UPDATE SET quantity = quantity + ?, avg_price = (avg_price * quantity + ? * ?) / (quantity + ?)',
            [o.user_id, o.symbol, o.quantity, cur, o.quantity, cur, o.quantity, o.quantity]);
          await db.run('INSERT INTO trades (user_id, symbol, type, quantity, price, source, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [o.user_id, o.symbol, 'BUY', o.quantity, cur, 'limit_order', now]);
        } else {
          const holding = await db.get('SELECT quantity FROM holdings WHERE user_id = ? AND symbol = ?', [o.user_id, o.symbol]);
          if (!holding || holding.quantity < o.quantity) {
            await db.run('UPDATE limit_orders SET status = ? WHERE id = ?', ['cancelled', o.id]);
            continue;
          }
          const proceeds = parseFloat((o.quantity * cur).toFixed(2));
          await db.run('UPDATE user_portfolios SET cash_balance = cash_balance + ?, updated_at = ? WHERE user_id = ?', [proceeds, now, o.user_id]);
          await db.run('UPDATE holdings SET quantity = quantity - ? WHERE user_id = ? AND symbol = ?', [o.quantity, o.user_id, o.symbol]);
          await db.run('INSERT INTO trades (user_id, symbol, type, quantity, price, source, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [o.user_id, o.symbol, 'SELL', o.quantity, cur, 'limit_order', now]);
        }
        await db.run('UPDATE limit_orders SET status = ?, filled_at = ? WHERE id = ?', ['filled', now, o.id]);
        await _syncLeaderboard(o.user_id);
        emitToUser(o.user_id, 'limit_order_filled', { orderId: o.id, symbol: o.symbol, order_type: o.order_type, quantity: o.quantity, fillPrice: cur });
        await _notify(o.user_id, 'limit_order_filled', '📋 Limit Order Filled!', `Your ${o.order_type} order for ${o.quantity} ${o.symbol} filled at $${cur.toFixed(2)}`);
      }
    } catch (_) {}
  }, 30_000);

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
