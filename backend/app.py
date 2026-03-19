"""
EduManage Pro - Flask Backend
RESTful API serving on port 18080 with local store.json persistence
"""

import json
import uuid
import os
import sys
try:
    import fcntl
except ImportError:
    fcntl = None  # Windows doesn't have fcntl
from datetime import date, datetime, timedelta
from functools import wraps

import jwt
from flask import Flask, jsonify, request, g, make_response
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash

# Initialize Flask-SQLAlchemy
db = SQLAlchemy()

# Import database functions (use aliases to avoid name conflicts)
from database import get_db, get_all_students as db_get_all_students, get_subjects as db_get_subjects, get_subject_by_id as db_get_subject_by_id, create_subject as db_create_subject, update_subject as db_update_subject, delete_subject as db_delete_subject

# Import parser for file uploads
from import_parser import parse_import_file, validate_and_process

# Import CBC analysis engine
from cbc_analysis import (
    generate_cbc_report,
    calculate_subject_mean_points,
    calculate_stream_variance,
    calculate_value_add,
    calculate_pass_rate,
    get_competency
)

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')

# Configure CORS - allow frontend domain
CORS(app, resources={
    r"/*": {
        "origins": [
            "https://edumanage-pro-tassia-school-1.onrender.com",
            "http://localhost:3000",
            "http://localhost:3001",
            "http://localhost:18080"
        ],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
}, supports_credentials=True)

# Configure SQLAlchemy database
DATABASE_URL = os.environ.get('DATABASE_URL')
if not DATABASE_URL:
    # Use SQLite for local development if no PostgreSQL URL provided
    # Use absolute path to ensure consistency with database.py
    import pathlib
    db_path = pathlib.Path(__file__).parent.resolve() / 'edumanage.db'
    DATABASE_URL = f'sqlite:///{db_path}'
    print(f"Using database: {DATABASE_URL}")
else:
    # Fix for Railway's postgres:// prefix (SQLAlchemy needs postgresql://)
    DATABASE_URL = DATABASE_URL.replace('postgres://', 'postgresql://', 1)
    
app.config['SQLALCHEMY_DATABASE_URI'] = DATABASE_URL
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
    'pool_size': 20,
    'max_overflow': 30,
    'pool_pre_ping': True,
    'pool_recycle': 3600
}

# Initialize Flask-SQLAlchemy with the app
db.init_app(app)

# Import database module for models
import database
from database import SessionLocal, Base

# Create all database tables using Flask-SQLAlchemy
with app.app_context():
    # Use the Base from database.py to create tables since models are there
    Base.metadata.create_all(bind=db.engine)
    print('Database connection verified with pre-ping')

# Ensure exam instances exist in database
with app.app_context():
    try:
        # Create default exam instance if none exists
        exams = database.get_exam_instances(db.session)
        if not exams:
            exam = database.create_exam_instance(db.session, {
                "id": "exam-001",
                "name": "Term 1 Final Exam, 2025"
            })
            db.session.commit()
            app.logger.info("Created default exam instance")
        
        # Create default subjects if none exist
        subjects = database.get_subjects(db.session)
        if not subjects:
            default_subjects = [
                {"id": "sub-001", "name": "Mathematics", "rubric": "Standard Math Rubric"},
                {"id": "sub-002", "name": "English", "rubric": "Language Arts Rubric"},
                {"id": "sub-004", "name": "Kiswahili", "rubric": ""},
                {"id": "sub-005", "name": "Integrated Science", "rubric": ""},
                {"id": "sub-french", "name": "French", "rubric": "French Language Rubric"}
            ]
            for sub in default_subjects:
                database.create_subject(db.session, sub)
            db.session.commit()
            app.logger.info("Created default subjects")
        else:
            # Ensure French subject exists - check by both name and ID
            french_exists = any(s.name == "French" or s.id == "sub-french" for s in subjects)
            if not french_exists:
                try:
                    french_subject = database.create_subject(db.session, {
                        "id": "sub-french",
                        "name": "French",
                        "rubric": "French Language Rubric"
                    })
                    db.session.commit()
                    app.logger.info("Added French subject")
                except Exception as e:
                    db.session.rollback()
                    # Check if it's a duplicate key error (already exists) - this is OK
                    if "duplicate key" in str(e).lower() or "uniqueviolation" in str(e).lower():
                        app.logger.info("French subject already exists (caught by duplicate key)")
                    else:
                        app.logger.warning(f"Error adding French subject: {e}")
        
        # Create default student if none exist
        students = database.get_students(db.session)
        if not students:
            default_student = database.create_student(db.session, {
                "id": "student-001",
                "name": "Test Student",
                "class_id": ""
            })
            db.session.commit()
            app.logger.info("Created default student")
    except Exception as e:
        app.logger.error(f"Error initializing database: {e}")
        db.session.rollback()

STORE_PATH = os.path.join(os.path.dirname(__file__), "store.json")


# ─────────────────────────────────────────────
# DATA LAYER
# ─────────────────────────────────────────────

def read_store() -> dict:
    with open(STORE_PATH, "r") as f:
        if fcntl:
            fcntl.flock(f, fcntl.LOCK_SH)
            try:
                return json.load(f)
            finally:
                fcntl.flock(f, fcntl.LOCK_UN)
        return json.load(f)


def write_store(data: dict) -> None:
    with open(STORE_PATH, "r+") as f:
        if fcntl:
            fcntl.flock(f, fcntl.LOCK_EX)
            try:
                f.seek(0)
                json.dump(data, f, indent=2)
                f.flush()
                os.fsync(f.fileno())
                f.truncate()
            finally:
                fcntl.flock(f, fcntl.LOCK_UN)
        else:
            f.seek(0)
            json.dump(data, f, indent=2)
            f.flush()
            os.fsync(f.fileno())
            f.truncate()


# ─────────────────────────────────────────────
# GRADING UTILITY
# ─────────────────────────────────────────────

