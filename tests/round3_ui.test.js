const fs = require("fs");
const vm = require("vm");
const assert = require("assert");

const listeners = {};
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
    addEventListener(type, fn) { (listeners[type] = listeners[type] || []).push(fn); },
    removeEventListener() {},
    getElementById() { return null; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    activeElement: null
  },
  localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
  location: { origin: "http://localhost", pathname: "/", hash: "", search: "" },
  history: { replaceState() {} },
  navigator: { clipboard: { writeText() { return Promise.resolve(); } } },
  fetch: async () => { throw new Error("unexpected fetch"); },
  addEventListener() {},
  removeEventListener() {}
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(
  fs.readFileSync("app/static/js/build-order.js", "utf8") + "\n" + fs.readFileSync("app/static/js/wourkout.js", "utf8") + `
globalThis.__lib = {
  state, addChainToDay, ensureDay, dayExerciseHtml, chainEntryHtml, dayCol, item,
  toggleItem, selectExercise, selectChain, selectDay, copySelection, pasteOn, undo,
  clipHotMatches, openCopy, openEditor, discardEditor, saveEditor, dismissEditorName,
  snapshot, entryColumns, setIsComplete, logCell, logCircuitField, entryItem,
  playAthleteVideo, mediaKind, athletePlayerHtml, applyBuildParams, writeBuildQuery
};
`,
  sandbox,
  { filename: "wourkout.js" }
);

const lib = sandbox.__lib;
const state = lib.state;
["addChainToDay", "ensureDay", "dayExerciseHtml", "chainEntryHtml", "dayCol", "item", "toggleItem", "selectExercise", "selectChain", "selectDay", "copySelection", "pasteOn", "undo", "clipHotMatches", "openCopy", "openEditor", "discardEditor", "saveEditor", "dismissEditorName", "snapshot", "entryColumns", "setIsComplete", "logCell", "logCircuitField", "entryItem", "playAthleteVideo", "mediaKind", "athletePlayerHtml", "applyBuildParams", "writeBuildQuery"].forEach((name) => {
  sandbox[name] = lib[name];
});
state.athleteId = "ath";
state.calendars = { ath: {} };
state.role = "coach";
state.view = "build";
state.serverExercises = [{
  id: 2, name: "Brace Squat", category: "Strength", video_url: "https://youtu.be/squatvid1",
  default_sets: 3, default_reps: "5", default_notes: "Library cue", default_load: "95", default_rest: "60", hidden: false
}];
state.chains = [{
  id: 9, name: "Ramp", kind: "Warm up",
  members: [
    { exercise_id: 2, sets: 4, reps: "8", notes: "Brace", exercise: { name: "Brace Squat", category: "Strength", video_url: "https://youtu.be/squatvid1" } },
    { exercise_id: 2, sets: null, reps: "", notes: "", exercise: { name: "Brace Squat", category: "Strength", video_url: "https://youtu.be/squatvid1" } }
  ]
}];

const date = "2026-10-21";
sandbox.addChainToDay(date, 9);
const day = sandbox.ensureDay(date);
assert.equal(day.items.length, 2);
assert.equal(day.items[0].sets, 4);
assert.deepEqual(day.items[0].reps, ["8", "8", "8", "8"]);
assert.equal(day.items[0].note, "Brace");
assert.equal(day.items[0].loads[0], "95");
assert.equal(day.items[0].rests[0], "60");
assert.equal(day.items[1].sets, 3);
assert.deepEqual(day.items[1].reps, ["5", "5", "5"]);
assert.equal(day.items[1].note, "Library cue");
assert.equal(day.items[1].loads[0], "95");
assert.ok(day.items.every((it) => !it.letter && it.chainCoachOpen === false && it.chainAthleteOpen === false));

