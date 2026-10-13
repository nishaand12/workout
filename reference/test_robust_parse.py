import re

# Test lines from Page 1
raw = [
    "Pelvic Tilts N/A \xa0\xa0\xa0\xa0 10 \xa0\xa0\xa0\xa0 10",
    "90/90 Knee Rolls N/A \xa0\xa0\xa0\xa0 10 (ea.) \xa0\xa0\xa0\xa0 10 (ea.)",
    "90/90 Hip Rotation with",
    "Lift O!",
    "N/A \xa0\xa0\xa0\xa0 5 (ea.) \xa0\xa0\xa0\xa0 5 (ea.)",
    "Hands free if possible - 3 sec hold on each lift",
    "Foam Roller Hip Hike N/A \xa0\xa0\xa0\xa0 8 (ea.) \xa0\xa0\xa0\xa0 8 (ea.)",
    "should feel your outside glute working hard on these",
    "Single Leg Stand N/A \xa0\xa0\xa0\xa0 30 secs (ea.) \xa0\xa0\xa0\xa0 30 secs (ea.)",
    "Kickstand RDL",
    "80 \xa0\xa0\xa0\xa0 8 (ea.) \xa0\xa0\xa0\xa0 8 (ea.) \xa0\xa0\xa0\xa0 8 (ea.)",
    "Pause for 1 seconds at bottom of each rep - bodyweight - same starting position as the single leg",
    "stand, just adding the hinge",
    "Short Stance Split Squat N/A \xa0\xa0\xa0\xa0 12 (ea.) \xa0\xa0\xa0\xa0 12 (ea.) \xa0\xa0\xa0\xa0 12 (ea.)",
    "2-3 seconds down, 2-3 second up - Rest 120 secs. between sets",
    "Single Leg Foam Roller",
    "Bridge",
    "N/A \xa0\xa0\xa0\xa0 20 secs (ea.) \xa0\xa0\xa0\xa0 20 secs (ea.)",
    "normal to feel a little crampy here. If you fully cramp, stop and reset",
    "Bench Sit Up N/A \xa0\xa0\xa0\xa0 15 \xa0\xa0\xa0\xa0 15",
    "Side Split Inchworm N/A \xa0\xa0\xa0\xa0 5 (ea.) \xa0\xa0\xa0\xa0 5 (ea.)",
    "Bench Pigeon Stretch N/A \xa0\xa0\xa0\xa0 20-30 secs (ea.) \xa0\xa0\xa0\xa0 20-30 secs (ea.)",
    "can play around with this a bit here, ﬁnd where the hips are tighter",
    "Breath Work",
    "- 5 minutes -",
    "Lay on your back with your feet and calves up on a bench."
]

letters = ['A', 'A', 'A', 'A', 'B', 'B', 'C', 'D', 'D', 'E', 'E']

def parse_day_lines(lines, letters):
    exercises = []
    i = 0
    let_idx = 0
    name_buffer = []
    
    while i < len(lines):
        line = lines[i].replace('\xa0', ' ').replace('’', "'").replace('”', '"').replace('“', '"').replace('ﬁ', 'fi').strip()
        
        if line.startswith("Breath Work"):
            cues = " ".join(lines[i+1:])
            exercises.append({
                "letter": "E",
                "name": "Breath Work",
                "prescription": "- 5 MINUTES -",
                "sets": 1,
                "reps": "5 mins",
                "weight": "0",
                "rest": 0,
                "notes": cues.strip()
            })
            break
            
        # Match table row with sets:
        # Either "Name N/A 10 10" or "N/A 5 (ea.) 5 (ea.)" or "80 8 (ea.) 8 (ea.) 8 (ea.)"
        m_full = re.match(r'^(.*?)\s+(N\/A|\d+R|\d+)\s+([\d\-\s\(\)\.easecsALAPAMAP]+)$', line)
        m_partial = re.match(r'^(N\/A|\d+R|\d+)\s+([\d\-\s\(\)\.easecsALAPAMAP]+)$', line)
        
        if m_partial and name_buffer:
            ex_name = " ".join(name_buffer).strip()
            max_pr = m_partial.group(1).strip()
            sets_raw = m_partial.group(2).strip()
            name_buffer = []
        elif m_full and len(m_full.group(1).strip()) > 1:
            ex_name = m_full.group(1).strip()
            if name_buffer:
                ex_name = " ".join(name_buffer) + " " + ex_name
                name_buffer = []
            max_pr = m_full.group(2).strip()
            sets_raw = m_full.group(3).strip()
        else:
            # Could be part of exercise name or a coaching cue!
            # If line is coaching cue (e.g. "Hands free", "Pause for", "should feel", "2-3 seconds", "normal to", "can play")
            if any(cue in line.lower() for cue in ["hands free", "pause", "should feel", "seconds", "cramp", "play around", "rest "]):
                if exercises:
                    exercises[-1]["notes"] = (exercises[-1]["notes"] + " " + line).strip()
            else:
                name_buffer.append(line)
            i += 1
            continue

        # Clean ex_name
        ex_name = ex_name.replace("Lift O!", "Lift Off")
        
        let = letters[let_idx] if let_idx < len(letters) else "A"
        let_idx += 1
        
        tokens = [t for t in re.split(r'\s{2,}', sets_raw) if t.strip()]
        num_sets = len(tokens) if len(tokens) > 0 else 2
        rep_val = tokens[0] if tokens else "10"
        
        exercises.append({
            "letter": let,
            "name": ex_name,
            "prescription": f"{num_sets} X {rep_val.upper()}",
            "sets": num_sets,
            "reps": rep_val,
            "weight": "0" if max_pr == "N/A" else max_pr,
            "rest": 120 if "120" in line else 0,
            "notes": ""
        })
        i += 1

    return exercises

parsed = parse_day_lines(raw, letters)
for p in parsed:
    print(f"[{p['letter']}] {p['name']} -> {p['prescription']} (wt: {p['weight']}) | Notes: {p['notes'][:40]}")
