from datetime import datetime
from typing import Any, List, Optional
from pydantic import BaseModel, ConfigDict

# Exercise Schemas
class ExerciseBase(BaseModel):
    name: str
    category: Optional[str] = "Strength"
    default_notes: Optional[str] = ""
    video_url: Optional[str] = ""
    default_sets: Optional[int] = 3
    default_reps: Optional[str] = "10"
    default_load: Optional[str] = ""
    default_rest: Optional[str] = ""
    default_tempo: Optional[str] = ""
    default_velocity: Optional[str] = ""
    default_power: Optional[str] = ""
    default_pct: Optional[str] = ""
    default_rest_rep: Optional[str] = ""
    default_distance: Optional[str] = ""
    intensity_kind: Optional[str] = ""
    intensity_value: Optional[str] = ""
    default_stations: Optional[str] = ""

class ExerciseCreate(ExerciseBase):
    # Alternate intensity keys. An exercise still stores only one kind.
    rpe: Optional[str] = None
    rir: Optional[str] = None
    pct_1rm: Optional[str] = None

class ExerciseUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    default_notes: Optional[str] = None
    video_url: Optional[str] = None
    default_sets: Optional[int] = None
    default_reps: Optional[str] = None
    default_load: Optional[str] = None
    default_rest: Optional[str] = None
    default_tempo: Optional[str] = None
    default_velocity: Optional[str] = None
    default_power: Optional[str] = None
    default_pct: Optional[str] = None
    default_rest_rep: Optional[str] = None
    default_distance: Optional[str] = None
    intensity_kind: Optional[str] = None
    intensity_value: Optional[str] = None
    default_stations: Optional[str] = None
    rpe: Optional[str] = None
    rir: Optional[str] = None
    pct_1rm: Optional[str] = None

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
    rest_seconds: int = 0
    details: str = ""
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
    user_id: Optional[int] = None
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
# User & Team/Group Schemas
class UserBase(BaseModel):
    name: str
    email: str
    username: Optional[str] = None
    role: str = "athlete"  # 'coach', 'athlete', 'admin' (or legacy 'student')
    title: Optional[str] = "Athlete"
    avatar_color: Optional[str] = "#0ea5e9"
    status_badge: Optional[str] = "Active"
    position_tag: Optional[str] = "Athlete"
    load_unit: str = "kg"  # 'lbs' or 'kg'. Lives on the athlete, not on a workout.
    distance_unit: str = "m"  # metres, km, yards, or miles. Lives on the athlete, not on an exercise.

class UserCreate(UserBase):
    password: Optional[str] = None

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None
    role: Optional[str] = None
    title: Optional[str] = None
    avatar_color: Optional[str] = None
    status_badge: Optional[str] = None
    position_tag: Optional[str] = None
    load_unit: Optional[str] = None
    distance_unit: Optional[str] = None
    is_active: Optional[bool] = None

class UserBrief(BaseModel):
    id: int
    name: str
    email: str
    username: Optional[str] = None
    role: str
    title: str
    avatar_color: str
    status_badge: Optional[str] = "Active"
    position_tag: Optional[str] = "Athlete"
    model_config = ConfigDict(from_attributes=True)

class PersonalRecordCreate(BaseModel):
    exercise_id: int
    user_id: Optional[int] = None
    weight: float
    reps: Optional[int] = 1
    notes: Optional[str] = ""

class PersonalRecordUpdate(BaseModel):
    exercise_id: Optional[int] = None
    user_id: Optional[int] = None
    weight: Optional[float] = None
    reps: Optional[int] = None
    notes: Optional[str] = None

class PersonalRecordResponse(BaseModel):
    id: int
    exercise_id: int
    user_id: Optional[int] = None
    user: Optional[UserBrief] = None
    weight: float
    reps: int
    notes: str
    date: datetime
    exercise: ExerciseResponse
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

