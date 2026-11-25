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
        # One Cloud Run instance runs many requests at once, and each request
        # holds a connection until its session is closed. pool_size 5 +
        # max_overflow 5 is 10, so the next checkout waits the default 30s
        # and raises QueuePool TimeoutError. That is the outage.
        #
        # Supabase's session pooler keeps one Postgres backend per client
        # connection. Small computes default that pool to 15 backends, shared
        # with the rest of the project, so this process may burst to 15 and
        # no higher. Overflow connections are closed when returned; an idle
        # instance keeps only pool_size. pool_pre_ping and pool_recycle drop
        # connections the pooler has already closed.
        return create_engine(
            url,
            pool_size=5,
            max_overflow=10,
            pool_timeout=30,
            pool_recycle=300,
            pool_pre_ping=True,
            pool_use_lifo=True,
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
    """One session per request. Always returned to the pool, including on errors."""
    db = SessionLocal()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()

