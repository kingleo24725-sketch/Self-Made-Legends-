'use strict';

// The agent crew.
//
// Three specialists, all backed by Claude:
//   Scout      - studies today's real-world news, gig demand, hiring and market
//                conditions for the player's area (live web search).
//   Strategist - turns the Scout's brief plus everything the crew knows about
//                the player into a full working-day to-do list.
//   Coach      - reads the end-of-day results and updates what the crew
//                remembers about the player so tomorrow's plan fits better.
//
// If ANTHROPIC_API_KEY is not set, or a call fails, every method degrades to
// the deterministic playbook so the app keeps working.

const { buildOfflinePlan, RESOURCE_LABELS, parseClock } = require('./playbook');

const MODEL = process.env.CREW_MODEL || 'claude-opus-5';
const FALLBACK_BETA = 'server-side-fallback-2026-07-01';

const CREW_RULES = `You are part of a small crew of agents that works for exactly one person: the owner of this phone. Your whole job is to help them become their own boss and earn money every day.
Hard rules, never broken:
- Only legal, ethical ways to earn. No gambling, betting, lotteries, day-trading or crypto speculation, MLM or recruiting schemes, "passive income" hype, reselling anything counterfeit, or anything that risks the person's safety or money.
- Never promise income. Give honest ranges from public data and say what they depend on.
- Only suggest work that fits what the person actually has (vehicle, laptop, skills, hours, location). Never assume they can spend money they did not mention.
- Prefer things that pay today or this week over long shots. One long-term builder per day is enough.
- Be concrete: names of apps, sites, neighborhoods, times of day, prices to charge, what to say.
- Write to the person directly, in plain, energetic, respectful language. No lecturing.`;

const PLAN_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['headline', 'focus', 'brief', 'tasks', 'disclaimer'],
  properties: {
    headline: { type: 'string', description: 'One line summary of the day: number of plays, hours, and realistic earnings range' },
    focus: { type: 'string', description: 'The single most important thing to nail today' },
    brief: { type: 'array', items: { type: 'string' }, description: '3-5 short bullets on what is happening in the world today that matters for this person making money' },
    tasks: {
      type: 'array', minItems: 3, maxItems: 8,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'icon', 'category', 'hours', 'startsAt', 'endsAt', 'estimatedEarnings', 'steps', 'why', 'sources'],
        properties: {
          title: { type: 'string' },
          icon: { type: 'string', description: 'one emoji' },
          category: { type: 'string', enum: ['gig', 'local', 'online', 'career', 'sales', 'other'] },
          hours: { type: 'number' },
          startsAt: { type: 'string', description: 'e.g. 8:00am' },
          endsAt: { type: 'string', description: 'e.g. 10:30am' },
          estimatedEarnings: { type: 'object', additionalProperties: false, required: ['low', 'high'], properties: { low: { type: 'number' }, high: { type: 'number' } } },
          steps: { type: 'array', minItems: 2, maxItems: 6, items: { type: 'string' } },
          why: { type: 'string', description: 'Why this fits this person today' },
          sources: { type: 'array', items: { type: 'string' }, description: 'URLs from the brief that back this up, may be empty' },
        },
      },
    },
    disclaimer: { type: 'string' },
  },
};

const DEBRIEF_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['summary', 'favorites', 'avoid', 'notes', 'tomorrowHint'],
  properties: {
    summary: { type: 'string', description: 'Two sentences to the person about how today went' },
    favorites: { type: 'array', items: { type: 'string' }, description: 'Task titles or play ids that worked and should come back' },
    avoid: { type: 'array', items: { type: 'string' }, description: 'Task titles or play ids that did not fit and should be dropped for a while' },
    notes: { type: 'array', items: { type: 'string' }, maxItems: 12, description: 'Durable facts the crew learned about this person' },
    tomorrowHint: { type: 'string', description: 'One line the Strategist should act on tomorrow' },
  },
};

