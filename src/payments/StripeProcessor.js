const stripe = require("stripe");

const CREATOR_FEE_CENTS = 750; // $7.50/month

const CREDIT_PACKAGES = {
  starter:  { credits: 500,  amount_cents: 500, label: 'SML Credits — Starter Pack (500 Credits)' },
  legends:  { credits: 2500, amount_cents: 1250, label: 'SML Credits — Legends Pack (2,500 Credits)' },
  champion: { credits: 7000, amount_cents: 2750, label: 'SML Credits — Champion Pack (7,000 Credits)' },
};

// SML Bucks packages — real money → virtual paper trading capital
const PAPER_MONEY_PACKAGES = {
  hustle:   { paper: 1000,   amount_cents: 500,  label: 'Hustle Pack — $1,000 SML Bucks' },
  grind:    { paper: 5000,   amount_cents: 800, label: 'Grind Pack — $5,000 SML Bucks' },
  investor: { paper: 25000,  amount_cents: 1000, label: 'Investor Pack — $25,000 SML Bucks' },
  whale:    { paper: 50000,  amount_cents: 1250, label: 'Whale Pack — $50,000 SML Bucks' },
  ultimate: { paper: 200000, amount_cents: 4000, label: 'Ultimate Pack — $200,000 SML Bucks' },
};

// Returns Unix timestamp for midnight UTC on the 1st of next month
function nextFirstOfMonth() {
  const now = new Date();
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return Math.floor(next.getTime() / 1000);
}

class StripeProcessor {
  constructor() {
    this.stripe = stripe(process.env.STRIPE_SECRET_KEY);
    this.publishableKey = process.env.STRIPE_PUBLISHABLE_KEY || "";
    // Cached Stripe Price ID for the $7.50/month subscription
    this._priceId = process.env.STRIPE_CREATOR_PRICE_ID || null;
  }

  // Get or create the recurring $7.50/month Price on Stripe
  async getOrCreatePrice() {
    if (this._priceId) return this._priceId;

    const product = await this.stripe.products.create({
      name: "Self-Made Legends Creator Subscription",
      description: "$7.50/month creator membership — billed on the 1st of each month",
    });

    const price = await this.stripe.prices.create({
      product: product.id,
      unit_amount: CREATOR_FEE_CENTS,
      currency: "usd",
      recurring: { interval: "month" },
    });

    this._priceId = price.id;
    return price.id;
  }

