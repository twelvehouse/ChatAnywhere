import { create } from 'zustand';

/**
 * Live session state derived from SSE (player identity + connection status).
 * Not persisted — repopulated by SSE on each connect.
 */
interface SessionState {
  playerName: string;
  playerWorld: string;
  isConnected: boolean;
  setPlayer: (name: string, world: string) => void;
  setConnected: (connected: boolean) => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  playerName: '',
  playerWorld: '',
  isConnected: false,
  setPlayer: (name, world) => set({ playerName: name, playerWorld: world }),
  setConnected: (connected) => set({ isConnected: connected }),
}));
