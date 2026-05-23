import { Document, Page, Text, View, StyleSheet, PDFDownloadLink, pdf, Image } from '@react-pdf/renderer';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// Styles for PDF documents
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    padding: 20,
    fontSize: 12,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 20,
    paddingBottom: 10,
    borderBottom: '1px solid #000000',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333333',
  },
  section: {
    margin: 10,
    padding: 10,
    flexGrow: 1,
  },
  text: {
    margin: 6,
    fontSize: 12,
    textAlign: 'justify',
    lineHeight: 1.4,
  },
  table: {
    display: "table",
    width: "auto",
    borderStyle: "solid",
    borderWidth: 1,
    borderRightWidth: 0,
    borderBottomWidth: 0
  },
  tableRow: {
    margin: "auto",
    flexDirection: "row"
  },
  tableCol: {
    width: "25%",
    borderStyle: "solid",
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0
  },
  tableCell: {
    margin: "auto",
    marginTop: 5,
    fontSize: 10
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    textAlign: 'center',
    color: '#666666',
    fontSize: 10,
    paddingHorizontal: 20,
    borderTop: '1px solid #cccccc',
    paddingTop: 10,
  },
  lawFirmHeader: {
    textAlign: 'center',
    marginBottom: 20,
  },
  lawFirmName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  lawFirmAddress: {
    fontSize: 10,
    color: '#666666',
    marginBottom: 2,
  },
  dateSection: {
    textAlign: 'right',
    marginBottom: 20,
    fontSize: 10,
  },
  clientInfo: {
    marginBottom: 15,
    backgroundColor: '#f8f9fa',
    padding: 10,
  },
  fieldLabel: {
    fontWeight: 'bold',
    marginRight: 5,
  },
  fieldValue: {
    marginLeft: 5,
  },
  caseDetails: {
    marginBottom: 15,
    border: '1px solid #cccccc',
    padding: 10,
  },
  signature: {
    marginTop: 30,
    borderTop: '1px solid #000000',
    paddingTop: 10,
    textAlign: 'center',
  }
});

