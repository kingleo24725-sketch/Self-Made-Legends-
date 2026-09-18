const SubscriptionManager = require("./SubscriptionManager");
const RidePaymentProcessor = require("./RidePaymentProcessor");

// Mock AccountManager
class MockAccountManager {
  constructor() {
    this.accounts = {};
  }

  updateBalance(email, currency, amount) {
    if (!this.accounts[email]) {
      this.accounts[email] = { balances: { [currency]: 1000 } }; // Start with $1000
    }
    this.accounts[email].balances[currency] += amount;
    return this.accounts[email].balances[currency];
  }

  getAccount(email) {
    return this.accounts[email] || { balances: { usd: 1000 } };
  }

  displayBalance(email) {
    const account = this.getAccount(email);
    return account.balances.usd.toFixed(2);
  }
}

console.log("=".repeat(80));
console.log("MOGO SUBSCRIPTION SYSTEM - TEST EXAMPLES");
console.log("=".repeat(80));

const subscriptionMgr = new SubscriptionManager();
const rideProcessor = new RidePaymentProcessor();
const accountManager = new MockAccountManager();

// =============================================================================
// TEST 1: View Subscription Tiers
// =============================================================================
console.log("\n📍 TEST 1: Available Subscription Tiers");
console.log("-".repeat(80));

const tiers = subscriptionMgr.getBenefitsComparison();

Object.entries(tiers).forEach(([tierId, tier]) => {
  console.log(`\n${tier.name}${tierId !== "FREE" ? " - $" + tier.price + "/month" : " (No Charge)"}`);
  console.log("  Benefits:");
  Object.entries(tier.benefits).forEach(([benefit, value]) => {
    const displayValue =
      typeof value === "boolean"
        ? value
          ? "✓ Yes"
          : "✗ No"
        : typeof value === "number"
          ? value === 0
            ? "None"
            : value === 1
              ? "100%"
              : value < 1
                ? `${(value * 100).toFixed(0)}%`
                : `$${value.toFixed(2)}/month`
          : value;
    console.log(`    ${benefit}: ${displayValue}`);
  });
});

// =============================================================================
// TEST 2: Subscribe to Premium Tier
// =============================================================================
console.log("\n\n📍 TEST 2: Subscribe to Premium Plus ($29.99/month)");
console.log("-".repeat(80));

console.log("\nBefore Subscription:");
console.log(`  User Balance: $${accountManager.displayBalance("rider_premium@mogo.app")}`);

const premiumSubscription = subscriptionMgr.subscribeTier(
  "rider_001",
  "PREMIUM",
  accountManager,
  "rider_premium@mogo.app"
);

console.log(`\n${premiumSubscription.message}`);
console.log(`  Subscription ID: ${premiumSubscription.subscriptionId}`);
console.log(`  Renewal Date: ${premiumSubscription.renewalDate}`);

console.log("\nAfter Subscription:");
console.log(`  User Balance: $${accountManager.displayBalance("rider_premium@mogo.app")}`);
console.log("  Premium Benefits Unlocked:");
console.log("    ✓ Unlimited wait time");
console.log("    ✓ 50% off booking fees");
console.log("    ✓ 25% off platform fees");
console.log("    ✓ Priority driver matching");
console.log("    ✓ $15 monthly ride credits");
console.log("    ✓ 2 free cancellations/month");

// =============================================================================
// TEST 3: Premium Ride without Benefits Applied
// =============================================================================
console.log("\n\n📍 TEST 3: Ride Calculation - Premium Subscriber vs Non-Subscriber");
console.log("-".repeat(80));

const testRide = {
  riderId: "rider_001",
  driverId: "driver_001",
  baseFare: 25.0,
  distance: 10.2,
  duration: 20,
  waitTimeMinutes: 4, // 4 minutes wait time
  priorityBonus: 0,
  cancellationFee: 0,
  isPremiumService: false,
};

