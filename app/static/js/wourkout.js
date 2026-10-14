/* wourkout prototype — calendar builder and coach tools from the screen recordings. */
const LETTERS = "ABCDEFGHIJ".split("");
const LETTER_COLOR = {
  A: "#3ddc84", B: "#3b82f6", C: "#a855f7", D: "#eab308", E: "#f59e0b",
  F: "#ef4444", G: "#14b8a6", H: "#ec4899", I: "#84cc16", J: "#6366f1"
};
const PROP_LABEL = {
  load: "Load (kg)", rest: "Rest (s)", tempo: "Tempo", velocity: "Velocity",
  power: "Peak Power", pct: "%1RM"
};
const ATHLETES = [
  { id: "eric", name: "Eric Van Zeumeren", email: "ericvanzeumeren@gmail.com" },
  { id: "leah", name: "Leah Van Zeumeren", email: "leah@example.com" },
  { id: "greg", name: "Greg Riedstra", email: "greg@example.com" },
  { id: "michelle", name: "Michelle Louwagie", email: "michelle@example.com" },
  { id: "fanenter", name: "Fanenter Akende", email: "fanenter@example.com" },
  { id: "ella", name: "Ella Ambrose", email: "ella@example.com" },
  { id: "ethan", name: "Ethan Anjema", email: "ethan@example.com" },
  { id: "grayson", name: "Grayson Axford", email: "grayson@example.com" },
  { id: "rory", name: "Coach Rory", email: "rory@rpgtrainingsystems.com" }
];
const COACHES = [
  ["Connor", "Arsenault", "connor.arsenault7@gmail.com", "10/13/26 · 09:15"],
  ["Jennifer", "Brace", "admin@rpgtrainingsystems.com", "12/17/24 · 12:48"],
  ["Adriana", "Frendo", "afrendo@uwo.ca", "N/A"],
  ["Lucy", "Hancock", "lucyhancock2002@gmail.com", "N/A"],
  ["Coach", "Rory", "rory@rpgtrainingsystems.com", "10/13/26 · 05:13"],
  ["Liv", "Sands", "livjsands@gmail.com", "05/08/26 · 11:43"],
  ["Kiean", "Silva", "kiean.silva@hotmail.com", "07/15/26 · 16:05"],
  ["Eric", "Van Zeumeren", "ericvanzeumeren@gmail.com", "10/13/26 · 09:59"]
];
const GROUPS = ["Eric's Athletes", "FCVB - 16U Icarus", "FCVB - 17U Helios", "FCVB - B Hyperion", "FCVB 17U Boys", "Football Combine Prep Program (2026)"];
const CATALOG = [
  { name: "Session Break", type: "break" },
  { name: "Rest Time", type: "rest" },
  { name: "Video", type: "video" },
  { name: "10 yard sprint", type: "lift" },
  { name: "3 Step Approach Jump", type: "lift" },
  { name: "1 Arm Farmers Carry", type: "lift" },
  { name: "Back Pain", type: "lift" },
  { name: "Back Squat", type: "lift" },
  { name: "Back Squat (Safety Bar)", type: "lift" },
  { name: "Backpedal to Sprint", type: "lift" },
  { name: "Backpedal, 180 to Sprint", type: "lift" },
  { name: "45 Degree Back Extension", type: "lift" },
  { name: "General Health and Wellness", type: "questionnaire" },
  { name: "General Dynamic Mobility", type: "circuit" },
  { name: "General Dynamic Mobility - Leah", type: "circuit" },
  { name: "Sprint Development - Base", type: "circuit" },
  { name: "Warm Up - Eric", type: "circuit" },
  { name: "Rudiment Plyos - A (100)", type: "circuit" },
  { name: "Drop In Acceleration", type: "lift" },
  { name: "Hop (Medium Tier)", type: "lift" },
  { name: "Block Power Clean", type: "lift" },
  { name: "Front Squat", type: "lift" },
  { name: "Clean Pull", type: "lift" },
  { name: "Single Leg Calf Raise", type: "lift" },
  { name: "Band Overhead Tricep Extension", type: "lift" },
  { name: "Jump Circuit - Conditioning 1", type: "circuit" },
  { name: "Cable Wood Chop (high-low)", type: "lift" },
  { name: "Bench Press", type: "lift" },
  { name: "Side Plank w. Leg Raise", type: "lift" },
  { name: "DB Incline Bench Press", type: "lift" },
  { name: "Ring Row", type: "lift" },
  { name: "Tricep Roll Backs", type: "lift" },
  { name: "DB Bicep Curl", type: "lift" },
  { name: "Volleyball Games", type: "lift" },
  { name: "Power Clean", type: "lift" },
  { name: "Clean Grip High Pull", type: "lift" },
  { name: "RFE Split Squat", type: "lift" },
  { name: "Complex - Bartender (Oly 2)", type: "circuit" },
  { name: "Pull Up", type: "lift" },
  { name: "Knee Extension Isometric", type: "lift" }
];

let seq = 1;
const uid = () => "i" + (seq++);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function item(partial) {
  const sets = partial.sets || 1;
  const reps = partial.reps || Array(sets).fill(partial.rep || 1);
  const base = {
    id: uid(), type: "lift", letter: "A", sets, reps,
    loads: Array(sets).fill(""), rests: Array(sets).fill(""),
    tempos: Array(sets).fill(""), velocities: Array(sets).fill(""),
    powers: Array(sets).fill(""), pcts: Array(sets).fill(""),
    props: [], note: "", detail: "", questions: [], requireResponse: false,
    completionOnly: false, trackReps: true, trackVolume: false, videoUrl: ""
  };
  return Object.assign(base, partial, { reps: reps.slice() });
}

function lift(name, letter, sets, rep, note, loads) {
  const it = item({ name, letter, sets, reps: Array(sets).fill(rep), note: note || "" });
  if (loads) it.loads = loads.slice();
  return it;
}

const QUESTIONS = [
  "How did you sleep last night?",
  "How is your body feeling today?",
  "How excited are you to train today?",
  "Anything specific we should know?"
];
const SPRINT_DETAIL = "Complete 1 round - Light Skip - 20 meters\nSide Shuffle - 20 meters\nLight Skip - 20 meters\nKaraokes - 20 meters\nBackwards Run - 20 meters\nAcceleration - 20-30 meters";
const MOBILITY_DETAIL = "5 reps - Inchworm\n10 reps - Alt. Calf raises\nKnee Extension Isometric - 4x35s Dynamic Mobility (lower)";

function fromCatalog(entry) {
  if (entry.type === "questionnaire") {
    return item({ name: entry.name, type: "questionnaire", letter: "A", sets: 1, reps: [1], questions: QUESTIONS.slice(), requireResponse: true, trackReps: false });
  }
  if (entry.type === "circuit") {
    const detail = entry.name.includes("Sprint") ? SPRINT_DETAIL : entry.name.includes("Mobility") || entry.name.includes("Warm") ? MOBILITY_DETAIL : "Complete 1 round - 20 seconds on, 20 seconds off";
    return item({ name: entry.name, type: "circuit", letter: "A", sets: 1, reps: [1], detail, completionOnly: true, trackReps: false });
  }
  if (entry.type === "break") return item({ name: "Session Break", type: "break", letter: "", sets: 0, reps: [], trackReps: false });
  if (entry.type === "rest") return item({ name: "Rest Time", type: "rest", letter: "", sets: 1, reps: [60], note: "60s", trackReps: false });
  if (entry.type === "video") return item({ name: "Video", type: "video", letter: "", sets: 0, reps: [], trackReps: false });
  return item({ name: entry.name, type: "lift", letter: "A", sets: 1, reps: [1] });
}

function blankDay(date, extra = {}) {
  return {
    date,
    title: extra.title || "",
    weekLabel: extra.weekLabel || weekName(date),
    recurring: extra.recurring || 0,
    color: extra.color || "#3b82f6",
    items: extra.items || []
  };
}

function weekName(date) {
  const start = sundayOf(date);
  const map = { "2026-09-27": "Week 3", "2026-10-04": "Week 4", "2026-10-11": "Week 5", "2026-10-18": "Week 6", "2026-10-25": "Week 7" };
  return map[start] || "";
}

