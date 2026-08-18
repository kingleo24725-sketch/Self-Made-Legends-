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
  "From the block to the market — Come Up.",
  "No Wall Street degree required.",
  "Simulate real trading. Build your legend. Play for free.",
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
  "Your {city} hustle just got an upgrade",
  "From {city} to legend — start today",
  "New: Trade stocks & crypto for free on Come Up",
  "Join {state}'s fastest-growing trading game",
  "Come Up — free trading game, now live",
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
      return `${hook}\n\nCome Up is the AI trading game where ${city} players compete on a live national leaderboard. Top 10 recognized every week.\n\n${cta}: ${url}\n\n${tags}`;
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
      return `${hook} 🏆\n\n${city}, this one's for you.\n\nCome Up is the AI-powered stock trading GAME where you compete against real players nationwide. Practice trading — no real money at risk. 🎮\n\n✅ 100% free to play\n✅ Weekly leaderboard — Top 10 recognized\n✅ Create your own in-game crypto tokens\n✅ AI coach helps you learn smart trading habits\n\n${cta} → link in bio 👆\n\n.\n.\n.\n${tags}`;
    }

    if (platform === "facebook") {
      return `🏆 ATTENTION ${city.toUpperCase()} — Come Up is HERE!\n\n${hook}\n\nCome Up is the brand-new AI stock trading GAME built for everyday people — no Wall Street experience needed. Practice trading with simulated money and learn smart investing habits.\n\n🎯 What you get:\n• AI coach analyzes your portfolio and teaches you strategies\n• Weekly leaderboard competitions — Top 10 get recognized nationally\n• Create and trade your own in-game crypto tokens\n• Live leaderboard — compete against players nationwide\n• Free to play — no real money at risk 🎮\n\n💬 ${city} players are already signing up. Don't get left behind.\n\n👉 ${cta}: ${url}\n\nShare this with someone in ${city} who wants to learn trading! 💰`;
    }

    if (platform === "tiktok") {
      return `POV: You just found the AI trading game that's taking ${city} by storm 📈\n\n${hook}\n\nCome Up gives you:\n🤖 AI that trades stocks FOR YOU\n🏆 Weekly leaderboard — Top 10 recognized nationwide\n💎 Your own custom crypto tokens\n💵 Start with just $1\n\nThis is NOT your grandpa's stock market.\n\n${cta} → ${url}\n\n#SelfMadeLegends #AITrading #${city.replace(/\s/g, "")} #StockMarket #MoneyTok #FinanceTok #HustleTok`;
    }

    if (platform === "reddit") {
      return `**[Promotion] Come Up — AI Stock Trading Game | Now in ${city}**\n\nHey r/entrepreneur (and anyone grinding in ${city}),\n\nWe just launched Come Up — an AI-powered stock trading GAME designed for everyday people, not Wall Street suits. All trading is simulated — no real money at risk.\n\n**What it does:**\n- AI coach analyzes market data 24/7 and gives you trade suggestions to help you learn\n- You compete with virtual SML Bucks on a live national leaderboard\n- Every week, the Top 10 players get recognized on the national leaderboard\n- You can create and trade your own custom in-game crypto tokens\n- Risk management tools built in to help you learn the right habits\n\n**Why we built it:**\nWe wanted to make learning smart investing accessible to everyone, especially self-made hustlers who don't have time to watch charts all day.\n\n**It's free to play:** ${url}\n\nHappy to answer any questions. We're a small team and love feedback from the community.\n\n*— Self-Made Legends LLC*`;
    }

    if (platform === "discord") {
      return `🚨 **Come Up is LIVE** 🚨\n\n${hook}\n\n📍 Shoutout to all the ${city} players — this one's built for you.\n\n**Come Up** is the AI trading GAME where you compete on a LIVE national leaderboard. Practice stock trading with virtual money — no real money at risk. 🎮\n\n🏆 **Top 10 recognized every week**\n🪙 **Create your own in-game crypto tokens**\n📈 **AI coach — no experience needed**\n🆓 **Free to play**\n\n▶️ **Join free:** ${url}\n\nDrop your username after you sign up so we can cheer you on! 🔥`;
    }

    return `${hook} — Come Up | ${cta}: ${url}`;
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

🤖 AI COACH — Our AI analyzes the market 24/7 and gives you trade suggestions to help you learn smart strategies. No expertise needed.

🏆 LEADERBOARD RECOGNITION — Every week, the Top 10 players are recognized on our national leaderboard.

🪙 CREATE YOUR OWN IN-GAME CRYPTO — Launch your own token, set the price, and let others trade it in-game. You keep 100% of the initial supply.

🎮 FREE TO PLAY — No minimum. Start instantly. All trading uses virtual SML Bucks — no real money at risk.

🔒 SECURE & SAFE — Your data is encrypted and protected.

${city} players are already signing up. Don't miss your spot on the leaderboard.

👉 ${cta}: ${url}

To your legend,
Jason Brown
Founder, Self-Made Legends LLC

---
Self-Made Legends LLC | 18615 E Arrowhead Pl, Independence, MO 64056 | Unsubscribe | Privacy Policy
This is a promotional email. Come Up is a simulated trading game — no real money is at risk. Virtual SML Bucks have no cash value. See our Terms of Service for full details.`;
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
      message: `Hi ${influencerName}! 👋\n\nI'm Jason from Self-Made Legends LLC. We just launched an AI-powered stock trading game where players compete on a live national leaderboard.\n\nI think your audience would love it — and I'd love to partner with you.\n\nHere's what we're offering ${tier}-tier creators like you:\n💰 ${offers[tier]}\n🔗 Custom referral link tracked to your account\n🏆 Your username featured on our leaderboard\n\nThe platform is live: https://web-production-576d9.up.railway.app/dashboard.html\n\n⚠️ FTC Disclosure Requirement: Per FTC guidelines (16 C.F.R. Part 255), you are required to clearly disclose this paid partnership in all content you create about Come Up. Please use #ad, #sponsored, or #partner in every post, video, or story. This is a legal requirement — not optional.\n\nInterested? Just reply and I'll send you a free creator account to try it out.\n\n— Jason Brown, Self-Made Legends LLC`,
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
