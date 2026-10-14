import os

class Settings:
    PROJECT_NAME: str = "wourkout"
    PORT: int = int(os.getenv("PORT", 8000))
    HOST: str = os.getenv("HOST", "0.0.0.0")
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./workout.db")
    SEED_DATA_PATH: str = os.getenv("SEED_DATA_PATH", "reference/clean_seed_data.json")

settings = Settings()
