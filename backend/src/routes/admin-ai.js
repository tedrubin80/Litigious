const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const { authenticateToken, requireRole } = require('../middleware/auth');

const prisma = new PrismaClient();

// Encryption/decryption utilities for API keys
const ENCRYPTION_KEY = process.env.AI_KEY_ENCRYPTION_KEY || crypto.randomBytes(32);
const IV_LENGTH = 16;

function encrypt(text) {
  if (!text) return null;
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipher('aes-256-cbc', ENCRYPTION_KEY);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(text) {
  if (!text) return null;
  try {
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encryptedText = textParts.join(':');
    const decipher = crypto.createDecipher('aes-256-cbc', ENCRYPTION_KEY);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Decryption failed:', error.message);
    return null;
  }
}

// Use standard auth middleware with admin role requirement
const requireAdmin = [authenticateToken, requireRole(['SUPER_ADMIN', 'ADMIN'])];

// Get all AI provider configurations
router.get('/ai-providers', requireAdmin, async (req, res) => {
  try {
    // First, try to get from database
    let providers = {};
    
    try {
      const aiConfigs = await prisma.aiProviderConfig.findMany();
      
      aiConfigs.forEach(config => {
        providers[config.provider] = {
          enabled: config.enabled,
          model: config.model,
          apiKey: config.apiKey ? '***ENCRYPTED***' : null,
          status: config.lastTested ? 'saved' : 'configured',
          lastTested: config.lastTested,
          updatedAt: config.updatedAt
        };
      });
    } catch (dbError) {
      console.log('Database not accessible, using environment variables');
      
      // Fallback to environment variables if database isn't available
      const envProviders = ['openai', 'anthropic', 'google', 'cohere', 'ollama'];
      envProviders.forEach(provider => {
        if (provider === 'ollama') {
          // Special handling for Ollama (local, no API key required)
          providers[provider] = {
            enabled: process.env.OLLAMA_BASE_URL !== undefined,
            model: process.env.OLLAMA_MODEL_GENERAL || 'mistral:7b-instruct',
            apiKey: null, // No API key needed for local Ollama
            status: process.env.OLLAMA_BASE_URL ? 'env' : 'not_configured'
          };
        } else {
          const envKey = `${provider.toUpperCase()}_API_KEY`;
          const envModel = `${provider.toUpperCase()}_MODEL`;
          
          providers[provider] = {
            enabled: !!process.env[envKey],
            model: process.env[envModel] || null,
            apiKey: process.env[envKey] ? '***ENV***' : null,
            status: process.env[envKey] ? 'env' : 'not_configured'
          };
        }
      });
    }
    
    res.json({
      success: true,
      providers
    });
    
  } catch (error) {
    console.error('Error fetching AI providers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch AI provider configurations'
    });
  }
});

// Save AI provider configuration
router.post('/ai-providers', requireAdmin, async (req, res) => {
  try {
    const { provider, apiKey, model, enabled = true } = req.body;
    
    if (!provider) {
      return res.status(400).json({
        success: false,
        error: 'Provider name is required'
      });
    }
    
    const validProviders = ['openai', 'anthropic', 'google', 'cohere', 'ollama'];
    if (!validProviders.includes(provider)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid provider name'
      });
    }
    
    // Special handling for Ollama (no API key required)
    let encryptedKey = null;
    if (provider === 'ollama') {
      // Ollama doesn't need an API key
      encryptedKey = null;
    } else {
      // Encrypt the API key for external providers
      encryptedKey = apiKey ? encrypt(apiKey) : null;
    }
    
    try {
      // Try to use database
      const config = await prisma.aiProviderConfig.upsert({
        where: { provider },
        update: {
          apiKey: encryptedKey,
          model,
          enabled: provider === 'ollama' ? enabled : (!!apiKey && enabled),
          updatedAt: new Date()
        },
        create: {
          provider,
          apiKey: encryptedKey,
          model,
          enabled: provider === 'ollama' ? enabled : (!!apiKey && enabled)
        }
      });
      
      res.json({
        success: true,
        message: `${provider} configuration saved`,
        provider: {
          enabled: config.enabled,
          model: config.model,
          hasApiKey: !!config.apiKey,
          status: 'saved'
        }
      });
      
    } catch (dbError) {
      console.log('Database not accessible, provider saved to memory only');
      
      // If database fails, we can't persist but we can acknowledge the save
      res.json({
        success: true,
        message: `${provider} configuration received (database unavailable)`,
        provider: {
          enabled: !!apiKey && enabled,
          model,
          hasApiKey: !!apiKey,
          status: 'memory_only'
        }
      });
    }
    
  } catch (error) {
    console.error('Error saving AI provider:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save AI provider configuration'
    });
  }
});

