from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path
import json

from .api import rooms, upload
from .websocket.room_manager import room_manager

app = FastAPI(title="Room Radio API")

# CORS настройки для фронтенда
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://e98722bfdbea.ngrok-free.app",
    ],
    allow_origin_regex=r"https://.*\.ngrok-free\.app|https://.*\.ngrok\.io",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Подключение роутеров
app.include_router(rooms.router)
app.include_router(upload.router)

# Создание директории для загрузок
uploads_dir = Path("uploads")
uploads_dir.mkdir(exist_ok=True)

# Статические файлы для загрузок
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")


@app.get("/health")
async def health():
    """Health check endpoint"""
    return {"status": "ok"}


@app.websocket("/ws/{room_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: str):
    """WebSocket endpoint для синхронизации воспроизведения в комнате"""
    await room_manager.connect(websocket, room_id)

    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            await room_manager.handle_message(websocket, room_id, message)
    except WebSocketDisconnect:
        room_manager.disconnect(websocket, room_id)
    except Exception as e:
        print(f"WebSocket error: {e}")
        room_manager.disconnect(websocket, room_id)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=7860)
