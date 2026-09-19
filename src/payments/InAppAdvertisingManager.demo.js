const InAppAdvertisingManager = require("./InAppAdvertisingManager");

console.log("=".repeat(80));
console.log("IN-APP ADVERTISING MANAGER - TESTS");
console.log("=".repeat(80));

const adMgr = new InAppAdvertisingManager();

// =============================================================================
// TEST 1: View All Ad Placements
// =============================================================================
console.log("\n📍 TEST 1: Available Ad Placements");
console.log("-".repeat(80));

const placements = adMgr.getAllPlacements();
console.log(`\nAvailable Ad Placements:\n`);
Object.values(placements).forEach((placement, idx) => {
  console.log(`${idx + 1}. ${placement.name}`);
  console.log(`   Description: ${placement.description}`);
  console.log(`   Impression Rate: ${(placement.impressionRate * 100).toFixed(0)}%`);
  console.log(`   CPM Rate: $${placement.cpmRate}`);
  console.log("");
});

// =============================================================================
// TEST 2: Record Ad Impression
// =============================================================================
console.log("\n📍 TEST 2: Record Ad Impression");
console.log("-".repeat(80));

const impression = adMgr.recordImpression('map_screen', 'rider_001', 'advertiser_google');

console.log(`\nAd Impression Recorded:\n`);
console.log(`  Success: ${impression.success ? '✓ YES' : '✗ NO'}`);
console.log(`  Placement: ${impression.placementName}`);
console.log(`  CPM Rate: $${impression.cpmRate}`);
console.log(`  Message: ${impression.message}`);

// =============================================================================
// TEST 3: Calculate Monthly Ad Revenue
// =============================================================================
console.log("\n\n📍 TEST 3: Monthly Ad Revenue Calculation");
console.log("-".repeat(80));

const monthlyRevenue = adMgr.calculateMonthlyAdRevenue(487);

console.log(`\nMonthly Ad Revenue by Placement (487 active users, 1,254 rides):\n`);
console.log("Placement                          CPM  | Impr % | Est. Impressions | Monthly Revenue");
console.log("-".repeat(85));

Object.values(monthlyRevenue.placementRevenue).forEach(placement => {
  console.log(
    placement.name.padEnd(34) + " | " +
    `$${placement.cpmRate}`.padStart(3) + " | " +
    placement.impressionRate.padStart(5) + "% | " +
    placement.estimatedMonthlyImpressions.toString().padStart(16) + " | " +
    `$${placement.estimatedMonthlyRevenue}`.padStart(16)
  );
});

console.log(`\nTotal Monthly Impressions: ${monthlyRevenue.totalMonthlyImpressions}`);
console.log(`Average CPM: $${monthlyRevenue.averageCPM}`);
console.log(`\n  Total Monthly Revenue: $${monthlyRevenue.totalMonthlyRevenue}`);
console.log(`  Total Annual Revenue: $${monthlyRevenue.annualRevenue}`);

// =============================================================================
// TEST 4: Different CPM Scenarios
// =============================================================================
console.log("\n\n📍 TEST 4: Revenue Impact - Different CPM Rates");
console.log("-".repeat(80));

const cpmScenarios = [
  { cpm: 3, label: 'Conservative ($3 CPM)' },
  { cpm: 5, label: 'Current ($5 CPM)' },
  { cpm: 7, label: 'Premium ($7 CPM)' },
  { cpm: 10, label: 'Optimistic ($10 CPM)' },
];

console.log("\nMonthly Revenue by CPM Rate:\n");
cpmScenarios.forEach(scenario => {
  // Approximate calculation based on average user engagement
  const impressions = 487 * 4 * 3; // users * sessions * impressions per session
  const revenue = (impressions / 1000) * scenario.cpm;
  console.log(`${scenario.label.padEnd(30)} → $${revenue.toFixed(2)}/month ($${(revenue * 12).toFixed(2)}/year)`);
});

// =============================================================================
// TEST 5: Create Advertising Campaign
// =============================================================================
console.log("\n\n📍 TEST 5: Create Advertising Campaign");
console.log("-".repeat(80));

