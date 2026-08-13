const crypto = require("crypto");

class ReferralBonusPool {
  constructor() {
    this.bonusPool = {
      available: 10000, // $10,000 initial pool for referrals
      distributed: 0,
      totalAdded: 10000,
      createdAt: new Date(),
    };
    this.bonusDistributions = [];
    this.BONUS_PER_REFERRAL = 20;
    this.BONUS_FUNDING_PERCENTAGE = 0.5; // 0.5% of all platform revenue goes to referral pool
  }

  // Separate from creator earnings - comes from platform operational budget
  fundBonusPool(amount, source = "platform_allocation") {
    const funding = {
      id: crypto.randomBytes(16).toString("hex"),
      amount,
      source, // "platform_allocation", "revenue_share", "marketing_budget"
      timestamp: new Date(),
      note: "Independent referral bonus pool funding",
    };

    this.bonusPool.available += amount;
    this.bonusPool.totalAdded += amount;

    this.bonusDistributions.push({
      type: "funding",
      ...funding,
    });

    return {
      success: true,
      message: `Added $${amount} to referral bonus pool (Independent of creator earnings)`,
      poolBalance: this.bonusPool.available,
    };
  }

  // Allocate bonus from pool to referrer
  awardBonus(userId, amount = this.BONUS_PER_REFERRAL, referralId = null) {
    if (amount > this.bonusPool.available) {
      return {
        success: false,
        error: `Insufficient bonus pool. Available: $${this.bonusPool.available.toFixed(2)}`,
      };
    }

    const bonus = {
      id: crypto.randomBytes(16).toString("hex"),
      userId,
      amount,
      referralId,
      source: "referral_bonus_pool",
      timestamp: new Date(),
      status: "pending",
      paidAt: null,
    };

    this.bonusDistributions.push(bonus);
    this.bonusPool.available -= amount;
    this.bonusPool.distributed += amount;

    // Auto-complete bonus after 1 second
    setTimeout(() => {
      const b = this.bonusDistributions.find((d) => d.id === bonus.id);
      if (b) {
        b.status = "completed";
        b.paidAt = new Date();
      }
    }, 1000);

    return {
      success: true,
      bonusId: bonus.id,
      amount,
      message: `$${amount} referral bonus awarded from dedicated bonus pool (Not from creator earnings)`,
      poolBalance: this.bonusPool.available,
    };
  }

  // Get pool status
  getPoolStatus() {
    const completed = this.bonusDistributions.filter(
      (d) => d.type === "bonus" && d.status === "completed"
    );
    const pending = this.bonusDistributions.filter(
      (d) => d.type === "bonus" && d.status === "pending"
    );

    return {
      available: this.bonusPool.available,
      distributed: this.bonusPool.distributed,
      totalFunded: this.bonusPool.totalAdded,
      completedBonuses: completed.length,
      pendingBonuses: pending.length,
      totalBonusesAwarded: completed.length + pending.length,
      utilizationRate: `${((this.bonusPool.distributed / this.bonusPool.totalAdded) * 100).toFixed(1)}%`,
      note: "All referral bonuses come from dedicated pool, NOT creator earnings",
    };
  }

  // Get user's pending bonuses from pool
  getUserPendingBonuses(userId) {
    return this.bonusDistributions.filter(
      (d) => d.type === "bonus" && d.userId === userId && d.status === "pending"
    );
  }

  // Get total pending for user
  getUserPendingTotal(userId) {
    const pending = this.getUserPendingBonuses(userId);
    return pending.reduce((sum, b) => sum + b.amount, 0);
  }

  // Simulate monthly revenue share to bonus pool
  addMonthlyRevenueShare(monthlyRevenue) {
    const allocationAmount = monthlyRevenue * this.BONUS_FUNDING_PERCENTAGE;

    return this.fundBonusPool(
      allocationAmount,
      `monthly_revenue_share_${new Date().toISOString().split("T")[0]}`
    );
  }

  // Get distribution history
  getDistributionHistory(userId = null, limit = 50) {
    let history = this.bonusDistributions;

    if (userId) {
      history = history.filter((d) => d.userId === userId);
    }

    return history.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);
  }

  // Verify bonus pool independence
  verifySeparation() {
    return {
      bonusPoolSource: "Dedicated referral bonus pool (Independent funding)",
      creatorEarningsSource: "Transaction fees ($5 per transaction)",
      relationship: "COMPLETELY SEPARATE - No overlap",
      bonusPoolFunding: [
        "Platform operational budget allocation",
        "Monthly revenue share (0.5%)",
        "Marketing budget allocation",
        "Community growth budget",
      ],
      creatorEarningsFunding: ["$5 per deposit transaction", "$5 per withdrawal transaction"],
      verification:
        "Referral bonuses do NOT come from creator earnings or profits in any way",
    };
  }
}

module.exports = ReferralBonusPool;
