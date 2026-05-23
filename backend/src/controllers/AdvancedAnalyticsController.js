const advancedAnalyticsService = require('../services/AdvancedAnalyticsService');
const ApiResponse = require('../lib/apiResponse');

class AdvancedAnalyticsController {
  /**
   * Get comprehensive dashboard analytics
   */
  async getDashboardAnalytics(req, res) {
    try {
      const userId = req.user.id;
      const {
        timeRange = '12months',
        includeMarketData = 'true',
        includePredictions = 'true',
        includeComparisons = 'true'
      } = req.query;

      const options = {
        timeRange,
        includeMarketData: includeMarketData === 'true',
        includePredictions: includePredictions === 'true',
        includeComparisons: includeComparisons === 'true'
      };

      const result = await advancedAnalyticsService.getDashboardAnalytics(userId, options);

      if (result.success) {
        return ApiResponse.success(res, result.data, 'Dashboard analytics retrieved successfully');
      } else {
        return ApiResponse.error(res, result.error, 500, { errorCode: result.errorCode });
      }

    } catch (error) {
      console.error('Dashboard analytics error:', error);
      return ApiResponse.error(res, 'Failed to retrieve dashboard analytics', 500, error);
    }
  }

  /**
   * Get financial performance analytics
   */
  async getFinancialAnalytics(req, res) {
    try {
      const userId = req.user.id;
      const {
        timeRange = '12months',
        breakdown = 'monthly',
        includeForecasting = 'true'
      } = req.query;

      const options = {
        timeRange,
        breakdown,
        includeForecasting: includeForecasting === 'true'
      };

      const result = await advancedAnalyticsService.getFinancialAnalytics(userId, options);

      if (result.success) {
        return ApiResponse.success(res, result.data, 'Financial analytics retrieved successfully');
      } else {
        return ApiResponse.error(res, result.error, 500, { errorCode: result.errorCode });
      }

    } catch (error) {
      console.error('Financial analytics error:', error);
      return ApiResponse.error(res, 'Failed to retrieve financial analytics', 500, error);
    }
  }

  /**
   * Get case performance analytics with predictions
   */
  async getCaseAnalytics(req, res) {
    try {
      const userId = req.user.id;
      const {
        timeRange = '12months',
        practiceAreas,
        includePredictions = 'true'
      } = req.query;

      const options = {
        timeRange,
        practiceAreas: practiceAreas ? practiceAreas.split(',') : [],
        includePredictions: includePredictions === 'true'
      };

      const result = await advancedAnalyticsService.getCaseAnalytics(userId, options);

      if (result.success) {
        return ApiResponse.success(res, result.data, 'Case analytics retrieved successfully');
      } else {
        return ApiResponse.error(res, result.error, 500, { errorCode: result.errorCode });
      }

    } catch (error) {
      console.error('Case analytics error:', error);
      return ApiResponse.error(res, 'Failed to retrieve case analytics', 500, error);
    }
  }

  /**
   * Get competitive intelligence report
   */
  async getCompetitiveAnalytics(req, res) {
    try {
      const userId = req.user.id;
      const {
        practiceAreas,
        jurisdiction = 'ALL',
        includeMarketTrends = 'true'
      } = req.query;

      const options = {
        practiceAreas: practiceAreas ? practiceAreas.split(',') : [],
        jurisdiction,
        includeMarketTrends: includeMarketTrends === 'true'
      };

      const result = await advancedAnalyticsService.getCompetitiveAnalytics(userId, options);

      if (result.success) {
        return ApiResponse.success(res, result.data, 'Competitive analytics retrieved successfully');
      } else {
        return ApiResponse.error(res, result.error, 500, { errorCode: result.errorCode });
      }

    } catch (error) {
      console.error('Competitive analytics error:', error);
      return ApiResponse.error(res, 'Failed to retrieve competitive analytics', 500, error);
    }
  }

