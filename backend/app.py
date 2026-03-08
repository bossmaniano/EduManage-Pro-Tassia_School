"""
EduManage Pro - Flask Backend
RESTful API serving on port 18080 with local store.json persistence
"""

import json
import uuid
import os
import fcntl
from datetime import date, datetime, timedelta
from functools import wraps

import jwt
from flask import Flask, jsonify, request, g, make_response
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')

# Configure CORS - allow both local development and production URLs
# Update RENDER_FRONTEND_URL to your production frontend URL on Render
RENDER_FRONTEND_URL = os.environ.get("RENDER_FRONTEND_URL", "")
ALLOWED_ORIGINS = ["http://localhost:5173", "http://localhost:5174"]
if RENDER_FRONTEND_URL:
    ALLOWED_ORIGINS.append(RENDER_FRONTEND_URL)

CORS(app, origins=ALLOWED_ORIGINS, supports_credentials=True)

STORE_PATH = os.path.join(os.path.dirname(__file__), "store.json")


# ─────────────────────────────────────────────
# DATA LAYER
# ─────────────────────────────────────────────

def read_store() -> dict:
    with open(STORE_PATH, "r") as f:
        fcntl.flock(f, fcntl.LOCK_SH)
        try:
            return json.load(f)
        finally:
            fcntl.flock(f, fcntl.LOCK_UN)


def write_store(data: dict) -> None:
    with open(STORE_PATH, "r+") as f:
        fcntl.flock(f, fcntl.LOCK_EX)
        try:
            f.seek(0)
            json.dump(data, f, indent=2)
            f.truncate()
        finally:
            fcntl.flock(f, fcntl.LOCK_UN)


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
        if not token:
            return jsonify({"error": "Authentication required"}), 401
        try:
            payload = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token expired"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Invalid token"}), 401

        store = read_store()
        user = next((u for u in store.get("users", []) if u["id"] == payload["user_id"]), None)
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

    store = read_store()
    user = next((u for u in store.get("users", []) if u["username"] == data["username"]), None)
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
    resp.set_cookie('token', token, httponly=True, samesite='Lax', secure=False, max_age=28800)
    return resp


@app.route("/api/auth/logout", methods=["POST"])
def logout():
    resp = make_response(jsonify({"message": "Logged out"}))
    resp.delete_cookie('token')
    return resp


@app.route("/api/auth/me", methods=["GET"])
@login_required
def me():
    u = g.current_user
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
    store = read_store()
    students = store["students"]
    grades = store["grades"]
    subjects = store["subjects"]
    classes = store.get("classes", [])

    total_students = len(students)
    total_grades_entered = len(grades)
    avg_score = round(sum(g["score"] for g in grades) / len(grades), 1) if grades else 0

    # Grade distribution
    distribution = {"EE": 0, "ME": 0, "AE": 0, "BE": 0}
    for g in grades:
        ev = evaluate_score(g["score"])
        rubric = ev["rubric"]
        if "EE" in rubric:
            distribution["EE"] += 1
        elif "ME" in rubric:
            distribution["ME"] += 1
        elif "AE" in rubric:
            distribution["AE"] += 1
        else:
            distribution["BE"] += 1

    # Subject averages
    subject_avgs = []
    for sub in subjects:
        sub_grades = [g["score"] for g in grades if g["subjectId"] == sub["id"]]
        avg = round(sum(sub_grades) / len(sub_grades), 1) if sub_grades else 0
        subject_avgs.append({"subject": sub["name"], "average": avg, "count": len(sub_grades)})

    # Top performers
    student_avgs = []
    for s in students:
        s_grades = [g["score"] for g in grades if g["studentId"] == s["id"]]
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
        "totalSubjects": len(subjects),
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
    store = read_store()
    students = store.get("students", [])
    classes = store.get("classes", [])
    # Enrich students with class info
    class_map = {c["id"]: c for c in classes}
    for student in students:
        class_id = student.get("classId")
        if class_id and class_id in class_map:
            student["class"] = class_map[class_id]
    return jsonify(students)


