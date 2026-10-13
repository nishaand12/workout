import re
import json
import glob
import pypdf
from build_seed_data import get_video_url, categorize

DAY_HEADER_REGEX = re.compile(r'^(MONDAY|TUESDAY|WEDNESDAY|THURSDAY|FRIDAY|SATURDAY|SUNDAY)\s*-\s*([A-Z]{3,4}\.?\s+\d{1,2},\s+\d{4})', re.IGNORECASE)

KNOWN_MULTI_LINES = {
    ("90/90 Hip Rotation with", "Lift O!"): "90/90 Hip Rotation with Lift Off",
    ("Foam Roller Hip", "Hike"): "Foam Roller Hip Hike",
    ("Single Leg Foam Roller", "Bridge"): "Single Leg Foam Roller Bridge",
    ("Short Stance Split", "Squat"): "Short Stance Split Squat",
    ("Bent to Straight Knee Calf", "Raise"): "Bent to Straight Knee Calf Raise",
    ("1/2 Kneeling Overhead", "Side Bend"): "1/2 Kneeling Overhead Side Bend",
    ("Split Stance Single Arm Cable Row (w.", "rotation)"): "Split Stance Single Arm Cable Row (w. rotation)",
    ("Banded Ankle Inversion/", "Eversion"): "Banded Ankle Inversion/Eversion",
    ("90/90 Hip Rotation w. Tibial", "Rotations"): "90/90 Hip Rotation w. Tibial Rotations",
    ("Side Split", "Inchworm"): "Side Split Inchworm",
    ("Bench Pigeon", "Stretch"): "Bench Pigeon Stretch",
    ("Alternating Prone", "Shoulder CAR"): "Alternating Prone Shoulder CAR",
    ("Single Leg", "Calf Raise"): "Single Leg Calf Raise",
    ("Single Arm", "Lat Pulldown"): "Single Arm Lat Pulldown",
    ("Side Plank w.", "Leg Raise"): "Side Plank w. Leg Raise",
    ("Side Plank w.", "Side Bend"): "Side Plank w. Side Bend",
    ("Floating Heel", "Foot Clock"): "Floating Heel Foot Clock"
}

def clean_txt(t):
    return t.replace('\xa0', ' ').replace('’', "'").replace('”', '"').replace('“', '"').strip()

print("Refined parser helper ready")
