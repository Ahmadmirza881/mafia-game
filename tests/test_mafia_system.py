import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.database import Base, get_db
from backend.main import app

from sqlalchemy.pool import StaticPool

# Create in-memory SQLite database for testing with StaticPool
SQLALCHEMY_TEST_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_TEST_DATABASE_URL,
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

@pytest.fixture(autouse=True)
def setup_database():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

@pytest.fixture
def client():
    return TestClient(app)

def test_create_game_and_validation(client):
    # Test creating a game
    resp = client.post("/api/games", json={
        "required_players": 10,
        "roles": {
            "MAFIA": 2,
            "CITIZEN": 6,
            "DETECTIVE": 1,
            "DOCTOR": 1
        }
    })
    assert resp.status_code == 201
    data = resp.json()
    assert "game" in data
    assert "host_token" in data
    game = data["game"]
    assert game["game_code"].startswith("MAFIA-")
    assert game["required_players"] == 10
    assert game["total_cards"] == 10
    assert game["cards_difference"] == 0
    assert game["status"] == "WAITING"

def test_too_few_cards_distribution_rejected(client):
    # 2 + 5 + 1 + 1 = 9 cards for 10 players
    create_resp = client.post("/api/games", json={
        "required_players": 10,
        "roles": {"MAFIA": 2, "CITIZEN": 5, "DETECTIVE": 1, "DOCTOR": 1}
    })
    data = create_resp.json()
    game_code = data["game"]["game_code"]
    host_token = data["host_token"]

    # Join 10 players
    for i in range(10):
        client.post(f"/api/games/{game_code}/join", json={"player_name": f"Player_{i}"})

    # Attempt distribution
    dist_resp = client.post(
        f"/api/games/{game_code}/distribute",
        headers={"X-Host-Token": host_token}
    )
    assert dist_resp.status_code == 400
    assert "remaining" in dist_resp.json()["detail"].lower()

def test_too_many_cards_distribution_rejected(client):
    # 2 + 7 + 1 + 1 = 11 cards for 10 players
    create_resp = client.post("/api/games", json={
        "required_players": 10,
        "roles": {"MAFIA": 2, "CITIZEN": 7, "DETECTIVE": 1, "DOCTOR": 1}
    })
    data = create_resp.json()
    game_code = data["game"]["game_code"]
    host_token = data["host_token"]

    for i in range(10):
        client.post(f"/api/games/{game_code}/join", json={"player_name": f"Player_{i}"})

    dist_resp = client.post(
        f"/api/games/{game_code}/distribute",
        headers={"X-Host-Token": host_token}
    )
    assert dist_resp.status_code == 400
    assert "too many" in dist_resp.json()["detail"].lower()

def test_distribution_too_early_rejected(client):
    # 5 players required, 5 cards, but only 3 players joined
    create_resp = client.post("/api/games", json={
        "required_players": 5,
        "roles": {"MAFIA": 1, "CITIZEN": 2, "DETECTIVE": 1, "DOCTOR": 1}
    })
    data = create_resp.json()
    game_code = data["game"]["game_code"]
    host_token = data["host_token"]

    for i in range(3):
        client.post(f"/api/games/{game_code}/join", json={"player_name": f"Player_{i}"})

    dist_resp = client.post(
        f"/api/games/{game_code}/distribute",
        headers={"X-Host-Token": host_token}
    )
    assert dist_resp.status_code == 400
    assert "waiting for all players to join" in dist_resp.json()["detail"].lower()

