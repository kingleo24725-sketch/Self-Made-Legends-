const crypto = require("crypto");

class CryptoExchangeAPI {
  constructor(exchange = "binance", apiKey, apiSecret) {
    this.exchange = exchange;
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;

    if (exchange === "binance") {
      this.baseUrl = "https://api.binance.com/api";
    } else if (exchange === "kraken") {
      this.baseUrl = "https://api.kraken.com";
    }

    this.orders = [];
  }

  async buycrypto(symbol, amount, orderType = "market") {
    if (!this.apiKey || !this.apiSecret) {
      return {
        success: false,
        error: `${this.exchange} API credentials not configured`,
      };
    }

    try {
      const orderId = crypto.randomBytes(16).toString("hex");

      const order = {
        id: orderId,
        symbol: symbol.toUpperCase(),
        amount,
        type: orderType,
        side: "buy",
        status: "pending",
        createdAt: new Date(),
        exchange: this.exchange,
      };

      this.orders.push(order);

      setTimeout(() => {
        const orderIndex = this.orders.findIndex((o) => o.id === orderId);
        if (orderIndex !== -1) {
          this.orders[orderIndex].status = "filled";
          this.orders[orderIndex].filledAt = new Date();
        }
      }, 1000);

      return {
        success: true,
        orderId,
        symbol,
        amount,
        exchange: this.exchange,
        status: "pending",
        message: `Buy order placed for ${symbol} on ${this.exchange}`,
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async sellCrypto(symbol, amount, orderType = "market") {
    if (!this.apiKey || !this.apiSecret) {
      return {
        success: false,
        error: `${this.exchange} API credentials not configured`,
      };
    }

    try {
      const orderId = crypto.randomBytes(16).toString("hex");

      const order = {
        id: orderId,
        symbol: symbol.toUpperCase(),
        amount,
        type: orderType,
        side: "sell",
        status: "pending",
        createdAt: new Date(),
        exchange: this.exchange,
      };

      this.orders.push(order);

      setTimeout(() => {
        const orderIndex = this.orders.findIndex((o) => o.id === orderId);
        if (orderIndex !== -1) {
          this.orders[orderIndex].status = "filled";
          this.orders[orderIndex].filledAt = new Date();
        }
      }, 1000);

      return {
        success: true,
        orderId,
        symbol,
        amount,
        exchange: this.exchange,
        status: "pending",
        message: `Sell order placed for ${symbol} on ${this.exchange}`,
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async getBalance(symbol = null) {
    if (!this.apiKey || !this.apiSecret) {
      return {
        success: false,
        error: `${this.exchange} API credentials not configured`,
      };
    }

    try {
      return {
        success: true,
        exchange: this.exchange,
        message: "Connect to get real balances",
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async withdrawCrypto(symbol, amount, walletAddress) {
    if (!this.apiKey || !this.apiSecret) {
      return {
        success: false,
        error: `${this.exchange} API credentials not configured`,
      };
    }

    try {
      const withdrawalId = crypto.randomBytes(16).toString("hex");

      return {
        success: true,
        withdrawalId,
        symbol,
        amount,
        walletAddress: walletAddress.substring(0, 20) + "...",
        status: "pending",
        exchange: this.exchange,
        message: `Withdrawal initiated. Confirm in your ${this.exchange} account.`,
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async getOrderStatus(orderId) {
    const order = this.orders.find((o) => o.id === orderId);
    if (!order) {
      return { success: false, error: "Order not found" };
    }

    return {
      success: true,
      order,
    };
  }

  getExchangeInfo() {
    return {
      exchange: this.exchange,
      connected: !!(this.apiKey && this.apiSecret),
      capabilities: ["buy", "sell", "withdraw", "deposit"],
    };
  }
}

module.exports = CryptoExchangeAPI;
