import base64
import hashlib
import hmac
import json
import logging
import os
import re
import secrets
from datetime import datetime, timedelta
from typing import List, Optional, Tuple
import httpx
from fastapi import HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc, asc

from app.models import Exercise, Workout, WorkoutExercise, WorkoutSession, SetLog, PersonalRecord, User, Group, WorkoutAssignment, Gym, JoinCode, GymItem, GymHiddenExercise
from app import access
from app.schemas import (
    ExerciseCreate, ExerciseUpdate, WorkoutCreate, WorkoutUpdate, PersonalRecordCreate,
    CopyWeekRequest, AddWorkoutToDayRequest, SaveProgramTemplateRequest,
    UserCreate, UserUpdate, GroupCreate, GroupUpdate, WorkoutAssignmentCreate, UserRegister
)
from app.config import settings

logger = logging.getLogger(__name__)

# Authentication & Password Security
def hash_password(password: str) -> str:
    if not password:
        return ""
    salt = secrets.token_hex(16)
    key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 100000)
    return f"pbkdf2:sha256:100000${salt}${key.hex()}"

def verify_password(plain_password: str, hashed_password: str) -> bool:
    if not plain_password or not hashed_password or "$" not in hashed_password:
        return False
    try:
        parts = hashed_password.split("$")
        if len(parts) != 3:
            return False
        salt = parts[1]
        key_hex = parts[2]
        computed = hashlib.pbkdf2_hmac("sha256", plain_password.encode("utf-8"), salt.encode("utf-8"), 100000)
        return hmac.compare_digest(computed.hex(), key_hex)
    except Exception:
        return False

def create_access_token(user_id: int, role: str = "athlete", expires_hours: Optional[int] = None) -> str:
    hours = expires_hours or settings.ACCESS_TOKEN_EXPIRE_HOURS
    payload = {
        "sub": str(user_id),
        "role": role,
        "exp": (datetime.utcnow() + timedelta(hours=hours)).timestamp()
    }
    payload_b64 = base64.urlsafe_b64encode(json.dumps(payload).encode()).decode().rstrip("=")
    signature = hmac.new(settings.JWT_SECRET.encode(), payload_b64.encode(), hashlib.sha256).hexdigest()
    return f"{payload_b64}.{signature}"

