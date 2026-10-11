import logging
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from backend.database import engine, Base, ensure_schema
from backend.routes import games, players
from backend.websocket_manager import manager

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("mafia_app")

# Ensure all database tables exist and have up-to-date schema
Base.metadata.create_all(bind=engine)
ensure_schema()

app = FastAPI(
    title="Mafia Secret Card Distribution System",
    description="Clean, reliable backend for secret Mafia role distribution",
    version="1.0.0"
)

import traceback
from fastapi import Request
from fastapi.responses import JSONResponse

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    tb = traceback.format_exc()
    logger.error(f"Unhandled server error on {request.url.path}: {exc}\n{tb}")
    return JSONResponse(
        status_code=500,
        content={"detail": f"Server Error: {str(exc)}", "traceback": tb}
    )

# Enable CORS for local dev and network devices
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(games.router)
app.include_router(players.router)


@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "Mafia Card Distributor"}


@app.websocket("/ws/{game_code}")
async def websocket_endpoint(websocket: WebSocket, game_code: str):
    await manager.connect(game_code, websocket)
    try:
        while True:
            # Keep connection alive and accept any client pings
            data = await websocket.receive_text()
            # Echo or acknowledge if client sent ping
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        await manager.disconnect(game_code, websocket)
    except Exception as e:
        logger.error(f"WebSocket error for game {game_code}: {e}")
        await manager.disconnect(game_code, websocket)


# Serve frontend static files if built
import os
from starlette.exceptions import HTTPException as StarletteHTTPException
from fastapi.staticfiles import StaticFiles

class SPAStaticFiles(StaticFiles):
    async def get_response(self, path: str, scope):
        try:
            response = await super().get_response(path, scope)
            if response.status_code == 404:
                return await super().get_response("index.html", scope)
            return response
        except StarletteHTTPException as ex:
            if ex.status_code == 404:
                return await super().get_response("index.html", scope)
            raise ex

# Serve frontend static files if built (Vite outputs to ../public)
frontend_dist = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "public"))
if not os.path.exists(os.path.join(frontend_dist, "index.html")):
    frontend_dist = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend", "dist"))

if os.path.exists(frontend_dist) and os.path.exists(os.path.join(frontend_dist, "index.html")):
    app.mount("/", SPAStaticFiles(directory=frontend_dist, html=True), name="static")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
