const PremiumFeaturesManager = require("./PremiumFeaturesManager");

console.log("=".repeat(80));
console.log("PREMIUM FEATURES MANAGER - TESTS");
console.log("=".repeat(80));

const featuresMgr = new PremiumFeaturesManager();

// =============================================================================
// TEST 1: View All Available Premium Features
// =============================================================================
console.log("\n📍 TEST 1: Available Premium Features");
console.log("-".repeat(80));

const allFeatures = featuresMgr.getAllFeatures();

console.log(`\nAvailable Premium Features:\n`);
Object.values(allFeatures).forEach((feature, index) => {
  console.log(`${index + 1}. ${feature.name}`);
  console.log(`   Price: $${feature.price.toFixed(2)}`);
  console.log(`   Description: ${feature.description}`);
  console.log(`   Adoption Rate: ${(feature.adoptionRate * 100).toFixed(0)}%`);
  console.log("");
});

// =============================================================================
// TEST 2: Purchase Single Premium Feature
// =============================================================================
console.log("\n📍 TEST 2: Purchase Single Premium Feature");
console.log("-".repeat(80));

const purchase1 = featuresMgr.purchaseFeature('ride_001', 'rider_001', 'scheduled');

console.log(`\nPurchase Scheduled Ride Feature:\n`);
console.log(`  Ride ID: ride_001`);
console.log(`  Rider ID: rider_001`);
console.log(`  Feature: ${purchase1.featureName}`);
console.log(`  Price: $${purchase1.price.toFixed(2)}`);
console.log(`  Message: ${purchase1.message}`);
console.log(`  Mogo Revenue: $${purchase1.mogoRevenue.toFixed(2)}`);
console.log(`  Success: ${purchase1.success ? '✓ YES' : '✗ NO'}`);

// =============================================================================
// TEST 3: Purchase Multiple Features for Same Ride
// =============================================================================
console.log("\n\n📍 TEST 3: Apply Multiple Premium Features to One Ride");
console.log("-".repeat(80));

const multiFeaturePurchase = featuresMgr.applyFeaturestoRide(
  'ride_002',
  'rider_002',
  ['scheduled', 'directMessage', 'priorityPickup']
);

console.log(`\nRide 002 - Multiple Premium Features:\n`);
console.log(`  Ride ID: ride_002`);
console.log(`  Rider ID: rider_002`);
console.log(`  Driver Earnings: Unchanged (no driver payout for premium features)`);
console.log(`\n  Features Selected:`);
multiFeaturePurchase.featuresApplied.forEach((feature, idx) => {
  console.log(`    ${idx + 1}. ${feature.featureName}: $${feature.price.toFixed(2)}`);
});
console.log(`\n  ─────────────────────────────`);
console.log(`  Total Features: ${multiFeaturePurchase.featureCount}`);
console.log(`  Total Premium Charge: $${multiFeaturePurchase.totalPremiumCharge}`);
console.log(`  Mogo Revenue (100%): $${multiFeaturePurchase.mogoRevenue}`);

// =============================================================================
// TEST 4: Premium Features Pricing Breakdown
// =============================================================================
console.log("\n\n📍 TEST 4: Premium Feature Pricing Comparison");
console.log("-".repeat(80));

const features = Object.values(featuresMgr.getAllFeatures());

console.log(`\nFeature Price Comparison:\n`);
console.log("Feature Name                      Price   Adoption Rate");
console.log("-".repeat(60));
features.forEach(f => {
  console.log(
    `${f.name.padEnd(33)} $${f.price.toFixed(2).padStart(5)} ${(f.adoptionRate * 100).toFixed(0)}%`
  );
});

const highestPrice = Math.max(...features.map(f => f.price));
const lowestPrice = Math.min(...features.map(f => f.price));
console.log(`\n  Highest: $${highestPrice.toFixed(2)} (Accessibility Plus)`);
console.log(`  Lowest: $${lowestPrice.toFixed(2)} (Direct Message)`);

// =============================================================================
// TEST 5: Monthly Premium Features Revenue
// =============================================================================
console.log("\n\n📍 TEST 5: Monthly Premium Features Revenue Calculation");
console.log("-".repeat(80));

const monthlyRevenue = featuresMgr.calculateMonthlyPremiumRevenue(1254);

