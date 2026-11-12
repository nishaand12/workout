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
const tick = (ms) => new Promise((resolve) => setTimeout(resolve, ms || 0));

(async () => {

const calls = [];
let nextId = 500;
sandbox.__setApi(async (method, url, body) => {
  calls.push({ method, url, body });
  if (method === "POST" && url === "/api/calendar/phases") return Object.assign({ id: ++nextId }, body);
  if (method === "PUT" && url.startsWith("/api/calendar/phases/")) return Object.assign({ id: +url.split("/").pop() }, body);
  if (method === "POST" && url === "/api/questions") return { id: ++nextId, text: body.text, answer_type: body.answer_type };
  if (method === "POST" && url === "/api/questionnaires") {
    return { id: ++nextId, name: body.name, category: "Questionnaire", questions: body.question_ids.map((id) => state.questionBank.find((q) => q.id === id)) };
  }
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
  { id: 1, name: "Plank", category: "Strength", default_sets: 2, default_reps: "10" },
  { id: 2, name: "Squat", category: "Strength", default_sets: 3, default_reps: "5", default_time: "20" },
  { id: 3, name: "Carry", category: "Strength", default_sets: 2, default_reps: "1" },
  { id: 4, name: "Readiness", category: "Questionnaire", questions: [
    { id: 71, text: "Sleep?", answer_type: "scale" },
    { id: 72, text: "Sore?", answer_type: "yes_no" },
    { id: 73, text: "Notes?", answer_type: "text" }
  ] }
];
state.questionBank = state.serverExercises[3].questions.slice();
state.chains = [{
  id: 9, name: "Core", kind: "Warm up",
  members: [
    { exercise_id: 1, sets: 3, time: "30", exercise: { name: "Plank", category: "Strength" } },
    { exercise_id: 2, reps: "8", exercise: { name: "Squat", category: "Strength" } },
    { exercise_id: 3, distance: "20", reps: "2", exercise: { name: "Carry", category: "Strength" } }
  ]
}];
const date = "2026-11-17";

{
  // A chain member tracks exactly the measures the chain names for it.
  lib.addChainToDay(date, 9);
  const day = lib.ensureDay(date);
  const [plank, squat, carry] = day.items;
  assert.deepEqual(Array.from(lib.doseKeys(plank)), ["time"]);
  assert.equal(plank.sets, 3);
  assert.deepEqual(Array.from(plank.times), ["30", "30", "30"]);
  // Reps named, so the squat's library time default does not ride along.
  assert.deepEqual(Array.from(lib.doseKeys(squat)), ["reps"]);
  assert.deepEqual(Array.from(squat.reps), ["8", "8", "8"]);
  assert.deepEqual(Array.from(lib.doseKeys(carry)), ["reps", "distance"]);
  assert.deepEqual(Array.from(carry.distances), ["20", "20"]);

  // Clicking the chain opens a box with every exercise's sets and measures in it.
  lib.selectChain(date, plank.chainInstance);
  let box = lib.chainBoxPop();
  assert.equal((box.match(/class="chain-edit"/g) || []).length, 3);
  assert.equal((box.match(/class="prop-table"/g) || []).length, 3);
  assert.ok(box.includes(`data-focus="time-${plank.id}-0"`));
  assert.ok(box.includes(`data-focus="reps-${squat.id}-2"`));
  assert.ok(box.includes(`data-focus="distance-${carry.id}-1"`));
  assert.ok(box.includes("this day only"));
  assert.ok(box.includes("Edit chain") && box.includes("Break apart"));

  // Reps, time, and distance switch per exercise, right in the box.
  lib.toggleTrack(date, squat.id, "time");
  lib.setCell(date, squat.id, "time", 0, "45");
  lib.changeSets(date, plank.id, 1);
  lib.setCell(date, squat.id, "reps", 1, "6");
  assert.deepEqual(Array.from(lib.doseKeys(squat)), ["reps", "time"]);
  assert.deepEqual(Array.from(squat.times), ["45", "45", "45"]);
  assert.deepEqual(Array.from(squat.reps), ["8", "6", "8"]);
  assert.equal(plank.sets, 4);
  box = lib.chainBoxPop();
  assert.ok(box.includes(`data-focus="time-${squat.id}-0"`));
  // The saved chain is not what changed.
  assert.equal(state.chains[0].members[0].sets, 3);
  assert.equal(state.chains[0].members[1].time, undefined);
  assert.equal(day.edited, true);
  lib.closeChainBox();
  assert.equal(state.chainBox, null);

  // The library editor has a time and a distance box for each member, and sends them.
  lib.openChainEditor(9);
  const html = lib.chainEditorHtml(state.modal);
  assert.ok(html.includes('aria-label="Time in seconds for Plank"'));
  assert.ok(html.includes('aria-label="Distance for Carry"'));
  const payload = lib.chainMemberPayload(Object.assign({}, state.modal.members[0], { time: "40s" }));
  assert.equal(payload.time, "40");
  assert.equal(payload.distance, "");
  state.modal = null;
}

{
  // Phases: picking days starts a draft, saving it colours the week banners and shows its notes.
  assert.equal(lib.phaseBannerStyle("2026-11-15"), "");
  state.buildPanel = "phases";
  lib.pickPhaseRange("2026-12-12", "2026-11-15", true);
  assert.equal(state.phaseDraft.start, "2026-11-15");
  assert.equal(state.phaseDraft.end, "2026-12-12");
  assert.equal(lib.phaseLength("2026-11-15", "2026-12-12"), "4 weeks");
  assert.equal(lib.phaseLength("2026-11-15", "2026-11-17"), "3 days");
  assert.equal(lib.phaseLength("2026-11-15", "2026-11-24"), "1 week, 3 days");
  let panel = lib.phasesPanelHtml();
  assert.equal((panel.match(/class="ph-cell sel/g) || []).length, 28);
  assert.ok(panel.includes('data-focus="phase-name"'));

  // A phase needs a name before it saves.
  await lib.savePhaseDraft();
  assert.ok(!calls.some((c) => c.url === "/api/calendar/phases"));
  state.phaseDraft.name = "Strength";
  state.phaseDraft.notes = "Heavy triples";
  await lib.savePhaseDraft();
  const made = calls.find((c) => c.method === "POST" && c.url === "/api/calendar/phases");
  assert.equal(made.body.calendar_id, 11);
  assert.equal(made.body.start_date, "2026-11-15");
  assert.equal(state.phaseDraft, null);
  const strength = state.phases["cal:11"][0];

  // Every week in the phase is tinted and tagged with where it sits in the phase.
  assert.ok(lib.phaseBannerStyle("2026-11-15").includes("linear-gradient"));
  assert.ok(lib.phaseTagsHtml("2026-11-15").includes("Strength · wk 1/4"));
  assert.ok(lib.phaseTagsHtml("2026-12-06").includes("Strength · wk 4/4"));
  assert.equal(lib.phaseBannerStyle("2026-12-13"), "");
  // Its notes show above the week's own note, and the week opens to show them.
  assert.equal(lib.weekNoteOpen("2026-11-22"), true);
  const note = lib.weekNoteHtml("2026-11-22");
  assert.ok(note.includes("phase-note") && note.includes("Heavy triples"));
  assert.ok(note.indexOf("phase-note") < note.indexOf('class="week-note"'));
  assert.ok(!lib.weekNoteHtml("2026-12-13").includes("phase-note"));
  assert.ok(lib.buildView().includes("in-phase"));

  // A second phase cannot take days the first one holds.
  lib.pickPhaseRange("2026-12-10", "2026-12-20", true);
  state.phaseDraft.name = "Power";
  calls.length = 0;
  await lib.savePhaseDraft();
  assert.ok(!calls.some((c) => c.url.startsWith("/api/calendar/phases")));
  assert.ok(lib.phasesPanelHtml().includes("overlap Strength"));
  // Starting mid-week splits that week's banner between no phase and the new one.
  lib.pickPhaseRange("2026-12-16", "2026-12-26", true);
  await lib.savePhaseDraft();
  assert.equal(state.phases["cal:11"].length, 2);
  const split = lib.phaseBannerStyle("2026-12-13");
  assert.ok(split.includes("transparent 0.00%") && split.includes("rgba("));
  assert.notEqual(state.phases["cal:11"][1].color, strength.color);

  // A click on a day that has a phase opens that phase for editing.
  lib.pickPhaseRange("2026-11-20", "2026-11-20", false);
  assert.equal(state.phaseDraft.id, strength.id);
  assert.equal(state.phaseDraft.name, "Strength");
  state.phaseDraft.notes = "Heavy doubles";
  await lib.savePhaseDraft();
  assert.ok(calls.some((c) => c.method === "PUT" && c.url === "/api/calendar/phases/" + strength.id));
  assert.ok(lib.weekNoteHtml("2026-11-22").includes("Heavy doubles"));
  state.buildPanel = null;
}

{
  // A questionnaire on a day carries its questions and how each is answered.
  const it = lib.fromCatalog({ name: "Readiness", type: "questionnaire" });
  assert.deepEqual(Array.from(lib.itemQuestions(it), (q) => q.type), ["scale", "yes_no", "text"]);
  assert.equal(lib.scriptLine(it), "3 items");
  const loaded = lib.workoutToDayItems({ exercises: [{ id: 5, exercise_id: 4, prescribed_sets: 1, target_reps: "1", notes: "", exercise: state.serverExercises[3] }] })[0];
  assert.equal(loaded.type, "questionnaire");
  assert.deepEqual(Array.from(lib.itemQuestions(loaded), (q) => q.id), [71, 72, 73]);
  // One saved before questions had answers still reads as its old prompts.
  const old = lib.workoutToDayItems({ exercises: [{ id: 6, exercise_id: 8, prescribed_sets: 1, target_reps: "1", notes: "Feeling ok?", exercise: { name: "Old", category: "Questionnaire" } }] })[0];
  assert.deepEqual(Array.from(lib.itemQuestions(old), (q) => [q.text, q.type].join("|")), ["Feeling ok?|"]);

  // The athlete gets a 1-10 row, yes/no buttons, and a text box; it completes when all are answered.
  state.calendars["cal:11"][date].items.push(loaded);
  const key = "cal:11:" + date + ":" + loaded.id;
  let html = lib.questionnaireEntryHtml("cal:11", date, loaded);
  assert.equal((html.match(/class="q-item"/g) || []).length, 3);
  assert.equal((html.match(/<button type="button" class=""/g) || []).length, 12);
  assert.ok(html.includes("<textarea") && html.includes("Answer every question"));
  lib.answerQuestion(key, "q71", "7", date, loaded.id, 0);
  lib.answerQuestion(key, "q72", "No", date, loaded.id, 0);
  assert.equal(state.logs[key].done, false);
  lib.answerQuestion(key, "q73", "  ", date, loaded.id, 0);
  assert.equal(state.logs[key].done, false);
  lib.answerQuestion(key, "q73", "Knee is stiff", date, loaded.id, 0);
  assert.equal(state.logs[key].done, true);
  html = lib.questionnaireEntryHtml("cal:11", date, loaded);
  assert.equal((html.match(/class="on"/g) || []).length, 2);
  assert.ok(html.includes("Knee is stiff") && html.includes("✓ Complete"));

  // Building one: pick from the questions, write a new one on the spot, reorder, save.
  state.view = "exercises";
  lib.openQuestionnaireEditor();
  state.modal.name = "Travel day";
  lib.addQuestionnaireQuestion(72);
  lib.addQuestionnaireQuestion(72);
  assert.equal(state.modal.questions.length, 1);
  state.modal.pickQ = "Hours on the bus?";
  lib.createQuestionForQuestionnaire();
  assert.equal(state.modal.type, "question");
  assert.equal(state.modal.text, "Hours on the bus?");
  state.modal.answer_type = "text";
  await lib.saveQuestion();
  assert.equal(state.modal.type, "questionnaire");
  assert.deepEqual(Array.from(state.modal.questions, (q) => q.text), ["Sore?", "Hours on the bus?"]);
  assert.ok(state.questionBank.some((q) => q.text === "Hours on the bus?"));
  lib.moveQuestionnaireQuestion(1, -1);
  assert.ok(lib.questionnaireEditorHtml(state.modal).includes("1. Hours on the bus?"));
  await lib.saveQuestionnaire();
  const sent = calls.find((c) => c.method === "POST" && c.url === "/api/questionnaires");
  assert.equal(sent.body.name, "Travel day");
  assert.equal(sent.body.question_ids.length, 2);
  assert.equal(sent.body.question_ids[1], 72);
  assert.equal(state.modal, null);
  assert.ok(state.serverExercises.some((row) => row.name === "Travel day" && row.questions.length === 2));

  // The library lists the questions with where each is used; one in use is not deleted.
  state.managing = "All";
  const list = lib.questionLibraryHtml();
  assert.ok(list.includes("Sore?") && list.includes("Readiness, Travel day"));
  lib.askDeleteQuestion(72);
  assert.equal(state.modal, null);
  lib.askDeleteQuestion(71);
  assert.equal(state.modal, null);
  state.questionBank.push({ id: 90, text: "Unused?", answer_type: "text" });
  lib.askDeleteQuestion(90);
  assert.equal(state.modal.type, "confirm");
}

console.log("round 8 ui tests passed");
process.exit(0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
