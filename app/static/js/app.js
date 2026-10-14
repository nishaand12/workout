// Helper to format a Date object as local YYYY-MM-DD (immune to UTC timezone offsets)
function formatLocalIso(d) {
  const yr = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${yr}-${mo}-${da}`;
}

// Current local date in YYYY-MM-DD
function getTodayIso() {
  return formatLocalIso(new Date());
}

// wourkout frontend
let state = {
  workouts: [],
  exercises: [],
  records: [],
  programs: [],
  users: [],
  groups: [],
  assignments: [],
  currentUser: null,
  isStudentPreview: false,
  previewStudent: null,
  coachDashboardDate: getTodayIso(),
  assignTargetType: "group",
  assignWhat: "workout",
  assignmentListFilter: "all",
  calendarProgramFilter: "",
  pendingAssignWorkoutId: null,
  currentWorkoutId: null,
  currentWorkout: null,
  currentSession: null,
  currentCardIndex: 0,
  activeTab: "workouts",
  timerSecondsRemaining: 0,
  timerInterval: null,
  // Daily Navigation & Calendar State (Dynamically resolves to current date)
  selectedDate: getTodayIso(),
  calendarYear: (new Date()).getFullYear(),
  calendarMonth: (new Date()).getMonth(), // 0-indexed
  calendarData: {},
  // Builder State
  builderMode: "single", // "single" or "week"
  selectedSourceProgram: "",
  selectedSourceWeek: 1,
  // Coach Hub & Roster State
  complianceFilter: "all",
  rosterSearchQuery: "",
  rosterStatusFilter: "all",
  rosterSelectedCohortId: null,
  selectedAthleteIds: [],
  drawerCurrentAthlete: null,
  draggedAthleteId: null
};

function escapeQuote(str) {
  if (!str) return "";
  return String(str).replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/"/g, "&quot;").replace(/\n/g, " ");
}

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function isCoach() {
  return !!(state.currentUser && state.currentUser.role === "coach" && !state.isStudentPreview);
}

function showToast(message) {
  let el = document.getElementById("appToast");
  if (!el) {
    el = document.createElement("div");
    el.id = "appToast";
    el.className = "app-toast";
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => el.classList.remove("show"), 3400);
}

function goToTab(target) {
  const btn = document.querySelector(`#mainNavTabs .nav-tab-btn[data-tab="${target}"]`);
  if (btn) {
    btn.click();
    return;
  }
  switchTab(target);
}

function beginAssign(type, workoutId) {
  if (workoutId) state.pendingAssignWorkoutId = workoutId;
  state.assignTargetType = type || state.assignTargetType || "user";
  state.assignWhat = "workout";
  switchTab("assignments");
}

// Superset Badge Color Map
const BADGE_COLORS = {
  A: "#10b981", // Green
  B: "#0ea5e9", // Blue
  C: "#ec4899", // Pink
  D: "#eab308", // Yellow
  E: "#f97316", // Orange
  F: "#a855f7"  // Purple
};

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

function getBadgeColor(letter) {
  return BADGE_COLORS[letter] || "#64748b";
}

// Convert various YouTube / video URLs into embeddable iframe source
function getEmbedUrl(url) {
  if (!url) return "";
  if (url.includes("youtube.com/embed/")) return url;
  
  const watchMatch = url.match(/[?&]v=([^&]+)/);
  if (watchMatch) return `https://www.youtube.com/embed/${watchMatch[1]}?autoplay=1`;
  
  const shortMatch = url.match(/youtu\.be\/([^?&]+)/);
  if (shortMatch) return `https://www.youtube.com/embed/${shortMatch[1]}?autoplay=1`;
  
  if (url.includes("search_query=")) {
    try {
      const q = new URL(url).searchParams.get("search_query");
      return `https://www.youtube.com/embed?listType=search&list=${encodeURIComponent(q || "")}`;
    } catch (e) {
      return url;
    }
  }
  
  return url;
}

// Web Audio API for Chimes
function playChime(type = "beep") {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === "start") {
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } else {
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    }
  } catch (e) {
    console.log("Audio play error", e);
  }
}

// Initialize Application
document.addEventListener("DOMContentLoaded", async () => {
  setupEventListeners();
  await loadInitialData();
});

function handleLogoClick() {
  if (state.currentUser && state.currentUser.role === "coach" && !state.isStudentPreview) {
    switchTab("coach-dashboard");
  } else {
    switchTab("workouts");
  }
}

function switchTab(target) {
  state.activeTab = target;
  document.querySelectorAll("#mainNavTabs .nav-tab-btn").forEach(t => {
    t.classList.toggle("active", t.dataset.tab === target);
  });

  document.querySelectorAll(".view-section").forEach(s => s.style.display = "none");
  const targetSection = document.getElementById(`view-${target}`);
  if (targetSection) targetSection.style.display = "block";

  if (target === "coach-dashboard") {
    renderCoachDashboardView();
  } else if (target === "roster") {
    renderRosterView();
  } else if (target === "assignments") {
    renderAssignmentsView();
  } else if (target === "workouts") {
    renderDailyWorkoutView();
  } else if (target === "calendar") {
    renderCalendarView();
  } else if (target === "planner") {
    const activeSubBtn = document.querySelector(".planner-subnav-btn.active");
    const subtab = activeSubBtn ? activeSubBtn.dataset.subtab : "builder";
    switchPlannerSubtab(subtab);
  } else if (target === "exercises") {
    renderExercisesView();
  } else if (target === "records") {
    renderRecordsView();
  }
}

function updateNavForRole() {
  const navTabs = document.getElementById("mainNavTabs");
  const navUserArea = document.getElementById("navUserArea");
  if (!navTabs || !navUserArea) return;

  const user = state.currentUser;
  if (!user) return;

  const isCoach = user.role === "coach" && !state.isStudentPreview;

  if (isCoach) {
    navTabs.innerHTML = `
      <button class="nav-tab-btn active" data-tab="coach-dashboard">Home</button>
      <button class="nav-tab-btn" data-tab="roster">Clients</button>
      <button class="nav-tab-btn" data-tab="planner">Build</button>
      <button class="nav-tab-btn" data-tab="assignments">Assign</button>
      <span class="nav-tab-divider"></span>
      <button class="nav-tab-btn nav-tab-quiet" data-tab="calendar">Calendar</button>
      <button class="nav-tab-btn nav-tab-quiet" data-tab="exercises">Exercises</button>
    `;
  } else {
    navTabs.innerHTML = `
      <button class="nav-tab-btn active" data-tab="workouts">Workouts</button>
      <button class="nav-tab-btn" data-tab="calendar">Calendar</button>
      <button class="nav-tab-btn" data-tab="exercises">Exercises</button>
      <button class="nav-tab-btn" data-tab="records">Maxes/PR</button>
    `;
  }

  // Bind tab listeners
  navTabs.querySelectorAll(".nav-tab-btn").forEach(btn => {
    btn.onclick = () => switchTab(btn.dataset.tab);
  });

  const displayUser = (state.isStudentPreview && state.previewStudent) ? state.previewStudent : user;
  const initials = displayUser.name.split(" ").map(p => p[0]).join("").toUpperCase().slice(0, 2);
  const roleLabel = (state.isStudentPreview ? "PREVIEW" : (user.role === "coach" ? "COACH" : "ATHLETE"));

  navUserArea.innerHTML = `
    <div class="user-profile-pill" onclick="openLoginOverlay()" title="Click to switch profile or sign in">
      <div class="user-avatar-pip" style="background: ${displayUser.avatar_color || 'var(--amp-orange)'};">
        ${initials}
      </div>
      <div class="user-pill-info">
        <span class="user-pill-name">${displayUser.name}</span>
        <span class="user-pill-role">${roleLabel}</span>
      </div>
      <span style="font-size: 11px; color: var(--amp-slate); margin-left: 4px;">⇄</span>
    </div>
  `;
}

async function initAuth() {
  const savedUserId = localStorage.getItem("tb_current_user_id");
  let user = null;
  if (savedUserId) {
    user = state.users.find(u => u.id === parseInt(savedUserId));
  }

  if (user) {
    state.currentUser = user;
    const loginView = document.getElementById("view-login");
    if (loginView) loginView.style.display = "none";
    updateNavForRole();
    if (user.role === "coach") {
      switchTab("coach-dashboard");
    } else {
      switchTab("workouts");
    }
  } else {
    openLoginOverlay();
  }
}

function openLoginOverlay() {
  const loginView = document.getElementById("view-login");
  if (!loginView) return;
  loginView.style.display = "flex";

  const coachList = document.getElementById("loginCoachList");
  const studentList = document.getElementById("loginStudentList");

  if (coachList) coachList.innerHTML = "";
  if (studentList) studentList.innerHTML = "";

  const coaches = state.users.filter(u => u.role === "coach");
  const students = state.users.filter(u => u.role === "student");

  coaches.forEach(u => {
    const card = document.createElement("div");
    card.className = "profile-select-card";
    const initials = u.name.split(" ").map(p => p[0]).join("").toUpperCase().slice(0, 2);
    card.innerHTML = `
      <div class="athlete-avatar-circle" style="background: ${u.avatar_color || 'var(--amp-orange)'}; color: #ffffff;">${initials}</div>
      <div style="flex: 1; min-width: 0;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-weight: 600; font-size: 14px; color: var(--amp-ink);">${u.name}</span>
          <span class="status-pill not_started" style="font-size: 9px; padding: 1px 6px;">COACH</span>
        </div>
        <div style="font-size: 12px; color: var(--amp-slate); margin-top: 2px;">${u.title || 'Strength Coach'} • ${u.email}</div>
      </div>
    `;
    card.onclick = () => selectUser(u.id);
    coachList.appendChild(card);
  });

  students.forEach(u => {
    const card = document.createElement("div");
    card.className = "profile-select-card";
    const initials = u.name.split(" ").map(p => p[0]).join("").toUpperCase().slice(0, 2);
    const groupNames = u.groups && u.groups.length > 0 ? u.groups.map(g => g.name).join(", ") : "Unassigned";
    card.innerHTML = `
      <div class="athlete-avatar-circle" style="background: ${u.avatar_color || 'var(--amp-charcoal)'}; color: #ffffff;">${initials}</div>
      <div style="flex: 1; min-width: 0;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-weight: 600; font-size: 14px; color: var(--amp-ink);">${u.name}</span>
          <span class="status-pill completed" style="font-size: 9px; padding: 1px 6px;">ATHLETE</span>
        </div>
        <div style="font-size: 12px; color: var(--amp-slate); margin-top: 2px;">
          ${u.position_tag || u.title || 'Athlete'} • <span style="color: var(--amp-orange); font-weight: 600;">${groupNames}</span>
        </div>
      </div>
    `;
    card.onclick = () => selectUser(u.id);
    studentList.appendChild(card);
  });
}

async function selectUser(userId) {
  const user = state.users.find(u => u.id === userId);
  if (!user) return;

  state.currentUser = user;
  state.isStudentPreview = false;
  state.previewStudent = null;
  localStorage.setItem("tb_current_user_id", String(user.id));

  const previewBanner = document.getElementById("studentPreviewBanner");
  if (previewBanner) previewBanner.style.display = "none";

  const loginView = document.getElementById("view-login");
  if (loginView) loginView.style.display = "none";

  updateNavForRole();

  if (user.role === "coach") {
    switchTab("coach-dashboard");
  } else {
    state.currentWorkoutId = null;
    state.currentSession = null;
    switchTab("workouts");
  }
}

function previewAsStudent(studentId) {
  const student = state.users.find(u => u.id === studentId);
  if (!student) return;

  state.isStudentPreview = true;
  state.previewStudent = student;

  const banner = document.getElementById("studentPreviewBanner");
  const nameEl = document.getElementById("previewAthleteName");
  if (banner && nameEl) {
    nameEl.textContent = `${student.name} (${student.title || 'Athlete'})`;
    banner.style.display = "flex";
  }

  updateNavForRole();
  switchTab("workouts");
}

function exitStudentPreview() {
  state.isStudentPreview = false;
  state.previewStudent = null;

  const banner = document.getElementById("studentPreviewBanner");
  if (banner) banner.style.display = "none";

  updateNavForRole();
  switchTab("coach-dashboard");
}

function switchPlannerSubtab(subtabName) {
  // Update subtab buttons
  document.querySelectorAll(".planner-subnav-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.subtab === subtabName);
  });

  // Hide all subpanels, show selected one
  document.querySelectorAll(".planner-subtab-panel").forEach(panel => {
    panel.style.display = "none";
  });
  const targetPanel = document.getElementById(`planner-subtab-${subtabName}`);
  if (targetPanel) {
    targetPanel.style.display = "block";
  }

  // Trigger render functions
  if (subtabName === "builder") {
    renderBuilderView();
  } else if (subtabName === "weekplanner") {
    renderWeekPlannerView();
  } else if (subtabName === "editworkout") {
    renderEditWorkoutView();
  }
}

function setupEventListeners() {
  // Workout briefing video button
  const briefBtn = document.getElementById("btnWorkoutBriefing");
  if (briefBtn) {
    briefBtn.addEventListener("click", () => {
      if (state.currentWorkout && state.currentWorkout.video_url) {
        openVideoModal(state.currentWorkout.title + " (Briefing)", state.currentWorkout.video_url);
      } else {
        alert("No briefing video link attached to this workout. You can add one in the Builder or Edit tab!");
      }
    });
  }

  // Calendar Controls
  document.getElementById("btnPrevMonth")?.addEventListener("click", () => changeCalendarMonth(-1));
  document.getElementById("btnNextMonth")?.addEventListener("click", () => changeCalendarMonth(1));
  document.getElementById("btnToday")?.addEventListener("click", () => jumpCalendarToday());

  // Floating Bar Controls
  document.getElementById("btnPrevExercise").addEventListener("click", () => navigateCard(-1));
  document.getElementById("btnNextExercise").addEventListener("click", () => navigateCard(1));
  document.getElementById("btnCloseCard").addEventListener("click", () => closeCardModal());
  document.getElementById("btnTimerModal").addEventListener("click", () => openRestTimerModal(90));
  document.getElementById("btnInfoModal").addEventListener("click", () => showExerciseInfo());
}

// -------------------------------------------------------------
// DAY NAVIGATION & DAILY WORKOUT TRACKER
// -------------------------------------------------------------
function navigateDay(delta) {
  const parts = state.selectedDate.split("-").map(Number);
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  d.setDate(d.getDate() + delta);
  const yr = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  state.selectedDate = `${yr}-${mo}-${da}`;
  renderDailyWorkoutView();
}

function jumpDayToToday() {
  state.selectedDate = getTodayIso();
  renderDailyWorkoutView();
}

function onDayDatePickerChanged(val) {
  if (!val) return;
  state.selectedDate = val;
  renderDailyWorkoutView();
}

function openDayNativeDatePicker() {
  const picker = document.getElementById("dayDatePicker");
  if (picker) {
    if (typeof picker.showPicker === "function") {
      picker.showPicker();
    } else {
      picker.focus();
    }
  }
}

function studentSeesAssignment(assignment, student) {
  if (!assignment || !student || assignment.scheduled_date !== state.selectedDate) return false;
  if (Number(assignment.user_id) === Number(student.id)) return true;
  const groupIds = (student.groups || []).map(g => Number(g.id)).filter(id => !isNaN(id));
  if (!(assignment.group_id && groupIds.includes(Number(assignment.group_id)))) return false;
  const movedOff = (state.assignments || []).some(other =>
    Number(other.user_id) === Number(student.id) &&
    typeof other.notes === "string" &&
    other.notes.startsWith(`Rescheduled from ${assignment.scheduled_date}`)
  );
  return !movedOff;
}

