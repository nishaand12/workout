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
  state, item, ensureDay, parseTable, rosterFromText, rosterPreview, uploadPreviewHtml, importUsers, usersView
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

console.log("imports ui tests passed");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
