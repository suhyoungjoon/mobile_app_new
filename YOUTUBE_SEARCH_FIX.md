# 🔧 YouTube 검색 기능 수정 가이드

## 📋 문제 분석

### 발견된 문제
- **YouTube 검색 API 500 에러**: 하자명 선택 시 YouTube 동영상 검색이 실패
- **발생 빈도**: 로그에서 15회 연속 실패 확인
- **영향**: YouTube 동영상 검색 기능 완전 불가

### 가능한 원인
1. **YouTube API 키 미설정** (가장 가능성 높음)
   - `YOUTUBE_API_KEY` 환경변수가 설정되지 않음
   - `config.youtubeApiKey`가 `undefined` 또는 `null`

2. **YouTube API 할당량 초과**
   - 일일 할당량(10,000 units) 소진
   - API 키별 할당량 제한

3. **YouTube API 미활성화**
   - Google Cloud Console에서 YouTube Data API v3가 활성화되지 않음

4. **API 키 만료 또는 무효**
   - API 키가 삭제됨
   - API 키 권한 문제

---

## ✅ 수정 사항

### 1. 백엔드 에러 핸들링 개선

**파일**: `backend/routes/youtube-search.js`

#### 개선 내용:
- ✅ **상세한 에러 로깅**: 에러 발생 시 상세 정보 로깅
- ✅ **에러 유형별 처리**: 
  - 403 (할당량 초과, API 미활성화, 접근 거부)
  - 400 (잘못된 요청)
  - 401 (인증 실패)
  - 네트워크 오류 (ENOTFOUND, ECONNREFUSED)
- ✅ **API 키 검증**: API 키 형식 간단 검증
- ✅ **사용자 친화적 메시지**: 각 에러 유형별 명확한 메시지 제공

#### 주요 변경사항:
```javascript
// 에러 로깅 개선
const errorDetails = {
  message: error.message,
  status: error.response?.status,
  statusText: error.response?.statusText,
  data: error.response?.data,
  config: {
    url: error.config?.url,
    method: error.config?.method,
    params: error.config?.params
  }
};
console.error('❌ YouTube 검색 오류:', JSON.stringify(errorDetails, null, 2));

// API 키 확인 강화
if (!config.youtubeApiKey) {
  console.error('⚠️ YouTube API 키가 설정되지 않았습니다.');
  console.error('   환경변수 YOUTUBE_API_KEY를 확인하세요.');
  return res.status(500).json({ 
    error: 'YouTube API key not configured',
    message: 'YouTube API 키가 설정되지 않았습니다. 관리자에게 문의하세요.',
    details: 'YOUTUBE_API_KEY 환경변수가 설정되지 않았습니다.'
  });
}
```

---

### 2. 프론트엔드 에러 핸들링 개선

**파일**: `webapp/js/app.js`, `webapp/js/api.js`

#### 개선 내용:
- ✅ **에러 정보 추출**: API 응답에서 상세 에러 정보 추출
- ✅ **조용한 실패**: 사용자 경험을 해치지 않도록 조용히 실패
- ✅ **기존 동영상 사용**: 검색 실패 시 데이터베이스의 기존 동영상 사용
- ✅ **상세 로깅**: 개발자 콘솔에 상세한 에러 정보 로깅

---

## 🔍 문제 진단 방법

### 1. YouTube API 키 확인

**Render 환경변수 확인**:
```bash
# Render 대시보드에서 확인
# Settings → Environment Variables → YOUTUBE_API_KEY
```

**로컬 환경변수 확인**:
```bash
# .env 파일 확인
cat .env | grep YOUTUBE_API_KEY

# 또는 환경변수 직접 확인
echo $YOUTUBE_API_KEY
```

**백엔드 로그 확인**:
```bash
# 서버 시작 시 로그 확인
# "⚠️ YouTube API 키가 설정되지 않았습니다." 메시지 확인
```

---

### 2. YouTube API 키 설정 방법

#### Step 1: Google Cloud Console에서 API 키 생성

1. **Google Cloud Console 접속**
   - https://console.cloud.google.com/

2. **프로젝트 선택 또는 생성**
   - 새 프로젝트 생성 또는 기존 프로젝트 선택

3. **YouTube Data API v3 활성화**
   - API 및 서비스 → 라이브러리
   - "YouTube Data API v3" 검색
   - "사용 설정" 클릭

4. **API 키 생성**
   - API 및 서비스 → 사용자 인증 정보
   - "사용자 인증 정보 만들기" → "API 키"
   - 생성된 API 키 복사

