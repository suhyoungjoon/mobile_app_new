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
    
    if (!config.youtubeApiKey) {
      return res.status(500).json({ 
        error: 'YouTube API key not configured',
        message: 'YouTube API 키가 설정되지 않았습니다. 관리자에게 문의하세요.'
      });
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
    console.error('❌ YouTube 검색 오류:', error.response?.data || error.message);
    
    if (error.response?.status === 403) {
      res.status(403).json({ 
        error: 'YouTube API quota exceeded',
        message: 'YouTube API 할당량을 초과했습니다. 잠시 후 다시 시도해주세요.'
      });
    } else if (error.response?.status === 400) {
      res.status(400).json({ 
        error: 'Invalid YouTube API request',
        message: 'YouTube API 요청이 잘못되었습니다.'
      });
    } else {
      res.status(500).json({ 
        error: 'YouTube search failed',
        message: 'YouTube 검색에 실패했습니다. 잠시 후 다시 시도해주세요.'
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