const collapsed = sandbox.dayExerciseHtml(date, day);
assert.ok(collapsed.includes("Ramp"));
assert.ok(collapsed.includes("selectChain"));
assert.ok(!collapsed.includes("Brace Squat"));
assert.ok(collapsed.includes("is-collapsed"));
day.items.forEach((it) => { it.chainCoachOpen = true; });
const opened = sandbox.dayExerciseHtml(date, day);
assert.ok(opened.includes("Brace Squat"));
const headAt = opened.indexOf("chain-head");
const nextDrag = opened.indexOf('draggable="true" ondragstart="dragStart', headAt + 1);
const memberHtml = opened.slice(headAt, nextDrag < 0 ? opened.length : nextDrag);
assert.ok(!memberHtml.includes("ondragstart"));
const athleteClosed = sandbox.chainEntryHtml("ath", date, day.items, "athlete");
assert.ok(athleteClosed.includes("is-collapsed"));
assert.ok(!athleteClosed.includes("Brace Squat"));
day.items.forEach((it) => { it.chainAthleteOpen = true; });
const athleteOpen = sandbox.chainEntryHtml("ath", date, day.items, "athlete");
assert.ok(athleteOpen.includes("Brace Squat"));
assert.ok(!athleteOpen.includes("is-collapsed"));

const loose = sandbox.item({ name: "Press", letter: "A", type: "lift" });
day.items.push(loose);
sandbox.toggleItem(date, day.items[0].id, true);
sandbox.toggleItem(date, loose.id, true);
assert.equal(state.pick.level, "exercise");
assert.ok(day.items[0].selected && loose.selected);
sandbox.selectExercise(date, loose.id);
assert.equal(state.pick.level, "exercise");
assert.ok(loose.selected && !day.items[0].selected && !day.items[1].selected);
sandbox.selectChain(date, day.items[0].chainInstance);
assert.equal(state.pick.level, "chain");
assert.equal(state.pick.instance, day.items[0].chainInstance);
assert.ok(day.items.every((it) => !it.selected));
sandbox.selectExercise(date, day.items[1].id);
assert.equal(state.pick.level, "exercise");
assert.ok(day.items[1].selected && !day.items[0].selected);
sandbox.selectDay(date);
assert.equal(state.pick.level, "day");
assert.ok(day.items.every((it) => !it.selected));
const column = sandbox.dayCol(date);
assert.ok(column.includes("day-selected"));
assert.ok(column.includes('class="day-date"'));
assert.ok(column.includes("selectDay"));

state.focusDay = date;
sandbox.copySelection("copy");
assert.equal(state.clipboard.level, "day");
assert.ok(state.clipHot && state.clipHot.level === "day");
assert.ok(state.clipHot.until - Date.now() <= 10000 && state.clipHot.until - Date.now() > 8000);
assert.ok(column && sandbox.clipHotMatches(date, { level: "day" }));
const hotDay = sandbox.dayCol(date);
assert.ok(hotDay.includes("clip-hot"));
state.clipHot.until = Date.now() - 1;
assert.equal(sandbox.clipHotMatches(date, { level: "day" }), false);

const other = "2026-10-22";
sandbox.ensureDay(other).items = [sandbox.item({ name: "Keep", letter: "B", type: "lift" })];
sandbox.pasteOn(other);
assert.equal(sandbox.ensureDay(other).items.length, sandbox.ensureDay(date).items.length);
assert.ok(sandbox.ensureDay(other).items.every((it) => it.name !== "Keep"));
assert.equal(state.clipHot, null);
sandbox.undo();
assert.equal(sandbox.ensureDay(other).items.length, 1);
assert.equal(sandbox.ensureDay(other).items[0].name, "Keep");

const pressId = sandbox.ensureDay(date).items.find((it) => it.name === "Press").id;
sandbox.selectExercise(date, pressId);
sandbox.copySelection("cut");
assert.equal(state.clipboard.level, "exercise");
assert.equal(state.clipboard.mode, "cut");
assert.equal(state.clipHot.level, "exercise");
assert.ok(sandbox.dayExerciseHtml(date, sandbox.ensureDay(date)).includes("clip-hot"));
const beforeCut = sandbox.ensureDay(other).items.length;
sandbox.pasteOn(other);
assert.equal(sandbox.ensureDay(other).items.length, beforeCut + 1);
assert.equal(sandbox.ensureDay(other).items[beforeCut].name, "Press");
assert.ok(!sandbox.ensureDay(date).items.some((it) => it.id === pressId));
assert.equal(state.clipHot, null);
sandbox.undo();
assert.ok(sandbox.ensureDay(date).items.some((it) => it.name === "Press"));
assert.equal(sandbox.ensureDay(other).items.length, 1);

