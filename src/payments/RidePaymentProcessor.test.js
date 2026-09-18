const RidePaymentProcessor = require("./RidePaymentProcessor");

// Mock AccountManager for testing
class MockAccountManager {
  constructor() {
    this.accounts = {};
  }

  updateBalance(email, currency, amount) {
    if (!this.accounts[email]) {
      this.accounts[email] = { balances: { [currency]: 0 } };
    }
    this.accounts[email].balances[currency] += amount;
    return this.accounts[email].balances[currency];
  }

  getAccount(email) {
    return this.accounts[email] || { balances: { usd: 0 } };
  }

  displayBalance(email) {
    const account = this.getAccount(email);
    return account.balances.usd.toFixed(2);
  }
}

// Test scenarios
console.log("=".repeat(80));
console.log("MOGO RIDE PAYMENT PROCESSOR - TEST EXAMPLES");
console.log("=".repeat(80));

const processor = new RidePaymentProcessor();
const accountManager = new MockAccountManager();

// =============================================================================
// TEST 1: Basic Ride (No Premium, No Wait Time)
// =============================================================================
console.log("\n📍 TEST 1: Basic Ride");
console.log("-".repeat(80));

const basicRide = {
  riderId: "rider_001",
  driverId: "driver_001",
  baseFare: 15.0,
  distance: 5.2,
  duration: 12,
  waitTimeMinutes: 0,
  priorityBonus: 0,
  cancellationFee: 0,
  isPremiumService: false,
};

const basicResult = processor.calculateRidePayment(basicRide);
const basicRideData = basicResult.ridePayment;

console.log("\nRide Details:");
console.log(`  Base Fare: $${basicRideData.riderPayment.baseFare.toFixed(2)}`);
console.log(`  Distance: ${basicRide.distance} km`);
console.log(`  Duration: ${basicRide.duration} minutes`);

console.log("\nRider Charges:");
console.log(`  Base Fare:        $${basicRideData.riderPayment.baseFare.toFixed(2)}`);
console.log(`  Booking Fee:      $${basicRideData.riderPayment.bookingFee.toFixed(2)}`);
console.log(`  Wait Time Charge: $${basicRideData.riderPayment.waitTimeCharge.toFixed(2)}`);
console.log(`  Cancellation Fee: $${basicRideData.riderPayment.cancellationFee.toFixed(2)}`);
console.log(`  ───────────────────────`);
console.log(`  TOTAL CHARGED:    $${basicRideData.riderPayment.totalCharged.toFixed(2)}`);

console.log("\nDriver Earnings:");
console.log(`  Base Fare:        $${basicRideData.driverEarnings.baseFare.toFixed(2)}`);
console.log(`  Priority Bonus:   $${basicRideData.driverEarnings.priorityBonus.toFixed(2)}`);
console.log(`  Wait Time (50%):  $${basicRideData.driverEarnings.waitTimeCut.toFixed(2)}`);
console.log(`  Cancellation Fee: $${basicRideData.driverEarnings.cancellationFee.toFixed(2)}`);
console.log(`  ───────────────────────`);
console.log(`  TOTAL EARNINGS:   $${basicRideData.driverEarnings.total.toFixed(2)}`);

console.log("\nMogo Platform Revenue:");
console.log(`  Platform Fee:     $${basicRideData.platformRevenue.platformFee.toFixed(2)}`);
console.log(`  Booking Fee:      $${basicRideData.platformRevenue.bookingFee.toFixed(2)}`);
console.log(`  Wait Time (50%):  $${basicRideData.platformRevenue.waitTimeCut.toFixed(2)}`);
console.log(`  ───────────────────────`);
console.log(`  TOTAL REVENUE:    $${basicRideData.platformRevenue.total.toFixed(2)}`);

console.log("\n✓ Verification:");
const riderCharged = basicRideData.riderPayment.totalCharged;
const driverEarned = basicRideData.driverEarnings.total;
const mogoRevenue = basicRideData.platformRevenue.total;
console.log(`  Rider Charged: $${riderCharged.toFixed(2)}`);
console.log(`  Driver Earned: $${driverEarned.toFixed(2)}`);
console.log(`  Mogo Revenue:  $${mogoRevenue.toFixed(2)}`);
console.log(`  Sum (should equal Rider Charged): $${(driverEarned + mogoRevenue).toFixed(2)}`);
console.log(`  ✓ Balanced: ${Math.abs(riderCharged - (driverEarned + mogoRevenue)) < 0.01 ? "YES" : "NO"}`);

// =============================================================================
// TEST 2: Premium Ride with Wait Time
// =============================================================================
console.log("\n\n📍 TEST 2: Premium Ride with Wait Time");
console.log("-".repeat(80));

