'use strict';
// Copyright (c) 2026 Self-Made Legends LLC. All rights reserved. Proprietary and confidential. See LICENSE.

// The Gig Finder: the bots go out and look for real, paying work for this
// person, today, on the sites where that work is posted.
//
// Online, the Scout runs live web searches and returns specific listings with
// URLs, pay, and a difficulty grade. Offline (or between refreshes) the finder
// still gives the person real, working search links on the right platforms
// for their city, skills and gear, so nobody is ever handed nothing.

const PLATFORMS = [
  { key: 'indeed', label: 'Indeed', kind: 'shift', needs: [], difficulty: 5, hours: 4, url: (p) => `https://www.indeed.com/jobs?q=${q(skillsOr(p, 'gig same day'))}&l=${q(p.location)}&fromage=1&jt=temporary`, why: 'Same-day and temp shifts posted in the last 24 hours.' },
  { key: 'instawork', label: 'Instawork', kind: 'shift', needs: [], difficulty: 5, hours: 5, url: () => 'https://www.instawork.com/shifts', why: 'Hospitality, warehouse and event shifts that pay within days.' },
  { key: 'craigslist_gigs', label: 'Craigslist gigs', kind: 'gig', needs: [], difficulty: 6, hours: 3, url: (p) => `https://www.google.com/search?q=site%3Acraigslist.org%2Fsearch%2Fggg+${q(p.city || p.location)}`, why: 'Cash gigs posted today: moving, labor, events, creative.' },
  { key: 'taskrabbit', label: 'TaskRabbit', kind: 'gig', needs: [], difficulty: 6, hours: 3, url: () => 'https://www.taskrabbit.com/become-a-tasker', why: 'Moving, assembly, cleaning and handyman tasks by the hour.' },
  { key: 'doordash', label: 'DoorDash', kind: 'delivery', needs: ['vehicle'], difficulty: 3, hours: 3, url: () => 'https://dasher.doordash.com/', why: 'Lunch and dinner peaks pay best. Log on near restaurants.' },
  { key: 'instacart', label: 'Instacart', kind: 'delivery', needs: ['vehicle'], difficulty: 4, hours: 3, url: () => 'https://shoppers.instacart.com/', why: 'Bigger batches, better tips than food delivery.' },
  { key: 'rover', label: 'Rover', kind: 'care', needs: [], difficulty: 3, hours: 2, url: () => 'https://www.rover.com/become-a-sitter/', why: 'Walks, drop-ins and overnights. Repeat clients.' },
  { key: 'care', label: 'Care.com', kind: 'care', needs: ['childcare'], difficulty: 6, hours: 4, url: (p) => `https://www.care.com/jobs?location=${q(p.location)}`, why: 'Babysitting and senior care jobs posted by families near you.' },
  { key: 'upwork', label: 'Upwork', kind: 'online', needs: ['laptop'], difficulty: 7, hours: 3, url: (p) => `https://www.upwork.com/nx/search/jobs/?q=${q(skillsOr(p, 'assistant'))}&sort=recency`, why: 'Remote work matching your skills, newest first.' },
  { key: 'fiverr', label: 'Fiverr', kind: 'online', needs: ['laptop'], difficulty: 6, hours: 2, url: (p) => `https://www.fiverr.com/search/gigs?query=${q(skillsOr(p, 'virtual assistant'))}`, why: 'See what sellers in your skill charge, then list yours.' },
  { key: 'styleseat', label: 'StyleSeat', kind: 'beauty', needs: ['beauty'], difficulty: 6, hours: 3, url: () => 'https://www.styleseat.com/pro', why: 'Book hair, nails and makeup clients with deposits.' },
  { key: 'fb_marketplace', label: 'Facebook Marketplace', kind: 'resell', needs: [], difficulty: 4, hours: 2, url: (p) => `https://www.facebook.com/marketplace/${q(p.city ? p.city.toLowerCase() : 'nearby')}/search?query=free`, why: 'Free and underpriced items to flip today.' },
  { key: 'wonolo', label: 'Wonolo', kind: 'shift', needs: [], difficulty: 5, hours: 6, url: () => 'https://www.wonolo.com/', why: 'Warehouse, delivery and event shifts, same week.' },
  { key: 'usertesting', label: 'UserTesting', kind: 'online', needs: ['laptop'], difficulty: 2, hours: 1, url: () => 'https://www.usertesting.com/get-paid-to-test', why: 'Paid tests in the gaps between bigger jobs.' },
  { key: 'snapdocs', label: 'Snapdocs', kind: 'notary', needs: ['notary', 'vehicle'], difficulty: 7, hours: 2, url: () => 'https://www.snapdocs.com/notaries', why: 'Loan signings, $75 to $200 each.' },
  { key: 'qwick', label: 'Qwick', kind: 'shift', needs: [], difficulty: 5, hours: 5, url: () => 'https://www.qwick.com/', why: 'Restaurant and event shifts, paid within days.' },
];
const q = (s) => encodeURIComponent(String(s || '').trim());
const skillsOr = (p, fallback) => ((p.skills || []).slice(0, 2).join(' ') || fallback);

