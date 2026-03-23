"""
SQLAlchemy Database Models for EduManage Pro
Supports both local JSON (fallback) and PostgreSQL (production)
"""

import os
import json
from datetime import datetime, timedelta
import pytz
from sqlalchemy import create_engine, Column, String, Integer, Boolean, ForeignKey, Text, UniqueConstraint, DateTime, func

# Nairobi timezone (East Africa Time - EAT)
NAIROBI_TZ = pytz.timezone('Africa/Nairobi')

def nairobi_now():
    """Get current time in Nairobi/EAT timezone."""
    return datetime.now(NAIROBI_TZ)
from sqlalchemy.orm import declarative_base, relationship, sessionmaker, scoped_session

Base = declarative_base()

# ==================== MODELS ====================

class User(Base):
    __tablename__ = 'users'
    
    id = Column(String, primary_key=True)
    username = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, nullable=False)  # Admin, Teacher
    assigned_subjects = Column(String, default='')  # Comma-separated list
    assigned_classes = Column(String, default='')  # Comma-separated list
    
    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'passwordHash': self.password_hash,
            'role': self.role,
            'assignedSubjects': self.assigned_subjects.split(',') if self.assigned_subjects else [],
            'assignedClasses': self.assigned_classes.split(',') if self.assigned_classes else []
        }

class Subject(Base):
    __tablename__ = 'subjects'
    
    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    rubric = Column(String, default='')
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'rubric': self.rubric
        }

class Class(Base):
    __tablename__ = 'classes'
    
    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    academic_year = Column(String, default='')
    subjects = Column(String, default='')  # Comma-separated list
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'academicYear': self.academic_year,
            'subjects': self.subjects.split(',') if self.subjects else []
        }

class Student(Base):
    __tablename__ = 'students'
    
    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    class_id = Column(String, ForeignKey('classes.id'), default='')
    email = Column(String, default='')
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'classId': self.class_id,
            'email': self.email,
            'grade': ''  # Will be populated with class name when returned
        }

class ExamInstance(Base):
    __tablename__ = 'exam_instances'
    
    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    exam_type = Column(String, default='')  # e.g., "Mid Term", "End Term", "CAT"
    term = Column(String, default='')       # e.g., "Term 1", "Term 2", "Term 3"
    year = Column(String, default='')       # e.g., "2026"
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'examType': self.exam_type,
            'term': self.term,
            'year': self.year
        }

class Grade(Base):
    __tablename__ = 'grades'
    __table_args__ = (
        # Prevent duplicate grades for same student/subject/exam
        UniqueConstraint('student_id', 'subject_id', 'exam_instance_id', name='_student_subject_exam_uc'),
    )

    id = Column(String, primary_key=True)
    student_id = Column(String, ForeignKey('students.id'), nullable=False)
    subject_id = Column(String, ForeignKey('subjects.id'), nullable=False)
    score = Column(Integer, default=0)
    comment = Column(String, default='')
    date = Column(String, default='')
    exam_instance_id = Column(String, ForeignKey('exam_instances.id'), default='')
    is_locked = Column(Boolean, default=False)
    submitted_by = Column(String, default='')
    # NOTE: Audit is handled via GradeAuditLog table - no columns needed on this table
    # Keeping model clean to avoid schema mismatch issues
    
    def to_dict(self):
        return {
            'id': self.id,
            'studentId': self.student_id,
            'subjectId': self.subject_id,
            'score': self.score,
            'comment': self.comment,
            'date': self.date,
            'examInstanceId': self.exam_instance_id,
            'isLocked': self.is_locked,
            'submittedBy': self.submitted_by
        }

class GradeAuditLog(Base):
    __tablename__ = 'grade_audit_log'
    __table_args__ = (
        UniqueConstraint('grade_id', 'new_value', 'changed_by', 'timestamp', name='uix_grade_log'),
    )
    
    id = Column(String, primary_key=True)
    grade_id = Column(String, nullable=False)  # No FK - stores ID as string to avoid delete conflicts
    old_value = Column(Integer, default=0)
    new_value = Column(Integer, default=0)
    changed_by = Column(String, default='')
    timestamp = Column(DateTime, default=nairobi_now)
    
    def to_dict(self):
        return {
            'id': self.id,
            'gradeId': self.grade_id,
            'oldValue': self.old_value,
            'newValue': self.new_value,
            'changedBy': self.changed_by,
            'timestamp': self.timestamp.strftime('%Y-%m-%d %H:%M:%S') if self.timestamp else None
        }