@app.route("/api/students", methods=["POST"])
@admin_only
def create_student():
    data = request.get_json()
    if not data or not data.get("name"):
        return jsonify({"error": "name is required"}), 400

    student = {
        "id": str(uuid.uuid4()),
        "name": data["name"].strip(),
        "classId": data.get("classId") or None,
    }
    store = read_store()
    store.setdefault("students", []).append(student)
    write_store(store)
    # Add class info to response
    if student.get("classId"):
        for c in store.get("classes", []):
            if c["id"] == student["classId"]:
                student["class"] = c
                break
    return jsonify(student), 201


@app.route("/api/students/<student_id>", methods=["GET"])
@login_required
def get_student(student_id):
    store = read_store()
    student = next((s for s in store["students"] if s["id"] == student_id), None)
    if not student:
        return jsonify({"error": "Student not found"}), 404
    return jsonify(student)


@app.route("/api/students/<student_id>", methods=["PUT"])
@admin_only
def update_student(student_id):
    store = read_store()
    student = next((s for s in store["students"] if s["id"] == student_id), None)
    if not student:
        return jsonify({"error": "Student not found"}), 404

    data = request.get_json()
    for field in ["name", "grade", "email"]:
        if field in data:
            student[field] = data[field].strip()
    # Handle classId - can be set to None to unassign
    if "classId" in data:
        student["classId"] = data["classId"]
    write_store(store)
    return jsonify(student)


@app.route("/api/students/<student_id>", methods=["DELETE"])
@teacher_or_admin
def delete_student(student_id):
    store = read_store()
    original = len(store["students"])
    store["students"] = [s for s in store["students"] if s["id"] != student_id]
    store["grades"] = [g for g in store["grades"] if g["studentId"] != student_id]
    if len(store["students"]) == original:
        return jsonify({"error": "Student not found"}), 404
    write_store(store)
    return jsonify({"message": "Student deleted successfully"})


# PUT /api/students/<student_id>/class - Assign student to class
@app.route("/api/students/<student_id>/class", methods=["PUT"])
@admin_only
def assign_student_class(student_id):
    data = request.get_json()
    store = read_store()
    for student in store.get("students", []):
        if student["id"] == student_id:
            student["classId"] = data.get("classId")  # Can be None to unassign
            write_store(store)
            return jsonify(student)
    return jsonify({"error": "Student not found"}), 404


# ─────────────────────────────────────────────
# CLASSES
# ─────────────────────────────────────────────

@app.route("/api/classes", methods=["GET"])
@teacher_or_admin
def get_classes():
    store = read_store()
    classes = store.get("classes", [])
    students = store.get("students", [])
    # Add studentCount to each class
    for cls in classes:
        cls["studentCount"] = sum(1 for s in students if s.get("classId") == cls["id"])
    return jsonify(classes)


@app.route("/api/classes", methods=["POST"])
@admin_only
def create_class():
    data = request.get_json()
    store = read_store()
    new_class = {
        "id": f"class-{uuid.uuid4().hex[:6]}",
        "name": data.get("name"),
        "academicYear": data.get("academicYear"),
        "subjects": data.get("subjects", [])  # List of subject IDs
    }
    store.setdefault("classes", []).append(new_class)
    write_store(store)
    return jsonify(new_class), 201


@app.route("/api/classes/<class_id>", methods=["PUT"])
@admin_only
def update_class(class_id):
    data = request.get_json()
    store = read_store()
    for cls in store.get("classes", []):
        if cls["id"] == class_id:
            cls["name"] = data.get("name", cls["name"])
            cls["academicYear"] = data.get("academicYear", cls.get("academicYear"))
            if "subjects" in data:
                cls["subjects"] = data["subjects"]
            write_store(store)
            return jsonify(cls)
    return jsonify({"error": "Class not found"}), 404


