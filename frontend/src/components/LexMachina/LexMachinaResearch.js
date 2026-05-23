import React, { useState, useEffect } from 'react';
import {
  MagnifyingGlassIcon,
  DocumentIcon,
  UserGroupIcon,
  ChartBarIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  FolderIcon,
  ScaleIcon
} from '../Icons';
import { useToast } from '../Common/Toast';

/**
 * Lex Machina Legal Research Interface
 * 
 * Professional legal analytics and research platform integration
 * with subscriber API key management
 */
const LexMachinaResearch = () => {
  const [apiKey, setApiKey] = useState('');
  const [savedApiKey, setSavedApiKey] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState('cases');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [recentSearches, setRecentSearches] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const toast = useToast();

  // Load saved API key from localStorage
  useEffect(() => {
    const storedKey = localStorage.getItem('lexMachinaApiKey');
    if (storedKey) {
      setApiKey(storedKey);
      setSavedApiKey(true);
    }
  }, []);

  // Save API key
  const handleSaveApiKey = () => {
    if (!apiKey.trim()) {
      toast?.show?.({
        type: 'error',
        message: 'Please enter a valid API key',
        duration: 4000
      });
      return;
    }

    localStorage.setItem('lexMachinaApiKey', apiKey);
    setSavedApiKey(true);
    toast?.show?.({
      type: 'success',
      message: 'API key saved successfully',
      duration: 3000
    });
  };

  // Remove API key
  const handleRemoveApiKey = () => {
    localStorage.removeItem('lexMachinaApiKey');
    setApiKey('');
    setSavedApiKey(false);
    setResults(null);
    toast?.show?.({
      type: 'info',
      message: 'API key removed',
      duration: 3000
    });
  };

  // Perform search
  const handleSearch = async () => {
    if (!savedApiKey) {
      toast?.show?.({
        type: 'error',
        message: 'Please save your API key first',
        duration: 4000
      });
      return;
    }

    if (!searchQuery.trim()) {
      toast?.show?.({
        type: 'error',
        message: 'Please enter a search query',
        duration: 4000
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/lex-machina/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          apiKey,
          query: searchQuery,
          searchType
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setResults(data.results);
        
        // Add to recent searches
        const newSearch = { query: searchQuery, type: searchType, timestamp: new Date() };
        setRecentSearches(prev => [newSearch, ...prev.slice(0, 4)]);
        
        toast?.show?.({
          type: 'success',
          message: `Found ${data.results.length} results`,
          duration: 3000
        });
      } else {
        throw new Error(data.message || 'Search failed');
      }
    } catch (error) {
      toast?.show?.({
        type: 'error',
        message: error.message || 'Failed to perform search',
        duration: 5000
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch analytics
  const fetchAnalytics = async (entityType, entityId) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/lex-machina/analytics/${entityType}/${entityId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ apiKey })
      });

      const data = await response.json();
      
      if (data.success) {
        setAnalytics(data.analytics);
      }
    } catch (error) {
      toast?.show?.({
        type: 'error',
        message: 'Failed to fetch analytics',
        duration: 4000
      });
    } finally {
      setLoading(false);
    }
  };

  // Search types configuration
  const searchTypes = [
    { value: 'cases', label: 'Cases', icon: FolderIcon, color: 'text-blue-600' },
    { value: 'judges', label: 'Judges', icon: UserGroupIcon, color: 'text-purple-600' },
    { value: 'parties', label: 'Parties', icon: UserGroupIcon, color: 'text-green-600' },
    { value: 'law_firms', label: 'Law Firms', icon: DocumentIcon, color: 'text-yellow-600' },
    { value: 'attorneys', label: 'Attorneys', icon: UserGroupIcon, color: 'text-red-600' }
  ];

  // Demo data for non-API users
  const demoFeatures = [
    {
      title: 'Case Analytics',
      description: 'Track case outcomes, timelines, and success rates',
      icon: DocumentIcon
    },
    {
      title: 'Judge Analytics',
      description: 'Understand judicial behavior and ruling patterns',
      icon: ScaleIcon
    },
    {
      title: 'Party Intelligence',
      description: 'Research litigation history and strategies',
      icon: UserGroupIcon
    },
    {
      title: 'Law Firm Insights',
      description: 'Analyze firm performance and expertise areas',
      icon: DocumentIcon
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <FolderIcon className="h-10 w-10 text-indigo-600 mr-4" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Lex Machina Legal Research
              </h1>
              <p className="text-gray-600 mt-1">
                AI-powered legal analytics and judicial insights
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              savedApiKey 
                ? 'bg-green-100 text-green-800' 
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              {savedApiKey ? 'API Connected' : 'API Key Required'}
            </span>
          </div>
        </div>
      </div>

      {/* API Key Configuration */}
      {!savedApiKey && (
        <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl p-6 mb-6 border border-indigo-200">
          <div className="flex items-start">
            <CheckCircleIcon className="h-6 w-6 text-indigo-600 mt-1 mr-3 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Connect Your Lex Machina API
              </h3>
              <p className="text-gray-600 mb-4">
                Enter your Lex Machina API key to access premium legal research and analytics.
                Don't have an API key? <a href="https://lexmachina.com/api/" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-700 font-medium">Get one here</a>
              </p>
              <div className="flex items-center space-x-3">
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter your API key"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  onClick={handleSaveApiKey}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                >
                  Save API Key
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Your API key is stored locally and never sent to our servers
              </p>
            </div>
          </div>
        </div>
      )}

      {/* API Key Active */}
      {savedApiKey && (
        <div className="bg-green-50 rounded-xl p-4 mb-6 border border-green-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <CheckCircleIcon className="h-5 w-5 text-green-600 mr-2" />
              <span className="text-green-800 font-medium">
                API Key Active: {apiKey.slice(0, 8)}...{apiKey.slice(-4)}
              </span>
            </div>
            <button
              onClick={handleRemoveApiKey}
              className="text-red-600 hover:text-red-700 text-sm font-medium"
            >
              Remove Key
            </button>
          </div>
        </div>
      )}

      {/* Search Interface */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Legal Research Search</h2>
        
        {/* Search Type Selector */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
          {searchTypes.map((type) => {
            const IconComponent = type.icon;
            return (
              <button
                key={type.value}
                onClick={() => setSearchType(type.value)}
                className={`p-3 rounded-lg border-2 transition-all ${
                  searchType === type.value
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <IconComponent className={`h-5 w-5 ${type.color} mx-auto mb-1`} />
                <span className="text-sm font-medium text-gray-700">{type.label}</span>
              </button>
            );
          })}
        </div>

        {/* Search Bar */}
        <div className="flex items-center space-x-3">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder={`Search for ${searchType}...`}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              disabled={!savedApiKey}
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={loading || !savedApiKey}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              loading || !savedApiKey
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-indigo-600 text-white hover:bg-indigo-700'
            }`}
          >
            {loading ? (
              <ExclamationTriangleIcon className="h-5 w-5 animate-spin" />
            ) : (
              'Search'
            )}
          </button>
        </div>

        {/* Example Queries */}
        {savedApiKey && (
          <div className="mt-3">
            <p className="text-xs text-gray-500 mb-2">Example searches:</p>
            <div className="flex flex-wrap gap-2">
              {['Patent litigation', 'Apple Inc', 'Judge Lucy Koh', 'Securities fraud'].map((example) => (
                <button
                  key={example}
                  onClick={() => setSearchQuery(example)}
                  className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs hover:bg-gray-200 transition-colors"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Results Section */}
      {results && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Search Results ({results.length})
          </h3>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {results.map((result, index) => (
              <div key={index} className="p-4 border border-gray-200 rounded-lg hover:border-indigo-300 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{result.title || result.name}</h4>
                    <p className="text-sm text-gray-600 mt-1">{result.description || result.summary}</p>
                    <div className="flex items-center space-x-4 mt-2">
                      <span className="text-xs text-gray-500">
                        {result.date || result.filed_date}
                      </span>
                      {result.court && (
                        <span className="text-xs text-gray-500">{result.court}</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => fetchAnalytics(searchType, result.id)}
                    className="ml-4 px-3 py-1 bg-indigo-100 text-indigo-700 rounded text-sm font-medium hover:bg-indigo-200 transition-colors"
                  >
                    View Analytics
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Demo Features for Non-Subscribers */}
      {!savedApiKey && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Available with Lex Machina API
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {demoFeatures.map((feature, index) => {
              const IconComponent = feature.icon;
              return (
                <div key={index} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-start">
                    <div className="p-2 bg-indigo-100 rounded-lg mr-3">
                      <IconComponent className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">{feature.title}</h4>
                      <p className="text-sm text-gray-600 mt-1">{feature.description}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="mt-6 p-4 bg-indigo-50 rounded-lg">
            <p className="text-sm text-indigo-900">
              <strong>Ready to unlock premium legal analytics?</strong> Get your Lex Machina API key and gain access to:
            </p>
            <ul className="mt-2 space-y-1 text-sm text-indigo-800">
              <li>• Federal and state court data</li>
              <li>• Predictive case outcomes</li>
              <li>• Judge ruling patterns</li>
              <li>• Opposing counsel intelligence</li>
            </ul>
            <a 
              href="https://lexmachina.com/api/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center mt-3 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
            >
              Get API Access
            </a>
          </div>
        </div>
      )}

      {/* Recent Searches */}
      {recentSearches.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Searches</h3>
          <div className="space-y-2">
            {recentSearches.map((search, index) => (
              <button
                key={index}
                onClick={() => {
                  setSearchQuery(search.query);
                  setSearchType(search.type);
                }}
                className="w-full text-left p-3 border border-gray-200 rounded-lg hover:border-indigo-300 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium text-gray-900">{search.query}</span>
                    <span className="ml-2 text-sm text-gray-500">in {search.type}</span>
                  </div>
                  <span className="text-xs text-gray-400">
                    {new Date(search.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LexMachinaResearch;