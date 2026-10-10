from datetime import datetime
from typing import Dict, List, Optional
from pydantic import BaseModel, Field

CLASSIC_ROLES = ["MAFIA", "CITIZEN", "DETECTIVE", "DOCTOR"]
ELITE_ROLES = ["MAFIA", "CITIZEN", "DETECTIVE", "DOCTOR", "GODFATHER", "JESTER", "MAYOR"]

# Original Mafia Classic card collection (100% preserved)
ROLE_METADATA_CLASSIC = {
    "MAFIA": {
        "display_name": "Mafia",
        "icon": "♠",
        "team": "Mafia",
        "special_ability": "Night Elimination",
        "description": "You are a member of the Mafia. Each night, you secretly choose one player to eliminate. Your goal is to eliminate all non-Mafia players and win the game.",
        "card_image": "/mafia-card.jpg"
    },
    "CITIZEN": {
        "display_name": "Civilian",
        "icon": "🛡",
        "team": "Town",
        "special_ability": "Daily Vote & Discussion",
        "description": "You are a Civilian. You have no special abilities. Your goal is to survive and find out who the Mafia are before it's too late.",
        "card_image": "/civilian-card.jpg"
    },
    "DETECTIVE": {
        "display_name": "Detective",
        "icon": "🔍",
        "team": "Town",
        "special_ability": "Night Investigation",
        "description": "You are a Detective. You can check one player's identity each night. Find out who is Mafia before it's too late.",
        "card_image": "/detective-card.jpg"
    },
    "DOCTOR": {
        "display_name": "Doctor",
        "icon": "✚",
        "team": "Town",
        "special_ability": "Night Protection",
        "description": "You are a Doctor. You can save one player during the night from being eliminated by the Mafia. Use your power wisely.",
        "card_image": "/doctor-card.jpg"
    }
}

# Premium 3D Mafia Elite card collection
ROLE_METADATA_ELITE = {
    "MAFIA": {
        "display_name": "Mafia",
        "icon": "♠",
        "team": "Mafia",
        "special_ability": "Night Elimination",
        "description": "You are a member of the Mafia. Coordinate in secret to eliminate the town night by night.",
        "card_image": "/elite-mafia-card.jpg"
    },
    "CITIZEN": {
        "display_name": "Civilian",
        "icon": "🛡",
        "team": "Town",
        "special_ability": "Daily Vote & Discussion",
        "description": "You are an honest Civilian. Use your intellect, observe behavior, and vote out the syndicate during daily town meetings.",
        "card_image": "/elite-civilian-card.jpg"
    },
    "DETECTIVE": {
        "display_name": "Detective",
        "icon": "🔍",
        "team": "Town",
        "special_ability": "Night Investigation",
        "description": "You are a Detective. Investigate one suspect each night to determine whether they are Mafia or Innocent Town.",
        "card_image": "/elite-detective-card.jpg"
    },
    "DOCTOR": {
        "display_name": "Doctor",
        "icon": "✚",
        "team": "Town",
        "special_ability": "Night Protection",
        "description": "You are a Doctor. Protect one player each night from deadly attacks. You may save yourself if in danger.",
        "card_image": "/elite-doctor-card.jpg"
    },
    "GODFATHER": {
        "display_name": "Godfather",
        "icon": "👑",
        "team": "Mafia",
        "special_ability": "Immune to Detective (Appears Innocent)",
        "description": "You are the Mafia Godfather (Don). You command the Mafia each night. If investigated by the Detective, your result will appear as Innocent Civilian!",
        "card_image": "/elite-godfather-card.jpg"
    },
    "JESTER": {
        "display_name": "Jester",
        "icon": "🎭",
        "team": "Neutral / Independent",
        "special_ability": "Wins independently if voted out by Town",
        "description": "You are the Jester (Fool). You have no team. Your objective is to trick the town into voting you out. If you are eliminated by town vote, you win the game alone!",
        "card_image": "/elite-jester-card.jpg"
    },
    "MAYOR": {
        "display_name": "Mayor",
        "icon": "⚖",
        "team": "Town",
        "special_ability": "Double Vote (Counts as 2 Votes)",
        "description": "You are the Mayor of the town. Your voice carries double authority. During daily town voting and trials, your vote counts as two votes instead of one!",
        "card_image": "/elite-mayor-card.jpg"
    }
}

# General backward-compatible metadata superset
ROLE_METADATA = {**ROLE_METADATA_CLASSIC, **ROLE_METADATA_ELITE}


class CreateGameRequest(BaseModel):
    required_players: int = Field(default=5, ge=3, le=50)
    game_mode: str = Field(default="CLASSIC", pattern="^(CLASSIC|ELITE)$")
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


class EliminatePlayerRequest(BaseModel):
    reason: Optional[str] = Field(default="VOTED_OUT", pattern="^(VOTED_OUT|NIGHT_KILL)$")


class InvestigateRequest(BaseModel):
    target_player_name: str = Field(..., min_length=1, max_length=50)


class InvestigateResponse(BaseModel):
    target_name: str
    result: str  # "INNOCENT" or "GUILTY"
    allegiance: str  # "Town / Civilian" or "Mafia"
    message: str


class PublicPlayer(BaseModel):
    name: str
    joined_at: datetime
    is_alive: bool = True

    model_config = {"from_attributes": True}


class GamePublicResponse(BaseModel):
    game_code: str
    game_mode: str = "CLASSIC"
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
    game_mode: str = "CLASSIC"
    team: Optional[str] = None
    special_ability: Optional[str] = None
    card_image: Optional[str] = None
    card_back_image: Optional[str] = "/card-back.jpg"
    is_alive: bool = True


class DistributeResponse(BaseModel):
    success: bool
    message: str
    total_players: int
    status: str

