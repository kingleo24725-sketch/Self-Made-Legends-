const crypto = require("crypto");

class AccountManager {
  constructor() {
    this.accounts = new Map();
    this.sessions = new Map();
  }

  createAccount(email, password, fullName) {
    if (this.accounts.has(email)) {
      return { success: false, error: "Account already exists" };
    }

    const userId = crypto.randomBytes(16).toString("hex");
    const passwordHash = this.hashPassword(password);
    const apiKey = this.generateApiKey();

    const account = {
      userId,
      email,
      fullName,
      passwordHash,
      apiKey,
      createdAt: new Date(),
      status: "active",
      verified: false,
      balances: {
        usd: 1,
        crypto: {},
        nft: {},
      },
      wallets: [],
      settings: {
        twoFactorEnabled: false,
        notificationsEnabled: true,
      },
      limits: {
        dailyWithdrawal: 50000,
        monthlyWithdrawal: 500000,
      },
    };

    this.accounts.set(email, account);

    return {
      success: true,
      userId,
      message: "Account created successfully",
    };
  }

  login(email, password) {
    const account = this.accounts.get(email);

    if (!account) {
      return { success: false, error: "Account not found" };
    }

    if (!this.verifyPassword(password, account.passwordHash)) {
      return { success: false, error: "Invalid password" };
    }

    const sessionId = crypto.randomBytes(32).toString("hex");
    const sessionToken = this.generateSessionToken();

    this.sessions.set(sessionId, {
      userId: account.userId,
      email,
      token: sessionToken,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    return {
      success: true,
      sessionId,
      token: sessionToken,
      userId: account.userId,
      email,
    };
  }

  verifySession(sessionId) {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return { valid: false, error: "Session not found" };
    }

    if (new Date() > session.expiresAt) {
      this.sessions.delete(sessionId);
      return { valid: false, error: "Session expired" };
    }

    return { valid: true, userId: session.userId, email: session.email };
  }

  getAccount(email) {
    return this.accounts.get(email);
  }

  getAccountById(userId) {
    for (const account of this.accounts.values()) {
      if (account.userId === userId) return account;
    }
    return null;
  }

  updateAvatar(userId, avatarDataUrl) {
    const account = this.getAccountById(userId);
    if (!account) return { success: false, error: "Account not found" };
    // Enforce max ~200KB base64 (≈ 150KB image)
    if (avatarDataUrl && avatarDataUrl.length > 200000) {
      return { success: false, error: "Image too large — please use a smaller photo" };
    }
    account.avatar = avatarDataUrl || null;
    return { success: true };
  }

  getAvatar(userId) {
    const account = this.getAccountById(userId);
    return account ? (account.avatar || null) : null;
  }

  addWallet(email, walletType, walletAddress, label) {
    const account = this.accounts.get(email);
    if (!account) return { success: false, error: "Account not found" };

    const wallet = {
      id: crypto.randomBytes(8).toString("hex"),
      type: walletType,
      address: walletAddress,
      label,
      verified: false,
      addedAt: new Date(),
    };

    account.wallets.push(wallet);

    return {
      success: true,
      walletId: wallet.id,
      message: "Wallet added successfully",
    };
  }

  updateBalance(email, assetType, amount) {
    const account = this.accounts.get(email);
    if (!account) return { success: false, error: "Account not found" };

    if (assetType === "usd") {
      account.balances.usd += amount;
    } else if (assetType.startsWith("crypto_")) {
      const symbol = assetType.replace("crypto_", "").toUpperCase();
      if (!account.balances.crypto[symbol]) {
        account.balances.crypto[symbol] = 0;
      }
      account.balances.crypto[symbol] += amount;
    } else if (assetType.startsWith("nft_")) {
      const nftId = assetType.replace("nft_", "");
      if (!account.balances.nft[nftId]) {
        account.balances.nft[nftId] = 0;
      }
      account.balances.nft[nftId] += 1;
    }

    return { success: true, newBalance: account.balances };
  }

  getBalance(email) {
    const account = this.accounts.get(email);
    if (!account) return { success: false, error: "Account not found" };

    return {
      success: true,
      balances: account.balances,
    };
  }

  getTotalPortfolioValue(email, currentPrices = {}) {
    const account = this.accounts.get(email);
    if (!account) return 0;

    let totalValue = account.balances.usd;

    for (const [symbol, amount] of Object.entries(account.balances.crypto)) {
      if (currentPrices[symbol]) {
        totalValue += amount * currentPrices[symbol];
      }
    }

    for (const [nftId, count] of Object.entries(account.balances.nft)) {
      if (currentPrices[nftId]) {
        totalValue += count * currentPrices[nftId];
      }
    }

    return totalValue;
  }

  hashPassword(password) {
    return crypto.createHash("sha256").update(password).digest("hex");
  }

  verifyPassword(password, hash) {
    return this.hashPassword(password) === hash;
  }

  generateApiKey() {
    return "sk_" + crypto.randomBytes(32).toString("hex");
  }

  generateSessionToken() {
    return crypto.randomBytes(32).toString("hex");
  }

  logout(sessionId) {
    this.sessions.delete(sessionId);
    return { success: true, message: "Logged out successfully" };
  }
}

module.exports = AccountManager;
