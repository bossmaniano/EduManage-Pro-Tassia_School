"""
Migrate subjects from store.json to the database.
Run once: python migrate_subjects.py
"""

import json
import os
import sys

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal, Subject, create_subject

STORE_PATH = os.path.join(os.path.dirname(__file__), 'store.json')

def migrate_subjects():
    # Read from store.json
    with open(STORE_PATH, 'r') as f:
        store = json.load(f)

    # Get database session
    db = SessionLocal()

    try:
        migrated_count = 0
        # Migrate subjects
        for subject in store.get('subjects', []):
            # Check if subject already exists
            existing = db.query(Subject).filter(Subject.id == subject['id']).first()
            if not existing:
                create_subject(db, {
                    'id': subject['id'],
                    'name': subject['name'],
                    'rubric': subject.get('rubric', '')
                })
                migrated_count += 1
                print(f'Migrated: {subject["name"]}')
        
        if migrated_count > 0:
            print(f'\nMigration complete! {migrated_count} subjects migrated.')
        else:
            print('No subjects to migrate - all subjects already exist in database.')
    except Exception as e:
        print(f'Error: {e}')
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    migrate_subjects()
