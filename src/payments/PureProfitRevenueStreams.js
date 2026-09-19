/**
 * MOGO PURE PROFIT REVENUE STREAMS
 * Zero payout, 100% margin revenue opportunities
 *
 * Current model payouts: ~84% of ride revenue
 * These streams: 0% payout, 100% margin
 */

class PureProfitRevenueStreams {
  constructor() {
    this.revenueStreams = {};
    this.monthlyRevenue = 0;
  }

  // ===========================================================================
  // 1. SURGE PRICING - Peak Time Multiplier (0% payout)
  // ===========================================================================
  calculateSurgeRevenue(baseRideRevenue, surgeMultiplier, surgePercentageOfRides) {
    /**
     * During peak hours (rush hour, events, weather):
     * - Rider pays 1.5x - 3x more
     * - Mogo keeps 100% of surge premium
     * - Driver gets same as normal (or small bonus from Mogo's cut)
     *
     * Example: $25 ride becomes $37.50 (1.5x surge)
     * Extra $12.50 goes to mogo, 0 goes to driver
     */

    const surgePremium = baseRideRevenue * (surgeMultiplier - 1);
    const estimatedRidesPerMonth = 1254; // From our data
    const surgeRidesPerMonth = estimatedRidesPerMonth * surgePercentageOfRides;

    const monthlyRevenue = surgePremium * surgeRidesPerMonth;

    return {
      name: "Surge Pricing Premium",
      monthlyRevenue: monthlyRevenue,
      margin: "100%",
      description: `${(surgePercentageOfRides * 100).toFixed(0)}% of rides at ${surgeMultiplier}x surge multiplier`,
      example: `Normal $25 ride → $${(25 * surgeMultiplier).toFixed(2)} at ${surgeMultiplier}x surge`,
      pureProfitPerRide: surgePremium,
      estimatedMonthly: monthlyRevenue.toFixed(2)
    };
  }

  // ===========================================================================
  // 2. ADVERTISING - In-App Ads (0% payout)
  // ===========================================================================
  calculateAdvertisingRevenue(activeUsers, impressionsPerSession, cpmRate) {
    /**
     * CPM (Cost Per Mille) = $1 - $8 per 1000 impressions
     * Users see ads during:
     * - Map waiting for driver
     * - Ride confirmation screen
     * - Post-ride feedback
     * - App home screen
     *
     * Mogo keeps 100%, advertisers pay directly
     */

    const monthlyUsers = activeUsers;
    const sessionsPerUserPerMonth = 4; // Average rides per user
    const totalImpressions = monthlyUsers * sessionsPerUserPerMonth * impressionsPerSession;
    const monthlyRevenue = (totalImpressions / 1000) * cpmRate;

    return {
      name: "In-App Advertising",
      monthlyRevenue: monthlyRevenue,
      margin: "100%",
      description: `CPM rate: $${cpmRate}/1000 impressions`,
      adPlacementLocations: [
        "Map screen during wait",
        "Post-ride feedback screen",
        "App home/discover",
        "Notification banners",
        "Ride history feed"
      ],
      potentialPartners: [
        "Food delivery (Uber Eats, DoorDash)",
        "Insurance companies",
        "Car insurance",
        "Gyms/fitness apps",
        "Coffee chains"
      ],
      estimatedMonthly: monthlyRevenue.toFixed(2)
    };
  }

