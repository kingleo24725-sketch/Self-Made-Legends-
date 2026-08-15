// AI Marketing Agent — generates platform-specific promotional content
// for all 50 states and major US cities

const PLATFORMS = {
  twitter: { maxChars: 280, hashtagLimit: 3 },
  instagram: { maxChars: 2200, hashtagLimit: 30 },
  facebook: { maxChars: 63206, hashtagLimit: 10 },
  tiktok: { maxChars: 2200, hashtagLimit: 15 },
  reddit: { maxChars: 40000, hashtagLimit: 0 },
  discord: { maxChars: 2000, hashtagLimit: 0 },
};

const US_REGIONS = {
  northeast: ["New York", "Boston", "Philadelphia", "Baltimore", "Pittsburgh", "Providence", "Hartford"],
  southeast: ["Atlanta", "Miami", "Charlotte", "Nashville", "Orlando", "Tampa", "New Orleans", "Memphis"],
  midwest: ["Chicago", "Detroit", "Cleveland", "Indianapolis", "Columbus", "Minneapolis", "St. Louis", "Kansas City"],
  southwest: ["Houston", "Dallas", "Phoenix", "San Antonio", "Austin", "El Paso", "Albuquerque", "Las Vegas"],
  west: ["Los Angeles", "San Francisco", "Seattle", "Portland", "Denver", "Sacramento", "San Diego", "Oakland"],
  south: ["Birmingham", "Jackson", "Louisville", "Richmond", "Raleigh", "Columbia", "Little Rock"],
};

const ALL_STATES = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut",
  "Delaware", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa",
  "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan",
  "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire",
  "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio",
  "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota",
  "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia",
  "Wisconsin", "Wyoming",
];

const HOOKS = [
  "Turn $1 into a legend.",
  "The stock market just got a new boss.",
  "Play smart. Win big. Build a legacy.",
  "AI-powered trading — built for real people.",
  "Your money. Your rules. Your legend.",
  "The trading game where legends are made.",
  "From the block to the market — Self-Made Legends.",
  "No Wall Street degree required.",
  "Real trading. Real wins. Real legends.",
  "Level up your money game today.",
  "They said you couldn't do it. Prove them wrong.",
  "The only trading platform built for self-made people.",
  "Stop watching others win. Start playing.",
  "Build wealth like a legend.",
  "Your hustle + AI = Self-Made Legend.",
];

const CALLS_TO_ACTION = [
  "Sign up free today",
  "Join thousands of legends",
  "Start trading now",
  "Create your legend",
  "Get in the game",
  "Claim your spot on the leaderboard",
  "Download and start playing",
  "Join the movement",
];

const HASHTAG_POOL = {
  general: ["#SelfMadeLegends", "#TradingBot", "#StockMarket", "#AITrading", "#MakeMoneyOnline"],
  wealth: ["#WealthBuilding", "#FinancialFreedom", "#MoneyMoves", "#InvestSmart", "#PassiveIncome"],
  hustle: ["#HustleHard", "#SelfMade", "#Entrepreneur", "#Grind", "#BossUp"],
  gaming: ["#TradingGame", "#LeaderboardWins", "#WeeklyRewards", "#PlayToWin", "#CryptoGame"],
  regional: {
    northeast: ["#NewYorkMoney", "#BostonHustle", "#PhillyGrind"],
    southeast: ["#AtlantaMoney", "#MiamiHustle", "#NashvilleGrind"],
    midwest: ["#ChicagoMoney", "#DetroitHustle", "#MidwestGrind"],
    southwest: ["#TexasMoney", "#HoustonHustle", "#DallasGrind"],
    west: ["#LAMoney", "#BayAreaHustle", "#SeattleGrind"],
    south: ["#SouthernHustle", "#SouthernMoney", "#SouthernGrind"],
  },
};

