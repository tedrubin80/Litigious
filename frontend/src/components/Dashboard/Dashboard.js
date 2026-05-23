import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  DocumentIcon,
  UserGroupIcon,
  ClipboardDocumentListIcon,
  ClockIcon,
  CurrencyDollarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  BellIcon,
  EyeIcon
} from '../Icons';
import InteractiveChart from '../Charts/InteractiveChart';
import { useRealTimeData } from '../../services/realtimeService';
import { useToast } from '../Common/Toast';
import { endpoints } from '../../utils/api';

// OKLCH-based status badge styles (returned as style objects, not Tailwind classes,
// so Tailwind purge doesn't strip dynamic values)
const STATUS_STYLES = {
  ACTIVE:                { bg: 'oklch(0.95 0.025 145)', text: 'oklch(0.35 0.10 145)' },
  INTAKE:                { bg: 'oklch(0.95 0.015 240)', text: 'oklch(0.30 0.018 240)' },
  DISCOVERY:             { bg: 'oklch(0.94 0.025 220)', text: 'oklch(0.35 0.08 220)' },
  SETTLEMENT_NEGOTIATION:{ bg: 'oklch(0.94 0.025 290)', text: 'oklch(0.38 0.10 290)' },
  SETTLEMENT:            { bg: 'oklch(0.94 0.025 290)', text: 'oklch(0.38 0.10 290)' },
  PENDING:               { bg: 'oklch(0.96 0.04 75)',   text: 'oklch(0.40 0.10 75)'  },
  CLOSED:                { bg: 'oklch(0.93 0.005 60)',  text: 'oklch(0.50 0.006 60)' },
  ARCHIVED:              { bg: 'oklch(0.93 0.005 60)',  text: 'oklch(0.60 0.005 60)' },
};

const PRIORITY_STYLES = {
  high:   { bg: 'oklch(0.95 0.025 25)',  text: 'oklch(0.38 0.12 25)'  },
  medium: { bg: 'oklch(0.96 0.04 75)',   text: 'oklch(0.40 0.10 75)'  },
  low:    { bg: 'oklch(0.95 0.025 145)', text: 'oklch(0.35 0.10 145)' },
};

const getStatusStyle = (status) => STATUS_STYLES[status] || STATUS_STYLES.PENDING;
const getPriorityStyle = (priority) => PRIORITY_STYLES[priority] || PRIORITY_STYLES.medium;

// Stat card definitions with OKLCH icon bg/color pairs
const STAT_ICON_STYLES = {
  cases:    { bg: 'oklch(0.91 0.010 240)', color: 'oklch(0.42 0.022 240)' },
  active:   { bg: 'oklch(0.95 0.025 145)', color: 'oklch(0.48 0.12 145)'  },
  revenue:  { bg: 'oklch(0.96 0.04 75)',   color: 'oklch(0.52 0.14 75)'   },
  avgValue: { bg: 'oklch(0.95 0.02 350)',  color: 'oklch(0.48 0.10 350)'  },
};

