const crypto = require("crypto");

class DriverSubscriptionManager {
  constructor() {
    this.subscriptions = {};
    this.driverSubscriptions = {}; // Maps driverId to active subscription
    this.transactionHistory = [];
  }

  // Driver subscription tier definitions
  static TIERS = {
    STANDARD: {
      id: "standard",
      name: "Standard",
      monthlyPrice: 0,
      benefits: {
        platformFeeDiscount: 0, // No discount
        earningsBonus: 0, // No bonus
        priorityRideRequests: false, // Get requests in order received
        instantPayouts: false, // Standard 3-5 day payout
        advanceBooking: false, // Can't see 24h in advance
        performanceBonus: false, // No bonus incentive
        dedicatedSupport: false,
        marketingSupport: false,
        insuranceBoost: false,
        leaderboardStatus: "standard", // Not on top earnings board
      },
    },
    DRIVER_PLUS: {
      id: "driver_plus",
      name: "Driver Plus",
      monthlyPrice: 19.99,
      minMonthlyEarnings: 200, // Must earn $200+ to maintain tier
      benefits: {
        platformFeeDiscount: 0.15, // 15% off platform fee (reduces mogo's take)
        earningsBonus: 0.1, // 10% bonus on all rides
        priorityRideRequests: true, // Get premium ride requests first
        instantPayouts: true, // Next business day payout
        advanceBooking: true, // See rides 4 hours in advance
        performanceBonus: true, // Bonus for 4.8+ rating
        dedicatedSupport: false, // Email support
        marketingSupport: false,
        insuranceBoost: false,
        leaderboardStatus: "gold", // Gold status on leaderboard
      },
    },
    ELITE_DRIVER: {
      id: "elite_driver",
      name: "Elite Driver",
      monthlyPrice: 39.99,
      minMonthlyEarnings: 500, // Must earn $500+ to maintain tier
      benefits: {
        platformFeeDiscount: 0.25, // 25% off platform fee
        earningsBonus: 0.2, // 20% bonus on all rides
        priorityRideRequests: true, // Get best ride requests first
        instantPayouts: true, // Same-day payout (end of shift)
        advanceBooking: true, // See rides 24 hours in advance
        performanceBonus: true, // Bonus for 4.9+ rating + surge bonus
        dedicatedSupport: true, // 24/7 phone & chat support
        marketingSupport: true, // Featured on app, referral bonuses
        insuranceBoost: true, // Extended coverage
        leaderboardStatus: "platinum", // Platinum status + featured
      },
    },
  };

