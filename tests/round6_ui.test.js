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
  state, CATALOG, item, fromCatalog, itemNotes, workoutToDayItems, upgradeDose, dayFromDraft, scriptLine, doseText,
  ensureDay, findItem, placeSearchPop, openSearch, openSwap, endSwap, searchPop, swapFromCatalog, swapItemFor,
  editorPop, editorHead, openEditor, saveEditor, toggleFlag, toggleTrack, propMenu, entryColumns, entryItem, logCell,
  requiredEntryFields, prefillEntry, isIntensityRange, readIntensity, libraryExercisePayload, exerciseFields,
  exerciseDefaultsText, blankLibraryRow, libraryPanelHtml, liftsView, chainLibraryHtml, openChainEditor,
  chainEditorHtml, addChainMember, createExerciseForChain, closeEdit, saveEdit, modalHtml, removalWarning,
  askRemoveExercise, askRemoveChain, hideExercise, unhideExercise, hideChain, unhideChain, markHiddenExercises,
  distanceAbbr, distanceChoice, hydrateEntryLogs, stats, isTextOnlyItem
};
globalThis.__setApi = (fn) => { api = fn; };
`;
vm.runInContext(source, sandbox, { filename: "wourkout.js" });
const lib = sandbox.__lib;
const state = lib.state;
const plain = (value) => JSON.parse(JSON.stringify(value));
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

(async () => {

state.athleteId = "ath";
state.calendars = { ath: {} };
state.role = "coach";
state.view = "build";
state.serverExercises = [
  { id: 1, name: "Ramp", category: "Warm up", default_notes: "Jog 2 min", default_sets: 1, default_reps: "1", completion_only: true },
  { id: 2, name: "Back Squat", category: "Strength", default_sets: 3, default_reps: "5", default_load: "100", video_url: "https://youtu.be/abcdefg" },
  { id: 3, name: "Sled Push", category: "Strength", default_sets: 4, default_reps: "2", default_distance: "10", completion_only: true },
  { id: 4, name: "Plank", category: "Strength", default_sets: 2, default_reps: "", default_time: "30" },
  { id: 5, name: "Old Lift", category: "Strength", default_sets: 1, default_reps: "1" },
  { id: 6, name: "Tempo Squat", category: "Strength", default_sets: 2, default_reps: "5", intensity_kind: "rpe", intensity_value: "5-7" }
];
state.serverExercises.forEach((row) => { if (!lib.CATALOG.some((c) => c.name === row.name)) lib.CATALOG.push({ name: row.name, type: "lift" }); });
state.hiddenExerciseIds = [5];
state.chains = [
  { id: 21, name: "Prep", kind: "Warm up", members: [{ exercise_id: 1 }] },
  { id: 22, name: "Old prep", kind: "Warm up", members: [{ exercise_id: 1 }] }
];
state.hiddenChainIds = [22];
lib.markHiddenExercises();

{
  // Distance units are short beside a number. The full word is only for the unit picker.
  assert.equal(lib.distanceAbbr("metres"), "m");
  assert.equal(lib.distanceAbbr("yards"), "yd");
  assert.equal(lib.distanceChoice("yd"), "yards");
  assert.equal(lib.distanceChoice("m"), "metres");
}

{
  // The search popup is attached to the page once. Re-attaching it on a scroll took focus
  // out of the box after every letter.
  let appended = 0;
  const body = { appendChild() { appended += 1; pop.parentNode = body; } };
  const rect = { top: 300, bottom: 320, left: 40, right: 200 };
  const pop = {
    parentNode: null, style: {}, offsetWidth: 280, scrollHeight: 200,
    classList: { add() {}, toggle() {} }
  };
  const anchor = { getBoundingClientRect: () => rect };
  const day = { querySelector: () => anchor };
  const saved = { querySelector: sandbox.document.querySelector, body: sandbox.document.body };
  sandbox.document.body = body;
  sandbox.document.querySelector = (sel) => (sel === ".search-pop" ? pop : sel.startsWith(".day[") ? day : null);
  sandbox.innerWidth = 1200;
  sandbox.innerHeight = 800;
  state.searchDay = "2026-12-01";
  lib.placeSearchPop();
  lib.placeSearchPop();
  lib.placeSearchPop();
  assert.equal(appended, 1);
  sandbox.document.querySelector = saved.querySelector;
  sandbox.document.body = saved.body;
  state.searchDay = null;

  // Opening the search asks for the box to be focused straight away.
  lib.openSearch("2026-12-01");
  assert.equal(state.searchDay, "2026-12-01");
  assert.ok(lib.searchPop("2026-12-01").includes('data-focus="ex-search"'));
  state.searchDay = null;
}

{
  // Search rows: a video mark on exercises with a video, and nothing the coach has hidden.
  state.searchQ = "squat";
  let html = lib.searchPop("2026-12-01");
  const squatRow = html.split("<button").find((row) => row.includes(">Back Squat<"));
  assert.ok(squatRow.includes("vid-mark"));
  const tempoRow = html.split("<button").find((row) => row.includes(">Tempo Squat<"));
  assert.ok(!tempoRow.includes("vid-mark"));
  state.searchQ = "old";
  html = lib.searchPop("2026-12-01");
  assert.ok(!html.includes("Old Lift"));
  assert.ok(!html.includes("Old prep"));
  state.searchQ = "prep";
  assert.ok(lib.searchPop("2026-12-01").includes(">Prep<"));
  state.searchQ = "";
  state.buildPanel = "library";
  const panel = lib.libraryPanelHtml();
  assert.ok(panel.includes("Back Squat"));
  assert.ok(panel.includes("vid-mark"));
  assert.ok(!panel.includes("Old Lift"));
  assert.ok(!panel.includes("Old prep"));
}

{
  // A completion-only exercise is built like any other: sets, reps, properties.
  const date = "2026-12-02";
  const sled = lib.fromCatalog({ name: "Sled Push", type: "lift" });
  assert.equal(sled.completionOnly, true);
  assert.equal(sled.textOnly, false);
  assert.equal(sled.sets, 4);
  assert.equal(sled.trackReps, true);
  assert.equal(sled.trackDistance, true);
  assert.deepEqual(sled.distances, ["10", "10", "10", "10"]);
  assert.equal(lib.scriptLine(sled), "4 x 2 · 10 m");
  lib.ensureDay(date).items.push(sled);
  state.editor = { day: date, id: sled.id };
  let editor = lib.editorPop(date);
  assert.ok(editor.includes("prop-table"));
  assert.ok(editor.includes('aria-label="Reps set 4"'));
  assert.ok(editor.includes("Add Property"));
  assert.ok(!editor.includes("No sets, reps, or load"));
  // Distance is a switch now, not a property.
  assert.ok(!lib.propMenu(date, sled.id).includes("Distance"));
  // The athlete gets the set rows without a weight box, even if the coach prescribes a load.
  sled.props.push("load");
  sled.loads = ["40", "40", "40", "40"];
  assert.deepEqual(plain(lib.entryColumns(sled)), [["r", "Reps"], ["distance", "Distance (m)"]]);
  assert.deepEqual(plain(lib.requiredEntryFields(sled)), []);
  const notes = lib.itemNotes(sled);
  assert.ok(notes.includes("completionOnly"));
  assert.ok(!notes.includes("textOnly"));
  const back = lib.workoutToDayItems({ exercises: [{
    id: 31, exercise_id: 3, exercise: { name: "Sled Push", category: "Strength" }, superset_group: "A", order_index: 0,
    prescribed_sets: 4, target_reps: "2,2,2,2", target_weight: "40,40,40,40", notes
  }] })[0];
  assert.equal(back.completionOnly, true);
  assert.equal(lib.isTextOnlyItem(back), false);
  assert.equal(back.trackDistance, true);

  // A warm-up stays a block of text with one tick.
  const ramp = lib.fromCatalog({ name: "Ramp", type: "lift" });
  assert.equal(ramp.textOnly, true);
  assert.equal(lib.isTextOnlyItem(ramp), true);
  assert.ok(lib.itemNotes(ramp).includes("completionOnly,textOnly"));
  lib.ensureDay(date).items.push(ramp);
  state.editor = { day: date, id: ramp.id };
  editor = lib.editorPop(date);
  assert.ok(editor.includes("<textarea"));
  assert.ok(!editor.includes("prop-table"));
  // Saved before this round with only the completionOnly flag: the category keeps it a text block.
  const oldRamp = lib.workoutToDayItems({ exercises: [{
    id: 32, exercise_id: 1, exercise: { name: "Ramp", category: "Warm up" }, superset_group: "A", order_index: 0,
    prescribed_sets: 1, target_reps: "1", target_weight: "", notes: "Jog 2 min\nFlags:completionOnly"
  }] })[0];
  assert.equal(lib.isTextOnlyItem(oldRamp), true);
  // Turning completion-only off and on again keeps a warm-up a text block.
  lib.toggleFlag(date, ramp.id, "completionOnly");
  assert.equal(lib.isTextOnlyItem(ramp), false);
  lib.toggleFlag(date, ramp.id, "completionOnly");
  assert.equal(lib.isTextOnlyItem(ramp), true);
  state.editor = null;
}

{
  // A library exercise with a default time and no reps is timed only.
  const plank = lib.fromCatalog({ name: "Plank", type: "lift" });
  assert.equal(plank.trackReps, false);
  assert.equal(plank.trackTime, true);
  assert.deepEqual(plank.times, ["30", "30"]);
  assert.equal(lib.scriptLine(plank), "2 x 30s");
  assert.deepEqual(plain(lib.entryColumns(plank)[0]), ["time", "Time (s)"]);
  // Seconds are not reps.
  assert.equal(lib.stats({ items: [plank] }).r, 0);

  const keys = lib.exerciseFields({ name: "Sprint", category: "Strength" }).map((f) => f.key);
  assert.ok(keys.indexOf("default_time") > keys.indexOf("default_reps"));
  assert.ok(keys.indexOf("default_distance") > keys.indexOf("default_time"));
  let payload = lib.libraryExercisePayload({ name: "Sprint", category: "Strength", default_sets: "3", default_reps: "2", default_distance: "10" });
  assert.equal(payload.default_reps, "2");
  assert.equal(payload.default_distance, "10");
  payload = lib.libraryExercisePayload({ name: "Plank", category: "Strength", default_reps: "", default_time: "30s" });
  assert.equal(payload.default_reps, "");
  assert.equal(payload.default_time, "30");
  payload = lib.libraryExercisePayload({ name: "Row", category: "Strength", default_reps: "" });
  assert.equal(payload.default_reps, "1");
  assert.equal(lib.exerciseDefaultsText({ category: "Strength", default_sets: 3, default_reps: "2", default_distance: "10" }), "3 × 2 · dist 10");
  assert.equal(lib.exerciseDefaultsText({ category: "Strength", default_sets: 2, default_reps: "", default_time: "30" }), "2 × 30s");

  // A draft kept in the browser from before this round is brought up to date when it loads.
  const draftDay = lib.dayFromDraft("ath", "2026-12-03", { items: [{
    id: "i900", type: "lift", name: "Hold", letter: "A", sets: 2, reps: ["20", "25"], loads: ["", ""], props: ["distance"],
    distances: ["5", "5"], trackTime: true, trackReps: false, trackDistance: false, completionOnly: false
  }] }, null);
  const held = draftDay.items[0];
  assert.deepEqual(held.times, ["20", "25"]);
  assert.equal(held.trackReps, false);
  assert.equal(held.trackDistance, true);
  assert.deepEqual(held.props, []);
  assert.equal(lib.scriptLine(held), "20s, 25s · 5 m");
}

{
  // Intensity takes one number or a range, in the library and on a set.
  assert.deepEqual(plain(lib.readIntensity({ intensity_kind: "RPE", intensity_value: "5-7" })), { intensity_kind: "rpe", intensity_value: "5-7" });
  assert.deepEqual(plain(lib.readIntensity({ intensity_kind: "RPE", intensity_value: "8" })), { intensity_kind: "rpe", intensity_value: "8" });
  assert.deepEqual(plain(lib.readIntensity({ intensity_kind: "% of 1-rep max", intensity_value: "70 – 80%" })), { intensity_kind: "pct1rm", intensity_value: "70-80" });
  assert.deepEqual(plain(lib.readIntensity({ intensity_kind: "RIR", intensity_value: "2 to 2" })), { intensity_kind: "rir", intensity_value: "2" });
  assert.ok(lib.readIntensity({ intensity_kind: "RPE", intensity_value: "7-5" }).error);
  assert.ok(lib.readIntensity({ intensity_kind: "RPE", intensity_value: "5-11" }).error);
  assert.ok(lib.readIntensity({ intensity_kind: "RPE", intensity_value: "abc" }).error);
  const field = lib.exerciseFields({ name: "Tempo Squat", category: "Strength", intensity_kind: "rpe", intensity_value: "5-7" }).find((f) => f.key === "intensity_value");
  assert.equal(field.value, "5-7");
  assert.notEqual(field.type, "number");

  // The athlete sees the range as the target and types the number they hit.
  const date = "2026-12-04";
  const tempo = lib.fromCatalog({ name: "Tempo Squat", type: "lift" });
  assert.deepEqual(tempo.intensities, ["5-7", "5-7"]);
  lib.ensureDay(date).items.push(tempo);
  assert.equal(lib.isIntensityRange("5-7"), true);
  assert.equal(lib.isIntensityRange("7"), false);
  assert.equal(lib.prefillEntry(tempo, "intensity", 0), "");
  state.entryItem = tempo.id;
  const html = lib.entryItem("ath", date, tempo);
  assert.ok(html.includes('aria-label="RPE set 1" inputmode="decimal" placeholder="5-7" value=""'));
  const key = "ath:" + date + ":" + tempo.id;
  lib.logCell(key, 0, "done", true, date, tempo.id, 0);
  assert.equal(state.logs[key].cells[0].done, false);
  assert.equal(state.logs[key].cells[0].entered.intensity, undefined);
  lib.logCell(key, 0, "intensity", "6", date, tempo.id, 0);
  assert.equal(state.logs[key].cells[0].done, true);
  // A single prescribed number still fills in.
  tempo.intensities = ["7", "7"];
  assert.equal(lib.prefillEntry(tempo, "intensity", 1), "7");
  state.entryItem = null;
}

{
  // Clicking the exercise name opens the same search, and picking one swaps the exercise in.
  const date = "2026-12-05";
  const squat = lib.fromCatalog({ name: "Back Squat", type: "lift" });
  squat.letter = "C";
  squat.sets = 5;
  squat.reps = ["3", "3", "3", "3", "3"];
  squat.loads = ["140", "140", "140", "140", "140"];
  lib.ensureDay(date).items.push(squat);
  lib.openEditor(date, squat.id);
  const head = lib.editorPop(date);
  assert.ok(head.includes("name-swap"));
  assert.ok(head.includes("openSwap('" + date + "','" + squat.id + "'"));
  assert.ok(!head.includes('aria-label="Exercise name"'));
  lib.openSwap(date, squat.id);
  assert.deepEqual(plain(state.swap), { date, id: squat.id });
  assert.equal(state.searchDay, date);
  assert.ok(state.editor && state.editor.id === squat.id);
  const pop = lib.searchPop(date);
  assert.ok(pop.includes("swapFromCatalog("));
  assert.ok(!pop.includes("addFromCatalog("));
  assert.ok(!pop.includes("Session Break"));
  assert.ok(!pop.includes("Create New Chain"));
  assert.ok(!pop.includes("chain-opt"));

  // Sets, reps, and load reset to the new exercise's library defaults. The slot stays.
  lib.swapFromCatalog(date, lib.CATALOG.findIndex((c) => c.name === "Sled Push"));
  await tick();
  const swapped = lib.findItem(date, squat.id);
  assert.equal(swapped.name, "Sled Push");
  assert.equal(swapped.id, squat.id);
  assert.equal(swapped.letter, "C");
  assert.equal(swapped.sets, 4);
  assert.deepEqual(swapped.reps, ["2", "2", "2", "2"]);
  assert.deepEqual(swapped.loads, ["", "", "", ""]);
  assert.equal(swapped.exerciseId, 3);
  assert.equal(state.swap, null);
  assert.equal(state.searchDay, null);
  assert.ok(state.editor && state.editor.id === squat.id);

  // If athletes logged sets in that slot, the coach is warned first and the old row is dropped.
  swapped.weId = 77;
  const calls = [];
  sandbox.__setApi(async (method, url) => {
    calls.push(method + " " + url);
    if (url === "/api/workout-exercises/77/logged-sets") return { days: 1, athletes: 1, logged_sets: 3 };
    return {};
  });
  lib.openSwap(date, squat.id);
  lib.swapFromCatalog(date, lib.CATALOG.findIndex((c) => c.name === "Plank"));
  await tick();
  assert.ok(calls.includes("GET /api/workout-exercises/77/logged-sets"));
  assert.equal(lib.findItem(date, squat.id).name, "Sled Push");
  assert.equal(state.modal.type, "confirm");
  assert.ok(state.modal.body.includes("3 sets logged on Sled Push"));
  assert.equal(state.swap, null);
  state.modal.onConfirm();
  const after = lib.findItem(date, squat.id);
  assert.equal(after.name, "Plank");
  assert.equal(after.weId, undefined);
  assert.equal(state.modal, null);
  state.editor = null;
}

{
  // The chain editor searches the library, marks videos, and can make a missing exercise.
  state.view = "lifts";
  lib.openChainEditor();
  let html = lib.chainEditorHtml(state.modal);
  assert.ok(html.includes('data-focus="chain-pick"'));
  assert.ok(html.includes("+ Create new exercise"));
  assert.ok(!html.includes("<option value="));
  assert.ok(!html.includes("Old Lift"));
  state.modal.pickQ = "squat";
  html = lib.chainEditorHtml(state.modal);
  assert.ok(html.includes("Back Squat"));
  assert.ok(html.includes("vid-mark"));
  assert.ok(!html.includes(">Ramp<"));
  assert.ok(html.includes("+ Create new exercise “squat”"));
  lib.addChainMember(2);
  assert.equal(state.modal.members.length, 1);
  assert.equal(state.modal.members[0].name, "Back Squat");
  assert.equal(state.modal.pickQ, "");

  const chainModal = state.modal;
  chainModal.name = "Lower prep";
  chainModal.pickQ = "Goblet Squat";
  lib.createExerciseForChain();
  assert.equal(state.modal.type, "edit");
  assert.equal(state.modal.fields.find((f) => f.key === "name").value, "Goblet Squat");
  // Cancel goes back to the chain, with its draft intact.
  lib.closeEdit();
  assert.equal(state.modal, chainModal);
  assert.equal(state.modal.name, "Lower prep");
  lib.createExerciseForChain();
  sandbox.__setApi(async (method, url, body) => {
    if (method === "POST" && url === "/api/exercises") return Object.assign({ id: 90 }, body);
    return {};
  });
  await lib.saveEdit();
  assert.equal(state.modal, chainModal);
  assert.deepEqual(plain(chainModal.members.map((m) => m.exercise_id)), [2, 90]);
  assert.ok(state.serverExercises.some((row) => row.id === 90 && row.name === "Goblet Squat"));
  state.modal = null;
}

{
  // The library: Hide and Delete for exercises and chains, and hidden ones come back with Unhide.
  state.managing = "All";
  state.liftQ = "";
  let page = lib.liftsView();
  assert.ok(page.includes("hideExercise(2)"));
  assert.ok(page.includes("askRemoveExercise(2)"));
  assert.ok(page.includes("hideChain(21)"));
  assert.ok(page.includes("askRemoveChain(21)"));
  assert.ok(!page.includes("Old Lift"));
  assert.ok(!page.includes("Old prep"));
  assert.ok(page.includes("Show hidden (2)"));
  state.showHiddenLibrary = true;
  page = lib.liftsView();
  assert.ok(page.includes("Old Lift"));
  assert.ok(page.includes("unhideExercise(5)"));
  assert.ok(page.includes("unhideChain(22)"));

  const calls = [];
  sandbox.__setApi(async (method, url, body) => {
    calls.push({ method, url, body });
    if (url === "/api/exercises/2/programming") return { days: 12, athletes: 5, logged_sets: 34 };
    if (url === "/api/exercises/2/remove-from-programming") return { days: 12, athletes: 5, logged_sets: 34, workout_ids: [] };
    if (url === "/api/chains/21/programming") return { days: 0, athletes: 0, logged_sets: 0 };
    return {};
  });
  await lib.unhideExercise(5);
  assert.ok(calls.some((c) => c.method === "DELETE" && c.url === "/api/gym/hidden-exercises/5"));
  assert.equal(state.serverExercises.find((row) => row.id === 5).hidden, false);
  assert.deepEqual(plain(state.hiddenExerciseIds), []);
  await lib.hideChain(21);
  assert.deepEqual(plain(calls[calls.length - 1]), { method: "POST", url: "/api/gym/hidden-chains", body: { chain_id: 21 } });
  assert.equal(state.chains.find((row) => row.id === 21).hidden, true);
  await lib.unhideChain(21);
  assert.equal(state.chains.find((row) => row.id === 21).hidden, false);

  // Delete says what it reaches before anything is removed.
  await lib.askRemoveExercise(2);
  assert.equal(state.modal.type, "confirm");
  assert.ok(state.modal.title.includes("Back Squat"));
  assert.ok(state.modal.body.includes("12 days"));
  assert.ok(state.modal.body.includes("5 athletes"));
  assert.ok(state.modal.body.includes("34 logged sets"));
  assert.ok(state.modal.body.includes("PRs stay"));
  assert.ok(state.modal.body.includes("cannot be undone"));
  assert.equal(state.modal.confirmLabel, "Delete from 12 days");
  assert.ok(!calls.some((c) => c.url.includes("remove-from-programming")));
  await state.modal.onConfirm();
  assert.ok(calls.some((c) => c.method === "POST" && c.url === "/api/exercises/2/remove-from-programming"));
  assert.equal(state.serverExercises.find((row) => row.id === 2).hidden, true);
  assert.equal(state.modal, null);
  await lib.askRemoveChain(21);
  assert.ok(state.modal.body.includes("None of your days use this chain"));
  assert.ok(!state.modal.body.includes("PRs"));
  state.modal = null;
  assert.equal(lib.removalWarning({ days: 1, athletes: 1, logged_sets: 1 }, "exercise").includes("1 logged set on those days is erased"), true);
}

console.log("round 6 ui tests passed");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
