# wourkout

A workout-programming app for athletic trainers and personal trainers. Build a calendar of dated workouts, put athletes on it, and they follow it live. Groups hold the roster and join codes; calendars hold the programming. Built with **FastAPI**, **SQLAlchemy**, and a touch-friendly web UI. Runs locally and can deploy to **Google Cloud Run** with **Cloud SQL** or **Supabase**.

---

## 🚀 Quick Access (Tailscale)

When running locally, access the app from any device on your Tailnet (e.g., iPhone, iPad, Android, Mac):

👉 **[http://100.80.166.28:8000](http://100.80.166.28:8000)**

---

## 🏆 Key Features

### 1. Strength Coach Experience
* **Live Compliance Dashboard:**
  * Real-time KPI summary: Total Prescribed Athletes, Completed, In-Progress, Missed/Not Started, and **Compliance Percentage**.
  * Dynamic date navigation to review athlete completion for any calendar date.
  * Live athlete activity feed with status badges, set completion ratios, and completion timestamps.
  * **Inspect Logged Sets Drawer:** Click into any athlete's session to view their exact logged weights and reps per set.
  * **"Preview as Athlete" Mode:** 1-click preview mode allowing coaches to experience the app through any athlete's eyes without logging out.
* **Roster & Cohort Management:**
  * Organize athletes into training groups (e.g. *Varsity Strength Cohort*, *Speed & Agility Track*, *Personal Training (1-on-1)*).
  * Assign / remove athletes from groups with instant UI updates.
  * Register new athletes and coaches.
* **Calendars:**
  * A calendar is a named programme of dated workouts. Every athlete starts on a personal calendar named after them; a coach can move any athlete onto a shared calendar from Manage Calendars, Manage Users, or the Athletes tab.
  * An athlete follows exactly one calendar at a time and sees it live, so an edit to the calendar reaches everyone on it. Set logs stay per athlete.
  * A calendar can be renamed or deleted once nobody follows it.
* **Programming builder (phases):**
  * From the Build calendar's left rail, drag across a small calendar of empty day boxes to group days or weeks into a phase, then name it, colour it, and add notes.
  * A phase tints the week banners it covers and shows its notes above each of those weeks' own notes. Phases are per calendar and coaches only.
* **Chains:**
  * Clicking a chain on a day opens every exercise in it, with sets and reps, time, or distance editable in place for that day.
  * A saved chain can set reps, time, or distance per exercise.
* **Questions and questionnaires:**
  * Write a question once and pick how it is answered: a 1-10 scale, yes/no, or free text.
  * A questionnaire is a string of those questions, built the way a chain is built from exercises. Athletes answer each one in Workout Entry.
* **Workout Assignment Manager:**
  * Assign workouts to a calendar or 1-on-1 to individual athletes on specific calendar dates.
  * Add custom coaching instructions and session notes.
  * Real-time management table with 1-click unassign.
* **Workout Planner & Builder:**
  * **Single Workout Builder:** Prescribe exercises with superset groupings (A1, A2, B1, etc.), sets, reps, weight prescriptions, tempo/coaching cues, and briefing videos.
  * **Multi-Day Week Planner:** Schedule workouts across Monday–Sunday with weekend support.
  * **Bulk Copy:** Effortlessly duplicate an entire week's program into future weeks.
  * **Program Templates:** Save and load full weekly training templates.
  * **Edit Workout Sub-tab:** Modify existing workouts and update exercise parameters.

### 2. Athlete / Student Experience
* **Focused Daily View:** Athletes exclusively see workouts prescribed to them or their training cohort for the selected date.
* **Interactive Set Logging:** Real-time logging of weight and reps per set with auto-save and completion checkmarks.
* **Integrated Rest Timer:** Built-in countdown timer with sound chimes and quick-select presets (60s, 90s, 120s, etc.).
* **Video Demonstrations:** Movement titles overlaid on preview thumbnails linking to exercise explainer videos.
* **Personal Calendar:** Month-at-a-glance view showing their assigned workouts with green completion checkmarks.
* **Read-Only Protection:** Coaching administrative actions and edit buttons are automatically hidden in student mode.

### 3. Role Switcher & Mock Auth
* **1-Click Profile Switching:** Top-right user avatar lets you instantly toggle between coach profiles (e.g., *Coach Nishaan*) and various athlete profiles (*Alex Rivera*, *Maya Lin*, *Chris Evans*, etc.) for rapid testing.

---

## 🏗️ Architecture & Cloud Portability

The platform was built from the ground up for zero-friction transition between local SQLite and production cloud databases:

```
                  ┌───────────────────────────────────────────────┐
                  │           Google Cloud Run Container          │
                  │  (uvicorn app.main:app --port $PORT)          │
                  │                                               │
                  │  ┌───────────────┐     ┌───────────────────┐  │
Tailscale / Web ──┼─>│ FastAPI API   │<───>│ Responsive HTML5  │  │
                  │  │ (REST Routes) │     │ (wourkout UI)     │  │
                  │  └───────┬───────┘     └───────────────────┘  │
                  └──────────┼────────────────────────────────────┘
                             │
            ┌────────────────┴────────────────┐
            ▼                                 ▼
   Local Development:                Production Cloud:
   SQLite File (workout.db)          Google Cloud SQL / Supabase (PostgreSQL)
```

* **Database Abstraction:** Built on SQLAlchemy ORM. Configure `DATABASE_URL` to connect to PostgreSQL (e.g. Google Cloud SQL or Supabase) without code changes.
* **Stateless Container:** All session data, compliance reports, and workout logs persist in the database.
* **Cloud Run Port Compatibility:** Listens on `$PORT` (default 8000, automatically mapped to 8080 by Cloud Run).

---

## ☁️ Deployment Guide (Google Cloud Run & Cloud SQL)

### Step 1: Create a Google Cloud SQL (PostgreSQL) Instance
```bash
# 1. Create a PostgreSQL instance (f1-micro is free-tier eligible)
gcloud sql instances create workout-db \
    --database-version=POSTGRES_15 \
    --tier=db-f1-micro \
    --region=us-central1

# 2. Create the database and user
gcloud sql databases create workout_db --instance=workout-db
gcloud sql users create workout_user --instance=workout-db --password='YOUR_SECURE_PASSWORD'
```

### Step 2: Build & Push Container Image
```bash
gcloud auth configure-docker us-central1-docker.pkg.dev

gcloud builds submit --tag us-central1-docker.pkg.dev/YOUR_PROJECT_ID/workout-repo/workout-app:v1
```

### Step 3: Deploy to Cloud Run
```bash
gcloud run deploy workout-app \
    --image=us-central1-docker.pkg.dev/YOUR_PROJECT_ID/workout-repo/workout-app:v1 \
    --region=us-central1 \
    --platform=managed \
    --allow-unauthenticated \
    --add-cloudsql-instances=YOUR_PROJECT_ID:us-central1:workout-db \
    --set-env-vars="DATABASE_URL=postgresql+psycopg2://workout_user:YOUR_SECURE_PASSWORD@/workout_db?host=/cloudsql/YOUR_PROJECT_ID:us-central1:workout-db"
```

---

## 🛠️ Local Development

### Prerequisites
* Python 3.10+
* SQLite 3

### Installation & Running
```bash
# Install dependencies
pip install -r requirements.txt

# Start local server
./run.sh

# Or start directly with uvicorn
python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

---

## 📄 License
MIT License.
