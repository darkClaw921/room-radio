from fastapi import WebSocket, WebSocketDisconnect
from typing import Dict, Set
import json
import asyncio

from ..models.room import rooms


class RoomManager:
    """Менеджер WebSocket соединений для синхронизации воспроизведения"""

    def __init__(self):
        # room_id -> set of WebSocket connections
        self.active_connections: Dict[str, Set[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, room_id: str):
        """Подключение клиента к комнате"""
        await websocket.accept()

        if room_id not in self.active_connections:
            self.active_connections[room_id] = set()

        self.active_connections[room_id].add(websocket)

        # Отправка текущего состояния комнаты новому клиенту
        if room_id in rooms:
            room = rooms[room_id]
            await self.send_state_update(websocket, room)

    def disconnect(self, websocket: WebSocket, room_id: str):
        """Отключение клиента от комнаты"""
        if room_id in self.active_connections:
            self.active_connections[room_id].discard(websocket)
            if not self.active_connections[room_id]:
                del self.active_connections[room_id]

    async def send_state_update(self, websocket: WebSocket, room):
        """Отправка текущего состояния комнаты клиенту"""
        message = {
            "type": "state_update",
            "data": {
                "current_track": {
                    "id": room.current_track.id,
                    "filename": room.current_track.filename,
                    "url": room.current_track.url,
                } if room.current_track else None,
                "track_position": room.track_position,
                "is_playing": room.is_playing,
            }
        }
        await websocket.send_text(json.dumps(message))

    async def broadcast_to_room(self, room_id: str, message: dict, exclude: WebSocket = None):
        """Отправка сообщения всем клиентам в комнате, кроме исключенного"""
        if room_id not in self.active_connections:
            return

        message_json = json.dumps(message)
        disconnected = set()

        for connection in self.active_connections[room_id]:
            if connection == exclude:
                continue
            try:
                await connection.send_text(message_json)
            except Exception:
                disconnected.add(connection)

        # Удаление отключенных соединений
        for connection in disconnected:
            self.active_connections[room_id].discard(connection)

    async def handle_message(self, websocket: WebSocket, room_id: str, message: dict):
        """Обработка сообщения от клиента"""
        if room_id not in rooms:
            await websocket.send_text(json.dumps({
                "type": "error",
                "message": "Room not found"
            }))
            return

        room = rooms[room_id]
        msg_type = message.get("type")

        if msg_type == "play":
            room.is_playing = True
            await self.broadcast_to_room(room_id, {
                "type": "play",
                "timestamp": message.get("timestamp", 0),
            }, exclude=websocket)

        elif msg_type == "pause":
            room.is_playing = False
            room.track_position = message.get("position", room.track_position)
            await self.broadcast_to_room(room_id, {
                "type": "pause",
                "position": room.track_position,
            }, exclude=websocket)

        elif msg_type == "seek":
            position = message.get("position", 0)
            room.track_position = position
            await self.broadcast_to_room(room_id, {
                "type": "seek",
                "position": position,
            }, exclude=websocket)

        elif msg_type == "track_change":
            track_id = message.get("track_id")
            track = next((t for t in room.tracks if t.id == track_id), None)
            if track:
                room.current_track = track
                room.track_position = 0.0
                room.is_playing = False
                await self.broadcast_to_room(room_id, {
                    "type": "track_change",
                    "track": {
                        "id": track.id,
                        "filename": track.filename,
                        "url": track.url,
                    },
                }, exclude=websocket)

        elif msg_type == "position_update":
            # Обновление позиции без broadcast (для синхронизации)
            room.track_position = message.get("position", room.track_position)


# Глобальный экземпляр менеджера
room_manager = RoomManager()