function sundayOf(date) {
  const d = new Date(date + "T12:00:00");
  d.setDate(d.getDate() - d.getDay());
  return iso(d);
}
function iso(d) {
  const z = (n) => String(n).padStart(2, "0");
  return d.getFullYear() + "-" + z(d.getMonth() + 1) + "-" + z(d.getDate());
}
function addDays(date, n) {
  const d = new Date(date + "T12:00:00");
  d.setDate(d.getDate() + n);
  return iso(d);
}
function fmtDay(date) {
  const d = new Date(date + "T12:00:00");
  const days = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  const mon = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  return days[d.getDay()] + ", " + mon[d.getMonth()] + " " + d.getDate();
}
function fmtLong(date) {
  const d = new Date(date + "T12:00:00");
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}
function fmtShort(date) {
  const d = new Date(date + "T12:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

function ericCalendar() {
  const cal = {};
  const put = (date, title, recurring, items) => {
    cal[date] = blankDay(date, { title, recurring, items });
  };
  put("2026-09-28", "Week 3 Lower", 1, [
    lift("Back Squat", "A", 5, 5, "Super slow squats"),
    lift("Pull Up", "A", 4, 6),
    lift("GHR Sit Up", "B", 3, 8),
    lift("BB Overhead Press", "C", 4, 6),
    lift("Med Ball Granny Toss", "C", 3, 5)
  ]);
  put("2026-09-29", "Week 3", 1, [
    item({ name: "Warm Up - Eric", type: "circuit", letter: "A", detail: "Knee Extension Isometric - 4x35s", sets: 1, reps: [1], completionOnly: true, trackReps: false }),
    item({ name: "Rudiment Plyos - A (100)", type: "circuit", letter: "A", detail: "Complete 1 round - Leap (Light Tier)", sets: 1, reps: [1], completionOnly: true, trackReps: false }),
    lift("Drop In Acceleration", "B", 3, 10, "20 meters"),
    lift("Block Power Clean", "C", 5, 3, "", ["60", "70", "80", "85", "90"]),
    lift("Front Squat", "D", 3, 8, "", ["100", "110", "120"]),
    lift("Deadlift", "E", 3, 5),
    lift("Single Leg Calf Raise", "F", 3, 12)
  ]);
  put("2026-09-30", "", 1, [
    lift("Back Squat", "A", 5, 3, "Super slow"),
    lift("Seated Cable Row", "B", 4, 8),
    lift("Bench Press", "C", 4, 6),
    lift("Side Bend", "C", 3, 10),
    lift("Ring Row", "D", 3, 8)
  ]);
  put("2026-10-01", "", 1, [
    item({ name: "Sprint Development - Base", type: "circuit", letter: "A", detail: SPRINT_DETAIL, sets: 1, reps: [1], completionOnly: true, trackReps: false }),
    lift("Hip Stability (Quad-Iso)", "B", 3, 8),
    lift("Pause French Press", "C", 3, 8)
  ]);
  put("2026-10-02", "", 1, [
    item({ name: "Sprint Development - Base", type: "circuit", letter: "A", detail: SPRINT_DETAIL, sets: 1, reps: [1], completionOnly: true, trackReps: false }),
    lift("Approach Jump Warm Up", "B", 3, 5),
    lift("Dunking/Basketball", "C", 4, 4)
  ]);
  put("2026-10-05", "Week 4", 1, [
    lift("Back Squat", "A", 5, 5, "Super slow squats"),
    item({ name: "Rudiment Plyos - A (100)", type: "circuit", letter: "B", detail: "Complete 1 round", sets: 1, reps: [1], completionOnly: true, trackReps: false }),
    lift("Drop In Acceleration", "C", 3, 10, "20 meters"),
    lift("Block Power Clean", "D", 3, 3, "", ["60", "70", "80"]),
    lift("Front Squat", "E", 3, 8, "", ["180", "200", "220"]),
    lift("Clean Pull", "F", 4, 3, "working up to 140kg", ["100", "120", "130", "140"]),
    lift("Single Leg Calf Raise", "F", 3, 8, "", ["40", "40", "40"])
  ]);
  put("2026-10-06", "Week 4", 1, [
    lift("Back Squat", "A", 4, 5),
    item({ name: "Sprint Development - Base", type: "circuit", letter: "B", detail: SPRINT_DETAIL, sets: 1, reps: [1], completionOnly: true, trackReps: false }),
    lift("Bench Press", "C", 4, 6),
    lift("DB Incline Bench Press", "D", 3, 8)
  ]);
  put("2026-10-07", "Week 4", 1, [
    lift("Power Clean", "C", 5, 2),
    lift("Clean Grip High Pull", "D", 4, 3),
    lift("Back Squat", "E", 4, 4),
    lift("RFE Split Squat", "E", 3, 6),
    lift("Single Leg Calf Raise", "F", 3, 8, "safety bar")
  ]);
  put("2026-10-12", "Week 5", 1, [
    item({ name: "Warm Up - Eric", type: "circuit", letter: "A", detail: "Knee Extension Isometric - 4x35s Dynamic", sets: 1, reps: [1], completionOnly: true, trackReps: false }),
    item({ name: "Rudiment Plyos - A (100)", type: "circuit", letter: "A", detail: "Complete 1 round - Leap (Light Tier)", sets: 1, reps: [1], completionOnly: true, trackReps: false }),
    lift("Drop In Acceleration", "B", 3, 10, "20 meters"),
    lift("Hop (Medium Tier)", "C", 3, 10, "Walk into the first reps"),
    lift("Block Power Clean", "C", 6, 2, "Warm Up sets", ["60", "70", "80", "85", "90", "95"]),
    lift("Front Squat", "E", 5, 4, "Controlled down, fast up"),
    lift("Clean Pull", "F", 5, 4, "working up to 140kg"),
    lift("Single Leg Calf Raise", "F", 3, 12)
  ]);
  put("2026-10-13", "Week 5", 1, [
    item({ name: "Warm Up - Eric", type: "circuit", letter: "A", detail: "Knee Extension Isometric - 4x35s", sets: 1, reps: [1], completionOnly: true, trackReps: false }),
    lift("Band Overhead Tricep Extension", "A", 3, 15),
    item({ name: "Jump Circuit - Conditioning 1", type: "circuit", letter: "A", detail: "Complete 1 round - 20 seconds on, 20 seconds off", sets: 1, reps: [1], completionOnly: true, trackReps: false }),
    lift("Pull Up", "B", 3, 8),
    lift("Cable Wood Chop (high-low)", "B", 3, 8),
    lift("Bench Press", "C", 4, 6, "Work up to a heavy final set"),
    lift("Side Plank w. Leg Raise", "C", 3, 10),
    lift("DB Incline Bench Press", "D", 3, 8, "AMAP"),
    lift("Ring Row", "D", 3, 10, "AMAP"),
    lift("Tricep Roll Backs", "E", 3, 8),
    lift("DB Bicep Curl", "E", 3, 8)
  ]);
  put("2026-10-14", "Volleyball", 1, [lift("Volleyball Games", "A", 1, 1)]);
  put("2026-10-15", "Upper Body/General Conditioning", 1, [
    item({ name: "General Health and Wellness", type: "questionnaire", letter: "A", sets: 1, reps: [1], questions: QUESTIONS.slice(), requireResponse: true, trackReps: false }),
    item({ name: "General Dynamic Mobility", type: "circuit", letter: "B", detail: MOBILITY_DETAIL, sets: 1, reps: [1], completionOnly: true, trackReps: false }),
    item({ name: "Sprint Development - Base", type: "circuit", letter: "C", detail: SPRINT_DETAIL, sets: 1, reps: [1], completionOnly: true, trackReps: false })
  ]);
  put("2026-10-16", "Max Approach Jumps/Potential LB Strength", 1, []);
  put("2026-10-17", "Potential LB Strength", 0, []);
  put("2026-10-18", "LB Strength", 0, []);
  put("2026-10-19", "LB Strength", 0, []);
  put("2026-10-20", "Rest", 0, []);
  put("2026-10-21", "Volleyball", 0, []);
  return cal;
}

function leahCalendar() {
  const cal = {};
  cal["2026-10-13"] = blankDay("2026-10-13", {
    title: "Upper accessory",
    recurring: 1,
    items: [lift("DB Bicep Curl", "A", 3, 10), lift("Push Up", "B", 3, 12), lift("Sit Up and Reach", "C", 3, 10)]
  });
  cal["2026-10-01"] = blankDay("2026-10-01", { title: "Push", items: [lift("Push Up", "A", 4, 10)] });
  return cal;
}

const state = {
  view: "build",
  athleteId: "eric",
  weekStart: "2026-10-04",
  viewMode: "month",
  calendars: { eric: ericCalendar(), leah: leahCalendar() },
  focusDay: "2026-10-15",
  hoverDay: "2026-10-15",
  searchDay: null,
  searchQ: "",
  editor: null,
  propMenu: false,
  letterMenu: false,
  optionsMenu: false,
  dayMenu: null,
  recurMenu: null,
  colorMenu: null,
  sidebar: false,
  preview: null,
  previewTab: "exercise",
  modal: null,
  clipboard: null,
  undo: [],
  history: [],
  toast: "",
  navMenu: null,
  entryAthlete: null,
  entryDate: "2026-10-13",
  entryOpen: false,
  logs: {},
  feedMode: "athletes",
  feedTime: "all",
  feedWho: "all",
  feedQ: "",
  comments: {},
  posts: [],
  journal: [],
  userTab: "coaches",
  userQ: "",
  userSort: "last",
  coaches: COACHES.map((c, i) => ({ id: "c" + i, first: c[0], last: c[1], email: c[2], activity: c[3], groups: "All", cals: "All" })),
  athletes: ATHLETES.map((a) => ({ id: a.id, first: a.name.split(" ")[0], last: a.name.split(" ").slice(1).join(" "), email: a.email, activity: "10/13/26 · 09:00", groups: "Eric's Athletes", cals: "All" })),
  groups: GROUPS.slice(),
  joinCodes: [{ code: "FALCONS26", group: "Eric's Athletes" }, { code: "HELIOS17", group: "FCVB - 17U Helios" }],
  lifts: CATALOG.filter((c) => c.type !== "break").map((c, i) => ({ id: "l" + i, name: c.name, type: c.type === "lift" ? "Lifts" : c.type === "circuit" ? "Circuits" : c.type === "questionnaire" ? "Questionnaires" : "Lifts", tags: "N/A" })),
  liftQ: "",
  managing: "Lifts",
  goals: ["Back Squat 200kg", "Clean 140kg"],
  docs: [{ name: "Week 5 warm-up video", url: "https://example.com/warmup" }],
  packets: ["Combine testing sheet"],
  attendance: {},
  invoices: [],
  evals: [],
  prs: {
    eric: [["Back Squat", "180"], ["Power Clean", "100"], ["Front Squat", "150"], ["Bench Press", "110"]]
  },
  teamMode: "feed",
  teamGroup: "",
  teamFilter: false,
  compose: false,
  startedAt: null,
  requestNote: "",
  role: "coach",
  actingAthlete: null,
  serverUsers: {},
  athleteAssignments: [],
  openWorkout: null,
  openSession: null
};

function cal() {
  if (!state.calendars[state.athleteId]) state.calendars[state.athleteId] = {};
  return state.calendars[state.athleteId];
}
function ensureDay(date, athleteId = state.athleteId) {
  const c = state.calendars[athleteId] || (state.calendars[athleteId] = {});
  if (!c[date]) c[date] = blankDay(date);
  return c[date];
}
function findItem(day, id) {
  return ensureDay(day).items.find((it) => it.id === id);
}
function snapshot() {
  state.undo.push(JSON.stringify(state.calendars));
  if (state.undo.length > 30) state.undo.shift();
}
function noteHist(text) {
  state.history.unshift({ t: new Date().toLocaleTimeString(), text });
  state.history = state.history.slice(0, 12);
}
function toast(msg) {
  state.toast = msg;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { state.toast = ""; render(); }, 2200);
}
function selectedItems(date) {
  return ensureDay(date).items.filter((it) => it.selected);
}

function scriptLine(it) {
  if (it.type === "questionnaire") return it.questions.length + " items";
  if (it.type === "break") return "Divider";
  if (it.type === "video") return it.videoUrl || "Video";
  if (it.type === "rest") return (it.reps[0] || 60) + "s";
  if (it.type === "circuit") return (it.detail || "Complete 1 round").split("\n")[0];
  const rep = it.reps[0] || 1;
  const same = it.reps.every((r) => String(r) === String(rep));
  const vol = same ? it.sets + " x " + rep : it.reps.join(", ");
  return it.note ? vol + " · " + it.note : vol;
}
function stats(day) {
  let s = 0, r = 0, v = 0;
  day.items.forEach((it) => {
    if (it.type === "break" || it.type === "video" || it.type === "questionnaire") return;
    s += it.sets || 0;
    (it.reps || []).forEach((rep, i) => {
      r += +rep || 0;
      v += (+rep || 0) * (+(it.loads[i]) || 0);
    });
  });
  return { s, r, v };
}
function letterCode(day, it) {
  const same = day.items.filter((x) => x.letter === it.letter);
  const n = same.findIndex((x) => x.id === it.id) + 1;
  return (it.letter || "•") + (same.length > 1 ? n : "1");
}
function reletter(day) {
  const letters = day.items.map((it) => it.letter).filter(Boolean);
  const unique = new Set(letters);
  if (unique.size !== letters.length) return;
  day.items.forEach((it, i) => { if (it.type !== "break" && it.type !== "rest" && it.type !== "video") it.letter = LETTERS[Math.min(i, 9)]; });
}
function resizeSets(it, n) {
  n = Math.max(1, Math.min(10, n));
  const grow = (arr, fill) => {
    const next = arr.slice(0, n);
    while (next.length < n) next.push(arr[0] != null && arr[0] !== "" ? arr[arr.length - 1] : fill);
    return next;
  };
  it.sets = n;
  it.reps = grow(it.reps, it.reps[0] || 1);
  ["loads", "rests", "tempos", "velocities", "powers", "pcts"].forEach((k) => { it[k] = grow(it[k] || [], ""); });
}

function closeFloats() {
  state.searchDay = null;
  state.editor = null;
  state.propMenu = false;
  state.letterMenu = false;
  state.optionsMenu = false;
  state.dayMenu = null;
  state.recurMenu = null;
  state.colorMenu = null;
  state.navMenu = null;
  state.teamFilter = false;
}
function render() {
  const light = state.view !== "build";
  const root = document.getElementById("app");
  root.className = light ? "light" : "";
  const active = document.activeElement;
  const focusId = active && active.dataset ? active.dataset.focus : null;
  const sel = active && active.selectionStart;
  root.innerHTML = nav() + '<div class="shell">' + body() + rightRail() + "</div>" + (state.toast ? `<div class="toast">${esc(state.toast)}</div>` : "") + modalHtml() + fabHtml();
  if (focusId) {
    const el = root.querySelector(`[data-focus="${focusId}"]`);
    if (el) {
      el.focus();
      if (sel != null && el.setSelectionRange) {
        try { el.setSelectionRange(sel, sel); } catch (e) { /* ignore */ }
      }
    }
  }
}

function nav() {
  const item = (id, label, caret) => `<div class="nav-anchor"><button class="navbtn ${state.view === id || (id === "feed" && (state.view === "feed" || state.view === "journal")) ? "active" : ""}" onclick="go('${id}', event)">${label}${caret ? ' <span class="caret">▼</span>' : ""}</button>${menuFor(id)}</div>`;
  return `<header class="topnav">
    <div class="wordmark">w<span>ourkout</span></div>
    ${item("daily", "DAILY BRIEF")}
    ${item("feed", "FEED")}
    ${item("build", "BUILD")}
    ${item("workout", "WORKOUT TOOLS", true)}
    ${item("coach", "COACH TOOLS", true)}
    ${item("ams", "AMS")}
    <div class="spacer"></div>
    <button class="req" onclick="openRequest(event)">REQUEST PROGRAM</button>
    <button class="iconbtn" title="Help" onclick="toggleNav('help', event)">?</button>
    <button class="iconbtn" title="Notifications" onclick="toggleNav('bell', event)">🔔</button>
    <button class="avatar" title="Account" onclick="toggleNav('account', event)">${state.role === "athlete" ? esc((ATHLETES.find((a) => a.id === state.actingAthlete) || { name: "A" }).name[0]) : "C"}</button>
  </header>`;
}
function menuFor(id) {
  if (state.navMenu !== id) return "";
  if (id === "workout") {
    return `<div class="menu" style="top:40px">${[
      ["weightroom", "WEIGHTROOM VIEW"], ["whiteboard", "WHITEBOARD"], ["entry", "WORKOUT ENTRY"],
      ["maxes", "MAXES / PRS"], ["journal", "JOURNAL"], ["leaderboard", "LEADERBOARD"], ["evaluations", "EVALUATIONS"]
    ].map(([v, l]) => `<button onclick="goTool('${v}')">${l}</button>`).join("")}</div>`;
  }
  if (id === "coach") {
    return `<div class="menu" style="top:40px">${[
      ["users", "MANAGE USERS"], ["calendars", "MANAGE CALENDARS"], ["build", "THE PLANNER"],
      ["exercises", "EXERCISES"], ["goals", "GOALS"], ["documents", "DOCUMENTS & LINKS"],
      ["packets", "PACKETS & SHEETS"], ["attendance", "ATTENDANCE"], ["reporting", "REPORTING"], ["payments", "PAYMENTS"]
    ].map(([v, l]) => `<button onclick="goTool('${v}')">${l}</button>`).join("")}</div>`;
  }
  if (id === "help") return `<div class="menu" style="top:40px;right:0"><div class="help">Shift+Enter new exercise<br>Shift+I additional info<br>Ctrl/Cmd+P add property<br>Ctrl/Cmd+C copy selection<br>Ctrl/Cmd+V paste on hovered day<br>Ctrl/Cmd+Z undo</div></div>`;
  if (id === "bell") return `<div class="menu" style="top:40px;right:0"><div class="help">Eric completed Volleyball Games<br>Leah logged Push Up · 4:40</div></div>`;
  if (id === "account") {
    const who = state.role === "athlete" ? (ATHLETES.find((a) => a.id === state.actingAthlete) || {}).name : "Coach";
    return `<div class="menu" style="top:40px;right:0;max-height:70vh;overflow:auto">
      <div class="help">Signed in as ${esc(who)}</div>
      <button onclick="backToCoach()">Coach calendar</button>
      ${ATHLETES.map((a) => `<button onclick="openAsAthlete('${a.id}')">${esc(a.name)}</button>`).join("")}
    </div>`;
  }
  return "";
}
function go(view, ev) {
  if (ev) ev.stopPropagation();
  if (view === "workout" || view === "coach") {
    state.navMenu = state.navMenu === view ? null : view;
    render();
    return;
  }
  state.navMenu = null;
  state.view = view === "feed" ? "feed" : view;
  if (view === "feed") state.feedMode = "athletes";
  closeFloats();
  render();
}
function goTool(view) {
  state.navMenu = null;
  if (view === "journal") { state.view = "feed"; state.feedMode = "journal"; }
  else if (view === "build") { state.view = "build"; }
  else state.view = view;
  closeFloats();
  render();
}
function toggleNav(id, ev) {
  ev.stopPropagation();
  state.navMenu = state.navMenu === id ? null : id;
  render();
}
function openRequest(ev) {
  ev.stopPropagation();
  state.modal = { type: "request" };
  render();
}

function rightRail() {
  const btn = (view, icon, title) => `<button title="${title}" class="${state.view === view ? "on" : ""}" onclick="goTool('${view}')">${icon}</button>`;
  return `<aside class="rail right">
    ${btn("build", "▦", "Calendar")}
    ${btn("entry", "☰", "Workout entry")}
    ${btn("feed", "✎", "Feed")}
    ${btn("users", "☺", "Users")}
    <div style="flex:1"></div>
    <button title="Add" onclick="onFab()">＋</button>
  </aside>`;
}
function leftRail() {
  return `<aside class="rail">
    <button title="Collections" class="${state.sidebar ? "on" : ""}" onclick="state.sidebar=!state.sidebar;render()">☰</button>
    <button title="Program Library" onclick="goTool('exercises')">▤</button>
    <button title="Mobile Preview" onclick="openPreview(state.focusDay)">▢</button>
    <button title="Action History" onclick="state.sidebar=true;state.historyOpen=true;render()">↺</button>
  </aside>`;
}

function body() {
  switch (state.view) {
    case "build": return state.role === "athlete" ? mineView() : buildView();
    case "mine": return mineView();
    case "entry": return entryView();
    case "feed": return feedView();
    case "users": return usersView();
    case "exercises": return liftsView();
    case "ams": return amsView();
    case "daily": return dailyView();
    case "weightroom": return weightroomView();
    case "whiteboard": return boardView();
    case "maxes": return maxesView();
    case "leaderboard": return boardLeader();
    case "evaluations": return evalView();
    case "calendars": return calendarsView();
    case "goals": return simpleList("Goals", state.goals, "goal");
    case "documents": return docsView();
    case "packets": return simpleList("Packets & Sheets", state.packets, "packet");
    case "attendance": return attendanceView();
    case "reporting": return reportingView();
    case "payments": return paymentsView();
    default: return buildView();
  }
}

function buildView() {
  const weeks = state.viewMode === "week" ? 1 : 4;
  let weeksHtml = "";
  for (let w = 0; w < weeks; w++) {
    const start = addDays(state.weekStart, w * 7);
    let cols = "";
    for (let i = 0; i < 7; i++) cols += dayCol(addDays(start, i));
    weeksHtml += `<div class="week">${cols}</div>`;
  }
  return leftRail() + (state.sidebar ? sidebarHtml() : "") + (state.preview ? previewHtml() : "") +
    `<section class="stage">
      <div class="subhead">
        <div>
          <div class="crumbs">Calendars / ${esc(athlete().name)}</div>
          <select class="athlete-name" onchange="switchAthlete(this.value)">${ATHLETES.map((a) => `<option value="${a.id}" ${a.id === state.athleteId ? "selected" : ""}>${esc(a.name)}</option>`).join("")}</select>
        </div>
        <div class="sub-actions">
          <button class="ghost" onclick="saveFocused()">Save for athlete</button>
          <button class="ghost" onclick="openAsAthlete(state.athleteId)">Open as athlete</button>
          <button class="ghost" onclick="undo()">↺ UNDO</button>
          <div class="seg">
            <button onclick="shiftWeek(-1)">‹</button>
            <button class="today-pill" onclick="jumpToday()">Today</button>
            <button onclick="shiftWeek(1)">›</button>
          </div>
          <select class="ghost" onchange="state.viewMode=this.value;render()">
            <option value="month" ${state.viewMode === "month" ? "selected" : ""}>Month</option>
            <option value="week" ${state.viewMode === "week" ? "selected" : ""}>Week</option>
          </select>
        </div>
      </div>
      <div class="cal-scroll">${weeksHtml}</div>
    </section>`;
}
function athlete() { return ATHLETES.find((a) => a.id === state.athleteId) || ATHLETES[0]; }
function switchAthlete(id) { state.athleteId = id; state.editor = null; render(); }
function shiftWeek(n) { state.weekStart = addDays(state.weekStart, n * 7); render(); }
function jumpToday() { state.weekStart = sundayOf("2026-10-14"); state.focusDay = "2026-10-14"; render(); }

function dayCol(date) {
  const day = ensureDay(date);
  const st = stats(day);
  const sel = day.items.filter((it) => it.selected);
  const focused = state.focusDay === date ? "focus" : "";
  const items = day.items.map((it) => exRow(date, day, it)).join("");
  const search = state.searchDay === date ? searchPop(date) : "";
  const editor = state.editor && state.editor.day === date ? editorPop(date) : "";
  const menu = state.dayMenu === date ? dayMenu(date) : "";
  const recur = state.recurMenu === date ? recurMenu(date) : "";
  const color = state.colorMenu === date ? colorMenu(date) : "";
  const header = sel.length
    ? `<button class="recur" style="background:#2457c5">Selected (${sel.length})</button>
       <button class="iconbtn" title="Copy" onclick="openCopy('${date}','copy')">⧉</button>
       <button class="iconbtn" title="Move" onclick="openCopy('${date}','move')">→</button>
       <button class="iconbtn" title="Delete" onclick="askDelete('${date}')">🗑</button>`
    : `<button class="recur" onclick="openRecur('${date}', event)">${day.recurring ? `Recurring (${day.recurring}) ▾` : "Not recurring ▾"}</button>`;
  return `<div class="day ${focused}" data-day="${date}" onmouseenter="state.hoverDay='${date}'" onclick="state.focusDay='${date}'">
    <div class="day-top"><span>${fmtDay(date)}</span>
      <span class="tools">
        <button class="iconbtn" title="Copy Workout" onclick="openCopy('${date}','workout')">⧉</button>
        <button class="iconbtn" title="Workout menu" onclick="openDayMenu('${date}', event)">⋯</button>
      </span>
    </div>
    <div class="week-label">${esc(day.weekLabel || "")}</div>
    <input class="day-title ${day.title ? "" : "placeholder"}" data-focus="title-${date}" value="${esc(day.title)}" placeholder="Add Workout Name" onchange="renameDay('${date}', this.value)">
    ${day.savedWorkoutId ? `<div class="saved-pill">Saved for ${esc((ATHLETES.find((a) => a.id === day.savedFor) || {}).name || "athlete")}</div>` : ""}
    <div class="row" style="margin-top:0">
      <input type="checkbox" title="Select all" ${sel.length && sel.length === day.items.length ? "checked" : ""} onclick="toggleAll('${date}', this.checked);event.stopPropagation()">
      ${header}
    </div>
    ${recur}${color}${menu}
    <div>${items}</div>
    ${editor}
    <button class="add-ex" onclick="openSearch('${date}', event)">+ Add Exercise</button>
    ${state.clipboard ? `<button class="add-ex" onclick="pasteOn('${date}')">Paste ${state.clipboard.items.length} item(s)</button>` : ""}
    ${search}
    <div class="stats"><span>S <b>${st.s}</b></span><span>R <b>${st.r}</b></span><span>V <b>${st.v}</b></span></div>
  </div>`;
}
function exRow(date, day, it) {
  const color = LETTER_COLOR[it.letter] || "#888";
  const letter = it.letter ? `<span class="letter" style="background:${color}">${esc(it.letter)}</span>` : `<span class="letter" style="background:#444;color:#fff">–</span>`;
  return `<div class="ex ${it.selected ? "selected" : ""}" draggable="true" ondragstart="dragStart(event,'${date}','${it.id}')" ondragover="dragOver(event)" ondrop="dropOn(event,'${date}','${it.id}')">
    <input class="check" type="checkbox" ${it.selected ? "checked" : ""} onclick="toggleItem('${date}','${it.id}', this.checked);event.stopPropagation()">
    ${letter}
    <button class="ex-main" style="background:transparent;border:0;color:inherit;text-align:left;padding:0" onclick="openEditor('${date}','${it.id}', event)">
      <div class="ex-name">${esc(it.name)}</div>
      <div class="ex-sub">${esc(scriptLine(it))}</div>
    </button>
    <button class="handle" title="Drag">⋮⋮</button>
    <button class="trash" title="Delete" onclick="askDelete('${date}','${it.id}')">🗑</button>
  </div>`;
}

function openSearch(date, ev) {
  ev.stopPropagation();
  state.searchDay = date;
  state.searchQ = "";
  state.focusDay = date;
  state.editor = null;
  render();
}
function searchPop(date) {
  const q = state.searchQ.toLowerCase();
  const list = CATALOG.filter((c) => !q || c.name.toLowerCase().includes(q)).slice(0, 8);
  return `<div class="pop search-pop" onclick="event.stopPropagation()">
    <input data-focus="ex-search" placeholder="Search Exercises" value="${esc(state.searchQ)}" oninput="state.searchQ=this.value;render()">
    <div style="margin-top:6px">
      ${list.map((c) => `<button class="opt" onclick="addFromCatalog('${date}', ${CATALOG.indexOf(c)})">${esc(c.name)}</button>`).join("")}
      <button class="opt create-row" onclick="createExercise('${date}')">+ Create New Exercise <span class="tag">Shift+Enter</span></button>
    </div>
  </div>`;
}
function addFromCatalog(date, index) {
  const entry = CATALOG[index] || { name: "Exercise", type: "lift" };
  addItem(date, fromCatalog(entry));
}
function createExercise(date) {
  const name = (state.searchQ || "").trim();
  if (!name) { state.modal = { type: "create", date }; render(); return; }
  const entry = { name, type: "lift" };
  if (!CATALOG.some((c) => c.name.toLowerCase() === name.toLowerCase())) CATALOG.push(entry);
  state.lifts.push({ id: uid(), name, type: "Lifts", tags: "N/A" });
  addItem(date, fromCatalog(entry));
}
function addItem(date, it) {
  state.modal = null;
  snapshot();
  const day = ensureDay(date);
  const used = day.items.map((x) => x.letter).filter(Boolean);
  if (it.letter) {
    const next = LETTERS.find((L) => !used.includes(L)) || "A";
    it.letter = it.type === "break" || it.type === "rest" || it.type === "video" ? "" : next;
  }
  day.items.push(it);
  state.searchDay = null;
  state.editor = { day: date, id: it.id };
  state.focusDay = date;
  noteHist("Added " + it.name);
  render();
}

function openEditor(date, id, ev) {
  if (ev) ev.stopPropagation();
  state.editor = { day: date, id };
  state.focusDay = date;
  state.searchDay = null;
  state.propMenu = false;
  render();
}
function editorPop(date) {
  const it = findItem(date, state.editor.id);
  if (!it) return "";
  const day = ensureDay(date);
  const head = `<div class="editor-h">
      <span class="letter" style="background:${LETTER_COLOR[it.letter] || "#666"}">${esc(it.letter || "•")}</span>
      <span class="name">${esc(it.name)}</span>
      <span class="grow"></span>
      <button class="pill" onclick="state.letterMenu=!state.letterMenu;render()">${esc(letterCode(day, it))} ▾</button>
      <button class="iconbtn" onclick="state.editor=null;render()">✕</button>
    </div>
    ${state.letterMenu ? `<div class="pop" style="right:8px;top:36px;width:70px;padding:4px">${LETTERS.map((L) => `<button class="opt" onclick="setLetter('${date}','${it.id}','${L}')">${L}</button>`).join("")}<button class="opt" onclick="setLetter('${date}','${it.id}','')">–</button></div>` : ""}
    ${it.note ? `<div class="note-line">${esc(it.note)}</div>` : ""}
    <button class="linkish" onclick="openInfo('${date}','${it.id}')">+ Add Additional Info (Shift + I)</button>`;
  if (it.type === "questionnaire") {
    return `<div class="editor" onclick="event.stopPropagation()">${head}
      ${it.questions.map((q, i) => `<div class="q">${i + 1}. ${esc(q)}</div>`).join("")}
      <label class="chk" style="color:#ddd"><input type="checkbox" ${it.requireResponse ? "checked" : ""} onchange="itRequire('${date}','${it.id}', this.checked)"> Require Response</label>
      <div class="hint">All questionnaire items must be fully completed before showing workout.</div>
    </div>`;
  }
  if (it.type === "circuit") {
    return `<div class="editor" onclick="event.stopPropagation()">${head}
      <div class="detail">${esc(it.detail)}</div>
      <button class="linkish" onclick="editDetail('${date}','${it.id}')">Edit Description Or Additional Info</button>
      ${setRow(date, it, "Rounds")}
      <div class="row">
        <button class="pill" onclick="state.optionsMenu=!state.optionsMenu;render()">Superset ▾</button>
        <button class="pill" onclick="state.optionsMenu=!state.optionsMenu;render()">Options ▾</button>
        <button class="pill ${it.completionOnly ? "on" : ""}" onclick="toggleFlag('${date}','${it.id}','completionOnly')">Completion Only</button>
      </div>
      ${optionsPop(date, it)}
    </div>`;
  }
  if (it.type === "break" || it.type === "video" || it.type === "rest") {
    return `<div class="editor" onclick="event.stopPropagation()">${head}
      ${it.type === "video" ? `<input data-focus="vid-${it.id}" placeholder="Video URL" value="${esc(it.videoUrl)}" oninput="setField('${date}','${it.id}','videoUrl', this.value)">` : ""}
      ${it.type === "rest" ? `<div class="row">Seconds <input style="width:80px" data-focus="rest-${it.id}" value="${esc(it.reps[0] || 60)}" oninput="setRestSeconds('${date}','${it.id}', this.value)"></div>` : ""}
    </div>`;
  }
  const propRows = ["reps", ...it.props].map((p) => propRow(date, it, p)).join("");
  return `<div class="editor" onclick="event.stopPropagation()">${head}
    ${setRow(date, it, "Sets")}
    <button class="pill" onclick="state.propMenu=!state.propMenu;event.stopPropagation();render()">+ Add Property Ctrl+P</button>
    ${state.propMenu ? propMenu(date, it.id) : ""}
    <table class="prop-table"><tr><th></th>${Array.from({ length: it.sets }, (_, i) => `<th>Set ${i + 1}</th>`).join("")}</tr>${propRows}</table>
    <div class="row">
      <button class="pill" onclick="cycleSuperset('${date}','${it.id}')">Superset ${it.supersetWith ? "linked" : "None"} ▾</button>
      <button class="pill" onclick="state.optionsMenu=!state.optionsMenu;render()">Options ▾</button>
      <button class="pill ${it.trackReps ? "on" : ""}" onclick="toggleFlag('${date}','${it.id}','trackReps')">Track Reps ▾</button>
      <button class="pill ${it.trackVolume ? "on" : ""}" onclick="toggleFlag('${date}','${it.id}','trackVolume')">Track Volume ▾</button>
    </div>
    ${optionsPop(date, it)}
  </div>`;
}
function setRow(date, it, label) {
  return `<div class="row"><span>${label}</span><div class="stepper">
    <button onclick="changeSets('${date}','${it.id}',-1)">−</button><b>${it.sets}</b>
    <button onclick="changeSets('${date}','${it.id}',1)">+</button>
  </div><span class="hint"># of ${label} 1–10</span>
  <button class="iconbtn" onclick="askDelete('${date}','${it.id}')">🗑</button></div>`;
}
function propMenu(date, id) {
  const opts = [["load", "Load"], ["rest", "Rest"], ["tempo", "Tempo"], ["velocity", "Velocity"], ["power", "Peak Power"], ["pct", "%1RM"]];
  return `<div class="pop" style="left:120px;top:78px;width:180px">${opts.map(([k, l]) => `<button class="opt" onclick="addProp('${date}','${id}','${k}')">${l}</button>`).join("")}<button class="opt" onclick="toast('Properties are extra columns on each set.');state.propMenu=false;render()">About Properties</button></div>`;
}
function propRow(date, it, key) {
  const label = key === "reps" ? "Reps" : PROP_LABEL[key];
  const arr = key === "reps" ? it.reps : it[key === "load" ? "loads" : key === "rest" ? "rests" : key === "tempo" ? "tempos" : key === "velocity" ? "velocities" : key === "power" ? "powers" : "pcts"];
  if (key === "reps" && !it.trackReps) return "";
  const cells = arr.map((v, i) => `<td><input data-focus="${key}-${it.id}-${i}" value="${esc(v)}" oninput="setCell('${date}','${it.id}','${key}',${i}, this.value)"></td>`).join("");
  return `<tr><th>${label}</th>${cells}</tr>`;
}
function optionsPop(date, it) {
  if (!state.optionsMenu) return "";
  return `<div class="pop" style="left:8px;bottom:8px;width:200px">
    <button class="opt" onclick="toggleFlag('${date}','${it.id}','completionOnly')">Completion only</button>
    <button class="opt" onclick="duplicateItem('${date}','${it.id}')">Duplicate</button>
    <button class="opt danger" onclick="askDelete('${date}','${it.id}')">Remove</button>
  </div>`;
}
function setLetter(date, id, letter) {
  snapshot();
  findItem(date, id).letter = letter;
  state.letterMenu = false;
  render();
}
function changeSets(date, id, d) {
  snapshot();
  const it = findItem(date, id);
  resizeSets(it, (it.sets || 1) + d);
  render();
}
function addProp(date, id, key) {
  const it = findItem(date, id);
  if (!it.props.includes(key)) it.props.push(key);
  if (key === "rest") it.rests = it.rests.map((x) => x || "90");
  state.propMenu = false;
  render();
}
function setCell(date, id, key, i, value) {
  const it = findItem(date, id);
  const map = { reps: "reps", load: "loads", rest: "rests", tempo: "tempos", velocity: "velocities", power: "powers", pct: "pcts" };
  it[map[key]][i] = value;
  if (key === "reps") it.note = it.note;
}
function setField(date, id, key, value) { findItem(date, id)[key] = value; }
function setRestSeconds(date, id, value) {
  const it = findItem(date, id);
  it.reps[0] = value;
  it.note = value + "s";
}
function toggleFlag(date, id, key) {
  const it = findItem(date, id);
  it[key] = !it[key];
  state.optionsMenu = false;
  render();
}
function itRequire(date, id, on) { findItem(date, id).requireResponse = on; }
function cycleSuperset(date, id) {
  const day = ensureDay(date);
  const it = findItem(date, id);
  const others = day.items.filter((x) => x.id !== id && x.letter);
  if (!others.length) { toast("Add another exercise to superset"); return; }
  const next = others.find((x) => x.letter !== it.letter) || others[0];
  snapshot();
  it.letter = next.letter;
  it.supersetWith = next.id;
  render();
}
function duplicateItem(date, id) {
  snapshot();
  const day = ensureDay(date);
  const it = findItem(date, id);
  const copy = JSON.parse(JSON.stringify(it));
  copy.id = uid();
  copy.selected = false;
  day.items.splice(day.items.indexOf(it) + 1, 0, copy);
  state.optionsMenu = false;
  render();
}
function editDetail(date, id) {
  state.modal = { type: "detail", date, id, text: findItem(date, id).detail };
  render();
}
function openInfo(date, id) {
  state.modal = { type: "info", date, id, text: findItem(date, id).note || "" };
  render();
}
function renameDay(date, value) {
  snapshot();
  ensureDay(date).title = value;
  noteHist("Renamed workout");
}

function openDayMenu(date, ev) {
  ev.stopPropagation();
  state.dayMenu = state.dayMenu === date ? null : date;
  state.focusDay = date;
  render();
}
function dayMenu(date) {
  const acts = [
    ["Preview Athlete Workout", `openPreview('${date}')`],
    ["Copy", `openCopy('${date}','workout')`],
    ["Save", `saveDay('${date}')`],
    ["Share Workout", `shareDay('${date}')`],
    ["Change Workout Color", `state.colorMenu='${date}';state.dayMenu=null;render()`],
    ["Clear Workout Title", `clearTitle('${date}')`],
    ["Reset Order", `resetOrder('${date}')`],
    ["Clear Workout Items", `clearItems('${date}')`]
  ];
  return `<div class="pop" style="right:8px;top:28px;width:210px">${acts.map(([l, fn]) => `<button class="opt ${l.includes("Clear Workout Items") ? "danger" : ""}" onclick="${fn}">${l}</button>`).join("")}</div>`;
}
function openRecur(date, ev) {
  ev.stopPropagation();
  state.recurMenu = state.recurMenu === date ? null : date;
  render();
}
function recurMenu(date) {
  const day = ensureDay(date);
  return `<div class="pop" style="left:28px;top:78px;width:220px">
    <div class="hint" style="padding:4px 8px">${day.recurring ? "Repeats weekly · occurrence " + day.recurring : "This workout does not repeat"}</div>
    <button class="opt" onclick="setRecur('${date}',1)">Make weekly recurring</button>
    <button class="opt" onclick="setRecur('${date}',0)">Stop recurring</button>
  </div>`;
}
function setRecur(date, n) {
  snapshot();
  ensureDay(date).recurring = n;
  state.recurMenu = null;
  noteHist(n ? "Marked recurring" : "Stopped recurring");
  render();
}
function colorMenu(date) {
  const colors = ["#3b82f6", "#22c55e", "#eab308", "#ef4444", "#a855f7", "#f97316", "#14b8a6", "#e5e5e5"];
  return `<div class="pop" style="right:8px;top:28px;width:160px"><div class="row">${colors.map((c) => `<button onclick="setColor('${date}','${c}')" style="width:22px;height:22px;border-radius:50%;border:0;background:${c}"></button>`).join("")}</div></div>`;
}
function setColor(date, c) { snapshot(); ensureDay(date).color = c; state.colorMenu = null; render(); }
function saveFocused() { saveDay(state.focusDay || "2026-10-15"); }
function saveDay(date) {
  state.dayMenu = null;
  publishDay(date);
}

async function api(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined
  });
  if (!res.ok) throw new Error((await res.text()) || String(res.status));
  return res.json();
}
async function ensureUser(person, role) {
  if (state.serverUsers[person.id]) return state.serverUsers[person.id];
  const users = await api("GET", "/api/users");
  const email = (person.email || (person.id + "@wourkout.app")).toLowerCase();
  let found = users.find((u) => (u.email || "").toLowerCase() === email) || users.find((u) => u.name === person.name && u.role === role);
  if (!found) {
    found = await api("POST", "/api/users", {
      name: person.name,
      email,
      role,
      title: role === "coach" ? "Coach" : "Athlete"
    });
  }
  state.serverUsers[person.id] = found;
  return found;
}
async function ensureExercise(name) {
  const list = await api("GET", "/api/exercises?search=" + encodeURIComponent(name));
  const exact = list.find((e) => e.name.toLowerCase() === name.toLowerCase());
  if (exact) return exact;
  try {
    return await api("POST", "/api/exercises", { name, category: "Strength" });
  } catch (err) {
    const again = await api("GET", "/api/exercises?search=" + encodeURIComponent(name));
    const hit = again.find((e) => e.name.toLowerCase() === name.toLowerCase());
    if (hit) return hit;
    throw err;
  }
}
async function publishDay(date) {
  const day = ensureDay(date);
  const person = athlete();
  if (!day.items.length) { toast("Add an exercise before saving"); return; }
  try {
    toast("Saving for " + person.name + "…");
    const coach = await ensureUser({ id: "coach", name: "wourkout Coach", email: "coach@wourkout.app" }, "coach");
    const user = await ensureUser(person, "student");
    const exercises = [];
    for (const it of day.items) {
      if (!it.name || it.type === "break") continue;
      const ex = await ensureExercise(it.name);
      exercises.push({
        exercise_id: ex.id,
        superset_group: it.letter || "A",
        order_index: exercises.length,
        prescription_text: scriptLine(it),
        prescribed_sets: it.sets || 1,
        target_reps: String((it.reps && it.reps[0]) || "1"),
        target_weight: String((it.loads && it.loads[0]) || ""),
        rest_seconds: parseInt(it.rests && it.rests[0], 10) || 0,
        notes: it.note || it.detail || ""
      });
    }
    const payload = {
      title: day.title || ("Workout " + fmtDay(date)),
      program_name: "wourkout " + person.name,
      calendar_date: date,
      scheduled_date: date,
      day_of_week: new Date(date + "T12:00:00").toLocaleDateString("en-US", { weekday: "long" }),
      week_number: 5,
      description: day.weekLabel || "",
      exercises
    };
    const existing = await api("GET", "/api/assignments?user_id=" + user.id + "&date=" + date);
    let workout;
    if (existing.length) {
      workout = await api("PUT", "/api/workouts/" + existing[0].workout_id, payload);
      day.assignmentId = existing[0].id;
    } else {
      workout = await api("POST", "/api/workouts", payload);
      const assignment = await api("POST", "/api/assignments", {
        workout_id: workout.id,
        assigned_by_coach_id: coach.id,
        user_id: user.id,
        scheduled_date: date,
        notes: "Saved from Build"
      });
      day.assignmentId = assignment.id;
    }
    day.savedWorkoutId = workout.id;
    day.savedFor = person.id;
    noteHist("Saved " + fmtDay(date) + " for " + person.name);
    toast("Saved for " + person.name);
    render();
  } catch (err) {
    toast("Save failed");
    console.error(err);
  }
}
function backToCoach() {
  state.role = "coach";
  state.actingAthlete = null;
  state.view = "build";
  state.openWorkout = null;
  state.openSession = null;
  state.navMenu = null;
  render();
}
async function openAsAthlete(localId) {
  const person = ATHLETES.find((a) => a.id === localId) || athlete();
  state.navMenu = null;
  state.actingAthlete = person.id;
  state.role = "athlete";
  state.view = "mine";
  state.openWorkout = null;
  state.athleteAssignments = [];
  render();
  try {
    const user = await ensureUser(person, "student");
    state.serverUserId = user.id;
    state.athleteAssignments = await api("GET", "/api/assignments?user_id=" + user.id);
    render();
  } catch (err) {
    toast("Could not load this athlete");
    console.error(err);
  }
}
async function openAthleteWorkout(workoutId) {
  const workout = await api("GET", "/api/workouts/" + workoutId);
  const session = await api("GET", "/api/sessions/active/" + workoutId + "?user_id=" + state.serverUserId);
  state.openWorkout = workout;
  state.openSession = session;
  render();
}
async function logAthleteSet(weId, setNumber, field, value) {
  const logs = state.openSession.set_logs || [];
  const current = logs.find((l) => l.workout_exercise_id === weId && l.set_number === setNumber) || { weight: 0, reps: 0, completed: false };
  if (field === "weight") current.weight = value;
  if (field === "reps") current.reps = value;
  if (field === "completed") current.completed = value;
  const saved = await api("POST", "/api/sessions/" + state.openSession.id + "/sets?workout_exercise_id=" + weId + "&set_number=" + setNumber + "&weight=" + (parseFloat(current.weight) || 0) + "&reps=" + (parseFloat(current.reps) || 0) + "&completed=" + (current.completed ? "true" : "false"));
  state.openSession.set_logs = logs.filter((l) => !(l.workout_exercise_id === weId && l.set_number === setNumber)).concat([saved]);
  render();
}
function mineView() {
  const person = ATHLETES.find((a) => a.id === state.actingAthlete) || athlete();
  const rows = state.athleteAssignments || [];
  const workout = state.openWorkout;
  const detail = workout ? `<div class="panel" style="margin-top:12px">
      <button class="comment" onclick="state.openWorkout=null;render()">← All saved days</button>
      <h2>${esc(workout.title)}</h2>
      <p class="hint">${esc(workout.calendar_date || workout.scheduled_date || "")} · ${esc(person.name)}</p>
      ${workout.exercises.map((we) => athleteExercise(we)).join("") || "<p>No exercises on this routine.</p>"}
    </div>` : "";
  return `<section class="stage light-page">
    <div class="athlete-banner">
      <span>Athlete · ${esc(person.name)}. Only routines saved for this athlete.</span>
      <button class="ghost" onclick="backToCoach()">Back to coach</button>
    </div>
    <h1 style="margin-top:16px">My workout</h1>
    ${rows.length ? `<div class="grid-cards">${rows.map((a) => `<article class="card">
        <div class="hint">${esc(a.scheduled_date)}</div>
        <strong>${esc(a.workout_title || "Workout")}</strong>
        <p class="hint">${esc(a.notes || "")}</p>
        <button class="switch" onclick="openAthleteWorkout(${a.workout_id})">Open routine</button>
      </article>`).join("")}</div>` : `<div class="empty"><div><div class="book">▦</div><div>Nothing saved for ${esc(person.name)} yet. A coach saves it from Build.</div></div></div>`}
    ${detail}
  </section>`;
}
function athleteExercise(we) {
  const sets = we.prescribed_sets || 1;
  const rows = Array.from({ length: sets }, (_, i) => {
    const n = i + 1;
    const log = ((state.openSession && state.openSession.set_logs) || []).find((l) => l.workout_exercise_id === we.id && l.set_number === n) || {};
    return `<tr><td>${n}</td>
      <td><input value="${esc(log.weight ?? we.target_weight ?? "")}" onchange="logAthleteSet(${we.id}, ${n}, 'weight', this.value)"></td>
      <td><input value="${esc(log.reps ?? we.target_reps ?? "")}" onchange="logAthleteSet(${we.id}, ${n}, 'reps', this.value)"></td>
      <td><input type="checkbox" ${log.completed ? "checked" : ""} onchange="logAthleteSet(${we.id}, ${n}, 'completed', this.checked)"></td></tr>`;
  }).join("");
  return `<div style="margin:12px 0">
    <strong>${esc(we.superset_group || "")} ${esc(we.exercise.name)}</strong>
    <div class="hint">${esc(we.prescription_text || "")} ${we.notes ? "· " + esc(we.notes) : ""}</div>
    <table class="sets"><tr><th>Set</th><th>Kg</th><th>Reps</th><th>Done</th></tr>${rows}</table>
  </div>`;
}
function shareDay(date) { state.dayMenu = null; state.modal = { type: "share", date }; render(); }
function clearTitle(date) { snapshot(); ensureDay(date).title = ""; state.dayMenu = null; render(); }
function resetOrder(date) {
  snapshot();
  const day = ensureDay(date);
  day.items.forEach((it, i) => { if (it.letter) it.letter = LETTERS[Math.min(i, 9)]; });
  state.dayMenu = null;
  toast("Order reset");
  render();
}
function clearItems(date) {
  state.dayMenu = null;
  state.modal = { type: "clear", date };
  render();
}
function toggleAll(date, on) {
  ensureDay(date).items.forEach((it) => { it.selected = on; });
  render();
}
function toggleItem(date, id, on) {
  findItem(date, id).selected = on;
  render();
}
function askDelete(date, id) {
  const ids = id ? [id] : ensureDay(date).items.filter((it) => it.selected).map((it) => it.id);
  if (!ids.length) return;
  state.modal = { type: "delete", date, ids };
  render();
}
function confirmDelete() {
  const m = state.modal;
  if (!m || m.type !== "delete") return;
  doDelete(m.date, m.ids);
}
function doDelete(date, ids) {
  snapshot();
  const day = ensureDay(date);
  day.items = day.items.filter((it) => !ids.includes(it.id));
  if (state.editor && ids.includes(state.editor.id)) state.editor = null;
  state.modal = null;
  noteHist("Deleted " + ids.length + " item(s)");
  render();
}

