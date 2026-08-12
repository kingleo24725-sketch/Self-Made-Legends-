# 🤖 AI Trading Bot - Stocks, Crypto & NFTs

A comprehensive multi-asset AI-powered trading bot that trades **stocks, cryptocurrencies, and NFTs** with professional account management, payment processing, and portfolio management.

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

### 💳 Fast Payment Processing
- **Multiple deposit methods**: Credit card, bank transfer, crypto, PayPal
- **Multiple withdrawal methods**: Bank transfer, crypto wallet, card
- **Instant processing** for card/PayPal deposits (1-2 minutes)
- **Fast crypto transfers** (5-30 minutes)
- **Secure wallet management** for crypto withdrawals
- **Transparent fee structure** - clearly shown before transactions
- **Transaction history** with detailed records

### 🏪 Multi-Asset Trading
- **Stocks**: S&P 500 companies
- **Cryptocurrencies**: Bitcoin, Ethereum, Cardano, Solana, Ripple
- **NFTs**: Trending collections from OpenSea
- Unified portfolio across all asset classes

### 🔐 Security Features
- Password hashing for account protection
- Session tokens with expiration
- Wallet address verification
- Transaction verification for large withdrawals
- Optional two-factor authentication support

### 📊 Paper Trading
- Test strategies with virtual money before live trading
- No real capital at risk during development and testing

## Installation

### Prerequisites
- Node.js 14+
- npm or yarn

### Setup

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

4. **Edit .env file with your settings**
```
ALPHA_VANTAGE_API_KEY=your_free_api_key
INITIAL_CAPITAL=10000
MAX_POSITION_SIZE=0.2
MAX_LOSS_PERCENT=2
MIN_GAIN_PERCENT=1.5
TRADING_ENABLED=false
STOCKS=AAPL,MSFT,GOOGL,AMZN,TSLA
```

Get a free API key from [Alpha Vantage](https://www.alphavantage.co/api/)

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
| `INITIAL_CAPITAL` | 10000 | Starting portfolio value |
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

## Important Disclaimers ⚠️

### This Bot Is For Learning & Development
- **No Guaranteed Returns**: Past performance does not guarantee future results
- **Market Risk**: All investments carry risk of loss
- **Test First**: Always test with paper trading before live trading
- **Supervision**: Monitor the bot regularly for unexpected behavior
- **No Warranty**: Use at your own risk - we are not responsible for losses

### Limitations
- Relies on API data availability (Alpha Vantage has free tier limits)
- Market conditions can change rapidly
- Black swan events can cause unexpected losses
- Trading costs and taxes not included in calculations
- Slippage and execution delays not modeled

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

### Deposit Methods
| Method | Fee | Time | Minimum |
|--------|-----|------|---------|
| Credit/Debit Card | 2.5% | Instant | $50 |
| Bank Transfer | Free | 1-3 days | $100 |
| Crypto Wallet | 0.1% | 5-30 min | 0.001 BTC equiv |
| PayPal | 2.2% | Instant | $25 |

### Withdrawal Methods
| Method | Fee | Time | Minimum |
|--------|-----|------|---------|
| Bank Account | $5 | 1-3 days | $100 |
| Credit/Debit Card | 3% | Instant | $50 |
| Crypto Wallet | 0.2% | 5-30 min | varies |
| SWIFT Transfer | $15 | 24-48 hrs | $500 |

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
