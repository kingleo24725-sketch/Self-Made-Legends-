const crypto = require("crypto");
const db = require('../database/db');

class LeaderboardManager {
  constructor() {
    this.weeklyScores = []; // Current week's scores
    this.leaderboardHistory = []; // Historical leaderboards
    this.userPortfolios = new Map(); // userId -> portfolio data
    this.weeklyRewards = new Map(); // userId -> rewards earned this week
    this.allTimeStats = new Map(); // userId -> all-time stats
    this.currentWeek = this.getCurrentWeekId();
    this.lastRewardDistribution = null;
  }

  async restore() {
    const rows = await db.all('SELECT * FROM leaderboard_scores');
    for (const row of rows) {
      const entry = {
        userId: row.user_id,
        score: row.score || 0,
        gains: row.gains || 0,
        gainPercentage: row.gain_pct || 0,
        winRate: row.win_rate || 0,
        trades: row.trades || 0,
        totalValue: row.total_value || 0,
        week: this.currentWeek,
      };
      this.weeklyScores.push(entry);
      this.userPortfolios.set(row.user_id, {
        userId: row.user_id,
        totalValue: row.total_value || 0,
        initialInvestment: 1,
        gains: row.gains || 0,
        gainPercentage: row.gain_pct || 0,
        trades: row.trades || 0,
        winRate: row.win_rate || 0,
        lastUpdated: new Date(row.updated_at || Date.now()).toISOString(),
      });
    }
    console.log(`✅ LeaderboardManager: restored ${rows.length} score entries`);
  }

  _persist(userId) {
    const entry = this.weeklyScores.find(s => s.userId === userId);
    if (!entry) return;
    db.run(
      `INSERT INTO leaderboard_scores
        (user_id, gain_pct, score, gains, trades, win_rate, total_value, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         gain_pct=excluded.gain_pct, score=excluded.score,
         gains=excluded.gains, trades=excluded.trades,
         win_rate=excluded.win_rate, total_value=excluded.total_value,
         updated_at=excluded.updated_at`,
      [
        userId,
        entry.gainPercentage || 0,
        entry.score || 0,
        entry.gains || 0,
        entry.trades || 0,
        entry.winRate || 0,
        entry.totalValue || 0,
        Date.now(),
      ]
    ).catch(e => console.error('LeaderboardManager persist error:', e.message));
  }

  // Get current week ID
  getCurrentWeekId() {
    const now = new Date();
    const year = now.getFullYear();
    const week = Math.ceil((now.getDate() + new Date(year, 0, 1).getDay()) / 7);
    return `${year}-W${week}`;
  }

  // Update user's portfolio stats
  updatePortfolioStats(userId, portfolioData) {
    const {
      totalValue,
      initialInvestment,
      gains,
      gainPercentage,
      trades,
      winRate,
      activePositions,
    } = portfolioData;

    const portfolioStats = {
      userId,
      totalValue,
      initialInvestment,
      gains,
      gainPercentage,
      trades,
      winRate,
      activePositions,
      lastUpdated: new Date().toISOString(),
    };

    this.userPortfolios.set(userId, portfolioStats);

    // Calculate weekly score
    const weeklyScore = this.calculateScore(portfolioStats);

    // Find existing score or create new
    const existingIndex = this.weeklyScores.findIndex((s) => s.userId === userId);
    if (existingIndex >= 0) {
      this.weeklyScores[existingIndex].score = weeklyScore;
      this.weeklyScores[existingIndex].gains = gains;
      this.weeklyScores[existingIndex].winRate = winRate;
      this.weeklyScores[existingIndex].trades = trades;
    } else {
      this.weeklyScores.push({
        userId,
        score: weeklyScore,
        gains,
        gainPercentage,
        winRate,
        trades,
        totalValue,
        week: this.currentWeek,
      });
    }

    // Update all-time stats
    const allTimeStats = this.allTimeStats.get(userId) || {
      totalWeeks: 0,
      topRank: 999,
      totalRewards: 0,
      totalGains: 0,
      totalTrades: 0,
    };

    allTimeStats.totalTrades = (allTimeStats.totalTrades || 0) + 1;
    allTimeStats.totalGains += gains;

    this.allTimeStats.set(userId, allTimeStats);

    this._persist(userId);
    return {
      rank: this.getPlayerRank(userId),
      score: weeklyScore,
    };
  }

