import { create } from 'zustand';
import { io } from 'socket.io-client';

export const socket = io('http://localhost:5000');

socket.emit('join-workspace');

const useStore = create((set, get) => {
  // Listen for socket events
  socket.on('tile-moved', (payload) => {
    get().syncTilePosition(payload.id, payload.x, payload.y);
  });

  socket.on('chat-message', (payload) => {
    get().addMessage(payload, false); // false = don't emit back to socket
  });

  return {
    tiles: [
      {
        id: 'term-1',
        title: 'Local Terminal',
        x: 100,
        y: 100,
        width: 500,
        height: 350,
        type: 'terminal'
      },
      {
        id: 'chat-1',
        title: 'Team Chat',
        x: 650,
        y: 100,
        width: 350,
        height: 500,
        type: 'chat'
      }
    ],
    messages: [
      { id: '1', text: 'Welcome to the workspace!', sender: 'System' }
    ],

    // Update locally AND emit to server
    updateTilePosition: (id, x, y) => {
      set((state) => ({
        tiles: state.tiles.map((tile) =>
          tile.id === id ? { ...tile, x, y } : tile
        ),
      }));
      socket.emit('tile-moved', { id, x, y });
    },

    // Update locally ONLY (used when receiving from server)
    syncTilePosition: (id, x, y) => {
      set((state) => ({
        tiles: state.tiles.map((tile) =>
          tile.id === id ? { ...tile, x, y } : tile
        ),
      }));
    },

    // Add message locally, optionally emit to server
    addMessage: (message, emit = true) => {
      const newMsg = { ...message, id: Date.now().toString() };
      set((state) => ({
        messages: [...state.messages, newMsg]
      }));
      if (emit) {
        socket.emit('chat-message', newMsg);
      }
    }
  };
});

export default useStore;
