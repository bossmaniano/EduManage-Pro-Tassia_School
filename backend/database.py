import os
import json
from supabase import create_client, Client
from datetime import datetime

# Get Supabase credentials from environment
SUPABASE_URL = os.environ.get('SUPABASE_URL', 'https://srtttdzdwchsqgzvmwlg.supabase.co')
SUPABASE_KEY = os.environ.get('SUPABASE_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNydHR0ZHpkd2Noc3FnenZtd2xnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMjgyNDksImV4cCI6MjA4ODYwNDI0OX0.LX9OnqUmVuqoPSA1F7uomE_5Dz6Ooyvqv4K5EU9RzoE')

# Initialize Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def get_store():
    """Get all data from Supabase - simulates the JSON store"""
    try:
        users = supabase.table('users').select('*').execute()
        students = supabase.table('students').select('*').execute()
        subjects = supabase.table('subjects').select('*').execute()
        grades = supabase.table('grades').select('*').execute()
        classes = supabase.table('classes').select('*').execute()
        exam_instances = supabase.table('exam_instances').select('*').execute()
        
        return {
            'users': users.data if users.data else [],
            'students': students.data if students.data else [],
            'subjects': subjects.data if subjects.data else [],
            'grades': grades.data if grades.data else [],
            'classes': classes.data if classes.data else [],
            'exam_instances': exam_instances.data if exam_instances.data else []
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

# Users operations
def get_users():
    result = supabase.table('users').select('*').execute()
    return result.data if result.data else []

def get_user_by_username(username):
    result = supabase.table('users').select('*').eq('username', username).execute()
    return result.data[0] if result.data else None

def create_user(user_data):
    result = supabase.table('users').insert(user_data).execute()
    return result.data[0] if result.data else None

def update_user(user_id, user_data):
    result = supabase.table('users').update(user_data).eq('id', user_id).execute()
    return result.data[0] if result.data else None

def delete_user(user_id):
    supabase.table('users').delete().eq('id', user_id).execute()

# Students operations
def get_students():
    result = supabase.table('students').select('*').execute()
    return result.data if result.data else []

def get_student_by_id(student_id):
    result = supabase.table('students').select('*').eq('id', student_id).execute()
    return result.data[0] if result.data else None

def create_student(student_data):
    result = supabase.table('students').insert(student_data).execute()
    return result.data[0] if result.data else None

def update_student(student_id, student_data):
    result = supabase.table('students').update(student_data).eq('id', student_id).execute()
    return result.data[0] if result.data else None

def delete_student(student_id):
    supabase.table('students').delete().eq('id', student_id).execute()

# Subjects operations
def get_subjects():
    result = supabase.table('subjects').select('*').execute()
    return result.data if result.data else []

def create_subject(subject_data):
    result = supabase.table('subjects').insert(subject_data).execute()
    return result.data[0] if result.data else None

def update_subject(subject_id, subject_data):
    result = supabase.table('subjects').update(subject_data).eq('id', subject_id).execute()
    return result.data[0] if result.data else None

def delete_subject(subject_id):
    supabase.table('subjects').delete().eq('id', subject_id).execute()

# Grades operations
def get_grades():
    result = supabase.table('grades').select('*').execute()
    return result.data if result.data else []

def create_grade(grade_data):
    result = supabase.table('grades').insert(grade_data).execute()
    return result.data[0] if result.data else None

def update_grade(grade_id, grade_data):
    result = supabase.table('grades').update(grade_data).eq('id', grade_id).execute()
    return result.data[0] if result.data else None

def delete_grade(grade_id):
    supabase.table('grades').delete().eq('id', grade_id).execute()

# Classes operations
def get_classes():
    result = supabase.table('classes').select('*').execute()
    return result.data if result.data else []

def get_class_by_id(class_id):
    result = supabase.table('classes').select('*').eq('id', class_id).execute()
    return result.data[0] if result.data else None

def create_class(class_data):
    result = supabase.table('classes').insert(class_data).execute()
    return result.data[0] if result.data else None

def update_class(class_id, class_data):
    result = supabase.table('classes').update(class_data).eq('id', class_id).execute()
    return result.data[0] if result.data else None

def delete_class(class_id):
    supabase.table('classes').delete().eq('id', class_id).execute()

# Exam instances operations
def get_exam_instances():
    result = supabase.table('exam_instances').select('*').execute()
    return result.data if result.data else []

def create_exam_instance(exam_data):
    result = supabase.table('exam_instances').insert(exam_data).execute()
    return result.data[0] if result.data else None

def delete_exam_instance(exam_id):
    supabase.table('exam_instances').delete().eq('id', exam_id).execute()
