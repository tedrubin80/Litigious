import React, { useState } from 'react';

const SettlementManager = ({ settlements, cases, onSettlementCreate, onSettlementUpdate, onSettlementDelete }) => {
  const [showForm, setShowForm] = useState(false);
  const [editingSettlement, setEditingSettlement] = useState(null);
  const [formData, setFormData] = useState({
    caseId: '',
    type: 'DEMAND',
    amount: '',
    status: 'NEGOTIATING',
    description: '',
    attorneyFees: '',
    costs: '',
    netToClient: '',
    date: ''
  });

  const styles = {
    container: { minHeight: '100vh', backgroundColor: '#f8fafc' },
    pageTitle: { fontSize: '1.875rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '1.5rem' },
    primaryBtn: { backgroundColor: '#2563eb', color: 'white', padding: '0.75rem 1.5rem', borderRadius: '0.375rem', border: 'none', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '500' },
    secondaryBtn: { backgroundColor: '#6b7280', color: 'white', padding: '0.75rem 1.5rem', borderRadius: '0.375rem', border: 'none', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '500', marginLeft: '0.5rem' },
    formContainer: { backgroundColor: 'white', borderRadius: '0.5rem', padding: '2rem', marginBottom: '2rem', boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)' },
    formGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '1rem' },
    formGroup: { marginBottom: '1rem' },
    formLabel: { display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem', color: '#374151' },
    formInput: { width: '100%', padding: '0.75rem', borderRadius: '0.375rem', border: '1px solid #d1d5db', fontSize: '0.875rem', backgroundColor: 'white' },
    formSelect: { width: '100%', padding: '0.75rem', borderRadius: '0.375rem', border: '1px solid #d1d5db', fontSize: '0.875rem', backgroundColor: 'white' },
    formTextarea: { width: '100%', padding: '0.75rem', borderRadius: '0.375rem', border: '1px solid #d1d5db', fontSize: '0.875rem', backgroundColor: 'white', minHeight: '100px', resize: 'vertical' },
    buttonGroup: { display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' },
    table: { width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', borderRadius: '0.5rem', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)' },
    tableHeader: { backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' },
    tableRow: { borderBottom: '1px solid #e2e8f0' },
    tableCell: { padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem' },
    statusBadge: { padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: '500' },
    statusNegotiating: { backgroundColor: '#fef3c7', color: '#92400e' },
    statusAccepted: { backgroundColor: '#dcfce7', color: '#166534' },
    statusCompleted: { backgroundColor: '#dbeafe', color: '#1d4ed8' },
    statusRejected: { backgroundColor: '#fee2e2', color: '#dc2626' },
    actionBtn: { backgroundColor: '#10b981', color: 'white', padding: '0.5rem 1rem', borderRadius: '0.375rem', border: 'none', cursor: 'pointer', fontSize: '0.75rem', marginRight: '0.5rem' },
    deleteBtn: { backgroundColor: '#dc2626', color: 'white', padding: '0.5rem 1rem', borderRadius: '0.375rem', border: 'none', cursor: 'pointer', fontSize: '0.75rem' }
  };

  const settlementTypes = [
    { value: 'DEMAND', label: 'Demand Letter' },
    { value: 'OFFER', label: 'Settlement Offer' },
    { value: 'COUNTER_OFFER', label: 'Counter Offer' },
    { value: 'FINAL_SETTLEMENT', label: 'Final Settlement' },
    { value: 'MEDIATION', label: 'Mediation' },
    { value: 'ARBITRATION', label: 'Arbitration' }
  ];

  const settlementStatuses = [
    { value: 'NEGOTIATING', label: 'Negotiating' },
    { value: 'ACCEPTED', label: 'Accepted' },
    { value: 'REJECTED', label: 'Rejected' },
    { value: 'PENDING', label: 'Pending' },
    { value: 'COMPLETED', label: 'Completed' },
    { value: 'CANCELLED', label: 'Cancelled' }
  ];

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Auto-calculate net to client when amounts change
    if (['amount', 'attorneyFees', 'costs'].includes(field)) {
      const amount = field === 'amount' ? parseFloat(value) || 0 : parseFloat(formData.amount) || 0;
      const fees = field === 'attorneyFees' ? parseFloat(value) || 0 : parseFloat(formData.attorneyFees) || 0;
      const costs = field === 'costs' ? parseFloat(value) || 0 : parseFloat(formData.costs) || 0;
      
      setFormData(prev => ({
        ...prev,
        [field]: value,
        netToClient: (amount - fees - costs).toFixed(2)
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.caseId || !formData.amount || !formData.type) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      if (editingSettlement) {
        await onSettlementUpdate(editingSettlement.id, formData);
      } else {
        await onSettlementCreate(formData);
      }
      
      resetForm();
    } catch (error) {
      console.error('Error saving settlement:', error);
      alert('Error saving settlement. Please try again.');
    }
  };

  const resetForm = () => {
    setFormData({
      caseId: '',
      type: 'DEMAND',
      amount: '',
      status: 'NEGOTIATING',
      description: '',
      attorneyFees: '',
      costs: '',
      netToClient: '',
      date: ''
    });
    setShowForm(false);
    setEditingSettlement(null);
  };

  const handleEdit = (settlement) => {
    setFormData({
      caseId: settlement.case.id,
      type: settlement.type,
      amount: settlement.amount.toString(),
      status: settlement.status,
      description: settlement.description || '',
      attorneyFees: settlement.attorneyFees.toString(),
      costs: settlement.costs.toString(),
      netToClient: settlement.netToClient.toString(),
      date: settlement.date ? new Date(settlement.date).toISOString().split('T')[0] : ''
    });
    setEditingSettlement(settlement);
    setShowForm(true);
  };

  const getStatusBadgeStyle = (status) => {
    const baseStyle = styles.statusBadge;
    switch (status) {
      case 'ACCEPTED': return { ...baseStyle, ...styles.statusAccepted };
      case 'COMPLETED': return { ...baseStyle, ...styles.statusCompleted };
      case 'REJECTED': return { ...baseStyle, ...styles.statusRejected };
      default: return { ...baseStyle, ...styles.statusNegotiating };
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return React.createElement('div', null,
    React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' } },
      React.createElement('h2', { style: styles.pageTitle }, 'Settlement Management'),
      React.createElement('button', {
        style: styles.primaryBtn,
        onClick: () => setShowForm(true)
      }, '+ New Settlement')
    ),

    // Settlement Form
    showForm && React.createElement('div', { style: styles.formContainer },
      React.createElement('h3', { style: { fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' } },
        editingSettlement ? 'Edit Settlement' : 'Create New Settlement'
      ),
      
      React.createElement('form', { onSubmit: handleSubmit },
        React.createElement('div', { style: styles.formGrid },
          // Case Selection
          React.createElement('div', { style: styles.formGroup },
            React.createElement('label', { style: styles.formLabel }, 'Case *'),
            React.createElement('select', {
              style: styles.formSelect,
              value: formData.caseId,
              onChange: (e) => handleInputChange('caseId', e.target.value),
              required: true
            },
              React.createElement('option', { value: '' }, 'Select a case...'),
              ...cases.map(caseItem =>
                React.createElement('option', { key: caseItem.id, value: caseItem.id },
                  `${caseItem.clientName} - ${caseItem.caseType}`
                )
              )
            )
          ),

          // Settlement Type
          React.createElement('div', { style: styles.formGroup },
            React.createElement('label', { style: styles.formLabel }, 'Settlement Type *'),
            React.createElement('select', {
              style: styles.formSelect,
              value: formData.type,
              onChange: (e) => handleInputChange('type', e.target.value),
              required: true
            },
              ...settlementTypes.map(type =>
                React.createElement('option', { key: type.value, value: type.value }, type.label)
              )
            )
          ),

          // Amount
          React.createElement('div', { style: styles.formGroup },
            React.createElement('label', { style: styles.formLabel }, 'Settlement Amount *'),
            React.createElement('input', {
              style: styles.formInput,
              type: 'number',
              step: '0.01',
              value: formData.amount,
              onChange: (e) => handleInputChange('amount', e.target.value),
              placeholder: '0.00',
              required: true
            })
          ),

          // Status
          React.createElement('div', { style: styles.formGroup },
            React.createElement('label', { style: styles.formLabel }, 'Status'),
            React.createElement('select', {
              style: styles.formSelect,
              value: formData.status,
              onChange: (e) => handleInputChange('status', e.target.value)
            },
              ...settlementStatuses.map(status =>
                React.createElement('option', { key: status.value, value: status.value }, status.label)
              )
            )
          ),

          // Attorney Fees
          React.createElement('div', { style: styles.formGroup },
            React.createElement('label', { style: styles.formLabel }, 'Attorney Fees'),
            React.createElement('input', {
              style: styles.formInput,
              type: 'number',
              step: '0.01',
              value: formData.attorneyFees,
              onChange: (e) => handleInputChange('attorneyFees', e.target.value),
              placeholder: '0.00'
            })
          ),

          // Costs
          React.createElement('div', { style: styles.formGroup },
            React.createElement('label', { style: styles.formLabel }, 'Case Costs'),
            React.createElement('input', {
              style: styles.formInput,
              type: 'number',
              step: '0.01',
              value: formData.costs,
              onChange: (e) => handleInputChange('costs', e.target.value),
              placeholder: '0.00'
            })
          ),

          // Net to Client (auto-calculated, read-only)
          React.createElement('div', { style: styles.formGroup },
            React.createElement('label', { style: styles.formLabel }, 'Net to Client'),
            React.createElement('input', {
              style: { ...styles.formInput, backgroundColor: '#f3f4f6', cursor: 'not-allowed' },
              type: 'text',
              value: formData.netToClient ? formatCurrency(formData.netToClient) : '$0.00',
              readOnly: true
            })
          ),

          // Settlement Date
          React.createElement('div', { style: styles.formGroup },
            React.createElement('label', { style: styles.formLabel }, 'Settlement Date'),
            React.createElement('input', {
              style: styles.formInput,
              type: 'date',
              value: formData.date,
              onChange: (e) => handleInputChange('date', e.target.value)
            })
          )
        ),

        // Description
        React.createElement('div', { style: styles.formGroup },
          React.createElement('label', { style: styles.formLabel }, 'Description'),
          React.createElement('textarea', {
            style: styles.formTextarea,
            value: formData.description,
            onChange: (e) => handleInputChange('description', e.target.value),
            placeholder: 'Settlement details, terms, notes...'
          })
        ),

        React.createElement('div', { style: styles.buttonGroup },
          React.createElement('button', {
            type: 'button',
            style: styles.secondaryBtn,
            onClick: resetForm
          }, 'Cancel'),
          React.createElement('button', {
            type: 'submit',
            style: styles.primaryBtn
          }, editingSettlement ? 'Update Settlement' : 'Create Settlement')
        )
      )
    ),

    // Settlements Table
    settlements.length > 0 && React.createElement('div', { style: { backgroundColor: 'white', borderRadius: '0.5rem', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)' } },
      React.createElement('table', { style: styles.table },
        React.createElement('thead', { style: styles.tableHeader },
          React.createElement('tr', null,
            React.createElement('th', { style: styles.tableCell }, 'Client'),
            React.createElement('th', { style: styles.tableCell }, 'Type'),
            React.createElement('th', { style: styles.tableCell }, 'Amount'),
            React.createElement('th', { style: styles.tableCell }, 'Status'),
            React.createElement('th', { style: styles.tableCell }, 'Net to Client'),
            React.createElement('th', { style: styles.tableCell }, 'Date'),
            React.createElement('th', { style: styles.tableCell }, 'Actions')
          )
        ),
        React.createElement('tbody', null,
          ...settlements.map(settlement =>
            React.createElement('tr', { key: settlement.id, style: styles.tableRow },
              React.createElement('td', { style: styles.tableCell }, settlement.case.clientName),
              React.createElement('td', { style: styles.tableCell }, 
                settlementTypes.find(t => t.value === settlement.type)?.label || settlement.type
              ),
              React.createElement('td', { style: styles.tableCell }, formatCurrency(settlement.amount)),
              React.createElement('td', { style: styles.tableCell },
                React.createElement('span', { style: getStatusBadgeStyle(settlement.status) },
                  settlementStatuses.find(s => s.value === settlement.status)?.label || settlement.status
                )
              ),
              React.createElement('td', { style: styles.tableCell }, formatCurrency(settlement.netToClient)),
              React.createElement('td', { style: styles.tableCell }, 
                settlement.date ? new Date(settlement.date).toLocaleDateString() : '-'
              ),
              React.createElement('td', { style: styles.tableCell },
                React.createElement('button', {
                  style: styles.actionBtn,
                  onClick: () => handleEdit(settlement)
                }, 'Edit'),
                React.createElement('button', {
                  style: styles.deleteBtn,
                  onClick: () => {
                    if (confirm('Are you sure you want to delete this settlement?')) {
                      onSettlementDelete(settlement.id);
                    }
                  }
                }, 'Delete')
              )
            )
          )
        )
      )
    ),

    // Empty state
    settlements.length === 0 && !showForm && React.createElement('div', { 
      style: { 
        textAlign: 'center', 
        padding: '3rem', 
        backgroundColor: 'white', 
        borderRadius: '0.5rem',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
      } 
    },
      React.createElement('div', { style: { fontSize: '3rem', marginBottom: '1rem' } }, '💰'),
      React.createElement('h3', { style: { fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' } }, 'No Settlements Yet'),
      React.createElement('p', { style: { color: '#6b7280', marginBottom: '1rem' } }, 'Create your first settlement to get started with settlement tracking.'),
      React.createElement('button', {
        style: styles.primaryBtn,
        onClick: () => setShowForm(true)
      }, 'Create First Settlement')
    )
  );
};

export default SettlementManager;