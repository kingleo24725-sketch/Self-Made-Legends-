const crypto = require("crypto");

class SubscriptionManager {
  constructor() {
    this.subscriptions = {};
    this.userSubscriptions = {}; // Maps userId to active subscription
    this.transactionHistory = [];
  }

  // Subscription tier definitions
  static TIERS = {
    FREE: {
      id: "free",
      name: "Free",
      monthlyPrice: 0,
      benefits: {
        waitTimeUnlimited: false,
        bookingFeDiscount: 0, // no discount
        platformFeeDiscount: 0, // no discount
        priorityMatching: false,
        monthlyCredits: 0,
        freeCancellations: 0,
        supportPriority: "standard",
      },
    },
    PREMIUM: {
      id: "premium",
      name: "Premium Plus",
      monthlyPrice: 29.99,
      benefits: {
        waitTimeUnlimited: true, // Unlimited wait time, no per-minute charges
        bookingFeeDiscount: 0.5, // 50% off booking fee ($4.75 → $2.38)
        platformFeeDiscount: 0.25, // 25% off platform fee ($2.75 → $2.06)
        priorityMatching: true, // Get matched with 5-star drivers first
        monthlyCredits: 15, // $15 in ride credits monthly
        freeCancellations: 2, // Can cancel 2 rides free per month
        supportPriority: "premium", // Priority customer support
      },
    },
    ELITE: {
      id: "elite",
      name: "Elite",
      monthlyPrice: 49.99,
      benefits: {
        waitTimeUnlimited: true,
        bookingFeeDiscount: 1.0, // 100% off booking fee (FREE)
        platformFeeDiscount: 0.5, // 50% off platform fee ($2.75 → $1.38)
        priorityMatching: true,
        monthlyCredits: 35, // $35 in ride credits monthly
        freeCancellations: 5, // Can cancel 5 rides free per month
        supportPriority: "elite", // 24/7 dedicated support
        dedicatedDriver: true, // Option to book favorite drivers
        airportPriority: true, // Priority airport pickups
      },
    },
  };

  /**
   * Subscribe a user to a tier
   */
  subscribeTier(userId, tierId, accountManager, userEmail) {
    if (!SubscriptionManager.TIERS[tierId]) {
      return { success: false, error: "Invalid subscription tier" };
    }

    const tier = SubscriptionManager.TIERS[tierId];

    // Check if already subscribed (cancel previous if needed)
    if (this.userSubscriptions[userId]) {
      const existing = this.userSubscriptions[userId];
      if (existing.tier === tierId && existing.status === "active") {
        return {
          success: false,
          error: "Already subscribed to this tier",
        };
      }
      // Cancel previous subscription
      this.cancelSubscription(userId);
    }

    const subscriptionId = crypto.randomBytes(16).toString("hex");
    const now = new Date();
    const renewalDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

    const subscription = {
      id: subscriptionId,
      userId,
      tier: tierId,
      tierName: tier.name,
      monthlyPrice: tier.monthlyPrice,
      benefits: { ...tier.benefits },
      status: "active",
      startDate: now,
      renewalDate,
      renewalCounter: 0,
      cancellationDate: null,
      monthlyUsage: {
        creditsUsed: 0,
        cancellationsUsed: 0,
        ridesCompleted: 0,
      },
      autoRenew: true,
    };

    this.subscriptions[subscriptionId] = subscription;
    this.userSubscriptions[userId] = subscription;

    // Charge subscription fee to user account (if not free tier)
    if (tier.monthlyPrice > 0) {
      accountManager.updateBalance(userEmail, "usd", -tier.monthlyPrice);
      this.recordTransaction(
        userId,
        "subscription_charge",
        tier.monthlyPrice,
        tierId,
        subscriptionId
      );
    }

    return {
      success: true,
      subscriptionId,
      tier: tier.name,
      price: tier.monthlyPrice,
      benefits: tier.benefits,
      renewalDate: renewalDate.toISOString().split("T")[0],
      message: `Successfully subscribed to ${tier.name}${
        tier.monthlyPrice > 0
          ? ` - $${tier.monthlyPrice.toFixed(2)}/month`
          : ""
      }`,
    };
  }

