import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

let _socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!_socket) {
    _socket = io(
      (import.meta.env.VITE_API_URL as string)?.replace('/api', '') || 'http://localhost:5000',
      { transports: ['websocket', 'polling'], autoConnect: true }
    );
  }
  return _socket;
};

type SocketListeners = Record<string, (...args: unknown[]) => void>;

export const useSocket = (room: string | null, listeners: SocketListeners = {}) => {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = getSocket();
    socketRef.current = socket;

    if (room) socket.emit(room);

    Object.entries(listeners).forEach(([event, fn]) => socket.on(event, fn));

    return () => {
      Object.entries(listeners).forEach(([event, fn]) => socket.off(event, fn));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return socketRef;
};
