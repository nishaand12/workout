from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, Text, DateTime, ForeignKey, Table
from sqlalchemy.orm import relationship
from app.database import Base

# Junction table for User <-> Group. An athlete is also pinned to exactly one team via users.team_id.
user_groups = Table(
    "user_groups",
    Base.metadata,
    Column("user_id", Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    Column("group_id", Integer, ForeignKey("groups.id", ondelete="CASCADE"), primary_key=True)
)

class Gym(Base):
    """Tenant. Roster, teams, workouts, and notes never leave their gym."""
    __tablename__ = "gyms"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    users = relationship("User", back_populates="gym")
    teams = relationship("Group", back_populates="gym")

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(100), unique=True, index=True, nullable=True)
    password_hash = Column(String(255), nullable=True)  # Nullable for OAuth-only users
    supabase_uid = Column(String(128), unique=True, index=True, nullable=True)
    # Active view. A login may also hold other roles via the flags below.
    role = Column(String(50), default="athlete", index=True)  # 'coach', 'athlete', 'admin' (or legacy 'student')
    is_admin = Column(Boolean, default=False, nullable=False)
    is_coach = Column(Boolean, default=False, nullable=False)
    is_athlete = Column(Boolean, default=False, nullable=False)
    gym_id = Column(Integer, ForeignKey("gyms.id", ondelete="SET NULL"), nullable=True, index=True)
    # Exactly one team when this login is an athlete. Not a DB FK: users and groups reference each other.
    team_id = Column(Integer, nullable=True, index=True)
    title = Column(String(100), default="Athlete")  # e.g. 'Head Strength Coach', 'Varsity Athlete'
    avatar_color = Column(String(20), default="#0ea5e9")
    status_badge = Column(String(50), default="Active")  # 'Active', 'Modified', 'Rehab'
    position_tag = Column(String(100), default="Athlete")  # 'Varsity RB', 'Sprinter', etc.
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    gym = relationship("Gym", back_populates="users")
    team = relationship(
        "Group",
        primaryjoin="User.team_id==Group.id",
        foreign_keys=[team_id],
        viewonly=True,
    )
    groups = relationship("Group", secondary=user_groups, back_populates="members")
    sessions = relationship("WorkoutSession", back_populates="user", cascade="all, delete-orphan")
    individual_assignments = relationship("WorkoutAssignment", back_populates="user", foreign_keys="WorkoutAssignment.user_id", cascade="all, delete-orphan")
    records = relationship("PersonalRecord", back_populates="user", cascade="all, delete-orphan")

    @property
    def roles(self):
        held = []
        if self.is_admin:
            held.append("admin")
        if self.is_coach:
            held.append("coach")
        if self.is_athlete:
            held.append("athlete")
        if held:
            return held
        legacy = (self.role or "athlete").lower()
        if legacy == "student":
            legacy = "athlete"
        if legacy not in ("admin", "coach", "athlete"):
            legacy = "athlete"
        return [legacy]

    @property
    def gym_name(self):
        return self.gym.name if self.gym_id and self.gym else None

    @property
    def team_name(self):
        return self.team.name if self.team_id and self.team else None

    @property
    def needs_onboarding(self):
        if self.gym_id is None:
            return True
        athlete_only = self.is_athlete and not self.is_admin and not self.is_coach
        if not (self.is_admin or self.is_coach or self.is_athlete):
            athlete_only = (self.role or "") in ("athlete", "student")
        return bool(athlete_only and self.team_id is None)

class Group(Base):
    __tablename__ = "groups"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    gym_id = Column(Integer, ForeignKey("gyms.id", ondelete="CASCADE"), nullable=True, index=True)
    coach_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    description = Column(Text, default="")
    color = Column(String(20), default="#3b82f6")
    created_at = Column(DateTime, default=datetime.utcnow)

    gym = relationship("Gym", back_populates="teams")
    coach = relationship("User", foreign_keys=[coach_id])
    members = relationship("User", secondary=user_groups, back_populates="groups")
    assignments = relationship("WorkoutAssignment", back_populates="group", cascade="all, delete-orphan")

class JoinCode(Base):
    """Gym code (admin → new coach) or team code (coach → new athlete). No other kinds."""
    __tablename__ = "join_codes"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(16), unique=True, nullable=False, index=True)
    kind = Column(String(10), nullable=False, index=True)  # 'gym' or 'team'
    gym_id = Column(Integer, ForeignKey("gyms.id", ondelete="CASCADE"), nullable=False, index=True)
    team_id = Column(Integer, ForeignKey("groups.id", ondelete="CASCADE"), nullable=True, index=True)
    created_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    gym = relationship("Gym")
    team = relationship("Group")
    created_by = relationship("User")

    @property
    def team_name(self):
        return self.team.name if self.team_id and self.team else None

