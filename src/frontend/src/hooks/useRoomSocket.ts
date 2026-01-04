import { useEffect, useRef, useCallback } from 'react';
import { useRoomStore } from '@/stores/roomStore';

interface SocketMessage {
  type: string;
  data?: any;
  position?: number;
  timestamp?: number;
  track?: {
    id: string;
    filename: string;
    url: string;
  };
  track_id?: string;
}

export function useRoomSocket(roomId: string | null, audioRef: React.RefObject<HTMLAudioElement>) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { setCurrentTrack, setIsPlaying, setPosition, setTracks } = useRoomStore();
  const isLocalActionRef = useRef(false);

  const connect = useCallback(() => {
    if (!roomId) return;

    // Используем относительный путь через proxy
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/${roomId}`;
    
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('WebSocket connected');
    };

    ws.onmessage = (event) => {
      const message: SocketMessage = JSON.parse(event.data);

      if (message.type === 'state_update') {
        // Получение начального состояния комнаты
        const { current_track, track_position, is_playing } = message.data;
        if (current_track) {
          setCurrentTrack({
            id: current_track.id,
            filename: current_track.filename,
            url: current_track.url,
            uploaded_at: '',
          });
        }
        setPosition(track_position);
        setIsPlaying(is_playing);
        if (audioRef.current) {
          audioRef.current.currentTime = track_position;
          if (is_playing) {
            // Безопасное воспроизведение при получении начального состояния
            const playAudio = async () => {
              try {
                if (audioRef.current && audioRef.current.readyState >= HTMLMediaElement.HAVE_METADATA) {
                  await audioRef.current.play();
                } else {
                  // Ждем загрузки метаданных
                  const onLoadedMetadata = () => {
                    if (audioRef.current) {
                      audioRef.current.play().catch((err) => {
                        console.error('Failed to play audio on state update:', err);
                        setIsPlaying(false);
                      });
                    }
                  };
                  audioRef.current.addEventListener('loadedmetadata', onLoadedMetadata, { once: true });
                }
              } catch (err) {
                console.error('Failed to play audio on state update:', err);
                setIsPlaying(false);
              }
            };
            playAudio();
          }
        }
      } else if (message.type === 'play' && !isLocalActionRef.current) {
        // Синхронизация play
        if (audioRef.current) {
          const timestamp = message.timestamp || 0;
          audioRef.current.currentTime = timestamp;
          
          // Безопасное воспроизведение с проверкой готовности
          const playAudio = async () => {
            try {
              if (audioRef.current && audioRef.current.readyState >= HTMLMediaElement.HAVE_METADATA) {
                await audioRef.current.play();
                setIsPlaying(true);
              } else {
                // Ждем загрузки метаданных
                const onLoadedMetadata = () => {
                  if (audioRef.current) {
                    audioRef.current.play().catch((err) => {
                      console.error('Failed to play audio from socket:', err);
                      setIsPlaying(false);
                    });
                    setIsPlaying(true);
                  }
                };
                audioRef.current.addEventListener('loadedmetadata', onLoadedMetadata, { once: true });
              }
            } catch (err) {
              console.error('Failed to play audio from socket:', err);
              setIsPlaying(false);
            }
          };
          
          playAudio();
        }
      } else if (message.type === 'pause' && !isLocalActionRef.current) {
        // Синхронизация pause
        if (audioRef.current) {
          audioRef.current.pause();
          if (message.position !== undefined) {
            audioRef.current.currentTime = message.position;
            setPosition(message.position);
          }
        }
        setIsPlaying(false);
      } else if (message.type === 'seek' && !isLocalActionRef.current) {
        // Синхронизация seek (только если разница значительная)
        if (audioRef.current && message.position !== undefined) {
          const currentTime = audioRef.current.currentTime;
          const diff = Math.abs(currentTime - message.position);
          // Обновляем только если разница больше 0.5 секунды
          if (diff > 0.5) {
            audioRef.current.currentTime = message.position;
            setPosition(message.position);
          }
        }
      } else if (message.type === 'track_change' && !isLocalActionRef.current) {
        // Синхронизация смены трека
        if (message.track) {
          setCurrentTrack({
            id: message.track.id,
            filename: message.track.filename,
            url: message.track.url,
            uploaded_at: '',
          });
          setPosition(0);
          setIsPlaying(false);
          if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
          }
        }
      }

      isLocalActionRef.current = false;
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      // Попытка переподключения через 3 секунды
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, 3000);
    };

    wsRef.current = ws;
  }, [roomId, audioRef, setCurrentTrack, setIsPlaying, setPosition, setTracks]);

  const sendMessage = useCallback((message: SocketMessage) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      isLocalActionRef.current = true;
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  const sendPlay = useCallback((timestamp: number = 0) => {
    sendMessage({ type: 'play', timestamp });
  }, [sendMessage]);

  const sendPause = useCallback((position: number) => {
    sendMessage({ type: 'pause', position });
  }, [sendMessage]);

  const sendSeek = useCallback((position: number) => {
    sendMessage({ type: 'seek', position });
  }, [sendMessage]);

  const sendTrackChange = useCallback((trackId: string) => {
    sendMessage({ type: 'track_change', track_id: trackId });
  }, [sendMessage]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  return {
    sendPlay,
    sendPause,
    sendSeek,
    sendTrackChange,
  };
}