function scheduleWorkoutForCurrentDate() {
  if (!isCoach()) return;
  goToTab("planner");
  switchPlannerSubtab("builder");
  const dateInput = document.getElementById("builderCalendarDate");
  if (dateInput) dateInput.value = state.selectedDate;

  const parts = state.selectedDate.split("-").map(Number);
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const dow = days[d.getDay()];
  const dowSelect = document.getElementById("builderDayOfWeek");
  if (dowSelect) dowSelect.value = dow;
}

async function renderDailyWorkoutView() {
  if (!state.selectedDate) {
    state.selectedDate = getTodayIso();
  }

  // Format date display (e.g. "Tuesday, Oct 13, 2026")
  const parts = state.selectedDate.split("-").map(Number);
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const dayName = days[d.getDay()];
  const monthName = MONTH_NAMES[d.getMonth()].slice(0, 3);
  const formattedDate = `${dayName}, ${monthName} ${d.getDate()}, ${d.getFullYear()}`;

  const dateTextEl = document.getElementById("dayNavDateText");
  if (dateTextEl) dateTextEl.textContent = formattedDate;

  const todayBadgeEl = document.getElementById("dayTodayBadge");
  if (todayBadgeEl) {
    todayBadgeEl.style.display = state.selectedDate === getTodayIso() ? "inline-block" : "none";
  }

  const datePickerEl = document.getElementById("dayDatePicker");
  if (datePickerEl) {
    datePickerEl.value = state.selectedDate;
  }

  // Find all workouts for this date
  const activeStudent = (state.isStudentPreview && state.previewStudent) ? state.previewStudent : (state.currentUser && state.currentUser.role === 'student' ? state.currentUser : null);
  
  let dayWorkouts = [];
  if (activeStudent && state.assignments && state.assignments.length > 0) {
    const assignedIds = state.assignments
      .filter(a => studentSeesAssignment(a, activeStudent))
      .map(a => a.workout_id);
    dayWorkouts = state.workouts.filter(w => assignedIds.includes(w.id));
  } else if (!activeStudent) {
    dayWorkouts = state.workouts.filter(w => w.calendar_date === state.selectedDate);
  }

  const statsRibbon = document.getElementById("dayStatsRibbon");
  const contentCard = document.getElementById("dayWorkoutContent");
  const restCard = document.getElementById("dayRestDayCard");
  const multipleBar = document.getElementById("dayMultipleWorkoutsBar");
  const briefBtn = document.getElementById("btnWorkoutBriefing");
  const editBtn = document.getElementById("btnEditCurrentWorkout");

  if (dayWorkouts.length === 0) {
    // Rest day
    if (statsRibbon) statsRibbon.style.display = "none";
    if (contentCard) contentCard.style.display = "none";
    if (multipleBar) multipleBar.style.display = "none";
    if (briefBtn) briefBtn.style.display = "none";
    if (editBtn) editBtn.style.display = "none";
    if (restCard) {
      restCard.style.display = "block";
      const restLabel = document.getElementById("dayRestDateLabel");
      if (restLabel) restLabel.textContent = formattedDate;
    }
    const scheduleBtn = document.getElementById("dayScheduleBtn");
    if (scheduleBtn) scheduleBtn.style.display = isCoach() ? "inline-block" : "none";
    state.currentWorkout = null;
    state.currentWorkoutId = null;
    state.currentSession = null;
    return;
  }

  // There are workouts!
  if (restCard) restCard.style.display = "none";
  if (statsRibbon) statsRibbon.style.display = "grid";
  if (contentCard) contentCard.style.display = "block";
  if (editBtn) editBtn.style.display = activeStudent ? "none" : "inline-flex";

  // If multiple workouts on this day
  if (dayWorkouts.length > 1) {
    if (multipleBar) {
      multipleBar.style.display = "flex";
      multipleBar.innerHTML = "";
      dayWorkouts.forEach(w => {
        const btn = document.createElement("button");
        btn.className = `day-workout-tab-btn ${w.id === state.currentWorkoutId ? 'active' : ''}`;
        btn.textContent = `${w.title} (${w.exercise_count || (w.exercises ? w.exercises.length : 0)} ex)`;
        btn.onclick = async () => {
          state.currentWorkoutId = w.id;
          await loadWorkout(w.id);
          renderDailyWorkoutView();
        };
        multipleBar.appendChild(btn);
      });
    }
  } else {
    if (multipleBar) multipleBar.style.display = "none";
  }

  // Determine which workout to load
  let activeW = dayWorkouts.find(w => w.id === state.currentWorkoutId);
  if (!activeW) {
    activeW = dayWorkouts[0];
    state.currentWorkoutId = activeW.id;
  }

  await loadWorkout(activeW.id);

  if (briefBtn) {
    briefBtn.style.display = activeW.video_url ? "inline-flex" : "none";
  }
}

// Fetch all initial data
async function refreshData() {
  const [workoutsRes, exercisesRes, programsRes, usersRes, groupsRes, assignmentsRes] = await Promise.all([
    fetch("/api/workouts"),
    fetch("/api/exercises"),
    fetch("/api/programs"),
    fetch("/api/users"),
    fetch("/api/groups"),
    fetch("/api/assignments")
  ]);
  state.workouts = await workoutsRes.json();
  state.exercises = await exercisesRes.json();
  state.programs = await programsRes.json();
  state.users = await usersRes.json();
  state.groups = await groupsRes.json();
  state.assignments = await assignmentsRes.json();
  populateCalendarProgramJump();
  populateEditWorkoutSelector();
}

async function loadInitialData() {
  try {
    await refreshData();
    await initAuth();
  } catch (err) {
    console.error("Error loading initial data:", err);
  }
}

function populateCalendarProgramJump() {
  const select = document.getElementById("calendarProgramSelect");
  if (!select) return;
  select.innerHTML = `<option value="">Jump to Program...</option>`;

  state.programs.forEach(p => {
    const opt = document.createElement("option");
    opt.value = p.program;
    opt.textContent = `${p.program} (${p.weeks.length} Wk)`;
    select.appendChild(opt);
  });
}

// Load Workout & its active session
async function loadWorkout(workoutId) {
  try {
    const activeUserId = (state.isStudentPreview && state.previewStudent) ? state.previewStudent.id : (state.currentUser ? state.currentUser.id : null);
    const url = `/api/sessions/active/${workoutId}${activeUserId ? `?user_id=${activeUserId}` : ''}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to load workout session");
    state.currentSession = await res.json();
    state.currentWorkout = state.currentSession.workout;
    state.currentWorkoutId = workoutId;

    // sync dropdown
    const select = document.getElementById("workoutSelector");
    if (select) select.value = workoutId;

    renderTimelineView();
    updateStatsRibbon();
  } catch (err) {
    console.error("Error loading workout session:", err);
  }
}

// Render Timeline Overview (Screenshot 2 Replica)
function renderTimelineView() {
  const container = document.getElementById("timelineExercisesList");
  if (!container || !state.currentWorkout) return;

  document.getElementById("timelineHeaderTitle").textContent = state.currentWorkout.title;
  document.getElementById("timelineHeaderProgram").textContent = `${state.currentWorkout.program_name} • ${state.currentWorkout.scheduled_date || "Session"}`;

  container.innerHTML = "";

  state.currentWorkout.exercises.forEach((we, index) => {
    const row = document.createElement("div");
    row.className = "timeline-row";
    row.onclick = () => openCardModal(index);

    const isBreath = we.exercise.name.toLowerCase().includes("breath");
    const letter = we.superset_group || "A";
    const badgeColor = getBadgeColor(letter);

    // Check if all sets for this exercise are completed
    const exLogs = (state.currentSession.set_logs || []).filter(l => l.workout_exercise_id === we.id);
    const isCompleted = exLogs.length > 0 && exLogs.every(l => l.completed);

    let badgeHTML = "";
    if (isBreath) {
      badgeHTML = `
        <div class="badge-circle" style="background: ${isCompleted ? '#10b981' : '#334155'};">
          <span style="font-size: 14px;">☸</span>
        </div>
      `;
    } else {
      badgeHTML = `
        <div class="badge-circle" style="background: ${isCompleted ? '#10b981' : '#334155'};">
          <span>✓</span>
        </div>
        <div class="badge-letter-sub" style="background: ${badgeColor};">
          ${letter}
        </div>
      `;
    }

    row.innerHTML = `
      <div class="badge-container">
        ${badgeHTML}
      </div>
      <div class="timeline-info">
        <div class="timeline-ex-name">${we.exercise.name}</div>
        <div class="timeline-ex-prescription">${we.prescription_text || (we.prescribed_sets + ' X ' + we.target_reps)}</div>
        ${we.notes ? `<div class="timeline-ex-cues">${we.notes}</div>` : ''}
      </div>
      <div style="color: #94a3b8; font-size: 14px; padding-top: 6px;">›</div>
    `;

    container.appendChild(row);
  });
}

// Update Top Stats Ribbon (Duration removed as requested)
function updateStatsRibbon() {
  if (!state.currentSession || !state.currentSession.set_logs || !state.currentWorkout) return;

  const logs = state.currentSession.set_logs;
  let tonnage = 0;
  let completedSetsCount = 0;

  logs.forEach(l => {
    if (l.completed) {
      completedSetsCount++;
      tonnage += (l.weight || 0) * (l.reps || 0);
    }
  });

  // Calculate exercises completed
  let completedExCount = 0;
  const totalExercises = state.currentWorkout.exercises.length;
  state.currentWorkout.exercises.forEach(we => {
    const exLogs = logs.filter(l => l.workout_exercise_id === we.id);
    if (exLogs.length > 0 && exLogs.every(l => l.completed)) {
      completedExCount++;
    }
  });

  const totalSets = logs.length;
  document.getElementById("statTonnage").textContent = tonnage > 0 ? `${Math.round(tonnage).toLocaleString()} lbs` : "0 lbs";
  document.getElementById("statSets").textContent = `${completedSetsCount} / ${totalSets}`;
  const exEl = document.getElementById("statExercises");
  if (exEl) exEl.textContent = `${completedExCount} / ${totalExercises}`;
}

// Exercise Card Carousel View (Screenshot 1 Replica)
function openCardModal(exerciseIndex) {
  state.currentCardIndex = exerciseIndex;
  renderActiveCard();
  document.getElementById("exerciseCardBackdrop").classList.add("open");
  document.getElementById("bottomFloatingBar").style.display = "flex";
}

function closeCardModal() {
  document.getElementById("exerciseCardBackdrop").classList.remove("open");
  document.getElementById("bottomFloatingBar").style.display = "none";
  renderTimelineView();
  updateStatsRibbon();
}

function navigateCard(direction) {
  if (!state.currentWorkout || !state.currentWorkout.exercises) return;
  const total = state.currentWorkout.exercises.length;
  let next = state.currentCardIndex + direction;
  if (next < 0) next = total - 1;
  if (next >= total) next = 0;
  state.currentCardIndex = next;
  renderActiveCard();
}

function renderActiveCard() {
  const we = state.currentWorkout.exercises[state.currentCardIndex];
  if (!we) return;

  document.getElementById("cardExTitle").textContent = we.exercise.name;
  const headerBg = document.getElementById("cardVideoHeader");
  headerBg.onclick = () => {
    const vUrl = we.exercise.video_url || `https://www.youtube.com/results?search_query=${encodeURIComponent(we.exercise.name)}+exercise`;
    openVideoModal(we.exercise.name, vUrl);
  };

  const letter = we.superset_group || "A";
  const badgeEl = document.getElementById("cardSupersetBadge");
  badgeEl.textContent = letter;
  badgeEl.style.background = getBadgeColor(letter);

  const cuesBox = document.getElementById("cardCuesBox");
  const cueText = we.notes || we.exercise.default_notes;
  if (cueText) {
    cuesBox.style.display = "block";
    cuesBox.textContent = cueText;
  } else {
    cuesBox.style.display = "none";
  }

  document.getElementById("cardBtnOptOut").onclick = () => {
    if (confirm(`Opt out of ${we.exercise.name} for this session?`)) {
      navigateCard(1);
    }
  };

  document.getElementById("cardBtnJournal").onclick = () => {
    const note = prompt("Workout Journal / Exercise Note:", we.notes || "");
    if (note !== null) {
      we.notes = note;
      cuesBox.style.display = "block";
      cuesBox.textContent = note;
    }
  };

  document.getElementById("cardBtnMedia").onclick = () => {
    const vUrl = we.exercise.video_url || "";
    openVideoModal(we.exercise.name, vUrl);
  };

  renderSetTable(we);
}

function renderSetTable(workoutExercise) {
  const tableBody = document.getElementById("cardSetTableBody");
  tableBody.innerHTML = "";

  const exLogs = (state.currentSession.set_logs || [])
    .filter(l => l.workout_exercise_id === workoutExercise.id)
    .sort((a, b) => a.set_number - b.set_number);

  const numSets = workoutExercise.prescribed_sets || (exLogs.length > 0 ? exLogs.length : 3);
  const repUnit = workoutExercise.is_ea ? "REPS (EA.)" : (workoutExercise.target_reps.includes("sec") ? "SECS" : "REPS");
  document.getElementById("cardRepHeader").textContent = repUnit;

  for (let s = 1; s <= numSets; s++) {
    let log = exLogs.find(l => l.set_number === s);
    if (!log) {
      log = {
        session_id: state.currentSession.id,
        workout_exercise_id: workoutExercise.id,
        set_number: s,
        weight: parseFloat(workoutExercise.target_weight) || 0,
        reps: parseFloat(workoutExercise.target_reps) || 10,
        completed: false
      };
    }

    const tr = document.createElement("tr");
    tr.className = "set-row";

    tr.innerHTML = `
      <td class="set-number-cell">${s}</td>
      <td>
        <input type="number" step="any" class="set-input-box" id="wt_${workoutExercise.id}_${s}" value="${log.weight}" inputmode="decimal">
      </td>
      <td>
        <input type="number" step="any" class="set-input-box" id="rep_${workoutExercise.id}_${s}" value="${log.reps}" inputmode="decimal">
      </td>
      <td>
        <button class="btn-set-check ${log.completed ? 'completed' : ''}" id="chk_${workoutExercise.id}_${s}">
          ✓
        </button>
      </td>
    `;

    tableBody.appendChild(tr);

    const wtInput = tr.querySelector(`#wt_${workoutExercise.id}_${s}`);
    const repInput = tr.querySelector(`#rep_${workoutExercise.id}_${s}`);
    const chkBtn = tr.querySelector(`#chk_${workoutExercise.id}_${s}`);

    const saveSet = async (completedVal = null) => {
      const wtVal = parseFloat(wtInput.value) || 0;
      const rVal = parseFloat(repInput.value) || 0;
      const isComp = completedVal !== null ? completedVal : chkBtn.classList.contains("completed");

      await fetch(`/api/sessions/${state.currentSession.id}/sets?workout_exercise_id=${workoutExercise.id}&set_number=${s}&weight=${wtVal}&reps=${rVal}&completed=${isComp}`, {
        method: "POST"
      });

      let targetLog = state.currentSession.set_logs.find(l => l.workout_exercise_id === workoutExercise.id && l.set_number === s);
      if (targetLog) {
        targetLog.weight = wtVal;
        targetLog.reps = rVal;
        targetLog.completed = isComp;
      } else {
        state.currentSession.set_logs.push({
          session_id: state.currentSession.id,
          workout_exercise_id: workoutExercise.id,
          set_number: s,
          weight: wtVal,
          reps: rVal,
          completed: isComp
        });
      }
      updateStatsRibbon();
    };

    wtInput.addEventListener("change", () => saveSet());
    repInput.addEventListener("change", () => saveSet());

    chkBtn.addEventListener("click", () => {
      const nextState = !chkBtn.classList.contains("completed");
      if (nextState) {
        chkBtn.classList.add("completed");
        playChime("start");
        if (navigator.vibrate) navigator.vibrate(50);
        if (workoutExercise.rest_seconds > 0) {
          startRestCountdown(workoutExercise.rest_seconds);
        }
      } else {
        chkBtn.classList.remove("completed");
      }
      saveSet(nextState);
    });

    if (workoutExercise.rest_seconds > 0 && s < numSets) {
      const restTr = document.createElement("tr");
      restTr.innerHTML = `
        <td colspan="4" style="padding: 4px 8px;">
          <button class="btn-rest-timer" onclick="startRestCountdown(${workoutExercise.rest_seconds})">
            ⏱️ REST TIMER (${workoutExercise.rest_seconds} SECS)
          </button>
        </td>
      `;
      tableBody.appendChild(restTr);
    }
  }
}

