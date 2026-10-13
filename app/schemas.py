from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict

# Exercise Schemas
class ExerciseBase(BaseModel):
    name: str
    category: Optional[str] = "Strength"
    default_notes: Optional[str] = ""
    video_url: Optional[str] = ""

class ExerciseCreate(ExerciseBase):
    pass

class ExerciseUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    default_notes: Optional[str] = None
    video_url: Optional[str] = None

class ExerciseResponse(ExerciseBase):
    id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# Workout Exercise Schemas
class WorkoutExerciseBase(BaseModel):
    exercise_id: int
    superset_group: Optional[str] = "A"
    order_index: Optional[int] = 0
    prescription_text: Optional[str] = ""
    prescribed_sets: Optional[int] = 3
    target_reps: Optional[str] = "10"
    target_weight: Optional[str] = "0"
    rest_seconds: Optional[int] = 0
    notes: Optional[str] = ""
    is_ea: Optional[bool] = False

class WorkoutExerciseCreate(WorkoutExerciseBase):
    pass

class WorkoutExerciseResponse(WorkoutExerciseBase):
    id: int
    workout_id: int
    exercise: ExerciseResponse
    model_config = ConfigDict(from_attributes=True)

# Set Log Schemas
class SetLogBase(BaseModel):
    workout_exercise_id: int
    set_number: int
    weight: float = 0.0
    reps: float = 0.0
    completed: bool = False

class SetLogCreate(SetLogBase):
    session_id: int

class SetLogUpdate(BaseModel):
    weight: Optional[float] = None
    reps: Optional[float] = None
    completed: Optional[bool] = None

class SetLogResponse(SetLogBase):
    id: int
    session_id: int
    logged_at: datetime
    model_config = ConfigDict(from_attributes=True)

# Workout Schemas
class WorkoutBase(BaseModel):
    title: str
    program_name: Optional[str] = "General"
    scheduled_date: Optional[str] = ""
    calendar_date: Optional[str] = ""
    week_number: Optional[int] = 1
    day_of_week: Optional[str] = "Monday"
    description: Optional[str] = ""
    video_url: Optional[str] = ""

class WorkoutCreate(WorkoutBase):
    exercises: Optional[List[WorkoutExerciseCreate]] = []

class WorkoutUpdate(BaseModel):
    title: Optional[str] = None
    program_name: Optional[str] = None
    scheduled_date: Optional[str] = None
    calendar_date: Optional[str] = None
    week_number: Optional[int] = None
    day_of_week: Optional[str] = None
    description: Optional[str] = None
    video_url: Optional[str] = None
    exercises: Optional[List[WorkoutExerciseCreate]] = None

class WorkoutResponse(WorkoutBase):
    id: int
    created_at: datetime
    exercise_count: Optional[int] = 0
    is_completed: Optional[bool] = False
    model_config = ConfigDict(from_attributes=True)

class WorkoutDetailResponse(WorkoutBase):
    id: int
    created_at: datetime
    exercises: List[WorkoutExerciseResponse] = []
    model_config = ConfigDict(from_attributes=True)

# Copy Week & Calendar Schemas
class CopyWeekRequest(BaseModel):
    source_program: str
    source_week_number: int
    target_program: Optional[str] = None
    target_start_date: str  # YYYY-MM-DD
    target_week_number: Optional[int] = 2
    repeat_weeks: Optional[int] = 1
    weight_progression_lbs: Optional[float] = 0.0

class RescheduleWorkoutRequest(BaseModel):
    calendar_date: str  # YYYY-MM-DD

class CalendarWorkoutItem(BaseModel):
    id: int
    title: str
    program_name: str
    exercise_count: int
    is_completed: bool

class CalendarDayResponse(BaseModel):
    date: str  # YYYY-MM-DD
    workouts: List[CalendarWorkoutItem] = []

class AddWorkoutToDayRequest(BaseModel):
    workout_id: int
    program_name: str
    week_number: int
    day_of_week: str
    calendar_date: Optional[str] = None
    duplicate_as_new: Optional[bool] = True

class SaveProgramTemplateRequest(BaseModel):
    source_program: str
    source_week_number: int
    new_program_name: str

# Session Schemas
class WorkoutSessionCreate(BaseModel):
    workout_id: int
    notes: Optional[str] = ""

class WorkoutSessionResponse(BaseModel):
    id: int
    workout_id: int
    start_time: datetime
    end_time: Optional[datetime] = None
    completed: bool
    notes: str
    model_config = ConfigDict(from_attributes=True)

class WorkoutSessionDetailResponse(WorkoutSessionResponse):
    workout: WorkoutDetailResponse
    set_logs: List[SetLogResponse] = []
    model_config = ConfigDict(from_attributes=True)

# Personal Record Schemas
class PersonalRecordCreate(BaseModel):
    exercise_id: int
    weight: float
    reps: Optional[int] = 1
    notes: Optional[str] = ""

class PersonalRecordResponse(BaseModel):
    id: int
    exercise_id: int
    weight: float
    reps: int
    notes: str
    date: datetime
    exercise: ExerciseResponse
    model_config = ConfigDict(from_attributes=True)

# User & Team/Group Schemas
class UserBase(BaseModel):
    name: str
    email: str
    role: str = "student"  # 'coach' or 'student'
    title: Optional[str] = "Athlete"
    avatar_color: Optional[str] = "#0ea5e9"

class UserCreate(UserBase):
    pass

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    title: Optional[str] = None
    avatar_color: Optional[str] = None

class UserBrief(BaseModel):
    id: int
    name: str
    email: str
    role: str
    title: str
    avatar_color: str
    model_config = ConfigDict(from_attributes=True)

class GroupBase(BaseModel):
    name: str
    description: Optional[str] = ""
    color: Optional[str] = "#3b82f6"
    coach_id: Optional[int] = None

class GroupCreate(GroupBase):
    pass

class GroupUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None
    coach_id: Optional[int] = None

class GroupResponse(GroupBase):
    id: int
    created_at: datetime
    member_count: int = 0
    members: List[UserBrief] = []
    model_config = ConfigDict(from_attributes=True)

class UserResponse(UserBase):
    id: int
    created_at: datetime
    groups: List[GroupBase] = []
    model_config = ConfigDict(from_attributes=True)

class WorkoutAssignmentCreate(BaseModel):
    workout_id: int
    assigned_by_coach_id: Optional[int] = None
    group_id: Optional[int] = None
    user_id: Optional[int] = None
    scheduled_date: str  # YYYY-MM-DD
    notes: Optional[str] = ""

class WorkoutAssignmentResponse(BaseModel):
    id: int
    workout_id: int
    assigned_by_coach_id: Optional[int] = None
    group_id: Optional[int] = None
    user_id: Optional[int] = None
    scheduled_date: str
    notes: str
    created_at: datetime
    workout_title: Optional[str] = ""
    target_name: Optional[str] = ""  # group name or student name
    model_config = ConfigDict(from_attributes=True)

class CoachComplianceAthlete(BaseModel):
    user_id: int
    user_name: str
    user_email: str
    avatar_color: str
    group_names: List[str] = []
    assigned_workout_id: Optional[int] = None
    assigned_workout_title: Optional[str] = None
    status: str  # 'completed', 'in_progress', 'not_started'
    completed_sets: int = 0
    total_prescribed_sets: int = 0
    completed_at: Optional[datetime] = None
    session_id: Optional[int] = None

class CoachComplianceReport(BaseModel):
    date: str
    total_athletes: int
    completed_count: int
    in_progress_count: int
    not_started_count: int
    compliance_percentage: float
    athletes: List[CoachComplianceAthlete]
