import { useState, useEffect, memo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocketStore } from '../stores/useSocketStore';
import { useAuth } from '../stores/useAuthStore';

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

  const handleLeaveRoom = () => {
    console.log('Leaving room:', roomId);
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

    // Clean up any existing listeners first
    socket.off('connect');
    socket.off('connect_error');
    socket.off('joined-room');
    socket.off('room-full');
    socket.off('error');
    socket.off('chat-message');
    socket.off('user-joined');
    socket.off('user-disconnected');
    socket.off('i-joined-room');

    if (!socket.connected) {
      console.log('Connecting socket for room:', roomId);
      socket.connect();
    }

    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
      // Only emit join-room if we haven't already joined this room
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
      setHasJoinedRoom(false);
    };
  }, [roomId, user, navigate, socket, hasJoinedRoom, accessToken]);


  useEffect(() => {
    socket.emit('i-joined-room', { roomId, userId: user.id, username: currentUsername });
  }, []);

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

  const handleVideoCall = () => {
    console.log('Video call button clicked (to be implemented)');
    setError('Video call feature not yet implemented');
  };

  return (
    <div className="container mx-auto p-4 lg:w-[50%] lg:mx-auto min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 to-purple-900">
      <div className="w-full bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-8 border border-white/20">
        <div className="flex flex-col items-center mb-4">
          <h1 className="text-3xl font-extrabold text-white drop-shadow-lg mb-2">Chat Room - {roomId}</h1>
        </div>
        {error && <p className="text-red-400 mb-4 text-center">{error}</p>}
        <div className="bg-indigo-950/60 p-4 rounded-xl shadow-inner mb-6 h-64 overflow-y-auto">
          <h2 className="text-xl font-bold text-indigo-200 mb-4">Chat</h2>
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`mb-2 ${msg.system ? 'text-center text-gray-400' : msg.userId === user.id ? 'text-right' : 'text-left'}`}
            >
              {msg.system ? (
                <span className="text-sm text-gray-400">{msg.message}</span>
              ) : (
                <>
                  <span className="text-sm text-indigo-300">
                    {msg.userId === user.id ? 'You' : msg.username}
                  </span>
                  <p className={`inline-block p-2 rounded bg-indigo-800/80 ml-2 text-white`}>{msg.message}</p>
                </>
              )}
            </div>
          ))}
        </div>
        <form onSubmit={handleSendMessage} className="mb-4">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full p-3 rounded-lg bg-indigo-950/60 text-white mb-2 border border-indigo-400/20 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            placeholder="Type a message..."
          />
          <button
            type="submit"
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold py-3 rounded-xl transition duration-300 shadow-lg"
          >
            Send
          </button>
        </form>
        <div className="flex space-x-4 mt-4">
          <button
            onClick={handleVoiceCall}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-xl transition duration-300 shadow-lg"
          >
            Start Voice Call
          </button>
          <button
            onClick={handleVideoCall}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-xl transition duration-300 shadow-lg"
          >
            Start Video Call
          </button>
        </div>
        <button
          className="w-full mt-6 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition duration-300 shadow-lg text-lg"
          onClick={handleLeaveRoom}
        >
          Leave Room
        </button>
      </div>
    </div>
  );
}

export default memo(Room);