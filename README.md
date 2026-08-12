# 🤖 AI Stock Trading Bot

A sophisticated multi-strategy AI-powered stock trading bot with real-time portfolio management, risk control, and beautiful web dashboard.

## Features

### 🎯 Multiple AI Strategies
- **Technical Analysis Bot**: Uses RSI, MACD, Bollinger Bands, and Moving Averages
- **Momentum Bot**: Analyzes price momentum and volume changes
- **Consensus Algorithm**: Aggregates signals from multiple bots for better accuracy

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

### Start Web Dashboard & Server
```bash
npm run server
```
Access the dashboard at: `http://localhost:3000`

### Run CLI Trading Bot
```bash
npm start
```

### Run with Development Mode
```bash
npm run dev
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `ALPHA_VANTAGE_API_KEY` | demo | Your Alpha Vantage API key |
| `INITIAL_CAPITAL` | 10000 | Starting portfolio value |
| `MAX_POSITION_SIZE` | 0.2 | Max % of portfolio per position (0-1) |
| `MAX_LOSS_PERCENT` | 2 | Stop loss threshold (%) |
| `MIN_GAIN_PERCENT` | 1.5 | Take profit threshold (%) |
| `TRADING_ENABLED` | false | Enable actual trading |
| `STOCKS` | AAPL,MSFT,GOOGL | Comma-separated stock symbols |

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

```
GET  /api/portfolio          - Get portfolio metrics
GET  /api/analysis           - Get stock analysis results
GET  /api/positions          - Get open positions
GET  /api/trades             - Get trade history
GET  /api/trading/status     - Get trading status
POST /api/trading/toggle     - Start/stop trading
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
