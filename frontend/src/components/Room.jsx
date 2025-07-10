import { useState, useEffect, useRef, memo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocketStore } from '../stores/useSocketStore';
import { useAuth } from '../stores/useAuthStore';
import VideoCall from './VideoCall';

function Room() {
  const { user, accessToken, logout, username: currentUsername } = useAuth();
  const { initSocket } = useSocketStore();
  console.log('Room component rendering, user:', user.id);
  const { roomId } = useParams();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState('');
  const [hasJoinedRoom, setHasJoinedRoom] = useState(false);
  const navigate = useNavigate();
  const socket = initSocket(accessToken);
  const peerConnectionRef = useRef(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const [incomingOffer, setIncomingOffer] = useState(null);
  const [showIncomingCall, setShowIncomingCall] = useState(false);
  const [pendingCaller, setPendingCaller] = useState(null);
  const localStreamRef = useRef(null);
  const messagesEndRef = useRef(null);

  const iceServers = [
    { urls: 'stun:stun.l.google.com:19302' },
  ];

  // For disabling remote video, remove video tracks from remoteStream but keep the object
  const toggleRemoteVideo = (enable) => {
    if (remoteStream) {
      remoteStream.getVideoTracks().forEach(track => {
        track.enabled = !!enable;
      });
    }
  };

  const handleLeaveRoom = () => {
    console.log('Leaving room:', roomId);
    if (peerConnectionRef.current) {
      peerConnectionRef.current.ontrack = null;
      peerConnectionRef.current.onicecandidate = null;
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    setLocalStream(null);
    setRemoteStream(null);
    socket.disconnect();
    navigate('/home');
  };

  useEffect(() => {
    console.log('Room useEffect running, roomId:', roomId);
    if (!roomId) {
      console.error('Invalid room ID');
      setError('Invalid room ID');
      navigate('/home');
      return;
    }

    socket.off('connect');
    socket.off('connect_error');
    socket.off('joined-room');
    socket.off('room-full');
    socket.off('error');
    socket.off('chat-message');
    socket.off('user-joined');
    socket.off('user-disconnected');
    socket.off('i-joined-room');
    socket.off('incoming-offer');
    socket.off('incoming-answer');
    socket.off('call-ended');
    socket.off('end-call');

    if (!socket.connected) {
      console.log('Connecting socket for room:', roomId);
      socket.connect();
    }

    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
      if (!hasJoinedRoom) {
        console.log('Joining room:', roomId);
        socket.emit('join-room', { roomId });
      } else {
        console.log('Already joined room:', roomId, '- skipping join-room emit');
      }
    });

    socket.on('joined-room', ({ roomId, userId, username }) => {
      console.log('Successfully joined room:', username);
      if (userId != user.id) {
        setMessages((prev) => [...prev, { userId, username, message: `${username} joined the room`, system: true }]);
      }
      setHasJoinedRoom(true);
    });

    socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err.message);
      setError('Failed to connect to server');
      navigate('/home');
    });

    socket.on('room-full', (msg) => {
      console.error('Room full:', msg);
      setError(msg);
      navigate('/home');
    });

    socket.on('error', (msg) => {
      console.error('Socket error:', msg);
      setError(msg);
      navigate('/home');
    });

    socket.on('chat-message', ({ userId, username, message }) => {
      setMessages((prev) => [...prev, { userId, username, message }]);
    });

    socket.on('user-joined', ({ userId, username }) => {
      console.log('User joined:', username);
      setMessages((prev) => [...prev, { userId, username, message: `${username} joined the room`, system: true }]);
    });

    socket.on('user-disconnected', ({ userId, username }) => {
      setMessages((prev) => [...prev, { userId, username, message: `${username} left the room`, system: true }]);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null;
      }
      setRemoteStream(null);
    });

    socket.on('incoming-offer', async (offer) => {
      try {
        console.log('Received incoming offer:', offer);
        setIncomingOffer(offer);
        setShowIncomingCall(true);
      } catch (err) {
        console.error('Error handling incoming offer:', err);
        setError('Failed to handle incoming offer: ' + err.message);
      }
    });

    socket.on('call-ended', ({ userId, username }) => {
      console.log('Call ended by:', username);
      setShowIncomingCall(false);
      setIncomingOffer(null);
      setError('Call ended by ' + username);
      if (peerConnectionRef.current) {
        peerConnectionRef.current.ontrack = null;
        peerConnectionRef.current.onicecandidate = null;
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
      }
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null;
      }
      setLocalStream(null);
      setRemoteStream(null);
    });

    socket.on('incoming-answer', async (answer) => {
      try {
        console.log('Received incoming answer:', answer);
        const pc = peerConnectionRef.current;
        if (!pc) {
          setError('No peer connection exists to set answer');
          return;
        }
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        pc.ontrack = (event) => {
          if (event.streams && event.streams[0]) {
            setRemoteStream(event.streams[0]);
            if (remoteVideoRef.current) {
              remoteVideoRef.current.srcObject = event.streams[0];
            }
          }
        };
        if (pc.getReceivers) {
          const remoteStream = new window.MediaStream();
          pc.getReceivers().forEach(receiver => {
            if (receiver.track) remoteStream.addTrack(receiver.track);
          });
          if (remoteStream.getTracks().length > 0) {
            setRemoteStream(remoteStream);
            if (remoteVideoRef.current) {
              remoteVideoRef.current.srcObject = remoteStream;
            }
          }
        }
      } catch (err) {
        console.error('Error handling incoming answer:', err);
        setError('Failed to handle incoming answer: ' + err.message);
      }
    });

    return () => {
      console.log('Room useEffect cleanup');
      socket.off('connect');
      socket.off('connect_error');
      socket.off('joined-room');
      socket.off('room-full');
      socket.off('error');
      socket.off('chat-message');
      socket.off('user-joined');
      socket.off('user-disconnected');
      socket.off('incoming-offer');
      socket.off('incoming-answer');
      socket.off('call-ended');
      socket.off('end-call');
      setHasJoinedRoom(false);
    };
  }, [roomId, user, navigate, socket, hasJoinedRoom, accessToken]);

  const enableLocalVideo = async () => {
    console.log("enable video called");
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    setLocalStream(stream);
    localStreamRef.current = stream;
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }
    const newVideoTrack = stream.getVideoTracks()[0];
    if (peerConnectionRef.current && newVideoTrack) {
      const sender = peerConnectionRef.current.getSenders().find(s => s.track && s.track.kind === 'video');
      if (sender) {
        sender.replaceTrack(newVideoTrack);
      }
    }
  };

  useEffect(() => {
    socket.emit('i-joined-room', { roomId, userId: user.id, username: currentUsername });
  }, []);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (message) {
      if (socket && socket.connected) {
        console.log('Sending chat message:', message);
        socket.emit('chat-message', { roomId, message });
        setMessage('');
      } else {
        setError('Not connected to the server. Please try again.');
      }
    }
  };

  const handleVoiceCall = () => {
    console.log('Voice call button clicked (to be implemented)');
    setError('Voice call feature not yet implemented');
  };

  const handleAcceptCall = async () => {
    try {
      setShowIncomingCall(false);
      if (!incomingOffer) return;
      const pc = new RTCPeerConnection({ iceServers });
      peerConnectionRef.current = pc;

      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setLocalStream(stream);
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.ontrack = (event) => {
        if (event.track.kind === 'video') {
          // Add the new video track to the existing remoteStream
          if (!remoteStream) {
            const newStream = new window.MediaStream();
            setRemoteStream(newStream);
            newStream.addTrack(event.track);
          } else {
            // Remove any old video tracks first
            remoteStream.getVideoTracks().forEach(track => {
              remoteStream.removeTrack(track);
            });
            remoteStream.addTrack(event.track);
            setRemoteStream(remoteStream); // trigger re-render if needed
          }
        }
      };

      await pc.setRemoteDescription(new RTCSessionDescription(incomingOffer));

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('ice-candidate', { roomId, candidate: event.candidate });
        }
      };

      socket.on('ice-candidate', async (candidate) => {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.error('Error adding received ICE candidate', err);
        }
      });

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit('answer', { roomId, answer });
      setError('Received offer and sent answer!');
      setIncomingOffer(null);
    } catch (err) {
      console.error('Error accepting call:', err);
      setError('Failed to accept call: ' + err.message);
    }
  };

  const handleRejectCall = () => {
    setShowIncomingCall(false);
    setIncomingOffer(null);
    handleEndCall();
    setError('Call rejected.');
  };

  const handleVideoCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setLocalStream(stream);
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      const pc = new RTCPeerConnection({ iceServers });
      peerConnectionRef.current = pc;

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          setRemoteStream(event.streams[0]);
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = event.streams[0];
          }
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('ice-candidate', { roomId, candidate: event.candidate });
        }
      };

      socket.on('ice-candidate', async (candidate) => {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.error('Error adding received ICE candidate', err);
        }
      });

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket.emit('offer', { roomId, offer });
      // setError('Video call offer sent! Waiting for answer...');
    } catch (err) {
      console.error('Error starting video call:', err);
      setError('Failed to start video call: ' + err.message);
    }
  };

  const callActive = !!localStream;

  const handleEndCall = () => {
    socket.emit('end-call', { roomId });
    if (peerConnectionRef.current) {
      peerConnectionRef.current.ontrack = null;
      peerConnectionRef.current.onicecandidate = null;
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    setLocalStream(null);
    setRemoteStream(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 to-purple-900 flex items-center justify-center p-4 w-full">
      <div className="max-w-3xl w-full h-[90vh] rounded-2xl shadow-2xl flex flex-col bg-white/10 backdrop-blur-lg border border-white/20">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-900/80 to-purple-900/80 text-white p-5 flex items-center justify-between rounded-t-2xl border-b border-white/10 shadow-md">
          <div className="flex items-center gap-2">
            <button onClick={handleLeaveRoom} className="text-white">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h4 className="font-semibold text-lg">Chat Room - {roomId}</h4>
          </div>
          <div className="flex gap-4">
            {!callActive && (
              <>
                <button onClick={handleVideoCall} className="text-white">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
                <button onClick={handleVoiceCall} className="text-white">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-400/80 text-white p-2 text-center text-sm shadow">
            {error}
          </div>
        )}

        {/* Incoming Call Modal */}
        {showIncomingCall && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70">
            <div className="bg-gradient-to-br from-indigo-900/90 to-purple-900/90 rounded-2xl p-8 w-80 shadow-2xl border border-white/20">
              <h2 className="text-lg font-semibold text-white mb-4 text-center drop-shadow">Incoming Video Call</h2>
              <div className="flex justify-center gap-4">
                <button
                  onClick={handleAcceptCall}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full p-3"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </button>
                <button
                  onClick={handleRejectCall}
                  className="bg-red-500 hover:bg-red-600 text-white rounded-full p-3"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Video Call Section */}
        {callActive && (
          <div className="bg-white/10 rounded-2xl p-2 shadow-xl border border-white/10">
            <VideoCall
              localStream={localStream}
              remoteStream={remoteStream}
              handleEndCall={handleEndCall}
              enableLocalVideo={enableLocalVideo}
              socket={socket}
              toggleRemoteVideo={toggleRemoteVideo}
            />
            <div className="flex justify-center mt-2">
               <button
                onClick={handleEndCall}
                className="bg-red-500 hover:bg-red-600 text-white rounded-full p-3 shadow-lg"
               >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
               </button>
            </div>
          </div>
        )}

        {/* Chat Section */}
        <div className="flex-1 bg-white/10 p-6 overflow-y-auto max-h-[70vh] shadow-inner border-t border-white/10">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`mb-3 flex ${msg.system ? 'justify-center' : msg.userId === user.id ? 'justify-end' : 'justify-start'}`}
            >
              {msg.system ? (
                <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">{msg.message}</span>
              ) : (
                <div className={`max-w-[70%] ${msg.userId === user.id ? 'bg-[#DCF8C6]' : 'bg-white'} rounded-lg p-3 shadow-sm`}>
                  <span className="text-xs text-gray-500 block">{msg.userId === user.id ? 'You' : msg.username}</span>
                  <p className="text-gray-800">{msg.message}</p>
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="bg-white/20 p-3 flex items-center rounded-b-2xl border-t border-white/10">
          <form onSubmit={handleSendMessage} className="flex-1 flex items-center">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="flex-1 p-2 rounded-lg bg-white/60 border border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-black placeholder:text-gray-500"
              placeholder="Type a message..."
            />
            <button
              type="submit"
              className="ml-2 text-indigo-600 p-2 hover:bg-indigo-100 rounded-full transition"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="white">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default memo(Room);