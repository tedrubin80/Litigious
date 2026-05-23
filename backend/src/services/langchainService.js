const { ChatOpenAI } = require('@langchain/openai');
const { ChatAnthropic } = require('@langchain/anthropic');
const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');
const { ChatCohere } = require('@langchain/cohere');
const { PromptTemplate } = require('@langchain/core/prompts');
const { z } = require('zod');
const { StructuredOutputParser } = require('langchain/output_parsers');

class LangChainService {
  constructor() {
    this.providers = {
      openai: null,
      anthropic: null,
      google: null,
      cohere: null,
      mock: null
    };
    
    this.initializeProviders();
    this.documentTemplates = this.loadDocumentTemplates();
  }

  initializeProviders() {
    // Initialize OpenAI
    if (process.env.OPENAI_API_KEY) {
      this.providers.openai = new ChatOpenAI({
        openAIApiKey: process.env.OPENAI_API_KEY,
        modelName: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
        temperature: 0.3,
        maxTokens: 4000
      });
    }

    // Initialize Anthropic (Claude)
    if (process.env.ANTHROPIC_API_KEY) {
      this.providers.anthropic = new ChatAnthropic({
        anthropicApiKey: process.env.ANTHROPIC_API_KEY,
        modelName: process.env.ANTHROPIC_MODEL || 'claude-3-opus-20240229',
        temperature: 0.3,
        maxTokens: 4000
      });
    }

    // Initialize Google (Gemini)
    if (process.env.GOOGLE_API_KEY) {
      this.providers.google = new ChatGoogleGenerativeAI({
        apiKey: process.env.GOOGLE_API_KEY,
        modelName: process.env.GOOGLE_MODEL || 'gemini-pro',
        temperature: 0.3,
        maxOutputTokens: 4000
      });
    }

    // Initialize Cohere
    if (process.env.COHERE_API_KEY) {
      this.providers.cohere = new ChatCohere({
        apiKey: process.env.COHERE_API_KEY,
        model: process.env.COHERE_MODEL || 'command-r-plus',
        temperature: 0.3
      });
    }

    // Mock provider for testing
    this.providers.mock = {
      invoke: async (prompt) => ({
        content: `Mock response for: ${typeof prompt === 'string' ? prompt.substring(0, 100) : JSON.stringify(prompt).substring(0, 100)}...`
      })
    };
  }

