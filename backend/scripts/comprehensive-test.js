// Phase 1-3 종합 테스트 스크립트
const { Pool } = require('pg');

// Render PostgreSQL 연결
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://insighti_user:2eq3v151vjtJ2wUz4PUUQ2VHhlTbjWRy@dpg-d3kardu3jp1c73b2dkrg-a.singapore-postgres.render.com/insighti_db_yckk';

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// API 테스트 함수들
async function testPhase1Database() {
  console.log('🔍 Phase 1: 데이터베이스 스키마 테스트');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  const client = await pool.connect();
  try {
    // 새로 생성된 테이블 확인
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('inspection_item', 'air_measure', 'radon_measure', 'level_measure', 'thermal_photo')
      ORDER BY table_name;
    `);
    
    console.log('✅ 새로 생성된 테이블:');
    tables.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });
    
    // 기존 테이블 수정 확인
    const householdColumns = await client.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns 
      WHERE table_name = 'household' AND column_name = 'user_type';
    `);
    
    if (householdColumns.rows.length > 0) {
      console.log('✅ household.user_type 컬럼 추가됨');
    } else {
      console.log('❌ household.user_type 컬럼 누락');
    }
    
    // 샘플 데이터 확인
    const sampleData = await client.query(`
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
      LIMIT 5
    `);
    
    console.log('📊 최근 생성된 샘플 데이터:');
    sampleData.rows.forEach((row, index) => {
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
    
    return true;
  } catch (error) {
    console.error('❌ Phase 1 테스트 실패:', error.message);
    return false;
  } finally {
    client.release();
  }
}

async function testPhase2API() {
  console.log('\n🔍 Phase 2: API 엔드포인트 테스트');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  const baseURL = 'https://mobile-app-new.onrender.com/api';
  
  try {
    // 1. API 문서 확인
    console.log('1️⃣ API 문서 확인...');
    const apiDocResponse = await fetch(`${baseURL}`);
    const apiDoc = await apiDocResponse.json();
    
    if (apiDoc.endpoints && apiDoc.endpoints.inspections) {
      console.log('✅ 새로운 inspections 엔드포인트 확인됨');
      console.log(`   버전: ${apiDoc.version}`);
    } else {
      console.log('❌ inspections 엔드포인트 누락');
      return false;
    }
    
    // 2. 로그인하여 토큰 획득
    console.log('\n2️⃣ 로그인 테스트...');
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
    
    if (!token) {
      console.log('❌ 로그인 실패');
      return false;
    }
    
    console.log('✅ 로그인 성공:', token.substring(0, 20) + '...');
    
    // 3. 케이스 생성 (장비점검 타입)
    console.log('\n3️⃣ 장비점검 케이스 생성...');
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
    
    if (!caseId) {
      console.log('❌ 케이스 생성 실패');
      return false;
    }
    
    console.log('✅ 케이스 생성 성공:', caseId);
    
    // 4. 공기질 측정 등록
    console.log('\n4️⃣ 공기질 측정 등록...');
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
        note: '종합 테스트 공기질 측정',
        result: 'normal'
      })
    });
    
    const airData = await airResponse.json();
    
    if (airResponse.status === 201 && airData.success) {
      console.log('✅ 공기질 측정 등록 성공:', airData.item.id);
    } else {
      console.log('❌ 공기질 측정 등록 실패:', airData.error);
      return false;
    }
    
    // 5. 라돈 측정 등록
    console.log('\n5️⃣ 라돈 측정 등록...');
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
        note: '종합 테스트 라돈 측정',
        result: 'normal'
      })
    });
    
    const radonData = await radonResponse.json();
    
    if (radonResponse.status === 201 && radonData.success) {
      console.log('✅ 라돈 측정 등록 성공:', radonData.item.id);
    } else {
      console.log('❌ 라돈 측정 등록 실패:', radonData.error);
      return false;
    }
    
    // 6. 레벨기 측정 등록
    console.log('\n6️⃣ 레벨기 측정 등록...');
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
        note: '종합 테스트 레벨기 측정',
        result: 'normal'
      })
    });
    
    const levelData = await levelResponse.json();
    
    if (levelResponse.status === 201 && levelData.success) {
      console.log('✅ 레벨기 측정 등록 성공:', levelData.item.id);
    } else {
      console.log('❌ 레벨기 측정 등록 실패:', levelData.error);
      return false;
    }
    
    // 7. 열화상 점검 항목 생성
    console.log('\n7️⃣ 열화상 점검 항목 생성...');
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
        note: '종합 테스트 열화상 점검',
        result: 'normal'
      })
    });
    
    const thermalData = await thermalResponse.json();
    
    if (thermalResponse.status === 201 && thermalData.success) {
      console.log('✅ 열화상 점검 항목 생성 성공:', thermalData.item.id);
    } else {
      console.log('❌ 열화상 점검 항목 생성 실패:', thermalData.error);
      return false;
    }
    
    // 8. 케이스별 점검 항목 조회
    console.log('\n8️⃣ 케이스별 점검 항목 조회...');
    const inspectionsResponse = await fetch(`${baseURL}/inspections/${caseId}`, {
      headers: { 
        'Authorization': `Bearer ${token}`
      }
    });
    
    const inspectionsData = await inspectionsResponse.json();
    
    if (inspectionsResponse.status === 200 && inspectionsData.success) {
      console.log('✅ 점검 항목 조회 성공:');
      console.log('   - 총 항목 수:', inspectionsData.total);
      console.log('   - 공기질:', inspectionsData.inspections.air?.length || 0, '건');
      console.log('   - 라돈:', inspectionsData.inspections.radon?.length || 0, '건');
      console.log('   - 레벨기:', inspectionsData.inspections.level?.length || 0, '건');
      console.log('   - 열화상:', inspectionsData.inspections.thermal?.length || 0, '건');
    } else {
      console.log('❌ 점검 항목 조회 실패:', inspectionsData.error);
      return false;
    }
    
    // 9. 입력 검증 테스트
    console.log('\n9️⃣ 입력 검증 테스트...');
    
    // 잘못된 TVOC 값 (범위 초과)
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
    
    // 잘못된 레벨기 값 (좌측만 입력)
    const invalidLevelResponse = await fetch(`${baseURL}/inspections/level`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        caseId: caseId,
        location: '테스트',
        left_mm: 2.5,
        right_mm: null, // 우측 미입력
        note: '검증 테스트'
      })
    });
    
    const invalidLevelData = await invalidLevelResponse.json();
    
    if (invalidLevelResponse.status === 400) {
      console.log('✅ 레벨기 좌/우 필수 검증 성공:', invalidLevelData.error);
    } else {
      console.log('❌ 레벨기 좌/우 필수 검증 실패');
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Phase 2 테스트 실패:', error.message);
    return false;
  }
}

