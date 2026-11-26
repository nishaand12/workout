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
// Keep the page's document listeners so the keyboard shortcuts can be pressed.
const docListeners = {};
sandbox.document.addEventListener = (type, fn) => { (docListeners[type] = docListeners[type] || []).push(fn); };
vm.createContext(sandbox);

const source = fs.readFileSync("app/static/js/build-order.js", "utf8") + "\n" + fs.readFileSync("app/static/js/wourkout.js", "utf8") + `
globalThis.__lib = {
  state, item, ensureDay, findItem, dayCol, fromCatalog, workoutToDayItems, itemNotes, scriptLine, doseText,
  setSelectedLetter, toggleItem, selectedLetterPop, letterCode, exRow, editorHead, entryItem, entryColumns,
  athleteScheduleHtml, trackControl, togglePerSide, propRow, chainMemberDraft, chainMemberPayload, chainEditorHtml,
  chainMemberItem, addChainRest, removeChainRest, chainBoxPop, chainSubline, restItem, logCell, completeAllSets,
  openCopy, applyCopy, modalHtml, buildView, buildAthletes, noCalendarAthlete, placeOnCalendar, removeUser,
  newAthleteCalendarSelect, renderLoginGate, entryItemStatus
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
  if (method === "GET" && url === "/api/gym/context") return state.gymContext;
  if (method === "GET") return [];
  return {};
});

state.auth = { isAuthenticated: true, token: "", user: { id: 1, role: "coach", name: "Coach" } };
state.role = "coach";
state.view = "build";
state.gymContext = {
  athletes: [{ id: 7, name: "Ava Solo", email: "ava@example.com", calendar_id: null }],
  calendars: [{ id: 11, name: "Fall block", athlete_ids: [], athlete_names: [] }]
};
state.athleteId = "cal:11";
state.calendars = { "cal:11": {} };
state.calendarLoaded = { "cal:11": true };
state.serverExercises = [
  { id: 1, name: "Lunge", category: "Strength" },
  { id: 2, name: "Squat", category: "Strength" },
  { id: 3, name: "Rest Time", category: "Strength" }
];
const D = "2026-11-04";

// Shortcuts use Ctrl (or Cmd), so Shift + a letter types a capital.
{
  const day = lib.ensureDay(D);
  day.items = [lib.item({ name: "Squat", type: "lift", sets: 1, reps: ["5"] })];
  state.editor = { day: D, id: day.items[0].id };
  state.modal = null;
  const press = (ev) => {
    const full = Object.assign({ target: { tagName: "INPUT" }, preventDefault() { full.prevented = true; } }, ev);
    docListeners.keydown.forEach((fn) => fn(full));
    return full;
  };
  const shiftI = press({ key: "I", shiftKey: true });
  assert.ok(!shiftI.prevented, "Shift+I types a capital I");
  assert.ok(!state.modal || state.modal.type !== "info");
  const ctrlI = press({ key: "i", ctrlKey: true });
  assert.ok(ctrlI.prevented, "Ctrl+I opens additional info");
  state.modal = null;
  state.editor = null;
  state.searchDay = D;
  const shiftEnter = press({ key: "Enter", shiftKey: true });
  assert.ok(!shiftEnter.prevented, "Shift+Enter no longer creates an exercise");
  assert.ok(lib.dayCol(D).includes("Ctrl+Enter"));
  assert.ok(!lib.dayCol(D).includes("Shift+Enter"));
  state.searchDay = null;
}

// Several selected exercises take one letter together, in day order.
{
  const day = lib.ensureDay(D);
  day.items = [
    lib.item({ name: "Squat", letter: "A" }),
    lib.item({ name: "Lunge", letter: "B" }),
    lib.item({ name: "Row", letter: "C" }),
    lib.fromCatalog({ name: "Cue", type: "note" })
  ];
  day.items[0].selected = true;
  day.items[2].selected = true;
  day.items[3].selected = true;
  assert.ok(lib.dayCol(D).includes("Letter ▾"));
  lib.setSelectedLetter(D, "B");
  assert.deepEqual(day.items.map((it) => it.name + ":" + it.letter), ["Lunge:B", "Squat:B", "Row:B", "Cue:"]);
  assert.deepEqual(day.items.filter((it) => it.letter === "B").map((it) => lib.letterCode(day, it)), ["B1", "B2", "B3"]);
  lib.setSelectedLetter(D, "");
  assert.deepEqual(day.items.filter((it) => it.selected && it.type !== "note").map((it) => it.letter), ["", ""]);
  assert.ok(lib.selectedLetterPop(D).includes("letter-pop"));
}

// A note is a note: no letter, its text in the day and in the athlete's workout.
{
  const note = lib.fromCatalog({ name: "Coach note", type: "note" });
  note.note = "Keep the bar close";
  assert.equal(note.letter, "");
  const day = lib.ensureDay(D);
  day.items = [note];
  const row = lib.exRow(D, day, note);
  assert.ok(row.includes("ex-note"));
  assert.ok(row.includes("Keep the bar close"));
  assert.ok(!row.includes('class="letter"'));
  assert.ok(!lib.editorHead(D, note, day).includes("toggleEditorMenu('letterMenu'"));
  const loaded = lib.workoutToDayItems({ exercises: [{ id: 5, exercise_id: 9, superset_group: "A", order_index: 0, prescribed_sets: 0, target_reps: "", notes: "Breathe", exercise: { name: "Note", category: "Notes" } }] });
  assert.equal(loaded[0].letter, "");
  assert.ok(lib.athleteScheduleHtml(D, loaded).includes("ex-note"));
  const entry = lib.entryItem("ath", D, loaded[0]);
  assert.ok(entry.includes("entry-note") && entry.includes("Breathe"));
  assert.ok(!entry.includes('class="letter"'));
}

// Reps per side: a switch beside Reps, saved with the day, shown as 8/side.
{
  const day = lib.ensureDay(D);
  day.items = [lib.item({ name: "Lunge", type: "lift", sets: 3, reps: ["8", "8", "8"] })];
  const it = day.items[0];
  assert.ok(lib.trackControl(D, it).includes("/side"));
  lib.togglePerSide(D, it.id);
  assert.equal(it.perSide, true);
  assert.equal(lib.doseText(it), "3 x 8/side");
  assert.ok(lib.propRow(D, it, "reps").includes("Reps/side"));
  assert.deepEqual(JSON.parse(JSON.stringify(lib.entryColumns(it)))[0], ["r", "Reps/side"]);
  const notes = lib.itemNotes(it);
  assert.ok(/Flags:.*perSide/.test(notes));
  const back = lib.workoutToDayItems({ exercises: [{ id: 6, exercise_id: 1, superset_group: "A", order_index: 0, prescribed_sets: 3, target_reps: "8,8,8", notes, exercise: { name: "Lunge", category: "Strength" } }] });
  assert.equal(back[0].perSide, true);
  // Time-only work has no reps, so no /side switch.
  const timed = lib.item({ name: "Plank", type: "lift", sets: 1, reps: ["1"], trackReps: false, trackTime: true, times: ["30"] });
  assert.ok(!lib.trackControl(D, timed).includes("/side"));
  // Chain builder members carry it too.
  const mem = lib.chainMemberDraft({ exercise_id: 1, name: "Lunge", reps: "8", per_side: true });
  assert.equal(lib.chainMemberPayload(mem).per_side, true);
  const placed = lib.chainMemberItem({ id: 4, name: "Legs", kind: "Circuit" }, { exercise_id: 1, reps: "8", per_side: true }, 0, "i1", day, "A");
  assert.equal(placed.perSide, true);
}

// Rests: a saved rest comes back as a rest, and chains can hold them.
{
  const rest = lib.fromCatalog({ name: "Rest Time", type: "rest" });
  const notes = lib.itemNotes(rest);
  assert.ok(/Flags:.*\brest\b/.test(notes));
  const back = lib.workoutToDayItems({ exercises: [
    { id: 8, exercise_id: 3, superset_group: "A", order_index: 0, prescribed_sets: 1, target_reps: "90", notes, exercise: { name: "Rest Time", category: "Strength" } },
    { id: 9, exercise_id: 3, superset_group: "B", order_index: 1, prescribed_sets: 3, target_reps: "1,1,1", notes: "Times:45,45,45\nFlags:dose2,trackTime,noTrackReps", chain_id: 4, chain_instance: "i9", chain_name: "Legs", chain_kind: "Circuit", exercise: { name: "Rest Time", category: "Strength" } }
  ] });
  assert.equal(back[0].type, "rest");
  assert.equal(back[0].reps[0], "90");
  assert.equal(back[0].letter, "");
  assert.equal(back[1].type, "rest");
  assert.equal(back[1].reps[0], "45");
  assert.equal(back[1].chainInstance, "i9");

  const day = lib.ensureDay(D);
  const chain = { id: 4, name: "Legs", kind: "Circuit" };
  day.items = [
    lib.chainMemberItem(chain, { exercise_id: 1, reps: "8" }, 0, "i1", day, "A"),
    lib.chainMemberItem(chain, { exercise_id: 3, time: "30" }, 1, "i1", day, "A"),
    lib.chainMemberItem(chain, { exercise_id: 2, reps: "5" }, 2, "i1", day, "A")
  ];
  assert.equal(day.items[1].type, "rest");
  assert.equal(day.items[1].reps[0], "30");
  assert.equal(lib.chainSubline(day.items), "Circuit · 2 exercises · 1 rest");
  lib.addChainRest(D, "i1", day.items[2].id);
  assert.equal(day.items.length, 4);
  assert.equal(day.items[3].type, "rest");
  assert.equal(day.items[3].chainInstance, "i1");
  state.chainBox = { date: D, instance: "i1" };
  const box = lib.chainBoxPop();
  assert.ok(box.includes("Rest seconds"));
  assert.ok(box.includes("+ Rest after Lunge"));
  lib.removeChainRest(D, day.items[3].id);
  assert.equal(day.items.length, 3);
  state.chainBox = null;
  state.modal = { type: "chain", members: [lib.chainMemberDraft({ exercise_id: 3, name: "Rest Time", time: "60" })], name: "x", kind: "Circuit" };
  const builder = lib.chainEditorHtml(state.modal);
  assert.ok(builder.includes("1. Rest"));
  assert.ok(builder.includes("+ Add rest"));
  state.modal = null;
  // The athlete sees a rest line, not an empty set table.
  assert.ok(lib.entryItem("ath", D, back[0]).includes("Rest 90s"));
}

// Athlete sets: no Done box. Typing a weight marks the set done; the boxes keep their focus key.
{
  const day = lib.ensureDay(D);
  const lift = lib.item({ name: "Squat", type: "lift", sets: 2, reps: ["5", "5"], props: [] });
  day.items = [lift];
  state.entryItem = lift.id;
  const key = "ath:" + D + ":" + lift.id;
  let html = lib.entryItem("ath", D, lift);
  assert.ok(!html.includes('type="checkbox"'));
  assert.ok(!html.includes("<th>Done</th>"));
  assert.ok(html.includes('data-focus="entry-' + key + '-0-w"'));
  assert.ok(html.includes("data-keep"));
  lib.logCell(key, 0, "w", "60", D, lift.id, 0);
  assert.equal(state.logs[key].cells[0].done, true);
  assert.equal(state.logs[key].cells[0].entered.r, "5");
  html = lib.entryItem("ath", D, lift);
  assert.ok(html.includes("set-check"));
  lib.completeAllSets(key, D, lift.id, 0);
  assert.equal(state.logs[key].cells[1].done, true);
  assert.deepEqual(JSON.parse(JSON.stringify(lib.entryItemStatus("ath", D, lift))), { done: 2, total: 2 });
  assert.ok(lib.entryItem("ath", D, lift).includes("✓ Completed"));
  // All done: the button undoes the sets it completed, not the one with a typed weight.
  lib.completeAllSets(key, D, lift.id, 0);
  assert.equal(state.logs[key].cells[0].done, true);
  assert.equal(state.logs[key].cells[1].done, false);
}

// Copy a range of days: each lands the same number of days after the paste date.
{
  const start = "2026-11-08";
  lib.ensureDay(start).items = [lib.item({ name: "Squat" })];
  lib.ensureDay(start).title = "Lower";
  lib.ensureDay("2026-11-09").items = [];
  lib.ensureDay("2026-11-10").items = [lib.item({ name: "Lunge" }), lib.item({ name: "Row" })];
  lib.ensureDay("2026-11-16").items = [lib.item({ name: "Keep me" })];
  lib.ensureDay("2026-11-17").items = [lib.item({ name: "Old" })];
  lib.openCopy(start, "workout");
  assert.ok(lib.modalHtml().includes("Range of days"));
  state.modal.sourceRange = true;
  state.modal.sourceEnd = "2026-11-10";
  state.modal.target = "2026-11-15";
  assert.ok(lib.modalHtml().includes("Paste starting on"));
  assert.ok(lib.modalHtml().includes("3 days"));
  lib.applyCopy();
  const names = (d) => lib.ensureDay(d).items.map((it) => it.name);
  assert.deepEqual(names("2026-11-15"), ["Squat"]);
  assert.equal(lib.ensureDay("2026-11-15").title, "Lower");
  assert.deepEqual(names("2026-11-16"), ["Keep me"], "an empty day adds nothing");
  assert.deepEqual(names("2026-11-17"), ["Old", "Lunge", "Row"]);
  assert.notEqual(lib.ensureDay("2026-11-15").items[0].id, lib.ensureDay(start).items[0].id);
  // With Clear existing workouts the copy is exact, empty days included.
  lib.openCopy(start, "workout");
  Object.assign(state.modal, { sourceRange: true, sourceEnd: "2026-11-10", target: "2026-11-15", placement: "clear" });
  lib.applyCopy();
  assert.deepEqual(names("2026-11-16"), []);
  assert.deepEqual(names("2026-11-17"), ["Lunge", "Row"]);
  assert.equal(state.modal, null);
}

// An athlete on no calendar: Build says so instead of an empty grid.
{
  const target = lib.buildAthletes().find((a) => a.serverId === 7);
  assert.ok(target && !target.isCalendar);
  assert.ok(lib.noCalendarAthlete(target));
  state.athleteId = target.id;
  const html = lib.buildView();
  assert.ok(html.includes("isn't on a calendar"));
  assert.ok(html.includes("New calendar: Ava Solo"));
  assert.ok(!html.includes("cal-scroll build-cal"));
  calls.length = 0;
  await lib.placeOnCalendar(7, 11);
  assert.ok(calls.some((c) => c.method === "PUT" && c.url === "/api/users/7" && c.body.calendar_id === 11));
  state.athleteId = "cal:11";
}

// The add-athlete form picks a calendar, and removing a person asks first and says the calendar stays.
{
  const select = lib.newAthleteCalendarSelect(state.gymContext);
  assert.ok(select.includes("No calendar yet"));
  assert.ok(select.includes("Fall block"));
  assert.ok(select.includes('value="new" selected'));
  state.athletes = [{ id: "u7", serverId: 7, first: "Ava", last: "Solo", email: "ava@example.com", role: "athlete" }];
  state.coaches = [];
  calls.length = 0;
  lib.removeUser("u7");
  assert.equal(state.modal.type, "confirm");
  assert.ok(state.modal.body.includes("Their calendar stays"));
  assert.ok(!calls.some((c) => c.method === "DELETE"));
  state.modal = null;
}

// An invite link opens a set-password screen.
{
  const saved = state.auth;
  state.auth = { isAuthenticated: false, mode: "invite" };
  const gate = lib.renderLoginGate();
  assert.ok(gate.includes("Choose a password"));
  assert.ok(gate.includes("Set password and sign in"));
  state.auth = saved;
}

console.log("round 10 ui tests passed");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
