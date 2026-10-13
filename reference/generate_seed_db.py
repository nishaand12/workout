import re
import json
import glob
import pypdf
from build_seed_data import get_video_url, categorize, VIDEO_PRESETS

pdf_configs = [
    ("reference/TeamBuildr - 2025 Workout.pdf", "July 2025 Phase (Week 4)"),
    ("reference/TeamBuildr - Printable Workout.pdf", "January 2026 Phase (Week 1)"),
    ("reference/TeamBuildr - Feb Workout.pdf", "February 2026 Phase (Week 2)"),
    ("reference/TeamBuildr - July Workout.pdf", "July 2026 Phase (Week 3)"),
]

def clean(t):
    return t.replace('\xa0', ' ').replace('’', "'").replace('”', '"').replace('“', '"').replace('ﬁ', 'fi').replace('ﬂ', 'fl').strip()

all_exercises = {}
workouts = []

# Known manual corrections for split names in PDF
REPLACE_NAMES = {
    "90/90 Hip Rotation with Lift O!": "90/90 Hip Rotation with Lift Off",
    "90/90 Hip Rotation with Lift Off": "90/90 Hip Rotation with Lift Off",
    "Foam Roller Hip Hike": "Foam Roller Hip Hike",
    "Single Leg Foam Roller Bridge": "Single Leg Foam Roller Bridge",
    "Short Stance Split Squat": "Short Stance Split Squat",
    "Bent to Straight Knee Calf Raise": "Bent to Straight Knee Calf Raise",
    "1/2 Kneeling Overhead Side Bend": "1/2 Kneeling Overhead Side Bend",
    "Split Stance Single Arm Cable Row (w. rotation)": "Split Stance Single Arm Cable Row (w. rotation)",
    "Banded Ankle Inversion/Eversion": "Banded Ankle Inversion/Eversion",
    "90/90 Hip Rotation w. Tibial Rotations": "90/90 Hip Rotation w. Tibial Rotations",
    "Side Split Inchworm": "Side Split Inchworm",
    "Bench Pigeon Stretch": "Bench Pigeon Stretch",
    "Deﬁcit Push Up": "Deficit Push Up",
    "Deficit Push Up": "Deficit Push Up"
}

