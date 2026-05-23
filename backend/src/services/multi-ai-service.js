const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Multi-Provider AI Service for Professional Package
 * Supports OpenAI, Anthropic, and Ollama with intelligent routing and fallbacks
 */

class MultiAIService {
  constructor() {
    this.providers = {
      openai: {
        name: 'OpenAI',
        apiKey: process.env.OPENAI_API_KEY,
        baseURL: 'https://api.openai.com/v1',
        model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
        costPerToken: 0.00003, // Approximate cost per token
        maxTokens: 4096,
        enabled: !!process.env.OPENAI_API_KEY
      },
      anthropic: {
        name: 'Anthropic',
        apiKey: process.env.ANTHROPIC_API_KEY,
        baseURL: 'https://api.anthropic.com/v1',
        model: process.env.ANTHROPIC_MODEL || 'claude-3-opus-20240229',
        costPerToken: 0.000015,
        maxTokens: 4096,
        enabled: !!process.env.ANTHROPIC_API_KEY
      },
      ollama: {
        name: 'Ollama',
        baseURL: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
        generalModel: process.env.OLLAMA_MODEL_GENERAL || 'mistral:7b-instruct',
        complexModel: process.env.OLLAMA_MODEL_COMPLEX || 'llama3:8b',
        reasoningModel: process.env.OLLAMA_MODEL_REASONING || 'llama3:8b',
        costPerToken: 0, // Local model - no cost
        maxTokens: 2048,
        enabled: true // Always enabled for Professional package
      }
    };

    this.priority = (process.env.AI_PROVIDER_PRIORITY || 'openai,anthropic,ollama').split(',');
    this.costTracking = process.env.AI_COST_TRACKING === 'true';
  }

  /**
   * Route request to appropriate AI provider
   */
  async processRequest(request) {
    const {
      prompt,
      context = '',
      requestType = 'general', // general, legal_analysis, document_generation, case_summary
      provider = null, // Force specific provider
      maxTokens = null,
      temperature = 0.7
    } = request;

    try {
      const selectedProvider = provider || this.selectProvider(requestType);
      const startTime = Date.now();

      let response;
      let tokensUsed = 0;
      let cost = 0;

      switch (selectedProvider) {
        case 'openai':
          response = await this.callOpenAI(prompt, context, requestType, maxTokens, temperature);
          tokensUsed = response.usage?.total_tokens || 0;
          cost = tokensUsed * this.providers.openai.costPerToken;
          break;

        case 'anthropic':
          response = await this.callAnthropic(prompt, context, requestType, maxTokens, temperature);
          tokensUsed = response.usage?.total_tokens || 0;
          cost = tokensUsed * this.providers.anthropic.costPerToken;
          break;

        case 'ollama':
          response = await this.callOllama(prompt, context, requestType, maxTokens, temperature);
          tokensUsed = response.eval_count || 0;
          cost = 0; // Local model
          break;

        default:
          throw new Error(`Unsupported provider: ${selectedProvider}`);
      }

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      // Track usage if enabled
      if (this.costTracking) {
        await this.trackUsage({
          provider: selectedProvider,
          requestType,
          tokensUsed,
          cost,
          processingTime,
          success: true
        });
      }

      return {
        success: true,
        provider: selectedProvider,
        response: response.content || response.message || response.response,
        metadata: {
          tokensUsed,
          cost,
          processingTime,
          model: this.getModelForProvider(selectedProvider, requestType)
        }
      };
    } catch (error) {
      console.error(`AI request failed with ${selectedProvider}:`, error);

      // Try fallback providers
      if (!provider) { // Only fallback if provider wasn't specifically requested
        const fallbackProvider = this.getNextProvider(selectedProvider);
        if (fallbackProvider) {
          console.log(`Falling back to ${fallbackProvider}`);
          return this.processRequest({ ...request, provider: fallbackProvider });
        }
      }

      // Track failed usage
      if (this.costTracking) {
        await this.trackUsage({
          provider: selectedProvider || 'unknown',
          requestType,
          tokensUsed: 0,
          cost: 0,
          processingTime: 0,
          success: false,
          error: error.message
        });
      }

      throw error;
    }
  }