def evaluate_score(score: int) -> dict:
    """
    Maps a numerical score (0-100) to rubric, points, and comment.
    Returns a dict with keys: rubric, points, comment.
    Raises ValueError for out-of-range input.
    """
    if not isinstance(score, int) or score < 0 or score > 100:
        raise ValueError("Score must be an integer between 0 and 100 inclusive.")

    if 90 <= score <= 99:
        return {"rubric": "Exceeding Expectation 1 (EE 1)", "points": 8, "comment": "Exceptional performance"}
    elif 75 <= score <= 89:
        return {"rubric": "Exceeding Expectation 2 (EE 2)", "points": 7, "comment": "Very good performance"}
    elif 58 <= score <= 74:
        return {"rubric": "Meeting Expectation 1 (ME 1)", "points": 6, "comment": "Good performance"}
    elif 41 <= score <= 57:
        return {"rubric": "Meeting Expectation 2 (ME 2)", "points": 5, "comment": "Fair performance"}
    elif 31 <= score <= 40:
        return {"rubric": "Approaching Expectation 1 (AE 1)", "points": 4, "comment": "Needs improvement"}
    elif 21 <= score <= 30:
        return {"rubric": "Approaching Expectation 2 (AE 2)", "points": 3, "comment": "Below average"}
    elif 11 <= score <= 20:
        return {"rubric": "Below Expectation 1 (BE 1)", "points": 2, "comment": "Well below average"}
    elif 1 <= score <= 10:
        return {"rubric": "Below Expectation 2 (BE 2)", "points": 1, "comment": "Minimal performance"}
    elif score == 0:
        return {"rubric": "Below Expectation 2 (BE 2)", "points": 0, "comment": "No performance recorded"}
    elif score == 100:
        return {"rubric": "Exceeding Expectation 1 (EE 1)", "points": 8, "comment": "Perfect score - Exceptional performance"}
    else:
        raise ValueError(f"Unhandled score value: {score}")


# ─────────────────────────────────────────────
# AUTH DECORATORS
# ─────────────────────────────────────────────

def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.cookies.get('token')
        app.logger.info(f"login_required check - token present: {bool(token)}")
        if not token:
            app.logger.info("login_required - no token found")
            return jsonify({"error": "Authentication required"}), 401
        try:
            payload = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
            app.logger.info(f"login_required - token decoded successfully, user_id: {payload.get('user_id')}")
        except jwt.ExpiredSignatureError:
            app.logger.info("login_required - token expired")
            return jsonify({"error": "Token expired"}), 401
        except jwt.InvalidTokenError as e:
            app.logger.info(f"login_required - invalid token: {e}")
            return jsonify({"error": "Invalid token"}), 401

        # First check store.json for legacy users
        store = read_store()
        user = next((u for u in store.get("users", []) if u["id"] == payload["user_id"]), None)
        
        # If not found in store.json, check SQL database
        if not user:
            db = SessionLocal()
            try:
                db_user = database.get_user_by_id(db, payload["user_id"])
                if db_user:
                    user = {
                        "id": db_user.id,
                        "username": db_user.username,
                        "role": db_user.role,
                        "assignedSubjects": db_user.assigned_subjects.split(",") if db_user.assigned_subjects else [],
                        "assignedClasses": db_user.assigned_classes.split(",") if db_user.assigned_classes else []
                    }
            finally:
                db.close()
        
        if not user:
            return jsonify({"error": "User not found"}), 401
        g.current_user = user
        return f(*args, **kwargs)
    return decorated


def admin_only(f):
    @wraps(f)
    @login_required
    def decorated(*args, **kwargs):
        if g.current_user["role"] != "Admin":
            return jsonify({"error": "Admin access required"}), 403
        return f(*args, **kwargs)
    return decorated


def teacher_or_admin(f):
    @wraps(f)
    @login_required
    def decorated(*args, **kwargs):
        if g.current_user["role"] not in ("Teacher", "Admin"):
            return jsonify({"error": "Teacher or Admin access required"}), 403
        return f(*args, **kwargs)
    return decorated


# ─────────────────────────────────────────────
# AUTH ENDPOINTS
# ─────────────────────────────────────────────

@app.route("/api/auth/login", methods=["POST"])
def login():
    data = request.get_json()
    if not data or not all(k in data for k in ["username", "password"]):
        return jsonify({"error": "username and password are required"}), 400

    app.logger.info(f"Login attempt for username: {data['username']}")
    
    # First check store.json for legacy users
    store = read_store()
    user = next((u for u in store.get("users", []) if u["username"] == data["username"]), None)
    
    # If not found in store.json, check SQL database
    if not user:
        db = SessionLocal()
        try:
            app.logger.info(f"User not in store.json, checking database for: {data['username']}")
            db_user = database.get_user_by_username(db, data["username"])
            if db_user:
                app.logger.info(f"Found user in database: {db_user.id}, role: {db_user.role}")
                user = {
                    "id": db_user.id,
                    "username": db_user.username,
                    "passwordHash": db_user.password_hash,
                    "role": db_user.role,
                    "assignedSubjects": db_user.assigned_subjects.split(",") if db_user.assigned_subjects else [],
                    "assignedClasses": db_user.assigned_classes.split(",") if db_user.assigned_classes else []
                }
            else:
                app.logger.warning(f"User not found in database either: {data['username']}")
        except Exception as e:
            app.logger.error(f"Database error during login: {e}")
            return jsonify({"error": "Login failed. Please try again."}), 500
        finally:
            db.close()
    else:
        app.logger.info(f"Found user in store.json: {user['username']}")
    
    if not user or not check_password_hash(user["passwordHash"], data["password"]):
        return jsonify({"error": "Invalid credentials"}), 401

    payload = {
        "user_id": user["id"],
        "role": user["role"],
        "exp": datetime.utcnow() + timedelta(hours=8)
    }
    token = jwt.encode(payload, app.config['SECRET_KEY'], algorithm='HS256')

    resp = make_response(jsonify({
        "user": {
            "id": user["id"],
            "username": user["username"],
            "role": user["role"],
            "assignedSubjects": user.get("assignedSubjects", []),
            "assignedClasses": user.get("assignedClasses", [])
        }
    }))
    # For production on Render with HTTPS, use secure cookies
    # Check if we're in production by checking for RENDER_FRONTEND_URL
    is_production = bool(os.environ.get('RENDER_FRONTEND_URL'))
    app.logger.info(f"Login success - is_production: {is_production}, setting cookie with samesite={'None' if is_production else 'Lax'}")
    resp.set_cookie('token', token, httponly=True, samesite='None' if is_production else 'Lax', secure=is_production, max_age=28800)
    return resp


