# Mafia Secret Card Distribution System (MVP)

A clean, reliable, mobile-first secret role distribution system for in-person Mafia tabletop games and social gatherings.

---

## 1. Architecture

```text
d:\mafia game\
├── backend/
│   ├── database.py             # SQLite engine, sessions, foreign key pragma
│   ├── models.py               # SQLAlchemy models (Game, Player, RoleConfig, RoleAssignment)
│   ├── schemas.py              # Pydantic schemas and role metadata
│   ├── websocket_manager.py    # Thread-safe WebSocket room broadcasting
│   ├── services/
│   │   ├── game_service.py     # Code generation, player joining, validation
│   │   └── distribution_service.py # Secure cryptographic shuffling & atomic distribution
│   ├── routes/
│   │   ├── games.py            # Game lobby, configs, distribution endpoints
│   │   └── players.py          # Player join and secure individual role retrieval
│   └── main.py                 # FastAPI application, CORS, static dist mount
├── frontend/
│   ├── src/
│   │   ├── components/         # RoleCounter, GameCodeCard, PlayerList, SecretRoleCard
│   │   ├── pages/              # Landing, CreateGame, HostLobby, JoinGame, PlayerScreen
│   │   ├── services/           # API fetch client
│   │   ├── hooks/              # useWebSocket auto-reconnect hook
│   │   ├── App.jsx             # Top-level view routing & session management
│   │   └── index.css           # Mafia noir theme design system (mobile-first)
│   ├── vite.config.js          # Vite config with API and WS proxy
│   └── package.json
└── tests/
    ├── test_mafia_system.py    # Pytest unit & edge-case test suite (11 tests)
    └── test_e2e_live_simulation.py # Live multi-client end-to-end simulation
```

- **Frontend**: React + Vite (Vanilla CSS, mobile-first, dark Mafia aesthetic, zero bulky UI dependencies).
- **Backend**: FastAPI + Uvicorn + SQLite (SQLAlchemy ORM with Foreign Keys).
- **Realtime**: WebSockets for instant player joining and distribution alerts.

---

## 2. Security & Role Privacy Enforcement

- **Strict Role Isolation**: The backend **never** broadcasts player roles across WebSockets, nor does it include roles in public player lists (`/api/games/{code}/players`).
- **Session Tokens**: When a player joins, a cryptographically secure random session token is issued (`secrets.token_urlsafe(32)`).
- **Authorized Role Fetch**: After distribution, each player queries `GET /api/me/role` using their secret token (`X-Player-Token`). The server returns only that player's specific role card.
- **Host Blindness**: By design, the Host view receives only distribution confirmation (`"Cards distributed successfully. 5 / 5 players received cards."`) and cannot see who received which role.
- **Cryptographic Shuffling**: Roles are shuffled using Python's `secrets.SystemRandom().shuffle()`.
- **Double Distribution Prevention**: Idempotency and atomic state transitions prevent multiple distributions.

---

## 3. How to Run

### Quick Start (One-Click / Single Command)

**Option A — Windows Double-Click:**
Simply double-click [`run.bat`](file:///d:/mafia%20game/run.bat) in the project folder.

**Option B — Python Runner:**
```powershell
python run.py
```
This automatically starts both the FastAPI backend and Vite frontend, opens your browser to `http://localhost:5173`, and gracefully shuts down both on `Ctrl+C`.

---

### Mobile Phone Access (Same Wi-Fi)

To allow anyone to join from their phone:
1. Make sure your PC and phones are connected to the **same Wi-Fi network**.
2. Run `run.bat` or `python run.py`.
3. The launcher will display your mobile URL:
   ```text
   http://192.168.100.72:5173
   ```
4. Players simply open `http://192.168.100.72:5173` in their mobile browser (Chrome / Safari), or scan the **QR Code** directly from the Host Lobby!

---

### Manual Start

#### Step 1: Start the Backend

```powershell
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

The backend API will run on `http://127.0.0.1:8000`.

### Step 2: Start the Frontend (Development)

```powershell
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173/` in your browser or mobile phone browser.

*(Note: In production, the backend also directly serves the built frontend bundle at `http://127.0.0.1:8000/`)*

---

## 4. Running the Tests

### Pytest Unit & Edge-Case Suite
```powershell
python -m pytest tests/test_mafia_system.py -v
```

### End-to-End Live Multi-Client Simulation
```powershell
python tests/test_e2e_live_simulation.py
```