  // Calculate player's weekly score
  calculateScore(portfolioData) {
    const {
      gainPercentage = 0,
      winRate = 0,
      trades = 0,
      totalValue = 0,
      initialInvestment = 1,
    } = portfolioData;

    // Score formula:
    // 40% - Return percentage
    // 30% - Win rate consistency
    // 20% - Trade activity
    // 10% - Account growth

    const returnScore = Math.max(gainPercentage * 0.4, -20);
    const winRateScore = (winRate || 0) * 30;
    const tradeScore = Math.min(trades * 0.2, 20);
    const growthScore = Math.max(
      ((totalValue - initialInvestment) / (initialInvestment || 1)) * 10,
      -10
    );

    return Math.max(returnScore + winRateScore + tradeScore + growthScore, 0);
  }

  // Alias used throughout api-server.js
  getLeaderboard(limit = 10) { return this.getWeeklyLeaderboard(limit); }

  // Get current week's leaderboard (top 10)
  getWeeklyLeaderboard(limit = 10) {
    // Sort by score descending
    const sorted = [...this.weeklyScores]
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return sorted.map((entry, index) => ({
      rank: index + 1,
      userId: entry.userId,
      score: entry.score.toFixed(2),
      gains: entry.gains.toFixed(2),
      gainPercentage: entry.gainPercentage?.toFixed(2) || "0.00",
      winRate: entry.winRate?.toFixed(1) || "0.0",
      trades: entry.trades,
      totalValue: entry.totalValue?.toFixed(2) || "0.00",
      week: entry.week,
      reward: index === 0 ? "$5.00" : index < 10 ? "Ranked" : "None",
    }));
  }

  // Get player's rank
  getPlayerRank(userId) {
    const sorted = [...this.weeklyScores].sort((a, b) => b.score - a.score);
    return sorted.findIndex((s) => s.userId === userId) + 1;
  }

  // Get previous weeks' leaderboards
  getLeaderboardHistory(weeks = 4) {
    return this.leaderboardHistory.slice(-weeks);
  }

  // Archive weekly leaderboard and reset for next week (no cash prizes currently)
  distributeWeeklyRewards() {
    const leaderboard = this.getWeeklyLeaderboard(10);

    if (leaderboard.length === 0) {
      return { success: false, error: "No players on leaderboard" };
    }

    // Update all-time stats for top player (recognition only — no cash prize)
    if (leaderboard.length > 0) {
      const topPlayer = leaderboard[0];
      const allTime = this.allTimeStats.get(topPlayer.userId) || {};
      allTime.topRank = Math.min(allTime.topRank || 999, 1);
      allTime.totalWeeks = (allTime.totalWeeks || 0) + 1;
      this.allTimeStats.set(topPlayer.userId, allTime);
    }

    // Archive this week's leaderboard
    this.leaderboardHistory.push({
      week: this.currentWeek,
      leaderboard: [...leaderboard],
      timestamp: new Date().toISOString(),
    });

    this.lastRewardDistribution = new Date().toISOString();

    // Reset weekly scores for next week
    this.currentWeek = this.getCurrentWeekId();
    this.weeklyScores = [];

    return {
      success: true,
      week: this.leaderboardHistory[this.leaderboardHistory.length - 1].week,
      topPlayer: leaderboard[0] || null,
      prizesEnabled: false,
    };
  }

