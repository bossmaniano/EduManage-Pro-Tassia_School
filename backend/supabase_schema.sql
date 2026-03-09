-- Supabase Database Schema for EduManage Pro
-- Run this in Supabase SQL Editor

-- Drop existing tables if they exist (to start fresh)
DROP TABLE IF EXISTS grades CASCADE;
DROP TABLE IF EXISTS students CASCADE;
DROP TABLE IF EXISTS exam_instances CASCADE;
DROP TABLE IF EXISTS classes CASCADE;
DROP TABLE IF EXISTS subjects CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('Admin', 'Teacher')),
    assigned_subjects TEXT[] DEFAULT '{}',
    assigned_classes TEXT[] DEFAULT '{}'
);

-- Students table
CREATE TABLE students (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    class_id TEXT
);

-- Subjects table
CREATE TABLE subjects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    rubric TEXT DEFAULT ''
);

-- Classes table
CREATE TABLE classes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    academic_year TEXT NOT NULL,
    subjects TEXT[] DEFAULT '{}'
);

-- Exam instances table
CREATE TABLE exam_instances (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL
);

-- Grades table
CREATE TABLE grades (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL,
    subject_id TEXT NOT NULL,
    score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
    comment TEXT DEFAULT '',
    date TEXT NOT NULL,
    exam_instance_id TEXT,
    is_locked BOOLEAN DEFAULT FALSE,
    submitted_by TEXT
);

-- Insert initial data
-- First, insert all users
INSERT INTO users (id, username, password_hash, role, assigned_subjects, assigned_classes) VALUES
('u-001', 'admin123', 'scrypt:32768:8:1$sOXDC3DdFYx1T8uE$3e4e764a9ba4c6152bffed9f4c893326f201324b7e28bfb09f2394902a1e322ffb40272e6838c84211c3e4b7dd5fdd739663b1fa89cfa75a31571fe04727184f', 'Admin', '{}', '{}'),
('u-002', 'teacher_math', 'scrypt:32768:8:1$Pttujz2OhavDbPHz$795401ecb3527639e5b8a481fea173976d63592cb1ec17aec8e2091cd6dd45f03458c024a3e2b8917b17edcb3ddb7be29fb8c2e7966087a1d5076c65a5f17b70', 'Teacher', ARRAY['sub-001'], '{}'),
('u-003', 'teacher_eng', 'scrypt:32768:8:1$HisS5SUNGnsZ4Iox$4beb546a23c25dc2a8e18b677d77e4017a8b57c1b837e274ccc4fc3cc56409ede0062f9be1cb198b65fe7c763e61a385757e01260cd2c31d6df6b62143460561', 'Teacher', ARRAY['sub-002'], '{}'),
('u-66a33148', 'teacher_kiswahili', 'scrypt:32768:8:1$soOvoKdCdmFX2uZ2$aeba0f517a8037dc14746d2f160458919a0744d31dc06dd45b3f0f98f989e3208e44bcd08657ff9665d001d177740e8a5cbb0bb6ef7c7a4a13f4e7e4a22d590f', 'Teacher', ARRAY['sub-005'], ARRAY['class-d77688', 'class-004', 'class-003', 'class-002']),
('u-665b22b6', 'viola', 'scrypt:32768:8:1$tbT01SolwJuBROqO$2364df9d3db9b07b3e70aa369a8b1e6d0bc918fbc292c5557043d40ea71159e35d31abe900c56b29ab386c48a9fb8175ee4130b21d4e4ec1f9d4f473412be93e', 'Teacher', ARRAY['sub-005', 'sub-004'], ARRAY['class-002', 'class-003', 'class-004', 'class-d77688', 'class-c4376c', 'class-d87896', 'class-5e6127', 'class-963936', 'class-42a1cf', 'class-2dd46c']),
('u-e09c1bad', 'sammy', 'scrypt:32768:8:1$EwZe9StjBBbOKgcY$f7efe693ce73c63dba7d948bad23da24ef26cce4cda507250fd18a5d763ec68bf5f25d21f6c41a9e9c09cddabfce485f3b8997ab77f4571da5cc3a71f9415f17', 'Teacher', ARRAY['sub-001', 'sub-005', 'sub-41df6cf3'], ARRAY['class-c4376c', 'class-d87896', 'class-5e6127', 'class-963936', 'class-42a1cf', 'class-2dd46c', 'class-eb0511']);

