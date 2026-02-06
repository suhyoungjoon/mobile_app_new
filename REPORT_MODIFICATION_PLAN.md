# 점검결과 보고서(PDF/HTML) 수정 계획

점검결과 PDF 양식(인사이트아이_점검결과양식)에 맞추어 **앱(DB·API·점검원 화면) 반영은 완료**되었고, 아래는 **보고서(PDF/HTML/PPTX) 출력만** 수정할 때 적용할 계획입니다.  
**현재 보고서 코드는 수정하지 않았으며**, 추후 수정 시 이 계획을 따르면 됩니다.

---

## 1. 반영할 양식 항목 요약

| 항목 | 앱 반영 | 보고서 반영 계획 |
|------|--------|------------------|
| **공기질 – Flush-out / Bake-out** | ✅ `air_measure.process_type` | PDF/HTML에 공정 유형 표기 |
| **레벨기 – 4 point ±10mm** | ✅ `level_measure.point1~4_left/right_mm` | 4개 측정점 좌/우 mm 출력 |
| **레벨기 – 기준 150mm** | ✅ `level_measure.reference_mm` | 기준(mm) 표기 |
| **일련번호** | ✅ `inspection_item.serial_no` | 항목별 일련번호 출력 |
| **확인란** | (선택) | 양식에 따른 체크/서명란 배치 |

---

## 2. 수정 대상 파일 및 순서

### 2.1 데이터 계층 (먼저 수정)

**파일:** `backend/routes/reports.js`

- **`getReportDataForHousehold` 내부의 `inspectionItemQuery`**
  - SELECT에 추가:
    - `am.process_type`
    - `lm.point1_left_mm`, `lm.point1_right_mm`, … `lm.point4_left_mm`, `lm.point4_right_mm`, `lm.reference_mm`
    - `ii.serial_no`
  - `air` 배열에 넣을 객체에 `process_type` 추가.
  - `level` 배열에 넣을 객체에 `point1_left_mm`, `point1_right_mm`, … `point4_left_mm`, `point4_right_mm`, `reference_mm` 추가.
  - 공통 base 또는 항목 객체에 `serial_no` 추가(필요 시).

- **`air_measurements` / `level_measurements` 등 집계·전달 로직**
  - 위와 동일하게 `process_type`, 4 point, `reference_mm`, `serial_no`가 리포트 페이로드에 포함되도록 수정.

이후 PDF/HTML 생성기는 이미 전달되는 payload만 사용하면 되므로, **데이터 수정을 먼저 완료한 뒤** 아래 템플릿/생성기를 수정하는 것이 좋습니다.

### 2.2 PDF 생성기 (pdfmake)

**파일:** `backend/utils/pdfmakeGenerator.js`

- **공기질(섹션 7·7-1)**
  - 요약 테이블·상세 목록에서 공기질 행/항목 출력 시 `process_type` 사용.
  - 값이 `flush_out` → "Flush-out", `bake_out` → "Bake-out"으로 표기 (없으면 비표기 또는 "-").

- **레벨기(섹션 8/8-1)**
  - 요약: 현재 "좌 xx mm / 우 xx mm" 한 쌍만 나오는 부분을, 4 point가 있으면 "1번 좌/우, 2번 좌/우, 3번 좌/우, 4번 좌/우" 형태로 출력.
  - `reference_mm`이 있으면 "기준 150mm" 등으로 명시.
  - 상세: `point1_left_mm` ~ `point4_right_mm`, `reference_mm` 모두 출력하도록 항목 추가.

- **일련번호**
  - 항목별 블록(공기질/라돈/레벨기/열화상)에 `serial_no`가 있으면 표시.

- **하자별 점검 요약 문자열**
  - 공기질 라인에 Flush-out/Bake-out 표기 추가.
  - 레벨기 라인을 "4 point ±10mm, 기준 150mm" 형식으로 변경 (기존 left_mm/right_mm는 호환용으로 유지 가능).

### 2.3 HTML 보고서 템플릿

**파일:** `backend/templates/comprehensive-report.hbs`

- **공기질 테이블/상세**
  - 위치·공종·TVOC/HCHO/CO2 옆에 "공정 유형(Flush-out/Bake-out)" 컬럼 또는 문구 추가.
  - 데이터는 reports.js에서 이미 `process_type` 포함해 전달한다고 가정.

- **레벨기 테이블/상세**
  - "좌/우" 한 쌍 대신 4개 측정점(1~4번 좌/우) 및 "기준(mm)" 컬럼 추가.
  - `reference_mm` 기본 150 표기.

- **일련번호**
  - 각 점검 유형 블록에서 `serial_no` 출력 (있는 경우만).

### 2.4 PPTX 보고서 (선택)

**파일:** `backend/utils/pptxGenerator.js`, `backend/utils/pptxTableGenerator.js`

- 공기질 슬라이드/테이블: `process_type` 표기.
- 레벨기: 4 point + 기준(mm) 표기.
- 동일하게 payload에 `process_type`, 4 point, `reference_mm`, `serial_no`가 들어오는지 확인 후, 없으면 reports.js 쪽 데이터 수집부터 맞추기.

---

## 3. 호환성

- **기존 데이터:** `process_type`·4 point·`reference_mm`·`serial_no`가 null/비어 있는 경우, 현재처럼 "좌/우"만 있으면 기존처럼 한 쌍만 출력하거나, 4 point 컬럼은 "-"로 채우면 됨.
- **레벨기:** DB에 `left_mm`/`right_mm`만 있는 레거시 데이터는 이미 백엔드에서 point1으로 매핑해 두었을 수 있으므로, 보고서에서도 `point1_*`가 없을 때 `left_mm`/`right_mm`로 대체 출력하는 로직을 두면 됨.

---

## 4. 확인란

- 양식의 "확인" 체크란·서명란은 레이아웃 요소이므로, 필요 시:
  - Handlebars 템플릿에 고정 영역 추가,
  - pdfmake 레이아웃에 해당 블록 추가
  하여 "점검원 확인", "일련번호" 등과 함께 배치하면 됩니다. (데이터베이스 필드 추가는 선택.)

---

## 5. 적용 순서 요약

1. **reports.js** – SELECT 및 `air`/`level`/집계 payload에 `process_type`, 4 point, `reference_mm`, `serial_no` 반영.
2. **pdfmakeGenerator.js** – 공기질 Flush-out/Bake-out, 레벨기 4 point·기준 mm, 일련번호 출력.
3. **comprehensive-report.hbs** – 동일 항목 테이블/상세 반영.
4. (선택) **pptxGenerator.js**, **pptxTableGenerator.js** – 동일 규칙 적용.
5. (선택) 확인란/서명란 레이아웃 추가.

이 순서대로 적용하면 점검결과 PDF 양식과 보고서 출력을 일치시킬 수 있습니다.
