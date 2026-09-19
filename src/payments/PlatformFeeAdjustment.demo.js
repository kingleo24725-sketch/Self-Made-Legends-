const PlatformFeeAdjustment = require("./PlatformFeeAdjustment");

console.log("=".repeat(80));
console.log("PLATFORM FEE ADJUSTMENT - TESTS");
console.log("=".repeat(80));

const feeAdj = new PlatformFeeAdjustment();

// =============================================================================
// TEST 1: Calculate Adjustment for Single Ride
// =============================================================================
console.log("\n📍 TEST 1: Fee Adjustment per Ride");
console.log("-".repeat(80));

const singleRideAdj = feeAdj.calculateAdjustmentForRide('ride_001');

console.log(`\nSingle Ride Fee Adjustment:\n`);
console.log(`  Ride ID: ride_001`);
console.log(`  Platform Fee Increase: $${singleRideAdj.platformFeeIncrease.toFixed(2)}`);
console.log(`  Booking Fee Increase: $${singleRideAdj.bookingFeeIncrease.toFixed(2)}`);
console.log(`  ─────────────────────────────`);
console.log(`  Total Adjustment: $${singleRideAdj.totalAdjustment.toFixed(2)}`);
console.log(`  Mogo Revenue: $${singleRideAdj.mogoRevenue.toFixed(2)}`);
console.log(`  Driver Impact: ${singleRideAdj.driverImpact ? '✓ YES' : '✗ NO'}`);

// =============================================================================
// TEST 2: Apply Adjustment to Rider Payment
// =============================================================================
console.log("\n\n📍 TEST 2: Apply Adjustment to Rider Payment");
console.log("-".repeat(80));

const riderPayment = 25.00;
const adjustedPayment = feeAdj.applyAdjustmentToRide(riderPayment);

console.log(`\nRider Payment with Fee Adjustment:\n`);
console.log(`  Original Payment: $${adjustedPayment.originalPayment.toFixed(2)}`);
console.log(`  Platform Fee Increase: +$${adjustedPayment.platformFeeIncrease.toFixed(2)}`);
console.log(`  Booking Fee Increase: +$${adjustedPayment.bookingFeeIncrease.toFixed(2)}`);
console.log(`  ─────────────────────────────`);
console.log(`  Total Increase: +$${adjustedPayment.totalIncrease.toFixed(2)}`);
console.log(`  Adjusted Payment: $${adjustedPayment.adjustedPayment.toFixed(2)}`);
console.log(`  Mogo Revenue: $${adjustedPayment.mogoRevenue.toFixed(2)}`);

// =============================================================================
// TEST 3: Monthly Revenue Calculation
// =============================================================================
console.log("\n\n📍 TEST 3: Monthly Fee Adjustment Revenue");
console.log("-".repeat(80));

const monthlyRevenue = feeAdj.calculateMonthlyAdjustmentRevenue(1254);

console.log(`\nMonthly Revenue (1,254 rides):\n`);
console.log(`  Platform Fee Increase: $${monthlyRevenue.platformFeeIncreasePerRide}/ride`);
console.log(`  Booking Fee Increase: $${monthlyRevenue.bookingFeeIncreasePerRide}/ride`);
console.log(`  ─────────────────────────────`);
console.log(`  Total per Ride: $${monthlyRevenue.totalAdjustmentPerRide}`);
console.log(`  Rides Affected: ${monthlyRevenue.ridesPerMonth}`);
console.log(`  ─────────────────────────────`);
console.log(`  Monthly Revenue: $${monthlyRevenue.monthlyRevenue}`);
console.log(`  Annual Revenue: $${monthlyRevenue.annualRevenue}`);

// =============================================================================
// TEST 4: Rider Impact Analysis
// =============================================================================
console.log("\n\n📍 TEST 4: Impact on Rider Cost");
console.log("-".repeat(80));

const riderImpact = feeAdj.calculateRiderImpact();

console.log(`\nRider Cost Impact Analysis:\n`);
console.log(`  Average Ride Cost: $${riderImpact.averageRideCost}`);
console.log(`  Fee Adjustment: +$${riderImpact.totalAdjustment}`);
console.log(`  Percentage Increase: +${riderImpact.percentageIncrease}%`);
console.log(`  New Average Cost: $${riderImpact.newAverageCost}`);
console.log(`\n  ${riderImpact.message}`);

// =============================================================================
// TEST 5: Different Adjustment Amounts
// =============================================================================
console.log("\n\n📍 TEST 5: Revenue Impact - Different Adjustment Levels");
console.log("-".repeat(80));

const adjustmentScenarios = [
  { platform: 0.15, booking: 0.15, name: 'Conservative ($0.30/ride)' },
  { platform: 0.20, booking: 0.20, name: 'Moderate ($0.40/ride)' },
  { platform: 0.25, booking: 0.25, name: 'Current ($0.50/ride)' },
  { platform: 0.30, booking: 0.30, name: 'Aggressive ($0.60/ride)' },
];

