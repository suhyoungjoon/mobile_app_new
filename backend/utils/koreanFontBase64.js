/**
 * 한글 폰트 Base64 인코딩
 * Noto Sans KR 폰트의 서브셋을 base64로 임베드
 * 
 * 주의: 전체 폰트 파일은 매우 크므로, 실제 사용 시에는
 * 서브셋 폰트를 생성하거나 CDN에서 가져온 폰트를 base64로 변환해야 합니다.
 * 
 * 여기서는 간단한 폰트 fallback을 위한 기본 설정만 제공합니다.
 */

// Noto Sans KR Regular 폰트의 base64 인코딩
// 실제로는 폰트 파일을 읽어서 base64로 변환해야 합니다.
// 예시: const fontBase64 = fs.readFileSync('fonts/NotoSansKR-Regular.woff2').toString('base64');

// 임시로 빈 문자열로 설정 (실제 폰트 파일이 필요함)
// 프로덕션에서는 실제 폰트 파일을 base64로 변환하여 사용해야 합니다.
const NOTO_SANS_KR_REGULAR_BASE64 = '';

/**
 * 한글 폰트를 base64로 임베드한 CSS 생성
 * 실제 폰트 파일이 있으면 base64로 변환하여 사용
 */
function getKoreanFontCSS() {
  // 폰트 파일이 없으면 시스템 폰트에 의존
  // 실제 사용 시에는 폰트 파일을 base64로 변환하여 사용
  return `
    @font-face {
      font-family: 'Noto Sans KR';
      font-style: normal;
      font-weight: 400;
      font-display: swap;
      src: local('Noto Sans KR Regular'), 
           local('Noto Sans KR'),
           local('Apple SD Gothic Neo'),
           local('Malgun Gothic'),
           local('맑은 고딕');
    }
    
    @font-face {
      font-family: 'Noto Sans KR';
      font-style: normal;
      font-weight: 500;
      font-display: swap;
      src: local('Noto Sans KR Medium'),
           local('Noto Sans KR'),
           local('Apple SD Gothic Neo'),
           local('Malgun Gothic');
    }
    
    @font-face {
      font-family: 'Noto Sans KR';
      font-style: normal;
      font-weight: 600;
      font-display: swap;
      src: local('Noto Sans KR SemiBold'),
           local('Noto Sans KR'),
           local('Apple SD Gothic Neo'),
           local('Malgun Gothic');
    }
    
    @font-face {
      font-family: 'Noto Sans KR';
      font-style: normal;
      font-weight: 700;
      font-display: swap;
      src: local('Noto Sans KR Bold'),
           local('Noto Sans KR'),
           local('Apple SD Gothic Neo Bold'),
           local('Malgun Gothic Bold');
    }
  `;
}

module.exports = {
  getKoreanFontCSS,
  NOTO_SANS_KR_REGULAR_BASE64
};

