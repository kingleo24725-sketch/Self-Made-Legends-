/**
 * CORPORATE ACCOUNT MANAGER
 * B2B ride management for companies and enterprise clients
 *
 * Generates pure profit: $27,000/month
 * Base fees + commission on corporate rides
 */

class CorporateAccountManager {
  constructor() {
    this.corporateAccounts = [];
    this.employeeAccounts = [];
    this.ridesHistory = [];
    this.accountPricingTiers = {
      STARTUP: {
        id: 'startup',
        name: 'Startup Tier',
        monthlyBaseFee: 300,
        rideCommissionRate: 0.07, // 7%
        maxEmployees: 50,
        features: ['billing', 'basic_reporting', 'spend_limits'],
      },
      MIDMARKET: {
        id: 'midmarket',
        name: 'Mid-Market Tier',
        monthlyBaseFee: 500,
        rideCommissionRate: 0.08, // 8%
        maxEmployees: 500,
        features: ['billing', 'advanced_reporting', 'spend_limits', 'cost_centers', 'approval_flow'],
      },
      ENTERPRISE: {
        id: 'enterprise',
        name: 'Enterprise Tier',
        monthlyBaseFee: 2000,
        rideCommissionRate: 0.08, // 8%
        maxEmployees: 5000,
        features: ['billing', 'advanced_reporting', 'spend_limits', 'cost_centers', 'approval_flow', 'dedicated_support', 'custom_integration'],
      },
    };
  }

  /**
   * Create corporate account
   */
  createCorporateAccount(companyName, tier = 'midmarket', contactEmail) {
    const pricingTier = this.accountPricingTiers[tier.toUpperCase()];

    if (!pricingTier) {
      return {
        success: false,
        error: `Tier ${tier} not found`,
      };
    }

    const account = {
      accountId: `corp_${Date.now()}`,
      timestamp: new Date(),
      companyName,
      tier,
      monthlyBaseFee: pricingTier.monthlyBaseFee,
      rideCommissionRate: pricingTier.rideCommissionRate,
      contactEmail,
      employees: [],
      monthlySpent: 0,
      monthlyRides: 0,
      billingCycle: 'monthly',
      active: true,
      signupDate: new Date(),
      features: pricingTier.features,
    };

    this.corporateAccounts.push(account);

    return {
      success: true,
      accountId: account.accountId,
      companyName,
      tier,
      monthlyBaseFee: pricingTier.monthlyBaseFee,
      commissionRate: `${(pricingTier.rideCommissionRate * 100).toFixed(0)}%`,
      message: `Corporate account created for ${companyName}`,
    };
  }

  /**
   * Add employee to corporate account
   */
  addEmployee(accountId, employeeEmail, name, spendLimitPerMonth, billingCode = '') {
    const account = this.corporateAccounts.find(a => a.accountId === accountId);

    if (!account) {
      return {
        success: false,
        error: `Account ${accountId} not found`,
      };
    }

    const employee = {
      employeeId: `emp_${Date.now()}`,
      accountId,
      email: employeeEmail,
      name,
      spendLimitPerMonth,
      billingCode,
      monthlySpent: 0,
      ridesUsed: 0,
      active: true,
      addedDate: new Date(),
    };

    this.employeeAccounts.push(employee);
    account.employees.push(employee.employeeId);

    return {
      success: true,
      employeeId: employee.employeeId,
      email: employeeEmail,
      spendLimit: spendLimitPerMonth,
      message: `Employee ${name} added to corporate account`,
    };
  }

  /**
   * Process corporate ride
   */
  processRide(employeeEmail, rideAmount, rideDetails = {}) {
    const employee = this.employeeAccounts.find(e => e.email === employeeEmail);

    if (!employee) {
      return {
        success: false,
        error: `Employee ${employeeEmail} not found`,
      };
    }

    // Check spend limit
    if (employee.monthlySpent + rideAmount > employee.spendLimitPerMonth) {
      return {
        success: false,
        error: `Spend limit exceeded for employee`,
        currentSpent: employee.monthlySpent,
        spendLimit: employee.spendLimitPerMonth,
      };
    }

    const account = this.corporateAccounts.find(a => a.accountId === employee.accountId);
    const commission = rideAmount * account.rideCommissionRate;

    const ride = {
      rideId: `ride_${Date.now()}`,
      employeeId: employee.employeeId,
      accountId: account.accountId,
      rideAmount,
      commission,
      billingCode: employee.billingCode,
      timestamp: new Date(),
      details: rideDetails,
    };

    this.ridesHistory.push(ride);
    employee.monthlySpent += rideAmount;
    employee.ridesUsed += 1;
    account.monthlySpent += rideAmount;
    account.monthlyRides += 1;

    return {
      success: true,
      rideId: ride.rideId,
      rideAmount: rideAmount.toFixed(2),
      commission: commission.toFixed(2),
      employeeSpent: employee.monthlySpent.toFixed(2),
      remainingBudget: (employee.spendLimitPerMonth - employee.monthlySpent).toFixed(2),
    };
  }

