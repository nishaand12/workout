import os
from contextlib import asynccontextmanager
from typing import List, Optional
from pydantic import BaseModel
from fastapi import FastAPI, Depends, HTTPException, Query, status
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from app.config import settings
from app.database import Base, engine, get_db, SessionLocal
from app.models import Workout, Exercise
from app.schemas import (
    ExerciseResponse, ExerciseCreate, ExerciseUpdate,
    WorkoutResponse, WorkoutDetailResponse, WorkoutCreate, WorkoutUpdate,
    WorkoutSessionResponse, WorkoutSessionDetailResponse,
    SetLogResponse, SetLogBase,
    PersonalRecordResponse, PersonalRecordCreate,
    CopyWeekRequest, RescheduleWorkoutRequest, CalendarDayResponse,
    AddWorkoutToDayRequest, SaveProgramTemplateRequest,
    UserResponse, UserCreate, UserUpdate,
    GroupResponse, GroupCreate, GroupUpdate,
    WorkoutAssignmentResponse, WorkoutAssignmentCreate,
    CoachComplianceReport
)
from app import crud

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create tables and seed data
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        crud.seed_database_if_empty(db)
    finally:
        db.close()
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="TeamBuildr Prototype Replica for Tailscale and Google Cloud Run",
    version="1.0.0",
    lifespan=lifespan
)

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

# Workout Endpoints
@app.get("/api/workouts", response_model=List[WorkoutResponse])
def list_workouts(program: Optional[str] = Query(None), db: Session = Depends(get_db)):
    return crud.get_workouts(db, program=program)

@app.get("/api/workouts/{workout_id}", response_model=WorkoutDetailResponse)
def get_workout(workout_id: int, db: Session = Depends(get_db)):
    w = crud.get_workout(db, workout_id)
    if not w:
        raise HTTPException(status_code=404, detail="Workout not found")
    return w

@app.post("/api/workouts", response_model=WorkoutDetailResponse, status_code=status.HTTP_201_CREATED)
def create_workout(workout_in: WorkoutCreate, db: Session = Depends(get_db)):
    return crud.create_workout(db, workout_in)

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
def get_active_session(workout_id: int, user_id: Optional[int] = Query(None), db: Session = Depends(get_db)):
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
def list_records(db: Session = Depends(get_db)):
    return crud.get_personal_records(db)

@app.post("/api/records", response_model=PersonalRecordResponse, status_code=status.HTTP_201_CREATED)
def create_record(record_in: PersonalRecordCreate, db: Session = Depends(get_db)):
    return crud.add_personal_record(db, record_in)

# -------------------------------------------------------------
# User & Authentication Endpoints
# -------------------------------------------------------------
@app.get("/api/users", response_model=List[UserResponse])
def list_users(role: Optional[str] = Query(None), db: Session = Depends(get_db)):
    return crud.get_users(db, role=role)

@app.get("/api/users/{user_id}", response_model=UserResponse)
def get_user(user_id: int, db: Session = Depends(get_db)):
    user = crud.get_user(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
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
def delete_user(user_id: int, db: Session = Depends(get_db)):
    success = crud.delete_user(db, user_id)
    if not success:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User deleted"}

# -------------------------------------------------------------
# Training Groups / Rosters Endpoints
# -------------------------------------------------------------
@app.get("/api/groups", response_model=List[GroupResponse])
def list_groups(db: Session = Depends(get_db)):
    return crud.get_groups(db)

@app.get("/api/groups/{group_id}", response_model=GroupResponse)
def get_group(group_id: int, db: Session = Depends(get_db)):
    group = crud.get_group(db, group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    return group

@app.post("/api/groups", response_model=GroupResponse, status_code=status.HTTP_201_CREATED)
def create_group(group_in: GroupCreate, db: Session = Depends(get_db)):
    return crud.create_group(db, group_in)

@app.put("/api/groups/{group_id}", response_model=GroupResponse)
def update_group(group_id: int, group_in: GroupUpdate, db: Session = Depends(get_db)):
    group = crud.update_group(db, group_id, group_in)
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    return group

@app.delete("/api/groups/{group_id}")
def delete_group(group_id: int, db: Session = Depends(get_db)):
    success = crud.delete_group(db, group_id)
    if not success:
        raise HTTPException(status_code=404, detail="Group not found")
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
def add_group_member(group_id: int, user_id: int, db: Session = Depends(get_db)):
    success = crud.add_user_to_group(db, group_id, user_id)
    if not success:
        raise HTTPException(status_code=400, detail="Could not add member to group")
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
@app.get("/api/assignments", response_model=List[WorkoutAssignmentResponse])
def list_assignments(
    date: Optional[str] = Query(None),
    user_id: Optional[int] = Query(None),
    group_id: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    return crud.get_assignments(db, date=date, user_id=user_id, group_id=group_id)

@app.post("/api/assignments", response_model=WorkoutAssignmentResponse, status_code=status.HTTP_201_CREATED)
def create_assignment(assign_in: WorkoutAssignmentCreate, db: Session = Depends(get_db)):
    return crud.create_assignment(db, assign_in)

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
def get_coach_compliance(date: str = Query(..., description="YYYY-MM-DD"), db: Session = Depends(get_db)):
    return crud.get_coach_compliance_report(db, date)

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


# Mount static directory for frontend assets
static_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")
if os.path.exists(static_path):
    app.mount("/static", StaticFiles(directory=static_path), name="static")

@app.api_route("/", methods=["GET", "HEAD"])
def serve_index():
    index_file = os.path.join(static_path, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return {"message": "TeamBuildr Prototype Replica Backend Running"}
