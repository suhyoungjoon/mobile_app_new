/**
 * PDF 보고서 테스트 - 하자 및 측정 데이터 포함
 * - 하자가 있는 케이스 찾기
 * - 측정 데이터 확인 및 등록
 * - 측정 데이터가 포함된 PDF 생성 테스트
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const config = {
  backendUrl: process.env.BACKEND_URL || 'https://mobile-app-new.onrender.com',
  frontendUrl: process.env.FRONTEND_URL || 'https://insighti.vercel.app',
  testUser: {
    complex: '테스트 단지',
    dong: '101',
    ho: '1203',
    name: '홍길동',
    phone: '010-1234-5678'
  }
};

let authToken = null;

// 세션 생성 (로그인)
async function login() {
  console.log('🔐 세션 생성 중...');
  try {
    const response = await axios.post(`${config.backendUrl}/api/auth/session`, {
      complex: config.testUser.complex,
      dong: config.testUser.dong,
      ho: config.testUser.ho,
      name: config.testUser.name,
      phone: config.testUser.phone
    });
    
    if (response.data.token) {
      authToken = response.data.token;
      console.log('✅ 세션 생성 성공');
      console.log(`   사용자: ${config.testUser.dong}동 ${config.testUser.ho}호 ${config.testUser.name}`);
      return true;
    } else {
      console.error('❌ 세션 생성 실패: 토큰을 받지 못했습니다');
      return false;
    }
  } catch (error) {
    console.error('❌ 세션 생성 실패:', error.response?.data || error.message);
    return false;
  }
}

// 케이스 목록 조회
async function getCases() {
  console.log('\n📋 케이스 목록 조회 중...');
  try {
    const response = await axios.get(`${config.backendUrl}/api/cases`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    if (response.data && response.data.length > 0) {
      console.log(`✅ 케이스 ${response.data.length}개 발견`);
      return response.data;
    } else {
      console.log('⚠️  케이스가 없습니다');
      return [];
    }
  } catch (error) {
    console.error('❌ 케이스 조회 실패:', error.response?.data || error.message);
    return [];
  }
}

// 하자 목록 조회
async function getDefects(caseId) {
  try {
    const response = await axios.get(`${config.backendUrl}/api/defects?case_id=${caseId}`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    return response.data || [];
  } catch (error) {
    console.error('❌ 하자 조회 실패:', error.response?.data || error.message);
    return [];
  }
}

// 측정 데이터 조회
async function getInspectionItems(caseId) {
  console.log(`\n🔍 케이스 ${caseId}의 측정 데이터 조회 중...`);
  try {
    const response = await axios.get(`${config.backendUrl}/api/inspections/${caseId}`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    if (response.data && response.data.inspections) {
      const inspections = response.data.inspections;
      const total = Object.values(inspections).reduce((sum, items) => sum + items.length, 0);
      console.log(`✅ 측정 데이터 ${total}개 발견`);
      
      // 타입별 개수 출력
      Object.keys(inspections).forEach(type => {
        if (inspections[type].length > 0) {
          const typeNames = {
            'air': '공기질 측정',
            'radon': '라돈 측정',
            'level': '레벨기 측정',
            'thermal': '열화상 점검'
          };
          console.log(`   - ${typeNames[type] || type}: ${inspections[type].length}개`);
        }
      });
      
      return inspections;
    } else {
      console.log('⚠️  측정 데이터가 없습니다');
      return {};
    }
  } catch (error) {
    console.error('❌ 측정 데이터 조회 실패:', error.response?.data || error.message);
    return {};
  }
}

// 측정 데이터 등록 (공통)
async function createInspectionItem(endpoint, caseId, data) {
  try {
    const response = await axios.post(
      `${config.backendUrl}/api/inspections/${endpoint}`,
      {
        caseId: caseId,
        ...data
      },
      {
        headers: { 
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    return response.data;
  } catch (error) {
    console.error(`❌ ${endpoint} 측정 데이터 등록 실패:`, error.response?.data || error.message);
    return null;
  }
}

// 측정 데이터 등록 (공기질)
async function createAirMeasurement(caseId) {
  console.log(`\n📊 공기질 측정 데이터 등록 중...`);
  const result = await createInspectionItem('air', caseId, {
    location: '거실',
    trade: '공기질',
    note: '테스트 측정',
    result: 'normal',
    tvoc: 0.5,
    hcho: 0.08,
    co2: 450,
    unit_tvoc: 'mg/m³',
    unit_hcho: 'mg/m³'
  });
  
  if (result && result.success) {
    console.log('✅ 공기질 측정 데이터 등록 성공');
    return true;
  } else {
    console.log('⚠️  공기질 측정 데이터 등록 실패');
    return false;
  }
}

// 측정 데이터 등록 (라돈)
async function createRadonMeasurement(caseId) {
  console.log(`\n📊 라돈 측정 데이터 등록 중...`);
  const result = await createInspectionItem('radon', caseId, {
    location: '침실',
    trade: '라돈',
    note: '테스트 측정',
    result: 'normal',
    radon: 50,
    unit_radon: 'Bq/m³'
  });
  
  if (result && result.success) {
    console.log('✅ 라돈 측정 데이터 등록 성공');
    return true;
  } else {
    console.log('⚠️  라돈 측정 데이터 등록 실패');
    return false;
  }
}

// 측정 데이터 등록 (레벨기)
async function createLevelMeasurement(caseId) {
  console.log(`\n📊 레벨기 측정 데이터 등록 중...`);
  const result = await createInspectionItem('level', caseId, {
    location: '거실 바닥',
    trade: '레벨기',
    note: '테스트 측정',
    result: 'normal',
    left_mm: 2.5,
    right_mm: 2.3
  });
  
  if (result && result.success) {
    console.log('✅ 레벨기 측정 데이터 등록 성공');
    return true;
  } else {
    console.log('⚠️  레벨기 측정 데이터 등록 실패');
    return false;
  }
}

// 측정 데이터 등록 (열화상)
async function createThermalInspection(caseId) {
  console.log(`\n📊 열화상 점검 데이터 등록 중...`);
  const result = await createInspectionItem('thermal', caseId, {
    location: '외벽',
    trade: '열화상',
    note: '테스트 점검',
    result: 'normal'
  });
  
  if (result && result.success) {
    console.log('✅ 열화상 점검 데이터 등록 성공');
    return true;
  } else {
    console.log('⚠️  열화상 점검 데이터 등록 실패');
    return false;
  }
}

// PDF 생성 테스트
async function testPDFGeneration(caseId) {
  console.log(`\n📝 PDF 생성 테스트 중...`);
  try {
    const response = await axios.post(
      `${config.backendUrl}/api/reports/generate`,
      { case_id: caseId },
      {
        headers: { 
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 60000
      }
    );
    
    if (response.data.success && response.data.filename) {
      console.log('✅ PDF 생성 성공');
      console.log(`   파일명: ${response.data.filename}`);
      console.log(`   크기: ${(response.data.size / 1024).toFixed(2)} KB`);
      console.log(`   URL: ${response.data.url}`);
      return response.data;
    } else {
      console.error('❌ PDF 생성 실패: 응답 데이터가 올바르지 않습니다');
      return null;
    }
  } catch (error) {
    console.error('❌ PDF 생성 실패:', error.response?.data || error.message);
    if (error.response) {
      console.error('   상태 코드:', error.response.status);
      console.error('   응답 데이터:', JSON.stringify(error.response.data, null, 2));
    }
    return null;
  }
}

// PDF 다운로드
async function downloadPDF(filename) {
  console.log(`\n📥 PDF 다운로드 중: ${filename}`);
  try {
    const response = await axios.get(
      `${config.backendUrl}/api/reports/download/${filename}`,
      {
        headers: { 'Authorization': `Bearer ${authToken}` },
        responseType: 'arraybuffer',
        timeout: 30000
      }
    );
    
    if (response.status === 200 && response.data) {
      const outputDir = path.join(__dirname, '..', 'reports');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      const filePath = path.join(outputDir, filename);
      fs.writeFileSync(filePath, Buffer.from(response.data));
      
      const stats = fs.statSync(filePath);
      console.log('✅ PDF 다운로드 완료');
      console.log(`   저장 위치: ${filePath}`);
      console.log(`   파일 크기: ${(stats.size / 1024).toFixed(2)} KB`);
      return filePath;
    } else {
      console.error('❌ PDF 다운로드 실패');
      return null;
    }
  } catch (error) {
    console.error('❌ PDF 다운로드 실패:', error.response?.status || error.message);
    return null;
  }
}

// 메인 테스트 함수
async function runTests() {
  console.log('🚀 PDF 보고서 테스트 시작 (하자 + 측정 데이터 포함)\n');
  console.log(`백엔드 URL: ${config.backendUrl}`);
  console.log(`프론트엔드 URL: ${config.frontendUrl}\n`);
  
  // 1. 로그인
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.error('\n❌ 로그인 실패로 테스트를 중단합니다.');
    process.exit(1);
  }
  
  // 2. 케이스 목록 조회
  const cases = await getCases();
  if (cases.length === 0) {
    console.log('\n⚠️  케이스가 없어서 테스트를 진행할 수 없습니다.');
    process.exit(0);
  }
  
  // 3. 하자가 있는 케이스 찾기
  let testCase = null;
  let caseId = null;
  let defects = [];
  
  console.log('\n🔍 하자가 있는 케이스 찾는 중...');
  for (const caseItem of cases) {
    const caseDefects = await getDefects(caseItem.id);
    if (caseDefects.length > 0) {
      testCase = caseItem;
      caseId = caseItem.id;
      defects = caseDefects;
      console.log(`✅ 하자가 있는 케이스 발견: ${caseId} (하자 ${defects.length}개)`);
      break;
    }
  }
  
  if (!testCase || defects.length === 0) {
    console.log('\n⚠️  하자가 있는 케이스가 없어서 테스트를 진행할 수 없습니다.');
    process.exit(0);
  }
  
  console.log(`\n📌 테스트 케이스: ${caseId}`);
  console.log(`📊 하자 상태: 하자 ${defects.length}개`);
  
  // 4. 측정 데이터 확인
  let inspections = await getInspectionItems(caseId);
  const totalMeasurements = Object.values(inspections).reduce((sum, items) => sum + items.length, 0);
  
  // 5. 측정 데이터가 없으면 등록
  if (totalMeasurements === 0) {
    console.log('\n⚠️  측정 데이터가 없습니다. 테스트용 측정 데이터를 등록합니다...');
    
    await createAirMeasurement(caseId);
    await createRadonMeasurement(caseId);
    await createLevelMeasurement(caseId);
    await createThermalInspection(caseId);
    
    // 등록 후 다시 조회
    console.log('\n⏳ 측정 데이터 등록 후 재조회 중...');
    await new Promise(resolve => setTimeout(resolve, 2000)); // 2초 대기
    inspections = await getInspectionItems(caseId);
  }
  
  const finalTotal = Object.values(inspections).reduce((sum, items) => sum + items.length, 0);
  console.log(`\n📊 최종 측정 데이터: ${finalTotal}개`);
  
  // 6. PDF 생성 테스트
  const pdfResult = await testPDFGeneration(caseId);
  if (!pdfResult) {
    console.log('\n❌ PDF 생성 실패로 테스트를 중단합니다.');
    process.exit(1);
  }
  
  // 7. PDF 다운로드
  const pdfPath = await downloadPDF(pdfResult.filename);
  
  // 8. 테스트 결과 요약
  console.log('\n' + '='.repeat(50));
  console.log('📊 테스트 결과 요약');
  console.log('='.repeat(50));
  console.log(`✅ 로그인: 성공`);
  console.log(`✅ 케이스 조회: ${cases.length}개`);
  console.log(`✅ 하자 조회: ${defects.length}개`);
  console.log(`✅ 측정 데이터: ${finalTotal}개`);
  console.log(`✅ PDF 생성: 성공`);
  console.log(`✅ PDF 다운로드: ${pdfPath ? '성공' : '실패'}`);
  console.log('='.repeat(50));
  
  if (pdfPath) {
    console.log(`\n📄 생성된 PDF 파일:`);
    console.log(`   ${pdfPath}`);
    console.log(`\n💡 PDF 파일을 열어서 다음을 확인하세요:`);
    console.log(`   1. 한글 표시가 정상인지`);
    console.log(`   2. 하자 정보가 포함되었는지`);
    console.log(`   3. 측정 데이터(공기질, 라돈, 레벨기, 열화상)가 포함되었는지`);
  }
  
  console.log('\n🎉 테스트 완료!');
  process.exit(0);
}

// 실행
runTests().catch(error => {
  console.error('\n💥 테스트 실행 중 오류 발생:', error);
  process.exit(1);
});

