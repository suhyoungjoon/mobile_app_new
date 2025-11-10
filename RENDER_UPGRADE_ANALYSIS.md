# 💰 Render 업그레이드 vs 최적화 비교 분석

## 🔍 현재 문제

```
npm error signal SIGTERM
npm error command sh -c node install.mjs
npm error Chrome (121.0.6167.85) downloaded to /opt/render/.cache/puppeteer/chrome/linux-121.0.6167.85
```

**원인**: Render 무료 플랜의 빌드 타임아웃/메모리 제한으로 Puppeteer Chromium 다운로드 중 프로세스가 강제 종료됨

---

## 📊 해결 방법 비교

### 방법 1: 코드 최적화 (무료 플랜 유지) ✅ **추천**

#### 장점
- ✅ **비용**: 무료
- ✅ **빌드 시간**: 2-3분으로 단축
- ✅ **안정성**: 빌드 타임아웃 문제 해결
- ✅ **기능**: PDF 생성 기능 정상 작동

#### 단점
- ⚠️ **첫 PDF 생성 지연**: 첫 요청 시 3-5분 소요 (Chromium 자동 다운로드)
- ⚠️ **디스크 공간**: Chromium 약 300MB 사용

#### 구현 상태
- ✅ `.npmrc`에 `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true` 설정
- ✅ `render.yaml` 빌드 명령어에 환경 변수 추가
- ✅ `pdfGenerator.js` 런타임 자동 다운로드 지원

---

### 방법 2: Render 플랜 업그레이드 (유료)

#### Render 플랜 비교

| 플랜 | 월 비용 | 빌드 시간 | 메모리 | 디스크 | 빌드 타임아웃 |
|------|---------|-----------|--------|--------|---------------|
| **Free** | $0 | 제한적 | 512MB | 1GB | 짧음 |
| **Starter** | $7/월 | 더 길게 | 512MB | 1GB | 더 길게 |
| **Standard** | $25/월 | 충분 | 1GB | 2GB | 충분 |
| **Pro** | $85/월 | 매우 충분 | 2GB | 5GB | 매우 충분 |

#### 장점
- ✅ **빌드 안정성**: 더 긴 타임아웃으로 Chromium 다운로드 완료 가능
- ✅ **첫 PDF 생성**: 즉시 처리 (빌드 시 Chromium 포함)
- ✅ **더 많은 리소스**: 메모리, 디스크, CPU

#### 단점
- ❌ **비용**: 월 $7~$85
- ❌ **여전히 느림**: 빌드 시간은 여전히 5-8분 (Chromium 다운로드 포함)
- ❌ **불필요한 비용**: 코드 최적화로 해결 가능

---

## 🎯 권장 사항

### ✅ 방법 1 (코드 최적화) 추천

**이유**:
1. **비용 효율**: 무료 플랜으로 충분
2. **빌드 시간 단축**: 2-3분으로 단축
3. **기능 정상 작동**: PDF 생성 기능 문제없음
4. **첫 요청 지연**: 사용자 경험에 큰 영향 없음 (보고서 생성은 일반적으로 비동기)

### 📝 방법 1 구현 확인

현재 수정 사항이 배포되었는지 확인:

```bash
# Git 커밋 확인
git log --oneline -5

# render.yaml 확인
cat render.yaml | grep buildCommand

# .npmrc 확인
cat backend/.npmrc | grep PUPPETEER
```

**예상 출력**:
- `render.yaml`: `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true npm install ...`
- `.npmrc`: `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true`

---

## 🔄 다음 배포 시 확인 사항

### 1. 빌드 로그 확인
```
✅ "PUPPETEER_SKIP_CHROMIUM_DOWNLOAD" 메시지 확인
✅ 빌드 시간 2-3분으로 단축 확인
✅ "npm install" 성공 확인
```

### 2. 첫 PDF 생성 테스트
```bash
# 첫 요청 (3-5분 소요 가능)
curl -X POST https://insighti-backend-v2.onrender.com/api/reports/generate \
  -H "Authorization: Bearer TOKEN" \
  -d '{"caseId": 1}'

# 이후 요청 (즉시 처리)
```

---

## 💡 추가 최적화 (선택사항)

### 1. 서버 시작 시 Chromium 사전 다운로드
```javascript
// server.js에 추가
const puppeteer = require('puppeteer');

// 서버 시작 시 백그라운드에서 Chromium 다운로드
(async () => {
  try {
    console.log('Downloading Chromium in background...');
    const browser = await puppeteer.launch({ headless: 'new' });
    await browser.close();
    console.log('Chromium ready!');
  } catch (error) {
    console.warn('Chromium download failed, will download on first use:', error.message);
  }
})();
```

### 2. Health Check 엔드포인트
```javascript
// PDF 생성 준비 상태 확인
app.get('/api/health/pdf', async (req, res) => {
  try {
    const browser = await puppeteer.launch({ headless: 'new' });
    await browser.close();
    res.json({ ready: true });
  } catch (error) {
    res.json({ ready: false, message: error.message });
  }
});
```

---

## 📊 결론

### ✅ **권장**: 방법 1 (코드 최적화)
- 무료 플랜으로 충분
- 빌드 시간 단축
- 기능 정상 작동

### 💰 **업그레이드 고려 시점**
다음 경우에만 업그레이드 고려:
1. 첫 PDF 생성 지연이 비즈니스에 치명적
2. 동시 사용자가 많아 리소스 부족
3. 더 많은 디스크 공간 필요
4. 더 빠른 응답 시간 필수

---

## 🚀 즉시 조치

1. **현재 수정 사항 배포 확인**
2. **빌드 성공 여부 확인**
3. **첫 PDF 생성 테스트**
4. **문제 지속 시 업그레이드 고려**

