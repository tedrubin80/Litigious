import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  CloudArrowUpIcon,
  DocumentIcon,
  FolderIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  TrashIcon,
  ArrowDownTrayIcon,
  PencilIcon,
  TagIcon,
  CalendarIcon,
  UserIcon
} from '../Icons';
import FileUpload from './FileUpload';
import { endpoints } from '../../utils/api';
import { useToast } from '../Common/Toast';
import { handleFormError } from '../../utils/errorHandler';

const DocumentManager = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '');
  const [selectedCaseId, setSelectedCaseId] = useState(searchParams.get('caseId') || '');
  const [selectedClientId, setSelectedClientId] = useState(searchParams.get('clientId') || '');
  const [showUpload, setShowUpload] = useState(false);
  const [cases, setCases] = useState([]);
  const [clients, setClients] = useState([]);
  const [pagination, setPagination] = useState({ current: 1, pages: 1, total: 0, limit: 20 });
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const toast = useToast();

  const categories = [
    { value: 'contract', label: 'Contract' },
    { value: 'medical', label: 'Medical' },
    { value: 'legal', label: 'Legal Documents' },
    { value: 'evidence', label: 'Evidence' },
    { value: 'correspondence', label: 'Correspondence' },
    { value: 'court_filing', label: 'Court Filing' },
    { value: 'insurance', label: 'Insurance' },
    { value: 'settlement', label: 'Settlement' },
    { value: 'photo', label: 'Photos' },
    { value: 'other', label: 'Other' }
  ];

  useEffect(() => {
    fetchDocuments();
    fetchCasesAndClients();
  }, [searchTerm, selectedCategory, selectedCaseId, selectedClientId, sortBy, sortOrder, pagination.current]);

  useEffect(() => {
    // Update URL params
    const params = new URLSearchParams();
    if (searchTerm) params.set('search', searchTerm);
    if (selectedCategory) params.set('category', selectedCategory);
    if (selectedCaseId) params.set('caseId', selectedCaseId);
    if (selectedClientId) params.set('clientId', selectedClientId);
    setSearchParams(params);
  }, [searchTerm, selectedCategory, selectedCaseId, selectedClientId, setSearchParams]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.current,
        limit: pagination.limit,
        sortBy,
        sortOrder
      };
      
      if (searchTerm) params.search = searchTerm;
      if (selectedCategory) params.category = selectedCategory;
      if (selectedCaseId) params.caseId = selectedCaseId;
      if (selectedClientId) params.clientId = selectedClientId;

      const response = await endpoints.documents.list(params);
      setDocuments(response.documents || []);
      setPagination(response.pagination);
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast.error('Failed to load documents');
      handleFormError(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCasesAndClients = async () => {
    try {
      const [casesResponse, clientsResponse] = await Promise.all([
        endpoints.cases.list({ limit: 1000 }),
        endpoints.clients.list({ limit: 1000 })
      ]);
      
      setCases(casesResponse.cases || []);
      setClients(clientsResponse.clients || []);
    } catch (error) {
      console.error('Error fetching cases and clients:', error);
    }
  };

  const handleUploadComplete = (document) => {
    setDocuments(prev => [document, ...prev]);
    toast.success(`Document "${document.filename}" uploaded successfully`);
  };

  const handleUploadError = (error, file) => {
    toast.error(`Failed to upload ${file.name}: ${error.message}`);
  };

  const handleDownload = async (document) => {
    try {
      await endpoints.documents.download(document.id, document.filename);
      toast.success(`Downloading ${document.filename}`);
    } catch (error) {
      console.error('Download error:', error);
      toast.error(`Failed to download ${document.filename}`);
    }
  };

  const handleDelete = async (document) => {
    if (window.confirm(`Are you sure you want to delete "${document.filename}"?`)) {
      try {
        await endpoints.documents.delete(document.id);
        setDocuments(prev => prev.filter(doc => doc.id !== document.id));
        toast.success(`Document "${document.filename}" deleted successfully`);
      } catch (error) {
        console.error('Delete error:', error);
        toast.error(`Failed to delete "${document.filename}"`);
      }
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDocumentIcon = (mimeType) => {
    if (mimeType.startsWith('image/')) {
      return '🖼️';
    } else if (mimeType === 'application/pdf') {
      return '📄';
    } else if (mimeType.includes('word') || mimeType.includes('document')) {
      return '📝';
    } else if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) {
      return '📊';
    }
    return '📎';
  };

  const getCategoryColor = (category) => {
    const colors = {
      medical: 'bg-red-100 text-red-800',
      legal: 'bg-blue-100 text-blue-800',
      evidence: 'bg-purple-100 text-purple-800',
      contract: 'bg-green-100 text-green-800',
      court_filing: 'bg-indigo-100 text-indigo-800',
      insurance: 'bg-orange-100 text-orange-800',
      settlement: 'bg-yellow-100 text-yellow-800',
      correspondence: 'bg-cyan-100 text-cyan-800',
      photo: 'bg-pink-100 text-pink-800',
      other: 'bg-gray-100 text-gray-800'
    };
    return colors[category] || colors.other;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Document Manager</h1>
          <p className="mt-2 text-sm text-gray-700">
            Upload, organize, and manage all case documents securely.
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button
            onClick={() => setShowUpload(!showUpload)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <CloudArrowUpIcon className="h-4 w-4 mr-2" />
            Upload Documents
          </button>
        </div>
      </div>

      {/* Upload Section */}
      {showUpload && (
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="mb-4">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Upload Documents</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select Category</option>
                {categories.map(category => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>

              <select
                value={selectedCaseId}
                onChange={(e) => setSelectedCaseId(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select Case (Optional)</option>
                {cases.map(caseItem => (
                  <option key={caseItem.id} value={caseItem.id}>
                    {caseItem.title}
                  </option>
                ))}
              </select>

              <select
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select Client (Optional)</option>
                {clients.map(client => (
                  <option key={client.id} value={client.id}>
                    {client.firstName} {client.lastName}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <FileUpload
            category={selectedCategory || 'general'}
            caseId={selectedCaseId || null}
            clientId={selectedClientId || null}
            onUploadComplete={handleUploadComplete}
            onUploadError={handleUploadError}
            multiple={true}
            maxFiles={10}
          />
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow border">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search documents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Categories</option>
            {categories.map(category => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </select>

          <select
            value={selectedCaseId}
            onChange={(e) => setSelectedCaseId(e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Cases</option>
            {cases.map(caseItem => (
              <option key={caseItem.id} value={caseItem.id}>
                {caseItem.title}
              </option>
            ))}
          </select>

          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [field, order] = e.target.value.split('-');
              setSortBy(field);
              setSortOrder(order);
            }}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="createdAt-desc">Newest First</option>
            <option value="createdAt-asc">Oldest First</option>
            <option value="filename-asc">Name A-Z</option>
            <option value="filename-desc">Name Z-A</option>
            <option value="size-desc">Largest First</option>
            <option value="size-asc">Smallest First</option>
          </select>
        </div>
      </div>

      {/* Document List */}
      <div className="bg-white shadow rounded-lg">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-12">
            <FolderIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No documents found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || selectedCategory || selectedCaseId 
                ? 'Try adjusting your filters or search terms.'
                : 'Get started by uploading your first document.'
              }
            </p>
          </div>
        ) : (
          <>
            <div className="px-4 py-5 sm:p-6">
              <div className="grid grid-cols-1 gap-4">
                {documents.map((document) => (
                  <div
                    key={document.id}
                    className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="text-2xl">
                          {getDocumentIcon(document.mimeType)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {document.filename}
                          </p>
                          <p className="text-sm text-gray-500">
                            {formatFileSize(document.size)} • {formatDate(document.createdAt)}
                          </p>
                          {document.description && (
                            <p className="text-xs text-gray-400 mt-1 truncate">
                              {document.description}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-4">
                        {/* Document metadata */}
                        <div className="hidden sm:flex items-center space-x-2 text-xs text-gray-500">
                          {document.category && (
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(document.category)}`}>
                              {categories.find(cat => cat.value === document.category)?.label || document.category}
                            </span>
                          )}
                          
                          {document.case && (
                            <span className="flex items-center">
                              <FolderIcon className="h-3 w-3 mr-1" />
                              {document.case.title}
                            </span>
                          )}
                          
                          {document.client && (
                            <span className="flex items-center">
                              <UserIcon className="h-3 w-3 mr-1" />
                              {document.client.firstName} {document.client.lastName}
                            </span>
                          )}
                          
                          {document.uploadedBy && (
                            <span>
                              by {document.uploadedBy.firstName} {document.uploadedBy.lastName}
                            </span>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleDownload(document)}
                            className="text-blue-600 hover:text-blue-700"
                            title="Download"
                          >
                            <ArrowDownTrayIcon className="h-4 w-4" />
                          </button>
                          
                          <button
                            onClick={() => console.log('Preview:', document)}
                            className="text-gray-600 hover:text-gray-700"
                            title="Preview"
                          >
                            <EyeIcon className="h-4 w-4" />
                          </button>
                          
                          <button
                            onClick={() => console.log('Edit:', document)}
                            className="text-gray-600 hover:text-gray-700"
                            title="Edit"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          
                          <button
                            onClick={() => handleDelete(document)}
                            className="text-red-600 hover:text-red-700"
                            title="Delete"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Tags */}
                    {document.tags && document.tags.length > 0 && (
                      <div className="mt-2 flex items-center space-x-1">
                        <TagIcon className="h-3 w-3 text-gray-400" />
                        <div className="flex flex-wrap gap-1">
                          {document.tags.map((tag, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Showing {((pagination.current - 1) * pagination.limit) + 1} to{' '}
                    {Math.min(pagination.current * pagination.limit, pagination.total)} of{' '}
                    {pagination.total} documents
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setPagination(prev => ({ ...prev, current: prev.current - 1 }))}
                      disabled={pagination.current === 1}
                      className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setPagination(prev => ({ ...prev, current: prev.current + 1 }))}
                      disabled={pagination.current === pagination.pages}
                      className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default DocumentManager;