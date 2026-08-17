const crypto = require("crypto");

class TokenCreator {
  constructor() {
    this.userTokens = new Map(); // userId -> array of tokens created
    this.tokenRegistry = new Map(); // tokenAddress -> tokenDetails
    this.tokenPrices = new Map(); // tokenAddress -> current price
    this.tokenHolders = new Map(); // tokenAddress -> Map of (userId -> balance)
    this.tokenTransactions = []; // History of all token transactions
  }

  // Create a new custom token
  createToken(userId, tokenData) {
    const {
      name,
      symbol,
      totalSupply,
      decimals = 18,
      description = "",
      imageUrl = "",
    } = tokenData;

    // Validate token data
    if (!name || !symbol || !totalSupply) {
      return { success: false, error: "Missing required token data" };
    }

    if (symbol.length > 10) {
      return { success: false, error: "Symbol must be 10 characters or less" };
    }

    if (totalSupply <= 0) {
      return { success: false, error: "Total supply must be greater than 0" };
    }

    // Generate unique token address (like ERC-20 contract address)
    const tokenAddress = this.generateTokenAddress();

    const token = {
      address: tokenAddress,
      creator: userId,
      name,
      symbol,
      totalSupply: BigInt(totalSupply) * BigInt(10 ** decimals),
      decimals,
      description,
      imageUrl,
      createdAt: new Date().toISOString(),
      holders: 1,
      transfers: 0,
      isVerified: false, // Can be verified by team
      status: "active",
    };

    // Register token
    this.tokenRegistry.set(tokenAddress, token);

    // Initialize token holders (creator gets 100% of supply)
    const holders = new Map();
    holders.set(userId, token.totalSupply);
    this.tokenHolders.set(tokenAddress, holders);

    // Set initial price (0.01 SML Bucks — virtual currency only, no real-world monetary value)
    this.tokenPrices.set(tokenAddress, 0.01);

    // Track user's tokens
    if (!this.userTokens.has(userId)) {
      this.userTokens.set(userId, []);
    }
    this.userTokens.get(userId).push(tokenAddress);

    return {
      success: true,
      token: {
        address: tokenAddress,
        name,
        symbol,
        totalSupply: totalSupply.toString(),
        decimals,
        description,
        createdAt: token.createdAt,
      },
    };
  }

  // Generate unique token address (64 hex characters like Ethereum)
  generateTokenAddress() {
    return "0x" + crypto.randomBytes(20).toString("hex");
  }

  // Get token details
  getToken(tokenAddress) {
    const token = this.tokenRegistry.get(tokenAddress);
    if (!token) return null;

    return {
      ...token,
      totalSupply: token.totalSupply.toString(),
      currentPrice: this.tokenPrices.get(tokenAddress),
      marketCap: (
        (Number(token.totalSupply) / 10 ** token.decimals) *
        this.tokenPrices.get(tokenAddress)
      ).toFixed(2),
    };
  }

  // Get all tokens created by user
  getUserTokens(userId) {
    const tokens = this.userTokens.get(userId) || [];
    return tokens.map((address) => this.getToken(address)).filter(Boolean);
  }

  // Get user's balance of a token
  getUserTokenBalance(userId, tokenAddress) {
    const holders = this.tokenHolders.get(tokenAddress);
    if (!holders) return null;

    const balance = holders.get(userId) || BigInt(0);
    const token = this.tokenRegistry.get(tokenAddress);

    return {
      balance: balance.toString(),
      balanceFormatted: (Number(balance) / 10 ** token.decimals).toFixed(8),
      tokenSymbol: token.symbol,
    };
  }

  // Transfer tokens between users
  transferToken(fromUserId, toUserId, tokenAddress, amount) {
    const token = this.tokenRegistry.get(tokenAddress);
    if (!token) {
      return { success: false, error: "Token not found" };
    }

    const holders = this.tokenHolders.get(tokenAddress);
    const transferAmount = BigInt(Math.floor(amount * 10 ** token.decimals));

    const fromBalance = holders.get(fromUserId) || BigInt(0);
    if (fromBalance < transferAmount) {
      return { success: false, error: "Insufficient balance" };
    }

    // Execute transfer
    holders.set(fromUserId, fromBalance - transferAmount);

    const toBalance = holders.get(toUserId) || BigInt(0);
    holders.set(toUserId, toBalance + transferAmount);

    // Track transaction
    const transaction = {
      id: crypto.randomBytes(16).toString("hex"),
      timestamp: new Date().toISOString(),
      from: fromUserId,
      to: toUserId,
      tokenAddress,
      amount: amount.toString(),
      type: "transfer",
    };

    this.tokenTransactions.push(transaction);
    token.transfers++;

    return { success: true, transaction };
  }

