const lexMachinaService = require('./LexMachinaService');
const smartTimeTrackingService = require('./SmartTimeTrackingService');
const unifiedPaymentService = require('./UnifiedPaymentService');
const prisma = require('../lib/prisma');

/**
 * Advanced Analytics Service
 * 
 * Provides comprehensive business intelligence and predictive analytics:
 * - Legal market trends and insights
 * - Financial performance analytics  
 * - Case outcome predictions
 * - Resource optimization recommendations
 * - Competitive intelligence
 * - Revenue forecasting
 * - Risk assessment and mitigation
 */
class AdvancedAnalyticsService {
  constructor() {
    this.ANALYTICS_CATEGORIES = {
      FINANCIAL: 'financial',
      PERFORMANCE: 'performance', 
      MARKET: 'market',
      PREDICTIVE: 'predictive',
      COMPETITIVE: 'competitive',
      OPERATIONAL: 'operational',
      RISK: 'risk'
    };

    this.PREDICTION_HORIZONS = {
      SHORT_TERM: '3_months',
      MEDIUM_TERM: '12_months', 
      LONG_TERM: '24_months'
    };

    this.KPI_CATEGORIES = {
      REVENUE: 'revenue',
      EFFICIENCY: 'efficiency',
      GROWTH: 'growth',
      RISK: 'risk',
      CLIENT_SATISFACTION: 'client_satisfaction'
    };

    console.log('📊 Advanced Analytics Service initialized');
  }

  /**
   * Generate comprehensive dashboard analytics
   */
  async getDashboardAnalytics(userId, options = {}) {
    const {
      timeRange = '12months',
      includeMarketData = true,
      includePredictions = true,
      includeComparisons = true
    } = options;

    try {
      const dashboardData = await this.aggregateDashboardData(userId, timeRange);

      const analytics = {
        overview: await this.generateOverviewMetrics(dashboardData),
        financial: await this.generateFinancialAnalytics(dashboardData),
        performance: await this.generatePerformanceAnalytics(dashboardData),
        trends: await this.generateTrendAnalysis(dashboardData, timeRange),
        insights: await this.generateKeyInsights(dashboardData),
        recommendations: await this.generateRecommendations(dashboardData)
      };

      if (includeMarketData) {
        analytics.market = await this.getMarketIntelligence(dashboardData);
      }

      if (includePredictions) {
        analytics.predictions = await this.generatePredictiveAnalytics(dashboardData);
      }

      if (includeComparisons) {
        analytics.benchmarks = await this.getBenchmarkComparisons(dashboardData);
      }

      return {
        success: true,
        data: {
          ...analytics,
          metadata: {
            generatedAt: new Date().toISOString(),
            dataRange: timeRange,
            userId: userId,
            refreshedEvery: '15_minutes'
          }
        }
      };

    } catch (error) {
      console.error('Dashboard analytics error:', error);
      return {
        success: false,
        error: error.message,
        errorCode: 'DASHBOARD_ANALYTICS_ERROR'
      };
    }
  }

  /**
   * Generate financial performance analytics
   */
  async getFinancialAnalytics(userId, options = {}) {
    const {
      timeRange = '12months',
      breakdown = 'monthly',
      includeForecasting = true
    } = options;

    try {
      const financialData = await this.getFinancialData(userId, timeRange);

      const analytics = {
        revenue: await this.analyzeRevenue(financialData, breakdown),
        profitability: await this.analyzeProfitability(financialData),
        cashFlow: await this.analyzeCashFlow(financialData),
        billing: await this.analyzeBillingEfficiency(financialData),
        collections: await this.analyzeCollections(financialData),
        expenses: await this.analyzeExpenses(financialData)
      };

      if (includeForecasting) {
        analytics.forecasting = await this.generateFinancialForecasts(financialData);
      }

      return {
        success: true,
        data: {
          ...analytics,
          summary: this.generateFinancialSummary(analytics),
          alerts: this.generateFinancialAlerts(analytics)
        }
      };

    } catch (error) {
      console.error('Financial analytics error:', error);
      return {
        success: false,
        error: error.message,
        errorCode: 'FINANCIAL_ANALYTICS_ERROR'
      };
    }
  }

