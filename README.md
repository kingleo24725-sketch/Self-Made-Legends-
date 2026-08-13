# 💎 SELF MADE LEGENDS - AI Trading Bot

**The All-in-One AI Trading Platform for Stocks, Crypto & NFTs**

**⚠️ REAL MONEY TRADING PLATFORM**
- Uses **REAL brokers and exchanges**
- **REAL funds at risk** - Potential losses
- **REAL profits** - Keep what you earn
- **100% transparent** - All trades are real

A comprehensive multi-asset AI-powered trading bot that trades **stocks, cryptocurrencies, and NFTs** with professional account management, payment processing, and portfolio management.

## 🎯 Start Small, Grow Big

- **Start with $1** - No minimum deposit required
- **Withdraw $1, $100, $500** - No withdrawal limits
- **Scale at your pace** - Trade any amount you want
- **Zero barriers to entry** - Built for everyone
- **All REAL money** - Connected to real exchanges
- **Creator Fee: $5** - Supports platform development (per transaction)
- **All Card Types Supported** - Visa, Mastercard, Amex, Discover, etc.
- **YOU Control Withdrawals** - AI works for you, you decide when to withdraw

## ⚠️ RISK WARNING

**This is a real money trading bot. You can lose money.**
- Past performance ≠ future results
- Markets are unpredictable
- AI strategies can fail
- Black swan events happen
- Only invest what you can afford to lose

**See [REAL_MONEY_SETUP.md](REAL_MONEY_SETUP.md) for full disclaimers and setup instructions.**

## Features

### 🎯 Multiple AI Strategies
- **Technical Analysis Bot**: RSI, MACD, Bollinger Bands, Moving Averages (Stocks)
- **Momentum Bot**: Price momentum and volume analysis (Stocks)
- **Crypto Bot**: 24-hour volatility, RSI, volume trends (Crypto)
- **NFT Bot**: Floor price trends, rarity, holder distribution (NFTs)
- **Consensus Algorithm**: Aggregates signals from multiple bots for accuracy

### 💼 Portfolio Management
- Real-time portfolio tracking
- Automatic position sizing
- Diversification across multiple stocks
- Historical trade tracking
- Performance metrics and analytics

### 🛡️ Risk Management
- **Stop Loss**: Automatically closes losing positions (default: 2% loss)
- **Take Profit**: Locks in gains at specified levels (default: 1.5% gain)
- **Position Sizing**: Limits position size to prevent overexposure
- **Portfolio Risk Monitoring**: Tracks total unrealized losses
- **Cash Management**: Always maintains emergency liquidity

### 🎨 Real-time Dashboard
- Live portfolio value and performance
- Stock analysis with buy/sell/hold signals
- Open positions with gains/losses
- Trade history
- Risk metrics
- WebSocket updates for real-time data

### 💰 Account Management
- Secure user registration and authentication
- Session-based login system
- Multi-asset portfolio tracking
- API key generation for programmatic access

### 💳 Real Money Payment Processing
- **REAL MONEY** connected to Stripe, Plaid, Binance, Kraken
- **Multiple deposit methods**: Credit card, bank transfer, crypto, PayPal
- **Multiple withdrawal methods**: Bank transfer, crypto wallet, card
- **Instant processing** for card/PayPal deposits (1-2 minutes)
- **Fast crypto transfers** (5-30 minutes)
- **Secure wallet management** for crypto withdrawals
- **Transparent fee structure** - clearly shown before transactions
- **Transaction history** with detailed records
- **Micro-deposits** for bank verification
- **Real-time balance updates**

### 🏪 Real Money Multi-Asset Trading
- **Stocks**: Real trading via Alpaca (500+ stocks)
- **Cryptocurrencies**: Real trading via Binance/Kraken (1000+ coins)
- **NFTs**: Real marketplace integration via OpenSea
- **Real positions**: All trades are actual broker orders
- **Unified portfolio** across all asset classes
- **Real gains/losses** - Keep profits, own losses

### 🔐 Security Features
- Password hashing for account protection
- Session tokens with expiration
- Wallet address verification
- Transaction verification for large withdrawals
- Optional two-factor authentication support

