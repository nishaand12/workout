"""Read a TeamBuildr "Printable Workout" PDF into days of workout items. No AI: the layout is fixed.

TeamBuildr prints each day as a table: a superset letter and the exercise name on the left, the
athlete's Max/PR, then up to four set columns, with the coach's notes under each row. Text blocks
(warm-ups, breath work, mobility) have a title on the left and their text in the right-hand columns.

Plain text extraction loses which value belongs to which row, so this reads every piece of text
with its position, font and size, and rebuilds the table:

* Sizes are measured against the table header's bold size, because one export can be printed
  larger or smaller than another. Names are the header size; block text is ~0.95 of it; notes
  under a row are ~0.78; "(ea.)" and "Int: 5-6 RPE" are ~0.71.
* Columns come from the header labels ("Max/PR", "Result" for each set), which also shift from
  table to table. A header carries over to the next page when a day runs on.
* A lettered row is anchored at its letter. Set values (which TeamBuildr centres vertically, so they
  can sit a line above the name) go to the nearest anchor; note lines go to the row above them;
  block text goes to the nearest block title.

Anything that does not fit is kept as a note with a warning rather than dropped.
"""
from __future__ import annotations

import re
import unicodedata
from datetime import datetime
from typing import Dict, List, Optional

import pypdf

DAY_RE = re.compile(r"^(MONDAY|TUESDAY|WEDNESDAY|THURSDAY|FRIDAY|SATURDAY|SUNDAY)\s*-\s*([A-Z]{3,4})\.?\s+(\d{1,2}),\s*(\d{4})$")
MONTHS = {m: i for i, m in enumerate(["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"], start=1)}
MONTHS.update({"SEPT": 9, "JUNE": 6, "JULY": 7})
HEADER_LABELS = {"Workout", "Max/PR", "Result", "Reps"} | {f"Set {n}" for n in range(1, 11)}
LETTERS = "ABCDEFGHIJ"
LIST_ENTRY = re.compile(r"\s-\s*\d*\s*x\s*\d", re.I)  # "Cat Cow - x10", "Bicep Curl - 1x10"
CIRCUIT_META = re.compile(r"^-?\s*completion circuit$", re.I)
CIRCUIT_LINE = re.compile(r"[A-Za-z].*\s-\s*\d+\s*x\s*\d", re.I)  # "Bicep Curl - 1x10"
MAX_PDF_BYTES = 10 * 1024 * 1024


class TeamBuildrError(ValueError):
    """The file is not a TeamBuildr printable workout this reader understands."""


def _clean(text: str) -> str:
    text = unicodedata.normalize("NFKC", text or "")
    return text.replace("’", "'").replace("“", '"').replace("”", '"').replace("\xa0", " ").strip()


# Some exports (Chromium's Skia printer) embed Open Sans as unnamed Type3 fonts whose ff/fi/fl
# ligature glyphs have no text mapping, so "off" reads as "o\x00". The glyphs keep Open Sans's
# own numbering, which names them.
LIGATURE_GLYPHS = {"/gEC": "FB00", "/gED": "FB01", "/gEE": "FB02"}  # ff, fi, fl
BOLD_STEM = 140  # FontDescriptor StemV: Open Sans Bold prints 172, Regular 94


def _font_name(font) -> str:
    return str((font or {}).get("/BaseFont", "") or "").lstrip("/")


def _is_bold(font) -> bool:
    name = _font_name(font)
    if name:
        return "bold" in name.lower()
    try:
        return float(font["/FontDescriptor"]["/StemV"]) >= BOLD_STEM
    except Exception:
        return False


def _is_content_font(font) -> bool:
    """TeamBuildr prints in Open Sans; the browser's own page header and footer do not. An unnamed
    Type3 font is TeamBuildr's text printed by Chromium's Skia, which drops the font names."""
    name = _font_name(font)
    if name:
        return "opensans" in name.lower().replace("-", "")
    return str((font or {}).get("/Subtype", "")) == "/Type3"


