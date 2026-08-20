# Pricing

The single source of truth for both catalogs is `src/payments/StripeProcessor.js`
(`CREDIT_PACKAGES` and `PAPER_MONEY_PACKAGES`). Everything else — the shop, the gift
dropdowns, the purchase messages — must be read from or matched against those objects.
`api-server.js` imports them rather than keeping its own copy, because hand-copied
tables previously drifted and paid out amounts nobody was charged for.

## Current sheet

Positioned deliberately **under market** while the game is new and has no brand yet.

| Item | Price | Market comparison |
|---|---|---|
| Creator Membership | $4.99/mo | Roblox Plus $4.99, Genshin Welkin $4.99 |
| Elite Membership | $9.99/mo | Marvel Snap Premium+ $14.99 |
| VIP Game Pass | $5.99/mo | Category runs $4.99–$9.99 |
| Premium AI Coach | $4.99/mo | — |
| Season Pass | $6.99 | Standard is $9.99 |
| Battle Pass | $4.99 | Fortnite $9.99, Marvel Snap $9.99 |
| Jail Buyout / Tournament Entry | $4.99 | — |
| Legend Starter Bundle | $9.99 | Best value in the shop, by design |

### SML Bucks

| Pack | Price | Bucks | Per $ |
|---|---|---|---|
| Hustle | $1.99 | 25,000 | 12,563 |
| Grind | $4.99 | 70,000 | 14,028 |
| Investor | $9.99 | 160,000 | 16,016 |
| Whale | $19.99 | 360,000 | 18,009 |
| Ultimate | $39.99 | 800,000 | 20,005 |

### SML Credits

| Pack | Price | Credits | Per $ |
|---|---|---|---|
| Starter | $1.99 | 320 | 161 |
| Legends | $4.99 | 950 | 190 |
| Champion | $9.99 | 2,200 | 220 |
| Baller | $19.99 | 5,000 | 250 |

## The rule that matters

**Every tier must give more per dollar than the tier below it, by a similar step.**

The old ladder ran from 200 to 5,000 SML Bucks per dollar — a 25× swing. Because players
start with 1,000 SML Bucks free, the $5 entry pack merely doubled their starting cash, so
the pack most first-time buyers try was the worst deal in the game. That is how you lose a
buyer permanently after their first purchase.

Both curves are now a smooth ~1.6× spread from cheapest to most expensive tier. If you add
or reprice a pack, check the per-dollar column still rises monotonically.

Prices end in `.99`. Round numbers read as more expensive and are not standard app-store
tiers, which matters if this ever ships to the App Store or Play Store.

## Raising later

Raise when you have evidence, not on a calendar. Stage 2 once you have real retention data
and a first wave of reviews; Stage 3 once retention is proven and you are no longer
competing on price alone.

| Item | Now | Stage 2 (~100 active players) | Stage 3 (retention proven) |
|---|---|---|---|
| Creator | $4.99 | $5.99 | $6.99 |
| Elite | $9.99 | $11.99 | $14.99 |
| VIP Pass | $5.99 | $6.99 | $7.99 |
| Season Pass | $6.99 | $7.99 | $9.99 |
| Battle Pass | $4.99 | $6.99 | $9.99 |
| Bucks top tier | $39.99 | $49.99 | $99.99 |

When you raise, keep the per-dollar curve rising — scale the pack contents with the price
rather than only moving the price.

### What a raise does and does not affect

- **Existing subscribers are never repriced.** Stripe binds a subscription to the Price
  object it was created with. A change only reaches new sign-ups. Nobody already paying
  gets charged more.
- **`STRIPE_CREATOR_PRICE_ID` overrides the code.** If that environment variable is set,
  `getOrCreatePrice()` returns it and `CREATOR_FEE_CENTS` is ignored entirely. To reprice
  the Creator subscription you must create a new Price in Stripe and update the variable —
  editing the constant alone will silently do nothing.
- Elite and VIP create a fresh Stripe Product + Price on **every server restart**, because
  they cache the ID only in memory. This works but clutters the Stripe account over time;
  giving them env vars like the Creator sub has would fix it.

## Regional pricing

Not implemented. Everything is flat USD worldwide.

Worth revisiting once you know where players actually come from: revenue per install in
India and Southeast Asia runs roughly a fifth of North America's, and purchasing-power
pricing typically multiplies units sold in those markets without cannibalizing US/EU sales.
A $9.99 subscription is out of reach in much of the world.
