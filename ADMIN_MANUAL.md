# 👨‍💼 InsightI 관리자 매뉴얼

## 📖 목차
1. [관리자 페이지 접속](#관리자-페이지-접속)
2. [대시보드](#대시보드)
3. [사용자 관리](#사용자-관리)
4. [하자 관리](#하자-관리)
5. [점검원 관리](#점검원-관리)
6. [시스템 관리](#시스템-관리)
7. [문제 해결](#문제-해결)

---

## 🔐 관리자 페이지 접속

### 접속 방법
- **URL**: https://insighti.vercel.app/admin.html
- **기본 계정**:
  - 이메일: `admin@insighti.com`
  - 비밀번호: `admin123`

> **중요**: 최초 로그인 후 비밀번호를 변경하세요.

### 권한 레벨
- **super_admin**: 최고 관리자 (모든 권한)
- **admin**: 일반 관리자 (제한된 권한)

---

## 📊 대시보드

### 전체 현황
대시보드에서 다음 정보를 한눈에 확인할 수 있습니다:

#### 통계 카드
- **전체 사용자 수**: 등록된 총 사용자 수
- **활성 하자 수**: 처리 대기 중인 하자 개수
- **오늘 등록된 하자**: 오늘 등록된 하자 개수
- **점검 완료 케이스**: 점검이 완료된 케이스 수

#### 최근 활동
- 최근 하자 등록 내역
- 최근 점검원 등록 신청
- 최근 사용자 활동

#### 차트 (향후 구현)
- 하자 유형별 통계
- 시간대별 하자 등록 추이
- 지역별 하자 분포

---

## 👥 사용자 관리

### 사용자 목록 조회
1. 사이드바에서 **"👥 사용자 관리"** 메뉴 선택
2. 등록된 모든 사용자 목록이 표시됩니다.

#### 사용자 정보
각 사용자는 다음 정보를 포함합니다:
- **단지명**: 사용자가 속한 아파트 단지
- **동/호**: 동과 호수
- **성명**: 사용자 이름
- **전화번호**: 연락처
- **사용자 유형**: resident (입주자), company (점검원), admin (관리자)
- **등록일**: 계정 생성일
- **상태**: 활성/비활성

### 사용자 유형 변경
1. 사용자 목록에서 대상 사용자 선택
2. **"사용자 유형 변경"** 버튼 클릭
3. 새로운 유형 선택:
   - **입주자 (resident)**: 기본 권한, 하자 등록/조회만 가능
   - **점검원 (company)**: 장비 점검 권한 포함
   - **관리자 (admin)**: 전체 권한 (관리자 페이지 접근 가능)

> **주의**: 사용자 유형을 변경하면 해당 사용자의 권한이 즉시 변경됩니다.

### 사용자 계정 비활성화
1. 사용자 목록에서 대상 사용자 선택
2. **"계정 비활성화"** 버튼 클릭
3. 확인 다이얼로그에서 확인

> **참고**: 비활성화된 사용자는 로그인할 수 없습니다.

---

## 🏗️ 하자 관리

### 하자 목록 조회
1. 사이드바에서 **"🏗️ 하자 관리"** 메뉴 선택
2. 등록된 모든 하자 목록이 표시됩니다.

#### 하자 정보
각 하자는 다음 정보를 포함합니다:
- **하자 ID**: 고유 식별자
- **위치**: 하자 발생 위치 (예: 거실, 주방)
- **세부공정**: 공정 유형 (예: 바닥재, 타일)
- **하자 내용**: 상세 설명
- **등록일시**: 하자 등록 시간
- **등록자**: 하자를 등록한 사용자
- **상태**: 처리 상태 (대기/처리중/완료)

### 하자 상세 정보
1. 하자 목록에서 하자 카드 클릭
2. 상세 정보가 표시됩니다:
   - 하자 사진 (전체/근접)
   - 메모
   - 케이스 정보
   - 등록자 정보

### 하자 처리 상태 변경
1. 하자 상세 화면에서 **"처리 상태 변경"** 버튼 클릭
2. 새로운 상태 선택:
   - **대기**: 처리 대기 중
   - **처리중**: 현재 처리 중
   - **완료**: 처리 완료

### 하자 검색 및 필터링
- **검색**: 하자 내용, 위치, 등록자로 검색
- **필터링**: 
  - 사용자 유형별
  - 상태별
  - 날짜별
  - 단지별

---

## 🔧 점검원 관리

### 점검원 등록 신청 목록
1. 사이드바에서 **"🔧 점검원 관리"** 메뉴 선택
2. 점검원 등록 신청 목록이 표시됩니다.

#### 신청 정보
각 신청은 다음 정보를 포함합니다:
- **신청자**: 점검원 이름
- **단지/동/호**: 소속 정보
- **전화번호**: 연락처
- **회사명**: 소속 회사 (선택사항)
- **면허번호**: 자격증 번호 (선택사항)
- **이메일**: 이메일 주소 (선택사항)
- **등록 사유**: 신청 사유
- **신청일시**: 신청한 시간
- **상태**: pending (대기), approved (승인), rejected (거부)

### 점검원 승인
1. 신청 목록에서 승인할 신청 선택
2. **"승인"** 버튼 클릭
3. 확인 다이얼로그에서 확인
4. 승인 완료 후 해당 사용자의 **user_type**이 `company`로 자동 변경됩니다.
5. 승인 완료 알림이 해당 사용자에게 전송됩니다.

### 점검원 거부
1. 신청 목록에서 거부할 신청 선택
2. **"거부"** 버튼 클릭
3. 거부 사유 입력
4. 확인 다이얼로그에서 확인
5. 거부 사유와 함께 알림이 해당 사용자에게 전송됩니다.

### 점검원 통계
- **전체 점검원 수**: 승인된 점검원 수
- **대기 중인 신청**: 승인 대기 중인 신청 수
- **이번 달 신청**: 이번 달 신청 수
- **최근 승인**: 최근 승인된 점검원 목록

---

## ⚙️ 시스템 관리

### AI 판정 설정

#### AI 판정 모드 설정
1. 사이드바에서 **"🤖 AI 판정 설정"** 메뉴 선택
2. AI 판정 모드 선택:
   - **로컬 규칙 기반**: 이미지 통계 분석 (빠르고 무료)
   - **Azure OpenAI**: GPT-4 Vision 활용 (고급 분석, 유료)
   - **Hugging Face**: 오픈소스 AI 모델 (무료/유료)
   - **하이브리드**: 로컬 분석 후 신뢰도가 낮으면 클라우드 AI로 전환

#### AI 판정 상세 설정

##### 로컬 규칙 기반 설정
- **활성화**: 로컬 규칙 기반 분석 사용 여부
- **기본 신뢰도**: 0.0 ~ 1.0 (기본값: 0.65)
- **규칙**: 이미지 통계 기반 판정 규칙 (JSON 형식)

##### Azure OpenAI 설정
- **활성화**: Azure OpenAI 사용 여부
- **Fallback 임계값**: 로컬 신뢰도가 이 값 이하일 때 Azure 호출 (기본값: 0.8)
- **최대 감지 개수**: 한 번에 감지할 최대 하자 개수 (기본값: 3)

##### Hugging Face 설정
- **활성화**: Hugging Face API 사용 여부
- **모델명**: 사용할 모델 (예: `microsoft/resnet-50`)
- **작업 유형**: 
  - `image-classification`: 이미지 분류
  - `object-detection`: 객체 감지 (YOLO 등)
  - `image-to-text`: 이미지 설명 생성
  - `visual-question-answering`: 시각적 질문 답변
- **프롬프트**: 범용 모델 사용 시 질문 프롬프트 (예: "Describe any building defects such as cracks, water leaks, mold, or safety issues in this photo.")

#### AI 판정 설정 저장
1. 모든 설정을 입력한 후 **"저장"** 버튼 클릭
2. 설정이 즉시 적용됩니다.
3. 다음 하자 등록부터 새로운 AI 판정 설정이 사용됩니다.

> **참고**: 
> - Hugging Face API를 사용하려면 `HUGGINGFACE_API_TOKEN` 환경변수가 설정되어 있어야 합니다.
> - Azure OpenAI를 사용하려면 Azure OpenAI API 키가 설정되어 있어야 합니다.
> - 자세한 설정 방법은 `AZURE_OPENAI_SETUP.md` 참조

### 환경 설정

#### VAPID 키 설정 (푸시 알림)

##### VAPID 키 생성 (필요 시)
1. 로컬 컴퓨터에서 다음 명령 실행:
   ```bash
   cd backend
   npm install web-push
   node scripts/generate-vapid-keys.js
   ```
2. 생성된 Public Key와 Private Key 복사

##### Render 환경변수 설정
1. **Render Dashboard** 접속: https://dashboard.render.com
2. **InsightI 백엔드 서비스** 선택
3. **Environment** 탭 이동
4. 다음 환경변수 추가/수정:
   ```
   VAPID_PUBLIC_KEY=<생성된_공개키>
   VAPID_PRIVATE_KEY=<생성된_개인키>
   ```
5. **Save Changes** 클릭
6. **서비스 재배포** (자동 또는 수동)

##### 현재 설정된 VAPID 키 (예시)
- **Public Key**: `BDXtZx5xFDLqIptU9rFaaOjfh1gaGI-UbxE3p6juZZFiG3z1969zYCOrOOBTP6MkrYRQqrq_Na29J4r9rP0Gm7E`
- **Private Key**: `wVMmO1UvL4hOJ9_y5-kAXh2S8I0Zv4SLyJTk0_OFzSA`

> **중요**: 
> - Private Key는 절대 공개하지 마세요!
> - 환경변수 설정 후 반드시 서비스를 재배포해야 합니다
> - 자세한 설정 방법은 `PUSH_SETUP_COMPLETE.md` 참조

#### YouTube API 키 설정
1. Render Dashboard 접속
2. 백엔드 서비스 → Environment
3. 다음 환경변수 확인:
   - `YOUTUBE_API_KEY`

> **참고**: YouTube API 키 발급 방법은 `PUSH_NOTIFICATION_RESET_GUIDE.md` 참조

### 데이터베이스 관리

#### 데이터베이스 연결 확인
- Render Dashboard → PostgreSQL 서비스 → Connection 확인

#### 데이터 백업
- Render PostgreSQL은 자동 백업을 제공합니다.
- 수동 백업이 필요한 경우 Render 대시보드에서 다운로드 가능합니다.

#### 푸시 알림 관련 테이블 확인
- **push_subscription**: 푸시 알림 구독 정보 저장
  ```sql
  SELECT COUNT(*) as total_subscriptions FROM push_subscription;
  SELECT COUNT(*) as active_subscriptions 
  FROM push_subscription 
  WHERE created_at > NOW() - INTERVAL '30 days';
  ```

#### 테이블 구조 확인
```sql
-- push_subscription 테이블 구조 확인
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'push_subscription'
ORDER BY ordinal_position;
```

### 로그 확인

#### 백엔드 로그
1. Render Dashboard 접속
2. 백엔드 서비스 선택
3. **Logs** 탭에서 실시간 로그 확인

#### 주요 로그 유형
- **API 요청 로그**: 모든 API 요청 기록
- **에러 로그**: 에러 발생 시 상세 정보
- **푸시 알림 로그**: 알림 발송 성공/실패 기록

---

## 📊 통계 및 리포트

### 일일 통계
- 오늘 등록된 하자 수
- 오늘 완료된 하자 수
- 오늘 등록된 점검 항목 수
- 활성 사용자 수

### 월간 통계
- 이번 달 하자 등록 추이
- 이번 달 점검 완료율
- 사용자 증가율

### 보고서 생성
1. **보고서** 메뉴 선택 (향후 구현)
2. 기간 선택
3. 보고서 타입 선택:
   - 하자 현황 보고서
   - 점검 결과 보고서
   - 통합 보고서
4. **생성** 버튼 클릭
5. PDF 다운로드 또는 이메일 발송

---

## 🔒 보안 관리

### 관리자 계정 관리
- 정기적으로 비밀번호 변경
- 강력한 비밀번호 사용 (최소 8자, 대소문자, 숫자, 특수문자 포함)
- 2단계 인증 활성화 (향후 구현)

### 사용자 데이터 보호
- **개인정보 암호화**: AES-256-CBC 알고리즘으로 암호화하여 저장
  - 암호화 대상: 이름, 전화번호, 이메일, 점검원 이름
  - 암호화 키: `ENCRYPTION_KEY` 환경변수로 관리
  - 자동 암호화/복호화: API 레벨에서 자동 처리
- 데이터 접근 권한 관리
- 정기적인 보안 감사 (향후 구현)

### API 보안
- JWT 토큰 기반 인증
- HTTPS 통신 강제
- CORS 설정 확인

---

## ❓ 문제 해결

### 관리자 로그인이 안 될 때
- 이메일과 비밀번호가 정확한지 확인하세요.
- 계정이 활성화되어 있는지 확인하세요.
- 비밀번호를 잊으셨다면 데이터베이스에서 직접 확인하거나 재설정이 필요합니다.

### 사용자 목록이 표시되지 않을 때
- 데이터베이스 연결을 확인하세요.
- Render 백엔드 서비스 상태를 확인하세요.
- 브라우저 콘솔에서 에러 메시지를 확인하세요.

### 점검원 승인이 안 될 때
- 데이터베이스 연결을 확인하세요.
- 해당 사용자의 household_id가 존재하는지 확인하세요.
- 백엔드 로그에서 에러 메시지를 확인하세요.

### 푸시 알림이 발송되지 않을 때

#### 1. VAPID 키 확인
- Render Dashboard → Environment에서 `VAPID_PUBLIC_KEY`와 `VAPID_PRIVATE_KEY` 확인
- 환경변수가 올바르게 설정되어 있는지 확인
- 서비스 재배포가 완료되었는지 확인

#### 2. 데이터베이스 확인
```sql
-- Render PostgreSQL Query에서 실행
SELECT 
  ps.id,
  ps.household_id,
  ps.user_type,
  ps.endpoint,
  ps.created_at,
  h.dong,
  h.ho,
  h.resident_name
FROM push_subscription ps
JOIN household h ON ps.household_id = h.id
ORDER BY ps.created_at DESC
LIMIT 10;
```
- 구독 정보가 저장되어 있는지 확인
- 구독한 사용자 수 확인

#### 3. 백엔드 로그 확인
- Render Dashboard → Logs 탭
- 푸시 알림 관련 에러 확인:
  - `VAPID key not configured` → 환경변수 설정 필요
  - `Failed to send notification` → 구독 정보 문제
  - `Invalid subscription` → 만료된 구독 정보

#### 4. API 테스트
```bash
# VAPID Public Key 조회 테스트
curl https://mobile-app-new.onrender.com/api/push/vapid-key

# 응답 예시:
# {"publicKey": "BDXtZx5xFDLqIptU9rFaaOjfh1gaGI-UbxE3p6juZZFiG3z1969zYCOrOOBTP6MkrYRQqrq_Na29J4r9rP0Gm7E"}
```

#### 5. 구독 정보 문제
- 만료된 구독 정보는 자동으로 삭제됩니다
- 사용자가 브라우저 캐시를 삭제하면 재구독이 필요합니다
- 구독 정보 삭제:
  ```sql
  DELETE FROM push_subscription WHERE endpoint = '<만료된_endpoint>';
  ```

#### 6. 브라우저 호환성
- Chrome, Edge, Firefox 최신 버전 지원
- Safari 16+ 지원
- 모바일 브라우저 지원 확인

### YouTube 동영상 검색이 안 될 때
- YouTube API 키가 올바르게 설정되었는지 확인하세요.
- YouTube API 할당량을 확인하세요 (일일 10,000 단위)
- 백엔드 로그에서 API 응답을 확인하세요.
- 하자명이 정확한지 확인하세요 (하자명 기반으로 자동 검색됩니다).

### AI 판정이 작동하지 않을 때
- **로컬 규칙 기반**: 항상 작동 (설정 불필요)
- **Azure OpenAI**: 
  - `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_API_KEY` 환경변수 확인
  - Azure OpenAI 리소스가 활성화되어 있는지 확인
- **Hugging Face**: 
  - `HUGGINGFACE_API_TOKEN` 환경변수 확인
  - 모델명이 올바른지 확인 (예: `microsoft/resnet-50`)
  - 모델 접근 권한이 있는지 확인 (일부 모델은 Inference Endpoint 필요)
- 관리자 페이지에서 AI 판정 설정 확인
- 백엔드 로그에서 AI 판정 에러 확인

---

## 📞 기술 지원

### 시스템 문제
- 이메일: admin@insighti.com
- 전화: 1588-0000 (평일 09:00-18:00)

### 데이터베이스 문제
- Render Dashboard에서 PostgreSQL 서비스 상태 확인
- 데이터베이스 로그 확인

### 배포 문제
- Render 백엔드 서비스 재배포
- Vercel 프론트엔드 재배포

---

## 📝 버전 정보

- **현재 버전**: v4.0.0
- **최종 업데이트**: 2025년 11월
- **관리자 페이지 URL**: https://insighti.vercel.app/admin
- **주요 업데이트**:
  - 푸시 알림 시스템 완전 구현
  - Service Worker Push 이벤트 지원
  - 데이터베이스 push_subscription 테이블 생성
  - VAPID 키 기반 푸시 알림 설정 완료
  - AI 판정 시스템 다중 엔진 지원
    - 로컬 규칙 기반 분석
    - Azure OpenAI GPT-4 Vision
    - Hugging Face 오픈소스 모델
    - 하이브리드 모드 (자동 전환)
  - 관리자 AI 판정 설정 화면 추가
  - 관리자 대시보드 푸시 알림 수동 활성화 기능
  - 개인정보 암호화 저장 (AES-256-CBC)
  - YouTube 실시간 검색 (하자명 기반)

---

## 🎯 주요 기능 요약

### ✅ 구현 완료된 기능
- 사용자 관리 (조회, 유형 변경, 비활성화)
- 하자 관리 (조회, 상세 정보, 상태 변경)
- 점검원 관리 (신청 목록, 승인/거부)
- 대시보드 (전체 현황, 통계, 푸시 알림 상태)
- AI 판정 설정 (로컬/Azure/Hugging Face/하이브리드 모드)
- 시스템 로그 확인
- 푸시 알림 시스템 (구독 관리, 알림 발송, 관리자 수동 활성화)
- YouTube 실시간 검색 (하자명 기반 동영상 자동 검색)
- 개인정보 암호화 저장

### 🔄 향후 구현 예정
- 통계 차트
- 보고서 생성 및 다운로드
- 데이터 내보내기 (Excel, CSV)
- 고급 검색 및 필터링
- 사용자 활동 로그
- 알림 설정 관리

---

**효율적인 시스템 관리를 위해 이 매뉴얼을 참고하세요!** 👨‍💼✨

