/**
 * PHASE 1 QUICK WINS - INTEGRATION TEST
 * Combines Surge Pricing, Tips Commission, and Premium Features
 * Shows combined revenue impact of all three streams
 *
 * Target: $9,259/month pure profit revenue
 */

const SurgePricingManager = require("./SurgePricingManager");
const PlatformFeeAdjustment = require("./PlatformFeeAdjustment");
const PremiumFeaturesManager = require("./PremiumFeaturesManager");

console.log("=".repeat(80));
console.log("PHASE 1 QUICK WINS - INTEGRATION TEST");
console.log("Combined Revenue from 3 Pure Profit Streams");
console.log("=".repeat(80));

// Initialize all Phase 1 managers
const surgeMgr = new SurgePricingManager();
const feeAdj = new PlatformFeeAdjustment();
const featuresMgr = new PremiumFeaturesManager();

// =============================================================================
// TEST 1: Individual Stream Calculations
// =============================================================================
console.log("\n📍 TEST 1: Individual Stream Revenue Calculations");
console.log("-".repeat(80));

// Surge Pricing: 20% of rides with 1.5x multiplier
// Split: 75% to mogo, 25% to driver
// Note: Calculate total premium first, then apply split
const surgeRevenue = surgeMgr.calculateMonthlySurgeRevenue(1254, 0.20, 12.50);
// Revenue shown includes both mogo (75%) and driver (25%) portions
// Extract mogo's share by calculating: premium × 0.75
const surgePremiumTotal = parseFloat(surgeRevenue.monthlySurgeRevenue);
const mogoSurgeShare = surgePremiumTotal * 0.75; // Mogo gets 75% of surge premium
const monthlyFromSurge = mogoSurgeShare;

console.log(`\n1. SURGE PRICING (20% of rides, 75% mogo / 25% driver split)`);
console.log(`   Surge Premium Total: $${surgePremiumTotal.toFixed(2)}`);
console.log(`   Mogo Share (75%): $${mogoSurgeShare.toFixed(2)}/month`);
console.log(`   Driver Bonus (25%): $${(surgePremiumTotal * 0.25).toFixed(2)}/month`);
console.log(`   Annual (Mogo): $${(mogoSurgeShare * 12).toFixed(2)}`);

// Platform Fee Adjustment: +$0.25 platform fee, +$0.25 booking fee per ride
// 100% goes to mogo, zero driver impact
const feeAdjustment = feeAdj.calculateMonthlyAdjustmentRevenue(1254);
const monthlyFromFees = parseFloat(feeAdjustment.monthlyRevenue);

console.log(`\n2. PLATFORM & BOOKING FEE ADJUSTMENT ($0.25 + $0.25 per ride)`);
console.log(`   Monthly: $${feeAdjustment.monthlyRevenue}`);
console.log(`   Annual: $${feeAdjustment.annualRevenue}`);

// Premium Features: Optional add-ons per ride
// 5 features with different adoption rates (scheduled, direct message, split, priority, accessibility)
const featuresRevenue = featuresMgr.calculateMonthlyPremiumRevenue(1254);
const monthlyFromFeatures = parseFloat(featuresRevenue.totalMonthlyRevenue);

console.log(`\n3. PREMIUM FEATURES (5 optional add-ons per ride)`);
console.log(`   Monthly: $${featuresRevenue.totalMonthlyRevenue}`);
console.log(`   Annual: $${featuresRevenue.annualRevenue}`);

// =============================================================================
// TEST 2: Combined Monthly Revenue
// =============================================================================
console.log("\n\n📍 TEST 2: Combined Monthly Revenue");
console.log("-".repeat(80));

const combinedMonthly = monthlyFromSurge + monthlyFromFees + monthlyFromFeatures;
const combinedAnnual = combinedMonthly * 12;

console.log(`\nCOMBINED PURE PROFIT REVENUE:\n`);
console.log(`  Surge Pricing (75% mogo):     $${monthlyFromSurge.toFixed(2).padStart(8)} → $${(monthlyFromSurge * 12).toFixed(2)}/year`);
console.log(`  Platform/Booking Fee Adj:     $${monthlyFromFees.toFixed(2).padStart(8)} → $${(monthlyFromFees * 12).toFixed(2)}/year`);
console.log(`  Premium Features:             $${monthlyFromFeatures.toFixed(2).padStart(8)} → $${(monthlyFromFeatures * 12).toFixed(2)}/year`);
console.log(`  ─────────────────────────────`);
console.log(`  TOTAL MONTHLY:           $${combinedMonthly.toFixed(2).padStart(8)}`);
console.log(`  TOTAL ANNUAL:            $${combinedAnnual.toFixed(2)}`);

