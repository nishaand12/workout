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

    def test_auth_flows(self):
        # Register user with role
        reg_res = self.client.post("/api/auth/register", json={
            "name": f"Auth User {self.stamp}",
            "email": f"auth.{self.stamp}@example.com",
            "username": f"user_{self.stamp[:8]}",
            "password": "Password123!",
            "role": "athlete"
        })
        self.assertEqual(reg_res.status_code, 201, reg_res.text)
        token = reg_res.json()["access_token"]
        user = reg_res.json()["user"]
        self.assertEqual(user["role"], "athlete")

        # Verify /api/auth/me
        me_res = self.client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(me_res.status_code, 200)
        self.assertEqual(me_res.json()["email"], f"auth.{self.stamp}@example.com")

        # Login with email
        login_res = self.client.post("/api/auth/login", json={
            "email_or_username": f"auth.{self.stamp}@example.com",
            "password": "Password123!"
        })
        self.assertEqual(login_res.status_code, 200)

        # Login with username
        login_u_res = self.client.post("/api/auth/login", json={
            "email_or_username": f"user_{self.stamp[:8]}",
            "password": "Password123!"
        })
        self.assertEqual(login_u_res.status_code, 200)

        # Config endpoint
        config_res = self.client.get("/api/auth/config")
        self.assertEqual(config_res.status_code, 200)
        self.assertTrue(config_res.json()["allow_email_password"])

    def test_goals_with_athlete_assignment(self):
        ex = self._exercise()
        client = self._user("Goal Client")

        # Create goal for specific athlete
        create_res = self.client.post("/api/records", json={
            "exercise_id": ex["id"],
            "user_id": client["id"],
            "weight": 145.0,
            "reps": 1,
            "notes": "Athlete target PR"
        })
        self.assertEqual(create_res.status_code, 201, create_res.text)
        record = create_res.json()
        self.assertEqual(record["user_id"], client["id"])
        self.assertEqual(record["weight"], 145.0)

        # Filter by user_id
        filtered_res = self.client.get(f"/api/records?user_id={client['id']}&include_global=false")
        self.assertEqual(filtered_res.status_code, 200)
        records = filtered_res.json()
        self.assertTrue(any(r["id"] == record["id"] for r in records))

        # Delete record
        del_res = self.client.delete(f"/api/records/{record['id']}")
        self.assertEqual(del_res.status_code, 200)

        # Delete exercise
        del_ex_res = self.client.delete(f"/api/exercises/{ex['id']}")
        self.assertEqual(del_ex_res.status_code, 200)

    def test_password_reset_flow(self):
        # Register user
        email = f"reset.{self.stamp}@example.com"
        reg = self.client.post("/api/auth/register", json={
            "name": "Reset Test User",
            "email": email,
            "username": f"reset_{self.stamp[:8]}",
            "password": "OldPassword123!",
            "role": "coach"
        })
        self.assertEqual(reg.status_code, 201)

        # Request reset
        req_res = self.client.post("/api/auth/reset-password-request", json={"email": email})
        self.assertEqual(req_res.status_code, 200)
        self.assertIn("message", req_res.json())
        token = req_res.json()["reset_token"]
        self.assertIsNotNone(token)

        # Confirm reset
        confirm_res = self.client.post("/api/auth/reset-password", json={
            "token": token,
            "new_password": "NewPassword123!"
        })
        self.assertEqual(confirm_res.status_code, 200)

        # Verify login with new password via email_or_username
        login_res = self.client.post("/api/auth/login", json={
            "email_or_username": email,
            "password": "NewPassword123!"
        })
        self.assertEqual(login_res.status_code, 200)

        # Verify login using 'identity' field (as sent by frontend)
        login_id_res = self.client.post("/api/auth/login", json={
            "identity": email,
            "password": "NewPassword123!"
        })
        self.assertEqual(login_id_res.status_code, 200)

        # Verify login using 'username' field
        username = f"reset_{self.stamp[:8]}"
        login_user_res = self.client.post("/api/auth/login", json={
            "username": username,
            "password": "NewPassword123!"
        })
        self.assertEqual(login_user_res.status_code, 200)

        # Verify login failure with bad password
        bad_pw_res = self.client.post("/api/auth/login", json={
            "identity": email,
            "password": "WrongPassword!"
        })
        self.assertEqual(bad_pw_res.status_code, 401)

    def test_active_session_comma_separated_parsing(self):
        coach = self._user(f"Coach Parse {self.stamp}", role="coach")
        client = self._user(f"Client Parse {self.stamp}")
        ex = self._exercise()

        # Workout with comma-separated weights and reps
        w_res = self.client.post("/api/workouts", json={
            "title": f"Parsing Workout {self.stamp}",
            "program_name": "Test",
            "calendar_date": "2026-10-15",
            "scheduled_date": "2026-10-15",
            "exercises": [{
                "exercise_id": ex["id"],
                "prescribed_sets": 3,
                "target_reps": "5,5,5",
                "target_weight": "60,70,80",
            }]
        })
        self.assertEqual(w_res.status_code, 201)
        workout_id = w_res.json()["id"]

        # Active session
        session_res = self.client.get(f"/api/sessions/active/{workout_id}?user_id={client['id']}")
        self.assertEqual(session_res.status_code, 200, session_res.text)
        session = session_res.json()
        self.assertEqual(session["user_id"], client["id"])

    def _ensure_demo_gym(self):
        from app.database import SessionLocal
        from app import crud
        db = SessionLocal()
        try:
            crud.seed_default_users(db)
        finally:
            db.close()

    def _login(self, email, password):
        self._ensure_demo_gym()
        res = self.client.post("/api/auth/login", json={"email_or_username": email, "password": password})
        self.assertEqual(res.status_code, 200, res.text)
        token = res.json()["access_token"]
        return token, res.json()["user"]

    def _auth(self, token):
        return {"Authorization": f"Bearer {token}"}

    def test_join_codes_place_coach_and_athlete(self):
        admin_token, admin = self._login("admin@wourkout.app", "AdminPassword123!")
        self.assertIn("admin", admin["roles"])
        self.assertFalse(admin["needs_onboarding"])
        self.assertEqual(admin["gym_name"], "wourkout")

        gym_code = self.client.post("/api/join-codes", json={"kind": "gym"}, headers=self._auth(admin_token))
        self.assertEqual(gym_code.status_code, 201, gym_code.text)
        self.assertEqual(gym_code.json()["kind"], "gym")

        rejected = self.client.post("/api/join-codes", json={"kind": "admin"}, headers=self._auth(admin_token))
        self.assertEqual(rejected.status_code, 400, rejected.text)

        reg = self.client.post("/api/auth/register", json={
            "name": "New Coach",
            "email": f"new.coach.{self.stamp}@example.com",
            "username": f"nc_{self.stamp[:8]}",
            "password": "Password123!",
            "role": "athlete",
        })
        self.assertEqual(reg.status_code, 201, reg.text)
        self.assertTrue(reg.json()["user"]["needs_onboarding"])
        coach_token = reg.json()["access_token"]
        redeemed = self.client.post("/api/join-codes/redeem", json={"code": gym_code.json()["code"]}, headers=self._auth(coach_token))
        self.assertEqual(redeemed.status_code, 200, redeemed.text)
        coach = redeemed.json()
        self.assertEqual(coach["role"], "coach")
        self.assertIn("coach", coach["roles"])
        self.assertNotIn("admin", coach["roles"])
        self.assertEqual(coach["gym_id"], admin["gym_id"])
        self.assertFalse(coach["needs_onboarding"])

        team = self.client.post("/api/groups", json={"name": f"Falcons {self.stamp}"}, headers=self._auth(coach_token))
        self.assertEqual(team.status_code, 201, team.text)
        self.assertEqual(team.json()["coach_id"], coach["id"])
        team_code = self.client.post(
            "/api/join-codes",
            json={"kind": "team", "team_id": team.json()["id"]},
            headers=self._auth(coach_token),
        )
        self.assertEqual(team_code.status_code, 201, team_code.text)

        # A coach cannot mint a gym code.
        gym_denied = self.client.post("/api/join-codes", json={"kind": "gym"}, headers=self._auth(coach_token))
        self.assertEqual(gym_denied.status_code, 403, gym_denied.text)

        athlete_reg = self.client.post("/api/auth/register", json={
            "name": "New Athlete",
            "email": f"new.athlete.{self.stamp}@example.com",
            "username": f"na_{self.stamp[:8]}",
            "password": "Password123!",
            "role": "coach",
        })
        athlete_token = athlete_reg.json()["access_token"]
        joined = self.client.post(
            "/api/join-codes/redeem",
            json={"code": team_code.json()["code"].lower()},
            headers=self._auth(athlete_token),
        )
        self.assertEqual(joined.status_code, 200, joined.text)
        athlete = joined.json()
        self.assertEqual(athlete["role"], "athlete")
        self.assertEqual(athlete["roles"], ["athlete"])
        self.assertEqual(athlete["team_id"], team.json()["id"])
        self.assertEqual(athlete["gym_id"], admin["gym_id"])
        self.assertFalse(athlete["needs_onboarding"])

        # Second team is refused.
        other = self.client.post("/api/groups", json={"name": f"Other {self.stamp}"}, headers=self._auth(coach_token))
        second = self.client.post(f"/api/groups/{other.json()['id']}/members/{athlete['id']}", headers=self._auth(coach_token))
        self.assertEqual(second.status_code, 400, second.text)

    def test_coach_scope_and_blocked_removal(self):
        admin_token, admin = self._login("admin@wourkout.app", "AdminPassword123!")
        coach_token, coach = self._login("coach@wourkout.app", "CoachPassword123!")
        alex_token, alex = self._login("alex.rivera@wourkout.app", "CoachPassword123!")

        coach_users = self.client.get("/api/users", headers=self._auth(coach_token)).json()
        coach_emails = {row["email"] for row in coach_users}
        self.assertIn("athlete@wourkout.app", coach_emails)
        self.assertNotIn("maya.lin@wourkout.app", coach_emails)
        self.assertNotIn("alex.rivera@wourkout.app", coach_emails)

        alex_users = self.client.get("/api/users", headers=self._auth(alex_token)).json()
        alex_emails = {row["email"] for row in alex_users}
        self.assertIn("maya.lin@wourkout.app", alex_emails)
        self.assertNotIn("athlete@wourkout.app", alex_emails)

        # Head coach cannot assign to Alex's athlete.
        maya = next(row for row in alex_users if row["email"] == "maya.lin@wourkout.app")
        workout = self._workout(f"Secret {self.stamp}", f"Secret {self.stamp}", "2026-10-20")
        denied = self.client.post("/api/assignments", json={
            "workout_id": workout["id"],
            "user_id": maya["id"],
            "scheduled_date": "2026-10-20",
        }, headers=self._auth(coach_token))
        self.assertEqual(denied.status_code, 403, denied.text)

        # Removing Head Coach is blocked while Varsity still exists.
        blocked = self.client.delete(f"/api/gym/coaches/{coach['id']}", headers=self._auth(admin_token))
        self.assertEqual(blocked.status_code, 409, blocked.text)
        self.assertIn("team", blocked.json()["detail"].lower())

        # A coach with no team can be removed. One who still has a team cannot,
        # until the admin moves that team or deletes its athletes and the team.
        created = self.client.post("/api/gym/coaches", json={
            "name": "Temp Coach",
            "email": f"temp.coach.{self.stamp}@example.com",
        }, headers=self._auth(admin_token))
        self.assertEqual(created.status_code, 201, created.text)
        temp = created.json()["user"]
        temp_token, _ = self._login(temp["email"], created.json()["temporary_password"])
        temp_team = self.client.post("/api/groups", json={"name": f"Temp {self.stamp}"}, headers=self._auth(temp_token))
        self.assertEqual(temp_team.status_code, 201, temp_team.text)
        added = self.client.post("/api/gym/athletes", json={
            "name": "Temp Athlete",
            "email": f"temp.athlete.{self.stamp}@example.com",
            "team_id": temp_team.json()["id"],
        }, headers=self._auth(temp_token))
        self.assertEqual(added.status_code, 201, added.text)
        still = self.client.delete(f"/api/gym/coaches/{temp['id']}", headers=self._auth(admin_token))
        self.assertEqual(still.status_code, 409, still.text)

        moved = self.client.post(f"/api/gym/teams/{temp_team.json()['id']}/move", json={"coach_id": alex["id"]}, headers=self._auth(admin_token))
        self.assertEqual(moved.status_code, 200, moved.text)
        self.assertEqual(moved.json()["coach_id"], alex["id"])
        gone = self.client.delete(f"/api/gym/coaches/{temp['id']}", headers=self._auth(admin_token))
        self.assertEqual(gone.status_code, 200, gone.text)

        # Alex now leads the moved team, so removing Alex is blocked again.
        alex_blocked = self.client.delete(f"/api/gym/coaches/{alex['id']}", headers=self._auth(admin_token))
        self.assertEqual(alex_blocked.status_code, 409, alex_blocked.text)

    def test_athlete_sees_only_own_schedule_and_can_note_coach(self):
        athlete_token, athlete = self._login("athlete@wourkout.app", "AthletePassword123!")
        self.assertEqual(athlete["roles"], ["athlete"])
        self.assertEqual(athlete["team_name"], "Varsity")
        schedule = self.client.get("/api/my/schedule", headers=self._auth(athlete_token))
        self.assertEqual(schedule.status_code, 200, schedule.text)
        self.assertTrue(any(row["title"] == "Lower Strength" for row in schedule.json()))
        workout_id = next(row["workout_id"] for row in schedule.json() if row["title"] == "Lower Strength")

        noted = self.client.post("/api/my/note", json={"workout_id": workout_id, "note": "Felt heavy on the last set"}, headers=self._auth(athlete_token))
        self.assertEqual(noted.status_code, 200, noted.text)
        self.assertEqual(noted.json()["athlete_note"], "Felt heavy on the last set")

        coach_token, coach = self._login("coach@wourkout.app", "CoachPassword123!")
        report = self.client.get("/api/coach/compliance", params={"date": "2026-10-15"}, headers=self._auth(coach_token))
        self.assertEqual(report.status_code, 200, report.text)
        ids = {row["user_id"] for row in report.json()["athletes"]}
        self.assertIn(athlete["id"], ids)
        maya = self._login("alex.rivera@wourkout.app", "CoachPassword123!")[1]
        # Maya is not on this coach's team, so she is absent even if she had a workout today.
        self.assertNotIn(maya["id"], ids)

        hidden = self.client.get("/api/my/schedule", headers=self._auth(coach_token))
        self.assertEqual(hidden.status_code, 403, hidden.text)
        tools = self.client.get("/api/gym/context", headers=self._auth(athlete_token))
        self.assertEqual(tools.status_code, 403, tools.text)
        users = self.client.get("/api/users", headers=self._auth(athlete_token)).json()
        self.assertEqual([row["id"] for row in users], [athlete["id"]])

        # Assign a private workout to Maya and prove the varsity athlete cannot open it.
        alex_token, alex = self._login("alex.rivera@wourkout.app", "CoachPassword123!")
        maya_row = next(row for row in self.client.get("/api/users", headers=self._auth(alex_token)).json() if row["email"] == "maya.lin@wourkout.app")
        assigned = self.client.post("/api/coach/assign", json={
            "athlete_id": maya_row["id"],
            "title": f"Speed day {self.stamp}",
            "scheduled_date": "2026-10-16",
            "exercise_name": "10 yard sprint",
        }, headers=self._auth(alex_token))
        self.assertEqual(assigned.status_code, 201, assigned.text)
        stolen = self.client.get(f"/api/workouts/{assigned.json()['workout_id']}", headers=self._auth(athlete_token))
        self.assertEqual(stolen.status_code, 403, stolen.text)
        note_denied = self.client.post("/api/my/note", json={"workout_id": assigned.json()["workout_id"], "note": "nope"}, headers=self._auth(athlete_token))
        self.assertEqual(note_denied.status_code, 403, note_denied.text)

        # Head coach assigns to their own athlete.
        own = self.client.post("/api/coach/assign", json={
            "athlete_id": athlete["id"],
            "title": f"Upper {self.stamp}",
            "scheduled_date": "2026-10-16",
        }, headers=self._auth(coach_token))
        self.assertEqual(own.status_code, 201, own.text)
        again = self.client.get("/api/my/schedule", headers=self._auth(athlete_token)).json()
        self.assertTrue(any(row["title"] == f"Upper {self.stamp}" for row in again))
        self.assertTrue(all(row["title"] != f"Speed day {self.stamp}" for row in again))

    def test_signed_in_user_can_create_their_own_gym(self):
        reg = self.client.post("/api/auth/register", json={
            "name": "Founder",
            "email": f"founder.{self.stamp}@example.com",
            "username": f"fd_{self.stamp[:8]}",
            "password": "Password123!",
            "role": "athlete",
        })
        self.assertEqual(reg.status_code, 201, reg.text)
        user = reg.json()["user"]
        self.assertTrue(user["needs_onboarding"])
        self.assertIsNone(user["gym_id"])
        token = reg.json()["access_token"]

        blank = self.client.post("/api/gyms", json={"name": "   "}, headers=self._auth(token))
        self.assertEqual(blank.status_code, 400, blank.text)

        created = self.client.post("/api/gyms", json={"name": " Northside Athletics "}, headers=self._auth(token))
        self.assertEqual(created.status_code, 201, created.text)
        admin = created.json()
        self.assertEqual(admin["gym_name"], "Northside Athletics")
        self.assertEqual(admin["role"], "admin")
        self.assertEqual(admin["roles"], ["admin"])
        self.assertFalse(admin["needs_onboarding"])
        self.assertIsNone(admin["team_id"])

        again = self.client.post("/api/gyms", json={"name": "Second Gym"}, headers=self._auth(token))
        self.assertEqual(again.status_code, 409, again.text)

        gym_code = self.client.post("/api/join-codes", json={"kind": "gym"}, headers=self._auth(token))
        self.assertEqual(gym_code.status_code, 201, gym_code.text)
        self.assertEqual(gym_code.json()["kind"], "gym")
        self.assertEqual(gym_code.json()["gym_id"], admin["gym_id"])

        other_kind = self.client.post("/api/join-codes", json={"kind": "owner"}, headers=self._auth(token))
        self.assertEqual(other_kind.status_code, 400, other_kind.text)

        team = self.client.post("/api/groups", json={"name": f"Northside {self.stamp}"}, headers=self._auth(token))
        self.assertEqual(team.status_code, 201, team.text)
        self.assertEqual(team.json()["coach_id"], admin["id"])

        me = self.client.get("/api/auth/me", headers=self._auth(token))
        self.assertEqual(me.status_code, 200, me.text)
        self.assertEqual(sorted(me.json()["roles"]), ["admin", "coach"])

        own_teams = self.client.get("/api/groups", headers=self._auth(token)).json()
        self.assertIn(team.json()["id"], [row["id"] for row in own_teams])

        # An existing member cannot found a second gym.
        admin_token, _ = self._login("admin@wourkout.app", "AdminPassword123!")
        taken = self.client.post("/api/gyms", json={"name": "Elsewhere"}, headers=self._auth(admin_token))
        self.assertEqual(taken.status_code, 409, taken.text)

    def test_coach_adds_athlete_to_one_group_and_programs_self(self):
        reg = self.client.post("/api/auth/register", json={
            "name": "Nishaan D",
            "email": f"nishaan.{self.stamp}@example.com",
            "username": f"nd_{self.stamp[:8]}",
            "password": "Password123!",
            "role": "athlete",
        })
        self.assertEqual(reg.status_code, 201, reg.text)
        token = reg.json()["access_token"]
        auth = self._auth(token)
        created = self.client.post("/api/gyms", json={"name": f"wourkout {self.stamp}"}, headers=auth)
        self.assertEqual(created.status_code, 201, created.text)

        team = self.client.post("/api/groups", json={"name": f"Falcons {self.stamp}"}, headers=auth)
        self.assertEqual(team.status_code, 201, team.text)
        team_id = team.json()["id"]
        me = self.client.get("/api/auth/me", headers=auth).json()
        self.assertIn("coach", me["roles"])
        self.assertIn("admin", me["roles"])

        added = self.client.post(f"/api/groups/{team_id}/members/{me['id']}", headers=auth)
        self.assertEqual(added.status_code, 200, added.text)
        me = self.client.get("/api/auth/me", headers=auth).json()
        self.assertIn("athlete", me["roles"])
        self.assertEqual(me["team_id"], team_id)
        self.assertEqual(me["team_name"], team.json()["name"])

        other = self.client.post("/api/groups", json={"name": f"Second {self.stamp}"}, headers=auth)
        self.assertEqual(other.status_code, 201, other.text)
        refused = self.client.post(f"/api/groups/{other.json()['id']}/members/{me['id']}", headers=auth)
        self.assertEqual(refused.status_code, 400, refused.text)

        guest = self.client.post("/api/gym/athletes", json={
            "name": "Guest Athlete",
            "email": f"guest.{self.stamp}@example.com",
            "team_id": team_id,
        }, headers=auth)
        self.assertEqual(guest.status_code, 201, guest.text)
        guest_id = guest.json()["user"]["id"]
        guest_second = self.client.post(f"/api/groups/{other.json()['id']}/members/{guest_id}", headers=auth)
        self.assertEqual(guest_second.status_code, 400, guest_second.text)

        removed_guest = self.client.delete(f"/api/groups/{team_id}/members/{guest_id}", headers=auth)
        self.assertEqual(removed_guest.status_code, 200, removed_guest.text)
        moved = self.client.post(f"/api/groups/{other.json()['id']}/members/{guest_id}", headers=auth)
        self.assertEqual(moved.status_code, 200, moved.text)

        outsider = self.client.post("/api/gym/coaches", json={
            "name": "Other Coach",
            "email": f"other.coach.{self.stamp}@example.com",
        }, headers=auth)
        self.assertEqual(outsider.status_code, 201, outsider.text)
        outsider_token, _ = self._login(outsider.json()["user"]["email"], outsider.json()["temporary_password"])
        blocked = self.client.delete(f"/api/groups/{other.json()['id']}/members/{guest_id}", headers=self._auth(outsider_token))
        self.assertEqual(blocked.status_code, 403, blocked.text)

        removed = self.client.delete(f"/api/groups/{team_id}/members/{me['id']}", headers=auth)
        self.assertEqual(removed.status_code, 200, removed.text)
        me = self.client.get("/api/auth/me", headers=auth).json()
        self.assertIsNone(me["team_id"])
        self.assertIn("athlete", me["roles"])

        exercise = self._exercise()
        workout = self.client.post("/api/workouts", json={
            "title": f"Self day {self.stamp}",
            "program_name": "wourkout",
            "calendar_date": "2026-10-16",
            "scheduled_date": "2026-10-16",
            "day_of_week": "Friday",
            "week_number": 5,
            "exercises": [{
                "exercise_id": exercise["id"],
                "superset_group": "A",
                "prescribed_sets": 2,
                "target_reps": "5,3",
                "target_weight": "100,110",
                "rest_seconds": 90,
                "notes": "Rests:90,60\nTempos:20X1,20X1",
            }],
        }, headers=auth)
        self.assertEqual(workout.status_code, 201, workout.text)
        assigned = self.client.post("/api/assignments", json={
            "workout_id": workout.json()["id"],
            "user_id": me["id"],
            "scheduled_date": "2026-10-16",
            "notes": "Saved from Build",
        }, headers=auth)
        self.assertEqual(assigned.status_code, 201, assigned.text)
        self.assertEqual(assigned.json()["user_id"], me["id"])

        viewed = self.client.post("/api/auth/view", json={"role": "athlete"}, headers=auth)
        self.assertEqual(viewed.status_code, 200, viewed.text)
        schedule = self.client.get("/api/my/schedule", headers=auth)
        self.assertEqual(schedule.status_code, 200, schedule.text)
        self.assertTrue(any(row["scheduled_date"] == "2026-10-16" and row["workout_id"] == workout.json()["id"] for row in schedule.json()))

        session = self.client.get(f"/api/sessions/active/{workout.json()['id']}", params={"user_id": me["id"]}, headers=auth)
        self.assertEqual(session.status_code, 200, session.text)
        logs = session.json()["set_logs"]
        self.assertEqual(len(logs), 2)
        self.assertEqual(logs[0]["weight"], 100)
        self.assertEqual(logs[0]["reps"], 5)
        self.assertEqual(logs[0]["rest_seconds"], 90)
        self.assertIn("tempo", logs[0]["details"])
        we_id = workout.json()["exercises"][0]["id"]
        logged = self.client.post(
            f"/api/sessions/{session.json()['id']}/sets",
            params={
                "workout_exercise_id": we_id,
                "set_number": 1,
                "weight": 102.5,
                "reps": 5,
                "rest_seconds": 75,
                "completed": True,
                "details": '{"tempo":"21X1"}',
            },
            headers=auth,
        )
        self.assertEqual(logged.status_code, 200, logged.text)
        body = logged.json()
        self.assertEqual(body["weight"], 102.5)
        self.assertEqual(body["reps"], 5)
        self.assertEqual(body["rest_seconds"], 75)
        self.assertTrue(body["completed"])
        self.assertIn("21X1", body["details"])

    def test_bulk_upload_athletes_without_emails(self):
        reg = self.client.post("/api/auth/register", json={
            "name": "Bulk Coach",
            "email": f"bulk.{self.stamp}@example.com",
            "username": f"bulk_{self.stamp[:8]}",
            "password": "Password123!",
            "role": "coach",
        })
        self.assertEqual(reg.status_code, 201, reg.text)
        auth = self._auth(reg.json()["access_token"])
        gym = self.client.post("/api/gyms", json={"name": f"Bulk Gym {self.stamp}"}, headers=auth)
        self.assertEqual(gym.status_code, 201, gym.text)
        team = self.client.post("/api/groups", json={"name": f"Bulk Team {self.stamp}"}, headers=auth)
        self.assertEqual(team.status_code, 201, team.text)
        team_id = team.json()["id"]

        res = self.client.post("/api/gym/athletes/bulk", json={
            "team_id": team_id,
            "athletes": [
                {"name": "Test athlete 1"},
                {"name": "Test athlete 2", "email": None},
                {"name": "Test athlete 3", "email": ""},
            ],
        }, headers=auth)
        self.assertEqual(res.status_code, 201, res.text)
        body = res.json()
        self.assertEqual(body["added_count"], 3)
        emails = [u["user"]["email"] for u in body["users"]]
        self.assertEqual(len(set(emails)), 3)
        for u in body["users"]:
            self.assertEqual(u["user"]["team_id"], team_id)
            self.assertTrue(u["temporary_password"])

        # Re-uploading the same names creates new, distinct accounts rather than crashing.
        again = self.client.post("/api/gym/athletes/bulk", json={
            "team_id": team_id,
            "athletes": [{"name": "Test athlete 1"}],
        }, headers=auth)
        self.assertEqual(again.status_code, 201, again.text)
        self.assertNotIn(again.json()["users"][0]["user"]["email"], emails)


if __name__ == "__main__":
    unittest.main()
