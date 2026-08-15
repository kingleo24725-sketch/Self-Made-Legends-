const BADGES = {
  // Trading milestones
  first_trade:    { id: "first_trade",    name: "First Blood",       icon: "⚡", description: "Made your first trade",                 tier: "bronze" },
  ten_trades:     { id: "ten_trades",     name: "Getting Warmed Up", icon: "🔥", description: "Completed 10 trades",                   tier: "bronze" },
  fifty_trades:   { id: "fifty_trades",   name: "Trade Machine",     icon: "🤖", description: "Completed 50 trades",                   tier: "silver" },
  winner:         { id: "winner",         name: "Winner",            icon: "✅", description: "Closed a profitable trade",             tier: "bronze" },
  big_gain:       { id: "big_gain",       name: "Big Mover",         icon: "📈", description: "Single trade returned 10%+",            tier: "silver" },

  // Trading streaks — cold → mild → hot → on fire → unstoppable
  cold_streak:    { id: "cold_streak",    name: "Cold Streak",       icon: "🧊", description: "3 losing trades in a row — shake it off", tier: "bronze" },
  mild_streak:    { id: "mild_streak",    name: "Warming Up",        icon: "🌤️", description: "3 winning trades in a row",              tier: "bronze" },
  hot_streak:     { id: "hot_streak",     name: "Hot Streak",        icon: "🌶️", description: "5 winning trades in a row",              tier: "silver" },
  on_fire:        { id: "on_fire",        name: "On Fire",           icon: "🔥", description: "10 winning trades in a row",             tier: "gold"   },
  unstoppable:    { id: "unstoppable",    name: "Unstoppable",       icon: "⚡", description: "20 winning trades in a row",             tier: "gold"   },

  // Portfolio milestones
  first_profit:   { id: "first_profit",   name: "In The Green",      icon: "💚", description: "Portfolio turned profitable",           tier: "bronze" },
  double_up:      { id: "double_up",      name: "Doubled Up",        icon: "💰", description: "Doubled your starting capital",         tier: "gold"   },
  risk_manager:   { id: "risk_manager",   name: "Risk Manager",      icon: "🛡️", description: "Ran 7 days with no stop-loss hit",      tier: "silver" },

  // Leaderboard milestones
  top_10:         { id: "top_10",         name: "Top 10",            icon: "🏅", description: "Reached the top 10 leaderboard",       tier: "silver" },
  top_3:          { id: "top_3",          name: "Podium Finish",     icon: "🥉", description: "Reached the top 3 leaderboard",        tier: "gold"   },
  number_one:     { id: "number_one",     name: "Legend",            icon: "👑", description: "Reached #1 on the leaderboard",        tier: "gold"   },

  // Crypto / token milestones
  token_creator:  { id: "token_creator",  name: "Token Creator",     icon: "🪙", description: "Created your first crypto token",      tier: "silver" },
  market_maker:   { id: "market_maker",   name: "Market Maker",      icon: "💎", description: "Your token was traded 10 times",       tier: "gold"   },

  // Login streak milestones
  login_3:        { id: "login_3",        name: "3-Day Streak",      icon: "📆", description: "Logged in 3 days in a row",            tier: "bronze" },
  login_7:        { id: "login_7",        name: "Weekly Warrior",    icon: "🗓️", description: "Logged in 7 days in a row",            tier: "silver" },
  login_30:       { id: "login_30",       name: "Monthly Grind",     icon: "🏆", description: "Logged in 30 days in a row",           tier: "gold"   },

  // Community milestones
  day_1:          { id: "day_1",          name: "Day One",           icon: "🌅", description: "Joined Self-Made Legends",             tier: "bronze" },
  week_1:         { id: "week_1",         name: "One Week Strong",   icon: "📅", description: "Member for 7 days",                   tier: "bronze" },
  month_1:        { id: "month_1",        name: "Dedicated",         icon: "🌟", description: "Member for 30 days",                  tier: "silver" },
  creator_member: { id: "creator_member", name: "Creator Member",    icon: "⭐", description: "Subscribed as a Creator Member",      tier: "gold"   },
};

const TIER_COLORS = {
  bronze: "#cd7f32",
  silver: "#aaa",
  gold:   "#ffd700",
};

class BadgeSystem {
  constructor() {
    // userId -> Set of badge IDs
    this.userBadges = new Map();
    // userId -> { joinDate, tradeCount, winStreak, etc. }
    this.userStats = new Map();
  }

