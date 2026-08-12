const crypto = require("crypto");

class AlpacaTradingAPI {
  constructor(apiKey, apiSecret, baseUrl = "https://paper-api.alpaca.markets") {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.baseUrl = baseUrl;
    this.isLiveTrading = baseUrl.includes("api.alpaca.markets");
  }

  async getAccount() {
    try {
      const response = await fetch(`${this.baseUrl}/v2/account`, {
        headers: {
          "APCA-API-KEY-ID": this.apiKey,
          "APCA-API-SECRET-KEY": this.apiSecret,
        },
      });

      const data = await response.json();

      return {
        success: response.ok,
        account: data,
        buyingPower: data.buying_power,
        portfolio_value: data.portfolio_value,
        cash: data.cash,
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async buyStock(symbol, quantity, orderType = "market") {
    if (!this.apiKey || !this.apiSecret) {
      return {
        success: false,
        error: "Alpaca API credentials not configured",
      };
    }

    try {
      const orderData = {
        symbol: symbol.toUpperCase(),
        qty: quantity,
        side: "buy",
        type: orderType,
        time_in_force: "day",
      };

      const response = await fetch(`${this.baseUrl}/v2/orders`, {
        method: "POST",
        headers: {
          "APCA-API-KEY-ID": this.apiKey,
          "APCA-API-SECRET-KEY": this.apiSecret,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(orderData),
      });

      const data = await response.json();

      if (response.ok) {
        return {
          success: true,
          orderId: data.id,
          symbol: data.symbol,
          quantity: data.qty,
          status: data.status,
          filledQty: data.filled_qty,
          avgFillPrice: data.filled_avg_price,
        };
      } else {
        return { success: false, error: data.message || "Order failed" };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async sellStock(symbol, quantity, orderType = "market") {
    if (!this.apiKey || !this.apiSecret) {
      return {
        success: false,
        error: "Alpaca API credentials not configured",
      };
    }

    try {
      const orderData = {
        symbol: symbol.toUpperCase(),
        qty: quantity,
        side: "sell",
        type: orderType,
        time_in_force: "day",
      };

      const response = await fetch(`${this.baseUrl}/v2/orders`, {
        method: "POST",
        headers: {
          "APCA-API-KEY-ID": this.apiKey,
          "APCA-API-SECRET-KEY": this.apiSecret,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(orderData),
      });

      const data = await response.json();

      if (response.ok) {
        return {
          success: true,
          orderId: data.id,
          symbol: data.symbol,
          quantity: data.qty,
          status: data.status,
        };
      } else {
        return { success: false, error: data.message || "Order failed" };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async getPositions() {
    try {
      const response = await fetch(`${this.baseUrl}/v2/positions`, {
        headers: {
          "APCA-API-KEY-ID": this.apiKey,
          "APCA-API-SECRET-KEY": this.apiSecret,
        },
      });

      const data = await response.json();

      if (Array.isArray(data)) {
        return {
          success: true,
          positions: data.map((p) => ({
            symbol: p.symbol,
            quantity: p.qty,
            currentPrice: p.current_price,
            costBasis: p.cost_basis,
            unrealizedGain: p.unrealized_gain,
            unrealizedGainPercent: p.unrealized_gain_pct,
          })),
        };
      } else {
        return { success: false, error: data.message };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async cancelOrder(orderId) {
    try {
      const response = await fetch(`${this.baseUrl}/v2/orders/${orderId}`, {
        method: "DELETE",
        headers: {
          "APCA-API-KEY-ID": this.apiKey,
          "APCA-API-SECRET-KEY": this.apiSecret,
        },
      });

      return { success: response.status === 204 };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  getMode() {
    return this.isLiveTrading ? "LIVE TRADING 🔴" : "PAPER TRADING 🟢";
  }
}

module.exports = AlpacaTradingAPI;
