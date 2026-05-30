# ILES — Internship Logging & Evaluation System

## Setup Instructions

### Backend
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python seed.py
python manage.py runserver
### Frontend (new terminal)
cd frontend
npm install
npm run dev
Open http://localhost:5173

### Login Credentials
- Admin: admin / Admin@1234!
- Student: student1 / Demo@1234!
- Workplace Supervisor: wpsupervisor1 / Demo@1234!
- Academic Supervisor: acsupervisor1 / Demo@1234!
