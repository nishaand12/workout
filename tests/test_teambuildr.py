"""TeamBuildr printable PDFs read into days of items, checked against the real exports in reference/."""
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

from app import teambuildr  # noqa: E402
from app.database import Base, SessionLocal, engine  # noqa: E402
from app.main import app  # noqa: E402
from app.models import Workout  # noqa: E402

REF = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "reference")


def load(name):
    with open(os.path.join(REF, f"TeamBuildr - {name}.pdf"), "rb") as fh:
        return fh.read()


_cache = {}


def parsed(name):
    if name not in _cache:
        _cache[name] = teambuildr.parse_pdf(load(name))
    return _cache[name]


def day(name, date):
    return next(d for d in parsed(name)["days"] if d["date"] == date)


def find(name, date, item_name):
    return next(it for it in day(name, date)["items"] if it["name"] == item_name)


class ParserTests(unittest.TestCase):
    def test_every_sample_reads_cleanly(self):
        expected = {
            "Feb Workout": ["2026-02-16", "2026-02-17", "2026-02-18", "2026-02-19", "2026-02-20", "2026-02-21"],
            "July Workout": ["2026-07-05", "2026-07-06", "2026-07-07", "2026-07-10", "2026-07-11"],
            "2025 Workout": ["2025-07-14", "2025-07-15", "2025-07-16", "2025-07-17", "2025-07-18"],
            # This export repeats a day's heading at the top of the next page; the day is read once.
            "Printable Workout": ["2026-01-12", "2026-01-13", "2026-01-14", "2026-01-15", "2026-01-16"],
        }
        for name, dates in expected.items():
            result = parsed(name)
            self.assertEqual([d["date"] for d in result["days"]], dates, name)
            self.assertEqual(result["warnings"], [], name)
            self.assertEqual(result["athlete"], "Nishaan Dulay")
            for d in result["days"]:
                for it in d["items"]:
                    # The old line-by-line scripts made exercises called "N/A" and "80".
                    self.assertNotRegex(it["name"], r"^(N/A|\d+R?)$", (name, d["date"]))
                    self.assertNotIn("teambuildr", (it.get("note") or "").lower())

    def test_letters_sets_reps_and_notes_line_up(self):
        items = day("Feb Workout", "2026-02-16")["items"]
        lifts = [it for it in items if it["kind"] == "lift"]
        self.assertEqual("".join(it["letter"] for it in lifts), "AAAABBCDDEE")
        lunge = find("Feb Workout", "2026-02-16", "Reverse Lunge")
        self.assertEqual((lunge["sets"], lunge["reps"], lunge["per_side"]), (4, ["4", "4", "4", "4"], True))
        self.assertEqual(lunge["note"], "Barbell - Last 2 @ 9-10 RPE - Rest 90 secs. between sets")
        # Values printed a line above the name still belong to it.
        leap = find("Feb Workout", "2026-02-16", "Light Split Exchange Leap")
        self.assertEqual(leap["reps"], ["20", "20", "20"])
        self.assertEqual((leap["intensity_kind"], leap["intensities"]), ("rpe", ["5-6", "6-7", "7-8"]))
        self.assertEqual(leap["note"], "10 each side - Light and bouncy\nScissoring the feet in the air")
        jump = find("Feb Workout", "2026-02-16", "Slalom Squat Jump (Deep Tier)")
        self.assertEqual((jump["sets"], jump["intensities"]), (3, ["5-6", "6-7", "7-8"]))
        # A name that wrapped onto a second line is one name.
        self.assertTrue(any(it["name"] == "Bent to Straight Knee Calf Raise" for it in items))

    def test_time_and_effort_words(self):
        bridge = find("Feb Workout", "2026-02-16", "Single Leg Foam Roller Bridge")
        self.assertEqual((bridge["times"], bridge["track_reps"], bridge["per_side"]), (["25", "ALAP"], False, True))
        chin = find("Feb Workout", "2026-02-17", "Chin Up")
        self.assertEqual(chin["reps"], ["4-6", "6-8", "AMAP"])
        couch = find("Feb Workout", "2026-02-17", "Couch Stretch")
        self.assertEqual(couch["times"], ["20-30", "20-30"])

    def test_a_note_glued_to_the_last_value_stays_a_note(self):
        # Plain text extraction reads this row as "3-53 seconds down on each rep".
        pull = find("Printable Workout", "2026-01-13", "Pull Up")
        self.assertEqual(pull["reps"], ["3-5", "3-5", "3-5"])
        self.assertEqual(pull["note"], "3 seconds down on each rep")

    def test_circuits_and_text_blocks(self):
        pump = find("2025 Workout", "2025-07-15", "Upper Body Pump")
        self.assertEqual((pump["kind"], pump["rounds"], pump["letter"]), ("circuit", 3, "D"))
        self.assertEqual(pump["detail"], "Cable Bicep Curl - 1x10\nCable Tricep Ext. - 1x10")
        warm = find("2025 Workout", "2025-07-15", "General Dynamic Mobility")
        self.assertEqual((warm["kind"], warm["category"]), ("text", "Warm up"))
        self.assertTrue(warm["note"].startswith("T-spine Windmill - x5 ea.\nCat Cow - x10"))
        breath = find("Feb Workout", "2026-02-16", "Breath Work")
        self.assertEqual((breath["kind"], breath["category"]), ("text", "Cooldown"))
        self.assertTrue(breath["note"].startswith("- 5 minutes -\nLay on your back"))
        # A title that runs across a page break.
        self.assertTrue(any(it["name"] == "General Dynamic Mobility - Nish" for it in day("July Workout", "2026-07-07")["items"]))

    def test_a_second_workout_in_a_day_keeps_its_own_letters(self):
        items = day("Feb Workout", "2026-02-17")["items"]
        note = next(it for it in items if it["kind"] == "note")
        self.assertEqual(note["note"], "Foot/Ankle Strength\nAdditional Workout - can be done anywhere, any day (ideally 2-3x/w)")
        foot = [it["letter"] for it in items if it["kind"] == "lift"][-5:]
        self.assertEqual(foot, ["E", "F", "F", "F", "F"])

    def test_chromium_skia_export(self):
        # Exported Nov 2026 (the athlete's name is swapped for a made-up one). Chromium's Skia
        # printer embeds Open Sans as unnamed Type3 fonts, the table has no Max/PR column, there are
        # up to five sets, and the ff/fi/fl ligatures have no text of their own.
        result = parsed("Nov Workout")
        self.assertEqual([d["date"] for d in result["days"]], [
            "2026-11-03", "2026-11-05", "2026-11-07", "2026-11-09", "2026-11-11",
            "2026-11-13", "2026-11-16", "2026-11-18", "2026-11-20", "2026-11-23"])
        self.assertEqual(result["warnings"], [])
        self.assertEqual(result["athlete"], "Martina Van Mcintyre")
        text = repr(result)
        self.assertNotIn("\\x00", text)
        # Ligatures read as letters.
        self.assertTrue(any(it["name"] == "Bench Sit Up (flat bench)" for it in day("Nov Workout", "2026-11-03")["items"]))
        self.assertIn("specified number of reps", find("Nov Workout", "2026-11-09", "For Time")["note"])
        self.assertIn("90 seconds off for five rounds", find("Nov Workout", "2026-11-18", "Bike Intervals")["note"])
        self.assertTrue(find("Nov Workout", "2026-11-03", "Cardio Warm Up")["note"].endswith("getting off."))
        # A note starts just left of the first "Result" label; it stays a note, not a set value.
        side = find("Nov Workout", "2026-11-05", "Side Squat")
        self.assertEqual((side["reps"], side["times"], side["note"]), (["5", "5"], [], "Minute 1, 3, 5"))
        swing = find("Nov Workout", "2026-11-05", "Dumbbell Swing")
        self.assertEqual(swing["reps"], ["15"] * 4)
        self.assertTrue(swing["note"].startswith("Try to go a little heavier"))
        # A note that runs onto the next page stays with its exercise.
        push = find("Nov Workout", "2026-11-05", "Push Up (Hands Elevated)")
        self.assertTrue(push["note"].startswith("elevate your hands"))
        plank = find("Nov Workout", "2026-11-05", "Side Plank on Elbow")
        self.assertEqual((plank["times"], plank["note"]), (["20-30", "20-30"], ""))
        # The fifth set column, and a set count printed under the name.
        lunge = find("Nov Workout", "2026-11-23", "Reverse Lunge (hand assisted)")
        self.assertEqual((lunge["letter"], lunge["sets"], lunge["reps"]), ("D", 5, ["5"] * 5))
        self.assertEqual(find("Nov Workout", "2026-11-05", "Any Cardio")["sets"], 5)
        letters = "".join(it["letter"] for it in day("Nov Workout", "2026-11-23")["items"] if it["kind"] == "lift")
        self.assertEqual(letters, "AABBCDDEFF")
        warm = find("Nov Workout", "2026-11-16", "Warm Up - Martina")
        self.assertEqual((warm["kind"], warm["category"]), ("text", "Warm up"))
        self.assertTrue(warm["note"].startswith("90/90 Hip Rotation - x8 ea.\nBW Squat - x10"))

    def test_not_a_teambuildr_pdf(self):
        for data in (b"", b"hello", b"%PDF-1.4 broken"):
            with self.assertRaises(teambuildr.TeamBuildrError):
                teambuildr.parse_pdf(data)


