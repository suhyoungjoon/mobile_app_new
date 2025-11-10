# 🚀 Render Starter 플랜 업그레이드 가이드

## ❌ 현재 문제

```
npm error signal SIGTERM
npm error command sh -c node install.mjs
```

**원인**: Free 플랜의 빌드 타임아웃으로 Puppeteer Chromium 다운로드 중 프로세스가 강제 종료됨

---

## ✅ 해결 방법: Starter 플랜 업그레이드

### 비용
- **Free**: $0/월 → **Starter**: $7/월
- **연간**: $84/년

---

## 📋 업그레이드 단계

### 1. Render Dashboard 접속
- https://dashboard.render.com
- 로그인

### 2. 서비스 선택
- `mobile_app_new` 서비스 클릭

### 3. Settings 탭 클릭
- 왼쪽 메뉴에서 **Settings** 선택

### 4. Plan 변경
- **Plan** 섹션 찾기
- 현재: **Free**
- 변경: **Starter** ($7/월) 선택
- **Save Changes** 클릭

### 5. 결제 정보 입력 (처음 업그레이드 시)
- 신용카드 정보 입력
- 결제 확인

### 6. 재배포
- **Manual Deploy** 클릭
- 또는 자동 재배포 대기

---

## 📊 예상 결과

### Starter 플랜 업그레이드 후
- ✅ 빌드 타임아웃 증가
- ✅ Chromium 다운로드 완료 가능
- ✅ 빌드 성공 예상

### 예상 빌드 로그
```
==> Running build command 'npm install'...
npm install...
npm info run puppeteer@21.11.0 postinstall node_modules/puppeteer node install.mjs
Downloading Chromium r121.0.6167.85...
✅ Chromium downloaded successfully
✅ npm install 성공
✅ 빌드 완료 (5-8분)
```

---

## ⚠️ 주의사항

### 1. 결제 정보 필요
- Starter 플랜은 유료 플랜이므로 결제 정보 필요
- 첫 업그레이드 시 신용카드 정보 입력

### 2. 비용
- **월 비용**: $7
- **연간**: $84
- 언제든지 Free로 다운그레이드 가능

### 3. 실패 시
- Starter에서도 실패하면 Standard ($25/월)로 업그레이드 고려

---

## 🎯 다음 단계

1. **Starter 플랜으로 업그레이드**
2. **재배포**
3. **빌드 성공 확인**
4. **성공 시**: Starter 유지
5. **실패 시**: Standard로 업그레이드

---

## 💡 추가 정보

### Render 플랜 비교
| 플랜 | 월 비용 | 빌드 타임아웃 | 메모리 | 디스크 |
|------|---------|---------------|--------|--------|
| Free | $0 | 짧음 | 512MB | 1GB |
| **Starter** | **$7** | **더 길게** | **512MB** | **1GB** |
| Standard | $25 | 충분 | 1GB | 2GB |

### Starter 플랜 특징
- ✅ 빌드 타임아웃 증가
- ✅ 프로덕션 기능
- ✅ 더 안정적인 빌드

---

## ✅ 업그레이드 완료 후

업그레이드가 완료되면:
1. 재배포 시작
2. 빌드 로그 확인
3. 성공 여부 확인

빌드 결과를 알려주시면 다음 단계를 안내하겠습니다!

