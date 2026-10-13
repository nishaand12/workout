import re
import glob
import json

files = sorted(glob.glob('/tmp/*.txt'))
exercises = set()

for f in files:
    with open(f, 'r', encoding='utf-8') as fp:
        content = fp.read()
    
    # Lines that look like exercises: start with non-breaking space or standard patterns
    # Or in tables: name followed by N/A or numbers
    lines = content.splitlines()
    for l in lines:
        l_clean = l.strip()
        # Look for pattern where line contains N/A or numbers with reps
        # e.g. "Pelvic Tilts N/A 10 10" or "Short Stance Split Squat N/A 10 (ea.)"
        match = re.search(r'^[ \s]*([A-Za-z0-9\/\-\(\)\.\'\s]+?)\s+(?:N\/A|\d+R|\d+)\s+', l_clean)
        if match:
            ex_name = match.group(1).strip()
            if len(ex_name) > 2 and not any(bad in ex_name for bad in ['Workout Max/PR', 'TeamBuildr', 'Page ', 'NISHAAN']):
                exercises.add(ex_name)

print(f"Discovered {len(exercises)} exercises from regex pattern:")
for e in sorted(exercises):
    print(" -", e)