// Rest Timer Mechanism
function startRestCountdown(seconds) {
  if (state.timerInterval) clearInterval(state.timerInterval);
  state.timerSecondsRemaining = seconds;

  playChime("start");
  updateTimerWidget();

  state.timerInterval = setInterval(() => {
    state.timerSecondsRemaining--;
    updateTimerWidget();

    if (state.timerSecondsRemaining <= 0) {
      clearInterval(state.timerInterval);
      state.timerInterval = null;
      playChime("end");
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
      setTimeout(() => {
        document.getElementById("activeTimerWidget").style.display = "none";
      }, 4000);
    }
  }, 1000);
}

function updateTimerWidget() {
  const widget = document.getElementById("activeTimerWidget");
  if (!widget) return;

  if (state.timerSecondsRemaining <= 0) {
    widget.innerHTML = `<span>⏱️ Time's Up! Next Set!</span>`;
    widget.style.background = "#10b981";
    return;
  }

  const mins = Math.floor(state.timerSecondsRemaining / 60);
  const secs = state.timerSecondsRemaining % 60;
  const timeStr = `${mins}:${String(secs).padStart(2, '0')}`;

  widget.style.display = "flex";
  widget.style.background = "#0ea5e9";
  widget.innerHTML = `
    <span>⏱️ Rest: ${timeStr}</span>
    <button style="background:transparent;border:none;color:white;font-weight:bold;cursor:pointer;margin-left:6px;" onclick="cancelRestTimer(event)">✕</button>
  `;
}

function cancelRestTimer(e) {
  if (e) e.stopPropagation();
  if (state.timerInterval) clearInterval(state.timerInterval);
  state.timerSecondsRemaining = 0;
  document.getElementById("activeTimerWidget").style.display = "none";
}

function openRestTimerModal(defaultSecs = 90) {
  const s = prompt("Start Rest Timer (seconds):", defaultSecs);
  if (s && !isNaN(s)) {
    startRestCountdown(parseInt(s));
  }
}

function showExerciseInfo() {
  const we = state.currentWorkout.exercises[state.currentCardIndex];
  if (!we) return;
  alert(`${we.exercise.name}\n\nPrescription: ${we.prescription_text}\n\nCoaching Cues: ${we.notes || we.exercise.default_notes || 'None'}`);
}

// Video Player Modal
function openVideoModal(title, url) {
  const modal = document.getElementById("videoPlayerModal");
  const modalTitle = document.getElementById("videoModalTitle");
  const iframe = document.getElementById("videoModalIframe");
  const linkBtn = document.getElementById("videoDirectLink");

  modalTitle.textContent = title;
  const embed = getEmbedUrl(url);
  iframe.src = embed;
  linkBtn.href = url || "#";
  linkBtn.style.display = url ? "inline-block" : "none";

  modal.classList.add("open");
}

function closeVideoModal() {
  const modal = document.getElementById("videoPlayerModal");
  const iframe = document.getElementById("videoModalIframe");
  iframe.src = "";
  modal.classList.remove("open");
}

// -------------------------------------------------------------
// CALENDAR VIEW ENGINE
// -------------------------------------------------------------
async function renderCalendarView() {
  const grid = document.getElementById("calendarDaysGrid");
  const title = document.getElementById("calendarMonthTitle");
  if (!grid || !title) return;

  const y = state.calendarYear;
  const m = state.calendarMonth; // 0-11
  title.textContent = `${MONTH_NAMES[m]} ${y}`;

  // Calculate start and end dates for query
  // 1st of month
  const firstDay = new Date(y, m, 1);
  const lastDay = new Date(y, m + 1, 0);

  // Pad to Monday before 1st
  let dayOfWeekFirst = firstDay.getDay(); // 0 is Sunday, 1 is Monday
  let offsetMon = (dayOfWeekFirst + 6) % 7; // days to Monday
  const startDateObj = new Date(y, m, 1 - offsetMon);

  // Pad to Sunday after last day
  let dayOfWeekLast = lastDay.getDay();
  let daysToSun = (7 - dayOfWeekLast) % 7;
  const endDateObj = new Date(y, m + 1, daysToSun);

  const startIso = formatLocalIso(startDateObj);
  const endIso = formatLocalIso(endDateObj);

  // Fetch calendar events
  try {
    const activeUserId = (state.isStudentPreview && state.previewStudent) ? state.previewStudent.id : (state.currentUser && state.currentUser.role === 'student' ? state.currentUser.id : null);
    const userParam = activeUserId ? `&user_id=${activeUserId}` : '';
    const res = await fetch(`/api/calendar?start_date=${startIso}&end_date=${endIso}${userParam}`);
    const daysData = await res.json();
    state.calendarData = {};
    daysData.forEach(d => {
      state.calendarData[d.date] = d.workouts;
    });
  } catch (err) {
    console.error("Error loading calendar data", err);
  }

  grid.innerHTML = "";

  // Today in ISO
  const todayIso = getTodayIso(); // Match current local date
  let curr = new Date(startDateObj);

  while (curr <= endDateObj) {
    const isoStr = formatLocalIso(curr);
    const dayNum = curr.getDate();
    const isCurrMonth = curr.getMonth() === m;
    const isToday = isoStr === todayIso;

    const cell = document.createElement("div");
    cell.className = `calendar-cell ${!isCurrMonth ? 'other-month' : ''} ${isToday ? 'today' : ''}`;

    const workoutsOnDay = state.calendarData[isoStr] || [];

    const visibleWorkouts = state.calendarProgramFilter
      ? workoutsOnDay.filter(w => w.program_name === state.calendarProgramFilter)
      : workoutsOnDay;

    let workoutsHTML = "";
    visibleWorkouts.forEach(w => {
      workoutsHTML += `
        <div class="calendar-workout-chip ${w.is_completed ? 'completed' : ''}" title="${escapeHtml(w.title)} (${escapeHtml(w.program_name)})" onclick="selectWorkoutFromCalendar(${w.id})">
          <span style="font-size: 10px; flex-shrink: 0;">${w.is_completed ? '✓' : '•'}</span>
          <span>${escapeHtml(w.title)}</span>
        </div>
      `;
    });

    const addBtn = isCoach()
      ? `<button class="calendar-add-btn" title="Create a workout on this day" onclick="quickSchedulePrompt('${isoStr}')">+</button>`
      : "";

    cell.innerHTML = `
      <div class="calendar-cell-top">
        <span class="calendar-day-num">${dayNum}</span>
        ${addBtn}
      </div>
      <div style="flex: 1; min-height: 0; overflow-y: auto; overflow-x: hidden;">
        ${workoutsHTML}
      </div>
    `;

    grid.appendChild(cell);
    curr.setDate(curr.getDate() + 1);
  }
}

function changeCalendarMonth(delta) {
  state.calendarMonth += delta;
  if (state.calendarMonth > 11) {
    state.calendarMonth = 0;
    state.calendarYear++;
  } else if (state.calendarMonth < 0) {
    state.calendarMonth = 11;
    state.calendarYear--;
  }
  renderCalendarView();
}

function jumpCalendarToday() {
  const d = new Date();
  state.calendarYear = d.getFullYear();
  state.calendarMonth = d.getMonth();
  renderCalendarView();
}

function jumpCalendarToProgram(progName) {
  state.calendarProgramFilter = progName || "";
  if (progName) {
    const dated = state.workouts
      .filter(w => w.program_name === progName && w.calendar_date)
      .map(w => w.calendar_date)
      .sort();
    if (dated.length) {
      const parts = dated[0].split("-");
      state.calendarYear = parseInt(parts[0], 10);
      state.calendarMonth = parseInt(parts[1], 10) - 1;
    }
  }
  renderCalendarView();
}

function selectWorkoutFromCalendar(workoutId) {
  state.currentWorkoutId = workoutId;
  const w = state.workouts.find(item => item.id === workoutId);
  if (w && w.calendar_date) {
    state.selectedDate = w.calendar_date;
  }
  if (isCoach()) {
    jumpToEditWorkout(workoutId);
    return;
  }
  goToTab("workouts");
}

async function quickSchedulePrompt(isoDate) {
  if (!isCoach()) return;
  state.selectedDate = isoDate;
  scheduleWorkoutForCurrentDate();
  const titleInput = document.getElementById("builderTitle");
  if (titleInput && !titleInput.value.trim()) {
    titleInput.value = `Workout on ${isoDate}`;
  }
}

// -------------------------------------------------------------
// TAB 1: SINGLE WORKOUT BUILDER
// -------------------------------------------------------------
let builderExercises = [];

function renderBuilderView() {
  const list = document.getElementById("builderExerciseList");
  if (!list) return;
  list.innerHTML = "";

  if (builderExercises.length === 0) {
    addExerciseToBuilder();
  } else {
    builderExercises.forEach((item, idx) => renderBuilderItem(item, idx));
  }
}

function addExerciseToBuilder() {
  const defaultEx = state.exercises[0] || { id: 1, name: "Pelvic Tilts" };
  const newItem = {
    exercise_id: defaultEx.id,
    superset_group: "A",
    prescribed_sets: 3,
    target_reps: "10",
    target_weight: "0",
    rest_seconds: 60,
    notes: ""
  };
  builderExercises.push(newItem);
  renderBuilderView();
}