@app.route("/api/classes/<class_id>", methods=["DELETE"])
@teacher_or_admin
def delete_class(class_id):
    store = read_store()
    # Unlink students from this class instead of deleting them
    for student in store.get("students", []):
        if student.get("classId") == class_id:
            student["classId"] = None
    # Delete the class
    classes = store.get("classes", [])
    store["classes"] = [c for c in classes if c["id"] != class_id]
    write_store(store)
    return jsonify({"message": "Class deleted"})


@app.route("/api/classes/<class_id>/students", methods=["GET"])
@teacher_or_admin
def get_class_students(class_id):
    store = read_store()
    students = [s for s in store.get("students", []) if s.get("classId") == class_id]
    return jsonify(students)


# ─────────────────────────────────────────────
# SUBJECTS
# ─────────────────────────────────────────────

@app.route("/api/subjects", methods=["GET"])
@login_required
def get_subjects():
    store = read_store()
    return jsonify(store["subjects"])


@app.route("/api/subjects", methods=["POST"])
@admin_only
def create_subject():
    data = request.get_json()
    if not data or not data.get("name"):
        return jsonify({"error": "name is required"}), 400
    
    # Use rubric if provided, otherwise use description as rubric
    rubric = data.get("rubric") or data.get("description") or ""
    
    subject = {
        "id": f"sub-{str(uuid.uuid4())[:8]}",
        "name": data["name"].strip(),
        "rubric": rubric.strip()
    }
    store = read_store()
    store["subjects"].append(subject)
    write_store(store)
    return jsonify(subject), 201


@app.route("/api/subjects/<subject_id>", methods=["PUT"])
@teacher_or_admin
def update_subject(subject_id):
    data = request.get_json()
    if not data or not data.get("name"):
        return jsonify({"error": "name is required"}), 400
    
    store = read_store()
    subject = next((s for s in store["subjects"] if s["id"] == subject_id), None)
    if not subject:
        return jsonify({"error": "Subject not found"}), 404
    
    subject["name"] = data["name"].strip()
    subject["rubric"] = (data.get("rubric") or data.get("description") or "").strip()
    
    write_store(store)
    return jsonify(subject)


@app.route("/api/subjects/<subject_id>", methods=["DELETE"])
@teacher_or_admin
def delete_subject(subject_id):
    store = read_store()
    original = len(store["subjects"])
    store["subjects"] = [s for s in store["subjects"] if s["id"] != subject_id]
    if len(store["subjects"]) == original:
        return jsonify({"error": "Subject not found"}), 404
    write_store(store)
    return jsonify({"message": "Subject deleted"})


# ─────────────────────────────────────────────
# GRADES
# ─────────────────────────────────────────────

@app.route("/api/grades", methods=["GET"])
@login_required
def get_grades():
    store = read_store()
    grades = store["grades"]

    # Optional filters
    student_id = request.args.get("studentId")
    subject_id = request.args.get("subjectId")
    if student_id:
        grades = [g for g in grades if g["studentId"] == student_id]
    if subject_id:
        grades = [g for g in grades if g["subjectId"] == subject_id]

    # Enrich with evaluation
    enriched = []
    students_map = {s["id"]: s for s in store["students"]}
    subjects_map = {s["id"]: s for s in store["subjects"]}
    for g in grades:
        ev = evaluate_score(g["score"])
        enriched.append({
            **g,
            "rubric": ev["rubric"],
            "points": ev["points"],
            "studentName": students_map.get(g["studentId"], {}).get("name", "Unknown"),
            "subjectName": subjects_map.get(g["subjectId"], {}).get("name", "Unknown"),
        })
    return jsonify(enriched)


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

    store = read_store()

    # Validate FK references
    if not any(s["id"] == data["studentId"] for s in store["students"]):
        return jsonify({"error": "Student not found"}), 404
    if not any(s["id"] == data["subjectId"] for s in store["subjects"]):
        return jsonify({"error": "Subject not found"}), 404
    if not any(e["id"] == data["examInstanceId"] for e in store.get("exam_instances", [])):
        return jsonify({"error": "Exam instance not found"}), 404

    grade = {
        "id": str(uuid.uuid4()),
        "studentId": data["studentId"],
        "subjectId": data["subjectId"],
        "score": score,
        "comment": ev["comment"],
        "date": data.get("date", str(date.today())),
        "examInstanceId": data["examInstanceId"],
        "isLocked": True,
        "submittedBy": current_user["id"]
    }
    store["grades"].append(grade)
    write_store(store)

    return jsonify({**grade, "rubric": ev["rubric"], "points": ev["points"]}), 201


