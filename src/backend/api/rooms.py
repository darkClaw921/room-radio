from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List
import uuid

from ..models.room import Room, rooms


router = APIRouter(prefix="/api/rooms", tags=["rooms"])


class CreateRoomRequest(BaseModel):
    name: str


class RoomResponse(BaseModel):
    id: str
    name: str
    created_at: str
    current_track: dict | None
    track_position: float
    is_playing: bool
    tracks: List[dict]


@router.post("", response_model=RoomResponse)
async def create_room(request: CreateRoomRequest):
    """Создание новой комнаты"""
    room_id = str(uuid.uuid4())
    room = Room(id=room_id, name=request.name)
    rooms[room_id] = room
    return room.to_dict()


@router.get("", response_model=List[RoomResponse])
async def list_rooms():
    """Получение списка всех активных комнат"""
    return [room.to_dict() for room in rooms.values()]


@router.get("/{room_id}", response_model=RoomResponse)
async def get_room(room_id: str):
    """Получение информации о комнате"""
    if room_id not in rooms:
        raise HTTPException(status_code=404, detail="Room not found")
    return rooms[room_id].to_dict()
