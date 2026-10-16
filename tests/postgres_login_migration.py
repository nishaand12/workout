"""Sign in against Postgres after migrating a pre-role-flag users table.

Not collected by unittest. tests/test_postgres_schema_login.py runs this in a
subprocess so the app engine is created only for this database.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

os.environ["DATABASE_URL"] = "postgresql+psycopg:///wourkout_login_test"
os.environ["SEED_DATA_PATH"] = "/tmp/wourkout-no-seed.json"

import psycopg

with open("/tmp/wourkout-no-seed.json", "w", encoding="utf-8") as handle:
    handle.write('{"exercises":[],"workouts":[]}\n')

admin = psycopg.connect("dbname=postgres")
admin.autocommit = True
with admin.cursor() as cur:
    cur.execute("DROP DATABASE IF EXISTS wourkout_login_test")
    cur.execute("CREATE DATABASE wourkout_login_test")
admin.close()

conn = psycopg.connect("dbname=wourkout_login_test")
with conn.cursor() as cur:
    # Schema from the deploy before gym role flags. Login SELECTs the new columns.
    cur.execute(
        """
        CREATE TABLE users (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            username VARCHAR(100) UNIQUE,
            password_hash VARCHAR(255),
            supabase_uid VARCHAR(128) UNIQUE,
            role VARCHAR(50) DEFAULT 'athlete',
            title VARCHAR(100) DEFAULT 'Athlete',
            avatar_color VARCHAR(20) DEFAULT '#0ea5e9',
            status_badge VARCHAR(50) DEFAULT 'Active',
            position_tag VARCHAR(100) DEFAULT 'Athlete',
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT NOW()
        )
        """
    )
    cur.execute(
        """
        INSERT INTO users (name, email, username, role, title, is_active)
        VALUES ('Head Coach', 'coach@wourkout.app', 'coach', 'coach', 'Head Strength Coach', TRUE)
        """
    )
conn.commit()
conn.close()

from fastapi.testclient import TestClient

from app.main import app

with TestClient(app) as client:
    ok = client.post("/api/auth/login", json={
        "email_or_username": "coach@wourkout.app",
        "password": "CoachPassword123!",
    })
    if ok.status_code != 200:
        print(ok.status_code, ok.text)
        sys.exit(1)
    user = ok.json()["user"]
    if user["email"] != "coach@wourkout.app" or "coach" not in (user.get("roles") or []):
        print("unexpected user", user)
        sys.exit(1)
    bad = client.post("/api/auth/login", json={
        "email_or_username": "coach@wourkout.app",
        "password": "wrong-password",
    })
    if bad.status_code != 401:
        print("bad password", bad.status_code, bad.text)
        sys.exit(1)
    missing = client.post("/api/auth/login", json={
        "email_or_username": "nobody@wourkout.app",
        "password": "CoachPassword123!",
    })
    if missing.status_code != 401:
        print("missing user", missing.status_code, missing.text)
        sys.exit(1)

print("coach sign-in ok")
