-- 모든 점검(육안/열화상/공기질/라돈/레벨기)에 이미지 2개 저장용 테이블
-- item_id = inspection_item.id, sort_order 0=첫번째 1=두번째 (최대 2개)
CREATE TABLE IF NOT EXISTS inspection_photo (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL REFERENCES inspection_item(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  caption TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_inspection_photo_item ON inspection_photo(item_id);