for pdf_path, program_name in pdf_configs:
    reader = pypdf.PdfReader(pdf_path)
    current_day = None
    current_workout = None
    
    for page_idx, page in enumerate(reader.pages):
        raw_lines = [clean(l) for l in page.extract_text().split('\n') if clean(l)]
        
        # 1. Extract superset letters from top of page
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
        
        page_lines = raw_lines[i:]
        
        # Pre-process page lines to rejoin split exercise names
        rejoined = []
        k = 0
        while k < len(page_lines):
            l = page_lines[k]
            if k + 1 < len(page_lines):
                next_l = page_lines[k+1]
                combo = f"{l} {next_l}"
                if any(combo.startswith(k_name) or combo == k_name for k_name in [
                    "90/90 Hip Rotation with Lift O!", "Foam Roller Hip Hike",
                    "Single Leg Foam Roller Bridge", "Short Stance Split Squat",
                    "Bent to Straight Knee Calf Raise", "1/2 Kneeling Overhead Side Bend",
                    "Split Stance Single Arm Cable Row (w. rotation)", "Banded Ankle Inversion/Eversion",
                    "90/90 Hip Rotation w. Tibial Rotations", "Side Split Inchworm",
                    "Bench Pigeon Stretch", "Single Leg Calf Raise", "Single Arm Lat Pulldown",
                    "Side Plank w. Leg Raise", "Side Plank w. Side Bend", "Floating Heel Foot Clock"
                ]):
                    rejoined.append(combo)
                    k += 2
                    continue
            rejoined.append(l)
            k += 1
            
        page_lines = rejoined
        letter_idx = 0
        idx = 0
        
        while idx < len(page_lines):
            line = page_lines[idx]
            
            # Check for day header
            day_match = re.match(r'^(MONDAY|TUESDAY|WEDNESDAY|THURSDAY|FRIDAY|SATURDAY|SUNDAY)\s*-\s*([A-Z]{3,4}\.?\s+\d{1,2},\s+\d{4})', line, re.IGNORECASE)
            if day_match:
                if current_workout and len(current_workout["exercises"]) > 0:
                    workouts.append(current_workout)
                
                day_str = line
                # friendly title
                title = day_str
                if "JUL. 14, 2025" in day_str:
                    title = "Day 1 - Week 4 (Monday - Jul. 14, 2025)"
                elif "JAN. 12, 2026" in day_str:
                    title = "Day 1 - Week 1 (Monday - Jan. 12, 2026)"
                
                current_workout = {
                    "title": title,
                    "program_name": program_name,
                    "date": day_str,
                    "description": f"TeamBuildr workout session for {day_str}.",
                    "video_url": "https://www.youtube.com/watch?v=0h9Vp171R2c",
                    "exercises": []
                }
                idx += 1
                continue
                
            if current_workout is None:
                idx += 1
                continue
                
            if any(h in line for h in ["Workout Max/PR Set", "NISHAAN DULAY", "ATH3645", "https://"]):
                idx += 1
                continue
                
            # Breath Work
            if "Breath Work" in line:
                cues = ""
                m = idx + 1
                while m < len(page_lines) and not re.match(r'^(MONDAY|TUESDAY|WEDNESDAY|THURSDAY|FRIDAY|SATURDAY|SUNDAY)\s*-', page_lines[m]) and not any(h in page_lines[m] for h in ["Workout Max/PR"]):
                    cues += " " + page_lines[m]
                    m += 1
                
                current_workout["exercises"].append({
                    "name": "Breath Work",
                    "superset_group": "E",
                    "prescription_text": "- 5 MINUTES -",
                    "prescribed_sets": 1,
                    "target_reps": "5 mins",
                    "target_weight": "0",
                    "rest_seconds": 0,
                    "notes": cues.strip(),
                    "is_ea": False
                })
                all_exercises["Breath Work"] = {
                    "name": "Breath Work",
                    "category": "Breathwork",
                    "default_notes": cues.strip(),
                    "video_url": get_video_url("Breath Work")
                }
                idx = m
                continue

            # General Dynamic Mobility / Cardio Warm Up
            if "General Dynamic Mobility" in line or "Cardio Warm Up" in line:
                ex_name = "General Dynamic Mobility" if "Mobility" in line else "Cardio Warm Up"
                cues = ""
                m = idx + 1
                while m < len(page_lines) and not re.search(r'(?:N\/A|\d+R|\d+)\s+[\d\-]+', page_lines[m]) and not re.match(r'^(MONDAY|TUESDAY|WEDNESDAY|THURSDAY|FRIDAY|SATURDAY|SUNDAY)\s*-', page_lines[m]):
                    cues += "\n" + page_lines[m]
                    m += 1
                
                current_workout["exercises"].append({
                    "name": ex_name,
                    "superset_group": "A",
                    "prescription_text": "1 Round",
                    "prescribed_sets": 1,
                    "target_reps": "1 round",
                    "target_weight": "0",
                    "rest_seconds": 0,
                    "notes": cues.strip(),
                    "is_ea": False
                })
                all_exercises[ex_name] = {
                    "name": ex_name,
                    "category": "Mobility",
                    "default_notes": cues.strip(),
                    "video_url": get_video_url(ex_name)
                }
                idx = m
                continue
                
            # Exercise row: Name [Max/PR] [Set1] [Set2]...
            # e.g. "Pelvic Tilts N/A     10     10"
            # e.g. "Kickstand RDL 80     8 (ea.)     8 (ea.)     8 (ea.)"
            # e.g. "Pull Up 8R     3     3     AMAP"
            # Or with multi-line name already joined:
            match = re.match(r'^(.*?)\s+(N\/A|\d+R|\d+)\s+([\d\-\s\(\)\.easecsALAPAMAP]+)(.*)$', line)
            if match:
                raw_name = match.group(1).strip()
                max_pr = match.group(2).strip()
                sets_raw = match.group(3).strip()
                trailing_notes = match.group(4).strip()
                
                # Further cues on subsequent lines
                cues = trailing_notes
                m = idx + 1
                while m < len(page_lines):
                    next_line = page_lines[m]
                    if re.match(r'^(.*?)\s+(N\/A|\d+R|\d+)\s+([\d\-\s\(\)\.easecsALAPAMAP]+)', next_line) or re.match(r'^(MONDAY|TUESDAY|WEDNESDAY|THURSDAY|FRIDAY|SATURDAY|SUNDAY)\s*-', next_line) or "Breath Work" in next_line or any(h in next_line for h in ["Workout Max/PR"]):
                        break
                    cues += " " + next_line
                    m += 1
                
                # Superset letter
                superset_letter = "A"
                if letter_idx < len(letters):
                    superset_letter = letters[letter_idx]
                    letter_idx += 1
                
                # Clean name
                ex_name = REPLACE_NAMES.get(raw_name, raw_name)
                ex_name = re.sub(r'^[^\w\(\)]+', '', ex_name).strip()
                
                # Parse sets
                set_tokens = [t for t in re.split(r'\s{2,}', sets_raw) if t.strip()]
                num_sets = len(set_tokens) if len(set_tokens) > 0 else 2
                rep_val = set_tokens[0] if set_tokens else "10"
                is_ea = "ea" in sets_raw.lower()
                
                # Rest seconds
                rest_s = 0
                rest_m = re.search(r'Rest\s+(\d+)\s*secs', cues, re.IGNORECASE)
                if rest_m:
                    rest_s = int(rest_m.group(1))
                elif "120 secs" in cues:
                    rest_s = 120
                elif "90 secs" in cues:
                    rest_s = 90
                elif "45 secs" in cues:
                    rest_s = 45
                
                presc_text = f"{num_sets} X {rep_val.upper()}"
                
                current_workout["exercises"].append({
                    "name": ex_name,
                    "superset_group": superset_letter,
                    "prescription_text": presc_text,
                    "prescribed_sets": num_sets,
                    "target_reps": rep_val,
                    "target_weight": "0" if max_pr == "N/A" else max_pr,
                    "rest_seconds": rest_s,
                    "notes": cues.strip(),
                    "is_ea": is_ea
                })
                
                if ex_name not in all_exercises:
                    all_exercises[ex_name] = {
                        "name": ex_name,
                        "category": categorize(ex_name),
                        "default_notes": cues.strip(),
                        "video_url": get_video_url(ex_name)
                    }
                
                idx = m
                continue
                
            idx += 1

    if current_workout and len(current_workout["exercises"]) > 0:
        workouts.append(current_workout)

# Sort workouts so Day 1 - Week 4 (Monday - Jul. 14, 2025) is first (matches the user's screenshots!)
workouts.sort(key=lambda w: 0 if "Day 1 - Week 4" in w["title"] else 1)

output_data = {
    "exercises": list(all_exercises.values()),
    "workouts": workouts
}

with open("reference/seed_workouts.json", "w") as f:
    json.dump(output_data, f, indent=2)

print(f"Generated seed_workouts.json with {len(output_data['exercises'])} exercises and {len(output_data['workouts'])} workouts!")
