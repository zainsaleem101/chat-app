import { useState, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { initSocket } from '../utils/socket';

function Home({ session, onLogout }) {
  console.log('Home component rendering, user:', session.user.id, 'token:', session.access_token);
  const [roomId, setRoomId] = useState('');
  const [error, setError] = useState('');
  const [newRoomId, setNewRoomId] = useState('');
  const navigate = useNavigate();

  const handleCreateRoom = () => {
    console.log('Creating new room with token:', session.access_token);
    const socket = initSocket(session.access_token);
    if (!socket.connected) {
      socket.connect();
    }
    socket.on('connect', () => {
      console.log('Socket connected for room creation:', socket.id);
      socket.emit('create-room');
    });
    socket.on('room-created', (roomId) => {
      console.log('Room created with ID:', roomId);
      setNewRoomId(roomId);
      navigate(`/room/${roomId}`);
    });
    socket.on('error', (msg) => {
      console.error('Create room error:', msg);
      setError(msg);
    });
  };

  const handleJoinRoom = (e) => {
    e.preventDefault();
    if (roomId) {
      console.log('Joining room:', roomId);
      const socket = initSocket(session.access_token);
      
      // Set up event listeners first
      socket.on('joined-room', (joinedRoomId) => {
        console.log('Joined room with ID:', joinedRoomId);
        console.log('Navigating to room page...');
        socket.off('joined-room');
        socket.off('room-full');
        socket.off('error');
        navigate(`/room/${joinedRoomId}`);
      });
      socket.on('room-full', (msg) => {
        console.error('Room full:', msg);
        setError(msg);
        socket.off('joined-room');
        socket.off('room-full');
        socket.off('error');
      });
      socket.on('error', (msg) => {
        console.error('Join room error:', msg);
        setError(msg);
        socket.off('joined-room');
        socket.off('room-full');
        socket.off('error');
      });

      // Then connect and emit join-room
      console.log('Socket connection status:', socket.connected);
      if (!socket.connected) {
        console.log('Connecting socket...');
        socket.connect();
        socket.on('connect', () => {
          console.log('Socket connected for joining room:', socket.id);
          // Small delay to ensure socket is fully ready
          setTimeout(() => {
            console.log('Emitting join-room event...');
            socket.emit('join-room', { roomId });
          }, 100);
        });
      } else {
        // If already connected, emit join-room immediately
        console.log('Socket already connected, emitting join-room event immediately...');
        socket.emit('join-room', { roomId });
      }
    } else {
      setError('Please enter a Room ID');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-md">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Video Chat</h1>
          <button
            onClick={onLogout}
            className="bg-red-600 hover:bg-red-700 p-2 rounded transition duration-300 transform hover:scale-105"
          >
            Log Out
          </button>
        </div>
        <h2 className="text-2xl font-semibold mb-4 text-center">Welcome, {session.user.email}</h2>
        <div className="space-y-6">
          <div>
            <button
              onClick={handleCreateRoom}
              className="w-full bg-indigo-600 hover:bg-indigo-700 p-3 rounded-lg transition duration-300 transform hover:scale-105"
            >
              Create New Chat
            </button>
            {newRoomId && (
              <div className="mt-4 p-4 bg-gray-700 rounded-lg">
                <p className="text-green-400">Room Created! Share this ID:</p>
                <p className="text-xl font-mono">{newRoomId}</p>
                <button
                  onClick={() => navigator.clipboard.write(newRoomId)}
                  className="mt-2 bg-indigo-500 hover:bg-indigo-600 p-2 rounded transition duration-300"
                >
                  Copy Room ID
                </button>
              </div>
            )}
          </div>
          <div>
            <h3 className="text-xl font-semibold mb-2">Join a Chat</h3>
            <form onSubmit={handleJoinRoom}>
              <input
                type="text"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                className="w-full p-2 rounded bg-gray-700 text-white mb-2"
                placeholder="Enter Room ID"
              />
              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 p-3 rounded-lg transition duration-300 transform hover:scale-105"
              >
                Join Chat
              </button>
            </form>
          </div>
          {error && <p className="text-red-500 mt-4">{error}</p>}
        </div>
      </div>
    </div>
  );
}

export default memo(Home);