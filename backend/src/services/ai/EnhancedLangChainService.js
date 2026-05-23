const OllamaProvider = require('./providers/OllamaProvider');
const CostTracker = require('./utils/CostTracker');
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

// Import external providers
const { ChatOpenAI } = require('@langchain/openai');
const { ChatAnthropic } = require('@langchain/anthropic');
const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');
const { ChatCohere } = require('@langchain/cohere');
const { PromptTemplate } = require('@langchain/core/prompts');

const prisma = new PrismaClient();

class EnhancedLangChainService {
  constructor() {
    this.providers = {};
    this.costTracker = new CostTracker();
    this.providerPriority = ['ollama', 'openai', 'anthropic', 'google', 'cohere'];
    this.encryptionKey = process.env.AI_KEY_ENCRYPTION_KEY || crypto.randomBytes(32);
    
    this.initializeProviders();
    this.loadDocumentTemplates();
  }

  decrypt(encryptedText) {
    if (!encryptedText) return null;
    try {
      const textParts = encryptedText.split(':');
      const iv = Buffer.from(textParts.shift(), 'hex');
      const encryptedData = textParts.join(':');
      const decipher = crypto.createDecipher('aes-256-cbc', this.encryptionKey);
      let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      console.error('Decryption failed:', error.message);
      return null;
    }
  }

  async initializeProviders() {
    // Initialize Ollama as primary provider
    this.providers.ollama = new OllamaProvider();
    
    // Load API keys from database or environment
    const apiKeys = await this.loadApiKeys();
    
    // Initialize external providers with stored keys
    if (apiKeys.openai) {
      this.providers.openai = new ChatOpenAI({
        openAIApiKey: apiKeys.openai,
        modelName: apiKeys.openaiModel || 'gpt-4-turbo-preview',
        temperature: 0.3,
        maxTokens: 4000
      });
    }

    if (apiKeys.anthropic) {
      this.providers.anthropic = new ChatAnthropic({
        anthropicApiKey: apiKeys.anthropic,
        modelName: apiKeys.anthropicModel || 'claude-3-opus-20240229',
        temperature: 0.3,
        maxTokens: 4000
      });
    }

    if (apiKeys.google) {
      this.providers.google = new ChatGoogleGenerativeAI({
        apiKey: apiKeys.google,
        modelName: apiKeys.googleModel || 'gemini-pro',
        temperature: 0.3,
        maxOutputTokens: 4000
      });
    }

    if (apiKeys.cohere) {
      this.providers.cohere = new ChatCohere({
        apiKey: apiKeys.cohere,
        model: apiKeys.cohereModel || 'command-r-plus',
        temperature: 0.3
      });
    }

    console.log('Enhanced LangChain Service initialized with providers:', Object.keys(this.providers));
  }

  async loadApiKeys() {
    const keys = {};
    
    try {
      // Try to load from database first
      const configs = await prisma.aiProviderConfig.findMany({
        where: { enabled: true }
      });
      
      configs.forEach(config => {
        if (config.apiKey) {
          keys[config.provider] = this.decrypt(config.apiKey);
          keys[`${config.provider}Model`] = config.model;
        }
      });
      
      console.log('Loaded API keys from database for:', Object.keys(keys).filter(k => !k.endsWith('Model')));
    } catch (dbError) {
      console.log('Database not accessible, using environment variables as fallback');
      
      // Fallback to environment variables
      keys.openai = process.env.OPENAI_API_KEY;
      keys.openaiModel = process.env.OPENAI_MODEL;
      keys.anthropic = process.env.ANTHROPIC_API_KEY;
      keys.anthropicModel = process.env.ANTHROPIC_MODEL;
      keys.google = process.env.GOOGLE_API_KEY;
      keys.googleModel = process.env.GOOGLE_MODEL;
      keys.cohere = process.env.COHERE_API_KEY;
      keys.cohereModel = process.env.COHERE_MODEL;
      
      console.log('Using environment variables for providers');
    }
    
    return keys;
  }