function renderBuilderItem(item, idx) {
  const list = document.getElementById("builderExerciseList");
  const card = document.createElement("div");
  card.className = "builder-exercise-card";

  const optionsHTML = state.exercises.map(e => 
    `<option value="${e.id}" ${e.id === item.exercise_id ? 'selected' : ''}>${e.name} (${e.category})</option>`
  ).join("");

  card.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="font-weight: 800; font-size: 14px; color: #ffffff;">Exercise #${idx + 1}</span>
        <button type="button" style="background: #334155; border: none; color: white; border-radius: 4px; padding: 2px 7px; font-size: 11px; cursor: pointer; ${idx === 0 ? 'opacity:0.3; pointer-events:none;' : ''}" title="Move Up" onclick="moveBuilderItem(${idx}, -1)">▲</button>
        <button type="button" style="background: #334155; border: none; color: white; border-radius: 4px; padding: 2px 7px; font-size: 11px; cursor: pointer; ${idx === builderExercises.length - 1 ? 'opacity:0.3; pointer-events:none;' : ''}" title="Move Down" onclick="moveBuilderItem(${idx}, 1)">▼</button>
      </div>
      <button type="button" style="background: transparent; border: none; color: #ef4444; font-weight: bold; cursor: pointer; font-size: 13px;" onclick="removeBuilderItem(${idx})">✕ Remove</button>
    </div>
    <div class="form-group">
      <label class="form-label">Exercise Movement</label>
      <select class="form-select" onchange="builderExercises[${idx}].exercise_id = parseInt(this.value)">
        ${optionsHTML}
      </select>
    </div>
    <div class="grid-2">
      <div class="form-group">
        <label class="form-label">Superset Group</label>
        <select class="form-select" onchange="builderExercises[${idx}].superset_group = this.value">
          ${['A','B','C','D','E','F'].map(g => `<option value="${g}" ${g === item.superset_group ? 'selected' : ''}>Group ${g}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Sets</label>
        <input type="number" class="form-input" value="${item.prescribed_sets}" onchange="builderExercises[${idx}].prescribed_sets = parseInt(this.value) || 3">
      </div>
    </div>
    <div class="grid-2">
      <div class="form-group">
        <label class="form-label">Target Reps / Time</label>
        <input type="text" class="form-input" value="${item.target_reps}" placeholder="e.g. 10 ea. or 30 secs" onchange="builderExercises[${idx}].target_reps = this.value">
      </div>
      <div class="form-group">
        <label class="form-label">Target Weight (lbs)</label>
        <input type="text" class="form-input" value="${item.target_weight || '0'}" placeholder="e.g. 185 or 0" onchange="builderExercises[${idx}].target_weight = this.value">
      </div>
    </div>
    <div class="grid-2">
      <div class="form-group">
        <label class="form-label">Rest Timer (secs)</label>
        <input type="number" class="form-input" value="${item.rest_seconds}" placeholder="e.g. 60 or 90" onchange="builderExercises[${idx}].rest_seconds = parseInt(this.value) || 0">
      </div>
      <div class="form-group">
        <label class="form-label">Coaching Cues / Notes</label>
        <input type="text" class="form-input" value="${item.notes || ''}" placeholder="e.g. 2-3 sec pause at bottom" onchange="builderExercises[${idx}].notes = this.value">
      </div>
    </div>
  `;

  list.appendChild(card);
}

function moveBuilderItem(idx, dir) {
  const targetIdx = idx + dir;
  if (targetIdx < 0 || targetIdx >= builderExercises.length) return;
  const temp = builderExercises[idx];
  builderExercises[idx] = builderExercises[targetIdx];
  builderExercises[targetIdx] = temp;
  renderBuilderView();
}

function removeBuilderItem(idx) {
  builderExercises.splice(idx, 1);
  renderBuilderView();
}

async function saveCustomWorkout() {
  const title = document.getElementById("builderTitle").value.trim();
  const program = document.getElementById("builderProgram").value.trim() || "Custom";
  const dayOfWeek = document.getElementById("builderDayOfWeek")?.value || "Monday";
  const calDate = document.getElementById("builderCalendarDate").value.trim() || "";
  const weekNum = parseInt(document.getElementById("builderWeekNum")?.value) || 1;
  const videoUrl = document.getElementById("builderVideoUrl").value.trim();
  const description = document.getElementById("builderDesc").value.trim();

  if (!title) {
    alert("Please provide a workout title.");
    return;
  }
  if (builderExercises.length === 0) {
    alert("Please add at least one exercise to the workout.");
    return;
  }

  const payload = {
    title,
    program_name: program,
    day_of_week: dayOfWeek,
    calendar_date: calDate,
    scheduled_date: calDate,
    week_number: weekNum,
    video_url: videoUrl,
    description,
    exercises: builderExercises.map((e, idx) => ({
      exercise_id: e.exercise_id,
      superset_group: e.superset_group,
      order_index: idx,
      prescription_text: `${e.prescribed_sets} X ${String(e.target_reps).toUpperCase()}`,
      prescribed_sets: e.prescribed_sets,
      target_reps: String(e.target_reps),
      target_weight: String(e.target_weight || "0"),
      rest_seconds: e.rest_seconds || 0,
      notes: e.notes || "",
      is_ea: String(e.target_reps).toLowerCase().includes("ea")
    }))
  };

  try {
    const res = await fetch("/api/workouts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!res.ok) throw new Error("Failed to save workout");
    const created = await res.json();

    await refreshData();
    state.currentWorkoutId = created.id;
    state.pendingAssignWorkoutId = created.id;
    const status = document.getElementById("builderStatus");
    if (status) {
      status.style.display = "block";
      status.innerHTML = `Saved “${escapeHtml(created.title)}”. <button type="button" class="amp-action-chip" onclick="beginAssign('user', ${created.id})">Assign to one client</button> <button type="button" class="amp-action-chip" onclick="beginAssign('group', ${created.id})">Assign to a team</button>`;
    }
    showToast(`Saved ${created.title}`);
    builderExercises = [];
    document.getElementById("builderTitle").value = "";
    renderBuilderView();
  } catch (err) {
    console.error("Error creating workout:", err);
    alert("Error creating workout: " + err.message);
  }
}

// -------------------------------------------------------------
// TAB 2: WEEK PLANNER & BULK COPY ENGINE
// -------------------------------------------------------------
let targetAddDayName = "Saturday";

async function renderWeekPlannerView() {
  const select = document.getElementById("weekPlannerSourceSelect");
  if (!select) return;

  // Refresh programs list
  const r = await fetch("/api/programs");
  state.programs = await r.json();

  select.innerHTML = "";
  state.programs.forEach(p => {
    p.weeks.forEach(wk => {
      const opt = document.createElement("option");
      opt.value = `${p.program}:::${wk}`;
      opt.textContent = `${p.program} — Week ${wk}`;
      select.appendChild(opt);
    });
  });

  if (select.options.length > 0) {
    if (state.selectedSourceProgram) {
      const matchOpt = Array.from(select.options).find(o => o.value === `${state.selectedSourceProgram}:::${state.selectedSourceWeek}`);
      if (matchOpt) select.value = matchOpt.value;
    }
    await onWeekPlannerSourceChanged();
  }
}

async function onWeekPlannerSourceChanged() {
  const select = document.getElementById("weekPlannerSourceSelect");
  if (!select || !select.value) return;

  const [prog, wkStr] = select.value.split(":::");
  const wkNum = parseInt(wkStr);
  state.selectedSourceProgram = prog;
  state.selectedSourceWeek = wkNum;

  const targetProgInput = document.getElementById("copyTargetProgram");
  if (targetProgInput) targetProgInput.value = prog;

  const targetWkInput = document.getElementById("copyTargetWeekNum");
  if (targetWkInput) targetWkInput.value = wkNum + 1;

  document.getElementById("weekPlannerActiveTitle").textContent = `${prog} (Week ${wkNum})`;
  document.getElementById("weekPlannerActiveSubtitle").textContent = `Schedule workouts across Monday – Sunday`;

  // Filter workouts belonging to this program & week
  const weekWorkouts = state.workouts.filter(w => 
    w.program_name === prog && (w.week_number === wkNum || (!w.week_number && wkNum === 1))
  );

  // Compute next Monday if available
  const firstWithDate = weekWorkouts.find(w => w.calendar_date);
  if (firstWithDate && firstWithDate.calendar_date) {
    const d = new Date(firstWithDate.calendar_date + "T00:00:00");
    d.setDate(d.getDate() + 7);
    const nextMonIso = formatLocalIso(d);
    const dateInput = document.getElementById("copyTargetStartDate");
    if (dateInput) dateInput.value = nextMonIso;
  }

  const grid = document.getElementById("weekPlannerDaysGrid");
  if (!grid) return;
  grid.innerHTML = "";

  const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  DAYS.forEach(dayName => {
    const dayCard = document.createElement("div");
    dayCard.className = "day-plan-card";

    // Match workouts for this day of week
    const dayWorkouts = weekWorkouts.filter(w => {
      if (w.day_of_week && w.day_of_week.toLowerCase() === dayName.toLowerCase()) return true;
      if (w.title.toLowerCase().startsWith(dayName.toLowerCase())) return true;
      if (w.title.toLowerCase().includes(`- ${dayName.toLowerCase()}`) || w.title.toLowerCase().includes(`${dayName.toLowerCase()} -`)) return true;
      return false;
    });

    let workoutsHTML = "";
    if (dayWorkouts.length === 0) {
      workoutsHTML = `<div style="color: #64748b; font-size: 13px; font-style: italic; padding: 14px 0;">Rest / Off Day</div>`;
    } else {
      dayWorkouts.forEach(w => {
        workoutsHTML += `
          <div class="day-plan-workout-pill" style="display: flex; justify-content: space-between; align-items: center;" onclick="selectWorkoutFromCalendar(${w.id})">
            <div style="flex: 1; min-width: 0; padding-right: 8px;">
              <div style="font-weight: 800; font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${w.title}</div>
              <div style="font-size: 11px; opacity: 0.8; margin-top: 4px;">⚡ ${w.exercise_count || (w.exercises ? w.exercises.length : 0)} exercises</div>
            </div>
            <div style="display: flex; gap: 6px; align-items: center; flex-shrink: 0;">
              <button style="background: rgba(255,255,255,0.12); border: none; color: white; padding: 5px 8px; border-radius: 6px; font-size: 11px; font-weight: 700; cursor: pointer;" onclick="event.stopPropagation(); jumpToEditWorkout(${w.id})" title="Edit Workout">
                ✏️ Edit
              </button>
              <button style="background: rgba(239,68,68,0.2); border: 1px solid rgba(239,68,68,0.4); color: #fca5a5; padding: 5px 8px; border-radius: 6px; font-size: 11px; font-weight: 700; cursor: pointer;" onclick="event.stopPropagation(); removeWorkoutFromDay(${w.id}, '${dayName}')" title="Remove workout from ${dayName}">
                🗑️ Remove
              </button>
            </div>
          </div>
        `;
      });
    }

    dayCard.innerHTML = `
      <div class="day-plan-header">
        <span class="day-plan-title">${dayName}</span>
        <span class="day-plan-date">${dayWorkouts.length} workout(s)</span>
      </div>
      <div style="flex: 1;">${workoutsHTML}</div>
      <button class="btn-secondary" style="width: 100%; margin-top: 10px; padding: 8px; font-size: 12px; border: 1px dashed #475569; background: transparent; color: #94a3b8; font-weight: 700; border-radius: 6px; cursor: pointer;" onclick="openAddWorkoutModal('${dayName}')">
        + Add Workout to ${dayName}
      </button>
    `;

    grid.appendChild(dayCard);
  });
}

function openAddWorkoutModal(dayName) {
  targetAddDayName = dayName;
  const daySpan = document.getElementById("addModalDayName");
  if (daySpan) daySpan.textContent = dayName;

  const select = document.getElementById("addModalWorkoutSelect");
  if (select) {
    select.innerHTML = "";
    state.workouts.forEach(w => {
      const opt = document.createElement("option");
      opt.value = w.id;
      opt.textContent = `${w.title} (${w.program_name} - ${w.exercise_count || (w.exercises ? w.exercises.length : 0)} ex)`;
      select.appendChild(opt);
    });
  }

  const modal = document.getElementById("addWorkoutToDayModal");
  if (modal) modal.classList.add("open");
}

function closeAddWorkoutModal() {
  const modal = document.getElementById("addWorkoutToDayModal");
  if (modal) modal.classList.remove("open");
}

async function submitAddWorkoutToDay() {
  const select = document.getElementById("addModalWorkoutSelect");
  const workoutId = parseInt(select.value);
  const duplicate = document.getElementById("addModalDuplicateCheckbox").checked;

  if (!workoutId) {
    alert("Please select a workout to add.");
    return;
  }

  const payload = {
    workout_id: workoutId,
    program_name: state.selectedSourceProgram || "Current Training (Oct 2026)",
    week_number: state.selectedSourceWeek || 1,
    day_of_week: targetAddDayName,
    duplicate_as_new: duplicate
  };

  try {
    const res = await fetch("/api/weeks/add-workout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Failed to add workout");
    }

    const created = await res.json();
    closeAddWorkoutModal();

    await refreshData();
    await renderWeekPlannerView();
    alert(`Successfully added '${created.title}' to ${targetAddDayName}!`);
  } catch (err) {
    console.error("Error adding workout to day:", err);
    alert("Error: " + err.message);
  }
}

async function removeWorkoutFromDay(workoutId, dayName) {
  const w = state.workouts.find(item => item.id === workoutId);
  const workoutTitle = w ? w.title : `Workout #${workoutId}`;

  if (!confirm(`Are you sure you want to remove "${workoutTitle}" from ${dayName}?\n\nThis will remove this workout from this day's schedule.`)) {
    return;
  }

  try {
    const res = await fetch(`/api/workouts/${workoutId}`, {
      method: "DELETE"
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Failed to remove workout");
    }

    await refreshData();
    await renderWeekPlannerView();
    if (state.currentWorkoutId === workoutId) {
      await renderDailyWorkoutView();
    }
  } catch (err) {
    console.error("Error removing workout from day:", err);
    alert("Error removing workout: " + err.message);
  }
}

function toggleBulkCopySection() {
  const panel = document.getElementById("bulkCopyPanel");
  if (!panel) return;
  panel.style.display = panel.style.display === "none" ? "block" : "none";
}

async function executeCopyWeek() {
  const sourceSel = document.getElementById("weekPlannerSourceSelect")?.value;
  if (!sourceSel) {
    alert("Please select a source week.");
    return;
  }

  const [sourceProg, sourceWkStr] = sourceSel.split(":::");
  const targetProg = document.getElementById("copyTargetProgram").value.trim() || sourceProg;
  const targetDate = document.getElementById("copyTargetStartDate").value;
  const targetWk = parseInt(document.getElementById("copyTargetWeekNum").value) || 2;
  const repeatCount = parseInt(document.getElementById("copyRepeatWeeks").value) || 1;
  const progressionLbs = parseFloat(document.getElementById("copyProgressionLbs").value) || 0;

  if (!targetDate) {
    alert("Please select a target start date (Monday).");
    return;
  }

  const payload = {
    source_program: sourceProg,
    source_week_number: parseInt(sourceWkStr),
    target_program: targetProg,
    target_start_date: targetDate,
    target_week_number: targetWk,
    repeat_weeks: repeatCount,
    weight_progression_lbs: progressionLbs
  };

  try {
    const res = await fetch("/api/weeks/copy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Failed to copy week");
    }

    const created = await res.json();
    alert(`Successfully duplicated week! Created ${created.length} new workout(s) across ${repeatCount} week(s).`);

    // Reload workouts, programs, and calendar
    await refreshData();
    goToTab("calendar");
  } catch (err) {
    console.error("Error copying week:", err);
    alert("Error copying week: " + err.message);
  }
}

function openSaveProgramModal() {
  const prog = state.selectedSourceProgram || "Current Training (Oct 2026)";
  const wk = state.selectedSourceWeek || 1;
  document.getElementById("saveProgramSourceText").textContent = `${prog} (Week ${wk})`;
  document.getElementById("saveProgramNameInput").value = `${prog} Template`;

  const modal = document.getElementById("saveProgramModal");
  if (modal) modal.classList.add("open");
}

function closeSaveProgramModal() {
  const modal = document.getElementById("saveProgramModal");
  if (modal) modal.classList.remove("open");
}

async function submitSaveProgramTemplate() {
  const prog = state.selectedSourceProgram || "Current Training (Oct 2026)";
  const wk = state.selectedSourceWeek || 1;
  const newName = document.getElementById("saveProgramNameInput").value.trim();

  if (!newName) {
    alert("Please enter a new program name.");
    return;
  }

  const payload = {
    source_program: prog,
    source_week_number: wk,
    new_program_name: newName
  };

  try {
    const res = await fetch("/api/weeks/save-as-program", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Failed to save program template");
    }

    const created = await res.json();
    closeSaveProgramModal();

    await refreshData();
    await renderWeekPlannerView();
    alert(`Successfully saved '${newName}' with ${created.length} workout(s) as a reusable program template!`);
  } catch (err) {
    console.error("Error saving program template:", err);
    alert("Error: " + err.message);
  }
}

// -------------------------------------------------------------
// TAB 3: EDIT EXISTING WORKOUT
// -------------------------------------------------------------
let editorWorkoutId = null;
let editorExercises = [];

function populateEditWorkoutSelector() {
  const select = document.getElementById("editWorkoutSelector");
  if (!select) return;
  select.innerHTML = "";
  state.workouts.forEach(w => {
    const opt = document.createElement("option");
    opt.value = w.id;
    opt.textContent = `${w.title} (${w.program_name})`;
    select.appendChild(opt);
  });
}

async function renderEditWorkoutView() {
  populateEditWorkoutSelector();
  const select = document.getElementById("editWorkoutSelector");
  if (!editorWorkoutId) {
    editorWorkoutId = state.currentWorkoutId || (state.workouts[0] && state.workouts[0].id);
  }
  if (select && editorWorkoutId) {
    select.value = editorWorkoutId;
  }
  if (editorWorkoutId) {
    await loadWorkoutIntoEditor(editorWorkoutId);
  }
}

async function loadWorkoutIntoEditor(workoutId) {
  if (!workoutId) return;
  editorWorkoutId = workoutId;
  const select = document.getElementById("editWorkoutSelector");
  if (select) select.value = workoutId;

  try {
    const res = await fetch(`/api/workouts/${workoutId}`);
    if (!res.ok) throw new Error("Failed to fetch workout");
    const w = await res.json();

    document.getElementById("editTitle").value = w.title || "";
    document.getElementById("editProgram").value = w.program_name || "";
    document.getElementById("editDayOfWeek").value = w.day_of_week || "Monday";
    document.getElementById("editCalendarDate").value = w.calendar_date || "";
    document.getElementById("editWeekNum").value = w.week_number || 1;
    document.getElementById("editVideoUrl").value = w.video_url || "";
    document.getElementById("editDesc").value = w.description || "";

    editorExercises = (w.exercises || []).map(we => ({
      exercise_id: we.exercise_id,
      superset_group: we.superset_group || "A",
      prescribed_sets: we.prescribed_sets || 3,
      target_reps: we.target_reps || "10",
      target_weight: we.target_weight || "0",
      rest_seconds: we.rest_seconds || 60,
      notes: we.notes || ""
    }));

    renderEditorExercises();
  } catch (err) {
    console.error("Error loading workout for editing:", err);
  }
}

function renderEditorExercises() {
  const container = document.getElementById("editorExerciseList");
  if (!container) return;
  container.innerHTML = "";

  if (editorExercises.length === 0) {
    container.innerHTML = `<div style="color: #94a3b8; padding: 16px; text-align: center;">No exercises in this workout yet. Click '+ Add Exercise' to add one.</div>`;
    return;
  }

  editorExercises.forEach((item, idx) => {
    renderEditorItem(item, idx);
  });
}

function renderEditorItem(item, idx) {
  const container = document.getElementById("editorExerciseList");
  const card = document.createElement("div");
  card.className = "builder-exercise-card";

  const optionsHTML = state.exercises.map(e => 
    `<option value="${e.id}" ${e.id === item.exercise_id ? 'selected' : ''}>${e.name} (${e.category})</option>`
  ).join("");

  card.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="font-weight: 800; font-size: 14px; color: #ffffff;">Exercise #${idx + 1}</span>
        <button type="button" style="background: #334155; border: none; color: white; border-radius: 4px; padding: 2px 7px; font-size: 11px; cursor: pointer; ${idx === 0 ? 'opacity:0.3; pointer-events:none;' : ''}" title="Move Up" onclick="moveEditorExercise(${idx}, -1)">▲</button>
        <button type="button" style="background: #334155; border: none; color: white; border-radius: 4px; padding: 2px 7px; font-size: 11px; cursor: pointer; ${idx === editorExercises.length - 1 ? 'opacity:0.3; pointer-events:none;' : ''}" title="Move Down" onclick="moveEditorExercise(${idx}, 1)">▼</button>
      </div>
      <button type="button" style="background: transparent; border: none; color: #ef4444; font-weight: bold; cursor: pointer; font-size: 13px;" onclick="removeEditorExercise(${idx})">✕ Remove</button>
    </div>
    <div class="form-group">
      <label class="form-label">Exercise Movement</label>
      <select class="form-select" onchange="editorExercises[${idx}].exercise_id = parseInt(this.value)">
        ${optionsHTML}
      </select>
    </div>
    <div class="grid-2">
      <div class="form-group">
        <label class="form-label">Superset Group</label>
        <select class="form-select" onchange="editorExercises[${idx}].superset_group = this.value">
          ${['A','B','C','D','E','F'].map(g => `<option value="${g}" ${g === item.superset_group ? 'selected' : ''}>Group ${g}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Sets</label>
        <input type="number" class="form-input" value="${item.prescribed_sets}" onchange="editorExercises[${idx}].prescribed_sets = parseInt(this.value) || 3">
      </div>
    </div>
    <div class="grid-2">
      <div class="form-group">
        <label class="form-label">Target Reps / Time</label>
        <input type="text" class="form-input" value="${item.target_reps}" placeholder="e.g. 10 ea. or 30 secs" onchange="editorExercises[${idx}].target_reps = this.value">
      </div>
      <div class="form-group">
        <label class="form-label">Target Weight (lbs)</label>
        <input type="text" class="form-input" value="${item.target_weight || '0'}" placeholder="e.g. 185 or 0" onchange="editorExercises[${idx}].target_weight = this.value">
      </div>
    </div>
    <div class="grid-2">
      <div class="form-group">
        <label class="form-label">Rest Timer (secs)</label>
        <input type="number" class="form-input" value="${item.rest_seconds}" placeholder="e.g. 60 or 90" onchange="editorExercises[${idx}].rest_seconds = parseInt(this.value) || 0">
      </div>
      <div class="form-group">
        <label class="form-label">Coaching Cues / Notes</label>
        <input type="text" class="form-input" value="${item.notes || ''}" placeholder="e.g. 2-3 sec pause at bottom" onchange="editorExercises[${idx}].notes = this.value">
      </div>
    </div>
  `;

  container.appendChild(card);
}

function addExerciseToEditor() {
  const defaultEx = state.exercises[0] || { id: 1, name: "Pelvic Tilts" };
  editorExercises.push({
    exercise_id: defaultEx.id,
    superset_group: "A",
    prescribed_sets: 3,
    target_reps: "10",
    target_weight: "0",
    rest_seconds: 60,
    notes: ""
  });
  renderEditorExercises();
}

function moveEditorExercise(idx, dir) {
  const targetIdx = idx + dir;
  if (targetIdx < 0 || targetIdx >= editorExercises.length) return;
  const temp = editorExercises[idx];
  editorExercises[idx] = editorExercises[targetIdx];
  editorExercises[targetIdx] = temp;
  renderEditorExercises();
}

function removeEditorExercise(idx) {
  editorExercises.splice(idx, 1);
  renderEditorExercises();
}

async function saveWorkoutEdits() {
  if (!editorWorkoutId) {
    alert("No workout selected to edit.");
    return;
  }
  const title = document.getElementById("editTitle").value.trim();
  const program = document.getElementById("editProgram").value.trim() || "General";
  const dayOfWeek = document.getElementById("editDayOfWeek").value;
  const calendarDate = document.getElementById("editCalendarDate").value.trim();
  const weekNum = parseInt(document.getElementById("editWeekNum").value) || 1;
  const videoUrl = document.getElementById("editVideoUrl").value.trim();
  const desc = document.getElementById("editDesc").value.trim();

  if (!title) {
    alert("Please provide a workout title.");
    return;
  }
  if (editorExercises.length === 0) {
    alert("Please include at least one exercise in the workout.");
    return;
  }

  const payload = {
    title,
    program_name: program,
    day_of_week: dayOfWeek,
    calendar_date: calendarDate,
    scheduled_date: calendarDate,
    week_number: weekNum,
    video_url: videoUrl,
    description: desc,
    exercises: editorExercises.map((e, idx) => ({
      exercise_id: e.exercise_id,
      superset_group: e.superset_group,
      order_index: idx,
      prescription_text: `${e.prescribed_sets} X ${String(e.target_reps).toUpperCase()}`,
      prescribed_sets: e.prescribed_sets,
      target_reps: String(e.target_reps),
      target_weight: String(e.target_weight || "0"),
      rest_seconds: e.rest_seconds || 0,
      notes: e.notes || "",
      is_ea: String(e.target_reps).toLowerCase().includes("ea")
    }))
  };

  try {
    const res = await fetch(`/api/workouts/${editorWorkoutId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Failed to update workout");
    }

    const updated = await res.json();
    alert(`Workout '${updated.title}' updated successfully!`);

    await refreshData();
    populateEditWorkoutSelector();
    document.getElementById("editWorkoutSelector").value = updated.id;
    if (state.currentWorkoutId === updated.id) {
      await loadWorkout(updated.id);
    }
  } catch (err) {
    console.error("Error saving workout edits:", err);
    alert("Error: " + err.message);
  }
}

async function trackCurrentlyEditedWorkout() {
  if (!editorWorkoutId) return;
  state.currentWorkoutId = editorWorkoutId;
  const edited = state.workouts.find(w => w.id === editorWorkoutId);
  if (edited && edited.calendar_date) state.selectedDate = edited.calendar_date;
  if (isCoach()) {
    showToast("Opened this workout on its calendar day.");
  }
  goToTab(isCoach() ? "calendar" : "workouts");
}

async function deleteCurrentlyEditedWorkout() {
  if (!editorWorkoutId) return;
  if (!confirm("Are you sure you want to permanently delete this workout?")) return;

  try {
    const res = await fetch(`/api/workouts/${editorWorkoutId}`, {
      method: "DELETE"
    });
    if (!res.ok) throw new Error("Failed to delete workout");

    showToast("Workout deleted.");
    editorWorkoutId = null;
    await refreshData();
    switchPlannerSubtab("builder");
  } catch (err) {
    console.error("Error deleting workout:", err);
    alert("Error deleting workout: " + err.message);
  }
}

function jumpToEditCurrentWorkout() {
  const wid = state.currentWorkoutId || (state.workouts[0] && state.workouts[0].id);
  if (!wid) return;
  jumpToEditWorkout(wid);
}

function jumpToEditWorkout(workoutId) {
  state.activeTab = "planner";
  document.querySelectorAll("#mainNavTabs .nav-tab-btn").forEach(t => {
    t.classList.toggle("active", t.dataset.tab === "planner");
  });
  document.querySelectorAll(".view-section").forEach(s => s.style.display = "none");
  const viewPlanner = document.getElementById("view-planner");
  if (viewPlanner) viewPlanner.style.display = "block";
  switchPlannerSubtab("editworkout");
  loadWorkoutIntoEditor(workoutId);
}

// -------------------------------------------------------------
// EXERCISES LIBRARY VIEW
// -------------------------------------------------------------
function renderExercisesView() {
  const list = document.getElementById("exercisesCatalogList");
  const search = (document.getElementById("exerciseSearchInput").value || "").toLowerCase();
  const activeCategory = document.querySelector(".category-filter-btn.active")?.dataset.category || "All";

  list.innerHTML = "";

  const filtered = state.exercises.filter(ex => {
    const matchCat = activeCategory === "All" || ex.category === activeCategory;
    const matchSearch = !search || ex.name.toLowerCase().includes(search);
    return matchCat && matchSearch;
  });

  if (filtered.length === 0) {
    list.innerHTML = `<div style="color: #94a3b8; padding: 28px; text-align: center;">No exercises match this filter.</div>`;
    return;
  }

  filtered.forEach(ex => {
    const card = document.createElement("div");
    card.style.background = "#1e293b";
    card.style.border = "1px solid #334155";
    card.style.borderRadius = "12px";
    card.style.padding = "16px";
    card.style.marginBottom = "12px";
    card.style.display = "flex";
    card.style.justifyContent = "space-between";
    card.style.alignItems = "center";
    card.style.gap = "12px";

    card.innerHTML = `
      <div style="flex: 1;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-weight: 800; font-size: 16px; color: #ffffff;">${escapeHtml(ex.name)}</span>
          <span style="background: rgba(14, 165, 233, 0.15); color: #0ea5e9; font-size: 11px; padding: 2px 8px; border-radius: 4px; font-weight: 700;">${escapeHtml(ex.category)}</span>
        </div>
        ${ex.default_notes ? `<div style="color: #94a3b8; font-size: 13px; margin-top: 4px;">${ex.default_notes}</div>` : ''}
      </div>
      <div style="display: flex; gap: 8px;">
        <button class="btn-secondary ex-video-btn" style="padding: 8px 12px; font-size: 12px;" data-name="${escapeHtml(ex.name)}" data-url="${escapeHtml(ex.video_url || '')}">
          ▶ Video
        </button>
        <button class="btn-secondary ex-edit-btn" style="padding: 8px 12px; font-size: 12px;" data-id="${ex.id}" data-name="${escapeHtml(ex.name)}" data-url="${escapeHtml(ex.video_url || '')}">
          Edit link
        </button>
      </div>
    `;

    card.querySelector(".ex-video-btn").onclick = () => {
      openVideoModal(ex.name, ex.video_url || "");
    };
    card.querySelector(".ex-edit-btn").onclick = () => {
      editExerciseVideo(ex.id, ex.name, ex.video_url || "");
    };
    list.appendChild(card);
  });
}

async function editExerciseVideo(exId, exName, currentUrl) {
  const newUrl = prompt(`Update Explainer Video URL for ${exName}:`, currentUrl);
  if (newUrl !== null) {
    await fetch(`/api/exercises/${exId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ video_url: newUrl })
    });
    const r = await fetch("/api/exercises");
    state.exercises = await r.json();
    renderExercisesView();
  }
}

async function createNewExercisePrompt() {
  const name = prompt("Exercise Name:");
  if (!name) return;
  const category = prompt("Category (Lower Body, Upper Body, Mobility, Core & Trunk, Plyometrics, Breathwork):", "Strength") || "Strength";
  const video_url = prompt("Video Link (YouTube URL):", "") || "";
  const default_notes = prompt("Coaching Cues / Notes:", "") || "";

  await fetch("/api/exercises", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, category, video_url, default_notes })
  });

  const r = await fetch("/api/exercises");
  state.exercises = await r.json();
  renderExercisesView();
}