  _getStats(userId) {
    if (!this.userStats.has(userId)) {
      this.userStats.set(userId, {
        joinDate: Date.now(),
        tradeCount: 0,
        winCount: 0,
        currentWinStreak: 0,
        currentLossStreak: 0,
        maxWinStreak: 0,
        bestRank: 999,
        tokenCreated: false,
        tokenTradeCount: 0,
        creatorMember: false,
        lastActiveDate: Date.now(),
        activeDays: 1,
        loginStreak: 1,
        maxLoginStreak: 1,
        lastLoginDate: new Date().toISOString().split('T')[0],
      });
    }
    return this.userStats.get(userId);
  }

  // Call on every login — tracks consecutive daily logins and awards streak badges + XP
  onLogin(userId) {
    const stats = this._getStats(userId);
    const today = new Date().toISOString().split('T')[0];
    const newBadges = [];
    let bonusXP = 0;

    if (stats.lastLoginDate !== today) {
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      if (stats.lastLoginDate === yesterday) {
        stats.loginStreak++;
        // Streak XP bonuses
        if (stats.loginStreak === 3)  bonusXP += 50;
        if (stats.loginStreak === 7)  bonusXP += 200;
        if (stats.loginStreak === 30) bonusXP += 1000;
      } else {
        stats.loginStreak = 1; // streak broken
      }
      stats.maxLoginStreak = Math.max(stats.maxLoginStreak, stats.loginStreak);
      stats.lastLoginDate = today;
    }

    if (stats.loginStreak >= 3)  { const b = this._award(userId, "login_3");  if (b) newBadges.push(b); }
    if (stats.loginStreak >= 7)  { const b = this._award(userId, "login_7");  if (b) newBadges.push(b); }
    if (stats.loginStreak >= 30) { const b = this._award(userId, "login_30"); if (b) newBadges.push(b); }

    return { newBadges, bonusXP, loginStreak: stats.loginStreak, maxLoginStreak: stats.maxLoginStreak };
  }

  // Get current streak info for a user (for display)
  getStreakInfo(userId) {
    const stats = this._getStats(userId);
    let tradeStreakType = 'neutral';
    let tradeStreakLabel = '';
    if (stats.currentWinStreak >= 20)     { tradeStreakType = 'unstoppable'; tradeStreakLabel = `⚡ ${stats.currentWinStreak}-Win Unstoppable Streak!`; }
    else if (stats.currentWinStreak >= 10) { tradeStreakType = 'on_fire';    tradeStreakLabel = `🔥 ${stats.currentWinStreak}-Win ON FIRE Streak!`; }
    else if (stats.currentWinStreak >= 5)  { tradeStreakType = 'hot';        tradeStreakLabel = `🌶️ ${stats.currentWinStreak}-Win Hot Streak!`; }
    else if (stats.currentWinStreak >= 3)  { tradeStreakType = 'mild';       tradeStreakLabel = `🌤️ ${stats.currentWinStreak}-Win Warming Up`; }
    else if (stats.currentLossStreak >= 3) { tradeStreakType = 'cold';       tradeStreakLabel = `🧊 ${stats.currentLossStreak}-Loss Cold Streak`; }

    return {
      loginStreak: stats.loginStreak,
      maxLoginStreak: stats.maxLoginStreak,
      currentWinStreak: stats.currentWinStreak,
      currentLossStreak: stats.currentLossStreak,
      maxWinStreak: stats.maxWinStreak,
      tradeStreakType,
      tradeStreakLabel,
    };
  }

  _getUserBadges(userId) {
    if (!this.userBadges.has(userId)) {
      this.userBadges.set(userId, new Set(["day_1"]));
    }
    return this.userBadges.get(userId);
  }

  // Award a badge and return it if newly earned, null if already had it
  _award(userId, badgeId) {
    const badges = this._getUserBadges(userId);
    if (badges.has(badgeId)) return null;
    badges.add(badgeId);
    return BADGES[badgeId];
  }

