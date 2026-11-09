"""The exercise and chain library per coach: hide, unhide, and remove from that coach's own programming."""
import os
import tempfile
import unittest
import uuid

_db = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
_db.close()
os.environ["DATABASE_URL"] = f"sqlite:///{_db.name}"
os.environ["SEED_DATA_PATH"] = "/tmp/wourkout-no-seed.json"

from fastapi.testclient import TestClient  # noqa: E402

from app import crud  # noqa: E402
from app.database import Base, SessionLocal, engine  # noqa: E402
from app.main import app  # noqa: E402
from app.models import (  # noqa: E402
    CoachHiddenExercise, Exercise, GymHiddenExercise, PersonalRecord, SetLog, User, WorkoutExercise,
)


class LibraryScopeTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        Base.metadata.create_all(bind=engine)
        cls.client = TestClient(app)

    def setUp(self):
        self.stamp = f"{uuid.uuid4().hex[:10]}-{self._testMethodName}"

    def _auth(self, token):
        return {"Authorization": f"Bearer {token}"}

    def _gym(self, label="Lib"):
        reg = self.client.post("/api/auth/register", json={
            "name": f"{label} Coach",
            "email": f"{label.lower()}.{self.stamp}@example.com",
            "username": f"{label.lower()}_{uuid.uuid4().hex[:10]}",
            "password": "Password123!",
            "role": "coach",
        })
        self.assertEqual(reg.status_code, 201, reg.text)
        auth = self._auth(reg.json()["access_token"])
        gym = self.client.post("/api/gyms", json={"name": f"{label} Gym {self.stamp}"}, headers=auth)
        self.assertEqual(gym.status_code, 201, gym.text)
        return auth

    def _team(self, auth, name):
        team = self.client.post("/api/groups", json={"name": f"{name} {self.stamp}"}, headers=auth)
        self.assertEqual(team.status_code, 201, team.text)
        return team.json()["id"]

    def _second_coach(self, admin_auth, name="Second Coach"):
        made = self.client.post("/api/gym/coaches", json={
            "name": name, "email": f"second.{uuid.uuid4().hex[:8]}@example.com",
        }, headers=admin_auth)
        self.assertEqual(made.status_code, 201, made.text)
        return self._login(made.json())

    def _login(self, row):
        res = self.client.post("/api/auth/login", json={
            "email_or_username": row["user"]["email"], "password": row["temporary_password"],
        })
        self.assertEqual(res.status_code, 200, res.text)
        return self._auth(res.json()["access_token"])

    def _athletes(self, auth, team_id, names):
        res = self.client.post("/api/gym/athletes/bulk", json={
            "team_id": team_id, "athletes": [{"name": n} for n in names],
        }, headers=auth)
        self.assertEqual(res.status_code, 201, res.text)
        return res.json()["users"]

    def _exercise(self, auth, name, **extra):
        payload = {"name": f"{name} {self.stamp}", "category": "Strength"}
        payload.update(extra)
        res = self.client.post("/api/exercises", json=payload, headers=auth)
        self.assertEqual(res.status_code, 201, res.text)
        return res.json()

    def _day(self, auth, athlete_id, day, exercise_ids, chain=None):
        rows = []
        for index, exercise_id in enumerate(exercise_ids):
            row = {"exercise_id": exercise_id, "prescribed_sets": 2, "target_reps": "5,5", "target_weight": "", "order_index": index}
            if chain and exercise_id in chain["exercise_ids"]:
                row.update({"chain_id": chain["id"], "chain_instance": f"c{chain['id']}x{day}", "chain_name": chain["name"], "chain_kind": "Warm up"})
            rows.append(row)
        workout = self.client.post("/api/workouts", json={
            "title": f"Day {day}", "program_name": "wourkout", "calendar_date": day, "scheduled_date": day, "exercises": rows,
        }, headers=auth)
        self.assertEqual(workout.status_code, 201, workout.text)
        assigned = self.client.post("/api/assignments", json={
            "workout_id": workout.json()["id"], "user_id": athlete_id, "scheduled_date": day,
        }, headers=auth)
        self.assertEqual(assigned.status_code, 201, assigned.text)
        return self.client.get(f"/api/workouts/{workout.json()['id']}", headers=auth).json()

    def _names(self, auth, workout_id):
        workout = self.client.get(f"/api/workouts/{workout_id}", headers=auth).json()
        return [row["exercise"]["name"] for row in workout["exercises"]]

    def test_hide_is_per_coach_and_can_be_undone(self):
        admin = self._gym()
        other = self._second_coach(admin)
        squat = self._exercise(admin, "Squat")

        hidden = self.client.post("/api/gym/hidden-exercises", json={"exercise_id": squat["id"]}, headers=admin)
        self.assertEqual(hidden.status_code, 201, hidden.text)
        mine = self.client.get("/api/gym/context", headers=admin).json()
        theirs = self.client.get("/api/gym/context", headers=other).json()
        self.assertIn(squat["id"], mine["hidden_exercise_ids"])
        self.assertNotIn(squat["id"], theirs["hidden_exercise_ids"])

        shown = self.client.delete(f"/api/gym/hidden-exercises/{squat['id']}", headers=admin)
        self.assertEqual(shown.status_code, 200, shown.text)
        again = self.client.get("/api/gym/context", headers=admin).json()
        self.assertNotIn(squat["id"], again["hidden_exercise_ids"])

    def test_chain_hide_is_per_coach_and_can_be_undone(self):
        admin = self._gym()
        other = self._second_coach(admin)
        squat = self._exercise(admin, "Squat")
        chain = self.client.post("/api/chains", json={
            "name": f"Prep {self.stamp}", "kind": "Warm up", "members": [{"exercise_id": squat["id"]}],
        }, headers=admin).json()

        hidden = self.client.post("/api/gym/hidden-chains", json={"chain_id": chain["id"]}, headers=admin)
        self.assertEqual(hidden.status_code, 201, hidden.text)
        self.assertIn(chain["id"], self.client.get("/api/gym/context", headers=admin).json()["hidden_chain_ids"])
        self.assertNotIn(chain["id"], self.client.get("/api/gym/context", headers=other).json()["hidden_chain_ids"])
        # The shared chain is still there for everyone.
        self.assertTrue(any(row["id"] == chain["id"] for row in self.client.get("/api/chains", headers=other).json()))

        shown = self.client.delete(f"/api/gym/hidden-chains/{chain['id']}", headers=admin)
        self.assertEqual(shown.status_code, 200, shown.text)
        self.assertNotIn(chain["id"], self.client.get("/api/gym/context", headers=admin).json()["hidden_chain_ids"])

    def test_athletes_cannot_hide_or_remove(self):
        admin = self._gym()
        team = self._team(admin, "Team")
        athlete = self._login(self._athletes(admin, team, ["Al Ray"])[0])
        squat = self._exercise(admin, "Squat")
        self.assertEqual(self.client.post("/api/gym/hidden-exercises", json={"exercise_id": squat["id"]}, headers=athlete).status_code, 403)
        self.assertEqual(self.client.post(f"/api/exercises/{squat['id']}/remove-from-programming", headers=athlete).status_code, 403)
        self.assertEqual(self.client.get(f"/api/exercises/{squat['id']}/programming", headers=athlete).status_code, 403)

    def test_remove_strips_only_that_coachs_programming_and_keeps_prs(self):
        admin = self._gym()
        other = self._second_coach(admin)
        mine_team = self._team(admin, "Mine")
        their_team = self._team(other, "Theirs")
        mine_rows = self._athletes(admin, mine_team, ["Ana Diaz", "Ben Fox"])
        their_rows = self._athletes(other, their_team, ["Cal Ray"])
        ana, ben = (row["user"]["id"] for row in mine_rows)
        cal = their_rows[0]["user"]["id"]

        squat = self._exercise(admin, "Squat")
        press = self._exercise(admin, "Press")
        past = self._day(admin, ana, "2026-01-05", [squat["id"], press["id"]])
        future = self._day(admin, ben, "2027-03-01", [squat["id"]])
        theirs = self._day(other, cal, "2026-01-05", [squat["id"], press["id"]])

        # Ana logs a set of squats, and holds a squat PR.
        ana_auth = self._login(mine_rows[0])
        session = self.client.get(f"/api/sessions/active/{past['id']}", headers=ana_auth)
        self.assertEqual(session.status_code, 200, session.text)
        squat_row = next(row for row in past["exercises"] if row["exercise_id"] == squat["id"])
        logged = self.client.post(f"/api/sessions/{session.json()['id']}/sets", params={
            "workout_exercise_id": squat_row["id"], "set_number": 1, "weight": 100, "reps": 5, "completed": "true",
        }, headers=ana_auth)
        self.assertEqual(logged.status_code, 200, logged.text)
        db = SessionLocal()
        try:
            db.add(PersonalRecord(exercise_id=squat["id"], user_id=ana, weight=100, reps=5))
            db.commit()
        finally:
            db.close()

        slot = self.client.get(f"/api/workout-exercises/{squat_row['id']}/logged-sets", headers=admin)
        self.assertEqual(slot.status_code, 200, slot.text)
        self.assertEqual(slot.json(), {"days": 1, "athletes": 1, "logged_sets": 1})
        self.assertEqual(self.client.get(f"/api/workout-exercises/{squat_row['id']}/logged-sets", headers=ana_auth).status_code, 403)

        use = self.client.get(f"/api/exercises/{squat['id']}/programming", headers=admin)
        self.assertEqual(use.status_code, 200, use.text)
        self.assertEqual(use.json(), {"days": 2, "athletes": 2, "logged_sets": 1})

        removed = self.client.post(f"/api/exercises/{squat['id']}/remove-from-programming", headers=admin)
        self.assertEqual(removed.status_code, 200, removed.text)
        body = removed.json()
        self.assertEqual(sorted(body["workout_ids"]), sorted([past["id"], future["id"]]))
        self.assertEqual((body["days"], body["athletes"], body["logged_sets"]), (2, 2, 1))

        self.assertEqual(self._names(admin, past["id"]), [press["name"]])
        self.assertEqual(self._names(admin, future["id"]), [])
        self.assertEqual(self.client.get(f"/api/workouts/{future['id']}", headers=admin).json()["title"], "Rest")
        # The other coach's day is untouched, and the shared exercise still exists.
        self.assertEqual(self._names(other, theirs["id"]), [squat["name"], press["name"]])
        listed = self.client.get("/api/exercises", params={"search": squat["name"]}, headers=other).json()
        self.assertTrue(any(row["id"] == squat["id"] for row in listed))

        db = SessionLocal()
        try:
            self.assertEqual(db.query(SetLog).filter(SetLog.workout_exercise_id == squat_row["id"]).count(), 0)
            self.assertEqual(db.query(WorkoutExercise).filter(WorkoutExercise.id == squat_row["id"]).count(), 0)
            self.assertEqual(db.query(PersonalRecord).filter(PersonalRecord.exercise_id == squat["id"], PersonalRecord.user_id == ana).count(), 1)
        finally:
            db.close()

        # Removing also hides it for that coach only.
        self.assertIn(squat["id"], self.client.get("/api/gym/context", headers=admin).json()["hidden_exercise_ids"])
        self.assertNotIn(squat["id"], self.client.get("/api/gym/context", headers=other).json()["hidden_exercise_ids"])
        self.assertEqual(self.client.get(f"/api/exercises/{squat['id']}/programming", headers=admin).json()["days"], 0)

    def test_remove_chain_takes_its_blocks_off_that_coachs_days(self):
        admin = self._gym()
        other = self._second_coach(admin)
        mine_team = self._team(admin, "Mine")
        their_team = self._team(other, "Theirs")
        ana = self._athletes(admin, mine_team, ["Ana Diaz"])[0]["user"]["id"]
        cal = self._athletes(other, their_team, ["Cal Ray"])[0]["user"]["id"]
        skip = self._exercise(admin, "Skip")
        squat = self._exercise(admin, "Squat")
        chain = self.client.post("/api/chains", json={
            "name": f"Prep {self.stamp}", "kind": "Warm up", "members": [{"exercise_id": skip["id"]}],
        }, headers=admin).json()
        block = {"id": chain["id"], "name": chain["name"], "exercise_ids": [skip["id"]]}
        mine = self._day(admin, ana, "2026-02-02", [skip["id"], squat["id"]], chain=block)
        theirs = self._day(other, cal, "2026-02-02", [skip["id"], squat["id"]], chain=block)

        use = self.client.get(f"/api/chains/{chain['id']}/programming", headers=admin).json()
        self.assertEqual((use["days"], use["athletes"]), (1, 1))
        removed = self.client.post(f"/api/chains/{chain['id']}/remove-from-programming", headers=admin)
        self.assertEqual(removed.status_code, 200, removed.text)
        self.assertEqual(removed.json()["workout_ids"], [mine["id"]])
        self.assertEqual(self._names(admin, mine["id"]), [squat["name"]])
        self.assertEqual(self._names(other, theirs["id"]), [skip["name"], squat["name"]])
        self.assertIn(chain["id"], self.client.get("/api/gym/context", headers=admin).json()["hidden_chain_ids"])
        self.assertTrue(any(row["id"] == chain["id"] for row in self.client.get("/api/chains", headers=other).json()))

    def test_gym_wide_hidden_rows_move_to_each_coach_once(self):
        admin = self._gym()
        other = self._second_coach(admin)
        team = self._team(admin, "Team")
        athlete_id = self._athletes(admin, team, ["Al Ray"])[0]["user"]["id"]
        squat = self._exercise(admin, "Squat")
        db = SessionLocal()
        try:
            gym_id = db.query(User).filter(User.id == athlete_id).one().gym_id
            db.add(GymHiddenExercise(gym_id=gym_id, exercise_id=squat["id"]))
            db.commit()
            crud.migrate_hidden_to_coaches(db)
            self.assertEqual(db.query(GymHiddenExercise).filter(GymHiddenExercise.gym_id == gym_id).count(), 0)
            holders = {row.user_id for row in db.query(CoachHiddenExercise).filter(CoachHiddenExercise.exercise_id == squat["id"]).all()}
            self.assertNotIn(athlete_id, holders)
            self.assertEqual(len(holders), 2)
            self.assertEqual(crud.migrate_hidden_to_coaches(db), 0)
        finally:
            db.close()
        self.assertIn(squat["id"], self.client.get("/api/gym/context", headers=admin).json()["hidden_exercise_ids"])
        self.assertIn(squat["id"], self.client.get("/api/gym/context", headers=other).json()["hidden_exercise_ids"])

    def test_intensity_takes_a_range(self):
        admin = self._gym()
        ranged = self._exercise(admin, "Tempo squat", intensity_kind="rpe", intensity_value="5-7")
        self.assertEqual((ranged["intensity_kind"], ranged["intensity_value"]), ("rpe", "5-7"))
        spaced = self._exercise(admin, "Pause squat", intensity_kind="pct1rm", intensity_value="70 – 80%")
        self.assertEqual(spaced["intensity_value"], "70-80")
        same = self._exercise(admin, "Box squat", intensity_kind="rir", intensity_value="3-3")
        self.assertEqual(same["intensity_value"], "3")
        for bad in ("7-5", "5-11", "0-4", "5-", "a-b"):
            res = self.client.post("/api/exercises", json={
                "name": f"Bad {bad} {self.stamp}", "category": "Strength", "intensity_kind": "rpe", "intensity_value": bad,
            }, headers=admin)
            self.assertEqual(res.status_code, 400, f"{bad}: {res.text}")
        db = SessionLocal()
        try:
            row = db.query(Exercise).filter(Exercise.id == ranged["id"]).one()
            self.assertIn("Intensities:5-7,5-7", crud._tagged_defaults(row, 2))
        finally:
            db.close()

    def test_time_and_distance_defaults_sit_beside_reps(self):
        admin = self._gym()
        sprint = self._exercise(admin, "Sprint", default_sets=3, default_reps="2", default_distance="10")
        plank = self._exercise(admin, "Plank", default_sets=2, default_reps="", default_time="30")
        self.assertEqual(plank["default_time"], "30")
        db = SessionLocal()
        try:
            notes = crud._tagged_defaults(db.query(Exercise).filter(Exercise.id == sprint["id"]).one(), 3)
            self.assertIn("Distances:10,10,10", notes)
            self.assertIn("Flags:dose2,trackDistance", notes)
            self.assertNotIn("Props:", notes)
            held = crud._tagged_defaults(db.query(Exercise).filter(Exercise.id == plank["id"]).one(), 2)
            self.assertIn("Times:30,30", held)
            self.assertIn("Flags:dose2,trackTime,noTrackReps", held)
        finally:
            db.close()


if __name__ == "__main__":
    unittest.main()
