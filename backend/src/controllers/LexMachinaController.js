const lexMachinaService = require('../services/LexMachinaService');
const ApiResponse = require('../lib/apiResponse');

class LexMachinaController {
  /**
   * Search cases across all court types
   */
  async searchCases(req, res) {
    try {
      const {
        query,
        caseType,
        jurisdiction,
        dateFrom,
        dateTo,
        judges,
        lawFirms,
        parties,
        practiceAreas,
        limit,
        offset
      } = req.query;

      if (!query) {
        return ApiResponse.error(res, 'Search query is required', 400);
      }

      const searchCriteria = {
        query,
        caseType,
        jurisdiction,
        dateFrom,
        dateTo,
        judges: judges ? judges.split(',') : undefined,
        lawFirms: lawFirms ? lawFirms.split(',') : undefined,
        parties: parties ? parties.split(',') : undefined,
        practiceAreas: practiceAreas ? practiceAreas.split(',') : undefined,
        limit: limit ? parseInt(limit) : undefined,
        offset: offset ? parseInt(offset) : undefined
      };

      const result = await lexMachinaService.searchCases(searchCriteria);

      if (result.success) {
        return ApiResponse.success(res, result.data, 'Cases retrieved successfully');
      } else {
        return ApiResponse.error(res, result.error, 500, { errorCode: result.errorCode });
      }

    } catch (error) {
      console.error('Search cases error:', error);
      return ApiResponse.error(res, 'Failed to search cases', 500, error);
    }
  }

  /**
   * Get detailed case information with analytics
   */
  async getCaseDetails(req, res) {
    try {
      const { caseId } = req.params;
      const { caseType = 'DistrictCases' } = req.query;

      if (!caseId) {
        return ApiResponse.error(res, 'Case ID is required', 400);
      }

      const result = await lexMachinaService.getCaseDetails(caseId, caseType);

      if (result.success) {
        return ApiResponse.success(res, result.data, 'Case details retrieved successfully');
      } else {
        return ApiResponse.error(res, result.error, 500, { errorCode: result.errorCode });
      }

    } catch (error) {
      console.error('Get case details error:', error);
      return ApiResponse.error(res, 'Failed to retrieve case details', 500, error);
    }
  }

  /**
   * Get judge analytics and performance metrics
   */
  async getJudgeAnalytics(req, res) {
    try {
      const { judgeId } = req.params;
      const {
        practiceAreas,
        dateFrom,
        dateTo,
        includeComparisons
      } = req.query;

      if (!judgeId) {
        return ApiResponse.error(res, 'Judge ID is required', 400);
      }

      const options = {
        practiceAreas: practiceAreas ? practiceAreas.split(',') : undefined,
        dateFrom,
        dateTo,
        includeComparisons: includeComparisons === 'true'
      };

      const result = await lexMachinaService.getJudgeAnalytics(judgeId, options);

      if (result.success) {
        return ApiResponse.success(res, result.data, 'Judge analytics retrieved successfully');
      } else {
        return ApiResponse.error(res, result.error, 500, { errorCode: result.errorCode });
      }

    } catch (error) {
      console.error('Get judge analytics error:', error);
      return ApiResponse.error(res, 'Failed to retrieve judge analytics', 500, error);
    }
  }

  /**
   * Get law firm performance analytics
   */
  async getLawFirmAnalytics(req, res) {
    try {
      const { firmId } = req.params;
      const {
        practiceAreas,
        dateFrom,
        dateTo,
        attorneyId,
        includeAttorneys
      } = req.query;

      if (!firmId) {
        return ApiResponse.error(res, 'Law firm ID is required', 400);
      }

      const options = {
        practiceAreas: practiceAreas ? practiceAreas.split(',') : undefined,
        dateFrom,
        dateTo,
        attorneyId,
        includeAttorneys: includeAttorneys === 'true'
      };

      const result = await lexMachinaService.getLawFirmAnalytics(firmId, options);

      if (result.success) {
        return ApiResponse.success(res, result.data, 'Law firm analytics retrieved successfully');
      } else {
        return ApiResponse.error(res, result.error, 500, { errorCode: result.errorCode });
      }

    } catch (error) {
      console.error('Get law firm analytics error:', error);
      return ApiResponse.error(res, 'Failed to retrieve law firm analytics', 500, error);
    }
  }

