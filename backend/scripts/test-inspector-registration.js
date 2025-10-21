// 점검원 등록 시스템 테스트 스크립트
const { Pool } = require('pg');

// Render PostgreSQL 연결
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://insighti_user:2eq3v151vjtJ2wUz4PUUQ2VHhlTbjWRy@dpg-d3kardu3jp1c73b2dkrg-a.singapore-postgres.render.com/insighti_db_yckk';

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// API 테스트 함수들
async function testInspectorRegistrationAPI() {
  console.log('🔍 점검원 등록 시스템 테스트');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  const baseURL = 'https://mobile-app-new.onrender.com/api';
  
  try {
    // 1. 점검원 등록 신청 테스트
    console.log('1️⃣ 점검원 등록 신청 테스트...');
    const registrationResponse = await fetch(`${baseURL}/inspector-registration/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        complex: '서울 인싸이트자이',
        dong: '106',
        ho: '1210',
        inspector_name: '한점검',
        phone: '010-1111-1111',
        company_name: '테스트 점검회사4',
        license_number: 'TEST000',
        email: 'han@test.com',
        registration_reason: '테스트용 점검원 등록 신청입니다 (네 번째).'
      })
    });
    
    const registrationData = await registrationResponse.json();
    
    if (registrationResponse.status === 201 && registrationData.success) {
      console.log('✅ 점검원 등록 신청 성공');
      console.log('   등록 ID:', registrationData.registration.id);
      console.log('   상태:', registrationData.registration.status);
      
      const registrationId = registrationData.registration.id;
      
      // 2. 등록 상태 조회 테스트
      console.log('\n2️⃣ 등록 상태 조회 테스트...');
      const statusResponse = await fetch(`${baseURL}/inspector-registration/status/${registrationId}`);
      const statusData = await statusResponse.json();
      
      if (statusResponse.status === 200 && statusData.success) {
        console.log('✅ 등록 상태 조회 성공');
        console.log('   점검원명:', statusData.registration.inspector_name);
        console.log('   상태:', statusData.registration.status);
      } else {
        console.log('❌ 등록 상태 조회 실패:', statusData.error);
        return false;
      }
      
      // 3. Admin 로그인 테스트
      console.log('\n3️⃣ Admin 로그인 테스트...');
      const adminLoginResponse = await fetch(`${baseURL}/admin/login`, {
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
        const adminToken = adminLoginData.token;
        
        // 4. 관리자 등록 목록 조회 테스트
        console.log('\n4️⃣ 관리자 등록 목록 조회 테스트...');
        const adminListResponse = await fetch(`${baseURL}/inspector-registration/admin/pending`, {
          headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        
        const adminListData = await adminListResponse.json();
        
        if (adminListResponse.status === 200 && adminListData.success) {
          console.log('✅ 관리자 등록 목록 조회 성공');
          console.log('   전체 신청:', adminListData.total);
          console.log('   승인 대기:', adminListData.pending);
          console.log('   승인 완료:', adminListData.approved);
          console.log('   승인 거부:', adminListData.rejected);
        } else {
          console.log('❌ 관리자 등록 목록 조회 실패:', adminListData.error);
          return false;
        }
        
        // 5. 점검원 승인 테스트
        console.log('\n5️⃣ 점검원 승인 테스트...');
        const approvalResponse = await fetch(`${baseURL}/inspector-registration/admin/${registrationId}/approve`, {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`
          },
          body: JSON.stringify({
            approved: true
          })
        });
        
        const approvalData = await approvalResponse.json();
        
        if (approvalResponse.status === 200 && approvalData.success) {
          console.log('✅ 점검원 승인 성공');
          console.log('   처리 결과:', approvalData.message);
        } else {
          console.log('❌ 점검원 승인 실패:', approvalData.error);
          return false;
        }
        
        // 6. 승인 후 상태 확인
        console.log('\n6️⃣ 승인 후 상태 확인...');
        const finalStatusResponse = await fetch(`${baseURL}/inspector-registration/status/${registrationId}`);
        const finalStatusData = await finalStatusResponse.json();
        
        if (finalStatusResponse.status === 200 && finalStatusData.success) {
          console.log('✅ 승인 후 상태 확인 성공');
          console.log('   최종 상태:', finalStatusData.registration.status);
          console.log('   처리일:', finalStatusData.registration.approved_at);
        } else {
          console.log('❌ 승인 후 상태 확인 실패:', finalStatusData.error);
          return false;
        }
        
      } else {
        console.log('❌ Admin 로그인 실패:', adminLoginData.error);
        return false;
      }
      
    } else {
      console.log('❌ 점검원 등록 신청 실패:', registrationData.error);
      return false;
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ 점검원 등록 시스템 테스트 실패:', error.message);
    return false;
  }
}

async function testDatabaseSchema() {
  console.log('\n🔍 데이터베이스 스키마 테스트');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  const client = await pool.connect();
  try {
    // 1. inspector_registration 테이블 확인
    const tableCheck = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'inspector_registration'
    `);
    
    if (tableCheck.rows.length > 0) {
      console.log('✅ inspector_registration 테이블 존재 확인');
    } else {
      console.log('❌ inspector_registration 테이블 없음');
      return false;
    }
    
    // 2. 테이블 구조 확인
    const columnsCheck = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'inspector_registration'
      ORDER BY ordinal_position
    `);
    
    console.log('📊 테이블 구조:');
    columnsCheck.rows.forEach(row => {
      console.log(`   - ${row.column_name}: ${row.data_type} ${row.is_nullable === 'NO' ? '(NOT NULL)' : ''}`);
    });
    
    // 3. 샘플 데이터 확인
    const sampleData = await client.query(`
      SELECT id, inspector_name, status, created_at
      FROM inspector_registration
      ORDER BY created_at DESC
      LIMIT 5
    `);
    
    console.log('\n📊 최근 등록 신청:');
    sampleData.rows.forEach((row, index) => {
      console.log(`   ${index + 1}. #${row.id} ${row.inspector_name} - ${row.status}`);
    });
    
    // 4. 인덱스 확인
    const indexesCheck = await client.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'inspector_registration'
    `);
    
    console.log('\n📊 인덱스:');
    indexesCheck.rows.forEach(row => {
      console.log(`   - ${row.indexname}`);
    });
    
    return true;
    
  } catch (error) {
    console.error('❌ 데이터베이스 스키마 테스트 실패:', error.message);
    return false;
  } finally {
    client.release();
  }
}

// 메인 실행 함수
async function runInspectorRegistrationTest() {
  console.log('🧪 점검원 등록 시스템 테스트 시작');
  console.log('='.repeat(50));
  
  const results = {
    api: false,
    database: false
  };
  
  try {
    // API 테스트
    results.api = await testInspectorRegistrationAPI();
    
    // 데이터베이스 테스트
    results.database = await testDatabaseSchema();
    
    // 결과 요약
    console.log('\n' + '='.repeat(50));
    console.log('📊 테스트 결과 요약');
    console.log('='.repeat(50));
    
    console.log(`API 테스트: ${results.api ? '✅ 통과' : '❌ 실패'}`);
    console.log(`데이터베이스 테스트: ${results.database ? '✅ 통과' : '❌ 실패'}`);
    
    const totalPassed = Object.values(results).filter(Boolean).length;
    const totalTests = Object.keys(results).length;
    
    console.log(`\n🎯 전체 결과: ${totalPassed}/${totalTests} 통과`);
    
    if (totalPassed === totalTests) {
      console.log('🎉 모든 테스트 통과! 점검원 등록 시스템이 정상 작동합니다.');
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
runInspectorRegistrationTest().catch(console.error);
