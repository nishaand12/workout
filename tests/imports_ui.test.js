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
  state, item, ensureDay, parseTable, rosterFromText, rosterPreview, uploadPreviewHtml, importUsers, usersView,
  libraryRowsFromText, libraryImportPreview, openLibraryImport, previewLibraryImport, runLibraryImport, modalHtml,
  setTeamBuildrData, teamBuildrDefaultStart, teamBuildrTargetDate, teamBuildrItem, teamBuildrImportHtml, pickTeamBuildrMatch,
  setTeamBuildrOther, runTeamBuildrImport, openTeamBuildrImport, itemNotes, workoutToDayItems, scriptLine, isTextOnlyItem, buildView,
  addDays, sundayOf, today: () => APP_TODAY
};
globalThis.__setApi = (fn) => { api = fn; };
globalThis.__extra = {};
`;
vm.runInContext(source, sandbox, { filename: "wourkout.js" });
const lib = sandbox.__lib;
const state = lib.state;

(async () => {

const calls = [];
let reply = async () => ({});
sandbox.__setApi(async (method, url, body) => {
  calls.push({ method, url, body });
  if (method === "GET" && url === "/api/gym/context") return state.gymContext;
  if (method === "GET" && !url.startsWith("/api/import")) return [];
  return reply(method, url, body);
});
state.auth = { isAuthenticated: true, token: "t", user: { id: 1, role: "coach", name: "Coach", gym_id: 1 } };
state.role = "coach";
state.gymContext = {
  gym_id: 1,
  athletes: [{ id: 7, name: "Ava Solo", email: "ava@example.com", calendar_id: null }],
  calendars: [{ id: 11, name: "Fall block", athlete_ids: [], athlete_names: [] }],
  teams: [{ id: 4, name: "Varsity", coach_id: 1 }],
  coaches: [], codes: []
};

// ---- parseTable: CSV, quoted cells, and cells pasted from a spreadsheet ----
{
  assert.deepEqual(JSON.parse(JSON.stringify(lib.parseTable('Name,Email\r\n"Lee, Sam",sam@x.com\r\n\r\n"Jo ""JJ"" Kim",jo@x.com\n'))),
    [["Name", "Email"], ["Lee, Sam", "sam@x.com"], ['Jo "JJ" Kim', "jo@x.com"]]);
  assert.deepEqual(JSON.parse(JSON.stringify(lib.parseTable("First\tLast\tEmail\nSam\tLee\tsam@x.com"))),
    [["First", "Last", "Email"], ["Sam", "Lee", "sam@x.com"]]);
  assert.deepEqual(JSON.parse(JSON.stringify(lib.parseTable("﻿a;b\n1;2"))), [["a", "b"], ["1", "2"]]);
  assert.deepEqual(JSON.parse(JSON.stringify(lib.parseTable('"multi\nline",x'))), [["multi\nline", "x"]]);
}

// ---- roster: headings pick the columns; without them each line is read the old way ----
{
  const plain = lib.rosterFromText("Sam Lee\nJo Kim, jo@gym.com\n");
  assert.deepEqual(JSON.parse(JSON.stringify(plain)), [
    { first: "Sam", last: "Lee", email: "" }, { first: "Jo", last: "Kim", email: "jo@gym.com" }
  ]);
  const headed = lib.rosterFromText("Email,Last Name,First Name,Phone\nsam@x.com,Lee,Sam,555\n,Kim,Jo,");
  assert.deepEqual(JSON.parse(JSON.stringify(headed)), [
    { first: "Sam", last: "Lee", email: "sam@x.com" }, { first: "Jo", last: "Kim", email: "" }
  ]);
  const full = lib.rosterFromText("Athlete Name\tE-mail\nMaya Lin Chen\tmaya@x.com");
  assert.deepEqual(JSON.parse(JSON.stringify(full)), [{ first: "Maya", last: "Lin Chen", email: "maya@x.com" }]);
  // Pasted spreadsheet cells without a heading row still find the email.
  const pasted = lib.rosterFromText("Sam Lee\tsam@x.com\nJo Kim\t");
  assert.equal(pasted[0].email, "sam@x.com");
  assert.equal(pasted[0].first + " " + pasted[0].last, "Sam Lee");
}

// ---- preview: new, already here, and the reasons a row is skipped ----
{
  const people = lib.rosterFromText("Name,Email\nNew Person,new@x.com\nAva Solo,AVA@example.com\nNew Person,new@x.com\nBad Mail,bad@\n,\nNo Mail,");
  const preview = lib.rosterPreview(people, state.gymContext);
  assert.deepEqual(preview.rows.map((r) => r.status), ["new", "existing", "duplicate", "bad-email", "new"]);
  assert.equal(preview.ready, 3);
  const html = lib.uploadPreviewHtml(preview);
  assert.ok(html.includes("Already here: joins the group"));
  assert.ok(html.includes("Skipped: email looks wrong"));
  assert.ok(html.includes("1 without an email"));
}

// ---- import sends only the usable rows, with the calendar choice ----
{
  state.view = "users";
  state.userTab = "upload";
  state.toolForm.uploadText = "Name,Email\nNew Person,new@x.com\nBad Mail,bad@";
  state.toolForm.uploadTeamId = "4";
  state.toolForm.uploadCalendar = "11";
  state.uploadPreview = lib.rosterPreview(lib.rosterFromText(state.toolForm.uploadText), state.gymContext);
  const page = lib.usersView();
  assert.ok(page.includes("Choose CSV file"));
  assert.ok(page.includes("Import 1 athlete"));
  assert.ok(page.includes("A new calendar for each"));
  reply = async () => ({ added_count: 1, users: [{ user: { id: 9 }, invite_status: "sent" }] });
  calls.length = 0;
  await lib.importUsers();
  const sent = calls.find((c) => c.url === "/api/gym/athletes/bulk");
  assert.ok(sent, "bulk upload sent");
  assert.deepEqual(JSON.parse(JSON.stringify(sent.body.athletes)), [{ name: "New Person", email: "new@x.com" }]);
  assert.equal(sent.body.calendar_id, 11);
  assert.equal(sent.body.new_calendar, false);
  assert.equal(state.uploadPreview, null);
  assert.ok(state.toast.includes("1 invite email sent"));
}

// ---- exercise library: headings pick the columns; a bare list is names ----
{
  const parsed = lib.libraryRowsFromText("Exercise Name,Type,Sets,Reps,Coaching Cues,YouTube Link,Ignored\nGoblet Squat,Lower Body,3,8,Chest up,https://youtu.be/g,x\nSkip,warmup,two,,,\n,,,,,");
  assert.deepEqual(parsed.columns.sort(), ["category", "default_notes", "default_reps", "default_sets", "video_url"]);
  assert.deepEqual(JSON.parse(JSON.stringify(parsed.rows)), [
    { line: 2, name: "Goblet Squat", category: "Strength", categoryFrom: "Lower Body", default_sets: 3, default_reps: "8", default_notes: "Chest up", video_url: "https://youtu.be/g" },
    { line: 3, name: "Skip", category: "Warm up", categoryFrom: "warmup" }
  ]);
  const bare = lib.libraryRowsFromText("Plank\nBear Crawl\n");
  assert.deepEqual(bare.rows.map((r) => r.name), ["Plank", "Bear Crawl"]);
  assert.deepEqual(bare.columns, []);
  state.serverExercises = [{ id: 1, name: "Plank" }, { id: 2, name: "Hidden Hop", hidden: true }];
  const preview = lib.libraryImportPreview(lib.libraryRowsFromText("Name\nplank\nHidden Hop\nNew One\nnew one"));
  assert.deepEqual(preview.rows.map((r) => r.status), ["existing", "hidden", "new", "duplicate"]);

  lib.openLibraryImport();
  state.modal.text = "Name,Reps\nplank,12\nNew One,5\nNew One,6";
  lib.previewLibraryImport();
  let html = lib.modalHtml();
  assert.ok(html.includes("1 new · 1 already in the library"));
  assert.ok(html.includes("Fill in from the file"));
  state.modal.onExisting = "update";
  reply = async (method, url) => url === "/api/exercises/bulk" ? { created: 1, updated: 1, skipped: 0, unhidden: 0, errors: [] } : {};
  calls.length = 0;
  await lib.runLibraryImport();
  const sent = calls.find((c) => c.url === "/api/exercises/bulk");
  assert.equal(sent.body.on_existing, "update");
  assert.deepEqual(JSON.parse(JSON.stringify(sent.body.rows)), [{ name: "plank", default_reps: "12" }, { name: "New One", default_reps: "5" }]);
  assert.equal(state.modal, null);
  assert.ok(state.toast.includes("1 added") && state.toast.includes("1 updated"));

  // A row the server refuses keeps the dialog open with its row number.
  lib.openLibraryImport();
  state.modal.text = "Name\nOdd";
  lib.previewLibraryImport();
  reply = async (method, url) => url === "/api/exercises/bulk" ? { created: 0, updated: 0, skipped: 0, unhidden: 0, errors: [{ row: 1, message: "Odd: bad" }] } : {};
  await lib.runLibraryImport();
  assert.equal(state.modal.type, "library-import");
  assert.ok(lib.modalHtml().includes("Row 1: Odd: bad"));
  state.modal = null;
}

// ---- TeamBuildr review: defaults, date shift, items, and the import itself ----
{
  state.serverExercises = [
    { id: 21, name: "Back Squat", category: "Strength" },
    { id: 22, name: "Single Arm Dumbbell Overhead Press", category: "Strength" },
    { id: 23, name: "Pull-Up", category: "Strength" }
  ];
  const data = {
    athlete: "Nishaan Dulay",
    warnings: [],
    days: [
      { date: "2026-02-16", items: [
        { kind: "text", letter: "", name: "Cardio Warm Up", note: "5 minutes easy", category: "Warm up" },
        { kind: "lift", letter: "A", name: "Back Squat", sets: 4, reps: ["8", "8", "8", "8"], track_reps: true, times: [], per_side: false,
          intensities: ["", "", "7-8", "8-9"], intensity_kind: "rpe", note: "Last 2 sets @ 8-9 RPE" },
        { kind: "lift", letter: "B", name: "Single Leg Foam Roller Bridge", sets: 2, reps: ["1", "1"], track_reps: false, times: ["25", "ALAP"], per_side: true, intensities: [], intensity_kind: "", note: "" }
      ] },
      { date: "2026-02-18", items: [
        { kind: "note", letter: "", name: "Note", note: "Foot/Ankle Strength\nAnywhere, any day" },
        { kind: "circuit", letter: "D", name: "Upper Body Pump", rounds: 3, detail: "Bicep Curl - 1x10\nTricep Ext. - 1x10", note: "" },
        { kind: "lift", letter: "E", name: "Pull Up", sets: 3, reps: ["3-5", "3-5", "AMAP"], track_reps: true, times: [], per_side: false, intensities: [], intensity_kind: "", note: "3 seconds down" }
      ] }
    ],
    matches: {
      "Cardio Warm Up": { status: "new", match: null, suggestions: [] },
      "Back Squat": { status: "exact", match: { id: 21, name: "Back Squat" }, suggestions: [] },
      "Single Leg Foam Roller Bridge": { status: "suggest", match: null, suggestions: [{ id: 22, name: "Single Arm Dumbbell Overhead Press", score: 0.62 }] },
      "Upper Body Pump": { status: "new", match: null, suggestions: [] },
      "Pull Up": { status: "suggest", match: null, suggestions: [{ id: 23, name: "Pull-Up", score: 0.93 }] }
    }
  };
  // The start keeps the PDF's weekday: the first Monday (or Sunday) on or after today.
  const monday = lib.teamBuildrDefaultStart("2026-02-16");
  const sunday = lib.teamBuildrDefaultStart("2026-07-05");
  assert.equal(new Date(monday + "T12:00:00").getDay(), 1);
  assert.equal(new Date(sunday + "T12:00:00").getDay(), 0);
  for (const d of [monday, sunday]) assert.ok(d >= lib.today() && d <= lib.addDays(lib.today(), 6));

  state.athleteId = "cal:11";
  state.calendars["cal:11"] = state.calendars["cal:11"] || {};
  state.calendarLoaded["cal:11"] = true;
  lib.openTeamBuildrImport();
  const m = state.modal;
  assert.equal(m.type, "tb-import");
  assert.equal(m.targetName, "Fall block");
  m.fileName = "Feb.pdf";
  lib.setTeamBuildrData(m, data);
  assert.equal(m.start, monday);
  const D1 = m.start;
  const D2 = lib.addDays(m.start, 2);
  assert.equal(lib.teamBuildrTargetDate(m, "2026-02-18"), D2);
  // Exact and strong suggestions are taken; a weak one starts as a new exercise with its kind's category.
  assert.deepEqual(JSON.parse(JSON.stringify(m.choices)), {
    "Cardio Warm Up": { mode: "new", name: "Cardio Warm Up", category: "Warm up" },
    "Back Squat": { mode: "existing", id: 21, name: "Back Squat" },
    "Single Leg Foam Roller Bridge": { mode: "new", name: "Single Leg Foam Roller Bridge", category: "Strength" },
    "Upper Body Pump": { mode: "new", name: "Upper Body Pump", category: "Circuit" },
    "Pull Up": { mode: "existing", id: 23, name: "Pull-Up" }
  });
  let html = lib.modalHtml();
  assert.ok(html.includes("1 matched your library by name"));
  assert.ok(html.includes("Create new: Single Leg Foam Roller Bridge"));
  assert.ok(html.includes("62% match"));
  assert.ok(html.includes("Lands on"));
  // "Another library exercise" must name a real one before the import is allowed.
  lib.pickTeamBuildrMatch("Single Leg Foam Roller Bridge", "other");
  assert.ok(lib.modalHtml().includes("Import 2 days") && lib.modalHtml().includes("disabled"));
  lib.setTeamBuildrOther("Single Leg Foam Roller Bridge", "nope");
  assert.equal(m.choices["Single Leg Foam Roller Bridge"].mode, "other");
  lib.setTeamBuildrOther("Single Leg Foam Roller Bridge", "back squat");
  assert.equal(m.choices["Single Leg Foam Roller Bridge"].id, 21);
  lib.pickTeamBuildrMatch("Single Leg Foam Roller Bridge", "new");

  // Items come out as Build items and survive a save and reload.
  const squat = lib.teamBuildrItem(data.days[0].items[1], m.choices);
  assert.equal(lib.scriptLine(squat, { plain: true }).startsWith("4 x 8"), true);
  const bridge = lib.teamBuildrItem(data.days[0].items[2], m.choices);
  assert.equal(bridge.perSide, true);
  assert.equal(bridge.trackTime, true);
  assert.equal(bridge.trackReps, false);
  const warm = lib.teamBuildrItem(data.days[0].items[0], m.choices);
  assert.ok(lib.isTextOnlyItem(warm));
  const pull = lib.teamBuildrItem(data.days[1].items[2], m.choices);
  assert.equal(pull.name, "Pull-Up");
  const pump = lib.teamBuildrItem(data.days[1].items[1], m.choices);
  assert.equal(pump.type, "circuit");
  assert.equal(pump.sets, 3);
  const reload = (it, category) => lib.workoutToDayItems({ exercises: [{ id: 1, exercise_id: 1, superset_group: it.letter, order_index: 0,
    prescribed_sets: it.sets, target_reps: it.reps.join(","), target_weight: "", notes: lib.itemNotes(it), exercise: { name: it.name, category } }] })[0];
  const squatBack = reload(squat, "Strength");
  assert.deepEqual(JSON.parse(JSON.stringify(squatBack.intensities)), ["", "", "7-8", "8-9"]);
  assert.equal(squatBack.intensityKind, "rpe");
  assert.equal(squatBack.note, "Last 2 sets @ 8-9 RPE");
  const bridgeBack = reload(bridge, "Strength");
  assert.deepEqual(JSON.parse(JSON.stringify(bridgeBack.times)), ["25", "ALAP"]);
  assert.equal(bridgeBack.perSide, true);
  assert.equal(bridgeBack.trackReps, false);
  assert.ok(lib.isTextOnlyItem(reload(warm, "Warm up")));
  assert.equal(reload(pump, "Circuit").detail, "Bicep Curl - 1x10\nTricep Ext. - 1x10");
  // A lift with a two-line note, under a category the app does not name, stays a lift on reload.
  const leap = lib.teamBuildrItem({ kind: "lift", letter: "B", name: "Leap", sets: 3, reps: ["20", "20", "20"], track_reps: true, times: [],
    per_side: false, intensities: [], intensity_kind: "", note: "10 each side\nScissor the feet" }, m.choices);
  const leapBack = reload(leap, "Plyometrics");
  assert.equal(leapBack.type, "lift");
  assert.equal(lib.scriptLine(leapBack, { plain: true }).startsWith("3 x 20"), true);

  // Import: new exercises are made first with their category, then the days land from the start date.
  lib.ensureDay(D2, "cal:11").items = [lib.item({ name: "Already here" })];
  const made = [];
  reply = async (method, url, body) => {
    if (method === "POST" && url === "/api/exercises") { made.push(body); return { id: 100 + made.length, name: body.name, category: body.category }; }
    return {};
  };
  m.placement = "bottom";
  calls.length = 0;
  await lib.runTeamBuildrImport();
  assert.deepEqual(made.map((b) => b.name + ":" + b.category).sort(), ["Cardio Warm Up:Warm up", "Note:Notes", "Single Leg Foam Roller Bridge:Strength", "Upper Body Pump:Circuit"]);
  assert.equal(state.modal, null);
  const first = lib.ensureDay(D1, "cal:11");
  assert.deepEqual(first.items.map((it) => it.name), ["Cardio Warm Up", "Back Squat", "Single Leg Foam Roller Bridge"]);
  assert.equal(first.edited, true);
  const second = lib.ensureDay(D2, "cal:11");
  assert.deepEqual(second.items.map((it) => it.name), ["Already here", "Note", "Upper Body Pump", "Pull-Up"]);
  assert.equal(state.weekStart, lib.sundayOf(D1));
  assert.ok(state.toast.includes("Imported 2 days"));
  // The Build menu offers the import only on a calendar.
  state.athleteMenu = true;
  state.view = "build";
  assert.ok(lib.buildView().includes("Import TeamBuildr PDF into Fall block"));
  state.athleteMenu = false;
}

console.log("imports ui tests passed");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
