import datetime
import secrets
from typing import Dict
from sqlalchemy.orm import Session
from backend.models import Game, RoleAssignment
from backend.schemas import ROLE_METADATA

def distribute_roles(db: Session, game: Game) -> Dict:
    # 1. State check - Idempotent guard
    if game.status == "DISTRIBUTED":
        # Game already distributed: reject redistribution
        raise ValueError("This game has already distributed its cards.")

    if game.status == "DISTRIBUTING":
        raise ValueError("Card distribution is currently in progress.")

    if game.status != "WAITING":
        raise ValueError(f"Cannot distribute cards in '{game.status}' state.")

    # 2. Player count check
    joined_players = list(game.players)
    joined_count = len(joined_players)
    if joined_count != game.required_players:
        raise ValueError(
            f"Waiting for all players to join. ({joined_count}/{game.required_players} joined)"
        )

    # 3. Role count check
    role_pool = []
    for rc in game.role_configurations:
        if rc.role_name in ROLE_METADATA:
            role_pool.extend([rc.role_name] * rc.quantity)

    total_cards = len(role_pool)
    if total_cards < game.required_players:
        remaining = game.required_players - total_cards
        raise ValueError(f"Role cards must equal the number of players. ({remaining} card(s) remaining)")
    elif total_cards > game.required_players:
        extra = total_cards - game.required_players
        raise ValueError(f"Too many cards configured. ({extra} card(s) over limit)")

    # 4. Atomic Distribution
    game.status = "DISTRIBUTING"
    db.commit()

    try:
        # Cryptographically secure random shuffle
        secure_random = secrets.SystemRandom()
        secure_random.shuffle(role_pool)

        now = datetime.datetime.utcnow()

        # Delete any accidental existing assignments if any (safety)
        db.query(RoleAssignment).filter(RoleAssignment.game_id == game.id).delete()

        # Assign each player exactly one role
        for player, role_name in zip(joined_players, role_pool):
            assignment = RoleAssignment(
                game_id=game.id,
                player_id=player.id,
                role_name=role_name,
                assigned_at=now
            )
            db.add(assignment)

        game.status = "DISTRIBUTED"
        game.distributed_at = now
        db.commit()
        db.refresh(game)

        return {
            "success": True,
            "message": f"Cards distributed successfully. {joined_count} / {joined_count} players received cards.",
            "total_players": joined_count,
            "status": "DISTRIBUTED"
        }
    except Exception as e:
        db.rollback()
        game.status = "WAITING"
        db.commit()
        raise e
