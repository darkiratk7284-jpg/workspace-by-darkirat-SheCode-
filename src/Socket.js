import { io } from 'socket.io-client';

// Use the environment variable in production (set in Vercel dashboard),
// or fall back to localhost for local development.
const BACKEND_URL =
    process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

let socket;

export const initSocket = () => {

    // Always create a fresh socket — allows reconnecting after leaving a room.
    socket = io(BACKEND_URL, {
        transports: ['websocket'],
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
    });

    return socket;

};