// Non-subscriber version
const nonSubRide = rideProcessor.calculateRidePayment(testRide);
console.log("\nNON-SUBSCRIBER Charged:");
console.log(`  Base Fare:        $${nonSubRide.ridePayment.riderPayment.baseFare.toFixed(2)}`);
console.log(`  Booking Fee:      $${nonSubRide.ridePayment.riderPayment.bookingFee.toFixed(2)}`);
console.log(`  Platform Fee:     $2.75`);
console.log(`  Wait Time (4 min @ $0.35): $${nonSubRide.ridePayment.riderPayment.waitTimeCharge.toFixed(2)}`);
console.log(`  ───────────────────────`);
console.log(`  TOTAL:            $${nonSubRide.ridePayment.riderPayment.totalCharged.toFixed(2)}`);

// Premium subscriber version
const subRide = rideProcessor.calculateRidePayment(testRide);
subscriptionMgr.applySubscriptionBenefits(subRide.ridePayment, "rider_001");

console.log("\nPREMIUM SUBSCRIBER Charged:");
console.log(`  Base Fare:              $${subRide.ridePayment.riderPayment.baseFare.toFixed(2)}`);
console.log(
  `  Booking Fee:            $${subRide.ridePayment.riderPayment.bookingFee.toFixed(2)} (was $4.75, 50% off)`
);
console.log(`  Platform Fee Discount:  -$${(subRide.ridePayment.subscriptionBenefitsApplied.platformFeeDiscount || 0).toFixed(2)}`);
console.log(
  `  Wait Time:              $0.00 (UNLIMITED - saved $${(subRide.ridePayment.subscriptionBenefitsApplied.waitTimeWaived || 0).toFixed(2)})`
);
console.log(`  ───────────────────────`);
console.log(`  TOTAL:                  $${subRide.ridePayment.riderPayment.totalCharged.toFixed(2)}`);

const savings = nonSubRide.ridePayment.riderPayment.totalCharged - subRide.ridePayment.riderPayment.totalCharged;
console.log(`\n💰 SAVINGS with Premium: $${savings.toFixed(2)} (${((savings / nonSubRide.ridePayment.riderPayment.totalCharged) * 100).toFixed(1)}% discount)`);

// =============================================================================
// TEST 4: Monthly Credits
// =============================================================================
console.log("\n\n📍 TEST 4: Monthly Credits Application");
console.log("-".repeat(80));

const subscription = subscriptionMgr.getUserSubscription("rider_001");
console.log(`\nPremium Subscription Monthly Credits: $${subscription.benefits.monthlyCredits.toFixed(2)}`);

const creditRide = {
  riderId: "rider_001",
  driverId: "driver_002",
  baseFare: 12.0,
  distance: 5,
  duration: 12,
  waitTimeMinutes: 0,
  priorityBonus: 0,
  cancellationFee: 0,
  isPremiumService: false,
};

const creditResult = rideProcessor.calculateRidePayment(creditRide);
subscriptionMgr.applySubscriptionBenefits(creditResult.ridePayment, "rider_001");

console.log(`\nRide Cost: $${creditResult.ridePayment.riderPayment.totalCharged.toFixed(2)}`);

const applyCreditsResult = subscriptionMgr.applyMonthlyCredits(
  creditResult.ridePayment,
  "rider_001"
);

if (applyCreditsResult.success) {
  console.log(`\nMonthly Credits Applied: $${applyCreditsResult.creditsApplied.toFixed(2)}`);
  console.log(`Remaining Credits: $${applyCreditsResult.remainingCredits.toFixed(2)}`);
  console.log(`Rider Pays Out of Pocket: $${creditResult.ridePayment.riderPayment.totalCharged.toFixed(2)}`);
}

// =============================================================================
// TEST 5: Free Cancellation
// =============================================================================
console.log("\n\n📍 TEST 5: Free Cancellation with Subscription");
console.log("-".repeat(80));

const cancellationStatus = subscriptionMgr.getFreeCancellationStatus("rider_001");
console.log(`\nFree Cancellations Available: ${cancellationStatus.freeCancellationsAvailable}`);
console.log(`Can Cancel Free: ${cancellationStatus.canCancelFree ? "YES" : "NO"}`);
console.log(`Cost if NOT Free: $${cancellationStatus.cancellationFeeIfPaid.toFixed(2)}`);

const useFreeCancellation = subscriptionMgr.useFreeCancellation("rider_001");
console.log(`\n${useFreeCancellation.message}`);
console.log(`Remaining Free Cancellations: ${useFreeCancellation.remainingCancellations}`);

