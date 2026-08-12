const axios = require("axios");

class CryptoDataFetcher {
  constructor() {
    this.cache = new Map();
    this.cacheExpiry = 60 * 1000;
    this.cryptoSymbols = ["bitcoin", "ethereum", "cardano", "solana", "ripple"];
  }

  async fetchCryptoData(cryptoId) {
    const cacheKey = `crypto-${cryptoId}`;
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.data;
    }

    try {
      const response = await axios.get("https://api.coingecko.com/api/v3/coins/markets", {
        params: {
          ids: cryptoId,
          vs_currency: "usd",
          order: "market_cap_desc",
          per_page: 1,
          sparkline: true,
        },
      });

      if (!response.data || response.data.length === 0) {
        return { error: "No data found" };
      }

      const coin = response.data[0];
      const priceData = coin.sparkline_in_7d?.price || [];

      const data = {
        id: cryptoId,
        symbol: coin.symbol.toUpperCase(),
        name: coin.name,
        currentPrice: coin.current_price,
        marketCap: coin.market_cap,
        volume24h: coin.total_volume,
        change24h: coin.price_change_percentage_24h,
        change7d: coin.price_change_percentage_7d_in_currency,
        priceData: priceData.slice(-24),
        timestamp: new Date(),
      };

      this.cache.set(cacheKey, { data, timestamp: Date.now() });

      return data;
    } catch (error) {
      console.error(`Error fetching crypto data for ${cryptoId}:`, error.message);
      return { error: error.message };
    }
  }

  async fetchMultipleCryptos(cryptoIds) {
    const data = {};

    for (const cryptoId of cryptoIds) {
      data[cryptoId] = await this.fetchCryptoData(cryptoId);
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    return data;
  }

  async fetchCryptoPrices(cryptoIds) {
    try {
      const response = await axios.get("https://api.coingecko.com/api/v3/simple/price", {
        params: {
          ids: cryptoIds.join(","),
          vs_currencies: "usd",
          include_market_cap: true,
          include_24hr_vol: true,
          include_24hr_change: true,
        },
      });

      return response.data;
    } catch (error) {
      console.error("Error fetching crypto prices:", error.message);
      return {};
    }
  }

  async fetchTopCryptos(limit = 10) {
    try {
      const response = await axios.get("https://api.coingecko.com/api/v3/coins/markets", {
        params: {
          vs_currency: "usd",
          order: "market_cap_desc",
          per_page: limit,
          sparkline: false,
        },
      });

      return response.data.map((coin) => ({
        id: coin.id,
        symbol: coin.symbol.toUpperCase(),
        name: coin.name,
        currentPrice: coin.current_price,
        marketCap: coin.market_cap,
        change24h: coin.price_change_percentage_24h,
      }));
    } catch (error) {
      console.error("Error fetching top cryptos:", error.message);
      return [];
    }
  }

  clearCache() {
    this.cache.clear();
  }
}

module.exports = CryptoDataFetcher;