@app.route("/api/auth/logout", methods=["POST"])
def logout():
    # Add diagnostic logging
    app.logger.info(f"Logout request - cookies: {request.cookies.get('token', 'NOT_FOUND')}")
    resp = make_response(jsonify({"message": "Logged out"}))
    # Delete cookie with same attributes as when it was set
    is_production = bool(os.environ.get('RENDER_FRONTEND_URL'))
    resp.delete_cookie('token', path='/', samesite='None' if is_production else 'Lax', secure=is_production)
    app.logger.info(f"Logout response - cookies after delete: {resp.cookies}")
    return resp


@app.route("/api/auth/me", methods=["GET"])
@login_required
def me():
    u = g.current_user
    app.logger.info(f"Auth /me - returning user: {u['username']} (id: {u['id']}, role: {u['role']})")
    return jsonify({
        "user": {
            "id": u["id"],
            "username": u["username"],
            "role": u["role"],
            "assignedSubjects": u.get("assignedSubjects", []),
            "assignedClasses": u.get("assignedClasses", [])
        }
    })


# ─────────────────────────────────────────────
# HEALTH CHECK
# ─────────────────────────────────────────────

@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "service": "EduManage Pro API"})


# ─────────────────────────────────────────────
# DASHBOARD
# ─────────────────────────────────────────────

@app.route("/api/dashboard/summary", methods=["GET"])
@app.route("/api/dashboard", methods=["GET"])
@login_required
def dashboard():
    # Use SQL database instead of JSON store
    db = SessionLocal()
    try:
        students = database.get_students(db)
        grades = database.get_grades(db)
        subjects = database.get_subjects(db)
        classes = database.get_classes(db)
        
        # Convert to dict format for consistent processing
        students = [s.to_dict() for s in students]
        grades = [g.to_dict() for g in grades]
        subjects = [s.to_dict() for s in subjects]
        classes = [c.to_dict() for c in classes]
    finally:
        db.close()
    
    # Get current user info for filtering
    current_user = g.current_user
    user_role = current_user.get("role", "Admin")
    assigned_subjects = current_user.get("assignedSubjects", [])
    assigned_classes = current_user.get("assignedClasses", [])
    
    # Filter data based on user's role and assignments
    if user_role == "Teacher" and assigned_subjects:
        # Filter grades to only include assigned subjects
        filtered_grades = [grade for grade in grades if grade.get("subjectId") in assigned_subjects]
        # Filter students to only those in assigned classes or with grades in assigned subjects
        student_ids_with_filtered_grades = set(grade.get("studentId") for grade in filtered_grades)
        filtered_students = [s for s in students if s.get("classId") in assigned_classes or s["id"] in student_ids_with_filtered_grades]
        # Filter subjects to only assigned subjects
        filtered_subjects = [s for s in subjects if s["id"] in assigned_subjects]
    else:
        # Admin sees all data
        filtered_grades = grades
        filtered_students = students
        filtered_subjects = subjects

    total_students = len(filtered_students)
    total_grades_entered = len(filtered_grades)
    avg_score = round(sum(grade["score"] for grade in filtered_grades) / len(filtered_grades), 1) if filtered_grades else 0

    # Grade distribution
    distribution = {"EE": 0, "ME": 0, "AE": 0, "BE": 0}
    for grade in filtered_grades:
        ev = evaluate_score(grade["score"])
        rubric = ev["rubric"]
        if "EE" in rubric:
            distribution["EE"] += 1
        elif "ME" in rubric:
            distribution["ME"] += 1
        elif "AE" in rubric:
            distribution["AE"] += 1
        else:
            distribution["BE"] += 1

    # Subject averages (only for assigned subjects if teacher)
    subject_avgs = []
    for sub in filtered_subjects:
        sub_grades = [grade["score"] for grade in filtered_grades if grade.get("subjectId") == sub["id"]]
        avg = round(sum(sub_grades) / len(sub_grades), 1) if sub_grades else 0
        subject_avgs.append({"subject": sub["name"], "average": avg, "count": len(sub_grades)})

    # Top performers (only from filtered students)
    student_avgs = []
    for s in filtered_students:
        s_grades = [grade["score"] for grade in filtered_grades if grade.get("studentId") == s["id"]]
        if s_grades:
            avg = round(sum(s_grades) / len(s_grades), 1)
            # Get class name from classId
            class_name = ""
            if s.get("classId"):
                cls = next((c for c in classes if c["id"] == s["classId"]), None)
                class_name = cls["name"] if cls else ""
            student_avgs.append({"id": s["id"], "name": s["name"], "class": class_name, "average": avg})
    top_performers = sorted(student_avgs, key=lambda x: x["average"], reverse=True)[:5]

    return jsonify({
        "totalStudents": total_students,
        "totalGradesEntered": total_grades_entered,
        "averageScore": avg_score,
        "totalSubjects": len(filtered_subjects),
        "gradeDistribution": distribution,
        "subjectAverages": subject_avgs,
        "topPerformers": top_performers
    })


# ─────────────────────────────────────────────
# STUDENTS
# ─────────────────────────────────────────────

@app.route("/api/students", methods=["GET"])
@login_required
def get_students():
    # Use Flask-SQLAlchemy session for consistency
    try:
        students = database.get_students(db.session)
        classes = database.get_classes(db.session)
        class_map = {c.id: c.to_dict() for c in classes}
        result = []
        for student in students:
            student_dict = student.to_dict()
            class_id = student_dict.get('classId')
            if class_id and class_id in class_map:
                student_dict['class'] = class_map[class_id]
            result.append(student_dict)
        return jsonify(result)
    except Exception as e:
        app.logger.error(f"Error getting students: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/students", methods=["POST"])
@admin_only
def create_student():
    data = request.get_json()
    if not data or not data.get("name"):
        return jsonify({"error": "name is required"}), 400

    student_data = {
        "id": str(uuid.uuid4()),
        "name": data["name"].strip(),
        "class_id": data.get("classId") or ""
    }
    
    db = SessionLocal()
    try:
        student = database.create_student(db, student_data)
        result = student.to_dict()
        # Add class info to response
        if result.get("classId"):
            class_obj = database.get_class_by_id(db, result["classId"])
            if class_obj:
                result["class"] = class_obj.to_dict()
        return jsonify(result), 201
    finally:
        db.close()


