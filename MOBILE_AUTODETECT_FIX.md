# 📱 모바일 자동 감지 제어 가이드

## 🔍 문제 상황

### iOS Safari
```
동호수: 101-1001
       ↓
<a href="tel:101-1001">101-1001</a>  (자동 변환)
       ↓
터치 시: "101-1001에 전화하기" 팝업
```

### Android Chrome
```
케이스 ID: #12345
          ↓
자동 링크 감지 (파란색 밑줄)
          ↓
터치 시: 통화 또는 SMS 앱 실행
```

---

## ✅ 해결 방법 (3단계)

### 1. HTML Meta 태그 (전역 제어)

```html
<head>
  <!-- iOS Safari, Chrome 자동 감지 비활성화 -->
  <meta name="format-detection" content="telephone=no, date=no, address=no, email=no" />
  
  <!-- iOS Mail 앱 자동 포맷팅 비활성화 -->
  <meta name="x-apple-disable-message-reformatting" />
</head>
```

**옵션 설명:**
- `telephone=no` - 전화번호 자동 감지 OFF
- `date=no` - 날짜 자동 감지 OFF
- `address=no` - 주소 자동 감지 OFF
- `email=no` - 이메일 자동 감지 OFF

---

### 2. CSS 전역 제어

```css
html, body {
  /* 길게 누르기(Long press) 메뉴 비활성화 */
  -webkit-touch-callout: none;
  
  /* 텍스트 크기 자동 조정 방지 */
  -webkit-text-size-adjust: 100%;
}

/* 자동 생성된 링크 무력화 */
a[href^="tel:"],
a[href^="sms:"],
a[href^="mailto:"] {
  color: inherit;
  text-decoration: none;
  pointer-events: none;  /* 클릭 불가 */
}

/* 특정 클래스에 자동 링크 방지 */
.no-auto-link,
.badge,
.badge-chip,
.card,
.defect-id,
.case-id {
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  user-select: none;
}
```

---

### 3. HTML 요소별 제어

#### 방법 A: x-apple-data-detectors 속성 (iOS 전용)

```html
<!-- 자동 감지 비활성화 -->
<span x-apple-data-detectors="false">101-1001</span>

<!-- 전화번호는 감지하되 다른 건 비활성화 -->
<span x-apple-data-detectors="telephone">010-1234-5678</span>
```

#### 방법 B: CSS 클래스 사용

```html
<!-- 추천: 가독성 좋음 -->
<div class="no-auto-link">101-1001</div>
<span class="badge no-auto-link">케이스 #12345</span>
```

#### 방법 C: 하이픈 제거 또는 공백 사용

```javascript
// 동호수 표시 시
const displayText = `${dong} ${ho}`;  // "101 1001" (하이픈 대신 공백)

// 또는
const displayText = `${dong}동 ${ho}호`;  // "101동 1001호"
```

---

## 🎯 적용된 수정 사항

### index.html
```html
<head>
  <!-- 기존 코드 -->
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
  <meta name="theme-color" content="#1e88e5" />
  
  <!-- 🆕 모바일 자동 감지 비활성화 -->
  <meta name="format-detection" content="telephone=no, date=no, address=no, email=no" />
  <meta name="x-apple-disable-message-reformatting" />
  
  <link rel="manifest" href="/manifest.json" />
  <!-- ... -->
</head>
```

### style.css
```css
/* 🆕 추가됨 */
html, body {
  /* ... 기존 스타일 ... */
  
  /* 모바일 자동 감지 비활성화 */
  -webkit-touch-callout: none;
  -webkit-text-size-adjust: 100%;
}

/* 자동 링크 방지 */
a[href^="tel:"],
a[href^="sms:"],
a[href^="mailto:"] {
  color: inherit;
  text-decoration: none;
  pointer-events: none;
}

/* 특정 클래스 자동 링크 방지 */
.no-auto-link,
.badge,
.badge-chip,
.card,
.defect-id,
.case-id {
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  user-select: none;
}
```

### admin.html
```html
<head>
  <!-- 기존 코드 -->
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  
  <!-- 🆕 모바일 자동 감지 비활성화 -->
  <meta name="format-detection" content="telephone=no, date=no, address=no, email=no" />
  <meta name="x-apple-disable-message-reformatting" />
  
  <style>
    body {
      /* ... */
      /* 🆕 모바일 자동 감지 비활성화 */
      -webkit-touch-callout: none;
      -webkit-text-size-adjust: 100%;
    }
    
    /* 🆕 자동 링크 방지 */
    .no-auto-link,
    td, th, .stat-number, .user-info {
      -webkit-touch-callout: none;
      user-select: none;
    }
  </style>
</head>
```

---

## 🧪 테스트 방법

