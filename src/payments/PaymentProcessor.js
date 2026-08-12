const crypto = require("crypto");

class PaymentProcessor {
  constructor() {
    this.transactions = [];
    this.exchangeRates = {};
  }

  createDeposit(userId, amount, currency, method) {
    if (!amount || amount < 0.01) {
      return {
        success: false,
        error: "Minimum deposit is $0.01",
      };
    }

    const depositId = crypto.randomBytes(16).toString("hex");
    const fee = this.calculateFee(amount, method, "deposit");

    const deposit = {
      id: depositId,
      userId,
      type: "deposit",
      amount,
      currency,
      method,
      fee,
      netAmount: amount - fee,
      status: "pending",
      createdAt: new Date(),
      completedAt: null,
      reference: `DEP-${Date.now()}`,
    };

    this.transactions.push(deposit);

    return {
      success: true,
      depositId,
      reference: deposit.reference,
      amount: amount,
      fee: fee,
      netAmount: deposit.netAmount,
      message: `Deposit initiated. You will receive $${(amount - fee).toFixed(2)} after confirmation.`,
    };
  }

  createWithdrawal(userId, amount, currency, method, destination) {
    if (!amount || amount < 0.01) {
      return {
        success: false,
        error: "Minimum withdrawal is $0.01",
      };
    }

    const withdrawalId = crypto.randomBytes(16).toString("hex");
    const fee = this.calculateFee(amount, method, "withdrawal");

    const withdrawal = {
      id: withdrawalId,
      userId,
      type: "withdrawal",
      amount,
      currency,
      method,
      destination,
      fee,
      netAmount: amount - fee,
      status: "pending_verification",
      createdAt: new Date(),
      completedAt: null,
      reference: `WD-${Date.now()}`,
      requiresApproval: amount > 10000,
    };

    this.transactions.push(withdrawal);

    return {
      success: true,
      withdrawalId,
      reference: withdrawal.reference,
      amount,
      fee,
      netAmount: withdrawal.netAmount,
      status: withdrawal.status,
      timeToComplete: this.getEstimatedTime(method),
      message: `Withdrawal request created. You will receive $${(amount - fee).toFixed(2)} to ${destination}`,
    };
  }

  processDeposit(depositId, accountManager, email) {
    const deposit = this.transactions.find(t => t.id === depositId);
    if (!deposit) return { success: false, error: "Deposit not found" };

    deposit.status = "processing";

    setTimeout(() => {
      deposit.status = "completed";
      deposit.completedAt = new Date();
      accountManager.updateBalance(email, "usd", deposit.netAmount);
    }, 1000);

    return {
      success: true,
      message: "Deposit processing...",
      estimatedTime: "1-2 minutes",
    };
  }

  processWithdrawal(withdrawalId, accountManager, email) {
    const withdrawal = this.transactions.find(t => t.id === withdrawalId);
    if (!withdrawal) return { success: false, error: "Withdrawal not found" };

    const account = accountManager.getAccount(email);
    if (!account) return { success: false, error: "Account not found" };

    if (account.balances.usd < withdrawal.amount) {
      return { success: false, error: "Insufficient balance" };
    }

    withdrawal.status = "processing";

    const processingTime = this.getProcessingTime(withdrawal.method);
    setTimeout(() => {
      withdrawal.status = "completed";
      withdrawal.completedAt = new Date();
      accountManager.updateBalance(email, "usd", -withdrawal.amount);
    }, processingTime);

    return {
      success: true,
      message: `Withdrawal processing. Funds will arrive in ${this.getEstimatedTime(withdrawal.method)}`,
      estimatedTime: this.getEstimatedTime(withdrawal.method),
    };
  }

  calculateFee(amount, method, type) {
    const feeStructure = {
      bank: { deposit: 0, withdrawal: 5 },
      card: { deposit: amount * 0.025, withdrawal: amount * 0.03 },
      crypto: { deposit: amount * 0.001, withdrawal: amount * 0.002 },
      paypal: { deposit: amount * 0.022, withdrawal: amount * 0.022 },
      swift: { deposit: 10, withdrawal: 15 },
    };

    const baseFee = feeStructure[method]?.[type] || 0;
    return Math.max(0, parseFloat(baseFee.toFixed(2)));
  }

  getMinimumWithdrawal(method) {
    const minimums = {
      bank: 1,
      card: 1,
      crypto: 0.00001,
      paypal: 1,
      swift: 1,
    };

    return minimums[method] || 1;
  }

  getEstimatedTime(method) {
    const times = {
      bank: "1-3 business days",
      card: "instant",
      crypto: "5-30 minutes",
      paypal: "instant",
      swift: "24-48 hours",
    };

    return times[method] || "2-3 business days";
  }

  getProcessingTime(method) {
    const times = {
      bank: 3 * 60 * 1000,
      card: 500,
      crypto: 10 * 60 * 1000,
      paypal: 1000,
      swift: 2 * 60 * 60 * 1000,
    };

    return times[method] || 5 * 60 * 1000;
  }

  getTransaction(transactionId) {
    return this.transactions.find(t => t.id === transactionId);
  }

  getUserTransactions(userId, limit = 50) {
    return this.transactions
      .filter(t => t.userId === userId)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit);
  }

  getTransactionHistory(userId) {
    const userTransactions = this.getUserTransactions(userId, 1000);

    const summary = {
      totalDeposits: userTransactions
        .filter(t => t.type === "deposit" && t.status === "completed")
        .reduce((sum, t) => sum + t.netAmount, 0),
      totalWithdrawals: userTransactions
        .filter(t => t.type === "withdrawal" && t.status === "completed")
        .reduce((sum, t) => sum + t.amount, 0),
      totalFeesPaid: userTransactions
        .filter(t => t.status === "completed")
        .reduce((sum, t) => sum + t.fee, 0),
      transactions: userTransactions.slice(0, 20),
    };

    return summary;
  }

  verifyWithdrawalAddress(address, type) {
    if (type === "crypto") {
      return /^[a-zA-Z0-9]{26,35}$/.test(address);
    } else if (type === "bank") {
      return /^\d{8,17}$/.test(address);
    }
    return false;
  }
}

module.exports = PaymentProcessor;