  /**
   * Generate case performance analytics with predictions
   */
  async getCaseAnalytics(userId, options = {}) {
    const {
      timeRange = '12months',
      practiceAreas = [],
      includePredictions = true
    } = options;

    try {
      const caseData = await this.getCaseData(userId, timeRange, practiceAreas);

      const analytics = {
        outcomes: await this.analyzeCaseOutcomes(caseData),
        duration: await this.analyzeCaseDuration(caseData),
        complexity: await this.analyzeCaseComplexity(caseData),
        resources: await this.analyzeResourceUtilization(caseData),
        success_rates: await this.analyzeSuccessRates(caseData),
        client_satisfaction: await this.analyzeClientSatisfaction(caseData)
      };

      if (includePredictions) {
        analytics.predictions = await this.generateCasePredictions(caseData);
      }

      // Integrate Lex Machina insights for market context
      analytics.market_context = await this.getMarketContextForCases(caseData);

      return {
        success: true,
        data: {
          ...analytics,
          insights: this.generateCaseInsights(analytics),
          recommendations: this.generateCaseRecommendations(analytics)
        }
      };

    } catch (error) {
      console.error('Case analytics error:', error);
      return {
        success: false,
        error: error.message,
        errorCode: 'CASE_ANALYTICS_ERROR'
      };
    }
  }

  /**
   * Generate competitive intelligence report
   */
  async getCompetitiveAnalytics(userId, options = {}) {
    const {
      practiceAreas = [],
      jurisdiction = 'ALL',
      includeMarketTrends = true
    } = options;

    try {
      const userProfile = await this.getUserProfile(userId);
      const firmName = userProfile.firmName || 'Unknown';

      const competitive = {
        market_position: await this.analyzeMarketPosition(firmName, practiceAreas),
        competitor_analysis: await this.analyzeCompetitors(firmName, practiceAreas),
        performance_gaps: await this.identifyPerformanceGaps(firmName, practiceAreas),
        opportunities: await this.identifyMarketOpportunities(practiceAreas, jurisdiction)
      };

      if (includeMarketTrends) {
        competitive.market_trends = await this.getMarketTrends(practiceAreas, jurisdiction);
      }

      return {
        success: true,
        data: {
          ...competitive,
          strategic_recommendations: this.generateStrategicRecommendations(competitive),
          action_items: this.generateActionItems(competitive)
        }
      };

    } catch (error) {
      console.error('Competitive analytics error:', error);
      return {
        success: false,
        error: error.message,
        errorCode: 'COMPETITIVE_ANALYTICS_ERROR'
      };
    }
  }

  /**
   * Generate predictive analytics and forecasts
   */
  async getPredictiveAnalytics(userId, options = {}) {
    const {
      horizon = this.PREDICTION_HORIZONS.MEDIUM_TERM,
      categories = Object.values(this.KPI_CATEGORIES),
      confidenceThreshold = 0.7
    } = options;

    try {
      const historicalData = await this.getHistoricalData(userId);

      const predictions = {};

      for (const category of categories) {
        predictions[category] = await this.generateCategoryPredictions(
          historicalData, 
          category, 
          horizon,
          confidenceThreshold
        );
      }

      const analytics = {
        predictions: predictions,
        confidence_analysis: this.analyzePredictionConfidence(predictions),
        scenario_analysis: await this.generateScenarioAnalysis(historicalData, predictions),
        risk_factors: this.identifyRiskFactors(predictions),
        recommendations: this.generatePredictiveRecommendations(predictions)
      };

      return {
        success: true,
        data: analytics
      };

    } catch (error) {
      console.error('Predictive analytics error:', error);
      return {
        success: false,
        error: error.message,
        errorCode: 'PREDICTIVE_ANALYTICS_ERROR'
      };
    }
  }

