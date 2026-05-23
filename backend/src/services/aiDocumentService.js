const { ChatOpenAI } = require('@langchain/openai');
const { ChatAnthropic } = require('@langchain/anthropic');
const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');
const { ChatCohere } = require('@langchain/cohere');
const { PromptTemplate } = require('@langchain/core/prompts');

class AIDocumentService {
  constructor() {
    this.providers = {
      openai: null,
      claude: null,
      gemini: null,
      cohere: null
    };
    
    this.documentTemplates = {
      SETTLEMENT_AGREEMENT: {
        preferredProvider: 'claude',
        fallbacks: ['openai', 'gemini'],
        template: `You are an expert legal document writer. Generate a professional settlement agreement document.

Case Details:
- Client Name: {clientName}
- Case Type: {caseType}
- Settlement Amount: {settlementAmount}
- Attorney Fees: {attorneyFees}
- Case Costs: {costs}
- Net to Client: {netToClient}
- Description: {description}
- Settlement Date: {settlementDate}

Generate a comprehensive settlement agreement that includes:
1. Parties involved
2. Recitals/background
3. Settlement terms
4. Release language
5. Payment terms
6. Confidentiality provisions
7. Signatures section

Format: Professional legal document with proper sections and numbering.
Tone: Formal, legal, precise
Length: Comprehensive but concise`
      },
      
      DEMAND_LETTER: {
        preferredProvider: 'openai',
        fallbacks: ['claude', 'gemini'],
        template: `You are an expert personal injury attorney. Write a compelling demand letter.

Case Details:
- Client Name: {clientName}
- Case Type: {caseType}
- Demand Amount: {demandAmount}
- Incident Description: {description}
- Attorney: {attorney}

Create a persuasive demand letter that includes:
1. Professional letterhead format
2. Clear statement of facts
3. Legal liability arguments
4. Damages calculation
5. Medical expenses and treatment
6. Lost wages and future losses
7. Pain and suffering
8. Clear demand amount
9. Settlement deadline

Format: Professional business letter
Tone: Firm but professional, persuasive
Length: 2-3 pages equivalent`
      },
      
      DISCOVERY_REQUEST: {
        preferredProvider: 'gemini',
        fallbacks: ['claude', 'openai'],
        template: `You are a litigation attorney preparing discovery requests. Generate comprehensive discovery documents.

Case Details:
- Client Name: {clientName}  
- Case Type: {caseType}
- Opposing Party: {opposingParty}
- Case Description: {description}
- Discovery Type: {discoveryType}

Create professional discovery requests including:
1. Proper legal caption
2. Definitions and instructions
3. Comprehensive interrogatories (if applicable)
4. Document production requests (if applicable)
5. Requests for admission (if applicable)
6. Proper certification and signature blocks

Format: Formal legal pleading
Tone: Precise, thorough, legally compliant
Focus: Gather maximum relevant information`
      },
      
      LEGAL_BRIEF: {
        preferredProvider: 'claude',
        fallbacks: ['openai', 'gemini'],
        template: `You are an appellate attorney writing a legal brief. Create a well-researched legal argument.

Case Details:
- Client Name: {clientName}
- Case Type: {caseType}
- Legal Issue: {legalIssue}
- Position: {clientPosition}
- Key Facts: {keyFacts}
- Jurisdiction: {jurisdiction}

Generate a legal brief with:
1. Table of Contents
2. Table of Authorities
3. Statement of the Issues
4. Statement of Facts
5. Summary of Argument
6. Detailed Legal Arguments with citations
7. Conclusion
8. Certificate of Service

Format: Formal appellate brief
Tone: Scholarly, persuasive, authoritative
Include: Legal citations (use placeholder citations like "Smith v. Jones, 123 F.3d 456 (1st Cir. 2023)")
Length: Comprehensive legal analysis`
      },
      
      CLIENT_INTAKE_FORM: {
        preferredProvider: 'openai',
        fallbacks: ['gemini', 'claude'],
        template: `Generate a comprehensive client intake form for a law firm.

Practice Areas: {practiceAreas}
Case Type Focus: {caseType}

Create a detailed intake form including:
1. Client personal information
2. Contact details and emergency contacts
3. Case-specific questions
4. Medical history (if applicable)
5. Employment information
6. Insurance information
7. Prior legal history
8. Incident details and timeline
9. Witness information
10. Document checklist
11. Fee agreement acknowledgment
12. Privacy and consent sections

Format: Professional intake form with clear sections
Tone: Professional but accessible
Style: Questions should be clear and comprehensive`
      },

      CONTRACT_REVIEW: {
        preferredProvider: 'claude',
        fallbacks: ['openai', 'gemini'],
        template: `You are a contract attorney conducting a thorough contract review.

Contract Type: {contractType}
Client Name: {clientName}
Review Focus: {reviewFocus}
Key Concerns: {concerns}

Provide a comprehensive contract analysis including:
1. Executive Summary
2. Key Terms Analysis
3. Risk Assessment
4. Problematic Clauses
5. Missing Provisions
6. Recommended Revisions
7. Negotiation Strategy
8. Legal Compliance Issues

Format: Professional contract review memo
Tone: Analytical, thorough, advisory
Focus: Protect client interests and identify risks`
      }
    };

    this.usageTracking = {
      openai: { requests: 0, tokens: 0, cost: 0 },
      claude: { requests: 0, tokens: 0, cost: 0 },
      gemini: { requests: 0, tokens: 0, cost: 0 },
      cohere: { requests: 0, tokens: 0, cost: 0 }
    };

    this.initializeProviders();
  }