const campaign = adMgr.createCampaign(
  'Coffee Shop Grand Opening',
  'advertiser_coffee_123',
  5000,
  'map_screen'
);

console.log(`\nCampaign Created:\n`);
console.log(`  Campaign ID: ${campaign.campaignId}`);
console.log(`  Campaign Name: ${campaign.details.campaignName}`);
console.log(`  Budget: $${campaign.details.budget}`);
console.log(`  Target Placement: ${campaign.details.targetPlacementId}`);
console.log(`  Status: ${campaign.details.status}`);
console.log(`  Message: ${campaign.message}`);

// =============================================================================
// TEST 6: Impression Statistics
// =============================================================================
console.log("\n\n📍 TEST 6: Ad Statistics");
console.log("-".repeat(80));

// Simulate 500 impressions
for (let i = 0; i < 500; i++) {
  const placements = Object.keys(adMgr.adPlacements);
  const randomPlacement = placements[Math.floor(Math.random() * placements.length)];
  const placementId = adMgr.adPlacements[randomPlacement].id;

  adMgr.recordImpression(
    placementId,
    `rider_${Math.floor(Math.random() * 100)}`,
    `advertiser_${Math.floor(Math.random() * 20)}`
  );
}

const stats = adMgr.getImpressionStats();
console.log(`\nAd Statistics (500 simulated impressions):\n`);
console.log(`  Total Impressions: ${stats.totalImpressions}`);
console.log(`  Estimated Revenue: $${stats.totalRevenue}`);
console.log(`  Average Revenue per Impression: $${stats.averageRevenuePerImpression}`);
if (stats.topPlacement) {
  console.log(`  Top Placement: ${stats.topPlacement.name} (${stats.topPlacement.count} impressions)`);
}
if (stats.topAdvertiser) {
  console.log(`  Top Advertiser: ${stats.topAdvertiser.id} (${stats.topAdvertiser.count} ads)`);
}

// =============================================================================
// TEST 7: Pure Profit Concept
// =============================================================================
console.log("\n\n📍 TEST 7: Pure Profit - In-App Advertising");
console.log("-".repeat(80));

console.log(`\nIn-App Advertising is PURE PROFIT because:\n`);
console.log(`  ✓ Advertisers pay CPM rates (cost per 1000 impressions)`);
console.log(`  ✓ Mogo receives 100% of ad revenue`);
console.log(`  ✓ Driver receives: $0 (unaffected)`);
console.log(`  ✓ Rider experience: Enhanced with sponsored content`);
console.log(`  ✓ No additional infrastructure cost`);
console.log(`  ✓ Margin: 100%`);

console.log(`\n  Scaling to monthly: $${monthlyRevenue.totalMonthlyRevenue}/month pure profit`);
console.log(`  Scaling to annual: $${monthlyRevenue.annualRevenue}/year pure profit`);

// =============================================================================
// TEST 8: Placement Effectiveness
// =============================================================================
console.log("\n\n📍 TEST 8: Ad Placement Effectiveness");
console.log("-".repeat(80));

console.log(`\nPlacement Performance (by engagement level):\n`);
console.log("High Engagement:");
console.log("  Post-Ride Feedback (80% impression rate, $6 CPM)");
console.log("  - Riders actively engaged in rating experience");
console.log("  - Receptive to relevant ads\n");

console.log("Medium Engagement:");
console.log("  Map Screen During Wait (35% impression rate, $5 CPM)");
console.log("  Ride History Feed (40% impression rate, $4 CPM)");
console.log("  - Secondary attention during ride\n");

console.log("Broad Reach:");
console.log("  Home Screen (100% impression rate, $4 CPM)");
console.log("  - Every session sees this placement");
console.log("  - Lower engagement but guaranteed visibility\n");

// =============================================================================
console.log("\n" + "=".repeat(80));
console.log("IN-APP ADVERTISING TESTS COMPLETED ✓");
console.log("=".repeat(80));
