const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { supabase } = require('./utils/supabase');
const videoCallSocket = require('./sockets/videoCall');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
});

app.use(cors());
app.use(express.json());
app.use('/auth', require('./routes/auth'));

console.log('Initializing Supabase client with URL:', process.env.SUPABASE_URL);

io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);
  videoCallSocket(io, socket);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});