const fs = require("fs");
const vm = require("vm");
const assert = require("assert");

const sandbox = {
  console,
  setTimeout,
  clearTimeout,
  setInterval,
  clearInterval,
  Date,
  Math,
  JSON,
  Object,
  Array,
  String,
  Number,
  Boolean,
  RegExp,
  Error,
  Promise,
  parseInt,
  parseFloat,
  isNaN,
  isFinite,
  encodeURIComponent,
  decodeURIComponent,
  URLSearchParams,
  Map,
  Set,
  WeakMap,
  Intl,
  document: {
    readyState: "loading",
    visibilityState: "visible",
    addEventListener() {},
    removeEventListener() {},
    getElementById() { return null; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    activeElement: null
  },
  localStorage: {
    getItem() { return null; },
    setItem() {},
    removeItem() {}
  },
  location: { origin: "http://localhost", pathname: "/", hash: "" },
  history: { replaceState() {} },
  navigator: { clipboard: { writeText() { return Promise.resolve(); } } },
  fetch: async () => { throw new Error("unexpected fetch"); },
  addEventListener() {},
  removeEventListener() {}
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

const source = fs.readFileSync("app/static/js/build-order.js", "utf8") + "\n" + fs.readFileSync("app/static/js/wourkout.js", "utf8") + `
globalThis.__lib = {
  dayCol, effortFill, isEffortWord, doseMark, propRow, openInfo, openNewCalendar, saveEdit, editModalHtml, buildAthletes, findItem,
  state, item, ensureDay, addChainToDay, selectChain, chainBoxPop, closeChainBox, toggleTrack, setCell, changeSets,
  doseKeys, scriptLine, chainEditorHtml, openChainEditor, chainMemberPayload, itemNotes: typeof itemNotes === "function" ? itemNotes : null,
  weekPhases, phaseBannerStyle, phaseTagsHtml, weekNoteHtml, weekNoteOpen, phasesPanelHtml, pickPhaseRange, savePhaseDraft,
  openPhase, phaseLength, toggleBuildPanel, buildView,
  fromCatalog, workoutToDayItems, itemQuestions, questionnaireEntryHtml, answerQuestion, questionnaireDone,
  openQuestionnaireEditor, addQuestionnaireQuestion, createQuestionForQuestionnaire, saveQuestion, saveQuestionnaire,
  moveQuestionnaireQuestion, questionnaireEditorHtml, questionLibraryHtml, askDeleteQuestion
};
globalThis.__setApi = (fn) => { api = fn; };
`;
vm.runInContext(source, sandbox, { filename: "wourkout.js" });
const lib = sandbox.__lib;
const state = lib.state;

(async () => {

const calls = [];
sandbox.__setApi(async (method, url, body) => {
  calls.push({ method, url, body });
  if (method === "POST" && url === "/api/calendars") {
    state.gymContext.calendars.push({ id: 12, name: body.name, athlete_ids: [] });
    return { id: 12, name: body.name };
  }
  if (method === "GET" && url === "/api/gym/context") return state.gymContext;
  if (method === "GET") return [];
  return {};
});

state.auth = { isAuthenticated: true, token: "", user: { id: 1, role: "coach", name: "Coach" } };
state.role = "coach";
state.view = "build";
state.gymContext = { athletes: [], calendars: [{ id: 11, name: "Fall block", athlete_ids: [] }] };
state.athleteId = "cal:11";
state.calendars = { "cal:11": {} };
state.calendarLoaded = { "cal:11": true };
state.serverExercises = [
  { id: 1, name: "Plank", category: "Strength", default_sets: 2, default_reps: "10" },
  { id: 2, name: "Squat", category: "Strength", default_sets: 3, default_reps: "5" },
  { id: 3, name: "Carry", category: "Strength", default_sets: 2, default_reps: "1" }
];

// A day inside a phase wears the phase's colour; a day outside keeps the blue edge.
{
  state.phases = { "cal:11": [{ id: 1, name: "Base", notes: "", color: "#15803d", start_date: "2026-11-02", end_date: "2026-11-08" }] };
  const inPhase = lib.dayCol("2026-11-04");
  assert.ok(inPhase.includes("border-left:3px solid #15803d"), "phase colour on the edge");
  assert.ok(inPhase.includes("--day-accent:#15803d"), "phase colour on the outline");
  const outside = lib.dayCol("2026-11-10");
  assert.ok(outside.includes("border-left:3px solid #3b82f6"));
  assert.ok(!outside.includes("--day-accent"));
}

// A lone A fills the effort word for its row; deleting back to A leaves it alone.
{
  const box = (value) => ({ value, closest() { return null; } });
  assert.equal(lib.effortFill({ inputType: "insertText" }, box("a"), "reps"), "AMAP");
  assert.equal(lib.effortFill({ inputType: "insertText" }, box("A"), "time"), "ALAP");
  assert.equal(lib.effortFill({ inputType: "insertText" }, box("A"), "distance"), "AFAP");
  assert.equal(lib.effortFill({ inputType: "deleteContentBackward" }, box("A"), "reps"), "A");
  assert.equal(lib.effortFill({ inputType: "insertText" }, box("12"), "reps"), "12");
  assert.equal(lib.effortFill({ inputType: "insertText" }, box("A"), "load"), "A");
  assert.equal(lib.doseMark("time", "ALAP"), "ALAP");
  assert.equal(lib.doseMark("distance", "AFAP"), "AFAP");
  assert.equal(lib.doseMark("time", "30"), "30s");

  const day = lib.ensureDay("2026-11-04");
  day.items = [lib.item({ name: "Squat", type: "lift", sets: 2, reps: ["5", "5"], trackTime: true, times: ["ALAP", "20"] })];
  const it = day.items[0];
  const row = lib.propRow("2026-11-04", it, "time");
  assert.ok(row.includes("effortFill(event, this, 'time')"));
  assert.equal((row.match(/is-effort/g) || []).length, 1, "only the ALAP set hides its seconds mark");
  assert.ok(lib.scriptLine(it).includes("ALAP"));
  assert.ok(!lib.scriptLine(it).includes("ALAPs"));
}

// Additional info opens with its text box asked for focus.
{
  const day = lib.ensureDay("2026-11-04");
  state.pendingFocus = "";
  let asked = "";
  const realQuery = sandbox.document.querySelector;
  sandbox.document.querySelector = (sel) => { if (sel.includes("edit-text")) asked = sel; return null; };
  lib.openInfo("2026-11-04", day.items[0].id);
  sandbox.document.querySelector = realQuery;
  assert.equal(state.modal.type, "edit");
  assert.ok(asked.includes('data-focus="edit-text"'));
  state.modal = null;
}

// The Build calendar menu creates a calendar and lands on it.
{
  state.athleteMenu = true;
  assert.ok(lib.buildView().includes("+ Create new calendar"));
  lib.openNewCalendar();
  assert.equal(state.athleteMenu, false);
  assert.equal(state.modal.title, "Create new calendar");
  assert.ok(lib.editModalHtml(state.modal).includes("saveEdit()"));

  await lib.saveEdit();
  assert.ok(state.modal, "a blank name keeps the box open");
  assert.ok(!calls.some((c) => c.method === "POST"));

  state.modal.fields[0].value = "  Spring block ";
  await lib.saveEdit();
  const post = calls.find((c) => c.method === "POST" && c.url === "/api/calendars");
  assert.deepEqual(JSON.parse(JSON.stringify(post.body)), { name: "Spring block" });
  assert.equal(state.modal, null);
  assert.equal(state.athleteId, "cal:12");

  state.role = "athlete";
  state.athleteMenu = true;
  state.role = "coach";
}

console.log("round 9 ui tests passed");
process.exit(0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
