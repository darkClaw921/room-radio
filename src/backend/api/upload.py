from fastapi import APIRouter, UploadFile, File, HTTPException
from pathlib import Path
import uuid
import shutil
from typing import List

from ..models.room import Room, rooms, Track

router = APIRouter(prefix="/api/rooms", tags=["upload"])

# Разрешенные форматы аудио
ALLOWED_EXTENSIONS = {".mp3", ".wav", ".ogg", ".m4a", ".aac", ".flac"}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB


def sanitize_filename(filename: str) -> str:
    """Очистка имени файла от небезопасных символов"""
    # Оставляем только безопасные символы
    safe_chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789._-"
    sanitized = "".join(c if c in safe_chars else "_" for c in filename)
    return sanitized[:100]  # Ограничение длины


@router.post("/{room_id}/upload")
async def upload_track(room_id: str, file: UploadFile = File(...)):
    """Загрузка аудио файла в комнату"""
    if room_id not in rooms:
        raise HTTPException(status_code=404, detail="Room not found")

    # Проверка расширения файла
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Неподдерживаемый формат файла. Разрешенные: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    # Чтение файла для проверки размера
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"Файл слишком большой. Максимальный размер: {MAX_FILE_SIZE / 1024 / 1024}MB"
        )

    # Создание директории для комнаты
    upload_dir = Path("uploads") / room_id
    upload_dir.mkdir(parents=True, exist_ok=True)

    # Генерация уникального имени файла
    track_id = str(uuid.uuid4())
    safe_filename = sanitize_filename(file.filename)
    filename = f"{track_id}_{safe_filename}"
    file_path = upload_dir / filename

    # Сохранение файла
    with open(file_path, "wb") as f:
        f.write(contents)

    # Создание URL для доступа к файлу
    file_url = f"/uploads/{room_id}/{filename}"

    # Добавление трека в комнату
    room = rooms[room_id]
    track = Track(id=track_id, filename=file.filename, url=file_url)
    room.tracks.append(track)

    # Если это первый трек, устанавливаем его как текущий
    if room.current_track is None:
        room.current_track = track

    return {
        "id": track_id,
        "filename": track.filename,
        "url": track.url,
        "uploaded_at": track.uploaded_at.isoformat(),
    }


@router.get("/{room_id}/tracks")
async def list_tracks(room_id: str):
    """Получение списка треков в комнате"""
    if room_id not in rooms:
        raise HTTPException(status_code=404, detail="Room not found")

    room = rooms[room_id]
    return [
        {
            "id": track.id,
            "filename": track.filename,
            "url": track.url,
            "uploaded_at": track.uploaded_at.isoformat(),
        }
        for track in room.tracks
    ]
