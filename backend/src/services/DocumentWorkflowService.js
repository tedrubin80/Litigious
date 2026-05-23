const { PrismaClient } = require('@prisma/client');
const path = require('path');
const fs = require('fs').promises;

// Import AI services
const openaiService = require('./langchainService');
const claudeService = require('./mockAIService'); // We'll enhance this

// Import storage services
const unifiedStorage = require('./UnifiedStorageService');

class DocumentWorkflowService {
  constructor() {
    this.prisma = new PrismaClient();
    
    // Document workflow states
    this.WORKFLOW_STATES = {
      DRAFT: 'DRAFT',
      AI_GENERATED: 'AI_GENERATED',
      UNDER_REVIEW: 'UNDER_REVIEW',
      APPROVED: 'APPROVED',
      SENT_FOR_SIGNATURE: 'SENT_FOR_SIGNATURE',
      SIGNED: 'SIGNED',
      EXECUTED: 'EXECUTED',
      ARCHIVED: 'ARCHIVED'
    };

    // AI model assignments based on document type
    this.AI_MODEL_ASSIGNMENTS = {
      'CONTRACT': 'chatgpt',      // Best for complex contract drafting
      'MOTION': 'claude',         // Best for legal reasoning and ethics
      'BRIEF': 'claude',          // Best for legal analysis
      'LETTER': 'chatgpt',        // Best for communication
      'PLEADING': 'claude',       // Best for formal legal documents
      'AGREEMENT': 'chatgpt',     // Best for business agreements
      'DISCOVERY': 'gemini',      // Best for document analysis
      'SETTLEMENT': 'chatgpt',    // Best for negotiation language
      'WILL': 'claude',           // Best for precise legal language
      'TRUST': 'claude',          // Best for complex legal structures
      'DEFAULT': 'chatgpt'        // Default fallback
    };

    // Document templates with AI prompts
    this.DOCUMENT_TEMPLATES = {
      'NON_DISCLOSURE_AGREEMENT': {
        name: 'Non-Disclosure Agreement',
        category: 'CONTRACT',
        aiModel: 'chatgpt',
        prompt: `Generate a comprehensive Non-Disclosure Agreement with the following requirements:
        - Mutual or one-way confidentiality as specified
        - Clear definition of confidential information
        - Exceptions to confidentiality obligations
        - Duration and termination clauses
        - Remedies for breach including injunctive relief
        - Jurisdiction and governing law clauses
        
        Case context: {case_context}
        Party details: {party_details}
        Specific requirements: {custom_requirements}`,
        requiredFields: ['party1_name', 'party2_name', 'mutual_disclosure', 'duration_years', 'governing_state']
      },
      
      'DEMAND_LETTER': {
        name: 'Demand Letter',
        category: 'LETTER',
        aiModel: 'chatgpt',
        prompt: `Draft a professional demand letter with the following structure:
        - Clear statement of the legal basis for the demand
        - Factual background and timeline of events
        - Specific amount or action demanded
        - Reasonable deadline for response/compliance
        - Professional but firm tone
        - Consequences of non-compliance
        
        Case details: {case_context}
        Demand amount: {demand_amount}
        Deadline: {response_deadline}
        Special circumstances: {special_circumstances}`,
        requiredFields: ['recipient_name', 'demand_amount', 'response_deadline', 'legal_basis']
      },

      'MOTION_TO_DISMISS': {
        name: 'Motion to Dismiss',
        category: 'MOTION',
        aiModel: 'claude',
        prompt: `Draft a Motion to Dismiss under Federal Rule of Civil Procedure 12(b)(6) with:
        - Clear statement of grounds for dismissal
        - Legal standard for Rule 12(b)(6) motions
        - Factual allegations analysis
        - Legal argument with case law citations
        - Conclusion requesting dismissal
        - Professional formatting for court filing
        
        Case information: {case_context}
        Specific grounds: {dismissal_grounds}
        Jurisdiction: {court_jurisdiction}
        Supporting law: {legal_authorities}`,
        requiredFields: ['court_name', 'case_number', 'plaintiff_name', 'defendant_name', 'dismissal_grounds']
      },

      'EMPLOYMENT_CONTRACT': {
        name: 'Employment Contract',
        category: 'CONTRACT',
        aiModel: 'chatgpt',
        prompt: `Create a comprehensive employment contract including:
        - Position title and reporting structure
        - Compensation and benefits package
        - Work schedule and location requirements
        - Confidentiality and non-compete clauses
        - Termination procedures and severance
        - Dispute resolution mechanisms
        - Compliance with employment laws
        
        Employee details: {employee_info}
        Position details: {position_info}
        Compensation: {compensation_details}
        Special terms: {special_provisions}`,
        requiredFields: ['employee_name', 'position_title', 'salary', 'start_date', 'company_name']
      },

      'SETTLEMENT_AGREEMENT': {
        name: 'Settlement Agreement',
        category: 'SETTLEMENT',
        aiModel: 'chatgpt',
        prompt: `Draft a comprehensive settlement agreement with:
        - Clear identification of all parties
        - Recital of dispute and claims
        - Settlement terms and payment schedule
        - Release and waiver provisions
        - Confidentiality clauses
        - Enforcement and default provisions
        - Signatures and notarization requirements
        
        Dispute background: {dispute_context}
        Settlement amount: {settlement_amount}
        Payment terms: {payment_schedule}
        Special conditions: {special_terms}`,
        requiredFields: ['settlement_amount', 'payment_schedule', 'release_scope', 'parties_info']
      },

      'WILL_AND_TESTAMENT': {
        name: 'Last Will and Testament',
        category: 'WILL',
        aiModel: 'claude',
        prompt: `Create a legally sound Last Will and Testament with:
        - Proper testamentary capacity declarations
        - Revocation of prior wills
        - Appointment of executor and alternates
        - Specific bequests and residuary clause
        - Guardian nominations for minors
        - Tax and administrative provisions
        - Proper execution requirements for jurisdiction
        
        Testator information: {testator_info}
        Beneficiaries: {beneficiary_details}
        Assets: {asset_information}
        Special instructions: {special_bequests}
        Jurisdiction: {state_jurisdiction}`,
        requiredFields: ['testator_name', 'executor_name', 'beneficiaries', 'state_jurisdiction']
      }
    };
  }