  /**
   * Get predictive analytics and forecasts
   */
  async getPredictiveAnalytics(req, res) {
    try {
      const userId = req.user.id;
      const {
        horizon = '12_months',
        categories,
        confidenceThreshold = '0.7'
      } = req.query;

      const options = {
        horizon,
        categories: categories ? categories.split(',') : undefined,
        confidenceThreshold: parseFloat(confidenceThreshold)
      };

      const result = await advancedAnalyticsService.getPredictiveAnalytics(userId, options);

      if (result.success) {
        return ApiResponse.success(res, result.data, 'Predictive analytics generated successfully');
      } else {
        return ApiResponse.error(res, result.error, 500, { errorCode: result.errorCode });
      }

    } catch (error) {
      console.error('Predictive analytics error:', error);
      return ApiResponse.error(res, 'Failed to generate predictive analytics', 500, error);
    }
  }

  /**
   * Get comprehensive business intelligence report
   */
  async getBusinessIntelligenceReport(req, res) {
    try {
      const userId = req.user.id;
      const {
        reportType = 'comprehensive',
        timeRange = '12months',
        includeExecutiveSummary = 'true'
      } = req.query;

      const options = {
        reportType,
        timeRange,
        includeExecutiveSummary: includeExecutiveSummary === 'true'
      };

      const result = await advancedAnalyticsService.getBusinessIntelligenceReport(userId, options);

      if (result.success) {
        return ApiResponse.success(res, result.data, 'Business intelligence report generated successfully');
      } else {
        return ApiResponse.error(res, result.error, 500, { errorCode: result.errorCode });
      }

    } catch (error) {
      console.error('Business intelligence report error:', error);
      return ApiResponse.error(res, 'Failed to generate business intelligence report', 500, error);
    }
  }

  /**
   * Get real-time KPI metrics
   */
  async getRealtimeKPIs(req, res) {
    try {
      const userId = req.user.id;
      const { categories } = req.query;

      // Get real-time metrics for dashboard widgets
      const kpiCategories = categories ? categories.split(',') : ['revenue', 'efficiency', 'growth'];
      
      const kpis = {};

      for (const category of kpiCategories) {
        switch (category) {
          case 'revenue':
            kpis.revenue = await this.getRevenueKPIs(userId);
            break;
          case 'efficiency':
            kpis.efficiency = await this.getEfficiencyKPIs(userId);
            break;
          case 'growth':
            kpis.growth = await this.getGrowthKPIs(userId);
            break;
          case 'risk':
            kpis.risk = await this.getRiskKPIs(userId);
            break;
          case 'client_satisfaction':
            kpis.client_satisfaction = await this.getClientSatisfactionKPIs(userId);
            break;
        }
      }

      return ApiResponse.success(res, {
        kpis: kpis,
        lastUpdated: new Date().toISOString(),
        refreshInterval: 300000 // 5 minutes
      }, 'Real-time KPIs retrieved successfully');

    } catch (error) {
      console.error('Real-time KPIs error:', error);
      return ApiResponse.error(res, 'Failed to retrieve real-time KPIs', 500, error);
    }
  }

  /**
   * Get analytics insights and alerts
   */
  async getAnalyticsInsights(req, res) {
    try {
      const userId = req.user.id;
      const { 
        priority = 'all',
        category = 'all',
        limit = '10'
      } = req.query;

      // Get contextual insights based on current performance
      const dashboardData = await advancedAnalyticsService.getDashboardAnalytics(userId, {
        timeRange: '3months',
        includeMarketData: false,
        includePredictions: false,
        includeComparisons: false
      });

      if (!dashboardData.success) {
        return ApiResponse.error(res, 'Failed to generate insights', 500);
      }

      let insights = dashboardData.data.insights || [];
      let recommendations = dashboardData.data.recommendations || [];

      // Filter insights by priority and category
      if (priority !== 'all') {
        insights = insights.filter(insight => insight.priority === priority);
        recommendations = recommendations.filter(rec => rec.priority === priority);
      }

      if (category !== 'all') {
        insights = insights.filter(insight => insight.category === category);
        recommendations = recommendations.filter(rec => rec.category === category);
      }

      // Limit results
      const maxResults = parseInt(limit);
      insights = insights.slice(0, maxResults);
      recommendations = recommendations.slice(0, maxResults);

      return ApiResponse.success(res, {
        insights: insights,
        recommendations: recommendations,
        alerts: this.generateAlerts(insights, recommendations),
        summary: {
          total_insights: insights.length,
          total_recommendations: recommendations.length,
          high_priority_count: insights.filter(i => i.priority === 'high').length
        }
      }, 'Analytics insights retrieved successfully');

    } catch (error) {
      console.error('Analytics insights error:', error);
      return ApiResponse.error(res, 'Failed to retrieve analytics insights', 500, error);
    }
  }