  /**
   * Get user's active subscription
   */
  getUserSubscription(userId) {
    return this.userSubscriptions[userId] || null;
  }

  /**
   * Get subscription details
   */
  getSubscription(subscriptionId) {
    return this.subscriptions[subscriptionId] || null;
  }

  /**
   * Apply subscription benefits to ride payment
   */
  applySubscriptionBenefits(ridePayment, userId) {
    const subscription = this.userSubscriptions[userId];
    if (!subscription || subscription.status !== "active") {
      return ridePayment; // No subscription benefits
    }

    const benefits = subscription.benefits;
    const benefits_applied = {};

    // Apply booking fee discount
    if (benefits.bookingFeeDiscount > 0) {
      const discountAmount = ridePayment.riderPayment.bookingFee * benefits.bookingFeeDiscount;
      ridePayment.riderPayment.bookingFee -= discountAmount;
      benefits_applied.bookingFeeDiscount = discountAmount;
    }

    // Apply platform fee discount
    if (benefits.platformFeeDiscount > 0) {
      const discountAmount = ridePayment.platformRevenue.platformFee * benefits.platformFeeDiscount;
      ridePayment.riderPayment.platformFeeDiscount = discountAmount;
      ridePayment.riderPayment.totalCharged -= discountAmount;
      benefits_applied.platformFeeDiscount = discountAmount;
    }

    // Apply wait time unlimited
    if (benefits.waitTimeUnlimited && ridePayment.riderPayment.waitTimeCharge > 0) {
      benefits_applied.waitTimeWaived = ridePayment.riderPayment.waitTimeCharge;
      ridePayment.riderPayment.totalCharged -= ridePayment.riderPayment.waitTimeCharge;
      ridePayment.riderPayment.waitTimeCharge = 0;

      // Driver still gets their 50% of wait time since it was paid by subscription
      // But for unlimited, we can waive the split
      ridePayment.driverEarnings.waitTimeCut = 0;
      ridePayment.platformRevenue.waitTimeCut = 0;
    }

    // Recalculate totals
    ridePayment.riderPayment.totalCharged = Math.max(
      0,
      ridePayment.riderPayment.baseFare +
        ridePayment.riderPayment.bookingFee +
        ridePayment.riderPayment.waitTimeCharge +
        (ridePayment.riderPayment.platformFeeDiscount
          ? -ridePayment.riderPayment.platformFeeDiscount
          : 0) +
        ridePayment.riderPayment.cancellationFee
    );

    ridePayment.subscriptionBenefitsApplied = benefits_applied;
    ridePayment.subscriptionTier = subscription.tier;

    // Track monthly usage
    subscription.monthlyUsage.ridesCompleted++;

    return ridePayment;
  }

  /**
   * Apply monthly credits to ride
   */
  applyMonthlyCredits(ridePayment, userId) {
    const subscription = this.userSubscriptions[userId];
    if (!subscription || subscription.status !== "active") {
      return { success: false, error: "No active subscription" };
    }

    const availableCredits =
      subscription.benefits.monthlyCredits -
      subscription.monthlyUsage.creditsUsed;

    if (availableCredits <= 0) {
      return { success: false, error: "No monthly credits available" };
    }

    const creditsToApply = Math.min(
      availableCredits,
      ridePayment.riderPayment.totalCharged
    );

    ridePayment.riderPayment.totalCharged -= creditsToApply;
    ridePayment.monthlyCreditsApplied = creditsToApply;

    subscription.monthlyUsage.creditsUsed += creditsToApply;

    return {
      success: true,
      creditsApplied: creditsToApply,
      remainingCredits: availableCredits - creditsToApply,
    };
  }

  /**
   * Handle free cancellation with subscription
   */
  getFreeCancellationStatus(userId) {
    const subscription = this.userSubscriptions[userId];
    if (!subscription || subscription.status !== "active") {
      return { canCancelFree: false, reason: "No active subscription" };
    }

    const freeCancellationsAvailable =
      subscription.benefits.freeCancellations -
      subscription.monthlyUsage.cancellationsUsed;

    return {
      canCancelFree: freeCancellationsAvailable > 0,
      freeCancellationsAvailable,
      cancellationFeeIfPaid: 2.5,
    };
  }