const EMAIL_SUBJECTS = [
  "{city} — Are you the next Self-Made Legend?",
  "Attention {city}: The AI trading game is here",
  "{city} players are winning big — are you in?",
  "Your {city} hustle just got an upgrade",
  "The #1 trading game in {city} is Self-Made Legends",
  "From {city} to legend — start today",
  "{state} is on the leaderboard — where are you?",
];

class MarketingAgent {
  constructor() {
    this.campaigns = new Map();
    this.campaignCounter = 0;
    this.contentLibrary = [];
    this._buildContentLibrary();
  }

  _pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  _buildContentLibrary() {
    // Pre-generate a bank of content pieces on init
    for (const [region, cities] of Object.entries(US_REGIONS)) {
      for (const city of cities) {
        for (const platform of Object.keys(PLATFORMS)) {
          this.contentLibrary.push({
            platform,
            region,
            city,
            content: this._generateContent(platform, city, region),
            createdAt: Date.now(),
          });
        }
      }
    }
  }

  _generateContent(platform, city, region) {
    const hook = this._pick(HOOKS);
    const cta = this._pick(CALLS_TO_ACTION);
    const url = "https://web-production-576d9.up.railway.app/dashboard.html";

    if (platform === "twitter") {
      const tags = [
        this._pick(HASHTAG_POOL.general),
        this._pick(HASHTAG_POOL.hustle),
        this._pick(HASHTAG_POOL.gaming),
      ].join(" ");
      return `${hook}\n\nSelf-Made Legends is the AI trading game where ${city} players compete on a live leaderboard — #1 wins $10 every week.\n\n${cta}: ${url}\n\n${tags}`;
    }

    if (platform === "instagram") {
      const tags = [
        ...HASHTAG_POOL.general,
        ...HASHTAG_POOL.wealth,
        ...HASHTAG_POOL.hustle,
        ...HASHTAG_POOL.gaming,
        ...(HASHTAG_POOL.regional[region] || []),
        `#${city.replace(/\s/g, "")}`,
      ].join(" ");
      return `${hook} 🏆\n\n${city}, this one's for you.\n\nSelf-Made Legends is the AI-powered stock trading game where you compete against real players nationwide. Our AI trades for you — you just watch the wins stack up.\n\n✅ Start with just $1\n✅ Weekly leaderboard — #1 wins $10\n✅ Create your own crypto tokens\n✅ 100% free to join\n\n${cta} → link in bio 👆\n\n.\n.\n.\n${tags}`;
    }

    if (platform === "facebook") {
      return `🏆 ATTENTION ${city.toUpperCase()} — Self-Made Legends is HERE!\n\n${hook}\n\nSelf-Made Legends is the brand-new AI stock trading platform built for everyday people — no Wall Street experience needed. Our AI engine analyzes the market 24/7 and makes smart trades on your behalf.\n\n🎯 What you get:\n• AI-powered trading — set it and forget it\n• Weekly competitions with REAL cash prizes ($10 to the #1 player)\n• Create and trade your own crypto tokens\n• Live leaderboard — compete against players nationwide\n• Start with as little as $1\n\n💬 ${city} players are already signing up. Don't get left behind.\n\n👉 ${cta}: ${url}\n\nShare this with someone in ${city} who needs to level up their money game! 💰`;
    }

    if (platform === "tiktok") {
      return `POV: You just found the AI trading game that's taking ${city} by storm 📈\n\n${hook}\n\nSelf-Made Legends gives you:\n🤖 AI that trades stocks FOR YOU\n🏆 Weekly $10 prize for #1 on the leaderboard\n💎 Your own custom crypto tokens\n💵 Start with just $1\n\nThis is NOT your grandpa's stock market.\n\n${cta} → ${url}\n\n#SelfMadeLegends #AITrading #${city.replace(/\s/g, "")} #StockMarket #MoneyTok #FinanceTok #HustleTok`;
    }

    if (platform === "reddit") {
      return `**[Promotion] Self-Made Legends — AI Stock Trading Game with Weekly Cash Prizes | Now in ${city}**\n\nHey r/entrepreneur (and anyone grinding in ${city}),\n\nWe just launched Self-Made Legends — an AI-powered stock trading platform designed for everyday people, not Wall Street suits.\n\n**What it does:**\n- Our AI engine analyzes market data 24/7 and executes trades automatically\n- You start with paper money ($1 minimum) and compete on a live national leaderboard\n- Every week, the #1 ranked player wins $10 in real money\n- You can create and trade your own custom crypto tokens\n- Full risk management built in — the AI won't let you blow up your account\n\n**Why we built it:**\nWe wanted to make smart investing accessible to everyone, especially self-made hustlers who don't have time to watch charts all day.\n\n**It's free to start:** ${url}\n\nHappy to answer any questions. We're a small team and love feedback from the community.\n\n*— Self-Made Legends LLC*`;
    }

    if (platform === "discord") {
      return `🚨 **Self-Made Legends is LIVE** 🚨\n\n${hook}\n\n📍 Shoutout to all the ${city} players — this one's built for you.\n\n**Self-Made Legends** is the AI trading game where you compete on a LIVE national leaderboard. Our bot trades stocks for you — you just enjoy the results.\n\n🏆 **Top 10 recognized every week**\n💰 **#1 player wins $10 every week**\n🪙 **Create your own crypto tokens**\n📈 **AI-powered — no experience needed**\n\n▶️ **Join free:** ${url}\n\nDrop your username after you sign up so we can cheer you on! 🔥`;
    }

    return `${hook} — Self-Made Legends | ${cta}: ${url}`;
  }

