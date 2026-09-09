'use strict';

// Accounts and sessions. bcryptjs (pure JS) for password hashing, random
// 32-byte tokens for sessions, 30-day expiry, all in SQLite.

const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const SESSION_MS = 30 * 24 * 3600 * 1000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

class Auth {
  constructor(db, opts = {}) {
    this.db = db;
    this.now = opts.now || (() => Date.now());
    this.rounds = opts.rounds || 10;
  }

  register({ email, password, displayName }) {
    email = String(email || '').trim().toLowerCase();
    displayName = String(displayName || '').trim().slice(0, 40);
    if (!EMAIL_RE.test(email)) throw new Error('Enter a valid email');
    if (!displayName) throw new Error('Pick a name for the leaderboard');
    if (String(password || '').length < 8) throw new Error('Password must be at least 8 characters');
    if (this.db.prepare('SELECT 1 FROM users WHERE email = ?').get(email)) throw new Error('That email already has an account');
    const id = crypto.randomBytes(12).toString('hex');
    this.db.prepare('INSERT INTO users (id, email, display_name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(id, email, displayName, bcrypt.hashSync(password, this.rounds), this.now());
    return this._issue(id);
  }

  login({ email, password }) {
    email = String(email || '').trim().toLowerCase();
    const user = this.db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user || !bcrypt.compareSync(String(password || ''), user.password_hash)) throw new Error('Wrong email or password');
    return this._issue(user.id);
  }

  _issue(userId) {
    const token = crypto.randomBytes(32).toString('base64url');
    const now = this.now();
    this.db.prepare('INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)').run(token, userId, now, now + SESSION_MS);
    return { token, user: this.user(userId) };
  }

  verify(token) {
    if (!token) return null;
    const s = this.db.prepare('SELECT user_id, expires_at FROM sessions WHERE token = ?').get(token);
    if (!s) return null;
    if (s.expires_at < this.now()) { this.db.prepare('DELETE FROM sessions WHERE token = ?').run(token); return null; }
    return this.user(s.user_id);
  }

  logout(token) { this.db.prepare('DELETE FROM sessions WHERE token = ?').run(token); }

  user(id) {
    const u = this.db.prepare('SELECT id, email, display_name, created_at FROM users WHERE id = ?').get(id);
    return u ? { id: u.id, email: u.email, displayName: u.display_name, createdAt: u.created_at } : null;
  }

  /** Express middleware: requires a bearer token or x-session-token header. */
  middleware() {
    return (req, res, next) => {
      const h = req.headers.authorization || '';
      const token = h.startsWith('Bearer ') ? h.slice(7) : req.headers['x-session-token'];
      const user = this.verify(token);
      if (!user) return res.status(401).json({ error: 'Sign in to continue' });
      req.user = user;
      req.token = token;
      next();
    };
  }
}

module.exports = Auth;