  /**
   * Use free cancellation
   */
  useFreeCancellation(userId) {
    const subscription = this.userSubscriptions[userId];
    if (!subscription || subscription.status !== "active") {
      return { success: false, error: "No active subscription" };
    }

    const freeCancellationsAvailable =
      subscription.benefits.freeCancellations -
      subscription.monthlyUsage.cancellationsUsed;

    if (freeCancellationsAvailable <= 0) {
      return {
        success: false,
        error: "No free cancellations available",
        nextResetDate: subscription.renewalDate,
      };
    }

    subscription.monthlyUsage.cancellationsUsed++;

    return {
      success: true,
      message: "Free cancellation used",
      remainingCancellations: freeCancellationsAvailable - 1,
    };
  }

  /**
   * Cancel subscription
   */
  cancelSubscription(userId, reason = "user_requested") {
    const subscription = this.userSubscriptions[userId];
    if (!subscription) {
      return { success: false, error: "No active subscription" };
    }

    subscription.status = "cancelled";
    subscription.cancellationDate = new Date();
    subscription.cancellationReason = reason;

    delete this.userSubscriptions[userId];

    this.recordTransaction(
      userId,
      "subscription_cancelled",
      0,
      subscription.tier,
      subscription.id
    );

    return {
      success: true,
      message: `${subscription.tierName} subscription cancelled`,
      lastBilledDate: subscription.startDate.toISOString().split("T")[0],
      cancellationDate: subscription.cancellationDate
        .toISOString()
        .split("T")[0],
    };
  }

  /**
   * Renew subscription (monthly)
   */
  renewSubscription(userId, accountManager, userEmail) {
    const subscription = this.userSubscriptions[userId];
    if (!subscription) {
      return { success: false, error: "No active subscription" };
    }

    if (subscription.monthlyPrice > 0) {
      // Charge for renewal
      accountManager.updateBalance(userEmail, "usd", -subscription.monthlyPrice);
    }

    // Reset monthly usage counters
    subscription.monthlyUsage = {
      creditsUsed: 0,
      cancellationsUsed: 0,
      ridesCompleted: 0,
    };

    subscription.renewalCounter++;
    subscription.renewalDate = new Date(
      subscription.renewalDate.getTime() + 30 * 24 * 60 * 60 * 1000
    );

    this.recordTransaction(
      userId,
      "subscription_renewal",
      subscription.monthlyPrice,
      subscription.tier,
      subscription.id
    );

    return {
      success: true,
      message: "Subscription renewed",
      nextRenewalDate: subscription.renewalDate.toISOString().split("T")[0],
      renewalCounter: subscription.renewalCounter,
    };
  }

  /**
   * Get subscription benefits comparison
   */
  getBenefitsComparison() {
    const comparison = {};
    Object.entries(SubscriptionManager.TIERS).forEach(([tierId, tier]) => {
      comparison[tierId] = {
        name: tier.name,
        price: tier.monthlyPrice,
        benefits: tier.benefits,
      };
    });
    return comparison;
  }

  /**
   * Record subscription transaction
   */
  recordTransaction(userId, type, amount, tier, subscriptionId) {
    const transaction = {
      id: crypto.randomBytes(16).toString("hex"),
      userId,
      type, // subscription_charge, subscription_cancelled, subscription_renewal
      amount,
      tier,
      subscriptionId,
      timestamp: new Date(),
    };
    this.transactionHistory.push(transaction);
    return transaction;
  }

  /**
   * Get user's subscription transaction history
   */
  getTransactionHistory(userId, limit = 50) {
    return this.transactionHistory
      .filter(t => t.userId === userId)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Get revenue by subscription tier
   */
  getRevenueByTier() {
    const revenue = {};
    Object.keys(SubscriptionManager.TIERS).forEach(tier => {
      revenue[tier] = 0;
    });

    this.transactionHistory.forEach(transaction => {
      if (transaction.type === "subscription_charge" || transaction.type === "subscription_renewal") {
        if (!revenue[transaction.tier]) {
          revenue[transaction.tier] = 0;
        }
        revenue[transaction.tier] += transaction.amount;
      }
    });

    return revenue;
  }
}

module.exports = SubscriptionManager;