// Case Report PDF Document Component
export const CaseReportDocument = ({ caseData, clientData, activities }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.lawFirmHeader}>
        <Text style={styles.lawFirmName}>Legal Eagle Law Firm</Text>
        <Text style={styles.lawFirmAddress}>123 Justice Avenue, Legal City, LC 12345</Text>
        <Text style={styles.lawFirmAddress}>Phone: (555) 123-4567 | Email: info@legaleagle.com</Text>
      </View>

      <View style={styles.dateSection}>
        <Text>Report Generated: {new Date().toLocaleDateString()}</Text>
      </View>

      <Text style={styles.title}>Case Report</Text>

      {/* Case Information */}
      <View style={styles.caseDetails}>
        <Text style={styles.subtitle}>Case Information</Text>
        <View style={{ flexDirection: 'row', marginBottom: 5 }}>
          <Text style={styles.fieldLabel}>Case Number:</Text>
          <Text style={styles.fieldValue}>{caseData?.caseNumber || 'N/A'}</Text>
        </View>
        <View style={{ flexDirection: 'row', marginBottom: 5 }}>
          <Text style={styles.fieldLabel}>Title:</Text>
          <Text style={styles.fieldValue}>{caseData?.title || 'N/A'}</Text>
        </View>
        <View style={{ flexDirection: 'row', marginBottom: 5 }}>
          <Text style={styles.fieldLabel}>Status:</Text>
          <Text style={styles.fieldValue}>{caseData?.status || 'N/A'}</Text>
        </View>
        <View style={{ flexDirection: 'row', marginBottom: 5 }}>
          <Text style={styles.fieldLabel}>Priority:</Text>
          <Text style={styles.fieldValue}>{caseData?.priority || 'N/A'}</Text>
        </View>
        <View style={{ flexDirection: 'row', marginBottom: 5 }}>
          <Text style={styles.fieldLabel}>Type:</Text>
          <Text style={styles.fieldValue}>{caseData?.type || 'N/A'}</Text>
        </View>
        <View style={{ flexDirection: 'row', marginBottom: 5 }}>
          <Text style={styles.fieldLabel}>Assigned Attorney:</Text>
          <Text style={styles.fieldValue}>{caseData?.assignedAttorney || 'N/A'}</Text>
        </View>
      </View>

      {/* Client Information */}
      <View style={styles.clientInfo}>
        <Text style={styles.subtitle}>Client Information</Text>
        <View style={{ flexDirection: 'row', marginBottom: 5 }}>
          <Text style={styles.fieldLabel}>Name:</Text>
          <Text style={styles.fieldValue}>{clientData?.name || 'N/A'}</Text>
        </View>
        <View style={{ flexDirection: 'row', marginBottom: 5 }}>
          <Text style={styles.fieldLabel}>Email:</Text>
          <Text style={styles.fieldValue}>{clientData?.email || 'N/A'}</Text>
        </View>
        <View style={{ flexDirection: 'row', marginBottom: 5 }}>
          <Text style={styles.fieldLabel}>Phone:</Text>
          <Text style={styles.fieldValue}>{clientData?.phone || 'N/A'}</Text>
        </View>
        <View style={{ flexDirection: 'row', marginBottom: 5 }}>
          <Text style={styles.fieldLabel}>Address:</Text>
          <Text style={styles.fieldValue}>{clientData?.address || 'N/A'}</Text>
        </View>
      </View>

      {/* Case Description */}
      <View style={styles.section}>
        <Text style={styles.subtitle}>Case Description</Text>
        <Text style={styles.text}>
          {caseData?.description || 'No description available'}
        </Text>
      </View>

      {/* Recent Activities */}
      <View style={styles.section}>
        <Text style={styles.subtitle}>Recent Case Activities</Text>
        {activities && activities.length > 0 ? (
          activities.slice(0, 10).map((activity, index) => (
            <View key={index} style={{ marginBottom: 8, borderBottom: '0.5px solid #eee', paddingBottom: 5 }}>
              <Text style={{ fontSize: 10, color: '#666', marginBottom: 2 }}>
                {new Date(activity.createdAt).toLocaleDateString()} - {activity.type}
              </Text>
              <Text style={{ fontSize: 11 }}>{activity.description}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.text}>No recent activities recorded</Text>
        )}
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text>This report was generated automatically by Legal Eagle Case Management System</Text>
        <Text>Confidential and Privileged Attorney-Client Communication</Text>
      </View>
    </Page>
  </Document>
);

