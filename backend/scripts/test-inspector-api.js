/**
 * 점검원용 API 기능 테스트
 * - 점검원 로그인 (admin 계정)
 * - 모든 하자 조회
 * - 측정값 입력 (공기질, 라돈, 레벨기)
 * - 측정값 조회
 */

const axios = require('axios');

const config = {
  backendUrl: process.env.BACKEND_URL || 'https://mobile-app-new.onrender.com',
  inspectorCredentials: {
    complex: 'admin',
    dong: '000',
    ho: '000',
    name: '점검원',
    phone: '010-0000-0000'
  }
};

let authToken = null;
let testDefectId = null;
let testCaseId = null;

// 점검원 로그인
async function inspectorLogin() {
  console.log('🔐 점검원 로그인 중...');
  console.log(`   복합체: ${config.inspectorCredentials.complex}`);
  try {
    const response = await axios.post(`${config.backendUrl}/api/auth/session`, {
      complex: config.inspectorCredentials.complex,
      dong: config.inspectorCredentials.dong,
      ho: config.inspectorCredentials.ho,
      name: config.inspectorCredentials.name,
      phone: config.inspectorCredentials.phone
    });
    
    if (response.data.token) {
      authToken = response.data.token;
      console.log('✅ 점검원 로그인 성공');
      console.log(`   사용자: ${response.data.user?.name || config.inspectorCredentials.name}`);
      return true;
    } else {
      console.error('❌ 로그인 실패: 토큰을 받지 못했습니다');
      return false;
    }
  } catch (error) {
    console.error('❌ 로그인 실패:', error.response?.data || error.message);
    if (error.response) {
      console.error('   상태 코드:', error.response.status);
      console.error('   응답 데이터:', JSON.stringify(error.response.data, null, 2));
    }
    return false;
  }
}

