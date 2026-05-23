import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { endpoints } from '../../utils/api';
import {
  ArrowLeftIcon,
  PencilIcon,
  UserIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  CalendarIcon,
  DocumentIcon,
  ChatBubbleLeftRightIcon
} from '../Icons';

const ClientDetail = () => {
  const { id } = useParams();
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchClientData();
  }, [id]);

  const fetchClientData = async () => {
    try {
      const client = await endpoints.clients.get(id);
      setClient(client);
    } catch (error) {
      console.error('Error fetching client data:', error);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'overview', name: 'Overview' },
    { id: 'cases', name: 'Cases' },
    { id: 'communications', name: 'Communications' },
    { id: 'documents', name: 'Documents' }
  ];

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900">Client not found</h3>
        <p className="mt-2 text-sm text-gray-500">The client you're looking for doesn't exist.</p>
        <Link to="/app/clients" className="mt-4 text-blue-600 hover:text-blue-500">
          ← Back to Clients
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
                to="/app/clients"
                className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700"
              >
                <ArrowLeftIcon className="mr-1 h-4 w-4" />
                Back to Clients
              </Link>
            </div>
            <div className="flex items-center space-x-3">
              <button className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                <PencilIcon className="-ml-1 mr-2 h-4 w-4" />
                Edit Client
              </button>
            </div>
          </div>
          
          <div className="mt-4 flex items-center space-x-4">
            <div className="flex-shrink-0">
              <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="text-2xl font-medium text-blue-600">
                  {client.firstName.charAt(0)}{client.lastName.charAt(0)}
                </span>
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {client.firstName} {client.lastName}
              </h1>
              <p className="text-sm text-gray-500">
                Client since {new Date(client.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DocumentIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Active Cases</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {(client.cases && client.cases.length) || 0}
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
                <ChatBubbleLeftRightIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Communications</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {(client.communications && client.communications.length) || 0}
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
                <DocumentIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Documents</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {(client.documents && client.documents.length) || 0}
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
                {tab.id === 'cases' && client.cases && client.cases.length > 0 && (
                  <span className="ml-2 bg-gray-100 text-gray-600 py-0.5 px-2.5 rounded-full text-xs">
                    {client.cases.length}
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
              {/* Contact Information */}
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Contact Information</h3>
                  <div className="space-y-4">
                    {client.email && (
                      <div className="flex items-center space-x-3">
                        <EnvelopeIcon className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-900">{client.email}</p>
                          <p className="text-sm text-gray-500">Email Address</p>
                        </div>
                      </div>
                    )}
                    {client.phone && (
                      <div className="flex items-center space-x-3">
                        <PhoneIcon className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-900">{client.phone}</p>
                          <p className="text-sm text-gray-500">Phone Number</p>
                        </div>
                      </div>
                    )}
                    {(client.address || client.city || client.state) && (
                      <div className="flex items-center space-x-3">
                        <MapPinIcon className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-900">
                            {client.address}
                            {client.city && `, ${client.city}`}
                            {client.state && `, ${client.state}`}
                            {client.zipCode && ` ${client.zipCode}`}
                          </p>
                          <p className="text-sm text-gray-500">Address</p>
                        </div>
                      </div>
                    )}
                    {client.dateOfBirth && (
                      <div className="flex items-center space-x-3">
                        <CalendarIcon className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-900">
                            {new Date(client.dateOfBirth).toLocaleDateString()}
                          </p>
                          <p className="text-sm text-gray-500">Date of Birth</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Emergency Contact */}
              {(client.emergencyContact || client.emergencyPhone) && (
                <div className="bg-white shadow rounded-lg">
                  <div className="px-4 py-5 sm:p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Emergency Contact</h3>
                    <div className="space-y-4">
                      {client.emergencyContact && (
                        <div className="flex items-center space-x-3">
                          <UserIcon className="h-5 w-5 text-gray-400" />
                          <div>
                            <p className="text-sm text-gray-900">{client.emergencyContact}</p>
                            <p className="text-sm text-gray-500">Contact Name</p>
                          </div>
                        </div>
                      )}
                      {client.emergencyPhone && (
                        <div className="flex items-center space-x-3">
                          <PhoneIcon className="h-5 w-5 text-gray-400" />
                          <div>
                            <p className="text-sm text-gray-900">{client.emergencyPhone}</p>
                            <p className="text-sm text-gray-500">Emergency Phone</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Client Information */}
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Additional Information</h3>
                  <div className="space-y-4">
                    {client.source && (
                      <div>
                        <p className="text-sm font-medium text-gray-900">Referral Source</p>
                        <p className="text-sm text-gray-600">{client.source}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-gray-900">Created By</p>
                      <p className="text-sm text-gray-600">
                        {client.createdBy?.firstName} {client.createdBy?.lastName}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Created On</p>
                      <p className="text-sm text-gray-600">
                        {new Date(client.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {client.notes && (
                <div className="bg-white shadow rounded-lg">
                  <div className="px-4 py-5 sm:p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Notes</h3>
                    <p className="text-sm text-gray-600">{client.notes}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Cases Tab */}
          {activeTab === 'cases' && (
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Cases</h3>
                  <Link
                    to={`/app/cases/new?clientId=${client.id}`}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                  >
                    New Case
                  </Link>
                </div>
                <div className="space-y-4">
                  {client.cases?.map((caseItem) => (
                    <div key={caseItem.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <h4 className="text-lg font-medium text-gray-900">
                              <Link to={`/app/cases/${caseItem.id}`} className="hover:text-blue-600">
                                {caseItem.title}
                              </Link>
                            </h4>
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(caseItem.status)}`}>
                              {caseItem.status.replace('_', ' ')}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500 mt-1">{caseItem.caseNumber}</p>
                          {caseItem.description && (
                            <p className="text-sm text-gray-600 mt-2">{caseItem.description}</p>
                          )}
                          <div className="flex items-center space-x-4 mt-3 text-sm text-gray-500">
                            <span>Opened: {new Date(caseItem.dateOpened).toLocaleDateString()}</span>
                            {caseItem.attorney && (
                              <span>Attorney: {caseItem.attorney.firstName} {caseItem.attorney.lastName}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )) || <p className="text-sm text-gray-500">No cases found for this client.</p>}
                </div>
              </div>
            </div>
          )}

          {/* Communications Tab */}
          {activeTab === 'communications' && (
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Communications</h3>
                <div className="space-y-4">
                  {client.communications?.slice(0, 10).map((comm) => (
                    <div key={comm.id} className="border-l-4 border-blue-400 pl-4 py-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {comm.type} - {comm.direction}
                          </p>
                          {comm.subject && (
                            <p className="text-sm text-gray-600 mt-1">{comm.subject}</p>
                          )}
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(comm.dateTime).toLocaleDateString()} • {comm.user?.firstName} {comm.user?.lastName}
                          </p>
                        </div>
                      </div>
                    </div>
                  )) || <p className="text-sm text-gray-500">No communications recorded.</p>}
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
                  {client.documents?.map((doc) => (
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
        </div>
      </div>
    </div>
  );
};

export default ClientDetail;