// Invoice PDF Document Component
export const InvoiceDocument = ({ invoiceData, clientData, lineItems }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.lawFirmHeader}>
        <Text style={styles.lawFirmName}>Legal Eagle Law Firm</Text>
        <Text style={styles.lawFirmAddress}>123 Justice Avenue, Legal City, LC 12345</Text>
        <Text style={styles.lawFirmAddress}>Phone: (555) 123-4567 | Email: billing@legaleagle.com</Text>
      </View>

      <Text style={styles.title}>INVOICE</Text>

      {/* Invoice Details */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
        <View style={{ width: '48%' }}>
          <Text style={styles.subtitle}>Bill To:</Text>
          <Text style={styles.text}>{clientData?.name || 'N/A'}</Text>
          <Text style={styles.text}>{clientData?.address || 'N/A'}</Text>
          <Text style={styles.text}>{clientData?.email || 'N/A'}</Text>
          <Text style={styles.text}>{clientData?.phone || 'N/A'}</Text>
        </View>
        <View style={{ width: '48%', textAlign: 'right' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 5 }}>
            <Text style={styles.fieldLabel}>Invoice #:</Text>
            <Text style={styles.fieldValue}>{invoiceData?.invoiceNumber || 'N/A'}</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 5 }}>
            <Text style={styles.fieldLabel}>Date:</Text>
            <Text style={styles.fieldValue}>{invoiceData?.date || new Date().toLocaleDateString()}</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 5 }}>
            <Text style={styles.fieldLabel}>Due Date:</Text>
            <Text style={styles.fieldValue}>{invoiceData?.dueDate || 'N/A'}</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 5 }}>
            <Text style={styles.fieldLabel}>Case:</Text>
            <Text style={styles.fieldValue}>{invoiceData?.caseNumber || 'N/A'}</Text>
          </View>
        </View>
      </View>

      {/* Line Items Table */}
      <View style={styles.table}>
        <View style={styles.tableRow}>
          <View style={[styles.tableCol, { width: '40%' }]}>
            <Text style={[styles.tableCell, { fontWeight: 'bold' }]}>Description</Text>
          </View>
          <View style={[styles.tableCol, { width: '15%' }]}>
            <Text style={[styles.tableCell, { fontWeight: 'bold' }]}>Hours</Text>
          </View>
          <View style={[styles.tableCol, { width: '20%' }]}>
            <Text style={[styles.tableCell, { fontWeight: 'bold' }]}>Rate</Text>
          </View>
          <View style={[styles.tableCol, { width: '25%' }]}>
            <Text style={[styles.tableCell, { fontWeight: 'bold' }]}>Amount</Text>
          </View>
        </View>
        {lineItems && lineItems.map((item, index) => (
          <View key={index} style={styles.tableRow}>
            <View style={[styles.tableCol, { width: '40%' }]}>
              <Text style={styles.tableCell}>{item.description}</Text>
            </View>
            <View style={[styles.tableCol, { width: '15%' }]}>
              <Text style={styles.tableCell}>{item.hours || item.quantity || 1}</Text>
            </View>
            <View style={[styles.tableCol, { width: '20%' }]}>
              <Text style={styles.tableCell}>${item.rate || item.unitPrice || 0}</Text>
            </View>
            <View style={[styles.tableCol, { width: '25%' }]}>
              <Text style={styles.tableCell}>${item.amount || (item.hours * item.rate) || 0}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Totals */}
      <View style={{ marginTop: 20, alignItems: 'flex-end' }}>
        <View style={{ width: '40%' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
            <Text style={styles.fieldLabel}>Subtotal:</Text>
            <Text>${invoiceData?.subtotal || 0}</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
            <Text style={styles.fieldLabel}>Tax ({invoiceData?.taxRate || 0}%):</Text>
            <Text>${invoiceData?.tax || 0}</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderTop: '1px solid #000', paddingTop: 5 }}>
            <Text style={[styles.fieldLabel, { fontSize: 14, fontWeight: 'bold' }]}>Total:</Text>
            <Text style={{ fontSize: 14, fontWeight: 'bold' }}>${invoiceData?.total || 0}</Text>
          </View>
        </View>
      </View>

      {/* Payment Terms */}
      <View style={[styles.section, { marginTop: 30 }]}>
        <Text style={styles.subtitle}>Payment Terms</Text>
        <Text style={styles.text}>
          Payment is due within 30 days of invoice date. Please include invoice number with payment.
          Late payments may be subject to interest charges.
        </Text>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text>Thank you for your business!</Text>
        <Text>Questions about this invoice? Contact us at billing@legaleagle.com</Text>
      </View>
    </Page>
  </Document>
);

// Contract Template Document Component
export const ContractDocument = ({ contractData, clientData, terms }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.lawFirmHeader}>
        <Text style={styles.lawFirmName}>Legal Eagle Law Firm</Text>
        <Text style={styles.lawFirmAddress}>123 Justice Avenue, Legal City, LC 12345</Text>
      </View>

      <Text style={styles.title}>{contractData?.title || 'LEGAL SERVICES AGREEMENT'}</Text>

      <View style={styles.dateSection}>
        <Text>Date: {contractData?.date || new Date().toLocaleDateString()}</Text>
      </View>

      {/* Parties */}
      <View style={styles.section}>
        <Text style={styles.subtitle}>PARTIES</Text>
        <Text style={styles.text}>
          This agreement is entered into between Legal Eagle Law Firm ("Attorney") and {clientData?.name || '[CLIENT NAME]'} ("Client").
        </Text>
      </View>

      {/* Scope of Representation */}
      <View style={styles.section}>
        <Text style={styles.subtitle}>SCOPE OF REPRESENTATION</Text>
        <Text style={styles.text}>
          {contractData?.scope || 'Attorney agrees to represent Client in the matter of [CASE DESCRIPTION]. The representation includes [SPECIFIC SERVICES].'}
        </Text>
      </View>

      {/* Fees and Costs */}
      <View style={styles.section}>
        <Text style={styles.subtitle}>FEES AND COSTS</Text>
        <Text style={styles.text}>
          Client agrees to pay Attorney fees at the rate of ${contractData?.hourlyRate || '[HOURLY RATE]'} per hour. 
          {contractData?.retainer && ` A retainer of $${contractData.retainer} is required upon execution of this agreement.`}
        </Text>
      </View>

      {/* Terms and Conditions */}
      <View style={styles.section}>
        <Text style={styles.subtitle}>TERMS AND CONDITIONS</Text>
        {terms && terms.map((term, index) => (
          <Text key={index} style={styles.text}>
            {index + 1}. {term}
          </Text>
        ))}
      </View>

      {/* Signatures */}
      <View style={styles.signature}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 50 }}>
          <View style={{ width: '45%' }}>
            <Text style={{ borderBottom: '1px solid #000', paddingBottom: 20, marginBottom: 5 }}></Text>
            <Text style={{ fontSize: 10 }}>Client Signature</Text>
            <Text style={{ fontSize: 10 }}>Date: _______________</Text>
          </View>
          <View style={{ width: '45%' }}>
            <Text style={{ borderBottom: '1px solid #000', paddingBottom: 20, marginBottom: 5 }}></Text>
            <Text style={{ fontSize: 10 }}>Attorney Signature</Text>
            <Text style={{ fontSize: 10 }}>Date: _______________</Text>
          </View>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text>This agreement constitutes the entire agreement between the parties.</Text>
      </View>
    </Page>
  </Document>
);

