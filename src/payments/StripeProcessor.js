const stripe = require("stripe");

const CREATOR_FEE_CENTS = 1000; // $10.00/month

const CREDIT_PACKAGES = {
  starter:  { credits: 500,  amount_cents: 500,  label: 'SML Credits — Starter Pack (500 Credits)' },
  legends:  { credits: 2500, amount_cents: 2000, label: 'SML Credits — Legends Pack (2,500 Credits)' },
  champion: { credits: 7000, amount_cents: 5000, label: 'SML Credits — Champion Pack (7,000 Credits)' },
};

// Paper money packages — real money → virtual paper trading capital
const PAPER_MONEY_PACKAGES = {
  hustle:   { paper: 1000,   amount_cents: 499,  label: 'Hustle Pack — $1,000 Paper Money' },
  grind:    { paper: 5000,   amount_cents: 1099, label: 'Grind Pack — $5,000 Paper Money' },
  investor: { paper: 25000,  amount_cents: 1500, label: 'Investor Pack — $25,000 Paper Money' },
  whale:    { paper: 50000,  amount_cents: 2000, label: 'Whale Pack — $50,000 Paper Money' },
  ultimate: { paper: 200000, amount_cents: 7500, label: 'Ultimate Pack — $200,000 Paper Money' },
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
    // Cached Stripe Price ID for the $10/month subscription
    this._priceId = process.env.STRIPE_CREATOR_PRICE_ID || null;
  }

  // Get or create the recurring $10/month Price on Stripe
  async getOrCreatePrice() {
    if (this._priceId) return this._priceId;

    const product = await this.stripe.products.create({
      name: "Self-Made Legends Creator Subscription",
      description: "$10/month creator membership — billed on the 1st of each month",
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

  // Create a Stripe Checkout Session for the $10/month subscription
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

  // Create a Stripe Checkout Session for the Season Pass ($2.99 one-time)
  async createSeasonPassCheckout(userId, userEmail) {
    const BASE = process.env.BASE_URL || 'https://web-production-576d9.up.railway.app';
    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: userEmail || undefined,
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: 'SML Season Pass', description: 'Premium badge frames, 1.5× XP multiplier, private leaderboard tier' },
          unit_amount: 100,
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

  // Create a Stripe Checkout Session for Premium Coach Pro ($4.99/month recurring)
  async createCoachProCheckout(userId, userEmail) {
    const BASE = process.env.BASE_URL || 'https://web-production-576d9.up.railway.app';
    if (!this._coachProPriceId) {
      const product = await this.stripe.products.create({
        name: 'SML Premium AI Coach',
        description: '$4.99/month — Deeper AI responses, weekly personalized reports',
      });
      const price = await this.stripe.prices.create({
        product: product.id,
        unit_amount: 499,
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

  // Create a Stripe Checkout Session for Paper Money top-up
  async createPaperMoneyCheckout(userId, userEmail, packageKey) {
    const pkg = PAPER_MONEY_PACKAGES[packageKey];
    if (!pkg) throw new Error(`Unknown paper money package: ${packageKey}`);
    const BASE = process.env.BASE_URL || 'https://web-production-576d9.up.railway.app';
    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: userEmail || undefined,
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: pkg.label, description: `Add $${pkg.paper.toLocaleString()} paper money to your SML trading account` },
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

  // Create a Stripe Checkout Session for Tournament Entry ($5.00 one-time)
  async createTournamentEntryCheckout(userId, userEmail, tournamentId) {
    const BASE = process.env.BASE_URL || 'https://web-production-576d9.up.railway.app';
    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: userEmail || undefined,
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: 'SML Tournament Entry', description: '80% of entry pool pays top-3 players' },
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

  // Create a Stripe Checkout Session for Jail Buyout ($5.00 one-time → release + $1k paper money)
  async createJailBuyoutCheckout(userId, userEmail) {
    const BASE = process.env.BASE_URL || 'https://web-production-576d9.up.railway.app';
    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: userEmail || undefined,
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: 'SML Jail Buyout', description: 'Pay your way out of jail + receive $1,000 paper money' },
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

  // Create a Stripe Checkout Session to gift paper money to another player
  async createGiftPaperMoneyCheckout(senderId, senderEmail, recipientId, packageKey, pkg) {
    const BASE = process.env.BASE_URL || 'https://web-production-576d9.up.railway.app';
    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: senderEmail || undefined,
      line_items: [{ price_data: { currency: 'usd',
        product_data: { name: `SML Gift — ${pkg.label}`, description: `Send $${pkg.paper.toLocaleString()} paper money to a friend` },
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
        product_data: { name: `SML Real Estate — ${propertyLabel}`, description: 'Virtual property generating daily passive paper money income' },
        unit_amount: priceCents }, quantity: 1 }],
      mode: 'payment',
      success_url: `${BASE}/dashboard.html?payment=success&pay_type=realestate_${propertyKey}`,
      cancel_url:  `${BASE}/dashboard.html?payment=cancelled`,
      metadata: { userId: String(userId), type: `realestate_${propertyKey}`, platform: 'Self-Made Legends' },
    });
    return { checkoutUrl: session.url, sessionId: session.id };
  }

  // Create a Stripe Checkout Session for Battle Pass Season 1 ($4.99)
  async createBattlePassCheckout(userId, userEmail) {
    const BASE = process.env.BASE_URL || 'https://web-production-576d9.up.railway.app';
    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: userEmail || undefined,
      line_items: [{ price_data: { currency: 'usd',
        product_data: { name: 'SML Battle Pass — Season 1', description: 'Unlock premium tier rewards across all 10 Battle Pass tiers' },
        unit_amount: 499 }, quantity: 1 }],
      mode: 'payment',
      success_url: `${BASE}/dashboard.html?payment=success&pay_type=battle_pass`,
      cancel_url:  `${BASE}/dashboard.html?payment=cancelled`,
      metadata: { userId: String(userId), type: 'battle_pass', platform: 'Self-Made Legends' },
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
