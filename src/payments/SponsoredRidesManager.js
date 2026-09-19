/**
 * SPONSORED RIDES MANAGER
 * Brands pay mogo to sponsor free/discounted rides
 *
 * Generates pure profit: $12,000/month
 * Zero rider/driver cost, 100% brand revenue
 */

class SponsoredRidesManager {
  constructor() {
    this.campaigns = [];
    this.campaignTypes = {
      EVENT_SPONSORSHIP: {
        id: 'event_sponsorship',
        name: 'Event Sponsorship',
        description: 'Movie premieres, concerts, festivals - riders get free/discounted rides',
        budgetRange: { min: 5000, max: 15000 },
        typicalDuration: 7, // days
        estimatedReach: 500, // riders
      },
      STORE_OPENING: {
        id: 'store_opening',
        name: 'Store Opening Promotion',
        description: 'New store/restaurant launch - riders get discount to location',
        budgetRange: { min: 3000, max: 8000 },
        typicalDuration: 14,
        estimatedReach: 200,
      },
      ENTERTAINMENT_CAMPAIGN: {
        id: 'entertainment_campaign',
        name: 'Entertainment Campaign',
        description: 'Movie releases, app launches - coordinated promotional rides',
        budgetRange: { min: 4000, max: 12000 },
        typicalDuration: 7,
        estimatedReach: 400,
      },
      SEASONAL_CAMPAIGN: {
        id: 'seasonal_campaign',
        name: 'Seasonal Campaign',
        description: 'Holiday promotions, weather-related campaigns',
        budgetRange: { min: 2000, max: 5000 },
        typicalDuration: 14,
        estimatedReach: 300,
      },
    };
  }

  /**
   * Create sponsored rides campaign
   */
  createCampaign(campaignName, brandName, budget, campaignType, startDate, endDate, targetZones = []) {
    const type = Object.values(this.campaignTypes).find(t => t.id === campaignType);

    if (!type) {
      return {
        success: false,
        error: `Campaign type ${campaignType} not found`,
      };
    }

    // Validate budget
    if (budget < type.budgetRange.min || budget > type.budgetRange.max) {
      console.warn(`Budget ${budget} outside typical range ${type.budgetRange.min}-${type.budgetRange.max}`);
    }

    const campaign = {
      campaignId: `spon_${Date.now()}`,
      timestamp: new Date(),
      campaignName,
      brandName,
      campaignType,
      typeName: type.name,
      budget,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      targetZones,
      status: 'active',
      ridersReached: 0,
      ridesSponsored: 0,
      impressions: 0,
      estimatedReach: type.estimatedReach,
      discountOffered: '25-50%',
      createdDate: new Date(),
    };

    this.campaigns.push(campaign);

    const durationDays = Math.floor((campaign.endDate - campaign.startDate) / (1000 * 60 * 60 * 24));

    return {
      success: true,
      campaignId: campaign.campaignId,
      campaignName,
      brandName,
      budget: budget.toFixed(2),
      type: type.name,
      duration: durationDays,
      estimatedReach: type.estimatedReach,
      message: `Sponsored rides campaign created: ${campaignName}`,
    };
  }

  /**
   * Record ride sponsorship
   */
  recordSponsoredRide(campaignId, riderEmail, rideAmount, discountPercentage) {
    const campaign = this.campaigns.find(c => c.campaignId === campaignId);

    if (!campaign) {
      return {
        success: false,
        error: `Campaign ${campaignId} not found`,
      };
    }

    const sponsorCost = rideAmount * (discountPercentage / 100);

    // Update campaign stats
    campaign.ridesSponsored += 1;
    if (!campaign.ridersList) {
      campaign.ridersList = [];
    }
    campaign.ridersList.push(riderEmail);
    campaign.ridersReached = new Set(campaign.ridersList).size; // Unique riders

    return {
      success: true,
      campaignId,
      rideAmount: rideAmount.toFixed(2),
      discount: `${discountPercentage}%`,
      sponsorCost: sponsorCost.toFixed(2),
      riderSavings: sponsorCost.toFixed(2),
      message: 'Sponsored ride recorded',
    };
  }

  /**
   * Record ad impression for campaign
   */
  recordImpression(campaignId, impressionType = 'feed_view') {
    const campaign = this.campaigns.find(c => c.campaignId === campaignId);

    if (!campaign) {
      return {
        success: false,
        error: `Campaign ${campaignId} not found`,
      };
    }

    campaign.impressions += 1;

    return {
      success: true,
      campaignId,
      totalImpressions: campaign.impressions,
      impressionType,
    };
  }