def _map_ligatures(page) -> None:
    """Give unmapped Open Sans ligature glyphs their text by adding them to the font's ToUnicode map."""
    try:
        fonts = page["/Resources"]["/Font"]
    except Exception:
        return
    for ref in fonts.values():
        font = ref.get_object()
        if str(font.get("/Subtype", "")) != "/Type3" or _font_name(font) or "/ToUnicode" not in font:
            continue
        codes, code = {}, 0
        for entry in (font.get("/Encoding") or {}).get("/Differences", []):
            if isinstance(entry, int):
                code = entry
            else:
                if str(entry) in LIGATURE_GLYPHS:
                    codes[code] = LIGATURE_GLYPHS[str(entry)]
                code += 1
        if not codes:
            continue
        stream = font["/ToUnicode"].get_object()
        cmap = original = stream.get_data().decode("latin-1")
        extra = []
        for c, u in codes.items():
            # Skia writes these glyphs as mapping to nothing (<EC> <0000>); fill that in, or add it.
            empty = re.compile(rf"<{c:02X}>(\s*)<0+>", re.I)
            if empty.search(cmap):
                cmap = empty.sub(lambda m, u=u, c=c: f"<{c:02X}>{m.group(1)}<{u}>", cmap, count=1)
            elif not re.search(rf"<{c:02X}>\s*<[0-9A-Fa-f]+>", cmap, re.I):
                extra.append((c, u))
        if extra and "endcmap" in cmap:
            block = f"{len(extra)} beginbfchar\n" + "".join(f"<{c:02X}> <{u}>\n" for c, u in extra) + "endbfchar\n"
            cmap = cmap.replace("endcmap", block + "endcmap", 1)
        if cmap != original:
            stream.set_data(cmap.encode("latin-1"))


def _fragments(reader: pypdf.PdfReader) -> List[dict]:
    """Every piece of text with page, position (y grows downward across pages), font and size."""
    out = []
    for page_no, page in enumerate(reader.pages):
        height = float(page.mediabox.height)
        _map_ligatures(page)

        def visit(text, cm, tm, font, size, page_no=page_no, height=height):
            text = _clean(text)
            if not text:
                return
            x = tm[4] * cm[0] + tm[5] * cm[2] + cm[4]
            y = tm[4] * cm[1] + tm[5] * cm[3] + cm[5]
            scale = abs(tm[3] or 1) * abs(cm[3] or 1)
            out.append({
                "page": page_no,
                "x": x,
                "y": page_no * 10000 + (height - y),
                "size": float(size or 0) * scale,
                "bold": _is_bold(font),
                "opensans": _is_content_font(font),
                "font": _font_name(font),
                "text": text,
            })

        page.extract_text(visitor_text=visit)
    # Some exports split a word into pieces at the same spot ("12", ":", "49"); keep reading order.
    out.sort(key=lambda f: (f["y"], f["x"]))
    return out


def _merge_line(frags: List[dict]) -> List[dict]:
    """Join pieces of text that run on from each other on one line (same style, touching)."""
    merged: List[dict] = []
    for f in sorted(frags, key=lambda f: (round(f["y"], 0), f["x"])):
        last = merged[-1] if merged else None
        punct = re.fullmatch(r"[^\w\s]+", f["text"]) is not None
        gap = f["x"] - last["end"] if last else 0
        if (last and abs(last["y"] - f["y"]) < 1.2 and last["bold"] == f["bold"]
                and abs(last["size"] - f["size"]) < 0.3 and -last["size"] < gap < last["size"] * (1.0 if punct else 0.45)
                and not re.fullmatch(r"[A-Z]", last["text"])):
            sep = "" if punct or last["text"].endswith(("(", "/")) else " "
            last["text"] = (last["text"] + sep + f["text"]).strip()
            last["end"] = f["x"] + _width(f)
            continue
        g = dict(f)
        g["end"] = f["x"] + _width(f)
        merged.append(g)
    return merged


def _width(f: dict) -> float:
    return len(f["text"]) * f["size"] * 0.52


def _date_of(match) -> str:
    month = MONTHS.get(match.group(2).upper())
    if not month:
        raise TeamBuildrError(f"Unknown month in {match.group(0)}")
    return datetime(int(match.group(4)), month, int(match.group(3))).date().isoformat()