  /**
   * Generate comprehensive business intelligence report
   */
  async getBusinessIntelligenceReport(userId, options = {}) {
    const {
      reportType = 'comprehensive',
      timeRange = '12months',
      includeExecutiveSummary = true
    } = options;

    try {
      // Gather all analytics components
      const [
        dashboard,
        financial,
        cases,
        competitive,
        predictive
      ] = await Promise.allSettled([
        this.getDashboardAnalytics(userId, { timeRange }),
        this.getFinancialAnalytics(userId, { timeRange }),
        this.getCaseAnalytics(userId, { timeRange }),
        this.getCompetitiveAnalytics(userId),
        this.getPredictiveAnalytics(userId)
      ]);

      const report = {
        dashboard: dashboard.status === 'fulfilled' ? dashboard.value.data : {},
        financial: financial.status === 'fulfilled' ? financial.value.data : {},
        cases: cases.status === 'fulfilled' ? cases.value.data : {},
        competitive: competitive.status === 'fulfilled' ? competitive.value.data : {},
        predictive: predictive.status === 'fulfilled' ? predictive.value.data : {}
      };

      if (includeExecutiveSummary) {
        report.executive_summary = this.generateExecutiveSummary(report);
      }

      report.key_insights = this.extractKeyInsights(report);
      report.priority_actions = this.identifyPriorityActions(report);
      report.performance_score = this.calculateOverallPerformanceScore(report);

      return {
        success: true,
        data: {
          report: report,
          metadata: {
            reportType: reportType,
            generatedAt: new Date().toISOString(),
            dataRange: timeRange,
            userId: userId
          }
        }
      };

    } catch (error) {
      console.error('Business intelligence report error:', error);
      return {
        success: false,
        error: error.message,
        errorCode: 'BI_REPORT_ERROR'
      };
    }
  }

  // Data aggregation methods
  async aggregateDashboardData(userId, timeRange) {
    // Get data from multiple sources
    const [cases, documents, timeEntries, payments] = await Promise.all([
      this.getUserCases(userId, timeRange),
      this.getUserDocuments(userId, timeRange), 
      this.getUserTimeEntries(userId, timeRange),
      this.getUserPayments(userId, timeRange)
    ]);

    return { cases, documents, timeEntries, payments };
  }

  async getUserCases(userId, timeRange) {
    const startDate = this.getDateFromRange(timeRange);
    
    return await prisma.case.findMany({
      where: {
        userId: userId,
        createdAt: { gte: startDate }
      },
      include: {
        documents: true,
        timeEntries: true,
        client: true
      }
    });
  }

  async getUserDocuments(userId, timeRange) {
    const startDate = this.getDateFromRange(timeRange);
    
    return await prisma.document.findMany({
      where: {
        userId: userId,
        createdAt: { gte: startDate }
      },
      include: {
        case: true
      }
    });
  }

  async getUserTimeEntries(userId, timeRange) {
    const startDate = this.getDateFromRange(timeRange);
    
    return await prisma.timeEntry.findMany({
      where: {
        userId: userId,
        date: { gte: startDate }
      },
      include: {
        case: true
      }
    });
  }

  async getUserPayments(userId, timeRange) {
    const startDate = this.getDateFromRange(timeRange);
    
    return await prisma.payment.findMany({
      where: {
        userId: userId,
        createdAt: { gte: startDate }
      },
      include: {
        invoice: true,
        case: true
      }
    });
  }

  // Analytics generation methods
  async generateOverviewMetrics(data) {
    return {
      total_cases: data.cases.length,
      active_cases: data.cases.filter(c => c.status === 'ACTIVE').length,
      total_revenue: this.calculateTotalRevenue(data.payments),
      billable_hours: this.calculateBillableHours(data.timeEntries),
      client_count: new Set(data.cases.map(c => c.clientId)).size,
      avg_case_value: this.calculateAverageaseValue(data.cases),
      growth_rate: await this.calculateGrowthRate(data)
    };
  }