  // Generate a full campaign for a specific city/state across all platforms
  generateCampaign(city, state, platforms = Object.keys(PLATFORMS)) {
    const campaignId = `campaign_${++this.campaignCounter}_${Date.now()}`;
    const region = this._getRegionForCity(city) || "general";
    const posts = {};

    for (const platform of platforms) {
      posts[platform] = {
        content: this._generateContent(platform, city, region),
        platform,
        characterCount: 0,
        hashtags: this._getHashtags(platform, region, city),
        bestPostTime: this._getBestPostTime(platform),
      };
      posts[platform].characterCount = posts[platform].content.length;
    }

    const campaign = {
      campaignId,
      city,
      state,
      region,
      platforms: posts,
      emailCampaign: this._generateEmailCampaign(city, state),
      createdAt: new Date().toISOString(),
      status: "ready",
    };

    this.campaigns.set(campaignId, campaign);
    return campaign;
  }

  // Generate campaigns for all 50 states simultaneously
  generateNationalCampaign(platforms = ["twitter", "instagram", "facebook"]) {
    const nationalId = `national_${Date.now()}`;
    const campaigns = [];
    const allCities = Object.values(US_REGIONS).flat();

    for (const city of allCities) {
      const state = this._getStateForCity(city);
      const region = this._getRegionForCity(city);
      const posts = {};

      for (const platform of platforms) {
        posts[platform] = {
          content: this._generateContent(platform, city, region),
          platform,
          hashtags: this._getHashtags(platform, region, city),
          bestPostTime: this._getBestPostTime(platform),
        };
      }

      campaigns.push({ city, state, region, platforms: posts });
    }

    const national = {
      nationalCampaignId: nationalId,
      totalCities: campaigns.length,
      totalStates: ALL_STATES.length,
      platforms,
      campaigns,
      createdAt: new Date().toISOString(),
      estimatedReach: campaigns.length * platforms.length * 1000,
      status: "ready",
    };

    this.campaigns.set(nationalId, national);
    return national;
  }

  // Generate state-by-state email campaigns
  generateEmailCampaignForAllStates() {
    return ALL_STATES.map((state) => ({
      state,
      subject: this._pick(EMAIL_SUBJECTS)
        .replace("{city}", state)
        .replace("{state}", state),
      body: this._generateEmailBody(state, state),
      targetAudience: `${state} residents interested in investing, gaming, or crypto`,
    }));
  }

