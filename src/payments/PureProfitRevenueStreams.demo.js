const PureProfitRevenueStreams = require("./PureProfitRevenueStreams");

console.log("=".repeat(80));
console.log("MOGO PURE PROFIT REVENUE STREAMS");
console.log("Zero Payout, 100% Margin Opportunities");
console.log("=".repeat(80));

const pureProfitMgr = new PureProfitRevenueStreams();
const allStreams = pureProfitMgr.calculateTotalPureProfit();

// Display each revenue stream
console.log("\n📊 INDIVIDUAL REVENUE STREAMS (100% Margin)\n");

allStreams.allStreams.forEach((stream, index) => {
  console.log(`${index + 1}. ${stream.name.toUpperCase()}`);
  console.log(`   └─ Monthly Revenue: $${parseFloat(stream.estimatedMonthly).toLocaleString('en-US', {maximumFractionDigits: 2})}`);
  console.log(`   └─ Margin: ${stream.margin}`);
  console.log(`   └─ Description: ${stream.description}`);

  // Show details specific to each stream
  if (stream.features) {
    console.log(`   └─ Features:`);
    Object.entries(stream.features).forEach(([key, feature]) => {
      console.log(`      • ${feature.description}: $${feature.price}`);
    });
  }

  if (stream.adPlacementLocations) {
    console.log(`   └─ Ad Placements: ${stream.adPlacementLocations.length} locations`);
  }

  if (stream.items) {
    console.log(`   └─ Marketplace Items:`);
    Object.entries(stream.items).forEach(([key, item]) => {
      console.log(`      • ${key}: $${item.price} × ${item.monthlySales} = $${(item.price * item.monthlySales).toFixed(2)}`);
    });
  }

  if (stream.sponsorshipTypes) {
    console.log(`   └─ Sponsorship Opportunities:`);
    stream.sponsorshipTypes.forEach(type => {
      console.log(`      • ${type}`);
    });
  }

  console.log("");
});

// Summary table
console.log("\n" + "=".repeat(80));
console.log("REVENUE SUMMARY - PURE PROFIT OPPORTUNITIES");
console.log("=".repeat(80) + "\n");

const streams = [
  ["Revenue Stream", "Monthly", "Margin", "Annual"],
  ["-".repeat(25), "-".repeat(15), "-".repeat(10), "-".repeat(15)],
  ["Surge Pricing", "$2,813", "100%", "$33,756"],
  ["In-App Advertising", "$7,338", "100%", "$88,056"],
  ["Premium Features", "$4,567", "100%", "$54,804"],
  ["Tips Commission", "$1,879", "100%", "$22,548"],
  ["Marketplace", "$2,038", "100%", "$24,456"],
  ["Data & Analytics", "$8,500", "100%", "$102,000"],
  ["White Label/Licensing", "$75,000", "100%", "$900,000"],
  ["Corporate Accounts", "$27,000", "100%", "$324,000"],
  ["Insurance Plans", "$2,477", "100%", "$29,724"],
  ["Sponsored Rides", "$12,000", "100%", "$144,000"],
];

streams.forEach(row => {
  console.log(
    row[0].padEnd(27) +
    row[1].padStart(15) +
    row[2].padStart(12) +
    row[3].padStart(17)
  );
});

console.log("\n" + "=".repeat(80));
console.log("FINANCIAL IMPACT");
console.log("=".repeat(80) + "\n");

const totalPureProfit = parseFloat(allStreams.totalMonthlyPureProfit);
const currentRevenue = allStreams.totalCurrentMogoRevenue;
const projectedTotal = parseFloat(allStreams.potentialWithPureProfit);
const increase = parseFloat(allStreams.profitIncrease);

console.log(`Current Monthly Mogo Revenue (Subscriptions + Ride Fees):`);
console.log(`  Subscription Revenue:        $${allStreams.currentSubscriptionRevenue.toLocaleString()}`);
console.log(`  Ride Platform/Booking Fees:  $${allStreams.currentRidePlatformFees.toLocaleString()}`);
console.log(`  ─────────────────────────────────────────`);
console.log(`  TOTAL CURRENT REVENUE:       $${currentRevenue.toLocaleString()}\n`);

console.log(`NEW Pure Profit Revenue Streams:`);
console.log(`  Combined Pure Profit:        $${totalPureProfit.toLocaleString('en-US', {maximumFractionDigits: 2})}\n`);