class _Table:
    """Column positions from one day's header row. Older exports have a Max/PR column between the
    names and the sets; newer ones go straight to up to five sets, with notes and block text
    starting at the first set's left edge (just left of its "Result" label)."""

    def __init__(self, labels: List[dict]):
        self.size = max((f["size"] for f in labels if f["text"] == "Workout"), default=11.0)
        maxpr = [f for f in labels if f["text"] == "Max/PR"]
        results = sorted(f["x"] for f in labels if f["text"] == "Result")
        reps = sorted(f["x"] for f in labels if f["text"] == "Reps")
        if not results:
            raise TeamBuildrError("A day's table has no set columns")
        self.results = results
        self.has_maxpr = bool(maxpr)
        if maxpr:
            self.left_edge = maxpr[0]["x"] - self.size * 1.1  # names and titles sit left of this
            self.sets_edge = results[0] - self.size * 1.1     # set values start here
        else:
            # Notes and block text start at the first set's left edge, around its "Result" label.
            # The Result cell is printed blank and values are centred under "Reps", so anything
            # starting before halfway between the two labels is a note.
            self.left_edge = results[0] - self.size * 1.1
            first_reps = next((x for x in reps if x > results[0]), results[0] + self.size * 4)
            self.sets_edge = (results[0] + first_reps) / 2

    def zone(self, f: dict) -> str:
        if f["x"] < self.left_edge:
            return "left"
        if f["x"] < self.sets_edge:
            return "mid"
        return "sets"

    def set_index(self, f: dict) -> int:
        index = 0
        for i, edge in enumerate(self.results):
            if f["x"] >= edge - self.size * 1.1:
                index = i
        return index


def _cell(text: str) -> dict:
    """One set's cell: '8 (ea.) Int: 5-6 RPE', '20-30 secs (ea.)', 'AMAP', 'ALAP (ea.)'."""
    raw = " ".join(text.split())
    out = {"per_side": "(ea" in raw.lower(), "reps": "", "time": "", "intensity": "", "intensity_kind": "", "raw": raw}
    rest = re.sub(r"\(\s*ea\.?\s*\)", " ", raw, flags=re.I)
    m = re.search(r"Int:\s*([\d.]+(?:\s*-\s*[\d.]+)?)\s*(%|RPE|RIR)?", rest, flags=re.I)
    if m:
        out["intensity"] = m.group(1).replace(" ", "")
        unit = (m.group(2) or "RPE").upper()
        out["intensity_kind"] = {"%": "pct1rm", "RPE": "rpe", "RIR": "rir"}[unit]
        rest = rest[:m.start()] + " " + rest[m.end():]
    m = re.search(r"([\d.]+(?:\s*-\s*[\d.]+)?)\s*(secs?|seconds?|s)\b", rest, flags=re.I)
    if m:
        out["time"] = m.group(1).replace(" ", "")
        rest = rest[:m.start()] + " " + rest[m.end():]
    else:
        m = re.search(r"([\d.]+)\s*(mins?|minutes?)\b", rest, flags=re.I)
        if m:
            out["time"] = str(int(round(float(m.group(1)) * 60)))
            rest = rest[:m.start()] + " " + rest[m.end():]
    if re.search(r"\bALAP\b", rest, flags=re.I):
        out["time"] = "ALAP"
        rest = re.sub(r"\bALAP\b", " ", rest, flags=re.I)
    rest = " ".join(rest.split())
    if rest:
        out["reps"] = rest.upper() if rest.upper() in ("AMAP", "AFAP") else rest
    return out


def _summary_sets(text: str) -> Optional[int]:
    m = re.match(r"^(\d+)\s*(?:x\b|sets?\b)", text.strip(), flags=re.I)
    return int(m.group(1)) if m else None