### iOS Safari
1. iPhone에서 앱 접속
2. 동호수(101-1001) 터치
3. ✅ 통화 팝업 안 뜸
4. 케이스 ID(#12345) 터치
5. ✅ 자동 링크 안 뜸

### Android Chrome
1. Android 폰에서 앱 접속
2. 숫자 포함 텍스트 터치
3. ✅ 파란색 밑줄 안 뜸
4. ✅ SMS/통화 앱 실행 안 됨

---

## 🎯 추가 고려사항

### 실제 전화번호는 링크로 만들기

전화번호 필드는 의도적으로 링크를 만들 수 있습니다:

```html
<!-- 사용자 전화번호 (클릭 시 통화 가능하게) -->
<a href="tel:010-1234-5678" class="phone-link">
  010-1234-5678
</a>
```

```css
.phone-link {
  color: var(--primary);
  text-decoration: underline;
  cursor: pointer;
}
```

**현재 앱에서는:**
- ✅ 동호수(101-1001) → 자동 링크 OFF
- ✅ 케이스 ID(#12345) → 자동 링크 OFF
- ✅ 사용자 전화번호(010-1234-5678) → 원하면 링크로 만들 수 있음

---

## 📱 브라우저별 동작

### iOS Safari
| 메타 태그 | 효과 |
|-----------|------|
| `telephone=no` | ✅ 전화번호 자동 링크 OFF |
| `date=no` | ✅ 날짜 자동 링크 OFF |
| `address=no` | ✅ 주소 자동 링크 OFF |
| `-webkit-touch-callout: none` | ✅ 길게 누르기 메뉴 OFF |

### Android Chrome
| 메타 태그 | 효과 |
|-----------|------|
| `telephone=no` | ✅ 전화번호 자동 감지 OFF |
| `user-select: none` | ✅ 텍스트 선택 방지 |

### Samsung Internet, Firefox 등
- 대부분 Chrome 엔진 기반
- `format-detection` 메타 태그 지원

---

## ⚠️ 주의사항

### 1. user-select: none 사용 시

**장점:**
- 자동 링크 확실히 방지
- 불필요한 선택 방지

**단점:**
- 사용자가 텍스트 복사 불가
- 접근성 약간 저하

**해결책:**
```css
/* 중요 정보는 복사 가능하게 */
.user-phone,
.defect-content {
  user-select: text !important;
}
```

### 2. 완전 제거 vs 선택적 제어

**완전 제거 (현재 적용):**
```html
<meta name="format-detection" content="telephone=no" />
```

**선택적 제어:**
```html
<!-- 일부만 활성화 -->
<meta name="format-detection" content="telephone=yes, date=no, address=no" />

<!-- HTML에서 개별 제어 -->
<span x-apple-data-detectors="true">010-1234-5678</span>  <!-- 링크 활성화 -->
<span x-apple-data-detectors="false">101-1001</span>      <!-- 링크 비활성화 -->
```

---

## 🔧 문제 발생 시 디버깅

### iOS Safari 개발자 도구
1. Mac + iPhone 연결
2. Safari > 개발 > [iPhone 이름] > [웹페이지]
3. 요소 검사로 자동 링크 확인

### Android Chrome 개발자 도구
1. PC + Android USB 연결
2. chrome://inspect
3. 디바이스에서 앱 접속 확인

### 확인 방법
```javascript
// 콘솔에서 확인
console.log(document.querySelector('meta[name="format-detection"]').content);
// 결과: "telephone=no, date=no, address=no, email=no"
```

---

## 📋 체크리스트

- [x] index.html meta 태그 추가
- [x] admin.html meta 태그 추가
- [x] style.css 전역 스타일 추가
- [x] admin.html 인라인 스타일 추가
- [ ] 실제 디바이스 테스트 (iOS)
- [ ] 실제 디바이스 테스트 (Android)

---

## 🎉 결과

### Before
```
터치: 101-1001
  ↓
iOS: "101-1001에 전화하기" 팝업 ❌
Android: 통화 앱 실행 시도 ❌
```

### After
```
터치: 101-1001
  ↓
iOS: 아무 일도 안 일어남 ✅
Android: 일반 텍스트로 인식 ✅
```

---

## 💡 추가 팁

### 실제 전화번호는 의도적으로 링크로

```html
<!-- 관리자 페이지: 사용자 전화번호 -->
<td>
  <a href="tel:010-1234-5678" style="color: #1a73e8; text-decoration: underline;">
    010-1234-5678
  </a>
</td>
```

### 동호수 표시 형식 변경 (선택)

```javascript
// 하이픈 대신 공백 또는 한글
const display1 = `${dong} ${ho}`;        // "101 1001"
const display2 = `${dong}동 ${ho}호`;    // "101동 1001호"
const display3 = `${dong}/${ho}`;        // "101/1001"
```

이렇게 하면 전화번호로 오인할 가능성이 더 낮아집니다.