  /**
   * Subscribe driver to a tier
   */
  subscribeTier(driverId, tierId, accountManager, driverEmail) {
    if (!DriverSubscriptionManager.TIERS[tierId]) {
      return { success: false, error: "Invalid subscription tier" };
    }

    const tier = DriverSubscriptionManager.TIERS[tierId];

    // Check if already subscribed
    if (this.driverSubscriptions[driverId]) {
      const existing = this.driverSubscriptions[driverId];
      if (existing.tier === tierId && existing.status === "active") {
        return {
          success: false,
          error: "Already subscribed to this tier",
        };
      }
      // Cancel previous subscription
      this.cancelSubscription(driverId);
    }

    const subscriptionId = crypto.randomBytes(16).toString("hex");
    const now = new Date();
    const renewalDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const subscription = {
      id: subscriptionId,
      driverId,
      tier: tierId,
      tierName: tier.name,
      monthlyPrice: tier.monthlyPrice,
      benefits: { ...tier.benefits },
      minMonthlyEarnings: tier.minMonthlyEarnings || 0,
      status: "active",
      startDate: now,
      renewalDate,
      renewalCounter: 0,
      cancellationDate: null,
      monthlyMetrics: {
        totalEarnings: 0,
        ridesCompleted: 0,
        bonusEarned: 0,
        platformFeeSaved: 0,
      },
      autoRenew: true,
    };

    this.subscriptions[subscriptionId] = subscription;
    this.driverSubscriptions[driverId] = subscription;

    // Charge subscription fee (if not free tier)
    if (tier.monthlyPrice > 0) {
      accountManager.updateBalance(driverEmail, "usd", -tier.monthlyPrice);
      this.recordTransaction(
        driverId,
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
   * Get driver's active subscription
   */
  getDriverSubscription(driverId) {
    return this.driverSubscriptions[driverId] || null;
  }

  /**
   * Apply subscription benefits to ride earnings
   */
  applyEarningsBenefits(rideEarnings, driverId) {
    const subscription = this.driverSubscriptions[driverId];
    if (!subscription || subscription.status !== "active") {
      return rideEarnings; // No subscription benefits
    }

    const benefits = subscription.benefits;
    const baseFare = rideEarnings.baseFare;

    // Apply earnings bonus (% increase on base fare)
    const earningsBonus = baseFare * benefits.earningsBonus;
    rideEarnings.earningsBonus = earningsBonus;
    rideEarnings.total += earningsBonus;

    // Track metrics
    subscription.monthlyMetrics.totalEarnings += rideEarnings.total;
    subscription.monthlyMetrics.bonusEarned += earningsBonus;
    subscription.monthlyMetrics.ridesCompleted++;

    rideEarnings.subscriptionTier = subscription.tier;
    rideEarnings.subscriptionBonusApplied = earningsBonus;

    return rideEarnings;
  }

  /**
   * Calculate platform fee with subscription discount
   */
  calculatePlatformFeeWithDiscount(baseFee, driverId) {
    const subscription = this.driverSubscriptions[driverId];
    if (!subscription || subscription.status !== "active") {
      return baseFee; // No discount
    }

    const discountAmount = baseFee * subscription.benefits.platformFeeDiscount;
    subscription.monthlyMetrics.platformFeeSaved += discountAmount;

    return {
      originalFee: baseFee,
      discountApplied: discountAmount,
      finalFee: baseFee - discountAmount,
    };
  }

  /**
   * Check if driver qualifies for performance bonus
   */
  getPerformanceBonus(driverRating, driverId) {
    const subscription = this.driverSubscriptions[driverId];
    if (
      !subscription ||
      subscription.status !== "active" ||
      !subscription.benefits.performanceBonus
    ) {
      return { eligible: false, bonus: 0 };
    }

    let bonus = 0;

    // Driver Plus: Bonus for 4.8+ rating
    if (
      subscription.tier === "DRIVER_PLUS" &&
      driverRating >= 4.8
    ) {
      bonus = 5.0; // $5 bonus
    }

    // Elite Driver: Bonus for 4.9+ rating + surge bonus
    if (subscription.tier === "ELITE_DRIVER") {
      if (driverRating >= 4.9) {
        bonus = 10.0; // $10 base bonus
      }
      if (driverRating >= 4.95) {
        bonus += 5.0; // Additional $5 for exceptional rating
      }
    }

    return { eligible: bonus > 0, bonus };
  }

  /**
   * Check priority ride eligibility
   */
  isPriorityRideEligible(driverId) {
    const subscription = this.driverSubscriptions[driverId];
    if (!subscription || subscription.status !== "active") {
      return false;
    }

    return subscription.benefits.priorityRideRequests;
  }

  /**
   * Get advance booking info
   */
  getAdvanceBookingWindow(driverId) {
    const subscription = this.driverSubscriptions[driverId];
    if (!subscription || subscription.status !== "active") {
      return { canAdvanceBook: false, hoursInAdvance: 0 };
    }

    if (!subscription.benefits.advanceBooking) {
      return { canAdvanceBook: false, hoursInAdvance: 0 };
    }

    let hoursInAdvance = 4; // Driver Plus default

    if (subscription.tier === "ELITE_DRIVER") {
      hoursInAdvance = 24; // Can see 24 hours ahead
    }

    return { canAdvanceBook: true, hoursInAdvance };
  }

  /**
   * Get payout processing speed
   */
  getPayoutSpeed(driverId) {
    const subscription = this.driverSubscriptions[driverId];

    if (!subscription || subscription.status !== "active") {
      return {
        speed: "Standard",
        processingTime: "3-5 business days",
        processingDays: 3,
      };
    }

    if (subscription.benefits.instantPayouts) {
      if (subscription.tier === "ELITE_DRIVER") {
        return {
          speed: "Same-Day",
          processingTime: "End of shift (within 4 hours)",
          processingDays: 0.17,
        };
      }
      return {
        speed: "Express",
        processingTime: "Next business day",
        processingDays: 1,
      };
    }

    return {
      speed: "Standard",
      processingTime: "3-5 business days",
      processingDays: 3,
    };
  }

  /**
   * Cancel subscription
   */
  cancelSubscription(driverId, reason = "user_requested") {
    const subscription = this.driverSubscriptions[driverId];
    if (!subscription) {
      return { success: false, error: "No active subscription" };
    }

    subscription.status = "cancelled";
    subscription.cancellationDate = new Date();
    subscription.cancellationReason = reason;

    delete this.driverSubscriptions[driverId];

    this.recordTransaction(
      driverId,
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
   * Renew subscription
   */
  renewSubscription(driverId, accountManager, driverEmail) {
    const subscription = this.driverSubscriptions[driverId];
    if (!subscription) {
      return { success: false, error: "No active subscription" };
    }

    // Check minimum earnings requirement
    if (
      subscription.minMonthlyEarnings > 0 &&
      subscription.monthlyMetrics.totalEarnings <
        subscription.minMonthlyEarnings
    ) {
      return {
        success: false,
        error: `Minimum earnings of $${subscription.minMonthlyEarnings} not met. Current: $${subscription.monthlyMetrics.totalEarnings.toFixed(2)}`,
        reason: "insufficient_earnings",
      };
    }

    if (subscription.monthlyPrice > 0) {
      accountManager.updateBalance(driverEmail, "usd", -subscription.monthlyPrice);
    }

    // Reset monthly metrics
    subscription.monthlyMetrics = {
      totalEarnings: 0,
      ridesCompleted: 0,
      bonusEarned: 0,
      platformFeeSaved: 0,
    };

    subscription.renewalCounter++;
    subscription.renewalDate = new Date(
      subscription.renewalDate.getTime() + 30 * 24 * 60 * 60 * 1000
    );

    this.recordTransaction(
      driverId,
      "subscription_renewal",
      subscription.monthlyPrice,
      subscription.tier,
      subscription.id
    );

    return {
      success: true,
      message: "Subscription renewed successfully",
      nextRenewalDate: subscription.renewalDate.toISOString().split("T")[0],
      renewalCounter: subscription.renewalCounter,
    };
  }

  /**
   * Get driver tier comparison
   */
  getBenefitsComparison() {
    const comparison = {};
    Object.entries(DriverSubscriptionManager.TIERS).forEach(
      ([tierId, tier]) => {
        comparison[tierId] = {
          name: tier.name,
          price: tier.monthlyPrice,
          minEarnings: tier.minMonthlyEarnings || 0,
          benefits: tier.benefits,
        };
      }
    );
    return comparison;
  }

  /**
   * Get driver metrics summary
   */
  getDriverMetrics(driverId) {
    const subscription = this.driverSubscriptions[driverId];
    if (!subscription) {
      return { subscribed: false, metrics: null };
    }

    return {
      subscribed: true,
      tier: subscription.tierName,
      metrics: {
        totalEarnings: subscription.monthlyMetrics.totalEarnings,
        ridesCompleted: subscription.monthlyMetrics.ridesCompleted,
        averageEarningsPerRide:
          subscription.monthlyMetrics.ridesCompleted > 0
            ? (
                subscription.monthlyMetrics.totalEarnings /
                subscription.monthlyMetrics.ridesCompleted
              ).toFixed(2)
            : 0,
        bonusEarned: subscription.monthlyMetrics.bonusEarned,
        platformFeeSaved: subscription.monthlyMetrics.platformFeeSaved,
        renewalDate: subscription.renewalDate.toISOString().split("T")[0],
      },
    };
  }

  /**
   * Record subscription transaction
   */
  recordTransaction(driverId, type, amount, tier, subscriptionId) {
    const transaction = {
      id: crypto.randomBytes(16).toString("hex"),
      driverId,
      type,
      amount,
      tier,
      subscriptionId,
      timestamp: new Date(),
    };
    this.transactionHistory.push(transaction);
    return transaction;
  }

  /**
   * Get revenue by subscription tier
   */
  getRevenueByTier() {
    const revenue = {};
    Object.keys(DriverSubscriptionManager.TIERS).forEach(tier => {
      revenue[tier] = 0;
    });

    this.transactionHistory.forEach(transaction => {
      if (
        transaction.type === "subscription_charge" ||
        transaction.type === "subscription_renewal"
      ) {
        if (!revenue[transaction.tier]) {
          revenue[transaction.tier] = 0;
        }
        revenue[transaction.tier] += transaction.amount;
      }
    });

    return revenue;
  }

  /**
   * Get subscription tier info
   */
  getTierInfo(tierId) {
    return DriverSubscriptionManager.TIERS[tierId] || null;
  }
}

module.exports = DriverSubscriptionManager;