// -------------------------------------------------------------
// MAXES / PR VIEW
// -------------------------------------------------------------
async function renderRecordsView() {
  const container = document.getElementById("recordsListContainer");
  container.innerHTML = "Loading PR records...";

  try {
    const res = await fetch("/api/records");
    state.records = await res.json();
    container.innerHTML = "";

    if (state.records.length === 0) {
      container.innerHTML = `<div style="color: #94a3b8; padding: 20px; text-align: center;">No personal records recorded yet. Click 'Add PR' above!</div>`;
      return;
    }

    state.records.forEach(pr => {
      const card = document.createElement("div");
      card.style.background = "#1e293b";
      card.style.border = "1px solid #334155";
      card.style.borderRadius = "12px";
      card.style.padding = "16px";
      card.style.marginBottom = "10px";
      card.style.display = "flex";
      card.style.justifyContent = "space-between";
      card.style.alignItems = "center";

      card.innerHTML = `
        <div>
          <div style="font-weight: 800; font-size: 16px; color: #ffffff;">${pr.exercise.name}</div>
          <div style="font-size: 13px; color: #94a3b8; margin-top: 2px;">${pr.notes || 'Recorded from workout'}</div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 20px; font-weight: 900; color: #10b981;">${pr.weight} lbs</div>
          <div style="font-size: 12px; color: #94a3b8; font-weight: 700;">${pr.reps} REP MAX</div>
        </div>
      `;
      container.appendChild(card);
    });
  } catch (err) {
    container.innerHTML = "Error loading PRs.";
  }
}

async function addRecordPrompt() {
  const exName = prompt("Exercise Name (e.g. Back Squat, Kickstand RDL):");
  if (!exName) return;
  const ex = state.exercises.find(e => e.name.toLowerCase() === exName.toLowerCase());
  if (!ex) {
    alert("Exercise not found. Please add it in the Exercises tab first.");
    return;
  }
  const wt = prompt("Weight (lbs):", "185");
  if (!wt || isNaN(wt)) return;
  const reps = prompt("Reps:", "1") || "1";
  const notes = prompt("Notes:", "New PR") || "";

  await fetch("/api/records", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      exercise_id: ex.id,
      weight: parseFloat(wt),
      reps: parseInt(reps),
      notes: notes
    })
  });
  renderRecordsView();
}

// =============================================================
// COACH DASHBOARD & COMPLIANCE LOGIC (AMP ARCHITECTURE)
// =============================================================
function navigateCoachDashboardDate(delta) {
  const parts = state.coachDashboardDate.split("-").map(Number);
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  d.setDate(d.getDate() + delta);
  state.coachDashboardDate = formatLocalIso(d);
  renderCoachDashboardView();
}

function jumpCoachDashboardToday() {
  state.coachDashboardDate = getTodayIso();
  renderCoachDashboardView();
}

function openCoachNativeDatePicker() {
  const picker = document.getElementById("coachDashboardDatePicker");
  if (picker) {
    if (typeof picker.showPicker === "function") picker.showPicker();
    else picker.focus();
  }
}

function onCoachDashboardDatePickerChanged(val) {
  if (!val) return;
  state.coachDashboardDate = val;
  renderCoachDashboardView();
}

function setComplianceFilter(filter) {
  state.complianceFilter = filter;
  document.querySelectorAll("#complianceFilterPills .amp-filter-pill").forEach(p => {
    p.classList.toggle("active", p.dataset.filter === filter);
  });
  renderCoachDashboardActivityList();
}

function filterComplianceTriage() {
  setComplianceFilter("attention");
}

