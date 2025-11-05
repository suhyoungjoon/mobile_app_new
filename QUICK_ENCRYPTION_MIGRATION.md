# ⚡ 빠른 암호화 마이그레이션 가이드

## 🚀 빠른 실행 (3단계)

### 1단계: 암호화 키 생성 및 설정

**생성된 키:**
```
ENCRYPTION_KEY=340ce907d643ca05061abfc11727595a14a41c6665e7b40d37351b712dcaed6e
```

**Render Dashboard에서 설정:**
1. Render Dashboard → 백엔드 서비스 → **Environment**
2. **"Add Environment Variable"** 클릭
3. Key: `ENCRYPTION_KEY`
4. Value: `340ce907d643ca05061abfc11727595a14a41c6665e7b40d37351b712dcaed6e`
5. **"Save Changes"** 클릭

---

### 2단계: 데이터베이스 스키마 업데이트

**Render PostgreSQL Dashboard → Query 탭에서 실행:**

```sql
-- household 테이블에 암호화된 필드 추가
ALTER TABLE household 
ADD COLUMN IF NOT EXISTS resident_name_encrypted TEXT,
ADD COLUMN IF NOT EXISTS phone_encrypted TEXT;

-- inspector_registration 테이블에 암호화된 필드 추가
ALTER TABLE inspector_registration
ADD COLUMN IF NOT EXISTS inspector_name_encrypted TEXT,
ADD COLUMN IF NOT EXISTS phone_encrypted TEXT,
ADD COLUMN IF NOT EXISTS email_encrypted TEXT;
```

**실행 확인:**
- "Success. No rows returned" 메시지 확인

---

### 3단계: 데이터 마이그레이션 실행

**방법 A: Render Shell 사용 (권장)**
1. Render Dashboard → 백엔드 서비스 → **Shell** 탭
2. 다음 명령 실행:
```bash
cd backend
node scripts/migrate-encrypt-personal-data.js
```

**방법 B: 로컬에서 실행**
```bash
cd backend
export DATABASE_URL="<Render PostgreSQL Internal Database URL>"
export ENCRYPTION_KEY="340ce907d643ca05061abfc11727595a14a41c6665e7b40d37351b712dcaed6e"
node scripts/migrate-encrypt-personal-data.js
```

---

## ✅ 완료 확인

### 데이터베이스 확인
```sql
-- 암호화된 데이터 확인
SELECT 
  id, 
  resident_name,
  resident_name_encrypted,
  phone,
  phone_encrypted
FROM household
WHERE resident_name_encrypted IS NOT NULL
LIMIT 3;
```

**예상 결과:**
- `resident_name_encrypted`: 랜덤 문자열 (IV:암호문 형식)
- `phone_encrypted`: 랜덤 문자열 (IV:암호문 형식)

---

## 📋 체크리스트

- [ ] 암호화 키 생성 완료
- [ ] Render 환경변수에 `ENCRYPTION_KEY` 설정
- [ ] 데이터베이스 스키마 업데이트 (컬럼 추가)
- [ ] 데이터 마이그레이션 실행
- [ ] 데이터베이스에서 암호화 확인
- [ ] API 테스트 (새 사용자 등록 → 암호화 확인)
- [ ] API 테스트 (기존 데이터 조회 → 복호화 확인)

---

## ⚠️ 중요 사항

1. **백업 필수**: 마이그레이션 전 데이터베이스 백업
2. **키 보관**: 암호화 키를 안전한 곳에 보관 (분실 시 복호화 불가)
3. **점진적 전환**: 기존 평문 데이터도 정상 작동 (호환성 유지)

---

**모든 단계를 완료하면 개인정보가 암호화되어 저장됩니다!** 🔒

