import React, { useState, useEffect, useCallback } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Scatter,
  ScatterChart
} from 'recharts';
import {
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CurrencyDollarIcon,
  ClockIcon,
  ScaleIcon,
  UserGroupIcon,
  DocumentIcon,
  CalendarDaysIcon,
  DocumentArrowDownIcon
} from '../Icons';
import { AnalyticsPDFGenerator } from '../PDF/PDFGenerator';
import { endpoints } from '../../utils/api';
import { useToast } from '../Common/Toast';

const AnalyticsDashboard = () => {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState('6m');
  const [selectedMetric, setSelectedMetric] = useState('revenue');
  const [realTimeEnabled, setRealTimeEnabled] = useState(false);
  const toast = useToast();

  // Color schemes for different chart types
  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#EC4899', '#84CC16'];
  
  const TIMEFRAMES = [
    { value: '1m', label: 'Last Month' },
    { value: '3m', label: 'Last 3 Months' },
    { value: '6m', label: 'Last 6 Months' },
    { value: '1y', label: 'Last Year' },
    { value: '2y', label: 'Last 2 Years' }
  ];

  const METRICS = [
    { value: 'revenue', label: 'Revenue', icon: CurrencyDollarIcon },
    { value: 'cases', label: 'Cases', icon: ScaleIcon },
    { value: 'clients', label: 'Clients', icon: UserGroupIcon },
    { value: 'documents', label: 'Documents', icon: DocumentIcon },
    { value: 'time', label: 'Billable Hours', icon: ClockIcon }
  ];

  // Fetch analytics data
  const fetchAnalyticsData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await endpoints.dashboard.analytics({ 
        period: selectedTimeframe,
        includeBreakdown: true,
        includeComparisons: true
      });
      
      setAnalyticsData(response);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  }, [selectedTimeframe, toast]);

  // Initial data load
  useEffect(() => {
    fetchAnalyticsData();
  }, [fetchAnalyticsData]);

  // Real-time updates
  useEffect(() => {
    let interval;
    if (realTimeEnabled) {
      interval = setInterval(fetchAnalyticsData, 30000); // Update every 30 seconds
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [realTimeEnabled, fetchAnalyticsData]);

  // Sample data for demonstration (replace with real API data)
  const sampleAnalyticsData = {
    overview: {
      totalRevenue: 2450000,
      revenueChange: 12.5,
      totalCases: 148,
      casesChange: 8.2,
      activeCases: 87,
      activeCasesChange: 5.1,
      avgSettlement: 52340,
      avgSettlementChange: -3.2,
      billableHours: 3420,
      billableHoursChange: 15.8,
      clientSatisfaction: 4.8,
      clientSatisfactionChange: 2.1
    },
    revenueByMonth: [
      { month: 'Jan', revenue: 185000, cases: 12, settlements: 3, expenses: 25000 },
      { month: 'Feb', revenue: 225000, cases: 15, settlements: 5, expenses: 28000 },
      { month: 'Mar', revenue: 195000, cases: 18, settlements: 4, expenses: 22000 },
      { month: 'Apr', revenue: 285000, cases: 22, settlements: 8, expenses: 35000 },
      { month: 'May', revenue: 315000, cases: 25, settlements: 10, expenses: 38000 },
      { month: 'Jun', revenue: 275000, cases: 20, settlements: 7, expenses: 32000 }
    ],
    casesByType: [
      { name: 'Personal Injury', value: 45, revenue: 850000, avgDuration: 8.5 },
      { name: 'Auto Accident', value: 38, revenue: 625000, avgDuration: 6.2 },
      { name: 'Medical Malpractice', value: 15, revenue: 1200000, avgDuration: 14.3 },
      { name: 'Workers Comp', value: 25, revenue: 420000, avgDuration: 4.8 },
      { name: 'Other', value: 25, revenue: 180000, avgDuration: 5.1 }
    ],
    performanceMetrics: [
      { metric: 'Case Win Rate', value: 87, trend: 'up', change: 3.2 },
      { metric: 'Avg Settlement Time', value: 6.8, trend: 'down', change: -1.2, unit: 'months' },
      { metric: 'Client Retention', value: 94, trend: 'up', change: 2.5 },
      { metric: 'Referral Rate', value: 68, trend: 'up', change: 5.1 }
    ],
    attorneyPerformance: [
      { name: 'Sarah Johnson', cases: 28, revenue: 420000, winRate: 92, satisfaction: 4.9 },
      { name: 'Michael Chen', cases: 35, revenue: 580000, winRate: 89, satisfaction: 4.7 },
      { name: 'Emily Rodriguez', cases: 22, revenue: 385000, winRate: 94, satisfaction: 4.8 },
      { name: 'David Smith', cases: 31, revenue: 465000, winRate: 87, satisfaction: 4.6 }
    ],
    settlementTrends: [
      { quarter: 'Q1 2023', avgSettlement: 48500, totalSettlements: 15, medianSettlement: 42000 },
      { quarter: 'Q2 2023', avgSettlement: 52300, totalSettlements: 18, medianSettlement: 45000 },
      { quarter: 'Q3 2023', avgSettlement: 49800, totalSettlements: 22, medianSettlement: 43500 },
      { quarter: 'Q4 2023', avgSettlement: 54200, totalSettlements: 25, medianSettlement: 47000 },
      { quarter: 'Q1 2024', avgSettlement: 51900, totalSettlements: 20, medianSettlement: 44800 },
      { quarter: 'Q2 2024', avgSettlement: 56100, totalSettlements: 28, medianSettlement: 48500 }
    ]
  };

  const data = analyticsData || sampleAnalyticsData;

  // Format currency
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  // Format percentage
  const formatPercentage = (value, decimals = 1) => {
    return `${value.toFixed(decimals)}%`;
  };

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {entry.name.includes('Revenue') ? formatCurrency(entry.value) : entry.value.toLocaleString()}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="mt-2 text-sm text-gray-700">
            Comprehensive insights and performance metrics for your legal practice.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex items-center space-x-4">
          <AnalyticsPDFGenerator 
            analyticsData={analyticsData}
            className="bg-purple-600 hover:bg-purple-700 focus:ring-purple-500"
          />
          <select
            value={selectedTimeframe}
            onChange={(e) => setSelectedTimeframe(e.target.value)}
            className="block px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            {TIMEFRAMES.map(timeframe => (
              <option key={timeframe.value} value={timeframe.value}>
                {timeframe.label}
              </option>
            ))}
          </select>
          <label className="inline-flex items-center">
            <input
              type="checkbox"
              checked={realTimeEnabled}
              onChange={(e) => setRealTimeEnabled(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200"
            />
            <span className="ml-2 text-sm text-gray-700">Real-time updates</span>
          </label>
        </div>
      </div>

      {/* Key Performance Indicators */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CurrencyDollarIcon className="h-6 w-6 text-green-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Revenue</dt>
                  <dd className="text-lg font-medium text-gray-900">{formatCurrency(data.overview.totalRevenue)}</dd>
                  <dd className={`text-sm flex items-center ${data.overview.revenueChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {data.overview.revenueChange >= 0 ? (
                      <ArrowTrendingUpIcon className="h-3 w-3 mr-1" />
                    ) : (
                      <ArrowTrendingDownIcon className="h-3 w-3 mr-1" />
                    )}
                    {formatPercentage(Math.abs(data.overview.revenueChange))} from last period
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ScaleIcon className="h-6 w-6 text-blue-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Active Cases</dt>
                  <dd className="text-lg font-medium text-gray-900">{data.overview.activeCases}</dd>
                  <dd className={`text-sm flex items-center ${data.overview.activeCasesChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {data.overview.activeCasesChange >= 0 ? (
                      <ArrowTrendingUpIcon className="h-3 w-3 mr-1" />
                    ) : (
                      <ArrowTrendingDownIcon className="h-3 w-3 mr-1" />
                    )}
                    {formatPercentage(Math.abs(data.overview.activeCasesChange))} from last period
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ChartBarIcon className="h-6 w-6 text-purple-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Avg Settlement</dt>
                  <dd className="text-lg font-medium text-gray-900">{formatCurrency(data.overview.avgSettlement)}</dd>
                  <dd className={`text-sm flex items-center ${data.overview.avgSettlementChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {data.overview.avgSettlementChange >= 0 ? (
                      <ArrowTrendingUpIcon className="h-3 w-3 mr-1" />
                    ) : (
                      <ArrowTrendingDownIcon className="h-3 w-3 mr-1" />
                    )}
                    {formatPercentage(Math.abs(data.overview.avgSettlementChange))} from last period
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ClockIcon className="h-6 w-6 text-yellow-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Billable Hours</dt>
                  <dd className="text-lg font-medium text-gray-900">{data.overview.billableHours.toLocaleString()}</dd>
                  <dd className={`text-sm flex items-center ${data.overview.billableHoursChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {data.overview.billableHoursChange >= 0 ? (
                      <ArrowTrendingUpIcon className="h-3 w-3 mr-1" />
                    ) : (
                      <ArrowTrendingDownIcon className="h-3 w-3 mr-1" />
                    )}
                    {formatPercentage(Math.abs(data.overview.billableHoursChange))} from last period
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend Chart */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Revenue & Case Trends</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data.revenueByMonth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="revenue"
                  fill="#3B82F6"
                  fillOpacity={0.3}
                  stroke="#3B82F6"
                  strokeWidth={2}
                  name="Revenue"
                />
                <Bar yAxisId="right" dataKey="cases" fill="#10B981" name="Cases" />
                <Line yAxisId="right" type="monotone" dataKey="settlements" stroke="#F59E0B" strokeWidth={3} name="Settlements" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Cases by Type */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Cases by Type</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.casesByType}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {data.casesByType.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [value, 'Cases']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Key Performance Metrics</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {data.performanceMetrics.map((metric, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-gray-500">{metric.metric}</h4>
                  <div className={`flex items-center text-sm ${
                    metric.trend === 'up' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {metric.trend === 'up' ? (
                      <ArrowTrendingUpIcon className="h-3 w-3 mr-1" />
                    ) : (
                      <ArrowTrendingDownIcon className="h-3 w-3 mr-1" />
                    )}
                    {formatPercentage(Math.abs(metric.change))}
                  </div>
                </div>
                <div className="mt-2">
                  <div className="text-2xl font-bold text-gray-900">
                    {metric.value}
                    {metric.unit && <span className="text-sm text-gray-500 ml-1">{metric.unit}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Attorney Performance */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Attorney Performance</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart data={data.attorneyPerformance}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" dataKey="cases" name="Cases" />
                <YAxis type="number" dataKey="revenue" name="Revenue" />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} formatter={(value, name) => [
                  name === 'revenue' ? formatCurrency(value) : value,
                  name === 'cases' ? 'Cases Handled' : 
                  name === 'revenue' ? 'Revenue Generated' :
                  name === 'winRate' ? 'Win Rate' :
                  name === 'satisfaction' ? 'Client Satisfaction' : name
                ]} />
                <Scatter name="Attorneys" dataKey="winRate" fill="#3B82F6" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {data.attorneyPerformance.map((attorney, index) => (
                <div key={index} className="text-center">
                  <div className="text-sm font-medium text-gray-900">{attorney.name}</div>
                  <div className="text-xs text-gray-500">
                    {attorney.cases} cases • {formatCurrency(attorney.revenue)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatPercentage(attorney.winRate)} win rate • {attorney.satisfaction}★
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Settlement Trends */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Settlement Trends</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.settlementTrends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="quarter" />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="avgSettlement" 
                stroke="#3B82F6" 
                strokeWidth={3} 
                name="Average Settlement"
              />
              <Line 
                type="monotone" 
                dataKey="medianSettlement" 
                stroke="#10B981" 
                strokeWidth={2} 
                name="Median Settlement"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;