def test_correct_distribution_and_role_integrity(client):
    # 10 players, exact roles: Mafia 2, Citizen 6, Detective 1, Doctor 1
    create_resp = client.post("/api/games", json={
        "required_players": 10,
        "roles": {"MAFIA": 2, "CITIZEN": 6, "DETECTIVE": 1, "DOCTOR": 1}
    })
    data = create_resp.json()
    game_code = data["game"]["game_code"]
    host_token = data["host_token"]

    tokens = {}
    names = ["Ali", "Ahmed", "Hamza", "Usman", "Bilal", "Hassan", "Umar", "Zain", "Tariq", "Mustafa"]
    for name in names:
        j_resp = client.post(f"/api/games/{game_code}/join", json={"player_name": name})
        assert j_resp.status_code == 201
        tokens[name] = j_resp.json()["session_token"]

    # Distribute cards
    dist_resp = client.post(
        f"/api/games/{game_code}/distribute",
        headers={"X-Host-Token": host_token}
    )
    assert dist_resp.status_code == 200
    dist_data = dist_resp.json()
    assert dist_data["status"] == "DISTRIBUTED"
    assert dist_data["total_players"] == 10

    # Retrieve each player's role and verify integrity
    assigned_roles = []
    for name in names:
        role_resp = client.get(
            "/api/me/role",
            headers={"X-Player-Token": tokens[name]}
        )
        assert role_resp.status_code == 200
        role_info = role_resp.json()
        assert role_info["player_name"] == name
        assert role_info["role"] in ["MAFIA", "CITIZEN", "DETECTIVE", "DOCTOR"]
        assigned_roles.append(role_info["role"])

    assert len(assigned_roles) == 10
    assert assigned_roles.count("MAFIA") == 2
    assert assigned_roles.count("CITIZEN") == 6
    assert assigned_roles.count("DETECTIVE") == 1
    assert assigned_roles.count("DOCTOR") == 1

def test_prevent_double_distribution_idempotence(client):
    create_resp = client.post("/api/games", json={
        "required_players": 3,
        "roles": {"MAFIA": 1, "CITIZEN": 1, "DETECTIVE": 1, "DOCTOR": 0}
    })
    data = create_resp.json()
    game_code = data["game"]["game_code"]
    host_token = data["host_token"]

    tokens = []
    for i in range(3):
        res = client.post(f"/api/games/{game_code}/join", json={"player_name": f"P_{i}"})
        tokens.append(res.json()["session_token"])

    # First distribution succeeds
    dist_1 = client.post(f"/api/games/{game_code}/distribute", headers={"X-Host-Token": host_token})
    assert dist_1.status_code == 200

    # Get roles after first distribution
    initial_roles = [
        client.get("/api/me/role", headers={"X-Player-Token": t}).json()["role"]
        for t in tokens
    ]

    # Second distribution attempt must fail and not reshuffle
    dist_2 = client.post(f"/api/games/{game_code}/distribute", headers={"X-Host-Token": host_token})
    assert dist_2.status_code == 400
    assert "already distributed" in dist_2.json()["detail"].lower()

    # Verify roles have not changed
    second_roles = [
        client.get("/api/me/role", headers={"X-Player-Token": t}).json()["role"]
        for t in tokens
    ]
    assert initial_roles == second_roles

def test_privacy_enforcement(client):
    create_resp = client.post("/api/games", json={
        "required_players": 3,
        "roles": {"MAFIA": 1, "CITIZEN": 2, "DETECTIVE": 0, "DOCTOR": 0}
    })
    game_code = create_resp.json()["game"]["game_code"]
    host_token = create_resp.json()["host_token"]

    p1 = client.post(f"/api/games/{game_code}/join", json={"player_name": "Ali"}).json()
    p2 = client.post(f"/api/games/{game_code}/join", json={"player_name": "Ahmed"}).json()
    p3 = client.post(f"/api/games/{game_code}/join", json={"player_name": "Hamza"}).json()

    # Public players endpoint MUST NOT expose roles
    players_resp = client.get(f"/api/games/{game_code}/players")
    assert players_resp.status_code == 200
    players_list = players_resp.json()
    for item in players_list:
        assert "role" not in item
        assert "role_name" not in item
        assert "name" in item

    # Before distribution, querying role should return 400
    r_before = client.get("/api/me/role", headers={"X-Player-Token": p1["session_token"]})
    assert r_before.status_code == 400

    # Distribute cards
    client.post(f"/api/games/{game_code}/distribute", headers={"X-Host-Token": host_token})

    # Public players endpoint STILL MUST NOT expose roles
    players_resp = client.get(f"/api/games/{game_code}/players")
    for item in players_resp.json():
        assert "role" not in item
        assert "role_name" not in item

    # P1 can see only P1's role
    r1 = client.get("/api/me/role", headers={"X-Player-Token": p1["session_token"]}).json()
    assert r1["player_name"] == "Ali"
    assert "role" in r1

    # Unauthorized access (no token or fake token) fails
    r_unauth = client.get("/api/me/role")
    assert r_unauth.status_code == 401

    r_fake = client.get("/api/me/role", headers={"X-Player-Token": "fake-token-12345"})
    assert r_fake.status_code == 401