  loadDocumentTemplates() {
    return {
      demand_letter: {
        name: 'Demand Letter',
        preferredProvider: 'openai',
        fallbackProviders: ['anthropic', 'google'],
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
`),
        outputParser: StructuredOutputParser.fromZodSchema(
          z.object({
            letter: z.string().describe('The complete demand letter'),
            summary: z.string().describe('Brief summary of the demand letter'),
            keyPoints: z.array(z.string()).describe('Key points covered in the letter')
          })
        )
      },

      settlement_agreement: {
        name: 'Settlement Agreement',
        preferredProvider: 'anthropic',
        fallbackProviders: ['openai', 'google'],
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
- Attorney Fees: $\{attorneyFees\}
- Costs: $\{costs\}
- Net to Client: $\{netToClient\}

Special Conditions:
{specialConditions}

Generate a complete settlement agreement that:
1. Clearly identifies all parties
2. States the settlement amount and payment terms
3. Includes appropriate release language
4. Addresses confidentiality if required
5. Includes dispute resolution provisions
6. Has proper signature blocks

Format as a formal legal settlement agreement.
`),
        outputParser: StructuredOutputParser.fromZodSchema(
          z.object({
            agreement: z.string().describe('The complete settlement agreement'),
            summary: z.string().describe('Brief summary of key terms'),
            checklist: z.array(z.string()).describe('Checklist of items to review before signing')
          })
        )
      },

      discovery_request: {
        name: 'Discovery Request',
        preferredProvider: 'openai',
        fallbackProviders: ['anthropic', 'cohere'],
        promptTemplate: PromptTemplate.fromTemplate(`
You are an experienced legal document generator specializing in discovery requests.

Generate discovery requests based on the following case information:

Case Information:
- Case Type: {caseType}
- Client Name: {clientName}
- Opposing Party: {opposingParty}
- Case Number: {caseNumber}
- Discovery Type: {discoveryType}

Case Facts:
{caseFacts}

Specific Areas of Interest:
{areasOfInterest}

Generate professional discovery requests including:
1. Properly formatted {discoveryType}
2. Clear, specific requests
3. Appropriate legal language
4. Numbered items for easy reference
5. Instructions and definitions section

Focus on obtaining information relevant to proving liability and damages.
`),
        outputParser: StructuredOutputParser.fromZodSchema(
          z.object({
            document: z.string().describe('The complete discovery request document'),
            summary: z.string().describe('Summary of discovery requests'),
            categories: z.array(z.string()).describe('Categories of information requested')
          })
        )
      },

      legal_brief: {
        name: 'Legal Brief',
        preferredProvider: 'anthropic',
        fallbackProviders: ['openai', 'google'],
        promptTemplate: PromptTemplate.fromTemplate(`
You are an experienced legal writer specializing in legal briefs and memoranda.

Generate a legal brief based on the following information:

Case Caption:
- Case Name: {caseName}
- Case Number: {caseNumber}
- Court: {courtName}
- Judge: {judgeName}

Brief Type: {briefType}

Issue Presented:
{legalIssue}

Facts:
{facts}

Applicable Law:
{applicableLaw}

Arguments:
{arguments}

Generate a professional legal brief that:
1. Properly formats the caption and introduction
2. Clearly states the issue(s) presented
3. Provides a concise statement of facts
4. Analyzes applicable law
5. Makes persuasive arguments
6. Includes a proper conclusion
7. Follows standard legal brief formatting

Ensure citations are properly formatted.
`),
        outputParser: StructuredOutputParser.fromZodSchema(
          z.object({
            brief: z.string().describe('The complete legal brief'),
            summary: z.string().describe('Executive summary of the brief'),
            strengths: z.array(z.string()).describe('Key strengths of the arguments'),
            considerations: z.array(z.string()).describe('Points to consider or strengthen')
          })
        )
      },

      retainer_agreement: {
        name: 'Retainer Agreement',
        preferredProvider: 'openai',
        fallbackProviders: ['anthropic', 'cohere'],
        promptTemplate: PromptTemplate.fromTemplate(`
You are an experienced legal document generator specializing in retainer agreements.

Generate a retainer agreement based on the following information:

Client Information:
- Client Name: {clientName}
- Client Address: {clientAddress}
- Matter Description: {matterDescription}

Fee Structure:
- Fee Type: {feeType}
- Hourly Rate: {hourlyRate}
- Retainer Amount: {retainerAmount}
- Contingency Percentage: {contingencyPercentage}

Scope of Representation:
{scopeOfWork}

Generate a comprehensive retainer agreement that:
1. Clearly defines the scope of representation
2. Explains the fee structure in detail
3. Outlines client and attorney responsibilities
4. Includes termination provisions
5. Addresses conflicts of interest
6. Has proper signature blocks

Format as a professional legal retainer agreement.
`),
        outputParser: StructuredOutputParser.fromZodSchema(
          z.object({
            agreement: z.string().describe('The complete retainer agreement'),
            summary: z.string().describe('Summary of key terms'),
            clientObligations: z.array(z.string()).describe('Key client obligations')
          })
        )
      }
    };
  }

  async generateDocument(documentType, data, options = {}) {
    const template = this.documentTemplates[documentType];
    if (!template) {
      throw new Error(`Unknown document type: ${documentType}`);
    }

    // Select provider based on preference and availability
    const provider = this.selectProvider(
      options.provider || template.preferredProvider,
      template.fallbackProviders
    );

    if (!provider) {
      throw new Error('No AI provider available. Please configure at least one provider.');
    }

    try {
      // Format the prompt with the provided data
      const prompt = await template.promptTemplate.format(data);
      
      // Track usage for billing
      const startTime = Date.now();
      
      // Generate the document
      const response = await provider.invoke(prompt);
      
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Parse the response if output parser is defined
      let parsedOutput;
      if (template.outputParser) {
        try {
          parsedOutput = await template.outputParser.parse(response.content);
        } catch (parseError) {
          console.error('Error parsing structured output:', parseError);
          parsedOutput = {
            document: response.content,
            summary: 'Generated document',
            metadata: {}
          };
        }
      } else {
        parsedOutput = {
          document: response.content,
          summary: 'Generated document',
          metadata: {}
        };
      }

      // Return the generated document with metadata
      return {
        success: true,
        documentType,
        provider: options.provider || template.preferredProvider,
        content: parsedOutput,
        usage: {
          duration,
          timestamp: new Date().toISOString(),
          model: this.getModelName(provider)
        }
      };
    } catch (error) {
      console.error(`Error generating ${documentType}:`, error);
      
      // Try fallback providers if available
      if (template.fallbackProviders && template.fallbackProviders.length > 0) {
        for (const fallbackProvider of template.fallbackProviders) {
          const fallback = this.providers[fallbackProvider];
          if (fallback && fallback !== provider) {
            try {
              console.log(`Trying fallback provider: ${fallbackProvider}`);
              return await this.generateDocument(documentType, data, {
                ...options,
                provider: fallbackProvider
              });
            } catch (fallbackError) {
              console.error(`Fallback provider ${fallbackProvider} also failed:`, fallbackError);
            }
          }
        }
      }
      
      throw error;
    }
  }

  selectProvider(preferred, fallbacks = []) {
    // Try preferred provider first
    if (this.providers[preferred]) {
      return this.providers[preferred];
    }

    // Try fallback providers
    for (const fallback of fallbacks) {
      if (this.providers[fallback]) {
        console.log(`Using fallback provider: ${fallback}`);
        return this.providers[fallback];
      }
    }

    // Default to mock if no real providers available
    if (process.env.NODE_ENV === 'development') {
      console.log('Using mock provider for development');
      return this.providers.mock;
    }

    return null;
  }

  getModelName(provider) {
    if (!provider) return 'unknown';
    
    if (provider.modelName) return provider.modelName;
    if (provider.model) return provider.model;
    if (provider === this.providers.mock) return 'mock';
    
    return 'unknown';
  }

  getAvailableProviders() {
    return Object.keys(this.providers).filter(key => this.providers[key] !== null);
  }

  getDocumentTypes() {
    return Object.keys(this.documentTemplates).map(key => ({
      id: key,
      name: this.documentTemplates[key].name,
      preferredProvider: this.documentTemplates[key].preferredProvider
    }));
  }

  async testProvider(providerName) {
    const provider = this.providers[providerName];
    if (!provider) {
      return {
        success: false,
        error: `Provider ${providerName} is not configured`
      };
    }

    try {
      const response = await provider.invoke('Hello, please respond with "Test successful"');
      return {
        success: true,
        response: response.content,
        provider: providerName
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        provider: providerName
      };
    }
  }

  async testAllProviders() {
    const results = {};
    for (const providerName of Object.keys(this.providers)) {
      if (this.providers[providerName]) {
        results[providerName] = await this.testProvider(providerName);
      }
    }
    return results;
  }
}

module.exports = new LangChainService();