class SecurityEvent(Base):
    """Security event logging table - fast inserts for login attempts and sensitive actions"""
    __tablename__ = 'security_events'
    
    id = Column(String, primary_key=True)
    user_id = Column(String, nullable=True)  # Can be null for failed login attempts
    event_type = Column(String, nullable=False)  # LOGIN_FAIL, LOGIN_SUCCESS, PASSWORD_CHANGE, BULK_DELETE, etc.
    ip_address = Column(String, default='')
    user_agent = Column(String, default='')
    details = Column(String, default='')  # Additional details (e.g., attempted username)
    timestamp = Column(DateTime, default=nairobi_now)
    
    def to_dict(self):
        return {
            'id': self.id,
            'userId': self.user_id,
            'eventType': self.event_type,
            'ipAddress': self.ip_address,
            'userAgent': self.user_agent,
            'details': self.details,
            'timestamp': self.timestamp.strftime('%Y-%m-%d %H:%M:%S') if self.timestamp else None
        }


# ==================== DATABASE CONNECTION ====================

# Get database URL from environment
DATABASE_URL = os.environ.get('DATABASE_URL')

# If no DATABASE_URL, use SQLite for local development
if not DATABASE_URL:
    print("WARNING: DATABASE_URL not set. Using SQLite for local development.")
    # Use absolute path to ensure same database is used
    import pathlib
    db_path = pathlib.Path(__file__).parent.resolve() / 'edumanage.db'
    SQLALCHEMY_DATABASE_URL = f'sqlite:///{db_path}'
    print(f"Using database: {SQLALCHEMY_DATABASE_URL}")
else:
    # Fix for Railway's postgres:// prefix (SQLAlchemy needs postgresql://)
    SQLALCHEMY_DATABASE_URL = DATABASE_URL.replace('postgres://', 'postgresql://', 1)

# Create engine
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, 
    echo=False,
    pool_size=20,
    max_overflow=30,
    pool_pre_ping=True,
    pool_recycle=3600
)
# Use scoped_session to prevent thread-local connection leaks
session_factory = sessionmaker(autocommit=False, autoflush=False, bind=engine)
SessionLocal = scoped_session(session_factory)

# Create tables if they don't exist
Base.metadata.create_all(bind=engine)

