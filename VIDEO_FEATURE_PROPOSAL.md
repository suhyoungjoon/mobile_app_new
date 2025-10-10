# 동영상 기반 하자 확인 기능 구현 방안

## 📋 요구사항 분석
- 동영상으로 하자 내용 확인
- 확인 내용을 화면에 표시
- 유튜브 조코딩 영상 참고

## 🎯 1단계: 기본 동영상 기능 (추천)

### 1.1 동영상 업로드
```javascript
// 프론트엔드: webapp/js/app.js
<input 
  id="video-upload" 
  type="file" 
  accept="video/mp4,video/quicktime" 
  capture="environment"
/>
```

### 1.2 동영상 미리보기
```javascript
// HTML5 Video Player
<video id="defect-video" controls width="100%">
  <source src="" type="video/mp4">
</video>

// 타임스탬프별 하자 마킹
<div class="video-markers">
  <button onclick="markDefect(10.5)">0:10 - 거실 마루 들뜸</button>
  <button onclick="markDefect(25.3)">0:25 - 주방 타일 균열</button>
</div>
```

### 1.3 백엔드 API
```javascript
// POST /api/upload/video
// - 동영상 파일 업로드
// - 썸네일 자동 생성
// - 파일 크기 제한: 100MB

// POST /api/defects
// - video_url: 동영상 URL
// - video_timestamp: 하자 발생 시점 (초)
// - video_thumbnail: 해당 시점 썸네일
```

### 1.4 데이터베이스 스키마
```sql
ALTER TABLE defect ADD COLUMN video_url TEXT;
ALTER TABLE defect ADD COLUMN video_timestamp DECIMAL;
ALTER TABLE defect ADD COLUMN video_thumbnail TEXT;
```

## 🎯 2단계: 고급 기능

### 2.1 동영상 주석 기능
- 동영상 재생 중 특정 시점에 마커 추가
- 마커 클릭 시 해당 시점으로 이동
- 하자 설명 텍스트 오버레이

### 2.2 프레임 캡처
```javascript
// 동영상의 특정 프레임을 이미지로 저장
function captureFrame(videoElement, timestamp) {
  const canvas = document.createElement('canvas');
  canvas.width = videoElement.videoWidth;
  canvas.height = videoElement.videoHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(videoElement, 0, 0);
  return canvas.toDataURL('image/jpeg');
}
```

### 2.3 동영상 압축
```javascript
// FFmpeg.wasm 사용
// - 해상도 조정 (1080p → 720p)
// - 비트레이트 조정
// - 파일 크기 50% 감소
```

## 📊 기술 스택

### 프론트엔드
- HTML5 Video API
- MediaRecorder API (녹화)
- Canvas API (프레임 캡처)

### 백엔드
- Multer (파일 업로드)
- FFmpeg (동영상 처리)
- Sharp (썸네일 생성)

### 스토리지
- 로컬: ./uploads/videos/
- 클라우드 (선택):
  - Azure Blob Storage
  - AWS S3
  - Cloudflare R2

## 💰 비용 추정

### 무료 옵션
- 로컬 스토리지: $0
- 용량 제한: 10GB

### 클라우드 옵션
- Azure Blob Storage: $0.02/GB/월
- 예상: 100GB = $2/월

## 🚀 구현 우선순위

1. ✅ **기본 업로드 및 재생** (1-2일)
2. ⭐ **타임스탬프 마킹** (1일)
3. 📸 **프레임 캡처** (1일)
4. 🎨 **UI/UX 개선** (1일)
5. 💾 **클라우드 스토리지** (1일)

## 📝 다음 단계

어떤 방식으로 구현하시겠습니까?

**옵션 A: 간단한 동영상 업로드 + 재생**
- 빠른 구현 (1-2일)
- 기본 기능만 제공
- 추천 ⭐

**옵션 B: 타임스탬프 마킹 포함**
- 중간 난이도 (3-4일)
- 하자 시점 정확히 표시
- 실용적 ✨

**옵션 C: AI 자동 감지 포함**
- 고급 기능 (1-2주)
- 자동화
- 향후 고려 🔮