const CHAT_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['reply', 'action', 'newTasks'],
  properties: {
    reply: { type: 'string', description: 'Short, direct answer to the person, 1-4 sentences' },
    action: { type: 'string', enum: ['none', 'replace_remaining'], description: 'replace_remaining when the rest of the day should be rebuilt' },
    newTasks: { type: 'array', maxItems: 6, items: PLAN_SCHEMA.properties.tasks.items, description: 'Only when action is replace_remaining: the new plays for the hours left, on the clock' },
  },
};

const RECEIPT_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['isPayout', 'amountDollars', 'currency', 'source', 'confidence', 'reason'],
  properties: {
    isPayout: { type: 'boolean', description: 'True only if this image shows money paid or owed TO the person (gig payout, sale, invoice paid, tip). False for purchases, balances, ads, or anything ambiguous.' },
    amountDollars: { type: 'number', description: 'The amount earned shown, 0 if none' },
    currency: { type: 'string' },
    source: { type: 'string', description: 'App or marketplace name if visible, e.g. DoorDash, Facebook Marketplace, Venmo' },
    confidence: { type: 'number', description: '0 to 1' },
    reason: { type: 'string', description: 'One line on what you saw' },
  },
};

const RECAP_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['headline', 'wins', 'change', 'nextWeekFocus'],
  properties: {
    headline: { type: 'string', description: 'One line on the week, in numbers' },
    wins: { type: 'array', items: { type: 'string' }, maxItems: 3 },
    change: { type: 'string', description: 'The one thing to change next week' },
    nextWeekFocus: { type: 'string' },
  },
};

class Crew {
  constructor(opts = {}) {
    this.apiKey = opts.apiKey !== undefined ? opts.apiKey : process.env.ANTHROPIC_API_KEY;
    this.client = null;
    if (this.apiKey) {
      const Anthropic = require('@anthropic-ai/sdk');
      this.client = new Anthropic({ apiKey: this.apiKey });
    }
    this.log = opts.log || ((...a) => console.log('[crew]', ...a));
  }

  get online() { return !!this.client; }

  async _ask(role, prompt, extra = {}) {
    const res = await this.client.beta.messages.create({
      model: MODEL,
      max_tokens: extra.max_tokens || 16000,
      betas: [FALLBACK_BETA],
      fallbacks: 'default',
      system: [{ type: 'text', text: CREW_RULES + `\n\nYou are the ${role}.`, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: prompt }],
      ...(extra.tools ? { tools: extra.tools } : {}),
      ...(extra.schema ? { output_config: { format: { type: 'json_schema', schema: extra.schema } } } : {}),
    });
    if (res.stop_reason === 'refusal') throw new Error(`${role} request refused`);
    return res.content.filter(b => b.type === 'text').map(b => b.text).join(extra.schema ? '' : '\n').trim();
  }

  // ── Scout ────────────────────────────────────────────────────────────────
  async scout(profile, dateKey) {
    if (!this.client) return null;
    const location = profile.location || 'the United States';
    const prompt = `Today is ${dateKey}. Research what matters for someone in ${location} who wants to earn money today with: ${describeResources(profile)}.
Skills: ${(profile.skills || []).join(', ') || 'none listed'}. Goal: ${profile.goals || 'earn as much as possible today, legally'}.
Search for: today's local news and weather that affect gig demand (events, storms, closures), current delivery/rideshare surge patterns, same-day and this-week hiring for shifts, what is selling well on local marketplaces right now, and any new legitimate opportunities.
Write a tight brief of 6-10 bullets with the source URL after each bullet. Facts only, no plan yet.`;
    return (await this._ask('Scout', prompt, { tools: [{ type: 'web_search_20260209', name: 'web_search', max_uses: 8 }] })) || null;
  }

