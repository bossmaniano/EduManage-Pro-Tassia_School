import os
import json
from supabase import create_client, Client
from datetime import datetime

# Check which database to use
USE_VERCEL_PG = os.environ.get('USE_VERCEL_PG', 'false').lower() == 'true'

# Get Supabase credentials from environment
SUPABASE_URL = os.environ.get('SUPABASE_URL', 'https://srtttdzdwchsqgzvmwlg.supabase.co')
SUPABASE_KEY = os.environ.get('SUPABASE_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNydHR0ZHpkd2Noc3FnenZtd2xnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMjgyNDksImV4cCI6MjA4ODYwNDI0OX0.LX9OnqUmVuqoPSA1F7uomE_5Dz6Ooyvqv4K5EU9RzoE')

# Initialize Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Vercel Postgres connection (lazy initialization)
_ve_pg_conn = None

def get_ve_pg_conn():
    """Get or create Vercel Postgres connection"""
    global _ve_pg_conn
    if _ve_pg_conn is None:
        try:
            import psycopg2
            POSTGRES_URL = os.environ.get('POSTGRES_URL')
            if POSTGRES_URL:
                _ve_pg_conn = psycopg2.connect(POSTGRES_URL)
            else:
                print("WARNING: POSTGRES_URL not set")
        except ImportError:
            print("WARNING: psycopg2 not installed. Install with: pip install psycopg2-binary")
        except Exception as e:
            print(f"WARNING: Could not connect to Vercel Postgres: {e}")
    return _ve_pg_conn

def ve_pg_execute(query, params=None, fetch=True):
    """Execute a query on Vercel Postgres"""
    conn = get_ve_pg_conn()
    if not conn:
        return []
    try:
        with conn.cursor() as cur:
            cur.execute(query, params)
            if fetch:
                return cur.fetchall()
            conn.commit()
            return []
    except Exception as e:
        print(f"Postgres query error: {e}")
        return []

# =============================================================================
# Column name mappers: PostgreSQL schema -> Application JSON format
# =============================================================================

def map_user_from_db(row):
    """Map database user row to application format"""
    return {
        'id': row.get('id', ''),
        'username': row.get('username', ''),
        'passwordHash': row.get('password_hash', ''),
        'role': row.get('role', 'Teacher'),
        'assignedSubjects': row.get('assigned_subjects', []),
        'assignedClasses': row.get('assigned_classes', [])
    }

def map_student_from_db(row):
    """Map database student row to application format"""
    return {
        'id': row.get('id', ''),
        'name': row.get('name', ''),
        'classId': row.get('class_id')
    }

def map_subject_from_db(row):
    """Map database subject row to application format"""
    return {
        'id': row.get('id', ''),
        'name': row.get('name', ''),
        'rubric': row.get('rubric', '')
    }

def map_class_from_db(row):
    """Map database class row to application format"""
    return {
        'id': row.get('id', ''),
        'name': row.get('name', ''),
        'academicYear': row.get('academic_year', ''),
        'subjects': row.get('subjects', [])
    }

def map_grade_from_db(row):
    """Map database grade row to application format"""
    return {
        'id': row.get('id', ''),
        'studentId': row.get('student_id', ''),
        'subjectId': row.get('subject_id', ''),
        'score': row.get('score', 0),
        'comment': row.get('comment', ''),
        'date': str(row.get('date', '')),
        'examInstanceId': row.get('exam_instance_id'),
        'isLocked': row.get('is_locked', False),
        'submittedBy': row.get('submitted_by')
    }

def map_exam_instance_from_db(row):
    """Map database exam instance row to application format"""
    return {
        'id': row.get('id', ''),
        'name': row.get('name', '')
    }

# Reverse mappers for inserts/updates
def map_user_to_db(user_data):
    """Map application user data to database format"""
    return {
        'id': user_data.get('id'),
        'username': user_data.get('username'),
        'password_hash': user_data.get('passwordHash', user_data.get('password_hash', '')),
        'role': user_data.get('role', 'Teacher'),
        'assigned_subjects': user_data.get('assignedSubjects', []),
        'assigned_classes': user_data.get('assignedClasses', [])
    }

def map_student_to_db(student_data):
    """Map application student data to database format"""
    return {
        'id': student_data.get('id'),
        'name': student_data.get('name'),
        'class_id': student_data.get('classId')
    }

