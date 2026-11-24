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
  nav, mineView, athleteTabsHtml, installBannerHtml, installHelpHtml, openInstallHelp, dismissInstallBanner, devicePlatform, renewSession, weekRangeLabel, drawerHtml, modalHtml, entryItem, athleteDayCol, sundayOf, addDays, APP_TODAY, setMineMode, shiftMine, mineToday, mineDayStatus, mineMonthHtml, shiftMonth, mineMode, todayIso, dateInZone, noteAppSignIn, adoptAppSignIn, inAppSignInSheet, appSignInPending, syncSupabaseSession, appSignInDoneHtml, stayInSignInSheet, handleLogout, handleGoogleLogin, loadAuthConfig, resumeStoredSession, renderLoginGate,
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
  assert.ok(html.includes('<div class="athlete-name">This week</div>'));
  assert.equal((html.match(/class="today-chip"/g) || []).length, 1);
  assert.ok(lib.athleteDayCol(lib.APP_TODAY).includes("is-today"));
  assert.ok(lib.athleteDayCol(lib.addDays(lib.APP_TODAY, -1)).includes("is-past"));
  assert.equal(lib.weekRangeLabel("2026-11-22"), "Nov 22 – 28");
  assert.equal(lib.weekRangeLabel("2026-11-29"), "Nov 29 – Dec 5");
}

