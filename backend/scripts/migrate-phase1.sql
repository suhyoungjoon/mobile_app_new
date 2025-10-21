-- Phase 1 Migration: Equipment Inspection Tables
-- 실행일: 2025-10-21
-- 목적: 장비점검 기능을 위한 데이터베이스 스키마 확장

-- 1. 기존 테이블 수정
-- household 테이블에 user_type 컬럼 추가
ALTER TABLE household 
ADD COLUMN user_type TEXT DEFAULT 'resident' 
CHECK (user_type IN ('resident','company','admin'));

-- case_header 테이블의 type 제약조건 확장
ALTER TABLE case_header DROP CONSTRAINT case_header_type_check;
ALTER TABLE case_header 
ADD CONSTRAINT case_header_type_check 
CHECK (type IN ('하자접수','추가접수','장비점검','종합점검'));

-- 2. 새로운 테이블 생성
-- 점검 항목 공통 테이블
CREATE TABLE inspection_item (
  id TEXT PRIMARY KEY,
  case_id TEXT REFERENCES case_header(id),
  type TEXT CHECK (type IN ('thermal','air','radon','level')),
  location TEXT NOT NULL,
  trade TEXT,
  note TEXT,
  result TEXT CHECK (result IN ('normal','check','na')),
  created_at TIMESTAMP DEFAULT now()
);

-- 공기질 측정 테이블
CREATE TABLE air_measure (
  id SERIAL PRIMARY KEY,
  item_id TEXT REFERENCES inspection_item(id),
  tvoc DECIMAL(5,2),
  hcho DECIMAL(5,2),
  co2 DECIMAL(5,2),
  unit_tvoc TEXT DEFAULT 'mg/m³',
  unit_hcho TEXT DEFAULT 'mg/m³',
  created_at TIMESTAMP DEFAULT now()
);

-- 라돈 측정 테이블
CREATE TABLE radon_measure (
  id SERIAL PRIMARY KEY,
  item_id TEXT REFERENCES inspection_item(id),
  radon DECIMAL(8,2),
  unit_radon TEXT CHECK (unit_radon IN ('Bq/m³','pCi/L')),
  created_at TIMESTAMP DEFAULT now()
);

-- 레벨기 측정 테이블
CREATE TABLE level_measure (
  id SERIAL PRIMARY KEY,
  item_id TEXT REFERENCES inspection_item(id),
  left_mm DECIMAL(5,1),
  right_mm DECIMAL(5,1),
  created_at TIMESTAMP DEFAULT now()
);

-- 열화상 사진 테이블
CREATE TABLE thermal_photo (
  id TEXT PRIMARY KEY,
  item_id TEXT REFERENCES inspection_item(id),
  file_url TEXT NOT NULL,
  caption TEXT,
  shot_at TIMESTAMP DEFAULT now()
);

-- 3. 인덱스 생성
CREATE INDEX idx_inspection_case ON inspection_item(case_id);
CREATE INDEX idx_inspection_type ON inspection_item(type);
CREATE INDEX idx_air_measure_item ON air_measure(item_id);
CREATE INDEX idx_radon_measure_item ON radon_measure(item_id);
CREATE INDEX idx_level_measure_item ON level_measure(item_id);
CREATE INDEX idx_thermal_photo_item ON thermal_photo(item_id);

-- 4. 샘플 데이터 삽입 (테스트용)
-- 기존 복합체가 있는지 확인 후 샘플 데이터 삽입
INSERT INTO inspection_item (id, case_id, type, location, trade, note, result)
SELECT 
  'sample-thermal-001',
  c.id,
  'thermal',
  '거실',
  '마감',
  '열화상 촬영 완료',
  'normal'
FROM case_header c 
WHERE c.type = '하자접수' 
LIMIT 1;

-- 마이그레이션 완료 로그
INSERT INTO admin_user (email, password_hash, name, role) 
VALUES ('migration@system', 'migration-completed', 'Phase1-Migration', 'admin')
ON CONFLICT (email) DO NOTHING;
