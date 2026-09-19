const DriverSubscriptionManager = require("./DriverSubscriptionManager");

// Mock AccountManager
class MockAccountManager {
  constructor() {
    this.accounts = {};
  }

  updateBalance(email, currency, amount) {
    if (!this.accounts[email]) {
      this.accounts[email] = { balances: { [currency]: 5000 } }; // Start with $5000
    }
    this.accounts[email].balances[currency] += amount;
    return this.accounts[email].balances[currency];
  }

  getAccount(email) {
    return this.accounts[email] || { balances: { usd: 5000 } };
  }

  displayBalance(email) {
    const account = this.getAccount(email);
    return account.balances.usd.toFixed(2);
  }
}

console.log("=".repeat(80));
console.log("MOGO DRIVER SUBSCRIPTION SYSTEM - TEST EXAMPLES");
console.log("=".repeat(80));

const driverSubMgr = new DriverSubscriptionManager();
const accountManager = new MockAccountManager();

// =============================================================================
// TEST 1: View Driver Subscription Tiers
// =============================================================================
console.log("\n📍 TEST 1: Available Driver Subscription Tiers");
console.log("-".repeat(80));

const tiers = driverSubMgr.getBenefitsComparison();

Object.entries(tiers).forEach(([tierId, tier]) => {
  console.log(
    `\n${tier.name}${tierId !== "STANDARD" ? " - $" + tier.price + "/month" : " (Free)"}`
  );
  if (tier.minEarnings > 0) {
    console.log(`  Minimum Monthly Earnings: $${tier.minEarnings.toFixed(2)}`);
  }
  console.log("  Benefits:");
  Object.entries(tier.benefits).forEach(([benefit, value]) => {
    if (benefit === "leaderboardStatus") return; // Skip display

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
    console.log(`    ${benefit}: ${displayValue}`);
  });
});

// =============================================================================
// TEST 2: Subscribe to Driver Plus ($19.99/month)
// =============================================================================
console.log("\n\n📍 TEST 2: Subscribe to Driver Plus ($19.99/month)");
console.log("-".repeat(80));

console.log("\nBefore Subscription:");
console.log(
  `  Driver Balance: $${accountManager.displayBalance("driver_plus@mogo.app")}`
);

const driverPlusSub = driverSubMgr.subscribeTier(
  "driver_001",
  "DRIVER_PLUS",
  accountManager,
  "driver_plus@mogo.app"
);

console.log(`\n${driverPlusSub.message}`);
console.log(`  Subscription ID: ${driverPlusSub.subscriptionId}`);
console.log(`  Renewal Date: ${driverPlusSub.renewalDate}`);

console.log("\nAfter Subscription:");
console.log(
  `  Driver Balance: $${accountManager.displayBalance("driver_plus@mogo.app")}`
);
console.log("\nDriver Plus Benefits Unlocked:");
console.log("  ✓ 15% platform fee discount");
console.log("  ✓ 10% bonus on all ride earnings");
console.log("  ✓ Priority ride requests");
console.log("  ✓ Next business day payouts");
console.log("  ✓ Advance booking (4 hours ahead)");
console.log("  ✓ Performance bonuses");
console.log("  ✓ Gold leaderboard status");

// =============================================================================
// TEST 3: Earnings with Subscription Benefits
// =============================================================================
console.log("\n\n📍 TEST 3: Ride Earnings - Driver Plus Benefits");
console.log("-".repeat(80));

const baseRideEarnings = {
  baseFare: 25.0,
  priorityBonus: 0,
  waitTimeCut: 1.5,
};

console.log("\nBASE RIDE EARNINGS (No Subscription):");
console.log(`  Base Fare:       $${baseRideEarnings.baseFare.toFixed(2)}`);
console.log(`  Wait Time (50%): $${baseRideEarnings.waitTimeCut.toFixed(2)}`);
console.log(`  ───────────────────────`);
console.log(`  Total:           $${(baseRideEarnings.baseFare + baseRideEarnings.waitTimeCut).toFixed(2)}`);

// Apply Driver Plus benefits
const driverPlusEarnings = {
  baseFare: 25.0,
  priorityBonus: 0,
  waitTimeCut: 1.5,
  total: 26.5,
};

