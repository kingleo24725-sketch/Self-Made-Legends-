const crypto = require("crypto");

class StripePaymentGateway {
  constructor(stripeApiKey) {
    this.apiKey = stripeApiKey;
    this.baseUrl = "https://api.stripe.com/v1";
    this.transactions = [];
  }

  async createPaymentIntent(amount, currency = "usd", description = "") {
    if (!this.apiKey || this.apiKey === "test_key") {
      return {
        success: false,
        error: "Stripe API key not configured. Set STRIPE_API_KEY in .env",
      };
    }

    try {
      const response = await fetch(`${this.baseUrl}/payment_intents`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          amount: Math.round(amount * 100),
          currency,
          description,
          statement_descriptor: "SELF MADE LEGENDS",
        }),
      });

      const data = await response.json();

      if (data.id) {
        return {
          success: true,
          clientSecret: data.client_secret,
          paymentIntentId: data.id,
          amount: amount,
          status: data.status,
        };
      } else {
        return { success: false, error: data.error?.message || "Payment intent creation failed" };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async verifyPayment(paymentIntentId) {
    if (!this.apiKey || this.apiKey === "test_key") {
      return { success: false, error: "Stripe API key not configured" };
    }

    try {
      const response = await fetch(`${this.baseUrl}/payment_intents/${paymentIntentId}`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      });

      const data = await response.json();

      return {
        success: data.status === "succeeded",
        status: data.status,
        amount: data.amount / 100,
        paymentMethod: data.payment_method,
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async createRefund(paymentIntentId, amount = null) {
    if (!this.apiKey || this.apiKey === "test_key") {
      return { success: false, error: "Stripe API key not configured" };
    }

    try {
      const params = new URLSearchParams({
        payment_intent: paymentIntentId,
      });

      if (amount) {
        params.append("amount", Math.round(amount * 100));
      }

      const response = await fetch(`${this.baseUrl}/refunds`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params,
      });

      const data = await response.json();

      if (data.id) {
        return {
          success: true,
          refundId: data.id,
          status: data.status,
        };
      } else {
        return { success: false, error: data.error?.message };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

module.exports = StripePaymentGateway;