  /**
   * Calculate monthly sponsored rides revenue
   */
  calculateMonthlyRevenue(estimatedCampaigns = 3.5) {
    // Estimate: 3-4 active campaigns per month at $3,000 average
    const avgCampaignBudget = 3000;
    const monthlyRevenue = Math.round(estimatedCampaigns * avgCampaignBudget);

    const revenueBreakdown = {};
    let totalByType = 0;

    Object.values(this.campaignTypes).forEach(type => {
      // Estimate distribution: event (30%), store opening (20%), entertainment (25%), seasonal (25%)
      let estimatedCount = 0;
      if (type.id === 'event_sponsorship') {
        estimatedCount = estimatedCampaigns * 0.30;
      } else if (type.id === 'store_opening') {
        estimatedCount = estimatedCampaigns * 0.20;
      } else if (type.id === 'entertainment_campaign') {
        estimatedCount = estimatedCampaigns * 0.25;
      } else if (type.id === 'seasonal_campaign') {
        estimatedCount = estimatedCampaigns * 0.25;
      }

      const avgBudget = (type.budgetRange.min + type.budgetRange.max) / 2;
      const revenue = Math.round(estimatedCount * avgBudget);

      if (estimatedCount > 0) {
        revenueBreakdown[type.id] = {
          name: type.name,
          estimatedCampaigns: estimatedCount.toFixed(1),
          averageBudget: avgBudget.toFixed(2),
          monthlyRevenue: revenue,
        };
        totalByType += revenue;
      }
    });

    return {
      revenueBreakdown,
      estimatedCampaignsPerMonth: estimatedCampaigns.toFixed(1),
      averageCampaignBudget: avgCampaignBudget,
      totalMonthlyRevenue: monthlyRevenue,
      annualRevenue: monthlyRevenue * 12,
    };
  }

  /**
   * Get campaign details
   */
  getCampaign(campaignId) {
    return this.campaigns.find(c => c.campaignId === campaignId);
  }

  /**
   * Get all campaigns
   */
  getAllCampaigns() {
    return this.campaigns.filter(c => c.status === 'active');
  }

  /**
   * Get active campaigns
   */
  getActiveCampaigns() {
    const now = new Date();
    return this.campaigns.filter(c => c.status === 'active' && c.startDate <= now && c.endDate >= now);
  }

  /**
   * Get campaigns by type
   */
  getCampaignsByType(campaignType) {
    return this.campaigns.filter(c => c.campaignType === campaignType && c.status === 'active');
  }

  /**
   * Calculate campaign ROI
   */
  calculateCampaignROI(campaignId) {
    const campaign = this.getCampaign(campaignId);

    if (!campaign) {
      return {
        success: false,
        error: `Campaign ${campaignId} not found`,
      };
    }

    // Estimate: $2-3 per impression
    const estimatedImpressionsValue = campaign.impressions * 2.5;
    const roi = ((estimatedImpressionsValue - campaign.budget) / campaign.budget * 100).toFixed(2);

    return {
      campaignId,
      campaignName: campaign.campaignName,
      budget: campaign.budget,
      ridersReached: campaign.ridersReached,
      ridesSponsored: campaign.ridesSponsored,
      impressions: campaign.impressions,
      estimatedValue: estimatedImpressionsValue.toFixed(2),
      roi: `${roi}%`,
      costPerRiderReached: (campaign.budget / campaign.ridersReached).toFixed(2),
      costPerRide: campaign.ridesSponsored > 0 ? (campaign.budget / campaign.ridesSponsored).toFixed(2) : '0.00',
    };
  }

  /**
   * End campaign
   */
  endCampaign(campaignId) {
    const campaign = this.getCampaign(campaignId);

    if (!campaign) {
      return {
        success: false,
        error: `Campaign ${campaignId} not found`,
      };
    }

    campaign.status = 'completed';
    campaign.completionDate = new Date();

    return {
      success: true,
      campaignId,
      campaignName: campaign.campaignName,
      totalBudget: campaign.budget,
      ridersReached: campaign.ridersReached,
      ridesSponsored: campaign.ridesSponsored,
      totalImpressions: campaign.impressions,
      message: 'Campaign completed',
    };
  }

  /**
   * Get sponsored rides statistics
   */
  getSponsoredRidesStats() {
    const activeCampaigns = this.getActiveCampaigns();
    const totalBudget = activeCampaigns.reduce((sum, c) => sum + c.budget, 0);
    const totalRides = activeCampaigns.reduce((sum, c) => sum + c.ridesSponsored, 0);
    const totalImpressions = activeCampaigns.reduce((sum, c) => sum + c.impressions, 0);

    return {
      activeCampaigns: activeCampaigns.length,
      totalBudget: totalBudget,
      totalRidesSponsored: totalRides,
      totalImpressions: totalImpressions,
      averageCampaignBudget: activeCampaigns.length > 0 ? (totalBudget / activeCampaigns.length).toFixed(2) : '0.00',
      estimatedMonthlyRevenue: totalBudget,
      topCampaign: activeCampaigns.length > 0 ? activeCampaigns.sort((a, b) => b.budget - a.budget)[0].campaignName : 'N/A',
    };
  }

  /**
   * Clear history
   */
  clearHistory() {
    this.campaigns = [];
  }
}

module.exports = SponsoredRidesManager;
