"""Round 10: onboarding invites, choosing a new athlete's calendar, and reps per side in chains."""
import os
import tempfile
import unittest
import uuid
from datetime import datetime, timedelta
from unittest import mock
from zoneinfo import ZoneInfo

_db = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
_db.close()
os.environ["DATABASE_URL"] = f"sqlite:///{_db.name}"
os.environ["SEED_DATA_PATH"] = "/tmp/wourkout-no-seed.json"

from fastapi.testclient import TestClient  # noqa: E402

from app import crud  # noqa: E402
from app.config import settings  # noqa: E402
from app.database import Base, SessionLocal, engine  # noqa: E402
from app.main import app  # noqa: E402
from app.models import User, WorkoutExercise  # noqa: E402


class FakeResponse:
    def __init__(self, status_code, body=None):
        self.status_code = status_code
        self._body = body or {}
        self.text = str(self._body)

    def json(self):
        return self._body


class FakeSupabase:
    """Stands in for httpx.Client and records what was sent to Supabase."""

    def __init__(self, answers):
        self.answers = answers
        self.calls = []

    def __call__(self, *args, **kwargs):
        return self

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False

    def post(self, url, params=None, headers=None, json=None):
        self.calls.append({"url": url, "params": params or {}, "headers": headers or {}, "json": json or {}})
        path = url.rsplit("/auth/v1/", 1)[-1]
        return self.answers.get(path, FakeResponse(500))


def configured():
    return mock.patch.multiple(settings, SUPABASE_URL="https://example.supabase.co", SUPABASE_SERVICE_ROLE_KEY="service-key")