def _lift_from(row: dict, warnings: List[str], day: str) -> dict:
    cells = []
    for index in sorted(row["cells"]):
        parts = row["cells"].get(index)
        if parts:
            cells.append(_cell(" ".join(p["text"] for p in sorted(parts, key=lambda p: (p["y"], p["x"])))))
    if row.get("rounds"):
        return {
            "kind": "circuit",
            "letter": row["letter"],
            "name": row["name"],
            "rounds": row["rounds"],
            "detail": "\n".join(row["detail"]),
            "note": _join_lines(row["notes"], by_gap=False),
        }
    sets = len(cells) or row.get("summary_sets") or 1
    reps = [c["reps"] for c in cells]
    times = [c["time"] for c in cells]
    has_time = any(times)
    has_reps = any(reps)
    if not cells:
        reps = ["1"] * sets
    item = {
        "kind": "lift",
        "letter": row["letter"],
        "name": row["name"],
        "sets": sets,
        "reps": reps if has_reps or not has_time else ["1"] * sets,
        "track_reps": has_reps or not has_time,
        "times": times if has_time else [],
        "per_side": any(c["per_side"] for c in cells),
        "intensities": [c["intensity"] for c in cells] if any(c["intensity"] for c in cells) else [],
        "intensity_kind": next((c["intensity_kind"] for c in cells if c["intensity_kind"]), ""),
        "note": _join_lines(row["notes"], by_gap=False),
    }
    if row.get("detail"):
        item["note"] = "\n".join([item["note"]] + row["detail"]).strip()
    if not row["name"]:
        warnings.append(f"{day}: a row with no exercise name was kept as a note")
        return {"kind": "note", "letter": "", "name": "Note", "note": " ".join(c["raw"] for c in cells) + ("\n" + item["note"] if item["note"] else "")}
    return item


def parse_pdf(data: bytes) -> dict:
    """Parse a TeamBuildr printable workout. Returns {athlete, days: [{date, items}], warnings}."""
    if not data or not data.startswith(b"%PDF"):
        raise TeamBuildrError("That file is not a PDF.")
    if len(data) > MAX_PDF_BYTES:
        raise TeamBuildrError("That PDF is larger than 10 MB.")
    try:
        import io
        reader = pypdf.PdfReader(io.BytesIO(data))
        frags = _fragments(reader)
    except TeamBuildrError:
        raise
    except Exception as exc:  # pypdf raises many kinds of errors on damaged files
        raise TeamBuildrError("That PDF could not be read.") from exc
    return parse_fragments(frags)


def parse_fragments(frags: List[dict]) -> dict:
    # Only TeamBuildr's own text (Open Sans) is content; the browser's page header and footer are not.
    content = [f for f in frags if f["opensans"] and f["text"].lower() not in ("www.teambuildr.com", "teambuildr.com")]
    if not any(DAY_RE.match(f["text"]) for f in content if f["bold"]):
        raise TeamBuildrError("No TeamBuildr workout days were found in that PDF.")
    lines = _merge_line(content)

    athlete = ""
    warnings: List[str] = []
    days: Dict[str, dict] = {}
    order: List[str] = []
    table: Optional[_Table] = None
    current: Optional[str] = None
    stream: List[dict] = []  # (day, table, fragment) in reading order

    i = 0
    while i < len(lines):
        f = lines[i]
        m = DAY_RE.match(f["text"]) if f["bold"] else None
        if m:
            current = _date_of(m)
            if current not in days:
                days[current] = {"date": current, "rows": []}
                order.append(current)
            i += 1
            continue
        if f["bold"] and f["text"] in HEADER_LABELS:
            if f["text"] == "Workout":
                # A header row: its labels sit within about a line of each other.
                labels = [g for g in lines if g["bold"] and g["text"] in HEADER_LABELS and abs(g["y"] - f["y"]) < f["size"] * 1.6]
                try:
                    table = _Table(labels)
                except TeamBuildrError:
                    pass
            i += 1
            continue
        if f["bold"] and table is None and current is None and not athlete and f["size"] > 14:
            athlete = f["text"].title()
            i += 1
            continue
        if f["bold"] and table and f["size"] > table.size * 1.5:
            athlete = athlete or f["text"].title()
            i += 1
            continue
        if current and table:
            stream.append({"day": current, "table": table, "f": f})
        i += 1

    if not order:
        raise TeamBuildrError("No TeamBuildr workout days were found in that PDF.")

    for day in order:
        _build_day(days[day], [s for s in stream if s["day"] == day], warnings)

    out_days = []
    for day in order:
        items = days[day]["items"]
        if items:
            out_days.append({"date": day, "items": items})
    if not out_days:
        raise TeamBuildrError("The PDF's days have no exercises in them.")
    return {"athlete": athlete, "days": out_days, "warnings": warnings}


