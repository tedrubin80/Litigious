import React, { useState, useEffect } from 'react';

const AIDocumentGenerator = ({ settlements, cases }) => {
  const [documentTypes, setDocumentTypes] = useState([]);
  const [providers, setProviders] = useState([]);
  const [selectedType, setSelectedType] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('');
  const [selectedSettlement, setSelectedSettlement] = useState('');
  const [selectedCase, setSelectedCase] = useState('');
  const [customData, setCustomData] = useState({});
  const [generatedDocument, setGeneratedDocument] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const styles = {
    container: { minHeight: '100vh', backgroundColor: '#f8fafc' },
    pageTitle: { fontSize: '1.875rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '1.5rem', display: 'flex', alignItems: 'center' },
    aiIcon: { fontSize: '2rem', marginRight: '0.5rem' },
    formContainer: { backgroundColor: 'white', borderRadius: '0.5rem', padding: '2rem', marginBottom: '2rem', boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)' },
    formGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '1rem' },
    formGroup: { marginBottom: '1rem' },
    formLabel: { display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem', color: '#374151' },
    formInput: { width: '100%', padding: '0.75rem', borderRadius: '0.375rem', border: '1px solid #d1d5db', fontSize: '0.875rem', backgroundColor: 'white' },
    formSelect: { width: '100%', padding: '0.75rem', borderRadius: '0.375rem', border: '1px solid #d1d5db', fontSize: '0.875rem', backgroundColor: 'white' },
    formTextarea: { width: '100%', padding: '0.75rem', borderRadius: '0.375rem', border: '1px solid #d1d5db', fontSize: '0.875rem', backgroundColor: 'white', minHeight: '100px', resize: 'vertical' },
    primaryBtn: { backgroundColor: '#2563eb', color: 'white', padding: '0.75rem 1.5rem', borderRadius: '0.375rem', border: 'none', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '500' },
    generateBtn: { backgroundColor: '#10b981', color: 'white', padding: '1rem 2rem', borderRadius: '0.375rem', border: 'none', cursor: 'pointer', fontSize: '1rem', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '3rem' },
    disabledBtn: { backgroundColor: '#9ca3af', cursor: 'not-allowed' },
    documentPreview: { backgroundColor: 'white', borderRadius: '0.5rem', padding: '2rem', marginTop: '2rem', boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)' },
    documentContent: { fontFamily: 'monospace', whiteSpace: 'pre-wrap', backgroundColor: '#f8fafc', padding: '1.5rem', borderRadius: '0.375rem', border: '1px solid #e2e8f0', fontSize: '0.875rem', lineHeight: '1.5', maxHeight: '600px', overflowY: 'auto' },
    buttonGroup: { display: 'flex', justifyContent: 'flex-start', marginTop: '1.5rem', gap: '1rem' },
    loadingSpinner: { width: '1.5rem', height: '1.5rem', border: '2px solid transparent', borderTop: '2px solid white', borderRadius: '50%', animation: 'spin 1s linear infinite', marginRight: '0.5rem' },
    badge: { padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: '500' },
    successBadge: { backgroundColor: '#dcfce7', color: '#166534' },
    warningBadge: { backgroundColor: '#fef3c7', color: '#92400e' },
    infoSection: { backgroundColor: '#eff6ff', border: '1px solid #3b82f6', borderRadius: '0.5rem', padding: '1rem', marginBottom: '1.5rem' },
    infoText: { fontSize: '0.875rem', color: '#1e40af' }
  };

  // Add CSS animation for loading spinner
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  useEffect(() => {
    fetchDocumentTypes();
    fetchProviders();
  }, []);

  const fetchDocumentTypes = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/ai/document-types', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setDocumentTypes(data.documentTypes || []);
        if (data.documentTypes && data.documentTypes.length > 0) {
          setSelectedType(data.documentTypes[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching document types:', error);
    }
  };

  const fetchProviders = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/ai/providers', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setProviders(data.providers || []);
        // Set default provider (prefer mock for demo)
        if (data.providers && data.providers.includes('mock')) {
          setSelectedProvider('mock');
        } else if (data.providers && data.providers.length > 0) {
          setSelectedProvider(data.providers[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching providers:', error);
    }
  };

  const handleGenerateDocument = async () => {
    if (!selectedType) {
      alert('Please select a document type');
      return;
    }

    setIsGenerating(true);
    setGeneratedDocument(null);

    try {
      const token = localStorage.getItem('authToken');
      
      // Prepare the request based on document type
      let endpoint = '/api/ai/generate/';
      let requestBody = {
        provider: selectedProvider || 'mock',
        customData
      };

      // Map document type to endpoint and add relevant IDs
      switch (selectedType) {
        case 'demand_letter':
          endpoint += 'demand-letter';
          if (selectedSettlement) requestBody.settlementId = selectedSettlement;
          if (selectedCase) requestBody.caseId = selectedCase;
          break;
        case 'settlement_agreement':
          endpoint += 'settlement-agreement';
          if (selectedSettlement) requestBody.settlementId = selectedSettlement;
          break;
        case 'discovery_request':
          endpoint += 'discovery';
          if (selectedCase) requestBody.caseId = selectedCase;
          requestBody.discoveryType = customData.discoveryType || 'Interrogatories';
          break;
        case 'legal_brief':
          endpoint += 'legal-brief';
          if (selectedCase) requestBody.caseId = selectedCase;
          requestBody.briefType = customData.briefType || 'Motion';
          break;
        case 'retainer_agreement':
          endpoint += 'retainer';
          requestBody.clientId = customData.clientId;
          break;
        default:
          alert('Unknown document type');
          setIsGenerating(false);
          return;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (response.ok) {
        const data = await response.json();
        setGeneratedDocument(data.document);
        setShowPreview(true);
      } else {
        const error = await response.json();
        alert(`Error generating document: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error generating document:', error);
      alert('Error generating document. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!generatedDocument) return;
    
    const content = generatedDocument.letter || generatedDocument.agreement || generatedDocument.document || generatedDocument.brief || '';
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    
    const selectedTypeObj = documentTypes.find(dt => dt.id === selectedType);
    const fileName = `${selectedTypeObj?.name || 'Document'}_${new Date().toISOString().split('T')[0]}.txt`;
    
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleInputChange = (field, value) => {
    setCustomData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const getDocumentSpecificFields = () => {
    switch (selectedType) {
      case 'demand_letter':
        return React.createElement('div', { style: styles.formGrid },
          React.createElement('div', { style: styles.formGroup },
            React.createElement('label', { style: styles.formLabel }, 'Defendant Name'),
            React.createElement('input', {
              style: styles.formInput,
              type: 'text',
              value: customData.defendantName || '',
              onChange: (e) => handleInputChange('defendantName', e.target.value),
              placeholder: 'Enter defendant name'
            })
          ),
          React.createElement('div', { style: styles.formGroup },
            React.createElement('label', { style: styles.formLabel }, 'Medical Expenses'),
            React.createElement('input', {
              style: styles.formInput,
              type: 'number',
              value: customData.medicalExpenses || '',
              onChange: (e) => handleInputChange('medicalExpenses', e.target.value),
              placeholder: '0.00'
            })
          ),
          React.createElement('div', { style: styles.formGroup },
            React.createElement('label', { style: styles.formLabel }, 'Lost Wages'),
            React.createElement('input', {
              style: styles.formInput,
              type: 'number',
              value: customData.lostWages || '',
              onChange: (e) => handleInputChange('lostWages', e.target.value),
              placeholder: '0.00'
            })
          )
        );
      case 'settlement_agreement':
        return React.createElement('div', { style: styles.formGrid },
          React.createElement('div', { style: styles.formGroup },
            React.createElement('label', { style: styles.formLabel }, 'Payment Terms'),
            React.createElement('input', {
              style: styles.formInput,
              type: 'text',
              value: customData.paymentTerms || '',
              onChange: (e) => handleInputChange('paymentTerms', e.target.value),
              placeholder: 'e.g., Lump sum within 30 days'
            })
          ),
          React.createElement('div', { style: styles.formGroup },
            React.createElement('label', { style: styles.formLabel }, 'Confidentiality'),
            React.createElement('select', {
              style: styles.formSelect,
              value: customData.confidentiality || '',
              onChange: (e) => handleInputChange('confidentiality', e.target.value)
            },
              React.createElement('option', { value: '' }, 'Select...'),
              React.createElement('option', { value: 'No confidentiality' }, 'No confidentiality'),
              React.createElement('option', { value: 'Mutual confidentiality' }, 'Mutual confidentiality'),
              React.createElement('option', { value: 'Strict confidentiality' }, 'Strict confidentiality')
            )
          )
        );
      case 'discovery_request':
        return React.createElement('div', { style: styles.formGrid },
          React.createElement('div', { style: styles.formGroup },
            React.createElement('label', { style: styles.formLabel }, 'Discovery Type'),
            React.createElement('select', {
              style: styles.formSelect,
              value: customData.discoveryType || '',
              onChange: (e) => handleInputChange('discoveryType', e.target.value)
            },
              React.createElement('option', { value: 'Interrogatories' }, 'Interrogatories'),
              React.createElement('option', { value: 'Document Requests' }, 'Document Requests'),
              React.createElement('option', { value: 'Admissions' }, 'Request for Admissions')
            )
          ),
          React.createElement('div', { style: { ...styles.formGroup, gridColumn: '1 / -1' } },
            React.createElement('label', { style: styles.formLabel }, 'Areas of Interest'),
            React.createElement('textarea', {
              style: styles.formTextarea,
              value: customData.areasOfInterest || '',
              onChange: (e) => handleInputChange('areasOfInterest', e.target.value),
              placeholder: 'Specific areas to focus discovery on...'
            })
          )
        );
      default:
        return null;
    }
  };

  return React.createElement('div', null,
    React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' } },
      React.createElement('h2', { style: styles.pageTitle },
        React.createElement('span', { style: styles.aiIcon }, '🤖'),
        'AI Document Generator (LangChain)'
      ),
      React.createElement('span', { style: { ...styles.badge, ...styles.successBadge } }, 
        `${providers.length} Providers Available`
      )
    ),

    // Info Section
    React.createElement('div', { style: styles.infoSection },
      React.createElement('div', { style: styles.infoText },
        '✨ This AI Document Generator uses LangChain to support multiple AI providers including OpenAI, Anthropic (Claude), Google (Gemini), and Cohere. ',
        'Documents are generated based on your case and settlement data with intelligent templates for various legal document types.'
      )
    ),

    // Document Generation Form
    React.createElement('div', { style: styles.formContainer },
      React.createElement('h3', { style: { fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' } },
        'Generate Legal Document'
      ),
      
      React.createElement('div', { style: styles.formGrid },
        // Document Type Selection
        React.createElement('div', { style: styles.formGroup },
          React.createElement('label', { style: styles.formLabel }, 'Document Type'),
          React.createElement('select', {
            style: styles.formSelect,
            value: selectedType,
            onChange: (e) => setSelectedType(e.target.value)
          },
            React.createElement('option', { value: '' }, 'Select document type...'),
            ...documentTypes.map(type =>
              React.createElement('option', { key: type.id, value: type.id }, type.name)
            )
          )
        ),

        // AI Provider Selection
        React.createElement('div', { style: styles.formGroup },
          React.createElement('label', { style: styles.formLabel }, 'AI Provider'),
          React.createElement('select', {
            style: styles.formSelect,
            value: selectedProvider,
            onChange: (e) => setSelectedProvider(e.target.value)
          },
            React.createElement('option', { value: '' }, 'Select provider...'),
            ...providers.map(provider =>
              React.createElement('option', { key: provider, value: provider }, 
                provider === 'mock' ? 'Mock (Demo)' : provider.charAt(0).toUpperCase() + provider.slice(1)
              )
            )
          )
        ),

        // Settlement Selection (for relevant document types)
        (selectedType === 'demand_letter' || selectedType === 'settlement_agreement') && 
        React.createElement('div', { style: styles.formGroup },
          React.createElement('label', { style: styles.formLabel }, 'Settlement (Optional)'),
          React.createElement('select', {
            style: styles.formSelect,
            value: selectedSettlement,
            onChange: (e) => setSelectedSettlement(e.target.value)
          },
            React.createElement('option', { value: '' }, 'Select settlement...'),
            ...settlements.map(settlement =>
              React.createElement('option', { key: settlement.id, value: settlement.id },
                `${settlement.case.clientName} - $${settlement.amount.toLocaleString()}`
              )
            )
          )
        ),

        // Case Selection (for relevant document types)
        (selectedType === 'demand_letter' || selectedType === 'discovery_request' || selectedType === 'legal_brief') &&
        React.createElement('div', { style: styles.formGroup },
          React.createElement('label', { style: styles.formLabel }, 'Case (Optional)'),
          React.createElement('select', {
            style: styles.formSelect,
            value: selectedCase,
            onChange: (e) => setSelectedCase(e.target.value)
          },
            React.createElement('option', { value: '' }, 'Select case...'),
            ...cases.map(caseItem =>
              React.createElement('option', { key: caseItem.id, value: caseItem.id },
                `${caseItem.clientName} - ${caseItem.caseType}`
              )
            )
          )
        )
      ),

      // Document-specific fields
      getDocumentSpecificFields(),

      // Generate Button
      React.createElement('div', { style: { display: 'flex', justifyContent: 'center', marginTop: '2rem' } },
        React.createElement('button', {
          style: isGenerating ? { ...styles.generateBtn, ...styles.disabledBtn } : styles.generateBtn,
          onClick: handleGenerateDocument,
          disabled: isGenerating || !selectedType
        },
          isGenerating && React.createElement('span', { style: styles.loadingSpinner }),
          isGenerating ? 'Generating...' : 'Generate Document'
        )
      )
    ),

    // Document Preview
    showPreview && generatedDocument && React.createElement('div', { style: styles.documentPreview },
      React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' } },
        React.createElement('h3', { style: { fontSize: '1.25rem', fontWeight: '600' } }, 'Generated Document'),
        React.createElement('div', { style: { display: 'flex', gap: '0.5rem' } },
          generatedDocument.summary && React.createElement('span', { 
            style: { ...styles.badge, ...styles.warningBadge },
            title: generatedDocument.summary 
          }, 'AI Generated'),
          React.createElement('button', {
            style: styles.primaryBtn,
            onClick: handleDownload
          }, '📥 Download')
        )
      ),
      
      React.createElement('div', { style: styles.documentContent },
        generatedDocument.letter || generatedDocument.agreement || generatedDocument.document || generatedDocument.brief || 'No content generated'
      ),

      // Show key points or checklist if available
      generatedDocument.keyPoints && React.createElement('div', { style: { marginTop: '1.5rem' } },
        React.createElement('h4', { style: { fontSize: '1rem', fontWeight: '600', marginBottom: '0.5rem' } }, 'Key Points:'),
        React.createElement('ul', { style: { paddingLeft: '1.5rem' } },
          ...generatedDocument.keyPoints.map((point, index) =>
            React.createElement('li', { key: index, style: { marginBottom: '0.25rem' } }, point)
          )
        )
      ),

      generatedDocument.checklist && React.createElement('div', { style: { marginTop: '1.5rem' } },
        React.createElement('h4', { style: { fontSize: '1rem', fontWeight: '600', marginBottom: '0.5rem' } }, 'Review Checklist:'),
        React.createElement('ul', { style: { paddingLeft: '1.5rem' } },
          ...generatedDocument.checklist.map((item, index) =>
            React.createElement('li', { key: index, style: { marginBottom: '0.25rem' } }, item)
          )
        )
      )
    )
  );
};

export default AIDocumentGenerator;