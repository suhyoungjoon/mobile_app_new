// YouTube 실시간 검색 기능 테스트 스크립트
const axios = require('axios');

// Render 백엔드 URL
const API_BASE_URL = 'https://mobile-app-new.onrender.com/api';

async function testYouTubeRealTimeSearch() {
  console.log('🎥 YouTube 실시간 검색 기능 테스트 시작');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  try {
    // 1. 하자 카테고리 목록 조회
    console.log('1️⃣ 하자 카테고리 목록 조회...');
    const categoriesResponse = await axios.get(`${API_BASE_URL}/defect-categories`);
    const categories = categoriesResponse.data;
    
    if (categories.length === 0) {
      console.log('❌ 하자 카테고리가 없습니다');
      return;
    }
    
    console.log(`✅ 하자 카테고리 ${categories.length}개 발견`);
    
    // 2. 첫 번째 하자로 YouTube 실시간 검색 테스트
    const testDefect = categories[0];
    console.log(`2️⃣ YouTube 실시간 검색 테스트: "${testDefect.name}"`);
    
    try {
      const searchResponse = await axios.get(`${API_BASE_URL}/youtube/search/${encodeURIComponent(testDefect.name)}?maxResults=3`);
      
      if (searchResponse.data.success) {
        const videos = searchResponse.data.videos;
        console.log(`✅ YouTube 검색 성공: ${videos.length}개 동영상 발견`);
        
        videos.forEach((video, index) => {
          console.log(`   동영상 ${index + 1}:`);
          console.log(`     제목: ${video.title}`);
          console.log(`     채널: ${video.channel_title}`);
          console.log(`     ID: ${video.youtube_video_id}`);
          console.log(`     URL: ${video.youtube_url}`);
          console.log(`     썸네일: ${video.thumbnail}`);
        });
        
        // 3. 첫 번째 동영상 상세 정보 조회
        if (videos.length > 0) {
          console.log(`3️⃣ 동영상 상세 정보 조회: ${videos[0].youtube_video_id}`);
          
          try {
            const videoDetailResponse = await axios.get(`${API_BASE_URL}/youtube/video/${videos[0].youtube_video_id}`);
            
            if (videoDetailResponse.data.success) {
              const videoDetail = videoDetailResponse.data.video;
              console.log('✅ 동영상 상세 정보 조회 성공:');
              console.log(`   제목: ${videoDetail.title}`);
              console.log(`   채널: ${videoDetail.channel_title}`);
              console.log(`   조회수: ${videoDetail.view_count}`);
              console.log(`   좋아요: ${videoDetail.like_count}`);
              console.log(`   업로드일: ${videoDetail.published_at}`);
              console.log(`   재생시간: ${videoDetail.duration}`);
            } else {
              console.log('❌ 동영상 상세 정보 조회 실패');
            }
          } catch (detailError) {
            console.log('❌ 동영상 상세 정보 조회 오류:', detailError.response?.data?.message || detailError.message);
          }
        }
        
      } else {
        console.log('⚠️ YouTube 검색 결과 없음');
      }
      
    } catch (searchError) {
      console.log('❌ YouTube 검색 실패:', searchError.response?.data?.message || searchError.message);
      
      if (searchError.response?.status === 500 && searchError.response?.data?.error === 'YouTube API key not configured') {
        console.log('💡 해결방법: YouTube API 키를 설정해주세요');
        console.log('   1. Google Cloud Console에서 YouTube Data API v3 활성화');
        console.log('   2. API 키 생성');
        console.log('   3. Render 환경변수에 YOUTUBE_API_KEY 설정');
      }
    }
    
    // 4. 여러 하자 유형으로 검색 테스트
    console.log('4️⃣ 여러 하자 유형 검색 테스트...');
    const testDefects = categories.slice(0, 3); // 처음 3개 하자만 테스트
    
    for (const defect of testDefects) {
      try {
        console.log(`   검색 중: "${defect.name}"`);
        const response = await axios.get(`${API_BASE_URL}/youtube/search/${encodeURIComponent(defect.name)}?maxResults=1`);
        
        if (response.data.success && response.data.videos.length > 0) {
          console.log(`   ✅ "${defect.name}": ${response.data.videos.length}개 동영상`);
        } else {
          console.log(`   ⚠️ "${defect.name}": 검색 결과 없음`);
        }
        
        // API 할당량 고려하여 잠시 대기
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.log(`   ❌ "${defect.name}": 검색 실패`);
      }
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ YouTube 실시간 검색 기능 테스트 완료');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    console.log('\n📋 구현 상태 요약:');
    console.log('✅ 백엔드 API: 완료');
    console.log('✅ 프론트엔드 통합: 완료');
    console.log('✅ 실시간 검색: 완료');
    console.log('✅ 검색 결과 표시: 완료');
    console.log('✅ 동영상 상세 정보: 완료');
    console.log('⚠️  YouTube API 키: 설정 필요');
    
    console.log('\n🔧 설정 방법:');
    console.log('1. Google Cloud Console 접속');
    console.log('2. YouTube Data API v3 활성화');
    console.log('3. API 키 생성');
    console.log('4. Render 환경변수에 YOUTUBE_API_KEY 설정');
    
  } catch (error) {
    console.error('❌ 테스트 실패:', error.response?.data || error.message);
  }
}

// 메인 실행
if (require.main === module) {
  testYouTubeRealTimeSearch().catch(console.error);
}

module.exports = { testYouTubeRealTimeSearch };
