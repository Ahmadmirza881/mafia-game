from typing import List, Optional
from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import Game
from backend.schemas import (
    CreateGameRequest,
    CreateGameResponse,
    DistributeResponse,
    GamePublicResponse,
    HostLoginRequest,
    PublicPlayer,
    UpdateRolesRequest,
)
from backend.services.game_service import (
    authenticate_host,
    create_game,
    format_game_response,
    get_game_by_code,
    get_public_players,
    update_role_configurations,
    verify_host,
)
from backend.services.distribution_service import distribute_roles
from backend.websocket_manager import manager

router = APIRouter(prefix="/api/games", tags=["games"])


@router.post("", response_model=CreateGameResponse, status_code=status.HTTP_201_CREATED)
def api_create_game(req: CreateGameRequest, db: Session = Depends(get_db)):
    game, host_token = create_game(
        db,
        req.required_players,
        req.roles,
        host_email=req.host_email,
        host_password=req.host_password
    )
    return CreateGameResponse(
        game=format_game_response(game),
        host_token=host_token
    )


@router.post("/{game_code}/host-login")
def api_host_login(
    game_code: str,
    req: HostLoginRequest,
    db: Session = Depends(get_db)
):
    game = get_game_by_code(db, game_code)
    if not game:
        raise HTTPException(status_code=404, detail="Game not found.")

    host_token = authenticate_host(db, game, req.host_email, req.host_password)
    if not host_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid host credentials. Check game code, email and password."
        )

    return {
        "success": True,
        "host_token": host_token,
        "game": format_game_response(game)
    }


@router.get("/{game_code}", response_model=GamePublicResponse)
def api_get_game(game_code: str, db: Session = Depends(get_db)):
    game = get_game_by_code(db, game_code)
    if not game:
        raise HTTPException(status_code=404, detail="Game not found.")
    return format_game_response(game)


@router.get("/{game_code}/players", response_model=List[PublicPlayer])
def api_get_players(game_code: str, db: Session = Depends(get_db)):
    # CRITICAL: Returns ONLY name and joined_at. No roles are exposed!
    game = get_game_by_code(db, game_code)
    if not game:
        raise HTTPException(status_code=404, detail="Game not found.")
    return get_public_players(game)


@router.patch("/{game_code}/roles", response_model=GamePublicResponse)
async def api_update_roles(
    game_code: str,
    req: UpdateRolesRequest,
    x_host_token: Optional[str] = Header(None, alias="X-Host-Token"),
    db: Session = Depends(get_db)
):
    game = get_game_by_code(db, game_code)
    if not game:
        raise HTTPException(status_code=404, detail="Game not found.")

    if not verify_host(game, x_host_token or ""):
        raise HTTPException(status_code=403, detail="Unauthorized: Invalid Host Token.")

    try:
        updated_game = update_role_configurations(db, game, req.roles, req.required_players)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    game_resp = format_game_response(updated_game)

    # Broadcast configuration update to all connected clients
    await manager.broadcast(game.game_code, {
        "type": "GAME_CONFIG_UPDATED",
        "game": game_resp.model_dump()
    })

    return game_resp


@router.post("/{game_code}/distribute", response_model=DistributeResponse)
async def api_distribute_cards(
    game_code: str,
    x_host_token: Optional[str] = Header(None, alias="X-Host-Token"),
    db: Session = Depends(get_db)
):
    game = get_game_by_code(db, game_code)
    if not game:
        raise HTTPException(status_code=404, detail="Game not found.")

    if not verify_host(game, x_host_token or ""):
        raise HTTPException(status_code=403, detail="Unauthorized: Only the host can distribute cards.")

    # Broadcast that distribution started
    await manager.broadcast(game.game_code, {
        "type": "DISTRIBUTION_STARTED"
    })

    try:
        result = distribute_roles(db, game)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Broadcast DISTRIBUTION_COMPLETE to all connected clients.
    # CRITICAL: WE DO NOT INCLUDE ROLES IN THIS BROADCAST!
    await manager.broadcast(game.game_code, {
        "type": "DISTRIBUTION_COMPLETE",
        "total_players": result["total_players"],
        "status": "DISTRIBUTED"
    })

    return DistributeResponse(
        success=True,
        message=result["message"],
        total_players=result["total_players"],
        status="DISTRIBUTED"
    )


@router.post("/{game_code}/close")
async def api_close_game(
    game_code: str,
    x_host_token: Optional[str] = Header(None, alias="X-Host-Token"),
    db: Session = Depends(get_db)
):
    game = get_game_by_code(db, game_code)
    if not game:
        raise HTTPException(status_code=404, detail="Game not found.")

    if not verify_host(game, x_host_token or ""):
        raise HTTPException(status_code=403, detail="Unauthorized: Only the host can cancel this game.")

    game.status = "CLOSED"
    db.commit()

    # Broadcast to all connected clients that the game was closed
    await manager.broadcast(game.game_code, {
        "type": "GAME_CLOSED",
        "message": "The host has closed this game lobby."
    })

    return {"success": True, "message": "Game lobby closed successfully."}