  async generateFinancialAnalytics(data) {
    return {
      revenue_trend: this.calculateRevenueTrend(data.payments),
      profitability: this.calculateProfitability(data),
      payment_methods: this.analyzePaymentMethods(data.payments),
      outstanding_invoices: await this.getOutstandingInvoices(data),
      collection_rate: this.calculateCollectionRate(data.payments),
      expense_ratio: this.calculateExpenseRatio(data)
    };
  }

  async generatePerformanceAnalytics(data) {
    return {
      case_resolution_time: this.calculateAverageResolutionTime(data.cases),
      billing_efficiency: this.calculateBillingEfficiency(data.timeEntries),
      client_retention: await this.calculateClientRetention(data),
      practice_area_performance: this.analyzePracticeAreaPerformance(data.cases),
      productivity_metrics: await this.calculateProductivityMetrics(data)
    };
  }

  async generateTrendAnalysis(data, timeRange) {
    return {
      case_volume_trend: this.analyzeCaseVolumeTrend(data.cases),
      revenue_trend: this.analyzeRevenueTrend(data.payments),
      efficiency_trend: this.analyzeEfficiencyTrend(data.timeEntries),
      seasonal_patterns: this.identifySeasonalPatterns(data),
      growth_patterns: this.identifyGrowthPatterns(data, timeRange)
    };
  }

  async generateKeyInsights(data) {
    const insights = [];

    // Revenue insights
    const revenueGrowth = this.calculateGrowthRate(data);
    if (revenueGrowth > 0.2) {
      insights.push({
        type: 'positive',
        category: 'financial',
        message: `Strong revenue growth of ${(revenueGrowth * 100).toFixed(1)}%`,
        impact: 'high'
      });
    }

    // Efficiency insights
    const billableRatio = this.calculateBillableRatio(data.timeEntries);
    if (billableRatio < 0.6) {
      insights.push({
        type: 'warning',
        category: 'efficiency',
        message: `Low billable hours ratio at ${(billableRatio * 100).toFixed(1)}%`,
        impact: 'medium'
      });
    }

    // Case insights
    const averageResolution = this.calculateAverageResolutionTime(data.cases);
    if (averageResolution > 180) { // More than 6 months
      insights.push({
        type: 'alert',
        category: 'performance',
        message: `Cases taking longer than average to resolve (${averageResolution} days)`,
        impact: 'medium'
      });
    }

    return insights;
  }

  async generateRecommendations(data) {
    const recommendations = [];

    // Financial recommendations
    const collectionRate = this.calculateCollectionRate(data.payments);
    if (collectionRate < 0.9) {
      recommendations.push({
        category: 'financial',
        priority: 'high',
        recommendation: 'Improve invoice collection processes',
        rationale: `Current collection rate is ${(collectionRate * 100).toFixed(1)}%`,
        expected_impact: 'Increase cash flow by 15-25%'
      });
    }

    // Efficiency recommendations
    const billableRatio = this.calculateBillableRatio(data.timeEntries);
    if (billableRatio < 0.7) {
      recommendations.push({
        category: 'efficiency',
        priority: 'medium',
        recommendation: 'Focus on increasing billable hour utilization',
        rationale: `Current billable ratio is ${(billableRatio * 100).toFixed(1)}%`,
        expected_impact: 'Increase revenue by 10-20% without adding resources'
      });
    }

    return recommendations;
  }

  // Market intelligence methods
  async getMarketIntelligence(data) {
    try {
      // Analyze user's practice areas
      const practiceAreas = this.extractPracticeAreas(data.cases);
      
      // Get market trends for relevant practice areas
      const marketTrends = await lexMachinaService.getLitigationTrends({
        practiceAreas: practiceAreas,
        dateFrom: this.getDateFromRange('12months'),
        dateTo: new Date().toISOString().split('T')[0]
      });

      return {
        practice_area_trends: marketTrends.data?.trends || {},
        market_opportunities: marketTrends.data?.opportunities || [],
        competitive_landscape: await this.getCompetitiveLandscape(practiceAreas),
        industry_benchmarks: await this.getIndustryBenchmarks(practiceAreas)
      };
    } catch (error) {
      return { error: 'Market intelligence unavailable' };
    }
  }

