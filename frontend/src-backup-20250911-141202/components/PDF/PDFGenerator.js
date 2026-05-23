import React, { useState } from 'react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { 
  DocumentIcon, 
  DocumentArrowDownIcon, 
  CogIcon,
  PresentationChartLineIcon,
  CurrencyDollarIcon,
  DocumentDuplicateIcon
} from '../Icons';
import { PDFService, CaseReportDocument, InvoiceDocument, ContractDocument } from '../../services/pdfService';
import LoadingSpinner from '../Common/LoadingSpinner';

const PDFGenerator = ({ 
  type = 'case-report', 
  data = {}, 
  className = '',
  buttonText = 'Download PDF',
  filename = 'document.pdf'
}) => {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);

  // PDF type configurations
  const pdfConfigs = {
    'case-report': {
      icon: DocumentIcon,
      title: 'Case Report',
      color: 'blue',
      component: CaseReportDocument
    },
    'invoice': {
      icon: CurrencyDollarIcon,
      title: 'Invoice',
      color: 'green',
      component: InvoiceDocument
    },
    'contract': {
      icon: DocumentDuplicateIcon,
      title: 'Contract',
      color: 'purple',
      component: ContractDocument
    },
    'analytics': {
      icon: PresentationChartLineIcon,
      title: 'Analytics Report',
      color: 'indigo',
      component: null // Uses jsPDF directly
    }
  };

  const config = pdfConfigs[type] || pdfConfigs['case-report'];
  const IconComponent = config.icon;

  // Handle manual PDF generation for complex documents
  const handleManualGeneration = async () => {
    setGenerating(true);
    setError(null);

    try {
      let blob;
      
      switch (type) {
        case 'case-report':
          blob = await PDFService.generateCaseReport(
            data.caseData,
            data.clientData,
            data.activities
          );
          break;
        case 'invoice':
          blob = await PDFService.generateInvoice(
            data.invoiceData,
            data.clientData,
            data.lineItems
          );
          break;
        case 'contract':
          blob = await PDFService.generateContract(
            data.contractData,
            data.clientData,
            data.terms
          );
          break;
        case 'analytics':
          blob = await PDFService.generateAnalyticsReport(data);
          break;
        default:
          throw new Error('Unknown PDF type');
      }

      PDFService.downloadBlob(blob, filename);
    } catch (err) {
      console.error('PDF Generation Error:', err);
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  // Render PDF download link for react-pdf documents
  const renderPDFDownloadLink = () => {
    const DocumentComponent = config.component;
    if (!DocumentComponent) return null;

    let documentProps = {};
    
    switch (type) {
      case 'case-report':
        documentProps = {
          caseData: data.caseData || {},
          clientData: data.clientData || {},
          activities: data.activities || []
        };
        break;
      case 'invoice':
        documentProps = {
          invoiceData: data.invoiceData || {},
          clientData: data.clientData || {},
          lineItems: data.lineItems || []
        };
        break;
      case 'contract':
        documentProps = {
          contractData: data.contractData || {},
          clientData: data.clientData || {},
          terms: data.terms || []
        };
        break;
    }

    return (
      <PDFDownloadLink
        document={<DocumentComponent {...documentProps} />}
        fileName={filename}
        className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-${config.color}-600 hover:bg-${config.color}-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${config.color}-500 disabled:opacity-50 transition-colors ${className}`}
      >
        {({ blob, url, loading, error }) => (
          <>
            {loading ? (
              <LoadingSpinner size="sm" className="mr-2" />
            ) : (
              <IconComponent className="h-4 w-4 mr-2" />
            )}
            {loading ? 'Generating...' : buttonText}
          </>
        )}
      </PDFDownloadLink>
    );
  };

  // For analytics and other complex PDFs, use manual generation
  if (type === 'analytics' || !config.component) {
    return (
      <button
        onClick={handleManualGeneration}
        disabled={generating}
        className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-${config.color}-600 hover:bg-${config.color}-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${config.color}-500 disabled:opacity-50 transition-colors ${className}`}
      >
        {generating ? (
          <LoadingSpinner size="sm" className="mr-2" />
        ) : (
          <IconComponent className="h-4 w-4 mr-2" />
        )}
        {generating ? 'Generating...' : buttonText}
      </button>
    );
  }

  return (
    <div className="space-y-2">
      {renderPDFDownloadLink()}
      {error && (
        <p className="text-sm text-red-600">
          Error generating PDF: {error}
        </p>
      )}
    </div>
  );
};

