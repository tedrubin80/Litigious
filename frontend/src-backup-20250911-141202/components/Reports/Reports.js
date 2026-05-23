import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  ChartBarIcon,
  DocumentChartBarIcon,
  CurrencyDollarIcon,
  ClockIcon,
  UserGroupIcon,
  ArrowTrendingUpIcon,
  DocumentArrowDownIcon
} from '../Icons';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, LineChart, Line, ResponsiveContainer } from 'recharts';
import ReportGenerator from './ReportGenerator';
import { AnalyticsPDFGenerator } from '../PDF/PDFGenerator';

const Reports = () => {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('6m');
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchAnalytics();
  }, [selectedPeriod]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/dashboard/analytics?period=${selectedPeriod}`);
      setAnalyticsData(response.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

  const sampleData = {
    casesByMonth: [
      { month: 'Jan', opened: 12, closed: 8 },
      { month: 'Feb', opened: 15, closed: 10 },
      { month: 'Mar', opened: 18, closed: 14 },
      { month: 'Apr', opened: 22, closed: 16 },
      { month: 'May', opened: 25, closed: 20 },
      { month: 'Jun', opened: 20, closed: 18 }
    ],
    settlementsByType: [
      { name: 'Personal Injury', value: 850000, count: 15 },
      { name: 'Auto Accident', value: 625000, count: 22 },
      { name: 'Medical Malpractice', value: 1200000, count: 5 },
      { name: 'Workers Comp', value: 420000, count: 18 }
    ],
    revenueData: [
      { month: 'Jan', revenue: 185000 },
      { month: 'Feb', revenue: 225000 },
      { month: 'Mar', revenue: 195000 },
      { month: 'Apr', revenue: 285000 },
      { month: 'May', revenue: 315000 },
      { month: 'Jun', revenue: 275000 }
    ]
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="mt-2 text-sm text-gray-700">
            Comprehensive insights into your practice performance.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none flex items-center space-x-3">
          <AnalyticsPDFGenerator 
            analyticsData={analyticsData}
            className="bg-blue-600 hover:bg-blue-700 focus:ring-blue-500"
          />
          <select
            className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md"
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
          >
            <option value="1m">Last Month</option>
            <option value="3m">Last 3 Months</option>
            <option value="6m">Last 6 Months</option>
            <option value="1y">Last Year</option>
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div>
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Overview & Analytics
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'reports'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Custom Reports
            </button>
          </nav>
        </div>
      </div>

      {activeTab === 'overview' && (
        <>
          {/* Key Metrics */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ChartBarIcon className="h-6 w-6 text-blue-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Cases</dt>
                  <dd className="text-lg font-medium text-gray-900">142</dd>
                  <dd className="text-sm text-green-600">+12% from last period</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CurrencyDollarIcon className="h-6 w-6 text-green-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Revenue</dt>
                  <dd className="text-lg font-medium text-gray-900">$1.48M</dd>
                  <dd className="text-sm text-green-600">+18% from last period</dd>
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
                  <dd className="text-lg font-medium text-gray-900">2,845</dd>
                  <dd className="text-sm text-green-600">89% utilization</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ArrowTrendingUpIcon className="h-6 w-6 text-purple-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Avg Settlement</dt>
                  <dd className="text-lg font-medium text-gray-900">$52K</dd>
                  <dd className="text-sm text-green-600">+8% from last period</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cases Over Time */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Cases Opened vs Closed</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sampleData.casesByMonth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="opened" fill="#3B82F6" name="Opened" />
                <Bar dataKey="closed" fill="#10B981" name="Closed" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Revenue Trend */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Revenue Trend</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sampleData.revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                <Line type="monotone" dataKey="revenue" stroke="#3B82F6" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Settlement Distribution */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Settlements by Case Type</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={sampleData.settlementsByType}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {sampleData.settlementsByType.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Case Performance Metrics */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Case Performance</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Average Case Duration</span>
              <span className="text-sm font-medium text-gray-900">8.5 months</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Settlement Rate</span>
              <span className="text-sm font-medium text-gray-900">78%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Client Satisfaction</span>
              <span className="text-sm font-medium text-gray-900">4.8/5.0</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Referral Rate</span>
              <span className="text-sm font-medium text-gray-900">65%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Reports */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Generate Detailed Reports</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <button className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50">
              <DocumentChartBarIcon className="h-5 w-5 mr-2 text-gray-400" />
              Case Analysis Report
            </button>
            <button className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50">
              <CurrencyDollarIcon className="h-5 w-5 mr-2 text-gray-400" />
              Financial Performance
            </button>
            <button className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50">
              <ClockIcon className="h-5 w-5 mr-2 text-gray-400" />
              Time & Billing Report
            </button>
            <button className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50">
              <UserGroupIcon className="h-5 w-5 mr-2 text-gray-400" />
              Client Summary Report
            </button>
            <button className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50">
              <ArrowTrendingUpIcon className="h-5 w-5 mr-2 text-gray-400" />
              Settlement Analysis
            </button>
            <button className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50">
              <ChartBarIcon className="h-5 w-5 mr-2 text-gray-400" />
              Productivity Report
            </button>
          </div>
        </div>
      </div>
        </>
      )}

      {activeTab === 'reports' && (
        <ReportGenerator />
      )}
    </div>
  );
};

export default Reports;