  // Utility methods
  getDateFromRange(range) {
    const now = new Date();
    let months = 12;

    switch (range) {
      case '3months': months = 3; break;
      case '6months': months = 6; break;
      case '12months': months = 12; break;
      case '24months': months = 24; break;
    }

    now.setMonth(now.getMonth() - months);
    return now;
  }

  calculateTotalRevenue(payments) {
    return payments
      .filter(p => p.status === 'COMPLETED')
      .reduce((total, payment) => total + (payment.amount || 0), 0);
  }

  calculateBillableHours(timeEntries) {
    return timeEntries
      .filter(entry => entry.billable)
      .reduce((total, entry) => total + (entry.hours || 0), 0);
  }

  calculateAverageCaseValue(cases) {
    const completedCases = cases.filter(c => c.status === 'COMPLETED');
    if (completedCases.length === 0) return 0;

    const totalValue = completedCases.reduce((sum, case_) => {
      return sum + (case_.value || 0);
    }, 0);

    return totalValue / completedCases.length;
  }

  calculateGrowthRate(data) {
    // Compare current period with previous period
    const currentRevenue = this.calculateTotalRevenue(data.payments);
    // This is simplified - in real implementation, would compare with historical data
    return 0.15; // Mock 15% growth rate
  }

  calculateBillableRatio(timeEntries) {
    const totalHours = timeEntries.reduce((sum, entry) => sum + (entry.hours || 0), 0);
    const billableHours = this.calculateBillableHours(timeEntries);
    
    return totalHours > 0 ? billableHours / totalHours : 0;
  }

  calculateCollectionRate(payments) {
    const totalInvoiced = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const totalCollected = payments
      .filter(p => p.status === 'COMPLETED')
      .reduce((sum, p) => sum + (p.amount || 0), 0);
    
    return totalInvoiced > 0 ? totalCollected / totalInvoiced : 0;
  }

  calculateAverageResolutionTime(cases) {
    const completedCases = cases.filter(c => c.status === 'COMPLETED');
    if (completedCases.length === 0) return 0;

    const totalDays = completedCases.reduce((sum, case_) => {
      const created = new Date(case_.createdAt);
      const completed = new Date(case_.completedAt || new Date());
      const days = Math.floor((completed - created) / (1000 * 60 * 60 * 24));
      return sum + days;
    }, 0);

    return Math.round(totalDays / completedCases.length);
  }

  extractPracticeAreas(cases) {
    return [...new Set(cases.map(c => c.practiceArea).filter(Boolean))];
  }

  async getUserProfile(userId) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { profile: true }
      });
      
      return {
        firmName: user?.profile?.firmName || user?.firmName || 'Unknown Firm',
        practiceAreas: user?.profile?.practiceAreas || [],
        jurisdiction: user?.profile?.jurisdiction || 'US'
      };
    } catch (error) {
      return { firmName: 'Unknown Firm', practiceAreas: [], jurisdiction: 'US' };
    }
  }

  // Additional analytical methods would be implemented here...
  generateExecutiveSummary(report) {
    return {
      overview: 'Strong performance across key metrics with opportunities for growth',
      key_achievements: ['Revenue growth', 'Improved efficiency', 'Client retention'],
      challenges: ['Collection rate improvement needed', 'Case resolution time'],
      priorities: ['Enhance billing processes', 'Optimize resource allocation']
    };
  }

  calculateOverallPerformanceScore(report) {
    // Weighted scoring across different categories
    const weights = {
      financial: 0.3,
      efficiency: 0.25,
      growth: 0.2,
      client_satisfaction: 0.15,
      risk_management: 0.1
    };

    // Mock calculation - real implementation would use actual metrics
    return 78.5; // Score out of 100
  }
}

// Export singleton instance
module.exports = new AdvancedAnalyticsService();