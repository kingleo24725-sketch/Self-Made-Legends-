const InsurancePlansManager = require("./InsurancePlansManager");

console.log("=".repeat(80));
console.log("INSURANCE PLANS MANAGER - TESTS");
console.log("=".repeat(80));

const insurance = new InsurancePlansManager();

// =============================================================================
// TEST 1: View All Insurance Plans
// =============================================================================
console.log("\n📍 TEST 1: Available Insurance Plans");
console.log("-".repeat(80));

const allPlans = insurance.getAllPlans();
console.log(`\nInsurance Plans Available:\n`);

allPlans.forEach((plan, idx) => {
  console.log(`${idx + 1}. ${plan.name}`);
  console.log(`   Price: $${plan.price.toFixed(2)} (${plan.billingCycle})`);
  console.log(`   Description: ${plan.description}`);
  console.log(`   Expected Adoption: ${(plan.adoptionRate * 100).toFixed(0)}%`);
  console.log(`   Coverage:`);
  Object.entries(plan.coverage).forEach(([key, value]) => {
    if (key !== 'deductible') {
      console.log(`     • ${key.replace(/_/g, ' ')}: ${value ? '✓' : '✗'}`);
    } else {
      console.log(`     • Deductible: $${value}`);
    }
  });
  console.log("");
});

// =============================================================================
// TEST 2: Subscribe to Monthly Plan
// =============================================================================
console.log("\n📍 TEST 2: Subscribe to Monthly Plan");
console.log("-".repeat(80));

const subscription1 = insurance.subscribeToPlan('rider_001', 'monthly_plan');

console.log(`\nSubscription Created:\n`);
console.log(`  Success: ${subscription1.success ? '✓ YES' : '✗ NO'}`);
console.log(`  Subscription ID: ${subscription1.subscriptionId}`);
console.log(`  Plan: ${subscription1.planName}`);
console.log(`  Price: $${subscription1.price.toFixed(2)}/${subscription1.billingCycle}`);
console.log(`  Coverage: ${Object.keys(subscription1.coverage).length} protections`);

// =============================================================================
// TEST 3: Subscribe to Different Plans
// =============================================================================
console.log("\n\n📍 TEST 3: Multiple Plan Subscriptions");
console.log("-".repeat(80));

const sub2 = insurance.subscribeToPlan('rider_002', 'annual_premium');
const sub3 = insurance.subscribeToPlan('rider_003', 'per_ride_protection');

console.log(`\nMultiple Users Subscribe:\n`);
console.log(`  Rider 2 → ${sub2.planName}: $${sub2.price}/year`);
console.log(`  Rider 3 → ${sub3.planName}: $${sub3.price}/ride (pay-as-you-go)`);

// =============================================================================
// TEST 4: Monthly Revenue Calculation
// =============================================================================
console.log("\n\n📍 TEST 4: Monthly Insurance Revenue");
console.log("-".repeat(80));

const monthlyRevenue = insurance.calculateMonthlyRevenue(487, 1254);

console.log(`\nRevenue Breakdown (487 active users, 1,254 rides/month):\n`);

Object.values(monthlyRevenue.revenueBreakdown).forEach(plan => {
  console.log(`${plan.name}:`);
  if (plan.subscribers) {
    console.log(`  Subscribers: ${plan.subscribers}`);
    console.log(`  Price: $${plan.pricePerMonth}/month`);
  } else if (plan.ridesProtected) {
    console.log(`  Rides Protected: ${plan.ridesProtected}`);
    console.log(`  Price: $${plan.pricePerRide}/ride`);
  }
  console.log(`  Monthly Revenue: $${plan.monthlyRevenue}\n`);
});

console.log(`Total Coverage:`);
console.log(`  Covered Riders: ${monthlyRevenue.totalCoveredRiders}`);
console.log(`  Protected Rides: ${monthlyRevenue.totalCoveredRides}`);
console.log(`\n  Total Monthly Revenue: $${monthlyRevenue.totalMonthlyRevenue}`);
console.log(`  Total Annual Revenue: $${monthlyRevenue.annualRevenue}`);

// =============================================================================
// TEST 5: File Insurance Claim
// =============================================================================
console.log("\n\n📍 TEST 5: File Insurance Claim");
console.log("-".repeat(80));

const claim = insurance.fileClaim(
  subscription1.subscriptionId,
  'trip_protection',
  250,
  'Rider left personal item in vehicle'
);

console.log(`\nClaim Filed:\n`);
console.log(`  Claim ID: ${claim.claimId}`);
console.log(`  Status: ${claim.status}`);
console.log(`  Coverage Eligible: ${claim.coverageEligible ? '✓ YES' : '✗ NO'}`);
console.log(`  Claim Type: ${claim.claimType}`);
console.log(`  Amount: $${claim.amount}`);
console.log(`  Description: ${claim.description}`);