console.log(`\nMonthly Revenue from Premium Features (1,254 rides):\n`);
Object.entries(monthlyRevenue.featureRevenues).forEach(([id, revenue]) => {
  console.log(`${revenue.name}`);
  console.log(`  Price: $${revenue.price.toFixed(2)} | Adoption: ${revenue.adoptionRate}%`);
  console.log(`  Estimated Rides: ${revenue.estimatedRidesPerMonth}`);
  console.log(`  Monthly Revenue: $${revenue.monthlyRevenue}`);
  console.log("");
});

console.log(`─`.repeat(60));
console.log(`Total Rides with Premium Features: ${monthlyRevenue.totalRidesWithPremiumFeatures}`);
console.log(`Average Feature Charge per Ride: $${monthlyRevenue.averageFeatureChargePerRide}`);
console.log(`Total Monthly Revenue: $${monthlyRevenue.totalMonthlyRevenue}`);
console.log(`Total Annual Revenue: $${monthlyRevenue.annualRevenue}`);

// =============================================================================
// TEST 6: Different Adoption Rates Impact
// =============================================================================
console.log("\n\n📍 TEST 6: Revenue Impact - Different Adoption Rates");
console.log("-".repeat(80));

const adoptionScenarios = [
  { name: 'Conservative (50% adoption)', multiplier: 0.50 },
  { name: 'Realistic (75% adoption)', multiplier: 0.75 },
  { name: 'Optimistic (100% adoption)', multiplier: 1.0 },
];

console.log("\nMonthly Revenue Scenarios:\n");
adoptionScenarios.forEach(scenario => {
  // Recalculate with adjusted adoption rates
  let totalRevenue = 0;
  Object.values(featuresMgr.getAllFeatures()).forEach(feature => {
    const adjustedAdoption = feature.adoptionRate * scenario.multiplier;
    const ridesWithFeature = 1254 * adjustedAdoption;
    const featureRevenue = ridesWithFeature * feature.price;
    totalRevenue += featureRevenue;
  });

  const annualRevenue = totalRevenue * 12;
  console.log(`${scenario.name}`);
  console.log(`  Monthly: $${totalRevenue.toFixed(2)}`);
  console.log(`  Annual: $${annualRevenue.toFixed(2)}\n`);
});

// =============================================================================
// TEST 7: Premium Features Statistics
// =============================================================================
console.log("\n📍 TEST 7: Premium Features Purchase Statistics");
console.log("-".repeat(80));

// Simulate 200 rides with various feature purchases
for (let i = 0; i < 200; i++) {
  const featureSelection = [];
  // Each feature has chance to be selected
  if (Math.random() < 0.15) featureSelection.push('scheduled');
  if (Math.random() < 0.08) featureSelection.push('directMessage');
  if (Math.random() < 0.20) featureSelection.push('splitRide');
  if (Math.random() < 0.12) featureSelection.push('priorityPickup');
  if (Math.random() < 0.05) featureSelection.push('accessibility');

  if (featureSelection.length > 0) {
    featuresMgr.applyFeaturestoRide(
      `ride_${i}`,
      `rider_${i}`,
      featureSelection
    );
  }
}

const stats = featuresMgr.getPremiumStats();
console.log(`\nPremium Features Statistics (200 simulated rides):\n`);
console.log(`  Total feature purchases: ${stats.totalPurchases}`);
console.log(`  Rides with premium features: ${stats.uniqueRidesWithPremium}`);
console.log(`  Total revenue: $${stats.totalRevenue}`);
console.log(`  Avg features per ride: ${stats.averageFeaturesPerRide}`);
console.log(`  Most popular feature: ${stats.mostPopularFeature}`);

console.log(`\n  Feature Purchase Breakdown:`);
Object.entries(stats.featurePurchaseCounts).forEach(([feature, count]) => {
  const percentage = ((count / stats.totalPurchases) * 100).toFixed(1);
  console.log(`    ${feature}: ${count} purchases (${percentage}%)`);
});

// =============================================================================
// TEST 8: Get Features by Ride
// =============================================================================
console.log("\n\n📍 TEST 8: Retrieve Features Purchased for Specific Ride");
console.log("-".repeat(80));

// Create a specific ride with known features
const specificRide = featuresMgr.applyFeaturestoRide(
  'ride_special',
  'rider_vip',
  ['scheduled', 'priorityPickup', 'accessibility']
);

