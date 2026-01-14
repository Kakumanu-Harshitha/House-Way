import { io } from 'socket.io-client';
import { getSocketBaseUrl } from './network';

const SOCKET_URL = getSocketBaseUrl();

// Create socket instance
const socket = io(SOCKET_URL, {
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  timeout: 10000,
});

export default socket;