  /**
   * Get case predictions using ML models
   */
  async getCasePredictions(req, res) {
    try {
      const { caseId } = req.params;
      const { caseType = 'DistrictCases' } = req.query;

      if (!caseId) {
        return ApiResponse.error(res, 'Case ID is required', 400);
      }

      // First get case details
      const caseDetails = await lexMachinaService.getCaseDetails(caseId, caseType);
      
      if (!caseDetails.success) {
        return ApiResponse.error(res, 'Case not found', 404);
      }

      const result = await lexMachinaService.getCasePredictions(caseDetails.data);

      if (result.success) {
        return ApiResponse.success(res, result.data, 'Case predictions generated successfully');
      } else {
        return ApiResponse.error(res, result.error, 500, { errorCode: result.errorCode });
      }

    } catch (error) {
      console.error('Get case predictions error:', error);
      return ApiResponse.error(res, 'Failed to generate case predictions', 500, error);
    }
  }

  /**
   * Get litigation trends and market intelligence
   */
  async getLitigationTrends(req, res) {
    try {
      const {
        practiceAreas,
        jurisdiction,
        dateFrom,
        dateTo,
        trendType
      } = req.query;

      const options = {
        practiceAreas: practiceAreas ? practiceAreas.split(',') : undefined,
        jurisdiction,
        dateFrom,
        dateTo,
        trendType
      };

      const result = await lexMachinaService.getLitigationTrends(options);

      if (result.success) {
        return ApiResponse.success(res, result.data, 'Litigation trends retrieved successfully');
      } else {
        return ApiResponse.error(res, result.error, 500, { errorCode: result.errorCode });
      }

    } catch (error) {
      console.error('Get litigation trends error:', error);
      return ApiResponse.error(res, 'Failed to retrieve litigation trends', 500, error);
    }
  }

  /**
   * Get damages analytics and benchmarking
   */
  async getDamagesAnalytics(req, res) {
    try {
      const { practiceArea } = req.params;
      const {
        jurisdiction,
        caseType,
        dateFrom,
        dateTo,
        includeSettlements
      } = req.query;

      if (!practiceArea) {
        return ApiResponse.error(res, 'Practice area is required', 400);
      }

      const options = {
        jurisdiction,
        caseType,
        dateFrom,
        dateTo,
        includeSettlements: includeSettlements === 'true'
      };

      const result = await lexMachinaService.getDamagesAnalytics(practiceArea, options);

      if (result.success) {
        return ApiResponse.success(res, result.data, 'Damages analytics retrieved successfully');
      } else {
        return ApiResponse.error(res, result.error, 500, { errorCode: result.errorCode });
      }

    } catch (error) {
      console.error('Get damages analytics error:', error);
      return ApiResponse.error(res, 'Failed to retrieve damages analytics', 500, error);
    }
  }

  /**
   * Get competitive intelligence report
   */
  async getCompetitiveIntelligence(req, res) {
    try {
      const { practiceArea, jurisdiction } = req.query;
      const { lawFirm } = req.params;

      if (!lawFirm || !practiceArea) {
        return ApiResponse.error(res, 'Law firm and practice area are required', 400);
      }

      // Get firm analytics
      const firmAnalytics = await lexMachinaService.getLawFirmAnalytics(lawFirm, {
        practiceAreas: [practiceArea],
        includeAttorneys: true
      });

      // Get market trends
      const trends = await lexMachinaService.getLitigationTrends({
        practiceAreas: [practiceArea],
        jurisdiction
      });

      // Get damages benchmarks
      const damages = await lexMachinaService.getDamagesAnalytics(practiceArea, {
        jurisdiction
      });

      const intelligence = {
        firmProfile: firmAnalytics.data || {},
        marketTrends: trends.data || {},
        damagesBenchmarks: damages.data || {},
        competitivePosition: this.analyzeCompetitivePosition(firmAnalytics.data, trends.data),
        recommendations: this.generateCompetitiveRecommendations(firmAnalytics.data, trends.data),
        generatedAt: new Date().toISOString()
      };

      return ApiResponse.success(res, intelligence, 'Competitive intelligence report generated successfully');

    } catch (error) {
      console.error('Get competitive intelligence error:', error);
      return ApiResponse.error(res, 'Failed to generate competitive intelligence report', 500, error);
    }
  }

