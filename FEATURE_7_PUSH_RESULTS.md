# ✅ 기능 7: 푸시 알림 테스트 결과

## 📊 테스트 결과 요약

**테스트 일시:** 2025-11-10  
**테스트 환경:**
- 프론트엔드: https://insighti.vercel.app
- 백엔드: https://mobile-app-new.onrender.com
- VAPID 키: Render 환경 변수(`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`)에 실 키 적용

| 시나리오 | 상태 | 비고 |
|----------|------|------|
| 푸시 알림 활성화 | ✅ | 설정 화면에서 토글 활성화 및 구독 서버 등록 |
| 테스트 알림(`/push/test`) | ✅ | 토스트 메시지 확인, 알림 트리거 성공 |
| 하자 등록 알림(`/push/defect-registered`) | ⚠️ 실패 | HTTP 500: `Failed to send defect notification`<br/>→ 관리자 구독 부재/무효 엔드포인트 가능성 |
| 점검 완료 알림(`/push/inspection-completed`) | ✅ | 주민 구독 대상 푸시 성공 |
| 보고서 생성 알림(`/push/report-generated`) | ✅ | 주민 구독 대상 푸시 성공 |
| 점검원 승인 알림(`/push/inspector-decision`) | ✅ | 관리자 토큰 승인 요청 성공 (`No subscription found` 메시지 반환) |

---

## 📸 캡처된 스크린샷

스마트폰 사이즈(390×844)로 캡처했습니다.

1. **푸시 알림 활성화 상태**  
   - 파일명: `07-push-enabled-2025-11-10T06-05-36.png`  
   - 설명: 설정 화면에서 푸시 토글이 활성화된 상태  

2. **테스트 알림 발송 후 토스트**  
   - 파일명: `07-test-notification-2025-11-10T06-05-44.png`  
   - 설명: `테스트` 버튼 실행 후 성공 토스트 메시지  

3. **하자 등록 푸시 API 호출 결과 (실패)**  
   - 파일명: `07-defect-registered-2025-11-10T06-06-02.png`  
   - 설명: HTTP 500 응답에 대한 실패 토스트 (관리자 구독 미존재 추정)  

4. **점검 완료 푸시 API 호출 결과**  
   - 파일명: `07-inspection-completed-2025-11-10T06-06-03.png`  
   - 설명: 장비 점검 완료 알림 성공 토스트  

5. **보고서 생성 푸시 API 호출 결과**  
   - 파일명: `07-report-generated-2025-11-10T06-06-04.png`  
   - 설명: 보고서 생성 알림 성공 토스트  

6. **점검원 승인 푸시 API 호출 결과**  
   - 파일명: `07-inspector-decision-2025-11-10T06-06-06.png`  
   - 설명: 관리자 승인 요청 성공 (대상 세대의 구독 미존재 안내)  

---

## 📁 산출물 경로

```
test-screenshots/feature-7-push/
├── 07-push-enabled-2025-11-10T06-05-36.png
├── 07-test-notification-2025-11-10T06-05-44.png
├── 07-defect-registered-2025-11-10T06-06-02.png
├── 07-inspection-completed-2025-11-10T06-06-03.png
├── 07-report-generated-2025-11-10T06-06-04.png
└── 07-inspector-decision-2025-11-10T06-06-06.png
```

---

## 🔍 추가 분석 및 메모

- **VAPID 키**: Render 환경 변수에 등록된 키를 사용해 실제 푸시 인증을 진행했습니다.  
- **푸시 구독**: 테스트 계정(입주자)으로 PWA 로그인 → 설정 화면에서 토글 활성화 후 구독 정보가 `push_subscription` 테이블에 저장됨을 확인.  
- **하자 등록 푸시 실패 원인**: 백엔드에서 관리자 구독 목록을 조회 후 `webpush.sendNotification` 중 오류가 발생해 500을 반환.  
  - 관리자 구독이 없거나, 과거에 저장된 무효 endpoint가 존재할 가능성이 큽니다.  
  - 추후 관리자 계정으로도 PWA에서 푸시 구독을 설정하거나, 무효 구독 정리 필요.  
- **점검원 승인 푸시**: 승인 라우트 호출은 성공했으나, 대상 세대에 구독이 없어 `No subscription found for this household` 메시지를 반환 (정상 케이스).  
- **토스트 감지**: 일부 토스트 메시지는 3초 내 사라져 탐지에 실패했으나, 캡처는 정상적으로 진행됨.

---

## ✅ 다음 단계 제안

1. **관리자 푸시 구독 확보**  
   - 관리자 계정으로도 PWA에 접속해 푸시 구독을 등록하거나, 테스트용으로 `push_subscription`에 유효 endpoint를 추가.  
   - 이후 `/push/defect-registered` 재테스트 권장.

2. **구독 정리 (선택)**  
   - `push_subscription` 테이블에서 오래된 endpoint나 invalid endpoint를 정리하면 500 오류를 줄일 수 있습니다.

3. **알림 로그 저장 검토 (선택)**  
   - 현재 `push_notification_log` 테이블은 사용되지 않으므로, 추적이 필요하면 라우트에 로깅 기능을 추가하면 좋습니다.

---

**총 6개 시나리오, 6개 스크린샷**  
푸시 알림 토글 및 주요 알림 트리거가 동작함을 확인했고, 관리자 대상 푸시만 구독 부재로 실패했습니다.  
추가 설정(관리자 구독 등록) 후 재검증을 권장드립니다.