class Gigs {
  constructor(db, { crew, engine, learning, now, onEvent } = {}) {
    this.db = db; this.crew = crew; this.engine = engine; this.learning = learning;
    this.now = now || (() => Date.now()); this.onEvent = onEvent || (() => {});
    this.refreshMs = 60 * 60 * 1000; // the Scout goes back out every hour for active players when online
  }

  /** Real search links for this person, always available. */
  links(profile) {
    const have = new Set(profile.resources || []);
    return PLATFORMS.filter(pl => pl.needs.every(n => have.has(n))).map(pl => ({
      title: `${pl.label}: ${pl.kind} work near ${profile.city || profile.location || 'you'}`, platform: pl.label, url: pl.url(profile), pay: '', location: profile.location || '',
      kind: pl.kind, difficulty: pl.difficulty, hours: pl.hours, why: pl.why, source: 'links',
    }));
  }

  cacheKey(profile) { return `${String(profile.location || '').toLowerCase()}|${[...(profile.resources || [])].sort().join(',')}|${(profile.skills || []).slice(0, 3).join(',').toLowerCase()}`; }

  /** Today's gigs for a person: from the live Scout when possible, else links. Refreshes hourly. */
  async find(userId, profile, dateKey, { force = false } = {}) {
    const existing = this.db.prepare('SELECT * FROM gigs WHERE user_id = ? AND date = ? ORDER BY difficulty DESC, id ASC').all(userId, dateKey);
    const newest = existing.length ? Math.max(...existing.map(g => g.created_at)) : 0;
    const fresh = existing.length && (this.now() - newest) < this.refreshMs;
    if (fresh && !force) return this._list(existing);

    let found = null;
    if (this.crew && this.crew.online) {
      const key = this.cacheKey(profile);
      const cached = this.db.prepare('SELECT data, created_at FROM gig_cache WHERE cache_key = ?').get(key);
      if (cached && (this.now() - cached.created_at) < this.refreshMs && !force) found = JSON.parse(cached.data);
      else {
        try {
          found = await this.crew.findGigs(profile, dateKey);
          this.db.prepare('INSERT OR REPLACE INTO gig_cache (cache_key, data, created_at) VALUES (?, ?, ?)').run(key, JSON.stringify(found), this.now());
        } catch (e) { console.error('[gigs]', e.message); }
      }
    }
    const list = (found && found.length ? found.map(g => ({ ...g, source: 'crew' })) : this.links(profile));
    const keep = new Set(existing.filter(g => g.status !== 'found').map(g => g.url));
    const tx = this.db.transaction(() => {
      this.db.prepare("DELETE FROM gigs WHERE user_id = ? AND date = ? AND status = 'found'").run(userId, dateKey);
      const ins = this.db.prepare('INSERT INTO gigs (user_id, date, title, platform, url, pay, location, kind, difficulty, hours, why, source, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
      for (const g of list) {
        if (keep.has(g.url)) continue;
        ins.run(userId, dateKey, String(g.title).slice(0, 140), String(g.platform || '').slice(0, 60), String(g.url).slice(0, 500), String(g.pay || '').slice(0, 60), String(g.location || '').slice(0, 100), String(g.kind || 'gig').slice(0, 30), clampD(g.difficulty), Math.max(0.5, Math.min(10, Number(g.hours) || 2)), String(g.why || '').slice(0, 300), g.source, 'found', this.now());
      }
    });
    tx();
    if (found && found.length && this.engine) this.engine.logCrew(userId, dateKey, 'Scout', `Found ${found.length} real gigs on ${[...new Set(found.map(g => g.platform).filter(Boolean))].slice(0, 4).join(', ')}.`);
    this.onEvent(userId, 'gigs', { date: dateKey, count: list.length });
    return this._list(this.db.prepare('SELECT * FROM gigs WHERE user_id = ? AND date = ? ORDER BY status ASC, difficulty DESC, id ASC').all(userId, dateKey));
  }

  _list(rows) {
    return rows.map(g => ({ id: g.id, title: g.title, platform: g.platform, url: g.url, pay: g.pay, location: g.location, kind: g.kind, difficulty: g.difficulty, hours: g.hours, why: g.why, source: g.source, status: g.status, taskId: g.task_id, points: this.engine ? this.engine.taskPoints(g.difficulty, g.hours) : 0 }));
  }

  /** Claim a gig: it becomes a play on today's plan, graded by difficulty, linked to the real posting. */
  claim(userId, gigId) {
    const g = this.db.prepare('SELECT * FROM gigs WHERE id = ? AND user_id = ?').get(gigId, userId);
    if (!g) throw new Error('Gig not found');
    if (g.status !== 'found') throw new Error('Already claimed');
    const task = this.engine.addTask(userId, g.date, { title: `${g.platform ? g.platform + ': ' : ''}${g.title}`.slice(0, 120), icon: '🎯', category: kindToCategory(g.kind), hours: g.hours, difficulty: g.difficulty, steps: [`Open the posting: ${g.url}`, 'Apply, accept, or message within 5 minutes; speed wins gigs', 'Confirm pay, time, and place in writing before you go', 'Log what you earned here and verify it with a screenshot'], why: g.why || 'Found by your bot for today.', sources: [g.url], gigUrl: g.url, estimatedEarnings: parsePay(g.pay, g.hours) });
    this.db.prepare("UPDATE gigs SET status = 'claimed', task_id = ? WHERE id = ?").run(task.taskId, gigId);
    return task;
  }
  dismiss(userId, gigId) { this.db.prepare("UPDATE gigs SET status = 'dismissed' WHERE id = ? AND user_id = ? AND status = 'found'").run(gigId, userId); }
}

function clampD(d) { return Math.max(1, Math.min(10, Math.round(Number(d) || 5))); }
function kindToCategory(kind) { return ({ delivery: 'gig', shift: 'gig', gig: 'local', care: 'care', online: 'online', beauty: 'beauty', resell: 'online', notary: 'local' })[kind] || 'other'; }
function parsePay(pay, hours) {
  const nums = (String(pay || '').match(/\d+(?:\.\d+)?/g) || []).map(Number);
  if (!nums.length) return { low: 0, high: 0 };
  const perHour = /hr|hour/i.test(pay);
  const lo = nums[0], hi = nums[1] || nums[0];
  return perHour ? { low: Math.round(lo * hours), high: Math.round(hi * hours) } : { low: Math.round(lo), high: Math.round(hi) };
}

module.exports = Gigs;
module.exports.PLATFORMS = PLATFORMS;
