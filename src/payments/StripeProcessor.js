const stripe = require("stripe");

const CREATOR_FEE_CENTS = 1000; // $10.00/month

const CREDIT_PACKAGES = {
  starter:  { credits: 500,  amount_cents: 500,  label: 'SML Credits — Starter Pack (500 Credits)' },
  legends:  { credits: 2500, amount_cents: 2000, label: 'SML Credits — Legends Pack (2,500 Credits)' },
  champion: { credits: 7000, amount_cents: 5000, label: 'SML Credits — Champion Pack (7,000 Credits)' },
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

  // Create a Stripe Checkout Session for the Season Pass ($9.99 one-time)
  async createSeasonPassCheckout(userId, userEmail) {
    const BASE = process.env.BASE_URL || 'https://web-production-576d9.up.railway.app';
    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: userEmail || undefined,
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: 'SML Season Pass', description: 'Premium badge frames, 1.5× XP multiplier, private leaderboard tier' },
          unit_amount: 999,
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

  // Handle Stripe webhook to confirm subscription events on the server
  constructWebhookEvent(rawBody, signature) {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) throw new Error("STRIPE_WEBHOOK_SECRET not configured");
    return this.stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  }
}

module.exports = StripeProcessor;
module.exports.CREDIT_PACKAGES = CREDIT_PACKAGES;