const Dashboard = () => {
  const { user } = useAuth();
  const [selectedView, setSelectedView] = useState('overview');
  const toast = useToast();

  const [state, setState] = useState({ data: null, loading: true, error: null });

  const safeData = useMemo(() => {
    if (!state.data) return { cases: [], activities: [], stats: { totalCases: 0, activeCases: 0, settledCases: 0, totalRevenue: 0 } };
    return {
      cases: Array.isArray(state.data.cases) ? state.data.cases : [],
      activities: Array.isArray(state.data.activities) ? state.data.activities : [],
      stats: state.data.stats || { totalCases: 0, activeCases: 0, settledCases: 0, totalRevenue: 0 }
    };
  }, [state.data]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setState(prev => ({ ...prev, loading: true, error: null }));
        const response = await fetch('/api/dashboard/stats', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        const result = await response.json();
        setState({
          data: {
            cases: Array.isArray(result.recentCases) ? result.recentCases : [],
            activities: Array.isArray(result.recentActivity) ? result.recentActivity : [],
            stats: {
              totalCases: Number(result.caseStats?.total) || 0,
              activeCases: Number(result.caseStats?.active) || 0,
              settledCases: Number(result.caseStats?.settled) || 0,
              totalRevenue: Number(result.settlementStats?.totalFees) || 0,
            }
          },
          loading: false,
          error: null
        });
      } catch (err) {
        console.error('Dashboard fetch error:', err);
        setState({
          data: { cases: [], activities: [], stats: { totalCases: 0, activeCases: 0, settledCases: 0, totalRevenue: 0 } },
          loading: false,
          error: err instanceof Error ? err.message : 'Failed to load dashboard'
        });
      }
    };

    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatCurrency = (value) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);

  const data = useMemo(() => {
    const chartFallback = {
      casesByMonth: ['Jan','Feb','Mar','Apr','May','Jun'].map(month => ({ month, opened: 0, closed: 0, pending: 0 })),
      revenueByType: [{ name: 'Personal Injury', value: 0, cases: 0 }, { name: 'Auto Accident', value: 0, cases: 0 }]
    };
    return {
      stats: {
        totalCases: safeData.stats.totalCases,
        casesChange: 0,
        activeCases: safeData.stats.activeCases,
        activeCasesChange: 0,
        totalRevenue: safeData.stats.totalRevenue,
        revenueChange: 0,
        avgCaseValue: safeData.stats.totalCases > 0 ? safeData.stats.totalRevenue / safeData.stats.totalCases : 0,
        caseValueChange: 0,
      },
      recentCases: safeData.cases.slice(0, 5).map(c => ({
        id: c?.id || Math.random(),
        title: c?.title || `Case #${c?.caseNumber || 'Unknown'}`,
        status: c?.status || 'ACTIVE',
        type: c?.type || 'General',
        value: c?.value || c?.settlementAmount || 0,
        lastActivity: c?.updatedAt || new Date().toISOString().split('T')[0]
      })),
      chartData: chartFallback
    };
  }, [safeData]);

  const statsCards = [
    { title: 'Total Cases',    value: data.stats.totalCases,               change: data.stats.casesChange,    icon: DocumentIcon,      iconStyle: STAT_ICON_STYLES.cases,    link: '/app/cases' },
    { title: 'Active Cases',   value: data.stats.activeCases,              change: data.stats.activeCasesChange, icon: CheckCircleIcon, iconStyle: STAT_ICON_STYLES.active,   link: '/app/cases?status=active' },
    { title: 'Total Revenue',  value: formatCurrency(data.stats.totalRevenue),   change: data.stats.revenueChange,  icon: CurrencyDollarIcon,iconStyle: STAT_ICON_STYLES.revenue,  link: '/app/reports' },
    { title: 'Avg Case Value', value: formatCurrency(data.stats.avgCaseValue),   change: data.stats.caseValueChange,icon: ChartBarIcon,      iconStyle: STAT_ICON_STYLES.avgValue, link: '/app/reports' },
  ];

  if (state.loading) {
    return (
      <div className="flex items-center justify-center" style={{ height: '50vh' }}>
        <div
          className="animate-spin rounded-full h-10 w-10"
          style={{ borderWidth: 2, borderStyle: 'solid', borderColor: 'oklch(0.88 0.005 60)', borderTopColor: 'oklch(0.42 0.022 240)' }}
        />
        <span className="ml-3 text-sm" style={{ color: 'oklch(0.55 0.006 60)' }}>Loading dashboard...</span>
      </div>
    );
  }

  // Shared surface style for cards/panels
  const cardStyle = {
    backgroundColor: 'oklch(0.99 0.003 60)',
    border: '1px solid oklch(0.88 0.005 60)',
    borderRadius: '0.5rem',
  };

  return (
    <div className="space-y-6">

      {/* Welcome header */}
      <div className="p-6" style={cardStyle}>
        <div className="sm:flex sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'oklch(0.18 0.008 60)' }}>
              Welcome back, {user?.firstName || 'User'}
            </h1>
            <p className="mt-1 text-sm" style={{ color: 'oklch(0.55 0.006 60)' }}>
              Here's your practice at a glance.
            </p>
            <p className="mt-0.5 text-xs" style={{ color: 'oklch(0.62 0.005 60)' }}>
              Updated {new Date().toLocaleTimeString()}
            </p>
            {state.error && (
              <div className="mt-3 text-sm flex items-center gap-1.5 px-3 py-2 rounded" style={{ backgroundColor: 'oklch(0.96 0.04 75)', color: 'oklch(0.40 0.10 75)' }}>
                <ExclamationTriangleIcon className="h-4 w-4 flex-shrink-0" />
                {state.error}
              </div>
            )}
          </div>
          <div className="mt-4 sm:mt-0">
            <select
              value={selectedView}
              onChange={(e) => setSelectedView(e.target.value)}
              className="block px-3 py-1.5 text-sm rounded focus:outline-none"
              style={{
                border: '1px solid oklch(0.85 0.006 60)',
                backgroundColor: 'oklch(0.99 0.003 60)',
                color: 'oklch(0.18 0.008 60)',
              }}
            >
              <option value="overview">Overview</option>
              <option value="analytics">Analytics</option>
              <option value="reports">Reports</option>
            </select>
          </div>
        </div>
      </div>

      {/* Non-overview views */}
      {selectedView === 'analytics' && (
        <div>
          <h2 className="text-base font-bold mb-4" style={{ color: 'oklch(0.18 0.008 60)' }}>Advanced Analytics</h2>
          <div className="p-6" style={cardStyle}>
            <p className="text-sm mb-4" style={{ color: 'oklch(0.55 0.006 60)' }}>View the comprehensive analytics dashboard.</p>
            <Link
              to="/app/analytics"
              className="inline-flex items-center px-4 py-2 rounded text-sm font-medium"
              style={{ backgroundColor: 'oklch(0.30 0.018 240)', color: 'oklch(0.97 0.005 60)' }}
            >
              <ChartBarIcon className="h-4 w-4 mr-2" />
              View Analytics
            </Link>
          </div>
        </div>
      )}

      {selectedView === 'reports' && (
        <div>
          <h2 className="text-base font-bold mb-4" style={{ color: 'oklch(0.18 0.008 60)' }}>Reports</h2>
          <div className="p-6" style={cardStyle}>
            <p className="text-sm mb-4" style={{ color: 'oklch(0.55 0.006 60)' }}>Access comprehensive reports and insights.</p>
            <Link
              to="/app/reports"
              className="inline-flex items-center px-4 py-2 rounded text-sm font-medium"
              style={{ backgroundColor: 'oklch(0.30 0.018 240)', color: 'oklch(0.97 0.005 60)' }}
            >
              <DocumentIcon className="h-4 w-4 mr-2" />
              View Reports
            </Link>
          </div>
        </div>
      )}

      {selectedView === 'overview' && (
        <>
          {/* Stats row */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {statsCards.map((stat) => (
              <Link
                key={stat.title}
                to={stat.link}
                className="block p-5 rounded-lg transition-shadow hover:shadow-sm"
                style={cardStyle}
              >
                <div className="flex items-center gap-4">
                  <div
                    className="flex-shrink-0 p-2.5 rounded-md"
                    style={{ backgroundColor: stat.iconStyle.bg }}
                  >
                    <stat.icon className="h-5 w-5" style={{ color: stat.iconStyle.color }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate" style={{ color: 'oklch(0.55 0.006 60)' }}>
                      {stat.title}
                    </p>
                    <p className="text-lg font-semibold" style={{ color: 'oklch(0.18 0.008 60)', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em' }}>
                      {stat.value}
                    </p>
                    <p className="text-xs flex items-center gap-0.5" style={{ color: stat.change >= 0 ? 'oklch(0.48 0.12 145)' : 'oklch(0.50 0.15 25)' }}>
                      {stat.change >= 0
                        ? <ArrowTrendingUpIcon className="h-3 w-3" />
                        : <ArrowTrendingDownIcon className="h-3 w-3" />
                      }
                      {Math.abs(stat.change)}% this month
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <InteractiveChart
              data={data.chartData.casesByMonth}
              title="Cases by Month"
              type="bar"
              xAxisKey="month"
              yAxisKeys={['opened', 'closed', 'pending']}
              colors={['#4a6fa5', '#2d8c5e', '#b87a1a']}
              height={280}
              allowTypeChange={true}
              formatters={{
                opened: (v) => `${v} cases`,
                closed: (v) => `${v} cases`,
                pending: (v) => `${v} cases`,
              }}
            />
            <InteractiveChart
              data={data.chartData.revenueByType}
              title="Revenue by Case Type"
              type="pie"
              xAxisKey="name"
              yAxisKeys={['value']}
              height={280}
              formatters={{ value: formatCurrency }}
            />
          </div>

          {/* Content grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Recent cases */}
            <div className="rounded-lg" style={cardStyle}>
              <div className="px-5 py-4 border-b" style={{ borderColor: 'oklch(0.88 0.005 60)' }}>
                <h3 className="text-sm font-semibold" style={{ color: 'oklch(0.18 0.008 60)' }}>
                  Recent Cases ({data.recentCases.length})
                </h3>
              </div>
              <div className="p-5">
                {data.recentCases.length === 0 ? (
                  <div className="text-center py-8">
                    <DocumentIcon className="mx-auto h-10 w-10 mb-2" style={{ color: 'oklch(0.72 0.005 60)' }} />
                    <p className="text-sm mb-2" style={{ color: 'oklch(0.55 0.006 60)' }}>No recent cases</p>
                    <Link to="/app/cases/new" className="text-sm font-medium" style={{ color: 'oklch(0.42 0.022 240)' }}>
                      Create your first case
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {data.recentCases.map((c, i) => {
                      const ss = getStatusStyle(c?.status);
                      return (
                        <Link
                          key={c?.id || i}
                          to={`/app/cases/${c?.id || ''}`}
                          className="block p-3 rounded transition-colors"
                          style={{ border: '1px solid oklch(0.88 0.005 60)' }}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate" style={{ color: 'oklch(0.18 0.008 60)' }}>
                                {c?.title || 'Unnamed Case'}
                              </p>
                              <p className="text-xs mt-0.5" style={{ color: 'oklch(0.55 0.006 60)' }}>
                                {c?.type || 'General'} · {formatCurrency(c?.value || 0)}
                              </p>
                            </div>
                            <span
                              className="flex-shrink-0 px-2 py-0.5 text-xs font-medium rounded-full"
                              style={{ backgroundColor: ss.bg, color: ss.text }}
                            >
                              {c?.status || 'ACTIVE'}
                            </span>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
                <div className="mt-4 pt-3" style={{ borderTop: '1px solid oklch(0.88 0.005 60)' }}>
                  <Link to="/app/cases" className="text-sm font-medium" style={{ color: 'oklch(0.42 0.022 240)' }}>
                    View all cases →
                  </Link>
                </div>
              </div>
            </div>

            {/* Recent activities */}
            <div className="rounded-lg" style={cardStyle}>
              <div className="px-5 py-4 border-b" style={{ borderColor: 'oklch(0.88 0.005 60)' }}>
                <h3 className="text-sm font-semibold" style={{ color: 'oklch(0.18 0.008 60)' }}>
                  Recent Activity ({safeData.activities.length})
                </h3>
              </div>
              <div className="p-5">
                {safeData.activities.length === 0 ? (
                  <div className="text-center py-8">
                    <BellIcon className="mx-auto h-10 w-10 mb-2" style={{ color: 'oklch(0.72 0.005 60)' }} />
                    <p className="text-sm" style={{ color: 'oklch(0.55 0.006 60)' }}>No recent activity</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {safeData.activities.slice(0, 5).map((a, i) => (
                      <div
                        key={a?.id || i}
                        className="p-3 rounded"
                        style={{ border: '1px solid oklch(0.88 0.005 60)' }}
                      >
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <h4 className="text-sm font-medium" style={{ color: 'oklch(0.18 0.008 60)' }}>
                            {a?.action || a?.description || 'Activity'}
                          </h4>
                          <span className="text-xs flex-shrink-0" style={{ color: 'oklch(0.62 0.005 60)' }}>
                            {a?.createdAt ? new Date(a.createdAt).toLocaleDateString() : ''}
                          </span>
                        </div>
                        {a?.user && (
                          <p className="text-xs" style={{ color: 'oklch(0.55 0.006 60)' }}>
                            {a.user.firstName} {a.user.lastName}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-4 pt-3" style={{ borderTop: '1px solid oklch(0.88 0.005 60)' }}>
                  <Link to="/app/tasks" className="text-sm font-medium" style={{ color: 'oklch(0.42 0.022 240)' }}>
                    View all activity →
                  </Link>
                </div>
              </div>
            </div>

            {/* Quick actions */}
            <div className="rounded-lg" style={cardStyle}>
              <div className="px-5 py-4 border-b" style={{ borderColor: 'oklch(0.88 0.005 60)' }}>
                <h3 className="text-sm font-semibold" style={{ color: 'oklch(0.18 0.008 60)' }}>Quick Actions</h3>
              </div>
              <div className="p-5 space-y-2">
                {[
                  { to: '/app/cases/new',    icon: DocumentIcon,           label: 'New Case',          iconColor: 'oklch(0.42 0.022 240)' },
                  { to: '/app/clients/new',  icon: UserGroupIcon,          label: 'Add Client',        iconColor: 'oklch(0.48 0.12 145)'  },
                  { to: '/app/documents',    icon: DocumentIcon,           label: 'Upload Documents',  iconColor: 'oklch(0.38 0.10 290)'  },
                  { to: '/app/time',         icon: ClockIcon,              label: 'Track Time',        iconColor: 'oklch(0.52 0.14 75)'   },
                ].map(({ to, icon: Icon, label, iconColor }) => (
                  <Link
                    key={to}
                    to={to}
                    className="flex items-center gap-3 p-3 rounded transition-colors"
                    style={{ border: '1px solid oklch(0.88 0.005 60)' }}
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" style={{ color: iconColor }} />
                    <span className="text-sm font-medium" style={{ color: 'oklch(0.18 0.008 60)' }}>{label}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
