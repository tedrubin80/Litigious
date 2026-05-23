import React, { useState, useEffect, useMemo } from 'react';
import { useActivityTracker } from '../../hooks/useActivityTracker';
import {
  ChartBarIcon,
  ClockIcon,
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  CalendarDaysIcon,
  DocumentIcon,
  UserGroupIcon,
  CheckCircleIcon
} from '../Icons';

/**
 * Beautiful Activity Analytics Component
 * 
 * Provides comprehensive analytics and visualizations
 * for activity tracking data with interactive charts
 */
const ActivityAnalytics = () => {
  const { statistics, fetchStatistics, loading } = useActivityTracker();
  const [selectedPeriod, setSelectedPeriod] = useState('30');
  const [selectedView, setSelectedView] = useState('overview');

  useEffect(() => {
    fetchStatistics(parseInt(selectedPeriod));
  }, [fetchStatistics, selectedPeriod]);

  // Process data for visualizations
  const analyticsData = useMemo(() => {
    if (!statistics) return null;

    const activityTypes = Object.entries(statistics.activityBreakdown || {});
    const totalActivities = statistics.totalActivities || 0;
    const billing = statistics.billing || {};

    // Calculate daily averages
    const days = parseInt(selectedPeriod);
    const avgActivitiesPerDay = (totalActivities / days).toFixed(1);
    const avgBillingPerDay = ((billing.totalBillableAmount || 0) / days).toFixed(2);

    // Activity type data with colors and metrics
    const typeMetrics = activityTypes.map(([type, count]) => {
      const configs = {
        'Legal Research': { color: '#3B82F6', bgColor: 'bg-blue-500', icon: DocumentIcon },
        'Document Drafting': { color: '#10B981', bgColor: 'bg-green-500', icon: DocumentIcon },
        'Client Meeting': { color: '#8B5CF6', bgColor: 'bg-purple-500', icon: UserGroupIcon },
        'Court Filing': { color: '#EF4444', bgColor: 'bg-red-500', icon: CheckCircleIcon },
        'LEGAL_RESEARCH': { color: '#3B82F6', bgColor: 'bg-blue-500', icon: DocumentIcon },
        'DOCUMENT_DRAFTING': { color: '#10B981', bgColor: 'bg-green-500', icon: DocumentIcon },
        'CLIENT_MEETING': { color: '#8B5CF6', bgColor: 'bg-purple-500', icon: UserGroupIcon },
        'COURT_FILING': { color: '#EF4444', bgColor: 'bg-red-500', icon: CheckCircleIcon }
      };
      
      const config = configs[type] || configs['Legal Research'];
      const percentage = totalActivities > 0 ? (count / totalActivities * 100).toFixed(1) : 0;
      
      return {
        type: type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
        count,
        percentage: parseFloat(percentage),
        ...config
      };
    }).sort((a, b) => b.count - a.count);

    return {
      totalActivities,
      billing: {
        total: billing.totalBillableAmount || 0,
        hours: billing.totalBillableHours || 0,
        avgRate: billing.averageHourlyRate || 150
      },
      averages: {
        activitiesPerDay: parseFloat(avgActivitiesPerDay),
        billingPerDay: parseFloat(avgBillingPerDay)
      },
      typeMetrics,
      recentActivities: statistics.recentActivities || []
    };
  }, [statistics, selectedPeriod]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount);
  };

  if (loading && !analyticsData) {
    return (
      <div className="animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-gray-200 h-32 rounded-lg"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="bg-gray-200 h-64 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div className="text-center py-12">
        <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No analytics data</h3>
        <p className="mt-1 text-sm text-gray-500">
          Start tracking activities to see analytics
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              <ChartBarIcon className="h-8 w-8 text-blue-500 mr-3" />
              Activity Analytics
            </h2>
            <p className="text-gray-600 mt-1">
              Comprehensive insights into your legal practice productivity
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="365">Last year</option>
            </select>
          </div>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-sm p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Total Activities</p>
              <p className="text-3xl font-bold mt-1">
                {analyticsData.totalActivities.toLocaleString()}
              </p>
              <p className="text-blue-100 text-xs mt-1">
                {analyticsData.averages.activitiesPerDay}/day avg
              </p>
            </div>
            <ChartBarIcon className="h-10 w-10 text-blue-200" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-sm p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium">Total Billing</p>
              <p className="text-3xl font-bold mt-1">
                {formatCurrency(analyticsData.billing.total)}
              </p>
              <p className="text-green-100 text-xs mt-1">
                {formatCurrency(analyticsData.averages.billingPerDay)}/day avg
              </p>
            </div>
            <CurrencyDollarIcon className="h-10 w-10 text-green-200" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-sm p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium">Billable Hours</p>
              <p className="text-3xl font-bold mt-1">
                {analyticsData.billing.hours.toFixed(1)}h
              </p>
              <p className="text-purple-100 text-xs mt-1">
                {(analyticsData.billing.hours / parseInt(selectedPeriod)).toFixed(1)}h/day avg
              </p>
            </div>
            <ClockIcon className="h-10 w-10 text-purple-200" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-sm p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm font-medium">Avg. Hourly Rate</p>
              <p className="text-3xl font-bold mt-1">
                {formatCurrency(analyticsData.billing.avgRate)}
              </p>
              <p className="text-orange-100 text-xs mt-1">
                Per billable hour
              </p>
            </div>
            <ArrowTrendingUpIcon className="h-10 w-10 text-orange-200" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity Distribution Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Activity Distribution</h3>
          
          <div className="space-y-4">
            {analyticsData.typeMetrics.map((metric, index) => {
              const IconComponent = metric.icon;
              return (
                <div key={metric.type} className="flex items-center">
                  <div className={`p-2 rounded-full ${metric.bgColor} bg-opacity-10 mr-4 flex-shrink-0`}>
                    <IconComponent className={`h-4 w-4 ${metric.bgColor.replace('bg-', 'text-')}`} />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium text-gray-900">
                        {metric.type}
                      </span>
                      <span className="text-sm text-gray-600">
                        {metric.count} ({metric.percentage}%)
                      </span>
                    </div>
                    
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${metric.bgColor}`}
                        style={{ width: `${metric.percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
            
            {analyticsData.typeMetrics.length === 0 && (
              <div className="text-center py-8">
                <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
                <p className="text-gray-500 mt-2">No activity data available</p>
              </div>
            )}
          </div>
        </div>

        {/* Productivity Insights */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Productivity Insights</h3>
          
          <div className="space-y-6">
            {/* Most Productive Activity */}
            {analyticsData.typeMetrics.length > 0 && (() => {
              const IconComponent = analyticsData.typeMetrics[0].icon;
              return (
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center">
                    <div className="p-2 rounded-full bg-blue-100 mr-3">
                      <IconComponent className="h-5 w-5 text-blue-600" />
                    </div>
                  <div>
                    <h4 className="font-medium text-blue-900">Most Frequent Activity</h4>
                    <p className="text-blue-700 text-sm">
                      {analyticsData.typeMetrics[0].type} - {analyticsData.typeMetrics[0].count} times
                    </p>
                  </div>
                </div>
              </div>
              );
            })()}

            {/* Billing Efficiency */}
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center">
                <div className="p-2 rounded-full bg-green-100 mr-3">
                  <CurrencyDollarIcon className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h4 className="font-medium text-green-900">Billing Efficiency</h4>
                  <p className="text-green-700 text-sm">
                    {analyticsData.billing.hours > 0 
                      ? `${formatCurrency(analyticsData.billing.total / analyticsData.billing.hours)} per hour`
                      : 'No billing data'
                    }
                  </p>
                </div>
              </div>
            </div>

            {/* Time Utilization */}
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center">
                <div className="p-2 rounded-full bg-purple-100 mr-3">
                  <ClockIcon className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <h4 className="font-medium text-purple-900">Time Utilization</h4>
                  <p className="text-purple-700 text-sm">
                    {((analyticsData.billing.hours / (parseInt(selectedPeriod) * 8)) * 100).toFixed(1)}% of available time
                  </p>
                </div>
              </div>
            </div>

            {/* Activity Streak */}
            <div className="bg-orange-50 rounded-lg p-4">
              <div className="flex items-center">
                <div className="p-2 rounded-full bg-orange-100 mr-3">
                  <CalendarDaysIcon className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <h4 className="font-medium text-orange-900">Daily Activity Rate</h4>
                  <p className="text-orange-700 text-sm">
                    {analyticsData.averages.activitiesPerDay} activities per day on average
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity Trends */}
      {analyticsData.recentActivities.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity Timeline</h3>
          
          <div className="space-y-3">
            {analyticsData.recentActivities.slice(0, 10).map((activity, index) => (
              <div key={activity.id} className="flex items-center p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {activity.action}
                  </p>
                  <p className="text-xs text-gray-600">
                    {activity.description}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">
                    {new Date(activity.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivityAnalytics;