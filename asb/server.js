/**
 * All Shades of Brown — website server
 * Serves the static site, stores form submissions, and creates Stripe Checkout
 * sessions for non-refundable booking deposits.
 *
 * Runs in "demo mode" without a STRIPE_SECRET_KEY so the whole site can be
 * previewed locally; bookings are still recorded and the customer is sent to
 * the confirmation page.
 */
require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const PORT = process.env.PORT || 4000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
const DATA_DIR = path.join(__dirname, 'data');
const SUBMISSIONS_DIR = path.join(DATA_DIR, 'submissions');
const SERVICES = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'services.json'), 'utf8'));

let stripe = null;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  console.log('Stripe: live checkout enabled');
} else {
  console.log('Stripe: no STRIPE_SECRET_KEY set, running in demo mode');
}

fs.mkdirSync(SUBMISSIONS_DIR, { recursive: true });

// Optional email alerts: set SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS and NOTIFY_EMAIL in .env
let mailer = null;
if (process.env.SMTP_HOST && process.env.NOTIFY_EMAIL) {
  mailer = require('nodemailer').createTransport({
    host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 587), secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined
  });
  console.log(`Email alerts: on, sending to ${process.env.NOTIFY_EMAIL}`);
} else {
  console.log('Email alerts: off (set SMTP_HOST and NOTIFY_EMAIL to enable)');
}
function notify(subject, record) {
  if (!mailer) return;
  const lines = Object.entries(record).filter(([k]) => !['id', 'type'].includes(k)).map(([k, v]) => `${k}: ${v}`).join('\n');
  mailer.sendMail({ from: process.env.SMTP_FROM || process.env.SMTP_USER || process.env.NOTIFY_EMAIL, to: process.env.NOTIFY_EMAIL, subject: `[ASB] ${subject}`, text: lines })
    .catch(err => console.error('Email alert failed:', err.message));
}

const app = express();
app.set('trust proxy', 1);