  _generateEmailCampaign(city, state) {
    return {
      subject: this._pick(EMAIL_SUBJECTS)
        .replace("{city}", city)
        .replace("{state}", state),
      body: this._generateEmailBody(city, state),
      previewText: `${this._pick(HOOKS)} — Join the game today.`,
    };
  }

  _generateEmailBody(city, state) {
    const hook = this._pick(HOOKS);
    const cta = this._pick(CALLS_TO_ACTION);
    const url = "https://web-production-576d9.up.railway.app/dashboard.html";

    return `Hi there,

${hook}

We're Self-Made Legends LLC, and we're bringing the most exciting AI-powered trading game to ${city}, ${state}.

Here's what makes us different:

🤖 AI DOES THE WORK — Our AI engine analyzes market data 24/7 and makes smart trades on your behalf. No expertise needed.

🏆 WIN REAL MONEY — Every week, the #1 player on our national leaderboard wins $10. The top 10 get recognized publicly.

🪙 CREATE YOUR OWN CRYPTO — Launch your own token, set the price, and let others trade it. You keep 100% of the initial supply.

💵 START WITH $1 — No minimum investment barrier. Everyone gets a real shot.

🔒 SECURE & SAFE — Military-grade AES-256 encryption. Your data and funds are protected.

${city} players are already signing up. Don't miss your spot on the leaderboard.

👉 ${cta}: ${url}

To your legend,
Jason Brown
Founder, Self-Made Legends LLC

---
Self-Made Legends LLC | Unsubscribe | Privacy Policy
This is a promotional email. Self-Made Legends is a paper trading platform. See our Terms of Service for full details.`;
  }