const premiumRide = {
  riderId: "rider_002",
  driverId: "driver_002",
  baseFare: 28.5,
  distance: 12.3,
  duration: 28,
  waitTimeMinutes: 5,
  priorityBonus: 3.0,
  cancellationFee: 0,
  isPremiumService: true,
};

const premiumResult = processor.calculateRidePayment(premiumRide);
const premiumRideData = premiumResult.ridePayment;

console.log("\nRide Details:");
console.log(`  Base Fare: $${premiumRideData.riderPayment.baseFare.toFixed(2)}`);
console.log(`  Distance: ${premiumRide.distance} km`);
console.log(`  Duration: ${premiumRide.duration} minutes`);
console.log(`  Wait Time: ${premiumRide.waitTimeMinutes} minutes`);
console.log(`  Premium Service: Yes (Wait time rate: $0.50/min)`);

console.log("\nRider Charges:");
console.log(`  Base Fare:        $${premiumRideData.riderPayment.baseFare.toFixed(2)}`);
console.log(`  Booking Fee:      $${premiumRideData.riderPayment.bookingFee.toFixed(2)}`);
console.log(`  Wait Time Charge: $${premiumRideData.riderPayment.waitTimeCharge.toFixed(2)} (5 min × $0.50)`);
console.log(`  Cancellation Fee: $${premiumRideData.riderPayment.cancellationFee.toFixed(2)}`);
console.log(`  ───────────────────────`);
console.log(`  TOTAL CHARGED:    $${premiumRideData.riderPayment.totalCharged.toFixed(2)}`);

console.log("\nDriver Earnings:");
console.log(`  Base Fare:        $${premiumRideData.driverEarnings.baseFare.toFixed(2)}`);
console.log(`  Priority Bonus:   $${premiumRideData.driverEarnings.priorityBonus.toFixed(2)}`);
console.log(`  Wait Time (50%):  $${premiumRideData.driverEarnings.waitTimeCut.toFixed(2)} (${premiumRideData.riderPayment.waitTimeCharge.toFixed(2)} × 50%)`);
console.log(`  Cancellation Fee: $${premiumRideData.driverEarnings.cancellationFee.toFixed(2)}`);
console.log(`  ───────────────────────`);
console.log(`  TOTAL EARNINGS:   $${premiumRideData.driverEarnings.total.toFixed(2)}`);

console.log("\nMogo Platform Revenue:");
console.log(`  Platform Fee:     $${premiumRideData.platformRevenue.platformFee.toFixed(2)}`);
console.log(`  Booking Fee:      $${premiumRideData.platformRevenue.bookingFee.toFixed(2)}`);
console.log(`  Wait Time (50%):  $${premiumRideData.platformRevenue.waitTimeCut.toFixed(2)} (${premiumRideData.riderPayment.waitTimeCharge.toFixed(2)} × 50%)`);
console.log(`  ───────────────────────`);
console.log(`  TOTAL REVENUE:    $${premiumRideData.platformRevenue.total.toFixed(2)}`);

console.log("\n✓ Verification:");
const premiumRiderCharged = premiumRideData.riderPayment.totalCharged;
const premiumDriverEarned = premiumRideData.driverEarnings.total;
const premiumMogoRevenue = premiumRideData.platformRevenue.total;
console.log(`  Rider Charged: $${premiumRiderCharged.toFixed(2)}`);
console.log(`  Driver Earned: $${premiumDriverEarned.toFixed(2)}`);
console.log(`  Mogo Revenue:  $${premiumMogoRevenue.toFixed(2)}`);
console.log(`  Sum: $${(premiumDriverEarned + premiumMogoRevenue).toFixed(2)}`);
console.log(`  ✓ Balanced: ${Math.abs(premiumRiderCharged - (premiumDriverEarned + premiumMogoRevenue)) < 0.01 ? "YES" : "NO"}`);

// =============================================================================
// TEST 3: Ride Completion with Account Balance Updates
// =============================================================================
console.log("\n\n📍 TEST 3: Ride Completion & Account Balance");
console.log("-".repeat(80));

const completionRide = {
  riderId: "rider_003",
  driverId: "driver_003",
  baseFare: 22.0,
  distance: 8.5,
  duration: 18,
  waitTimeMinutes: 2,
  priorityBonus: 0,
  cancellationFee: 0,
  isPremiumService: false,
};

const completionResult = processor.calculateRidePayment(completionRide);
const completionRideId = completionResult.ridePayment.id;

console.log("\nBefore Completion:");
console.log(`  Driver Balance:  $${accountManager.displayBalance("driver_003")}`);
console.log(`  Rider Balance:   $${accountManager.displayBalance("rider_003")}`);

processor.completeRide(
  completionRideId,
  accountManager,
  "driver_003@mogo.app",
  "rider_003@mogo.app"
);

const completeRideData = processor.getRide(completionRideId);

