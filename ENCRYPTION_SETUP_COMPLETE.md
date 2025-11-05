# 🔒 개인정보 암호화 설정 완료 가이드

## ✅ 완료된 작업

### 1. 암호화 유틸리티 생성 ✅
- `backend/utils/encryption.js` - 암호화/복호화 함수 구현

### 2. 암호화 키 생성 스크립트 ✅
- `backend/scripts/generate-encryption-key.js` - 암호화 키 생성

### 3. 데이터베이스 마이그레이션 스크립트 ✅
- `backend/scripts/migrate-encrypt-personal-data.sql` - 스키마 변경
- `backend/scripts/migrate-encrypt-personal-data.js` - 데이터 마이그레이션

### 4. API 코드 수정 ✅
- `backend/routes/auth.js` - 저장 시 암호화, 조회 시 복호화
- `backend/routes/push-notifications.js` - 조회 시 복호화
- `backend/routes/inspector-registration.js` - 저장 시 암호화, 조회 시 복호화

---

## 📋 다음 단계 (수동 작업 필요)

### 1단계: 암호화 키 생성 및 설정

#### 암호화 키 생성
```bash
cd backend
node scripts/generate-encryption-key.js
```

#### Render 환경변수 설정
1. Render Dashboard 접속
2. 해당 서비스 선택 → Environment
3. "Add Environment Variable" 클릭
4. Key: `ENCRYPTION_KEY`
5. Value: 생성된 키 값 (예: `322345b76e54ff5b66faad8afaae5ff4cff4f85ac1930173e0a2e95de2bb308c`)
6. "Save Changes" 클릭
7. 서비스 재배포

⚠️ **중요**: 키를 안전하게 보관하세요. 키 분실 시 데이터 복호화 불가능!

---

### 2단계: 데이터베이스 스키마 업데이트

#### SQL 스크립트 실행
Render PostgreSQL에 접속하여 다음 SQL 실행:

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

또는 Render PostgreSQL Dashboard에서 직접 실행:
1. Render Dashboard → PostgreSQL → Query
2. 위 SQL 복사하여 실행

---

### 3단계: 기존 데이터 암호화 마이그레이션

#### Node.js 스크립트 실행
```bash
# 로컬에서 실행 (DATABASE_URL 환경변수 필요)
cd backend
DATABASE_URL="<Render PostgreSQL 연결 문자열>" ENCRYPTION_KEY="<생성한 키>" node scripts/migrate-encrypt-personal-data.js
```

또는 Render 서비스에서 실행:
1. Render Dashboard → 해당 서비스 → Shell
2. 다음 명령 실행:
```bash
cd backend
node scripts/migrate-encrypt-personal-data.js
```

---

### 4단계: 테스트

#### 암호화 기능 테스트
1. **새 사용자 등록 테스트**
   - 로그인 시도
   - 데이터베이스에서 암호화된 필드 확인

2. **기존 데이터 조회 테스트**
   - 로그인 후 사용자 정보 조회
   - 복호화가 정상적으로 작동하는지 확인

3. **점검원 등록 테스트**
   - 점검원 등록 신청
   - 관리자 페이지에서 조회
   - 암호화/복호화 확인

---

## 🔍 검증 방법

### 데이터베이스에서 확인
```sql
-- 암호화된 데이터 확인 (암호화된 필드는 랜덤 문자열로 표시됨)
SELECT 
  id, 
  resident_name,  -- 평문 (기존 데이터)
  resident_name_encrypted,  -- 암호화된 데이터 (IV:암호문 형식)
  phone,
  phone_encrypted
FROM household
LIMIT 5;

-- inspector_registration 확인
SELECT 
  id,
  inspector_name,
  inspector_name_encrypted,
  phone,
  phone_encrypted,
  email,
  email_encrypted
FROM inspector_registration
LIMIT 5;
```

### API 응답 확인
- 로그인 API 호출 시 사용자 정보가 정상적으로 반환되는지 확인
- 점검원 등록 조회 시 개인정보가 정상적으로 복호화되는지 확인

---

## ⚠️ 주의사항

### 1. 키 관리
- **절대 Git에 커밋하지 마세요!**
- 환경변수로만 관리
- 키 백업 필수 (안전한 곳에 보관)

### 2. 마이그레이션 전 백업
- 데이터베이스 백업 필수
- 마이그레이션 실패 시 롤백 가능하도록 준비

### 3. 점진적 전환
- 현재 코드는 암호화된 필드와 평문 필드를 모두 지원
- 기존 데이터가 평문이어도 정상 작동
- 마이그레이션 후에도 호환성 유지

### 4. 기존 컬럼 삭제 (선택사항)
마이그레이션이 완료되고 모든 데이터가 암호화된 것을 확인한 후:

```sql
-- ⚠️ 백업 후 실행!
-- ALTER TABLE household DROP COLUMN resident_name;
-- ALTER TABLE household DROP COLUMN phone;
-- ALTER TABLE inspector_registration DROP COLUMN inspector_name;
-- ALTER TABLE inspector_registration DROP COLUMN phone;
-- ALTER TABLE inspector_registration DROP COLUMN email;
```

---

## 📊 구현 상태

| 항목 | 상태 | 비고 |
|------|------|------|
| 암호화 유틸리티 | ✅ 완료 | `backend/utils/encryption.js` |
| 키 생성 스크립트 | ✅ 완료 | `backend/scripts/generate-encryption-key.js` |
| 마이그레이션 스크립트 | ✅ 완료 | `backend/scripts/migrate-encrypt-personal-data.js` |
| API 코드 수정 | ✅ 완료 | auth, push-notifications, inspector-registration |
| 환경변수 설정 | ⚠️ 필요 | Render Dashboard에서 수동 설정 |
| 스키마 업데이트 | ⚠️ 필요 | PostgreSQL에서 SQL 실행 |
| 데이터 마이그레이션 | ⚠️ 필요 | 스크립트 실행 |

---

## 🎯 완료 체크리스트

- [ ] 암호화 키 생성
- [ ] Render 환경변수에 `ENCRYPTION_KEY` 설정
- [ ] 데이터베이스 스키마 업데이트 (컬럼 추가)
- [ ] 기존 데이터 암호화 마이그레이션 실행
- [ ] 새 사용자 등록 테스트 (암호화 확인)
- [ ] 기존 데이터 조회 테스트 (복호화 확인)
- [ ] 점검원 등록 테스트 (암호화/복호화 확인)

---

## 💡 문제 해결

### 암호화 키가 설정되지 않았습니다
- Render Dashboard → Environment에서 `ENCRYPTION_KEY` 확인
- 서비스 재배포 필요

### 복호화 실패 오류
- 암호화 키가 올바른지 확인
- 데이터가 암호화되었는지 확인 (암호화된 필드에 `:` 문자가 포함되어야 함)

### 마이그레이션 실패
- 데이터베이스 연결 확인
- 스키마가 업데이트되었는지 확인
- 백업 후 재시도

---

**모든 설정이 완료되면 개인정보가 데이터베이스에 암호화되어 저장됩니다!** 🔒

