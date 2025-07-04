import { io } from 'socket.io-client';

let socketInstance = null;

export const initSocket = (token) => {
  if (!socketInstance) {
    console.log('Initializing socket with token');
    socketInstance = io(import.meta.env.VITE_SERVER_URL, {
      auth: { token },
      autoConnect: false,
    });
  } else {
    // Update the auth token if it has changed
    if (socketInstance.auth.token !== token) {
      console.log('Updating socket auth token');
      socketInstance.auth.token = token;
    }
  }
  return socketInstance;
};

export const getSocket = () => socketInstance;

export const disconnectSocket = () => {
  if (socketInstance && socketInstance.connected) {
    console.log('Disconnecting socket');
    socketInstance.disconnect();
    socketInstance = null;
  }
};