// Specialized PDF Generator Components
export const CaseReportPDFGenerator = ({ caseData, clientData, activities, className = '' }) => (
  <PDFGenerator
    type="case-report"
    data={{ caseData, clientData, activities }}
    className={className}
    buttonText="Download Case Report"
    filename={`case-report-${caseData?.caseNumber || 'unknown'}.pdf`}
  />
);

export const InvoicePDFGenerator = ({ invoiceData, clientData, lineItems, className = '' }) => (
  <PDFGenerator
    type="invoice"
    data={{ invoiceData, clientData, lineItems }}
    className={className}
    buttonText="Download Invoice"
    filename={`invoice-${invoiceData?.invoiceNumber || 'unknown'}.pdf`}
  />
);

export const ContractPDFGenerator = ({ contractData, clientData, terms, className = '' }) => (
  <PDFGenerator
    type="contract"
    data={{ contractData, clientData, terms }}
    className={className}
    buttonText="Download Contract"
    filename={`contract-${contractData?.title?.replace(/\s+/g, '-') || 'untitled'}.pdf`}
  />
);

export const AnalyticsPDFGenerator = ({ analyticsData, className = '' }) => (
  <PDFGenerator
    type="analytics"
    data={analyticsData}
    className={className}
    buttonText="Download Analytics Report"
    filename={`analytics-report-${new Date().toISOString().split('T')[0]}.pdf`}
  />
);

// Bulk PDF Generator for multiple documents
export const BulkPDFGenerator = ({ documents = [], className = '' }) => {
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);

  const generateBulkPDFs = async () => {
    setGenerating(true);
    setProgress(0);

    try {
      for (let i = 0; i < documents.length; i++) {
        const doc = documents[i];
        let blob;

        switch (doc.type) {
          case 'case-report':
            blob = await PDFService.generateCaseReport(doc.caseData, doc.clientData, doc.activities);
            break;
          case 'invoice':
            blob = await PDFService.generateInvoice(doc.invoiceData, doc.clientData, doc.lineItems);
            break;
          case 'contract':
            blob = await PDFService.generateContract(doc.contractData, doc.clientData, doc.terms);
            break;
        }

        if (blob) {
          PDFService.downloadBlob(blob, doc.filename);
        }

        setProgress(((i + 1) / documents.length) * 100);
        
        // Small delay between downloads to prevent overwhelming the browser
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (error) {
      console.error('Bulk PDF generation error:', error);
    } finally {
      setGenerating(false);
      setProgress(0);
    }
  };

  return (
    <div className="space-y-2">
      <button
        onClick={generateBulkPDFs}
        disabled={generating || documents.length === 0}
        className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 transition-colors ${className}`}
      >
        {generating ? (
          <LoadingSpinner size="sm" className="mr-2" />
        ) : (
          <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
        )}
        {generating ? `Generating... (${Math.round(progress)}%)` : `Download All (${documents.length})`}
      </button>
      
      {generating && (
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-purple-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
};

// PDF Preview Component
export const PDFPreview = ({ type, data, className = '' }) => {
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);

  const generatePreview = async () => {
    setLoading(true);
    try {
      let blob;
      
      switch (type) {
        case 'case-report':
          blob = await PDFService.generateCaseReport(data.caseData, data.clientData, data.activities);
          break;
        case 'invoice':
          blob = await PDFService.generateInvoice(data.invoiceData, data.clientData, data.lineItems);
          break;
        case 'contract':
          blob = await PDFService.generateContract(data.contractData, data.clientData, data.terms);
          break;
      }

      if (blob) {
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
      }
    } catch (error) {
      console.error('PDF preview error:', error);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  return (
    <div className={`space-y-4 ${className}`}>
      <button
        onClick={generatePreview}
        disabled={loading}
        className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        {loading ? (
          <LoadingSpinner size="sm" className="mr-2" />
        ) : (
          <DocumentIcon className="h-4 w-4 mr-2" />
        )}
        {loading ? 'Generating Preview...' : 'Preview PDF'}
      </button>

      {previewUrl && (
        <div className="border rounded-lg overflow-hidden">
          <iframe
            src={previewUrl}
            className="w-full h-96"
            title="PDF Preview"
          />
        </div>
      )}
    </div>
  );
};

export default PDFGenerator;