class MatchingTests(unittest.TestCase):
    LIB = [
        {"id": 1, "name": "Single Arm Dumbbell Overhead Press", "category": "Strength"},
        {"id": 2, "name": "Pull-Up", "category": "Strength"},
        {"id": 3, "name": "Couch Stretch with Overhead Side Bend", "category": "Warm up"},
        {"id": 4, "name": "Back Squat", "category": "Strength"},
        {"id": 5, "name": "Goblet Squat", "category": "Strength"},
    ]

    def test_exact_after_abbreviations_suggestions_and_new(self):
        got = teambuildr.match_names(["SA DB Overhead Press", "Pull Up", "Couch Stretch w. Overhead Side Bend", "Back Squats", "Zercher Carry"], self.LIB)
        self.assertEqual(got["SA DB Overhead Press"]["match"]["id"], 1)
        self.assertEqual(got["Pull Up"]["status"], "exact")
        self.assertEqual(got["Couch Stretch w. Overhead Side Bend"]["match"]["id"], 3)
        self.assertEqual(got["Back Squats"]["status"], "suggest")
        self.assertEqual(got["Back Squats"]["suggestions"][0]["id"], 4)
        self.assertGreaterEqual(got["Back Squats"]["suggestions"][0]["score"], 0.9)
        self.assertEqual(got["Zercher Carry"]["status"], "new")


class EndpointTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        Base.metadata.create_all(bind=engine)
        cls.client = TestClient(app)

    def _coach(self):
        tag = "tb" + uuid.uuid4().hex[:8]
        reg = self.client.post("/api/auth/register", json={
            "name": tag, "email": f"{tag}@example.com", "username": tag, "password": "Password123!", "role": "coach",
        })
        auth = {"Authorization": "Bearer " + reg.json()["access_token"]}
        self.client.post("/api/gyms", json={"name": "Gym " + tag}, headers=auth)
        return auth

    def _post(self, data, auth):
        return self.client.post("/api/import/teambuildr", content=data, headers={**auth, "Content-Type": "application/pdf"})

    def test_reads_matches_and_saves_nothing(self):
        auth = self._coach()
        self.client.post("/api/exercises", json={"name": "Back Squat", "category": "Strength"}, headers=auth)
        db = SessionLocal()
        try:
            before = db.query(Workout).count()
        finally:
            db.close()
        res = self._post(load("Feb Workout"), auth)
        self.assertEqual(res.status_code, 200, res.text)
        body = res.json()
        self.assertEqual(len(body["days"]), 6)
        self.assertEqual(body["matches"]["Back Squat"]["status"], "exact")
        self.assertIn("Slalom Squat Jump (Deep Tier)", body["matches"])
        db = SessionLocal()
        try:
            self.assertEqual(db.query(Workout).count(), before)
        finally:
            db.close()

    def test_refuses_athletes_and_files_that_are_not_teambuildr_pdfs(self):
        auth = self._coach()
        self.assertEqual(self._post(b"not a pdf", auth).status_code, 400)
        tag = "ath" + uuid.uuid4().hex[:8]
        athlete = self.client.post("/api/auth/register", json={
            "name": tag, "email": f"{tag}@example.com", "username": tag, "password": "Password123!", "role": "athlete",
        })
        res = self._post(load("Feb Workout"), {"Authorization": "Bearer " + athlete.json()["access_token"]})
        self.assertEqual(res.status_code, 403)
        big = self.client.post("/api/import/teambuildr", content=b"%PDF" + b"0" * (teambuildr.MAX_PDF_BYTES + 1),
                               headers={**auth, "Content-Type": "application/pdf"})
        self.assertIn(big.status_code, (400, 413))


if __name__ == "__main__":
    unittest.main()