  /**
   * Get strategic case insights
   */
  async getStrategicInsights(req, res) {
    try {
      const { caseId } = req.params;
      const { includeRecommendations = 'true' } = req.query;

      if (!caseId) {
        return ApiResponse.error(res, 'Case ID is required', 400);
      }

      // Get comprehensive case analysis
      const caseDetails = await lexMachinaService.getCaseDetails(caseId);
      
      if (!caseDetails.success) {
        return ApiResponse.error(res, 'Case not found', 404);
      }

      const case_data = caseDetails.data;
      const insights = {
        caseOverview: {
          complexity: case_data.complexity || 'medium',
          riskLevel: this.assessRiskLevel(case_data),
          strategicValue: this.assessStrategicValue(case_data)
        },
        keyInsights: case_data.insights || {},
        predictions: case_data.predictions || {},
        competitiveAnalysis: this.analyzeOpposition(case_data),
        timelineAnalysis: this.analyzeTimeline(case_data),
        venueAnalysis: this.analyzeVenue(case_data)
      };

      if (includeRecommendations === 'true') {
        insights.strategicRecommendations = this.generateStrategicRecommendations(case_data, insights);
        insights.riskMitigation = this.generateRiskMitigation(case_data, insights);
      }

      return ApiResponse.success(res, insights, 'Strategic insights generated successfully');

    } catch (error) {
      console.error('Get strategic insights error:', error);
      return ApiResponse.error(res, 'Failed to generate strategic insights', 500, error);
    }
  }

  /**
   * Get practice area intelligence
   */
  async getPracticeAreaIntelligence(req, res) {
    try {
      const { practiceArea } = req.params;
      const { jurisdiction, dateRange = '12months' } = req.query;

      if (!practiceArea) {
        return ApiResponse.error(res, 'Practice area is required', 400);
      }

      const dateFrom = this.getDateFromRange(dateRange);
      const dateTo = new Date().toISOString().split('T')[0];

      // Gather comprehensive practice area data
      const [trends, damages, topFirms] = await Promise.allSettled([
        lexMachinaService.getLitigationTrends({
          practiceAreas: [practiceArea],
          jurisdiction,
          dateFrom,
          dateTo
        }),
        lexMachinaService.getDamagesAnalytics(practiceArea, {
          jurisdiction,
          dateFrom,
          dateTo
        }),
        this.getTopFirmsInPracticeArea(practiceArea, jurisdiction)
      ]);

      const intelligence = {
        practiceArea: practiceArea,
        jurisdiction: jurisdiction || 'All',
        analysisWindow: dateRange,
        trends: trends.status === 'fulfilled' ? trends.value.data : {},
        damages: damages.status === 'fulfilled' ? damages.value.data : {},
        marketLeaders: topFirms.status === 'fulfilled' ? topFirms.value : [],
        insights: this.generatePracticeAreaInsights(
          practiceArea, 
          trends.value?.data, 
          damages.value?.data
        ),
        opportunities: this.identifyPracticeAreaOpportunities(
          trends.value?.data, 
          damages.value?.data
        ),
        generatedAt: new Date().toISOString()
      };

      return ApiResponse.success(res, intelligence, 'Practice area intelligence generated successfully');

    } catch (error) {
      console.error('Get practice area intelligence error:', error);
      return ApiResponse.error(res, 'Failed to generate practice area intelligence', 500, error);
    }
  }

  // Helper methods
  analyzeCompetitivePosition(firmData, trendsData) {
    if (!firmData?.performance) return {};

    return {
      marketPosition: firmData.performance.market_share > 0.1 ? 'leader' : 'competitor',
      strengthAreas: firmData.insights?.strengths || [],
      growthAreas: firmData.insights?.weaknesses || [],
      marketTrend: trendsData?.trends?.filing_volume_trend || 'stable'
    };
  }

  generateCompetitiveRecommendations(firmData, trendsData) {
    const recommendations = [];

    if (firmData?.performance?.trial_rate < 0.2) {
      recommendations.push({
        category: 'capability',
        priority: 'high',
        recommendation: 'Develop trial capabilities to compete effectively',
        rationale: 'Low trial rate compared to market leaders'
      });
    }

    if (trendsData?.trends?.emerging_legal_issues) {
      recommendations.push({
        category: 'market_opportunity',
        priority: 'medium',
        recommendation: 'Develop expertise in emerging legal areas',
        rationale: 'Market showing growth in new practice areas'
      });
    }

    return recommendations;
  }