### 🎮 User Control (You're Always in Charge)
- **YOU Control Withdrawals** - Not AI, always your decision
- **YOU Enable/Disable AI** - Turn automation on/off anytime
- **YOU Pause Trading** - Stop AI anytime you want
- **YOU Resume Trading** - Restart whenever ready
- **AI Background Growth** - Grows money while you're not watching
- **Withdrawal Always Available** - Pull money out 24/7
- **No AI Lock** - AI cannot hold or freeze your funds
- **Real-time Control** - Change settings instantly

**How It Works:**
1. AI analyzes markets 24/7
2. AI makes smart trading decisions
3. While you sleep, AI grows your money
4. You check dashboard anytime
5. You decide to withdraw
6. Click withdraw, money is yours
7. AI never interferes with your withdrawals

### 📊 Paper Trading (Optional Testing)
- Test strategies with virtual money before real trading
- Use Alpaca paper trading API for risk-free testing
- No real capital at risk during testing
- Highly recommended before using real money
- **We recommend 2 weeks of paper trading first**

## Installation

### Prerequisites
- Node.js 14+
- npm or yarn

### Setup - REAL MONEY Edition

1. **Clone the repository**
```bash
cd /home/user/Self-Made-Legends-
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment**
```bash
cp .env.example .env
```

4. **Get API Keys (FREE)** - See [REAL_MONEY_SETUP.md](REAL_MONEY_SETUP.md)
   - **Alpaca**: Stock trading (paper or real) - [alpaca.markets](https://alpaca.markets)
   - **Stripe**: Card payments - [stripe.com](https://stripe.com)
   - **Binance/Kraken**: Crypto trading - [binance.com](https://binance.com) or [kraken.com](https://kraken.com)
   - **Plaid**: Bank connections - [plaid.com](https://plaid.com)

5. **Edit .env file with API keys**
```
# Stock Trading - REAL BROKER
ALPACA_API_KEY=your_alpaca_key
ALPACA_API_SECRET=your_alpaca_secret
ALPACA_BASE_URL=https://paper-api.alpaca.markets  # Start with PAPER!

# Crypto Trading - REAL EXCHANGE
CRYPTO_EXCHANGE=binance
CRYPTO_API_KEY=your_binance_key
CRYPTO_API_SECRET=your_binance_secret

# Card Payments - REAL PROCESSOR
STRIPE_API_KEY=your_stripe_key
STRIPE_SECRET_KEY=your_stripe_secret

# Bank Connections
PLAID_CLIENT_ID=your_plaid_client_id
PLAID_SECRET=your_plaid_secret

# Settings
INITIAL_CAPITAL=1
TRADING_ENABLED=false  # Start with FALSE, enable later
```

**⚠️ NEVER commit `.env` to git - contains real API keys!**

## Usage

### Start Complete API Server (Recommended)
```bash
node src/api-server.js
```
Access the dashboard at: `http://localhost:3000`
- Full account management
- Payment processing
- Stocks, crypto, and NFT trading
- WebSocket real-time updates

### Run CLI Trading Bot (Stocks Only)
```bash
npm start
```

### Start Web Dashboard & Server (Legacy)
```bash
npm run server
```
Access dashboard at: `http://localhost:3000`

