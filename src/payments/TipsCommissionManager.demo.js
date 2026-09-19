const TipsCommissionManager = require("./TipsCommissionManager");

console.log("=".repeat(80));
console.log("TIPS COMMISSION MANAGER - TESTS");
console.log("=".repeat(80));

const tipsMgr = new TipsCommissionManager();

// =============================================================================
// TEST 1: Process Single Tip with Commission
// =============================================================================
console.log("\n📍 TEST 1: Process Single Tip with 30% Mogo Commission");
console.log("-".repeat(80));

const tip1 = tipsMgr.processTip('ride_001', 5.00, 'driver_001@mogo.app');

console.log(`\nRider Tips $5.00:\n`);
console.log(`  Rider Tip: $${tip1.riderTip.toFixed(2)}`);
console.log(`  Mogo Commission (30%): $${tip1.mogoRevenue.toFixed(2)}`);
console.log(`  Driver Receives: $${tip1.driverReceives.toFixed(2)}`);
console.log(`  Mogo Percentage: ${tip1.mogoPercentage}%`);

// =============================================================================
// TEST 2: Calculate Tip Commission
// =============================================================================
console.log("\n\n📍 TEST 2: Calculate Commission for Different Tip Amounts");
console.log("-".repeat(80));

const tipAmounts = [1.00, 2.50, 5.00, 10.00, 20.00];

console.log("\nTip Commission Breakdown:\n");
console.log("Rider Tip | Mogo (30%) | Driver (70%) | Split");
console.log("-".repeat(50));

tipAmounts.forEach(amount => {
  const calc = tipsMgr.calculateTipCommission({ tip: amount });
  if (calc.tipIncluded) {
    console.log(
      `$${amount.toFixed(2)}`.padEnd(10) +
      `$${calc.mogoCommission.toFixed(2)}`.padStart(10) + " | " +
      `$${calc.driverTip.toFixed(2)}`.padStart(11) + " | " +
      `${calc.percentageToMogo}%`
    );
  }
});

// =============================================================================
// TEST 3: Ride With and Without Tip
// =============================================================================
console.log("\n\n📍 TEST 3: Ride With Tip vs Without Tip");
console.log("-".repeat(80));

const noTipRide = tipsMgr.calculateTipCommission({ tip: 0 });
const withTipRide = tipsMgr.calculateTipCommission({ tip: 5.00 });

console.log(`\nRide WITHOUT Tip:\n`);
console.log(`  Tip Included: ${noTipRide.tipIncluded ? '✓ YES' : '✗ NO'}`);
console.log(`  Mogo Commission: $${noTipRide.mogoCommission.toFixed(2)}`);
console.log(`  Driver Tip: $${noTipRide.driverTip.toFixed(2)}`);

console.log(`\nRide WITH $5.00 Tip:\n`);
console.log(`  Tip Included: ${withTipRide.tipIncluded ? '✓ YES' : '✗ NO'}`);
console.log(`  Mogo Commission (30%): $${withTipRide.mogoCommission.toFixed(2)}`);
console.log(`  Driver Tip (70%): $${withTipRide.driverTip.toFixed(2)}`);

// =============================================================================
// TEST 4: Monthly Tips Revenue Calculation
// =============================================================================
console.log("\n\n📍 TEST 4: Monthly Tips Revenue Calculation");
console.log("-".repeat(80));

// Default: 1,254 rides/month, 25% with tips, $5 average
const monthlyTipsRevenue = tipsMgr.calculateMonthlyTipsRevenue(1254, 0.25, 5.0);

console.log(`\nMonthly Tips Revenue (1,254 rides, 25% tip rate, $5 avg tip):\n`);
console.log(`  Rides with tips: ${monthlyTipsRevenue.ridesWithTips}`);
console.log(`  Average tip amount: $${monthlyTipsRevenue.averageTip}`);
console.log(`  Total tips amount: $${monthlyTipsRevenue.totalTipsAmount}`);
console.log(`  ─────────────────────────────`);
console.log(`  Mogo commission (30%): $${monthlyTipsRevenue.mogoCommission}`);
console.log(`  Driver tip payments (70%): $${monthlyTipsRevenue.driverTipPayments}`);
console.log(`  ─────────────────────────────`);
console.log(`  Monthly mogo revenue: $${monthlyTipsRevenue.monthlyMogoRevenue}`);
console.log(`  Annual mogo revenue: $${monthlyTipsRevenue.annualMogoRevenue}`);

// =============================================================================
// TEST 5: Different Tip Adoption Rates
// =============================================================================
console.log("\n\n📍 TEST 5: Revenue Impact - Different Adoption Rates");
console.log("-".repeat(80));

const adoptionRates = [0.15, 0.20, 0.25, 0.30, 0.35];

console.log("\nMonthly Mogo Revenue by Tip Adoption Rate (1,254 rides):\n");
console.log("Adoption | Rides w/Tips | Total Tips | Mogo (30%) | Annual");
console.log("-".repeat(60));