@app.route("/api/grades/<grade_id>", methods=["PUT"])
@teacher_or_admin
def update_grade(grade_id):
    store = read_store()
    grade = next((g for g in store["grades"] if g["id"] == grade_id), None)
    if not grade:
        return jsonify({"error": "Grade not found"}), 404

    # Teacher cannot edit locked grades
    if grade.get("isLocked", False) and g.current_user["role"] == "Teacher":
        return jsonify({"error": "Grade is locked. Contact an administrator to make corrections."}), 403

    data = request.get_json()
    if "score" in data:
        try:
            score = int(data["score"])
            ev = evaluate_score(score)
            grade["score"] = score
            grade["comment"] = ev["comment"]
        except (ValueError, TypeError) as e:
            return jsonify({"error": str(e)}), 400
    if "date" in data:
        grade["date"] = data["date"]

    write_store(store)
    ev = evaluate_score(grade["score"])
    return jsonify({**grade, "rubric": ev["rubric"], "points": ev["points"]})


@app.route("/api/grades/<grade_id>", methods=["DELETE"])
@admin_only
def delete_grade(grade_id):
    store = read_store()
    original = len(store["grades"])
    store["grades"] = [g for g in store["grades"] if g["id"] != grade_id]
    if len(store["grades"]) == original:
        return jsonify({"error": "Grade not found"}), 404
    write_store(store)
    return jsonify({"message": "Grade deleted"})


# ─────────────────────────────────────────────
# ADMIN GRADE ENDPOINTS
# ─────────────────────────────────────────────

@app.route("/api/admin/grades/<grade_id>/unlock", methods=["POST"])
@admin_only
def unlock_grade(grade_id):
    store = read_store()
    grade = next((g for g in store["grades"] if g["id"] == grade_id), None)
    if not grade:
        return jsonify({"error": "Grade not found"}), 404
    grade["isLocked"] = False
    write_store(store)
    return jsonify({"message": "Grade unlocked", "grade": grade})


@app.route("/api/admin/grades/<grade_id>", methods=["PUT"])
@admin_only
def admin_update_grade(grade_id):
    store = read_store()
    grade = next((g for g in store["grades"] if g["id"] == grade_id), None)
    if not grade:
        return jsonify({"error": "Grade not found"}), 404

    data = request.get_json()
    if "score" in data:
        try:
            score = int(data["score"])
            ev = evaluate_score(score)
            grade["score"] = score
            grade["comment"] = ev["comment"]
        except (ValueError, TypeError) as e:
            return jsonify({"error": str(e)}), 400
    if "date" in data:
        grade["date"] = data["date"]

    # Re-lock after admin edit
    grade["isLocked"] = True

    write_store(store)
    ev = evaluate_score(grade["score"])
    return jsonify({**grade, "rubric": ev["rubric"], "points": ev["points"]})


# ─────────────────────────────────────────────
# USERS (Admin only)
# ─────────────────────────────────────────────

