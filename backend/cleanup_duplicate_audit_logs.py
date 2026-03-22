"""
One-time script to clean up duplicate audit log entries.
This script finds and removes identical audit logs that share the exact same
grade_id, new_value, changed_by, and timestamp, keeping only one.

Usage:
    python cleanup_duplicate_audit_logs.py

Run this script once to clean up existing duplicates, then delete it.
"""

import os
import sys

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal, GradeAuditLog


def cleanup_duplicate_audit_logs():
    """Find and remove duplicate audit log entries."""
    db = SessionLocal()
    
    try:
        # Find duplicate groups: same grade_id, new_value, changed_by, and timestamp (rounded to second)
        # We use a subquery to find the minimum ID in each duplicate group
        # and keep only those
        
        print("Finding duplicate audit log entries...")
        
        # Get all audit logs ordered by timestamp descending
        all_logs = db.query(GradeAuditLog).order_by(GradeAuditLog.timestamp.desc()).all()
        
        # Track seen combinations to identify duplicates
        # Key: (grade_id, new_value, changed_by, timestamp_second)
        # Value: list of log IDs to keep/delete
        seen_combinations = {}
        logs_to_delete = []
        
        for log in all_logs:
            # Round timestamp to second for comparison
            timestamp_second = log.timestamp.strftime('%Y-%m-%d %H:%M:%S') if log.timestamp else None
            
            if timestamp_second:
                key = (log.grade_id, log.new_value, log.changed_by, timestamp_second)
                
                if key in seen_combinations:
                    # This is a duplicate - mark for deletion
                    logs_to_delete.append(log.id)
                else:
                    # First occurrence - keep it
                    seen_combinations[key] = log.id
        
        print(f"Found {len(logs_to_delete)} duplicate entries to remove")
        
        if logs_to_delete:
            # Delete duplicates in batches
            batch_size = 100
            total_deleted = 0
            
            for i in range(0, len(logs_to_delete), batch_size):
                batch = logs_to_delete[i:i + batch_size]
                deleted = db.query(GradeAuditLog).filter(
                    GradeAuditLog.id.in_(batch)
                ).delete(synchronize_session=False)
                db.commit()
                total_deleted += deleted
                print(f"Deleted batch {i//batch_size + 1}: {deleted} entries")
            
            print(f"\nTotal duplicates removed: {total_deleted}")
        else:
            print("No duplicate entries found.")
        
        # Show remaining count
        remaining = db.query(GradeAuditLog).count()
        print(f"Remaining audit log entries: {remaining}")
        
        return True
        
    except Exception as e:
        print(f"Error during cleanup: {e}")
        db.rollback()
        return False
    finally:
        db.close()


if __name__ == "__main__":
    print("=" * 60)
    print("Audit Log Duplicate Cleanup Script")
    print("=" * 60)
    print()
    
    success = cleanup_duplicate_audit_logs()
    
    if success:
        print("\nCleanup completed successfully!")
    else:
        print("\nCleanup failed. Check error messages above.")
        sys.exit(1)
