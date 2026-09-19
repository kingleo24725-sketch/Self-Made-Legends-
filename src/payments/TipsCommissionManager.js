/**
 * TIPS COMMISSION MANAGER
 * Processes tip revenue with mogo taking a commission upfront
 *
 * Mogo takes 30% of all tips as "payment processing fee"
 * Generates pure profit: $1,879/month
 * Target: 25% of rides include tips, $5 average tip
 */

class TipsCommissionManager {
  constructor() {
    this.commissionRate = 0.30; // Mogo takes 30%
    this.tipsHistory = [];
  }

  /**
   * Process a tip with mogo commission
   * Rider tips $X → Mogo gets 30% immediately → Driver gets 70% after ride
   */
  processTip(rideId, riderTipAmount, driverEmail) {
    const mogoCommission = riderTipAmount * this.commissionRate;
    const driverTip = riderTipAmount - mogoCommission;

    const tipRecord = {
      rideId,
      timestamp: new Date(),
      riderTipAmount: riderTipAmount,
      mogoCommission: mogoCommission,
      driverTip: driverTip,
      driverEmail: driverEmail,
      commissionRate: this.commissionRate,
    };

    this.tipsHistory.push(tipRecord);

    return {
      riderTip: riderTipAmount,
      mogoRevenue: mogoCommission,
      driverReceives: driverTip,
      mogoPercentage: (this.commissionRate * 100).toFixed(0),
    };
  }

  /**
   * Calculate tips for a ride
   * Returns mogo commission if tip is included
   */
  calculateTipCommission(rideData) {
    if (!rideData.tip || rideData.tip === 0) {
      return {
        tipIncluded: false,
        mogoCommission: 0,
        driverTip: 0,
      };
    }

    const mogoCommission = rideData.tip * this.commissionRate;
    const driverTip = rideData.tip - mogoCommission;

    return {
      tipIncluded: true,
      riderTip: rideData.tip,
      mogoCommission: mogoCommission,
      driverTip: driverTip,
      percentageToMogo: (this.commissionRate * 100).toFixed(0),
    };
  }

  /**
   * Calculate monthly tips revenue
   * Assumptions: 1,254 rides/month, 25% include tips, $5 average tip
   */
  calculateMonthlyTipsRevenue(
    ridesPerMonth = 1254,
    tipsPercentage = 0.25,
    averageTip = 5.0
  ) {
    const totalTips = ridesPerMonth * tipsPercentage * averageTip;
    const mogoCommission = totalTips * this.commissionRate;

    return {
      ridesWithTips: Math.round(ridesPerMonth * tipsPercentage),
      averageTip: averageTip.toFixed(2),
      totalTipsAmount: totalTips.toFixed(2),
      mogoCommission: mogoCommission.toFixed(2),
      driverTipPayments: (totalTips - mogoCommission).toFixed(2),
      monthlyMogoRevenue: mogoCommission.toFixed(2),
      annualMogoRevenue: (mogoCommission * 12).toFixed(2),
    };
  }

  /**
   * Get tips statistics
   */
  getTipsStats() {
    if (this.tipsHistory.length === 0) {
      return {
        totalTips: 0,
        ridesWithTips: 0,
        mogoCommissionEarned: 0,
        averageTip: 0,
        averageCommissionPerRide: 0,
      };
    }

    const totalTips = this.tipsHistory.reduce((sum, t) => sum + t.riderTipAmount, 0);
    const mogoCommissionEarned = this.tipsHistory.reduce((sum, t) => sum + t.mogoCommission, 0);
    const averageTip = totalTips / this.tipsHistory.length;
    const averageCommissionPerRide = mogoCommissionEarned / this.tipsHistory.length;

    return {
      totalTipsProcessed: this.tipsHistory.length,
      totalTipsAmount: totalTips.toFixed(2),
      mogoCommissionEarned: mogoCommissionEarned.toFixed(2),
      driverTipsDistributed: (totalTips - mogoCommissionEarned).toFixed(2),
      averageTip: averageTip.toFixed(2),
      averageCommissionPerRide: averageCommissionPerRide.toFixed(2),
    };
  }

  /**
   * Set commission rate (default 30%, but configurable)
   * Can be adjusted by tier or time
   */
  setCommissionRate(rate) {
    if (rate < 0 || rate > 1) {
      throw new Error('Commission rate must be between 0 and 1');
    }
    this.commissionRate = rate;
  }

  /**
   * Get commission rate
   */
  getCommissionRate() {
    return this.commissionRate;
  }

  /**
   * Clear tips history (typically done monthly/quarterly for accounting)
   */
  clearHistory() {
    this.tipsHistory = [];
  }

  /**
   * Get tips by date range
   */
  getTipsByDateRange(startDate, endDate) {
    return this.tipsHistory.filter(t => {
      const tDate = new Date(t.timestamp);
      return tDate >= startDate && tDate <= endDate;
    });
  }
}

module.exports = TipsCommissionManager;
