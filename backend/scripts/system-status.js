// 간단한 상태 확인 스크립트
const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://insighti_user:2eq3v151vjtJ2wUz4PUUQ2VHhlTbjWRy@dpg-d3kardu3jp1c73b2dkrg-a.singapore-postgres.render.com/insighti_db_yckk';

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkSystemStatus() {
  console.log('🔍 시스템 상태 확인');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  const client = await pool.connect();
  try {
    // 1. 데이터베이스 연결 확인
    console.log('1️⃣ 데이터베이스 연결: ✅ 정상');
    
    // 2. 테이블 구조 확인
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log('\n2️⃣ 데이터베이스 테이블:');
    tables.rows.forEach(row => {
      console.log(`   - ${row.table_name}`);
    });
    
    // 3. 사용자 역할 분포
    const userRoles = await client.query(`
      SELECT user_type, COUNT(*) as count
      FROM household
      GROUP BY user_type
    `);
    
    console.log('\n3️⃣ 사용자 역할 분포:');
    userRoles.rows.forEach(row => {
      console.log(`   - ${row.user_type}: ${row.count}명`);
    });
    
    // 4. 최근 데이터 확인
    const recentData = await client.query(`
      SELECT 
        ii.type,
        ii.location,
        ii.result,
        ii.created_at,
        am.tvoc, am.hcho, am.co2,
        rm.radon, rm.unit_radon,
        lm.left_mm, lm.right_mm
      FROM inspection_item ii
      LEFT JOIN air_measure am ON ii.id = am.item_id
      LEFT JOIN radon_measure rm ON ii.id = rm.item_id
      LEFT JOIN level_measure lm ON ii.id = lm.item_id
      ORDER BY ii.created_at DESC
      LIMIT 10
    `);
    
    console.log('\n4️⃣ 최근 점검 데이터:');
    recentData.rows.forEach((row, index) => {
      console.log(`   ${index + 1}. ${row.type} (${row.location}) - ${row.result}`);
      console.log(`      생성일: ${row.created_at.toLocaleString()}`);
      if (row.tvoc !== null) {
        console.log(`      공기질: TVOC=${row.tvoc}, HCHO=${row.hcho}, CO2=${row.co2}`);
      }
      if (row.radon !== null) {
        console.log(`      라돈: ${row.radon} ${row.unit_radon}`);
      }
      if (row.left_mm !== null) {
        console.log(`      레벨기: 좌=${row.left_mm}mm, 우=${row.right_mm}mm`);
      }
    });
    
    // 5. 케이스 통계
    const caseStats = await client.query(`
      SELECT 
        type,
        COUNT(*) as count,
        COUNT(CASE WHEN created_at > NOW() - INTERVAL '1 day' THEN 1 END) as recent_count
      FROM case_header
      GROUP BY type
      ORDER BY count DESC
    `);
    
    console.log('\n5️⃣ 케이스 통계:');
    caseStats.rows.forEach(row => {
      console.log(`   - ${row.type}: ${row.count}개 (최근 1일: ${row.recent_count}개)`);
    });
    
    // 6. 성능 테스트
    const startTime = Date.now();
    await client.query(`
      SELECT COUNT(*) FROM inspection_item
    `);
    const endTime = Date.now();
    
    console.log(`\n6️⃣ 성능 테스트: ${endTime - startTime}ms`);
    
    console.log('\n✅ 시스템 상태 확인 완료');
    
  } catch (error) {
    console.error('❌ 시스템 상태 확인 실패:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

checkSystemStatus().catch(console.error);