def map_grade_to_db(grade_data):
    """Map application grade data to database format"""
    return {
        'id': grade_data.get('id'),
        'student_id': grade_data.get('studentId'),
        'subject_id': grade_data.get('subjectId'),
        'score': grade_data.get('score'),
        'comment': grade_data.get('comment', ''),
        'date': grade_data.get('date'),
        'exam_instance_id': grade_data.get('examInstanceId'),
        'is_locked': grade_data.get('isLocked', False),
        'submitted_by': grade_data.get('submittedBy')
    }

def map_subject_to_db(subject_data):
    """Map application subject data to database format"""
    return {
        'id': subject_data.get('id'),
        'name': subject_data.get('name'),
        'rubric': subject_data.get('rubric', '')
    }

def map_class_to_db(class_data):
    """Map application class data to database format"""
    return {
        'id': class_data.get('id'),
        'name': class_data.get('name'),
        'academic_year': class_data.get('academicYear', ''),
        'subjects': class_data.get('subjects', [])
    }

def map_exam_instance_to_db(exam_data):
    """Map application exam instance data to database format"""
    return {
        'id': exam_data.get('id'),
        'name': exam_data.get('name'),
        'created_at': exam_data.get('createdAt', '2026-01-01')
    }

def get_store():
    """Get all data from database (Supabase, Vercel Postgres, or empty)"""
    
    # Use Vercel Postgres if configured
    if USE_VERCEL_PG:
        return get_store_from_ve_pg()
    
    # Use Supabase
    try:
        users = supabase.table('users').select('*').execute()
        students = supabase.table('students').select('*').execute()
        subjects = supabase.table('subjects').select('*').execute()
        grades = supabase.table('grades').select('*').execute()
        classes = supabase.table('classes').select('*').execute()
        exam_instances = supabase.table('exam_instances').select('*').execute()
        
        return {
            'users': [map_user_from_db(u) for u in users.data] if users.data else [],
            'students': [map_student_from_db(s) for s in students.data] if students.data else [],
            'subjects': [map_subject_from_db(s) for s in subjects.data] if subjects.data else [],
            'grades': [map_grade_from_db(g) for g in grades.data] if grades.data else [],
            'classes': [map_class_from_db(c) for c in classes.data] if classes.data else [],
            'exam_instances': [map_exam_instance_from_db(e) for e in exam_instances.data] if exam_instances.data else []
        }
    except Exception as e:
        print(f"Error fetching from Supabase: {e}")
        return {
            'users': [],
            'students': [],
            'subjects': [],
            'grades': [],
            'classes': [],
            'exam_instances': []
        }

def get_store_from_ve_pg():
    """Get all data from Vercel Postgres"""
    try:
        # Fetch all data from Vercel Postgres
        users = ve_pg_execute("SELECT * FROM users", fetch=True)
        students = ve_pg_execute("SELECT * FROM students", fetch=True)
        subjects = ve_pg_execute("SELECT * FROM subjects", fetch=True)
        grades = ve_pg_execute("SELECT * FROM grades", fetch=True)
        classes = ve_pg_execute("SELECT * FROM classes", fetch=True)
        exam_instances = ve_pg_execute("SELECT * FROM exam_instances", fetch=True)
        
        # Map to application format (column names are lowercase with underscores)
        return {
            'users': [map_user_from_db(dict(zip(['id', 'username', 'password_hash', 'role', 'assigned_subjects', 'assigned_classes'], u))) for u in users] if users else [],
            'students': [map_student_from_db(dict(zip(['id', 'name', 'class_id'], s))) for s in students] if students else [],
            'subjects': [map_subject_from_db(dict(zip(['id', 'name', 'rubric'], s))) for s in subjects] if subjects else [],
            'grades': [map_grade_from_db(dict(zip(['id', 'student_id', 'subject_id', 'score', 'comment', 'date'], g))) for g in grades] if grades else [],
            'classes': [map_class_from_db(dict(zip(['id', 'name', 'academic_year', 'subjects'], c))) for c in classes] if classes else [],
            'exam_instances': [map_exam_instance_from_db(dict(zip(['id', 'name', 'created_at'], e))) for e in exam_instances] if exam_instances else []
        }
    except Exception as e:
        print(f"Error fetching from Vercel Postgres: {e}")
        return {
            'users': [],
            'students': [],
            'subjects': [],
            'grades': [],
            'classes': [],
            'exam_instances': []
        }