  // Get player's all-time statistics
  getAllTimeStats(userId) {
    const stats = this.allTimeStats.get(userId) || {
      totalWeeks: 0,
      topRank: 999,
      totalRewards: 0,
      totalGains: 0,
      totalTrades: 0,
    };

    const portfolio = this.userPortfolios.get(userId) || {};

    return {
      userId,
      totalWeeks: stats.totalWeeks,
      bestRank: stats.topRank,
      totalRewards: stats.totalRewards.toFixed(2),
      totalGains: stats.totalGains.toFixed(2),
      totalTrades: stats.totalTrades,
      currentPortfolioValue: portfolio.totalValue?.toFixed(2) || "0.00",
      currentRank: this.getPlayerRank(userId),
    };
  }

  // Get top performers this week
  getTopPerformers(limit = 10) {
    const leaderboard = this.getWeeklyLeaderboard(limit);
    return leaderboard.map((player) => ({
      rank: player.rank,
      userId: player.userId,
      score: player.score,
      gains: player.gains,
      reward: player.reward,
    }));
  }

  // Get trending players (biggest movers)
  getTrendingPlayers(limit = 5) {
    const players = Array.from(this.userPortfolios.values())
      .map((p) => ({
        userId: p.userId,
        gainPercentage: p.gainPercentage || 0,
        gains: p.gains || 0,
        trades: p.trades || 0,
      }))
      .sort((a, b) => Math.abs(b.gainPercentage) - Math.abs(a.gainPercentage))
      .slice(0, limit);

    return players;
  }

  // Check if user earned reward this week
  hasWeeklyReward(userId) {
    return this.weeklyRewards.has(userId);
  }

  // Get weekly reward amount
  getWeeklyRewardAmount(userId) {
    return this.weeklyRewards.get(userId) || 0;
  }

  // Get leaderboard stats overview
  getLeaderboardStats() {
    const leaderboard = this.getWeeklyLeaderboard(10);
    const totalPlayers = this.weeklyScores.length;
    const topPlayerGains =
      leaderboard.length > 0
        ? parseFloat(leaderboard[0].gains)
        : 0;
    const avgGains =
      totalPlayers > 0
        ? this.weeklyScores.reduce((sum, s) => sum + (s.gains || 0), 0) / totalPlayers
        : 0;
    const totalRewardsThisWeek = 5.0; // #1 prize

    return {
      week: this.currentWeek,
      totalPlayers,
      topPlayerGains: topPlayerGains.toFixed(2),
      averageGains: avgGains.toFixed(2),
      leaderboardSize: leaderboard.length,
      totalRewardsAvailable: totalRewardsThisWeek.toFixed(2),
      lastDistribution: this.lastRewardDistribution,
    };
  }

  // Get detailed player profile for leaderboard
  getPlayerProfile(userId) {
    const portfolio = this.userPortfolios.get(userId);
    const allTime = this.allTimeStats.get(userId);
    const rank = this.getPlayerRank(userId);
    const reward = this.weeklyRewards.get(userId);

    if (!portfolio) {
      return null;
    }

    return {
      userId,
      currentRank: rank,
      weekScore: this.weeklyScores.find((s) => s.userId === userId)?.score || 0,
      portfolio: {
        totalValue: portfolio.totalValue?.toFixed(2) || "0.00",
        initialInvestment: portfolio.initialInvestment?.toFixed(2) || "0.00",
        gains: portfolio.gains?.toFixed(2) || "0.00",
        gainPercentage: portfolio.gainPercentage?.toFixed(2) || "0.00",
        winRate: portfolio.winRate?.toFixed(1) || "0.0",
        trades: portfolio.trades,
      },
      allTime: {
        bestRank: allTime?.topRank || 999,
        totalRewards: allTime?.totalRewards?.toFixed(2) || "0.00",
        totalGains: allTime?.totalGains?.toFixed(2) || "0.00",
        totalTrades: allTime?.totalTrades || 0,
      },
      weeklyReward: reward || 0,
    };
  }
}

module.exports = LeaderboardManager;