async function renderCoachDashboardView() {
  if (!state.coachDashboardDate) state.coachDashboardDate = getTodayIso();

  const parts = state.coachDashboardDate.split("-").map(Number);
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const dayName = days[d.getDay()];
  const monthName = MONTH_NAMES[d.getMonth()].slice(0, 3);
  const formattedDate = `${dayName}, ${monthName} ${d.getDate()}, ${d.getFullYear()}`;

  const dateText = document.getElementById("coachDashboardDateText");
  if (dateText) dateText.textContent = formattedDate;

  const todayBadge = document.getElementById("coachDashboardTodayBadge");
  if (todayBadge) todayBadge.style.display = (state.coachDashboardDate === getTodayIso()) ? "inline-block" : "none";

  const picker = document.getElementById("coachDashboardDatePicker");
  if (picker) picker.value = state.coachDashboardDate;

  try {
    const res = await fetch(`/api/coach/compliance?date=${state.coachDashboardDate}`);
    const data = await res.json();
    state.complianceReport = data;

    // KPI Cards
    const kpiTotal = document.getElementById("kpiTotalAthletes");
    if (kpiTotal) kpiTotal.textContent = data.total_athletes;

    const kpiComp = document.getElementById("kpiCompletedAthletes");
    if (kpiComp) kpiComp.textContent = data.completed_count;

    const kpiRatio = document.getElementById("kpiCompletedRatio");
    if (kpiRatio) kpiRatio.textContent = `${data.completed_count} / ${data.total_athletes}`;

    const kpiProg = document.getElementById("kpiInProgressAthletes");
    if (kpiProg) kpiProg.textContent = data.in_progress_count;

    const kpiPulse = document.getElementById("kpiActivePulse");
    if (kpiPulse) kpiPulse.style.display = data.in_progress_count > 0 ? "inline-block" : "none";

    const compRate = Math.round(data.compliance_percentage);
    const kpiRate = document.getElementById("kpiComplianceRate");
    if (kpiRate) kpiRate.textContent = `${compRate}%`;

    const barFill = document.getElementById("kpiComplianceBarFill");
    if (barFill) barFill.style.width = `${Math.min(100, compRate)}%`;

    // Triage Attention Banner
    const triageBanner = document.getElementById("triageAlertBanner");
    const triageMsg = document.getElementById("triageAlertMessage");
    const unstarted = (data.athletes || []).filter(a => a.status === "not_started");
    const isTodayOrPast = state.coachDashboardDate <= getTodayIso();

    if (triageBanner && triageMsg) {
      if (unstarted.length > 0 && isTodayOrPast) {
        triageBanner.style.display = "flex";
        triageMsg.textContent = `${unstarted.length} athlete${unstarted.length > 1 ? 's have' : ' has'} not started prescribed sessions for this day.`;
      } else {
        triageBanner.style.display = "none";
      }
    }

    renderCoachDashboardActivityList();
  } catch (err) {
    console.error("Error loading coach compliance report:", err);
  }
}

function renderCoachDashboardActivityList() {
  const listEl = document.getElementById("coachAthleteActivityList");
  if (!listEl) return;

  const data = state.complianceReport;
  if (!data || !data.athletes) {
    listEl.innerHTML = `<div style="text-align: center; padding: 40px; color: var(--amp-slate);">No compliance data available.</div>`;
    return;
  }

  let filtered = data.athletes;
  if (state.complianceFilter === "completed") {
    filtered = filtered.filter(a => a.status === "completed");
  } else if (state.complianceFilter === "in_progress") {
    filtered = filtered.filter(a => a.status === "in_progress");
  } else if (state.complianceFilter === "not_started") {
    filtered = filtered.filter(a => a.status === "not_started");
  } else if (state.complianceFilter === "attention") {
    filtered = filtered.filter(a => a.status === "not_started" || (a.status_badge && a.status_badge !== "Active"));
  }

  const counterEl = document.getElementById("complianceTotalCounter");
  if (counterEl) counterEl.textContent = `${filtered.length} of ${data.athletes.length} Athletes`;

  if (filtered.length === 0) {
    listEl.innerHTML = `
      <div style="text-align: center; padding: 48px 20px; color: var(--amp-slate);">
        <div style="font-size: 32px; margin-bottom: 8px;">📋</div>
        <div style="font-weight: 600; color: var(--amp-charcoal); font-size: 15px;">No athletes matching "${state.complianceFilter}"</div>
        <div style="font-size: 13px; margin-top: 4px;">Select another filter tab or jump to today's schedule.</div>
      </div>
    `;
    return;
  }

  let html = `<div class="amp-feed-table">`;

  filtered.forEach(a => {
    const initials = a.user_name.split(" ").map(p => p[0]).join("").toUpperCase().slice(0, 2);
    const groupsStr = a.group_names && a.group_names.length > 0 ? a.group_names.join(", ") : "General";
    const posTag = a.position_tag || "Athlete";

    let statusPillHtml = "";
    if (a.status === "completed") {
      statusPillHtml = `<span class="status-pill completed">✓ Completed</span>`;
    } else if (a.status === "in_progress") {
      statusPillHtml = `<span class="status-pill in_progress">⚡ In Progress</span>`;
    } else {
      statusPillHtml = `<span class="status-pill not_started">○ Not Started</span>`;
    }

    if (a.status_badge === "Modified") {
      statusPillHtml += `<span class="status-pill modified" style="margin-left: 4px;">Modified</span>`;
    } else if (a.status_badge === "Rehab") {
      statusPillHtml += `<span class="status-pill rehab" style="margin-left: 4px;">Rehab</span>`;
    }

    const setsPct = a.total_prescribed_sets > 0 ? Math.round((a.completed_sets / a.total_prescribed_sets) * 100) : 0;
    const barColor = a.status === "completed" ? "var(--amp-status-completed)" : "var(--amp-orange)";

    html += `
      <div class="amp-feed-row" onclick="openAmpDrawer(${a.user_id}, ${a.assigned_workout_id || 0}, '${escapeQuote(a.user_name)}', '${a.avatar_color}', ${a.session_id || 'null'}, '${escapeQuote(groupsStr)}')">
        <!-- 1. Athlete Info -->
        <div class="athlete-profile-cell">
          <div class="athlete-avatar-circle" style="background: ${a.avatar_color || 'var(--amp-charcoal)'}; color: #ffffff;">${initials}</div>
          <div class="athlete-name-meta">
            <span class="athlete-row-name">${a.user_name}</span>
            <div class="athlete-row-tags">
              <span class="cohort-pill-tag">${groupsStr}</span>
              <span class="position-tag">${posTag}</span>
            </div>
          </div>
        </div>

        <!-- 2. Prescribed Workout -->
        <div class="assigned-workout-meta">
          <div style="font-weight: 600; color: var(--amp-ink);">${a.assigned_workout_title || 'No Session Programmed'}</div>
          <span>${a.total_prescribed_sets} prescribed sets</span>
        </div>

        <!-- 3. Progress / Sets -->
        <div class="sets-tabular-cell">
          <div>${a.completed_sets} / ${a.total_prescribed_sets} sets</div>
          <div class="kpi-progress-track" style="height: 3px; margin-top: 4px; width: 80px;">
            <div class="kpi-progress-fill" style="width: ${setsPct}%; background: ${barColor};"></div>
          </div>
        </div>

        <!-- 4. Status Badge -->
        <div>
          ${statusPillHtml}
        </div>

        <!-- 5. Quick Actions -->
        <div class="row-actions-group" style="justify-content: flex-end;">
          <button class="amp-action-chip primary" onclick="event.stopPropagation(); openAmpDrawer(${a.user_id}, ${a.assigned_workout_id || 0}, '${escapeQuote(a.user_name)}', '${a.avatar_color}', ${a.session_id || 'null'}, '${escapeQuote(groupsStr)}')">
            Inspect Sets →
          </button>

          ${a.status === 'not_started' ? `
            <button class="amp-action-chip" onclick="event.stopPropagation(); remediatePushToTomorrow(${a.user_id})" title="Reschedule session to tomorrow (+1 day)">
              Push +1d
            </button>
            <button class="amp-action-chip" onclick="event.stopPropagation(); remediateMarkPresent(${a.user_id}, ${a.assigned_workout_id || 0})" title="Mark session as present and complete">
              Mark Present
            </button>
          ` : ''}

          <button class="amp-action-chip" onclick="event.stopPropagation(); previewAsStudent(${a.user_id})" title="Preview application as this athlete">
            👁️
          </button>
        </div>
      </div>
    `;
  });

  html += `</div>`;
  listEl.innerHTML = html;
}

// -------------------------------------------------------------
// COACH 1-CLICK REMEDIATION ACTIONS
// -------------------------------------------------------------
async function remediatePushToTomorrow(userId) {
  try {
    const res = await fetch("/api/coach/remediate/push-to-tomorrow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: userId,
        current_date: state.coachDashboardDate
      })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Failed to push workout to tomorrow");
    }
    await renderCoachDashboardView();
  } catch (err) {
    alert("Remediation error: " + err.message);
  }
}

async function remediateMarkPresent(userId, workoutId) {
  if (!workoutId) {
    alert("No prescribed workout available to mark complete for this athlete.");
    return;
  }
  try {
    const res = await fetch("/api/coach/remediate/mark-present", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: userId,
        workout_id: workoutId,
        date: state.coachDashboardDate
      })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Failed to mark athlete present");
    }
    await renderCoachDashboardView();
  } catch (err) {
    alert("Remediation error: " + err.message);
  }
}

// -------------------------------------------------------------
// SLIDE-OVER INSPECTION DRAWER (AMP ARCHITECTURE)
// -------------------------------------------------------------
async function openAmpDrawer(userId, workoutId, userName, avatarColor, sessionId, cohortName) {
  const drawer = document.getElementById("ampSetInspectionDrawer");
  if (!drawer) return;

  state.drawerCurrentAthlete = { userId, workoutId, userName, avatarColor, sessionId, cohortName };

  const initials = userName.split(" ").map(p => p[0]).join("").toUpperCase().slice(0, 2);
  const avatarEl = document.getElementById("drawerAthleteAvatar");
  if (avatarEl) {
    avatarEl.style.background = avatarColor || "var(--amp-orange)";
    avatarEl.textContent = initials;
  }

  const nameEl = document.getElementById("drawerAthleteName");
  if (nameEl) nameEl.textContent = userName;

  const subEl = document.getElementById("drawerAthleteSubtitle");
  if (subEl) subEl.textContent = `${cohortName || 'Training Cohort'} • Prescribed Session`;

  const calloutEl = document.getElementById("drawerAthleteCallout");
  const noteTextEl = document.getElementById("drawerAthleteNoteText");
  if (calloutEl) calloutEl.style.display = "none";

  const contentEl = document.getElementById("drawerSetsContent");
  contentEl.innerHTML = `<div style="text-align: center; padding: 40px; color: var(--amp-slate); font-size: 13px;">Loading session logs...</div>`;

  drawer.classList.add("open");
  drawer.setAttribute("aria-hidden", "false");

  try {
    if (sessionId) {
      const res = await fetch(`/api/sessions/${sessionId}`);
      const session = await res.json();

      if (session.notes && calloutEl && noteTextEl) {
        noteTextEl.textContent = session.notes;
        calloutEl.style.display = "flex";
      }

      let html = "";
      if (session.workout && session.workout.exercises) {
        session.workout.exercises.forEach(we => {
          const exName = we.exercise ? we.exercise.name : `Exercise #${we.exercise_id}`;
          const setsForEx = (session.set_logs || []).filter(s => s.workout_exercise_id === we.id);
          const supersetBadge = we.superset_tag ? `<span class="superset-tag-badge">${we.superset_tag}</span>` : "";

          html += `
            <div class="amp-drawer-exercise-card">
              <div class="drawer-ex-header">
                <div class="drawer-ex-name">
                  ${supersetBadge}${exName}
                </div>
                <div class="drawer-ex-prescribed">
                  Prescribed: ${we.prescribed_sets} sets × ${we.target_reps} reps ${we.target_rpe ? `@ RPE ${we.target_rpe}` : ''}
                </div>
              </div>
              <table class="drawer-sets-table">
                <thead>
                  <tr>
                    <th>SET #</th>
                    <th>PRESCRIBED</th>
                    <th>LOGGED WEIGHT & REPS</th>
                    <th style="text-align: right;">COMPLETION</th>
                  </tr>
                </thead>
                <tbody>
          `;

          for (let sNum = 1; sNum <= we.prescribed_sets; sNum++) {
            const logged = setsForEx.find(s => s.set_number === sNum);
            const isDone = logged && logged.completed;
            const logText = logged ? `<span class="weight-logged-bold">${logged.weight} lbs</span> × ${logged.reps} reps` : `<span style="color: var(--amp-slate); font-style: italic;">—</span>`;
            const badge = isDone
              ? `<span class="check-pill-done">✓ DONE</span>`
              : `<span style="font-size: 11px; color: var(--amp-slate);">Pending</span>`;

            html += `
              <tr>
                <td class="set-mono-num">SET ${sNum}</td>
                <td style="color: var(--amp-slate); font-size: 12px;">${we.target_reps} reps</td>
                <td>${logText}</td>
                <td style="text-align: right;">${badge}</td>
              </tr>
            `;
          }

          html += `</tbody></table></div>`;
        });
      }
      contentEl.innerHTML = html || `<div style="text-align: center; padding: 30px; color: var(--amp-slate);">No exercises found for this session.</div>`;
    } else if (workoutId) {
      const res = await fetch(`/api/workouts/${workoutId}`);
      const workout = await res.json();
      let html = `
        <div style="background: var(--amp-peach-subtle); border: 1px solid rgba(255,97,5,0.2); border-radius: var(--amp-radius-card); padding: 14px; margin-bottom: 16px; font-size: 13px; color: var(--amp-charcoal);">
          ℹ️ <strong>Session Not Started:</strong> Showing prescribed targets below.
        </div>
      `;
      (workout.exercises || []).forEach(we => {
        const exName = we.exercise ? we.exercise.name : `Exercise #${we.exercise_id}`;
        const supersetBadge = we.superset_tag ? `<span class="superset-tag-badge">${we.superset_tag}</span>` : "";
        html += `
          <div class="amp-drawer-exercise-card">
            <div class="drawer-ex-header">
              <div class="drawer-ex-name">${supersetBadge}${exName}</div>
              <div class="drawer-ex-prescribed">${we.prescribed_sets} sets × ${we.target_reps} reps</div>
            </div>
            <div style="padding: 12px 16px; font-size: 12.5px; color: var(--amp-slate);">
              Prescribed target: ${we.prescribed_sets} sets of ${we.target_reps} reps ${we.target_rpe ? `at RPE ${we.target_rpe}` : ''}
            </div>
          </div>
        `;
      });
      contentEl.innerHTML = html;
    } else {
      contentEl.innerHTML = `<div style="text-align: center; padding: 40px; color: var(--amp-slate);">No workout scheduled for this athlete.</div>`;
    }
  } catch (err) {
    console.error("Error loading drawer session:", err);
    contentEl.innerHTML = `<div style="padding: 24px; color: var(--amp-status-modified); text-align: center;">Failed to load session details.</div>`;
  }
}

function closeAmpDrawer() {
  const drawer = document.getElementById("ampSetInspectionDrawer");
  if (drawer) {
    drawer.classList.remove("open");
    drawer.setAttribute("aria-hidden", "true");
  }
}

function previewCurrentDrawerAthlete() {
  if (state.drawerCurrentAthlete) {
    const uid = state.drawerCurrentAthlete.userId;
    closeAmpDrawer();
    previewAsStudent(uid);
  }
}

function openAthleteSetsModal(userId, workoutId, userName, avatarColor, sessionId) {
  openAmpDrawer(userId, workoutId, userName, avatarColor, sessionId);
}

function closeAthleteSetsModal() {
  closeAmpDrawer();
}