// Week moves a week at a time and shows the days. Month moves a month at a time and shows
// which days have a workout and how far along each is.
{
  const day = (n) => lib.APP_TODAY.slice(0, 8) + String(n).padStart(2, "0");
  state.mySchedule = [
    { scheduled_date: day(3), workout_id: 1, title: "Lower", exercise_count: 4, items_total: 4, items_done: 4, started: true },
    { scheduled_date: day(5), workout_id: 2, title: "Upper", exercise_count: 3, items_total: 3, items_done: 1, started: true },
    { scheduled_date: day(9), workout_id: 3, title: "Run", exercise_count: 2, items_total: 2, items_done: 0, started: false }
  ];
  assert.equal(lib.mineDayStatus(day(3)).state, "done");
  assert.equal(lib.mineDayStatus(day(5)).state, "partial");
  assert.equal(lib.mineDayStatus(day(9)).state, "todo");
  assert.equal(lib.mineDayStatus(day(10)).state, "none");

  assert.equal(lib.mineMode(), "week", "week is the starting view");
  const week = state.weekStart;
  lib.shiftMine(1);
  assert.equal(state.weekStart, lib.addDays(week, 7));
  lib.mineToday();
  assert.equal(state.weekStart, lib.sundayOf(lib.APP_TODAY));

  lib.setMineMode("month");
  assert.equal(store.data.wourkout_mine_mode, "month");
  const thisMonth = lib.APP_TODAY.slice(0, 7);
  state.mineMonth = thisMonth;
  let html = lib.mineView();
  assert.ok(html.includes("mode-month") && html.includes("month-grid"));
  assert.ok(!html.includes('class="week"'), "no exercise lists in the month view");
  assert.ok(html.includes("1 of 3 workouts complete"));
  assert.equal((html.match(/month-cell st-done/g) || []).length, 1);
  assert.equal((html.match(/month-cell st-partial/g) || []).length, 1);
  assert.equal((html.match(/month-cell st-todo/g) || []).length, 1);
  assert.ok(html.includes(`onclick="openAthleteDay('${day(5)}')"`));
  assert.ok(html.includes('aria-label="Next month"'));
  const cells = (html.match(/class="month-cell/g) || []).length;
  assert.ok(cells % 7 === 0 && cells >= 28 && cells <= 42);

  lib.shiftMine(1);
  assert.equal(state.mineMonth, lib.shiftMonth(thisMonth, 1));
  lib.shiftMine(-2);
  assert.equal(state.mineMonth, lib.shiftMonth(thisMonth, -1));
  assert.equal(lib.shiftMonth("2026-12", 1), "2027-01");
  assert.equal(lib.shiftMonth("2027-01", -1), "2026-12");
  assert.equal(lib.shiftMonth("2026-11", 14), "2028-01");
  lib.mineToday();
  assert.equal(state.mineMonth, thisMonth);

  // Back to week: the week of today when the shown month is this month, else the month's first week.
  state.mineMonth = "2027-03";
  lib.setMineMode("week");
  assert.equal(state.weekStart, lib.sundayOf("2027-03-01"));
  assert.ok(lib.mineView().includes('aria-label="Next week"'));
  lib.mineToday();
  state.mySchedule = [];
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

// Google sign-in from the home screen app finishes in a sheet. The sheet says to close it and
// the app underneath picks the sign-in up.
{
  const me = { id: 7, role: "athlete", name: "Avery Athlete", username: "avery" };
  sandbox.__setApi(async (method, url) => {
    calls.push({ method, url });
    if (url === "/api/auth/sync-supabase") return { access_token: "google-token", user: me };
    if (url === "/api/auth/me") return me;
    if (url === "/api/auth/refresh") return { access_token: "google-token", user: me };
    return [];
  });
  lib.handleLogout();
  store.data = {};

  // In the app: leaving for Google is noted.
  sandbox.navigator.standalone = true;
  lib.noteAppSignIn();
  assert.ok(lib.appSignInPending());
  assert.equal(lib.inAppSignInSheet(), false, "the app itself is not the sheet");
  assert.equal(await lib.adoptAppSignIn(), false, "nothing to pick up yet");

  // In the sheet: same storage, not the installed app.
  sandbox.navigator.standalone = false;
  assert.equal(lib.inAppSignInSheet(), true);
  await lib.syncSupabaseSession("supabase-token");
  assert.equal(store.data.wourkout_token, "google-token");
  assert.equal(state.auth.returnToApp, true);
  assert.ok(lib.appSignInDoneHtml().includes("Close this window"));

  // Back in the app, still on its sign-in screen.
  sandbox.navigator.standalone = true;
  state.auth.isAuthenticated = false;
  state.auth.user = null;
  state.auth.token = null;
  state.auth.returnToApp = false;
  assert.equal(await lib.adoptAppSignIn(), true);
  assert.equal(state.auth.isAuthenticated, true);
  assert.equal(state.auth.user.id, 7);
  assert.equal(lib.appSignInPending(), false, "the note is cleared once used");

  // An ordinary browser sign-in is not told to close anything.
  sandbox.navigator.standalone = false;
  lib.handleLogout();
  await lib.syncSupabaseSession("supabase-token");
  assert.ok(!state.auth.returnToApp);
  assert.equal(await lib.adoptAppSignIn(), false, "only the installed app picks up a sign-in");
}

// Google sign-in survives a page load where the settings or the Supabase script did not arrive.
{
  const config = { supabase_url: "https://project.supabase.test", supabase_anon_key: "real-key", allow_google_oauth: true };
  let online = false;
  const opened = [];
  sandbox.location.assign = (url) => opened.push(url);
  sandbox.__setApi(async (method, url) => {
    if (!online) throw new TypeError("Load failed");
    if (url === "/api/auth/config") return config;
    return [];
  });
  lib.handleLogout();
  state.auth.config = { supabase_url: "", supabase_anon_key: "", allow_google_oauth: false };
  sandbox.supabaseClient = undefined;

  await lib.handleGoogleLogin();
  assert.equal(state.modal, null, "no settings dialog for the person signing in");
  assert.ok(state.auth.error.includes("Check your connection"));
  assert.equal(opened.length, 0);

  online = true;
  await lib.handleGoogleLogin();
  assert.equal(state.auth.error, "");
  assert.equal(opened[0], "https://project.supabase.test/auth/v1/authorize?provider=google&redirect_to=http%3A%2F%2Flocalhost%2F");

  // One sign-in at a time.
  state.auth.loading = true;
  await lib.handleGoogleLogin();
  assert.equal(opened.length, 1);
  assert.ok(/class="google-btn"[^>]*disabled/.test(lib.renderLoginGate()));
  state.auth.loading = false;

  state.auth.config = { ...config, allow_google_oauth: false };
  await lib.handleGoogleLogin();
  assert.ok(state.auth.error.includes("not available"));
  assert.equal(opened.length, 1);
}

// A dropped connection does not sign the device out.
{
  store.data = { wourkout_token: "still-good" };
  sandbox.__setApi(async () => { throw new TypeError("Load failed"); });
  assert.equal(await lib.resumeStoredSession(), false);
  assert.equal(store.data.wourkout_token, "still-good");
  assert.ok(state.auth.error.includes("Check your connection"));
  store.data = {};
}

console.log("athlete mobile ui tests passed");
process.exit(0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
