import pypdf
import glob
import re
import json

def parse_pdf(filepath):
    reader = pypdf.PdfReader(filepath)
    print(f"\n==============================")
    print(f"Parsing: {filepath} ({len(reader.pages)} pages)")
    print(f"==============================")
    
    pages_data = []
    for page_idx, page in enumerate(reader.pages):
        text = page.extract_text()
        pages_data.append(text)
    
    return pages_data

for f in sorted(glob.glob('reference/*.pdf')):
    parse_pdf(f)