const instance = sandbox.ensureDay(date).items.find((it) => it.chainInstance).chainInstance;
sandbox.selectChain(date, instance);
sandbox.copySelection("copy");
assert.equal(state.clipboard.level, "chain");
assert.equal(state.clipHot.level, "chain");
sandbox.pasteOn(other);
assert.equal(sandbox.ensureDay(other).items.length, 1 + 2);
assert.ok(sandbox.ensureDay(other).items[1].chainInstance);
assert.notEqual(sandbox.ensureDay(other).items[1].chainInstance, instance);
assert.equal(state.clipHot, null);

state.clipHot = null;
state.clipboard = null;
sandbox.openCopy(date, "copy");
assert.equal(state.clipHot, null);
assert.equal(state.modal.type, "copy");
state.modal = null;

const editedId = sandbox.ensureDay(date).items.find((it) => it.name === "Press").id;
sandbox.openEditor(date, editedId);
sandbox.ensureDay(date).items.find((it) => it.id === editedId).name = "Renamed";
sandbox.discardEditor();
assert.equal(sandbox.ensureDay(date).items.find((it) => it.id === editedId).name, "Press");
assert.equal(state.editor, null);
sandbox.openEditor(date, editedId);
sandbox.ensureDay(date).items.find((it) => it.id === editedId).name = "  ";
sandbox.saveEditor();
assert.equal(state.modal.type, "editor-name");
assert.ok(state.editor);
sandbox.dismissEditorName();
assert.equal(state.modal, null);
assert.ok(state.editor && state.editor.id === editedId);
sandbox.ensureDay(date).items.find((it) => it.id === editedId).name = "Press";
state.editor = null;

sandbox.snapshot();
sandbox.ensureDay(date).items.find((it) => it.id === editedId).name = "Changed";
const stacked = state.undo.length;
function key(partial) {
  const ev = Object.assign({
    key: "z", metaKey: true, ctrlKey: false, shiftKey: false,
    target: { tagName: "DIV", isContentEditable: false },
    preventDefault() { ev.prevented = true; }
  }, partial);
  (listeners.keydown || []).forEach((fn) => fn(ev));
  return ev;
}
const typed = key({ target: { tagName: "INPUT", isContentEditable: false } });
assert.equal(typed.prevented, undefined);
assert.equal(sandbox.ensureDay(date).items.find((it) => it.id === editedId).name, "Changed");
assert.equal(state.undo.length, stacked);
const calendarUndo = key({});
assert.equal(calendarUndo.prevented, true);
assert.equal(sandbox.ensureDay(date).items.find((it) => it.id === editedId).name, "Press");
state.clipboard = null;
const typedCut = key({ key: "x", target: { tagName: "TEXTAREA", isContentEditable: false } });
assert.equal(state.clipboard, null);
assert.equal(typedCut.prevented, undefined);

const lift = sandbox.item({
  name: "Squat", type: "lift", sets: 1, reps: ["8"], loads: ["100"], props: ["load"],
  videoUrl: "https://youtu.be/abcdefghijk"
});
const circuit = sandbox.item({
  name: "Stations", type: "circuit", detail: "Inchworm", props: ["load"], sets: 3, reps: ["1"],
  videoUrl: "https://vimeo.com/123456", completionOnly: true
});
const entryDate = "2026-10-23";
sandbox.ensureDay(entryDate).items = [lift, circuit];
assert.deepEqual(sandbox.entryColumns(lift).map((col) => col[0]), ["r", "w"]);
state.role = "athlete";
assert.deepEqual(sandbox.entryColumns(lift).map((col) => col[0]), ["r", "w"]);
state.role = "coach";
assert.ok(!sandbox.entryColumns(lift).some((col) => col[0] === "rest"));
assert.equal(sandbox.setIsComplete(lift, {}), false);
assert.equal(sandbox.setIsComplete(lift, { w: "0" }), false);
assert.equal(sandbox.setIsComplete(lift, { w: "40" }), true);
assert.equal(sandbox.setIsComplete(sandbox.item({ name: "Bare", props: [], sets: 1, reps: ["5"] }), { r: "5" }), false);
const liftKey = "ath:" + entryDate + ":" + lift.id;
sandbox.logCell(liftKey, 0, "done", true, entryDate, lift.id, 0);
assert.equal(state.logs[liftKey].cells[0].done, false);
sandbox.logCell(liftKey, 0, "w", "40", entryDate, lift.id, 0);
assert.equal(state.logs[liftKey].cells[0].done, true);
sandbox.logCell(liftKey, 0, "w", "0", entryDate, lift.id, 0);
assert.equal(state.logs[liftKey].cells[0].done, false);
state.entryItem = lift.id;
state.playingVideo = "";
let liftHtml = sandbox.entryItem("ath", entryDate, lift);
assert.ok(liftHtml.includes("▶ Play"));
assert.ok(!liftHtml.includes("iframe"));
assert.ok(liftHtml.includes("<th>Reps</th>"));
assert.ok(!liftHtml.includes("<th>Rest"));
assert.ok(!liftHtml.includes('type="checkbox" checked'));
sandbox.playAthleteVideo("vid:" + lift.id);
liftHtml = sandbox.entryItem("ath", entryDate, lift);
assert.ok(liftHtml.includes("youtube-nocookie.com/embed/abcdefghijk"));
assert.equal(sandbox.mediaKind("https://vimeo.com/123456").kind, "vimeo");
assert.equal(sandbox.mediaKind("https://example.com/video.mp4"), null);
assert.equal(sandbox.athletePlayerHtml(circuit), "");
assert.equal(sandbox.athletePlayerHtml(sandbox.item({ name: "Clip", type: "lift", videoUrl: "https://example.com/clip.mp4" })), "");
state.playingVideo = "";
const vimeo = sandbox.item({ name: "Clip", type: "lift", videoUrl: "https://vimeo.com/video/99" });
assert.ok(sandbox.athletePlayerHtml(vimeo).includes("▶ Play"));
sandbox.playAthleteVideo("vid:" + vimeo.id);
assert.ok(sandbox.athletePlayerHtml(vimeo).includes("player.vimeo.com/video/99"));

