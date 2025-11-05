# 🔒 InsightI 개인정보 보안 분석 보고서

## 📋 분석 범위
- 데이터베이스 스키마
- API 인증 및 권한 관리
- 데이터 전송 보안
- 로깅 및 감사 추적
- 개인정보 보관 및 관리
- 개인정보보호법 준수

---

## 🔴 심각한 보안 문제

### 1. 개인정보 로깅 노출 (🚨 긴급)

#### 문제점
```javascript
// backend/routes/auth.js
console.log('🆕 신규 세대 등록:', { complex, dong, ho, name });  // ❌ 이름 노출
console.log('🔄 세대 정보 업데이트:', { name, phone });          // ❌ 전화번호 노출
console.log('✅ 신규 세대 등록 완료:', householdId);

// backend/routes/push-notifications.js
console.log('✅ Push subscription registered:', {
  householdId,
  name,        // ❌ 이름 노출
  user_type,
  endpoint: subscription.endpoint.substring(0, 50) + '...'
});
```

#### 위험도
- **높음**: 로그 파일에 개인정보 평문 저장
- **영향**: 로그 접근 시 개인정보 유출 위험
- **규정 위반**: 개인정보보호법 위반 가능

#### 해결 방안
```javascript
// 개인정보 마스킹 함수 추가
function maskPersonalInfo(data) {
  if (data.phone) {
    data.phone = data.phone.replace(/(\d{3})-(\d{4})-(\d{4})/, '$1-****-$3');
  }
  if (data.name) {
    data.name = data.name.substring(0, 1) + '**';
  }
  return data;
}

// 사용 예시
console.log('🆕 신규 세대 등록:', maskPersonalInfo({ complex, dong, ho, name }));
```

---

### 2. JWT 토큰에 민감 정보 포함 (🚨 긴급)

#### 문제점
```javascript
// backend/routes/auth.js
const token = jwt.sign(
  { 
    householdId, 
    complex, 
    dong, 
    ho, 
    name,        // ❌ 개인정보 포함
    phone,       // ❌ 개인정보 포함
    user_type,
    purpose: 'precheck'
  },
  config.jwt.secret,
  { expiresIn: config.jwt.expiresIn }
);
```

#### 위험도
- **높음**: JWT 토큰은 Base64 인코딩으로 쉽게 디코딩 가능
- **영향**: 토큰 탈취 시 개인정보 즉시 노출
- **보안 원칙 위반**: 토큰에는 최소한의 정보만 포함해야 함

#### 해결 방안
```javascript
// JWT에는 식별자만 포함
const token = jwt.sign(
  { 
    householdId,
    user_type,
    purpose: 'precheck'
  },
  config.jwt.secret,
  { expiresIn: config.jwt.expiresIn }
);

// 필요한 경우 토큰 검증 후 DB에서 사용자 정보 조회
```

---

### 3. 개인정보 암호화 미적용 (🚨 긴급)

#### 문제점
```sql
-- 데이터베이스에 평문 저장
CREATE TABLE household (
  resident_name TEXT,  -- ❌ 평문
  phone TEXT,           -- ❌ 평문
  ...
);

CREATE TABLE inspector_registration (
  inspector_name TEXT NOT NULL,  -- ❌ 평문
  phone TEXT NOT NULL,            -- ❌ 평문
  email TEXT,                     -- ❌ 평문
  ...
);
```

#### 위험도
- **매우 높음**: 데이터베이스 접근 시 개인정보 즉시 노출
- **영향**: 
  - 데이터베이스 백업 유출 시 개인정보 전체 노출
  - DBA나 관리자 접근 시 개인정보 노출
- **규정 위반**: 개인정보보호법 제29조(안전조치의무) 위반

#### 해결 방안
```javascript
// 개인정보 암호화 미들웨어 추가
const crypto = require('crypto');

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // 32 bytes
const IV_LENGTH = 16; // For AES, this is always 16

function encrypt(text) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text) {
  const textParts = text.split(':');
  const iv = Buffer.from(textParts.shift(), 'hex');
  const encryptedText = Buffer.from(textParts.join(':'), 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}
```

---

### 4. 로그 파일에 개인정보 기록 (🚨 긴급)

#### 문제점
```javascript
// morgan('combined') - 모든 요청 로그 기록
app.use(morgan('combined'));
```

#### 위험도
- **높음**: 모든 HTTP 요청 로그에 개인정보 포함 가능
- **영향**: POST 요청 본문에 개인정보가 포함될 수 있음

#### 해결 방안
```javascript
// 개인정보 필터링 로깅 미들웨어
const morgan = require('morgan');

// 개인정보 필터링 함수
function filterPersonalInfo(body) {
  if (typeof body !== 'object') return body;
  const sensitive = ['phone', 'name', 'email', 'password', 'resident_name'];
  const filtered = { ...body };
  sensitive.forEach(key => {
    if (filtered[key]) {
      filtered[key] = '***FILTERED***';
    }
  });
  return filtered;
}

// 커스텀 로그 포맷
morgan.token('filtered-body', (req) => {
  if (req.body) {
    return JSON.stringify(filterPersonalInfo(req.body));
  }
  return '-';
});

app.use(morgan(':method :url :status :response-time ms - :filtered-body'));
```

