-- InsightI Database Initialization Script
-- PostgreSQL 12+ required

-- Create database (run as postgres user)
-- CREATE DATABASE insighti_db;

-- Connect to insighti_db and run the following:

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Core tables
CREATE TABLE IF NOT EXISTS complex (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  address TEXT,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS household (
  id SERIAL PRIMARY KEY,
  complex_id INTEGER REFERENCES complex(id) ON DELETE CASCADE,
  dong TEXT NOT NULL,
  ho TEXT NOT NULL,
  resident_name TEXT,
  phone TEXT,
  created_at TIMESTAMP DEFAULT now(),
  UNIQUE(complex_id, dong, ho)
);

CREATE TABLE IF NOT EXISTS access_token (
  id SERIAL PRIMARY KEY,
  household_id INTEGER REFERENCES household(id) ON DELETE CASCADE,
  purpose TEXT CHECK (purpose IN ('precheck','postcheck')) NOT NULL,
  token TEXT UNIQUE NOT NULL,
  starts_at TIMESTAMP NOT NULL,
  ends_at TIMESTAMP NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','expired','revoked')),
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS case_header (
  id TEXT PRIMARY KEY,
  household_id INTEGER REFERENCES household(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('하자접수','추가접수')) NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS defect (
  id TEXT PRIMARY KEY,
  case_id TEXT REFERENCES case_header(id) ON DELETE CASCADE,
  location TEXT NOT NULL,
  trade TEXT NOT NULL,
  content TEXT NOT NULL,
  memo TEXT,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS photo (
  id TEXT PRIMARY KEY,
  defect_id TEXT REFERENCES defect(id) ON DELETE CASCADE,
  kind TEXT CHECK (kind IN ('near','far')) NOT NULL,
  url TEXT NOT NULL,
  thumb_url TEXT,
  taken_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS report (
  id SERIAL PRIMARY KEY,
  household_id INTEGER REFERENCES household(id) ON DELETE CASCADE,
  case_id TEXT REFERENCES case_header(id) ON DELETE CASCADE,
  pdf_url TEXT,
  status TEXT CHECK (status IN ('created','sent','failed')) DEFAULT 'created',
  sent_to TEXT,
  sent_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_household_complex ON household(complex_id);
CREATE INDEX IF NOT EXISTS idx_case_household ON case_header(household_id);
CREATE INDEX IF NOT EXISTS idx_defect_case ON defect(case_id);
CREATE INDEX IF NOT EXISTS idx_photo_defect ON photo(defect_id);
CREATE INDEX IF NOT EXISTS idx_report_household ON report(household_id);
CREATE INDEX IF NOT EXISTS idx_report_case ON report(case_id);
CREATE INDEX IF NOT EXISTS idx_access_token_household ON access_token(household_id);
CREATE INDEX IF NOT EXISTS idx_access_token_status ON access_token(status);

-- Sample data for testing
INSERT INTO complex (name, address) VALUES 
('서울 인싸이트자이', '서울시 강남구 테헤란로 123'),
('부산 해운대 뷰', '부산시 해운대구 해운대로 456')
ON CONFLICT (name) DO NOTHING;

-- Get complex IDs for sample households
DO $$
DECLARE
    complex1_id INTEGER;
    complex2_id INTEGER;
BEGIN
    SELECT id INTO complex1_id FROM complex WHERE name = '서울 인싸이트자이';
    SELECT id INTO complex2_id FROM complex WHERE name = '부산 해운대 뷰';
    
    -- Sample households
    INSERT INTO household (complex_id, dong, ho, resident_name, phone) VALUES 
    (complex1_id, '101', '1203', '홍길동', '010-1234-5678'),
    (complex1_id, '102', '1501', '김철수', '010-2345-6789'),
    (complex2_id, '201', '0802', '이영희', '010-3456-7890')
    ON CONFLICT (complex_id, dong, ho) DO NOTHING;
END $$;

-- Sample case and defect data
DO $$
DECLARE
    household1_id INTEGER;
    household2_id INTEGER;
BEGIN
    -- Get household IDs
    SELECT h.id INTO household1_id 
    FROM household h 
    JOIN complex c ON h.complex_id = c.id 
    WHERE c.name = '서울 인싸이트자이' AND h.dong = '101' AND h.ho = '1203';
    
    SELECT h.id INTO household2_id 
    FROM household h 
    JOIN complex c ON h.complex_id = c.id 
    WHERE c.name = '서울 인싸이트자이' AND h.dong = '102' AND h.ho = '1501';
    
    -- Sample cases
    INSERT INTO case_header (id, household_id, type) VALUES 
    ('CASE-24001', household1_id, '하자접수'),
    ('CASE-24002', household2_id, '하자접수')
    ON CONFLICT (id) DO NOTHING;
    
    -- Sample defects
    INSERT INTO defect (id, case_id, location, trade, content, memo) VALUES 
    ('DEF-1', 'CASE-24001', '거실', '바닥재', '마루판 들뜸', '현장 확인 필요'),
    ('DEF-2', 'CASE-24001', '주방', '타일', '타일 균열', ''),
    ('DEF-3', 'CASE-24002', '욕실', '도장', '페인트 벗겨짐', '습기 문제 의심')
    ON CONFLICT (id) DO NOTHING;
END $$;

-- Grant permissions (adjust as needed)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO insighti_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO insighti_user;

COMMIT;