  loadDocumentTemplates() {
    // Load existing templates (simplified version)
    this.documentTemplates = {
      demand_letter: {
        name: 'Demand Letter',
        preferredProvider: 'ollama',
        fallbackProviders: ['openai', 'anthropic'],
        promptTemplate: PromptTemplate.fromTemplate(`
You are an experienced legal document generator specializing in demand letters.

Generate a professional demand letter based on the following information:

Client Information:
- Client Name: {clientName}
- Client Address: {clientAddress}

Defendant Information:
- Defendant Name: {defendantName}
- Defendant Address: {defendantAddress}

Case Details:
- Incident Date: {incidentDate}
- Incident Description: {incidentDescription}
- Injuries/Damages: {injuries}
- Medical Treatment: {medicalTreatment}
- Medical Expenses: $\{medicalExpenses\}
- Lost Wages: $\{lostWages\}
- Other Damages: {otherDamages}

Settlement Information:
- Total Demand Amount: $\{demandAmount\}
- Response Deadline: {responseDeadline}

Attorney Information:
- Attorney Name: {attorneyName}
- Bar Number: {barNumber}
- Firm Name: {firmName}
- Firm Address: {firmAddress}
- Phone: {phone}
- Email: {email}

Generate a formal, professional demand letter that:
1. Clearly states the facts of the case
2. Establishes liability
3. Details all damages and losses
4. Makes a clear settlement demand
5. Sets a response deadline
6. Maintains professional tone throughout

Format the letter properly with date, addresses, salutation, body paragraphs, and closing.
        `)
      },
      settlement_agreement: {
        name: 'Settlement Agreement',
        preferredProvider: 'ollama',
        fallbackProviders: ['anthropic', 'openai'],
        promptTemplate: PromptTemplate.fromTemplate(`
You are an experienced legal document generator specializing in settlement agreements.

Generate a comprehensive settlement agreement based on the following information:

Parties:
- Plaintiff: {plaintiffName}
- Defendant: {defendantName}
- Case Number: {caseNumber}
- Court: {courtName}

Settlement Terms:
- Settlement Amount: $\{settlementAmount\}
- Payment Terms: {paymentTerms}
- Release Type: {releaseType}
- Confidentiality: {confidentiality}

Generate a complete settlement agreement with all necessary clauses.
        `)
      }
    };
  }

  async generateDocument(documentType, variables, options = {}) {
    const template = this.documentTemplates[documentType];
    if (!template) {
      throw new Error(`Unknown document type: ${documentType}`);
    }

    const prompt = await template.promptTemplate.format(variables);
    const startTime = Date.now();

    // Try providers in priority order
    for (const providerName of this.providerPriority) {
      const provider = this.providers[providerName];
      if (!provider) continue;

      try {
        // Special handling for Ollama
        if (providerName === 'ollama') {
          const isAvailable = await provider.isAvailable();
          if (!isAvailable) {
            console.log('Ollama not available, falling back to external providers');
            continue;
          }
          
          console.log(`Generating ${documentType} with Ollama (local)`);
          const result = await provider.generateDocument(documentType, prompt, variables);
          
          await this.costTracker.recordUsage(
            providerName,
            documentType,
            result.tokens || this.estimateTokens(prompt + result.content),
            result.responseTime || (Date.now() - startTime)
          );
          
          return {
            ...result,
            success: true,
            provider: providerName,
            documentType,
            timestamp: new Date().toISOString()
          };
        } else {
          // External provider handling
          console.log(`Generating ${documentType} with ${providerName} (external)`);
          const result = await provider.invoke(prompt);
          const endTime = Date.now();
          const responseTime = endTime - startTime;
          const tokens = this.estimateTokens(prompt + result.content);
          
          await this.costTracker.recordUsage(providerName, documentType, tokens, responseTime);
          
          return {
            content: result.content,
            provider: providerName,
            documentType,
            responseTime,
            cost: this.costTracker.calculateCost(providerName, tokens),
            tokens,
            success: true,
            timestamp: new Date().toISOString()
          };
        }
      } catch (error) {
        console.error(`Provider ${providerName} failed for ${documentType}:`, error.message);
        // Continue to next provider
      }
    }

    throw new Error(`All AI providers failed to generate ${documentType}`);
  }

  estimateTokens(text) {
    return Math.ceil(text.length / 4);
  }

  async getUsageStats(timeframe = '30d') {
    return await this.costTracker.getUsageStats(timeframe);
  }

  async exportUsageReport(format = 'json') {
    return await this.costTracker.exportUsageReport(format);
  }

  async getProviderStatus() {
    const status = {};
    
    for (const [name, provider] of Object.entries(this.providers)) {
      if (name === 'ollama') {
        status[name] = {
          available: await provider.isAvailable(),
          type: 'local',
          cost: 0,
          models: await provider.getAvailableModels()
        };
      } else {
        // Check if provider is configured via database or environment
        let configured = false;
        try {
          const config = await prisma.aiProviderConfig.findUnique({
            where: { provider: name }
          });
          configured = !!(config && config.apiKey && config.enabled);
        } catch (dbError) {
          // Fallback to environment variable check
          configured = !!(process.env[`${name.toUpperCase()}_API_KEY`]);
        }
        
        status[name] = {
          available: !!provider,
          type: 'external',
          configured,
          cost: this.costTracker.calculateCost(name, 1000) // Cost per 1000 tokens
        };
      }
    }
    
    return status;
  }
}

module.exports = EnhancedLangChainService;
