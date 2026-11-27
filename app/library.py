"""The exercise library across gyms.

There is one shared list of exercises. Each exercise's defaults come in three layers, and each
value is worked out on its own: the coach's own value, else their gym's (set by a gym admin), else
the shared list's. So a coach who changes only reps keeps following the gym's rest, and an admin's
later change to rest still reaches them.

The name and the category live only on the shared row. The coach who added the exercise, or the
app owner (SUPER_ADMIN_EMAILS), changes them.

Chains belong to a gym. Its coaches all use them. The coach who made a chain and the gym's admins
change it; anyone else can save a copy under a new name.
"""
from typing import Dict, Iterable, List, Optional, Tuple

from fastapi import HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session, object_session

from app import access
from app.config import settings
from app.models import (
    CoachExerciseDefault,
    CoachHiddenChain,
    Exercise,
    ExerciseChain,
    ExerciseChainMember,
    Gym,
    GymExerciseDefault,
    User,
    Workout,
    WorkoutExercise,
)

LAYERED_FIELDS = (
    "video_url",
    "default_notes",
    "default_sets",
    "default_reps",
    "default_load",
    "default_rest",
    "default_tempo",
    "default_velocity",
    "default_power",
    "default_pct",
    "default_rest_rep",
    "default_distance",
    "default_time",
    "default_stations",
    "completion_only",
    "intensity_kind",
    "intensity_value",
)
# Intensity is one choice: a kind and its number are set, followed, and reset together.
INTENSITY = ("intensity_kind", "intensity_value")
SCOPES = ("coach", "gym", "shared")


# --------------------------------------------------------------------------- who may do what

def is_super_admin(user: Optional[User]) -> bool:
    return bool(user and (user.email or "").strip().lower() in settings.SUPER_ADMIN_EMAILS)


def _staff(user: Optional[User]) -> bool:
    return bool(user and (access.is_admin(user) or access.is_coach(user)))


def require_library_coach(user: User) -> None:
    access.require_gym(user)
    if not _staff(user):
        raise HTTPException(status_code=403, detail="Athlete accounts do not have coach tools.")


def can_edit_identity(user: Optional[User], exercise: Exercise) -> bool:
    """The name and category: the coach who added the exercise, or the app owner."""
    if not user:
        return False
    if is_super_admin(user):
        return True
    return exercise.created_by is not None and exercise.created_by == user.id


def require_identity_edit(user: User, exercise: Exercise) -> None:
    if not can_edit_identity(user, exercise):
        raise HTTPException(
            status_code=403,
            detail=f"Only the coach who added {exercise.name} can rename it or change its category.",
        )


def require_scope(user: User, scope: str) -> str:
    scope = (scope or "coach").strip().lower()
    if scope not in SCOPES:
        raise HTTPException(status_code=400, detail="Save defaults for yourself, your gym, or the shared list.")
    if scope == "shared":
        if not is_super_admin(user):
            raise HTTPException(status_code=403, detail="Only the app owner changes the shared list's defaults.")
        return scope
    require_library_coach(user)
    if scope == "gym" and not access.is_admin(user):
        raise HTTPException(status_code=403, detail="Only a gym admin sets defaults for the whole gym.")
    return scope


# --------------------------------------------------------------------------- reading the layers

class ResolvedExercise:
    """An exercise as one person sees it. Reads fall through to the shared row. Nothing set on
    this object reaches the database."""

    def __init__(self, exercise: Exercise, values: dict, sources: dict, inherited: dict, can_edit_name: bool):
        object.__setattr__(self, "_exercise", exercise)
        object.__setattr__(self, "_values", dict(values))
        object.__setattr__(self, "sources", sources)
        object.__setattr__(self, "inherited", inherited)
        object.__setattr__(self, "can_edit_name", can_edit_name)

    def __getattr__(self, name):
        values = object.__getattribute__(self, "_values")
        if name in values:
            return values[name]
        return getattr(object.__getattribute__(self, "_exercise"), name)

    def __setattr__(self, name, value):
        object.__getattribute__(self, "_values")[name] = value


def _shared_values(exercise: Exercise) -> dict:
    return {field: getattr(exercise, field) for field in LAYERED_FIELDS}


