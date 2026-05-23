import React, { useState, useEffect } from 'react';
import { meetingsAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import VideoConferenceRoom from './VideoConferenceRoom';
import VideoConferenceOptionsModal from './VideoConferenceOptionsModal';

const VideoConferenceDashboard = () => {
  const { user } = useAuth();
  const [meetings, setMeetings] = useState([]);
  const [activeMeeting, setActiveMeeting] = useState(null);
  const [isCreatingMeeting, setIsCreatingMeeting] = useState(false);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [selectedMeetingId, setSelectedMeetingId] = useState(null);
  const [newMeetingForm, setNewMeetingForm] = useState({
    title: '',
    description: '',
    scheduledFor: '',
    duration: 60,
    isRecordingEnabled: true
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchMeetings();
  }, []);

  const fetchMeetings = async () => {
    try {
      setLoading(true);
      const response = await meetingsAPI.getActive();
      setMeetings(response.data);
    } catch (error) {
      console.error('Failed to fetch meetings:', error);
      setError('Failed to load meetings');
    } finally {
      setLoading(false);
    }
  };

  const createMeeting = async () => {
    try {
      setLoading(true);
      const meetingData = {
        ...newMeetingForm,
        hostId: user.id,
        hostName: user.name || user.email
      };
      
      const response = await meetingsAPI.create(meetingData);
      const newMeeting = response.data;
      
      setMeetings([newMeeting, ...meetings]);
      setIsCreatingMeeting(false);
      setNewMeetingForm({
        title: '',
        description: '',
        scheduledFor: '',
        duration: 60,
        isRecordingEnabled: true
      });
      
      // Auto-join the created meeting
      joinMeeting(newMeeting.id);
    } catch (error) {
      console.error('Failed to create meeting:', error);
      setError('Failed to create meeting');
    } finally {
      setLoading(false);
    }
  };

  const joinMeeting = async (meetingId) => {
    try {
      await meetingsAPI.join(meetingId);
      setActiveMeeting(meetingId);
    } catch (error) {
      console.error('Failed to join meeting:', error);
      setError('Failed to join meeting');
    }
  };

  const leaveMeeting = () => {
    setActiveMeeting(null);
    fetchMeetings(); // Refresh meetings list
  };

  const getRecordings = async (meetingId) => {
    try {
      const response = await meetingsAPI.getRecordings(meetingId);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch recordings:', error);
      return [];
    }
  };

  // Show video room if in active meeting
  if (activeMeeting) {
    return (
      <VideoConferenceRoom
        meetingId={activeMeeting}
        onClose={leaveMeeting}
      />
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Video Conferencing</h1>
        <p className="text-gray-600 mt-1">Host and join secure video meetings with SRS recording</p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Instant Meeting */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">Start Instant Meeting</h3>
          <p className="text-sm text-blue-700 mb-3">Begin a meeting right now</p>
          <button
            onClick={() => {
              setSelectedMeetingId(`instant_${Date.now()}`);
              setShowOptionsModal(true);
            }}
            disabled={loading}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            Start Now
          </button>
        </div>

        {/* Schedule Meeting */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="font-semibold text-green-900 mb-2">Schedule Meeting</h3>
          <p className="text-sm text-green-700 mb-3">Plan a meeting for later</p>
          <button
            onClick={() => setIsCreatingMeeting(true)}
            className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Schedule
          </button>
        </div>

        {/* Join with Code */}
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <h3 className="font-semibold text-purple-900 mb-2">Join Meeting</h3>
          <p className="text-sm text-purple-700 mb-3">Enter meeting code to join</p>
          <input
            type="text"
            placeholder="Enter code"
            className="w-full px-3 py-2 border rounded mb-2"
            onKeyPress={(e) => {
              if (e.key === 'Enter' && e.target.value) {
                joinMeeting(e.target.value);
              }
            }}
          />
        </div>
      </div>

      {/* Create Meeting Form */}
      {isCreatingMeeting && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Schedule New Meeting</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Meeting Title
              </label>
              <input
                type="text"
                value={newMeetingForm.title}
                onChange={(e) => setNewMeetingForm({...newMeetingForm, title: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Client Consultation"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Scheduled For
              </label>
              <input
                type="datetime-local"
                value={newMeetingForm.scheduledFor}
                onChange={(e) => setNewMeetingForm({...newMeetingForm, scheduledFor: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Duration (minutes)
              </label>
              <select
                value={newMeetingForm.duration}
                onChange={(e) => setNewMeetingForm({...newMeetingForm, duration: parseInt(e.target.value)})}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="30">30 minutes</option>
                <option value="60">1 hour</option>
                <option value="90">1.5 hours</option>
                <option value="120">2 hours</option>
              </select>
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="recording"
                checked={newMeetingForm.isRecordingEnabled}
                onChange={(e) => setNewMeetingForm({...newMeetingForm, isRecordingEnabled: e.target.checked})}
                className="mr-2"
              />
              <label htmlFor="recording" className="text-sm font-medium text-gray-700">
                Enable Recording (SRS)
              </label>
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={newMeetingForm.description}
                onChange={(e) => setNewMeetingForm({...newMeetingForm, description: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows="3"
                placeholder="Meeting agenda or notes..."
              />
            </div>
          </div>
          
          <div className="flex justify-end mt-4 space-x-2">
            <button
              onClick={() => setIsCreatingMeeting(false)}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              onClick={createMeeting}
              disabled={loading || !newMeetingForm.title}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              Create Meeting
            </button>
          </div>
        </div>
      )}

      {/* Active Meetings */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-semibold">Active Meetings</h3>
        </div>
        
        {loading ? (
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-2">Loading meetings...</p>
          </div>
        ) : meetings.length > 0 ? (
          <div className="divide-y">
            {meetings.map((meeting) => (
              <div key={meeting.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-gray-900">{meeting.title}</h4>
                    <p className="text-sm text-gray-600 mt-1">{meeting.description}</p>
                    <div className="flex items-center space-x-4 mt-2">
                      <span className="text-xs text-gray-500">
                        Host: {meeting.hostName}
                      </span>
                      <span className="text-xs text-gray-500">
                        Participants: {meeting.participantCount || 0}
                      </span>
                      {meeting.isRecording && (
                        <span className="text-xs text-red-600 flex items-center">
                          <span className="w-2 h-2 bg-red-600 rounded-full animate-pulse mr-1"></span>
                          Recording
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        setSelectedMeetingId(meeting.id);
                        setShowOptionsModal(true);
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Join
                    </button>
                    {meeting.recordings && meeting.recordings.length > 0 && (
                      <button
                        onClick={() => {
                          // Handle viewing recordings
                          console.log('View recordings for', meeting.id);
                        }}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                      >
                        Recordings ({meeting.recordings.length})
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 text-center">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <p className="text-gray-600">No active meetings</p>
            <p className="text-sm text-gray-500 mt-1">Start an instant meeting or schedule one for later</p>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Video Conference Options Modal */}
      <VideoConferenceOptionsModal
        isOpen={showOptionsModal}
        onClose={() => {
          setShowOptionsModal(false);
          setSelectedMeetingId(null);
        }}
        meetingId={selectedMeetingId}
      />
    </div>
  );
};

export default VideoConferenceDashboard;