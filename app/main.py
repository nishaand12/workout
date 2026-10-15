import os
import logging
from contextlib import asynccontextmanager
from typing import List, Optional
from pydantic import BaseModel
from fastapi import FastAPI, Depends, HTTPException, Query, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import inspect, text

from app.config import settings
from app.database import Base, engine, get_db, SessionLocal
from app.models import Workout, Exercise
from app import access
from app.schemas import (
    ExerciseResponse, ExerciseCreate, ExerciseUpdate,
    WorkoutResponse, WorkoutDetailResponse, WorkoutCreate, WorkoutUpdate,
    WorkoutSessionResponse, WorkoutSessionDetailResponse,
    SetLogResponse, SetLogBase,
    PersonalRecordResponse, PersonalRecordCreate, PersonalRecordUpdate,
    CopyWeekRequest, RescheduleWorkoutRequest, CalendarDayResponse,
    AddWorkoutToDayRequest, SaveProgramTemplateRequest,
    UserResponse, UserCreate, UserUpdate,
    GroupResponse, GroupCreate, GroupUpdate,
    WorkoutAssignmentResponse, WorkoutAssignmentCreate, ProgramAssignmentCreate,
    CoachComplianceReport,
    AuthConfigResponse, UserRegister, UserLogin, Token,
    PasswordResetRequest, PasswordResetConfirm, SupabaseAuthSync,
    ViewSwitch, GymCreate, JoinCodeCreate, JoinCodeRedeem, JoinCodeResponse,
    GymContext, GymMemberCreate, GymMemberCreated, MoveTeamRequest,
    CoachAssignRequest, AthleteNoteRequest, ScheduleItem
)
from app import crud

logger = logging.getLogger(__name__)

def ensure_schema_migrations():
    """Safely add new columns to existing SQLite or Postgres tables if missing."""
    try:
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        with engine.begin() as conn:
            if "users" in tables:
                cols = [c["name"] for c in inspector.get_columns("users")]
                if "password_hash" not in cols:
                    conn.execute(text("ALTER TABLE users ADD COLUMN password_hash VARCHAR(255)"))
                if "supabase_uid" not in cols:
                    conn.execute(text("ALTER TABLE users ADD COLUMN supabase_uid VARCHAR(128)"))
                if "username" not in cols:
                    conn.execute(text("ALTER TABLE users ADD COLUMN username VARCHAR(100)"))
                if "is_active" not in cols:
                    conn.execute(text("ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT TRUE"))
                if "is_admin" not in cols:
                    conn.execute(text("ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT 0"))
                if "is_coach" not in cols:
                    conn.execute(text("ALTER TABLE users ADD COLUMN is_coach BOOLEAN DEFAULT 0"))
                if "is_athlete" not in cols:
                    conn.execute(text("ALTER TABLE users ADD COLUMN is_athlete BOOLEAN DEFAULT 0"))
                if "gym_id" not in cols:
                    conn.execute(text("ALTER TABLE users ADD COLUMN gym_id INTEGER"))
                if "team_id" not in cols:
                    conn.execute(text("ALTER TABLE users ADD COLUMN team_id INTEGER"))
                conn.execute(text("UPDATE users SET is_admin = COALESCE(is_admin, 0)"))
                conn.execute(text("UPDATE users SET is_coach = COALESCE(is_coach, 0)"))
                conn.execute(text("UPDATE users SET is_athlete = COALESCE(is_athlete, 0)"))

            if "groups" in tables:
                gcols = [c["name"] for c in inspector.get_columns("groups")]
                if "gym_id" not in gcols:
                    conn.execute(text("ALTER TABLE groups ADD COLUMN gym_id INTEGER"))

            if "workouts" in tables:
                wcols = [c["name"] for c in inspector.get_columns("workouts")]
                if "gym_id" not in wcols:
                    conn.execute(text("ALTER TABLE workouts ADD COLUMN gym_id INTEGER"))

            if "workout_sessions" in tables:
                scols = [c["name"] for c in inspector.get_columns("workout_sessions")]
                if "athlete_note" not in scols:
                    conn.execute(text("ALTER TABLE workout_sessions ADD COLUMN athlete_note TEXT DEFAULT ''"))

            if "personal_records" in tables:
                cols = [c["name"] for c in inspector.get_columns("personal_records")]
                if "user_id" not in cols:
                    conn.execute(text("ALTER TABLE personal_records ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE"))
    except Exception as exc:
        logger.warning(f"Schema migration notice: {exc}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create tables, apply migrations, seed data & default accounts
    try:
        Base.metadata.create_all(bind=engine)
        ensure_schema_migrations()
        db = SessionLocal()
        try:
            crud.seed_database_if_empty(db)
            crud.seed_default_users(db)
            crud.scrub_visible_brand(db)
        finally:
            db.close()
    except Exception as exc:
        logger.error(f"Error during startup database initialization: {exc}")
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="wourkout coach calendar, workout entry, and team tools",
    version="1.0.0",
    lifespan=lifespan
)

