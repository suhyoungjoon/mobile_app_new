# InsightI 공사하자보수관리 앱 — 사용·운영 메뉴얼

최종 수정 반영 기준으로 정리한 통합 메뉴얼입니다.

---

## 1. 앱 개요

- **목적**: 건설 현장 하자 등록·점검·보고서 생성까지 한 흐름으로 관리
- **역할**
  - **입주자**: 본인 세대 하자 등록, 케이스/보고서 조회
  - **점검원**: 전체 세대 중 하자 있는 사용자 목록 → 세대별 하자 목록 → 하자별 점검결과 입력, **사용자 기준 종합 보고서** 생성·다운로드·SMS
  - **관리자**: 사용자/점검원/하자 관리, 푸시·AI 설정

---

## 2. 접속 정보

| 구분 | URL / 방법 |
|------|------------|
| **백엔드 API** | `https://mobile-app-new.onrender.com` (Render) |
| **프론트엔드** | Vercel 등에 배포한 웹앱 URL 사용 |
| **입주자 앱** | `https://[프론트도메인]/` 또는 `index.html` |
| **점검원 화면** | `https://[프론트도메인]/inspector.html` |
| **관리자** | `https://[프론트도메인]/admin.html` |
| **로컬** | `cd webapp && python3 -m http.server 8080` → `http://localhost:8080` |

- 프론트에서 API 주소는 `webapp/js/api.js` 등에서 백엔드 URL로 설정합니다.

---

## 3. 프로젝트 구조 (정리)

```
insighti_precheck_v2_enhanced/
├── backend/                    # Node.js API
│   ├── routes/                 # API 라우트
│   │   ├── reports.js          # 보고서(미리보기/PDF/발송) — 사용자 기준 전체 하자 + 하자별 점검
│   │   ├── defects.js          # 하자 CRUD, /defects/users(점검원용 사용자 목록)
│   │   ├── inspections.js      # 점검결과(공기질/라돈/레벨/열화상) — 하자별 defect_id 연결
│   │   ├── auth, cases, admin 등
│   ├── utils/
│   │   ├── pdfmakeGenerator.js # PDF 생성(하자 + 하자별 점검내용)
│   │   └── encryption, smsService 등
│   ├── templates/              # HTML 보고서 템플릿
│   └── database, middleware 등
├── webapp/                     # 프론트엔드
│   ├── index.html              # 입주자 메인
│   ├── inspector.html          # 점검원 전용 (사용자 목록 → 하자목록 → 점검입력·보고서)
│   ├── admin.html              # 관리자
│   ├── js/
│   │   ├── api.js              # API 클라이언트
│   │   ├── app.js              # 입주자 앱 로직
│   │   ├── inspector.js        # 점검원 화면 로직
│   │   ├── admin.js            # 관리자 로직
│   │   └── equipment.js, data.js 등
│   └── css/, sw.js 등
├── db/schema.sql               # DB 스키마
├── render.yaml                 # Render 배포 설정
├── deploy.sh                   # Git 커밋·푸시 (배포 트리거)
├── README.md                   # 프로젝트 소개·기능 목록
└── MANUAL.md                   # 본 메뉴얼
```

- **보고서**: 사용자(세대) 단위. 해당 세대에 등록된 **모든 하자**와, 각 하자에 연결된 **점검내용(inspection_item)**을 한 보고서에 담습니다.

---

## 4. 역할별 사용법

### 4.1 입주자

1. **로그인**  
   단지·동·호·성명·전화번호로 로그인(3일 사용권 등).
2. **하자 등록**  
   하자명 선택 → 위치·세부공정·내용·메모·사진(전체/근접) 입력 후 저장.
3. **하자 목록**  
   본인 세대 하자·케이스별로 조회.
4. **보고서**  
   미리보기·PDF 생성·다운로드(보고서는 해당 세대 전체 하자+하자별 점검으로 생성).

### 4.2 점검원

- **로그인**  
  complex 이름이 `admin`인 세대(점검원 계정)로 로그인.  
  `inspector.html`에서는 저장된 세션 또는 자동 로그인으로 진입.