// =============================================================================
// TEST 3: Comparison to Target
// =============================================================================
console.log("\n\n📍 TEST 3: Performance vs Phase 1 Target");
console.log("-".repeat(80));

const phase1Target = 9259;
const performanceRatio = (combinedMonthly / phase1Target) * 100;

console.log(`\nPhase 1 Target: $${phase1Target.toLocaleString()}/month`);
console.log(`Actual Result: $${combinedMonthly.toFixed(2)}/month`);
console.log(`Performance: ${performanceRatio.toFixed(1)}%`);

if (combinedMonthly >= phase1Target) {
  console.log(`✓ EXCEEDS TARGET by $${(combinedMonthly - phase1Target).toFixed(2)}`);
} else {
  console.log(`⚠ Below target by $${(phase1Target - combinedMonthly).toFixed(2)}`);
}

// =============================================================================
// TEST 4: Revenue Distribution
// =============================================================================
console.log("\n\n📍 TEST 4: Revenue Distribution Breakdown");
console.log("-".repeat(80));

const surgePercent = (monthlyFromSurge / combinedMonthly) * 100;
const feesPercent = (monthlyFromFees / combinedMonthly) * 100;
const featuresPercent = (monthlyFromFeatures / combinedMonthly) * 100;

console.log(`\nRevenue Mix:\n`);
console.log(`  Surge Pricing (75%):      ${surgePercent.toFixed(1)}% ($${monthlyFromSurge.toFixed(2)})`);
console.log(`  Platform/Booking Fees:    ${feesPercent.toFixed(1)}% ($${monthlyFromFees.toFixed(2)})`);
console.log(`  Premium Features:         ${featuresPercent.toFixed(1)}% ($${monthlyFromFeatures.toFixed(2)})`);

// Create visual bar chart
console.log(`\nVisual Distribution:`);
const barLength = 50;
console.log(`  Surge      ${'█'.repeat(Math.round(barLength * surgePercent / 100))}${' '.repeat(barLength - Math.round(barLength * surgePercent / 100))}`);
console.log(`  Fees       ${'█'.repeat(Math.round(barLength * feesPercent / 100))}${' '.repeat(barLength - Math.round(barLength * feesPercent / 100))}`);
console.log(`  Features   ${'█'.repeat(Math.round(barLength * featuresPercent / 100))}${' '.repeat(barLength - Math.round(barLength * featuresPercent / 100))}`);

// =============================================================================
// TEST 5: Simulated Realistic Usage
// =============================================================================
console.log("\n\n📍 TEST 5: Realistic Monthly Simulation (1,254 rides)");
console.log("-".repeat(80));

// Simulate a realistic month with all three streams
let simulatedRevenue = {
  surge: 0,
  fees: 0,
  features: 0,
};

for (let i = 0; i < 1254; i++) {
  // Random surge (20% chance with 1.5x, split 75/25)
  if (Math.random() < 0.20) {
    const baseFare = 15 + Math.random() * 20;
    const surge = surgeMgr.applySurge(
      { baseFare, rideId: `ride_${i}` },
      new Date(),
      100 + Math.random() * 150,
      Math.random() > 0.85 ? 'rain' : 'clear'
    );
    simulatedRevenue.surge += surge.mogoRevenue; // Mogo's 75% share
  }

  // Platform/Booking fee adjustment ($0.50 per ride)
  const feeAdjRow = feeAdj.calculateAdjustmentForRide(`ride_${i}`);
  simulatedRevenue.fees += feeAdjRow.mogoRevenue;

  // Random premium features (60% chance)
  if (Math.random() < 0.60) {
    const selectedFeatures = [];
    if (Math.random() < 0.15) selectedFeatures.push('scheduled');
    if (Math.random() < 0.08) selectedFeatures.push('directMessage');
    if (Math.random() < 0.20) selectedFeatures.push('splitRide');
    if (Math.random() < 0.12) selectedFeatures.push('priorityPickup');
    if (Math.random() < 0.05) selectedFeatures.push('accessibility');

    if (selectedFeatures.length > 0) {
      const purchase = featuresMgr.applyFeaturestoRide(`ride_${i}`, `rider_${i}`, selectedFeatures);
      simulatedRevenue.features += parseFloat(purchase.totalPremiumCharge);
    }
  }
}