console.log(`PROJECTED NEW TOTAL:`);
console.log(`  Projected Total Revenue:     $${projectedTotal.toLocaleString('en-US', {maximumFractionDigits: 2})}`);
console.log(`  ─────────────────────────────────────────`);
console.log(`  REVENUE INCREASE:            ${increase}% (${totalPureProfit.toLocaleString('en-US', {maximumFractionDigits: 2})} additional)\n`);

console.log(`Annual Impact:`);
console.log(`  Current Annual Revenue:      $${(currentRevenue * 12).toLocaleString()}`);
console.log(`  Pure Profit Annual Revenue:  $${(totalPureProfit * 12).toLocaleString('en-US', {maximumFractionDigits: 2})}`);
console.log(`  ─────────────────────────────────────────`);
console.log(`  Projected Annual Revenue:    $${(projectedTotal * 12).toLocaleString('en-US', {maximumFractionDigits: 2})}\n`);

// Strategic breakdown
console.log("=".repeat(80));
console.log("IMPLEMENTATION STRATEGY");
console.log("=".repeat(80) + "\n");

console.log("🚀 QUICK WINS (1-3 months, minimal development):");
console.log("  1. Surge Pricing          → $2,813/month (implement immediately)");
console.log("  2. Tips Commission        → $1,879/month (just adjust algorithm)");
console.log("  3. Premium Features       → $4,567/month (add UX buttons)");
console.log("  Subtotal: $9,259/month\n");

console.log("📱 MEDIUM EFFORT (1-2 quarters):");
console.log("  1. In-App Advertising     → $7,338/month (partner with AdMob)");
console.log("  2. Marketplace            → $2,038/month (cosmetics shop)");
console.log("  3. Insurance Plans        → $2,477/month (insurance partnerships)");
console.log("  Subtotal: $11,853/month\n");

console.log("🎯 ENTERPRISE OPPORTUNITIES (2-3 quarters):");
console.log("  1. Data & Analytics       → $8,500/month (recurring contracts)");
console.log("  2. Corporate Accounts     → $27,000/month (B2B sales team)");
console.log("  3. White Label            → $75,000/month (licensing)");
console.log("  4. Sponsored Rides        → $12,000/month (partnerships)");
console.log("  Subtotal: $122,500/month\n");

console.log("=".repeat(80));
console.log("💰 REALISTIC SCENARIO: Conservative Launch (Year 1)");
console.log("=".repeat(80) + "\n");

const year1Realistic = {
  surge: 2813,
  tips: 1879,
  features: 4567,
  ads: 2938,  // 40% adoption vs 100%
  marketplace: 1015,  // 50% adoption
  insurance: 1239,    // 50% adoption
  corporate: 8100,    // 3 corporate clients instead of 45 projected
  dataAnalytics: 3500, // 1 data contract instead of multiple
  sponsored: 0, // Year 2+
  whiteLable: 0, // Takes time to set up
};

const year1Total = Object.values(year1Realistic).reduce((a, b) => a + b, 0);

Object.entries(year1Realistic).forEach(([key, value]) => {
  if (value > 0) {
    console.log(`${key.padEnd(20)}: $${value.toLocaleString('en-US', {maximumFractionDigits: 2})}/month`);
  }
});

console.log(`\n${"─".repeat(40)}`);
console.log(`Year 1 Conservative Estimate: $${year1Total.toLocaleString('en-US', {maximumFractionDigits: 2})}/month`);
console.log(`                              $${(year1Total * 12).toLocaleString('en-US', {maximumFractionDigits: 2})}/year`);
console.log(`                              +${((year1Total / currentRevenue) * 100).toFixed(1)}% revenue increase\n`);

console.log("=".repeat(80));
console.log("KEY INSIGHT");
console.log("=".repeat(80));
console.log(`
Without changing driver payouts or rider discounts, mogo can increase
revenue by $${year1Total.toLocaleString('en-US', {maximumFractionDigits: 2})}/month (Year 1 conservative) to $${totalPureProfit.toLocaleString('en-US', {maximumFractionDigits: 2})}/month (full potential).

This is PURE PROFIT with ZERO payouts to drivers or riders.

Path to Profitability: Pure profit streams > Current payout obligations
`);

console.log("=".repeat(80));
console.log("ALL PURE PROFIT CALCULATIONS COMPLETED ✓");
console.log("=".repeat(80));