def test_full_game_rejection(client):
    create_resp = client.post("/api/games", json={
        "required_players": 3,
        "roles": {"MAFIA": 1, "CITIZEN": 2, "DETECTIVE": 0, "DOCTOR": 0}
    })
    game_code = create_resp.json()["game"]["game_code"]

    for i in range(3):
        r = client.post(f"/api/games/{game_code}/join", json={"player_name": f"Player_{i}"})
        assert r.status_code == 201

    # 4th player joining must be rejected
    r4 = client.post(f"/api/games/{game_code}/join", json={"player_name": "Player_Extra"})
    assert r4.status_code == 400
    assert "already full" in r4.json()["detail"].lower()

def test_post_distribution_join_rejected(client):
    create_resp = client.post("/api/games", json={
        "required_players": 3,
        "roles": {"MAFIA": 1, "CITIZEN": 2, "DETECTIVE": 0, "DOCTOR": 0}
    })
    data = create_resp.json()
    game_code = data["game"]["game_code"]
    host_token = data["host_token"]

    for i in range(3):
        client.post(f"/api/games/{game_code}/join", json={"player_name": f"P_{i}"})

    client.post(f"/api/games/{game_code}/distribute", headers={"X-Host-Token": host_token})

    # Join after distribution
    r_late = client.post(f"/api/games/{game_code}/join", json={"player_name": "Late_Player"})
    assert r_late.status_code == 400
    assert "already distributed" in r_late.json()["detail"].lower()

def test_duplicate_player_name_rejected(client):
    create_resp = client.post("/api/games", json={
        "required_players": 4,
        "roles": {"MAFIA": 1, "CITIZEN": 3, "DETECTIVE": 0, "DOCTOR": 0}
    })
    game_code = create_resp.json()["game"]["game_code"]

    r1 = client.post(f"/api/games/{game_code}/join", json={"player_name": "Ali"})
    assert r1.status_code == 201

    # Duplicate name with different casing
    r2 = client.post(f"/api/games/{game_code}/join", json={"player_name": "ali"})
    assert r2.status_code == 400
    assert "already taken" in r2.json()["detail"].lower()

def test_unauthorized_host_distribution(client):
    create_resp = client.post("/api/games", json={
        "required_players": 3,
        "roles": {"MAFIA": 1, "CITIZEN": 2, "DETECTIVE": 0, "DOCTOR": 0}
    })
    game_code = create_resp.json()["game"]["game_code"]

    for i in range(3):
        client.post(f"/api/games/{game_code}/join", json={"player_name": f"P_{i}"})

    # Distribution without or with wrong host token
    res_no_token = client.post(f"/api/games/{game_code}/distribute")
    assert res_no_token.status_code == 403

    res_bad_token = client.post(f"/api/games/{game_code}/distribute", headers={"X-Host-Token": "wrong-secret"})
    assert res_bad_token.status_code == 403

def test_create_game_with_email_and_password_and_host_login(client):
    create_resp = client.post("/api/games", json={
        "required_players": 3,
        "roles": {"MAFIA": 1, "CITIZEN": 2, "DETECTIVE": 0, "DOCTOR": 0},
        "host_email": "boss@mafia.com",
        "host_password": "supersecretpassword123"
    })
    assert create_resp.status_code == 201
    game_code = create_resp.json()["game"]["game_code"]

    # Attempt login with wrong password
    bad_login = client.post(f"/api/games/{game_code}/host-login", json={
        "host_email": "boss@mafia.com",
        "host_password": "wrongpassword"
    })
    assert bad_login.status_code == 401

    # Attempt login with wrong email
    bad_email_login = client.post(f"/api/games/{game_code}/host-login", json={
        "host_email": "other@mafia.com",
        "host_password": "supersecretpassword123"
    })
    assert bad_email_login.status_code == 401

    # Attempt login with correct credentials
    good_login = client.post(f"/api/games/{game_code}/host-login", json={
        "host_email": "boss@mafia.com",
        "host_password": "supersecretpassword123"
    })
    assert good_login.status_code == 200
    login_data = good_login.json()
    assert login_data["success"] is True
    reissued_token = login_data["host_token"]

    # Verify that reissued token can perform host actions (e.g. updating roles)
    update_resp = client.patch(
        f"/api/games/{game_code}/roles",
        headers={"X-Host-Token": reissued_token},
        json={
            "required_players": 4,
            "roles": {"MAFIA": 1, "CITIZEN": 3, "DETECTIVE": 0, "DOCTOR": 0}
        }
    )
    assert update_resp.status_code == 200
    assert update_resp.json()["required_players"] == 4


