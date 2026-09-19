/**
 * PLATFORM FEE ADJUSTMENT
 * Implements customer-side fee increases for mogo revenue
 *
 * Adds $0.25 to platform fee per ride
 * Adds $0.25 to booking fee per ride
 * Total: $0.50 per ride = 100% mogo revenue
 *
 * Generates pure profit: $627.50/month (1,254 rides × $0.50)
 * No driver impact whatsoever
 */

class PlatformFeeAdjustment {
  constructor() {
    this.adjustments = {
      platformFeeIncrease: 0.25,  // $0.25 additional platform fee
      bookingFeeIncrease: 0.25,   // $0.25 additional booking fee
    };
    this.adjustmentHistory = [];
  }

  /**
   * Calculate total adjustment for a single ride
   */
  calculateAdjustmentForRide(rideId) {
    const totalAdjustment =
      this.adjustments.platformFeeIncrease +
      this.adjustments.bookingFeeIncrease;

    const adjustment = {
      rideId,
      timestamp: new Date(),
      platformFeeIncrease: this.adjustments.platformFeeIncrease,
      bookingFeeIncrease: this.adjustments.bookingFeeIncrease,
      totalAdjustment: totalAdjustment,
      mogoRevenue: totalAdjustment,
      driverImpact: false, // Zero impact on driver earnings
    };

    this.adjustmentHistory.push(adjustment);

    return adjustment;
  }

  /**
   * Apply adjustment to rider payment
   * Increases what rider pays (visible as fee increase)
   */
  applyAdjustmentToRide(riderPayment) {
    const platformIncrease = this.adjustments.platformFeeIncrease;
    const bookingIncrease = this.adjustments.bookingFeeIncrease;
    const totalAdjustment = platformIncrease + bookingIncrease;

    return {
      originalPayment: riderPayment,
      platformFeeIncrease: platformIncrease,
      bookingFeeIncrease: bookingIncrease,
      totalIncrease: totalAdjustment,
      adjustedPayment: riderPayment + totalAdjustment,
      mogoRevenue: totalAdjustment,
      breakdown: {
        platform: `${platformIncrease.toFixed(2)} (platform fee)`,
        booking: `${bookingIncrease.toFixed(2)} (booking fee)`,
      },
    };
  }

  /**
   * Calculate monthly fee adjustment revenue
   * 1,254 rides × $0.50 per ride = $627.50/month
   */
  calculateMonthlyAdjustmentRevenue(ridesPerMonth = 1254) {
    const totalAdjustmentPerRide =
      this.adjustments.platformFeeIncrease +
      this.adjustments.bookingFeeIncrease;

    const monthlyRevenue = ridesPerMonth * totalAdjustmentPerRide;

    return {
      ridesPerMonth,
      platformFeeIncreasePerRide: this.adjustments.platformFeeIncrease.toFixed(2),
      bookingFeeIncreasePerRide: this.adjustments.bookingFeeIncrease.toFixed(2),
      totalAdjustmentPerRide: totalAdjustmentPerRide.toFixed(2),
      monthlyRevenue: monthlyRevenue.toFixed(2),
      annualRevenue: (monthlyRevenue * 12).toFixed(2),
      estimatedRidersAffected: ridesPerMonth,
    };
  }

  /**
   * Get adjustment statistics
   */
  getAdjustmentStats() {
    if (this.adjustmentHistory.length === 0) {
      return {
        totalAdjustmentsApplied: 0,
        totalMonthlyRevenue: 0,
        averageAdjustmentPerRide: 0,
      };
    }

    const totalRevenue = this.adjustmentHistory.reduce(
      (sum, adj) => sum + adj.totalAdjustment,
      0
    );

    return {
      totalAdjustmentsApplied: this.adjustmentHistory.length,
      totalRevenue: totalRevenue.toFixed(2),
      averageAdjustmentPerRide: (totalRevenue / this.adjustmentHistory.length).toFixed(2),
      projectedMonthly: ((totalRevenue / this.adjustmentHistory.length) * 1254).toFixed(2),
    };
  }

  /**
   * Update adjustment amounts (if fees need to change)
   */
  updateAdjustments(platformIncrease, bookingIncrease) {
    this.adjustments.platformFeeIncrease = platformIncrease;
    this.adjustments.bookingFeeIncrease = bookingIncrease;

    return {
      platformFeeIncrease: platformIncrease.toFixed(2),
      bookingFeeIncrease: bookingIncrease.toFixed(2),
      totalPerRide: (platformIncrease + bookingIncrease).toFixed(2),
      message: 'Fee adjustments updated successfully',
    };
  }

  /**
   * Clear adjustment history
   */
  clearHistory() {
    this.adjustmentHistory = [];
  }

  /**
   * Get adjustments by date range
   */
  getAdjustmentsByDateRange(startDate, endDate) {
    return this.adjustmentHistory.filter(adj => {
      const adjDate = new Date(adj.timestamp);
      return adjDate >= startDate && adjDate <= endDate;
    });
  }

  /**
   * Calculate impact on average ride cost
   */
  calculateRiderImpact() {
    const averageRideCost = 25.00; // Typical ride in the system
    const totalAdjustment =
      this.adjustments.platformFeeIncrease +
      this.adjustments.bookingFeeIncrease;
    const percentageIncrease = (totalAdjustment / averageRideCost) * 100;

    return {
      averageRideCost: averageRideCost.toFixed(2),
      totalAdjustment: totalAdjustment.toFixed(2),
      percentageIncrease: percentageIncrease.toFixed(2),
      newAverageCost: (averageRideCost + totalAdjustment).toFixed(2),
      message: `Rider cost increases by $${totalAdjustment.toFixed(2)} (${percentageIncrease.toFixed(1)}%)`,
    };
  }
}

module.exports = PlatformFeeAdjustment;
