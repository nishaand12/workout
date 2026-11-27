"""The exercise library across gyms.

One shared list of exercises. Each default value is worked out on its own: the coach's own, else
their gym's (set by a gym admin), else the shared list's. A coach's change never reaches another
coach or another gym. Name and category belong to the coach who added the exercise, or the app
owner. Chains belong to one gym.
"""
import os
import tempfile
import unittest
import uuid
from unittest import mock

_db = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
_db.close()
os.environ.setdefault("DATABASE_URL", f"sqlite:///{_db.name}")
os.environ.setdefault("SEED_DATA_PATH", "/tmp/wourkout-no-seed.json")

from fastapi.testclient import TestClient  # noqa: E402

from app import crud, library  # noqa: E402
from app.config import settings  # noqa: E402
from app.database import Base, SessionLocal, engine  # noqa: E402
from app.main import app  # noqa: E402
from app.models import (  # noqa: E402
    CoachExerciseDefault, CoachHiddenChain, Exercise, ExerciseChain, ExerciseChainMember, Gym,
    GymExerciseDefault, User, Workout, WorkoutExercise,
)
from app.schemas import UserRegister  # noqa: E402


class GymLibraryTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        Base.metadata.create_all(bind=engine)
        cls.client = TestClient(app)

    def setUp(self):
        self.stamp = uuid.uuid4().hex[:10]

    # ------------------------------------------------------------------ helpers

    def _gym(self, label):
        db = SessionLocal()
        try:
            gym = Gym(name=f"{label} {self.stamp}")
            db.add(gym)
            db.commit()
            return gym.id
        finally:
            db.close()

    def _person(self, gym_id, label, admin=False, coach=True, athlete=False):
        db = SessionLocal()
        try:
            tag = uuid.uuid4().hex[:8]
            user = crud.create_auth_user(db, UserRegister(
                name=f"{label} {tag}", email=f"{label.lower().replace(' ', '.')}.{tag}@example.com",
                username=f"{label.lower().replace(' ', '_')}_{tag}", password="Password123!",
                role="coach" if coach or admin else "athlete",
            ))
            user.gym_id = gym_id
            user.is_admin = admin
            user.is_coach = coach
            user.is_athlete = athlete
            db.commit()
            token = crud.create_access_token(user.id, "coach" if coach or admin else "athlete")
            return {"id": user.id, "email": user.email, "auth": {"Authorization": f"Bearer {token}"}}
        finally:
            db.close()

    def _exercise(self, who, **fields):
        body = {"name": f"Back Squat {self.stamp} {uuid.uuid4().hex[:4]}", "category": "Strength",
                "default_sets": 3, "default_reps": "10", "default_rest": "90"}
        body.update(fields)
        res = self.client.post("/api/exercises", json=body, headers=who["auth"])
        self.assertEqual(res.status_code, 201, res.text)
        return res.json()

    def _seen(self, who, exercise_id):
        rows = self.client.get("/api/exercises", headers=who["auth"]).json()
        return next(row for row in rows if row["id"] == exercise_id)

    def _save(self, who, exercise, status=200, **fields):
        """Save the way the editor does: every value it shows, with the changed ones changed."""
        body = {key: exercise[key] for key in (
            "name", "category", "video_url", "default_sets", "default_reps", "default_rest", "default_load",
            "default_time", "default_notes", "completion_only", "intensity_kind", "intensity_value",
        )}
        body.update(fields)
        res = self.client.put(f"/api/exercises/{exercise['id']}", json=body, headers=who["auth"])
        self.assertEqual(res.status_code, status, res.text)
        return res.json()

    # ------------------------------------------------------------------ layered defaults

    def test_a_coach_changing_reps_reaches_no_one_else(self):
        north, south = self._gym("North"), self._gym("South")
        sam = self._person(north, "Sam")
        kim = self._person(north, "Kim")
        lee = self._person(south, "Lee")
        squat = self._exercise(sam)

        mine = self._save(sam, self._seen(sam, squat["id"]), default_reps="3")
        self.assertEqual((mine["default_sets"], mine["default_reps"], mine["default_rest"]), (3, "3", "90"))
        self.assertEqual(mine["sources"], {"default_reps": "coach"})
        self.assertEqual(mine["inherited"]["default_reps"], "10")

        self.assertEqual(self._seen(kim, squat["id"])["default_reps"], "10")
        self.assertEqual(self._seen(lee, squat["id"])["default_reps"], "10")
        db = SessionLocal()
        try:
            self.assertEqual(db.get(Exercise, squat["id"]).default_reps, "10")
            own = db.query(CoachExerciseDefault).filter_by(user_id=sam["id"], exercise_id=squat["id"]).one()
            # Only the changed value is the coach's own. The rest keep following the gym.
            self.assertEqual(own.default_reps, "3")
            self.assertIsNone(own.default_sets)
            self.assertIsNone(own.default_rest)
        finally:
            db.close()

    def test_gym_defaults_reach_coaches_value_by_value(self):
        north, south = self._gym("North"), self._gym("South")
        boss = self._person(north, "Boss", admin=True)
        sam = self._person(north, "Sam")
        lee = self._person(south, "Lee")
        squat = self._exercise(sam)
        self._save(sam, self._seen(sam, squat["id"]), default_reps="3")

        gym_view = self.client.get(f"/api/exercises/{squat['id']}/layers", headers=boss["auth"]).json()
        self.assertEqual(gym_view["scopes"], ["coach", "gym"])
        self._save(boss, dict(squat, **gym_view["gym"]["values"]), scope="gym", default_sets=5, default_reps="5", default_rest="120")

        seen = self._seen(sam, squat["id"])
        self.assertEqual((seen["default_sets"], seen["default_reps"], seen["default_rest"]), (5, "3", "120"))
        self.assertEqual(seen["sources"], {"default_sets": "gym", "default_reps": "coach", "default_rest": "gym"})
        self.assertEqual(seen["inherited"]["default_reps"], "5")
        other_gym = self._seen(lee, squat["id"])
        self.assertEqual((other_gym["default_sets"], other_gym["default_reps"], other_gym["default_rest"]), (3, "10", "90"))

        # The admin later changes rest: it still reaches Sam, who never set rest.
        gym_view = self.client.get(f"/api/exercises/{squat['id']}/layers", headers=boss["auth"]).json()
        self._save(boss, dict(squat, **gym_view["gym"]["values"]), scope="gym", default_rest="180")
        self.assertEqual(self._seen(sam, squat["id"])["default_rest"], "180")
        self.assertEqual(self._seen(sam, squat["id"])["default_reps"], "3")

    def test_reset_follows_the_gym_again(self):
        north = self._gym("North")
        sam = self._person(north, "Sam")
        squat = self._exercise(sam)
        self._save(sam, self._seen(sam, squat["id"]), default_reps="3", default_rest="60")
        back = self._save(sam, self._seen(sam, squat["id"]), default_reps="10", reset_fields=["default_reps"])
        self.assertEqual(back["default_reps"], "10")
        self.assertEqual(back["sources"], {"default_rest": "coach"})
        cleared = self._save(sam, back, default_rest="90", reset_fields=["default_rest"])
        self.assertEqual(cleared["sources"], {})
        db = SessionLocal()
        try:
            self.assertIsNone(db.query(CoachExerciseDefault).filter_by(user_id=sam["id"], exercise_id=squat["id"]).first())
        finally:
            db.close()

    def test_intensity_is_one_value(self):
        north = self._gym("North")
        sam = self._person(north, "Sam")
        squat = self._exercise(sam)
        mine = self._save(sam, self._seen(sam, squat["id"]), intensity_kind="rpe", intensity_value="8")
        self.assertEqual((mine["intensity_kind"], mine["intensity_value"]), ("rpe", "8"))
        self.assertEqual(mine["sources"].get("intensity_kind"), "coach")
        self.assertEqual(mine["sources"].get("intensity_value"), "coach")
        back = self._save(sam, mine, reset_fields=["intensity_kind"])
        self.assertEqual((back["intensity_kind"], back["intensity_value"]), ("", ""))
        self.assertNotIn("intensity_value", back["sources"])

    def test_admin_can_bring_every_coach_back_to_the_gym(self):
        north, south = self._gym("North"), self._gym("South")
        boss = self._person(north, "Boss", admin=True)
        sam = self._person(north, "Sam")
        kim = self._person(north, "Kim")
        lee = self._person(south, "Lee")
        squat = self._exercise(sam)
        for who in (sam, kim, lee):
            self._save(who, self._seen(who, squat["id"]), default_reps="4")
        layers = self.client.get(f"/api/exercises/{squat['id']}/layers", headers=boss["auth"]).json()
        self.assertEqual(layers["coaches_with_own_values"], 2)

        self.assertEqual(self.client.post(f"/api/exercises/{squat['id']}/apply-gym-defaults", headers=sam["auth"]).status_code, 403)
        done = self.client.post(f"/api/exercises/{squat['id']}/apply-gym-defaults", headers=boss["auth"])
        self.assertEqual(done.json(), {"coaches": 2})
        self.assertEqual(self._seen(sam, squat["id"])["default_reps"], "10")
        self.assertEqual(self._seen(kim, squat["id"])["default_reps"], "10")
        self.assertEqual(self._seen(lee, squat["id"])["default_reps"], "4")

    def test_who_may_save_which_layer(self):
        north = self._gym("North")
        sam = self._person(north, "Sam")
        owner = self._person(north, "Owner")
        squat = self._exercise(sam)
        seen = self._seen(sam, squat["id"])
        self._save(sam, seen, status=403, scope="gym", default_reps="2")
        self._save(sam, seen, status=403, scope="shared", default_reps="2")
        self.assertEqual(self.client.get(f"/api/exercises/{squat['id']}/layers", headers=sam["auth"]).json()["scopes"], ["coach"])
        with mock.patch.object(settings, "SUPER_ADMIN_EMAILS", frozenset({owner["email"]})):
            layers = self.client.get(f"/api/exercises/{squat['id']}/layers", headers=owner["auth"]).json()
            self.assertEqual(layers["scopes"], ["coach", "shared"])
            shared = self._save(owner, dict(squat, **layers["shared"]["values"]), scope="shared", default_reps="8")
        self.assertEqual(shared["default_reps"], "8")
        self.assertEqual(self._seen(sam, squat["id"])["default_reps"], "8")

    # ------------------------------------------------------------------ name and category

    def test_only_the_creator_or_app_owner_renames(self):
        north, south = self._gym("North"), self._gym("South")
        sam = self._person(north, "Sam")
        boss = self._person(north, "Boss", admin=True)
        lee = self._person(south, "Lee")
        owner = self._person(south, "Owner")
        squat = self._exercise(sam)

        self.assertTrue(self._seen(sam, squat["id"])["can_edit_name"])
        self.assertFalse(self._seen(lee, squat["id"])["can_edit_name"])
        self._save(lee, self._seen(lee, squat["id"]), status=403, name="Lee's squat")
        self._save(boss, self._seen(boss, squat["id"]), status=403, category="Circuit")
        # Sending the name and category it already has is fine: the editor always sends them.
        self.assertEqual(self._save(lee, self._seen(lee, squat["id"]), default_reps="6")["default_reps"], "6")
        self.assertEqual(self._save(lee, self._seen(lee, squat["id"]), video_url="https://youtu.be/lee")["video_url"], "https://youtu.be/lee")

        renamed = self._save(sam, self._seen(sam, squat["id"]), name=f"Front Squat {self.stamp}")
        self.assertEqual(renamed["name"], f"Front Squat {self.stamp}")
        taken = self._exercise(sam)
        self._save(sam, self._seen(sam, squat["id"]), status=400, name=taken["name"])

        db = SessionLocal()
        try:
            legacy = Exercise(name=f"Old lift {self.stamp}", category="Strength")
            db.add(legacy)
            db.commit()
            legacy_id = legacy.id
        finally:
            db.close()
        self._save(sam, self._seen(sam, legacy_id), status=403, name=f"Older lift {self.stamp}")
        with mock.patch.object(settings, "SUPER_ADMIN_EMAILS", frozenset({owner["email"]})):
            self.assertTrue(self._seen(owner, legacy_id)["can_edit_name"])
            self._save(owner, self._seen(owner, legacy_id), category="Warm up")

    def test_athletes_cannot_change_the_library(self):
        north = self._gym("North")
        sam = self._person(north, "Sam")
        kid = self._person(north, "Kid", coach=False, athlete=True)
        squat = self._exercise(sam)
        self.assertEqual(self.client.post("/api/exercises", json={"name": f"Kid lift {self.stamp}"}, headers=kid["auth"]).status_code, 403)
        self._save(kid, self._seen(kid, squat["id"]), status=403, default_reps="99")
        self.assertEqual(self.client.post("/api/chains", json={"name": "x", "kind": "Warm up", "members": [{"exercise_id": squat["id"]}]}, headers=kid["auth"]).status_code, 403)
        self.assertEqual(self.client.get("/api/chains", headers=kid["auth"]).json(), [])

    def test_bulk_update_saves_the_importers_own_defaults(self):
        north = self._gym("North")
        sam = self._person(north, "Sam")
        kim = self._person(north, "Kim")
        squat = self._exercise(sam)
        res = self.client.post("/api/exercises/bulk", json={"on_existing": "update", "rows": [
            {"name": squat["name"], "default_reps": "12", "category": "Circuit"},
        ]}, headers=kim["auth"])
        self.assertEqual(res.status_code, 200, res.text)
        self.assertEqual(res.json()["updated"], 1)
        self.assertIn("category not changed", res.json()["errors"][0]["message"])
        self.assertEqual(self._seen(kim, squat["id"])["default_reps"], "12")
        self.assertEqual(self._seen(sam, squat["id"])["default_reps"], "10")
        self.assertEqual(self._seen(sam, squat["id"])["category"], "Strength")

    # ------------------------------------------------------------------ videos athletes see

    def test_athletes_see_the_video_of_the_coach_who_programmed_the_day(self):
        north = self._gym("North")
        boss = self._person(north, "Boss", admin=True)
        sam = self._person(north, "Sam")
        kim = self._person(north, "Kim")
        squat = self._exercise(sam, video_url="https://youtu.be/shared")
        self._save(sam, self._seen(sam, squat["id"]), video_url="https://youtu.be/sam")
        gym_view = self.client.get(f"/api/exercises/{squat['id']}/layers", headers=boss["auth"]).json()
        self._save(boss, dict(squat, **gym_view["gym"]["values"]), scope="gym", video_url="https://youtu.be/gym")

        db = SessionLocal()
        try:
            days = {}
            for who in (sam, kim):
                workout = Workout(title=f"Day {self.stamp}", gym_id=north, created_by_coach_id=who["id"], calendar_date="2026-12-01")
                db.add(workout)
                db.flush()
                db.add(WorkoutExercise(workout_id=workout.id, exercise_id=squat["id"], prescribed_sets=3, target_reps="5"))
                days[who["id"]] = workout.id
            db.commit()
        finally:
            db.close()
        sams_day = self.client.get(f"/api/workouts/{days[sam['id']]}", headers=sam["auth"]).json()
        self.assertEqual(sams_day["exercises"][0]["video_url"], "https://youtu.be/sam")
        kims_day = self.client.get(f"/api/workouts/{days[kim['id']]}", headers=kim["auth"]).json()
        self.assertEqual(kims_day["exercises"][0]["video_url"], "https://youtu.be/gym")
        # The shared row keeps its own link for every other gym.
        self.assertEqual(kims_day["exercises"][0]["exercise"]["video_url"], "https://youtu.be/shared")

    # ------------------------------------------------------------------ chains per gym

    def _chain(self, who, exercise_id, name=None):
        res = self.client.post("/api/chains", json={
            "name": name or f"Warm-up {self.stamp}", "kind": "Warm up",
            "members": [{"exercise_id": exercise_id, "sets": 2, "reps": "8"}],
        }, headers=who["auth"])
        self.assertEqual(res.status_code, 201, res.text)
        return res.json()

    def _edit_chain(self, who, chain, scope="one", source="library", workout_id=None, reps="10"):
        return self.client.post(f"/api/chains/{chain['id']}/edit", json={
            "scope": scope, "source": source, "workout_id": workout_id, "name": chain["name"], "kind": chain["kind"],
            "members": [{"exercise_id": chain["members"][0]["exercise_id"], "sets": 2, "reps": reps}],
        }, headers=who["auth"])

    def test_chains_stay_in_their_gym(self):
        north, south = self._gym("North"), self._gym("South")
        sam = self._person(north, "Sam")
        kim = self._person(north, "Kim")
        boss = self._person(north, "Boss", admin=True)
        lee = self._person(south, "Lee")
        squat = self._exercise(sam)
        chain = self._chain(sam, squat["id"])
        self.assertTrue(chain["can_edit"])

        self.assertIn(chain["id"], [row["id"] for row in self.client.get("/api/chains", headers=kim["auth"]).json()])
        self.assertNotIn(chain["id"], [row["id"] for row in self.client.get("/api/chains", headers=lee["auth"]).json()])
        self.assertEqual(self._edit_chain(lee, chain).status_code, 404)
        self.assertEqual(self.client.post("/api/gym/hidden-chains", json={"chain_id": chain["id"]}, headers=lee["auth"]).status_code, 404)
        # Another gym may use the same name.
        self._chain(lee, squat["id"], name=chain["name"])

        kims = next(row for row in self.client.get("/api/chains", headers=kim["auth"]).json() if row["id"] == chain["id"])
        self.assertFalse(kims["can_edit"])
        refused = self._edit_chain(kim, chain)
        self.assertEqual(refused.status_code, 403)
        self.assertIn("new name", refused.json()["detail"])
        self.assertEqual(self._edit_chain(boss, chain, reps="12").status_code, 200)
        self.assertEqual(self._edit_chain(sam, chain, reps="6").status_code, 200)

    def test_any_coach_may_change_a_chain_on_one_day_of_their_gym(self):
        north, south = self._gym("North"), self._gym("South")
        sam = self._person(north, "Sam")
        kim = self._person(north, "Kim")
        lee = self._person(south, "Lee")
        squat = self._exercise(sam)
        chain = self._chain(sam, squat["id"])
        db = SessionLocal()
        try:
            day = Workout(title=f"Day {self.stamp}", gym_id=north, created_by_coach_id=kim["id"], calendar_date="2026-12-02")
            away = Workout(title=f"Away {self.stamp}", gym_id=south, created_by_coach_id=lee["id"], calendar_date="2026-12-02")
            db.add_all([day, away])
            db.flush()
            for workout in (day, away):
                db.add(WorkoutExercise(workout_id=workout.id, exercise_id=squat["id"], chain_id=chain["id"],
                                       chain_instance="c1", chain_name=chain["name"], chain_kind="Warm up",
                                       prescribed_sets=2, target_reps="8,8"))
            db.commit()
            day_id, away_id = day.id, away.id
        finally:
            db.close()
        done = self._edit_chain(kim, chain, source="day", workout_id=day_id, reps="5")
        self.assertEqual(done.status_code, 200, done.text)
        self.assertEqual(done.json()["updated_workout_ids"], [day_id])
        self.assertEqual(self._edit_chain(kim, chain, source="day", workout_id=away_id).status_code, 400)
        everywhere = self._edit_chain(sam, chain, scope="everywhere", reps="7")
        self.assertEqual(everywhere.json()["updated_workout_ids"], [day_id])
        db = SessionLocal()
        try:
            untouched = db.query(WorkoutExercise).filter(WorkoutExercise.workout_id == away_id).one()
            self.assertEqual(untouched.target_reps, "8,8")
        finally:
            db.close()

    def test_older_chains_are_given_to_the_gyms_that_use_them(self):
        north, south = self._gym("North"), self._gym("South")
        sam = self._person(north, "Sam")
        lee = self._person(south, "Lee")
        squat = self._exercise(sam)
        db = SessionLocal()
        try:
            chain = ExerciseChain(name=f"Legacy {self.stamp}", kind="Warm up")
            unused = ExerciseChain(name=f"Unused {self.stamp}", kind="Cooldown")
            db.add_all([chain, unused])
            db.flush()
            db.add(ExerciseChainMember(chain_id=chain.id, exercise_id=squat["id"], order_index=0, reps="5"))
            rows = []
            for gym_id, who, count in ((north, sam, 2), (south, lee, 1)):
                for n in range(count):
                    workout = Workout(title=f"D{n}", gym_id=gym_id, created_by_coach_id=who["id"], calendar_date="2026-12-03")
                    db.add(workout)
                    db.flush()
                    row = WorkoutExercise(workout_id=workout.id, exercise_id=squat["id"], chain_id=chain.id, chain_instance=f"i{n}")
                    db.add(row)
                    rows.append((gym_id, row))
            db.add(CoachHiddenChain(user_id=lee["id"], chain_id=chain.id))
            db.commit()
            chain_id, unused_id = chain.id, unused.id
            row_ids = [(gym_id, row.id) for gym_id, row in rows]
        finally:
            db.close()

        db = SessionLocal()
        try:
            library.assign_chains_to_gyms(db)
            self.assertEqual(db.get(ExerciseChain, chain_id).gym_id, north)
            self.assertIsNotNone(db.get(ExerciseChain, unused_id).gym_id)
            copy = db.query(ExerciseChain).filter(ExerciseChain.gym_id == south, ExerciseChain.name == f"Legacy {self.stamp}").one()
            self.assertEqual([m.reps for m in copy.members], ["5"])
            for gym_id, row_id in row_ids:
                expected = chain_id if gym_id == north else copy.id
                self.assertEqual(db.get(WorkoutExercise, row_id).chain_id, expected)
            self.assertEqual(
                [row.chain_id for row in db.query(CoachHiddenChain).filter(CoachHiddenChain.user_id == lee["id"]).all()],
                [copy.id],
            )
            # Running it again changes nothing.
            self.assertEqual(library.assign_chains_to_gyms(db), 0)
        finally:
            db.close()


if __name__ == "__main__":
    unittest.main()