def test_mafia_role_card_image(client):
    create_resp = client.post("/api/games", json={
        "required_players": 3,
        "roles": {"MAFIA": 3, "CITIZEN": 0, "DETECTIVE": 0, "DOCTOR": 0}
    })
    game_code = create_resp.json()["game"]["game_code"]
    host_token = create_resp.json()["host_token"]

    p1 = client.post(f"/api/games/{game_code}/join", json={"player_name": "DonCorleone"}).json()
    p2 = client.post(f"/api/games/{game_code}/join", json={"player_name": "TonySoprano"}).json()
    p3 = client.post(f"/api/games/{game_code}/join", json={"player_name": "MichaelCorleone"}).json()

    client.post(f"/api/games/{game_code}/distribute", headers={"X-Host-Token": host_token})

    r1 = client.get("/api/me/role", headers={"X-Player-Token": p1["session_token"]}).json()
    assert r1["role"] == "MAFIA"
    assert r1["card_image"] == "/mafia-card.jpg"
    assert "eliminate" in r1["description"].lower()


def test_detective_role_card_image(client):
    create_resp = client.post("/api/games", json={
        "required_players": 3,
        "roles": {"MAFIA": 0, "CITIZEN": 0, "DETECTIVE": 3, "DOCTOR": 0}
    })
    game_code = create_resp.json()["game"]["game_code"]
    host_token = create_resp.json()["host_token"]

    p1 = client.post(f"/api/games/{game_code}/join", json={"player_name": "Sherlock"}).json()
    p2 = client.post(f"/api/games/{game_code}/join", json={"player_name": "Poirot"}).json()
    p3 = client.post(f"/api/games/{game_code}/join", json={"player_name": "Columbo"}).json()

    client.post(f"/api/games/{game_code}/distribute", headers={"X-Host-Token": host_token})

    r1 = client.get("/api/me/role", headers={"X-Player-Token": p1["session_token"]}).json()
    assert r1["role"] == "DETECTIVE"
    assert r1["card_image"] == "/detective-card.jpg"
    assert "detective" in r1["description"].lower()


def test_civilian_role_card_image(client):
    create_resp = client.post("/api/games", json={
        "required_players": 3,
        "roles": {"MAFIA": 0, "CITIZEN": 3, "DETECTIVE": 0, "DOCTOR": 0}
    })
    game_code = create_resp.json()["game"]["game_code"]
    host_token = create_resp.json()["host_token"]

    p1 = client.post(f"/api/games/{game_code}/join", json={"player_name": "CitizenKane"}).json()
    p2 = client.post(f"/api/games/{game_code}/join", json={"player_name": "JohnDoe"}).json()
    p3 = client.post(f"/api/games/{game_code}/join", json={"player_name": "JaneDoe"}).json()

    client.post(f"/api/games/{game_code}/distribute", headers={"X-Host-Token": host_token})

    r1 = client.get("/api/me/role", headers={"X-Player-Token": p1["session_token"]}).json()
    assert r1["role"] == "CITIZEN"
    assert r1["display_name"] == "Civilian"
    assert r1["card_image"] == "/civilian-card.jpg"
    assert "survive" in r1["description"].lower()


def test_doctor_role_card_image(client):
    create_resp = client.post("/api/games", json={
        "required_players": 3,
        "roles": {"MAFIA": 0, "CITIZEN": 0, "DETECTIVE": 0, "DOCTOR": 3}
    })
    game_code = create_resp.json()["game"]["game_code"]
    host_token = create_resp.json()["host_token"]

    p1 = client.post(f"/api/games/{game_code}/join", json={"player_name": "DrHouse"}).json()
    p2 = client.post(f"/api/games/{game_code}/join", json={"player_name": "DrWatson"}).json()
    p3 = client.post(f"/api/games/{game_code}/join", json={"player_name": "DrStrange"}).json()

    client.post(f"/api/games/{game_code}/distribute", headers={"X-Host-Token": host_token})

    r1 = client.get("/api/me/role", headers={"X-Player-Token": p1["session_token"]}).json()
    assert r1["role"] == "DOCTOR"
    assert r1["display_name"] == "Doctor"
    assert r1["card_image"] == "/doctor-card.jpg"
    assert "save" in r1["description"].lower()


