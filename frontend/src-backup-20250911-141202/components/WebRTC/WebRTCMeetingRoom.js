import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import WebRTCMeeting from './WebRTCMeeting';

const WebRTCMeetingRoom = () => {
  const { meetingId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [meeting, setMeeting] = useState(null);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [joinForm, setJoinForm] = useState({
    name: '',
    email: '',
    password: ''
  });
  const [showJoinForm, setShowJoinForm] = useState(false);

  useEffect(() => {
    // Get user info from localStorage or authentication
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (token && userData) {
      setUser(JSON.parse(userData));
    }

    fetchMeetingDetails();
  }, [meetingId]);

  const fetchMeetingDetails = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/webrtc/meetings/${meetingId}`, {
        headers: token ? {
          'Authorization': `Bearer ${token}`
        } : {}
      });

      if (response.ok) {
        const data = await response.json();
        setMeeting(data);
        
        // If user is authenticated, try to join automatically
        if (user) {
          await joinMeeting();
        } else {
          setShowJoinForm(true);
        }
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Meeting not found');
      }
    } catch (error) {
      console.error('Error fetching meeting:', error);
      setError('Failed to load meeting details');
    } finally {
      setLoading(false);
    }
  };

  const joinMeeting = async (guestInfo = null) => {
    try {
      const token = localStorage.getItem('token');
      const requestBody = guestInfo || {};
      
      if (joinForm.password) {
        requestBody.password = joinForm.password;
      }

      const response = await fetch(`/api/webrtc/meetings/${meetingId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(requestBody)
      });

      if (response.ok) {
        const result = await response.json();
        
        // Set user info for guest users
        if (guestInfo) {
          setUser({
            id: `guest_${Date.now()}`,
            name: guestInfo.name,
            email: guestInfo.email,
            role: 'guest'
          });
        }
        
        setShowJoinForm(false);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to join meeting');
      }
    } catch (error) {
      console.error('Error joining meeting:', error);
      setError('Failed to join meeting');
    }
  };

  const handleGuestJoin = async (e) => {
    e.preventDefault();
    
    if (!joinForm.name.trim()) {
      setError('Name is required');
      return;
    }

    await joinMeeting({
      name: joinForm.name,
      email: joinForm.email || `guest_${Date.now()}@temp.com`
    });
  };

  const leaveMeeting = () => {
    navigate('/app/dashboard');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading meeting...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center max-w-md">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <p className="font-medium">Meeting Error</p>
            <p className="text-sm">{error}</p>
          </div>
          <button
            onClick={() => navigate('/app/dashboard'))
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (showJoinForm) {
    const meetingStartTime = new Date(meeting.startTime);
    const isStarted = Date.now() > meetingStartTime.getTime();
    const isStartingSoon = meetingStartTime.getTime() - Date.now() < 15 * 60 * 1000; // 15 minutes

    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{meeting.title}</h1>
            <p className="text-gray-600">{meeting.description}</p>
            <div className="mt-4 text-sm text-gray-500">
              <p>Scheduled: {meetingStartTime.toLocaleDateString()} at {meetingStartTime.toLocaleTimeString()}</p>
              <p>Host: {meeting.hostName || 'Legal Estate Team'}</p>
            </div>
          </div>

          {!isStarted && !isStartingSoon && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <p className="text-yellow-800 text-sm">
                This meeting hasn't started yet. You can join up to 15 minutes before the scheduled time.
              </p>
            </div>
          )}

          <form onSubmit={handleGuestJoin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Your Name *
              </label>
              <input
                type="text"
                required
                value={joinForm.name}
                onChange={(e) => setJoinForm(prev => ({ ...prev, name: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your full name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={joinForm.email}
                onChange={(e) => setJoinForm(prev => ({ ...prev, email: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="your.email@example.com (optional)"
              />
            </div>

            {meeting.requiresPassword && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Meeting Password *
                </label>
                <input
                  type="password"
                  required
                  value={joinForm.password}
                  onChange={(e) => setJoinForm(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter meeting password"
                />
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
              <div className="flex items-start space-x-2">
                <div className="flex-shrink-0 mt-0.5">
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium">Before you join:</p>
                  <ul className="mt-1 space-y-1 text-xs">
                    <li>• Ensure your camera and microphone are working</li>
                    <li>• Use headphones to avoid audio feedback</li>
                    <li>• Find a quiet, well-lit location</li>
                    <li>• Close unnecessary applications for better performance</li>
                  </ul>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={!isStarted && !isStartingSoon}
              className={`w-full py-3 px-4 rounded-lg font-medium text-white ${
                (isStarted || isStartingSoon)
                  ? 'bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-blue-500'
                  : 'bg-gray-400 cursor-not-allowed'
              }`}
            >
              {(isStarted || isStartingSoon) ? 'Join Meeting' : 'Meeting Not Started'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => navigate('/app/dashboard'))
              className="text-gray-500 hover:text-gray-700 text-sm underline"
            >
              Go back to dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show the actual meeting interface
  return (
    <WebRTCMeeting
      roomId={meetingId}
      user={user}
      onLeave={leaveMeeting}
    />
  );
};

export default WebRTCMeetingRoom;