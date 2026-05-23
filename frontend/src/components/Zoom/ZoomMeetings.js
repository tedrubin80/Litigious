import React, { useState, useEffect } from 'react';
import ZoomMeetingModal from './ZoomMeetingModal';

const ZoomMeetings = () => {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState(null);
  const [filter, setFilter] = useState('all');
  const [cases, setCases] = useState([]);
  const [clients, setClients] = useState([]);

  useEffect(() => {
    fetchMeetings();
    fetchCases();
    fetchClients();
  }, []);

  const fetchMeetings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/zoom/meetings', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch meetings');
      }

      const data = await response.json();
      setMeetings(data.meetings || []);
    } catch (error) {
      console.error('Error fetching meetings:', error);
      setError('Failed to load meetings');
      // Mock data for demo purposes if API fails
      setMeetings([
        {
          id: '1',
          title: 'Client Consultation - John Doe',
          startTime: new Date(Date.now() + 86400000).toISOString(),
          duration: 60,
          meetingType: 'client_consultation',
          status: 'scheduled',
          joinUrl: 'https://zoom.us/j/123456789',
          participants: [
            { email: 'john.doe@email.com', name: 'John Doe' },
            { email: 'attorney@firm.com', name: 'Sarah Attorney' }
          ]
        },
        {
          id: '2',
          title: 'Team Case Review - Smith vs. Jones',
          startTime: new Date(Date.now() + 172800000).toISOString(),
          duration: 90,
          meetingType: 'case_review',
          status: 'scheduled',
          joinUrl: 'https://zoom.us/j/987654321',
          participants: [
            { email: 'paralegal@firm.com', name: 'Mike Paralegal' },
            { email: 'attorney@firm.com', name: 'Sarah Attorney' }
          ]
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCases = async () => {
    try {
      const response = await fetch('/api/cases', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setCases(data.cases || []);
      }
    } catch (error) {
      console.error('Error fetching cases:', error);
    }
  };

  const fetchClients = async () => {
    try {
      const response = await fetch('/api/clients', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setClients(data.clients || []);
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const handleCreateMeeting = async (meetingData) => {
    try {
      const endpoint = meetingData.isRecurring ? '/api/zoom/meetings/recurring' : '/api/zoom/meetings';
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(meetingData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create meeting');
      }

      const newMeeting = await response.json();
      
      if (meetingData.isRecurring) {
        // For recurring meetings, add all instances
        setMeetings(prev => [...prev, ...newMeeting.meetings]);
      } else {
        setMeetings(prev => [newMeeting, ...prev]);
      }
      
      // For demo purposes, add mock meeting if API fails
      const mockMeeting = {
        id: Date.now().toString(),
        ...meetingData,
        status: 'scheduled',
        joinUrl: `https://zoom.us/j/${Math.random().toString().slice(2, 12)}`,
        meetingNumber: Math.random().toString().slice(2, 12),
        hostKey: Math.random().toString().slice(2, 8)
      };
      
      setMeetings(prev => [mockMeeting, ...prev]);
      
    } catch (error) {
      console.error('Error creating meeting:', error);
      throw error;
    }
  };

  const handleUpdateMeeting = async (meetingData) => {
    try {
      const response = await fetch(`/api/zoom/meetings/${editingMeeting.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(meetingData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update meeting');
      }

      const updatedMeeting = await response.json();
      setMeetings(prev => prev.map(meeting => 
        meeting.id === editingMeeting.id ? updatedMeeting : meeting
      ));
      
    } catch (error) {
      console.error('Error updating meeting:', error);
      throw error;
    }
  };

  const handleDeleteMeeting = async (meetingId) => {
    if (!window.confirm('Are you sure you want to cancel this meeting?')) {
      return;
    }

    try {
      const response = await fetch(`/api/zoom/meetings/${meetingId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to cancel meeting');
      }

      setMeetings(prev => prev.filter(meeting => meeting.id !== meetingId));
    } catch (error) {
      console.error('Error deleting meeting:', error);
      alert('Failed to cancel meeting. Please try again.');
    }
  };

  const openEditModal = (meeting) => {
    setEditingMeeting(meeting);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingMeeting(null);
  };

  const handleModalSubmit = async (meetingData) => {
    if (editingMeeting) {
      await handleUpdateMeeting(meetingData);
    } else {
      await handleCreateMeeting(meetingData);
    }
  };

  const joinMeeting = (meeting) => {
    if (meeting.joinUrl) {
      window.open(meeting.joinUrl, '_blank');
    } else {
      alert('Meeting join URL not available');
    }
  };

  const copyMeetingLink = (meeting) => {
    if (meeting.joinUrl) {
      navigator.clipboard.writeText(meeting.joinUrl).then(() => {
        alert('Meeting link copied to clipboard!');
      }).catch(() => {
        prompt('Copy this meeting link:', meeting.joinUrl);
      });
    }
  };

  const filteredMeetings = meetings.filter(meeting => {
    if (filter === 'all') return true;
    if (filter === 'upcoming') {
      return new Date(meeting.startTime) > new Date();
    }
    if (filter === 'past') {
      return new Date(meeting.startTime) < new Date();
    }
    return meeting.status === filter;
  });

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (minutes) => {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins === 0 ? `${hours}h` : `${hours}h ${mins}m`;
  };

  const getMeetingTypeIcon = (type) => {
    const icons = {
      client_consultation: '👥',
      team_meeting: '🏢',
      deposition: '⚖️',
      court_hearing: '🏛️',
      case_review: '📋',
      discovery_meeting: '🔍',
      mediation: '🤝',
      arbitration: '⚡'
    };
    return icons[type] || '📹';
  };

  const getStatusColor = (meeting) => {
    const now = new Date();
    const startTime = new Date(meeting.startTime);
    const endTime = new Date(startTime.getTime() + meeting.duration * 60000);
    
    if (now < startTime) return '#10b981'; // Green - upcoming
    if (now >= startTime && now <= endTime) return '#f59e0b'; // Yellow - in progress
    return '#6b7280'; // Gray - ended
  };

  const getStatusText = (meeting) => {
    const now = new Date();
    const startTime = new Date(meeting.startTime);
    const endTime = new Date(startTime.getTime() + meeting.duration * 60000);
    
    if (now < startTime) return 'Scheduled';
    if (now >= startTime && now <= endTime) return 'In Progress';
    return 'Ended';
  };

  const styles = {
    container: {
      padding: '2rem',
      maxWidth: '1200px',
      margin: '0 auto'
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '2rem'
    },
    title: {
      fontSize: '1.875rem',
      fontWeight: 'bold',
      color: '#111827',
      margin: 0
    },
    createButton: {
      backgroundColor: '#2563eb',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      padding: '0.75rem 1.5rem',
      fontSize: '0.875rem',
      fontWeight: '500',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      transition: 'all 0.2s'
    },
    filters: {
      display: 'flex',
      gap: '0.5rem',
      marginBottom: '1.5rem',
      flexWrap: 'wrap'
    },
    filterButton: {
      padding: '0.5rem 1rem',
      border: '1px solid #d1d5db',
      borderRadius: '6px',
      backgroundColor: 'white',
      fontSize: '0.875rem',
      cursor: 'pointer',
      transition: 'all 0.2s'
    },
    filterButtonActive: {
      backgroundColor: '#2563eb',
      color: 'white',
      borderColor: '#2563eb'
    },
    meetingsList: {
      display: 'grid',
      gap: '1rem'
    },
    meetingCard: {
      backgroundColor: 'white',
      border: '1px solid #e5e7eb',
      borderRadius: '12px',
      padding: '1.5rem',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
      transition: 'all 0.2s'
    },
    meetingHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: '1rem'
    },
    meetingTitle: {
      fontSize: '1.125rem',
      fontWeight: '600',
      color: '#111827',
      margin: 0,
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem'
    },
    statusBadge: {
      padding: '0.25rem 0.75rem',
      borderRadius: '9999px',
      fontSize: '0.75rem',
      fontWeight: '500',
      color: 'white'
    },
    meetingInfo: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '1rem',
      marginBottom: '1rem'
    },
    infoItem: {
      display: 'flex',
      flexDirection: 'column'
    },
    infoLabel: {
      fontSize: '0.75rem',
      fontWeight: '500',
      color: '#6b7280',
      textTransform: 'uppercase',
      letterSpacing: '0.05em'
    },
    infoValue: {
      fontSize: '0.875rem',
      color: '#111827',
      marginTop: '0.25rem'
    },
    participants: {
      marginBottom: '1rem'
    },
    participantsList: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '0.5rem',
      marginTop: '0.5rem'
    },
    participantChip: {
      backgroundColor: '#f3f4f6',
      color: '#374151',
      padding: '0.25rem 0.75rem',
      borderRadius: '9999px',
      fontSize: '0.75rem'
    },
    actions: {
      display: 'flex',
      gap: '0.5rem',
      flexWrap: 'wrap'
    },
    actionButton: {
      padding: '0.5rem 1rem',
      borderRadius: '6px',
      fontSize: '0.75rem',
      fontWeight: '500',
      cursor: 'pointer',
      transition: 'all 0.2s',
      border: 'none'
    },
    joinButton: {
      backgroundColor: '#10b981',
      color: 'white'
    },
    editButton: {
      backgroundColor: '#f59e0b',
      color: 'white'
    },
    copyButton: {
      backgroundColor: '#6b7280',
      color: 'white'
    },
    deleteButton: {
      backgroundColor: '#dc2626',
      color: 'white'
    },
    emptyState: {
      textAlign: 'center',
      padding: '3rem',
      color: '#6b7280'
    },
    loading: {
      textAlign: 'center',
      padding: '3rem',
      color: '#6b7280'
    },
    error: {
      backgroundColor: '#fee2e2',
      color: '#dc2626',
      padding: '1rem',
      borderRadius: '6px',
      marginBottom: '1rem'
    }
  };

  const filterOptions = [
    { value: 'all', label: 'All Meetings' },
    { value: 'upcoming', label: 'Upcoming' },
    { value: 'past', label: 'Past' },
    { value: 'scheduled', label: 'Scheduled' }
  ];

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎥</div>
          <div>Loading your Zoom meetings...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>🎥 Zoom Meetings</h1>
        <button
          style={styles.createButton}
          onClick={() => setIsModalOpen(true)}
        >
          <span>+</span>
          Schedule Meeting
        </button>
      </div>

      {error && (
        <div style={styles.error}>
          {error}
        </div>
      )}

      <div style={styles.filters}>
        {filterOptions.map(option => (
          <button
            key={option.value}
            style={{
              ...styles.filterButton,
              ...(filter === option.value ? styles.filterButtonActive : {})
            }}
            onClick={() => setFilter(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div style={styles.meetingsList}>
        {filteredMeetings.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📅</div>
            <div>No meetings found. Schedule your first Zoom meeting!</div>
          </div>
        ) : (
          filteredMeetings.map(meeting => (
            <div key={meeting.id} style={styles.meetingCard}>
              <div style={styles.meetingHeader}>
                <h3 style={styles.meetingTitle}>
                  {getMeetingTypeIcon(meeting.meetingType)}
                  {meeting.title}
                </h3>
                <span 
                  style={{
                    ...styles.statusBadge,
                    backgroundColor: getStatusColor(meeting)
                  }}
                >
                  {getStatusText(meeting)}
                </span>
              </div>

              <div style={styles.meetingInfo}>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>Date & Time</span>
                  <span style={styles.infoValue}>{formatDate(meeting.startTime)}</span>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>Duration</span>
                  <span style={styles.infoValue}>{formatDuration(meeting.duration)}</span>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>Type</span>
                  <span style={styles.infoValue}>
                    {meeting.meetingType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </span>
                </div>
                {meeting.securityLevel && (
                  <div style={styles.infoItem}>
                    <span style={styles.infoLabel}>Security</span>
                    <span style={styles.infoValue}>
                      {meeting.securityLevel.replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                  </div>
                )}
              </div>

              {meeting.participants && meeting.participants.length > 0 && (
                <div style={styles.participants}>
                  <span style={styles.infoLabel}>Participants</span>
                  <div style={styles.participantsList}>
                    {meeting.participants.map((participant, index) => (
                      <span key={index} style={styles.participantChip}>
                        {participant.name || participant.email}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div style={styles.actions}>
                <button
                  style={{ ...styles.actionButton, ...styles.joinButton }}
                  onClick={() => joinMeeting(meeting)}
                >
                  Join Meeting
                </button>
                <button
                  style={{ ...styles.actionButton, ...styles.copyButton }}
                  onClick={() => copyMeetingLink(meeting)}
                >
                  Copy Link
                </button>
                <button
                  style={{ ...styles.actionButton, ...styles.editButton }}
                  onClick={() => openEditModal(meeting)}
                >
                  Edit
                </button>
                <button
                  style={{ ...styles.actionButton, ...styles.deleteButton }}
                  onClick={() => handleDeleteMeeting(meeting.id)}
                >
                  Cancel
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {isModalOpen && (
        <ZoomMeetingModal
          isOpen={isModalOpen}
          onClose={closeModal}
          onSubmit={handleModalSubmit}
          meeting={editingMeeting}
          cases={cases}
          clients={clients}
        />
      )}
    </div>
  );
};

export default ZoomMeetings;