  // ===========================================================================
  // 3. PREMIUM FEATURES & ADD-ONS (0% payout)
  // ===========================================================================
  calculatePremiumFeaturesRevenue() {
    /**
     * One-time and recurring charges for optional features
     * Rider pays, mogo keeps everything
     */

    const features = {
      scheduledRides: {
        price: 1.99,
        description: "Schedule ride in advance (+$1.99)",
        adoptionRate: 0.15, // 15% of rides
        monthlyRides: 1254,
      },
      directToDriver: {
        price: 0.99,
        description: "Direct message to driver (+$0.99)",
        adoptionRate: 0.08,
        monthlyRides: 1254,
      },
      rideSharing: {
        price: 2.49,
        description: "Split ride with friend (+$2.49 per person)",
        adoptionRate: 0.20,
        monthlyRides: 1254,
      },
      priorityPickup: {
        price: 3.99,
        description: "Jump queue for driver pickup (+$3.99)",
        adoptionRate: 0.12,
        monthlyRides: 1254,
      },
      accessibilityPlus: {
        price: 4.99,
        description: "Wheelchair accessible guarantee (+$4.99)",
        adoptionRate: 0.05,
        monthlyRides: 1254,
      },
    };

    let totalRevenue = 0;
    Object.entries(features).forEach(([key, feature]) => {
      const revenue = feature.price * feature.adoptionRate * feature.monthlyRides;
      totalRevenue += revenue;
    });

    return {
      name: "Premium Add-On Features",
      monthlyRevenue: totalRevenue,
      margin: "100%",
      description: "Optional features riders purchase per ride",
      features: features,
      estimatedMonthly: totalRevenue.toFixed(2)
    };
  }

  // ===========================================================================
  // 4. TIPS - Initial Processing (0% payout to drivers)
  // ===========================================================================
  calculateTipsRevenue(activeRides, tipsPercentageOfRides, averageTip, mogoCommissionPercent) {
    /**
     * Mogo takes commission on tips upfront before sending to driver
     * Example: $5 tip → Mogo takes $1.50, driver gets $3.50
     *
     * Phase 1 (first 90 days): Mogo keeps all tips as onboarding cost
     * Phase 2: Mogo keeps 30% of tips for "processing"
     */

    const monthlyTips = activeRides * tipsPercentageOfRides * averageTip;
    const mogoTipsRevenue = monthlyTips * mogoCommissionPercent;

    return {
      name: "Tips Commission",
      monthlyRevenue: mogoTipsRevenue,
      margin: "100%",
      description: `Mogo takes ${mogoCommissionPercent * 100}% of tips for processing fee`,
      adoptionMetrics: {
        ridesWithTips: `${(tipsPercentageOfRides * 100).toFixed(0)}% of rides receive tips`,
        averageTipAmount: averageTip,
        estimatedMonthlyTips: monthlyTips.toFixed(2),
      },
      mogoRevenue: mogoTipsRevenue.toFixed(2),
      estimatedMonthly: mogoTipsRevenue.toFixed(2)
    };
  }

  // ===========================================================================
  // 5. MARKETPLACE - In-App Store (0% payout initially)
  // ===========================================================================
  calculateMarketplaceRevenue() {
    /**
     * Digital goods sold in Mogo app
     * - Rider badges/achievements
     * - Vehicle skins for drivers
     * - Profile customization
     * - Emotes/stickers
     * - Boosts (ride boost, driver boost)
     *
     * 100% pure profit, zero payout
     */

    const items = {
      profileBadges: { price: 0.99, monthlySales: 150 },
      vehicleSkins: { price: 4.99, monthlySales: 80 },
      driverBadges: { price: 1.99, monthlySales: 120 },
      rideBoosts: { price: 2.99, monthlySales: 200 },
      premiumEmotes: { price: 0.99, monthlySales: 300 },
    };

    let totalRevenue = 0;
    Object.entries(items).forEach(([key, item]) => {
      totalRevenue += item.price * item.monthlySales;
    });

    return {
      name: "In-App Marketplace",
      monthlyRevenue: totalRevenue,
      margin: "100%",
      description: "Digital goods and cosmetics",
      items: items,
      estimatedMonthly: totalRevenue.toFixed(2)
    };
  }

