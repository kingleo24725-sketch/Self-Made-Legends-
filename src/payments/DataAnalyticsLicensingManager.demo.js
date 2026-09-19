const DataAnalyticsLicensingManager = require("./DataAnalyticsLicensingManager");

console.log("=".repeat(80));
console.log("DATA & ANALYTICS LICENSING MANAGER - TESTS");
console.log("=".repeat(80));

const analytics = new DataAnalyticsLicensingManager();

// =============================================================================
// TEST 1: View All Data Products
// =============================================================================
console.log("\n📍 TEST 1: Available Data Products");
console.log("-".repeat(80));

const allProducts = analytics.getAllProducts();
console.log(`\nData Products Available:\n`);

allProducts.forEach((product, idx) => {
  console.log(`${idx + 1}. ${product.name}`);
  console.log(`   Price: $${product.monthlyPrice}/month`);
  console.log(`   Description: ${product.description}`);
  console.log(`   Data Points: ${product.dataPoints.length} metrics`);
  console.log(`   Target Clients: ${product.targetClients.join(', ')}`);
  console.log(`   Estimated Subscribers: ${product.estimatedSubscribers}\n`);
});

// =============================================================================
// TEST 2: Create Data License
// =============================================================================
console.log("\n📍 TEST 2: Create Data License");
console.log("-".repeat(80));

const license1 = analytics.createLicense('Department of Transportation', 'traffic_patterns', 'government');

console.log(`\nData License Created:\n`);
console.log(`  Success: ${license1.success ? '✓ YES' : '✗ NO'}`);
console.log(`  License ID: ${license1.licenseId}`);
console.log(`  Client: ${license1.clientName}`);
console.log(`  Product: ${license1.productName}`);
console.log(`  Monthly Price: $${license1.monthlyPrice}`);
console.log(`  Data Points: ${license1.dataPoints}`);

// =============================================================================
// TEST 3: Monthly Data Licensing Revenue
// =============================================================================
console.log("\n\n📍 TEST 3: Monthly Data Licensing Revenue");
console.log("-".repeat(80));

const monthlyRevenue = analytics.calculateMonthlyRevenue();

console.log(`\nRevenue Breakdown (Estimated Subscribers):\n`);

Object.values(monthlyRevenue.revenueBreakdown).forEach(product => {
  console.log(`${product.name}:`);
  console.log(`  Subscribers: ${product.subscribers}`);
  console.log(`  Price: $${product.monthlyPrice}/month`);
  console.log(`  Monthly Revenue: $${product.monthlyRevenue}\n`);
});

console.log(`Summary:`);
console.log(`  Total Subscriptions: ${monthlyRevenue.totalSubscriptions}`);
console.log(`  Monthly Revenue: $${monthlyRevenue.totalMonthlyRevenue}`);
console.log(`  Annual Revenue: $${monthlyRevenue.annualRevenue}`);
console.log(`  Average Contract Value: $${monthlyRevenue.averageContractValue}`);

// =============================================================================
// TEST 4: Multiple Licenses
// =============================================================================
console.log("\n\n📍 TEST 4: Multiple Data Licenses");
console.log("-".repeat(80));

const license2 = analytics.createLicense('Zillow Real Estate', 'demand_analytics', 'real_estate');
const license3 = analytics.createLicense('Progressive Insurance', 'safety_insights', 'insurance');
const license4 = analytics.createLicense('Urban Planning Institute', 'movement_demographics', 'government');

console.log(`\nMultiple Licenses Created:\n`);
console.log(`  License 1: ${license1.clientName} - $${license1.monthlyPrice}/month`);
console.log(`  License 2: ${license2.clientName} - $${license2.monthlyPrice}/month`);
console.log(`  License 3: ${license3.clientName} - $${license3.monthlyPrice}/month`);
console.log(`  License 4: ${license4.clientName} - $${license4.monthlyPrice}/month`);

const totalLicensed = [license1, license2, license3, license4].reduce((sum, l) => sum + l.monthlyPrice, 0);
console.log(`\n  Total Monthly Revenue: $${totalLicensed}`);

// =============================================================================
// TEST 5: Generate Anonymized Dataset
// =============================================================================
console.log("\n\n📍 TEST 5: Generate Anonymized Dataset");
console.log("-".repeat(80));

const dataset = analytics.generateAnonymizedDataset('traffic_patterns', [1, 2, 3]); // 1254 rides in month

console.log(`\nDataset Generated:\n`);
console.log(`  Dataset ID: ${dataset.datasetId}`);
console.log(`  Record Count: ${dataset.recordCount}`);
console.log(`  Data Points: ${dataset.dataPoints.length}`);
console.log(`  Size: ${dataset.size}`);
console.log(`  PII Removed: ${dataset.piiRemoved ? '✓ YES' : '✗ NO'}`);
console.log(`  Encryption: ${dataset.encryptionLevel}`);

// =============================================================================
// TEST 6: Cancel License
// =============================================================================
console.log("\n\n📍 TEST 6: Cancel Data License");
console.log("-".repeat(80));

