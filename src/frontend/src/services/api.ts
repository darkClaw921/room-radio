const API_BASE_URL = '/api';

export interface Room {
  id: string;
  name: string;
  created_at: string;
  current_track: {
    id: string;
    filename: string;
    url: string;
  } | null;
  track_position: number;
  is_playing: boolean;
  tracks: Array<{
    id: string;
    filename: string;
    url: string;
    uploaded_at: string;
  }>;
}

export interface Track {
  id: string;
  filename: string;
  url: string;
  uploaded_at: string;
}

export interface CreateRoomRequest {
  name: string;
}

export const api = {
  async createRoom(name: string): Promise<Room> {
    const response = await fetch(`${API_BASE_URL}/rooms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name }),
    });
    if (!response.ok) {
      throw new Error('Failed to create room');
    }
    return response.json();
  },

  async listRooms(): Promise<Room[]> {
    const response = await fetch(`${API_BASE_URL}/rooms`);
    if (!response.ok) {
      throw new Error('Failed to fetch rooms');
    }
    return response.json();
  },

  async getRoom(roomId: string): Promise<Room> {
    const response = await fetch(`${API_BASE_URL}/rooms/${roomId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch room');
    }
    return response.json();
  },

  async uploadTrack(roomId: string, file: File): Promise<Track> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/rooms/${roomId}/upload`, {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to upload track');
    }
    return response.json();
  },

  async listTracks(roomId: string): Promise<Track[]> {
    const response = await fetch(`${API_BASE_URL}/rooms/${roomId}/tracks`);
    if (!response.ok) {
      throw new Error('Failed to fetch tracks');
    }
    return response.json();
  },
};
