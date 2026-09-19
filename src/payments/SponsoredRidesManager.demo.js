const SponsoredRidesManager = require("./SponsoredRidesManager");

console.log("=".repeat(80));
console.log("SPONSORED RIDES MANAGER - TESTS");
console.log("=".repeat(80));

const sponsored = new SponsoredRidesManager();

// =============================================================================
// TEST 1: View Campaign Types
// =============================================================================
console.log("\n📍 TEST 1: Available Campaign Types");
console.log("-".repeat(80));

const campaignTypes = Object.values(sponsored.campaignTypes);

console.log(`\nSponsored Rides Campaign Types:\n`);
campaignTypes.forEach((type, idx) => {
  console.log(`${idx + 1}. ${type.name}`);
  console.log(`   Description: ${type.description}`);
  console.log(`   Budget Range: $${type.budgetRange.min}-$${type.budgetRange.max}`);
  console.log(`   Typical Duration: ${type.typicalDuration} days`);
  console.log(`   Estimated Reach: ${type.estimatedReach} riders\n`);
});

// =============================================================================
// TEST 2: Create Campaign
// =============================================================================
console.log("\n📍 TEST 2: Create Sponsored Rides Campaign");
console.log("-".repeat(80));

const today = new Date();
const endDate = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

const campaign1 = sponsored.createCampaign(
  'Marvel Movie Premiere',
  'Marvel Studios',
  7500,
  'event_sponsorship',
  today,
  endDate,
  ['Downtown', 'Theater District']
);

console.log(`\nSponsored Campaign Created:\n`);
console.log(`  Success: ${campaign1.success ? '✓ YES' : '✗ NO'}`);
console.log(`  Campaign ID: ${campaign1.campaignId}`);
console.log(`  Brand: ${campaign1.brandName}`);
console.log(`  Campaign: ${campaign1.campaignName}`);
console.log(`  Type: ${campaign1.type}`);
console.log(`  Budget: $${campaign1.budget}`);
console.log(`  Duration: ${campaign1.duration} days`);
console.log(`  Estimated Reach: ${campaign1.estimatedReach} riders`);

// =============================================================================
// TEST 3: Record Sponsored Rides
// =============================================================================
console.log("\n\n📍 TEST 3: Record Sponsored Rides");
console.log("-".repeat(80));

const ride1 = sponsored.recordSponsoredRide(campaign1.campaignId, 'rider1@example.com', 25.00, 30);
const ride2 = sponsored.recordSponsoredRide(campaign1.campaignId, 'rider2@example.com', 18.50, 30);
const ride3 = sponsored.recordSponsoredRide(campaign1.campaignId, 'rider3@example.com', 22.75, 30);

console.log(`\nSponsored Rides Recorded:\n`);
console.log(`  Ride 1: $${ride1.rideAmount} - Discount: ${ride1.discount} - Sponsor Cost: $${ride1.sponsorCost}`);
console.log(`  Ride 2: $${ride2.rideAmount} - Discount: ${ride2.discount} - Sponsor Cost: $${ride2.sponsorCost}`);
console.log(`  Ride 3: $${ride3.rideAmount} - Discount: ${ride3.discount} - Sponsor Cost: $${ride3.sponsorCost}`);

// =============================================================================
// TEST 4: Multiple Campaigns
// =============================================================================
console.log("\n\n📍 TEST 4: Multiple Campaign Types");
console.log("-".repeat(80));

const campaign2 = sponsored.createCampaign(
  'OpenAI Store Grand Opening',
  'OpenAI',
  5000,
  'store_opening',
  today,
  new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000),
  ['San Francisco']
);

const campaign3 = sponsored.createCampaign(
  'iPhone 16 Launch',
  'Apple',
  9000,
  'entertainment_campaign',
  today,
  endDate,
  ['Nationwide']
);

console.log(`\nMultiple Campaigns Active:\n`);
console.log(`  Campaign 1: ${campaign1.campaignName} - $${campaign1.budget}`);
console.log(`  Campaign 2: ${campaign2.campaignName} - $${campaign2.budget}`);
console.log(`  Campaign 3: ${campaign3.campaignName} - $${campaign3.budget}`);
console.log(`\n  Total Budget: $${(parseFloat(campaign1.budget) + parseFloat(campaign2.budget) + parseFloat(campaign3.budget)).toFixed(2)}`);

// =============================================================================
// TEST 5: Monthly Sponsored Rides Revenue
// =============================================================================
console.log("\n\n📍 TEST 5: Monthly Sponsored Rides Revenue");
console.log("-".repeat(80));

const monthlyRevenue = sponsored.calculateMonthlyRevenue(3.5);

console.log(`\nRevenue Breakdown (3.5 campaigns/month):\n`);

Object.values(monthlyRevenue.revenueBreakdown).forEach(campaign => {
  console.log(`${campaign.name}:`);
  console.log(`  Estimated Campaigns: ${campaign.estimatedCampaigns}`);
  console.log(`  Average Budget: $${campaign.averageBudget}`);
  console.log(`  Monthly Revenue: $${campaign.monthlyRevenue}\n`);
});

console.log(`Summary:`);
console.log(`  Monthly Revenue: $${monthlyRevenue.totalMonthlyRevenue}`);
console.log(`  Annual Revenue: $${monthlyRevenue.annualRevenue}`);

// =============================================================================
// TEST 6: Record Ad Impressions
// =============================================================================
console.log("\n\n📍 TEST 6: Track Campaign Impressions");
console.log("-".repeat(80));

// Simulate impressions
for (let i = 0; i < 150; i++) {
  sponsored.recordImpression(campaign1.campaignId);
}
for (let i = 0; i < 120; i++) {
  sponsored.recordImpression(campaign2.campaignId);
}
for (let i = 0; i < 200; i++) {
  sponsored.recordImpression(campaign3.campaignId);
}

