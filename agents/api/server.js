/**
 * Self-Made Legends — product and order API
 * Copyright (c) 2026 Self-Made Legends LLC. All Rights Reserved.
 *
 * Takes designs and tech packs from the agents, takes orders from the
 * storefront, and hands them to the routing agent to decide where they go.
 *
 * Run:   node agents/api/server.js
 * Env:   SML_API_KEY  (required — without it uploads are open to the world)
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  This replaces an earlier draft of the same idea. The bugs that draft had
 *  are documented at each fix below, because every one of them is a mistake
 *  that is easy to make again and invisible once it is made.
 * ─────────────────────────────────────────────────────────────────────────
 */

'use strict';

const express = require('express');
const multer = require('multer');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const pipeline = require('../pipeline');
const events = require('../runtime/events');

/* ── configuration ───────────────────────────────────────────────────────
   FIX: the original opened './sml.db'. That is the trading game's live
   database — the same file the game's players, portfolios and balances are
   in. It would have opened it and created tables inside it. A separate
   file, under a directory that can be a mounted volume. */
const DATA_DIR = process.env.SML_API_DATA_DIR || path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'sml-commerce.db');
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');

const API_KEY = process.env.SML_API_KEY || '';
const PORT = process.env.PORT || 3100;

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
const MAX_FILES = 12;
const MAX_QTY = 500;

// Only what a design upload can legitimately be. An allowlist, never a
// blocklist — a blocklist is a list of the attacks you happened to think of.
const ALLOWED = new Map([
  ['image/png', '.png'], ['image/jpeg', '.jpg'], ['image/webp', '.webp'],
  ['application/pdf', '.pdf'],
]);

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

/* ── startup checks ──────────────────────────────────────────────────────
   FIX: the original read MANUFACTURER_API_URL at call time. Unset, fetch()
   threw, the error was swallowed, and the order sat in production_pending
   forever with nothing to say why. Fail loudly at boot instead. */
if (!API_KEY) {
  console.error(`
  SML_API_KEY is not set.

  Without it, anyone on the internet can upload files to this server.
  Generate one and put it in .env:

      node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  `);
  process.exit(1);
}
if (API_KEY.length < 32) {
  console.error('  SML_API_KEY is too short to be worth having. Use 32+ characters.\n');
  process.exit(1);
}

/* ── database ────────────────────────────────────────────────────────────
   Promisified. The original's nested callbacks are why several of its bugs
   were invisible: a throw inside a callback never reaches the try/catch
   wrapped around the outer function. */
const db = new sqlite3.Database(DB_PATH);
const run = (sql, p = []) => new Promise((ok, no) => db.run(sql, p, function (e) { e ? no(e) : ok(this); }));
const get = (sql, p = []) => new Promise((ok, no) => db.get(sql, p, (e, r) => (e ? no(e) : ok(r))));
const all = (sql, p = []) => new Promise((ok, no) => db.all(sql, p, (e, r) => (e ? no(e) : ok(r))));

async function migrate() {
  await run('PRAGMA journal_mode = WAL');
  await run('PRAGMA foreign_keys = ON');

  await run(`CREATE TABLE IF NOT EXISTS products (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    sku          TEXT UNIQUE NOT NULL,
    title        TEXT NOT NULL,
    description  TEXT,
    category     TEXT,
    assets       TEXT NOT NULL DEFAULT '[]',
    techpack_url TEXT,
    created_at   TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
  )`);

  await run(`CREATE TABLE IF NOT EXISTS orders (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id      TEXT UNIQUE NOT NULL,
    sku           TEXT NOT NULL,
    qty           INTEGER NOT NULL CHECK (qty > 0),
    customer_json TEXT NOT NULL,
    status        TEXT NOT NULL,
    routing_json  TEXT,
    manufacturer_json TEXT,
    distributor_json  TEXT,
    tracking      TEXT,
    last_error    TEXT,
    created_at    TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
  )`);

  await run(`CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)`);
}

/**
 * The order lifecycle.
 *
 * FIX: the original wrote 'shipped' whenever the Lefty call returned
 * anything at all — including `{ ok: false, error: ... }`, which is truthy.
 * A failed handoff was recorded as a shipped order. Nothing here is
 * 'shipped' until there is a tracking number, and handing a parcel to a
 * distributor is not shipping it.
 */
const STATUS = {
  RECEIVED: 'received',
  ROUTING: 'routing',
  ROUTED: 'routed',
  AT_MANUFACTURER: 'at_manufacturer',
  AT_DISTRIBUTOR: 'at_distributor',
  SHIPPED: 'shipped',              // only with a tracking number
  NEEDS_HUMAN: 'needs_human',      // unroutable, or a partner refused
  FAILED: 'failed',
};

