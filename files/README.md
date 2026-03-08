# EduManage Pro 🎓

Full-stack exam management system with Flask backend + React frontend.

## Architecture

```
edumanage/
├── backend/
│   ├── app.py          # Flask REST API (port 18080)
│   ├── store.json      # Local JSON data store (DB)
│   └── requirements.txt
└── frontend/
    ├── src/
│   │   ├── App.jsx     # Complete SPA (Dashboard, Students, Grading, Reports)
│   │   ├── main.jsx
│   │   └── index.css
    ├── index.html
    ├── package.json
    ├── vite.config.js
    └── tailwind.config.js
```

## Quick Start

### 1. Backend (Flask)
```bash
cd backend
pip install -r requirements.txt
python app.py
# Runs on http://localhost:18080
```

### 2. Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev
# Runs on http://localhost:3000
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/dashboard` | Dashboard stats |
| GET/POST | `/api/students` | List / Create students |
| GET/PUT/DELETE | `/api/students/:id` | Get / Update / Delete student |
| GET/POST | `/api/subjects` | List / Create subjects |
| DELETE | `/api/subjects/:id` | Delete subject |
| GET/POST | `/api/grades` | List (filterable) / Create grades |
| PUT/DELETE | `/api/grades/:id` | Update / Delete grade |
| POST | `/api/evaluate-score` | Preview rubric for a score |
| GET | `/api/reports/student/:id` | Student performance report |
| GET | `/api/reports/subject/:id` | Subject performance report |

## Grading Rubric

| Score | Rubric | Points | Comment |
|-------|--------|--------|---------|
| 90–99 | EE 1 – Exceeding Expectation 1 | 8 | Exceptional performance |
| 75–89 | EE 2 – Exceeding Expectation 2 | 7 | Very good performance |
| 58–74 | ME 1 – Meeting Expectation 1 | 6 | Good performance |
| 41–57 | ME 2 – Meeting Expectation 2 | 5 | Fair performance |
| 31–40 | AE 1 – Approaching Expectation 1 | 4 | Needs improvement |
| 21–30 | AE 2 – Approaching Expectation 2 | 3 | Below average |
| 11–20 | BE 1 – Below Expectation 1 | 2 | Well below average |
| 01–10 | BE 2 – Below Expectation 2 | 1 | Minimal performance |

## Data Schema (store.json)

```json
{
  "students": [{"id": "UUID", "name": "String", "grade": "String", "email": "String"}],
  "subjects": [{"id": "String", "name": "String", "rubric": "String"}],
  "grades": [{"id": "UUID", "studentId": "UUID", "subjectId": "String", "score": 0-100, "comment": "String", "date": "YYYY-MM-DD"}]
}
```
