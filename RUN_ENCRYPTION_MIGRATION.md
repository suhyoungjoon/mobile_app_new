# 🔒 개인정보 암호화 마이그레이션 실행 가이드

## 📋 사전 준비

### 1. 암호화 키 생성
```bash
cd backend
node scripts/generate-encryption-key.js
```

**생성된 키:**
```
ENCRYPTION_KEY=340ce907d643ca05061abfc11727595a14a41c6665e7b40d37351b712dcaed6e
```

### 2. Render 환경변수 설정

#### Render Dashboard에서 설정:
1. Render Dashboard 접속
2. 백엔드 서비스 선택 → **Environment** 탭
3. **"Add Environment Variable"** 클릭
4. Key: `ENCRYPTION_KEY`
5. Value: `340ce907d643ca05061abfc11727595a14a41c6665e7b40d37351b712dcaed6e`
6. **"Save Changes"** 클릭
7. 서비스 재배포 (자동으로 재배포될 수 있음)

---

## 🔧 마이그레이션 실행 방법

### 방법 1: Render Shell 사용 (권장)

#### 1단계: Render Shell 접속
1. Render Dashboard → 백엔드 서비스
2. **"Shell"** 탭 클릭
3. Shell이 열리면 다음 명령 실행:

#### 2단계: 스키마 업데이트
```sql
-- Render PostgreSQL Dashboard → Query 탭에서 실행
-- 또는 Shell에서 psql 사용

ALTER TABLE household 
ADD COLUMN IF NOT EXISTS resident_name_encrypted TEXT,
ADD COLUMN IF NOT EXISTS phone_encrypted TEXT;

ALTER TABLE inspector_registration
ADD COLUMN IF NOT EXISTS inspector_name_encrypted TEXT,
ADD COLUMN IF NOT EXISTS phone_encrypted TEXT,
ADD COLUMN IF NOT EXISTS email_encrypted TEXT;
```

#### 3단계: 데이터 마이그레이션
```bash
# Shell에서 실행
cd backend
node scripts/migrate-encrypt-personal-data.js
```

---

### 방법 2: 로컬에서 실행 (DATABASE_URL 필요)

#### 1단계: DATABASE_URL 확인
Render Dashboard → PostgreSQL → **Internal Database URL** 복사

#### 2단계: 환경변수 설정
```bash
export DATABASE_URL="postgresql://user:password@host:port/database"
export ENCRYPTION_KEY="340ce907d643ca05061abfc11727595a14a41c6665e7b40d37351b712dcaed6e"
```

#### 3단계: 스키마 업데이트
Render PostgreSQL Dashboard → Query 탭에서 SQL 실행:
```sql
ALTER TABLE household 
ADD COLUMN IF NOT EXISTS resident_name_encrypted TEXT,
ADD COLUMN IF NOT EXISTS phone_encrypted TEXT;

ALTER TABLE inspector_registration
ADD COLUMN IF NOT EXISTS inspector_name_encrypted TEXT,
ADD COLUMN IF NOT EXISTS phone_encrypted TEXT,
ADD COLUMN IF NOT EXISTS email_encrypted TEXT;
```

#### 4단계: 데이터 마이그레이션
```bash
cd backend
node scripts/migrate-encrypt-personal-data.js
```

---

## ✅ 마이그레이션 검증

### 데이터베이스에서 확인
```sql
-- 암호화된 데이터 확인
SELECT 
  id, 
  resident_name,  -- 평문 (기존)
  resident_name_encrypted,  -- 암호화된 데이터
  phone,
  phone_encrypted
FROM household
WHERE resident_name_encrypted IS NOT NULL
LIMIT 5;

-- inspector_registration 확인
SELECT 
  id,
  inspector_name,
  inspector_name_encrypted,
  phone,
  phone_encrypted
FROM inspector_registration
WHERE inspector_name_encrypted IS NOT NULL
LIMIT 5;
```

### API 테스트
1. 새 사용자 등록
2. 데이터베이스에서 암호화된 필드 확인
3. API 응답에서 개인정보 정상 반환 확인

---

## ⚠️ 주의사항

### 백업 필수
- 마이그레이션 전 데이터베이스 백업 필수
- Render PostgreSQL Dashboard → Backups에서 백업 생성

### 점진적 전환
- 현재 코드는 암호화된 필드와 평문 필드를 모두 지원
- 기존 데이터가 평문이어도 정상 작동
- 마이그레이션 후에도 호환성 유지

### 키 관리
- **절대 Git에 커밋하지 마세요!**
- 환경변수로만 관리
- 키 백업 필수 (안전한 곳에 보관)

---

## 🐛 문제 해결

### "ENCRYPTION_KEY가 설정되지 않았습니다"
- Render Dashboard → Environment에서 `ENCRYPTION_KEY` 확인
- 서비스 재배포 필요

### "DATABASE_URL이 설정되지 않았습니다"
- Render PostgreSQL → Internal Database URL 확인
- 환경변수로 설정

### "복호화 실패"
- 암호화 키가 올바른지 확인
- 데이터가 암호화되었는지 확인 (암호화된 필드에 `:` 문자가 포함되어야 함)

### "컬럼이 이미 존재합니다"
- 정상입니다. `IF NOT EXISTS`로 안전하게 처리됩니다.

---

## 📊 마이그레이션 상태 확인

### 완료 체크리스트
- [ ] 암호화 키 생성
- [ ] Render 환경변수에 `ENCRYPTION_KEY` 설정
- [ ] 데이터베이스 스키마 업데이트 (컬럼 추가)
- [ ] 기존 데이터 암호화 마이그레이션 실행
- [ ] 데이터베이스에서 암호화 확인
- [ ] API 테스트 (새 사용자 등록)
- [ ] API 테스트 (기존 데이터 조회)

---

**모든 단계를 완료하면 개인정보가 암호화되어 저장됩니다!** 🔒

