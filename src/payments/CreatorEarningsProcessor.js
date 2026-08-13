const crypto = require("crypto");

class CreatorEarningsProcessor {
  constructor(creatorId, creatorBankInfo) {
    this.creatorId = creatorId;
    this.creatorBankInfo = creatorBankInfo;
    this.earnings = [];
    this.totalEarnings = 0;
    this.creatorFee = 5; // $5 per transaction
  }

  recordTransaction(userId, amount, transactionType, method) {
    const earningId = crypto.randomBytes(16).toString("hex");

    const earning = {
      id: earningId,
      creatorId: this.creatorId,
      userId,
      amount: this.creatorFee,
      transactionType, // deposit, withdrawal, etc.
      method, // card, bank, crypto
      status: "pending",
      createdAt: new Date(),
      completedAt: null,
    };

    this.earnings.push(earning);
    return earning;
  }

  completeEarning(earningId) {
    const earning = this.earnings.find((e) => e.id === earningId);
    if (!earning) {
      return { success: false, error: "Earning not found" };
    }

    earning.status = "completed";
    earning.completedAt = new Date();
    this.totalEarnings += earning.amount;

    return {
      success: true,
      earning,
      totalEarnings: this.totalEarnings,
    };
  }

  getEarnings(filter = {}) {
    let filtered = [...this.earnings];

    if (filter.status) {
      filtered = filtered.filter((e) => e.status === filter.status);
    }

    if (filter.startDate && filter.endDate) {
      filtered = filtered.filter(
        (e) =>
          e.createdAt >= filter.startDate && e.createdAt <= filter.endDate
      );
    }

    return {
      totalEarnings: this.totalEarnings,
      count: filtered.length,
      earnings: filtered,
      completedCount: filtered.filter((e) => e.status === "completed").length,
      pendingCount: filtered.filter((e) => e.status === "pending").length,
    };
  }

  getPendingEarnings() {
    return this.getEarnings({ status: "pending" });
  }

  getCompletedEarnings() {
    return this.getEarnings({ status: "completed" });
  }

  async withdrawCreatorEarnings(amount) {
    if (amount > this.totalEarnings) {
      return {
        success: false,
        error: `Insufficient earnings. Available: $${this.totalEarnings.toFixed(2)}`,
      };
    }

    const withdrawalId = crypto.randomBytes(16).toString("hex");

    return {
      success: true,
      withdrawalId,
      amount,
      status: "processing",
      message: `Creator withdrawal of $${amount.toFixed(2)} initiated`,
      destinationBank: this.creatorBankInfo?.bankName || "Creator Bank Account",
    };
  }

  getEarningsStats() {
    const allEarnings = this.earnings;
    const completed = allEarnings.filter((e) => e.status === "completed");
    const pending = allEarnings.filter((e) => e.status === "pending");

    const byMethod = {};
    completed.forEach((e) => {
      byMethod[e.method] = (byMethod[e.method] || 0) + e.amount;
    });

    const byType = {};
    completed.forEach((e) => {
      byType[e.transactionType] = (byType[e.transactionType] || 0) + e.amount;
    });

    return {
      totalCompleted: completed.reduce((sum, e) => sum + e.amount, 0),
      totalPending: pending.reduce((sum, e) => sum + e.amount, 0),
      totalEarnings: this.totalEarnings,
      transactionCount: completed.length,
      pendingCount: pending.length,
      earningsByMethod: byMethod,
      earningsByType: byType,
      averagePerTransaction: completed.length > 0
        ? (completed.reduce((sum, e) => sum + e.amount, 0) / completed.length).toFixed(2)
        : 0,
    };
  }
}

module.exports = CreatorEarningsProcessor;
