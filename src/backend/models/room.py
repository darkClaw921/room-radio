from datetime import datetime
from typing import Optional
from dataclasses import dataclass, field


@dataclass
class Track:
    """Модель трека в комнате"""
    id: str
    filename: str
    url: str
    uploaded_at: datetime = field(default_factory=datetime.now)


@dataclass
class Room:
    """Модель комнаты для синхронизированного прослушивания"""
    id: str
    name: str
    created_at: datetime = field(default_factory=datetime.now)
    current_track: Optional[Track] = None
    track_position: float = 0.0  # Позиция в секундах
    is_playing: bool = False
    tracks: list[Track] = field(default_factory=list)

    def to_dict(self) -> dict:
        """Преобразование в словарь для JSON"""
        return {
            "id": self.id,
            "name": self.name,
            "created_at": self.created_at.isoformat(),
            "current_track": {
                "id": self.current_track.id,
                "filename": self.current_track.filename,
                "url": self.current_track.url,
            } if self.current_track else None,
            "track_position": self.track_position,
            "is_playing": self.is_playing,
            "tracks": [
                {
                    "id": track.id,
                    "filename": track.filename,
                    "url": track.url,
                    "uploaded_at": track.uploaded_at.isoformat(),
                }
                for track in self.tracks
            ],
        }


# Хранилище комнат в памяти
rooms: dict[str, Room] = {}
