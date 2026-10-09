import os
from sqlalchemy import create_engine, event
from sqlalchemy.orm import declarative_base, sessionmaker

DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./mafia_game.db")

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
    """Ensure all required columns exist in SQLite tables across migrations."""
    if not DATABASE_URL.startswith("sqlite"):
        return
    try:
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

            cursor.execute("PRAGMA table_info(role_assignments)")
            ra_cols = [row[1] for row in cursor.fetchall()]
            if ra_cols:
                if "is_revealed" not in ra_cols:
                    cursor.execute("ALTER TABLE role_assignments ADD COLUMN is_revealed BOOLEAN DEFAULT 0")
                if "revealed_at" not in ra_cols:
                    cursor.execute("ALTER TABLE role_assignments ADD COLUMN revealed_at DATETIME")

            raw_conn.commit()
            cursor.close()
    except Exception as e:
        print(f"Schema check error: {e}")
