# 보고서 기능 정리

## 현재 제공 기능 (PDF 전용)

보고서는 **PDF만** 생성·미리보기·다운로드합니다. PDF는 범용 포맷이라 대부분의 기기·OS에서 별도 프로그램 없이 열 수 있습니다.

| 기능 | 설명 | 사용 위치 |
|------|------|-----------|
| **보고서 미리보기** | 하자 목록·측정 데이터를 화면에서 확인 | 점검원 화면 → 보고서 탭 |
| **PDF 생성** | 세대 정보 + 하자 + 장비점검(공기질/라돈/수평/열화상)을 PDF로 생성 | 점검원 화면 → "PDF 미리보기" / "PDF 다운로드" |
| **PDF 미리보기** | 생성된 PDF를 브라우저 새 창에서 열기 | 점검원 화면 → "PDF 미리보기" 버튼 |
| **PDF 다운로드** | 생성된 PDF 파일 다운로드 | 점검원 화면 → "PDF 다운로드" 버튼 |
| **SMS 발송** | PDF 보고서 링크를 SMS로 발송 (모의) | 점검원 화면 → "SMS 발송" 버튼 |

## API (백엔드)

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/reports/preview` | 보고서 미리보기용 데이터 (하자·장비점검) |
| POST | `/api/reports/generate` | **PDF 보고서 생성** (실제 사용) |
| GET | `/api/reports/preview-pdf/:filename` | PDF 파일 미리보기 (inline) |
| GET | `/api/reports/download/:filename` | PDF 파일 다운로드 |
| POST | `/api/reports/send` | PDF 생성 후 SMS 발송 (모의) |

- `filename`은 반드시 `.pdf` 확장자만 허용됩니다.
- 생성된 PDF 저장 위치: `backend/reports/` (예: `report-{caseId}-{timestamp}.pdf`)

## PDF 보고서 내용

- **헤더**: CM형 사전/사후점검 종합 보고서, Tel/Email
- **세대 정보**: 단지명, 동/호, 입주자명, 점검 유형, 점검일 등
- **하자 목록**: 위치, 공종, 내용, 메모, 사진
- **장비 점검**: 공기질(TVOC/HCHO/CO2), 라돈, 수평계, 열화상(사진 포함)
- **회사 정보·푸터**: 인싸이트아이 등 (PowerPoint 템플릿 문구 반영)

## PowerPoint(pptx) 관련

- **UI**: 점검원 화면에서는 PPTX 생성/다운로드 버튼이 없으며, **PDF만** 사용합니다.
- **API**: `POST /api/reports/generate-pptx` 는 과거 실험용으로 남아 있을 수 있으나, 생성된 pptx 파일은 포맷 오류로 열리지 않는 경우가 있어 **사용하지 않습니다.**
- **샘플 파일**: `test-samples/` 아래 `.pptx` 파일들은 위 API로 생성된 것이며, 열리지 않을 수 있습니다. 실제 사용·배포용은 **PDF만** 사용하세요.

## 테스트·샘플

- **PDF 샘플**: `backend/reports/` 에 `report-*.pdf` 형태로 저장됩니다. 이 파일들은 일반 PDF 뷰어/브라우저에서 열 수 있습니다.
- **테스트 스크립트**: `backend/scripts/test-report-api.js`, `test-pdf-with-measurements.js` 등은 PDF 생성·미리보기·다운로드를 테스트합니다.

## 요약

- **보고서 = PDF 전용**으로 동작합니다.
- 미리보기·다운로드·SMS 발송은 모두 **PDF** 기준입니다.
- PPTX는 사용하지 않으며, 범용적으로 열리려면 PDF를 사용하면 됩니다.
