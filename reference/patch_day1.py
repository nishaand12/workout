import json

data = json.load(open('reference/clean_seed_data.json'))

# Exact Day 1 - Week 4 matching Screenshot 1 & 2
day1_exercises = [
    {
        "name": "Pelvic Tilts",
        "superset_group": "A",
        "prescription_text": "2 X 10",
        "prescribed_sets": 2,
        "target_reps": "10",
        "target_weight": "0",
        "rest_seconds": 0,
        "notes": "",
        "is_ea": False
    },
    {
        "name": "90/90 Knee Rolls",
        "superset_group": "A",
        "prescription_text": "2 X 10 EA.",
        "prescribed_sets": 2,
        "target_reps": "10 ea.",
        "target_weight": "0",
        "rest_seconds": 0,
        "notes": "",
        "is_ea": True
    },
    {
        "name": "90/90 Hip Rotation with Lift Off",
        "superset_group": "A",
        "prescription_text": "2 X 5 EA.",
        "prescribed_sets": 2,
        "target_reps": "5 ea.",
        "target_weight": "0",
        "rest_seconds": 0,
        "notes": "Hands free if possible - 3 sec hold on each lift",
        "is_ea": True
    },
    {
        "name": "Foam Roller Hip Hike",
        "superset_group": "A",
        "prescription_text": "2 X 8 EA.",
        "prescribed_sets": 2,
        "target_reps": "8 ea.",
        "target_weight": "0",
        "rest_seconds": 0,
        "notes": "should feel your outside glute working hard on these",
        "is_ea": True
    },
    {
        "name": "Single Leg Stand",
        "superset_group": "B",
        "prescription_text": "2 X 30 SECS EA.",
        "prescribed_sets": 2,
        "target_reps": "30 secs ea.",
        "target_weight": "0",
        "rest_seconds": 0,
        "notes": "Hold steady balance",
        "is_ea": True
    },
    {
        "name": "Kickstand RDL",
        "superset_group": "B",
        "prescription_text": "3 X 8 EA.",
        "prescribed_sets": 3,
        "target_reps": "8 ea.",
        "target_weight": "0",
        "rest_seconds": 0,
        "notes": "Pause for 1 seconds at bottom of each rep - bodyweight - same starting position as the single leg stand, just adding the hinge",
        "is_ea": True
    },
    {
        "name": "Short Stance Split Squat",
        "superset_group": "C",
        "prescription_text": "3 X 12 EA.",
        "prescribed_sets": 3,
        "target_reps": "12 ea.",
        "target_weight": "0",
        "rest_seconds": 120,
        "notes": "2-3 seconds down, 2-3 second up",
        "is_ea": True
    },
    {
        "name": "Single Leg Foam Roller Bridge",
        "superset_group": "D",
        "prescription_text": "2 X 20 SECS EA.",
        "prescribed_sets": 2,
        "target_reps": "20 secs ea.",
        "target_weight": "0",
        "rest_seconds": 0,
        "notes": "normal to feel a little crampy here. If you fully cramp, stop and reset",
        "is_ea": True
    },
    {
        "name": "Bench Sit Up",
        "superset_group": "D",
        "prescription_text": "2 X 15",
        "prescribed_sets": 2,
        "target_reps": "15",
        "target_weight": "0",
        "rest_seconds": 0,
        "notes": "Controlled movement through full ROM",
        "is_ea": False
    },
    {
        "name": "Side Split Inchworm",
        "superset_group": "E",
        "prescription_text": "2 X 5 EA.",
        "prescribed_sets": 2,
        "target_reps": "5 ea.",
        "target_weight": "0",
        "rest_seconds": 0,
        "notes": "Wide stance, walk hands out with tight core",
        "is_ea": True
    },
    {
        "name": "Bench Pigeon Stretch",
        "superset_group": "E",
        "prescription_text": "2 X 20-30 SECS EA.",
        "prescribed_sets": 2,
        "target_reps": "20-30 secs ea.",
        "target_weight": "0",
        "rest_seconds": 0,
        "notes": "can play around with this a bit here, find where the hips are tighter",
        "is_ea": True
    },
    {
        "name": "Breath Work",
        "superset_group": "E",
        "prescription_text": "- 5 MINUTES -",
        "prescribed_sets": 1,
        "target_reps": "5 mins",
        "target_weight": "0",
        "rest_seconds": 0,
        "notes": "LAY ON YOUR BACK WITH YOUR FEET AND CALVES UP ON A BENCH. Breathing through your nose, try to exhale for twice as long as you inhale. Try to extend the length of each breath. See if you can get to 5 seconds in, 10 seconds out.",
        "is_ea": False
    }
]

# Find Day 1 Week 4 and replace exercises
for w in data["workouts"]:
    if "Day 1 - Week 4" in w["title"]:
        w["exercises"] = day1_exercises
        w["video_url"] = "https://www.youtube.com/watch?v=0h9Vp171R2c"
        w["description"] = "Week 4 lower body & hip mobility session replicating TeamBuildr."
        break

# Ensure all exercises in Day 1 are in exercises catalog
for ex in day1_exercises:
    if not any(e["name"] == ex["name"] for e in data["exercises"]):
        data["exercises"].append({
            "name": ex["name"],
            "category": "Lower Body" if "Squat" in ex["name"] or "RDL" in ex["name"] or "Hip" in ex["name"] else "Mobility",
            "default_notes": ex["notes"],
            "video_url": f"https://www.youtube.com/results?search_query={ex['name'].replace(' ', '+')}"
        })

with open("reference/clean_seed_data.json", "w") as f:
    json.dump(data, f, indent=2)

print("Day 1 - Week 4 perfectly aligned with Screenshot 1 & 2!")