-- Insert subjects
INSERT INTO subjects (id, name, rubric) VALUES
('sub-001', 'Mathematics', 'Standard Math Rubric'),
('sub-002', 'English', 'Language Arts Rubric'),
('sub-004', 'Kiswahili', ''),
('sub-005', 'Integrated science', ''),
('sub-75ab6c9f', 'Creative Arts & Sports', ''),
('sub-41df6cf3', 'Pre-technical studies', ''),
('sub-8e64bde2', 'Social Studies', ''),
('sub-5fc2f6b1', 'Religious Studies', '');

-- Insert exam instances
INSERT INTO exam_instances (id, name) VALUES
('exam-001', 'Term 1 Final Exam, 2025'),
('exam-3f43338d', 'END TERM 1 2026');

-- Insert classes
INSERT INTO classes (id, name, academic_year, subjects) VALUES
('class-c4376c', 'grade 9 red', '2026', ARRAY['sub-001', 'sub-002', 'sub-004', 'sub-005', 'sub-75ab6c9f', 'sub-41df6cf3', 'sub-8e64bde2']),
('class-d87896', 'grade 8 red', '2026', ARRAY['sub-001', 'sub-002', 'sub-004', 'sub-005', 'sub-75ab6c9f', 'sub-41df6cf3', 'sub-8e64bde2', 'sub-5fc2f6b1']),
('class-5e6127', 'grade 8 blue', '2026', ARRAY['sub-001', 'sub-002', 'sub-004', 'sub-005', 'sub-75ab6c9f', 'sub-41df6cf3', 'sub-8e64bde2', 'sub-5fc2f6b1']),
('class-963936', 'grade 7 blue', '2026', '{}'),
('class-42a1cf', 'grade 7 red', '2026', '{}'),
('class-2dd46c', 'grade 7 green', '2026', '{}'),
('class-eb0511', 'grade 9 blue', '2026', ARRAY['sub-001', 'sub-002', 'sub-004', 'sub-005', 'sub-75ab6c9f', 'sub-41df6cf3', 'sub-8e64bde2', 'sub-5fc2f6b1']);

-- Insert students
INSERT INTO students (id, name, class_id) VALUES
('fb0841d9-47b9-4101-bfe0-ad312f4134c3', 'rowlands onyango', 'class-d87896'),
('5b991fdd-567f-42c6-898b-3f53aabcae6b', 'viola faith', 'class-d87896'),
('1377ad88-ef58-436e-83ac-d9c42c56f1d9', 'sammy', 'class-d87896'),
('4cf69c88-c621-4a77-9e02-29d85b0807b6', 'ian', 'class-c4376c');

-- Insert grades
INSERT INTO grades (id, student_id, subject_id, score, comment, date, exam_instance_id, is_locked, submitted_by) VALUES
('d297c1bd-ff74-47d5-840f-9e884364d41c', '5b991fdd-567f-42c6-898b-3f53aabcae6b', 'sub-004', 81, 'Very good performance', '2026-03-08', 'exam-3f43338d', TRUE, 'u-665b22b6'),
('0f43b940-008f-4a93-a9e2-d94977f7f744', 'fb0841d9-47b9-4101-bfe0-ad312f4134c3', 'sub-004', 90, 'Exceptional performance', '2026-03-08', 'exam-3f43338d', TRUE, 'u-665b22b6'),
('3c84d3a0-bb6c-491c-863d-e8e887290e7b', '4cf69c88-c621-4a77-9e02-29d85b0807b6', 'sub-001', 56, 'Fair performance', '2026-03-09', 'exam-3f43338d', TRUE, 'u-e09c1bad'),
('2523f501-e8ef-433d-aaa9-cbd32d48bfc6', '1377ad88-ef58-436e-83ac-d9c42c56f1d9', 'sub-001', 85, 'Very good performance', '2026-03-09', 'exam-3f43338d', TRUE, 'u-e09c1bad'),
('7643ab24-d1fc-4f2a-a1aa-e5207dc1a8ee', '5b991fdd-567f-42c6-898b-3f53aabcae6b', 'sub-001', 78, 'Very good performance', '2026-03-09', 'exam-3f43338d', TRUE, 'u-e09c1bad'),
('dbee4fc3-b269-440d-b2ed-2064ec8a2feb', 'fb0841d9-47b9-4101-bfe0-ad312f4134c3', 'sub-001', 60, 'Good performance', '2026-03-09', 'exam-3f43338d', TRUE, 'u-e09c1bad');
