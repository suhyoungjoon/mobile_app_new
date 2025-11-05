# ✅ 푸시 알림 재설정 완료 가이드

## 📋 완료된 작업

### ✅ 1단계: 데이터베이스 마이그레이션
- `push_subscription` 테이블 생성 완료
- 필요한 인덱스 생성 완료
- 테이블 구조 확인 완료

### ✅ 2단계: VAPID 키 생성
- VAPID 키 생성 완료

---

## 🔑 생성된 VAPID 키

### Public Key (공개키)
```
BDXtZx5xFDLqIptU9rFaaOjfh1gaGI-UbxE3p6juZZFiG3z1969zYCOrOOBTP6MkrYRQqrq_Na29J4r9rP0Gm7E
```

### Private Key (개인키)
```
wVMmO1UvL4hOJ9_y5-kAXh2S8I0Zv4SLyJTk0_OFzSA
```

---

## 🔧 Render 환경변수 설정 (필수)

### 설정 방법
1. **Render Dashboard** 접속: https://dashboard.render.com
2. **InsightI 백엔드 서비스** 선택
3. **Environment** 탭 이동
4. 다음 환경변수 추가:

```
VAPID_PUBLIC_KEY=BDXtZx5xFDLqIptU9rFaaOjfh1gaGI-UbxE3p6juZZFiG3z1969zYCOrOOBTP6MkrYRQqrq_Na29J4r9rP0Gm7E
VAPID_PRIVATE_KEY=wVMmO1UvL4hOJ9_y5-kAXh2S8I0Zv4SLyJTk0_OFzSA
```

5. **Save Changes** 클릭
6. **서비스 자동 재배포** (또는 수동 재배포)

> **중요**: 환경변수 설정 후 반드시 백엔드 서비스를 재배포해야 합니다!

---

## ✅ 완료된 코드 변경사항

### 1. Service Worker 업데이트 (`webapp/sw.js`)
- Push 이벤트 리스너 추가
- Notification click 이벤트 추가
- 캐시 전략 개선

### 2. 데이터베이스 스키마
- `push_subscription` 테이블 생성
- 필요한 인덱스 생성

### 3. 백엔드 API
- `backend/routes/push-notifications.js` - 이미 구현됨
- `backend/server.js` - 라우트 등록 완료

### 4. 프론트엔드
- `webapp/js/push-manager.js` - 이미 구현됨
- `webapp/index.html` - 스크립트 로드 완료

---

## 🚀 다음 단계

### 1. 환경변수 설정 및 재배포
위의 Render 환경변수 설정 단계를 완료하세요.

### 2. 프론트엔드 재배포
- Vercel에서 자동 재배포 또는 수동 재배포
- `sw.js` 파일 변경사항이 반영되어야 합니다.

### 3. 테스트
1. 앱 접속: https://insighti.vercel.app
2. **설정** 화면 이동
3. **푸시 알림** 토글 활성화
4. 브라우저 알림 권한 허용
5. **테스트** 버튼 클릭
6. 알림 수신 확인

---

## 🧪 테스트 체크리스트

- [ ] Render 환경변수 설정 완료
- [ ] 백엔드 재배포 완료
- [ ] 프론트엔드 재배포 완료
- [ ] 브라우저에서 Service Worker 등록 확인
- [ ] 푸시 알림 토글 활성화 성공
- [ ] 테스트 알림 발송 성공
- [ ] 알림 수신 확인

---

## ❓ 문제 해결

### 푸시 알림이 작동하지 않는 경우

#### 1. 환경변수 확인
- Render Dashboard에서 VAPID 키가 올바르게 설정되었는지 확인
- 백엔드 재배포가 완료되었는지 확인

#### 2. Service Worker 확인
- 브라우저 개발자 도구 → Application → Service Workers
- Service Worker가 등록되어 있는지 확인
- 새로고침 후 다시 확인

#### 3. 브라우저 권한 확인
- 브라우저 설정에서 알림 권한이 "허용"인지 확인
- Chrome: 설정 → 사이트 설정 → 알림
- Safari: 설정 → 사이트 → 알림

#### 4. 데이터베이스 확인
```sql
-- Render PostgreSQL Query에서 실행
SELECT * FROM push_subscription LIMIT 5;
```
- 구독 정보가 저장되고 있는지 확인

#### 5. 백엔드 로그 확인
- Render Dashboard → Logs 탭
- 푸시 알림 관련 에러 확인
- VAPID 키 로드 여부 확인

---

## 📝 주의사항

### VAPID 키 보안
- **Private Key는 절대 공개하지 마세요!**
- Git 저장소에 커밋하지 마세요!
- 환경변수로만 관리하세요!

### 브라우저 호환성
- Chrome, Edge, Firefox 최신 버전 지원
- Safari 16+ 지원
- 모바일 브라우저 지원 (iOS Safari 16+, Chrome Mobile)

### API 할당량
- 푸시 알림은 무료로 무제한 사용 가능
- VAPID 키만 있으면 추가 비용 없음

---

## 🎉 설정 완료!

환경변수 설정 및 재배포가 완료되면 푸시 알림 기능을 사용할 수 있습니다!

**문제가 발생하면 위의 문제 해결 섹션을 참고하세요.**

