const crypto = require("crypto");

class UserControlCenter {
  constructor() {
    this.userControls = new Map();
    this.withdrawalRequests = [];
    this.aiAutomation = new Map();
  }

  initializeUserControl(userId) {
    if (this.userControls.has(userId)) {
      return this.userControls.get(userId);
    }

    const control = {
      userId,
      aiEnabled: false,
      aiAutoTrade: false,
      aiStopLoss: true,
      aiTakeProfits: true,
      userCanWithdrawAnytime: true,
      userCanPauseTrading: true,
      userCanEditSettings: true,
      withdrawalControl: "USER_ONLY",
      createdAt: new Date(),
      lastModified: new Date(),
    };

    this.userControls.set(userId, control);
    return control;
  }

  requestWithdrawal(userId, amount, destination) {
    const control = this.userControls.get(userId);

    if (!control) {
      return { success: false, error: "User control not initialized" };
    }

    if (!control.userCanWithdrawAnytime) {
      return {
        success: false,
        error: "Withdrawals are currently restricted",
      };
    }

    const withdrawalId = crypto.randomBytes(16).toString("hex");

    const request = {
      id: withdrawalId,
      userId,
      amount,
      destination,
      status: "pending",
      initiatedBy: "USER",
      approvedBy: null,
      deniedReason: null,
      createdAt: new Date(),
      approvedAt: null,
    };

    this.withdrawalRequests.push(request);

    setTimeout(() => {
      const wr = this.withdrawalRequests.find((w) => w.id === withdrawalId);
      if (wr) {
        wr.status = "approved";
        wr.approvedAt = new Date();
      }
    }, 100);

    return {
      success: true,
      withdrawalId,
      amount,
      destination,
      status: "pending",
      message:
        "Withdrawal request submitted. You have full control - not AI.",
    };
  }

  authorizeWithdrawal(withdrawalId) {
    const request = this.withdrawalRequests.find((w) => w.id === withdrawalId);

    if (!request) {
      return { success: false, error: "Withdrawal request not found" };
    }

    if (request.status !== "pending") {
      return {
        success: false,
        error: `Cannot authorize ${request.status} withdrawal`,
      };
    }

    request.status = "approved";
    request.approvedAt = new Date();

    return {
      success: true,
      withdrawal: request,
    };
  }

  denyWithdrawal(withdrawalId, reason) {
    const request = this.withdrawalRequests.find((w) => w.id === withdrawalId);

    if (!request) {
      return { success: false, error: "Withdrawal request not found" };
    }

    request.status = "denied";
    request.deniedReason = reason;
    request.deniedAt = new Date();

    return {
      success: true,
      withdrawal: request,
    };
  }

  enableAI(userId) {
    const control = this.userControls.get(userId);

    if (!control) {
      return { success: false, error: "User control not initialized" };
    }

    control.aiEnabled = true;
    control.aiAutoTrade = true;
    control.lastModified = new Date();

    return {
      success: true,
      message: "AI trading enabled - BUT YOU STILL CONTROL WITHDRAWALS",
      control,
    };
  }

  disableAI(userId) {
    const control = this.userControls.get(userId);

    if (!control) {
      return { success: false, error: "User control not initialized" };
    }

    control.aiEnabled = false;
    control.aiAutoTrade = false;
    control.lastModified = new Date();

    return {
      success: true,
      message: "AI trading disabled - You are in full control",
      control,
    };
  }

  pauseTrading(userId) {
    const control = this.userControls.get(userId);

    if (!control) {
      return { success: false, error: "User control not initialized" };
    }

    if (!control.userCanPauseTrading) {
      return { success: false, error: "Pausing is not allowed" };
    }

    control.aiAutoTrade = false;
    control.lastModified = new Date();

    return {
      success: true,
      message: "Trading paused - AI will not make new trades",
    };
  }

  resumeTrading(userId) {
    const control = this.userControls.get(userId);

    if (!control) {
      return { success: false, error: "User control not initialized" };
    }

    control.aiAutoTrade = true;
    control.lastModified = new Date();

    return {
      success: true,
      message: "Trading resumed - AI will continue making trades",
    };
  }

  getUserControl(userId) {
    const control = this.userControls.get(userId);

    if (!control) {
      return this.initializeUserControl(userId);
    }

    return control;
  }

  getWithdrawalHistory(userId, limit = 50) {
    return this.withdrawalRequests
      .filter((w) => w.userId === userId)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit);
  }

  getPendingWithdrawals(userId) {
    return this.withdrawalRequests.filter(
      (w) => w.userId === userId && w.status === "pending"
    );
  }

  getControlStatus(userId) {
    const control = this.getUserControl(userId);
    const pendingWithdrawals = this.getPendingWithdrawals(userId);

    return {
      control,
      pendingWithdrawals: pendingWithdrawals.length,
      userOwnsControl: true,
      userCanWithdraw: control.userCanWithdrawAnytime,
      aiStatus: control.aiEnabled ? "RUNNING" : "PAUSED",
      message:
        "YOU ARE IN CONTROL. AI works for you, not the other way around.",
    };
  }

  setWithdrawalControl(userId, mode) {
    const control = this.userControls.get(userId);

    if (!control) {
      return { success: false, error: "User control not initialized" };
    }

    if (mode === "USER_ONLY") {
      control.userCanWithdrawAnytime = true;
      control.withdrawalControl = "USER_ONLY";
    } else if (mode === "USER_WITH_RESTRICTIONS") {
      control.userCanWithdrawAnytime = false;
      control.withdrawalControl = "USER_WITH_RESTRICTIONS";
    } else {
      return { success: false, error: "Invalid withdrawal control mode" };
    }

    control.lastModified = new Date();

    return {
      success: true,
      control,
    };
  }

  getAIStatus(userId) {
    const control = this.getUserControl(userId);

    return {
      aiEnabled: control.aiEnabled,
      autoTrading: control.aiAutoTrade,
      stopLoss: control.aiStopLoss,
      takeProfits: control.aiTakeProfits,
      userControl: "ALWAYS",
      message:
        "AI helps grow your money in the background. You decide when to withdraw.",
    };
  }
}

module.exports = UserControlCenter;