def _build_day(day: dict, stream: List[dict], warnings: List[str]) -> None:
    label = day["date"]
    anchors: List[dict] = []   # lettered rows
    titles: List[dict] = []    # text block titles
    pending: List[dict] = []
    # Pass 1: anchors (a single bold letter in the left gutter) and their names.
    for s in stream:
        f, t = s["f"], s["table"]
        if f["bold"] and t.zone(f) == "left" and re.fullmatch(r"[A-Z]", f["text"]):
            anchors.append({"y": f["y"], "letter": f["text"], "name_parts": [], "last_y": f["y"], "table": t,
                            "cells": {}, "notes": [], "detail": [], "rounds": 0, "summary_sets": None})
    anchors.sort(key=lambda a: a["y"])

    def nearest_anchor(y: float, size: float) -> Optional[dict]:
        best = min(anchors, key=lambda a: abs(a["y"] - y), default=None)
        if best is not None and abs(best["y"] - y) <= size * 2.2:
            return best
        return None

    def anchor_above(y: float) -> Optional[dict]:
        above = [a for a in anchors if a["y"] <= y + 0.5]
        return above[-1] if above else None

    for s in stream:
        f, t = s["f"], s["table"]
        if f["bold"] and t.zone(f) == "left" and re.fullmatch(r"[A-Z]", f["text"]):
            continue
        if f["bold"] and t.zone(f) == "left":
            a = nearest_anchor(f["y"], t.size)
            if a and abs(a["y"] - f["y"]) < 1.5 and not a["name_parts"]:
                a["name_parts"].append(f["text"])
                continue
            pending.append(s)  # a wrapped name or a block title, decided below
            continue
        pending.append(s)

    # Body text of blocks (block-sized, not in the set columns of a lettered row) and same-line titles.
    def is_block_text(s) -> bool:
        f, t = s["f"], s["table"]
        # Block text is a touch smaller than set values and names (~0.95 of the header size).
        return (not f["bold"] and t.zone(f) != "left" and 0.91 <= f["size"] / t.size <= 0.985
                and not (t.zone(f) == "sets" and (CIRCUIT_LINE.search(f["text"]) or CIRCUIT_META.search(f["text"]))
                         and nearest_anchor(f["y"], t.size)))

    body = [s for s in pending if is_block_text(s)]

    # Pass 2: bold left-gutter lines are either a wrapped exercise name or a block title.
    for s in pending:
        f, t = s["f"], s["table"]
        if not (f["bold"] and t.zone(f) == "left"):
            continue
        a = anchor_above(f["y"])
        same_line_body = any(abs(b["f"]["y"] - f["y"]) < t.size * 0.5 for b in body)
        if a and a["name_parts"] and 0 < f["y"] - a["last_y"] <= t.size * 1.5 and not same_line_body:
            a["name_parts"].append(f["text"])
            a["last_y"] = f["y"]
            continue
        prev = titles[-1] if titles else None
        # A title carries on to the next line when it is close below, or when it ended on a dash
        # (that can be across a page break: "General Dynamic Mobility -" / "Nish").
        runs_on = prev and prev["name_parts"] and prev["name_parts"][-1].rstrip().endswith("-") and f["y"] > prev["last_y"]
        if prev and (runs_on or (0 < f["y"] - prev["last_y"] <= t.size * 1.5 and not same_line_body and not prev["body_on_line"])):
            prev["name_parts"].append(f["text"])
            prev["last_y"] = f["y"]
            continue
        titles.append({"y": f["y"], "last_y": f["y"], "name_parts": [f["text"]], "body": [], "body_on_line": same_line_body})

    # Pass 3: everything else.
    for s in pending:
        f, t = s["f"], s["table"]
        if f["bold"] and t.zone(f) == "left":
            continue
        rel = f["size"] / t.size
        zone = t.zone(f)
        text = f["text"]
        if is_block_text(s):
            if titles:
                def gap(tt, y=f["y"]):
                    return 0 if tt["y"] <= y <= tt["last_y"] else min(abs(tt["y"] - y), abs(tt["last_y"] - y))
                title = min(titles, key=gap)
                title["body"].append(f)
            else:
                warnings.append(f"{label}: text with no heading was kept as a note: {text[:60]}")
                titles.append({"y": f["y"], "last_y": f["y"], "name_parts": ["Note"], "body": [f], "body_on_line": True})
            continue
        if zone == "left" and not f["bold"]:
            a = nearest_anchor(f["y"], t.size) or anchor_above(f["y"])
            n = _summary_sets(text)
            if a and n:
                a["summary_sets"] = n
            elif a:
                a["notes"].append(f)
            continue
        if zone == "mid" and rel > 0.82 and not (t.has_maxpr and re.fullmatch(r"(N/A|\d+(\.\d+)?\s*R?)", text)):
            # Mid-size text in the Max/PR column that is not a max: treat it as a note.
            a = anchor_above(f["y"])
            if a:
                a["notes"].append(f)
                continue
        if zone == "mid":
            if t.has_maxpr and re.fullmatch(r"(N/A|[\d.]+\s*R?|R)", text):
                continue  # the athlete's own max, not part of the prescription
            a = anchor_above(f["y"]) or nearest_anchor(f["y"], t.size)
            if a:
                a["notes"].append(f)
            else:
                warnings.append(f"{label}: a note with no exercise above it was dropped into the day's first item: {text[:60]}")
                if anchors:
                    anchors[0]["notes"].append(f)
            continue
        # The set columns.
        a = nearest_anchor(f["y"], t.size)
        if a is None:
            if rel < 0.85:
                a = anchor_above(f["y"])
                if a:
                    a["notes"].append(f)
                    continue
            warnings.append(f"{label}: '{text[:40]}' did not line up with an exercise and was kept as a note")
            titles.append({"y": f["y"], "last_y": f["y"], "name_parts": ["Note"], "body": [f], "body_on_line": True})
            continue
        if f["bold"]:
            m = re.match(r"^(\d+)\s*rounds?", text, flags=re.I)
            if m:
                a["rounds"] = int(m.group(1))
                continue
            a["notes"].append(f)
            continue
        if CIRCUIT_META.search(text):
            continue  # the tail of "3 rounds - Completion Circuit"
        if 0.88 <= rel <= 0.985 and CIRCUIT_LINE.search(text):
            a["detail"].append(text)  # a circuit line: "Bicep Curl - 1x10"
            continue
        a["cells"].setdefault(t.set_index(f), []).append(f)

    # Assemble rows and blocks in page order, and number superset letters across restarts.
    rows = []
    for a in anchors:
        a["name"] = _join_name(a["name_parts"])
        rows.append(("row", a["y"], a))
    for tt in titles:
        rows.append(("block", tt["y"], tt))
    rows.sort(key=lambda r: r[1])

    items = []
    first_row = next((k for k, r in enumerate(rows) if r[0] == "row"), None)
    shift = 0
    top = -1
    last = -1
    for k, (kind, _, r) in enumerate(rows):
        if kind == "row":
            index = LETTERS.find(r["letter"]) if r["letter"] in LETTERS else 0
            if index + shift < last and index == 0:
                shift = top + 1  # a second set of exercises starts again at A
            letter_index = min(index + shift, len(LETTERS) - 1)
            top = max(top, letter_index)
            last = letter_index
            r["letter"] = LETTERS[letter_index]
            items.append(_lift_from(r, warnings, label))
            continue
        name = _join_name(r["name_parts"])
        text = _join_lines(r["body"], by_gap=True)
        if not text or name.lower() in ("notes", "note"):
            note = (name + "\n" + text).strip() if name.lower() not in ("notes", "note") else text
            items.append({"kind": "note", "letter": "", "name": "Note", "note": note})
            continue
        before = first_row is None or k < first_row
        items.append({"kind": "text", "letter": "", "name": name, "note": text, "category": "Warm up" if before else "Cooldown"})
    # A heading with no text of its own ("Foot/Ankle Strength") and the "Notes" under it read as one note.
    merged = []
    for it in items:
        if merged and it["kind"] == "note" and merged[-1]["kind"] == "note":
            merged[-1]["note"] = (merged[-1]["note"] + "\n" + it["note"]).strip()
            continue
        merged.append(it)
    day["items"] = merged


