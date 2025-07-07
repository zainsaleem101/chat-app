import { useState, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocketStore } from '../stores/useSocketStore';
import { useAuth } from '../stores/useAuthStore';

function Home() {
  const [roomId, setRoomId] = useState('');
  const [error, setError] = useState('');
  const [newRoomId, setNewRoomId] = useState('');
  const navigate = useNavigate();
  const { user, accessToken, logout, username } = useAuth();
  const { initSocket } = useSocketStore();

  const handleCreateRoom = () => {
    console.log('Creating new room');
    const socket = initSocket(accessToken);
    
    // Set up event listeners first
    socket.on('room-created', (data) => {
      const roomId = typeof data === 'string' ? data : data.roomId;
      console.log('Room created with ID:', roomId);
      setNewRoomId(roomId);
      // Clean up listeners before navigation
      socket.off('room-created');
      socket.off('error');
      navigate(`/room/${roomId}`);
    });
    socket.on('error', (msg) => {
      console.error('Create room error:', msg);
      setError(msg);
      socket.off('room-created');
      socket.off('error');
    });

    // Connect and emit create-room
    if (!socket.connected) {
      console.log('Connecting socket for room creation...');
      socket.connect();
      socket.on('connect', () => {
        console.log('Socket connected for room creation:', socket.id);
        socket.emit('create-room');
      });
    } else {
      // If already connected, emit create-room immediately
      console.log('Socket already connected, emitting create-room immediately...');
      socket.emit('create-room');
    }
  };

  const handleJoinRoom = (e) => {
    e.preventDefault();
    if (roomId) {
      console.log('Joining room:', roomId);
      const socket = initSocket(accessToken);
      
      // Set up event listeners first
      socket.on('joined-room', (data) => {
        const joinedRoomId = typeof data === 'string' ? data : data.roomId;
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
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-indigo-900 to-purple-900">
      <div className="bg-white/10 backdrop-blur-md p-10 rounded-2xl shadow-2xl w-full max-w-md border border-white/20">
        <div className="flex flex-col items-center mb-6">
          <h2 className="text-xl font-semibold text-indigo-200 mb-4">Welcome, {username}</h2>
        </div>
        <div className="space-y-8">
          <div>
            <button
              onClick={handleCreateRoom}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold py-3 rounded-xl transition duration-300 shadow-lg"
            >
              Create New Chat
            </button>
            {newRoomId && (
              <div className="mt-4 p-4 bg-indigo-900/60 rounded-xl border border-indigo-400/30">
                <p className="text-green-300">Room Created! Share this ID:</p>
                <p className="text-2xl font-mono text-indigo-100">{newRoomId}</p>
                <button
                  onClick={() => navigator.clipboard.writeText(newRoomId)}
                  className="mt-2 bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-lg transition duration-300"
                >
                  Copy Room ID
                </button>
              </div>
            )}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-indigo-200 mb-2">Join a Chat</h3>
            <form onSubmit={handleJoinRoom}>
              <input
                type="text"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                className="w-full p-3 rounded-lg bg-indigo-950/60 text-white mb-2 border border-indigo-400/20 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                placeholder="Enter Room ID"
              />
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold py-3 rounded-xl transition duration-300 shadow-lg"
              >
                Join Chat
              </button>
            </form>
          </div>
          {error && <p className="text-red-400 mt-4 text-center">{error}</p>}
        </div>
      </div>
    </div>
  );
}

export default memo(Home);