CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    email TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS game_results (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    game_type TEXT NOT NULL,
    game_name TEXT NOT NULL,
    difficulty TEXT NOT NULL,
    score NUMERIC(5,2) NOT NULL,
    has_dyslexia BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS results (
    id BIGSERIAL PRIMARY KEY,
    session_id TEXT,
    name TEXT,
    age INT,
    grade INT,
    score INT,
    total INT,
    accuracy DOUBLE PRECISION,
    risk TEXT,
    fixation_mean_dur DOUBLE PRECISION,
    regressions_count INT,
    reading_speed_wpm DOUBLE PRECISION,
    "timestamp" TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dyslexia_sessions (
    session_id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    game_type TEXT NOT NULL,
    difficulty TEXT NOT NULL,
    score INTEGER NOT NULL,
    total INTEGER NOT NULL CHECK (total > 0),
    accuracy DOUBLE PRECISION NOT NULL CHECK (accuracy >= 0 AND accuracy <= 1),
    fixation_mean_dur DOUBLE PRECISION NOT NULL,
    regressions_count INTEGER NOT NULL CHECK (regressions_count >= 0),
    reading_speed_wpm DOUBLE PRECISION NOT NULL CHECK (reading_speed_wpm >= 0),
    risk TEXT,
    risk_score DOUBLE PRECISION,
    ml_prediction INTEGER,
    "timestamp" TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dyslexia_user_id ON dyslexia_sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_dyslexia_game_type ON dyslexia_sessions (game_type);

CREATE TABLE IF NOT EXISTS parents (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS parent_student_map (
    id BIGSERIAL PRIMARY KEY,
    parent_id BIGINT NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (parent_id, student_id)
);

-- Indexes for parent_student_map
-- Look up all children for a parent  → GET /api/parent/children
CREATE INDEX IF NOT EXISTS idx_psm_parent_id      ON parent_student_map (parent_id);
-- Look up all parents for a student  → ownership validation
CREATE INDEX IF NOT EXISTS idx_psm_student_id     ON parent_student_map (student_id);
-- Composite covering the full ownership check (parent_id, student_id)
CREATE INDEX IF NOT EXISTS idx_psm_parent_student ON parent_student_map (parent_id, student_id);

CREATE TABLE IF NOT EXISTS admin (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'admin' CHECK (role IN ('superadmin', 'admin')),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);




-- 1) See all tables
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- 2) Check key column datatypes (important)
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name IN ('users', 'dyslexia_sessions', 'parent_student_map', 'parents', 'admin')
  AND column_name IN ('id', 'user_id', 'student_id', 'parent_id')
ORDER BY table_name, column_name;

-- 3) Check foreign keys are present
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name IN ('dyslexia_sessions', 'parent_student_map')
ORDER BY tc.table_name, kcu.column_name;