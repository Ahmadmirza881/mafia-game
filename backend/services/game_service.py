import hashlib
import secrets
from typing import Dict, List, Optional, Tuple
from sqlalchemy.orm import Session
from backend.models import Game, Player, RoleConfiguration, RoleAssignment
from backend.schemas import ROLE_METADATA, GamePublicResponse, PublicPlayer

def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()

def generate_game_code(db: Session) -> str:
    # Generates human-friendly format MAFIA-4821 avoiding ambiguous characters
    digits = "23456789"
    while True:
        num = "".join(secrets.choice(digits) for _ in range(4))
        code = f"MAFIA-{num}"
        existing = db.query(Game).filter(Game.game_code == code).first()
        if not existing:
            return code

def format_game_response(game: Game) -> GamePublicResponse:
    role_counts = {role: 0 for role in ROLE_METADATA.keys()}
    for rc in game.role_configurations:
        if rc.role_name in role_counts:
            role_counts[rc.role_name] = rc.quantity

    total_cards = sum(role_counts.values())
    joined_count = len(game.players)
    is_ready = (
        joined_count == game.required_players
        and total_cards == game.required_players
        and game.status == "WAITING"
    )

    return GamePublicResponse(
        game_code=game.game_code,
        required_players=game.required_players,
        joined_player_count=joined_count,
        status=game.status,
        total_cards=total_cards,
        role_counts=role_counts,
        is_ready_to_distribute=is_ready,
        cards_difference=total_cards - game.required_players,
    )

def create_game(
    db: Session,
    required_players: int,
    roles: Dict[str, int],
    host_email: Optional[str] = None,
    host_password: Optional[str] = None,
) -> Tuple[Game, str]:
    game_code = generate_game_code(db)
    host_raw_token = secrets.token_urlsafe(32)
    host_token_hash = hash_token(host_raw_token)
    
    clean_email = host_email.strip().lower() if host_email and host_email.strip() else None
    clean_pwd_hash = hash_token(host_password.strip()) if host_password and host_password.strip() else None

    game = Game(
        game_code=game_code,
        host_token_hash=host_token_hash,
        host_email=clean_email,
        host_password_hash=clean_pwd_hash,
        required_players=required_players,
        status="WAITING"
    )
    db.add(game)
    db.flush()

    for role_name in ROLE_METADATA.keys():
        qty = max(0, roles.get(role_name, 0))
        config = RoleConfiguration(
            game_id=game.id,
            role_name=role_name,
            quantity=qty
        )
        db.add(config)

    db.commit()
    db.refresh(game)
    return game, host_raw_token

def get_game_by_code(db: Session, game_code: str) -> Optional[Game]:
    code = game_code.strip().upper()
    return db.query(Game).filter(Game.game_code == code).first()

def verify_host(game: Game, host_token: str) -> bool:
    if not host_token:
        return False
    return secrets.compare_digest(game.host_token_hash, hash_token(host_token))

def authenticate_host(
    db: Session,
    game: Game,
    email: Optional[str],
    password: str
) -> Optional[str]:
    if not game.host_password_hash:
        return None

    pwd_hash = hash_token(password.strip())
    if not secrets.compare_digest(game.host_password_hash, pwd_hash):
        return None

    if game.host_email:
        clean_email = email.strip().lower() if email else ""
        if clean_email != game.host_email:
            return None

    # Password and optional email match! Reissue new host raw token
    new_raw_token = secrets.token_urlsafe(32)
    game.host_token_hash = hash_token(new_raw_token)
    db.commit()
    return new_raw_token

def update_role_configurations(
    db: Session,
    game: Game,
    roles: Dict[str, int],
    required_players: Optional[int] = None
) -> Game:
    if game.status != "WAITING":
        raise ValueError("Role configuration cannot be modified once distribution has started or completed.")

    if required_players is not None:
        if not (3 <= required_players <= 50):
            raise ValueError("Required players must be between 3 and 50.")
        if required_players < len(game.players):
            raise ValueError(
                f"Cannot reduce player count to {required_players} because {len(game.players)} players have already joined."
            )
        game.required_players = required_players

    existing_configs = {rc.role_name: rc for rc in game.role_configurations}
    for role_name in ROLE_METADATA.keys():
        qty = max(0, roles.get(role_name, 0))
        if role_name in existing_configs:
            existing_configs[role_name].quantity = qty
        else:
            db.add(RoleConfiguration(game_id=game.id, role_name=role_name, quantity=qty))

    db.commit()
    db.refresh(game)
    return game

def join_game(db: Session, game: Game, player_name: str) -> Tuple[Player, str]:
    name = player_name.strip()
    if not name:
        raise ValueError("Player name cannot be empty.")
    if len(name) > 50:
        raise ValueError("Player name cannot exceed 50 characters.")

    if game.status != "WAITING":
        if game.status in ("DISTRIBUTING", "DISTRIBUTED"):
            raise ValueError("This game has already distributed its cards.")
        raise ValueError("Game is not currently accepting players.")

    if len(game.players) >= game.required_players:
        raise ValueError("This game is already full.")

    # Check for duplicate player name (case-insensitive)
    for p in game.players:
        if p.name.strip().lower() == name.lower():
            raise ValueError(f"The name '{name}' is already taken in this game.")

    session_token = secrets.token_urlsafe(32)
    session_hash = hash_token(session_token)

    player = Player(
        game_id=game.id,
        name=name,
        session_token_hash=session_hash
    )
    db.add(player)
    db.commit()
    db.refresh(player)

    return player, session_token

def get_player_by_session(db: Session, session_token: str) -> Optional[Player]:
    if not session_token:
        return None
    token_hash = hash_token(session_token)
    return db.query(Player).filter(Player.session_token_hash == token_hash).first()

def get_public_players(game: Game) -> List[PublicPlayer]:
    # CRITICAL: Returns ONLY name and joined_at. NEVER roles!
    return [PublicPlayer(name=p.name, joined_at=p.joined_at) for p in game.players]