def _merge(exercise: Exercise, layers: Iterable[Tuple[str, object]]) -> Tuple[dict, dict, dict]:
    """Lay each row over the shared values, lowest first. `inherited` holds what a field would
    show without the top layer that set it, so the editor can offer to reset it."""
    values = _shared_values(exercise)
    sources: Dict[str, str] = {}
    inherited: Dict[str, object] = {}
    for label, row in layers:
        if row is None:
            continue
        for field in LAYERED_FIELDS:
            if field in INTENSITY:
                continue
            value = getattr(row, field)
            if value is not None:
                inherited[field] = values[field]
                values[field] = value
                sources[field] = label
        if row.intensity_kind is not None:
            for field in INTENSITY:
                inherited[field] = values[field]
                values[field] = getattr(row, field) or ""
                sources[field] = label
    return values, sources, inherited


def _gym_rows(db: Session, gym_id: Optional[int], exercise_ids: Optional[List[int]] = None) -> dict:
    if not gym_id:
        return {}
    query = db.query(GymExerciseDefault).filter(GymExerciseDefault.gym_id == gym_id)
    if exercise_ids is not None:
        query = query.filter(GymExerciseDefault.exercise_id.in_(exercise_ids or [-1]))
    return {row.exercise_id: row for row in query.all()}


def _coach_rows(db: Session, user_id: Optional[int], exercise_ids: Optional[List[int]] = None) -> dict:
    if not user_id:
        return {}
    query = db.query(CoachExerciseDefault).filter(CoachExerciseDefault.user_id == user_id)
    if exercise_ids is not None:
        query = query.filter(CoachExerciseDefault.exercise_id.in_(exercise_ids or [-1]))
    return {row.exercise_id: row for row in query.all()}


def resolve_for(db: Session, user: Optional[User], exercises: List[Exercise]) -> List[ResolvedExercise]:
    """Each exercise as this coach sees it: their values, else their gym's, else the shared list's."""
    exercises = list(exercises)
    if not exercises:
        return []
    ids = [row.id for row in exercises] if len(exercises) < 500 else None
    gym = _gym_rows(db, user.gym_id if user else None, ids)
    coach = _coach_rows(db, user.id if user else None, ids)
    out = []
    for exercise in exercises:
        values, sources, inherited = _merge(exercise, (("gym", gym.get(exercise.id)), ("coach", coach.get(exercise.id))))
        out.append(ResolvedExercise(exercise, values, sources, inherited, can_edit_identity(user, exercise)))
    return out


def resolve_one(db: Session, user: Optional[User], exercise: Exercise) -> ResolvedExercise:
    return resolve_for(db, user, [exercise])[0]


def resolve_at(db: Session, user: User, exercise: Exercise, scope: str) -> ResolvedExercise:
    """What one layer shows: a coach's full view, the gym's (shared + gym), or the shared row."""
    if scope == "coach":
        return resolve_one(db, user, exercise)
    layers = []
    if scope == "gym":
        layers.append(("gym", _gym_rows(db, user.gym_id, [exercise.id]).get(exercise.id)))
    values, sources, inherited = _merge(exercise, layers)
    return ResolvedExercise(exercise, values, sources, inherited, can_edit_identity(user, exercise))


def coaches_with_own_values(db: Session, gym_id: int, exercise_id: int) -> int:
    ids = [row.id for row in db.query(User.id).filter(User.gym_id == gym_id).all()]
    if not ids:
        return 0
    return db.query(CoachExerciseDefault).filter(
        CoachExerciseDefault.exercise_id == exercise_id,
        CoachExerciseDefault.user_id.in_(ids),
    ).count()


def _layer_view(view: ResolvedExercise) -> dict:
    return {
        "values": {field: getattr(view, field) for field in LAYERED_FIELDS},
        "sources": dict(view.sources),
        "inherited": dict(view.inherited),
    }


def layers_payload(db: Session, user: User, exercise: Exercise) -> dict:
    """What the exercise editor needs to switch between the layers this person may change."""
    require_library_coach(user)
    scopes = ["coach"]
    out = {"scopes": scopes, "coach": _layer_view(resolve_one(db, user, exercise))}
    if access.is_admin(user):
        scopes.append("gym")
        out["gym"] = _layer_view(resolve_at(db, user, exercise, "gym"))
        out["coaches_with_own_values"] = coaches_with_own_values(db, user.gym_id, exercise.id)
    if is_super_admin(user):
        scopes.append("shared")
        out["shared"] = _layer_view(resolve_at(db, user, exercise, "shared"))
    return out


# --------------------------------------------------------------------------- writing a layer

def _same(field: str, a, b) -> bool:
    if field == "completion_only":
        return bool(a) == bool(b)
    if field == "default_sets":
        try:
            return int(a if a not in (None, "") else 0) == int(b if b not in (None, "") else 0)
        except (TypeError, ValueError):
            return str(a) == str(b)
    return str(a if a is not None else "").strip() == str(b if b is not None else "").strip()


