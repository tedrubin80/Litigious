const fs = require('fs-extra');
const path = require('path');

class CostTracker {
  constructor() {
    this.logFile = path.join(__dirname, '../../../logs/ai-usage.json');
    this.usage = [];
    this.loadUsageHistory();
  }

  async loadUsageHistory() {
    try {
      if (await fs.pathExists(this.logFile)) {
        const data = await fs.readJson(this.logFile);
        this.usage = Array.isArray(data) ? data : [];
      }
    } catch (error) {
      console.error('Failed to load usage history:', error.message);
      this.usage = [];
    }
  }

  async recordUsage(provider, documentType, tokenCount, responseTime = 0) {
    const cost = this.calculateCost(provider, tokenCount);
    const externalCost = this.calculateExternalCost(documentType, tokenCount);
    
    const record = {
      id: Date.now().toString(),
      provider,
      documentType,
      tokenCount,
      cost,
      externalCost,
      savings: provider === 'ollama' ? externalCost : 0,
      responseTime,
      timestamp: new Date().toISOString(),
      date: new Date().toDateString()
    };
    
    this.usage.push(record);
    await this.saveUsageHistory();
    
    return record;
  }

  calculateCost(provider, tokenCount) {
    const costs = {
      ollama: 0,                          // Local = free
      openai: tokenCount * 0.00003,       // GPT-4 Turbo: $0.03/1K tokens
      anthropic: tokenCount * 0.000015,   // Claude 3: $0.015/1K tokens  
      google: tokenCount * 0.000025,      // Gemini Pro: $0.025/1K tokens
      cohere: tokenCount * 0.00002        // Command R+: $0.02/1K tokens
    };
    
    return costs[provider] || 0;
  }

  calculateExternalCost(documentType, tokenCount) {
    // Estimate what this would cost with preferred external provider
    const preferredProviders = {
      'demand_letter': 'openai',
      'settlement_agreement': 'anthropic',
      'discovery': 'google',
      'legal_brief': 'anthropic',
      'contract': 'openai'
    };
    
    const provider = preferredProviders[documentType] || 'openai';
    return this.calculateCost(provider, tokenCount);
  }

  async saveUsageHistory() {
    try {
      await fs.ensureDir(path.dirname(this.logFile));
      await fs.writeJson(this.logFile, this.usage, { spaces: 2 });
    } catch (error) {
      console.error('Failed to save usage history:', error.message);
    }
  }

  getUsageStats(timeframe = '30d') {
    const now = new Date();
    const cutoff = new Date();
    
    if (timeframe === '30d') {
      cutoff.setDate(now.getDate() - 30);
    } else if (timeframe === '7d') {
      cutoff.setDate(now.getDate() - 7);
    } else if (timeframe === '1d') {
      cutoff.setDate(now.getDate() - 1);
    }
    
    const recentUsage = this.usage.filter(u => new Date(u.timestamp) >= cutoff);
    
    const stats = {
      totalDocuments: recentUsage.length,
      ollamaUsage: recentUsage.filter(u => u.provider === 'ollama').length,
      externalUsage: recentUsage.filter(u => u.provider !== 'ollama').length,
      totalCost: recentUsage.reduce((sum, u) => sum + u.cost, 0),
      totalSavings: recentUsage.reduce((sum, u) => sum + u.savings, 0),
      avgResponseTime: recentUsage.length > 0 
        ? recentUsage.reduce((sum, u) => sum + u.responseTime, 0) / recentUsage.length 
        : 0,
      providerDistribution: this.getProviderDistribution(recentUsage),
      documentTypeDistribution: this.getDocumentTypeDistribution(recentUsage)
    };
    
    return stats;
  }

  getProviderDistribution(usage) {
    const distribution = {};
    usage.forEach(u => {
      distribution[u.provider] = (distribution[u.provider] || 0) + 1;
    });
    return distribution;
  }

  getDocumentTypeDistribution(usage) {
    const distribution = {};
    usage.forEach(u => {
      distribution[u.documentType] = (distribution[u.documentType] || 0) + 1;
    });
    return distribution;
  }

  async exportUsageReport(format = 'json') {
    const stats = this.getUsageStats('30d');
    const report = {
      generatedAt: new Date().toISOString(),
      summary: stats,
      detailedUsage: this.usage.slice(-100) // Last 100 records
    };
    
    if (format === 'json') {
      return JSON.stringify(report, null, 2);
    }
    
    // CSV format
    if (format === 'csv') {
      const headers = 'Date,Provider,Document Type,Tokens,Cost,Savings,Response Time\n';
      const rows = this.usage.slice(-100).map(u => 
        `${u.date},${u.provider},${u.documentType},${u.tokenCount},${u.cost},${u.savings},${u.responseTime}`
      ).join('\n');
      return headers + rows;
    }
    
    return report;
  }
}

module.exports = CostTracker;
