-- Push Notification System Database Schema
-- 푸시 알림 시스템을 위한 데이터베이스 스키마

-- 푸시 구독 정보 테이블
CREATE TABLE IF NOT EXISTS push_subscription (
  id SERIAL PRIMARY KEY,
  household_id INTEGER REFERENCES household(id) ON DELETE CASCADE,
  complex_id INTEGER REFERENCES complex(id),
  dong TEXT NOT NULL,
  ho TEXT NOT NULL,
  name TEXT NOT NULL,
  user_type TEXT NOT NULL CHECK (user_type IN ('resident','company','admin','super_admin')),
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  UNIQUE(household_id, endpoint)
);

-- 푸시 알림 발송 이력 테이블
CREATE TABLE IF NOT EXISTS push_notification_log (
  id SERIAL PRIMARY KEY,
  household_id INTEGER REFERENCES household(id),
  notification_type TEXT NOT NULL CHECK (notification_type IN (
    'defect-registered',
    'inspection-completed', 
    'inspector-decision',
    'report-generated',
    'test'
  )),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB,
  sent_at TIMESTAMP DEFAULT now(),
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent','failed','delivered')),
  error_message TEXT
);

-- 푸시 알림 설정 테이블 (사용자별 알림 설정)
CREATE TABLE IF NOT EXISTS push_notification_settings (
  id SERIAL PRIMARY KEY,
  household_id INTEGER REFERENCES household(id) ON DELETE CASCADE,
  defect_notifications BOOLEAN DEFAULT true,
  inspection_notifications BOOLEAN DEFAULT true,
  inspector_notifications BOOLEAN DEFAULT true,
  report_notifications BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  UNIQUE(household_id)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_push_subscription_household ON push_subscription(household_id);
CREATE INDEX IF NOT EXISTS idx_push_subscription_user_type ON push_subscription(user_type);
CREATE INDEX IF NOT EXISTS idx_push_subscription_endpoint ON push_subscription(endpoint);
CREATE INDEX IF NOT EXISTS idx_push_notification_log_household ON push_notification_log(household_id);
CREATE INDEX IF NOT EXISTS idx_push_notification_log_type ON push_notification_log(notification_type);
CREATE INDEX IF NOT EXISTS idx_push_notification_log_sent ON push_notification_log(sent_at);
CREATE INDEX IF NOT EXISTS idx_push_notification_settings_household ON push_notification_settings(household_id);

-- 샘플 데이터 삽입 (테스트용)
INSERT INTO push_notification_settings (household_id, defect_notifications, inspection_notifications, inspector_notifications, report_notifications)
SELECT 
  h.id,
  CASE 
    WHEN h.user_type = 'resident' THEN true
    ELSE false
  END as defect_notifications,
  CASE 
    WHEN h.user_type IN ('company', 'admin', 'super_admin') THEN true
    ELSE false
  END as inspection_notifications,
  CASE 
    WHEN h.user_type = 'resident' THEN true
    ELSE false
  END as inspector_notifications,
  true as report_notifications
FROM household h
WHERE NOT EXISTS (
  SELECT 1 FROM push_notification_settings pns WHERE pns.household_id = h.id
);

-- 마이그레이션 완료 로그
DO $$
BEGIN
  RAISE NOTICE 'Push notification system database schema created successfully';
  RAISE NOTICE 'Tables created: push_subscription, push_notification_log, push_notification_settings';
  RAISE NOTICE 'Indexes created: 6 indexes for optimal performance';
  RAISE NOTICE 'Sample data inserted: notification settings for all households';
END $$;
