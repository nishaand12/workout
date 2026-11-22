import os

class Settings:
    PROJECT_NAME: str = "wourkout"
    PORT: int = int(os.getenv("PORT", 8000))
    HOST: str = os.getenv("HOST", "0.0.0.0")
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./workout.db").strip()
    SEED_DATA_PATH: str = os.getenv("SEED_DATA_PATH", "reference/clean_seed_data.json")

    # Supabase & Auth
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "https://kqznlgtnexcsgpgifaou.supabase.co").strip().rstrip("/")
    SUPABASE_ANON_KEY: str = os.getenv("SUPABASE_ANON_KEY", os.getenv("SUPABASE_KEY", "")).strip()
    SUPABASE_SERVICE_ROLE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()
    JWT_SECRET: str = os.getenv("JWT_SECRET", "wourkout-secret-salt-key-2026").strip()
    ACCESS_TOKEN_EXPIRE_HOURS: int = 168  # 7 days
    # Athletes mostly use the site from a phone, so their sign-in lasts much longer and is
    # renewed each time they open the app. Coaches and admins keep the shorter session.
    ATHLETE_SESSION_DAYS: int = int(os.getenv("ATHLETE_SESSION_DAYS", 90))

settings = Settings()