def decode_access_token(token: str) -> Optional[dict]:
    try:
        parts = token.split(".")
        if len(parts) != 2:
            return None
        payload_b64, signature = parts
        padding = "=" * (-len(payload_b64) % 4)
        expected_sig = hmac.new(settings.JWT_SECRET.encode(), payload_b64.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(signature, expected_sig):
            return None
        payload = json.loads(base64.urlsafe_b64decode(payload_b64 + padding).decode())
        if payload.get("exp", 0) < datetime.utcnow().timestamp():
            return None
        return payload
    except Exception:
        return None

async def verify_supabase_token(access_token: str) -> Optional[dict]:
    if not settings.SUPABASE_URL or not access_token:
        return None
    try:
        headers = {"Authorization": f"Bearer {access_token}"}
        if settings.SUPABASE_ANON_KEY:
            headers["apikey"] = settings.SUPABASE_ANON_KEY
        async with httpx.AsyncClient(timeout=8.0) as client:
            res = await client.get(f"{settings.SUPABASE_URL}/auth/v1/user", headers=headers)
            if res.status_code == 200:
                return res.json()
    except Exception as exc:
        logger.warning(f"Supabase token verification error: {exc}")
    return None

def get_user_by_email_or_username(db: Session, identifier: str) -> Optional[User]:
    ident = (identifier or "").strip().lower()
    if not ident:
        return None
    return db.query(User).filter(
        (User.email.ilike(ident)) | (User.username.ilike(ident))
    ).first()

def get_user_by_supabase_uid(db: Session, uid: str) -> Optional[User]:
    if not uid:
        return None
    return db.query(User).filter(User.supabase_uid == uid).first()

def create_auth_user(db: Session, user_in: UserRegister) -> User:
    role = (user_in.role or "athlete").lower()
    if role not in ["coach", "athlete", "admin"]:
        role = "athlete"
    email = user_in.email.strip().lower()
    username = user_in.username.strip().lower() if user_in.username else email.split("@")[0]

    existing_u = db.query(User).filter(User.username == username).first()
    if existing_u:
        username = f"{username}_{secrets.token_hex(3)}"

    user = User(
        name=user_in.name,
        email=email,
        username=username,
        password_hash=hash_password(user_in.password) if user_in.password else None,
        supabase_uid=user_in.supabase_uid,
        role=role,
        title=user_in.title or ("Head Coach" if role == "coach" else ("System Admin" if role == "admin" else "Athlete")),
        position_tag=user_in.position_tag or "Athlete",
        is_active=True
    )
    access.apply_role_flags(user, role)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

def seed_default_users(db: Session):
    defaults = [
        ("System Admin", "admin@wourkout.app", "admin", "admin", "AdminPassword123!", "System Administrator", "#ef4444"),
        ("Head Coach", "coach@wourkout.app", "coach", "coach", "CoachPassword123!", "Head Strength Coach", "#3b82f6"),
        ("Varsity Athlete", "athlete@wourkout.app", "athlete", "athlete", "AthletePassword123!", "Varsity Athlete", "#10b981"),
        ("Eric Van Zeumeren", "ericvanzeumeren@gmail.com", "eric", "athlete", "AthletePassword123!", "Varsity Athlete", "#0ea5e9"),
        ("Leah Van Zeumeren", "leah@example.com", "leah", "athlete", "AthletePassword123!", "Varsity Athlete", "#a855f7")
    ]
    for name, email, uname, role, pwd, title, color in defaults:
        existing = db.query(User).filter((User.email == email) | (User.username == uname)).first()
        if not existing:
            u = User(
                name=name,
                email=email,
                username=uname,
                password_hash=hash_password(pwd),
                role=role,
                title=title,
                avatar_color=color,
                is_active=True
            )
            access.apply_role_flags(u, role)
            db.add(u)
        else:
            if not existing.password_hash:
                existing.password_hash = hash_password(pwd)
            if not existing.username:
                existing.username = uname
            if not existing.role or existing.role == "student":
                existing.role = role
            access.apply_role_flags(existing, role)
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        logger.warning(f"Error seeding default users: {e}")
        return
    try:
        _seed_demo_gym(db)
    except Exception as e:
        db.rollback()
        logger.warning(f"Error seeding demo gym: {e}")

MONTH_MAP = {'JAN': 1, 'FEB': 2, 'MAR': 3, 'APR': 4, 'MAY': 5, 'JUN': 6, 'JUL': 7, 'AUG': 8, 'SEP': 9, 'OCT': 10, 'NOV': 11, 'DEC': 12}

def parse_calendar_date(raw_date_str: str):
    """Returns (YYYY-MM-DD, DayOfWeek)"""
    if not raw_date_str:
        return ("", "Monday")
    if re.match(r'^\d{4}-\d{2}-\d{2}$', raw_date_str):
        try:
            dt = datetime.strptime(raw_date_str, "%Y-%m-%d")
            return (raw_date_str, dt.strftime("%A"))
        except Exception:
            return (raw_date_str, "Monday")

    m = re.search(r'([A-Za-z]+)\s*-\s*([A-Za-z]{3,4})\.?\s+(\d{1,2}),\s*(\d{4})', raw_date_str)
    if m:
        dow = m.group(1).capitalize()
        mon = MONTH_MAP.get(m.group(2).upper()[:3], 1)
        day = int(m.group(3))
        yr = int(m.group(4))
        return (f"{yr:04d}-{mon:02d}-{day:02d}", dow)
    return ("", "Monday")

def extract_week_number(title: str, program_name: str) -> int:
    m = re.search(r'Week\s*(\d+)', title, re.IGNORECASE) or re.search(r'Week\s*(\d+)', program_name, re.IGNORECASE)
    if m:
        return int(m.group(1))
    return 1

def seed_database_if_empty(db: Session):
    # Check if exercises already exist
    if db.query(Exercise).first():
        return

    seed_path = settings.SEED_DATA_PATH
    if not os.path.exists(seed_path):
        # Fallback to relative or current directory
        alt_paths = ["clean_seed_data.json", "reference/clean_seed_data.json", "/home/nishaand/projects/workout/reference/clean_seed_data.json"]
        for p in alt_paths:
            if os.path.exists(p):
                seed_path = p
                break

    if not os.path.exists(seed_path):
        print(f"Warning: Seed file not found at {seed_path}")
        return

    with open(seed_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    print("Seeding exercises into database...")
    exercise_map = {}
    for ex_data in data.get("exercises", []):
        exercise = Exercise(
            name=ex_data["name"],
            category=ex_data.get("category", "Strength"),
            default_notes=ex_data.get("default_notes", ""),
            video_url=ex_data.get("video_url", "")
        )
        db.add(exercise)
        db.flush()
        exercise_map[exercise.name] = exercise

    print(f"Seeded {len(exercise_map)} exercises.")
    if settings.SUPABASE_URL:
        db.commit()
        return

    print("Seeding workouts into database...")
    created_workouts = []
    for w_data in data.get("workouts", []):
        cal_date, dow = parse_calendar_date(w_data.get("date", ""))
        wk_num = extract_week_number(w_data["title"], w_data.get("program_name", "General"))
        workout = Workout(
            title=w_data["title"],
            program_name=w_data.get("program_name", "General"),
            scheduled_date=w_data.get("date", ""),
            calendar_date=cal_date,
            week_number=wk_num,
            day_of_week=dow,
            description=w_data.get("description", ""),
            video_url=w_data.get("video_url", "")
        )
        db.add(workout)
        db.flush()

        for idx, item in enumerate(w_data.get("exercises", [])):
            ex_name = item["name"]
            # lookup exercise
            ex_obj = exercise_map.get(ex_name)
            if not ex_obj:
                ex_obj = Exercise(
                    name=ex_name,
                    category="Strength",
                    default_notes=item.get("notes", ""),
                    video_url=f"https://www.youtube.com/results?search_query={ex_name.replace(' ', '+')}"
                )
                db.add(ex_obj)
                db.flush()
                exercise_map[ex_name] = ex_obj

            workout_ex = WorkoutExercise(
                workout_id=workout.id,
                exercise_id=ex_obj.id,
                superset_group=item.get("superset_group", "A"),
                order_index=idx,
                prescription_text=item.get("prescription_text", ""),
                prescribed_sets=item.get("prescribed_sets", 3),
                target_reps=item.get("target_reps", "10"),
                target_weight=item.get("target_weight", "0"),
                rest_seconds=item.get("rest_seconds", 0),
                notes=item.get("notes", ""),
                is_ea=item.get("is_ea", False)
            )
            db.add(workout_ex)

        created_workouts.append(workout)

    db.commit()
    print(f"Seeded {len(created_workouts)} workouts successfully.")

    # Create active session for Day 1 - Week 4 (matches user screenshots)
    if created_workouts:
        day1 = created_workouts[0]
        session = WorkoutSession(
            workout_id=day1.id,
            start_time=datetime.utcnow(),
            completed=False,
            notes="Active workout session"
        )
        db.add(session)
        db.flush()

        # Pre-initialize set logs for all exercises in Day 1
        for we in day1.exercises:
            target_reps_num = 10.0
            try:
                # parse numeric reps from target_reps like "12 ea." or "8"
                digits = "".join([c for c in we.target_reps if c.isdigit() or c == '.'])
                if digits:
                    target_reps_num = float(digits)
            except Exception:
                target_reps_num = 10.0

            target_wt_num = 0.0
            try:
                target_wt_num = float(we.target_weight)
            except Exception:
                target_wt_num = 0.0

            for s_num in range(1, we.prescribed_sets + 1):
                set_log = SetLog(
                    session_id=session.id,
                    workout_exercise_id=we.id,
                    set_number=s_num,
                    weight=target_wt_num,
                    reps=target_reps_num,
                    completed=False
                )
                db.add(set_log)

        # Seed PRs
        pr_seeds = [
            ("Back Squat", 217.0, 8, "Recorded from wourkout card"),
            ("Reverse Lunge", 213.0, 4, "Barbell Reverse Lunge PR"),
            ("RDL", 180.0, 8, "Romanian Deadlift PR"),
            ("Kickstand RDL", 80.0, 8, "Kickstand Dumbbell RDL"),
            ("FFE Split Squat", 70.0, 8, "Front Foot Elevated Split Squat"),
        ]
        for ex_title, wt, rps, note in pr_seeds:
            if ex_title in exercise_map:
                pr = PersonalRecord(
                    exercise_id=exercise_map[ex_title].id,
                    weight=wt,
                    reps=rps,
                    notes=note
                )
                db.add(pr)

        db.commit()
        print("Initialized Day 1 active session and PR records!")

# Exercise Queries
def get_exercises(db: Session, skip: int = 0, limit: int = 1000, category: Optional[str] = None, search: Optional[str] = None):
    query = db.query(Exercise)
    if category and category != "All":
        query = query.filter(Exercise.category == category)
    if search:
        query = query.filter(Exercise.name.ilike(f"%{search}%"))
    return query.order_by(Exercise.name).offset(skip).limit(limit).all()

def get_exercise(db: Session, exercise_id: int):
    return db.query(Exercise).filter(Exercise.id == exercise_id).first()

def create_exercise(db: Session, exercise_in: ExerciseCreate):
    exercise = Exercise(**exercise_in.model_dump())
    db.add(exercise)
    db.commit()
    db.refresh(exercise)
    return exercise

def update_exercise(db: Session, exercise_id: int, exercise_in: ExerciseUpdate):
    ex = db.query(Exercise).filter(Exercise.id == exercise_id).first()
    if not ex:
        return None
    for field, val in exercise_in.model_dump(exclude_unset=True).items():
        setattr(ex, field, val)
    db.commit()
    db.refresh(ex)
    return ex

def delete_exercise(db: Session, exercise_id: int) -> bool:
    ex = db.query(Exercise).filter(Exercise.id == exercise_id).first()
    if not ex:
        return False
    db.delete(ex)
    db.commit()
    return True

# Workout Queries
def get_workouts(db: Session, skip: int = 0, limit: int = 500, program: Optional[str] = None):
    query = db.query(Workout)
    if program and program != "All":
        query = query.filter(Workout.program_name == program)
    workouts = query.order_by(Workout.id.asc()).offset(skip).limit(limit).all()
    # attach exercise count
    for w in workouts:
        w.exercise_count = len(w.exercises)
    return workouts

def get_workout(db: Session, workout_id: int):
    w = db.query(Workout).filter(Workout.id == workout_id).first()
    if w:
        w.exercise_count = len(w.exercises)
    return w

def create_workout(db: Session, workout_in: WorkoutCreate):
    cal_date, dow = parse_calendar_date(workout_in.calendar_date or workout_in.scheduled_date)
    wk_num = workout_in.week_number if workout_in.week_number is not None else extract_week_number(workout_in.title, workout_in.program_name or "")
    workout = Workout(
        title=workout_in.title,
        program_name=workout_in.program_name or "Custom",
        scheduled_date=workout_in.scheduled_date or "",
        calendar_date=cal_date,
        week_number=wk_num,
        day_of_week=workout_in.day_of_week or dow,
        description=workout_in.description or "",
        video_url=workout_in.video_url or ""
    )
    db.add(workout)
    db.flush()

    for idx, item in enumerate(workout_in.exercises or []):
        we = WorkoutExercise(
            workout_id=workout.id,
            exercise_id=item.exercise_id,
            superset_group=item.superset_group or "A",
            order_index=item.order_index if item.order_index is not None else idx,
            prescription_text=item.prescription_text or f"{item.prescribed_sets} X {item.target_reps}",
            prescribed_sets=item.prescribed_sets or 3,
            target_reps=item.target_reps or "10",
            target_weight=item.target_weight or "0",
            rest_seconds=item.rest_seconds or 0,
            notes=item.notes or "",
            is_ea=item.is_ea or False
        )
        db.add(we)

    db.commit()
    db.refresh(workout)
    return workout

def update_workout(db: Session, workout_id: int, workout_in: WorkoutUpdate):
    w = db.query(Workout).filter(Workout.id == workout_id).first()
    if not w:
        return None
    
    update_data = workout_in.model_dump(exclude_unset=True)
    exercises_data = update_data.pop("exercises", None)

    if "calendar_date" in update_data and update_data["calendar_date"]:
        cal_date, dow = parse_calendar_date(update_data["calendar_date"])
        w.calendar_date = cal_date
        if "day_of_week" not in update_data:
            w.day_of_week = dow

    for field, val in update_data.items():
        setattr(w, field, val)

    if exercises_data is not None:
        db.query(WorkoutExercise).filter(WorkoutExercise.workout_id == workout_id).delete()
        for idx, item in enumerate(exercises_data):
            ex_id = item.get("exercise_id") if isinstance(item, dict) else item.exercise_id
            p_sets = item.get("prescribed_sets", 3) if isinstance(item, dict) else getattr(item, "prescribed_sets", 3)
            t_reps = item.get("target_reps", "10") if isinstance(item, dict) else getattr(item, "target_reps", "10")
            presc = item.get("prescription_text") if isinstance(item, dict) else getattr(item, "prescription_text", "")
            if not presc:
                presc = f"{p_sets} X {str(t_reps).upper()}"

            we = WorkoutExercise(
                workout_id=w.id,
                exercise_id=ex_id,
                superset_group=item.get("superset_group", "A") if isinstance(item, dict) else getattr(item, "superset_group", "A"),
                order_index=idx,
                prescription_text=presc,
                prescribed_sets=p_sets,
                target_reps=str(t_reps),
                target_weight=str(item.get("target_weight", "0") if isinstance(item, dict) else getattr(item, "target_weight", "0")),
                rest_seconds=item.get("rest_seconds", 0) if isinstance(item, dict) else getattr(item, "rest_seconds", 0),
                notes=item.get("notes", "") if isinstance(item, dict) else getattr(item, "notes", ""),
                is_ea=item.get("is_ea", False) if isinstance(item, dict) else getattr(item, "is_ea", False)
            )
            db.add(we)

    db.commit()
    db.refresh(w)
    w.exercise_count = len(w.exercises)
    sync_group_day_to_members(db, w)
    db.refresh(w)
    w.exercise_count = len(w.exercises)
    return w

def add_workout_to_day(db: Session, req: AddWorkoutToDayRequest) -> Optional[Workout]:
    src_w = db.query(Workout).filter(Workout.id == req.workout_id).first()
    if not src_w:
        return None
    
    if req.duplicate_as_new:
        new_title = f"{req.day_of_week} - {src_w.title}"
        new_w = Workout(
            title=new_title,
            program_name=req.program_name,
            week_number=req.week_number,
            day_of_week=req.day_of_week,
            calendar_date=req.calendar_date or src_w.calendar_date,
            scheduled_date=src_w.scheduled_date,
            description=src_w.description,
            video_url=src_w.video_url
        )
        db.add(new_w)
        db.flush()

        for src_we in src_w.exercises:
            we = WorkoutExercise(
                workout_id=new_w.id,
                exercise_id=src_we.exercise_id,
                superset_group=src_we.superset_group,
                order_index=src_we.order_index,
                prescription_text=src_we.prescription_text,
                prescribed_sets=src_we.prescribed_sets,
                target_reps=src_we.target_reps,
                target_weight=src_we.target_weight,
                rest_seconds=src_we.rest_seconds,
                notes=src_we.notes,
                is_ea=src_we.is_ea
            )
            db.add(we)
        db.commit()
        db.refresh(new_w)
        new_w.exercise_count = len(new_w.exercises)
        return new_w
    else:
        src_w.program_name = req.program_name
        src_w.week_number = req.week_number
        src_w.day_of_week = req.day_of_week
        if req.calendar_date:
            src_w.calendar_date = req.calendar_date
        db.commit()
        db.refresh(src_w)
        src_w.exercise_count = len(src_w.exercises)
        return src_w

def save_program_template(db: Session, req: SaveProgramTemplateRequest) -> List[Workout]:
    src_workouts = db.query(Workout).filter(
        Workout.program_name == req.source_program,
        Workout.week_number == req.source_week_number
    ).all()

    if not src_workouts:
        src_workouts = db.query(Workout).filter(Workout.program_name == req.source_program).all()

    created = []
    for src_w in src_workouts:
        new_w = Workout(
            title=src_w.title,
            program_name=req.new_program_name,
            week_number=1,
            day_of_week=src_w.day_of_week,
            calendar_date="",
            scheduled_date=src_w.scheduled_date,
            description=src_w.description,
            video_url=src_w.video_url
        )
        db.add(new_w)
        db.flush()
        for src_we in src_w.exercises:
            we = WorkoutExercise(
                workout_id=new_w.id,
                exercise_id=src_we.exercise_id,
                superset_group=src_we.superset_group,
                order_index=src_we.order_index,
                prescription_text=src_we.prescription_text,
                prescribed_sets=src_we.prescribed_sets,
                target_reps=src_we.target_reps,
                target_weight=src_we.target_weight,
                rest_seconds=src_we.rest_seconds,
                notes=src_we.notes,
                is_ea=src_we.is_ea
            )
            db.add(we)
        created.append(new_w)
    db.commit()
    return created

def delete_workout(db: Session, workout_id: int):
    w = db.query(Workout).filter(Workout.id == workout_id).first()
    if not w:
        return False
    db.delete(w)
    db.commit()
    return True

# Session & Set Logging
def _note_values(notes: str, label: str) -> List[str]:
    prefix = label + ":"
    for line in (notes or "").split("\n"):
        if line.startswith(prefix):
            return line[len(prefix):].split(",")
    return []


def _nth_float(parts, index: int, default: float) -> float:
    if isinstance(parts, str):
        parts = [piece.strip() for piece in parts.split(",")] if parts else []
    piece = ""
    if index < len(parts) and str(parts[index]).strip() != "":
        piece = str(parts[index]).strip()
    elif parts and str(parts[0]).strip() != "":
        piece = str(parts[0]).strip()
    else:
        return default
    digits = "".join(ch for ch in piece if ch.isdigit() or ch == ".")
    if not digits:
        return default
    try:
        return float(digits)
    except ValueError:
        return default


def _set_rest_seconds(we, index: int) -> int:
    rests = _note_values(we.notes or "", "Rests")
    if not any(str(value).strip() for value in rests) and we.rest_seconds:
        rests = [str(we.rest_seconds)]
    return int(_nth_float(rests, index, 0))


def _set_details(we, index: int) -> str:
    extra = {}
    for key, label in (("tempo", "Tempos"), ("velocity", "Velocities"), ("power", "Powers"), ("pct", "Pcts")):
        values = _note_values(we.notes or "", label)
        if not any(str(value).strip() for value in values):
            continue
        chosen = values[index] if index < len(values) else values[0]
        extra[key] = str(chosen).strip()
    return json.dumps(extra) if extra else ""


def get_or_create_active_session(db: Session, workout_id: int, user_id: Optional[int] = None):
    # Find uncompleted session for this workout and user
    query = db.query(WorkoutSession).filter(
        WorkoutSession.workout_id == workout_id,
        WorkoutSession.completed == False
    )
    if user_id is not None:
        query = query.filter(WorkoutSession.user_id == user_id)
    session = query.order_by(desc(WorkoutSession.start_time)).first()

    workout = db.query(Workout).filter(Workout.id == workout_id).first()
    if not workout:
        return None

    if not session:
        started = datetime.utcnow()
        session = WorkoutSession(
            workout_id=workout_id,
            user_id=user_id,
            start_time=started,
            completed=False
        )
        db.add(session)
        db.flush()

        # Prescription stays on the workout exercise. Seeded rows stay at 0 so
        # opening a session does not count as lifted weight on the leaderboard.
        for we in workout.exercises:
            for s_num in range(1, (we.prescribed_sets or 1) + 1):
                index = s_num - 1
                set_log = SetLog(
                    session_id=session.id,
                    workout_exercise_id=we.id,
                    set_number=s_num,
                    weight=0.0,
                    reps=0.0,
                    rest_seconds=_set_rest_seconds(we, index),
                    details=_set_details(we, index),
                    completed=False,
                    logged_at=started,
                )
                db.add(set_log)
        db.commit()
        db.refresh(session)

    return session

def log_or_update_set(
    db: Session,
    session_id: int,
    workout_exercise_id: int,
    set_number: int,
    weight: float,
    reps: float,
    completed: bool,
    rest_seconds: Optional[int] = None,
    details: Optional[str] = None,
):
    set_log = db.query(SetLog).filter(
        SetLog.session_id == session_id,
        SetLog.workout_exercise_id == workout_exercise_id,
        SetLog.set_number == set_number
    ).first()

    if set_log:
        set_log.weight = weight
        set_log.reps = reps
        set_log.completed = completed
        if rest_seconds is not None:
            set_log.rest_seconds = rest_seconds
        if details is not None:
            set_log.details = details
        set_log.logged_at = datetime.utcnow()
    else:
        set_log = SetLog(
            session_id=session_id,
            workout_exercise_id=workout_exercise_id,
            set_number=set_number,
            weight=weight,
            reps=reps,
            rest_seconds=rest_seconds or 0,
            details=details or "",
            completed=completed,
            logged_at=datetime.utcnow()
        )
        db.add(set_log)

    db.commit()
    db.refresh(set_log)
    return set_log

def get_session_details(db: Session, session_id: int):
    return db.query(WorkoutSession).filter(WorkoutSession.id == session_id).first()

def get_recent_sessions(db: Session, limit: int = 20):
    return db.query(WorkoutSession).order_by(desc(WorkoutSession.start_time)).limit(limit).all()

def complete_session(db: Session, session_id: int, notes: str = ""):
    session = db.query(WorkoutSession).filter(WorkoutSession.id == session_id).first()
    if session:
        session.completed = True
        session.end_time = datetime.utcnow()
        if notes:
            session.notes = notes
        db.commit()
        db.refresh(session)
    return session

# Personal Records
def get_personal_records(db: Session, user_id: Optional[int] = None, include_global: bool = True, viewer: Optional[User] = None):
    query = db.query(PersonalRecord)
    if viewer is not None and viewer.gym_id:
        gym_user_ids = [
            u.id for u in db.query(User).filter(User.gym_id == viewer.gym_id).all()
        ]
        if user_id is not None:
            query = query.filter(PersonalRecord.user_id == user_id)
        else:
            query = query.filter(PersonalRecord.user_id.in_(gym_user_ids or [-1]))
    elif user_id is not None:
        if include_global:
            query = query.filter(or_(PersonalRecord.user_id == user_id, PersonalRecord.user_id.is_(None)))
        else:
            query = query.filter(PersonalRecord.user_id == user_id)
    return query.order_by(desc(PersonalRecord.weight)).all()

def add_personal_record(db: Session, record_in: PersonalRecordCreate):
    pr = PersonalRecord(
        exercise_id=record_in.exercise_id,
        user_id=record_in.user_id,
        weight=record_in.weight,
        reps=record_in.reps or 1,
        notes=record_in.notes or "",
        date=datetime.utcnow()
    )
    db.add(pr)
    db.commit()
    db.refresh(pr)
    return pr

def update_personal_record(db: Session, record_id: int, record_in):
    pr = db.query(PersonalRecord).filter(PersonalRecord.id == record_id).first()
    if not pr:
        return None
    for field, val in record_in.model_dump(exclude_unset=True).items():
        setattr(pr, field, val)
    db.commit()
    db.refresh(pr)
    return pr

def delete_personal_record(db: Session, record_id: int) -> bool:
    pr = db.query(PersonalRecord).filter(PersonalRecord.id == record_id).first()
    if not pr:
        return False
    db.delete(pr)
    db.commit()
    return True

# Week Planner, Bulk Copy & Calendar Queries
def copy_week(db: Session, req: CopyWeekRequest) -> List[Workout]:
    # Find all workouts in source program & week
    source_workouts = db.query(Workout).filter(
        Workout.program_name == req.source_program,
        Workout.week_number == req.source_week_number
    ).order_by(Workout.id.asc()).all()

    if not source_workouts:
        # Fallback to all workouts in that program
        source_workouts = db.query(Workout).filter(
            Workout.program_name == req.source_program
        ).order_by(Workout.id.asc()).all()

    if not source_workouts:
        return []

    target_program = req.target_program or req.source_program
    try:
        base_date = datetime.strptime(req.target_start_date, "%Y-%m-%d")
    except Exception:
        base_date = datetime.utcnow()

    DAY_OFFSETS = {
        "Monday": 0, "Tuesday": 1, "Wednesday": 2, "Thursday": 3,
        "Friday": 4, "Saturday": 5, "Sunday": 6
    }

    created_workouts = []
    repeat_count = max(1, req.repeat_weeks or 1)

    for w_offset in range(repeat_count):
        curr_target_week = (req.target_week_number or 2) + w_offset

        for src_w in source_workouts:
            dow = src_w.day_of_week or "Monday"
            day_add = DAY_OFFSETS.get(dow, 0)
            target_dt = base_date + timedelta(days=(w_offset * 7) + day_add)
            target_iso = target_dt.strftime("%Y-%m-%d")
            target_display = target_dt.strftime("%A - %b. %d, %Y").upper()

            # Clean friendly title
            d_num_match = re.search(r'Day\s*(\d+)', src_w.title, re.IGNORECASE)
            d_prefix = f"Day {d_num_match.group(1)} - " if d_num_match else ""
            new_title = f"{d_prefix}Week {curr_target_week} ({dow} - {target_dt.strftime('%b. %d, %Y')})"

            new_w = Workout(
                title=new_title,
                program_name=target_program,
                week_number=curr_target_week,
                day_of_week=dow,
                calendar_date=target_iso,
                scheduled_date=target_display,
                description=src_w.description,
                video_url=src_w.video_url
            )
            db.add(new_w)
            db.flush()

            for src_we in src_w.exercises:
                # Apply weight progression if requested
                new_wt = src_we.target_weight
                if req.weight_progression_lbs and req.weight_progression_lbs != 0:
                    try:
                        wt_val = float(src_we.target_weight)
                        if wt_val > 0:
                            new_wt = str(round(wt_val + (req.weight_progression_lbs * (w_offset + 1))))
                    except Exception:
                        pass

                cloned_we = WorkoutExercise(
                    workout_id=new_w.id,
                    exercise_id=src_we.exercise_id,
                    superset_group=src_we.superset_group,
                    order_index=src_we.order_index,
                    prescription_text=src_we.prescription_text,
                    prescribed_sets=src_we.prescribed_sets,
                    target_reps=src_we.target_reps,
                    target_weight=new_wt,
                    rest_seconds=src_we.rest_seconds,
                    notes=src_we.notes,
                    is_ea=src_we.is_ea
                )
                db.add(cloned_we)

            new_w.exercise_count = len(src_w.exercises)
            created_workouts.append(new_w)

    db.commit()
    for w in created_workouts:
        db.refresh(w)
    return created_workouts

def reschedule_workout(db: Session, workout_id: int, new_calendar_date: str) -> Optional[Workout]:
    w = db.query(Workout).filter(Workout.id == workout_id).first()
    if not w:
        return None
    try:
        dt = datetime.strptime(new_calendar_date, "%Y-%m-%d")
        w.calendar_date = new_calendar_date
        w.day_of_week = dt.strftime("%A")
        w.scheduled_date = dt.strftime("%A - %b. %d, %Y").upper()
    except Exception:
        w.calendar_date = new_calendar_date
    db.commit()
    db.refresh(w)
    w.exercise_count = len(w.exercises)
    return w

def get_calendar_workouts(db: Session, start_date: str, end_date: str, user_id: Optional[int] = None):
    user = db.query(User).filter(User.id == user_id).first() if user_id else None
    has_assignments = db.query(WorkoutAssignment).count() > 0

    if user and user.role == "student" and has_assignments:
        # Student view: strictly show workouts assigned to them or their groups
        u_group_ids = [g.id for g in user.groups]
        who = [WorkoutAssignment.user_id == user.id]
        if u_group_ids:
            who.append(WorkoutAssignment.group_id.in_(u_group_ids))
        assign_query = db.query(WorkoutAssignment).filter(
            WorkoutAssignment.scheduled_date >= start_date,
            WorkoutAssignment.scheduled_date <= end_date,
            or_(*who)
        ).order_by(WorkoutAssignment.scheduled_date.asc())
        assignments = assign_query.all()
        moved_off = rescheduled_away_dates(db, user.id)
        assignments = [
            a for a in assignments
            if not (a.group_id and not a.user_id and a.scheduled_date in moved_off)
        ]

        calendar_map = {}
        for a in assignments:
            if not a.workout:
                continue
            d = a.scheduled_date
            if d not in calendar_map:
                calendar_map[d] = []
            if not any(item["id"] == a.workout.id for item in calendar_map[d]):
                session_query = db.query(WorkoutSession).filter(
                    WorkoutSession.workout_id == a.workout.id,
                    WorkoutSession.completed == True,
                    WorkoutSession.user_id == user.id
                )
                calendar_map[d].append({
                    "id": a.workout.id,
                    "title": a.workout.title,
                    "program_name": a.workout.program_name,
                    "exercise_count": len(a.workout.exercises),
                    "is_completed": session_query.first() is not None
                })
        return [{"date": d, "workouts": w_list} for d, w_list in sorted(calendar_map.items())]

    # Coach or unassigned athlete view
    workouts = db.query(Workout).filter(
        Workout.calendar_date >= start_date,
        Workout.calendar_date <= end_date
    ).order_by(Workout.calendar_date.asc(), Workout.id.asc()).all()

    assign_query = db.query(WorkoutAssignment).filter(
        WorkoutAssignment.scheduled_date >= start_date,
        WorkoutAssignment.scheduled_date <= end_date
    )
    assignments = assign_query.all()
    assigned_by_date = {}
    for a in assignments:
        d = a.scheduled_date
        if d not in assigned_by_date:
            assigned_by_date[d] = []
        if a.workout:
            assigned_by_date[d].append(a.workout)

    calendar_map = {}
    for w in workouts:
        d = w.calendar_date
        if not d:
            continue
        if d not in calendar_map:
            calendar_map[d] = []

        session_query = db.query(WorkoutSession).filter(
            WorkoutSession.workout_id == w.id,
            WorkoutSession.completed == True
        )
        if user_id:
            session_query = session_query.filter(WorkoutSession.user_id == user_id)
        is_completed = session_query.first() is not None

        calendar_map[d].append({
            "id": w.id,
            "title": w.title,
            "program_name": w.program_name,
            "exercise_count": len(w.exercises),
            "is_completed": is_completed
        })

    # Merge any assigned workouts that might not have calendar_date matching
    for d, w_list in assigned_by_date.items():
        if d not in calendar_map:
            calendar_map[d] = []
        for w in w_list:
            if not any(item["id"] == w.id for item in calendar_map[d]):
                session_query = db.query(WorkoutSession).filter(
                    WorkoutSession.workout_id == w.id,
                    WorkoutSession.completed == True
                )
                if user_id:
                    session_query = session_query.filter(WorkoutSession.user_id == user_id)
                calendar_map[d].append({
                    "id": w.id,
                    "title": w.title,
                    "program_name": w.program_name,
                    "exercise_count": len(w.exercises),
                    "is_completed": session_query.first() is not None
                })

    return [{"date": d, "workouts": w_list} for d, w_list in sorted(calendar_map.items())]

def get_programs_and_weeks(db: Session):
    rows = db.query(Workout.program_name, Workout.week_number).distinct().all()
    programs = {}
    for prog, wk in rows:
        prog_name = prog or "General"
        if prog_name not in programs:
            programs[prog_name] = set()
        programs[prog_name].add(wk or 1)
    
    return [
        {"program": p, "weeks": sorted(list(weeks))}
        for p, weeks in sorted(programs.items())
    ]

# -------------------------------------------------------------
# USER & COACHING CRUD
# -------------------------------------------------------------
def get_users(db: Session, role: Optional[str] = None, viewer: Optional[User] = None):
    return access.visible_users(db, viewer, role=role)

def get_user(db: Session, user_id: int):
    return db.query(User).filter(User.id == user_id).first()

def create_user(db: Session, user_in: UserCreate):
    role = user_in.role or "student"
    user = User(
        name=user_in.name,
        email=user_in.email,
        role=role,
        title=user_in.title or ("Head Coach" if role == "coach" else "Athlete"),
        avatar_color=user_in.avatar_color or "#0ea5e9",
        status_badge=user_in.status_badge or "Active",
        position_tag=user_in.position_tag or "Athlete",
        load_unit="lbs" if str(getattr(user_in, "load_unit", "") or "").lower() == "lbs" else "kg",
    )
    access.apply_role_flags(user, role)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

def update_user(db: Session, user_id: int, user_in: UserUpdate):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return None
    for field, val in user_in.model_dump(exclude_unset=True).items():
        if field == "load_unit":
            val = "lbs" if str(val or "").lower() == "lbs" else "kg"
        setattr(user, field, val)
    db.commit()
    db.refresh(user)
    return user

def delete_user(db: Session, user_id: int):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return "missing"
    block = access.coach_removal_block(db, user)
    if block:
        return block
    db.delete(user)
    db.commit()
    return "deleted"

# Groups & Rosters
def get_groups(db: Session, viewer: Optional[User] = None):
    groups = access.visible_teams(db, viewer)
    for g in groups:
        g.member_count = len(g.members)
    return groups

def get_group(db: Session, group_id: int):
    g = db.query(Group).filter(Group.id == group_id).first()
    if g:
        g.member_count = len(g.members)
    return g

def create_group(db: Session, group_in: GroupCreate):
    group = Group(
        name=group_in.name,
        description=group_in.description or "",
        color=group_in.color or "#3b82f6",
        coach_id=group_in.coach_id
    )
    db.add(group)
    db.commit()
    db.refresh(group)
    group.member_count = 0
    return group

def update_group(db: Session, group_id: int, group_in: GroupUpdate):
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        return None
    for field, val in group_in.model_dump(exclude_unset=True).items():
        setattr(group, field, val)
    db.commit()
    db.refresh(group)
    group.member_count = len(group.members)
    return group

def delete_group(db: Session, group_id: int):
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        return "missing"
    athletes = db.query(User).filter(User.team_id == group.id).count()
    if athletes or group.members:
        return "This team still has athletes. Remove them or move them to another coach before deleting the team."
    db.delete(group)
    db.commit()
    return "deleted"

def place_athlete_on_team(db: Session, user: User, group: Group, allow_move: bool = False, commit: bool = True) -> User:
    """An athlete belongs to exactly one team, and that team belongs to one coach."""
    if user.gym_id and group.gym_id and user.gym_id != group.gym_id:
        raise ValueError("That athlete is in another gym.")
    if user.team_id and user.team_id != group.id:
        if not allow_move:
            raise ValueError("An athlete belongs to exactly one team.")
        old = db.query(Group).filter(Group.id == user.team_id).first()
        if old and user in old.members:
            old.members.remove(user)
    if group.gym_id and not user.gym_id:
        user.gym_id = group.gym_id
    elif group.gym_id and user.gym_id == group.gym_id:
        user.gym_id = group.gym_id
    user.team_id = group.id
    user.is_athlete = True
    if user.role not in ("student", "athlete", "coach", "admin"):
        user.role = "athlete"
    if user not in group.members:
        group.members.append(user)
    if commit:
        db.commit()
        db.refresh(user)
    return user

def add_user_to_group(db: Session, group_id: int, user_id: int):
    group = db.query(Group).filter(Group.id == group_id).first()
    user = db.query(User).filter(User.id == user_id).first()
    if not group or not user:
        return False
    try:
        place_athlete_on_team(db, user, group, allow_move=False)
    except ValueError:
        return False
    return True

def remove_user_from_group(db: Session, group_id: int, user_id: int):
    group = db.query(Group).filter(Group.id == group_id).first()
    user = db.query(User).filter(User.id == user_id).first()
    if not group or not user:
        return False
    if user in group.members:
        group.members.remove(user)
    if user.team_id == group.id:
        user.team_id = None
        if not user.is_coach and not user.is_admin:
            user.is_athlete = False
    db.commit()
    return True

# Workout Assignments
def get_assignments(db: Session, date: Optional[str] = None, user_id: Optional[int] = None, group_id: Optional[int] = None):
    query = db.query(WorkoutAssignment)
    if date:
        query = query.filter(WorkoutAssignment.scheduled_date == date)
    if user_id:
        query = query.filter(WorkoutAssignment.user_id == user_id)
    if group_id:
        query = query.filter(WorkoutAssignment.group_id == group_id)
    assignments = query.order_by(WorkoutAssignment.scheduled_date.asc(), WorkoutAssignment.id.asc()).all()
    for a in assignments:
        a.workout_title = a.workout.title if a.workout else ""
        if a.group:
            a.target_name = f"Team: {a.group.name}"
        elif a.user:
            a.target_name = f"Client: {a.user.name}"
        else:
            a.target_name = "All"
    return assignments

def rescheduled_away_dates(db: Session, user_id: int) -> set:
    """Dates a client was individually moved off a team assignment."""
    rows = db.query(WorkoutAssignment).filter(
        WorkoutAssignment.user_id == user_id,
        WorkoutAssignment.notes.like("Rescheduled from %")
    ).all()
    dates = set()
    prefix = "Rescheduled from "
    for row in rows:
        note = row.notes or ""
        if note.startswith(prefix):
            dates.add(note[len(prefix):][:10])
    return dates

def assignment_for_student_on_date(db: Session, student: User, date_str: str):
    """Personal assignment wins. Team assignment is skipped if this client was moved off that date."""
    direct = db.query(WorkoutAssignment).filter(
        WorkoutAssignment.user_id == student.id,
        WorkoutAssignment.scheduled_date == date_str
    ).order_by(desc(WorkoutAssignment.id)).first()
    if direct:
        return direct
    if date_str in rescheduled_away_dates(db, student.id):
        return None
    group_ids = [g.id for g in student.groups]
    if not group_ids:
        return None
    return db.query(WorkoutAssignment).filter(
        WorkoutAssignment.group_id.in_(group_ids),
        WorkoutAssignment.scheduled_date == date_str
    ).order_by(desc(WorkoutAssignment.id)).first()

def _workout_exercise_snapshots(workout: Workout) -> list:
    snaps = []
    for we in sorted(list(workout.exercises or []), key=lambda row: row.order_index or 0):
        snaps.append({
            "exercise_id": we.exercise_id,
            "superset_group": we.superset_group or "A",
            "order_index": we.order_index or 0,
            "prescription_text": we.prescription_text or "",
            "prescribed_sets": we.prescribed_sets or 0,
            "target_reps": we.target_reps or "",
            "target_weight": we.target_weight or "",
            "rest_seconds": we.rest_seconds or 0,
            "notes": we.notes or "",
            "is_ea": bool(we.is_ea),
        })
    return snaps


def _group_athletes(db: Session, group: Group) -> list:
    found = {}
    for member in list(group.members or []):
        found[member.id] = member
    for user in db.query(User).filter(User.team_id == group.id).all():
        found[user.id] = user
    return list(found.values())


def write_group_day_onto_members(db: Session, group: Optional[Group], source: Optional[Workout], scheduled_date: str, coach_id: Optional[int]):
    """Copy a group day onto every athlete in the group, including athletes who already have that day."""
    if group is None or source is None or not scheduled_date:
        return
    snaps = _workout_exercise_snapshots(source)
    for member in _group_athletes(db, group):
        personal = db.query(WorkoutAssignment).filter(
            WorkoutAssignment.user_id == member.id,
            WorkoutAssignment.scheduled_date == scheduled_date,
        ).order_by(desc(WorkoutAssignment.id)).first()
        clone = Workout(
            title=source.title or "Workout",
            # Keep the copy off the source program so assigning that program again
            # does not treat each athlete's copy as another day to assign.
            program_name=((source.program_name or "wourkout") + " (athlete)")[:255],
            scheduled_date=scheduled_date,
            calendar_date=scheduled_date,
            week_number=source.week_number or 1,
            day_of_week=source.day_of_week or "",
            description=source.description or "",
            video_url=source.video_url or "",
            created_by_coach_id=coach_id or source.created_by_coach_id,
            gym_id=source.gym_id,
        )
        db.add(clone)
        db.flush()
        for snap in snaps:
            db.add(WorkoutExercise(workout_id=clone.id, **snap))
        if personal:
            personal.workout_id = clone.id
        else:
            db.add(WorkoutAssignment(
                workout_id=clone.id,
                assigned_by_coach_id=coach_id or source.created_by_coach_id,
                user_id=member.id,
                scheduled_date=scheduled_date,
                notes="Saved from group",
            ))
    db.commit()


def sync_group_day_to_members(db: Session, workout: Optional[Workout]):
    if not workout:
        return
    rows = db.query(WorkoutAssignment).filter(
        WorkoutAssignment.workout_id == workout.id,
        WorkoutAssignment.group_id.isnot(None),
    ).all()
    for row in rows:
        group = get_group(db, row.group_id)
        write_group_day_onto_members(db, group, workout, row.scheduled_date, row.assigned_by_coach_id)


def create_assignment(db: Session, assign_in: WorkoutAssignmentCreate):
    assign = WorkoutAssignment(
        workout_id=assign_in.workout_id,
        assigned_by_coach_id=assign_in.assigned_by_coach_id,
        group_id=assign_in.group_id,
        user_id=assign_in.user_id,
        scheduled_date=assign_in.scheduled_date,
        notes=assign_in.notes or ""
    )
    db.add(assign)
    db.commit()
    db.refresh(assign)
    if assign.group_id:
        group = get_group(db, assign.group_id)
        workout = get_workout(db, assign.workout_id)
        write_group_day_onto_members(db, group, workout, assign.scheduled_date, assign.assigned_by_coach_id)
        db.refresh(assign)
    assign.workout_title = assign.workout.title if assign.workout else ""
    if assign.group:
        assign.target_name = f"Team: {assign.group.name}"
    elif assign.user:
        assign.target_name = f"Client: {assign.user.name}"
    else:
        assign.target_name = "All"
    return assign

def assign_program(db: Session, req) -> dict:
    """Bulk-apply every dated workout in a program to one client or one team."""
    query = db.query(Workout).filter(Workout.program_name == req.program_name)
    if req.week_number:
        query = query.filter(Workout.week_number == req.week_number)
    workouts = query.order_by(Workout.calendar_date.asc(), Workout.id.asc()).all()
    dated = [w for w in workouts if w.calendar_date]
    created = []
    skipped_existing = 0
    note = (req.notes or "").strip() or f"Program: {req.program_name}"
    for workout in dated:
        existing = db.query(WorkoutAssignment).filter(
            WorkoutAssignment.workout_id == workout.id,
            WorkoutAssignment.scheduled_date == workout.calendar_date
        )
        if req.group_id:
            existing = existing.filter(WorkoutAssignment.group_id == req.group_id)
        else:
            existing = existing.filter(WorkoutAssignment.user_id == req.user_id)
        if existing.first():
            skipped_existing += 1
            continue
        created.append(create_assignment(db, WorkoutAssignmentCreate(
            workout_id=workout.id,
            assigned_by_coach_id=req.assigned_by_coach_id,
            group_id=req.group_id,
            user_id=req.user_id,
            scheduled_date=workout.calendar_date,
            notes=note
        )))
    return {
        "created": created,
        "dated_count": len(dated),
        "skipped_existing": skipped_existing
    }

def scrub_visible_brand(db: Session):
    """Rewrite leftover product-name strings in text athletes and trainers can see."""
    changed = False

    def rewrite(value):
        nonlocal changed
        if not value:
            return value
        updated = re.sub(r"teambuildr", "wourkout", value, flags=re.IGNORECASE)
        if updated != value:
            changed = True
        return updated

    for exercise in db.query(Exercise).all():
        exercise.default_notes = rewrite(exercise.default_notes)
    for workout in db.query(Workout).all():
        workout.description = rewrite(workout.description)
        workout.title = rewrite(workout.title)
        workout.program_name = rewrite(workout.program_name)
    for record in db.query(PersonalRecord).all():
        record.notes = rewrite(record.notes)
    for assignment in db.query(WorkoutAssignment).all():
        assignment.notes = rewrite(assignment.notes)
    if changed:
        db.commit()

def delete_assignment(db: Session, assignment_id: int):
    assign = db.query(WorkoutAssignment).filter(WorkoutAssignment.id == assignment_id).first()
    if not assign:
        return False
    db.delete(assign)
    db.commit()
    return True

# Coach Compliance Dashboard Report
def get_coach_compliance_report(db: Session, date_str: str, viewer: Optional[User] = None):
    if viewer is None:
        students = db.query(User).filter(User.role == "student").order_by(User.name.asc()).all()
    else:
        students = access.athletes_for(db, viewer)
    athletes_data = []

    completed_count = 0
    in_progress_count = 0
    not_started_count = 0

    for s in students:
        assignment = assignment_for_student_on_date(db, s, date_str)
        workout = assignment.workout if assignment else None
        if not workout:
            continue

        total_prescribed = sum([we.prescribed_sets for we in workout.exercises])

        session = db.query(WorkoutSession).filter(
            WorkoutSession.workout_id == workout.id,
            WorkoutSession.user_id == s.id
        ).order_by(desc(WorkoutSession.start_time)).first()

        status = "not_started"
        completed_sets = 0
        completed_at = None
        session_id = None

        if session:
            session_id = session.id
            completed_sets = db.query(SetLog).filter(
                SetLog.session_id == session.id,
                SetLog.completed == True
            ).count()

            if session.completed:
                status = "completed"
                completed_at = session.end_time or session.start_time
                completed_count += 1
            elif completed_sets > 0:
                status = "in_progress"
                in_progress_count += 1
            else:
                not_started_count += 1
        else:
            not_started_count += 1

        athletes_data.append({
            "user_id": s.id,
            "user_name": s.name,
            "user_email": s.email,
            "avatar_color": s.avatar_color or "#0ea5e9",
            "status_badge": s.status_badge or "Active",
            "position_tag": s.position_tag or (s.title or "Athlete"),
            "group_names": [g.name for g in s.groups],
            "assigned_workout_id": workout.id,
            "assigned_workout_title": workout.title,
            "status": status,
            "completed_sets": completed_sets,
            "total_prescribed_sets": total_prescribed,
            "completed_at": completed_at,
            "session_id": session_id
        })

    total_athletes = len(athletes_data)
    pct = round((completed_count / total_athletes * 100.0), 1) if total_athletes > 0 else 0.0

    return {
        "date": date_str,
        "total_athletes": total_athletes,
        "completed_count": completed_count,
        "in_progress_count": in_progress_count,
        "not_started_count": not_started_count,
        "compliance_percentage": pct,
        "athletes": athletes_data
    }

def push_assignment_to_tomorrow(db: Session, user_id: int, current_date: str):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return None
    try:
        curr_dt = datetime.strptime(current_date, "%Y-%m-%d")
        next_dt = curr_dt + timedelta(days=1)
        next_date = next_dt.strftime("%Y-%m-%d")
    except Exception:
        return None

    # Check for direct individual assignment
    assign = db.query(WorkoutAssignment).filter(
        WorkoutAssignment.user_id == user_id,
        WorkoutAssignment.scheduled_date == current_date
    ).first()
    u_group_ids = [g.id for g in user.groups]
    if user.team_id and user.team_id not in u_group_ids:
        u_group_ids.append(user.team_id)
    if assign:
        assign.scheduled_date = next_date
        if u_group_ids:
            group_same_day = db.query(WorkoutAssignment).filter(
                WorkoutAssignment.group_id.in_(u_group_ids),
                WorkoutAssignment.scheduled_date == current_date
            ).first()
            if group_same_day:
                assign.notes = f"Rescheduled from {current_date}"
        db.commit()
        return next_date

    # Check for group assignment
    group_assign = db.query(WorkoutAssignment).filter(
        WorkoutAssignment.group_id.in_(u_group_ids),
        WorkoutAssignment.scheduled_date == current_date
    ).first() if u_group_ids else None

    if group_assign:
        new_assign = WorkoutAssignment(
            workout_id=group_assign.workout_id,
            assigned_by_coach_id=group_assign.assigned_by_coach_id,
            user_id=user_id,
            group_id=None,
            scheduled_date=next_date,
            notes=f"Rescheduled from {current_date}"
        )
        db.add(new_assign)
        db.commit()
        return next_date

    return None

def mark_athlete_workout_completed(db: Session, user_id: int, workout_id: int, date_str: str):
    workout = db.query(Workout).filter(Workout.id == workout_id).first()
    user = db.query(User).filter(User.id == user_id).first()
    if not workout or not user:
        return None

    session = db.query(WorkoutSession).filter(
        WorkoutSession.workout_id == workout_id,
        WorkoutSession.user_id == user_id
    ).first()

    now = datetime.utcnow()
    if not session:
        session = WorkoutSession(
            workout_id=workout_id,
            user_id=user_id,
            start_time=now,
            end_time=now,
            completed=True,
            notes="Marked present & completed by Coach"
        )
        db.add(session)
        db.commit()
        db.refresh(session)
    else:
        session.completed = True
        session.end_time = now
        db.commit()

    for we in workout.exercises:
        num_sets = we.prescribed_sets or 3
        weight_num = 0.0
        if we.target_weight:
            clean_w = re.sub(r'[^0-9.]', '', str(we.target_weight))
            try:
                weight_num = float(clean_w) if clean_w else 0.0
            except ValueError:
                weight_num = 0.0
        reps_num = 10.0
        if we.target_reps:
            clean_r = re.sub(r'[^0-9.]', '', str(we.target_reps))
            try:
                reps_num = float(clean_r) if clean_r else 10.0
            except ValueError:
                reps_num = 10.0

        for s_idx in range(1, num_sets + 1):
            existing_log = db.query(SetLog).filter(
                SetLog.session_id == session.id,
                SetLog.workout_exercise_id == we.id,
                SetLog.set_number == s_idx
            ).first()
            if existing_log:
                existing_log.completed = True
                if not existing_log.weight:
                    existing_log.weight = weight_num
                if not existing_log.reps:
                    existing_log.reps = reps_num
            else:
                new_log = SetLog(
                    session_id=session.id,
                    workout_exercise_id=we.id,
                    set_number=s_idx,
                    weight=weight_num,
                    reps=reps_num,
                    completed=True
                )
                db.add(new_log)
    db.commit()
    return session

def bulk_assign_athletes_to_group(db: Session, group_id: int, user_ids: List[int]):
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        return False
    users = db.query(User).filter(User.id.in_(user_ids)).all()
    if len(users) != len(set(user_ids)):
        return False
    for u in users:
        if u.team_id and u.team_id != group.id:
            return False
        if u.gym_id and group.gym_id and u.gym_id != group.gym_id:
            return False
    for u in users:
        place_athlete_on_team(db, u, group, allow_move=False, commit=False)
    db.commit()
    return True


def _seed_demo_gym(db: Session):
    """One gym, two coaches, and a workout the varsity athlete can open."""
    gym = db.query(Gym).filter(Gym.name == "wourkout").first()
    if not gym:
        gym = Gym(name="wourkout")
        db.add(gym)
        db.flush()

    def by_email(email):
        return db.query(User).filter(User.email == email).first()

    extras = [
        ("Alex Rivera", "alex.rivera@wourkout.app", "alex", "coach", "CoachPassword123!", "Coach", "#f59e0b"),
        ("Maya Lin", "maya.lin@wourkout.app", "maya", "athlete", "AthletePassword123!", "Athlete", "#ec4899"),
    ]
    for name, email, uname, role, pwd, title, color in extras:
        if not by_email(email):
            row = User(
                name=name, email=email, username=uname, role=role, title=title,
                avatar_color=color, is_active=True, password_hash=hash_password(pwd)
            )
            access.apply_role_flags(row, role)
            db.add(row)
    db.flush()

    admin = by_email("admin@wourkout.app")
    coach = by_email("coach@wourkout.app")
    athlete = by_email("athlete@wourkout.app")
    eric = by_email("ericvanzeumeren@gmail.com")
    leah = by_email("leah@example.com")
    alex = by_email("alex.rivera@wourkout.app")
    maya = by_email("maya.lin@wourkout.app")

    def pin(user, admin_flag=False, coach_flag=False, athlete_flag=False):
        if not user:
            return
        user.gym_id = gym.id
        if admin_flag:
            user.is_admin = True
            user.role = "admin"
        if coach_flag:
            user.is_coach = True
            if not user.is_admin:
                user.role = "coach"
        if athlete_flag:
            user.is_athlete = True
            if not user.is_admin and not user.is_coach:
                user.role = "athlete"

    pin(admin, admin_flag=True)
    pin(coach, coach_flag=True)
    pin(athlete, athlete_flag=True)
    pin(eric, athlete_flag=True)
    pin(leah, athlete_flag=True)
    pin(alex, coach_flag=True)
    pin(maya, athlete_flag=True)

    def ensure_team(name, leader):
        team = db.query(Group).filter(Group.name == name).first()
        if not team:
            team = Group(name=name, description="Team", color="#3b82f6", gym_id=gym.id, coach_id=leader.id if leader else None)
            db.add(team)
            db.flush()
        else:
            team.gym_id = gym.id
            if leader:
                team.coach_id = leader.id
        return team

    varsity = ensure_team("Varsity", coach) if coach else None
    speed = ensure_team("Speed", alex) if alex else None
    if varsity:
        for person in (athlete, eric, leah):
            if person:
                place_athlete_on_team(db, person, varsity, allow_move=True, commit=False)
    if speed and maya:
        place_athlete_on_team(db, maya, speed, allow_move=True, commit=False)

    if athlete and coach:
        already = db.query(WorkoutAssignment).filter(
            WorkoutAssignment.user_id == athlete.id,
            WorkoutAssignment.scheduled_date == "2026-10-15"
        ).first()
        if not already:
            exercise = db.query(Exercise).filter(Exercise.name == "Back Squat").first()
            if not exercise:
                exercise = Exercise(name="Back Squat", category="Strength")
                db.add(exercise)
                db.flush()
            workout = Workout(
                title="Lower Strength",
                program_name="Varsity",
                scheduled_date="2026-10-15",
                calendar_date="2026-10-15",
                week_number=1,
                day_of_week="Thursday",
                description="Assigned to Varsity Athlete",
                created_by_coach_id=coach.id,
                gym_id=gym.id,
            )
            db.add(workout)
            db.flush()
            db.add(WorkoutExercise(
                workout_id=workout.id,
                exercise_id=exercise.id,
                superset_group="A",
                order_index=0,
                prescription_text="3 X 5",
                prescribed_sets=3,
                target_reps="5",
                target_weight="60",
                rest_seconds=90,
            ))
            db.add(WorkoutAssignment(
                workout_id=workout.id,
                assigned_by_coach_id=coach.id,
                user_id=athlete.id,
                scheduled_date="2026-10-15",
                notes="Lower body",
            ))
    db.commit()


_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"


def _new_join_code(db: Session) -> str:
    for _ in range(8):
        code = "".join(secrets.choice(_CODE_ALPHABET) for _ in range(6))
        if not db.query(JoinCode).filter(JoinCode.code == code).first():
            return code
    return secrets.token_hex(4).upper()


def create_own_gym(db: Session, user: User, name: str) -> User:
    """A signed-in user with no gym founds one and becomes its admin."""
    name = (name or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="Enter a gym name.")
    if len(name) > 255:
        raise HTTPException(status_code=400, detail="That gym name is too long.")
    if user.gym_id:
        raise HTTPException(status_code=409, detail="You already belong to a gym.")
    gym = Gym(name=name)
    db.add(gym)
    db.flush()
    user.gym_id = gym.id
    user.is_admin = True
    user.is_coach = False
    user.is_athlete = False
    user.team_id = None
    user.role = "admin"
    user.title = "Gym Admin"
    db.commit()
    db.refresh(user)
    return user


def create_join_code(db: Session, user: User, kind: str, team_id: Optional[int] = None) -> JoinCode:
    access.require_gym(user)
    kind = (kind or "").lower().strip()
    if kind not in access.CODE_KINDS:
        raise HTTPException(status_code=400, detail="Join codes are only a gym code or a team code.")
    team = None
    if kind == "gym":
        access.require_admin(user)
    else:
        team = db.query(Group).filter(Group.id == team_id).first() if team_id else None
        access.assert_leads_team(db, user, team)
    row = JoinCode(
        code=_new_join_code(db),
        kind=kind,
        gym_id=user.gym_id,
        team_id=team.id if team else None,
        created_by_id=user.id,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def list_join_codes(db: Session, user: User) -> List[JoinCode]:
    access.require_gym(user)
    query = db.query(JoinCode).filter(JoinCode.gym_id == user.gym_id)
    if access.is_admin(user) and not access.is_coach(user):
        query = query.filter(JoinCode.kind == "gym")
    elif access.is_admin(user):
        team_ids = [t.id for t in access.leads_teams(db, user)]
        query = query.filter(or_(JoinCode.kind == "gym", JoinCode.team_id.in_(team_ids or [-1])))
    elif access.is_coach(user):
        team_ids = [t.id for t in access.leads_teams(db, user)]
        query = query.filter(JoinCode.kind == "team", JoinCode.team_id.in_(team_ids or [-1]))
    else:
        return []
    return query.order_by(JoinCode.id.asc()).all()


def delete_join_code(db: Session, user: User, code_id: int) -> bool:
    access.require_gym(user)
    row = db.query(JoinCode).filter(JoinCode.id == code_id, JoinCode.gym_id == user.gym_id).first()
    if not row:
        return False
    if row.kind == "gym":
        access.require_admin(user)
    else:
        team = db.query(Group).filter(Group.id == row.team_id).first() if row.team_id else None
        if not access.is_admin(user):
            access.assert_leads_team(db, user, team)
    db.delete(row)
    db.commit()
    return True


def clone_workout_for_gym(db: Session, workout: Workout, coach: User) -> Workout:
    """Create a gym-scoped copy of a template workout so it belongs to the coach's gym."""
    copy = Workout(
        title=workout.title,
        program_name=workout.program_name or "wourkout",
        scheduled_date=workout.scheduled_date,
        calendar_date=workout.calendar_date,
        week_number=workout.week_number or 1,
        day_of_week=workout.day_of_week or "",
        description=workout.description or "",
        created_by_coach_id=coach.id,
        gym_id=coach.gym_id,
    )
    db.add(copy)
    db.flush()
    for we in sorted(workout.exercises, key=lambda x: x.order_index or 0):
        db.add(WorkoutExercise(
            workout_id=copy.id,
            exercise_id=we.exercise_id,
            superset_group=we.superset_group or "A",
            order_index=we.order_index or 0,
            prescription_text=we.prescription_text or "",
            prescribed_sets=we.prescribed_sets or 3,
            target_reps=we.target_reps or "5",
            target_weight=we.target_weight or "0",
            rest_seconds=we.rest_seconds or 90,
            notes=we.notes or "",
        ))
    db.commit()
    db.refresh(copy)
    return copy


def gym_workout_summaries(db: Session, user: User) -> List[dict]:
    """Return saved workouts in this gym plus global library templates, with athlete assignment history."""
    gym_workouts = db.query(Workout).filter(
        or_(Workout.gym_id == user.gym_id, Workout.gym_id.is_(None))
    ).order_by(desc(Workout.id)).all()
    w_ids = [w.id for w in gym_workouts]
    assignments = db.query(WorkoutAssignment).filter(
        WorkoutAssignment.workout_id.in_(w_ids or [-1])
    ).all() if w_ids else []

    team_members_by_group = {}
    if user.gym_id:
        for u in db.query(User).filter(User.gym_id == user.gym_id, User.team_id.isnot(None)).all():
            team_members_by_group.setdefault(u.team_id, set()).add(u.id)

    assigned_by_workout = {}
    latest_date_by_workout = {}
    for a in assignments:
        s = assigned_by_workout.setdefault(a.workout_id, set())
        if a.user_id:
            s.add(a.user_id)
        if a.group_id and a.group_id in team_members_by_group:
            s.update(team_members_by_group[a.group_id])
        if a.scheduled_date:
            prev = latest_date_by_workout.get(a.workout_id, "")
            if a.scheduled_date > prev:
                latest_date_by_workout[a.workout_id] = a.scheduled_date

    results = []
    seen_templates = set()
    for w in gym_workouts:
        is_template = w.gym_id is None
        if is_template:
            sig = (w.title, w.program_name)
            if sig in seen_templates:
                continue
            seen_templates.add(sig)
        ex_names = [we.exercise.name for we in sorted(w.exercises, key=lambda x: x.order_index or 0) if we.exercise]
        summary = ", ".join(ex_names[:3])
        if len(ex_names) > 3:
            summary += f" (+{len(ex_names) - 3} more)"
        results.append({
            "id": w.id,
            "title": w.title,
            "program_name": w.program_name or "",
            "scheduled_date": latest_date_by_workout.get(w.id) or w.scheduled_date or w.calendar_date or "",
            "exercise_count": len(w.exercises),
            "exercise_summary": summary,
            "assigned_athlete_ids": sorted(assigned_by_workout.get(w.id, set())),
            "is_template": is_template,
        })
    return results


def redeem_join_code(db: Session, user: User, raw_code: str) -> User:
    code = (raw_code or "").strip().upper()
    row = db.query(JoinCode).filter(JoinCode.code == code).first()
    if not row or row.kind not in access.CODE_KINDS:
        raise HTTPException(status_code=404, detail="That code does not match a gym or a team.")
    if user.gym_id and user.gym_id != row.gym_id:
        raise HTTPException(status_code=403, detail="You already belong to another gym.")
    if row.kind == "gym":
        user.gym_id = row.gym_id
        user.is_coach = True
        user.is_admin = False
        if user.team_id:
            team = db.query(Group).filter(Group.id == user.team_id).first()
            if not team or team.gym_id != row.gym_id:
                user.team_id = None
                user.is_athlete = False
        else:
            user.is_athlete = False
        user.role = "coach"
    else:
        team = db.query(Group).filter(Group.id == row.team_id).first()
        if not team or team.gym_id != row.gym_id:
            raise HTTPException(status_code=404, detail="That team code is no longer valid.")
        if user.team_id and user.team_id != team.id:
            raise HTTPException(status_code=409, detail="An athlete belongs to exactly one team.")
        already_here = user.gym_id == row.gym_id and (user.is_coach or user.is_admin)
        user.gym_id = row.gym_id
        user.is_admin = False
        if not already_here:
            user.is_coach = False
            user.role = "athlete"
        else:
            user.is_athlete = True
            if user.role not in user.roles:
                user.role = "athlete"
        try:
            place_athlete_on_team(db, user, team, allow_move=False, commit=False)
        except ValueError as exc:
            raise HTTPException(status_code=409, detail=str(exc)) from exc
    db.commit()
    db.refresh(user)
    return user


def _temporary_password() -> str:
    return "Join-" + "".join(secrets.choice(_CODE_ALPHABET) for _ in range(8))


def add_gym_coach(db: Session, admin: User, name: str, email: str) -> tuple:
    access.require_admin(admin)
    email = email.strip().lower()
    existing = get_user_by_email_or_username(db, email)
    if existing:
        if existing.gym_id and existing.gym_id != admin.gym_id:
            raise HTTPException(status_code=403, detail="That person is already in another gym.")
        existing.gym_id = admin.gym_id
        existing.is_coach = True
        if not existing.is_admin and not existing.is_athlete:
            existing.role = "coach"
        elif existing.role not in ("admin", "coach", "athlete"):
            existing.role = "coach"
        db.commit()
        db.refresh(existing)
        return existing, None
    password = _temporary_password()
    username = email.split("@")[0]
    if db.query(User).filter(User.username == username).first():
        username = f"{username}_{secrets.token_hex(2)}"
    user = User(
        name=name.strip(),
        email=email,
        username=username,
        password_hash=hash_password(password),
        role="coach",
        title="Coach",
        gym_id=admin.gym_id,
        is_coach=True,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user, password


def remove_gym_coach(db: Session, admin: User, user_id: int) -> str:
    access.require_admin(admin)
    user = get_user(db, user_id)
    if not user or user.gym_id != admin.gym_id:
        raise HTTPException(status_code=404, detail="Coach not found in this gym.")
    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="You cannot remove yourself.")
    if "coach" not in user.roles and (user.role or "") != "coach":
        raise HTTPException(status_code=400, detail="That person is not a coach.")
    block = access.coach_removal_block(db, user)
    if block:
        raise HTTPException(status_code=409, detail=block)
    if user.is_admin or user.is_athlete or user.team_id:
        user.is_coach = False
        if user.role == "coach":
            user.role = "admin" if user.is_admin else "athlete"
        db.commit()
        return "demoted"
    db.delete(user)
    db.commit()
    return "deleted"


def add_gym_athlete(db: Session, actor: User, name: str, email: str, team_id: int) -> tuple:
    access.require_gym(actor)
    team = db.query(Group).filter(Group.id == team_id).first()
    if access.is_admin(actor) and team and team.gym_id == actor.gym_id:
        pass
    else:
        access.assert_leads_team(db, actor, team)
    email = email.strip().lower()
    existing = get_user_by_email_or_username(db, email)
    password = None
    if existing:
        if existing.gym_id and existing.gym_id != actor.gym_id:
            raise HTTPException(status_code=403, detail="That person is already in another gym.")
        user = existing
    else:
        password = _temporary_password()
        username = email.split("@")[0]
        if db.query(User).filter(User.username == username).first():
            username = f"{username}_{secrets.token_hex(2)}"
        user = User(
            name=name.strip(),
            email=email,
            username=username,
            password_hash=hash_password(password),
            role="athlete",
            title="Athlete",
            gym_id=actor.gym_id,
            is_athlete=True,
            is_active=True,
        )
        db.add(user)
        db.flush()
    if not user.gym_id:
        user.gym_id = actor.gym_id
    try:
        place_athlete_on_team(db, user, team, allow_move=access.is_admin(actor), commit=False)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    if not user.is_coach and not user.is_admin:
        user.role = "athlete"
    db.commit()
    db.refresh(user)
    return user, password


def bulk_add_gym_athletes(db: Session, actor: User, team_id: int, items: list) -> dict:
    access.require_gym(actor)
    team = db.query(Group).filter(Group.id == team_id).first()
    if access.is_admin(actor) and team and team.gym_id == actor.gym_id:
        pass
    else:
        access.assert_leads_team(db, actor, team)
    created = []
    for raw in items:
        def _field(key: str) -> str:
            value = raw.get(key) if isinstance(raw, dict) else getattr(raw, key, None)
            return str(value or "").strip()

        name = _field("name")
        email = _field("email").lower()
        if not name and not email:
            continue
        if not name:
            name = email.split("@")[0].replace(".", " ").title()
        if not email:
            slug = re.sub(r"[^a-z0-9]+", ".", name.lower()).strip(".") or "athlete"
            candidate = f"{slug}@gym{actor.gym_id}.wourkout.app"
            suffix = 1
            while get_user_by_email_or_username(db, candidate):
                suffix += 1
                candidate = f"{slug}.{suffix}@gym{actor.gym_id}.wourkout.app"
            email = candidate
        existing = get_user_by_email_or_username(db, email)
        password = None
        if existing:
            if existing.gym_id and existing.gym_id != actor.gym_id:
                continue
            user = existing
            if name:
                user.name = name
        else:
            password = _temporary_password()
            username = email.split("@")[0]
            if db.query(User).filter(User.username == username).first():
                username = f"{username}_{secrets.token_hex(2)}"
            user = User(
                name=name,
                email=email,
                username=username,
                password_hash=hash_password(password),
                role="athlete",
                title="Athlete",
                gym_id=actor.gym_id,
                is_athlete=True,
                is_active=True,
            )
            db.add(user)
            db.flush()
        user.gym_id = actor.gym_id
        place_athlete_on_team(db, user, team, allow_move=True, commit=False)
        if not user.is_coach and not user.is_admin:
            user.role = "athlete"
        db.commit()
        db.refresh(user)
        created.append({"user": user, "temporary_password": password})
    return {"added_count": len(created), "users": created}


def get_calendar_schedule(
    db: Session,
    viewer: Optional[User],
    user_id: Optional[int] = None,
    group_id: Optional[int] = None,
) -> List[dict]:
    """Return full scheduled workouts (with exercises) for a group or an athlete."""
    if group_id:
        team = get_group(db, group_id)
        if not team:
            raise HTTPException(status_code=404, detail="Group not found")
        if viewer is not None:
            if viewer.gym_id != team.gym_id:
                raise HTTPException(status_code=403, detail="That group is in another gym.")
        rows = db.query(WorkoutAssignment).filter(
            WorkoutAssignment.group_id == group_id
        ).order_by(WorkoutAssignment.scheduled_date.asc(), WorkoutAssignment.id.desc()).all()
        by_date = {}
        for a in rows:
            if not a.workout or not a.scheduled_date:
                continue
            if a.scheduled_date not in by_date:
                by_date[a.scheduled_date] = {
                    "assignment_id": a.id,
                    "scheduled_date": a.scheduled_date,
                    "user_id": None,
                    "group_id": group_id,
                    "is_group_assignment": True,
                    "workout": a.workout,
                }
        return list(by_date.values())

    target_id = user_id or (viewer.id if viewer else None)
    if not target_id:
        return []
    target_user = get_user(db, target_id)
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    if viewer is not None and not access.can_see_user(db, viewer, target_user):
        raise HTTPException(status_code=403, detail="You cannot view that athlete's schedule.")

    direct_rows = db.query(WorkoutAssignment).filter(
        WorkoutAssignment.user_id == target_user.id
    ).order_by(WorkoutAssignment.scheduled_date.asc(), WorkoutAssignment.id.desc()).all()

    moved_off = rescheduled_away_dates(db, target_user.id)
    group_ids = [g.id for g in target_user.groups]
    if target_user.team_id and target_user.team_id not in group_ids:
        group_ids.append(target_user.team_id)

    group_rows = []
    if group_ids:
        group_rows = db.query(WorkoutAssignment).filter(
            WorkoutAssignment.group_id.in_(group_ids)
        ).order_by(WorkoutAssignment.scheduled_date.asc(), WorkoutAssignment.id.desc()).all()

    by_date = {}
    for a in direct_rows:
        if not a.workout or not a.scheduled_date:
            continue
        if a.scheduled_date not in by_date:
            by_date[a.scheduled_date] = {
                "assignment_id": a.id,
                "scheduled_date": a.scheduled_date,
                "user_id": target_user.id,
                "group_id": None,
                "is_group_assignment": False,
                "workout": a.workout,
            }
    for a in group_rows:
        if not a.workout or not a.scheduled_date:
            continue
        if a.scheduled_date in moved_off or a.scheduled_date in by_date:
            continue
        by_date[a.scheduled_date] = {
            "assignment_id": a.id,
            "scheduled_date": a.scheduled_date,
            "user_id": target_user.id,
            "group_id": a.group_id,
            "is_group_assignment": True,
            "workout": a.workout,
        }
    return [by_date[d] for d in sorted(by_date.keys())]


def _log_counts_toward_tonnage(log: SetLog, session: WorkoutSession) -> bool:
    """A done set counts. So does a set log_or_update_set rewrote after the seed.

    The seed stamps logged_at with the session start. A later save bumps logged_at.
    """
    if log.completed:
        return True
    logged_at = log.logged_at
    started = session.start_time
    if logged_at is None or started is None:
        return False
    try:
        return logged_at > started
    except TypeError:
        return str(logged_at) > str(started)


ITEM_KINDS = ("document", "packet", "invoice", "report", "evaluation", "journal")


def _item_payload(row: GymItem) -> dict:
    try:
        body = json.loads(row.body) if row.body else {}
    except (TypeError, ValueError):
        body = row.body or ""
    return {"id": row.id, "kind": row.kind, "user_id": row.user_id, "body": body}


def _staff_user(user: User) -> bool:
    return access.is_admin(user) or access.is_coach(user)


def list_gym_items(db: Session, user: User, kind: Optional[str] = None) -> List[dict]:
    access.require_gym(user)
    if kind and kind not in ITEM_KINDS:
        raise HTTPException(status_code=400, detail="Unknown item.")
    query = db.query(GymItem).filter(GymItem.gym_id == user.gym_id)
    if kind:
        query = query.filter(GymItem.kind == kind)
    rows = query.order_by(GymItem.id.asc()).all()
    staff = _staff_user(user)
    visible = []
    for row in rows:
        if row.kind == "journal":
            if row.user_id != user.id:
                continue
        elif not staff:
            continue
        visible.append(_item_payload(row))
    return visible


def create_gym_item(db: Session, user: User, kind: str, body) -> dict:
    access.require_gym(user)
    if kind not in ITEM_KINDS:
        raise HTTPException(status_code=400, detail="Unknown item.")
    if kind != "journal" and not _staff_user(user):
        raise HTTPException(status_code=403, detail="Athlete accounts do not have coach tools.")
    row = GymItem(
        gym_id=user.gym_id,
        user_id=user.id if kind == "journal" else None,
        kind=kind,
        body=json.dumps(body if body is not None else {}),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _item_payload(row)


def _owned_item(db: Session, user: User, item_id: int) -> GymItem:
    access.require_gym(user)
    row = db.query(GymItem).filter(GymItem.id == item_id, GymItem.gym_id == user.gym_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Item not found.")
    if row.kind == "journal":
        if row.user_id != user.id:
            raise HTTPException(status_code=403, detail="That journal entry belongs to someone else.")
    elif not _staff_user(user):
        raise HTTPException(status_code=403, detail="Athlete accounts do not have coach tools.")
    return row


def update_gym_item(db: Session, user: User, item_id: int, body) -> dict:
    row = _owned_item(db, user, item_id)
    row.body = json.dumps(body if body is not None else {})
    db.commit()
    db.refresh(row)
    return _item_payload(row)


def delete_gym_item(db: Session, user: User, item_id: int) -> None:
    row = _owned_item(db, user, item_id)
    db.delete(row)
    db.commit()


def hidden_exercise_ids(db: Session, user: User) -> List[int]:
    if not user.gym_id:
        return []
    rows = db.query(GymHiddenExercise).filter(GymHiddenExercise.gym_id == user.gym_id).all()
    return sorted(row.exercise_id for row in rows)


def hide_exercise_for_gym(db: Session, user: User, exercise_id: int) -> dict:
    access.require_gym(user)
    if not _staff_user(user):
        raise HTTPException(status_code=403, detail="Athlete accounts do not have coach tools.")
    exercise = db.query(Exercise).filter(Exercise.id == exercise_id).first()
    if not exercise:
        raise HTTPException(status_code=404, detail="Exercise not found.")
    existing = db.query(GymHiddenExercise).filter(
        GymHiddenExercise.gym_id == user.gym_id,
        GymHiddenExercise.exercise_id == exercise_id,
    ).first()
    if not existing:
        db.add(GymHiddenExercise(gym_id=user.gym_id, exercise_id=exercise_id))
        db.commit()
    return {"exercise_id": exercise_id}


def get_gym_activity(db: Session, viewer: User) -> dict:
    """Return real sessions, athlete notes, leaderboard tonnage, and KPIs for the viewer's gym."""
    if not viewer.gym_id:
        return {"sessions": [], "leaderboard": [], "kpis": {"programmed_days": 0, "total_exercises": 0, "total_athletes": 0, "completed_sessions": 0}}

    if access.is_admin(viewer):
        athletes = [u for u in db.query(User).filter(User.gym_id == viewer.gym_id).all() if u.team_id or "athlete" in u.roles]
        team_ids = [t.id for t in db.query(Group).filter(Group.gym_id == viewer.gym_id).all()]
    elif access.is_coach(viewer):
        by_id = {u.id: u for u in access.athletes_for(db, viewer)}
        if access.is_athlete(viewer):
            by_id[viewer.id] = viewer
        athletes = list(by_id.values())
        team_ids = [t.id for t in access.leads_teams(db, viewer)]
    else:
        athletes = [viewer]
        team_ids = [viewer.team_id] if viewer.team_id else []

    athlete_ids = [a.id for a in athletes]
    user_map = {a.id: a for a in athletes}

    sessions = db.query(WorkoutSession).filter(
        WorkoutSession.user_id.in_(athlete_ids or [-1])
    ).order_by(desc(WorkoutSession.start_time), desc(WorkoutSession.id)).limit(50).all()

    session_items = []
    tonnage_by_user = {aid: 0.0 for aid in athlete_ids}
    sets_by_user = {aid: 0 for aid in athlete_ids}
    completed_sessions_by_user = {aid: 0 for aid in athlete_ids}

    for s in sessions:
        u = user_map.get(s.user_id) or get_user(db, s.user_id)
        w = s.workout
        s_tonnage = 0.0
        s_sets = 0
        s_reps = 0
        for log in s.set_logs:
            if _log_counts_toward_tonnage(log, s):
                s_sets += 1
                s_reps += int(log.reps or 0)
                s_tonnage += float(log.weight or 0.0) * float(log.reps or 0.0)
        if s.user_id in tonnage_by_user:
            tonnage_by_user[s.user_id] += s_tonnage
            sets_by_user[s.user_id] += s_sets
            if s.completed or s_sets > 0:
                completed_sessions_by_user[s.user_id] += 1
        session_items.append({
            "id": s.id,
            "workout_id": s.workout_id,
            "workout_title": w.title if w else "Workout",
            "user_id": s.user_id,
            "user_name": u.name if u else "Athlete",
            "date": s.start_time.strftime("%Y-%m-%d") if s.start_time else "",
            "completed": bool(s.completed),
            "athlete_note": s.athlete_note or "",
            "coach_note": s.notes or "",
            "completed_sets": s_sets,
            "total_reps": s_reps,
            "tonnage": round(s_tonnage, 1),
        })

    pr_counts = {}
    for pr in db.query(PersonalRecord).filter(PersonalRecord.user_id.in_(athlete_ids or [-1])).all():
        pr_counts[pr.user_id] = pr_counts.get(pr.user_id, 0) + 1

    leaderboard = []
    for a in athletes:
        leaderboard.append({
            "user_id": a.id,
            "name": a.name,
            "team_name": a.team_name or "No group",
            "tonnage": round(tonnage_by_user.get(a.id, 0.0), 1),
            "completed_sessions": completed_sessions_by_user.get(a.id, 0),
            "completed_sets": sets_by_user.get(a.id, 0),
            "pr_count": pr_counts.get(a.id, 0),
        })
    leaderboard.sort(key=lambda r: (r["tonnage"], r["completed_sets"], r["pr_count"]), reverse=True)

    assign_clauses = []
    if athlete_ids:
        assign_clauses.append(WorkoutAssignment.user_id.in_(athlete_ids))
    if team_ids:
        assign_clauses.append(WorkoutAssignment.group_id.in_(team_ids))
    assignments = db.query(WorkoutAssignment).filter(or_(*assign_clauses)).all() if assign_clauses else []
    total_ex = sum(len(a.workout.exercises) for a in assignments if a.workout)

    return {
        "sessions": session_items,
        "leaderboard": leaderboard,
        "kpis": {
            "programmed_days": len(assignments),
            "total_exercises": total_ex,
            "total_athletes": len(athletes),
            "completed_sessions": sum(completed_sessions_by_user.values()),
        },
    }


def remove_athlete(db: Session, actor: User, user_id: int) -> str:
    access.require_gym(actor)
    athlete = get_user(db, user_id)
    if not athlete or athlete.gym_id != actor.gym_id:
        raise HTTPException(status_code=404, detail="Athlete not found in this gym.")
    if access.is_admin(actor):
        pass
    else:
        access.assert_own_athlete(db, actor, athlete)
    block = access.coach_removal_block(db, athlete)
    if block:
        raise HTTPException(status_code=409, detail=block)
    if athlete.is_admin or athlete.is_coach:
        if athlete.team_id:
            team = db.query(Group).filter(Group.id == athlete.team_id).first()
            if team and athlete in team.members:
                team.members.remove(athlete)
        athlete.team_id = None
        athlete.is_athlete = False
        if athlete.role == "athlete":
            athlete.role = "admin" if athlete.is_admin else "coach"
        db.commit()
        return "demoted"
    db.delete(athlete)
    db.commit()
    return "deleted"


def move_team(db: Session, admin: User, team_id: int, coach_id: int) -> Group:
    access.require_admin(admin)
    team = get_group(db, team_id)
    coach = get_user(db, coach_id)
    if not team or team.gym_id != admin.gym_id:
        raise HTTPException(status_code=404, detail="Team not found in this gym.")
    if not coach or coach.gym_id != admin.gym_id:
        raise HTTPException(status_code=404, detail="Coach not found in this gym.")
    if "coach" not in coach.roles and "admin" not in coach.roles:
        raise HTTPException(status_code=400, detail="That person is not a coach in this gym.")
    if "coach" not in coach.roles:
        coach.is_coach = True
    team.coach_id = coach.id
    db.commit()
    db.refresh(team)
    team.member_count = len(team.members)
    return team


def latest_athlete_note(db: Session, user_id: int) -> str:
    row = db.query(WorkoutSession).filter(
        WorkoutSession.user_id == user_id,
        WorkoutSession.athlete_note.isnot(None),
        WorkoutSession.athlete_note != "",
    ).order_by(desc(WorkoutSession.id)).first()
    return row.athlete_note if row else ""

def person_payload(db: Session, user: User) -> dict:
    led = [t.name for t in access.leads_teams(db, user)]
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "roles": list(user.roles),
        "team_id": user.team_id,
        "team_name": user.team_name,
        "load_unit": "lbs" if str(getattr(user, "load_unit", "") or "").lower() == "lbs" else "kg",
        "led_teams": led,
        "latest_note": latest_athlete_note(db, user.id),
    }


def gym_context(db: Session, user: User) -> dict:
    access.require_gym(user)
    gym = db.query(Gym).filter(Gym.id == user.gym_id).first()
    if access.is_admin(user):
        people = db.query(User).filter(User.gym_id == user.gym_id).order_by(User.name.asc()).all()
        coaches = [p for p in people if "coach" in p.roles]
        athletes = [p for p in people if p.team_id or "athlete" in p.roles]
        teams = db.query(Group).filter(Group.gym_id == user.gym_id).order_by(Group.name.asc()).all()
    elif access.is_coach(user):
        coaches = [user]
        by_id = {p.id: p for p in access.athletes_for(db, user)}
        unassigned = db.query(User).filter(
            User.gym_id == user.gym_id,
            User.team_id.is_(None),
            or_(User.is_athlete.is_(True), User.role.in_(("athlete", "student"))),
        ).all()
        for person in unassigned:
            by_id[person.id] = person
        if access.is_athlete(user):
            by_id[user.id] = user
        athletes = sorted(by_id.values(), key=lambda person: (person.name or "").lower())
        teams = access.leads_teams(db, user)
    else:
        raise HTTPException(status_code=403, detail="Athlete accounts do not have coach tools.")
    codes = list_join_codes(db, user)
    return {
        "gym_id": gym.id,
        "gym_name": gym.name,
        "coaches": [person_payload(db, p) for p in coaches],
        "athletes": [person_payload(db, p) for p in athletes if p.id != user.id or "athlete" in p.roles],
        "teams": [{
            "id": t.id,
            "name": t.name,
            "coach_id": t.coach_id,
            "coach_name": t.coach.name if t.coach else "",
            "athlete_count": db.query(User).filter(User.team_id == t.id).count(),
        } for t in teams],
        "codes": [{
            "id": c.id,
            "code": c.code,
            "kind": c.kind,
            "gym_id": c.gym_id,
            "team_id": c.team_id,
            "team_name": c.team.name if c.team else None,
        } for c in codes],
        "workouts": gym_workout_summaries(db, user),
        "items": list_gym_items(db, user),
        "hidden_exercise_ids": hidden_exercise_ids(db, user),
    }


def assign_workout_to_athlete(db: Session, coach: User, athlete_id: int, title: str, scheduled_date: str, exercise_name: str, sets: int, reps: str, weight: str, notes: str):
    athlete = get_user(db, athlete_id)
    access.assert_own_athlete(db, coach, athlete)
    exercise = db.query(Exercise).filter(Exercise.name == exercise_name).first()
    if not exercise:
        exercise = Exercise(name=exercise_name, category="Strength")
        db.add(exercise)
        db.flush()
    workout = Workout(
        title=title.strip() or "Workout",
        program_name="wourkout",
        scheduled_date=scheduled_date,
        calendar_date=scheduled_date,
        week_number=1,
        day_of_week="",
        description=notes or "",
        created_by_coach_id=coach.id,
        gym_id=coach.gym_id,
    )
    db.add(workout)
    db.flush()
    db.add(WorkoutExercise(
        workout_id=workout.id,
        exercise_id=exercise.id,
        superset_group="A",
        order_index=0,
        prescription_text=f"{sets or 3} X {reps or '5'}",
        prescribed_sets=sets or 3,
        target_reps=reps or "5",
        target_weight=weight or "0",
        rest_seconds=90,
    ))
    assignment = WorkoutAssignment(
        workout_id=workout.id,
        assigned_by_coach_id=coach.id,
        user_id=athlete.id,
        scheduled_date=scheduled_date,
        notes=notes or "",
    )
    db.add(assignment)
    db.commit()
    db.refresh(assignment)
    assignment.workout_title = workout.title
    assignment.target_name = f"Client: {athlete.name}"
    return assignment


def schedule_for_athlete(db: Session, user: User) -> List[dict]:
    if "athlete" not in user.roles and (user.role or "") not in ("athlete", "student"):
        raise HTTPException(status_code=403, detail="Only an athlete can open their schedule.")
    rows = []
    direct = db.query(WorkoutAssignment).filter(WorkoutAssignment.user_id == user.id).all()
    team_rows = []
    if user.team_id:
        team_rows = db.query(WorkoutAssignment).filter(WorkoutAssignment.group_id == user.team_id).all()
    seen = set()
    for assignment in direct + team_rows:
        key = (assignment.workout_id, assignment.scheduled_date, assignment.user_id or 0, assignment.group_id or 0)
        if key in seen:
            continue
        seen.add(key)
        workout = assignment.workout
        session = db.query(WorkoutSession).filter(
            WorkoutSession.workout_id == assignment.workout_id,
            WorkoutSession.user_id == user.id
        ).order_by(desc(WorkoutSession.id)).first()
        coach = assignment.coach
        if not coach and assignment.group and assignment.group.coach:
            coach = assignment.group.coach
        rows.append({
            "assignment_id": assignment.id,
            "workout_id": assignment.workout_id,
            "title": workout.title if workout else "",
            "scheduled_date": assignment.scheduled_date,
            "coach_name": coach.name if coach else "",
            "athlete_note": (session.athlete_note or "") if session else "",
            "exercise_count": len(workout.exercises) if workout else 0,
        })
    rows.sort(key=lambda r: (r["scheduled_date"], r["assignment_id"]))
    return rows


def write_athlete_note(db: Session, user: User, workout_id: int, note: str) -> WorkoutSession:
    if "athlete" not in user.roles and (user.role or "") not in ("athlete", "student"):
        raise HTTPException(status_code=403, detail="Only an athlete can write a note on their workout.")
    clauses = [WorkoutAssignment.user_id == user.id]
    if user.team_id:
        clauses.append(WorkoutAssignment.group_id == user.team_id)
    allowed = db.query(WorkoutAssignment).filter(
        WorkoutAssignment.workout_id == workout_id,
        or_(*clauses)
    ).first()
    if not allowed:
        raise HTTPException(status_code=403, detail="That workout is not on your schedule.")
    session = db.query(WorkoutSession).filter(
        WorkoutSession.workout_id == workout_id,
        WorkoutSession.user_id == user.id
    ).order_by(desc(WorkoutSession.id)).first()
    if not session:
        session = WorkoutSession(workout_id=workout_id, user_id=user.id, athlete_note=note.strip())
        db.add(session)
    else:
        session.athlete_note = note.strip()
    db.commit()
    db.refresh(session)
    return session


def athlete_can_read_workout(db: Session, user: User, workout_id: int) -> bool:
    if user.gym_id:
        workout = db.query(Workout).filter(Workout.id == workout_id).first()
        if workout and workout.gym_id and workout.gym_id != user.gym_id:
            return False
    clauses = [WorkoutAssignment.user_id == user.id]
    if user.team_id:
        clauses.append(WorkoutAssignment.group_id == user.team_id)
    hit = db.query(WorkoutAssignment).filter(
        WorkoutAssignment.workout_id == workout_id,
        or_(*clauses)
    ).first()
    return hit is not None


def scope_assignments(db: Session, viewer: Optional[User], rows: List[WorkoutAssignment]) -> List[WorkoutAssignment]:
    if viewer is None:
        return rows
    if not viewer.gym_id:
        return [row for row in rows if row.user_id == viewer.id]
    own_athlete = "athlete" in viewer.roles
    staff = "coach" in viewer.roles or "admin" in viewer.roles
    if own_athlete and not staff:
        return [
            row for row in rows
            if row.user_id == viewer.id or (viewer.team_id and row.group_id == viewer.team_id)
        ]
    ids = set(access.athlete_ids_for(db, viewer))
    team_ids = {t.id for t in access.leads_teams(db, viewer)}
    if own_athlete:
        ids.add(viewer.id)
    scoped = []
    for row in rows:
        if row.user_id and row.user_id in ids:
            scoped.append(row)
        elif row.group_id and row.group_id in team_ids:
            scoped.append(row)
        elif own_athlete and viewer.team_id and row.group_id == viewer.team_id:
            scoped.append(row)
    return scoped