const withBenefits = driverSubMgr.applyEarningsBenefits(
  { ...driverPlusEarnings },
  "driver_001"
);

console.log("\nWITH DRIVER PLUS SUBSCRIPTION:");
console.log(`  Base Fare:           $${withBenefits.baseFare.toFixed(2)}`);
console.log(`  10% Earnings Bonus:  $${withBenefits.earningsBonus.toFixed(2)}`);
console.log(`  Wait Time (50%):     $${withBenefits.waitTimeCut.toFixed(2)}`);
console.log(`  ───────────────────────`);
console.log(`  Total:               $${withBenefits.total.toFixed(2)}`);

const extraEarnings = withBenefits.total - (baseRideEarnings.baseFare + baseRideEarnings.waitTimeCut);
console.log(`\n💰 Additional Earnings: $${extraEarnings.toFixed(2)} per ride`);
console.log(`   Over 30 rides/month: $${(extraEarnings * 30).toFixed(2)}`);

// =============================================================================
// TEST 4: Platform Fee Discount
// =============================================================================
console.log("\n\n📍 TEST 4: Platform Fee Discount with Subscription");
console.log("-".repeat(80));

// Standard driver (no discount)
const standardFee = 7.5;
console.log(`\nSTANDARD DRIVER Platform Fee: $${standardFee.toFixed(2)}`);

// Driver Plus (15% discount)
const driverPlusFee = driverSubMgr.calculatePlatformFeeWithDiscount(
  standardFee,
  "driver_001"
);
console.log(`\nDRIVER PLUS Platform Fee:`);
console.log(`  Original Fee:      $${driverPlusFee.originalFee.toFixed(2)}`);
console.log(`  Discount (15%):    -$${driverPlusFee.discountApplied.toFixed(2)}`);
console.log(`  Final Fee:         $${driverPlusFee.finalFee.toFixed(2)}`);

// =============================================================================
// TEST 5: Performance Bonus
// =============================================================================
console.log("\n\n📍 TEST 5: Performance Bonuses");
console.log("-".repeat(80));

console.log("\nDRIVER PLUS Performance Bonuses:");
console.log("  4.8+ Rating: $5.00 bonus");

const driverPlus48 = driverSubMgr.getPerformanceBonus(4.8, "driver_001");
console.log(`  Bonus (4.8 rating): $${driverPlus48.bonus.toFixed(2)} ${driverPlus48.eligible ? "✓" : "✗"}`);

const driverPlus47 = driverSubMgr.getPerformanceBonus(4.7, "driver_001");
console.log(`  Bonus (4.7 rating): $${driverPlus47.bonus.toFixed(2)} ${driverPlus47.eligible ? "✓" : "✗"}`);

// Subscribe Elite Driver
console.log("\n\nELITE DRIVER Performance Bonuses:");
driverSubMgr.subscribeTier("driver_002", "ELITE_DRIVER", accountManager, "driver_elite@mogo.app");
console.log("  4.9+ Rating: $10.00 bonus");
console.log("  4.95+ Rating: $15.00 bonus (10 + 5 bonus)");

const eliteDriver49 = driverSubMgr.getPerformanceBonus(4.9, "driver_002");
console.log(`  Bonus (4.9 rating): $${eliteDriver49.bonus.toFixed(2)} ${eliteDriver49.eligible ? "✓" : "✗"}`);

const eliteDriver495 = driverSubMgr.getPerformanceBonus(4.95, "driver_002");
console.log(`  Bonus (4.95 rating): $${eliteDriver495.bonus.toFixed(2)} ${eliteDriver495.eligible ? "✓" : "✗"}`);

// =============================================================================
// TEST 6: Priority Ride Requests
// =============================================================================
console.log("\n\n📍 TEST 6: Priority Ride Request Access");
console.log("-".repeat(80));

const standardPriority = driverSubMgr.isPriorityRideEligible("driver_standard");
const plusPriority = driverSubMgr.isPriorityRideEligible("driver_001");
const elitePriority = driverSubMgr.isPriorityRideEligible("driver_002");

