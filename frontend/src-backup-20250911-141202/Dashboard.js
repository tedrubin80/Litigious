import React, { useState, useEffect } from 'react';
import SettlementManager from './SettlementManager';
import AIDocumentGenerator from './AIDocumentGenerator';
import ZoomMeetings from './components/Zoom/ZoomMeetings';
import WebRTCMeetingList from './components/WebRTC/WebRTCMeetingList';

function Dashboard({ user, onLogout }) {
  const [activeSection, setActiveSection] = useState('overview');
  const [cases, setCases] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [showSettlementForm, setShowSettlementForm] = useState(false);
  const [editingSettlement, setEditingSettlement] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch data from backend API
  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('authToken');
        if (!token) {
          onLogout();
          return;
        }

        // Fetch cases
        const casesResponse = await fetch('/api/cases', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (casesResponse.ok) {
          const casesData = await casesResponse.json();
          setCases(casesData.cases || []);
        }

        // Fetch documents
        const documentsResponse = await fetch('/api/documents', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (documentsResponse.ok) {
          const documentsData = await documentsResponse.json();
          setDocuments(documentsData.documents || []);
        }

        // Fetch settlements
        const settlementsResponse = await fetch('/api/settlements', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (settlementsResponse.ok) {
          const settlementsData = await settlementsResponse.json();
          setSettlements(settlementsData.settlements || []);
        }

        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setLoading(false);
      }
    };

    fetchData();
  }, [onLogout]);

  // Settlement API functions
  const handleSettlementCreate = async (settlementData) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/settlements', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(settlementData)
      });

      if (response.ok) {
        const result = await response.json();
        setSettlements(prev => [result.settlement, ...prev]);
        alert('Settlement created successfully!');
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create settlement');
      }
    } catch (error) {
      console.error('Error creating settlement:', error);
      throw error;
    }
  };

  const handleSettlementUpdate = async (settlementId, settlementData) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/settlements/${settlementId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(settlementData)
      });

      if (response.ok) {
        const result = await response.json();
        setSettlements(prev => 
          prev.map(settlement => 
            settlement.id === settlementId ? result.settlement : settlement
          )
        );
        alert('Settlement updated successfully!');
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update settlement');
      }
    } catch (error) {
      console.error('Error updating settlement:', error);
      throw error;
    }
  };

  const handleSettlementDelete = async (settlementId) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/settlements/${settlementId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setSettlements(prev => prev.filter(settlement => settlement.id !== settlementId));
        alert('Settlement deleted successfully!');
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete settlement');
      }
    } catch (error) {
      console.error('Error deleting settlement:', error);
      alert('Error deleting settlement. Please try again.');
    }
  };

  const styles = {
    container: { minHeight: '100vh', backgroundColor: '#f8fafc', fontFamily: 'system-ui, -apple-system, sans-serif' },
    header: { backgroundColor: 'white', borderBottom: '1px solid #e2e8f0', padding: '1rem 0' },
    headerContent: { maxWidth: '1200px', margin: '0 auto', padding: '0 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    logo: { fontSize: '1.5rem', fontWeight: 'bold', color: '#2563eb' },
    userInfo: { display: 'flex', alignItems: 'center', gap: '1rem' },
    logoutBtn: { backgroundColor: '#dc2626', color: 'white', padding: '0.5rem 1rem', borderRadius: '0.375rem', border: 'none', cursor: 'pointer', fontSize: '0.875rem' },
    main: { maxWidth: '1200px', margin: '0 auto', padding: '2rem 1rem', display: 'grid', gridTemplateColumns: '250px 1fr', gap: '2rem' },
    sidebar: { backgroundColor: 'white', borderRadius: '0.5rem', padding: '1.5rem', height: 'fit-content', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)' },
    sidebarItem: { padding: '0.75rem 1rem', marginBottom: '0.5rem', borderRadius: '0.375rem', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '500', transition: 'all 0.2s' },
    sidebarItemActive: { backgroundColor: '#2563eb', color: 'white' },
    sidebarItemInactive: { backgroundColor: 'transparent', color: '#6b7280', ':hover': { backgroundColor: '#f3f4f6' } },
    content: { backgroundColor: 'white', borderRadius: '0.5rem', padding: '2rem', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)' },
    pageTitle: { fontSize: '1.875rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '1.5rem' },
    statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' },
    statCard: { backgroundColor: '#f8fafc', padding: '1.5rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' },
    statValue: { fontSize: '2rem', fontWeight: 'bold', color: '#2563eb', marginBottom: '0.5rem' },
    statLabel: { fontSize: '0.875rem', color: '#6b7280' },
    table: { width: '100%', borderCollapse: 'collapse', marginTop: '1rem' },
    tableHeader: { backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' },
    tableRow: { borderBottom: '1px solid #e2e8f0' },
    tableCell: { padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem' },
    statusBadge: { padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: '500' },
    statusActive: { backgroundColor: '#dcfce7', color: '#166534' },
    statusSettlement: { backgroundColor: '#fef3c7', color: '#92400e' },
    statusInvestigation: { backgroundColor: '#dbeafe', color: '#1d4ed8' },
    progressBar: { width: '100%', height: '8px', backgroundColor: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' },
    progressFill: { height: '100%', backgroundColor: '#10b981', transition: 'width 0.3s ease' },
    uploadArea: { border: '2px dashed #d1d5db', borderRadius: '0.5rem', padding: '3rem', textAlign: 'center', marginBottom: '2rem' },
    uploadText: { color: '#6b7280', marginBottom: '1rem' },
    uploadBtn: { backgroundColor: '#2563eb', color: 'white', padding: '0.75rem 1.5rem', borderRadius: '0.375rem', border: 'none', cursor: 'pointer', fontSize: '0.875rem' },
    documentCard: { backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', marginBottom: '1rem' },
    documentHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' },
    documentName: { fontWeight: '500', color: '#1f2937' },
    documentMeta: { fontSize: '0.75rem', color: '#6b7280' },
    actionBtn: { backgroundColor: '#10b981', color: 'white', padding: '0.5rem 1rem', borderRadius: '0.375rem', border: 'none', cursor: 'pointer', fontSize: '0.75rem', marginRight: '0.5rem' },
    primaryBtn: { backgroundColor: '#2563eb', color: 'white', padding: '0.75rem 1.5rem', borderRadius: '0.375rem', border: 'none', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '500' },
    secondaryBtn: { backgroundColor: '#6b7280', color: 'white', padding: '0.75rem 1.5rem', borderRadius: '0.375rem', border: 'none', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '500', marginLeft: '0.5rem' },
    formContainer: { backgroundColor: 'white', borderRadius: '0.5rem', padding: '2rem', marginBottom: '2rem', boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)' },
    formGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' },
    formGroup: { marginBottom: '1rem' },
    formLabel: { display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem', color: '#374151' },
    formInput: { width: '100%', padding: '0.75rem', borderRadius: '0.375rem', border: '1px solid #d1d5db', fontSize: '0.875rem', backgroundColor: 'white' },
    formSelect: { width: '100%', padding: '0.75rem', borderRadius: '0.375rem', border: '1px solid #d1d5db', fontSize: '0.875rem', backgroundColor: 'white' },
    formTextarea: { width: '100%', padding: '0.75rem', borderRadius: '0.375rem', border: '1px solid #d1d5db', fontSize: '0.875rem', backgroundColor: 'white', minHeight: '100px', resize: 'vertical' },
    buttonGroup: { display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' },
    loading: { textAlign: 'center', padding: '2rem', color: '#6b7280' }
  };

  const sidebarItems = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'cases', label: 'My Cases', icon: '📋' },
    { id: 'documents', label: 'Documents', icon: '📄' },
    { id: 'settlements', label: 'Settlements', icon: '💰' },
    { id: 'zoom-meetings', label: 'Zoom Meetings', icon: '🎥' },
    { id: 'webrtc-meetings', label: 'Video Meetings', icon: '📹' },
    { id: 'ai-documents', label: 'AI Documents', icon: '🤖' },
    { id: 'calendar', label: 'Calendar', icon: '📅' },
    { id: 'messages', label: 'Messages', icon: '💬' }
  ];

  const renderOverview = () => {
    // Calculate real statistics - add safety checks
    const activeCases = (cases || []).filter(c => c.status === 'ACTIVE' || c.status === 'PENDING').length;
    const totalSettlementValue = (settlements || []).reduce((sum, settlement) => sum + (settlement.amount || 0), 0);
    const completedSettlements = (settlements || []).filter(s => s.status === 'COMPLETED' || s.status === 'ACCEPTED').length;
    
    return React.createElement('div', null,
      React.createElement('h2', { style: styles.pageTitle }, 'Dashboard Overview'),
      React.createElement('div', { style: styles.statsGrid },
        React.createElement('div', { style: styles.statCard },
          React.createElement('div', { style: styles.statValue }, activeCases),
          React.createElement('div', { style: styles.statLabel }, 'Active Cases')
        ),
        React.createElement('div', { style: styles.statCard },
          React.createElement('div', { style: styles.statValue }, 
            new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(totalSettlementValue)
          ),
          React.createElement('div', { style: styles.statLabel }, 'Total Settlement Value')
        ),
        React.createElement('div', { style: styles.statCard },
          React.createElement('div', { style: styles.statValue }, (documents || []).length),
          React.createElement('div', { style: styles.statLabel }, 'Documents')
        ),
        React.createElement('div', { style: styles.statCard },
          React.createElement('div', { style: styles.statValue }, completedSettlements),
          React.createElement('div', { style: styles.statLabel }, 'Completed Settlements')
        )
      ),
      React.createElement('h3', { style: { fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' } }, 'Recent Cases'),
      (cases || []).length > 0 ? React.createElement('div', { style: { backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '0.5rem' } },
        ...(cases || []).slice(0, 4).map((caseItem, index) =>
          React.createElement('div', { 
            key: caseItem.id,
            style: { 
              marginBottom: index === (cases || []).slice(0, 4).length - 1 ? '0' : '0.5rem', 
              fontSize: '0.875rem' 
            } 
          }, `• ${caseItem.caseNumber || 'Unknown'}: ${caseItem.nextAction || 'Review case status'}`)
        )
      ) : React.createElement('div', { style: { backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '0.5rem', textAlign: 'center', color: '#6b7280' } },
        'No cases available. Create your first case to get started.'
      )
    );
  };

  const renderCases = () => (
    React.createElement('div', null,
      React.createElement('h2', { style: styles.pageTitle }, 'My Cases'),
      (cases || []).length > 0 ? React.createElement('table', { style: styles.table },
        React.createElement('thead', { style: styles.tableHeader },
          React.createElement('tr', null,
            React.createElement('th', { style: styles.tableCell }, 'Case Number'),
            React.createElement('th', { style: styles.tableCell }, 'Client'),
            React.createElement('th', { style: styles.tableCell }, 'Case Type'),
            React.createElement('th', { style: styles.tableCell }, 'Status'),
            React.createElement('th', { style: styles.tableCell }, 'Priority'),
            React.createElement('th', { style: styles.tableCell }, 'Attorney'),
            React.createElement('th', { style: styles.tableCell }, 'Next Action')
          )
        ),
        React.createElement('tbody', null,
          ...(cases || []).map(caseItem =>
            React.createElement('tr', { key: caseItem.id, style: styles.tableRow },
              React.createElement('td', { style: styles.tableCell }, caseItem.caseNumber),
              React.createElement('td', { style: styles.tableCell }, 'Loading...'), // Will need client API to get client name
              React.createElement('td', { style: styles.tableCell }, caseItem.caseType?.replace(/_/g, ' ')),
              React.createElement('td', { style: styles.tableCell },
                React.createElement('span', { 
                  style: {
                    ...styles.statusBadge,
                    ...(caseItem.status === 'ACTIVE' ? styles.statusActive :
                        caseItem.status === 'PENDING' ? styles.statusSettlement : 
                        caseItem.status === 'CLOSED' ? styles.statusInvestigation : styles.statusActive)
                  }
                }, caseItem.status)
              ),
              React.createElement('td', { style: styles.tableCell },
                React.createElement('span', { 
                  style: {
                    ...styles.statusBadge,
                    ...(caseItem.priority === 'HIGH' || caseItem.priority === 'URGENT' ? { backgroundColor: '#fee2e2', color: '#dc2626' } :
                        caseItem.priority === 'MEDIUM' ? { backgroundColor: '#fef3c7', color: '#92400e' } :
                        { backgroundColor: '#f0f9ff', color: '#0369a1' })
                  }
                }, caseItem.priority)
              ),
              React.createElement('td', { style: styles.tableCell }, caseItem.user?.name || 'Unassigned'),
              React.createElement('td', { style: styles.tableCell }, caseItem.nextAction || 'Review case')
            )
          )
        )
      ) : React.createElement('div', { style: { textAlign: 'center', padding: '3rem', color: '#6b7280' } },
        React.createElement('div', { style: { fontSize: '3rem', marginBottom: '1rem' } }, '📋'),
        React.createElement('div', null, 'No cases found. Create your first case to get started.')
      )
    )
  );

  const renderDocuments = () => (
    React.createElement('div', null,
      React.createElement('h2', { style: styles.pageTitle }, 'Document Management'),
      React.createElement('div', { style: styles.uploadArea },
        React.createElement('div', { style: { fontSize: '3rem', marginBottom: '1rem' } }, '📁'),
        React.createElement('div', { style: styles.uploadText }, 'Drag and drop files here or click to browse'),
        React.createElement('button', { style: styles.uploadBtn, onClick: () => alert('File upload feature coming soon!') }, 'Choose Files')
      ),
      React.createElement('h3', { style: { fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' } }, 'Recent Documents'),
      ...(documents || []).map(doc =>
        React.createElement('div', { key: doc.id, style: styles.documentCard },
          React.createElement('div', { style: styles.documentHeader },
            React.createElement('div', { style: styles.documentName }, doc.name),
            React.createElement('div', null,
              React.createElement('button', { style: styles.actionBtn, onClick: () => alert('Download feature coming soon!') }, 'Download'),
              React.createElement('button', { style: { ...styles.actionBtn, backgroundColor: '#dc2626' }, onClick: () => alert('Delete feature coming soon!') }, 'Delete')
            )
          ),
          React.createElement('div', { style: styles.documentMeta },
            `${doc.type} • ${doc.size} • Uploaded ${doc.uploadDate}`
          )
        )
      )
    )
  );

  const renderSettlements = () => 
    React.createElement(SettlementManager, {
      settlements,
      cases,
      onSettlementCreate: handleSettlementCreate,
      onSettlementUpdate: handleSettlementUpdate,
      onSettlementDelete: handleSettlementDelete
    });

  const renderAIDocuments = () =>
    React.createElement(AIDocumentGenerator, {
      settlements,
      cases
    });

  const renderZoomMeetings = () =>
    React.createElement(ZoomMeetings, {
      cases,
      settlements
    });

  const renderWebRTCMeetings = () =>
    React.createElement(WebRTCMeetingList, {
      user
    });

  const renderPlaceholder = (title) => (
    React.createElement('div', null,
      React.createElement('h2', { style: styles.pageTitle }, title),
      React.createElement('div', { style: { textAlign: 'center', padding: '3rem', color: '#6b7280' } },
        React.createElement('div', { style: { fontSize: '3rem', marginBottom: '1rem' } }, '🚧'),
        React.createElement('div', null, 'This feature is coming soon!')
      )
    )
  );

  const renderContent = () => {
    if (loading) {
      return React.createElement('div', { style: styles.loading }, 'Loading dashboard...');
    }

    switch (activeSection) {
      case 'overview': return renderOverview();
      case 'cases': return renderCases();
      case 'documents': return renderDocuments();
      case 'settlements': return renderSettlements();
      case 'zoom-meetings': return renderZoomMeetings();
      case 'webrtc-meetings': return renderWebRTCMeetings();
      case 'ai-documents': return renderAIDocuments();
      case 'calendar': return renderPlaceholder('Calendar');
      case 'messages': return renderPlaceholder('Messages');
      default: return renderOverview();
    }
  };

  return React.createElement('div', { style: styles.container },
    // Header
    React.createElement('header', { style: styles.header },
      React.createElement('div', { style: styles.headerContent },
        React.createElement('div', { style: styles.logo }, '🏛️ Legal Estate'),
        React.createElement('div', { style: styles.userInfo },
          React.createElement('span', null, `Welcome, ${user?.name || 'User'}`),
          React.createElement('button', { 
            style: styles.logoutBtn,
            onClick: onLogout
          }, 'Logout')
        )
      )
    ),

    // Main Content
    React.createElement('div', { style: styles.main },
      // Sidebar
      React.createElement('aside', { style: styles.sidebar },
        React.createElement('h3', { style: { marginBottom: '1rem', fontSize: '1rem', fontWeight: '600' } }, 'Navigation'),
        ...sidebarItems.map(item =>
          React.createElement('div', {
            key: item.id,
            style: {
              ...styles.sidebarItem,
              ...(activeSection === item.id ? styles.sidebarItemActive : styles.sidebarItemInactive)
            },
            onClick: () => setActiveSection(item.id)
          },
            React.createElement('span', { style: { marginRight: '0.5rem' } }, item.icon),
            item.label
          )
        )
      ),

      // Content Area
      React.createElement('main', { style: styles.content },
        renderContent()
      )
    )
  );
}

export default Dashboard;