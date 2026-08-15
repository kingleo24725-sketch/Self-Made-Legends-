'use strict';

const crypto = require('crypto');
const db = require('../database/db');

class AccountManager {
  constructor() {
    this.accounts = new Map(); // email -> account
    this.sessions = new Map(); // sessionId -> session (ephemeral, not persisted)
  }

  // ── Restore from DB on startup ──────────────────────────────────────────
  async restore() {
    const rows = await db.all('SELECT * FROM accounts');
    for (const row of rows) {
      this.accounts.set(row.email, {
        userId:          row.user_id,
        email:           row.email,
        fullName:        row.full_name,
        passwordHash:    row.password_hash,
        apiKey:          row.api_key,
        avatar:          row.avatar || null,
        avatarName:      row.avatar_name || '',
        tagline:         row.tagline || '',
        gender:          row.gender || null,
        tier:            row.tier || 'free',
        isCreatorMember: !!row.is_creator,
        status:          row.status || 'active',
        wallets:         JSON.parse(row.wallets || '[]'),
        balances:        JSON.parse(row.balances || '{"usd":1,"crypto":{},"nft":{}}'),
        settings:        JSON.parse(row.settings || '{}'),
        createdAt:       row.created_at ? new Date(row.created_at) : new Date(),
      });
    }
    console.log(`✅ AccountManager: restored ${rows.length} accounts`);
  }

  _persist(account) {
    db.run(
      `INSERT INTO accounts
        (email, user_id, full_name, password_hash, api_key, avatar, avatar_name,
         tagline, gender, tier, is_creator, status, wallets, balances, settings, created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
       ON CONFLICT(email) DO UPDATE SET
         full_name=excluded.full_name, password_hash=excluded.password_hash,
         api_key=excluded.api_key, avatar=excluded.avatar,
         avatar_name=excluded.avatar_name, tagline=excluded.tagline,
         gender=excluded.gender, tier=excluded.tier,
         is_creator=excluded.is_creator, status=excluded.status,
         wallets=excluded.wallets, balances=excluded.balances,
         settings=excluded.settings`,
      [
        account.email, account.userId, account.fullName, account.passwordHash,
        account.apiKey, account.avatar || null, account.avatarName || '',
        account.tagline || '', account.gender || null, account.tier || 'free',
        account.isCreatorMember ? 1 : 0, account.status || 'active',
        JSON.stringify(account.wallets || []),
        JSON.stringify(account.balances || { usd: 1, crypto: {}, nft: {} }),
        JSON.stringify(account.settings || {}),
        account.createdAt instanceof Date ? account.createdAt.getTime() : Date.now(),
      ]
    ).catch(e => console.error('AccountManager persist error:', e.message));
  }

  // ── Core CRUD ───────────────────────────────────────────────────────────
  createAccount(email, password, fullName) {
    if (this.accounts.has(email)) return { success: false, error: 'Account already exists' };

    const userId      = crypto.randomBytes(16).toString('hex');
    const passwordHash = this.hashPassword(password);
    const apiKey      = this.generateApiKey();

    const account = {
      userId, email, fullName, passwordHash, apiKey,
      createdAt: new Date(),
      status: 'active', verified: false,
      balances: { usd: 1, crypto: {}, nft: {} },
      wallets: [],
      settings: { twoFactorEnabled: false, notificationsEnabled: true },
      limits: { dailyWithdrawal: 50000, monthlyWithdrawal: 500000 },
    };

    this.accounts.set(email, account);
    this._persist(account);
    return { success: true, userId, message: 'Account created successfully' };
  }

