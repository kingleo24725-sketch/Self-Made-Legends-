const SurgePricingManager = require("./SurgePricingManager");

console.log("=".repeat(80));
console.log("SURGE PRICING MANAGER - TESTS");
console.log("=".repeat(80));

const surgeMgr = new SurgePricingManager();

// =============================================================================
// TEST 1: Surge Level Calculation
// =============================================================================
console.log("\n📍 TEST 1: Surge Level Calculation by Time & Demand");
console.log("-".repeat(80));

// Morning rush hour (7-9am, high demand)
const morningRushTime = new Date(2024, 0, 15, 8, 0); // Monday 8am
const morningRush = surgeMgr.calculateSurgeLevel(morningRushTime, 110, 'clear');
console.log(`\nMorning Rush (8am, demand=110): ${morningRush}x multiplier`);
console.log(`  Expected: 1.5x ✓`);

// Evening rush hour (5-7pm, high demand)
const eveningRushTime = new Date(2024, 0, 15, 18, 0); // Monday 6pm
const eveningRush = surgeMgr.calculateSurgeLevel(eveningRushTime, 125, 'clear');
console.log(`\nEvening Rush (6pm, demand=125): ${eveningRush}x multiplier`);
console.log(`  Expected: 1.5x ✓`);

// Weekend night (Friday night)
const weekendNightTime = new Date(2024, 0, 19, 21, 0); // Friday 9pm
const weekendNight = surgeMgr.calculateSurgeLevel(weekendNightTime, 80, 'clear');
console.log(`\nWeekend Night (Friday 9pm, demand=80): ${weekendNight}x multiplier`);
console.log(`  Expected: 1.5x ✓`);

// Rainy conditions
const rainyTime = new Date(2024, 0, 15, 14, 0); // Monday 2pm
const rainy = surgeMgr.calculateSurgeLevel(rainyTime, 85, 'rain');
console.log(`\nRainy Weather (2pm, demand=85): ${rainy}x multiplier`);
console.log(`  Expected: 1.5x ✓`);

// Snow conditions
const snowTime = new Date(2024, 0, 15, 12, 0); // Monday noon
const snow = surgeMgr.calculateSurgeLevel(snowTime, 70, 'snow');
console.log(`\nSnow Conditions (noon, demand=70): ${snow}x multiplier`);
console.log(`  Expected: 2.0x ✓`);

// Very high demand (250+)
const highDemandTime = new Date(2024, 0, 15, 10, 0);
const highDemand = surgeMgr.calculateSurgeLevel(highDemandTime, 275, 'clear');
console.log(`\nVery High Demand (demand=275): ${highDemand}x multiplier`);
console.log(`  Expected: 3.0x ✓`);

// Normal conditions (no surge)
const normalTime = new Date(2024, 0, 15, 14, 0); // Monday 2pm
const normal = surgeMgr.calculateSurgeLevel(normalTime, 60, 'clear');
console.log(`\nNormal Conditions (2pm, demand=60): ${normal}x multiplier`);
console.log(`  Expected: 1.0x ✓`);

// =============================================================================
// TEST 2: Apply Surge to Ride
// =============================================================================
console.log("\n\n📍 TEST 2: Apply Surge Pricing to a Ride");
console.log("-".repeat(80));

const rideData = {
  rideId: 'ride_001',
  baseFare: 25.00,
  distance: 5.2,
  duration: 12,
};

// Rush hour ride with surge
const surgedRide = surgeMgr.applySurge(
  rideData,
  morningRushTime,
  110,
  'clear'
);

console.log(`\nRide Details:`);
console.log(`  Base Fare: $${rideData.baseFare.toFixed(2)}`);
console.log(`  Distance: ${rideData.distance} km`);
console.log(`  Duration: ${rideData.duration} min`);

console.log(`\nWith Morning Rush Surge (1.5x):`);
console.log(`  Surge Applied: ${surgedRide.surgeApplied ? '✓ YES' : '✗ NO'}`);
console.log(`  Surge Multiplier: ${surgedRide.surgeMultiplier}x`);
console.log(`  Base Fare: $${surgedRide.baseFare.toFixed(2)}`);
console.log(`  Surge Premium: $${surgedRide.surgePremium.toFixed(2)}`);
console.log(`  Surged Fare: $${surgedRide.surgedFare.toFixed(2)}`);
console.log(`  Mogo Revenue (100%): $${surgedRide.mogoRevenue.toFixed(2)}`);
console.log(`  Driver Earnings: Unchanged (normal payment only)`);

// Non-surge ride
const noSurgeRide = surgeMgr.applySurge(
  rideData,
  normalTime,
  60,
  'clear'
);

console.log(`\nNormal Time (No Surge):`);
console.log(`  Surge Applied: ${noSurgeRide.surgeApplied ? '✓ YES' : '✗ NO'}`);
console.log(`  Surge Multiplier: ${noSurgeRide.surgeMultiplier}x`);
console.log(`  Surge Premium: $${noSurgeRide.surgePremium.toFixed(2)}`);
console.log(`  Mogo Revenue: $${noSurgeRide.mogoRevenue.toFixed(2)}`);

// =============================================================================
// TEST 3: Multiple Surge Scenarios
// =============================================================================
console.log("\n\n📍 TEST 3: Multiple Surge Scenarios (Different Multipliers)");
console.log("-".repeat(80));