  initializeProviders() {
    try {
      // OpenAI GPT-4
      if (process.env.OPENAI_API_KEY) {
        this.providers.openai = new ChatOpenAI({
          modelName: 'gpt-4',
          temperature: 0.1,
          apiKey: process.env.OPENAI_API_KEY
        });
      }

      // Anthropic Claude
      if (process.env.ANTHROPIC_API_KEY) {
        this.providers.claude = new ChatAnthropic({
          modelName: 'claude-3-sonnet-20240229',
          temperature: 0.1,
          apiKey: process.env.ANTHROPIC_API_KEY
        });
      }

      // Google Gemini
      if (process.env.GOOGLE_API_KEY) {
        this.providers.gemini = new ChatGoogleGenerativeAI({
          modelName: 'gemini-pro',
          temperature: 0.1,
          apiKey: process.env.GOOGLE_API_KEY
        });
      }

      // Cohere
      if (process.env.COHERE_API_KEY) {
        this.providers.cohere = new ChatCohere({
          model: 'command-r',
          temperature: 0.1,
          apiKey: process.env.COHERE_API_KEY
        });
      }

      console.log('🤖 AI Providers initialized:', Object.keys(this.providers).filter(key => this.providers[key] !== null));
    } catch (error) {
      console.error('Error initializing AI providers:', error);
    }
  }

  async generateDocument(documentType, templateData, preferredProvider = null) {
    try {
      const template = this.documentTemplates[documentType];
      if (!template) {
        throw new Error(`Unknown document type: ${documentType}`);
      }

      // Determine which provider to use
      const provider = this.selectProvider(documentType, preferredProvider);
      if (!provider) {
        throw new Error('No AI providers available for document generation');
      }

      // Create prompt from template
      const prompt = PromptTemplate.fromTemplate(template.template);
      const formattedPrompt = await prompt.format(templateData);

      // Generate document
      console.log(`🤖 Generating ${documentType} using ${provider.name}...`);
      const startTime = Date.now();
      
      const response = await provider.model.invoke(formattedPrompt);
      
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Track usage
      this.trackUsage(provider.name, response, duration);

      return {
        success: true,
        document: response.content,
        metadata: {
          documentType,
          provider: provider.name,
          generationTime: duration,
          timestamp: new Date().toISOString(),
          tokenCount: this.estimateTokens(response.content)
        }
      };

    } catch (error) {
      console.error(`Error generating document (${documentType}):`, error);
      return {
        success: false,
        error: error.message,
        documentType
      };
    }
  }

  selectProvider(documentType, preferredProvider = null) {
    const template = this.documentTemplates[documentType];
    
    // If specific provider requested and available, use it
    if (preferredProvider && this.providers[preferredProvider]) {
      return {
        name: preferredProvider,
        model: this.providers[preferredProvider]
      };
    }

    // Use template's preferred provider if available
    if (this.providers[template.preferredProvider]) {
      return {
        name: template.preferredProvider,
        model: this.providers[template.preferredProvider]
      };
    }

    // Try fallback providers
    for (const fallback of template.fallbacks) {
      if (this.providers[fallback]) {
        return {
          name: fallback,
          model: this.providers[fallback]
        };
      }
    }

    // Use any available provider
    for (const [name, model] of Object.entries(this.providers)) {
      if (model) {
        return { name, model };
      }
    }

    return null;
  }

  trackUsage(provider, response, duration) {
    const tokens = this.estimateTokens(response.content);
    this.usageTracking[provider].requests++;
    this.usageTracking[provider].tokens += tokens;
    this.usageTracking[provider].cost += this.estimateCost(provider, tokens);
    
    console.log(`📊 Usage tracking - ${provider}: ${tokens} tokens, ${duration}ms`);
  }

  estimateTokens(text) {
    // Rough estimation: 1 token ≈ 4 characters for English text
    return Math.ceil(text.length / 4);
  }

  estimateCost(provider, tokens) {
    const rates = {
      openai: 0.00003, // $0.03 per 1k tokens for GPT-4
      claude: 0.00003, // $0.03 per 1k tokens for Claude-3
      gemini: 0.00001, // $0.01 per 1k tokens for Gemini Pro
      cohere: 0.000015 // $0.015 per 1k tokens for Command-R
    };
    
    return (tokens / 1000) * (rates[provider] || 0.00002);
  }

  getUsageStats() {
    return {
      providers: Object.keys(this.providers).filter(key => this.providers[key] !== null),
      usage: this.usageTracking,
      totalRequests: Object.values(this.usageTracking).reduce((sum, provider) => sum + provider.requests, 0),
      totalCost: Object.values(this.usageTracking).reduce((sum, provider) => sum + provider.cost, 0)
    };
  }

  getAvailableDocumentTypes() {
    return Object.keys(this.documentTemplates).map(type => ({
      type,
      preferredProvider: this.documentTemplates[type].preferredProvider,
      available: this.selectProvider(type) !== null
    }));
  }

  async testProviderConnection(providerName) {
    try {
      const provider = this.providers[providerName];
      if (!provider) {
        return { success: false, error: 'Provider not configured' };
      }

      const response = await provider.invoke('Test connection - respond with "OK"');
      return {
        success: true,
        provider: providerName,
        response: response.content,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        provider: providerName,
        error: error.message
      };
    }
  }
}

module.exports = AIDocumentService;