// PDF Service class for managing PDF operations
export class PDFService {
  // Generate case report PDF
  static async generateCaseReport(caseData, clientData, activities) {
    const doc = <CaseReportDocument caseData={caseData} clientData={clientData} activities={activities} />;
    return await pdf(doc).toBlob();
  }

  // Generate invoice PDF
  static async generateInvoice(invoiceData, clientData, lineItems) {
    const doc = <InvoiceDocument invoiceData={invoiceData} clientData={clientData} lineItems={lineItems} />;
    return await pdf(doc).toBlob();
  }

  // Generate contract PDF
  static async generateContract(contractData, clientData, terms) {
    const doc = <ContractDocument contractData={contractData} clientData={clientData} terms={terms} />;
    return await pdf(doc).toBlob();
  }

  // Convert HTML element to PDF using html2canvas and jsPDF
  static async convertHTMLToPDF(elementId, filename = 'document.pdf', options = {}) {
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error(`Element with ID '${elementId}' not found`);
    }

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      ...options
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const imgWidth = 210;
    const pageHeight = 295;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;

    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save(filename);
  }

  // Download blob as file
  static downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // Generate analytics report PDF
  static async generateAnalyticsReport(analyticsData) {
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(20);
    doc.text('Legal Eagle Analytics Report', 20, 30);
    
    // Add generation date
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 40);
    
    let yPos = 60;
    
    // Add overview stats
    doc.setFontSize(16);
    doc.text('Overview Statistics', 20, yPos);
    yPos += 20;
    
    doc.setFontSize(12);
    if (analyticsData.overview) {
      doc.text(`Total Cases: ${analyticsData.overview.totalCases || 0}`, 20, yPos);
      yPos += 10;
      doc.text(`Active Cases: ${analyticsData.overview.activeCases || 0}`, 20, yPos);
      yPos += 10;
      doc.text(`Total Clients: ${analyticsData.overview.totalClients || 0}`, 20, yPos);
      yPos += 10;
      doc.text(`Total Revenue: $${analyticsData.overview.totalRevenue || 0}`, 20, yPos);
      yPos += 20;
    }
    
    // Add performance metrics
    doc.setFontSize(16);
    doc.text('Performance Metrics', 20, yPos);
    yPos += 20;
    
    doc.setFontSize(12);
    if (analyticsData.performance) {
      doc.text(`Win Rate: ${analyticsData.performance.winRate || 0}%`, 20, yPos);
      yPos += 10;
      doc.text(`Average Case Duration: ${analyticsData.performance.avgCaseDuration || 0} days`, 20, yPos);
      yPos += 10;
      doc.text(`Client Satisfaction: ${analyticsData.performance.satisfaction || 0}/5`, 20, yPos);
      yPos += 20;
    }
    
    return doc.output('blob');
  }
}

export default PDFService;