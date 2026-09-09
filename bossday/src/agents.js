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

const { buildOfflinePlan, RESOURCE_LABELS } = require('./playbook');

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
  async buildPlan(profile, dateKey, opts = {}) {
    const offline = buildOfflinePlan(profile, dateKey, opts);
    if (!this.client) return offline;

    let brief = null;
    try { brief = await this.scout(profile, dateKey); }
    catch (e) { this.log('scout failed, planning without live brief:', e.message); }

    const memory = profile.memory || {};
    const prompt = `Today is ${dateKey}. Build the working day for this person.

ABOUT THEM
- Location: ${profile.location || 'not given'}
- Has: ${describeResources(profile)}
- Skills: ${(profile.skills || []).join(', ') || 'none listed'}
- Goal: ${profile.goals || 'earn as much as possible today, legally'}
- Available: about ${profile.targetHours || 8} hours starting around ${profile.startHour != null ? profile.startHour + ':00' : '8:00'}
- Comfort with talking to strangers / physical work: ${profile.comfort || 'not given'}

WHAT THE CREW HAS LEARNED
${(memory.notes || []).map(n => '- ' + n).join('\n') || '- Nothing yet, first day'}
Worked before: ${(memory.favorites || []).join(', ') || 'unknown'}
Did not fit: ${(memory.avoid || []).join(', ') || 'unknown'}
Yesterday's hint: ${memory.tomorrowHint || 'none'}
Plays used in the last 3 days (rotate, do not repeat unless they were favorites): ${(opts.recentPlayIds || []).join(', ') || 'none'}

SCOUT BRIEF
${brief || '(no live brief available today; rely on proven approaches)'}

Produce a to-do list that fills about ${profile.targetHours || 8} hours, ordered on the clock, with the highest-paying realistic play first when demand supports it. Include honest earnings ranges per task. Every task must be doable today with only what they have.`;

    try {
      const text = await this._ask('Strategist', prompt, { schema: PLAN_SCHEMA });
      return normalizePlan(JSON.parse(text), dateKey, 'crew');
    } catch (e) {
      this.log('strategist failed, using playbook:', e.message);
      if (brief) offline.brief = brief.split('\n').filter(Boolean).slice(0, 6);
      return offline;
    }
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
