import sys
import os
from fastapi import Request

# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.main import app

@app.api_route("/api/index.py", methods=["GET", "POST"])
@app.api_route("/index.py", methods=["GET", "POST"])
@app.api_route("/api/debug-info", methods=["GET", "POST"])
@app.api_route("/debug-info", methods=["GET", "POST"])
def get_debug_info(request: Request):
    return {
        "url": str(request.url),
        "path": request.url.path,
        "scope_path": request.scope.get("path"),
        "headers": dict(request.headers),
    }