  // ===========================================================================
  // 6. DATA & ANALYTICS - Anonymized Insights (0% payout)
  // ===========================================================================
  calculateDataAnalyticsRevenue() {
    /**
     * Sell anonymized data to:
     * - Urban planners (traffic patterns)
     * - City governments (congestion data)
     * - Real estate companies (neighborhood demand)
     * - Insurance companies (accident patterns)
     * - Researchers (mobility trends)
     *
     * 100% profit, fully anonymized data
     */

    return {
      name: "Data & Analytics Licensing",
      monthlyRevenue: 8500,
      margin: "100%",
      description: "Sell anonymized mobility insights to third parties",
      dataSets: [
        "Traffic flow patterns by neighborhood",
        "Peak travel times and routes",
        "Demographic movement analysis",
        "Accident/safety hotspot reports",
        "Weather impact on demand",
      ],
      potentialBuyers: [
        "City planning departments",
        "Insurance companies",
        "Real estate firms",
        "Urban researchers",
        "Logistics companies",
      ],
      estimatedMonthly: "8500"
    };
  }

  // ===========================================================================
  // 7. WHITE LABEL & LICENSING (0% payout)
  // ===========================================================================
  calculateWhiteLabelRevenue() {
    /**
     * License mogo's platform to other cities/countries
     * - Mogo Technology License: $25,000/month per region
     * - Mogo Branding Package: $15,000/month
     * - Full Platform as a Service: $50,000/month
     *
     * Mogo takes 0 operational cost (licensing only)
     */

    return {
      name: "White Label & Licensing",
      monthlyRevenue: 75000, // Hypothetical: 1 full license, 1 tech license
      margin: "100%",
      description: "License platform to international partners",
      products: [
        { name: "Full Platform License", price: 50000, partners: 1 },
        { name: "Technology License", price: 25000, partners: 1 },
      ],
      estimatedMonthly: "75000"
    };
  }

  // ===========================================================================
  // 8. CORPORATE ACCOUNTS - B2B (0% payout)
  // ===========================================================================
  calculateCorporateAccountsRevenue() {
    /**
     * Charge corporations for employee ride accounts
     * - Company gets managed account
     * - Can set spend limits, billing codes
     * - Mogo takes 8% commission on rides + monthly fee
     */

    const corporateClients = 45;
    const monthlyFeesPerClient = 500;
    const estimatedRidesPerClient = 200;
    const estimatedRideValue = 25;
    const rideCommission = 0.08;

    const monthlyFees = corporateClients * monthlyFeesPerClient;
    const rideCommissions = corporateClients * estimatedRidesPerClient * estimatedRideValue * rideCommission;
    const totalRevenue = monthlyFees + rideCommissions;

    return {
      name: "Corporate Account Program",
      monthlyRevenue: totalRevenue,
      margin: "100%",
      description: "B2B corporate ride accounts with managed billing",
      structure: {
        monthlyManagementFee: monthlyFeesPerClient,
        rideCommissionPercent: 8,
        activeCorporateClients: corporateClients,
      },
      monthlyFeesRevenue: monthlyFees.toFixed(2),
      rideCommissionsRevenue: rideCommissions.toFixed(2),
      estimatedMonthly: totalRevenue.toFixed(2)
    };
  }

  // ===========================================================================
  // 9. INSURANCE & PROTECTION PLANS (0% payout)
  // ===========================================================================
  calculateInsurancePlansRevenue() {
    /**
     * Optional rider protection plans
     * - Trip protection: $0.99/ride
     * - Monthly insurance: $9.99/month
     * - Injury protection: $4.99/ride
     */

    const adoptionRate = 0.18; // 18% of users buy one
    const activeUsers = 487;
    const monthlySubscribers = activeUsers * adoptionRate;
    const monthlySubscriptionRevenue = monthlySubscribers * 9.99;

    const ridesPerMonth = 1254;
    const rideProtectionAdoption = 0.12;
    const perRideProtection = 0.99;
    const perRideRevenue = ridesPerMonth * rideProtectionAdoption * perRideProtection;

    const totalRevenue = monthlySubscriptionRevenue + perRideRevenue;

    return {
      name: "Insurance & Protection Plans",
      monthlyRevenue: totalRevenue,
      margin: "100%",
      description: "Optional rider insurance and protection packages",
      products: [
        { name: "Monthly Plan", price: 9.99, subscribers: monthlySubscribers.toFixed(0) },
        { name: "Per-Ride Protection", price: 0.99, adoptionRate: "12%" },
      ],
      subscriptionRevenue: monthlySubscriptionRevenue.toFixed(2),
      perRideRevenue: perRideRevenue.toFixed(2),
      estimatedMonthly: totalRevenue.toFixed(2)
    };
  }

