import re
import json
import glob
import pypdf
from build_seed_data import get_video_url, categorize, VIDEO_PRESETS

# Comprehensive Lexicon of exercises found in TeamBuildr workouts
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

pdf_configs = [
    ("reference/TeamBuildr - 2025 Workout.pdf", "July 2025 Phase (Week 4)", "2025-07-14"),
    ("reference/TeamBuildr - Printable Workout.pdf", "January 2026 Phase (Week 1)", "2026-01-12"),
    ("reference/TeamBuildr - Feb Workout.pdf", "February 2026 Phase (Week 2)", "2026-02-16"),
    ("reference/TeamBuildr - July Workout.pdf", "July 2026 Phase (Week 3)", "2026-07-05"),
]

def clean(t):
    return t.replace('\xa0', ' ').replace('’', "'").replace('”', '"').replace('“', '"').replace('ﬁ', 'fi').replace('ﬂ', 'fl').replace('Lift O!', 'Lift Off').strip()

all_exercises_map = {}
workouts = []

for pdf_path, program_name, default_date in pdf_configs:
    reader = pypdf.PdfReader(pdf_path)
    
    # Process page by page
    for page_idx, page in enumerate(reader.pages):
        raw_lines = [clean(l) for l in page.extract_text().split('\n') if clean(l)]
        
        # 1. Letters at top of page
        letters = []
        i = 0
        while i < len(raw_lines):
            l = raw_lines[i]
            if any(h in l for h in ["TeamBuildr", "Page ", "https://"]):
                i += 1
                continue
            if len(l) == 1 and l in "ABCDEFGH":
                letters.append(l)
                i += 1
            else:
                break
                
        remaining_lines = raw_lines[i:]
        letter_idx = 0
        
        # Scan lines on this page
        j = 0
        while j < len(remaining_lines):
            line = remaining_lines[j]
            
            # Check for day header
            day_match = re.match(r'^(MONDAY|TUESDAY|WEDNESDAY|THURSDAY|FRIDAY|SATURDAY|SUNDAY)\s*-\s*([A-Z]{3,4}\.?\s+\d{1,2},\s+\d{4})', line, re.IGNORECASE)
            if day_match:
                day_str = line
                title = day_str
                if "JUL. 14, 2025" in day_str:
                    title = "Day 1 - Week 4 (Monday - Jul. 14, 2025)"
                elif "JAN. 12, 2026" in day_str:
                    title = "Day 1 - Week 1 (Monday - Jan. 12, 2026)"
                
                # Check if workout already exists (if continuing from previous page)
                existing = next((w for w in workouts if w["date"] == day_str and w["program_name"] == program_name), None)
                if not existing:
                    current_workout = {
                        "title": title,
                        "program_name": program_name,
                        "date": day_str,
                        "description": f"TeamBuildr workout session for {day_str}.",
                        "video_url": "https://www.youtube.com/watch?v=0h9Vp171R2c",
                        "exercises": []
                    }
                    workouts.append(current_workout)
                else:
                    current_workout = existing
                j += 1
                continue
                
            if not workouts:
                j += 1
                continue
                
            current_workout = workouts[-1]
            
            if any(h in line for h in ["Workout Max/PR", "NISHAAN DULAY", "ATH3645", "https://", "TeamBuildr"]):
                j += 1
                continue
                
            # Check if this line starts with or contains an exercise from LEXICON
            matched_ex = None
            for ex in LEXICON:
                # check if line starts with ex or line equals ex
                if line.startswith(ex) or line.lower().startswith(ex.lower()):
                    matched_ex = ex
                    break
                # or if line is like "1/2 Kneeling Overhead Side Bend"
                if ex.lower() in line.lower() and not any(bad in line.lower() for bad in ["warm up", "notes", "rpe", "rest"]):
                    matched_ex = ex
                    break

            if matched_ex:
                # It's an exercise!
                ex_name = matched_ex
                # Look at line content for sets/reps
                line_after_ex = line[len(matched_ex):].strip()
                
                # Collect subsequent lines until next exercise or day header
                cues = []
                k = j + 1
                while k < len(remaining_lines):
                    next_l = remaining_lines[k]
                    # Check if next_l starts with an exercise or day header
                    if re.match(r'^(MONDAY|TUESDAY|WEDNESDAY|THURSDAY|FRIDAY|SATURDAY|SUNDAY)\s*-', next_l):
                        break
                    if any(next_l.startswith(ex) or next_l.lower().startswith(ex.lower()) for ex in LEXICON):
                        break
                    if any(h in next_l for h in ["Workout Max/PR", "NISHAAN DULAY", "https://"]):
                        break
                    cues.append(next_l)
                    k += 1
                
                full_block = (line_after_ex + " " + " ".join(cues)).strip()
                
                # Extract max/pr and sets
                m_sets = re.search(r'(?:N\/A|\d+R|\d+)\s+([\d\-\s\(\)\.easecsALAPAMAP]+)', full_block)
                sets_raw = m_sets.group(1).strip() if m_sets else "10 10"
                tokens = [t for t in re.split(r'\s{2,}', sets_raw) if t.strip()]
                num_sets = len(tokens) if len(tokens) > 0 else 2
                rep_sample = tokens[0] if tokens else "10"
                
                # Max/PR
                m_max = re.search(r'\b(\d+R|\d+)\b', line_after_ex)
                target_weight = m_max.group(1) if m_max and m_max.group(1) != "10" else "0"
                
                # Letter
                let = letters[letter_idx] if letter_idx < len(letters) else "A"
                letter_idx += 1
                
                # Rest seconds
                rest_s = 0
                rest_m = re.search(r'Rest\s+(\d+)\s*secs', full_block, re.IGNORECASE)
                if rest_m:
                    rest_s = int(rest_m.group(1))
                elif "120 secs" in full_block:
                    rest_s = 120
                elif "90 secs" in full_block:
                    rest_s = 90
                elif "45 secs" in full_block:
                    rest_s = 45
                    
                # Clean coaching cues (remove sets numbers from cues)
                notes_text = " ".join([c for c in cues if not re.match(r'^(?:N\/A|\d+R|\d+)\s+[\d\-\s\(\)\.easecsALAPAMAP]+$', c)]).strip()
                
                is_ea = "ea" in full_block.lower()
                presc_str = f"{num_sets} X {rep_sample.upper()}"
                if ex_name == "Breath Work":
                    presc_str = "- 5 MINUTES -"
                    num_sets = 1
                    rep_sample = "5 mins"
                    let = "E"
                elif ex_name in ["General Dynamic Mobility", "Cardio Warm Up"]:
                    presc_str = "1 Round"
                    num_sets = 1
                    rep_sample = "1 round"
                    let = "A"

                current_workout["exercises"].append({
                    "name": ex_name,
                    "superset_group": let,
                    "prescription_text": presc_str,
                    "prescribed_sets": num_sets,
                    "target_reps": rep_sample,
                    "target_weight": target_weight,
                    "rest_seconds": rest_s,
                    "notes": notes_text,
                    "is_ea": is_ea
                })
                
                if ex_name not in all_exercises_map:
                    all_exercises_map[ex_name] = {
                        "name": ex_name,
                        "category": categorize(ex_name),
                        "default_notes": notes_text,
                        "video_url": get_video_url(ex_name)
                    }
                
                j = k
                continue
            
            j += 1

# Sort workouts so Day 1 - Week 4 (Monday - Jul. 14, 2025) is first
workouts.sort(key=lambda w: 0 if "Day 1 - Week 4" in w["title"] else 1)

output_data = {
    "exercises": list(all_exercises_map.values()),
    "workouts": workouts
}

with open("reference/clean_seed_data.json", "w") as f:
    json.dump(output_data, f, indent=2)

print(f"Success! Generated clean_seed_data.json with {len(output_data['exercises'])} exercises and {len(output_data['workouts'])} workouts!")
