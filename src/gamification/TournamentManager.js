// SML Tournament Manager
// Runs a 16-player single-elimination bracket for male and female divisions.
// After both division champions are crowned, they face off in the Grand Championship.

'use strict';

const db = require('../database/db');

class TournamentManager {
  constructor() {
    this.activeTournament = null;
    this.history = [];
  }

  async restore() {
    const rows = await db.all('SELECT * FROM tournament_state');
    for (const row of rows) {
      try {
        if (row.key === 'active')   this.activeTournament = JSON.parse(row.value);
        if (row.key === 'history')  this.history = JSON.parse(row.value);
      } catch (_) {}
    }
    console.log(`✅ TournamentManager: restored (active=${!!this.activeTournament}, history=${this.history.length})`);
  }

  _persist() {
    const upsert = (key, value) =>
      db.run(
        `INSERT INTO tournament_state (key, value) VALUES (?, ?)
         ON CONFLICT(key) DO UPDATE SET value=excluded.value`,
        [key, JSON.stringify(value)]
      ).catch(e => console.error('TournamentManager persist error:', e.message));
    if (this.activeTournament) upsert('active', this.activeTournament);
    upsert('history', this.history);
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  // Create a tournament. maleSeeds/femaleSeeds are arrays of player objects
  // ({userId, email, score, gainPercentage}) ranked 1–16 from the leaderboard.
  createTournament(seasonId, seasonName, maleSeeds, femaleSeeds) {
    if (this.activeTournament) this.history.push(this.activeTournament);

    const tournament = {
      id: String(seasonId),
      seasonId: String(seasonId),
      seasonName: seasonName || 'Season Tournament',
      createdAt: new Date().toISOString(),
      status: 'active',          // 'active' | 'championship' | 'complete'
      maleBracket:   this._buildBracket('male',   maleSeeds),
      femaleBracket: this._buildBracket('female', femaleSeeds),
      championship:  null,       // populated when both division champions are set
      grandChampion: null,
    };

    this.activeTournament = tournament;
    this._persist();
    return tournament;
  }

  // Admin sets the winner of a bracket match.
  // gender: 'male'|'female'   roundIndex: 0-3   matchIndex: 0-7
  setMatchWinner(gender, roundIndex, matchIndex, winnerUserId) {
    if (!this.activeTournament) return { success: false, error: 'No active tournament' };
    const bracket = gender === 'male'
      ? this.activeTournament.maleBracket
      : this.activeTournament.femaleBracket;

    const round = bracket.rounds[roundIndex];
    if (!round) return { success: false, error: 'Invalid round index' };

    const match = round.matches[matchIndex];
    if (!match) return { success: false, error: 'Invalid match index' };
    if (match.completed) return { success: false, error: 'Match already completed' };

    const winner =
      match.player1?.userId === winnerUserId ? match.player1 :
      match.player2?.userId === winnerUserId ? match.player2 : null;
    if (!winner) return { success: false, error: 'Player not in this match' };

    match.winner    = winner;
    match.completed = true;

    this._tryAdvanceRound(bracket, roundIndex);
    this._tryOpenChampionship();

    this._persist();
    return { success: true, winner, tournament: this.activeTournament };
  }

  // Admin sets the Grand Championship winner.
  setChampionshipWinner(winnerUserId) {
    const t = this.activeTournament;
    if (!t)                 return { success: false, error: 'No active tournament' };
    if (!t.championship)    return { success: false, error: 'Championship not yet open — both brackets must finish first' };
    if (t.championship.completed) return { success: false, error: 'Championship already decided' };

    const { player1, player2 } = t.championship;
    const winner =
      player1?.userId === winnerUserId ? player1 :
      player2?.userId === winnerUserId ? player2 : null;
    if (!winner) return { success: false, error: 'Player not in championship' };

    t.championship.winner    = winner;
    t.championship.completed = true;
    t.grandChampion          = winner;
    t.status                 = 'complete';

    this._persist();
    return { success: true, winner, tournament: t };
  }

  getStatus()  { return this.activeTournament ? { active: true,  tournament: this.activeTournament } : { active: false }; }
  getHistory() { return this.history; }

  // ── Internal ───────────────────────────────────────────────────────────────

  _buildBracket(gender, seeds) {
    // Pad to 16 with null (bye)
    const p = [...seeds];
    while (p.length < 16) p.push(null);

    // Standard seeding: 1v16, 8v9, 4v13, 5v12, 2v15, 7v10, 3v14, 6v11
    const s = (n) => (p[n - 1] ? { ...p[n - 1], seed: n } : null);
    const r16 = [
      this._mkMatch(gender, 0, 0, s(1),  s(16)),
      this._mkMatch(gender, 0, 1, s(8),  s(9)),
      this._mkMatch(gender, 0, 2, s(4),  s(13)),
      this._mkMatch(gender, 0, 3, s(5),  s(12)),
      this._mkMatch(gender, 0, 4, s(2),  s(15)),
      this._mkMatch(gender, 0, 5, s(7),  s(10)),
      this._mkMatch(gender, 0, 6, s(3),  s(14)),
      this._mkMatch(gender, 0, 7, s(6),  s(11)),
    ];

    // Auto-advance byes
    r16.forEach(m => {
      if (m.player1 && !m.player2) { m.winner = m.player1; m.completed = true; }
      if (!m.player1 && m.player2) { m.winner = m.player2; m.completed = true; }
    });

    const bracket = {
      gender,
      champion: null,
      rounds: [
        { name: 'Sweet Sixteen', roundIndex: 0, matches: r16 },
        { name: 'Elite Eight',   roundIndex: 1, matches: [] },
        { name: 'Final Four',    roundIndex: 2, matches: [] },
        { name: 'Championship',  roundIndex: 3, matches: [] },
      ],
    };

    // If R16 all done (e.g. bracket has fewer than 9 players), advance immediately
    this._tryAdvanceRound(bracket, 0);
    return bracket;
  }

  _mkMatch(gender, roundIndex, matchIndex, p1, p2) {
    return {
      id: `${gender}-r${roundIndex}-m${matchIndex}`,
      player1: p1,
      player2: p2,
      winner: null,
      completed: false,
    };
  }

  // If all matches in roundIndex are complete, populate the next round
  _tryAdvanceRound(bracket, roundIndex) {
    const current = bracket.rounds[roundIndex];
    if (!current || current.matches.length === 0) return;

    const allDone = current.matches.length > 0 && current.matches.every(m => m.completed);
    if (!allDone) return;

    const nextRoundIndex = roundIndex + 1;
    const next = bracket.rounds[nextRoundIndex];
    if (!next || next.matches.length > 0) return; // already populated

    const winners = current.matches.map(m => m.winner).filter(Boolean);
    for (let i = 0; i < winners.length; i += 2) {
      const m = this._mkMatch(bracket.gender, nextRoundIndex, Math.floor(i / 2), winners[i], winners[i + 1] || null);
      if (m.player1 && !m.player2) { m.winner = m.player1; m.completed = true; }
      next.matches.push(m);
    }

    // Recurse in case the new round is also immediately complete (byes)
    this._tryAdvanceRound(bracket, nextRoundIndex);

    // Set champion when the division final is done
    const finalRound = bracket.rounds[bracket.rounds.length - 1];
    if (finalRound.matches.length > 0 && finalRound.matches[0]?.completed) {
      bracket.champion = finalRound.matches[0].winner;
    }
  }

  _tryOpenChampionship() {
    const t = this.activeTournament;
    if (!t || t.championship) return;
    if (t.maleBracket.champion && t.femaleBracket.champion) {
      t.championship = {
        player1: { ...t.maleBracket.champion,   divisionLabel: '♂ Male Champion'   },
        player2: { ...t.femaleBracket.champion, divisionLabel: '♀ Female Champion' },
        winner:    null,
        completed: false,
      };
      t.status = 'championship';
    }
  }
}

module.exports = TournamentManager;
