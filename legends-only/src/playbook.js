'use strict';

// The offline playbook.
//
// Every "play" is a legal, realistic way a regular person can earn money in a
// single day with what they already have. The agent crew (agents.js) uses
// Claude plus live web research to build a bespoke plan; this file is the
// deterministic fallback that guarantees every player still wakes up to a full
// working-day plan when the API is unavailable, and it is what the tests
// exercise.
//
// Earnings are honest ranges, not promises. Nothing here involves gambling,
// MLM/recruiting schemes, speculation, or anything that could get the player in
// legal trouble. That is enforced by review of this list and by the crew's
// system prompt.

const PLAYS = [
  // ── Gig / on-demand (needs a vehicle or bike) ────────────────────────────
  { id: 'food_delivery_lunch', difficulty: 3, title: 'Lunch-rush food delivery', category: 'gig', hours: 2, icon: '🛵', window: [11, 14],
    needs: ['vehicle'], earn: [30, 70],
    steps: ['Log in to DoorDash, Uber Eats or Grubhub 15 minutes before 11:30am', 'Position yourself near a cluster of restaurants, not at home', 'Accept orders paying at least $1.50 per mile', 'Log off at 1:30pm when demand drops'],
    why: 'Lunch and dinner peaks pay 2-3x the mid-afternoon rate. You already own the car, so this is pure margin on your time.' },
  { id: 'food_delivery_dinner', difficulty: 3, title: 'Dinner-rush food delivery', category: 'gig', hours: 2.5, icon: '🍕', window: [17, 21],
    needs: ['vehicle'], earn: [40, 90],
    steps: ['Go online at 5:00pm near the busiest restaurant strip', 'Stack orders from the same restaurant when offered', 'Track mileage in a notes app for tax deductions', 'Cash out with instant pay if the app offers it'],
    why: 'Dinner is the single highest-paying window of the day for delivery.' },
  { id: 'rideshare_morning', difficulty: 4, title: 'Morning commute rideshare', category: 'gig', hours: 2.5, icon: '🚗', window: [6, 10],
    needs: ['vehicle', 'rideshare_approved'], earn: [45, 100],
    steps: ['Go online at 6:30am near residential areas', 'Stay within 10 miles of the airport or downtown', 'Decline trips longer than 30 minutes unless surge is on', 'Go offline by 9:30am'],
    why: 'Commute hours are surge hours. Short trips back-to-back beat one long one.' },
  { id: 'grocery_shopping_gig', difficulty: 4, title: 'Grocery shopping batches', category: 'gig', hours: 2, icon: '🛒',
    needs: ['vehicle'], earn: [30, 65],
    steps: ['Open Instacart or Shipt and look for batches over $20', 'Take double batches at the same store', 'Message the customer once when you start and once when you finish', 'Deliver within the promised window to protect your rating'],
    why: 'Higher tips than food delivery and no restaurant wait time.' },
  { id: 'bike_courier', difficulty: 4, title: 'Bike or scooter delivery', category: 'gig', hours: 2, icon: '🚲',
    needs: ['bike'], earn: [25, 55],
    steps: ['Set your delivery app to bike mode', 'Work a dense downtown or campus area', 'Take short-distance orders only', 'Carry an insulated bag for better ratings'],
    why: 'No fuel cost means every dollar is profit.' },

  // ── Local services (phone + willingness to work) ─────────────────────────
  { id: 'taskrabbit_moving', difficulty: 8, title: 'Moving help and furniture assembly', category: 'local', hours: 3, icon: '📦',
    needs: [], earn: [60, 150],
    steps: ['Check TaskRabbit, Craigslist gigs, and Facebook local groups for same-day moving help', 'Reply within 5 minutes with a clear rate and your availability', 'Bring gloves and a basic tool kit', 'Ask for a review at the end'],
    why: 'Same-day physical help is chronically short on supply, so hourly rates are high.' },
  { id: 'yard_work', difficulty: 7, title: 'Yard cleanup for neighbors', category: 'local', hours: 3, icon: '🌿',
    needs: [], earn: [50, 140],
    steps: ['Post in Nextdoor and 2 local Facebook groups: "Yard cleanup today, $X flat, before/after photos"', 'Knock on 5 doors with visibly overgrown yards', 'Do the job well and photograph it', 'Offer a weekly rate before you leave'],
    why: 'One good photo turns a one-off into a recurring client.' },
  { id: 'car_detailing', difficulty: 6, title: 'Mobile car cleaning', category: 'local', hours: 3, icon: '🧽',
    needs: [], earn: [60, 160],
    steps: ['Offer interior + exterior for a flat price to coworkers, family and neighbors', 'Bring your own bucket, microfiber towels and vacuum', 'Do 2-3 cars back-to-back in one parking lot', 'Take before/after photos for tomorrow\'s posts'],
    why: 'Low supplies cost and people will pay for convenience at their own driveway.' },
  { id: 'dog_walking', difficulty: 2, title: 'Dog walking and pet check-ins', category: 'local', hours: 2, icon: '🐕', window: [11, 15],
    needs: [], earn: [30, 80],
    steps: ['Create or update a Rover profile and set same-day availability', 'Post in local groups offering midday walks', 'Take 2-3 dogs from the same neighborhood', 'Send the owner a photo each walk'],
    why: 'Working owners need midday walks every single day. Reliability wins repeat business.' },
  { id: 'handyman_small', difficulty: 8, title: 'Small repair jobs', category: 'local', hours: 3, icon: '🔧',
    needs: ['handy'], earn: [80, 200],
    steps: ['List 5 things you can fix (faucets, shelves, doors, TV mounts)', 'Post the list with a flat rate per job in local groups', 'Bring your tools and quote before starting', 'Leave a card or your number for referrals'],
    why: 'Homeowners pay a premium for someone who shows up today.' },

  // ── Online / laptop ──────────────────────────────────────────────────────
  { id: 'freelance_pitch_block', difficulty: 6, title: 'Freelance pitch block', category: 'online', hours: 2, icon: '💼',
    needs: ['laptop'], earn: [0, 300],
    steps: ['Pick one skill you can deliver this week (writing, design, spreadsheets, editing, coding)', 'Send 10 short, specific proposals on Upwork or Fiverr Pro requests', 'Message 5 small local businesses whose websites or social pages need the skill', 'Track every pitch in a sheet and follow up tomorrow'],
    why: 'Pitching is a numbers game. Ten a day compounds into steady clients.' },
  { id: 'resell_flip', difficulty: 5, title: 'Flip items for profit', category: 'online', hours: 2.5, icon: '🏷️',
    needs: [], earn: [40, 200],
    steps: ['Find 3-5 underpriced items on Facebook Marketplace, OfferUp or thrift stores', 'Check sold listings on eBay before buying anything', 'Photograph in good light on a plain background', 'List the same day with the keyword-rich title buyers search for'],
    why: 'Buy low locally, sell at the market price. Sold listings tell you the real value before you spend a dollar.' },
  { id: 'declutter_sell', difficulty: 3, title: 'Sell what you already own', category: 'online', hours: 1.5, icon: '📱',
    needs: [], earn: [30, 250],
    steps: ['Walk through your home and pull 10 things you have not used in a year', 'Photograph and list each on Facebook Marketplace and eBay', 'Price 10% under comparable listings to sell today', 'Arrange same-day pickup at a public place'],
    why: 'Zero cost basis. Every dollar is profit and it clears space.' },
  { id: 'user_testing', difficulty: 1, title: 'Paid user tests and surveys', category: 'online', hours: 1, icon: '🖥️',
    needs: ['laptop'], earn: [10, 60],
    steps: ['Sign up for UserTesting, Userlytics and Prolific', 'Complete the qualification tests', 'Take every test that pays $10 or more', 'Speak your thoughts out loud clearly to keep your rating high'],
    why: 'Real payouts for real feedback, and it fills the gaps between bigger tasks.' },
  { id: 'tutoring', difficulty: 6, title: 'Online tutoring session', category: 'online', hours: 2, icon: '📚', window: [16, 21],
    needs: ['laptop', 'academic'], earn: [30, 100],
    steps: ['List your subject on Wyzant, Preply or Tutor.com', 'Offer a first-session discount for same-week bookings', 'Post in parent groups for after-school help', 'Prepare one worksheet so the session feels professional'],
    why: 'Parents pay well for reliable, patient help. Evenings are peak.' },
  { id: 'content_micro', difficulty: 5, title: 'Create one piece of sellable content', category: 'online', hours: 2, icon: '🎬',
    needs: ['phone'], earn: [0, 100],
    steps: ['Record one 60-second video teaching something you know', 'Post it to TikTok, Reels and Shorts with a clear call to action', 'Add a link to a $5-$15 digital product, service, or affiliate offer', 'Reply to every comment within the first hour'],
    why: 'Distribution compounds. One post a day builds an audience that buys.' },

  // ── Beauty, care and home (the plays women in the gig market already win at) ─
  { id: 'braids_styling', difficulty: 8, title: 'Braids and styling appointments', category: 'beauty', hours: 3, icon: '💇🏽‍♀️', window: [10, 20],
    needs: ['beauty'], earn: [80, 250],
    steps: ['Post 3 recent styles with prices on Instagram, TikTok and 2 local groups: "Same-day slots today"', 'Take deposits by Cash App or Zelle to lock the time', 'Set up at home or travel for a fee; bring your own products', 'Ask every client to post a photo and tag you'],
    why: 'Braiding and styling is one of the highest hourly rates a person can earn from home with skill and a chair.' },
  { id: 'nails_mobile', difficulty: 6, title: 'Mobile nails', category: 'beauty', hours: 2.5, icon: '💅🏽', window: [11, 20],
    needs: ['beauty'], earn: [60, 180],
    steps: ['Post a set menu: basic, gel, full set, with prices and a booking link', 'Book back-to-back clients in the same neighborhood', 'Bring a lamp, kit, and sanitizer; sanitation photos build trust', 'Offer a rebook discount before you leave'],
    why: 'Nail clients rebook every 2-3 weeks. Five regulars is a steady income.' },
  { id: 'makeup_artist', difficulty: 7, title: 'Makeup for events and photos', category: 'beauty', hours: 3, icon: '💄', window: [8, 20],
    needs: ['beauty'], earn: [75, 300],
    steps: ['Message 5 photographers, wedding planners, and event promoters offering on-site makeup', 'Post a before/after reel with a same-week price', 'Charge a deposit for bookings; travel fee outside your area', 'Sell a "glam for a night out" slot Friday and Saturday evenings'],
    why: 'Event makeup pays by the face, not the hour, and weekends book solid.' },
  { id: 'babysitting', difficulty: 6, title: 'Babysitting and date-night care', category: 'care', hours: 4, icon: '🧸', window: [15, 23],
    needs: ['childcare'], earn: [60, 140],
    steps: ['Set up or refresh your Care.com, Sittercity, and UrbanSitter profiles with a background check', 'Post in 2 local parent groups: "Available tonight and this weekend"', 'Confirm rate, hours, and bedtime rules by text before you arrive', 'Send one photo update to the parents'],
    why: 'Evening and weekend childcare is always short on supply and parents pay for someone they trust.' },
  { id: 'senior_companion', difficulty: 5, title: 'Senior companion and errands', category: 'care', hours: 3, icon: '🤝', window: [9, 17],
    needs: [], earn: [45, 120],
    steps: ['Post in Nextdoor and local church or community groups offering companion visits, errands, and rides to appointments', 'Reply to Care.com senior-care requests within the hour', 'Keep a simple log of each visit for the family', 'Offer a standing weekly slot'],
    why: 'Families pay well for reliable, kind help with a parent, and it turns into weekly work fast.' },
  { id: 'home_organizing', difficulty: 6, title: 'Home organizing and decluttering', category: 'local', hours: 3, icon: '🧺',
    needs: [], earn: [60, 150],
    steps: ['Post before/after photos of one closet or pantry with a flat 3-hour price', 'Offer to list unwanted items for the client for a cut of the sales', 'Bring bins, labels, and trash bags', 'Photograph the result for tomorrow\'s post'],
    why: 'Organizing sells on the photo. One good transformation books the next three.' },
  { id: 'meal_prep', difficulty: 6, title: 'Meal prep and baking orders', category: 'food', hours: 3, icon: '🍱',
    needs: ['cooking'], earn: [50, 200],
    steps: ['Post a 5-meal weekly menu with a price and a Friday order cutoff', 'Take orders and deposits through Cash App or Square', 'Cook in one batch; deliver or set a pickup window', 'Check your state\'s cottage food rules for what you can sell from home'],
    why: 'Busy people pay for food that is ready. A menu with a cutoff turns cooking into recurring revenue.' },
  { id: 'poshmark_flip', difficulty: 3, title: 'Sell clothes on Poshmark and Depop', category: 'online', hours: 2, icon: '👗',
    needs: ['phone'], earn: [30, 200],
    steps: ['Pull 15 pieces you no longer wear; brand names and good condition sell first', 'Photograph flat or on a hanger in daylight, list with brand, size, and measurements', 'Share your closet at 7pm when the apps are busiest', 'Accept reasonable offers the same day'],
    why: 'Zero cost basis, and the apps handle shipping labels and payment.' },
  { id: 'virtual_assistant', difficulty: 5, title: 'Virtual assistant block', category: 'online', hours: 3, icon: '🗂️',
    needs: ['laptop'], earn: [45, 120],
    steps: ['List 5 tasks you can do today: inbox cleanup, scheduling, data entry, social posts, invoices', 'Message 10 small businesses and 5 realtors offering a 3-hour trial block', 'Track time with a free timer and send a summary at the end', 'Propose a weekly retainer'],
    why: 'Small businesses need help before they can afford an employee. Retainers are the goal.' },
  { id: 'notary_mobile', difficulty: 7, title: 'Mobile notary and loan signings', category: 'local', hours: 2.5, icon: '📜',
    needs: ['notary', 'vehicle'], earn: [50, 200],
    steps: ['Set your profile active on Snapdocs, Notary Cafe, and 123Notary', 'Post in local groups: "Mobile notary, same day, $X plus travel"', 'Bring stamps, journal, and blue pens', 'Ask title companies for repeat signings'],
    why: 'Loan signings pay $75-$200 each and take about an hour.' },
  { id: 'event_staff', difficulty: 6, title: 'Event and brand ambassador shifts', category: 'gig', hours: 4, icon: '🎪', window: [10, 22],
    needs: [], earn: [60, 160],
    steps: ['Apply on Instawork, Qwick, and local staffing pages for this week\'s events', 'Keep a black-and-white outfit ready', 'Arrive 15 minutes early; ratings decide who gets the next shift', 'Take the promoter\'s number for direct bookings'],
    why: 'Events pay same-week and the good workers get called back directly.' },
  { id: 'pet_sitting', difficulty: 3, title: 'Pet sitting and overnight stays', category: 'care', hours: 3, icon: '🐈',
    needs: [], earn: [40, 120],
    steps: ['Set Rover availability for drop-ins and overnights', 'Post in local groups with a photo of you and a pet', 'Send the owner a photo at each visit', 'Offer a holiday-week rate now'],
    why: 'Overnight stays pay more than walks and owners rebook every trip.' },

  // ── Career moves that pay soon ───────────────────────────────────────────
  { id: 'apply_shift_jobs', difficulty: 2, title: 'Apply for paid shifts this week', category: 'career', hours: 1, icon: '📝',
    needs: [], earn: [0, 0],
    steps: ['Open Indeed, Instawork and Wonolo and filter for shifts in the next 3 days', 'Apply to 5 that match your availability', 'Fill your profile completely so you clear background checks faster', 'Set alerts for same-day shifts'],
    why: 'Shift apps pay within days. Applying today fills next week\'s calendar.' },
  { id: 'skill_sprint', difficulty: 3, title: 'One-hour skill sprint', category: 'career', hours: 1, icon: '🧠',
    needs: [], earn: [0, 0],
    steps: ['Pick the skill your highest-paying play depends on', 'Do one focused hour of practice or a free course module', 'Write down one thing you can now offer that you could not yesterday', 'Add it to tomorrow\'s pitch list'],
    why: 'Your rate is set by your skills. One hour a day raises it.' },
  { id: 'admin_money', difficulty: 1, title: 'Money admin: cash out and track', category: 'career', hours: 0.5, icon: '🧾',
    needs: [], earn: [0, 0],
    steps: ['Cash out every app balance you can', 'Log every dollar earned today in the earnings log', 'Set aside 20% for taxes if you are self-employed', 'Note what worked and what did not'],
    why: 'What gets measured gets improved. The crew learns from this log.' },
];

