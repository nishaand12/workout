import pypdf
import re

reader = pypdf.PdfReader('reference/TeamBuildr - 2025 Workout.pdf')
p1 = reader.pages[0]
raw_lines = [l.strip() for l in p1.extract_text().split('\n') if l.strip()]

letters = []
idx = 0
while idx < len(raw_lines) and len(raw_lines[idx]) == 1 and raw_lines[idx] in 'ABCDEFGH':
    letters.append(raw_lines[idx])
    idx += 1

print("Letters extracted:", letters)
lines = raw_lines[idx:]

# Print remaining lines
for i, l in enumerate(lines):
    print(f"{i:2d}: {repr(l)}")
