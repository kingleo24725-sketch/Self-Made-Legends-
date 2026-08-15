// SML Trading Coach — rule-based Q&A for beginners
class CoachSystem {
  constructor() {
    this.qa    = this._buildQA();
    this.tips  = this._buildTips();
  }

  // Main entry point — returns a string answer
  getResponse(query) {
    const q = (query || '').toLowerCase().trim();
    if (!q) return this.getDailyTip();

    // Find best matching entry (most keyword hits wins)
    let best = null, bestScore = 0;
    for (const item of this.qa) {
      const score = item.keywords.filter(k => q.includes(k)).length;
      if (score > bestScore) { bestScore = score; best = item; }
    }

    if (best && bestScore > 0) return best.answer;

    return "That's a great question! My best advice for beginners: start with companies you know and use every day. If you understand the business, you have an edge. Keep asking — I'm here to help you become a legend. 💪";
  }

  getDailyTip() {
    return this.tips[Math.floor(Date.now() / 86400000) % this.tips.length];
  }

  getQuickQuestions() {
    return [
      "What is a stock?",
      "How do I make my first trade?",
      "When should I sell?",
      "What is a good strategy for beginners?",
      "How does the leaderboard work?",
      "What are badges?",
      "How do I earn more XP?",
      "What is risk management?",
    ];
  }

  _buildTips() {
    return [
      "💡 Tip: Never put all your money into one stock. Spread it across 3–5 different companies to reduce risk.",
      "💡 Tip: The best time to study a company is BEFORE you invest, not after the price moves.",
      "💡 Tip: Emotions are your biggest enemy in trading. Stick to your plan, not your feelings.",
      "💡 Tip: A 10% gain followed by a 10% loss does NOT break even — losses hurt more than gains help. Protect your downside.",
      "💡 Tip: Volume tells you how many people are trading a stock. High volume on a price move = more trustworthy signal.",
      "💡 Tip: The stock market has ALWAYS recovered from every crash in history. Long-term thinking is your superpower.",
      "💡 Tip: Bull market = prices going up. Bear market = prices going down. Know which environment you're in.",
      "💡 Tip: Before buying, ask yourself: 'Would I still want this stock if the market closed for 5 years?' If yes, it's probably a solid pick.",
      "💡 Tip: Check the leaderboard daily — see what sectors the top traders are in. Learn from the legends above you.",
      "💡 Tip: Consistency beats perfection. Making 10 well-researched small trades beats 1 big risky gamble every time.",
      "💡 Tip: Complete your daily missions — even on losing trade days, XP and badges keep building your legend.",
      "💡 Tip: The top traders on SML have one thing in common: they track EVERY trade. Keep notes on why you bought and sold.",
    ];
  }

