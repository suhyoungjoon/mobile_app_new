# 🌐 Custom Domain 설정 가이드

전문적인 도메인으로 InsightI 앱을 서비스하는 완벽한 가이드입니다!

---

## 🎯 **목표**

**현재:**
- 프론트엔드: `https://insightiprecheckv2enhanced-xxx.vercel.app`
- 백엔드: `https://mobile-app-new.onrender.com`

**변경 후:**
- 프론트엔드: `https://app.insighti.com` 또는 `https://insighti.com`
- 백엔드: `https://api.insighti.com`

---

## 📋 **전체 프로세스**

1. ✅ 도메인 구매
2. ✅ Vercel 프론트엔드 도메인 설정
3. ✅ Render 백엔드 도메인 설정
4. ✅ DNS 레코드 설정
5. ✅ 코드 업데이트 및 배포
6. ✅ SSL 인증서 확인

**예상 소요 시간**: 30분 ~ 2시간 (DNS 전파 시간 포함)

---

## 💰 **1단계: 도메인 구매**

### **추천 도메인 등록 업체**

#### **한국 업체 (한국어 지원)**

| 업체 | .com 가격 (연간) | .co.kr 가격 (연간) | 특징 |
|------|-----------------|-------------------|------|
| **가비아** | ~15,000원 | ~15,000원 | 🏆 국내 1위, 카드/계좌이체 |
| **호스팅케이알** | ~10,000원 | ~12,000원 | 💰 저렴, 쉬운 관리 |
| **후이즈** | ~13,000원 | ~14,000원 | 🎯 간편한 DNS 관리 |

#### **글로벌 업체 (영어)**

| 업체 | .com 가격 (연간) | 특징 |
|------|-----------------|------|
| **Namecheap** | ~$10 | 💰 저렴, 쉬운 관리 |
| **Cloudflare** | ~$10 | 🚀 무료 CDN, 빠름 |
| **Google Domains** | ~$12 | 🔒 안정적, Google 통합 |

### **도메인 이름 추천**

```
insighti.com           ⭐ 추천: 짧고 기억하기 쉬움
insighti.co.kr         ⭐ 추천: 한국 서비스
insighti-app.com       앱 전용
my-insighti.com        개인화
```

### **도메인 구매 팁**

✅ **짧고 기억하기 쉬운 이름**
✅ **.com 또는 .co.kr 추천** (신뢰도)
✅ **첫 해 할인 확인** (2년차부터 가격 상승)
✅ **WHOIS 프라이버시 보호 옵션** (개인정보 보호)

---

## 🎨 **2단계: Vercel 프론트엔드 도메인**

### **2-1. Vercel 대시보드 설정**

1. **Vercel 대시보드** 접속
   ```
   https://vercel.com/dashboard
   ```

2. **프로젝트 선택**
   - `insighti_precheck_v2_enhanced` 클릭

3. **Settings** → **Domains** 탭

4. **Add Domain** 버튼 클릭

5. **도메인 입력** (3가지 옵션 중 선택):

   #### **Option A: 메인 도메인 사용**
   ```
   insighti.com
   ```
   ✅ 가장 짧고 전문적
   
   #### **Option B: www 서브도메인**
   ```
   www.insighti.com
   ```
   ✅ 전통적인 방식
   
   #### **Option C: app 서브도메인 (추천)**
   ```
   app.insighti.com
   ```
   ✅ 명확한 구분, 나중에 홈페이지 추가 가능

6. **Add** 버튼 클릭

### **2-2. DNS 레코드 설정**

Vercel이 제공하는 DNS 레코드를 확인하고 도메인 업체에 추가합니다.

#### **가비아 예시**

1. **가비아 로그인** → **My가비아** → **도메인** 선택
2. **관리** → **DNS 정보** 클릭
3. **레코드 추가** 버튼

#### **Option A: CNAME 레코드 (서브도메인)**

`app.insighti.com` 또는 `www.insighti.com` 사용 시:

```
타입(Type): CNAME
호스트(Name): app (또는 www)
값(Value): cname.vercel-dns.com
TTL: 3600 (1시간)
```

#### **Option B: A 레코드 (메인 도메인)**

`insighti.com` 직접 사용 시:

```
타입(Type): A
호스트(Name): @ (또는 비워둠)
값(Value): 76.76.21.21
TTL: 3600 (1시간)
```

**추가로 AAAA 레코드도 설정 (IPv6)**:
```
타입(Type): AAAA
호스트(Name): @
값(Value): 2606:4700:d1::a29f:1804
TTL: 3600
```

### **2-3. 도메인 확인**

1. **DNS 전파 대기**
   - 빠르면 5분, 느리면 48시간
   - 평균 1-2시간

2. **DNS 전파 확인 도구**
   ```
   https://dnschecker.org
   ```
   도메인 입력 후 전 세계 DNS 서버 확인

