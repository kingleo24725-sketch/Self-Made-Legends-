# Self-Made Legends — AI Trading Game

**A simulated stock, crypto & NFT trading game with AI coaching, social features, and live competitions.**

> **This is a game.** All trading uses virtual SML Bucks — no real money is wagered or at risk. Stripe purchases unlock game features only.

## What Is It?

Self-Made Legends is a web-based trading simulation game where players compete on a live national leaderboard. An AI coach provides trade suggestions, players earn virtual SML Bucks, and dozens of game systems (loot boxes, heists, card collecting, racing, pets, and more) keep things engaging.

## Features

### Trading Simulation
- Paper trading across stocks, crypto, and NFTs (no real broker connections)
- AI coach analyzes simulated portfolios and suggests buy/sell actions
- Limit orders, price alerts, and portfolio analytics
- All prices are simulated — not live exchange data

### Game Systems
- Mystery Loot Boxes, Flash Challenges, Card Collection, Pets, Car Racing
- Underworld heists, bounties, weapons, jail system, heat level
- Weekly Trade War (battle royale) and tournament competitions
- Real estate, custom crypto tokens, NFT minting

### Social & Competition
- Live national leaderboard
- Player profiles, teams, DMs, community feed
- Season Pass, Battle Pass, Hall of Fame

### Purchases (Stripe)
All real-money purchases are for game features only. SML Bucks and SML Credits are virtual currency with no cash value and cannot be withdrawn.
- **Subscriptions**: Creator Membership, Elite Membership, Premium AI Coach, VIP Casino
- **Cosmetics & Items**: Pets, cars, weapons, real estate, loot boxes, card packs
- **Currency Packs**: SML Bucks packs used within the game

See [terms.html](/public/terms.html) for full purchase terms and loot box odds disclosure.

## Setup

### Prerequisites
- Node.js 14+
- npm

### Install & Run

```bash
npm install
node src/api-server.js
```

Access the dashboard at: `http://localhost:3000`

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3000 | Server port |
| `NODE_ENV` | development | Environment |
| `STRIPE_SECRET_KEY` | — | Stripe secret key for payments |
| `STRIPE_WEBHOOK_SECRET` | — | Stripe webhook signing secret |
| `JWT_SECRET` | — | Session signing key |

**Never commit `.env` to git.**

### Development Mode

```bash
npm run dev
```

## API Endpoints

### Authentication
```
POST /api/auth/register              - Create account (18+ required)
POST /api/auth/login                 - Login
POST /api/auth/logout                - Logout
```

### Account
```
GET  /api/account/profile            - User profile
GET  /api/account/balance            - SML Bucks balance
GET  /api/account/portfolio-value    - Portfolio value
```

### Trading (Simulated)
```
GET  /api/portfolio                  - Portfolio metrics
GET  /api/analysis                   - Market signals
GET  /api/trades                     - Trade history
POST /api/trading/buy                - Buy (simulated)
POST /api/trading/sell               - Sell (simulated)
```

### Game
```
POST /api/boxes/open                 - Open loot box
POST /api/cards/open-pack            - Open card pack
GET  /api/casino/chips               - Casino chip balance
POST /api/missions/complete          - Complete daily mission
```

## Project Structure

```
src/
├── api-server.js          # Express server + all routes
├── accounts/              # Account management
├── coach/                 # AI trade coach (TradeCoach.js)
├── database/              # SQLite database wrapper
├── gamification/          # XP, missions, seasons
├── market/                # Simulated price engine
├── payments/              # Stripe integration
├── security/              # Auth, rate limiting
└── marketing/             # Marketing content generator
public/
├── dashboard.html         # Main game UI
├── terms.html             # Terms of service
├── privacy-policy.html    # Privacy policy
└── admin.html             # Admin panel
```

## Disclaimer

Self-Made Legends is a game for entertainment purposes only.
- All trading is simulated — no real securities are bought or sold
- SML Bucks and SML Credits are virtual currency with no real-world value
- AI coach suggestions are for entertainment only — not financial advice
- Casino uses free chips only — no real money is wagered
- Players must be 18 or older to register

For support, open an issue on GitHub.