function openCopy(date, mode) {
  const day = ensureDay(date);
  let ids = day.items.filter((it) => it.selected).map((it) => it.id);
  if (!ids.length || mode === "workout") ids = day.items.map((it) => it.id);
  state.clipboard = { from: date, items: day.items.filter((it) => ids.includes(it.id)).map((it) => JSON.parse(JSON.stringify(it))), mode };
  state.modal = {
    type: "copy", mode, date, ids,
    target: date, rangeEnd: addDays(date, 2),
    includeLoads: true, includeTitles: true, placement: "bottom"
  };
  state.dayMenu = null;
  render();
}
function applyCopy() {
  const m = state.modal;
  snapshot();
  const source = ensureDay(m.date);
  const items = source.items.filter((it) => m.ids.includes(it.id)).map((it) => JSON.parse(JSON.stringify(it)));
  const dates = [m.target];
  if (m.range) {
    let d = m.target;
    let guard = 0;
    while (d <= m.rangeEnd && guard < 21) { if (!dates.includes(d)) dates.push(d); d = addDays(d, 1); guard++; }
  }
  dates.forEach((d) => {
    const day = ensureDay(d);
    items.forEach((it) => { it.selected = false; });
    const clones = items.map((it) => Object.assign(JSON.parse(JSON.stringify(it)), { id: uid(), selected: false }));
    if (m.placement === "clear") day.items = clones;
    else day.items = day.items.concat(clones);
    if (m.includeTitles && m.mode === "workout") {
      day.title = source.title;
      day.color = source.color;
    }
    if (!m.includeLoads) clones.forEach((it) => { it.loads = it.loads.map(() => ""); it.props = it.props.filter((p) => p !== "load"); });
  });
  if (m.mode === "move") source.items = source.items.filter((it) => !m.ids.includes(it.id));
  state.clipboard = { from: m.date, items: items.map((it) => JSON.parse(JSON.stringify(it))), mode: "copy" };
  toast(items.length + " item(s) copied");
  noteHist("Copied " + items.length + " item(s)");
  state.modal = null;
  render();
}
function pasteOn(date) {
  if (!state.clipboard) return;
  snapshot();
  const day = ensureDay(date);
  const clones = state.clipboard.items.map((it) => Object.assign(JSON.parse(JSON.stringify(it)), { id: uid(), selected: false }));
  day.items = day.items.concat(clones);
  if (state.clipboard.mode === "move") {
    const src = ensureDay(state.clipboard.from);
    const names = new Set(state.clipboard.items.map((it) => it.id));
    src.items = src.items.filter((it) => !names.has(it.id));
    state.clipboard = null;
  }
  toast(clones.length + " item(s) pasted");
  render();
}

