import React, { useState, useRef, useEffect } from 'react';
import { 
  VideoCameraIcon, 
  MicrophoneIcon, 
  PhoneXMarkIcon,
  ComputerDesktopIcon,
  ChatBubbleLeftIcon,
  UserGroupIcon,
  RecordIcon,
  CogIcon
} from '../Icons';

const WebRTCMeeting = ({ roomId, user, onLeave }) => {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState([]);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [participants, setParticipants] = useState([]);
  const [meetingStatus, setMeetingStatus] = useState('connecting');
  
  const localVideoRef = useRef();
  const remoteVideoRefs = useRef({});
  const peerConnections = useRef({});
  const wsRef = useRef(null);
  const mediaRecorderRef = useRef(null);

  const iceServers = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ];

  useEffect(() => {
    initializeWebRTC();
    return () => cleanup();
  }, [roomId]);

  const initializeWebRTC = async () => {
    try {
      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Initialize WebSocket connection
      initializeWebSocket();
      
      setMeetingStatus('connected');
    } catch (error) {
      console.error('Failed to initialize WebRTC:', error);
      setMeetingStatus('error');
    }
  };

  const initializeWebSocket = () => {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}/webrtc`;
    
    wsRef.current = new WebSocket(wsUrl);
    
    wsRef.current.onopen = () => {
      console.log('WebSocket connected');
      // Join room
      wsRef.current.send(JSON.stringify({
        type: 'join-room',
        roomId,
        user: { id: user.id, name: user.name, email: user.email }
      }));
    };

    wsRef.current.onmessage = async (event) => {
      const message = JSON.parse(event.data);
      await handleWebSocketMessage(message);
    };

    wsRef.current.onerror = (error) => {
      console.error('WebSocket error:', error);
      setMeetingStatus('error');
    };
  };

  const handleWebSocketMessage = async (message) => {
    switch (message.type) {
      case 'user-joined':
        await handleUserJoined(message.user);
        break;
      case 'user-left':
        handleUserLeft(message.userId);
        break;
      case 'offer':
        await handleOffer(message.offer, message.from);
        break;
      case 'answer':
        await handleAnswer(message.answer, message.from);
        break;
      case 'ice-candidate':
        await handleIceCandidate(message.candidate, message.from);
        break;
      case 'chat-message':
        handleChatMessage(message);
        break;
      case 'participants-update':
        setParticipants(message.participants);
        break;
      case 'recording-started':
        setIsRecording(true);
        break;
      case 'recording-stopped':
        setIsRecording(false);
        break;
    }
  };

  const handleUserJoined = async (newUser) => {
    console.log('User joined:', newUser);
    
    // Create peer connection for new user
    const peerConnection = new RTCPeerConnection({ iceServers });
    peerConnections.current[newUser.id] = peerConnection;

    // Add local stream to peer connection
    if (localStream) {
      localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
      });
    }

    // Handle remote stream
    peerConnection.ontrack = (event) => {
      const [remoteStream] = event.streams;
      setRemoteStreams(prev => [...prev.filter(s => s.userId !== newUser.id), {
        userId: newUser.id,
        stream: remoteStream,
        user: newUser
      }]);
    };

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate && wsRef.current) {
        wsRef.current.send(JSON.stringify({
          type: 'ice-candidate',
          candidate: event.candidate,
          to: newUser.id,
          roomId
        }));
      }
    };

    // Create and send offer
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({
        type: 'offer',
        offer,
        to: newUser.id,
        roomId
      }));
    }
  };

  const handleOffer = async (offer, fromUserId) => {
    const peerConnection = new RTCPeerConnection({ iceServers });
    peerConnections.current[fromUserId] = peerConnection;

    // Add local stream
    if (localStream) {
      localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
      });
    }

    // Handle remote stream
    peerConnection.ontrack = (event) => {
      const [remoteStream] = event.streams;
      setRemoteStreams(prev => [...prev.filter(s => s.userId !== fromUserId), {
        userId: fromUserId,
        stream: remoteStream,
        user: participants.find(p => p.id === fromUserId)
      }]);
    };

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate && wsRef.current) {
        wsRef.current.send(JSON.stringify({
          type: 'ice-candidate',
          candidate: event.candidate,
          to: fromUserId,
          roomId
        }));
      }
    };

    await peerConnection.setRemoteDescription(offer);
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);

    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({
        type: 'answer',
        answer,
        to: fromUserId,
        roomId
      }));
    }
  };

  const handleAnswer = async (answer, fromUserId) => {
    const peerConnection = peerConnections.current[fromUserId];
    if (peerConnection) {
      await peerConnection.setRemoteDescription(answer);
    }
  };

  const handleIceCandidate = async (candidate, fromUserId) => {
    const peerConnection = peerConnections.current[fromUserId];
    if (peerConnection) {
      await peerConnection.addIceCandidate(candidate);
    }
  };

  const handleUserLeft = (userId) => {
    // Close peer connection
    if (peerConnections.current[userId]) {
      peerConnections.current[userId].close();
      delete peerConnections.current[userId];
    }

    // Remove from remote streams
    setRemoteStreams(prev => prev.filter(s => s.userId !== userId));
  };

  const handleChatMessage = (message) => {
    setChatMessages(prev => [...prev, {
      id: Date.now(),
      user: message.user,
      text: message.text,
      timestamp: new Date(message.timestamp)
    }]);
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  };

  const toggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
      }
    }
  };

  const toggleScreenShare = async () => {
    if (!isScreenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true
        });
        
        // Replace video track in peer connections
        const videoTrack = screenStream.getVideoTracks()[0];
        Object.values(peerConnections.current).forEach(pc => {
          const sender = pc.getSenders().find(s => 
            s.track && s.track.kind === 'video'
          );
          if (sender) {
            sender.replaceTrack(videoTrack);
          }
        });

        // Update local video
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }

        screenStream.getVideoTracks()[0].onended = () => {
          stopScreenShare();
        };

        setIsScreenSharing(true);
      } catch (error) {
        console.error('Failed to start screen sharing:', error);
      }
    } else {
      stopScreenShare();
    }
  };

  const stopScreenShare = async () => {
    try {
      // Get camera stream again
      const cameraStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: isAudioEnabled
      });

      // Replace video track back to camera
      const videoTrack = cameraStream.getVideoTracks()[0];
      Object.values(peerConnections.current).forEach(pc => {
        const sender = pc.getSenders().find(s => 
          s.track && s.track.kind === 'video'
        );
        if (sender) {
          sender.replaceTrack(videoTrack);
        }
      });

      // Update local stream and video
      setLocalStream(cameraStream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = cameraStream;
      }

      setIsScreenSharing(false);
    } catch (error) {
      console.error('Failed to stop screen sharing:', error);
    }
  };

  const toggleRecording = () => {
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({
        type: isRecording ? 'stop-recording' : 'start-recording',
        roomId
      }));
    }
  };

  const sendChatMessage = () => {
    if (newMessage.trim() && wsRef.current) {
      wsRef.current.send(JSON.stringify({
        type: 'chat-message',
        roomId,
        text: newMessage,
        user: { id: user.id, name: user.name }
      }));
      setNewMessage('');
    }
  };

  const leaveMeeting = () => {
    cleanup();
    onLeave();
  };

  const cleanup = () => {
    // Close peer connections
    Object.values(peerConnections.current).forEach(pc => pc.close());
    peerConnections.current = {};

    // Stop local stream
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }

    // Close WebSocket
    if (wsRef.current) {
      wsRef.current.close();
    }

    // Stop recording
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
  };

  if (meetingStatus === 'connecting') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white text-lg">Connecting to meeting...</p>
        </div>
      </div>
    );
  }

  if (meetingStatus === 'error') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center">
          <p className="text-red-400 text-lg mb-4">Failed to connect to meeting</p>
          <button
            onClick={onLeave}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-900">
      {/* Video Grid */}
      <div className="flex-1 p-4">
        <div className={`grid gap-4 h-full ${remoteStreams.length === 0 ? 'grid-cols-1' : 
          remoteStreams.length <= 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
          
          {/* Local Video */}
          <div className="relative bg-gray-800 rounded-lg overflow-hidden">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
              {user.name} (You)
            </div>
            {!isVideoEnabled && (
              <div className="absolute inset-0 bg-gray-700 flex items-center justify-center">
                <div className="w-16 h-16 bg-gray-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-xl font-semibold">
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Remote Videos */}
          {remoteStreams.map(({ userId, stream, user: remoteUser }) => (
            <div key={userId} className="relative bg-gray-800 rounded-lg overflow-hidden">
              <video
                ref={el => remoteVideoRefs.current[userId] = el}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
                srcObject={stream}
              />
              <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
                {remoteUser?.name || 'Unknown User'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center p-4 bg-gray-800">
        <div className="flex items-center space-x-4">
          <button
            onClick={toggleAudio}
            className={`p-3 rounded-full ${isAudioEnabled 
              ? 'bg-gray-600 hover:bg-gray-500' 
              : 'bg-red-600 hover:bg-red-500'} text-white`}
          >
            {isAudioEnabled ? (
              <MicrophoneIcon className="h-6 w-6" />
            ) : (
              <MicrophoneIcon className="h-6 w-6" />
            )}
          </button>

          <button
            onClick={toggleVideo}
            className={`p-3 rounded-full ${isVideoEnabled 
              ? 'bg-gray-600 hover:bg-gray-500' 
              : 'bg-red-600 hover:bg-red-500'} text-white`}
          >
            {isVideoEnabled ? (
              <VideoCameraIcon className="h-6 w-6" />
            ) : (
              <VideoCameraIcon className="h-6 w-6" />
            )}
          </button>

          <button
            onClick={toggleScreenShare}
            className={`p-3 rounded-full ${isScreenSharing 
              ? 'bg-blue-600 hover:bg-blue-500' 
              : 'bg-gray-600 hover:bg-gray-500'} text-white`}
          >
            <ComputerDesktopIcon className="h-6 w-6" />
          </button>

          <button
            onClick={toggleRecording}
            className={`p-3 rounded-full ${isRecording 
              ? 'bg-red-600 hover:bg-red-500' 
              : 'bg-gray-600 hover:bg-gray-500'} text-white`}
          >
            {isRecording ? (
              <RecordIcon className="h-6 w-6" />
            ) : (
              <RecordIcon className="h-6 w-6" />
            )}
          </button>

          <button
            onClick={() => setShowChat(!showChat)}
            className="p-3 rounded-full bg-gray-600 hover:bg-gray-500 text-white"
          >
            <ChatBubbleLeftIcon className="h-6 w-6" />
          </button>

          <button
            onClick={leaveMeeting}
            className="p-3 rounded-full bg-red-600 hover:bg-red-500 text-white"
          >
            <PhoneXMarkIcon className="h-6 w-6" />
          </button>
        </div>
      </div>

      {/* Chat Sidebar */}
      {showChat && (
        <div className="absolute right-0 top-0 h-full w-80 bg-gray-800 border-l border-gray-700 flex flex-col">
          <div className="p-4 border-b border-gray-700">
            <h3 className="text-white font-semibold">Chat</h3>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {chatMessages.map((message) => (
              <div key={message.id} className="text-sm">
                <div className="text-gray-400 text-xs">
                  {message.user.name} - {message.timestamp.toLocaleTimeString()}
                </div>
                <div className="text-white">{message.text}</div>
              </div>
            ))}
          </div>

          <div className="p-4 border-t border-gray-700">
            <div className="flex">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
                placeholder="Type a message..."
                className="flex-1 bg-gray-700 text-white px-3 py-2 rounded-l-lg border-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={sendChatMessage}
                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-r-lg"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WebRTCMeeting;