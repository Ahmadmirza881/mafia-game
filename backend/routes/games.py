from typing import List, Optional
from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import Game
from backend.schemas import (
    CreateGameRequest,
    CreateGameResponse,
    DistributeResponse,
    EliminatePlayerRequest,
    GamePublicResponse,
    HostLoginRequest,
    InvestigateRequest,
    InvestigateResponse,
    PublicPlayer,
    UpdateRolesRequest,
)
from backend.services.game_service import (
    authenticate_host,
    create_game,
    format_game_response,
    get_game_by_code,
    get_player_by_session,
    get_public_players,
    update_role_configurations,
    verify_host,
)
from backend.services.distribution_service import distribute_roles, reset_game_for_rematch
from backend.websocket_manager import manager

router = APIRouter(prefix="/api/games", tags=["games"])


@router.post("", response_model=CreateGameResponse, status_code=status.HTTP_201_CREATED)
def api_create_game(req: CreateGameRequest, db: Session = Depends(get_db)):
    game, host_token = create_game(
        db,
        req.required_players,
        req.roles,
        host_email=req.host_email,
        host_password=req.host_password,
        game_mode=req.game_mode,
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


@router.post("/{game_code}/rematch")
async def api_rematch_game(
    game_code: str,
    x_host_token: Optional[str] = Header(None, alias="X-Host-Token"),
    db: Session = Depends(get_db)
):
    game = get_game_by_code(db, game_code)
    if not game:
        raise HTTPException(status_code=404, detail="Game not found.")

    if not verify_host(game, x_host_token or ""):
        raise HTTPException(status_code=403, detail="Unauthorized: Only the host can initiate a rematch.")

    try:
        result = reset_game_for_rematch(db, game)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Broadcast REMATCH_STARTED to all connected clients
    await manager.broadcast(game.game_code, {
        "type": "REMATCH_STARTED",
        "status": "WAITING",
        "game_code": game.game_code,
        "game": format_game_response(game).model_dump(),
        "message": "Host initiated a rematch! All players remain in room."
    })

    return result


@router.delete("/{game_code}/players/{player_name}")
async def api_kick_player(
    game_code: str,
    player_name: str,
    x_host_token: Optional[str] = Header(None, alias="X-Host-Token"),
    db: Session = Depends(get_db)
):
    game = get_game_by_code(db, game_code)
    if not game:
        raise HTTPException(status_code=404, detail="Game not found.")

    if not verify_host(game, x_host_token or ""):
        raise HTTPException(status_code=403, detail="Unauthorized: Only the host can kick players.")

    if game.status != "WAITING":
        raise HTTPException(status_code=400, detail="Players can only be kicked while in the waiting lobby.")

    target_player = next((p for p in game.players if p.name.strip().lower() == player_name.strip().lower()), None)
    if not target_player:
        raise HTTPException(status_code=404, detail=f"Player '{player_name}' not found in this game.")

    db.delete(target_player)
    db.commit()
    db.refresh(game)

    # Broadcast to all connected clients
    await manager.broadcast(game.game_code, {
        "type": "PLAYER_KICKED",
        "kicked_player_name": player_name,
        "joined_count": len(game.players),
        "game": format_game_response(game).model_dump()
    })

    return {
        "success": True,
        "message": f"Player '{player_name}' was removed from the lobby.",
        "joined_player_count": len(game.players)
    }


@router.post("/{game_code}/players/{player_name}/eliminate")
async def api_eliminate_player(
    game_code: str,
    player_name: str,
    req: Optional[EliminatePlayerRequest] = None,
    x_host_token: Optional[str] = Header(None, alias="X-Host-Token"),
    db: Session = Depends(get_db)
):
    game = get_game_by_code(db, game_code)
    if not game:
        raise HTTPException(status_code=404, detail="Game not found.")

    if not verify_host(game, x_host_token or ""):
        raise HTTPException(status_code=403, detail="Unauthorized: Only the host can eliminate players.")

    target_player = next((p for p in game.players if p.name.strip().lower() == player_name.strip().lower()), None)
    if not target_player:
        raise HTTPException(status_code=404, detail=f"Player '{player_name}' not found in this game.")

    target_player.is_alive = False
    db.commit()

    elim_reason = req.reason if req else "VOTED_OUT"
    target_role = target_player.role_assignment.role_name if target_player.role_assignment else None
    mode = (game.game_mode or "CLASSIC").upper()

    # Jester Rule: If voted out by the town in Mafia Elite, Jester wins independently!
    is_jester_victory = (mode == "ELITE" and target_role == "JESTER" and elim_reason == "VOTED_OUT")

    # Broadcast status update
    await manager.broadcast(game.game_code, {
        "type": "PLAYER_STATUS_UPDATED",
        "player_name": target_player.name,
        "is_alive": False,
        "reason": elim_reason,
        "is_jester_victory": is_jester_victory,
    })

    if is_jester_victory:
        await manager.broadcast(game.game_code, {
            "type": "JESTER_VICTORY",
            "player_name": target_player.name,
            "message": f"🎭 {target_player.name} (The Jester) has been voted out and achieved an independent victory!"
        })

    return {
        "success": True,
        "message": f"Player '{target_player.name}' has been eliminated.",
        "player_name": target_player.name,
        "is_alive": False,
        "elimination_reason": elim_reason,
        "jester_victory": is_jester_victory,
    }


@router.post("/{game_code}/investigate", response_model=InvestigateResponse)
def api_investigate_player(
    game_code: str,
    req: InvestigateRequest,
    x_player_token: Optional[str] = Header(None, alias="X-Player-Token"),
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    token = x_player_token
    if not token and authorization:
        if authorization.lower().startswith("bearer "):
            token = authorization[7:].strip()
        else:
            token = authorization.strip()

    if not token:
        raise HTTPException(status_code=401, detail="Authentication required: Missing player session token.")

    player = get_player_by_session(db, token)
    if not player or player.game.game_code != game_code:
        raise HTTPException(status_code=401, detail="Invalid player token for this game.")

    if player.game.status != "DISTRIBUTED":
        raise HTTPException(status_code=400, detail="Cards have not been distributed yet.")

    if not player.role_assignment or player.role_assignment.role_name != "DETECTIVE":
        raise HTTPException(status_code=403, detail="Only the Detective can perform investigations.")

    if not getattr(player, "is_alive", True):
        raise HTTPException(status_code=403, detail="Dead players cannot perform investigations.")

    target = next((p for p in player.game.players if p.name.strip().lower() == req.target_player_name.strip().lower()), None)
    if not target:
        raise HTTPException(status_code=404, detail=f"Target player '{req.target_player_name}' not found.")

    if target.id == player.id:
        raise HTTPException(status_code=400, detail="You cannot investigate yourself.")

    if not getattr(target, "is_alive", True):
        raise HTTPException(status_code=400, detail="Target player has already been eliminated.")

    target_role = target.role_assignment.role_name if target.role_assignment else "CITIZEN"

    # GODFATHER SPECIAL RULE: Appears as INNOCENT to Detective!
    if target_role == "GODFATHER":
        result = "INNOCENT"
        allegiance = "Town / Civilian"
        message = f"{target.name} appears innocent and shows no mafia ties."
    elif target_role == "MAFIA":
        result = "GUILTY"
        allegiance = "Mafia"
        message = f"{target.name} was detected as a member of the Mafia!"
    else:
        result = "INNOCENT"
        allegiance = "Town / Civilian"
        message = f"{target.name} appears innocent and loyal to the Town."

    return InvestigateResponse(
        target_name=target.name,
        result=result,
        allegiance=allegiance,
        message=message
    )


@router.post("/{game_code}/players/{player_name}/revive")
async def api_revive_player(
    game_code: str,
    player_name: str,
    x_host_token: Optional[str] = Header(None, alias="X-Host-Token"),
    db: Session = Depends(get_db)
):
    game = get_game_by_code(db, game_code)
    if not game:
        raise HTTPException(status_code=404, detail="Game not found.")

    if not verify_host(game, x_host_token or ""):
        raise HTTPException(status_code=403, detail="Unauthorized: Only the host can revive players.")

    target_player = next((p for p in game.players if p.name.strip().lower() == player_name.strip().lower()), None)
    if not target_player:
        raise HTTPException(status_code=404, detail=f"Player '{player_name}' not found in this game.")

    target_player.is_alive = True
    db.commit()

    # Broadcast to all connected clients
    await manager.broadcast(game.game_code, {
        "type": "PLAYER_STATUS_UPDATED",
        "player_name": target_player.name,
        "is_alive": True
    })

    return {
        "success": True,
        "message": f"Player '{target_player.name}' has been revived.",
        "player_name": target_player.name,
        "is_alive": True
    }



