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
  localStorage: globalThis.__store = {
    data: {},
    getItem(k) { return k in this.data ? this.data[k] : null; },
    setItem(k, v) { this.data[k] = String(v); },
    removeItem(k) { delete this.data[k]; }
  },
  location: { origin: "http://localhost", pathname: "/", hash: "" },
  history: { replaceState() {} },
  navigator: { userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)", clipboard: { writeText() { return Promise.resolve(); } } },
  fetch: async () => { throw new Error("unexpected fetch"); },
  addEventListener() {},
  removeEventListener() {}
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

const source = fs.readFileSync("app/static/js/build-order.js", "utf8") + "\n" + fs.readFileSync("app/static/js/wourkout.js", "utf8") + `
globalThis.__lib = {
  nav, mineView, athleteTabsHtml, installBannerHtml, installHelpHtml, openInstallHelp, dismissInstallBanner, devicePlatform, renewSession, weekRangeLabel, drawerHtml, modalHtml, entryItem, athleteDayCol, sundayOf, addDays, APP_TODAY, todayIso, dateInZone,
  state, item, ensureDay, addChainToDay, selectChain, chainBoxPop, closeChainBox, toggleTrack, setCell, changeSets,
  doseKeys, scriptLine, chainEditorHtml, openChainEditor, chainMemberPayload, itemNotes: typeof itemNotes === "function" ? itemNotes : null,
  weekPhases, phaseBannerStyle, phaseTagsHtml, weekNoteHtml, weekNoteOpen, phasesPanelHtml, pickPhaseRange, savePhaseDraft,
  openPhase, phaseLength, toggleBuildPanel, buildView,
  fromCatalog, workoutToDayItems, itemQuestions, questionnaireEntryHtml, answerQuestion, questionnaireDone,
  openQuestionnaireEditor, addQuestionnaireQuestion, createQuestionForQuestionnaire, saveQuestion, saveQuestionnaire,
  moveQuestionnaireQuestion, questionnaireEditorHtml, questionLibraryHtml, askDeleteQuestion
};
globalThis.__setApi = (fn) => { api = fn; };
`;
vm.runInContext(source, sandbox, { filename: "wourkout.js" });
const lib = sandbox.__lib;
const state = lib.state;
const store = sandbox.localStorage;

