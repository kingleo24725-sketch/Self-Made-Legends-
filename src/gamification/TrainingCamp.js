'use strict';

const LESSONS = [
  {
    id: 1,
    title: 'What Is a Stock?',
    icon: '📈',
    duration: '5 min',
    content: `A **stock** (also called a share or equity) represents a small piece of ownership in a company.
When a company wants to raise money to grow, it sells pieces of itself to the public — those pieces are stocks.

**Key points:**
• Buying 1 share of a company makes you a part-owner of that business.
• Stock prices rise when more people want to buy than sell, and fall when more want to sell than buy.
• You make money two ways: the stock price going UP (capital gains) or the company paying you a dividend.
• Stocks are traded on exchanges like the NYSE (New York Stock Exchange) and NASDAQ.

**Example:** If Apple has 1 billion shares and you own 1 share, you own one-billionth of Apple.

**Risk:** Stock prices can go down as well as up. Never invest money you can't afford to lose.`,
    quiz: {
      question: 'What does owning a share of stock mean?',
      options: [
        'You lent money to the company',
        'You own a small piece of the company',
        'The company owes you a fixed payment',
        'You control the company\'s decisions',
      ],
      answer: 1,
      explanation: 'A share of stock represents partial ownership (equity) in the company.',
    },
  },
  {
    id: 2,
    title: 'Buying & Selling Basics',
    icon: '💹',
    duration: '6 min',
    content: `Trading stocks means **buying** when you think the price will rise and **selling** when you want to lock in a profit (or cut a loss).

**Market Order vs Limit Order:**
• **Market order** — buy/sell immediately at the current price. Fast but you get whatever price the market is at.
• **Limit order** — you set a maximum price to buy (or minimum to sell). Only executes if the price hits your target.

**Bid & Ask:**
• **Bid** = highest price a buyer is willing to pay right now.
• **Ask** = lowest price a seller is willing to accept right now.
• The difference is called the **spread**. Liquid (popular) stocks have tiny spreads.

**Profit/Loss formula:**
\`(Sell Price − Buy Price) × Number of Shares = Gain or Loss\`

Example: Buy 10 shares at $100, sell at $120 → (120−100) × 10 = **$200 profit**.

**Rule of thumb:** Never chase a stock that already ran up 20% in a day — wait for a pullback.`,
    quiz: {
      question: 'You place a limit order to BUY at $50. The stock is currently at $55. What happens?',
      options: [
        'Your order fills immediately at $55',
        'Your order waits until the stock drops to $50',
        'Your order is cancelled',
        'You sell the stock',
      ],
      answer: 1,
      explanation: 'A limit buy order only executes when the price reaches your set limit ($50), not before.',
    },
  },
  {
    id: 3,
    title: 'Reading a Stock Chart',
    icon: '📊',
    duration: '7 min',
    content: `Charts show you the **price history** of a stock — the story of what buyers and sellers have done.

**Candlestick charts** are the most popular. Each "candle" shows 4 data points for a time period:
• **Open** — price at the start
• **Close** — price at the end
• **High** — highest price reached
• **Low** — lowest price reached

A **green candle** = price closed HIGHER than it opened (buyers won).
A **red candle** = price closed LOWER than it opened (sellers won).

**Key chart concepts:**
• **Support** — a price level where the stock has bounced UP multiple times (buyers step in here).
• **Resistance** — a price level where the stock has dropped BACK DOWN multiple times (sellers step in here).
• **Trend** — if the stock is making higher highs and higher lows, it's in an **uptrend**. Lower highs and lower lows = **downtrend**.
• **Volume bars** — shown below the price chart. High volume = strong conviction behind the move.

**Tip:** Don't try to pick the exact top or bottom. Trade the trend, not your guess.`,
    quiz: {
      question: 'On a candlestick chart, what does a GREEN candle indicate?',
      options: [
        'The stock price fell during that period',
        'Trading volume was high',
        'The stock price rose during that period',
        'A dividend was paid',
      ],
      answer: 2,
      explanation: 'A green (bullish) candle means the closing price was higher than the opening price for that period.',
    },
  },
  {
    id: 4,
    title: 'Risk Management',
    icon: '🛡️',
    duration: '6 min',
    content: `The #1 skill in trading isn't picking winners — it's **managing your risk** so that losses don't wipe you out.

**The 1% Rule:**
Never risk more than 1–2% of your total account on a single trade. If you have $1,000, risk at most $10–$20 per trade.

**Stop Loss:**
A stop-loss order automatically sells your stock if it drops to a set price. It limits how much you can lose.
Example: Buy at $100, set stop-loss at $92 → worst case you lose $8 per share (8% loss).

**Risk/Reward Ratio:**
Before entering a trade, ask: "If I'm right, how much do I make? If I'm wrong, how much do I lose?"
A 3:1 ratio means risking $1 to potentially make $3. Aim for at least 2:1.

**Diversification:**
Don't put all your money in one stock. Spread it across different companies and sectors so one bad pick doesn't ruin you.

**Never average down blindly:**
If a stock you bought keeps falling, don't keep buying more just to lower your average cost — the company might be broken.

**Golden rule:** Protect your capital first. You can't make money if you've blown up your account.`,
    quiz: {
      question: 'You have a $500 account. Using the 1% rule, what is the maximum you should risk on one trade?',
      options: ['$50', '$5', '$100', '$500'],
      answer: 1,
      explanation: '1% of $500 = $5. Keeping individual trade risk tiny protects your account from a string of losses.',
    },
  },
  {
    id: 5,
    title: 'Fundamental vs Technical Analysis',
    icon: '🔬',
    duration: '8 min',
    content: `Traders use two main methods to decide WHAT to buy and WHEN to buy it.

**Fundamental Analysis — the "What":**
Looks at the company's business health:
• **Revenue & Earnings** — Is the company making more money each year?
• **P/E Ratio** — Price ÷ Earnings per share. A P/E of 20 means you pay $20 for every $1 of earnings.
  Lower P/E = cheaper relative to earnings. High-growth stocks often have high P/E ratios.
• **Debt levels** — A company drowning in debt is riskier.
• **Competitive moat** — Does the company have an edge competitors can't easily copy?

**Technical Analysis — the "When":**
Looks at price charts and indicators:
• **Moving Averages (MA)** — Average price over a period (e.g., 50-day MA). Price above MA = bullish sign.
• **RSI (Relative Strength Index)** — 0-100 scale. Above 70 = possibly overbought (due for a dip). Below 30 = possibly oversold (bounce coming?).
• **MACD** — Shows momentum. When the MACD line crosses above the signal line, it's a bullish signal.

**Which should you use?**
Most successful traders combine BOTH:
→ Fundamental analysis to find great companies.
→ Technical analysis to time the entry.

**Tip:** A great company at the wrong price is still a bad trade.`,
    quiz: {
      question: 'A stock has an RSI of 78. What might this suggest?',
      options: [
        'The stock is oversold and due for a bounce',
        'The stock is overbought and might pull back',
        'Earnings were better than expected',
        'The company is going bankrupt',
      ],
      answer: 1,
      explanation: 'RSI above 70 signals the stock may be overbought — it\'s had a strong run and could be due for a correction.',
    },
  },
  {
    id: 6,
    title: 'Building Your First Strategy',
    icon: '🏆',
    duration: '7 min',
    content: `You've made it to the final lesson! Now let's put it all together into a repeatable strategy.

**The 5-Step Trade Checklist:**
1. ✅ **Find the stock** — Use fundamental analysis to shortlist strong companies.
2. ✅ **Check the trend** — Is the stock in an uptrend on the daily chart? Don't fight the trend.
3. ✅ **Set your entry** — Use a limit order near support, not chasing a breakout.
4. ✅ **Set your stop-loss** — Know your exit before you enter. Place it below the nearest support level.
5. ✅ **Set your target** — At least 2× your risk. If stop-loss is $5 away, target $10+ gain.

**Dollar-Cost Averaging (DCA):**
Instead of investing a lump sum at once, invest a fixed amount every week or month. This smooths out volatility and removes the stress of timing the market perfectly.
Example: Invest $50/week into an index fund regardless of price.

**Journaling your trades:**
Write down every trade: why you entered, your plan, and what actually happened. This is how you get better.

**SML Leaderboard Strategy:**
In this game, track your gain % daily. Compete on the leaderboard by making smart calls — your score is your cumulative percentage gain this season.

**You've graduated Boot Camp! 🎓**
You're now ready to start competing. Check the leaderboard, join a team, and ask the AI Coach anytime you have questions.`,
    quiz: {
      question: 'What is Dollar-Cost Averaging (DCA)?',
      options: [
        'Buying more shares every time the price falls',
        'Investing a fixed amount on a regular schedule regardless of price',
        'Setting a stop-loss at the average purchase price',
        'Averaging the bid and ask price to get the best fill',
      ],
      answer: 1,
      explanation: 'DCA means investing a consistent fixed amount on a schedule (e.g. weekly), which automatically buys more shares when prices are low and fewer when high.',
    },
  },
];