let drag = null;
function dragStart(ev, date, id) {
  const day = ensureDay(date);
  const it = findItem(date, id);
  const ids = it.selected ? day.items.filter((x) => x.selected).map((x) => x.id) : [id];
  drag = { date, ids };
  ev.dataTransfer.effectAllowed = "move";
  ev.dataTransfer.setData("text/plain", ids.join(","));
}
function dragOver(ev) { ev.preventDefault(); ev.currentTarget.closest(".day")?.classList.add("drop"); }
function dropOn(ev, date, beforeId) {
  ev.preventDefault();
  ev.stopPropagation();
  if (!drag) return;
  snapshot();
  const src = ensureDay(drag.date);
  const moving = src.items.filter((it) => drag.ids.includes(it.id));
  src.items = src.items.filter((it) => !drag.ids.includes(it.id));
  const dest = ensureDay(date);
  let idx = dest.items.findIndex((it) => it.id === beforeId);
  if (idx < 0) idx = dest.items.length;
  const clones = drag.date === date ? moving : moving.map((it) => Object.assign(JSON.parse(JSON.stringify(it)), { id: uid(), selected: false }));
  dest.items.splice(idx, 0, ...clones);
  if (drag.date === date) reletter(dest);
  noteHist("Moved " + moving.length + " item(s)");
  drag = null;
  render();
}
document.addEventListener("dragover", (ev) => {
  const day = ev.target.closest && ev.target.closest(".day");
  if (day) ev.preventDefault();
});
document.addEventListener("drop", (ev) => {
  const day = ev.target.closest && ev.target.closest(".day");
  if (!day || !drag) return;
  if (ev.target.closest(".ex")) return;
  ev.preventDefault();
  dropOn(ev, day.dataset.day, null);
});