  assessRiskLevel(caseData) {
    let riskScore = 0;
    
    if (caseData.complexity === 'high') riskScore += 3;
    if (caseData.damages_sought > 10000000) riskScore += 2;
    if (caseData.analytics?.opposing_counsel?.win_rate > 0.7) riskScore += 3;
    if (caseData.practice_area === 'antitrust') riskScore += 2;

    if (riskScore >= 6) return 'high';
    if (riskScore >= 3) return 'medium';
    return 'low';
  }

  assessStrategicValue(caseData) {
    let value = 'medium';
    
    if (caseData.practice_area === 'patent' && caseData.damages_sought > 50000000) {
      value = 'high';
    } else if (caseData.precedential_value === 'high') {
      value = 'high';
    }
    
    return value;
  }

  analyzeOpposition(caseData) {
    return {
      opposingCounsel: caseData.analytics?.opposing_counsel || {},
      historicalPerformance: caseData.analytics?.opposition_history || {},
      strengths: ['Experienced in practice area', 'Strong trial record'],
      weaknesses: ['Limited local presence', 'High caseload']
    };
  }

  analyzeTimeline(caseData) {
    return {
      expectedDuration: caseData.predictions?.expectedDuration || {},
      criticalMilestones: caseData.timeline?.milestones || [],
      riskFactors: caseData.insights?.riskFactors?.filter(r => r.type === 'timing_risk') || []
    };
  }

  analyzeVenue(caseData) {
    return {
      venueProfile: caseData.analytics?.venue || {},
      historicalOutcomes: caseData.venue_analytics || {},
      advantages: ['Favorable to plaintiffs', 'Experienced in practice area'],
      considerations: ['Local jury pool characteristics', 'Judge assignment patterns']
    };
  }

  generateStrategicRecommendations(caseData, insights) {
    const recommendations = [];

    if (insights.caseOverview.riskLevel === 'high') {
      recommendations.push({
        category: 'risk_management',
        priority: 'urgent',
        recommendation: 'Consider early settlement negotiations',
        rationale: 'High-risk case with significant downside exposure'
      });
    }

    if (caseData.predictions?.settlementLikelihood?.likelihood > 0.7) {
      recommendations.push({
        category: 'settlement_strategy',
        priority: 'high',
        recommendation: 'Prepare comprehensive settlement strategy',
        rationale: 'High probability of settlement based on case characteristics'
      });
    }

    return recommendations;
  }

  generateRiskMitigation(caseData, insights) {
    return {
      primaryRisks: insights.caseOverview.riskLevel,
      mitigationStrategies: [
        'Regular case assessment and strategy review',
        'Maintain open settlement discussions',
        'Prepare for alternative dispute resolution'
      ],
      contingencyPlans: [
        'Budget allocation for extended litigation',
        'Expert witness preparation',
        'Appeal strategy development'
      ]
    };
  }

  getDateFromRange(dateRange) {
    const now = new Date();
    let months = 12;

    switch (dateRange) {
      case '3months': months = 3; break;
      case '6months': months = 6; break;
      case '12months': months = 12; break;
      case '24months': months = 24; break;
      default: months = 12;
    }

    now.setMonth(now.getMonth() - months);
    return now.toISOString().split('T')[0];
  }

  async getTopFirmsInPracticeArea(practiceArea, jurisdiction) {
    // Mock implementation - would integrate with actual API
    return [
      { name: 'Firm A', winRate: 0.75, caseCount: 150 },
      { name: 'Firm B', winRate: 0.72, caseCount: 120 },
      { name: 'Firm C', winRate: 0.68, caseCount: 200 }
    ];
  }

  generatePracticeAreaInsights(practiceArea, trendsData, damagesData) {
    return {
      marketSummary: `${practiceArea} showing steady growth with increasing case complexity`,
      keyTrends: trendsData?.insights?.keyDrivers || [],
      damagesTrends: damagesData?.insights?.marketConditions || '',
      outlook: trendsData?.insights?.forecast || 'Stable growth expected'
    };
  }

  identifyPracticeAreaOpportunities(trendsData, damagesData) {
    return [
      {
        opportunity: 'Emerging technology disputes',
        potential: 'high',
        timeline: '6-12 months',
        description: 'Growing litigation in AI and blockchain space'
      },
      {
        opportunity: 'Cross-border disputes',
        potential: 'medium', 
        timeline: '12-18 months',
        description: 'International business complexity driving litigation'
      }
    ];
  }
}

module.exports = new LexMachinaController();