// =============================================================================
// TEST 6: Cancel Subscription
// =============================================================================
console.log("\n\n📍 TEST 6: Cancel Subscription");
console.log("-".repeat(80));

const cancelResult = insurance.cancelSubscription(subscription1.subscriptionId);

console.log(`\nSubscription Cancelled:\n`);
console.log(`  Success: ${cancelResult.success ? '✓ YES' : '✗ NO'}`);
console.log(`  Refund Eligible: ${cancelResult.refundEligible ? '✓ YES (within 30 days)' : '✗ NO'}`);

// =============================================================================
// TEST 7: Insurance Statistics
// =============================================================================
console.log("\n\n📍 TEST 7: Insurance Program Statistics");
console.log("-".repeat(80));

// Simulate more subscriptions
for (let i = 4; i < 50; i++) {
  const planId = ['monthly_plan', 'per_ride_protection', 'annual_premium'][Math.floor(Math.random() * 3)];
  insurance.subscribeToPlan(`rider_${i}`, planId);
}

const stats = insurance.getInsuranceStats();

console.log(`\nInsurance Program Stats:\n`);
console.log(`  Active Subscriptions: ${stats.activeSubscriptions}`);
console.log(`  Monthly Revenue: $${stats.totalMonthlyRevenue}`);
console.log(`  Avg Revenue per Subscriber: $${stats.averageRevenuePerSubscriber}`);
console.log(`  Claims Filed: ${stats.totalClaimsFiled}`);
console.log(`  Claims Approved: ${stats.approvedClaims}`);
console.log(`  Approval Rate: ${stats.claimApprovalRate}`);

// =============================================================================
// TEST 8: User Subscriptions
// =============================================================================
console.log("\n\n📍 TEST 8: View User's Subscriptions");
console.log("-".repeat(80));

const userSubs = insurance.getUserSubscriptions('rider_002');

console.log(`\nRider 002 Active Subscriptions (${userSubs.length}):\n`);
userSubs.forEach((sub, idx) => {
  console.log(`${idx + 1}. ${sub.planName}`);
  console.log(`   Price: $${sub.price}/${sub.billingCycle}`);
  console.log(`   Started: ${new Date(sub.startDate).toLocaleDateString()}`);
  console.log(`   Next Renewal: ${new Date(sub.nextRenewalDate).toLocaleDateString()}\n`);
});

// =============================================================================
// TEST 9: Different Adoption Scenarios
// =============================================================================
console.log("\n📍 TEST 9: Revenue Impact - Different Adoption Rates");
console.log("-".repeat(80));

const adoptionScenarios = [
  { users: 487, adoption: 0.10, label: 'Conservative (10% adoption)' },
  { users: 487, adoption: 0.18, label: 'Current (18% adoption)' },
  { users: 487, adoption: 0.25, label: 'Optimistic (25% adoption)' },
  { users: 487, adoption: 0.35, label: 'Aggressive (35% adoption)' },
];

console.log("\nMonthly Revenue by Adoption Rate:\n");
adoptionScenarios.forEach(scenario => {
  const monthlySubscribers = scenario.users * scenario.adoption;
  const revenue = monthlySubscribers * 9.99; // Monthly plan default
  console.log(`${scenario.label.padEnd(35)} → $${revenue.toFixed(2)}/month ($${(revenue * 12).toFixed(2)}/year)`);
});

// =============================================================================
// TEST 10: Insurance Partners
// =============================================================================
console.log("\n\n📍 TEST 10: Insurance Partner Information");
console.log("-".repeat(80));

const partners = insurance.getPartnerInfo();

console.log(`\nInsurance Partners:\n`);
partners.partners.forEach(partner => {
  console.log(`  • ${partner.name}`);
  console.log(`    ${partner.coverage}\n`);
});

console.log(`Integration Status: ${partners.integrationStatus}`);
console.log(`Expected Launch: ${partners.expectedLaunchDate}`);

// =============================================================================
// TEST 11: Pure Profit Concept
// =============================================================================
console.log("\n\n📍 TEST 11: Pure Profit - Insurance Plans");
console.log("-".repeat(80));

console.log(`\nInsurance Plans Generate Profit because:\n`);
console.log(`  ✓ Premium revenue: 100% to mogo`);
console.log(`  ✓ Insurance partner handles claims (outsourced)`);
console.log(`  ✓ Mogo takes commission without claim liability`);
console.log(`  ✓ Driver receives: $0 (unaffected)`);
console.log(`  ✓ Rider receives: Protection benefits`);
console.log(`  ✓ No direct payout from mogo`);
console.log(`  ✓ Margin: 100% on revenue side`);

console.log(`\n  Scaling to monthly: $${monthlyRevenue.totalMonthlyRevenue}/month profit`);
console.log(`  Scaling to annual: $${monthlyRevenue.annualRevenue}/year profit`);

// =============================================================================
console.log("\n" + "=".repeat(80));
console.log("INSURANCE PLANS TESTS COMPLETED ✓");
console.log("=".repeat(80));
