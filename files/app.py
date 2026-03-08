"""
EduManage Pro - Flask Backend
RESTful API serving on port 18080 with local store.json persistence
"""

import json
import uuid
import os
from datetime import date
from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

STORE_PATH = os.path.join(os.path.dirname(__file__), "store.json")


# ─────────────────────────────────────────────
# DATA LAYER
# ─────────────────────────────────────────────

def read_store() -> dict:
    with open(STORE_PATH, "r") as f:
        return json.load(f)


def write_store(data: dict) -> None:
    with open(STORE_PATH, "w") as f:
        json.dump(data, f, indent=2)


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
# HEALTH CHECK
# ─────────────────────────────────────────────

@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "service": "EduManage Pro API"})


# ─────────────────────────────────────────────
# DASHBOARD
# ─────────────────────────────────────────────

@app.route("/api/dashboard", methods=["GET"])
def dashboard():
    store = read_store()
    students = store["students"]
    grades = store["grades"]
    subjects = store["subjects"]

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
            student_avgs.append({"id": s["id"], "name": s["name"], "grade": s["grade"], "average": avg})
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
def get_students():
    store = read_store()
    return jsonify(store["students"])


@app.route("/api/students", methods=["POST"])
def create_student():
    data = request.get_json()
    if not data or not all(k in data for k in ["name", "grade", "email"]):
        return jsonify({"error": "name, grade, and email are required"}), 400

    student = {
        "id": str(uuid.uuid4()),
        "name": data["name"].strip(),
        "grade": data["grade"].strip(),
        "email": data["email"].strip()
    }
    store = read_store()
    store["students"].append(student)
    write_store(store)
    return jsonify(student), 201


@app.route("/api/students/<student_id>", methods=["GET"])
def get_student(student_id):
    store = read_store()
    student = next((s for s in store["students"] if s["id"] == student_id), None)
    if not student:
        return jsonify({"error": "Student not found"}), 404
    return jsonify(student)


@app.route("/api/students/<student_id>", methods=["PUT"])
def update_student(student_id):
    store = read_store()
    student = next((s for s in store["students"] if s["id"] == student_id), None)
    if not student:
        return jsonify({"error": "Student not found"}), 404

    data = request.get_json()
    for field in ["name", "grade", "email"]:
        if field in data:
            student[field] = data[field].strip()
    write_store(store)
    return jsonify(student)


@app.route("/api/students/<student_id>", methods=["DELETE"])
def delete_student(student_id):
    store = read_store()
    original = len(store["students"])
    store["students"] = [s for s in store["students"] if s["id"] != student_id]
    store["grades"] = [g for g in store["grades"] if g["studentId"] != student_id]
    if len(store["students"]) == original:
        return jsonify({"error": "Student not found"}), 404
    write_store(store)
    return jsonify({"message": "Student deleted successfully"})


# ─────────────────────────────────────────────
# SUBJECTS
# ─────────────────────────────────────────────

@app.route("/api/subjects", methods=["GET"])
def get_subjects():
    store = read_store()
    return jsonify(store["subjects"])


@app.route("/api/subjects", methods=["POST"])
def create_subject():
    data = request.get_json()
    if not data or not all(k in data for k in ["name", "rubric"]):
        return jsonify({"error": "name and rubric are required"}), 400

    subject = {
        "id": f"sub-{str(uuid.uuid4())[:8]}",
        "name": data["name"].strip(),
        "rubric": data["rubric"].strip()
    }
    store = read_store()
    store["subjects"].append(subject)
    write_store(store)
    return jsonify(subject), 201


@app.route("/api/subjects/<subject_id>", methods=["DELETE"])
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
def create_grade():
    data = request.get_json()
    required = ["studentId", "subjectId", "score"]
    if not data or not all(k in data for k in required):
        return jsonify({"error": "studentId, subjectId, and score are required"}), 400

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

    grade = {
        "id": str(uuid.uuid4()),
        "studentId": data["studentId"],
        "subjectId": data["subjectId"],
        "score": score,
        "comment": ev["comment"],
        "date": data.get("date", str(date.today()))
    }
    store["grades"].append(grade)
    write_store(store)

    return jsonify({**grade, "rubric": ev["rubric"], "points": ev["points"]}), 201


@app.route("/api/grades/<grade_id>", methods=["PUT"])
def update_grade(grade_id):
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

    write_store(store)
    ev = evaluate_score(grade["score"])
    return jsonify({**grade, "rubric": ev["rubric"], "points": ev["points"]})


@app.route("/api/grades/<grade_id>", methods=["DELETE"])
def delete_grade(grade_id):
    store = read_store()
    original = len(store["grades"])
    store["grades"] = [g for g in store["grades"] if g["id"] != grade_id]
    if len(store["grades"]) == original:
        return jsonify({"error": "Grade not found"}), 404
    write_store(store)
    return jsonify({"message": "Grade deleted"})


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
def student_report(student_id):
    store = read_store()
    student = next((s for s in store["students"] if s["id"] == student_id), None)
    if not student:
        return jsonify({"error": "Student not found"}), 404

    grades = [g for g in store["grades"] if g["studentId"] == student_id]
    subjects_map = {s["id"]: s for s in store["subjects"]}

    detailed = []
    for g in grades:
        ev = evaluate_score(g["score"])
        detailed.append({
            **g,
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
def subject_report(subject_id):
    store = read_store()
    subject = next((s for s in store["subjects"] if s["id"] == subject_id), None)
    if not subject:
        return jsonify({"error": "Subject not found"}), 404

    grades = [g for g in store["grades"] if g["subjectId"] == subject_id]
    students_map = {s["id"]: s for s in store["students"]}

    detailed = []
    for g in grades:
        ev = evaluate_score(g["score"])
        detailed.append({
            **g,
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
    app.run(host="0.0.0.0", port=18080, debug=True)
