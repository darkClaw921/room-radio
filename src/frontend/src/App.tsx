import { useState } from 'react';
import { CreateRoom } from './components/CreateRoom';
import { RoomList } from './components/RoomList';
import { RoomPlayer } from './components/RoomPlayer';
import { useRoomStore } from './stores/roomStore';

function App() {
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const { reset } = useRoomStore();

  const handleRoomCreated = (roomId: string) => {
    setSelectedRoomId(roomId);
  };

  const handleRoomSelect = (roomId: string) => {
    setSelectedRoomId(roomId);
  };

  const handleLeaveRoom = () => {
    setSelectedRoomId(null);
    reset();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Room Radio</h1>
          <p className="text-gray-600">Синхронизированное прослушивание музыки в комнатах</p>
        </header>

        {selectedRoomId ? (
          <RoomPlayer roomId={selectedRoomId} onLeave={handleLeaveRoom} />
        ) : (
          <>
            <div className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Создать новую комнату</h2>
              <CreateRoom onRoomCreated={handleRoomCreated} />
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Активные комнаты</h2>
              <RoomList onRoomSelect={handleRoomSelect} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default App;
