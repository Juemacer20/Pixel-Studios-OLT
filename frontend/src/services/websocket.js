import { io } from 'socket.io-client';

let socket = null;

export function getSocket(token) {
  if (socket?.connected) return socket;

  socket = io(import.meta.env.VITE_WS_URL || '', {
    auth: { token },
    transports: ['websocket', 'polling'],
    autoConnect: true,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 10,
  });

  socket.on('connect', () => console.log('WebSocket connected'));
  socket.on('disconnect', (reason) => console.log('WebSocket disconnected:', reason));
  socket.on('connect_error', (err) => console.error('WebSocket error:', err.message));

  return socket;
}

export function subscribeToAll(socket) {
  socket.emit('subscribe:all');
}

export function subscribeToOLT(socket, oltId) {
  socket.emit('subscribe:olt', oltId);
}

export function subscribeToONT(socket, ontId) {
  socket.emit('subscribe:ont', ontId);
}

export function disconnectSocket() {
  if (socket) { socket.disconnect(); socket = null; }
}

export { socket };
