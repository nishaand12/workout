import re

LEXICON = [
    "Pelvic Tilts", "90/90 Knee Rolls", "90/90 Hip Rotation with Lift Off", "90/90 Hip Rotation",
    "90/90 Hip Rotation w. Lean", "90/90 Hip Rotation w. Tibial Rotations",
    "Foam Roller Hip Hike", "Single Leg Stand", "Kickstand RDL", "Short Stance Split Squat",
    "Single Leg Foam Roller Bridge", "Foam Roller Bridge", "Bench Sit Up", "Single Leg Bench Sit Up",
    "Side Split Inchworm", "Bench Pigeon Stretch", "Breath Work", "General Dynamic Mobility",
    "T-spine Windmill", "Cat Cow", "Yoga Push Up", "Bodyweight Squat", "Sky to Toes",
    "Bodyweight Reverse Lunge", "Bodyweight SL RDL", "Bodyweight Side Squat", "Pull Up", "Chin Up",
    "Couch Stretch w. Overhead Side Bend", "Couch Stretch", "Deficit Push Up",
    "Split Stance Single Arm Cable Row (w. rotation)", "Split Stance Single Arm Cable Row",
    "1/2 Kneeling SA Cable Row", "Lower Body Roll Over", "Upper Body Pump", "General Mobility",
    "Bent to Straight Knee Calf Raise", "A-Skip", "Leaps - Light Tier", "Low Ceiling Squat Jump",
    "FFE Split Squat", "RFE Split Squat", "1/2 Kneeling Overhead Side Bend", "RDL",
    "Curtsey to Side Lunge", "Balancing Calf Raise", "Banded Ankle Circles",
    "Banded Ankle Inversion/Eversion", "Big Toe Extension Stretch", "Foot Crunches",
    "Seated Hamstring Curl", "Hamstring Curl", "Hamstring Bridge", "Ankle Pronation",
    "Copenhagen Side Plank", "Slalom Squat Jump (Deep Tier)", "Light Split Exchange Leap",
    "Reverse Lunge", "SL RDL with Hip Lock", "Inversion to Eversion Lifts", "Cardio Warm Up",
    "Cat Camel", "Thread the Needle", "Alternating Prone Shoulder CAR", "Prone Shoulder CAR",
    "Side Bend", "DB Incline Bench Press", "3-Point Stance Row", "Lu Raise",
    "Deep Lunge Jump", "Deep Squat Jump", "Back Squat", "Hanging Knee Raise",
    "Single Leg Calf Raise", "Seated Calf Raise", "Leg Press Calf Raise", "Dips",
    "Single Arm Lat Pulldown", "Lat Pull Down", "DB Bench Press", "Side Lying Scissor Slide",
    "Side Plank w. Side Bend", "Side Plank w. Leg Raise", "Kneeling Hip CAR", "Standing Hip CAR",
    "Floating Heel Foot Clock", "Manual Foot Massage", "Seated Ankle Circles", "Bike",
    "Worlds Greatest Mobility", "Worlds Greatest Stretch", "Up to Down Dog",
    "Wall T-Spine Rotations", "Wall Angels", "Alternating Machine Row", "BB Overhead Press",
    "Cable Wood Chop (low-high)", "Cable Wood Chop (high-low)", "Alternating SA Dead Hang",
    "SA Dead Hang", "Rhythm Lunge", "Kettlebell Swing", "Cable Hip Abduction", "Cable Hip Adduction",
    "Cable Cross Face Pull", "Goblet Side Lunge", "Goblet Side Squat", "Bear Crawl to Downward Dog",
    "1/2 Kneeling SA Overhead Press", "1/2 Kneeling T-Spine Rotation"
]

LEXICON.sort(key=lambda s: len(s), reverse=True)

def find_exercise_in_text(text):
    clean = text.replace('\xa0', ' ').replace('Lift O!', 'Lift Off').strip()
    for ex in LEXICON:
        if ex.lower() in clean.lower():
            return ex
    return None

print("Lexicon matching test ready")
