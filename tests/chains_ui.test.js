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
  state, searchPop, addChainToDay, breakChain, ensureDay, workoutToDayItems,
  previewSheet, openChainEditor, chainEditorCommit, chainScopeHtml, dayExerciseHtml,
  applyChainScope, item, dragIdsForChain
};
globalThis.__setApi = (fn) => { api = fn; };
`;
vm.runInContext(source, sandbox, { filename: "wourkout.js" });
const lib = sandbox.__lib;
const state = lib.state;

state.serverExercises = [
  { id: 1, name: "Skip", category: "Warm up", video_url: "https://youtu.be/skip", hidden: false },
  { id: 2, name: "Squat", category: "Strength", video_url: "https://youtu.be/squat", default_sets: 3, default_reps: "5", hidden: false },
  { id: 3, name: "Cue", category: "Notes", default_notes: "Read this", default_sets: 0, video_url: "", hidden: false },
  { id: 4, name: "Mobility", category: "Circuit", default_stations: "Inchworm", default_sets: 1, default_reps: "1", video_url: "https://youtu.be/circuit", hidden: false }
];
state.chains = [{
  id: 9,
  name: "Ramp",
  kind: "Warm up",
  members: [
    { exercise_id: 1, exercise: { name: "Skip", category: "Warm up", video_url: "https://youtu.be/skip" } },
    { exercise_id: 2, exercise: { name: "Squat", category: "Strength", video_url: "https://youtu.be/squat" } },
    { exercise_id: 2, exercise: { name: "Squat", category: "Strength", video_url: "https://youtu.be/squat" } },
    { exercise_id: 3, exercise: { name: "Cue", category: "Notes", video_url: "" } }
  ]
}];
state.athleteId = "ath";
state.calendars = { ath: {} };
state.searchQ = "";
state.searchDay = "2026-10-21";

const pop = lib.searchPop("2026-10-21");
assert.ok(pop.includes("chain-opt"));
assert.ok(pop.includes("chain-mark"));
assert.ok(pop.includes("Ramp"));
assert.ok(pop.includes('class="opt"'));
assert.ok(pop.indexOf("chain-opt") < pop.indexOf('class="opt"'));

lib.addChainToDay("2026-10-21", 9);
const day = lib.ensureDay("2026-10-21");
assert.equal(day.items.length, 4);
assert.equal(day.items[0].chainId, 9);
assert.ok(day.items.every((it) => it.chainInstance === day.items[0].chainInstance));
assert.equal(day.items[1].exerciseId, day.items[2].exerciseId);
assert.equal(day.items[1].name, "Squat");
assert.equal(day.items[0].videoUrl, "https://youtu.be/skip");
assert.equal(day.items[1].videoUrl, "https://youtu.be/squat");
assert.notEqual(day.items[0].letter, day.items[1].letter);
assert.equal(day.items[3].type, "note");
assert.equal(day.items[3].sets, 0);
assert.equal(day.items[3].note, "Read this");

day.items.push(lib.item({
  name: "Station Circuit",
  type: "circuit",
  letter: "J",
  sets: 1,
  reps: ["1"],
  detail: "Inchworm",
  completionOnly: true
}));
const html = lib.dayExerciseHtml("2026-10-21", day);
assert.equal((html.match(/chain-block/g) || []).length, 1);
assert.ok(html.includes('data-chain-instance="'));
assert.ok(html.includes("Break apart"));
assert.ok(/class="chain-block" draggable="true"[^>]*ondragstart="dragStart/.test(html));
const headAt = html.indexOf("chain-head");
const nextDrag = html.indexOf('draggable="true" ondragstart="dragStart', headAt);
const memberHtml = html.slice(headAt, nextDrag);
assert.ok(memberHtml.includes("Skip"));
assert.ok(!memberHtml.includes("ondragstart"));
assert.ok(html.indexOf("chain-block") < html.indexOf("Station Circuit"));
assert.ok(html.slice(html.indexOf("chain-block"), html.indexOf("Station Circuit")).includes("Ramp"));

const noteCard = lib.previewSheet(day.items[3], {});
assert.ok(noteCard.includes("Read this"));
assert.ok(!noteCard.includes("Complete"));
const circuitCard = lib.previewSheet(day.items[4], {});
assert.equal((circuitCard.match(/Complete/g) || []).length, 1);

const instance = day.items[0].chainInstance;
lib.breakChain("2026-10-21", instance);
assert.ok(day.items.slice(0, 4).every((it) => !it.chainInstance && !it.chainId));
assert.equal(state.chains[0].name, "Ramp");
assert.equal(state.chains[0].members.length, 4);
const broken = lib.dayExerciseHtml("2026-10-21", day);
assert.ok(!broken.includes("chain-block"));

const restored = lib.workoutToDayItems({
  exercises: [
    {
      id: 5, exercise_id: 2, order_index: 0, superset_group: "A", prescribed_sets: 3, target_reps: "5",
      target_weight: "", notes: "", chain_id: 9, chain_instance: "c9xi1", chain_name: "Ramp",
      chain_kind: "Warm up", chain_order: 0,
      exercise: { name: "Squat", category: "Strength", video_url: "https://youtu.be/squat" }
    },
    {
      id: 6, exercise_id: 4, order_index: 1, superset_group: "B", prescribed_sets: 1, target_reps: "1",
      target_weight: "", notes: "Inchworm", chain_id: 9, chain_instance: "c9xi1", chain_name: "Ramp",
      chain_kind: "Warm up", chain_order: 1,
      exercise: { name: "Mobility", category: "Circuit", video_url: "https://youtu.be/circuit" }
    }
  ]
});
assert.equal(restored[0].chainInstance, restored[1].chainInstance);
assert.equal(restored[0].videoUrl, "https://youtu.be/squat");
assert.equal(restored[1].videoUrl, "https://youtu.be/circuit");
assert.equal(restored[1].type, "circuit");
assert.equal((lib.previewSheet(restored[1], {}).match(/Complete/g) || []).length, 1);

function cloneRows(rows) {
  return JSON.parse(JSON.stringify(rows));
}
lib.addChainToDay("2026-10-23", 9);
const chainDay = lib.ensureDay("2026-10-23");
const members = cloneRows(chainDay.items);
const memberIds = members.map((it) => it.id);
assert.deepEqual(lib.dragIdsForChain(members, [memberIds[2]]), memberIds);
assert.deepEqual(lib.dragIdsForChain(members, [memberIds[0]]), memberIds);
const loose = lib.item({ name: "Press", letter: "A", type: "lift" });
assert.deepEqual(lib.dragIdsForChain([loose].concat(members), [loose.id]), [loose.id]);

const above = lib.item({ name: "Press", letter: "A", type: "lift" });
const below = lib.item({ name: "Row", letter: "A", type: "lift" });
const shared = sandbox.placeDroppedItems([above, below].concat(cloneRows(members)), memberIds, below.id);
assert.equal(shared[0].name, "Press");
assert.deepEqual(shared.slice(1, 5).map((it) => it.name), members.map((it) => it.name));
assert.ok(shared.slice(1, 5).every((it) => it.letter === "A" && it.chainInstance === members[0].chainInstance));
assert.equal(shared[5].name, "Row");

const boundaryAbove = lib.item({ name: "Press", letter: "A", type: "lift" });
const boundaryBelow = lib.item({ name: "Row", letter: "B", type: "lift" });
const boundary = sandbox.placeDroppedItems([boundaryAbove, boundaryBelow].concat(cloneRows(members)), memberIds, boundaryBelow.id);
assert.deepEqual(boundary.slice(1, 5).map((it) => it.letter), ["A", "A", "A", "A"]);
assert.equal(boundary[5].letter, "B");
assert.ok(boundary.slice(1, 5).every((it) => it.chainInstance === members[0].chainInstance));

const first = lib.item({ name: "Press", letter: "A", type: "lift" });
const beforeFirst = sandbox.placeDroppedItems([first].concat(cloneRows(members)), memberIds, first.id);
assert.deepEqual(beforeFirst.slice(0, 4).map((it) => it.letter), members.map((it) => it.letter));
assert.equal(beforeFirst[4].name, "Press");

const tail = lib.item({ name: "Press", letter: "A", type: "lift" });
const atEnd = sandbox.placeDroppedItems([tail].concat(cloneRows(members)), memberIds, null);
assert.deepEqual(atEnd.slice(1).map((it) => it.letter), members.map((it) => it.letter));
assert.ok(atEnd.slice(1).every((it) => it.chainInstance));

lib.breakChain("2026-10-23", members[0].chainInstance);
const apart = lib.ensureDay("2026-10-23");
assert.ok(apart.items.every((it) => !it.chainInstance && !it.chainId));
assert.equal(state.chains[0].name, "Ramp");
assert.deepEqual(lib.dragIdsForChain(apart.items, [apart.items[1].id]), [apart.items[1].id]);

lib.openChainEditor(9);
assert.equal(state.modal.type, "chain");
assert.equal(state.modal.members.length, 4);
lib.chainEditorCommit();
assert.equal(state.modal.type, "chain-scope");
assert.equal(state.modal.source, "library");
const scope = lib.chainScopeHtml(state.modal);
assert.ok(scope.includes("Only this one"));
assert.ok(scope.includes("Future workouts"));
assert.ok(scope.includes("Change everywhere"));
assert.ok(!scope.includes("This week"));

(async () => {
  const posts = [];
  sandbox.__setApi(async (method, url, body) => {
    posts.push({ method, url, body });
    return { chain: Object.assign({ id: 9, members: [] }, body), updated_workout_ids: [] };
  });
  await lib.applyChainScope("future");
  assert.equal(posts.length, 1);
  assert.equal(posts[0].method, "POST");
  assert.equal(posts[0].url, "/api/chains/9/edit");
  assert.equal(posts[0].body.scope, "future");
  assert.equal(posts[0].body.source, "library");
  assert.equal(posts[0].body.members.length, 4);
  assert.equal(posts[0].body.members[1].exercise_id, posts[0].body.members[2].exercise_id);
  console.log("chain ui tests passed");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
