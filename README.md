# ILES — Internship Logging & Evaluation System

ILES is a comprehensive web application designed to manage, track, and evaluate university student internships. It bridges the gap between students, academic supervisors, workplace supervisors, and university administrators.

---

##Prerequisites

Before running the application locally, ensure you have the following installed on your machine:
- **Python 3.8+**
- **Node.js 18+**
- **npm** (comes with Node.js)
- **Git**

*(SQLite is used for the database by default, so no external database installation is required for local development).*

---

##Setup & Installation Guide

### 1. Backend Setup (Django)

Open a terminal and navigate to the `backend` folder:
```bash
cd backend
```

Create a virtual environment:
```bash
python3 -m venv venv
```

Activate the virtual environment:
- On Linux/macOS:
  ```bash
  source venv/bin/activate
  ```
- On Windows:
  ```bash
  venv\Scripts\activate
  ```

Install Python dependencies:
```bash
pip install -r requirements.txt
```

Run database migrations to create the tables:
```bash
python manage.py migrate
```

Seed the database with initial users and evaluation criteria:
```bash
python seed.py
```

Start the Django development server:
```bash
python manage.py runserver
```
*(The backend will now be running at http://localhost:8000)*

### 2. Frontend Setup (React)

Open a **new terminal window** (keep the backend server running) and navigate to the `frontend` folder:
```bash
cd frontend
```

Install Node.js dependencies:
```bash
npm install
```

Start the Vite development server:
```bash
npm run dev
```
*(The frontend will now be running at http://localhost:5173)*

**Open http://localhost:5173 in your browser to view the application.**

---

## Login Credentials

### Default Seed Accounts
These accounts are automatically created when you run `python seed.py`.

| Role | Username | Password |
|---|---|---|
| **System Admin** | `admin` | `Admin@1234!` |
| **Student** | `student1` | `Demo@1234!` |
| **Workplace Supervisor** | `wpsupervisor1` | `Demo@1234!` |
| **Academic Supervisor** | `acsupervisor1` | `Demo@1234!` |

### Additional Test Accounts
These accounts were added manually to the system. They all use the same password: **`Pass@1234`**

**Students:**
- `aisha.nakato`
- `brian.otieno`
- `cynthia.namukasa`
- `david.mugisha`
- `esther.atim`
- `frank.ssemakula`
- `grace.apio`
- `henry.kato`
- `irene.nankunda`
- `joel.byarugaba`

**Workplace Supervisors:**
- `robert.tumwebaze` (Stanbic Bank Uganda)
- `patricia.nalwoga` (MTN Uganda)

**Academic Supervisors:**
- `james.lwanga` (Makerere University)
- `sarah.nabwire` (Makerere University)

---

##  Testing Guide for Lecturers

To make testing the system as smooth as possible, follow this recommended testing flow:

### 1. Test Administrator Functions
- Log in as the **Admin** (`admin` / `Admin@1234!`).
- Navigate to **Manage Users**: Try editing a user's details, approving a pending supervisor account, or deleting a user.
- Navigate to **Evaluations**: Click the **⚙ Manage Criteria** button to add, edit, or deactivate evaluation criteria.

### 2. Test Student Logging
- Log out, and log in as a **Student** (e.g., `aisha.nakato` / `Pass@1234`).
- Go to the **Weekly Logbook**.
- Add a new log entry for Week 1, detailing activities, challenges, and learnings.
- Submit the log for review.

### 3. Test Supervisor Review
- Log out, and log in as the **Workplace Supervisor** assigned to that student (e.g., `robert.tumwebaze` / `Pass@1234`).
- Go to the **Weekly Logbook**. You should see the student's pending log.
- Approve or Reject the log with a comment.
- Navigate to **Evaluations** and click **+ New Evaluation** to grade the student based on the admin-defined criteria.

### 4. Check Final Grades
- Log back in as the **Student**.
- Check the Dashboard or the Evaluations tab to see your final score and the detailed feedback left by your supervisors.
