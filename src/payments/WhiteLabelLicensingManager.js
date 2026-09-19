/**
 * WHITE LABEL & LICENSING MANAGER
 * License mogo platform to other cities and regions
 *
 * Generates pure profit: $75,000+/month
 * Scalable deployment model for global expansion
 */

class WhiteLabelLicensingManager {
  constructor() {
    this.licenses = [];
    this.licensingTiers = {
      FULL_PLATFORM: {
        id: 'full_platform',
        name: 'Full Platform License',
        description: 'Complete platform with all features and branding customization',
        monthlyPrice: 50000,
        includedFeatures: [
          'complete_platform',
          'all_revenue_streams',
          'custom_branding',
          'multi_language',
          'local_payment',
          'dedicated_support',
          'api_access',
        ],
        setupFee: 25000,
        minimumCommitment: 12, // months
      },
      TECHNOLOGY_LICENSE: {
        id: 'technology_license',
        name: 'Technology License',
        description: 'Payment and subscription systems only',
        monthlyPrice: 25000,
        includedFeatures: [
          'payment_system',
          'subscription_management',
          'analytics_dashboard',
          'api_access',
          'basic_support',
        ],
        setupFee: 10000,
        minimumCommitment: 12,
      },
      API_LICENSE: {
        id: 'api_license',
        name: 'API License Only',
        description: 'API access for partner-built solutions',
        monthlyPrice: 10000,
        includedFeatures: [
          'api_access',
          'documentation',
          'developer_support',
          'rate_limits',
        ],
        setupFee: 5000,
        minimumCommitment: 6,
      },
    };
  }

  /**
   * Create white label license agreement
   */
  createLicense(partnerName, city, country, licenseTier, partnerContact) {
    const tier = this.licensingTiers[licenseTier.toUpperCase()];

    if (!tier) {
      return {
        success: false,
        error: `Tier ${licenseTier} not found`,
      };
    }

    const license = {
      licenseId: `wl_${Date.now()}`,
      timestamp: new Date(),
      partnerName,
      city,
      country,
      tier: licenseTier,
      monthlyPrice: tier.monthlyPrice,
      setupFee: tier.setupFee,
      partnerContact,
      startDate: new Date(),
      endDate: new Date(new Date().getTime() + tier.minimumCommitment * 30 * 24 * 60 * 60 * 1000),
      status: 'active',
      features: tier.includedFeatures,
      customBranding: licenseTier === 'full_platform',
      apiKey: `api_${Math.random().toString(36).substr(2, 20)}`,
      deploymentEnvironment: 'production',
    };

    this.licenses.push(license);

    return {
      success: true,
      licenseId: license.licenseId,
      partnerName,
      location: `${city}, ${country}`,
      tier: licenseTier,
      monthlyPrice: tier.monthlyPrice,
      setupFee: tier.setupFee,
      minimumCommitment: tier.minimumCommitment,
      message: `White label license created for ${partnerName}`,
    };
  }

  /**
   * Get license details
   */
  getLicense(licenseId) {
    return this.licenses.find(l => l.licenseId === licenseId);
  }

  /**
   * Calculate monthly white label revenue
   */
  calculateMonthlyRevenue(scenarios = {}) {
    // Default scenario: 1 full platform + 1 technology license = $75K/month
    const defaultScenario = {
      fullPlatformLicenses: scenarios.fullPlatformLicenses || 1,
      technologyLicenses: scenarios.technologyLicenses || 1,
      apiLicenses: scenarios.apiLicenses || 0,
    };

    const fullPlatformRevenue = defaultScenario.fullPlatformLicenses * this.licensingTiers.FULL_PLATFORM.monthlyPrice;
    const technologyRevenue = defaultScenario.technologyLicenses * this.licensingTiers.TECHNOLOGY_LICENSE.monthlyPrice;
    const apiRevenue = defaultScenario.apiLicenses * this.licensingTiers.API_LICENSE.monthlyPrice;

    const totalMonthlyRevenue = fullPlatformRevenue + technologyRevenue + apiRevenue;
    const totalAnnualRevenue = totalMonthlyRevenue * 12;

    // Calculate setup fees (one-time, but included in annual for reference)
    const totalSetupFees = (defaultScenario.fullPlatformLicenses * this.licensingTiers.FULL_PLATFORM.setupFee) +
                          (defaultScenario.technologyLicenses * this.licensingTiers.TECHNOLOGY_LICENSE.setupFee) +
                          (defaultScenario.apiLicenses * this.licensingTiers.API_LICENSE.setupFee);

    const revenueBreakdown = {
      fullPlatform: {
        name: 'Full Platform License',
        licenses: defaultScenario.fullPlatformLicenses,
        monthlyPrice: this.licensingTiers.FULL_PLATFORM.monthlyPrice,
        monthlyRevenue: fullPlatformRevenue,
      },
      technology: {
        name: 'Technology License',
        licenses: defaultScenario.technologyLicenses,
        monthlyPrice: this.licensingTiers.TECHNOLOGY_LICENSE.monthlyPrice,
        monthlyRevenue: technologyRevenue,
      },
      api: {
        name: 'API License',
        licenses: defaultScenario.apiLicenses,
        monthlyPrice: this.licensingTiers.API_LICENSE.monthlyPrice,
        monthlyRevenue: apiRevenue,
      },
    };

    return {
      revenueBreakdown,
      totalLicenses: defaultScenario.fullPlatformLicenses + defaultScenario.technologyLicenses + defaultScenario.apiLicenses,
      totalMonthlyRevenue: totalMonthlyRevenue,
      totalAnnualRevenue: totalAnnualRevenue,
      totalSetupFees: totalSetupFees,
      yearOneRevenue: totalAnnualRevenue + totalSetupFees,
    };
  }

