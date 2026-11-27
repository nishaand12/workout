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
  state, editExercise, editModalHtml, setEditField, resetEditField, switchEditScope, saveEdit,
  changedLibraryValues, chainEditorCommit, chainScopeHtml, chainEditorHtml, workoutToDayItems
};
globalThis.__setApi = (fn) => { api = fn; };
`;
vm.runInContext(source, sandbox, { filename: "wourkout.js" });
const lib = sandbox.__lib;
const state = lib.state;

function field(key) {
  return state.modal.fields.find((f) => f.key === key);
}

(async () => {
  const calls = [];
  const replies = {};
  sandbox.__setApi(async (method, url, body) => {
    calls.push({ method, url, body });
    if (replies[method + " " + url]) return replies[method + " " + url](body);
    return {};
  });

  // A coach's own value is tagged "Yours" with a reset; a gym value is tagged "Gym".
  state.serverExercises = [{
    id: 7, name: "Back Squat", category: "Strength", video_url: "", default_sets: 5, default_reps: "3", default_rest: "120",
    default_load: "", default_time: "", default_distance: "", default_rest_rep: "", default_tempo: "", default_velocity: "",
    default_power: "", default_pct: "", default_notes: "", default_stations: "", intensity_kind: "", intensity_value: "",
    completion_only: false, can_edit_name: false,
    sources: { default_sets: "gym", default_reps: "coach", default_rest: "gym" },
    inherited: { default_sets: 3, default_reps: "5", default_rest: "90" }
  }];
  replies["GET /api/exercises/7/layers"] = () => ({
    scopes: ["coach", "gym"],
    coaches_with_own_values: 2,
    gym: {
      values: { video_url: "", default_sets: 5, default_reps: "5", default_rest: "120", default_load: "", default_time: "", default_distance: "",
        default_rest_rep: "", default_tempo: "", default_velocity: "", default_power: "", default_pct: "", default_notes: "",
        default_stations: "", intensity_kind: "", intensity_value: "", completion_only: false },
      sources: { default_sets: "gym", default_reps: "gym", default_rest: "gym" },
      inherited: { default_sets: 3, default_reps: "10", default_rest: "90" }
    }
  });
  lib.editExercise(7);
  assert.equal(field("default_reps").layer, "coach");
  assert.equal(field("default_reps").resettable, true);
  assert.equal(field("default_sets").layer, "gym");
  assert.equal(field("default_sets").resettable, false);
  assert.equal(field("default_tempo").layer, "");
  // Only the coach who added it renames it or changes its category.
  assert.equal(field("name").disabled, true);
  assert.equal(field("category").disabled, true);
  let html = lib.editModalHtml(state.modal);
  assert.ok(html.includes('layer-tag coach">Yours'));
  assert.ok(html.includes('layer-tag gym">Gym'));
  assert.ok(html.includes("resetEditField('default_reps')"));
  assert.ok(!html.includes("resetEditField('default_sets')"));
  assert.ok(/data-edit-key="name"[^>]*disabled/.test(html));
  assert.ok(html.includes("Only the coach who added it"));
  assert.ok(html.includes("Other coaches and other gyms are not affected"));

  // Saving sends only what changed, so untouched values keep following the gym.
  await new Promise((resolve) => setTimeout(resolve, 0));
  replies["PUT /api/exercises/7"] = (body) => Object.assign({}, state.serverExercises[0], { default_rest: body.default_rest || "120" });
  field("default_rest").value = "150";
  calls.length = 0;
  await state.modal.onSave(Object.fromEntries(state.modal.fields.filter((f) => !f.button).map((f) => [f.key, f.value])));
  const put = calls.find((c) => c.method === "PUT");
  assert.deepEqual(put.body, { name: "Back Squat", category: "Strength", default_rest: "150", scope: "coach" });

  // Reset puts back the value underneath and asks the server to follow it again.
  lib.editExercise(7);
  await new Promise((resolve) => setTimeout(resolve, 0));
  lib.resetEditField("default_reps");
  assert.equal(field("default_reps").value, "5");
  assert.equal(field("default_reps").layer, "");
  calls.length = 0;
  await state.modal.onSave(Object.fromEntries(state.modal.fields.filter((f) => !f.button).map((f) => [f.key, f.value])));
  const reset = calls.find((c) => c.method === "PUT").body;
  assert.deepEqual(reset.reset_fields, ["default_reps"]);
  assert.equal(reset.default_reps, "5");

  // A gym admin switches to the gym's defaults and can bring every coach back to them.
  lib.editExercise(7);
  await new Promise((resolve) => setTimeout(resolve, 0));
  html = lib.editModalHtml(state.modal);
  assert.ok(html.includes("switchEditScope('gym')"));
  lib.switchEditScope("gym");
  assert.equal(field("default_reps").value, "5");
  assert.equal(field("default_reps").layer, "gym");
  assert.equal(field("default_reps").resettable, true);
  html = lib.editModalHtml(state.modal);
  assert.ok(html.includes("Apply to all coaches (2 have their own values)"));
  assert.ok(html.includes("every coach in your gym"));
  field("default_sets").value = "4";
  calls.length = 0;
  await state.modal.onSave(Object.fromEntries(state.modal.fields.filter((f) => !f.button).map((f) => [f.key, f.value])));
  const gymSave = calls.find((c) => c.method === "PUT").body;
  assert.equal(gymSave.scope, "gym");
  assert.equal(gymSave.default_sets, 4);
  assert.ok(!("default_reps" in gymSave));

  // Athletes see the video of the coach who programmed the day.
  const days = lib.workoutToDayItems({ exercises: [{ id: 1, exercise_id: 7, order_index: 0, prescribed_sets: 3, target_reps: "5", notes: "",
    video_url: "https://youtu.be/mine", exercise: { id: 7, name: "Back Squat", category: "Strength", video_url: "https://youtu.be/shared" } }] });
  assert.equal(days[0].videoUrl, "https://youtu.be/mine");

  // A chain this coach did not make: change it on one day, or save a copy under a new name.
  state.chains = [{ id: 3, name: "Hips", kind: "Warm up", can_edit: false, members: [] }];
  state.modal = { type: "chain", source: "library", chainId: 3, name: "Hips", kind: "Warm up", pickQ: "", members: [{ exercise_id: 7, name: "Back Squat" }] };
  assert.ok(lib.chainEditorHtml(state.modal).includes("Save as my copy"));
  calls.length = 0;
  lib.chainEditorCommit();
  assert.equal(calls.length, 0);
  state.modal.name = "Hips (mine)";
  replies["POST /api/chains"] = (body) => ({ id: 4, name: body.name, kind: body.kind, can_edit: true, members: [] });
  lib.chainEditorCommit();
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(calls[0].url, "/api/chains");
  assert.equal(calls[0].body.name, "Hips (mine)");
  const dayScope = lib.chainScopeHtml({ source: "day", draft: { chainId: 3, name: "Hips", kind: "Warm up" } });
  assert.ok(dayScope.includes("applyChainScope('one')"));
  assert.ok(!dayScope.includes("applyChainScope('everywhere')"));
  state.chains[0].can_edit = true;
  assert.ok(lib.chainScopeHtml({ source: "day", draft: { chainId: 3, name: "Hips", kind: "Warm up" } }).includes("applyChainScope('everywhere')"));

  console.log("gym library ui tests passed");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
