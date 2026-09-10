'use strict';

// Rise N Grind University: one short lesson a day inside the plan, with a
// one-question quiz. A correct answer earns points toward the day's score, so
// learning is part of the grind, not homework.

const LESSONS = [
  { id: 'price_hourly', title: 'Price by the job, not the hour', body: 'Customers buy outcomes. "Yard cleanup, $120" sells better than "$30 an hour" and rewards you for being fast. Quote a flat price you would be happy with at your slowest pace.', q: 'Which quote usually earns more for a fast worker?', options: ['$30 an hour', 'A flat price for the finished job', 'Whatever the customer offers'], answer: 1 },
  { id: 'deposit', title: 'Always take a deposit', body: 'A deposit turns a maybe into a booking. Even $10 by Cash App cuts no-shows by more than half. Say it like it is normal, because it is: "I lock the slot with a $20 deposit."', q: 'What does a deposit mostly protect you from?', options: ['Taxes', 'No-shows', 'Bad reviews'], answer: 1 },
  { id: 'rebook', title: 'Ask for the next booking before you leave', body: 'The best moment to sell is right after a happy customer sees the result. "Want me back in two weeks? I can hold Tuesday." Repeat customers cost nothing to find.', q: 'When is the easiest moment to book the next job?', options: ['A week later by text', 'Right after finishing, in person', 'Never; wait for them to call'], answer: 1 },
  { id: 'taxes20', title: 'Set aside 20 percent', body: 'Self-employed income is taxed, and nobody withholds it for you. Move 20 percent of every payout into a separate account the day you get it. Quarterly estimated payments keep penalties away.', q: 'How much of each payout should a self-employed person set aside for taxes, as a starting rule?', options: ['5 percent', '20 percent', 'Nothing until April'], answer: 1 },
  { id: 'mileage', title: 'Track every mile', body: 'Driving for work is deductible at the IRS standard rate, which adds up to thousands a year for delivery and rideshare. A free mileage app running in the background is the easiest money you will ever keep.', q: 'Why track mileage?', options: ['It is a tax deduction', 'Apps require it', 'It raises your rating'], answer: 0 },
  { id: 'reviews', title: 'Reviews are your resume', body: 'On every platform the person with more recent 5-star reviews wins the job. Ask for a review the same day, while the result is fresh, and make it a one-tap link.', q: 'When should you ask for a review?', options: ['The same day', 'After a month', 'Only from friends'], answer: 0 },
  { id: 'peak_hours', title: 'Work the peaks, rest the valleys', body: 'Delivery pays double at lunch and dinner and almost nothing at 3pm. Rideshare surges at commute and bar close. Plan your errands and rest into the valleys and your money into the peaks.', q: 'Which window pays best for food delivery?', options: ['3pm to 5pm', 'Dinner rush', 'Early morning'], answer: 1 },
  { id: 'invoice', title: 'Send an invoice, even for cash jobs', body: 'A one-line invoice with your name, the job, the price and "paid" makes you look established, gives the customer something to forward, and gives you a record for taxes. Free invoice apps take a minute.', q: 'What is one reason to send an invoice for a cash job?', options: ['It is required by the app', 'It gives you a record and looks professional', 'It lets you charge more later'], answer: 1 },
  { id: 'upsell', title: 'One small add-on per job', body: 'Detailing a car? Offer a $15 headlight restore. Cleaning a yard? Offer to haul the bags. Add-ons are pure margin because you are already there.', q: 'Why are add-ons so profitable?', options: ['Customers never say no', 'You are already on site, so there is no extra travel', 'They are tax-free'], answer: 1 },
  { id: 'script', title: 'Have a two-line pitch ready', body: '"I do mobile car cleaning in this neighborhood. Interior and exterior, $80, I can do it today while you are home." Who you are, what you do, the price, the time. Say it the same way every time.', q: 'Which part is missing from a good pitch: "I clean cars, I can come today"?', options: ['Your name', 'The price', 'Your phone number'], answer: 1 },
  { id: 'safety', title: 'Meet in public, tell someone', body: 'For any in-person job with a stranger: confirm the address, share it with a contact, meet at the door or in public first, and keep your phone charged. Rise N Grind can share your status with a contact from the task screen.', q: 'What should you do before an in-person job with a stranger?', options: ['Bring cash', 'Share where you are with someone you trust', 'Turn off your phone to focus'], answer: 1 },
  { id: 'stack_apps', title: 'Run two apps at once', body: 'Delivery drivers who run two apps and accept the better offer earn 20 to 40 percent more per hour. Decline low-paying orders fast so your acceptance rate does not trap you.', q: 'Why run two delivery apps at the same time?', options: ['To pick the better-paying order', 'It is required', 'To earn double tips'], answer: 0 },
  { id: 'niche', title: 'Own one small thing', body: 'The person who is "the braider on 5th Street" or "the guy who does headlight restores" gets referrals without asking. Pick one thing you do well and put it in your name everywhere.', q: 'What does a clear niche mostly bring you?', options: ['Higher taxes', 'Referrals without asking', 'More competition'], answer: 1 },
  { id: 'cottage_food', title: 'Know your cottage food rules', body: 'Most states let you sell baked goods and shelf-stable food from home under cottage food laws, usually with a label and a sales cap. Look yours up before you sell your first plate.', q: 'What do cottage food laws usually require?', options: ['A commercial kitchen', 'A label and staying under a sales cap', 'A liquor license'], answer: 1 },
  { id: 'follow_up', title: 'Follow up once, the next day', body: 'Most pitches die because nobody follows up. One short message the next morning, "Still want that Saturday slot?", closes more work than the first message did.', q: 'When should you follow up on a pitch?', options: ['Never', 'The next day, once', 'Every hour'], answer: 1 },
  { id: 'business_account', title: 'Separate your money', body: 'A free business checking account keeps your income and expenses in one place, makes taxes an hour instead of a weekend, and makes you look like a business when a customer pays you.', q: 'What is the main reason to open a separate account for business money?', options: ['Higher interest', 'Clean records for taxes', 'It is required by law'], answer: 1 },
  { id: 'raise_rates', title: 'Raise your price when you are full', body: 'If you are booked more than a week out, you are underpriced. Raise new-customer prices by 15 percent. Some will say no. Your calendar will still be full and you will earn more.', q: 'What is the signal that you should raise prices?', options: ['A bad review', 'Being booked more than a week out', 'A slow week'], answer: 1 },
  { id: 'insurance', title: 'One policy, no disaster', body: 'General liability insurance for a solo service business often costs under $30 a month. It is the difference between a scratched car being a bad day and a bad year.', q: 'What does general liability insurance protect you from?', options: ['Slow days', 'Paying out of pocket when something you are doing causes damage', 'Losing customers'], answer: 1 },
  { id: 'content', title: 'Post the work, not your face', body: 'A 10-second before/after of a job, posted every day, is the cheapest ad you will ever run. People hire what they can see.', q: 'What kind of post brings customers for a service business?', options: ['Motivational quotes', 'Before and after of real work', 'Long personal stories'], answer: 1 },
  { id: 'no_free_work', title: 'Trade only for something real', body: '"Exposure" does not pay rent. If someone wants a discount, ask for a review, a referral, or a repeat booking in return. Free work with nothing coming back trains people to expect it.', q: 'What is a fair trade for a discount?', options: ['Exposure', 'A review or a referral', 'Nothing, discounts are normal'], answer: 1 },
];

const POINTS_PER_CORRECT = 50;

function hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h; }

/** The lesson for a person on a date: rotates through the library without repeating what they already passed. */
function lessonFor(userId, dateKey, passedIds = []) {
  const passed = new Set(passedIds);
  const pool = LESSONS.filter(l => !passed.has(l.id));
  const list = pool.length ? pool : LESSONS;
  const l = list[hash(`${userId}|${dateKey}|lesson`) % list.length];
  return { id: l.id, title: l.title, body: l.body, q: l.q, options: l.options, points: POINTS_PER_CORRECT };
}

function check(lessonId, answerIndex) {
  const l = LESSONS.find(x => x.id === lessonId);
  if (!l) return null;
  return { correct: Number(answerIndex) === l.answer, answer: l.answer, explanation: l.body };
}

module.exports = { LESSONS, POINTS_PER_CORRECT, lessonFor, check };
