import { useState } from 'react';
import { Plus } from 'lucide-react';
import { api } from '@/services/api';
import { useRoomStore } from '@/stores/roomStore';

interface CreateRoomProps {
  onRoomCreated: (roomId: string) => void;
}

export function CreateRoom({ onRoomCreated }: CreateRoomProps) {
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setCurrentRoom } = useRoomStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Введите название комнаты');
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const room = await api.createRoom(name.trim());
      setCurrentRoom(room);
      onRoomCreated(room.id);
      setName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка при создании комнаты');
    } finally {
      setCreating(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mb-6">
      <div className="flex gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Название комнаты"
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={creating}
        />
        <button
          type="submit"
          disabled={creating}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <Plus className="h-5 w-5" />
          {creating ? 'Создание...' : 'Создать'}
        </button>
      </div>
      {error && (
        <div className="mt-2 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}
    </form>
  );
}
