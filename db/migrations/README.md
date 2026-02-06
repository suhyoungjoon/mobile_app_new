# DB 마이그레이션

## 001_pdf_form_columns.sql (점검결과 PDF 양식 컬럼)

### 방법 1: Node 스크립트 (권장)

`DATABASE_URL`을 설정한 뒤 실행:

```bash
# 프로젝트 루트에서
export DATABASE_URL="postgresql://사용자:비밀번호@호스트:5432/DB이름"
node backend/scripts/run-pdf-form-migration.js
```

또는 backend에서:

```bash
cd backend
DATABASE_URL="postgresql://..." npm run migrate:pdf-form
```

### 방법 2: psql 직접 실행

```bash
psql "$DATABASE_URL" -f db/migrations/001_pdf_form_columns.sql
```

### 방법 3: Docker Compose 로컬 DB

로컬에서 Postgres만 띄운 경우:

```bash
docker compose up -d postgres
# 스키마가 이미 있다면:
DATABASE_URL="postgresql://postgres:insighti123@127.0.0.1:5432/insighti_db" node backend/scripts/run-pdf-form-migration.js
```

(로컬 Postgres에 `postgres` 사용자가 없으면 해당 DB에 맞는 사용자/비밀번호로 `DATABASE_URL`을 설정하세요.)