// =============================================================
// ROSTER & TRAINING COHORTS SPLIT VIEW LOGIC
// =============================================================
async function renderRosterView() {
  try {
    const [groupsRes, usersRes] = await Promise.all([
      fetch("/api/groups"),
      fetch("/api/users")
    ]);
    state.groups = await groupsRes.json();
    state.users = await usersRes.json();

    renderRosterCohortsList();
    renderRosterAthletesTable();
    updateBatchActionBar();
  } catch (err) {
    console.error("Error rendering roster view:", err);
  }
}

function renderRosterCohortsList() {
  const groupsList = document.getElementById("rosterGroupsList");
  const groupCountBadge = document.getElementById("rosterGroupCountBadge");
  if (!groupsList) return;

  if (groupCountBadge) groupCountBadge.textContent = `${state.groups.length} teams`;

  groupsList.innerHTML = "";

  // "All Athletes" card at top
  const allCard = document.createElement("div");
  allCard.className = `cohort-card-dropzone ${state.rosterSelectedCohortId === null ? 'active' : ''}`;
  allCard.onclick = () => {
    state.rosterSelectedCohortId = null;
    renderRosterCohortsList();
    renderRosterAthletesTable();
  };
  const totalStudents = state.users.filter(u => u.role === "student").length;
  allCard.innerHTML = `
    <div class="cohort-card-top">
      <div class="cohort-card-name">
        <span class="cohort-color-dot" style="background: var(--amp-ink);"></span>
        All Athletes
      </div>
      <span class="cohort-member-count">${totalStudents}</span>
    </div>
    <div class="cohort-card-desc">Every client</div>
  `;
  groupsList.appendChild(allCard);

  state.groups.forEach(g => {
    const card = document.createElement("div");
    card.className = `cohort-card-dropzone ${Number(state.rosterSelectedCohortId) === Number(g.id) ? 'active' : ''}`;
    card.dataset.groupId = g.id;

    // Drag and drop listeners
    card.ondragover = (e) => onCohortDragOver(e);
    card.ondragleave = (e) => onCohortDragLeave(e);
    card.ondrop = (e) => onCohortDrop(e, g.id);

    card.onclick = (e) => {
      if (e.target.closest("button")) return;
      state.rosterSelectedCohortId = g.id;
      renderRosterCohortsList();
      renderRosterAthletesTable();
    };

    card.innerHTML = `
      <div class="cohort-card-top">
        <div class="cohort-card-name">
          <span class="cohort-color-dot" style="background: ${g.color || 'var(--amp-orange)'};"></span>
          ${g.name}
        </div>
        <div style="display: flex; align-items: center; gap: 6px;">
          <span class="cohort-member-count">${g.member_count}</span>
          <button style="background: transparent; border: none; color: var(--amp-slate); cursor: pointer; font-size: 13px;" onclick="event.stopPropagation(); deleteGroup(${g.id})" title="Delete Cohort">✕</button>
        </div>
      </div>
      <div class="cohort-card-desc">${g.description || 'No description'}</div>
      <div class="cohort-card-drop-hint">Drop athlete here to assign ↘</div>
    `;
    groupsList.appendChild(card);
  });
}

function renderRosterAthletesTable() {
  const tbody = document.getElementById("rosterAthletesTableBody");
  const countBadge = document.getElementById("rosterAthleteCountBadge");
  if (!tbody) return;

  let students = state.users.filter(u => u.role === "student");

  // Filter by cohort if selected
  if (state.rosterSelectedCohortId !== null) {
    const selGroup = state.groups.find(g => Number(g.id) === Number(state.rosterSelectedCohortId));
    students = students.filter(s => (s.groups || []).some(g =>
      (g.id && Number(g.id) === Number(state.rosterSelectedCohortId)) ||
      (selGroup && g.name && g.name.toLowerCase().trim() === selGroup.name.toLowerCase().trim())
    ));
  }

  // Filter by status if selected
  if (state.rosterStatusFilter && state.rosterStatusFilter !== "all") {
    students = students.filter(s => (s.status_badge || "Active") === state.rosterStatusFilter);
  }

  // Filter by search query
  if (state.rosterSearchQuery) {
    const q = state.rosterSearchQuery.toLowerCase();
    students = students.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      (s.title && s.title.toLowerCase().includes(q)) ||
      (s.position_tag && s.position_tag.toLowerCase().includes(q))
    );
  }

  if (countBadge) countBadge.textContent = `${students.length} athletes`;

  tbody.innerHTML = "";

  if (students.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; padding: 48px; color: var(--amp-slate);">
          No athletes matching current filters.
        </td>
      </tr>
    `;
    return;
  }

  students.forEach(s => {
    const isSelected = state.selectedAthleteIds.includes(s.id);
    const initials = s.name.split(" ").map(p => p[0]).join("").toUpperCase().slice(0, 2);
    const cohortBadges = (s.groups && s.groups.length > 0)
      ? s.groups.map(g => `<span class="cohort-pill-tag"><span class="cohort-color-dot" style="background: ${g.color || 'var(--amp-orange)'}; width: 6px; height: 6px; margin-right: 4px;"></span>${g.name}</span>`).join(" ")
      : `<span style="color: var(--amp-slate); font-size: 11px; font-style: italic;">Unassigned</span>`;

    const statusBadge = s.status_badge || "Active";
    let statusClass = "completed";
    if (statusBadge === "Modified") statusClass = "modified";
    else if (statusBadge === "Rehab") statusClass = "rehab";

    const tr = document.createElement("tr");
    tr.id = `athlete-row-${s.id}`;
    tr.draggable = true;
    tr.ondragstart = (e) => onAthleteDragStart(e, s.id);
    tr.ondragend = (e) => onAthleteDragEnd(e);

    tr.innerHTML = `
      <td style="text-align: center;">
        <input type="checkbox" class="athlete-row-checkbox" value="${s.id}" ${isSelected ? 'checked' : ''} onchange="onAthleteCheckboxChange(${s.id}, this.checked)">
      </td>
      <td>
        <div style="display: flex; align-items: center; gap: 10px;">
          <span class="athlete-drag-grip" title="Drag and drop onto a cohort in the left panel">⋮⋮</span>
          <div class="athlete-avatar-circle" style="background: ${s.avatar_color || 'var(--amp-charcoal)'}; color: #ffffff;">${initials}</div>
          <div class="athlete-name-meta">
            <span class="athlete-row-name">${s.name}</span>
            <span class="position-tag">${s.position_tag || s.title || 'Athlete'} • ${s.email}</span>
          </div>
        </div>
      </td>
      <td>
        <div style="display: flex; gap: 4px; flex-wrap: wrap;">
          ${cohortBadges}
        </div>
      </td>
      <td>
        <button class="status-pill ${statusClass}" onclick="cycleAthleteStatus(${s.id}, '${statusBadge}')" title="Click to cycle status: Active -> Modified -> Rehab" style="border: none; cursor: pointer;">
          ● ${statusBadge} ↻
        </button>
      </td>
      <td style="text-align: right;">
        <div class="row-actions-group" style="justify-content: flex-end;">
          <button class="amp-action-chip" onclick="openAssignAthleteGroupModal(${s.id})" title="Manage cohort memberships">
            ⚙️ Cohorts
          </button>
          <button class="amp-action-chip" onclick="previewAsStudent(${s.id})" title="View application as this athlete">
            👁️ View
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });

  const selectAllEl = document.getElementById("selectAllAthletesCheckbox");
  if (selectAllEl) {
    selectAllEl.checked = students.length > 0 && students.every(s => state.selectedAthleteIds.includes(s.id));
  }
}

// HTML5 Drag and Drop Roster Handlers
function onAthleteDragStart(e, athleteId) {
  state.draggedAthleteId = athleteId;
  e.dataTransfer.setData("text/plain", String(athleteId));
  e.dataTransfer.effectAllowed = "move";
  const row = document.getElementById(`athlete-row-${athleteId}`);
  if (row) row.classList.add("is-dragging");
}

function onAthleteDragEnd(e) {
  state.draggedAthleteId = null;
  document.querySelectorAll(".athletes-table tr").forEach(r => r.classList.remove("is-dragging"));
  document.querySelectorAll(".cohort-card-dropzone").forEach(c => c.classList.remove("drag-over"));
}

function onCohortDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = "move";
  e.currentTarget.classList.add("drag-over");
}

function onCohortDragLeave(e) {
  e.currentTarget.classList.remove("drag-over");
}

async function onCohortDrop(e, groupId) {
  e.preventDefault();
  e.currentTarget.classList.remove("drag-over");

  const athleteId = parseInt(e.dataTransfer.getData("text/plain")) || state.draggedAthleteId;
  if (!athleteId || !groupId) return;

  try {
    const res = await fetch(`/api/groups/${groupId}/members/${athleteId}`, { method: "POST" });
    if (!res.ok) throw new Error("Failed to assign athlete to cohort");

    await refreshData();
    renderRosterView();
  } catch (err) {
    alert("Drag & Drop error: " + err.message);
  }
}

function onSearchAthletes(query) {
  state.rosterSearchQuery = query.trim();
  renderRosterAthletesTable();
}

function filterRosterByStatus(status) {
  state.rosterStatusFilter = status;
  document.querySelectorAll("#rosterStatusFilterPills .amp-filter-pill").forEach(p => {
    p.classList.toggle("active", p.dataset.status === status);
  });
  renderRosterAthletesTable();
}

function toggleSelectAllAthletes(checked) {
  let students = state.users.filter(u => u.role === "student");
  if (state.rosterSelectedCohortId !== null) {
    const selGroup = state.groups.find(g => Number(g.id) === Number(state.rosterSelectedCohortId));
    students = students.filter(s => (s.groups || []).some(g =>
      (g.id && Number(g.id) === Number(state.rosterSelectedCohortId)) ||
      (selGroup && g.name && g.name.toLowerCase().trim() === selGroup.name.toLowerCase().trim())
    ));
  }
  if (state.rosterStatusFilter && state.rosterStatusFilter !== "all") {
    students = students.filter(s => (s.status_badge || "Active") === state.rosterStatusFilter);
  }
  if (state.rosterSearchQuery) {
    const q = state.rosterSearchQuery.toLowerCase();
    students = students.filter(s => s.name.toLowerCase().includes(q));
  }

  if (checked) {
    const idsToAdd = students.map(s => s.id);
    state.selectedAthleteIds = Array.from(new Set([...state.selectedAthleteIds, ...idsToAdd]));
  } else {
    const idsToRemove = new Set(students.map(s => s.id));
    state.selectedAthleteIds = state.selectedAthleteIds.filter(id => !idsToRemove.has(id));
  }

  renderRosterAthletesTable();
  updateBatchActionBar();
}

function onAthleteCheckboxChange(athleteId, checked) {
  if (checked) {
    if (!state.selectedAthleteIds.includes(athleteId)) {
      state.selectedAthleteIds.push(athleteId);
    }
  } else {
    state.selectedAthleteIds = state.selectedAthleteIds.filter(id => id !== athleteId);
  }
  updateBatchActionBar();
}

function updateBatchActionBar() {
  const bar = document.getElementById("ampBatchActionBar");
  if (!bar) return;

  const count = state.selectedAthleteIds.length;
  if (count > 0) {
    bar.classList.add("visible");
    const badge = document.getElementById("batchSelectedBadge");
    if (badge) badge.textContent = `${count} Selected`;

    const namesEl = document.getElementById("batchSelectedNames");
    if (namesEl) {
      const selectedUsers = state.users.filter(u => state.selectedAthleteIds.includes(u.id));
      namesEl.textContent = selectedUsers.map(u => u.name).join(", ");
    }

    const select = document.getElementById("batchGroupSelect");
    if (select) {
      select.innerHTML = `<option value="">Move to team...</option>`;
      state.groups.forEach(g => {
        const opt = document.createElement("option");
        opt.value = g.id;
        opt.textContent = g.name;
        select.appendChild(opt);
      });
    }
  } else {
    bar.classList.remove("visible");
  }
}

function clearBatchAthleteSelection() {
  state.selectedAthleteIds = [];
  renderRosterAthletesTable();
  updateBatchActionBar();
}

async function applyBatchGroupAssignment() {
  const select = document.getElementById("batchGroupSelect");
  const groupId = parseInt(select.value);
  if (!groupId) {
    showToast("Choose a team first.");
    return;
  }

  if (state.selectedAthleteIds.length === 0) return;

  try {
    const res = await fetch(`/api/groups/${groupId}/members/batch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_ids: state.selectedAthleteIds })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Failed to batch assign athletes");
    }

    state.selectedAthleteIds = [];
    await refreshData();
    renderRosterView();
  } catch (err) {
    alert("Batch assignment error: " + err.message);
  }
}

async function cycleAthleteStatus(userId, currentStatus) {
  const nextMap = {
    "Active": "Modified",
    "Modified": "Rehab",
    "Rehab": "Active"
  };
  const nextStatus = nextMap[currentStatus] || "Active";

  try {
    const res = await fetch(`/api/users/${userId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status_badge: nextStatus })
    });
    if (!res.ok) throw new Error("Failed to update status");

    const updated = await res.json();
    const localUser = state.users.find(u => u.id === userId);
    if (localUser) localUser.status_badge = updated.status_badge;

    renderRosterAthletesTable();
  } catch (err) {
    console.error("Status update error:", err);
  }
}

function openCreateGroupModal() {
  const modal = document.getElementById("createGroupModal");
  if (modal) modal.classList.add("open");
}

function closeCreateGroupModal() {
  const modal = document.getElementById("createGroupModal");
  if (modal) modal.classList.remove("open");
}

async function submitCreateGroup() {
  const name = document.getElementById("newGroupName").value.trim();
  const desc = document.getElementById("newGroupDesc").value.trim();
  const color = document.getElementById("newGroupColor").value;

  if (!name) {
    showToast("Enter a team name.");
    return;
  }

  try {
    const res = await fetch("/api/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name,
        description: desc,
        color: color,
        coach_id: state.currentUser ? state.currentUser.id : null
      })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Failed to create cohort");
    }
    closeCreateGroupModal();
    document.getElementById("newGroupName").value = "";
    document.getElementById("newGroupDesc").value = "";
    await renderRosterView();
  } catch (err) {
    alert("Error: " + err.message);
  }
}

