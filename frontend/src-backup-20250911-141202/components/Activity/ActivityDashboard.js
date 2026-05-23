import React, { useState, useEffect, useMemo } from 'react';
import { useActivityTracker } from '../../hooks/useActivityTracker';
import { useAuth } from '../../contexts/AuthContext';
import {
  ClockIcon,
  CurrencyDollarIcon,
  DocumentIcon,
  UserGroupIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  BellIcon,
  EyeIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  FireIcon,
  BoltIcon
} from '../Icons';
import InteractiveChart from '../Charts/InteractiveChart';
import LoadingSpinner from '../Common/LoadingSpinner';

/**
 * Beautiful Real-time Activity Dashboard
 * 
 * Displays comprehensive activity tracking with live updates,
 * billing information, and beautiful visualizations
 */
const ActivityDashboard = ({ caseId = null }) => {
  const { user } = useAuth();
  const {
    activities,
    realtimeActivities,
    statistics,
    loading,
    error,
    connected,
    fetchStatistics,
    fetchActivityFeed,
    refresh
  } = useActivityTracker();

  const [selectedTimeframe, setSelectedTimeframe] = useState(30);
  const [activeView, setActiveView] = useState('overview');

  useEffect(() => {
    fetchStatistics(selectedTimeframe);
    fetchActivityFeed(50);
  }, [fetchStatistics, fetchActivityFeed, selectedTimeframe]);

  // Process statistics for display
  const dashboardStats = useMemo(() => {
    if (!statistics) return null;

    return {
      totalActivities: statistics.totalActivities || 0,
      billingStats: statistics.billing || {
        totalBillableAmount: 0,
        totalBillableHours: 0,
        averageHourlyRate: 150
      },
      activityBreakdown: statistics.activityBreakdown || {},
      recentCount: realtimeActivities.length
    };
  }, [statistics, realtimeActivities]);

  // Activity type colors and icons
  const activityConfig = {
    'LEGAL_RESEARCH': { 
      color: 'bg-blue-500', 
      lightColor: 'bg-blue-100', 
      icon: DocumentIcon, 
      label: 'Legal Research' 
    },
    'DOCUMENT_DRAFTING': { 
      color: 'bg-green-500', 
      lightColor: 'bg-green-100', 
      icon: DocumentIcon, 
      label: 'Document Drafting' 
    },
    'CLIENT_MEETING': { 
      color: 'bg-purple-500', 
      lightColor: 'bg-purple-100', 
      icon: UserGroupIcon, 
      label: 'Client Meeting' 
    },
    'COURT_FILING': { 
      color: 'bg-red-500', 
      lightColor: 'bg-red-100', 
      icon: CheckCircleIcon, 
      label: 'Court Filing' 
    },
    'Legal Research': { 
      color: 'bg-blue-500', 
      lightColor: 'bg-blue-100', 
      icon: DocumentIcon, 
      label: 'Legal Research' 
    },
    'Document Drafting': { 
      color: 'bg-green-500', 
      lightColor: 'bg-green-100', 
      icon: DocumentIcon, 
      label: 'Document Drafting' 
    },
    'Client Meeting': { 
      color: 'bg-purple-500', 
      lightColor: 'bg-purple-100', 
      icon: UserGroupIcon, 
      label: 'Client Meeting' 
    },
    'Court Filing': { 
      color: 'bg-red-500', 
      lightColor: 'bg-red-100', 
      icon: CheckCircleIcon, 
      label: 'Court Filing' 
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  if (loading && !dashboardStats) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              <BoltIcon className="h-8 w-8 text-yellow-500 mr-3" />
              Activity Tracking Dashboard
            </h2>
            <p className="text-gray-600 mt-1">
              Real-time activity monitoring and billing insights
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Connection Status */}
            <div className={`flex items-center px-3 py-2 rounded-full text-sm font-medium ${
              connected 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              <div className={`w-2 h-2 rounded-full mr-2 ${
                connected ? 'bg-green-500' : 'bg-red-500'
              }`} />
              {connected ? 'Live' : 'Offline'}
            </div>
            
            {/* Timeframe Selector */}
            <select
              value={selectedTimeframe}
              onChange={(e) => setSelectedTimeframe(parseInt(e.target.value))}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>
            
            {/* Refresh Button */}
            <button
              onClick={refresh}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      {dashboardStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-100">
                <ChartBarIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Activities</p>
                <p className="text-2xl font-bold text-gray-900">
                  {dashboardStats.totalActivities.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100">
                <CurrencyDollarIcon className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Billing</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(dashboardStats.billingStats.totalBillableAmount)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-purple-100">
                <ClockIcon className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Billable Hours</p>
                <p className="text-2xl font-bold text-gray-900">
                  {(dashboardStats.billingStats.totalBillableHours || 0).toFixed(1)}h
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-yellow-100">
                <FireIcon className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Live Activities</p>
                <p className="text-2xl font-bold text-gray-900">
                  {dashboardStats.recentCount}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Real-time Activity Feed */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <BellIcon className="h-5 w-5 text-blue-500 mr-2" />
              Live Activity Feed
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Real-time updates from your legal practice
            </p>
          </div>
          
          <div className="p-6">
            {realtimeActivities.length > 0 ? (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {realtimeActivities.slice(0, 20).map((activity, index) => {
                  const config = activityConfig[activity.action] || activityConfig['Legal Research'];
                  const IconComponent = config.icon;
                  
                  return (
                    <div 
                      key={`${activity.activityId}-${index}`}
                      className="flex items-start space-x-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      <div className={`p-2 rounded-full ${config.lightColor} flex-shrink-0`}>
                        <IconComponent className={`h-4 w-4 ${config.color.replace('bg-', 'text-')}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          {activity.action}
                        </p>
                        <p className="text-xs text-gray-600">
                          Case: {activity.caseId} • {formatTime(activity.timestamp)}
                        </p>
                      </div>
                      <div className="flex-shrink-0">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Live
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <BellIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No recent activities</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Activities will appear here in real-time as they occur
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Activity Breakdown */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Activity Breakdown</h3>
            <p className="text-sm text-gray-600 mt-1">
              Distribution of activity types
            </p>
          </div>
          
          <div className="p-6">
            {dashboardStats && Object.keys(dashboardStats.activityBreakdown).length > 0 ? (
              <div className="space-y-4">
                {Object.entries(dashboardStats.activityBreakdown).map(([type, count]) => {
                  const config = activityConfig[type] || activityConfig['Legal Research'];
                  const percentage = (count / dashboardStats.totalActivities) * 100;
                  
                  return (
                    <div key={type}>
                      <div className="flex justify-between text-sm">
                        <span className="font-medium text-gray-900">{config.label}</span>
                        <span className="text-gray-600">{count}</span>
                      </div>
                      <div className="mt-1 w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${config.color}`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No activity data</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Start tracking activities to see breakdowns
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Activities Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Recent Activities</h3>
          <p className="text-sm text-gray-600 mt-1">
            Detailed view of recent activity history
          </p>
        </div>
        
        <div className="overflow-hidden">
          {activities.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Activity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Case
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Duration
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Billing
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {activities.slice(0, 10).map((activity) => {
                    const config = activityConfig[activity.activityType || activity.action] || activityConfig['Legal Research'];
                    const IconComponent = config.icon;
                    
                    return (
                      <tr key={activity.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className={`p-2 rounded-full ${config.lightColor} mr-3`}>
                              <IconComponent className={`h-4 w-4 ${config.color.replace('bg-', 'text-')}`} />
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {activity.action}
                              </div>
                              <div className="text-sm text-gray-500">
                                {activity.description}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {activity.entityId?.slice(0, 8) || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {activity.duration ? `${activity.duration}m` : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {activity.billingAmount ? formatCurrency(activity.billingAmount) : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatTime(activity.createdAt)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <DocumentIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No activities yet</h3>
              <p className="mt-1 text-sm text-gray-500">
                Activities will appear here as they are tracked
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ActivityDashboard;