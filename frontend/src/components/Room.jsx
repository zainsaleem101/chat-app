import { useState, useEffect, memo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { initSocket, getSocket, disconnectSocket } from '../utils/socket';

function Room({ session, onLogout }) {
  console.log('Room component rendering, user:', session.user.id);
  const { roomId } = useParams();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const socket = initSocket(session.access_token);

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

    if (!socket.connected) {
      console.log('Connecting socket for room:', roomId);
      socket.connect();
    }

    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
      // Only emit join-room if we're not already in the room
      if (!socket.roomId || socket.roomId !== roomId) {
        socket.emit('join-room', { roomId });
      }
    });

    socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err.message);
      setError('Failed to connect to server');
      navigate('/home');
    });

    socket.on('joined-room', (joinedRoomId) => {
      console.log('Successfully joined room:', joinedRoomId);
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

    socket.on('chat-message', ({ userId, message }) => {
      console.log('Received chat message:', { userId, message });
      setMessages((prev) => [...prev, { userId, message }]);
    });

    socket.on('user-joined', ({ userId }) => {
      console.log('User joined room:', userId);
      setMessages((prev) => [...prev, { userId, message: 'User joined the room', system: true }]);
    });

    socket.on('user-disconnected', (userId) => {
      console.log('User disconnected:', userId);
      setMessages((prev) => [...prev, { userId, message: 'User left the room', system: true }]);
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
      if (socket.connected) {
        socket.disconnect();
      }
    };
  }, [roomId, session, navigate, socket]);

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
    <div className="container mx-auto p-4 lg:w-[50%] lg:mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-bold">Chat Room - {roomId}</h1>
        <button
          onClick={() => {
            onLogout();
            navigate('/');
          }}
          className="bg-red-600 hover:bg-red-700 p-2 rounded transition duration-300 transform hover:scale-105"
        >
          Log Out
        </button>
      </div>
      {error && <p className="text-red-500 mb-4">{error}</p>}
      <div className="bg-gray-800 p-4 rounded-lg shadow-lg lg:mx-auto">
        <h2 className="text-xl font-bold mb-4">Chat</h2>
        <div className="h-64 overflow-y-auto mb-4">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`mb-2 ${msg.system ? 'text-center text-gray-400' : msg.userId === session.user.id ? 'text-right' : 'text-left'}`}
            >
              {!msg.system && (
                <span className="text-sm text-gray-400">{msg.userId === session.user.id ? 'You' : 'Other'}</span>
              )}
              <p className={`inline-block p-2 rounded ${msg.system ? '' : 'bg-gray-700'}`}>{msg.message}</p>
            </div>
          ))}
        </div>
        <form onSubmit={handleSendMessage}>
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full p-2 rounded bg-gray-700 text-white mb-2"
            placeholder="Type a message..."
          />
          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 p-2 rounded transition duration-300 transform hover:scale-105"
          >
            Send
          </button>
        </form>
        <div className="flex space-x-4 mt-4">
          <button
            onClick={handleVoiceCall}
            className="flex-1 bg-green-600 hover:bg-green-700 p-2 rounded transition duration-300 transform hover:scale-105"
          >
            Start Voice Call
          </button>
          <button
            onClick={handleVideoCall}
            className="flex-1 bg-blue-600 hover:bg-blue-700 p-2 rounded transition duration-300 transform hover:scale-105"
          >
            Start Video Call
          </button>
        </div>
      </div>
      <p className="text-center mt-4 text-gray-400">Connected to Room ID: {roomId}</p>
    </div>
  );
}

export default memo(Room);