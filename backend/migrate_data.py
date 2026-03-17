"""
Migration script to push JSON data to PostgreSQL database.
Reads from store.json and pushes all records to the PostgreSQL database.
"""

import json
import os
import sys

# Add the backend directory to the path so we can import SQLAlchemy
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from database import Base, Student, Subject, Grade, User, ExamInstance, Class

# Get database URL from environment variable
DATABASE_URL = os.environ.get('DATABASE_URL')

# Use SQLite for local testing if no DATABASE_URL
if not DATABASE_URL:
    print("WARNING: DATABASE_URL not set. Using SQLite for local testing.")
    print("For production, set DATABASE_URL with your PostgreSQL connection string.")
    print("Example: export DATABASE_URL='postgres://user:password@host:port/database'")
    print("")
    DATABASE_URL = 'sqlite:///edumanage.db'
else:
    # Fix for Railway's postgres:// prefix (should be postgresql:// for SQLAlchemy)
    if DATABASE_URL.startswith('postgres://'):
        DATABASE_URL = DATABASE_URL.replace('postgres://', 'postgresql://', 1)

print(f"Connecting to database...")
engine = create_engine(DATABASE_URL)
Base.metadata.create_all(engine)
Session = sessionmaker(bind=engine)
session = Session()

# Load JSON data
store_path = os.path.join(os.path.dirname(__file__), 'store.json')
with open(store_path, 'r') as f:
    data = json.load(f)

print("Migrating data to PostgreSQL...")

# Migrate Users first (other tables reference them)
users_added = 0
for user_data in data.get('users', []):
    # Check if user already exists
    existing = session.query(User).filter_by(id=user_data['id']).first()
    if not existing:
        user = User(
            id=user_data['id'],
            username=user_data['username'],
            password_hash=user_data['passwordHash'],
            role=user_data['role'],
            assigned_subjects=','.join(user_data.get('assignedSubjects', [])),
            assigned_classes=','.join(user_data.get('assignedClasses', []))
        )
        session.add(user)
        users_added += 1

session.commit()
print(f"  Added {users_added} users")

# Migrate Subjects
subjects_added = 0
for subject_data in data.get('subjects', []):
    existing = session.query(Subject).filter_by(id=subject_data['id']).first()
    if not existing:
        subject = Subject(
            id=subject_data['id'],
            name=subject_data['name'],
            rubric=subject_data.get('rubric', '')
        )
        session.add(subject)
        subjects_added += 1

session.commit()
print(f"  Added {subjects_added} subjects")

# Migrate Classes
classes_added = 0
for class_data in data.get('classes', []):
    existing = session.query(Class).filter_by(id=class_data['id']).first()
    if not existing:
        class_obj = Class(
            id=class_data['id'],
            name=class_data['name'],
            academic_year=class_data.get('academicYear', ''),
            subjects=','.join(class_data.get('subjects', []))
        )
        session.add(class_obj)
        classes_added += 1

session.commit()
print(f"  Added {classes_added} classes")

# Migrate Students
students_added = 0
for student_data in data.get('students', []):
    existing = session.query(Student).filter_by(id=student_data['id']).first()
    if not existing:
        student = Student(
            id=student_data['id'],
            name=student_data['name'],
            class_id=student_data.get('classId', '')
        )
        session.add(student)
        students_added += 1

session.commit()
print(f"  Added {students_added} students")

# Migrate Exam Instances
exams_added = 0
for exam_data in data.get('exam_instances', []):
    existing = session.query(ExamInstance).filter_by(id=exam_data['id']).first()
    if not existing:
        exam = ExamInstance(
            id=exam_data['id'],
            name=exam_data['name']
        )
        session.add(exam)
        exams_added += 1

session.commit()
print(f"  Added {exams_added} exam instances")

# Migrate Grades
grades_added = 0
for grade_data in data.get('grades', []):
    existing = session.query(Grade).filter_by(id=grade_data['id']).first()
    if not existing:
        grade = Grade(
            id=grade_data['id'],
            student_id=grade_data['studentId'],
            subject_id=grade_data['subjectId'],
            score=grade_data.get('score', 0),
            comment=grade_data.get('comment', ''),
            date=grade_data.get('date', ''),
            exam_instance_id=grade_data.get('examInstanceId', ''),
            is_locked=grade_data.get('isLocked', False),
            submitted_by=grade_data.get('submittedBy', '')
        )
        session.add(grade)
        grades_added += 1

session.commit()
print(f"  Added {grades_added} grades")

session.close()
print("\nMigration complete!")
print(f"Total: {users_added} users, {subjects_added} subjects, {classes_added} classes, {students_added} students, {exams_added} exams, {grades_added} grades")
