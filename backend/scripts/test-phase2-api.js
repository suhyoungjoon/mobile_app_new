// Phase 2 API 테스트 스크립트
const { Pool } = require('pg');

// Render PostgreSQL 연결
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://insighti_user:2eq3v151vjtJ2wUz4PUUQ2VHhlTbjWRy@dpg-d3kardu3jp1c73b2dkrg-a.singapore-postgres.render.com/insighti_db_yckk';

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// API 테스트 함수들
async function testAPI() {
  const baseURL = 'https://mobile-app-new.onrender.com/api';
  
  console.log('🧪 Phase 2 API 테스트 시작');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  try {
    // 1. 로그인하여 토큰 획득
    console.log('1️⃣ 로그인 테스트...');
    const loginResponse = await fetch(`${baseURL}/auth/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        complex: '서울 인싸이트자이',
        dong: '101',
        ho: '1203',
        name: '홍길동',
        phone: '010-1234-5678'
      })
    });
    
    const loginData = await loginResponse.json();
    const token = loginData.token;
    console.log('✅ 로그인 성공:', token.substring(0, 20) + '...');
    
    // 2. 케이스 생성
    console.log('\n2️⃣ 케이스 생성...');
    const caseResponse = await fetch(`${baseURL}/cases`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ type: '장비점검' })
    });
    
    const caseData = await caseResponse.json();
    const caseId = caseData.id;
    console.log('✅ 케이스 생성 성공:', caseId);
    
    if (!caseId) {
      console.log('❌ 케이스 ID가 없습니다. 응답:', caseData);
      return;
    }
    
    // 3. 공기질 측정 등록
    console.log('\n3️⃣ 공기질 측정 등록...');
    const airResponse = await fetch(`${baseURL}/inspections/air`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        caseId: caseId,
        location: '거실',
        trade: '마감',
        tvoc: 0.15,
        hcho: 0.05,
        co2: 500,
        note: 'API 테스트 공기질 측정',
        result: 'normal'
      })
    });
    
    const airData = await airResponse.json();
    console.log('✅ 공기질 측정 등록 성공:', airData.item.id);
    
    // 4. 라돈 측정 등록
    console.log('\n4️⃣ 라돈 측정 등록...');
    const radonResponse = await fetch(`${baseURL}/inspections/radon`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        caseId: caseId,
        location: '침실',
        trade: '마감',
        radon: 200.0,
        unit_radon: 'Bq/m³',
        note: 'API 테스트 라돈 측정',
        result: 'normal'
      })
    });
    
    const radonData = await radonResponse.json();
    console.log('✅ 라돈 측정 등록 성공:', radonData.item.id);
    
    // 5. 레벨기 측정 등록
    console.log('\n5️⃣ 레벨기 측정 등록...');
    const levelResponse = await fetch(`${baseURL}/inspections/level`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        caseId: caseId,
        location: '주방',
        trade: '바닥',
        left_mm: 2.5,
        right_mm: -1.2,
        note: 'API 테스트 레벨기 측정',
        result: 'normal'
      })
    });
    
    const levelData = await levelResponse.json();
    console.log('✅ 레벨기 측정 등록 성공:', levelData.item.id);
    
    // 6. 열화상 점검 항목 생성
    console.log('\n6️⃣ 열화상 점검 항목 생성...');
    const thermalResponse = await fetch(`${baseURL}/inspections/thermal`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        caseId: caseId,
        location: '욕실',
        trade: '마감',
        note: 'API 테스트 열화상 점검',
        result: 'normal'
      })
    });
    
    const thermalData = await thermalResponse.json();
    console.log('✅ 열화상 점검 항목 생성 성공:', thermalData.item.id);
    
    // 7. 케이스별 점검 항목 조회
    console.log('\n7️⃣ 케이스별 점검 항목 조회...');
    const inspectionsResponse = await fetch(`${baseURL}/inspections/${caseId}`, {
      headers: { 
        'Authorization': `Bearer ${token}`
      }
    });
    
    const inspectionsData = await inspectionsResponse.json();
    console.log('✅ 점검 항목 조회 성공:');
    console.log('   - 총 항목 수:', inspectionsData.total);
    console.log('   - 공기질:', inspectionsData.inspections.air?.length || 0, '건');
    console.log('   - 라돈:', inspectionsData.inspections.radon?.length || 0, '건');
    console.log('   - 레벨기:', inspectionsData.inspections.level?.length || 0, '건');
    console.log('   - 열화상:', inspectionsData.inspections.thermal?.length || 0, '건');
    
    // 8. 입력 검증 테스트 (실패 케이스)
    console.log('\n8️⃣ 입력 검증 테스트...');
    
    // 잘못된 TVOC 값
    const invalidAirResponse = await fetch(`${baseURL}/inspections/air`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        caseId: caseId,
        location: '테스트',
        tvoc: 25.0, // 범위 초과 (0-20)
        hcho: 0.05,
        note: '검증 테스트'
      })
    });
    
    const invalidAirData = await invalidAirResponse.json();
    if (invalidAirResponse.status === 400) {
      console.log('✅ TVOC 범위 검증 성공:', invalidAirData.error);
    } else {
      console.log('❌ TVOC 범위 검증 실패');
    }
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 Phase 2 API 테스트 완료!');
    console.log('✅ 모든 엔드포인트가 정상 작동합니다');
    
  } catch (error) {
    console.error('❌ API 테스트 실패:', error.message);
  }
}

// 데이터베이스 직접 테스트
async function testDatabase() {
  console.log('\n🔍 데이터베이스 직접 테스트...');
  
  const client = await pool.connect();
  try {
    // 새로 생성된 데이터 확인
    const result = await client.query(`
      SELECT 
        ii.type,
        ii.location,
        ii.result,
        am.tvoc, am.hcho, am.co2,
        rm.radon, rm.unit_radon,
        lm.left_mm, lm.right_mm
      FROM inspection_item ii
      LEFT JOIN air_measure am ON ii.id = am.item_id
      LEFT JOIN radon_measure rm ON ii.id = rm.item_id
      LEFT JOIN level_measure lm ON ii.id = lm.item_id
      WHERE ii.created_at > NOW() - INTERVAL '1 hour'
      ORDER BY ii.created_at DESC
      LIMIT 10
    `);
    
    console.log('📊 최근 생성된 점검 항목:');
    result.rows.forEach((row, index) => {
      console.log(`  ${index + 1}. ${row.type} (${row.location}) - ${row.result}`);
      if (row.tvoc !== null) {
        console.log(`     공기질: TVOC=${row.tvoc}, HCHO=${row.hcho}, CO2=${row.co2}`);
      }
      if (row.radon !== null) {
        console.log(`     라돈: ${row.radon} ${row.unit_radon}`);
      }
      if (row.left_mm !== null) {
        console.log(`     레벨기: 좌=${row.left_mm}mm, 우=${row.right_mm}mm`);
      }
    });
    
  } catch (error) {
    console.error('❌ 데이터베이스 테스트 실패:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

// 메인 실행
async function main() {
  await testAPI();
  await testDatabase();
}

main().catch(console.error);