async function testPhase3Frontend() {
  console.log('\n🔍 Phase 3: 프론트엔드 UI 테스트');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  try {
    // 1. 메인 앱 접속 테스트
    console.log('1️⃣ 메인 앱 접속 테스트...');
    const mainAppResponse = await fetch('https://insighti.vercel.app/');
    
    if (mainAppResponse.status === 200) {
      console.log('✅ 메인 앱 접속 성공');
    } else {
      console.log('❌ 메인 앱 접속 실패:', mainAppResponse.status);
      return false;
    }
    
    // 2. Admin 페이지 접속 테스트
    console.log('\n2️⃣ Admin 페이지 접속 테스트...');
    const adminResponse = await fetch('https://insighti.vercel.app/admin.html');
    
    if (adminResponse.status === 200) {
      console.log('✅ Admin 페이지 접속 성공');
    } else {
      console.log('❌ Admin 페이지 접속 실패:', adminResponse.status);
      return false;
    }
    
    // 3. Admin 로그인 테스트
    console.log('\n3️⃣ Admin 로그인 테스트...');
    const adminLoginResponse = await fetch('https://mobile-app-new.onrender.com/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@insighti.com',
        password: 'admin123'
      })
    });
    
    const adminLoginData = await adminLoginResponse.json();
    
    if (adminLoginResponse.status === 200 && adminLoginData.token) {
      console.log('✅ Admin 로그인 성공');
      console.log('   역할:', adminLoginData.admin.role);
      console.log('   이름:', adminLoginData.admin.name);
    } else {
      console.log('❌ Admin 로그인 실패:', adminLoginData.error);
      return false;
    }
    
    // 4. 기존 하자 관리 기능 테스트
    console.log('\n4️⃣ 기존 하자 관리 기능 테스트...');
    
    // 하자 카테고리 조회
    const categoriesResponse = await fetch('https://mobile-app-new.onrender.com/api/defect-categories');
    const categoriesData = await categoriesResponse.json();
    
    if (categoriesResponse.status === 200 && categoriesData.length > 0) {
      console.log('✅ 하자 카테고리 조회 성공:', categoriesData.length, '개 카테고리');
    } else {
      console.log('❌ 하자 카테고리 조회 실패');
      return false;
    }
    
    // 5. AI 기능 테스트
    console.log('\n5️⃣ AI 기능 테스트...');
    const aiStatusResponse = await fetch('https://mobile-app-new.onrender.com/api/azure-ai/status');
    const aiStatusData = await aiStatusResponse.json();
    
    if (aiStatusResponse.status === 200) {
      console.log('✅ AI 서비스 상태 확인 성공');
      console.log('   상태:', aiStatusData.status);
    } else {
      console.log('⚠️ AI 서비스 상태 확인 실패 (선택적 기능)');
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Phase 3 테스트 실패:', error.message);
    return false;
  }
}