// Test AI provider connection
router.post('/test-ai-provider', requireAdmin, async (req, res) => {
  try {
    const { provider, apiKey: providedApiKey, model: providedModel, testMode } = req.body;
    
    if (!provider) {
      return res.status(400).json({
        success: false,
        error: 'Provider name is required'
      });
    }
    
    let apiKey = null;
    let model = null;
    
    if (testMode && providedApiKey) {
      // Test mode: use provided credentials from frontend form
      apiKey = providedApiKey;
      model = providedModel;
      console.log(`Testing ${provider} with provided credentials (test mode)`);
    } else {
      // Normal mode: use saved credentials from database/env
      try {
        // Try to get from database first
        const config = await prisma.aiProviderConfig.findUnique({
          where: { provider }
        });
        
        if (provider === 'ollama') {
          // Special handling for Ollama - no API key needed
          model = config?.model || process.env.OLLAMA_MODEL_GENERAL || 'mistral:7b-instruct';
        } else if (config && config.apiKey) {
          apiKey = decrypt(config.apiKey);
          model = config.model;
        }
      } catch (dbError) {
        console.log('Database not accessible, checking environment variables');
        
        if (provider === 'ollama') {
          // Ollama fallback - check if OLLAMA_BASE_URL is configured
          model = process.env.OLLAMA_MODEL_GENERAL || 'mistral:7b-instruct';
        } else {
          // Fallback to environment variables for external providers
          const envKey = `${provider.toUpperCase()}_API_KEY`;
          const envModel = `${provider.toUpperCase()}_MODEL`;
          apiKey = process.env[envKey];
          model = process.env[envModel];
        }
      }
    }
    
    if (provider !== 'ollama' && !apiKey) {
      return res.status(400).json({
        success: false,
        error: 'No API key configured for this provider'
      });
    }
    
    // Test the connection based on provider
    let testResult = false;
    let errorMessage = '';
    
    try {
      switch (provider) {
        case 'openai':
          const { OpenAI } = require('openai');
          const openai = new OpenAI({ apiKey });
          try {
            await openai.models.list();
            testResult = true;
          } catch (openaiError) {
            testResult = false;
            if (openaiError.status === 401) {
              errorMessage = 'Invalid API key';
            } else if (openaiError.status === 403) {
              errorMessage = 'API key does not have required permissions';
            } else if (openaiError.status === 429) {
              errorMessage = 'Rate limit exceeded';
            } else {
              errorMessage = openaiError.message || 'OpenAI API error';
            }
            throw openaiError; // Re-throw to be caught by outer catch
          }
          break;
          
        case 'anthropic':
          const anthropicHeaders = {
            'x-api-key': apiKey,
            'content-type': 'application/json',
            'anthropic-version': '2023-06-01'
          };
          
          const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: anthropicHeaders,
            body: JSON.stringify({
              model: model || 'claude-3-haiku-20240307',
              max_tokens: 10,
              messages: [{ role: 'user', content: 'Test' }]
            })
          });
          
          if (anthropicResponse.status === 401) {
            testResult = false;
            errorMessage = 'Invalid API key or unauthorized';
          } else if (anthropicResponse.status === 403) {
            testResult = false;
            errorMessage = 'API key does not have required permissions';
          } else if (!anthropicResponse.ok) {
            testResult = false;
            const errorData = await anthropicResponse.json().catch(() => ({}));
            errorMessage = errorData.error?.message || `API error: ${anthropicResponse.status}`;
          } else {
            testResult = true;
          }
          break;
          
        case 'google':
          const googleUrl = `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`;
          const googleResponse = await fetch(googleUrl);
          
          if (googleResponse.status === 400) {
            testResult = false;
            errorMessage = 'Invalid API key format';
          } else if (googleResponse.status === 403) {
            testResult = false;
            errorMessage = 'API key is invalid or has insufficient permissions';
          } else if (!googleResponse.ok) {
            testResult = false;
            errorMessage = `API error: ${googleResponse.status}`;
          } else {
            testResult = true;
          }
          break;
          
        case 'cohere':
          const cohereResponse = await fetch('https://api.cohere.ai/v1/models', {
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (cohereResponse.status === 401) {
            testResult = false;
            errorMessage = 'Invalid API key';
          } else if (cohereResponse.status === 403) {
            testResult = false;
            errorMessage = 'API key does not have required permissions';
          } else if (!cohereResponse.ok) {
            testResult = false;
            errorMessage = `API error: ${cohereResponse.status}`;
          } else {
            testResult = true;
          }
          break;
          
        case 'ollama':
          // Test Ollama connection
          const ollamaBaseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
          const ollamaResponse = await fetch(`${ollamaBaseUrl}/api/version`);
          testResult = ollamaResponse.ok;
          if (!testResult) {
            errorMessage = 'Ollama server not running or not accessible';
          } else {
            // Also test if the model is available
            const modelResponse = await fetch(`${ollamaBaseUrl}/api/generate`, {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({
                model: model,
                prompt: 'Test',
                stream: false
              })
            });
            testResult = modelResponse.ok;
            if (!testResult) {
              errorMessage = `Model "${model}" not available. You may need to pull it first with: ollama pull ${model}`;
            }
          }
          break;
          
        default:
          errorMessage = 'Unknown provider';
      }
      
      // Update last tested time if successful
      if (testResult) {
        try {
          await prisma.aiProviderConfig.update({
            where: { provider },
            data: { lastTested: new Date() }
          });
        } catch (dbError) {
          // Database update failed but test succeeded
          console.log('Test successful but could not update database');
        }
      }
      
    } catch (testError) {
      console.error(`${provider} test error:`, testError);
      errorMessage = testError.message || 'Connection test failed';
      testResult = false;
    }
    
    res.json({
      success: testResult,
      provider,
      message: testResult ? 'Connection successful' : errorMessage,
      error: testResult ? null : errorMessage,
      testedAt: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error testing AI provider:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to test AI provider connection'
    });
  }
});

// Get AI usage statistics
router.get('/ai-usage-stats', requireAdmin, async (req, res) => {
  try {
    // Try to get usage stats from the enhanced service
    const EnhancedLangChainService = require('../services/ai/EnhancedLangChainService');
    const service = new EnhancedLangChainService();
    
    const stats = await service.getUsageStats('30d');
    
    res.json({
      success: true,
      stats: {
        ...stats,
        period: '30 days',
        lastUpdated: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Error fetching usage stats:', error);
    
    // Return default stats if service fails
    res.json({
      success: true,
      stats: {
        totalDocuments: 0,
        ollamaUsage: 0,
        externalUsage: 0,
        totalCost: 0,
        totalSavings: 0,
        avgResponseTime: 0,
        providerDistribution: {},
        documentTypeDistribution: {},
        period: '30 days',
        lastUpdated: new Date().toISOString(),
        note: 'Service unavailable - showing default values'
      }
    });
  }
});

module.exports = router;