  _getHashtags(platform, region, city) {
    const limit = PLATFORMS[platform]?.hashtagLimit || 5;
    if (limit === 0) return [];

    const pool = [
      ...HASHTAG_POOL.general,
      ...HASHTAG_POOL.hustle,
      ...HASHTAG_POOL.gaming,
      ...(HASHTAG_POOL.regional[region] || []),
      `#${city.replace(/\s/g, "")}`,
    ];

    const shuffled = pool.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, limit);
  }

  _getBestPostTime(platform) {
    const times = {
      twitter: "12pm–3pm EST or 6pm–9pm EST",
      instagram: "11am–1pm EST or 7pm–9pm EST",
      facebook: "1pm–4pm EST",
      tiktok: "7pm–9pm EST",
      reddit: "9am–12pm EST (weekdays)",
      discord: "Evening 6pm–10pm EST",
    };
    return times[platform] || "12pm–3pm EST";
  }

  _getRegionForCity(city) {
    for (const [region, cities] of Object.entries(US_REGIONS)) {
      if (cities.includes(city)) return region;
    }
    return "general";
  }

  _getStateForCity(city) {
    const cityStateMap = {
      "New York": "New York", "Boston": "Massachusetts", "Philadelphia": "Pennsylvania",
      "Baltimore": "Maryland", "Pittsburgh": "Pennsylvania", "Providence": "Rhode Island",
      "Hartford": "Connecticut", "Atlanta": "Georgia", "Miami": "Florida",
      "Charlotte": "North Carolina", "Nashville": "Tennessee", "Orlando": "Florida",
      "Tampa": "Florida", "New Orleans": "Louisiana", "Memphis": "Tennessee",
      "Chicago": "Illinois", "Detroit": "Michigan", "Cleveland": "Ohio",
      "Indianapolis": "Indiana", "Columbus": "Ohio", "Minneapolis": "Minnesota",
      "St. Louis": "Missouri", "Kansas City": "Missouri", "Houston": "Texas",
      "Dallas": "Texas", "Phoenix": "Arizona", "San Antonio": "Texas",
      "Austin": "Texas", "El Paso": "Texas", "Albuquerque": "New Mexico",
      "Las Vegas": "Nevada", "Los Angeles": "California", "San Francisco": "California",
      "Seattle": "Washington", "Portland": "Oregon", "Denver": "Colorado",
      "Sacramento": "California", "San Diego": "California", "Oakland": "California",
      "Birmingham": "Alabama", "Jackson": "Mississippi", "Louisville": "Kentucky",
      "Richmond": "Virginia", "Raleigh": "North Carolina", "Columbia": "South Carolina",
      "Little Rock": "Arkansas",
    };
    return cityStateMap[city] || "United States";
  }

  // Get all campaigns
  getCampaigns() {
    return Array.from(this.campaigns.values());
  }

  // Get content library (pre-built posts)
  getContentLibrary(platform, region) {
    let results = this.contentLibrary;
    if (platform) results = results.filter((c) => c.platform === platform);
    if (region) results = results.filter((c) => c.region === region);
    return results;
  }

  // Get platform-specific posting guide
  getPostingGuide() {
    return Object.entries(PLATFORMS).map(([platform, config]) => ({
      platform,
      characterLimit: config.maxChars,
      maxHashtags: config.hashtagLimit,
      bestTimes: this._getBestPostTime(platform),
      tips: this._getPlatformTips(platform),
    }));
  }

  _getPlatformTips(platform) {
    const tips = {
      twitter: ["Post 3–5x per day", "Reply to trending finance tweets", "Retweet user wins", "Use polls to engage"],
      instagram: ["Use all 30 hashtags", "Post Reels for 10x reach", "Add story polls", "Tag city location"],
      facebook: ["Join local money/investing groups and share", "Run $5 Facebook ads targeting your city", "Create a business page"],
      tiktok: ["Short 15-30 sec videos perform best", "Show live leaderboard screenshots", "Use trending sounds", "Duet with finance creators"],
      reddit: ["Post in r/entrepreneur, r/personalfinance, r/stocks, r/investing", "Be transparent — redditors hate ads", "Engage with comments"],
      discord: ["Find finance/crypto Discord servers", "Post in #promotions channels", "Offer invite-only perks"],
    };
    return tips[platform] || [];
  }

  // Generate influencer outreach message
  generateInfluencerOutreach(influencerName, platform, followerCount) {
    const tier = followerCount > 100000 ? "macro" : followerCount > 10000 ? "mid" : "micro";
    const offers = {
      macro: "$500 flat fee + 10% commission on sign-ups from your link",
      mid: "$100 flat fee + 15% commission on sign-ups from your link",
      micro: "Free Creator Membership + 20% commission on sign-ups from your link",
    };

    return {
      platform,
      influencer: influencerName,
      tier,
      offer: offers[tier],
      message: `Hi ${influencerName}! 👋\n\nI'm Jason from Self-Made Legends LLC. We just launched an AI-powered stock trading game where players compete for real weekly cash prizes.\n\nI think your audience would love it — and I'd love to partner with you.\n\nHere's what we're offering ${tier}-tier creators like you:\n💰 ${offers[tier]}\n🔗 Custom referral link tracked to your account\n🏆 Your username featured on our leaderboard\n\nThe platform is live: https://web-production-576d9.up.railway.app/dashboard.html\n\nInterested? Just reply and I'll send you a free creator account to try it out.\n\n— Jason Brown, Self-Made Legends LLC`,
    };
  }

  // Stats
  getStats() {
    const totalCampaigns = this.campaigns.size;
    const totalContent = this.contentLibrary.length;
    const citiesCovered = Object.values(US_REGIONS).flat().length;
    return {
      totalCampaigns,
      totalContentPieces: totalContent,
      citiesCovered,
      statesCovered: ALL_STATES.length,
      platformsCovered: Object.keys(PLATFORMS).length,
      estimatedTotalReach: citiesCovered * Object.keys(PLATFORMS).length * 1200,
    };
  }
}

module.exports = MarketingAgent;
