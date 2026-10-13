import re
import json
import glob
import pypdf

from build_seed_data import get_video_url, categorize

DAYS_PATTERN = re.compile(r'((?:MONDAY|TUESDAY|WEDNESDAY|THURSDAY|FRIDAY|SATURDAY|SUNDAY)\s*-\s*[A-Z]{3,4}\.?\s+\d{1,2},\s+\d{4})')

# We can parse the PDFs by splitting on day headers!
pdf_configs = [
    ("reference/TeamBuildr - 2025 Workout.pdf", "July 2025 Program (Week 4)", "Day 1 - Week 4"),
    ("reference/TeamBuildr - Printable Workout.pdf", "January 2026 Program", "Week 1"),
    ("reference/TeamBuildr - Feb Workout.pdf", "February 2026 Program", "Week 2"),
    ("reference/TeamBuildr - July Workout.pdf", "July 2026 Program", "Week 3"),
]

workouts_list = []
all_exercises_map = {}

def clean_txt(t):
    return t.replace('\xa0', ' ').replace('’', "'").replace('”', '"').replace('“', '"').strip()

for pdf_path, program_name, tag in pdf_configs:
    reader = pypdf.PdfReader(pdf_path)
    full_text = ""
    for page in reader.pages:
        full_text += "\n" + page.extract_text()
    
    # Split text into days
    splits = DAYS_PATTERN.split(full_text)
    # splits[0] is header before first day
    # splits[1] is day title, splits[2] is day text, splits[3] is day title, etc.
    for i in range(1, len(splits), 2):
        day_title = splits[i].strip()
        day_body = splits[i+1]
        
        # Stop at next header or page break
        lines = [clean_txt(l) for l in day_body.split('\n') if clean_txt(l)]
        
        # Determine day name
        display_title = day_title
        if "JUL. 14, 2025" in day_title:
            display_title = "Day 1 - Week 4 (Monday - Jul. 14, 2025)"
        elif "JAN. 12, 2026" in day_title:
            display_title = "Day 1 - Week 1 (Monday - Jan. 12, 2026)"
        
        workout = {
            "title": display_title,
            "raw_day": day_title,
            "program_name": program_name,
            "video_url": "https://www.youtube.com/watch?v=0h9Vp171R2c", # session briefing video
            "description": f"Workout session for {day_title} from {program_name}.",
            "exercises": []
        }
        
        # Parse exercises in this day
        # Let's extract superset letters and exercises
        # In the lines, we look for exercise names and sets/reps
        # Let's inspect each line
        curr_exercise = None
        j = 0
        superset_char = "A"
        
        while j < len(lines):
            line = lines[j]
            # Skip table header lines or page lines
            if any(h in line for h in ["Workout Max/PR Set", "ATH3645765", "https://", "Page ", "NISHAAN DULAY"]):
                j += 1
                continue
            
            # Check if this line is a superset group indicator or starts with single letter
            if len(line) == 1 and line in "ABCDEFGH":
                superset_char = line
                j += 1
                continue
            
            # Check if line defines an exercise (e.g. Pelvic Tilts N/A 10 10, or Kickstand RDL 80 8 (ea.) 8 (ea.))
            # Or Breath Work
            if "Breath Work" in line:
                ex_name = "Breath Work"
                notes = ""
                # gather subsequent lines until next day or end
                k = j + 1
                while k < len(lines) and not any(d in lines[k] for d in ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"]) and not any(h in lines[k] for h in ["Workout Max/PR", "ATH3645"]):
                    notes += " " + lines[k]
                    k += 1
                workout["exercises"].append({
                    "name": ex_name,
                    "superset_group": "E" if superset_char in ["D", "E"] else superset_char,
                    "prescription_text": "1 X 5 MINS",
                    "prescribed_sets": 1,
                    "target_reps": "5 mins",
                    "target_weight": "0",
                    "rest_seconds": 0,
                    "notes": notes.strip(),
                    "is_ea": False
                })
                all_exercises_map[ex_name] = {
                    "name": ex_name,
                    "category": "Breathwork",
                    "default_notes": notes.strip(),
                    "video_url": get_video_url(ex_name)
                }
                j = k
                continue

            # Check if line has General Dynamic Mobility or Cardio Warm Up
            if "General Dynamic Mobility" in line or "Cardio Warm Up" in line:
                ex_name = "General Dynamic Mobility" if "Mobility" in line else "Cardio Warm Up"
                notes = ""
                k = j + 1
                while k < len(lines) and not re.search(r'(?:N\/A|\d+R|\d+)\s+\d+', lines[k]) and not any(h in lines[k] for h in ["Workout Max/PR", "MONDAY", "TUESDAY"]):
                    notes += "\n" + lines[k]
                    k += 1
                workout["exercises"].append({
                    "name": ex_name,
                    "superset_group": "A",
                    "prescription_text": "1 Round",
                    "prescribed_sets": 1,
                    "target_reps": "1 round",
                    "target_weight": "0",
                    "rest_seconds": 0,
                    "notes": notes.strip(),
                    "is_ea": False
                })
                all_exercises_map[ex_name] = {
                    "name": ex_name,
                    "category": "Mobility",
                    "default_notes": notes.strip(),
                    "video_url": get_video_url(ex_name)
                }
                j = k
                continue

            # Standard exercise row pattern: ExerciseName [MaxPR] Set1 Set2 Set3...
            # e.g.: Pelvic Tilts N/A 10 10
            # or: Kickstand RDL 80 8 (ea.) 8 (ea.) 8 (ea.)
            m = re.match(r'^(.*?)\s+(N\/A|\d+R|\d+)\s+([\d\-\s\(\)\.easecsALAPAMAP]+)$', line)
            if m:
                ex_name = m.group(1).strip()
                max_pr = m.group(2).strip()
                sets_raw = m.group(3).strip()
                
                # Check next line for coaching cues
                notes = ""
                k = j + 1
                while k < len(lines):
                    next_l = lines[k]
                    # If next line looks like another exercise or header or letter, stop
                    if re.match(r'^(.*?)\s+(N\/A|\d+R|\d+)\s+([\d\-\s\(\)\.easecsALAPAMAP]+)$', next_l) or (len(next_l) == 1 and next_l in "ABCDEFGH") or any(h in next_l for h in ["Workout Max/PR", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "Breath Work"]):
                        break
                    notes += " " + next_l
                    k += 1
                
                # Clean up ex_name
                # If ex_name starts with non-breaking char or numbers, clean it
                ex_name = re.sub(r'^[^\w\(\)]+', '', ex_name).strip()
                if ex_name:
                    # Count sets from sets_raw
                    # e.g. "10 10" -> 2 sets of 10
                    # "8 (ea.) 8 (ea.) 8 (ea.)" -> 3 sets of 8 (ea.)
                    tokens = [t for t in re.split(r'\s{2,}', sets_raw) if t.strip()]
                    num_sets = len(tokens) if len(tokens) > 0 else 2
                    rep_sample = tokens[0] if tokens else "10"
                    
                    is_ea = "ea" in sets_raw.lower() or "ea" in rep_sample.lower()
                    
                    # Rest timer detection from notes
                    rest_sec = 0
                    rest_m = re.search(r'Rest\s+(\d+)\s*secs', notes, re.IGNORECASE)
                    if rest_m:
                        rest_sec = int(rest_m.group(1))
                    elif "120" in notes:
                        rest_sec = 120
                    elif "90" in notes:
                        rest_sec = 90
                    elif "45" in notes:
                        rest_sec = 45
                    
                    prescription = f"{num_sets} X {rep_sample.upper()}"
                    
                    workout["exercises"].append({
                        "name": ex_name,
                        "superset_group": superset_char,
                        "prescription_text": prescription,
                        "prescribed_sets": num_sets,
                        "target_reps": rep_sample,
                        "target_weight": "0" if max_pr == "N/A" else max_pr,
                        "rest_seconds": rest_sec,
                        "notes": notes.strip(),
                        "is_ea": is_ea
                    })
                    
                    if ex_name not in all_exercises_map:
                        all_exercises_map[ex_name] = {
                            "name": ex_name,
                            "category": categorize(ex_name),
                            "default_notes": notes.strip(),
                            "video_url": get_video_url(ex_name)
                        }
                j = k
                continue
            
            j += 1
            
        if len(workout["exercises"]) > 0:
            workouts_list.append(workout)

print(f"Parsed {len(workouts_list)} total workouts!")
print(f"Discovered {len(all_exercises_map)} unique exercises!")

with open("reference/parsed_workouts.json", "w") as out:
    json.dump({
        "exercises": list(all_exercises_map.values()),
        "workouts": workouts_list
    }, out, indent=2)

print("Saved reference/parsed_workouts.json")