/* ── uploads ─────────────────────────────────────────────────────────────
   FIX 1: the original used `Date.now() + '-' + file.originalname`.
          originalname is whatever the client sends, including
          '../../etc/whatever'. Multer joins it to the destination, so that
          escapes the upload directory. Filenames are now generated, and
          the client's name never touches the filesystem.
   FIX 2: no size limit, no type filter, and the directory was served
          statically — so anyone could upload an .html file with a script
          in it and have it served from your own origin. That is stored
          XSS against your own admin. Both closed below. */
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => {
      const ext = ALLOWED.get(file.mimetype) || '.bin';
      cb(null, `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`);
    },
  }),
  limits: { fileSize: MAX_UPLOAD_BYTES, files: MAX_FILES, fields: 20 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED.has(file.mimetype)) {
      return cb(new Error(`${file.mimetype} is not an allowed upload type. Images and PDFs only.`));
    }
    cb(null, true);
  },
});

/* ── app ─────────────────────────────────────────────────────────────── */

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));

/** Constant-time key comparison. A === on a secret leaks its length and prefix. */
function authorised(req) {
  const given = req.get('x-sml-key') || '';
  const a = Buffer.from(given);
  const b = Buffer.from(API_KEY);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function requireKey(req, res, next) {
  if (!authorised(req)) return res.status(401).json({ error: 'unauthorised' });
  next();
}

app.get('/health', async (req, res) => {
  try {
    await get('SELECT 1');
    res.json({ ok: true, db: 'up' });
  } catch (err) {
    res.status(503).json({ ok: false, db: 'down', error: err.message });
  }
});

/* ── 1. designs and tech packs, from the agents ──────────────────────── */

app.post('/api/designs', requireKey, upload.fields([{ name: 'images', maxCount: 10 }, { name: 'techpack', maxCount: 1 }]),
  async (req, res) => {
    try {
      const { sku, title, description, category } = req.body;

      if (!sku || !/^[A-Za-z0-9._-]{3,40}$/.test(sku)) {
        return res.status(400).json({ error: 'sku must be 3-40 characters of letters, digits, dot, dash or underscore' });
      }
      if (!title || title.length > 200) {
        return res.status(400).json({ error: 'title is required and must be under 200 characters' });
      }

      const images = (req.files?.images || []).map((f) => `/uploads/${path.basename(f.path)}`);
      const techpack = (req.files?.techpack || [])[0];
      const techpackUrl = techpack ? `/uploads/${path.basename(techpack.path)}` : null;

      /* FIX: the original used INSERT OR REPLACE. That deletes the existing
         row and inserts a new one — a new primary key, a reset created_at,
         and every column you did not supply silently nulled. Re-uploading
         images alone would have wiped the tech pack. A real upsert instead,
         and COALESCE so an omitted field keeps its value. */
      await run(
        `INSERT INTO products (sku, title, description, category, assets, techpack_url)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(sku) DO UPDATE SET
           title        = excluded.title,
           description  = COALESCE(excluded.description, products.description),
           category     = COALESCE(excluded.category, products.category),
           assets       = CASE WHEN excluded.assets = '[]' THEN products.assets ELSE excluded.assets END,
           techpack_url = COALESCE(excluded.techpack_url, products.techpack_url),
           updated_at   = datetime('now')`,
        [sku, title, description || null, category || null, JSON.stringify(images), techpackUrl]
      );

      const product = await get('SELECT * FROM products WHERE sku = ?', [sku]);
      res.json({ ok: true, product: { ...product, assets: JSON.parse(product.assets) } });
    } catch (err) {
      console.error('[designs]', err);
      res.status(500).json({ error: 'upload_failed', detail: err.message });
    }
  }
);

/* ── 2. orders, from the storefront ──────────────────────────────────── */

app.post('/api/orders', requireKey, async (req, res) => {
  try {
    const { order_id, sku, qty, customer } = req.body || {};

    if (!order_id || !sku || !qty || !customer) {
      return res.status(400).json({ error: 'order_id, sku, qty and customer are all required' });
    }
    if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QTY) {
      /* FIX: the original passed qty straight through. A negative or absurd
         quantity went to the manufacturer unchallenged. */
      return res.status(400).json({ error: `qty must be a whole number between 1 and ${MAX_QTY}` });
    }
    if (!customer.address || !customer.address.country) {
      return res.status(400).json({ error: 'customer.address.country is required to route anything' });
    }

    /* FIX: the original had no idempotency. Storefronts and payment
       processors retry — that is normal, not an error — and a retry hit the
       UNIQUE constraint and came back 500. The storefront then retries
       harder. Return what happened the first time instead. */
    const existing = await get('SELECT * FROM orders WHERE order_id = ?', [order_id]);
    if (existing) {
      return res.status(200).json({ ok: true, duplicate: true, order: publicOrder(existing) });
    }

    const product = await get('SELECT * FROM products WHERE sku = ?', [sku]);
    if (!product) {
      await run(
        `INSERT INTO orders (order_id, sku, qty, customer_json, status, last_error)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [order_id, sku, qty, JSON.stringify(customer), STATUS.NEEDS_HUMAN, `No product with sku "${sku}"`]
      );
      return res.status(404).json({ error: 'product_not_found', sku });
    }

    await run(
      `INSERT INTO orders (order_id, sku, qty, customer_json, status) VALUES (?, ?, ?, ?, ?)`,
      [order_id, sku, qty, JSON.stringify(customer), STATUS.RECEIVED]
    );

    /* FIX: the original held the HTTP response open across two external API
       calls. A manufacturer taking 30 seconds meant the storefront timed
       out and retried — and with no idempotency, retried into a 500. Accept
       the order, answer immediately, do the work after. */
    res.status(202).json({
      ok: true,
      order_id,
      status: STATUS.RECEIVED,
      poll: `/api/orders/${encodeURIComponent(order_id)}`,
    });

    setImmediate(() => {
      processOrder({ order_id, sku, qty, customer, product })
        .catch((err) => {
          console.error('[order]', order_id, err);
          run(`UPDATE orders SET status = ?, last_error = ?, updated_at = datetime('now') WHERE order_id = ?`,
            [STATUS.FAILED, err.message, order_id]).catch(() => {});
        });
    });
  } catch (err) {
    console.error('[orders]', err);
    if (!res.headersSent) res.status(500).json({ error: 'order_failed' });
  }
});

app.get('/api/orders/:order_id', requireKey, async (req, res) => {
  const order = await get('SELECT * FROM orders WHERE order_id = ?', [req.params.order_id]);
  if (!order) return res.status(404).json({ error: 'not_found' });
  res.json({ ok: true, order: publicOrder(order) });
});

/** Orders a person needs to look at. This is the queue that must not grow. */
app.get('/api/orders', requireKey, async (req, res) => {
  const status = req.query.status;
  const rows = status
    ? await all('SELECT * FROM orders WHERE status = ? ORDER BY created_at DESC LIMIT 200', [status])
    : await all('SELECT * FROM orders ORDER BY created_at DESC LIMIT 200');
  res.json({ ok: true, count: rows.length, orders: rows.map(publicOrder) });
});

/**
 * Route an order and hand it on.
 *
 * FIX: the original hardcoded manufacturer → Lefty, always, for every
 * order. That throws away every judgement the routing agent exists to make:
 * whether a partner can actually produce the line at all, whether the order
 * has to be split, whether the promised delivery date is reachable. A
 * hardcoded chain will happily send an embroidered piece to a print-only
 * facility and find out six weeks later.
 */
async function processOrder({ order_id, sku, qty, customer, product }) {
  const setStatus = (status, fields = {}) => {
    const cols = Object.keys(fields);
    const sql = `UPDATE orders SET status = ?, updated_at = datetime('now')`
      + cols.map((c) => `, ${c} = ?`).join('')
      + ` WHERE order_id = ?`;
    return run(sql, [status, ...cols.map((c) => fields[c]), order_id]);
  };

  await setStatus(STATUS.ROUTING);

  const { routing } = await pipeline.order({
    id: order_id,
    service_level: customer.service_level || 'standard',
    line_items: [{ sku, quantity: qty, category: product.category, techpack_url: product.techpack_url }],
    destination: customer.address,
  });

  await setStatus(STATUS.ROUTED, { routing_json: JSON.stringify(routing) });

  // An unroutable order is a real answer, not a failure. It needs a person,
  // and saying so is a five-minute fix rather than a lost fortnight.
  if (!routing.route) {
    await setStatus(STATUS.NEEDS_HUMAN, { last_error: routing.unroutable_reason || 'Could not be routed' });
    return;
  }

  // A blocker from the routing agent stops the order here, on purpose.
  const blockers = (routing.flags || []).filter((f) => f.severity === 'blocker');
  if (blockers.length) {
    await setStatus(STATUS.NEEDS_HUMAN, { last_error: blockers.map((b) => b.issue).join('; ') });
    return;
  }

  const partners = require('../partners');
  const results = { manufacturer: [], distributor: [] };

  for (const shipment of routing.route.shipments) {
    const mfg = await partners.get(shipment.manufacturer).submit({
      order_id, sku, qty, customer, techpack_url: product.techpack_url,
    });
    results.manufacturer.push(mfg);

    // FIX: the original treated any response at all as success. Check the
    // flag, and stop rather than pretending the next step happened.
    if (!mfg.accepted && !mfg.ok) {
      await setStatus(STATUS.NEEDS_HUMAN, {
        manufacturer_json: JSON.stringify(results.manufacturer),
        last_error: `${shipment.manufacturer} did not accept the order`,
      });
      return;
    }

    const dist = await partners.get(shipment.distributor).submit({
      order_id, sku, qty, customer, manufacturer_reference: mfg.reference,
    });
    results.distributor.push(dist);
  }

  await setStatus(STATUS.AT_MANUFACTURER, {
    manufacturer_json: JSON.stringify(results.manufacturer),
    distributor_json: JSON.stringify(results.distributor),
  });

  events.emit(events.TYPES.PARTNER_RESPONSE, { order_id, results });

  /* Nothing sets SHIPPED here, and that is the point. Shipped means a
     carrier has the parcel and there is a tracking number to prove it.
     That arrives on a partner webhook, later — not from our own optimism. */
}

app.post('/api/orders/:order_id/shipped', requireKey, async (req, res) => {
  const { tracking } = req.body || {};
  if (!tracking) return res.status(400).json({ error: 'A tracking number is what makes an order shipped.' });

  const r = await run(
    `UPDATE orders SET status = ?, tracking = ?, updated_at = datetime('now') WHERE order_id = ?`,
    [STATUS.SHIPPED, tracking, req.params.order_id]
  );
  if (!r.changes) return res.status(404).json({ error: 'not_found' });
  res.json({ ok: true, status: STATUS.SHIPPED, tracking });
});

function publicOrder(row) {
  const parse = (s) => { try { return s ? JSON.parse(s) : null; } catch { return null; } };
  return {
    order_id: row.order_id, sku: row.sku, qty: row.qty, status: row.status,
    tracking: row.tracking, last_error: row.last_error,
    routing: parse(row.routing_json),
    manufacturer: parse(row.manufacturer_json),
    distributor: parse(row.distributor_json),
    created_at: row.created_at, updated_at: row.updated_at,
  };
}

/* ── serving uploads ─────────────────────────────────────────────────────
   FIX: the original served this directory with a plain express.static and
   no upload restrictions. An uploaded HTML file would then execute on your
   own origin. The filter above stops it being uploaded; these headers stop
   it executing even if something slips through. Belt and braces, because
   this one is a full compromise of the admin session. */
app.use('/uploads', express.static(UPLOAD_DIR, {
  index: false,
  dotfiles: 'deny',
  setHeaders(res) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Disposition', 'attachment');
    res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
  },
}));

/** Multer's own errors are useful; surfacing them saves an hour of guessing. */
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    const human = {
      LIMIT_FILE_SIZE: `A file was over the ${MAX_UPLOAD_BYTES / 1024 / 1024}MB limit.`,
      LIMIT_FILE_COUNT: `More than ${MAX_FILES} files.`,
      LIMIT_UNEXPECTED_FILE: `Unexpected field "${err.field}". Use "images" or "techpack".`,
    };
    return res.status(413).json({ error: 'upload_rejected', detail: human[err.code] || err.message });
  }
  if (err) {
    console.error('[error]', err);
    return res.status(400).json({ error: 'bad_request', detail: err.message });
  }
  next();
});

async function start() {
  await migrate();
  const server = app.listen(PORT, () => {
    console.log(`\n  Self-Made Legends — commerce API  →  http://localhost:${PORT}`);
    console.log(`  Database:  ${DB_PATH}`);
    console.log(`  Uploads:   ${UPLOAD_DIR}`);
    console.log(`  Routing:   through the Order Routing agent${process.env.SML_AGENTS_STUB === '1' ? ' (stub mode)' : ''}\n`);
  });

  // Finish in-flight requests rather than cutting them off mid-write.
  for (const sig of ['SIGTERM', 'SIGINT']) {
    process.on(sig, () => {
      console.log(`\n  ${sig} — closing.`);
      server.close(() => db.close(() => process.exit(0)));
      setTimeout(() => process.exit(1), 10000).unref();
    });
  }
}

if (require.main === module) start().catch((err) => { console.error(err); process.exit(1); });

module.exports = { app, start, STATUS, migrate, db };
