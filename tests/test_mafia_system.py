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