security = HTTPBearer(auto_error=False)

async def get_current_user(
    cred: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> Optional[crud.User]:
    if not cred or not cred.credentials:
        return None
    token = cred.credentials

    # 1. Try local JWT token
    payload = crud.decode_access_token(token)
    if payload:
        user_id = int(payload.get("sub", 0))
        user = crud.get_user(db, user_id)
        if user and user.is_active:
            return user

    # 2. Try Supabase token
    if settings.SUPABASE_URL:
        supa_user = await crud.verify_supabase_token(token)
        if supa_user:
            uid = supa_user.get("id")
            email = supa_user.get("email")
            user = crud.get_user_by_supabase_uid(db, uid) or crud.get_user_by_email_or_username(db, email)
            if not user and email:
                name = (
                    supa_user.get("user_metadata", {}).get("full_name") or
                    supa_user.get("user_metadata", {}).get("name") or
                    email.split("@")[0]
                )
                user = crud.create_auth_user(db, UserRegister(
                    name=name, email=email, password="", supabase_uid=uid, role="athlete"
                ))
            elif user and not user.supabase_uid:
                user.supabase_uid = uid
                db.commit()
            return user
    return None

def require_auth(current_user: Optional[crud.User] = Depends(get_current_user)) -> crud.User:
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")
    return current_user

def require_role(allowed_roles: List[str]):
    def role_checker(current_user: crud.User = Depends(require_auth)):
        held = set(current_user.roles or [])
        if current_user.role == "student":
            held.add("athlete")
        if not held.intersection(allowed_roles):
            raise HTTPException(
                status_code=403,
                detail="Access denied: this account lacks the required role."
            )
        return current_user
    return role_checker

def _staff(user: crud.User) -> bool:
    roles = set(user.roles or [])
    return "coach" in roles or "admin" in roles

# Enable CORS for multi-device access over Tailnet
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health endpoint for Cloud Run container probes
@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "workout-replica"}

