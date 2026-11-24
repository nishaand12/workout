"""Nobody reaches the app's data without signing in."""
import os
import re
import tempfile
import unittest
from unittest import mock

os.environ.setdefault("DATABASE_URL", "sqlite:///" + os.path.join(tempfile.mkdtemp(), "signin.db"))
os.environ["SUPABASE_URL"] = ""

from fastapi.routing import APIRoute  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.config import settings  # noqa: E402
from app.database import Base, engine  # noqa: E402
from app.main import PUBLIC_ROUTES, app  # noqa: E402


class SignInRequiredTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        Base.metadata.create_all(bind=engine)
        cls.client = TestClient(app)
        # A fake token would otherwise be checked against the real Supabase project over the network.
        cls._supabase_url = settings.SUPABASE_URL
        settings.SUPABASE_URL = ""

    @classmethod
    def tearDownClass(cls):
        settings.SUPABASE_URL = cls._supabase_url

    def test_every_api_route_needs_a_signed_in_user(self):
        checked = 0
        for route in app.routes:
            if not isinstance(route, APIRoute):
                continue
            for method in sorted(route.methods - {"HEAD"}):
                if (method, route.path) in PUBLIC_ROUTES:
                    continue
                path = re.sub(r"\{[^}]+\}", "1", route.path)
                for headers in ({}, {"Authorization": "Bearer not-a-real-token"}):
                    res = self.client.request(method, path, headers=headers)
                    self.assertEqual(res.status_code, 401, f"{method} {route.path} answered {res.status_code} when signed out")
                checked += 1
        self.assertGreater(checked, 70)

    def test_sign_in_screen_and_auth_routes_stay_open(self):
        self.assertEqual(self.client.get("/").status_code, 200)
        self.assertEqual(self.client.get("/static/js/wourkout.js").status_code, 200)
        self.assertEqual(self.client.get("/health").status_code, 200)
        self.assertEqual(self.client.get("/api/auth/config").status_code, 200)
        bad_login = self.client.post("/api/auth/login", json={"email_or_username": "nobody", "password": "wrong"})
        self.assertNotEqual(bad_login.status_code, 404)
        self.assertIn(bad_login.status_code, (400, 401))

    def test_supabase_sign_in_rejects_a_token_supabase_did_not_verify(self):
        coach = self.client.post("/api/auth/register", json={
            "name": "Sync Victim", "email": "sync.victim@example.com", "password": "Password123!", "role": "coach",
        })
        self.assertEqual(coach.status_code, 201)
        for body in (
            {"access_token": "not-a-real-token", "email": "sync.victim@example.com", "supabase_uid": "x"},
            {"access_token": "not-a-real-token", "email": "brand.new@example.com", "role": "admin"},
        ):
            res = self.client.post("/api/auth/sync-supabase", json=body)
            self.assertEqual(res.status_code, 401, body)
            self.assertNotIn("access_token", res.json())

    def test_supabase_sign_in_uses_who_supabase_says_not_the_request(self):
        verified = {"id": "supa-uid-1", "email": "verified.person@example.com", "user_metadata": {"full_name": "Verified Person"}}
        with mock.patch("app.main.crud.verify_supabase_token", mock.AsyncMock(return_value=verified)):
            res = self.client.post("/api/auth/sync-supabase", json={
                "access_token": "checked-by-supabase", "email": "someone.else@example.com",
            })
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["user"]["email"], "verified.person@example.com")

    def test_reset_request_never_hands_out_a_token(self):
        self.client.post("/api/auth/register", json={
            "name": "Reset Victim", "email": "reset.victim@example.com", "password": "Password123!", "role": "coach",
        })
        res = self.client.post("/api/auth/reset-password-request", json={"email": "reset.victim@example.com"})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(set(res.json()), {"message"})

    def test_api_docs_are_not_published(self):
        for path in ("/docs", "/redoc", "/openapi.json"):
            self.assertEqual(self.client.get(path).status_code, 404, path)


if __name__ == "__main__":
    unittest.main()
