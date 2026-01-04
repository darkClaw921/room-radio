import { useEffect, useState } from 'react';
import { Music, Users } from 'lucide-react';
import { api, Room } from '@/services/api';
import { useRoomStore } from '@/stores/roomStore';

interface RoomListProps {
  onRoomSelect: (roomId: string) => void;
}

export function RoomList({ onRoomSelect }: RoomListProps) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const { setCurrentRoom } = useRoomStore();

  const loadRooms = async () => {
    try {
      const data = await api.listRooms();
      setRooms(data);
    } catch (err) {
      console.error('Failed to load rooms:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRooms();
    const interval = setInterval(loadRooms, 5000); // Обновление каждые 5 секунд
    return () => clearInterval(interval);
  }, []);

  const handleRoomClick = async (room: Room) => {
    try {
      const fullRoom = await api.getRoom(room.id);
      setCurrentRoom(fullRoom);
      onRoomSelect(room.id);
    } catch (err) {
      console.error('Failed to load room:', err);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8 text-gray-500">
        Загрузка комнат...
      </div>
    );
  }

  if (rooms.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        Нет активных комнат. Создайте новую комнату выше.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {rooms.map((room) => (
        <div
          key={room.id}
          onClick={() => handleRoomClick(room)}
          className="p-6 border border-gray-300 rounded-lg hover:border-blue-500 hover:shadow-lg transition-all cursor-pointer bg-white"
        >
          <div className="flex items-start justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 truncate flex-1">
              {room.name}
            </h3>
            <Music className="h-5 w-5 text-gray-400 flex-shrink-0 ml-2" />
          </div>
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span>{room.tracks.length} треков</span>
            </div>
            {room.current_track && (
              <div className="text-xs text-gray-500 truncate">
                Сейчас: {room.current_track.filename}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
