from datetime import datetime
from typing import Dict, List, Optional
from pydantic import BaseModel, Field

ROLE_METADATA = {
    "MAFIA": {
        "display_name": "Mafia",
        "icon": "♠",
        "description": "Eliminate the citizens without getting caught. Work in secret."
    },
    "CITIZEN": {
        "display_name": "Citizen",
        "icon": "🛡",
        "description": "Identify and eliminate the Mafia during the town discussions."
    },
    "DETECTIVE": {
        "display_name": "Detective",
        "icon": "🔍",
        "description": "Investigate suspects to reveal their true allegiance."
    },
    "DOCTOR": {
        "display_name": "Doctor",
        "icon": "✚",
        "description": "Protect innocent lives and heal targets from danger."
    }
}


class CreateGameRequest(BaseModel):
    required_players: int = Field(default=5, ge=3, le=50)
    roles: Dict[str, int] = Field(
        default_factory=lambda: {"MAFIA": 1, "CITIZEN": 2, "DETECTIVE": 1, "DOCTOR": 1}
    )
    host_email: Optional[str] = Field(default=None, max_length=120)
    host_password: Optional[str] = Field(default=None, min_length=4, max_length=100)


class HostLoginRequest(BaseModel):
    host_email: Optional[str] = None
    host_password: str


class UpdateRolesRequest(BaseModel):
    required_players: Optional[int] = Field(default=None, ge=3, le=50)
    roles: Dict[str, int]


class JoinGameRequest(BaseModel):
    player_name: str = Field(..., min_length=1, max_length=50)


class PublicPlayer(BaseModel):
    name: str
    joined_at: datetime

    model_config = {"from_attributes": True}


class GamePublicResponse(BaseModel):
    game_code: str
    required_players: int
    joined_player_count: int
    status: str
    total_cards: int
    role_counts: Dict[str, int]
    is_ready_to_distribute: bool
    cards_difference: int  # total_cards - required_players


class CreateGameResponse(BaseModel):
    game: GamePublicResponse
    host_token: str


class JoinGameResponse(BaseModel):
    game: GamePublicResponse
    player_name: str
    session_token: str


class PlayerRoleResponse(BaseModel):
    role: str
    display_name: str
    icon: str
    description: str
    player_name: str
    game_code: str


class DistributeResponse(BaseModel):
    success: bool
    message: str
    total_players: int
    status: str