(async () => {

const calls = [];
sandbox.__setApi(async (method, url, body) => {
  calls.push({ method, url, body });
  if (method === "POST" && url === "/api/auth/refresh") return { access_token: "fresh-token", user: state.auth.user };
  if (method === "GET") return [];
  return {};
});

state.auth = { isAuthenticated: true, token: "old-token", user: { id: 7, role: "athlete", name: "Avery Athlete", username: "avery" } };
state.role = "athlete";
state.view = "mine";
state.actingAthlete = "avery";
state.athleteId = "avery";
state.gymContext = { athletes: [], calendars: [] };

// The tab bar lists the five athlete pages and marks the open one. Coaches get none.
{
  const tabs = lib.athleteTabsHtml();
  ["go('mine')", "go('entry')", "go('whiteboard')", "go('maxes')", "go('journal')"].forEach((call) => assert.ok(tabs.includes(call), call));
  assert.equal((tabs.match(/aria-current="page"/g) || []).length, 1);
  assert.ok(/class="athlete-tab on"[^>]*onclick="go\('mine'\)"/.test(tabs));
  assert.ok(lib.nav().includes('class="athlete-tabs"'));
  state.role = "coach";
  assert.ok(!lib.nav().includes('class="athlete-tabs"'));
  assert.ok(!lib.nav().includes("ADD TO HOME SCREEN"));
  state.role = "athlete";
  assert.ok(lib.nav().includes("ADD TO HOME SCREEN"));
}

// The schedule labels each week and marks today, so it reads as a list on a phone.
{
  const html = lib.mineView();
  assert.ok(html.includes("mine-page"));
  assert.ok(html.includes('<div class="week-head">This week</div>'));
  assert.equal((html.match(/class="today-chip"/g) || []).length, 1);
  assert.ok(lib.athleteDayCol(lib.APP_TODAY).includes("is-today"));
  assert.ok(lib.athleteDayCol(lib.addDays(lib.APP_TODAY, -1)).includes("is-past"));
  assert.equal(lib.weekRangeLabel("2026-11-22"), "Nov 22 – 28");
  assert.equal(lib.weekRangeLabel("2026-11-29"), "Nov 29 – Dec 5");
}

// On a phone browser the schedule offers the home screen steps until it is dismissed.
{
  assert.equal(lib.devicePlatform(), "ios");
  assert.ok(lib.mineView().includes("install-banner"));
  lib.openInstallHelp();
  assert.equal(state.modal.type, "install");
  assert.equal(state.modal.platform, "ios");
  let help = lib.modalHtml();
  assert.ok(help.includes("Safari") && help.includes("Add to Home Screen"));
  lib.openInstallHelp("android");
  help = lib.modalHtml();
  assert.ok(help.includes("Chrome") && help.includes("Install app"));
  assert.ok(!help.includes("Install now"), "no direct install without the browser's prompt");
  state.modal = null;
  lib.dismissInstallBanner();
  assert.equal(store.data.wourkout_install_hint, "off");
  assert.ok(!lib.mineView().includes("install-banner"));
  delete store.data.wourkout_install_hint;
  sandbox.navigator.standalone = true;
  assert.ok(!lib.mineView().includes("install-banner"), "already installed");
  sandbox.navigator.standalone = false;
  sandbox.navigator.userAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)";
  assert.ok(!lib.mineView().includes("install-banner"), "not on a desktop");
}

// The sign-in renews itself, at most once in a while.
{
  await lib.renewSession();
  assert.equal(calls.filter((c) => c.url === "/api/auth/refresh").length, 1);
  assert.equal(store.data.wourkout_token, "fresh-token");
  assert.equal(state.auth.token, "fresh-token");
  assert.ok(+store.data.wourkout_token_at > 0);
  await lib.renewSession();
  assert.equal(calls.filter((c) => c.url === "/api/auth/refresh").length, 1, "not again so soon");
  store.data.wourkout_token_at = String(Date.now() - 13 * 60 * 60 * 1000);
  await lib.renewSession();
  assert.equal(calls.filter((c) => c.url === "/api/auth/refresh").length, 2);
  state.auth.isAuthenticated = false;
  store.data.wourkout_token_at = "0";
  await lib.renewSession();
  assert.equal(calls.filter((c) => c.url === "/api/auth/refresh").length, 2, "signed out: nothing to renew");
}

// Today is the date where the person is, not the date in UTC.
{
  const evening = new Date("2026-11-23T02:30:00Z"); // 9:30 pm on the 22nd in Toronto
  assert.equal(lib.dateInZone(evening, "America/Toronto"), "2026-11-22");
  assert.equal(lib.dateInZone(evening, "America/Vancouver"), "2026-11-22");
  assert.equal(lib.dateInZone(evening, "Europe/London"), "2026-11-23");
  assert.equal(lib.dateInZone(evening, "Asia/Tokyo"), "2026-11-23");
  const deviceZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  assert.equal(lib.todayIso(evening), lib.dateInZone(evening, deviceZone));
  // A device that will not name its zone is treated as Eastern.
  const real = Intl.DateTimeFormat;
  const fake = function (locale, opts) { return opts ? new real(locale, opts) : { resolvedOptions: () => ({}) }; };
  sandbox.Intl.DateTimeFormat = fake;
  try { assert.equal(lib.todayIso(evening), "2026-11-22"); } finally { sandbox.Intl.DateTimeFormat = real; }
  assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(lib.APP_TODAY));
}

console.log("athlete mobile ui tests passed");
process.exit(0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
