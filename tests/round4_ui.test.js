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
  state, blankLibraryRow, libraryExercisePayload, exerciseFields, fromCatalog, item, itemNotes,
  workoutToDayItems, setTrack, trackControl, editorClick, searchPop, createChainFromDay,
  chainEditorCommit, editorPop, scriptLine, entryColumns, previewSheet, weekNoteHtml, blurWeekNote,
  setWeekNote, weekNoteOpen, exerciseDefaultsText, ensureDay, editModalHtml, mapEditFields, openEditor
};
globalThis.__setApi = (fn) => { api = fn; };
`;
vm.runInContext(source, sandbox, { filename: "wourkout.js" });
const lib = sandbox.__lib;
const state = lib.state;
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

(async () => {

state.athleteId = "ath";
state.calendars = { ath: {} };
state.role = "coach";
state.view = "build";

{
  // A new exercise starts at 1 set of 1 rep.
  const blank = lib.blankLibraryRow("Row");
  assert.equal(blank.default_sets, 1);
  assert.equal(blank.default_reps, "1");
  const fields = lib.exerciseFields({ category: "Strength" });
  assert.equal(fields.find((f) => f.key === "default_sets").value, "1");
  assert.equal(fields.find((f) => f.key === "default_reps").value, "1");
  const payload = lib.libraryExercisePayload({ name: "Row", category: "Strength" });
  assert.equal(payload.default_sets, 1);
  assert.equal(payload.default_reps, "1");
  assert.equal(lib.fromCatalog({ name: "Unknown lift", type: "lift" }).sets, 1);
  assert.deepEqual(lib.fromCatalog({ name: "Unknown lift", type: "lift" }).reps, ["1"]);
}

{
  // Warm-ups and cooldowns are one big text box, saved as completion-only.
  ["Warm up", "Cooldown"].forEach((category) => {
    const keys = lib.exerciseFields({ name: "Ramp", category }).map((f) => f.key);
    assert.deepEqual(keys, ["name", "category", "video_url", "default_notes"]);
    const text = lib.exerciseFields({ name: "Ramp", category }).find((f) => f.key === "default_notes");
    assert.ok(text.multiline && text.tall);
    const payload = lib.libraryExercisePayload({ name: "Ramp", category, default_notes: "x".repeat(600), default_load: "40" });
    assert.equal(payload.completion_only, true);
    assert.equal(payload.default_sets, 1);
    assert.equal(payload.default_reps, "1");
    assert.equal(payload.default_notes.length, 600);
    assert.equal(payload.default_load, "");
    assert.equal(lib.exerciseDefaultsText({ category, default_sets: 1, default_reps: "1" }), "");
  });
  const modal = lib.editModalHtml({ title: "Add exercise", fields: lib.mapEditFields(lib.exerciseFields({ name: "Ramp", category: "Warm up" })) });
  assert.ok(modal.includes('min-height:220px'));
  assert.ok(modal.includes("tick it off"));
  assert.ok(!modal.includes("Default sets"));

  state.serverExercises = [
    { id: 1, name: "Ramp", category: "Warm up", default_notes: "Jog 2 min\nLeg swings", default_sets: 1, default_reps: "1", completion_only: true, hidden: false },
    { id: 2, name: "Squat", category: "Strength", default_sets: 3, default_reps: "5", default_notes: "Stay tall", hidden: false }
  ];
  const ramp = lib.fromCatalog({ name: "Ramp", type: "lift" });
  assert.equal(ramp.completionOnly, true);
  assert.equal(ramp.note, "Jog 2 min\nLeg swings");
  assert.equal(lib.scriptLine(ramp), "Jog 2 min");
  const squat = lib.fromCatalog({ name: "Squat", type: "lift" });
  assert.equal(squat.note, "");
  assert.equal(squat.completionOnly, false);

  const day = lib.ensureDay("2026-10-21");
  day.items.push(ramp);
  state.editor = { day: "2026-10-21", id: ramp.id };
  const editor = lib.editorPop("2026-10-21");
  assert.ok(editor.includes("<textarea"));
  assert.ok(editor.includes("Jog 2 min"));
  assert.ok(!editor.includes("prop-table"));
  assert.ok(!editor.includes("Add Additional Info"));
  assert.ok(editor.includes("Completion Only"));
  state.editor = null;
}

{
  // Reps / Time (s) / Distance is a three-way switch, and distance survives a save and reload.
  const day = lib.ensureDay("2026-10-22");
  const sprint = lib.item({ name: "Sprint", type: "lift", letter: "A", sets: 2, reps: ["40", "40"] });
  day.items.push(sprint);
  let control = lib.trackControl("2026-10-22", sprint);
  assert.ok(control.includes("Time (s)"));
  assert.ok(control.includes("Distance"));
  assert.ok(!control.includes("Seconds"));
  assert.ok(control.includes("✓ Reps"));

  lib.setTrack("2026-10-22", sprint.id, "distance");
  assert.equal(sprint.trackDistance, true);
  assert.equal(sprint.trackTime, false);
  assert.equal(sprint.trackReps, false);
  control = lib.trackControl("2026-10-22", sprint);
  assert.ok(control.includes("✓ Distance"));
  assert.ok(lib.itemNotes(sprint).includes("Flags:trackDistance"));
  assert.ok(!lib.itemNotes(sprint).includes("noTrackReps"));
  assert.ok(lib.scriptLine(sprint).includes("2 x 40 m"));
  assert.deepEqual(lib.entryColumns(sprint)[0], ["r", "Distance (metres)"]);
  assert.ok(lib.previewSheet(sprint, {}).includes("DISTANCE (METRES)"));

  state.editor = { day: "2026-10-22", id: sprint.id };
  const editor = lib.editorPop("2026-10-22");
  assert.ok(editor.includes("Distance (metres)"));
  assert.ok(editor.includes('class="sec-suffix">metres<'));
  state.editor = null;

  const reloaded = lib.workoutToDayItems({ exercises: [{
    id: 5, exercise_id: 9, exercise: { name: "Sprint", category: "Strength" }, superset_group: "A", order_index: 0,
    prescribed_sets: 2, target_reps: "40,40", target_weight: "", notes: lib.itemNotes(sprint)
  }] })[0];
  assert.equal(reloaded.trackDistance, true);
  assert.equal(reloaded.trackTime, false);
  assert.equal(reloaded.trackReps, false);
  assert.deepEqual(reloaded.reps, ["40", "40"]);

  lib.setTrack("2026-10-22", sprint.id, "time");
  assert.equal(sprint.trackTime, true);
  assert.equal(sprint.trackDistance, false);
  assert.ok(lib.itemNotes(sprint).includes("Flags:trackTime"));
  assert.ok(!lib.itemNotes(sprint).includes("trackDistance"));
  lib.setTrack("2026-10-22", sprint.id, "reps");
  assert.equal(sprint.trackReps, true);
  assert.equal(sprint.trackTime, false);
  assert.equal(sprint.trackDistance, false);
}

{
  // A click anywhere in the editor outside a menu closes the open menu.
  const outside = { stopPropagation() {}, target: { closest() { return null; } } };
  const inside = { stopPropagation() {}, target: { closest(sel) { return sel.includes(".pop") ? {} : null; } } };
  state.propMenu = true;
  lib.editorClick(inside);
  assert.equal(state.propMenu, true);
  lib.editorClick(outside);
  assert.equal(state.propMenu, false);
  state.letterMenu = true;
  state.supersetMenu = true;
  lib.editorClick(outside);
  assert.equal(state.letterMenu, false);
  assert.equal(state.supersetMenu, false);
}

await (async () => {
  // A chain started from a day's search box lands on that day once saved.
  state.chains = [];
  state.searchDay = "2026-10-23";
  state.searchQ = "Field ramp";
  assert.ok(lib.searchPop("2026-10-23").includes("Create New Chain"));
  lib.createChainFromDay("2026-10-23");
  assert.equal(state.searchDay, null);
  assert.equal(state.modal.type, "chain");
  assert.equal(state.modal.source, "build");
  assert.equal(state.modal.date, "2026-10-23");
  assert.equal(state.modal.name, "Field ramp");
  state.modal.members.push({ exercise_id: 2, name: "Squat", sets: "2", reps: "5", notes: "" });
  const posts = [];
  sandbox.__setApi(async (method, url, body) => {
    posts.push({ method, url, body });
    return { id: 77, name: body.name, kind: body.kind, members: [{ exercise_id: 2, sets: 2, reps: "5", notes: "", exercise: { name: "Squat", category: "Strength" } }] };
  });
  lib.chainEditorCommit();
  await tick();
  assert.equal(posts.length, 1);
  assert.equal(posts[0].url, "/api/chains");
  assert.equal(posts[0].body.name, "Field ramp");
  assert.equal(state.modal, null);
  const day = lib.ensureDay("2026-10-23");
  assert.equal(day.items.length, 1);
  assert.equal(day.items[0].chainId, 77);
  assert.equal(day.items[0].chainName, "Field ramp");
  assert.equal(state.chains.length, 1);
})();

await (async () => {
  // Clicking out of a week note folds it, unless focus came straight back after a render.
  sandbox.__setApi(async () => ({}));
  state.weekNotes = { ath: {} };
  state.weekNotesFolded = {};
  const week = "2026-10-18";
  lib.setWeekNote(week, "Deload week");
  assert.equal(lib.weekNoteOpen(week), true);
  assert.ok(lib.weekNoteHtml(week).includes("▾ Notes"));
  lib.blurWeekNote(week);
  await tick();
  assert.equal(lib.weekNoteOpen(week), false);
  assert.ok(lib.weekNoteHtml(week).includes("▸ Notes"));
  assert.ok(lib.weekNoteHtml(week).includes("Deload week"));

  state.weekNotesFolded = {};
  const textarea = { dataset: { focus: "week-note-" + week } };
  sandbox.document.querySelector = (sel) => (sel.includes("week-note-" + week) ? textarea : null);
  sandbox.document.activeElement = textarea;
  lib.blurWeekNote(week);
  await tick();
  assert.equal(lib.weekNoteOpen(week), true);
  sandbox.document.querySelector = () => null;
  sandbox.document.activeElement = null;
})();

console.log("round 4 ui tests passed");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
