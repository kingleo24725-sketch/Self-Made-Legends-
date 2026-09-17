'use strict';
class SocialFeed {
  constructor() {
    this.events = []; // circular buffer of last 100
    this.MAX = 100;
    this.DELAY_MS = 15 * 60 * 1000; // 15 min delay before appearing in feed
  }

  addTrade(userId, displayName, { symbol, gainPct, tradeType, portfolioValue }) {
    if (!gainPct || Math.abs(gainPct) < 3) return; // only notable trades
    this.events.unshift({
      type: 'trade',
      userId,
      displayName: displayName || 'A Legend',
      symbol,
      gainPct: parseFloat(gainPct).toFixed(2),
      tradeType: tradeType || 'BUY',
      portfolioValue,
      time: Date.now(),
    });
    if (this.events.length > this.MAX) this.events.pop();
  }

  addAchievement(userId, displayName, badgeName, badgeIcon) {
    this.events.unshift({
      type: 'badge',
      userId,
      displayName: displayName || 'A Legend',
      badgeName,
      badgeIcon,
      time: Date.now(),
    });
    if (this.events.length > this.MAX) this.events.pop();
  }

  addRankChange(userId, displayName, newRank) {
    if (newRank > 10) return; // only top 10 rank changes
    this.events.unshift({
      type: 'rank',
      userId,
      displayName: displayName || 'A Legend',
      newRank,
      time: Date.now(),
    });
    if (this.events.length > this.MAX) this.events.pop();
  }

  getFeed(limit = 20) {
    const cutoff = Date.now() - this.DELAY_MS;
    return this.events
      .filter(e => e.time <= cutoff)
      .slice(0, limit)
      .map(e => ({ ...e, timeAgo: this._timeAgo(e.time) }));
  }

  _timeAgo(ts) {
    const diff = Date.now() - ts;
    const m = Math.floor(diff / 60000);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  }

  // Seed some demo events so the feed isn't empty on launch
  seedDemoEvents() {
    const demos = [
      { displayName: 'TraderKing_ATL', symbol: 'NVDA', gainPct: 8.4, gainPositive: true },
      { displayName: 'WallStreetWolf', symbol: 'AAPL', gainPct: 5.2, gainPositive: true },
      { displayName: 'LegendRising', symbol: 'TSLA', gainPct: 12.1, gainPositive: true },
      { displayName: 'ChartMaster_NYC', symbol: 'MSFT', gainPct: 6.7, gainPositive: true },
      { displayName: 'BullRunQueen', symbol: 'GOOGL', gainPct: 4.3, gainPositive: true },
    ];
    demos.forEach((d, i) => {
      this.events.push({
        type: 'trade',
        userId: `demo_${i}`,
        displayName: d.displayName,
        symbol: d.symbol,
        gainPct: d.gainPct.toFixed(2),
        tradeType: 'SELL',
        time: Date.now() - (this.DELAY_MS + (i + 1) * 600000),
      });
    });
  }
}

module.exports = SocialFeed;