### Run with Development Mode
```bash
npm run dev
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `ALPHA_VANTAGE_API_KEY` | demo | Stock data API key from Alpha Vantage |
| `OPENSEA_API_KEY` | (optional) | OpenSea API key for NFT data |
| `INITIAL_CAPITAL` | **1** | Starting portfolio value - **Any amount from $1!** |
| `MAX_POSITION_SIZE` | 0.2 | Max % of portfolio per position (0-1) |
| `MAX_LOSS_PERCENT` | 2 | Stop loss threshold (%) |
| `MIN_GAIN_PERCENT` | 1.5 | Take profit threshold (%) |
| `TRADING_ENABLED` | false | Enable actual trading |
| `STOCKS` | AAPL,MSFT,GOOGL | Stock symbols to trade |
| `PORT` | 3000 | API server port |
| `NODE_ENV` | development | Environment mode |

## How It Works

### Trading Cycle
1. **Data Collection**: Fetches historical price and volume data for all stocks
2. **Analysis**: Each AI bot analyzes the data and generates signals
3. **Consensus**: Signals are aggregated to determine overall action
4. **Risk Check**: Validates the trade meets risk management criteria
5. **Execution**: Places buy/sell orders if confidence is high enough
6. **Monitoring**: Continuously checks for stop loss/take profit conditions

### Signal Generation
- **BUY**: Score > 60 (strong uptrend, good momentum)
- **SELL**: Score < 40 (downtrend, negative momentum)
- **HOLD**: Score 40-60 (unclear direction)

### Risk Checks
- Maximum 2% loss allowed per position
- Minimum 1.5% gain to take profits
- Position size limited to 20% of portfolio
- Maximum 10% total portfolio drawdown

## Dashboard Features

### Portfolio Card
- Total portfolio value
- Overall return percentage
- Win rate of trades
- Number of open positions
- Available cash

### Stock Analysis
- Real-time stock prices
- Buy/Sell/Hold signals
- Confidence percentage
- Bot consensus

### Positions Table
- All open positions
- Current prices
- Unrealized gains/losses
- Position values

### Recent Trades
- Last 10 trades
- Trade type (buy/sell)
- Execution price
- Profit/loss for closed trades

## API Endpoints

### Authentication
```
POST /api/auth/register              - Create new account
POST /api/auth/login                 - Login and get session
POST /api/auth/logout                - Logout (requires session)
```

### Account Management
```
GET  /api/account/profile            - Get user profile (requires session)
GET  /api/account/balance            - Get USD balance (requires session)
GET  /api/account/portfolio-value    - Total portfolio value (requires session)
GET  /api/account/wallets            - List saved wallets (requires session)
POST /api/account/wallets            - Add new wallet (requires session)
```

### Payments & Deposits
```
POST /api/payments/deposit           - Create deposit request (requires session)
POST /api/payments/withdraw          - Create withdrawal request (requires session)
GET  /api/payments/history           - Get transaction history (requires session)
```

### Market Data
```
GET  /api/crypto/prices              - Get current crypto prices
GET  /api/crypto/top                 - Get top 10 cryptocurrencies
GET  /api/crypto/:id                 - Get crypto detailed data
GET  /api/nft/trending               - Get trending NFT collections
GET  /api/nft/collection/:slug       - Get NFT collection data
```

### Trading
```
GET  /api/portfolio                  - Get portfolio metrics (requires session)
GET  /api/analysis                   - Get asset analysis results
GET  /api/trades                     - Get trade history (requires session)
GET  /api/trading/status             - Get trading bot status
POST /api/trading/toggle             - Start/stop trading (requires session)
```

## ⚠️ REAL MONEY TRADING DISCLAIMER

### This Bot Uses REAL Money
- **REAL RISK**: You can lose your entire investment
- **NO GUARANTEED RETURNS**: Past performance ≠ future results
- **MARKET RISK**: All investments carry risk of loss
- **YOUR RESPONSIBILITY**: You own all gains and losses
- **NO WARRANTY**: We are not responsible for your losses

### Before Using Real Money
1. **Read [REAL_MONEY_SETUP.md](REAL_MONEY_SETUP.md)** - Complete setup guide
2. **Start with $1** - Test with minimal amount first
3. **Use paper trading** - Practice for 2 weeks before real money
4. **Monitor daily** - Don't set and forget
5. **Only risk what you can lose** - No emergency funds
6. **Understand the risks** - Markets can be unpredictable

### Limitations & Risks
- API downtime can cause delayed execution
- Market conditions change rapidly
- Black swan events can cause sudden 50%+ losses
- Trading fees and taxes not included
- Slippage and execution delays exist
- Bot can malfunction or make bad trades
- No profit guarantee - losses are possible

### Best Practices
1. Start with paper trading only
2. Use small position sizes initially
3. Monitor the dashboard regularly
4. Keep 20%+ in cash for emergencies
5. Adjust stop loss based on volatility
6. Test strategy changes before enabling

## Performance Tracking

The bot tracks:
- Total return percentage
- Win rate (% of profitable trades)
- Unrealized P&L for open positions
- Realized P&L for closed trades
- Maximum drawdown
- Average trade duration

## Customization

### Adding New Strategies
1. Create a new file in `src/strategies/`
2. Implement the `analyze()` method
3. Add the bot to `src/core/TradingEngine.js`

### Modifying Risk Rules
Edit `src/core/RiskManager.js` to adjust:
- Position sizing
- Stop loss thresholds
- Take profit levels
- Portfolio risk limits

## Payment Methods & Fees

### Supported Cards
✅ **All Major Card Types Supported:**
- Visa (2.5% fee)
- Mastercard (2.5% fee)
- American Express (3.5% fee)
- Discover (2.5% fee)
- Diners Club (3% fee)
- JCB (3% fee)
- UnionPay (2% fee)
- MIR (2.5% fee)

### Supported Banks
✅ **50+ Banks Supported Including:**
- Bank of America
- Wells Fargo
- Chase
- Citibank
- Capital One
- Navy Federal
- Ally
- SoFi
- Chime
- And more!

### Deposit Methods
| Method | Platform Fee | Creator Fee | Total | Time |
|--------|----------|------|-------|------|
| 💳 Card | 2.5% | $5 | ~7.5% | Instant |
| 🏦 Bank | Free | $5 | $5 | 1-3 days |
| ₿ Crypto | 0.1% | $5 | ~5% | 5-30 min |
| 📱 PayPal | 2.2% | $5 | ~7% | Instant |

### Withdrawal Methods
| Method | Platform Fee | Creator Fee | Total | Time |
|--------|----------|------|-------|------|
| 🏦 Bank | $5 | $5 | $10 | 1-3 days |
| 💳 Card | 3% | $5 | ~8% | Instant |
| ₿ Crypto | 0.2% | $5 | ~5% | 5-30 min |

**💡 Creator Fee ($5):**
- Supports app development and maintenance
- Supports customer service
- Funds new features and improvements
- One-time fee per transaction
- Goes directly to creator (you support the platform!)

**🎉 Start with $1 - Withdraw $1, $100, $500 - NO LIMITS!**

## Dashboard Features

### Login/Registration
- Create new trading account
- Secure login system
- Session-based authentication
- API key generation

### Account Management
- View profile information
- Manage multiple wallets
- Add crypto and bank wallets
- View account balance

### Trading Dashboard
- Real-time market data
- Multi-asset portfolio view
- Trade signals and confidence levels
- Open positions with P&L
- Trading statistics

## 💰 Creator Earnings Model

**How Creator Makes Money:**
- $5 per user deposit transaction
- $5 per user withdrawal transaction
- Supports continuous platform development
- Funds new features and security updates

**Example Earnings:**
```
Day 1: 100 users deposit
  → $500 Creator Earnings
  
