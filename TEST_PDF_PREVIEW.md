# PDF 미리보기 기능 테스트 가이드

## 구현된 기능

### 1. 하자 유무에 따른 버튼 표시 제어
- ✅ **하자가 있는 경우**: PDF 미리보기 및 다운로드 버튼 표시
- ✅ **하자가 없는 경우**: 버튼 숨김 및 안내 메시지 표시

### 2. PDF 미리보기 기능
- ✅ 새 창에서 PDF 미리보기
- ✅ Blob URL을 통한 안전한 미리보기

### 3. PDF 다운로드 기능
- ✅ 기존 다운로드 기능 유지

---

## 수동 테스트 방법

### 테스트 시나리오 1: 하자가 없는 경우

1. **로그인**
   - 앱에 로그인합니다.

2. **보고서 화면 이동**
   - 하단 탭바에서 "보고서" 탭을 클릭합니다.

3. **버튼 표시 확인**
   - ✅ "등록된 하자가 없습니다." 메시지가 표시되어야 합니다.
   - ✅ PDF 미리보기 및 다운로드 버튼이 **숨겨져 있어야** 합니다.

4. **안내 메시지 확인**
   - ✅ "하자를 등록하면 PDF 보고서를 생성할 수 있습니다." 메시지가 표시되어야 합니다.

---

### 테스트 시나리오 2: 하자가 있는 경우

1. **하자 등록**
   - 하자 등록 화면에서 하자를 등록합니다.
   - 최소 1개 이상의 하자가 등록되어 있어야 합니다.

2. **보고서 화면 이동**
   - 하단 탭바에서 "보고서" 탭을 클릭합니다.

3. **버튼 표시 확인**
   - ✅ 등록된 하자 목록이 표시되어야 합니다.
   - ✅ PDF 미리보기 및 다운로드 버튼이 **표시되어야** 합니다.

4. **PDF 미리보기 테스트**
   - "PDF 미리보기" 버튼을 클릭합니다.
   - ✅ PDF 생성 중 토스트 메시지가 표시되어야 합니다.
   - ✅ 새 창에서 PDF가 열려야 합니다.
   - ✅ PDF 내용이 정상적으로 표시되어야 합니다 (한글 깨짐 없이).

5. **PDF 다운로드 테스트**
   - "PDF 다운로드" 버튼을 클릭합니다.
   - ✅ PDF 생성 중 토스트 메시지가 표시되어야 합니다.
   - ✅ PDF 다운로드가 시작되어야 합니다.
   - ✅ 다운로드된 PDF 파일이 정상적으로 열려야 합니다.

---

## 코드 검증

### 구현된 로직

```javascript
// webapp/js/app.js - onPreviewReport() 함수

if (reportData.defects && reportData.defects.length > 0) {
  // 하자가 있는 경우: 버튼 표시
  if (buttonGroup) {
    buttonGroup.style.display = 'flex';
  }
  // 하자 목록 표시...
} else {
  // 하자가 없는 경우: 버튼 숨김
  if (buttonGroup) {
    buttonGroup.style.display = 'none';
  }
  // 안내 메시지 표시...
}
```

### HTML 구조

```html
<!-- webapp/index.html -->
<div id="report" class="screen hidden">
  <div id="report-preview"></div>
  <div class="button-group" style="margin-top: 10px; display: flex; gap: 10px;">
    <button class="button" onclick="previewReportAsPdf()">PDF 미리보기</button>
    <button class="button" onclick="downloadReportAsPdf()">PDF 다운로드</button>
  </div>
</div>
```

---

## 예상 결과

### 하자가 없는 경우
- 버튼 그룹: `display: none`
- 메시지: "등록된 하자가 없습니다."
- 안내: "하자를 등록하면 PDF 보고서를 생성할 수 있습니다."

### 하자가 있는 경우
- 버튼 그룹: `display: flex`
- 하자 목록: 카드 형태로 표시
- PDF 버튼: 두 개 모두 표시 및 작동

---

## 확인 사항

- [ ] 하자가 없을 때 버튼이 숨겨지는가?
- [ ] 하자가 있을 때 버튼이 표시되는가?
- [ ] PDF 미리보기가 정상적으로 작동하는가?
- [ ] PDF 다운로드가 정상적으로 작동하는가?
- [ ] PDF 내용에 한글이 정상적으로 표시되는가?

---

## 문제 해결

### 버튼이 항상 표시되는 경우
- 브라우저 개발자 도구에서 `#report .button-group`의 `display` 속성을 확인하세요.
- `onPreviewReport()` 함수가 제대로 호출되는지 확인하세요.

### PDF 미리보기가 작동하지 않는 경우
- 브라우저 팝업 차단 설정을 확인하세요.
- 콘솔에서 에러 메시지를 확인하세요.

### PDF 한글이 깨지는 경우
- 서버 로그에서 데이터 전달 여부를 확인하세요.
- `backend/routes/reports.js`의 로그를 확인하세요.