  _buildQA() {
    return [
      // ── Stock Market Basics ─────────────────────────────────────────────
      {
        keywords: ['what is a stock', 'what are stocks', 'define stock', 'stock mean'],
        answer: `📈 A stock (also called a share) is a tiny piece of ownership in a real company.

When you buy 1 share of Apple, you literally own a small fraction of Apple Inc. If Apple makes more money and grows, your share becomes worth more. If the company struggles, it's worth less.

Companies sell stocks to raise money to grow their business. You buy stocks hoping the company's value rises so you can sell your share for more than you paid — that difference is your profit (called a "gain").

On SML you practice this with paper money so you can learn without any real risk! 🎮`,
      },
      {
        keywords: ['how does the market work', 'how stock market works', 'stock exchange', 'nyse', 'nasdaq'],
        answer: `🏛️ The stock market is basically a giant organized auction that runs Monday–Friday, 9:30am–4pm Eastern time.

Buyers and sellers from around the world place orders through brokerages. When a buyer's price matches a seller's price — the trade happens instantly and electronically.

Key exchanges:
• **NYSE** (New York Stock Exchange) — older, traditional companies like Coca-Cola, Ford
• **NASDAQ** — tech-heavy: Apple, Google, Amazon, Tesla
• **S&P 500** — the 500 largest US companies, used as the benchmark for the whole market

On SML you trade against real price data from these exchanges, so your paper trading experience mirrors exactly what real trading feels like! 🎯`,
      },
      {
        keywords: ['buy', 'purchase', 'first trade', 'how to trade', 'how do i trade', 'make a trade'],
        answer: `🛒 Buying a stock (called "going long") means you think the price will go UP.

Here's the simple process:
1. Find a company you believe in (one you know and use)
2. Check the current price
3. Decide how many shares to buy with your available capital
4. Place a BUY order

On SML — tap any stock in your trading panel, enter the amount you want to invest, and hit Buy. Your portfolio will then track that position in real time.

💡 Beginner rule: Never invest more than 20% of your total capital in a single stock. Spread the risk!`,
      },
      {
        keywords: ['sell', 'when to sell', 'selling', 'exit', 'take profit'],
        answer: `📤 Selling means you close your position and lock in your gain (or cut your loss).

**When to consider selling:**
• You've hit your target gain (e.g. +15% profit)
• The reason you bought the stock is no longer true
• The stock has dropped past your "stop loss" limit (e.g. -8%)
• You found a better opportunity elsewhere

The hardest part of trading is NOT knowing when to buy — it's having the discipline to sell. Greed makes you hold too long. Fear makes you sell too early.

🏆 Pro tip: Set a target price WHEN you buy, not after. "I'll sell at +20%" is a plan. "I'll sell when it feels right" is gambling.`,
      },
      {
        keywords: ['portfolio', 'what is portfolio', 'my portfolio'],
        answer: `💼 Your portfolio is your complete collection of investments — everything you currently own.

Key portfolio metrics to watch:
• **Total Value** — your starting capital + gains (or – losses)
• **Gain %** — how much your whole portfolio is up or down in percentage terms
• **Individual positions** — each stock you hold and how each is performing

A healthy portfolio is DIVERSIFIED — meaning it has stocks across different sectors (tech, healthcare, energy, consumer goods) so one bad sector doesn't wipe you out.

On SML your portfolio score drives your leaderboard rank. The higher your gain %, the higher you climb. 🚀`,
      },
      {
        keywords: ['gain', 'loss', 'profit', 'return', 'gain percent', 'gain %', 'percentage'],
        answer: `📊 Gain % = (Current Value − Purchase Price) ÷ Purchase Price × 100

**Example:**
• You buy 10 shares at $100 each = $1,000 invested
• Price rises to $120 per share = $1,200 current value
• Gain = $200 → Gain % = +20%

A loss works the same way in reverse — if the price drops to $80, that's -20%.

On SML your **portfolio gain %** is what the leaderboard ranks you by. Focus on percentage return, not raw dollar amounts — that's how the pros measure performance. 📈`,
      },
      {
        keywords: ['bull', 'bear', 'bull market', 'bear market', 'bullish', 'bearish'],
        answer: `🐂🐻 These are the two moods of the market:

**Bull Market** = prices are generally rising, economy is growing, investors are optimistic. The market has been "bullish" for most of its history.

**Bear Market** = prices have fallen 20%+ from recent highs, usually tied to economic slowdowns or fear. Bear markets are painful but always temporary.

Trader slang:
• "I'm bullish on Tesla" = I think Tesla's price will go up
• "I'm bearish on the market" = I think things are going to drop

On SML you can still win in a bear market by selling before the drop — or by staying patient while others panic. 🎯`,
      },
      {
        keywords: ['diversif', 'spread risk', 'dont put all', "don't put all", 'multiple stocks'],
        answer: `🌐 Diversification = not putting all your eggs in one basket.

If you put 100% of your money in one stock and it drops 50%, you've lost half your portfolio. But if you spread across 5 stocks and one drops 50%, you only lose 10% of your total.

**Simple diversification rules for beginners:**
• Max 20% of capital in any single stock
• Own stocks from at least 3 different industries
• Mix some "safe" large-cap stocks (Apple, Microsoft) with a few riskier growth plays

The goal isn't to hit home runs on every trade — it's to stay in the game long enough to compound your wins. 🧠`,
      },
      {
        keywords: ['pe ratio', 'p/e', 'price to earnings', 'valuation'],
        answer: `📐 The P/E Ratio (Price-to-Earnings) tells you how expensive a stock is relative to its profits.

**Formula:** Stock Price ÷ Annual Earnings Per Share

**Example:** Stock at $100, earns $5/share per year → P/E = 20

What it means:
• Low P/E (under 15) = potentially undervalued or slow-growth company
• High P/E (over 30) = investors expect high future growth (like most tech stocks)
• Negative P/E = company is losing money currently

It's not magic — a high P/E stock can still be a great buy if the growth justifies it. Apple's P/E has been "expensive" for 20 years and still made people rich. Context is everything.`,
      },
      {
        keywords: ['dividend', 'dividends', 'passive income', 'income investing'],
        answer: `💵 A dividend is a cash payment a company sends to its shareholders regularly (usually every quarter).

**Example:** If you own 100 shares of Coca-Cola and they pay a $0.46/share quarterly dividend, you get $46 every 3 months just for holding the stock.

Not all companies pay dividends — fast-growing tech companies usually reinvest profits instead. Older, stable companies (Coca-Cola, Johnson & Johnson, Walmart) are known for reliable dividends.

Dividend investing is a classic "slow and steady" wealth-building strategy. It's less exciting than chasing big gains, but it compounds powerfully over time. 🏦`,
      },
      {
        keywords: ['volume', 'trading volume', 'what is volume'],
        answer: `📊 Volume = the number of shares traded in a given time period.

**Why it matters:**
• High volume on a price INCREASE = strong buyer interest, more trustworthy move
• High volume on a price DECREASE = panic selling, potentially serious
• Low volume on any move = might just be a random fluctuation, less meaningful

Think of it like a crowd at an auction. A bid that 1,000 people are responding to means something different than a bid that only 5 people see.

Watch volume when a stock makes a big move — it tells you if the move is real or just noise. 🔍`,
      },
      {
        keywords: ['stop loss', 'stop-loss', 'cut losses', 'limit loss'],
        answer: `🛑 A stop loss is a pre-set rule: "If this stock drops X%, I will sell automatically."

**Why it's essential:**
A stock that drops 50% needs to rise 100% just to break even. A small loss is cheap tuition. A big loss is devastating.

**Common beginner rule:** Set a stop loss at -8% to -10% below your purchase price. If it hits, sell. No emotions, no hoping it comes back.

The hardest thing in trading is admitting you're wrong. Stop losses force the discipline that separates winning traders from losing ones.

On SML practice this on every trade — decide your stop loss BEFORE you buy. Build the habit now so it's automatic when real money is on the line. 💪`,
      },
      {
        keywords: ['strategy', 'strategies', 'beginner strategy', 'how to win', 'tips', 'advice', 'start'],
        answer: `🎯 The best beginner strategy on SML (and in real life):

**1. Research before you buy**
Know WHY you're buying. "It went up" is not a reason.

**2. Diversify**
3–5 positions max. Never all-in on one stock.

**3. Set a plan per trade**
Target: +15-20% gain. Stop loss: -8%. Stick to it.

**4. Check the SML leaderboard daily**
See which sectors the top players are in. Learn from them.

**5. Complete daily missions**
XP and badges compound — even on losing days you're building your legend.

**6. Paper trade like it's real money**
The habits you build here transfer directly to real investing. Take it seriously!

Ready to make your first trade? 🚀`,
      },
      {
        keywords: ['dollar cost averaging', 'dca', 'average down', 'average in'],
        answer: `📅 Dollar Cost Averaging (DCA) = investing a fixed amount at regular intervals regardless of price.

**Example:**
• Week 1: buy $100 of Bitcoin at $50,000 → 0.002 BTC
• Week 2: buy $100 at $40,000 → 0.0025 BTC
• Week 3: buy $100 at $45,000 → 0.0022 BTC

You automatically buy MORE when prices are low and LESS when they're high. Over time, your average cost is lower than if you tried to "time" the market.

Warren Buffett calls this the best strategy for most investors. It removes emotion and removes the impossible task of guessing the perfect entry point.

On SML you can practice this by adding to positions over multiple days instead of going all-in at once. 📆`,
      },
      // ── SML Platform ────────────────────────────────────────────────────
      {
        keywords: ['leaderboard', 'ranking', 'rank', 'how am i ranked', 'score', 'how does ranking work'],
        answer: `🏆 The SML Leaderboard ranks players by Portfolio Gain % — how much your paper portfolio has grown since you joined.

**How it works:**
• Everyone starts with the same paper capital
• The percentage you've grown that capital = your score
• Rankings update in real time as prices move

**Divisions:**
• 🌐 All — overall leaderboard
• ♂ Male — male division
• ♀ Female — female division

The **Top 16** in each division qualify for the **Sweet Sixteen Tournament** at the 3-month mark. Champions face off for the SML Grand Championship! 👑

Focus on your gain %, not the dollar number — that's what separates true legends from the pack.`,
      },
      {
        keywords: ['badge', 'badges', 'how to earn badges', 'what are badges', 'achievement'],
        answer: `🏅 Badges are achievement awards you earn by hitting milestones. There are 5 tiers:

🥉 **Bronze** — beginner achievements (Day 1, first trade, first win)
🥈 **Silver** — building momentum (5-day streak, 10 trades, 50% return)
🥇 **Gold** — serious progress (30-day streak, 50 trades, 100% return)
💠 **Platinum** — elite level (100 trades, 300% return, 60-day streak)
💎 **Diamond** — legendary status (500 trades, 10x capital, 90-day streak, Hall of Fame)

Each badge also awards **XP** which powers the XP leaderboard. Badges display on your public profile and show other players your trading history.

The **Hall of Famer** diamond badge is the rarest — only the top 3 finishers each season earn it. 🎖️`,
      },
      {
        keywords: ['xp', 'experience', 'level', 'points', 'how to get xp'],
        answer: `⚡ XP (Experience Points) powers your progress on SML. You earn XP by:

• Completing **daily missions** (+50 to +500 XP each)
• Earning **badges** (+100 to +5000 XP each)
• **Login streaks** (bonus XP for consecutive days)
• Making trades, winning, hitting milestones

There's a separate **XP Leaderboard** alongside the Portfolio Leaderboard — so even if you're not winning on gains yet, you can still build your reputation through activity and consistency.

💡 **Beginner tip:** Log in every single day. A 90-day login streak alone earns you a Diamond badge and 5,000 XP. Consistency is a skill.`,
      },
      {
        keywords: ['mission', 'missions', 'daily mission', 'task', 'quest', 'challenge'],
        answer: `📋 Daily missions are specific goals that refresh regularly and award XP when completed.

**Types of missions:**
• Make X trades today
• Earn a gain on a trade
• Login 5 days in a row
• Beat the AI challenge
• View the leaderboard
• Complete your profile

**Why missions matter:**
They keep you active on days when the market is slow. Even if your stocks are flat, missions give you a reason to check in, learn, and build XP.

Check your missions daily under the Missions section on your dashboard. The more consistently you complete them, the faster you climb. 🎯`,
      },
      {
        keywords: ['season', 'seasons', 'how long is a season', 'season end', 'when does season end'],
        answer: `📅 SML runs in 3-month seasons (about 90 days each).

**What happens each season:**
• Everyone competes for the top spots on the leaderboard
• At the 3-month mark, the **Top 16 Male + Top 16 Female** players enter the **Sweet Sixteen Tournament**
• Division champions face off in the **Grand Championship**
• Season top 3 finishers earn the **Hall of Famer 💎 Diamond Badge** and go into the Hall of Fame

After a season ends, a fresh new season begins. Your badges carry over forever. Your rank resets — giving every player a fresh shot at glory.

🏆 The goal: finish top 3 in your division before the season clock hits zero.`,
      },
      {
        keywords: ['tournament', 'sweet sixteen', 'bracket', 'championship', 'compete'],
        answer: `🏟️ The SML Tournament is a 16-player single-elimination bracket — like March Madness but for traders!

**How it works:**
• Top 16 Male players enter the Male Bracket
• Top 16 Female players enter the Female Bracket
• Standard seeding: #1 vs #16, #8 vs #9, etc.
• Winners advance through Sweet 16 → Elite 8 → Final Four → Division Championship
• **Male Champion vs Female Champion** in the Grand Championship

You qualify by ranking in the top 16 of your division when the season ends. The higher your seed, the easier your bracket path.

View the live bracket at /tournament.html — it updates in real time as matches are decided! 👑`,
      },
      {
        keywords: ['beat the ai', 'ai challenge', 'ai bot', 'vs ai', 'robot'],
        answer: `🤖 The "Beat the AI" challenge lets you compete directly against SML's AI trading bot.

The AI bot runs 24/7, automatically simulating trades with a slight upward drift (simulating a typical diversified portfolio). Its gain % updates every hour.

**Your goal:** Keep your portfolio gain % ABOVE the AI's gain %.

If you beat the AI consistently, you complete missions, earn XP, and prove you can outperform algorithmic trading — which most professional fund managers can't do!

Check your AI challenge status on the dashboard. The gap between your gain % and the AI's is shown in real time. Stay above the line. 💪`,
      },
      {
        keywords: ['team', 'squad', 'join team', 'create team', 'group'],
        answer: `👥 Teams (Squads) let you compete with friends as a group!

**How teams work:**
• Create a team with a name, motto, and color
• Share your invite code with friends
• Your team score = average portfolio gain % of all members
• Teams compete on the Team Leaderboard

**Why join a team?**
• Accountability — your teammates depend on your performance
• Strategy sharing — discuss trade ideas with your squad
• Team missions and rewards (coming soon)
• Extra motivation to check in daily

Check the Teams page to create or join a squad. Being on a winning team builds your legend even faster. 🏆`,
      },
      {
        keywords: ['training', 'boot camp', 'bootcamp', 'learn', 'beginner', 'new', 'tutorial', 'teach me', 'start'],
        answer: `🎓 New to trading? Our Training Camp is built exactly for you!

**The Boot Camp has 6 lessons:**
1. 📈 What Is the Stock Market?
2. 🛒 How to Buy and Sell
3. 🛡️ Risk Management Basics
4. 📊 Reading Charts & Data
5. 🏆 Mastering the SML Platform
6. 🗺️ Your First Week Game Plan

Each lesson takes about 3 minutes to read. Complete all 6 and you graduate as a certified SML Rookie — ready to compete!

👉 Visit /training.html to start Boot Camp right now. It's free and it'll save you from the most common beginner mistakes.`,
      },
      {
        keywords: ['crypto', 'bitcoin', 'ethereum', 'cryptocurrency', 'crypto trade'],
        answer: `₿ Cryptocurrency is digital money that runs on blockchain technology — decentralized, not controlled by any government or bank.

**Key cryptos on SML:**
• **Bitcoin (BTC)** — the original, digital gold, store of value
• **Ethereum (ETH)** — the platform for decentralized apps and smart contracts
• **Solana (SOL)** — fast, low-fee blockchain, popular for NFTs
• **Cardano (ADA)** — research-focused blockchain

**Crypto vs stocks:**
• Crypto trades 24/7 — never closes
• Much more volatile — can swing 20% in a day
• Less regulatory protection
• Higher risk, potentially higher reward

On SML you can trade crypto alongside stocks. Many top players diversify between both. 🚀`,
      },
    ];
  }
}

module.exports = CoachSystem;