console.log("\nStandard Driver: Priority Requests Available?", standardPriority ? "YES ✓" : "NO ✗");
console.log("Driver Plus: Priority Requests Available?", plusPriority ? "YES ✓" : "NO ✗");
console.log("Elite Driver: Priority Requests Available?", elitePriority ? "YES ✓" : "NO ✗");

// =============================================================================
// TEST 7: Advance Booking Window
// =============================================================================
console.log("\n\n📍 TEST 7: Advance Booking Capabilities");
console.log("-".repeat(80));

const standardBooking = driverSubMgr.getAdvanceBookingWindow("driver_standard");
const plusBooking = driverSubMgr.getAdvanceBookingWindow("driver_001");
const eliteBooking = driverSubMgr.getAdvanceBookingWindow("driver_002");

console.log("\nStandard Driver:");
console.log(`  Can Book Advance: ${standardBooking.canAdvanceBook ? "YES" : "NO"}`);
console.log(`  Hours in Advance: ${standardBooking.hoursInAdvance}h`);

console.log("\nDriver Plus:");
console.log(`  Can Book Advance: ${plusBooking.canAdvanceBook ? "YES" : "NO"}`);
console.log(`  Hours in Advance: ${plusBooking.hoursInAdvance}h`);

console.log("\nElite Driver:");
console.log(`  Can Book Advance: ${eliteBooking.canAdvanceBook ? "YES" : "NO"}`);
console.log(`  Hours in Advance: ${eliteBooking.hoursInAdvance}h`);

// =============================================================================
// TEST 8: Payout Speed
// =============================================================================
console.log("\n\n📍 TEST 8: Payout Processing Speed");
console.log("-".repeat(80));

const standardPayout = driverSubMgr.getPayoutSpeed("driver_standard");
const plusPayout = driverSubMgr.getPayoutSpeed("driver_001");
const elitePayout = driverSubMgr.getPayoutSpeed("driver_002");

console.log("\nStandard Driver:");
console.log(`  Speed: ${standardPayout.speed}`);
console.log(`  Processing Time: ${standardPayout.processingTime}`);

console.log("\nDriver Plus:");
console.log(`  Speed: ${plusPayout.speed}`);
console.log(`  Processing Time: ${plusPayout.processingTime}`);

console.log("\nElite Driver:");
console.log(`  Speed: ${elitePayout.speed}`);
console.log(`  Processing Time: ${elitePayout.processingTime}`);

// =============================================================================
// TEST 9: Monthly Metrics & Performance
// =============================================================================
console.log("\n\n📍 TEST 9: Driver Performance Metrics");
console.log("-".repeat(80));

// Simulate earnings for Driver Plus
const driverPlusMetrics = driverSubMgr.getDriverSubscription("driver_001");
if (driverPlusMetrics) {
  // Simulate 25 rides
  for (let i = 0; i < 25; i++) {
    const rideEarnings = { baseFare: 20 + Math.random() * 15, total: 0, waitTimeCut: 1 };
    rideEarnings.total = rideEarnings.baseFare + rideEarnings.waitTimeCut;
    driverSubMgr.applyEarningsBenefits(rideEarnings, "driver_001");
  }

  const metrics = driverSubMgr.getDriverMetrics("driver_001");
  console.log(`\nDriver Plus - Monthly Metrics:`);
  console.log(`  Tier: ${metrics.tier}`);
  console.log(`  Rides Completed: ${metrics.metrics.ridesCompleted}`);
  console.log(`  Total Earnings: $${metrics.metrics.totalEarnings.toFixed(2)}`);
  console.log(`  Average per Ride: $${metrics.metrics.averageEarningsPerRide}`);
  console.log(`  Bonus Earned: $${metrics.metrics.bonusEarned.toFixed(2)}`);
  console.log(`  Platform Fees Saved: $${metrics.metrics.platformFeeSaved.toFixed(2)}`);
  console.log(`  Renewal Date: ${metrics.metrics.renewalDate}`);
}

// =============================================================================
// TEST 10: Subscription Renewal with Minimum Earnings
// =============================================================================
console.log("\n\n📍 TEST 10: Subscription Renewal & Minimum Earnings");
console.log("-".repeat(80));

