# Render PostgreSQL 연결 정보 확인 가이드

## 🔍 Render 대시보드에서 연결 정보 확인

### 1단계: Render 대시보드 접속
- URL: https://dashboard.render.com
- 로그인 후 PostgreSQL 서비스 선택

### 2단계: 연결 정보 확인
PostgreSQL 서비스 페이지에서:

1. **"Connect" 탭 클릭**
2. **"External Connection" 섹션 확인**
3. **다음 정보 복사:**
   - Host (호스트명)
   - Port (포트번호, 보통 5432)
   - Database (데이터베이스명)
   - Username (사용자명)
   - Password (비밀번호)

### 3단계: 연결 문자열 구성

```bash
# 형식
postgresql://사용자명:비밀번호@호스트:포트/데이터베이스명

# 예시
postgresql://insighti_db_user:비밀번호@dpg-d3jle0ndiees73ckef60-a.singapore-postgres.render.com:5432/insighti_db
```

## 🔧 로컬 연결 설정

### 방법 1: 환경 변수 설정

```bash
# 터미널에서 실행
export DATABASE_URL="postgresql://사용자명:비밀번호@호스트:포트/데이터베이스명"

# 확인
echo $DATABASE_URL
```

### 방법 2: .env 파일 생성

```bash
# 프로젝트 루트에 .env 파일 생성
echo "DATABASE_URL=postgresql://사용자명:비밀번호@호스트:포트/데이터베이스명" > .env
```

### 방법 3: 직접 연결 테스트

```bash
# psql 클라이언트로 직접 연결 테스트
psql "postgresql://사용자명:비밀번호@호스트:포트/데이터베이스명"
```

## 🚨 주의사항

1. **비밀번호 특수문자**: URL 인코딩 필요할 수 있음
2. **방화벽**: Render에서 외부 연결 허용 확인
3. **SSL**: SSL 연결 필요할 수 있음

## ✅ 연결 테스트

연결 정보 설정 후:

```bash
cd backend
node scripts/init-render-db.js
```

성공하면:
```
🔗 Connecting to database...
🔌 데이터베이스 연결 성공
📋 스키마 생성 중...
✅ 데이터베이스 초기화 완료!
```

실패하면:
```
Fatal error: Error: Connection terminated unexpectedly
```

## 🎯 다음 단계

1. Render 대시보드에서 연결 정보 확인
2. 로컬에 DATABASE_URL 설정
3. 마이그레이션 스크립트 실행
4. Phase 2 API 개발 시작