  // Buy tokens on the platform
  buyToken(userId, tokenAddress, amount, paymentAmount) {
    const token = this.tokenRegistry.get(tokenAddress);
    if (!token) {
      return { success: false, error: "Token not found" };
    }

    const currentPrice = this.tokenPrices.get(tokenAddress);
    const expectedCost = amount * currentPrice;

    // Allow for small rounding differences
    if (Math.abs(expectedCost - paymentAmount) > 0.01) {
      return { success: false, error: "Payment amount does not match token price" };
    }

    const holders = this.tokenHolders.get(tokenAddress);
    const transferAmount = BigInt(Math.floor(amount * 10 ** token.decimals));

    const userBalance = holders.get(userId) || BigInt(0);
    holders.set(userId, userBalance + transferAmount);

    // Increase price slightly with each purchase (simple demand model)
    const newPrice = currentPrice * 1.001;
    this.tokenPrices.set(tokenAddress, newPrice);

    const transaction = {
      id: crypto.randomBytes(16).toString("hex"),
      timestamp: new Date().toISOString(),
      buyer: userId,
      tokenAddress,
      amount: amount.toString(),
      price: currentPrice,
      total: paymentAmount.toString(),
      type: "buy",
    };

    this.tokenTransactions.push(transaction);
    token.transfers++;

    return { success: true, transaction };
  }

  // Sell tokens on the platform
  sellToken(userId, tokenAddress, amount) {
    const token = this.tokenRegistry.get(tokenAddress);
    if (!token) {
      return { success: false, error: "Token not found" };
    }

    const holders = this.tokenHolders.get(tokenAddress);
    const transferAmount = BigInt(Math.floor(amount * 10 ** token.decimals));

    const userBalance = holders.get(userId) || BigInt(0);
    if (userBalance < transferAmount) {
      return { success: false, error: "Insufficient token balance" };
    }

    holders.set(userId, userBalance - transferAmount);

    const currentPrice = this.tokenPrices.get(tokenAddress);
    const saleAmount = amount * currentPrice;

    // Decrease price slightly with each sale (simple supply model)
    const newPrice = Math.max(currentPrice * 0.999, 0.001);
    this.tokenPrices.set(tokenAddress, newPrice);

    const transaction = {
      id: crypto.randomBytes(16).toString("hex"),
      timestamp: new Date().toISOString(),
      seller: userId,
      tokenAddress,
      amount: amount.toString(),
      price: currentPrice,
      total: saleAmount.toString(),
      type: "sell",
    };

    this.tokenTransactions.push(transaction);
    token.transfers++;

    return { success: true, transaction, proceeds: saleAmount };
  }

  // Get token price history
  getTokenHistory(tokenAddress, limit = 50) {
    const transactions = this.tokenTransactions
      .filter((t) => t.tokenAddress === tokenAddress)
      .slice(-limit);

    return transactions;
  }

  // Get all created tokens (marketplace)
  getAllTokens(limit = 100) {
    const tokens = Array.from(this.tokenRegistry.values()).slice(-limit);

    return tokens.map((token) => ({
      address: token.address,
      name: token.name,
      symbol: token.symbol,
      creator: token.creator,
      description: token.description,
      currentPrice: this.tokenPrices.get(token.address),
      holders: token.holders,
      transfers: token.transfers,
      isVerified: token.isVerified,
      createdAt: token.createdAt,
    }));
  }

  // Get token stats
  getTokenStats(tokenAddress) {
    const token = this.tokenRegistry.get(tokenAddress);
    if (!token) return null;

    const holders = this.tokenHolders.get(tokenAddress);
    const holderCount = holders ? holders.size : 0;
    const currentPrice = this.tokenPrices.get(tokenAddress);

    const tokenTransactionHistory = this.tokenTransactions.filter(
      (t) => t.tokenAddress === tokenAddress
    );

    return {
      address: tokenAddress,
      name: token.name,
      symbol: token.symbol,
      totalSupply: (Number(token.totalSupply) / 10 ** token.decimals).toFixed(8),
      holders: holderCount,
      transfers: token.transfers,
      currentPrice: currentPrice.toFixed(8),
      marketCap: (
        (Number(token.totalSupply) / 10 ** token.decimals) *
        currentPrice
      ).toFixed(2),
      createdAt: token.createdAt,
      transactionCount: tokenTransactionHistory.length,
    };
  }

  // Verify token (admin function)
  verifyToken(tokenAddress) {
    const token = this.tokenRegistry.get(tokenAddress);
    if (!token) {
      return { success: false, error: "Token not found" };
    }

    token.isVerified = true;
    return { success: true, message: "Token verified" };
  }

  // Get leaderboard of top tokens by market cap
  getTopTokensByMarketCap(limit = 20) {
    const tokensWithCap = Array.from(this.tokenRegistry.values()).map((token) => {
      const price = this.tokenPrices.get(token.address) || 0.01;
      const marketCap =
        (Number(token.totalSupply) / 10 ** token.decimals) *
        price;

      return {
        address: token.address,
        name: token.name,
        symbol: token.symbol,
        marketCap,
        price: price.toFixed(8),
        holders: this.tokenHolders.get(token.address)?.size || 0,
      };
    });

    return tokensWithCap.sort((a, b) => b.marketCap - a.marketCap).slice(0, limit);
  }
}

module.exports = TokenCreator;