# Exercise Endpoints
@app.get("/api/exercises", response_model=List[ExerciseResponse])
def list_exercises(
    category: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    return crud.get_exercises(db, category=category, search=search)

@app.post("/api/exercises", response_model=ExerciseResponse, status_code=status.HTTP_201_CREATED)
def create_exercise(exercise_in: ExerciseCreate, db: Session = Depends(get_db)):
    # Check if duplicate
    existing = db.query(Exercise).filter(Exercise.name.ilike(exercise_in.name)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Exercise with this name already exists")
    return crud.create_exercise(db, exercise_in)

@app.put("/api/exercises/{exercise_id}", response_model=ExerciseResponse)
def update_exercise(exercise_id: int, exercise_in: ExerciseUpdate, db: Session = Depends(get_db)):
    updated = crud.update_exercise(db, exercise_id, exercise_in)
    if not updated:
        raise HTTPException(status_code=404, detail="Exercise not found")
    return updated

@app.delete("/api/exercises/{exercise_id}")
def delete_exercise(exercise_id: int, db: Session = Depends(get_db)):
    success = crud.delete_exercise(db, exercise_id)
    if not success:
        raise HTTPException(status_code=404, detail="Exercise not found")
    return {"message": "Exercise deleted"}

# Workout Endpoints
def _workout_visible(db: Session, viewer: Optional[crud.User], workout) -> bool:
    if viewer is None:
        return True
    if not viewer.gym_id or workout.gym_id != viewer.gym_id:
        return False
    if not _staff(viewer):
        return crud.athlete_can_read_workout(db, viewer, workout.id)
    if workout.created_by_coach_id == viewer.id:
        return True
    ids = access.athlete_ids_for(db, viewer) or [-1]
    return db.query(crud.WorkoutAssignment).filter(
        crud.WorkoutAssignment.workout_id == workout.id,
        crud.WorkoutAssignment.user_id.in_(ids),
    ).first() is not None

@app.get("/api/workouts", response_model=List[WorkoutResponse])
def list_workouts(
    program: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    viewer: Optional[crud.User] = Depends(get_current_user),
):
    rows = crud.get_workouts(db, program=program)
    if viewer is None:
        return rows
    return [w for w in rows if _workout_visible(db, viewer, w)]

@app.get("/api/workouts/{workout_id}", response_model=WorkoutDetailResponse)
def get_workout(
    workout_id: int,
    db: Session = Depends(get_db),
    viewer: Optional[crud.User] = Depends(get_current_user),
):
    w = crud.get_workout(db, workout_id)
    if not w:
        raise HTTPException(status_code=404, detail="Workout not found")
    if viewer is not None and not _workout_visible(db, viewer, w):
        raise HTTPException(status_code=403, detail="That workout is not visible to you.")
    return w

@app.post("/api/workouts", response_model=WorkoutDetailResponse, status_code=status.HTTP_201_CREATED)
def create_workout(
    workout_in: WorkoutCreate,
    db: Session = Depends(get_db),
    viewer: Optional[crud.User] = Depends(get_current_user),
):
    if viewer is not None and not _staff(viewer):
        raise HTTPException(status_code=403, detail="Athlete accounts do not have coach tools.")
    workout = crud.create_workout(db, workout_in)
    if viewer is not None and viewer.gym_id:
        workout.gym_id = viewer.gym_id
        workout.created_by_coach_id = viewer.id
        db.commit()
        db.refresh(workout)
    return workout

@app.put("/api/workouts/{workout_id}", response_model=WorkoutDetailResponse)
def update_workout(workout_id: int, workout_in: WorkoutUpdate, db: Session = Depends(get_db)):
    w = crud.update_workout(db, workout_id, workout_in)
    if not w:
        raise HTTPException(status_code=404, detail="Workout not found")
    return w

@app.delete("/api/workouts/{workout_id}")
def delete_workout(workout_id: int, db: Session = Depends(get_db)):
    success = crud.delete_workout(db, workout_id)
    if not success:
        raise HTTPException(status_code=404, detail="Workout not found")
    return {"message": "Workout deleted"}

# Calendar & Week Planner Endpoints
@app.post("/api/weeks/copy", response_model=List[WorkoutResponse], status_code=status.HTTP_201_CREATED)
def copy_week(req: CopyWeekRequest, db: Session = Depends(get_db)):
    new_workouts = crud.copy_week(db, req)
    if not new_workouts:
        raise HTTPException(status_code=400, detail="Could not copy week. Ensure source program and week exist.")
    return new_workouts

@app.post("/api/workouts/{workout_id}/reschedule", response_model=WorkoutResponse)
def reschedule_workout(workout_id: int, req: RescheduleWorkoutRequest, db: Session = Depends(get_db)):
    updated = crud.reschedule_workout(db, workout_id, req.calendar_date)
    if not updated:
        raise HTTPException(status_code=404, detail="Workout not found")
    return updated

@app.get("/api/calendar", response_model=List[CalendarDayResponse])
def get_calendar(
    start_date: str = Query(..., description="Start date in YYYY-MM-DD"),
    end_date: str = Query(..., description="End date in YYYY-MM-DD"),
    user_id: Optional[int] = Query(None, description="Optional user ID"),
    db: Session = Depends(get_db)
):
    return crud.get_calendar_workouts(db, start_date=start_date, end_date=end_date, user_id=user_id)

@app.get("/api/programs")
def get_programs(db: Session = Depends(get_db)):
    return crud.get_programs_and_weeks(db)

@app.post("/api/weeks/add-workout", response_model=WorkoutResponse, status_code=status.HTTP_201_CREATED)
def add_workout_to_day(req: AddWorkoutToDayRequest, db: Session = Depends(get_db)):
    w = crud.add_workout_to_day(db, req)
    if not w:
        raise HTTPException(status_code=404, detail="Source workout not found")
    return w

@app.post("/api/weeks/save-as-program", response_model=List[WorkoutResponse], status_code=status.HTTP_201_CREATED)
def save_program_template(req: SaveProgramTemplateRequest, db: Session = Depends(get_db)):
    created = crud.save_program_template(db, req)
    if not created:
        raise HTTPException(status_code=400, detail="No workouts found in source program to save as template")
    return created

# Workout Session & Logging Endpoints
@app.get("/api/sessions/active/{workout_id}", response_model=WorkoutSessionDetailResponse)
def get_active_session(
    workout_id: int,
    user_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    viewer: Optional[crud.User] = Depends(get_current_user),
):
    if viewer is not None and not _staff(viewer):
        if user_id and user_id != viewer.id:
            raise HTTPException(status_code=403, detail="You can only open your own workout.")
        if not crud.athlete_can_read_workout(db, viewer, workout_id):
            raise HTTPException(status_code=403, detail="That workout is not on your schedule.")
        user_id = viewer.id
    elif viewer is not None and user_id and user_id not in access.athlete_ids_for(db, viewer) and user_id != viewer.id:
        raise HTTPException(status_code=403, detail="That athlete is not on a team you lead.")
    session = crud.get_or_create_active_session(db, workout_id, user_id=user_id)
    if not session:
        raise HTTPException(status_code=404, detail="Workout not found")
    return session

@app.get("/api/sessions/{session_id}", response_model=WorkoutSessionDetailResponse)
def get_session(session_id: int, db: Session = Depends(get_db)):
    session = crud.get_session_details(db, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session

@app.post("/api/sessions/{session_id}/sets", response_model=SetLogResponse)
def log_set(
    session_id: int,
    workout_exercise_id: int = Query(...),
    set_number: int = Query(...),
    weight: float = Query(0.0),
    reps: float = Query(0.0),
    completed: bool = Query(False),
    db: Session = Depends(get_db)
):
    return crud.log_or_update_set(
        db=db,
        session_id=session_id,
        workout_exercise_id=workout_exercise_id,
        set_number=set_number,
        weight=weight,
        reps=reps,
        completed=completed
    )

@app.post("/api/sessions/{session_id}/complete", response_model=WorkoutSessionResponse)
def finish_session(
    session_id: int,
    notes: Optional[str] = Query(""),
    db: Session = Depends(get_db)
):
    session = crud.complete_session(db, session_id, notes=notes)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session

@app.get("/api/sessions", response_model=List[WorkoutSessionResponse])
def list_sessions(db: Session = Depends(get_db)):
    return crud.get_recent_sessions(db)

# Personal Records Endpoints
@app.get("/api/records", response_model=List[PersonalRecordResponse])
def list_records(
    user_id: Optional[int] = Query(None, description="Filter by athlete user_id"),
    include_global: bool = Query(True, description="Include team-wide/unassigned records"),
    db: Session = Depends(get_db)
):
    return crud.get_personal_records(db, user_id=user_id, include_global=include_global)

@app.post("/api/records", response_model=PersonalRecordResponse, status_code=status.HTTP_201_CREATED)
def create_record(record_in: PersonalRecordCreate, db: Session = Depends(get_db)):
    return crud.add_personal_record(db, record_in)

@app.put("/api/records/{record_id}", response_model=PersonalRecordResponse)
def update_record(record_id: int, record_in: PersonalRecordUpdate, db: Session = Depends(get_db)):
    record = crud.update_personal_record(db, record_id, record_in)
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    return record

@app.delete("/api/records/{record_id}")
def delete_record(record_id: int, db: Session = Depends(get_db)):
    success = crud.delete_personal_record(db, record_id)
    if not success:
        raise HTTPException(status_code=404, detail="Record not found")
    return {"message": "Record deleted"}

# -------------------------------------------------------------
# Authentication Endpoints
# -------------------------------------------------------------
@app.get("/api/auth/config", response_model=AuthConfigResponse)
def get_auth_config():
    return {
        "supabase_url": settings.SUPABASE_URL,
        "supabase_anon_key": settings.SUPABASE_ANON_KEY,
        "allow_google_oauth": bool(settings.SUPABASE_URL and settings.SUPABASE_ANON_KEY),
        "allow_email_password": True
    }

@app.post("/api/auth/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register_user(user_in: UserRegister, db: Session = Depends(get_db)):
    existing = crud.get_user_by_email_or_username(db, user_in.email)
    if existing:
        raise HTTPException(status_code=400, detail="An account with this email already exists.")
    if user_in.username:
        if crud.get_user_by_email_or_username(db, user_in.username):
            raise HTTPException(status_code=400, detail="This username is already taken.")
    user = crud.create_auth_user(db, user_in)
    access_token = crud.create_access_token(user.id, user.role)
    return {"access_token": access_token, "token_type": "bearer", "user": user}

@app.post("/api/auth/login", response_model=Token)
def login_user(login_in: UserLogin, db: Session = Depends(get_db)):
    identity = login_in.identifier
    if not identity:
        raise HTTPException(status_code=400, detail="Username or email is required.")
    user = crud.get_user_by_email_or_username(db, identity)
    if not user or not crud.verify_password(login_in.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid username/email or password.")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled.")
    access_token = crud.create_access_token(user.id, user.role)
    return {"access_token": access_token, "token_type": "bearer", "user": user}

@app.get("/api/auth/me", response_model=UserResponse)
def get_my_profile(current_user: crud.User = Depends(require_auth)):
    return current_user

@app.post("/api/auth/view", response_model=UserResponse)
def switch_view(req: ViewSwitch, db: Session = Depends(get_db), current_user: crud.User = Depends(require_auth)):
    access.set_active_role(current_user, req.role)
    db.commit()
    db.refresh(current_user)
    return current_user

@app.post("/api/auth/sync-supabase", response_model=Token)
async def sync_supabase_user(req: SupabaseAuthSync, db: Session = Depends(get_db)):
    supa_user = await crud.verify_supabase_token(req.access_token)
    if not supa_user:
        if req.email:
            user = crud.get_user_by_email_or_username(db, req.email)
            if not user:
                user = crud.create_auth_user(db, UserRegister(
                    name=req.name or req.email.split("@")[0],
                    email=req.email,
                    password="",
                    supabase_uid=req.supabase_uid,
                    role=req.role or "athlete"
                ))
            access_token = crud.create_access_token(user.id, user.role)
            return {"access_token": access_token, "token_type": "bearer", "user": user}
        raise HTTPException(status_code=401, detail="Could not verify Supabase credentials.")

    uid = supa_user.get("id")
    email = supa_user.get("email")
    user = crud.get_user_by_supabase_uid(db, uid) or crud.get_user_by_email_or_username(db, email)
    if not user:
        name = (
            supa_user.get("user_metadata", {}).get("full_name") or
            supa_user.get("user_metadata", {}).get("name") or
            req.name or
            email.split("@")[0]
        )
        role = req.role if req.role in ["coach", "athlete", "admin"] else "athlete"
        user = crud.create_auth_user(db, UserRegister(
            name=name, email=email, password="", supabase_uid=uid, role=role
        ))
    else:
        if not user.supabase_uid:
            user.supabase_uid = uid
            db.commit()

    access_token = crud.create_access_token(user.id, user.role)
    return {"access_token": access_token, "token_type": "bearer", "user": user}

@app.post("/api/auth/reset-password-request")
async def reset_password_request(req: PasswordResetRequest, db: Session = Depends(get_db)):
    user = crud.get_user_by_email_or_username(db, req.email)
    reset_token = None
    if user:
        reset_token = crud.create_access_token(user.id, role=user.role, expires_hours=1)
    return {
        "message": "If this email is registered, password reset instructions have been sent.",
        "reset_token": reset_token
    }

@app.post("/api/auth/reset-password")
async def reset_password(req: PasswordResetConfirm, db: Session = Depends(get_db)):
    if not req.new_password or len(req.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters.")
    # Check if token is local access token or supabase
    payload = crud.decode_access_token(req.token)
    if payload:
        user_id = int(payload.get("sub", 0))
        user = crud.get_user(db, user_id)
        if user:
            user.password_hash = crud.hash_password(req.new_password)
            db.commit()
            return {"message": "Password updated successfully."}

    if settings.SUPABASE_URL:
        supa_user = await crud.verify_supabase_token(req.token)
        if supa_user:
            uid = supa_user.get("id")
            email = supa_user.get("email")
            user = crud.get_user_by_supabase_uid(db, uid) or crud.get_user_by_email_or_username(db, email)
            if user:
                user.password_hash = crud.hash_password(req.new_password)
                db.commit()
                return {"message": "Password updated successfully."}

    raise HTTPException(status_code=400, detail="Invalid or expired reset token.")

# -------------------------------------------------------------
# User & Team/Group Endpoints
# -------------------------------------------------------------
@app.get("/api/users", response_model=List[UserResponse])
def list_users(
    role: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    viewer: Optional[crud.User] = Depends(get_current_user),
):
    return crud.get_users(db, role=role, viewer=viewer)

@app.get("/api/users/{user_id}", response_model=UserResponse)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    viewer: Optional[crud.User] = Depends(get_current_user),
):
    user = crud.get_user(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if viewer is not None and not access.can_see_user(db, viewer, user):
        raise HTTPException(status_code=403, detail="You cannot view that person.")
    return user

@app.post("/api/users", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(user_in: UserCreate, db: Session = Depends(get_db)):
    return crud.create_user(db, user_in)

@app.put("/api/users/{user_id}", response_model=UserResponse)
def update_user(user_id: int, user_in: UserUpdate, db: Session = Depends(get_db)):
    user = crud.update_user(db, user_id, user_in)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@app.delete("/api/users/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    viewer: crud.User = Depends(require_auth),
):
    target = crud.get_user(db, user_id)
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    if not access.can_see_user(db, viewer, target) or viewer.id == target.id:
        if viewer.id == target.id:
            raise HTTPException(status_code=400, detail="You cannot remove yourself.")
        raise HTTPException(status_code=403, detail="You cannot remove that person.")
    if not access.is_admin(viewer):
        access.assert_own_athlete(db, viewer, target)
    result = crud.delete_user(db, user_id)
    if result == "missing":
        raise HTTPException(status_code=404, detail="User not found")
    if result != "deleted":
        raise HTTPException(status_code=409, detail=result)
    return {"message": "User deleted"}

# -------------------------------------------------------------
# Training Groups / Rosters Endpoints
# -------------------------------------------------------------
@app.get("/api/groups", response_model=List[GroupResponse])
def list_groups(
    db: Session = Depends(get_db),
    viewer: Optional[crud.User] = Depends(get_current_user),
):
    return crud.get_groups(db, viewer=viewer)

@app.get("/api/groups/{group_id}", response_model=GroupResponse)
def get_group(group_id: int, db: Session = Depends(get_db)):
    group = crud.get_group(db, group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    return group

@app.post("/api/groups", response_model=GroupResponse, status_code=status.HTTP_201_CREATED)
def create_group(
    group_in: GroupCreate,
    db: Session = Depends(get_db),
    viewer: Optional[crud.User] = Depends(get_current_user),
):
    if viewer is not None:
        if not _staff(viewer):
            raise HTTPException(status_code=403, detail="Athlete accounts do not have coach tools.")
        access.require_gym(viewer)
        group_in.coach_id = viewer.id
    group = crud.create_group(db, group_in)
    if viewer is not None:
        group.gym_id = viewer.gym_id
        group.coach_id = viewer.id
        if access.is_admin(viewer):
            viewer.is_coach = True
        db.commit()
        db.refresh(group)
        group.member_count = 0
    return group

@app.put("/api/groups/{group_id}", response_model=GroupResponse)
def update_group(group_id: int, group_in: GroupUpdate, db: Session = Depends(get_db)):
    group = crud.update_group(db, group_id, group_in)
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    return group

@app.delete("/api/groups/{group_id}")
def delete_group(
    group_id: int,
    db: Session = Depends(get_db),
    viewer: Optional[crud.User] = Depends(get_current_user),
):
    group = crud.get_group(db, group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    if viewer is not None:
        if access.is_admin(viewer):
            if group.gym_id != viewer.gym_id:
                raise HTTPException(status_code=403, detail="That team is in another gym.")
        else:
            access.assert_leads_team(db, viewer, group)
    result = crud.delete_group(db, group_id)
    if result == "missing":
        raise HTTPException(status_code=404, detail="Group not found")
    if result != "deleted":
        raise HTTPException(status_code=409, detail=result)
    return {"message": "Group deleted"}

class BatchGroupMembersRequest(BaseModel):
    user_ids: List[int]

@app.post("/api/groups/{group_id}/members/batch")
def add_batch_members(group_id: int, req: BatchGroupMembersRequest, db: Session = Depends(get_db)):
    success = crud.bulk_assign_athletes_to_group(db, group_id, req.user_ids)
    if not success:
        raise HTTPException(status_code=400, detail="Group not found")
    return {"message": f"Assigned {len(req.user_ids)} athletes to group"}

@app.post("/api/groups/{group_id}/members/{user_id}")
def add_group_member(
    group_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    viewer: Optional[crud.User] = Depends(get_current_user),
):
    if viewer is not None:
        team = crud.get_group(db, group_id)
        if access.is_admin(viewer) and team and team.gym_id == viewer.gym_id:
            pass
        else:
            access.assert_leads_team(db, viewer, team)
    success = crud.add_user_to_group(db, group_id, user_id)
    if not success:
        raise HTTPException(status_code=400, detail="An athlete belongs to exactly one team.")
    return {"message": "Member added"}

@app.delete("/api/groups/{group_id}/members/{user_id}")
def remove_group_member(group_id: int, user_id: int, db: Session = Depends(get_db)):
    success = crud.remove_user_from_group(db, group_id, user_id)
    if not success:
        raise HTTPException(status_code=400, detail="Could not remove member from group")
    return {"message": "Member removed"}

# -------------------------------------------------------------
# Workout Assignments Endpoints
# -------------------------------------------------------------
def _guard_assignment_target(db: Session, viewer: Optional[crud.User], user_id: Optional[int], group_id: Optional[int]):
    if viewer is None:
        return
    if not _staff(viewer):
        raise HTTPException(status_code=403, detail="Athlete accounts do not have coach tools.")
    if user_id:
        access.assert_own_athlete(db, viewer, crud.get_user(db, user_id))
    if group_id:
        access.assert_leads_team(db, viewer, crud.get_group(db, group_id))

@app.get("/api/assignments", response_model=List[WorkoutAssignmentResponse])
def list_assignments(
    date: Optional[str] = Query(None),
    user_id: Optional[int] = Query(None),
    group_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    viewer: Optional[crud.User] = Depends(get_current_user),
):
    if viewer is not None and not _staff(viewer):
        if user_id and user_id != viewer.id:
            raise HTTPException(status_code=403, detail="You can only view your own workouts.")
        user_id = viewer.id
        group_id = None
    rows = crud.get_assignments(db, date=date, user_id=user_id, group_id=group_id)
    return crud.scope_assignments(db, viewer, rows)

@app.post("/api/assignments", response_model=WorkoutAssignmentResponse, status_code=status.HTTP_201_CREATED)
def create_assignment(
    assign_in: WorkoutAssignmentCreate,
    db: Session = Depends(get_db),
    viewer: Optional[crud.User] = Depends(get_current_user),
):
    if bool(assign_in.group_id) == bool(assign_in.user_id):
        raise HTTPException(status_code=400, detail="Choose either one client or one team")
    _guard_assignment_target(db, viewer, assign_in.user_id, assign_in.group_id)
    if viewer is not None:
        assign_in.assigned_by_coach_id = viewer.id
    return crud.create_assignment(db, assign_in)

@app.post("/api/assignments/program", response_model=List[WorkoutAssignmentResponse], status_code=status.HTTP_201_CREATED)
def assign_program(
    req: ProgramAssignmentCreate,
    db: Session = Depends(get_db),
    viewer: Optional[crud.User] = Depends(get_current_user),
):
    if bool(req.group_id) == bool(req.user_id):
        raise HTTPException(status_code=400, detail="Choose either one client or one team")
    _guard_assignment_target(db, viewer, req.user_id, req.group_id)
    if viewer is not None:
        req.assigned_by_coach_id = viewer.id
    result = crud.assign_program(db, req)
    if result["dated_count"] == 0:
        raise HTTPException(
            status_code=400,
            detail="That program has no calendar dates yet. Set a date on each workout, or assign a single workout."
        )
    if not result["created"]:
        raise HTTPException(status_code=400, detail="That program is already assigned to this client or team.")
    return result["created"]

@app.delete("/api/assignments/{assignment_id}")
def delete_assignment(assignment_id: int, db: Session = Depends(get_db)):
    success = crud.delete_assignment(db, assignment_id)
    if not success:
        raise HTTPException(status_code=404, detail="Assignment not found")
    return {"message": "Assignment deleted"}

# -------------------------------------------------------------
# Coach Compliance & Overview Endpoints
# -------------------------------------------------------------
@app.get("/api/coach/compliance", response_model=CoachComplianceReport)
def get_coach_compliance(
    date: str = Query(..., description="YYYY-MM-DD"),
    db: Session = Depends(get_db),
    viewer: Optional[crud.User] = Depends(get_current_user),
):
    if viewer is not None and not _staff(viewer):
        raise HTTPException(status_code=403, detail="Athlete accounts do not have coach tools.")
    return crud.get_coach_compliance_report(db, date, viewer=viewer)

class PushToTomorrowRequest(BaseModel):
    user_id: int
    current_date: str

class MarkPresentRequest(BaseModel):
    user_id: int
    workout_id: int
    date: str

@app.post("/api/coach/remediate/push-to-tomorrow")
def push_to_tomorrow(req: PushToTomorrowRequest, db: Session = Depends(get_db)):
    new_date = crud.push_assignment_to_tomorrow(db, req.user_id, req.current_date)
    if not new_date:
        raise HTTPException(status_code=400, detail="Could not reschedule workout")
    return {"message": "Pushed to tomorrow", "new_date": new_date}

@app.post("/api/coach/remediate/mark-present")
def mark_present(req: MarkPresentRequest, db: Session = Depends(get_db)):
    session = crud.mark_athlete_workout_completed(db, req.user_id, req.workout_id, req.date)
    if not session:
        raise HTTPException(status_code=400, detail="Could not mark session complete")
    return {"message": "Marked present and completed", "session_id": session.id}


# -------------------------------------------------------------
# Gym, join codes, schedule
# -------------------------------------------------------------
@app.get("/api/gym/context", response_model=GymContext)
def get_gym_context(db: Session = Depends(get_db), current_user: crud.User = Depends(require_auth)):
    return crud.gym_context(db, current_user)

@app.post("/api/gym/coaches", response_model=GymMemberCreated, status_code=status.HTTP_201_CREATED)
def add_coach(body: GymMemberCreate, db: Session = Depends(get_db), current_user: crud.User = Depends(require_auth)):
    user, password = crud.add_gym_coach(db, current_user, body.name, body.email)
    return {"user": user, "temporary_password": password}

@app.delete("/api/gym/coaches/{user_id}")
def remove_coach(user_id: int, db: Session = Depends(get_db), current_user: crud.User = Depends(require_auth)):
    result = crud.remove_gym_coach(db, current_user, user_id)
    return {"message": "Coach removed" if result == "deleted" else "Coach role removed"}

@app.post("/api/gym/athletes", response_model=GymMemberCreated, status_code=status.HTTP_201_CREATED)
def add_athlete(body: GymMemberCreate, db: Session = Depends(get_db), current_user: crud.User = Depends(require_auth)):
    if not body.team_id:
        raise HTTPException(status_code=400, detail="An athlete belongs to exactly one team.")
    user, password = crud.add_gym_athlete(db, current_user, body.name, body.email, body.team_id)
    return {"user": user, "temporary_password": password}

@app.delete("/api/gym/athletes/{user_id}")
def remove_athlete(user_id: int, db: Session = Depends(get_db), current_user: crud.User = Depends(require_auth)):
    crud.remove_athlete(db, current_user, user_id)
    return {"message": "Athlete removed"}

@app.post("/api/gym/teams/{team_id}/move", response_model=GroupResponse)
def move_team(team_id: int, body: MoveTeamRequest, db: Session = Depends(get_db), current_user: crud.User = Depends(require_auth)):
    return crud.move_team(db, current_user, team_id, body.coach_id)

@app.post("/api/gyms", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_gym(body: GymCreate, db: Session = Depends(get_db), current_user: crud.User = Depends(require_auth)):
    return crud.create_own_gym(db, current_user, body.name)

@app.post("/api/join-codes", response_model=JoinCodeResponse, status_code=status.HTTP_201_CREATED)
def create_join_code(body: JoinCodeCreate, db: Session = Depends(get_db), current_user: crud.User = Depends(require_auth)):
    return crud.create_join_code(db, current_user, body.kind, body.team_id)

@app.get("/api/join-codes", response_model=List[JoinCodeResponse])
def get_join_codes(db: Session = Depends(get_db), current_user: crud.User = Depends(require_auth)):
    return crud.list_join_codes(db, current_user)

@app.post("/api/join-codes/redeem", response_model=UserResponse)
def redeem_join_code(body: JoinCodeRedeem, db: Session = Depends(get_db), current_user: crud.User = Depends(require_auth)):
    return crud.redeem_join_code(db, current_user, body.code)

@app.get("/api/my/schedule", response_model=List[ScheduleItem])
def my_schedule(db: Session = Depends(get_db), current_user: crud.User = Depends(require_auth)):
    return crud.schedule_for_athlete(db, current_user)

@app.post("/api/my/note", response_model=ScheduleItem)
def my_note(body: AthleteNoteRequest, db: Session = Depends(get_db), current_user: crud.User = Depends(require_auth)):
    session = crud.write_athlete_note(db, current_user, body.workout_id, body.note)
    rows = crud.schedule_for_athlete(db, current_user)
    match = next((row for row in rows if row["workout_id"] == session.workout_id), None)
    if not match:
        raise HTTPException(status_code=404, detail="Workout not found on your schedule.")
    return match

@app.post("/api/coach/assign", response_model=WorkoutAssignmentResponse, status_code=status.HTTP_201_CREATED)
def coach_assign(body: CoachAssignRequest, db: Session = Depends(get_db), current_user: crud.User = Depends(require_auth)):
    if not _staff(current_user):
        raise HTTPException(status_code=403, detail="Athlete accounts do not have coach tools.")
    return crud.assign_workout_to_athlete(
        db, current_user, body.athlete_id, body.title, body.scheduled_date,
        body.exercise_name or "Back Squat", body.sets or 3, body.reps or "5",
        body.weight or "60", body.notes or "",
    )


# Mount static directory for frontend assets
static_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")
if os.path.exists(static_path):
    app.mount("/static", StaticFiles(directory=static_path), name="static")

@app.api_route("/", methods=["GET", "HEAD"])
def serve_index():
    index_file = os.path.join(static_path, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return {"message": "wourkout"}
