import pypdf
import glob
import re
import json
import os

DAYS_REGEX = re.compile(r'^(MONDAY|TUESDAY|WEDNESDAY|THURSDAY|FRIDAY|SATURDAY|SUNDAY)\s*-\s*([A-Z]{3,4}\.?\s+\d{1,2},\s+\d{4})', re.IGNORECASE)

def extract_pdf_data(pdf_path):
    reader = pypdf.PdfReader(pdf_path)
    all_pages = []
    for page_idx, page in enumerate(reader.pages):
        text = page.extract_text()
        raw_lines = [l.strip() for l in text.split('\n') if l.strip()]
        
        # Extract letters at the top
        letters = []
        start_idx = 0
        while start_idx < len(raw_lines) and len(raw_lines[start_idx]) == 1 and raw_lines[start_idx] in 'ABCDEFGH':
            letters.append(raw_lines[start_idx])
            start_idx += 1
            
        all_pages.append({
            'page_no': page_idx + 1,
            'letters': letters,
            'lines': raw_lines[start_idx:]
        })
    return all_pages

print("extract_pdf_data ready")
