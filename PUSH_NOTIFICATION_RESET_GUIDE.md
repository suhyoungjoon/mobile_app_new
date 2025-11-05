# 📱 푸시 알림 시스템 재설정 가이드

## 🎯 현재 구현 상태

### ✅ 구현 완료된 파일
- `backend/routes/push-notifications.js` - 백엔드 API 라우트
- `webapp/js/push-manager.js` - 프론트엔드 푸시 관리자
- `backend/server.js` - 라우트 등록 완료
- `webapp/index.html` - 스크립트 로드 완료

### ⚠️ 필요한 작업
1. **데이터베이스 스키마 생성** (push_subscription 테이블)
2. **VAPID 키 생성 및 환경변수 설정**
3. **Service Worker 설정**
4. **백엔드/프론트엔드 재배포**

---

## 📋 단계별 설정 가이드

### **1단계: 데이터베이스 스키마 생성**

#### **방법 1: Node.js 스크립트 사용 (권장)**

```bash
cd backend
node scripts/migrate-push-notifications.js
```

#### **방법 2: SQL 직접 실행**

Render Dashboard에서 다음 SQL 실행:

```sql
-- 푸시 알림 구독 테이블
CREATE TABLE IF NOT EXISTS push_subscription (
  id SERIAL PRIMARY KEY,
  household_id INTEGER REFERENCES household(id) ON DELETE CASCADE,
  complex_id INTEGER REFERENCES complex(id),
  dong TEXT,
  ho TEXT,
  name TEXT,
  user_type TEXT DEFAULT 'resident' CHECK (user_type IN ('resident','company','admin','super_admin')),
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  UNIQUE(household_id, endpoint)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_push_subscription_household ON push_subscription(household_id);
CREATE INDEX IF NOT EXISTS idx_push_subscription_user_type ON push_subscription(user_type);
CREATE INDEX IF NOT EXISTS idx_push_subscription_endpoint ON push_subscription(endpoint);
CREATE INDEX IF NOT EXISTS idx_push_subscription_complex ON push_subscription(complex_id);
```

---

### **2단계: VAPID 키 생성**

#### **Node.js 스크립트로 생성**

```bash
cd backend
npm install web-push  # 이미 설치되어 있으면 생략
node scripts/generate-vapid-keys.js
```

#### **생성된 키 예시 출력**
```
Public Key: BEl62iUYgUivxIkv69yViEuiBIa40HI8U7u7W1VZGOFjOTvRy8ZuyNeTijPvAUpb7IZ5vQy8sJ1CtoS2iKvFfgE
Private Key: 8fKZx7J9QmN2pR5sT8vW1yZ4aB7cD0eF3gH6iJ9kL2mN5oP8qR1sT4vW7yZ0aB3cD6eF9gH2iJ5kL8mN1oP4qR7sT0vW3yZ6aB9cD2eF5gH8iJ1kL4mN7oP0qR3sT6vW9yZ2aB5cD8eF1gH4iJ7kL0mN3oP6qR9sT2vW5yZ8aB1cD4eF7gH0iJ3kL6mN9oP2qR5sT8vW1yZ4aB7cD0eF3gH6iJ9kL
```

---

### **3단계: Render 환경변수 설정**

1. **Render Dashboard** 접속: https://dashboard.render.com
2. **InsightI 백엔드 서비스** 선택
3. **Environment** 탭 이동
4. 다음 환경변수 추가:

```
VAPID_PUBLIC_KEY=생성된_공개키
VAPID_PRIVATE_KEY=생성된_개인키
```

5. **Save Changes** 클릭
6. **서비스 재배포** (자동 또는 수동)

---

### **4단계: Service Worker 확인**

#### **Service Worker 파일 확인**
- `webapp/sw.js` 파일이 있는지 확인
- push 이벤트 리스너가 포함되어 있는지 확인

#### **Service Worker 등록 확인**
- `webapp/index.html`에 Service Worker 등록 코드 확인

---

### **5단계: 테스트**

#### **테스트 체크리스트**
- [ ] 데이터베이스 테이블 생성 확인
- [ ] VAPID 키 환경변수 설정 확인
- [ ] 백엔드 재배포 완료
- [ ] 프론트엔드 재배포 완료
- [ ] 브라우저에서 푸시 알림 권한 요청 확인
- [ ] 테스트 알림 발송 성공

#### **테스트 방법**
1. 앱 접속: https://insighti.vercel.app
2. **설정** 화면 이동
3. **푸시 알림** 토글 활성화
4. 브라우저 알림 권한 허용
5. **테스트** 버튼 클릭
6. 알림 수신 확인

---

## 🔧 문제 해결

### **푸시 알림이 작동하지 않는 경우**

1. **브라우저 알림 권한 확인**
   - 브라우저 설정에서 알림 권한이 "허용"인지 확인

2. **VAPID 키 확인**
   - Render 환경변수에 올바르게 설정되었는지 확인
   - 백엔드 로그에서 VAPID 키 로드 여부 확인

3. **Service Worker 확인**
   - 브라우저 개발자 도구 → Application → Service Workers
   - Service Worker가 등록되어 있는지 확인

4. **데이터베이스 확인**
   - `push_subscription` 테이블에 구독 정보가 저장되는지 확인

5. **백엔드 로그 확인**
   - Render 로그에서 푸시 알림 관련 오류 확인

---

## 📝 다음 단계

이 가이드를 따라 단계별로 진행하시면 됩니다!

1. **데이터베이스 마이그레이션 실행**
2. **VAPID 키 생성 및 설정**
3. **서비스 재배포**
4. **테스트**

필요하시면 각 단계를 진행하면서 도와드리겠습니다!

