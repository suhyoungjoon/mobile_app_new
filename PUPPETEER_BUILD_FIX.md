# 🔧 Puppeteer 빌드 타임아웃 해결

## ❌ 발생한 오류

```
npm error path /opt/render/project/src/backend/node_modules/puppeteer
npm error command failed
npm error signal SIGTERM
npm error command sh -c node install.mjs
npm error chrome-headless-shell (121.0.6167.85) downloaded to /opt/render/.cache/puppeteer/chrome-headless-shell/linux-121.0.6167.85
npm error Chrome (121.0.6167.85) downloaded to /opt/render/.cache/puppeteer/chrome/linux-121.0.6167.85
```

## 🔍 원인 분석

### 1. Render 무료 플랜 제한
- **빌드 타임아웃**: 제한된 시간 내에 빌드가 완료되어야 함
- **메모리 제한**: 제한된 메모리로 빌드 진행
- **Puppeteer Chromium 다운로드**: 약 300MB 크기, 3-5분 소요

### 2. SIGTERM 신호
- Render가 빌드 시간 초과로 프로세스를 강제 종료
- Chromium 다운로드 중에 발생

### 3. 해결 방법
- **빌드 시 Chromium 다운로드 건너뛰기**: `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true`
- **런타임에 자동 다운로드**: Puppeteer가 필요할 때 자동으로 Chromium 다운로드

---

## ✅ 수정 사항

### 1. `.npmrc` 설정
```ini
# Puppeteer 빌드 최적화: 빌드 시 Chromium 다운로드 건너뛰기
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
```

### 2. `render.yaml` 빌드 명령어
```yaml
buildCommand: PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true npm install --prefer-offline --no-audit --loglevel=verbose
```

### 3. `pdfGenerator.js` 개선
- Chromium이 없을 경우 자동 다운로드되도록 설정
- `--disable-dev-shm-usage` 플래그 추가 (메모리 최적화)

---

## 📊 예상 효과

### 빌드 시간
- **이전**: 5-8분 (Chromium 다운로드 포함)
- **이후**: 2-3분 (Chromium 다운로드 제외)

### 런타임 동작
- **첫 PDF 생성 시**: Chromium 자동 다운로드 (약 3-5분)
- **이후**: 다운로드된 Chromium 재사용 (즉시 실행)

---

## ⚠️ 주의사항

### 1. 첫 PDF 생성 지연
- 첫 번째 PDF 생성 요청 시 Chromium 다운로드로 인해 3-5분 소요
- 이후 요청은 즉시 처리됨

### 2. 디스크 공간
- Chromium은 약 300MB 디스크 공간 사용
- Render 무료 플랜 디스크 제한 확인 필요

### 3. 대안 (필요시)
- PDF 생성 요청 시 타임아웃 증가
- 사용자에게 "처리 중" 메시지 표시
- 비동기 처리로 백그라운드에서 PDF 생성

---

## 🎯 테스트 방법

### 1. 빌드 확인
```bash
# Render Dashboard에서 빌드 로그 확인
# "PUPPETEER_SKIP_CHROMIUM_DOWNLOAD" 메시지 확인
# 빌드 시간이 2-3분으로 단축되었는지 확인
```

### 2. PDF 생성 테스트
```bash
# 첫 번째 PDF 생성 요청
curl -X POST https://insighti-backend-v2.onrender.com/api/reports/generate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"caseId": 1}'

# 응답 시간 확인 (첫 요청은 3-5분 소요 가능)
# 이후 요청은 즉시 처리됨
```

---

## 📝 추가 최적화 (선택사항)

### 1. Health Check 개선
- PDF 생성 기능이 준비되었는지 확인하는 엔드포인트 추가

### 2. Chromium 사전 다운로드
- 서버 시작 시 백그라운드에서 Chromium 다운로드
- `server.js`에 초기화 로직 추가

### 3. 에러 처리
- Chromium 다운로드 실패 시 명확한 에러 메시지
- 대체 PDF 생성 방법 제공 (예: HTML만 반환)

---

## ✅ 다음 단계

1. **배포 완료 대기**: Render 빌드가 성공적으로 완료되는지 확인
2. **첫 PDF 생성 테스트**: Chromium 자동 다운로드 확인
3. **성능 모니터링**: PDF 생성 시간 및 성공률 확인

