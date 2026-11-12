"""Round 8: phases on a calendar, questions built into questionnaires, and chain members by time or distance."""
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
from app.models import Exercise  # noqa: E402


class Round8Tests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        Base.metadata.create_all(bind=engine)
        cls.client = TestClient(app)

    def setUp(self):
        self.stamp = f"{uuid.uuid4().hex[:10]}-{self._testMethodName}"

    def _auth(self, token):
        return {"Authorization": f"Bearer {token}"}

    def _gym_coach(self, label):
        reg = self.client.post("/api/auth/register", json={
            "name": f"{label} Coach",
            "email": f"{label.lower()}.{self.stamp}@example.com",
            "username": f"{label.lower()}_{self.stamp[:10]}",
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

    def _athlete(self, auth, team_id, name):
        res = self.client.post("/api/gym/athletes/bulk", json={"team_id": team_id, "athletes": [{"name": name}]}, headers=auth)
        self.assertEqual(res.status_code, 201, res.text)
        row = res.json()["users"][0]
        login = self.client.post("/api/auth/login", json={
            "email_or_username": row["user"]["email"], "password": row["temporary_password"],
        })
        self.assertEqual(login.status_code, 200, login.text)
        return row["user"]["id"], self._auth(login.json()["access_token"])

    # ----- phases -----
    def test_phases_group_days_on_one_calendar(self):
        auth, team_id = self._gym_coach("Phase")
        athlete_id, athlete_auth = self._athlete(auth, team_id, "Pia Lane")
        calendar_id = self.client.post("/api/calendars", json={"name": "Block"}, headers=auth).json()["id"]

        made = self.client.post("/api/calendar/phases", json={
            "calendar_id": calendar_id, "name": " Strength ", "notes": "Heavy triples",
            "start_date": "2026-11-29", "end_date": "2026-11-01",
        }, headers=auth)
        self.assertEqual(made.status_code, 201, made.text)
        strength = made.json()
        # Dates are stored in order, the name is trimmed, and a colour is picked when none is sent.
        self.assertEqual((strength["start_date"], strength["end_date"]), ("2026-11-01", "2026-11-29"))
        self.assertEqual(strength["name"], "Strength")
        self.assertRegex(strength["color"], r"^#[0-9a-f]{6}$")

        overlap = self.client.post("/api/calendar/phases", json={
            "calendar_id": calendar_id, "name": "Power", "start_date": "2026-11-29", "end_date": "2026-12-12",
        }, headers=auth)
        self.assertEqual(overlap.status_code, 409, overlap.text)
        self.assertIn("Strength", overlap.json()["detail"])

        power = self.client.post("/api/calendar/phases", json={
            "calendar_id": calendar_id, "name": "Power", "color": "#7C3AED",
            "start_date": "2026-11-30", "end_date": "2026-12-12",
        }, headers=auth)
        self.assertEqual(power.status_code, 201, power.text)
        self.assertEqual(power.json()["color"], "#7c3aed")
        self.assertNotEqual(power.json()["color"], strength["color"])

        listed = self.client.get(f"/api/calendar/phases?calendar_id={calendar_id}", headers=auth).json()
        self.assertEqual([row["name"] for row in listed], ["Strength", "Power"])

        # A phase can be renamed and moved, but not onto its neighbour.
        moved = self.client.put(f"/api/calendar/phases/{strength['id']}", json={
            "calendar_id": calendar_id, "name": "Strength 1", "notes": "Heavy doubles", "color": strength["color"],
            "start_date": "2026-11-08", "end_date": "2026-11-28",
        }, headers=auth)
        self.assertEqual(moved.status_code, 200, moved.text)
        self.assertEqual(moved.json()["notes"], "Heavy doubles")
        blocked = self.client.put(f"/api/calendar/phases/{strength['id']}", json={
            "calendar_id": calendar_id, "name": "Strength 1", "start_date": "2026-11-08", "end_date": "2026-12-01",
        }, headers=auth)
        self.assertEqual(blocked.status_code, 409, blocked.text)

        # Another calendar has its own phases, and the same days are free there.
        mine = self.client.get(f"/api/calendar/phases?user_id={athlete_id}", headers=auth)
        self.assertEqual(mine.status_code, 200, mine.text)
        self.assertEqual(mine.json(), [])
        own = self.client.post("/api/calendar/phases", json={
            "user_id": athlete_id, "name": "Base", "start_date": "2026-11-08", "end_date": "2026-11-14",
        }, headers=auth)
        self.assertEqual(own.status_code, 201, own.text)
        self.assertEqual(self.client.delete(f"/api/calendar/phases/{own.json()['id']}", headers=athlete_auth).status_code, 403)
        self.assertEqual(self.client.delete(f"/api/calendar/phases/{own.json()['id']}", headers=auth).status_code, 204)
        self.assertEqual(self.client.get(f"/api/calendar/phases?user_id={athlete_id}", headers=auth).json(), [])

        # Athletes never see phases, and a coach in another gym cannot reach them.
        self.assertEqual(self.client.get(f"/api/calendar/phases?calendar_id={calendar_id}", headers=athlete_auth).status_code, 403)
        other_auth, _ = self._gym_coach("Rival")
        self.assertIn(self.client.get(f"/api/calendar/phases?calendar_id={calendar_id}", headers=other_auth).status_code, (403, 404))
        self.assertEqual(self.client.delete(f"/api/calendar/phases/{strength['id']}", headers=other_auth).status_code, 404)

        bad = self.client.post("/api/calendar/phases", json={
            "calendar_id": calendar_id, "name": "", "start_date": "2027-01-03", "end_date": "2027-01-09",
        }, headers=auth)
        self.assertEqual(bad.status_code, 400, bad.text)

        gone = self.client.delete(f"/api/calendar/phases/{strength['id']}", headers=auth)
        self.assertEqual(gone.status_code, 204, gone.text)
        left = self.client.get(f"/api/calendar/phases?calendar_id={calendar_id}", headers=auth).json()
        self.assertEqual([row["name"] for row in left], ["Power"])

        # Deleting the calendar takes its phases with it.
        self.assertIn(self.client.delete(f"/api/calendars/{calendar_id}", headers=auth).status_code, (200, 204))
        db = SessionLocal()
        try:
            self.assertEqual(db.query(crud.Phase).filter(crud.Phase.calendar_id == calendar_id).count(), 0)
        finally:
            db.close()

    # ----- questions and questionnaires -----
    def test_a_questionnaire_is_a_string_of_created_questions(self):
        auth, team_id = self._gym_coach("Quiz")
        _, athlete_auth = self._athlete(auth, team_id, "Quin Ash")

        def question(text, kind):
            res = self.client.post("/api/questions", json={"text": f"{text} {self.stamp}?", "answer_type": kind}, headers=auth)
            self.assertEqual(res.status_code, 201, res.text)
            return res.json()

        sleep = question("How did you sleep", "1-10 scale")
        sore = question("Any soreness", "Yes / No")
        notes = question("Anything else", "free text")
        self.assertEqual([sleep["answer_type"], sore["answer_type"], notes["answer_type"]], ["scale", "yes_no", "text"])
        # The same question written twice is one question.
        again = self.client.post("/api/questions", json={"text": sleep["text"], "answer_type": "scale"}, headers=auth)
        self.assertEqual(again.json()["id"], sleep["id"])
        self.assertEqual(self.client.post("/api/questions", json={"text": "Mood?", "answer_type": "stars"}, headers=auth).status_code, 400)
        self.assertEqual(self.client.post("/api/questions", json={"text": "  ", "answer_type": "text"}, headers=auth).status_code, 400)
        self.assertEqual(self.client.post("/api/questions", json={"text": "Athlete?", "answer_type": "text"}, headers=athlete_auth).status_code, 403)

        name = f"Readiness {self.stamp}"
        made = self.client.post("/api/questionnaires", json={"name": name, "question_ids": [sore["id"], sleep["id"]]}, headers=auth)
        self.assertEqual(made.status_code, 201, made.text)
        form = made.json()
        self.assertEqual(form["category"], "Questionnaire")
        self.assertEqual([q["id"] for q in form["questions"]], [sore["id"], sleep["id"]])

        self.assertEqual(self.client.post("/api/questionnaires", json={"name": name, "question_ids": [sleep["id"]]}, headers=auth).status_code, 400)
        self.assertEqual(self.client.post("/api/questionnaires", json={"name": name + " b", "question_ids": []}, headers=auth).status_code, 400)
        self.assertEqual(self.client.post("/api/questionnaires", json={"name": name + " c", "question_ids": [sleep["id"], sleep["id"]]}, headers=auth).status_code, 400)
        self.assertEqual(self.client.post("/api/questionnaires", json={"name": name + " d", "question_ids": [999999]}, headers=auth).status_code, 400)

        # Reordering, adding, and renaming all go through one save.
        edited = self.client.put(f"/api/questionnaires/{form['id']}", json={
            "name": name + " v2", "question_ids": [sleep["id"], notes["id"], sore["id"]],
        }, headers=auth)
        self.assertEqual(edited.status_code, 200, edited.text)
        self.assertEqual(edited.json()["name"], name + " v2")
        self.assertEqual([q["answer_type"] for q in edited.json()["questions"]], ["scale", "text", "yes_no"])

        # The questions ride along wherever the questionnaire is read, including on a day.
        listed = next(row for row in self.client.get("/api/exercises", headers=auth).json() if row["id"] == form["id"])
        self.assertEqual(len(listed["questions"]), 3)
        day = self.client.post("/api/workouts", json={
            "title": f"Check in {self.stamp}", "program_name": f"Q {self.stamp}",
            "calendar_date": "2026-11-16", "scheduled_date": "2026-11-16", "day_of_week": "Monday", "week_number": 1,
            "exercises": [{"exercise_id": form["id"], "superset_group": "A", "order_index": 0, "prescribed_sets": 1, "target_reps": "1", "target_weight": "0", "notes": ""}],
        }, headers=auth)
        self.assertEqual(day.status_code, 201, day.text)
        placed = self.client.get(f"/api/workouts/{day.json()['id']}", headers=auth).json()["exercises"][0]
        self.assertEqual([q["text"] for q in placed["exercise"]["questions"]], [sleep["text"], notes["text"], sore["text"]])

        # Rewording a question rewords it everywhere it is asked.
        reworded = self.client.put(f"/api/questions/{sleep['id']}", json={"text": f"Sleep quality {self.stamp}?", "answer_type": "scale"}, headers=auth)
        self.assertEqual(reworded.status_code, 200, reworded.text)
        placed = self.client.get(f"/api/workouts/{day.json()['id']}", headers=auth).json()["exercises"][0]
        self.assertEqual(placed["exercise"]["questions"][0]["text"], f"Sleep quality {self.stamp}?")

        # A question in use cannot be deleted; a spare one can.
        self.assertEqual(self.client.delete(f"/api/questions/{sleep['id']}", headers=auth).status_code, 409)
        spare = question("Spare", "text")
        self.assertEqual(self.client.delete(f"/api/questions/{spare['id']}", headers=auth).status_code, 204)
        self.assertNotIn(spare["id"], [q["id"] for q in self.client.get("/api/questions", headers=auth).json()])

    def test_older_questionnaires_get_real_questions(self):
        auth, _ = self._gym_coach("Legacy")
        # Made the plain way, a questionnaire starts with the standard four.
        plain = self.client.post("/api/exercises", json={"name": f"Wellness {self.stamp}", "category": "Questionnaire"}, headers=auth)
        self.assertEqual(plain.status_code, 201, plain.text)
        self.assertEqual([q["answer_type"] for q in plain.json()["questions"]], ["scale", "scale", "scale", "text"])

        # One saved before questions existed is filled in at startup, from its own prompt lines when it has them.
        db = SessionLocal()
        try:
            old = Exercise(name=f"Old form {self.stamp}", category="Questionnaire", default_notes="Hydrated?\n\nAte breakfast?")
            db.add(old)
            db.commit()
            crud.backfill_questionnaire_questions(db)
            crud.backfill_questionnaire_questions(db)
            db.refresh(old)
            self.assertEqual([(q.text, q.answer_type) for q in old.questions], [("Hydrated?", "text"), ("Ate breakfast?", "text")])
        finally:
            db.close()

    # ----- chains by reps, time, or distance -----
    def test_chain_members_track_reps_time_or_distance(self):
        auth, _ = self._gym_coach("Dose")

        def exercise(name, **extra):
            res = self.client.post("/api/exercises", json=dict({"name": f"{name} {self.stamp}", "category": "Strength"}, **extra), headers=auth)
            self.assertEqual(res.status_code, 201, res.text)
            return res.json()

        plank = exercise("Plank", default_sets=2, default_reps="10")
        carry = exercise("Carry", default_sets=2, default_reps="10")
        squat = exercise("Squat", default_sets=3, default_reps="5")
        made = self.client.post("/api/chains", json={
            "name": f"Core {self.stamp}", "kind": "Warm up",
            "members": [
                {"exercise_id": plank["id"], "sets": 3, "time": "30s"},
                {"exercise_id": squat["id"]},
            ],
        }, headers=auth)
        self.assertEqual(made.status_code, 201, made.text)
        chain = made.json()
        self.assertEqual(chain["members"][0]["time"], "30")
        self.assertIsNone(chain["members"][0]["distance"])
        self.assertIsNone(chain["members"][1]["time"])

        instance = f"c{chain['id']}x1"
        day = self.client.post("/api/workouts", json={
            "title": f"Core day {self.stamp}", "program_name": f"D {self.stamp}",
            "calendar_date": "2026-11-17", "scheduled_date": "2026-11-17", "day_of_week": "Tuesday", "week_number": 1,
            "exercises": [
                {
                    "exercise_id": member["exercise_id"], "superset_group": "", "order_index": index,
                    "prescribed_sets": 3, "target_reps": "10,10,10", "target_weight": "0",
                    "notes": "Brace hard\nRests:60,60,60\nProps:rest\nFlags:dose2", "chain_id": chain["id"], "chain_instance": instance,
                    "chain_name": chain["name"], "chain_kind": chain["kind"], "chain_order": index,
                }
                for index, member in enumerate(chain["members"])
            ],
        }, headers=auth)
        self.assertEqual(day.status_code, 201, day.text)
        workout_id = day.json()["id"]

        edited = self.client.post(f"/api/chains/{chain['id']}/edit", json={
            "scope": "everywhere", "source": "library", "name": chain["name"], "kind": chain["kind"],
            "members": [
                {"exercise_id": plank["id"], "sets": 2, "time": "45"},
                {"exercise_id": squat["id"], "reps": "8"},
                {"exercise_id": carry["id"], "sets": 2, "distance": "20", "reps": "4"},
            ],
        }, headers=auth)
        self.assertEqual(edited.status_code, 200, edited.text)
        self.assertEqual([m["time"] for m in edited.json()["chain"]["members"]], ["45", None, None])
        self.assertEqual(edited.json()["chain"]["members"][2]["distance"], "20")

        rows = {row["exercise_id"]: row for row in self.client.get(f"/api/workouts/{workout_id}", headers=auth).json()["exercises"]}

        def flags(row):
            line = next(part for part in row["notes"].split("\n") if part.startswith("Flags:"))
            return set(line[len("Flags:"):].split(","))

        # Time only: the plank is held for seconds and counts no reps. Its other lines are untouched.
        plank_row = rows[plank["id"]]
        self.assertEqual(plank_row["prescribed_sets"], 2)
        self.assertIn("Times:45,45", plank_row["notes"].split("\n"))
        self.assertEqual(flags(plank_row), {"dose2", "trackTime", "noTrackReps"})
        self.assertIn("Brace hard", plank_row["notes"])
        self.assertIn("Rests:60,60,60", plank_row["notes"])
        # Reps only: no time or distance line.
        squat_row = rows[squat["id"]]
        self.assertEqual(squat_row["target_reps"], "8,8,8")
        self.assertEqual(flags(squat_row), {"dose2"})
        self.assertNotIn("Times:", squat_row["notes"])
        # Reps and distance together, on a member the edit added to the day.
        carry_row = rows[carry["id"]]
        self.assertEqual(carry_row["target_reps"], "4,4")
        self.assertIn("Distances:20,20", carry_row["notes"].split("\n"))
        self.assertEqual(flags(carry_row), {"dose2", "trackDistance"})


if __name__ == "__main__":
    unittest.main()
