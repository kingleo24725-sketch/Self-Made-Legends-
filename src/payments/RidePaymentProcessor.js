const crypto = require("crypto");

class RidePaymentProcessor {
  constructor() {
    this.rides = [];
    this.driverEarnings = {}; // Tracks driver earnings
    this.platformRevenue = {}; // Tracks mogo platform revenue
  }

  // Fee structure constants
  static FEES = {
    PLATFORM_FEE: 2.75,
    BOOKING_FEE: 4.75,
    WAIT_TIME_SPLIT: 0.5, // 50% to driver, 50% to mogo
  };

  /**
   * Calculate ride payment breakdown
   * Rider pays upfront for base fare, fees, and any add-ons
   */
  calculateRidePayment(rideData) {
    const {
      riderId,
      driverId,
      baseFare,
      distance,
      duration,
      waitTimeMinutes = 0,
      priorityBonus = 0,
      cancellationFee = 0,
      isPremiumService = false,
    } = rideData;

    if (!baseFare || baseFare < 0) {
      return { success: false, error: "Invalid base fare" };
    }

    // Calculate wait time charges (if applicable)
    const waitTimeRate = isPremiumService ? 0.5 : 0.35; // dollars per minute
    const waitTimeCharge = waitTimeMinutes * waitTimeRate;

    // Total charged to rider upfront
    const totalRiderPay =
      baseFare + RidePaymentProcessor.FEES.BOOKING_FEE + waitTimeCharge;

    // Fee distribution
    const platformFee = RidePaymentProcessor.FEES.PLATFORM_FEE;
    const bookingFee = RidePaymentProcessor.FEES.BOOKING_FEE; // Goes to mogo

    // Wait time split 50/50
    const driverWaitTimeCut = waitTimeCharge * RidePaymentProcessor.FEES.WAIT_TIME_SPLIT;
    const mogoWaitTimeCut = waitTimeCharge * RidePaymentProcessor.FEES.WAIT_TIME_SPLIT;

    // Driver earnings calculation
    const driverBase = baseFare; // Driver gets full base fare
    const driverTotal = driverBase + driverWaitTimeCut + priorityBonus;

    // Mogo platform revenue
    const mogoTotal = platformFee + bookingFee + mogoWaitTimeCut;

    // Cancellation fee handling - goes to driver if rider cancels, or taken from driver if driver cancels
    let finalDriverPay = driverTotal;
    let finalMogoRevenue = mogoTotal;

    if (cancellationFee > 0) {
      // Cancellation fee goes to driver from rider payment
      finalDriverPay += cancellationFee;
    }

    const rideId = crypto.randomBytes(16).toString("hex");

    const ridePayment = {
      id: rideId,
      riderId,
      driverId,
      status: "pending",
      createdAt: new Date(),
      completedAt: null,

      // Rider payment
      riderPayment: {
        baseFare: parseFloat(baseFare.toFixed(2)),
        bookingFee: parseFloat(bookingFee.toFixed(2)),
        waitTimeCharge: parseFloat(waitTimeCharge.toFixed(2)),
        cancellationFee: parseFloat(cancellationFee.toFixed(2)),
        totalCharged: parseFloat((totalRiderPay + cancellationFee).toFixed(2)),
      },

      // Driver earnings breakdown
      driverEarnings: {
        baseFare: parseFloat(driverBase.toFixed(2)),
        priorityBonus: parseFloat(priorityBonus.toFixed(2)),
        waitTimeCut: parseFloat(driverWaitTimeCut.toFixed(2)),
        cancellationFee: parseFloat(cancellationFee.toFixed(2)),
        total: parseFloat(finalDriverPay.toFixed(2)),
      },

      // Mogo platform revenue breakdown
      platformRevenue: {
        platformFee: parseFloat(platformFee.toFixed(2)),
        bookingFee: parseFloat(bookingFee.toFixed(2)),
        waitTimeCut: parseFloat(mogoWaitTimeCut.toFixed(2)),
        total: parseFloat(finalMogoRevenue.toFixed(2)),
      },

      // Ride metadata
      rideMetadata: {
        distance,
        duration,
        waitTimeMinutes,
        isPremiumService,
      },
    };

    this.rides.push(ridePayment);
    return { success: true, ridePayment };
  }

  /**
   * Process ride payment when completed
   */
  completeRide(rideId, accountManager, driverEmail, riderEmail) {
    const ride = this.rides.find(r => r.id === rideId);
    if (!ride) {
      return { success: false, error: "Ride not found" };
    }

    if (ride.status === "completed") {
      return { success: false, error: "Ride already completed" };
    }

    ride.status = "completed";
    ride.completedAt = new Date();

    // Credit driver earnings
    accountManager.updateBalance(driverEmail, "usd", ride.driverEarnings.total);

    // Debit rider payment
    accountManager.updateBalance(riderEmail, "usd", -ride.riderPayment.totalCharged);

    // Record platform revenue
    this.recordPlatformRevenue(ride.platformRevenue.total, rideId);

    return {
      success: true,
      message: "Ride payment processed successfully",
      driverEarnings: ride.driverEarnings.total,
      riderCharged: ride.riderPayment.totalCharged,
      platformRevenue: ride.platformRevenue.total,
    };
  }

