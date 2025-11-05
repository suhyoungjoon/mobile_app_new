# 🔒 보안 개선 작업 가이드

## 🚨 긴급 수정 사항 (1주일 내 완료 필요)

### 1단계: 로그 개인정보 마스킹

#### 작업 내용
1. `backend/utils/logger.js` 파일이 생성되었습니다.
2. 모든 라우트 파일에서 `console.log` 대신 `safeLog` 사용

#### 수정할 파일 목록
- `backend/routes/auth.js`
- `backend/routes/push-notifications.js`
- `backend/routes/inspector-registration.js`
- 기타 개인정보를 로그에 남기는 파일

#### 예시: auth.js 수정
```javascript
// 수정 전
console.log('🆕 신규 세대 등록:', { complex, dong, ho, name });
console.log('🔄 세대 정보 업데이트:', { name, phone });

// 수정 후
const { safeLog } = require('../utils/logger');
safeLog('info', '신규 세대 등록', { complex, dong, ho, name });
safeLog('info', '세대 정보 업데이트', { name, phone });
```

---

### 2단계: JWT 토큰 최소화

#### 작업 내용
1. `backend/routes/auth.js`에서 JWT 페이로드 수정
2. 프론트엔드에서 필요한 정보는 별도 API로 조회

#### 수정 코드
```javascript
// 수정 전
const token = jwt.sign(
  { 
    householdId, 
    complex, dong, ho, name, phone, // ❌ 개인정보 포함
    user_type,
    purpose: 'precheck'
  },
  config.jwt.secret,
  { expiresIn: config.jwt.expiresIn }
);

// 수정 후
const token = jwt.sign(
  { 
    householdId,
    user_type,
    purpose: 'precheck'
    // ✅ 최소 정보만 포함
  },
  config.jwt.secret,
  { expiresIn: config.jwt.expiresIn }
);

// 사용자 정보는 별도 API로 제공
res.json({
  token,
  user: {
    householdId,
    complex,
    dong,
    ho,
    name,
    phone,
    user_type
  },
  purpose: 'precheck',
  expires_at: expiresAt.toISOString()
});
```

#### 추가 작업
- 프론트엔드에서 토큰 디코딩 로직 제거
- 사용자 정보 조회 API 엔드포인트 추가 (필요 시)

---

### 3단계: 개인정보 암호화

#### 작업 내용
1. 암호화 키 생성
2. `backend/utils/encryption.js` 파일이 생성되었습니다.
3. 데이터베이스 스키마 업데이트 (암호화 필드 추가)
4. 기존 데이터 마이그레이션

#### 암호화 키 생성
```bash
cd backend
node -e "const crypto = require('crypto'); console.log('ENCRYPTION_KEY=' + crypto.randomBytes(32).toString('hex'));"
```

#### 환경변수 설정
Render Dashboard → Environment에 추가:
```
ENCRYPTION_KEY=<생성된_키>
```

#### 데이터베이스 마이그레이션
```sql
-- 암호화된 필드 추가
ALTER TABLE household 
ADD COLUMN resident_name_encrypted TEXT,
ADD COLUMN phone_encrypted TEXT;

-- inspector_registration 테이블
ALTER TABLE inspector_registration
ADD COLUMN inspector_name_encrypted TEXT,
ADD COLUMN phone_encrypted TEXT,
ADD COLUMN email_encrypted TEXT;
```

#### 마이그레이션 스크립트
```javascript
// backend/scripts/migrate-encrypt-personal-data.js
const pool = require('../database');
const { encrypt } = require('../utils/encryption');

async function migrateEncryptData() {
  // 1. household 테이블 암호화
  const households = await pool.query('SELECT id, resident_name, phone FROM household');
  
  for (const household of households.rows) {
    await pool.query(
      `UPDATE household 
       SET resident_name_encrypted = $1, phone_encrypted = $2
       WHERE id = $3`,
      [
        encrypt(household.resident_name || ''),
        encrypt(household.phone || ''),
        household.id
      ]
    );
  }
  
  // 2. inspector_registration 테이블 암호화
  // ... 동일한 방식으로 진행
}
```

---

### 4단계: HTTPS 강제

#### 작업 내용
`backend/server.js`에 추가:

```javascript
// HTTPS 강제 리다이렉트 (프로덕션 환경)
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    // X-Forwarded-Proto 헤더 확인 (Vercel, Render 등 프록시 환경)
    if (req.header('x-forwarded-proto') !== 'https') {
      res.redirect(`https://${req.header('host')}${req.url}`);
    } else {
      next();
    }
  });
  
  // HSTS 헤더 설정 (선택)
  app.use((req, res, next) => {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    next();
  });
}
```

---

## 📋 개선 작업 체크리스트

### 긴급 (1주일 내)
- [ ] 로그 개인정보 마스킹 적용
- [ ] JWT 토큰에서 개인정보 제거
- [ ] 암호화 키 생성 및 환경변수 설정
- [ ] 개인정보 암호화 구현
- [ ] 데이터 마이그레이션 실행
- [ ] HTTPS 강제 적용

### 중요 (2주일 내)
- [ ] 자동 삭제 스케줄러 구현
- [ ] 접근 제어 강화
- [ ] 감사 로그 구현

### 권장 (1개월 내)
- [ ] 개인정보 처리방침 문서 작성
- [ ] 이용약관 작성
- [ ] 정기 보안 감사 계획 수립

---

## 🔧 구현 우선순위

### 1순위: 로그 개인정보 마스킹 (가장 쉬움)
- 소요 시간: 1-2시간
- 영향: 즉시 개인정보 노출 방지

### 2순위: JWT 토큰 최소화 (중간)
- 소요 시간: 2-3시간
- 영향: 토큰 탈취 시 피해 최소화

### 3순위: 개인정보 암호화 (복잡)
- 소요 시간: 1-2일
- 영향: 데이터베이스 유출 시 피해 방지

---

## ⚠️ 주의사항

### 암호화 키 관리
- **절대 Git에 커밋하지 마세요!**
- 환경변수로만 관리
- 키 분실 시 데이터 복호화 불가능

### 마이그레이션 시 주의
- 백업 후 진행
- 테스트 환경에서 먼저 실행
- 롤백 계획 준비

---

**이 가이드에 따라 작업을 진행하면 개인정보 보안을 크게 개선할 수 있습니다!** 🔒

