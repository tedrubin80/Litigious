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
  ChartBarIcon,
  BellIcon,
  PlusIcon,
} from '../Icons';
import InteractiveChart from '../Charts/InteractiveChart';
import { fetchWithAuth } from '../../utils/authStorage';

// ── Status badge tokens ──────────────────────────────────────────────────────
const STATUS_STYLES = {
  ACTIVE:                { bg: 'oklch(0.95 0.025 145)', text: 'oklch(0.35 0.10 145)' },
  INTAKE:                { bg: 'oklch(0.95 0.015 240)', text: 'oklch(0.30 0.018 240)' },
  INVESTIGATION:         { bg: 'oklch(0.94 0.020 200)', text: 'oklch(0.32 0.09 200)'  },
  DISCOVERY:             { bg: 'oklch(0.94 0.025 220)', text: 'oklch(0.35 0.08 220)'  },
  SETTLEMENT_NEGOTIATION:{ bg: 'oklch(0.94 0.025 290)', text: 'oklch(0.38 0.10 290)'  },
  SETTLEMENT:            { bg: 'oklch(0.94 0.025 290)', text: 'oklch(0.38 0.10 290)'  },
  SETTLED:               { bg: 'oklch(0.94 0.025 145)', text: 'oklch(0.35 0.10 145)'  },
  PENDING:               { bg: 'oklch(0.96 0.04 75)',   text: 'oklch(0.40 0.10 75)'   },
  CLOSED:                { bg: 'oklch(0.93 0.005 60)',  text: 'oklch(0.50 0.006 60)'  },
  ARCHIVED:              { bg: 'oklch(0.93 0.005 60)',  text: 'oklch(0.60 0.005 60)'  },
};
const getStatusStyle = (s) => STATUS_STYLES[s] || STATUS_STYLES.PENDING;

const formatCurrency = (v) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD',
    minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

const greet = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

