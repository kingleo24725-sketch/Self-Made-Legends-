'use strict';

const db = require('../database/db');

class TeamManager {
  constructor() {
    this.teams = new Map();   // teamId -> team object
    this.members = new Map(); // userId -> teamId
    this._nextId = 1;
  }

  async restore() {
    const [teamRows, memberRows] = await Promise.all([
      db.all('SELECT * FROM teams'),
      db.all('SELECT * FROM team_members'),
    ]);

    for (const row of teamRows) {
      this.teams.set(row.id, {
        id: row.id,
        name: row.name,
        description: row.description || '',
        code: row.code,
        captainId: row.captain_id,
        memberIds: [],
        createdAt: row.created_at || Date.now(),
        totalGainPct: 0,
        avgGainPct: 0,
      });
      // Track highest numeric suffix for _nextId
      const n = parseInt(row.id.replace('team_', ''), 10);
      if (!isNaN(n) && n >= this._nextId) this._nextId = n + 1;
    }
    for (const row of memberRows) {
      const team = this.teams.get(row.team_id);
      if (team) team.memberIds.push(row.user_id);
      this.members.set(row.user_id, row.team_id);
    }
    console.log(`✅ TeamManager: restored ${teamRows.length} teams, ${memberRows.length} members`);
  }

  _persistTeam(team) {
    db.run(
      `INSERT INTO teams (id, name, description, code, captain_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         name=excluded.name, description=excluded.description,
         captain_id=excluded.captain_id`,
      [team.id, team.name, team.description, team.code, team.captainId, team.createdAt]
    ).catch(e => console.error('TeamManager team persist error:', e.message));
  }

  _persistMember(teamId, userId) {
    db.run(
      `INSERT OR IGNORE INTO team_members (team_id, user_id, joined_at) VALUES (?, ?, ?)`,
      [teamId, userId, Date.now()]
    ).catch(e => console.error('TeamManager member persist error:', e.message));
  }

  _deleteMember(teamId, userId) {
    db.run('DELETE FROM team_members WHERE team_id=? AND user_id=?', [teamId, userId])
      .catch(e => console.error('TeamManager delete member error:', e.message));
  }

  _deleteTeam(teamId) {
    db.run('DELETE FROM team_members WHERE team_id=?', [teamId])
      .catch(e => console.error('TeamManager delete members error:', e.message));
    db.run('DELETE FROM teams WHERE id=?', [teamId])
      .catch(e => console.error('TeamManager delete team error:', e.message));
  }

  _generateCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
  }

  _uniqueCode() {
    const used = new Set([...this.teams.values()].map(t => t.code));
    let code;
    do { code = this._generateCode(); } while (used.has(code));
    return code;
  }

  createTeam(userId, teamName, description = '') {
    if (this.members.has(userId)) {
      return { success: false, error: 'You are already in a team. Leave your current team first.' };
    }
    const name = (teamName || '').trim();
    if (!name || name.length < 2) return { success: false, error: 'Team name must be at least 2 characters.' };
    if (name.length > 40) return { success: false, error: 'Team name max 40 characters.' };

    const duplicate = [...this.teams.values()].find(t => t.name.toLowerCase() === name.toLowerCase());
    if (duplicate) return { success: false, error: 'A team with that name already exists.' };

    const teamId = `team_${this._nextId++}`;
    const team = {
      id: teamId,
      name,
      description: (description || '').slice(0, 200),
      code: this._uniqueCode(),
      captainId: userId,
      memberIds: [userId],
      createdAt: Date.now(),
      totalGainPct: 0,
      avgGainPct: 0,
    };
    this.teams.set(teamId, team);
    this.members.set(userId, teamId);
    this._persistTeam(team);
    this._persistMember(teamId, userId);
    return { success: true, team };
  }

  joinTeam(userId, code) {
    if (this.members.has(userId)) {
      return { success: false, error: 'You are already in a team. Leave your current team first.' };
    }
    const team = [...this.teams.values()].find(t => t.code === (code || '').toUpperCase().trim());
    if (!team) return { success: false, error: 'Invalid team code.' };
    if (team.memberIds.length >= 20) return { success: false, error: 'Team is full (max 20 members).' };

    team.memberIds.push(userId);
    this.members.set(userId, team.id);
    this._persistMember(team.id, userId);
    return { success: true, team };
  }

  leaveTeam(userId) {
    const teamId = this.members.get(userId);
    if (!teamId) return { success: false, error: 'You are not in a team.' };
    const team = this.teams.get(teamId);
    if (!team) return { success: false, error: 'Team not found.' };

    team.memberIds = team.memberIds.filter(id => id !== userId);
    this.members.delete(userId);
    this._deleteMember(teamId, userId);

    if (team.memberIds.length === 0) {
      this.teams.delete(teamId);
      this._deleteTeam(teamId);
      return { success: true, disbanded: true };
    }

    if (team.captainId === userId) {
      team.captainId = team.memberIds[0];
      this._persistTeam(team);
    }
    return { success: true, disbanded: false };
  }

  getTeam(teamId) {
    return this.teams.get(teamId) || null;
  }

  getTeamByCode(code) {
    return [...this.teams.values()].find(t => t.code === (code || '').toUpperCase().trim()) || null;
  }

  getUserTeam(userId) {
    const teamId = this.members.get(userId);
    return teamId ? (this.teams.get(teamId) || null) : null;
  }

  getUserTeamId(userId) {
    return this.members.get(userId) || null;
  }

  updateTeamStats(leaderboard) {
    const gainByUser = new Map();
    for (const entry of leaderboard) {
      gainByUser.set(entry.userId, entry.gainPct || 0);
    }

    for (const team of this.teams.values()) {
      let total = 0;
      let count = 0;
      for (const uid of team.memberIds) {
        if (gainByUser.has(uid)) {
          total += gainByUser.get(uid);
          count++;
        }
      }
      team.totalGainPct = total;
      team.avgGainPct = count > 0 ? total / count : 0;
    }
  }

  getTeamLeaderboard(limit = 20) {
    return [...this.teams.values()]
      .sort((a, b) => b.avgGainPct - a.avgGainPct)
      .slice(0, limit)
      .map((t, i) => ({
        rank: i + 1,
        id: t.id,
        name: t.name,
        memberCount: t.memberIds.length,
        avgGainPct: Math.round(t.avgGainPct * 100) / 100,
        totalGainPct: Math.round(t.totalGainPct * 100) / 100,
        captainId: t.captainId,
        code: t.code,
      }));
  }

  getAllTeams() {
    return [...this.teams.values()].map(t => ({
      id: t.id,
      name: t.name,
      description: t.description,
      memberCount: t.memberIds.length,
      code: t.code,
      captainId: t.captainId,
      createdAt: t.createdAt,
    }));
  }
}

module.exports = TeamManager;