def test_rematch_flow_keeps_code_and_players(client):
    create_resp = client.post("/api/games", json={
        "required_players": 3,
        "roles": {"MAFIA": 1, "CITIZEN": 1, "DETECTIVE": 1, "DOCTOR": 0}
    })
    game_code = create_resp.json()["game"]["game_code"]
    host_token = create_resp.json()["host_token"]

    p1 = client.post(f"/api/games/{game_code}/join", json={"player_name": "Player1"}).json()
    p2 = client.post(f"/api/games/{game_code}/join", json={"player_name": "Player2"}).json()
    p3 = client.post(f"/api/games/{game_code}/join", json={"player_name": "Player3"}).json()

    # Distribute round 1
    dist_resp = client.post(f"/api/games/{game_code}/distribute", headers={"X-Host-Token": host_token})
    assert dist_resp.status_code == 200
    assert dist_resp.json()["status"] == "DISTRIBUTED"

    r1_before = client.get("/api/me/role", headers={"X-Player-Token": p1["session_token"]})
    assert r1_before.status_code == 200
    assert "role" in r1_before.json()

    # Host triggers Rematch
    rematch_resp = client.post(f"/api/games/{game_code}/rematch", headers={"X-Host-Token": host_token})
    assert rematch_resp.status_code == 200
    assert rematch_resp.json()["status"] == "WAITING"
    assert rematch_resp.json()["game_code"] == game_code
    assert rematch_resp.json()["total_players"] == 3

    # All players still in game
    players_resp = client.get(f"/api/games/{game_code}/players")
    assert players_resp.status_code == 200
    assert len(players_resp.json()) == 3

    # Roles cleared until re-distributed
    r1_during = client.get("/api/me/role", headers={"X-Player-Token": p1["session_token"]})
    assert r1_during.status_code == 400

    # Distribute round 2 with same room code
    dist2_resp = client.post(f"/api/games/{game_code}/distribute", headers={"X-Host-Token": host_token})
    assert dist2_resp.status_code == 200
    assert dist2_resp.json()["status"] == "DISTRIBUTED"

    r1_after = client.get("/api/me/role", headers={"X-Player-Token": p1["session_token"]})
    assert r1_after.status_code == 200
    assert "role" in r1_after.json()


def test_lobby_kick_player(client):
    create_resp = client.post("/api/games", json={
        "required_players": 4,
        "roles": {"MAFIA": 1, "CITIZEN": 3, "DETECTIVE": 0, "DOCTOR": 0}
    })
    game_code = create_resp.json()["game"]["game_code"]
    host_token = create_resp.json()["host_token"]

    client.post(f"/api/games/{game_code}/join", json={"player_name": "Alice"})
    client.post(f"/api/games/{game_code}/join", json={"player_name": "Bob"})
    client.post(f"/api/games/{game_code}/join", json={"player_name": "Charlie"})

    players_before = client.get(f"/api/games/{game_code}/players").json()
    assert len(players_before) == 3

    # Unauthorized kick should fail
    kick_unauth = client.delete(f"/api/games/{game_code}/players/Charlie")
    assert kick_unauth.status_code == 403

    # Host kicks Charlie
    kick_resp = client.delete(f"/api/games/{game_code}/players/Charlie", headers={"X-Host-Token": host_token})
    assert kick_resp.status_code == 200
    assert kick_resp.json()["joined_player_count"] == 2

    players_after = client.get(f"/api/games/{game_code}/players").json()
    assert len(players_after) == 2
    names = [p["name"] for p in players_after]
    assert "Charlie" not in names
    assert "Alice" in names
    assert "Bob" in names


