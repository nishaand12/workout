import pypdf
import glob
import re
import json
import os

pdf_files = [
    ("TeamBuildr - 2025 Workout.pdf", "July 2025 Phase (Week 4)", "2025-07-14"),
    ("TeamBuildr - Printable Workout.pdf", "January 2026 Phase (Week 1)", "2026-01-12"),
    ("TeamBuildr - Feb Workout.pdf", "February 2026 Phase (Week 2)", "2026-02-16"),
    ("TeamBuildr - July Workout.pdf", "July 2026 Phase (Week 3)", "2026-07-05"),
]

# Map common exercise names to categories
def categorize_exercise(name):
    lower = name.lower()
    if any(k in lower for k in ["breath", "breathing"]):
        return "Breathwork"
    if any(k in lower for k in ["mobility", "stretch", "roll over", "cat cow", "cat camel", "t-spine", "windmill", "couch stretch", "worlds greatest", "up to down dog", "wall angel", "car", "massage"]):
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

def default_video_for(name):
    # Helpful YouTube query or high quality embed
    query = "+".join(name.split())
    # Example direct educational demonstration links or search links
    # For user ease, embed searchable/playable video
    # We can provide a clean youtube search or well-known demo url
    return f"https://www.youtube.com/results?search_query={query}+exercise+technique"

print("Parser scaffold ready")
