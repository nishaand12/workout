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
    items: extra.items || [],
    savedFor: extra.savedFor || null,
    savedWorkoutId: extra.savedWorkoutId || null,
    assignmentId: extra.assignmentId || null
  };
}

const APP_TODAY = "2026-10-15";

function weekName(date) {
  const start = sundayOf(date);
  const map = { "2026-09-27": "Week 3", "2026-10-04": "Week 4", "2026-10-11": "Week 5", "2026-10-18": "Week 6", "2026-10-25": "Week 7" };
  if (map[start]) return map[start];
  const anchor = new Date("2026-10-11T12:00:00");
  const diff = Math.round((new Date(start + "T12:00:00") - anchor) / (7 * 86400000));
  return "Week " + (5 + diff);
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
    cal[date] = blankDay(date, { title, recurring, items, savedFor: "eric" });
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
    savedFor: "leah",
    items: [lift("DB Bicep Curl", "A", 3, 10), lift("Push Up", "B", 3, 12), lift("Sit Up and Reach", "C", 3, 10)]
  });
  cal["2026-10-01"] = blankDay("2026-10-01", { title: "Push", savedFor: "leah", items: [lift("Push Up", "A", 4, 10)] });
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
  reports: [],
  serverExercises: [],
  serverRecords: [],
  toolForm: {},
  recurPick: 4,
  evals: [],
  prs: {
    eric: [["Back Squat", "180"], ["Power Clean", "100"], ["Front Squat", "150"], ["Bench Press", "110"]]
  },
  teamMode: "feed",
  teamGroup: "",
  teamFilter: false,
  compose: false,
  startedAt: null,
  role: "coach",
  actingAthlete: null,
  serverUserId: null,
  selectedGoalAthlete: "all",
  serverUsers: {},
  athleteAssignments: [],
  athleteWorkouts: {},
  athleteOpenDate: null,
  openWorkout: null,
  openSession: null,
  auth: {
    isAuthenticated: false,
    user: null,
    token: localStorage.getItem("wourkout_token") || null,
    mode: "login",
    loading: false,
    error: "",
    success: "",
    resetToken: null,
    roleChoice: "athlete",
    config: { supabase_url: "", supabase_anon_key: "", google_auth_enabled: false }
  },
  gymContext: null,
  mySchedule: [],
  notesByWorkout: {},
  assignResult: "",
  roleError: ""
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
  render();
  toast._t = setTimeout(() => { state.toast = ""; render(); }, 2200);
}
function dismissToast() {
  state.toast = "";
  clearTimeout(toast._t);
}
function selectedItems(date) {
  return ensureDay(date).items.filter((it) => it.selected);
}

function scriptLine(it) {
  if (it.type === "questionnaire") return it.questions.length + " items";
  if (it.type === "break") return "Divider";
  if (it.type === "video") return it.videoUrl || "Video";
  if (it.type === "rest") return (it.reps[0] || 60) + "s";
  const reps = (it.reps || []).slice(0, it.sets || 1);
  const loads = (it.loads || []).slice(0, it.sets || 1);
  const rests = (it.rests || []).slice(0, it.sets || 1);
  const rep0 = reps[0] || 1;
  const same = reps.every((r) => String(r) === String(rep0));
  const vol = same ? (it.sets || reps.length || 1) + " x " + rep0 : reps.join(", ");
  const loadTxt = loads.some((x) => x !== "" && x != null) ? " · " + loads.map((x) => (x === "" || x == null ? "—" : x + "kg")).join("/") : "";
  const restTxt = rests.some((x) => x !== "" && x != null) ? " · rest " + rests.map((x) => x || "—").join("/") + "s" : "";
  if (it.type === "circuit") {
    const first = (it.detail || "Complete 1 round").split("\n")[0];
    return vol + restTxt + " · " + first;
  }
  return vol + loadTxt + restTxt + (it.note ? " · " + it.note : "");
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
  const root = document.getElementById("app");
  if (!root) return;
  if (!state.auth || !state.auth.isAuthenticated) {
    root.className = "";
    root.innerHTML = renderLoginGate() + (state.toast ? `<div class="toast">${esc(state.toast)}</div>` : "");
    return;
  }
  if (state.auth.user && state.auth.user.needs_onboarding) {
    root.className = "";
    root.innerHTML = renderCodeGate() + (state.toast ? `<div class="toast">${esc(state.toast)}</div>` : "");
    return;
  }
  const light = state.view !== "build" && state.view !== "mine";
  root.className = light ? "light" : "";
  const active = document.activeElement;
  const focusId = active && active.dataset ? active.dataset.focus : null;
  const sel = active && active.selectionStart;
  const toastHtml = state.toast ? `<div class="toast">${esc(state.toast)}</div>` : "";
  root.innerHTML = nav() + '<div class="shell">' + body() + rightRail() + "</div>" + toastHtml + modalHtml() + fabHtml();
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

function heldRoles(user) {
  if (user && Array.isArray(user.roles) && user.roles.length) return user.roles;
  const role = !user || !user.role ? "athlete" : (user.role === "student" ? "athlete" : user.role);
  return [role];
}
function land(user) {
  state.auth.user = user;
  state.serverUserId = user.id;
  const roles = heldRoles(user);
  const requested = user.role === "student" ? "athlete" : (user.role || roles[0]);
  state.role = roles.includes(requested) ? requested : roles[0];
  state.roleError = "";
  if (user.needs_onboarding) {
    state.view = "join";
    return;
  }
  if (state.role === "admin") state.view = "admin";
  else if (state.role === "coach") state.view = "squad";
  else {
    state.view = "mine";
    state.actingAthlete = user.username || "me";
    state.athleteId = user.username || "me";
    state.openWorkout = null;
    state.athleteOpenDate = null;
  }
}
async function enterApp(data) {
  if (data.access_token) {
    localStorage.setItem("wourkout_token", data.access_token);
    state.auth.token = data.access_token;
  }
  state.auth.isAuthenticated = true;
  land(data.user || data);
  if (state.auth.user.needs_onboarding) return;
  if (state.role === "athlete") await loadMySchedule();
  else await loadGymContext();
}
async function loadGymContext() {
  state.gymContext = await api("GET", "/api/gym/context");
}
async function loadMySchedule() {
  const rows = await api("GET", "/api/my/schedule");
  state.mySchedule = rows;
  state.athleteAssignments = rows;
  state.athleteWorkouts = {};
  state.notesByWorkout = {};
  for (const row of rows) {
    state.notesByWorkout[row.workout_id] = row.athlete_note || "";
    if (!state.athleteWorkouts[row.scheduled_date]) {
      state.athleteWorkouts[row.scheduled_date] = await api("GET", "/api/workouts/" + row.workout_id);
    }
  }
}
function ownAthleteSession() {
  const user = state.auth && state.auth.user;
  return !!(user && state.role === "athlete" && state.serverUserId === user.id && heldRoles(user).includes("athlete"));
}

function nav() {
  const isAthlete = state.role === "athlete";
  const item = (id, label, caret) => `<div class="nav-anchor"><button class="navbtn ${state.view === id || (id === "feed" && (state.view === "feed" || state.view === "journal")) ? "active" : ""}" onclick="go('${id}', event)">${label}${caret ? ' <span class="caret">▼</span>' : ""}</button>${menuFor(id)}</div>`;
  
  const user = state.auth && state.auth.user;
  const displayName = user ? (user.name || user.username) : (isAthlete ? "Athlete" : "Coach");
  const initial = (displayName[0] || "U").toUpperCase();
  const roleClass = state.role || "athlete";
  const avatarBg = roleClass === "athlete" ? "#22c55e" : roleClass === "admin" ? "#ef4444" : "#3b82f6";

  const athleteNav = `${item("mine", "MY SCHEDULE")}`;

  const coachNav = `
    ${item("squad", "ATHLETES")}
    ${item("build", "BUILD")}
    ${item("workout", "WORKOUT TOOLS", true)}
    ${item("coach", "COACH TOOLS", true)}
  `;
  const adminNav = `${item("admin", "COACHES")}`;
  const links = isAthlete ? athleteNav : (state.role === "admin" ? adminNav : coachNav);
  const home = isAthlete ? "mine" : (state.role === "admin" ? "admin" : "squad");

  return `<header class="topnav">
    <div class="wordmark" onclick="go('${home}')">w<span>ourkout</span></div>
    <span class="view-pill ${esc(state.role || "athlete")}">${esc((state.role || "athlete").toUpperCase())} VIEW</span>
    ${links}
    <div class="spacer"></div>
    ${heldRoles(user).length > 1 ? `<div class="role-switch">${heldRoles(user).map((r) => `<button type="button" class="${state.role === r ? "on" : ""}" onclick="switchRole('${r}')">${esc(r)}</button>`).join("")}</div>` : ""}
    <div class="nav-profile">
      <div class="nav-avatar" style="background:${avatarBg}">${initial}</div>
      <div class="nav-user-info">
        <span class="nav-user-name">${esc(displayName)}</span>
        <span class="role-badge ${roleClass}">${esc(roleClass.toUpperCase())}</span>
      </div>
      <button class="nav-logout-btn" onclick="handleLogout()">Log out</button>
    </div>
  </header>`;
}
function menuFor(id) {
  if (state.navMenu !== id) return "";
  if (id === "workout") {
    const list = state.role === "athlete"
      ? [["weightroom", "WEIGHTROOM VIEW"], ["whiteboard", "WHITEBOARD"], ["maxes", "MAXES / PRS"], ["journal", "JOURNAL"], ["leaderboard", "LEADERBOARD"], ["evaluations", "EVALUATIONS"]]
      : [["weightroom", "WEIGHTROOM VIEW"], ["whiteboard", "WHITEBOARD"], ["entry", "WORKOUT ENTRY"], ["maxes", "MAXES / PRS"], ["journal", "JOURNAL"], ["leaderboard", "LEADERBOARD"], ["evaluations", "EVALUATIONS"]];
    return `<div class="menu" style="top:40px">${list.map(([v, l]) => `<button onclick="goTool('${v}')">${l}</button>`).join("")}</div>`;
  }
  if (id === "coach") {
    return `<div class="menu" style="top:40px">${[
      ["users", "MANAGE USERS"], ["calendars", "MANAGE CALENDARS"], ["build", "THE PLANNER"],
      ["exercises", "EXERCISES"], ["goals", "GOALS"], ["documents", "DOCUMENTS & LINKS"],
      ["packets", "PACKETS & SHEETS"], ["attendance", "ATTENDANCE"], ["reporting", "REPORTING"], ["payments", "PAYMENTS"]
    ].map(([v, l]) => `<button onclick="goTool('${v}')">${l}</button>`).join("")}</div>`;
  }
  if (id === "account") {
    const who = state.role === "athlete" ? (ATHLETES.find((a) => a.id === state.actingAthlete) || {}).name : "Coach";
    return `<div class="menu" style="top:40px;right:0;max-height:70vh;overflow:auto">
      <div class="help">Signed in as ${esc(who)}</div>
      <button onclick="backToCoach()">Coach calendar</button>
      ${ATHLETES.map((a) => `<button onclick="openAsAthlete('${a.id}')">${esc(a.name)}</button>`).join("")}
      <button onclick="handleLogout()" style="color:#ef4444;font-weight:700">Log out</button>
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
  if (view === "users" || view === "calendars") loadRoster();
  if (view === "exercises") loadExercises();
  if (view === "goals") loadGoals();
  if (view === "reporting" || view === "attendance") loadCompliance();
}

function rightRail() {
  if (state.role === "athlete" || state.role === "admin" || state.view === "squad" || state.view === "admin") return "";
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
    case "admin": return adminView();
    case "squad": return squadView();
    case "entry": return entryView();
    case "feed": return feedView();
    case "users": return usersView();
    case "exercises": return liftsView();
    case "daily": return dailyView();
    case "weightroom": return weightroomView();
    case "whiteboard": return boardView();
    case "maxes": return maxesView();
    case "leaderboard": return boardLeader();
    case "evaluations": return evalView();
    case "calendars": return calendarsView();
    case "goals": return goalsView();
    case "documents": return docsView();
    case "packets": return packetsView();
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
function jumpToday() { state.weekStart = sundayOf(APP_TODAY); state.focusDay = APP_TODAY; render(); }

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
  const recurLabel = day.recurWeeks ? `Recurring · ${day.recurWeeks}w ▾` : (day.recurring ? `Recurring (${day.recurring}) ▾` : "Not recurring ▾");
  const header = sel.length
    ? `<button class="recur" style="background:#2457c5">Selected (${sel.length})</button>
       <button class="iconbtn" title="Copy" onclick="openCopy('${date}','copy')">⧉</button>
       <button class="iconbtn" title="Move" onclick="openCopy('${date}','move')">→</button>
       <button class="iconbtn" title="Delete" onclick="askDelete('${date}')">🗑</button>`
    : `<button class="recur" onclick="openRecur('${date}', event)">${recurLabel}</button>`;
  return `<div class="day ${focused}" data-day="${date}" style="border-left:3px solid ${day.color || "#3b82f6"}" onmouseenter="state.hoverDay='${date}'" onclick="state.focusDay='${date}';render()">
    <div class="day-top"><span>${fmtDay(date)}</span>
      <span class="tools">
        <button class="iconbtn" title="Copy Workout" onclick="openCopy('${date}','workout')">⧉</button>
        <button class="iconbtn" title="Workout menu" onclick="openDayMenu('${date}', event)">⋯</button>
      </span>
    </div>
    <div class="week-label">${esc(day.weekLabel || "")}</div>
    <button type="button" class="day-title ${day.title ? "" : "placeholder"}" onclick="editWorkoutDay('${date}', event)">${esc(day.title || "Add Workout Name")}</button>
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
  state.editor = null;
  state.focusDay = date;
  refreshFutureCopies(date);
  noteHist("Added " + it.name);
  openEditor(date, it.id);
}

function openEditor(date, id, ev) {
  if (ev) ev.stopPropagation();
  const it = findItem(date, id);
  if (!it) return;
  state.focusDay = date;
  state.searchDay = null;
  state.editor = null;
  state.propMenu = false;
  openEdit({
    title: "Edit workout",
    date,
    id,
    fields: workoutItemFields(it),
    onSave: (values) => saveWorkoutItem(date, id, values)
  });
}
function workoutItemFields(it) {
  const fields = [{ key: "name", label: "Exercise name", value: it.name || "" }];
  if (it.type === "break") return fields;
  if (it.type === "video") {
    fields.push({ key: "videoUrl", label: "Video URL", value: it.videoUrl || "" });
    return fields;
  }
  if (it.type === "rest") {
    fields.push({ key: "seconds", label: "Seconds", value: String((it.reps && it.reps[0]) || 60) });
    return fields;
  }
  if (it.type === "questionnaire") {
    fields.push({ key: "questions", label: "Questions", value: (it.questions || []).join("\n"), multiline: true });
    return fields;
  }
  if (it.type === "circuit") {
    fields.push({ key: "stations", label: "Stations", value: it.detail || "", multiline: true });
    fields.push({ key: "sets", label: "Rounds", value: String(it.sets || 1) });
    fields.push({ key: "note", label: "Additional info", value: it.note || "", multiline: true, maxlength: 255 });
    return fields;
  }
  const n = Math.max(1, it.sets || 1);
  fields.push({ key: "sets", label: "Sets", value: String(n) });
  for (let i = 0; i < n; i++) {
    const which = n > 1 ? ", set " + (i + 1) : "";
    fields.push({ key: "reps-" + i, label: "Reps" + which, value: String((it.reps && it.reps[i]) ?? "") });
    fields.push({ key: "load-" + i, label: "Load (kg)" + which, value: String((it.loads && it.loads[i]) ?? "") });
  }
  fields.push({ key: "note", label: "Additional info", value: it.note || "", multiline: true, maxlength: 255 });
  return fields;
}
function saveWorkoutItem(date, id, values) {
  const it = findItem(date, id);
  if (!it) return;
  const name = (values.name || "").trim();
  if (!name) { toast("Name the exercise"); return; }
  snapshot();
  it.name = name;
  if (it.type === "video") {
    it.videoUrl = values.videoUrl || "";
  } else if (it.type === "rest") {
    const seconds = String(values.seconds || "60");
    it.reps = [seconds];
    it.note = seconds + "s";
  } else if (it.type === "questionnaire") {
    it.questions = String(values.questions || "").split("\n").map((line) => line.trim()).filter(Boolean);
  } else if (it.type === "circuit") {
    it.detail = values.stations || "";
    resizeSets(it, parseInt(values.sets, 10) || 1);
    it.note = String(values.note || "").slice(0, 255);
  } else if (it.type !== "break") {
    const sets = parseInt(values.sets, 10) || it.sets || 1;
    resizeSets(it, sets);
    for (let i = 0; i < it.sets; i++) {
      if (values["reps-" + i] != null) it.reps[i] = values["reps-" + i];
      if (values["load-" + i] != null) it.loads[i] = values["load-" + i];
    }
    it.note = String(values.note || "").slice(0, 255);
  }
  refreshFutureCopies(date);
  state.modal = null;
  toast("Workout saved");
}
function editorHead(date, it, day) {
  const index = day.items.findIndex((x) => x.id === it.id);
  return `<div class="editor-h">
      <span class="letter" style="background:${LETTER_COLOR[it.letter] || "#666"}">${esc(it.letter || "•")}</span>
      <input class="name-input" data-focus="exname-${it.id}" value="${esc(it.name)}" oninput="setField('${date}','${it.id}','name', this.value)" onchange="render()">
      <button class="iconbtn" title="Move up" onclick="moveItem('${date}','${it.id}',-1)">↑</button>
      <button class="iconbtn" title="Move down" onclick="moveItem('${date}','${it.id}',1)">↓</button>
      <button class="pill" onclick="state.letterMenu=!state.letterMenu;render()">${esc(letterCode(day, it))} ▾</button>
      <button class="iconbtn" onclick="state.editor=null;render()">✕</button>
    </div>
    ${state.letterMenu ? `<div class="pop" style="right:8px;top:36px;width:70px;padding:4px">${LETTERS.map((L) => `<button class="opt" onclick="setLetter('${date}','${it.id}','${L}')">${L}</button>`).join("")}<button class="opt" onclick="setLetter('${date}','${it.id}','')">–</button></div>` : ""}
    <div class="hint">${index + 1} of ${day.items.length} · same letter is one superset or circuit</div>
    ${it.note ? `<div class="note-line">${esc(it.note)}</div>` : ""}
    <button class="linkish" onclick="openInfo('${date}','${it.id}')">+ Add Additional Info (Shift + I)</button>`;
}
function workTable(date, it) {
  const keys = ["reps", "load", "rest"].concat((it.props || []).filter((k) => k !== "load" && k !== "rest"));
  const propRows = keys.map((p) => propRow(date, it, p)).join("");
  return `<table class="prop-table"><tr><th></th>${Array.from({ length: it.sets || 1 }, (_, i) => `<th>Set ${i + 1}</th>`).join("")}</tr>${propRows}</table>`;
}
function editorPop(date) {
  const it = findItem(date, state.editor.id);
  if (!it) return "";
  const day = ensureDay(date);
  const head = editorHead(date, it, day);
  if (it.type === "questionnaire") {
    return `<div class="editor" onclick="event.stopPropagation()">${head}
      ${it.questions.map((q, i) => `<div class="q">${i + 1}. ${esc(q)}</div>`).join("")}
      <label class="chk" style="color:#ddd"><input type="checkbox" ${it.requireResponse ? "checked" : ""} onchange="itRequire('${date}','${it.id}', this.checked)"> Require Response</label>
      <div class="hint">All questionnaire items must be fully completed before showing workout.</div>
    </div>`;
  }
  if (it.type === "circuit") {
    return `<div class="editor" onclick="event.stopPropagation()">${head}
      <div class="hint">Stations, one per line</div>
      <textarea data-focus="detail-${it.id}" oninput="setField('${date}','${it.id}','detail', this.value)" onchange="render()">${esc(it.detail || "")}</textarea>
      ${setRow(date, it, "Rounds")}
      ${workTable(date, it)}
      <div class="row">
        <button class="pill" onclick="cycleSuperset('${date}','${it.id}')">Group with letter</button>
        <button class="pill" onclick="state.optionsMenu=!state.optionsMenu;render()">Options ▾</button>
        <button class="pill ${it.completionOnly ? "on" : ""}" onclick="toggleFlag('${date}','${it.id}','completionOnly')">Completion Only</button>
      </div>
      ${optionsPop(date, it)}
    </div>`;
  }
  if (it.type === "break" || it.type === "video" || it.type === "rest") {
    return `<div class="editor" onclick="event.stopPropagation()">${head}
      ${it.type === "video" ? `<input data-focus="vid-${it.id}" placeholder="Video URL" value="${esc(it.videoUrl)}" oninput="setField('${date}','${it.id}','videoUrl', this.value)" onchange="render()">` : ""}
      ${it.type === "rest" ? `<div class="row">Seconds <input style="width:80px" data-focus="rest-${it.id}" value="${esc(it.reps[0] || 60)}" oninput="setRestSeconds('${date}','${it.id}', this.value)" onchange="render()"></div>` : ""}
    </div>`;
  }
  return `<div class="editor" onclick="event.stopPropagation()">${head}
    ${setRow(date, it, "Sets")}
    <button class="pill" onclick="state.propMenu=!state.propMenu;event.stopPropagation();render()">+ Add Property Ctrl+P</button>
    ${state.propMenu ? propMenu(date, it.id) : ""}
    ${workTable(date, it)}
    <div class="row">
      <button class="pill" onclick="cycleSuperset('${date}','${it.id}')">Group with letter</button>
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
  const opts = [["tempo", "Tempo"], ["velocity", "Velocity"], ["power", "Peak Power"], ["pct", "%1RM"]];
  return `<div class="pop" style="left:120px;top:78px;width:180px">${opts.map(([k, l]) => `<button class="opt" onclick="addProp('${date}','${id}','${k}')">${l}</button>`).join("")}</div>`;
}
function propRow(date, it, key) {
  const label = key === "reps" ? "Reps" : PROP_LABEL[key];
  const arr = key === "reps" ? it.reps : it[key === "load" ? "loads" : key === "rest" ? "rests" : key === "tempo" ? "tempos" : key === "velocity" ? "velocities" : key === "power" ? "powers" : "pcts"];
  if (!arr) return "";
  if (key === "reps" && it.trackReps === false && it.type !== "circuit") return "";
  const cells = arr.map((v, i) => `<td><input data-focus="${key}-${it.id}-${i}" value="${esc(v)}" oninput="setCell('${date}','${it.id}','${key}',${i}, this.value)" onchange="render()"></td>`).join("");
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
  refreshFutureCopies(date);
  render();
}
function changeSets(date, id, d) {
  snapshot();
  const it = findItem(date, id);
  resizeSets(it, (it.sets || 1) + d);
  refreshFutureCopies(date);
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
  if (!it[map[key]]) it[map[key]] = [];
  while (it[map[key]].length <= i) it[map[key]].push("");
  it[map[key]][i] = value;
  refreshFutureCopies(date);
}
function setField(date, id, key, value) {
  const it = findItem(date, id);
  if (!it) return;
  it[key] = value;
  refreshFutureCopies(date);
}
function setRestSeconds(date, id, value) {
  const it = findItem(date, id);
  it.reps[0] = value;
  it.note = value + "s";
  refreshFutureCopies(date);
}
function moveItem(date, id, dir) {
  snapshot();
  const day = ensureDay(date);
  const i = day.items.findIndex((it) => it.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= day.items.length) return;
  const [it] = day.items.splice(i, 1);
  day.items.splice(j, 0, it);
  refreshFutureCopies(date);
  noteHist("Reordered " + it.name);
  render();
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
  const it = findItem(date, id);
  if (!it) return;
  openEdit({
    title: "Edit description",
    date,
    id,
    fields: [{ key: "text", label: "Description", value: it.detail || "", multiline: true }],
    onSave: (values) => {
      it.detail = values.text || "";
      refreshFutureCopies(date);
      state.modal = null;
      render();
    }
  });
}
function openInfo(date, id) {
  const it = findItem(date, id);
  if (!it) return;
  openEdit({
    title: "Edit additional info",
    hint: "This will appear for only this assignment (Limit 255 Characters).",
    date,
    id,
    fields: [{ key: "text", label: "Additional info", value: it.note || "", multiline: true, maxlength: 255 }],
    onSave: () => saveInfo()
  });
}
function editWorkoutDay(date, ev) {
  if (ev) ev.stopPropagation();
  const day = ensureDay(date);
  openEdit({
    title: "Edit workout",
    fields: [{ key: "title", label: "Workout name", value: day.title || "" }],
    onSave: (values) => {
      renameDay(date, values.title || "");
      state.modal = null;
      render();
    }
  });
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
  if (state.recurMenu === date) state.recurMenu = null;
  else {
    state.recurMenu = date;
    state.recurPick = ensureDay(date).recurWeeks || 4;
  }
  render();
}
function recurMenu(date) {
  const day = ensureDay(date);
  const weeks = state.recurPick || day.recurWeeks || 4;
  const source = day.recurFrom || date;
  const end = addDays(source, weeks * 7);
  const status = day.recurWeeks
    ? `Repeats this weekday for ${day.recurWeeks} weeks, through ${fmtShort(addDays(source, day.recurWeeks * 7))}. Past days stay.`
    : "This workout does not copy forward yet.";
  return `<div class="pop" style="left:28px;top:78px;width:240px" onclick="event.stopPropagation()">
    <div class="hint" style="padding:4px 8px">${status}</div>
    <div class="row" style="padding:0 8px">
      <span>Weeks</span>
      <input data-focus="recur-weeks" type="number" min="1" max="8" value="${weeks}" style="width:64px" oninput="state.recurPick=Math.max(1, Math.min(8, parseInt(this.value, 10) || 1));render()">
    </div>
    <div class="hint" style="padding:0 8px 4px">Through ${fmtShort(end)}</div>
    <button class="opt" onclick="setRecur('${date}', state.recurPick || ${weeks})">Repeat for ${weeks} weeks</button>
    <button class="opt" onclick="setRecur('${date}', 0)">Stop future copies</button>
  </div>`;
}
function seriesSource(date) {
  const day = ensureDay(date);
  return day.recurFrom || date;
}
function clearFutureCopies(sourceDate) {
  const calendar = cal();
  const removed = [];
  Object.keys(calendar).forEach((d) => {
    const other = calendar[d];
    if (other && other.recurFrom === sourceDate && d !== sourceDate && d > APP_TODAY) {
      removed.push({ date: d, assignmentId: other.assignmentId, savedFor: other.savedFor });
      delete calendar[d];
    }
  });
  return removed;
}
function refreshFutureCopies(date) {
  const day = ensureDay(date);
  if (day.recurFrom && day.recurFrom !== date) return [];
  const sourceDate = date;
  const source = day;
  const weeks = source.recurWeeks || 0;
  if (!weeks) return [];
  const calendar = cal();
  const written = [];
  for (let i = 1; i <= weeks; i++) {
    const next = addDays(sourceDate, i * 7);
    if (next <= APP_TODAY) continue;
    const prev = calendar[next];
    const copy = JSON.parse(JSON.stringify(source));
    copy.date = next;
    copy.weekLabel = weekName(next);
    copy.items = source.items.map((it) => Object.assign(JSON.parse(JSON.stringify(it)), { id: uid(), selected: false }));
    copy.recurFrom = sourceDate;
    copy.recurWeeks = weeks;
    copy.recurring = weeks;
    copy.savedFor = source.savedFor || null;
    copy.savedWorkoutId = prev ? prev.savedWorkoutId : null;
    copy.assignmentId = prev ? prev.assignmentId : null;
    calendar[next] = copy;
    written.push(next);
  }
  Object.keys(calendar).forEach((d) => {
    const other = calendar[d];
    if (other && other.recurFrom === sourceDate && d !== sourceDate && d > APP_TODAY && written.indexOf(d) < 0) delete calendar[d];
  });
  return written;
}
async function unpublishDate(row) {
  if (!row) return;
  if (row.assignmentId) {
    await api("DELETE", "/api/assignments/" + row.assignmentId);
    return;
  }
  if (!row.savedFor) return;
  const person = ATHLETES.find((a) => a.id === row.savedFor);
  if (!person) return;
  const user = await ensureUser(person, "student");
  const existing = await api("GET", "/api/assignments?user_id=" + user.id + "&date=" + row.date);
  for (const item of existing) await api("DELETE", "/api/assignments/" + item.id);
}
async function setRecur(date, weeks) {
  snapshot();
  const sourceDate = seriesSource(date);
  const source = ensureDay(sourceDate);
  const removed = clearFutureCopies(sourceDate);
  weeks = Math.max(0, Math.min(8, parseInt(weeks, 10) || 0));
  state.recurMenu = null;
  if (!weeks) {
    source.recurring = 0;
    source.recurWeeks = 0;
    source.recurFrom = null;
    noteHist("Stopped recurring");
    toast("Future copies removed");
    render();
    for (const row of removed) {
      try { await unpublishDate(row); } catch (err) { console.error(err); }
    }
    return;
  }
  source.recurring = weeks;
  source.recurWeeks = weeks;
  source.recurFrom = sourceDate;
  const created = refreshFutureCopies(sourceDate);
  noteHist("Recurring for " + weeks + " weeks");
  toast(created.length ? "Repeats through " + fmtShort(created[created.length - 1]) : "No future weeks in that range");
  render();
  if (source.savedFor) {
    for (const d of created) {
      try { await publishDay(d, { quiet: true }); } catch (err) { console.error(err); }
    }
  }
  for (const row of removed) {
    if (created.indexOf(row.date) < 0) {
      try { await unpublishDate(row); } catch (err) { console.error(err); }
    }
  }
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
  const headers = {};
  if (body) headers["Content-Type"] = "application/json";
  if (state.auth && state.auth.token) {
    headers["Authorization"] = "Bearer " + state.auth.token;
  }
  const res = await fetch(url, {
    method,
    headers: Object.keys(headers).length ? headers : undefined,
    body: body ? JSON.stringify(body) : undefined
  });
  if (res.status === 401 && !url.includes("/api/auth/login") && !url.includes("/api/auth/register")) {
    handleLogout("Your session has expired. Please log in again.");
    throw new Error("Unauthorized");
  }
  if (!res.ok) {
    let errText = "";
    try {
      const errJson = await res.json();
      if (typeof errJson.detail === "string") {
        errText = errJson.detail;
      } else if (Array.isArray(errJson.detail)) {
        errText = errJson.detail.map((d) => (d && d.msg) ? d.msg : (typeof d === "object" ? JSON.stringify(d) : String(d))).join(", ");
      } else if (errJson.detail && typeof errJson.detail === "object") {
        errText = JSON.stringify(errJson.detail);
      } else if (errJson.message) {
        errText = errJson.message;
      } else {
        errText = JSON.stringify(errJson);
      }
    } catch (_) {
      errText = await res.text();
    }
    throw new Error(errText || String(res.status));
  }
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
async function publishDay(date, opts = {}) {
  const day = cal()[date];
  const person = athlete();
  if (!day || !day.items.length) { if (!opts.quiet) toast("Add an exercise before saving"); return; }
  try {
    if (!opts.quiet) toast("Saving for " + person.name + "…");
    const coach = await ensureUser({ id: "coach", name: "wourkout Coach", email: "coach@wourkout.app" }, "coach");
    const user = await ensureUser(person, "student");
    const exercises = [];
    for (const it of day.items) {
      if (!it.name || it.type === "break") continue;
      const ex = await ensureExercise(it.name);
      const sets = it.sets || 1;
      const reps = (it.reps || []).slice(0, sets);
      const loads = (it.loads || []).slice(0, sets);
      const rests = (it.rests || []).slice(0, sets);
      exercises.push({
        exercise_id: ex.id,
        superset_group: it.letter || "A",
        order_index: exercises.length,
        prescription_text: scriptLine(it).slice(0, 100),
        prescribed_sets: sets,
        target_reps: reps.join(",").slice(0, 50) || "1",
        target_weight: loads.join(",").slice(0, 50),
        rest_seconds: parseInt(rests.find((r) => r !== "" && r != null) || "0", 10) || 0,
        notes: [it.note, it.detail, "Rests:" + rests.join(",")].filter(Boolean).join("\n")
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
    state.athleteWorkouts[date] = workout;
    if (!opts.quiet && day.recurWeeks) {
      const copies = refreshFutureCopies(date);
      for (const copyDate of copies) {
        try { await publishDay(copyDate, { quiet: true }); } catch (err) { console.error(err); }
      }
    }
    noteHist("Saved " + fmtDay(date) + " for " + person.name);
    if (!opts.quiet) toast("Saved for " + person.name);
    render();
  } catch (err) {
    if (!opts.quiet) toast("Save failed: " + (err.message || "error"));
    console.error(err);
  }
}
function backToCoach() {
  state.role = (state.auth && state.auth.user && state.auth.user.role) || "coach";
  state.actingAthlete = null;
  state.view = "build";
  state.openWorkout = null;
  state.openSession = null;
  state.navMenu = null;
  if (state.auth && state.auth.user) {
    state.serverUserId = state.auth.user.id;
  }
  render();
}
async function openAsAthlete(localId) {
  const person = ATHLETES.find((a) => a.id === localId) || athlete();
  dismissToast();
  state.navMenu = null;
  state.actingAthlete = person.id;
  state.athleteId = person.id;
  state.role = "athlete";
  state.view = "mine";
  state.openWorkout = null;
  state.openSession = null;
  state.athleteOpenDate = null;
  state.athleteAssignments = [];
  render();
  try {
    const user = await ensureUser(person, "student");
    state.serverUserId = user.id;
    state.athleteAssignments = await api("GET", "/api/assignments?user_id=" + user.id);
    state.athleteWorkouts = {};
    for (const row of state.athleteAssignments) {
      state.athleteWorkouts[row.scheduled_date] = await api("GET", "/api/workouts/" + row.workout_id);
    }
    render();
  } catch (err) {
    toast("Could not load this athlete");
    console.error(err);
  }
}
async function openAthleteWorkout(workoutId) {
  if (!state.serverUserId) {
    const person = ATHLETES.find((a) => a.id === state.actingAthlete) || athlete();
    const user = await ensureUser(person, "student");
    state.serverUserId = user.id;
  }
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
function savedDay(date) {
  const day = (state.calendars[state.actingAthlete] || {})[date];
  if (day && day.savedFor === state.actingAthlete && (day.items || []).length) {
    return { title: day.title, weekLabel: day.weekLabel, items: day.items, workoutId: day.savedWorkoutId };
  }
  const workout = (state.athleteWorkouts || {})[date];
  if (!workout) {
    if (day && (day.items || []).length) {
      return { title: day.title, weekLabel: day.weekLabel, items: day.items, workoutId: day.savedWorkoutId };
    }
    return null;
  }
  return {
    title: workout.title,
    weekLabel: weekName(date),
    workoutId: workout.id,
    items: (workout.exercises || []).slice().sort((a, b) => (a.order_index || 0) - (b.order_index || 0)).map((we) => {
      const notes = we.notes || "";
      const restLine = notes.split("\n").find((line) => line.indexOf("Rests:") === 0) || "";
      const rests = restLine ? restLine.slice(6).split(",") : [we.rest_seconds ? String(we.rest_seconds) : ""];
      const detail = notes.split("\n").filter((line) => line.indexOf("Rests:") !== 0).join("\n");
      return {
        name: (we.exercise && we.exercise.name) || "Exercise",
        letter: we.superset_group || "",
        type: detail.indexOf("\n") >= 0 ? "circuit" : "lift",
        sets: we.prescribed_sets || 1,
        reps: String(we.target_reps || "1").split(","),
        loads: String(we.target_weight || "").split(","),
        rests,
        detail,
        note: ""
      };
    })
  };
}
function athleteDayCol(date) {
  const day = savedDay(date);
  const open = state.athleteOpenDate === date ? "focus" : "";
  const items = day ? day.items.map((it) => {
    const color = LETTER_COLOR[it.letter] || "#888";
    const letter = it.letter ? `<span class="letter" style="background:${color}">${esc(it.letter)}</span>` : `<span class="letter" style="background:#444;color:#fff">–</span>`;
    return `<div class="ex">${letter}<div class="ex-main"><div class="ex-name">${esc(it.name)}</div><div class="ex-sub">${esc(scriptLine(it))}</div></div></div>`;
  }).join("") : "";
  return `<div class="day read ${open}" data-day="${date}" onclick="openAthleteDay('${date}')">
    <div class="day-top"><span>${fmtDay(date)}</span></div>
    <div class="week-label">${esc((day && day.weekLabel) || weekName(date))}</div>
    <div class="day-title ${day ? "" : "placeholder"}">${day ? esc(day.title || "Workout") : "Rest"}</div>
    <div>${items}</div>
  </div>`;
}
function mineView() {
  const fromList = ATHLETES.find((a) => a.id === state.actingAthlete);
  const person = fromList || { name: (state.auth.user && state.auth.user.name) || "Athlete" };
  const canLeave = heldRoles(state.auth.user).some((r) => r === "coach" || r === "admin");
  const weeks = state.viewMode === "week" ? 1 : 4;
  let weeksHtml = "";
  for (let w = 0; w < weeks; w++) {
    const start = addDays(state.weekStart, w * 7);
    let cols = "";
    for (let i = 0; i < 7; i++) cols += athleteDayCol(addDays(start, i));
    weeksHtml += `<div class="week">${cols}</div>`;
  }
  return `<section class="stage">
    <div class="subhead">
      <div>
        <div class="crumbs">Athlete · your schedule</div>
        <div class="athlete-name">${esc(person.name)}</div>
      </div>
      <div class="sub-actions">
        ${canLeave ? `<button class="ghost" onclick="backToCoach()">Back to coach</button>` : ""}
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
    ${athleteOpenPanel()}
  </section>`;
}
async function openAthleteDay(date) {
  let day = savedDay(date);
  if (!day) return;
  dismissToast();
  state.athleteOpenDate = date;
  render();
  if (day.workoutId) {
    try { await openAthleteWorkout(day.workoutId); }
    catch (err) { console.error(err); }
  } else if (day.items && day.items.length) {
    try {
      await publishDay(date, { quiet: true });
      const refreshed = savedDay(date);
      if (refreshed && refreshed.workoutId) {
        await openAthleteWorkout(refreshed.workoutId);
      }
    } catch (err) {
      console.error(err);
    }
  }
}
function athleteOpenPanel() {
  if (!state.athleteOpenDate) return "";
  const day = savedDay(state.athleteOpenDate);
  if (!day) return "";
  const body = state.openWorkout && state.openWorkout.id === day.workoutId
    ? state.openWorkout.exercises.map((we) => athleteExercise(we)).join("")
    : day.items.map((it) => `<div class="ex-name" style="margin:8px 0">${esc(it.letter || "")} ${esc(it.name)}<div class="ex-sub">${esc(scriptLine(it))}</div></div>`).join("");
  return `<div class="editor" onclick="event.stopPropagation()">
    <div class="editor-h">
      <span class="name">${esc(day.title || "Workout")}</span>
      <span class="grow"></span>
      <button class="iconbtn" onclick="state.athleteOpenDate=null;state.openWorkout=null;render()">✕</button>
    </div>
    <div class="hint" style="margin:4px 0 8px">${fmtLong(state.athleteOpenDate)}</div>
    ${body || "<p>No exercises on this day.</p>"}
    ${ownAthleteSession() && day.workoutId ? noteForm(day.workoutId) : ""}
  </div>`;
}
function noteForm(workoutId) {
  const existing = (state.notesByWorkout && state.notesByWorkout[workoutId]) || "";
  return `<form class="note-box" onsubmit="sendAthleteNote(event, ${workoutId}); return false;">
    <label>Note to your coach</label>
    <textarea id="athlete-note" placeholder="How did this workout feel?">${esc(existing)}</textarea>
    <button class="req" type="submit">Send note</button>
    ${existing ? `<div class="hint">Sent: ${esc(existing)}</div>` : ""}
  </form>`;
}
function athleteExercise(we) {
  const sets = we.prescribed_sets || 1;
  const reps = String(we.target_reps || "").split(",");
  const loads = String(we.target_weight || "").split(",");
  const restLine = String(we.notes || "").split("\n").find((line) => line.indexOf("Rests:") === 0) || "";
  const rests = restLine ? restLine.slice(6).split(",") : [];
  const rows = Array.from({ length: sets }, (_, i) => {
    const n = i + 1;
    const log = ((state.openSession && state.openSession.set_logs) || []).find((l) => l.workout_exercise_id === we.id && l.set_number === n) || {};
    const rest = rests[i] || (we.rest_seconds ? String(we.rest_seconds) : "");
    return `<tr><td>${n}</td>
      <td><input value="${esc(log.weight ?? loads[i] ?? loads[0] ?? "")}" onchange="logAthleteSet(${we.id}, ${n}, 'weight', this.value)"></td>
      <td><input value="${esc(log.reps ?? reps[i] ?? reps[0] ?? "")}" onchange="logAthleteSet(${we.id}, ${n}, 'reps', this.value)"></td>
      <td class="hint">${rest ? esc(rest) + "s" : ""}</td>
      <td><input type="checkbox" ${log.completed ? "checked" : ""} onchange="logAthleteSet(${we.id}, ${n}, 'completed', this.checked)"></td></tr>`;
  }).join("");
  const note = String(we.notes || "").split("\n").filter((line) => line.indexOf("Rests:") !== 0).join(" · ");
  return `<div style="margin:12px 0">
    <strong>${esc(we.superset_group || "")} ${esc(we.exercise.name)}</strong>
    <div class="hint">${esc(we.prescription_text || "")}${note ? " · " + esc(note) : ""}</div>
    <table class="sets"><tr><th>Set</th><th>Kg</th><th>Reps</th><th>Rest</th><th>Done</th></tr>${rows}</table>
  </div>`;
}
function shareDay(date) { state.dayMenu = null; state.modal = { type: "share", date }; render(); }
function clearTitle(date) { snapshot(); ensureDay(date).title = ""; state.dayMenu = null; render(); }
function resetOrder(date) {
  snapshot();
  const day = ensureDay(date);
  day.items.sort((a, b) => String(a.letter || "Z").localeCompare(String(b.letter || "Z")));
  state.dayMenu = null;
  refreshFutureCopies(date);
  toast("Order grouped by letter");
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
  refreshFutureCopies(date);
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
  const athleteId = m.athleteId || state.athleteId;
  dates.forEach((d) => {
    const day = ensureDay(d, athleteId);
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
  refreshFutureCopies(date);
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
  const rows = Array.from({ length: it.sets || 1 }, (_, i) => `<tr><td>${i + 1}</td><td>${esc(it.loads[i] || "")}</td><td>${esc(it.reps[i] || "")}</td></tr>`).join("");
  return `<div class="ex-sub">${esc(scriptLine(it))}</div>
    ${it.detail ? `<div class="detail">${esc(it.detail)}</div>` : ""}
    <table class="sets"><tr><th>SET</th><th>WEIGHT (KG)</th><th>REPS</th></tr>${rows}</table>
    <button class="comment" type="button" onclick="openEditor('${state.preview.date}','${it.id}')">Edit</button>
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
  openEdit({
    title: "Edit comment",
    fields: [{ key: "text", label: "Comment", value: state.comments[i] || "", multiline: true }],
    onSave: (values) => {
      state.comments[i] = values.text || "";
      state.modal = null;
      toast("Comment saved");
    }
  });
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
    main = `<div class="light-page"><h1>Groups</h1>
      <form class="toolbar" onsubmit="addGroupRecord(); return false;">
        <input class="plain" placeholder="Group name" data-focus="group-name" value="${esc(state.toolForm.group || "")}" oninput="state.toolForm.group=this.value">
        <button class="req" type="submit">Add group</button>
      </form>
      <div class="grid-cards">${state.groups.map((g, i) => `<article class="card"><strong>${esc(g)}</strong><div style="margin-top:8px"><button class="comment" onclick="editGroup(${i})">Edit</button> <button class="comment" onclick="state.groups.splice(${i},1);render()">Remove</button></div></article>`).join("")}</div></div>`;
  } else if (state.userTab === "codes") {
    main = `<div class="light-page"><h1>Easy-Join Codes</h1><table class="data"><tr><th>Code</th><th>Group</th><th></th></tr>${state.joinCodes.map((c, i) => `<tr><td>${esc(c.code)}</td><td>${esc(c.group)}</td><td><button class="icon-a" onclick="navigator.clipboard.writeText('${esc(c.code)}');toast('Copied')">Copy</button> <button class="icon-a" onclick="state.joinCodes.splice(${i},1);render()">✕</button></td></tr>`).join("")}</table>
      <button class="req" style="margin-top:12px" onclick="state.joinCodes.push({code:'NEW'+Math.floor(Math.random()*90+10), group: state.groups[0]});render()">+ Code</button></div>`;
  } else if (state.userTab === "upload") {
    main = `<div class="light-page"><h1>Upload Users</h1><p>Paste one name per line.</p><textarea id="uploadBox" class="plain" style="width:100%;min-height:120px"></textarea><button class="req" onclick="importUsers()">Import</button></div>`;
  } else if (state.userTab === "export") {
    main = `<div class="light-page"><h1>Export Data</h1><p>Download calendars and roster as JSON.</p><button class="req" onclick="exportData()">Download</button></div>`;
  } else {
    main = `<form class="toolbar" onsubmit="addUserRecord(event); return false;" style="padding:10px 12px 0">
      <input class="plain" placeholder="First" data-focus="user-first" value="${esc(state.toolForm.first || "")}" oninput="state.toolForm.first=this.value">
      <input class="plain" placeholder="Last" data-focus="user-last" value="${esc(state.toolForm.last || "")}" oninput="state.toolForm.last=this.value">
      <input class="plain" placeholder="Email" data-focus="user-email" value="${esc(state.toolForm.email || "")}" oninput="state.toolForm.email=this.value">
      <select class="plain" onchange="state.toolForm.role=this.value"><option value="student">Athlete</option><option value="coach" ${state.toolForm.role === "coach" ? "selected" : ""}>Coach</option></select>
      <button class="req" type="submit">Add user</button>
    </form>
    <div class="redbar"><span>${state.userTab === "coaches" ? "Coaches" : "Athletes"}</span>
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
async function removeUser(id) {
  const row = state.coaches.concat(state.athletes).find((c) => c.id === id);
  const serverId = row ? row.serverId : (String(id).startsWith("srv") ? parseInt(String(id).slice(3)) : (String(id).startsWith("u") ? parseInt(String(id).slice(1)) : null));
  if (serverId) {
    try {
      await api("DELETE", "/api/users/" + serverId);
    } catch (e) {
      console.warn("Failed to delete user on server:", e);
    }
  }
  state.coaches = state.coaches.filter((c) => c.id !== id);
  state.athletes = state.athletes.filter((c) => c.id !== id);
  const aIdx = ATHLETES.findIndex((a) => a.id === id || (row && a.email === row.email));
  if (aIdx >= 0) ATHLETES.splice(aIdx, 1);
  toast("User removed");
  render();
}
function editUser(id) {
  const row = state.coaches.concat(state.athletes).find((r) => r.id === id);
  if (!row) return;
  openEdit({
    title: "Edit user",
    fields: [
      { key: "first", label: "First name", value: row.first || "" },
      { key: "last", label: "Last name", value: row.last || "" },
      { key: "email", label: "Email", value: row.email || "", type: "email" }
    ],
    onSave: (values) => saveUserEdit(row, values)
  });
}
function editGroup(index) {
  openEdit({
    title: "Edit group",
    fields: [{ key: "name", label: "Group name", value: state.groups[index] || "" }],
    onSave: (values) => {
      const next = (values.name || "").trim();
      if (!next) { toast("Enter a group name"); return; }
      state.groups[index] = next;
      state.modal = null;
      toast("Group renamed");
    }
  });
}
function addNamed(kind) {
  const name = (state.toolForm[kind] || "").trim();
  if (!name) { toast("Enter a name first"); return; }
  if (kind === "group" && !state.groups.includes(name)) state.groups.push(name);
  if (kind === "goal") state.goals.push(name);
  if (kind === "packet") state.packets.push(name);
  state.toolForm[kind] = "";
  toast("Saved");
  render();
}
function renameGroup(index, name) {
  const next = name.trim();
  if (!next) return;
  state.groups[index] = next;
  toast("Group renamed");
  render();
}
async function loadRoster() {
  try {
    const users = await api("GET", "/api/users");
    users.forEach((u) => {
      const parts = (u.name || "").split(" ");
      const row = {
        id: "srv" + u.id, serverId: u.id, first: parts[0] || u.name, last: parts.slice(1).join(" "),
        email: u.email, activity: "Saved", groups: (u.groups || []).map((g) => g.name).join(", ") || "—", cals: "All", role: u.role
      };
      const list = u.role === "coach" ? state.coaches : state.athletes;
      if (!list.some((r) => r.serverId === u.id || r.email === u.email)) list.push(row);
      if (u.role !== "coach" && !ATHLETES.some((a) => a.email === u.email)) {
        const id = "u" + u.id;
        ATHLETES.push({ id, name: u.name, email: u.email });
        if (!state.calendars[id]) state.calendars[id] = {};
      }
    });
    const groups = await api("GET", "/api/groups");
    groups.forEach((g) => { if (!state.groups.includes(g.name)) state.groups.push(g.name); });
    render();
  } catch (err) {
    console.error(err);
  }
}
async function addUserFromModal() {
  const m = state.modal || {};
  state.toolForm.first = m.first || "";
  state.toolForm.last = m.last || "";
  state.toolForm.email = m.email || "";
  state.toolForm.role = "student";
  state.modal = null;
  await addUserRecord();
}
async function addUserRecord(ev) {
  if (ev) ev.preventDefault();
  const first = (state.toolForm.first || "").trim();
  const last = (state.toolForm.last || "").trim();
  const email = (state.toolForm.email || "").trim();
  const role = state.toolForm.role || "student";
  if (!first || !email) { toast("First name and email are required"); return; }
  try {
    const user = await api("POST", "/api/users", {
      name: (first + " " + last).trim(), email, role, title: role === "coach" ? "Coach" : "Athlete"
    });
    const row = { id: "srv" + user.id, serverId: user.id, first, last, email, activity: "Just added", groups: "—", cals: "All", role };
    (role === "coach" ? state.coaches : state.athletes).push(row);
    if (role !== "coach") {
      const id = "u" + user.id;
      ATHLETES.push({ id, name: (first + " " + last).trim(), email });
      state.calendars[id] = {};
    }
    state.toolForm.first = "";
    state.toolForm.last = "";
    state.toolForm.email = "";
    state.userTab = role === "coach" ? "coaches" : "athletes";
    toast("User added");
    render();
  } catch (err) {
    toast("Could not add that user");
    console.error(err);
  }
}
async function addGroupRecord() {
  const name = (state.toolForm.group || "").trim();
  if (!name) { toast("Enter a group name"); return; }
  try { await api("POST", "/api/groups", { name }); } catch (err) { console.error(err); }
  if (!state.groups.includes(name)) state.groups.push(name);
  state.toolForm.group = "";
  toast("Group saved");
  render();
}
async function saveUserEdit(row, values) {
  if (!row || !values) return;
  const first = (values.first || "").trim();
  const last = (values.last || "").trim();
  const email = (values.email || "").trim();
  if (!first || !email) { toast("First name and email are required"); return; }
  const name = (first + " " + last).trim();
  if (row.serverId) {
    try { await api("PUT", "/api/users/" + row.serverId, { name, email }); }
    catch (err) { toast("Could not save user"); console.error(err); return; }
  }
  const previousEmail = row.email;
  row.first = first;
  row.last = last;
  row.email = email;
  const athlete = ATHLETES.find((a) => a.id === row.id || a.email === previousEmail || a.email === email);
  if (athlete) {
    athlete.name = name;
    athlete.email = email;
  }
  state.modal = null;
  toast("User saved");
}

function exBucket(category) {
  const c = String(category || "").toLowerCase();
  if (c.indexOf("circuit") >= 0) return "Circuits";
  if (c.indexOf("question") >= 0) return "Questionnaires";
  return "Lifts";
}
function categoryChoice(category) {
  const bucket = exBucket(category);
  if (bucket === "Circuits") return "Circuit";
  if (bucket === "Questionnaires") return "Questionnaire";
  return "Strength";
}
function editExercise(id) {
  const row = state.serverExercises.find((e) => e.id === id);
  if (!row) return;
  openEdit({
    title: "Edit exercise",
    fields: [
      { key: "name", label: "Name", value: row.name || "" },
      { key: "category", label: "Category", value: categoryChoice(row.category), options: ["Strength", "Circuit", "Questionnaire"] }
    ],
    onSave: async (values) => {
      const name = (values.name || "").trim();
      if (!name) { toast("Name the exercise"); return; }
      row.name = name;
      row.category = values.category || "Strength";
      const ok = await saveExerciseName(id);
      if (!ok) return;
      state.modal = null;
      render();
    }
  });
}
function exerciseRows() {
  const q = state.liftQ.toLowerCase();
  if (state.serverExercises.length) {
    return state.serverExercises.filter((e) => !e.hidden && exBucket(e.category) === state.managing && e.name.toLowerCase().includes(q));
  }
  return state.lifts.filter((l) => l.type === state.managing && l.name.toLowerCase().includes(q));
}
function liftsView() {
  const rows = exerciseRows();
  const server = state.serverExercises.length > 0;
  return `<section class="stage" style="background:#eee">
    <div class="light-page">
      <div class="feed-top"><h1 style="display:flex;gap:8px;align-items:center">Master Database
        <select class="plain" onchange="state.managing=this.value;render()">${["Lifts", "Circuits", "Questionnaires"].map((t) => `<option ${state.managing === t ? "selected" : ""}>${t}</option>`).join("")}</select>
      </h1></div>
      <form class="toolbar" onsubmit="addExerciseRecord(); return false;">
        <input class="plain" placeholder="Exercise name" data-focus="ex-name" value="${esc(state.toolForm.exName || "")}" oninput="state.toolForm.exName=this.value">
        <select class="plain" onchange="state.toolForm.exCat=this.value">
          ${["Strength", "Circuit", "Questionnaire"].map((c) => `<option ${state.toolForm.exCat === c ? "selected" : ""}>${c}</option>`).join("")}
        </select>
        <button class="req" type="submit">Add exercise</button>
      </form>
      <input class="plain" style="width:100%;margin:8px 0" placeholder="Search" data-focus="lift-q" value="${esc(state.liftQ)}" oninput="state.liftQ=this.value;render()">
      <table class="data"><tr><th>Name</th><th>Category</th><th></th></tr>
        ${rows.map((l) => server ? `<tr>
          <td>${esc(l.name)}</td>
          <td>${esc(categoryChoice(l.category))}</td>
          <td><button class="icon-a" onclick="editExercise(${l.id})">Edit</button> <button class="icon-a" onclick="hideExercise(${l.id})">Hide</button></td>
        </tr>` : `<tr><td>${esc(l.name)}</td><td>${esc(l.type)}</td><td></td></tr>`).join("")}
      </table>
      ${rows.length ? "" : `<p class="hint">No ${esc(state.managing.toLowerCase())} yet.</p>`}
    </div>
  </section>`;
}
function rememberExercise(id, key, value) {
  const row = state.serverExercises.find((e) => e.id === id);
  if (row) row[key] = value;
}
async function loadExercises() {
  try {
    const list = await api("GET", "/api/exercises");
    state.serverExercises = list;
    list.forEach((e) => {
      if (!CATALOG.some((c) => c.name.toLowerCase() === e.name.toLowerCase())) {
        const bucket = exBucket(e.category);
        CATALOG.push({ name: e.name, type: bucket === "Circuits" ? "circuit" : bucket === "Questionnaires" ? "questionnaire" : "lift" });
      }
    });
    render();
  } catch (err) { console.error(err); }
}
async function addExerciseRecord() {
  const name = (state.toolForm.exName || "").trim();
  const category = state.toolForm.exCat || "Strength";
  if (!name) { toast("Name the exercise"); return; }
  try {
    const created = await api("POST", "/api/exercises", { name, category });
    state.serverExercises.push(created);
    const bucket = exBucket(category);
    if (!CATALOG.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
      CATALOG.push({ name, type: bucket === "Circuits" ? "circuit" : bucket === "Questionnaires" ? "questionnaire" : "lift" });
    }
    state.managing = bucket;
    state.toolForm.exName = "";
    toast("Exercise added");
    render();
  } catch (err) {
    toast("Could not add that exercise");
    console.error(err);
  }
}
async function saveExerciseName(id) {
  const row = state.serverExercises.find((e) => e.id === id);
  if (!row || !String(row.name || "").trim()) return false;
  try {
    const updated = await api("PUT", "/api/exercises/" + id, { name: row.name.trim(), category: row.category || "Strength" });
    row.name = updated.name;
    row.category = updated.category;
    toast("Exercise saved");
    return true;
  } catch (err) {
    toast("Could not save exercise");
    console.error(err);
    return false;
  }
}
function hideExercise(id) {
  const row = state.serverExercises.find((e) => e.id === id);
  if (row) row.hidden = true;
  render();
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
    <table class="data"><tr><th>Lift</th><th>Kg</th><th></th></tr>${rows.map((r, i) => `<tr><td>${esc(r[0])}</td><td>${esc(r[1])}</td><td><button class="comment" onclick="editPr(${i})">Edit</button></td></tr>`).join("")}</table>
    <button class="req" style="margin-top:8px" onclick="const n=prompt('Lift'); if(n){state.prs['${state.athleteId}'].push([n,'']);render()}">+ PR</button></section>`;
}
function editPr(index) {
  const rows = state.prs[state.athleteId] || [];
  const row = rows[index];
  if (!row) return;
  openEdit({
    title: "Edit PR",
    hint: row[0] || "",
    fields: [{ key: "kg", label: "Kg", value: row[1] || "" }],
    onSave: (values) => {
      row[1] = values.kg || "";
      state.modal = null;
      toast("PR saved");
    }
  });
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
  return `<section class="stage light-page"><h1>Manage Calendars</h1>
    <form class="toolbar" onsubmit="addCalendar(); return false;">
      <input class="plain" placeholder="Athlete name" data-focus="cal-name" value="${esc(state.toolForm.calName || "")}" oninput="state.toolForm.calName=this.value">
      <input class="plain" placeholder="Email" data-focus="cal-email" value="${esc(state.toolForm.calEmail || "")}" oninput="state.toolForm.calEmail=this.value">
      <button class="req" type="submit">Add calendar</button>
    </form>
    <div class="grid-cards">${ATHLETES.map((a) => `<article class="card">
      <strong>${esc(a.name)}</strong>
      <div class="hint">${Object.keys(state.calendars[a.id] || {}).length} programmed days · ${esc(a.email)}</div>
      <button class="comment" onclick="editCalendar('${a.id}')">Edit</button>
      <button class="comment" onclick="state.athleteId='${a.id}';state.view='build';render()">Open calendar</button>
    </article>`).join("")}</div></section>`;
}
function addCalendar() {
  const name = (state.toolForm.calName || "").trim();
  const email = (state.toolForm.calEmail || "").trim() || (name.toLowerCase().replace(/[^a-z0-9]+/g, "") + "@example.com");
  if (!name) { toast("Name the athlete"); return; }
  if (ATHLETES.some((a) => a.email === email)) { toast("That email already has a calendar"); return; }
  const id = "cal" + uid();
  ATHLETES.push({ id, name, email });
  state.calendars[id] = {};
  state.athletes.push({ id, first: name.split(" ")[0], last: name.split(" ").slice(1).join(" "), email, activity: "N/A", groups: "—", cals: "1" });
  state.toolForm.calName = "";
  state.toolForm.calEmail = "";
  toast("Calendar added");
  render();
}
function editCalendar(id) {
  const person = ATHLETES.find((a) => a.id === id);
  if (!person) return;
  openEdit({
    title: "Edit calendar",
    fields: [{ key: "name", label: "Athlete name", value: person.name || "" }],
    onSave: (values) => {
      const next = (values.name || "").trim();
      if (!next) { toast("Name the athlete"); return; }
      state.modal = null;
      renameCalendar(id, next);
    }
  });
}
function renameCalendar(id, name) {
  const next = (name || "").trim();
  if (!next) return;
  const person = ATHLETES.find((a) => a.id === id);
  if (person) person.name = next;
  const row = state.athletes.find((a) => a.id === id);
  if (row) { row.first = next.split(" ")[0]; row.last = next.split(" ").slice(1).join(" "); }
  toast("Calendar renamed");
  render();
}
function goalsView() {
  const rows = state.serverRecords || [];
  const athletesList = ATHLETES;
  const isCoach = state.role === "coach" || state.role === "admin";
  return `<section class="stage light-page">
    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:14px">
      <h1>Goals & Personal Records</h1>
      ${isCoach ? `
        <div style="display:flex;align-items:center;gap:8px">
          <label style="font-size:12px;font-weight:700;color:#555">Filter athlete:</label>
          <select class="plain" onchange="filterGoalsAthlete(this.value)">
            <option value="all" ${state.selectedGoalAthlete === 'all' ? 'selected' : ''}>All Athletes</option>
            ${athletesList.map(a => `<option value="${a.id}" ${state.selectedGoalAthlete === a.id ? 'selected' : ''}>${esc(a.name)}</option>`).join("")}
          </select>
        </div>
      ` : ""}
    </div>
    <form class="toolbar" onsubmit="addGoalRecord(); return false;">
      <input class="plain" placeholder="Lift (e.g. Back Squat)" data-focus="goal-name" value="${esc(state.toolForm.goalName || "")}" oninput="state.toolForm.goalName=this.value">
      <input class="plain" placeholder="Kg (e.g. 180)" data-focus="goal-kg" value="${esc(state.toolForm.goalWeight || "")}" oninput="state.toolForm.goalWeight=this.value">
      ${isCoach ? `
        <select class="plain" onchange="state.toolForm.goalAthlete=this.value">
          <option value="">Assign to Athlete (optional)</option>
          ${athletesList.map(a => `<option value="${a.id}" ${state.toolForm.goalAthlete === a.id ? 'selected' : ''}>${esc(a.name)}</option>`).join("")}
        </select>
      ` : ""}
      <button class="req" type="submit">Add goal</button>
    </form>
    <div class="grid-cards">${rows.map((r) => {
      const athleteName = r.user ? r.user.name : "Unassigned / Team";
      return `<article class="card">
        <div style="display:flex;justify-content:space-between;align-items:flex-start">
          <strong>${esc((r.exercise && r.exercise.name) || "Goal")}</strong>
          <button class="icon-a" title="Delete Goal" onclick="deleteGoalRecord(${r.id})">🗑</button>
        </div>
        <div class="row" style="margin:8px 0"><strong>${esc(r.weight)}</strong> kg <button class="comment" onclick="editGoal(${r.id})">Edit</button></div>
        <div><span class="goal-assignee-tag ${r.user ? '' : 'team'}">👤 ${esc(athleteName)}</span></div>
        <div class="hint" style="margin-top:6px">${esc(r.notes || "")}</div>
      </article>`;
    }).join("") || `<p class="hint">No goals saved yet.</p>`}</div></section>`;
}
async function filterGoalsAthlete(athleteId) {
  state.selectedGoalAthlete = athleteId;
  let targetUserId = null;
  if (athleteId !== "all") {
    const person = ATHLETES.find(a => a.id === athleteId);
    if (person) {
      const u = await ensureUser(person, "student");
      targetUserId = u.id;
    }
  }
  await loadGoals(targetUserId);
}
function rememberGoal(id, value) {
  const rec = state.serverRecords.find((r) => r.id === id);
  if (rec) rec.weight = value;
}
function editGoal(id) {
  const rec = state.serverRecords.find((r) => r.id === id);
  if (!rec) return;
  openEdit({
    title: "Edit goal",
    fields: [{ key: "weight", label: "Weight (kg)", value: rec.weight == null ? "" : String(rec.weight) }],
    onSave: async (values) => {
      rec.weight = values.weight;
      const ok = await saveGoalWeight(id);
      if (!ok) return;
      state.modal = null;
      render();
    }
  });
}
async function saveGoalWeight(id) {
  const rec = state.serverRecords.find((r) => r.id === id);
  if (!rec) return false;
  try {
    const updated = await api("PUT", "/api/records/" + id, { weight: parseFloat(rec.weight) || 0 });
    rec.weight = updated.weight;
    toast("Goal updated");
    return true;
  } catch (err) {
    toast("Could not update that goal");
    console.error(err);
    return false;
  }
}
async function loadGoals(userId) {
  try {
    let url = "/api/records";
    if (userId) {
      url += "?user_id=" + userId;
    } else if (state.role === "athlete" && state.serverUserId) {
      url += "?user_id=" + state.serverUserId;
    }
    state.serverRecords = await api("GET", url);
    render();
  } catch (err) { console.error(err); }
}
async function addGoalRecord() {
  const name = (state.toolForm.goalName || "").trim();
  const weight = parseFloat(state.toolForm.goalWeight || "0");
  if (!name) { toast("Name the lift"); return; }
  try {
    const exercise = await ensureExercise(name);
    let targetUserId = null;
    if (state.role === "athlete") {
      targetUserId = state.serverUserId;
    } else if (state.toolForm.goalAthlete) {
      const person = ATHLETES.find(a => a.id === state.toolForm.goalAthlete);
      if (person) {
        const u = await ensureUser(person, "student");
        targetUserId = u.id;
      }
    } else if (state.selectedGoalAthlete && state.selectedGoalAthlete !== "all") {
      const person = ATHLETES.find(a => a.id === state.selectedGoalAthlete);
      if (person) {
        const u = await ensureUser(person, "student");
        targetUserId = u.id;
      }
    }
    const rec = await api("POST", "/api/records", { exercise_id: exercise.id, weight: weight || 0, reps: 1, notes: "Goal", user_id: targetUserId });
    state.serverRecords.unshift(rec);
    state.toolForm.goalName = "";
    state.toolForm.goalWeight = "";
    toast("Goal saved");
    render();
  } catch (err) {
    toast("Could not save that goal");
    console.error(err);
  }
}
async function deleteGoalRecord(id) {
  try {
    await api("DELETE", "/api/records/" + id);
    state.serverRecords = state.serverRecords.filter(r => r.id !== id);
    toast("Goal deleted");
    render();
  } catch (err) {
    toast("Could not delete goal");
    console.error(err);
  }
}
function docsView() {
  return `<section class="stage light-page"><h1>Documents & Links</h1>
    <form class="toolbar" onsubmit="addDoc(); return false;">
      <input class="plain" placeholder="Name" data-focus="doc-name" value="${esc(state.toolForm.docName || "")}" oninput="state.toolForm.docName=this.value">
      <input class="plain" placeholder="URL" data-focus="doc-url" value="${esc(state.toolForm.docUrl || "")}" oninput="state.toolForm.docUrl=this.value">
      <button class="req" type="submit">Add link</button>
    </form>
    <div class="grid-cards">${state.docs.map((d, i) => `<article class="card">
      <strong>${esc(d.name)}</strong>
      <div class="hint">${esc(d.url)}</div>
      <div style="margin-top:8px"><a href="${esc(d.url)}" target="_blank">Open</a> <button class="comment" onclick="editDoc(${i})">Edit</button> <button class="comment" onclick="state.docs.splice(${i},1);render()">Remove</button></div>
    </article>`).join("")}</div></section>`;
}
function editDoc(index) {
  const doc = state.docs[index];
  if (!doc) return;
  openEdit({
    title: "Edit document",
    fields: [
      { key: "name", label: "Name", value: doc.name || "" },
      { key: "url", label: "URL", value: doc.url || "" }
    ],
    onSave: (values) => {
      const name = (values.name || "").trim();
      if (!name) { toast("Name the document"); return; }
      doc.name = name;
      doc.url = (values.url || "").trim() || "#";
      state.modal = null;
      toast("Document saved");
    }
  });
}
function addDoc() {
  const name = (state.toolForm.docName || "").trim();
  const url = (state.toolForm.docUrl || "").trim() || "#";
  if (!name) { toast("Name the document"); return; }
  state.docs.push({ name, url });
  state.toolForm.docName = "";
  state.toolForm.docUrl = "";
  toast("Document saved");
  render();
}
function packetsView() {
  return `<section class="stage light-page"><h1>Packets & Sheets</h1>
    <form class="toolbar" onsubmit="addPacket(); return false;">
      <input class="plain" placeholder="Packet name" data-focus="packet-name" value="${esc(state.toolForm.packet || "")}" oninput="state.toolForm.packet=this.value">
      <button class="req" type="submit">Add packet</button>
    </form>
    <div class="grid-cards">${state.packets.map((p, i) => `<article class="card"><strong>${esc(p)}</strong><div style="margin-top:8px"><button class="comment" onclick="editPacket(${i})">Edit</button> <button class="comment" onclick="state.packets.splice(${i},1);render()">Remove</button></div></article>`).join("")}</div></section>`;
}
function editPacket(index) {
  openEdit({
    title: "Edit packet",
    fields: [{ key: "name", label: "Packet name", value: state.packets[index] || "" }],
    onSave: (values) => {
      const name = (values.name || "").trim();
      if (!name) { toast("Name the packet"); return; }
      state.packets[index] = name;
      state.modal = null;
      toast("Packet saved");
    }
  });
}
function addPacket() {
  const name = (state.toolForm.packet || "").trim();
  if (!name) { toast("Name the packet"); return; }
  state.packets.push(name);
  state.toolForm.packet = "";
  toast("Packet saved");
  render();
}
function attendanceView() {
  const date = state.entryDate;
  const comp = state.compliance && state.compliance.date === date ? state.compliance : null;
  return `<section class="stage light-page"><h1>Attendance</h1>
    <input class="plain" type="date" value="${date}" onchange="state.entryDate=this.value;loadCompliance()">
    <p class="hint">${comp ? comp.completed_count + " completed · " + comp.not_started_count + " not started" : "Mark who is here. The workout on that day is listed under each name."}</p>
    <div class="grid-cards">${ATHLETES.map((a) => {
      const key = date + ":" + a.id;
      const day = (state.calendars[a.id] || {})[date];
      const title = day && ((day.title || "").trim() || (day.items || []).length) ? (day.title || "Workout") + " · " + (day.items || []).length + " exercises" : "No workout this day";
      return `<article class="card">
        <label class="chk"><input type="checkbox" ${state.attendance[key] ? "checked" : ""} onchange="state.attendance['${key}']=this.checked;render()"> ${esc(a.name)}</label>
        <div class="hint">${esc(title)}</div>
        <div class="hint">${esc(state.attendance[key + ":note"] || "No note")}</div>
        <button class="comment" onclick="editAttendance('${a.id}')">Edit note</button>
      </article>`;
    }).join("")}</div></section>`;
}
function editAttendance(athleteId) {
  const key = state.entryDate + ":" + athleteId + ":note";
  openEdit({
    title: "Edit attendance note",
    fields: [{ key: "note", label: "Note", value: state.attendance[key] || "", multiline: true }],
    onSave: (values) => {
      state.attendance[key] = values.note || "";
      state.modal = null;
      toast("Attendance saved");
    }
  });
}
async function loadCompliance() {
  try {
    state.compliance = await api("GET", "/api/coach/compliance?date=" + encodeURIComponent(state.entryDate));
    render();
  } catch (err) { console.error(err); }
}
function programmedRows() {
  const rows = [];
  ATHLETES.forEach((a) => {
    Object.keys(state.calendars[a.id] || {}).sort().forEach((date) => {
      const day = state.calendars[a.id][date];
      if (!(day.items || []).length && !(day.title || "").trim()) return;
      rows.push({ athlete: a.name, athleteId: a.id, date, title: day.title || "Workout", count: (day.items || []).length });
    });
  });
  return rows;
}
function reportingView() {
  const rows = programmedRows();
  const items = rows.reduce((n, r) => n + r.count, 0);
  return `<section class="stage light-page"><h1>Reporting</h1>
    <div class="kpis"><div class="kpi"><b>${rows.length}</b><span>Programmed days</span></div><div class="kpi"><b>${items}</b><span>Exercises</span></div><div class="kpi"><b>${state.athletes.length}</b><span>Athletes</span></div><div class="kpi"><b>${state.reports.length}</b><span>Notes</span></div></div>
    <form class="toolbar" onsubmit="addReport(); return false;">
      <input class="plain" placeholder="Report note" data-focus="report-note" value="${esc(state.toolForm.report || "")}" oninput="state.toolForm.report=this.value">
      <button class="req" type="submit">Add note</button>
    </form>
    ${state.reports.map((r, i) => `<article class="card"><p>${esc(r.text)}</p><button class="comment" onclick="editReport(${i})">Edit</button> <button class="comment" onclick="state.reports.splice(${i},1);render()">Remove</button></article>`).join("")}
    <table class="data" style="margin-top:12px"><tr><th>Date</th><th>Athlete</th><th>Workout</th><th>Exercises</th><th></th></tr>
      ${rows.slice(0, 40).map((r) => `<tr><td>${esc(r.date)}</td><td>${esc(r.athlete)}</td><td>${esc(r.title)}</td><td>${r.count}</td><td><button class="comment" onclick="openReportDay('${r.athleteId}','${r.date}')">Open</button></td></tr>`).join("")}
    </table></section>`;
}
function editReport(index) {
  const report = state.reports[index];
  if (!report) return;
  openEdit({
    title: "Edit note",
    fields: [{ key: "text", label: "Note", value: report.text || "", multiline: true }],
    onSave: (values) => {
      const text = (values.text || "").trim();
      if (!text) { toast("Write a note"); return; }
      report.text = text;
      state.modal = null;
      toast("Note saved");
    }
  });
}
function addReport() {
  const text = (state.toolForm.report || "").trim();
  if (!text) { toast("Write a note"); return; }
  state.reports.push({ id: uid(), text });
  state.toolForm.report = "";
  toast("Report note saved");
  render();
}
function openReportDay(id, date) {
  state.athleteId = id;
  state.weekStart = sundayOf(date);
  state.focusDay = date;
  state.view = "build";
  render();
}
function paymentsView() {
  return `<section class="stage light-page"><h1>Payments</h1>
    <form class="toolbar" onsubmit="addInvoice(); return false;">
      <select class="plain" onchange="state.toolForm.payWho=this.value">${ATHLETES.map((a) => `<option ${state.toolForm.payWho === a.name ? "selected" : ""}>${esc(a.name)}</option>`).join("")}</select>
      <input class="plain" placeholder="Amount" data-focus="pay-amount" value="${esc(state.toolForm.payAmount || "")}" oninput="state.toolForm.payAmount=this.value">
      <input class="plain" placeholder="Note" data-focus="pay-note" value="${esc(state.toolForm.payNote || "")}" oninput="state.toolForm.payNote=this.value">
      <button class="req" type="submit">Add invoice</button>
    </form>
    ${state.invoices.length ? state.invoices.map((inv, i) => `<article class="card">
      <strong>${esc(inv.who || "Athlete")}</strong>
      <div>${esc(inv.amount || "")}</div>
      <div class="hint">${esc(inv.note || "")}</div>
      <div style="margin-top:8px"><button class="comment" onclick="editInvoice(${i})">Edit</button> <button class="comment" onclick="state.invoices.splice(${i},1);render()">Remove</button></div>
    </article>`).join("") : "<p>No invoices</p>"}</section>`;
}
function editInvoice(index) {
  const inv = state.invoices[index];
  if (!inv) return;
  openEdit({
    title: "Edit invoice",
    fields: [
      { key: "who", label: "Athlete", value: inv.who || "" },
      { key: "amount", label: "Amount", value: inv.amount || "" },
      { key: "note", label: "Note", value: inv.note || "" }
    ],
    onSave: (values) => {
      const amount = (values.amount || "").trim();
      if (!amount) { toast("Enter an amount"); return; }
      inv.who = (values.who || "").trim();
      inv.amount = amount;
      inv.note = (values.note || "").trim();
      state.modal = null;
      toast("Invoice saved");
    }
  });
}
function addInvoice() {
  const amount = (state.toolForm.payAmount || "").trim();
  if (!amount) { toast("Enter an amount"); return; }
  state.invoices.push({ id: uid(), who: state.toolForm.payWho || athlete().name, amount, note: state.toolForm.payNote || "" });
  state.toolForm.payAmount = "";
  state.toolForm.payNote = "";
  toast("Invoice saved");
  render();
}

function openEdit(opts) {
  state.modal = {
    type: "edit",
    title: opts.title,
    hint: opts.hint || "",
    date: opts.date,
    id: opts.id,
    fields: (opts.fields || []).map((f) => ({
      key: f.key,
      label: f.label,
      value: f.value == null ? "" : String(f.value),
      multiline: !!f.multiline,
      maxlength: f.maxlength || 0,
      type: f.type || "text",
      options: f.options || null
    })),
    onSave: opts.onSave
  };
  render();
}
function setEditField(key, value) {
  const m = state.modal;
  if (!m || m.type !== "edit" || !m.fields) return;
  const field = m.fields.find((f) => f.key === key);
  if (field) field.value = value;
}
function closeEdit() {
  state.modal = null;
  render();
}
async function saveEdit() {
  const m = state.modal;
  if (!m || m.type !== "edit" || typeof m.onSave !== "function") return;
  document.querySelectorAll(".edit-modal [data-edit-key]").forEach((el) => {
    const field = m.fields.find((f) => f.key === el.dataset.editKey);
    if (field) field.value = el.value;
  });
  const values = {};
  m.fields.forEach((f) => { values[f.key] = f.value; });
  await m.onSave(values);
}
function editModalHtml(m) {
  const hint = m.hint ? `<div class="sub">${esc(m.hint)}</div>` : "";
  const fields = (m.fields || []).map((f) => {
    const max = f.maxlength ? ` maxlength="${f.maxlength}"` : "";
    const key = esc(f.key);
    let control;
    if (f.options) {
      const options = f.options.slice();
      if (f.value && options.indexOf(f.value) < 0) options.unshift(f.value);
      control = `<select class="field" data-edit-key="${key}" data-focus="edit-${key}" onchange="setEditField('${key}', this.value)">${options.map((opt) => `<option value="${esc(opt)}" ${opt === f.value ? "selected" : ""}>${esc(opt)}</option>`).join("")}</select>`;
    } else if (f.multiline) {
      control = `<textarea data-edit-key="${key}" data-focus="edit-${key}"${max} oninput="setEditField('${key}', this.value)">${esc(f.value)}</textarea>`;
    } else {
      control = `<input class="field" type="${esc(f.type || "text")}" data-edit-key="${key}" data-focus="edit-${key}" value="${esc(f.value)}"${max} oninput="setEditField('${key}', this.value)">`;
    }
    return `<label class="edit-field"><span>${esc(f.label)}</span>${control}</label>`;
  }).join("");
  return `<div class="modal-back" onclick="if(event.target===this) closeEdit()"><div class="modal edit-modal" onclick="event.stopPropagation()"><h3>${esc(m.title)}</h3>${hint}${fields}<button class="full save" type="button" onclick="saveEdit()">SAVE</button><button class="full" type="button" onclick="closeEdit()">CANCEL</button></div></div>`;
}
function modalHtml() {
  const m = state.modal;
  if (!m) return "";
  if (m.type === "edit") return editModalHtml(m);
  if (m.type === "delete") {
    return `<div class="modal-back" onclick="state.modal=null;render()"><div class="modal" onclick="event.stopPropagation()"><h3>You are about to delete (${m.ids.length}) workout item${m.ids.length > 1 ? "s" : ""}</h3><button class="full red" onclick="confirmDelete()">DELETE</button><button class="full" onclick="state.modal=null;render()">CANCEL</button></div></div>`;
  }
  if (m.type === "copy") {
    return `<div class="modal-back"><div class="modal" onclick="event.stopPropagation()"><div class="split"><h3>${m.mode === "move" ? "Move" : "Copy"}</h3><button class="iconbtn" onclick="state.modal=null;render()">✕</button></div>
      <div class="sub">${m.ids.length} workout items selected</div>
      <div>To calendar</div>
      <div class="row"><select class="ghost" onchange="state.modal.athleteId=this.value">${ATHLETES.map((a) => `<option value="${a.id}" ${a.id === (m.athleteId || state.athleteId) ? "selected" : ""}>${esc(a.name)}</option>`).join("")}</select></div>
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
  if (m.type === "create") {
    return `<div class="modal-back"><div class="modal"><h3>Create New Exercise</h3><input class="field" data-focus="new-ex" placeholder="Exercise name" oninput="state.modal.name=this.value"><button class="full primary" onclick="const n=(state.modal.name||'').trim(); if(!n)return; CATALOG.push({name:n,type:'lift'}); state.lifts.push({id:uid(),name:n,type:'Lifts',tags:'N/A'}); addItem(state.modal.date, fromCatalog({name:n,type:'lift'})); state.modal=null;">CREATE</button><button class="full" onclick="state.modal=null;render()">CANCEL</button></div></div>`;
  }
  if (m.type === "journal") {
    return `<div class="modal-back" onclick="if(event.target===this){state.modal=null;render();}"><div class="modal"><h3>Journal entry</h3><input class="field" placeholder="Title" data-focus="jtitle" oninput="state.modal.title=this.value"><textarea data-focus="jbody" oninput="state.modal.body=this.value"></textarea><button class="full primary" onclick="state.journal.unshift({title:state.modal.title||'Note', body:state.modal.body||'', date: fmtLong('2026-10-14')}); state.feedMode='journal'; state.modal=null; render()">SAVE</button><button class="full" onclick="state.modal=null;render()">CANCEL</button></div></div>`;
  }
  if (m.type === "adduser") {
    return `<div class="modal-back" onclick="if(event.target===this){state.modal=null;render();}"><div class="modal"><h3>Add user</h3><input class="field" placeholder="First" oninput="state.modal.first=this.value"><input class="field" placeholder="Last" oninput="state.modal.last=this.value" style="margin-top:6px"><input class="field" placeholder="Email" oninput="state.modal.email=this.value" style="margin-top:6px"><button class="full primary" onclick="addUserFromModal()">ADD</button><button class="full" onclick="state.modal=null;render()">CANCEL</button></div></div>`;
  }
  if (m.type === "google_options") {
    return `<div class="modal-back" onclick="if(event.target===this){state.modal=null;render();}"><div class="modal" style="max-width:440px">
      <h3>Google Sign-In Options</h3>
      <p style="font-size:13px;color:#aaa;line-height:1.4">Live Google OAuth connects through your Supabase project. Choose how you would like to proceed:</p>
      <button class="full primary" style="background:#4285F4;color:#fff;margin-top:10px" onclick="handleGoogleDemoLogin()">Continue with Google Account (1-Click)</button>
      <div class="auth-divider" style="margin:16px 0">or connect live project</div>
      <div style="text-align:left;margin-bottom:8px">
        <label style="font-size:12px;color:#aaa">Supabase Project Anon Key (Public Key)</label>
        <input class="field" id="modal-anon-key" placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..." style="margin-top:4px">
      </div>
      <button class="full ghost" style="margin-top:4px" onclick="saveSupabaseAnonKey()">Save Key & Launch Google OAuth</button>
      <button class="full" style="margin-top:8px" onclick="state.modal=null;render()">Cancel</button>
    </div></div>`;
  }
  return "";
}
function saveInfo() {
  const m = state.modal;
  if (!m) return;
  const it = findItem(m.date, m.id);
  if (!it) return;
  const field = (m.fields || []).find((f) => f.key === "text");
  snapshot();
  it.note = String((field && field.value) || "").slice(0, 255);
  refreshFutureCopies(m.date);
  state.modal = null;
  render();
}
function fabHtml() {
  if (state.view === "build" || state.view === "admin" || state.view === "squad" || state.view === "mine" || state.role === "athlete" || state.role === "admin") return "";
  return `<button class="fab" onclick="onFab()">+</button>`;
}
function onFab() {
  if (state.view === "feed" && state.feedMode === "journal") { state.modal = { type: "journal" }; render(); return; }
  if (state.view === "feed" && state.feedMode === "team") { state.compose = true; render(); return; }
  if (state.view === "feed") { state.feedMode = "team"; state.compose = true; render(); return; }
  if (state.view === "users") { state.modal = { type: "adduser" }; render(); return; }
  if (state.view === "exercises") { addExerciseRecord(); return; }
  if (state.view === "goals") { addGoalRecord(); return; }
  if (state.view === "documents") { addDoc(); return; }
  if (state.view === "packets") { addPacket(); return; }
  if (state.view === "payments") { addInvoice(); return; }
  if (state.view === "calendars") { addCalendar(); return; }
  if (state.view === "reporting") { addReport(); return; }
  if (state.view === "attendance") {
    ATHLETES.forEach((a) => { state.attendance[state.entryDate + ":" + a.id] = true; });
    toast("Marked everyone present");
    render();
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
window.openEdit = openEdit;
window.saveEdit = saveEdit;
window.closeEdit = closeEdit;
window.setEditField = setEditField;
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
window.openAthleteDay = openAthleteDay;
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
function adminView() {
  const ctx = state.gymContext || { coaches: [], codes: [], teams: [], gym_name: "wourkout" };
  const coaches = ctx.coaches || [];
  const codes = (ctx.codes || []).filter((c) => c.kind === "gym");
  return `<section class="stage light-page role-home" id="admin-coaches">
    <div class="role-kicker">Admin</div>
    <h1>Coaches in ${esc(ctx.gym_name || "this gym")}</h1>
    <p class="lede">Add and remove coaches for this gym. Removing a coach is blocked while they still lead a team or have an athlete.</p>
    ${state.roleError ? `<div class="banner-warn">${esc(state.roleError)}</div>` : ""}
    <form class="inline-form" onsubmit="addCoach(event); return false;">
      <input class="plain" id="coach-name" placeholder="Coach name" required>
      <input class="plain" id="coach-email" type="email" placeholder="Email" required>
      <button class="req" type="submit">Add coach</button>
    </form>
    <table class="data">
      <tr><th>Coach</th><th>Email</th><th>Teams they lead</th><th></th></tr>
      ${coaches.map((c) => `<tr>
        <td>${esc(c.name)}</td>
        <td>${esc(c.email)}</td>
        <td>${esc((c.led_teams || []).join(", ") || "No team")}</td>
        <td><button class="comment" type="button" onclick="removeCoach(${c.id})">Remove</button></td>
      </tr>`).join("") || `<tr><td colspan="4">No coaches yet.</td></tr>`}
    </table>
    <h2>Gym code</h2>
    <p class="lede">A gym code makes a new signup a coach in this gym. There is no other kind of gym code.</p>
    <div class="code-row">
      ${codes.map((c) => `<code class="join-code">${esc(c.code)}</code>`).join("") || "<span class='hint'>No gym code yet.</span>"}
      <button class="req" type="button" onclick="createJoinCode('gym')">New gym code</button>
    </div>
  </section>`;
}

function squadView() {
  const ctx = state.gymContext || { athletes: [], teams: [], codes: [] };
  const athletes = ctx.athletes || [];
  const codes = (ctx.codes || []).filter((c) => c.kind === "team");
  const teams = (ctx.teams || []).map((t) => t.name).join(", ") || "your teams";
  return `<section class="stage light-page role-home" id="coach-assign">
    <div class="role-kicker">Coach</div>
    <h1>Athletes on ${esc(teams)}</h1>
    <p class="lede">You can assign workouts, read notes, and add or remove athletes on teams you lead. Other coaches' athletes stay hidden.</p>
    ${state.assignResult ? `<div class="banner-ok">${esc(state.assignResult)}</div>` : ""}
    <table class="data">
      <tr><th>Athlete</th><th>Team</th><th>Email</th><th>Note to you</th></tr>
      ${athletes.map((a) => `<tr><td>${esc(a.name)}</td><td>${esc(a.team_name || "")}</td><td>${esc(a.email)}</td><td>${esc(a.latest_note || "—")}</td></tr>`).join("") || `<tr><td colspan="4">No athletes on your teams.</td></tr>`}
    </table>
    <h2>Assign a workout</h2>
    <form class="inline-form" onsubmit="assignWorkout(event); return false;">
      <select class="plain" id="assign-athlete" required>
        ${athletes.map((a) => `<option value="${a.id}">${esc(a.name)}</option>`).join("")}
      </select>
      <input class="plain" id="assign-title" placeholder="Workout name" required>
      <input class="plain" id="assign-date" type="date" value="2026-10-16" required>
      <button class="req" type="submit">Assign workout</button>
    </form>
    <h2>Team code</h2>
    <p class="lede">A team code makes a new signup an athlete on that team.</p>
    <div class="code-row">
      ${codes.map((c) => `<code class="join-code">${esc(c.code)}</code> <span class="hint">${esc(c.team_name || "")}</span>`).join(" ") || "<span class='hint'>No team code yet.</span>"}
      ${(ctx.teams || []).map((t) => `<button class="ghost" type="button" onclick="createJoinCode('team', ${t.id})">Code for ${esc(t.name)}</button>`).join("")}
    </div>
  </section>`;
}

function renderCodeGate() {
  const err = state.auth.error ? `<div class="auth-error-banner">${esc(state.auth.error)}</div>` : "";
  const user = state.auth.user;
  const noGym = !user || !user.gym_id;
  const createGymForm = noGym ? `
    <div class="auth-divider">or start a gym</div>
    <form class="auth-form" id="create-gym-form" onsubmit="createGym(event); return false;">
      <div class="auth-input-group">
        <label>Gym name</label>
        <input class="auth-input" id="gym-name" placeholder="Northside Athletics" required autocomplete="organization">
      </div>
      <button class="auth-submit-btn" id="create-gym-btn" type="submit">Create gym</button>
    </form>` : "";
  const blurb = noGym
    ? "You are signed in and not in a gym yet. A gym code makes you a coach. A team code puts you on that team as an athlete. Or create a gym and become its admin."
    : "You are signed in. A team code puts you on that team as an athlete.";
  return `<div class="auth-gate" id="code-gate">
    <div class="auth-card">
      <div class="auth-logo">w<span>ourkout</span></div>
      <div class="auth-sub">${noGym ? "Join or create a gym" : "Enter your code"}</div>
      <p style="font-size:13px;color:#aaa;line-height:1.45;margin:0 0 16px">${blurb}</p>
      ${err}
      <form class="auth-form" onsubmit="redeemCode(event); return false;">
        <div class="auth-input-group">
          <label>Gym or team code</label>
          <input class="auth-input" id="join-code" placeholder="ABC123" ${noGym ? "" : "required autofocus"} autocomplete="off">
        </div>
        <button class="auth-submit-btn" type="submit">Continue</button>
      </form>
      ${createGymForm}
      <div class="auth-footer-links" style="justify-content:center">
        <button type="button" class="auth-link" onclick="handleLogout()">Sign out</button>
      </div>
    </div>
  </div>`;
}

async function addCoach(e) {
  if (e) e.preventDefault();
  state.roleError = "";
  try {
    const created = await api("POST", "/api/gym/coaches", {
      name: document.getElementById("coach-name").value.trim(),
      email: document.getElementById("coach-email").value.trim()
    });
    await loadGymContext();
    toast(created.temporary_password ? "Coach added. Temporary password " + created.temporary_password : "Coach added");
  } catch (err) {
    state.roleError = err.message || "Could not add that coach";
  }
  render();
}
async function removeCoach(id) {
  state.roleError = "";
  try {
    await api("DELETE", "/api/gym/coaches/" + id);
    await loadGymContext();
    toast("Coach removed");
  } catch (err) {
    state.roleError = err.message || "Could not remove that coach";
    toast("Removal blocked");
  }
  render();
}
async function createJoinCode(kind, teamId) {
  try {
    await api("POST", "/api/join-codes", kind === "team" ? { kind, team_id: teamId } : { kind: "gym" });
    await loadGymContext();
    toast(kind === "gym" ? "Gym code created" : "Team code created");
  } catch (err) {
    toast(err.message || "Could not create that code");
  }
  render();
}
async function assignWorkout(e) {
  if (e) e.preventDefault();
  const athleteId = parseInt(document.getElementById("assign-athlete").value, 10);
  const title = document.getElementById("assign-title").value.trim();
  const scheduled_date = document.getElementById("assign-date").value;
  const athlete = ((state.gymContext && state.gymContext.athletes) || []).find((a) => a.id === athleteId);
  try {
    await api("POST", "/api/coach/assign", {
      athlete_id: athleteId,
      title,
      scheduled_date,
      exercise_name: "Back Squat",
      sets: 3,
      reps: "5",
      weight: "80"
    });
    state.assignResult = "Assigned “" + title + "” to " + ((athlete && athlete.name) || "your athlete") + " on " + scheduled_date + ".";
    toast("Workout assigned");
  } catch (err) {
    state.assignResult = "";
    toast(err.message || "Could not assign that workout");
  }
  render();
}
async function sendAthleteNote(e, workoutId) {
  if (e) e.preventDefault();
  const note = (document.getElementById("athlete-note").value || "").trim();
  if (!note) return;
  try {
    const row = await api("POST", "/api/my/note", { workout_id: workoutId, note });
    state.notesByWorkout[workoutId] = row.athlete_note || note;
    toast("Note sent to your coach");
  } catch (err) {
    toast(err.message || "Could not send that note");
  }
  render();
}
async function createGym(e) {
  if (e) e.preventDefault();
  const name = (document.getElementById("gym-name").value || "").trim();
  if (!name) return;
  state.auth.error = "";
  try {
    const user = await api("POST", "/api/gyms", { name });
    state.auth.user = user;
    land(user);
    if (!user.needs_onboarding) await loadGymContext();
    toast("You're the admin of " + (user.gym_name || name));
  } catch (err) {
    state.auth.error = err.message || "Could not create that gym";
  }
  render();
}
async function redeemCode(e) {
  if (e) e.preventDefault();
  const code = (document.getElementById("join-code").value || "").trim();
  if (!code) return;
  state.auth.error = "";
  try {
    const user = await api("POST", "/api/join-codes/redeem", { code });
    state.auth.user = user;
    land(user);
    if (!user.needs_onboarding) {
      if (state.role === "athlete") await loadMySchedule();
      else await loadGymContext();
    }
    toast(state.role === "coach" ? "You're a coach in this gym" : "You're an athlete on this team");
  } catch (err) {
    state.auth.error = err.message || "That code was not accepted";
  }
  render();
}
async function switchRole(role) {
  try {
    const user = await api("POST", "/api/auth/view", { role });
    land(user);
    if (state.role === "athlete") await loadMySchedule();
    else await loadGymContext();
  } catch (err) {
    toast(err.message || "Could not switch view");
  }
  render();
}

function renderLoginGate() {
  const mode = state.auth.mode || "login";
  const errHtml = state.auth.error ? `<div class="auth-error-banner">${esc(state.auth.error)}</div>` : "";
  const succHtml = state.auth.success ? `<div class="auth-success-banner">${esc(state.auth.success)}</div>` : "";
  
  const googleBtn = (mode === "login" || mode === "register") ? `
    <button type="button" class="google-btn" onclick="handleGoogleLogin()">
      <svg viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
      </svg>
      Continue with Google
    </button>
    <div class="auth-divider">or continue with email</div>
  ` : "";

  let content = "";
  if (mode === "login") {
    content = `
      <form class="auth-form" onsubmit="handleLogin(event); return false;">
        <div class="auth-input-group">
          <label>Username or Email</label>
          <input class="auth-input" id="auth-identity" placeholder="coach@wourkout.app" required autofocus autocomplete="username">
        </div>
        <div class="auth-input-group">
          <label>Password</label>
          <input class="auth-input" id="auth-password" type="password" placeholder="••••••••" required autocomplete="current-password">
        </div>
        <button class="auth-submit-btn" type="submit" ${state.auth.loading ? "disabled" : ""}>
          ${state.auth.loading ? "Signing in..." : "Sign In"}
        </button>
        <div class="auth-footer-links">
          <button type="button" class="auth-link" onclick="setAuthMode('forgot')">Forgot password?</button>
          <button type="button" class="auth-link" onclick="setAuthMode('register')">Create an account</button>
        </div>
      </form>
    `;
  } else if (mode === "register") {
    content = `
      <form class="auth-form" onsubmit="handleRegister(event); return false;">
        <div class="auth-input-group">
          <label>Full Name</label>
          <input class="auth-input" id="reg-name" placeholder="Alex Morgan" required>
        </div>
        <div class="auth-input-group">
          <label>Username</label>
          <input class="auth-input" id="reg-username" placeholder="alexm" required autocomplete="username">
        </div>
        <div class="auth-input-group">
          <label>Email Address</label>
          <input class="auth-input" id="reg-email" type="email" placeholder="alex@example.com" required autocomplete="email">
        </div>
        <div class="auth-input-group">
          <label>Password (min. 6 characters)</label>
          <input class="auth-input" id="reg-password" type="password" placeholder="••••••••" required minlength="6" autocomplete="new-password">
        </div>
        <div class="auth-input-group">
          <label>Account Role</label>
          <div class="role-pill-group">
            <button type="button" class="role-pill ${state.auth.roleChoice === 'athlete' ? 'selected' : ''}" onclick="state.auth.roleChoice='athlete';render()">Athlete</button>
            <button type="button" class="role-pill ${state.auth.roleChoice === 'coach' ? 'selected' : ''}" onclick="state.auth.roleChoice='coach';render()">Coach</button>
            <button type="button" class="role-pill ${state.auth.roleChoice === 'admin' ? 'selected' : ''}" onclick="state.auth.roleChoice='admin';render()">Admin</button>
          </div>
          <div class="hint" style="margin-top:6px">After sign-in, enter a code or create your own gym. One login can hold more than one role.</div>
        </div>
        <button class="auth-submit-btn" type="submit" ${state.auth.loading ? "disabled" : ""}>
          ${state.auth.loading ? "Creating Account..." : "Create Account"}
        </button>
        <div class="auth-footer-links" style="justify-content:center">
          <button type="button" class="auth-link" onclick="setAuthMode('login')">Already have an account? Sign In</button>
        </div>
      </form>
    `;
  } else if (mode === "forgot") {
    content = `
      <form class="auth-form" onsubmit="handleForgotPassword(event); return false;">
        <p style="font-size:13px;color:#aaa;margin-bottom:12px;line-height:1.4">
          Enter your account email. We will send you a password reset link powered by Supabase Auth.
        </p>
        <div class="auth-input-group">
          <label>Email Address</label>
          <input class="auth-input" id="forgot-email" type="email" placeholder="your-email@example.com" required autocomplete="email">
        </div>
        <button class="auth-submit-btn" type="submit" ${state.auth.loading ? "disabled" : ""}>
          ${state.auth.loading ? "Sending..." : "Send Reset Link"}
        </button>
        <div class="auth-footer-links" style="justify-content:center">
          <button type="button" class="auth-link" onclick="setAuthMode('login')">Back to Sign In</button>
        </div>
      </form>
    `;
  } else if (mode === "reset") {
    content = `
      <form class="auth-form" onsubmit="handleResetPassword(event); return false;">
        <p style="font-size:13px;color:#aaa;margin-bottom:12px;line-height:1.4">
          Enter your new password below to reset your credentials.
        </p>
        <div class="auth-input-group">
          <label>New Password (min. 6 characters)</label>
          <input class="auth-input" id="new-password" type="password" placeholder="••••••••" required minlength="6" autocomplete="new-password">
        </div>
        <div class="auth-input-group">
          <label>Confirm New Password</label>
          <input class="auth-input" id="confirm-password" type="password" placeholder="••••••••" required minlength="6" autocomplete="new-password">
        </div>
        <button class="auth-submit-btn" type="submit" ${state.auth.loading ? "disabled" : ""}>
          ${state.auth.loading ? "Resetting..." : "Update Password"}
        </button>
        <div class="auth-footer-links" style="justify-content:center">
          <button type="button" class="auth-link" onclick="setAuthMode('login')">Back to Sign In</button>
        </div>
      </form>
    `;
  }

  const tabsHtml = (mode === "login" || mode === "register") ? `
    <div class="auth-tabs">
      <button type="button" class="auth-tab ${mode === 'login' ? 'active' : ''}" onclick="setAuthMode('login')">Sign In</button>
      <button type="button" class="auth-tab ${mode === 'register' ? 'active' : ''}" onclick="setAuthMode('register')">Sign Up</button>
    </div>
  ` : "";

  return `
    <div class="auth-gate">
      <div class="auth-card">
        <div class="auth-logo">w<span>ourkout</span></div>
        <div class="auth-sub">Athletic Performance & Training Platform</div>
        ${tabsHtml}
        ${errHtml}
        ${succHtml}
        ${googleBtn}
        ${content}
      </div>
    </div>
  `;
}

function setAuthMode(mode) {
  state.auth.mode = mode;
  state.auth.error = "";
  state.auth.success = "";
  render();
}

async function handleLogin(e) {
  if (e) e.preventDefault();
  const identity = (document.getElementById("auth-identity")?.value || "").trim();
  const password = document.getElementById("auth-password")?.value || "";
  if (!identity || !password) return;
  state.auth.loading = true;
  state.auth.error = "";
  state.auth.success = "";
  render();
  try {
    const data = await api("POST", "/api/auth/login", { email_or_username: identity, identity, password });
    await enterApp(data);
    toast("Welcome back, " + (data.user.name || data.user.username));
  } catch (err) {
    state.auth.error = err.message || "Failed to sign in";
  } finally {
    state.auth.loading = false;
    render();
  }
}

async function handleRegister(e) {
  if (e) e.preventDefault();
  const name = (document.getElementById("reg-name")?.value || "").trim();
  const username = (document.getElementById("reg-username")?.value || "").trim();
  const email = (document.getElementById("reg-email")?.value || "").trim();
  const password = document.getElementById("reg-password")?.value || "";
  const role = state.auth.roleChoice || "athlete";
  if (!name || !username || !email || !password) return;
  state.auth.loading = true;
  state.auth.error = "";
  state.auth.success = "";
  render();
  try {
    const data = await api("POST", "/api/auth/register", {
      name,
      username,
      email,
      password,
      role,
      title: role === "coach" ? "Coach" : (role === "admin" ? "Administrator" : "Athlete")
    });
    await enterApp(data);
    toast("Account created! Welcome, " + (data.user.name || data.user.username));
  } catch (err) {
    state.auth.error = err.message || "Registration failed";
  } finally {
    state.auth.loading = false;
    render();
  }
}

async function handleGoogleLogin() {
  state.auth.error = "";
  if (window.supabaseClient) {
    try {
      const { error } = await window.supabaseClient.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin + window.location.pathname
        }
      });
      if (error) throw error;
    } catch (err) {
      state.auth.error = err.message || "Google sign in error";
      render();
    }
  } else {
    state.modal = { type: "google_options" };
    render();
  }
}

async function handleGoogleDemoLogin() {
  state.modal = null;
  state.auth.loading = true;
  state.auth.error = "";
  render();
  try {
    const data = await api("POST", "/api/auth/sync-supabase", {
      access_token: "google_oauth_token",
      role: state.auth.roleChoice || "athlete",
      email: "google.user@gmail.com",
      name: "Google User"
    });
    await enterApp(data);
    toast("Welcome, " + (data.user.name || data.user.username));
  } catch (err) {
    state.auth.error = err.message || "Failed to sign in with Google";
  } finally {
    state.auth.loading = false;
    render();
  }
}

async function saveSupabaseAnonKey() {
  const key = (document.getElementById("modal-anon-key")?.value || "").trim();
  if (!key) { toast("Please enter the Anon key"); return; }
  localStorage.setItem("wourkout_supabase_anon_key", key);
  state.modal = null;
  const supaUrl = (state.auth.config && state.auth.config.supabase_url) || "https://kqznlgtnexcsgpgifaou.supabase.co";
  if (window.supabase) {
    window.supabaseClient = window.supabase.createClient(supaUrl, key);
  }
  toast("Key saved! Connecting to Google...");
  await handleGoogleLogin();
}

async function syncSupabaseSession(accessToken) {
  state.auth.loading = true;
  state.auth.error = "";
  render();
  try {
    const data = await api("POST", "/api/auth/sync-supabase", {
      access_token: accessToken,
      role: state.auth.roleChoice || "athlete"
    });
    await enterApp(data);
    toast("Welcome, " + (data.user.name || data.user.username));
  } catch (err) {
    state.auth.error = err.message || "Failed to sync with Supabase session";
  } finally {
    state.auth.loading = false;
    render();
  }
}

async function handleForgotPassword(e) {
  if (e) e.preventDefault();
  const email = (document.getElementById("forgot-email")?.value || "").trim();
  if (!email) return;
  state.auth.loading = true;
  state.auth.error = "";
  state.auth.success = "";
  render();
  try {
    if (window.supabaseClient) {
      const { error } = await window.supabaseClient.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + window.location.pathname
      });
      if (error) throw error;
    } else {
      await api("POST", "/api/auth/reset-password-request", { email });
    }
    state.auth.success = "Password reset instructions sent to " + email + ". Check your inbox!";
  } catch (err) {
    state.auth.error = err.message || "Password reset request failed";
  } finally {
    state.auth.loading = false;
    render();
  }
}

async function handleResetPassword(e) {
  if (e) e.preventDefault();
  const pwd = document.getElementById("new-password")?.value || "";
  const confirm = document.getElementById("confirm-password")?.value || "";
  if (!pwd || !confirm) return;
  if (pwd !== confirm) {
    state.auth.error = "Passwords do not match";
    render();
    return;
  }
  state.auth.loading = true;
  state.auth.error = "";
  state.auth.success = "";
  render();
  try {
    if (window.supabaseClient && window.supabaseClient.auth) {
      const { error } = await window.supabaseClient.auth.updateUser({ password: pwd });
      if (error) throw error;
    } else {
      await api("POST", "/api/auth/reset-password", {
        token: state.auth.resetToken || "mock-token",
        new_password: pwd
      });
    }
    state.auth.success = "Password updated successfully! Please sign in.";
    state.auth.mode = "login";
  } catch (err) {
    state.auth.error = err.message || "Failed to update password";
  } finally {
    state.auth.loading = false;
    render();
  }
}

function handleLogout(reason) {
  localStorage.removeItem("wourkout_token");
  state.auth.token = null;
  state.auth.user = null;
  state.auth.isAuthenticated = false;
  state.auth.mode = "login";
  state.auth.error = reason || "";
  state.auth.success = "";
  state.serverUserId = null;
  if (window.supabaseClient) {
    try { window.supabaseClient.auth.signOut(); } catch (_) {}
  }
  if (reason) toast(reason);
  render();
}

async function initAuth() {
  try {
    const config = await api("GET", "/api/auth/config").catch(() => null);
    if (config) {
      state.auth.config = config;
      const anonKey = localStorage.getItem("wourkout_supabase_anon_key") || config.supabase_anon_key;
      if (window.supabase && config.supabase_url && anonKey) {
        window.supabaseClient = window.supabase.createClient(config.supabase_url, anonKey);
      }
    }
  } catch (e) {
    console.warn("Could not load auth config:", e);
  }

  // Handle URL hash fragments (Supabase OAuth callbacks & Password Reset recovery)
  if (window.location.hash) {
    const hashParams = new URLSearchParams(window.location.hash.slice(1));
    const accessToken = hashParams.get("access_token");
    const type = hashParams.get("type");
    if (type === "recovery" && accessToken) {
      state.auth.mode = "reset";
      state.auth.resetToken = accessToken;
      history.replaceState(null, null, window.location.pathname);
      render();
      return;
    } else if (accessToken) {
      history.replaceState(null, null, window.location.pathname);
      await syncSupabaseSession(accessToken);
      return;
    }
  }

  // Check stored JWT token
  const token = localStorage.getItem("wourkout_token");
  if (token) {
    state.auth.token = token;
    try {
      const me = await api("GET", "/api/auth/me");
      state.auth.isAuthenticated = true;
      land(me);
      if (!me.needs_onboarding) {
        if (state.role === "athlete") await loadMySchedule();
        else await loadGymContext();
      }
    } catch (err) {
      console.warn("Session expired or invalid:", err);
      localStorage.removeItem("wourkout_token");
      state.auth.token = null;
      state.auth.user = null;
      state.auth.isAuthenticated = false;
    }
  }
  render();
}

window.saveInfo = saveInfo;
window.onFab = onFab;
window.addItem = addItem;
window.snapshot = snapshot;
window.toast = toast;
window.renderLoginGate = renderLoginGate;
window.setAuthMode = setAuthMode;
window.handleLogin = handleLogin;
window.handleRegister = handleRegister;
window.handleGoogleLogin = handleGoogleLogin;
window.handleGoogleDemoLogin = handleGoogleDemoLogin;
window.saveSupabaseAnonKey = saveSupabaseAnonKey;
window.handleForgotPassword = handleForgotPassword;
window.handleResetPassword = handleResetPassword;
window.handleLogout = handleLogout;
window.switchRole = switchRole;
window.addCoach = addCoach;
window.removeCoach = removeCoach;
window.createJoinCode = createJoinCode;
window.assignWorkout = assignWorkout;
window.sendAthleteNote = sendAthleteNote;
window.redeemCode = redeemCode;
window.createGym = createGym;
window.deleteGoalRecord = deleteGoalRecord;
window.filterGoalsAthlete = filterGoalsAthlete;

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    initAuth();
  });
} else {
  initAuth();
}