// ── Dashboard ────────────────────────────────────────────────────────────────
const Dashboard = () => {
  const { user } = useAuth();
  const toast = useToast();
  const [state, setState] = useState({ data: null, loading: true, error: null });

  const safeData = useMemo(() => {
    const d = state.data;
    return {
      cases:      Array.isArray(d?.cases)      ? d.cases      : [],
      activities: Array.isArray(d?.activities) ? d.activities : [],
      stats: d?.stats || { totalCases: 0, activeCases: 0, settledCases: 0, totalRevenue: 0 },
    };
  }, [state.data]);

  useEffect(() => {
    const load = async () => {
      try {
        setState(p => ({ ...p, loading: true, error: null }));
        const res = await fetchWithAuth('/api/dashboard/stats');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const r = await res.json();
        setState({
          data: {
            cases:      Array.isArray(r.recentCases)   ? r.recentCases   : [],
            activities: Array.isArray(r.recentActivity) ? r.recentActivity : [],
            stats: {
              totalCases:   Number(r.caseStats?.total)          || 0,
              activeCases:  Number(r.caseStats?.active)         || 0,
              settledCases: Number(r.caseStats?.settled)        || 0,
              totalRevenue: Number(r.settlementStats?.totalFees) || 0,
            },
          },
          loading: false, error: null,
        });
      } catch (err) {
        setState({
          data: { cases: [], activities: [], stats: { totalCases: 0, activeCases: 0, settledCases: 0, totalRevenue: 0 } },
          loading: false, error: err.message,
        });
      }
    };
    load();
    const iv = setInterval(load, 30000);
    return () => clearInterval(iv);
  }, []);

  const { stats, cases: recentCases, activities } = safeData;
  const avgCaseValue = stats.totalCases > 0 ? stats.totalRevenue / stats.totalCases : 0;

  const chartFallback = {
    casesByMonth: ['Jan','Feb','Mar','Apr','May','Jun'].map(month => ({ month, opened: 0, closed: 0, pending: 0 })),
    revenueByType: [{ name: 'Personal Injury', value: 0 }, { name: 'Auto Accident', value: 0 }],
  };

  // ── Shared surface style
  const surface = {
    backgroundColor: 'oklch(0.99 0.003 60)',
    border: '1px solid oklch(0.88 0.005 60)',
  };
  const divider = { borderColor: 'oklch(0.88 0.005 60)' };

  if (state.loading) {
    return (
      <div className="flex items-center justify-center" style={{ height: '40vh' }}>
        <div className="animate-spin rounded-full h-8 w-8"
          style={{ borderWidth: 2, borderStyle: 'solid',
            borderColor: 'oklch(0.88 0.005 60)', borderTopColor: 'oklch(0.42 0.022 240)' }} />
        <span className="ml-3 text-sm" style={{ color: 'oklch(0.55 0.006 60)' }}>Loading…</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* ── Header strip ──────────────────────────────────────────────────── */}
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: 'oklch(0.18 0.008 60)', letterSpacing: '-0.01em' }}>
            {greet()}, {user?.firstName || 'Counselor'}
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'oklch(0.62 0.005 60)' }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        {state.error && (
          <div className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded"
            style={{ backgroundColor: 'oklch(0.96 0.04 75)', color: 'oklch(0.40 0.10 75)' }}>
            <ExclamationTriangleIcon className="h-3.5 w-3.5" />
            {state.error}
          </div>
        )}
      </div>

      {/* ── Stat strip — large numbers, no icon medallions, hairline dividers ── */}
      <div className="rounded-lg overflow-hidden" style={surface}>
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0"
          style={{ borderColor: 'oklch(0.88 0.005 60)' }}>
          {[
            { label: 'Total Cases',  value: stats.totalCases,               fmt: String,         link: '/app/cases'               },
            { label: 'Active',       value: stats.activeCases,              fmt: String,         link: '/app/cases?status=active'  },
            { label: 'Revenue',      value: stats.totalRevenue,             fmt: formatCurrency, link: '/app/reports'             },
            { label: 'Avg Case',     value: avgCaseValue,                   fmt: formatCurrency, link: '/app/reports'             },
          ].map((s, i) => (
            <Link
              key={s.label}
              to={s.link}
              className="block px-6 py-5 group transition-colors hover:bg-[oklch(0.96_0.004_60)]"
              style={{ textDecoration: 'none' }}
            >
              <p className="text-xs font-semibold uppercase tracking-widest mb-2"
                style={{ color: 'oklch(0.62 0.005 60)', letterSpacing: '0.07em' }}>
                {s.label}
              </p>
              <p className="font-semibold leading-none"
                style={{
                  fontSize: 'clamp(1.5rem, 2.5vw, 2rem)',
                  color: 'oklch(0.18 0.008 60)',
                  letterSpacing: '-0.02em',
                  fontVariantNumeric: 'tabular-nums',
                }}>
                {s.fmt(s.value)}
              </p>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Quick-action chips — not a panel ──────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-widest"
          style={{ color: 'oklch(0.62 0.005 60)', letterSpacing: '0.07em' }}>
          Quick actions
        </span>
        {[
          { to: '/app/cases/new',   label: '+ New Case'   },
          { to: '/app/clients/new', label: '+ Add Client' },
          { to: '/app/time',        label: '+ Log Time'   },
          { to: '/app/documents',   label: '+ Upload Doc' },
        ].map(({ to, label }) => (
          <Link
            key={to}
            to={to}
            className="px-3 py-1 rounded text-xs font-medium transition-colors hover:bg-[oklch(0.94_0.006_60)]"
            style={{
              border: '1px solid oklch(0.85 0.006 60)',
              color: 'oklch(0.30 0.008 60)',
              backgroundColor: 'oklch(0.99 0.003 60)',
            }}
          >
            {label}
          </Link>
        ))}
      </div>

      {/* ── Main content: 3:2 split ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

        {/* Recent cases — takes 3 columns */}
        <div className="lg:col-span-3 rounded-lg overflow-hidden" style={surface}>
          <div className="flex items-center justify-between px-5 py-3.5 border-b" style={divider}>
            <h2 className="text-sm font-semibold" style={{ color: 'oklch(0.18 0.008 60)' }}>
              Recent Cases
              <span className="ml-2 text-xs font-normal" style={{ color: 'oklch(0.62 0.005 60)' }}>
                ({recentCases.length})
              </span>
            </h2>
            <Link to="/app/cases" className="text-xs font-medium" style={{ color: 'oklch(0.42 0.022 240)' }}>
              All cases →
            </Link>
          </div>

          {recentCases.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <DocumentIcon className="mx-auto h-8 w-8 mb-3" style={{ color: 'oklch(0.78 0.005 60)' }} />
              <p className="text-sm mb-3" style={{ color: 'oklch(0.55 0.006 60)' }}>No cases yet.</p>
              <Link to="/app/cases/new" className="inline-block px-4 py-2 rounded text-sm font-medium"
                style={{ backgroundColor: 'oklch(0.30 0.018 240)', color: 'oklch(0.97 0.005 60)' }}>
                Create first case
              </Link>
            </div>
          ) : (
            /* Dense table, no outer card per row */
            <div>
              <div className="px-5 py-2 grid grid-cols-12 gap-3 border-b"
                style={{ ...divider, backgroundColor: 'oklch(0.97 0.005 60)' }}>
                {[
                  { label: 'Case',    span: 'col-span-4' },
                  { label: 'Type',    span: 'col-span-3' },
                  { label: 'Value',   span: 'col-span-2' },
                  { label: 'Status',  span: 'col-span-2' },
                  { label: 'Updated', span: 'col-span-1 text-right' },
                ].map(({ label, span }) => (
                  <p key={label} className={`text-xs font-semibold uppercase ${span}`}
                    style={{ color: 'oklch(0.62 0.005 60)', letterSpacing: '0.06em' }}>
                    {label}
                  </p>
                ))}
              </div>
              {recentCases.slice(0, 6).map((c, i) => {
                const ss = getStatusStyle(c?.status);
                return (
                  <Link
                    key={c?.id || i}
                    to={`/app/cases/${c?.id || ''}`}
                    className="grid grid-cols-12 gap-3 px-5 py-3 items-center border-b last:border-0 transition-colors hover:bg-[oklch(0.97_0.004_60)]"
                    style={{
                      borderColor: 'oklch(0.93 0.004 60)',
                      textDecoration: 'none',
                    }}
                  >
                    <p className="col-span-4 text-sm font-medium truncate" style={{ color: 'oklch(0.18 0.008 60)' }}>
                      {c?.title || 'Unnamed'}
                    </p>
                    <p className="col-span-3 text-xs truncate capitalize" style={{ color: 'oklch(0.55 0.006 60)' }}>
                      {(c?.type || 'General').replaceAll('_', ' ').toLowerCase()}
                    </p>
                    <p className="col-span-2 text-xs font-medium"
                      style={{ color: 'oklch(0.18 0.008 60)', fontVariantNumeric: 'tabular-nums' }}>
                      {c?.value ? formatCurrency(c.value) : '–'}
                    </p>
                    <span className="col-span-2 inline-flex px-2 py-0.5 text-xs font-medium rounded-full w-fit"
                      style={{ backgroundColor: ss.bg, color: ss.text }}>
                      {(c?.status || 'ACTIVE').replaceAll('_', ' ')}
                    </span>
                    <p className="col-span-1 text-xs text-right" style={{ color: 'oklch(0.62 0.005 60)' }}>
                      {c?.lastActivity ? formatDate(c.lastActivity) : '–'}
                    </p>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Activity — 2 columns */}
        <div className="lg:col-span-2 rounded-lg overflow-hidden" style={surface}>
          <div className="flex items-center justify-between px-5 py-3.5 border-b" style={divider}>
            <h2 className="text-sm font-semibold" style={{ color: 'oklch(0.18 0.008 60)' }}>
              Activity
            </h2>
            <Link to="/app/tasks" className="text-xs font-medium" style={{ color: 'oklch(0.42 0.022 240)' }}>
              All →
            </Link>
          </div>

          {activities.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <BellIcon className="mx-auto h-7 w-7 mb-2" style={{ color: 'oklch(0.78 0.005 60)' }} />
              <p className="text-sm" style={{ color: 'oklch(0.55 0.006 60)' }}>No recent activity.</p>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: 'oklch(0.93 0.004 60)' }}>
              {activities.slice(0, 8).map((a, i) => (
                <div key={a?.id || i} className="px-5 py-3">
                  <p className="text-sm leading-snug" style={{ color: 'oklch(0.25 0.008 60)' }}>
                    {a?.action || a?.description || 'Activity'}
                  </p>
                  <div className="flex items-center justify-between mt-1">
                    {a?.user && (
                      <p className="text-xs" style={{ color: 'oklch(0.62 0.005 60)' }}>
                        {a.user.firstName} {a.user.lastName}
                      </p>
                    )}
                    <p className="text-xs ml-auto" style={{ color: 'oklch(0.72 0.005 60)' }}>
                      {a?.createdAt ? formatDate(a.createdAt) : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Charts — full width ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="rounded-lg overflow-hidden" style={surface}>
          <div className="px-5 py-3.5 border-b" style={divider}>
            <h2 className="text-sm font-semibold" style={{ color: 'oklch(0.18 0.008 60)' }}>Cases by Month</h2>
          </div>
          <div className="p-5">
            <InteractiveChart
              data={chartFallback.casesByMonth}
              type="bar"
              xAxisKey="month"
              yAxisKeys={['opened', 'closed', 'pending']}
              colors={['#4a6fa5', '#2d8c5e', '#b87a1a']}
              height={240}
              allowTypeChange={true}
              formatters={{
                opened: (v) => `${v} cases`,
                closed: (v) => `${v} cases`,
                pending: (v) => `${v} cases`,
              }}
            />
          </div>
        </div>
        <div className="rounded-lg overflow-hidden" style={surface}>
          <div className="px-5 py-3.5 border-b" style={divider}>
            <h2 className="text-sm font-semibold" style={{ color: 'oklch(0.18 0.008 60)' }}>Revenue by Type</h2>
          </div>
          <div className="p-5">
            <InteractiveChart
              data={chartFallback.revenueByType}
              type="pie"
              xAxisKey="name"
              yAxisKeys={['value']}
              height={240}
              formatters={{ value: formatCurrency }}
            />
          </div>
        </div>
      </div>

    </div>
  );
};

export default Dashboard;