const RESOURCES = [
  { key: 'vehicle', label: 'a car', icon: '🚗' },
  { key: 'bike', label: 'a bike or scooter', icon: '🚲' },
  { key: 'laptop', label: 'a laptop', icon: '💻' },
  { key: 'phone', label: 'a smartphone', icon: '📱' },
  { key: 'handy', label: 'basic handyman skills', icon: '🔧' },
  { key: 'academic', label: 'a subject I can teach', icon: '📚' },
  { key: 'rideshare_approved', label: 'an approved rideshare account', icon: '🚕' },
  { key: 'beauty', label: 'hair, nails or makeup skills', icon: '💄' },
  { key: 'cooking', label: 'I can cook or bake', icon: '🍳' },
  { key: 'childcare', label: 'childcare experience', icon: '🧸' },
  { key: 'notary', label: 'a notary commission', icon: '📜' },
];
const CATEGORIES = { gig: 'Gig', local: 'Local services', online: 'Online', beauty: 'Beauty', care: 'Care', food: 'Food', career: 'Career', sales: 'Sales', other: 'Other' };
// In-person plays where the safety flow (share where you are, check in, check out) applies.
const IN_PERSON = new Set(['taskrabbit_moving', 'yard_work', 'car_detailing', 'dog_walking', 'handyman_small', 'braids_styling', 'nails_mobile', 'makeup_artist', 'babysitting', 'senior_companion', 'home_organizing', 'notary_mobile', 'event_staff', 'pet_sitting', 'resell_flip', 'declutter_sell']);
const RESOURCE_LABELS = Object.fromEntries(RESOURCES.map(r => [r.key, r.label]));

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h;
}