async function deleteGroup(groupId) {
  if (!confirm("Delete this team? Clients stay in the directory.")) return;
  try {
    const res = await fetch(`/api/groups/${groupId}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete cohort");
    await renderRosterView();
  } catch (err) {
    alert("Error: " + err.message);
  }
}

function openCreateUserModal() {
  const modal = document.getElementById("createUserModal");
  if (!modal) return;
  const grpSelect = document.getElementById("newUserGroupSelect");
  if (grpSelect) {
    grpSelect.innerHTML = `<option value="">(None - Unassigned)</option>`;
    state.groups.forEach(g => {
      const opt = document.createElement("option");
      opt.value = g.id;
      opt.textContent = g.name;
      grpSelect.appendChild(opt);
    });
  }
  modal.classList.add("open");
}

function closeCreateUserModal() {
  const modal = document.getElementById("createUserModal");
  if (modal) modal.classList.remove("open");
}

function onNewUserRoleChanged(role) {
  const sec = document.getElementById("newUserGroupSection");
  if (sec) sec.style.display = (role === "student") ? "block" : "none";
}

async function submitCreateUser() {
  const name = document.getElementById("newUserName").value.trim();
  const email = document.getElementById("newUserEmail").value.trim();
  const role = document.getElementById("newUserRole").value;
  const title = document.getElementById("newUserTitle").value.trim();
  const groupId = document.getElementById("newUserGroupSelect").value;

  if (!name || !email) {
    alert("Please provide both name and email");
    return;
  }

  const colors = ["#ff6105", "#202120", "#3b82f6", "#06b6d4", "#10b981", "#8b5cf6"];
  const randomColor = colors[Math.floor(Math.random() * colors.length)];

  try {
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name,
        email: email,
        role: role,
        title: title || (role === "coach" ? "Coach" : "Athlete"),
        position_tag: title || (role === "coach" ? "Coach" : "Athlete"),
        status_badge: "Active",
        avatar_color: role === "coach" ? "#ff6105" : randomColor
      })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Failed to create user profile");
    }
    const createdUser = await res.json();

    if (groupId && role === "student") {
      await fetch(`/api/groups/${groupId}/members/${createdUser.id}`, { method: "POST" });
    }

    closeCreateUserModal();
    document.getElementById("newUserName").value = "";
    document.getElementById("newUserEmail").value = "";
    document.getElementById("newUserTitle").value = "";

    await refreshData();
    if (state.activeTab === "roster") renderRosterView();
    if (document.getElementById("view-login").style.display === "flex") openLoginOverlay();
  } catch (err) {
    alert("Error: " + err.message);
  }
}

let managingAthleteId = null;

async function openAssignAthleteGroupModal(userId) {
  managingAthleteId = userId;
  const student = state.users.find(u => u.id === userId);
  if (!student) return;

  const modal = document.getElementById("assignAthleteGroupModal");
  if (!modal) return;

  document.getElementById("manageAthleteGroupSubtitle").textContent = `Assign ${student.name} to training cohorts:`;
  const container = document.getElementById("athleteGroupChecklist");
  container.innerHTML = "";

  const studentGroupIds = (student.groups || []).map(g => g.id);

  state.groups.forEach(g => {
    const isChecked = (student.groups || []).some(sg => (sg.id && Number(sg.id) === Number(g.id)) || (sg.name && sg.name.toLowerCase().trim() === g.name.toLowerCase().trim()));
    const row = document.createElement("label");
    row.style.cssText = "display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; background: var(--amp-linen); border: 1px solid var(--amp-hairline); border-radius: var(--amp-radius-card); margin-bottom: 8px; cursor: pointer;";
    row.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="width: 10px; height: 10px; border-radius: 50%; background: ${g.color || 'var(--amp-orange)'};"></span>
        <span style="font-weight: 600; color: var(--amp-ink); font-size: 13.5px;">${g.name}</span>
      </div>
      <input type="checkbox" ${isChecked ? 'checked' : ''} style="width: 18px; height: 18px; accent-color: var(--amp-orange);" onchange="toggleAthleteGroupMembership(${g.id}, this.checked)">
    `;
    container.appendChild(row);
  });

  modal.classList.add("open");
}

function closeAssignAthleteGroupModal() {
  const modal = document.getElementById("assignAthleteGroupModal");
  if (modal) modal.classList.remove("open");
  renderRosterView();
}

async function toggleAthleteGroupMembership(groupId, add) {
  if (!managingAthleteId) return;
  const method = add ? "POST" : "DELETE";
  try {
    await fetch(`/api/groups/${groupId}/members/${managingAthleteId}`, { method: method });
  } catch (err) {
    console.error("Error updating group membership:", err);
  }
}

// =============================================================
// PROGRAM & WORKOUT ASSIGNMENT LOGIC (AMP ARCHITECTURE)
// =============================================================
function setAssignTargetType(type) {
  state.assignTargetType = type;
  const groupBtn = document.getElementById("btnAssignTypeGroup");
  const userBtn = document.getElementById("btnAssignTypeUser");
  if (groupBtn) groupBtn.classList.toggle("active", type === "group");
  if (userBtn) userBtn.classList.toggle("active", type === "user");

  const label = document.getElementById("assignTargetTypeLabel");
  if (label) label.textContent = (type === "group" ? "Team" : "Client");

  populateAssignTargetDropdown();
}

function setAssignWhat(what) {
  state.assignWhat = what === "program" ? "program" : "workout";
  const workoutBtn = document.getElementById("btnAssignWhatWorkout");
  const programBtn = document.getElementById("btnAssignWhatProgram");
  if (workoutBtn) workoutBtn.classList.toggle("active", state.assignWhat === "workout");
  if (programBtn) programBtn.classList.toggle("active", state.assignWhat === "program");

  const workoutField = document.getElementById("assignWorkoutField");
  const programField = document.getElementById("assignProgramField");
  const dateField = document.getElementById("assignDateField");
  const preview = document.getElementById("assignWorkoutPreviewCard");
  if (workoutField) workoutField.style.display = state.assignWhat === "workout" ? "" : "none";
  if (programField) programField.style.display = state.assignWhat === "program" ? "" : "none";
  if (dateField) dateField.style.display = state.assignWhat === "workout" ? "" : "none";
  if (preview && state.assignWhat !== "workout") preview.style.display = "none";

  const submit = document.getElementById("assignSubmitBtn");
  if (submit) submit.textContent = state.assignWhat === "program" ? "Assign program to everyone" : "Assign workout";
}

function setAssignDatePreset(preset) {
  const dateInput = document.getElementById("assignCalendarDate");
  if (!dateInput) return;

  const now = new Date();
  if (preset === "today") {
    dateInput.value = formatLocalIso(now);
  } else if (preset === "tomorrow") {
    const tmrw = new Date();
    tmrw.setDate(tmrw.getDate() + 1);
    dateInput.value = formatLocalIso(tmrw);
  } else if (preset === "next_monday") {
    const mon = new Date();
    const day = mon.getDay();
    const daysUntilNextMonday = ((1 + 7 - day) % 7) || 7;
    mon.setDate(mon.getDate() + daysUntilNextMonday);
    dateInput.value = formatLocalIso(mon);
  }
}

function populateAssignTargetDropdown() {
  const select = document.getElementById("assignTargetSelect");
  if (!select) return;
  select.innerHTML = "";

  if (state.assignTargetType === "group") {
    state.groups.forEach(g => {
      const opt = document.createElement("option");
      opt.value = g.id;
      opt.textContent = `${g.name} (${g.member_count || 0} clients)`;
      select.appendChild(opt);
    });
  } else {
    const students = state.users.filter(u => u.role === "student");
    students.forEach(s => {
      const opt = document.createElement("option");
      opt.value = s.id;
      opt.textContent = `${s.name} (${s.position_tag || s.title || 'Athlete'})`;
      select.appendChild(opt);
    });
  }
}

function onAssignWorkoutChanged(workoutId) {
  const previewCard = document.getElementById("assignWorkoutPreviewCard");
  if (!previewCard) return;

  const wid = parseInt(workoutId);
  const workout = state.workouts.find(w => w.id === wid);

  if (!workout) {
    previewCard.style.display = "none";
    return;
  }

  previewCard.style.display = "block";
  const titleEl = document.getElementById("previewWorkoutTitle");
  if (titleEl) titleEl.textContent = `${workout.title} (${workout.program_name})`;

  const exCount = workout.exercise_count || (workout.exercises ? workout.exercises.length : 0);
  const countEl = document.getElementById("previewWorkoutExercisesCount");
  if (countEl) countEl.textContent = `${exCount} exercises`;

  const sampleEl = document.getElementById("previewWorkoutSample");
  if (sampleEl) {
    if (workout.exercises && workout.exercises.length > 0) {
      const sampleNames = workout.exercises.slice(0, 4).map(we => we.exercise ? we.exercise.name : `Exercise #${we.exercise_id}`).join(", ");
      sampleEl.textContent = `Includes: ${sampleNames}${workout.exercises.length > 4 ? ', ...' : ''}`;
    } else {
      sampleEl.textContent = `Session: ${workout.description || 'Standard programmed training'}`;
    }
  }
}

function populateAssignProgramDropdown() {
  const select = document.getElementById("assignProgramSelect");
  if (!select) return;
  const current = select.value;
  select.innerHTML = `<option value="">Choose a program...</option>`;
  (state.programs || []).forEach(p => {
    const opt = document.createElement("option");
    opt.value = p.program;
    opt.textContent = `${p.program} (${(p.weeks || []).length} wk)`;
    select.appendChild(opt);
  });
  if (current && Array.from(select.options).some(o => o.value === current)) {
    select.value = current;
  }
  onAssignProgramChanged();
}

function onAssignProgramChanged() {
  const programSelect = document.getElementById("assignProgramSelect");
  const weekSelect = document.getElementById("assignProgramWeek");
  if (!programSelect || !weekSelect) return;
  const prog = (state.programs || []).find(p => p.program === programSelect.value);
  const currentWeek = weekSelect.value;
  weekSelect.innerHTML = `<option value="">All weeks</option>`;
  (prog?.weeks || []).forEach(wk => {
    const opt = document.createElement("option");
    opt.value = String(wk);
    opt.textContent = `Week ${wk} only`;
    weekSelect.appendChild(opt);
  });
  if (currentWeek && Array.from(weekSelect.options).some(o => o.value === currentWeek)) {
    weekSelect.value = currentWeek;
  }
}

async function renderAssignmentsView() {
  setAssignTargetType(state.assignTargetType || "group");
  setAssignWhat(state.assignWhat || "workout");
  populateAssignProgramDropdown();

  const wSelect = document.getElementById("assignWorkoutSelect");
  if (wSelect) {
    wSelect.innerHTML = `<option value="">Choose a workout...</option>`;
    state.workouts.forEach(w => {
      const opt = document.createElement("option");
      opt.value = w.id;
      const exCount = w.exercise_count || (w.exercises ? w.exercises.length : 0);
      opt.textContent = `${w.title} (${w.program_name}) — ${exCount} exercises`;
      wSelect.appendChild(opt);
    });
  }

  const datePicker = document.getElementById("assignCalendarDate");
  if (datePicker && !datePicker.value) {
    datePicker.value = getTodayIso();
  }

  const preferredId = state.pendingAssignWorkoutId || (state.workouts[0] && state.workouts[0].id);
  if (preferredId && wSelect && state.assignWhat !== "program") {
    wSelect.value = String(preferredId);
    onAssignWorkoutChanged(preferredId);
  }

  try {
    const res = await fetch("/api/assignments");
    state.assignments = await res.json();
    renderAssignmentsTable();
  } catch (err) {
    console.error("Error loading assignments:", err);
  }
}

function setAssignmentListFilter(scope) {
  state.assignmentListFilter = scope || "all";
  document.querySelectorAll("#assignmentListFilterPills .amp-filter-pill").forEach(p => {
    p.classList.toggle("active", p.dataset.scope === state.assignmentListFilter);
  });
  renderAssignmentsTable();
}

function renderAssignmentsTable() {
  const tableContainer = document.getElementById("assignmentsTableContainer");
  const countBadge = document.getElementById("assignmentsCountBadge");
  const filterInput = document.getElementById("assignmentsFilterInput");
  const filterVal = filterInput ? filterInput.value.toLowerCase().trim() : "";

  if (!tableContainer) return;

  let assignments = state.assignments || [];
  if (state.assignmentListFilter === "team") {
    assignments = assignments.filter(a => a.group_id);
  } else if (state.assignmentListFilter === "client") {
    assignments = assignments.filter(a => a.user_id && !a.group_id);
  }
  if (filterVal) {
    assignments = assignments.filter(a =>
      (a.workout_title && a.workout_title.toLowerCase().includes(filterVal)) ||
      (a.target_name && a.target_name.toLowerCase().includes(filterVal)) ||
      (a.scheduled_date && a.scheduled_date.includes(filterVal)) ||
      (a.notes && a.notes.toLowerCase().includes(filterVal))
    );
  }

  if (countBadge) countBadge.textContent = `${assignments.length} Scheduled`;

  if (assignments.length === 0) {
    tableContainer.innerHTML = `<div style="text-align: center; padding: 48px; color: var(--amp-slate);">No assignments found.</div>`;
    return;
  }

  let html = `
    <table class="athletes-table">
      <thead>
        <tr>
          <th>SCHEDULED DATE</th>
          <th>PROGRAMMED WORKOUT</th>
          <th>ASSIGNED TO</th>
          <th>COACHING CUES / NOTES</th>
          <th style="text-align: right;">ACTION</th>
        </tr>
      </thead>
      <tbody>
  `;

  assignments.forEach(a => {
    const isGroup = !!a.group_id;
    const targetBadge = isGroup
      ? `<span class="cohort-pill-tag">👥 ${a.target_name}</span>`
      : `<span class="cohort-pill-tag" style="background: var(--amp-peach-subtle); border-color: rgba(255,97,5,0.2); color: var(--amp-orange);">👤 ${a.target_name}</span>`;

    html += `
      <tr>
        <td class="sets-tabular-cell" style="color: var(--amp-orange);">${a.scheduled_date}</td>
        <td>
          <div style="font-weight: 600;">${escapeHtml(a.workout_title || "")}</div>
        </td>
        <td>${targetBadge}</td>
        <td style="color: var(--amp-slate); font-size: 13px;">${escapeHtml(a.notes || "—")}</td>
        <td style="text-align: right;">
          <button class="amp-action-chip" style="color: var(--amp-status-modified);" onclick="deleteAssignment(${a.id})" title="Remove Assignment">
            🗑️ Remove
          </button>
        </td>
      </tr>
    `;
  });

  html += `</tbody></table>`;
  tableContainer.innerHTML = html;
}

async function submitCreateAssignment() {
  const targetId = parseInt(document.getElementById("assignTargetSelect").value);
  const notes = document.getElementById("assignNotesInput").value.trim();
  if (!targetId) {
    showToast(state.assignTargetType === "group" ? "Choose a team." : "Choose a client.");
    return;
  }

  const who = {
    assigned_by_coach_id: state.currentUser ? state.currentUser.id : null,
    group_id: state.assignTargetType === "group" ? targetId : null,
    user_id: state.assignTargetType === "user" ? targetId : null,
    notes: notes
  };

  try {
    let res;
    if (state.assignWhat === "program") {
      const programName = document.getElementById("assignProgramSelect").value;
      const weekVal = document.getElementById("assignProgramWeek").value;
      if (!programName) {
        showToast("Choose a program.");
        return;
      }
      res = await fetch("/api/assignments/program", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...who,
          program_name: programName,
          week_number: weekVal ? parseInt(weekVal, 10) : null
        })
      });
    } else {
      const workoutId = parseInt(document.getElementById("assignWorkoutSelect").value);
      const dateVal = document.getElementById("assignCalendarDate").value;
      if (!workoutId || !dateVal) {
        showToast("Choose a workout and a date.");
        return;
      }
      res = await fetch("/api/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...who,
          workout_id: workoutId,
          scheduled_date: dateVal
        })
      });
    }

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Could not assign");
    }
    const created = await res.json();
    document.getElementById("assignNotesInput").value = "";
    state.pendingAssignWorkoutId = null;
    await refreshData();
    await renderAssignmentsView();
    const count = Array.isArray(created) ? created.length : 1;
    showToast(count > 1 ? `Assigned ${count} workouts.` : "Workout assigned.");
  } catch (err) {
    showToast(err.message);
  }
}

async function deleteAssignment(assignmentId) {
  if (!confirm("Are you sure you want to remove this workout assignment?")) return;
  try {
    const res = await fetch(`/api/assignments/${assignmentId}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete assignment");
    await renderAssignmentsView();
  } catch (err) {
    alert("Error: " + err.message);
  }
}
