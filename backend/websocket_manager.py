import asyncio
import json
import logging
from typing import Dict, Set
from fastapi import WebSocket

logger = logging.getLogger("websocket_manager")

class ConnectionManager:
    def __init__(self):
        # Mapping from game_code (uppercase) -> set of active WebSockets
        self.active_connections: Dict[str, Set[WebSocket]] = {}
        self._lock = asyncio.Lock()

    async def connect(self, game_code: str, websocket: WebSocket):
        await websocket.accept()
        code = game_code.upper()
        async with self._lock:
            if code not in self.active_connections:
                self.active_connections[code] = set()
            self.active_connections[code].add(websocket)
        logger.info(f"Client connected to game {code}. Total connections: {len(self.active_connections[code])}")

    async def disconnect(self, game_code: str, websocket: WebSocket):
        code = game_code.upper()
        async with self._lock:
            if code in self.active_connections:
                self.active_connections[code].discard(websocket)
                if not self.active_connections[code]:
                    del self.active_connections[code]
        logger.info(f"Client disconnected from game {code}")

    async def broadcast(self, game_code: str, message: dict):
        code = game_code.upper()
        async with self._lock:
            connections = list(self.active_connections.get(code, []))

        if not connections:
            return

        payload = json.dumps(message)
        dead_connections = []

        for ws in connections:
            try:
                await ws.send_text(payload)
            except Exception as e:
                logger.warning(f"Error sending ws message: {e}")
                dead_connections.append(ws)

        if dead_connections:
            async with self._lock:
                if code in self.active_connections:
                    for ws in dead_connections:
                        self.active_connections[code].discard(ws)

manager = ConnectionManager()
