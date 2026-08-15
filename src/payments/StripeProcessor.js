const stripe = require("stripe");

const CREATOR_FEE = 500; // $5.00 in cents

class StripeProcessor {
  constructor() {
    this.stripe = stripe(process.env.STRIPE_SECRET_KEY);
    this.publishableKey = process.env.STRIPE_PUBLISHABLE_KEY || "";
  }

  // Create a PaymentIntent for the $5 creator fee
  async createCreatorFeeIntent(userId, userEmail) {
    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: CREATOR_FEE,
      currency: "usd",
      receipt_email: userEmail,
      description: "Self-Made Legends LLC – $5 Creator Fee",
      metadata: {
        userId: String(userId),
        type: "creator_fee",
        platform: "Self-Made Legends",
      },
    });

    return {
      clientSecret: paymentIntent.client_secret,
      publishableKey: this.publishableKey,
      amount: CREATOR_FEE,
      paymentIntentId: paymentIntent.id,
    };
  }

  // Confirm a creator fee was paid (called after Stripe confirms)
  async verifyPayment(paymentIntentId) {
    const intent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
    return {
      paid: intent.status === "succeeded",
      amount: intent.amount,
      status: intent.status,
    };
  }

  // Create a Stripe Checkout Session for the $5 fee (simpler UI flow)
  async createCheckoutSession(userId, userEmail, successUrl, cancelUrl) {
    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      customer_email: userEmail,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "Self-Made Legends Creator Fee",
              description: "One-time $5 fee to activate your creator account",
            },
            unit_amount: CREATOR_FEE,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: successUrl || "https://web-production-576d9.up.railway.app/dashboard.html?payment=success",
      cancel_url: cancelUrl || "https://web-production-576d9.up.railway.app/dashboard.html?payment=cancelled",
      metadata: {
        userId: String(userId),
        type: "creator_fee",
      },
    });

    return {
      checkoutUrl: session.url,
      sessionId: session.id,
    };
  }

  // Handle Stripe webhook to confirm payment on the server
  constructWebhookEvent(rawBody, signature) {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) throw new Error("STRIPE_WEBHOOK_SECRET not configured");
    return this.stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  }
}

module.exports = StripeProcessor;