const camp1Details = sponsored.getCampaign(campaign1.campaignId);
const camp2Details = sponsored.getCampaign(campaign2.campaignId);
const camp3Details = sponsored.getCampaign(campaign3.campaignId);

console.log(`\nCampaign Impressions:\n`);
console.log(`  ${campaign1.campaignName}: ${camp1Details.impressions} impressions`);
console.log(`  ${campaign2.campaignName}: ${camp2Details.impressions} impressions`);
console.log(`  ${campaign3.campaignName}: ${camp3Details.impressions} impressions`);

// =============================================================================
// TEST 7: Calculate Campaign ROI
// =============================================================================
console.log("\n\n📍 TEST 7: Campaign ROI Analysis");
console.log("-".repeat(80));

const roi1 = sponsored.calculateCampaignROI(campaign1.campaignId);
const roi2 = sponsored.calculateCampaignROI(campaign2.campaignId);
const roi3 = sponsored.calculateCampaignROI(campaign3.campaignId);

console.log(`\nROI Metrics by Campaign:\n`);

[roi1, roi2, roi3].forEach((roi, idx) => {
  console.log(`Campaign ${idx + 1}: ${roi.campaignName}`);
  console.log(`  Budget: $${roi.budget}`);
  console.log(`  Riders Reached: ${roi.ridersReached}`);
  console.log(`  Rides Sponsored: ${roi.ridesSponsored}`);
  console.log(`  Total Impressions: ${roi.impressions}`);
  console.log(`  Cost per Rider: $${roi.costPerRiderReached}`);
  console.log(`  Cost per Ride: $${roi.costPerRide}`);
  console.log(`  ROI: ${roi.roi}\n`);
});

// =============================================================================
// TEST 8: Campaign Statistics
// =============================================================================
console.log("\n📍 TEST 8: Sponsored Rides Program Statistics");
console.log("-".repeat(80));

// Add more rides
for (let i = 0; i < 20; i++) {
  sponsored.recordSponsoredRide(campaign1.campaignId, `rider${i}@example.com`, 20.00, 25);
  sponsored.recordSponsoredRide(campaign2.campaignId, `rider${i}@example.com`, 15.00, 40);
}

const stats = sponsored.getSponsoredRidesStats();

console.log(`\nSponsored Rides Program Stats:\n`);
console.log(`  Active Campaigns: ${stats.activeCampaigns}`);
console.log(`  Total Budget: $${stats.totalBudget}`);
console.log(`  Rides Sponsored: ${stats.totalRidesSponsored}`);
console.log(`  Total Impressions: ${stats.totalImpressions}`);
console.log(`  Average Campaign Budget: $${stats.averageCampaignBudget}`);
console.log(`  Estimated Monthly Revenue: $${stats.estimatedMonthlyRevenue}`);
console.log(`  Top Campaign: ${stats.topCampaign}`);

// =============================================================================
// TEST 9: End Campaign
// =============================================================================
console.log("\n\n📍 TEST 9: Campaign Completion");
console.log("-".repeat(80));

const endCampaign = sponsored.endCampaign(campaign1.campaignId);

console.log(`\nCampaign Ended:\n`);
console.log(`  Success: ${endCampaign.success ? '✓ YES' : '✗ NO'}`);
console.log(`  Campaign: ${endCampaign.campaignName}`);
console.log(`  Total Budget: $${endCampaign.totalBudget}`);
console.log(`  Riders Reached: ${endCampaign.ridersReached}`);
console.log(`  Rides Sponsored: ${endCampaign.ridesSponsored}`);
console.log(`  Total Impressions: ${endCampaign.totalImpressions}`);

// =============================================================================
// TEST 10: Different Campaign Budgets
// =============================================================================
console.log("\n\n📍 TEST 10: Campaign Budget Variations");
console.log("-".repeat(80));

const budgetScenarios = [
  { budget: 2000, label: 'Small Budget' },
  { budget: 5000, label: 'Medium Budget' },
  { budget: 12000, label: 'Large Budget' },
];

console.log("\nBudget Levels and ROI:\n");
budgetScenarios.forEach(scenario => {
  // Estimate: $2-3 per impression, 100-200 impressions per $1000
  const impressions = scenario.budget * 1.5; // 1.5 impressions per dollar
  const value = impressions * 2.5; // $2.5 per impression average
  const roi = (((value - scenario.budget) / scenario.budget) * 100).toFixed(2);
  console.log(`${scenario.label.padEnd(20)}: Budget $${scenario.budget} → ${impressions.toFixed(0)} impressions → ROI ${roi}%`);
});

// =============================================================================
// TEST 11: Pure Profit Concept
// =============================================================================
console.log("\n\n📍 TEST 11: Pure Profit - Sponsored Rides");
console.log("-".repeat(80));

console.log(`\nSponsored Rides are PURE PROFIT because:\n`);
console.log(`  ✓ Brands pay mogo upfront`);
console.log(`  ✓ Mogo keeps 100% of sponsorship fees`);
console.log(`  ✓ Driver receives: Unchanged earnings`);
console.log(`  ✓ Rider receives: Free/discounted rides`);
console.log(`  ✓ Brand gets: Targeted user exposure`);
console.log(`  ✓ No fulfillment cost (software only)`);
console.log(`  ✓ Margin: 100%`);

console.log(`\n  Scaling to monthly: $${monthlyRevenue.totalMonthlyRevenue}/month pure profit`);
console.log(`  Scaling to annual: $${monthlyRevenue.annualRevenue}/year pure profit`);

// =============================================================================
console.log("\n" + "=".repeat(80));
console.log("SPONSORED RIDES TESTS COMPLETED ✓");
console.log("=".repeat(80));