def _layer_row(db: Session, user: User, exercise: Exercise, scope: str):
    if scope == "gym":
        row = db.query(GymExerciseDefault).filter(
            GymExerciseDefault.gym_id == user.gym_id, GymExerciseDefault.exercise_id == exercise.id
        ).first()
        return row or GymExerciseDefault(gym_id=user.gym_id, exercise_id=exercise.id)
    row = db.query(CoachExerciseDefault).filter(
        CoachExerciseDefault.user_id == user.id, CoachExerciseDefault.exercise_id == exercise.id
    ).first()
    return row or CoachExerciseDefault(user_id=user.id, exercise_id=exercise.id)


def _expand_reset(fields) -> set:
    wanted = {str(field) for field in (fields or []) if str(field) in LAYERED_FIELDS or str(field) == "intensity"}
    if wanted & (set(INTENSITY) | {"intensity"}):
        wanted |= set(INTENSITY)
    wanted.discard("intensity")
    return wanted


def write_defaults(db: Session, user: User, exercise: Exercise, values: dict, scope: str = "coach", reset=()) -> bool:
    """Save default values into one layer. Returns True when that layer changed.

    The editor sends every value it shows, so a value only becomes this layer's own when it
    differs from what the layer shows now. One the layer already owns takes the new value. A
    field named in `reset` stops being this layer's own and follows the layer below again.
    """
    scope = require_scope(user, scope)
    values = {field: value for field, value in (values or {}).items() if field in LAYERED_FIELDS}
    if scope == "shared":
        changed = False
        for field, value in values.items():
            if not _same(field, getattr(exercise, field), value):
                setattr(exercise, field, value)
                changed = True
        _forget_videos(db)
        return changed

    reset_fields = _expand_reset(reset)
    current = resolve_at(db, user, exercise, scope)
    row = _layer_row(db, user, exercise, scope)
    changed = False
    for field in reset_fields:
        if getattr(row, field) is not None:
            setattr(row, field, None)
            changed = True
    owned = lambda field: getattr(row, field) is not None  # noqa: E731
    for field, value in values.items():
        if field in INTENSITY or field in reset_fields:
            continue
        if owned(field):
            if not _same(field, getattr(row, field), value):
                setattr(row, field, value)
                changed = True
        elif not _same(field, getattr(current, field), value):
            setattr(row, field, value)
            changed = True
    if any(field in values for field in INTENSITY) and not (reset_fields & set(INTENSITY)):
        kind = values.get("intensity_kind", getattr(current, "intensity_kind")) or ""
        number = values.get("intensity_value", getattr(current, "intensity_value")) or ""
        mine = row.intensity_kind is not None
        shown = (getattr(current, "intensity_kind") or "", getattr(current, "intensity_value") or "")
        if (mine and (row.intensity_kind, row.intensity_value or "") != (kind, number)) or (not mine and shown != (kind, number)):
            row.intensity_kind = kind
            row.intensity_value = number
            changed = True

    empty = all(getattr(row, field) is None for field in LAYERED_FIELDS)
    persisted = object_session(row) is not None
    if empty:
        if persisted:
            db.delete(row)
    elif not persisted:
        db.add(row)
    _forget_videos(db)
    return changed


def apply_gym_to_coaches(db: Session, user: User, exercise: Exercise) -> int:
    """Clear every coach's own values for this exercise in the admin's gym, so they all follow
    the gym again. Returns how many coaches that reached."""
    require_scope(user, "gym")
    ids = [row.id for row in db.query(User.id).filter(User.gym_id == user.gym_id).all()]
    if not ids:
        return 0
    count = db.query(CoachExerciseDefault).filter(
        CoachExerciseDefault.exercise_id == exercise.id,
        CoachExerciseDefault.user_id.in_(ids),
    ).delete(synchronize_session="fetch")
    _forget_videos(db)
    return count


# --------------------------------------------------------------------------- videos on placed days

def _forget_videos(db: Session) -> None:
    db.info.pop("placed_videos", None)


def _video_map(session: Session, kind: str, key: Optional[int]) -> dict:
    if not key:
        return {}
    cache = session.info.setdefault("placed_videos", {})
    slot = (kind, key)
    if slot not in cache:
        model = GymExerciseDefault if kind == "gym" else CoachExerciseDefault
        column = GymExerciseDefault.gym_id if kind == "gym" else CoachExerciseDefault.user_id
        rows = session.query(model.exercise_id, model.video_url).filter(column == key, model.video_url.isnot(None)).all()
        cache[slot] = {exercise_id: video for exercise_id, video in rows}
    return cache[slot]