  // ===========================================================================
  // 10. SPONSORED RIDES - Brand Partnerships (0% payout)
  // ===========================================================================
  calculateSponsoredRidesRevenue() {
    /**
     * Brands pay Mogo to sponsor free/discounted rides
     * - Movie premiere: "Free ride to theater opening"
     * - Store launch: "50% off rides to our new location"
     * - Event sponsorship: "Free rides during festival"
     *
     * Brands pay, riders save, Mogo keeps commission
     */

    return {
      name: "Sponsored Rides Program",
      monthlyRevenue: 12000,
      margin: "100%",
      description: "Brands pay for ride sponsorships and promotions",
      sponsorshipTypes: [
        "Event sponsorship ($5,000+)",
        "Store opening promotions ($3,000+)",
        "Movie/entertainment launch ($4,000+)",
        "Seasonal campaigns ($2,000+)",
      ],
      estimatedMonthly: "12000"
    };
  }

  // ===========================================================================
  // CALCULATE ALL PURE PROFIT STREAMS
  // ===========================================================================
  calculateTotalPureProfit() {
    const surgeRevenue = this.calculateSurgeRevenue(7.50, 1.5, 0.20); // 20% of rides surge
    const adRevenue = this.calculateAdvertisingRevenue(487, 3, 5); // $5 CPM
    const premiumFeatures = this.calculatePremiumFeaturesRevenue();
    const tipsRevenue = this.calculateTipsRevenue(1254, 0.25, 5, 0.30); // 30% commission
    const marketplace = this.calculateMarketplaceRevenue();
    const dataAnalytics = this.calculateDataAnalyticsRevenue();
    const whiteLable = this.calculateWhiteLabelRevenue();
    const corporateAccounts = this.calculateCorporateAccountsRevenue();
    const insurancePlans = this.calculateInsurancePlansRevenue();
    const sponsoredRides = this.calculateSponsoredRidesRevenue();

    const totalPureProfit =
      parseFloat(surgeRevenue.estimatedMonthly) +
      parseFloat(adRevenue.estimatedMonthly) +
      parseFloat(premiumFeatures.estimatedMonthly) +
      parseFloat(tipsRevenue.estimatedMonthly) +
      parseFloat(marketplace.estimatedMonthly) +
      parseFloat(dataAnalytics.estimatedMonthly) +
      parseFloat(whiteLable.estimatedMonthly) +
      parseFloat(corporateAccounts.estimatedMonthly) +
      parseFloat(insurancePlans.estimatedMonthly) +
      parseFloat(sponsoredRides.estimatedMonthly);

    return {
      allStreams: [
        surgeRevenue,
        adRevenue,
        premiumFeatures,
        tipsRevenue,
        marketplace,
        dataAnalytics,
        whiteLable,
        corporateAccounts,
        insurancePlans,
        sponsoredRides,
      ],
      totalMonthlyPureProfit: totalPureProfit.toFixed(2),
      currentSubscriptionRevenue: 15965,
      currentRidePlatformFees: 9406,
      totalCurrentMogoRevenue: 25371,
      potentialWithPureProfit: (25371 + totalPureProfit).toFixed(2),
      profitIncrease: ((totalPureProfit / 25371) * 100).toFixed(1),
    };
  }
}

// Export for use
module.exports = PureProfitRevenueStreams;
