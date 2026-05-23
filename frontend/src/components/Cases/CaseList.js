import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { endpoints } from '../../utils/api';
import {
  MagnifyingGlassIcon,
  PlusIcon,
  FunnelIcon,
  EyeIcon,
  CalendarIcon,
  UserIcon,
  CurrencyDollarIcon,
  DocumentIcon
} from '../Icons';
import { Menu } from '@headlessui/react';

// Status badge styles using OKLCH tokens (style objects, not Tailwind classes)
const STATUS_STYLES = {
  INTAKE:                { bg: 'oklch(0.95 0.015 240)', text: 'oklch(0.30 0.018 240)' },
  INVESTIGATION:         { bg: 'oklch(0.96 0.04 75)',   text: 'oklch(0.40 0.10 75)'  },
  ACTIVE:                { bg: 'oklch(0.95 0.025 145)', text: 'oklch(0.35 0.10 145)' },
  SETTLEMENT_NEGOTIATION:{ bg: 'oklch(0.94 0.025 290)', text: 'oklch(0.38 0.10 290)' },
  SETTLED:               { bg: 'oklch(0.94 0.025 220)', text: 'oklch(0.35 0.08 220)' },
  CLOSED:                { bg: 'oklch(0.93 0.005 60)',  text: 'oklch(0.50 0.006 60)' },
  ARCHIVED:              { bg: 'oklch(0.93 0.005 60)',  text: 'oklch(0.60 0.005 60)' },
};

const getStatusStyle = (status) => STATUS_STYLES[status] || STATUS_STYLES.CLOSED;

const formatCurrency = (amount) => {
  if (!amount) return '-';
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', minimumFractionDigits: 0
  }).format(amount);
};

const inputStyle = {
  border: '1px solid oklch(0.85 0.006 60)',
  backgroundColor: 'oklch(0.99 0.003 60)',
  color: 'oklch(0.18 0.008 60)',
};