3. **Vercel에서 확인**
   - Vercel 대시보드 → Domains
   - ✅ 체크 표시 확인
   - SSL 인증서 자동 발급 (Let's Encrypt)

4. **브라우저에서 접속**
   ```
   https://app.insighti.com
   ```

---

## 🔧 **3단계: Render 백엔드 도메인**

### **3-1. Render 대시보드 설정**

1. **Render 대시보드** 접속
   ```
   https://dashboard.render.com
   ```

2. **mobile-app-new** 서비스 선택

3. **Settings** → **Custom Domains** 클릭

4. **Add Custom Domain** 버튼 클릭

5. **도메인 입력**:
   ```
   api.insighti.com
   ```

6. **Add** 버튼 클릭

7. **CNAME 값 확인**:
   ```
   mobile-app-new.onrender.com
   ```

### **3-2. DNS 레코드 설정**

도메인 업체에서 CNAME 레코드 추가:

```
타입(Type): CNAME
호스트(Name): api
값(Value): mobile-app-new.onrender.com
TTL: 3600 (1시간)
```

### **3-3. 도메인 확인**

1. **DNS 전파 대기** (1-2시간)

2. **Render에서 확인**
   - Settings → Custom Domains
   - ✅ Verified 상태 확인
   - SSL 인증서 자동 발급

3. **API Health Check**
   ```bash
   curl https://api.insighti.com/health
   ```
   
   예상 응답:
   ```json
   {
     "status": "OK",
     "timestamp": "2025-10-10T...",
     "version": "1.0.0"
   }
   ```

---

## ⚙️ **4단계: 코드 업데이트**

### **4-1. 프론트엔드 API URL 변경**

`webapp/js/api.js`:

```javascript
// 변경 전
this.baseURL = 'https://mobile-app-new.onrender.com/api';

// 변경 후
this.baseURL = 'https://api.insighti.com/api';
```

### **4-2. 백엔드 CORS 설정**

`backend/server.js`:

```javascript
const allowedOrigins = [
  // ... 기존 origins
  'https://insighti.com',
  'https://www.insighti.com',
  'https://app.insighti.com',
];
```

### **4-3. 배포**

```bash
# GitHub 커밋
git add .
git commit -m "🌐 커스텀 도메인 적용"
git push origin main

# Vercel 재배포 (자동 트리거)
# Render 재배포 (자동 트리거)
```

---

## 🔒 **5단계: SSL 인증서 확인**

### **Vercel (프론트엔드)**

- ✅ 자동 발급 (Let's Encrypt)
- ✅ 자동 갱신
- ✅ 확인: 브라우저 주소창 🔒 자물쇠 아이콘

### **Render (백엔드)**

- ✅ 자동 발급 (Let's Encrypt)
- ✅ 자동 갱신
- ✅ 확인: `curl` 명령어로 HTTPS 접속

---

## 🧪 **6단계: 전체 테스트**

### **체크리스트**

- [ ] 프론트엔드 도메인 접속 가능
- [ ] SSL 인증서 정상 (🔒)
- [ ] 로그인 기능 작동
- [ ] 하자 등록 기능 작동
- [ ] 이미지 업로드 정상
- [ ] AI 분석 기능 정상
- [ ] 백엔드 API 응답 정상

### **테스트 명령어**

```bash
# 프론트엔드 접속
open https://app.insighti.com

# 백엔드 Health Check
curl https://api.insighti.com/health

# API 테스트
curl https://api.insighti.com/api/defect-categories
```

---

## 📊 **DNS 레코드 전체 요약**

### **최종 DNS 레코드 (예시)**

| 타입 | 호스트 | 값 | 용도 |
|------|--------|-----|------|
| A | @ | 76.76.21.21 | 메인 도메인 (선택) |
| CNAME | www | cname.vercel-dns.com | www 리다이렉트 (선택) |
| CNAME | app | cname.vercel-dns.com | 프론트엔드 (추천) |
| CNAME | api | mobile-app-new.onrender.com | 백엔드 |

---

## 🎯 **권장 도메인 구조**

### **Option A: 서브도메인 분리 (추천)**

```
https://insighti.com          → 홈페이지 (나중에 추가)
https://app.insighti.com      → 웹앱 (프론트엔드)
https://api.insighti.com      → API (백엔드)
```

**장점:**
- ✅ 명확한 구분
- ✅ 홈페이지 추가 용이
- ✅ 확장성 좋음

### **Option B: 메인 도메인 사용**

```
https://insighti.com          → 웹앱 (프론트엔드)
https://api.insighti.com      → API (백엔드)
```

**장점:**
- ✅ 짧은 URL
- ✅ 전문적인 느낌

---

## 🆘 **문제 해결**

### **Q: DNS 전파가 48시간이 지나도 안 됩니다**
**A**: 
1. DNS 레코드가 정확한지 확인
2. TTL 값을 낮춰보기 (300초)
3. 도메인 업체 고객센터 문의

### **Q: SSL 인증서 오류가 발생합니다**
**A**:
1. DNS 전파 완료 후 24시간 대기
2. Vercel/Render에서 도메인 삭제 후 재등록
3. 브라우저 캐시 삭제

### **Q: CORS 오류가 발생합니다**
**A**:
1. 백엔드 `server.js`에 도메인 추가 확인
2. Render 재배포 확인
3. 브라우저 콘솔에서 정확한 오류 확인

### **Q: www와 non-www 모두 사용하고 싶어요**
**A**:
```
# Vercel에서 두 도메인 모두 추가
insighti.com
www.insighti.com

# 하나를 다른 하나로 리다이렉트 설정
```

---

## 💡 **비용 요약**

| 항목 | 비용 (연간) | 비고 |
|------|------------|------|
| 도메인 (.com) | ~15,000원 | 필수 |
| Vercel (프론트엔드) | 무료 | Hobby 플랜 |
| Render (백엔드) | 무료 | Free 플랜 |
| SSL 인증서 | 무료 | Let's Encrypt |
| **총 비용** | **~15,000원/년** | 도메인만 |

---

## 🎉 **완료!**

이제 전문적인 커스텀 도메인으로 InsightI를 서비스할 수 있습니다!

**최종 URL:**
```
프론트엔드: https://app.insighti.com
백엔드 API: https://api.insighti.com
```

**다음 단계:**
- [ ] 도메인 구매
- [ ] Vercel & Render 도메인 설정
- [ ] DNS 레코드 설정
- [ ] 코드 업데이트 및 배포
- [ ] SSL 및 기능 테스트

**즐거운 서비스 운영 되세요!** 🚀✨

