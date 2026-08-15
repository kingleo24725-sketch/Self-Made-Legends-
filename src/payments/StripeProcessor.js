const stripe = require("stripe");

const CREATOR_FEE_CENTS = 1000; // $10.00/month

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

  // Handle Stripe webhook to confirm subscription events on the server
  constructWebhookEvent(rawBody, signature) {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) throw new Error("STRIPE_WEBHOOK_SECRET not configured");
    return this.stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  }
}

module.exports = StripeProcessor;