@app.route("/api/users", methods=["GET"])
@admin_only
def get_users():
    store = read_store()
    users = [
        {"id": u["id"], "username": u["username"], "role": u["role"], "assignedSubjects": u.get("assignedSubjects", []), "assignedClasses": u.get("assignedClasses", [])}
        for u in store.get("users", [])
    ]
    return jsonify(users)


@app.route("/api/users", methods=["POST"])
@admin_only
def create_user():
    data = request.get_json()
    if not data or not all(k in data for k in ["username", "password", "role"]):
        return jsonify({"error": "username, password, and role are required"}), 400

    store = read_store()
    if any(u["username"] == data["username"] for u in store.get("users", [])):
        return jsonify({"error": "Username already exists"}), 409

    user = {
        "id": f"u-{str(uuid.uuid4())[:8]}",
        "username": data["username"].strip(),
        "passwordHash": generate_password_hash(data["password"]),
        "role": data["role"],
        "assignedSubjects": data.get("assignedSubjects", []),
        "assignedClasses": data.get("assignedClasses", [])
    }
    store.setdefault("users", []).append(user)
    write_store(store)
    return jsonify({"id": user["id"], "username": user["username"], "role": user["role"], "assignedSubjects": user["assignedSubjects"], "assignedClasses": user.get("assignedClasses", [])}), 201


@app.route("/api/users/<user_id>", methods=["GET"])
@admin_only
def get_user(user_id):
    store = read_store()
    user = next((u for u in store.get("users", []) if u["id"] == user_id), None)
    if not user:
        return jsonify({"error": "User not found"}), 404
    return jsonify({"id": user["id"], "username": user["username"], "role": user["role"], "assignedSubjects": user.get("assignedSubjects", [])})


@app.route("/api/users/<user_id>", methods=["PUT"])
@admin_only
def update_user(user_id):
    store = read_store()
    user = next((u for u in store.get("users", []) if u["id"] == user_id), None)
    if not user:
        return jsonify({"error": "User not found"}), 404

    data = request.get_json()
    if "username" in data:
        user["username"] = data["username"].strip()
    if "password" in data:
        user["passwordHash"] = generate_password_hash(data["password"])
    if "role" in data:
        user["role"] = data["role"]
    if "assignedSubjects" in data:
        user["assignedSubjects"] = data["assignedSubjects"]
    if "assignedClasses" in data:
        user["assignedClasses"] = data["assignedClasses"]

    write_store(store)
    return jsonify({"id": user["id"], "username": user["username"], "role": user["role"], "assignedSubjects": user.get("assignedSubjects", []), "assignedClasses": user.get("assignedClasses", [])})


@app.route("/api/users/<user_id>", methods=["DELETE"])
@admin_only
def delete_user(user_id):
    store = read_store()
    original = len(store.get("users", []))
    store["users"] = [u for u in store.get("users", []) if u["id"] != user_id]
    if len(store["users"]) == original:
        return jsonify({"error": "User not found"}), 404
    write_store(store)
    return jsonify({"message": "User deleted"})


# ─────────────────────────────────────────────
# EXAM INSTANCES
# ─────────────────────────────────────────────

@app.route("/api/exam-instances", methods=["GET"])
@teacher_or_admin
def get_exam_instances():
    store = read_store()
    return jsonify(store.get("exam_instances", []))


@app.route("/api/exam-instances", methods=["POST"])
@admin_only
def create_exam_instance():
    data = request.get_json()
    if not data or "name" not in data:
        return jsonify({"error": "name is required"}), 400

    instance = {
        "id": f"exam-{str(uuid.uuid4())[:8]}",
        "name": data["name"].strip()
    }
    store = read_store()
    store.setdefault("exam_instances", []).append(instance)
    write_store(store)
    return jsonify(instance), 201


@app.route("/api/exam-instances/<instance_id>", methods=["GET"])
@teacher_or_admin
def get_exam_instance(instance_id):
    store = read_store()
    instance = next((e for e in store.get("exam_instances", []) if e["id"] == instance_id), None)
    if not instance:
        return jsonify({"error": "Exam instance not found"}), 404
    return jsonify(instance)