  /**
   * Select best provider for request type
   */
  selectProvider(requestType) {
    // Logic for selecting provider based on request type and availability
    switch (requestType) {
      case 'legal_analysis':
        // Prefer Anthropic for legal analysis
        if (this.providers.anthropic.enabled) return 'anthropic';
        if (this.providers.openai.enabled) return 'openai';
        return 'ollama';

      case 'document_generation':
        // Prefer OpenAI for document generation
        if (this.providers.openai.enabled) return 'openai';
        if (this.providers.anthropic.enabled) return 'anthropic';
        return 'ollama';

      case 'case_summary':
        // Use Ollama for quick summaries to save costs
        return 'ollama';

      case 'complex_reasoning':
        // Prefer premium models for complex reasoning
        if (this.providers.anthropic.enabled) return 'anthropic';
        if (this.providers.openai.enabled) return 'openai';
        return 'ollama';

      default:
        // Follow priority order for general requests
        for (const provider of this.priority) {
          if (this.providers[provider]?.enabled) {
            return provider;
          }
        }
        return 'ollama'; // Fallback to local
    }
  }

  /**
   * Get next available provider for fallback
   */
  getNextProvider(currentProvider) {
    const currentIndex = this.priority.indexOf(currentProvider);
    for (let i = currentIndex + 1; i < this.priority.length; i++) {
      const provider = this.priority[i];
      if (this.providers[provider]?.enabled) {
        return provider;
      }
    }
    return null;
  }

  /**
   * Get model name for provider and request type
   */
  getModelForProvider(provider, requestType) {
    switch (provider) {
      case 'openai':
        return this.providers.openai.model;
      case 'anthropic':
        return this.providers.anthropic.model;
      case 'ollama':
        switch (requestType) {
          case 'complex_reasoning':
          case 'legal_analysis':
            return this.providers.ollama.complexModel;
          case 'document_generation':
            return this.providers.ollama.reasoningModel;
          default:
            return this.providers.ollama.generalModel;
        }
      default:
        return 'unknown';
    }
  }