console.log(`\nRide: ride_special\n`);
const rideFeatures = featuresMgr.getRidePremiumFeatures('ride_special');
console.log(`Features purchased: ${rideFeatures.length}`);
rideFeatures.forEach((f, idx) => {
  console.log(`  ${idx + 1}. ${f.featureName}: $${f.price.toFixed(2)}`);
});

const rideTotal = rideFeatures.reduce((sum, f) => sum + f.price, 0);
console.log(`  Total charge: $${rideTotal.toFixed(2)}`);

// =============================================================================
// TEST 9: Invalid Feature Handling
// =============================================================================
console.log("\n\n📍 TEST 9: Error Handling - Invalid Feature");
console.log("-".repeat(80));

const invalidPurchase = featuresMgr.purchaseFeature('ride_test', 'rider_test', 'invalidFeature');
console.log(`\nAttempt to purchase non-existent feature:\n`);
console.log(`  Success: ${invalidPurchase.success ? '✓ YES' : '✗ NO'}`);
console.log(`  Error: ${invalidPurchase.error}`);

// =============================================================================
// TEST 10: Pure Profit Concept
// =============================================================================
console.log("\n\n📍 TEST 10: Pure Profit - Premium Features");
console.log("-".repeat(80));

const pureProfitExample = featuresMgr.applyFeaturestoRide(
  'ride_profit',
  'rider_profit',
  ['scheduled', 'directMessage', 'priorityPickup']
);

console.log(`\nPremium Features are PURE PROFIT because:\n`);
console.log(`  ✓ Optional add-ons (rider chooses)`);
console.log(`  ✓ Rider charged: $${pureProfitExample.totalPremiumCharge}`);
console.log(`  ✓ Driver receives: $0 (unaffected by premium features)`);
console.log(`  ✓ Mogo keeps: $${pureProfitExample.mogoRevenue} (100%)`);
console.log(`  ✓ No additional cost to mogo`);
console.log(`  ✓ Margin: 100%`);

console.log(`\n  Scaling to monthly: $${monthlyRevenue.totalMonthlyRevenue}/month pure profit`);
console.log(`  Scaling to annual: $${monthlyRevenue.annualRevenue}/year pure profit`);

// =============================================================================
// TEST 11: Realistic Scenario - Mixed Ride Volume
// =============================================================================
console.log("\n\n📍 TEST 11: Realistic Scenario - 30 Day Period");
console.log("-".repeat(80));

featuresMgr.clearHistory();

// Simulate 1,254 monthly rides with realistic feature adoption
let totalPremiumRevenue = 0;
for (let i = 0; i < 1254; i++) {
  const selectedFeatures = [];
  // Apply realistic adoption rates
  if (Math.random() < 0.15) selectedFeatures.push('scheduled');
  if (Math.random() < 0.08) selectedFeatures.push('directMessage');
  if (Math.random() < 0.20) selectedFeatures.push('splitRide');
  if (Math.random() < 0.12) selectedFeatures.push('priorityPickup');
  if (Math.random() < 0.05) selectedFeatures.push('accessibility');

  if (selectedFeatures.length > 0) {
    const result = featuresMgr.applyFeaturestoRide(
      `ride_${i}`,
      `rider_${i}`,
      selectedFeatures
    );
    totalPremiumRevenue += parseFloat(result.totalPremiumCharge);
  }
}

const monthStats = featuresMgr.getPremiumStats();
console.log(`\nSimulated Monthly Performance (1,254 rides):\n`);
console.log(`  Total premium feature purchases: ${monthStats.totalPurchases}`);
console.log(`  Rides with premium features: ${monthStats.uniqueRidesWithPremium}`);
console.log(`  Total mogo revenue: $${monthStats.totalRevenue}`);
console.log(`  Projected annual revenue: $${(parseFloat(monthStats.totalRevenue) * 12).toFixed(2)}`);
console.log(`\n  Comparison to target: $${monthlyRevenue.totalMonthlyRevenue}/month`);
console.log(`  Reality often exceeds targets when feature adoption increases`);

// =============================================================================
console.log("\n" + "=".repeat(80));
console.log("PREMIUM FEATURES TESTS COMPLETED ✓");
console.log("=".repeat(80));