---

## ⚠️ 중요한 보안 문제

### 5. 데이터 접근 제어 검증 부족

#### 현재 상태
- ✅ 대부분 API에서 `household_id` 기반 필터링 사용
- ⚠️ 일부 API에서 추가 검증 필요

#### 확인 필요 항목
- [ ] 하자 수정 시 본인 데이터인지 확인
- [ ] 보고서 조회 시 권한 확인
- [ ] 점검 데이터 접근 제어 확인

---

### 6. HTTPS 강제 미적용

#### 현재 상태
- ✅ Vercel/Render는 기본 HTTPS 제공
- ⚠️ HTTP 리다이렉트 강제 필요

#### 해결 방안
```javascript
// backend/server.js
// HTTPS 강제 리다이렉트 (프록시 환경에서)
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      res.redirect(`https://${req.header('host')}${req.url}`);
    } else {
      next();
    }
  });
}
```

---

### 7. 세션 타임아웃 관리

#### 현재 상태
- ✅ JWT 토큰 만료 시간 설정 (3일)
- ⚠️ 토큰 갱신 메커니즘 없음

#### 개선 방안
- Refresh Token 도입
- 자동 로그아웃 기능

---

## 📊 개인정보 수집 현황

### 수집하는 개인정보
1. **이름 (resident_name, inspector_name)**
   - 수집 목적: 사용자 식별
   - 보관 기간: 1개월 (보고서 보관 기간)
   - 법적 근거: 서비스 제공 필수

2. **전화번호 (phone)**
   - 수집 목적: SMS 알림, 사용자 연락
   - 보관 기간: 1개월
   - 법적 근거: 서비스 제공 필수

3. **이메일 (email) - 선택**
   - 수집 목적: 점검원 등록 시 연락
   - 보관 기간: 등록 승인 시까지 또는 거부 후 즉시 삭제
   - 법적 근거: 선택적 정보

4. **주소 정보 (complex, dong, ho)**
   - 수집 목적: 하자 및 점검 데이터 관리
   - 보관 기간: 1개월
   - 법적 근거: 서비스 제공 필수

5. **사진 (하자 사진, 열화상 사진)**
   - 수집 목적: 하자 확인 및 보고서 생성
   - 보관 기간: 1개월
   - 법적 근거: 서비스 제공 필수

---

## 🔒 개인정보보호법 준수 사항

### ✅ 준수 항목
1. **수집 최소화**: 서비스 제공에 필요한 최소한의 정보만 수집
2. **목적 외 사용 금지**: 수집 목적 외 사용하지 않음
3. **데이터 분리**: 사용자별 데이터 분리 관리 (household_id 기반)
4. **접근 제어**: 역할 기반 접근 제어 (RBAC) 구현

### ❌ 미준수 항목
1. **암호화 저장**: 개인정보 평문 저장 ❌
2. **안전한 전송**: HTTPS 강제 미적용 ⚠️
3. **로그 관리**: 로그에 개인정보 노출 ❌
4. **보관 기간**: 자동 삭제 스케줄러 미구현 ⚠️

---

## 🔧 즉시 수정 필요 사항 (우선순위)

### Priority 1: 긴급 (1주일 내)

#### 1. 로그에서 개인정보 제거
- [ ] `backend/routes/auth.js` - 개인정보 마스킹 적용
- [ ] `backend/routes/push-notifications.js` - 로그 필터링
- [ ] `backend/server.js` - morgan 로깅 필터링
- [ ] 모든 `console.log`에서 개인정보 제거

#### 2. JWT 토큰에서 개인정보 제거
- [ ] `backend/routes/auth.js` - JWT 페이로드 최소화
- [ ] 프론트엔드에서 토큰 디코딩 로직 제거
- [ ] 필요한 정보는 API 호출로 조회

#### 3. 개인정보 암호화 적용
- [ ] 암호화 라이브러리 선택 및 구현
- [ ] 민감 필드 암호화/복호화 함수 생성
- [ ] 기존 데이터 마이그레이션 스크립트
- [ ] 암호화 키 관리 (환경변수)

### Priority 2: 중요 (2주일 내)

#### 4. HTTPS 강제
- [ ] HTTPS 리다이렉트 미들웨어 추가
- [ ] HSTS 헤더 설정

#### 5. 보관 기간 관리
- [ ] 1개월 경과 데이터 자동 삭제 스케줄러
- [ ] 삭제 로그 기록

#### 6. 접근 제어 강화
- [ ] 모든 API 엔드포인트에서 데이터 소유권 확인
- [ ] 관리자 권한 세분화

### Priority 3: 권장 (1개월 내)

#### 7. 감사 로그
- [ ] 개인정보 접근 로그 기록
- [ ] 관리자 작업 로그 기록

#### 8. 개인정보 처리방침
- [ ] 개인정보 처리방침 문서 작성
- [ ] 이용약관 작성
- [ ] 사용자 동의 메커니즘 구현

---

## 📝 개선 작업 상세

### 1. 로그 개인정보 마스킹

#### 구현 파일
- `backend/utils/logger.js` (신규 생성)
- `backend/routes/*.js` (수정)

#### 코드 예시
```javascript
// backend/utils/logger.js
const maskPhone = (phone) => {
  if (!phone) return phone;
  return phone.replace(/(\d{3})-(\d{4})-(\d{4})/, '$1-****-$3');
};

const maskName = (name) => {
  if (!name || name.length < 2) return name;
  return name.substring(0, 1) + '*'.repeat(name.length - 1);
};

const maskEmail = (email) => {
  if (!email) return email;
  const [local, domain] = email.split('@');
  if (local.length <= 2) return email;
  return local.substring(0, 2) + '***@' + domain;
};

module.exports = { maskPhone, maskName, maskEmail };
```

---

### 2. 개인정보 암호화

#### 구현 파일
- `backend/utils/encryption.js` (신규 생성)
- `backend/middleware/encryptPersonalInfo.js` (신규 생성)
- 데이터베이스 스키마 업데이트

#### 암호화 대상 필드
- `household.resident_name`
- `household.phone`
- `inspector_registration.inspector_name`
- `inspector_registration.phone`
- `inspector_registration.email`

#### 데이터베이스 스키마 변경
```sql
-- 암호화된 필드로 변경
ALTER TABLE household 
ADD COLUMN resident_name_encrypted TEXT,
ADD COLUMN phone_encrypted TEXT;

-- 마이그레이션 후 기존 컬럼 삭제
-- ALTER TABLE household DROP COLUMN resident_name;
-- ALTER TABLE household DROP COLUMN phone;
```

---

### 3. JWT 토큰 최소화

#### 현재 구조
```javascript
// ❌ 문제: 개인정보 포함
{
  householdId: 1,
  complex: "인싸이트자이",
  dong: "101",
  ho: "1203",
  name: "홍길동",      // 개인정보
  phone: "010-1234-5678", // 개인정보
  user_type: "resident"
}
```

#### 개선 구조
```javascript
// ✅ 개선: 최소 정보만 포함
{
  householdId: 1,
  user_type: "resident",
  iat: 1234567890,
  exp: 1234567890
}
```

---

### 4. 자동 삭제 스케줄러

#### 구현 내용
```javascript
// backend/scripts/cleanup-personal-data.js
async function cleanupOldData() {
  // 1개월 이상 된 데이터 삭제
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
  
  // 하자 사진 삭제
  // 보고서 삭제
  // 만료된 개인정보 삭제
}
```

---

## 📋 체크리스트

### 보안 개선 작업
- [ ] 로그에서 개인정보 마스킹
- [ ] JWT 토큰에서 개인정보 제거
- [ ] 개인정보 암호화 구현
- [ ] HTTPS 강제 적용
- [ ] 자동 삭제 스케줄러 구현
- [ ] 접근 제어 강화
- [ ] 감사 로그 구현
- [ ] 개인정보 처리방침 작성

### 법적 준수
- [ ] 개인정보 처리방침 문서 작성
- [ ] 이용약관 작성
- [ ] 개인정보 수집 동의 메커니즘
- [ ] 개인정보 열람/수정/삭제 요청 처리
- [ ] 개인정보 유출 대응 계획

---

## 🎯 요약

### 현재 보안 상태: ⚠️ 개선 필요

#### 심각한 문제
1. ❌ 로그에 개인정보 노출
2. ❌ JWT 토큰에 개인정보 포함
3. ❌ 개인정보 평문 저장
4. ❌ 로깅 시스템에 개인정보 기록

#### 개선 필요
1. ⚠️ HTTPS 강제
2. ⚠️ 자동 삭제 스케줄러
3. ⚠️ 접근 제어 강화

#### 권장 사항
1. 📋 개인정보 처리방침 문서화
2. 📋 감사 로그 구현
3. 📋 정기 보안 감사

---

## 💡 결론

현재 시스템은 **개인정보 보안 측면에서 여러 문제가 있습니다**. 특히 로그 노출, JWT 토큰에 개인정보 포함, 평문 저장은 즉시 수정이 필요합니다.

**상용 서비스 출시 전 반드시 해결해야 할 사항:**
1. 로그에서 개인정보 제거
2. JWT 토큰 최소화
3. 개인정보 암호화 적용

이 작업들을 완료하지 않으면 **개인정보보호법 위반**으로 인한 법적 책임이 발생할 수 있습니다.

