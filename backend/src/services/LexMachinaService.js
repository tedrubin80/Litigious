const axios = require('axios');

/**
 * Lex Machina Legal Analytics Service
 * 
 * Provides comprehensive litigation analytics and insights including:
 * - Federal District Court cases
 * - Federal Appeals Court cases  
 * - State Court cases
 * - Judge analytics and insights
 * - Law firm performance metrics
 * - Case outcome predictions
 * - Litigation trends and patterns
 */
class LexMachinaService {
  constructor() {
    this.baseURL = process.env.LEX_MACHINA_BASE_URL || 'https://api.lexmachina.com';
    this.apiKey = process.env.LEX_MACHINA_API_KEY;
    
    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'LegalEstate-Platform/1.0'
      },
      timeout: 30000
    });

    // Case types supported by Lex Machina
    this.CASE_TYPES = {
      DISTRICT: 'DistrictCases',
      APPEALS: 'AppealsCases', 
      STATE: 'StateCases',
      PTAB: 'PTABCases',
      ITC: 'ITCCases'
    };

    // Analytics categories
    this.ANALYTICS_TYPES = {
      JUDGE: 'judge',
      LAW_FIRM: 'law_firm',
      PARTY: 'party',
      CASE: 'case',
      DAMAGES: 'damages',
      TIMING: 'timing',
      OUTCOMES: 'outcomes'
    };

    // Prediction models
    this.PREDICTION_MODELS = {
      CASE_DURATION: 'case_duration',
      WIN_RATE: 'win_rate',
      SETTLEMENT_LIKELIHOOD: 'settlement_likelihood',
      DAMAGES_ESTIMATE: 'damages_estimate',
      APPEAL_LIKELIHOOD: 'appeal_likelihood'
    };

    console.log('🏛️ Lex Machina Legal Analytics Service initialized');
  }

  /**
   * Search cases across all court types
   */
  async searchCases(searchCriteria) {
    const {
      query,
      caseType = this.CASE_TYPES.DISTRICT,
      jurisdiction,
      dateFrom,
      dateTo,
      judges,
      lawFirms,
      parties,
      practiceAreas,
      limit = 100,
      offset = 0
    } = searchCriteria;

    try {
      const params = {
        q: query,
        jurisdiction,
        filed_after: dateFrom,
        filed_before: dateTo,
        judges: judges?.join(','),
        law_firms: lawFirms?.join(','),
        parties: parties?.join(','),
        practice_areas: practiceAreas?.join(','),
        limit,
        offset
      };

      // Remove undefined params
      Object.keys(params).forEach(key => 
        params[key] === undefined && delete params[key]
      );

      const response = await this.client.get(`/api/v1/${caseType}/search`, { params });

      return {
        success: true,
        data: {
          cases: response.data.results,
          totalCount: response.data.count,
          searchCriteria: searchCriteria,
          pagination: {
            limit,
            offset,
            hasMore: response.data.results.length === limit
          }
        }
      };

    } catch (error) {
      console.error('Lex Machina case search error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        errorCode: error.response?.status || 'SEARCH_ERROR'
      };
    }
  }

  /**
   * Get detailed case information
   */
  async getCaseDetails(caseId, caseType = this.CASE_TYPES.DISTRICT) {
    try {
      const response = await this.client.get(`/api/v1/${caseType}/${caseId}`);
      
      const caseData = response.data;
      
      // Enrich with analytics
      const analytics = await this.getCaseAnalytics(caseId, caseType);
      const predictions = await this.getCasePredictions(caseData);
      
      return {
        success: true,
        data: {
          ...caseData,
          analytics: analytics.data || {},
          predictions: predictions.data || {},
          insights: this.generateCaseInsights(caseData, analytics.data)
        }
      };

    } catch (error) {
      console.error('Lex Machina case details error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        errorCode: error.response?.status || 'CASE_DETAILS_ERROR'
      };
    }
  }

  /**
   * Get judge analytics and performance metrics
   */
  async getJudgeAnalytics(judgeId, options = {}) {
    const {
      practiceAreas,
      dateFrom,
      dateTo,
      includeComparisons = true
    } = options;

    try {
      const params = {
        practice_areas: practiceAreas?.join(','),
        filed_after: dateFrom,
        filed_before: dateTo
      };

      Object.keys(params).forEach(key => 
        params[key] === undefined && delete params[key]
      );

      const [profile, statistics, trends] = await Promise.all([
        this.client.get(`/api/v1/judges/${judgeId}`),
        this.client.get(`/api/v1/judges/${judgeId}/statistics`, { params }),
        this.client.get(`/api/v1/judges/${judgeId}/trends`, { params })
      ]);

      const analytics = {
        profile: profile.data,
        statistics: statistics.data,
        trends: trends.data,
        insights: this.generateJudgeInsights(profile.data, statistics.data, trends.data)
      };

      // Add peer comparisons if requested
      if (includeComparisons) {
        const comparisons = await this.getJudgeComparisons(judgeId, practiceAreas);
        analytics.comparisons = comparisons.data || {};
      }

      return {
        success: true,
        data: analytics
      };

    } catch (error) {
      console.error('Lex Machina judge analytics error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        errorCode: error.response?.status || 'JUDGE_ANALYTICS_ERROR'
      };
    }
  }

  /**
   * Get law firm performance analytics
   */
  async getLawFirmAnalytics(firmId, options = {}) {
    const {
      practiceAreas,
      dateFrom,
      dateTo,
      attorneyId,
      includeAttorneys = false
    } = options;

    try {
      const params = {
        practice_areas: practiceAreas?.join(','),
        filed_after: dateFrom,
        filed_before: dateTo,
        attorney: attorneyId
      };

      Object.keys(params).forEach(key => 
        params[key] === undefined && delete params[key]
      );

      const [profile, performance, cases] = await Promise.all([
        this.client.get(`/api/v1/law-firms/${firmId}`),
        this.client.get(`/api/v1/law-firms/${firmId}/performance`, { params }),
        this.client.get(`/api/v1/law-firms/${firmId}/cases`, { 
          params: { ...params, limit: 50 } 
        })
      ]);

      const analytics = {
        profile: profile.data,
        performance: performance.data,
        recentCases: cases.data.results || [],
        insights: this.generateFirmInsights(profile.data, performance.data)
      };

      // Add attorney-level analytics if requested
      if (includeAttorneys) {
        const attorneys = await this.getFirmAttorneys(firmId);
        analytics.attorneys = attorneys.data || [];
      }

      return {
        success: true,
        data: analytics
      };

    } catch (error) {
      console.error('Lex Machina law firm analytics error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        errorCode: error.response?.status || 'FIRM_ANALYTICS_ERROR'
      };
    }
  }

  /**
   * Get case outcome predictions using ML models
   */
  async getCasePredictions(caseData) {
    try {
      // Extract features for prediction
      const features = this.extractCaseFeatures(caseData);
      
      const predictions = {};

      // Case duration prediction
      if (features.judgeTiming && features.practiceArea) {
        predictions.expectedDuration = await this.predictCaseDuration(features);
      }

      // Win rate prediction based on historical data
      if (features.lawFirms && features.practiceArea) {
        predictions.winRatePrediction = await this.predictWinRate(features);
      }

      // Settlement likelihood
      if (features.caseType && features.damages) {
        predictions.settlementLikelihood = await this.predictSettlementLikelihood(features);
      }

      // Appeal likelihood
      if (caseData.resolution_type) {
        predictions.appealLikelihood = await this.predictAppealLikelihood(features);
      }

      return {
        success: true,
        data: {
          predictions,
          confidence: this.calculatePredictionConfidence(predictions),
          modelVersion: '2.1',
          lastUpdated: new Date().toISOString()
        }
      };

    } catch (error) {
      console.error('Case predictions error:', error);
      return {
        success: false,
        error: error.message,
        errorCode: 'PREDICTION_ERROR'
      };
    }
  }

  /**
   * Get litigation trends and market intelligence
   */
  async getLitigationTrends(options = {}) {
    const {
      practiceAreas,
      jurisdiction,
      dateFrom,
      dateTo,
      trendType = 'filing_volume'
    } = options;

    try {
      const params = {
        practice_areas: practiceAreas?.join(','),
        jurisdiction,
        filed_after: dateFrom,
        filed_before: dateTo,
        trend_type: trendType
      };

      Object.keys(params).forEach(key => 
        params[key] === undefined && delete params[key]
      );

      const response = await this.client.get('/api/v1/trends', { params });

      const trends = response.data;
      
      return {
        success: true,
        data: {
          trends: trends,
          insights: this.generateTrendInsights(trends),
          recommendations: this.generateTrendRecommendations(trends),
          marketIntelligence: this.extractMarketIntelligence(trends)
        }
      };

    } catch (error) {
      console.error('Litigation trends error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        errorCode: error.response?.status || 'TRENDS_ERROR'
      };
    }
  }

  /**
   * Get damages analytics and benchmarking
   */
  async getDamagesAnalytics(practiceArea, options = {}) {
    const {
      jurisdiction,
      caseType = 'patent',
      dateFrom,
      dateTo,
      includeSettlements = true
    } = options;

    try {
      const params = {
        practice_area: practiceArea,
        jurisdiction,
        case_type: caseType,
        filed_after: dateFrom,
        filed_before: dateTo,
        include_settlements: includeSettlements
      };

      Object.keys(params).forEach(key => 
        params[key] === undefined && delete params[key]
      );

      const response = await this.client.get('/api/v1/damages', { params });

      const damagesData = response.data;

      return {
        success: true,
        data: {
          statistics: damagesData.statistics,
          distributions: damagesData.distributions,
          benchmarks: damagesData.benchmarks,
          insights: this.generateDamagesInsights(damagesData),
          recommendations: this.generateDamagesBenchmarks(damagesData)
        }
      };

    } catch (error) {
      console.error('Damages analytics error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        errorCode: error.response?.status || 'DAMAGES_ERROR'
      };
    }
  }

  /**
   * Generate comprehensive case insights
   */
  generateCaseInsights(caseData, analytics) {
    const insights = {
      riskFactors: [],
      opportunities: [],
      strategicRecommendations: [],
      competitiveIntelligence: {}
    };

    // Risk factor analysis
    if (analytics?.judge?.median_case_duration > caseData.average_duration) {
      insights.riskFactors.push({
        type: 'timing_risk',
        severity: 'medium',
        description: 'Judge typically handles cases slower than average',
        impact: 'Potential for extended litigation timeline'
      });
    }

    if (analytics?.opposing_counsel?.win_rate > 0.7) {
      insights.riskFactors.push({
        type: 'opposing_counsel',
        severity: 'high', 
        description: 'Opposing counsel has high success rate in similar cases',
        impact: 'Strong opposition with proven track record'
      });
    }

    // Opportunity identification
    if (analytics?.venue?.plaintiff_win_rate > 0.6) {
      insights.opportunities.push({
        type: 'favorable_venue',
        potential: 'high',
        description: 'Venue historically favorable to plaintiffs',
        action: 'Leverage venue advantages in strategy'
      });
    }

    // Strategic recommendations
    if (caseData.practice_area === 'patent' && analytics?.damages?.median < 1000000) {
      insights.strategicRecommendations.push({
        type: 'settlement_strategy',
        priority: 'high',
        recommendation: 'Consider early settlement given lower damages patterns',
        rationale: 'Historical damages in this venue are typically lower'
      });
    }

    return insights;
  }

  /**
   * Generate judge-specific insights
   */
  generateJudgeInsights(profile, statistics, trends) {
    return {
      temperament: this.analyzeJudgeTemperament(statistics),
      preferences: this.identifyJudgePreferences(profile, statistics),
      patterns: this.identifyJudgePatterns(trends),
      recommendations: this.generateJudgeRecommendations(profile, statistics)
    };
  }

  /**
   * Generate law firm insights
   */
  generateFirmInsights(profile, performance) {
    return {
      strengths: this.identifyFirmStrengths(performance),
      weaknesses: this.identifyFirmWeaknesses(performance), 
      specializations: this.identifyFirmSpecializations(profile, performance),
      competitivePosition: this.analyzeFirmPosition(performance)
    };
  }

  /**
   * Extract case features for ML predictions
   */
  extractCaseFeatures(caseData) {
    return {
      practiceArea: caseData.practice_area,
      caseType: caseData.case_type,
      jurisdiction: caseData.jurisdiction,
      judge: caseData.assigned_judge,
      judgeTiming: caseData.judge_median_duration,
      lawFirms: caseData.law_firms,
      parties: caseData.parties,
      damages: caseData.damages_sought,
      complexity: this.assessCaseComplexity(caseData),
      venue: caseData.venue
    };
  }

  /**
   * Predict case duration using historical patterns
   */
  async predictCaseDuration(features) {
    // Implement ML prediction logic
    // For now, return mock prediction based on historical averages
    const baseDuration = 18; // months
    let adjustment = 0;

    if (features.practiceArea === 'patent') adjustment += 6;
    if (features.practiceArea === 'antitrust') adjustment += 12;
    if (features.complexity === 'high') adjustment += 9;
    if (features.judgeTiming > 24) adjustment += 6;

    return {
      estimatedMonths: baseDuration + adjustment,
      confidence: 0.75,
      range: {
        min: baseDuration + adjustment - 3,
        max: baseDuration + adjustment + 6
      }
    };
  }

  /**
   * Predict win rate based on historical performance
   */
  async predictWinRate(features) {
    // Mock implementation - replace with actual ML model
    let baseRate = 0.5;
    
    if (features.practiceArea === 'patent') baseRate = 0.45;
    if (features.practiceArea === 'contract') baseRate = 0.55;
    
    return {
      predictedWinRate: baseRate,
      confidence: 0.68,
      factors: ['Historical venue performance', 'Practice area trends', 'Judge patterns']
    };
  }

  /**
   * Predict settlement likelihood
   */
  async predictSettlementLikelihood(features) {
    // Mock implementation
    let likelihood = 0.65;
    
    if (features.damages > 10000000) likelihood += 0.15;
    if (features.caseType === 'class_action') likelihood += 0.10;
    
    return {
      likelihood: Math.min(likelihood, 0.95),
      confidence: 0.72,
      optimalTiming: 'Pre-discovery or after key rulings'
    };
  }

  /**
   * Predict appeal likelihood
   */
  async predictAppealLikelihood(features) {
    return {
      likelihood: 0.25,
      confidence: 0.60,
      factors: ['Case value', 'Precedent significance', 'Party resources']
    };
  }

  /**
   * Calculate prediction confidence score
   */
  calculatePredictionConfidence(predictions) {
    const confidenceValues = Object.values(predictions)
      .map(pred => pred.confidence || 0.5)
      .filter(val => val > 0);
    
    return confidenceValues.length > 0 
      ? confidenceValues.reduce((sum, val) => sum + val, 0) / confidenceValues.length
      : 0.5;
  }

  /**
   * Generate market intelligence insights
   */
  extractMarketIntelligence(trends) {
    return {
      filingVolume: trends.filing_volume_trend,
      practiceAreaGrowth: trends.practice_area_trends,
      jurisdictionShifts: trends.jurisdiction_trends,
      emergingIssues: trends.emerging_legal_issues || []
    };
  }

  /**
   * Assess case complexity
   */
  assessCaseComplexity(caseData) {
    let complexity = 'medium';
    
    const factors = [
      caseData.parties?.length > 5,
      caseData.practice_area === 'antitrust',
      caseData.damages_sought > 50000000,
      caseData.case_type === 'class_action'
    ];

    const highComplexityCount = factors.filter(Boolean).length;
    
    if (highComplexityCount >= 3) complexity = 'high';
    else if (highComplexityCount <= 1) complexity = 'low';
    
    return complexity;
  }

  /**
   * Helper methods for analysis
   */
  analyzeJudgeTemperament(statistics) {
    return {
      rulingSpeed: statistics.median_days_to_ruling < 30 ? 'fast' : 'deliberate',
      motionGrant: statistics.motion_grant_rate > 0.6 ? 'liberal' : 'conservative',
      trialPreference: statistics.trial_rate > 0.8 ? 'trial-friendly' : 'settlement-oriented'
    };
  }

  identifyJudgePreferences(profile, statistics) {
    return {
      procedural: statistics.procedural_preferences || [],
      scheduling: profile.scheduling_preferences || 'standard',
      technology: profile.technology_comfort || 'standard'
    };
  }

  identifyJudgePatterns(trends) {
    return {
      seasonalVariations: trends.seasonal_patterns || {},
      caseTypePreferences: trends.case_type_trends || {},
      rulingPatterns: trends.ruling_trends || {}
    };
  }

  generateJudgeRecommendations(profile, statistics) {
    const recommendations = [];

    if (statistics.motion_grant_rate < 0.3) {
      recommendations.push({
        type: 'motion_strategy',
        advice: 'Focus on strongest motions only - judge has low grant rate'
      });
    }

    if (profile.scheduling_preferences === 'accelerated') {
      recommendations.push({
        type: 'scheduling',
        advice: 'Be prepared for aggressive scheduling - judge prefers fast pace'
      });
    }

    return recommendations;
  }

  identifyFirmStrengths(performance) {
    const strengths = [];
    
    if (performance.win_rate > 0.7) {
      strengths.push('High success rate in practice area');
    }
    
    if (performance.average_case_duration < performance.industry_average) {
      strengths.push('Efficient case resolution');
    }
    
    return strengths;
  }

  identifyFirmWeaknesses(performance) {
    const weaknesses = [];
    
    if (performance.trial_rate < 0.1) {
      weaknesses.push('Limited trial experience');
    }
    
    return weaknesses;
  }

  identifyFirmSpecializations(profile, performance) {
    return profile.practice_areas?.filter(area => 
      performance.practice_area_performance?.[area]?.win_rate > 0.6
    ) || [];
  }

  analyzeFirmPosition(performance) {
    return {
      marketPosition: performance.market_share > 0.1 ? 'dominant' : 'competitive',
      trend: performance.win_rate_trend > 0 ? 'improving' : 'stable',
      reputation: performance.peer_rating || 'standard'
    };
  }

  generateTrendInsights(trends) {
    return {
      summary: 'Legal market showing increased activity in IP and employment law',
      keyDrivers: ['Technology innovation', 'Remote work policies', 'Economic uncertainty'],
      forecast: 'Continued growth in cybersecurity and privacy litigation'
    };
  }

  generateTrendRecommendations(trends) {
    return [
      {
        trend: 'Rising IP litigation',
        recommendation: 'Build IP expertise and consider strategic hires',
        timeframe: '6-12 months'
      }
    ];
  }

  generateDamagesInsights(damagesData) {
    return {
      marketConditions: 'Damages awards trending higher in tech sector',
      benchmarks: damagesData.benchmarks,
      factors: ['Jury composition', 'Venue selection', 'Case presentation']
    };
  }

  generateDamagesBenchmarks(damagesData) {
    return {
      percentiles: damagesData.distributions,
      recommendations: [
        'Consider venue impact on damages expectations',
        'Benchmark against similar technology cases'
      ]
    };
  }

  /**
   * Get judge comparisons
   */
  async getJudgeComparisons(judgeId, practiceAreas) {
    try {
      const response = await this.client.get(`/api/v1/judges/${judgeId}/comparisons`, {
        params: { practice_areas: practiceAreas?.join(',') }
      });
      
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get firm attorneys
   */
  async getFirmAttorneys(firmId) {
    try {
      const response = await this.client.get(`/api/v1/law-firms/${firmId}/attorneys`);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get case analytics
   */
  async getCaseAnalytics(caseId, caseType) {
    try {
      const response = await this.client.get(`/api/v1/${caseType}/${caseId}/analytics`);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

// Export singleton instance
module.exports = new LexMachinaService();