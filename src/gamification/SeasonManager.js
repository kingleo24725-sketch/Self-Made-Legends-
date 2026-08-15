'use strict';
class SeasonManager {
  constructor() {
    this.hallOfFame = [];
    this.currentSeason = {
      id: 1,
      name: 'Season 1 — The Rise',
      startDate: new Date('2026-01-01T00:00:00Z').toISOString(),
      endDate: new Date('2026-03-31T23:59:59Z').toISOString(),
      active: true,
      prize: 'SML Champion Hoodie + Hall of Fame induction',
    };
  }

  getCurrentSeason() {
    const now = Date.now();
    const end = new Date(this.currentSeason.endDate).getTime();
    const daysLeft = Math.max(0, Math.ceil((end - now) / 86400000));
    return { ...this.currentSeason, daysLeft };
  }

  getHallOfFame() {
    return this.hallOfFame;
  }

  endSeason(winners) {
    const closed = {
      ...this.currentSeason,
      active: false,
      winners: winners || [],
      closedAt: new Date().toISOString(),
    };
    this.hallOfFame.unshift(closed);

    const nextStart = new Date(this.currentSeason.endDate);
    nextStart.setDate(nextStart.getDate() + 1);
    const nextEnd = new Date(nextStart);
    nextEnd.setMonth(nextEnd.getMonth() + 3);

    this.currentSeason = {
      id: this.currentSeason.id + 1,
      name: `Season ${this.currentSeason.id + 1}`,
      startDate: nextStart.toISOString(),
      endDate: nextEnd.toISOString(),
      active: true,
      prize: 'SML Champion Hoodie + Hall of Fame induction',
    };

    return closed;
  }

  addHallOfFameEntry(entry) {
    this.hallOfFame.unshift({ ...entry, inducedAt: new Date().toISOString() });
  }
}

module.exports = SeasonManager;
