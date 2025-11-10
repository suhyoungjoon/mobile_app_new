# 🔄 재배포 체크리스트

## ✅ 개선된 설정

### 1. render.yaml
- ✅ `healthCheckPath: /` 추가
- ✅ Build Command: `npm install --legacy-peer-deps`
- ✅ 서비스 이름: `mobile_app_new`

### 2. server.js
- ✅ 에러 핸들링 개선
- ✅ 명확한 로그 메시지
- ✅ `0.0.0.0` 바인딩 (Render 호환)

### 3. package.json
- ✅ html-pdf 사용 (Puppeteer 제거)
- ✅ 가벼운 빌드 (5MB vs 300MB)

---

## 📋 재배포 후 확인 사항

### 1. 빌드 단계
- [ ] 빌드 시간: 1-2분 예상
- [ ] "npm install" 성공
- [ ] html-pdf 설치 확인
- [ ] 에러 없음

### 2. Deploying 단계
- [ ] "Server running on port 10000" 메시지 확인
- [ ] "Server is ready to accept connections" 메시지 확인
- [ ] Deploying 시간: 2-5분 예상
- [ ] "Live" 상태로 전환

### 3. 서비스 확인
- [ ] 서비스 URL 접근 가능
- [ ] `/` 엔드포인트 응답 확인
- [ ] `/health` 엔드포인트 응답 확인
- [ ] API 엔드포인트 정상 작동

---

## 🔍 확인할 로그 메시지

### 정상 시작:
```
🚀 Server running on port 10000
📚 API Documentation: http://localhost:10000/api
🏥 Health Check: http://localhost:10000/health
✅ Server is ready to accept connections
🌐 Server listening on 0.0.0.0:10000
```

### 문제 발생:
```
❌ Failed to start server: [에러 메시지]
❌ Server error: [에러 메시지]
Error: Cannot find module
Error: EADDRINUSE
```

---

## 🎯 예상 결과

### 빌드
- **시간**: 1-2분
- **성공**: ✅

### Deploying
- **시간**: 2-5분
- **헬스 체크**: ✅ 통과
- **상태**: Live ✅

### 총 시간
- **3-7분** (빌드 + Deploying)

---

## 💡 문제 발생 시

### 1. 로그 확인
- Render Dashboard → Logs 탭
- 에러 메시지 확인

### 2. 서비스 URL 테스트
```bash
curl https://mobile-app-new.onrender.com/
curl https://mobile-app-new.onrender.com/health
```

### 3. 문제 공유
- 로그 내용 공유
- 에러 메시지 공유

---

재배포 후 결과를 알려주시면 확인하겠습니다!