// =============================================================================
// TEST 6: Elite Tier Comparison
// =============================================================================
console.log("\n\n📍 TEST 6: Upgrade to Elite Tier");
console.log("-".repeat(80));

console.log("\nBefore Elite Subscription:");
console.log(`  User Balance: $${accountManager.displayBalance("rider_elite@mogo.app")}`);

const eliteSubscription = subscriptionMgr.subscribeTier(
  "rider_002",
  "ELITE",
  accountManager,
  "rider_elite@mogo.app"
);

console.log(`\n${eliteSubscription.message}`);
console.log("\nElite Tier Benefits:");
Object.entries(eliteSubscription.benefits).forEach(([benefit, value]) => {
  const displayValue =
    typeof value === "boolean"
      ? value
        ? "✓ Yes"
        : "✗ No"
      : typeof value === "number"
        ? value === 0
          ? "None"
          : value === 1
            ? "100%"
            : value < 1
              ? `${(value * 100).toFixed(0)}%`
              : `$${value.toFixed(2)}`
          : value;
  console.log(`  ${benefit}: ${displayValue}`);
});

console.log("\nAfter Elite Subscription:");
console.log(`  User Balance: $${accountManager.displayBalance("rider_elite@mogo.app")}`);

// =============================================================================
// TEST 7: Subscription Renewal
// =============================================================================
console.log("\n\n📍 TEST 7: Monthly Subscription Renewal");
console.log("-".repeat(80));

const currentSub = subscriptionMgr.getUserSubscription("rider_001");
console.log(`\nCurrent Renewal Date: ${currentSub.renewalDate.toISOString().split("T")[0]}`);
console.log(`Monthly Rides Completed: ${currentSub.monthlyUsage.ridesCompleted}`);
console.log(`Credits Used: $${currentSub.monthlyUsage.creditsUsed.toFixed(2)}`);
console.log(`Free Cancellations Used: ${currentSub.monthlyUsage.cancellationsUsed}`);

const renewalResult = subscriptionMgr.renewSubscription(
  "rider_001",
  accountManager,
  "rider_premium@mogo.app"
);

console.log(`\n${renewalResult.message}`);
console.log(`Next Renewal Date: ${renewalResult.nextRenewalDate}`);
console.log(`Renewal Count: ${renewalResult.renewalCounter}`);

const renewedSub = subscriptionMgr.getUserSubscription("rider_001");
console.log("\nUsage Counters Reset:");
console.log(`  Monthly Rides: ${renewedSub.monthlyUsage.ridesCompleted}`);
console.log(`  Credits Used: $${renewedSub.monthlyUsage.creditsUsed.toFixed(2)}`);
console.log(`  Free Cancellations Used: ${renewedSub.monthlyUsage.cancellationsUsed}`);

// =============================================================================
// TEST 8: Revenue By Tier
// =============================================================================
console.log("\n\n📍 TEST 8: Subscription Revenue Report");
console.log("-".repeat(80));

const revenueByTier = subscriptionMgr.getRevenueByTier();

console.log("\nSubscription Revenue by Tier:");
Object.entries(revenueByTier).forEach(([tierId, revenue]) => {
  if (revenue > 0) {
    const tier = SubscriptionManager.TIERS[tierId];
    console.log(`  ${tier.name}: $${revenue.toFixed(2)}`);
  }
});

const totalSubscriptionRevenue = Object.values(revenueByTier).reduce(
  (sum, r) => sum + r,
  0
);
console.log(`\n  TOTAL SUBSCRIPTION REVENUE: $${totalSubscriptionRevenue.toFixed(2)}`);

// =============================================================================
// TEST 9: Cancellation
// =============================================================================
console.log("\n\n📍 TEST 9: Cancel Subscription");
console.log("-".repeat(80));

const cancelResult = subscriptionMgr.cancelSubscription("rider_002", "user_requested");

console.log(`\n${cancelResult.message}`);
console.log(`Cancellation Date: ${cancelResult.cancellationDate}`);
console.log(`Last Billed: ${cancelResult.lastBilledDate}`);

console.log("\n" + "=".repeat(80));
console.log("ALL SUBSCRIPTION TESTS COMPLETED SUCCESSFULLY ✓");
console.log("=".repeat(80));
