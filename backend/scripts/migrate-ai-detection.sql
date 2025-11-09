-- AI 자동 판정 설정 테이블 생성
CREATE TABLE IF NOT EXISTS ai_detection_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  mode TEXT NOT NULL DEFAULT 'hybrid' CHECK (mode IN ('hybrid', 'azure', 'local', 'huggingface')),
  provider TEXT NOT NULL DEFAULT 'azure',
  azure_enabled BOOLEAN NOT NULL DEFAULT true,
  local_enabled BOOLEAN NOT NULL DEFAULT true,
  azure_fallback_threshold REAL NOT NULL DEFAULT 0.8,
  local_base_confidence REAL NOT NULL DEFAULT 0.65,
  max_detections INTEGER NOT NULL DEFAULT 3,
  huggingface_enabled BOOLEAN NOT NULL DEFAULT false,
  huggingface_model TEXT DEFAULT 'microsoft/resnet-50',
  rules JSONB,
  updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE ai_detection_settings
  ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'azure';

ALTER TABLE ai_detection_settings
  ADD COLUMN IF NOT EXISTS huggingface_enabled BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE ai_detection_settings
  ADD COLUMN IF NOT EXISTS huggingface_model TEXT DEFAULT 'microsoft/resnet-50';

ALTER TABLE ai_detection_settings
  ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL DEFAULT 'hybrid';

ALTER TABLE ai_detection_settings
  ADD COLUMN IF NOT EXISTS rules JSONB;

UPDATE ai_detection_settings
SET provider = COALESCE(provider, 'azure');

INSERT INTO ai_detection_settings (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

