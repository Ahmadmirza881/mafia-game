import os
from sqlalchemy import create_engine, event
from sqlalchemy.orm import declarative_base, sessionmaker

is_serverless = bool(
    os.environ.get("VERCEL")
    or os.environ.get("VERCEL_ENV")
    or os.environ.get("AWS_LAMBDA_FUNCTION_NAME")
    or os.environ.get("LAMBDA_TASK_ROOT")
    or not os.access(".", os.W_OK)
)

if is_serverless:
    default_db = "sqlite:////tmp/mafia_game.db"
else:
    default_db = "sqlite:///./mafia_game.db"

DATABASE_URL = os.environ.get("DATABASE_URL", default_db)

# Normalize postgres URL to postgresql+psycopg for Neon / Supabase compatibility
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+psycopg://", 1)
elif DATABASE_URL.startswith("postgresql://") and not DATABASE_URL.startswith("postgresql+"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg://", 1)

# Configure engine based on database dialect
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False}
    )

    # Enable foreign keys for SQLite
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()
else:
    # PostgreSQL / Neon / Supabase
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def ensure_schema():
    """Ensure all required columns exist in tables across migrations (both SQLite and PostgreSQL)."""
    try:
        from sqlalchemy import text
        if DATABASE_URL.startswith("sqlite"):
            with engine.connect() as conn:
                raw_conn = conn.connection
                cursor = raw_conn.cursor()
                
                cursor.execute("PRAGMA table_info(games)")
                game_cols = [row[1] for row in cursor.fetchall()]
                if game_cols:
                    if "host_email" not in game_cols:
                        cursor.execute("ALTER TABLE games ADD COLUMN host_email VARCHAR(128)")
                    if "host_password_hash" not in game_cols:
                        cursor.execute("ALTER TABLE games ADD COLUMN host_password_hash VARCHAR(128)")
                    if "game_mode" not in game_cols:
                        cursor.execute("ALTER TABLE games ADD COLUMN game_mode VARCHAR(20) DEFAULT 'CLASSIC'")

                cursor.execute("PRAGMA table_info(role_assignments)")
                ra_cols = [row[1] for row in cursor.fetchall()]
                if ra_cols:
                    if "is_revealed" not in ra_cols:
                        cursor.execute("ALTER TABLE role_assignments ADD COLUMN is_revealed BOOLEAN DEFAULT 0")
                    if "revealed_at" not in ra_cols:
                        cursor.execute("ALTER TABLE role_assignments ADD COLUMN revealed_at DATETIME")

                cursor.execute("PRAGMA table_info(players)")
                player_cols = [row[1] for row in cursor.fetchall()]
                if player_cols:
                    if "is_alive" not in player_cols:
                        cursor.execute("ALTER TABLE players ADD COLUMN is_alive BOOLEAN DEFAULT 1")

                raw_conn.commit()
                cursor.close()
        else:
            # PostgreSQL (Neon / Supabase)
            with engine.begin() as conn:
                conn.execute(text("ALTER TABLE games ADD COLUMN IF NOT EXISTS host_email VARCHAR(128);"))
                conn.execute(text("ALTER TABLE games ADD COLUMN IF NOT EXISTS host_password_hash VARCHAR(128);"))
                conn.execute(text("ALTER TABLE games ADD COLUMN IF NOT EXISTS game_mode VARCHAR(20) DEFAULT 'CLASSIC';"))
                conn.execute(text("ALTER TABLE role_assignments ADD COLUMN IF NOT EXISTS is_revealed BOOLEAN DEFAULT FALSE;"))
                conn.execute(text("ALTER TABLE role_assignments ADD COLUMN IF NOT EXISTS revealed_at TIMESTAMP;"))
                conn.execute(text("ALTER TABLE players ADD COLUMN IF NOT EXISTS is_alive BOOLEAN DEFAULT TRUE;"))
    except Exception as e:
        print(f"Schema check error: {e}")
