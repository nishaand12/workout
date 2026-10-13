import pypdf
import glob
import re
import json

def clean_text(t):
    return t.replace('\xa0', ' ').replace('\u201d', '"').replace('\u201c', '"').strip()

# Standard exercise normalization map for line breaks or OCR splits
EXERCISE_CLEANUP = {
    "90/90 Hip Rotation with\nLift O!": "90/90 Hip Rotation with Lift Off",
    "90/90 Hip Rotation with Lift O!": "90/90 Hip Rotation with Lift Off",
    "Foam Roller Hip\nHike": "Foam Roller Hip Hike",
    "Bent to Straight Knee Calf\nRaise": "Bent to Straight Knee Calf Raise",
    "Short Stance Split\nSquat": "Short Stance Split Squat",
    "Single Leg Foam Roller\nBridge": "Single Leg Foam Roller Bridge",
    "Side Split\nInchworm": "Side Split Inchworm",
    "Bench Pigeon\nStretch": "Bench Pigeon Stretch",
    "1/2 Kneeling Overhead\nSide Bend": "1/2 Kneeling Overhead Side Bend",
    "Split Stance Single Arm Cable Row (w.\nrotation)": "Split Stance Single Arm Cable Row (w. rotation)",
    "Banded Ankle Inversion/\nEversion": "Banded Ankle Inversion/Eversion",
    "90/90 Hip Rotation w. Tibial\nRotations": "90/90 Hip Rotation w. Tibial Rotations",
    "Deﬁcit Push Up": "Deficit Push Up",
}

print("Ready to develop full parser")
