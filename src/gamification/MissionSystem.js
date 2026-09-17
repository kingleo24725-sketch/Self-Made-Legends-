'use strict';

const db = require('../database/db');

class MissionSystem {
  constructor() {
    this.userMissions = new Map(); // userId -> { date, missions }
    this.pool = [
      { id: 'make_3_trades', title: 'Active Trader', desc: 'Complete 3 trades today', target: 3, xp: 50, icon: '📈' },
      { id: 'make_5_trades', title: 'Trading Machine', desc: 'Complete 5 trades today', target: 5, xp: 100, icon: '⚡' },
      { id: 'share_rank', title: 'Show Off', desc: 'Share your leaderboard rank', target: 1, xp: 40, icon: '📤' },
      { id: 'check_leaderboard', title: 'Scout the Competition', desc: 'Check the leaderboard', target: 1, xp: 25, icon: '🏆' },
      { id: 'create_token', title: 'Token Maker', desc: 'Create or view a crypto token', target: 1, xp: 75, icon: '🪙' },
      { id: 'login_streak', title: 'Daily Legend', desc: 'Log in today', target: 1, xp: 20, icon: '👑' },
      { id: 'beat_ai', title: 'Beat the AI', desc: 'Outperform the AI bot today', target: 1, xp: 150, icon: '🤖' },
      { id: 'refer_friend', title: 'Bring a Legend', desc: 'Share your referral link', target: 1, xp: 60, icon: '🔗' },
    ];
    this.userXP = new Map(); // userId -> total XP
  }

  async restore() {
    const today = this._todayKey();
    const [xpRows, missionRows] = await Promise.all([
      db.all('SELECT * FROM user_xp'),
      db.all('SELECT * FROM mission_progress WHERE date = ?', [today]),
    ]);
    for (const row of xpRows) this.userXP.set(row.user_id, row.total_xp || 0);
    for (const row of missionRows) {
      try { this.userMissions.set(row.user_id, { date: today, missions: JSON.parse(row.data) }); } catch (_) {}
    }
    console.log(`✅ MissionSystem: restored ${xpRows.length} XP entries, ${missionRows.length} mission progress entries`);
  }

  _persistXP(userId) {
    db.run(
      `INSERT INTO user_xp (user_id, total_xp) VALUES (?, ?)
       ON CONFLICT(user_id) DO UPDATE SET total_xp=excluded.total_xp`,
      [userId, this.userXP.get(userId) || 0]
    ).catch(e => console.error('MissionSystem XP persist error:', e.message));
  }

  _persistMissions(userId) {
    const entry = this.userMissions.get(userId);
    if (!entry) return;
    db.run(
      `INSERT INTO mission_progress (user_id, date, data) VALUES (?, ?, ?)
       ON CONFLICT(user_id, date) DO UPDATE SET data=excluded.data`,
      [userId, entry.date, JSON.stringify(entry.missions)]
    ).catch(e => console.error('MissionSystem missions persist error:', e.message));
  }

  _todayKey() {
    return new Date().toISOString().split('T')[0];
  }

  getDailyMissions(userId) {
    const today = this._todayKey();
    const existing = this.userMissions.get(userId);
    if (existing && existing.date === today) return existing.missions;

    // Deterministic shuffle per user+date so missions don't change on refresh
    const seed = userId + today;
    let hash = 0;
    for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
    const shuffled = [...this.pool].sort((a, b) => {
      hash = (hash * 1664525 + 1013904223) >>> 0;
      return (hash % 2) ? 1 : -1;
    });
    const missions = shuffled.slice(0, 3).map(m => ({ ...m, progress: 0, completed: false }));
    this.userMissions.set(userId, { date: today, missions });
    return missions;
  }

  // xpMultiplier: 1.5 if user has an active Season Pass, 1 otherwise
  completeAction(userId, actionId, xpMultiplier = 1) {
    const missions = this.getDailyMissions(userId);
    let xpEarned = 0;
    missions.forEach(m => {
      if (m.id === actionId && !m.completed) {
        m.progress = Math.min(m.progress + 1, m.target);
        if (m.progress >= m.target) {
          m.completed = true;
          const awarded = Math.round(m.xp * xpMultiplier);
          xpEarned += awarded;
          const cur = this.userXP.get(userId) || 0;
          this.userXP.set(userId, cur + awarded);
          this._persistXP(userId);
        }
      }
    });
    this._persistMissions(userId);
    return { missions, xpEarned };
  }

  getUserStats(userId) {
    const missions = this.getDailyMissions(userId);
    const completed = missions.filter(m => m.completed).length;
    const totalXP = this.userXP.get(userId) || 0;
    return { missions, completed, total: missions.length, totalXP };
  }

  getLeaderboard() {
    const entries = [];
    for (const [userId, xp] of this.userXP) entries.push({ userId, xp });
    return entries.sort((a, b) => b.xp - a.xp).slice(0, 20);
  }
}

module.exports = MissionSystem;