class WorkoutAssignment(Base):
    __tablename__ = "workout_assignments"

    id = Column(Integer, primary_key=True, index=True)
    workout_id = Column(Integer, ForeignKey("workouts.id", ondelete="CASCADE"), nullable=False)
    assigned_by_coach_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    group_id = Column(Integer, ForeignKey("groups.id", ondelete="CASCADE"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    scheduled_date = Column(String(20), default="", index=True)  # YYYY-MM-DD
    notes = Column(String(255), default="")
    created_at = Column(DateTime, default=datetime.utcnow)

    workout = relationship("Workout", back_populates="assignments")
    group = relationship("Group", back_populates="assignments")
    user = relationship("User", back_populates="individual_assignments", foreign_keys=[user_id])
    coach = relationship("User", foreign_keys=[assigned_by_coach_id])

class Exercise(Base):
    __tablename__ = "exercises"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), unique=True, index=True, nullable=False)
    category = Column(String(100), default="Strength", index=True)
    default_notes = Column(Text, default="")
    video_url = Column(String(500), default="")
    created_at = Column(DateTime, default=datetime.utcnow)

    workout_links = relationship("WorkoutExercise", back_populates="exercise", cascade="all, delete-orphan")
    records = relationship("PersonalRecord", back_populates="exercise", cascade="all, delete-orphan")

class Workout(Base):
    __tablename__ = "workouts"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False, index=True)
    program_name = Column(String(255), default="General", index=True)
    scheduled_date = Column(String(100), default="")
    calendar_date = Column(String(20), default="", index=True)  # YYYY-MM-DD
    week_number = Column(Integer, default=1, index=True)
    day_of_week = Column(String(50), default="Monday", index=True)
    description = Column(Text, default="")
    video_url = Column(String(500), default="")  # Workout-level video link
    created_by_coach_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    gym_id = Column(Integer, ForeignKey("gyms.id", ondelete="CASCADE"), nullable=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    exercises = relationship("WorkoutExercise", back_populates="workout", cascade="all, delete-orphan", order_by="WorkoutExercise.order_index")
    sessions = relationship("WorkoutSession", back_populates="workout", cascade="all, delete-orphan")
    assignments = relationship("WorkoutAssignment", back_populates="workout", cascade="all, delete-orphan")

class WorkoutExercise(Base):
    __tablename__ = "workout_exercises"

    id = Column(Integer, primary_key=True, index=True)
    workout_id = Column(Integer, ForeignKey("workouts.id", ondelete="CASCADE"), nullable=False)
    exercise_id = Column(Integer, ForeignKey("exercises.id", ondelete="CASCADE"), nullable=False)
    superset_group = Column(String(10), default="A")  # A, B, C, D, E, F
    order_index = Column(Integer, default=0)
    prescription_text = Column(String(100), default="")
    prescribed_sets = Column(Integer, default=3)
    target_reps = Column(String(50), default="10")
    target_weight = Column(String(50), default="0")
    rest_seconds = Column(Integer, default=0)
    notes = Column(Text, default="")
    is_ea = Column(Boolean, default=False)

    workout = relationship("Workout", back_populates="exercises")
    exercise = relationship("Exercise", back_populates="workout_links")
    set_logs = relationship("SetLog", back_populates="workout_exercise", cascade="all, delete-orphan")

class WorkoutSession(Base):
    __tablename__ = "workout_sessions"

    id = Column(Integer, primary_key=True, index=True)
    workout_id = Column(Integer, ForeignKey("workouts.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    start_time = Column(DateTime, default=datetime.utcnow)
    end_time = Column(DateTime, nullable=True)
    completed = Column(Boolean, default=False)
    notes = Column(Text, default="")
    athlete_note = Column(Text, default="")

    workout = relationship("Workout", back_populates="sessions")
    user = relationship("User", back_populates="sessions")
    set_logs = relationship("SetLog", back_populates="session", cascade="all, delete-orphan")

class SetLog(Base):
    __tablename__ = "set_logs"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("workout_sessions.id", ondelete="CASCADE"), nullable=False)
    workout_exercise_id = Column(Integer, ForeignKey("workout_exercises.id", ondelete="CASCADE"), nullable=False)
    set_number = Column(Integer, nullable=False)
    weight = Column(Float, default=0.0)
    reps = Column(Float, default=0.0)
    rest_seconds = Column(Integer, default=0)
    details = Column(Text, default="")  # JSON for tempo, velocity, power, %1RM
    completed = Column(Boolean, default=False)
    logged_at = Column(DateTime, default=datetime.utcnow)

    session = relationship("WorkoutSession", back_populates="set_logs")
    workout_exercise = relationship("WorkoutExercise", back_populates="set_logs")

class PersonalRecord(Base):
    __tablename__ = "personal_records"

    id = Column(Integer, primary_key=True, index=True)
    exercise_id = Column(Integer, ForeignKey("exercises.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    weight = Column(Float, nullable=False)
    reps = Column(Integer, default=1)
    notes = Column(String(255), default="")
    date = Column(DateTime, default=datetime.utcnow)

    exercise = relationship("Exercise", back_populates="records")
    user = relationship("User", back_populates="records")
