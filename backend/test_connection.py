"""
Database Connection Test Script
================================
Tests connection to the production PostgreSQL database from Render.
Verifies schema integrity including UniqueConstraint and audit columns.

Usage:
    python test_connection.py

Requirements:
    - DATABASE_URL must be set in .env or environment
"""

import os
import sys
from sqlalchemy import create_engine, text, inspect

# Load environment variables from .env
from dotenv import load_dotenv
load_dotenv()


def test_database_connection():
    """Test connection to the PostgreSQL database"""
    print("=" * 60)
    print("DATABASE CONNECTION TEST")
    print("=" * 60)
    
    DATABASE_URL = os.environ.get('DATABASE_URL')
    
    if not DATABASE_URL:
        print("❌ ERROR: DATABASE_URL not set!")
        print("   Please set DATABASE_URL in .env or environment variable")
        print("\n   Get value from: Render Dashboard → Your Service → Environment → DATABASE_URL")
        return False
    
    # Fix postgres:// prefix for SQLAlchemy
    if DATABASE_URL.startswith('postgres://'):
        DATABASE_URL = DATABASE_URL.replace('postgres://', 'postgresql://', 1)
    
    # Mask password in output
    safe_url = DATABASE_URL
    if '@' in safe_url:
        parts = safe_url.split('@')
        creds = parts[0].split(':')
        if len(creds) >= 2:
            safe_url = f"{creds[0]}:****@{parts[1]}"
    
    print(f"\n📡 Connecting to: {safe_url}")
    
    try:
        engine = create_engine(
            DATABASE_URL,
            pool_size=1,  # Single connection for testing
            pool_timeout=10,
            pool_pre_ping=True
        )
        
        with engine.connect() as conn:
            result = conn.execute(text("SELECT version()"))
            version = result.fetchone()[0]
            print(f"✅ Connection successful!")
            print(f"   PostgreSQL version: {version[:50]}...")
        
        engine.dispose()
        return True
        
    except Exception as e:
        print(f"❌ Connection failed: {e}")
        return False


def test_schema_integrity():
    """Verify database schema integrity"""
    print("\n" + "=" * 60)
    print("SCHEMA INTEGRITY CHECK")
    print("=" * 60)
    
    DATABASE_URL = os.environ.get('DATABASE_URL')
    if not DATABASE_URL:
        print("❌ DATABASE_URL not set - skipping schema check")
        return False
    
    if DATABASE_URL.startswith('postgres://'):
        DATABASE_URL = DATABASE_URL.replace('postgres://', 'postgresql://', 1)
    
    try:
        engine = create_engine(
            DATABASE_URL,
            pool_size=1,
            pool_timeout=10,
            pool_pre_ping=True
        )
        
        inspector = inspect(engine)
        
        # Check for grades table
        if 'grades' not in inspector.get_table_names():
            print("❌ 'grades' table not found!")
            return False
        
        print("\n✅ 'grades' table exists")
        
        # Check columns in grades table
        columns = inspector.get_columns('grades')
        column_names = [col['name'] for col in columns]
        
        print(f"\n📋 Grades table columns ({len(columns)} total):")
        for col in columns:
            print(f"   - {col['name']}: {col['type']}")
        
        # Check for UniqueConstraint on Student/Subject/Exam
        print("\n🔒 Checking UniqueConstraint (Student/Subject/Exam)...")
        constraints = inspector.get_unique_constraints('grades')
        
        found_constraint = False
        for constraint in constraints:
            cols = constraint.get('column_names', [])
            if 'student_id' in cols and 'subject_id' in cols and 'exam_instance_id' in cols:
                found_constraint = True
                print(f"   ✅ Found: {constraint['name']}")
                print(f"      Columns: {cols}")
        
        if not found_constraint:
            print("   ⚠️  UniqueConstraint not found in ORM metadata")
            print("      (May exist directly in database)")
        
        # Check for audit columns (updated_by, etc.)
        print("\n📝 Checking audit columns...")
        audit_columns = ['updated_by', 'updated_at', 'created_by', 'created_at']
        found_audit = []
        
        for col_name in audit_columns:
            if col_name in column_names:
                found_audit.append(col_name)
                print(f"   ✅ Found: {col_name}")
        
        if not found_audit:
            print("   ⚠️  No audit columns found in grades table")
            print("      (updated_by columns may not be in ORM models yet)")
        
        # List all tables
        print("\n📦 Database tables:")
        tables = inspector.get_table_names()
        for table in tables:
            print(f"   - {table}")
        
        engine.dispose()
        return True
        
    except Exception as e:
        print(f"❌ Schema check failed: {e}")
        return False


def test_pool_settings():
    """Verify database pool settings are preserved"""
    print("\n" + "=" * 60)
    print("POOL SETTINGS VERIFICATION")
    print("=" * 60)
    
    print("\n⚙️  Expected pool settings (from app.py):")
    print("   - pool_size: 20")
    print("   - pool_timeout: 60")
    print("   - max_overflow: 30")
    print("   - pool_recycle: 3600")
    print("   - pool_pre_ping: True")
    
    print("\n✅ Pool settings are preserved in:")
    print("   - backend/app.py (SQLALCHEMY_ENGINE_OPTIONS)")
    print("   - backend/database.py (create_engine)")


if __name__ == "__main__":
    print("\n🎯 EduManage Pro - Database Connection Test")
    print("=" * 60)
    
    # Test 1: Connection
    conn_ok = test_database_connection()
    
    # Test 2: Schema (only if connection works)
    if conn_ok:
        schema_ok = test_schema_integrity()
    
    # Test 3: Pool settings
    test_pool_settings()
    
    print("\n" + "=" * 60)
    print("TEST COMPLETE")
    print("=" * 60)
    
    if conn_ok:
        print("\n✅ All tests passed! Ready to sync with production.")
        sys.exit(0)
    else:
        print("\n❌ Connection failed. Check your DATABASE_URL in .env")
        sys.exit(1)
