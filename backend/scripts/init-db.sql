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

-- 하자 표준 데이터베이스 테이블
CREATE TABLE IF NOT EXISTS defect_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT NOT NULL,
  solution TEXT,
  severity VARCHAR(20) CHECK (severity IN ('경미','보통','심각')),
  category VARCHAR(50), -- '벽체','바닥','천장','도장','타일','기타'
  created_at TIMESTAMP DEFAULT NOW()
);

-- 하자별 동영상 매핑 테이블
CREATE TABLE IF NOT EXISTS defect_videos (
  id SERIAL PRIMARY KEY,
  defect_category_id INTEGER REFERENCES defect_categories(id) ON DELETE CASCADE,
  youtube_video_id VARCHAR(50),
  youtube_url VARCHAR(200),
  title TEXT,
  description TEXT,
  timestamp_start INTEGER DEFAULT 0, -- 시작 시간 (초)
  timestamp_end INTEGER, -- 종료 시간 (초)
  is_primary BOOLEAN DEFAULT FALSE, -- 주요 확인 동영상 여부
  created_at TIMESTAMP DEFAULT NOW()
);

-- AI 예측 결과 저장 테이블
CREATE TABLE IF NOT EXISTS ai_predictions (
  id SERIAL PRIMARY KEY,
  image_path TEXT NOT NULL,
  predicted_defect_id INTEGER REFERENCES defect_categories(id),
  confidence_score DECIMAL(3,2),
  bbox_coordinates JSONB, -- [x, y, width, height]
  photo_type VARCHAR(20), -- 'near' or 'far'
  household_id INTEGER REFERENCES household(id) ON DELETE CASCADE,
  model_version VARCHAR(50) DEFAULT 'tensorflow-js-v1.0',
  prediction_timestamp TIMESTAMP DEFAULT NOW(),
  
  -- 사용자 검증 결과
  user_confirmed BOOLEAN DEFAULT NULL,
  actual_defect_id INTEGER REFERENCES defect_categories(id),
  verified_at TIMESTAMP,
  
  -- 학습 데이터 플래그
  is_training_data BOOLEAN DEFAULT FALSE
);

-- AI 피드백 테이블
CREATE TABLE IF NOT EXISTS ai_feedback (
  id SERIAL PRIMARY KEY,
  prediction_id INTEGER REFERENCES ai_predictions(id) ON DELETE CASCADE,
  household_id INTEGER REFERENCES household(id) ON DELETE CASCADE,
  is_correct BOOLEAN NOT NULL,
  feedback_text TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 모델 성능 추적 테이블
CREATE TABLE IF NOT EXISTS model_performance (
  id SERIAL PRIMARY KEY,
  model_version VARCHAR(50),
  accuracy_score DECIMAL(4,3),
  precision_score DECIMAL(4,3),
  recall_score DECIMAL(4,3),
  f1_score DECIMAL(4,3),
  training_dataset_size INTEGER,
  test_dataset_size INTEGER,
  training_date TIMESTAMP DEFAULT NOW(),
  notes TEXT
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
CREATE INDEX IF NOT EXISTS idx_defect_categories_name ON defect_categories(name);
CREATE INDEX IF NOT EXISTS idx_defect_categories_category ON defect_categories(category);
CREATE INDEX IF NOT EXISTS idx_defect_videos_category ON defect_videos(defect_category_id);
CREATE INDEX IF NOT EXISTS idx_ai_predictions_household ON ai_predictions(household_id);
CREATE INDEX IF NOT EXISTS idx_ai_predictions_verified ON ai_predictions(verified_at);
CREATE INDEX IF NOT EXISTS idx_ai_predictions_training ON ai_predictions(is_training_data);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_prediction ON ai_feedback(prediction_id);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_household ON ai_feedback(household_id);
CREATE INDEX IF NOT EXISTS idx_model_performance_version ON model_performance(model_version);

-- Sample data for testing
INSERT INTO complex (name, address) VALUES 
('서울 인싸이트자이', '서울시 강남구 테헤란로 123'),
('부산 해운대 뷰', '부산시 해운대구 해운대로 456')
ON CONFLICT (name) DO NOTHING;

-- 하자 카테고리 샘플 데이터
INSERT INTO defect_categories (name, description, solution, severity, category) VALUES 
('벽지찢김', '벽체부위 벽지파손은 위치별 크기별로 다르나 보수로 처리가능한', '벽지 교체 또는 부분 보수', '보통', '벽체'),
('벽균열', '벽체에 발생한 균열로 건물의 구조적 문제를 나타낼 수 있음', '균열 폭과 깊이에 따라 구조보수 또는 표면처리', '심각', '벽체'),
('마루판들뜸', '바닥 마루판이 들뜨거나 움직이는 현상', '마루판 재시공 또는 접착제 보강', '보통', '바닥'),
('타일균열', '타일 표면 또는 접합부에 발생한 균열', '타일 교체 또는 시공재 시공', '보통', '타일'),
('페인트벗겨짐', '도장 표면이 벗겨지거나 박리되는 현상', '표면 정리 후 재도장', '경미', '도장'),
('천장누수', '천장에서 물이 스며나오거나 누수 흔적이 보임', '누수 원인 파악 후 방수처리', '심각', '천장'),
('욕실곰팡이', '욕실 벽면이나 천장에 발생한 곰팡이', '곰팡이 제거 후 방습처리', '보통', '욕실'),
('문틀변형', '문틀이 변형되어 문이 제대로 닫히지 않음', '문틀 교체 또는 보정', '보통', '기타'),
('콘센트불량', '콘센트가 제대로 작동하지 않거나 느슨함', '전기공사 필요', '심각', '기타'),
('창문잠금불량', '창문 잠금장치가 제대로 작동하지 않음', '잠금장치 교체', '보통', '기타')
ON CONFLICT (name) DO NOTHING;

-- 하자별 동영상 샘플 데이터 (YouTube URL 예시)
INSERT INTO defect_videos (defect_category_id, youtube_video_id, youtube_url, title, description, timestamp_start, timestamp_end, is_primary) VALUES 
(1, 'USQGTW34lO8', 'https://youtu.be/USQGTW34lO8', '벽지 보수 방법', '벽지 찢김 현상 확인 및 보수 방법', 0, 300, TRUE),
(2, 'USQGTW34lO8', 'https://youtu.be/USQGTW34lO8', '벽균열 진단', '벽균열의 원인과 진단 방법', 300, 600, TRUE),
(3, 'USQGTW34lO8', 'https://youtu.be/USQGTW34lO8', '마루판 보수', '마루판 들뜸 현상 및 보수 방법', 600, 900, TRUE)
ON CONFLICT DO NOTHING;

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
