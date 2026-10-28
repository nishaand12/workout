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
  state, exerciseFields, exerciseRows, fromCatalog, libraryDefaultsFrom,
  workoutToDayItems, previewSheet, entryItem, itemNotes, parseNotes,
  addExerciseRecord, closeEdit, saveEdit, setEditField, catalogType,
  addItem, setLetter, ensureDay, item, liftsView, dayItemType, setIntensityKind,
  libraryExercisePayload, editModalHtml, mapEditFields, entryColumns,
  goalsView, prGoalRows, squadView, logCell
};
globalThis.__setApi = (fn) => { api = fn; };
`;
vm.runInContext(source, sandbox, { filename: "wourkout.js" });
const lib = sandbox.__lib;
const state = lib.state;

function keys(row) {
  return lib.exerciseFields(row).map((field) => field.key);
}

const strength = keys({ name: "Squat", category: "Strength", default_pct: "80" });
assert.ok(strength.includes("default_sets"));
assert.ok(strength.includes("default_reps"));
assert.ok(strength.includes("default_rest"));
assert.ok(strength.includes("default_rest_rep"));
assert.ok(strength.includes("default_distance"));
assert.ok(strength.includes("default_pct"));
assert.ok(strength.includes("add_intensity"));
assert.ok(!strength.includes("intensity_kind"));

state.modal = { type: "edit", liveCategory: true, fields: lib.exerciseFields({ category: "Strength" }), onSave() {} };
lib.setEditField("add_intensity", "1");
const withIntensity = state.modal.fields.map((field) => field.key);
assert.ok(withIntensity.includes("intensity_kind"));
assert.ok(withIntensity.includes("intensity_value"));
assert.equal(state.modal.fields.find((field) => field.key === "intensity_kind").value, "RPE");
assert.ok(!withIntensity.includes("add_intensity"));

lib.setEditField("category", "Notes");
const noteKeys = state.modal.fields.map((field) => field.key);
assert.ok(noteKeys.includes("default_notes"));
assert.ok(!noteKeys.includes("default_sets"));
assert.ok(!noteKeys.includes("intensity_kind"));

lib.setEditField("category", "Circuit");
const circuitKeys = state.modal.fields.map((field) => field.key);
assert.ok(circuitKeys.includes("default_stations"));
assert.ok(circuitKeys.includes("default_sets"));
assert.equal(state.modal.fields.find((field) => field.key === "default_sets").label, "Rounds");
assert.ok(circuitKeys.includes("default_notes"));
assert.ok(circuitKeys.includes("default_rest_rep"));

state.serverExercises = [
  { id: 1, name: "Squat", category: "Strength", hidden: false },
  { id: 2, name: "Skip", category: "Warm up", hidden: false },
  { id: 3, name: "Fly", category: "Speed/agility/cardio", hidden: false },
  { id: 4, name: "Cue", category: "Notes", hidden: false },
  { id: 5, name: "Mobility", category: "Circuit", hidden: false }
];
state.liftQ = "";
state.managing = "Warm up";
assert.deepEqual(lib.exerciseRows().map((row) => row.name), ["Skip"]);
state.managing = "All";
assert.equal(lib.exerciseRows().length, 5);
const listHtml = lib.liftsView();
assert.ok(listHtml.includes("All"));
assert.ok(listHtml.includes("Speed/agility/cardio"));
assert.ok(listHtml.includes('aria-label="Exercise category"'));
assert.ok(!listHtml.includes("aria-label=\"Category\""));

(async () => {
const posts = [];
sandbox.__setApi(async (method, url, body) => {
  posts.push({ method, url, body });
  return Object.assign({ id: 9, created_at: "2026-10-20T00:00:00" }, body);
});
state.view = "exercises";
state.serverExercises = [];
state.toolForm.exName = "Sprint A";
state.managing = "All";
lib.addExerciseRecord();
assert.equal(state.modal.type, "edit");
assert.equal(state.modal.fields.find((field) => field.key === "name").value, "Sprint A");
assert.equal(state.modal.fields.find((field) => field.key === "category").value, "Strength");
assert.ok(state.modal.fields.some((field) => field.key === "default_rest_rep"));
lib.closeEdit();
assert.equal(state.modal, null);
assert.equal(state.serverExercises.length, 0);
assert.equal(posts.length, 0);

lib.addExerciseRecord();
lib.setEditField("category", "Notes");
state.modal.fields.find((field) => field.key === "name").value = "Read this";
state.modal.fields.find((field) => field.key === "default_notes").value = "Breathe";
await sandbox.saveEdit();
assert.equal(posts.length, 1);
assert.equal(posts[0].method, "POST");
assert.equal(posts[0].url, "/api/exercises");
assert.equal(posts[0].body.category, "Notes");
assert.equal(posts[0].body.default_sets, 0);
assert.equal(posts[0].body.default_notes, "Breathe");
assert.equal(state.serverExercises.length, 1);
assert.equal(state.modal, null);

state.serverExercises = [{
  name: "Fly",
  category: "Speed/agility/cardio",
  default_sets: 4,
  default_reps: "3",
  default_load: "20",
  default_rest: "60",
  default_rest_rep: "5",
  default_distance: "30",
  default_tempo: "20X1",
  default_velocity: "1.2",
  default_power: "300",
  default_pct: "70",
  intensity_kind: "rpe",
  intensity_value: "8",
  video_url: ""
}];
assert.equal(lib.catalogType({ name: "Fly", type: "lift" }), "lift");
const fly = lib.fromCatalog({ name: "Fly", type: "lift" });
assert.equal(fly.sets, 4);
assert.equal(fly.reps[0], "3");
assert.equal(fly.loads[0], "20");
assert.equal(fly.rests[0], "60");
assert.equal(fly.restReps[0], "5");
assert.equal(fly.distances[0], "30");
assert.equal(fly.tempos[0], "20X1");
assert.equal(fly.velocities[0], "1.2");
assert.equal(fly.powers[0], "300");
assert.equal(fly.pcts[0], "70");
assert.equal(fly.intensityKind, "rpe");
assert.equal(fly.intensities[0], "8");
assert.ok(fly.props.includes("intensity"));

state.serverExercises.push({ name: "Bare", category: "Strength", default_sets: 3, default_reps: "10", default_pct: "75" });
const bare = lib.fromCatalog({ name: "Bare", type: "lift" });
assert.equal(bare.pcts[0], "75");
assert.ok(!bare.props.includes("intensity"));
assert.ok(!bare.intensityKind);

state.serverExercises.push({ name: "Cue", category: "Notes", default_notes: "Stay tall\nSoft knees", default_sets: 0 });
const cue = lib.fromCatalog({ name: "Cue", type: "note" });
assert.equal(cue.type, "note");
assert.equal(cue.sets, 0);
assert.equal(cue.note, "Stay tall\nSoft knees");

const items = lib.workoutToDayItems({
  exercises: [
    {
      id: 1, order_index: 0, superset_group: "A", prescribed_sets: 2, target_reps: "5", target_weight: "",
      notes: "line one\nline two",
      exercise: { name: "Warm", category: "Warm up" }
    },
    {
      id: 2, order_index: 1, superset_group: "B", prescribed_sets: 0, target_reps: "",
      notes: "Read me\nplease",
      exercise: { name: "Cue", category: "Notes", default_notes: "Read me\nplease" }
    },
    {
      id: 3, order_index: 2, superset_group: "C", prescribed_sets: 2, target_reps: "1",
      notes: "Inchworm\nCalf raise",
      exercise: { name: "Mobility", category: "Circuit" }
    },
    {
      id: 4, order_index: 3, superset_group: "D", prescribed_sets: 1, target_reps: "3", target_weight: "",
      notes: "RestReps:5\nDistances:30\nIntensityKind:rir\nIntensities:2\nProps:restRep,distance,intensity",
      exercise: { name: "Fly", category: "Speed/agility/cardio" }
    }
  ]
});
assert.equal(items[0].type, "lift");
assert.equal(items[1].type, "note");
assert.equal(items[1].sets, 0);
assert.ok(items[1].note.includes("Read me"));
assert.equal(items[2].type, "circuit");
assert.equal(items[3].type, "lift");
assert.equal(items[3].restReps[0], "5");
assert.equal(items[3].distances[0], "30");
assert.equal(items[3].intensityKind, "rir");
assert.ok(items[3].props.includes("intensity"));

const noteCard = lib.previewSheet(items[1], { done: false });
assert.ok(!noteCard.includes("Complete"));
assert.ok(noteCard.includes("Read me"));
const circuitCard = lib.previewSheet(items[2], { done: false });
assert.equal((circuitCard.match(/Complete/g) || []).length, 1);
const flyCard = lib.previewSheet(items[3], { done: false });
assert.ok(flyCard.includes("REST/REP"));
assert.ok(flyCard.includes("DISTANCE"));
assert.ok(flyCard.includes("RIR"));
assert.ok(flyCard.includes("Complete"));

state.role = "athlete";
state.entryItem = items[3].id;
state.auth.user = { id: 4, load_unit: "kg", distance_unit: "yd" };
const entry = lib.entryItem("u4", "2026-10-20", items[3]);
assert.ok(entry.includes("Rest/Rep (s)"));
assert.ok(entry.includes("Distance (yards)"));
assert.ok(entry.includes("RIR"));
const noteEntry = lib.entryItem("u4", "2026-10-20", items[1]);
assert.ok(!noteEntry.includes("Complete"));
assert.ok(noteEntry.includes("Read me"));

state.athleteId = "ath";
state.calendars = { ath: {} };
lib.addItem("2026-10-21", lib.item({ name: "One", letter: "A", type: "lift" }));
lib.addItem("2026-10-21", lib.item({ name: "Two", letter: "A", type: "note", sets: 0, reps: [] }));
const letters = lib.ensureDay("2026-10-21").items.map((it) => it.letter);
assert.deepEqual(letters, ["A", "B"]);

const day = lib.ensureDay("2026-10-22");
const first = lib.item({ name: "Alpha", letter: "A" });
const second = lib.item({ name: "Beta", letter: "B" });
day.items = [first, second];
lib.setLetter("2026-10-22", first.id, "B");
assert.equal(day.items[0].id, second.id);
assert.equal(day.items[0].letter, "B");
assert.equal(day.items[1].id, first.id);
assert.equal(day.items[1].letter, "B");

const roundTrip = lib.parseNotes(lib.itemNotes(fly), 0);
assert.equal(roundTrip.restReps[0], "5");
assert.equal(roundTrip.distances[0], "30");
assert.equal(roundTrip.intensityKind, "rpe");

{
  // Completion only lives on the library exercise and carries onto new calendar items.
  const strength = lib.exerciseFields({ name: "Push Up", category: "Strength", completion_only: true });
  const flag = strength.find((f) => f.key === "completion_only");
  assert.ok(flag && flag.checkbox);
  assert.equal(flag.value, "1");
  const modal = lib.editModalHtml({ title: "Edit exercise", fields: lib.mapEditFields(strength) });
  assert.ok(modal.includes("Completion only"));
  assert.ok(/data-edit-key="completion_only" checked/.test(modal));
  assert.ok(!lib.exerciseFields({ name: "Ramp", category: "Circuit" }).some((f) => f.key === "completion_only"));
  assert.ok(!lib.exerciseFields({ name: "Read me", category: "Notes" }).some((f) => f.key === "completion_only"));
  assert.equal(lib.libraryExercisePayload({ name: "Push Up", category: "Strength", completion_only: "1" }).completion_only, true);
  assert.equal(lib.libraryExercisePayload({ name: "Push Up", category: "Strength", completion_only: "" }).completion_only, false);
  assert.equal(lib.libraryExercisePayload({ name: "Ramp", category: "Circuit", completion_only: "1" }).completion_only, false);

  lib.state.serverExercises.push({ id: 991, name: "Bodyweight Plank", category: "Core & Trunk", default_sets: 3, default_reps: "30", completion_only: true });
  lib.state.serverExercises.push({ id: 992, name: "Weighted Squat", category: "Lower Body", default_sets: 3, default_reps: "5" });
  const plank = lib.fromCatalog({ name: "Bodyweight Plank", type: "lift" });
  const squat = lib.fromCatalog({ name: "Weighted Squat", type: "lift" });
  assert.equal(plank.completionOnly, true);
  assert.equal(squat.completionOnly, false);
  assert.ok(lib.entryColumns(squat).some((col) => col[0] === "w"));
  assert.ok(!lib.entryColumns(plank).some((col) => col[0] === "w"));
  assert.ok(lib.itemNotes(plank).includes("completionOnly"));
}

{
  // An unticked checkbox saves as off. Its DOM value is "on" either way.
  let saved = null;
  lib.state.modal = {
    type: "edit",
    fields: lib.mapEditFields([{ key: "name", value: "Push Up" }, { key: "completion_only", checkbox: "Completion only", value: "1" }]),
    onSave: async (values) => { saved = values; }
  };
  const realQuery = sandbox.document.querySelectorAll;
  sandbox.document.querySelectorAll = () => [
    { dataset: { editKey: "name" }, type: "text", value: "Push Up" },
    { dataset: { editKey: "completion_only" }, type: "checkbox", value: "on", checked: false }
  ];
  await lib.saveEdit();
  sandbox.document.querySelectorAll = realQuery;
  assert.equal(saved.completion_only, "");
  lib.state.modal = null;

  // Long forms lay out in two columns; name and multiline fields take the full row.
  const grid = lib.editModalHtml({ title: "Edit exercise", fields: lib.mapEditFields(lib.exerciseFields({ name: "Squat", category: "Strength" })) });
  assert.ok(grid.includes("edit-fields grid"));
  assert.ok(/edit-field span"><span>Name/.test(grid));
  assert.ok(grid.includes(">Save<") && grid.includes(">Cancel<"));
}

{
  // Ticking Done sends the reps and weight the boxes show, not zeros.
  const day = "2026-10-29";
  const row = lib.item({ name: "Front Squat", type: "lift", sets: 2, reps: ["5"], loads: ["80"], props: [] });
  row.weId = 4242;
  lib.ensureDay(day).items.push(row);
  state.entryAthlete = null;
  state.coachSessionFor = "x";
  state.openSession = { id: 77, set_logs: [] };
  const sent = [];
  sandbox.__setApi(async (method, url) => { sent.push(url); return { workout_exercise_id: 4242, set_number: 1 }; });
  lib.logCell("x:" + day + ":" + row.id, 0, "done", true, day, row.id, 4242);
  await new Promise((r) => setTimeout(r, 0));
  const params = new URLSearchParams(sent[0].split("?")[1]);
  assert.equal(params.get("weight"), "80");
  assert.equal(params.get("reps"), "5");
  assert.equal(params.get("completed"), "true");
  state.openSession = null;
  state.coachSessionFor = null;
}

{
  // Goals & PRs merges logged bests with goals, one row per athlete and lift.
  lib.state.role = "coach";
  lib.state.personalBests = [
    { user_id: 7, user_name: "Eric", exercise_id: 1, exercise_name: "Back Squat", weight: 140, reps: 3, date: "2026-10-20", load_unit: "kg" },
    { user_id: 7, user_name: "Eric", exercise_id: 2, exercise_name: "Bench", weight: 90, reps: 5, date: "2026-10-01", load_unit: "kg" }
  ];
  lib.state.serverRecords = [
    { id: 50, user_id: 7, exercise_id: 1, weight: 160, user: { name: "Eric" }, exercise: { name: "Back Squat" } },
    { id: 51, user_id: 7, exercise_id: 3, weight: 200, user: { name: "Eric" }, exercise: { name: "Deadlift" } }
  ];
  const rows = lib.prGoalRows();
  assert.equal(rows.length, 3);
  const squatRow = rows.find((r) => r.lift === "Back Squat");
  assert.equal(squatRow.best.weight, 140);
  assert.equal(squatRow.goal.id, 50);
  assert.equal(rows.find((r) => r.lift === "Deadlift").best, null);
  const page = lib.goalsView();
  assert.ok(page.includes("88%"));
  assert.ok(page.includes("Not logged yet"));
  assert.ok(page.includes("startGoal(&quot;Bench&quot;, 7)"));
  lib.state.serverRecords[0].weight = 120;
  assert.ok(lib.goalsView().includes("Goal hit"));
}

console.log("exercise library ui tests passed");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
