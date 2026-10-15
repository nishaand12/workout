import json
import os
import re
from datetime import datetime, timedelta
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc, asc

from app.models import Exercise, Workout, WorkoutExercise, WorkoutSession, SetLog, PersonalRecord, User, Group, WorkoutAssignment
from app.schemas import (
    ExerciseCreate, ExerciseUpdate, WorkoutCreate, WorkoutUpdate, PersonalRecordCreate,
    CopyWeekRequest, AddWorkoutToDayRequest, SaveProgramTemplateRequest,
    UserCreate, UserUpdate, GroupCreate, GroupUpdate, WorkoutAssignmentCreate
)
from app.config import settings

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
    exercise = Exercise(
        name=exercise_in.name,
        category=exercise_in.category or "Strength",
        default_notes=exercise_in.default_notes or "",
        video_url=exercise_in.video_url or ""
    )
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
        session = WorkoutSession(
            workout_id=workout_id,
            user_id=user_id,
            start_time=datetime.utcnow(),
            completed=False
        )
        db.add(session)
        db.flush()

        # Initialize default set logs from workout exercises
        for we in workout.exercises:
            reps_val = 10.0
            try:
                digits = "".join([c for c in we.target_reps if c.isdigit() or c == '.'])
                if digits:
                    reps_val = float(digits)
            except Exception:
                reps_val = 10.0

            wt_val = 0.0
            try:
                wt_val = float(we.target_weight)
            except Exception:
                wt_val = 0.0

            for s_num in range(1, we.prescribed_sets + 1):
                set_log = SetLog(
                    session_id=session.id,
                    workout_exercise_id=we.id,
                    set_number=s_num,
                    weight=wt_val,
                    reps=reps_val,
                    completed=False
                )
                db.add(set_log)
        db.commit()
        db.refresh(session)

    return session

def log_or_update_set(db: Session, session_id: int, workout_exercise_id: int, set_number: int, weight: float, reps: float, completed: bool):
    set_log = db.query(SetLog).filter(
        SetLog.session_id == session_id,
        SetLog.workout_exercise_id == workout_exercise_id,
        SetLog.set_number == set_number
    ).first()

    if set_log:
        set_log.weight = weight
        set_log.reps = reps
        set_log.completed = completed
        set_log.logged_at = datetime.utcnow()
    else:
        set_log = SetLog(
            session_id=session_id,
            workout_exercise_id=workout_exercise_id,
            set_number=set_number,
            weight=weight,
            reps=reps,
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
def get_personal_records(db: Session):
    return db.query(PersonalRecord).order_by(desc(PersonalRecord.weight)).all()

def add_personal_record(db: Session, record_in: PersonalRecordCreate):
    pr = PersonalRecord(
        exercise_id=record_in.exercise_id,
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
def get_users(db: Session, role: Optional[str] = None):
    query = db.query(User)
    if role:
        query = query.filter(User.role == role)
    return query.order_by(User.name.asc()).all()

def get_user(db: Session, user_id: int):
    return db.query(User).filter(User.id == user_id).first()

def create_user(db: Session, user_in: UserCreate):
    user = User(
        name=user_in.name,
        email=user_in.email,
        role=user_in.role or "student",
        title=user_in.title or ("Head Coach" if user_in.role == "coach" else "Athlete"),
        avatar_color=user_in.avatar_color or "#0ea5e9",
        status_badge=user_in.status_badge or "Active",
        position_tag=user_in.position_tag or "Athlete"
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

def update_user(db: Session, user_id: int, user_in: UserUpdate):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return None
    for field, val in user_in.model_dump(exclude_unset=True).items():
        setattr(user, field, val)
    db.commit()
    db.refresh(user)
    return user

def delete_user(db: Session, user_id: int):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return False
    db.delete(user)
    db.commit()
    return True

# Groups & Rosters
def get_groups(db: Session):
    groups = db.query(Group).order_by(Group.name.asc()).all()
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
        return False
    db.delete(group)
    db.commit()
    return True

def add_user_to_group(db: Session, group_id: int, user_id: int):
    group = db.query(Group).filter(Group.id == group_id).first()
    user = db.query(User).filter(User.id == user_id).first()
    if not group or not user:
        return False
    if user not in group.members:
        group.members.append(user)
        db.commit()
    return True

def remove_user_from_group(db: Session, group_id: int, user_id: int):
    group = db.query(Group).filter(Group.id == group_id).first()
    user = db.query(User).filter(User.id == user_id).first()
    if not group or not user:
        return False
    if user in group.members:
        group.members.remove(user)
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
def get_coach_compliance_report(db: Session, date_str: str):
    students = db.query(User).filter(User.role == "student").order_by(User.name.asc()).all()
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
    if assign:
        assign.scheduled_date = next_date
        db.commit()
        return next_date

    # Check for group assignment
    u_group_ids = [g.id for g in user.groups]
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
    for u in users:
        if u not in group.members:
            group.members.append(u)
    db.commit()
    return True