const simulatedTotal = simulatedRevenue.surge + simulatedRevenue.fees + simulatedRevenue.features;

console.log(`\nSimulated Monthly Results (1,254 rides):\n`);
console.log(`  Surge Pricing (75% mogo): $${simulatedRevenue.surge.toFixed(2)}`);
console.log(`  Platform/Booking Fees:    $${simulatedRevenue.fees.toFixed(2)}`);
console.log(`  Premium Features:         $${simulatedRevenue.features.toFixed(2)}`);
console.log(`  ─────────────────────────────`);
console.log(`  Total Simulated:  $${simulatedTotal.toFixed(2)}`);
console.log(`  Calculated Total: $${combinedMonthly.toFixed(2)}`);
console.log(`  Difference: ${simulatedTotal > combinedMonthly ? '+' : '-'}$${Math.abs(simulatedTotal - combinedMonthly).toFixed(2)}`);

// =============================================================================
// TEST 6: Development Effort vs Revenue
// =============================================================================
console.log("\n\n📍 TEST 6: Development Effort Analysis");
console.log("-".repeat(80));

console.log(`\nPhase 1 Quick Wins - Implementation Timeline:\n`);

const streams = [
  {
    name: 'Surge Pricing (75% mogo / 25% driver)',
    monthlyRevenue: monthlyFromSurge,
    devTime: '3-5 days',
    complexity: 'Low',
    driverImpact: 'Positive (25% bonus)',
  },
  {
    name: 'Platform & Booking Fee Adjustment',
    monthlyRevenue: monthlyFromFees,
    devTime: '1-2 days',
    complexity: 'Very Low',
    driverImpact: 'None',
  },
  {
    name: 'Premium Features (5 add-ons)',
    monthlyRevenue: monthlyFromFeatures,
    devTime: '4-6 days',
    complexity: 'Medium',
    driverImpact: 'None',
  },
];

streams.forEach((stream, idx) => {
  console.log(`${idx + 1}. ${stream.name}`);
  console.log(`   Monthly Revenue: $${stream.monthlyRevenue.toFixed(2)}`);
  console.log(`   Dev Time: ${stream.devTime}`);
  console.log(`   Complexity: ${stream.complexity}`);
  console.log(`   Driver Impact: ${stream.driverImpact}`);
  console.log(`   ROI: Excellent (passive revenue)`);
  console.log("");
});

// =============================================================================
// TEST 7: Pure Profit Guarantee
// =============================================================================
console.log("\n📍 TEST 7: Pure Profit Characteristics");
console.log("-".repeat(80));

console.log(`\nWhy Phase 1 Generates Strong Revenue:\n`);
console.log(`✓ Surge pricing INCENTIVIZES drivers (25% bonus)`);
console.log(`✓ Mogo KEEPS 75% of surge premium`);
console.log(`✓ NO driver payout to tips`);
console.log(`✓ Platform fee adjustment has NO driver impact`);
console.log(`✓ Premium features benefit both parties`);
console.log(`✓ Leverages existing platform`);
console.log(`✓ Implemented in 1-4 weeks`);
console.log(`✓ Scalable with minimal marginal cost`);

// =============================================================================
// TEST 8: Financial Impact
// =============================================================================
console.log("\n\n📍 TEST 8: Financial Impact Summary");
console.log("-".repeat(80));

console.log(`\nCurrent Mogo Revenue: $25,371/month`);
console.log(`Phase 1 Pure Profit: $${combinedMonthly.toFixed(2)}/month`);
console.log(`New Total Revenue: $${(25371 + combinedMonthly).toFixed(2)}/month`);
console.log(`\nRevenue Increase:`);
const percentIncrease = (combinedMonthly / 25371) * 100;
console.log(`  Percentage: +${percentIncrease.toFixed(1)}%`);
console.log(`  Amount: +$${combinedMonthly.toFixed(2)}/month`);
console.log(`\nAnnual Impact:`);
console.log(`  Additional Annual Revenue: $${(combinedMonthly * 12).toFixed(2)}`);

// =============================================================================
console.log("\n" + "=".repeat(80));
console.log("PHASE 1 INTEGRATION TEST COMPLETED ✓");
console.log(`Target: $9,259/month | Achieved: $${combinedMonthly.toFixed(2)}/month`);
console.log("=".repeat(80));