class GroupBrief(GroupBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class GroupResponse(GroupBase):
    id: int
    created_at: datetime
    member_count: int = 0
    members: List[UserBrief] = []
    model_config = ConfigDict(from_attributes=True)

class UserResponse(UserBase):
    id: int
    supabase_uid: Optional[str] = None
    is_active: bool = True
    created_at: datetime
    groups: List[GroupBrief] = []
    is_admin: bool = False
    is_coach: bool = False
    is_athlete: bool = False
    gym_id: Optional[int] = None
    gym_name: Optional[str] = None
    team_id: Optional[int] = None
    team_name: Optional[str] = None
    roles: List[str] = []
    needs_onboarding: bool = False
    model_config = ConfigDict(from_attributes=True)

# Authentication Schemas
class UserRegister(BaseModel):
    name: str
    email: str
    password: Optional[str] = ""
    username: Optional[str] = None
    role: Optional[str] = "athlete"  # 'coach', 'athlete', 'admin'
    title: Optional[str] = None
    position_tag: Optional[str] = None
    supabase_uid: Optional[str] = None

class UserLogin(BaseModel):
    email_or_username: Optional[str] = None
    identity: Optional[str] = None
    username: Optional[str] = None
    email: Optional[str] = None
    password: str

    @property
    def identifier(self) -> str:
        return (self.email_or_username or self.identity or self.username or self.email or "").strip()

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class PasswordResetRequest(BaseModel):
    email: str

class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str

class AuthConfigResponse(BaseModel):
    supabase_url: str
    supabase_anon_key: str
    allow_google_oauth: bool
    allow_email_password: bool = True

class SupabaseAuthSync(BaseModel):
    access_token: str
    supabase_uid: Optional[str] = None
    email: Optional[str] = None
    name: Optional[str] = None
    role: Optional[str] = "athlete"

class WorkoutAssignmentCreate(BaseModel):
    workout_id: int
    assigned_by_coach_id: Optional[int] = None
    group_id: Optional[int] = None
    user_id: Optional[int] = None
    scheduled_date: str  # YYYY-MM-DD
    notes: Optional[str] = ""

class ProgramAssignmentCreate(BaseModel):
    program_name: str
    week_number: Optional[int] = None
    assigned_by_coach_id: Optional[int] = None
    group_id: Optional[int] = None
    user_id: Optional[int] = None
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
    status_badge: Optional[str] = "Active"
    position_tag: Optional[str] = "Athlete"
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

class ViewSwitch(BaseModel):
    role: str

class GymCreate(BaseModel):
    name: str

class JoinCodeCreate(BaseModel):
    kind: str  # 'gym' or 'team'
    team_id: Optional[int] = None

class JoinCodeRedeem(BaseModel):
    code: str

class JoinCodeResponse(BaseModel):
    id: int
    code: str
    kind: str
    gym_id: int
    team_id: Optional[int] = None
    team_name: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class GymPerson(BaseModel):
    id: int
    name: str
    email: str
    roles: List[str] = []
    team_id: Optional[int] = None
    team_name: Optional[str] = None
    led_teams: List[str] = []
    latest_note: str = ""
    load_unit: str = "kg"
    distance_unit: str = "m"

class GymTeam(BaseModel):
    id: int
    name: str
    coach_id: Optional[int] = None
    coach_name: str = ""
    athlete_count: int = 0

class GymWorkoutSummary(BaseModel):
    id: int
    title: str
    program_name: str = ""
    scheduled_date: str = ""
    exercise_count: int = 0
    exercise_summary: str = ""
    assigned_athlete_ids: List[int] = []
    is_template: bool = False

class GymSavedItem(BaseModel):
    id: int
    kind: str
    user_id: Optional[int] = None
    body: Any = None

class GymItemCreate(BaseModel):
    kind: str
    body: Any = None

class GymItemUpdate(BaseModel):
    body: Any = None

class HideExerciseRequest(BaseModel):
    exercise_id: int

class GymContext(BaseModel):
    gym_id: int
    gym_name: str
    coaches: List[GymPerson] = []
    athletes: List[GymPerson] = []
    teams: List[GymTeam] = []
    codes: List[JoinCodeResponse] = []
    workouts: List[GymWorkoutSummary] = []
    items: List[GymSavedItem] = []
    hidden_exercise_ids: List[int] = []

class GymMemberCreate(BaseModel):
    name: str
    email: str
    team_id: Optional[int] = None

class GymMemberCreated(BaseModel):
    user: UserResponse
    temporary_password: Optional[str] = None

class BulkAthleteItem(BaseModel):
    name: str
    email: Optional[str] = ""

class BulkAthleteUploadRequest(BaseModel):
    team_id: int
    athletes: List[BulkAthleteItem] = []

class BulkAthleteUploadResponse(BaseModel):
    added_count: int
    users: List[GymMemberCreated] = []

class CalendarScheduleEntry(BaseModel):
    assignment_id: int
    scheduled_date: str
    user_id: Optional[int] = None
    group_id: Optional[int] = None
    is_group_assignment: bool = False
    workout: WorkoutDetailResponse

class MoveTeamRequest(BaseModel):
    coach_id: int

class CoachAssignRequest(BaseModel):
    athlete_id: int
    title: str
    scheduled_date: str
    exercise_name: Optional[str] = "Back Squat"
    sets: Optional[int] = 3
    reps: Optional[str] = "5"
    weight: Optional[str] = "60"
    notes: Optional[str] = ""

class AthleteNoteRequest(BaseModel):
    workout_id: int
    note: str

class ScheduleItem(BaseModel):
    assignment_id: int
    workout_id: int
    title: str
    scheduled_date: str
    coach_name: str = ""
    athlete_note: str = ""
    exercise_count: int = 0
