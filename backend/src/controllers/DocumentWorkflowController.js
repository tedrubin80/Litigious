const documentWorkflowService = require('../services/DocumentWorkflowService');
const ApiResponse = require('../lib/apiResponse');

class DocumentWorkflowController {
  /**
   * Get available document templates
   */
  async getTemplates(req, res) {
    try {
      const templates = documentWorkflowService.getAvailableTemplates();
      
      return ApiResponse.success(res, {
        templates: templates,
        count: templates.length
      }, 'Document templates retrieved successfully');
    } catch (error) {
      console.error('Get templates error:', error);
      return ApiResponse.error(res, 'Failed to retrieve templates', 500, error);
    }
  }

  /**
   * Create document from template
   */
  async createFromTemplate(req, res) {
    try {
      const { templateKey, caseId, templateData } = req.body;
      const userId = req.user.id;

      if (!templateKey || !caseId || !templateData) {
        return ApiResponse.error(res, 'Template key, case ID, and template data are required', 400);
      }

      const result = await documentWorkflowService.createDocumentFromTemplate(
        templateKey, 
        caseId, 
        userId, 
        templateData
      );

      return ApiResponse.success(res, result, 'Document created from template successfully');
    } catch (error) {
      console.error('Create from template error:', error);
      return ApiResponse.error(res, error.message, 400, error);
    }
  }

  /**
   * Get AI document suggestions for case
   */
  async getDocumentSuggestions(req, res) {
    try {
      const { caseId } = req.params;
      const { caseType } = req.query;

      const suggestions = await documentWorkflowService.getDocumentSuggestions(caseId, caseType);
      
      return ApiResponse.success(res, suggestions, 'Document suggestions generated successfully');
    } catch (error) {
      console.error('Document suggestions error:', error);
      return ApiResponse.error(res, error.message, 500, error);
    }
  }

  /**
   * Advance document workflow state
   */
  async advanceWorkflow(req, res) {
    try {
      const { documentId } = req.params;
      const { newState, reviewNotes } = req.body;
      const userId = req.user.id;

      if (!newState) {
        return ApiResponse.error(res, 'New workflow state is required', 400);
      }

      const result = await documentWorkflowService.advanceWorkflow(
        documentId, 
        newState, 
        userId, 
        reviewNotes
      );

      return ApiResponse.success(res, result, 'Document workflow advanced successfully');
    } catch (error) {
      console.error('Advance workflow error:', error);
      return ApiResponse.error(res, error.message, 400, error);
    }
  }

  /**
   * AI document review
   */
  async aiReview(req, res) {
    try {
      const { documentId } = req.params;
      const { reviewType = 'COMPREHENSIVE' } = req.body;

      const review = await documentWorkflowService.aiDocumentReview(documentId, reviewType);
      
      return ApiResponse.success(res, review, 'AI document review completed successfully');
    } catch (error) {
      console.error('AI review error:', error);
      return ApiResponse.error(res, error.message, 500, error);
    }
  }

  /**
   * Export document
   */
  async exportDocument(req, res) {
    try {
      const { documentId } = req.params;
      const { format = 'PDF' } = req.query;
      const userId = req.user.id;

      const exportResult = await documentWorkflowService.exportDocument(documentId, format, userId);
      
      return ApiResponse.success(res, exportResult, 'Document exported successfully');
    } catch (error) {
      console.error('Export document error:', error);
      return ApiResponse.error(res, error.message, 500, error);
    }
  }

  /**
   * Get document workflow history
   */
  async getWorkflowHistory(req, res) {
    try {
      const { documentId } = req.params;

      const history = await documentWorkflowService.getWorkflowHistory(documentId);
      
      return ApiResponse.success(res, {
        documentId: documentId,
        history: history,
        count: history.length
      }, 'Workflow history retrieved successfully');
    } catch (error) {
      console.error('Get workflow history error:', error);
      return ApiResponse.error(res, error.message, 500, error);
    }
  }

  /**
   * Get document workflow states
   */
  async getWorkflowStates(req, res) {
    try {
      const states = documentWorkflowService.WORKFLOW_STATES;
      
      return ApiResponse.success(res, {
        states: Object.keys(states).map(key => ({
          key: key,
          value: states[key]
        }))
      }, 'Workflow states retrieved successfully');
    } catch (error) {
      console.error('Get workflow states error:', error);
      return ApiResponse.error(res, 'Failed to retrieve workflow states', 500, error);
    }
  }

  /**
   * Bulk document generation
   */
  async bulkGenerate(req, res) {
    try {
      const { documents } = req.body; // Array of document generation requests
      const userId = req.user.id;

      if (!documents || !Array.isArray(documents) || documents.length === 0) {
        return ApiResponse.error(res, 'Documents array is required', 400);
      }

      const results = [];
      const errors = [];

      // Process documents in parallel with concurrency limit
      const concurrencyLimit = 3;
      for (let i = 0; i < documents.length; i += concurrencyLimit) {
        const batch = documents.slice(i, i + concurrencyLimit);
        
        const batchPromises = batch.map(async (docRequest, index) => {
          try {
            const result = await documentWorkflowService.createDocumentFromTemplate(
              docRequest.templateKey,
              docRequest.caseId,
              userId,
              docRequest.templateData
            );
            return { index: i + index, success: true, result };
          } catch (error) {
            return { index: i + index, success: false, error: error.message };
          }
        });

        const batchResults = await Promise.all(batchPromises);
        
        batchResults.forEach(result => {
          if (result.success) {
            results.push(result.result);
          } else {
            errors.push({
              index: result.index,
              error: result.error,
              request: documents[result.index]
            });
          }
        });
      }

      return ApiResponse.success(res, {
        generated: results,
        errors: errors,
        summary: {
          total: documents.length,
          successful: results.length,
          failed: errors.length
        }
      }, 'Bulk document generation completed');
    } catch (error) {
      console.error('Bulk generate error:', error);
      return ApiResponse.error(res, error.message, 500, error);
    }
  }

  /**
   * Smart document analysis
   */
  async analyzeDocument(req, res) {
    try {
      const { documentId } = req.params;
      const { analysisType = 'COMPREHENSIVE' } = req.body;

      // This could include:
      // - Legal clause detection
      // - Risk assessment
      // - Compliance checking
      // - Formatting analysis
      // - Language complexity scoring

      const result = await documentWorkflowService.aiDocumentReview(documentId, analysisType);
      
      return ApiResponse.success(res, result, 'Document analysis completed successfully');
    } catch (error) {
      console.error('Analyze document error:', error);
      return ApiResponse.error(res, error.message, 500, error);
    }
  }

  /**
   * Generate document variations
   */
  async generateVariations(req, res) {
    try {
      const { documentId } = req.params;
      const { variationType, customInstructions } = req.body;
      const userId = req.user.id;

      // Variation types could be:
      // - Different jurisdiction
      // - Alternative clauses
      // - Simplified version
      // - Formal/informal tone
      // - Different party structures

      // Implementation would use the base document and generate variations
      // This is a placeholder for the full implementation
      
      return ApiResponse.success(res, {
        message: 'Document variations feature coming soon',
        documentId: documentId,
        variationType: variationType
      }, 'Variation request received');
    } catch (error) {
      console.error('Generate variations error:', error);
      return ApiResponse.error(res, error.message, 500, error);
    }
  }
}

module.exports = new DocumentWorkflowController();