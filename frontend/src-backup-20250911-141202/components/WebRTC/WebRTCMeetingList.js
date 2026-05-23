import React, { useState, useEffect } from 'react';
import { 
  PlusIcon, 
  VideoCameraIcon, 
  CalendarIcon, 
  UsersIcon,
  ClockIcon,
  ShieldCheckIcon,
  DocumentDuplicateIcon,
  PlayIcon,
  StopIcon
} from '../Icons';
import WebRTCMeeting from './WebRTCMeeting';

const WebRTCMeetingList = ({ user }) => {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeMeeting, setActiveMeeting] = useState(null);
  const [newMeeting, setNewMeeting] = useState({
    title: '',
    description: '',
    startTime: '',
    duration: 60,
    meetingType: 'client_consultation',
    securityLevel: 'standard',
    participants: [],
    requiresApproval: false,
    enableRecording: true,
    enableChat: true,
    enableScreenShare: true
  });

  const meetingTypes = [
    { value: 'client_consultation', label: 'Client Consultation', icon: UsersIcon },
    { value: 'team_meeting', label: 'Team Meeting', icon: VideoCameraIcon },
    { value: 'deposition', label: 'Deposition', icon: DocumentDuplicateIcon },
    { value: 'court_hearing', label: 'Court Hearing', icon: ShieldCheckIcon },
    { value: 'case_review', label: 'Case Review', icon: CalendarIcon }
  ];

  const securityLevels = [
    { value: 'standard', label: 'Standard Security', color: 'bg-green-100 text-green-800' },
    { value: 'high', label: 'High Security', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'confidential', label: 'Confidential', color: 'bg-red-100 text-red-800' }
  ];

  useEffect(() => {
    fetchMeetings();
  }, []);

  const fetchMeetings = async () => {
    try {
      const response = await fetch('/api/webrtc/meetings', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setMeetings(data.meetings || []);
      }
    } catch (error) {
      console.error('Failed to fetch meetings:', error);
      // Mock data for development
      setMeetings([
        {
          id: '1',
          title: 'Client Consultation - Smith Case',
          description: 'Initial consultation with client regarding personal injury case',
          startTime: new Date(Date.now() + 60000 * 30).toISOString(),
          duration: 60,
          meetingType: 'client_consultation',
          securityLevel: 'high',
          status: 'scheduled',
          participants: [
            { id: '1', name: 'John Smith', email: 'john@example.com', role: 'client' },
            { id: '2', name: 'Attorney Wilson', email: 'wilson@firm.com', role: 'host' }
          ],
          createdAt: new Date().toISOString()
        },
        {
          id: '2',
          title: 'Team Strategy Meeting',
          description: 'Weekly team meeting to discuss case strategies',
          startTime: new Date(Date.now() + 60000 * 120).toISOString(),
          duration: 90,
          meetingType: 'team_meeting',
          securityLevel: 'standard',
          status: 'scheduled',
          participants: [
            { id: '3', name: 'Attorney Johnson', email: 'johnson@firm.com', role: 'host' },
            { id: '4', name: 'Paralegal Davis', email: 'davis@firm.com', role: 'participant' }
          ],
          createdAt: new Date().toISOString()
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const createMeeting = async () => {
    try {
      const response = await fetch('/api/webrtc/meetings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(newMeeting)
      });

      if (response.ok) {
        const meeting = await response.json();
        setMeetings(prev => [meeting, ...prev]);
        setShowCreateModal(false);
        setNewMeeting({
          title: '',
          description: '',
          startTime: '',
          duration: 60,
          meetingType: 'client_consultation',
          securityLevel: 'standard',
          participants: [],
          requiresApproval: false,
          enableRecording: true,
          enableChat: true,
          enableScreenShare: true
        });
      }
    } catch (error) {
      console.error('Failed to create meeting:', error);
    }
  };

  const joinMeeting = (meetingId) => {
    const meeting = meetings.find(m => m.id === meetingId);
    if (meeting) {
      setActiveMeeting(meeting);
    }
  };

  const leaveMeeting = () => {
    setActiveMeeting(null);
  };

  const startInstantMeeting = async () => {
    const instantMeeting = {
      id: `instant_${Date.now()}`,
      title: 'Instant Meeting',
      description: 'Quick meeting started instantly',
      startTime: new Date().toISOString(),
      duration: 60,
      meetingType: 'client_consultation',
      securityLevel: 'standard',
      status: 'active',
      participants: [{ ...user, role: 'host' }],
      createdAt: new Date().toISOString()
    };

    setMeetings(prev => [instantMeeting, ...prev]);
    setActiveMeeting(instantMeeting);
  };

  const copyMeetingLink = (meetingId) => {
    const meetingUrl = `${window.location.origin}/meeting/${meetingId}`;
    navigator.clipboard.writeText(meetingUrl);
    // Show toast notification here
    console.log('Meeting link copied to clipboard');
  };

  if (activeMeeting) {
    return (
      <WebRTCMeeting
        roomId={activeMeeting.id}
        user={user}
        onLeave={leaveMeeting}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Video Meetings</h1>
          <p className="text-gray-600 mt-2">Secure self-hosted video conferencing for legal professionals</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={startInstantMeeting}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
          >
            <VideoCameraIcon className="h-5 w-5" />
            <span>Start Instant Meeting</span>
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
          >
            <PlusIcon className="h-5 w-5" />
            <span>Schedule Meeting</span>
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <CalendarIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-gray-900">Upcoming</h3>
              <p className="text-2xl font-bold text-blue-600">
                {meetings.filter(m => m.status === 'scheduled').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <PlayIcon className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-gray-900">Active</h3>
              <p className="text-2xl font-bold text-green-600">
                {meetings.filter(m => m.status === 'active').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-gray-100 rounded-lg">
              <StopIcon className="h-6 w-6 text-gray-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-gray-900">Completed</h3>
              <p className="text-2xl font-bold text-gray-600">
                {meetings.filter(m => m.status === 'completed').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Meetings List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Your Meetings</h3>
        </div>
        
        <div className="divide-y divide-gray-200">
          {meetings.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <VideoCameraIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No meetings</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by scheduling your first meeting.</p>
            </div>
          ) : (
            meetings.map((meeting) => {
              const meetingType = meetingTypes.find(type => type.value === meeting.meetingType);
              const securityLevel = securityLevels.find(level => level.value === meeting.securityLevel);
              const startTime = new Date(meeting.startTime);
              const isStartingSoon = startTime.getTime() - Date.now() < 15 * 60 * 1000; // 15 minutes
              const canJoin = meeting.status === 'active' || isStartingSoon;

              return (
                <div key={meeting.id} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        {meetingType && <meetingType.icon className="h-5 w-5 text-gray-400" />}
                        <h4 className="text-lg font-medium text-gray-900">{meeting.title}</h4>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${securityLevel?.color}`}>
                          {securityLevel?.label}
                        </span>
                      </div>
                      
                      <p className="text-gray-600 mt-1">{meeting.description}</p>
                      
                      <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                        <div className="flex items-center space-x-1">
                          <ClockIcon className="h-4 w-4" />
                          <span>{startTime.toLocaleDateString()} at {startTime.toLocaleTimeString()}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <UsersIcon className="h-4 w-4" />
                          <span>{meeting.participants?.length || 0} participants</span>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          meeting.status === 'active' ? 'bg-green-100 text-green-800' :
                          meeting.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {meeting.status}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => copyMeetingLink(meeting.id)}
                        className="p-2 text-gray-400 hover:text-gray-600"
                        title="Copy meeting link"
                      >
                        <DocumentDuplicateIcon className="h-5 w-5" />
                      </button>
                      
                      {canJoin && (
                        <button
                          onClick={() => joinMeeting(meeting.id)}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
                        >
                          <VideoCameraIcon className="h-4 w-4" />
                          <span>Join</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Create Meeting Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Schedule New Meeting</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  value={newMeeting.title}
                  onChange={(e) => setNewMeeting(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Meeting title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                <input
                  type="datetime-local"
                  value={newMeeting.startTime}
                  onChange={(e) => setNewMeeting(prev => ({ ...prev, startTime: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Meeting Type</label>
                <select
                  value={newMeeting.meetingType}
                  onChange={(e) => setNewMeeting(prev => ({ ...prev, meetingType: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {meetingTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Security Level</label>
                <select
                  value={newMeeting.securityLevel}
                  onChange={(e) => setNewMeeting(prev => ({ ...prev, securityLevel: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {securityLevels.map(level => (
                    <option key={level.value} value={level.value}>{level.label}</option>
                  ))}
                </select>
              </div>

              <div className="flex space-x-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={newMeeting.enableRecording}
                    onChange={(e) => setNewMeeting(prev => ({ ...prev, enableRecording: e.target.checked }))}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-700">Enable Recording</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={createMeeting}
                className="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
              >
                Schedule Meeting
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WebRTCMeetingList;