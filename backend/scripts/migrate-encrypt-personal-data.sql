-- 개인정보 암호화 마이그레이션 스크립트
-- 실행 전 반드시 백업을 수행하세요!

-- 1. household 테이블에 암호화된 필드 추가
ALTER TABLE household 
ADD COLUMN IF NOT EXISTS resident_name_encrypted TEXT,
ADD COLUMN IF NOT EXISTS phone_encrypted TEXT;

-- 2. inspector_registration 테이블에 암호화된 필드 추가
ALTER TABLE inspector_registration
ADD COLUMN IF NOT EXISTS inspector_name_encrypted TEXT,
ADD COLUMN IF NOT EXISTS phone_encrypted TEXT,
ADD COLUMN IF NOT EXISTS email_encrypted TEXT;

-- 3. 마이그레이션 완료 후 기존 컬럼 삭제 (주의: 데이터 백업 후 실행)
-- ALTER TABLE household DROP COLUMN resident_name;
-- ALTER TABLE household DROP COLUMN phone;
-- ALTER TABLE inspector_registration DROP COLUMN inspector_name;
-- ALTER TABLE inspector_registration DROP COLUMN phone;
-- ALTER TABLE inspector_registration DROP COLUMN email;

-- 참고: 실제 암호화는 Node.js 스크립트로 수행합니다.

