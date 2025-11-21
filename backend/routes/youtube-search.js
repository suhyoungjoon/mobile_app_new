// YouTube 실시간 검색 API 라우트
const express = require('express');
const axios = require('axios');
const config = require('../config');

const router = express.Router();

// YouTube Data API v3 검색
router.get('/search/:query', async (req, res) => {
  try {
    const { query } = req.params;
    const { maxResults = 5, type = 'video' } = req.query;
    
    // YouTube API 키 확인
    if (!config.youtubeApiKey) {
      console.error('⚠️ YouTube API 키가 설정되지 않았습니다.');
      console.error('   환경변수 YOUTUBE_API_KEY를 확인하세요.');
      return res.status(500).json({ 
        error: 'YouTube API key not configured',
        message: 'YouTube API 키가 설정되지 않았습니다. 관리자에게 문의하세요.',
        details: 'YOUTUBE_API_KEY 환경변수가 설정되지 않았습니다.'
      });
    }
    
    // API 키 형식 간단 검증 (AIza로 시작하는지 확인)
    if (!config.youtubeApiKey.startsWith('AIza')) {
      console.warn('⚠️ YouTube API 키 형식이 올바르지 않을 수 있습니다.');
    }

    // YouTube Data API v3 검색 요청
    const searchUrl = 'https://www.googleapis.com/youtube/v3/search';
    const searchParams = {
      part: 'snippet',
      q: `${query} 하자 보수 건설`,
      type: type,
      maxResults: parseInt(maxResults),
      order: 'relevance',
      key: config.youtubeApiKey,
      regionCode: 'KR', // 한국 지역 우선
      relevanceLanguage: 'ko' // 한국어 우선
    };

    console.log(`🔍 YouTube 검색: "${query}"`);
    
    const response = await axios.get(searchUrl, { params: searchParams });
    
    if (response.data.items && response.data.items.length > 0) {
      // 검색 결과를 앱 형식에 맞게 변환
      const videos = response.data.items.map(item => ({
        id: item.id.videoId,
        youtube_video_id: item.id.videoId,
        youtube_url: `https://youtu.be/${item.id.videoId}`,
        title: item.snippet.title,
        description: item.snippet.description,
        thumbnail: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
        channel_title: item.snippet.channelTitle,
        published_at: item.snippet.publishedAt,
        timestamp_start: 0, // 기본값
        timestamp_end: null, // 전체 재생
        is_primary: true // 검색 결과는 모두 주요 동영상으로 처리
      }));

      console.log(`✅ YouTube 검색 완료: ${videos.length}개 동영상 발견`);
      
      res.json({
        success: true,
        query: query,
        videos: videos,
        total_results: response.data.pageInfo?.totalResults || videos.length
      });
    } else {
      console.log(`⚠️ YouTube 검색 결과 없음: "${query}"`);
      res.json({
        success: true,
        query: query,
        videos: [],
        total_results: 0,
        message: '관련 동영상을 찾을 수 없습니다.'
      });
    }

  } catch (error) {
    // 상세한 에러 로깅
    const errorDetails = {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      config: {
        url: error.config?.url,
        method: error.config?.method,
        params: error.config?.params
      }
    };
    
    console.error('❌ YouTube 검색 오류:', JSON.stringify(errorDetails, null, 2));
    
    // YouTube API 키가 없는 경우
    if (!config.youtubeApiKey) {
      console.error('⚠️ YouTube API 키가 설정되지 않았습니다. YOUTUBE_API_KEY 환경변수를 확인하세요.');
      return res.status(500).json({ 
        error: 'YouTube API key not configured',
        message: 'YouTube API 키가 설정되지 않았습니다. 관리자에게 문의하세요.',
        details: 'YOUTUBE_API_KEY 환경변수가 설정되지 않았습니다.'
      });
    }
    
    // HTTP 상태 코드별 처리
    if (error.response?.status === 403) {
      const errorData = error.response.data;
      const reason = errorData?.error?.errors?.[0]?.reason || 'unknown';
      
      if (reason === 'quotaExceeded') {
        console.error('⚠️ YouTube API 할당량 초과');
        return res.status(403).json({ 
          error: 'YouTube API quota exceeded',
          message: 'YouTube API 할당량을 초과했습니다. 잠시 후 다시 시도해주세요.',
          details: '일일 할당량이 소진되었습니다. 내일 다시 시도하거나 API 할당량을 늘려주세요.'
        });
      } else if (reason === 'accessNotConfigured') {
        console.error('⚠️ YouTube API가 활성화되지 않음');
        return res.status(403).json({ 
          error: 'YouTube API not enabled',
          message: 'YouTube API가 활성화되지 않았습니다. 관리자에게 문의하세요.',
          details: 'Google Cloud Console에서 YouTube Data API v3를 활성화해야 합니다.'
        });
      } else {
        console.error('⚠️ YouTube API 접근 거부:', reason);
        return res.status(403).json({ 
          error: 'YouTube API access denied',
          message: 'YouTube API 접근이 거부되었습니다. 관리자에게 문의하세요.',
          details: `원인: ${reason}`
        });
      }
    } else if (error.response?.status === 400) {
      const errorData = error.response.data;
      const reason = errorData?.error?.errors?.[0]?.reason || 'unknown';
      console.error('⚠️ YouTube API 잘못된 요청:', reason);
      return res.status(400).json({ 
        error: 'Invalid YouTube API request',
        message: 'YouTube API 요청이 잘못되었습니다.',
        details: `원인: ${reason}`
      });
    } else if (error.response?.status === 401) {
      console.error('⚠️ YouTube API 인증 실패');
      return res.status(401).json({ 
        error: 'YouTube API authentication failed',
        message: 'YouTube API 인증에 실패했습니다. 관리자에게 문의하세요.',
        details: 'API 키가 유효하지 않거나 만료되었을 수 있습니다.'
      });
    } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      console.error('⚠️ YouTube API 서버 연결 실패:', error.code);
      return res.status(503).json({ 
        error: 'YouTube API server unavailable',
        message: 'YouTube API 서버에 연결할 수 없습니다. 네트워크를 확인하세요.',
        details: `연결 오류: ${error.code}`
      });
    } else {
      // 기타 에러
      const errorMessage = error.response?.data?.error?.message || error.message || '알 수 없는 오류';
      console.error('⚠️ YouTube 검색 실패:', errorMessage);
      return res.status(500).json({ 
        error: 'YouTube search failed',
        message: 'YouTube 검색에 실패했습니다. 잠시 후 다시 시도해주세요.',
        details: errorMessage
      });
    }
  }
});

