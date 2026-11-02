"""Calendars: a named programme an athlete follows live, managed from coach tools."""
import os
import tempfile
import unittest

_db = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
_db.close()
os.environ["DATABASE_URL"] = f"sqlite:///{_db.name}"
os.environ["SEED_DATA_PATH"] = "/tmp/wourkout-no-seed.json"

from fastapi.testclient import TestClient  # noqa: E402

from app import crud  # noqa: E402
from app.database import Base, SessionLocal, engine  # noqa: E402
from app.main import app  # noqa: E402
from app.models import Calendar, Group, User, WeekNote, WorkoutAssignment  # noqa: E402


class CalendarTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        Base.metadata.create_all(bind=engine)
        cls.client = TestClient(app)

    def setUp(self):
        self.stamp = f"{id(self)}-{self._testMethodName}"

    def _auth(self, token):
        return {"Authorization": f"Bearer {token}"}

    def _gym_coach(self, label):
        reg = self.client.post("/api/auth/register", json={
            "name": f"{label} Coach",
            "email": f"{label.lower()}.{self.stamp}@example.com",
            "username": f"{label.lower()}_{self.stamp[:8]}",
            "password": "Password123!",
            "role": "coach",
        })
        self.assertEqual(reg.status_code, 201, reg.text)
        auth = self._auth(reg.json()["access_token"])
        gym = self.client.post("/api/gyms", json={"name": f"{label} Gym {self.stamp}"}, headers=auth)
        self.assertEqual(gym.status_code, 201, gym.text)
        team = self.client.post("/api/groups", json={"name": f"{label} Team {self.stamp}"}, headers=auth)
        self.assertEqual(team.status_code, 201, team.text)
        return auth, team.json()["id"]

    def _athletes(self, auth, team_id, names):
        res = self.client.post("/api/gym/athletes/bulk", json={
            "team_id": team_id, "athletes": [{"name": n} for n in names],
        }, headers=auth)
        self.assertEqual(res.status_code, 201, res.text)
        return res.json()["users"]

    def _login(self, row):
        res = self.client.post("/api/auth/login", json={
            "email_or_username": row["user"]["email"], "password": row["temporary_password"],
        })
        self.assertEqual(res.status_code, 200, res.text)
        return self._auth(res.json()["access_token"])

    def _workout(self, auth, title, day):
        exercise = self.client.post("/api/exercises", json={"name": f"Lift {title} {self.stamp}", "category": "Strength"}, headers=auth)
        self.assertEqual(exercise.status_code, 201, exercise.text)
        res = self.client.post("/api/workouts", json={
            "title": title, "program_name": "wourkout", "calendar_date": day, "scheduled_date": day,
            "exercises": [{"exercise_id": exercise.json()["id"], "prescribed_sets": 1, "target_reps": "1", "target_weight": ""}],
        }, headers=auth)
        self.assertEqual(res.status_code, 201, res.text)
        return res.json()

    def test_every_athlete_gets_a_personal_calendar(self):
        auth, team_id = self._gym_coach("Personal")
        rows = self._athletes(auth, team_id, ["Sam Lee", "Jo Kim"])
        ctx = self.client.get("/api/gym/context", headers=auth).json()
        by_name = {a["name"]: a for a in ctx["athletes"]}
        self.assertEqual(by_name["Sam Lee"]["calendar_name"], "Sam Lee")
        self.assertEqual(by_name["Jo Kim"]["calendar_name"], "Jo Kim")
        self.assertNotEqual(by_name["Sam Lee"]["calendar_id"], by_name["Jo Kim"]["calendar_id"])
        names = {c["name"]: c for c in ctx["calendars"]}
        self.assertEqual(names["Sam Lee"]["athlete_ids"], [rows[0]["user"]["id"]])
        self.assertEqual(names["Jo Kim"]["athlete_count"], 1)
        listed = self.client.get("/api/calendars", headers=auth).json()
        self.assertEqual({c["name"] for c in listed}, {"Sam Lee", "Jo Kim"})

    def test_shared_calendar_is_followed_live_and_only_by_its_athletes(self):
        auth, team_id = self._gym_coach("Shared")
        rows = self._athletes(auth, team_id, ["Ana Diaz", "Ben Fox", "Cal Ray"])
        ana, ben, cal = (r["user"]["id"] for r in rows)
        made = self.client.post("/api/calendars", json={"name": "Fall block"}, headers=auth)
        self.assertEqual(made.status_code, 201, made.text)
        calendar_id = made.json()["id"]
        self.assertEqual(made.json()["athlete_ids"], [])

        put = self.client.put(f"/api/calendars/{calendar_id}", json={"athlete_ids": [ana, ben]}, headers=auth)
        self.assertEqual(put.status_code, 200, put.text)
        self.assertEqual(sorted(put.json()["athlete_ids"]), sorted([ana, ben]))
        self.assertEqual(put.json()["athlete_count"], 2)

        workout = self._workout(auth, "Heavy day", "2026-11-09")
        assigned = self.client.post("/api/assignments", json={
            "workout_id": workout["id"], "calendar_id": calendar_id, "scheduled_date": "2026-11-09",
        }, headers=auth)
        self.assertEqual(assigned.status_code, 201, assigned.text)
        self.assertEqual(assigned.json()["calendar_id"], calendar_id)
        self.assertIn("Calendar: Fall block", assigned.json()["target_name"])

        both = self.client.post("/api/assignments", json={
            "workout_id": workout["id"], "calendar_id": calendar_id, "user_id": ana, "scheduled_date": "2026-11-10",
        }, headers=auth)
        self.assertEqual(both.status_code, 400)

        on_calendar = self.client.get(f"/api/calendar/schedule?calendar_id={calendar_id}", headers=auth).json()
        self.assertEqual([row["scheduled_date"] for row in on_calendar], ["2026-11-09"])
        self.assertEqual(on_calendar[0]["calendar_id"], calendar_id)
        # Asking for an athlete on it gives the same days, live.
        for_ana = self.client.get(f"/api/calendar/schedule?user_id={ana}", headers=auth).json()
        self.assertEqual([row["workout"]["id"] for row in for_ana], [workout["id"]])
        for_cal = self.client.get(f"/api/calendar/schedule?user_id={cal}", headers=auth).json()
        self.assertEqual(for_cal, [])
        listed = self.client.get("/api/assignments", params={"calendar_id": calendar_id, "date": "2026-11-09"}, headers=auth).json()
        self.assertEqual([row["workout_id"] for row in listed], [workout["id"]])

        ben_auth = self._login(rows[1])
        mine = self.client.get("/api/my/schedule", headers=ben_auth).json()
        self.assertEqual([row["workout_id"] for row in mine], [workout["id"]])
        self.assertEqual(self.client.get(f"/api/workouts/{workout['id']}", headers=ben_auth).status_code, 200)
        noted = self.client.post("/api/my/note", json={"workout_id": workout["id"], "note": "Solid"}, headers=ben_auth)
        self.assertEqual(noted.status_code, 200, noted.text)
        cal_auth = self._login(rows[2])
        self.assertEqual(self.client.get("/api/my/schedule", headers=cal_auth).json(), [])
        self.assertEqual(self.client.get(f"/api/workouts/{workout['id']}", headers=cal_auth).status_code, 403)
        self.assertEqual(self.client.get(f"/api/calendar/schedule?calendar_id={calendar_id}", headers=cal_auth).status_code, 403)

        # Quick assign: the athlete's own record points at the calendar.
        moved = self.client.put(f"/api/users/{cal}", json={"calendar_id": calendar_id}, headers=auth)
        self.assertEqual(moved.status_code, 200, moved.text)
        self.assertEqual(moved.json()["calendar_id"], calendar_id)
        self.assertEqual([row["workout_id"] for row in self.client.get("/api/my/schedule", headers=cal_auth).json()], [workout["id"]])

        # Taking Ben off sends him back to a calendar of his own, and he no longer sees the day.
        trimmed = self.client.put(f"/api/calendars/{calendar_id}", json={"name": "Fall block v2", "athlete_ids": [ana, cal]}, headers=auth)
        self.assertEqual(trimmed.status_code, 200, trimmed.text)
        self.assertEqual(trimmed.json()["name"], "Fall block v2")
        ctx = self.client.get("/api/gym/context", headers=auth).json()
        ben_row = next(a for a in ctx["athletes"] if a["id"] == ben)
        self.assertEqual(ben_row["calendar_name"], "Ben Fox")
        self.assertNotEqual(ben_row["calendar_id"], calendar_id)
        self.assertEqual(self.client.get("/api/my/schedule", headers=ben_auth).json(), [])

        # Workout summaries count everyone on the calendar as assigned.
        summary = next(w for w in ctx["workouts"] if w["id"] == workout["id"])
        self.assertEqual(sorted(summary["assigned_athlete_ids"]), sorted([ana, cal]))

    def test_week_notes_live_on_the_calendar(self):
        auth, team_id = self._gym_coach("Notes")
        rows = self._athletes(auth, team_id, ["Dee Oak"])
        dee = rows[0]["user"]["id"]
        calendar_id = self.client.post("/api/calendars", json={"name": "Spring"}, headers=auth).json()["id"]
        self.client.put(f"/api/calendars/{calendar_id}", json={"athlete_ids": [dee]}, headers=auth)
        saved = self.client.put("/api/calendar/week-notes", json={
            "calendar_id": calendar_id, "week_start": "2026-11-01", "body": "Deload",
        }, headers=auth)
        self.assertEqual(saved.status_code, 200, saved.text)
        self.assertEqual(self.client.get(f"/api/calendar/week-notes?calendar_id={calendar_id}", headers=auth).json(), [{"week_start": "2026-11-01", "body": "Deload"}])
        # The athlete's own view of notes is the calendar they follow.
        self.assertEqual(self.client.get(f"/api/calendar/week-notes?user_id={dee}", headers=auth).json(), [{"week_start": "2026-11-01", "body": "Deload"}])
        both = self.client.put("/api/calendar/week-notes", json={
            "calendar_id": calendar_id, "user_id": dee, "week_start": "2026-11-01", "body": "x",
        }, headers=auth)
        self.assertEqual(both.status_code, 400)

    def test_delete_is_blocked_while_followed_and_foreign_coaches_see_nothing(self):
        auth, team_id = self._gym_coach("Delete")
        rows = self._athletes(auth, team_id, ["Eve Ash"])
        eve = rows[0]["user"]["id"]
        calendar_id = self.client.post("/api/calendars", json={"name": "Camp"}, headers=auth).json()["id"]
        self.client.put(f"/api/calendars/{calendar_id}", json={"athlete_ids": [eve]}, headers=auth)
        workout = self._workout(auth, "Camp day", "2026-12-01")
        self.client.post("/api/assignments", json={"workout_id": workout["id"], "calendar_id": calendar_id, "scheduled_date": "2026-12-01"}, headers=auth)

        blocked = self.client.delete(f"/api/calendars/{calendar_id}", headers=auth)
        self.assertEqual(blocked.status_code, 409, blocked.text)
        self.assertIn("Eve Ash", blocked.json()["detail"])

        other, _ = self._gym_coach("Elsewhere")
        self.assertEqual(self.client.get(f"/api/calendar/schedule?calendar_id={calendar_id}", headers=other).status_code, 403)
        self.assertEqual(self.client.put(f"/api/calendars/{calendar_id}", json={"name": "Mine"}, headers=other).status_code, 403)
        self.assertEqual([c["id"] for c in self.client.get("/api/calendars", headers=other).json()], [])
        wrong_gym = self.client.put(f"/api/users/{eve}", json={"calendar_id": 999999}, headers=auth)
        self.assertEqual(wrong_gym.status_code, 400)

        self.client.put(f"/api/calendars/{calendar_id}", json={"athlete_ids": []}, headers=auth)
        gone = self.client.delete(f"/api/calendars/{calendar_id}", headers=auth)
        self.assertEqual(gone.status_code, 200, gone.text)
        self.assertEqual(self.client.get("/api/assignments", params={"calendar_id": calendar_id}, headers=auth).json(), [])
        self.assertNotIn(calendar_id, [c["id"] for c in self.client.get("/api/calendars", headers=auth).json()])
        ctx = self.client.get("/api/gym/context", headers=auth).json()
        self.assertEqual(next(a for a in ctx["athletes"] if a["id"] == eve)["calendar_name"], "Eve Ash")

    def test_legacy_rows_move_onto_calendars(self):
        auth, team_id = self._gym_coach("Legacy")
        rows = self._athletes(auth, team_id, ["Old Timer", "New Joiner"])
        old, new = (r["user"]["id"] for r in rows)
        direct = self._workout(auth, "Own day", "2026-10-05")
        shared = self._workout(auth, "Team day", "2026-10-06")
        db = SessionLocal()
        try:
            for user in db.query(User).filter(User.id.in_([old, new])).all():
                user.calendar_id = None
            db.add(WorkoutAssignment(workout_id=direct["id"], user_id=old, scheduled_date="2026-10-05", notes="legacy"))
            db.add(WorkoutAssignment(workout_id=shared["id"], group_id=team_id, scheduled_date="2026-10-06", notes="legacy"))
            db.add(WorkoutAssignment(workout_id=shared["id"], user_id=old, scheduled_date="2026-10-06", notes="Saved from group"))
            gym_id = db.query(Group).filter(Group.id == team_id).one().gym_id
            db.add(WeekNote(gym_id=gym_id, group_id=team_id, week_start="2026-10-04", body="Team note"))
            db.commit()
            crud.migrate_to_calendars(db)
            crud.migrate_to_calendars(db)  # safe to run twice

            old_user = db.query(User).filter(User.id == old).one()
            new_user = db.query(User).filter(User.id == new).one()
            self.assertEqual(db.query(Calendar).filter(Calendar.id == old_user.calendar_id).one().name, "Old Timer")
            own = db.query(WorkoutAssignment).filter(WorkoutAssignment.workout_id == direct["id"]).one()
            self.assertEqual(own.calendar_id, old_user.calendar_id)
            team_calendar = db.query(Calendar).filter(Calendar.name == f"Legacy Team {self.stamp}").one()
            team_rows = db.query(WorkoutAssignment).filter(WorkoutAssignment.calendar_id == team_calendar.id).all()
            self.assertEqual([r.group_id for r in team_rows], [None])
            self.assertEqual(db.query(WorkoutAssignment).filter(WorkoutAssignment.group_id == team_id).count(), 0)
            # The member who never got a copy of the team day has one now; the other keeps a single copy.
            joiner_days = db.query(WorkoutAssignment).filter(WorkoutAssignment.calendar_id == new_user.calendar_id).all()
            self.assertEqual([(r.workout_id, r.scheduled_date) for r in joiner_days], [(shared["id"], "2026-10-06")])
            timer_days = db.query(WorkoutAssignment).filter(WorkoutAssignment.calendar_id == old_user.calendar_id, WorkoutAssignment.scheduled_date == "2026-10-06").count()
            self.assertEqual(timer_days, 1)
            note = db.query(WeekNote).filter(WeekNote.calendar_id == team_calendar.id).one()
            self.assertEqual((note.body, note.group_id), ("Team note", None))
        finally:
            db.close()
        for_new = self.client.get(f"/api/calendar/schedule?user_id={new}", headers=auth).json()
        self.assertEqual([row["workout"]["id"] for row in for_new], [shared["id"]])


if __name__ == "__main__":
    unittest.main()