function openPreview(date) {
  const day = ensureDay(date);
  state.preview = { date, index: 0 };
  state.previewTab = day.items.length ? "list" : "exercise";
  state.dayMenu = null;
  state.sidebar = false;
  render();
}
function previewHtml() {
  const day = ensureDay(state.preview.date);
  const it = day.items[state.preview.index];
  const list = state.previewTab === "list" || !it;
  return `<aside class="preview">
    <div class="vid"><div class="play">▶</div><div style="position:absolute;bottom:8px;left:10px">${esc(it ? it.name : "Workout")}</div></div>
    <div class="body">
      <div class="hint">${fmtLong(state.preview.date)}</div>
      <strong>${esc(athlete().name)}</strong>
      <div class="tabs">
        <button class="${state.previewTab === "list" ? "on" : ""}" onclick="state.previewTab='list';render()">GENERAL</button>
        <button class="${state.previewTab !== "list" ? "on" : ""}" onclick="state.previewTab='exercise';render()">EXERCISE</button>
      </div>
      ${list ? day.items.map((x, i) => `<button class="opt" onclick="state.preview.index=${i};state.previewTab='exercise';render()">${esc(x.letter || "•")} ${esc(x.name)}</button>`).join("") || '<div class="hint">No exercises</div>' : previewDetail(day, it)}
    </div>
    <div class="preview-nav">
      <button class="iconbtn" onclick="state.preview=null;render()">✕</button>
      <span>
        <button class="iconbtn" onclick="stepPreview(-1)">‹</button>
        <button class="iconbtn" onclick="stepPreview(1)">›</button>
      </span>
    </div>
  </aside>`;
}
function previewDetail(day, it) {
  if (!it) return "";
  if (it.type === "questionnaire") {
    return it.questions.map((q, i) => `<div class="q">${i + 1}. ${esc(q)}</div>`).join("") + `<button class="complete" onclick="completeItem('${state.preview.date}','${it.id}')">Complete</button>`;
  }
  const rows = Array.from({ length: it.sets || 1 }, (_, i) => `<tr><td>${i + 1}</td><td><input value="${esc(it.loads[i] || "")}" onchange="setCell('${state.preview.date}','${it.id}','load',${i}, this.value)"></td><td><input value="${esc(it.reps[i] || "")}" onchange="setCell('${state.preview.date}','${it.id}','reps',${i}, this.value)"></td></tr>`).join("");
  return `<div class="ex-sub">${esc(scriptLine(it))}</div>
    ${it.detail ? `<div class="detail">${esc(it.detail)}</div>` : ""}
    <table class="sets"><tr><th>SET</th><th>WEIGHT (KG)</th><th>REPS</th></tr>${rows}</table>
    <div class="tabs">
      <button onclick="toast('Opted out of ${esc(it.name)}')">OPT OUT</button>
      <button onclick="state.view='feed';state.feedMode='journal';render()">JOURNAL</button>
      <button onclick="toast('No media on this exercise')">MEDIA</button>
    </div>
    <button class="complete" onclick="completeItem('${state.preview.date}','${it.id}')">Complete</button>`;
}
function stepPreview(d) {
  const day = ensureDay(state.preview.date);
  if (!day.items.length) return;
  state.preview.index = (state.preview.index + d + day.items.length) % day.items.length;
  state.previewTab = "exercise";
  render();
}
function completeItem(date, id) {
  const it = findItem(date, id);
  const key = state.athleteId + ":" + date + ":" + id;
  state.logs[key] = { done: true, sets: it.sets, reps: it.reps.slice(), loads: it.loads.slice() };
  toast("Completed " + it.name);
  render();
}

function sidebarHtml() {
  const recent = [];
  Object.values(cal()).forEach((day) => day.items.forEach((it) => {
    if (!recent.some((r) => r.name === it.name)) recent.push(it);
  }));
  return `<aside class="sidebar">
    <div class="crumbs">Collections / ${esc(athlete().name)}</div>
    <select class="ghost" style="width:100%" onchange="switchAthlete(this.value)">${ATHLETES.map((a) => `<option value="${a.id}" ${a.id === state.athleteId ? "selected" : ""}>${esc(a.name)}</option>`).join("")}</select>
    <h4>Saved on this calendar</h4>
    ${recent.slice(0, 8).map((it) => `<button class="side-item" onclick="goTool('entry');state.entryAthlete=state.athleteId;render()">${esc(it.name)}<small>${esc(scriptLine(it))}</small></button>`).join("")}
    ${state.historyOpen ? `<h4>Action history</h4>${state.history.map((h) => `<div class="history">${esc(h.t)} ${esc(h.text)}</div>`).join("") || '<div class="hint">No actions yet</div>'}` : ""}
    <div style="flex:1"></div>
    <button class="ghost" onclick="goTool('entry');state.entryAthlete=state.athleteId">View in Workout Entry →</button>
  </aside>`;
}

function undo() {
  const prev = state.undo.pop();
  if (!prev) { toast("Nothing to undo"); return; }
  state.calendars = JSON.parse(prev);
  state.editor = null;
  toast("Undone");
  render();
}

