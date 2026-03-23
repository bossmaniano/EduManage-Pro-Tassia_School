"""
One-time script to patch existing audit log timestamps.
Adds 3 hours to all existing timestamps to convert from UTC to EAT (Nairobi).

Usage:
    python patch_audit_timestamps.py

Run this script once to fix existing data, then delete it.
"""

import os
import sys

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal, GradeAuditLog
from datetime import timedelta

def patch_audit_timestamps():
    """Add 3 hours to all existing audit log timestamps."""
    db = SessionLocal()
    
    try:
        print("Patching audit log timestamps...")
        
        # Get all audit logs
        all_logs = db.query(GradeAuditLog).all()
        
        if not all_logs:
            print("No audit logs found.")
            return True
        
        patched_count = 0
        for log in all_logs:
            if log.timestamp:
                # Add 3 hours to convert UTC to EAT
                log.timestamp = log.timestamp + timedelta(hours=3)
                patched_count += 1
        
        db.commit()
        print(f"Successfully patched {patched_count} audit log timestamps.")
        
        # Show a few examples
        sample_logs = db.query(GradeAuditLog).limit(3).all()
        print("\nSample timestamps after patch:")
        for log in sample_logs:
            print(f"  - {log.timestamp}")
        
        return True
        
    except Exception as e:
        print(f"Error during patch: {e}")
        db.rollback()
        return False
    finally:
        db.close()


if __name__ == "__main__":
    print("=" * 60)
    print("Audit Log Timestamp Patch Script")
    print("Adds 3 hours to convert UTC timestamps to EAT (Nairobi)")
    print("=" * 60)
    print()
    
    success = patch_audit_timestamps()
    
    if success:
        print("\nPatch completed successfully!")
    else:
        print("\nPatch failed. Check error messages above.")
        sys.exit(1)