  login(email, password) {
    const account = this.accounts.get(email);
    if (!account) return { success: false, error: 'Account not found' };
    if (!this.verifyPassword(password, account.passwordHash)) return { success: false, error: 'Invalid password' };

    const sessionId = crypto.randomBytes(32).toString('hex');
    this.sessions.set(sessionId, {
      userId: account.userId, email,
      token: crypto.randomBytes(32).toString('hex'),
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    return { success: true, sessionId, userId: account.userId, email };
  }

  verifySession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return { valid: false, error: 'Session not found' };
    if (new Date() > session.expiresAt) {
      this.sessions.delete(sessionId);
      return { valid: false, error: 'Session expired' };
    }
    return { valid: true, userId: session.userId, email: session.email };
  }

  logout(sessionId) {
    this.sessions.delete(sessionId);
    return { success: true, message: 'Logged out successfully' };
  }

  getAccount(email) { return this.accounts.get(email) || null; }

  getAccountById(userId) {
    for (const a of this.accounts.values()) {
      if (a.userId === userId) return a;
    }
    return null;
  }

  getAllAccounts() {
    return [...this.accounts.values()];
  }

  // ── Profile fields ──────────────────────────────────────────────────────
  updateAvatar(userId, avatarDataUrl) {
    const account = this.getAccountById(userId);
    if (!account) return { success: false, error: 'Account not found' };
    if (avatarDataUrl && avatarDataUrl.length > 200000) return { success: false, error: 'Image too large' };
    account.avatar = avatarDataUrl || null;
    this._persist(account);
    return { success: true };
  }

  getAvatar(userId) {
    const account = this.getAccountById(userId);
    return account ? (account.avatar || null) : null;
  }

  setTagline(userId, avatarName, tagline) {
    const account = this.getAccountById(userId);
    if (!account) return { success: false, error: 'Account not found' };
    if (avatarName && avatarName.length > 30) return { success: false, error: 'Avatar name max 30 characters' };
    if (tagline && tagline.length > 160) return { success: false, error: 'Tagline max 160 characters' };
    account.avatarName = (avatarName || '').trim();
    account.tagline    = (tagline    || '').trim();
    this._persist(account);
    return { success: true };
  }

  getTagline(userId) {
    const account = this.getAccountById(userId);
    if (!account) return null;
    return { avatarName: account.avatarName || '', tagline: account.tagline || '' };
  }

  setGender(userId, gender) {
    const account = this.getAccountById(userId);
    if (!account) return { success: false, error: 'Account not found' };
    const allowed = ['male', 'female', 'other'];
    if (!allowed.includes(gender)) return { success: false, error: 'Invalid gender value' };
    account.gender = gender;
    this._persist(account);
    return { success: true };
  }

  getGender(userId) {
    const account = this.getAccountById(userId);
    return account ? (account.gender || null) : null;
  }

  // ── Wallets & Balances ──────────────────────────────────────────────────
  addWallet(email, walletType, walletAddress, label) {
    const account = this.accounts.get(email);
    if (!account) return { success: false, error: 'Account not found' };
    const wallet = {
      id: crypto.randomBytes(8).toString('hex'),
      type: walletType, address: walletAddress, label,
      verified: false, addedAt: new Date(),
    };
    account.wallets.push(wallet);
    this._persist(account);
    return { success: true, walletId: wallet.id, message: 'Wallet added successfully' };
  }

  getWallets(email) {
    const account = this.accounts.get(email);
    return account ? account.wallets : [];
  }

  updateBalance(email, assetType, amount) {
    const account = this.accounts.get(email);
    if (!account) return { success: false, error: 'Account not found' };
    if (assetType === 'usd') {
      account.balances.usd += amount;
    } else if (assetType.startsWith('crypto_')) {
      const sym = assetType.replace('crypto_', '').toUpperCase();
      account.balances.crypto[sym] = (account.balances.crypto[sym] || 0) + amount;
    } else if (assetType.startsWith('nft_')) {
      const id = assetType.replace('nft_', '');
      account.balances.nft[id] = (account.balances.nft[id] || 0) + 1;
    }
    this._persist(account);
    return { success: true, newBalance: account.balances };
  }

  getBalance(email) {
    const account = this.accounts.get(email);
    if (!account) return { success: false, error: 'Account not found' };
    return { success: true, balances: account.balances };
  }

  setCreatorMember(email, isCreator = true) {
    const account = this.accounts.get(email);
    if (!account) return { success: false, error: 'Account not found' };
    account.isCreatorMember = isCreator;
    account.tier = isCreator ? 'creator' : 'free';
    this._persist(account);
    return { success: true };
  }

  // Alias used by password reset flow
  getAccountByEmail(email) { return this.getAccount(email); }

  updatePassword(userId, newPassword) {
    const account = this.getAccountById(userId);
    if (!account) return { success: false, error: 'Account not found' };
    account.passwordHash = this.hashPassword(newPassword);
    this._persist(account);
    return { success: true };
  }

  banAccount(userId, reason) {
    const account = this.getAccountById(userId);
    if (!account) return { success: false, error: 'Account not found' };
    account.status = 'banned';
    account.banReason = reason;
    this._persist(account);
    return { success: true, message: `Account ${userId} banned` };
  }

  // ── Helpers ─────────────────────────────────────────────────────────────
  hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
  }
  verifyPassword(password, hash) {
    return this.hashPassword(password) === hash;
  }
  generateApiKey() { return 'sk_' + crypto.randomBytes(32).toString('hex'); }

  getTotalPortfolioValue(email, currentPrices = {}) {
    const account = this.accounts.get(email);
    if (!account) return 0;
    let total = account.balances.usd || 0;
    for (const [sym, amt] of Object.entries(account.balances.crypto || {})) {
      if (currentPrices[sym]) total += amt * currentPrices[sym];
    }
    for (const [id, cnt] of Object.entries(account.balances.nft || {})) {
      if (currentPrices[id]) total += cnt * currentPrices[id];
    }
    return total;
  }
}

module.exports = AccountManager;