state.entryItem = circuit.id;
state.playingVideo = "";
let circuitHtml = sandbox.entryItem("ath", entryDate, circuit);
assert.ok(circuitHtml.includes("Inchworm"));
assert.ok(circuitHtml.includes(">Complete<"));
assert.ok(!circuitHtml.includes("Done set"));
assert.ok(!circuitHtml.includes("iframe"));
assert.ok(circuitHtml.includes('aria-pressed="false"'));
const circuitKey = "ath:" + entryDate + ":" + circuit.id;
sandbox.logCircuitField(circuitKey, "w", "15", entryDate, circuit.id, 0);
circuitHtml = sandbox.entryItem("ath", entryDate, circuit);
assert.ok(circuitHtml.includes('aria-pressed="true"'));
sandbox.logCircuitField(circuitKey, "w", "0", entryDate, circuit.id, 0);
circuitHtml = sandbox.entryItem("ath", entryDate, circuit);
assert.ok(circuitHtml.includes('aria-pressed="false"'));
circuit.props = [];
sandbox.logCircuitField(circuitKey, "w", "15", entryDate, circuit.id, 0);
assert.equal(state.logs[circuitKey].done, false);

state.auth = { user: { id: 3, role: "coach" } };
state.gymContext = {
  athletes: [{ id: 7, name: "Ada", email: "ada@example.com" }],
  teams: [{ id: 4, name: "Team", coach_id: 3 }]
};
const coachQuery = sandbox.applyBuildParams("?week=2026-10-18&athlete=group:4&cal=month", "coach");
assert.equal(coachQuery.applied, true);
assert.equal(coachQuery.next.weekStart, "2026-10-18");
assert.equal(coachQuery.next.athleteId, "group:4");
assert.equal(coachQuery.next.viewMode, "month");
const athleteQuery = sandbox.applyBuildParams("?week=2026-10-18&athlete=u7&cal=week", "athlete");
assert.equal(athleteQuery.applied, false);
let written = "";
sandbox.history.replaceState = (_a, _b, url) => { written = url; };
state.view = "build";
state.role = "coach";
state.weekStart = "2026-10-18";
state.athleteId = "u7";
state.viewMode = "week";
sandbox.location.search = "";
sandbox.location.hash = "#keep";
sandbox.writeBuildQuery();
const params = new URLSearchParams(written.split("?")[1].split("#")[0]);
assert.equal(params.get("week"), "2026-10-18");
assert.equal(params.get("athlete"), "u7");
assert.equal(params.get("cal"), "week");
assert.ok(written.endsWith("#keep"));
state.role = "athlete";
written = "";
sandbox.writeBuildQuery();
assert.equal(written, "");

console.log("round 3 ui tests passed");