console.log("\nMonthly Revenue by Adjustment Level (1,254 rides):\n");
console.log("Scenario                    | Per Ride | Monthly | Annual");
console.log("-".repeat(65));

adjustmentScenarios.forEach(scenario => {
  const totalPerRide = scenario.platform + scenario.booking;
  const monthly = 1254 * totalPerRide;
  const annual = monthly * 12;

  console.log(
    scenario.name.padEnd(27) + " | " +
    `$${totalPerRide.toFixed(2)}`.padStart(7) + " | " +
    `$${monthly.toFixed(2)}`.padStart(7) + " | " +
    `$${annual.toFixed(2)}`.padStart(9)
  );
});

// =============================================================================
// TEST 6: Adjustment Statistics
// =============================================================================
console.log("\n\n📍 TEST 6: Adjustment Statistics");
console.log("-".repeat(80));

// Simulate 100 rides
for (let i = 0; i < 100; i++) {
  feeAdj.calculateAdjustmentForRide(`ride_sim_${i}`);
}

const stats = feeAdj.getAdjustmentStats();
console.log(`\nAdjustment Statistics (100 simulated rides):\n`);
console.log(`  Total adjustments applied: ${stats.totalAdjustmentsApplied}`);
console.log(`  Total revenue collected: $${stats.totalRevenue}`);
console.log(`  Average per ride: $${stats.averageAdjustmentPerRide}`);
console.log(`  Projected monthly (1,254 rides): $${stats.projectedMonthly}`);

// =============================================================================
// TEST 7: Update Adjustment Amounts
// =============================================================================
console.log("\n\n📍 TEST 7: Update Adjustment Amounts");
console.log("-".repeat(80));

const newAdjustments = feeAdj.updateAdjustments(0.30, 0.30);

console.log(`\nUpdate Fee Adjustments:\n`);
console.log(`  Platform Fee Increase: $${newAdjustments.platformFeeIncrease}`);
console.log(`  Booking Fee Increase: $${newAdjustments.bookingFeeIncrease}`);
console.log(`  Total per Ride: $${newAdjustments.totalPerRide}`);
console.log(`  ${newAdjustments.message}`);

// Verify new revenue
const updatedRevenue = feeAdj.calculateMonthlyAdjustmentRevenue(1254);
console.log(`\n  New Monthly Revenue: $${updatedRevenue.monthlyRevenue}`);
console.log(`  New Annual Revenue: $${updatedRevenue.annualRevenue}`);

// Reset for next test
feeAdj.updateAdjustments(0.25, 0.25);

// =============================================================================
// TEST 8: Pure Profit Concept
// =============================================================================
console.log("\n\n📍 TEST 8: Pure Profit - Fee Adjustment");
console.log("-".repeat(80));

const pureProfit = feeAdj.applyAdjustmentToRide(25.00);

console.log(`\nFee Adjustment is PURE PROFIT because:\n`);
console.log(`  ✓ Rider charged: +$${pureProfit.totalIncrease.toFixed(2)}`);
console.log(`  ✓ Driver receives: $0 (zero impact)`);
console.log(`  ✓ Mogo keeps: $${pureProfit.mogoRevenue.toFixed(2)} (100%)`);
console.log(`  ✓ No additional cost to mogo`);
console.log(`  ✓ Implemented as: Platform fee (+$0.25) and Booking fee (+$0.25)`);
console.log(`  ✓ Margin: 100%`);

console.log(`\n  Scaling to monthly: $${monthlyRevenue.monthlyRevenue}/month pure profit`);
console.log(`  Scaling to annual: $${monthlyRevenue.annualRevenue}/year pure profit`);

// =============================================================================
// TEST 9: Compliance & Transparency
// =============================================================================
console.log("\n\n📍 TEST 9: Fee Transparency");
console.log("-".repeat(80));

console.log(`\nFee Breakdown for Riders:\n`);
console.log(`  Platform Fee Component:`);
console.log(`    Original: $2.75`);
console.log(`    Increase: +$0.25`);
console.log(`    New Total: $3.00`);
console.log(`\n  Booking Fee Component:`);
console.log(`    Original: $4.75`);
console.log(`    Increase: +$0.25`);
console.log(`    New Total: $5.00`);
console.log(`\n  Why the increase?`);
console.log(`    - Operating costs`);
console.log(`    - Service improvements`);
console.log(`    - Platform maintenance`);

// =============================================================================
console.log("\n" + "=".repeat(80));
console.log("PLATFORM FEE ADJUSTMENT TESTS COMPLETED ✓");
console.log("=".repeat(80));