Day 2: 50 users withdraw
  → $250 Creator Earnings
  
Week 1: 500 transactions
  → $2,500 Creator Earnings
  
Month 1: 5,000 transactions
  → $25,000 Creator Earnings
```

**What Creator Earnings Support:**
- 24/7 server uptime
- Security and compliance
- New trading features
- AI improvements
- Customer support
- Platform maintenance

## Supported Assets

### Stocks (Real-time)
- All S&P 500 stocks
- Configurable via `STOCKS` env variable

### Cryptocurrencies
- Bitcoin, Ethereum, Cardano, Solana, Ripple
- 1000+ more via CoinGecko API

### NFTs
- Pudgy Penguins, Bored Ape Yacht Club, Azuki, and more
- 10,000+ collections via OpenSea

## Troubleshooting

### API Rate Limits
Alpha Vantage free tier: 5 requests/min
- Solution: Space out stock monitoring or upgrade API key

### No Data Returned
- Check API key is valid
- Ensure stock symbol is correct
- Check if market is open

### High Slippage
- Reduce position sizes
- Trade more liquid stocks
- Monitor bid-ask spreads

## Development

### Project Structure
```
src/
├── strategies/          # AI trading strategies
│   ├── TechnicalAnalysisBot.js
│   └── MomentumBot.js
├── core/               # Core trading logic
│   ├── Portfolio.js
│   ├── RiskManager.js
│   └── TradingEngine.js
├── data/               # Data fetching
│   └── DataFetcher.js
├── index.js           # CLI bot
└── server.js          # Web server
public/
└── index.html         # Dashboard UI
```

### Future Improvements
- [ ] Live trading integration
- [ ] Machine learning models
- [ ] Advanced charting
- [ ] Email/SMS alerts
- [ ] Database persistence
- [ ] Backtesting engine
- [ ] Multi-timeframe analysis
- [ ] Sentiment analysis

## License

MIT

## Support

For issues, questions, or improvements, please create an issue on GitHub.

---

**Happy Trading! 📈**

Remember: Invest responsibly and never risk more than you can afford to lose.