@app.route("/api/exam-instances/<instance_id>", methods=["PUT"])
@admin_only
def update_exam_instance(instance_id):
    store = read_store()
    instance = next((e for e in store.get("exam_instances", []) if e["id"] == instance_id), None)
    if not instance:
        return jsonify({"error": "Exam instance not found"}), 404

    data = request.get_json()
    if "name" in data:
        instance["name"] = data["name"].strip()
    write_store(store)
    return jsonify(instance)


@app.route("/api/exam-instances/<instance_id>", methods=["DELETE"])
@teacher_or_admin
def delete_exam_instance(instance_id):
    store = read_store()
    original = len(store.get("exam_instances", []))
    store["exam_instances"] = [e for e in store.get("exam_instances", []) if e["id"] != instance_id]
    if len(store["exam_instances"]) == original:
        return jsonify({"error": "Exam instance not found"}), 404
    write_store(store)
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
    store = read_store()
    student = next((s for s in store["students"] if s["id"] == student_id), None)
    if not student:
        return jsonify({"error": "Student not found"}), 404

    grades = [g for g in store["grades"] if g["studentId"] == student_id]
    
    # Filter by exam if provided
    if exam_id:
        grades = [g for g in grades if g.get("examInstanceId") == exam_id]
    
    subjects_map = {s["id"]: s for s in store["subjects"]}
    exam_map = {e["id"]: e for e in store.get("exam-instances", [])}

    detailed = []
    for g in grades:
        ev = evaluate_score(g["score"])
        exam_info = exam_map.get(g.get("examInstanceId"), {})
        detailed.append({
            **g,
            "examName": exam_info.get("name", "Unknown"),
            "subjectName": subjects_map.get(g["subjectId"], {}).get("name", "Unknown"),
            "rubric": ev["rubric"],
            "points": ev["points"]
        })

    avg = round(sum(g["score"] for g in grades) / len(grades), 1) if grades else 0
    overall_ev = evaluate_score(round(avg)) if grades else None

    return jsonify({
        "student": student,
        "grades": detailed,
        "averageScore": avg,
        "overallRubric": overall_ev["rubric"] if overall_ev else "N/A",
        "overallPoints": overall_ev["points"] if overall_ev else 0
    })


@app.route("/api/reports/subject/<subject_id>", methods=["GET"])
@login_required
def subject_report(subject_id):
    exam_id = request.args.get("examId")
    store = read_store()
    subject = next((s for s in store["subjects"] if s["id"] == subject_id), None)
    if not subject:
        return jsonify({"error": "Subject not found"}), 404

    grades = [g for g in store["grades"] if g["subjectId"] == subject_id]
    
    # Filter by exam if provided
    if exam_id:
        grades = [g for g in grades if g.get("examInstanceId") == exam_id]
    
    students_map = {s["id"]: s for s in store["students"]}
    exam_map = {e["id"]: e for e in store.get("exam-instances", [])}

    detailed = []
    for g in grades:
        ev = evaluate_score(g["score"])
        exam_info = exam_map.get(g.get("examInstanceId"), {})
        detailed.append({
            **g,
            "examName": exam_info.get("name", "Unknown"),
            "studentName": students_map.get(g["studentId"], {}).get("name", "Unknown"),
            "rubric": ev["rubric"],
            "points": ev["points"]
        })

    avg = round(sum(g["score"] for g in grades) / len(grades), 1) if grades else 0
    pass_rate = round(len([g for g in grades if g["score"] >= 58]) / len(grades) * 100, 1) if grades else 0

    return jsonify({
        "subject": subject,
        "grades": detailed,
        "averageScore": avg,
        "passRate": pass_rate,
        "totalStudents": len(grades)
    })


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 18080))
    app.run(host="0.0.0.0", port=port, debug=False)