  // Create a Stripe Checkout Session for the $7.50/month subscription
  async createCheckoutSession(userId, userEmail, successUrl, cancelUrl) {
    const priceId = await this.getOrCreatePrice();

    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      customer_email: userEmail || undefined,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      // Anchor billing to the 1st of next month
      subscription_data: {
        billing_cycle_anchor: nextFirstOfMonth(),
        prorate: false,
        metadata: {
          userId: String(userId),
          type: "creator_subscription",
          platform: "Self-Made Legends",
        },
      },
      success_url:
        successUrl ||
        "https://web-production-576d9.up.railway.app/dashboard.html?payment=success",
      cancel_url:
        cancelUrl ||
        "https://web-production-576d9.up.railway.app/dashboard.html?payment=cancelled",
      metadata: {
        userId: String(userId),
        type: "creator_subscription",
      },
    });

    return {
      checkoutUrl: session.url,
      sessionId: session.id,
    };
  }

  // Retrieve subscription status for a customer
  async getSubscriptionStatus(stripeCustomerId) {
    const subs = await this.stripe.subscriptions.list({
      customer: stripeCustomerId,
      status: "active",
      limit: 1,
    });
    return {
      active: subs.data.length > 0,
      subscription: subs.data[0] || null,
    };
  }

  // Cancel a subscription
  async cancelSubscription(subscriptionId) {
    const sub = await this.stripe.subscriptions.cancel(subscriptionId);
    return { cancelled: sub.status === "canceled", status: sub.status };
  }

  // Create a Stripe Checkout Session for the Season Pass ($7.50 one-time)
  async createSeasonPassCheckout(userId, userEmail) {
    const BASE = process.env.BASE_URL || 'https://web-production-576d9.up.railway.app';
    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: userEmail || undefined,
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: 'SML Season Pass', description: 'Premium badge frames, 1.5× XP multiplier, private leaderboard tier' },
          unit_amount: 750,
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${BASE}/dashboard.html?payment=success&pay_type=season_pass`,
      cancel_url:  `${BASE}/dashboard.html?payment=cancelled`,
      metadata: { userId: String(userId), type: 'season_pass', platform: 'Self-Made Legends' },
    });
    return { checkoutUrl: session.url, sessionId: session.id };
  }

  // Create a Stripe Checkout Session for SML Credits top-up (one-time)
  async createCreditTopupCheckout(userId, userEmail, packageKey) {
    const pkg = CREDIT_PACKAGES[packageKey];
    if (!pkg) throw new Error(`Unknown credit package: ${packageKey}`);
    const BASE = process.env.BASE_URL || 'https://web-production-576d9.up.railway.app';
    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: userEmail || undefined,
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: pkg.label },
          unit_amount: pkg.amount_cents,
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${BASE}/dashboard.html?payment=success&pay_type=credits_${packageKey}`,
      cancel_url:  `${BASE}/dashboard.html?payment=cancelled`,
      metadata: { userId: String(userId), type: `credit_topup_${packageKey}`, platform: 'Self-Made Legends' },
    });
    return { checkoutUrl: session.url, sessionId: session.id };
  }

  // Create a Stripe Checkout Session for Premium Coach Pro ($5.00/month recurring)
  async createCoachProCheckout(userId, userEmail) {
    const BASE = process.env.BASE_URL || 'https://web-production-576d9.up.railway.app';
    if (!this._coachProPriceId) {
      const product = await this.stripe.products.create({
        name: 'SML Premium AI Coach',
        description: '$5.00/month — Deeper AI responses, weekly personalized reports',
      });
      const price = await this.stripe.prices.create({
        product: product.id,
        unit_amount: 500,
        currency: 'usd',
        recurring: { interval: 'month' },
      });
      this._coachProPriceId = price.id;
    }
    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: userEmail || undefined,
      line_items: [{ price: this._coachProPriceId, quantity: 1 }],
      mode: 'subscription',
      subscription_data: {
        metadata: { userId: String(userId), type: 'coach_pro', platform: 'Self-Made Legends' },
      },
      success_url: `${BASE}/dashboard.html?payment=success&pay_type=coach_pro`,
      cancel_url:  `${BASE}/dashboard.html?payment=cancelled`,
      metadata: { userId: String(userId), type: 'coach_pro' },
    });
    return { checkoutUrl: session.url, sessionId: session.id };
  }

  // Create a Stripe Checkout Session for SML Bucks top-up
  async createPaperMoneyCheckout(userId, userEmail, packageKey) {
    const pkg = PAPER_MONEY_PACKAGES[packageKey];
    if (!pkg) throw new Error(`Unknown SML Bucks package: ${packageKey}`);
    const BASE = process.env.BASE_URL || 'https://web-production-576d9.up.railway.app';
    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: userEmail || undefined,
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: pkg.label, description: `Add $${pkg.paper.toLocaleString()} SML Bucks to your SML trading account` },
          unit_amount: pkg.amount_cents,
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${BASE}/dashboard.html?payment=success&pay_type=paper_money_${packageKey}`,
      cancel_url:  `${BASE}/dashboard.html?payment=cancelled`,
      metadata: { userId: String(userId), type: `paper_money_${packageKey}`, platform: 'Self-Made Legends' },
    });
    return { checkoutUrl: session.url, sessionId: session.id };
  }

  // DEPRECATED — tournament entry now uses SML Credits (1,000 Credits), not Stripe.
  // This method is superseded by the Credits-based flow in POST /api/stripe/tournament-entry.
  async createTournamentEntryCheckout(userId, userEmail, tournamentId) {
    const BASE = process.env.BASE_URL || 'https://web-production-576d9.up.railway.app';
    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: userEmail || undefined,
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: 'SML Tournament Entry', description: '80% of entry pool pays top-3 players in SML Bucks (virtual currency — no cash value). Tournament prizes are not real money.' },
          unit_amount: 500,
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${BASE}/dashboard.html?payment=success&pay_type=tournament`,
      cancel_url:  `${BASE}/dashboard.html?payment=cancelled`,
      metadata: { userId: String(userId), type: 'tournament_entry', tournamentId: String(tournamentId), platform: 'Self-Made Legends' },
    });
    return { checkoutUrl: session.url, sessionId: session.id };
  }

  // Create a Stripe Checkout Session for Jail Buyout ($5.00 one-time → release + $1k SML Bucks)
  async createJailBuyoutCheckout(userId, userEmail) {
    const BASE = process.env.BASE_URL || 'https://web-production-576d9.up.railway.app';
    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: userEmail || undefined,
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: 'SML Jail Buyout', description: 'Pay your way out of jail + receive $1,000 SML Bucks' },
          unit_amount: 500,
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${BASE}/dashboard.html?payment=success&pay_type=jail_buyout`,
      cancel_url:  `${BASE}/dashboard.html?payment=cancelled`,
      metadata: { userId: String(userId), type: 'jail_buyout', platform: 'Self-Made Legends' },
    });
    return { checkoutUrl: session.url, sessionId: session.id };
  }

  // Create a Stripe Checkout Session for a Weapon purchase (permanent)
  async createWeaponCheckout(userId, userEmail, weaponKey, weaponLabel, priceCents) {
    const BASE = process.env.BASE_URL || 'https://web-production-576d9.up.railway.app';
    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: userEmail || undefined,
      line_items: [{ price_data: { currency: 'usd',
        product_data: { name: `SML Weapon — ${weaponLabel}`, description: 'Permanent heist weapon upgrade' },
        unit_amount: priceCents }, quantity: 1 }],
      mode: 'payment',
      success_url: `${BASE}/dashboard.html?payment=success&pay_type=weapon_${weaponKey}`,
      cancel_url:  `${BASE}/dashboard.html?payment=cancelled`,
      metadata: { userId: String(userId), type: `weapon_${weaponKey}`, platform: 'Self-Made Legends' },
    });
    return { checkoutUrl: session.url, sessionId: session.id };
  }

  // Create a Stripe Checkout Session for a Guard Dog purchase (permanent)
  async createGuardDogCheckout(userId, userEmail, dogKey, dogLabel, priceCents) {
    const BASE = process.env.BASE_URL || 'https://web-production-576d9.up.railway.app';
    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: userEmail || undefined,
      line_items: [{ price_data: { currency: 'usd',
        product_data: { name: `SML Guard Dog — ${dogLabel}`, description: 'Permanent defensive guard dog' },
        unit_amount: priceCents }, quantity: 1 }],
      mode: 'payment',
      success_url: `${BASE}/dashboard.html?payment=success&pay_type=guard_dog_${dogKey}`,
      cancel_url:  `${BASE}/dashboard.html?payment=cancelled`,
      metadata: { userId: String(userId), type: `guard_dog_${dogKey}`, platform: 'Self-Made Legends' },
    });
    return { checkoutUrl: session.url, sessionId: session.id };
  }

  // Create a Stripe Checkout Session for a Defense Shield purchase (degradable)
  async createShieldCheckout(userId, userEmail, shieldKey, shieldLabel, priceCents) {
    const BASE = process.env.BASE_URL || 'https://web-production-576d9.up.railway.app';
    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: userEmail || undefined,
      line_items: [{ price_data: { currency: 'usd',
        product_data: { name: `SML Defense Shield — ${shieldLabel}`, description: 'Degrading heist defense shield — must repurchase when destroyed' },
        unit_amount: priceCents }, quantity: 1 }],
      mode: 'payment',
      success_url: `${BASE}/dashboard.html?payment=success&pay_type=shield_${shieldKey}`,
      cancel_url:  `${BASE}/dashboard.html?payment=cancelled`,
      metadata: { userId: String(userId), type: `shield_${shieldKey}`, platform: 'Self-Made Legends' },
    });
    return { checkoutUrl: session.url, sessionId: session.id };
  }

  // Create a Stripe Checkout Session to gift SML Bucks to another player
  async createGiftPaperMoneyCheckout(senderId, senderEmail, recipientId, packageKey, pkg) {
    const BASE = process.env.BASE_URL || 'https://web-production-576d9.up.railway.app';
    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: senderEmail || undefined,
      line_items: [{ price_data: { currency: 'usd',
        product_data: { name: `SML Gift — ${pkg.label}`, description: `Send $${pkg.paper.toLocaleString()} SML Bucks to a friend` },
        unit_amount: pkg.amount_cents }, quantity: 1 }],
      mode: 'payment',
      success_url: `${BASE}/dashboard.html?payment=success&pay_type=gift_paper_money_${packageKey}`,
      cancel_url:  `${BASE}/dashboard.html?payment=cancelled`,
      metadata: { userId: String(senderId), recipientId: String(recipientId), type: `gift_paper_money_${packageKey}`, platform: 'Self-Made Legends' },
    });
    return { checkoutUrl: session.url, sessionId: session.id };
  }

  // Create a Stripe Checkout Session for a Getaway Vehicle purchase (permanent)
  async createGetawayCheckout(userId, userEmail, vehicleKey, vehicleLabel, priceCents) {
    const BASE = process.env.BASE_URL || 'https://web-production-576d9.up.railway.app';
    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: userEmail || undefined,
      line_items: [{ price_data: { currency: 'usd',
        product_data: { name: `SML Getaway — ${vehicleLabel}`, description: 'Permanent getaway vehicle: reduces catch rate and bail cost' },
        unit_amount: priceCents }, quantity: 1 }],
      mode: 'payment',
      success_url: `${BASE}/dashboard.html?payment=success&pay_type=getaway_${vehicleKey}`,
      cancel_url:  `${BASE}/dashboard.html?payment=cancelled`,
      metadata: { userId: String(userId), type: `getaway_${vehicleKey}`, platform: 'Self-Made Legends' },
    });
    return { checkoutUrl: session.url, sessionId: session.id };
  }

  // Create a Stripe Checkout Session for Virtual Real Estate purchase (permanent)
  async createRealEstateCheckout(userId, userEmail, propertyKey, propertyLabel, priceCents) {
    const BASE = process.env.BASE_URL || 'https://web-production-576d9.up.railway.app';
    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: userEmail || undefined,
      line_items: [{ price_data: { currency: 'usd',
        product_data: { name: `SML Real Estate — ${propertyLabel}`, description: 'Virtual property generating daily passive SML Bucks income' },
        unit_amount: priceCents }, quantity: 1 }],
      mode: 'payment',
      success_url: `${BASE}/dashboard.html?payment=success&pay_type=realestate_${propertyKey}`,
      cancel_url:  `${BASE}/dashboard.html?payment=cancelled`,
      metadata: { userId: String(userId), type: `realestate_${propertyKey}`, platform: 'Self-Made Legends' },
    });
    return { checkoutUrl: session.url, sessionId: session.id };
  }

  // Create a Stripe Checkout Session for Battle Pass Season 1 ($5.00)
  async createBattlePassCheckout(userId, userEmail) {
    const BASE = process.env.BASE_URL || 'https://web-production-576d9.up.railway.app';
    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: userEmail || undefined,
      line_items: [{ price_data: { currency: 'usd',
        product_data: { name: 'SML Battle Pass — Season 1', description: 'Unlock premium tier rewards across all 10 Battle Pass tiers' },
        unit_amount: 500 }, quantity: 1 }],
      mode: 'payment',
      success_url: `${BASE}/dashboard.html?payment=success&pay_type=battle_pass`,
      cancel_url:  `${BASE}/dashboard.html?payment=cancelled`,
      metadata: { userId: String(userId), type: 'battle_pass', platform: 'Self-Made Legends' },
    });
    return { checkoutUrl: session.url, sessionId: session.id };
  }

  // Create a Stripe Checkout Session for VIP Elite Membership ($15.00/month recurring)
  async createEliteCheckout(userId, userEmail) {
    const BASE = process.env.BASE_URL || 'https://web-production-576d9.up.railway.app';
    if (!this._elitePriceId) {
      const product = await this.stripe.products.create({
        name: 'Self-Made Legends Elite Membership',
        description: '$15.00/month — VIP perks: 3× safe capacity, Elite badge, permanent 2× XP, exclusive heist',
      });
      const price = await this.stripe.prices.create({
        product: product.id,
        unit_amount: 1500,
        currency: 'usd',
        recurring: { interval: 'month' },
      });
      this._elitePriceId = price.id;
    }
    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: userEmail || undefined,
      line_items: [{ price: this._elitePriceId, quantity: 1 }],
      mode: 'subscription',
      subscription_data: {
        metadata: { userId: String(userId), type: 'elite_membership', platform: 'Self-Made Legends' },
      },
      success_url: `${BASE}/dashboard.html?payment=success&pay_type=elite_membership`,
      cancel_url:  `${BASE}/dashboard.html?payment=cancelled`,
      metadata: { userId: String(userId), type: 'elite_membership', platform: 'Self-Made Legends' },
    });
    return { checkoutUrl: session.url, sessionId: session.id };
  }

  // Create a Stripe Checkout Session to gift SML Credits to another player
  async createGiftCreditsCheckout(senderId, senderEmail, recipientId, packageKey, pkg) {
    const BASE = process.env.BASE_URL || 'https://web-production-576d9.up.railway.app';
    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: senderEmail || undefined,
      line_items: [{ price_data: { currency: 'usd',
        product_data: { name: `SML Gift Credits — ${pkg.label}`, description: `Send ${pkg.credits} SML Credits to a friend` },
        unit_amount: pkg.amount_cents }, quantity: 1 }],
      mode: 'payment',
      success_url: `${BASE}/dashboard.html?payment=success&pay_type=gift_credits_${packageKey}`,
      cancel_url:  `${BASE}/dashboard.html?payment=cancelled`,
      metadata: { userId: String(senderId), recipientId: String(recipientId), type: `gift_credits_${packageKey}`, platform: 'Self-Made Legends' },
    });
    return { checkoutUrl: session.url, sessionId: session.id };
  }

  // Create a Stripe Checkout Session for the Legend Starter Bundle ($10.00 one-time)
  async createLegendBundleCheckout(userId, userEmail) {
    const BASE = process.env.BASE_URL || 'https://web-production-576d9.up.railway.app';
    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: userEmail || undefined,
      line_items: [{ price_data: { currency: 'usd',
        product_data: { name: 'SML Legend Starter Bundle', description: '2,500 Credits + $5,000 SML Bucks + Neon Frame + Season XP Boost' },
        unit_amount: 1000 }, quantity: 1 }],
      mode: 'payment',
      success_url: `${BASE}/dashboard.html?payment=success&pay_type=legend_bundle`,
      cancel_url:  `${BASE}/dashboard.html?payment=cancelled`,
      metadata: { userId: String(userId), type: 'legend_bundle', platform: 'Self-Made Legends' },
    });
    return { checkoutUrl: session.url, sessionId: session.id };
  }

  // Pet purchase checkout
  async createPetCheckout(userId, userEmail, petKey, petLabel, priceCents) {
    const BASE = process.env.BASE_URL || 'https://web-production-576d9.up.railway.app';
    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: userEmail || undefined,
      line_items: [{ price_data: { currency: 'usd',
        product_data: { name: `SML Pet — ${petLabel}`, description: 'Your new Self-Made Legends pet companion' },
        unit_amount: priceCents }, quantity: 1 }],
      mode: 'payment',
      success_url: `${BASE}/dashboard.html?payment=success&pay_type=pet_${petKey}`,
      cancel_url: `${BASE}/dashboard.html?payment=cancelled`,
      metadata: { userId: String(userId), type: `pet_${petKey}`, platform: 'Self-Made Legends' },
    });
    return { checkoutUrl: session.url, sessionId: session.id };
  }

  // Car purchase checkout
  async createCarCheckout(userId, userEmail, carKey, carLabel, priceCents) {
    const BASE = process.env.BASE_URL || 'https://web-production-576d9.up.railway.app';
    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: userEmail || undefined,
      line_items: [{ price_data: { currency: 'usd',
        product_data: { name: `SML Garage — ${carLabel}`, description: 'Street racing car + heist getaway vehicle' },
        unit_amount: priceCents }, quantity: 1 }],
      mode: 'payment',
      success_url: `${BASE}/dashboard.html?payment=success&pay_type=car_${carKey}`,
      cancel_url: `${BASE}/dashboard.html?payment=cancelled`,
      metadata: { userId: String(userId), type: `car_${carKey}`, platform: 'Self-Made Legends' },
    });
    return { checkoutUrl: session.url, sessionId: session.id };
  }

  // DISABLED — card packs are now Credits-only. Real-money direct purchase removed.
  async createCardPackCheckout(userId, userEmail, packType) {
    throw new Error('Card packs are purchased with SML Credits only. Buy Credits above, then open packs in the Cards tab.');
  }
  async _createCardPackCheckout_disabled(userId, userEmail, packType) {
    const BASE = process.env.BASE_URL || 'https://web-production-576d9.up.railway.app';
    const PACKS = {
      rare:      { label: 'Rare Card Pack',      desc: '5 virtual collectible cards. Odds: Uncommon 50%, Rare 40%, Epic 9%, Legendary 1%. Virtual items only — no cash value.',       amount: 999 },
      legendary: { label: 'Legendary Card Pack', desc: '5 virtual collectible cards. Odds: Rare 40%, Epic 40%, Legendary 20%. Virtual items only — no cash value.', amount: 1999 },
    };
    const pack = PACKS[packType];
    if (!pack) throw new Error(`Unknown card pack: ${packType}`);
    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: userEmail || undefined,
      line_items: [{ price_data: { currency: 'usd',
        product_data: { name: `SML ${pack.label}`, description: pack.desc },
        unit_amount: pack.amount }, quantity: 1 }],
      mode: 'payment',
      success_url: `${BASE}/dashboard.html?payment=success&pay_type=card_pack_${packType}`,
      cancel_url: `${BASE}/dashboard.html?payment=cancelled`,
      metadata: { userId: String(userId), type: `card_pack_${packType}`, platform: 'Self-Made Legends' },
    });
    return { checkoutUrl: session.url, sessionId: session.id };
  }

  // DISABLED — loot boxes are now Credits-only. Real-money direct purchase removed.
  async createLootBoxCheckout(userId, userEmail) {
    throw new Error('Loot boxes are purchased with SML Credits only. Buy Credits above, then open boxes in-game.');
  }
  async _createLootBoxCheckout_disabled(userId, userEmail) {
    const BASE = process.env.BASE_URL || 'https://web-production-576d9.up.railway.app';
    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: userEmail || undefined,
      line_items: [{ price_data: { currency: 'usd',
        product_data: { name: 'SML Premium Loot Box (5-pack)', description: '5 premium virtual loot boxes. Odds per box: Common 40%, Rare 35%, Epic 20%, Legendary 5%. All items are virtual with no cash value.' },
        unit_amount: 500 }, quantity: 1 }],
      mode: 'payment',
      success_url: `${BASE}/dashboard.html?payment=success&pay_type=loot_box_premium`,
      cancel_url: `${BASE}/dashboard.html?payment=cancelled`,
      metadata: { userId: String(userId), type: 'loot_box_premium', platform: 'Self-Made Legends' },
    });
    return { checkoutUrl: session.url, sessionId: session.id };
  }

  // VIP Game Pass ($7.50/month)
  async createCasinoVIPCheckout(userId, userEmail) {
    const BASE = process.env.BASE_URL || 'https://web-production-576d9.up.railway.app';
    if (!this._casinoVIPPriceId) {
      const product = await this.stripe.products.create({
        name: 'SML VIP Game Pass',
        description: '$7.50/month — Unlocks VIP game modes, high-stakes simulated tables, 10× in-game rewards, and VIP room features. All gameplay uses virtual Casino Chips — no real money is wagered. Renews automatically. Cancel anytime.',
      });
      const price = await this.stripe.prices.create({
        product: product.id,
        unit_amount: 750,
        currency: 'usd',
        recurring: { interval: 'month' },
      });
      this._casinoVIPPriceId = price.id;
    }
    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: userEmail || undefined,
      line_items: [{ price: this._casinoVIPPriceId, quantity: 1 }],
      mode: 'subscription',
      subscription_data: {
        metadata: { userId: String(userId), type: 'casino_vip', platform: 'Self-Made Legends' },
      },
      success_url: `${BASE}/dashboard.html?payment=success&pay_type=casino_vip`,
      cancel_url: `${BASE}/dashboard.html?payment=cancelled`,
      metadata: { userId: String(userId), type: 'casino_vip', platform: 'Self-Made Legends' },
    });
    return { checkoutUrl: session.url, sessionId: session.id };
  }

  // Handle Stripe webhook to confirm subscription events on the server
  constructWebhookEvent(rawBody, signature) {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) throw new Error("STRIPE_WEBHOOK_SECRET not configured");
    return this.stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  }
}

module.exports = StripeProcessor;
module.exports.CREDIT_PACKAGES = CREDIT_PACKAGES;
module.exports.PAPER_MONEY_PACKAGES = PAPER_MONEY_PACKAGES;