function hasResources(play, profile) {
  const have = new Set(profile.resources || []);
  return play.needs.every(n => have.has(n));
}

/** "10:30am" -> 630. Returns null when unparseable. */
function parseClock(str) {
  const m = /^\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*$/i.exec(String(str || ''));
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2] || '0', 10);
  const ap = (m[3] || '').toLowerCase();
  if (ap === 'pm' && h < 12) h += 12;
  if (ap === 'am' && h === 12) h = 0;
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/** Lay tasks out on the clock, jumping over blocked windows ({start,end} in hours). */
function layoutOnClock(tasks, startHour, blockedHours = []) {
  const blocks = (blockedHours || [])
    .map(b => ({ start: Number(b.start) * 60, end: Number(b.end) * 60 }))
    .filter(b => Number.isFinite(b.start) && Number.isFinite(b.end) && b.end > b.start)
    .sort((a, b) => a.start - b.start);
  let cursor = Math.round(startHour * 60);
  const skipBlocks = (t) => { for (const b of blocks) if (t >= b.start && t < b.end) t = b.end; return t; };
  return tasks.map((task) => {
    cursor = skipBlocks(cursor);
    const len = Math.round(task.hours * 60);
    for (const b of blocks) if (cursor < b.start && cursor + len > b.start) cursor = b.end; // would overlap: move past it
    const start = cursor;
    cursor += len;
    return { ...task, startsAt: clock(start), endsAt: clock(cursor), startsMin: start, endsMin: cursor };
  });
}

