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
  state, LETTERS, LETTER_COLOR, item, ensureDay, findItem, dayCol, dayExerciseHtml, athleteDayCol, athleteScheduleHtml,
  beginDayTitle, typeDayTitle, dayTitleKey, endDayTitle, undo, publishDay, queueDaySave, ensureExercise,
  setCell, commitSetCell, changeSets, addChainToDay, selectChain, chainBoxPop, closeChainBox, setChainLetter,
  breakChain, openChainFromDay, openEditor, saveEditor, selectExercise, buildView
};
globalThis.__setApi = (fn) => { api = fn; };
`;
vm.runInContext(source, sandbox, { filename: "wourkout.js" });
const lib = sandbox.__lib;
const state = lib.state;
const tick = (ms) => new Promise((resolve) => setTimeout(resolve, ms || 0));

(async () => {

const calls = [];
let saveGate = null;
sandbox.__setApi(async (method, url, body) => {
  calls.push({ method, url, body });
  if (method === "GET" && url.startsWith("/api/assignments")) return [];
  if (method === "GET" && url.startsWith("/api/exercises")) return [{ id: 99, name: "Unlisted Lift" }];
  if (method === "POST" && url === "/api/workouts") {
    if (saveGate) await saveGate;
    return { id: 42, exercises: [] };
  }
  if (method === "PUT" && url.startsWith("/api/workouts/")) return { id: 42, exercises: [] };
  if (method === "POST" && url === "/api/assignments") return { id: 77 };
  if (method === "GET" && url === "/api/gym/context") return state.gymContext || {};
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
  { id: 1, name: "Skip", category: "Warm up" },
  { id: 2, name: "Squat", category: "Strength", default_sets: 3, default_reps: "5" },
  { id: 3, name: "Press", category: "Strength" }
];
state.chains = [{
  id: 9, name: "Ramp", kind: "Warm up",
  members: [
    { exercise_id: 1, exercise: { name: "Skip", category: "Warm up" } },
    { exercise_id: 2, exercise: { name: "Squat", category: "Strength" } }
  ]
}];

{
  // The four letters a day uses most are four clearly different hues, and no two letters share one.
  const colors = lib.LETTERS.map((L) => lib.LETTER_COLOR[L]);
  assert.equal(new Set(colors).size, lib.LETTERS.length);
  const hue = (hex) => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    if (max === min) return 0;
    const d = max - min;
    const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return (h * 60 + 360) % 360;
  };
  const first = ["A", "B", "C", "D"].map((L) => hue(lib.LETTER_COLOR[L]));
  for (let i = 0; i < first.length; i++) {
    for (let j = i + 1; j < first.length; j++) {
      const gap = Math.abs(first[i] - first[j]);
      assert.ok(Math.min(gap, 360 - gap) >= 60, "letters " + i + " and " + j + " are too close in hue");
    }
  }
}

{
  // A day shows no week label and no "Saved for" line, and its name is a text box.
  const date = "2026-12-01";
  const day = lib.ensureDay(date);
  day.items.push(lib.item({ name: "Squat", letter: "A", sets: 3, reps: ["5", "5", "5"] }));
  day.title = "Lower";
  day.savedWorkoutId = 5;
  day.savedFor = "cal:11";
  const html = lib.dayCol(date);
  assert.ok(!html.includes("week-label"));
  assert.ok(!/Week \d/.test(html));
  assert.ok(!html.includes("Saved for"));
  assert.ok(!html.includes("editWorkoutDay"));
  assert.ok(/<input class="day-title"[^>]*data-focus="title-2026-12-01"[^>]*value="Lower"/.test(html));
  const athleteHtml = lib.athleteDayCol(date);
  assert.ok(!athleteHtml.includes("week-label"));
  assert.ok(!/Week \d/.test(athleteHtml));

  // Typing renames the saved workout in place: one undo step, and the new name is what gets sent.
  const undoBefore = state.undo.length;
  lib.beginDayTitle(date);
  lib.typeDayTitle(date, "Lower B");
  lib.typeDayTitle(date, "Lower Body ");
  assert.equal(day.title, "Lower Body ");
  assert.equal(state.undo.length, undoBefore + 1);
  assert.equal(day.edited, true);
  lib.endDayTitle(date);
  assert.equal(day.title, "Lower Body");
  calls.length = 0;
  assert.equal(await lib.publishDay(date, { quiet: true }), true);
  const sent = calls.find((c) => c.method === "POST" && c.url === "/api/workouts");
  assert.equal(sent.body.title, "Lower Body");
  // The exercises on the day are in the loaded library, so saving looks none of them up.
  assert.ok(!calls.some((c) => c.url.startsWith("/api/exercises")));

  // Escape puts the old name back and takes its undo step with it.
  lib.beginDayTitle(date);
  lib.typeDayTitle(date, "Oops");
  const field = { value: "Oops", blur() { lib.endDayTitle(date); } };
  lib.dayTitleKey({ key: "Escape", target: field, preventDefault() {}, stopPropagation() {} }, date);
  assert.equal(day.title, "Lower Body");
  assert.equal(field.value, "Lower Body");
  assert.equal(state.undo.length, undoBefore + 1);
}

{
  // A day with nothing on it can be named before its exercises go in; saving keeps the name.
  const date = "2026-12-02";
  const day = lib.ensureDay(date);
  assert.ok(lib.dayCol(date).includes('placeholder="Add Workout Name"'));
  lib.beginDayTitle(date);
  lib.typeDayTitle(date, "Upper");
  lib.endDayTitle(date);
  calls.length = 0;
  assert.equal(await lib.publishDay(date, { quiet: true }), true);
  assert.equal(day.title, "Upper");
  assert.equal(calls.find((c) => c.method === "POST" && c.url === "/api/workouts").body.title, "Upper");
  assert.ok(/value="Upper"/.test(lib.dayCol(date)));
  // Left unnamed, an empty saved day still reads Rest.
  const rest = lib.ensureDay("2026-12-03");
  assert.equal(await lib.publishDay("2026-12-03", { quiet: true }), true);
  assert.equal(rest.title, "Rest");
  assert.ok(lib.dayCol("2026-12-03").includes('placeholder="Rest"'));
  assert.ok(/<input class="day-title"[^>]*value=""/.test(lib.dayCol("2026-12-03")));
}

{
  // Set 1 fills the sets that match it, every time it is edited, not only the first.
  const date = "2026-12-04";
  const day = lib.ensureDay(date);
  const it = lib.item({ name: "Press", letter: "A", sets: 1, reps: ["1"] });
  day.items.push(it);
  lib.changeSets(date, it.id, 1);
  lib.changeSets(date, it.id, 1);
  assert.deepEqual(it.reps.map(String), ["1", "1", "1"]);
  lib.setCell(date, it.id, "reps", 0, "8");
  lib.commitSetCell(date, it.id, "reps", 0);
  assert.deepEqual(it.reps, ["8", "8", "8"]);
  // A second visit to set 1 fills again. Typing "10" passes through "1" on the way.
  lib.setCell(date, it.id, "reps", 0, "1");
  lib.setCell(date, it.id, "reps", 0, "10");
  lib.commitSetCell(date, it.id, "reps", 0);
  assert.deepEqual(it.reps, ["10", "10", "10"]);
  // A set given its own value keeps it.
  lib.setCell(date, it.id, "reps", 2, "6");
  lib.setCell(date, it.id, "reps", 0, "12");
  lib.commitSetCell(date, it.id, "reps", 0);
  assert.deepEqual(it.reps, ["12", "12", "6"]);
  // Brought back in line with set 1, it follows again.
  lib.setCell(date, it.id, "reps", 2, "12");
  lib.setCell(date, it.id, "reps", 0, "9");
  lib.commitSetCell(date, it.id, "reps", 0);
  assert.deepEqual(it.reps, ["9", "9", "9"]);
  // The same holds for a property row, and a new set copies the last one.
  lib.setCell(date, it.id, "load", 0, "100");
  lib.commitSetCell(date, it.id, "load", 0);
  assert.deepEqual(it.loads, ["100", "100", "100"]);
  lib.changeSets(date, it.id, 1);
  assert.deepEqual(it.reps, ["9", "9", "9", "9"]);
  lib.setCell(date, it.id, "reps", 0, "7");
  assert.deepEqual(it.reps, ["7", "7", "7", "7"]);
  lib.commitSetCell(date, it.id, "reps", 0);
}

{
  // A chain is one exercise-style row. Its buttons are in the box a click opens.
  const date = "2026-12-07";
  lib.addChainToDay(date, 9);
  const day = lib.ensureDay(date);
  const instance = day.items[0].chainInstance;
  state.chainBox = null;
  const row = lib.dayExerciseHtml(date, day);
  assert.ok(/class="ex chain-head"/.test(row));
  assert.ok(row.includes('<div class="ex-name">Ramp</div>'));
  assert.ok(row.includes('<div class="ex-sub">Warm up · 2 exercises</div>'));
  assert.ok(!row.includes("Edit chain") && !row.includes("Break apart"));
  assert.ok(!row.includes("chain-mark"));
  assert.ok(!row.includes("Skip"));
  assert.equal(lib.chainBoxPop(), "");

  lib.selectChain(date, instance, { stopPropagation() {} });
  assert.deepEqual(JSON.parse(JSON.stringify(state.chainBox)), { date, instance });
  assert.equal(state.pick.level, "chain");
  const box = lib.chainBoxPop();
  assert.ok(box.includes("Edit chain") && box.includes("Break apart") && box.includes("Delete chain"));
  assert.ok(lib.buildView().includes("chain-box"));
  assert.ok(/class="ex chain-head editing"/.test(lib.dayExerciseHtml(date, day)));

  // The letter is set from the box, and the box stays open for it.
  lib.setChainLetter(date, instance, "C");
  assert.ok(day.items.every((it) => it.letter === "C"));
  assert.ok(state.chainBox);
  assert.ok(lib.dayExerciseHtml(date, day).includes(lib.LETTER_COLOR.C));

  // Clicking the row again shuts the box; so does picking an exercise or opening its editor.
  lib.selectChain(date, instance, { stopPropagation() {} });
  assert.equal(state.chainBox, null);
  lib.selectChain(date, instance);
  assert.ok(state.chainBox);
  day.items.push(lib.item({ name: "Press", letter: "D", sets: 1, reps: ["1"] }));
  lib.openEditor(date, day.items[day.items.length - 1].id);
  assert.equal(state.chainBox, null);
  assert.ok(state.editor);
  // Opening the chain's box closes the exercise editor: one box at a time.
  lib.selectChain(date, instance);
  assert.equal(state.editor, null);
  assert.ok(state.chainBox);

  // The athlete's calendar shows the chain the same way.
  const mine = lib.athleteScheduleHtml(date, day.items);
  assert.ok(mine.includes('<div class="ex-name">Ramp</div>'));
  assert.ok(mine.includes("Warm up · 2 exercises"));

  lib.breakChain(date, instance);
  assert.equal(state.chainBox, null);
  assert.ok(day.items.every((it) => !it.chainInstance));
}

{
  // Saves for one day do not pile up: edits made while a save waits its turn ride along with it.
  await tick(700);
  const date = "2026-12-08";
  const day = lib.ensureDay(date);
  day.items.push(lib.item({ name: "Squat", letter: "A", sets: 1, reps: ["1"] }));
  day.edited = true;
  let release;
  saveGate = new Promise((resolve) => { release = resolve; });
  calls.length = 0;
  const first = lib.queueDaySave("cal:11", date, { explicit: false });
  await tick();
  await tick();
  const second = lib.queueDaySave("cal:11", date, { explicit: false });
  const third = lib.queueDaySave("cal:11", date, { explicit: false });
  const fourth = lib.queueDaySave("cal:11", date, { explicit: false });
  assert.notEqual(first, second);
  assert.equal(second, third);
  assert.equal(third, fourth);
  day.items.push(lib.item({ name: "Press", letter: "B", sets: 1, reps: ["1"] }));
  day.editSeq = (day.editSeq || 0) + 1;
  day.edited = true;
  saveGate = null;
  release();
  await Promise.all([first, second]);
  const writes = calls.filter((c) => (c.method === "POST" && c.url === "/api/workouts") || (c.method === "PUT" && c.url.startsWith("/api/workouts/")));
  assert.equal(writes.length, 2);
  assert.equal(writes[1].body.exercises.length, 2);
  assert.equal(day.edited, false);

  // Closing the editor on a day that autosave already wrote sends nothing more.
  calls.length = 0;
  lib.openEditor(date, day.items[0].id);
  lib.saveEditor();
  await tick();
  await tick();
  assert.equal(calls.length, 0);

  // A name the library does not hold is still looked up.
  const found = await lib.ensureExercise("Unlisted Lift", "Strength");
  assert.equal(found.id, 99);
  assert.ok(calls.some((c) => c.url.startsWith("/api/exercises?search=")));
}

console.log("round 7 ui tests passed");
process.exit(0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