adoptionRates.forEach(rate => {
  const revenue = tipsMgr.calculateMonthlyTipsRevenue(1254, rate, 5.0);
  console.log(
    `${(rate * 100).toFixed(0)}%`.padEnd(9) +
    `${revenue.ridesWithTips}`.padStart(12) + " | " +
    `$${revenue.totalTipsAmount}`.padStart(9) + " | " +
    `$${revenue.mogoCommission}`.padStart(9) + " | " +
    `$${revenue.annualMogoRevenue}`.padStart(9)
  );
});

// =============================================================================
// TEST 6: Commission Rate Configuration
// =============================================================================
console.log("\n\n📍 TEST 6: Commission Rate Configuration");
console.log("-".repeat(80));

console.log(`\nDefault Commission Rate: ${(tipsMgr.getCommissionRate() * 100).toFixed(0)}%`);

// Change commission rate
tipsMgr.setCommissionRate(0.35);
console.log(`Updated Commission Rate: ${(tipsMgr.getCommissionRate() * 100).toFixed(0)}%`);

// Recalculate with new rate
const tip35 = tipsMgr.calculateTipCommission({ tip: 5.00 });
console.log(`\nWith 35% Rate on $5.00 Tip:`);
console.log(`  Mogo Commission: $${tip35.mogoCommission.toFixed(2)}`);
console.log(`  Driver Tip: $${tip35.driverTip.toFixed(2)}`);

// Reset to default
tipsMgr.setCommissionRate(0.30);

// =============================================================================
// TEST 7: Tips Statistics
// =============================================================================
console.log("\n\n📍 TEST 7: Tips Statistics Tracking");
console.log("-".repeat(80));

// Simulate 100 tips
for (let i = 0; i < 100; i++) {
  const randomTip = (Math.random() * 15 + 2).toFixed(2); // $2-17
  tipsMgr.processTip(`ride_${i}`, parseFloat(randomTip), `driver_${i}@mogo.app`);
}

const stats = tipsMgr.getTipsStats();
console.log(`\nTips Statistics (100 simulated tips):\n`);
console.log(`  Total tips processed: ${stats.totalTipsProcessed}`);
console.log(`  Total tips amount: $${stats.totalTipsAmount}`);
console.log(`  Mogo commission earned: $${stats.mogoCommissionEarned}`);
console.log(`  Driver tips distributed: $${stats.driverTipsDistributed}`);
console.log(`  Average tip per ride: $${stats.averageTip}`);
console.log(`  Average commission per ride: $${stats.averageCommissionPerRide}`);

// =============================================================================
// TEST 8: Date Range Filtering
// =============================================================================
console.log("\n\n📍 TEST 8: Tips by Date Range");
console.log("-".repeat(80));

// Clear and set specific dates
tipsMgr.clearHistory();

// Add tips from different dates
const date1 = new Date('2024-01-15');
const date2 = new Date('2024-02-15');
const date3 = new Date('2024-03-15');

tipsMgr.processTip('ride_jan1', 5.00, 'driver1@mogo.app', date1);
tipsMgr.processTip('ride_jan2', 6.00, 'driver2@mogo.app', date1);
tipsMgr.processTip('ride_feb1', 4.00, 'driver3@mogo.app', date2);
tipsMgr.processTip('ride_mar1', 7.00, 'driver4@mogo.app', date3);

const februaryTips = tipsMgr.getTipsByDateRange(new Date('2024-02-01'), new Date('2024-02-28'));
console.log(`\nTips in February 2024: ${februaryTips.length}`);
console.log(`  Expected: 1 (only Feb 15)`);

// =============================================================================
// TEST 9: Pure Profit Concept
// =============================================================================
console.log("\n\n📍 TEST 9: Pure Profit - Tips Commission");
console.log("-".repeat(80));

const pureProfit = tipsMgr.calculateTipCommission({ tip: 5.00 });

console.log(`\nTips Commission is PURE PROFIT because:\n`);
console.log(`  ✓ Rider tips $5.00 (independent of ride fare)`);
console.log(`  ✓ Mogo takes $${pureProfit.mogoCommission.toFixed(2)} immediately (30%)`);
console.log(`  ✓ Driver receives $${pureProfit.driverTip.toFixed(2)} (70%)`);
console.log(`  ✓ Mogo profit: $${pureProfit.mogoCommission.toFixed(2)}`);
console.log(`  ✓ No additional cost to mogo`);
console.log(`  ✓ Margin: 100% on commission portion`);

console.log(`\n  Scaling to monthly: $${tipsMgr.calculateMonthlyTipsRevenue(1254, 0.25, 5.0).mogoCommission}/month pure profit`);
console.log(`  Scaling to annual: $${tipsMgr.calculateMonthlyTipsRevenue(1254, 0.25, 5.0).annualMogoRevenue}/year pure profit`);

// =============================================================================
console.log("\n" + "=".repeat(80));
console.log("TIPS COMMISSION TESTS COMPLETED ✓");
console.log("=".repeat(80));
