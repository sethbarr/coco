import { io, Socket } from 'socket.io-client';

// In production the socket server is the same origin that serves the app
const SOCKET_URL =
  process.env.REACT_APP_SOCKET_URL ||
  (process.env.NODE_ENV === 'production' ? window.location.origin : 'http://localhost:3001');

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket || socket.disconnected) {
    socket = io(SOCKET_URL, {
      auth: { token: localStorage.getItem('token') },
      withCredentials: true,
    });
  }
  return socket;
}

export function joinSession(sessionId: string): Socket {
  const s = getSocket();
  s.emit('session:join', sessionId, (res: { ok?: boolean; error?: string }) => {
    if (res?.error) console.error('session:join failed:', res.error);
  });
  return s;
}

export function leaveSession(sessionId: string): void {
  socket?.emit('session:leave', sessionId);
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}