  /**
   * Create a new document workflow from template
   */
  async createDocumentFromTemplate(templateKey, caseId, userId, templateData) {
    try {
      const template = this.DOCUMENT_TEMPLATES[templateKey];
      if (!template) {
        throw new Error(`Template ${templateKey} not found`);
      }

      // Validate required fields
      const missingFields = template.requiredFields.filter(field => !templateData[field]);
      if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
      }

      // Get case context for AI generation
      const caseContext = await this.getCaseContext(caseId);
      
      // Create document record
      const document = await this.prisma.document.create({
        data: {
          title: `${template.name} - ${new Date().toISOString().split('T')[0]}`,
          type: template.category,
          caseId: caseId,
          uploadedBy: userId,
          generatedBy: 'AI_TEMPLATE',
          aiProvider: template.aiModel.toUpperCase(),
          metadata: {
            templateKey,
            templateData,
            workflowState: this.WORKFLOW_STATES.DRAFT,
            aiModel: template.aiModel,
            generationTimestamp: new Date().toISOString()
          },
          content: '', // Will be populated by AI
          version: 1
        }
      });

      // Generate document content using AI
      const generatedContent = await this.generateDocumentContent(template, templateData, caseContext);
      
      // Update document with generated content
      await this.prisma.document.update({
        where: { id: document.id },
        data: {
          content: generatedContent,
          metadata: {
            ...document.metadata,
            workflowState: this.WORKFLOW_STATES.AI_GENERATED,
            contentGenerated: true,
            wordCount: generatedContent.split(' ').length
          }
        }
      });

      // Create workflow step
      await this.createWorkflowStep(document.id, this.WORKFLOW_STATES.AI_GENERATED, userId, {
        action: 'AI_GENERATION_COMPLETE',
        aiModel: template.aiModel,
        templateUsed: templateKey
      });

      return {
        success: true,
        document: { ...document, content: generatedContent },
        workflowState: this.WORKFLOW_STATES.AI_GENERATED
      };

    } catch (error) {
      console.error('Document creation error:', error);
      throw new Error(`Failed to create document: ${error.message}`);
    }
  }

  /**
   * Generate document content using appropriate AI model
   */
  async generateDocumentContent(template, templateData, caseContext) {
    try {
      // Prepare the prompt with template data
      let prompt = template.prompt;
      
      // Replace placeholders with actual data
      prompt = prompt.replace('{case_context}', JSON.stringify(caseContext, null, 2));
      
      // Replace specific field placeholders
      Object.keys(templateData).forEach(key => {
        const placeholder = `{${key}}`;
        prompt = prompt.replace(new RegExp(placeholder, 'g'), templateData[key]);
      });

      // Select AI service based on template configuration
      let aiService;
      switch (template.aiModel) {
        case 'chatgpt':
          aiService = openaiService;
          break;
        case 'claude':
          aiService = claudeService;
          break;
        case 'gemini':
          // We'll implement Gemini service later
          aiService = openaiService; // Fallback
          break;
        default:
          aiService = openaiService;
      }

      // Generate content
      const response = await aiService.generateLegalDocument({
        prompt: prompt,
        documentType: template.category,
        maxTokens: 4000,
        temperature: 0.3 // Lower temperature for legal documents
      });

      return response.content || response.text || response;

    } catch (error) {
      console.error('AI generation error:', error);
      throw new Error(`AI content generation failed: ${error.message}`);
    }
  }

  /**
   * Advance document through workflow
   */
  async advanceWorkflow(documentId, newState, userId, reviewNotes = null) {
    try {
      const document = await this.prisma.document.findUnique({
        where: { id: documentId },
        include: { case: true }
      });

      if (!document) {
        throw new Error('Document not found');
      }

      const currentState = document.metadata?.workflowState || this.WORKFLOW_STATES.DRAFT;
      
      // Validate state transition
      if (!this.isValidStateTransition(currentState, newState)) {
        throw new Error(`Invalid state transition from ${currentState} to ${newState}`);
      }

      // Update document state
      await this.prisma.document.update({
        where: { id: documentId },
        data: {
          metadata: {
            ...document.metadata,
            workflowState: newState,
            lastStateChange: new Date().toISOString(),
            reviewNotes: reviewNotes
          }
        }
      });

      // Create workflow step
      await this.createWorkflowStep(documentId, newState, userId, {
        action: `STATE_CHANGED_TO_${newState}`,
        previousState: currentState,
        reviewNotes: reviewNotes
      });

      // Handle state-specific actions
      await this.handleStateActions(documentId, newState, document);

      return {
        success: true,
        newState: newState,
        previousState: currentState
      };

    } catch (error) {
      console.error('Workflow advancement error:', error);
      throw new Error(`Failed to advance workflow: ${error.message}`);
    }
  }

  /**
   * Get AI-powered document suggestions
   */
  async getDocumentSuggestions(caseId, caseType) {
    try {
      const caseContext = await this.getCaseContext(caseId);
      
      // Use Claude for legal analysis and suggestions
      const prompt = `Based on the following case information, suggest the most appropriate legal documents that should be created:

Case Type: ${caseType}
Case Details: ${JSON.stringify(caseContext, null, 2)}

Provide a prioritized list of document suggestions with:
1. Document type and purpose
2. Urgency level (High/Medium/Low)
3. Brief explanation of why this document is needed
4. Recommended timeline for completion

Focus on practical, actionable document needs for this specific case.`;

      const aiResponse = await claudeService.generateLegalDocument({
        prompt: prompt,
        documentType: 'ANALYSIS',
        maxTokens: 1500,
        temperature: 0.4
      });

      return {
        success: true,
        suggestions: aiResponse.content || aiResponse.text || aiResponse,
        caseContext: caseContext
      };

    } catch (error) {
      console.error('Document suggestions error:', error);
      throw new Error(`Failed to get document suggestions: ${error.message}`);
    }
  }

  /**
   * Review document with AI assistance
   */
  async aiDocumentReview(documentId, reviewType = 'COMPREHENSIVE') {
    try {
      const document = await this.prisma.document.findUnique({
        where: { id: documentId },
        include: { case: true }
      });

      if (!document || !document.content) {
        throw new Error('Document not found or has no content');
      }

      const reviewPrompts = {
        'COMPREHENSIVE': `Perform a comprehensive legal review of the following document:

${document.content}

Please analyze and provide feedback on:
1. Legal accuracy and completeness
2. Potential legal risks or issues
3. Missing clauses or provisions
4. Language clarity and precision
5. Formatting and structure
6. Compliance considerations
7. Recommendations for improvement

Provide specific, actionable feedback with line references where possible.`,

        'COMPLIANCE': `Review this document for compliance issues:

${document.content}

Focus specifically on:
1. Regulatory compliance requirements
2. Industry-specific regulations
3. State and federal law compliance
4. Potential compliance violations
5. Required disclosures or notices
6. Documentation requirements`,

        'RISK_ASSESSMENT': `Conduct a legal risk assessment of this document:

${document.content}

Identify and analyze:
1. High-risk clauses or provisions
2. Potential liability exposures
3. Ambiguous language that could cause disputes
4. Missing protective clauses
5. Enforceability concerns
6. Jurisdiction and venue issues`
      };

      const prompt = reviewPrompts[reviewType] || reviewPrompts['COMPREHENSIVE'];

      // Use Claude for thorough legal analysis
      const reviewResponse = await claudeService.generateLegalDocument({
        prompt: prompt,
        documentType: 'REVIEW',
        maxTokens: 2000,
        temperature: 0.2 // Very low temperature for analytical tasks
      });

      // Store review results
      await this.prisma.document.update({
        where: { id: documentId },
        data: {
          metadata: {
            ...document.metadata,
            aiReviews: [
              ...(document.metadata?.aiReviews || []),
              {
                reviewType: reviewType,
                reviewDate: new Date().toISOString(),
                aiModel: 'claude',
                feedback: reviewResponse.content || reviewResponse.text || reviewResponse,
                reviewId: `review_${Date.now()}`
              }
            ]
          }
        }
      });

      return {
        success: true,
        reviewType: reviewType,
        feedback: reviewResponse.content || reviewResponse.text || reviewResponse,
        documentId: documentId
      };

    } catch (error) {
      console.error('AI document review error:', error);
      throw new Error(`AI document review failed: ${error.message}`);
    }
  }

  /**
   * Export document to various formats
   */
  async exportDocument(documentId, format = 'PDF', userId) {
    try {
      const document = await this.prisma.document.findUnique({
        where: { id: documentId },
        include: { case: true, user: true }
      });

      if (!document) {
        throw new Error('Document not found');
      }

      let exportedContent;
      let fileName;
      let mimeType;

      switch (format.toUpperCase()) {
        case 'PDF':
          exportedContent = await this.generatePDF(document);
          fileName = `${document.title}.pdf`;
          mimeType = 'application/pdf';
          break;
        case 'DOCX':
          exportedContent = await this.generateDOCX(document);
          fileName = `${document.title}.docx`;
          mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
          break;
        case 'HTML':
          exportedContent = await this.generateHTML(document);
          fileName = `${document.title}.html`;
          mimeType = 'text/html';
          break;
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }

      // Save exported file to cloud storage
      const tempPath = `/tmp/${fileName}`;
      await fs.writeFile(tempPath, exportedContent);

      const uploadResult = await unifiedStorage.uploadFile(tempPath, {
        filename: fileName,
        mimeType: mimeType,
        category: 'exported_documents',
        caseId: document.caseId,
        userId: userId
      });

      // Clean up temp file
      await fs.unlink(tempPath);

      // Create workflow step
      await this.createWorkflowStep(documentId, document.metadata?.workflowState, userId, {
        action: 'DOCUMENT_EXPORTED',
        format: format,
        exportLocation: uploadResult.key || uploadResult.fileId
      });

      return {
        success: true,
        format: format,
        fileName: fileName,
        downloadUrl: uploadResult.location,
        fileId: uploadResult.key || uploadResult.fileId
      };

    } catch (error) {
      console.error('Document export error:', error);
      throw new Error(`Document export failed: ${error.message}`);
    }
  }

  /**
   * Helper Methods
   */
  
  async getCaseContext(caseId) {
    const caseData = await this.prisma.case.findUnique({
      where: { id: caseId },
      include: {
        client: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            address: true
          }
        },
        assignedAttorney: {
          select: {
            name: true,
            email: true,
            barNumber: true
          }
        }
      }
    });

    return caseData;
  }

  async createWorkflowStep(documentId, state, userId, metadata = {}) {
    return await this.prisma.documentWorkflowStep.create({
      data: {
        documentId: documentId,
        state: state,
        userId: userId,
        metadata: metadata,
        timestamp: new Date()
      }
    });
  }

  isValidStateTransition(currentState, newState) {
    const validTransitions = {
      [this.WORKFLOW_STATES.DRAFT]: [this.WORKFLOW_STATES.AI_GENERATED, this.WORKFLOW_STATES.UNDER_REVIEW],
      [this.WORKFLOW_STATES.AI_GENERATED]: [this.WORKFLOW_STATES.UNDER_REVIEW, this.WORKFLOW_STATES.DRAFT],
      [this.WORKFLOW_STATES.UNDER_REVIEW]: [this.WORKFLOW_STATES.APPROVED, this.WORKFLOW_STATES.DRAFT],
      [this.WORKFLOW_STATES.APPROVED]: [this.WORKFLOW_STATES.SENT_FOR_SIGNATURE, this.WORKFLOW_STATES.EXECUTED],
      [this.WORKFLOW_STATES.SENT_FOR_SIGNATURE]: [this.WORKFLOW_STATES.SIGNED, this.WORKFLOW_STATES.APPROVED],
      [this.WORKFLOW_STATES.SIGNED]: [this.WORKFLOW_STATES.EXECUTED],
      [this.WORKFLOW_STATES.EXECUTED]: [this.WORKFLOW_STATES.ARCHIVED]
    };

    return validTransitions[currentState]?.includes(newState) || false;
  }

  async handleStateActions(documentId, newState, document) {
    switch (newState) {
      case this.WORKFLOW_STATES.SENT_FOR_SIGNATURE:
        // Trigger e-signature workflow
        await this.initiateESignature(documentId, document);
        break;
      case this.WORKFLOW_STATES.EXECUTED:
        // Create final archived copy
        await this.archiveExecutedDocument(documentId, document);
        break;
      // Add more state-specific actions as needed
    }
  }

  async initiateESignature(documentId, document) {
    // We'll implement DocuSign integration here
    console.log(`Initiating e-signature for document ${documentId}`);
  }

  async archiveExecutedDocument(documentId, document) {
    // Archive to long-term storage
    console.log(`Archiving executed document ${documentId}`);
  }

  async generatePDF(document) {
    // Implement PDF generation (using puppeteer or similar)
    return Buffer.from(document.content || '', 'utf-8');
  }

  async generateDOCX(document) {
    // Implement DOCX generation (using docx library)
    return Buffer.from(document.content || '', 'utf-8');
  }

  async generateHTML(document) {
    // Generate formatted HTML
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <title>${document.title}</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 2em; line-height: 1.6; }
            .header { border-bottom: 2px solid #333; padding-bottom: 1em; margin-bottom: 2em; }
            .content { white-space: pre-wrap; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>${document.title}</h1>
            <p>Generated: ${new Date().toLocaleDateString()}</p>
        </div>
        <div class="content">${document.content || ''}</div>
    </body>
    </html>`;
  }

  /**
   * Get available document templates
   */
  getAvailableTemplates() {
    return Object.keys(this.DOCUMENT_TEMPLATES).map(key => ({
      key: key,
      name: this.DOCUMENT_TEMPLATES[key].name,
      category: this.DOCUMENT_TEMPLATES[key].category,
      aiModel: this.DOCUMENT_TEMPLATES[key].aiModel,
      requiredFields: this.DOCUMENT_TEMPLATES[key].requiredFields
    }));
  }

  /**
   * Get document workflow history
   */
  async getWorkflowHistory(documentId) {
    return await this.prisma.documentWorkflowStep.findMany({
      where: { documentId: documentId },
      include: {
        user: {
          select: { name: true, email: true }
        }
      },
      orderBy: { timestamp: 'desc' }
    });
  }
}

// Export singleton instance
module.exports = new DocumentWorkflowService();