class TrainingCamp {
  constructor() {
    this.progress = new Map(); // userId -> { completedLessons: Set, quizScores: {}, graduated: bool, startedAt }
  }

  getLessons() {
    return LESSONS.map(l => ({
      id: l.id,
      title: l.title,
      icon: l.icon,
      duration: l.duration,
    }));
  }

  getLesson(lessonId) {
    return LESSONS.find(l => l.id === lessonId) || null;
  }

  getProgress(userId) {
    const p = this.progress.get(userId);
    if (!p) {
      return {
        completedLessons: [],
        quizScores: {},
        graduated: false,
        totalLessons: LESSONS.length,
        startedAt: null,
      };
    }
    return {
      completedLessons: [...p.completedLessons],
      quizScores: { ...p.quizScores },
      graduated: p.graduated,
      totalLessons: LESSONS.length,
      startedAt: p.startedAt,
    };
  }

  submitQuiz(userId, lessonId, answerIndex) {
    const lesson = LESSONS.find(l => l.id === lessonId);
    if (!lesson) return { success: false, error: 'Lesson not found.' };

    const correct = answerIndex === lesson.quiz.answer;

    if (!this.progress.has(userId)) {
      this.progress.set(userId, {
        completedLessons: new Set(),
        quizScores: {},
        graduated: false,
        startedAt: Date.now(),
      });
    }
    const p = this.progress.get(userId);

    if (correct) {
      p.completedLessons.add(lessonId);
      p.quizScores[lessonId] = 1;
    } else {
      p.quizScores[lessonId] = (p.quizScores[lessonId] || 0);
    }

    const allDone = LESSONS.every(l => p.completedLessons.has(l.id));
    if (allDone && !p.graduated) {
      p.graduated = true;
    }

    return {
      success: true,
      correct,
      explanation: lesson.quiz.explanation,
      graduated: p.graduated,
      completedCount: p.completedLessons.size,
      totalLessons: LESSONS.length,
    };
  }

  isGraduated(userId) {
    const p = this.progress.get(userId);
    return p ? p.graduated : false;
  }
}

module.exports = TrainingCamp;
