import { create } from 'zustand';

/** Global cancel hook for the pending-send backdrop. Non-null = pending is active. */
interface PendingSendState {
  cancelHandler: (() => void) | null;
  setCancelHandler: (h: (() => void) | null) => void;
}

export const usePendingSendStore = create<PendingSendState>((set) => ({
  cancelHandler: null,
  setCancelHandler: (h) => set({ cancelHandler: h }),
}));
