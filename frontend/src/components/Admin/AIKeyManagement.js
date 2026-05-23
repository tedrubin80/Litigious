import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  CogIcon,
  KeyIcon,
  EyeIcon,
  EyeSlashIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  BoltIcon
} from '../Icons';
import { useToast } from '../Common/Toast';

const AIKeyManagement = () => {
  const [providers, setProviders] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingProvider, setTestingProvider] = useState(null);
  const [showKeys, setShowKeys] = useState({});
  const [usage, setUsage] = useState(null);
  const toast = useToast();

  const providerConfig = {
    openai: {
      name: 'OpenAI',
      description: 'GPT-4, GPT-3.5 models for document generation',
      keyPlaceholder: 'sk-...',
      website: 'https://platform.openai.com/api-keys',
      models: ['gpt-4-turbo-preview', 'gpt-3.5-turbo'],
      costEstimate: '$0.03/1K tokens'
    },
    anthropic: {
      name: 'Anthropic (Claude)',
      description: 'Claude 3 models for legal document analysis',
      keyPlaceholder: 'sk-ant-...',
      website: 'https://console.anthropic.com/',
      models: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'],
      costEstimate: '$0.015/1K tokens'
    },
    google: {
      name: 'Google Gemini',
      description: 'Gemini Pro for document reasoning',
      keyPlaceholder: 'AI...',
      website: 'https://aistudio.google.com/app/apikey',
      models: ['gemini-pro', 'gemini-pro-vision'],
      costEstimate: '$0.0025/1K tokens'
    },
    cohere: {
      name: 'Cohere',
      description: 'Command R+ for legal text generation',
      keyPlaceholder: '...',
      website: 'https://dashboard.cohere.ai/',
      models: ['command-r-plus', 'command-r'],
      costEstimate: '$0.02/1K tokens'
    },
    ollama: {
      name: 'Ollama (Local)',
      description: 'Self-hosted local AI models - no API costs',
      keyPlaceholder: 'Not required - local installation',
      website: 'http://localhost:11434',
      models: ['mistral:7b-instruct', 'llama3:8b', 'codellama:13b'],
      costEstimate: 'Free (local compute)',
      isLocal: true
    }
  };

  useEffect(() => {
    fetchProviders();
    fetchUsage();
  }, []);

  const fetchProviders = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/admin/ai-providers');
      setProviders(response.data.providers || {});
    } catch (error) {
      console.error('Error fetching providers:', error);
      toast.error('Failed to load AI provider settings');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsage = async () => {
    try {
      const response = await axios.get('/api/admin/ai-usage-stats');
      setUsage(response.data.stats);
    } catch (error) {
      console.error('Error fetching usage stats:', error);
    }
  };

  const handleSaveProvider = async (providerName, apiKey, model) => {
    try {
      setSaving(true);
      await axios.post('/api/admin/ai-providers', {
        provider: providerName,
        apiKey,
        model,
        enabled: !!apiKey
      });
      
      setProviders(prev => ({
        ...prev,
        [providerName]: {
          ...prev[providerName],
          apiKey,
          model,
          enabled: !!apiKey,
          status: 'saved'
        }
      }));
      
      toast.success(`${providerConfig[providerName].name} settings saved`);
    } catch (error) {
      console.error('Error saving provider:', error);
      toast.error('Failed to save provider settings');
    } finally {
      setSaving(false);
    }
  };

  const testProvider = async (providerName) => {
    try {
      setTestingProvider(providerName);
      
      // Get the current API key from the form (not database)
      const currentProvider = providers[providerName] || {};
      const apiKey = currentProvider.apiKey;
      const model = currentProvider.model || providerConfig[providerName].models[0];
      
      // For non-local providers, require API key for testing
      if (!providerConfig[providerName].isLocal && !apiKey) {
        toast.error(`Please enter an API key for ${providerConfig[providerName].name} before testing`);
        return;
      }
      
      const response = await axios.post('/api/admin/test-ai-provider', {
        provider: providerName,
        apiKey: apiKey,
        model: model,
        testMode: true // Flag to test provided credentials instead of saved ones
      });
      
      if (response.data.success) {
        toast.success(`${providerConfig[providerName].name} connection successful`);
        setProviders(prev => ({
          ...prev,
          [providerName]: {
            ...prev[providerName],
            status: 'connected',
            lastTested: new Date().toISOString()
          }
        }));
      } else {
        toast.error(`${providerConfig[providerName].name} connection failed: ${response.data.error}`);
        setProviders(prev => ({
          ...prev,
          [providerName]: {
            ...prev[providerName],
            status: 'error'
          }
        }));
      }
    } catch (error) {
      console.error('Error testing provider:', error);
      toast.error(`Failed to test ${providerConfig[providerName].name} connection`);
      setProviders(prev => ({
        ...prev,
        [providerName]: {
          ...prev[providerName],
          status: 'error'
        }
      }));
    } finally {
      setTestingProvider(null);
    }
  };

  const toggleOllama = async (enable) => {
    try {
      setSaving(true);
      const response = await axios.post('/api/admin/ai-providers', {
        provider: 'ollama',
        enabled: enable,
        model: 'mistral:7b-instruct'
      });

      if (response.data.success) {
        toast.success(`Ollama ${enable ? 'enabled' : 'disabled'} successfully`);
        await fetchProviders();
      } else {
        toast.error(response.data.error || 'Failed to update Ollama settings');
      }
    } catch (error) {
      console.error('Error toggling Ollama:', error);
      toast.error('Failed to update Ollama settings');
    } finally {
      setSaving(false);
    }
  };

  const toggleKeyVisibility = (provider) => {
    setShowKeys(prev => ({
      ...prev,
      [provider]: !prev[provider]
    }));
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'connected':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      default:
        return <InformationCircleIcon className="h-5 w-5 text-gray-400" />;
    }
  };

  const maskApiKey = (key) => {
    if (!key) return '';
    if (key.length <= 8) return '•••••••';
    return key.substring(0, 4) + '•'.repeat(key.length - 8) + key.substring(key.length - 4);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Provider Management</h1>
          <p className="mt-2 text-sm text-gray-700">
            Configure API keys for external AI providers. Local Ollama models are prioritized when available.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-2">
          <button
            onClick={fetchUsage}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <BoltIcon className="-ml-1 mr-2 h-4 w-4" />
            Refresh Stats
          </button>
        </div>
      </div>

      {/* Local Ollama Status */}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <InformationCircleIcon className="h-5 w-5 text-blue-400" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">Local Ollama Models</h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>Ollama is installed with 3 local models but requires more RAM to run (8GB recommended).</p>
              <p className="mt-1">External providers below will be used until local models are available.</p>
              <p className="mt-1">
                <strong>Cost savings when local:</strong> Up to 90% reduction in AI generation costs.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Usage Stats */}
      {usage && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <BoltIcon className="h-6 w-6 text-blue-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Documents</dt>
                    <dd className="text-lg font-medium text-gray-900">{usage.totalDocuments}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="h-6 w-6 rounded-full bg-green-100 flex items-center justify-center">
                    <div className="h-2 w-2 rounded-full bg-green-500"></div>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Local Usage</dt>
                    <dd className="text-lg font-medium text-gray-900">{usage.ollamaUsage}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="h-6 w-6 rounded-full bg-red-100 flex items-center justify-center">
                    <div className="h-2 w-2 rounded-full bg-red-500"></div>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">External Usage</dt>
                    <dd className="text-lg font-medium text-gray-900">{usage.externalUsage}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="h-6 w-6 rounded-full bg-yellow-100 flex items-center justify-center">
                    <div className="h-2 w-2 rounded-full bg-yellow-500"></div>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Monthly Cost</dt>
                    <dd className="text-lg font-medium text-gray-900">${usage.totalCost?.toFixed(2) || '0.00'}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Provider Configuration Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Object.entries(providerConfig).map(([providerKey, config]) => {
          const provider = providers[providerKey] || {};
          return (
            <div key={providerKey} className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <CogIcon className="h-6 w-6 text-gray-400" />
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">{config.name}</h3>
                      <p className="text-sm text-gray-500">{config.description}</p>
                    </div>
                  </div>
                  {getStatusIcon(provider.status)}
                </div>
              </div>

              <div className="px-6 py-4 space-y-4">
                {/* Special handling for Ollama (local) */}
                {config.isLocal ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Local AI Status
                    </label>
                    <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex items-center space-x-3">
                        <BoltIcon className="h-5 w-5 text-green-600" />
                        <div>
                          <p className="text-sm font-medium text-green-900">
                            {provider.enabled ? 'Ollama Enabled' : 'Ollama Disabled'}
                          </p>
                          <p className="text-xs text-green-700">
                            No API costs - runs on local hardware
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => toggleOllama(!provider.enabled)}
                        disabled={saving}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${
                          provider.enabled ? 'bg-green-600' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            provider.enabled ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      Requires Ollama to be installed and running on{' '}
                      <a 
                        href={config.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-500"
                      >
                        {config.website}
                      </a>
                    </p>
                  </div>
                ) : (
                  // Regular API Key Input for external providers
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      API Key
                    </label>
                    <div className="relative">
                      <input
                        type={showKeys[providerKey] ? "text" : "password"}
                        placeholder={config.keyPlaceholder}
                        value={provider.apiKey || ''}
                        onChange={(e) => {
                          const newValue = e.target.value;
                          setProviders(prev => ({
                            ...prev,
                            [providerKey]: {
                              ...prev[providerKey],
                              apiKey: newValue,
                              status: 'unsaved'
                            }
                          }));
                        }}
                        className="block w-full pr-10 border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => toggleKeyVisibility(providerKey)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      >
                        {showKeys[providerKey] ? (
                          <EyeSlashIcon className="h-4 w-4 text-gray-400" />
                        ) : (
                          <EyeIcon className="h-4 w-4 text-gray-400" />
                        )}
                      </button>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      Get your API key from{' '}
                      <a 
                        href={config.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-500"
                      >
                        {config.website}
                      </a>
                    </p>
                  </div>
                )}

                {/* Model Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Preferred Model
                  </label>
                  <select
                    value={provider.model || config.models[0]}
                    onChange={(e) => {
                      const newModel = e.target.value;
                      setProviders(prev => ({
                        ...prev,
                        [providerKey]: {
                          ...prev[providerKey],
                          model: newModel,
                          status: 'unsaved'
                        }
                      }));
                    }}
                    className="block w-full border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    {config.models.map(model => (
                      <option key={model} value={model}>{model}</option>
                    ))}
                  </select>
                </div>

                {/* Cost Estimate */}
                <div className="bg-gray-50 rounded-md p-3">
                  <div className="flex items-center justify-between text-xs text-gray-600">
                    <span>Estimated cost:</span>
                    <span className="font-medium">{config.costEstimate}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                {config.isLocal ? (
                  // Ollama only needs test connection button
                  <div className="flex space-x-3">
                    <button
                      onClick={() => testProvider(providerKey)}
                      disabled={!provider.enabled || testingProvider === providerKey}
                      className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                      {testingProvider === providerKey ? 'Testing...' : 'Test Connection'}
                    </button>
                  </div>
                ) : (
                  // External providers need save and test buttons
                  <div className="flex space-x-3">
                    <button
                      onClick={() => handleSaveProvider(
                        providerKey, 
                        provider.apiKey, 
                        provider.model || config.models[0]
                      )}
                      disabled={saving || !provider.apiKey}
                      className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={() => testProvider(providerKey)}
                      disabled={!provider.apiKey || testingProvider === providerKey}
                      className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                      {testingProvider === providerKey ? 'Testing...' : 'Test'}
                    </button>
                  </div>
                )}

                {/* Status Message */}
                {provider.status === 'unsaved' && (
                  <p className="text-xs text-yellow-600">Unsaved changes</p>
                )}
                {provider.lastTested && provider.status === 'connected' && (
                  <p className="text-xs text-green-600">
                    Last tested: {new Date(provider.lastTested).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Warning about costs */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">Cost Management</h3>
            <div className="mt-2 text-sm text-yellow-700">
              <p>External AI providers charge per token usage. Monitor your usage regularly.</p>
              <p className="mt-1">Consider upgrading server RAM to use free local Ollama models.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIKeyManagement;