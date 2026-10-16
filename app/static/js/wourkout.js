/* wourkout prototype — calendar builder and coach tools from the screen recordings. */
const LETTERS = "ABCDEFGHIJ".split("");
const LETTER_COLOR = {
  A: "#3ddc84", B: "#3b82f6", C: "#a855f7", D: "#eab308", E: "#f59e0b",
  F: "#ef4444", G: "#14b8a6", H: "#ec4899", I: "#84cc16", J: "#6366f1"
};
const PROP_LABEL = {
  load: "Load", rest: "Rest", tempo: "Tempo", velocity: "Velocity",
  power: "Peak Power", pct: "%PR"
};
const PROP_FIELDS = [
  ["load", "loads"],
  ["rest", "rests"],
  ["tempo", "tempos"],
  ["velocity", "velocities"],
  ["power", "powers"],
  ["pct", "pcts"]
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
    stations: record.default_stations || "",
    note: record.default_notes || "",
    videoUrl: record.video_url || ""
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
    partial.libraryDefaults = {
      sets: defaults.sets, reps: defaults.reps, load: defaults.load, rest: defaults.rest,
      tempo: defaults.tempo, velocity: defaults.velocity, power: defaults.power, pct: defaults.pct
    };
  }
  partial.props = props;
  return Object.assign(partial, extra);
}
function fromCatalog(entry) {
  const defaults = libraryDefaultsFrom(exerciseRecord(entry.name));
  if (entry.type === "questionnaire") {
    return item({ name: entry.name, type: "questionnaire", letter: "A", sets: 1, reps: [1], questions: QUESTIONS.slice(), requireResponse: true, trackReps: false });
  }
  if (entry.type === "circuit") {
    const detail = defaults
      ? (defaults.stations || "")
      : (entry.name.includes("Sprint") ? SPRINT_DETAIL : entry.name.includes("Mobility") || entry.name.includes("Warm") ? MOBILITY_DETAIL : "Complete 1 round - 20 seconds on, 20 seconds off");
    const sets = defaults ? Math.max(1, Math.min(10, parseInt(defaults.sets, 10) || 1)) : 1;
    const rep = defaults ? (defaults.reps || "1") : "1";
    return item(withPropertyDefaults({
      name: entry.name, type: "circuit", letter: "A", sets, reps: Array(sets).fill(rep),
      detail, note: defaults ? (defaults.note || "") : "", completionOnly: true, trackReps: false
    }, defaults));
  }
  if (entry.type === "break") return item({ name: "Session Break", type: "break", letter: "", sets: 0, reps: [], trackReps: false });
  if (entry.type === "rest") return item({ name: "Rest Time", type: "rest", letter: "", sets: 1, reps: [60], note: "60s", trackReps: false });
  if (entry.type === "video") return item({ name: "Video", type: "video", letter: "", sets: 0, reps: [], trackReps: false });
  const sets = defaults ? Math.max(1, Math.min(10, parseInt(defaults.sets, 10) || 3)) : 3;
  const rep = defaults ? (defaults.reps != null ? defaults.reps : "10") : "10";
  return item(withPropertyDefaults({
    name: entry.name, type: "lift", letter: "A", sets, reps: Array(sets).fill(rep)
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
  editor: null,
  propMenu: false,
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
  managing: "Lifts",
  goals: [],
  docs: [],
  packets: [],
  attendance: {},
  invoices: [],
  reports: [],
  serverExercises: [],
  serverRecords: [],
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
  state.supersetMenu = false;
  state.dayMenu = null;
  state.recurMenu = null;
  state.colorMenu = null;
  state.navMenu = null;
  state.teamFilter = false;
  state.athleteMenu = false;
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
  if (state.role === "athlete") {
    await loadMySchedule();
    await loadOwnJournal();
  } else await loadGymContext();
  if (state.role !== "athlete") loadExercises();
}
const NOTE_SKIP = { Rests: 1, Tempos: 1, Velocities: 1, Powers: 1, Pcts: 1, Props: 1, Flags: 1, Additional: 1 };
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
    props: splitTag(lines, "Props").filter(Boolean),
    flags: splitTag(lines, "Flags"),
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
  add("tempo", parsed.tempos);
  add("velocity", parsed.velocities);
  add("power", parsed.powers);
  add("pct", parsed.pcts);
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
  if (it.type === "circuit" || it.type === "questionnaire") {
    if (it.trackReps) flags.push("trackReps");
  } else if (it.trackReps === false) flags.push("noTrackReps");
  if (it.trackVolume) flags.push("trackVolume");
  if (it.type === "circuit" && it.completionOnly === false) flags.push("noCompletionOnly");
  else if (it.completionOnly) flags.push("completionOnly");
  if (flags.length) lines.push("Flags:" + flags.join(","));
  const keys = { Rests: "rests", Tempos: "tempos", Velocities: "velocities", Powers: "powers", Pcts: "pcts" };
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
    const sets = we.prescribed_sets || 1;
    const reps = String(we.target_reps || "1").split(",");
    const loads = String(we.target_weight || "").split(",");
    const cat = String((we.exercise && we.exercise.category) || "").toLowerCase();
    const type = cat.includes("question") ? "questionnaire" : (cat.includes("circuit") || parsed.plainLines.length > 1 ? "circuit" : "lift");
    const flags = parsed.flags;
    return item({
      id: "wx" + we.id,
      weId: we.id,
      name: (we.exercise && we.exercise.name) || "Exercise",
      letter: we.superset_group || "A",
      type,
      sets,
      reps,
      loads,
      rests: parsed.rests.length ? parsed.rests : Array(sets).fill(""),
      tempos: parsed.tempos,
      velocities: parsed.velocities,
      powers: parsed.powers,
      pcts: parsed.pcts,
      props: inferProps(parsed, loads),
      detail: type === "circuit" ? parsed.plainLines.join("\n") : "",
      note: type === "circuit" ? parsed.additional : parsed.plainLines.join("\n"),
      questions: type === "questionnaire" ? (parsed.plainLines.length ? parsed.plainLines : QUESTIONS.slice()) : [],
      trackReps: (type === "circuit" || type === "questionnaire") ? flags.indexOf("trackReps") >= 0 : flags.indexOf("noTrackReps") < 0,
      trackVolume: flags.indexOf("trackVolume") >= 0,
      completionOnly: type === "circuit" ? flags.indexOf("noCompletionOnly") < 0 : flags.indexOf("completionOnly") >= 0
    });
  });
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
  state.calendarLoading[targetId] = true;
  try {
    const entries = await api("GET", "/api/calendar/schedule" + query);
    state.calendarLoaded[targetId] = true;
    if (!state.calendars[targetId]) state.calendars[targetId] = {};
    const calObj = state.calendars[targetId];
    (entries || []).forEach((entry) => {
      if (!entry.workout || !entry.scheduled_date) return;
      const w = entry.workout;
      calObj[entry.scheduled_date] = blankDay(entry.scheduled_date, {
        title: w.title || "Workout",
        weekLabel: w.description || weekName(entry.scheduled_date),
        items: workoutToDayItems(w),
        savedFor: targetId,
        savedWorkoutId: w.id,
        assignmentId: entry.assignment_id
      });
    });
    render();
  } catch (err) {
    console.error("Failed to load calendar schedule:", err);
  } finally {
    state.calendarLoading[targetId] = false;
  }
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
      team_name: u.team_name || ""
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

function rightRail() {
  if (state.role === "athlete" || state.role === "admin" || state.view === "squad" || state.view === "admin") return "";
  const btn = (view, icon, title) => `<button title="${title}" class="${state.view === view ? "on" : ""}" onclick="goTool('${view}')">${icon}</button>`;
  return `<aside class="rail right">
    ${btn("build", "▦", "Calendar")}
    ${btn("entry", "☰", "Workout entry")}
    ${btn("feed", "✎", "Feed")}
    ${btn("users", "☺", "Users")}
    <div style="flex:1"></div>
    ${fabSuppressed() ? "" : `<button title="Add" onclick="onFab()">＋</button>`}
  </aside>`;
}
function leftRail() {
  return `<aside class="rail">
    <button title="Collections" class="${state.sidebar ? "on" : ""}" onclick="state.sidebar=!state.sidebar;render()">☰</button>
    <button title="Program Library" onclick="goTool('exercises')">▤</button>
    <button title="Preview" class="${state.preview ? "on" : ""}" onclick="togglePreview()">▢</button>
    <button title="Action History" onclick="state.sidebar=true;state.historyOpen=true;render()">↺</button>
  </aside>`;
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
    default: return state.role === "athlete" ? mineView() : buildView();
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
  const currentTarget = athlete();
  const saveLabel = currentTarget.isGroup ? "Save for group" : "Save for athlete";
  return leftRail() + (state.sidebar ? sidebarHtml() : "") + (state.preview ? previewHtml() : "") +
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
          <button class="ghost" onclick="saveFocused()">${saveLabel}</button>
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
        team_name: u.team_name || ""
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
        self: true
      });
    }
  }
  if (!list.length) {
    return [{ id: "none", name: "No athletes or groups yet", email: "" }];
  }
  return list;
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
  render();
  loadCalendarSchedule(id);
}
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
    ${day.savedWorkoutId ? `<div class="saved-pill">Saved for ${esc((buildAthletes().find((a) => a.id === day.savedFor) || {}).name || "athlete")}</div>` : ""}
    <div class="row" style="margin-top:0">
      <input type="checkbox" title="Select all" ${sel.length && sel.length === day.items.length ? "checked" : ""} onclick="toggleAll('${date}', this.checked);event.stopPropagation()">
      ${header}
    </div>
    ${recur}${color}${menu}
    <div>${items}</div>
    ${editor}
    <button class="add-ex" onclick="openSearch('${date}', event)">+ Add Exercise</button>
    ${state.clipboard && (state.clipboard.items || []).length ? `<button class="add-ex" onclick="pasteOn('${date}')">Paste ${state.clipboard.items.length} item(s)</button>` : ""}
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
function catalogType(entry) {
  if (!entry) return "lift";
  if (entry.type === "break" || entry.type === "rest" || entry.type === "video") return entry.type;
  const record = exerciseRecord(entry.name);
  if (!record) return entry.type || "lift";
  const bucket = exBucket(record.category);
  if (bucket === "Circuits") return "circuit";
  if (bucket === "Questionnaires") return "questionnaire";
  return "lift";
}
function addFromCatalog(date, index) {
  const entry = Object.assign({}, CATALOG[index] || { name: "Exercise", type: "lift" });
  entry.type = catalogType(entry);
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
  state.modal = null;
  state.propMenu = false;
  state.letterMenu = false;
  state.optionsMenu = false;
  state.supersetMenu = false;
  state.editor = { day: date, id };
  render();
}
function toggleEditorMenu(which, ev) {
  if (ev) ev.stopPropagation();
  const next = !state[which];
  state.propMenu = false;
  state.letterMenu = false;
  state.optionsMenu = false;
  state.supersetMenu = false;
  state[which] = next;
  render();
}
function editorHead(date, it, day) {
  return `<div class="editor-h">
      <span class="letter" style="background:${LETTER_COLOR[it.letter] || "#666"}">${esc(it.letter || "•")}</span>
      <input class="name-input" aria-label="Exercise name" data-focus="exname-${it.id}" value="${esc(it.name)}" oninput="setField('${date}','${it.id}','name', this.value)" onchange="render()">
      <button type="button" class="pill" onclick="toggleEditorMenu('letterMenu', event)">${esc(letterCode(day, it))} ▾</button>
      <button type="button" class="iconbtn" title="Delete" onclick="askDelete('${date}','${it.id}')">🗑</button>
      <button type="button" class="iconbtn" title="Close" onclick="state.editor=null;render()">✕</button>
    </div>
    ${state.letterMenu ? `<div class="pop letter-pop" onclick="event.stopPropagation()">${LETTERS.map((L) => `<button type="button" class="opt" onclick="setLetter('${date}','${it.id}','${L}')">${L}</button>`).join("")}<button type="button" class="opt" onclick="setLetter('${date}','${it.id}','')">–</button></div>` : ""}
    <button type="button" class="linkish" onclick="openInfo('${date}','${it.id}')">+ Add Additional Info (Shift + I)</button>
    ${it.note ? `<div class="note-line">${esc(it.note)}</div>` : ""}`;
}
function workTable(date, it) {
  const keys = [];
  if (it.trackReps !== false || it.type === "circuit") keys.push("reps");
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
      <button type="button" class="pill ${it.trackReps ? "on" : ""}" onclick="toggleFlag('${date}','${it.id}','trackReps')">${it.trackReps ? "✓ " : ""}Track Reps ▾</button>
      <button type="button" class="pill ${it.trackVolume ? "on" : ""}" onclick="toggleFlag('${date}','${it.id}','trackVolume')">${it.trackVolume ? "✓ " : ""}Track Volume ▾</button>
    </div>${volume}`;
}
function setVolume(it) {
  let total = 0;
  (it.reps || []).forEach((rep, i) => { total += (+rep || 0) * (+((it.loads || [])[i]) || 0); });
  return total;
}
function editorPop(date) {
  const it = findItem(date, state.editor.id);
  if (!it) return "";
  const day = ensureDay(date);
  const head = editorHead(date, it, day);
  if (it.type === "questionnaire") {
    return `<div class="editor build-editor" onclick="event.stopPropagation()">${head}
      ${it.questions.map((q, i) => `<div class="q">${i + 1}. ${esc(q)}</div>`).join("")}
      <label class="chk" style="color:#ddd"><input type="checkbox" ${it.requireResponse ? "checked" : ""} onchange="itRequire('${date}','${it.id}', this.checked)"> Require Response</label>
      <div class="hint">All questionnaire items must be fully completed before showing workout.</div>
    </div>`;
  }
  if (it.type === "circuit") {
    return `<div class="editor build-editor" onclick="event.stopPropagation()">${head}
      <div class="hint">Stations, one per line</div>
      <textarea data-focus="detail-${it.id}" oninput="setField('${date}','${it.id}','detail', this.value)" onchange="render()">${esc(it.detail || "")}</textarea>
      <div class="sets-line">${setRow(date, it, "Rounds")}${addPropButton(date, it)}</div>
      ${workTable(date, it)}
      ${editorActions(date, it)}
    </div>`;
  }
  if (it.type === "break" || it.type === "video" || it.type === "rest") {
    return `<div class="editor build-editor" onclick="event.stopPropagation()">${head}
      ${it.type === "video" ? `<input data-focus="vid-${it.id}" placeholder="Video URL" value="${esc(it.videoUrl)}" oninput="setField('${date}','${it.id}','videoUrl', this.value)" onchange="render()">` : ""}
      ${it.type === "rest" ? `<div class="row">Seconds <input style="width:80px" data-focus="rest-${it.id}" value="${esc(it.reps[0] || 60)}" oninput="setRestSeconds('${date}','${it.id}', this.value)" onchange="render()"></div>` : ""}
    </div>`;
  }
  return `<div class="editor build-editor" onclick="event.stopPropagation()">${head}
    <div class="sets-line">${setRow(date, it, "Sets")}${addPropButton(date, it)}</div>
    ${workTable(date, it)}
    ${editorActions(date, it)}
  </div>`;
}
function setRow(date, it, label) {
  return `<div class="row sets-row"><span class="sets-label">${label}</span><div class="stepper">
    <button type="button" aria-label="Fewer ${label}" onclick="changeSets('${date}','${it.id}',-1)">−</button><b>${it.sets}</b>
    <button type="button" aria-label="More ${label}" onclick="changeSets('${date}','${it.id}',1)">+</button>
  </div><span class="hint"># of ${label}: 1–10</span>
  <button type="button" class="iconbtn" title="Delete" onclick="askDelete('${date}','${it.id}')">🗑</button></div>`;
}
function propMenu(date, id) {
  const it = findItem(date, id);
  const opts = [["load", "Load"], ["rest", "Rest"], ["tempo", "Tempo"], ["velocity", "Velocity"], ["power", "Peak Power"], ["pct", "%PR"]];
  return `<div class="pop prop-menu" onclick="event.stopPropagation()">
    <div class="prop-menu-h"><b>Add Property</b><span>Ctrl+P</span></div>
    ${opts.map(([k, l]) => `<button type="button" class="opt ${(it.props || []).includes(k) ? "active" : ""}" onclick="addProp('${date}','${id}','${k}')">${(it.props || []).includes(k) ? "✓ " : ""}${l}</button>`).join("")}
    <button type="button" class="opt about-prop" onclick="aboutProperties(event)">ⓘ About Properties</button>
  </div>`;
}
function aboutProperties(ev) {
  if (ev) ev.stopPropagation();
  state.propMenu = false;
  toast("Load, Rest, Tempo, Velocity, Peak Power, and %PR are entered on each set.");
  render();
}
function propArray(it, key) {
  const map = { reps: "reps", load: "loads", rest: "rests", tempo: "tempos", velocity: "velocities", power: "powers", pct: "pcts" };
  const sets = it.sets || 1;
  const arr = (it[map[key]] || []).slice(0, sets);
  while (arr.length < sets) arr.push("");
  return arr;
}
function propRow(date, it, key) {
  if (key === "reps" && it.trackReps === false && it.type !== "circuit") return "";
  const label = key === "reps" ? "Reps" : PROP_LABEL[key];
  const info = key === "reps" ? `<button type="button" class="iconbtn reps-info" title="Reps for each set" onclick="event.stopPropagation();toast('Reps prescribed for each set')">ⓘ</button>` : "";
  const cells = propArray(it, key).map((v, i) => `<td><input aria-label="${label} set ${i + 1}" data-focus="${key}-${it.id}-${i}" value="${esc(v)}" oninput="setCell('${date}','${it.id}','${key}',${i}, this.value)" onchange="render()"></td>`).join("");
  return `<tr><th>${label}${info}</th>${cells}</tr>`;
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
  if (!it) return;
  if (!it.props) it.props = [];
  const map = { load: "loads", rest: "rests", tempo: "tempos", velocity: "velocities", power: "powers", pct: "pcts" };
  if (it.props.includes(key)) {
    it.props = it.props.filter((k) => k !== key);
  } else {
    it.props.push(key);
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
function saveFocused() { saveDay(state.focusDay || APP_TODAY); }
function saveDay(date) {
  state.dayMenu = null;
  publishDay(date);
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
async function publishDay(date, opts = {}) {
  const day = cal()[date];
  const person = athlete();
  if (!person || person.id === "none") { if (!opts.quiet) toast("Create a group or athlete first"); return; }
  if (!day || !day.items.length) { if (!opts.quiet) toast("Add an exercise before saving"); return; }
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
    for (const it of day.items) {
      if (!it.name || it.type === "break") continue;
      const category = it.type === "circuit" ? "Circuit" : it.type === "questionnaire" ? "Questionnaire" : "Strength";
      const ex = await ensureExercise(it.name, category);
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
        notes: itemNotes(it)
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
    state.athleteWorkouts[date] = workout;
    if (!opts.quiet && day.recurWeeks) {
      const copies = refreshFutureCopies(date);
      for (const copyDate of copies) {
        try { await publishDay(copyDate, { quiet: true }); } catch (err) { console.error(err); }
      }
    }
    if (!opts.quiet && state.auth && state.auth.token) {
      loadGymContext();
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
async function logAthleteSet(weId, setNumber, field, value) {
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
  if (field === "weight") current.weight = value;
  else if (field === "reps") current.reps = value;
  else if (field === "rest") current.rest_seconds = value;
  else if (field === "completed") current.completed = !!value;
  else {
    details[field] = value;
    current.details = JSON.stringify(details);
  }
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
    items: workoutToDayItems(workout)
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
  const openAttr = day ? ` onclick="openAthleteDay('${date}')"` : "";
  return `<div class="day ${day ? "read" : "rest-day"} ${open}" data-day="${date}"${openAttr}>
    <div class="day-top"><span>${fmtDay(date)}</span></div>
    <div class="week-label">${esc((day && day.weekLabel) || weekName(date))}</div>
    <div class="day-title ${day ? "" : "placeholder"}">${day ? esc(day.title || "Workout") : "Rest"}</div>
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
    const sets = it.sets || 1;
    for (let i = 0; i < sets; i++) {
      const log = (state.openSession.set_logs || []).find((row) => row.workout_exercise_id === it.weId && row.set_number === i + 1) || {};
      const details = logDetails(log);
      const touched = setLogTouched(log);
      cells[i] = {
        w: touched && log.weight != null && log.weight !== "" ? log.weight : ((it.loads && it.loads[i]) || ""),
        r: touched && log.reps != null && log.reps !== "" ? log.reps : ((it.reps && it.reps[i]) || ""),
        rest: log.rest_seconds != null && log.rest_seconds !== "" ? log.rest_seconds : ((it.rests && (it.rests[i] || it.rests[0])) || ""),
        tempo: details.tempo != null && details.tempo !== "" ? details.tempo : ((it.tempos && (it.tempos[i] || it.tempos[0])) || ""),
        velocity: details.velocity || ((it.velocities && (it.velocities[i] || it.velocities[0])) || ""),
        power: details.power || ((it.powers && (it.powers[i] || it.powers[0])) || ""),
        pct: details.pct || ((it.pcts && (it.pcts[i] || it.pcts[0])) || ""),
        done: !!log.completed
      };
    }
    state.logs[key] = { cells, hydrated: true };
  });
}
function athleteOpenPanel() {
  if (!state.athleteOpenDate) return "";
  const day = savedDay(state.athleteOpenDate);
  if (!day) return "";
  const body = state.openWorkout && state.openWorkout.id === day.workoutId
    ? state.openWorkout.exercises.map((we) => athleteExercise(we)).join("")
    : day.items.map((it) => `<div class="ex-name" style="margin:8px 0">${esc(it.letter || "")} ${esc(it.name)}<div class="ex-sub">${esc(scriptLine(it))}</div></div>`).join("");
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
  return `<form class="note-box" onsubmit="sendAthleteNote(event, ${workoutId}); return false;">
    <label>Note to your coach</label>
    <textarea id="athlete-note" placeholder="How did this workout feel?">${esc(existing)}</textarea>
    <button class="req" type="submit">Send note</button>
    ${existing ? `<div class="hint">Sent: ${esc(existing)}</div>` : ""}
  </form>`;
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
  const sets = we.prescribed_sets || 1;
  const reps = String(we.target_reps || "").split(",");
  const loads = String(we.target_weight || "").split(",");
  const rests = noteValues(we, "Rests");
  const extras = [
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
      <td><input aria-label="Reps set ${n}" value="${esc(shownReps)}" onchange="logAthleteSet(${we.id}, ${n}, 'reps', this.value)"></td>
      <td><input aria-label="Rest set ${n}" value="${esc(rest)}" onchange="logAthleteSet(${we.id}, ${n}, 'rest', this.value)"></td>
      ${extraCells}
      <td><input aria-label="Done set ${n}" type="checkbox" ${log.completed ? "checked" : ""} onchange="logAthleteSet(${we.id}, ${n}, 'completed', this.checked)"></td></tr>`;
  }).join("");
  const skip = { Rests: 1, Tempos: 1, Velocities: 1, Powers: 1, Pcts: 1 };
  const note = String(we.notes || "").split("\n").filter((line) => !skip[line.split(":")[0]]).join(" · ");
  const heads = extras.map((field) => `<th>${esc(field.label)}</th>`).join("");
  return `<div style="margin:12px 0">
    <strong>${esc(we.superset_group || "")} ${esc((we.exercise && we.exercise.name) || "Exercise")}</strong>
    <div class="hint">${esc(we.prescription_text || "")}${note ? " · " + esc(note) : ""}</div>
    <table class="sets"><tr><th>Set</th><th>Kg</th><th>Reps</th><th>Rest (s)</th>${heads}<th>Done</th></tr>${rows}</table>
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
  if (!state.clipboard || !(state.clipboard.items || []).length) return;
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

function previewItems(day) {
  return (day.items || []).filter((it) => it.type !== "break");
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
  state.sidebar = false;
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
  const rows = Array.from({ length: n }, (_, i) => {
    const rep = esc((it.reps || [])[i] ?? "");
    const load = esc((it.loads || [])[i] ?? "");
    if (loaded) {
      return `<tr><td>${i + 1}</td><td><span class="preview-box">${load}</span></td><td><span class="preview-box">${rep}</span></td></tr>`;
    }
    return `<tr><td>${i + 1}</td><td>${rep}</td></tr>`;
  }).join("");
  const head = loaded
    ? "<tr><th>SET</th><th>WEIGHT</th><th>REPS</th></tr>"
    : "<tr><th>SET</th><th>REPS</th></tr>";
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

function sidebarHtml() {
  const recent = [];
  Object.values(cal()).forEach((day) => day.items.forEach((it) => {
    if (!recent.some((r) => r.name === it.name)) recent.push(it);
  }));
  return `<aside class="sidebar">
    <div class="crumbs">Collections / ${esc(athlete().name)}</div>
    <select class="ghost" style="width:100%" onchange="switchAthlete(this.value)">${buildAthletes().map((a) => `<option value="${esc(a.id)}" ${a.id === state.athleteId ? "selected" : ""}>${esc(a.name)}</option>`).join("")}</select>
    <h4>Saved on this calendar</h4>
    ${recent.slice(0, 8).map((it) => `<button class="side-item" onclick="goTool('entry');state.entryAthlete=state.athleteId;render()">${esc(it.name)}<small>${esc(scriptLine(it))}</small></button>`).join("")}
    ${state.historyOpen ? `<h4>Action history</h4>${state.history.map((h) => `<div class="history">${esc(h.t)} ${esc(h.text)}</div>`).join("") || '<div class="hint">No actions yet</div>'}` : ""}
    <div style="flex:1"></div>
    <button class="ghost" onclick="goTool('entry');state.entryAthlete=state.athleteId">View in Workout Entry →</button>
  </aside>`;
}

function undo() {
  if (!state.undo.length) return;
  const prev = state.undo.pop();
  if (!prev) return;
  state.calendars = JSON.parse(prev);
  state.editor = null;
  toast("Undone");
  render();
}

function importedDataPanel(day) {
  const items = (day && day.items) || [];
  const logs = ((state.openSession && state.openSession.set_logs) || []).filter((log) => setLogTouched(log));
  const rows = logs.map((log) => {
    const item = items.find((it) => it.weId === log.workout_exercise_id);
    return `<tr><td>${esc((item && item.name) || "Exercise")}</td><td>${esc(log.set_number)}</td><td>${esc(log.weight)}</td><td>${esc(log.reps)}</td></tr>`;
  }).join("");
  const body = rows
    ? `<table class="data"><tr><th>Exercise</th><th>Set</th><th>Kg</th><th>Reps</th></tr>${rows}</table>`
    : `<p class="hint">No Imported Data for this session.</p>`;
  return `<div class="panel" style="margin-top:10px"><strong>Imported Data</strong>${body}</div>`;
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
function entryView() {
  if (state.role === "athlete") return athleteEntryView();
  queueCoachEntrySession();
  const who = state.entryAthlete;
  const athleteObj = ATHLETES.find((a) => a.id === who) || buildAthletes().find((a) => a.id === who && !a.isGroup);
  const activeWho = athleteObj ? athleteObj.id : null;
  const day = activeWho ? ensureDay(state.entryDate, activeWho) : null;
  const week = sundayOf(state.entryDate);
  const days = Array.from({ length: 7 }, (_, i) => addDays(week, i));
  const summary = summarize(activeWho, state.entryDate);
  return `<section class="stage light-page">
    <h1 style="font-size:18px;color:#666;font-weight:600">Workout Entry</h1>
    <div class="entry-wrap">
      <div>
        ${athleteObj ? `<div class="panel athlete-mini">
            <div class="bigav">${esc((athleteObj.name || "A").slice(0, 1))}</div>
            <strong>${esc(athleteObj.name)}</strong>
            <div><button class="switch" onclick="state.entryOpen=!state.entryOpen;render()">SWITCH ATHLETE</button></div>
            ${state.entryOpen ? athletePicker() : ""}
            <button class="blackbtn" onclick="goTool('exercises')">Program Library</button>
            <button class="blackbtn" onclick="window.print()">Print Workout</button>
            <button class="blackbtn" onclick="state.view='build';state.athleteId='${esc(activeWho)}';state.weekStart=sundayOf('${state.entryDate}');render()">Go to Calendar</button>
          </div>` : `<div class="panel">${athletePicker()}</div>`}
      </div>
      <div class="panel">
        ${athleteObj ? `<div class="weekstrip">
            <button class="iconbtn" style="color:#333" onclick="state.entryDate=addDays(state.entryDate,-7);render()">‹</button>
            <div style="text-align:center"><div>${fmtLong(state.entryDate).replace(/,.*/, "")}</div>
              <div>${days.map((d) => `<button class="d ${d === state.entryDate ? "on" : ""}" onclick="state.entryDate='${d}';render()">${new Date(d + "T12:00:00").getDate()}</button>`).join("")}</div>
            </div>
            <button class="iconbtn" style="color:#333" onclick="state.entryDate=addDays(state.entryDate,7);render()">›</button>
          </div>
          <h3>${esc(day.title || "Workout")}</h3>
          ${day.items.map((it) => entryItem(activeWho, state.entryDate, it)).join("") || '<div class="empty">No exercises this day</div>'}` : `<div class="empty"><div><div class="book">◎</div><div>Please Select An Athlete</div></div></div>`}
      </div>
      <div>
        <div class="panel"><strong>Session Summary</strong><div class="kpis" style="margin-top:8px">
          <div class="kpi"><b>${summary.sets}</b><span>Sets Completed</span></div>
          <div class="kpi"><b>${summary.reps}</b><span>Total Reps</span></div>
          <div class="kpi"><b>${summary.tonnage}</b><span>Tonnage</span></div>
          <div class="kpi"><b>${summary.duration}</b><span>Session Duration</span></div>
        </div></div>
        ${importedDataPanel(day)}
        <div class="panel" style="margin-top:10px"><strong>New PR's</strong><p class="hint">${summary.prs || "No PRs for this Session"}</p></div>
      </div>
    </div>
  </section>`;
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
  const week = sundayOf(state.entryDate);
  const days = Array.from({ length: 7 }, (_, i) => addDays(week, i));
  const summary = summarize(who.id, state.entryDate);
  return `<section class="stage light-page" id="workout-entry">
    <h1 style="font-size:18px;color:#666;font-weight:600">Workout Entry</h1>
    <div class="entry-wrap">
      <div>
        <div class="panel athlete-mini">
          <div class="bigav">${esc((who.name || "A").slice(0, 1))}</div>
          <strong>${esc(who.name)}</strong>
          <button class="blackbtn" type="button" onclick="go('mine')">My Schedule</button>
          <button class="blackbtn" type="button" onclick="window.print()">Print Workout</button>
        </div>
      </div>
      <div class="panel">
        <div class="weekstrip">
          <button class="iconbtn" style="color:#333" type="button" onclick="selectEntryDate(addDays(state.entryDate,-7))">‹</button>
          <div style="text-align:center"><div>${fmtLong(state.entryDate).replace(/,.*/, "")}</div>
            <div>${days.map((d) => `<button class="d ${d === state.entryDate ? "on" : ""}" type="button" onclick="selectEntryDate('${d}')">${new Date(d + "T12:00:00").getDate()}</button>`).join("")}</div>
          </div>
          <button class="iconbtn" style="color:#333" type="button" onclick="selectEntryDate(addDays(state.entryDate,7))">›</button>
        </div>
        <h3>${esc(day.items.length ? (day.title || "Workout") : "Rest")}</h3>
        ${day.items.map((it) => entryItem(who.id, state.entryDate, it)).join("") || '<div class="empty">No exercises this day</div>'}
        ${ownAthleteSession() && day.workoutId ? noteForm(day.workoutId) : ""}
      </div>
      <div>
        <div class="panel"><strong>Session Summary</strong><div class="kpis" style="margin-top:8px">
          <div class="kpi"><b>${summary.sets}</b><span>Sets Completed</span></div>
          <div class="kpi"><b>${summary.reps}</b><span>Total Reps</span></div>
          <div class="kpi"><b>${summary.tonnage}</b><span>Tonnage</span></div>
          <div class="kpi"><b>${summary.duration}</b><span>Session Duration</span></div>
        </div></div>
        ${importedDataPanel(day)}
        <div class="panel" style="margin-top:10px"><strong>New PR's</strong><p class="hint">${summary.prs || "No PRs for this Session"}</p></div>
      </div>
    </div>
  </section>`;
}
function athletePicker() {
  return `<input class="plain" placeholder="Search" style="width:100%;margin:8px 0" data-focus="ath-search" oninput="state.athQ=this.value;render()">
    ${ATHLETES.filter((a) => !state.athQ || a.name.toLowerCase().includes(state.athQ.toLowerCase())).map((a) => `<button class="opt" style="color:#222" onclick="pickAthlete('${a.id}')"><span class="dotav">${esc(a.name[0])}</span> ${esc(a.name)}</button>`).join("") || `<div class="hint" style="padding:8px 0">No athletes yet. Add athletes in Manage Users.</div>`}
    <label class="chk"><input type="checkbox" ${state.showHidden ? "checked" : ""} onchange="state.showHidden=this.checked"> View workouts hidden from athletes</label>`;
}
function pickAthlete(id) {
  state.entryAthlete = id;
  state.entryOpen = false;
  state.athleteId = id;
  if (!state.startedAt) state.startedAt = Date.now();
  render();
  loadCalendarSchedule(id);
}
function entryItem(aid, date, it) {
  const key = aid + ":" + date + ":" + it.id;
  const open = state.entryItem === it.id;
  const fields = [["w", "Kg"], ["r", "Reps"]];
  if (state.role === "athlete") {
    fields.push(["rest", "Rest (s)"]);
    if ((it.tempos || []).some((v) => String(v || "").trim())) fields.push(["tempo", "Tempo"]);
    if ((it.velocities || []).some((v) => String(v || "").trim())) fields.push(["velocity", "Velocity"]);
    if ((it.powers || []).some((v) => String(v || "").trim())) fields.push(["power", "Power"]);
    if ((it.pcts || []).some((v) => String(v || "").trim())) fields.push(["pct", "%1RM"]);
  }
  const rows = Array.from({ length: it.sets || 1 }, (_, i) => {
    const log = (state.logs[key] && state.logs[key].cells && state.logs[key].cells[i]) || {
      w: (it.loads && it.loads[i]) || "",
      r: (it.reps && it.reps[i]) || "",
      rest: (it.rests && (it.rests[i] || it.rests[0])) || "",
      tempo: (it.tempos && (it.tempos[i] || it.tempos[0])) || "",
      velocity: (it.velocities && (it.velocities[i] || it.velocities[0])) || "",
      power: (it.powers && (it.powers[i] || it.powers[0])) || "",
      pct: (it.pcts && (it.pcts[i] || it.pcts[0])) || "",
      done: false
    };
    const cells = fields.map(([field, label]) => `<td><input aria-label="${esc(label)} set ${i + 1}" value="${esc(log[field] ?? "")}" onchange="logCell('${key}',${i},'${field}',this.value,'${date}','${it.id}',${it.weId || 0})"></td>`).join("");
    return `<tr><td>${i + 1}</td>${cells}<td><input aria-label="Done set ${i + 1}" type="checkbox" ${log.done ? "checked" : ""} onchange="logCell('${key}',${i},'done',this.checked,'${date}','${it.id}',${it.weId || 0})"></td></tr>`;
  }).join("");
  const table = it.type === "questionnaire"
    ? (it.questions || []).map((q) => `<label class="chk"><input type="checkbox" onchange="logCheck('${key}', this.checked)"> ${esc(q)}</label>`).join("")
    : `<table class="sets"><tr><th>Set</th>${fields.map((field) => `<th>${field[1]}</th>`).join("")}<th></th></tr>${rows}</table>`;
  const safeName = String(it.name || "Exercise").replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  return `<div>
    <button class="entry-item" onclick="state.entryItem=state.entryItem==='${it.id}'?null:'${it.id}';render()">
      <span class="letter" style="background:${LETTER_COLOR[it.letter] || "#999"}">${esc(it.letter || "•")}</span>
      <span><strong>${esc(it.name)}</strong><div class="hint">${esc(scriptLine(it))}</div></span>
    </button>
    ${open ? `<div style="padding:6px 8px 10px">${table}<button class="complete" onclick="markDone('${key}','${safeName}',${it.weId || 0},${it.sets || 1})">Complete</button></div>` : ""}
  </div>`;
}
function logCell(key, i, field, value, date, itemId, weId) {
  const log = state.logs[key] || (state.logs[key] = { cells: {}, hydrated: true });
  log.hydrated = true;
  log.cells[i] = log.cells[i] || { w: "", r: "", rest: "", done: false };
  log.cells[i][field] = field === "done" ? !!value : value;
  const map = { w: "weight", r: "reps", rest: "rest", done: "completed", tempo: "tempo", velocity: "velocity", power: "power", pct: "pct" };
  if (weId && state.openSession && map[field] && (state.role === "athlete" || state.coachSessionFor)) {
    logAthleteSet(weId, i + 1, map[field], log.cells[i][field]);
    return;
  }
  render();
}
function logCheck(key) { state.logs[key] = { done: true, hydrated: true }; }
async function markDone(key, name, weId, sets) {
  const log = state.logs[key] || (state.logs[key] = { cells: {}, hydrated: true });
  log.done = true;
  log.hydrated = true;
  const count = sets || 1;
  for (let i = 0; i < count; i++) {
    log.cells[i] = log.cells[i] || { w: "", r: "", done: false };
    log.cells[i].done = true;
    if (weId && state.openSession && (state.role === "athlete" || state.coachSessionFor)) {
      await logAthleteSet(weId, i + 1, "completed", true);
    }
  }
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

const FEED = [];
function feedView() {
  if (state.feedMode === "journal") return journalView();
  if (state.feedMode === "team") return teamView();
  const sessions = (state.gymActivity && state.gymActivity.sessions) || [];
  const rawFeed = sessions.length
    ? sessions.map((s) => [
        s.athlete_name || "Athlete",
        s.workout_title || "Workout",
        s.date || "",
        s.athlete_note || s.notes || (s.tonnage ? `Completed session · ${s.tonnage} kg tonnage` : `Status: ${s.status || "logged"}`)
      ])
    : FEED;
  const cards = rawFeed.filter((row) => {
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
    ${cards.length ? `<div class="grid-cards">${cards.map((c, i) => feedCard(c, i)).join("")}</div>` : `<div class="empty"><div><div class="book">✎</div><div>No athlete workout activity or notes logged yet.</div></div></div>`}
  </section>`;
}
function setFeedMode(v) { state.feedMode = v; render(); }
function feedCard(c, i) {
  const extra = state.comments[i] ? `<div class="hint">Coach: ${esc(state.comments[i])}</div>` : "";
  return `<article class="card">
    <div class="who"><span class="dotav">${esc((c[0] || "A")[0])}</span><div><strong>${esc(c[0])}</strong><div class="hint">${esc(c[2])}</div></div></div>
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
  return `<section class="stage light-page" id="journal">
    <div class="feed-top"><div><h1>My Journal</h1><div class="filters">${esc(state.role === "athlete" ? signedInName() : "Your notes")}</div></div>
      <button class="req" type="button" onclick="state.modal={type:'journal'};render()">New entry</button>
    </div>
    ${state.journal.length ? `<div class="grid-cards">${state.journal.map((j) => `<article class="card"><strong>${esc(j.title)}</strong><p>${esc(j.body)}</p><div class="hint">${esc(j.date)}</div></article>`).join("")}</div>` : `<div class="empty"><div><div class="book">📓</div><div>No entries yet</div></div></div>`}
  </section>`;
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
  const ctx = state.gymContext;
  const teams = ctx && Array.isArray(ctx.teams) ? ledTeams(ctx) : [];
  let main = "";
  if (state.userTab === "codes") state.userTab = "groups";
  if (state.userTab === "groups") {
    if (ctx && Array.isArray(ctx.teams)) {
      const allCodes = (ctx.codes || []).filter((c) => c.kind === "team");
      const allAthletes = ctx.athletes || [];
      const cards = teams.map((t) => {
        const codes = allCodes.filter((c) => c.team_id === t.id);
        const codeHtml = codes.length
          ? codes.map((c) => `<div class="code-line"><code>${esc(c.code)}</code><button class="icon-a" type="button" onclick="copyText('${esc(c.code)}')">Copy</button><button class="icon-a" type="button" onclick="deleteServerJoinCode(${c.id})">✕</button></div>`).join("")
          : `<div class="hint">No athlete codes yet</div>`;
        const members = allAthletes.filter((a) => a.team_id === t.id);
        const who = members.map((a) => esc(a.name) + (a.email ? " · " + esc(a.email) : "")).join("<br>");
        return `<article class="card"><strong>${esc(t.name)}</strong><div class="hint" style="margin-top:8px">${who || "No athletes"}</div><div class="group-codes"><div class="hint">Athlete join codes</div>${codeHtml}<button class="req" type="button" onclick="createJoinCode('team', ${t.id})">+ Code</button></div><div style="margin-top:8px"><button class="comment" type="button" onclick="editServerGroup(${t.id}, '${esc(t.name)}')">Edit</button> <button class="comment" type="button" onclick="deleteServerGroup(${t.id})">Remove</button></div></article>`;
      }).join("");
      main = `<div class="light-page"><h1>Groups</h1>
        <p class="hint">Create and manage your athlete groups and team join codes here. Athletes who redeem a group's join code are automatically placed into that group.</p>
        <form class="toolbar" onsubmit="addGroupRecord(); return false;">
          <input class="plain" placeholder="Group name" data-focus="group-name" value="${esc(state.toolForm.group || "")}" oninput="state.toolForm.group=this.value">
          <button class="req" type="submit">Add group</button>
        </form>
        <div class="grid-cards">${cards || `<p class="hint">Add a group above to get started and generate athlete join codes.</p>`}</div></div>`;
    } else {
      const cards = state.groups.map((g, i) => {
        const codes = state.joinCodes.map((c, idx) => ({ c, idx })).filter((row) => row.c.group === g);
        const codeHtml = codes.length
          ? codes.map(({ c, idx }) => `<div class="code-line"><code>${esc(c.code)}</code><button class="icon-a" type="button" onclick="copyJoinCode(${idx})">Copy</button><button class="icon-a" type="button" onclick="removeJoinCode(${idx})">✕</button></div>`).join("")
          : `<div class="hint">No athlete codes yet</div>`;
        const members = state.athletes.filter((a) => assignedGroups(a.groups).includes(g));
        const who = members.map((a) => {
          const name = (a.first + " " + a.last).trim();
          return esc(name) + (a.email ? " · " + esc(a.email) : "");
        }).join("<br>");
        return `<article class="card"><strong>${esc(g)}</strong><div class="hint" style="margin-top:8px">${who || "No athletes"}</div><div class="group-codes"><div class="hint">Athlete codes</div>${codeHtml}<button class="req" type="button" onclick="addJoinCode(${i})">+ Code</button></div><div style="margin-top:8px"><button class="comment" type="button" onclick="editGroup(${i})">Edit</button> <button class="comment" type="button" onclick="removeGroup(${i})">Remove</button></div></article>`;
      }).join("");
      main = `<div class="light-page"><h1>Groups</h1>
        <p class="hint">Athlete join codes live on each group. Create a code from that group's card.</p>
        <form class="toolbar" onsubmit="addGroupRecord(); return false;">
          <input class="plain" placeholder="Group name" data-focus="group-name" value="${esc(state.toolForm.group || "")}" oninput="state.toolForm.group=this.value">
          <button class="req" type="submit">Add group</button>
        </form>
        <div class="grid-cards">${cards || `<p class="hint">Add a group before creating an athlete code.</p>`}</div></div>`;
    }
  } else if (state.userTab === "upload") {
    if (teams.length) {
      const chosenId = teams.some((t) => String(t.id) === String(state.toolForm.uploadTeamId))
        ? String(state.toolForm.uploadTeamId)
        : String(teams[0].id);
      main = `<div class="light-page"><h1>Upload Users</h1>
        <p>Paste one athlete per line (e.g. <code>Sam Lee</code> or <code>Jo Kim, jo@gym.com</code>). Athletes are created in the database and assigned directly to the selected group.</p>
        <div class="toolbar">
          <label>Group <select id="uploadGroup" class="plain" onchange="state.toolForm.uploadTeamId=this.value">
            ${teams.map((t) => `<option value="${t.id}" ${String(t.id) === chosenId ? "selected" : ""}>${esc(t.name)}</option>`).join("")}
          </select></label>
        </div>
        <textarea id="uploadBox" class="plain" style="width:100%;min-height:140px" placeholder="Sam Lee&#10;Jo Kim, jo@gym.com"></textarea>
        <button class="req" style="margin-top:10px" onclick="importUsers()">Import Athletes</button>
      </div>`;
    } else if (state.groups.length) {
      const chosen = state.groups.includes(state.toolForm.uploadGroup) ? state.toolForm.uploadGroup : (state.groups[0] || "");
      main = `<div class="light-page"><h1>Upload Users</h1>
        <p>Paste one person per line. If a line includes an email, that email is kept.</p>
        <div class="toolbar">
          <label>Group <select id="uploadGroup" class="plain" onchange="state.toolForm.uploadGroup=this.value">
            ${state.groups.map((g) => `<option value="${esc(g)}" ${g === chosen ? "selected" : ""}>${esc(g)}</option>`).join("")}
          </select></label>
        </div>
        <textarea id="uploadBox" class="plain" style="width:100%;min-height:140px" placeholder="Sam Lee&#10;Jo Kim, jo@gym.com"></textarea>
        <button class="req" style="margin-top:10px" onclick="importUsers()">Import</button>
      </div>`;
    } else {
      main = `<div class="light-page"><h1>Upload Users</h1>
        <p class="hint">Create a group first so uploaded athletes can be placed into your group.</p>
        <button class="req" type="button" onclick="state.userTab='groups';render()">Go to Groups →</button>
      </div>`;
    }
  } else if (state.userTab === "export") {
    main = `<div class="light-page"><h1>Export Data</h1><p>Download calendars and roster as JSON.</p><button class="req" onclick="exportData()">Download</button></div>`;
  } else {
    const selectedRole = state.toolForm.role || (state.userTab === "coaches" ? "coach" : "student");
    const chosenTeamId = teams.some((t) => String(t.id) === String(state.toolForm.userTeamId))
      ? String(state.toolForm.userTeamId)
      : (teams[0] ? String(teams[0].id) : "");
    main = `<form class="toolbar" onsubmit="addUserRecord(event); return false;" style="padding:10px 12px 0;flex-wrap:wrap">
      <input class="plain" placeholder="First" data-focus="user-first" value="${esc(state.toolForm.first || "")}" oninput="state.toolForm.first=this.value">
      <input class="plain" placeholder="Last" data-focus="user-last" value="${esc(state.toolForm.last || "")}" oninput="state.toolForm.last=this.value">
      <input class="plain" placeholder="Email" data-focus="user-email" value="${esc(state.toolForm.email || "")}" oninput="state.toolForm.email=this.value">
      <select class="plain" onchange="state.toolForm.role=this.value;render()"><option value="student" ${selectedRole !== "coach" ? "selected" : ""}>Athlete</option><option value="coach" ${selectedRole === "coach" ? "selected" : ""}>Coach</option></select>
      ${selectedRole !== "coach" && teams.length ? `<select class="plain" id="user-team-id" onchange="state.toolForm.userTeamId=this.value">${teams.map((t) => `<option value="${t.id}" ${String(t.id) === chosenTeamId ? "selected" : ""}>Group: ${esc(t.name)}</option>`).join("")}</select>` : ""}
      <button class="req" type="submit">Add user</button>
    </form>
    <div class="redbar"><span>${state.userTab === "coaches" ? "Coaches" : "Athletes"}</span>
      <span><select class="plain" onchange="state.userSort=this.value;render()"><option value="last">Last Name</option><option value="first">First Name</option></select>
      <input class="plain" placeholder="Search for User" data-focus="user-q" value="${esc(state.userQ)}" oninput="state.userQ=this.value;render()"></span></div>
      <div class="tablewrap"><table class="data"><tr><th></th><th>FIRST</th><th>LAST</th><th>EMAIL</th><th>ASSIGNED GROUPS</th><th>ASSIGNED CALS</th><th>LAST ACTIVITY</th><th></th></tr>
      ${filtered.sort((a, b) => (a[state.userSort] || "").localeCompare(b[state.userSort] || "")).map((r) => `<tr><td><span class="dotav">${esc((r.first || "U")[0])}</span></td><td>${esc(r.first)}</td><td>${esc(r.last)}</td><td>${esc(r.email)}</td><td>${esc(r.groups)}</td><td>${esc(r.cals)}</td><td style="color:${r.activity === "N/A" ? "#c90" : "#1a7f37"}">${esc(r.activity)}</td><td><button class="icon-a" onclick="editUser('${r.id}')">✎</button> <button class="icon-a" onclick="removeUser('${r.id}')">🗑</button></td></tr>`).join("") || `<tr><td colspan="8" style="text-align:center;color:#777;padding:18px">No ${state.userTab === "coaches" ? "coaches" : "athletes"} found. Use "Upload Users" or the form above to add people.</td></tr>`}
      </table></div>`;
  }
  return `<section class="stage" style="display:flex;flex-direction:column;min-height:calc(100vh - 48px)"><div class="users" style="flex:1">
    <nav>
      <div class="sec" style="color:#fff;font-size:15px;letter-spacing:0;padding:16px 14px 8px">Manage Users</div>
      <div class="sec">MANAGEMENT</div>
      ${tab("athletes", "Athletes")}${tab("coaches", "Coaches")}${tab("groups", "Groups")}
      <div class="sec">TOOLS</div>
      ${tab("upload", "Upload Users")}${tab("export", "Export Data")}
    </nav>
    <div style="display:flex;flex-direction:column;min-width:0;background:#eee">${main}</div>
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
function exerciseFields(row) {
  const bucket = exBucket(row.category);
  const fields = [
    { key: "name", label: "Name", value: row.name || "" },
    { key: "category", label: "Category", value: row.category || "Strength", options: ["Strength", "Circuit", "Questionnaire"] },
    { key: "video_url", label: "YouTube link", value: row.video_url || "" }
  ];
  if (bucket === "Circuits") {
    fields.push(
      { key: "default_stations", label: "Stations", value: row.default_stations || "", multiline: true },
      { key: "default_sets", label: "Rounds", value: String(row.default_sets || 1), type: "number" },
      { key: "default_notes", label: "Additional info", value: row.default_notes || "", multiline: true, maxlength: 255 }
    );
    return fields;
  }
  if (bucket === "Questionnaires") return fields;
  fields.push(
    { key: "default_sets", label: "Default sets", value: String(row.default_sets || 3), type: "number" },
    { key: "default_reps", label: "Default reps", value: row.default_reps != null ? String(row.default_reps) : "10" },
    { key: "default_load", label: "Default load", value: row.default_load || "" },
    { key: "default_rest", label: "Default rest", value: row.default_rest || "" },
    { key: "default_tempo", label: "Default tempo", value: row.default_tempo || "" },
    { key: "default_velocity", label: "Default velocity", value: row.default_velocity || "" },
    { key: "default_power", label: "Default peak power", value: row.default_power || "" },
    { key: "default_pct", label: "Default %PR", value: row.default_pct || "" }
  );
  return fields;
}
function editExercise(id) {
  const row = state.serverExercises.find((e) => e.id === id);
  if (!row) return;
  const circuit = exBucket(row.category) === "Circuits";
  openEdit({
    title: circuit ? "Edit circuit" : "Edit exercise",
    fields: exerciseFields(row),
    onSave: async (values) => {
      const name = (values.name || "").trim();
      if (!name) { toast("Name the exercise"); return; }
      const previous = row.name;
      row.name = name;
      row.category = values.category || "Strength";
      row.video_url = values.video_url || "";
      if (values.default_sets != null && values.default_sets !== "") {
        row.default_sets = Math.max(1, Math.min(10, parseInt(values.default_sets, 10) || 1));
      }
      ["default_reps", "default_load", "default_rest", "default_tempo", "default_velocity", "default_power", "default_pct", "default_stations", "default_notes"].forEach((key) => {
        if (values[key] != null) row[key] = key === "default_notes" ? String(values[key]).slice(0, 255) : values[key];
      });
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
        <select class="plain" aria-label="Exercise list" onchange="state.managing=this.value;state.toolForm.exCat='';render()">${["Lifts", "Circuits", "Questionnaires"].map((t) => `<option ${state.managing === t ? "selected" : ""}>${t}</option>`).join("")}</select>
      </h1></div>
      <form class="toolbar" onsubmit="addExerciseRecord(); return false;">
        <input class="plain" placeholder="Exercise name" data-focus="ex-name" value="${esc(state.toolForm.exName || "")}" oninput="state.toolForm.exName=this.value">
        <select class="plain" aria-label="Category" onchange="state.toolForm.exCat=this.value">
          ${["Strength", "Circuit", "Questionnaire"].map((c) => `<option ${managingCategory() === c ? "selected" : ""}>${c}</option>`).join("")}
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
function managingCategory() {
  if (state.toolForm.exCat) return state.toolForm.exCat;
  if (state.managing === "Circuits") return "Circuit";
  if (state.managing === "Questionnaires") return "Questionnaire";
  return "Strength";
}
function syncCatalogExercise(e, previousName) {
  const bucket = exBucket(e.category);
  const type = bucket === "Circuits" ? "circuit" : bucket === "Questionnaires" ? "questionnaire" : "lift";
  const previous = String(previousName || e.name || "").toLowerCase();
  const found = CATALOG.find((c) => c.name.toLowerCase() === previous)
    || CATALOG.find((c) => c.name.toLowerCase() === String(e.name || "").toLowerCase());
  if (found) {
    if (found.type === "lift" || found.type === "circuit" || found.type === "questionnaire") found.type = type;
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
    render();
  } catch (err) { console.error(err); }
}
async function addExerciseRecord() {
  const name = (state.toolForm.exName || "").trim();
  const category = managingCategory();
  if (!name) { toast("Name the exercise"); return; }
  const circuit = exBucket(category) === "Circuits";
  try {
    const created = await api("POST", "/api/exercises", {
      name,
      category,
      default_sets: circuit ? 1 : 3,
      default_reps: circuit ? "1" : "10"
    });
    state.serverExercises.push(created);
    syncCatalogExercise(created);
    state.managing = exBucket(category);
    state.toolForm.exName = "";
    state.toolForm.exCat = "";
    toast("Exercise added");
    render();
  } catch (err) {
    toast("Could not add that exercise");
    console.error(err);
  }
}
async function saveExerciseName(id, previousName) {
  const row = state.serverExercises.find((e) => e.id === id);
  if (!row || !String(row.name || "").trim()) return false;
  const payload = {
    name: row.name.trim(),
    category: row.category || "Strength",
    video_url: row.video_url || "",
    default_notes: row.default_notes || "",
    default_sets: Math.max(1, Math.min(10, parseInt(row.default_sets, 10) || 1)),
    default_reps: row.default_reps != null ? String(row.default_reps) : "10",
    default_load: row.default_load || "",
    default_rest: row.default_rest || "",
    default_tempo: row.default_tempo || "",
    default_velocity: row.default_velocity || "",
    default_power: row.default_power || "",
    default_pct: row.default_pct || "",
    default_stations: row.default_stations || ""
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
  const cards = ATHLETES.map((a) => {
    const day = (state.calendars[a.id] || {})[date];
    return `<article class="card"><div class="who"><span class="dotav">${esc((a.name || "A")[0])}</span><strong>${esc(a.name)}</strong></div><div class="exname">${day ? esc(day.title || "Workout") : "No session"}</div><p>${day ? day.items.length + " exercises" : "Rest / unassigned"}</p><button class="comment" onclick="state.entryAthlete='${a.id}';state.entryDate='${date}';goTool('entry')">Open entry</button></article>`;
  }).join("");
  return `<section class="stage light-page"><h1>Daily Brief</h1><p class="hint">${fmtLong(date)}</p><div class="grid-cards">${cards || `<p class="hint">No athletes enrolled yet.</p>`}</div></section>`;
}
function weightroomView() {
  const cards = ATHLETES.map((a) => `<article class="card"><strong>${esc(a.name)}</strong><div class="hint">${esc(a.team_name || "Athlete")} · ${esc(weekName(APP_TODAY))}</div><button class="comment" onclick="state.entryAthlete='${a.id}';goTool('entry')">Open</button></article>`).join("");
  return `<section class="stage light-page"><h1>Weightroom</h1><p class="hint">Who is on the floor today</p><div class="grid-cards">${cards || `<p class="hint">No athletes enrolled yet. Add athletes in Manage Users → Upload Users.</p>`}</div></section>`;
}
function boardView() {
  if (!state.boardDate) state.boardDate = state.entryDate || APP_TODAY;
  if (state.role === "athlete") {
    const name = viewedAthleteName();
    const day = savedDay(state.boardDate);
    const items = day && day.items ? day.items : [];
    return `<section class="stage light-page" id="whiteboard">
      <h1>Whiteboard</h1>
      <div class="toolbar">
        <input class="plain" type="date" aria-label="Day" value="${esc(state.boardDate)}" onchange="if(this.value){state.boardDate=this.value;render()}">
      </div>
      <p>${fmtLong(state.boardDate)} · ${esc(name)}</p>
      <div class="panel" style="font-size:22px">${items.map((it) => `<div>${esc(it.letter || "")} ${esc(it.name)} <span class="hint">${esc(scriptLine(it))}</span></div>`).join("") || "Nothing programmed"}</div>
    </section>`;
  }
  const targets = buildAthletes().filter((t) => t.id !== "none");
  if (!state.boardAthlete || !targets.some((a) => a.id === state.boardAthlete)) {
    state.boardAthlete = targets.some((a) => a.id === state.athleteId) ? state.athleteId : (targets[0] ? targets[0].id : "");
    if (state.boardAthlete) loadCalendarSchedule(state.boardAthlete);
  }
  const person = targets.find((a) => a.id === state.boardAthlete) || { id: "", name: "Athlete" };
  const day = (state.calendars[person.id] || {})[state.boardDate];
  const items = day && day.items ? day.items : [];
  return `<section class="stage light-page" id="whiteboard">
    <h1>Whiteboard</h1>
    <div class="toolbar">
      <select class="plain" aria-label="Athlete" onchange="state.boardAthlete=this.value;loadCalendarSchedule(this.value);render()">
        ${targets.map((a) => `<option value="${esc(a.id)}" ${a.id === person.id ? "selected" : ""}>${esc(a.name)}</option>`).join("") || `<option value="">No athletes or groups</option>`}
      </select>
      <input class="plain" type="date" aria-label="Day" value="${esc(state.boardDate)}" onchange="if(this.value){state.boardDate=this.value;render()}">
    </div>
    <p>${fmtLong(state.boardDate)} · ${esc(person.name)}</p>
    <div class="panel" style="font-size:22px">${items.map((it) => `<div>${esc(it.letter || "")} ${esc(it.name)} <span class="hint">${esc(scriptLine(it))}</span></div>`).join("") || "Nothing programmed"}</div>
  </section>`;
}
function maxesKey() {
  return state.role === "athlete" ? ("own:" + ownAthleteId()) : state.athleteId;
}
function maxesView() {
  const rows = state.serverRecords || [];
  const name = state.role === "athlete" ? viewedAthleteName() : (athlete() && athlete().name) || "Gym";
  return `<section class="stage light-page" id="maxes"><h1>Maxes / PRs · ${esc(name)}</h1>
    <form class="toolbar" onsubmit="addGoalRecord(); return false;">
      <input class="plain" placeholder="Lift (e.g. Back Squat)" data-focus="pr-name" value="${esc(state.toolForm.goalName || "")}" oninput="state.toolForm.goalName=this.value">
      <input class="plain" placeholder="Kg (e.g. 180)" data-focus="pr-kg" value="${esc(state.toolForm.goalWeight || "")}" oninput="state.toolForm.goalWeight=this.value">
      <button class="req" type="submit">+ PR</button>
    </form>
    <table class="data"><tr><th>Lift</th><th>Kg</th><th>Athlete</th><th></th></tr>${rows.map((r) => `<tr><td>${esc((r.exercise && r.exercise.name) || "Lift")}</td><td>${esc(r.weight)}</td><td>${esc((r.user && r.user.name) || signedInName())}</td><td><button class="comment" onclick="editGoal(${r.id})">Edit</button> <button class="comment" onclick="deleteGoalRecord(${r.id})">Delete</button></td></tr>`).join("") || `<tr><td colspan="4">No personal records yet.</td></tr>`}</table>
  </section>`;
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
  const scoreMap = new Map();
  dbRows.forEach((r) => {
    scoreMap.set(r.name, (scoreMap.get(r.name) || 0) + (r.tonnage || 0));
  });
  ATHLETES.forEach((a) => {
    let t = 0;
    Object.entries(state.logs).forEach(([k, log]) => {
      if (!k.startsWith(a.id + ":")) return;
      Object.values(log.cells || {}).forEach((c) => { if (c.done) t += (+c.r || 0) * (+c.w || 0); });
    });
    scoreMap.set(a.name, (scoreMap.get(a.name) || 0) + t);
  });
  const scores = Array.from(scoreMap.entries()).sort((a, b) => b[1] - a[1]);
  return `<section class="stage light-page"><h1>Leaderboard</h1><table class="data"><tr><th>#</th><th>Athlete</th><th>Tonnage (kg)</th></tr>${scores.map((s, i) => `<tr><td>${i + 1}</td><td>${esc(s[0])}</td><td>${Math.round(s[1])}</td></tr>`).join("") || `<tr><td colspan="3">No athletes or logged sessions yet.</td></tr>`}</table></section>`;
}
function evalView() {
  return `<section class="stage light-page"><h1>Evaluations</h1>${state.evals.map((e) => `<article class="card">${esc(e.text || e)}</article>`).join("") || '<div class="empty">No evaluations yet</div>'}<button class="req" onclick="addEvaluation()">+ Evaluation</button></section>`;
}
function addEvaluation() {
  const note = prompt("Evaluation note");
  if (!note) return;
  createSaved("evaluation", { text: note }).then((row) => {
    state.evals.push({ id: row.id, text: note });
    render();
  }).catch((err) => {
    toast(err.message || "Could not save that evaluation");
    render();
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
  return `<section class="stage light-page"><h1>Manage Calendars</h1>
    <form class="toolbar" onsubmit="addCalendar(); return false;">
      <input class="plain" placeholder="Athlete name" data-focus="cal-name" value="${esc(state.toolForm.calName || "")}" oninput="state.toolForm.calName=this.value">
      <input class="plain" placeholder="Email (optional)" data-focus="cal-email" value="${esc(state.toolForm.calEmail || "")}" oninput="state.toolForm.calEmail=this.value">
      <button class="req" type="submit">Add athlete calendar</button>
    </form>
    <div class="grid-cards">${targets.map((a) => `<article class="card">
      <strong>${esc(a.name)}</strong>
      <div class="hint">${programmedDayCount(a)} programmed days${a.email ? " · " + esc(a.email) : ""}</div>
      ${!a.isGroup ? `<button class="comment" onclick="editCalendar('${a.id}')">Edit</button>` : ""}
      <button class="comment" onclick="switchAthlete('${esc(a.id)}');state.view='build';render()">Open calendar</button>
    </article>`).join("") || `<p class="hint">No calendars yet. Create a group or upload athletes in Manage Users.</p>`}</div></section>`;
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
  return `<section class="stage light-page"><h1>Documents & Links</h1>
    <form class="toolbar" onsubmit="addDoc(); return false;">
      <input class="plain" placeholder="Name" data-focus="doc-name" value="${esc(state.toolForm.docName || "")}" oninput="state.toolForm.docName=this.value">
      <input class="plain" placeholder="URL" data-focus="doc-url" value="${esc(state.toolForm.docUrl || "")}" oninput="state.toolForm.docUrl=this.value">
      <button class="req" type="submit">Add link</button>
    </form>
    <div class="grid-cards">${state.docs.map((d, i) => `<article class="card">
      <strong>${esc(d.name)}</strong>
      <div class="hint">${esc(d.url)}</div>
      <div style="margin-top:8px"><a href="${esc(d.url)}" target="_blank">Open</a> <button class="comment" onclick="editDoc(${i})">Edit</button> <button class="comment" onclick="removeSaved('docs', ${i})">Remove</button></div>
    </article>`).join("") || `<p class="hint">No documents or links added yet.</p>`}</div></section>`;
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
  return `<section class="stage light-page"><h1>Packets & Sheets</h1>
    <form class="toolbar" onsubmit="addPacket(); return false;">
      <input class="plain" placeholder="Packet name" data-focus="packet-name" value="${esc(state.toolForm.packet || "")}" oninput="state.toolForm.packet=this.value">
      <button class="req" type="submit">Add packet</button>
    </form>
    <div class="grid-cards">${state.packets.map((p, i) => `<article class="card"><strong>${esc(p.name || p)}</strong><div style="margin-top:8px"><button class="comment" onclick="editPacket(${i})">Edit</button> <button class="comment" onclick="removeSaved('packets', ${i})">Remove</button></div></article>`).join("") || `<p class="hint">No packets added yet.</p>`}</div></section>`;
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
function attendanceView() {
  const date = state.entryDate;
  const comp = state.compliance && state.compliance.date === date ? state.compliance : null;
  const compItems = (comp && comp.items) || [];
  return `<section class="stage light-page"><h1>Attendance</h1>
    <input class="plain" type="date" value="${date}" onchange="state.entryDate=this.value;loadCompliance()">
    <p class="hint">${comp ? comp.completed_count + " completed · " + comp.not_started_count + " not started" : "Mark who is here. The workout on that day is listed under each name."}</p>
    <div class="grid-cards">${ATHLETES.map((a) => {
      const key = date + ":" + a.id;
      const cItem = compItems.find((ci) => ci.user && ci.user.id === a.serverId);
      const day = (state.calendars[a.id] || {})[date];
      const title = cItem && cItem.workout_title
        ? `${cItem.workout_title} · ${cItem.status}`
        : (day && ((day.title || "").trim() || (day.items || []).length) ? (day.title || "Workout") + " · " + (day.items || []).length + " exercises" : "No workout this day");
      const checked = state.attendance[key] != null ? state.attendance[key] : (cItem && cItem.status === "completed");
      return `<article class="card">
        <label class="chk"><input type="checkbox" ${checked ? "checked" : ""} onchange="toggleAttendance('${date}', '${a.id}', ${a.serverId || 0}, ${cItem && cItem.workout_id ? cItem.workout_id : 0}, this.checked)"> ${esc(a.name)}</label>
        <div class="hint">${esc(title)}</div>
        <div class="hint">${esc(state.attendance[key + ":note"] || "No note")}</div>
        <button class="comment" onclick="editAttendance('${a.id}')">Edit note</button>
      </article>`;
    }).join("") || `<p class="hint">No athletes enrolled yet.</p>`}</div></section>`;
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
  return `<section class="stage light-page"><h1>Reporting</h1>
    <div class="kpis"><div class="kpi"><b>${progDays}</b><span>Programmed days</span></div><div class="kpi"><b>${exCount}</b><span>Exercises</span></div><div class="kpi"><b>${athCount}</b><span>Athletes</span></div><div class="kpi"><b>${state.reports.length}</b><span>Notes</span></div></div>
    <form class="toolbar" onsubmit="addReport(); return false;">
      <input class="plain" placeholder="Report note" data-focus="report-note" value="${esc(state.toolForm.report || "")}" oninput="state.toolForm.report=this.value">
      <button class="req" type="submit">Add note</button>
    </form>
    ${state.reports.map((r, i) => `<article class="card"><p>${esc(r.text)}</p><button class="comment" onclick="editReport(${i})">Edit</button> <button class="comment" onclick="removeSaved('reports', ${i})">Remove</button></article>`).join("")}
    <table class="data" style="margin-top:12px"><tr><th>Date</th><th>Target</th><th>Workout</th><th>Exercises</th><th></th></tr>
      ${rows.slice(0, 40).map((r) => `<tr><td>${esc(r.date)}</td><td>${esc(r.athlete)}</td><td>${esc(r.title)}</td><td>${r.count}</td><td><button class="comment" onclick="openReportDay('${esc(r.athleteId)}','${esc(r.date)}')">Open</button></td></tr>`).join("") || `<tr><td colspan="5">No programmed workouts yet.</td></tr>`}
    </table></section>`;
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
      <div style="margin-top:8px"><button class="comment" onclick="editInvoice(${i})">Edit</button> <button class="comment" onclick="removeSaved('invoices', ${i})">Remove</button></div>
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
  return `<div class="modal-back" onclick="if(event.target===this) closeEdit()"><div class="modal edit-modal" onclick="event.stopPropagation()"><h3>${esc(m.title)}</h3>${hint}<div class="edit-fields">${fields}</div><button class="full save" type="button" onclick="saveEdit()">SAVE</button><button class="full" type="button" onclick="closeEdit()">CANCEL</button></div></div>`;
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
    return `<div class="modal-back" onclick="if(event.target===this){state.modal=null;render();}"><div class="modal"><h3>Journal entry</h3><input class="field" placeholder="Title" data-focus="jtitle" oninput="state.modal.title=this.value"><textarea data-focus="jbody" oninput="state.modal.body=this.value"></textarea><button class="full primary" onclick="saveJournalEntry()">SAVE</button><button class="full" onclick="state.modal=null;render()">CANCEL</button></div></div>`;
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
function fabSuppressed() {
  return state.view === "weightroom" || state.view === "whiteboard" || state.view === "leaderboard" || state.view === "entry";
}
function fabHtml() {
  if (state.view === "build" || state.view === "admin" || state.view === "squad" || state.view === "mine" || state.role === "athlete" || state.role === "admin" || fabSuppressed()) return "";
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
  if (state.view === "evaluations") { addEvaluation(); return; }
  if (state.view === "maxes") { addGoalRecord(); return; }
}

document.addEventListener("click", (ev) => {
  if (ev.target.closest(".menu, .pop, .modal, .nav-anchor, .group-pop")) return;
  let changed = false;
  if (state.navMenu) { state.navMenu = null; changed = true; }
  if (state.dayMenu || state.recurMenu || state.propMenu || state.letterMenu || state.optionsMenu || state.supersetMenu || state.colorMenu || state.searchDay) {
    state.dayMenu = state.recurMenu = state.colorMenu = state.searchDay = null;
    state.propMenu = state.letterMenu = state.optionsMenu = state.supersetMenu = false;
    changed = true;
  }
  if (state.teamFilter) { state.teamFilter = false; changed = true; }
  if (state.athleteMenu) { state.athleteMenu = false; changed = true; }
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
window.closeNav = closeNav;
window.selectEntryDate = selectEntryDate;
window.addPr = addPr;
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

function ledTeams(ctx) {
  const id = state.auth && state.auth.user && state.auth.user.id;
  return ((ctx && ctx.teams) || []).filter((t) => t.coach_id === id);
}
function groupControl(athlete, led) {
  if (athlete.team_id && led.some((t) => t.id === athlete.team_id)) {
    return `<button class="team-action" type="button" onclick="removeAthleteFromGroup(${athlete.team_id}, ${athlete.id})">Remove from ${esc(athlete.team_name || "group")}</button>`;
  }
  if (athlete.team_id) return `<span class="hint">${esc(athlete.team_name || "On another group")}</span>`;
  if (!led.length) return `<span class="hint">Create a group, then add them</span>`;
  if (led.length === 1) {
    return `<button class="team-action add" type="button" onclick="addAthleteToGroup(${led[0].id}, ${athlete.id})">Add to ${esc(led[0].name)}</button>`;
  }
  return `<span class="inline-form" style="margin:0">
    <select class="plain" id="add-team-${athlete.id}">
      ${led.map((t) => `<option value="${t.id}">${esc(t.name)}</option>`).join("")}
    </select>
    <button class="team-action add" type="button" onclick="addAthleteToGroup(document.getElementById('add-team-${athlete.id}').value, ${athlete.id})">Add</button>
  </span>`;
}
function groupCards(led, athletes) {
  const free = athletes.filter((a) => !a.team_id);
  const cards = led.map((t) => {
    const members = athletes.filter((a) => a.team_id === t.id);
    const memberHtml = members.map((a) => `<div class="member-row"><span>${esc(a.name)}</span><button class="team-action" type="button" onclick="removeAthleteFromGroup(${t.id}, ${a.id})">Remove</button></div>`).join("")
      || `<p class="hint">No athletes in this group yet.</p>`;
    const addHtml = free.length
      ? `<form class="inline-form" onsubmit="addAthleteToGroup(${t.id}); return false;">
          <select class="plain" id="add-athlete-${t.id}">
            ${free.map((a) => `<option value="${a.id}">${esc(a.name)}</option>`).join("")}
          </select>
          <button class="team-action add" type="submit">Add athlete</button>
        </form>`
      : `<p class="hint">No athletes are waiting for a group.</p>`;
    return `<article class="card group-card" id="group-${t.id}">
      <strong>${esc(t.name)}</strong>
      <div class="hint">${members.length} athlete${members.length === 1 ? "" : "s"} · one athlete, one group</div>
      ${memberHtml}
      ${addHtml}
    </article>`;
  }).join("");
  return `<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-top:16px">
      <h2 style="margin:0">Your groups</h2>
      <button class="ghost" type="button" onclick="goTool('users');state.userTab='groups';render()">Manage Groups &amp; Join Codes →</button>
    </div>
    <p class="lede">Assign unassigned athletes to a group you lead, or open <strong>Manage Groups &amp; Join Codes</strong> to create/rename groups and generate team join codes.</p>
    <div class="grid-cards" id="group-cards">${cards || `<p class="hint">No groups yet. Click "Manage Groups &amp; Join Codes →" to create a group.</p>`}</div>`;
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

  return `<section class="stage light-page role-home" id="coach-assign">
    <div class="role-kicker">Coach</div>
    <h1>Athletes on ${esc(teams)}</h1>
    <p class="lede">You can assign workouts, read athlete notes, and organize athletes on teams you lead. Other coaches' athletes stay hidden.</p>
    ${state.assignResult ? `<div class="banner-ok">${esc(state.assignResult)}</div>` : ""}
    ${groupCards(led, athletes)}
    <h2>Athletes</h2>
    <table class="data" id="coach-athletes">
      <tr><th>Athlete</th><th>Team</th><th>Email</th><th>Note to you</th><th>Group</th></tr>
      ${athletes.map((a) => `<tr><td>${esc(a.name)}</td><td>${esc(a.team_name || "No team")}</td><td>${esc(a.email)}</td><td>${esc(a.latest_note || "—")}</td><td>${groupControl(a, led)}</td></tr>`).join("") || `<tr><td colspan="5">No athletes on your teams.</td></tr>`}
    </table>
    <h2>Quick-assign a saved workout</h2>
    <p class="lede">Pick an athlete (or entire group) and assign one of their previous workouts, a saved gym workout, or a program template — or open the Calendar Builder to design a brand-new workout with custom exercises, sets, and reps.</p>
    <form class="inline-form" onsubmit="assignWorkout(event); return false;" style="flex-wrap:wrap;gap:8px;align-items:center">
      <select class="plain" id="assign-target" onchange="state.assignTarget=this.value;render()" required>
        ${assignableAthletes.length ? `<optgroup label="Athletes">
          ${assignableAthletes.map((a) => `<option value="user:${a.id}" ${selectedTarget === "user:" + a.id ? "selected" : ""}>${esc(a.name)}${a.team_name ? " (" + esc(a.team_name) + ")" : ""}</option>`).join("")}
        </optgroup>` : ""}
        ${led.length ? `<optgroup label="Entire Group">
          ${led.map((t) => `<option value="group:${t.id}" ${selectedTarget === "group:" + t.id ? "selected" : ""}>Group: ${esc(t.name)}</option>`).join("")}
        </optgroup>` : ""}
      </select>
      <select class="plain" id="assign-workout-id" onchange="state.assignWorkoutId=this.value" style="min-width:280px;max-width:460px" required>
        ${workoutOptionsHtml || `<option value="">No saved workouts yet — build one in Calendar</option>`}
      </select>
      <input class="plain" id="assign-date" type="date" value="${esc(state.assignDate || APP_TODAY || "2026-10-16")}" onchange="state.assignDate=this.value" required>
      <button class="req" type="submit" ${!workoutOptionsHtml ? "disabled" : ""}>Assign workout</button>
      <button class="ghost" type="button" onclick="openAthleteInBuild()">Build New Workout in Calendar →</button>
    </form>
  </section>`;
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
        if (state.role === "athlete") {
          await loadMySchedule();
          await loadOwnJournal();
        } else await loadGymContext();
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

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    initAuth();
  });
} else {
  initAuth();
}