5. **API 키 제한 설정 (선택사항, 권장)**
   - 생성된 API 키 클릭
   - "애플리케이션 제한사항" 설정
   - "HTTP 리퍼러(웹사이트)" 선택
   - 허용된 리퍼러 추가:
     - `https://insighti.vercel.app/*`
     - `https://*.vercel.app/*`
     - `https://mobile-app-new.onrender.com/*`
   - "API 제한사항" 설정
   - "키 제한" → "YouTube Data API v3" 선택

#### Step 2: Render에 환경변수 설정

1. **Render 대시보드 접속**
   - https://dashboard.render.com/

2. **서비스 선택**
   - 백엔드 서비스 선택

3. **환경변수 추가**
   - Settings → Environment Variables
   - Key: `YOUTUBE_API_KEY`
   - Value: 생성한 API 키
   - "Save Changes" 클릭

4. **서비스 재시작**
   - 변경사항 적용을 위해 서비스 재시작

---

### 3. API 키 테스트

**테스트 스크립트 실행**:
```bash
cd backend
YOUTUBE_API_KEY="your-api-key" node scripts/test-youtube-realtime-search.js
```

**또는 curl로 직접 테스트**:
```bash
curl "https://www.googleapis.com/youtube/v3/search?part=snippet&q=마루판들뜸%20하자%20보수%20건설&type=video&maxResults=3&key=YOUR_API_KEY"
```

---

## 🛠️ 추가 개선 사항

### 1. 재시도 로직 개선 (프론트엔드)

현재 프론트엔드에서 무한 재시도가 발생할 수 있습니다. 재시도 로직을 개선해야 합니다.

**개선 방안**:
- 최대 재시도 횟수 제한 (예: 3회)
- 재시도 간격 증가 (exponential backoff)
- 재시도 전 에러 유형 확인 (할당량 초과 시 재시도하지 않음)

### 2. 캐싱 추가

**개선 방안**:
- 검색 결과를 일정 시간 캐싱 (예: 1시간)
- 동일한 하자명에 대한 중복 검색 방지
- 데이터베이스에 검색 결과 저장

### 3. 대체 검색 방법

**개선 방안**:
- YouTube 검색 실패 시 데이터베이스의 기존 동영상 사용 (이미 구현됨)
- 검색 결과가 없을 때 기본 동영상 제공

---

## 📊 예상 결과

### 수정 전
- ❌ 모든 YouTube 검색 요청이 500 에러 반환
- ❌ 에러 원인 파악 어려움
- ❌ 사용자에게 명확한 메시지 없음

### 수정 후
- ✅ 에러 원인 명확히 파악 가능
- ✅ 에러 유형별 적절한 메시지 제공
- ✅ API 키 미설정 시 명확한 안내
- ✅ 할당량 초과 시 사용자 친화적 메시지
- ✅ 검색 실패 시 기존 동영상 자동 사용

---

## 🔧 즉시 조치 사항

### 1. 환경변수 확인 및 설정
```bash
# Render 대시보드에서 확인
YOUTUBE_API_KEY 환경변수가 설정되어 있는지 확인

# 설정되지 않았다면:
1. Google Cloud Console에서 API 키 생성
2. Render에 환경변수 추가
3. 서비스 재시작
```

### 2. 서버 로그 확인
```bash
# 서버 시작 시 다음 메시지 확인:
# "⚠️ YouTube API 키가 설정되지 않았습니다." → API 키 설정 필요
# "✅ YouTube 검색 완료" → 정상 작동
```

### 3. 테스트
```bash
# 하자명 선택 시 YouTube 검색이 정상 작동하는지 확인
# 브라우저 개발자 도구 콘솔에서 에러 메시지 확인
```

---

## 📚 관련 문서

- [YouTube Data API v3 문서](https://developers.google.com/youtube/v3)
- [API 키 생성 가이드](https://developers.google.com/youtube/v3/getting-started)
- [할당량 및 제한사항](https://developers.google.com/youtube/v3/getting-started#quota)

---

## ✅ 수정 완료 체크리스트

- [x] 백엔드 에러 핸들링 개선
- [x] 프론트엔드 에러 핸들링 개선
- [x] 상세한 에러 로깅 추가
- [x] API 키 검증 로직 추가
- [ ] 환경변수 설정 확인 (수동 작업 필요)
- [ ] API 키 테스트 (수동 작업 필요)
- [ ] 서비스 재시작 (수동 작업 필요)

---

**수정 일시**: 2025-11-19  
**버전**: v4.0.0