  /**
   * Get all licenses
   */
  getAllLicenses() {
    return this.licenses.filter(l => l.status === 'active');
  }

  /**
   * Get licenses by region
   */
  getLicensesByRegion(region) {
    return this.licenses.filter(l => l.country === region && l.status === 'active');
  }

  /**
   * Get licenses by tier
   */
  getLicensesByTier(tier) {
    return this.licenses.filter(l => l.tier === tier && l.status === 'active');
  }

  /**
   * Renew license
   */
  renewLicense(licenseId, months = 12) {
    const license = this.getLicense(licenseId);

    if (!license) {
      return {
        success: false,
        error: `License ${licenseId} not found`,
      };
    }

    license.endDate = new Date(license.endDate.getTime() + months * 30 * 24 * 60 * 60 * 1000);
    license.renewalDate = new Date();

    return {
      success: true,
      licenseId,
      newEndDate: license.endDate,
      renewalMonths: months,
      message: `License renewed for ${months} months`,
    };
  }

  /**
   * Cancel license
   */
  cancelLicense(licenseId) {
    const license = this.getLicense(licenseId);

    if (!license) {
      return {
        success: false,
        error: `License ${licenseId} not found`,
      };
    }

    license.status = 'cancelled';
    license.cancellationDate = new Date();

    return {
      success: true,
      licenseId,
      message: 'License cancelled',
      refundEligible: this.isRefundEligible(license),
    };
  }

  /**
   * Check if refund is eligible (30-day window)
   */
  isRefundEligible(license) {
    const daysSinceStart = Math.floor(
      (new Date() - new Date(license.startDate)) / (1000 * 60 * 60 * 24)
    );
    return daysSinceStart <= 30;
  }

  /**
   * Get white label statistics
   */
  getWhiteLabelStats() {
    const activeLicenses = this.getAllLicenses();
    const totalMonthlyRevenue = activeLicenses.reduce((sum, l) => sum + l.monthlyPrice, 0);

    const tierBreakdown = {};
    activeLicenses.forEach(license => {
      if (!tierBreakdown[license.tier]) {
        tierBreakdown[license.tier] = 0;
      }
      tierBreakdown[license.tier] += 1;
    });

    return {
      totalActiveLicenses: activeLicenses.length,
      totalMonthlyRevenue: totalMonthlyRevenue,
      totalAnnualRevenue: (totalMonthlyRevenue * 12),
      averageLicenseValue: activeLicenses.length > 0 ? (totalMonthlyRevenue / activeLicenses.length).toFixed(2) : '0.00',
      licensesByTier: tierBreakdown,
      globalReach: [...new Set(activeLicenses.map(l => l.country))].length,
      markets: [...new Set(activeLicenses.map(l => `${l.city}, ${l.country}`))],
    };
  }

  /**
   * Get target markets for expansion
   */
  getTargetMarkets() {
    return {
      tier1: [
        { city: 'Mexico City', country: 'Mexico', estimatedRevenue: '$50K-75K' },
        { city: 'São Paulo', country: 'Brazil', estimatedRevenue: '$50K-75K' },
        { city: 'Bangkok', country: 'Thailand', estimatedRevenue: '$50K-75K' },
        { city: 'Jakarta', country: 'Indonesia', estimatedRevenue: '$50K-75K' },
        { city: 'Manila', country: 'Philippines', estimatedRevenue: '$50K-75K' },
      ],
      tier2: [
        { city: 'Bogotá', country: 'Colombia', estimatedRevenue: '$25K-50K' },
        { city: 'Lima', country: 'Peru', estimatedRevenue: '$25K-50K' },
        { city: 'Santiago', country: 'Chile', estimatedRevenue: '$25K-50K' },
        { city: 'Buenos Aires', country: 'Argentina', estimatedRevenue: '$25K-50K' },
        { city: 'Kuala Lumpur', country: 'Malaysia', estimatedRevenue: '$25K-50K' },
      ],
    };
  }

  /**
   * Clear history
   */
  clearHistory() {
    this.licenses = [];
  }
}

module.exports = WhiteLabelLicensingManager;
