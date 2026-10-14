from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, Text, DateTime, ForeignKey, Table
from sqlalchemy.orm import relationship
from app.database import Base

# Junction table for User <-> Group
user_groups = Table(
    "user_groups",
    Base.metadata,
    Column("user_id", Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    Column("group_id", Integer, ForeignKey("groups.id", ondelete="CASCADE"), primary_key=True)
)

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    role = Column(String(50), default="student", index=True)  # 'coach' or 'student'
    title = Column(String(100), default="Athlete")  # e.g. 'Head Strength Coach', 'Varsity Athlete'
    avatar_color = Column(String(20), default="#0ea5e9")
    status_badge = Column(String(50), default="Active")  # 'Active', 'Modified', 'Rehab'
    position_tag = Column(String(100), default="Athlete")  # 'Varsity RB', 'Sprinter', etc.
    created_at = Column(DateTime, default=datetime.utcnow)

    groups = relationship("Group", secondary=user_groups, back_populates="members")
    sessions = relationship("WorkoutSession", back_populates="user", cascade="all, delete-orphan")
    individual_assignments = relationship("WorkoutAssignment", back_populates="user", foreign_keys="WorkoutAssignment.user_id", cascade="all, delete-orphan")

class Group(Base):
    __tablename__ = "groups"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), unique=True, nullable=False, index=True)
    coach_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    description = Column(Text, default="")
    color = Column(String(20), default="#3b82f6")
    created_at = Column(DateTime, default=datetime.utcnow)

    members = relationship("User", secondary=user_groups, back_populates="groups")
    assignments = relationship("WorkoutAssignment", back_populates="group", cascade="all, delete-orphan")

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
    completed = Column(Boolean, default=False)
    logged_at = Column(DateTime, default=datetime.utcnow)

    session = relationship("WorkoutSession", back_populates="set_logs")
    workout_exercise = relationship("WorkoutExercise", back_populates="set_logs")

class PersonalRecord(Base):
    __tablename__ = "personal_records"

    id = Column(Integer, primary_key=True, index=True)
    exercise_id = Column(Integer, ForeignKey("exercises.id", ondelete="CASCADE"), nullable=False)
    weight = Column(Float, nullable=False)
    reps = Column(Integer, default=1)
    notes = Column(String(255), default="")
    date = Column(DateTime, default=datetime.utcnow)

    exercise = relationship("Exercise", back_populates="records")
