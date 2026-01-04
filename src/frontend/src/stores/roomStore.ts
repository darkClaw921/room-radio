import { create } from 'zustand';
import { Room, Track } from '@/services/api';

interface RoomState {
  currentRoom: Room | null;
  tracks: Track[];
  currentTrack: Track | null;
  isPlaying: boolean;
  position: number;
  setCurrentRoom: (room: Room | null) => void;
  setTracks: (tracks: Track[]) => void;
  setCurrentTrack: (track: Track | null) => void;
  setIsPlaying: (playing: boolean) => void;
  setPosition: (position: number) => void;
  addTrack: (track: Track) => void;
  reset: () => void;
}

export const useRoomStore = create<RoomState>((set) => ({
  currentRoom: null,
  tracks: [],
  currentTrack: null,
  isPlaying: false,
  position: 0,
  setCurrentRoom: (room) => set({ currentRoom: room }),
  setTracks: (tracks) => set({ tracks }),
  setCurrentTrack: (track) => set({ currentTrack: track }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setPosition: (position) => set({ position }),
  addTrack: (track) => set((state) => ({ tracks: [...state.tracks, track] })),
  reset: () =>
    set({
      currentRoom: null,
      tracks: [],
      currentTrack: null,
      isPlaying: false,
      position: 0,
    }),
}));
