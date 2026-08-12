const axios = require("axios");

class NFTDataFetcher {
  constructor(openSeaApiKey = "") {
    this.cache = new Map();
    this.cacheExpiry = 5 * 60 * 1000;
    this.openSeaApiKey = openSeaApiKey;
    this.baseUrl = "https://api.opensea.io/api/v1";
  }

  async fetchCollectionData(collectionSlug) {
    const cacheKey = `nft-${collectionSlug}`;
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.data;
    }

    try {
      const response = await axios.get(
        `${this.baseUrl}/collection/${collectionSlug}`,
        {
          headers: this.openSeaApiKey ? { "X-API-KEY": this.openSeaApiKey } : {},
        }
      );

      const collection = response.data.collection;

      const data = {
        name: collection.name,
        slug: collectionSlug,
        image: collection.image_url,
        description: collection.description,
        floorPrice: collection.stats?.floor_price || 0,
        floorPriceCurrency: "ETH",
        volume24h: collection.stats?.twenty_four_hour_volume || 0,
        volumeChange24h: collection.stats?.twenty_four_hour_change || 0,
        owners: collection.stats?.num_owners || 0,
        items: collection.stats?.total_supply || 0,
        trades24h: collection.stats?.twenty_four_hour_sales || 0,
        avgPrice24h: collection.stats?.average_price || 0,
        royalty: collection.royalty_fee_basis_points / 100 || 0,
        timestamp: new Date(),
      };

      this.cache.set(cacheKey, { data, timestamp: Date.now() });

      return data;
    } catch (error) {
      console.error(`Error fetching NFT collection ${collectionSlug}:`, error.message);
      return {
        error: error.message,
        slug: collectionSlug,
      };
    }
  }

  async fetchNFTAsset(collectionSlug, tokenId) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/asset/${collectionSlug}/${tokenId}`,
        {
          headers: this.openSeaApiKey ? { "X-API-KEY": this.openSeaApiKey } : {},
        }
      );

      const asset = response.data;

      return {
        tokenId,
        name: asset.name,
        description: asset.description,
        image: asset.image_url,
        externalUrl: asset.external_url,
        lastSalePrice: asset.last_sale?.total_price,
        lastSaleDate: asset.last_sale?.event_timestamp,
        owner: asset.owner?.user?.username,
        collection: asset.collection?.name,
        traits: asset.traits || [],
        rarity: this.calculateRarity(asset.traits),
        lastUpdated: new Date(),
      };
    } catch (error) {
      console.error(`Error fetching NFT asset:`, error.message);
      return { error: error.message };
    }
  }

  async searchCollections(query, limit = 10) {
    try {
      const response = await axios.get(`${this.baseUrl}/collections`, {
        params: {
          asset_owner: query,
          offset: 0,
          limit: limit,
        },
        headers: this.openSeaApiKey ? { "X-API-KEY": this.openSeaApiKey } : {},
      });

      return response.data.collections.map((col) => ({
        name: col.name,
        slug: col.slug,
        image: col.image_url,
        floorPrice: col.stats?.floor_price || 0,
        volume24h: col.stats?.twenty_four_hour_volume || 0,
      }));
    } catch (error) {
      console.error("Error searching collections:", error.message);
      return [];
    }
  }

  async fetchTrendingCollections(limit = 20) {
    try {
      const mockTrending = [
        {
          name: "Pudgy Penguins",
          slug: "pudgy-penguins",
          floorPrice: 2.5,
          volume24h: 850,
          change24h: 5.2,
        },
        {
          name: "Bored Ape Yacht Club",
          slug: "boredapeyachtclub",
          floorPrice: 38.5,
          volume24h: 2400,
          change24h: -2.1,
        },
        {
          name: "Azuki",
          slug: "azuki",
          floorPrice: 12.3,
          volume24h: 920,
          change24h: 3.8,
        },
        {
          name: "Doodles",
          slug: "doodles-official",
          floorPrice: 3.2,
          volume24h: 560,
          change24h: 1.5,
        },
        {
          name: "CloneX",
          slug: "clonex",
          floorPrice: 1.8,
          volume24h: 780,
          change24h: 4.2,
        },
      ];

      return mockTrending.slice(0, limit);
    } catch (error) {
      console.error("Error fetching trending collections:", error.message);
      return [];
    }
  }

  calculateRarity(traits) {
    if (!traits || traits.length === 0) return 50;

    const traitRarity = traits.reduce((sum, trait) => sum + (trait.trait_count ? 100 / trait.trait_count : 0), 0);
    const avgRarity = traitRarity / Math.max(traits.length, 1);

    return Math.min(100, Math.max(0, avgRarity));
  }

  convertEthToUsd(ethAmount, ethPrice = 2000) {
    return ethAmount * ethPrice;
  }

  clearCache() {
    this.cache.clear();
  }
}

module.exports = NFTDataFetcher;
