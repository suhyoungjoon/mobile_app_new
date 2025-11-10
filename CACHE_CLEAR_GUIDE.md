# 브라우저 캐시 클리어 가이드

## 문제 해결 방법

AI 설정 화면이 표시되지 않거나 업데이트가 반영되지 않는 경우, 브라우저 캐시를 클리어해야 할 수 있습니다.

## 방법 1: 하드 리프레시 (권장)

### Windows / Linux
- **Chrome / Edge**: `Ctrl + Shift + R` 또는 `Ctrl + F5`
- **Firefox**: `Ctrl + Shift + R` 또는 `Ctrl + F5`
- **Safari**: `Ctrl + Shift + R`

### Mac
- **Chrome / Edge**: `Cmd + Shift + R`
- **Firefox**: `Cmd + Shift + R`
- **Safari**: `Cmd + Option + R`

## 방법 2: 개발자 도구를 통한 캐시 클리어

1. **F12** 키를 눌러 개발자 도구 열기
2. **Network** 탭 클릭
3. **"Disable cache"** 체크박스 활성화
4. 페이지 새로고침 (`F5`)

## 방법 3: 브라우저 설정에서 캐시 삭제

### Chrome / Edge
1. 설정 (⚙️) → 개인정보 및 보안 → 인터넷 사용 기록 삭제
2. "캐시된 이미지 및 파일" 선택
3. "데이터 삭제" 클릭

### Firefox
1. 설정 → 개인정보 보호 및 보안
2. "쿠키 및 사이트 데이터" → "데이터 지우기"
3. "캐시된 웹 콘텐츠" 선택 후 삭제

### Safari
1. Safari → 환경설정 → 고급
2. "메뉴 막대에서 개발자용 메뉴 보기" 활성화
3. 개발자 → 캐시 비우기

## 방법 4: Service Worker 캐시 클리어 (PWA인 경우)

1. **F12** 키로 개발자 도구 열기
2. **Application** 탭 (Chrome) 또는 **Storage** 탭 (Firefox) 클릭
3. 왼쪽 메뉴에서 **Service Workers** 선택
4. **Unregister** 클릭하여 Service Worker 등록 해제
5. **Cache Storage**에서 모든 캐시 삭제
6. 페이지 새로고침

## 방법 5: 시크릿/프라이빗 모드에서 테스트

캐시 없이 테스트하려면:
- **Chrome**: `Ctrl + Shift + N` (Windows) / `Cmd + Shift + N` (Mac)
- **Firefox**: `Ctrl + Shift + P` (Windows) / `Cmd + Shift + P` (Mac)
- **Safari**: `Cmd + Shift + N`

## 디버깅 팁

브라우저 콘솔에서 다음 명령어로 확인:

```javascript
// 현재 로드된 스크립트 확인
console.log('현재 스크립트:', document.scripts);

// AI 설정 화면 요소 확인
console.log('AI 설정 화면:', document.getElementById('screen-ai-settings'));

// loadAISettings 함수 확인
console.log('loadAISettings 함수:', typeof loadAISettings);

// 수동으로 함수 호출
loadAISettings();
```

## 문제가 계속되면

1. 브라우저 콘솔(F12)에서 에러 메시지 확인
2. Network 탭에서 JavaScript 파일이 최신 버전으로 로드되는지 확인
3. Vercel 배포가 완료되었는지 확인
4. 다른 브라우저에서 테스트

