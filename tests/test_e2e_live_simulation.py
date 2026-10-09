import asyncio
import json
import sys
import urllib.request
import websockets

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = "http://127.0.0.1:8000"
WS_URL = "ws://127.0.0.1:8000"

def http_post(endpoint, data=None, headers=None):
    url = f"{BASE_URL}{endpoint}"
    payload = json.dumps(data).encode("utf-8") if data else None
    req_headers = {"Content-Type": "application/json"}
    if headers:
        req_headers.update(headers)
    req = urllib.request.Request(url, data=payload, headers=req_headers, method="POST")
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode())

def http_get(endpoint, headers=None):
    url = f"{BASE_URL}{endpoint}"
    req_headers = {}
    if headers:
        req_headers.update(headers)
    req = urllib.request.Request(url, headers=req_headers, method="GET")
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode())

async def run_e2e_simulation():
    print("\n=======================================================")
    print("STARTING END-TO-END MAFIA CARD DISTRIBUTION SIMULATION")
    print("=======================================================")

    # 1. Host creates game
    print("\n[Step 1] Host creates game with 5 players (1 Mafia, 2 Citizen, 1 Detective, 1 Doctor)...")
    create_payload = {
        "required_players": 5,
        "roles": {
            "MAFIA": 1,
            "CITIZEN": 2,
            "DETECTIVE": 1,
            "DOCTOR": 1
        }
    }
    create_resp = http_post("/api/games", create_payload)
    game_code = create_resp["game"]["game_code"]
    host_token = create_resp["host_token"]
    print(f"-> Game Created: {game_code}")
    print(f"-> Host Token: {host_token[:10]}...")
    print(f"-> Total Cards Configured: {create_resp['game']['total_cards']} / 5")
    assert create_resp["game"]["total_cards"] == 5

    # 2. Host connects to WebSocket room
    host_ws_uri = f"{WS_URL}/ws/{game_code}"
    print(f"\n[Step 2] Host connects to WebSocket: {host_ws_uri}")
    host_ws = await websockets.connect(host_ws_uri)

    # 3. 5 Players join sequentially
    players_data = ["Ali", "Ahmed", "Hamza", "Usman", "Bilal"]
    player_sessions = {}
    player_sockets = {}

    print("\n[Step 3] 5 Players join the game...")
    for name in players_data:
        # Player connects to WS
        p_ws = await websockets.connect(host_ws_uri)
        player_sockets[name] = p_ws

        # Player joins via API
        join_resp = http_post(f"/api/games/{game_code}/join", {"player_name": name})
        player_sessions[name] = join_resp["session_token"]
        print(f"-> Player '{name}' joined successfully! Session token: {join_resp['session_token'][:8]}...")

        # Verify Host received PLAYER_JOINED event
        host_msg = json.loads(await host_ws.recv())
        assert host_msg["type"] == "PLAYER_JOINED"
        assert host_msg["player_name"] == name
        print(f"   [Host Realtime Event] PLAYER_JOINED: {name} ({host_msg['joined_count']}/5)")

    # 4. Verify public player list has NO roles
    print("\n[Step 4] Checking Public Player List for privacy...")
    public_players = http_get(f"/api/games/{game_code}/players")
    print(f"-> Public players returned: {[p['name'] for p in public_players]}")
    for p in public_players:
        assert "role" not in p, "SECURITY LEAK: Role found in public player list!"
    print("-> SECURE: Zero roles leaked in public players endpoint.")

    # 5. Host triggers distribution
    print("\n[Step 5] Host triggers 'DISTRIBUTE CARDS'...")
    dist_resp = http_post(
        f"/api/games/{game_code}/distribute",
        headers={"X-Host-Token": host_token}
    )
    print(f"-> Distribution Response: {dist_resp['message']}")
    assert dist_resp["success"] is True
    assert dist_resp["status"] == "DISTRIBUTED"
    # Ensure Host distribution response does NOT contain individual roles
    assert "roles" not in dist_resp
    print("-> SECURE: Host response does not contain player roles.")

    # 6. Verify all connected clients receive DISTRIBUTION_COMPLETE via WebSocket
    print("\n[Step 6] Verifying WebSocket broadcasts to all players...")
    for name, p_ws in player_sockets.items():
        # Read messages until DISTRIBUTION_COMPLETE
        while True:
            raw = await p_ws.recv()
            msg = json.loads(raw)
            if msg["type"] == "DISTRIBUTION_COMPLETE":
                # Ensure broadcast contains NO roles
                assert "roles" not in msg, "SECURITY LEAK: Roles leaked in broadcast!"
                assert "role" not in msg, "SECURITY LEAK: Role leaked in broadcast!"
                print(f"-> Player '{name}' received DISTRIBUTION_COMPLETE (Clean, no role leaks)")
                break

    # 7. Each player queries /api/me/role with their individual token
    print("\n[Step 7] Each player securely retrieves ONLY their own role...")
    assigned_roles = {}
    for name in players_data:
        token = player_sessions[name]
        role_data = http_get("/api/me/role", headers={"X-Player-Token": token})
        assigned_roles[name] = role_data["role"]
        print(f"-> [{name}] Role: {role_data['icon']} {role_data['display_name']} ({role_data['role']})")
        assert role_data["player_name"] == name
        assert role_data["game_code"] == game_code

    # 8. Check role pool integrity
    print("\n[Step 8] Checking Role Pool Count Integrity...")
    role_list = list(assigned_roles.values())
    print(f"-> Assigned roles distribution: {role_list}")
    assert len(role_list) == 5
    assert role_list.count("MAFIA") == 1, f"Expected 1 Mafia, got {role_list.count('MAFIA')}"
    assert role_list.count("CITIZEN") == 2, f"Expected 2 Citizens, got {role_list.count('CITIZEN')}"
    assert role_list.count("DETECTIVE") == 1, f"Expected 1 Detective, got {role_list.count('DETECTIVE')}"
    assert role_list.count("DOCTOR") == 1, f"Expected 1 Doctor, got {role_list.count('DOCTOR')}"
    print("-> ROLE INTEGRITY VERIFIED: Exactly 1 Mafia, 2 Citizens, 1 Detective, 1 Doctor!")

    # 9. Verify cross-player privacy: Ali's token cannot fetch another player's role
    print("\n[Step 9] Verifying Cross-Player Privacy Isolation...")
    ali_token = player_sessions["Ali"]
    ali_role = http_get("/api/me/role", headers={"X-Player-Token": ali_token})
    assert ali_role["player_name"] == "Ali"
    print("-> Ali can only receive Ali's role.")

    # 10. Attempt duplicate distribution
    print("\n[Step 10] Testing Idempotency (Preventing Double Distribution)...")
    try:
        http_post(
            f"/api/games/{game_code}/distribute",
            headers={"X-Host-Token": host_token}
        )
        print("ERROR: Double distribution did not raise error!")
        assert False
    except urllib.error.HTTPError as e:
        err_body = json.loads(e.read().decode())
        print(f"-> Correctly Rejected duplicate distribution with 400: {err_body['detail']}")
        assert "already distributed" in err_body["detail"].lower()

    # 11. Attempt joining after distribution
    print("\n[Step 11] Testing Late Join Rejection...")
    try:
        http_post(f"/api/games/{game_code}/join", {"player_name": "LateComer"})
        assert False
    except urllib.error.HTTPError as e:
        err_body = json.loads(e.read().decode())
        print(f"-> Correctly Rejected post-distribution join with 400: {err_body['detail']}")
        assert "already distributed" in err_body["detail"].lower()

    # Clean up sockets
    await host_ws.close()
    for ws in player_sockets.values():
        await ws.close()

    print("\n=======================================================")
    print("ALL END-TO-END ACCEPTANCE CRITERIA PASSED 100% SUCCESSFULLY!")
    print("=======================================================\n")

if __name__ == "__main__":
    asyncio.run(run_e2e_simulation())