  /**
   * Call OpenAI API
   */
  async callOpenAI(prompt, context, requestType, maxTokens, temperature) {
    if (!this.providers.openai.enabled) {
      throw new Error('OpenAI provider not configured');
    }

    const messages = [
      {
        role: 'system',
        content: this.getSystemPrompt(requestType, 'openai') + (context ? `\n\nContext: ${context}` : '')
      },
      {
        role: 'user',
        content: prompt
      }
    ];

    const response = await axios.post(
      `${this.providers.openai.baseURL}/chat/completions`,
      {
        model: this.providers.openai.model,
        messages,
        max_tokens: maxTokens || this.providers.openai.maxTokens,
        temperature,
        stream: false
      },
      {
        headers: {
          'Authorization': `Bearer ${this.providers.openai.apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return {
      content: response.data.choices[0].message.content,
      usage: response.data.usage
    };
  }

  /**
   * Call Anthropic API
   */
  async callAnthropic(prompt, context, requestType, maxTokens, temperature) {
    if (!this.providers.anthropic.enabled) {
      throw new Error('Anthropic provider not configured');
    }

    const systemPrompt = this.getSystemPrompt(requestType, 'anthropic') + (context ? `\n\nContext: ${context}` : '');

    const response = await axios.post(
      `${this.providers.anthropic.baseURL}/messages`,
      {
        model: this.providers.anthropic.model,
        max_tokens: maxTokens || this.providers.anthropic.maxTokens,
        temperature,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      },
      {
        headers: {
          'Authorization': `Bearer ${this.providers.anthropic.apiKey}`,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01'
        }
      }
    );

    return {
      content: response.data.content[0].text,
      usage: response.data.usage
    };
  }

  /**
   * Call Ollama API
   */
  async callOllama(prompt, context, requestType, maxTokens, temperature) {
    const model = this.getModelForProvider('ollama', requestType);
    const systemPrompt = this.getSystemPrompt(requestType, 'ollama') + (context ? `\n\nContext: ${context}` : '');

    const response = await axios.post(
      `${this.providers.ollama.baseURL}/api/generate`,
      {
        model,
        prompt: `${systemPrompt}\n\nUser: ${prompt}\n\nAssistant:`,
        stream: false,
        options: {
          temperature,
          num_predict: maxTokens || this.providers.ollama.maxTokens
        }
      },
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 120000 // 2 minutes timeout for local models
      }
    );

    return {
      response: response.data.response,
      eval_count: response.data.eval_count
    };
  }

  /**
   * Get system prompt for different request types and providers
   */
  getSystemPrompt(requestType, provider) {
    const basePrompts = {
      general: 'You are a helpful legal assistant for a law firm. Provide accurate, professional, and legally sound responses.',

      legal_analysis: 'You are an expert legal analyst. Analyze the provided legal information thoroughly, considering relevant laws, precedents, and potential risks. Provide detailed, well-reasoned analysis that a legal professional would find valuable.',

      document_generation: 'You are a legal document specialist. Generate professional, legally appropriate documents based on the requirements. Ensure proper legal language, formatting, and include necessary clauses and disclaimers.',

      case_summary: 'You are a case management assistant. Create concise, comprehensive summaries that highlight key facts, legal issues, important dates, and next steps. Focus on actionable information.',

      complex_reasoning: 'You are a senior legal strategist. Apply complex legal reasoning to analyze the situation, consider multiple perspectives, evaluate risks and opportunities, and provide strategic recommendations.'
    };

    let prompt = basePrompts[requestType] || basePrompts.general;

    // Add provider-specific instructions
    if (provider === 'anthropic') {
      prompt += ' Focus on providing thorough, analytical responses with clear reasoning.';
    } else if (provider === 'openai') {
      prompt += ' Provide well-structured, professional responses with practical applications.';
    } else if (provider === 'ollama') {
      prompt += ' Be concise but comprehensive in your response.';
    }

    return prompt;
  }

  /**
   * Track AI usage for cost monitoring
   */
  async trackUsage(usage) {
    try {
      // For now, log to console. In production, this would be stored in database
      console.log('AI Usage:', {
        timestamp: new Date().toISOString(),
        ...usage
      });

      // TODO: Store in database table for usage analytics
      // await prisma.aiUsage.create({ data: usage });
    } catch (error) {
      console.error('Error tracking AI usage:', error);
    }
  }

  /**
   * Get usage statistics
   */
  async getUsageStats(timeframe = '24h') {
    try {
      // TODO: Implement database queries for usage statistics
      return {
        totalRequests: 0,
        totalCost: 0,
        providerBreakdown: {},
        requestTypeBreakdown: {}
      };
    } catch (error) {
      console.error('Error getting usage stats:', error);
      return null;
    }
  }

  /**
   * Health check for all providers
   */
  async healthCheck() {
    const results = {};

    for (const [providerName, config] of Object.entries(this.providers)) {
      try {
        switch (providerName) {
          case 'openai':
            if (config.enabled) {
              await axios.get(`${config.baseURL}/models`, {
                headers: { 'Authorization': `Bearer ${config.apiKey}` },
                timeout: 5000
              });
              results[providerName] = { status: 'healthy', enabled: true };
            } else {
              results[providerName] = { status: 'disabled', enabled: false };
            }
            break;

          case 'anthropic':
            if (config.enabled) {
              // Anthropic doesn't have a simple health endpoint, so we'll just check if API key is configured
              results[providerName] = { status: 'configured', enabled: true };
            } else {
              results[providerName] = { status: 'disabled', enabled: false };
            }
            break;

          case 'ollama':
            try {
              await axios.get(`${config.baseURL}/api/tags`, { timeout: 5000 });
              results[providerName] = { status: 'healthy', enabled: true };
            } catch (error) {
              results[providerName] = { status: 'unreachable', enabled: false, error: error.message };
            }
            break;
        }
      } catch (error) {
        results[providerName] = { status: 'error', enabled: false, error: error.message };
      }
    }

    return results;
  }

  /**
   * Legal document analysis
   */
  async analyzeDocument(documentContent, analysisType = 'general') {
    const request = {
      prompt: `Please analyze this legal document and provide insights on:\n\n${documentContent}`,
      requestType: 'legal_analysis',
      context: `Analysis type: ${analysisType}`
    };

    return this.processRequest(request);
  }

  /**
   * Generate case summary
   */
  async generateCaseSummary(caseData) {
    const prompt = `Create a comprehensive case summary based on the following information:\n\n${JSON.stringify(caseData, null, 2)}`;

    const request = {
      prompt,
      requestType: 'case_summary'
    };

    return this.processRequest(request);
  }

  /**
   * Generate legal document
   */
  async generateDocument(documentType, parameters) {
    const prompt = `Generate a ${documentType} with the following parameters:\n\n${JSON.stringify(parameters, null, 2)}`;

    const request = {
      prompt,
      requestType: 'document_generation',
      maxTokens: 2048
    };

    return this.processRequest(request);
  }
}

module.exports = new MultiAIService();