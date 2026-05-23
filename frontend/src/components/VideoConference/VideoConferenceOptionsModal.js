import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import ZoomMeetingModal from '../Zoom/ZoomMeetingModal';
import VideoConferenceRoom from './VideoConferenceRoom';
import { meetingsAPI } from '../../services/api';

const VideoConferenceOptionsModal = ({ 
  isOpen, 
  onClose, 
  meetingId = null,
  caseId = null,
  clientId = null 
}) => {
  const { user } = useAuth();
  const [selectedOption, setSelectedOption] = useState(null);
  const [showZoomModal, setShowZoomModal] = useState(false);
  const [showWebRTCRoom, setShowWebRTCRoom] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cases, setCases] = useState([]);
  const [clients, setClients] = useState([]);
  const [meetingData, setMeetingData] = useState(null);

  useEffect(() => {
    if (isOpen) {
      fetchCasesAndClients();
      if (meetingId) {
        fetchMeetingData();
      }
    }
  }, [isOpen, meetingId]);

  const fetchCasesAndClients = async () => {
    try {
      const [casesResponse, clientsResponse] = await Promise.all([
        meetingsAPI.getCases(),
        meetingsAPI.getClients()
      ]);
      setCases(casesResponse.data.cases || []);
      setClients(clientsResponse.data.clients || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const fetchMeetingData = async () => {
    try {
      const response = await meetingsAPI.get(meetingId);
      setMeetingData(response.data);
    } catch (error) {
      console.error('Error fetching meeting data:', error);
    }
  };

  const handleWebRTCStart = () => {
    setShowWebRTCRoom(true);
    setSelectedOption('webrtc');
  };

  const handleZoomStart = () => {
    setShowZoomModal(true);
    setSelectedOption('zoom');
  };

  const handleZoomMeetingCreated = (meeting) => {
    setShowZoomModal(false);
    // Optionally redirect to Zoom meeting or show success message
    window.open(meeting.joinUrl, '_blank');
    onClose();
  };

  const handleWebRTCClose = () => {
    setShowWebRTCRoom(false);
    setSelectedOption(null);
  };

  const handleZoomModalClose = () => {
    setShowZoomModal(false);
    setSelectedOption(null);
  };

  if (!isOpen) return null;

  // If WebRTC room is active, show it
  if (showWebRTCRoom) {
    return (
      <VideoConferenceRoom 
        meetingId={meetingId || `meeting_${Date.now()}`}
        onClose={handleWebRTCClose}
        caseId={caseId}
        clientId={clientId}
      />
    );
  }

  // If Zoom modal is active, show it
  if (showZoomModal) {
    return (
      <ZoomMeetingModal
        isOpen={showZoomModal}
        onClose={handleZoomModalClose}
        onSubmit={handleZoomMeetingCreated}
        meeting={meetingData}
        cases={cases}
        clients={clients}
      />
    );
  }

  const styles = {
    overlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem'
    },
    modal: {
      backgroundColor: 'white',
      borderRadius: '16px',
      padding: '2rem',
      maxWidth: '600px',
      width: '100%',
      maxHeight: '90vh',
      overflowY: 'auto',
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
      position: 'relative'
    },
    header: {
      textAlign: 'center',
      marginBottom: '2rem'
    },
    title: {
      fontSize: '1.875rem',
      fontWeight: '700',
      color: '#111827',
      marginBottom: '0.5rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '0.5rem'
    },
    subtitle: {
      fontSize: '1rem',
      color: '#6b7280',
      lineHeight: '1.5'
    },
    closeButton: {
      position: 'absolute',
      top: '1rem',
      right: '1rem',
      background: 'none',
      border: 'none',
      fontSize: '1.5rem',
      cursor: 'pointer',
      color: '#6b7280',
      padding: '0.5rem',
      borderRadius: '50%',
      transition: 'all 0.2s',
      ':hover': {
        backgroundColor: '#f3f4f6'
      }
    },
    optionsContainer: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '1.5rem',
      marginBottom: '2rem'
    },
    optionCard: {
      border: '2px solid #e5e7eb',
      borderRadius: '12px',
      padding: '2rem 1.5rem',
      textAlign: 'center',
      cursor: 'pointer',
      transition: 'all 0.3s',
      backgroundColor: 'white',
      position: 'relative',
      ':hover': {
        borderColor: '#3b82f6',
        boxShadow: '0 4px 12px rgba(59, 130, 246, 0.15)',
        transform: 'translateY(-2px)'
      }
    },
    optionIcon: {
      fontSize: '3rem',
      marginBottom: '1rem',
      display: 'block'
    },
    optionTitle: {
      fontSize: '1.25rem',
      fontWeight: '600',
      color: '#111827',
      marginBottom: '0.5rem'
    },
    optionDescription: {
      fontSize: '0.875rem',
      color: '#6b7280',
      lineHeight: '1.4',
      marginBottom: '1rem'
    },
    optionFeatures: {
      listStyle: 'none',
      padding: 0,
      margin: 0,
      fontSize: '0.75rem',
      color: '#374151'
    },
    featureItem: {
      display: 'flex',
      alignItems: 'center',
      marginBottom: '0.25rem'
    },
    featureIcon: {
      color: '#10b981',
      marginRight: '0.5rem',
      fontSize: '0.875rem'
    },
    badge: {
      position: 'absolute',
      top: '-0.5rem',
      right: '-0.5rem',
      backgroundColor: '#3b82f6',
      color: 'white',
      fontSize: '0.75rem',
      padding: '0.25rem 0.75rem',
      borderRadius: '9999px',
      fontWeight: '500'
    },
    recommendedBadge: {
      backgroundColor: '#10b981'
    },
    fallbackBadge: {
      backgroundColor: '#f59e0b'
    },
    infoSection: {
      backgroundColor: '#f8fafc',
      border: '1px solid #e2e8f0',
      borderRadius: '8px',
      padding: '1rem',
      fontSize: '0.875rem',
      color: '#475569',
      lineHeight: '1.5'
    },
    infoIcon: {
      color: '#3b82f6',
      marginRight: '0.5rem'
    }
  };

  return (
    <div style={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={styles.modal}>
        <button
          style={styles.closeButton}
          onClick={onClose}
          type="button"
        >
          ×
        </button>

        <div style={styles.header}>
          <h2 style={styles.title}>
            🎥 Start Video Conference
          </h2>
          <p style={styles.subtitle}>
            Choose your preferred video conferencing platform for the meeting
          </p>
        </div>

        <div style={styles.optionsContainer}>
          {/* WebRTC Option */}
          <div 
            style={styles.optionCard}
            onClick={handleWebRTCStart}
          >
            <div style={{...styles.badge, ...styles.recommendedBadge}}>
              Recommended
            </div>
            <div style={styles.optionIcon}>🌐</div>
            <h3 style={styles.optionTitle}>Built-in WebRTC</h3>
            <p style={styles.optionDescription}>
              Start an instant video call directly in your browser with built-in recording
            </p>
            <ul style={styles.optionFeatures}>
              <li style={styles.featureItem}>
                <span style={styles.featureIcon}>✓</span>
                No external app required
              </li>
              <li style={styles.featureItem}>
                <span style={styles.featureIcon}>✓</span>
                SRS Recording integration
              </li>
              <li style={styles.featureItem}>
                <span style={styles.featureIcon}>✓</span>
                Screen sharing & chat
              </li>
              <li style={styles.featureItem}>
                <span style={styles.featureIcon}>✓</span>
                Auto-saves to case files
              </li>
            </ul>
          </div>

          {/* Zoom Option */}
          <div 
            style={styles.optionCard}
            onClick={handleZoomStart}
          >
            <div style={{...styles.badge, ...styles.fallbackBadge}}>
              Backup
            </div>
            <div style={styles.optionIcon}>🎬</div>
            <h3 style={styles.optionTitle}>Zoom Meeting</h3>
            <p style={styles.optionDescription}>
              Schedule or start a professional Zoom meeting with advanced features
            </p>
            <ul style={styles.optionFeatures}>
              <li style={styles.featureItem}>
                <span style={styles.featureIcon}>✓</span>
                Professional meeting platform
              </li>
              <li style={styles.featureItem}>
                <span style={styles.featureIcon}>✓</span>
                Advanced participant controls
              </li>
              <li style={styles.featureItem}>
                <span style={styles.featureIcon}>✓</span>
                Recurring meeting options
              </li>
              <li style={styles.featureItem}>
                <span style={styles.featureIcon}>✓</span>
                Enterprise security features
              </li>
            </ul>
          </div>
        </div>

        <div style={styles.infoSection}>
          <div style={{ display: 'flex', alignItems: 'flex-start' }}>
            <span style={styles.infoIcon}>ℹ️</span>
            <div>
              <strong>Recommendation:</strong> Use the built-in WebRTC option for quick, secure video calls that integrate seamlessly with your case management. 
              Choose Zoom if you need advanced features like recurring meetings, larger participant capacity, or if clients prefer the familiar Zoom interface.
              {meetingId && (
                <div style={{ marginTop: '0.5rem' }}>
                  <strong>Meeting ID:</strong> {meetingId}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoConferenceOptionsModal;