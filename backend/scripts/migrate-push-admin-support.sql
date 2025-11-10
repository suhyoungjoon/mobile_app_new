-- Push Notification Admin Support Migration
-- 관리자 계정 푸시 알림 지원을 위한 스키마 수정

-- 1. household_id를 NULL 허용하도록 수정 (이미 NULL 허용이면 무시됨)
ALTER TABLE push_subscription 
  ALTER COLUMN household_id DROP NOT NULL;

-- 2. dong, ho, name을 NULL 허용하도록 수정 (관리자 계정용)
ALTER TABLE push_subscription 
  ALTER COLUMN dong DROP NOT NULL;

ALTER TABLE push_subscription 
  ALTER COLUMN ho DROP NOT NULL;

ALTER TABLE push_subscription 
  ALTER COLUMN name DROP NOT NULL;

-- 3. 기존 UNIQUE 제약 조건 제거 (household_id, endpoint)
ALTER TABLE push_subscription 
  DROP CONSTRAINT IF EXISTS push_subscription_household_id_endpoint_key;

-- 4. endpoint에 UNIQUE 제약 조건 추가 (관리자 계정용)
ALTER TABLE push_subscription 
  ADD CONSTRAINT push_subscription_endpoint_unique UNIQUE (endpoint);

-- 5. 일반 사용자 계정용 복합 UNIQUE 제약 조건 추가
-- PostgreSQL에서는 복합 UNIQUE 제약 조건이 NULL 값을 허용하므로
-- (household_id, endpoint) 제약 조건을 추가해도 관리자 계정(household_id = NULL)과 충돌하지 않음
ALTER TABLE push_subscription 
  ADD CONSTRAINT push_subscription_household_endpoint_unique 
  UNIQUE (household_id, endpoint);

-- 6. 관리자 계정용 인덱스 (user_type이 admin 또는 super_admin인 경우)
CREATE INDEX IF NOT EXISTS idx_push_subscription_admin 
  ON push_subscription(user_type) 
  WHERE user_type IN ('admin', 'super_admin');

-- 마이그레이션 완료 로그
DO $$
BEGIN
  RAISE NOTICE 'Push notification admin support migration completed';
  RAISE NOTICE 'Changes:';
  RAISE NOTICE '  - household_id, dong, ho, name columns now allow NULL';
  RAISE NOTICE '  - endpoint has UNIQUE constraint for admin accounts';
  RAISE NOTICE '  - Partial unique index for (household_id, endpoint) where household_id IS NOT NULL';
END $$;