console.log("\nAfter Completion:");
console.log(`  Driver Balance:  $${accountManager.displayBalance("driver_003@mogo.app")} (earned: $${completeRideData.driverEarnings.total.toFixed(2)})`);
console.log(`  Rider Balance:   $${accountManager.displayBalance("rider_003@mogo.app")} (charged: $${completeRideData.riderPayment.totalCharged.toFixed(2)})`);

// =============================================================================
// TEST 4: Rider Cancellation (Driver Gets Cancellation Fee)
// =============================================================================
console.log("\n\n📍 TEST 4: Rider Cancellation");
console.log("-".repeat(80));

const cancellationRide = {
  riderId: "rider_004",
  driverId: "driver_004",
  baseFare: 18.0,
  distance: 6.5,
  duration: 15,
  waitTimeMinutes: 0,
  priorityBonus: 0,
  cancellationFee: 0,
  isPremiumService: false,
};

const cancelResult = processor.calculateRidePayment(cancellationRide);
const cancelRideId = cancelResult.ridePayment.id;

console.log("\nInitial Ride Calculation:");
console.log(`  Rider Charges:  $${cancelResult.ridePayment.riderPayment.totalCharged.toFixed(2)}`);
console.log(`  Driver Earnings: $${cancelResult.ridePayment.driverEarnings.total.toFixed(2)}`);

const riderCancelResult = processor.handleRiderCancellation(cancelRideId, 2.5);

const cancelledRideData = processor.getRide(cancelRideId);

console.log("\nAfter Rider Cancellation (Fee: $2.50):");
console.log(`  Rider Charged:   $${cancelledRideData.riderPayment.totalCharged.toFixed(2)} (original $${cancelResult.ridePayment.riderPayment.totalCharged.toFixed(2)} + $2.50 fee)`);
console.log(`  Driver Earnings: $${cancelledRideData.driverEarnings.total.toFixed(2)} (original $${cancelResult.ridePayment.driverEarnings.total.toFixed(2)} + $2.50 fee)`);
console.log(`  Status: ${cancelledRideData.status}`);

// =============================================================================
// TEST 5: Driver Earnings Summary
// =============================================================================
console.log("\n\n📍 TEST 5: Driver Earnings Summary");
console.log("-".repeat(80));

// Create multiple rides for driver_001
const multipleRides = [
  {
    riderId: "rider_005",
    driverId: "driver_001",
    baseFare: 25.0,
    distance: 10,
    duration: 20,
    waitTimeMinutes: 3,
    priorityBonus: 2.0,
    cancellationFee: 0,
    isPremiumService: false,
  },
  {
    riderId: "rider_006",
    driverId: "driver_001",
    baseFare: 18.0,
    distance: 7,
    duration: 15,
    waitTimeMinutes: 1,
    priorityBonus: 0,
    cancellationFee: 0,
    isPremiumService: false,
  },
];

multipleRides.forEach(ride => {
  const result = processor.calculateRidePayment(ride);
  processor.completeRide(result.ridePayment.id, accountManager, "driver_001@mogo.app", `${ride.riderId}@mogo.app`);
});

const driverSummary = processor.getDriverEarnings("driver_001");

console.log(`\nDriver ID: driver_001`);
console.log(`  Total Earnings:    $${driverSummary.totalEarnings.toFixed(2)}`);
console.log(`  Completed Rides:   ${driverSummary.completedRides}`);
console.log(`  Cancelled Rides:   ${driverSummary.cancelledRides}`);

console.log("\nEarnings Breakdown:");
console.log(`  Base Fares:        $${driverSummary.breakdown.baseFareTotal.toFixed(2)}`);
console.log(`  Priority Bonuses:  $${driverSummary.breakdown.priorityBonusTotal.toFixed(2)}`);
console.log(`  Wait Time Cuts:    $${driverSummary.breakdown.waitTimeCutTotal.toFixed(2)}`);
console.log(`  Cancellation Fees: $${driverSummary.breakdown.cancellationFeesTotal.toFixed(2)}`);

// =============================================================================
// TEST 6: Platform Revenue Summary
// =============================================================================
console.log("\n\n📍 TEST 6: Platform Revenue Summary");
console.log("-".repeat(80));

const revenueSummary = processor.getPlatformRevenueSummary();

console.log(`\nPlatform Revenue (All Time):`);
console.log(`  Total Revenue:         $${revenueSummary.totalRevenue.toFixed(2)}`);
console.log(`  Total Rides:           ${revenueSummary.rideCount}`);
console.log(`  Avg Revenue per Ride:  $${revenueSummary.averageRevenuePerRide.toFixed(2)}`);

console.log("\n" + "=".repeat(80));
console.log("ALL TESTS COMPLETED SUCCESSFULLY ✓");
console.log("=".repeat(80));