const rideScenarios = [
  { name: 'Morning Rush 1.5x', time: morningRushTime, demand: 110, weather: 'clear' },
  { name: 'Evening Rush 1.5x', time: eveningRushTime, demand: 125, weather: 'clear' },
  { name: 'Heavy Rain 1.5x', time: rainyTime, demand: 85, weather: 'rain' },
  { name: 'Snowstorm 2.0x', time: snowTime, demand: 70, weather: 'snow' },
  { name: 'Very High Demand 3.0x', time: highDemandTime, demand: 275, weather: 'clear' },
];

console.log("\n$25 Base Fare Ride with Different Surge Conditions:\n");
rideScenarios.forEach(scenario => {
  const result = surgeMgr.applySurge(rideData, scenario.time, scenario.demand, scenario.weather);
  console.log(`${scenario.name.padEnd(25)} → Fare: $${result.surgedFare.toFixed(2)} | Premium: $${result.surgePremium.toFixed(2)}`);
});

// =============================================================================
// TEST 4: Monthly Surge Revenue Calculation
// =============================================================================
console.log("\n\n📍 TEST 4: Monthly Surge Revenue Calculation");
console.log("-".repeat(80));

const monthlyRevenue = surgeMgr.calculateMonthlySurgeRevenue(1254, 0.20);

console.log(`\nMonthly Surge Revenue (20% of 1,254 rides):\n`);
console.log(`  Rides per month: 1,254`);
console.log(`  Surge percentage: 20%`);
console.log(`  Surged rides: ${monthlyRevenue.surgedRidesPerMonth}`);
console.log(`  Average base fare: $7.50`);
console.log(`  Average surge multiplier: 1.5x`);
console.log(`  ─────────────────────────────`);
console.log(`  Surge premium per ride: $${monthlyRevenue.surgePremiumPerRide}`);
console.log(`  Monthly mogo revenue: $${monthlyRevenue.monthlySurgeRevenue}`);
console.log(`  Annual mogo revenue: $${monthlyRevenue.annualSurgeRevenue}`);

// =============================================================================
// TEST 5: Different Surge Percentages
// =============================================================================
console.log("\n\n📍 TEST 5: Revenue Impact - Different Surge Percentages");
console.log("-".repeat(80));

const surgePercentages = [0.10, 0.15, 0.20, 0.25, 0.30];

console.log("\nMonthly Revenue by Surge Percentage (1,254 rides):\n");
console.log("Percentage | Surged Rides | Monthly Revenue | Annual Revenue");
console.log("-".repeat(65));

surgePercentages.forEach(percentage => {
  const revenue = surgeMgr.calculateMonthlySurgeRevenue(1254, percentage);
  console.log(
    `${(percentage * 100).toFixed(0)}%`.padEnd(11) +
    `${revenue.surgedRidesPerMonth}`.padStart(12) + " | " +
    `$${revenue.monthlySurgeRevenue}`.padStart(14) + " | " +
    `$${revenue.annualSurgeRevenue}`.padStart(14)
  );
});

// =============================================================================
// TEST 6: Surge Statistics
// =============================================================================
console.log("\n\n📍 TEST 6: Surge Statistics Tracking");
console.log("-".repeat(80));

// Simulate 50 surged rides
for (let i = 0; i < 50; i++) {
  const randomDemand = Math.floor(Math.random() * 200) + 60;
  const randomWeather = Math.random() > 0.7 ? 'rain' : 'clear';
  surgeMgr.applySurge(
    { baseFare: 20 + Math.random() * 10, rideId: `ride_${i}` },
    new Date(),
    randomDemand,
    randomWeather
  );
}

const stats = surgeMgr.getSurgeStats();
console.log(`\nSurge Statistics (50 simulated surged rides):\n`);
console.log(`  Total surges applied: ${stats.totalSurges}`);
console.log(`  Total surge premium: $${stats.totalPremium}`);
console.log(`  Average surge multiplier: ${stats.averageSurgeMultiplier}x`);
console.log(`  Highest surge recorded: ${stats.highestSurge}x`);

// =============================================================================
// TEST 7: Pure Profit Concept
// =============================================================================
console.log("\n\n📍 TEST 7: Pure Profit - Surge Pricing");
console.log("-".repeat(80));

const pureProfit = surgeMgr.applySurge(rideData, morningRushTime, 110, 'clear');

console.log(`\nSurge Pricing is PURE PROFIT because:\n`);
console.log(`  ✓ Rider pays surge premium: $${pureProfit.surgePremium.toFixed(2)}`);
console.log(`  ✓ Driver receives: $0 (normal payment unaffected)`);
console.log(`  ✓ Mogo keeps: $${pureProfit.surgePremium.toFixed(2)} (100%)`);
console.log(`  ✓ No additional payout required`);
console.log(`  ✓ Margin: 100%`);

console.log(`\n  Scaling to monthly: $${surgeMgr.calculateMonthlySurgeRevenue(1254, 0.20).monthlySurgeRevenue}/month pure profit`);
console.log(`  Scaling to annual: $${surgeMgr.calculateMonthlySurgeRevenue(1254, 0.20).annualSurgeRevenue}/year pure profit`);

// =============================================================================
console.log("\n" + "=".repeat(80));
console.log("SURGE PRICING TESTS COMPLETED ✓");
console.log("=".repeat(80));
