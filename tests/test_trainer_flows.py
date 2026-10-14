"""Trainer flows: create a workout, assign it to one client, and bulk-apply a program to a team."""
import os
import tempfile
import unittest

_db = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
_db.close()
os.environ["DATABASE_URL"] = f"sqlite:///{_db.name}"
os.environ["SEED_DATA_PATH"] = "/tmp/wourkout-no-seed.json"

from fastapi.testclient import TestClient  # noqa: E402

from app.database import Base, engine  # noqa: E402
from app.main import app  # noqa: E402


class TrainerFlowTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        Base.metadata.create_all(bind=engine)
        cls.client = TestClient(app)

    def setUp(self):
        # Isolate each test with fresh rows by using unique names.
        self.stamp = f"{id(self)}-{self._testMethodName}"

    def _user(self, name, role="student"):
        res = self.client.post("/api/users", json={
            "name": name,
            "email": f"{name.replace(' ', '.').lower()}.{self.stamp}@example.com",
            "role": role,
            "title": "Trainer" if role == "coach" else "Client",
        })
        self.assertEqual(res.status_code, 201, res.text)
        return res.json()

    def _exercise(self):
        self._ex_n = getattr(self, "_ex_n", 0) + 1
        res = self.client.post("/api/exercises", json={
            "name": f"Squat {self.stamp} {self._ex_n}",
            "category": "Strength",
        })
        self.assertEqual(res.status_code, 201, res.text)
        return res.json()

    def _workout(self, title, program, day):
        exercise = self._exercise()
        res = self.client.post("/api/workouts", json={
            "title": title,
            "program_name": program,
            "calendar_date": day,
            "scheduled_date": day,
            "day_of_week": "Monday",
            "week_number": 1,
            "exercises": [{
                "exercise_id": exercise["id"],
                "prescribed_sets": 3,
                "target_reps": "5",
                "target_weight": "100",
            }],
        })
        self.assertEqual(res.status_code, 201, res.text)
        return res.json()

    def test_home_page_is_branded_wourkout(self):
        res = self.client.get("/")
        self.assertEqual(res.status_code, 200)
        self.assertIn("wourkout", res.text)
        self.assertNotIn("TeamBuildr", res.text)
        health = self.client.get("/health")
        self.assertEqual(health.json()["status"], "healthy")

    def test_assign_one_workout_to_one_client(self):
        coach = self._user(f"Coach {self.stamp}", role="coach")
        client = self._user(f"Client {self.stamp}")
        other = self._user(f"Other {self.stamp}")
        workout = self._workout(f"Lower {self.stamp}", f"Block {self.stamp}", "2026-10-14")
        # A dated workout that is NOT assigned must not show up as programmed.
        self._workout(f"Unused {self.stamp}", f"Other block {self.stamp}", "2026-10-14")

        assigned = self.client.post("/api/assignments", json={
            "workout_id": workout["id"],
            "assigned_by_coach_id": coach["id"],
            "user_id": client["id"],
            "scheduled_date": "2026-10-14",
            "notes": "Easy day",
        })
        self.assertEqual(assigned.status_code, 201, assigned.text)
        self.assertIn("Client:", assigned.json()["target_name"])

        report = self.client.get("/api/coach/compliance", params={"date": "2026-10-14"}).json()
        ids = {row["user_id"] for row in report["athletes"]}
        self.assertIn(client["id"], ids)
        self.assertNotIn(other["id"], ids)
        row = next(a for a in report["athletes"] if a["user_id"] == client["id"])
        self.assertEqual(row["status"], "not_started")
        self.assertEqual(row["assigned_workout_id"], workout["id"])

        listed = self.client.get("/api/assignments", params={"user_id": client["id"]}).json()
        self.assertTrue(any(a["workout_id"] == workout["id"] for a in listed))

        both = self.client.post("/api/assignments", json={
            "workout_id": workout["id"],
            "user_id": client["id"],
            "group_id": 1,
            "scheduled_date": "2026-10-15",
        })
        self.assertEqual(both.status_code, 400)

    def test_group_clients_and_bulk_apply_program(self):
        coach = self._user(f"Coach team {self.stamp}", role="coach")
        a = self._user(f"A {self.stamp}")
        b = self._user(f"B {self.stamp}")
        outsider = self._user(f"Out {self.stamp}")
        program = f"Fall {self.stamp}"
        first = self._workout(f"Day 1 {self.stamp}", program, "2026-11-02")
        second = self._workout(f"Day 2 {self.stamp}", program, "2026-11-04")

        group = self.client.post("/api/groups", json={
            "name": f"Speed {self.stamp}",
            "description": "Team",
            "coach_id": coach["id"],
        })
        self.assertEqual(group.status_code, 201, group.text)
        group_id = group.json()["id"]

        batch = self.client.post(f"/api/groups/{group_id}/members/batch", json={
            "user_ids": [a["id"], b["id"]],
        })
        self.assertEqual(batch.status_code, 200, batch.text)

        applied = self.client.post("/api/assignments/program", json={
            "program_name": program,
            "group_id": group_id,
            "assigned_by_coach_id": coach["id"],
            "notes": "Team block",
        })
        self.assertEqual(applied.status_code, 201, applied.text)
        self.assertEqual(len(applied.json()), 2)
        self.assertEqual({row["workout_id"] for row in applied.json()}, {first["id"], second["id"]})

        monday = self.client.get("/api/coach/compliance", params={"date": "2026-11-02"}).json()
        monday_ids = {row["user_id"] for row in monday["athletes"]}
        self.assertEqual(monday_ids, {a["id"], b["id"]})
        self.assertNotIn(outsider["id"], monday_ids)

        again = self.client.post("/api/assignments/program", json={
            "program_name": program,
            "group_id": group_id,
        })
        self.assertEqual(again.status_code, 400)

    def test_exercise_category_filter_and_empty_team_calendar(self):
        self._exercise()
        strength = self.client.get("/api/exercises", params={"category": "Strength"}).json()
        self.assertTrue(all(row["category"] == "Strength" for row in strength))
        self.assertTrue(any(self.stamp in row["name"] and row["name"].endswith(" 1") for row in strength))
        lower = self.client.get("/api/exercises", params={"category": "Lower Body"}).json()
        self.assertFalse(any(self.stamp in row["name"] for row in lower))

        solo = self._user(f"Solo {self.stamp}")
        calendar = self.client.get("/api/calendar", params={
            "start_date": "2026-10-01",
            "end_date": "2026-10-31",
            "user_id": solo["id"],
        })
        self.assertEqual(calendar.status_code, 200, calendar.text)

    def test_push_team_workout_removes_client_from_that_day(self):
        coach = self._user(f"Coach push {self.stamp}", role="coach")
        client = self._user(f"Push {self.stamp}")
        workout = self._workout(f"Push day {self.stamp}", f"Push {self.stamp}", "2026-12-01")
        group = self.client.post("/api/groups", json={"name": f"Push team {self.stamp}", "coach_id": coach["id"]})
        group_id = group.json()["id"]
        self.client.post(f"/api/groups/{group_id}/members/{client['id']}")
        self.client.post("/api/assignments", json={
            "workout_id": workout["id"],
            "group_id": group_id,
            "scheduled_date": "2026-12-01",
        })

        pushed = self.client.post("/api/coach/remediate/push-to-tomorrow", json={
            "user_id": client["id"],
            "current_date": "2026-12-01",
        })
        self.assertEqual(pushed.status_code, 200, pushed.text)
        self.assertEqual(pushed.json()["new_date"], "2026-12-02")

        today = self.client.get("/api/coach/compliance", params={"date": "2026-12-01"}).json()
        self.assertNotIn(client["id"], {row["user_id"] for row in today["athletes"]})
        tomorrow = self.client.get("/api/coach/compliance", params={"date": "2026-12-02"}).json()
        self.assertIn(client["id"], {row["user_id"] for row in tomorrow["athletes"]})


if __name__ == "__main__":
    unittest.main()
