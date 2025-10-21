-- 점검원 등록 시스템 마이그레이션 스크립트
-- Phase 4: Inspector Registration System

-- Inspector Registration System 테이블 생성
CREATE TABLE IF NOT EXISTS inspector_registration (
  id SERIAL PRIMARY KEY,
  complex_id INTEGER REFERENCES complex(id),
  dong TEXT NOT NULL,
  ho TEXT NOT NULL,
  inspector_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  company_name TEXT,
  license_number TEXT,
  email TEXT,
  registration_reason TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  approved_by INTEGER REFERENCES admin_user(id),
  approved_at TIMESTAMP,
  rejection_reason TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- 점검원 등록 관련 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_inspector_registration_status ON inspector_registration(status);
CREATE INDEX IF NOT EXISTS idx_inspector_registration_complex ON inspector_registration(complex_id);
CREATE INDEX IF NOT EXISTS idx_inspector_registration_created ON inspector_registration(created_at);

-- 샘플 점검원 등록 데이터 삽입 (테스트용)
INSERT INTO inspector_registration (
  complex_id, dong, ho, inspector_name, phone, company_name, 
  license_number, email, registration_reason, status
) VALUES (
  (SELECT id FROM complex LIMIT 1),
  '101',
  '1205',
  '김점검',
  '010-5555-5555',
  'ABC 점검회사',
  '12345',
  'kim@abc.com',
  '장비점검 업무를 위해 등록을 신청합니다.',
  'pending'
) ON CONFLICT DO NOTHING;

INSERT INTO inspector_registration (
  complex_id, dong, ho, inspector_name, phone, company_name, 
  license_number, email, registration_reason, status
) VALUES (
  (SELECT id FROM complex LIMIT 1),
  '102',
  '1206',
  '이점검',
  '010-6666-6666',
  'XYZ 점검회사',
  '67890',
  'lee@xyz.com',
  '열화상 및 공기질 측정 업무를 위해 등록을 신청합니다.',
  'pending'
) ON CONFLICT DO NOTHING;

-- 마이그레이션 완료 로그
DO $$
BEGIN
  RAISE NOTICE '점검원 등록 시스템 마이그레이션 완료';
  RAISE NOTICE '새로 생성된 테이블: inspector_registration';
  RAISE NOTICE '새로 생성된 인덱스: 3개';
  RAISE NOTICE '샘플 데이터: 2건 삽입';
END $$;