@app.route("/api/students/<student_id>", methods=["GET"])
@login_required
def get_student(student_id):
    db = SessionLocal()
    try:
        student = database.get_student_by_id(db, student_id)
        if not student:
            return jsonify({"error": "Student not found"}), 404
        result = student.to_dict()
        # Add class info
        if result.get("classId"):
            class_obj = database.get_class_by_id(db, result["classId"])
            if class_obj:
                result["class"] = class_obj.to_dict()
        return jsonify(result)
    finally:
        db.close()


@app.route("/api/students/<student_id>", methods=["PUT"])
@admin_only
def update_student(student_id):
    data = request.get_json()
    
    # Convert classId to class_id for database
    update_data = {}
    for field in ["name"]:
        if field in data:
            update_data[field] = data[field].strip()
    # Handle classId - can be set to None to unassign
    if "classId" in data:
        update_data["class_id"] = data["classId"] or ""
    
    db = SessionLocal()
    try:
        student = database.update_student(db, student_id, update_data)
        if not student:
            return jsonify({"error": "Student not found"}), 404
        result = student.to_dict()
        # Add class info
        if result.get("classId"):
            class_obj = database.get_class_by_id(db, result["classId"])
            if class_obj:
                result["class"] = class_obj.to_dict()
        return jsonify(result)
    finally:
        db.close()


@app.route("/api/students/<student_id>", methods=["DELETE"])
@teacher_or_admin
def delete_student(student_id):
    db = SessionLocal()
    try:
        student = database.get_student_by_id(db, student_id)
        if not student:
            return jsonify({"error": "Student not found"}), 404
        # Also delete grades for this student
        grades = database.get_grades_by_student(db, student_id)
        for grade in grades:
            database.delete_grade(db, grade.id)
        # Delete the student
        database.delete_student(db, student_id)
        return jsonify({"message": "Student deleted successfully"})
    finally:
        db.close()


# PUT /api/students/<student_id>/class - Assign student to class
@app.route("/api/students/<student_id>/class", methods=["PUT"])
@admin_only
def assign_student_class(student_id):
    data = request.get_json()
    db = SessionLocal()
    try:
        student = database.get_student_by_id(db, student_id)
        if not student:
            return jsonify({"error": "Student not found"}), 404
        # Update class ID
        student.class_id = data.get("classId") or None
        db.commit()
        return jsonify(student.to_dict())
    finally:
        db.close()


# ─────────────────────────────────────────────
# CLASSES
# ─────────────────────────────────────────────

@app.route("/api/classes", methods=["GET"])
@teacher_or_admin
def get_classes():
    db = SessionLocal()
    try:
        classes = database.get_classes(db)
        students = database.get_students(db)
        result = []
        for cls in classes:
            cls_dict = cls.to_dict()
            cls_dict["studentCount"] = sum(1 for s in students if s.class_id == cls.id)
            result.append(cls_dict)
        return jsonify(result)
    finally:
        db.close()


@app.route("/api/classes", methods=["POST"])
@admin_only
def create_class():
    data = request.get_json()
    class_data = {
        "id": f"class-{uuid.uuid4().hex[:6]}",
        "name": data.get("name"),
        "academic_year": data.get("academicYear") or "",
        "subjects": ",".join(data.get("subjects", []))  # Convert list to comma-separated
    }
    db = SessionLocal()
    try:
        new_class = database.create_class(db, class_data)
        return jsonify(new_class.to_dict()), 201
    finally:
        db.close()


@app.route("/api/classes/<class_id>", methods=["PUT"])
@admin_only
def update_class(class_id):
    data = request.get_json()
    db = SessionLocal()
    try:
        cls = database.get_class_by_id(db, class_id)
        if not cls:
            return jsonify({"error": "Class not found"}), 404
        cls.name = data.get("name", cls.name)
        cls.academic_year = data.get("academicYear", cls.academic_year)
        if "subjects" in data:
            cls.subjects = ",".join(data["subjects"])
        db.commit()
        return jsonify(cls.to_dict())
    finally:
        db.close()


@app.route("/api/classes/<class_id>", methods=["DELETE"])
@teacher_or_admin
def delete_class(class_id):
    db = SessionLocal()
    try:
        # First unlink students from this class
        students = database.get_students(db)
        for student in students:
            if student.class_id == class_id:
                student.class_id = None
        db.commit()
        
        # Delete the class
        cls = database.get_class_by_id(db, class_id)
        if not cls:
            return jsonify({"error": "Class not found"}), 404
        database.delete_class(db, class_id)
        return jsonify({"message": "Class deleted"})
    finally:
        db.close()


@app.route("/api/classes/<class_id>/students", methods=["GET"])
@teacher_or_admin
def get_class_students(class_id):
    # Use database instead of store.json for consistency
    db = SessionLocal()
    try:
        students = database.get_students_by_class(db, class_id)
        return jsonify([s.to_dict() for s in students])
    finally:
        db.close()


# ─────────────────────────────────────────────
# STUDENT IMPORT
# ─────────────────────────────────────────────

@app.route("/api/students/import/parse", methods=["POST"])
@admin_only
def parse_student_import():
    """
    Parse an uploaded file and extract student names
    Supports .xlsx and .docx files
    Returns list of extracted names with validation results
    """
    if 'file' not in request.files:
        return jsonify({"error": "No file provided"}), 400
    
    file = request.files['file']
    if not file.filename:
        return jsonify({"error": "No file selected"}), 400
    
    # Validate file type
    allowed_extensions = {'xlsx', 'docx'}
    ext = file.filename.lower().split('.')[-1]
    if ext not in allowed_extensions:
        return jsonify({"error": f"Invalid file type. Supported: {', '.join(allowed_extensions)}"}), 400
    
    try:
        file_content = file.read()
        
        # Parse the file
        students, error = parse_import_file(file_content, file.filename)
        
        if error:
            return jsonify({"error": error}), 400
        
        # Get existing students for duplicate checking
        db = SessionLocal()
        try:
            existing_students = db_get_all_students(db)
            existing_names = [s.name for s in existing_students]
        finally:
            db.close()
        
        # Validate and process
        valid_students, duplicates, invalid_count = validate_and_process(students, existing_names)
        
        return jsonify({
            "total_extracted": len(students),
            "valid_students": valid_students,
            "duplicates": duplicates,
            "invalid_count": invalid_count,
            "message": f"Found {len(students)} names. {len(valid_students)} valid, {len(duplicates)} duplicates, {invalid_count} invalid."
        })
        
    except Exception as e:
        return jsonify({"error": f"Error processing file: {str(e)}"}), 500


