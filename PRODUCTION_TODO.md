# 🚀 상용 서비스 전환 작업 목록

## 📋 필수 작업 (우선순위 높음)

### 1. 파일 스토리지 마이그레이션 (S3)

#### 작업 내용
- [ ] AWS S3 버킷 생성
- [ ] AWS IAM 사용자 생성 및 권한 설정
- [ ] `backend/utils/fileUpload.js` 수정
  - S3 SDK (`aws-sdk` 또는 `@aws-sdk/client-s3`) 설치
  - S3 업로드 로직 구현
  - 기존 로컬 파일 저장 로직 제거
- [ ] 환경변수 추가:
  - `AWS_ACCESS_KEY_ID`
  - `AWS_SECRET_ACCESS_KEY`
  - `AWS_REGION`
  - `S3_BUCKET_NAME`
- [ ] 기존 파일 마이그레이션 스크립트 작성
- [ ] 테스트: 파일 업로드/다운로드 확인

#### 예상 소요 시간
- **3-5일**

---

### 2. 자동 삭제 스케줄러 구현

#### 작업 내용
- [ ] `node-cron` 패키지 설치
- [ ] `backend/scripts/cleanup-old-files.js` 생성
  - 1개월 이상 된 사진 파일 삭제
  - 1개월 이상 된 보고서 삭제
  - DB 레코드 삭제
  - S3 파일 삭제
- [ ] `backend/server.js`에 스케줄러 등록
  - 매일 새벽 2시 실행
- [ ] 삭제 로그 기록
- [ ] 관리자 알림 (선택)

#### 예상 소요 시간
- **2-3일**

---

### 3. AI 일일 50회 제한 구현

#### 작업 내용
- [ ] 데이터베이스 테이블 생성
  ```sql
  CREATE TABLE ai_usage_daily (
    id SERIAL PRIMARY KEY,
    household_id INTEGER REFERENCES household(id),
    usage_date DATE NOT NULL,
    usage_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMP,
    UNIQUE(household_id, usage_date)
  );
  ```
- [ ] `backend/routes/azure-ai.js` 수정
  - 일일 사용량 체크 로직 추가
  - 50회 초과 시 에러 반환
- [ ] `backend/middleware/checkAIUsage.js` 미들웨어 생성
- [ ] 관리자 페이지에 사용량 통계 추가

#### 예상 소요 시간
- **2일**

---

### 4. Rate Limiting 구현

#### 작업 내용
- [ ] `express-rate-limit` 패키지 설치
- [ ] `backend/middleware/rateLimiter.js` 생성
  - 사용자별 분당 요청 제한
  - IP별 요청 제한
- [ ] 주요 API 엔드포인트에 적용
  - `/api/auth/*`
  - `/api/defects`
  - `/api/inspections/*`
  - `/api/upload/*`

#### 예상 소요 시간
- **1-2일**

---

## 🔧 중요 작업 (1개월 내)

### 5. 데이터 백업 자동화

#### 작업 내용
- [ ] PostgreSQL 덤프 스크립트 작성
- [ ] S3에 백업 파일 업로드
- [ ] 주간 전체 백업 스케줄 설정
- [ ] 일일 증분 백업 (선택)
- [ ] 백업 복원 테스트

#### 예상 소요 시간
- **3일**

---

### 6. 모니터링 도구 설정

#### 작업 내용
- [ ] Sentry 계정 생성 및 프로젝트 설정
- [ ] `@sentry/node` 패키지 설치
- [ ] 백엔드에 Sentry 연동
- [ ] 프론트엔드에 Sentry 연동 (선택)
- [ ] 알림 설정 (Slack/이메일)

#### 예상 소요 시간
- **2-3일**

---

### 7. 관리자 대시보드 개선

#### 작업 내용
- [ ] 통계 API 엔드포인트 추가
  - 일일/월간 트랜잭션 통계
  - 사용자 활동 통계
  - 스토리지 사용량
  - AI 사용량 통계
- [ ] 대시보드 UI 개선
  - 차트 라이브러리 추가 (Chart.js)
  - 실시간 통계 표시

#### 예상 소요 시간
- **1주**

---

### 8. 성능 최적화

#### 작업 내용
- [ ] 이미지 압축 최적화
  - WebP 포맷 지원
  - 압축 품질 조정
- [ ] 데이터베이스 쿼리 최적화
  - 느린 쿼리 분석
  - 인덱스 추가/제거
- [ ] API 응답 캐싱 (선택)
  - 자주 조회되는 데이터 캐싱

#### 예상 소요 시간
- **1주**

---

## 🔒 보안 강화 작업

### 9. API 보안 강화

#### 작업 내용
- [ ] CORS 설정 점검
- [ ] CSRF 토큰 추가 (필요 시)
- [ ] 입력 검증 강화
- [ ] SQL Injection 방지 확인
- [ ] XSS 방지 확인

#### 예상 소요 시간
- **2-3일**

---

### 10. SSL/HTTPS 설정

#### 작업 내용
- [ ] Vercel 커스텀 도메인 설정
- [ ] Render 커스텀 도메인 설정
- [ ] SSL 인증서 자동 갱신 확인

#### 예상 소요 시간
- **1일**

---

## 📊 스케일링 준비 (향후 대비)

### 11. 로드 밸런싱 준비

#### 작업 내용
- [ ] Stateless 아키텍처 확인
- [ ] 세션 저장소 분리 (Redis, 선택)
- [ ] 환경변수 관리 강화

#### 예상 소요 시간
- **3-5일** (Redis 추가 시)

---

## 📝 작업 일정 제안

### Week 1-2: 필수 작업
- 파일 스토리지 S3 마이그레이션
- 자동 삭제 스케줄러
- AI 일일 50회 제한
- Rate Limiting

### Week 3-4: 중요 작업
- 데이터 백업 자동화
- 모니터링 도구 설정
- 관리자 대시보드 개선
- 성능 최적화

### Week 5+: 선택 작업
- 보안 강화
- 스케일링 준비

---

## ✅ 체크리스트

### 인프라
- [ ] Vercel Pro 플랜 업그레이드
- [ ] Render Professional 플랜 업그레이드
- [ ] Render PostgreSQL Professional 플랜 업그레이드
- [ ] AWS S3 버킷 생성 및 설정
- [ ] Azure OpenAI 리소스 확인

### 코드
- [ ] S3 파일 업로드/다운로드 구현
- [ ] 자동 삭제 스케줄러 구현
- [ ] AI 사용량 제한 구현
- [ ] Rate Limiting 적용
- [ ] 모니터링 도구 연동
- [ ] 관리자 대시보드 개선

### 테스트
- [ ] 파일 업로드/다운로드 테스트
- [ ] 자동 삭제 기능 테스트
- [ ] AI 제한 기능 테스트
- [ ] Rate Limiting 테스트
- [ ] 부하 테스트 (선택)

### 문서
- [ ] 운영 매뉴얼 업데이트
- [ ] 비용 분석 문서 작성
- [ ] 모니터링 가이드 작성

---

**총 예상 소요 시간: 4-6주**

