# PowerPoint 보고서 생성 기능 배포 노트

## 배포 일시
2026-01-16

## 배포된 기능

### PowerPoint 보고서 생성 기능
- 템플릿 기반 PowerPoint 보고서 생성
- 세대 정보 자동 삽입
- 하자 목록 및 사진 포함
- 측정 정보 (공기질, 라돈, 레벨기, 열화상) 및 사진 포함
- 요약 테이블 자동 생성

## 새로운 API 엔드포인트

### `POST /api/reports/generate-pptx`
PowerPoint 보고서 생성

**요청:**
```json
{
  "case_id": "CASE-12345678"  // 선택사항, 없으면 최신 케이스 사용
}
```

**응답:**
```json
{
  "success": true,
  "message": "PowerPoint generated successfully",
  "filename": "report-CASE-12345678-1234567890.pptx",
  "url": "/reports/report-CASE-12345678-1234567890.pptx",
  "download_url": "/api/reports/download/report-CASE-12345678-1234567890.pptx",
  "size": 1234567,
  "case_id": "CASE-12345678"
}
```

## 추가된 의존성

- `adm-zip`: ZIP 파일 처리
- `fast-xml-parser`: XML 파싱
- `pptxgenjs`: PowerPoint 생성 (설치됨, 현재는 사용 안 함)
- `sharp`: 이미지 처리 (이미 설치됨)

## 구현된 단계

1. ✅ 템플릿 분석
2. ✅ 플레이스홀더 시스템
3. ✅ 세대 정보 삽입
4. ✅ 이미지 삽입 및 최적화
5. ✅ 하자 정보 슬라이드 생성
6. ✅ 측정 정보 슬라이드 생성
7. ✅ 테이블 데이터 삽입
8. ✅ 프레젠테이션 파일 업데이트

## 파일 구조

```
backend/
├── utils/
│   ├── pptxGenerator.js          # 메인 PowerPoint 생성기
│   ├── pptxTemplateMapper.js     # 템플릿 매핑 유틸리티
│   └── pptxTableGenerator.js     # 테이블 생성 유틸리티
├── scripts/
│   ├── analyze-pptx-template.js  # 템플릿 분석
│   └── analyze-pptx-detailed.js  # 상세 분석
└── routes/
    └── reports.js                # API 엔드포인트
```

## 템플릿 파일

- 위치: `docs/보고서.pptx.pptx`
- 용도: PowerPoint 보고서 생성의 기본 템플릿

## 배포 후 확인 사항

1. 새로운 의존성 설치 확인
2. PowerPoint 생성 API 테스트
3. 이미지 처리 기능 확인
4. 파일 다운로드 기능 확인

## 알려진 제한사항

- PowerPoint XML 구조가 복잡하여 일부 레이아웃이 템플릿과 다를 수 있음
- 이미지 삽입 위치는 기본값 사용 (향후 개선 가능)
- 테이블 스타일은 기본 스타일 사용

## 향후 개선 사항

- 템플릿의 정확한 레이아웃 매핑
- 이미지 삽입 위치 자동 감지
- 테이블 스타일 커스터마이징
- 슬라이드 마스터 레이아웃 활용
