# InsightI Backend API Server

간단한 Node.js + Express 기반 백엔드 API 서버입니다.

## 설치 및 실행

### 1. 의존성 설치
```bash
cd backend
npm install
```

### 2. 환경 설정
```bash
# 설정 파일 복사 및 수정
cp config.example.js config.js
# config.js에서 데이터베이스 비밀번호 등 설정
```

### 3. 데이터베이스 설정
```bash
# 자동 데이터베이스 설정 (PostgreSQL 필요)
npm run setup-db

# 또는 수동 설정
# PostgreSQL 설치 및 실행 (macOS)
brew install postgresql
brew services start postgresql

# 데이터베이스 생성
createdb insighti_db

# 마이그레이션 실행
npm run migrate
```

### 4. 데이터베이스 테스트
```bash
# 데이터베이스 연결 테스트
npm run test-db
```

### 5. 서버 실행
```bash
# 개발 모드 (nodemon 사용)
npm run dev

# 프로덕션 모드
npm start
```

### 6. 파일 업로드 테스트
```bash
# 파일 업로드 시스템 테스트
npm run test-upload
```

### 7. PDF 생성 테스트
```bash
# PDF 생성 시스템 테스트
npm run test-pdf
```

### 8. SMS 발송 테스트
```bash
# SMS 발송 시스템 테스트
npm run test-sms
```

## API 엔드포인트

### 인증
- `POST /api/auth/session` - 세션 생성 (로그인)

### 케이스 관리
- `GET /api/cases` - 케이스 목록 조회
- `POST /api/cases` - 새 케이스 생성

### 하자 관리
- `POST /api/defects` - 하자 등록

### 파일 업로드
- `POST /api/upload/url` - 업로드 URL 생성
- `POST /api/upload/photo` - 사진 업로드 (이미지 처리 포함)
- `GET /api/upload/photo/:filename` - 사진 정보 조회
- `DELETE /api/upload/photo/:filename` - 사진 삭제

### 보고서
- `GET /api/reports/preview` - 보고서 미리보기
- `POST /api/reports/generate` - PDF 보고서 생성
- `POST /api/reports/send` - 보고서 발송 (PDF 생성 포함)

### SMS 발송
- `POST /api/sms/send` - 기본 SMS 발송
- `POST /api/sms/welcome` - 환영 SMS 발송
- `POST /api/sms/inspection-completion` - 점검 완료 알림
- `POST /api/sms/report-notification` - 보고서 발송 알림
- `GET /api/sms/status` - SMS 서비스 상태
- `POST /api/sms/validate` - 전화번호 검증

## 파일 업로드 기능

### 지원 형식
- JPEG, PNG, WebP 이미지 파일
- 최대 파일 크기: 10MB
- 자동 이미지 최적화 및 리사이징

### 이미지 처리
- 원본 이미지: 최대 1200x1200px로 리사이징
- 썸네일: 200x200px 자동 생성
- 품질 최적화: JPEG 85% 품질
- 고유 파일명: UUID 기반

### 파일 구조
```
uploads/
├── original-images/     # 원본 이미지
├── thumbs/             # 썸네일 이미지
└── processed/          # 처리된 이미지
```

## 데이터베이스 스키마

프로젝트 루트의 `db/schema.sql` 파일을 참고하세요.

## 개발 모드

- 서버: http://localhost:3000
- API 문서: http://localhost:3000/api
- 헬스체크: http://localhost:3000/health
- 업로드 파일: http://localhost:3000/uploads/
- PDF 보고서: http://localhost:3000/reports/

## PDF 생성 기능

### 지원 템플릿
- `simple-report` - 간단한 보고서 (기본)
- `inspection-report` - 상세 보고서

### PDF 옵션
- A4 크기
- 상하좌우 20mm 마진
- 배경색 포함
- 헤더/푸터 지원

### 파일 구조
```
reports/
├── report-{case_id}-{timestamp}.pdf
└── templates/
    ├── simple-report.hbs
    └── inspection-report.hbs
```

## SMS 발송 기능

### 지원 서비스
- **네이버 클라우드 플랫폼 SMS** (실제 발송)
- **Mock SMS** (개발용)

### SMS 유형
- **기본 SMS**: 자유 메시지 발송
- **환영 SMS**: 신규 사용자 환영 메시지
- **점검 완료 알림**: 하자 등록 완료 알림
- **보고서 발송 알림**: PDF 보고서 발송 알림

### 환경 설정
```bash
# 네이버 클라우드 플랫폼 SMS 설정
SMS_SERVICE_ID=your-service-id
SMS_ACCESS_KEY=your-access-key
SMS_SECRET_KEY=your-secret-key
SMS_FROM_NUMBER=01012345678
```

### 전화번호 형식
- **입력**: 010-1234-5678 또는 01012345678
- **검증**: 010으로 시작하는 11자리 숫자
- **자동 포맷팅**: 010-1234-5678 형식으로 변환

## 테스트

```bash
# 데이터베이스 테스트
npm run test-db

# 파일 업로드 테스트
npm run test-upload

# PDF 생성 테스트
npm run test-pdf

# SMS 발송 테스트
npm run test-sms
```

## 환경 변수

```bash
# 서버 설정
PORT=3000
NODE_ENV=development

# 데이터베이스 설정
DB_HOST=localhost
DB_PORT=5432
DB_NAME=insighti_db
DB_USER=postgres
DB_PASSWORD=your_password

# JWT 설정
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=3d

# 파일 업로드 설정
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760

# SMS 설정
SMS_SERVICE_ID=your-service-id
SMS_ACCESS_KEY=your-access-key
SMS_SECRET_KEY=your-secret-key
SMS_FROM_NUMBER=01012345678
```# Last updated: Sat Oct 11 16:16:17 KST 2025