class Round10Tests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        Base.metadata.create_all(bind=engine)
        cls.client = TestClient(app)

    def setUp(self):
        self.stamp = f"{uuid.uuid4().hex[:10]}"

    def _auth(self, token):
        return {"Authorization": f"Bearer {token}"}

    def _gym_coach(self, label="Coach"):
        reg = self.client.post("/api/auth/register", json={
            "name": f"{label} {self.stamp}",
            "email": f"{label.lower()}.{self.stamp}@example.com",
            "username": f"{label.lower()}_{self.stamp}",
            "password": "Password123!",
            "role": "coach",
        })
        self.assertEqual(reg.status_code, 201, reg.text)
        auth = self._auth(reg.json()["access_token"])
        self.assertEqual(self.client.post("/api/gyms", json={"name": f"Gym {self.stamp}"}, headers=auth).status_code, 201)
        team = self.client.post("/api/groups", json={"name": f"Team {self.stamp}"}, headers=auth)
        self.assertEqual(team.status_code, 201, team.text)
        return auth, team.json()["id"]

    # ---- invites -------------------------------------------------------------------------

    def test_invite_is_not_sent_without_the_service_key(self):
        with mock.patch.multiple(settings, SUPABASE_URL="https://example.supabase.co", SUPABASE_SERVICE_ROLE_KEY=""):
            result = crud.send_login_invite("sam@example.com", "Sam")
        self.assertEqual(result["status"], "not_configured")
        self.assertEqual(crud.send_login_invite("x@gym3.wourkout.app")["status"], "no_email")

    def test_invite_goes_through_supabase_with_the_redirect(self):
        fake = FakeSupabase({"invite": FakeResponse(200, {"id": "abc"})})
        with configured(), mock.patch("app.crud.httpx.Client", fake):
            result = crud.send_login_invite("Sam@Example.com", "Sam Lee", "https://app.example.com/")
        self.assertEqual(result["status"], "sent")
        call = fake.calls[0]
        self.assertTrue(call["url"].endswith("/auth/v1/invite"))
        self.assertEqual(call["json"], {"email": "sam@example.com", "data": {"full_name": "Sam Lee"}})
        self.assertEqual(call["params"], {"redirect_to": "https://app.example.com/"})
        self.assertEqual(call["headers"]["Authorization"], "Bearer service-key")

    def test_someone_with_a_login_gets_a_set_password_email_instead(self):
        fake = FakeSupabase({
            "invite": FakeResponse(422, {"msg": "A user with this email address has already been registered"}),
            "recover": FakeResponse(200, {}),
        })
        with configured(), mock.patch("app.crud.httpx.Client", fake):
            result = crud.send_login_invite("jo@example.com", "Jo", "javascript:alert(1)")
        self.assertEqual(result["status"], "reset_sent")
        self.assertEqual([c["url"].rsplit("/", 1)[-1] for c in fake.calls], ["invite", "recover"])
        # Only a web address is passed along as the link's landing page.
        self.assertEqual(fake.calls[0]["params"], {})

    def test_a_failed_invite_says_so(self):
        fake = FakeSupabase({"invite": FakeResponse(429, {"msg": "rate limit"})})
        with configured(), mock.patch("app.crud.httpx.Client", fake):
            result = crud.send_login_invite("kai@example.com")
        self.assertEqual(result["status"], "failed")
        self.assertIn("too many", result["message"])

    def test_adding_an_athlete_sends_the_invite_and_picks_the_calendar(self):
        auth, team_id = self._gym_coach()
        fake = FakeSupabase({"invite": FakeResponse(200, {"id": "u1"})})
        with configured(), mock.patch("app.crud.httpx.Client", fake):
            made = self.client.post("/api/gym/athletes", json={
                "name": "Ava New", "email": f"ava.{self.stamp}@example.com", "team_id": team_id,
                "new_calendar": True, "redirect_to": "https://app.example.com/",
            }, headers=auth)
        self.assertEqual(made.status_code, 201, made.text)
        body = made.json()
        self.assertEqual(body["invite_status"], "sent")
        self.assertIn("Invite emailed", body["invite_message"])
        self.assertEqual(fake.calls[0]["json"]["email"], f"ava.{self.stamp}@example.com")
        ctx = self.client.get("/api/gym/context", headers=auth).json()
        ava = next(a for a in ctx["athletes"] if a["name"] == "Ava New")
        self.assertEqual(ava["calendar_name"], "Ava New")

        shared = self.client.post("/api/calendars", json={"name": "Shared block"}, headers=auth).json()
        with configured(), mock.patch("app.crud.httpx.Client", FakeSupabase({"invite": FakeResponse(200)})):
            onto = self.client.post("/api/gym/athletes", json={
                "name": "Ben New", "email": f"ben.{self.stamp}@example.com", "team_id": team_id, "calendar_id": shared["id"],
            }, headers=auth)
            nowhere = self.client.post("/api/gym/athletes", json={
                "name": "Cy New", "email": f"cy.{self.stamp}@example.com", "team_id": team_id,
            }, headers=auth)
        self.assertEqual(onto.json()["user"]["calendar_id"], shared["id"])
        self.assertIsNone(nowhere.json()["user"]["calendar_id"])

        # Adding someone already in the gym again sends nothing: they can already sign in.
        with configured(), mock.patch("app.crud.httpx.Client", FakeSupabase({})) as again_fake:
            again = self.client.post("/api/gym/athletes", json={
                "name": "Ava New", "email": f"ava.{self.stamp}@example.com", "team_id": team_id,
            }, headers=auth)
        self.assertEqual(again.status_code, 201, again.text)
        self.assertIsNone(again.json()["invite_status"])
        self.assertEqual(again_fake.calls, [])

    def test_a_calendar_from_another_gym_cannot_be_picked(self):
        auth, team_id = self._gym_coach("Here")
        self.stamp = uuid.uuid4().hex[:10]
        other, _ = self._gym_coach("There")
        theirs = self.client.post("/api/calendars", json={"name": "Not yours"}, headers=other).json()
        res = self.client.post("/api/gym/athletes", json={
            "name": "Dee", "email": f"dee.{self.stamp}@example.com", "team_id": team_id, "calendar_id": theirs["id"],
        }, headers=auth)
        self.assertEqual(res.status_code, 403, res.text)

    def test_resend_invite_is_for_the_coachs_own_athletes(self):
        auth, team_id = self._gym_coach("Mine")
        made = self.client.post("/api/gym/athletes", json={"name": "Eli", "email": f"eli.{self.stamp}@example.com", "team_id": team_id}, headers=auth)
        eli = made.json()["user"]["id"]
        fake = FakeSupabase({"invite": FakeResponse(200)})
        with configured(), mock.patch("app.crud.httpx.Client", fake):
            sent = self.client.post(f"/api/gym/athletes/{eli}/invite", json={"redirect_to": "https://app.example.com/"}, headers=auth)
        self.assertEqual(sent.status_code, 200, sent.text)
        self.assertEqual(sent.json()["status"], "sent")
        self.stamp = uuid.uuid4().hex[:10]
        other, _ = self._gym_coach("Other")
        self.assertEqual(self.client.post(f"/api/gym/athletes/{eli}/invite", json={}, headers=other).status_code, 404)

    def test_bulk_upload_invites_real_emails_only(self):
        auth, team_id = self._gym_coach("Bulk")
        fake = FakeSupabase({"invite": FakeResponse(200)})
        with configured(), mock.patch("app.crud.httpx.Client", fake):
            res = self.client.post("/api/gym/athletes/bulk", json={
                "team_id": team_id, "redirect_to": "https://app.example.com/",
                "athletes": [{"name": "Fay"}, {"name": "Gus", "email": f"gus.{self.stamp}@example.com"}],
            }, headers=auth)
        self.assertEqual(res.status_code, 201, res.text)
        statuses = {row["user"]["name"]: row["invite_status"] for row in res.json()["users"]}
        self.assertEqual(statuses, {"Fay": None, "Gus": "sent"})
        self.assertEqual([c["json"]["email"] for c in fake.calls], [f"gus.{self.stamp}@example.com"])

    def test_the_emailed_link_sets_the_password_the_sign_in_form_checks(self):
        auth, team_id = self._gym_coach("Link")
        email = f"hal.{self.stamp}@example.com"
        self.client.post("/api/gym/athletes", json={"name": "Hal", "email": email, "team_id": team_id}, headers=auth)
        self.assertEqual(self.client.post("/api/auth/login", json={"email_or_username": email, "password": "NewPass123"}).status_code, 401)

        async def verified(token):
            return {"id": "supa-hal", "email": email} if token == "supabase-link-token" else None

        with mock.patch.object(settings, "SUPABASE_URL", "https://example.supabase.co"), \
                mock.patch("app.crud.verify_supabase_token", verified):
            bad = self.client.post("/api/auth/reset-password", json={"token": "forged", "new_password": "NewPass123"})
            self.assertEqual(bad.status_code, 400)
            ok = self.client.post("/api/auth/reset-password", json={"token": "supabase-link-token", "new_password": "NewPass123"})
            self.assertEqual(ok.status_code, 200, ok.text)
        login = self.client.post("/api/auth/login", json={"email_or_username": email, "password": "NewPass123"})
        self.assertEqual(login.status_code, 200, login.text)
        self.assertEqual(login.json()["user"]["name"], "Hal")

    # ---- chains: reps per side -----------------------------------------------------------

    def test_chain_members_keep_reps_per_side_on_every_placement(self):
        auth, _ = self._gym_coach("Side")
        lunge = self.client.post("/api/exercises", json={"name": f"Lunge {self.stamp}", "category": "Strength"}, headers=auth).json()
        squat = self.client.post("/api/exercises", json={"name": f"Squat {self.stamp}", "category": "Strength"}, headers=auth).json()
        rest = self.client.post("/api/exercises", json={"name": "Rest Time", "category": "Strength"}, headers=auth)
        rest_id = rest.json()["id"] if rest.status_code == 201 else next(
            e["id"] for e in self.client.get("/api/exercises?search=Rest Time", headers=auth).json() if e["name"] == "Rest Time")
        chain = self.client.post("/api/chains", json={"name": f"Legs {self.stamp}", "kind": "Circuit", "members": [
            {"exercise_id": lunge["id"], "reps": "8", "per_side": True},
            {"exercise_id": rest_id, "time": "45"},
            {"exercise_id": squat["id"], "reps": "10"},
        ]}, headers=auth)
        self.assertEqual(chain.status_code, 201, chain.text)
        members = chain.json()["members"]
        self.assertEqual([m["per_side"] for m in members], [True, False, False])
        self.assertEqual(members[1]["time"], "45")

        day = (datetime.now(ZoneInfo("America/New_York")).date() + timedelta(days=3)).isoformat()
        workout = self.client.post("/api/workouts", json={
            "title": "Legs", "program_name": "wourkout", "calendar_date": day, "scheduled_date": day,
            "exercises": [{
                "exercise_id": m["exercise_id"], "superset_group": "A", "order_index": i, "prescribed_sets": 3,
                "target_reps": "8", "target_weight": "", "notes": "",
                "chain_id": chain.json()["id"], "chain_instance": "inst1", "chain_name": "Legs", "chain_kind": "Circuit", "chain_order": i,
            } for i, m in enumerate(members)],
        }, headers=auth)
        self.assertEqual(workout.status_code, 201, workout.text)

        # Editing the chain everywhere rewrites the placed rows: the squat now counts per side, the lunge no longer does.
        edited = self.client.post(f"/api/chains/{chain.json()['id']}/edit", json={
            "scope": "everywhere", "source": "library", "name": f"Legs {self.stamp}", "kind": "Circuit",
            "members": [
                {"exercise_id": lunge["id"], "reps": "8", "per_side": False},
                {"exercise_id": rest_id, "time": "45"},
                {"exercise_id": squat["id"], "reps": "10", "per_side": True},
            ],
        }, headers=auth)
        self.assertEqual(edited.status_code, 200, edited.text)
        db = SessionLocal()
        try:
            rows = db.query(WorkoutExercise).filter(WorkoutExercise.workout_id == workout.json()["id"]).order_by(WorkoutExercise.order_index).all()
            flags = {row.exercise_id: ("perSide" in (row.notes or "")) for row in rows}
        finally:
            db.close()
        self.assertEqual(flags[lunge["id"]], False)
        self.assertEqual(flags[squat["id"]], True)
        self.assertEqual(flags[rest_id], False)

    def test_notes_flag_helper(self):
        self.assertEqual(crud._notes_flag("Keep tall\nFlags:dose2", "perSide", True), "Keep tall\nFlags:dose2,perSide")
        self.assertEqual(crud._notes_flag("Flags:perSide", "perSide", False), "")
        self.assertEqual(crud._notes_flag("", "perSide", True), "Flags:perSide")


if __name__ == "__main__":
    unittest.main()