- **화면 흐름**
  1. **사용자 목록** (`#user-list`)  
     - 하자가 등록된 세대 목록.  
     - **점검결과가 하나라도 있는 세대**는 상단 정렬 + **점검완료** 뱃지·카드 강조.
  2. **하자 목록** (`#defect-list`)  
     - 사용자 선택 시 해당 세대의 하자 목록.  
     - 하자별 **점검대기/점검완료** 뱃지.  
     - 「하자목록 보기」「보고서 미리보기」「보고서 다운로드」.
  3. **점검결과 입력** (`#defect-inspection`)  
     - 하자 선택 후 공기질/라돈/레벨기/열화상 탭에서 측정값·사진 입력 후 저장.  
     - 저장 시 해당 하자 상태가 점검완료로 반영되고, 사용자 목록에서도 반영됨.
  4. **보고서** (`#report`)  
     - **미리보기**: 해당 세대 기준 **등록된 모든 하자** + **하자별 점검내용** 표시.  
     - **PDF 미리보기/다운로드**: 동일 내용으로 PDF 생성.  
     - **SMS 발송**: PDF 링크를 SMS로 전송(서버 설정에 따라 동작).

- **보고서 정책**  
  - **대상**: 선택한 사용자(세대) 한 명.  
  - **내용**: 그 세대에 속한 **모든 케이스의 모든 하자** + 각 하자에 등록된 **점검내용(공기질/라돈/레벨/열화상)**.

### 4.3 관리자

- **접속**  
  `admin.html` 접속 후 관리자 계정으로 로그인.
- **기능**  
  사용자 목록·유형 변경, 하자 조회, 점검원 등록 신청 승인/거부, AI 판정 설정, 푸시 알림 설정, 대시보드 등.

---

## 5. 보고서 동작 요약

- **범위**: 한 **사용자(세대)** 단위.
- **하자**: 해당 세대에 등록된 **모든 케이스의 모든 하자** 포함.
- **점검내용**: 각 하자에 대해 `inspection_item.defect_id`로 연결된 항목만 **하자별**로 정리해 표시(공기질/라돈/레벨/열화상).
- **API**
  - 미리보기: `GET /api/reports/preview?household_id=...`
  - PDF 생성: `POST /api/reports/generate` (body에 `household_id`)
  - 발송: `POST /api/reports/send` (body에 `household_id`, `phone_number` 등)

---

## 6. 로컬 실행

```bash
# 백엔드 (PostgreSQL 필요, .env 또는 config에 DB 설정)
cd backend
npm install
npm run dev   # 또는 npm start

# 프론트 (별도 터미널)
cd webapp
python3 -m http.server 8080
# http://localhost:8080, http://localhost:8080/inspector.html, http://localhost:8080/admin.html
```

- 프론트가 로컬일 때 `api.js`의 `baseURL`을 로컬 백엔드(예: `http://localhost:3000/api`)로 두면 됩니다.

---

## 7. 배포 요약

- **백엔드**: Render. 저장소 푸시 시 자동 배포. `render.yaml`(rootDir: backend, build/start 명령) 참고.
- **프론트**: Vercel 등 정적 호스팅에 `webapp` 빌드 결과 또는 정적 파일 배포.
- **배포 트리거**:  
  `./deploy.sh` 또는  
  `git add . && git commit -m "..." && git push origin main`

---

## 8. 문제 해결

| 현상 | 확인·조치 |
|------|-----------|
| 점검원 화면 로그인 안 됨 | DB에 complex 이름 `admin`인 단지·세대 존재 여부, 점검원 계정 정보 확인 |
| 보고서에 하자/점검 없음 | 해당 세대에 하자 등록 여부, 점검 시 `defect_id` 연결 여부 확인 |
| PDF 한글 깨짐 | `backend/fonts/`에 Noto Sans KR 등 한글 폰트 설치 여부 확인 |
| CORS/API 연결 실패 | 프론트 도메인이 백엔드 CORS에 포함되는지, API URL이 맞는지 확인 |

---

## 9. 참고 문서

- **README.md** — 프로젝트 소개, 기능 목록, 아키텍처
- **ACCESS_GUIDE.md** — 접속 URL·SSO 등 상세 접속 방법
- **DEPLOYMENT_GUIDE.md** — 배포 절차 상세
- **INSPECTOR_SCREEN_GUIDE.md** — 점검원 화면 상세(일부 흐름은 위 4.2로 최신화됨)
- **ADMIN_MANUAL.md** — 관리자 기능 상세

위 메뉴얼은 최근 수정(사용자 목록 점검완료 정렬/표시, 보고서 사용자 기준 전체 하자+하자별 점검내용)을 반영한 기준으로 작성되었습니다.
