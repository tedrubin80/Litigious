const { Ollama } = require('@langchain/community/llms/ollama');

class OllamaProvider {
  constructor() {
    this.baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    // Use smaller models that fit in 2.5GB RAM
    this.models = {
      'legal-general': {
        model: process.env.OLLAMA_MODEL_GENERAL || 'phi3:mini',
        temperature: 0.3,
        maxTokens: 2000
      },
      'legal-complex': {
        model: process.env.OLLAMA_MODEL_COMPLEX || 'llama3.2:3b',
        temperature: 0.2,
        maxTokens: 3000
      },
      'legal-reasoning': {
        model: process.env.OLLAMA_MODEL_REASONING || 'phi3:mini',
        temperature: 0.1,
        maxTokens: 2500
      }
    };
    
    this.initializeModels();
  }

  initializeModels() {
    this.instances = {};
    
    for (const [key, config] of Object.entries(this.models)) {
      this.instances[key] = new Ollama({
        baseUrl: this.baseUrl,
        model: config.model,
        temperature: config.temperature,
        numCtx: config.maxTokens
      });
    }
  }

  async isAvailable() {
    try {
      const http = require('http');
      
      return new Promise((resolve) => {
        const req = http.request({
          hostname: '127.0.0.1',  // Force IPv4
          port: 11434,
          path: '/api/tags',
          method: 'GET'
        }, (res) => {
          resolve(res.statusCode === 200);
        });
        
        req.on('error', () => {
          resolve(false);
        });
        
        req.setTimeout(5000, () => {
          req.destroy();
          resolve(false);
        });
        
        req.end();
      });
    } catch (error) {
      console.error('Ollama availability check failed:', error.message);
      return false;
    }
  }

  async generateDocument(documentType, prompt, variables = {}) {
    const modelKey = this.getModelForDocumentType(documentType);
    const model = this.instances[modelKey];
    
    if (!model) {
      throw new Error(`Model not available for document type: ${documentType}`);
    }

    try {
      const startTime = Date.now();
      const result = await model.invoke(prompt);
      const endTime = Date.now();
      
      return {
        content: result,
        provider: 'ollama',
        model: this.models[modelKey].model,
        responseTime: endTime - startTime,
        cost: 0, // Local generation is free
        tokens: this.estimateTokens(prompt + result)
      };
    } catch (error) {
      console.error(`Ollama generation failed for ${documentType}:`, error.message);
      throw error;
    }
  }

  getModelForDocumentType(docType) {
    const mapping = {
      'demand_letter': 'legal-general',
      'settlement_agreement': 'legal-complex',
      'discovery': 'legal-reasoning',
      'legal_brief': 'legal-reasoning',
      'contract': 'legal-complex',
      'motion': 'legal-reasoning',
      'pleading': 'legal-complex'
    };
    
    return mapping[docType] || 'legal-general';
  }

  estimateTokens(text) {
    // Rough estimate: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }

  async getAvailableModels() {
    try {
      const http = require('http');
      
      return new Promise((resolve) => {
        const req = http.request({
          hostname: '127.0.0.1',  // Force IPv4
          port: 11434,
          path: '/api/tags',
          method: 'GET'
        }, (res) => {
          let data = '';
          res.on('data', (chunk) => data += chunk);
          res.on('end', () => {
            try {
              const parsed = JSON.parse(data);
              resolve(parsed.models || []);
            } catch (e) {
              resolve([]);
            }
          });
        });
        
        req.on('error', () => resolve([]));
        req.setTimeout(5000, () => {
          req.destroy();
          resolve([]);
        });
        
        req.end();
      });
    } catch (error) {
      console.error('Failed to get available models:', error.message);
      return [];
    }
  }

  async getModelInfo(modelName) {
    try {
      const response = await fetch(`${this.baseUrl}/api/show`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: modelName })
      });
      return await response.json();
    } catch (error) {
      console.error(`Failed to get info for model ${modelName}:`, error.message);
      return null;
    }
  }
}

module.exports = OllamaProvider;