@app.route("/api/students/import/process", methods=["POST"])
@admin_only
def process_student_import():
    """
    Process validated student names and create them in the database
    """
    data = request.get_json()
    
    if not data or 'students' not in data:
        return jsonify({"error": "No students provided"}), 400
    
    students_to_create = data['students']
    class_id = data.get('classId')  # Optional class assignment
    
    if not students_to_create:
        return jsonify({"error": "No students to import"}), 400
    
    # Import the Student model directly
    from database import Student
    
    created = []
    errors = []
    
    try:
        for name in students_to_create:
            try:
                # Generate student ID
                student_id = f"s-{uuid.uuid4().hex[:8]}"
                
                # Create student using Flask-SQLAlchemy session directly
                student = Student(
                    id=student_id,
                    name=name,
                    class_id=class_id or ''
                )
                db.session.add(student)
                db.session.commit()
                db.session.refresh(student)
                
                created.append(student.to_dict())
            except Exception as e:
                db.session.rollback()
                errors.append(f"{name}: {str(e)}")
        
        return jsonify({
            "created_count": len(created),
            "created_students": created,
            "errors": errors,
            "message": f"Successfully created {len(created)} students"
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


# ─────────────────────────────────────────────
# SUBJECTS
# ─────────────────────────────────────────────

@app.route("/api/subjects", methods=["GET"])
@login_required
def get_subjects():
    db = next(get_db())
    try:
        subjects = db_get_subjects(db)
        return jsonify([s.to_dict() for s in subjects])
    finally:
        db.close()


@app.route("/api/subjects", methods=["POST"])
@admin_only
def create_subject():
    data = request.get_json()
    if not data or not data.get("name"):
        return jsonify({"error": "name is required"}), 400
    
    # Use rubric if provided, otherwise use description as rubric
    rubric = data.get("rubric") or data.get("description") or ""
    
    subject_data = {
        "id": f"sub-{str(uuid.uuid4())[:8]}",
        "name": data["name"].strip(),
        "rubric": rubric.strip()
    }
    
    db = next(get_db())
    try:
        subject = db_create_subject(db, subject_data)
        return jsonify(subject.to_dict()), 201
    finally:
        db.close()


@app.route("/api/subjects/<subject_id>", methods=["PUT"])
@teacher_or_admin
def update_subject(subject_id):
    data = request.get_json()
    if not data or not data.get("name"):
        return jsonify({"error": "name is required"}), 400
    
    rubric = (data.get("rubric") or data.get("description") or "").strip()
    
    db = next(get_db())
    try:
        subject = db_update_subject(db, subject_id, {"name": data["name"].strip(), "rubric": rubric})
        if not subject:
            return jsonify({"error": "Subject not found"}), 404
        return jsonify(subject.to_dict())
    finally:
        db.close()


@app.route("/api/subjects/<subject_id>", methods=["DELETE"])
@teacher_or_admin
def delete_subject(subject_id):
    db = next(get_db())
    try:
        subject = db_get_subject_by_id(db, subject_id)
        if not subject:
            return jsonify({"error": "Subject not found"}), 404
        db_delete_subject(db, subject_id)
        return jsonify({"message": "Subject deleted"})
    finally:
        db.close()


# ─────────────────────────────────────────────
# GRADES
# ─────────────────────────────────────────────

@app.route("/api/grades", methods=["GET"])
@login_required
def get_grades():
    # Use database instead of JSON store
    db = SessionLocal()
    try:
        grades = database.get_grades(db)
        grades = [g.to_dict() for g in grades]
        
        # Enrich with evaluation - use database for students and subjects
        students = database.get_students(db)
        subjects = database.get_subjects(db)
        students_map = {s.id: s.to_dict() for s in students}
        subjects_map = {s.id: s.to_dict() for s in subjects}
        enriched = []
        for g in grades:
            ev = evaluate_score(g["score"])
            enriched.append({
                **g,
                "rubric": ev["rubric"],
                "points": ev["points"],
                "studentName": students_map.get(g["studentId"], {}).get("name", "Unknown"),
                "subjectName": subjects_map.get(g["subjectId"], {}).get("name", "Unknown"),
            })
        
        # Optional filters
        student_id = request.args.get("studentId")
        subject_id = request.args.get("subjectId")
        if student_id:
            enriched = [g for g in enriched if g["studentId"] == student_id]
        if subject_id:
            enriched = [g for g in enriched if g["subjectId"] == subject_id]
        
        return jsonify(enriched)
    finally:
        db.close()


@app.route("/api/grades", methods=["POST"])
@teacher_or_admin
def create_grade():
    data = request.get_json()
    required = ["studentId", "subjectId", "score", "examInstanceId"]
    if not data or not all(k in data for k in required):
        return jsonify({"error": "studentId, subjectId, score, and examInstanceId are required"}), 400

    # Teacher subject restriction
    current_user = g.current_user
    if current_user["role"] == "Teacher":
        if data["subjectId"] not in current_user.get("assignedSubjects", []):
            return jsonify({"error": "You are not assigned to this subject"}), 403

    try:
        score = int(data["score"])
        ev = evaluate_score(score)
    except (ValueError, TypeError) as e:
        return jsonify({"error": str(e)}), 400

    # Use Flask-SQLAlchemy db.session
    try:
        app.logger.info(f"Creating grade for student: {data['studentId']}, subject: {data['subjectId']}, exam: {data['examInstanceId']}")
        
        # Validate FK references in database
        student = database.get_student_by_id(db.session, data["studentId"])
        if not student:
            app.logger.error(f"Student not found: {data['studentId']}")
            return jsonify({"error": "Student not found"}), 404
        subject = database.get_subject_by_id(db.session, data["subjectId"])
        if not subject:
            return jsonify({"error": "Subject not found"}), 404
        
        # Get exam instance
        from database import get_exam_instance_by_id
        exam = get_exam_instance_by_id(db.session, data["examInstanceId"])
        if not exam:
            return jsonify({"error": "Exam instance not found"}), 404

        grade_data = {
            "id": str(uuid.uuid4()),
            "student_id": data["studentId"],
            "subject_id": data["subjectId"],
            "score": score,
            "comment": ev["comment"],
            "date": data.get("date", str(date.today())),
            "exam_instance_id": data["examInstanceId"],
            "is_locked": True,
            "submitted_by": current_user["id"]
        }
        grade = database.create_grade(db.session, grade_data)
        db.session.commit()
        return jsonify({**grade.to_dict(), "rubric": ev["rubric"], "points": ev["points"]}), 201
    except Exception as e:
        app.logger.error(f"Error creating grade: {e}")
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@app.route("/api/grades/<grade_id>", methods=["PUT"])
@teacher_or_admin
def update_grade(grade_id):
    # Use database instead of store.json
    db = SessionLocal()
    try:
        grade = database.get_grade_by_id(db, grade_id)
        if not grade:
            return jsonify({"error": "Grade not found"}), 404
        
        # Teacher cannot edit locked grades
        if grade.is_locked and g.current_user["role"] == "Teacher":
            return jsonify({"error": "Grade is locked. Contact an administrator to make corrections."}), 403

        data = request.get_json()
        if "score" in data:
            try:
                score = int(data["score"])
                ev = evaluate_score(score)
                grade.score = score
                grade.comment = ev["comment"]
            except (ValueError, TypeError) as e:
                return jsonify({"error": str(e)}), 400
        if "date" in data:
            grade.date = data["date"]
        
        db.commit()
        db.refresh(grade)
        ev = evaluate_score(grade.score)
        return jsonify({**grade.to_dict(), "rubric": ev["rubric"], "points": ev["points"]})
    finally:
        db.close()


@app.route("/api/grades/<grade_id>", methods=["DELETE"])
@admin_only
def delete_grade(grade_id):
    # Use database instead of store.json
    db = SessionLocal()
    try:
        grade = database.get_grade_by_id(db, grade_id)
        if not grade:
            return jsonify({"error": "Grade not found"}), 404
        database.delete_grade(db, grade_id)
        return jsonify({"message": "Grade deleted"})
    finally:
        db.close()


# ─────────────────────────────────────────────
# ADMIN GRADE ENDPOINTS
# ─────────────────────────────────────────────

@app.route("/api/admin/grades/<grade_id>/unlock", methods=["POST"])
@admin_only
def unlock_grade(grade_id):
    # Use database instead of store.json
    db = SessionLocal()
    try:
        grade = database.get_grade_by_id(db, grade_id)
        if not grade:
            return jsonify({"error": "Grade not found"}), 404
        grade.is_locked = False
        db.commit()
        db.refresh(grade)
        return jsonify({"message": "Grade unlocked", "grade": grade.to_dict()})
    finally:
        db.close()


@app.route("/api/admin/grades/<grade_id>", methods=["PUT"])
@admin_only
def admin_update_grade(grade_id):
    # Use database instead of store.json
    db = SessionLocal()
    try:
        grade = database.get_grade_by_id(db, grade_id)
        if not grade:
            return jsonify({"error": "Grade not found"}), 404

        data = request.get_json()
        if "score" in data:
            try:
                score = int(data["score"])
                ev = evaluate_score(score)
                grade.score = score
                grade.comment = ev["comment"]
            except (ValueError, TypeError) as e:
                return jsonify({"error": str(e)}), 400
        if "date" in data:
            grade.date = data["date"]

        # Re-lock after admin edit
        grade.is_locked = True

        db.commit()
        db.refresh(grade)
        ev = evaluate_score(grade.score)
        return jsonify({**grade.to_dict(), "rubric": ev["rubric"], "points": ev["points"]})
    finally:
        db.close()


# ─────────────────────────────────────────────
# CBC ANALYSIS
# ─────────────────────────────────────────────

@app.route("/api/analysis/cbc", methods=["POST"])
@teacher_or_admin
def cbc_analysis():
    """
    Generate CBC analysis report for an exam instance
    
    Request body:
    {
        "examInstanceId": "exam-123",
        "classId": "class-123" (optional - filters by class),
        "previousExamId": "exam-122" (optional for value-add)
    }
    """
    data = request.get_json()
    
    if not data or 'examInstanceId' not in data:
        return jsonify({"error": "examInstanceId is required"}), 400
    
    exam_instance_id = data['examInstanceId']
    class_id = data.get('classId')  # Optional class filter
    previous_exam_id = data.get('previousExamId')
    
    try:
        # Use Flask-SQLAlchemy session for consistency
        from database import Student
        
        # Get all grades for this exam using Flask-SQLAlchemy session
        grades = database.get_grades_by_exam(db.session, exam_instance_id)
        
        if not grades:
            return jsonify({"error": "No grades found for this exam"}), 404
        
        # Filter by class if specified
        if class_id:
            # Get student IDs for this class
            students_in_class = db.session.query(Student).filter(Student.class_id == class_id).all()
            student_ids = [s.id for s in students_in_class]
            grades = [g for g in grades if g.student_id in student_ids]
        
        if not grades:
            return jsonify({"error": "No grades found for this exam/class combination"}), 404
        
        # Convert to dict format for analysis
        grades_data = [g.to_dict() for g in grades]
        
        # Get subject names map
        subjects = database.get_subjects(db.session)
        subject_map = {s.id: s.name for s in subjects}
        
        # Generate CBC report
        report = generate_cbc_report(grades_data, exam_instance_id, previous_exam_id)
        
        # Replace subject IDs with names in the report
        if 'subject_analysis' in report:
            subject_analysis = {}
            for subj_id, subj_data in report['subject_analysis'].items():
                subj_name = subject_map.get(subj_id, subj_id)
                subject_analysis[subj_name] = subj_data
            report['subject_analysis'] = subject_analysis
        
        # Update total_students to reflect filtered count if class specified
        if class_id and 'overall' in report:
            report['overall']['total_students'] = len(set(g['studentId'] for g in grades_data))
        
        return jsonify(report)
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route("/api/analysis/subject/<subject_id>", methods=["GET"])
@teacher_or_admin
def subject_analysis(subject_id):
    """
    Get detailed CBC analysis for a specific subject across all exams
    """
    exam_id = request.args.get('examId')
    
    db = SessionLocal()
    try:
        if exam_id:
            grades = database.get_grades_by_exam_and_subject(db, exam_id, subject_id)
        else:
            grades = database.get_grades_by_subject(db, subject_id)
        
        if not grades:
            return jsonify({"error": "No grades found"}), 404
        
        grades_data = [g.to_dict() for g in grades]
        
        # Calculate SMP
        smp_data = calculate_subject_mean_points(grades_data)
        pass_data = calculate_pass_rate(grades_data)
        
        return jsonify({
            "subject_id": subject_id,
            "exam_id": exam_id,
            "smp": smp_data,
            "pass_rate": pass_data,
            "total_students": len(grades_data)
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()


# ─────────────────────────────────────────────
# USERS (Admin only)
# ─────────────────────────────────────────────

@app.route("/api/users", methods=["GET"])
@admin_only
def get_users():
    db = SessionLocal()
    try:
        users = database.get_users(db)
        return jsonify([u.to_dict() for u in users])
    finally:
        db.close()


@app.route("/api/users", methods=["POST"])
@admin_only
def create_user():
    data = request.get_json()
    if not data or not all(k in data for k in ["username", "password", "role"]):
        return jsonify({"error": "username, password, and role are required"}), 400

    db = SessionLocal()
    try:
        # Check if username exists in database
        existing = database.get_user_by_username(db, data["username"].strip())
        if existing:
            return jsonify({"error": "Username already exists"}), 409

        user_data = {
            "id": f"u-{str(uuid.uuid4())[:8]}",
            "username": data["username"].strip(),
            "password_hash": generate_password_hash(data["password"]),
            "role": data["role"],
            "assigned_subjects": ",".join(data.get("assignedSubjects", [])),
            "assigned_classes": ",".join(data.get("assignedClasses", []))
        }
        app.logger.info(f"Creating user: {user_data['username']} with role: {user_data['role']}")
        user = database.create_user(db, user_data)
        app.logger.info(f"User created successfully: {user.id}")
        return jsonify(user.to_dict()), 201
    except Exception as e:
        app.logger.error(f"Error creating user: {e}")
        import traceback
        app.logger.error(traceback.format_exc())
        return jsonify({"error": "Failed to create user. Please try again."}), 500
    finally:
        db.close()


@app.route("/api/users/<user_id>", methods=["GET"])
@admin_only
def get_user(user_id):
    # Use database instead of store.json
    db = SessionLocal()
    try:
        user = database.get_user_by_id(db, user_id)
        if not user:
            return jsonify({"error": "User not found"}), 404
        return jsonify(user.to_dict())
    finally:
        db.close()


@app.route("/api/users/<user_id>", methods=["PUT"])
@admin_only
def update_user(user_id):
    # Use database instead of store.json
    db = SessionLocal()
    try:
        user = database.get_user_by_id(db, user_id)
        if not user:
            return jsonify({"error": "User not found"}), 404

        data = request.get_json()
        if "username" in data:
            user.username = data["username"].strip()
        if "password" in data:
            user.password_hash = generate_password_hash(data["password"])
        if "role" in data:
            user.role = data["role"]
        if "assignedSubjects" in data:
            user.assigned_subjects = ",".join(data["assignedSubjects"])
        if "assignedClasses" in data:
            user.assigned_classes = ",".join(data["assignedClasses"])

        db.commit()
        db.refresh(user)
        return jsonify(user.to_dict())
    finally:
        db.close()


@app.route("/api/users/<user_id>", methods=["DELETE"])
@admin_only
def delete_user(user_id):
    db = SessionLocal()
    try:
        user = database.get_user_by_id(db, user_id)
        if not user:
            return jsonify({"error": "User not found"}), 404
        database.delete_user(db, user_id)
        return jsonify({"message": "User deleted"})
    finally:
        db.close()


# ─────────────────────────────────────────────
# EXAM INSTANCES
# ─────────────────────────────────────────────

@app.route("/api/exam-instances", methods=["GET"])
@teacher_or_admin
def get_exam_instances():
    # Use database instead of JSON store
    exams = database.get_exam_instances(db.session)
    return jsonify([e.to_dict() for e in exams])


@app.route("/api/exam-instances", methods=["POST"])
@admin_only
def create_exam_instance():
    data = request.get_json()
    if not data or "name" not in data:
        return jsonify({"error": "name is required"}), 400

    # Use database instead of JSON store
    try:
        exam_data = {
            "id": f"exam-{str(uuid.uuid4())[:8]}",
            "name": data["name"].strip(),
            "exam_type": data.get("examType", ""),
            "term": data.get("term", ""),
            "year": data.get("year", "")
        }
        exam = database.create_exam_instance(db.session, exam_data)
        db.session.commit()
        return jsonify(exam.to_dict()), 201
    except Exception as e:
        app.logger.error(f"Error creating exam instance: {e}")
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@app.route("/api/exam-instances/<instance_id>", methods=["GET"])
@teacher_or_admin
def get_exam_instance(instance_id):
    # Use database instead of store.json
    db = SessionLocal()
    try:
        instance = database.get_exam_instance_by_id(db, instance_id)
        if not instance:
            return jsonify({"error": "Exam instance not found"}), 404
        return jsonify(instance.to_dict())
    finally:
        db.close()


@app.route("/api/exam-instances/<instance_id>", methods=["PUT"])
@admin_only
def update_exam_instance(instance_id):
    # Use database instead of JSON store
    instance = database.get_exam_instance_by_id(db.session, instance_id)
    if not instance:
        return jsonify({"error": "Exam instance not found"}), 404
    
    data = request.get_json()
    if "name" in data:
        instance.name = data["name"].strip()
    if "examType" in data:
        instance.exam_type = data["examType"]
    if "term" in data:
        instance.term = data["term"]
    if "year" in data:
        instance.year = data["year"]
    db.session.commit()
    return jsonify(instance.to_dict())


@app.route("/api/exam-instances/<instance_id>", methods=["DELETE"])
@teacher_or_admin
def delete_exam_instance(instance_id):
    # Use database instead of JSON store
    instance = database.get_exam_instance_by_id(db.session, instance_id)
    if not instance:
        return jsonify({"error": "Exam instance not found"}), 404
    db.session.delete(instance)
    db.session.commit()
    return jsonify({"message": "Exam instance deleted"})


# ─────────────────────────────────────────────
# GRADING UTILITY ENDPOINT
# ─────────────────────────────────────────────

@app.route("/api/evaluate-score", methods=["POST"])
def evaluate_score_endpoint():
    """Preview rubric/points/comment for a score without saving."""
    data = request.get_json()
    if not data or "score" not in data:
        return jsonify({"error": "score is required"}), 400
    try:
        score = int(data["score"])
        result = evaluate_score(score)
        return jsonify({**result, "score": score})
    except (ValueError, TypeError) as e:
        return jsonify({"error": str(e)}), 400


# ─────────────────────────────────────────────
# REPORTS
# ─────────────────────────────────────────────

@app.route("/api/reports/student/<student_id>", methods=["GET"])
@login_required
def student_report(student_id):
    exam_id = request.args.get("examId")
    
    # Use database
    db = SessionLocal()
    try:
        student = database.get_student_by_id(db, student_id)
        if not student:
            return jsonify({"error": "Student not found"}), 404
        
        grades = database.get_grades_by_student(db, student_id)
        
        # Filter by exam if provided
        if exam_id:
            grades = [g for g in grades if g.exam_instance_id == exam_id]
        
        subjects = database.get_subjects(db)
        subjects_map = {s.id: s.to_dict() for s in subjects}
        
        exams = database.get_exam_instances(db)
        exam_map = {e.id: e.to_dict() for e in exams}
        
        # Get class info for student
        classes = database.get_classes(db)
        class_map = {c.id: c.to_dict() for c in classes}
        student_class = class_map.get(student.class_id, {})
        
        detailed = []
        for g in grades:
            ev = evaluate_score(g.score)
            exam_info = exam_map.get(g.exam_instance_id, {})
            detailed.append({
                "id": g.id,
                "studentId": g.student_id,
                "subjectId": g.subject_id,
                "examInstanceId": g.exam_instance_id,
                "score": g.score,
                "examName": exam_info.get("name", "Unknown"),
                "subjectName": subjects_map.get(g.subject_id, {}).get("name", "Unknown"),
                "rubric": ev["rubric"],
                "points": ev["points"],
                "comment": g.comment or "",
                "date": g.date or ""
            })
        
        avg = round(sum(g.score for g in grades) / len(grades), 1) if grades else 0
        overall_ev = evaluate_score(round(avg)) if grades else None
        
        # Build student object with class info
        student_dict = student.to_dict()
        student_dict['grade'] = student_class.get('name', '')
        
        # Get exam instance details if exam_id is provided
        exam_instance_dict = None
        if exam_id:
            exam = exam_map.get(exam_id)
            if exam:
                exam_instance_dict = exam
        
        return jsonify({
            "student": student_dict,
            "grades": detailed,
            "averageScore": avg,
            "overallRubric": overall_ev["rubric"] if overall_ev else "N/A",
            "overallPoints": overall_ev["points"] if overall_ev else 0,
            "examInstance": exam_instance_dict
        })
    finally:
        db.close()


@app.route("/api/reports/subject/<subject_id>", methods=["GET"])
@login_required
def subject_report(subject_id):
    exam_id = request.args.get("examId")
    class_id = request.args.get("classId")
    
    db = SessionLocal()
    try:
        subject = database.get_subject_by_id(db, subject_id)
        if not subject:
            return jsonify({"error": "Subject not found"}), 404

        students = database.get_students(db)
        students_map = {s.id: s.to_dict() for s in students}
        
        exams = database.get_exam_instances(db)
        exam_map = {e.id: e.to_dict() for e in exams}
        
        grades = database.get_grades_by_subject(db, subject_id)
        
        # Filter by exam if provided
        if exam_id:
            grades = [g for g in grades if g.exam_instance_id == exam_id]
        
        # Filter by class if provided
        if class_id:
            grades = [g for g in grades if students_map.get(g.student_id, {}).get("classId") == class_id]

        detailed = []
        for g in grades:
            ev = evaluate_score(g.score)
            exam_info = exam_map.get(g.exam_instance_id, {})
            detailed.append({
                "id": g.id,
                "studentId": g.student_id,
                "subjectId": g.subject_id,
                "examInstanceId": g.exam_instance_id,
                "score": g.score,
                "examName": exam_info.get("name", "Unknown"),
                "studentName": students_map.get(g.student_id, {}).get("name", "Unknown"),
                "rubric": ev["rubric"],
                "points": ev["points"],
                "comment": g.comment or "",
                "date": g.date or ""
            })

        avg = round(sum(g.score for g in grades) / len(grades), 1) if grades else 0
        pass_rate = round(len([g for g in grades if g.score >= 58]) / len(grades) * 100, 1) if grades else 0

        return jsonify({
            "subject": subject.to_dict(),
            "grades": detailed,
            "averageScore": avg,
            "passRate": pass_rate,
            "totalStudents": len(grades)
        })
    finally:
        db.close()


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))
    app.run(host="0.0.0.0", port=port, debug=False)

# Vercel handler for serverless
def handler(request, context):
    # Use Flask's test client to handle Vercel requests
    from werkzeug.test import Client
    from werkzeug.wrappers import Response
    
    # Get the path and method from the request
    path = request.uri or '/'
    method = request.method or 'GET'
    
    # Get headers from request
    headers = {}
    if request.headers:
        for key in request.headers:
            headers[key] = request.headers[key]
    
    # Get body if present
    body = b''
    if request.body:
        if isinstance(request.body, str):
            body = request.body.encode('utf-8')
        else:
            body = request.body
    
    # Use Flask test client
    client = app.test_client()
    
    # Make the request
    response = client.open(
        path=path,
        method=method,
        headers=headers,
        data=body,
        content_type=headers.get('Content-Type', 'application/json')
    )
    
    # Return Vercel-compatible response
    return {
        'statusCode': response.status_code,
        'headers': dict(response.headers),
        'body': response.get_data(as_text=True)
    }
