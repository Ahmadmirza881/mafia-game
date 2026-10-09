import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from backend.database import Base

class Game(Base):
    __tablename__ = "games"

    id = Column(Integer, primary_key=True, index=True)
    game_code = Column(String(32), unique=True, index=True, nullable=False)
    host_token_hash = Column(String(64), nullable=False)
    host_email = Column(String(128), nullable=True)
    host_password_hash = Column(String(128), nullable=True)
    required_players = Column(Integer, nullable=False, default=5)
    status = Column(String(20), nullable=False, default="WAITING")  # WAITING, DISTRIBUTING, DISTRIBUTED, CLOSED
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    distributed_at = Column(DateTime, nullable=True)

    players = relationship("Player", back_populates="game", cascade="all, delete-orphan")
    role_configurations = relationship("RoleConfiguration", back_populates="game", cascade="all, delete-orphan")
    role_assignments = relationship("RoleAssignment", back_populates="game", cascade="all, delete-orphan")


class Player(Base):
    __tablename__ = "players"

    id = Column(Integer, primary_key=True, index=True)
    game_id = Column(Integer, ForeignKey("games.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(64), nullable=False)
    session_token_hash = Column(String(64), index=True, nullable=False)
    joined_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    game = relationship("Game", back_populates="players")
    role_assignment = relationship("RoleAssignment", back_populates="player", uselist=False, cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("game_id", "name", name="uq_game_player_name"),
    )


class RoleConfiguration(Base):
    __tablename__ = "role_configurations"

    id = Column(Integer, primary_key=True, index=True)
    game_id = Column(Integer, ForeignKey("games.id", ondelete="CASCADE"), nullable=False, index=True)
    role_name = Column(String(32), nullable=False)
    quantity = Column(Integer, nullable=False, default=0)

    game = relationship("Game", back_populates="role_configurations")

    __table_args__ = (
        UniqueConstraint("game_id", "role_name", name="uq_game_role_name"),
    )


class RoleAssignment(Base):
    __tablename__ = "role_assignments"

    id = Column(Integer, primary_key=True, index=True)
    game_id = Column(Integer, ForeignKey("games.id", ondelete="CASCADE"), nullable=False, index=True)
    player_id = Column(Integer, ForeignKey("players.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    role_name = Column(String(32), nullable=False)
    assigned_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    game = relationship("Game", back_populates="role_assignments")
    player = relationship("Player", back_populates="role_assignment")