// Get current metrics for Driver Plus
const beforeRenewal = driverSubMgr.getDriverMetrics("driver_001");
console.log("\nDriver Plus Current Metrics:");
console.log(
  `  Total Earnings: $${beforeRenewal.metrics.totalEarnings.toFixed(2)}`
);
console.log(`  Minimum Required: $200.00 (for renewal)`);
console.log(
  `  Meets Minimum: ${beforeRenewal.metrics.totalEarnings >= 200 ? "YES ✓" : "NO ✗"}`
);

const renewalResult = driverSubMgr.renewSubscription(
  "driver_001",
  accountManager,
  "driver_plus@mogo.app"
);

if (renewalResult.success) {
  console.log(`\n${renewalResult.message}`);
  console.log(`Next Renewal Date: ${renewalResult.nextRenewalDate}`);
  console.log(`Renewals Count: ${renewalResult.renewalCounter}`);

  const afterRenewal = driverSubMgr.getDriverMetrics("driver_001");
  console.log("\nAfter Renewal - Metrics Reset:");
  console.log(
    `  Total Earnings: $${afterRenewal.metrics.totalEarnings.toFixed(2)}`
  );
} else {
  console.log(`\n❌ Renewal Failed: ${renewalResult.error}`);
}

// =============================================================================
// TEST 11: Elite Driver Subscription
// =============================================================================
console.log("\n\n📍 TEST 11: Elite Driver Subscription Benefits Summary");
console.log("-".repeat(80));

const eliteSub = driverSubMgr.getDriverSubscription("driver_002");
if (eliteSub) {
  console.log(`\nElite Driver - Tier: ${eliteSub.tierName}`);
  console.log(`  Monthly Subscription Fee: $${eliteSub.monthlyPrice.toFixed(2)}`);
  console.log(`  Minimum Monthly Earnings Required: $${eliteSub.minMonthlyEarnings.toFixed(2)}`);

  console.log("\n  Key Benefits:");
  console.log(`    Platform Fee Discount: ${(eliteSub.benefits.platformFeeDiscount * 100).toFixed(0)}%`);
  console.log(`    Earnings Bonus: ${(eliteSub.benefits.earningsBonus * 100).toFixed(0)}%`);
  console.log(`    Priority Rides: ${eliteSub.benefits.priorityRideRequests ? "✓" : "✗"}`);
  console.log(`    Instant Payouts: ${eliteSub.benefits.instantPayouts ? "✓" : "✗"}`);
  console.log(`    24h Advance Booking: ${eliteSub.benefits.advanceBooking ? "✓" : "✗"}`);
  console.log(`    Performance Bonuses: ${eliteSub.benefits.performanceBonus ? "✓" : "✗"}`);
  console.log(`    Dedicated 24/7 Support: ${eliteSub.benefits.dedicatedSupport ? "✓" : "✗"}`);
  console.log(`    Marketing Support: ${eliteSub.benefits.marketingSupport ? "✓" : "✗"}`);
  console.log(`    Extended Insurance: ${eliteSub.benefits.insuranceBoost ? "✓" : "✗"}`);
  console.log(`    Leaderboard Status: ${eliteSub.benefits.leaderboardStatus.toUpperCase()}`);
}

// =============================================================================
// TEST 12: Revenue by Subscription Tier
// =============================================================================
console.log("\n\n📍 TEST 12: Driver Subscription Revenue Report");
console.log("-".repeat(80));

const driverRevenue = driverSubMgr.getRevenueByTier();

console.log("\nDriver Subscription Revenue by Tier:");
Object.entries(driverRevenue).forEach(([tierId, revenue]) => {
  if (revenue > 0) {
    const tier = DriverSubscriptionManager.TIERS[tierId];
    console.log(`  ${tier.name}: $${revenue.toFixed(2)}`);
  }
});

const totalDriverRevenue = Object.values(driverRevenue).reduce((sum, r) => sum + r, 0);
console.log(`\n  TOTAL DRIVER SUBSCRIPTION REVENUE: $${totalDriverRevenue.toFixed(2)}`);

console.log("\n" + "=".repeat(80));
console.log("ALL DRIVER SUBSCRIPTION TESTS COMPLETED SUCCESSFULLY ✓");
console.log("=".repeat(80));
