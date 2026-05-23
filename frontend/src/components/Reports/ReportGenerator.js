import React, { useState, useEffect } from 'react';
import {
  DocumentIcon,
  CalendarIcon,
  FunnelIcon,
  DocumentArrowDownIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  ScaleIcon,
  UserGroupIcon,
  ClockIcon
} from '../Icons';
import { 
  CaseReportPDFGenerator, 
  InvoicePDFGenerator, 
  AnalyticsPDFGenerator,
  BulkPDFGenerator 
} from '../PDF/PDFGenerator';
import { PDFService } from '../../services/pdfService';
import axios from 'axios';
import { useToast } from '../Common/Toast';
import LoadingSpinner from '../Common/LoadingSpinner';

const ReportGenerator = () => {
  const [reportType, setReportType] = useState('case-summary');
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
    endDate: new Date().toISOString().split('T')[0]
  });
  const [filters, setFilters] = useState({
    attorney: '',
    status: '',
    caseType: '',
    client: ''
  });
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [availableFilters, setAvailableFilters] = useState({
    attorneys: [],
    statuses: [],
    caseTypes: [],
    clients: []
  });
  const toast = useToast();

  // Report type configurations
  const reportTypes = [
    {
      id: 'case-summary',
      name: 'Case Summary Report',
      description: 'Overview of all cases within date range',
      icon: DocumentIcon,
      color: 'blue'
    },
    {
      id: 'financial',
      name: 'Financial Report',
      description: 'Revenue, billing, and settlement analysis',
      icon: CurrencyDollarIcon,
      color: 'green'
    },
    {
      id: 'attorney-performance',
      name: 'Attorney Performance',
      description: 'Individual attorney metrics and statistics',
      icon: UserGroupIcon,
      color: 'purple'
    },
    {
      id: 'time-tracking',
      name: 'Time Tracking Report',
      description: 'Billable hours and time allocation',
      icon: ClockIcon,
      color: 'yellow'
    },
    {
      id: 'settlement-analysis',
      name: 'Settlement Analysis',
      description: 'Settlement trends and case outcomes',
      icon: ScaleIcon,
      color: 'indigo'
    },
    {
      id: 'comprehensive',
      name: 'Comprehensive Dashboard',
      description: 'Complete analytics and metrics',
      icon: ChartBarIcon,
      color: 'red'
    }
  ];

  useEffect(() => {
    fetchFilterOptions();
  }, []);

  useEffect(() => {
    if (reportType) {
      fetchReportData();
    }
  }, [reportType, dateRange, filters]);

  const fetchFilterOptions = async () => {
    try {
      const [attorneysRes, statusesRes, typesRes, clientsRes] = await Promise.all([
        axios.get('/api/users?role=attorney'),
        axios.get('/api/cases/statuses'),
        axios.get('/api/cases/types'),
        axios.get('/api/clients')
      ]);

      setAvailableFilters({
        attorneys: attorneysRes.data || [],
        statuses: statusesRes.data || [],
        caseTypes: typesRes.data || [],
        clients: clientsRes.data || []
      });
    } catch (error) {
      console.error('Error fetching filter options:', error);
    }
  };

  const fetchReportData = async () => {
    if (loading) return;
    
    setLoading(true);
    try {
      const params = {
        type: reportType,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        ...filters
      };

      const response = await axios.get('/api/reports/generate', { params });
      setReportData(response.data);
    } catch (error) {
      console.error('Error fetching report data:', error);
      toast.error('Failed to fetch report data');
    } finally {
      setLoading(false);
    }
  };

  const generateCustomReport = async () => {
    if (!reportData) return;
    
    setGenerating(true);
    try {
      let blob;
      const filename = `${reportType}-report-${dateRange.startDate}-${dateRange.endDate}.pdf`;

      switch (reportType) {
        case 'comprehensive':
          blob = await PDFService.generateAnalyticsReport(reportData);
          break;
        default:
          // Generate a custom report using jsPDF
          blob = await generateCustomPDF(reportData, reportType);
      }

      if (blob) {
        PDFService.downloadBlob(blob, filename);
        toast.success('Report generated successfully!');
      }
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Failed to generate report');
    } finally {
      setGenerating(false);
    }
  };

  const generateCustomPDF = async (data, type) => {
    // This would use jsPDF to create custom reports based on type
    // For now, using the analytics report as a template
    return await PDFService.generateAnalyticsReport(data);
  };

  const generateBulkCaseReports = async () => {
    if (!reportData?.cases) return;
    
    setGenerating(true);
    try {
      const documents = reportData.cases.map((caseData, index) => ({
        type: 'case-report',
        caseData,
        clientData: caseData.client,
        activities: caseData.activities || [],
        filename: `case-report-${caseData.caseNumber || index}.pdf`
      }));

      // Use BulkPDFGenerator logic
      for (let i = 0; i < documents.length; i++) {
        const doc = documents[i];
        const blob = await PDFService.generateCaseReport(doc.caseData, doc.clientData, doc.activities);
        PDFService.downloadBlob(blob, doc.filename);
        
        // Small delay between downloads
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      toast.success(`Generated ${documents.length} case reports!`);
    } catch (error) {
      console.error('Error generating bulk reports:', error);
      toast.error('Failed to generate bulk reports');
    } finally {
      setGenerating(false);
    }
  };

  const currentReportType = reportTypes.find(type => type.id === reportType);
  const IconComponent = currentReportType?.icon || DocumentIcon;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Report Generator</h1>
          <p className="mt-2 text-sm text-gray-700">
            Generate comprehensive reports and analytics for your legal practice.
          </p>
        </div>
      </div>

      {/* Report Configuration */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Report Configuration</h3>
          
          {/* Report Type Selection */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Report Type
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {reportTypes.map((type) => {
                  const TypeIcon = type.icon;
                  return (
                    <button
                      key={type.id}
                      onClick={() => setReportType(type.id)}
                      className={`p-4 border-2 rounded-lg text-left transition-colors ${
                        reportType === type.id
                          ? `border-${type.color}-500 bg-${type.color}-50`
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <TypeIcon className={`h-6 w-6 ${
                          reportType === type.id ? `text-${type.color}-600` : 'text-gray-400'
                        }`} />
                        <div>
                          <p className={`text-sm font-medium ${
                            reportType === type.id ? `text-${type.color}-900` : 'text-gray-900'
                          }`}>
                            {type.name}
                          </p>
                          <p className="text-xs text-gray-500">{type.description}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                  className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                  className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Attorney
                </label>
                <select
                  value={filters.attorney}
                  onChange={(e) => setFilters(prev => ({ ...prev, attorney: e.target.value }))}
                  className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Attorneys</option>
                  {availableFilters.attorneys.map((attorney) => (
                    <option key={attorney.id} value={attorney.id}>
                      {attorney.firstName} {attorney.lastName}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Case Status
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                  className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Statuses</option>
                  {availableFilters.statuses.map((status) => (
                    <option key={status} value={status}>
                      {status.replace('_', ' ')}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Case Type
                </label>
                <select
                  value={filters.caseType}
                  onChange={(e) => setFilters(prev => ({ ...prev, caseType: e.target.value }))}
                  className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Types</option>
                  {availableFilters.caseTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Client
                </label>
                <select
                  value={filters.client}
                  onChange={(e) => setFilters(prev => ({ ...prev, client: e.target.value }))}
                  className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Clients</option>
                  {availableFilters.clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.firstName} {client.lastName}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Report Preview & Actions */}
      {reportData && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                {currentReportType?.name} Preview
              </h3>
              <div className="flex space-x-3">
                {reportData.cases && reportData.cases.length > 0 && (
                  <button
                    onClick={generateBulkCaseReports}
                    disabled={generating}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                  >
                    {generating ? (
                      <LoadingSpinner size="sm" className="mr-2" />
                    ) : (
                      <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
                    )}
                    {generating ? 'Generating...' : `Bulk Download (${reportData.cases.length})`}
                  </button>
                )}
                
                <button
                  onClick={generateCustomReport}
                  disabled={generating || !reportData}
                  className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-${currentReportType?.color}-600 hover:bg-${currentReportType?.color}-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${currentReportType?.color}-500 disabled:opacity-50`}
                >
                  {generating ? (
                    <LoadingSpinner size="sm" className="mr-2" />
                  ) : (
                    <IconComponent className="h-4 w-4 mr-2" />
                  )}
                  {generating ? 'Generating...' : 'Download Report'}
                </button>
              </div>
            </div>

            {/* Report Summary */}
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">
                    {reportData.totalCases || reportData.cases?.length || 0}
                  </p>
                  <p className="text-sm text-gray-500">Total Cases</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">
                    ${(reportData.totalRevenue || 0).toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-500">Total Revenue</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">
                    {reportData.totalHours || 0}
                  </p>
                  <p className="text-sm text-gray-500">Billable Hours</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">
                    {reportData.avgSettlement || 0}%
                  </p>
                  <p className="text-sm text-gray-500">Success Rate</p>
                </div>
              </div>
            </div>

            {loading && (
              <div className="flex items-center justify-center py-8">
                <LoadingSpinner size="lg" />
                <p className="ml-3 text-sm text-gray-500">Loading report data...</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportGenerator;