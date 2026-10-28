/* wourkout prototype — calendar builder and coach tools from the screen recordings. */
const LETTERS = "ABCDEFGHIJ".split("");
const LETTER_COLOR = {
  A: "#3ddc84", B: "#3b82f6", C: "#a855f7", D: "#eab308", E: "#f59e0b",
  F: "#ef4444", G: "#14b8a6", H: "#ec4899", I: "#84cc16", J: "#6366f1"
};
const PROP_LABEL = {
  load: "Load", rest: "Rest", restRep: "Rest/Rep", distance: "Distance",
  tempo: "Tempo", velocity: "Velocity",
  power: "Peak Power", pct: "%PR", intensity: "Intensity"
};
const PROP_FIELDS = [
  ["load", "loads"],
  ["rest", "rests"],
  ["restRep", "restReps"],
  ["distance", "distances"],
  ["tempo", "tempos"],
  ["velocity", "velocities"],
  ["power", "powers"],
  ["pct", "pcts"]
];
const EXERCISE_CATEGORIES = [
  "Strength",
  "Warm up",
  "Speed/agility/cardio",
  "Cooldown",
  "Circuit",
  "Questionnaire",
  "Notes"
];
const ATHLETES = [];
const COACHES = [];
const GROUPS = [];
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
  { name: "Sprint Development - Base", type: "circuit" },
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
  const sets = partial && partial.sets === 0 ? 0 : ((partial && partial.sets) || 1);
  const reps = (partial && partial.reps) || (sets ? Array(sets).fill((partial && partial.rep) || 1) : []);
  const base = {
    id: uid(), type: "lift", letter: "A", sets, reps,
    loads: Array(sets).fill(""), rests: Array(sets).fill(""),
    restReps: Array(sets).fill(""), distances: Array(sets).fill(""),
    intensities: Array(sets).fill(""), intensityKind: "",
    tempos: Array(sets).fill(""), velocities: Array(sets).fill(""),
    powers: Array(sets).fill(""), pcts: Array(sets).fill(""),
    props: [], note: "", detail: "", questions: [], requireResponse: false,
    completionOnly: false, trackReps: true, trackTime: false, trackVolume: false, videoUrl: ""
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

function exerciseRecord(name) {
  const key = String(name || "").toLowerCase();
  return state.serverExercises.find((e) => String(e.name || "").toLowerCase() === key) || null;
}
function libraryDefaultsFrom(record) {
  if (!record) return null;
  const sets = parseInt(record.default_sets, 10);
  return {
    sets: sets > 0 ? sets : 3,
    reps: record.default_reps != null ? String(record.default_reps) : "10",
    load: record.default_load || "",
    rest: record.default_rest || "",
    tempo: record.default_tempo || "",
    velocity: record.default_velocity || "",
    power: record.default_power || "",
    pct: record.default_pct || "",
    restRep: record.default_rest_rep || "",
    distance: record.default_distance || "",
    intensityKind: record.intensity_kind || "",
    intensityValue: record.intensity_value || "",
    stations: record.default_stations || "",
    note: record.default_notes || "",
    videoUrl: record.video_url || "",
    completionOnly: !!record.completion_only
  };
}
function withPropertyDefaults(partial, defaults) {
  const sets = partial.sets || 1;
  const props = [];
  const extra = {};
  if (defaults) {
    PROP_FIELDS.forEach(([key, arr]) => {
      const value = defaults[key];
      if (value != null && String(value) !== "") {
        props.push(key);
        extra[arr] = Array(sets).fill(String(value));
      }
    });
    if (defaults.intensityKind && String(defaults.intensityValue || "") !== "") {
      props.push("intensity");
      extra.intensityKind = defaults.intensityKind;
      extra.intensities = Array(sets).fill(String(defaults.intensityValue));
    }
    partial.libraryDefaults = {
      sets: defaults.sets, reps: defaults.reps, load: defaults.load, rest: defaults.rest,
      restRep: defaults.restRep, distance: defaults.distance,
      tempo: defaults.tempo, velocity: defaults.velocity, power: defaults.power, pct: defaults.pct,
      intensityKind: defaults.intensityKind || "", intensity: defaults.intensityValue || ""
    };
  }
  partial.props = props;
  return Object.assign(partial, extra);
}
function fromCatalog(entry) {
  const defaults = libraryDefaultsFrom(exerciseRecord(entry.name));
  if (entry.type === "note") {
    return item({
      name: entry.name, type: "note", letter: "A", sets: 0, reps: [],
      note: defaults ? (defaults.note || "") : "", trackReps: false, completionOnly: false,
      videoUrl: defaults && defaults.videoUrl ? defaults.videoUrl : ""
    });
  }
  if (entry.type === "questionnaire") {
    return item({
      name: entry.name, type: "questionnaire", letter: "A", sets: 1, reps: [1],
      questions: QUESTIONS.slice(), requireResponse: true, trackReps: false,
      videoUrl: defaults && defaults.videoUrl ? defaults.videoUrl : ""
    });
  }
  if (entry.type === "circuit") {
    const detail = defaults
      ? (defaults.stations || "")
      : (entry.name.includes("Sprint") ? SPRINT_DETAIL : entry.name.includes("Mobility") || entry.name.includes("Warm") ? MOBILITY_DETAIL : "Complete 1 round - 20 seconds on, 20 seconds off");
    const sets = defaults ? Math.max(1, Math.min(10, parseInt(defaults.sets, 10) || 1)) : 1;
    const rep = defaults ? (defaults.reps || "1") : "1";
    return item(withPropertyDefaults({
      name: entry.name, type: "circuit", letter: "A", sets, reps: Array(sets).fill(rep),
      detail, note: defaults ? (defaults.note || "") : "", completionOnly: true, trackReps: false,
      videoUrl: defaults && defaults.videoUrl ? defaults.videoUrl : ""
    }, defaults));
  }
  if (entry.type === "break") return item({ name: "Session Break", type: "break", letter: "", sets: 0, reps: [], trackReps: false });
  if (entry.type === "rest") return item({ name: "Rest Time", type: "rest", letter: "", sets: 1, reps: [60], note: "60s", trackReps: false });
  if (entry.type === "video") return item({ name: "Video", type: "video", letter: "", sets: 0, reps: [], trackReps: false });
  const sets = defaults ? Math.max(1, Math.min(10, parseInt(defaults.sets, 10) || 3)) : 3;
  const rep = defaults ? (defaults.reps != null ? defaults.reps : "10") : "10";
  return item(withPropertyDefaults({
    name: entry.name, type: "lift", letter: "A", sets, reps: Array(sets).fill(rep),
    videoUrl: defaults && defaults.videoUrl ? defaults.videoUrl : "",
    completionOnly: !!(defaults && defaults.completionOnly)
  }, defaults));
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

const APP_TODAY = new Date().toISOString().slice(0, 10);

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

const state = {
  view: "build",
  athleteId: "",
  weekStart: sundayOf(APP_TODAY),
  viewMode: "month",
  calendars: {},
  focusDay: APP_TODAY,
  hoverDay: APP_TODAY,
  searchDay: null,
  searchQ: "",
  pendingFocus: "",
  editor: null,
  propMenu: false,
  trackMenu: false,
  letterMenu: false,
  optionsMenu: false,
  supersetMenu: false,
  dayMenu: null,
  recurMenu: null,
  colorMenu: null,
  sidebar: false,
  preview: null,
  previewTab: "exercise",
  modal: null,
  clipboard: null,
  clipHot: null,
  pick: null,
  buildOrigin: null,
  buildWeekCount: 0,
  buildScrollTop: 0,
  buildPrepend: null,
  buildJumpWeek: "",
  playingVideo: "",
  chainLetterFor: "",
  weekNotes: {},
  weekNotesFolded: readFoldedWeeks(),
  undo: [],
  history: [],
  toast: "",
  navMenu: null,
  navOpen: false,
  entryAthlete: null,
  entryDate: APP_TODAY,
  entryOpen: false,
  logs: {},
  feedMode: "athletes",
  feedTime: "all",
  feedWho: "all",
  feedQ: "",
  comments: {},
  posts: [],
  journal: [],
  userTab: "athletes",
  userQ: "",
  userSort: "last",
  coaches: [],
  athletes: [],
  groups: [],
  joinCodes: [],
  lifts: CATALOG.filter((c) => c.type !== "break").map((c, i) => ({ id: "l" + i, name: c.name, type: c.type === "lift" ? "Lifts" : c.type === "circuit" ? "Circuits" : c.type === "questionnaire" ? "Questionnaires" : "Lifts", tags: "N/A" })),
  liftQ: "",
  managing: "All",
  goals: [],
  docs: [],
  packets: [],
  attendance: {},
  invoices: [],
  reports: [],
  serverExercises: [],
  chains: [],
  serverRecords: [],
  personalBests: [],
  buildPanel: null,
  panelBests: {},
  toolForm: {},
  recurPick: 4,
  evals: [],
  prs: {},
  teamMode: "feed",
  teamGroup: "",
  teamFilter: false,
  boardAthlete: "",
  boardDate: "",
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
    regDraft: { name: "", username: "", email: "", password: "" },
    config: { supabase_url: "", supabase_anon_key: "", google_auth_enabled: false }
  },
  gymContext: null,
  gymActivity: null,
  calendarLoaded: {},
  calendarLoading: {},
  hiddenExerciseIds: [],
  coachSessionFor: "",
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
  if (!c[date]) {
    c[date] = blankDay(date);
    if (state.calendarLoaded[athleteId]) c[date].hydrated = true;
  }
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

function normalizeUnit(value) {
  return String(value || "").toLowerCase() === "lbs" ? "lbs" : "kg";
}
function normalizeDistanceUnit(value) {
  const v = String(value || "").trim().toLowerCase();
  if (v === "km" || v === "kilometres" || v === "kilometers" || v === "kilometre" || v === "kilometer") return "km";
  if (v === "yd" || v === "yard" || v === "yards") return "yd";
  if (v === "mi" || v === "mile" || v === "miles") return "mi";
  return "m";
}
function distanceWord(unit) {
  return { m: "metres", km: "km", yd: "yards", mi: "miles" }[normalizeDistanceUnit(unit)] || "metres";
}
function distanceChoice(unit) {
  return distanceWord(unit);
}
function unitWord(unit) {
  return unit === "lbs" ? "lbs" : "kg";
}
function unitTitle(unit) {
  return unit === "lbs" ? "Lbs" : "Kg";
}
function entryPerson() {
  if (state.role === "athlete") {
    const me = state.auth && state.auth.user;
    if (me) return { id: "u" + me.id, serverId: me.id, load_unit: me.load_unit, distance_unit: me.distance_unit, isGroup: false };
  }
  return ATHLETES.find((a) => a.id === state.entryAthlete)
    || buildAthletes().find((a) => a.id === state.entryAthlete && !a.isGroup)
    || null;
}
function entryUnit() {
  const person = entryPerson();
  return normalizeUnit(person && person.load_unit);
}
function displayUnit() {
  if (state.view === "entry" || state.view === "mine" || state.role === "athlete") return entryUnit();
  const person = athlete();
  if (!person || person.isGroup || person.id === "none") return "";
  return normalizeUnit(person.load_unit);
}
function entryDistanceUnit() {
  const person = entryPerson();
  return normalizeDistanceUnit(person && person.distance_unit);
}
function displayDistanceUnit() {
  if (state.view === "entry" || state.view === "mine" || state.role === "athlete") return entryDistanceUnit();
  const person = athlete();
  if (!person || person.isGroup || person.id === "none") return "m";
  return normalizeDistanceUnit(person.distance_unit);
}
function doseText(it, reps) {
  const count = it.sets || reps.length || 1;
  const rep0 = reps.length ? reps[0] : (it.trackTime ? "0" : 1);
  const same = !reps.length || reps.every((r) => String(r) === String(rep0));
  if (it.trackTime) {
    const mark = (v) => String(v == null || v === "" ? "0" : v).replace(/s$/i, "") + "s";
    return same ? count + " x " + mark(rep0) : reps.map(mark).join(", ");
  }
  return same ? count + " x " + rep0 : reps.join(", ");
}
function loadPhrase(loads, unit) {
  if (!(loads || []).some((x) => x !== "" && x != null)) return "";
  const suffix = unit ? " " + unitWord(unit) : "";
  return " · " + loads.map((x) => (x === "" || x == null ? "—" : String(x) + suffix)).join("/");
}
function dayHeading(day) {
  if (!day) return "Add Workout Name";
  if (!(day.items || []).length && (day.savedWorkoutId || day.title === "Rest")) return "Rest";
  return day.title || "Add Workout Name";
}
function scriptLine(it, opts) {
  if (it.type === "note") {
    const line = String(it.note || "").split("\n").filter(Boolean)[0] || "";
    return line || "Note";
  }
  if (it.type === "questionnaire") return (it.questions || []).length + " items";
  if (it.type === "break") return "Divider";
  if (it.type === "video") return it.videoUrl || "Video";
  if (it.type === "rest") return (it.reps[0] || 60) + "s";
  const reps = (it.reps || []).slice(0, it.sets || 1);
  const loads = (it.loads || []).slice(0, it.sets || 1);
  const rests = (it.rests || []).slice(0, it.sets || 1);
  const plain = opts && opts.plain;
  const unit = plain ? "" : (opts && Object.prototype.hasOwnProperty.call(opts, "unit") ? (opts.unit || "") : displayUnit());
  const vol = doseText(it, reps);
  const loadTxt = loadPhrase(loads, unit);
  const restTxt = rests.some((x) => x !== "" && x != null) ? " · rest " + rests.map((x) => x || "—").join("/") + "s" : "";
  const restReps = (it.restReps || []).slice(0, it.sets || 1);
  const restRepTxt = restReps.some((x) => x !== "" && x != null) ? " · rest/rep " + restReps.map((x) => x || "—").join("/") + "s" : "";
  const distances = (it.distances || []).slice(0, it.sets || 1);
  const distUnit = plain ? "" : (" " + distanceWord(displayDistanceUnit()));
  const distTxt = distances.some((x) => x !== "" && x != null) ? " · " + distances.map((x) => (x === "" || x == null ? "—" : String(x) + distUnit)).join("/") : "";
  if (it.type === "circuit") {
    return (it.detail || "Complete 1 round").split("\n")[0];
  }
  return vol + loadTxt + restTxt + restRepTxt + distTxt + (it.note ? " · " + it.note : "");
}
function stats(day) {
  let s = 0, r = 0, v = 0;
  day.items.forEach((it) => {
    if (it.type === "break" || it.type === "video" || it.type === "questionnaire" || it.type === "note") return;
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
  ["loads", "rests", "restReps", "distances", "intensities", "tempos", "velocities", "powers", "pcts"].forEach((k) => { it[k] = grow(it[k] || [], ""); });
}

function closeFloats() {
  state.searchDay = null;
  state.editor = null;
  state.propMenu = false;
  state.trackMenu = false;
  state.letterMenu = false;
  state.optionsMenu = false;
  state.supersetMenu = false;
  state.dayMenu = null;
  state.recurMenu = null;
  state.colorMenu = null;
  state.navMenu = null;
  state.teamFilter = false;
  state.athleteMenu = false;
}
function renderSoon() {
  clearTimeout(renderSoon._t);
  renderSoon._t = setTimeout(render, 0);
}
function render() {
  const root = document.getElementById("app");
  if (!root) return;
  const active = document.activeElement;
  const focusId = active && active.dataset ? active.dataset.focus : null;
  const selStart = active && active.selectionStart;
  const selEnd = active && active.selectionEnd;
  document.querySelectorAll("body > .search-pop").forEach((el) => el.remove());
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
  root.className = light ? "light" : state.view === "build" ? "fit" : "";
  const toastHtml = state.toast ? `<div class="toast">${esc(state.toast)}</div>` : "";
  const pending = state.pendingFocus;
  if (pending) state.pendingFocus = "";
  root.innerHTML = nav() + '<div class="shell">' + body() + "</div>" + toastHtml + modalHtml();
  placeSearchPop();
  placeEditorPop();
  const focusKey = pending || focusId;
  if (focusKey) {
    const el = document.querySelector(`[data-focus="${focusKey}"]`);
    if (el) {
      el.focus();
      if (!pending && selStart != null && el.setSelectionRange) {
        try { el.setSelectionRange(selStart, selEnd == null ? selStart : selEnd); } catch (e) { /* ignore */ }
      }
    }
  }
  restoreBuildScroll();
}

function placeSearchPop() {
  const pop = document.querySelector(".search-pop");
  if (!pop || !state.searchDay) return;
  const day = document.querySelector('.day[data-day="' + state.searchDay + '"]');
  const anchor = day && day.querySelector("button.add-ex");
  if (!anchor) return;
  document.body.appendChild(pop);
  pop.classList.add("is-fixed");
  const margin = 8;
  const gap = 6;
  const header = document.querySelector(".topnav");
  const minTop = (header ? header.getBoundingClientRect().bottom : 0) + margin;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const maxW = Math.max(160, vw - margin * 2);
  const maxH = Math.max(160, vh - minTop - margin);
  pop.style.position = "fixed";
  pop.style.right = "auto";
  pop.style.bottom = "auto";
  pop.style.width = Math.min(280, maxW) + "px";
  pop.style.maxHeight = maxH + "px";
  pop.style.left = "0px";
  pop.style.top = minTop + "px";
  const pw = pop.offsetWidth;
  const ph = Math.min(pop.scrollHeight, maxH);
  const rect = anchor.getBoundingClientRect();
  let top = rect.top - ph - gap;
  const below = rect.bottom + gap;
  if (top < minTop && below + ph <= vh - margin) top = below;
  if (top < minTop) top = minTop;
  if (top + ph > vh - margin) top = Math.max(minTop, vh - margin - ph);
  let left = rect.left;
  if (left + pw > vw - margin) left = vw - margin - pw;
  if (left < margin) left = margin;
  pop.style.top = Math.round(top) + "px";
  pop.style.left = Math.round(left) + "px";
  pop.classList.add("is-placed");
}

function placeEditorPop() {
  const pop = document.querySelector(".editor.build-editor");
  if (!pop || !state.editor) return;
  const day = document.querySelector('.day[data-day="' + state.editor.day + '"]');
  const row = day && day.querySelector('.ex[data-id="' + state.editor.id + '"]');
  const anchor = row || day;
  if (!anchor) return;
  const margin = 8;
  const gap = 6;
  const header = document.querySelector(".topnav");
  const minTop = (header ? header.getBoundingClientRect().bottom : 0) + margin;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const pw = pop.offsetWidth;
  const ph = pop.offsetHeight;
  const column = (day || anchor).getBoundingClientRect();
  const rect = anchor.getBoundingClientRect();
  let left = column.right + gap;
  if (left + pw > vw - margin) left = column.left - gap - pw;
  if (left < margin) left = Math.max(margin, Math.min(vw - margin - pw, rect.left));
  let top = rect.top - 8;
  if (top + ph > vh - margin) top = vh - margin - ph;
  if (top < minTop) top = minTop;
  pop.style.left = Math.round(left) + "px";
  pop.style.top = Math.round(top) + "px";
  pop.classList.add("is-placed");
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
  if (state.role === "athlete") {
    await loadMySchedule();
    await loadOwnJournal();
  } else await loadGymContext();
  if (state.role !== "athlete") loadExercises();
}
const NOTE_SKIP = {
  Rests: 1, RestReps: 1, Distances: 1, Intensities: 1, IntensityKind: 1,
  Tempos: 1, Velocities: 1, Powers: 1, Pcts: 1, Props: 1, Flags: 1, Additional: 1, Seeded: 1
};
function taggedValue(lines, label) {
  const line = lines.find((row) => row.indexOf(label + ":") === 0) || "";
  return line ? line.slice(label.length + 1) : "";
}
function splitTag(lines, label) {
  const value = taggedValue(lines, label);
  return value ? value.split(",") : [];
}
function parseNotes(notes, restSeconds) {
  const lines = String(notes || "").split("\n");
  const plainLines = lines.filter((line) => !NOTE_SKIP[line.split(":")[0]] && line.trim() !== "");
  let rests = splitTag(lines, "Rests");
  if (!rests.length && restSeconds) rests = [String(restSeconds)];
  const additional = lines.filter((line) => line.indexOf("Additional:") === 0).map((line) => line.slice("Additional:".length)).join("\n");
  return {
    plainLines,
    rests,
    tempos: splitTag(lines, "Tempos"),
    velocities: splitTag(lines, "Velocities"),
    powers: splitTag(lines, "Powers"),
    pcts: splitTag(lines, "Pcts"),
    restReps: splitTag(lines, "RestReps"),
    distances: splitTag(lines, "Distances"),
    intensities: splitTag(lines, "Intensities"),
    intensityKind: taggedValue(lines, "IntensityKind"),
    props: splitTag(lines, "Props").filter(Boolean),
    flags: splitTag(lines, "Flags"),
    seeded: splitTag(lines, "Seeded").filter(Boolean),
    additional
  };
}
function inferProps(parsed, loads) {
  const props = parsed.props.slice();
  const add = (key, arr) => {
    if (!props.includes(key) && (arr || []).some((x) => x !== "" && x != null)) props.push(key);
  };
  add("load", loads);
  add("rest", parsed.rests);
  add("restRep", parsed.restReps);
  add("distance", parsed.distances);
  add("tempo", parsed.tempos);
  add("velocity", parsed.velocities);
  add("power", parsed.powers);
  add("pct", parsed.pcts);
  if (parsed.intensityKind && props.indexOf("intensity") < 0) props.push("intensity");
  return props;
}
function itemNotes(it) {
  const sets = it.sets || 1;
  const lines = [];
  if (it.type === "circuit") {
    if (it.detail) lines.push(it.detail);
    String(it.note || "").split("\n").forEach((line) => { if (line) lines.push("Additional:" + line); });
  } else if (it.note) {
    lines.push(it.note);
  }
  if ((it.props || []).length) lines.push("Props:" + it.props.join(","));
  const flags = [];
  if (it.trackTime) flags.push("trackTime");
  if (it.type === "circuit" || it.type === "questionnaire") {
    if (it.trackReps) flags.push("trackReps");
  } else if (it.trackReps === false && !it.trackTime) flags.push("noTrackReps");
  if (it.trackVolume) flags.push("trackVolume");
  if (it.type === "circuit" && it.completionOnly === false) flags.push("noCompletionOnly");
  else if (it.completionOnly) flags.push("completionOnly");
  if (flags.length) lines.push("Flags:" + flags.join(","));
  const seeded = Object.keys(it.fieldSeed || {}).filter((key) => it.fieldSeed[key]);
  if (seeded.length) lines.push("Seeded:" + seeded.join(","));
  if (it.intensityKind) lines.push("IntensityKind:" + it.intensityKind);
  const keys = {
    Rests: "rests", RestReps: "restReps", Distances: "distances", Intensities: "intensities",
    Tempos: "tempos", Velocities: "velocities", Powers: "powers", Pcts: "pcts"
  };
  Object.keys(keys).forEach((label) => {
    const tagged = taggedList(label, (it[keys[label]] || []).slice(0, sets));
    if (tagged) lines.push(tagged);
  });
  return lines.filter(Boolean).join("\n");
}
function workoutToDayItems(workout) {
  if (!workout || !Array.isArray(workout.exercises)) return [];
  return workout.exercises.slice().sort((a, b) => (a.order_index || 0) - (b.order_index || 0)).map((we) => {
    const parsed = parseNotes(we.notes, we.rest_seconds);
    const flags = parsed.flags;
    const trackTime = flags.indexOf("trackTime") >= 0;
    const reps = String(we.target_reps || "1").split(",").map((part) => {
      const value = part.trim();
      return trackTime ? value.replace(/s$/i, "") : value;
    });
    const loads = String(we.target_weight || "").split(",");
    const cat = String((we.exercise && we.exercise.category) || "");
    const type = dayItemType(cat, parsed);
    const sets = type === "note" ? 0 : (we.prescribed_sets || 1);
    return item({
      id: "wx" + we.id,
      weId: we.id,
      name: (we.exercise && we.exercise.name) || "Exercise",
      letter: we.chain_instance ? (we.superset_group || "") : (we.superset_group || "A"),
      type,
      sets,
      reps: type === "note" ? [] : reps,
      loads,
      rests: parsed.rests.length ? parsed.rests : Array(sets).fill(""),
      restReps: parsed.restReps.length ? parsed.restReps : Array(sets).fill(""),
      distances: parsed.distances.length ? parsed.distances : Array(sets).fill(""),
      intensities: parsed.intensities.length ? parsed.intensities : Array(sets).fill(""),
      intensityKind: parsed.intensityKind || "",
      tempos: parsed.tempos,
      velocities: parsed.velocities,
      powers: parsed.powers,
      pcts: parsed.pcts,
      props: inferProps(parsed, loads),
      detail: type === "circuit" ? parsed.plainLines.join("\n") : "",
      note: type === "circuit"
        ? parsed.additional
        : (parsed.plainLines.join("\n") || (type === "note" ? ((we.exercise && we.exercise.default_notes) || "") : "")),
      questions: type === "questionnaire" ? (parsed.plainLines.length ? parsed.plainLines : QUESTIONS.slice()) : [],
      trackTime,
      trackReps: trackTime
        ? false
        : ((type === "circuit" || type === "questionnaire") ? flags.indexOf("trackReps") >= 0 : flags.indexOf("noTrackReps") < 0),
      trackVolume: flags.indexOf("trackVolume") >= 0,
      completionOnly: type === "circuit" ? flags.indexOf("noCompletionOnly") < 0 : flags.indexOf("completionOnly") >= 0,
      fieldSeed: Object.fromEntries((parsed.seeded || []).map((key) => [key, true])),
      exerciseId: we.exercise_id,
      videoUrl: (we.exercise && we.exercise.video_url) || "",
      chainId: we.chain_id || null,
      chainInstance: we.chain_instance || "",
      chainName: we.chain_name || "",
      chainKind: we.chain_kind || "",
      chainOrder: we.chain_order || 0,
      chainCoachOpen: !!we.chain_coach_open,
      chainAthleteOpen: !!we.chain_athlete_open
    });
  });
}

const autosaveTimers = {};
const daySaveLock = {};
const AUTOSAVE_MS = 500;

function daySaveKey(athleteId, date) {
  return athleteId + "\n" + date;
}
function draftStoreKey() {
  const id = state.auth && state.auth.user && state.auth.user.id;
  return "wourkout_day_drafts:" + (id || "local");
}
function readDrafts() {
  try {
    const raw = localStorage.getItem(draftStoreKey());
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (err) {
    return {};
  }
}
function writeDrafts(all) {
  try {
    if (!all || !Object.keys(all).length) localStorage.removeItem(draftStoreKey());
    else localStorage.setItem(draftStoreKey(), JSON.stringify(all));
  } catch (err) { /* the in-memory day still autosaves */ }
}
function draftPayload(day) {
  const items = JSON.parse(JSON.stringify(day.items || [])).map((it) => {
    delete it.selected;
    delete it._set1Session;
    return it;
  });
  return {
    editSeq: day.editSeq || 1,
    title: day.title || "",
    weekLabel: day.weekLabel || "",
    color: day.color || "",
    recurring: day.recurring || 0,
    recurWeeks: day.recurWeeks || 0,
    recurFrom: day.recurFrom || null,
    savedWorkoutId: day.savedWorkoutId || null,
    assignmentId: day.assignmentId || null,
    items
  };
}
function storeDraft(athleteId, date, day) {
  const all = readDrafts();
  if (!all[athleteId]) all[athleteId] = {};
  all[athleteId][date] = draftPayload(day);
  writeDrafts(all);
}
function clearDraft(athleteId, date) {
  const all = readDrafts();
  if (!all[athleteId] || !all[athleteId][date]) return;
  delete all[athleteId][date];
  if (!Object.keys(all[athleteId]).length) delete all[athleteId];
  writeDrafts(all);
}
function noteDayEdit(date, athleteId) {
  athleteId = athleteId || state.athleteId;
  if (!date || !athleteId || athleteId === "none") return;
  const day = ensureDay(date, athleteId);
  day.edited = true;
  day.editSeq = (day.editSeq || 0) + 1;
  if (!day.hydrated) return;
  storeDraft(athleteId, date, day);
  scheduleAutosave(athleteId, date);
}
function scheduleAutosave(athleteId, date) {
  const day = (state.calendars[athleteId] || {})[date];
  if (!day || !day.edited || !day.hydrated) return;
  const key = daySaveKey(athleteId, date);
  clearTimeout(autosaveTimers[key]);
  autosaveTimers[key] = setTimeout(() => {
    delete autosaveTimers[key];
    queueDaySave(athleteId, date, { explicit: false });
  }, AUTOSAVE_MS);
}
function queueDaySave(athleteId, date, opts) {
  const key = daySaveKey(athleteId, date);
  const prev = daySaveLock[key] || Promise.resolve();
  const run = prev.then(() => saveDayNow(athleteId, date, opts)).catch((err) => { console.error(err); });
  daySaveLock[key] = run;
  return run;
}
async function saveDayNow(athleteId, date, opts) {
  const day = (state.calendars[athleteId] || {})[date];
  if (!day) return;
  if (!day.hydrated) {
    if (opts.explicit) toast("That day is still loading");
    return;
  }
  if (!opts.explicit && !day.edited) return;
  const seq = day.editSeq || 0;
  const ok = await publishDay(date, { quiet: !opts.explicit, athleteId });
  const after = (state.calendars[athleteId] || {})[date];
  if (!after) return;
  if (!ok) {
    after.saveFails = (after.saveFails || 0) + 1;
    if (!opts.explicit && after.edited && after.saveFails <= 3) {
      setTimeout(() => scheduleAutosave(athleteId, date), Math.min(8000, 1000 * after.saveFails));
    }
    return;
  }
  after.saveFails = 0;
  if ((after.editSeq || 0) === seq) {
    after.edited = false;
    clearDraft(athleteId, date);
  } else if (after.edited) scheduleAutosave(athleteId, date);
}
function flushAutosaves() {
  Object.keys(autosaveTimers).forEach((key) => {
    clearTimeout(autosaveTimers[key]);
    delete autosaveTimers[key];
  });
  Object.keys(state.calendars || {}).forEach((athleteId) => {
    Object.keys(state.calendars[athleteId] || {}).forEach((date) => {
      const day = state.calendars[athleteId][date];
      if (day && day.edited && day.hydrated) queueDaySave(athleteId, date, { explicit: false });
    });
  });
}
function dayFromDraft(athleteId, date, draft, local) {
  const day = blankDay(date, {
    title: draft.title || "",
    weekLabel: draft.weekLabel || weekName(date),
    recurring: draft.recurring || 0,
    color: draft.color || (local && local.color) || "#3b82f6",
    items: draft.items || [],
    savedFor: athleteId,
    savedWorkoutId: (local && local.savedWorkoutId) || draft.savedWorkoutId || null,
    assignmentId: (local && local.assignmentId) || draft.assignmentId || null
  });
  day.recurWeeks = draft.recurWeeks || 0;
  day.recurFrom = draft.recurFrom || null;
  day.hydrated = true;
  day.edited = true;
  day.editSeq = draft.editSeq || 1;
  if (local && local.savedAt) day.savedAt = local.savedAt;
  return day;
}
function applyDrafts(athleteId) {
  const bucket = readDrafts()[athleteId] || {};
  const calObj = state.calendars[athleteId] || (state.calendars[athleteId] = {});
  Object.keys(bucket).forEach((date) => {
    const local = calObj[date];
    if (local && local.hydrated && local.edited) return;
    calObj[date] = dayFromDraft(athleteId, date, bucket[date], local);
    scheduleAutosave(athleteId, date);
  });
}
function mergeShellEdit(athleteId, date, local, entry) {
  const w = entry.workout;
  const serverItems = workoutToDayItems(w);
  const localItems = local.items || [];
  const cleared = !localItems.length && local.title === "Rest" && serverItems.length > 0;
  const added = localItems.filter((it) => !serverItems.some((row) => row.id === it.id));
  const titleChanged = !!(local.title && local.title !== (w.title || ""));
  const day = blankDay(date, {
    title: cleared ? "Rest" : ((added.length || titleChanged) && local.title ? local.title : (w.title || "Workout")),
    weekLabel: w.description || local.weekLabel || weekName(date),
    items: cleared ? [] : serverItems.concat(added),
    savedFor: athleteId,
    savedWorkoutId: w.id,
    assignmentId: entry.assignment_id,
    color: local.color,
    recurring: local.recurring
  });
  day.recurWeeks = local.recurWeeks || 0;
  day.recurFrom = local.recurFrom || null;
  day.hydrated = true;
  day.edited = cleared || added.length > 0 || titleChanged;
  day.editSeq = local.editSeq || 1;
  if (day.edited) {
    storeDraft(athleteId, date, day);
    scheduleAutosave(athleteId, date);
  }
  return day;
}
function daySignature(day) {
  if (!day) return "";
  const items = (day.items || []).map((it) => ({
    name: it.name || "",
    type: it.type || "",
    letter: it.letter || "",
    sets: it.sets || 0,
    reps: it.reps || [],
    loads: it.loads || [],
    rests: it.rests || [],
    restReps: it.restReps || [],
    distances: it.distances || [],
    intensities: it.intensities || [],
    intensityKind: it.intensityKind || "",
    tempos: it.tempos || [],
    velocities: it.velocities || [],
    powers: it.powers || [],
    pcts: it.pcts || [],
    props: it.props || [],
    detail: it.detail || "",
    note: it.note || "",
    questions: it.questions || [],
    trackTime: !!it.trackTime,
    trackReps: it.trackReps !== false,
    trackVolume: !!it.trackVolume,
    completionOnly: !!it.completionOnly,
    requireResponse: !!it.requireResponse,
    videoUrl: it.videoUrl || "",
    fieldSeed: it.fieldSeed || {},
    exerciseId: it.exerciseId || null,
    chainId: it.chainId || null,
    chainInstance: it.chainInstance || "",
    chainName: it.chainName || "",
    chainKind: it.chainKind || "",
    chainOrder: it.chainOrder || 0,
    chainCoachOpen: !!it.chainCoachOpen,
    chainAthleteOpen: !!it.chainAthleteOpen
  }));
  return JSON.stringify({
    title: day.title || "",
    color: day.color || "",
    recurWeeks: day.recurWeeks || 0,
    recurFrom: day.recurFrom || "",
    items
  });
}
function markCalendarDiff(before, after) {
  const athleteIds = new Set(Object.keys(before || {}).concat(Object.keys(after || {})));
  athleteIds.forEach((athleteId) => {
    const dates = new Set(Object.keys((before && before[athleteId]) || {}).concat(Object.keys((after && after[athleteId]) || {})));
    dates.forEach((date) => {
      const prev = before && before[athleteId] && before[athleteId][date];
      const next = after && after[athleteId] && after[athleteId][date];
      if (!next || daySignature(prev) === daySignature(next)) return;
      noteDayEdit(date, athleteId);
    });
  });
}
function installBuildAutosave() {
  if (installBuildAutosave.done) return;
  installBuildAutosave.done = true;
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushAutosaves();
  });
  window.addEventListener("pagehide", () => flushAutosaves());
}

async function loadCalendarSchedule(targetId) {
  if (!targetId || targetId === "none") return;
  const person = buildAthletes().find((a) => a.id === targetId);
  if (!person) return;
  let query = "";
  if (person.isGroup && person.groupId) {
    query = "?group_id=" + encodeURIComponent(person.groupId);
  } else if (person.serverId) {
    query = "?user_id=" + encodeURIComponent(person.serverId);
  } else {
    return;
  }
  loadWeekNotes(targetId, query);
  const gen = (loadCalendarSchedule.gen[targetId] = (loadCalendarSchedule.gen[targetId] || 0) + 1);
  const started = Date.now();
  state.calendarLoading[targetId] = true;
  try {
    const entries = await api("GET", "/api/calendar/schedule" + query);
    if (loadCalendarSchedule.gen[targetId] !== gen) return;
    state.calendarLoaded[targetId] = true;
    if (!state.calendars[targetId]) state.calendars[targetId] = {};
    const calObj = state.calendars[targetId];
    const seen = {};
    (entries || []).forEach((entry) => {
      if (!entry.workout || !entry.scheduled_date) return;
      const date = entry.scheduled_date;
      seen[date] = true;
      const local = calObj[date];
      if (local && local.hydrated && local.edited) return;
      if (local && local.savedAt && local.savedAt > started) return;
      if (local && local.edited && !local.hydrated) {
        calObj[date] = mergeShellEdit(targetId, date, local, entry);
        return;
      }
      const w = entry.workout;
      calObj[date] = blankDay(date, {
        title: w.title || "Workout",
        weekLabel: w.description || weekName(date),
        items: workoutToDayItems(w),
        savedFor: targetId,
        savedWorkoutId: w.id,
        assignmentId: entry.assignment_id
      });
      calObj[date].hydrated = true;
    });
    Object.keys(calObj).forEach((date) => {
      if (!seen[date] && calObj[date] && !calObj[date].hydrated) calObj[date].hydrated = true;
    });
    applyDrafts(targetId);
    render();
  } catch (err) {
    console.error("Failed to load calendar schedule:", err);
    if (loadCalendarSchedule.gen[targetId] === gen) applyDrafts(targetId);
  } finally {
    if (loadCalendarSchedule.gen[targetId] === gen) state.calendarLoading[targetId] = false;
  }
}
loadCalendarSchedule.gen = {};

const WEEK_NOTE_SAVE_MS = 600;
const weekNoteTimers = {};
function weekNoteTarget(targetId) {
  const person = buildAthletes().find((a) => a.id === targetId);
  if (!person) return null;
  if (person.isGroup && person.groupId) return { group_id: person.groupId };
  if (person.serverId) return { user_id: person.serverId };
  return null;
}
async function loadWeekNotes(targetId, query) {
  try {
    const rows = await api("GET", "/api/calendar/week-notes" + query);
    const notes = state.weekNotes[targetId] || (state.weekNotes[targetId] = {});
    (rows || []).forEach((row) => {
      if (!weekNoteTimers[targetId + "|" + row.week_start]) notes[row.week_start] = row.body || "";
    });
    if (state.view === "build" && state.athleteId === targetId) render();
  } catch (err) {
    console.error("Failed to load week notes:", err);
  }
}
function weekNote(week, targetId = state.athleteId) {
  return ((state.weekNotes[targetId] || {})[week]) || "";
}
function readFoldedWeeks() {
  try {
    return JSON.parse(localStorage.getItem("wourkout_week_notes_folded") || "{}") || {};
  } catch (err) {
    return {};
  }
}
function weekNoteOpen(week, targetId = state.athleteId) {
  const key = targetId + "|" + week;
  if (key in state.weekNotesFolded) return !state.weekNotesFolded[key];
  return !!weekNote(week, targetId).trim();
}
function toggleWeekNote(week, ev) {
  if (ev) ev.stopPropagation();
  const key = state.athleteId + "|" + week;
  const open = weekNoteOpen(week);
  state.weekNotesFolded[key] = open;
  try { localStorage.setItem("wourkout_week_notes_folded", JSON.stringify(state.weekNotesFolded)); } catch (err) { /* per-viewer only */ }
  if (!open) state.pendingFocus = "week-note-" + week;
  render();
}
function setWeekNote(week, value) {
  const targetId = state.athleteId;
  const notes = state.weekNotes[targetId] || (state.weekNotes[targetId] = {});
  notes[week] = value;
  const key = targetId + "|" + week;
  clearTimeout(weekNoteTimers[key]);
  weekNoteTimers[key] = setTimeout(() => saveWeekNote(targetId, week), WEEK_NOTE_SAVE_MS);
}
function flushWeekNote(week) {
  const key = state.athleteId + "|" + week;
  if (!weekNoteTimers[key]) return;
  clearTimeout(weekNoteTimers[key]);
  saveWeekNote(state.athleteId, week);
}
async function saveWeekNote(targetId, week) {
  const key = targetId + "|" + week;
  delete weekNoteTimers[key];
  const target = weekNoteTarget(targetId);
  if (!target) return;
  try {
    await api("PUT", "/api/calendar/week-notes", Object.assign({ week_start: week, body: weekNote(week, targetId) }, target));
  } catch (err) {
    console.error("Failed to save week note:", err);
    toast("Week note did not save");
  }
}
function weekNoteHtml(week) {
  const text = weekNote(week);
  const open = weekNoteOpen(week);
  const preview = text.trim().split("\n")[0];
  const toggle = `<button type="button" class="week-note-toggle" aria-expanded="${open ? "true" : "false"}" onclick="toggleWeekNote('${week}', event)">${open ? "▾ Notes" : text.trim() ? "▸ Notes" : "+ Notes"}</button>`;
  if (!open) return `${toggle}${preview ? `<span class="week-note-preview">${esc(preview)}</span>` : ""}`;
  return `${toggle}<span class="week-note-private">Coaches only</span>
    <textarea class="week-note" data-focus="week-note-${week}" rows="${Math.min(8, Math.max(2, text.split("\n").length))}" placeholder="Programming notes for this week. Athletes never see these." oninput="setWeekNote('${week}', this.value)" onblur="flushWeekNote('${week}')" onclick="event.stopPropagation()">${esc(text)}</textarea>`;
}

function syncFromGymContext() {
  const ctx = state.gymContext;
  if (!ctx) return;
  ATHLETES.length = 0;
  state.athletes = [];
  state.coaches = [];
  state.groups = (ctx.teams || []).map((t) => t.name);
  (ctx.athletes || []).forEach((u) => {
    const id = "u" + u.id;
    const parts = String(u.name || u.email || "Athlete").trim().split(/\s+/);
    const first = parts[0] || u.name || "Athlete";
    const last = parts.slice(1).join(" ");
    ATHLETES.push({
      id,
      name: u.name || u.email,
      email: u.email || "",
      serverId: u.id,
      team_id: u.team_id,
      team_name: u.team_name || "",
      load_unit: normalizeUnit(u.load_unit),
      distance_unit: normalizeDistanceUnit(u.distance_unit)
    });
    state.athletes.push({
      id,
      serverId: u.id,
      first,
      last,
      email: u.email || "",
      activity: u.latest_note ? "Logged note" : "Enrolled",
      groups: u.team_name || "—",
      team_id: u.team_id,
      load_unit: normalizeUnit(u.load_unit),
      distance_unit: normalizeDistanceUnit(u.distance_unit),
      cals: "1",
      role: "athlete"
    });
    if (!state.calendars[id]) state.calendars[id] = {};
  });
  (ctx.coaches || []).forEach((c) => {
    const id = "c" + c.id;
    const parts = String(c.name || c.email || "Coach").trim().split(/\s+/);
    state.coaches.push({
      id,
      serverId: c.id,
      first: parts[0] || c.name || "Coach",
      last: parts.slice(1).join(" "),
      email: c.email || "",
      activity: "Active",
      groups: (c.led_teams || []).join(", ") || "—",
      cals: "All",
      role: "coach"
    });
  });
  (ctx.teams || []).forEach((t) => {
    const gid = "group:" + t.id;
    if (!state.calendars[gid]) state.calendars[gid] = {};
  });
  const targets = buildAthletes();
  if (!state.athleteId || !targets.some((t) => t.id === state.athleteId)) {
    const firstReal = targets.find((t) => t.id !== "none");
    state.athleteId = firstReal ? firstReal.id : "";
  }
  if (!state.entryAthlete && ATHLETES.length) {
    state.entryAthlete = ATHLETES[0].id;
  }
  applyGymSaved(ctx);
}

function itemBody(item) {
  if (item && item.body && typeof item.body === "object") return item.body;
  if (item && typeof item.body === "string") return { name: item.body, text: item.body };
  return {};
}
function markHiddenExercises() {
  const hidden = state.hiddenExerciseIds || [];
  (state.serverExercises || []).forEach((row) => { row.hidden = hidden.indexOf(row.id) >= 0; });
}
function applyGymSaved(ctx) {
  const items = (ctx && ctx.items) || [];
  state.docs = items.filter((item) => item.kind === "document").map((item) => {
    const body = itemBody(item);
    return { id: item.id, name: body.name || "", url: body.url || "" };
  });
  state.packets = items.filter((item) => item.kind === "packet").map((item) => ({ id: item.id, name: itemBody(item).name || "" }));
  state.invoices = items.filter((item) => item.kind === "invoice").map((item) => {
    const body = itemBody(item);
    return { id: item.id, who: body.who || "", amount: body.amount || "", note: body.note || "" };
  });
  state.reports = items.filter((item) => item.kind === "report").map((item) => ({ id: item.id, text: itemBody(item).text || "" }));
  state.evals = items.filter((item) => item.kind === "evaluation").map((item) => ({ id: item.id, text: itemBody(item).text || itemBody(item).name || "" }));
  state.journal = items.filter((item) => item.kind === "journal").map((item) => {
    const body = itemBody(item);
    return { id: item.id, title: body.title || "Note", body: body.body || "", date: body.date || "" };
  });
  state.hiddenExerciseIds = (ctx && ctx.hidden_exercise_ids) || [];
  markHiddenExercises();
}
async function loadOwnJournal() {
  try {
    const items = await api("GET", "/api/gym/items?kind=journal");
    state.journal = (items || []).map((item) => {
      const body = itemBody(item);
      return { id: item.id, title: body.title || "Note", body: body.body || "", date: body.date || "" };
    });
    render();
  } catch (err) {
    console.error(err);
  }
}
async function createSaved(kind, body) {
  return await api("POST", "/api/gym/items", { kind, body });
}
async function updateSaved(id, body) {
  return await api("PUT", "/api/gym/items/" + id, { body });
}
async function removeSaved(listName, index) {
  const list = state[listName];
  const row = list && list[index];
  if (!row) return;
  const removed = list.splice(index, 1)[0];
  render();
  if (!removed.id) return;
  try {
    await api("DELETE", "/api/gym/items/" + removed.id);
  } catch (err) {
    list.splice(index, 0, removed);
    toast(err.message || "Could not remove that");
    render();
  }
}

async function loadGymContext() {
  state.gymContext = await api("GET", "/api/gym/context");
  syncFromGymContext();
  if (state.athleteId && state.athleteId !== "none") {
    loadCalendarSchedule(state.athleteId);
  }
  if (!state.serverExercises.length) {
    loadExercises();
  }
}

async function loadGymActivity() {
  try {
    state.gymActivity = await api("GET", "/api/gym/activity");
    render();
  } catch (err) {
    console.error("Failed to load gym activity:", err);
  }
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
      try {
        state.athleteWorkouts[row.scheduled_date] = await api("GET", "/api/workouts/" + row.workout_id);
      } catch (err) {
        console.error(err);
      }
    }
  }
}
function ownAthleteSession() {
  const user = state.auth && state.auth.user;
  return !!(user && state.role === "athlete" && state.serverUserId === user.id && heldRoles(user).includes("athlete"));
}

function athletePages(view) {
  return view === "mine" || view === "entry" || view === "whiteboard" || view === "maxes" || view === "journal";
}
function signedInName() {
  const user = state.auth && state.auth.user;
  return (user && (user.name || user.username)) || "Athlete";
}
function ownAthleteId() {
  return state.actingAthlete || (state.auth && state.auth.user && state.auth.user.username) || "me";
}
function viewedAthleteName() {
  const fromList = buildAthletes().find((a) => a.id === state.actingAthlete);
  return (fromList && fromList.name) || signedInName();
}
function workoutToolList() {
  return [["weightroom", "WEIGHTROOM VIEW"], ["whiteboard", "WHITEBOARD"], ["entry", "WORKOUT ENTRY"], ["maxes", "MAXES / PRS"], ["journal", "JOURNAL"], ["leaderboard", "LEADERBOARD"], ["evaluations", "EVALUATIONS"]];
}
function coachToolList() {
  return [
    ["users", "MANAGE USERS"], ["calendars", "MANAGE CALENDARS"], ["build", "THE PLANNER"],
    ["exercises", "EXERCISES"], ["goals", "GOALS"], ["documents", "DOCUMENTS & LINKS"],
    ["packets", "PACKETS & SHEETS"], ["attendance", "ATTENDANCE"], ["reporting", "REPORTING"], ["payments", "PAYMENTS"]
  ];
}
function navItem(id, label, caret) {
  const on = state.view === id;
  return `<div class="nav-anchor"><button class="navbtn ${on ? "active" : ""}" onclick="go('${id}', event)">${label}${caret ? ' <span class="caret">▼</span>' : ""}</button>${menuFor(id)}</div>`;
}
function drawerHtml(displayName, initial, roleClass, avatarBg, user) {
  const link = (id, label) => `<button type="button" class="navbtn ${state.view === id ? "active" : ""}" onclick="go('${id}')">${label}</button>`;
  const tool = (id, label) => `<button type="button" class="navbtn ${state.view === id || (id === "journal" && state.view === "feed") ? "active" : ""}" onclick="goTool('${id}')">${label}</button>`;
  let links = "";
  if (state.role === "athlete") {
    links = [["mine", "MY SCHEDULE"], ["entry", "WORKOUT ENTRY"], ["whiteboard", "WHITEBOARD"], ["maxes", "MAXES / PRS"], ["journal", "JOURNAL"]]
      .map(([id, label]) => link(id, label)).join("");
  } else if (state.role === "admin") {
    links = link("admin", "COACHES");
  } else {
    links = link("squad", "ATHLETES") + link("build", "BUILD")
      + `<div class="drawer-label">Workout tools</div>`
      + workoutToolList().map(([id, label]) => tool(id, label)).join("")
      + `<div class="drawer-label">Coach tools</div>`
      + coachToolList().map(([id, label]) => tool(id, label)).join("");
  }
  const roles = heldRoles(user);
  const switcher = roles.length > 1
    ? `<div class="drawer-label">View</div><div class="role-switch">${roles.map((r) => `<button type="button" class="${state.role === r ? "on" : ""}" onclick="switchRole('${r}')">${esc(r)}</button>`).join("")}</div>`
    : "";
  return `<div class="nav-backdrop ${state.navOpen ? "open" : ""}" onclick="closeNav()"></div>
    <aside class="nav-drawer ${state.navOpen ? "open" : ""}" onclick="event.stopPropagation()">
      <div class="drawer-head">
        <div class="wordmark">w<span>ourkout</span></div>
        <button type="button" class="iconbtn" aria-label="Close menu" onclick="closeNav()">✕</button>
      </div>
      ${links}
      ${switcher}
      <div class="drawer-foot">
        <div class="nav-profile">
          <div class="nav-avatar" style="background:${avatarBg}">${initial}</div>
          <div class="nav-user-info">
            <span class="nav-user-name">${esc(displayName)}</span>
            <span class="role-badge ${roleClass}">${esc(roleClass.toUpperCase())}</span>
          </div>
        </div>
        <button class="nav-logout-btn" type="button" onclick="handleLogout()">Log out</button>
      </div>
    </aside>`;
}
function nav() {
  const isAthlete = state.role === "athlete";
  const user = state.auth && state.auth.user;
  const displayName = user ? (user.name || user.username) : (isAthlete ? "Athlete" : "Coach");
  const initial = (displayName[0] || "U").toUpperCase();
  const roleClass = state.role || "athlete";
  const avatarBg = roleClass === "athlete" ? "#22c55e" : roleClass === "admin" ? "#ef4444" : "#3b82f6";
  const athleteNav = `${navItem("mine", "MY SCHEDULE")}${navItem("entry", "WORKOUT ENTRY")}${navItem("whiteboard", "WHITEBOARD")}${navItem("maxes", "MAXES / PRS")}${navItem("journal", "JOURNAL")}`;
  const coachNav = `${navItem("squad", "ATHLETES")}${navItem("build", "BUILD")}${navItem("workout", "WORKOUT TOOLS", true)}${navItem("coach", "COACH TOOLS", true)}`;
  const links = isAthlete ? athleteNav : (state.role === "admin" ? navItem("admin", "COACHES") : coachNav);
  const home = isAthlete ? "mine" : (state.role === "admin" ? "admin" : "squad");
  return `<header class="topnav">
    <button type="button" class="nav-toggle" aria-label="Open menu" onclick="toggleNav(event)">☰</button>
    <div class="wordmark" onclick="go('${home}')">w<span>ourkout</span></div>
    <span class="view-pill ${esc(state.role || "athlete")}">${esc((state.role || "athlete").toUpperCase())} VIEW</span>
    <nav class="nav-links">${links}</nav>
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
  </header>${drawerHtml(displayName, initial, roleClass, avatarBg, user)}`;
}
function menuFor(id) {
  if (state.navMenu !== id || state.role === "athlete") return "";
  if (id === "workout") {
    return `<div class="menu" style="top:40px">${workoutToolList().map(([v, l]) => `<button onclick="goTool('${v}')">${l}</button>`).join("")}</div>`;
  }
  if (id === "coach") {
    return `<div class="menu" style="top:40px">${coachToolList().map(([v, l]) => `<button onclick="goTool('${v}')">${l}</button>`).join("")}</div>`;
  }
  return "";
}
function toggleNav(ev) {
  if (ev) ev.stopPropagation();
  state.navOpen = !state.navOpen;
  render();
}
function closeNav() {
  if (!state.navOpen) return;
  state.navOpen = false;
  render();
}
function go(view, ev) {
  if (ev) ev.stopPropagation();
  if (state.editor && state.view === "build" && view !== state.view && !closeEditor()) return;
  state.navOpen = false;
  if (view === "workout" || view === "coach") {
    if (state.role === "athlete") {
      state.view = "mine";
      state.navMenu = null;
      closeFloats();
      render();
      return;
    }
    state.navMenu = state.navMenu === view ? null : view;
    render();
    return;
  }
  state.navMenu = null;
  if (state.role === "athlete" && !athletePages(view)) view = "mine";
  if (state.role === "athlete" && view === "entry") {
    state.view = "entry";
    closeFloats();
    selectEntryDate(state.entryDate);
    return;
  }
  state.view = view === "feed" ? "feed" : view;
  if (view === "feed" && state.role !== "athlete") state.feedMode = "athletes";
  if (view === "feed" && state.role === "athlete") state.view = "journal";
  closeFloats();
  render();
  if (view === "build" && state.athleteId && state.athleteId !== "none") loadCalendarSchedule(state.athleteId);
  if (view === "build" && !state.serverExercises.length) loadExercises();
  if (view === "maxes") loadGoals();
}
function goTool(view) {
  if (state.editor && state.view === "build" && view !== "build" && !closeEditor()) return;
  state.navMenu = null;
  state.navOpen = false;
  if (state.role === "athlete") {
    const next = view === "journal" ? "journal" : view;
    if (!athletePages(next)) {
      state.view = "mine";
      closeFloats();
      render();
      return;
    }
    if (next === "entry") {
      state.view = "entry";
      closeFloats();
      selectEntryDate(state.entryDate);
      return;
    }
    state.view = next;
    closeFloats();
    render();
    if (next === "maxes") loadGoals();
    return;
  }
  if (view === "journal") { state.view = "feed"; state.feedMode = "journal"; }
  else if (view === "build") { state.view = "build"; }
  else state.view = view;
  closeFloats();
  render();
  if (view === "build" && state.athleteId && state.athleteId !== "none") loadCalendarSchedule(state.athleteId);
  if (view === "build" && !state.serverExercises.length) loadExercises();
  if (view === "users" || view === "calendars") loadRoster();
  if (view === "exercises") loadExercises();
  if (view === "goals" || view === "maxes") loadGoals();
  if (view === "reporting" || view === "attendance") { loadCompliance(); loadGymActivity(); }
  if (view === "feed" || view === "journal" || view === "leaderboard" || view === "weightroom") loadGymActivity();
  if (view === "entry" && state.entryAthlete) loadCalendarSchedule(state.entryAthlete);
  if (view === "whiteboard" && state.boardAthlete) loadCalendarSchedule(state.boardAthlete);
}

const BUILD_PANELS = [
  ["library", "▤", "Exercise library"],
  ["prs", "★", "PRs & goals"],
  ["history", "↺", "Action history"]
];
function leftRail() {
  return `<aside class="rail">
    ${BUILD_PANELS.map(([key, icon, title]) => `<button type="button" title="${title}" aria-label="${title}" aria-pressed="${state.buildPanel === key ? "true" : "false"}" class="${state.buildPanel === key ? "on" : ""}" onclick="toggleBuildPanel('${key}')">${icon}</button>`).join("")}
  </aside>`;
}
function toggleBuildPanel(key) {
  state.buildPanel = state.buildPanel === key ? null : key;
  state.panelQ = "";
  if (state.buildPanel) state.preview = null;
  if (state.buildPanel === "library" && !state.serverExercises.length) loadExercises();
  render();
}
function buildPanelHtml() {
  const panel = BUILD_PANELS.find((row) => row[0] === state.buildPanel);
  if (!panel) return "";
  let inner = "";
  if (panel[0] === "library") inner = libraryPanelHtml();
  else if (panel[0] === "prs") inner = prsPanelHtml();
  else inner = historyPanelHtml();
  return `<aside class="build-panel" aria-label="${panel[2]}">
    <div class="bp-head"><strong>${panel[2]}</strong><button type="button" class="iconbtn" aria-label="Close panel" onclick="toggleBuildPanel('${panel[0]}')">✕</button></div>
    ${inner}
  </aside>`;
}
function libraryPanelHtml() {
  const q = (state.panelQ || "").trim().toLowerCase();
  const cat = state.panelCat || "All";
  const date = state.focusDay || APP_TODAY;
  const rows = (state.serverExercises || []).filter((e) => !e.hidden
    && (cat === "All" || canonicalCategory(e.category || "Strength") === cat)
    && (!q || e.name.toLowerCase().includes(q)));
  const chains = cat === "All" ? (state.chains || []).filter((c) => !q || c.name.toLowerCase().includes(q)) : [];
  const exRows = rows.slice(0, 120).map((e) => {
    const open = state.panelOpen === e.id;
    const defaults = exerciseDefaultsText(e);
    const facts = [
      ["Defaults", defaults],
      ["Load", e.default_load], ["Rest", e.default_rest], ["Tempo", e.default_tempo]
    ].filter((f) => f[1]).map((f) => `<div><span>${f[0]}</span>${esc(f[1])}</div>`).join("");
    return `<div class="bp-row${open ? " open" : ""}">
      <button type="button" class="bp-main" onclick="state.panelOpen=state.panelOpen===${e.id}?null:${e.id};render()">
        <b>${esc(e.name)}</b><small>${esc(categoryLabel(e.category))}${defaults ? " · " + esc(defaults) : ""}${e.completion_only ? " · Completion only" : ""}</small>
      </button>
      <button type="button" class="bp-add" title="Add to ${esc(fmtDay(date))}" aria-label="Add ${esc(e.name)} to ${esc(fmtDay(date))}" onclick="addLibraryExercise(${e.id})">＋</button>
      ${open ? `<div class="bp-detail">${facts}${e.default_notes ? `<p>${esc(e.default_notes)}</p>` : ""}${e.video_url ? `<a href="${esc(e.video_url)}" target="_blank" rel="noopener">▶ Watch video</a>` : ""}<button type="button" class="ghost" onclick="editExercise(${e.id})">Edit in library</button></div>` : ""}
    </div>`;
  }).join("");
  const chainRows = chains.map((c) => `<div class="bp-row">
      <div class="bp-main"><b><span class="chain-mark">Chain</span> ${esc(c.name)}</b><small>${esc(c.kind || "")} · ${(c.members || []).length} exercises</small></div>
      <button type="button" class="bp-add" title="Add to ${esc(fmtDay(date))}" aria-label="Add ${esc(c.name)} to ${esc(fmtDay(date))}" onclick="addChainToDay('${date}', ${c.id})">＋</button>
    </div>`).join("");
  return `<div class="bp-tools">
      <input type="search" placeholder="Search exercises" aria-label="Search exercise library" data-focus="panel-q" value="${esc(state.panelQ || "")}" oninput="state.panelQ=this.value;render()">
      <select aria-label="Library category" onchange="state.panelCat=this.value;render()">${["All"].concat(EXERCISE_CATEGORIES).map((c) => `<option ${c === cat ? "selected" : ""}>${esc(c)}</option>`).join("")}</select>
      <div class="bp-note">＋ adds to <b>${esc(fmtDay(date))}</b>. Click a day to change it.</div>
    </div>
    <div class="bp-scroll">${chainRows}${exRows || `<div class="bp-empty">${state.serverExercises.length ? "No matches." : "Loading library…"}</div>`}</div>`;
}
function addLibraryExercise(id) {
  const rec = (state.serverExercises || []).find((e) => e.id === id);
  if (!rec) return;
  const date = state.focusDay || APP_TODAY;
  const index = CATALOG.findIndex((c) => c.name === rec.name);
  if (index >= 0) addFromCatalog(date, index);
  else addItem(date, fromCatalog({ name: rec.name, type: catalogType({ name: rec.name }) }));
  toast("Added " + rec.name + " to " + fmtDay(date));
}
// Athletes the PR panel covers: the athlete, or everyone in the group.
function panelPeople() {
  const target = athlete();
  if (!target || target.id === "none") return [];
  if (target.isGroup) return ATHLETES.filter((a) => a.team_id === target.groupId && a.serverId).map((a) => a.serverId);
  return target.serverId ? [target.serverId] : [];
}
function queuePanelBests() {
  const target = athlete();
  const key = target ? target.id : "";
  if (!key || state.panelBests.key === key) return;
  state.panelBests = { key, loading: true, bests: [], goals: [] };
  const single = !target.isGroup && target.serverId;
  const query = single ? "?user_id=" + target.serverId : "";
  Promise.all([api("GET", "/api/personal-bests" + query), api("GET", "/api/records" + query)])
    .then(([bests, goals]) => {
      if (state.panelBests.key !== key) return;
      state.panelBests = { key, loading: false, bests: bests || [], goals: goals || [] };
      renderSoon();
    })
    .catch((err) => {
      console.error(err);
      if (state.panelBests.key === key) state.panelBests = { key, loading: false, bests: [], goals: [], error: true };
      renderSoon();
    });
}
function prsPanelHtml() {
  queuePanelBests();
  const target = athlete();
  const pb = state.panelBests;
  if (!target || target.id === "none") return `<div class="bp-empty">Pick an athlete or group to see PRs.</div>`;
  if (pb.loading) return `<div class="bp-empty">Loading…</div>`;
  if (pb.error) return `<div class="bp-empty">Could not load PRs.</div>`;
  const people = new Set(panelPeople());
  const saved = { bests: state.personalBests, goals: state.serverRecords };
  state.personalBests = pb.bests.filter((r) => people.has(r.user_id));
  state.serverRecords = pb.goals.filter((r) => people.has(r.user_id));
  const rows = prGoalRows();
  state.personalBests = saved.bests;
  state.serverRecords = saved.goals;
  const q = (state.panelQ || "").trim().toLowerCase();
  const shown = rows.filter((r) => !q || r.lift.toLowerCase().includes(q) || String(r.userName || "").toLowerCase().includes(q));
  const many = people.size > 1;
  let lastUser = null;
  const body = shown.map((r) => {
    const header = many && r.userId !== lastUser ? `<div class="bp-group">${esc(r.userName || "")}</div>` : "";
    lastUser = r.userId;
    const best = r.best ? `${fmtLoad(r.best.weight)} ${esc(r.unit)}${r.best.reps ? " × " + fmtLoad(r.best.reps) : ""}` : "—";
    let goal = "";
    if (r.goal && r.goal.weight > 0) {
      const pct = r.best ? Math.min(100, Math.round(r.best.weight / r.goal.weight * 100)) : 0;
      goal = `<div class="bp-goal"><span>Goal ${fmtLoad(r.goal.weight)} ${esc(r.unit)}</span><span class="bp-bar${pct >= 100 ? " hit" : ""}"><i style="width:${pct}%"></i></span><span>${pct}%</span></div>`;
    }
    return `${header}<div class="bp-row"><div class="bp-main"><b>${esc(r.lift)}</b><small>${r.best && r.best.date ? esc(fmtShortDate(r.best.date)) : "Not logged yet"}</small>${goal}</div><div class="bp-best">${best}</div></div>`;
  }).join("");
  return `<div class="bp-tools">
      <input type="search" placeholder="Search lifts" aria-label="Search PRs" data-focus="panel-q" value="${esc(state.panelQ || "")}" oninput="state.panelQ=this.value;render()">
      <div class="bp-note">${many ? "Everyone in " + esc(target.name) : esc(target.name)}. Best logged set per lift.</div>
    </div>
    <div class="bp-scroll">${body || `<div class="bp-empty">${rows.length ? "No matches." : "No PRs or goals yet."}</div>`}</div>
    <div class="bp-foot"><button type="button" class="ghost" onclick="goTool('goals')">Open Goals &amp; PRs →</button></div>`;
}
function historyPanelHtml() {
  const rows = state.history.map((h) => `<div class="bp-hist"><span>${esc(h.t)}</span>${esc(h.text)}</div>`).join("");
  return `<div class="bp-tools"><button type="button" class="ghost" ${state.undo.length ? "" : "disabled"} onclick="undo()">↺ Undo last change</button>
      <div class="bp-note">${state.undo.length} change${state.undo.length === 1 ? "" : "s"} can be undone.</div></div>
    <div class="bp-scroll">${rows || `<div class="bp-empty">No actions yet.</div>`}</div>`;
}

function body() {
  if (state.role === "athlete" && !athletePages(state.view)) state.view = "mine";
  switch (state.view) {
    case "build": return state.role === "athlete" ? mineView() : buildView();
    case "mine": return mineView();
    case "admin": return adminView();
    case "squad": return squadView();
    case "entry": return entryView();
    case "journal": return journalView();
    case "feed": return state.role === "athlete" ? journalView() : feedView();
    case "users": return usersView();
    case "exercises": return liftsView();
    case "daily": return dailyView();
    case "weightroom": return weightroomView();
    case "whiteboard": return boardView();
    case "maxes": return goalsView();
    case "leaderboard": return boardLeader();
    case "evaluations": return evalView();
    case "calendars": return calendarsView();
    case "goals": return goalsView();
    case "documents": return docsView();
    case "packets": return packetsView();
    case "attendance": return attendanceView();
    case "reporting": return reportingView();
    case "payments": return paymentsView();
    default: return state.role === "athlete" ? mineView() : buildView();
  }
}

const BUILD_LEAD_WEEKS = 4;
const BUILD_MAX_WEEKS = 160;
function ensureBuildWindow() {
  const todayWeek = sundayOf(APP_TODAY);
  const first = !state.buildOrigin;
  if (first) {
    const anchor = state.weekStart < todayWeek ? state.weekStart : todayWeek;
    state.buildOrigin = addDays(anchor, -BUILD_LEAD_WEEKS * 7);
    state.buildWeekCount = BUILD_LEAD_WEEKS + 8;
    state.buildJumpWeek = state.weekStart;
  }
  const fitted = extendBuildWindow(state.buildOrigin, state.buildWeekCount, state.weekStart);
  state.buildOrigin = fitted.origin;
  state.buildWeekCount = fitted.count;
}
function extendBuildWindow(origin, count, weekStart) {
  let start = origin;
  let total = count || 1;
  if (weekStart < start) {
    const back = Math.round((new Date(start + "T12:00:00") - new Date(weekStart + "T12:00:00")) / (7 * 86400000));
    start = addDays(start, -back * 7);
    total += back;
  }
  const end = addDays(start, (total - 1) * 7);
  if (weekStart > end) {
    const extra = Math.max(1, Math.round((new Date(weekStart + "T12:00:00") - new Date(end + "T12:00:00")) / (7 * 86400000)));
    total += extra;
  }
  return { origin: start, count: total };
}
function loadEarlierWeeks() {
  ensureBuildWindow();
  if (state.buildWeekCount > BUILD_MAX_WEEKS) return;
  const el = document.querySelector(".build-cal");
  if (el) state.buildPrepend = { prevHeight: el.scrollHeight, prevTop: el.scrollTop };
  state.buildOrigin = addDays(state.buildOrigin, -28);
  state.buildWeekCount += 4;
  render();
}
function buildWeekStarts(origin, count) {
  const out = [];
  for (let i = 0; i < count; i++) out.push(addDays(origin, i * 7));
  return out;
}
function visibleBuildWeek(el) {
  if (!el) return "";
  const edge = el.getBoundingClientRect().top + 24;
  let best = "";
  el.querySelectorAll(".week[data-week]").forEach((node) => {
    const rect = node.getBoundingClientRect();
    if (rect.bottom > edge && !best) best = node.dataset.week;
  });
  return best;
}
function onBuildScroll(el) {
  if (!el || onBuildScroll.locking) return;
  state.buildScrollTop = el.scrollTop;
  const week = visibleBuildWeek(el);
  if (week && week !== state.weekStart) {
    state.weekStart = week;
    writeBuildQuery();
  }
  if (state.buildWeekCount > BUILD_MAX_WEEKS) return;
  const nearTop = el.scrollTop < 280;
  const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 280;
  if (!nearTop && !nearBottom) return;
  onBuildScroll.locking = true;
  if (nearTop) loadEarlierWeeks();
  else {
    state.buildWeekCount += 4;
    render();
  }
  setTimeout(() => { onBuildScroll.locking = false; }, 80);
}
function restoreBuildScroll() {
  const el = document.querySelector(".build-cal");
  if (!el) return;
  if (state.buildJumpWeek) {
    const node = el.querySelector('.week[data-week="' + state.buildJumpWeek + '"]');
    state.buildJumpWeek = "";
    if (node) {
      const elRect = el.getBoundingClientRect();
      const nodeRect = node.getBoundingClientRect();
      el.scrollTop += nodeRect.top - elRect.top;
    }
    state.buildScrollTop = el.scrollTop;
    return;
  }
  if (state.buildPrepend) {
    const grew = el.scrollHeight - state.buildPrepend.prevHeight;
    el.scrollTop = state.buildPrepend.prevTop + Math.max(0, grew);
    state.buildScrollTop = el.scrollTop;
    state.buildPrepend = null;
    return;
  }
  if (state.buildScrollTop) el.scrollTop = state.buildScrollTop;
}
function readBuildParams(search) {
  const params = new URLSearchParams(search || "");
  return {
    week: params.get("week") || "",
    athlete: params.get("athlete") || "",
    cal: params.get("cal") || ""
  };
}
function applyBuildParams(search, role) {
  if (role === "athlete") return { applied: false };
  const query = readBuildParams(search);
  const next = {};
  if (/^\d{4}-\d{2}-\d{2}$/.test(query.week)) {
    next.weekStart = sundayOf(query.week);
  }
  if (query.cal === "week" || query.cal === "month") next.viewMode = query.cal;
  if (query.athlete && buildAthletes().some((a) => a.id === query.athlete)) next.athleteId = query.athlete;
  return { applied: !!(next.weekStart || next.viewMode || next.athleteId), next };
}
function applyBuildQuery() {
  if (typeof location === "undefined") return false;
  const result = applyBuildParams(location.search, state.role);
  if (!result.applied) return false;
  if (result.next.weekStart) {
    state.weekStart = result.next.weekStart;
    state.buildOrigin = null;
    state.buildWeekCount = 0;
  }
  if (result.next.viewMode) state.viewMode = result.next.viewMode;
  if (result.next.athleteId) state.athleteId = result.next.athleteId;
  return true;
}
function writeBuildQuery() {
  if (state.role === "athlete" || state.view !== "build") return;
  if (typeof history === "undefined" || !history.replaceState || typeof location === "undefined") return;
  const params = new URLSearchParams(location.search || "");
  params.set("week", state.weekStart);
  params.set("athlete", state.athleteId || "");
  params.set("cal", state.viewMode === "week" ? "week" : "month");
  const search = "?" + params.toString();
  const next = location.pathname + search + (location.hash || "");
  const current = location.pathname + (location.search || "") + (location.hash || "");
  if (next !== current) history.replaceState(null, "", next);
}
function setBuildViewMode(value) {
  state.viewMode = value === "week" ? "week" : "month";
  writeBuildQuery();
  render();
}
function buildView() {
  ensureBuildWindow();
  const todayWeek = sundayOf(APP_TODAY);
  let weeksHtml = "";
  for (let w = 0; w < state.buildWeekCount; w++) {
    const start = addDays(state.buildOrigin, w * 7);
    const current = start === todayWeek ? " week-current" : "";
    let cols = "";
    for (let i = 0; i < 7; i++) cols += dayCol(addDays(start, i));
    const banner = start === todayWeek ? "This week" : weekName(start);
    weeksHtml += `<div class="week${current}" data-week="${start}"><div class="week-banner"><span class="week-name">${esc(banner)}</span>${weekNoteHtml(start)}</div>${cols}</div>`;
  }
  writeBuildQuery();
  const currentTarget = athlete();
  const saveLabel = currentTarget.isGroup ? "Save for group" : "Save for athlete";
  const floatingEditor = state.editor ? editorPop(state.editor.day) : "";
  return leftRail() + buildPanelHtml() + (state.preview ? previewHtml() : "") +
    `<section class="stage">
      <div class="subhead">
        <div>
          <div class="crumbs">Calendars / ${esc(currentTarget.name)}</div>
          <div class="athlete-pick">
            <button type="button" class="athlete-name" id="build-athlete" onclick="toggleAthleteMenu(event)">${esc(currentTarget.name)} ▾</button>
            ${state.athleteMenu ? `<div class="menu athlete-menu" id="build-athlete-menu">${buildAthletes().map((a) => `<button type="button" class="${a.id === state.athleteId ? "on" : ""}" onclick="switchAthlete('${esc(a.id)}')">${a.id === state.athleteId ? "✓ " : ""}${esc(a.name)}</button>`).join("")}</div>` : ""}
          </div>
        </div>
        <div class="sub-actions">
          ${unitSelect(currentTarget.id)}
          <button class="ghost" onclick="saveFocused()">${saveLabel}</button>
          <button class="ghost" onclick="openAsAthlete(state.athleteId)">Open as athlete</button>
          <button class="ghost" onclick="undo()">↺ UNDO</button>
          <div class="seg">
            <button onclick="shiftWeek(-1)">‹</button>
            <button class="today-pill" onclick="jumpToday()">Today</button>
            <button onclick="shiftWeek(1)">›</button>
          </div>
          <select class="ghost" aria-label="Month or week" onchange="setBuildViewMode(this.value)">
            <option value="month" ${state.viewMode === "month" ? "selected" : ""}>Month</option>
            <option value="week" ${state.viewMode === "week" ? "selected" : ""}>Week</option>
          </select>
        </div>
      </div>
      <div class="cal-scroll build-cal ${state.viewMode === "week" ? "mode-week" : "mode-month"}" onscroll="onBuildScroll(this)">${weeksHtml}</div>
      ${floatingEditor}
    </section>`;
}
function buildAthletes() {
  const list = [];
  const ctx = state.gymContext;
  if (ctx && Array.isArray(ctx.teams)) {
    ledTeams(ctx).forEach((t) => {
      const gid = "group:" + t.id;
      list.push({
        id: gid,
        name: "Group: " + t.name,
        email: "",
        groupId: t.id,
        isGroup: true
      });
      if (!state.calendars[gid]) state.calendars[gid] = {};
    });
  }
  const ctxAthletes = (ctx && ctx.athletes) || [];
  ctxAthletes.forEach((u) => {
    const id = "u" + u.id;
    if (!list.some((a) => a.serverId === u.id)) {
      list.push({
        id,
        name: u.name || u.email,
        email: u.email || "",
        serverId: u.id,
        team_id: u.team_id,
        team_name: u.team_name || "",
        load_unit: normalizeUnit(u.load_unit),
        distance_unit: normalizeDistanceUnit(u.distance_unit)
      });
      if (!state.calendars[id]) state.calendars[id] = {};
    }
  });
  ATHLETES.forEach((a) => {
    if (!list.some((x) => x.id === a.id || (a.serverId && x.serverId === a.serverId))) {
      list.push(Object.assign({}, a));
    }
  });
  const user = state.auth && state.auth.user;
  if (user && heldRoles(user).indexOf("athlete") >= 0) {
    const email = (user.email || "").toLowerCase();
    if (!list.some((a) => a.serverId === user.id || (email && (a.email || "").toLowerCase() === email))) {
      list.push({
        id: "u" + user.id,
        name: user.name || user.username || "You",
        email: user.email || "",
        serverId: user.id,
        load_unit: normalizeUnit(user.load_unit),
        distance_unit: normalizeDistanceUnit(user.distance_unit),
        self: true
      });
    }
  }
  if (!list.length) {
    return [{ id: "none", name: "No athletes or groups yet", email: "" }];
  }
  return list;
}
function unitSelect(personId) {
  const person = buildAthletes().find((a) => a.id === personId);
  if (!person || person.isGroup || !person.serverId) return "";
  const unit = normalizeUnit(person.load_unit);
  const distance = normalizeDistanceUnit(person.distance_unit);
  return `<label class="unit-set">Load <select aria-label="Athlete load unit" onchange="setAthleteUnit('${esc(person.id)}', this.value)">
    <option value="kg" ${unit === "kg" ? "selected" : ""}>kg</option>
    <option value="lbs" ${unit === "lbs" ? "selected" : ""}>lbs</option>
  </select></label>
  <label class="unit-set">Distance <select aria-label="Athlete distance unit" onchange="setAthleteDistanceUnit('${esc(person.id)}', this.value)">
    <option value="m" ${distance === "m" ? "selected" : ""}>metres</option>
    <option value="km" ${distance === "km" ? "selected" : ""}>km</option>
    <option value="yd" ${distance === "yd" ? "selected" : ""}>yards</option>
    <option value="mi" ${distance === "mi" ? "selected" : ""}>miles</option>
  </select></label>`;
}
function applyAthleteUnit(serverId, unit) {
  const next = normalizeUnit(unit);
  ((state.gymContext && state.gymContext.athletes) || []).forEach((u) => { if (u.id === serverId) u.load_unit = next; });
  ATHLETES.forEach((a) => { if (a.serverId === serverId) a.load_unit = next; });
  state.athletes.forEach((a) => { if (a.serverId === serverId) a.load_unit = next; });
  if (state.auth && state.auth.user && state.auth.user.id === serverId) state.auth.user.load_unit = next;
}
function applyAthleteDistance(serverId, unit) {
  const next = normalizeDistanceUnit(unit);
  ((state.gymContext && state.gymContext.athletes) || []).forEach((u) => { if (u.id === serverId) u.distance_unit = next; });
  ATHLETES.forEach((a) => { if (a.serverId === serverId) a.distance_unit = next; });
  state.athletes.forEach((a) => { if (a.serverId === serverId) a.distance_unit = next; });
  if (state.auth && state.auth.user && state.auth.user.id === serverId) state.auth.user.distance_unit = next;
}
async function setAthleteUnit(personId, unit) {
  const person = buildAthletes().find((a) => a.id === personId);
  if (!person || person.isGroup || !person.serverId) return;
  applyAthleteUnit(person.serverId, unit);
  render();
  try {
    await api("PUT", "/api/users/" + person.serverId, { load_unit: normalizeUnit(unit) });
  } catch (err) {
    toast("Could not save load unit");
    console.error(err);
  }
}
async function setAthleteDistanceUnit(personId, unit) {
  const person = buildAthletes().find((a) => a.id === personId);
  if (!person || person.isGroup || !person.serverId) return;
  applyAthleteDistance(person.serverId, unit);
  render();
  try {
    await api("PUT", "/api/users/" + person.serverId, { distance_unit: normalizeDistanceUnit(unit) });
  } catch (err) {
    toast("Could not save distance unit");
    console.error(err);
  }
}
function athlete() {
  const list = buildAthletes();
  return list.find((a) => a.id === state.athleteId) || list[0];
}
function toggleAthleteMenu(ev) {
  if (ev) ev.stopPropagation();
  state.athleteMenu = !state.athleteMenu;
  render();
}
function switchAthlete(id) {
  state.athleteId = id;
  state.athleteMenu = false;
  state.editor = null;
  writeBuildQuery();
  render();
  loadCalendarSchedule(id);
}
function shiftWeek(n) {
  const next = addDays(state.weekStart, n * 7);
  const build = state.view === "build" && state.role !== "athlete";
  state.weekStart = next;
  if (build) {
    ensureBuildWindow();
    state.buildJumpWeek = state.weekStart;
    writeBuildQuery();
  }
  render();
}
function jumpToday() {
  state.weekStart = sundayOf(APP_TODAY);
  state.focusDay = APP_TODAY;
  if (state.view === "build" && state.role !== "athlete") {
    ensureBuildWindow();
    state.buildJumpWeek = state.weekStart;
    writeBuildQuery();
  }
  render();
}

function dayCol(date) {
  const day = ensureDay(date);
  const st = stats(day);
  const sel = day.items.filter((it) => it.selected);
  const focused = state.focusDay === date ? "focus" : "";
  const items = dayExerciseHtml(date, day);
  const search = state.searchDay === date ? searchPop(date) : "";
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
  const daySelected = state.pick && state.pick.level === "day" && state.pick.date === date;
  const dayHot = clipHotMatches(date, { level: "day" });
  return `<div class="day ${focused}${daySelected ? " day-selected" : ""}${dayHot ? " clip-hot" : ""}" data-day="${date}" style="border-left:3px solid ${day.color || "#3b82f6"}" onmouseenter="state.hoverDay='${date}'" onclick="state.focusDay='${date}';render()" ondragover="dragOver(event)" ondrop="dropOn(event,'${date}',null)">
    <div class="day-top"><button type="button" class="day-date" onclick="selectDay('${date}', event)">${fmtDay(date)}</button>
      <span class="tools">
        <button class="iconbtn" title="Copy Workout" onclick="openCopy('${date}','workout')">⧉</button>
        <button class="iconbtn" title="Workout menu" onclick="openDayMenu('${date}', event)">⋯</button>
      </span>
    </div>
    <div class="week-label">${esc(day.weekLabel || "")}</div>
    <button type="button" class="day-title ${dayHeading(day) === "Add Workout Name" ? "placeholder" : ""}" onclick="editWorkoutDay('${date}', event)">${esc(dayHeading(day))}</button>
    ${day.savedWorkoutId ? `<div class="saved-pill">Saved for ${esc((buildAthletes().find((a) => a.id === day.savedFor) || {}).name || "athlete")}</div>` : ""}
    <div class="row" style="margin-top:0">
      <input type="checkbox" title="Select all" ${sel.length && sel.length === day.items.length ? "checked" : ""} onclick="toggleAll('${date}', this.checked);event.stopPropagation()">
      ${header}
    </div>
    ${recur}${color}${menu}
    <div class="day-items">${items}</div>
    <button class="add-ex" onclick="openSearch('${date}', event)">+ Add Exercise</button>
    ${state.clipboard && (state.clipboard.items || []).length ? `<button class="add-ex" onclick="pasteOn('${date}')">Paste ${state.clipboard.items.length} item(s)</button>` : ""}
    ${search}
    <div class="stats"><span>S <b>${st.s}</b></span><span>R <b>${st.r}</b></span><span>V <b>${st.v}</b></span></div>
  </div>`;
}
function dayExerciseHtml(date, day) {
  const visible = gatedItems(date, day.items);
  let html = "";
  let index = 0;
  while (index < visible.length) {
    const it = visible[index];
    if (it.chainInstance) {
      const instance = it.chainInstance;
      const group = [];
      while (index < visible.length && visible[index].chainInstance === instance) {
        group.push(visible[index]);
        index += 1;
      }
      html += chainBlockHtml(date, day, group);
    } else {
      html += exRow(date, day, it);
      index += 1;
    }
  }
  return html;
}
function chainIsOpen(head, audience) {
  if (!head) return false;
  return audience === "athlete" ? !!head.chainAthleteOpen : !!head.chainCoachOpen;
}
function chainBlockHtml(date, day, group) {
  const head = group[0];
  const instance = head.chainInstance;
  const open = chainIsOpen(head, "coach");
  const selected = state.pick && state.pick.level === "chain" && state.pick.date === date && state.pick.instance === instance;
  const hot = clipHotMatches(date, { level: "chain", instance });
  const color = LETTER_COLOR[head.letter] || "#444";
  const letter = `<button type="button" class="letter chain-letter" draggable="false" style="background:${color};color:${head.letter ? "#111" : "#fff"}" onclick="toggleChainLetter('${date}','${esc(instance)}', event)">${esc(head.letter || "–")}</button>`;
  const menu = state.chainLetterFor === instance
    ? `<div class="pop letter-pop" onclick="event.stopPropagation()">${LETTERS.map((L) => `<button type="button" class="opt" onclick="setChainLetter('${date}','${esc(instance)}','${L}')">${L}</button>`).join("")}<button type="button" class="opt" onclick="setChainLetter('${date}','${esc(instance)}','')">–</button></div>`
    : "";
  return `<div class="chain-block${selected ? " chain-selected" : ""}${hot ? " clip-hot" : ""}${open ? "" : " is-collapsed"}" draggable="true" data-chain-instance="${esc(instance)}" ondragstart="dragStart(event,'${date}','${head.id}')">
    <div class="chain-head">
      <button type="button" class="chain-fold" draggable="false" aria-label="${open ? "Collapse chain" : "Expand chain"}" onclick="toggleChainOpen('${date}','${esc(instance)}','coach', event)">${open ? "▾" : "▸"}</button>
      ${letter}
      <span class="chain-mark">Chain</span>
      <button type="button" class="chain-title" draggable="false" onclick="selectChain('${date}','${esc(instance)}', event)">${esc(head.chainName || "Chain")}</button>
      <span class="tag">${esc(head.chainKind || "")}</span>
      <button type="button" draggable="false" onclick="openChainFromDay('${date}','${instance}');event.stopPropagation()">Edit chain</button>
      <button type="button" draggable="false" onclick="breakChain('${date}','${instance}');event.stopPropagation()">Break apart</button>
      <button type="button" class="chain-trash" draggable="false" title="Delete chain" aria-label="Delete chain" onclick="askDeleteChain('${date}','${instance}');event.stopPropagation()">🗑</button>
    </div>
    ${menu}
    ${open ? group.map((it) => exRow(date, day, it, { inChain: true })).join("") : ""}
  </div>`;
}
function exRow(date, day, it, opts) {
  const color = LETTER_COLOR[it.letter] || "#888";
  const inChain = opts && opts.inChain;
  const letter = inChain ? "" : (it.letter ? `<span class="letter" style="background:${color}">${esc(it.letter)}</span>` : `<span class="letter" style="background:#444;color:#fff">–</span>`);
  const dragAttr = inChain ? "" : ` draggable="true" ondragstart="dragStart(event,'${date}','${it.id}')"`;
  const hot = clipHotMatches(date, { level: "exercise", id: it.id }) ? " clip-hot" : "";
  const editing = state.editor && state.editor.day === date && state.editor.id === it.id ? " editing" : "";
  const sub = scriptLine(it);
  return `<div class="ex ${it.selected ? "selected" : ""}${hot}${editing}" data-id="${esc(it.id)}"${dragAttr} onclick="selectExercise('${date}','${it.id}', event)">
    ${letter}
    <button class="ex-main" title="${esc(it.name + (sub ? "\n" + sub : ""))}" onclick="openEditor('${date}','${it.id}', event)">
      <div class="ex-name">${esc(it.name)}</div>
      <div class="ex-sub">${esc(sub)}</div>
    </button>
    <span class="ex-tools">
      <input class="check" type="checkbox" title="Select" ${it.selected ? "checked" : ""} onclick="toggleItem('${date}','${it.id}', this.checked);event.stopPropagation()">
      <button class="handle" title="Drag">⋮⋮</button>
      <button class="trash" title="Delete" onclick="askDelete('${date}','${it.id}')">🗑</button>
    </span>
  </div>`;
}

function openSearch(date, ev) {
  if (ev) ev.stopPropagation();
  state.searchDay = date;
  state.searchQ = "";
  state.focusDay = date;
  state.editor = null;
  state.pendingFocus = "ex-search";
  render();
}
function searchPop(date) {
  const q = state.searchQ.toLowerCase();
  const list = CATALOG.filter((c) => !q || c.name.toLowerCase().includes(q)).slice(0, 8);
  const chains = (state.chains || []).filter((chain) => {
    if (!q) return true;
    return chain.name.toLowerCase().includes(q) || String(chain.kind || "").toLowerCase().includes(q);
  }).slice(0, 8);
  const chainRows = chains.map((chain) => `<button class="opt chain-opt" onclick="addChainToDay('${date}', ${chain.id})"><span class="chain-mark">Chain</span><span>${esc(chain.name)}</span><span class="tag">${esc(chain.kind || "")}</span></button>`).join("");
  return `<div class="pop search-pop" onclick="event.stopPropagation()">
    <input data-focus="ex-search" type="text" autocomplete="off" placeholder="Search Exercises" value="${esc(state.searchQ)}" oninput="state.searchQ=this.value;render()">
    <div class="search-results">
      ${chainRows}
      ${list.map((c) => `<button class="opt" onclick="addFromCatalog('${date}', ${CATALOG.indexOf(c)})">${esc(c.name)}</button>`).join("")}
      <button class="opt create-row" onclick="createExercise('${date}')">+ Create New Exercise <span class="tag">Shift+Enter</span></button>
    </div>
  </div>`;
}
function catalogType(entry) {
  if (!entry) return "lift";
  if (entry.type === "break" || entry.type === "rest" || entry.type === "video") return entry.type;
  const record = exerciseRecord(entry.name);
  if (!record) return entry.type || "lift";
  return dayTypeForCategory(record.category);
}
function addFromCatalog(date, index) {
  const entry = Object.assign({}, CATALOG[index] || { name: "Exercise", type: "lift" });
  entry.type = catalogType(entry);
  addItem(date, fromCatalog(entry));
}
function nextDayLetter(day) {
  const used = day.items.map((row) => row.letter).filter(Boolean);
  return LETTERS.find((letter) => used.indexOf(letter) < 0) || "A";
}
function chainText(value) {
  if (value == null) return "";
  return String(value).trim();
}
function applyChainMemberFields(it, member, letter) {
  const setsText = chainText(member && member.sets);
  const repsText = chainText(member && member.reps);
  const notesGiven = !!(member && member.notes != null && String(member.notes).trim() !== "");
  it.letter = letter || "";
  it.chainCoachOpen = false;
  it.chainAthleteOpen = false;
  if (it.type === "note") {
    if (notesGiven) it.note = String(member.notes);
    return it;
  }
  if (it.type === "break" || it.type === "rest" || it.type === "video") return it;
  if (setsText !== "") {
    const parsed = parseInt(setsText, 10);
    if (!isNaN(parsed)) resizeSets(it, Math.max(1, Math.min(10, parsed)));
  }
  if (repsText !== "") it.reps = Array(it.sets || 1).fill(repsText);
  if (notesGiven) it.note = String(member.notes);
  else if (it.type !== "circuit") {
    const defaults = libraryDefaultsFrom(exerciseRecord(it.name));
    if (defaults) it.note = defaults.note || "";
  }
  return it;
}
function applyExplicitChainFields(it, member) {
  if (!it || !member) return it;
  const setsText = chainText(member.sets);
  const repsText = chainText(member.reps);
  const notesGiven = member.notes != null && String(member.notes).trim() !== "";
  if (setsText !== "" && it.type !== "note") {
    const parsed = parseInt(setsText, 10);
    if (!isNaN(parsed)) resizeSets(it, Math.max(1, Math.min(10, parsed)));
  }
  if (repsText !== "" && it.type !== "note") it.reps = Array(it.sets || 1).fill(repsText);
  if (notesGiven) it.note = String(member.notes);
  return it;
}
function chainMemberItem(chain, member, index, instance, day, letter) {
  const record = (state.serverExercises || []).find((row) => row.id === member.exercise_id) || null;
  const name = (record && record.name) || (member.exercise && member.exercise.name) || member.name || "Exercise";
  const category = (record && record.category) || (member.exercise && member.exercise.category) || "";
  const type = category ? dayTypeForCategory(category) : "lift";
  const it = fromCatalog({ name, type });
  applyChainMemberFields(it, member, letter || "");
  it.chainId = chain.id;
  it.chainInstance = instance;
  it.chainName = chain.name;
  it.chainKind = chain.kind;
  it.chainOrder = index;
  it.exerciseId = member.exercise_id;
  it.videoUrl = (record && record.video_url) || (member.exercise && member.exercise.video_url) || "";
  it.chainCoachOpen = false;
  it.chainAthleteOpen = false;
  return it;
}
function chainBlockLetter(day, instance) {
  const rows = (day.items || []).filter((it) => it.chainInstance === instance && it.letter);
  return rows.length ? rows[0].letter : "";
}
function addChainToDay(date, chainId) {
  const chain = (state.chains || []).find((row) => row.id === chainId);
  if (!chain || !(chain.members || []).length) {
    toast("That chain has no exercises");
    return;
  }
  snapshot();
  const day = ensureDay(date);
  const instance = "c" + chain.id + "x" + uid();
  chain.members.forEach((member, index) => {
    day.items.push(chainMemberItem(chain, member, index, instance, day));
  });
  state.searchDay = null;
  state.editor = null;
  state.focusDay = date;
  refreshFutureCopies(date);
  noteDayEdit(date);
  noteHist("Added " + chain.name);
  toast("Added " + chain.name);
  render();
}
function breakChain(date, instance) {
  const day = ensureDay(date);
  const members = day.items.filter((it) => it.chainInstance === instance);
  if (!members.length) return;
  snapshot();
  const letter = members[0].letter || "";
  members.forEach((it) => {
    it.chainId = null;
    it.chainInstance = "";
    it.chainName = "";
    it.chainKind = "";
    it.chainOrder = 0;
    it.chainCoachOpen = false;
    it.chainAthleteOpen = false;
    it.letter = letter;
  });
  refreshFutureCopies(date);
  noteDayEdit(date);
  noteHist("Broke chain apart");
  toast("Chain broken into exercises");
  render();
}
function freshenChainInstances(items) {
  const map = {};
  items.forEach((it) => {
    if (!it.chainInstance) return;
    if (!map[it.chainInstance]) map[it.chainInstance] = "c" + (it.chainId || 0) + "x" + uid();
    it.chainInstance = map[it.chainInstance];
  });
  return items;
}
function createExercise(date) {
  openNewLibraryExercise(date, (state.searchQ || "").trim());
}
function blankLibraryRow(name) {
  return {
    name: name || "",
    category: "Strength",
    video_url: "",
    default_sets: 3,
    default_reps: "10",
    default_load: "",
    default_rest: "",
    default_rest_rep: "",
    default_distance: "",
    default_tempo: "",
    default_velocity: "",
    default_power: "",
    default_pct: "",
    intensity_kind: "",
    intensity_value: "",
    default_stations: "",
    default_notes: "",
    completion_only: false
  };
}
function openNewLibraryExercise(date, name, opts) {
  state.searchDay = null;
  const libraryOnly = !!(opts && opts.libraryOnly);
  const row = blankLibraryRow(name);
  openEdit({
    title: libraryOnly ? "Add exercise" : "Create exercise",
    hint: "Saved to the exercise library when you save. Cancel writes nothing.",
    date,
    liveCategory: true,
    fields: exerciseFields(row),
    onSave: (values) => libraryOnly ? saveLibraryExercise(values) : saveNewLibraryExercise(date, values)
  });
}
async function postLibraryExercise(values) {
  const payload = libraryExercisePayload(values);
  if (payload.error) { toast(payload.error); return null; }
  if (!payload.name) { toast("Name the exercise"); return null; }
  try {
    return await api("POST", "/api/exercises", payload);
  } catch (err) {
    const message = err.message || "";
    if (message.toLowerCase().indexOf("already exists") >= 0) toast("That exercise is already in the library");
    else toast(message || "Could not save that exercise");
    return null;
  }
}
function rememberCreatedExercise(created) {
  const index = state.serverExercises.findIndex((row) => row.id === created.id);
  if (index >= 0) state.serverExercises[index] = created;
  else state.serverExercises.push(created);
  syncCatalogExercise(created);
  if (!state.lifts.some((row) => String(row.name || "").toLowerCase() === created.name.toLowerCase())) {
    state.lifts.push({ id: "srv" + created.id, name: created.name, type: dayTypeForCategory(created.category), tags: "N/A" });
  }
}
async function saveNewLibraryExercise(date, values) {
  const created = await postLibraryExercise(values);
  if (!created) return;
  rememberCreatedExercise(created);
  addItem(date, fromCatalog({ name: created.name, type: dayTypeForCategory(created.category) }));
  toast("Saved to the exercise library");
}
async function saveLibraryExercise(values) {
  const created = await postLibraryExercise(values);
  if (!created) return;
  rememberCreatedExercise(created);
  state.toolForm.exName = "";
  state.modal = null;
  if (!categoryVisible(created.category)) state.managing = canonicalCategory(created.category);
  toast("Exercise added");
  render();
}
function addItem(date, it) {
  state.modal = null;
  snapshot();
  const day = ensureDay(date);
  if (it.letter) it.letter = letterForNewItem(day.items, it, LETTERS);
  day.items.push(it);
  state.searchDay = null;
  state.editor = null;
  state.focusDay = date;
  refreshFutureCopies(date);
  noteDayEdit(date);
  noteHist("Added " + it.name);
  openEditor(date, it.id);
}

function openEditor(date, id, ev) {
  if (ev) ev.stopPropagation();
  const it = findItem(date, id);
  if (!it) return;
  const switching = state.editor && (state.editor.day !== date || state.editor.id !== id);
  if (switching && !closeEditor()) return;
  state.focusDay = date;
  state.searchDay = null;
  state.modal = null;
  state.propMenu = false;
  state.letterMenu = false;
  state.optionsMenu = false;
  state.supersetMenu = false;
  state.trackMenu = false;
  const same = state.editor && state.editor.day === date && state.editor.id === id && state.editor.baseline;
  if (!same) state.editor = { day: date, id, baseline: JSON.parse(JSON.stringify(it)) };
  selectExercise(date, id, null, { silent: true });
  render();
}
function closeEditor() {
  if (!state.editor) return true;
  if (state.modal && state.modal.type === "editor-name") return false;
  saveEditor();
  return !state.editor;
}
function saveEditor() {
  const ed = state.editor;
  if (!ed) { state.modal = null; render(); return; }
  const it = findItem(ed.day, ed.id);
  if (it && !String(it.name || "").trim()) {
    state.modal = { type: "editor-name", name: "" };
    render();
    return;
  }
  const date = ed.day;
  state.editor = null;
  state.modal = null;
  noteDayEdit(date);
  queueDaySave(state.athleteId, date, { explicit: true });
  render();
}
function discardEditor() {
  const ed = state.editor;
  if (!ed) { state.modal = null; render(); return; }
  const it = findItem(ed.day, ed.id);
  if (it && ed.baseline) {
    const keepId = it.id;
    const restored = JSON.parse(JSON.stringify(ed.baseline));
    Object.keys(it).forEach((key) => { delete it[key]; });
    Object.assign(it, restored);
    it.id = keepId;
  }
  const date = ed.day;
  state.editor = null;
  state.modal = null;
  noteDayEdit(date);
  render();
}
function acceptEditorName() {
  const ed = state.editor;
  const name = String((state.modal && state.modal.name) || "").trim();
  if (!ed || !name) return;
  const it = findItem(ed.day, ed.id);
  if (it) it.name = name;
  saveEditor();
}
function dismissEditorName() {
  state.modal = null;
  render();
}
function toggleEditorMenu(which, ev) {
  if (ev) ev.stopPropagation();
  const next = !state[which];
  state.propMenu = false;
  state.letterMenu = false;
  state.optionsMenu = false;
  state.supersetMenu = false;
  state.trackMenu = false;
  state[which] = next;
  render();
}
function editorHead(date, it, day) {
  const letterBtn = it.chainInstance
    ? ""
    : `<button type="button" class="pill" onclick="toggleEditorMenu('letterMenu', event)">${esc(letterCode(day, it))} ▾</button>`;
  const letterPop = !it.chainInstance && state.letterMenu
    ? `<div class="pop letter-pop" onclick="event.stopPropagation()">${LETTERS.map((L) => `<button type="button" class="opt" onclick="setLetter('${date}','${it.id}','${L}')">${L}</button>`).join("")}<button type="button" class="opt" onclick="setLetter('${date}','${it.id}','')">–</button></div>`
    : "";
  return `<div class="editor-h">
      <span class="letter" style="background:${LETTER_COLOR[it.letter] || "#666"}">${esc(it.letter || "•")}</span>
      <input class="name-input" aria-label="Exercise name" data-focus="exname-${it.id}" value="${esc(it.name)}" oninput="setField('${date}','${it.id}','name', this.value)" onchange="renderSoon()">
      ${letterBtn}
      <button type="button" class="iconbtn" title="Delete" onclick="askDelete('${date}','${it.id}')">🗑</button>
      <button type="button" class="iconbtn" title="Close" onclick="closeEditor();event.stopPropagation()">✕</button>
    </div>
    ${letterPop}
    <button type="button" class="linkish" onclick="openInfo('${date}','${it.id}')">+ Add Additional Info (Shift + I)</button>
    ${it.note ? `<div class="note-line">${esc(it.note)}</div>` : ""}`;
}
function workTable(date, it) {
  const keys = [];
  if (it.trackTime || it.trackReps !== false || it.type === "circuit") keys.push("reps");
  (it.props || []).forEach((key) => { if (PROP_LABEL[key] && keys.indexOf(key) < 0) keys.push(key); });
  const propRows = keys.map((p) => propRow(date, it, p)).join("");
  return `<table class="prop-table"><tr><th></th>${Array.from({ length: it.sets || 1 }, (_, i) => `<th>Set ${i + 1}</th>`).join("")}</tr>${propRows}</table>`;
}
function addPropButton(date, it) {
  return `<div class="prop-anchor">
    <button type="button" class="pill" onclick="toggleEditorMenu('propMenu', event)">+ Add Property <span class="kbd">Ctrl+P</span></button>
    ${state.propMenu ? propMenu(date, it.id) : ""}
  </div>`;
}
function circuitActions(date, it) {
  return `<div class="row editor-actions">
      <div class="superset-anchor">
        <span>Superset</span>
        <button type="button" class="pill" onclick="toggleEditorMenu('supersetMenu', event)">${esc(supersetLabel(date, it))} ▾</button>
        ${state.supersetMenu ? supersetPop(date, it) : ""}
      </div>
      <div class="menu-anchor">
        <button type="button" class="pill" onclick="toggleEditorMenu('optionsMenu', event)">Options ▾</button>
        ${optionsPop(date, it)}
      </div>
      <button type="button" class="pill ${it.completionOnly ? "on" : ""}" onclick="toggleFlag('${date}','${it.id}','completionOnly')">${it.completionOnly ? "✓ " : ""}Completion Only</button>
    </div>`;
}
function editorActions(date, it) {
  const volume = it.trackVolume ? `<div class="hint">Volume ${setVolume(it)}</div>` : "";
  return `<div class="row editor-actions">
      <div class="superset-anchor">
        <span>Superset</span>
        <button type="button" class="pill" onclick="toggleEditorMenu('supersetMenu', event)">${esc(supersetLabel(date, it))} ▾</button>
        ${state.supersetMenu ? supersetPop(date, it) : ""}
      </div>
      <div class="menu-anchor">
        <button type="button" class="pill" onclick="toggleEditorMenu('optionsMenu', event)">Options ▾</button>
        ${optionsPop(date, it)}
      </div>
      ${trackControl(date, it)}
      <button type="button" class="pill ${it.trackVolume ? "on" : ""}" onclick="toggleFlag('${date}','${it.id}','trackVolume')">${it.trackVolume ? "✓ " : ""}Track Volume ▾</button>
    </div>${volume}`;
}
function setVolume(it) {
  let total = 0;
  (it.reps || []).forEach((rep, i) => { total += (+rep || 0) * (+((it.loads || [])[i]) || 0); });
  return total;
}
function editorFrameWidth(it) {
  if (!it || it.type === "questionnaire" || it.type === "note" || it.type === "break" || it.type === "video" || it.type === "rest") return 400;
  const sets = Math.max(1, it.sets || 1);
  return Math.min(560, Math.max(400, 120 + sets * 72));
}
function editorPop(date) {
  const it = findItem(date, state.editor.id);
  if (!it) return "";
  const day = ensureDay(date);
  const head = editorHead(date, it, day);
  const frame = `style="width:min(${editorFrameWidth(it)}px, calc(100vw - 32px))"`;
  if (it.type === "note") {
    return `<div class="editor build-editor" ${frame} onclick="event.stopPropagation()">${head}
      <div class="hint">The athlete reads this. It has no sets.</div>
      <textarea data-focus="note-${it.id}" oninput="setField('${date}','${it.id}','note', this.value)" onchange="renderSoon()">${esc(it.note || "")}</textarea>
    </div>`;
  }
  if (it.type === "questionnaire") {
    return `<div class="editor build-editor" ${frame} onclick="event.stopPropagation()">${head}
      ${it.questions.map((q, i) => `<div class="q">${i + 1}. ${esc(q)}</div>`).join("")}
      <label class="chk" style="color:#ddd"><input type="checkbox" ${it.requireResponse ? "checked" : ""} onchange="itRequire('${date}','${it.id}', this.checked)"> Require Response</label>
      <div class="hint">All questionnaire items must be fully completed before showing workout.</div>
    </div>`;
  }
  if (it.type === "circuit") {
    return `<div class="editor build-editor" ${frame} onclick="event.stopPropagation()">${head}
      <div class="hint">Stations, one per line</div>
      <textarea data-focus="detail-${it.id}" oninput="setField('${date}','${it.id}','detail', this.value)" onchange="renderSoon()">${esc(it.detail || "")}</textarea>
      <div class="sets-line">${setRow(date, it, "Rounds")}</div>
      ${circuitActions(date, it)}
    </div>`;
  }
  if (it.type === "break" || it.type === "video" || it.type === "rest") {
    return `<div class="editor build-editor" ${frame} onclick="event.stopPropagation()">${head}
      ${it.type === "video" ? `<input data-focus="vid-${it.id}" placeholder="Video URL" value="${esc(it.videoUrl)}" oninput="setField('${date}','${it.id}','videoUrl', this.value)" onchange="renderSoon()">` : ""}
      ${it.type === "rest" ? `<div class="row">Seconds <input style="width:80px" data-focus="rest-${it.id}" value="${esc(it.reps[0] || 60)}" oninput="setRestSeconds('${date}','${it.id}', this.value)" onchange="renderSoon()"></div>` : ""}
    </div>`;
  }
  return `<div class="editor build-editor" ${frame} onclick="event.stopPropagation()">${head}
    <div class="sets-line">${setRow(date, it, "Sets")}${addPropButton(date, it)}</div>
    <div class="prop-scroll">${workTable(date, it)}</div>
    ${editorActions(date, it)}
  </div>`;
}
function trackControl(date, it) {
  return `<div class="dose-switch" role="group" aria-label="Reps or seconds">
    <button type="button" class="pill ${it.trackTime ? "" : "on"}" aria-pressed="${it.trackTime ? "false" : "true"}" onclick="setTrack('${date}','${it.id}','reps')">${it.trackTime ? "" : "✓ "}Reps</button>
    <button type="button" class="pill ${it.trackTime ? "on" : ""}" aria-pressed="${it.trackTime ? "true" : "false"}" onclick="setTrack('${date}','${it.id}','time')">${it.trackTime ? "✓ " : ""}Seconds</button>
  </div>`;
}
function setRow(date, it, label) {
  const fill = label === "Sets"
    ? `<button type="button" class="pill" aria-label="Copy set 1 onto every set" onclick="fillSetsFromFirst('${date}','${it.id}')">Fill sets</button>`
    : "";
  return `<div class="row sets-row"><span class="sets-label">${label}</span><div class="stepper">
    <button type="button" aria-label="Fewer ${label}" onclick="changeSets('${date}','${it.id}',-1)">−</button><b>${it.sets}</b>
    <button type="button" aria-label="More ${label}" onclick="changeSets('${date}','${it.id}',1)">+</button>
  </div><span class="hint"># of ${label}: 1–10</span>
  ${fill}
  <button type="button" class="iconbtn" title="Delete" onclick="askDelete('${date}','${it.id}')">🗑</button></div>`;
}
function propMenu(date, id) {
  const it = findItem(date, id);
  const loadLabel = displayUnit() ? "Load (" + unitWord(displayUnit()) + ")" : "Load";
  const opts = [
    ["load", loadLabel], ["rest", "Rest"], ["restRep", "Rest/Rep"],
    ["distance", "Distance (" + distanceWord(displayDistanceUnit()) + ")"],
    ["tempo", "Tempo"], ["velocity", "Velocity"], ["power", "Peak Power"], ["pct", "%PR"],
    ["intensity", "Intensity"]
  ];
  return `<div class="pop prop-menu" onclick="event.stopPropagation()">
    <div class="prop-menu-h"><b>Add Property</b><span>Ctrl+P</span></div>
    ${opts.map(([k, l]) => `<button type="button" class="opt ${(it.props || []).includes(k) ? "active" : ""}" onclick="addProp('${date}','${id}','${k}')">${(it.props || []).includes(k) ? "✓ " : ""}${l}</button>`).join("")}
    <button type="button" class="opt about-prop" onclick="aboutProperties(event)">ⓘ About Properties</button>
  </div>`;
}
function aboutProperties(ev) {
  if (ev) ev.stopPropagation();
  state.propMenu = false;
  toast("Load, Rest, Rest/Rep, Distance, Tempo, Velocity, Peak Power, %PR, and Intensity are entered on each set. Seconds is the Reps / Seconds switch, and each set keeps its own time. Intensity is one of RPE, percent of a 1-rep max, or RIR.");
  render();
}
function doseValue(it, value) {
  const raw = value == null ? "" : String(value);
  return it && it.trackTime ? raw.replace(/s$/i, "") : raw;
}
function propArray(it, key) {
  const map = { reps: "reps", load: "loads", rest: "rests", restRep: "restReps", distance: "distances", intensity: "intensities", tempo: "tempos", velocity: "velocities", power: "powers", pct: "pcts" };
  const sets = it.sets || 1;
  const arr = (it[map[key]] || []).slice(0, sets);
  while (arr.length < sets) arr.push("");
  return arr;
}
function fieldLabel(it, key) {
  if (key === "reps") return it && it.trackTime ? "Time" : "Reps";
  if (key === "load") return displayUnit() ? "Load (" + unitWord(displayUnit()) + ")" : "Load";
  if (key === "restRep") return "Rest/Rep (s)";
  if (key === "distance") return "Distance (" + distanceWord(displayDistanceUnit()) + ")";
  if (key === "intensity") return intensityLabel(it && it.intensityKind);
  return PROP_LABEL[key];
}
function propRow(date, it, key) {
  if (key === "reps" && it.trackReps === false && !it.trackTime && it.type !== "circuit") return "";
  const label = fieldLabel(it, key);
  const time = key === "reps" && it.trackTime;
  const info = key === "reps" ? `<button type="button" class="iconbtn reps-info" title="${time ? "Seconds for each set" : "Reps for each set. Seconds is beside Options."}" onclick="event.stopPropagation();toast('${time ? "Each set has its own seconds" : "Each set has its own reps. Seconds, beside Options, switches this row to time."}')">ⓘ</button>` : "";
  const cells = propArray(it, key).map((v, i) => {
    const shown = doseValue(it, v);
    const suffix = time ? `<span class="sec-suffix">s</span>` : "";
    return `<td><span class="set-val${time ? " is-time" : ""}"><input aria-label="${label} set ${i + 1}" data-focus="${key}-${it.id}-${i}" data-set-field="${key}" autocomplete="off" value="${esc(shown)}" oninput="setCell('${date}','${it.id}','${key}',${i}, this.value)" onchange="commitSetCell('${date}','${it.id}','${key}',${i});renderSoon()" onkeydown="tabSetField(event,'${date}','${it.id}','${key}',${i})" onfocus="this.select()">${suffix}</span></td>`;
  }).join("");
  const kindPick = key === "intensity"
    ? `<select aria-label="Intensity kind" onchange="setIntensityKind('${date}','${it.id}', this.value)">${["RPE", "% of 1-rep max", "RIR"].map((opt) => `<option ${intensityChoice(it.intensityKind) === opt ? "selected" : ""}>${esc(opt)}</option>`).join("")}</select>`
    : "";
  return `<tr><th>${kindPick || label}${info}</th>${cells}</tr>`;
}
function setIntensityKind(date, id, kind) {
  const it = findItem(date, id);
  if (!it) return;
  snapshot();
  it.intensityKind = intensityKindCode(kind) || "rpe";
  if (!it.props) it.props = [];
  if (it.props.indexOf("intensity") < 0) it.props.push("intensity");
  refreshFutureCopies(date);
  noteDayEdit(date);
  render();
}
function optionsPop(date, it) {
  if (!state.optionsMenu) return "";
  return `<div class="pop options-pop" onclick="event.stopPropagation()">
    <button type="button" class="opt" onclick="toggleFlag('${date}','${it.id}','completionOnly')">${it.completionOnly ? "✓ " : ""}Completion only</button>
    <button type="button" class="opt" onclick="duplicateItem('${date}','${it.id}')">Duplicate</button>
    <button type="button" class="opt danger" onclick="askDelete('${date}','${it.id}')">Remove</button>
  </div>`;
}
function supersetLabel(date, it) {
  const day = ensureDay(date);
  const partners = day.items.filter((x) => x.id !== it.id && x.letter && x.letter === it.letter && x.type !== "break" && x.type !== "rest" && x.type !== "video");
  if (!partners.length) return "None";
  const name = partners[0].name || "Exercise";
  return name.length > 16 ? name.slice(0, 16) + "…" : name;
}
function supersetPop(date, it) {
  const day = ensureDay(date);
  const others = day.items.filter((x) => x.id !== it.id && x.type !== "break" && x.type !== "rest" && x.type !== "video");
  const none = supersetLabel(date, it) === "None";
  const rows = others.map((x) => `<button type="button" class="opt ${x.letter && x.letter === it.letter && !none ? "active" : ""}" onclick="joinSuperset('${date}','${it.id}','${x.id}')">${esc(letterCode(day, x))} ${esc(x.name)}</button>`).join("");
  return `<div class="pop superset-pop" onclick="event.stopPropagation()">
    <button type="button" class="opt ${none ? "active" : ""}" onclick="clearSuperset('${date}','${it.id}')">None</button>
    ${rows || `<div class="hint">Add another exercise to superset</div>`}
  </div>`;
}
function setLetter(date, id, letter) {
  snapshot();
  reorderForLetter(ensureDay(date).items, id, letter);
  state.letterMenu = false;
  refreshFutureCopies(date);
  noteDayEdit(date);
  render();
}
function changeSets(date, id, d) {
  snapshot();
  const it = findItem(date, id);
  resizeSets(it, (it.sets || 1) + d);
  refreshFutureCopies(date);
  noteDayEdit(date);
  render();
}
function fillSetsFromFirst(date, id) {
  const it = findItem(date, id);
  if (!it) return;
  snapshot();
  const n = it.sets || 1;
  const fill = (arr) => {
    const first = arr && arr.length ? arr[0] : "";
    return Array.from({ length: n }, () => (first == null ? "" : first));
  };
  it.reps = fill(it.reps || []);
  ["loads", "rests", "restReps", "distances", "intensities", "tempos", "velocities", "powers", "pcts"].forEach((key) => {
    it[key] = fill(it[key] || []);
  });
  it.touchedCells = {};
  refreshFutureCopies(date);
  noteDayEdit(date);
  render();
}
const SET_ARRAY = {
  reps: "reps", load: "loads", rest: "rests", restRep: "restReps", distance: "distances",
  intensity: "intensities", tempo: "tempos", velocity: "velocities", power: "powers", pct: "pcts"
};
function setArray(it, key) {
  const name = SET_ARRAY[key];
  if (!name) return [];
  if (!it[name]) it[name] = [];
  return it[name];
}
function setFieldOrder(it) {
  const keys = [];
  if (it.trackTime || it.trackReps !== false || it.type === "circuit") keys.push("reps");
  (it.props || []).forEach((key) => { if (PROP_LABEL[key] && keys.indexOf(key) < 0) keys.push(key); });
  const order = [];
  const n = it.sets || 1;
  keys.forEach((key) => {
    if (key === "reps" && it.trackReps === false && !it.trackTime && it.type !== "circuit") return;
    for (let i = 0; i < n; i++) order.push({ key, i, focus: key + "-" + it.id + "-" + i });
  });
  return order;
}
function rememberUntouched(it, key) {
  const arr = setArray(it, key);
  const baseline = arr.length ? String(arr[0] ?? "") : "";
  const touched = it.touchedCells || (it.touchedCells = {});
  const n = it.sets || 1;
  for (let j = 1; j < n; j++) {
    if (String(arr[j] ?? "") !== baseline) touched[key + ":" + j] = true;
  }
  it._set1Session = { key, baseline };
}
function propagateSet1(it, key, value) {
  const arr = setArray(it, key);
  const touched = it.touchedCells || {};
  const n = it.sets || 1;
  for (let j = 1; j < n; j++) {
    if (touched[key + ":" + j]) continue;
    while (arr.length <= j) arr.push("");
    arr[j] = value;
  }
}
function paintSetFields(it, key) {
  const arr = setArray(it, key);
  const n = it.sets || 1;
  for (let j = 0; j < n; j++) {
    const el = document.querySelector('[data-focus="' + key + "-" + it.id + "-" + j + '"]');
    if (!el || document.activeElement === el) continue;
    el.value = arr[j] == null ? "" : String(arr[j]);
  }
}
function commitSet1Session(it) {
  if (!it || !it._set1Session) return;
  const session = it._set1Session;
  it._set1Session = null;
  if (!session.dirty) return;
  const arr = setArray(it, session.key);
  if (String(arr[0] ?? "") === session.baseline) return;
  if (!it.fieldSeed) it.fieldSeed = {};
  it.fieldSeed[session.key] = true;
}
function commitSetCell(date, id, key, i) {
  const it = findItem(date, id);
  if (!it || i !== 0) return;
  const before = JSON.stringify(it.fieldSeed || {});
  commitSet1Session(it);
  if (JSON.stringify(it.fieldSeed || {}) !== before) {
    refreshFutureCopies(date);
    noteDayEdit(date);
  }
}
function tabSetField(ev, date, id, key, i) {
  if (!ev || ev.key !== "Tab" || ev.altKey || ev.metaKey || ev.ctrlKey) return;
  const it = findItem(date, id);
  if (!it) return;
  const order = setFieldOrder(it);
  const idx = order.findIndex((row) => row.key === key && row.i === i);
  if (idx < 0) return;
  const dest = order[ev.shiftKey ? idx - 1 : idx + 1];
  if (!dest) return;
  ev.preventDefault();
  if (i === 0) commitSet1Session(it);
  state.pendingFocus = dest.focus;
  render();
}
function setTrack(date, id, mode) {
  const it = findItem(date, id);
  if (!it) return;
  snapshot();
  it.trackTime = mode === "time";
  it.trackReps = mode !== "time";
  state.trackMenu = false;
  state.propMenu = false;
  state.optionsMenu = false;
  refreshFutureCopies(date);
  noteDayEdit(date);
  render();
}
function addProp(date, id, key) {
  const it = findItem(date, id);
  if (!it) return;
  if (!it.props) it.props = [];
  const map = { load: "loads", rest: "rests", restRep: "restReps", distance: "distances", intensity: "intensities", tempo: "tempos", velocity: "velocities", power: "powers", pct: "pcts" };
  if (it.props.includes(key)) {
    it.props = it.props.filter((k) => k !== key);
    if (key === "intensity") it.intensityKind = "";
  } else {
    it.props.push(key);
    if (key === "intensity" && !it.intensityKind) it.intensityKind = "rpe";
    const arrKey = map[key];
    const sets = it.sets || 1;
    const fill = (it.libraryDefaults && it.libraryDefaults[key]) || "";
    if (!it[arrKey]) it[arrKey] = [];
    while (it[arrKey].length < sets) it[arrKey].push("");
    it[arrKey] = it[arrKey].slice(0, sets);
    if (fill && it[arrKey].every((x) => x === "" || x == null)) it[arrKey] = Array(sets).fill(String(fill));
  }
  state.propMenu = false;
  refreshFutureCopies(date);
  noteDayEdit(date);
  render();
}
function setCell(date, id, key, i, value) {
  const it = findItem(date, id);
  if (!it || !SET_ARRAY[key]) return;
  if (key === "reps" && it.trackTime) value = String(value == null ? "" : value).replace(/s$/i, "");
  const arr = setArray(it, key);
  while (arr.length <= i) arr.push("");
  const seeded = !!(it.fieldSeed && it.fieldSeed[key]);
  if (i > 0) {
    if (!it.touchedCells) it.touchedCells = {};
    it.touchedCells[key + ":" + i] = true;
  }
  if (i === 0 && !seeded) {
    if (it._set1Session && it._set1Session.key !== key) commitSet1Session(it);
    if (!it._set1Session || it._set1Session.key !== key) rememberUntouched(it, key);
    arr[0] = value;
    it._set1Session.dirty = String(value) !== it._set1Session.baseline;
    propagateSet1(it, key, value);
    paintSetFields(it, key);
  } else {
    arr[i] = value;
  }
  refreshFutureCopies(date);
  noteDayEdit(date);
}
function setField(date, id, key, value) {
  const it = findItem(date, id);
  if (!it) return;
  it[key] = value;
  refreshFutureCopies(date);
  noteDayEdit(date);
}
function setRestSeconds(date, id, value) {
  const it = findItem(date, id);
  it.reps[0] = value;
  it.note = value + "s";
  refreshFutureCopies(date);
  noteDayEdit(date);
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
  noteDayEdit(date);
  noteHist("Reordered " + it.name);
  render();
}
function toggleFlag(date, id, key) {
  const it = findItem(date, id);
  it[key] = !it[key];
  state.optionsMenu = false;
  noteDayEdit(date);
  render();
}
function itRequire(date, id, on) {
  const it = findItem(date, id);
  if (it) it.requireResponse = !!on;
  noteDayEdit(date);
  render();
}
function clearSuperset(date, id) {
  const day = ensureDay(date);
  const it = findItem(date, id);
  if (!it) return;
  snapshot();
  const used = day.items.filter((x) => x.id !== id).map((x) => x.letter);
  if (used.includes(it.letter)) it.letter = LETTERS.find((L) => !used.includes(L)) || it.letter;
  it.supersetWith = "";
  state.supersetMenu = false;
  refreshFutureCopies(date);
  noteDayEdit(date);
  render();
}
function joinSuperset(date, id, otherId) {
  const it = findItem(date, id);
  const other = findItem(date, otherId);
  if (!it || !other) { toast("Add another exercise to superset"); return; }
  snapshot();
  it.letter = other.letter || it.letter || "A";
  if (!other.letter) other.letter = it.letter;
  it.supersetWith = other.id;
  state.supersetMenu = false;
  refreshFutureCopies(date);
  noteDayEdit(date);
  toast("Added to superset " + it.letter);
  render();
}
function cycleSuperset(date, id) {
  const day = ensureDay(date);
  const it = findItem(date, id);
  const others = day.items.filter((x) => x.id !== id && x.letter && x.type !== "break" && x.type !== "rest" && x.type !== "video");
  if (!others.length) { toast("Add another exercise to superset"); return; }
  const next = others.find((x) => x.letter !== it.letter) || others[0];
  joinSuperset(date, id, next.id);
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
  noteDayEdit(date);
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
      noteDayEdit(date);
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
  noteDayEdit(date);
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
function refreshFutureCopies(date, athleteId = state.athleteId) {
  const calendar = state.calendars[athleteId] || (state.calendars[athleteId] = {});
  const day = calendar[date] || (calendar[date] = blankDay(date));
  if (day.recurFrom && day.recurFrom !== date) return [];
  const sourceDate = date;
  const source = day;
  const weeks = source.recurWeeks || 0;
  if (!weeks) return [];
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
    copy.edited = false;
    copy.editSeq = 0;
    copy.savedAt = null;
    copy.hydrated = true;
    copy.saveFails = 0;
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
  const person = buildAthletes().find((a) => a.id === row.savedFor);
  if (!person || person.id === "none") return;
  if (person.isGroup && person.groupId) {
    const existing = await api("GET", "/api/assignments?group_id=" + person.groupId + "&date=" + row.date);
    for (const item of existing) await api("DELETE", "/api/assignments/" + item.id);
    return;
  }
  const user = person.self && state.auth && state.auth.user ? state.auth.user : await ensureUser(person, "student");
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
    noteDayEdit(sourceDate);
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
  noteDayEdit(sourceDate);
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
function setColor(date, c) { snapshot(); ensureDay(date).color = c; noteDayEdit(date); state.colorMenu = null; render(); }
function saveFocused() { saveDay(state.focusDay || APP_TODAY); }
function saveDay(date) {
  state.dayMenu = null;
  const athleteId = state.athleteId;
  const key = daySaveKey(athleteId, date);
  clearTimeout(autosaveTimers[key]);
  delete autosaveTimers[key];
  return queueDaySave(athleteId, date, { explicit: true });
}

function errorText(payload, raw) {
  const errJson = payload && typeof payload === "object" ? payload : null;
  if (!errJson) return raw || "";
  if (typeof errJson.detail === "string") return errJson.detail;
  if (Array.isArray(errJson.detail)) {
    return errJson.detail.map((d) => (d && d.msg) ? d.msg : (typeof d === "object" ? JSON.stringify(d) : String(d))).join(", ");
  }
  if (errJson.detail && typeof errJson.detail === "object") return JSON.stringify(errJson.detail);
  if (errJson.message) return errJson.message;
  return JSON.stringify(errJson);
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
  // Read the body once. A failed res.json() already consumes the stream, and a
  // second res.text() throws "Body is disturbed or locked".
  const raw = await res.text();
  let payload = null;
  if (raw) {
    try { payload = JSON.parse(raw); } catch (_) { payload = null; }
  }
  if (res.status === 401 && !url.includes("/api/auth/login") && !url.includes("/api/auth/register")) {
    handleLogout("Your session has expired. Please log in again.");
    throw new Error("Unauthorized");
  }
  if (!res.ok) {
    throw new Error(errorText(payload, raw) || String(res.status));
  }
  return payload;
}
async function ensureUser(person, role) {
  if (person && person.serverId) return { id: person.serverId, name: person.name, email: person.email };
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
async function ensureExercise(name, category) {
  const list = await api("GET", "/api/exercises?search=" + encodeURIComponent(name));
  const exact = list.find((e) => e.name.toLowerCase() === name.toLowerCase());
  if (exact) return exact;
  try {
    return await api("POST", "/api/exercises", { name, category: category || "Strength" });
  } catch (err) {
    const again = await api("GET", "/api/exercises?search=" + encodeURIComponent(name));
    const hit = again.find((e) => e.name.toLowerCase() === name.toLowerCase());
    if (hit) return hit;
    throw err;
  }
}
function taggedList(label, arr) {
  const values = arr || [];
  if (!values.some((x) => x !== "" && x != null)) return "";
  return label + ":" + values.join(",");
}
function stampWorkoutExerciseIds(day, sentItems, workout) {
  const saved = (workout.exercises || []).slice().sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
  const published = (sentItems || []).filter((it) => it.name && it.type !== "break");
  published.forEach((sent, index) => {
    const we = saved[index];
    if (!we) return;
    const live = (day.items || []).find((it) => it.id === sent.id);
    if (!live) return;
    live.weId = we.id;
    live.exerciseId = we.exercise_id;
    if (we.exercise && we.exercise.video_url) live.videoUrl = we.exercise.video_url;
  });
}
async function publishDay(date, opts = {}) {
  const athleteId = opts.athleteId || state.athleteId;
  const day = (state.calendars[athleteId] || {})[date];
  const person = buildAthletes().find((a) => a.id === athleteId) || null;
  if (!person || person.id === "none") { if (!opts.quiet) toast("Create a group or athlete first"); return false; }
  if (!day) { if (!opts.quiet) toast("Pick a day before saving"); return false; }
  if (!(day.items || []).length) day.title = "Rest";
  const snapItems = JSON.parse(JSON.stringify(day.items || []));
  const snapTitle = day.title || ("Workout " + fmtDay(date));
  const snapWeek = day.weekLabel || "";
  try {
    if (!opts.quiet) toast("Saving for " + person.name + "…");
    let coachId = state.auth && state.auth.user && state.auth.user.id;
    if (!coachId) {
      const coach = await ensureUser({ id: "coach", name: "wourkout Coach", email: "coach@wourkout.app" }, "coach");
      coachId = coach.id;
    }
    let targetUserId = null;
    let targetGroupId = null;
    if (person.isGroup && person.groupId) {
      targetGroupId = person.groupId;
    } else {
      const user = person.self && state.auth && state.auth.user
        ? state.auth.user
        : await ensureUser(person, "student");
      targetUserId = user.id;
    }
    const exercises = [];
    for (const it of snapItems) {
      if (!it.name || it.type === "break") continue;
      const category = it.type === "circuit" ? "Circuit" : it.type === "questionnaire" ? "Questionnaire" : it.type === "note" ? "Notes" : "Strength";
      const ex = await ensureExercise(it.name, category);
      const sets = it.type === "note" ? 0 : (it.sets || 1);
      const reps = (it.reps || []).slice(0, sets);
      const loads = (it.loads || []).slice(0, sets);
      const rests = (it.rests || []).slice(0, sets);
      exercises.push({
        id: it.weId || null,
        exercise_id: ex.id,
        superset_group: it.chainInstance ? (it.letter || "") : (it.letter || "A"),
        order_index: exercises.length,
        prescription_text: scriptLine(it, { plain: true }).slice(0, 100),
        prescribed_sets: sets,
        target_reps: reps.join(",").slice(0, 50) || "1",
        target_weight: loads.join(",").slice(0, 50),
        rest_seconds: parseInt(rests.find((r) => r !== "" && r != null) || "0", 10) || 0,
        notes: itemNotes(it),
        chain_id: it.chainId || null,
        chain_instance: it.chainInstance || "",
        chain_name: it.chainName || "",
        chain_kind: it.chainKind || "",
        chain_order: it.chainOrder || 0,
        chain_coach_open: !!it.chainCoachOpen,
        chain_athlete_open: !!it.chainAthleteOpen
      });
    }
    const payload = {
      title: snapTitle,
      program_name: "wourkout " + person.name,
      calendar_date: date,
      scheduled_date: date,
      day_of_week: new Date(date + "T12:00:00").toLocaleDateString("en-US", { weekday: "long" }),
      week_number: 5,
      description: snapWeek,
      exercises
    };
    const assignQuery = targetGroupId
      ? ("/api/assignments?group_id=" + targetGroupId + "&date=" + date)
      : ("/api/assignments?user_id=" + targetUserId + "&date=" + date);
    const existing = await api("GET", assignQuery);
    let workout;
    if (existing.length) {
      workout = await api("PUT", "/api/workouts/" + existing[0].workout_id, payload);
      day.assignmentId = existing[0].id;
    } else {
      workout = await api("POST", "/api/workouts", payload);
      const assignPayload = {
        workout_id: workout.id,
        assigned_by_coach_id: coachId,
        scheduled_date: date,
        notes: "Saved from Build"
      };
      if (targetGroupId) assignPayload.group_id = targetGroupId;
      else assignPayload.user_id = targetUserId;
      const assignment = await api("POST", "/api/assignments", assignPayload);
      day.assignmentId = assignment.id;
    }
    day.savedWorkoutId = workout.id;
    day.savedFor = person.id;
    day.savedAt = Date.now();
    stampWorkoutExerciseIds(day, snapItems, workout);
    state.athleteWorkouts[date] = workout;
    if (day.recurWeeks && !opts.skipCopies) {
      const copies = refreshFutureCopies(date, athleteId);
      for (const copyDate of copies) {
        try { await publishDay(copyDate, { quiet: true, athleteId, skipCopies: true }); } catch (err) { console.error(err); }
      }
    }
    if (!opts.quiet && state.auth && state.auth.token) {
      loadGymContext();
    }
    if (!opts.quiet) noteHist("Saved " + fmtDay(date) + " for " + person.name);
    if (!opts.quiet) toast("Saved for " + person.name);
    render();
    return true;
  } catch (err) {
    if (!opts.quiet) toast("Save failed: " + (err.message || "error"));
    console.error(err);
    return false;
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
  let person = buildAthletes().find((a) => a.id === localId) || athlete();
  if (person && person.isGroup) {
    const member = ATHLETES.find((a) => a.team_id === person.groupId) || ATHLETES[0];
    if (member) {
      person = member;
    } else if (state.auth && state.auth.user) {
      person = {
        id: "u" + state.auth.user.id,
        name: state.auth.user.name || state.auth.user.username || "Athlete",
        email: state.auth.user.email || "",
        serverId: state.auth.user.id,
        self: true
      };
    }
  }
  if (!person || person.id === "none") {
    toast("Add an athlete to preview their schedule");
    return;
  }
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
    if (person.self && state.auth && state.auth.user) {
      state.serverUserId = state.auth.user.id;
      await loadMySchedule();
    } else {
      const user = await ensureUser(person, "student");
      state.serverUserId = user.id;
      const entries = await api("GET", "/api/calendar/schedule?user_id=" + user.id);
      state.athleteAssignments = entries.map((e) => ({
        id: e.assignment_id,
        workout_id: e.workout_id,
        scheduled_date: e.scheduled_date
      }));
      state.athleteWorkouts = {};
      for (const entry of entries) {
        if (entry.workout && entry.scheduled_date) {
          state.athleteWorkouts[entry.scheduled_date] = entry.workout;
        }
      }
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
function intensityKindFor(weId) {
  const we = ((state.openWorkout && state.openWorkout.exercises) || []).find((row) => row.id === weId);
  if (we) {
    const kind = noteValues(we, "IntensityKind")[0];
    if (kind) return kind;
  }
  let found = "";
  Object.values(state.calendars || {}).forEach((days) => {
    Object.values(days || {}).forEach((day) => {
      (day.items || []).forEach((it) => {
        if (it.weId === weId && it.intensityKind) found = it.intensityKind;
      });
    });
  });
  return found;
}
async function logAthleteSet(weId, setNumber, field, value, extra) {
  if (!state.openSession) return;
  const logs = state.openSession.set_logs || [];
  const found = logs.find((l) => l.workout_exercise_id === weId && l.set_number === setNumber) || {};
  const current = {
    weight: found.weight || 0,
    reps: found.reps || 0,
    completed: !!found.completed,
    rest_seconds: found.rest_seconds || 0,
    details: found.details || ""
  };
  let details = {};
  try { details = current.details ? JSON.parse(current.details) : {}; } catch (e) { details = {}; }
  let detailsChanged = false;
  if (field === "weight") current.weight = value;
  else if (field === "reps") current.reps = value;
  else if (field === "rest") current.rest_seconds = value;
  else if (field === "completed") current.completed = !!value;
  else if (field) {
    details[field] = value;
    detailsChanged = true;
    if (field === "intensity") {
      const kind = intensityKindFor(weId);
      if (kind) details.intensityKind = kind;
    }
  }
  if (extra && extra.fill) {
    Object.keys(extra.fill).forEach((key) => {
      const v = extra.fill[key];
      if (key === "weight") current.weight = v;
      else if (key === "reps") current.reps = v;
      else if (key === "rest") current.rest_seconds = v;
      else { details[key] = v; detailsChanged = true; }
    });
  }
  if (extra && extra.athlete) {
    details.athlete = extra.athlete;
    detailsChanged = true;
  }
  if (extra && extra.completed != null) current.completed = !!extra.completed;
  if (detailsChanged) current.details = JSON.stringify(details);
  const params = new URLSearchParams();
  params.set("workout_exercise_id", String(weId));
  params.set("set_number", String(setNumber));
  params.set("weight", String(parseFloat(current.weight) || 0));
  params.set("reps", String(parseFloat(current.reps) || 0));
  params.set("completed", current.completed ? "true" : "false");
  params.set("rest_seconds", String(parseInt(current.rest_seconds, 10) || 0));
  params.set("details", current.details || JSON.stringify(details));
  const saved = await api("POST", "/api/sessions/" + state.openSession.id + "/sets?" + params.toString());
  state.openSession.set_logs = logs.filter((l) => !(l.workout_exercise_id === weId && l.set_number === setNumber)).concat([saved]);
  if (field === "weight" || field === "reps" || (extra && extra.fill && Object.keys(extra.fill).length)) state.entryBestsFor = null;
  render();
}
function savedDay(date) {
  const day = (state.calendars[state.actingAthlete] || {})[date];
  const fromCalendar = (row) => {
    const items = row.items || [];
    return {
      title: items.length ? (row.title || "Workout") : "Rest",
      weekLabel: row.weekLabel,
      items,
      workoutId: row.savedWorkoutId
    };
  };
  if (day && day.savedFor === state.actingAthlete && (day.savedWorkoutId || (day.items || []).length)) {
    return fromCalendar(day);
  }
  const workout = (state.athleteWorkouts || {})[date];
  if (!workout) {
    if (day && ((day.items || []).length || day.savedWorkoutId)) return fromCalendar(day);
    return null;
  }
  const items = workoutToDayItems(workout);
  return {
    title: items.length ? (workout.title || "Workout") : "Rest",
    weekLabel: weekName(date),
    workoutId: workout.id,
    items
  };
}
function athleteDayCol(date) {
  const day = savedDay(date);
  const open = state.athleteOpenDate === date ? "focus" : "";
  const items = day ? athleteScheduleHtml(date, day.items) : "";
  const isRest = !day || !(day.items || []).length;
  const openAttr = day ? ` onclick="openAthleteDay('${date}')"` : "";
  return `<div class="day ${isRest ? "rest-day" : "read"} ${open}" data-day="${date}"${openAttr}>
    <div class="day-top"><span>${fmtDay(date)}</span></div>
    <div class="week-label">${esc((day && day.weekLabel) || weekName(date))}</div>
    <div class="day-title ${isRest ? "placeholder" : ""}">${esc(isRest ? "Rest" : (day.title || "Workout"))}</div>
    <div>${items}</div>
  </div>`;
}
function mineView() {
  const fromList = buildAthletes().find((a) => a.id === state.actingAthlete);
  const person = fromList || { name: (state.auth.user && state.auth.user.name) || "Athlete" };
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
async function openAthleteDay(date) {
  const day = savedDay(date);
  if (!day) return;
  dismissToast();
  state.athleteOpenDate = null;
  state.navOpen = false;
  state.entryDate = date;
  state.entryAthlete = ownAthleteId();
  state.view = "entry";
  if (!state.startedAt) state.startedAt = Date.now();
  const first = (day.items || [])[0];
  state.entryItem = first ? (first.id || ("wx" + first.weId)) : null;
  render();
  if (day.workoutId) {
    try { await openAthleteWorkout(day.workoutId); }
    catch (err) { console.error(err); }
  }
  hydrateEntryLogs(date);
  render();
}
async function selectEntryDate(date) {
  state.entryDate = date;
  state.view = "entry";
  state.navOpen = false;
  state.entryAthlete = state.role === "athlete" ? ownAthleteId() : state.entryAthlete;
  const day = state.role === "athlete" ? savedDay(date) : null;
  const first = day && day.items && day.items[0];
  state.entryItem = first ? (first.id || ("wx" + first.weId)) : null;
  render();
  if (state.role !== "athlete") return;
  if (day && day.workoutId) {
    try { await openAthleteWorkout(day.workoutId); }
    catch (err) { console.error(err); }
  } else {
    state.openWorkout = null;
    state.openSession = null;
  }
  hydrateEntryLogs(date);
  render();
}
function setLogTouched(log) {
  if (!log || log.id == null) return false;
  if (log.completed) return true;
  return (parseFloat(log.weight) || 0) !== 0 || (parseFloat(log.reps) || 0) !== 0;
}
function hydrateEntryLogs(date, aid, day) {
  if (!state.openSession) return;
  const useDay = day || (state.role === "athlete" ? savedDay(date) : null);
  if (!useDay) return;
  const who = aid || ownAthleteId();
  (useDay.items || []).forEach((it) => {
    const id = it.id || ("wx" + it.weId);
    const key = who + ":" + date + ":" + id;
    if (state.logs[key] && state.logs[key].hydrated) return;
    const cells = {};
    if (it.type === "note") {
      state.logs[key] = { cells: {}, hydrated: true };
      return;
    }
    const sets = it.sets || 1;
    for (let i = 0; i < sets; i++) {
      const log = (state.openSession.set_logs || []).find((row) => row.workout_exercise_id === it.weId && row.set_number === i + 1) || {};
      const details = logDetails(log);
      const athleteValues = details.athlete || {};
      cells[i] = {
        entered: athleteValues,
        done: cellDone(it, athleteValues, log.completed)
      };
    }
    const circuitLog = (state.openSession.set_logs || []).find((row) => row.workout_exercise_id === it.weId && row.set_number === 1) || {};
    const circuitEntered = (logDetails(circuitLog).athlete) || {};
    state.logs[key] = {
      cells,
      hydrated: true,
      entered: it.type === "circuit" ? circuitEntered : {},
      done: it.type === "circuit" ? setIsComplete(it, circuitEntered) : (it.completionOnly ? !!circuitLog.completed : false)
    };
  });
}
function athleteOpenPanel() {
  if (!state.athleteOpenDate) return "";
  const day = savedDay(state.athleteOpenDate);
  if (!day) return "";
  const loggedItems = (day.items || []).map((it, i) => Object.assign({}, it, { id: it.id || ("wx" + (it.weId || i)) }));
  const body = loggedItems.length
    ? entryListHtml(ownAthleteId(), state.athleteOpenDate, loggedItems, "athlete")
    : "";
  return `<div class="editor log-editor" onclick="event.stopPropagation()">
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
  return `<form class="note-box ui-form" onsubmit="sendAthleteNote(event, ${workoutId}); return false;">
    <label class="ui-field"><span class="ui-label">Note to your coach</span>
    <textarea class="textarea" id="athlete-note" placeholder="How did this workout feel?">${esc(existing)}</textarea></label>
    <div class="ui-inline" style="justify-content:space-between">${existing ? `<p class="ui-hint">Sent: ${esc(existing)}</p>` : "<span></span>"}<button class="btn btn-primary" type="submit">Send note</button></div>
  </form>`;
}
function weTracksTime(we) {
  return noteValues(we, "Flags").indexOf("trackTime") >= 0;
}
function noteValues(we, label) {
  const line = String(we.notes || "").split("\n").find((row) => row.indexOf(label + ":") === 0) || "";
  return line ? line.slice(label.length + 1).split(",") : [];
}
function logDetails(log) {
  if (!log || !log.details) return {};
  try { return JSON.parse(log.details) || {}; } catch (e) { return {}; }
}
function athleteExercise(we) {
  const parsed = parseNotes(we.notes, we.rest_seconds);
  const cat = String((we.exercise && we.exercise.category) || "");
  if (dayItemType(cat, parsed) === "note") {
    const text = parsed.plainLines.join("\n") || ((we.exercise && we.exercise.default_notes) || "");
    return `<div style="margin:12px 0"><strong>${esc((we.exercise && we.exercise.name) || "Note")}</strong><div class="preview-copy">${esc(text)}</div></div>`;
  }
  const sets = we.prescribed_sets || 1;
  const reps = String(we.target_reps || "").split(",");
  const loads = String(we.target_weight || "").split(",");
  const rests = noteValues(we, "Rests");
  const kind = noteValues(we, "IntensityKind")[0] || "";
  const extras = [
    ["restRep", "Rest/Rep (s)", "RestReps"],
    ["distance", "Distance (" + distanceWord(entryDistanceUnit()) + ")", "Distances"],
    ["intensity", intensityLabel(kind), "Intensities"],
    ["tempo", "Tempo", "Tempos"],
    ["velocity", "Velocity", "Velocities"],
    ["power", "Power", "Powers"],
    ["pct", "%1RM", "Pcts"]
  ].map(([key, label, noteKey]) => {
    const values = noteValues(we, noteKey);
    return values.some((v) => String(v || "").trim() !== "") ? { key, label, values } : null;
  }).filter(Boolean);
  const rows = Array.from({ length: sets }, (_, i) => {
    const n = i + 1;
    const log = ((state.openSession && state.openSession.set_logs) || []).find((l) => l.workout_exercise_id === we.id && l.set_number === n) || {};
    const details = logDetails(log);
    const touched = setLogTouched(log);
    const shownWeight = touched ? (log.weight ?? "") : (loads[i] || loads[0] || "");
    const shownReps = touched ? (log.reps ?? "") : (reps[i] || reps[0] || "");
    const rest = log.rest_seconds != null && log.rest_seconds !== "" ? log.rest_seconds : (rests[i] || rests[0] || (we.rest_seconds ? String(we.rest_seconds) : ""));
    const extraCells = extras.map((field) => {
      const prescribed = field.values[i] || field.values[0] || "";
      const value = details[field.key] != null && details[field.key] !== "" ? details[field.key] : prescribed;
      return `<td><input aria-label="${esc(field.label)} set ${n}" value="${esc(value)}" onchange="logAthleteSet(${we.id}, ${n}, '${field.key}', this.value)"></td>`;
    }).join("");
    return `<tr><td>${n}</td>
      <td><input aria-label="Weight set ${n}" value="${esc(shownWeight)}" onchange="logAthleteSet(${we.id}, ${n}, 'weight', this.value)"></td>
      <td><input aria-label="${weTracksTime(we) ? "Time" : "Reps"} set ${n}" value="${esc(shownReps)}" onchange="logAthleteSet(${we.id}, ${n}, 'reps', this.value)"></td>
      <td><input aria-label="Rest set ${n}" value="${esc(rest)}" onchange="logAthleteSet(${we.id}, ${n}, 'rest', this.value)"></td>
      ${extraCells}
      <td><input aria-label="Done set ${n}" type="checkbox" ${log.completed ? "checked" : ""} onchange="logAthleteSet(${we.id}, ${n}, 'completed', this.checked)"></td></tr>`;
  }).join("");
  const skip = {
    Rests: 1, RestReps: 1, Distances: 1, Intensities: 1, IntensityKind: 1,
    Tempos: 1, Velocities: 1, Powers: 1, Pcts: 1, Props: 1, Flags: 1, Seeded: 1, Additional: 1
  };
  const note = String(we.notes || "").split("\n").filter((line) => !skip[line.split(":")[0]]).join(" · ");
  const heads = extras.map((field) => `<th>${esc(field.label)}</th>`).join("");
  return `<div style="margin:12px 0">
    <strong>${esc(we.superset_group || "")} ${esc((we.exercise && we.exercise.name) || "Exercise")}</strong>
    <div class="hint">${esc(we.prescription_text || "")}${note ? " · " + esc(note) : ""}</div>
    <table class="sets"><tr><th>Set</th><th>${esc(unitTitle(entryUnit()))}</th><th>${weTracksTime(we) ? "Time (s)" : "Reps"}</th><th>Rest (s)</th>${heads}<th>Done</th></tr>${rows}</table>
  </div>`;
}
function shareDay(date) { state.dayMenu = null; state.modal = { type: "share", date }; render(); }
function clearTitle(date) { snapshot(); ensureDay(date).title = ""; noteDayEdit(date); state.dayMenu = null; render(); }
function resetOrder(date) {
  snapshot();
  const day = ensureDay(date);
  sortByResetOrder(day.items);
  state.dayMenu = null;
  refreshFutureCopies(date);
  noteDayEdit(date);
  toast("Order grouped by letter");
  render();
}
function clearItems(date) {
  state.dayMenu = null;
  state.modal = { type: "clear", date };
  render();
}
function clearRowSelection(date) {
  const days = date ? [date] : Object.keys(state.calendars[state.athleteId] || {});
  days.forEach((day) => {
    (ensureDay(day).items || []).forEach((it) => { it.selected = false; });
  });
}
function clearOtherDaySelections(date) {
  Object.keys(state.calendars[state.athleteId] || {}).forEach((day) => {
    if (day === date) return;
    (state.calendars[state.athleteId][day].items || []).forEach((it) => { it.selected = false; });
  });
}
function selectExercise(date, id, ev, opts) {
  if (ev) ev.stopPropagation();
  clearOtherDaySelections(date);
  state.pick = { level: "exercise", date };
  state.focusDay = date;
  ensureDay(date).items.forEach((it) => { if (it.id !== id) it.selected = false; });
  const it = findItem(date, id);
  if (it) it.selected = true;
  if (!opts || !opts.silent) render();
}
function selectChain(date, instance, ev) {
  if (ev) ev.stopPropagation();
  clearRowSelection();
  state.pick = { level: "chain", date, instance };
  state.focusDay = date;
  render();
}
function selectDay(date, ev) {
  if (ev) ev.stopPropagation();
  clearRowSelection();
  state.pick = { level: "day", date };
  state.focusDay = date;
  render();
}
function toggleChainLetter(date, instance, ev) {
  if (ev) ev.stopPropagation();
  state.chainLetterFor = state.chainLetterFor === instance ? "" : instance;
  render();
}
function setChainLetter(date, instance, letter) {
  snapshot();
  reorderChainForLetter(ensureDay(date).items, instance, letter);
  state.chainLetterFor = "";
  refreshFutureCopies(date);
  noteDayEdit(date);
  render();
}
function toggleChainOpen(date, instance, audience, ev) {
  if (ev) ev.stopPropagation();
  if (audience === "athlete") {
    toggleAthleteChain(date, instance);
    return;
  }
  const day = ensureDay(date);
  const members = day.items.filter((it) => it.chainInstance === instance);
  if (!members.length) return;
  const next = !members[0].chainCoachOpen;
  members.forEach((it) => { it.chainCoachOpen = next; });
  noteDayEdit(date);
  render();
}
// Athlete screens rebuild items from the saved workout and from whichever calendar is shown,
// so the fold has to land on every copy, not just the coach's Build calendar.
function athleteChainCopies(date) {
  const lists = [];
  const shown = savedDay(date);
  if (shown) lists.push(shown.items || []);
  [state.actingAthlete, state.entryAthlete, state.athleteId].forEach((who) => {
    const day = who && state.calendars[who] && state.calendars[who][date];
    if (day && lists.indexOf(day.items) < 0) lists.push(day.items || []);
  });
  return lists;
}
function toggleAthleteChain(date, instance) {
  const lists = athleteChainCopies(date);
  const head = lists.map((list) => list.find((it) => it.chainInstance === instance)).find(Boolean);
  if (!head) return;
  const next = !head.chainAthleteOpen;
  lists.forEach((list) => list.forEach((it) => { if (it.chainInstance === instance) it.chainAthleteOpen = next; }));
  const workout = (state.athleteWorkouts || {})[date];
  if (workout) (workout.exercises || []).forEach((we) => { if (we.chain_instance === instance) we.chain_athlete_open = next; });
  render();
  const shown = savedDay(date);
  const workoutId = (shown && shown.workoutId) || ensureDay(date).savedWorkoutId;
  if (!workoutId) return;
  api("POST", "/api/workouts/" + workoutId + "/chain-fold", {
    chain_instance: instance,
    audience: "athlete",
    expanded: next
  }).then((saved) => {
    if (state.athleteWorkouts[date]) state.athleteWorkouts[date] = saved;
    render();
  }).catch((err) => { console.error(err); });
}
function pickedItems(date) {
  const day = ensureDay(date);
  const pick = state.pick && state.pick.date === date ? state.pick : null;
  if (pick && pick.level === "day") return { level: "day", items: day.items.slice(), instance: "" };
  if (pick && pick.level === "chain") {
    return {
      level: "chain",
      instance: pick.instance,
      items: day.items.filter((it) => it.chainInstance === pick.instance)
    };
  }
  return { level: "exercise", instance: "", items: day.items.filter((it) => it.selected) };
}
function clipHotMatches(date, spec) {
  const hot = state.clipHot;
  if (!hot || hot.date !== date || !hot.until || Date.now() > hot.until) return false;
  if (spec.level === "day") return hot.level === "day";
  if (spec.level === "chain") return hot.level === "chain" && hot.instance === spec.instance;
  if (hot.level !== "exercise") return false;
  return (hot.ids || []).indexOf(spec.id) >= 0;
}
function clearClipHot() {
  clearTimeout(state.clipTimer);
  state.clipTimer = null;
  state.clipHot = null;
}
function markClipboard(date, picked) {
  clearTimeout(state.clipTimer);
  state.clipHot = {
    date,
    level: picked.level,
    instance: picked.instance || "",
    ids: picked.items.map((it) => it.id),
    until: Date.now() + 10000
  };
  state.clipTimer = setTimeout(() => {
    state.clipHot = null;
    state.clipTimer = null;
    render();
  }, 10000);
}
function copySelection(mode) {
  const date = state.focusDay;
  const picked = pickedItems(date);
  if (!picked.items.length) return;
  state.clipboard = {
    from: date,
    items: picked.items.map((it) => JSON.parse(JSON.stringify(it))),
    mode: mode === "cut" ? "cut" : "copy",
    level: picked.level
  };
  markClipboard(date, picked);
  const label = picked.level === "day" ? "Day" : picked.level === "chain" ? "Chain" : (picked.items.length + " item(s)");
  toast(label + (mode === "cut" ? " cut" : " copied"));
  render();
}
function toggleAll(date, on) {
  clearOtherDaySelections(date);
  state.pick = { level: "exercise", date };
  ensureDay(date).items.forEach((it) => { it.selected = on; });
  render();
}
function toggleItem(date, id, on) {
  clearOtherDaySelections(date);
  state.pick = { level: "exercise", date };
  const it = findItem(date, id);
  if (it) it.selected = on;
  render();
}
function askDelete(date, id) {
  const ids = id ? [id] : ensureDay(date).items.filter((it) => it.selected).map((it) => it.id);
  if (!ids.length) return;
  state.modal = { type: "delete", date, ids };
  render();
}
function askDeleteChain(date, instance) {
  const members = ensureDay(date).items.filter((it) => it.chainInstance === instance);
  if (!members.length) return;
  state.modal = { type: "delete", date, ids: members.map((it) => it.id), chainName: members[0].chainName || "Chain" };
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
  noteDayEdit(date);
  noteHist("Deleted " + ids.length + " item(s)");
  render();
}
function confirmClear(date) {
  snapshot();
  const day = ensureDay(date);
  day.items = [];
  day.title = "Rest";
  if (state.editor && state.editor.day === date) state.editor = null;
  state.modal = null;
  noteDayEdit(date);
  noteHist("Cleared " + fmtDay(date));
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
    const clones = freshenChainInstances(items.map((it) => Object.assign(JSON.parse(JSON.stringify(it)), { id: uid(), selected: false })));
    if (m.placement === "clear") day.items = clones;
    else day.items = day.items.concat(clones);
    if (m.includeTitles && m.mode === "workout") {
      day.title = source.title;
      day.color = source.color;
    }
    if (!m.includeLoads) clones.forEach((it) => { it.loads = it.loads.map(() => ""); it.props = it.props.filter((p) => p !== "load"); });
    noteDayEdit(d, athleteId);
  });
  if (m.mode === "move") {
    source.items = source.items.filter((it) => !m.ids.includes(it.id));
    noteDayEdit(m.date);
  }
  state.clipboard = { from: m.date, items: items.map((it) => JSON.parse(JSON.stringify(it))), mode: "copy" };
  toast(items.length + " item(s) copied");
  noteHist("Copied " + items.length + " item(s)");
  state.modal = null;
  render();
}
function pasteOn(date) {
  if (!state.clipboard || !(state.clipboard.items || []).length) return;
  snapshot();
  const clip = state.clipboard;
  const day = ensureDay(date);
  const clones = freshenChainInstances(clip.items.map((it) => Object.assign(JSON.parse(JSON.stringify(it)), { id: uid(), selected: false })));
  if (clip.level === "day") day.items = clones;
  else day.items = day.items.concat(clones);
  if (clip.mode === "cut" || clip.mode === "move") {
    const sameDayCut = clip.level === "day" && clip.from === date;
    if (!sameDayCut) {
      const src = ensureDay(clip.from);
      const names = new Set(clip.items.map((it) => it.id));
      src.items = src.items.filter((it) => !names.has(it.id));
      noteDayEdit(clip.from);
    }
    state.clipboard = null;
  }
  clearClipHot();
  noteDayEdit(date);
  toast(clip.level === "day" ? "Day pasted" : (clones.length + " item(s) pasted"));
  render();
}

let drag = null;
function dragIdsForChain(items, ids) {
  const wanted = {};
  (ids || []).forEach((id) => { wanted[id] = true; });
  const instances = {};
  (items || []).forEach((it) => {
    if (wanted[it.id] && it.chainInstance) instances[it.chainInstance] = true;
  });
  return (items || []).filter((it) => wanted[it.id] || instances[it.chainInstance]).map((it) => it.id);
}
function renumberChainOrder(items) {
  const seen = {};
  (items || []).forEach((it) => {
    if (!it.chainInstance) return;
    const next = seen[it.chainInstance] || 0;
    it.chainOrder = next;
    seen[it.chainInstance] = next + 1;
  });
}
function dragStart(ev, date, id) {
  const day = ensureDay(date);
  const it = findItem(date, id);
  if (!it) return;
  const selected = it.selected ? day.items.filter((x) => x.selected).map((x) => x.id) : [id];
  const ids = dragIdsForChain(day.items, selected);
  drag = { date, ids, landing: null, marked: false, gapHeight: 32 };
  ev.dataTransfer.effectAllowed = "move";
  ev.dataTransfer.setData("text/plain", ids.join(","));
  ev.stopPropagation();
}
function placeDragGap(list, beforeId, height) {
  let gap = list.querySelector(".drag-gap");
  if (!gap) {
    gap = document.createElement("div");
    gap.className = "drag-gap";
    gap.setAttribute("aria-hidden", "true");
  }
  gap.style.height = Math.max(28, height || 32) + "px";
  gap.dataset.dropBefore = beforeId || "";
  let beforeEl = null;
  if (beforeId != null && beforeId !== "") {
    list.querySelectorAll(".ex").forEach((el) => {
      if (!beforeEl && el.dataset.id === beforeId) beforeEl = el;
    });
  }
  if (beforeEl) {
    const block = beforeEl.closest(".chain-block");
    if (block && block.parentElement === list) beforeEl = block;
    list.insertBefore(gap, beforeEl);
  } else list.appendChild(gap);
  document.querySelectorAll(".drag-gap").forEach((el) => { if (el !== gap) el.remove(); });
  return gap;
}
function dragLandingRects(list, skipIds) {
  const rects = [];
  const seen = {};
  list.querySelectorAll(".ex").forEach((el) => {
    if (skipIds.indexOf(el.dataset.id) >= 0) return;
    const block = el.closest(".chain-block");
    if (block && block.parentElement === list) {
      const instance = block.dataset.chainInstance || "";
      if (seen[instance]) return;
      seen[instance] = true;
      const rect = block.getBoundingClientRect();
      if (rect.height <= 0) return;
      rects.push({ id: el.dataset.id, top: rect.top, height: rect.height });
      return;
    }
    const rect = el.getBoundingClientRect();
    if (rect.height <= 0) return;
    rects.push({ id: el.dataset.id, top: rect.top, height: rect.height });
  });
  return rects;
}
function dragOver(ev) {
  ev.preventDefault();
  if (ev.dataTransfer) ev.dataTransfer.dropEffect = "move";
  if (!drag) return;
  const dayEl = ev.currentTarget;
  if (!dayEl || !dayEl.dataset || !dayEl.dataset.day) return;
  const list = dayEl.querySelector(".day-items");
  if (!list) return;
  const date = dayEl.dataset.day;
  dayEl.classList.add("drop");
  document.querySelectorAll(".day.drop").forEach((el) => { if (el !== dayEl) el.classList.remove("drop"); });
  const existing = list.querySelector(".drag-gap");
  if (drag.marked && existing && drag.landing && drag.landing.date === date) {
    const box = existing.getBoundingClientRect();
    if (ev.clientY >= box.top && ev.clientY <= box.bottom) return;
  }
  const rects = dragLandingRects(list, drag.ids);
  if (!drag.marked) {
    let gapHeight = 0;
    const counted = {};
    document.querySelectorAll(".ex").forEach((el) => {
      if (drag.ids.indexOf(el.dataset.id) < 0) return;
      const block = el.closest(".chain-block");
      if (block) {
        const instance = block.dataset.chainInstance || "";
        if (counted[instance]) return;
        counted[instance] = true;
        gapHeight += block.getBoundingClientRect().height;
        return;
      }
      gapHeight += el.getBoundingClientRect().height;
    });
    drag.gapHeight = gapHeight || 32;
    document.querySelectorAll(".ex").forEach((el) => {
      if (drag.ids.indexOf(el.dataset.id) >= 0) el.classList.add("is-dragging");
    });
    document.querySelectorAll(".chain-block").forEach((block) => {
      const members = block.querySelectorAll(".ex");
      if (!members.length) return;
      let all = true;
      members.forEach((el) => { if (drag.ids.indexOf(el.dataset.id) < 0) all = false; });
      if (all) block.classList.add("is-dragging");
    });
    drag.marked = true;
  }
  const landing = dragLandingIndex(rects, ev.clientY);
  drag.landing = { date, beforeId: landing.beforeId };
  placeDragGap(list, landing.beforeId, drag.gapHeight);
}
function clearDragChrome() {
  document.querySelectorAll(".drag-gap").forEach((el) => el.remove());
  document.querySelectorAll(".ex.is-dragging, .chain-block.is-dragging").forEach((el) => el.classList.remove("is-dragging"));
  document.querySelectorAll(".day.drop").forEach((el) => el.classList.remove("drop"));
}
function dropOn(ev, date, beforeId) {
  ev.preventDefault();
  ev.stopPropagation();
  const active = drag;
  if (!active) return;
  drag = null;
  const landingBefore = active.landing && active.landing.date === date ? active.landing.beforeId : beforeId;
  snapshot();
  const src = ensureDay(active.date);
  if (active.date === date) {
    src.items = placeDroppedItems(src.items, active.ids, landingBefore);
    renumberChainOrder(src.items);
  } else {
    const moving = src.items.filter((it) => active.ids.indexOf(it.id) >= 0);
    src.items = src.items.filter((it) => active.ids.indexOf(it.id) < 0);
    renumberChainOrder(src.items);
    const dest = ensureDay(date);
    const clones = freshenChainInstances(moving.map((it) => Object.assign(JSON.parse(JSON.stringify(it)), { id: uid(), selected: false })));
    dest.items = insertAtLanding(dest.items, clones, landingBefore);
    renumberChainOrder(dest.items);
    noteDayEdit(active.date);
  }
  refreshFutureCopies(date);
  noteDayEdit(date);
  noteHist("Moved " + active.ids.length + " item(s)");
  clearDragChrome();
  render();
}
document.addEventListener("dragover", (ev) => {
  const day = ev.target.closest && ev.target.closest(".day");
  if (day) ev.preventDefault();
});
document.addEventListener("drop", (ev) => {
  const day = ev.target.closest && ev.target.closest(".day");
  if (!day || !drag) return;
  ev.preventDefault();
  dropOn(ev, day.dataset.day, null);
});
document.addEventListener("dragend", () => {
  clearDragChrome();
  drag = null;
});

function itemLogDone(date, it) {
  if (!it) return false;
  const log = state.logs[state.athleteId + ":" + date + ":" + it.id];
  return !!(log && log.done);
}
function gatedItems(date, items) {
  const out = [];
  let blocked = false;
  (items || []).forEach((it) => {
    if (blocked) return;
    out.push(it);
    if (it.type === "questionnaire" && it.requireResponse && !itemLogDone(date, it)) blocked = true;
  });
  return out;
}
function previewItems(day) {
  return gatedItems(day && day.date, day && day.items).filter((it) => it.type !== "break");
}
function previewLog(it, create) {
  if (!it || !state.preview) return {};
  const key = state.athleteId + ":" + state.preview.date + ":" + it.id;
  if (!state.logs[key]) {
    if (!create) return {};
    state.logs[key] = {};
  }
  return state.logs[key];
}
function youtubeId(url) {
  const m = String(url || "").match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{6,})/);
  return m ? m[1] : "";
}
function previewHasLoad(it) {
  return (it.loads || []).slice(0, it.sets || 1).some((x) => x !== "" && x != null);
}
function previewMax(name) {
  const want = String(name || "").toLowerCase();
  const hit = (state.serverRecords || []).find((r) => String((r.exercise && r.exercise.name) || "").toLowerCase() === want);
  return hit && hit.weight != null && hit.weight !== "" ? hit.weight : "";
}
function openPreview(date, index) {
  const startAt = Number.isInteger(index) ? index : null;
  state.preview = {
    date,
    index: startAt == null ? 0 : startAt,
    mode: startAt == null ? "list" : "exercise",
    playing: false
  };
  state.dayMenu = null;
  state.buildPanel = null;
  state.focusDay = date;
  render();
}
function togglePreview() {
  if (state.preview) { state.preview = null; render(); return; }
  openPreview(state.focusDay || APP_TODAY);
}
function shiftPreviewDay(n) {
  if (!state.preview) return;
  const date = addDays(state.preview.date, n);
  state.preview.date = date;
  state.preview.mode = "list";
  state.preview.index = 0;
  state.preview.playing = false;
  state.focusDay = date;
  const weeks = state.viewMode === "week" ? 1 : 4;
  const end = addDays(state.weekStart, weeks * 7 - 1);
  if (date < state.weekStart || date > end) state.weekStart = sundayOf(date);
  render();
}
function previewPickItem(index) {
  if (!state.preview) return;
  state.preview.index = index;
  state.preview.mode = "exercise";
  state.preview.playing = false;
  render();
}
function closePreviewCard() {
  if (!state.preview) return;
  state.preview.mode = "list";
  state.preview.playing = false;
  render();
}
function previewOpenEntry() {
  if (!state.preview) return;
  state.entryAthlete = state.athleteId;
  state.entryDate = state.preview.date;
  state.preview = null;
  goTool("entry");
}
function previewOptOut() {
  const it = previewCurrent();
  if (!it) return;
  const log = previewLog(it, true);
  log.optedOut = !log.optedOut;
  toast(log.optedOut ? "Opted out of " + it.name : "Opt out cleared for " + it.name);
  render();
}
function previewJournal() {
  state.preview = null;
  state.view = "feed";
  state.feedMode = "journal";
  render();
}
function previewMedia() {
  const it = previewCurrent();
  if (!it || !it.videoUrl) { toast("No media on this exercise"); return; }
  state.preview.playing = !state.preview.playing;
  render();
}
function previewCurrent() {
  if (!state.preview) return null;
  const items = previewItems(ensureDay(state.preview.date));
  return items[state.preview.index] || null;
}
function previewHtml() {
  const day = ensureDay(state.preview.date);
  if (state.preview.mode !== "exercise") return previewListHtml(day);
  return previewExerciseHtml(day);
}
function previewListHtml(day) {
  const items = previewItems(day);
  const questionnaire = items.find((it) => it.type === "questionnaire");
  const head = day.title || (questionnaire ? questionnaire.name : "");
  const count = head && questionnaire && !day.title ? (questionnaire.questions || []).length : items.length;
  const people = buildAthletes().filter((a) => a.id !== "none");
  return `<aside class="preview">
    <div class="preview-scroll">
      <div class="preview-date">
        <button type="button" onclick="shiftPreviewDay(-1)" aria-label="Previous day">‹</button>
        <span>${fmtLong(state.preview.date)}</span>
        <button type="button" onclick="shiftPreviewDay(1)" aria-label="Next day">›</button>
      </div>
      <select class="preview-athlete" aria-label="Athlete" onchange="switchAthlete(this.value)">${people.map((a) => `<option value="${esc(a.id)}" ${a.id === state.athleteId ? "selected" : ""}>${esc(a.name)}</option>`).join("")}</select>
      ${head ? `<div class="preview-sec"><span class="preview-tick">✓</span><div><strong>${esc(head)}</strong><small>${count} ITEMS</small></div></div>` : ""}
      ${items.map((it, i) => `<button type="button" class="preview-row" onclick="previewPickItem(${i})">
        <span class="preview-tick">✓</span>
        <span><b>${esc(it.name)}</b><small>${esc(it.type === "questionnaire" ? ((it.questions || []).length + " ITEMS") : scriptLine(it))}</small></span>
      </button>`).join("") || '<div class="hint">No exercises this day</div>'}
    </div>
    <button type="button" class="preview-entry" onclick="previewOpenEntry()">View in Workout Entry →</button>
  </aside>`;
}
function previewExerciseHtml(day) {
  const items = previewItems(day);
  const it = items[state.preview.index];
  if (!it) return previewListHtml(day);
  const log = previewLog(it);
  const max = previewMax(it.name);
  const atStart = state.preview.index <= 0;
  return `<aside class="preview">
    <div class="preview-scroll">
      ${previewMediaBlock(it)}
      ${max !== "" ? `<div class="preview-max">Max: ${esc(max)}</div>` : ""}
      <div class="preview-progress" aria-hidden="true"><span class="knob">${log.done ? "✓" : "✓"}</span><span class="track"></span></div>
      <div class="preview-actions">
        <button type="button" class="act optout ${log.optedOut ? "on" : ""}" onclick="previewOptOut()">OPT OUT</button>
        <button type="button" class="act journal" onclick="previewJournal()">JOURNAL</button>
        <button type="button" class="act media" onclick="previewMedia()">MEDIA</button>
      </div>
      <div class="preview-sheet">
        ${previewSheet(it, log)}
      </div>
    </div>
    <div class="preview-nav">
      <button type="button" class="iconbtn" onclick="stepPreview(-1)" ${atStart ? "disabled" : ""} aria-label="Previous exercise">‹</button>
      <button type="button" class="iconbtn" onclick="closePreviewCard()" aria-label="Close preview">✕</button>
      <button type="button" class="iconbtn" onclick="stepPreview(1)" aria-label="Next exercise">›</button>
    </div>
  </aside>`;
}
function previewMediaBlock(it) {
  const yid = youtubeId(it.videoUrl);
  if (it.videoUrl && state.preview.playing) {
    const src = yid
      ? `https://www.youtube-nocookie.com/embed/${yid}?autoplay=1`
      : it.videoUrl;
    const frame = yid
      ? `<iframe src="${esc(src)}" title="${esc(it.name)}" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>`
      : `<video src="${esc(it.videoUrl)}" controls autoplay></video>`;
    return `<div class="preview-vid playing">${frame}</div>`;
  }
  if (it.videoUrl) {
    const thumb = yid ? ` style="background-image:url('https://i.ytimg.com/vi/${esc(yid)}/hqdefault.jpg')"` : "";
    return `<button type="button" class="preview-vid" onclick="previewMedia()"${thumb}>
      <span class="play">▶</span>
      <span class="preview-vid-title">${esc(it.name)}</span>
    </button>`;
  }
  return `<div class="preview-title">${esc(it.name)}</div>`;
}
function previewSheet(it, log) {
  const done = log.done ? " done" : "";
  const button = `<button type="button" class="complete${done}" onclick="completePreview()">${log.done ? "✓ Completed" : "✓ Complete"}</button>`;
  if (it.type === "note") {
    return `<div class="preview-copy">${esc(it.note || "")}</div>`;
  }
  if (it.type === "questionnaire") {
    const qs = (it.questions || []).map((q, i) => `<div class="q">${i + 1}. ${esc(q)}</div>`).join("") || '<div class="hint">No questions</div>';
    return qs + button;
  }
  if (it.type === "circuit" || it.completionOnly || it.type === "video" || it.type === "rest") {
    const text = it.detail || it.note || (it.type === "rest" ? ((it.reps && it.reps[0]) || 60) + "s" : "Complete 1 round");
    return `<div class="preview-copy">${esc(text)}</div>${button}`;
  }
  const note = it.note ? `<div class="preview-copy">${esc(it.note)}</div>` : "";
  const detail = it.detail ? `<div class="preview-copy">${esc(it.detail)}</div>` : "";
  const n = Math.max(1, it.sets || (it.reps || []).length || 1);
  const loaded = previewHasLoad(it);
  const has = (arr) => (arr || []).some((v) => String(v || "").trim() !== "");
  const doseHead = it.trackTime ? "TIME" : "REPS";
  const weightHead = displayUnit() === "lbs" ? "LBS" : (displayUnit() === "kg" ? "KG" : "WEIGHT");
  const cols = [];
  if (loaded) cols.push(["WEIGHT", (i) => `<span class="preview-box">${esc((it.loads || [])[i] ?? "")}</span>`]);
  cols.push([doseHead, (i) => {
    const rawRep = doseValue(it, (it.reps || [])[i] ?? "");
    const rep = it.trackTime && rawRep !== "" ? rawRep + "s" : rawRep;
    return loaded ? `<span class="preview-box">${esc(rep)}</span>` : esc(rep);
  }]);
  if (has(it.restReps)) cols.push(["REST/REP", (i) => esc((it.restReps[i] ?? "") === "" ? "" : it.restReps[i] + "s")]);
  if (has(it.distances)) cols.push(["DISTANCE (" + distanceWord(displayDistanceUnit()).toUpperCase() + ")", (i) => esc(it.distances[i] ?? "")]);
  if (it.intensityKind || has(it.intensities)) cols.push([intensityLabel(it.intensityKind).toUpperCase(), (i) => esc(it.intensities[i] ?? "")]);
  const rows = Array.from({ length: n }, (_, i) => `<tr><td>${i + 1}</td>${cols.map((col) => `<td>${col[1](i)}</td>`).join("")}</tr>`).join("");
  const head = `<tr><th>SET</th>${cols.map((col) => `<th>${esc(col[0])}</th>`).join("")}</tr>`;
  return `${note}${detail}<table class="preview-sets">${head}${rows}</table>${button}`;
}
function completePreview() {
  const it = previewCurrent();
  if (!it || !state.preview) return;
  const log = previewLog(it, true);
  if (log.done) return;
  log.done = true;
  log.sets = it.sets;
  log.reps = (it.reps || []).slice();
  log.loads = (it.loads || []).slice();
  toast("Completed " + it.name);
  render();
}
function stepPreview(d) {
  if (!state.preview) return;
  const items = previewItems(ensureDay(state.preview.date));
  if (!items.length) return;
  const next = state.preview.index + d;
  if (next < 0) return;
  if (next >= items.length) {
    state.preview.mode = "list";
    state.preview.playing = false;
    render();
    return;
  }
  state.preview.index = next;
  state.preview.mode = "exercise";
  state.preview.playing = false;
  render();
}
function completeItem(date, id) {
  const it = findItem(date, id);
  const key = state.athleteId + ":" + date + ":" + id;
  state.logs[key] = { done: true, sets: it.sets, reps: it.reps.slice(), loads: it.loads.slice() };
  toast("Completed " + it.name);
  render();
}

function undo() {
  if (!state.undo.length) return;
  const prev = state.undo.pop();
  if (!prev) return;
  const before = state.calendars;
  let restored;
  try { restored = JSON.parse(prev); } catch (err) { return; }
  state.calendars = restored;
  state.editor = null;
  markCalendarDiff(before, restored);
  toast("Undone");
  render();
}

function importedDataPanel(day) {
  const items = (day && day.items) || [];
  const logs = ((state.openSession && state.openSession.set_logs) || []).filter((log) => setLogTouched(log));
  const rows = logs.map((log) => {
    const item = items.find((it) => it.weId === log.workout_exercise_id);
    return `<tr><td>${esc((item && item.name) || "Exercise")}</td><td class="num">${esc(log.set_number)}</td><td class="num">${esc(log.weight)}</td><td class="num">${esc(log.reps)}</td></tr>`;
  }).join("");
  if (!rows) return "";
  return `<section class="ui-card"><div class="ui-card-head plain"><h2 class="ui-card-title">Logged sets</h2></div>
    <div class="ui-table-wrap"><table class="ui-table"><thead><tr><th>Exercise</th><th class="num">Set</th><th class="num">${esc(unitTitle(entryUnit()))}</th><th class="num">Reps</th></tr></thead><tbody>${rows}</tbody></table></div></section>`;
}
function queueCoachEntrySession() {
  if (state.role === "athlete") return;
  const who = state.entryAthlete;
  const date = state.entryDate;
  const key = (who || "") + ":" + date;
  if (state.coachSessionFor === key) return;
  state.coachSessionFor = key;
  state.openSession = null;
  const ready = state.calendarLoaded[who] ? Promise.resolve() : loadCalendarSchedule(who);
  Promise.resolve(ready).then(() => {
    if (state.coachSessionFor === key) loadCoachEntrySession();
  });
}
async function loadCoachEntrySession() {
  if (state.role === "athlete") return;
  const who = state.entryAthlete;
  const date = state.entryDate;
  const key = (who || "") + ":" + date;
  const person = ATHLETES.find((a) => a.id === who) || buildAthletes().find((a) => a.id === who && !a.isGroup);
  const day = who ? (state.calendars[who] || {})[date] : null;
  if (!person || !person.serverId || !day || !day.savedWorkoutId) return;
  try {
    const session = await api("GET", "/api/sessions/active/" + day.savedWorkoutId + "?user_id=" + person.serverId);
    if (state.coachSessionFor !== key) return;
    state.openSession = session;
    hydrateEntryLogs(date, who, day);
    render();
  } catch (err) {
    console.error(err);
  }
}
function entryHasWorkout(aid, date) {
  if (state.role === "athlete") {
    const saved = savedDay(date);
    return !!(saved && saved.items && saved.items.length);
  }
  const day = (state.calendars[aid] || {})[date];
  return !!(day && day.items && day.items.length);
}
function entryWeekStrip(aid, pick) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(sundayOf(state.entryDate), i));
  const go = (d) => pick.replace("$D", d);
  return `<div class="entry-week">
    <button class="btn btn-ghost btn-icon" type="button" aria-label="Previous week" onclick="${go(addDays(state.entryDate, -7))}">‹</button>
    <div class="entry-days">${days.map((d) => {
      const dt = new Date(d + "T12:00:00");
      const cls = ["entry-day", d === state.entryDate ? "on" : "", d === APP_TODAY ? "today" : "", entryHasWorkout(aid, d) ? "has" : ""].filter(Boolean).join(" ");
      return `<button class="${cls}" type="button" onclick="${go(d)}"><span>${dt.toLocaleDateString("en-US", { weekday: "short" })}</span><b>${dt.getDate()}</b></button>`;
    }).join("")}</div>
    <button class="btn btn-ghost btn-icon" type="button" aria-label="Next week" onclick="${go(addDays(state.entryDate, 7))}">›</button>
  </div>`;
}
function entryPageHtml(o) {
  const items = o.items || [];
  const statuses = items.map((it) => entryItemStatus(o.aid, state.entryDate, it)).filter(Boolean);
  const finished = statuses.filter((st) => st.done >= st.total).length;
  const summary = o.summary;
  const unit = o.unit || "kg";
  const progress = statuses.length
    ? `<span class="ui-badge${finished === statuses.length ? " green" : ""}">${finished} of ${statuses.length} done</span>`
    : "";
  return `<section class="stage ui-page light-page entry-page" id="${o.id || "workout-entry"}"><div class="ui-wrap">
    <header class="ui-head">
      <div class="ui-person">${uiAvatar(o.name, "lg")}<div class="who">
        <div class="ui-kicker">Workout entry</div>
        <h1 class="ui-title">${esc(o.name)}</h1>
      </div></div>
      <div class="ui-actions">${o.actions || ""}</div>
    </header>
    ${o.picker || ""}
    <section class="ui-card">${entryWeekStrip(o.aid, o.pick)}</section>
    <div class="ui-grid side">
      <section class="ui-card">
        <div class="ui-card-head">
          <div><h2 class="ui-card-title">${esc(o.title)}</h2><p class="ui-card-sub">${esc(fmtLong(state.entryDate))}</p></div>
          ${progress}
        </div>
        <div class="entry-list">${o.listHtml || `<div class="ui-empty"><b>Rest day</b>Nothing is scheduled for this day.</div>`}</div>
        ${o.noteHtml ? `<div class="ui-card-foot">${o.noteHtml}</div>` : ""}
      </section>
      <div class="ui-stack">
        <section class="ui-card">
          <div class="ui-card-head plain"><h2 class="ui-card-title">Session summary</h2></div>
          <div class="ui-card-body"><div class="ui-stats compact">
            <div class="ui-stat"><div class="label">Sets done</div><div class="value">${summary.sets}</div></div>
            <div class="ui-stat"><div class="label">Total reps</div><div class="value">${summary.reps}</div></div>
            <div class="ui-stat"><div class="label">Tonnage (${esc(unit)})</div><div class="value">${Math.round(summary.tonnage)}</div></div>
            <div class="ui-stat"><div class="label">Duration</div><div class="value">${summary.duration}</div></div>
          </div></div>
        </section>
        ${entryPrPanel(o.aid, items)}
        ${o.extra || ""}
      </div>
    </div>
  </div></section>`;
}
function queueEntryBests(userId) {
  if (!userId || state.entryBestsFor === userId) return;
  state.entryBestsFor = userId;
  api("GET", "/api/personal-bests?user_id=" + userId)
    .then((rows) => { state.personalBests = rows || []; renderSoon(); })
    .catch((err) => console.error(err));
}
// Lifts on this day whose best-ever set was logged on this day.
function entryPrPanel(aid, items) {
  const person = buildAthletes().find((a) => a.id === aid) || ATHLETES.find((a) => a.id === aid);
  const me = state.auth && state.auth.user;
  const userId = (person && person.serverId) || (state.role === "athlete" && me ? me.id : null);
  queueEntryBests(userId);
  const names = new Set((items || []).map((it) => String(it.name || "").toLowerCase()));
  const prs = (state.personalBests || []).filter((pb) => pb.user_id === userId && pb.date === state.entryDate && names.has(String(pb.exercise_name).toLowerCase()));
  const body = prs.length
    ? prs.map((pb) => `<div class="ui-list-row"><span class="strong">${esc(pb.exercise_name)}</span><span class="ui-badge green">${fmtLoad(pb.weight)} ${esc(normalizeUnit(pb.load_unit))}${pb.reps ? " × " + fmtLoad(pb.reps) : ""}</span></div>`).join("")
    : `<p class="ui-hint">No new PRs in this session yet.</p>`;
  return `<section class="ui-card"><div class="ui-card-head plain"><h2 class="ui-card-title">New PRs</h2></div><div class="ui-card-body">${body}</div></section>`;
}
function entryView() {
  if (state.role === "athlete") return athleteEntryView();
  queueCoachEntrySession();
  const who = state.entryAthlete;
  const athleteObj = ATHLETES.find((a) => a.id === who) || buildAthletes().find((a) => a.id === who && !a.isGroup);
  if (!athleteObj) {
    return `<section class="stage ui-page light-page entry-page"><div class="ui-wrap narrow">
      ${uiHead("Workout entry", "Pick an athlete", "Log sets for an athlete, or check what they have logged.", "")}
      <section class="ui-card"><div class="ui-card-body">${athletePicker()}</div></section>
    </div></section>`;
  }
  const activeWho = athleteObj.id;
  const day = ensureDay(state.entryDate, activeWho);
  const actions = `${unitSelect(activeWho)}
    <span class="ui-pop-anchor"><button class="btn btn-secondary" type="button" onclick="state.entryOpen=!state.entryOpen;render()">Switch athlete</button>
      ${state.entryOpen ? `<div class="ui-pop" style="left:auto;right:0">${athletePicker()}</div>` : ""}</span>
    <button class="btn btn-secondary" type="button" onclick="window.print()">Print</button>
    <button class="btn btn-primary" type="button" onclick="state.view='build';state.athleteId='${esc(activeWho)}';state.weekStart=sundayOf('${state.entryDate}');render()">Open calendar</button>`;
  return entryPageHtml({
    aid: activeWho,
    name: athleteObj.name,
    title: day.title || (day.items.length ? "Workout" : "Rest"),
    items: day.items,
    listHtml: entryListHtml(activeWho, state.entryDate, day.items),
    pick: "state.entryDate='$D';render()",
    actions,
    unit: normalizeUnit(athleteObj.load_unit),
    summary: summarize(activeWho, state.entryDate, day.items),
    extra: importedDataPanel(day)
  });
}
function athleteEntryView() {
  const who = { id: ownAthleteId(), name: viewedAthleteName() };
  state.entryAthlete = who.id;
  const saved = savedDay(state.entryDate);
  const day = saved ? {
    title: saved.title || "Workout",
    workoutId: saved.workoutId,
    items: (saved.items || []).map((it, i) => Object.assign({}, it, { id: it.id || ("wx" + (it.weId || i)) }))
  } : { title: "Rest", items: [], workoutId: null };
  return entryPageHtml({
    id: "workout-entry",
    aid: who.id,
    name: who.name,
    title: day.items.length ? (day.title || "Workout") : "Rest",
    items: day.items,
    listHtml: entryListHtml(who.id, state.entryDate, day.items, "athlete"),
    pick: "selectEntryDate('$D')",
    actions: `${unitSelect(who.id)}
      <button class="btn btn-secondary" type="button" onclick="window.print()">Print</button>
      <button class="btn btn-primary" type="button" onclick="go('mine')">My schedule</button>`,
    unit: entryUnit(),
    summary: summarize(who.id, state.entryDate, day.items),
    noteHtml: ownAthleteSession() && day.workoutId ? noteForm(day.workoutId) : "",
    extra: importedDataPanel(day)
  });
}
function athletePicker() {
  const q = (state.athQ || "").toLowerCase();
  const list = ATHLETES.filter((a) => !q || a.name.toLowerCase().includes(q));
  return `<div class="ui-search" style="margin-bottom:6px"><input class="input" placeholder="Search athletes" aria-label="Search athletes" data-focus="ath-search" value="${esc(state.athQ || "")}" oninput="state.athQ=this.value;render()"></div>
    ${list.map((a) => `<button class="opt" type="button" onclick="pickAthlete('${a.id}')">${uiAvatar(a.name)} ${esc(a.name)}</button>`).join("") || `<p class="ui-hint" style="padding:8px">No athletes yet. Add athletes in Manage Users.</p>`}
    <label class="ui-check" style="padding:8px"><input type="checkbox" ${state.showHidden ? "checked" : ""} onchange="state.showHidden=this.checked"> Show workouts hidden from athletes</label>`;
}
function pickAthlete(id) {
  state.entryAthlete = id;
  state.entryOpen = false;
  state.athleteId = id;
  if (!state.startedAt) state.startedAt = Date.now();
  render();
  loadCalendarSchedule(id);
}
const PROP_FIELD = {
  load: "w", rest: "rest", restRep: "restRep", distance: "distance",
  tempo: "tempo", velocity: "velocity", power: "power", pct: "pct", intensity: "intensity"
};
function asksForWeight(it) {
  return !!it && (it.type || "lift") === "lift" && !it.completionOnly;
}
function entryColumns(it) {
  if (!it || it.type === "circuit" || it.type === "note" || it.type === "questionnaire" || it.type === "break" || it.type === "rest" || it.type === "video") return [];
  const cols = [["r", it.trackTime ? "Time (s)" : "Reps"]];
  // Weight is offered on every lift. It only becomes required when the coach adds Load.
  if (asksForWeight(it)) cols.push(["w", unitTitle(entryUnit())]);
  (it.props || []).forEach((key) => {
    const field = PROP_FIELD[key];
    if (!field || cols.some((col) => col[0] === field)) return;
    let label = PROP_LABEL[key] || key;
    if (key === "load") label = unitTitle(entryUnit());
    else if (key === "rest") label = "Rest (s)";
    else if (key === "restRep") label = "Rest/Rep (s)";
    else if (key === "distance") label = "Distance (" + distanceWord(entryDistanceUnit()) + ")";
    else if (key === "intensity") label = intensityLabel(it.intensityKind);
    cols.push([field, label]);
  });
  return cols;
}
function countsAsEntered(value) {
  if (value == null) return false;
  const text = String(value).trim();
  if (!text || text === "0") return false;
  const num = Number(text);
  if (!Number.isNaN(num) && num === 0) return false;
  return true;
}
function requiredEntryFields(it) {
  return ((it && it.props) || []).map((key) => PROP_FIELD[key]).filter(Boolean);
}
function setIsComplete(it, entered) {
  const fields = requiredEntryFields(it);
  if (!fields.length) return false;
  return fields.every((field) => countsAsEntered(entered && entered[field]));
}
// With nothing required, the athlete's own Done tick is the answer.
function cellDone(it, entered, ticked) {
  return requiredEntryFields(it).length ? setIsComplete(it, entered) : !!ticked;
}
function prescribedEntry(it, field, index) {
  const i = index || 0;
  if (field === "r") return (it.reps && (it.reps[i] != null ? it.reps[i] : it.reps[0])) || "";
  if (field === "w") return (it.loads && (it.loads[i] != null ? it.loads[i] : it.loads[0])) || "";
  const map = {
    rest: "rests", restRep: "restReps", distance: "distances", tempo: "tempos",
    velocity: "velocities", power: "powers", pct: "pcts", intensity: "intensities"
  };
  const arr = it[map[field]] || [];
  return arr[i] != null && arr[i] !== "" ? arr[i] : (arr[0] || "");
}
function shownEntry(entered, field, prescribed) {
  if (entered && Object.prototype.hasOwnProperty.call(entered, field)) return entered[field];
  return prescribed == null ? "" : prescribed;
}
function vimeoId(url) {
  const m = String(url || "").match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return m ? m[1] : "";
}
function mediaKind(url) {
  const youtube = youtubeId(url);
  if (youtube) return { kind: "youtube", id: youtube };
  const vimeo = vimeoId(url);
  if (vimeo) return { kind: "vimeo", id: vimeo };
  return null;
}
function playAthleteVideo(key) {
  state.playingVideo = key;
  render();
}
function athletePlayerHtml(it) {
  if (!it || it.type === "circuit" || !it.videoUrl) return "";
  const media = mediaKind(it.videoUrl);
  if (!media) return "";
  const key = "vid:" + (it.id || it.weId || media.id);
  if (state.playingVideo !== key) {
    return `<button type="button" class="athlete-player" onclick="playAthleteVideo('${esc(key)}');event.stopPropagation()">▶ Play</button>`;
  }
  const src = media.kind === "youtube"
    ? `https://www.youtube-nocookie.com/embed/${media.id}?autoplay=1`
    : `https://player.vimeo.com/video/${media.id}?autoplay=1`;
  return `<div class="athlete-player playing"><iframe src="${esc(src)}" title="${esc(it.name || "Exercise")}" allow="autoplay; encrypted-media; fullscreen; picture-in-picture" allowfullscreen></iframe></div>`;
}
function entryItemById(date, itemId) {
  const pools = [];
  if (state.role === "athlete") {
    const saved = savedDay(date);
    if (saved) pools.push(saved.items || []);
  }
  const who = state.entryAthlete || state.athleteId;
  if (who && state.calendars[who] && state.calendars[who][date]) pools.push(state.calendars[who][date].items || []);
  for (let p = 0; p < pools.length; p++) {
    const found = pools[p].find((it) => it.id === itemId || ("wx" + it.weId) === itemId);
    if (found) return found;
  }
  return null;
}
function entryListHtml(aid, date, items, audience) {
  const list = items || [];
  let html = "";
  let index = 0;
  while (index < list.length) {
    const it = list[index];
    if (it.chainInstance) {
      const instance = it.chainInstance;
      const group = [];
      while (index < list.length && list[index].chainInstance === instance) {
        group.push(list[index]);
        index += 1;
      }
      html += chainEntryHtml(aid, date, group, audience || (state.role === "athlete" ? "athlete" : "coach"));
    } else {
      html += entryItem(aid, date, it);
      index += 1;
    }
  }
  return html;
}
function chainEntryHtml(aid, date, group, audience) {
  const head = group[0];
  const open = chainIsOpen(head, audience);
  const instance = esc(head.chainInstance);
  const letter = head.letter ? `<span class="letter" style="background:${LETTER_COLOR[head.letter] || "#999"}">${esc(head.letter)}</span>` : "";
  const body = open ? group.map((it) => entryItem(aid, date, it)).join("") : "";
  return `<div class="chain-block${open ? "" : " is-collapsed"}">
    <div class="chain-head">
      <button type="button" class="chain-fold" aria-label="${open ? "Collapse chain" : "Expand chain"}" onclick="toggleChainOpen('${date}','${instance}','${audience}', event)">${open ? "▾" : "▸"}</button>
      ${letter}
      <button type="button" class="chain-title" onclick="toggleChainOpen('${date}','${instance}','${audience}', event)">${esc(head.chainName || "Chain")}</button>
    </div>
    ${body}
  </div>`;
}
function athleteScheduleHtml(date, items) {
  const list = items || [];
  let html = "";
  let index = 0;
  while (index < list.length) {
    const it = list[index];
    if (it.chainInstance) {
      const instance = it.chainInstance;
      const group = [];
      while (index < list.length && list[index].chainInstance === instance) {
        group.push(list[index]);
        index += 1;
      }
      const head = group[0];
      const open = chainIsOpen(head, "athlete");
      const letter = head.letter ? `<span class="letter" style="background:${LETTER_COLOR[head.letter] || "#999"}">${esc(head.letter)}</span>` : "";
      const members = open ? group.map((row) => `<div class="ex"><div class="ex-main"><div class="ex-name">${esc(row.name)}</div><div class="ex-sub">${esc(scriptLine(row))}</div></div></div>`).join("") : "";
      html += `<div class="chain-block${open ? "" : " is-collapsed"}" onclick="event.stopPropagation()">
        <div class="chain-head">${letter}<button type="button" class="chain-fold" onclick="toggleChainOpen('${date}','${esc(instance)}','athlete', event)">${open ? "▾" : "▸"}</button><button type="button" class="chain-title" onclick="toggleChainOpen('${date}','${esc(instance)}','athlete', event)">${esc(head.chainName || "Chain")}</button></div>
        ${members}
      </div>`;
    } else {
      const color = LETTER_COLOR[it.letter] || "#888";
      const letter = it.letter ? `<span class="letter" style="background:${color}">${esc(it.letter)}</span>` : `<span class="letter" style="background:#444;color:#fff">–</span>`;
      html += `<div class="ex">${letter}<div class="ex-main"><div class="ex-name">${esc(it.name)}</div><div class="ex-sub">${esc(scriptLine(it))}</div></div></div>`;
      index += 1;
    }
  }
  return html;
}
function circuitEntryHtml(aid, date, it) {
  const key = aid + ":" + date + ":" + it.id;
  const log = state.logs[key] || {};
  const entered = log.entered || {};
  const done = setIsComplete(it, entered);
  const fields = (it.props || []).map((prop) => {
    const field = PROP_FIELD[prop];
    if (!field) return "";
    const label = prop === "load" ? unitTitle(entryUnit()) : (PROP_LABEL[prop] || prop);
    const value = shownEntry(entered, field, prescribedEntry(it, field, 0));
    return `<label class="circuit-field">${esc(label)} <input aria-label="${esc(label)}" value="${esc(value)}" onchange="logCircuitField('${key}','${field}',this.value,'${date}','${it.id}',${it.weId || 0})"></label>`;
  }).join("");
  return `<div class="circuit-entry">
    <div class="preview-copy">${esc(it.detail || "")}</div>
    <div class="hint">${esc(scriptLine(it))}</div>
    ${fields}
    <button type="button" class="complete${done ? " done" : ""}" aria-pressed="${done ? "true" : "false"}">${done ? "✓ Complete" : "Complete"}</button>
  </div>`;
}
function entryItemStatus(aid, date, it) {
  if (!it || it.type === "note" || it.type === "break" || it.type === "rest" || it.type === "video") return null;
  const log = state.logs[aid + ":" + date + ":" + it.id] || {};
  if (it.type === "circuit") return { done: setIsComplete(it, log.entered || {}) ? 1 : 0, total: 1 };
  if (it.type === "questionnaire" || (it.completionOnly && (it.type || "lift") === "lift")) return { done: log.done ? 1 : 0, total: 1 };
  const total = it.sets || 1;
  const cells = log.cells || {};
  let done = 0;
  for (let i = 0; i < total; i++) if (cells[i] && cells[i].done) done += 1;
  return { done, total };
}
function entryHead(aid, date, it) {
  const status = entryItemStatus(aid, date, it);
  const open = state.entryItem === it.id;
  let badge = "";
  if (status && status.done >= status.total) badge = `<span class="ui-badge green">✓ Done</span>`;
  else if (status && status.total > 1 && status.done) badge = `<span class="ui-badge">${status.done}/${status.total} sets</span>`;
  const letter = it.type === "note" || it.type === "circuit" ? (it.letter || "•") : (it.chainInstance ? "" : (it.letter || "•"));
  return `<button class="entry-item" type="button" aria-expanded="${open ? "true" : "false"}" onclick="state.entryItem=state.entryItem==='${it.id}'?null:'${it.id}';render()">
      <span class="letter" style="background:${LETTER_COLOR[it.letter] || "#999"}">${esc(letter)}</span>
      <span class="entry-name"><strong>${esc(it.name)}</strong><div class="hint">${esc(scriptLine(it))}</div></span>
      ${badge}<span class="entry-chev" aria-hidden="true">${open ? "▾" : "▸"}</span>
    </button>`;
}
function entryShell(aid, date, it, body) {
  const status = entryItemStatus(aid, date, it);
  const open = state.entryItem === it.id;
  const done = status && status.done >= status.total;
  return `<div class="entry-ex${open ? " open" : ""}${done ? " done" : ""}">${entryHead(aid, date, it)}${open && body ? `<div class="entry-body">${body}</div>` : ""}</div>`;
}
function entryItem(aid, date, it) {
  const key = aid + ":" + date + ":" + it.id;
  if (it.type === "note") return entryShell(aid, date, it, `<div class="preview-copy">${esc(it.note || "")}</div>`);
  if (it.type === "circuit") return entryShell(aid, date, it, circuitEntryHtml(aid, date, it));
  if (it.completionOnly && (it.type || "lift") === "lift") {
    const done = !!(state.logs[key] && state.logs[key].done);
    return entryShell(aid, date, it, `<div class="circuit-entry">
        ${it.note ? `<div class="preview-copy">${esc(it.note)}</div>` : ""}
        ${athletePlayerHtml(it)}
        <button type="button" class="complete${done ? " done" : ""}" aria-pressed="${done ? "true" : "false"}" onclick="toggleExerciseComplete('${key}','${date}','${it.id}',${it.weId || 0})">${done ? "✓ Completed" : "✓ Complete"}</button>
      </div>`);
  }
  const fields = entryColumns(it);
  const rows = Array.from({ length: it.sets || 1 }, (_, i) => {
    const cell = (state.logs[key] && state.logs[key].cells && state.logs[key].cells[i]) || {};
    const entered = cell.entered || {};
    const done = cellDone(it, entered, cell.done);
    const inputs = fields.map(([field, label]) => {
      const value = shownEntry(entered, field, prescribedEntry(it, field, i));
      const mode = field === "tempo" ? "text" : "decimal";
      return `<td><input aria-label="${esc(label)} set ${i + 1}" inputmode="${mode}" value="${esc(value)}" onchange="logCell('${key}',${i},'${field}',this.value,'${date}','${it.id}',${it.weId || 0})"></td>`;
    }).join("");
    return `<tr class="${done ? "set-done" : ""}"><td class="set-n">${i + 1}</td>${inputs}<td class="set-tick"><input aria-label="Done set ${i + 1}" type="checkbox" ${done ? "checked" : ""} onchange="logCell('${key}',${i},'done',this.checked,'${date}','${it.id}',${it.weId || 0})"></td></tr>`;
  }).join("");
  const table = it.type === "questionnaire"
    ? (it.questions || []).map((q) => `<label class="chk"><input type="checkbox" onchange="logCheck('${key}', this.checked)"> ${esc(q)}</label>`).join("")
    : `<table class="sets"><tr><th>Set</th>${fields.map((field) => `<th>${field[1]}</th>`).join("")}<th>Done</th></tr>${rows}</table>`;
  const safeName = String(it.name || "Exercise").replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  return entryShell(aid, date, it, `${athletePlayerHtml(it)}${table}<button class="complete" type="button" onclick="markDone('${key}','${safeName}',${it.weId || 0},${it.sets || 1})">Complete</button>`);
}
function logCell(key, i, field, value, date, itemId, weId) {
  const log = state.logs[key] || (state.logs[key] = { cells: {}, hydrated: true });
  log.hydrated = true;
  const it = entryItemById(date, itemId);
  log.cells[i] = log.cells[i] || { entered: {}, done: false };
  if (!log.cells[i].entered) log.cells[i].entered = {};
  if (field !== "done") {
    log.cells[i].entered[field] = value;
    log.cells[i][field] = value;
  }
  const map = {
    w: "weight", r: "reps", rest: "rest", tempo: "tempo", velocity: "velocity",
    power: "power", pct: "pct", restRep: "restRep", distance: "distance", intensity: "intensity"
  };
  // Ticking Done keeps what the boxes show, so prefilled reps and weight are saved too.
  const fill = {};
  if (field === "done" && value && it) {
    entryColumns(it).forEach(([col]) => {
      if (Object.prototype.hasOwnProperty.call(log.cells[i].entered, col)) return;
      const shown = prescribedEntry(it, col, i);
      if (shown == null || String(shown).trim() === "") return;
      log.cells[i].entered[col] = shown;
      log.cells[i][col] = shown;
      fill[map[col]] = shown;
    });
  }
  const ticked = field === "done" ? !!value : log.cells[i].done;
  log.cells[i].done = !!(it && cellDone(it, log.cells[i].entered, ticked));
  if (weId && state.openSession && (state.role === "athlete" || state.coachSessionFor)) {
    const apiField = field === "done" ? "completed" : map[field];
    logAthleteSet(weId, i + 1, apiField || "", field === "done" ? log.cells[i].done : log.cells[i][field], {
      athlete: log.cells[i].entered,
      completed: log.cells[i].done,
      fill
    });
    return;
  }
  render();
}
function logCircuitField(key, field, value, date, itemId, weId) {
  const log = state.logs[key] || (state.logs[key] = { hydrated: true, entered: {} });
  log.hydrated = true;
  log.entered = log.entered || {};
  log.entered[field] = value;
  const it = entryItemById(date, itemId);
  log.done = !!(it && setIsComplete(it, log.entered));
  const map = {
    w: "weight", r: "reps", rest: "rest", tempo: "tempo", velocity: "velocity",
    power: "power", pct: "pct", restRep: "restRep", distance: "distance", intensity: "intensity"
  };
  if (weId && state.openSession && (state.role === "athlete" || state.coachSessionFor)) {
    logAthleteSet(weId, 1, map[field] || field, value, { athlete: log.entered, completed: log.done });
    return;
  }
  render();
}
function toggleExerciseComplete(key, date, itemId, weId) {
  const log = state.logs[key] || (state.logs[key] = { cells: {}, hydrated: true });
  log.hydrated = true;
  log.done = !log.done;
  if (weId && state.openSession && (state.role === "athlete" || state.coachSessionFor)) {
    logAthleteSet(weId, 1, "completed", log.done);
    return;
  }
  render();
}
function logCheck(key) { state.logs[key] = { done: true, hydrated: true }; }
async function markDone(key, name) {
  const log = state.logs[key] || (state.logs[key] = { cells: {}, hydrated: true });
  log.exerciseDone = true;
  log.hydrated = true;
  toast("Logged " + name);
  render();
}
// Pass the items the page shows; athletes' days come from savedDay, not the coach calendar.
function summarize(aid, date, items) {
  if (!aid) return { sets: 0, reps: 0, tonnage: 0, duration: "N/A", prs: "" };
  const list = items || ensureDay(date, aid).items;
  let sets = 0, reps = 0, tonnage = 0;
  list.forEach((it) => {
    const log = state.logs[aid + ":" + date + ":" + it.id];
    if (!log) return;
    if (log.done && !log.cells) { sets += it.sets || 1; reps += (it.reps || []).reduce((a, b) => a + (+b || 0), 0); }
    Object.keys(log.cells || {}).forEach((i) => {
      const c = log.cells[i];
      if (!c.done) return;
      const entered = c.entered || {};
      const r = +shownEntry(entered, "r", prescribedEntry(it, "r", +i)) || 0;
      const w = +shownEntry(entered, "w", prescribedEntry(it, "w", +i)) || 0;
      sets += 1; reps += r; tonnage += r * w;
    });
  });
  const dur = state.startedAt ? fmtDur(Date.now() - state.startedAt) : "00:00";
  return { sets, reps, tonnage, duration: dur, prs: "" };
}
function fmtDur(ms) {
  const s = Math.floor(ms / 1000);
  return String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
}

const FEED = [];
function feedTabs() {
  if (state.role === "athlete") return "";
  const mode = state.feedMode || "athletes";
  const tab = (id, label) => `<button type="button" class="${mode === id ? "on" : ""}" onclick="setFeedMode('${id}')">${label}</button>`;
  return `<div class="ui-seg" role="tablist">${tab("athletes", "Athlete activity")}${tab("team", "Team feed")}${tab("journal", "My journal")}</div>`;
}
function inFeedWindow(date) {
  if (!state.feedTime || state.feedTime === "all") return true;
  if (!/^\d{4}-\d{2}-\d{2}/.test(String(date || ""))) return true;
  const from = state.feedTime === "week" ? sundayOf(APP_TODAY) : APP_TODAY.slice(0, 8) + "01";
  return String(date).slice(0, 10) >= from;
}
function feedView() {
  if (state.feedMode === "journal") return journalView();
  if (state.feedMode === "team") return teamView();
  const sessions = (state.gymActivity && state.gymActivity.sessions) || [];
  const rawFeed = sessions.length
    ? sessions.map((s) => [
        s.user_name || s.athlete_name || "Athlete",
        s.workout_title || "Workout",
        s.date || "",
        s.athlete_note || s.coach_note || "",
        s
      ])
    : FEED;
  const q = (state.feedQ || "").toLowerCase();
  const cards = rawFeed.map((row, i) => ({ row, i })).filter(({ row }) => {
    if (state.feedWho !== "all" && row[0] !== state.feedWho) return false;
    if (q && row.slice(0, 4).join(" ").toLowerCase().indexOf(q) < 0) return false;
    return inFeedWindow(row[2]);
  });
  const time = state.feedTime || "all";
  return uiPage(`
    ${uiHead("Coach", "Activity", "Logged sessions and the notes athletes leave you.", feedTabs())}
    <section class="ui-card">
      <div class="ui-card-body ui-inline">
        ${uiSearch("Search activity", "feed-q", state.feedQ, "state.feedQ=this.value;render()")}
        <select class="select auto" aria-label="Athlete" onchange="state.feedWho=this.value;render()"><option value="all">All athletes</option>${ATHLETES.map((a) => `<option ${state.feedWho === a.name ? "selected" : ""}>${esc(a.name)}</option>`).join("")}</select>
        <select class="select auto" aria-label="Time range" onchange="state.feedTime=this.value;render()">
          <option value="all" ${time === "all" ? "selected" : ""}>All time</option>
          <option value="week" ${time === "week" ? "selected" : ""}>This week</option>
          <option value="month" ${time === "month" ? "selected" : ""}>This month</option>
        </select>
      </div>
    </section>
    <section class="ui-card">
      ${uiCardHead("Sessions", cards.length)}
      <div class="ui-feed">${cards.map(({ row, i }) => feedCard(row, i)).join("") || uiEmpty("No activity yet", "Sessions show up here once athletes log a workout.")}</div>
    </section>`, "feed");
}

function setFeedMode(v) { state.feedMode = v; render(); }
function feedCard(c, i) {
  const s = c[4] || {};
  const badges = [
    s.completed ? `<span class="ui-badge green">Completed</span>` : (s.completed_sets ? `<span class="ui-badge blue">In progress</span>` : ""),
    s.completed_sets ? `<span class="ui-badge">${s.completed_sets} sets</span>` : "",
    s.tonnage ? `<span class="ui-badge">${fmtLoad(s.tonnage)} kg moved</span>` : ""
  ].join(" ");
  return `<article class="ui-feed-row">
    ${uiAvatar(c[0])}
    <div class="ui-feed-main">
      <div class="ui-feed-top"><b>${esc(c[0])}</b><span class="muted">${esc(c[1])}</span><span class="ui-feed-date">${c[2] ? esc(fmtShortDate(c[2])) : ""}</span></div>
      ${badges.trim() ? `<div class="ui-inline" style="margin-top:6px">${badges}</div>` : ""}
      ${c[3] ? `<blockquote class="ui-quote">${esc(c[3])}</blockquote>` : ""}
      ${state.comments[i] ? `<div class="ui-reply"><span>Your comment</span>${esc(state.comments[i])}</div>` : ""}
      <button class="btn btn-ghost btn-sm" type="button" onclick="commentOn(${i})">${state.comments[i] ? "Edit comment" : "Add a comment"}</button>
    </div>
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
  const sub = state.role === "athlete" ? "Private notes for yourself. Your coach does not see these." : "Private notes. Athletes do not see these.";
  return uiPage(`
    ${uiHead(state.role === "athlete" ? "" : "Coach", "Journal", sub, `${feedTabs()}<button class="btn btn-primary" type="button" onclick="state.modal={type:'journal'};render()">New entry</button>`)}
    ${state.journal.length
      ? `<div class="ui-tiles">${state.journal.map((j) => `<article class="ui-card ui-card-body"><div class="ui-card-sub">${esc(j.date)}</div><h3 class="ui-card-title" style="margin-top:4px">${esc(j.title)}</h3><p class="ui-prose">${esc(j.body)}</p></article>`).join("")}</div>`
      : `<section class="ui-card">${uiEmpty("No entries yet", "Write down how training is going.", `<button class="btn btn-primary" type="button" onclick="state.modal={type:'journal'};render()">New entry</button>`)}</section>`}`, "journal", true);
}
async function saveJournalEntry() {
  const title = (state.modal && state.modal.title) || "Note";
  const body = (state.modal && state.modal.body) || "";
  const date = fmtLong(APP_TODAY);
  try {
    const row = await createSaved("journal", { title, body, date });
    state.journal.unshift({ id: row.id, title, body, date });
    state.feedMode = "journal";
    state.modal = null;
    render();
  } catch (err) {
    toast(err.message || "Could not save that entry");
  }
}
function teamView() {
  const posts = state.posts.filter((p) => !state.teamGroup || p.group === state.teamGroup);
  const groupOpts = state.groups.map((g) => `<option ${state.teamGroup === g ? "selected" : ""}>${esc(g)}</option>`).join("");
  const tv = state.teamMode === "tv";
  const compose = state.compose ? `<section class="ui-card">
      ${uiCardHead("New post", null, state.teamGroup ? "Posting to " + esc(state.teamGroup) : "Posting to all groups")}
      <div class="ui-card-body ui-form">
        ${uiField("Title", `<input class="input" placeholder="Title" data-focus="post-title" value="${esc(state.draftTitle || "")}" oninput="state.draftTitle=this.value">`)}
        ${uiField("Post", `<textarea class="textarea" placeholder="Write a post" data-focus="post-body" oninput="state.draftBody=this.value">${esc(state.draftBody || "")}</textarea>`)}
        <div class="ui-inline" style="justify-content:flex-end"><button class="btn btn-secondary" type="button" onclick="state.compose=false;render()">Cancel</button><button class="btn btn-primary" type="button" onclick="publishPost()">Post</button></div>
      </div>
    </section>` : "";
  return uiPage(`
    ${uiHead("Coach", "Team feed", "Posts for your groups. TV mode shows the latest post full screen in the weight room.",
      `${feedTabs()}<button class="btn btn-primary" type="button" onclick="state.compose=true;render()">New post</button>`)}
    <section class="ui-card"><div class="ui-card-body ui-inline">
      <select class="select auto" aria-label="Group" onchange="state.teamGroup=this.value;render()"><option value="">All groups</option>${groupOpts}</select>
      <div class="ui-seg"><button type="button" class="${tv ? "" : "on"}" onclick="state.teamMode='feed';render()">Feed</button><button type="button" class="${tv ? "on" : ""}" onclick="state.teamMode='tv';render()">TV mode</button></div>
    </div></section>
    ${compose}
    ${tv ? `<section class="ui-card ui-tv">${posts[0] ? `<div class="ui-card-sub">${esc(posts[0].title || "Post")}</div><div>${esc(posts[0].text)}</div>` : "Waiting for a post"}</section>` : ""}
    <section class="ui-card">
      ${uiCardHead("Posts", posts.length)}
      <div class="ui-feed">${posts.map((p) => `<article class="ui-feed-row"><div class="ui-feed-main"><div class="ui-feed-top"><b>${esc(p.title || "Post")}</b><span class="ui-badge">${esc(p.group || "All groups")}</span></div><p class="ui-prose">${esc(p.text)}</p></div></article>`).join("") || uiEmpty("No posts yet", "Share an update with your athletes.")}</div>
    </section>`, "team-feed");
}
function publishPost() {
  if (!state.draftBody) return;
  state.posts.unshift({ title: state.draftTitle || "Note", text: state.draftBody, group: state.teamGroup });
  state.draftBody = ""; state.draftTitle = ""; state.compose = false;
  toast("Posted");
  render();
}

function groupCardHtml(name, members, codesHtml, addCode, edit, remove) {
  return `<section class="ui-card">
    ${uiCardHead(name, members.length, null, `<span class="ui-inline"><button class="btn btn-ghost btn-sm" type="button" onclick="${edit}">Rename</button><button class="btn btn-ghost btn-sm btn-danger" type="button" onclick="${remove}">Delete</button></span>`)}
    <div class="ui-card-body">
      ${members.map((m) => `<div class="ui-list-row"><span class="ui-person">${uiAvatar(m.name)}<span class="who"><b>${esc(m.name)}</b>${m.email ? `<small>${esc(m.email)}</small>` : ""}</span></span></div>`).join("") || `<p class="ui-hint">No athletes yet.</p>`}
      <div class="ui-codes"><span class="ui-label">Athlete join codes</span>${codesHtml}<button class="btn btn-secondary btn-sm" type="button" onclick="${addCode}">New code</button></div>
    </div>
  </section>`;
}
function codeChip(code, copy, remove) {
  return `<span class="ui-code"><code>${esc(code)}</code><button type="button" title="Copy" aria-label="Copy ${esc(code)}" onclick="${copy}">Copy</button><button type="button" title="Delete code" aria-label="Delete ${esc(code)}" onclick="${remove}">✕</button></span>`;
}
function usersView() {
  if (state.userTab === "codes") state.userTab = "groups";
  const rows = state.userTab === "coaches" ? state.coaches : state.userTab === "athletes" ? state.athletes : [];
  const q = state.userQ.toLowerCase();
  const filtered = rows.filter((r) => (r.first + " " + r.last + " " + r.email).toLowerCase().includes(q));
  const ctx = state.gymContext;
  const teams = ctx && Array.isArray(ctx.teams) ? ledTeams(ctx) : [];
  const tab = (id, label) => `<button type="button" class="${state.userTab === id ? "on" : ""}" onclick="state.userTab='${id}';render()">${label}</button>`;
  const groupForm = `<section class="ui-card"><form class="ui-card-body ui-form-row" onsubmit="addGroupRecord(); return false;">
      ${uiField("New group", `<input class="input" placeholder="e.g. Varsity" data-focus="group-name" value="${esc(state.toolForm.group || "")}" oninput="state.toolForm.group=this.value">`)}
      <button class="btn btn-primary" type="submit">Add group</button>
    </form></section>`;
  let main = "";
  if (state.userTab === "groups") {
    let cards = "";
    if (ctx && Array.isArray(ctx.teams)) {
      const allCodes = (ctx.codes || []).filter((c) => c.kind === "team");
      const allAthletes = ctx.athletes || [];
      cards = teams.map((t) => groupCardHtml(t.name,
        allAthletes.filter((a) => a.team_id === t.id),
        allCodes.filter((c) => c.team_id === t.id).map((c) => codeChip(c.code, `copyText('${esc(c.code)}')`, `deleteServerJoinCode(${c.id})`)).join("") || `<span class="ui-hint">None yet</span>`,
        `createJoinCode('team', ${t.id})`, `editServerGroup(${t.id}, '${esc(t.name)}')`, `deleteServerGroup(${t.id})`)).join("");
    } else {
      cards = state.groups.map((g, i) => groupCardHtml(g,
        state.athletes.filter((a) => assignedGroups(a.groups).includes(g)).map((a) => ({ name: (a.first + " " + a.last).trim(), email: a.email })),
        state.joinCodes.map((c, idx) => ({ c, idx })).filter((row) => row.c.group === g).map(({ c, idx }) => codeChip(c.code, `copyJoinCode(${idx})`, `removeJoinCode(${idx})`)).join("") || `<span class="ui-hint">None yet</span>`,
        `addJoinCode(${i})`, `editGroup(${i})`, `removeGroup(${i})`)).join("");
    }
    main = `${uiHead("", "Groups", "An athlete who redeems a group's join code is placed in that group.", "")}
      ${groupForm}
      ${cards ? `<div class="ui-tiles">${cards}</div>` : `<section class="ui-card">${uiEmpty("No groups yet", "Add a group above, then create a join code for it.")}</section>`}`;
  } else if (state.userTab === "upload") {
    const byTeam = teams.length > 0;
    const options = byTeam
      ? teams.map((t) => `<option value="${t.id}" ${String(t.id) === String(state.toolForm.uploadTeamId || teams[0].id) ? "selected" : ""}>${esc(t.name)}</option>`).join("")
      : state.groups.map((g) => `<option value="${esc(g)}" ${g === (state.toolForm.uploadGroup || state.groups[0]) ? "selected" : ""}>${esc(g)}</option>`).join("");
    main = `${uiHead("", "Upload athletes", "Paste one athlete per line, like <code>Sam Lee</code> or <code>Jo Kim, jo@gym.com</code>. Each gets an account in the group you choose.", "")}
      ${options ? `<section class="ui-card"><div class="ui-card-body ui-form">
        ${uiField("Group", `<select id="uploadGroup" class="select" onchange="state.toolForm.${byTeam ? "uploadTeamId" : "uploadGroup"}=this.value">${options}</select>`)}
        ${uiField("Athletes", `<textarea id="uploadBox" class="textarea" style="min-height:180px" placeholder="Sam Lee&#10;Jo Kim, jo@gym.com"></textarea>`)}
        <div><button class="btn btn-primary" type="button" onclick="importUsers()">Import athletes</button></div>
      </div></section>` : `<section class="ui-card">${uiEmpty("Create a group first", "Uploaded athletes are placed in a group.", `<button class="btn btn-primary" type="button" onclick="state.userTab='groups';render()">Go to groups</button>`)}</section>`}`;
  } else if (state.userTab === "export") {
    main = `${uiHead("", "Export data", "Download calendars and the roster as a JSON file.", "")}
      <section class="ui-card"><div class="ui-card-body ui-inline" style="justify-content:space-between"><span>Everything on this gym's calendars, plus every athlete and coach.</span><button class="btn btn-primary" type="button" onclick="exportData()">Download</button></div></section>`;
  } else {
    const coaches = state.userTab === "coaches";
    const selectedRole = state.toolForm.role || (coaches ? "coach" : "student");
    const chosenTeamId = teams.some((t) => String(t.id) === String(state.toolForm.userTeamId))
      ? String(state.toolForm.userTeamId)
      : (teams[0] ? String(teams[0].id) : "");
    const sorted = filtered.slice().sort((a, b) => (a[state.userSort] || "").localeCompare(b[state.userSort] || ""));
    const body = sorted.map((r) => {
      const name = ((r.first || "") + " " + (r.last || "")).trim();
      const active = r.activity && r.activity !== "N/A";
      return `<tr>
        <td><span class="ui-person">${uiAvatar(name)}<span class="who"><b>${esc(name)}</b><small>${esc(r.email || "")}</small></span></span></td>
        <td>${assignedGroups(r.groups).map((g) => `<span class="ui-badge blue">${esc(g)}</span>`).join(" ") || `<span class="muted">—</span>`}</td>
        <td class="num hide-sm">${esc(r.cals || "0")}</td>
        <td class="hide-sm">${active ? `<span class="ui-badge green">${esc(r.activity)}</span>` : `<span class="ui-badge amber">No activity</span>`}</td>
        <td class="row-actions"><button class="btn btn-ghost btn-sm" type="button" onclick="editUser('${r.id}')">Edit</button><button class="btn btn-ghost btn-sm btn-danger" type="button" onclick="removeUser('${r.id}')">Remove</button></td>
      </tr>`;
    }).join("");
    main = `${uiHead("", coaches ? "Coaches" : "Athletes", coaches ? "Coaches in this gym." : "Athletes on teams you lead, plus anyone without a group.", "")}
      <section class="ui-card">
        ${uiCardHead("Add " + (selectedRole === "coach" ? "a coach" : "an athlete"))}
        <form class="ui-card-body ui-form-row" onsubmit="addUserRecord(event); return false;">
          ${uiField("First name", `<input class="input" data-focus="user-first" value="${esc(state.toolForm.first || "")}" oninput="state.toolForm.first=this.value">`)}
          ${uiField("Last name", `<input class="input" data-focus="user-last" value="${esc(state.toolForm.last || "")}" oninput="state.toolForm.last=this.value">`)}
          ${uiField("Email", `<input class="input" type="email" data-focus="user-email" value="${esc(state.toolForm.email || "")}" oninput="state.toolForm.email=this.value">`)}
          ${uiField("Role", `<select class="select" onchange="state.toolForm.role=this.value;render()"><option value="student" ${selectedRole !== "coach" ? "selected" : ""}>Athlete</option><option value="coach" ${selectedRole === "coach" ? "selected" : ""}>Coach</option></select>`)}
          ${selectedRole !== "coach" && teams.length ? uiField("Group", `<select class="select" id="user-team-id" onchange="state.toolForm.userTeamId=this.value">${teams.map((t) => `<option value="${t.id}" ${String(t.id) === chosenTeamId ? "selected" : ""}>${esc(t.name)}</option>`).join("")}</select>`) : ""}
          <button class="btn btn-primary" type="submit">Add</button>
        </form>
      </section>
      <section class="ui-card">
        ${uiCardHead(coaches ? "Coaches" : "Athletes", filtered.length, null, `<span class="ui-inline">
          <select class="select auto" aria-label="Sort by" onchange="state.userSort=this.value;render()"><option value="last" ${state.userSort !== "first" ? "selected" : ""}>Last name</option><option value="first" ${state.userSort === "first" ? "selected" : ""}>First name</option></select>
          ${uiSearch("Search people", "user-q", state.userQ, "state.userQ=this.value;render()", "max-width:240px")}</span>`)}
        <div class="ui-table-wrap"><table class="ui-table">
          <thead><tr><th>Name</th><th>Groups</th><th class="num hide-sm">Calendars</th><th class="hide-sm">Last activity</th><th></th></tr></thead>
          <tbody>${body || `<tr><td colspan="5">${uiEmpty(rows.length ? "No matches" : "Nobody here yet", rows.length ? "Try a different search." : "Add someone above, or use Upload athletes.")}</td></tr>`}</tbody>
        </table></div>
      </section>`;
  }
  return `<section class="stage ui-page" id="users"><div class="ui-wrap ui-settings">
    <nav class="ui-subnav" aria-label="Manage users">
      <div class="ui-subnav-title">Manage users</div>
      <div class="ui-subnav-sec">People</div>
      ${tab("athletes", "Athletes")}${tab("coaches", "Coaches")}${tab("groups", "Groups &amp; join codes")}
      <div class="ui-subnav-sec">Tools</div>
      ${tab("upload", "Upload athletes")}${tab("export", "Export data")}
    </nav>
    <div class="ui-stack" style="gap:20px">${main}</div>
  </div></section>`;
}
function assignedGroups(value) {
  return String(value || "").split(",").map((part) => part.trim()).filter(Boolean);
}
function parseRosterLine(line) {
  const raw = String(line || "").trim();
  if (!raw) return null;
  const found = raw.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  const email = found ? found[0] : "";
  let name = raw;
  if (email) name = raw.replace(email, " ").replace(/[<>(),]/g, " ");
  name = name.replace(/\s+/g, " ").trim();
  if (!name && email) name = email.split("@")[0];
  if (!name) return null;
  const parts = name.split(" ");
  return { first: parts[0], last: parts.slice(1).join(" "), email };
}
async function importUsers() {
  const box = document.getElementById("uploadBox");
  const select = document.getElementById("uploadGroup");
  const rawVal = ((select && select.value) || state.toolForm.uploadTeamId || state.toolForm.uploadGroup || "").trim();
  if (!rawVal) { toast("Choose a group"); return; }
  const people = (box ? box.value : "").split("\n").map(parseRosterLine).filter(Boolean);
  if (!people.length) { toast("Paste at least one name"); return; }

  const ctx = state.gymContext;
  const teams = ctx && Array.isArray(ctx.teams) ? ledTeams(ctx) : [];
  const teamObj = teams.find((t) => String(t.id) === rawVal || t.name === rawVal);

  if (teamObj && state.auth && state.auth.token) {
    try {
      const payload = {
        team_id: teamObj.id,
        athletes: people.map((p) => ({
          name: (p.first + " " + p.last).trim(),
          email: p.email || null
        }))
      };
      const res = await api("POST", "/api/gym/athletes/bulk", payload);
      await loadGymContext();
      if (box) box.value = "";
      state.toolForm.uploadTeamId = String(teamObj.id);
      state.userTab = "athletes";
      const count = (res && res.created && res.created.length) || people.length;
      toast(count + " athlete" + (count === 1 ? "" : "s") + " added to " + teamObj.name);
      render();
      return;
    } catch (err) {
      toast(err.message || "Could not import athletes");
      console.error(err);
      return;
    }
  }

  people.forEach((person) => {
    const id = uid();
    const name = (person.first + " " + person.last).trim();
    state.athletes.push({
      id, first: person.first, last: person.last, email: person.email,
      activity: "N/A", groups: rawVal, cals: "All"
    });
    ATHLETES.push({ id, name, email: person.email });
    state.calendars[id] = {};
  });
  state.toolForm.uploadGroup = rawVal;
  state.userTab = "groups";
  toast(people.length + " athlete" + (people.length === 1 ? "" : "s") + " added to " + rawVal);
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
  const serverId = row ? row.serverId : (String(id).startsWith("srv") ? parseInt(String(id).slice(3), 10) : (String(id).startsWith("u") || String(id).startsWith("c") ? parseInt(String(id).slice(1), 10) : null));
  if (serverId) {
    try {
      if (state.auth && state.auth.token && state.auth.user && state.auth.user.gym_id) {
        if (row && row.role === "coach") {
          await api("DELETE", "/api/gym/coaches/" + serverId);
        } else {
          await api("DELETE", "/api/gym/athletes/" + serverId);
        }
        await loadGymContext();
        toast("User removed");
        render();
        return;
      } else {
        await api("DELETE", "/api/users/" + serverId);
      }
    } catch (e) {
      toast(e.message || "Could not remove user");
      console.warn("Failed to delete user on server:", e);
      return;
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
      { key: "email", label: "Email", value: row.email || "", type: "email" },
      { key: "load_unit", label: "Load unit", value: normalizeUnit(row.load_unit), options: ["kg", "lbs"] },
      { key: "distance_unit", label: "Distance unit", value: distanceChoice(row.distance_unit), options: ["metres", "km", "yards", "miles"] }
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
      state.modal = null;
      renameGroup(index, next);
    }
  });
}
function editServerGroup(groupId, currentName) {
  openEdit({
    title: "Edit group",
    fields: [{ key: "name", label: "Group name", value: currentName || "" }],
    onSave: async (values) => {
      const next = (values.name || "").trim();
      if (!next) { toast("Enter a group name"); return; }
      try {
        await api("PUT", "/api/groups/" + groupId, { name: next });
        state.modal = null;
        await loadGymContext();
        toast("Group renamed");
      } catch (err) {
        toast(err.message || "Could not rename group");
      }
      render();
    }
  });
}
async function deleteServerGroup(groupId) {
  try {
    await api("DELETE", "/api/groups/" + groupId);
    await loadGymContext();
    toast("Group removed");
  } catch (err) {
    toast(err.message || "Could not remove group");
  }
  render();
}
async function deleteServerJoinCode(codeId) {
  try {
    await api("DELETE", "/api/join-codes/" + codeId);
    await loadGymContext();
    toast("Code removed");
  } catch (err) {
    toast(err.message || "Could not remove code");
  }
  render();
}
function copyText(text) {
  const done = () => toast("Copied");
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(done).catch(done);
  } else done();
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
  const prev = state.groups[index];
  state.groups[index] = next;
  state.joinCodes.forEach((c) => { if (c.group === prev) c.group = next; });
  state.athletes.forEach((a) => {
    const names = assignedGroups(a.groups);
    const at = names.indexOf(prev);
    if (at >= 0) {
      names[at] = next;
      a.groups = names.join(", ");
    }
  });
  toast("Group renamed");
  render();
}
function removeGroup(index) {
  const name = state.groups[index];
  if (name == null) return;
  state.groups.splice(index, 1);
  state.joinCodes = state.joinCodes.filter((c) => c.group !== name);
  render();
}
function addJoinCode(index) {
  const group = state.groups[index];
  if (!group) { toast("Add a group before creating a code"); return; }
  const used = new Set(state.joinCodes.map((c) => c.code));
  let code = "";
  for (let n = 0; n < 40; n++) {
    const candidate = "NEW" + Math.floor(Math.random() * 90 + 10);
    if (!used.has(candidate)) { code = candidate; break; }
  }
  if (!code) code = "NEW" + String(Date.now()).slice(-4);
  state.joinCodes.push({ code, group });
  toast("Code added for " + group);
  render();
}
function removeJoinCode(index) {
  if (!state.joinCodes[index]) return;
  state.joinCodes.splice(index, 1);
  render();
}
function copyJoinCode(index) {
  const row = state.joinCodes[index];
  if (!row) return;
  const done = () => toast("Copied");
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(row.code).then(done).catch(done);
  } else done();
}
async function loadRoster() {
  try {
    if (state.auth && state.auth.token && state.auth.user && state.auth.user.gym_id) {
      await loadGymContext();
      render();
      return;
    }
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
        ATHLETES.push({ id, name: u.name, email: u.email, serverId: u.id });
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
async function addUserRecord(ev) {
  if (ev) ev.preventDefault();
  const first = (state.toolForm.first || "").trim();
  const last = (state.toolForm.last || "").trim();
  const email = (state.toolForm.email || "").trim();
  const role = state.toolForm.role || (state.userTab === "coaches" ? "coach" : "student");
  if (!first || !email) { toast("First name and email are required"); return; }
  const fullName = (first + " " + last).trim();
  try {
    if (state.auth && state.auth.token && state.auth.user && state.auth.user.gym_id) {
      if (role === "coach") {
        await api("POST", "/api/gym/coaches", { name: fullName, email });
      } else {
        const teams = ledTeams(state.gymContext);
        const teamEl = document.getElementById("user-team-id");
        const teamId = parseInt((teamEl && teamEl.value) || state.toolForm.userTeamId || (teams[0] && teams[0].id), 10);
        if (!teamId) {
          toast("Create a group first in the Groups tab");
          return;
        }
        await api("POST", "/api/gym/athletes", { name: fullName, email, team_id: teamId });
      }
      await loadGymContext();
      state.toolForm.first = "";
      state.toolForm.last = "";
      state.toolForm.email = "";
      state.userTab = role === "coach" ? "coaches" : "athletes";
      toast("User added");
      render();
      return;
    }
    const user = await api("POST", "/api/users", {
      name: fullName, email, role, title: role === "coach" ? "Coach" : "Athlete"
    });
    const row = { id: "srv" + user.id, serverId: user.id, first, last, email, activity: "Just added", groups: "—", cals: "All", role };
    (role === "coach" ? state.coaches : state.athletes).push(row);
    if (role !== "coach") {
      const id = "u" + user.id;
      ATHLETES.push({ id, name: fullName, email, serverId: user.id });
      state.calendars[id] = {};
    }
    state.toolForm.first = "";
    state.toolForm.last = "";
    state.toolForm.email = "";
    state.userTab = role === "coach" ? "coaches" : "athletes";
    toast("User added");
    render();
  } catch (err) {
    toast(err.message || "Could not add that user");
    console.error(err);
  }
}
async function addGroupRecord() {
  const name = (state.toolForm.group || "").trim();
  if (!name) { toast("Enter a group name"); return; }
  try {
    await api("POST", "/api/groups", { name });
    if (state.auth && state.auth.token) {
      await refreshSignedInUser();
      await loadGymContext();
    }
    if (!state.groups.includes(name)) state.groups.push(name);
    state.toolForm.group = "";
    toast("Group saved");
  } catch (err) {
    toast(err.message || "Could not create that group");
    console.error(err);
  }
  render();
}
async function saveUserEdit(row, values) {
  if (!row || !values) return;
  const first = (values.first || "").trim();
  const last = (values.last || "").trim();
  const email = (values.email || "").trim();
  if (!first || !email) { toast("First name and email are required"); return; }
  const name = (first + " " + last).trim();
  const loadUnit = normalizeUnit(values.load_unit);
  const distanceUnit = normalizeDistanceUnit(values.distance_unit);
  if (row.serverId) {
    try { await api("PUT", "/api/users/" + row.serverId, { name, email, load_unit: loadUnit, distance_unit: distanceUnit }); }
    catch (err) { toast("Could not save user"); console.error(err); return; }
  }
  row.load_unit = loadUnit;
  row.distance_unit = distanceUnit;
  if (row.serverId) {
    applyAthleteUnit(row.serverId, loadUnit);
    applyAthleteDistance(row.serverId, distanceUnit);
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

function canonicalCategory(category) {
  const raw = String(category || "").trim();
  const lower = raw.toLowerCase();
  const aliases = {
    strength: "Strength",
    lift: "Strength",
    lifts: "Strength",
    "warm up": "Warm up",
    warmup: "Warm up",
    "warm-up": "Warm up",
    "warm ups": "Warm up",
    warmups: "Warm up",
    "speed/agility/cardio": "Speed/agility/cardio",
    speed: "Speed/agility/cardio",
    agility: "Speed/agility/cardio",
    cardio: "Speed/agility/cardio",
    cooldown: "Cooldown",
    cooldowns: "Cooldown",
    "cool down": "Cooldown",
    "cool-down": "Cooldown",
    circuit: "Circuit",
    circuits: "Circuit",
    questionnaire: "Questionnaire",
    questionnaires: "Questionnaire",
    note: "Notes",
    notes: "Notes"
  };
  if (!lower) return "Strength";
  return aliases[lower] || raw;
}
function intensityKindCode(value) {
  const v = String(value || "").trim().toLowerCase();
  if (!v || v === "none" || v === "unset") return "";
  if (v === "rpe") return "rpe";
  if (v === "rir") return "rir";
  if (v === "pct1rm" || v === "% of 1-rep max" || v.indexOf("1-rep") >= 0 || v.indexOf("1 rep") >= 0 || v === "percent") return "pct1rm";
  return "";
}
function intensityChoice(kind) {
  const code = intensityKindCode(kind);
  if (code === "rir") return "RIR";
  if (code === "pct1rm") return "% of 1-rep max";
  if (code === "rpe") return "RPE";
  return "";
}
function intensityLabel(kind) {
  return intensityChoice(kind) || "Intensity";
}
function dayItemType(category, parsed) {
  const raw = String(category || "").trim();
  const lower = raw.toLowerCase();
  if (!raw) return parsed && parsed.plainLines && parsed.plainLines.length > 1 ? "circuit" : "lift";
  if (lower === "note" || lower === "notes") return "note";
  if (lower.indexOf("question") >= 0) return "questionnaire";
  if (lower.indexOf("circuit") >= 0) return "circuit";
  const known = canonicalCategory(raw);
  if (known === "Strength" || known === "Warm up" || known === "Speed/agility/cardio" || known === "Cooldown") return "lift";
  if (parsed && parsed.plainLines && parsed.plainLines.length > 1) return "circuit";
  return "lift";
}
function dayTypeForCategory(category) {
  return dayItemType(category, { plainLines: [] });
}
function categoryVisible(category) {
  if (!state.managing || state.managing === "All") return true;
  const raw = String(category || "").trim();
  return (raw ? canonicalCategory(raw) : "Strength") === state.managing;
}
function categoryLabel(category) {
  const raw = String(category || "").trim();
  return raw ? canonicalCategory(raw) : "Strength";
}
function readIntensity(values) {
  const kind = intensityKindCode(values && values.intensity_kind);
  const raw = values ? values.intensity_value : "";
  if (!kind) {
    if (String(raw || "").trim()) return { error: "Intensity needs one kind and one number" };
    return { intensity_kind: "", intensity_value: "" };
  }
  const num = Number(raw);
  if (!Number.isFinite(num) || String(raw || "").trim() === "") return { error: "Enter an intensity number" };
  if ((kind === "rpe" || kind === "rir") && (num < 1 || num > 10 || num !== Math.floor(num))) {
    return { error: "RPE and RIR stay between 1 and 10" };
  }
  if (kind === "pct1rm" && num <= 0) return { error: "Enter an intensity number" };
  const stored = num === Math.floor(num) ? String(Math.floor(num)) : String(num);
  return { intensity_kind: kind, intensity_value: stored };
}
function libraryExercisePayload(values) {
  const name = (values.name || "").trim();
  const category = canonicalCategory(values.category || "Strength");
  const note = category === "Notes";
  const circuit = category === "Circuit";
  const intensity = note ? { intensity_kind: "", intensity_value: "" } : readIntensity(values);
  if (intensity.error) return { error: intensity.error };
  const sets = note ? 0 : Math.max(1, Math.min(10, parseInt(values.default_sets, 10) || (circuit ? 1 : 3)));
  return {
    name,
    category,
    video_url: values.video_url || "",
    default_notes: String(values.default_notes || "").slice(0, note ? 4000 : 255),
    default_sets: sets,
    default_reps: note ? "" : (values.default_reps != null && String(values.default_reps) !== "" ? String(values.default_reps) : (circuit ? "1" : "10")),
    default_load: note ? "" : (values.default_load || ""),
    default_rest: note ? "" : (values.default_rest || ""),
    default_rest_rep: note ? "" : (values.default_rest_rep || ""),
    default_distance: note ? "" : (values.default_distance || ""),
    default_tempo: note ? "" : (values.default_tempo || ""),
    default_velocity: note ? "" : (values.default_velocity || ""),
    default_power: note ? "" : (values.default_power || ""),
    default_pct: note ? "" : (values.default_pct || ""),
    default_stations: circuit ? (values.default_stations || "") : (values.default_stations || ""),
    intensity_kind: intensity.intensity_kind,
    intensity_value: intensity.intensity_value,
    completion_only: !note && !circuit && !!values.completion_only
  };
}
function trackingFields(row, opts) {
  const setsDefault = opts && opts.setsDefault != null ? opts.setsDefault : 3;
  const repsDefault = opts && opts.repsDefault != null ? opts.repsDefault : "10";
  const fields = [];
  if (!opts || opts.sets !== false) {
    fields.push({
      key: "default_sets",
      label: (opts && opts.setsLabel) || "Default sets",
      value: String(row.default_sets != null && row.default_sets !== "" ? row.default_sets : setsDefault),
      type: "number"
    });
  }
  fields.push(
    { key: "default_reps", label: "Default reps", value: row.default_reps != null && String(row.default_reps) !== "" ? String(row.default_reps) : repsDefault },
    { key: "default_rest", label: "Default rest", value: row.default_rest || "" },
    { key: "default_rest_rep", label: "Rest/Rep (s)", value: row.default_rest_rep || "" },
    { key: "default_distance", label: "Distance", value: row.default_distance || "" }
  );
  return fields;
}
function intensityEditorFields(row) {
  const kind = intensityKindCode(row.intensity_kind);
  if (!kind) return [{ key: "add_intensity", label: "Intensity", button: "Add intensity" }];
  const bounds = kind === "pct1rm" ? { min: "1" } : { min: "1", max: "10" };
  return [
    { key: "intensity_kind", label: "Intensity", value: intensityChoice(kind), options: ["RPE", "% of 1-rep max", "RIR"] },
    Object.assign({ key: "intensity_value", label: intensityLabel(kind), value: row.intensity_value || "", type: "number" }, bounds),
    { key: "remove_intensity", label: "Intensity", button: "Remove intensity" }
  ];
}
function exerciseFields(row) {
  const category = canonicalCategory(row.category || "Strength");
  const fields = [
    { key: "name", label: "Name", value: row.name || "" },
    { key: "category", label: "Category", value: category, options: EXERCISE_CATEGORIES.slice() },
    { key: "video_url", label: "YouTube link", value: row.video_url || "" }
  ];
  if (category === "Notes") {
    fields.push({ key: "default_notes", label: "Note", value: row.default_notes || "", multiline: true });
    return fields;
  }
  if (category === "Circuit") {
    fields.push(
      { key: "default_stations", label: "Stations", value: row.default_stations || "", multiline: true },
      { key: "default_sets", label: "Rounds", value: String(row.default_sets || 1), type: "number" },
      { key: "default_notes", label: "Additional info", value: row.default_notes || "", multiline: true, maxlength: 255 }
    );
    fields.push.apply(fields, trackingFields(row, { sets: false, repsDefault: "1" }));
    fields.push.apply(fields, intensityEditorFields(row));
    return fields;
  }
  if (category === "Questionnaire") {
    fields.push.apply(fields, trackingFields(row, { setsDefault: 1, repsDefault: "1" }));
    fields.push.apply(fields, intensityEditorFields(row));
    return fields;
  }
  const tracking = trackingFields(row);
  const restAt = tracking.findIndex((field) => field.key === "default_rest");
  tracking.splice(restAt, 0, { key: "default_load", label: "Default load", value: row.default_load || "" });
  fields.push.apply(fields, tracking);
  fields.push(
    { key: "default_tempo", label: "Default tempo", value: row.default_tempo || "" },
    { key: "default_velocity", label: "Default velocity", value: row.default_velocity || "" },
    { key: "default_power", label: "Default peak power", value: row.default_power || "" },
    { key: "default_pct", label: "Default %PR", value: row.default_pct || "" }
  );
  fields.push.apply(fields, intensityEditorFields(row));
  fields.push({
    key: "completion_only", label: "Workout options", checkbox: "Completion only",
    hint: "Athletes just tick it off. No weight or rep entry. Applies when it is next added to a calendar.",
    value: row.completion_only ? "1" : ""
  });
  return fields;
}
function editExercise(id) {
  const row = state.serverExercises.find((e) => e.id === id);
  if (!row) return;
  const category = canonicalCategory(row.category || "Strength");
  const title = category === "Circuit" ? "Edit circuit" : category === "Notes" ? "Edit note" : "Edit exercise";
  openEdit({
    title,
    liveCategory: true,
    fields: exerciseFields(row),
    onSave: async (values) => {
      const payload = libraryExercisePayload(values);
      if (payload.error) { toast(payload.error); return; }
      if (!payload.name) { toast("Name the exercise"); return; }
      const previous = row.name;
      Object.assign(row, payload);
      const ok = await saveExerciseName(id, previous);
      if (!ok) return;
      state.modal = null;
      render();
    }
  });
}
function exerciseRows() {
  const q = state.liftQ.toLowerCase();
  if (state.serverExercises.length) {
    return state.serverExercises.filter((e) => !e.hidden && categoryVisible(e.category) && e.name.toLowerCase().includes(q));
  }
  return state.lifts.filter((l) => {
    const mapped = l.type === "Circuits" || l.type === "circuit" ? "Circuit" : (l.type === "Questionnaires" || l.type === "questionnaire" ? "Questionnaire" : "Strength");
    return categoryVisible(mapped) && l.name.toLowerCase().includes(q);
  });
}
function exerciseDefaultsText(l) {
  const category = canonicalCategory(l.category || "Strength");
  if (category === "Notes") return "";
  if (category === "Circuit") return l.default_sets ? l.default_sets + " round" + (+l.default_sets === 1 ? "" : "s") : "";
  const sets = l.default_sets || "";
  const reps = l.default_reps || "";
  if (sets && reps) return sets + " × " + reps;
  return sets ? sets + " sets" : "";
}
function liftsView() {
  const rows = exerciseRows();
  const server = state.serverExercises.length > 0;
  const total = server ? state.serverExercises.filter((e) => !e.hidden).length : state.lifts.length;
  const filters = ["All"].concat(EXERCISE_CATEGORIES);
  const empty = state.managing === "All" ? "No exercises yet." : ("No " + state.managing + " exercises yet.");
  const body = rows.map((l) => {
    if (!server) return `<tr><td class="strong">${esc(l.name)}</td><td>${esc(l.type)}</td><td></td><td></td><td></td></tr>`;
    const tags = [
      l.video_url ? `<span class="ui-badge">Video</span>` : "",
      l.completion_only ? `<span class="ui-badge green">Completion only</span>` : ""
    ].join(" ");
    return `<tr>
      <td class="strong">${esc(l.name)}</td>
      <td><span class="ui-badge">${esc(categoryLabel(l.category))}</span></td>
      <td class="muted hide-sm">${esc(exerciseDefaultsText(l)) || "—"}</td>
      <td class="hide-sm">${tags}</td>
      <td class="row-actions"><button class="btn btn-ghost btn-sm" type="button" onclick="editExercise(${l.id})">Edit</button><button class="btn btn-ghost btn-sm btn-danger" type="button" onclick="hideExercise(${l.id})">Hide</button></td>
    </tr>`;
  }).join("");
  return `<section class="stage ui-page"><div class="ui-wrap">
    ${uiHead("Coach tools", "Exercise library", `${total} exercise${total === 1 ? "" : "s"} in your gym's master database. Defaults here fill in when an exercise is added to a calendar.`,
      `<button class="btn btn-secondary" type="button" onclick="openChainEditor()">New chain</button>`)}
    <section class="ui-card">
      <div class="ui-card-body ui-inline">
        <div class="ui-search"><input class="input" placeholder="Search exercises and chains" aria-label="Search exercises" data-focus="lift-q" value="${esc(state.liftQ)}" oninput="state.liftQ=this.value;render()"></div>
        <select class="select auto" aria-label="Exercise category" onchange="state.managing=this.value;render()">${filters.map((t) => `<option ${state.managing === t ? "selected" : ""}>${t}</option>`).join("")}</select>
        <form class="ui-inline" onsubmit="addExerciseRecord(); return false;">
          <input class="input auto" style="width:220px" placeholder="New exercise name" aria-label="New exercise name" data-focus="ex-name" value="${esc(state.toolForm.exName || "")}" oninput="state.toolForm.exName=this.value">
          <button class="btn btn-primary" type="submit">Add exercise</button>
        </form>
      </div>
    </section>
    <section class="ui-card">
      <div class="ui-card-head"><h2 class="ui-card-title">Exercises <span class="count">${rows.length}</span></h2></div>
      <div class="ui-table-wrap"><table class="ui-table">
        <thead><tr><th>Name</th><th>Category</th><th class="hide-sm">Defaults</th><th class="hide-sm">Tags</th><th></th></tr></thead>
        <tbody>${body || `<tr><td colspan="5"><div class="ui-empty"><b>${esc(empty)}</b>${state.liftQ ? "Try a different search." : "Add one above."}</div></td></tr>`}</tbody>
      </table></div>
    </section>
    ${chainLibraryHtml()}
  </div></section>`;
}
function chainLibraryHtml() {
  const q = state.liftQ.toLowerCase();
  const chains = (state.chains || []).filter((chain) => !q || chain.name.toLowerCase().includes(q) || String(chain.kind || "").toLowerCase().includes(q));
  const body = chains.map((chain) => `<tr>
    <td class="strong"><span class="chain-mark">Chain</span> ${esc(chain.name)}</td>
    <td><span class="ui-badge">${esc(chain.kind || "")}</span></td>
    <td class="num">${(chain.members || []).length}</td>
    <td class="row-actions"><button class="btn btn-ghost btn-sm" type="button" onclick="openChainEditor(${chain.id})">Edit</button></td>
  </tr>`).join("");
  return `<section class="ui-card chain-library">
    <div class="ui-card-head">
      <div><h2 class="ui-card-title">Chains <span class="count">${chains.length}</span></h2>
      <p class="ui-card-sub">A saved group of exercises, added to a day in one go. Not a superset, not a stations circuit, and no video of its own.</p></div>
      <button class="btn btn-secondary btn-sm" type="button" onclick="openChainEditor()">New chain</button>
    </div>
    <div class="ui-table-wrap"><table class="ui-table">
      <thead><tr><th>Name</th><th>Kind</th><th class="num">Exercises</th><th></th></tr></thead>
      <tbody>${body || `<tr><td colspan="4"><div class="ui-empty"><b>No chains yet</b>Group a warm-up or cooldown you reuse.</div></td></tr>`}</tbody>
    </table></div>
  </section>`;
}
function rememberChain(chain) {
  if (!chain) return;
  const index = state.chains.findIndex((row) => row.id === chain.id);
  if (index >= 0) state.chains[index] = chain;
  else state.chains.push(chain);
}
async function loadChains() {
  try {
    state.chains = await api("GET", "/api/chains");
  } catch (err) {
    console.error(err);
  }
}
function openChainEditor(chainId) {
  const chain = chainId ? (state.chains || []).find((row) => row.id === chainId) : null;
  state.modal = {
    type: "chain",
    source: "library",
    chainId: chain ? chain.id : null,
    date: null,
    workoutId: null,
    instance: "",
    name: chain ? chain.name : "",
    kind: chain ? chain.kind : "Warm up",
    pick: "",
    members: chain ? (chain.members || []).map((member) => chainMemberDraft(member)) : []
  };
  render();
}
function openChainFromDay(date, instance) {
  const day = ensureDay(date);
  const members = day.items.filter((it) => it.chainInstance === instance);
  if (!members.length || !members[0].chainId) return;
  state.focusDay = date;
  state.modal = {
    type: "chain",
    source: "day",
    chainId: members[0].chainId,
    date,
    workoutId: day.savedWorkoutId || null,
    instance,
    name: members[0].chainName || "",
    kind: members[0].chainKind || "Warm up",
    pick: "",
    members: members.map((it, index) => {
      const record = it.exerciseId ? null : exerciseRecord(it.name);
      const template = (state.chains || []).find((row) => row.id === members[0].chainId);
      const templateMembers = (template && template.members) || [];
      const exerciseId = it.exerciseId || (record && record.id) || null;
      const fromTemplate = templateMembers[index] && templateMembers[index].exercise_id === exerciseId
        ? templateMembers[index]
        : (templateMembers.find((row) => row.exercise_id === exerciseId) || {});
      return chainMemberDraft({
        exercise_id: exerciseId,
        name: it.name,
        sets: fromTemplate.sets,
        reps: fromTemplate.reps,
        notes: fromTemplate.notes
      });
    })
  };
  render();
}
function addChainMember() {
  const m = state.modal;
  if (!m || m.type !== "chain") return;
  const exerciseId = parseInt(m.pick, 10);
  const record = (state.serverExercises || []).find((row) => row.id === exerciseId);
  if (!record) { toast("Choose an exercise"); return; }
  m.members.push(chainMemberDraft({ exercise_id: record.id, name: record.name, exercise: record }));
  render();
}
function moveChainMember(index, dir) {
  const m = state.modal;
  if (!m || m.type !== "chain") return;
  const next = index + dir;
  if (next < 0 || next >= m.members.length) return;
  const row = m.members[index];
  m.members.splice(index, 1);
  m.members.splice(next, 0, row);
  render();
}
function removeChainMember(index) {
  const m = state.modal;
  if (!m || m.type !== "chain") return;
  m.members.splice(index, 1);
  render();
}
function chainEditorCommit() {
  const m = state.modal;
  if (!m || m.type !== "chain") return;
  const name = (m.name || "").trim();
  if (!name) { toast("Name the chain"); return; }
  if (!m.members.length) { toast("Add an exercise to the chain"); return; }
  if (m.members.some((mem) => !mem.exercise_id)) { toast("Each chain member needs a library exercise"); return; }
  if (["Warm up", "Circuit", "Cooldown"].indexOf(m.kind) < 0) { toast("Choose a warm-up, circuit, or cooldown"); return; }
  const draft = {
    chainId: m.chainId,
    name,
    kind: m.kind,
    members: m.members.map((mem) => chainMemberPayload(mem))
  };
  if (!m.chainId) {
    createChain(draft);
    return;
  }
  state.modal = {
    type: "chain-scope",
    source: m.source,
    date: m.date,
    workoutId: m.workoutId,
    instance: m.instance,
    draft
  };
  render();
}
async function createChain(draft) {
  try {
    const created = await api("POST", "/api/chains", {
      name: draft.name,
      kind: draft.kind,
      members: draft.members.map((mem) => chainMemberPayload(mem))
    });
    rememberChain(created);
    state.modal = null;
    toast("Chain saved");
    render();
  } catch (err) {
    toast(err.message || "Could not save that chain");
  }
}
function rewriteLocalChain(day, instance, draft) {
  const pool = day.items.filter((it) => it.chainInstance === instance);
  if (!pool.length) return;
  const used = {};
  const chain = { id: draft.chainId, name: draft.name, kind: draft.kind };
  const letter = chainBlockLetter(day, instance);
  const rebuilt = draft.members.map((mem, index) => {
    const existing = pool.find((it) => !used[it.id] && it.exerciseId === mem.exercise_id);
    if (existing) {
      used[existing.id] = true;
      existing.chainId = draft.chainId;
      existing.chainInstance = instance;
      existing.chainName = draft.name;
      existing.chainKind = draft.kind;
      existing.chainOrder = index;
      applyExplicitChainFields(existing, mem);
      return existing;
    }
    return chainMemberItem(chain, mem, index, instance, day, letter);
  });
  pool.forEach((it) => {
    if (used[it.id]) return;
    it.chainId = null;
    it.chainInstance = "";
    it.chainName = "";
    it.chainKind = "";
    it.chainOrder = 0;
    rebuilt.push(it);
  });
  const first = day.items.findIndex((it) => it.chainInstance === instance);
  let insertAt = 0;
  for (let i = 0; i < first; i += 1) {
    if (day.items[i].chainInstance !== instance) insertAt += 1;
  }
  const rest = day.items.filter((it) => it.chainInstance !== instance);
  rest.splice(insertAt, 0, ...rebuilt);
  day.items = rest;
}
async function reloadChainWorkouts(ids) {
  const want = {};
  (ids || []).forEach((id) => { want[id] = true; });
  const jobs = [];
  Object.keys(state.calendars || {}).forEach((athleteId) => {
    Object.keys(state.calendars[athleteId] || {}).forEach((date) => {
      const day = state.calendars[athleteId][date];
      if (!day || !day.savedWorkoutId || !want[day.savedWorkoutId]) return;
      jobs.push(api("GET", "/api/workouts/" + day.savedWorkoutId).then((workout) => {
        day.items = workoutToDayItems(workout);
        day.edited = false;
        day.hydrated = true;
        clearDraft(athleteId, date);
      }));
    });
  });
  await Promise.all(jobs);
}
async function applyChainScope(scope) {
  const m = state.modal;
  if (!m || m.type !== "chain-scope") return;
  const draft = m.draft;
  let workoutId = m.workoutId || null;
  if (m.source === "day" && m.date) {
    await publishDay(m.date, { quiet: true });
    const day = ensureDay(m.date);
    workoutId = day.savedWorkoutId || workoutId;
    if (!workoutId && scope === "one") {
      rewriteLocalChain(day, m.instance, draft);
      noteDayEdit(m.date);
      state.modal = null;
      toast("Updated this day");
      render();
      return;
    }
    if (!workoutId) {
      toast("Save the day before updating other workouts");
      return;
    }
  }
  try {
    const result = await api("POST", "/api/chains/" + draft.chainId + "/edit", {
      scope,
      source: m.source,
      workout_id: workoutId,
      name: draft.name,
      kind: draft.kind,
      members: draft.members.map((mem) => chainMemberPayload(mem))
    });
    if (result && result.chain) rememberChain(result.chain);
    await reloadChainWorkouts((result && result.updated_workout_ids) || []);
    state.modal = null;
    toast("Chain updated");
    render();
  } catch (err) {
    toast(err.message || "Could not update that chain");
  }
}
function rememberExercise(id, key, value) {
  const row = state.serverExercises.find((e) => e.id === id);
  if (row) row[key] = value;
}
function syncCatalogExercise(e, previousName) {
  const type = dayTypeForCategory(e.category);
  const previous = String(previousName || e.name || "").toLowerCase();
  const found = CATALOG.find((c) => c.name.toLowerCase() === previous)
    || CATALOG.find((c) => c.name.toLowerCase() === String(e.name || "").toLowerCase());
  if (found) {
    if (found.type === "lift" || found.type === "circuit" || found.type === "questionnaire" || found.type === "note") found.type = type;
    found.name = e.name;
  } else {
    CATALOG.push({ name: e.name, type });
  }
}
async function loadExercises() {
  try {
    const list = await api("GET", "/api/exercises");
    state.serverExercises = list;
    markHiddenExercises();
    list.forEach((e) => syncCatalogExercise(e));
    await loadChains();
    render();
  } catch (err) { console.error(err); }
}
function addExerciseRecord() {
  openNewLibraryExercise(null, (state.toolForm.exName || "").trim(), { libraryOnly: true });
}
async function saveExerciseName(id, previousName) {
  const row = state.serverExercises.find((e) => e.id === id);
  if (!row || !String(row.name || "").trim()) return false;
  const payload = {
    name: row.name.trim(),
    category: row.category || "Strength",
    video_url: row.video_url || "",
    default_notes: row.default_notes || "",
    default_sets: row.category === "Notes" ? 0 : Math.max(1, Math.min(10, parseInt(row.default_sets, 10) || 1)),
    default_reps: row.default_reps != null ? String(row.default_reps) : "10",
    default_load: row.default_load || "",
    default_rest: row.default_rest || "",
    default_rest_rep: row.default_rest_rep || "",
    default_distance: row.default_distance || "",
    default_tempo: row.default_tempo || "",
    default_velocity: row.default_velocity || "",
    default_power: row.default_power || "",
    default_pct: row.default_pct || "",
    intensity_kind: row.intensity_kind || "",
    intensity_value: row.intensity_value || "",
    default_stations: row.default_stations || "",
    completion_only: !!row.completion_only
  };
  try {
    const updated = await api("PUT", "/api/exercises/" + id, payload);
    Object.assign(row, updated);
    syncCatalogExercise(updated, previousName || updated.name);
    toast("Exercise saved");
    return true;
  } catch (err) {
    toast("Could not save exercise");
    console.error(err);
    return false;
  }
}
async function hideExercise(id) {
  const row = state.serverExercises.find((e) => e.id === id);
  if (row) row.hidden = true;
  if (state.hiddenExerciseIds.indexOf(id) < 0) state.hiddenExerciseIds.push(id);
  render();
  try {
    await api("POST", "/api/gym/hidden-exercises", { exercise_id: id });
  } catch (err) {
    if (row) row.hidden = false;
    state.hiddenExerciseIds = state.hiddenExerciseIds.filter((n) => n !== id);
    toast(err.message || "Could not hide that exercise");
    render();
  }
}

function dailyView() {
  const date = APP_TODAY;
  const rows = ATHLETES.map((a) => {
    const day = (state.calendars[a.id] || {})[date];
    const count = day ? (day.items || []).length : 0;
    return `<tr>
      <td><span class="ui-person">${uiAvatar(a.name)}<span class="who"><b>${esc(a.name)}</b><small>${esc(a.team_name || "")}</small></span></span></td>
      <td>${count ? `<span class="strong">${esc(day.title || "Workout")}</span>` : `<span class="muted">Rest or not programmed</span>`}</td>
      <td class="num">${count || "—"}</td>
      <td class="row-actions"><button class="btn btn-secondary btn-sm" type="button" onclick="state.entryAthlete='${a.id}';state.entryDate='${date}';goTool('entry')">Open entry</button></td>
    </tr>`;
  }).join("");
  return uiPage(`
    ${uiHead("Workout tools", "Daily brief", esc(fmtLong(date)) + ". What each athlete has on today.", "")}
    <section class="ui-card">${uiCardHead("Today", ATHLETES.length)}
      <div class="ui-table-wrap"><table class="ui-table"><thead><tr><th>Athlete</th><th>Workout</th><th class="num">Exercises</th><th></th></tr></thead>
      <tbody>${rows || `<tr><td colspan="4">${uiEmpty("No athletes yet", "Add athletes in Manage Users.")}</td></tr>`}</tbody></table></div>
    </section>`, "daily");
}
function weightroomView() {
  const date = APP_TODAY;
  const tiles = ATHLETES.map((a) => {
    const day = (state.calendars[a.id] || {})[date];
    const count = day ? (day.items || []).length : 0;
    return `<button type="button" class="ui-card ui-tile-btn" onclick="state.entryAthlete='${a.id}';state.entryDate='${date}';goTool('entry')">
      ${uiAvatar(a.name, "lg")}
      <span class="who"><b>${esc(a.name)}</b><small>${count ? esc(day.title || "Workout") + " · " + count + " exercises" : "Nothing programmed today"}</small></span>
    </button>`;
  }).join("");
  return uiPage(`
    ${uiHead("Workout tools", "Weightroom", "Tap an athlete to open today's workout and log sets.", "")}
    ${tiles ? `<div class="ui-tiles">${tiles}</div>` : `<section class="ui-card">${uiEmpty("No athletes yet", "Add athletes in Manage Users.")}</section>`}`, "weightroom");
}
function boardView() {
  if (!state.boardDate) state.boardDate = state.entryDate || APP_TODAY;
  let name = "";
  let items = [];
  let picker = "";
  if (state.role === "athlete") {
    name = viewedAthleteName();
    const day = savedDay(state.boardDate);
    items = day && day.items ? day.items : [];
  } else {
    const targets = buildAthletes().filter((t) => t.id !== "none");
    if (!state.boardAthlete || !targets.some((a) => a.id === state.boardAthlete)) {
      state.boardAthlete = targets.some((a) => a.id === state.athleteId) ? state.athleteId : (targets[0] ? targets[0].id : "");
      if (state.boardAthlete) loadCalendarSchedule(state.boardAthlete);
    }
    const person = targets.find((a) => a.id === state.boardAthlete) || { id: "", name: "Athlete" };
    name = person.name;
    const day = (state.calendars[person.id] || {})[state.boardDate];
    items = day && day.items ? day.items : [];
    picker = `<select class="select auto" aria-label="Athlete" onchange="state.boardAthlete=this.value;loadCalendarSchedule(this.value);render()">
        ${targets.map((a) => `<option value="${esc(a.id)}" ${a.id === person.id ? "selected" : ""}>${esc(a.name)}</option>`).join("") || `<option value="">No athletes or groups</option>`}
      </select>`;
  }
  const rows = items.map((it) => `<div class="ui-board-row"><span class="letter" style="background:${LETTER_COLOR[it.letter] || "#d1d5db"}">${esc(it.letter || "")}</span><b>${esc(it.name)}</b><span>${esc(scriptLine(it))}</span></div>`).join("");
  return uiPage(`
    ${uiHead("", "Whiteboard", esc(fmtLong(state.boardDate)) + " · " + esc(name), `${picker}<input class="input auto" type="date" aria-label="Day" value="${esc(state.boardDate)}" onchange="if(this.value){state.boardDate=this.value;render()}">`)}
    <section class="ui-card ui-board">${rows || uiEmpty("Nothing programmed", "Pick another day or athlete.")}</section>`, "whiteboard");
}
function maxesKey() {
  return state.role === "athlete" ? ("own:" + ownAthleteId()) : state.athleteId;
}
function addPr() {
  openEdit({
    title: "Add Personal Record",
    fields: [
      { key: "name", label: "Lift name", value: "" },
      { key: "kg", label: "Weight (kg)", value: "" }
    ],
    onSave: async (values) => {
      state.toolForm.goalName = (values.name || "").trim();
      state.toolForm.goalWeight = (values.kg || "").trim();
      state.modal = null;
      await addGoalRecord();
    }
  });
}
function editPr(index) {
  const rec = (state.serverRecords || [])[index];
  if (rec) {
    editGoal(rec.id);
  }
}
function boardLeader() {
  const dbRows = (state.gymActivity && state.gymActivity.leaderboard) || [];
  let rows = dbRows.map((r) => ({ name: r.name, team: r.team_name || "", tonnage: r.tonnage || 0, sessions: r.completed_sessions || 0, sets: r.completed_sets || 0, prs: r.pr_count || 0 }));
  if (!rows.length) {
    // Offline fallback: count what was logged in this browser.
    rows = ATHLETES.map((a) => {
      let t = 0;
      Object.entries(state.logs).forEach(([k, log]) => {
        if (!k.startsWith(a.id + ":")) return;
        Object.values(log.cells || {}).forEach((c) => { if (c.done) t += (+c.r || 0) * (+c.w || 0); });
      });
      return { name: a.name, team: a.team_name || "", tonnage: t, sessions: 0, sets: 0, prs: 0 };
    });
  }
  rows.sort((a, b) => b.tonnage - a.tonnage);
  const body = rows.map((r, i) => `<tr>
      <td class="num" style="width:48px">${i < 3 && r.tonnage ? `<span class="ui-rank r${i + 1}">${i + 1}</span>` : i + 1}</td>
      <td><span class="ui-person">${uiAvatar(r.name)}<span class="who"><b>${esc(r.name)}</b><small>${esc(r.team)}</small></span></span></td>
      <td class="num strong">${Math.round(r.tonnage).toLocaleString()}</td>
      <td class="num hide-sm">${r.sessions}</td>
      <td class="num hide-sm">${r.sets}</td>
      <td class="num hide-sm">${r.prs}</td>
    </tr>`).join("");
  return uiPage(`
    ${uiHead("Workout tools", "Leaderboard", "Total weight moved (weight × reps) across logged sets.", "")}
    <section class="ui-card">${uiCardHead("Athletes", rows.length)}
      <div class="ui-table-wrap"><table class="ui-table"><thead><tr><th class="num">#</th><th>Athlete</th><th class="num">Tonnage (kg)</th><th class="num hide-sm">Sessions</th><th class="num hide-sm">Sets</th><th class="num hide-sm">Goals</th></tr></thead>
      <tbody>${body || `<tr><td colspan="6">${uiEmpty("No logged sessions yet", "Tonnage adds up as athletes log sets.")}</td></tr>`}</tbody></table></div>
    </section>`, "leaderboard");
}
function evalView() {
  const add = `<button class="btn btn-primary" type="button" onclick="addEvaluation()">New evaluation</button>`;
  return uiPage(`
    ${uiHead("Coach tools", "Evaluations", "Notes from testing days and athlete reviews.", add)}
    ${state.evals.length
      ? `<div class="ui-tiles">${state.evals.map((e) => `<article class="ui-card ui-card-body"><p class="ui-prose" style="margin:0">${esc(e.text || e)}</p></article>`).join("")}</div>`
      : `<section class="ui-card">${uiEmpty("No evaluations yet", "Record test results or a review.", add)}</section>`}`, "evaluations", true);
}
function addEvaluation() {
  openEdit({
    title: "New evaluation",
    fields: [{ key: "text", label: "Evaluation", value: "", multiline: true }],
    onSave: async (values) => {
      const note = (values.text || "").trim();
      if (!note) { toast("Write the evaluation"); return; }
      try {
        const row = await createSaved("evaluation", { text: note });
        state.evals.push({ id: row.id, text: note });
        state.modal = null;
        render();
      } catch (err) {
        toast(err.message || "Could not save that evaluation");
      }
    }
  });
}
function programmedDayCount(target) {
  const saved = Object.values(state.calendars[target.id] || {}).filter((day) => day && day.savedWorkoutId).length;
  if (state.calendarLoaded[target.id]) return saved;
  if (!target.isGroup && target.serverId) {
    return ((state.gymContext && state.gymContext.workouts) || []).filter((workout) => !workout.is_template && workout.scheduled_date && (workout.assigned_athlete_ids || []).indexOf(target.serverId) >= 0).length;
  }
  return saved;
}
function calendarsView() {
  const targets = buildAthletes().filter((t) => t.id !== "none");
  targets.forEach((target) => {
    if (!state.calendarLoaded[target.id] && !state.calendarLoading[target.id]) loadCalendarSchedule(target.id);
  });
  const body = targets.map((a) => `<tr>
      <td><span class="ui-person">${uiAvatar(a.name)}<span class="who"><b>${esc(a.name)}</b>${a.email ? `<small>${esc(a.email)}</small>` : ""}</span></span></td>
      <td>${a.isGroup ? `<span class="ui-badge blue">Group</span>` : `<span class="ui-badge">Athlete</span>`}</td>
      <td class="num">${programmedDayCount(a)}</td>
      <td class="row-actions">${!a.isGroup ? `<button class="btn btn-ghost btn-sm" type="button" onclick="editCalendar('${a.id}')">Rename</button>` : ""}<button class="btn btn-secondary btn-sm" type="button" onclick="switchAthlete('${esc(a.id)}');state.view='build';render()">Open calendar</button></td>
    </tr>`).join("");
  return uiPage(`
    ${uiHead("Coach tools", "Calendars", "Every athlete and group calendar you program.", "")}
    <section class="ui-card"><form class="ui-card-body ui-form-row" onsubmit="addCalendar(); return false;">
      ${uiField("Athlete name", `<input class="input" placeholder="e.g. Sam Lee" data-focus="cal-name" value="${esc(state.toolForm.calName || "")}" oninput="state.toolForm.calName=this.value">`)}
      ${uiField("Email (optional)", `<input class="input" type="email" data-focus="cal-email" value="${esc(state.toolForm.calEmail || "")}" oninput="state.toolForm.calEmail=this.value">`)}
      <button class="btn btn-primary" type="submit">Add athlete calendar</button>
    </form></section>
    <section class="ui-card">${uiCardHead("Calendars", targets.length)}
      <div class="ui-table-wrap"><table class="ui-table"><thead><tr><th>Name</th><th>Type</th><th class="num">Programmed days</th><th></th></tr></thead>
      <tbody>${body || `<tr><td colspan="4">${uiEmpty("No calendars yet", "Create a group or upload athletes in Manage Users.")}</td></tr>`}</tbody></table></div>
    </section>`, "calendars");
}
async function addCalendar() {
  const name = (state.toolForm.calName || "").trim();
  const email = (state.toolForm.calEmail || "").trim();
  if (!name) { toast("Name the athlete"); return; }
  const teams = ledTeams(state.gymContext);
  if (teams.length && state.auth && state.auth.token) {
    try {
      await api("POST", "/api/gym/athletes/bulk", {
        team_id: teams[0].id,
        athletes: [{ name, email: email || null }]
      });
      await loadGymContext();
      state.toolForm.calName = "";
      state.toolForm.calEmail = "";
      toast("Athlete & calendar created");
      render();
      return;
    } catch (err) {
      toast(err.message || "Could not add athlete calendar");
      return;
    }
  }
  const fallbackEmail = email || (name.toLowerCase().replace(/[^a-z0-9]+/g, "") + "@wourkout.app");
  if (ATHLETES.some((a) => a.email === fallbackEmail)) { toast("That email already has a calendar"); return; }
  const id = "cal" + uid();
  ATHLETES.push({ id, name, email: fallbackEmail });
  state.calendars[id] = {};
  state.athletes.push({ id, first: name.split(" ")[0], last: name.split(" ").slice(1).join(" "), email: fallbackEmail, activity: "N/A", groups: "—", cals: "1" });
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
async function renameCalendar(id, name) {
  const next = (name || "").trim();
  if (!next) return;
  const person = ATHLETES.find((a) => a.id === id);
  if (person) {
    person.name = next;
    if (person.serverId) {
      try { await api("PUT", "/api/users/" + person.serverId, { name: next, email: person.email }); }
      catch (e) { console.warn(e); }
    }
  }
  const row = state.athletes.find((a) => a.id === id);
  if (row) { row.first = next.split(" ")[0]; row.last = next.split(" ").slice(1).join(" "); }
  toast("Calendar renamed");
  render();
}
function goalUnit(userId) {
  const person = ATHLETES.find((a) => a.serverId === userId);
  if (person) return normalizeUnit(person.load_unit);
  const me = state.auth && state.auth.user;
  return normalizeUnit(me && me.id === userId ? me.load_unit : "kg");
}
function fmtLoad(value) {
  const num = Number(value);
  if (Number.isNaN(num)) return String(value || "");
  return String(Math.round(num * 10) / 10);
}
// One row per athlete and lift: the best logged set, plus the goal if one is set.
function prGoalRows() {
  const rows = new Map();
  (state.personalBests || []).forEach((pb) => {
    rows.set(pb.user_id + ":" + pb.exercise_id, {
      userId: pb.user_id, userName: pb.user_name, exerciseId: pb.exercise_id, lift: pb.exercise_name,
      best: pb, goal: null, unit: normalizeUnit(pb.load_unit)
    });
  });
  (state.serverRecords || []).forEach((r) => {
    const key = r.user_id + ":" + r.exercise_id;
    const row = rows.get(key) || {
      userId: r.user_id, userName: (r.user && r.user.name) || "Team", exerciseId: r.exercise_id,
      lift: (r.exercise && r.exercise.name) || "Lift", best: null, goal: null, unit: goalUnit(r.user_id)
    };
    if (!row.goal || r.weight > row.goal.weight) row.goal = r;
    rows.set(key, row);
  });
  return Array.from(rows.values()).sort((a, b) => (a.userName || "").localeCompare(b.userName || "") || a.lift.localeCompare(b.lift));
}
function goalsView() {
  const isCoach = state.role === "coach" || state.role === "admin";
  const filtered = isCoach && state.selectedGoalAthlete && state.selectedGoalAthlete !== "all";
  const showAthlete = isCoach && !filtered;
  const q = (state.goalQ || "").trim().toLowerCase();
  const all = prGoalRows();
  const rows = all.filter((r) => !q || r.lift.toLowerCase().includes(q) || String(r.userName || "").toLowerCase().includes(q));
  const monthAgo = addDays(APP_TODAY, -30);
  const prCount = all.filter((r) => r.best).length;
  const recent = all.filter((r) => r.best && r.best.date && r.best.date >= monthAgo).length;
  const goals = all.filter((r) => r.goal);
  const hit = goals.filter((r) => r.best && r.best.weight >= r.goal.weight).length;
  const who = filtered ? ((ATHLETES.find((a) => a.id === state.selectedGoalAthlete) || {}).name || "this athlete") : (isCoach ? "your athletes" : "you");
  const body = rows.map((r) => {
    const best = r.best
      ? `<span class="strong">${fmtLoad(r.best.weight)} ${esc(r.unit)}</span>${r.best.reps ? ` <span class="muted">× ${fmtLoad(r.best.reps)}</span>` : ""}`
      : `<span class="muted">Not logged yet</span>`;
    const goal = r.goal ? `${fmtLoad(r.goal.weight)} ${esc(r.unit)}` : `<span class="muted">—</span>`;
    let progress = "";
    if (r.goal && r.goal.weight > 0) {
      const pct = r.best ? Math.min(100, Math.round(r.best.weight / r.goal.weight * 100)) : 0;
      progress = pct >= 100
        ? `<span class="ui-badge green">✓ Goal hit</span>`
        : `<span class="ui-inline" style="flex-wrap:nowrap"><span class="ui-progress" style="flex:1"><span style="width:${pct}%"></span></span><span class="muted" style="font-size:12px">${pct}%</span></span>`;
    }
    const actions = r.goal
      ? `<button class="btn btn-ghost btn-sm" type="button" onclick="editGoal(${r.goal.id})">Edit goal</button><button class="btn btn-ghost btn-sm btn-danger" type="button" onclick="deleteGoalRecord(${r.goal.id})">Remove</button>`
      : `<button class="btn btn-ghost btn-sm" type="button" onclick="startGoal(${esc(JSON.stringify(r.lift))}, ${r.userId || 0})">Set goal</button>`;
    return `<tr>
      <td class="strong">${esc(r.lift)}</td>
      ${showAthlete ? `<td><span class="ui-person">${uiAvatar(r.userName)}<span class="who"><b>${esc(r.userName || "Team")}</b></span></span></td>` : ""}
      <td>${best}</td>
      <td class="muted hide-sm">${r.best && r.best.date ? esc(fmtShortDate(r.best.date)) : ""}</td>
      <td>${goal}</td>
      <td style="min-width:140px">${progress}</td>
      <td class="row-actions">${actions}</td>
    </tr>`;
  }).join("");
  const cols = showAthlete ? 7 : 6;
  const athleteOptions = ATHLETES.map((a) => `<option value="${a.id}" ${state.toolForm.goalAthlete === a.id ? "selected" : ""}>${esc(a.name)}</option>`).join("");
  const liftOptions = (state.serverExercises || []).filter((e) => !e.hidden).map((e) => `<option value="${esc(e.name)}"></option>`).join("");
  return `<section class="stage ui-page" id="goals"><div class="ui-wrap">
    ${uiHead(isCoach ? "Coach tools" : "", "Goals & PRs", `Personal records come from the sets ${isCoach ? "athletes log" : "you log"}. Set a goal next to any lift to track progress toward it.`,
      isCoach ? `<select class="select auto" aria-label="Filter athlete" onchange="filterGoalsAthlete(this.value)">
          <option value="all" ${!filtered ? "selected" : ""}>All athletes</option>
          ${ATHLETES.map((a) => `<option value="${a.id}" ${state.selectedGoalAthlete === a.id ? "selected" : ""}>${esc(a.name)}</option>`).join("")}
        </select>` : "")}
    <div class="ui-stats">
      <div class="ui-stat"><div class="label">Lifts with a PR</div><div class="value">${prCount}</div><div class="note">For ${esc(who)}</div></div>
      <div class="ui-stat"><div class="label">New in the last 30 days</div><div class="value">${recent}</div><div class="note">Best set logged recently</div></div>
      <div class="ui-stat"><div class="label">Goals set</div><div class="value">${goals.length}</div><div class="note">Target weights</div></div>
      <div class="ui-stat"><div class="label">Goals hit</div><div class="value">${hit}</div><div class="note">${goals.length ? Math.round(hit / goals.length * 100) + "% of goals" : "No goals yet"}</div></div>
    </div>
    <section class="ui-card">
      <div class="ui-card-head"><div><h2 class="ui-card-title">Set a goal</h2><p class="ui-card-sub">A target weight for one lift. Progress fills in from logged sets.</p></div></div>
      <form class="ui-card-body goal-form" onsubmit="addGoalRecord(); return false;">
        <label class="ui-field"><span class="ui-label">Lift</span>
          <input class="input" list="goal-lifts" placeholder="e.g. Back Squat" data-focus="goal-name" value="${esc(state.toolForm.goalName || "")}" oninput="state.toolForm.goalName=this.value">
          <datalist id="goal-lifts">${liftOptions}</datalist></label>
        <label class="ui-field"><span class="ui-label">Target weight</span>
          <input class="input" type="number" min="0" step="0.5" inputmode="decimal" placeholder="e.g. 180" data-focus="goal-kg" value="${esc(state.toolForm.goalWeight || "")}" oninput="state.toolForm.goalWeight=this.value"></label>
        ${isCoach ? `<label class="ui-field"><span class="ui-label">Athlete</span>
          <select class="select" onchange="state.toolForm.goalAthlete=this.value">
            <option value="">${filtered ? "Filtered athlete" : "Myself"}</option>
            ${athleteOptions}
          </select></label>` : ""}
        <button class="btn btn-primary" type="submit">Save goal</button>
      </form>
    </section>
    <section class="ui-card">
      <div class="ui-card-head">
        <h2 class="ui-card-title">Personal records <span class="count">${rows.length}</span></h2>
        <div class="ui-search" style="max-width:280px"><input class="input" placeholder="Search lifts${showAthlete ? " or athletes" : ""}" aria-label="Search records" data-focus="goal-q" value="${esc(state.goalQ || "")}" oninput="state.goalQ=this.value;render()"></div>
      </div>
      <div class="ui-table-wrap"><table class="ui-table nowrap">
        <thead><tr><th>Lift</th>${showAthlete ? "<th>Athlete</th>" : ""}<th>Best set</th><th class="hide-sm">Date</th><th>Goal</th><th>Progress</th><th></th></tr></thead>
        <tbody>${body || `<tr><td colspan="${cols}"><div class="ui-empty"><b>${all.length ? "No matches" : "No records yet"}</b>${all.length ? "Try a different search." : "PRs appear here once weights are logged in Workout Entry."}</div></td></tr>`}</tbody>
      </table></div>
    </section>
  </div></section>`;
}
function fmtShortDate(iso) {
  const d = new Date(String(iso).slice(0, 10) + "T12:00:00");
  if (Number.isNaN(d.getTime())) return String(iso);
  const sameYear = String(iso).slice(0, 4) === String(APP_TODAY).slice(0, 4);
  return d.toLocaleDateString("en-US", sameYear ? { month: "short", day: "numeric" } : { month: "short", day: "numeric", year: "numeric" });
}
function startGoal(lift, userId) {
  state.toolForm.goalName = lift;
  state.toolForm.goalWeight = "";
  const person = ATHLETES.find((a) => a.serverId === userId);
  state.toolForm.goalAthlete = person ? person.id : "";
  state.pendingFocus = "goal-kg";
  render();
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
  if (!state.serverExercises.length) loadExercises();
  try {
    let query = "";
    if (userId) {
      query = "?user_id=" + userId;
    } else if (state.role === "athlete" && state.serverUserId) {
      query = "?user_id=" + state.serverUserId;
    }
    const [records, bests] = await Promise.all([
      api("GET", "/api/records" + query),
      api("GET", "/api/personal-bests" + query).catch(() => [])
    ]);
    state.serverRecords = records;
    state.personalBests = bests;
    state.entryBestsFor = null;
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
    } else if (state.auth && state.auth.user) {
      targetUserId = state.auth.user.id;
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
  const body = state.docs.map((d, i) => `<tr>
      <td class="strong">${esc(d.name)}</td>
      <td class="muted hide-sm" style="max-width:360px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(d.url)}</td>
      <td class="row-actions"><a class="btn btn-secondary btn-sm" href="${esc(d.url)}" target="_blank" rel="noopener">Open</a><button class="btn btn-ghost btn-sm" type="button" onclick="editDoc(${i})">Edit</button><button class="btn btn-ghost btn-sm btn-danger" type="button" onclick="removeSaved('docs', ${i})">Remove</button></td>
    </tr>`).join("");
  return uiPage(`
    ${uiHead("Coach tools", "Documents & links", "Programs, forms and videos your gym shares.", "")}
    <section class="ui-card"><form class="ui-card-body ui-form-row" onsubmit="addDoc(); return false;">
      ${uiField("Name", `<input class="input" placeholder="e.g. Warm-up guide" data-focus="doc-name" value="${esc(state.toolForm.docName || "")}" oninput="state.toolForm.docName=this.value">`)}
      ${uiField("URL", `<input class="input" type="url" placeholder="https://" data-focus="doc-url" value="${esc(state.toolForm.docUrl || "")}" oninput="state.toolForm.docUrl=this.value">`)}
      <button class="btn btn-primary" type="submit">Add link</button>
    </form></section>
    <section class="ui-card">${uiCardHead("Links", state.docs.length)}
      <div class="ui-table-wrap"><table class="ui-table"><thead><tr><th>Name</th><th class="hide-sm">URL</th><th></th></tr></thead>
      <tbody>${body || `<tr><td colspan="3">${uiEmpty("No links yet", "Add one above.")}</td></tr>`}</tbody></table></div>
    </section>`, "documents");
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
    onSave: async (values) => {
      const name = (values.name || "").trim();
      if (!name) { toast("Name the document"); return; }
      const url = (values.url || "").trim() || "#";
      try {
        if (doc.id) await updateSaved(doc.id, { name, url });
        doc.name = name;
        doc.url = url;
        state.modal = null;
        toast("Document saved");
      } catch (err) {
        toast(err.message || "Could not save that document");
      }
    }
  });
}
async function addDoc() {
  const name = (state.toolForm.docName || "").trim();
  const url = (state.toolForm.docUrl || "").trim() || "#";
  if (!name) { toast("Name the document"); return; }
  try {
    const row = await createSaved("document", { name, url });
    state.docs.push({ id: row.id, name, url });
    state.toolForm.docName = "";
    state.toolForm.docUrl = "";
    toast("Document saved");
  } catch (err) {
    toast(err.message || "Could not save that document");
  }
  render();
}
function packetsView() {
  const body = state.packets.map((p, i) => `<tr>
      <td class="strong">${esc(p.name || p)}</td>
      <td class="row-actions"><button class="btn btn-ghost btn-sm" type="button" onclick="editPacket(${i})">Rename</button><button class="btn btn-ghost btn-sm btn-danger" type="button" onclick="removeSaved('packets', ${i})">Remove</button></td>
    </tr>`).join("");
  return uiPage(`
    ${uiHead("Coach tools", "Packets & sheets", "Printable packets you hand out.", "")}
    <section class="ui-card"><form class="ui-card-body ui-form-row" onsubmit="addPacket(); return false;">
      ${uiField("Packet name", `<input class="input" placeholder="e.g. Summer off-season" data-focus="packet-name" value="${esc(state.toolForm.packet || "")}" oninput="state.toolForm.packet=this.value">`)}
      <button class="btn btn-primary" type="submit">Add packet</button>
    </form></section>
    <section class="ui-card">${uiCardHead("Packets", state.packets.length)}
      <div class="ui-table-wrap"><table class="ui-table"><thead><tr><th>Name</th><th></th></tr></thead>
      <tbody>${body || `<tr><td colspan="2">${uiEmpty("No packets yet", "Add one above.")}</td></tr>`}</tbody></table></div>
    </section>`, "packets", true);
}
function editPacket(index) {
  openEdit({
    title: "Edit packet",
    fields: [{ key: "name", label: "Packet name", value: (state.packets[index] && state.packets[index].name) || "" }],
    onSave: async (values) => {
      const name = (values.name || "").trim();
      if (!name) { toast("Name the packet"); return; }
      const packet = state.packets[index];
      try {
        if (packet && packet.id) await updateSaved(packet.id, { name });
        if (packet) packet.name = name;
        state.modal = null;
        toast("Packet saved");
      } catch (err) {
        toast(err.message || "Could not save that packet");
      }
    }
  });
}
async function addPacket() {
  const name = (state.toolForm.packet || "").trim();
  if (!name) { toast("Name the packet"); return; }
  try {
    const row = await createSaved("packet", { name });
    state.packets.push({ id: row.id, name });
    state.toolForm.packet = "";
    toast("Packet saved");
  } catch (err) {
    toast(err.message || "Could not save that packet");
  }
  render();
}
function markAllPresent() {
  ATHLETES.forEach((a) => { state.attendance[state.entryDate + ":" + a.id] = true; });
  toast("Marked everyone present");
  render();
}
function attendanceView() {
  const date = state.entryDate;
  const comp = state.compliance && state.compliance.date === date ? state.compliance : null;
  const compItems = (comp && comp.items) || [];
  let present = 0;
  const body = ATHLETES.map((a) => {
    const key = date + ":" + a.id;
    const cItem = compItems.find((ci) => ci.user && ci.user.id === a.serverId);
    const day = (state.calendars[a.id] || {})[date];
    const title = cItem && cItem.workout_title
      ? cItem.workout_title
      : (day && ((day.title || "").trim() || (day.items || []).length) ? (day.title || "Workout") + " · " + (day.items || []).length + " exercises" : "");
    const status = cItem && cItem.status;
    const checked = state.attendance[key] != null ? state.attendance[key] : (cItem && cItem.status === "completed");
    if (checked) present += 1;
    const note = state.attendance[key + ":note"];
    return `<tr>
      <td style="width:44px"><span class="ui-check"><input type="checkbox" aria-label="${esc(a.name)} present" ${checked ? "checked" : ""} onchange="toggleAttendance('${date}', '${a.id}', ${a.serverId || 0}, ${cItem && cItem.workout_id ? cItem.workout_id : 0}, this.checked)"></span></td>
      <td><span class="ui-person">${uiAvatar(a.name)}<span class="who"><b>${esc(a.name)}</b>${note ? `<small>${esc(note)}</small>` : ""}</span></span></td>
      <td class="hide-sm">${title ? esc(title) : `<span class="muted">No workout</span>`}</td>
      <td>${status === "completed" ? `<span class="ui-badge green">Completed</span>` : status ? `<span class="ui-badge amber">${esc(status.replace(/_/g, " "))}</span>` : ""}</td>
      <td class="row-actions"><button class="btn btn-ghost btn-sm" type="button" onclick="editAttendance('${a.id}')">${note ? "Edit note" : "Add note"}</button></td>
    </tr>`;
  }).join("");
  return uiPage(`
    ${uiHead("Coach tools", "Attendance", "Mark who is here. Each athlete's workout for the day is listed beside them.",
      `<input class="input auto" type="date" aria-label="Day" value="${date}" onchange="state.entryDate=this.value;loadCompliance()"><button class="btn btn-secondary" type="button" onclick="markAllPresent()">Mark everyone present</button>`)}
    <div class="ui-stats">
      <div class="ui-stat"><div class="label">Present</div><div class="value">${present}</div><div class="note">of ${ATHLETES.length} athletes</div></div>
      <div class="ui-stat"><div class="label">Completed workout</div><div class="value">${comp ? comp.completed_count : "—"}</div></div>
      <div class="ui-stat"><div class="label">Not started</div><div class="value">${comp ? comp.not_started_count : "—"}</div></div>
      <div class="ui-stat"><div class="label">Day</div><div class="value" style="font-size:20px">${esc(fmtShortDate(date))}</div></div>
    </div>
    <section class="ui-card">${uiCardHead("Athletes", ATHLETES.length)}
      <div class="ui-table-wrap"><table class="ui-table"><thead><tr><th>Here</th><th>Athlete</th><th class="hide-sm">Workout</th><th>Status</th><th></th></tr></thead>
      <tbody>${body || `<tr><td colspan="5">${uiEmpty("No athletes yet", "Add athletes in Manage Users.")}</td></tr>`}</tbody></table></div>
    </section>`, "attendance");
}
async function toggleAttendance(date, localId, serverId, workoutId, isPresent) {
  const key = date + ":" + localId;
  state.attendance[key] = isPresent;
  render();
  if (isPresent && serverId && workoutId) {
    try {
      await api("POST", "/api/coach/remediate/mark-present", { user_id: serverId, workout_id: workoutId, date });
      await loadCompliance();
      toast("Marked present & completed");
    } catch (e) {
      console.warn(e);
    }
  }
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
  const seen = new Set();
  buildAthletes().forEach((a) => {
    if (a.id === "none") return;
    Object.keys(state.calendars[a.id] || {}).sort().forEach((date) => {
      const day = state.calendars[a.id][date];
      if (!(day.items || []).length && !(day.title || "").trim()) return;
      const k = a.id + ":" + date;
      seen.add(k);
      rows.push({ athlete: a.name, athleteId: a.id, date, title: day.title || "Workout", count: (day.items || []).length });
    });
  });
  const ctxWorkouts = (state.gymContext && state.gymContext.workouts) || [];
  ctxWorkouts.forEach((w) => {
    if (w.is_template || !w.scheduled_date) return;
    if (!rows.some((r) => r.date === w.scheduled_date && r.title === w.title)) {
      rows.push({
        athlete: w.program_name ? w.program_name.replace(/^wourkout\s+/i, "") : "Gym",
        athleteId: state.athleteId || "",
        date: w.scheduled_date,
        title: w.title || "Workout",
        count: w.exercise_count || 0
      });
    }
  });
  return rows;
}
function reportingView() {
  const rows = programmedRows();
  const kpis = (state.gymActivity && state.gymActivity.kpis) || {};
  const progDays = kpis.programmed_days != null ? Math.max(kpis.programmed_days, rows.length) : rows.length;
  const exCount = kpis.total_exercises != null ? Math.max(kpis.total_exercises, rows.reduce((n, r) => n + r.count, 0)) : rows.reduce((n, r) => n + r.count, 0);
  const athCount = kpis.total_athletes != null ? kpis.total_athletes : state.athletes.length;
  const done = kpis.completed_sessions != null ? kpis.completed_sessions : "—";
  const body = rows.slice(0, 40).map((r) => `<tr>
      <td class="muted">${esc(fmtShortDate(r.date))}</td>
      <td class="strong">${esc(r.athlete)}</td>
      <td>${esc(r.title)}</td>
      <td class="num">${r.count}</td>
      <td class="row-actions"><button class="btn btn-ghost btn-sm" type="button" onclick="openReportDay('${esc(r.athleteId)}','${esc(r.date)}')">Open</button></td>
    </tr>`).join("");
  const notes = state.reports.map((r, i) => `<div class="ui-list-row"><span class="ui-prose" style="margin:0">${esc(r.text)}</span><span class="ui-inline" style="flex-wrap:nowrap"><button class="btn btn-ghost btn-sm" type="button" onclick="editReport(${i})">Edit</button><button class="btn btn-ghost btn-sm btn-danger" type="button" onclick="removeSaved('reports', ${i})">Remove</button></span></div>`).join("");
  return uiPage(`
    ${uiHead("Coach tools", "Reporting", "What has been programmed and logged across your athletes.", "")}
    <div class="ui-stats">
      <div class="ui-stat"><div class="label">Programmed days</div><div class="value">${progDays}</div></div>
      <div class="ui-stat"><div class="label">Exercises programmed</div><div class="value">${exCount}</div></div>
      <div class="ui-stat"><div class="label">Athletes</div><div class="value">${athCount}</div></div>
      <div class="ui-stat"><div class="label">Sessions logged</div><div class="value">${done}</div></div>
    </div>
    <div class="ui-grid side">
      <section class="ui-card">${uiCardHead("Programmed workouts", rows.length, rows.length > 40 ? "Showing the latest 40." : "")}
        <div class="ui-table-wrap"><table class="ui-table"><thead><tr><th>Date</th><th>Calendar</th><th>Workout</th><th class="num">Exercises</th><th></th></tr></thead>
        <tbody>${body || `<tr><td colspan="5">${uiEmpty("Nothing programmed yet", "Build a workout on a calendar.")}</td></tr>`}</tbody></table></div>
      </section>
      <section class="ui-card">${uiCardHead("Notes", state.reports.length)}
        <form class="ui-card-body ui-form" onsubmit="addReport(); return false;">
          ${uiField("New note", `<textarea class="textarea" style="min-height:72px" placeholder="What stood out this week?" data-focus="report-note" oninput="state.toolForm.report=this.value">${esc(state.toolForm.report || "")}</textarea>`)}
          <div><button class="btn btn-primary" type="submit">Add note</button></div>
          ${notes ? `<div>${notes}</div>` : ""}
        </form>
      </section>
    </div>`, "reporting");
}
function editReport(index) {
  const report = state.reports[index];
  if (!report) return;
  openEdit({
    title: "Edit note",
    fields: [{ key: "text", label: "Note", value: report.text || "", multiline: true }],
    onSave: async (values) => {
      const text = (values.text || "").trim();
      if (!text) { toast("Write a note"); return; }
      try {
        if (report.id) await updateSaved(report.id, { text });
        report.text = text;
        state.modal = null;
        toast("Note saved");
      } catch (err) {
        toast(err.message || "Could not save that note");
      }
    }
  });
}
async function addReport() {
  const text = (state.toolForm.report || "").trim();
  if (!text) { toast("Write a note"); return; }
  try {
    const row = await createSaved("report", { text });
    state.reports.push({ id: row.id, text });
    state.toolForm.report = "";
    toast("Report note saved");
  } catch (err) {
    toast(err.message || "Could not save that note");
  }
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
  const body = state.invoices.map((inv, i) => `<tr>
      <td><span class="ui-person">${uiAvatar(inv.who || "Athlete")}<span class="who"><b>${esc(inv.who || "Athlete")}</b></span></span></td>
      <td class="num strong">${esc(inv.amount || "")}</td>
      <td class="muted">${esc(inv.note || "")}</td>
      <td class="row-actions"><button class="btn btn-ghost btn-sm" type="button" onclick="editInvoice(${i})">Edit</button><button class="btn btn-ghost btn-sm btn-danger" type="button" onclick="removeSaved('invoices', ${i})">Remove</button></td>
    </tr>`).join("");
  return uiPage(`
    ${uiHead("Coach tools", "Payments", "Invoices you have recorded for athletes.", "")}
    <section class="ui-card"><form class="ui-card-body ui-form-row" onsubmit="addInvoice(); return false;">
      ${uiField("Athlete", `<select class="select" onchange="state.toolForm.payWho=this.value">${ATHLETES.map((a) => `<option ${state.toolForm.payWho === a.name ? "selected" : ""}>${esc(a.name)}</option>`).join("")}</select>`)}
      ${uiField("Amount", `<input class="input" inputmode="decimal" placeholder="e.g. 120" data-focus="pay-amount" value="${esc(state.toolForm.payAmount || "")}" oninput="state.toolForm.payAmount=this.value">`)}
      ${uiField("Note", `<input class="input" placeholder="e.g. October training" data-focus="pay-note" value="${esc(state.toolForm.payNote || "")}" oninput="state.toolForm.payNote=this.value">`)}
      <button class="btn btn-primary" type="submit">Add invoice</button>
    </form></section>
    <section class="ui-card">${uiCardHead("Invoices", state.invoices.length)}
      <div class="ui-table-wrap"><table class="ui-table"><thead><tr><th>Athlete</th><th class="num">Amount</th><th>Note</th><th></th></tr></thead>
      <tbody>${body || `<tr><td colspan="4">${uiEmpty("No invoices yet", "Add one above.")}</td></tr>`}</tbody></table></div>
    </section>`, "payments");
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
    onSave: async (values) => {
      const amount = (values.amount || "").trim();
      if (!amount) { toast("Enter an amount"); return; }
      const next = { who: (values.who || "").trim(), amount, note: (values.note || "").trim() };
      try {
        if (inv.id) await updateSaved(inv.id, next);
        inv.who = next.who;
        inv.amount = next.amount;
        inv.note = next.note;
        state.modal = null;
        toast("Invoice saved");
      } catch (err) {
        toast(err.message || "Could not save that invoice");
      }
    }
  });
}
async function addInvoice() {
  const amount = (state.toolForm.payAmount || "").trim();
  if (!amount) { toast("Enter an amount"); return; }
  const body = { who: state.toolForm.payWho || athlete().name, amount, note: state.toolForm.payNote || "" };
  try {
    const row = await createSaved("invoice", body);
    state.invoices.push({ id: row.id, who: body.who, amount: body.amount, note: body.note });
    state.toolForm.payAmount = "";
    state.toolForm.payNote = "";
    toast("Invoice saved");
  } catch (err) {
    toast(err.message || "Could not save that invoice");
  }
  render();
}

function mapEditFields(rows) {
  return (rows || []).map((f) => ({
    key: f.key,
    label: f.label,
    value: f.value == null ? "" : String(f.value),
    multiline: !!f.multiline,
    maxlength: f.maxlength || 0,
    type: f.type || "text",
    options: f.options || null,
    button: f.button || "",
    checkbox: f.checkbox || "",
    hint: f.hint || "",
    min: f.min,
    max: f.max
  }));
}
function openEdit(opts) {
  state.modal = {
    type: "edit",
    title: opts.title,
    hint: opts.hint || "",
    date: opts.date,
    id: opts.id,
    fields: mapEditFields(opts.fields),
    onSave: opts.onSave,
    liveCategory: !!opts.liveCategory
  };
  render();
}
function setEditField(key, value) {
  const m = state.modal;
  if (!m || m.type !== "edit" || !m.fields) return;
  const field = m.fields.find((f) => f.key === key);
  if (field && !field.button) field.value = value;
  const rebuild = m.liveCategory && (key === "category" || key === "add_intensity" || key === "remove_intensity" || key === "intensity_kind");
  if (!rebuild) return;
  m.draft = Object.assign({}, m.draft || {});
  m.fields.forEach((row) => { if (!row.button) m.draft[row.key] = row.value; });
  if (key === "add_intensity") {
    m.draft.intensity_kind = intensityKindCode(m.draft.intensity_kind) || "rpe";
    if (m.draft.intensity_value == null) m.draft.intensity_value = "";
  }
  if (key === "remove_intensity") {
    m.draft.intensity_kind = "";
    m.draft.intensity_value = "";
  }
  if (key === "intensity_kind") m.draft.intensity_kind = value;
  if (key === "category") m.draft.category = value;
  m.fields = mapEditFields(exerciseFields(m.draft));
  render();
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
    if (field) field.value = el.type === "checkbox" ? (el.checked ? "1" : "") : el.value;
  });
  const values = {};
  m.fields.forEach((f) => { values[f.key] = f.value; });
  await m.onSave(values);
}
const EDIT_FULL_WIDTH = ["name", "video_url"];
function editModalHtml(m) {
  const hint = m.hint ? `<div class="sub">${esc(m.hint)}</div>` : "";
  const grid = (m.fields || []).length > 4;
  const fields = (m.fields || []).map((f) => {
    const span = !grid || f.multiline || f.checkbox || f.button || EDIT_FULL_WIDTH.indexOf(f.key) >= 0 ? " span" : "";
    const max = f.maxlength ? ` maxlength="${f.maxlength}"` : "";
    const key = esc(f.key);
    let control;
    if (f.button) {
      control = `<button type="button" class="pill" onclick="setEditField('${key}', '1')">${esc(f.button)}</button>`;
    } else if (f.checkbox) {
      return `<div class="edit-field${span}"><span class="edit-label">${esc(f.label)}</span><label class="chk edit-check"><input type="checkbox" data-edit-key="${key}" ${f.value ? "checked" : ""} onchange="setEditField('${key}', this.checked ? '1' : '')"> ${esc(f.checkbox)}</label>${f.hint ? `<div class="hint">${esc(f.hint)}</div>` : ""}</div>`;
    } else if (f.options) {
      const options = f.options.slice();
      if (f.value && options.indexOf(f.value) < 0) options.unshift(f.value);
      control = `<select class="field" data-edit-key="${key}" data-focus="edit-${key}" onchange="setEditField('${key}', this.value)">${options.map((opt) => `<option value="${esc(opt)}" ${opt === f.value ? "selected" : ""}>${esc(opt)}</option>`).join("")}</select>`;
    } else if (f.multiline) {
      control = `<textarea data-edit-key="${key}" data-focus="edit-${key}"${max} oninput="setEditField('${key}', this.value)">${esc(f.value)}</textarea>`;
    } else {
      const bounds = f.min != null ? ` min="${esc(f.min)}"` : "";
      const maxBound = f.max != null ? ` max="${esc(f.max)}"` : "";
      control = `<input class="field" type="${esc(f.type || "text")}" data-edit-key="${key}" data-focus="edit-${key}" value="${esc(f.value)}"${max}${bounds}${maxBound} oninput="setEditField('${key}', this.value)">`;
    }
    return `<label class="edit-field${span}"><span>${esc(f.label)}</span>${control}</label>`;
  }).join("");
  return `<div class="modal-back" onclick="if(event.target===this) closeEdit()"><div class="modal edit-modal${grid ? " wide" : ""}" onclick="event.stopPropagation()"><h3>${esc(m.title)}</h3>${hint}<div class="modal-body edit-fields${grid ? " grid" : ""}">${fields}</div><div class="modal-foot"><button class="full" type="button" onclick="closeEdit()">Cancel</button><button class="full save" type="button" onclick="saveEdit()">Save</button></div></div></div>`;
}
function chainMemberDraft(member) {
  const exercise = (member && member.exercise) || {};
  return {
    exercise_id: member.exercise_id,
    name: member.name || exercise.name || "Exercise",
    sets: member.sets == null || member.sets === "" ? "" : String(member.sets),
    reps: member.reps || "",
    notes: member.notes || ""
  };
}
function chainMemberPayload(mem) {
  const sets = chainText(mem && mem.sets);
  const parsed = parseInt(sets, 10);
  return {
    exercise_id: mem.exercise_id,
    name: mem.name,
    sets: sets === "" || isNaN(parsed) ? null : parsed,
    reps: chainText(mem && mem.reps),
    notes: mem && mem.notes != null ? String(mem.notes) : ""
  };
}
function setChainMemberField(index, key, value) {
  const m = state.modal;
  if (!m || !m.members || !m.members[index]) return;
  m.members[index][key] = value;
}
function chainEditorHtml(m) {
  const kinds = ["Warm up", "Circuit", "Cooldown"];
  const options = (state.serverExercises || []).filter((row) => !row.hidden);
  const members = (m.members || []).map((mem, index) => `<div class="chain-member">
      <span>${index + 1}. ${esc(mem.name)}</span>
      <button type="button" onclick="moveChainMember(${index}, -1)">Up</button>
      <button type="button" onclick="moveChainMember(${index}, 1)">Down</button>
      <button type="button" onclick="removeChainMember(${index})">Remove</button>
      <label class="chain-field">Sets <input aria-label="Sets for ${esc(mem.name)}" value="${esc(mem.sets || "")}" oninput="setChainMemberField(${index}, 'sets', this.value)"></label>
      <label class="chain-field">Reps <input aria-label="Reps for ${esc(mem.name)}" value="${esc(mem.reps || "")}" oninput="setChainMemberField(${index}, 'reps', this.value)"></label>
      <label class="chain-field chain-notes">Notes <input aria-label="Notes for ${esc(mem.name)}" value="${esc(mem.notes || "")}" oninput="setChainMemberField(${index}, 'notes', this.value)"></label>
    </div>`).join("");
  return `<div class="modal-back" onclick="if(event.target===this){state.modal=null;render()}"><div class="modal edit-modal" onclick="event.stopPropagation()">
    <h3>${m.chainId ? "Edit chain" : "New chain"}</h3>
    <div class="sub">A chain groups existing exercises. It has its own name and no video. Saving an existing chain asks which days change.</div>
    <label class="edit-field"><span>Name</span><input class="field" data-focus="chain-name" value="${esc(m.name || "")}" oninput="state.modal.name=this.value"></label>
    <label class="edit-field"><span>Kind</span><select class="field" onchange="state.modal.kind=this.value">${kinds.map((kind) => `<option ${m.kind === kind ? "selected" : ""}>${esc(kind)}</option>`).join("")}</select></label>
    <div class="chain-members">${members || `<p class="hint">No exercises in this chain yet. The same exercise can be added twice.</p>`}</div>
    <div class="row">
      <select class="field" onchange="state.modal.pick=this.value"><option value="">Add exercise</option>${options.map((row) => `<option value="${row.id}">${esc(row.name)}</option>`).join("")}</select>
      <button type="button" class="pill" onclick="addChainMember()">Add</button>
    </div>
    <button class="full save" type="button" onclick="chainEditorCommit()">${m.chainId ? "Continue" : "Save chain"}</button>
    <button class="full" type="button" onclick="state.modal=null;render()">Cancel</button>
  </div></div>`;
}
function chainScopeHtml(m) {
  const library = m.source === "library";
  const choices = [
    ["one", "Only this one", library ? "Changes the chain template only." : "Changes this day only."],
    ["future", "Future workouts", library
      ? "Changes the template, and days dated today or later in Eastern Time. Past days stay as they are."
      : "Changes days dated today or later in Eastern Time. Past days stay as they are. The template stays as it is."],
    ["everywhere", "Change everywhere", "Changes the chain template and every day that uses it, including past days."]
  ];
  return `<div class="modal-back" onclick="if(event.target===this){state.modal=null;render()}"><div class="modal" onclick="event.stopPropagation()">
    <h3>Update this chain</h3>
    <div class="sub">${esc(m.draft.name)} · ${esc(m.draft.kind)}</div>
    ${choices.map((choice) => `<button class="full scope-choice" type="button" onclick="applyChainScope('${choice[0]}')"><strong>${esc(choice[1])}</strong><span class="sub">${esc(choice[2])}</span></button>`).join("")}
    <button class="full" type="button" onclick="state.modal=null;render()">Cancel</button>
  </div></div>`;
}
function modalHtml() {
  const m = state.modal;
  if (!m) return "";
  if (m.type === "edit") return editModalHtml(m);
  if (m.type === "chain") return chainEditorHtml(m);
  if (m.type === "chain-scope") return chainScopeHtml(m);
  if (m.type === "editor-name") {
    return `<div class="modal-back"><div class="modal" onclick="event.stopPropagation()"><h3>Name this exercise</h3><input class="field" data-focus="editor-name" aria-label="Exercise name" value="${esc(m.name || "")}" oninput="state.modal.name=this.value"><button class="full save" type="button" onclick="acceptEditorName()">Save</button><button class="full" type="button" onclick="dismissEditorName()">Cancel</button></div></div>`;
  }
  if (m.type === "delete") {
    return `<div class="modal-back" onclick="state.modal=null;render()"><div class="modal" onclick="event.stopPropagation()"><h3>${m.chainName ? `Delete the chain "${esc(m.chainName)}" and its ${m.ids.length} exercise${m.ids.length > 1 ? "s" : ""}?` : `You are about to delete (${m.ids.length}) workout item${m.ids.length > 1 ? "s" : ""}`}</h3><button class="full red" onclick="confirmDelete()">DELETE</button><button class="full" onclick="state.modal=null;render()">CANCEL</button></div></div>`;
  }
  if (m.type === "copy") {
    return `<div class="modal-back"><div class="modal" onclick="event.stopPropagation()"><div class="split"><h3>${m.mode === "move" ? "Move" : "Copy"}</h3><button class="iconbtn" onclick="state.modal=null;render()">✕</button></div>
      <div class="sub">${m.ids.length} workout items selected</div>
      <div>To calendar</div>
      <div class="row"><select class="ghost" onchange="state.modal.athleteId=this.value">${buildAthletes().filter((a) => a.id !== "none").map((a) => `<option value="${esc(a.id)}" ${a.id === (m.athleteId || state.athleteId) ? "selected" : ""}>${esc(a.name)}</option>`).join("")}</select></div>
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
    return `<div class="modal-back"><div class="modal"><h3>Clear all workout items on ${fmtDay(m.date)}?</h3><button class="full red" onclick="confirmClear('${m.date}')">CLEAR</button><button class="full" onclick="state.modal=null;render()">CANCEL</button></div></div>`;
  }
  if (m.type === "share") {
    const link = location.origin + "/?day=" + m.date + "&athlete=" + state.athleteId;
    return `<div class="modal-back"><div class="modal"><h3>Share Workout</h3><input class="field" value="${esc(link)}" readonly><button class="full primary" onclick="navigator.clipboard.writeText('${link}');toast('Link copied')">Copy link</button><button class="full" onclick="state.modal=null;render()">Close</button></div></div>`;
  }
  if (m.type === "create") {
    return `<div class="modal-back"><div class="modal"><h3>Create New Exercise</h3><input class="field" data-focus="new-ex" placeholder="Exercise name" oninput="state.modal.name=this.value"><button class="full primary" onclick="openNewLibraryExercise(state.modal.date, (state.modal.name||'').trim())">CREATE</button><button class="full" onclick="state.modal=null;render()">CANCEL</button></div></div>`;
  }
  if (m.type === "journal") {
    return `<div class="modal-back" onclick="if(event.target===this){state.modal=null;render();}"><div class="modal"><h3>Journal entry</h3><div class="modal-body ui-form">${uiField("Title", `<input class="field" data-focus="jtitle" value="${esc(m.title || "")}" oninput="state.modal.title=this.value">`)}${uiField("Entry", `<textarea data-focus="jbody" oninput="state.modal.body=this.value">${esc(m.body || "")}</textarea>`)}</div><div class="modal-foot"><button class="full" onclick="state.modal=null;render()">Cancel</button><button class="full primary" onclick="saveJournalEntry()">Save</button></div></div></div>`;
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
  noteDayEdit(m.date);
  state.modal = null;
  render();
}
window.addEventListener("resize", () => { if (state.searchDay) placeSearchPop(); if (state.editor) placeEditorPop(); });
document.addEventListener("scroll", () => { if (state.searchDay) placeSearchPop(); if (state.editor) placeEditorPop(); }, true);
document.addEventListener("click", (ev) => {
  if (state.editor && state.view === "build" && !ev.target.closest(".build-editor, .modal, .modal-back, .menu, .pop")) {
    closeEditor();
    return;
  }
  if (ev.target.closest(".menu, .pop, .modal, .modal-back, .nav-anchor, .group-pop")) return;
  let changed = false;
  if (state.navMenu) { state.navMenu = null; changed = true; }
  if (state.dayMenu || state.recurMenu || state.propMenu || state.letterMenu || state.optionsMenu || state.supersetMenu || state.trackMenu || state.colorMenu || state.searchDay) {
    state.dayMenu = state.recurMenu = state.colorMenu = state.searchDay = null;
    state.propMenu = state.letterMenu = state.optionsMenu = state.supersetMenu = state.trackMenu = false;
    changed = true;
  }
  if (state.teamFilter) { state.teamFilter = false; changed = true; }
  if (state.athleteMenu) { state.athleteMenu = false; changed = true; }
  if (changed) render();
});
document.addEventListener("keydown", (ev) => {
  if (ev.key === "Escape" && state.editor && state.view === "build" && !state.modal) {
    ev.preventDefault();
    discardEditor();
    return;
  }
  const tag = (ev.target.tagName || "").toLowerCase();
  const typing = tag === "input" || tag === "textarea" || tag === "select" || (ev.target.isContentEditable);
  if ((ev.metaKey || ev.ctrlKey) && ev.key.toLowerCase() === "z") {
    if (typing) return;
    ev.preventDefault();
    undo();
    return;
  }
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
    ev.preventDefault();
    copySelection("copy");
  }
  if ((ev.metaKey || ev.ctrlKey) && ev.key.toLowerCase() === "x") {
    ev.preventDefault();
    copySelection("cut");
  }
  if ((ev.metaKey || ev.ctrlKey) && ev.key.toLowerCase() === "v" && state.clipboard) {
    ev.preventDefault();
    pasteOn(state.hoverDay || state.focusDay);
  }
});

window.go = go;
window.goTool = goTool;
window.toggleNav = toggleNav;
window.closeNav = closeNav;
window.selectEntryDate = selectEntryDate;
window.addPr = addPr;
window.openEdit = openEdit;
window.saveEdit = saveEdit;
window.closeEdit = closeEdit;
window.setEditField = setEditField;
window.switchAthlete = switchAthlete;
window.shiftWeek = shiftWeek;
window.loadEarlierWeeks = loadEarlierWeeks;
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
window.setIntensityKind = setIntensityKind;
window.setAthleteDistanceUnit = setAthleteDistanceUnit;
window.shareDay = shareDay;
window.clearTitle = clearTitle;
window.resetOrder = resetOrder;
window.clearItems = clearItems;
window.confirmClear = confirmClear;
window.toggleAll = toggleAll;
window.toggleItem = toggleItem;
window.askDelete = askDelete;
window.askDeleteChain = askDeleteChain;
window.toggleExerciseComplete = toggleExerciseComplete;
window.closeEditor = closeEditor;
window.toggleWeekNote = toggleWeekNote;
window.setWeekNote = setWeekNote;
window.flushWeekNote = flushWeekNote;
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
  const body = coaches.map((c) => `<tr>
      <td><span class="ui-person">${uiAvatar(c.name)}<span class="who"><b>${esc(c.name)}</b><small>${esc(c.email)}</small></span></span></td>
      <td>${(c.led_teams || []).map((t) => `<span class="ui-badge blue">${esc(t)}</span>`).join(" ") || `<span class="muted">No team</span>`}</td>
      <td class="row-actions"><button class="btn btn-ghost btn-sm btn-danger" type="button" onclick="removeCoach(${c.id})">Remove</button></td>
    </tr>`).join("");
  return `<section class="stage ui-page" id="admin-coaches"><div class="ui-wrap">
    ${uiHead("Admin", "Coaches in " + esc(ctx.gym_name || "this gym"), "Add and remove coaches. A coach who still leads a team or has an athlete cannot be removed.", "")}
    ${state.roleError ? `<div class="ui-banner warn">${esc(state.roleError)}</div>` : ""}
    <div class="ui-grid side">
      <div class="ui-stack">
        <section class="ui-card"><form class="ui-card-body ui-form-row" onsubmit="addCoach(event); return false;">
          ${uiField("Coach name", `<input class="input" id="coach-name" required>`)}
          ${uiField("Email", `<input class="input" id="coach-email" type="email" required>`)}
          <button class="btn btn-primary" type="submit">Add coach</button>
        </form></section>
        <section class="ui-card">${uiCardHead("Coaches", coaches.length)}
          <div class="ui-table-wrap"><table class="ui-table"><thead><tr><th>Coach</th><th>Teams they lead</th><th></th></tr></thead>
          <tbody>${body || `<tr><td colspan="3">${uiEmpty("No coaches yet", "Add one above, or share the gym code.")}</td></tr>`}</tbody></table></div>
        </section>
      </div>
      <section class="ui-card">${uiCardHead("Gym code", null, "A new signup who enters this code joins as a coach.")}
        <div class="ui-card-body ui-stack" style="gap:12px">
          ${codes.map((c) => `<code class="join-code">${esc(c.code)}</code>`).join("") || `<p class="ui-hint">No gym code yet.</p>`}
          <button class="btn btn-secondary" type="button" onclick="createJoinCode('gym')">New gym code</button>
        </div>
      </section>
    </div>
  </div></section>`;
}
function ledTeams(ctx) {
  const id = state.auth && state.auth.user && state.auth.user.id;
  return ((ctx && ctx.teams) || []).filter((t) => t.coach_id === id);
}
function uiPage(inner, id, narrow) {
  return `<section class="stage ui-page"${id ? ` id="${id}"` : ""}><div class="ui-wrap${narrow ? " narrow" : ""}">${inner}</div></section>`;
}
function uiField(label, control, cls) {
  return `<label class="ui-field${cls ? " " + cls : ""}"><span class="ui-label">${esc(label)}</span>${control}</label>`;
}
function uiEmpty(title, text, action) {
  return `<div class="ui-empty"><b>${esc(title)}</b>${text ? esc(text) : ""}${action ? `<div>${action}</div>` : ""}</div>`;
}
function uiCardHead(title, count, sub, right) {
  return `<div class="ui-card-head"><div><h2 class="ui-card-title">${esc(title)}${count != null ? ` <span class="count">${count}</span>` : ""}</h2>${sub ? `<p class="ui-card-sub">${sub}</p>` : ""}</div>${right || ""}</div>`;
}
function uiSearch(placeholder, key, value, oninput, style) {
  return `<div class="ui-search"${style ? ` style="${style}"` : ""}><input class="input" placeholder="${esc(placeholder)}" aria-label="${esc(placeholder)}" data-focus="${key}" value="${esc(value || "")}" oninput="${oninput}"></div>`;
}
function uiHead(kicker, title, sub, actions) {
  return `<header class="ui-head"><div>
      ${kicker ? `<div class="ui-kicker">${esc(kicker)}</div>` : ""}
      <h1 class="ui-title">${esc(title)}</h1>
      ${sub ? `<p class="ui-sub">${sub}</p>` : ""}
    </div>${actions ? `<div class="ui-actions">${actions}</div>` : ""}</header>`;
}
function uiAvatar(name, cls) {
  const parts = String(name || "?").trim().split(/\s+/);
  const letters = (parts[0] || "?").charAt(0) + (parts.length > 1 ? parts[parts.length - 1].charAt(0) : "");
  return `<span class="ui-avatar${cls ? " " + cls : ""}" aria-hidden="true">${esc(letters.toUpperCase())}</span>`;
}
function groupControl(athlete, led) {
  if (athlete.team_id && led.some((t) => t.id === athlete.team_id)) {
    return `<button class="btn btn-ghost btn-sm" type="button" onclick="removeAthleteFromGroup(${athlete.team_id}, ${athlete.id})">Remove from group</button>`;
  }
  if (athlete.team_id || !led.length) return "";
  if (led.length === 1) {
    return `<button class="btn btn-secondary btn-sm" type="button" onclick="addAthleteToGroup(${led[0].id}, ${athlete.id})">Add to ${esc(led[0].name)}</button>`;
  }
  return `<span class="ui-inline">
    <select class="select auto" style="height:32px" id="add-team-${athlete.id}" aria-label="Group for ${esc(athlete.name)}">
      ${led.map((t) => `<option value="${t.id}">${esc(t.name)}</option>`).join("")}
    </select>
    <button class="btn btn-secondary btn-sm" type="button" onclick="addAthleteToGroup(document.getElementById('add-team-${athlete.id}').value, ${athlete.id})">Add</button>
  </span>`;
}
function groupBadge(athlete) {
  if (athlete.team_id) return `<span class="ui-badge blue">${esc(athlete.team_name || "Group")}</span>`;
  return `<span class="ui-badge amber"><span class="ui-dot"></span>No group</span>`;
}
function groupCards(led, athletes) {
  const free = athletes.filter((a) => !a.team_id);
  const manage = `<button class="btn btn-ghost btn-sm" type="button" onclick="goTool('users');state.userTab='groups';render()">Manage</button>`;
  if (!led.length) {
    return `<section class="ui-card" id="group-cards"><div class="ui-card-head"><h2 class="ui-card-title">Your groups</h2>${manage}</div>
      <div class="ui-empty"><b>No groups yet</b>Create a group and its join code in Manage Groups.</div></section>`;
  }
  return led.map((t) => {
    const members = athletes.filter((a) => a.team_id === t.id);
    const memberHtml = members.map((a) => `<div class="ui-list-row"><span class="ui-person">${uiAvatar(a.name)}<span class="who"><b>${esc(a.name)}</b></span></span><button class="btn btn-ghost btn-sm" type="button" onclick="removeAthleteFromGroup(${t.id}, ${a.id})">Remove</button></div>`).join("")
      || `<p class="ui-hint">No athletes in this group yet.</p>`;
    const addHtml = free.length
      ? `<form class="ui-inline" style="margin-top:12px" onsubmit="addAthleteToGroup(${t.id}); return false;">
          <select class="select" style="flex:1;width:auto" id="add-athlete-${t.id}" aria-label="Athlete to add">
            ${free.map((a) => `<option value="${a.id}">${esc(a.name)}</option>`).join("")}
          </select>
          <button class="btn btn-secondary" type="submit">Add</button>
        </form>`
      : `<p class="ui-hint" style="margin-top:10px">Everyone is in a group.</p>`;
    return `<section class="ui-card group-card" id="group-${t.id}">
      <div class="ui-card-head"><div><h2 class="ui-card-title">${esc(t.name)} <span class="count">${members.length}</span></h2><p class="ui-card-sub">An athlete is in one group at a time.</p></div>${manage}</div>
      <div class="ui-card-body">${memberHtml}${addHtml}</div>
    </section>`;
  }).join("");
}
function openAthleteCalendar(serverId) {
  const match = buildAthletes().find((a) => a.serverId === serverId);
  if (!match) { toast("That athlete has no calendar yet"); return; }
  state.athleteId = match.id;
  state.view = "build";
  render();
  loadCalendarSchedule(match.id);
  if (!state.serverExercises.length) loadExercises();
}
function workoutOptionLabel(w) {
  const exInfo = w.exercise_count
    ? `${w.exercise_count} ex${w.exercise_summary ? ": " + w.exercise_summary : ""}`
    : "No exercises";
  const datePart = w.scheduled_date && !w.is_template ? ` · last ${w.scheduled_date}` : "";
  const progPart = w.program_name && w.program_name !== "wourkout" ? ` [${w.program_name}]` : "";
  return `${w.title}${progPart} (${exInfo}${datePart})`;
}
function squadView() {
  const ctx = state.gymContext || { athletes: [], teams: [], codes: [], workouts: [] };
  const athletes = ctx.athletes || [];
  const led = ledTeams(ctx);
  const teams = led.map((t) => t.name).join(", ") || "your teams";
  const assignableAthletes = athletes.filter(
    (a) => a.id === (state.auth.user && state.auth.user.id) || led.some((t) => t.id === a.team_id)
  );
  const defaultTarget = assignableAthletes.length
    ? "user:" + assignableAthletes[0].id
    : (led.length ? "group:" + led[0].id : "");
  const selectedTarget = state.assignTarget || defaultTarget;
  const targetUserId = selectedTarget.startsWith("user:") ? parseInt(selectedTarget.slice(5), 10) : null;
  const selectedAthlete = targetUserId ? assignableAthletes.find((a) => a.id === targetUserId) : null;

  const allWorkouts = ctx.workouts || [];
  const athletePrevious = targetUserId
    ? allWorkouts.filter((w) => !w.is_template && (w.assigned_athlete_ids || []).includes(targetUserId))
    : [];
  const prevIds = new Set(athletePrevious.map((w) => w.id));
  const savedGymWorkouts = allWorkouts.filter((w) => !w.is_template && !prevIds.has(w.id));
  const templateWorkouts = allWorkouts.filter((w) => w.is_template);

  let workoutOptionsHtml = "";
  if (athletePrevious.length) {
    workoutOptionsHtml += `<optgroup label="Previous Workouts for ${esc((selectedAthlete && selectedAthlete.name) || "Athlete")}">
      ${athletePrevious.map((w) => `<option value="${w.id}" ${String(state.assignWorkoutId) === String(w.id) ? "selected" : ""}>${esc(workoutOptionLabel(w))}</option>`).join("")}
    </optgroup>`;
  }
  if (savedGymWorkouts.length) {
    workoutOptionsHtml += `<optgroup label="Saved Gym Workouts">
      ${savedGymWorkouts.map((w) => `<option value="${w.id}" ${String(state.assignWorkoutId) === String(w.id) ? "selected" : ""}>${esc(workoutOptionLabel(w))}</option>`).join("")}
    </optgroup>`;
  }
  if (templateWorkouts.length) {
    workoutOptionsHtml += `<optgroup label="Program Library Templates">
      ${templateWorkouts.map((w) => `<option value="${w.id}" ${String(state.assignWorkoutId) === String(w.id) ? "selected" : ""}>${esc(workoutOptionLabel(w))}</option>`).join("")}
    </optgroup>`;
  }

  const q = (state.athleteQ || "").trim().toLowerCase();
  const shown = athletes.filter((a) => !q || [a.name, a.email, a.team_name].some((v) => String(v || "").toLowerCase().includes(q)));
  const rows = shown.map((a) => `<tr>
      <td><span class="ui-person">${uiAvatar(a.name)}<span class="who"><b>${esc(a.name)}</b><small>${esc(a.email || "")}</small></span></span></td>
      <td>${groupBadge(a)}</td>
      <td class="muted hide-sm">${a.latest_note ? esc(a.latest_note) : "—"}</td>
      <td class="row-actions"><span class="ui-inline" style="justify-content:flex-end">${groupControl(a, led)}<button class="btn btn-secondary btn-sm" type="button" onclick="openAthleteCalendar(${a.id})">Calendar</button></span></td>
    </tr>`).join("");
  const emptyRow = athletes.length
    ? `<tr><td colspan="4"><div class="ui-empty"><b>No matches</b>Nobody matches "${esc(state.athleteQ)}".</div></td></tr>`
    : `<tr><td colspan="4"><div class="ui-empty"><b>No athletes yet</b>Share a team join code, or upload athletes in Manage Users.</div></td></tr>`;
  const unassigned = athletes.filter((a) => !a.team_id).length;
  return `<section class="stage ui-page" id="coach-assign"><div class="ui-wrap">
    ${uiHead("Coach", "Athletes", `${athletes.length} athlete${athletes.length === 1 ? "" : "s"} on ${esc(teams)}${unassigned ? ` · ${unassigned} without a group` : ""}. Other coaches' athletes stay hidden.`,
      `<button class="btn btn-secondary" type="button" onclick="goTool('users');state.userTab='groups';render()">Groups &amp; join codes</button>
       <button class="btn btn-primary" type="button" onclick="openAthleteInBuild()">Build a workout</button>`)}
    ${state.assignResult ? `<div class="ui-banner ok">${esc(state.assignResult)}</div>` : ""}
    <div class="ui-grid side">
      <section class="ui-card">
        <div class="ui-card-head">
          <h2 class="ui-card-title">Athletes <span class="count">${athletes.length}</span></h2>
          <div class="ui-search" style="max-width:280px"><input class="input" placeholder="Search athletes" aria-label="Search athletes" data-focus="athlete-q" value="${esc(state.athleteQ || "")}" oninput="state.athleteQ=this.value;render()"></div>
        </div>
        <div class="ui-table-wrap"><table class="ui-table" id="coach-athletes">
          <thead><tr><th>Athlete</th><th>Group</th><th class="hide-sm">Latest note to you</th><th></th></tr></thead>
          <tbody>${rows || emptyRow}</tbody>
        </table></div>
      </section>
      <div class="ui-stack">
        <section class="ui-card">
          <div class="ui-card-head"><div><h2 class="ui-card-title">Quick assign</h2><p class="ui-card-sub">Put a saved workout or template on a calendar.</p></div></div>
          <form class="ui-card-body ui-form" onsubmit="assignWorkout(event); return false;">
            <label class="ui-field"><span class="ui-label">Who</span>
              <select class="select" id="assign-target" onchange="state.assignTarget=this.value;render()" required>
                ${assignableAthletes.length ? `<optgroup label="Athletes">
                  ${assignableAthletes.map((a) => `<option value="user:${a.id}" ${selectedTarget === "user:" + a.id ? "selected" : ""}>${esc(a.name)}${a.team_name ? " (" + esc(a.team_name) + ")" : ""}</option>`).join("")}
                </optgroup>` : ""}
                ${led.length ? `<optgroup label="Entire group">
                  ${led.map((t) => `<option value="group:${t.id}" ${selectedTarget === "group:" + t.id ? "selected" : ""}>Group: ${esc(t.name)}</option>`).join("")}
                </optgroup>` : ""}
              </select></label>
            <label class="ui-field"><span class="ui-label">Workout</span>
              <select class="select" id="assign-workout-id" onchange="state.assignWorkoutId=this.value" required>
                ${workoutOptionsHtml || `<option value="">No saved workouts yet. Build one in Calendar.</option>`}
              </select></label>
            <label class="ui-field"><span class="ui-label">Date</span>
              <input class="input" id="assign-date" type="date" value="${esc(state.assignDate || APP_TODAY || "2026-10-16")}" onchange="state.assignDate=this.value" required></label>
            <button class="btn btn-primary btn-block" type="submit" ${!workoutOptionsHtml ? "disabled" : ""}>Assign workout</button>
          </form>
        </section>
        ${groupCards(led, athletes)}
      </div>
    </div>
  </div></section>`;
}
function openAthleteInBuild() {
  const targetEl = document.getElementById("assign-target");
  const dateEl = document.getElementById("assign-date");
  const target = (targetEl && targetEl.value) || state.assignTarget || "";
  const date = (dateEl && dateEl.value) || state.assignDate || APP_TODAY;
  const list = buildAthletes();
  if (target.startsWith("group:")) {
    const gidNum = parseInt(target.slice(6), 10);
    const match = list.find((a) => a.groupId === gidNum);
    if (match) state.athleteId = match.id;
  } else if (target.startsWith("user:")) {
    const uidNum = parseInt(target.slice(5), 10);
    const match = list.find((a) => a.serverId === uidNum);
    if (match) state.athleteId = match.id;
  }
  if (date) {
    state.focusDay = date;
    state.weekStart = sundayOf(date);
  }
  state.view = "build";
  if (state.athleteId && state.athleteId !== "none") {
    loadCalendarSchedule(state.athleteId);
  }
  render();
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
async function refreshSignedInUser() {
  const me = await api("GET", "/api/auth/me");
  state.auth.user = me;
  return me;
}
async function createLedGroup(e) {
  if (e) e.preventDefault();
  const name = ((document.getElementById("new-group-name") || {}).value || "").trim();
  if (!name) { toast("Name the group"); return; }
  try {
    await api("POST", "/api/groups", { name });
    await refreshSignedInUser();
    await loadGymContext();
    toast("Group created");
  } catch (err) {
    toast(err.message || "Could not create that group");
  }
  render();
}
async function addAthleteToGroup(teamId, athleteId) {
  const picked = athleteId || parseInt((document.getElementById("add-athlete-" + teamId) || {}).value, 10);
  if (!picked) { toast("Choose an athlete"); return; }
  try {
    await api("POST", "/api/groups/" + teamId + "/members/" + picked);
    if (state.auth.user && picked === state.auth.user.id) await refreshSignedInUser();
    await loadGymContext();
    toast("Athlete added to the group");
  } catch (err) {
    toast(err.message || "Could not add that athlete");
  }
  render();
}
async function removeAthleteFromGroup(teamId, athleteId) {
  try {
    await api("DELETE", "/api/groups/" + teamId + "/members/" + athleteId);
    if (state.auth.user && athleteId === state.auth.user.id) await refreshSignedInUser();
    await loadGymContext();
    toast("Athlete removed from the group");
  } catch (err) {
    toast(err.message || "Could not remove that athlete");
  }
  render();
}
async function assignWorkout(e) {
  if (e) e.preventDefault();
  const targetEl = document.getElementById("assign-target");
  const workoutEl = document.getElementById("assign-workout-id");
  const dateEl = document.getElementById("assign-date");
  const target = (targetEl && targetEl.value) || state.assignTarget || "";
  const workoutId = parseInt(workoutEl && workoutEl.value, 10);
  const scheduled_date = (dateEl && dateEl.value) || state.assignDate || APP_TODAY;
  if (!target || !workoutId || !scheduled_date) {
    toast("Select a target, workout, and date");
    return;
  }
  const payload = { workout_id: workoutId, scheduled_date };
  let targetLabel = "your athlete";
  const ctx = state.gymContext || { athletes: [], teams: [], workouts: [] };
  if (target.startsWith("group:")) {
    payload.group_id = parseInt(target.slice(6), 10);
    const team = (ctx.teams || []).find((t) => t.id === payload.group_id);
    targetLabel = team ? "group " + team.name : "your group";
  } else {
    payload.user_id = parseInt(target.replace(/^user:/, ""), 10);
    const athlete = (ctx.athletes || []).find((a) => a.id === payload.user_id);
    targetLabel = (athlete && athlete.name) || "your athlete";
  }
  try {
    const res = await api("POST", "/api/assignments", payload);
    const workoutObj = (ctx.workouts || []).find((w) => w.id === workoutId);
    const title = (res && res.workout_title) || (workoutObj && workoutObj.title) || "Workout";
    await loadGymContext();
    state.assignResult = "Assigned “" + title + "” to " + targetLabel + " on " + scheduled_date + ".";
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
      if (state.role === "athlete") {
        await loadMySchedule();
        await loadOwnJournal();
      } else await loadGymContext();
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
    if (state.role === "athlete") {
      await loadMySchedule();
      await loadOwnJournal();
    } else await loadGymContext();
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
    const draft = state.auth.regDraft || { name: "", username: "", email: "", password: "" };
    content = `
      <form class="auth-form" onsubmit="handleRegister(event); return false;">
        <div class="auth-input-group">
          <label>Account Role</label>
          <div class="role-pill-group">
            <button type="button" class="role-pill ${state.auth.roleChoice === 'athlete' ? 'selected' : ''}" onclick="selectAuthRole('athlete')">Athlete</button>
            <button type="button" class="role-pill ${state.auth.roleChoice === 'coach' ? 'selected' : ''}" onclick="selectAuthRole('coach')">Coach</button>
            <button type="button" class="role-pill ${state.auth.roleChoice === 'admin' ? 'selected' : ''}" onclick="selectAuthRole('admin')">Admin</button>
          </div>
          <div class="hint" style="margin-top:6px">After sign-in, enter a code or create your own gym. One login can hold more than one role.</div>
        </div>
        <div class="auth-input-group">
          <label>Full Name</label>
          <input class="auth-input" id="reg-name" placeholder="Alex Morgan" value="${esc(draft.name || "")}" oninput="updateRegDraft('name', this.value)" required>
        </div>
        <div class="auth-input-group">
          <label>Username</label>
          <input class="auth-input" id="reg-username" placeholder="alexm" value="${esc(draft.username || "")}" oninput="updateRegDraft('username', this.value)" required autocomplete="username">
        </div>
        <div class="auth-input-group">
          <label>Email Address</label>
          <input class="auth-input" id="reg-email" type="email" placeholder="alex@example.com" value="${esc(draft.email || "")}" oninput="updateRegDraft('email', this.value)" required autocomplete="email">
        </div>
        <div class="auth-input-group">
          <label>Password (min. 6 characters)</label>
          <input class="auth-input" id="reg-password" type="password" placeholder="••••••••" value="${esc(draft.password || "")}" oninput="updateRegDraft('password', this.value)" required minlength="6" autocomplete="new-password">
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

function syncRegDraftFromDom() {
  if (!state.auth.regDraft) {
    state.auth.regDraft = { name: "", username: "", email: "", password: "" };
  }
  const nameEl = document.getElementById("reg-name");
  const usernameEl = document.getElementById("reg-username");
  const emailEl = document.getElementById("reg-email");
  const passwordEl = document.getElementById("reg-password");
  if (nameEl) state.auth.regDraft.name = nameEl.value;
  if (usernameEl) state.auth.regDraft.username = usernameEl.value;
  if (emailEl) state.auth.regDraft.email = emailEl.value;
  if (passwordEl) state.auth.regDraft.password = passwordEl.value;
}

function updateRegDraft(field, value) {
  if (!state.auth.regDraft) {
    state.auth.regDraft = { name: "", username: "", email: "", password: "" };
  }
  state.auth.regDraft[field] = value;
}

function selectAuthRole(role) {
  syncRegDraftFromDom();
  state.auth.roleChoice = role;
  render();
}

function setAuthMode(mode) {
  syncRegDraftFromDom();
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
  syncRegDraftFromDom();
  const name = (document.getElementById("reg-name")?.value || state.auth.regDraft?.name || "").trim();
  const username = (document.getElementById("reg-username")?.value || state.auth.regDraft?.username || "").trim();
  const email = (document.getElementById("reg-email")?.value || state.auth.regDraft?.email || "").trim();
  const password = document.getElementById("reg-password")?.value || state.auth.regDraft?.password || "";
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
    state.auth.regDraft = { name: "", username: "", email: "", password: "" };
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
      history.replaceState(null, "", window.location.pathname + window.location.search);
      render();
      return;
    } else if (accessToken) {
      history.replaceState(null, "", window.location.pathname + window.location.search);
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
        if (state.role === "athlete") {
          await loadMySchedule();
          await loadOwnJournal();
        } else {
          await loadGymContext();
          applyBuildQuery();
        }
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
window.addItem = addItem;
window.snapshot = snapshot;
window.toast = toast;
window.renderLoginGate = renderLoginGate;
window.setAuthMode = setAuthMode;
window.selectAuthRole = selectAuthRole;
window.updateRegDraft = updateRegDraft;
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
window.createLedGroup = createLedGroup;
window.addAthleteToGroup = addAthleteToGroup;
window.removeAthleteFromGroup = removeAthleteFromGroup;
window.assignWorkout = assignWorkout;
window.openAthleteInBuild = openAthleteInBuild;
window.openAthleteCalendar = openAthleteCalendar;
window.toggleBuildPanel = toggleBuildPanel;
window.addLibraryExercise = addLibraryExercise;
window.startGoal = startGoal;
window.editServerGroup = editServerGroup;
window.deleteServerGroup = deleteServerGroup;
window.deleteServerJoinCode = deleteServerJoinCode;
window.copyText = copyText;
window.sendAthleteNote = sendAthleteNote;
window.redeemCode = redeemCode;
window.createGym = createGym;
window.deleteGoalRecord = deleteGoalRecord;
window.filterGoalsAthlete = filterGoalsAthlete;
window.toggleAttendance = toggleAttendance;
window.loadCalendarSchedule = loadCalendarSchedule;

installBuildAutosave();

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    initAuth();
  });
} else {
  initAuth();
}