function clock(mins) {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  const ampm = h >= 12 ? 'pm' : 'am';
  const hh = ((h + 11) % 12) + 1;
  return `${hh}:${String(m).padStart(2, '0')}${ampm}`;
}

/**
 * Build a deterministic working-day plan for a profile.
 * @param {object} profile  { userId, resources: string[], targetHours, startHour, memory: { avoid: [], favorites: [] } }
 * @param {string} dateKey  YYYY-MM-DD (the player's local date)
 * @param {object} [opts]   { recentPlayIds: string[] } plays used in the last few days (rotated out)
 */
function buildOfflinePlan(profile, dateKey, opts = {}) {
  const targetHours = Math.min(12, Math.max(2, Number(profile.targetHours) || 8));
  const recent = new Set(opts.recentPlayIds || []);
  const memory = profile.memory || {};
  const favorites = new Set(memory.favorites || []);
  const avoid = new Set(memory.avoid || []);
  const seed = hash(`${profile.userId}|${dateKey}`);
  const stats = opts.playStats || {};

  const scored = PLAYS
    .filter(p => hasResources(p, profile) && !avoid.has(p.id))
    .map((p, i) => {
      let score = ((seed >>> (i % 24)) & 0xff) / 255; // stable per person + day
      if (favorites.has(p.id)) score += 0.6;
      if (recent.has(p.id)) score -= 0.5;
      const st = stats[p.id];
      if (st && (st.attempts >= 2 || st.confidence)) {
        // Real learning: what this person, this city, and the world actually finish and earn beats any estimate.
        const c = st.confidence == null ? 1 : st.confidence;
        score += (st.doneRate - 0.5) * 0.8 * c;
        if (st.earnRatio != null) score += Math.max(-0.4, Math.min(0.6, (st.earnRatio - 1) * 0.5)) * c;
      }
      if (p.earn[1] >= 100) score += 0.25;
      if (p.category === 'career') score -= 0.1; // fillers, never the headline
      // Lead with the skills the person told us they have.
      const have = new Set(profile.resources || []);
      if (p.category === 'beauty' && have.has('beauty')) score += 0.45;
      if (p.category === 'care' && have.has('childcare')) score += 0.35;
      if (p.category === 'food' && have.has('cooking')) score += 0.35;
      return { play: p, score };
    })
    .sort((a, b) => b.score - a.score);

  const chosen = [];
  let hours = 0;
  const perCategory = new Map();
  for (const { play } of scored) {
    if (play.id === 'admin_money') continue;
    if (hours + play.hours > targetHours - 0.5) continue; // leave room for money admin
    const n = perCategory.get(play.category) || 0;
    if (n >= 2) continue; // variety beats grinding one thing
    chosen.push(play);
    perCategory.set(play.category, n + 1);
    hours += play.hours;
    if (hours >= targetHours - 0.5) break;
  }
  // Time-sensitive plays (lunch rush, dinner rush, commute) go where the demand is.
  chosen.sort((a, b) => (a.window ? a.window[0] : 99) - (b.window ? b.window[0] : 99));
  chosen.push(PLAYS.find(p => p.id === 'admin_money')); // always end the day by logging it

  const startHour = Number.isFinite(Number(profile.startHour)) ? Number(profile.startHour) : 8;
  const tasks = layoutOnClock(chosen.map((p, idx) => ({
    order: idx + 1,
    playId: p.id,
    title: p.title,
    icon: p.icon,
    category: p.category,
    hours: p.hours,
    estimatedEarnings: { low: p.earn[0], high: p.earn[1] },
    steps: p.steps,
    why: p.why,
    sources: [],
    inPerson: IN_PERSON.has(p.id),
    difficulty: p.difficulty || 5,
  })), startHour, profile.blockedHours);

  const low = tasks.reduce((s, t) => s + t.estimatedEarnings.low, 0);
  const high = tasks.reduce((s, t) => s + t.estimatedEarnings.high, 0);
  const totalHours = tasks.reduce((s, t) => s + t.hours, 0);
  return {
    date: dateKey,
    generatedBy: 'playbook',
    headline: `${tasks.length} plays, ${totalHours.toFixed(1)} hours, $${low}-$${high} realistic range`,
    brief: [
      'The crew could not reach live news today, so this plan is built from the proven playbook.',
      'Every play is legal, needs only what you told us you have, and pays the same day or within the week.',
      'Log your real earnings as you go. Tomorrow\'s plan gets sharper with every entry.',
    ],
    focus: tasks[0] ? tasks[0].title : 'Get moving',
    tasks,
    estimatedEarnings: { low, high },
    disclaimer: 'Earnings ranges are estimates from public gig and marketplace data, not guarantees. You are your own boss: only take work you are legally allowed to do where you live.',
  };
}

