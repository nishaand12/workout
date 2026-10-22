"""Library chains: a named group of exercises, separate from supersets and stations circuits."""
import os
import tempfile
import unittest
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

_db = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
_db.close()
os.environ["DATABASE_URL"] = f"sqlite:///{_db.name}"
os.environ["SEED_DATA_PATH"] = "/tmp/wourkout-no-seed.json"

from fastapi.testclient import TestClient  # noqa: E402

from app.database import Base, SessionLocal, engine  # noqa: E402
from app.main import app  # noqa: E402
from app.models import Group, SetLog, User, Workout, WorkoutAssignment  # noqa: E402
from app import crud  # noqa: E402


def eastern_day(offset):
    today = datetime.now(ZoneInfo("America/New_York")).date()
    return (today + timedelta(days=offset)).isoformat()


class ChainTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        Base.metadata.create_all(bind=engine)
        cls.client = TestClient(app)

    def setUp(self):
        self.stamp = f"{id(self)}-{self._testMethodName}"

    def _exercise(self, name, **extra):
        payload = {"name": f"{name} {self.stamp}", "category": extra.pop("category", "Strength")}
        payload.update(extra)
        res = self.client.post("/api/exercises", json=payload)
        self.assertEqual(res.status_code, 201, res.text)
        return res.json()

    def _chain(self, name, kind, exercise_ids):
        res = self.client.post("/api/chains", json={
            "name": f"{name} {self.stamp}",
            "kind": kind,
            "members": [{"exercise_id": exercise_id} for exercise_id in exercise_ids],
        })
        self.assertEqual(res.status_code, 201, res.text)
        return res.json()

    def _place(self, chain, day, program, letters):
        exercises = []
        for index, member in enumerate(chain["members"]):
            exercise = member["exercise"]
            note = (exercise.get("category") or "") == "Notes"
            exercises.append({
                "exercise_id": member["exercise_id"],
                "superset_group": letters[index],
                "order_index": index,
                "prescribed_sets": 0 if note else 3,
                "target_reps": "" if note else "8",
                "target_weight": "0",
                "notes": exercise.get("default_notes") or "",
                "chain_id": chain["id"],
                "chain_instance": f"c{chain['id']}x1",
                "chain_name": chain["name"],
                "chain_kind": chain["kind"],
                "chain_order": index,
            })
        res = self.client.post("/api/workouts", json={
            "title": f"{chain['name']} {day}",
            "program_name": program,
            "calendar_date": day,
            "scheduled_date": day,
            "day_of_week": "Monday",
            "week_number": 1,
            "exercises": exercises,
        })
        self.assertEqual(res.status_code, 201, res.text)
        return res.json()

    def _edit(self, chain_id, **payload):
        res = self.client.post(f"/api/chains/{chain_id}/edit", json=payload)
        self.assertEqual(res.status_code, 200, res.text)
        return res.json()

    def test_chain_is_a_named_group_without_a_video(self):
        squat = self._exercise("Squat", video_url="https://youtu.be/squatvid", default_sets=4, default_reps="5")
        skip = self._exercise("Skip", category="Warm up", video_url="https://youtu.be/skipvid")
        note = self._exercise("Cue", category="Notes", default_notes="Stay tall", default_sets=0)
        # The same exercise may appear twice, in the order the coach sets.
        chain = self._chain("Ramp", "warm-up", [skip["id"], squat["id"], squat["id"], note["id"]])
        self.assertEqual(chain["kind"], "Warm up")
        self.assertNotIn("video_url", chain)
        self.assertEqual(
            [member["exercise_id"] for member in chain["members"]],
            [skip["id"], squat["id"], squat["id"], note["id"]],
        )
        self.assertEqual(chain["members"][1]["exercise"]["video_url"], "https://youtu.be/squatvid")
        self.assertEqual(chain["members"][0]["exercise"]["video_url"], "https://youtu.be/skipvid")

        circuit = self._chain("Stations plus lifts", "circuit", [squat["id"]])
        self.assertEqual(circuit["kind"], "Circuit")
        cooldown = self._chain("Easy spin", "cooldown", [skip["id"]])
        self.assertEqual(cooldown["kind"], "Cooldown")

        empty = self.client.post("/api/chains", json={"name": f"Empty {self.stamp}", "kind": "Warm up", "members": []})
        self.assertEqual(empty.status_code, 400, empty.text)
        bad = self.client.post("/api/chains", json={"name": f"Bad {self.stamp}", "kind": "Superset", "members": [{"exercise_id": squat["id"]}]})
        self.assertEqual(bad.status_code, 400, bad.text)

    def test_scopes_and_logged_sets_stay(self):
        squat = self._exercise("Squat", video_url="https://youtu.be/squatvid", default_sets=2, default_reps="5")
        press = self._exercise("Press", default_sets=2, default_reps="6")
        note = self._exercise("Cue", category="Notes", default_notes="Breathe", default_sets=0)
        chain = self._chain("Primer", "Warm up", [squat["id"], press["id"]])
        program = f"Chains {self.stamp}"
        past = self._place(chain, eastern_day(-3), program, ["A", "B"])
        today = self._place(chain, eastern_day(0), program, ["C", "D"])
        later = self._place(chain, eastern_day(4), program, ["E", "F"])

        user = self.client.post("/api/users", json={
            "name": f"Athlete {self.stamp}",
            "email": f"athlete.{self.stamp}@example.com",
            "role": "student",
            "title": "Client",
        })
        self.assertEqual(user.status_code, 201, user.text)
        session = self.client.get(f"/api/sessions/active/{today['id']}", params={"user_id": user.json()["id"]})
        self.assertEqual(session.status_code, 200, session.text)
        squat_we = next(row for row in today["exercises"] if row["exercise_id"] == squat["id"])
        logged = self.client.post(
            f"/api/sessions/{session.json()['id']}/sets",
            params={
                "workout_exercise_id": squat_we["id"],
                "set_number": 1,
                "weight": 42.5,
                "reps": 5,
                "completed": True,
                "details": '{"tempo":"20X1"}',
            },
        )
        self.assertEqual(logged.status_code, 200, logged.text)
        before_logs = {
            row["id"]: {
                "workout_exercise_id": row["workout_exercise_id"],
                "set_number": row["set_number"],
                "weight": row["weight"],
                "reps": row["reps"],
                "details": row["details"],
                "completed": row["completed"],
            }
            for row in self.client.get(f"/api/sessions/{session.json()['id']}").json()["set_logs"]
        }
        self.assertTrue(any(row["weight"] == 42.5 for row in before_logs.values()))

        library_one = self._edit(chain["id"], scope="one", source="library", name=f"Library only {self.stamp}", kind="Warm up", members=[
            {"exercise_id": press["id"]}, {"exercise_id": squat["id"]},
        ])
        self.assertEqual(library_one["chain"]["name"], f"Library only {self.stamp}")
        self.assertEqual([member["exercise_id"] for member in library_one["chain"]["members"]], [press["id"], squat["id"]])
        self.assertEqual(library_one["updated_workout_ids"], [])
        self.assertEqual(self.client.get(f"/api/workouts/{past['id']}").json()["exercises"][0]["chain_name"], chain["name"])
        self.assertEqual(self.client.get(f"/api/workouts/{today['id']}").json()["exercises"][0]["exercise_id"], squat["id"])

        day_one = self._edit(chain["id"], scope="one", source="day", workout_id=past["id"], name=f"Past only {self.stamp}", kind="Cooldown", members=[
            {"exercise_id": squat["id"]},
        ])
        self.assertEqual(day_one["updated_workout_ids"], [past["id"]])
        self.assertEqual(day_one["chain"]["name"], f"Library only {self.stamp}")
        self.assertEqual(day_one["chain"]["kind"], "Warm up")
        past_body = self.client.get(f"/api/workouts/{past['id']}").json()
        self.assertEqual(past_body["exercises"][0]["chain_name"], f"Past only {self.stamp}")
        self.assertEqual(past_body["exercises"][0]["chain_kind"], "Cooldown")
        self.assertEqual(past_body["exercises"][0]["chain_id"], chain["id"])
        self.assertEqual(self.client.get(f"/api/workouts/{today['id']}").json()["exercises"][0]["chain_name"], chain["name"])

        day_future = self._edit(chain["id"], scope="future", source="day", workout_id=today["id"], name=f"Ahead {self.stamp}", kind="Circuit", members=[
            {"exercise_id": press["id"]}, {"exercise_id": squat["id"]}, {"exercise_id": note["id"]},
        ])
        self.assertEqual(day_future["chain"]["name"], f"Library only {self.stamp}")
        self.assertCountEqual(day_future["updated_workout_ids"], [today["id"], later["id"]])
        self.assertNotIn(past["id"], day_future["updated_workout_ids"])
        today_body = self.client.get(f"/api/workouts/{today['id']}").json()
        today_chain = [row for row in today_body["exercises"] if row["chain_id"] == chain["id"]]
        self.assertEqual([row["exercise_id"] for row in today_chain], [press["id"], squat["id"], note["id"]])
        self.assertEqual(today_chain[0]["chain_name"], f"Ahead {self.stamp}")
        self.assertEqual(today_chain[2]["prescribed_sets"], 0)
        self.assertEqual(today_chain[1]["exercise"]["video_url"], "https://youtu.be/squatvid")
        squat_row = next(row for row in today_body["exercises"] if row["id"] == squat_we["id"])
        self.assertEqual(squat_row["chain_id"], chain["id"])
        self.assertEqual(self.client.get(f"/api/workouts/{past['id']}").json()["exercises"][0]["chain_name"], f"Past only {self.stamp}")
        later_body = self.client.get(f"/api/workouts/{later['id']}").json()
        self.assertEqual(later_body["exercises"][0]["chain_name"], f"Ahead {self.stamp}")
        self.assertEqual(later_body["exercises"][-1]["prescribed_sets"], 0)

        after = self.client.get(f"/api/sessions/{session.json()['id']}").json()["set_logs"]
        self.assertEqual(len(after), len(before_logs))
        for row in after:
            previous = before_logs[row["id"]]
            self.assertEqual(row["workout_exercise_id"], previous["workout_exercise_id"])
            self.assertEqual(row["set_number"], previous["set_number"])
            self.assertEqual(row["weight"], previous["weight"])
            self.assertEqual(row["reps"], previous["reps"])
            self.assertEqual(row["details"], previous["details"])
            self.assertEqual(row["completed"], previous["completed"])

        # A logged exercise dropped from the chain stays on the day, and its SetLog rows stay.
        self._edit(chain["id"], scope="one", source="day", workout_id=today["id"], name=f"Ahead {self.stamp}", kind="Circuit", members=[
            {"exercise_id": note["id"]},
        ])
        rewritten = self.client.get(f"/api/workouts/{today['id']}").json()["exercises"]
        detached = [row for row in rewritten if row["id"] == squat_we["id"]]
        self.assertEqual(len(detached), 1)
        self.assertIsNone(detached[0]["chain_id"])
        kept_logs = self.client.get(f"/api/sessions/{session.json()['id']}").json()["set_logs"]
        logged_row = next(row for row in kept_logs if row["id"] == logged.json()["id"])
        self.assertEqual(logged_row["workout_exercise_id"], squat_we["id"])
        self.assertEqual(logged_row["weight"], 42.5)
        self.assertEqual(logged_row["reps"], 5)
        self.assertEqual(logged_row["details"], '{"tempo":"20X1"}')

        everywhere = self._edit(chain["id"], scope="everywhere", source="day", workout_id=later["id"], name=f"All days {self.stamp}", kind="Warm up", members=[
            {"exercise_id": squat["id"]}, {"exercise_id": note["id"]},
        ])
        self.assertEqual(everywhere["chain"]["name"], f"All days {self.stamp}")
        self.assertEqual(everywhere["chain"]["kind"], "Warm up")
        self.assertIn(past["id"], everywhere["updated_workout_ids"])
        self.assertEqual(self.client.get(f"/api/workouts/{past['id']}").json()["exercises"][0]["chain_name"], f"All days {self.stamp}")
        still = next(row for row in self.client.get(f"/api/sessions/{session.json()['id']}").json()["set_logs"] if row["id"] == logged.json()["id"])
        self.assertEqual(still["weight"], 42.5)
        self.assertEqual(still["workout_exercise_id"], squat_we["id"])

    def test_break_and_copies_keep_the_link_until_broken(self):
        squat = self._exercise("Squat", video_url="https://youtu.be/squatvid")
        press = self._exercise("Press")
        chain = self._chain("Block", "Cooldown", [squat["id"], press["id"]])
        program = f"Copy {self.stamp}"
        day = eastern_day(1)
        workout = self._place(chain, day, program, ["A", "B"])
        plain = self.client.post("/api/workouts", json={
            "title": f"Plain {self.stamp}",
            "program_name": program + " plain",
            "calendar_date": day,
            "scheduled_date": day,
            "day_of_week": "Monday",
            "week_number": 1,
            "exercises": [
                {"exercise_id": squat["id"], "superset_group": "A", "prescribed_sets": 3, "target_reps": "5"},
                {"exercise_id": press["id"], "superset_group": "A", "prescribed_sets": 3, "target_reps": "5"},
            ],
        })
        self.assertEqual(plain.status_code, 201, plain.text)
        plain_rows = plain.json()["exercises"]
        self.assertIsNone(plain_rows[0]["chain_id"])
        self.assertEqual(plain_rows[0]["superset_group"], plain_rows[1]["superset_group"])
        self.assertNotEqual(workout["exercises"][0]["superset_group"], workout["exercises"][1]["superset_group"])

        copied = self.client.post("/api/weeks/copy", json={
            "source_program": program,
            "source_week_number": 1,
            "target_program": program + " next",
            "target_start_date": eastern_day(8),
            "target_week_number": 2,
        })
        self.assertEqual(copied.status_code, 201, copied.text)
        copied_detail = self.client.get(f"/api/workouts/{copied.json()[0]['id']}").json()
        self.assertEqual(copied_detail["exercises"][0]["chain_id"], chain["id"])
        self.assertEqual(copied_detail["exercises"][0]["chain_instance"], workout["exercises"][0]["chain_instance"])

        moved = self.client.post("/api/weeks/add-workout", json={
            "workout_id": workout["id"],
            "program_name": program + " moved",
            "week_number": 3,
            "day_of_week": "Tuesday",
            "calendar_date": eastern_day(2),
            "duplicate_as_new": True,
        })
        self.assertEqual(moved.status_code, 201, moved.text)
        moved_detail = self.client.get(f"/api/workouts/{moved.json()['id']}").json()
        self.assertEqual(moved_detail["exercises"][1]["chain_id"], chain["id"])

        saved = self.client.post("/api/weeks/save-as-program", json={
            "source_program": program,
            "source_week_number": 1,
            "new_program_name": program + " template",
        })
        self.assertEqual(saved.status_code, 201, saved.text)
        template = self.client.get(f"/api/workouts/{saved.json()[0]['id']}").json()
        self.assertEqual(template["calendar_date"], "")
        self.assertEqual(template["exercises"][0]["chain_id"], chain["id"])

        future = self._edit(chain["id"], scope="future", source="library", name=f"Future template {self.stamp}", kind="Cooldown", members=[
            {"exercise_id": press["id"]}, {"exercise_id": squat["id"]},
        ])
        self.assertEqual(future["chain"]["name"], f"Future template {self.stamp}")
        self.assertNotIn(template["id"], future["updated_workout_ids"])
        self.assertEqual(self.client.get(f"/api/workouts/{template['id']}").json()["exercises"][0]["chain_name"], chain["name"])
        self.assertIn(workout["id"], future["updated_workout_ids"])

        user = self.client.post("/api/users", json={
            "name": f"Lifter {self.stamp}",
            "email": f"lifter.{self.stamp}@example.com",
            "role": "student",
            "title": "Client",
        })
        coach = self.client.post("/api/users", json={
            "name": f"Coach {self.stamp}",
            "email": f"coach.{self.stamp}@example.com",
            "role": "coach",
            "title": "Trainer",
        })
        self.assertEqual(user.status_code, 201, user.text)
        self.assertEqual(coach.status_code, 201, coach.text)
        db = SessionLocal()
        try:
            source = db.query(Workout).filter(Workout.id == workout["id"]).one()
            coach_row = db.query(User).filter(User.id == coach.json()["id"]).one()
            athlete = db.query(User).filter(User.id == user.json()["id"]).one()
            cloned = crud.clone_workout_for_gym(db, source, coach_row)
            self.assertEqual(cloned.exercises[0].chain_id, chain["id"])
            group = Group(name=f"Team {self.stamp}", coach_id=coach_row.id)
            group.members.append(athlete)
            db.add(group)
            db.commit()
            db.refresh(group)
            source = db.query(Workout).filter(Workout.id == workout["id"]).one()
            crud.write_group_day_onto_members(db, group, source, source.calendar_date, coach_row.id)
            assignment = db.query(WorkoutAssignment).filter(
                WorkoutAssignment.user_id == athlete.id,
                WorkoutAssignment.scheduled_date == source.calendar_date,
            ).one()
            copied_member = db.query(Workout).filter(Workout.id == assignment.workout_id).one()
            self.assertEqual(copied_member.exercises[0].chain_id, chain["id"])
            self.assertEqual(copied_member.exercises[0].chain_name, source.exercises[0].chain_name)
        finally:
            db.close()

        # Breaking the chain clears the day link and leaves the library chain and logged sets alone.
        session = self.client.get(f"/api/sessions/active/{workout['id']}", params={"user_id": user.json()["id"]})
        self.assertEqual(session.status_code, 200, session.text)
        we_id = workout["exercises"][0]["id"]
        logged = self.client.post(
            f"/api/sessions/{session.json()['id']}/sets",
            params={"workout_exercise_id": we_id, "set_number": 1, "weight": 15, "reps": 3, "completed": True},
        )
        self.assertEqual(logged.status_code, 200, logged.text)
        current = self.client.get(f"/api/workouts/{workout['id']}").json()
        broken = []
        for row in current["exercises"]:
            broken.append({
                "id": row["id"],
                "exercise_id": row["exercise_id"],
                "superset_group": row["superset_group"],
                "prescribed_sets": row["prescribed_sets"],
                "target_reps": row["target_reps"],
                "target_weight": row["target_weight"],
                "notes": row["notes"],
                "chain_id": None,
                "chain_instance": "",
                "chain_name": "",
                "chain_kind": "",
                "chain_order": 0,
            })
        updated = self.client.put(f"/api/workouts/{workout['id']}", json={"exercises": broken})
        self.assertEqual(updated.status_code, 200, updated.text)
        self.assertTrue(all(row["chain_id"] is None for row in updated.json()["exercises"]))
        self.assertIn(we_id, [row["id"] for row in updated.json()["exercises"]])
        library = self.client.get("/api/chains").json()
        saved_chain = next(row for row in library if row["id"] == chain["id"])
        self.assertEqual(len(saved_chain["members"]), 2)
        log_row = db_log(logged.json()["id"])
        self.assertEqual(log_row["workout_exercise_id"], we_id)
        self.assertEqual(log_row["weight"], 15)
        self.assertEqual(log_row["reps"], 3)


    def test_chain_member_sets_reps_notes_win_over_library(self):
        squat = self._exercise(
            "Squat", default_sets=3, default_reps="10", default_notes="Library cue",
            default_load="135", default_rest="90", default_tempo="20X1",
        )
        press = self._exercise("Press", default_sets=2, default_reps="6", default_notes="Press cue", default_load="45", default_rest="60")
        row = self._exercise(
            "Row", default_sets=2, default_reps="12", default_notes="Row cue",
            default_load="40", default_rest="45", default_tempo="30X0",
        )
        curl = self._exercise("Curl", default_sets=1, default_reps="15", default_notes="Curl cue", default_load="25", default_rest="30")
        created = self.client.post("/api/chains", json={
            "name": f"Primer {self.stamp}",
            "kind": "Warm up",
            "members": [
                {"exercise_id": squat["id"], "sets": 4, "reps": "8", "notes": "Brace"},
                {"exercise_id": press["id"], "sets": None, "reps": "", "notes": ""},
            ],
        })
        self.assertEqual(created.status_code, 201, created.text)
        chain = created.json()
        self.assertEqual(chain["members"][0]["sets"], 4)
        self.assertEqual(chain["members"][0]["reps"], "8")
        self.assertEqual(chain["members"][0]["notes"], "Brace")
        self.assertIsNone(chain["members"][1]["sets"])
        self.assertIsNone(chain["members"][1]["reps"])
        self.assertIsNone(chain["members"][1]["notes"])

        changed = self.client.put(f"/api/exercises/{squat['id']}", json={
            "default_sets": 9, "default_reps": "1", "default_notes": "Changed", "default_load": "200",
        })
        self.assertEqual(changed.status_code, 200, changed.text)
        saved = next(item for item in self.client.get("/api/chains").json() if item["id"] == chain["id"])
        self.assertEqual(saved["members"][0]["sets"], 4)
        self.assertEqual(saved["members"][0]["reps"], "8")
        self.assertEqual(saved["members"][0]["notes"], "Brace")
        self.assertIsNone(saved["members"][1]["sets"])

        day = self._place(chain, eastern_day(1), f"Sets {self.stamp}", ["A", "B"])
        squat_we = next(item for item in day["exercises"] if item["exercise_id"] == squat["id"])
        edited_day = []
        for item in day["exercises"]:
            row_body = dict(item)
            row_body.pop("exercise", None)
            row_body.pop("workout_id", None)
            if item["id"] == squat_we["id"]:
                row_body["prescribed_sets"] = 7
                row_body["notes"] = "Day edit"
            if item["exercise_id"] == press["id"]:
                row_body["notes"] = "Press cue"
            edited_day.append(row_body)
        updated_day = self.client.put(f"/api/workouts/{day['id']}", json={"exercises": edited_day})
        self.assertEqual(updated_day.status_code, 200, updated_day.text)
        template = next(item for item in self.client.get("/api/chains").json() if item["id"] == chain["id"])
        self.assertEqual(template["members"][0]["sets"], 4)
        self.assertEqual(template["members"][0]["notes"], "Brace")

        scoped = self._edit(
            chain["id"], scope="one", source="day", workout_id=day["id"],
            name=chain["name"], kind="Warm up",
            members=[
                {"exercise_id": squat["id"], "sets": 5, "reps": "3", "notes": "Hold"},
                {"exercise_id": press["id"], "sets": None, "reps": "", "notes": ""},
                {"exercise_id": row["id"], "sets": None, "reps": "", "notes": ""},
                {"exercise_id": curl["id"], "sets": 4, "reps": "8", "notes": "Brace"},
            ],
        )
        self.assertEqual(scoped["updated_workout_ids"], [day["id"]])
        self.assertEqual([member["exercise_id"] for member in scoped["chain"]["members"]], [squat["id"], press["id"]])
        self.assertEqual(scoped["chain"]["members"][0]["sets"], 4)
        body = self.client.get(f"/api/workouts/{day['id']}").json()
        placed = [item for item in body["exercises"] if item["chain_id"] == chain["id"]]
        by_id = {}
        for item in placed:
            by_id.setdefault(item["exercise_id"], []).append(item)
        squat_row = by_id[squat["id"]][0]
        press_row = by_id[press["id"]][0]
        row_row = by_id[row["id"]][0]
        curl_row = by_id[curl["id"]][0]
        self.assertEqual(squat_row["id"], squat_we["id"])
        self.assertEqual(squat_row["prescribed_sets"], 5)
        self.assertEqual(squat_row["target_reps"], "3,3,3,3,3")
        self.assertIn("Hold", squat_row["notes"])
        self.assertEqual(squat_row["target_weight"], "0")
        self.assertEqual(press_row["prescribed_sets"], 3)
        self.assertEqual(press_row["target_reps"], "8")
        self.assertEqual(press_row["notes"], "Press cue")
        self.assertEqual(row_row["prescribed_sets"], 2)
        self.assertEqual(row_row["target_reps"], "12,12")
        self.assertEqual(row_row["target_weight"], "40,40")
        self.assertEqual(row_row["rest_seconds"], 45)
        self.assertIn("Row cue", row_row["notes"])
        self.assertIn("Rests:45,45", row_row["notes"])
        self.assertIn("Tempos:30X0,30X0", row_row["notes"])
        self.assertEqual(row_row["superset_group"], "A")
        self.assertFalse(row_row["chain_coach_open"])
        self.assertFalse(row_row["chain_athlete_open"])
        self.assertEqual(curl_row["prescribed_sets"], 4)
        self.assertEqual(curl_row["target_reps"], "8,8,8,8")
        self.assertTrue(curl_row["notes"].startswith("Brace"))
        self.assertIn("Rests:30,30,30,30", curl_row["notes"])
        self.assertEqual(curl_row["target_weight"], "25,25,25,25")
        self.assertEqual(curl_row["superset_group"], "A")

        squat_again = dict(squat_row)
        squat_again.pop("exercise", None)
        squat_again.pop("workout_id", None)
        squat_again["prescribed_sets"] = 11
        others = []
        for item in body["exercises"]:
            if item["id"] == squat_row["id"]:
                continue
            copy = dict(item)
            copy.pop("exercise", None)
            copy.pop("workout_id", None)
            others.append(copy)
        rewritten = self.client.put(f"/api/workouts/{day['id']}", json={"exercises": others + [squat_again]})
        self.assertEqual(rewritten.status_code, 200, rewritten.text)
        still = next(item for item in self.client.get("/api/chains").json() if item["id"] == chain["id"])
        self.assertEqual(still["members"][0]["sets"], 4)
        self.assertEqual(still["members"][0]["reps"], "8")
        self.assertEqual(still["members"][0]["notes"], "Brace")

        instance = squat_row["chain_instance"]
        athlete_fold = self.client.post(f"/api/workouts/{day['id']}/chain-fold", json={
            "chain_instance": instance, "audience": "athlete", "expanded": True,
        })
        self.assertEqual(athlete_fold.status_code, 200, athlete_fold.text)
        folded = [item for item in athlete_fold.json()["exercises"] if item["chain_instance"] == instance]
        self.assertTrue(all(item["chain_athlete_open"] for item in folded))
        self.assertTrue(all(item["chain_coach_open"] is False for item in folded))
        coach_fold = self.client.post(f"/api/workouts/{day['id']}/chain-fold", json={
            "chain_instance": instance, "audience": "coach", "expanded": True,
        })
        self.assertEqual(coach_fold.status_code, 200, coach_fold.text)
        both = self.client.get(f"/api/workouts/{day['id']}").json()
        kept = [item for item in both["exercises"] if item["chain_instance"] == instance]
        self.assertTrue(all(item["chain_athlete_open"] and item["chain_coach_open"] for item in kept))

        blank = self.client.post("/api/workouts", json={
            "title": f"Blank letter {self.stamp}",
            "program_name": f"Sets {self.stamp}",
            "calendar_date": eastern_day(2),
            "scheduled_date": eastern_day(2),
            "day_of_week": "Tuesday",
            "week_number": 1,
            "exercises": [{
                "exercise_id": squat["id"],
                "superset_group": "",
                "prescribed_sets": 1,
                "target_reps": "5",
                "target_weight": "0",
                "notes": "",
                "chain_id": chain["id"],
                "chain_instance": "blank-letter",
                "chain_name": chain["name"],
                "chain_kind": "Warm up",
                "chain_order": 0,
            }, {
                "exercise_id": press["id"],
                "superset_group": "",
                "prescribed_sets": 1,
                "target_reps": "5",
                "target_weight": "0",
                "notes": "",
            }],
        })
        self.assertEqual(blank.status_code, 201, blank.text)
        letters = {item["exercise_id"]: item["superset_group"] for item in blank.json()["exercises"]}
        self.assertEqual(letters[squat["id"]], "")
        self.assertEqual(letters[press["id"]], "A")


def db_log(log_id):
    db = SessionLocal()
    try:
        row = db.query(SetLog).filter(SetLog.id == log_id).one()
        return {
            "workout_exercise_id": row.workout_exercise_id,
            "weight": row.weight,
            "reps": row.reps,
        }
    finally:
        db.close()


if __name__ == "__main__":
    unittest.main()