# Users operations
def get_users():
    result = supabase.table('users').select('*').execute()
    return [map_user_from_db(u) for u in result.data] if result.data else []

def get_user_by_username(username):
    result = supabase.table('users').select('*').eq('username', username).execute()
    return map_user_from_db(result.data[0]) if result.data else None

def create_user(user_data):
    db_data = map_user_to_db(user_data)
    result = supabase.table('users').insert(db_data).execute()
    return map_user_from_db(result.data[0]) if result.data else None

def update_user(user_id, user_data):
    db_data = map_user_to_db(user_data)
    result = supabase.table('users').update(db_data).eq('id', user_id).execute()
    return map_user_from_db(result.data[0]) if result.data else None

def delete_user(user_id):
    supabase.table('users').delete().eq('id', user_id).execute()

# Students operations
def get_students():
    result = supabase.table('students').select('*').execute()
    return [map_student_from_db(s) for s in result.data] if result.data else []

def get_student_by_id(student_id):
    result = supabase.table('students').select('*').eq('id', student_id).execute()
    return map_student_from_db(result.data[0]) if result.data else None

def create_student(student_data):
    db_data = map_student_to_db(student_data)
    result = supabase.table('students').insert(db_data).execute()
    return map_student_from_db(result.data[0]) if result.data else None

def update_student(student_id, student_data):
    db_data = map_student_to_db(student_data)
    result = supabase.table('students').update(db_data).eq('id', student_id).execute()
    return map_student_from_db(result.data[0]) if result.data else None

def delete_student(student_id):
    supabase.table('students').delete().eq('id', student_id).execute()

# Subjects operations
def get_subjects():
    result = supabase.table('subjects').select('*').execute()
    return [map_subject_from_db(s) for s in result.data] if result.data else []

def create_subject(subject_data):
    result = supabase.table('subjects').insert(subject_data).execute()
    return map_subject_from_db(result.data[0]) if result.data else None

def update_subject(subject_id, subject_data):
    result = supabase.table('subjects').update(subject_data).eq('id', subject_id).execute()
    return map_subject_from_db(result.data[0]) if result.data else None

def delete_subject(subject_id):
    supabase.table('subjects').delete().eq('id', subject_id).execute()

# Grades operations
def get_grades():
    result = supabase.table('grades').select('*').execute()
    return [map_grade_from_db(g) for g in result.data] if result.data else []

def create_grade(grade_data):
    db_data = map_grade_to_db(grade_data)
    result = supabase.table('grades').insert(db_data).execute()
    return map_grade_from_db(result.data[0]) if result.data else None

def update_grade(grade_id, grade_data):
    db_data = map_grade_to_db(grade_data)
    result = supabase.table('grades').update(db_data).eq('id', grade_id).execute()
    return map_grade_from_db(result.data[0]) if result.data else None

def delete_grade(grade_id):
    supabase.table('grades').delete().eq('id', grade_id).execute()

# Classes operations
def get_classes():
    result = supabase.table('classes').select('*').execute()
    return [map_class_from_db(c) for c in result.data] if result.data else []

def get_class_by_id(class_id):
    result = supabase.table('classes').select('*').eq('id', class_id).execute()
    return map_class_from_db(result.data[0]) if result.data else None

def create_class(class_data):
    result = supabase.table('classes').insert(class_data).execute()
    return map_class_from_db(result.data[0]) if result.data else None

def update_class(class_id, class_data):
    result = supabase.table('classes').update(class_data).eq('id', class_id).execute()
    return map_class_from_db(result.data[0]) if result.data else None

def delete_class(class_id):
    supabase.table('classes').delete().eq('id', class_id).execute()

# Exam instances operations
def get_exam_instances():
    result = supabase.table('exam_instances').select('*').execute()
    return [map_exam_instance_from_db(e) for e in result.data] if result.data else []

def create_exam_instance(exam_data):
    result = supabase.table('exam_instances').insert(exam_data).execute()
    return map_exam_instance_from_db(result.data[0]) if result.data else None

def delete_exam_instance(exam_id):
    supabase.table('exam_instances').delete().eq('id', exam_id).execute()