  // Called when a user makes a trade
  onTrade(userId, { profitable, returnPct }) {
    const stats = this._getStats(userId);
    const newBadges = [];

    stats.tradeCount++;
    if (profitable) {
      stats.winCount++;
      stats.currentWinStreak++;
      stats.currentLossStreak = 0;
    } else {
      stats.currentLossStreak++;
      stats.currentWinStreak = 0;
    }
    stats.maxWinStreak = Math.max(stats.maxWinStreak, stats.currentWinStreak);

    // Trade count milestones
    if (stats.tradeCount === 1)  { const b = this._award(userId, "first_trade");  if (b) newBadges.push(b); }
    if (stats.tradeCount >= 10)  { const b = this._award(userId, "ten_trades");   if (b) newBadges.push(b); }
    if (stats.tradeCount >= 50)  { const b = this._award(userId, "fifty_trades"); if (b) newBadges.push(b); }
    if (profitable)              { const b = this._award(userId, "winner");        if (b) newBadges.push(b); }
    if (returnPct >= 10)         { const b = this._award(userId, "big_gain");     if (b) newBadges.push(b); }

    // Trading streak badges — cold → mild → hot → on fire → unstoppable
    if (stats.currentLossStreak >= 3) { const b = this._award(userId, "cold_streak");  if (b) newBadges.push(b); }
    if (stats.currentWinStreak >= 3)  { const b = this._award(userId, "mild_streak");  if (b) newBadges.push(b); }
    if (stats.currentWinStreak >= 5)  { const b = this._award(userId, "hot_streak");   if (b) newBadges.push(b); }
    if (stats.currentWinStreak >= 10) { const b = this._award(userId, "on_fire");      if (b) newBadges.push(b); }
    if (stats.currentWinStreak >= 20) { const b = this._award(userId, "unstoppable");  if (b) newBadges.push(b); }

    // Reset cold streak badge so it can be re-earned after breaking out
    if (profitable && stats.currentLossStreak === 0) {
      this._getUserBadges(userId).delete("cold_streak");
    }

    return newBadges;
  }

  // Called when portfolio value updates
  onPortfolioUpdate(userId, { profitable, returnPct }) {
    const newBadges = [];
    if (profitable)    { const b = this._award(userId, "first_profit"); if (b) newBadges.push(b); }
    if (returnPct >= 100) { const b = this._award(userId, "double_up"); if (b) newBadges.push(b); }
    return newBadges;
  }

  // Called when leaderboard rank updates
  onRankUpdate(userId, rank) {
    const stats = this._getStats(userId);
    const newBadges = [];

    stats.bestRank = Math.min(stats.bestRank, rank);

    if (rank <= 10) { const b = this._award(userId, "top_10");    if (b) newBadges.push(b); }
    if (rank <= 3)  { const b = this._award(userId, "top_3");     if (b) newBadges.push(b); }
    if (rank === 1) { const b = this._award(userId, "number_one"); if (b) newBadges.push(b); }

    return newBadges;
  }

  // Called when user creates a token
  onTokenCreated(userId) {
    const stats = this._getStats(userId);
    stats.tokenCreated = true;
    const b = this._award(userId, "token_creator");
    return b ? [b] : [];
  }

  // Called when user's token gets traded
  onTokenTraded(userId) {
    const stats = this._getStats(userId);
    stats.tokenTradeCount++;
    const newBadges = [];
    if (stats.tokenTradeCount >= 10) { const b = this._award(userId, "market_maker"); if (b) newBadges.push(b); }
    return newBadges;
  }

  // Called daily — check for time-based badges
  onDailyCheck(userId) {
    const stats = this._getStats(userId);
    const daysSinceJoin = Math.floor((Date.now() - stats.joinDate) / 86400000);
    const newBadges = [];

    if (daysSinceJoin >= 7)  { const b = this._award(userId, "week_1");  if (b) newBadges.push(b); }
    if (daysSinceJoin >= 30) { const b = this._award(userId, "month_1"); if (b) newBadges.push(b); }

    return newBadges;
  }

  // Called when user subscribes as Creator
  onCreatorSubscription(userId) {
    const b = this._award(userId, "creator_member");
    return b ? [b] : [];
  }

  // Get all badges for a user (earned + unearned with locked state)
  getUserBadges(userId) {
    const earned = this._getUserBadges(userId);
    return Object.values(BADGES).map((badge) => ({
      ...badge,
      tierColor: TIER_COLORS[badge.tier],
      earned: earned.has(badge.id),
      earnedAt: earned.has(badge.id) ? "Earned" : null,
    }));
  }

  // Get only earned badges
  getEarnedBadges(userId) {
    const earned = this._getUserBadges(userId);
    return [...earned].map((id) => ({ ...BADGES[id], tierColor: TIER_COLORS[BADGES[id]?.tier] })).filter(Boolean);
  }

  // Count of earned badges
  getBadgeCount(userId) {
    return this._getUserBadges(userId).size;
  }

  // All available badges (for gallery)
  getAllBadges() {
    return Object.values(BADGES).map((b) => ({ ...b, tierColor: TIER_COLORS[b.tier] }));
  }
}

module.exports = BadgeSystem;