const CaseList = () => {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({ status: '', type: '', attorneyId: '' });
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });
  const abortRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(fetchCases, 300);
    return () => clearTimeout(debounceRef.current);
  }, [searchTerm, filters, pagination.page]);

  const fetchCases = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...(searchTerm && { search: searchTerm }),
        ...(filters.status && { status: filters.status }),
        ...(filters.type && { type: filters.type }),
        ...(filters.attorneyId && { attorneyId: filters.attorneyId }),
      };
      const response = await endpoints.cases.list(params);
      setCases(response.cases || []);
      setPagination(prev => ({ ...prev, ...(response.pagination || {}) }));
    } catch (error) {
      console.error('Error fetching cases:', error);
      setCases([]);
    } finally {
      setLoading(false);
    }
  };

  const cardStyle = {
    backgroundColor: 'oklch(0.99 0.003 60)',
    border: '1px solid oklch(0.88 0.005 60)',
    borderRadius: '0.5rem',
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'oklch(0.18 0.008 60)' }}>Cases</h1>
          <p className="mt-0.5 text-sm" style={{ color: 'oklch(0.55 0.006 60)' }}>
            Manage all legal cases and track their progress.
          </p>
        </div>
        <Link
          to="/app/cases/new"
          className="inline-flex items-center px-3 py-2 rounded text-sm font-medium flex-shrink-0"
          style={{ backgroundColor: 'oklch(0.30 0.018 240)', color: 'oklch(0.97 0.005 60)' }}
        >
          <PlusIcon className="-ml-0.5 mr-1.5 h-4 w-4" />
          New Case
        </Link>
      </div>

      {/* Filters */}
      <div className="p-4 flex flex-col sm:flex-row gap-3" style={cardStyle}>
        {/* Search */}
        <div className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none" style={{ color: 'oklch(0.62 0.005 60)' }}>
            <MagnifyingGlassIcon className="h-4 w-4" />
          </div>
          <input
            type="text"
            className="block w-full pl-9 pr-3 py-2 rounded text-sm focus:outline-none"
            style={inputStyle}
            placeholder="Search cases by title, number, or client..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Status filter */}
        <select
          className="px-3 py-2 rounded text-sm focus:outline-none"
          style={inputStyle}
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
        >
          <option value="">All Status</option>
          <option value="INTAKE">Intake</option>
          <option value="INVESTIGATION">Investigation</option>
          <option value="ACTIVE">Active</option>
          <option value="SETTLEMENT_NEGOTIATION">Settlement Negotiation</option>
          <option value="SETTLED">Settled</option>
          <option value="CLOSED">Closed</option>
          <option value="ARCHIVED">Archived</option>
        </select>

        {/* Type filter */}
        <select
          className="px-3 py-2 rounded text-sm focus:outline-none"
          style={inputStyle}
          value={filters.type}
          onChange={(e) => setFilters({ ...filters, type: e.target.value })}
        >
          <option value="">All Types</option>
          <option value="PERSONAL_INJURY">Personal Injury</option>
          <option value="AUTO_ACCIDENT">Auto Accident</option>
          <option value="MEDICAL_MALPRACTICE">Medical Malpractice</option>
          <option value="WORKERS_COMP">Workers' Compensation</option>
          <option value="PREMISES_LIABILITY">Premises Liability</option>
          <option value="PRODUCT_LIABILITY">Product Liability</option>
        </select>
      </div>

      {/* Table */}
      <div style={cardStyle}>
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3">
            <div
              className="animate-spin rounded-full h-8 w-8"
              style={{ borderWidth: 2, borderStyle: 'solid', borderColor: 'oklch(0.88 0.005 60)', borderTopColor: 'oklch(0.42 0.022 240)' }}
            />
            <p className="text-sm" style={{ color: 'oklch(0.55 0.006 60)' }}>Loading cases...</p>
          </div>
        ) : !cases || cases.length === 0 ? (
          <div className="p-12 text-center">
            <DocumentIcon className="mx-auto h-10 w-10 mb-3" style={{ color: 'oklch(0.72 0.005 60)' }} />
            <h3 className="text-sm font-medium mb-1" style={{ color: 'oklch(0.18 0.008 60)' }}>No cases found</h3>
            <p className="text-sm mb-4" style={{ color: 'oklch(0.55 0.006 60)' }}>
              {searchTerm || filters.status || filters.type
                ? 'Try adjusting your search criteria.'
                : 'Get started by creating your first case.'}
            </p>
            {!searchTerm && !filters.status && !filters.type && (
              <Link
                to="/app/cases/new"
                className="inline-flex items-center px-4 py-2 rounded text-sm font-medium"
                style={{ backgroundColor: 'oklch(0.30 0.018 240)', color: 'oklch(0.97 0.005 60)' }}
              >
                <PlusIcon className="-ml-0.5 mr-1.5 h-4 w-4" />
                New Case
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid oklch(0.88 0.005 60)', backgroundColor: 'oklch(0.97 0.005 60)' }}>
                  {['Case', 'Client', 'Status', 'Attorney', 'Settlement', 'Opened', ''].map((h) => (
                    <th
                      key={h}
                      className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                      style={{ color: 'oklch(0.55 0.006 60)' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cases.map((c, i) => {
                  const ss = getStatusStyle(c.status);
                  return (
                    <tr
                      key={c.id}
                      style={{ borderBottom: '1px solid oklch(0.93 0.004 60)' }}
                    >
                      <td className="px-5 py-4">
                        <p className="text-sm font-medium" style={{ color: 'oklch(0.18 0.008 60)' }}>{c.title}</p>
                        <p className="text-xs mt-0.5" style={{ color: 'oklch(0.55 0.006 60)' }}>{c.caseNumber}</p>
                        <p className="text-xs capitalize" style={{ color: 'oklch(0.62 0.005 60)' }}>
                          {c.type.replaceAll('_', ' ').toLowerCase()}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: 'oklch(0.93 0.005 60)' }}
                          >
                            <UserIcon className="h-3.5 w-3.5" style={{ color: 'oklch(0.50 0.006 60)' }} />
                          </div>
                          <div>
                            <p className="text-sm font-medium" style={{ color: 'oklch(0.18 0.008 60)' }}>
                              {c.client?.firstName} {c.client?.lastName}
                            </p>
                            <p className="text-xs" style={{ color: 'oklch(0.55 0.006 60)' }}>{c.client?.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className="inline-flex px-2 py-0.5 text-xs font-semibold rounded-full"
                          style={{ backgroundColor: ss.bg, color: ss.text }}
                        >
                          {c.status.replaceAll('_', ' ')}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        {c.attorney ? (
                          <div>
                            <p className="text-sm font-medium" style={{ color: 'oklch(0.18 0.008 60)' }}>
                              {c.attorney.firstName} {c.attorney.lastName}
                            </p>
                            {c.paralegal && (
                              <p className="text-xs" style={{ color: 'oklch(0.55 0.006 60)' }}>
                                Para: {c.paralegal.firstName} {c.paralegal.lastName}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm" style={{ color: 'oklch(0.72 0.005 60)' }}>Unassigned</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        {c.settlementAmount ? (
                          <div>
                            <p className="text-sm font-medium" style={{ color: 'oklch(0.48 0.12 145)' }}>
                              {formatCurrency(c.settlementAmount)}
                            </p>
                            <p className="text-xs" style={{ color: 'oklch(0.55 0.006 60)' }}>
                              Net: {formatCurrency(c.netToClient)}
                            </p>
                          </div>
                        ) : (
                          <span className="text-sm" style={{ color: 'oklch(0.72 0.005 60)' }}>-</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1 text-sm" style={{ color: 'oklch(0.55 0.006 60)' }}>
                          <CalendarIcon className="h-3.5 w-3.5" />
                          {new Date(c.dateOpened).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <Link
                          to={`/app/cases/${c.id}`}
                          className="inline-flex items-center gap-1 text-sm font-medium"
                          style={{ color: 'oklch(0.42 0.022 240)' }}
                        >
                          <EyeIcon className="h-3.5 w-3.5" />
                          View
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div
            className="px-5 py-3 flex items-center justify-between"
            style={{ borderTop: '1px solid oklch(0.88 0.005 60)' }}
          >
            <p className="text-sm" style={{ color: 'oklch(0.55 0.006 60)' }}>
              Showing{' '}
              <span className="font-medium" style={{ color: 'oklch(0.18 0.008 60)' }}>
                {(pagination.page - 1) * pagination.limit + 1}
              </span>{' '}
              to{' '}
              <span className="font-medium" style={{ color: 'oklch(0.18 0.008 60)' }}>
                {Math.min(pagination.page * pagination.limit, pagination.total)}
              </span>{' '}
              of{' '}
              <span className="font-medium" style={{ color: 'oklch(0.18 0.008 60)' }}>
                {pagination.total}
              </span>{' '}
              results
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                disabled={pagination.page === 1}
                className="px-3 py-1.5 rounded text-sm disabled:opacity-40"
                style={{ border: '1px solid oklch(0.85 0.006 60)', color: 'oklch(0.40 0.008 60)' }}
              >
                Previous
              </button>
              {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setPagination(prev => ({ ...prev, page }))}
                  className="px-3 py-1.5 rounded text-sm"
                  style={
                    page === pagination.page
                      ? { backgroundColor: 'oklch(0.91 0.010 240)', color: 'oklch(0.25 0.018 240)', border: '1px solid oklch(0.85 0.05 240)' }
                      : { border: '1px solid oklch(0.85 0.006 60)', color: 'oklch(0.50 0.006 60)' }
                  }
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: Math.min(prev.pages, prev.page + 1) }))}
                disabled={pagination.page === pagination.pages}
                className="px-3 py-1.5 rounded text-sm disabled:opacity-40"
                style={{ border: '1px solid oklch(0.85 0.006 60)', color: 'oklch(0.40 0.008 60)' }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CaseList;
