const { supabase } = require('../utils/supabase');
const { v4: uuidv4 } = require('uuid');

module.exports = (io, socket) => {
  socket.on('create-room', async () => {
    const token = socket.handshake.auth.token;
    console.log('Received create-room event, using socket auth token');
    if (!token) {
      console.error('No token provided for create-room');
      socket.emit('error', 'No authentication token provided');
      return;
    }
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error) {
      console.error('Supabase getUser error:', error.message);
      socket.emit('error', `Authentication failed: ${error.message}`);
      return;
    }
    if (!user || !user.email_confirmed_at) {
      console.error('User not found or email not verified:', user);
      socket.emit('error', 'Authentication failed or email not verified');
      return;
    }

    const roomId = uuidv4();
    socket.join(roomId);
    socket.userId = user.id;
    socket.username = user.email.split('@')[0];
    socket.roomId = roomId;
    console.log(`Room created by user: ${socket.username}`);
    socket.emit('room-created', { roomId, userId: user.id, username: socket.username });
    // Also emit joined-room event for consistency
    socket.emit('joined-room', { roomId, userId: user.id, username: socket.username });
  });

  socket.on('join-room', async ({ roomId }) => {
    const token = socket.handshake.auth.token;
    console.log(`Join-room event for room: ${roomId}, using socket auth token`);
    // console.log(`Socket ID: ${socket.id}, Token: ${token ? 'present' : 'missing'}`);
    if (!token) {
      console.error('No token provided for join-room');
      socket.emit('error', 'No authentication token provided');
      return;
    }
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error) {
      console.error('Supabase getUser error:', error.message);
      socket.emit('error', `Authentication failed: ${error.message}`);
      return;
    }
    if (!user || !user.email_confirmed_at) {
      console.error('User not found or email not verified:', user);
      socket.emit('error', 'Authentication failed or email not verified');
      return;
    }

    // Check if user is already in this room
    if (socket.roomId === roomId) {
      console.log(`User ${user.id} is already in room: ${roomId}`);
      socket.emit('joined-room', { roomId, userId: user.id, username: socket.username });
      return;
    }

    const clientsInRoom = io.sockets.adapter.rooms.get(roomId) || new Set();
    if (clientsInRoom.size >= 2) {
      console.log(`Room ${roomId} is full`);
      socket.emit('room-full', 'Room is full');
      return;
    }

    socket.join(roomId);
    socket.userId = user.id;
    socket.username = user.email.split('@')[0];
    socket.roomId = roomId;
    console.log(`User ${socket.username} joined room`);

    // Emit joined-room event to confirm successful room joining
    console.log(`Emitting joined-room event to all sockets in room ${roomId}`);
    io.to(roomId).emit('joined-room', { roomId, userId: user.id, username: socket.username });

    // Check room size after joining
    const updatedClientsInRoom = io.sockets.adapter.rooms.get(roomId) || new Set();
    console.log(`Updated clients in room ${roomId}: ${updatedClientsInRoom.size}`);
    if (updatedClientsInRoom.size === 1) {
      console.log(`First user in room ${roomId}, emitting ready event`);
      io.to(roomId).emit('ready', { userId: user.id, username: socket.username });
    }
  });

  // socket.on('i-joined-room', ({ roomId, userId, username }) => {
  //   console.log(`User ${username} joined room ${roomId}`);
  //   socket.emit('joined-room', { roomId, userId, username });
  // });

  socket.on('leave-room', ({ roomId }) => {
    console.log(`User ${socket.userId} left room: ${roomId}`);
    socket.leave(roomId);
    socket.roomId = null;
    socket.userId = null;
    socket.emit('user-disconnected', roomId);
  });

  socket.on('offer', ({ roomId, offer }) => {
    console.log(`Offer sent to room: ${roomId}`);
    socket.to(roomId).emit('offer', offer);
  });

  socket.on('answer', ({ roomId, answer }) => {
    console.log(`Answer sent to room: ${roomId}`);
    socket.to(roomId).emit('answer', answer);
  });

  socket.on('ice-candidate', ({ roomId, candidate }) => {
    console.log(`ICE candidate sent to room: ${roomId}`);
    socket.to(roomId).emit('ice-candidate', candidate);
  });

  socket.on('chat-message', ({ roomId, message }) => {
    console.log(`Chat message in room ${roomId}: ${message}`);
    io.to(roomId).emit('chat-message', { userId: socket.userId, username: socket.username, message });
  });

  socket.on('disconnect', () => {
    if (socket.roomId) {
      console.log(`User ${socket.userId} disconnected from room: ${socket.roomId}`);
      io.to(socket.roomId).emit('user-disconnected', { userId: socket.userId, username: socket.username });
    }
  });
};