const cancelResult = analytics.cancelLicense(license1.licenseId);

console.log(`\nLicense Cancelled:\n`);
console.log(`  Success: ${cancelResult.success ? '✓ YES' : '✗ NO'}`);
console.log(`  Refund Eligible: ${cancelResult.refundEligible ? '✓ YES (within 14 days)' : '✗ NO'}`);

// =============================================================================
// TEST 7: Revenue by Client Type
// =============================================================================
console.log("\n\n📍 TEST 7: Revenue by Client Type");
console.log("-".repeat(80));

// Simulate more licenses
analytics.createLicense('FedEx Logistics', 'demand_analytics', 'logistics');
analytics.createLicense('City Planning Dept', 'traffic_patterns', 'government');
analytics.createLicense('Allstate Insurance', 'safety_insights', 'insurance');

const revenueByType = analytics.getRevenueByClientType();

console.log(`\nRevenue Distribution by Client Type:\n`);
Object.entries(revenueByType).forEach(([clientType, revenue]) => {
  const percentage = (revenue / Object.values(revenueByType).reduce((sum, r) => sum + r, 0) * 100).toFixed(1);
  console.log(`  ${clientType.padEnd(20)}: $${revenue.toFixed(2).padStart(8)} (${percentage}%)`);
});

// =============================================================================
// TEST 8: Data Licensing Statistics
// =============================================================================
console.log("\n\n📍 TEST 8: Data Licensing Statistics");
console.log("-".repeat(80));

const stats = analytics.getLicensingStats();

console.log(`\nData Licensing Program Stats:\n`);
console.log(`  Active Licenses: ${stats.activeLicenses}`);
console.log(`  Monthly Revenue: $${stats.totalMonthlyRevenue}`);
console.log(`  Avg Monthly Value: $${stats.averageMonthlyValue}`);
console.log(`  Datasets Generated: ${stats.totalDatasetsGenerated}`);
console.log(`  Client Types: ${stats.clientTypes.join(', ')}`);

// =============================================================================
// TEST 9: Data Products by Target Client
// =============================================================================
console.log("\n\n📍 TEST 9: Popular Data Products");
console.log("-".repeat(80));

const productsByPopularity = allProducts.sort((a, b) => b.estimatedSubscribers - a.estimatedSubscribers);

console.log(`\nMost Subscribed Data Products:\n`);
productsByPopularity.forEach((product, idx) => {
  const revenue = product.monthlyPrice * product.estimatedSubscribers;
  console.log(`${idx + 1}. ${product.name}`);
  console.log(`   Subscribers: ${product.estimatedSubscribers}`);
  console.log(`   Revenue: $${revenue.toFixed(2)}/month`);
  console.log(`   Target Clients: ${product.targetClients.join(', ')}\n`);
});

// =============================================================================
// TEST 10: Pure Profit Concept
// =============================================================================
console.log("\n\n📍 TEST 10: Pure Profit - Data Analytics Licensing");
console.log("-".repeat(80));

console.log(`\nData Analytics is PURE PROFIT because:\n`);
console.log(`  ✓ Data already exists (from rides)`);
console.log(`  ✓ Anonymization is automated (minimal cost)`);
console.log(`  ✓ Distribution is digital (no fulfillment)`);
console.log(`  ✓ Mogo receives 100% of license revenue`);
console.log(`  ✓ Driver receives: $0 (unaffected)`);
console.log(`  ✓ Rider receives: $0 (privacy protected)`);
console.log(`  ✓ Margin: 100%`);

console.log(`\n  Scaling to monthly: $${monthlyRevenue.totalMonthlyRevenue}/month pure profit`);
console.log(`  Scaling to annual: $${monthlyRevenue.annualRevenue}/year pure profit`);

// =============================================================================
// TEST 11: Scaling to Multiple Licenses
// =============================================================================
console.log("\n\n📍 TEST 11: Revenue Scaling Scenarios");
console.log("-".repeat(80));

const scenarios = [
  { subscribers: 5, label: 'Conservative (5 licenses)' },
  { subscribers: 10, label: 'Realistic (10 licenses)' },
  { subscribers: 15, label: 'Aggressive (15 licenses)' },
];

console.log("\nMonthly Revenue by License Count:\n");
scenarios.forEach(scenario => {
  const scaledProducts = allProducts.map(p => ({
    ...p,
    estimatedSubscribers: Math.round(p.estimatedSubscribers * (scenario.subscribers / 10))
  }));
  const scaledRevenue = scaledProducts.reduce((sum, p) => sum + (p.monthlyPrice * p.estimatedSubscribers), 0);
  console.log(`${scenario.label.padEnd(40)} → $${scaledRevenue.toFixed(2)}/month ($${(scaledRevenue * 12).toFixed(2)}/year)`);
});

// =============================================================================
console.log("\n" + "=".repeat(80));
console.log("DATA LICENSING TESTS COMPLETED ✓");
console.log("=".repeat(80));