  // ── Strategist ───────────────────────────────────────────────────────────
  /**
   * opts: { recentPlayIds, playStats, briefCache: {get(key,date), set(key,date,text)}, log(agent, message) }
   */
  async buildPlan(profile, dateKey, opts = {}) {
    const log = opts.log || (() => {});
    const offline = buildOfflinePlan(profile, dateKey, opts);
    if (!this.client) { log('Strategist', `Built a ${offline.tasks.length}-play day from the playbook (crew offline).`); return offline; }

    // Scout briefs are shared per city per day: a hundred players in one city
    // cost one research pass, and each still gets a personal plan.
    let brief = null;
    const cityKey = (profile.location || '').trim().toLowerCase() || 'anywhere';
    try {
      brief = opts.briefCache ? opts.briefCache.get(cityKey, dateKey) : null;
      if (brief) log('Scout', `Reused this morning's research for ${profile.location || 'your area'}.`);
      else {
        log('Scout', `Researching ${profile.location || 'your area'}: news, weather, gig demand, hiring, what is selling.`);
        brief = await this.scout(profile, dateKey);
        if (brief && opts.briefCache) opts.briefCache.set(cityKey, dateKey, brief);
        const sources = (brief || '').match(/https?:\/\/\S+/g) || [];
        log('Scout', brief ? `Brief ready with ${sources.length} sources.` : 'No live brief today.');
      }
    } catch (e) { this.log('scout failed, planning without live brief:', e.message); log('Scout', 'Live research failed; planning from proven approaches.'); }

    const memory = profile.memory || {};
    const stats = opts.playStats || {};
    const statLines = Object.entries(stats).filter(([, v]) => v.attempts >= 2).map(([k, v]) => `- ${v.title || k}: done ${Math.round(v.doneRate * 100)}% of ${v.attempts} times, earned ${v.earnRatio == null ? 'n/a' : Math.round(v.earnRatio * 100) + '% of estimate'}`);
    const goal = profile.goal || null;
    const prompt = `Today is ${dateKey}. Build the working day for this person.

ABOUT THEM
- Location: ${profile.location || 'not given'}
- Has: ${describeResources(profile)}
- Skills: ${(profile.skills || []).join(', ') || 'none listed'}
- Goal: ${profile.goals || 'earn as much as possible today, legally'}
- 30-day goal: ${goal ? `${goal.title} — $${(goal.targetCents / 100).toFixed(0)} by ${goal.byDate}, $${((goal.progressCents || 0) / 100).toFixed(0)} so far` : 'none set'}
- Available: about ${profile.targetHours || 8} hours starting around ${profile.startHour != null ? profile.startHour + ':00' : '8:00'}
- Blocked hours today (never schedule inside these): ${(profile.blockedHours || []).map(b => `${b.start}:00-${b.end}:00`).join(', ') || 'none'}
- Conditions they told us about today: ${profile.conditions || 'none'}
- Comfort with talking to strangers / physical work: ${profile.comfort || 'not given'}

WHAT THE CREW HAS LEARNED
${(memory.notes || []).map(n => '- ' + n).join('\n') || '- Nothing yet, first day'}
Track record by play (real results beat estimates):
${statLines.join('\n') || '- no history yet'}
Worked before: ${(memory.favorites || []).join(', ') || 'unknown'}
Did not fit: ${(memory.avoid || []).join(', ') || 'unknown'}
Yesterday's hint: ${memory.tomorrowHint || 'none'}
Plays used in the last 3 days (rotate, do not repeat unless they were favorites): ${(opts.recentPlayIds || []).join(', ') || 'none'}

SCOUT BRIEF
${brief || '(no live brief available today; rely on proven approaches)'}

Produce a to-do list that fills about ${profile.targetHours || 8} hours, ordered on the clock, with the highest-paying realistic play first when demand supports it. Include exactly one "builder" play that moves the 30-day goal or their skills forward if they have one. Include honest earnings ranges per task. Every task must be doable today with only what they have.`;

    try {
      const text = await this._ask('Strategist', prompt, { schema: PLAN_SCHEMA });
      const plan = normalizePlan(JSON.parse(text), dateKey, 'crew');
      log('Strategist', `Built ${plan.tasks.length} plays across ${plan.tasks.reduce((s, t) => s + t.hours, 0).toFixed(1)} hours. Realistic range $${plan.estimatedEarnings.low}-$${plan.estimatedEarnings.high}.`);
      return plan;
    } catch (e) {
      this.log('strategist failed, using playbook:', e.message);
      log('Strategist', 'Could not finish a custom plan; built today from the playbook instead.');
      if (brief) offline.brief = brief.split('\n').filter(Boolean).slice(0, 6);
      return offline;
    }
  }