def test_in_game_eliminate_and_revive(client):
    create_resp = client.post("/api/games", json={
        "required_players": 3,
        "roles": {"MAFIA": 1, "CITIZEN": 2, "DETECTIVE": 0, "DOCTOR": 0}
    })
    game_code = create_resp.json()["game"]["game_code"]
    host_token = create_resp.json()["host_token"]

    p1 = client.post(f"/api/games/{game_code}/join", json={"player_name": "P1"}).json()
    p2 = client.post(f"/api/games/{game_code}/join", json={"player_name": "P2"}).json()
    p3 = client.post(f"/api/games/{game_code}/join", json={"player_name": "P3"}).json()

    # Distribute cards
    client.post(f"/api/games/{game_code}/distribute", headers={"X-Host-Token": host_token})

    # Host eliminates P2
    elim_resp = client.post(f"/api/games/{game_code}/players/P2/eliminate", headers={"X-Host-Token": host_token})
    assert elim_resp.status_code == 200
    assert elim_resp.json()["is_alive"] is False

    # Check P2's role response has is_alive = False
    r2_dead = client.get("/api/me/role", headers={"X-Player-Token": p2["session_token"]}).json()
    assert r2_dead["is_alive"] is False

    # Check public players roster marks P2 as dead
    players = client.get(f"/api/games/{game_code}/players").json()
    p2_entry = next(p for p in players if p["name"] == "P2")
    assert p2_entry["is_alive"] is False

    # Host revives P2
    revive_resp = client.post(f"/api/games/{game_code}/players/P2/revive", headers={"X-Host-Token": host_token})
    assert revive_resp.status_code == 200
    assert revive_resp.json()["is_alive"] is True

    # P2 is alive again
    r2_alive = client.get("/api/me/role", headers={"X-Player-Token": p2["session_token"]}).json()
    assert r2_alive["is_alive"] is True


