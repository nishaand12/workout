"""Imports: a roster upload with a calendar choice, a spreadsheet of exercises, and TeamBuildr PDFs."""
import os
import tempfile
import unittest
import uuid

_db = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
_db.close()
os.environ["DATABASE_URL"] = f"sqlite:///{_db.name}"
os.environ["SEED_DATA_PATH"] = "/tmp/wourkout-no-seed.json"
os.environ["SUPABASE_URL"] = ""

from fastapi.testclient import TestClient  # noqa: E402

from app.database import Base, engine  # noqa: E402
from app.main import app  # noqa: E402


class ImportTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        Base.metadata.create_all(bind=engine)
        cls.client = TestClient(app)

    def setUp(self):
        self.stamp = uuid.uuid4().hex[:10]

    def _auth(self, token):
        return {"Authorization": f"Bearer {token}"}

    def _gym_coach(self, label="Coach"):
        tag = f"{label.lower()}{uuid.uuid4().hex[:8]}"
        reg = self.client.post("/api/auth/register", json={
            "name": f"{label} {tag}", "email": f"{tag}@example.com", "username": tag,
            "password": "Password123!", "role": "coach",
        })
        self.assertEqual(reg.status_code, 201, reg.text)
        auth = self._auth(reg.json()["access_token"])
        self.assertEqual(self.client.post("/api/gyms", json={"name": f"Gym {tag}"}, headers=auth).status_code, 201)
        team = self.client.post("/api/groups", json={"name": f"Team {tag}"}, headers=auth)
        self.assertEqual(team.status_code, 201, team.text)
        return auth, team.json()["id"]

    def _athletes(self, auth):
        return {a["name"]: a for a in self.client.get("/api/gym/context", headers=auth).json()["athletes"]}

    # ---- roster upload -------------------------------------------------------------------

    def test_roster_upload_gives_each_new_athlete_their_own_calendar(self):
        auth, team_id = self._gym_coach()
        res = self.client.post("/api/gym/athletes/bulk", json={
            "team_id": team_id, "new_calendar": True,
            "athletes": [{"name": "Ann Ray", "email": f"ann.{self.stamp}@example.com"}, {"name": "Bo Lin"}],
        }, headers=auth)
        self.assertEqual(res.status_code, 201, res.text)
        people = self._athletes(auth)
        self.assertEqual(people["Ann Ray"]["calendar_name"], "Ann Ray")
        self.assertEqual(people["Bo Lin"]["calendar_name"], "Bo Lin")
        self.assertNotEqual(people["Ann Ray"]["calendar_id"], people["Bo Lin"]["calendar_id"])

    def test_roster_upload_onto_one_shared_calendar_or_none(self):
        auth, team_id = self._gym_coach()
        shared = self.client.post("/api/calendars", json={"name": "Preseason"}, headers=auth).json()
        self.client.post("/api/gym/athletes/bulk", json={
            "team_id": team_id, "calendar_id": shared["id"],
            "athletes": [{"name": "Cy One"}, {"name": "Di Two"}],
        }, headers=auth)
        self.client.post("/api/gym/athletes/bulk", json={"team_id": team_id, "athletes": [{"name": "Ed Three"}]}, headers=auth)
        people = self._athletes(auth)
        self.assertEqual(people["Cy One"]["calendar_id"], shared["id"])
        self.assertEqual(people["Di Two"]["calendar_id"], shared["id"])
        self.assertIsNone(people["Ed Three"]["calendar_id"])

    def test_roster_upload_leaves_an_existing_athletes_calendar_alone(self):
        auth, team_id = self._gym_coach()
        email = f"fay.{self.stamp}@example.com"
        first = self.client.post("/api/calendars", json={"name": "Fay's own"}, headers=auth).json()
        self.client.post("/api/gym/athletes", json={"name": "Fay", "email": email, "team_id": team_id, "calendar_id": first["id"]}, headers=auth)
        self.client.post("/api/gym/athletes/bulk", json={
            "team_id": team_id, "new_calendar": True, "athletes": [{"name": "Fay", "email": email}],
        }, headers=auth)
        self.assertEqual(self._athletes(auth)["Fay"]["calendar_id"], first["id"])

    def test_roster_upload_cannot_use_another_gyms_calendar(self):
        auth, team_id = self._gym_coach("Here")
        other, _ = self._gym_coach("There")
        theirs = self.client.post("/api/calendars", json={"name": "Not yours"}, headers=other).json()
        res = self.client.post("/api/gym/athletes/bulk", json={
            "team_id": team_id, "calendar_id": theirs["id"], "athletes": [{"name": "Gus"}],
        }, headers=auth)
        self.assertEqual(res.status_code, 403, res.text)
        self.assertNotIn("Gus", self._athletes(auth))


if __name__ == "__main__":
    unittest.main()
