import { useEffect, useRef, useState } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react';
import { useRoomStore } from '@/stores/roomStore';
import { useRoomSocket } from '@/hooks/useRoomSocket';
import { api } from '@/services/api';
import { FileUpload } from './FileUpload';

interface RoomPlayerProps {
  roomId: string;
  onLeave: () => void;
}

export function RoomPlayer({ roomId, onLeave }: RoomPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [loading, setLoading] = useState(true);
  const isSeekingRef = useRef(false);
  const lastPositionUpdateRef = useRef(0);
  const positionUpdateThrottleRef = useRef<NodeJS.Timeout | null>(null);

  const {
    currentRoom,
    tracks,
    currentTrack,
    isPlaying,
    position,
    setTracks,
    setCurrentTrack,
    setIsPlaying,
    setPosition,
  } = useRoomStore();

  const { sendPlay, sendPause, sendSeek, sendTrackChange } = useRoomSocket(roomId, audioRef);

  // Загрузка треков при входе в комнату
  useEffect(() => {
    const loadTracks = async () => {
      try {
        const roomTracks = await api.listTracks(roomId);
        setTracks(roomTracks);
        if (roomTracks.length > 0 && !currentTrack) {
          const trackToSet = currentRoom?.current_track
            ? roomTracks.find((t) => t.id === currentRoom.current_track!.id) || roomTracks[0]
            : roomTracks[0];
          setCurrentTrack(trackToSet);
        }
      } catch (err) {
        console.error('Failed to load tracks:', err);
      } finally {
        setLoading(false);
      }
    };

    loadTracks();
  }, [roomId, currentRoom, currentTrack, setTracks, setCurrentTrack]);

  // Cleanup для throttling timeout
  useEffect(() => {
    return () => {
      if (positionUpdateThrottleRef.current) {
        clearTimeout(positionUpdateThrottleRef.current);
      }
    };
  }, []);

  // Обновление источника аудио при смене трека
  useEffect(() => {
    if (audioRef.current && currentTrack) {
      // Используем относительный путь через proxy
      const newSrc = currentTrack.url;
      
      // Получаем текущий путь из src для сравнения
      let currentPath = '';
      try {
        const currentUrl = new URL(audioRef.current.src);
        currentPath = currentUrl.pathname;
      } catch {
        // Если не удалось распарсить, используем полный src
        currentPath = audioRef.current.src;
      }
      
      // Проверяем, что источник изменился
      if (!currentPath.endsWith(currentTrack.url)) {
        // Сбрасываем duration при смене трека
        setDuration(0);
        audioRef.current.src = newSrc;
        audioRef.current.load();
      }
    }
  }, [currentTrack]);

  // Синхронизация позиции (только если разница значительная, чтобы избежать заикания)
  useEffect(() => {
    if (audioRef.current && !isSeekingRef.current) {
      const currentTime = audioRef.current.currentTime;
      const diff = Math.abs(currentTime - position);
      // Обновляем только если разница больше 0.5 секунды (избегаем микро-корректировок)
      if (diff > 0.5) {
        audioRef.current.currentTime = position;
      }
    }
  }, [position]);

  // Обработчики событий аудио
  const handleTimeUpdate = () => {
    if (audioRef.current && !isSeekingRef.current) {
      const currentTime = audioRef.current.currentTime;
      const now = Date.now();
      // Throttling: обновляем позицию не чаще чем раз в 500ms
      if (now - lastPositionUpdateRef.current > 500) {
        setPosition(currentTime);
        lastPositionUpdateRef.current = now;
      } else {
        // Откладываем обновление
        if (positionUpdateThrottleRef.current) {
          clearTimeout(positionUpdateThrottleRef.current);
        }
        positionUpdateThrottleRef.current = setTimeout(() => {
          if (audioRef.current && !isSeekingRef.current) {
            setPosition(audioRef.current.currentTime);
            lastPositionUpdateRef.current = Date.now();
          }
        }, 500);
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      const newDuration = audioRef.current.duration;
      if (newDuration && isFinite(newDuration)) {
        setDuration(newDuration);
      }
    }
  };

  const handleLoadedData = () => {
    if (audioRef.current) {
      const newDuration = audioRef.current.duration;
      if (newDuration && isFinite(newDuration) && newDuration > 0) {
        setDuration(newDuration);
      }
    }
  };

  const handlePlay = async () => {
    if (audioRef.current && currentTrack) {
      try {
        isSeekingRef.current = false; // Сбрасываем флаг при play
        // Проверяем готовность аудио элемента
        if (audioRef.current.readyState >= HTMLMediaElement.HAVE_METADATA) {
          sendPlay(audioRef.current.currentTime);
          await audioRef.current.play();
          setIsPlaying(true);
        } else {
          // Если метаданные еще не загружены, ждем их
          audioRef.current.addEventListener('loadedmetadata', () => {
            sendPlay(audioRef.current!.currentTime);
            audioRef.current!.play().catch((err) => {
              console.error('Failed to play audio:', err);
              setIsPlaying(false);
            });
            setIsPlaying(true);
          }, { once: true });
        }
      } catch (err) {
        console.error('Failed to play audio:', err);
        setIsPlaying(false);
      }
    }
  };

  const handlePause = () => {
    if (audioRef.current) {
      sendPause(audioRef.current.currentTime);
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPosition = parseFloat(e.target.value);
    if (audioRef.current) {
      isSeekingRef.current = true;
      audioRef.current.currentTime = newPosition;
      sendSeek(newPosition);
      setPosition(newPosition);
      // Сбрасываем флаг через небольшую задержку
      setTimeout(() => {
        isSeekingRef.current = false;
      }, 100);
    }
  };

  const handleTrackSelect = (trackId: string) => {
    const track = tracks.find((t) => t.id === trackId);
    if (track) {
      sendTrackChange(trackId);
      setCurrentTrack(track);
      setPosition(0);
      setIsPlaying(false);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  const toggleMute = () => {
    setMuted(!muted);
    if (audioRef.current) {
      audioRef.current.muted = !muted;
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8 text-gray-500">
        Загрузка комнаты...
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900">
            {currentRoom?.name || 'Комната'}
          </h2>
          <button
            onClick={onLeave}
            className="px-4 py-2 text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Покинуть комнату
          </button>
        </div>

        <FileUpload
          roomId={roomId}
          onUploadComplete={async () => {
            const roomTracks = await api.listTracks(roomId);
            setTracks(roomTracks);
          }}
        />
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <audio
          ref={audioRef}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onLoadedData={handleLoadedData}
          onCanPlay={() => {
            // Дополнительная проверка duration при готовности к воспроизведению
            if (audioRef.current && duration === 0) {
              const newDuration = audioRef.current.duration;
              if (newDuration && isFinite(newDuration) && newDuration > 0) {
                setDuration(newDuration);
              }
            }
          }}
          onEnded={() => {
            setIsPlaying(false);
            setPosition(0);
          }}
          crossOrigin="anonymous"
        />

        {currentTrack ? (
          <>
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                {currentTrack.filename}
              </h3>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span>{formatTime(position)}</span>
                <span>/</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            <div className="mb-4">
              <input
                type="range"
                min="0"
                max={duration || 0}
                value={position}
                onChange={handleSeek}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-center gap-4 mb-4">
              <button
                onClick={() => {
                  const currentIndex = tracks.findIndex((t) => t.id === currentTrack.id);
                  const prevTrack = tracks[currentIndex - 1];
                  if (prevTrack) {
                    handleTrackSelect(prevTrack.id);
                  }
                }}
                disabled={tracks.findIndex((t) => t.id === currentTrack.id) === 0}
                className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <SkipBack className="h-6 w-6" />
              </button>

              <button
                onClick={isPlaying ? handlePause : handlePlay}
                className="p-4 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
              >
                {isPlaying ? (
                  <Pause className="h-8 w-8" />
                ) : (
                  <Play className="h-8 w-8" />
                )}
              </button>

              <button
                onClick={() => {
                  const currentIndex = tracks.findIndex((t) => t.id === currentTrack.id);
                  const nextTrack = tracks[currentIndex + 1];
                  if (nextTrack) {
                    handleTrackSelect(nextTrack.id);
                  }
                }}
                disabled={tracks.findIndex((t) => t.id === currentTrack.id) === tracks.length - 1}
                className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <SkipForward className="h-6 w-6" />
              </button>
            </div>

            <div className="flex items-center gap-4">
              <button onClick={toggleMute} className="p-2 hover:bg-gray-100 rounded-full">
                {muted ? (
                  <VolumeX className="h-5 w-5 text-gray-600" />
                ) : (
                  <Volume2 className="h-5 w-5 text-gray-600" />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={handleVolumeChange}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-gray-500">
            Нет треков в комнате. Загрузите первый трек выше.
          </div>
        )}
      </div>

      {tracks.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Список треков</h3>
          <div className="space-y-2">
            {tracks.map((track) => (
              <div
                key={track.id}
                onClick={() => handleTrackSelect(track.id)}
                className={`p-3 rounded-lg cursor-pointer transition-colors ${
                  track.id === currentTrack?.id
                    ? 'bg-blue-100 border-2 border-blue-500'
                    : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-gray-900">{track.filename}</span>
                  {track.id === currentTrack?.id && (
                    <span className="text-sm text-blue-600 font-medium">Сейчас играет</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