def test_mafia_classic_preservation_and_isolation(client):
    """Verifies that Mafia Classic preserves original roles and original card image paths."""
    resp = client.post("/api/games", json={
        "required_players": 4,
        "game_mode": "CLASSIC",
        "roles": {"MAFIA": 1, "CITIZEN": 1, "DETECTIVE": 1, "DOCTOR": 1}
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["game"]["game_mode"] == "CLASSIC"
    # In Classic mode, role_counts must only have the 4 basic roles
    assert set(data["game"]["role_counts"].keys()) == {"MAFIA", "CITIZEN", "DETECTIVE", "DOCTOR"}

    game_code = data["game"]["game_code"]
    host_token = data["host_token"]

    tokens = []
    for i in range(4):
        p = client.post(f"/api/games/{game_code}/join", json={"player_name": f"Classic_{i}"}).json()
        tokens.append(p["session_token"])

    client.post(f"/api/games/{game_code}/distribute", headers={"X-Host-Token": host_token})

    # Verify each player gets a Classic card path and classic card back
    for tok in tokens:
        role_data = client.get("/api/me/role", headers={"X-Player-Token": tok}).json()
        assert role_data["game_mode"] == "CLASSIC"
        assert role_data["card_back_image"] == "/card-back.jpg"
        assert role_data["card_image"] in [
            "/mafia-card.jpg",
            "/civilian-card.jpg",
            "/detective-card.jpg",
            "/doctor-card.jpg"
        ]


def test_mafia_elite_mode_roles_and_cards(client):
    """Verifies Mafia Elite includes all 7 roles and uses premium 3D elite card assets."""
    resp = client.post("/api/games", json={
        "required_players": 7,
        "game_mode": "ELITE",
        "roles": {
            "MAFIA": 1,
            "CITIZEN": 1,
            "DETECTIVE": 1,
            "DOCTOR": 1,
            "GODFATHER": 1,
            "JESTER": 1,
            "MAYOR": 1
        }
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["game"]["game_mode"] == "ELITE"
    assert len(data["game"]["role_counts"]) == 7
    assert data["game"]["role_counts"]["GODFATHER"] == 1
    assert data["game"]["role_counts"]["JESTER"] == 1
    assert data["game"]["role_counts"]["MAYOR"] == 1

    game_code = data["game"]["game_code"]
    host_token = data["host_token"]

    tokens = []
    for i in range(7):
        p = client.post(f"/api/games/{game_code}/join", json={"player_name": f"Elite_{i}"}).json()
        tokens.append(p["session_token"])

    client.post(f"/api/games/{game_code}/distribute", headers={"X-Host-Token": host_token})

    roles_seen = []
    for tok in tokens:
        role_data = client.get("/api/me/role", headers={"X-Player-Token": tok}).json()
        assert role_data["game_mode"] == "ELITE"
        assert role_data["card_back_image"] == "/elite-card-back.jpg"
        assert "elite-" in role_data["card_image"]
        roles_seen.append(role_data["role"])

    assert set(roles_seen) == {"MAFIA", "CITIZEN", "DETECTIVE", "DOCTOR", "GODFATHER", "JESTER", "MAYOR"}


def test_godfather_investigation_deception(client):
    """Godfather appears as INNOCENT to the Detective when investigated."""
    resp = client.post("/api/games", json={
        "required_players": 3,
        "game_mode": "ELITE",
        "roles": {"DETECTIVE": 1, "GODFATHER": 1, "MAFIA": 1}
    })
    game_code = resp.json()["game"]["game_code"]
    host_token = resp.json()["host_token"]

    p_det = client.post(f"/api/games/{game_code}/join", json={"player_name": "Holmes"}).json()
    p_god = client.post(f"/api/games/{game_code}/join", json={"player_name": "Corleone"}).json()
    p_maf = client.post(f"/api/games/{game_code}/join", json={"player_name": "Goon"}).json()

    # Fixed assignment for test determinism
    client.post(f"/api/games/{game_code}/distribute", headers={"X-Host-Token": host_token})

    # Find detective session
    det_token = None
    for p in [p_det, p_god, p_maf]:
        r = client.get("/api/me/role", headers={"X-Player-Token": p["session_token"]}).json()
        if r["role"] == "DETECTIVE":
            det_token = p["session_token"]
        elif r["role"] == "GODFATHER":
            godfather_name = r["player_name"]
        elif r["role"] == "MAFIA":
            mafia_name = r["player_name"]

    assert det_token is not None

    # Detective investigates Godfather -> Must show INNOCENT!
    inv_god = client.post(
        f"/api/games/{game_code}/investigate",
        json={"target_player_name": godfather_name},
        headers={"X-Player-Token": det_token}
    ).json()
    assert inv_god["result"] == "INNOCENT"
    assert "innocent" in inv_god["message"].lower()

    # Detective investigates regular Mafia -> Shows GUILTY!
    inv_maf = client.post(
        f"/api/games/{game_code}/investigate",
        json={"target_player_name": mafia_name},
        headers={"X-Player-Token": det_token}
    ).json()
    assert inv_maf["result"] == "GUILTY"
    assert inv_maf["allegiance"] == "Mafia"


def test_jester_victory_on_town_vote(client):
    """Jester achieves independent victory when voted out by town, but not if killed at night."""
    resp = client.post("/api/games", json={
        "required_players": 3,
        "game_mode": "ELITE",
        "roles": {"JESTER": 1, "MAFIA": 1, "CITIZEN": 1}
    })
    game_code = resp.json()["game"]["game_code"]
    host_token = resp.json()["host_token"]

    p1 = client.post(f"/api/games/{game_code}/join", json={"player_name": "Player_A"}).json()
    p2 = client.post(f"/api/games/{game_code}/join", json={"player_name": "Player_B"}).json()
    p3 = client.post(f"/api/games/{game_code}/join", json={"player_name": "Player_C"}).json()

    client.post(f"/api/games/{game_code}/distribute", headers={"X-Host-Token": host_token})

    jester_name = None
    for p in [p1, p2, p3]:
        r = client.get("/api/me/role", headers={"X-Player-Token": p["session_token"]}).json()
        if r["role"] == "JESTER":
            jester_name = r["player_name"]

    assert jester_name is not None

    # Night kill on Jester does NOT trigger victory
    elim_night = client.post(
        f"/api/games/{game_code}/players/{jester_name}/eliminate",
        json={"reason": "NIGHT_KILL"},
        headers={"X-Host-Token": host_token}
    ).json()
    assert elim_night["is_alive"] is False
    assert elim_night["jester_victory"] is False

    # Revive Jester
    client.post(f"/api/games/{game_code}/players/{jester_name}/revive", headers={"X-Host-Token": host_token})

    # Town vote out on Jester triggers Jester independent victory!
    elim_vote = client.post(
        f"/api/games/{game_code}/players/{jester_name}/eliminate",
        json={"reason": "VOTED_OUT"},
        headers={"X-Host-Token": host_token}
    ).json()
    assert elim_vote["is_alive"] is False
    assert elim_vote["jester_victory"] is True


def test_detective_guards_self_and_dead_investigation(client):
    """Detective cannot investigate themselves or dead targets, and dead Detective cannot investigate."""
    resp = client.post("/api/games", json={
        "required_players": 3,
        "game_mode": "ELITE",
        "roles": {"DETECTIVE": 1, "CITIZEN": 1, "MAFIA": 1}
    })
    game_code = resp.json()["game"]["game_code"]
    host_token = resp.json()["host_token"]

    p1 = client.post(f"/api/games/{game_code}/join", json={"player_name": "Det_Holmes"}).json()
    p2 = client.post(f"/api/games/{game_code}/join", json={"player_name": "Target_A"}).json()
    p3 = client.post(f"/api/games/{game_code}/join", json={"player_name": "Target_B"}).json()

    client.post(f"/api/games/{game_code}/distribute", headers={"X-Host-Token": host_token})

    det_token = None
    det_name = None
    other_name = None
    for p in [p1, p2, p3]:
        r = client.get("/api/me/role", headers={"X-Player-Token": p["session_token"]}).json()
        if r["role"] == "DETECTIVE":
            det_token = p["session_token"]
            det_name = r["player_name"]
        else:
            other_name = r["player_name"]

    # Self-investigation rejected
    self_resp = client.post(
        f"/api/games/{game_code}/investigate",
        json={"target_player_name": det_name},
        headers={"X-Player-Token": det_token}
    )
    assert self_resp.status_code == 400
    assert "yourself" in self_resp.json()["detail"].lower()

    # Eliminate target, then try investigating dead player
    client.post(
        f"/api/games/{game_code}/players/{other_name}/eliminate",
        json={"reason": "NIGHT_KILL"},
        headers={"X-Host-Token": host_token}
    )
    dead_target_resp = client.post(
        f"/api/games/{game_code}/investigate",
        json={"target_player_name": other_name},
        headers={"X-Player-Token": det_token}
    )
    assert dead_target_resp.status_code == 400
    assert "eliminated" in dead_target_resp.json()["detail"].lower()

    # Eliminate Detective, then try investigating
    client.post(
        f"/api/games/{game_code}/players/{det_name}/eliminate",
        json={"reason": "NIGHT_KILL"},
        headers={"X-Host-Token": host_token}
    )
    dead_det_resp = client.post(
        f"/api/games/{game_code}/investigate",
        json={"target_player_name": other_name},
        headers={"X-Player-Token": det_token}
    )
    assert dead_det_resp.status_code == 403


def test_classic_mode_strict_preservation(client):
    """Mafia Classic strictly preserves 4 roles, /card-back.jpg, and classic card images."""
    resp = client.post("/api/games", json={
        "required_players": 5,
        "game_mode": "CLASSIC",
        "roles": {
            "MAFIA": 1,
            "CITIZEN": 2,
            "DETECTIVE": 1,
            "DOCTOR": 1
        }
    })
    assert resp.status_code == 201
    game = resp.json()["game"]
    assert game["game_mode"] == "CLASSIC"
    assert set(game["role_counts"].keys()) == {"MAFIA", "CITIZEN", "DETECTIVE", "DOCTOR"}

    game_code = game["game_code"]
    host_token = resp.json()["host_token"]

    tokens = []
    for i in range(5):
        p = client.post(f"/api/games/{game_code}/join", json={"player_name": f"Classic_{i}"}).json()
        tokens.append(p["session_token"])

    client.post(f"/api/games/{game_code}/distribute", headers={"X-Host-Token": host_token})

    for tok in tokens:
        role_data = client.get("/api/me/role", headers={"X-Player-Token": tok}).json()
        assert role_data["game_mode"] == "CLASSIC"
        assert role_data["card_back_image"] == "/card-back.jpg"
        assert "elite-" not in role_data["card_image"]
        assert role_data["role"] in {"MAFIA", "CITIZEN", "DETECTIVE", "DOCTOR"}


def test_mayor_metadata_and_elite_mechanics(client):
    """Mayor metadata specifies Town allegiance, double voting weight, and elite artwork."""
    from backend.schemas import ROLE_METADATA_ELITE
    mayor = ROLE_METADATA_ELITE["MAYOR"]
    assert mayor["team"] == "Town"
    assert "2" in mayor["special_ability"] or "Double" in mayor["special_ability"]
    assert mayor["card_image"] == "/elite-mayor-card.jpg"