def _join_lines(frags: List[dict], by_gap: bool) -> str:
    """Put wrapped lines back into sentences. Block text marks a new paragraph with a bigger gap;
    notes under a row are spaced evenly, so there a long line is taken to have wrapped."""
    out = ""
    prev = None
    for f in sorted(frags, key=lambda f: (f["y"], f["x"])):
        if prev is None:
            out = f["text"]
        else:
            same_line = abs(f["y"] - prev["y"]) < 1.2
            wrapped = (f["y"] - prev["y"] <= prev["size"] * 1.6) if by_gap else len(prev["text"]) >= 60
            if LIST_ENTRY.search(prev["text"]) or LIST_ENTRY.search(f["text"]):
                wrapped = False  # "Cat Cow - x10" lines are a list, one per line
            out += " " + f["text"] if same_line or wrapped else "\n" + f["text"]
        prev = f
    return out.strip()


def _join_name(parts: List[str]) -> str:
    """Join a name that wrapped onto more lines. A line that ends in a hyphen joins without a space."""
    out = ""
    for part in parts:
        part = " ".join(part.split())
        # "T-" + "Spine" -> "T-Spine"; "Mobility -" + "Nish" keeps its space.
        glued = (out.endswith("-") and not out.endswith(" -")) or out.endswith("/")
        out = out + part if (not out or glued) else out + " " + part
    return out.strip()