/**
 * Offline mid-day replan: swap the remaining pending plays for fresh ones that
 * fit the hours left, avoiding anything already on today's plan.
 */
function replanRemaining(profile, remainingHours, usedPlayIds = []) {
  const used = new Set(usedPlayIds);
  const avoid = new Set((profile.memory || {}).avoid || []);
  const pool = PLAYS.filter(p => hasResources(p, profile) && !used.has(p.id) && !avoid.has(p.id) && p.id !== 'admin_money')
    .sort((a, b) => b.earn[1] - a.earn[1]);
  const chosen = [];
  let hours = 0;
  for (const p of pool) {
    if (hours + p.hours > remainingHours) continue;
    chosen.push(p); hours += p.hours;
    if (hours >= remainingHours - 0.5) break;
  }
  return chosen.map((p, idx) => ({
    order: idx + 1, playId: p.id, title: p.title, icon: p.icon, category: p.category, hours: p.hours,
    estimatedEarnings: { low: p.earn[0], high: p.earn[1] }, steps: p.steps, why: p.why, sources: [], inPerson: IN_PERSON.has(p.id), difficulty: p.difficulty || 5,
  }));
}

module.exports = { PLAYS, RESOURCES, RESOURCE_LABELS, CATEGORIES, IN_PERSON, buildOfflinePlan, replanRemaining, layoutOnClock, parseClock, clock };
