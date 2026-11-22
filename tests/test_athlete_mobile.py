"""Athletes on phones: long sign-ins that renew, the home screen manifest, and the phone UI checks."""
import base64
import json
import os
import subprocess
import time
import unittest
import uuid

os.environ.setdefault("DATABASE_URL", "sqlite:///./test_workout.db")

from fastapi.testclient import TestClient  # noqa: E402

from app import crud  # noqa: E402
from app.config import settings  # noqa: E402
from app.main import app  # noqa: E402
from tests.auth_helpers import SIGNED_OUT, adopt, signed_in_client  # noqa: E402


# The token clock is the server's naive UTC "now", which reads a few hours off on a machine
# that is not on UTC, so lengths are compared to the nearest day.
def days_left(token):
    payload = token.split(".")[0]
    payload += "=" * (-len(payload) % 4)
    return (json.loads(base64.urlsafe_b64decode(payload))["exp"] - time.time()) / 86400


class AthleteSessionTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = signed_in_client(app)
        cls.client.__enter__()

    @classmethod
    def tearDownClass(cls):
        cls.client.__exit__(None, None, None)

    def register(self, role):
        tag = uuid.uuid4().hex[:10]
        res = self.client.post("/api/auth/register", headers=SIGNED_OUT, json={
            "name": f"Mobile {role} {tag}", "email": f"mobile.{tag}@example.com",
            "username": f"mobile_{tag}", "password": "Password123!", "role": role,
        })
        self.assertEqual(res.status_code, 201, res.text)
        return res.json(), tag

    def test_athlete_sign_in_lasts_months_and_coach_stays_short(self):
        athlete, tag = self.register("athlete")
        self.assertAlmostEqual(days_left(athlete["access_token"]), settings.ATHLETE_SESSION_DAYS, delta=1)
        login = self.client.post("/api/auth/login", headers=SIGNED_OUT, json={"username": f"mobile_{tag}", "password": "Password123!"})
        self.assertEqual(login.status_code, 200, login.text)
        self.assertAlmostEqual(days_left(login.json()["access_token"]), settings.ATHLETE_SESSION_DAYS, delta=1)

        coach, _ = self.register("coach")
        self.assertAlmostEqual(days_left(coach["access_token"]), settings.ACCESS_TOKEN_EXPIRE_HOURS / 24, delta=1)

    def test_refresh_renews_a_nearly_expired_athlete_token(self):
        athlete, _ = self.register("athlete")
        adopt(self.client, athlete["user"]["id"])
        old = crud.create_access_token(athlete["user"]["id"], "athlete", expires_hours=1)
        res = self.client.post("/api/auth/refresh", headers={"Authorization": "Bearer " + old})
        self.assertEqual(res.status_code, 200, res.text)
        fresh = res.json()["access_token"]
        self.assertAlmostEqual(days_left(fresh), settings.ATHLETE_SESSION_DAYS, delta=1)
        me = self.client.get("/api/auth/me", headers={"Authorization": "Bearer " + fresh})
        self.assertEqual(me.json()["id"], athlete["user"]["id"])

    def test_refresh_needs_a_valid_sign_in(self):
        self.assertEqual(self.client.post("/api/auth/refresh", headers=SIGNED_OUT).status_code, 401)
        self.assertEqual(self.client.post("/api/auth/refresh", headers={"Authorization": "Bearer nope.nope"}).status_code, 401)

    def test_refresh_keeps_a_coach_on_the_short_session(self):
        res = self.client.post("/api/auth/refresh")
        self.assertEqual(res.status_code, 200, res.text)
        self.assertAlmostEqual(days_left(res.json()["access_token"]), settings.ACCESS_TOKEN_EXPIRE_HOURS / 24, delta=1)

    def test_home_screen_files_are_public(self):
        manifest = self.client.get("/manifest.webmanifest", headers=SIGNED_OUT)
        self.assertEqual(manifest.status_code, 200)
        body = manifest.json()
        self.assertEqual(body["display"], "standalone")
        self.assertEqual(body["start_url"], "/")
        for icon in body["icons"]:
            got = self.client.get(icon["src"], headers=SIGNED_OUT)
            self.assertEqual(got.status_code, 200, icon["src"])
            self.assertEqual(got.content[:4], b"\x89PNG")
        for path in ("/apple-touch-icon.png", "/favicon.ico"):
            self.assertEqual(self.client.get(path, headers=SIGNED_OUT).status_code, 200, path)
        index = self.client.get("/", headers=SIGNED_OUT).text
        self.assertIn('rel="manifest"', index)
        self.assertIn("apple-mobile-web-app-capable", index)
        self.assertIn("viewport-fit=cover", index)


class EasternDateTests(unittest.TestCase):
    def test_a_late_evening_utc_stamp_is_still_the_same_eastern_day(self):
        from datetime import datetime
        # 02:30 UTC on the 23rd is 9:30 pm on the 22nd in Toronto.
        self.assertEqual(crud.eastern_date_iso(datetime(2026, 11, 23, 2, 30)), "2026-11-22")
        self.assertEqual(crud.eastern_date_iso(datetime(2026, 11, 23, 15, 0)), "2026-11-23")
        self.assertEqual(crud.eastern_date_iso(None), "")


class WorkoutProgressTests(unittest.TestCase):
    """The month view's done, started, and not started come from the sets ticked done."""

    @staticmethod
    def row(row_id, sets=3, category="Strength", notes=""):
        from types import SimpleNamespace as NS
        return NS(id=row_id, prescribed_sets=sets, notes=notes, exercise=NS(category=category))

    @staticmethod
    def session(*logs):
        from types import SimpleNamespace as NS
        return NS(set_logs=[NS(workout_exercise_id=we, set_number=n, completed=done) for we, n, done in logs])

    def progress(self, rows, session):
        from types import SimpleNamespace as NS
        return crud.workout_progress(NS(exercises=rows), session)

    def test_nothing_logged(self):
        rows = [self.row(1), self.row(2)]
        self.assertEqual(self.progress(rows, None), {"items_total": 2, "items_done": 0, "started": False})
        self.assertEqual(self.progress(rows, self.session((1, 1, False))), {"items_total": 2, "items_done": 0, "started": False})

    def test_partly_and_fully_logged(self):
        rows = [self.row(1, sets=2), self.row(2, sets=1)]
        part = self.progress(rows, self.session((1, 1, True)))
        self.assertEqual(part, {"items_total": 2, "items_done": 0, "started": True})
        full = self.progress(rows, self.session((1, 1, True), (1, 2, True), (2, 1, True)))
        self.assertEqual(full, {"items_total": 2, "items_done": 2, "started": True})

    def test_notes_do_not_count_and_one_tick_finishes_a_circuit_or_text_block(self):
        rows = [
            self.row(1, category="Note"),
            self.row(2, sets=4, category="Circuit"),
            self.row(3, sets=3, category="Warm up", notes="Do this\nFlags:dose2,completionOnly,textOnly"),
            self.row(4, sets=2, category="Questionnaire"),
        ]
        got = self.progress(rows, self.session((2, 1, True), (3, 1, True), (4, 1, True)))
        self.assertEqual(got, {"items_total": 3, "items_done": 3, "started": True})


class AthleteMobileUiScriptTests(unittest.TestCase):
    def test_node_suite(self):
        root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        script = os.path.join(root, "tests", "athlete_mobile_ui.test.js")
        result = subprocess.run(["node", script], cwd=root, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stdout + "\n" + result.stderr)
        self.assertIn("athlete mobile ui tests passed", result.stdout)


if __name__ == "__main__":
    unittest.main()