function entryView() {
  const who = state.entryAthlete;
  const athleteObj = ATHLETES.find((a) => a.id === who);
  const day = who ? ensureDay(state.entryDate, who) : null;
  const week = sundayOf(state.entryDate);
  const days = Array.from({ length: 7 }, (_, i) => addDays(week, i));
  const summary = summarize(who, state.entryDate);
  return `<section class="stage light-page">
    <h1 style="font-size:18px;color:#666;font-weight:600">Workout Entry</h1>
    <div class="entry-wrap">
      <div>
        ${who ? `<div class="panel athlete-mini">
            <div class="bigav">${esc(athleteObj.name.slice(0, 1))}</div>
            <strong>${esc(athleteObj.name)}</strong>
            <div><button class="switch" onclick="state.entryOpen=!state.entryOpen;render()">SWITCH ATHLETE</button></div>
            ${state.entryOpen ? athletePicker() : ""}
            <button class="blackbtn" onclick="goTool('exercises')">Program Library</button>
            <button class="blackbtn" onclick="window.print()">Print Workout</button>
            <button class="blackbtn" onclick="state.view='build';state.athleteId='${who}';state.weekStart=sundayOf('${state.entryDate}');render()">Go to Calendar</button>
          </div>` : `<div class="panel">${athletePicker()}</div>`}
      </div>
      <div class="panel">
        ${who ? `<div class="weekstrip">
            <button class="iconbtn" style="color:#333" onclick="state.entryDate=addDays(state.entryDate,-7);render()">‹</button>
            <div style="text-align:center"><div>${fmtLong(state.entryDate).replace(/,.*/, "")}</div>
              <div>${days.map((d) => `<button class="d ${d === state.entryDate ? "on" : ""}" onclick="state.entryDate='${d}';render()">${new Date(d + "T12:00:00").getDate()}</button>`).join("")}</div>
            </div>
            <button class="iconbtn" style="color:#333" onclick="state.entryDate=addDays(state.entryDate,7);render()">›</button>
          </div>
          <h3>${esc(day.title || "Workout")}</h3>
          ${day.items.map((it) => entryItem(who, state.entryDate, it)).join("") || '<div class="empty">No exercises this day</div>'}` : `<div class="empty"><div><div class="book">◎</div><div>Please Select An Athlete</div></div></div>`}
      </div>
      <div>
        <div class="panel"><strong>Session Summary</strong><div class="kpis" style="margin-top:8px">
          <div class="kpi"><b>${summary.sets}</b><span>Sets Completed</span></div>
          <div class="kpi"><b>${summary.reps}</b><span>Total Reps</span></div>
          <div class="kpi"><b>${summary.tonnage}</b><span>Tonnage</span></div>
          <div class="kpi"><b>${summary.duration}</b><span>Session Duration</span></div>
        </div></div>
        <div class="panel" style="margin-top:10px"><strong>Imported Data</strong><p class="hint">No Imported Data for this session.</p></div>
        <div class="panel" style="margin-top:10px"><strong>New PR's</strong><p class="hint">${summary.prs || "No PRs for this Session"}</p></div>
      </div>
    </div>
  </section>`;
}
function athletePicker() {
  return `<input class="plain" placeholder="Search" style="width:100%;margin:8px 0" data-focus="ath-search" oninput="state.athQ=this.value;render()">
    ${ATHLETES.filter((a) => !state.athQ || a.name.toLowerCase().includes(state.athQ.toLowerCase())).map((a) => `<button class="opt" style="color:#222" onclick="pickAthlete('${a.id}')"><span class="dotav">${esc(a.name[0])}</span> ${esc(a.name)}</button>`).join("")}
    <label class="chk"><input type="checkbox" ${state.showHidden ? "checked" : ""} onchange="state.showHidden=this.checked"> View workouts hidden from athletes</label>`;
}
function pickAthlete(id) {
  state.entryAthlete = id;
  state.entryOpen = false;
  state.athleteId = id;
  if (!state.startedAt) state.startedAt = Date.now();
  render();
}
function entryItem(aid, date, it) {
  const key = aid + ":" + date + ":" + it.id;
  const open = state.entryItem === it.id;
  return `<div>
    <button class="entry-item" onclick="state.entryItem=state.entryItem==='${it.id}'?null:'${it.id}';render()">
      <span class="letter" style="background:${LETTER_COLOR[it.letter] || "#999"}">${esc(it.letter || "•")}</span>
      <span><strong>${esc(it.name)}</strong><div class="hint">${esc(scriptLine(it))}</div></span>
    </button>
    ${open ? `<div style="padding:6px 8px 10px">${it.type === "questionnaire" ? it.questions.map((q) => `<label class="chk"><input type="checkbox" onchange="logCheck('${key}', this.checked)"> ${esc(q)}</label>`).join("") : `<table class="sets"><tr><th>Set</th><th>Kg</th><th>Reps</th><th></th></tr>${Array.from({ length: it.sets || 1 }, (_, i) => {
      const log = (state.logs[key] && state.logs[key].cells && state.logs[key].cells[i]) || { w: it.loads[i] || "", r: it.reps[i] || "", done: false };
      return `<tr><td>${i + 1}</td><td><input value="${esc(log.w)}" onchange="logCell('${key}',${i},'w',this.value,'${date}','${it.id}')"></td><td><input value="${esc(log.r)}" onchange="logCell('${key}',${i},'r',this.value,'${date}','${it.id}')"></td><td><input type="checkbox" ${log.done ? "checked" : ""} onchange="logCell('${key}',${i},'done',this.checked,'${date}','${it.id}')"></td></tr>`;
    }).join("")}</table>`}
    <button class="complete" onclick="markDone('${key}','${it.name}')">Complete</button></div>` : ""}
  </div>`;
}
function logCell(key, i, field, value) {
  const log = state.logs[key] || (state.logs[key] = { cells: {} });
  log.cells[i] = log.cells[i] || { w: "", r: "", done: false };
  log.cells[i][field] = value;
  render();
}
function logCheck(key) { state.logs[key] = { done: true }; }
function markDone(key, name) {
  const log = state.logs[key] || (state.logs[key] = { cells: {} });
  log.done = true;
  toast("Logged " + name);
  render();
}
function summarize(aid, date) {
  if (!aid) return { sets: 0, reps: 0, tonnage: 0, duration: "N/A", prs: "" };
  const day = ensureDay(date, aid);
  let sets = 0, reps = 0, tonnage = 0;
  day.items.forEach((it) => {
    const log = state.logs[aid + ":" + date + ":" + it.id];
    if (!log) return;
    if (log.done && !log.cells) { sets += it.sets || 1; reps += (it.reps || []).reduce((a, b) => a + (+b || 0), 0); }
    Object.values(log.cells || {}).forEach((c) => {
      if (c.done) { sets += 1; reps += +c.r || 0; tonnage += (+c.r || 0) * (+c.w || 0); }
    });
  });
  const dur = state.startedAt ? fmtDur(Date.now() - state.startedAt) : "00:00";
  return { sets, reps, tonnage, duration: dur, prs: "" };
}
function fmtDur(ms) {
  const s = Math.floor(ms / 1000);
  return String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
}

const FEED = [
  ["Greg Riedstra", "Dumbbell Swing", "October 8, 2026", "All good. Took a minute to get the hip push instead of knees"],
  ["Coach Rory", "Front Squat", "October 7, 2026", ""],
  ["Michelle Louwagie", "Deep Squat Jump", "October 7, 2026", "My trainer said so"],
  ["Eric Van Zeumeren", "Drop In Acceleration", "October 5, 2026", "3.29* best 20m time"],
  ["Leah Van Zeumeren", "Sit Up and Reach", "October 1, 2026", "4:40"],
  ["Leah Van Zeumeren", "Push Up", "October 1, 2026", "4:40"],
  ["Michelle Louwagie", "Cable Hip Abduction", "September 29, 2026", "Fed up with this shit"],
  ["Coach Rory", "Machine Shoulder Press", "September 19, 2026", ""],
  ["Michelle Louwagie", "Stair Climber", "September 11, 2026", "8 mins, build @ lvl 4"]
];
function feedView() {
  if (state.feedMode === "journal") return journalView();
  if (state.feedMode === "team") return teamView();
  const cards = FEED.filter((row) => {
    if (state.feedWho !== "all" && row[0] !== state.feedWho) return false;
    if (state.feedQ && !row.join(" ").toLowerCase().includes(state.feedQ.toLowerCase())) return false;
    return true;
  });
  return `<section class="stage light-page">
    <div class="feed-top">
      <div>
        <h1><select class="plain" onchange="setFeedMode(this.value)"><option value="athletes">All Athletes</option><option value="journal">My Journal</option><option value="team">Team Feed</option></select></h1>
        <div class="filters"><select class="plain" onchange="state.feedTime=this.value;render()"><option value="all">ALL TIME</option><option>THIS WEEK</option><option>THIS MONTH</option></select></div>
      </div>
      <div>
        <select class="plain" onchange="state.feedWho=this.value;render()"><option value="all">ATHLETES</option>${ATHLETES.map((a) => `<option ${state.feedWho === a.name ? "selected" : ""}>${esc(a.name)}</option>`).join("")}</select>
        <input class="plain" placeholder="Search Athletes" data-focus="feed-q" value="${esc(state.feedQ)}" oninput="state.feedQ=this.value;render()">
      </div>
    </div>
    <div class="grid-cards">${cards.map((c, i) => feedCard(c, i)).join("")}</div>
  </section>`;
}
function setFeedMode(v) { state.feedMode = v; render(); }
function feedCard(c, i) {
  const extra = state.comments[i] ? `<div class="hint">Coach: ${esc(state.comments[i])}</div>` : "";
  return `<article class="card">
    <div class="who"><span class="dotav">${esc(c[0][0])}</span><div><strong>${esc(c[0])}</strong><div class="hint">${esc(c[2])}</div></div></div>
    <div class="exname">${esc(c[1])}</div>
    <div class="quote">${esc(c[3] || "")}</div>
    ${extra}
    <button class="comment" onclick="commentOn(${i})">▢ Add a Comment</button>
  </article>`;
}
function commentOn(i) {
  state.modal = { type: "comment", i, text: state.comments[i] || "" };
  render();
}
function journalView() {
  return `<section class="stage light-page">
    <div class="feed-top"><div><h1>My Journal</h1><div class="filters">ALL TIME ▾</div></div></div>
    ${state.journal.length ? `<div class="grid-cards">${state.journal.map((j) => `<article class="card"><strong>${esc(j.title)}</strong><p>${esc(j.body)}</p><div class="hint">${esc(j.date)}</div></article>`).join("")}</div>` : `<div class="empty"><div><div class="book">📓</div><div>No Entries Available</div></div></div>`}
  </section>`;
}
function teamView() {
  const posts = state.posts.filter((p) => !state.teamGroup || p.group === state.teamGroup);
  return `<section class="stage light-page">
    <div class="feed-top">
      <div>
        <h1>Team Feed</h1>
        <div class="filters"><select class="plain"><option>ALL POSTS</option><option>MINE</option></select></div>
        <div style="position:relative;margin-top:8px">
          <button class="plain" onclick="state.teamFilter=!state.teamFilter;event.stopPropagation();render()">GROUP FILTERS ${state.teamGroup ? "· " + esc(state.teamGroup) : ""}</button>
          ${state.teamFilter ? `<div class="group-pop">${state.groups.map((g) => `<button onclick="state.teamGroup='${esc(g)}';state.teamFilter=false;render()">${esc(g)}</button>`).join("")}<button onclick="state.teamGroup='';state.teamFilter=false;render()">All groups</button></div>` : ""}
        </div>
      </div>
      <div class="mode"><button class="${state.teamMode === "feed" ? "on" : ""}" onclick="state.teamMode='feed';render()">FEED</button><button class="${state.teamMode === "tv" ? "on" : ""}" onclick="state.teamMode='tv';render()">TV MODE</button></div>
      <div class="popular"><h3>POPULAR POSTS THIS WEEK</h3><p>${posts[0] ? esc(posts[0].text) : "No Posts Available"}</p></div>
    </div>
    ${state.compose ? `<div class="compose panel" style="margin-top:12px"><input class="plain" placeholder="Title" data-focus="post-title" value="${esc(state.draftTitle || "")}" oninput="state.draftTitle=this.value"><textarea class="plain" placeholder="Write a post" data-focus="post-body" oninput="state.draftBody=this.value">${esc(state.draftBody || "")}</textarea><button class="req" onclick="publishPost()">Post</button></div>` : ""}
    <div class="grid-cards">${posts.map((p) => `<article class="card"><strong>${esc(p.title || "Post")}</strong><div class="hint">${esc(p.group || "All groups")}</div><p>${esc(p.text)}</p></article>`).join("") || '<div class="empty"><div><div class="book">▦</div><div>No Posts Available</div></div></div>'}</div>
    ${state.teamMode === "tv" ? `<div class="panel" style="margin-top:12px;font-size:28px;text-align:center">${posts[0] ? esc(posts[0].text) : "TV mode · waiting for a post"}</div>` : ""}
  </section>`;
}
function publishPost() {
  if (!state.draftBody) return;
  state.posts.unshift({ title: state.draftTitle || "Note", text: state.draftBody, group: state.teamGroup });
  state.draftBody = ""; state.draftTitle = ""; state.compose = false;
  toast("Posted");
  render();
}

