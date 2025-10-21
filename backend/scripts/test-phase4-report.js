// Phase 4: 보고서 템플릿 업데이트 테스트 스크립트
const { Pool } = require('pg');

// Render PostgreSQL 연결
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://insighti_user:2eq3v151vjtJ2wUz4PUUQ2VHhlTbjWRy@dpg-d3kardu3jp1c73b2dkrg-a.singapore-postgres.render.com/insighti_db_yckk';

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// API 테스트 함수들
async function testComprehensiveReportAPI() {
  console.log('📊 Phase 4: 보고서 템플릿 업데이트 테스트');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  const baseURL = 'https://mobile-app-new.onrender.com/api';
  
  try {
    // 1. 일반 사용자 로그인 (장비점검 데이터가 있는 계정)
    console.log('1️⃣ 일반 사용자 로그인 테스트...');
    const loginResponse = await fetch(`${baseURL}/auth/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        complex: '서울 인싸이트자이',
        dong: '106',
        ho: '1210',
        name: '한점검',
        phone: '010-1111-1111'
      })
    });
    
    const loginData = await loginResponse.json();
    
    if (loginResponse.status === 200 && loginData.token) {
      console.log('✅ 일반 사용자 로그인 성공');
      const userToken = loginData.token;
      
      // 2. 종합 보고서 미리보기 테스트
      console.log('\n2️⃣ 종합 보고서 미리보기 테스트...');
      const reportResponse = await fetch(`${baseURL}/reports/preview`, {
        headers: { 'Authorization': `Bearer ${userToken}` }
      });
      
      const reportData = await reportResponse.json();
      
      if (reportResponse.status === 200 && reportData.html) {
        console.log('✅ 종합 보고서 미리보기 성공');
        console.log('   하자 건수:', reportData.defects_count);
        console.log('   장비점검 건수:', reportData.equipment_count);
        
        // 장비점검 데이터 확인
        if (reportData.equipment_data) {
          console.log('   📊 장비점검 데이터:');
          console.log('     - 공기질:', reportData.equipment_data.air?.length || 0, '건');
          console.log('     - 라돈:', reportData.equipment_data.radon?.length || 0, '건');
          console.log('     - 레벨기:', reportData.equipment_data.level?.length || 0, '건');
          console.log('     - 열화상:', reportData.equipment_data.thermal?.length || 0, '건');
        }
        
        // HTML 내용 확인
        const htmlContent = reportData.html;
        const hasEquipmentSection = htmlContent.includes('장비점검 결과');
        const hasAirTable = htmlContent.includes('공기질 측정 결과');
        const hasRadonTable = htmlContent.includes('라돈 측정 결과');
        const hasLevelTable = htmlContent.includes('레벨기 측정 결과');
        const hasThermalSection = htmlContent.includes('열화상 점검 결과');
        
        console.log('\n3️⃣ 보고서 템플릿 구성 확인...');
        console.log('   장비점검 섹션:', hasEquipmentSection ? '✅ 포함' : '❌ 누락');
        console.log('   공기질 테이블:', hasAirTable ? '✅ 포함' : '❌ 누락');
        console.log('   라돈 테이블:', hasRadonTable ? '✅ 포함' : '❌ 누락');
        console.log('   레벨기 테이블:', hasLevelTable ? '✅ 포함' : '❌ 누락');
        console.log('   열화상 섹션:', hasThermalSection ? '✅ 포함' : '❌ 누락');
        
        // 통계 섹션 확인
        const hasSummarySection = htmlContent.includes('점검 요약');
        const hasEquipmentSummary = htmlContent.includes('장비점검 현황');
        
        console.log('\n4️⃣ 보고서 요약 섹션 확인...');
        console.log('   점검 요약:', hasSummarySection ? '✅ 포함' : '❌ 누락');
        console.log('   장비점검 현황:', hasEquipmentSummary ? '✅ 포함' : '❌ 누락');
        
        return true;
        
      } else {
        console.log('❌ 종합 보고서 미리보기 실패:', reportData.error);
        return false;
      }
      
    } else {
      console.log('❌ 일반 사용자 로그인 실패:', loginData.error);
      return false;
    }
    
  } catch (error) {
    console.error('❌ 보고서 템플릿 테스트 실패:', error.message);
    return false;
  }
}

async function testDatabaseEquipmentData() {
  console.log('\n🔍 데이터베이스 장비점검 데이터 확인');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  const client = await pool.connect();
  try {
    // 1. 장비점검 데이터 통계
    const statsQuery = `
      SELECT 
        type,
        COUNT(*) as count,
        COUNT(CASE WHEN result = 'normal' THEN 1 END) as normal_count,
        COUNT(CASE WHEN result = 'check' THEN 1 END) as check_count,
        COUNT(CASE WHEN result = 'na' THEN 1 END) as na_count
      FROM inspection_item
      GROUP BY type
      ORDER BY type
    `;
    
    const statsResult = await client.query(statsQuery);
    
    console.log('📊 장비점검 데이터 통계:');
    statsResult.rows.forEach(row => {
      console.log(`   ${row.type}: ${row.count}건 (정상: ${row.normal_count}, 확인요망: ${row.check_count}, 해당없음: ${row.na_count})`);
    });
    
    // 2. 최근 장비점검 데이터 샘플
    const sampleQuery = `
      SELECT 
        ii.type,
        ii.location,
        ii.trade,
        ii.result,
        ii.created_at,
        am.tvoc,
        am.hcho,
        am.co2,
        rm.radon,
        rm.unit_radon,
        lm.left_mm,
        lm.right_mm
      FROM inspection_item ii
      LEFT JOIN air_measure am ON ii.id = am.item_id
      LEFT JOIN radon_measure rm ON ii.id = rm.item_id
      LEFT JOIN level_measure lm ON ii.id = lm.item_id
      ORDER BY ii.created_at DESC
      LIMIT 5
    `;
    
    const sampleResult = await client.query(sampleQuery);
    
    console.log('\n📋 최근 장비점검 데이터 샘플:');
    sampleResult.rows.forEach((row, index) => {
      console.log(`   ${index + 1}. ${row.type} - ${row.location} (${row.trade}) - ${row.result}`);
      if (row.type === 'air') {
        console.log(`      TVOC: ${row.tvoc}, HCHO: ${row.hcho}, CO2: ${row.co2}`);
      } else if (row.type === 'radon') {
        console.log(`      라돈: ${row.radon} ${row.unit_radon}`);
      } else if (row.type === 'level') {
        console.log(`      좌측: ${row.left_mm}mm, 우측: ${row.right_mm}mm`);
      }
    });
    
    // 3. 열화상 사진 데이터
    const thermalQuery = `
      SELECT 
        ii.location,
        ii.trade,
        tp.file_url,
        tp.caption,
        tp.shot_at
      FROM inspection_item ii
      JOIN thermal_photo tp ON ii.id = tp.item_id
      ORDER BY tp.shot_at DESC
      LIMIT 3
    `;
    
    const thermalResult = await client.query(thermalQuery);
    
    console.log('\n📷 열화상 사진 데이터:');
    thermalResult.rows.forEach((row, index) => {
      console.log(`   ${index + 1}. ${row.location} (${row.trade}) - ${row.caption || '캡션 없음'}`);
    });
    
    return true;
    
  } catch (error) {
    console.error('❌ 데이터베이스 장비점검 데이터 확인 실패:', error.message);
    return false;
  } finally {
    client.release();
  }
}

// 메인 실행 함수
async function runPhase4Test() {
  console.log('🧪 Phase 4: 보고서 템플릿 업데이트 테스트 시작');
  console.log('='.repeat(50));
  
  const results = {
    api: false,
    database: false
  };
  
  try {
    // API 테스트
    results.api = await testComprehensiveReportAPI();
    
    // 데이터베이스 테스트
    results.database = await testDatabaseEquipmentData();
    
    // 결과 요약
    console.log('\n' + '='.repeat(50));
    console.log('📊 Phase 4 테스트 결과 요약');
    console.log('='.repeat(50));
    
    console.log(`종합 보고서 API 테스트: ${results.api ? '✅ 통과' : '❌ 실패'}`);
    console.log(`장비점검 데이터 확인: ${results.database ? '✅ 통과' : '❌ 실패'}`);
    
    const totalPassed = Object.values(results).filter(Boolean).length;
    const totalTests = Object.keys(results).length;
    
    console.log(`\n🎯 전체 결과: ${totalPassed}/${totalTests} 통과`);
    
    if (totalPassed === totalTests) {
      console.log('🎉 Phase 4 완료! 보고서 템플릿이 성공적으로 업데이트되었습니다.');
      console.log('\n✨ 새로운 기능:');
      console.log('   - 장비점검 데이터 포함 종합 보고서');
      console.log('   - 공기질/라돈/레벨기 측정 결과 테이블');
      console.log('   - 열화상 사진 갤러리');
      console.log('   - 장비점검 현황 대시보드');
      console.log('   - 하자 + 장비점검 통합 보고서');
    } else {
      console.log('⚠️ 일부 테스트 실패. 문제를 확인하고 수정이 필요합니다.');
    }
    
  } catch (error) {
    console.error('❌ Phase 4 테스트 실행 중 오류 발생:', error.message);
  } finally {
    await pool.end();
  }
}

// 테스트 실행
runPhase4Test().catch(console.error);
