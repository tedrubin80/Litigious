import React, { useState, useEffect } from 'react';

const ZoomMeetingModal = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  meeting = null, 
  cases = [], 
  clients = [] 
}) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startTime: '',
    duration: 60,
    meetingType: 'client_consultation',
    securityLevel: 'standard',
    caseId: '',
    participants: [{ email: '', name: '' }],
    isRecurring: false,
    recurrencePattern: {
      type: 'weekly',
      interval: 1,
      daysOfWeek: [],
      endDate: ''
    }
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  // Meeting types for legal practice
  const meetingTypes = [
    { value: 'client_consultation', label: 'Client Consultation' },
    { value: 'team_meeting', label: 'Team Meeting' },
    { value: 'deposition', label: 'Deposition' },
    { value: 'court_hearing', label: 'Court Hearing' },
    { value: 'case_review', label: 'Case Review' },
    { value: 'discovery_meeting', label: 'Discovery Meeting' },
    { value: 'mediation', label: 'Mediation' },
    { value: 'arbitration', label: 'Arbitration' }
  ];

  const securityLevels = [
    { value: 'standard', label: 'Standard Security' },
    { value: 'high', label: 'High Security' },
    { value: 'confidential', label: 'Confidential' }
  ];

  // Pre-fill form when editing existing meeting
  useEffect(() => {
    if (meeting) {
      setFormData({
        title: meeting.title || '',
        description: meeting.description || '',
        startTime: meeting.startTime || '',
        duration: meeting.duration || 60,
        meetingType: meeting.meetingType || 'client_consultation',
        securityLevel: meeting.securityLevel || 'standard',
        caseId: meeting.caseId || '',
        participants: meeting.participants || [{ email: '', name: '' }],
        isRecurring: meeting.isRecurring || false,
        recurrencePattern: meeting.recurrencePattern || {
          type: 'weekly',
          interval: 1,
          daysOfWeek: [],
          endDate: ''
        }
      });
    } else {
      // Reset form for new meeting
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(10, 0, 0, 0);
      
      setFormData({
        title: '',
        description: '',
        startTime: tomorrow.toISOString().slice(0, 16),
        duration: 60,
        meetingType: 'client_consultation',
        securityLevel: 'standard',
        caseId: '',
        participants: [{ email: '', name: '' }],
        isRecurring: false,
        recurrencePattern: {
          type: 'weekly',
          interval: 1,
          daysOfWeek: [],
          endDate: ''
        }
      });
    }
  }, [meeting, isOpen]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name.startsWith('recurrence.')) {
      const field = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        recurrencePattern: {
          ...prev.recurrencePattern,
          [field]: type === 'checkbox' ? checked : value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }

    // Clear errors as user types
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const addParticipant = () => {
    setFormData(prev => ({
      ...prev,
      participants: [...prev.participants, { email: '', name: '' }]
    }));
  };

  const removeParticipant = (index) => {
    setFormData(prev => ({
      ...prev,
      participants: prev.participants.filter((_, i) => i !== index)
    }));
  };

  const updateParticipant = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      participants: prev.participants.map((participant, i) => 
        i === index ? { ...participant, [field]: value } : participant
      )
    }));
  };

  const handleDayOfWeekToggle = (dayIndex) => {
    setFormData(prev => ({
      ...prev,
      recurrencePattern: {
        ...prev.recurrencePattern,
        daysOfWeek: prev.recurrencePattern.daysOfWeek.includes(dayIndex)
          ? prev.recurrencePattern.daysOfWeek.filter(d => d !== dayIndex)
          : [...prev.recurrencePattern.daysOfWeek, dayIndex]
      }
    }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Meeting title is required';
    }

    if (!formData.startTime) {
      newErrors.startTime = 'Start time is required';
    } else {
      const startDate = new Date(formData.startTime);
      const now = new Date();
      if (startDate <= now) {
        newErrors.startTime = 'Start time must be in the future';
      }
    }

    if (!formData.duration || formData.duration < 15 || formData.duration > 480) {
      newErrors.duration = 'Duration must be between 15 and 480 minutes';
    }

    // Validate participants
    const validParticipants = formData.participants.filter(p => p.email.trim());
    if (validParticipants.length === 0) {
      newErrors.participants = 'At least one participant email is required';
    } else {
      validParticipants.forEach((participant, index) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(participant.email.trim())) {
          newErrors[`participant_${index}`] = 'Invalid email address';
        }
      });
    }

    // Validate recurring meeting settings
    if (formData.isRecurring) {
      if (!formData.recurrencePattern.endDate) {
        newErrors['recurrence.endDate'] = 'End date is required for recurring meetings';
      } else {
        const endDate = new Date(formData.recurrencePattern.endDate);
        const startDate = new Date(formData.startTime);
        if (endDate <= startDate) {
          newErrors['recurrence.endDate'] = 'End date must be after start date';
        }
      }

      if (formData.recurrencePattern.type === 'weekly' && formData.recurrencePattern.daysOfWeek.length === 0) {
        newErrors['recurrence.daysOfWeek'] = 'Select at least one day for weekly recurrence';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    
    try {
      // Clean up participants (remove empty ones)
      const cleanedParticipants = formData.participants.filter(p => p.email.trim());
      
      const meetingData = {
        ...formData,
        participants: cleanedParticipants,
        startTime: new Date(formData.startTime).toISOString()
      };

      // Remove recurring fields if not a recurring meeting
      if (!formData.isRecurring) {
        delete meetingData.recurrencePattern;
      }

      await onSubmit(meetingData);
      onClose();
    } catch (error) {
      setErrors({ general: error.message || 'Failed to create meeting' });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const styles = {
    overlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    },
    modal: {
      backgroundColor: 'white',
      borderRadius: '12px',
      padding: '2rem',
      maxWidth: '800px',
      width: '90%',
      maxHeight: '90vh',
      overflowY: 'auto',
      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
      position: 'relative'
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '2rem',
      paddingBottom: '1rem',
      borderBottom: '2px solid #e5e7eb'
    },
    title: {
      fontSize: '1.5rem',
      fontWeight: '600',
      color: '#111827',
      margin: 0
    },
    closeButton: {
      background: 'none',
      border: 'none',
      fontSize: '1.5rem',
      cursor: 'pointer',
      color: '#6b7280',
      padding: '0.5rem'
    },
    form: {
      display: 'grid',
      gap: '1.5rem'
    },
    formRow: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '1rem'
    },
    formGroup: {
      display: 'flex',
      flexDirection: 'column'
    },
    label: {
      fontSize: '0.875rem',
      fontWeight: '500',
      color: '#374151',
      marginBottom: '0.5rem'
    },
    input: {
      padding: '0.75rem',
      border: '1px solid #d1d5db',
      borderRadius: '6px',
      fontSize: '0.875rem',
      outline: 'none',
      transition: 'border-color 0.2s',
      ':focus': {
        borderColor: '#2563eb',
        boxShadow: '0 0 0 3px rgba(37, 99, 235, 0.1)'
      }
    },
    select: {
      padding: '0.75rem',
      border: '1px solid #d1d5db',
      borderRadius: '6px',
      fontSize: '0.875rem',
      backgroundColor: 'white',
      outline: 'none',
      transition: 'border-color 0.2s'
    },
    textarea: {
      padding: '0.75rem',
      border: '1px solid #d1d5db',
      borderRadius: '6px',
      fontSize: '0.875rem',
      outline: 'none',
      resize: 'vertical',
      minHeight: '80px'
    },
    checkbox: {
      marginRight: '0.5rem'
    },
    checkboxLabel: {
      display: 'flex',
      alignItems: 'center',
      fontSize: '0.875rem',
      color: '#374151',
      cursor: 'pointer'
    },
    participantRow: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr auto',
      gap: '0.5rem',
      alignItems: 'end'
    },
    addButton: {
      backgroundColor: '#f3f4f6',
      color: '#374151',
      border: '1px solid #d1d5db',
      borderRadius: '6px',
      padding: '0.5rem 1rem',
      fontSize: '0.875rem',
      cursor: 'pointer',
      transition: 'all 0.2s'
    },
    removeButton: {
      backgroundColor: '#fee2e2',
      color: '#dc2626',
      border: '1px solid #fecaca',
      borderRadius: '6px',
      padding: '0.5rem',
      fontSize: '0.875rem',
      cursor: 'pointer',
      minWidth: '36px',
      height: '36px'
    },
    dayButtons: {
      display: 'flex',
      gap: '0.5rem',
      flexWrap: 'wrap',
      marginTop: '0.5rem'
    },
    dayButton: {
      padding: '0.5rem 0.75rem',
      border: '1px solid #d1d5db',
      borderRadius: '6px',
      backgroundColor: 'white',
      fontSize: '0.75rem',
      cursor: 'pointer',
      transition: 'all 0.2s',
      minWidth: '40px'
    },
    dayButtonActive: {
      backgroundColor: '#2563eb',
      color: 'white',
      borderColor: '#2563eb'
    },
    error: {
      color: '#dc2626',
      fontSize: '0.75rem',
      marginTop: '0.25rem'
    },
    buttonGroup: {
      display: 'flex',
      justifyContent: 'flex-end',
      gap: '1rem',
      marginTop: '2rem',
      paddingTop: '1rem',
      borderTop: '1px solid #e5e7eb'
    },
    cancelButton: {
      backgroundColor: '#f9fafb',
      color: '#374151',
      border: '1px solid #d1d5db',
      borderRadius: '6px',
      padding: '0.75rem 1.5rem',
      fontSize: '0.875rem',
      fontWeight: '500',
      cursor: 'pointer',
      transition: 'all 0.2s'
    },
    submitButton: {
      backgroundColor: '#2563eb',
      color: 'white',
      border: 'none',
      borderRadius: '6px',
      padding: '0.75rem 1.5rem',
      fontSize: '0.875rem',
      fontWeight: '500',
      cursor: 'pointer',
      transition: 'all 0.2s',
      opacity: loading ? 0.6 : 1
    }
  };

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div style={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h2 style={styles.title}>
            🎥 {meeting ? 'Edit Zoom Meeting' : 'Schedule New Zoom Meeting'}
          </h2>
          <button
            style={styles.closeButton}
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          {errors.general && (
            <div style={{ ...styles.error, padding: '0.75rem', backgroundColor: '#fee2e2', borderRadius: '6px' }}>
              {errors.general}
            </div>
          )}

          {/* Basic Meeting Info */}
          <div style={styles.formGroup}>
            <label style={styles.label}>Meeting Title *</label>
            <input
              style={styles.input}
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              placeholder="e.g., Client Consultation - John Doe"
              required
            />
            {errors.title && <span style={styles.error}>{errors.title}</span>}
          </div>

          <div style={styles.formRow}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Start Date & Time *</label>
              <input
                style={styles.input}
                type="datetime-local"
                name="startTime"
                value={formData.startTime}
                onChange={handleInputChange}
                required
              />
              {errors.startTime && <span style={styles.error}>{errors.startTime}</span>}
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Duration (minutes) *</label>
              <input
                style={styles.input}
                type="number"
                name="duration"
                value={formData.duration}
                onChange={handleInputChange}
                min="15"
                max="480"
                required
              />
              {errors.duration && <span style={styles.error}>{errors.duration}</span>}
            </div>
          </div>

          <div style={styles.formRow}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Meeting Type</label>
              <select
                style={styles.select}
                name="meetingType"
                value={formData.meetingType}
                onChange={handleInputChange}
              >
                {meetingTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Security Level</label>
              <select
                style={styles.select}
                name="securityLevel"
                value={formData.securityLevel}
                onChange={handleInputChange}
              >
                {securityLevels.map(level => (
                  <option key={level.value} value={level.value}>
                    {level.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {cases.length > 0 && (
            <div style={styles.formGroup}>
              <label style={styles.label}>Associated Case (Optional)</label>
              <select
                style={styles.select}
                name="caseId"
                value={formData.caseId}
                onChange={handleInputChange}
              >
                <option value="">Select a case...</option>
                {cases.map(caseItem => (
                  <option key={caseItem.id} value={caseItem.id}>
                    {caseItem.caseNumber} - {caseItem.clientName}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div style={styles.formGroup}>
            <label style={styles.label}>Description</label>
            <textarea
              style={styles.textarea}
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Meeting agenda, topics to discuss..."
            />
          </div>

          {/* Participants */}
          <div style={styles.formGroup}>
            <label style={styles.label}>Participants *</label>
            {formData.participants.map((participant, index) => (
              <div key={index} style={styles.participantRow}>
                <input
                  style={styles.input}
                  type="email"
                  placeholder="participant@email.com"
                  value={participant.email}
                  onChange={(e) => updateParticipant(index, 'email', e.target.value)}
                />
                <input
                  style={styles.input}
                  type="text"
                  placeholder="Full Name"
                  value={participant.name}
                  onChange={(e) => updateParticipant(index, 'name', e.target.value)}
                />
                {formData.participants.length > 1 && (
                  <button
                    type="button"
                    style={styles.removeButton}
                    onClick={() => removeParticipant(index)}
                  >
                    ×
                  </button>
                )}
                {errors[`participant_${index}`] && (
                  <span style={styles.error}>{errors[`participant_${index}`]}</span>
                )}
              </div>
            ))}
            
            <button
              type="button"
              style={styles.addButton}
              onClick={addParticipant}
            >
              + Add Participant
            </button>
            {errors.participants && <span style={styles.error}>{errors.participants}</span>}
          </div>

          {/* Recurring Meeting Options */}
          <div style={styles.formGroup}>
            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                style={styles.checkbox}
                name="isRecurring"
                checked={formData.isRecurring}
                onChange={handleInputChange}
              />
              Make this a recurring meeting
            </label>
          </div>

          {formData.isRecurring && (
            <>
              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Recurrence Type</label>
                  <select
                    style={styles.select}
                    name="recurrence.type"
                    value={formData.recurrencePattern.type}
                    onChange={handleInputChange}
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>End Date *</label>
                  <input
                    style={styles.input}
                    type="date"
                    name="recurrence.endDate"
                    value={formData.recurrencePattern.endDate}
                    onChange={handleInputChange}
                    required={formData.isRecurring}
                  />
                  {errors['recurrence.endDate'] && (
                    <span style={styles.error}>{errors['recurrence.endDate']}</span>
                  )}
                </div>
              </div>

              {formData.recurrencePattern.type === 'weekly' && (
                <div style={styles.formGroup}>
                  <label style={styles.label}>Days of Week</label>
                  <div style={styles.dayButtons}>
                    {dayNames.map((day, index) => (
                      <button
                        key={index}
                        type="button"
                        style={{
                          ...styles.dayButton,
                          ...(formData.recurrencePattern.daysOfWeek.includes(index) 
                            ? styles.dayButtonActive 
                            : {})
                        }}
                        onClick={() => handleDayOfWeekToggle(index)}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                  {errors['recurrence.daysOfWeek'] && (
                    <span style={styles.error}>{errors['recurrence.daysOfWeek']}</span>
                  )}
                </div>
              )}
            </>
          )}

          {/* Submit Buttons */}
          <div style={styles.buttonGroup}>
            <button
              type="button"
              style={styles.cancelButton}
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={styles.submitButton}
              disabled={loading}
            >
              {loading ? 'Creating...' : meeting ? 'Update Meeting' : 'Schedule Meeting'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ZoomMeetingModal;