// Stripe webhook needs the raw body, so mount it before the JSON parser.
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) return res.status(200).send('ignored');
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook error: ${err.message}`);
  }
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    updateBooking(session.metadata && session.metadata.bookingId, { status: 'deposit_paid', stripeSessionId: session.id, paidAt: new Date().toISOString() });
  }
  res.json({ received: true });
});

app.use(express.json({ limit: '200kb' }));
app.use('/data/services.json', (req, res) => res.json(SERVICES));
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));

/* ---------- helpers ---------- */
const ALLOWED_FORMS = new Set(['newsletter', 'contact', 'quote', 'waitlist', 'volunteer', 'application', 'contractor', 'giveaway', 'rsvp', 'nails-order']);

function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}
function appendRecord(type, record) {
  const file = path.join(SUBMISSIONS_DIR, `${type}.json`);
  const list = readJson(file, []);
  list.push(record);
  fs.writeFileSync(file, JSON.stringify(list, null, 2));
}
function updateBooking(id, patch) {
  if (!id) return;
  const file = path.join(SUBMISSIONS_DIR, 'bookings.json');
  const list = readJson(file, []);
  const b = list.find(x => x.id === id);
  if (b) { Object.assign(b, patch); fs.writeFileSync(file, JSON.stringify(list, null, 2)); }
}
function clean(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj || {})) {
    if (typeof v === 'string') out[k] = v.trim().slice(0, 4000);
    else if (typeof v === 'number' || typeof v === 'boolean') out[k] = v;
  }
  return out;
}
const isEmail = e => typeof e === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

/* ---------- forms ---------- */
app.post('/api/forms/:type', (req, res) => {
  const type = req.params.type;
  if (!ALLOWED_FORMS.has(type)) return res.status(404).json({ error: 'Unknown form' });
  const data = clean(req.body);
  if (data.email && !isEmail(data.email)) return res.status(400).json({ error: 'Please enter a valid email address.' });
  if (type === 'newsletter' && !data.email) return res.status(400).json({ error: 'Email is required.' });
  if (data.website) return res.json({ message: 'Thank you!' }); // honeypot field
  const record = { id: crypto.randomUUID(), type, receivedAt: new Date().toISOString(), ...data };
  appendRecord(type, record);
  notify(`New ${type} from ${data.name || data.email || 'website'}`, record);
  const messages = {
    newsletter: "You're in! Welcome to the ASB community.",
    contact: 'Thanks for reaching out. We reply within one business day.',
    quote: 'Got it! Expect your quote within 24 hours.',
    waitlist: "You're on the list. We'll reach out the moment this launches.",
    volunteer: 'Thank you for giving back with us. We will be in touch before the next event.',
    application: 'Application received. We keep every application on file and reach out when there is a fit.',
    contractor: 'Thanks! We will review your info and reach out about partnering.',
    giveaway: "You're entered! Winners are announced on our social pages and by email.",
    rsvp: "You're on the list. See you there!",
    'nails-order': 'Order request received! We will confirm sizing and send an invoice within 24 hours.'
  };
  res.json({ message: messages[type] || 'Thank you!' });
});

/* ---------- bookings + deposit checkout ---------- */
app.post('/api/book', async (req, res) => {
  const body = clean(req.body);
  const service = SERVICES.find(s => s.id === body.serviceId);
  if (!service) return res.status(400).json({ error: 'Please choose a service.' });
  if (service.status !== 'live') return res.status(400).json({ error: 'This service is not open for booking yet.' });
  if (!body.name || !isEmail(body.email) || !body.phone) return res.status(400).json({ error: 'Name, email, and phone are required.' });
  if (!body.date || !body.time) return res.status(400).json({ error: 'Please pick a date and time.' });
  if (body.acceptTerms !== 'on' && body.acceptTerms !== true) return res.status(400).json({ error: 'Please accept the deposit terms to continue.' });

  const booking = {
    id: crypto.randomUUID(),
    receivedAt: new Date().toISOString(),
    status: service.deposit > 0 ? 'pending_deposit' : 'requested',
    serviceId: service.id, serviceName: service.name, deposit: service.deposit,
    ...body
  };
  appendRecord('bookings', booking);
  notify(`New booking: ${service.name} on ${booking.date} at ${booking.time} (${booking.name})`, booking);

  const successUrl = `${BASE_URL}/success.html?booking=${booking.id}`;
  if (!stripe || service.deposit <= 0) {
    if (service.deposit <= 0) updateBooking(booking.id, { status: 'requested' });
    else updateBooking(booking.id, { status: 'demo_deposit' });
    return res.json({ url: successUrl, demo: !stripe });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: booking.email,
      line_items: [{
        quantity: 1,
        price_data: {
          currency: 'usd',
          unit_amount: Math.round(service.deposit * 100),
          product_data: { name: `${service.name} — non-refundable booking deposit`, description: `${service.service} on ${booking.date} at ${booking.time}` }
        }
      }],
      metadata: { bookingId: booking.id, serviceId: service.id },
      success_url: successUrl,
      cancel_url: `${BASE_URL}/book.html?service=${service.id}&cancelled=1`
    });
    updateBooking(booking.id, { stripeSessionId: session.id });
    res.json({ url: session.url });
  } catch (err) {
    console.error('Stripe error', err.message);
    res.status(500).json({ error: 'We could not start the deposit checkout. Please try again or contact us.' });
  }
});

app.get('/api/bookings/:id', (req, res) => {
  const list = readJson(path.join(SUBMISSIONS_DIR, 'bookings.json'), []);
  const b = list.find(x => x.id === req.params.id);
  if (!b) return res.status(404).json({ error: 'Not found' });
  res.json({ id: b.id, serviceName: b.serviceName, date: b.date, time: b.time, status: b.status, deposit: b.deposit, name: b.name });
});

/* ---------- simple admin (token protected) ---------- */
function requireAdmin(req, res, next) {
  const token = process.env.ADMIN_TOKEN;
  if (!token || token === 'change-me' || req.headers['x-admin-token'] !== token) return res.status(401).json({ error: 'Unauthorized' });
  next();
}
app.get('/api/admin/submissions', requireAdmin, (req, res) => {
  const out = {};
  for (const f of fs.readdirSync(SUBMISSIONS_DIR)) out[f.replace('.json', '')] = readJson(path.join(SUBMISSIONS_DIR, f), []);
  res.json(out);
});
const BOOKING_STATUSES = ['pending_deposit', 'demo_deposit', 'deposit_paid', 'requested', 'quoted', 'confirmed', 'completed', 'cancelled'];
app.patch('/api/admin/bookings/:id', requireAdmin, (req, res) => {
  const patch = {};
  if (req.body.status) { if (!BOOKING_STATUSES.includes(req.body.status)) return res.status(400).json({ error: 'Bad status' }); patch.status = req.body.status; }
  if (typeof req.body.adminNotes === 'string') patch.adminNotes = req.body.adminNotes.slice(0, 2000);
  updateBooking(req.params.id, patch);
  res.json({ ok: true });
});
app.delete('/api/admin/:type/:id', requireAdmin, (req, res) => {
  const file = path.join(SUBMISSIONS_DIR, `${req.params.type.replace(/[^a-z-]/g, '')}.json`);
  const list = readJson(file, []);
  const next = list.filter(x => x.id !== req.params.id);
  if (next.length === list.length) return res.status(404).json({ error: 'Not found' });
  fs.writeFileSync(file, JSON.stringify(next, null, 2));
  res.json({ ok: true });
});

app.use((req, res) => res.status(404).sendFile(path.join(__dirname, 'public', '404.html')));

app.listen(PORT, () => console.log(`All Shades of Brown is live at ${BASE_URL}`));