  // ── Chat: mid-day replans ────────────────────────────────────────────────
  /**
   * Returns { reply, action, newTasks }. Offline: a simple heuristic replan.
   */
  async chat(profile, plan, history, message, remainingHours) {
    const pending = plan.tasks.filter(t => t.status === 'pending');
    const done = plan.tasks.filter(t => t.status !== 'pending');
    if (!this.client) {
      const wantsReplan = /(fell through|cancel|rain|storm|can't|cannot|sick|no car|broke down|not happening|different|swap|replace|instead)/i.test(message);
      if (wantsReplan && remainingHours >= 1) {
        const { replanRemaining, layoutOnClock } = require('./playbook');
        const fresh = replanRemaining(profile, remainingHours, plan.tasks.map(t => t.playId).filter(Boolean));
        return { reply: fresh.length ? `Got it. I swapped the rest of your day for ${fresh.length} fresh play${fresh.length === 1 ? '' : 's'} that fit the ${remainingHours.toFixed(1)} hours you have left.` : 'Not enough hours left to add anything new. Close out what you can and log it.',
          action: fresh.length ? 'replace_remaining' : 'none', newTasks: fresh.map(t => ({ ...t, startsAt: '', endsAt: '' })) };
      }
      return { reply: pending.length ? `Next up: ${pending[0].icon} ${pending[0].title} (${pending[0].startsAt}). ${pending[0].steps[0]}.` : 'Everything is checked off. Log your earnings and close the day when you are ready.', action: 'none', newTasks: [] };
    }
    const prompt = `The person is talking to you mid-day. Answer them and decide whether the rest of the day needs rebuilding.

TODAY'S PLAN: ${plan.headline}
Done or skipped: ${done.map(t => `[${t.status}] ${t.title}${t.earningsCents ? ' ($' + (t.earningsCents / 100).toFixed(2) + ')' : ''}`).join('; ') || 'nothing yet'}
Still pending: ${pending.map(t => `${t.startsAt}-${t.endsAt} ${t.title}`).join('; ') || 'nothing'}
Hours left in their day: ${remainingHours.toFixed(1)}
About them: ${describeResources(profile)}; ${profile.location || 'location unknown'}; blocked ${(profile.blockedHours || []).map(b => `${b.start}-${b.end}`).join(', ') || 'none'}

CONVERSATION
${history.map(m => `${m.role === 'user' ? 'Them' : 'Crew'}: ${m.content}`).join('\n')}
Them: ${message}

If they say a play fell through, conditions changed, or they ask for something different, set action to replace_remaining and give new plays for ONLY the hours left, on the clock from now. Otherwise action none. Keep the reply short.`;
    try {
      const text = await this._ask('Strategist', prompt, { schema: CHAT_SCHEMA, max_tokens: 8000 });
      const out = JSON.parse(text);
      const norm = normalizePlan({ tasks: out.newTasks || [] }, plan.date, 'crew');
      return { reply: String(out.reply || ''), action: out.action === 'replace_remaining' && norm.tasks.length ? 'replace_remaining' : 'none', newTasks: norm.tasks };
    } catch (e) {
      this.log('chat failed:', e.message);
      return { reply: 'I could not reach the crew just now. Keep going with the plan and try again in a minute.', action: 'none', newTasks: [] };
    }
  }

  // ── Receipts: verify earnings from a screenshot ──────────────────────────
  async readReceipt(imageBase64, mediaType, task) {
    if (!this.client) return { verified: false, reason: 'Verification needs the crew online' };
    const res = await this.client.beta.messages.create({
      model: MODEL,
      max_tokens: 2000,
      betas: [FALLBACK_BETA],
      fallbacks: 'default',
      system: [{ type: 'text', text: CREW_RULES + '\n\nYou are the Auditor. You read payout screenshots and receipts honestly. Never invent an amount.', cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: [
        { type: 'image', source: { type: 'base64', media_type: mediaType, data: imageBase64 } },
        { type: 'text', text: `The person says this is proof of what they earned from: "${task.title}". Read the image and report what it actually shows.` },
      ] }],
      output_config: { format: { type: 'json_schema', schema: RECEIPT_SCHEMA } },
    });
    if (res.stop_reason === 'refusal') return { verified: false, reason: 'Could not read that image' };
    const out = JSON.parse(res.content.filter(b => b.type === 'text').map(b => b.text).join(''));
    const ok = out.isPayout && out.amountDollars > 0 && out.confidence >= 0.6;
    return { verified: ok, amountDollars: ok ? out.amountDollars : 0, source: out.source || '', confidence: out.confidence, reason: out.reason || '' };
  }

  // ── Weekly recap ─────────────────────────────────────────────────────────
  async recap(profile, week) {
    const dollars = (week.earnedCents / 100).toFixed(0);
    const fallback = {
      headline: `${week.daysActive} active days, ${week.playsDone} plays done, $${dollars} logged.`,
      wins: [week.bestPlay ? `Best play: ${week.bestPlay.title} ($${(week.bestPlay.earningsCents / 100).toFixed(0)})` : 'You showed up.', week.bestRank ? `Best world rank: #${week.bestRank}` : 'You are on the board.'].slice(0, 2),
      change: week.skippedMost ? `You skipped "${week.skippedMost}" ${week.skippedMostCount} times. Swap it or tell the crew why.` : 'Log earnings on every play so the crew can learn faster.',
      nextWeekFocus: week.bestPlay ? `Lead with ${week.bestPlay.title} and stack a second high-earner behind it.` : 'Finish every play on at least three days.',
    };
    if (!this.client) return fallback;
    const prompt = `Write this person's weekly recap.

WEEK ENDING ${week.weekEnd}
Active days: ${week.daysActive}/7, plays done: ${week.playsDone}/${week.playsTotal}, hours: ${week.hours}, logged: $${dollars} (verified $${(week.verifiedCents / 100).toFixed(0)})
Best world rank: ${week.bestRank || 'none'}; average rank first half vs second half: ${week.rankTrend || 'n/a'}
Best play: ${week.bestPlay ? `${week.bestPlay.title} $${(week.bestPlay.earningsCents / 100).toFixed(0)}` : 'none'}
Most skipped: ${week.skippedMost ? `${week.skippedMost} (${week.skippedMostCount}x)` : 'none'}
Days: ${week.days.map(d => `${d.date}: ${d.tasksDone}/${d.tasksTotal}, $${(d.earningsCents / 100).toFixed(0)}, rank ${d.rank || '-'}`).join('; ')}
Crew notes: ${((profile.memory || {}).notes || []).join('; ') || 'none'}

Be specific and warm. One thing to change, not five.`;
    try { return JSON.parse(await this._ask('Coach', prompt, { schema: RECAP_SCHEMA, max_tokens: 4000 })); }
    catch (e) { this.log('recap failed:', e.message); return fallback; }
  }

  // ── Coach ────────────────────────────────────────────────────────────────
  async debrief(profile, plan, results) {
    const done = results.tasks.filter(t => t.status === 'done');
    const skipped = results.tasks.filter(t => t.status === 'skipped');
    const dollars = (results.earningsCents / 100).toFixed(2);
    const fallback = {
      summary: done.length
        ? `You finished ${done.length} of ${results.tasks.length} plays and logged $${dollars}. Keep stacking days.`
        : 'No plays were finished today. Tomorrow starts fresh with a lighter plan.',
      favorites: done.filter(t => t.earningsCents > 0).map(t => t.playId || t.title),
      avoid: skipped.map(t => t.playId || t.title),
      notes: [],
      tomorrowHint: done.length ? 'Lead with what earned the most today.' : 'Start with the easiest, shortest play to build momentum.',
    };
    if (!this.client) return fallback;

    const prompt = `Read how today went for this person and update what the crew remembers.

PLAN: ${plan.headline}
RESULTS
${results.tasks.map(t => `- [${t.status}] ${t.title} — logged $${(t.earningsCents / 100).toFixed(2)}${t.note ? ' — note: ' + t.note : ''}`).join('\n')}
Total logged: $${dollars} across ${results.hoursWorked} hours.

EXISTING NOTES
${((profile.memory || {}).notes || []).map(n => '- ' + n).join('\n') || '- none'}

Return updated memory. Keep notes durable and specific (what they are good at, what they hate, best hours, what pays for them). Merge, do not just append.`;

    try {
      const text = await this._ask('Coach', prompt, { schema: DEBRIEF_SCHEMA, max_tokens: 8000 });
      return JSON.parse(text);
    } catch (e) {
      this.log('coach failed, using simple debrief:', e.message);
      return fallback;
    }
  }
}

function describeResources(profile) {
  const r = profile.resources || [];
  if (!r.length) return 'just their time and a phone';
  return r.map(k => RESOURCE_LABELS[k] || k).join(', ');
}

// Bring a model-authored plan into the same shape the playbook produces.
function normalizePlan(plan, dateKey, generatedBy) {
  const tasks = (plan.tasks || []).map((t, i) => ({
    order: i + 1,
    playId: null,
    title: String(t.title || `Play ${i + 1}`).slice(0, 120),
    icon: String(t.icon || '✅').slice(0, 4),
    category: t.category || 'other',
    hours: Math.max(0.25, Number(t.hours) || 1),
    startsAt: String(t.startsAt || ''),
    endsAt: String(t.endsAt || ''),
    startsMin: parseClock(t.startsAt),
    endsMin: parseClock(t.endsAt),
    estimatedEarnings: {
      low: Math.max(0, Number((t.estimatedEarnings || {}).low) || 0),
      high: Math.max(0, Number((t.estimatedEarnings || {}).high) || 0),
    },
    steps: Array.isArray(t.steps) ? t.steps.map(String) : [],
    why: String(t.why || ''),
    sources: Array.isArray(t.sources) ? t.sources.filter(s => /^https?:\/\//.test(s)) : [],
  }));
  const low = tasks.reduce((s, t) => s + t.estimatedEarnings.low, 0);
  const high = tasks.reduce((s, t) => s + t.estimatedEarnings.high, 0);
  return {
    date: dateKey,
    generatedBy,
    headline: String(plan.headline || `${tasks.length} plays today`),
    focus: String(plan.focus || (tasks[0] ? tasks[0].title : '')),
    brief: Array.isArray(plan.brief) ? plan.brief.map(String) : [],
    tasks,
    estimatedEarnings: { low, high },
    disclaimer: String(plan.disclaimer || 'Earnings ranges are estimates, not guarantees.'),
  };
}

module.exports = Crew;
module.exports.normalizePlan = normalizePlan;
module.exports.PLAN_SCHEMA = PLAN_SCHEMA;
module.exports.CHAT_SCHEMA = CHAT_SCHEMA;
module.exports.RECEIPT_SCHEMA = RECEIPT_SCHEMA;
module.exports.RECAP_SCHEMA = RECAP_SCHEMA;