function usersView() {
  const rows = state.userTab === "coaches" ? state.coaches : state.userTab === "athletes" ? state.athletes : [];
  const q = state.userQ.toLowerCase();
  const filtered = rows.filter((r) => (r.first + r.last + r.email).toLowerCase().includes(q));
  const tab = (id, label) => `<button class="${state.userTab === id ? "on" : ""}" onclick="state.userTab='${id}';render()">${label}</button>`;
  let main = "";
  if (state.userTab === "groups") {
    main = `<div class="light-page"><h1>Groups</h1><div class="grid-cards">${state.groups.map((g, i) => `<article class="card"><strong>${esc(g)}</strong><div><button class="comment" onclick="state.groups.splice(${i},1);render()">Remove</button></div></article>`).join("")}</div>
      <button class="req" style="margin-top:12px" onclick="addNamed('group')">+ Group</button></div>`;
  } else if (state.userTab === "codes") {
    main = `<div class="light-page"><h1>Easy-Join Codes</h1><table class="data"><tr><th>Code</th><th>Group</th><th></th></tr>${state.joinCodes.map((c, i) => `<tr><td>${esc(c.code)}</td><td>${esc(c.group)}</td><td><button class="icon-a" onclick="navigator.clipboard.writeText('${esc(c.code)}');toast('Copied')">Copy</button> <button class="icon-a" onclick="state.joinCodes.splice(${i},1);render()">✕</button></td></tr>`).join("")}</table>
      <button class="req" style="margin-top:12px" onclick="state.joinCodes.push({code:'NEW'+Math.floor(Math.random()*90+10), group: state.groups[0]});render()">+ Code</button></div>`;
  } else if (state.userTab === "upload") {
    main = `<div class="light-page"><h1>Upload Users</h1><p>Paste one name per line.</p><textarea id="uploadBox" class="plain" style="width:100%;min-height:120px"></textarea><button class="req" onclick="importUsers()">Import</button></div>`;
  } else if (state.userTab === "export") {
    main = `<div class="light-page"><h1>Export Data</h1><p>Download calendars and roster as JSON.</p><button class="req" onclick="exportData()">Download</button></div>`;
  } else {
    main = `<div class="redbar"><span>${state.userTab === "coaches" ? "Coaches" : "Athletes"}</span>
      <span><select class="plain" onchange="state.userSort=this.value;render()"><option value="last">Last Name</option><option value="first">First Name</option></select>
      <input class="plain" placeholder="Search for User" data-focus="user-q" value="${esc(state.userQ)}" oninput="state.userQ=this.value;render()">
      <button class="ghost" onclick="render()">Search</button></span></div>
      <div class="tablewrap"><table class="data"><tr><th></th><th>FIRST</th><th>LAST</th><th>EMAIL</th><th>ASSIGNED GROUPS</th><th>ASSIGNED CALS</th><th>LAST ACTIVITY</th><th></th></tr>
      ${filtered.sort((a, b) => a[state.userSort].localeCompare(b[state.userSort])).map((r) => `<tr><td><span class="dotav">${esc(r.first[0])}</span></td><td>${esc(r.first)}</td><td>${esc(r.last)}</td><td>${esc(r.email)}</td><td>${esc(r.groups)}</td><td>${esc(r.cals)}</td><td style="color:${r.activity === "N/A" ? "#c90" : "#1a7f37"}">${esc(r.activity)}</td><td><button class="icon-a" onclick="editUser('${r.id}')">✎</button> <button class="icon-a" onclick="removeUser('${r.id}')">🗑</button></td></tr>`).join("")}
      </table></div>`;
  }
  return `<section class="stage" style="display:flex;flex-direction:column;min-height:calc(100vh - 48px)"><div class="users" style="flex:1">
    <nav>
      <div class="sec" style="color:#fff;font-size:15px;letter-spacing:0;padding:16px 14px 8px">Manage Users</div>
      <div class="sec">MANAGEMENT</div>
      ${tab("athletes", "Athletes")}${tab("coaches", "Coaches")}${tab("groups", "Groups")}${tab("codes", "Easy-Join Codes")}
      <div class="sec">TOOLS</div>
      ${tab("upload", "Upload Users")}${tab("export", "Export Data")}
    </nav>
    <div style="display:flex;flex-direction:column;min-width:0;background:#eee">${main}</div>
  </div></section>`;
}
function importUsers() {
  const text = document.getElementById("uploadBox").value;
  text.split("\n").map((l) => l.trim()).filter(Boolean).forEach((line) => {
    const [first, ...rest] = line.split(" ");
    state.athletes.push({ id: uid(), first, last: rest.join(" ") || "Athlete", email: first.toLowerCase() + "@example.com", activity: "N/A", groups: "Eric's Athletes", cals: "All" });
  });
  state.userTab = "athletes";
  toast("Users imported");
  render();
}
function exportData() {
  const blob = new Blob([JSON.stringify({ calendars: state.calendars, athletes: state.athletes, coaches: state.coaches }, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "wourkout-export.json";
  a.click();
}
function removeUser(id) {
  state.coaches = state.coaches.filter((c) => c.id !== id);
  state.athletes = state.athletes.filter((c) => c.id !== id);
  render();
}
function editUser(id) {
  const row = state.coaches.concat(state.athletes).find((r) => r.id === id);
  state.modal = { type: "user", row };
  render();
}
function addNamed(kind) {
  const name = prompt(kind === "group" ? "Group name" : kind === "goal" ? "Goal" : "Name");
  if (!name) return;
  if (kind === "group") state.groups.push(name);
  if (kind === "goal") state.goals.push(name);
  if (kind === "packet") state.packets.push(name);
  render();
}

function liftsView() {
  const q = state.liftQ.toLowerCase();
  const rows = state.lifts.filter((l) => l.type === state.managing && l.name.toLowerCase().includes(q));
  return `<section class="stage" style="background:#eee">
    <div class="light-page">
      <div class="feed-top"><h1 style="display:flex;gap:8px;align-items:center">Master Database
        <select class="plain" onchange="state.managing=this.value;render()">${["Lifts", "Circuits", "Questionnaires"].map((t) => `<option ${state.managing === t ? "selected" : ""}>${t}</option>`).join("")}</select>
      </h1><div>Managing: <select class="plain" onchange="state.managing=this.value;render()">${["Lifts", "Circuits", "Questionnaires"].map((t) => `<option ${state.managing === t ? "selected" : ""}>${t}</option>`).join("")}</select></div></div>
      <input class="plain" style="width:100%;margin:8px 0" placeholder="Search for ${esc(state.managing.slice(0, -1))}" data-focus="lift-q" value="${esc(state.liftQ)}" oninput="state.liftQ=this.value;render()">
      <table class="data"><tr><th></th><th>Lift Name</th><th>Tags</th><th>Attributes</th><th>Actions</th></tr>
        ${rows.map((l) => `<tr><td><input type="checkbox"></td><td>${esc(l.name)}</td><td>${esc(l.tags)}</td><td><button class="icon-a" title="Attribute" onclick="toast('Attribute saved on ${esc(l.name)}')">◎</button></td><td>
          <button class="icon-a" onclick="renameLift('${l.id}')">✎</button>
          <button class="icon-a" onclick="state.lifts=state.lifts.filter(x=>x.id!=='${l.id}');render()">🗑</button>
        </td></tr>`).join("")}
      </table>
    </div>
  </section>`;
}
function renameLift(id) {
  const lift = state.lifts.find((l) => l.id === id);
  const name = prompt("Rename", lift.name);
  if (name) { lift.name = name; render(); }
}

function amsView() {
  const cards = [
    ["Wearables Dashboard", "Quickly review biometric data collected by wearable devices"],
    ["Load Monitoring Dashboard", "Compare athlete weight-room load to questionnaire responses"],
    ["KPI Tracker", "Share athlete workout data with outside stakeholders"],
    ["Body Heatmap", "Monitor athletes experiencing any pain or soreness"],
    ["Habit Tracker", "Create, assign, and monitor habits for users"],
    ["Volume Tracker", "View detailed exercise volume data for groups and individuals"]
  ];
  return `<section class="stage light-page">
    <div class="ams-hero"><h2>Fewer Clicks, More Coaching</h2><div class="badge-ams">That's wourkout AMS.</div></div>
    <div class="hint" style="margin-bottom:8px">Core subscription <button class="req" onclick="toast('Core subscription requested')">PURCHASE CORE SUBSCRIPTION</button></div>
    <div class="ams-grid">${cards.map(([t, d]) => `<article class="ams-card"><div class="chartfake"></div><div class="lock">🔒</div><strong>${t}</strong><p>${d}</p></article>`).join("")}</div>
    <h3>Add ons</h3>
    <div class="panel">Nutrition logging and parent reporting are available as add-ons. <button class="ghost" style="color:#222" onclick="toast('Add-on saved to the request')">Notify me</button></div>
  </section>`;
}
function dailyView() {
  const date = "2026-10-14";
  const cards = ATHLETES.map((a) => {
    const day = (state.calendars[a.id] || {})[date];
    return `<article class="card"><div class="who"><span class="dotav">${esc(a.name[0])}</span><strong>${esc(a.name)}</strong></div><div class="exname">${day ? esc(day.title || "Workout") : "No session"}</div><p>${day ? day.items.length + " exercises" : "Rest / unassigned"}</p><button class="comment" onclick="state.entryAthlete='${a.id}';state.entryDate='${date}';goTool('entry')">Open entry</button></article>`;
  }).join("");
  return `<section class="stage light-page"><h1>Daily Brief</h1><p class="hint">Wednesday, October 14, 2026</p><div class="grid-cards">${cards}</div></section>`;
}
function weightroomView() {
  return `<section class="stage light-page"><h1>Weightroom</h1><p class="hint">Who is on the floor today</p><div class="grid-cards">${ATHLETES.slice(0, 4).map((a) => `<article class="card"><strong>${esc(a.name)}</strong><div class="hint">Logging · Week 5</div><button class="comment" onclick="state.entryAthlete='${a.id}';goTool('entry')">Open</button></article>`).join("")}</div></section>`;
}
function boardView() {
  const day = ensureDay(state.entryDate, "eric");
  return `<section class="stage light-page"><h1>Whiteboard</h1><p>${fmtLong(state.entryDate)} · Eric Van Zeumeren</p><div class="panel" style="font-size:22px">${day.items.map((it) => `<div>${esc(it.letter || "")} ${esc(it.name)} <span class="hint">${esc(scriptLine(it))}</span></div>`).join("") || "Nothing programmed"}</div></section>`;
}
function maxesView() {
  const rows = state.prs[state.athleteId] || (state.prs[state.athleteId] = []);
  return `<section class="stage light-page"><h1>Maxes / PRs · ${esc(athlete().name)}</h1>
    <table class="data"><tr><th>Lift</th><th>Kg</th></tr>${rows.map((r, i) => `<tr><td>${esc(r[0])}</td><td><input class="plain" value="${esc(r[1])}" onchange="state.prs['${state.athleteId}'][${i}][1]=this.value"></td></tr>`).join("")}</table>
    <button class="req" style="margin-top:8px" onclick="const n=prompt('Lift'); if(n){state.prs['${state.athleteId}'].push([n,'']);render()}">+ PR</button></section>`;
}
function boardLeader() {
  const scores = ATHLETES.map((a) => {
    let t = 0;
    Object.entries(state.logs).forEach(([k, log]) => {
      if (!k.startsWith(a.id + ":")) return;
      Object.values(log.cells || {}).forEach((c) => { if (c.done) t += (+c.r || 0) * (+c.w || 0); });
    });
    return [a.name, t];
  }).sort((a, b) => b[1] - a[1]);
  return `<section class="stage light-page"><h1>Leaderboard</h1><table class="data"><tr><th>#</th><th>Athlete</th><th>Tonnage</th></tr>${scores.map((s, i) => `<tr><td>${i + 1}</td><td>${esc(s[0])}</td><td>${s[1]}</td></tr>`).join("")}</table></section>`;
}
function evalView() {
  return `<section class="stage light-page"><h1>Evaluations</h1>${state.evals.map((e) => `<article class="card">${esc(e)}</article>`).join("") || '<div class="empty">No evaluations yet</div>'}<button class="req" onclick="const n=prompt('Evaluation note'); if(n){state.evals.push(n);render()}">+ Evaluation</button></section>`;
}
function calendarsView() {
  return `<section class="stage light-page"><h1>Manage Calendars</h1><div class="grid-cards">${ATHLETES.map((a) => `<article class="card"><strong>${esc(a.name)}</strong><div class="hint">${Object.keys(state.calendars[a.id] || {}).length} programmed days</div><button class="comment" onclick="state.athleteId='${a.id}';state.view='build';render()">Open calendar</button></article>`).join("")}</div></section>`;
}
function simpleList(title, list, kind) {
  return `<section class="stage light-page"><h1>${title}</h1><div class="grid-cards">${list.map((x, i) => `<article class="card">${esc(x)} <button class="comment" onclick="this.closest('article'); state.${kind === "goal" ? "goals" : "packets"}.splice(${i},1);render()">Remove</button></article>`).join("")}</div><button class="req" onclick="addNamed('${kind}')">+ Add</button></section>`;
}
function docsView() {
  return `<section class="stage light-page"><h1>Documents & Links</h1>${state.docs.map((d, i) => `<article class="card"><a href="${esc(d.url)}" target="_blank">${esc(d.name)}</a> <button class="comment" onclick="state.docs.splice(${i},1);render()">Remove</button></article>`).join("")}<button class="req" onclick="const n=prompt('Name'); const u=prompt('URL'); if(n){state.docs.push({name:n,url:u||'#'});render()}">+ Link</button></section>`;
}
function attendanceView() {
  const date = state.entryDate;
  return `<section class="stage light-page"><h1>Attendance</h1><input class="plain" type="date" value="${date}" onchange="state.entryDate=this.value;render()"><div class="grid-cards">${ATHLETES.map((a) => {
    const key = date + ":" + a.id;
    return `<label class="card chk"><input type="checkbox" ${state.attendance[key] ? "checked" : ""} onchange="state.attendance['${key}']=this.checked"> ${esc(a.name)}</label>`;
  }).join("")}</div></section>`;
}
function reportingView() {
  const days = Object.values(cal());
  const items = days.reduce((n, d) => n + d.items.length, 0);
  return `<section class="stage light-page"><h1>Reporting</h1><div class="kpis"><div class="kpi"><b>${days.length}</b><span>Programmed days</span></div><div class="kpi"><b>${items}</b><span>Exercises on this calendar</span></div><div class="kpi"><b>${state.athletes.length}</b><span>Athletes</span></div><div class="kpi"><b>${Object.keys(state.logs).length}</b><span>Logged sessions</span></div></div></section>`;
}
function paymentsView() {
  return `<section class="stage light-page"><h1>Payments</h1>${state.invoices.map((inv) => `<article class="card">${esc(inv)}</article>`).join("") || "<p>No invoices</p>"}<button class="req" onclick="state.invoices.push('Invoice '+ (state.invoices.length+1) +' · $120');render()">+ Invoice</button></section>`;
}

function modalHtml() {
  const m = state.modal;
  if (!m) return "";
  if (m.type === "delete") {
    return `<div class="modal-back" onclick="state.modal=null;render()"><div class="modal" onclick="event.stopPropagation()"><h3>You are about to delete (${m.ids.length}) workout item${m.ids.length > 1 ? "s" : ""}</h3><button class="full red" onclick="confirmDelete()">DELETE</button><button class="full" onclick="state.modal=null;render()">CANCEL</button></div></div>`;
  }
  if (m.type === "info") {
    return `<div class="modal-back"><div class="modal" onclick="event.stopPropagation()"><div class="split"><h3>${esc(findItem(m.date, m.id).name)}</h3><span>${fmtLong(m.date)}</span></div><div>Additional Info</div><div class="sub">This will appear for only this assignment (Limit 255 Characters)</div><textarea data-focus="info" maxlength="255" oninput="state.modal.text=this.value">${esc(m.text)}</textarea><button class="full primary" onclick="saveInfo()">SAVE</button><button class="full" onclick="state.modal=null;render()">CANCEL</button></div></div>`;
  }
  if (m.type === "detail") {
    return `<div class="modal-back"><div class="modal"><h3>Description</h3><textarea data-focus="detail" oninput="state.modal.text=this.value">${esc(m.text)}</textarea><button class="full primary" onclick="findItem(state.modal.date, state.modal.id).detail=state.modal.text;state.modal=null;render()">SAVE</button><button class="full" onclick="state.modal=null;render()">CANCEL</button></div></div>`;
  }
  if (m.type === "copy") {
    return `<div class="modal-back"><div class="modal" onclick="event.stopPropagation()"><div class="split"><h3>${m.mode === "move" ? "Move" : "Copy"}</h3><button class="iconbtn" onclick="state.modal=null;render()">✕</button></div>
      <div class="sub">${m.ids.length} workout items selected</div>
      <div>To calendar</div>
      <div class="row"><select class="ghost"><option>${esc(athlete().name)}</option></select><button class="ghost" onclick="toast('One calendar in this prototype')">+ Add calendars</button></div>
      <div>Paste on</div>
      <div class="row"><button class="pill ${!m.range ? "on" : ""}" onclick="state.modal.range=false;render()">Single date</button><button class="pill ${m.range ? "on" : ""}" onclick="state.modal.range=true;render()">Date range</button></div>
      <input class="field" type="date" value="${m.target}" onchange="state.modal.target=this.value">
      ${m.range ? `<input class="field" type="date" value="${m.rangeEnd}" onchange="state.modal.rangeEnd=this.value" style="margin-top:6px">` : ""}
      <div style="margin-top:8px">Options · Include</div>
      <label class="chk"><input type="checkbox" ${m.includeLoads ? "checked" : ""} onchange="state.modal.includeLoads=this.checked"> Prescribed loads</label>
      <label class="chk"><input type="checkbox" ${m.includeTitles ? "checked" : ""} onchange="state.modal.includeTitles=this.checked"> Workout titles and colors</label>
      <div>Placement · Existing workouts</div>
      <label class="chk"><input type="radio" name="pl" ${m.placement === "bottom" ? "checked" : ""} onchange="state.modal.placement='bottom'"> Bottom of workout</label>
      <label class="chk"><input type="radio" name="pl" ${m.placement === "clear" ? "checked" : ""} onchange="state.modal.placement='clear'"> Clear existing workouts</label>
      <button class="full primary" onclick="applyCopy()">${m.mode === "move" ? "Move" : "Copy"} to ${m.range ? "range" : "1 day"}</button>
      <button class="full" onclick="state.modal=null;render()">Cancel</button>
    </div></div>`;
  }
  if (m.type === "clear") {
    return `<div class="modal-back"><div class="modal"><h3>Clear all workout items on ${fmtDay(m.date)}?</h3><button class="full red" onclick="snapshot();ensureDay('${m.date}').items=[];state.modal=null;render()">CLEAR</button><button class="full" onclick="state.modal=null;render()">CANCEL</button></div></div>`;
  }
  if (m.type === "share") {
    const link = location.origin + "/?day=" + m.date + "&athlete=" + state.athleteId;
    return `<div class="modal-back"><div class="modal"><h3>Share Workout</h3><input class="field" value="${esc(link)}" readonly><button class="full primary" onclick="navigator.clipboard.writeText('${link}');toast('Link copied')">Copy link</button><button class="full" onclick="state.modal=null;render()">Close</button></div></div>`;
  }
  if (m.type === "comment") {
    return `<div class="modal-back"><div class="modal"><h3>Add a Comment</h3><textarea data-focus="cmt" oninput="state.modal.text=this.value">${esc(m.text)}</textarea><button class="full primary" onclick="state.comments[${m.i}]=state.modal.text;state.modal=null;toast('Comment added');render()">SAVE</button><button class="full" onclick="state.modal=null;render()">CANCEL</button></div></div>`;
  }
  if (m.type === "request") {
    return `<div class="modal-back"><div class="modal"><h3>Request a program</h3><textarea data-focus="req" placeholder="Who is it for, and which weeks?" oninput="state.requestNote=this.value"></textarea><button class="full red" onclick="toast('Program request sent');state.modal=null;render()">SEND</button><button class="full" onclick="state.modal=null;render()">CANCEL</button></div></div>`;
  }
  if (m.type === "create") {
    return `<div class="modal-back"><div class="modal"><h3>Create New Exercise</h3><input class="field" data-focus="new-ex" placeholder="Exercise name" oninput="state.modal.name=this.value"><button class="full primary" onclick="const n=(state.modal.name||'').trim(); if(!n)return; CATALOG.push({name:n,type:'lift'}); state.lifts.push({id:uid(),name:n,type:'Lifts',tags:'N/A'}); addItem(state.modal.date, fromCatalog({name:n,type:'lift'})); state.modal=null;">CREATE</button><button class="full" onclick="state.modal=null;render()">CANCEL</button></div></div>`;
  }
  if (m.type === "user") {
    const r = m.row;
    return `<div class="modal-back"><div class="modal"><h3>Edit user</h3><input class="field" value="${esc(r.first)}" oninput="state.modal.row.first=this.value"><input class="field" value="${esc(r.last)}" oninput="state.modal.row.last=this.value" style="margin-top:6px"><input class="field" value="${esc(r.email)}" oninput="state.modal.row.email=this.value" style="margin-top:6px"><button class="full primary" onclick="state.modal=null;render()">SAVE</button></div></div>`;
  }
  if (m.type === "journal") {
    return `<div class="modal-back"><div class="modal"><h3>Journal entry</h3><input class="field" placeholder="Title" data-focus="jtitle" oninput="state.modal.title=this.value"><textarea data-focus="jbody" oninput="state.modal.body=this.value"></textarea><button class="full primary" onclick="state.journal.unshift({title:state.modal.title||'Note', body:state.modal.body||'', date: fmtLong('2026-10-14')}); state.feedMode='journal'; state.modal=null; render()">SAVE</button><button class="full" onclick="state.modal=null;render()">CANCEL</button></div></div>`;
  }
  if (m.type === "adduser") {
    return `<div class="modal-back"><div class="modal"><h3>Add user</h3><input class="field" placeholder="First" oninput="state.modal.first=this.value"><input class="field" placeholder="Last" oninput="state.modal.last=this.value" style="margin-top:6px"><input class="field" placeholder="Email" oninput="state.modal.email=this.value" style="margin-top:6px"><button class="full primary" onclick="state.athletes.push({id:uid(), first:state.modal.first||'New', last:state.modal.last||'Athlete', email:state.modal.email||'', activity:'N/A', groups:'Eric\\'s Athletes', cals:'All'}); state.userTab='athletes'; state.modal=null; render()">ADD</button></div></div>`;
  }
  return "";
}
function saveInfo() {
  const m = state.modal;
  const it = findItem(m.date, m.id);
  snapshot();
  it.note = (m.text || "").slice(0, 255);
  state.modal = null;
  render();
}
function fabHtml() {
  if (state.view === "build") return "";
  return `<button class="fab" onclick="onFab()">+</button>`;
}
function onFab() {
  if (state.view === "feed" && state.feedMode === "journal") { state.modal = { type: "journal" }; render(); return; }
  if (state.view === "feed" && state.feedMode === "team") { state.compose = true; render(); return; }
  if (state.view === "feed") { state.feedMode = "team"; state.compose = true; render(); return; }
  if (state.view === "users") { state.modal = { type: "adduser" }; render(); return; }
  if (state.view === "exercises") {
    const name = prompt("New lift name");
    if (name) { state.lifts.push({ id: uid(), name, type: state.managing, tags: "N/A" }); render(); }
    return;
  }
  if (state.view === "journal") { state.modal = { type: "journal" }; render(); return; }
  state.modal = { type: "journal" };
  state.view = "feed";
  state.feedMode = "journal";
  render();
}

document.addEventListener("click", (ev) => {
  if (ev.target.closest(".menu, .pop, .modal, .nav-anchor, .group-pop")) return;
  let changed = false;
  if (state.navMenu) { state.navMenu = null; changed = true; }
  if (state.dayMenu || state.recurMenu || state.propMenu || state.letterMenu || state.optionsMenu || state.colorMenu || state.searchDay) {
    state.dayMenu = state.recurMenu = state.colorMenu = state.searchDay = null;
    state.propMenu = state.letterMenu = state.optionsMenu = false;
    changed = true;
  }
  if (state.teamFilter) { state.teamFilter = false; changed = true; }
  if (changed) render();
});
document.addEventListener("keydown", (ev) => {
  const tag = (ev.target.tagName || "").toLowerCase();
  const typing = tag === "input" || tag === "textarea" || tag === "select";
  if ((ev.metaKey || ev.ctrlKey) && ev.key.toLowerCase() === "z") { ev.preventDefault(); undo(); return; }
  if (state.editor && ev.shiftKey && ev.key.toLowerCase() === "i") { ev.preventDefault(); openInfo(state.editor.day, state.editor.id); return; }
  if (state.editor && (ev.metaKey || ev.ctrlKey) && ev.key.toLowerCase() === "p") {
    ev.preventDefault();
    state.propMenu = !state.propMenu;
    render();
    return;
  }
  if (state.searchDay && ev.shiftKey && ev.key === "Enter") { ev.preventDefault(); createExercise(state.searchDay); return; }
  if (typing) return;
  if ((ev.metaKey || ev.ctrlKey) && ev.key.toLowerCase() === "c") {
    const date = state.focusDay;
    const ids = ensureDay(date).items.filter((it) => it.selected);
    if (!ids.length) return;
    state.clipboard = { from: date, items: ids.map((it) => JSON.parse(JSON.stringify(it))), mode: "copy" };
    toast(ids.length + " items copied");
    render();
  }
  if ((ev.metaKey || ev.ctrlKey) && ev.key.toLowerCase() === "v" && state.clipboard) {
    pasteOn(state.hoverDay || state.focusDay);
  }
});

window.go = go;
window.goTool = goTool;
window.toggleNav = toggleNav;
window.openRequest = openRequest;
window.switchAthlete = switchAthlete;
window.shiftWeek = shiftWeek;
window.jumpToday = jumpToday;
window.undo = undo;
window.openSearch = openSearch;
window.addFromCatalog = addFromCatalog;
window.createExercise = createExercise;
window.openEditor = openEditor;
window.setLetter = setLetter;
window.changeSets = changeSets;
window.addProp = addProp;
window.setCell = setCell;
window.setField = setField;
window.setRestSeconds = setRestSeconds;
window.toggleFlag = toggleFlag;
window.itRequire = itRequire;
window.cycleSuperset = cycleSuperset;
window.duplicateItem = duplicateItem;
window.editDetail = editDetail;
window.openInfo = openInfo;
window.renameDay = renameDay;
window.openDayMenu = openDayMenu;
window.openRecur = openRecur;
window.setRecur = setRecur;
window.setColor = setColor;
window.saveDay = saveDay;
window.saveFocused = saveFocused;
window.openAsAthlete = openAsAthlete;
window.backToCoach = backToCoach;
window.openAthleteWorkout = openAthleteWorkout;
window.logAthleteSet = logAthleteSet;
window.shareDay = shareDay;
window.clearTitle = clearTitle;
window.resetOrder = resetOrder;
window.clearItems = clearItems;
window.toggleAll = toggleAll;
window.toggleItem = toggleItem;
window.askDelete = askDelete;
window.doDelete = doDelete;
window.openCopy = openCopy;
window.applyCopy = applyCopy;
window.pasteOn = pasteOn;
window.dragStart = dragStart;
window.dragOver = dragOver;
window.dropOn = dropOn;
window.openPreview = openPreview;
window.stepPreview = stepPreview;
window.completeItem = completeItem;
window.pickAthlete = pickAthlete;
window.logCell = logCell;
window.logCheck = logCheck;
window.markDone = markDone;
window.setFeedMode = setFeedMode;
window.commentOn = commentOn;
window.publishPost = publishPost;
window.importUsers = importUsers;
window.exportData = exportData;
window.removeUser = removeUser;
window.editUser = editUser;
window.addNamed = addNamed;
window.renameLift = renameLift;
window.saveInfo = saveInfo;
window.onFab = onFab;
window.addItem = addItem;
window.snapshot = snapshot;
window.toast = toast;

render();