  /**
   * Export analytics report in various formats
   */
  async exportAnalyticsReport(req, res) {
    try {
      const userId = req.user.id;
      const {
        reportType = 'comprehensive',
        format = 'json',
        timeRange = '12months'
      } = req.query;

      // Generate comprehensive report
      const result = await advancedAnalyticsService.getBusinessIntelligenceReport(userId, {
        reportType,
        timeRange,
        includeExecutiveSummary: true
      });

      if (!result.success) {
        return ApiResponse.error(res, result.error, 500, { errorCode: result.errorCode });
      }

      const reportData = result.data;

      switch (format.toLowerCase()) {
        case 'json':
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Content-Disposition', `attachment; filename="analytics-report-${Date.now()}.json"`);
          return res.json(reportData);

        case 'csv':
          const csvData = this.convertReportToCSV(reportData);
          res.setHeader('Content-Type', 'text/csv');
          res.setHeader('Content-Disposition', `attachment; filename="analytics-report-${Date.now()}.csv"`);
          return res.send(csvData);

        case 'pdf':
          // PDF generation would be implemented here
          return ApiResponse.error(res, 'PDF export not yet implemented', 501);

        default:
          return ApiResponse.error(res, 'Unsupported export format', 400);
      }

    } catch (error) {
      console.error('Export analytics report error:', error);
      return ApiResponse.error(res, 'Failed to export analytics report', 500, error);
    }
  }

  // Helper methods for KPI calculations
  async getRevenueKPIs(userId) {
    // Mock implementation - would integrate with actual financial data
    return {
      total_revenue: 125000,
      monthly_recurring_revenue: 10500,
      revenue_growth: 0.15,
      average_invoice_value: 2500,
      collection_rate: 0.92
    };
  }

  async getEfficiencyKPIs(userId) {
    return {
      billable_hours_ratio: 0.75,
      average_case_duration: 145,
      document_processing_time: 3.2,
      client_response_time: 24,
      automation_savings: 15.5
    };
  }

  async getGrowthKPIs(userId) {
    return {
      new_clients: 8,
      client_retention_rate: 0.88,
      practice_area_expansion: 2,
      market_share_growth: 0.05,
      referral_rate: 0.35
    };
  }

  async getRiskKPIs(userId) {
    return {
      overdue_invoices: 5,
      case_deadline_risk: 3,
      client_satisfaction_risk: 2,
      compliance_score: 0.95,
      financial_risk_score: 0.12
    };
  }

  async getClientSatisfactionKPIs(userId) {
    return {
      overall_satisfaction: 4.2,
      communication_rating: 4.5,
      response_time_rating: 4.1,
      value_for_money: 4.0,
      likelihood_to_recommend: 8.5
    };
  }

  generateAlerts(insights, recommendations) {
    const alerts = [];

    // High priority insights become alerts
    insights.filter(i => i.priority === 'high').forEach(insight => {
      alerts.push({
        type: 'insight',
        severity: 'high',
        message: insight.message,
        category: insight.category,
        timestamp: new Date().toISOString()
      });
    });

    // Urgent recommendations become alerts
    recommendations.filter(r => r.priority === 'urgent').forEach(rec => {
      alerts.push({
        type: 'action_required',
        severity: 'urgent',
        message: rec.recommendation,
        category: rec.category,
        timestamp: new Date().toISOString()
      });
    });

    return alerts;
  }

  convertReportToCSV(reportData) {
    // Simplified CSV conversion - would be more comprehensive in real implementation
    const headers = ['Metric', 'Value', 'Category', 'Trend'];
    const rows = [];

    // Add key metrics to CSV
    if (reportData.dashboard?.overview) {
      Object.entries(reportData.dashboard.overview).forEach(([key, value]) => {
        rows.push([key, value, 'overview', 'stable']);
      });
    }

    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  }
}

module.exports = new AdvancedAnalyticsController();