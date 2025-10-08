# InsightI Frontend Web App

백엔드 API와 연동된 모바일 웹앱입니다.

## 주요 기능

### 인증 시스템
- JWT 토큰 기반 인증
- 자동 로그인 유지 (localStorage)
- 세션 복원 기능

### 하자 관리
- 케이스 생성 및 관리
- 하자 등록 (위치, 세부공정, 내용, 메모)
- 사진 업로드 (근거리/원거리)
- 실시간 데이터 동기화

### 보고서 시스템
- 하자 목록 미리보기
- PDF 보고서 생성
- SMS 발송 알림

### 사용자 경험
- 로딩 상태 표시
- 에러 처리 및 알림
- 반응형 디자인
- 직관적인 네비게이션

## 실행 방법

### 1. 백엔드 서버 실행
```bash
cd backend
npm install
npm run setup-db
npm run dev
```

### 2. 프론트엔드 실행
```bash
# 웹 서버 실행 (Python 3)
cd webapp
python -m http.server 8080

# 또는 Node.js http-server
npx http-server -p 8080

# 또는 Live Server (VS Code 확장)
# index.html 우클릭 → "Open with Live Server"
```

### 3. 브라우저에서 접속
```
http://localhost:8080
```

## API 연동

### 엔드포인트
- **인증**: `POST /api/auth/session`
- **케이스**: `GET/POST /api/cases`
- **하자**: `POST /api/defects`
- **파일**: `POST /api/upload/photo`
- **보고서**: `GET/POST /api/reports/*`
- **SMS**: `POST /api/sms/*`

### 인증 플로우
1. 사용자 정보 입력 (단지, 동, 호, 성명, 전화번호)
2. JWT 토큰 발급
3. 토큰을 localStorage에 저장
4. 모든 API 요청에 Authorization 헤더 포함

### 데이터 플로우
1. **로그인** → 토큰 발급 → 케이스 목록 로드
2. **하자 등록** → 사진 업로드 → 하자 생성 → 목록 업데이트
3. **보고서 생성** → PDF 생성 → SMS 발송 → 링크 표시

## 파일 구조

```
webapp/
├── index.html          # 메인 HTML 파일
├── css/
│   └── style.css       # 스타일시트
├── js/
│   ├── data.js         # 카탈로그 데이터
│   ├── api.js          # API 클라이언트
│   └── app.js          # 메인 애플리케이션 로직
└── README.md           # 이 파일
```

## 주요 클래스 및 함수

### APIClient
- `login(loginData)` - 로그인
- `getCases()` - 케이스 목록 조회
- `createCase(caseData)` - 케이스 생성
- `createDefect(defectData)` - 하자 등록
- `uploadPhoto(file, type)` - 사진 업로드
- `getReportPreview()` - 보고서 미리보기
- `sendReport(caseId)` - 보고서 발송

### 유틸리티 함수
- `toast(msg, type)` - 알림 표시
- `showError(error)` - 에러 처리
- `setLoading(loading)` - 로딩 상태 관리
- `formatDate(dateString)` - 날짜 포맷팅
- `checkAuth()` - 인증 상태 확인
- `logout()` - 로그아웃

## 환경 설정

### CORS 설정
백엔드에서 다음 도메인을 허용해야 합니다:
- `http://localhost:8080`
- `http://127.0.0.1:8080`
- `file://`

### API URL
기본 API URL: `http://localhost:3000/api`
환경에 따라 `api.js`에서 수정 가능

## 개발 팁

### 디버깅
- 브라우저 개발자 도구 콘솔 확인
- Network 탭에서 API 요청/응답 확인
- localStorage에서 토큰 및 세션 데이터 확인

### 테스트
- 다양한 하자 유형으로 테스트
- 사진 업로드 기능 테스트
- 보고서 생성 및 발송 테스트
- 로그인/로그아웃 플로우 테스트

### 성능 최적화
- 이미지 압축 및 리사이징
- API 요청 최적화
- 로컬 상태 관리 개선
- 오프라인 지원 (향후)

## 문제 해결

### 일반적인 문제
1. **CORS 오류**: 백엔드 CORS 설정 확인
2. **인증 실패**: 토큰 만료 또는 잘못된 토큰
3. **파일 업로드 실패**: 파일 크기 또는 형식 확인
4. **API 연결 실패**: 백엔드 서버 실행 상태 확인

### 로그 확인
- 브라우저 콘솔: 프론트엔드 에러
- 백엔드 콘솔: API 서버 로그
- Network 탭: HTTP 요청/응답 상세 정보
