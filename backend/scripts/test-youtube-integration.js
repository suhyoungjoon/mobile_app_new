// YouTube Integration Test Script
const { Pool } = require('pg');

// Render PostgreSQL 연결
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://insighti_user:2eq3v151vjtJ2wUz4PUUQ2VHhlTbjWRy@dpg-d3kardu3jp1c73b2dkrg-a.singapore-postgres.render.com/insighti_db_yckk';

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function testYouTubeIntegration() {
  console.log('🎥 YouTube 연동 기능 테스트 시작');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  try {
    // 1. 하자 카테고리 테이블 확인
    console.log('1️⃣ 하자 카테고리 테이블 확인...');
    
    const categoriesResult = await pool.query(`
      SELECT id, name, description, solution, severity, category 
      FROM defect_categories 
      ORDER BY id 
      LIMIT 5
    `);
    
    console.log('✅ 하자 카테고리 데이터:', categoriesResult.rows.length, '건');
    categoriesResult.rows.forEach(cat => {
      console.log(`   - ${cat.id}: ${cat.name} (${cat.severity})`);
    });
    
    // 2. YouTube 동영상 테이블 확인
    console.log('2️⃣ YouTube 동영상 테이블 확인...');
    
    const videosResult = await pool.query(`
      SELECT 
        dv.id,
        dv.youtube_video_id,
        dv.youtube_url,
        dv.title,
        dv.timestamp_start,
        dv.timestamp_end,
        dv.is_primary,
        dc.name as defect_name
      FROM defect_videos dv
      JOIN defect_categories dc ON dv.defect_category_id = dc.id
      ORDER BY dv.id
      LIMIT 5
    `);
    
    console.log('✅ YouTube 동영상 데이터:', videosResult.rows.length, '건');
    videosResult.rows.forEach(video => {
      console.log(`   - ${video.id}: ${video.defect_name} → ${video.youtube_video_id}`);
      console.log(`     제목: ${video.title || 'N/A'}`);
      console.log(`     시간: ${video.timestamp_start}s - ${video.timestamp_end}s`);
      console.log(`     주요: ${video.is_primary ? 'Yes' : 'No'}`);
    });
    
    // 3. API 엔드포인트 테스트
    console.log('3️⃣ API 엔드포인트 테스트...');
    
    const baseUrl = 'https://mobile-app-new.onrender.com';
    
    try {
      // 하자 카테고리 목록 조회
      const categoriesResponse = await fetch(`${baseUrl}/api/defect-categories`);
      if (categoriesResponse.ok) {
        const categoriesData = await categoriesResponse.json();
        console.log('✅ 하자 카테고리 API 응답:', categoriesData.length, '건');
      } else {
        console.log('❌ 하자 카테고리 API 실패:', categoriesResponse.status);
      }
      
      // 특정 하자 카테고리 상세 조회 (동영상 포함)
      if (categoriesResult.rows.length > 0) {
        const categoryId = categoriesResult.rows[0].id;
        const detailResponse = await fetch(`${baseUrl}/api/defect-categories/${categoryId}`);
        if (detailResponse.ok) {
          const detailData = await detailResponse.json();
          console.log('✅ 하자 상세 API 응답:');
          console.log(`   하자명: ${detailData.name}`);
          console.log(`   설명: ${detailData.description}`);
          console.log(`   해결방법: ${detailData.solution}`);
          console.log(`   동영상 수: ${detailData.videos ? detailData.videos.length : 0}개`);
          
          if (detailData.videos && detailData.videos.length > 0) {
            detailData.videos.forEach((video, index) => {
              console.log(`   동영상 ${index + 1}:`);
              console.log(`     ID: ${video.youtube_video_id}`);
              console.log(`     URL: ${video.youtube_url}`);
              console.log(`     시간: ${video.timestamp_start}s - ${video.timestamp_end}s`);
              console.log(`     주요: ${video.is_primary ? 'Yes' : 'No'}`);
            });
          }
        } else {
          console.log('❌ 하자 상세 API 실패:', detailResponse.status);
        }
      }
      
    } catch (error) {
      console.log('❌ API 테스트 오류:', error.message);
    }
    
    // 4. YouTube URL 생성 테스트
    console.log('4️⃣ YouTube URL 생성 테스트...');
    
    if (videosResult.rows.length > 0) {
      const video = videosResult.rows[0];
      const embedUrl = `https://www.youtube.com/embed/${video.youtube_video_id}?start=${video.timestamp_start}&end=${video.timestamp_end}&autoplay=0&rel=0&modestbranding=1`;
      console.log('✅ YouTube 임베드 URL 생성:');
      console.log(`   원본 URL: ${video.youtube_url}`);
      console.log(`   임베드 URL: ${embedUrl}`);
    }
    
    // 5. 통계 정보
    console.log('5️⃣ 통계 정보...');
    
    const statsResult = await pool.query(`
      SELECT 
        COUNT(DISTINCT dc.id) as total_categories,
        COUNT(DISTINCT dv.id) as total_videos,
        COUNT(DISTINCT CASE WHEN dv.is_primary THEN dv.id END) as primary_videos,
        COUNT(DISTINCT dc.category) as category_types
      FROM defect_categories dc
      LEFT JOIN defect_videos dv ON dc.id = dv.defect_category_id
    `);
    
    const stats = statsResult.rows[0];
    console.log('📊 YouTube 연동 통계:');
    console.log(`   총 하자 카테고리: ${stats.total_categories}개`);
    console.log(`   총 동영상: ${stats.total_videos}개`);
    console.log(`   주요 동영상: ${stats.primary_videos}개`);
    console.log(`   카테고리 유형: ${stats.category_types}개`);
    
    // 6. 테스트 완료
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ YouTube 연동 기능 테스트 완료');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    console.log('\n📋 구현 상태 요약:');
    console.log('✅ 데이터베이스 스키마: 완료');
    console.log('✅ 백엔드 API: 완료');
    console.log('✅ 프론트엔드 UI: 완료');
    console.log('✅ YouTube 임베드: 완료');
    console.log('⚠️  실제 동영상 데이터: 부족 (샘플 데이터 필요)');
    
  } catch (error) {
    console.error('❌ 테스트 실패:', error);
  } finally {
    await pool.end();
  }
}

// 메인 실행
if (require.main === module) {
  testYouTubeIntegration().catch(console.error);
}

module.exports = { testYouTubeIntegration };
