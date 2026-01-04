// 빠른 DB 연결 체크
const { Pool } = require('pg');

// Render DATABASE_URL (환경변수 또는 하드코딩된 값)
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.log('⚠️ DATABASE_URL 환경변수가 설정되지 않았습니다.');
  console.log('로컬 환경에서는 DATABASE_URL을 설정하거나 Render 환경에서 실행하세요.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 5000
});

async function quickCheck() {
  console.log('🔍 DB 연결 체크 중...');
  console.log(`연결 문자열: ${DATABASE_URL.substring(0, 30)}...`);
  
  try {
    const client = await pool.connect();
    console.log('✅ DB 연결 성공!');
    
    // 간단한 쿼리 테스트
    const result = await client.query('SELECT NOW() as current_time, version() as pg_version');
    console.log(`📅 서버 시간: ${result.rows[0].current_time}`);
    console.log(`🗄️ PostgreSQL 버전: ${result.rows[0].pg_version.split(' ')[0]} ${result.rows[0].pg_version.split(' ')[1]}`);
    
    // 테이블 개수 확인
    const tableCount = await client.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log(`📋 테이블 개수: ${tableCount.rows[0].count}개`);
    
    // 최근 케이스 확인
    const recentCase = await client.query(`
      SELECT id, type, created_at 
      FROM case_header 
      ORDER BY created_at DESC 
      LIMIT 1
    `);
    
    if (recentCase.rows.length > 0) {
      console.log(`📝 최근 케이스: ${recentCase.rows[0].id} (${recentCase.rows[0].type})`);
    } else {
      console.log('📝 케이스 데이터 없음');
    }
    
    client.release();
    await pool.end();
    
    console.log('\n✅ DB 연결 체크 완료!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ DB 연결 실패:', error.message);
    console.error('에러 코드:', error.code);
    process.exit(1);
  }
}

quickCheck();

