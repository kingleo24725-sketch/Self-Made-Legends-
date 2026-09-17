const axios = require("axios");

class DataFetcher {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = "https://www.alphavantage.co/query";
    this.cache = new Map();
    this.cacheExpiry = 5 * 60 * 1000;
  }

  async fetchStockData(symbol) {
    const cacheKey = `${symbol}-daily`;
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.data;
    }

    try {
      const response = await axios.get(this.baseUrl, {
        params: {
          function: "TIME_SERIES_DAILY",
          symbol,
          apikey: this.apiKey,
          outputsize: "full",
        },
      });

      const timeSeries = response.data["Time Series (Daily)"];
      if (!timeSeries) {
        return { error: "No data found" };
      }

      const priceData = [];
      const volumeData = [];

      const dates = Object.keys(timeSeries)
        .sort()
        .slice(-100);

      for (const date of dates) {
        const dayData = timeSeries[date];
        priceData.push(parseFloat(dayData["4. close"]));
        volumeData.push(parseInt(dayData["5. volume"]));
      }

      const data = {
        symbol,
        priceData,
        volumeData,
        currentPrice: priceData[priceData.length - 1],
        timestamp: new Date(),
      };

      this.cache.set(cacheKey, { data, timestamp: Date.now() });

      return data;
    } catch (error) {
      console.error(`Error fetching data for ${symbol}:`, error.message);
      return { error: error.message };
    }
  }

  async fetchMultipleStocks(symbols) {
    const data = {};

    for (const symbol of symbols) {
      data[symbol] = await this.fetchStockData(symbol);
      await new Promise((resolve) => setTimeout(resolve, 250));
    }

    return data;
  }

  async fetchIntraday(symbol) {
    try {
      const response = await axios.get(this.baseUrl, {
        params: {
          function: "TIME_SERIES_INTRADAY",
          symbol,
          interval: "60min",
          apikey: this.apiKey,
        },
      });

      const timeSeries = response.data["Time Series (60min)"];
      if (!timeSeries) {
        return { error: "No intraday data found" };
      }

      const priceData = [];
      for (const timestamp in timeSeries) {
        priceData.push(parseFloat(timeSeries[timestamp]["4. close"]));
      }

      return {
        symbol,
        priceData,
        currentPrice: priceData[priceData.length - 1],
      };
    } catch (error) {
      console.error(`Error fetching intraday data for ${symbol}:`, error.message);
      return { error: error.message };
    }
  }

  clearCache() {
    this.cache.clear();
  }
}

module.exports = DataFetcher;
