from typing import Optional
from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import RoleAssignment
from backend.schemas import (
    JoinGameRequest,
    JoinGameResponse,
    PlayerRoleResponse,
    ROLE_METADATA,
)
from backend.services.game_service import (
    format_game_response,
    get_game_by_code,
    get_player_by_session,
    join_game,
)
from backend.websocket_manager import manager

router = APIRouter(prefix="/api", tags=["players"])


@router.post("/games/{game_code}/join", response_model=JoinGameResponse, status_code=status.HTTP_201_CREATED)
async def api_join_game(
    game_code: str,
    req: JoinGameRequest,
    db: Session = Depends(get_db)
):
    game = get_game_by_code(db, game_code)
    if not game:
        raise HTTPException(status_code=404, detail="Game not found.")

    try:
        player, session_token = join_game(db, game, req.player_name)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    game_resp = format_game_response(game)

    # Realtime notification: Notify host and players in the room
    await manager.broadcast(game.game_code, {
        "type": "PLAYER_JOINED",
        "player_name": player.name,
        "joined_count": game_resp.joined_player_count,
        "required_players": game_resp.required_players,
        "is_ready_to_distribute": game_resp.is_ready_to_distribute,
        "game": game_resp.model_dump()
    })

    return JoinGameResponse(
        game=game_resp,
        player_name=player.name,
        session_token=session_token
    )


@router.get("/me/role", response_model=PlayerRoleResponse)
def api_get_my_role(
    x_player_token: Optional[str] = Header(None, alias="X-Player-Token"),
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    # Support either X-Player-Token or Authorization: Bearer <token>
    token = x_player_token
    if not token and authorization:
        if authorization.lower().startswith("bearer "):
            token = authorization[7:].strip()
        else:
            token = authorization.strip()

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required: Missing player session token."
        )

    player = get_player_by_session(db, token)
    if not player:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired player session token."
        )

    game = player.game
    if not game:
        raise HTTPException(status_code=404, detail="Game not found for this player.")

    if game.status != "DISTRIBUTED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cards have not been distributed yet. Please wait for the host."
        )

    assignment = db.query(RoleAssignment).filter(
        RoleAssignment.game_id == game.id,
        RoleAssignment.player_id == player.id
    ).first()

    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No role assigned to this player."
        )

    role_meta = ROLE_METADATA.get(assignment.role_name, {
        "display_name": assignment.role_name.capitalize(),
        "icon": "❓",
        "description": "Role information not found."
    })

    return PlayerRoleResponse(
        role=assignment.role_name,
        display_name=role_meta["display_name"],
        icon=role_meta["icon"],
        description=role_meta["description"],
        player_name=player.name,
        game_code=game.game_code
    )
