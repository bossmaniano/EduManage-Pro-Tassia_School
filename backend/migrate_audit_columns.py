"""
Migration script to add audit columns (updated_by, updated_at) to the grades table.
Run this script once to migrate existing data.
"""

import os
import sys
from sqlalchemy import create_engine, text
from datetime import datetime

# Get database URL
DATABASE_URL = os.environ.get('DATABASE_URL')

if not DATABASE_URL:
    print("ERROR: DATABASE_URL not set. Please set the environment variable.")
    sys.exit(1)

def migrate_audit_columns():
    """Add audit columns to grades table with default values for existing rows."""
    engine = create_engine(DATABASE_URL)
    
    with engine.connect() as conn:
        # Check if columns already exist
        result = conn.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'grades' AND column_name IN ('updated_by', 'updated_at')
        """))
        existing_columns = [row[0] for row in result]
        
        if 'updated_by' in existing_columns:
            print("✓ updated_by column already exists")
        else:
            print("Adding updated_by column...")
            conn.execute(text("""
                ALTER TABLE grades 
                ADD COLUMN updated_by VARCHAR DEFAULT 'System/Pre-Migration'
            """))
            print("✓ updated_by column added with default 'System/Pre-Migration'")
        
        if 'updated_at' in existing_columns:
            print("✓ updated_at column already exists")
        else:
            print("Adding updated_at column...")
            conn.execute(text("""
                ALTER TABLE grades 
                ADD COLUMN updated_at TIMESTAMP DEFAULT NOW()
            """))
            print("✓ updated_at column added with default NOW()")
        
        # Also create the grade_audit_log table if it doesn't exist
        result = conn.execute(text("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_name = 'grade_audit_log'
        """))
        
        if result.fetchone():
            print("✓ grade_audit_log table already exists")
        else:
            print("Creating grade_audit_log table...")
            conn.execute(text("""
                CREATE TABLE grade_audit_log (
                    id VARCHAR PRIMARY KEY,
                    grade_id VARCHAR NOT NULL REFERENCES grades(id),
                    old_value INTEGER DEFAULT 0,
                    new_value INTEGER DEFAULT 0,
                    changed_by VARCHAR DEFAULT '',
                    timestamp TIMESTAMP DEFAULT NOW()
                )
            """))
            print("✓ grade_audit_log table created")
            
            # Create index for faster queries
            conn.execute(text("""
                CREATE INDEX idx_grade_audit_log_grade_id ON grade_audit_log(grade_id)
            """))
            print("✓ Index created on grade_audit_log.grade_id")
        
        conn.commit()
        print("\n✅ Migration completed successfully!")

if __name__ == "__main__":
    print("=" * 50)
    print("Audit Columns Migration")
    print("=" * 50)
    migrate_audit_columns()