async function testIntegration() {
  console.log('\n🔍 통합 테스트');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  const client = await pool.connect();
  try {
    // 1. 데이터 일관성 테스트
    console.log('1️⃣ 데이터 일관성 테스트...');
    
    const consistencyTest = await client.query(`
      SELECT 
        c.id as case_id,
        c.type as case_type,
        COUNT(ii.id) as inspection_count,
        COUNT(d.id) as defect_count
      FROM case_header c
      LEFT JOIN inspection_item ii ON c.id = ii.case_id
      LEFT JOIN defect d ON c.id = d.case_id
      WHERE c.type = '장비점검'
      GROUP BY c.id, c.type
      ORDER BY c.created_at DESC
      LIMIT 5
    `);
    
    console.log('📊 장비점검 케이스별 데이터 통계:');
    consistencyTest.rows.forEach((row, index) => {
      console.log(`  ${index + 1}. 케이스 ${row.case_id}:`);
      console.log(`     - 점검 항목: ${row.inspection_count}개`);
      console.log(`     - 하자 항목: ${row.defect_count}개`);
    });
    
    // 2. 사용자 역할 테스트
    console.log('\n2️⃣ 사용자 역할 테스트...');
    
    const userRoles = await client.query(`
      SELECT user_type, COUNT(*) as count
      FROM household
      GROUP BY user_type
    `);
    
    console.log('📊 사용자 역할 분포:');
    userRoles.rows.forEach(row => {
      console.log(`  - ${row.user_type}: ${row.count}명`);
    });
    
    // 3. 성능 테스트
    console.log('\n3️⃣ 성능 테스트...');
    
    const startTime = Date.now();
    await client.query(`
      SELECT 
        ii.*,
        am.tvoc, am.hcho, am.co2,
        rm.radon, rm.unit_radon,
        lm.left_mm, lm.right_mm
      FROM inspection_item ii
      LEFT JOIN air_measure am ON ii.id = am.item_id
      LEFT JOIN radon_measure rm ON ii.id = rm.item_id
      LEFT JOIN level_measure lm ON ii.id = lm.item_id
      WHERE ii.created_at > NOW() - INTERVAL '1 day'
      ORDER BY ii.created_at DESC
      LIMIT 100
    `);
    const endTime = Date.now();
    
    console.log(`✅ 복합 조회 성능: ${endTime - startTime}ms`);
    
    return true;
    
  } catch (error) {
    console.error('❌ 통합 테스트 실패:', error.message);
    return false;
  } finally {
    client.release();
  }
}

// 메인 실행 함수
async function runComprehensiveTest() {
  console.log('🧪 Phase 1-3 종합 테스트 시작');
  console.log('='.repeat(50));
  
  const results = {
    phase1: false,
    phase2: false,
    phase3: false,
    integration: false
  };
  
  try {
    // Phase 1 테스트
    results.phase1 = await testPhase1Database();
    
    // Phase 2 테스트
    results.phase2 = await testPhase2API();
    
    // Phase 3 테스트
    results.phase3 = await testPhase3Frontend();
    
    // 통합 테스트
    results.integration = await testIntegration();
    
    // 결과 요약
    console.log('\n' + '='.repeat(50));
    console.log('📊 테스트 결과 요약');
    console.log('='.repeat(50));
    
    console.log(`Phase 1 (데이터베이스): ${results.phase1 ? '✅ 통과' : '❌ 실패'}`);
    console.log(`Phase 2 (API 엔드포인트): ${results.phase2 ? '✅ 통과' : '❌ 실패'}`);
    console.log(`Phase 3 (프론트엔드): ${results.phase3 ? '✅ 통과' : '❌ 실패'}`);
    console.log(`통합 테스트: ${results.integration ? '✅ 통과' : '❌ 실패'}`);
    
    const totalPassed = Object.values(results).filter(Boolean).length;
    const totalTests = Object.keys(results).length;
    
    console.log(`\n🎯 전체 결과: ${totalPassed}/${totalTests} 통과`);
    
    if (totalPassed === totalTests) {
      console.log('🎉 모든 테스트 통과! Phase 1-3 구현이 완료되었습니다.');
    } else {
      console.log('⚠️ 일부 테스트 실패. 문제를 확인하고 수정이 필요합니다.');
    }
    
  } catch (error) {
    console.error('❌ 테스트 실행 중 오류 발생:', error.message);
  } finally {
    await pool.end();
  }
}

// 테스트 실행
runComprehensiveTest().catch(console.error);