  /**
   * Handle driver cancellation
   * Driver loses part of their earnings when they cancel
   */
  handleDriverCancellation(rideId, cancellationPenalty = 5) {
    const ride = this.rides.find(r => r.id === rideId);
    if (!ride || ride.status !== "pending") {
      return { success: false, error: "Cannot cancel this ride" };
    }

    ride.status = "cancelled";
    ride.cancellationReason = "driver_cancelled";

    // Adjust driver earnings - apply penalty
    const updatedDriverTotal = Math.max(
      0,
      ride.driverEarnings.total - cancellationPenalty
    );
    ride.driverEarnings.total = updatedDriverTotal;
    ride.driverEarnings.cancellationPenalty = cancellationPenalty;

    return {
      success: true,
      message: "Ride cancelled by driver",
      driverEarnings: updatedDriverTotal,
      penalty: cancellationPenalty,
    };
  }

  /**
   * Handle rider cancellation
   * Rider pays cancellation fee, driver gets it
   */
  handleRiderCancellation(rideId, cancellationFee = 2.5) {
    const ride = this.rides.find(r => r.id === rideId);
    if (!ride || ride.status !== "pending") {
      return { success: false, error: "Cannot cancel this ride" };
    }

    ride.status = "cancelled";
    ride.cancellationReason = "rider_cancelled";

    // Add cancellation fee to driver earnings (rider pays upfront)
    const updatedDriverTotal =
      ride.driverEarnings.total + cancellationFee;
    ride.driverEarnings.total = updatedDriverTotal;
    ride.driverEarnings.cancellationFee = cancellationFee;

    // Add cancellation fee to rider charge
    ride.riderPayment.totalCharged += cancellationFee;

    return {
      success: true,
      message: "Ride cancelled by rider",
      cancellationFee: cancellationFee,
      driverEarnings: updatedDriverTotal,
    };
  }

  /**
   * Record platform revenue for accounting
   */
  recordPlatformRevenue(amount, rideId) {
    const date = new Date().toISOString().split("T")[0];
    if (!this.platformRevenue[date]) {
      this.platformRevenue[date] = { total: 0, rides: [] };
    }
    this.platformRevenue[date].total += amount;
    this.platformRevenue[date].rides.push(rideId);
  }

  /**
   * Get driver earnings summary
   */
  getDriverEarnings(driverId) {
    const driverRides = this.rides.filter(r => r.driverId === driverId);

    const summary = {
      totalEarnings: 0,
      totalRides: driverRides.length,
      completedRides: 0,
      cancelledRides: 0,
      breakdown: {
        baseFareTotal: 0,
        priorityBonusTotal: 0,
        waitTimeCutTotal: 0,
        cancellationFeesTotal: 0,
      },
      rides: driverRides,
    };

    driverRides.forEach(ride => {
      if (ride.status === "completed") {
        summary.completedRides++;
        summary.totalEarnings += ride.driverEarnings.total;
        summary.breakdown.baseFareTotal += ride.driverEarnings.baseFare;
        summary.breakdown.priorityBonusTotal += ride.driverEarnings.priorityBonus;
        summary.breakdown.waitTimeCutTotal += ride.driverEarnings.waitTimeCut;
        summary.breakdown.cancellationFeesTotal +=
          ride.driverEarnings.cancellationFee || 0;
      } else if (ride.status === "cancelled") {
        summary.cancelledRides++;
      }
    });

    return summary;
  }

  /**
   * Get platform revenue summary
   */
  getPlatformRevenueSummary(startDate = null, endDate = null) {
    let totalRevenue = 0;
    let rideCount = 0;

    Object.entries(this.platformRevenue).forEach(([date, data]) => {
      if (!startDate || new Date(date) >= startDate) {
        if (!endDate || new Date(date) <= endDate) {
          totalRevenue += data.total;
          rideCount += data.rides.length;
        }
      }
    });

    return {
      totalRevenue: parseFloat(totalRevenue.toFixed(2)),
      rideCount,
      averageRevenuePerRide:
        rideCount > 0
          ? parseFloat((totalRevenue / rideCount).toFixed(2))
          : 0,
    };
  }

  /**
   * Get ride details
   */
  getRide(rideId) {
    return this.rides.find(r => r.id === rideId);
  }

  /**
   * Get all rides for a rider
   */
  getRiderRides(riderId, limit = 50) {
    return this.rides
      .filter(r => r.riderId === riderId)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit);
  }
}

module.exports = RidePaymentProcessor;