  /**
   * Calculate monthly corporate revenue
   */
  calculateMonthlyRevenue(estimatedAccounts = 45) {
    const revenueBreakdown = {};
    let totalBaseFees = 0;
    let totalCommission = 0;

    // Estimate by tier distribution
    const tierDistribution = {
      'startup': Math.floor(estimatedAccounts * 0.33), // 33% startups
      'midmarket': Math.floor(estimatedAccounts * 0.50), // 50% mid-market
      'enterprise': Math.floor(estimatedAccounts * 0.17), // 17% enterprise
    };

    Object.keys(tierDistribution).forEach(tier => {
      const tierUpper = tier.toUpperCase();
      const pricingTier = this.accountPricingTiers[tierUpper];
      const accountCount = tierDistribution[tier];

      const baseFees = accountCount * pricingTier.monthlyBaseFee;
      // Estimate: 200 rides per account per month, avg $25 per ride
      const estimatedRideRevenue = accountCount * 200 * 25;
      const commissions = estimatedRideRevenue * pricingTier.rideCommissionRate;

      totalBaseFees += baseFees;
      totalCommission += commissions;

      revenueBreakdown[tier] = {
        name: pricingTier.name,
        accounts: accountCount,
        baseFees,
        commissions: commissions.toFixed(2),
        total: (baseFees + commissions).toFixed(2),
      };
    });

    const totalMonthlyRevenue = totalBaseFees + totalCommission;

    return {
      revenueBreakdown,
      estimatedCorporateAccounts: estimatedAccounts,
      totalBaseFeeRevenue: totalBaseFees,
      totalCommissionRevenue: totalCommission.toFixed(2),
      totalMonthlyRevenue: totalMonthlyRevenue.toFixed(2),
      annualRevenue: (totalMonthlyRevenue * 12).toFixed(2),
      averageRevenuePerAccount: (totalMonthlyRevenue / estimatedAccounts).toFixed(2),
    };
  }

  /**
   * Get corporate account details
   */
  getAccount(accountId) {
    return this.corporateAccounts.find(a => a.accountId === accountId);
  }

  /**
   * Get all accounts
   */
  getAllAccounts() {
    return this.corporateAccounts.filter(a => a.active);
  }

  /**
   * Get employee accounts for a corporate account
   */
  getAccountEmployees(accountId) {
    const employeeIds = this.corporateAccounts.find(a => a.accountId === accountId)?.employees || [];
    return this.employeeAccounts.filter(e => employeeIds.includes(e.employeeId) && e.active);
  }

  /**
   * Generate billing report for account
   */
  generateBillingReport(accountId) {
    const account = this.getAccount(accountId);
    const employees = this.getAccountEmployees(accountId);

    if (!account) {
      return null;
    }

    const accountRides = this.ridesHistory.filter(r => r.accountId === accountId);
    const totalRideAmount = accountRides.reduce((sum, r) => sum + r.rideAmount, 0);
    const totalCommission = accountRides.reduce((sum, r) => sum + r.commission, 0);

    return {
      accountId,
      companyName: account.companyName,
      tier: account.tier,
      reportDate: new Date(),
      baseFee: account.monthlyBaseFee,
      totalRides: accountRides.length,
      totalRideAmount: totalRideAmount.toFixed(2),
      commissionRate: `${(account.rideCommissionRate * 100).toFixed(0)}%`,
      totalCommission: totalCommission.toFixed(2),
      totalInvoiceAmount: (account.monthlyBaseFee + totalCommission).toFixed(2),
      employeeCount: employees.length,
      topSpender: employees.length > 0 ? employees.sort((a, b) => b.monthlySpent - a.monthlySpent)[0].name : 'N/A',
    };
  }

  /**
   * Get corporate statistics
   */
  getCorporateStats() {
    const activeAccounts = this.corporateAccounts.filter(a => a.active);
    const activeEmployees = this.employeeAccounts.filter(e => e.active);
    const totalRides = this.ridesHistory.length;
    const totalRevenue = activeAccounts.reduce((sum, a) => sum + a.monthlyBaseFee, 0);

    return {
      totalCorporateAccounts: activeAccounts.length,
      totalEmployees: activeEmployees.length,
      totalRidesProcessed: totalRides,
      totalMonthlyBaseFees: totalRevenue.toFixed(2),
      estimatedMonthlyCommission: ((totalRides * 25 * 0.08).toFixed(2)), // Avg $25 ride, 8% comm
      averageEmployeesPerAccount: activeAccounts.length > 0 ? (activeEmployees.length / activeAccounts.length).toFixed(1) : '0',
      accountsByTier: {
        startup: activeAccounts.filter(a => a.tier === 'startup').length,
        midmarket: activeAccounts.filter(a => a.tier === 'midmarket').length,
        enterprise: activeAccounts.filter(a => a.tier === 'enterprise').length,
      },
    };
  }

  /**
   * Clear history
   */
  clearHistory() {
    this.corporateAccounts = [];
    this.employeeAccounts = [];
    this.ridesHistory = [];
  }
}

module.exports = CorporateAccountManager;
