"""
One-time migration script: adds users, exam_instances, and augments grades.
Run once: python migrate.py
"""

import json
import shutil
import os
from werkzeug.security import generate_password_hash

STORE_PATH = os.path.join(os.path.dirname(__file__), "store.json")
BACKUP_PATH = STORE_PATH + ".backup"

def migrate():
    with open(STORE_PATH, "r") as f:
        store = json.load(f)

    # Backup
    shutil.copy2(STORE_PATH, BACKUP_PATH)
    print(f"Backup created at {BACKUP_PATH}")

    # Add users
    store["users"] = [
        {
            "id": "u-001",
            "username": "admin",
            "passwordHash": generate_password_hash("admin123"),
            "role": "Admin",
            "assignedSubjects": []
        },
        {
            "id": "u-002",
            "username": "teacher_math",
            "passwordHash": generate_password_hash("teach123"),
            "role": "Teacher",
            "assignedSubjects": ["sub-001"]
        },
        {
            "id": "u-003",
            "username": "teacher_eng",
            "passwordHash": generate_password_hash("teach123"),
            "role": "Teacher",
            "assignedSubjects": ["sub-002"]
        }
    ]

    # Add exam_instances
    store["exam_instances"] = [
        {"id": "exam-001", "name": "Term 1 Final Exam, 2025"}
    ]

    # Augment existing grades
    for grade in store["grades"]:
        grade["isLocked"] = True
        grade["examInstanceId"] = "exam-001"
        grade["submittedBy"] = "u-001"

    with open(STORE_PATH, "w") as f:
        json.dump(store, f, indent=2)

    print("Migration complete.")
    print(f"  Users added: {len(store['users'])}")
    print(f"  Exam instances added: {len(store['exam_instances'])}")
    print(f"  Grades augmented: {len(store['grades'])}")

if __name__ == "__main__":
    migrate()
