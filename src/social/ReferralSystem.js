const crypto = require("crypto");

class ReferralSystem {
  constructor() {
    this.referrals = new Map();
    this.referralLinks = new Map();
    this.referralBonuses = [];
    this.REFERRAL_BONUS = 20; // $20 per referral
  }

  generateReferralLink(userId, email) {
    const code = crypto.randomBytes(8).toString("hex").toUpperCase();
    const link = {
      code,
      userId,
      email,
      createdAt: new Date(),
      clicks: 0,
      signups: 0,
      earnings: 0,
    };

    this.referralLinks.set(code, link);
    return {
      code,
      link: `https://selfmadelegends.app/join/${code}`,
      shortUrl: `sml.link/${code}`,
    };
  }

  trackReferralClick(referralCode) {
    const link = this.referralLinks.get(referralCode);
    if (link) {
      link.clicks++;
      return true;
    }
    return false;
  }

  processReferral(referralCode, newUserId, newUserEmail) {
    const link = this.referralLinks.get(referralCode);

    if (!link) {
      return { success: false, error: "Invalid referral code" };
    }

    if (link.userId === newUserId) {
      return { success: false, error: "Cannot refer yourself" };
    }

    const referralId = crypto.randomBytes(16).toString("hex");

    const referral = {
      id: referralId,
      referrerId: link.userId,
      referrerEmail: link.email,
      referredId: newUserId,
      referredEmail: newUserEmail,
      referralCode: referralCode,
      status: "pending",
      bonus: this.REFERRAL_BONUS,
      createdAt: new Date(),
      completedAt: null,
    };

    this.referrals.set(referralId, referral);
    link.signups++;

    return {
      success: true,
      referralId,
      message: `Welcome! You were referred by ${link.email}. You'll both get $${this.REFERRAL_BONUS} when you deposit!`,
    };
  }

  completedDeposit(newUserId, amount) {
    let bonusProcessed = false;

    // Find referral for this user
    for (const [, referral] of this.referrals) {
      if (referral.referredId === newUserId && referral.status === "pending") {
        // Mark as completed
        referral.status = "completed";
        referral.completedAt = new Date();

        // Award bonus to referrer
        const bonus = {
          id: crypto.randomBytes(16).toString("hex"),
          type: "referral_bonus",
          referrerId: referral.referrerId,
          referralId: referral.id,
          amount: this.REFERRAL_BONUS,
          fromUser: referral.referredEmail,
          status: "pending",
          createdAt: new Date(),
          paidAt: null,
        };

        this.referralBonuses.push(bonus);

        // Update link stats
        const link = this.referralLinks.get(referral.referralCode);
        if (link) {
          link.earnings += this.REFERRAL_BONUS;
        }

        bonusProcessed = true;

        // Award new user deposit bonus
        setTimeout(() => {
          bonus.status = "completed";
          bonus.paidAt = new Date();
        }, 1000);
      }
    }

    if (bonusProcessed) {
      return {
        success: true,
        message: `Referral bonus of $${this.REFERRAL_BONUS} credited to your referrer!`,
      };
    }

    return { success: false, error: "No active referral found" };
  }

  getReferralStats(userId) {
    const stats = {
      totalReferrals: 0,
      completedReferrals: 0,
      pendingReferrals: 0,
      totalEarnings: 0,
      referrals: [],
    };

    for (const [, referral] of this.referrals) {
      if (referral.referrerId === userId) {
        stats.totalReferrals++;

        if (referral.status === "completed") {
          stats.completedReferrals++;
          stats.totalEarnings += referral.bonus;
        } else if (referral.status === "pending") {
          stats.pendingReferrals++;
        }

        stats.referrals.push({
          referredEmail: referral.referredEmail,
          status: referral.status,
          bonus: referral.bonus,
          createdAt: referral.createdAt,
          completedAt: referral.completedAt,
        });
      }
    }

    return stats;
  }

  getReferralLink(userId) {
    for (const [code, link] of this.referralLinks) {
      if (link.userId === userId) {
        return {
          code,
          link: `https://selfmadelegends.app/join/${code}`,
          shortUrl: `sml.link/${code}`,
          clicks: link.clicks,
          signups: link.signups,
          earnings: link.earnings,
        };
      }
    }
    return null;
  }

  getLeaderboard(limit = 10) {
    const leaderboard = [];

    for (const [, link] of this.referralLinks) {
      leaderboard.push({
        email: link.email,
        signups: link.signups,
        earnings: link.earnings,
        clicks: link.clicks,
      });
    }

    return leaderboard
      .sort((a, b) => b.earnings - a.earnings)
      .slice(0, limit);
  }

  getPendingBonuses(userId) {
    return this.referralBonuses.filter(
      (b) => b.referrerId === userId && b.status === "pending"
    );
  }

  getTotalPendingBonuses(userId) {
    const pending = this.getPendingBonuses(userId);
    return pending.reduce((sum, b) => sum + b.amount, 0);
  }

  withdrawReferralBonuses(userId, amount) {
    const pending = this.getTotalPendingBonuses(userId);

    if (amount > pending) {
      return {
        success: false,
        error: `Only $${pending.toFixed(2)} available in pending bonuses`,
      };
    }

    let remaining = amount;
    for (const bonus of this.referralBonuses) {
      if (bonus.referrerId === userId && bonus.status === "pending" && remaining > 0) {
        const deductAmount = Math.min(bonus.amount, remaining);
        bonus.amount -= deductAmount;
        remaining -= deductAmount;

        if (bonus.amount === 0) {
          bonus.status = "withdrawn";
        }
      }
    }

    return {
      success: true,
      amountWithdrawn: amount,
      remainingBonuses: this.getTotalPendingBonuses(userId),
    };
  }
}

module.exports = ReferralSystem;
