"""Gym tenancy and Admin / Coach / Athlete checks.

One login may hold more than one role. `user.role` is only the view they are
looking at. Permissions use the role flags. A coach or admin sees coach tools
only for teams they lead. An athlete who is not also a coach or admin does not.
"""
from typing import List, Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models import Group, JoinCode, User

CODE_KINDS = ("gym", "team")


def held_roles(user: User) -> set:
    return set(user.roles or [])


def is_admin(user: User) -> bool:
    return "admin" in held_roles(user)


def is_coach(user: User) -> bool:
    return "coach" in held_roles(user)


def is_athlete(user: User) -> bool:
    return "athlete" in held_roles(user)


def leads_teams(db: Session, user: User) -> List[Group]:
    return db.query(Group).filter(Group.coach_id == user.id).order_by(Group.name.asc()).all()


def same_gym(user: User, other: Optional[User]) -> bool:
    return bool(user and other and user.gym_id and other.gym_id and user.gym_id == other.gym_id)


def athlete_ids_for(db: Session, user: User) -> List[int]:
    """Athletes on teams this login leads. Admins do not see every athlete this way."""
    team_ids = [t.id for t in leads_teams(db, user)]
    if not team_ids:
        return []
    rows = db.query(User).filter(User.team_id.in_(team_ids), User.id != user.id).all()
    ids = {row.id for row in rows}
    for team in leads_teams(db, user):
        for member in team.members:
            if member.id != user.id:
                ids.add(member.id)
    return sorted(ids)


def athletes_for(db: Session, user: User) -> List[User]:
    ids = athlete_ids_for(db, user)
    if not ids:
        return []
    return db.query(User).filter(User.id.in_(ids)).order_by(User.name.asc()).all()


def can_see_user(db: Session, viewer: User, target: User) -> bool:
    if viewer.id == target.id:
        return True
    if not viewer.gym_id or target.gym_id != viewer.gym_id:
        return False
    if is_admin(viewer):
        return True
    if is_coach(viewer) and target.id in athlete_ids_for(db, viewer):
        return True
    return False


def require_gym(user: User) -> None:
    if not user.gym_id:
        raise HTTPException(status_code=403, detail="Enter a gym or team code before continuing.")


def require_admin(user: User) -> None:
    require_gym(user)
    if not is_admin(user):
        raise HTTPException(status_code=403, detail="Only a gym admin can do that.")


def assert_leads_team(db: Session, user: User, team: Optional[Group]) -> Group:
    require_gym(user)
    if not team or team.gym_id != user.gym_id or team.coach_id != user.id:
        raise HTTPException(status_code=403, detail="You can only do that for a team you lead.")
    if not (is_coach(user) or is_admin(user)):
        raise HTTPException(status_code=403, detail="Athlete accounts do not have coach tools.")
    return team


def assert_own_athlete(db: Session, user: User, athlete: Optional[User]) -> User:
    if not athlete or athlete.id not in athlete_ids_for(db, user):
        raise HTTPException(status_code=403, detail="That athlete is not on a team you lead.")
    if athlete.gym_id != user.gym_id:
        raise HTTPException(status_code=403, detail="That athlete is in another gym.")
    return athlete


def coach_removal_block(db: Session, user: User) -> Optional[str]:
    """Block removing a coach who still leads a team or still has an athlete."""
    if "coach" not in held_roles(user) and (user.role or "") != "coach":
        return None
    teams = leads_teams(db, user)
    athletes = athletes_for(db, user)
    if not teams and not athletes:
        return None
    team_names = ", ".join(t.name for t in teams) or "none"
    athlete_names = ", ".join(a.name for a in athletes) or "none"
    return (
        "This coach still has a team or an athlete. "
        "Delete those teams and athletes, or move them to another coach, before removing the coach. "
        f"Teams: {team_names}. Athletes: {athlete_names}."
    )


def visible_users(db: Session, viewer: Optional[User], role: Optional[str] = None) -> List[User]:
    query = db.query(User)
    if viewer is None:
        if role:
            query = query.filter(User.role == role)
        return query.order_by(User.name.asc()).all()
    if not viewer.gym_id:
        return [viewer]
    if is_admin(viewer):
        query = query.filter(User.gym_id == viewer.gym_id)
    elif is_coach(viewer):
        ids = athlete_ids_for(db, viewer) + [viewer.id]
        query = query.filter(User.id.in_(ids))
    else:
        query = query.filter(User.id == viewer.id)
    if role:
        query = query.filter(User.role == role)
    return query.order_by(User.name.asc()).all()


def visible_teams(db: Session, viewer: Optional[User]) -> List[Group]:
    query = db.query(Group)
    if viewer is None:
        return query.order_by(Group.name.asc()).all()
    if not viewer.gym_id:
        return []
    query = query.filter(Group.gym_id == viewer.gym_id)
    if is_admin(viewer):
        return query.order_by(Group.name.asc()).all()
    if is_coach(viewer):
        return query.filter(Group.coach_id == viewer.id).order_by(Group.name.asc()).all()
    if viewer.team_id:
        return query.filter(Group.id == viewer.team_id).all()
    return []


def apply_role_flags(user: User, role: Optional[str]) -> None:
    """Set the matching flag from a single role string. Does not clear other flags."""
    key = (role or "").lower()
    if key == "student":
        key = "athlete"
    if key == "admin":
        user.is_admin = True
    elif key == "coach":
        user.is_coach = True
    elif key == "athlete":
        user.is_athlete = True


def set_active_role(user: User, role: str) -> None:
    key = (role or "").lower()
    if key == "student":
        key = "athlete"
    if key not in held_roles(user):
        raise HTTPException(status_code=403, detail="You do not hold that role.")
    user.role = key
    if key == "admin":
        user.title = user.title if user.title and user.title != "Athlete" else "Gym Admin"
    elif key == "coach":
        user.title = user.title if "coach" in (user.title or "").lower() else "Coach"
    elif key == "athlete":
        user.title = user.title or "Athlete"
