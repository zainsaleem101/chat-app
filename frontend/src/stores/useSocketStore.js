import { create } from 'zustand';
import { io } from 'socket.io-client';

let socketInstance = null;

export const useSocketStore = create((set, get) => ({
  socket: null,
  connected: false,
  currentRoomId: null,

  initSocket: (token) => {
    if (!socketInstance) {
      console.log('Initializing socket with token');
      socketInstance = io(import.meta.env.VITE_SERVER_URL, {
        auth: { token },
        autoConnect: false,
      });
      set({ socket: socketInstance });
      // Listen for connect/disconnect
      socketInstance.on('connect', () => set({ connected: true }));
      socketInstance.on('disconnect', () => set({ connected: false }));
    } else {
      // Update the auth token if it has changed
      if (socketInstance.auth.token !== token) {
        console.log('Updating socket auth token');
        socketInstance.auth.token = token;
      }
    }
    return socketInstance;
  },

  connect: () => {
    if (socketInstance && !socketInstance.connected) {
      socketInstance.connect();
    }
  },

  disconnect: () => {
    if (socketInstance && socketInstance.connected) {
      console.log('Disconnecting socket');
      socketInstance.disconnect();
      socketInstance = null;
      set({ socket: null, connected: false, currentRoomId: null });
    }
  },

  emit: (event, payload) => {
    if (socketInstance) {
      socketInstance.emit(event, payload);
    }
  },

  on: (event, handler) => {
    if (socketInstance) {
      socketInstance.on(event, handler);
    }
  },

  off: (event, handler) => {
    if (socketInstance) {
      socketInstance.off(event, handler);
    }
  },

  getCurrentRoomId: () => {
    return socketInstance?.roomId || null;
  },

  getSocket: () => socketInstance,
})); 