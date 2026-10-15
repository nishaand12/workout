import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.config import settings

logger = logging.getLogger(__name__)

# Handle SQLite vs PostgreSQL/Supabase
db_url = settings.DATABASE_URL.strip()

# Detect unconfigured placeholder password from Supabase dashboard template
if "[YOUR-PASSWORD]" in db_url or "YOUR-PASSWORD" in db_url:
    logger.warning("DATABASE_URL contains unconfigured placeholder [YOUR-PASSWORD]. Falling back to SQLite.")
    db_url = "sqlite:///./workout.db"

if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql+psycopg://", 1)
elif db_url.startswith("postgresql://") and not db_url.startswith("postgresql+"):
    db_url = db_url.replace("postgresql://", "postgresql+psycopg://", 1)

def build_engine(url: str):
    if url.startswith("sqlite"):
        return create_engine(
            url,
            connect_args={"check_same_thread": False},
            pool_pre_ping=True
        )
    else:
        # Serverless-optimized pooling for Supabase / Cloud Run
        return create_engine(
            url,
            pool_size=5,
            max_overflow=5,
            pool_recycle=300,
            pool_pre_ping=True
        )

engine = build_engine(db_url)

# If PostgreSQL was configured, test connection; fall back to SQLite if unreachable or auth fails
if not db_url.startswith("sqlite"):
    try:
        with engine.connect() as conn:
            pass
    except Exception as exc:
        host_info = db_url.split("@")[-1] if "@" in db_url else db_url
        logger.error(
            f"Failed to connect to database at {host_info}: {exc}. "
            "Falling back to local SQLite database."
        )
        db_url = "sqlite:///./workout.db"
        engine = build_engine(db_url)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

