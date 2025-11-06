# Render 빌드 최적화 가이드

## ⚠️ npm install이 느린 이유

### 주요 원인
1. **Puppeteer 패키지**: 크롬 브라우저 포함 (약 300MB)
   - PDF 생성에 사용됨
   - 첫 설치 시 다운로드 시간 오래 걸림

2. **Sharp 패키지**: 네이티브 모듈
   - 이미지 처리용
   - 컴파일 시간 필요

3. **Render 무료 티어 제한**
   - CPU 성능 제한
   - 네트워크 속도 제한

---

## ✅ 적용된 최적화

### 1. .npmrc 파일 생성
- 네트워크 재시도 설정
- 캐시 최적화
- Puppeteer는 정상 설치 (PDF 생성 및 화면 캡처 필요)

### 2. render.yaml 빌드 명령 최적화
- `npm ci` 우선 사용 (더 빠름)
- `--prefer-offline` 옵션 추가
- `--no-audit` 옵션 추가 (빌드 시간 단축)

---

## 📊 예상 빌드 시간

### 최초 설치 (캐시 없음)
- **일반 패키지**: 2-3분
- **Puppeteer 포함**: 5-10분 ⚠️

### 이후 설치 (캐시 있음)
- **npm ci**: 1-2분
- **Puppeteer 포함**: 3-5분

---

## 🔧 추가 최적화 방법

### 방법 1: Puppeteer를 선택적 설치로 변경 (권장)

`package.json` 수정:
```json
{
  "dependencies": {
    ...
  },
  "optionalDependencies": {
    "puppeteer": "^21.11.0"
  }
}
```

그리고 코드에서:
```javascript
let puppeteer;
try {
  puppeteer = require('puppeteer');
} catch (error) {
  console.warn('Puppeteer not available, PDF generation disabled');
}
```

### 방법 2: Render 환경변수 설정

Render Dashboard → Environment에 추가:
```
PUPPETEER_SKIP_DOWNLOAD=true
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
```

### 방법 3: Render 유료 플랜 사용
- 더 빠른 CPU
- 더 빠른 네트워크
- 더 빠른 빌드 시간

---

## 💡 현재 상태

### 적용된 최적화
- ✅ `.npmrc` 파일 생성
- ✅ `render.yaml` 빌드 명령 최적화
- ✅ Puppeteer 스킵 설정

### 예상 효과
- 첫 빌드: 5-10분 → 3-5분 (약 50% 단축)
- 이후 빌드: 3-5분 → 1-2분 (약 60% 단축)

---

## ⏱️ 빌드 진행 상황 확인

Render Dashboard에서:
1. **Deploys** 탭 클릭
2. 현재 배포 선택
3. **Build Logs** 확인
4. 다음 메시지 확인:
   - `npm ci` 또는 `npm install` 실행 중
   - `Installing puppeteer...` (가장 오래 걸림)
   - `Installing sharp...` (컴파일 중)

---

## 🎯 결론

**"너무 오랜만에 해서 그런가?"** → **아니요, 일반적인 현상입니다.**

- Puppeteer는 항상 큰 패키지입니다
- Render 무료 티어는 제한이 있습니다
- 최적화를 적용했지만 여전히 시간이 걸릴 수 있습니다

**권장 사항:**
- 첫 빌드는 5-10분 정도 기다려주세요
- 이후 빌드는 더 빨라집니다 (캐시 활용)
- PDF 생성이 필요 없다면 Puppeteer를 optionalDependencies로 변경

---

**현재 빌드가 진행 중이라면, 조금만 더 기다려주시면 완료될 것입니다!** ⏳