def placed_video(we: WorkoutExercise) -> str:
    """The video an athlete sees on a programmed exercise: the one the coach who programmed the
    day set, else their gym's, else the shared list's."""
    exercise = we.exercise
    base = (exercise.video_url if exercise is not None else "") or ""
    session = object_session(we)
    workout = we.workout
    if session is None or workout is None or exercise is None:
        return base
    coach = _video_map(session, "coach", workout.created_by_coach_id)
    if exercise.id in coach:
        return coach[exercise.id] or ""
    gym = _video_map(session, "gym", workout.gym_id)
    if exercise.id in gym:
        return gym[exercise.id] or ""
    return base


# --------------------------------------------------------------------------- chains per gym

def chain_in_gym(user: User, chain: Optional[ExerciseChain]) -> ExerciseChain:
    if chain is None or not user.gym_id or chain.gym_id != user.gym_id:
        raise HTTPException(status_code=404, detail="Chain not found")
    return chain


def can_edit_chain(user: Optional[User], chain: ExerciseChain) -> bool:
    if not user or not user.gym_id or chain.gym_id != user.gym_id:
        return False
    if access.is_admin(user) or is_super_admin(user):
        return True
    return chain.created_by is not None and chain.created_by == user.id


def require_chain_edit(user: User, chain: ExerciseChain) -> None:
    if not can_edit_chain(user, chain):
        raise HTTPException(
            status_code=403,
            detail=f"Only the coach who made {chain.name}, or a gym admin, can change it. Give it a new name to save your own copy.",
        )


def _copy_chain(db: Session, chain: ExerciseChain, gym_id: int) -> ExerciseChain:
    copy = ExerciseChain(name=chain.name, kind=chain.kind, gym_id=gym_id, created_by=chain.created_by)
    db.add(copy)
    db.flush()
    for member in chain.members:
        db.add(ExerciseChainMember(
            chain_id=copy.id,
            exercise_id=member.exercise_id,
            order_index=member.order_index,
            sets=member.sets,
            reps=member.reps,
            time=member.time,
            distance=member.distance,
            notes=member.notes,
            per_side=member.per_side,
        ))
    return copy


def assign_chains_to_gyms(db: Session) -> int:
    """Give each chain made before chains belonged to gyms a gym, once.

    A chain goes to the gym whose days use it most. Each other gym whose days use it gets its
    own copy, and its days point at the copy, so no gym can change another's. A chain no day
    uses goes to the first gym. Returns how many chains were placed or copied.
    """
    loose = db.query(ExerciseChain).filter(ExerciseChain.gym_id.is_(None)).all()
    if not loose:
        return 0
    first_gym = db.query(Gym.id).order_by(Gym.id.asc()).first()
    placed = 0
    for chain in loose:
        uses = (
            db.query(Workout.gym_id, func.count(WorkoutExercise.id))
            .join(WorkoutExercise, WorkoutExercise.workout_id == Workout.id)
            .filter(WorkoutExercise.chain_id == chain.id, Workout.gym_id.isnot(None))
            .group_by(Workout.gym_id)
            .order_by(func.count(WorkoutExercise.id).desc(), Workout.gym_id.asc())
            .all()
        )
        if not uses:
            if first_gym is None:
                continue
            chain.gym_id = first_gym[0]
            placed += 1
            continue
        chain.gym_id = uses[0][0]
        placed += 1
        for gym_id, _ in uses[1:]:
            copy = _copy_chain(db, chain, gym_id)
            workout_ids = [row[0] for row in db.query(Workout.id).filter(Workout.gym_id == gym_id).all()]
            db.query(WorkoutExercise).filter(
                WorkoutExercise.chain_id == chain.id,
                WorkoutExercise.workout_id.in_(workout_ids or [-1]),
            ).update({WorkoutExercise.chain_id: copy.id}, synchronize_session=False)
            people = [row[0] for row in db.query(User.id).filter(User.gym_id == gym_id).all()]
            for hidden in db.query(CoachHiddenChain).filter(
                CoachHiddenChain.chain_id == chain.id, CoachHiddenChain.user_id.in_(people or [-1])
            ).all():
                db.add(CoachHiddenChain(user_id=hidden.user_id, chain_id=copy.id))
                db.delete(hidden)
            placed += 1
    db.commit()
    return placed