// YouTube 동영상 상세 정보 조회
router.get('/video/:videoId', async (req, res) => {
  try {
    const { videoId } = req.params;
    
    if (!config.youtubeApiKey) {
      return res.status(500).json({ 
        error: 'YouTube API key not configured'
      });
    }

    const videoUrl = 'https://www.googleapis.com/youtube/v3/videos';
    const videoParams = {
      part: 'snippet,contentDetails,statistics',
      id: videoId,
      key: config.youtubeApiKey
    };

    const response = await axios.get(videoUrl, { params: videoParams });
    
    if (response.data.items && response.data.items.length > 0) {
      const video = response.data.items[0];
      
      res.json({
        success: true,
        video: {
          id: video.id,
          title: video.snippet.title,
          description: video.snippet.description,
          thumbnail: video.snippet.thumbnails.medium?.url,
          duration: video.contentDetails.duration,
          view_count: video.statistics.viewCount,
          like_count: video.statistics.likeCount,
          published_at: video.snippet.publishedAt,
          channel_title: video.snippet.channelTitle
        }
      });
    } else {
      res.status(404).json({ 
        error: 'Video not found',
        message: '동영상을 찾을 수 없습니다.'
      });
    }

  } catch (error) {
    console.error('❌ YouTube 동영상 조회 오류:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Failed to fetch video details',
      message: '동영상 정보를 가져오는데 실패했습니다.'
    });
  }
});

module.exports = router;
