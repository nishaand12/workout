"""Every API route needs a signed-in user, so test clients carry one by default.

The operator is a coach with their own gym and team. Users a test creates are
adopted into that gym (and team, for athletes), the same as an athlete who
joined with the coach's team code, so the coach is allowed to program them.
"""
import uuid

from fastapi.testclient import TestClient

from app import crud
from app.database import SessionLocal
from app.models import Group, Gym, User
from app.schemas import UserRegister

SIGNED_OUT = {"Authorization": ""}


def signed_in_client(app):
    db = SessionLocal()
    try:
        tag = uuid.uuid4().hex[:10]
        gym = Gym(name=f"Test gym {tag}")
        db.add(gym)
        db.flush()
        coach = crud.create_auth_user(db, UserRegister(
            name=f"Test coach {tag}", email=f"operator.{tag}@example.com",
            username=f"operator_{tag}", password="Password123!", role="coach",
        ))
        coach.gym_id = gym.id
        coach.is_coach = True
        team = Group(name=f"Test team {tag}", gym_id=gym.id, coach_id=coach.id)
        db.add(team)
        db.commit()
        client = TestClient(app, headers={"Authorization": "Bearer " + crud.create_access_token(coach.id, "coach")})
        client.operator = {"id": coach.id, "gym_id": gym.id, "team_id": team.id}
    finally:
        db.close()
    return client


def adopt(client, user_id, role="athlete", team=True):
    """Put a test-created user in the operator's gym; athletes also join the operator's team unless team=False."""
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).one()
        user.gym_id = client.operator["gym_id"]
        if team and role in ("athlete", "student"):
            user.team_id = client.operator["team_id"]
            user.is_athlete = True
        db.commit()
    finally:
        db.close()