# ---------------------------------------------------------------------------
# Matching imported names to the coach's library
# ---------------------------------------------------------------------------
ABBREVIATIONS = {
    "w": "with", "sa": "single arm", "sl": "single leg", "bb": "barbell", "db": "dumbbell",
    "kb": "kettlebell", "rfe": "rear foot elevated", "ffe": "front foot elevated", "bw": "bodyweight",
    "alt": "alternating", "ext": "extension", "ea": "each",
}
SUGGEST_MIN = 0.6
MAX_SUGGESTIONS = 3


def normalize_name(name: str) -> str:
    text = unicodedata.normalize("NFKC", name or "").lower()
    text = text.replace("1/2", " half ").replace("&", " and ").replace("'", "")
    words = re.findall(r"[a-z0-9]+", text)
    out = []
    for word in words:
        out.extend(ABBREVIATIONS.get(word, word).split())
    return " ".join(out)


def _score(a: str, b: str) -> float:
    from difflib import SequenceMatcher
    if not a or not b:
        return 0.0
    ratio = SequenceMatcher(None, a, b).ratio()
    ta, tb = set(a.split()), set(b.split())
    overlap = len(ta & tb) / len(ta | tb) if ta | tb else 0.0
    return round(max(ratio, overlap), 3)


def match_names(names: List[str], library: List[dict]) -> Dict[str, dict]:
    """For each imported name: an exact library match, up to three suggestions, or nothing.

    library rows are {id, name, category}. Exact means equal once case, punctuation and the usual
    abbreviations (SA, SL, BB, DB, w.) are set aside.
    """
    prepared = [(row, normalize_name(row["name"])) for row in library if row.get("name")]
    by_norm: Dict[str, dict] = {}
    for row, norm in prepared:
        by_norm.setdefault(norm, row)
    out: Dict[str, dict] = {}
    for name in names:
        if name in out:
            continue
        norm = normalize_name(name)
        exact = by_norm.get(norm)
        if exact:
            out[name] = {"status": "exact", "match": {"id": exact["id"], "name": exact["name"], "category": exact.get("category") or ""}, "suggestions": []}
            continue
        scored = sorted(
            ((_score(norm, row_norm), row) for row, row_norm in prepared),
            key=lambda pair: (-pair[0], pair[1]["name"]),
        )
        suggestions = [
            {"id": row["id"], "name": row["name"], "category": row.get("category") or "", "score": score}
            for score, row in scored[:MAX_SUGGESTIONS] if score >= SUGGEST_MIN
        ]
        out[name] = {"status": "suggest" if suggestions else "new", "match": None, "suggestions": suggestions}
    return out


def imported_names(parsed: dict) -> List[str]:
    """Names that need a library exercise: lifts, circuits, and text blocks (not notes)."""
    seen = []
    for day in parsed.get("days", []):
        for it in day.get("items", []):
            if it.get("kind") in ("lift", "circuit", "text") and it.get("name") and it["name"] not in seen:
                seen.append(it["name"])
    return seen
