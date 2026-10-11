import sys
import os
from urllib.parse import parse_qs, urlencode

# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.main import app as fastapi_app

async def app(scope, receive, send):
    if scope["type"] == "http":
        # Extract query string and look for __path injected by Vercel rewrite
        query_string = scope.get("query_string", b"").decode()
        if "__path=" in query_string:
            params = parse_qs(query_string, keep_blank_values=True)
            if "__path" in params and params["__path"]:
                target_path = params.pop("__path")[0]
                scope["path"] = target_path
                scope["raw_path"] = target_path.encode()
                # Rebuild remaining query parameters without __path
                flat_params = {k: v[0] if len(v) == 1 else v for k, v in params.items()}
                scope["query_string"] = urlencode(flat_params, doseq=True).encode()
    await fastapi_app(scope, receive, send)
