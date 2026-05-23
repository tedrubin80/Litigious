import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import {
  ArrowLeftIcon,
  PencilIcon,
  DocumentIcon,
  UserIcon,
  ClockIcon,
  CurrencyDollarIcon,
  CalendarIcon,
  MapPinIcon,
  PhoneIcon,
  EnvelopeIcon,
  DocumentArrowDownIcon
} from '../Icons';
import { CaseReportPDFGenerator } from '../PDF/PDFGenerator';

const CaseDetail = () => {
  const { id } = useParams();
  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchCaseData();
  }, [id]);

  const fetchCaseData = async () => {
    try {
      const response = await axios.get(`/cases/${id}`);
      setCaseData(response.data);
    } catch (error) {
      console.error('Error fetching case data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      INTAKE: 'bg-blue-100 text-blue-800',
      INVESTIGATION: 'bg-yellow-100 text-yellow-800',
      ACTIVE: 'bg-green-100 text-green-800',
      SETTLEMENT_NEGOTIATION: 'bg-purple-100 text-purple-800',
      SETTLED: 'bg-indigo-100 text-indigo-800',
      CLOSED: 'bg-gray-100 text-gray-800',
      ARCHIVED: 'bg-gray-100 text-gray-500'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const formatCurrency = (amount) => {
    if (!amount) return '$0';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const tabs = [
    { id: 'overview', name: 'Overview' },
    { id: 'timeline', name: 'Timeline' },
    { id: 'documents', name: 'Documents' },
    { id: 'medical', name: 'Medical Records' },
    { id: 'tasks', name: 'Tasks' },
    { id: 'time', name: 'Time Entries' },
    { id: 'communications', name: 'Communications' }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900">Case not found</h3>
        <p className="mt-2 text-sm text-gray-500">The case you're looking for doesn't exist.</p>
        <Link to="/app/cases" className="mt-4 text-blue-600 hover:text-blue-500">
          ← Back to Cases
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="px-4 py-5 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link
                to="/app/cases"
                className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700"
              >
                <ArrowLeftIcon className="mr-1 h-4 w-4" />
                Back to Cases
              </Link>
            </div>
            <div className="flex items-center space-x-3">
              <CaseReportPDFGenerator 
                caseData={caseData}
                clientData={caseData.client}
                activities={caseData.activities || []}
                className="bg-green-600 hover:bg-green-700 focus:ring-green-500"
              />
              <button className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                <PencilIcon className="-ml-1 mr-2 h-4 w-4" />
                Edit Case
              </button>
            </div>
          </div>
          
          <div className="mt-4">
            <div className="flex items-center space-x-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{caseData.title}</h1>
                <p className="text-sm text-gray-500">{caseData.caseNumber}</p>
              </div>
              <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(caseData.status)}`}>
                {caseData.status.replace('_', ' ')}
              </span>
            </div>
            <p className="mt-2 text-gray-600">{caseData.description}</p>
          </div>
        </div>
      </div>

      {/* Case Summary Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <UserIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Client</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {caseData.client?.firstName} {caseData.client?.lastName}
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
                <CalendarIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Date Opened</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {new Date(caseData.dateOpened).toLocaleDateString()}
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
                <CurrencyDollarIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Settlement</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {formatCurrency(caseData.settlementAmount)}
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
                <ClockIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Hours</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {caseData.timeEntries?.reduce((sum, entry) => sum + parseFloat(entry.hours), 0).toFixed(1) || '0'}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div>
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.name}
                {tab.id === 'documents' && caseData.documents?.length > 0 && (
                  <span className="ml-2 bg-gray-100 text-gray-600 py-0.5 px-2.5 rounded-full text-xs">
                    {caseData.documents.length}
                  </span>
                )}
                {tab.id === 'tasks' && caseData.tasks?.length > 0 && (
                  <span className="ml-2 bg-gray-100 text-gray-600 py-0.5 px-2.5 rounded-full text-xs">
                    {caseData.tasks.length}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Client Information */}
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Client Information</h3>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <UserIcon className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {caseData.client?.firstName} {caseData.client?.lastName}
                        </p>
                        <p className="text-sm text-gray-500">Client</p>
                      </div>
                    </div>
                    {caseData.client?.email && (
                      <div className="flex items-center space-x-3">
                        <EnvelopeIcon className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-900">{caseData.client.email}</p>
                          <p className="text-sm text-gray-500">Email</p>
                        </div>
                      </div>
                    )}
                    {caseData.client?.phone && (
                      <div className="flex items-center space-x-3">
                        <PhoneIcon className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-900">{caseData.client.phone}</p>
                          <p className="text-sm text-gray-500">Phone</p>
                        </div>
                      </div>
                    )}
                    {caseData.client?.address && (
                      <div className="flex items-center space-x-3">
                        <MapPinIcon className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-900">{caseData.client.address}</p>
                          <p className="text-sm text-gray-500">Address</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Case Team */}
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Case Team</h3>
                  <div className="space-y-4">
                    {caseData.attorney && (
                      <div className="flex items-center space-x-3">
                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                          <span className="text-sm font-medium text-blue-600">
                            {caseData.attorney?.firstName?.charAt(0) || 'A'}{caseData.attorney?.lastName?.charAt(0) || 'T'}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {caseData.attorney.firstName} {caseData.attorney.lastName}
                          </p>
                          <p className="text-sm text-gray-500">Attorney</p>
                        </div>
                      </div>
                    )}
                    {caseData.paralegal && (
                      <div className="flex items-center space-x-3">
                        <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                          <span className="text-sm font-medium text-green-600">
                            {caseData.paralegal?.firstName?.charAt(0) || 'P'}{caseData.paralegal?.lastName?.charAt(0) || 'A'}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {caseData.paralegal.firstName} {caseData.paralegal.lastName}
                          </p>
                          <p className="text-sm text-gray-500">Paralegal</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Settlement Information */}
              {caseData.settlementAmount && (
                <div className="bg-white shadow rounded-lg">
                  <div className="px-4 py-5 sm:p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Settlement Information</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Settlement Amount:</span>
                        <span className="text-sm font-medium text-gray-900">
                          {formatCurrency(caseData.settlementAmount)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Attorney Fees:</span>
                        <span className="text-sm font-medium text-gray-900">
                          {formatCurrency(caseData.attorneyFees)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Costs:</span>
                        <span className="text-sm font-medium text-gray-900">
                          {formatCurrency(caseData.costs)}
                        </span>
                      </div>
                      <div className="flex justify-between border-t pt-3">
                        <span className="text-sm font-medium text-gray-900">Net to Client:</span>
                        <span className="text-sm font-medium text-green-600">
                          {formatCurrency(caseData.netToClient)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Recent Notes */}
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Notes</h3>
                  <div className="space-y-3">
                    {caseData.notes?.slice(0, 3).map((note) => (
                      <div key={note.id} className="border-l-4 border-blue-400 pl-3">
                        <p className="text-sm text-gray-900">{note.content}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {note.createdBy?.firstName} {note.createdBy?.lastName} • {' '}
                          {new Date(note.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    )) || <p className="text-sm text-gray-500">No notes yet.</p>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Documents Tab */}
          {activeTab === 'documents' && (
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Documents</h3>
                  <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700">
                    Upload Document
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {caseData.documents?.map((doc) => (
                    <div key={doc.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start space-x-3">
                        <DocumentIcon className="h-8 w-8 text-gray-400 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {doc.originalName}
                          </p>
                          <p className="text-sm text-gray-500">{doc.category}</p>
                          <p className="text-xs text-gray-400">
                            Uploaded {new Date(doc.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  )) || <p className="text-sm text-gray-500">No documents uploaded yet.</p>}
                </div>
              </div>
            </div>
          )}

          {/* Tasks Tab */}
          {activeTab === 'tasks' && (
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Tasks</h3>
                  <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700">
                    Add Task
                  </button>
                </div>
                <div className="space-y-4">
                  {caseData.tasks?.map((task) => (
                    <div key={task.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={task.status === 'COMPLETED'}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          readOnly
                        />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{task.title}</p>
                          <p className="text-sm text-gray-500">
                            Assigned to {task.assignedTo?.firstName} {task.assignedTo?.lastName}
                          </p>
                          {task.dueDate && (
                            <p className="text-xs text-gray-400">
                              Due: {new Date(task.dueDate).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        task.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                        task.status === 'IN_PROGRESS' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {task.status.replace('_', ' ')}
                      </span>
                    </div>
                  )) || <p className="text-sm text-gray-500">No tasks assigned yet.</p>}
                </div>
              </div>
            </div>
          )}

          {/* Add other tabs as needed */}
          {activeTab === 'timeline' && (
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Case Timeline</h3>
                <p className="text-sm text-gray-500">Timeline view will be implemented here.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CaseDetail;