// 모든 하자 조회
async function getAllDefects() {
  console.log('\n📋 모든 하자 조회 중...');
  try {
    const response = await axios.get(`${config.backendUrl}/api/defects/all`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    if (response.data.success && response.data.defects) {
      const defects = response.data.defects;
      console.log(`✅ 하자 조회 성공: ${defects.length}개`);
      
      if (defects.length > 0) {
        // 첫 번째 하자 정보 출력
        const firstDefect = defects[0];
        console.log(`\n   첫 번째 하자 정보:`);
        console.log(`   - ID: ${firstDefect.id}`);
        console.log(`   - 위치: ${firstDefect.location}`);
        console.log(`   - 세부공정: ${firstDefect.trade}`);
        console.log(`   - 내용: ${firstDefect.content}`);
        console.log(`   - 케이스 ID: ${firstDefect.case_id}`);
        console.log(`   - 사진 수: ${firstDefect.photos?.length || 0}개`);
        
        // 테스트용 하자 ID 저장
        testDefectId = firstDefect.id;
        testCaseId = firstDefect.case_id;
        
        return defects;
      } else {
        console.log('   ⚠️ 등록된 하자가 없습니다');
        return [];
      }
    } else {
      console.error('❌ 하자 조회 실패: 응답 형식 오류');
      return null;
    }
  } catch (error) {
    console.error('❌ 하자 조회 실패:', error.response?.data || error.message);
    if (error.response) {
      console.error('   상태 코드:', error.response.status);
      console.error('   응답 데이터:', JSON.stringify(error.response.data, null, 2));
    }
    return null;
  }
}

// 특정 하자의 측정값 조회
async function getDefectInspections(defectId) {
  console.log(`\n🔍 하자 ${defectId}의 측정값 조회 중...`);
  try {
    const response = await axios.get(`${config.backendUrl}/api/inspections/defects/${defectId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    if (response.data.inspections) {
      const inspections = response.data.inspections;
      const types = Object.keys(inspections);
      const totalCount = types.reduce((sum, type) => sum + (inspections[type]?.length || 0), 0);
      
      console.log(`✅ 측정값 조회 성공: 총 ${totalCount}건`);
      
      types.forEach(type => {
        const items = inspections[type] || [];
        if (items.length > 0) {
          console.log(`   - ${type}: ${items.length}건`);
        }
      });
      
      return inspections;
    } else {
      console.log('   ⚠️ 등록된 측정값이 없습니다');
      return {};
    }
  } catch (error) {
    if (error.response?.status === 404) {
      console.log('   ⚠️ 등록된 측정값이 없습니다 (404)');
      return {};
    }
    console.error('❌ 측정값 조회 실패:', error.response?.data || error.message);
    if (error.response) {
      console.error('   상태 코드:', error.response.status);
    }
    return null;
  }
}

// 공기질 측정 등록
async function createAirMeasurement(defectId, caseId) {
  console.log(`\n🌬️ 공기질 측정 등록 중...`);
  try {
    const measurementData = {
      caseId: caseId,
      defectId: defectId,
      location: '거실',
      trade: '마감',
      tvoc: 0.5,
      hcho: 0.1,
      co2: 450,
      note: 'API 테스트 공기질 측정',
      result: 'normal'
    };
    
    const response = await axios.post(`${config.backendUrl}/api/inspections/air`, measurementData, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.data.success) {
      console.log('✅ 공기질 측정 등록 성공');
      console.log(`   - Item ID: ${response.data.item?.id}`);
      console.log(`   - TVOC: ${response.data.measure?.tvoc || 'N/A'} mg/m³`);
      console.log(`   - HCHO: ${response.data.measure?.hcho || 'N/A'} mg/m³`);
      console.log(`   - CO2: ${response.data.measure?.co2 || 'N/A'} ppm`);
      return response.data;
    } else {
      console.error('❌ 공기질 측정 등록 실패: 응답 형식 오류');
      return null;
    }
  } catch (error) {
    console.error('❌ 공기질 측정 등록 실패:', error.response?.data || error.message);
    if (error.response) {
      console.error('   상태 코드:', error.response.status);
      console.error('   응답 데이터:', JSON.stringify(error.response.data, null, 2));
    }
    return null;
  }
}

// 라돈 측정 등록
async function createRadonMeasurement(defectId, caseId) {
  console.log(`\n☢️ 라돈 측정 등록 중...`);
  try {
    const measurementData = {
      caseId: caseId,
      defectId: defectId,
      location: '침실',
      trade: '바닥재',
      radon: 150,
      unit_radon: 'Bq/m³',
      note: 'API 테스트 라돈 측정',
      result: 'normal'
    };
    
    const response = await axios.post(`${config.backendUrl}/api/inspections/radon`, measurementData, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.data.success) {
      console.log('✅ 라돈 측정 등록 성공');
      console.log(`   - Item ID: ${response.data.item?.id}`);
      console.log(`   - 라돈 농도: ${response.data.measure?.radon || 'N/A'} ${response.data.measure?.unit_radon || 'Bq/m³'}`);
      return response.data;
    } else {
      console.error('❌ 라돈 측정 등록 실패: 응답 형식 오류');
      return null;
    }
  } catch (error) {
    console.error('❌ 라돈 측정 등록 실패:', error.response?.data || error.message);
    if (error.response) {
      console.error('   상태 코드:', error.response.status);
      console.error('   응답 데이터:', JSON.stringify(error.response.data, null, 2));
    }
    return null;
  }
}

// 레벨기 측정 등록
async function createLevelMeasurement(defectId, caseId) {
  console.log(`\n📏 레벨기 측정 등록 중...`);
  try {
    const measurementData = {
      caseId: caseId,
      defectId: defectId,
      location: '주방',
      trade: '바닥',
      left_mm: -2.5,
      right_mm: 1.8,
      note: 'API 테스트 레벨기 측정',
      result: 'check'
    };
    
    const response = await axios.post(`${config.backendUrl}/api/inspections/level`, measurementData, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.data.success) {
      console.log('✅ 레벨기 측정 등록 성공');
      console.log(`   - Item ID: ${response.data.item?.id}`);
      console.log(`   - 좌측: ${response.data.measure?.left_mm || 'N/A'} mm`);
      console.log(`   - 우측: ${response.data.measure?.right_mm || 'N/A'} mm`);
      return response.data;
    } else {
      console.error('❌ 레벨기 측정 등록 실패: 응답 형식 오류');
      return null;
    }
  } catch (error) {
    console.error('❌ 레벨기 측정 등록 실패:', error.response?.data || error.message);
    if (error.response) {
      console.error('   상태 코드:', error.response.status);
      console.error('   응답 데이터:', JSON.stringify(error.response.data, null, 2));
    }
    return null;
  }
}

// 육안점검 등록
async function createVisualInspection(defectId, caseId) {
  console.log(`\n👁️ 육안점검 등록 중...`);
  try {
    const payload = {
      caseId,
      defectId,
      location: '거실',
      trade: '마감',
      note: 'API 테스트 육안 점검의견',
      result: 'normal'
    };
    const response = await axios.post(`${config.backendUrl}/api/inspections/visual`, payload, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });
    if (response.data.success && response.data.item) {
      console.log('✅ 육안점검 등록 성공');
      console.log(`   - Item ID: ${response.data.item.id}`);
      console.log(`   - note: ${response.data.item.note || 'N/A'}`);
      return response.data;
    }
    console.error('❌ 육안점검 등록 실패: 응답 형식 오류');
    return null;
  } catch (error) {
    console.error('❌ 육안점검 등록 실패:', error.response?.data || error.message);
    if (error.response) {
      console.error('   상태 코드:', error.response.status);
    }
    return null;
  }
}

// 전체 테스트 실행
async function runTests() {
  console.log('🧪 점검원용 API 기능 테스트 시작');
  console.log('==================================\n');
  
  // 1. 점검원 로그인
  const loginSuccess = await inspectorLogin();
  if (!loginSuccess) {
    console.error('\n❌ 테스트 중단: 로그인 실패');
    process.exit(1);
  }
  
  // 2. 모든 하자 조회
  const defects = await getAllDefects();
  if (!defects || defects.length === 0) {
    console.log('\n⚠️ 하자가 없어서 측정값 입력 테스트를 건너뜁니다');
    return;
  }
  
  if (!testDefectId || !testCaseId) {
    console.error('\n❌ 테스트 중단: 하자 ID 또는 케이스 ID를 찾을 수 없습니다');
    return;
  }
  
  // 3. 측정값 조회 (입력 전)
  console.log('\n--- 측정값 입력 전 ---');
  await getDefectInspections(testDefectId);
  
  // 4. 육안점검 등록
  await createVisualInspection(testDefectId, testCaseId);
  
  // 5. 공기질 측정 등록
  await createAirMeasurement(testDefectId, testCaseId);
  
  // 6. 라돈 측정 등록
  await createRadonMeasurement(testDefectId, testCaseId);
  
  // 7. 레벨기 측정 등록
  await createLevelMeasurement(testDefectId, testCaseId);
  
  // 8. 측정값 조회 (입력 후) - visual 포함 확인
  console.log('\n--- 측정값 입력 후 (재조회 테스트) ---');
  await getDefectInspections(testDefectId);
  
  console.log('\n==================================');
  console.log('✅ 모든 테스트 완료!');
}

// 스크립트 실행
if (require.main === module) {
  runTests().catch(error => {
    console.error('\n❌ 테스트 실행 중 오류 발생:', error);
    process.exit(1);
  });
}

module.exports = {
  inspectorLogin,
  getAllDefects,
  getDefectInspections,
  createVisualInspection,
  createAirMeasurement,
  createRadonMeasurement,
  createLevelMeasurement
};
