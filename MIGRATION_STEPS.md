# 🔒 암호화 마이그레이션 실행 단계

## ✅ 준비 완료 사항

1. ✅ 암호화 키 생성 완료
2. ✅ 마이그레이션 스크립트 준비 완료
3. ✅ API 코드 암호화/복호화 적용 완료

---

## 📋 실행 단계

### 1단계: Render 환경변수 설정 (필수)

**생성된 키:**
```
ENCRYPTION_KEY=340ce907d643ca05061abfc11727595a14a41c6665e7b40d37351b712dcaed6e
```

**설정 방법:**
1. Render Dashboard → 백엔드 서비스 → **Environment**
2. **"Add Environment Variable"** 클릭
3. Key: `ENCRYPTION_KEY`
4. Value: 위의 키 값 입력
5. **"Save Changes"** 클릭

**확인:**
- 환경변수 목록에 `ENCRYPTION_KEY`가 표시되는지 확인

---

### 2단계: 데이터베이스 스키마 업데이트 (필수)

**Render PostgreSQL Dashboard에서 실행:**

1. Render Dashboard → PostgreSQL 서비스 선택
2. **"Query"** 탭 클릭
3. 다음 SQL 복사하여 실행:

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

**확인:**
- "Success. No rows returned" 메시지 확인
- 또는 "column already exists" 메시지 (이미 실행한 경우)

---

### 3단계: 데이터 마이그레이션 실행 (필수)

#### 방법 A: Render Shell 사용 (권장)

1. Render Dashboard → 백엔드 서비스 → **Shell** 탭 클릭
2. Shell이 열리면 다음 명령 실행:

```bash
cd backend
node scripts/migrate-encrypt-personal-data.js
```

**예상 출력:**
```
🔒 개인정보 암호화 마이그레이션 시작
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 1단계: household 테이블 암호화
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   발견된 세대 수: X
   진행 중... 10/X
   진행 중... 20/X
✅ household 테이블 암호화 완료: X개

📋 2단계: inspector_registration 테이블 암호화
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   발견된 등록 신청 수: Y
✅ inspector_registration 테이블 암호화 완료: Y개

📋 3단계: 암호화 검증
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   household: X/X 암호화됨
   inspector_registration: Y/Y 암호화됨

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ 마이그레이션 완료!
```

#### 방법 B: 로컬에서 실행

**DATABASE_URL 확인:**
- Render Dashboard → PostgreSQL → **Internal Database URL** 복사

**실행:**
```bash
cd backend
export DATABASE_URL="<복사한_URL>"
export ENCRYPTION_KEY="340ce907d643ca05061abfc11727595a14a41c6665e7b40d37351b712dcaed6e"
node scripts/migrate-encrypt-personal-data.js
```

---

### 4단계: 마이그레이션 검증

**데이터베이스에서 확인:**

Render PostgreSQL Dashboard → Query 탭에서 실행:

```sql
-- 암호화된 데이터 확인
SELECT 
  id, 
  resident_name,  -- 평문 (기존)
  resident_name_encrypted,  -- 암호화된 데이터 (랜덤 문자열)
  phone,
  phone_encrypted
FROM household
WHERE resident_name_encrypted IS NOT NULL
LIMIT 3;
```

**예상 결과:**
- `resident_name_encrypted`: 랜덤 문자열 (예: `a1b2c3d4e5f6...:1234567890abcdef...`)
- `phone_encrypted`: 랜덤 문자열 (예: `f6e5d4c3b2a1...:fedcba9876543210...`)

**inspector_registration 확인:**
```sql
SELECT 
  id,
  inspector_name,
  inspector_name_encrypted,
  phone,
  phone_encrypted
FROM inspector_registration
WHERE inspector_name_encrypted IS NOT NULL
LIMIT 3;
```

---

### 5단계: API 테스트

#### 테스트 1: 새 사용자 등록
1. 프론트엔드에서 새 사용자로 로그인
2. 데이터베이스에서 암호화된 필드 확인

#### 테스트 2: 기존 데이터 조회
1. 기존 사용자로 로그인
2. API 응답에서 개인정보 정상 반환 확인
3. 데이터베이스에서 복호화 확인

---

## ✅ 완료 체크리스트

- [ ] 1단계: Render 환경변수에 `ENCRYPTION_KEY` 설정
- [ ] 2단계: 데이터베이스 스키마 업데이트 (컬럼 추가)
- [ ] 3단계: 데이터 마이그레이션 실행
- [ ] 4단계: 데이터베이스에서 암호화 확인
- [ ] 5단계: API 테스트 (새 사용자 등록)
- [ ] 6단계: API 테스트 (기존 데이터 조회)

---

## 🐛 문제 해결

### "ENCRYPTION_KEY가 설정되지 않았습니다"
- Render Dashboard → Environment에서 `ENCRYPTION_KEY` 확인
- 서비스 재배포 필요

### "컬럼이 이미 존재합니다"
- 정상입니다. `IF NOT EXISTS`로 안전하게 처리됩니다.

### "마이그레이션 실패"
- 데이터베이스 연결 확인
- 스키마가 업데이트되었는지 확인
- 백업 후 재시도

---

## 📊 마이그레이션 완료 후

모든 단계를 완료하면:
- ✅ 새로 저장되는 개인정보는 자동으로 암호화됨
- ✅ 조회 시 자동으로 복호화됨
- ✅ 기존 평문 데이터도 정상 작동 (호환성 유지)

---

**모든 단계를 완료하면 개인정보가 암호화되어 저장됩니다!** 🔒

