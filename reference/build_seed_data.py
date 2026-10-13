import re
import json
import glob
import pypdf

# Define curated video demo URLs for standard movements to make the prototype look rich immediately!
# Users can change any URL directly in the UI.
VIDEO_PRESETS = {
    "Pelvic Tilts": "https://www.youtube.com/watch?v=0h9Vp171R2c",
    "90/90 Knee Rolls": "https://www.youtube.com/watch?v=yYh_U32-67c",
    "90/90 Hip Rotation with Lift Off": "https://www.youtube.com/watch?v=z3_P2nflZ9I",
    "90/90 Hip Rotation": "https://www.youtube.com/watch?v=kYv_3e2Wz-E",
    "90/90 Hip Rotation w. Lean": "https://www.youtube.com/watch?v=kYv_3e2Wz-E",
    "90/90 Hip Rotation w. Tibial Rotations": "https://www.youtube.com/watch?v=z3_P2nflZ9I",
    "Foam Roller Hip Hike": "https://www.youtube.com/watch?v=Vl8dFfR72lM",
    "Single Leg Stand": "https://www.youtube.com/watch?v=1F2lW61H9mY",
    "Kickstand RDL": "https://www.youtube.com/watch?v=1855a_64s10",
    "Short Stance Split Squat": "https://www.youtube.com/watch?v=2C-uNgKwPLE",
    "Single Leg Foam Roller Bridge": "https://www.youtube.com/watch?v=eYkK4WvFfG8",
    "Foam Roller Bridge": "https://www.youtube.com/watch?v=eYkK4WvFfG8",
    "Bench Sit Up": "https://www.youtube.com/watch?v=y3Y68bU1N-M",
    "Side Split Inchworm": "https://www.youtube.com/watch?v=jW2tA2qJ_7c",
    "Bench Pigeon Stretch": "https://www.youtube.com/watch?v=O1V3W_qf4jM",
    "Breath Work": "https://www.youtube.com/watch?v=tybOi4hjZFQ",
    "Pull Up": "https://www.youtube.com/watch?v=eGo4IYlbE5g",
    "Couch Stretch w. Overhead Side Bend": "https://www.youtube.com/watch?v=nO3_7lK2R5Y",
    "Deficit Push Up": "https://www.youtube.com/watch?v=v9U3qHk4d6k",
    "Back Squat": "https://www.youtube.com/watch?v=bEv6CCg2BC8",
    "RDL": "https://www.youtube.com/watch?v=JCXUYuzwNrM",
    "FFE Split Squat": "https://www.youtube.com/watch?v=6h09L8mQGvY",
    "Kettlebell Swing": "https://www.youtube.com/watch?v=sSESeQAir2M",
    "Reverse Lunge": "https://www.youtube.com/watch?v=LqU92T5f8a0",
    "Cat Cow": "https://www.youtube.com/watch?v=w_UKkct15o8",
    "Yoga Push Up": "https://www.youtube.com/watch?v=M9iMvZgL5L8",
}

def get_video_url(exercise_name):
    if exercise_name in VIDEO_PRESETS:
        return VIDEO_PRESETS[exercise_name]
    query = "+".join(exercise_name.split())
    return f"https://www.youtube.com/results?search_query={query}+exercise"

def categorize(name):
    lower = name.lower()
    if "breath" in lower:
        return "Breathwork"
    if any(k in lower for k in ["mobility", "stretch", "roll over", "cat cow", "cat camel", "t-spine", "windmill", "couch", "worlds greatest", "up to down", "wall angel", "car", "massage"]):
        return "Mobility"
    if any(k in lower for k in ["jump", "leap", "skip", "plyo"]):
        return "Plyometrics"
    if any(k in lower for k in ["plank", "sit up", "dead bug", "wood chop", "inchworm", "knee raise", "toe extension", "crunches"]):
        return "Core & Trunk"
    if any(k in lower for k in ["squat", "rdl", "split squat", "hip hike", "stand", "calf raise", "pelvic", "knee roll", "hip rotation", "bridge", "hamstring", "lunge"]):
        return "Lower Body"
    if any(k in lower for k in ["push up", "pull up", "chin up", "press", "row", "lat pull", "curl", "dips", "dead hang", "pump"]):
        return "Upper Body"
    return "Strength"

print("Helper ready")