def get_db():
    """Get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ==================== DATABASE OPERATIONS ====================

def init_db():
    """Initialize database - create all tables"""
    Base.metadata.create_all(bind=engine)

# Users
def get_users(db):
    return db.query(User).all()

def get_user_by_username(db, username):
    return db.query(User).filter(User.username == username).first()

def get_user_by_id(db, user_id):
    return db.query(User).filter(User.id == user_id).first()

def create_user(db, user_data):
    user = User(**user_data)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

def update_user(db, user_id, user_data):
    user = db.query(User).filter(User.id == user_id).first()
    if user:
        for key, value in user_data.items():
            setattr(user, key, value)
        db.commit()
        db.refresh(user)
    return user

def delete_user(db, user_id):
    user = db.query(User).filter(User.id == user_id).first()
    if user:
        db.delete(user)
        db.commit()

# Subjects
def get_subjects(db):
    return db.query(Subject).all()

def get_subject_by_id(db, subject_id):
    return db.query(Subject).filter(Subject.id == subject_id).first()

def create_subject(db, subject_data):
    subject = Subject(**subject_data)
    db.add(subject)
    db.commit()
    db.refresh(subject)
    return subject

def update_subject(db, subject_id, subject_data):
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if subject:
        for key, value in subject_data.items():
            setattr(subject, key, value)
        db.commit()
        db.refresh(subject)
    return subject

def delete_subject(db, subject_id):
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if subject:
        db.delete(subject)
        db.commit()

# Classes
def get_classes(db):
    return db.query(Class).all()

def get_class_by_id(db, class_id):
    return db.query(Class).filter(Class.id == class_id).first()

def create_class(db, class_data):
    class_obj = Class(**class_data)
    db.add(class_obj)
    db.commit()
    db.refresh(class_obj)
    return class_obj

def update_class(db, class_id, class_data):
    class_obj = db.query(Class).filter(Class.id == class_id).first()
    if class_obj:
        for key, value in class_data.items():
            setattr(class_obj, key, value)
        db.commit()
        db.refresh(class_obj)
    return class_obj

def delete_class(db, class_id):
    class_obj = db.query(Class).filter(Class.id == class_id).first()
    if class_obj:
        db.delete(class_obj)
        db.commit()

# Students
def get_students(db):
    return db.query(Student).all()

def get_student_by_id(db, student_id):
    return db.query(Student).filter(Student.id == student_id).first()

def get_students_by_class(db, class_id):
    return db.query(Student).filter(Student.class_id == class_id).all()

def get_all_students(db):
    """Get all students from database"""
    return db.query(Student).all()

def create_student(db, student_data):
    student = Student(**student_data)
    db.add(student)
    db.commit()
    db.refresh(student)
    return student

def update_student(db, student_id, student_data):
    student = db.query(Student).filter(Student.id == student_id).first()
    if student:
        for key, value in student_data.items():
            setattr(student, key, value)
        db.commit()
        db.refresh(student)
    return student

def delete_student(db, student_id):
    student = db.query(Student).filter(Student.id == student_id).first()
    if student:
        db.delete(student)
        db.commit()

# Grades
def get_grades(db):
    return db.query(Grade).all()

def get_grade_by_id(db, grade_id):
    return db.query(Grade).filter(Grade.id == grade_id).first()

def get_grades_by_student(db, student_id):
    return db.query(Grade).filter(Grade.student_id == student_id).all()

def get_grades_by_subject(db, subject_id):
    return db.query(Grade).filter(Grade.subject_id == subject_id).all()

def get_grades_by_exam(db, exam_instance_id):
    return db.query(Grade).filter(Grade.exam_instance_id == exam_instance_id).all()

def get_grades_by_subject(db, subject_id):
    """Get all grades for a specific subject"""
    return db.query(Grade).filter(Grade.subject_id == subject_id).all()

def get_grades_by_exam_and_subject(db, exam_instance_id, subject_id):
    """Get grades for a specific exam and subject"""
    return db.query(Grade).filter(
        Grade.exam_instance_id == exam_instance_id,
        Grade.subject_id == subject_id
    ).all()

def get_grades_by_student_and_exam(db, student_id, exam_instance_id):
    return db.query(Grade).filter(
        Grade.student_id == student_id,
        Grade.exam_instance_id == exam_instance_id
    ).all()

def create_grade(db, grade_data):
    grade = Grade(**grade_data)
    db.add(grade)
    db.commit()
    db.refresh(grade)
    return grade

def update_grade(db, grade_id, grade_data):
    grade = db.query(Grade).filter(Grade.id == grade_id).first()
    if grade:
        for key, value in grade_data.items():
            setattr(grade, key, value)
        db.commit()
        db.refresh(grade)
    return grade

def create_audit_log(db, grade_id, old_value, new_value, changed_by, commit=True):
    """Create an audit log entry for a grade change.
    
    Args:
        db: SQLAlchemy session
        grade_id: ID of the grade being modified
        old_value: Previous score value
        new_value: New score value
        changed_by: Username of who made the change
        commit: Whether to commit immediately (default True for backward compatibility)
        
    Returns:
        The audit log entry, or None if duplicate was detected (within 5 seconds)
    """
    import uuid
    from sqlalchemy.exc import IntegrityError
    
    # Deduplication: Check if an identical audit log was created within the last 5 seconds
    five_seconds_ago = datetime.now() - timedelta(seconds=5)
    existing_log = db.query(GradeAuditLog).filter(
        GradeAuditLog.grade_id == grade_id,
        GradeAuditLog.new_value == new_value,
        GradeAuditLog.changed_by == changed_by,
        GradeAuditLog.timestamp >= five_seconds_ago
    ).first()
    
    if existing_log:
        # Duplicate detected within 5 seconds - skip creating a new entry silently
        # Return None to indicate no new log was created
        return None
    
    audit_log = GradeAuditLog(
        id=str(uuid.uuid4()),
        grade_id=grade_id,
        old_value=old_value,
        new_value=new_value,
        changed_by=changed_by
    )
    
    try:
        db.add(audit_log)
        if commit:
            db.commit()
            db.refresh(audit_log)
        return audit_log
    except IntegrityError:
        # Unique constraint violation - duplicate entry
        db.session.rollback()
        return None

def get_audit_logs_for_grade(db, grade_id):
    """Get all audit logs for a specific grade."""
    return db.query(GradeAuditLog).filter(
        GradeAuditLog.grade_id == grade_id
    ).order_by(GradeAuditLog.timestamp.desc()).all()

def get_all_audit_logs(db, limit=50):
    """Get all audit logs, ordered by most recent first."""
    return db.query(GradeAuditLog).order_by(
        GradeAuditLog.timestamp.desc()
    ).limit(limit).all()

def delete_grade(db, grade_id):
    # First delete any audit logs for this grade (to avoid FK issues)
    try:
        db.query(GradeAuditLog).filter(GradeAuditLog.grade_id == grade_id).delete(synchronize_session=False)
    except Exception:
        # Table might not exist yet - ignore
        pass
    
    # Then delete the grade
    grade = db.query(Grade).filter(Grade.id == grade_id).first()
    if grade:
        db.delete(grade)
        db.commit()


# ==================== SECURITY EVENTS ====================

def log_security_event(db, event_type, user_id=None, ip_address='', user_agent='', details=''):
    """
    Fast insert for security events.
    Does NOT commit - caller should handle transaction to avoid overwhelming the DB.
    """
    import uuid
    event = SecurityEvent(
        id=str(uuid.uuid4()),
        user_id=user_id,
        event_type=event_type,
        ip_address=ip_address,
        user_agent=user_agent,
        details=details
    )
    db.add(event)
    # Don't commit here - let caller batch or commit as needed
    return event


def get_failed_logins_last_24h(db):
    """Get count of failed login attempts in last 24 hours"""
    from datetime import datetime, timedelta
    cutoff = datetime.now() - timedelta(hours=24)
    return db.query(SecurityEvent).filter(
        SecurityEvent.event_type == 'LOGIN_FAIL',
        SecurityEvent.timestamp >= cutoff
    ).all()


def get_failed_logins_by_ip_last_hour(db):
    """Get failed login counts by IP in the last hour"""
    from datetime import datetime, timedelta
    cutoff = datetime.now() - timedelta(hours=1)
    events = db.query(SecurityEvent).filter(
        SecurityEvent.event_type == 'LOGIN_FAIL',
        SecurityEvent.timestamp >= cutoff
    ).all()
    
    # Group by IP
    ip_counts = {}
    for event in events:
        ip = event.ip_address
        if ip:
            ip_counts[ip] = ip_counts.get(ip, 0) + 1
    
    # Flag suspicious IPs (>10 attempts)
    suspicious = {ip: count for ip, count in ip_counts.items() if count > 10}
    return {
        'total_24h': len(events),
        'by_ip': ip_counts,
        'suspicious_ips': suspicious
    }


# Exam Instances
def get_exam_instances(db):
    return db.query(ExamInstance).all()

def get_exam_instance_by_id(db, exam_id):
    return db.query(ExamInstance).filter(ExamInstance.id == exam_id).first()

def create_exam_instance(db, exam_data):
    exam = ExamInstance(**exam_data)
    db.add(exam)
    db.commit()
    db.refresh(exam)
    return exam

def delete_exam_instance(db, exam_id):
    exam = db.query(ExamInstance).filter(ExamInstance.id == exam_id).first()
    if exam:
        db.delete(exam)
        db.commit()
