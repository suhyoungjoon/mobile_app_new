# 📋 Render 빌드 로그 확인 가이드

## 🔍 상세 로그 확인 방법

### 1. Render Dashboard에서 확인

1. **Render Dashboard 접속**
   - https://dashboard.render.com
   - 로그인 후 프로젝트 선택

2. **서비스 선택**
   - `insighti-backend-v2` 서비스 클릭

3. **빌드 로그 확인**
   - 상단 메뉴에서 **"Logs"** 탭 클릭
   - 또는 **"Events"** 탭에서 빌드 이벤트 클릭

4. **실시간 로그 스트리밍**
   - 빌드 중에는 실시간으로 로그가 업데이트됨
   - 자동 새로고침이 활성화되어 있음

---

## 📊 빌드 로그에서 확인할 내용

### 정상적인 빌드 과정

```
1. Git 클론/업데이트
   - "Cloning repository..."
   - "Checking out commit..."

2. npm install 시작
   - "Running build command..."
   - "npm ci --prefer-offline --no-audit --loglevel=verbose"

3. 패키지 다운로드
   - "npm http fetch GET ..."
   - 각 패키지별 다운로드 진행 상황

4. Puppeteer Chromium 다운로드 (가장 오래 걸림)
   - "Downloading Chromium rXXXXXX..."
   - "Chromium downloaded to ..."
   - 약 3-5분 소요

5. 네이티브 모듈 컴파일
   - "Building native modules..."
   - sharp, bcrypt 등

6. 빌드 완료
   - "Build successful"
   - "Starting service..."
```

---

## 🔧 더 상세한 로그를 위한 설정

### render.yaml 수정 (완료됨)
```yaml
buildCommand: npm ci --prefer-offline --no-audit --loglevel=verbose
```

### 추가 옵션 (필요시)

#### 모든 패키지 설치 과정 표시
```yaml
buildCommand: npm ci --prefer-offline --no-audit --loglevel=verbose --progress=true
```

#### 타임아웃 증가 (느린 네트워크)
```yaml
buildCommand: npm ci --prefer-offline --no-audit --loglevel=verbose --fetch-timeout=300000
```

---

## 📱 Render Dashboard 로그 필터링

### 로그 레벨별 필터
- **All**: 모든 로그
- **Build**: 빌드 관련 로그만
- **Runtime**: 실행 중 로그만

### 검색 기능
- 로그 창에서 `Ctrl+F` (또는 `Cmd+F`)
- "Chromium", "Downloading", "error" 등으로 검색

---

## ⚠️ 빌드 시간이 오래 걸릴 때 확인사항

### 1. Puppeteer 다운로드 확인
```
로그에서 "Downloading Chromium" 메시지 확인
- 정상: 다운로드 진행 중
- 문제: 멈춤 또는 에러 메시지
```

### 2. 네트워크 속도 확인
```
로그에서 다운로드 속도 확인
- 정상: 몇 MB/s 속도로 진행
- 문제: 0 KB/s 또는 매우 느림
```

### 3. 메모리/디스크 부족 확인
```
에러 메시지 확인:
- "ENOSPC: no space left on device"
- "JavaScript heap out of memory"
```

---

## 🎯 현재 빌드 상태 확인

### Render Dashboard에서 확인할 항목:

1. **빌드 상태**
   - "Building" → 진행 중
   - "Live" → 완료
   - "Build Failed" → 실패

2. **빌드 시간**
   - 예상: 5-8분
   - 10분 이상: 문제 가능성

3. **로그 메시지**
   - "Downloading Chromium" → 정상 진행 중
   - "Build successful" → 완료
   - 에러 메시지 → 문제 발생

---

## 💡 팁

- **빌드 로그는 실시간으로 업데이트됨**
- **자동 스크롤이 활성화되어 있음**
- **로그는 최근 1000줄까지 표시됨**
- **더 오래된 로그는 "View older logs" 클릭**

---

## 📞 문제 발생 시

빌드가 10분 이상 걸리거나 에러가 발생하면:
1. 로그에서 에러 메시지 확인
2. 특정 패키지에서 멈춘 경우 확인
3. 네트워크 타임아웃 확인

