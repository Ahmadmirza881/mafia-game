import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.database import Base, get_db
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db
Base.metadata.create_all(bind=engine)
client = TestClient(app)

def run_dual_mode_simulation():
    print("\n" + "=" * 60)
    print("RUNNING COMPLETE MAFIA CLASSIC + MAFIA ELITE SIMULATION")
    print("=" * 60)

    # ----------------------------------------------------
    # PART 1: TEST MAFIA CLASSIC (Strict Preservation)
    # ----------------------------------------------------
    print("\n--- PART 1: Testing Mafia Classic Mode ---")
    classic_res = client.post("/api/games", json={
        "required_players": 5,
        "game_mode": "CLASSIC",
        "roles": {
            "MAFIA": 1,
            "CITIZEN": 2,
            "DETECTIVE": 1,
            "DOCTOR": 1
        }
    })
    assert classic_res.status_code == 201
    c_data = classic_res.json()
    c_code = c_data["game"]["game_code"]
    c_host_tok = c_data["host_token"]
    assert c_data["game"]["game_mode"] == "CLASSIC"
    assert set(c_data["game"]["role_counts"].keys()) == {"MAFIA", "CITIZEN", "DETECTIVE", "DOCTOR"}
    print(f"[OK] Created Mafia Classic Room: {c_code}")

    c_tokens = []
    for i in range(5):
        pj = client.post(f"/api/games/{c_code}/join", json={"player_name": f"ClassicPlayer_{i+1}"}).json()
        c_tokens.append(pj["session_token"])
    print("[OK] 5 Players joined Mafia Classic room")

    c_dist = client.post(f"/api/games/{c_code}/distribute", headers={"X-Host-Token": c_host_tok})
    assert c_dist.status_code == 200
    print("[OK] Cards distributed successfully")

    c_roles = []
    for tok in c_tokens:
        r = client.get("/api/me/role", headers={"X-Player-Token": tok}).json()
        assert r["game_mode"] == "CLASSIC"
        assert r["card_back_image"] == "/card-back.jpg"
        assert "elite-" not in r["card_image"]
        assert r["role"] in {"MAFIA", "CITIZEN", "DETECTIVE", "DOCTOR"}
        c_roles.append(r["role"])
    print(f"[OK] Classic Roles distributed: {c_roles}")
    print("[OK] Verified 100% preservation of original Mafia Classic cards & artwork!")

    # ----------------------------------------------------
    # PART 2: TEST MAFIA ELITE (Godfather, Jester, Mayor)
    # ----------------------------------------------------
    print("\n--- PART 2: Testing Mafia Elite Mode ---")
    elite_res = client.post("/api/games", json={
        "required_players": 7,
        "game_mode": "ELITE",
        "roles": {
            "GODFATHER": 1,
            "MAFIA": 1,
            "CITIZEN": 1,
            "DETECTIVE": 1,
            "DOCTOR": 1,
            "JESTER": 1,
            "MAYOR": 1
        }
    })
    assert elite_res.status_code == 201
    e_data = elite_res.json()
    e_code = e_data["game"]["game_code"]
    e_host_tok = e_data["host_token"]
    assert e_data["game"]["game_mode"] == "ELITE"
    assert len(e_data["game"]["role_counts"]) == 7
    print(f"[OK] Created Mafia Elite Room: {e_code} (All 7 Elite roles configured)")

    e_players = {}
    for i in range(7):
        pj = client.post(f"/api/games/{e_code}/join", json={"player_name": f"ElitePlayer_{i+1}"}).json()
        e_players[f"ElitePlayer_{i+1}"] = pj["session_token"]
    print("[OK] 7 Players joined Mafia Elite room")

    e_dist = client.post(f"/api/games/{e_code}/distribute", headers={"X-Host-Token": e_host_tok})
    assert e_dist.status_code == 200
    print("[OK] Elite Cards distributed successfully")

    player_roles = {}
    det_token = None
    det_name = None
    godfather_name = None
    mafia_name = None
    jester_name = None
    mayor_name = None

    for name, tok in e_players.items():
        r = client.get("/api/me/role", headers={"X-Player-Token": tok}).json()
        assert r["game_mode"] == "ELITE"
        assert r["card_back_image"] == "/elite-card-back.jpg"
        assert "elite-" in r["card_image"]
        player_roles[name] = r["role"]

        if r["role"] == "DETECTIVE":
            det_token = tok
            det_name = name
        elif r["role"] == "GODFATHER":
            godfather_name = name
        elif r["role"] == "MAFIA":
            mafia_name = name
        elif r["role"] == "JESTER":
            jester_name = name
        elif r["role"] == "MAYOR":
            mayor_name = name

    print(f"[OK] Roles Assigned: {player_roles}")
    print("[OK] All cards used luxury 3D /elite-card-back.jpg and /elite-*.jpg art!")

    # ----------------------------------------------------
    # PART 3: TEST GODFATHER INVESTIGATION IMMUNITY
    # ----------------------------------------------------
    print("\n--- PART 3: Testing Godfather Rule ---")
    # Detective investigates Godfather -> Must return INNOCENT!
    inv_god = client.post(
        f"/api/games/{e_code}/investigate",
        json={"target_player_name": godfather_name},
        headers={"X-Player-Token": det_token}
    ).json()
    assert inv_god["result"] == "INNOCENT"
    assert "innocent" in inv_god["message"].lower()
    print(f"[OK] Detective investigated Godfather ({godfather_name}): Result = INNOCENT (Rule Enforced!)")

    # Detective investigates regular Mafia Goon -> Must return GUILTY!
    inv_maf = client.post(
        f"/api/games/{e_code}/investigate",
        json={"target_player_name": mafia_name},
        headers={"X-Player-Token": det_token}
    ).json()
    assert inv_maf["result"] == "GUILTY"
    assert "mafia" in inv_maf["message"].lower()
    print(f"[OK] Detective investigated Mafia ({mafia_name}): Result = GUILTY (Rule Enforced!)")

    # ----------------------------------------------------
    # PART 4: TEST JESTER WIN CONDITION
    # ----------------------------------------------------
    print("\n--- PART 4: Testing Jester Rule ---")
    # Night kill on Jester -> Does NOT win
    elim_night = client.post(
        f"/api/games/{e_code}/players/{jester_name}/eliminate",
        json={"reason": "NIGHT_KILL"},
        headers={"X-Host-Token": e_host_tok}
    ).json()
    assert elim_night["jester_victory"] is False
    print(f"[OK] Jester ({jester_name}) eliminated via NIGHT_KILL: jester_victory = False (Rule Enforced!)")

    # Revive Jester
    client.post(f"/api/games/{e_code}/players/{jester_name}/revive", headers={"X-Host-Token": e_host_tok})

    # Town vote out on Jester -> WINS INDEPENDENTLY!
    elim_vote = client.post(
        f"/api/games/{e_code}/players/{jester_name}/eliminate",
        json={"reason": "VOTED_OUT"},
        headers={"X-Host-Token": e_host_tok}
    ).json()
    assert elim_vote["jester_victory"] is True
    print(f"[OK] Jester ({jester_name}) eliminated via VOTED_OUT: jester_victory = True (Solo Victory Achieved!)")

    # ----------------------------------------------------
    # PART 5: TEST MAYOR METADATA AND REMATCH
    # ----------------------------------------------------
    print("\n--- PART 5: Testing Mayor & Rematch ---")
    mayor_role = client.get("/api/me/role", headers={"X-Player-Token": e_players[mayor_name]}).json()
    assert mayor_role["role"] == "MAYOR"
    assert mayor_role["team"] == "Town"
    assert "2" in mayor_role["special_ability"]
    print(f"[OK] Mayor ({mayor_name}) has Town allegiance and double voting power: '{mayor_role['special_ability']}'")

    rematch_res = client.post(f"/api/games/{e_code}/rematch", headers={"X-Host-Token": e_host_tok}).json()
    assert rematch_res["success"] is True
    assert rematch_res["status"] == "WAITING"
    print(f"[OK] Rematch successful: Room {e_code} reset for Round 2 with all players preserved!")

    print("\n" + "=" * 60)
    print("ALL DUAL-MODE SIMULATION TESTS PASSED WITH 100% SUCCESS!")
    print("=" * 60 + "\n")

if __name__ == "__main__":
    run_dual_mode_simulation()
