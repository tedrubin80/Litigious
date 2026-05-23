import React, { useState, useRef, useEffect, useCallback } from 'react';
import { meetingsAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const VideoConferenceRoom = ({ meetingId, onClose }) => {
  const { user } = useAuth();
  
  // State management
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState(new Map());
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [participants, setParticipants] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [error, setError] = useState(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [volume, setVolume] = useState(100);
  const [selectedVideoQuality, setSelectedVideoQuality] = useState('hd');
  const [networkQuality, setNetworkQuality] = useState('good');
  
  // Refs
  const localVideoRef = useRef(null);
  const remoteVideoRefs = useRef({});
  const peerConnections = useRef({});
  const dataChannels = useRef({});
  const wsRef = useRef(null);
  const screenStreamRef = useRef(null);
  const recordingIntervalRef = useRef(null);
  
  // WebRTC configuration
  const iceServers = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' }
  ];
  
  const videoConstraints = {
    qvga: { width: 320, height: 240 },
    vga: { width: 640, height: 480 },
    hd: { width: 1280, height: 720 },
    fullhd: { width: 1920, height: 1080 }
  };

  // Initialize WebRTC connection
  useEffect(() => {
    initializeMedia();
    return () => {
      cleanup();
    };
  }, [meetingId]);

  // Initialize media devices
  const initializeMedia = async () => {
    try {
      setConnectionStatus('requesting-media');
      
      const constraints = {
        video: videoConstraints[selectedVideoQuality],
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setLocalStream(stream);
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      
      // Initialize WebSocket connection
      initializeWebSocket();
      
      setConnectionStatus('connected');
    } catch (error) {
      console.error('Failed to get media devices:', error);
      setError('Failed to access camera/microphone. Please check permissions.');
      setConnectionStatus('error');
    }
  };

  // Initialize WebSocket connection
  const initializeWebSocket = () => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/meeting/${meetingId}`;
    
    // Try to create WebSocket connection
    try {
      wsRef.current = new WebSocket(wsUrl);
      
      wsRef.current.onopen = () => {
        console.log('WebSocket connected');
        setConnectionStatus('connected');
        sendSignal({
          type: 'join',
          meetingId,
          user: {
            id: user.id,
            name: user.name || user.email,
            email: user.email
          }
        });
      };
      
      wsRef.current.onmessage = async (event) => {
        const message = JSON.parse(event.data);
        await handleSignalMessage(message);
      };
      
      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        // Fallback to local-only mode
        initializeFallbackMode();
      };
      
      wsRef.current.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        if (event.code !== 1000) { // Not a clean close
          initializeFallbackMode();
        } else {
          setConnectionStatus('disconnected');
        }
      };
      
      // Set a timeout to detect connection failure
      setTimeout(() => {
        if (wsRef.current?.readyState !== WebSocket.OPEN) {
          console.log('WebSocket connection timeout, using fallback mode');
          initializeFallbackMode();
        }
      }, 5000);
      
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      initializeFallbackMode();
    }
  };

  // Fallback mode for local testing without signaling server
  const initializeFallbackMode = () => {
    console.log('Initializing fallback mode (local-only)');
    setConnectionStatus('local-only');
    setError('Note: Running in local-only mode. You can test camera/microphone functionality, but multi-user meetings require a signaling server.');
    
    // Add current user as the only participant
    setParticipants([{
      id: user.id,
      name: user.name || user.email,
      email: user.email,
      isLocal: true
    }]);
  };

  // Send signal through WebSocket
  const sendSignal = (message) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  };

  // Handle incoming WebSocket messages
  const handleSignalMessage = async (message) => {
    console.log('Received signal:', message.type);
    
    switch (message.type) {
      case 'user-joined':
        await handleUserJoined(message.user);
        break;
      case 'user-left':
        handleUserLeft(message.userId);
        break;
      case 'offer':
        await handleOffer(message);
        break;
      case 'answer':
        await handleAnswer(message);
        break;
      case 'ice-candidate':
        await handleIceCandidate(message);
        break;
      case 'chat-message':
        handleChatMessage(message);
        break;
      case 'recording-started':
        setIsRecording(true);
        break;
      case 'recording-stopped':
        setIsRecording(false);
        break;
      case 'participants-update':
        setParticipants(message.participants);
        break;
      default:
        console.log('Unknown message type:', message.type);
    }
  };

  // Handle new user joining
  const handleUserJoined = async (newUser) => {
    console.log('User joined:', newUser);
    
    // Add to participants list
    setParticipants(prev => [...prev, newUser]);
    
    // Create peer connection for new user
    const pc = createPeerConnection(newUser.id);
    
    // Add local stream tracks to peer connection
    if (localStream) {
      localStream.getTracks().forEach(track => {
        pc.addTrack(track, localStream);
      });
    }
    
    // Create offer
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    
    // Send offer to new user
    sendSignal({
      type: 'offer',
      offer: offer,
      to: newUser.id,
      from: user.id
    });
  };

  // Handle user leaving
  const handleUserLeft = (userId) => {
    console.log('User left:', userId);
    
    // Remove from participants
    setParticipants(prev => prev.filter(p => p.id !== userId));
    
    // Close peer connection
    if (peerConnections.current[userId]) {
      peerConnections.current[userId].close();
      delete peerConnections.current[userId];
    }
    
    // Remove remote stream
    setRemoteStreams(prev => {
      const updated = new Map(prev);
      updated.delete(userId);
      return updated;
    });
    
    // Close data channel
    if (dataChannels.current[userId]) {
      dataChannels.current[userId].close();
      delete dataChannels.current[userId];
    }
  };

  // Create peer connection
  const createPeerConnection = (userId) => {
    const pc = new RTCPeerConnection({ iceServers });
    
    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignal({
          type: 'ice-candidate',
          candidate: event.candidate,
          to: userId,
          from: user.id
        });
      }
    };
    
    // Handle remote stream
    pc.ontrack = (event) => {
      console.log('Received remote track from', userId);
      setRemoteStreams(prev => {
        const updated = new Map(prev);
        updated.set(userId, event.streams[0]);
        return updated;
      });
    };
    
    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      console.log(`Connection state with ${userId}:`, pc.connectionState);
      if (pc.connectionState === 'connected') {
        checkNetworkQuality(pc);
      }
    };
    
    // Create data channel for chat
    const dataChannel = pc.createDataChannel('chat');
    dataChannel.onopen = () => console.log('Data channel opened with', userId);
    dataChannel.onmessage = (event) => {
      const message = JSON.parse(event.data);
      handleChatMessage(message);
    };
    dataChannels.current[userId] = dataChannel;
    
    peerConnections.current[userId] = pc;
    return pc;
  };

  // Handle WebRTC offer
  const handleOffer = async (message) => {
    const pc = createPeerConnection(message.from);
    
    await pc.setRemoteDescription(new RTCSessionDescription(message.offer));
    
    // Add local stream tracks
    if (localStream) {
      localStream.getTracks().forEach(track => {
        pc.addTrack(track, localStream);
      });
    }
    
    // Create answer
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    
    // Send answer
    sendSignal({
      type: 'answer',
      answer: answer,
      to: message.from,
      from: user.id
    });
  };

  // Handle WebRTC answer
  const handleAnswer = async (message) => {
    const pc = peerConnections.current[message.from];
    if (pc) {
      await pc.setRemoteDescription(new RTCSessionDescription(message.answer));
    }
  };

  // Handle ICE candidate
  const handleIceCandidate = async (message) => {
    const pc = peerConnections.current[message.from];
    if (pc) {
      await pc.addIceCandidate(new RTCIceCandidate(message.candidate));
    }
  };

  // Toggle video
  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  };

  // Toggle audio
  const toggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
      }
    }
  };

  // Start screen sharing
  const startScreenShare = async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true
      });
      
      screenStreamRef.current = screenStream;
      
      // Replace video track in all peer connections
      const videoTrack = screenStream.getVideoTracks()[0];
      Object.values(peerConnections.current).forEach(pc => {
        const sender = pc.getSenders().find(s => s.track?.kind === 'video');
        if (sender) {
          sender.replaceTrack(videoTrack);
        }
      });
      
      // Handle screen share ending
      videoTrack.onended = () => {
        stopScreenShare();
      };
      
      setIsScreenSharing(true);
    } catch (error) {
      console.error('Failed to start screen share:', error);
      setError('Failed to start screen sharing');
    }
  };

  // Stop screen sharing
  const stopScreenShare = () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop());
      
      // Replace with camera video
      if (localStream) {
        const videoTrack = localStream.getVideoTracks()[0];
        Object.values(peerConnections.current).forEach(pc => {
          const sender = pc.getSenders().find(s => s.track?.kind === 'video');
          if (sender) {
            sender.replaceTrack(videoTrack);
          }
        });
      }
      
      screenStreamRef.current = null;
      setIsScreenSharing(false);
    }
  };

  // Start recording
  const startRecording = async () => {
    try {
      await meetingsAPI.startRecording(meetingId);
      setIsRecording(true);
      
      // Start recording timer
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
      sendSignal({ type: 'recording-started' });
    } catch (error) {
      console.error('Failed to start recording:', error);
      setError('Failed to start recording');
    }
  };

  // Stop recording
  const stopRecording = async () => {
    try {
      await meetingsAPI.stopRecording(meetingId);
      setIsRecording(false);
      
      // Stop recording timer
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
      setRecordingTime(0);
      
      sendSignal({ type: 'recording-stopped' });
    } catch (error) {
      console.error('Failed to stop recording:', error);
      setError('Failed to stop recording');
    }
  };

  // Send chat message
  const sendChatMessage = () => {
    if (newMessage.trim()) {
      const message = {
        id: Date.now(),
        text: newMessage,
        sender: user.name || user.email,
        senderId: user.id,
        timestamp: new Date().toISOString()
      };
      
      // Send via data channels
      Object.values(dataChannels.current).forEach(channel => {
        if (channel.readyState === 'open') {
          channel.send(JSON.stringify(message));
        }
      });
      
      // Add to local messages
      setChatMessages(prev => [...prev, message]);
      setNewMessage('');
    }
  };

  // Handle incoming chat message
  const handleChatMessage = (message) => {
    setChatMessages(prev => [...prev, message]);
  };

  // Check network quality
  const checkNetworkQuality = async (pc) => {
    if (pc.getStats) {
      const stats = await pc.getStats();
      stats.forEach(report => {
        if (report.type === 'candidate-pair' && report.state === 'succeeded') {
          const rtt = report.currentRoundTripTime;
          if (rtt < 0.1) {
            setNetworkQuality('excellent');
          } else if (rtt < 0.3) {
            setNetworkQuality('good');
          } else if (rtt < 0.5) {
            setNetworkQuality('fair');
          } else {
            setNetworkQuality('poor');
          }
        }
      });
    }
  };

  // Leave meeting
  const leaveMeeting = async () => {
    try {
      await meetingsAPI.leave(meetingId);
      cleanup();
      onClose();
    } catch (error) {
      console.error('Error leaving meeting:', error);
      cleanup();
      onClose();
    }
  };

  // Cleanup on unmount
  const cleanup = () => {
    // Stop local stream
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    
    // Stop screen share
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop());
    }
    
    // Close peer connections
    Object.values(peerConnections.current).forEach(pc => pc.close());
    
    // Close data channels
    Object.values(dataChannels.current).forEach(channel => channel.close());
    
    // Close WebSocket
    if (wsRef.current) {
      wsRef.current.close();
    }
    
    // Clear recording interval
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
    }
  };

  // Format recording time
  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 bg-gray-900 z-50 flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h2 className="text-white font-semibold">Meeting: {meetingId}</h2>
          <span className={`px-2 py-1 rounded text-xs ${
            connectionStatus === 'connected' ? 'bg-green-500' :
            connectionStatus === 'local-only' ? 'bg-blue-500' :
            connectionStatus === 'connecting' ? 'bg-yellow-500' :
            'bg-red-500'
          } text-white`}>
            {connectionStatus === 'local-only' ? 'Local Mode' : connectionStatus}
          </span>
          {isRecording && (
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
              <span className="text-red-400 text-sm">REC {formatTime(recordingTime)}</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <span className={`px-2 py-1 rounded text-xs ${
            networkQuality === 'excellent' ? 'bg-green-500' :
            networkQuality === 'good' ? 'bg-green-400' :
            networkQuality === 'fair' ? 'bg-yellow-500' :
            'bg-red-500'
          } text-white`}>
            Network: {networkQuality}
          </span>
          <button
            onClick={() => setSelectedVideoQuality('hd')}
            className="text-white text-sm hover:text-gray-300"
          >
            HD
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Video Grid */}
        <div className="flex-1 p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-auto">
          {/* Local Video */}
          <div className="relative bg-gray-800 rounded-lg overflow-hidden">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 px-2 py-1 rounded">
              <span className="text-white text-sm">You</span>
            </div>
            {!isVideoEnabled && (
              <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                <div className="text-white text-center">
                  <svg className="w-16 h-16 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <p>Camera Off</p>
                </div>
              </div>
            )}
          </div>

          {/* Remote Videos */}
          {Array.from(remoteStreams.entries()).map(([userId, stream]) => (
            <div key={userId} className="relative bg-gray-800 rounded-lg overflow-hidden">
              <video
                ref={el => remoteVideoRefs.current[userId] = el}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
                srcObject={stream}
              />
              <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 px-2 py-1 rounded">
                <span className="text-white text-sm">
                  {participants.find(p => p.id === userId)?.name || 'Participant'}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Sidebar */}
        {(showChat || showParticipants) && (
          <div className="w-80 bg-gray-800 border-l border-gray-700">
            {/* Tabs */}
            <div className="flex border-b border-gray-700">
              <button
                onClick={() => { setShowChat(true); setShowParticipants(false); }}
                className={`flex-1 py-3 ${showChat ? 'bg-gray-700 text-white' : 'text-gray-400'}`}
              >
                Chat
              </button>
              <button
                onClick={() => { setShowChat(false); setShowParticipants(true); }}
                className={`flex-1 py-3 ${showParticipants ? 'bg-gray-700 text-white' : 'text-gray-400'}`}
              >
                Participants ({participants.length})
              </button>
            </div>

            {/* Chat */}
            {showChat && (
              <div className="flex flex-col h-full">
                <div className="flex-1 overflow-auto p-4 space-y-2">
                  {chatMessages.map(msg => (
                    <div key={msg.id} className={`${msg.senderId === user.id ? 'text-right' : ''}`}>
                      <div className={`inline-block px-3 py-2 rounded-lg ${
                        msg.senderId === user.id ? 'bg-blue-600 text-white' : 'bg-gray-700 text-white'
                      }`}>
                        <p className="text-xs opacity-75">{msg.sender}</p>
                        <p>{msg.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-4 border-t border-gray-700">
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
                      placeholder="Type a message..."
                      className="flex-1 px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none"
                    />
                    <button
                      onClick={sendChatMessage}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Send
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Participants */}
            {showParticipants && (
              <div className="p-4 space-y-2">
                {participants.map(participant => (
                  <div key={participant.id} className="flex items-center space-x-3 p-2 bg-gray-700 rounded-lg">
                    <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-semibold">
                        {participant.name?.charAt(0) || 'U'}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-medium">{participant.name || participant.email || 'Unknown'}</p>
                      <p className="text-gray-400 text-sm">{participant.email}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="bg-gray-800 px-6 py-4">
        <div className="flex items-center justify-center space-x-4">
          {/* Video Toggle */}
          <button
            onClick={toggleVideo}
            className={`p-3 rounded-full ${
              isVideoEnabled ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-600 hover:bg-red-700'
            } text-white transition-colors`}
          >
            {isVideoEnabled ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2zM3 3l18 18" />
              </svg>
            )}
          </button>

          {/* Audio Toggle */}
          <button
            onClick={toggleAudio}
            className={`p-3 rounded-full ${
              isAudioEnabled ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-600 hover:bg-red-700'
            } text-white transition-colors`}
          >
            {isAudioEnabled ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
              </svg>
            )}
          </button>

          {/* Screen Share */}
          <button
            onClick={isScreenSharing ? stopScreenShare : startScreenShare}
            className={`p-3 rounded-full ${
              isScreenSharing ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-700 hover:bg-gray-600'
            } text-white transition-colors`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </button>

          {/* Record */}
          <button
            onClick={isRecording ? stopRecording : startRecording}
            className={`p-3 rounded-full ${
              isRecording ? 'bg-red-600 hover:bg-red-700 animate-pulse' : 'bg-gray-700 hover:bg-gray-600'
            } text-white transition-colors`}
          >
            {isRecording ? (
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="6" width="12" height="12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="8" />
              </svg>
            )}
          </button>

          {/* Chat */}
          <button
            onClick={() => setShowChat(!showChat)}
            className={`p-3 rounded-full ${
              showChat ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-700 hover:bg-gray-600'
            } text-white transition-colors relative`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            {chatMessages.length > 0 && !showChat && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 rounded-full flex items-center justify-center text-xs">
                {chatMessages.length}
              </span>
            )}
          </button>

          {/* Participants */}
          <button
            onClick={() => setShowParticipants(!showParticipants)}
            className={`p-3 rounded-full ${
              showParticipants ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-700 hover:bg-gray-600'
            } text-white transition-colors`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </button>

          {/* Leave Call */}
          <button
            onClick={leaveMeeting}
            className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-full transition-colors flex items-center space-x-2"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
            <span>Leave</span>
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className={`absolute top-20 left-1/2 transform -translate-x-1/2 px-4 py-2 rounded-lg ${
          connectionStatus === 'local-only' 
            ? 'bg-blue-600 text-white' 
            : 'bg-red-600 text-white'
        }`}>
          {error}
        </div>
      )}
    </div>
  );
};

export default VideoConferenceRoom;