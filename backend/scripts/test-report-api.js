/**
 * 보고서 관련 API 기능 테스트
 * - 보고서 미리보기 데이터 조회
 * - PDF 생성
 * - PDF 미리보기
 * - PDF 다운로드
 * - SMS 발송 (선택적)
 */

const axios = require('axios');

const config = {
  backendUrl: process.env.BACKEND_URL || 'https://mobile-app-new.onrender.com',
  // 보고서 API는 일반 사용자 계정 필요 (household_id 기반)
  testUser: {
    complex: '서울 인싸이트자이',
    dong: '101',
    ho: '1203',
    name: '홍길동',
    phone: '010-1234-5678'
  }
};

let authToken = null;
let testCaseId = null;

// 일반 사용자 로그인 (보고서 API는 household_id 기반)
async function login() {
  console.log('🔐 로그인 중...');
  console.log(`   복합체: ${config.testUser.complex}`);
  console.log(`   동-호: ${config.testUser.dong}-${config.testUser.ho}`);
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
      console.log('✅ 로그인 성공');
      console.log(`   사용자: ${config.testUser.dong}동 ${config.testUser.ho}호 ${config.testUser.name}`);
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

// 케이스 목록 조회
async function getCases() {
  console.log('\n📋 케이스 목록 조회 중...');
  try {
    const response = await axios.get(`${config.backendUrl}/api/cases`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    if (response.data && response.data.length > 0) {
      console.log(`✅ 케이스 조회 성공: ${response.data.length}개`);
      
      // 첫 번째 케이스 ID 사용
      if (response.data[0].id) {
        testCaseId = response.data[0].id;
        console.log(`   테스트 케이스 ID: ${testCaseId}`);
      }
      
      return response.data;
    } else {
      console.log('   ⚠️ 등록된 케이스가 없습니다');
      return [];
    }
  } catch (error) {
    console.error('❌ 케이스 조회 실패:', error.response?.data || error.message);
    if (error.response) {
      console.error('   상태 코드:', error.response.status);
    }
    return null;
  }
}

// 보고서 미리보기 데이터 조회
async function getReportPreview() {
  console.log('\n📄 보고서 미리보기 데이터 조회 중...');
  try {
    const url = testCaseId 
      ? `${config.backendUrl}/api/reports/preview?case_id=${testCaseId}`
      : `${config.backendUrl}/api/reports/preview`;
    
    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    if (response.data) {
      const data = response.data;
      console.log('✅ 미리보기 데이터 조회 성공');
      console.log(`   케이스 ID: ${data.case_id || 'N/A'}`);
      console.log(`   하자 수: ${data.defects_count || (data.defects?.length || 0)}`);
      console.log(`   장비 점검: ${data.equipment_count || 0}건`);
      
      if (data.defects && data.defects.length > 0) {
        console.log(`   - 하자 목록: ${data.defects.length}개`);
        data.defects.forEach((defect, index) => {
          console.log(`     ${index + 1}. ${defect.location || ''} - ${defect.trade || ''}`);
          if (defect.photos && defect.photos.length > 0) {
            console.log(`        사진: ${defect.photos.length}개`);
          }
        });
      }
      
      if (data.equipment_data) {
        const eq = data.equipment_data;
        if (eq.air && eq.air.length > 0) {
          console.log(`   - 공기질 측정: ${eq.air.length}건`);
        }
        if (eq.radon && eq.radon.length > 0) {
          console.log(`   - 라돈 측정: ${eq.radon.length}건`);
        }
        if (eq.level && eq.level.length > 0) {
          console.log(`   - 레벨기 측정: ${eq.level.length}건`);
        }
        if (eq.thermal && eq.thermal.length > 0) {
          console.log(`   - 열화상 점검: ${eq.thermal.length}건`);
        }
      }
      
      return data;
    } else {
      console.error('❌ 미리보기 데이터 조회 실패: 응답 데이터 없음');
      return null;
    }
  } catch (error) {
    console.error('❌ 미리보기 데이터 조회 실패:', error.response?.data || error.message);
    if (error.response) {
      console.error('   상태 코드:', error.response.status);
      console.error('   응답 데이터:', JSON.stringify(error.response.data, null, 2));
    }
    return null;
  }
}

// PDF 생성 테스트
async function generatePDF() {
  console.log(`\n📝 PDF 생성 테스트 중...`);
  try {
    const requestData = testCaseId ? { case_id: testCaseId } : {};
    
    const response = await axios.post(
      `${config.backendUrl}/api/reports/generate`,
      requestData,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 60000 // 60초 타임아웃
      }
    );
    
    if (response.data.success && response.data.filename) {
      console.log('✅ PDF 생성 성공');
      console.log(`   파일명: ${response.data.filename}`);
      console.log(`   크기: ${(response.data.size / 1024).toFixed(2)} KB`);
      console.log(`   URL: ${response.data.url}`);
      console.log(`   다운로드 URL: ${response.data.download_url || 'N/A'}`);
      return response.data;
    } else {
      console.error('❌ PDF 생성 실패: 응답 데이터가 올바르지 않습니다');
      return null;
    }
  } catch (error) {
    console.error('❌ PDF 생성 실패:', error.response?.data || error.message);
    if (error.response) {
      console.error('   상태 코드:', error.response.status);
      if (error.response.data) {
        console.error('   응답 데이터:', JSON.stringify(error.response.data, null, 2));
      }
    }
    return null;
  }
}

// PDF 미리보기 테스트
async function previewPDF(filename) {
  console.log(`\n👁️  PDF 미리보기 엔드포인트 테스트 중...`);
  try {
    const response = await axios.get(
      `${config.backendUrl}/api/reports/preview-pdf/${filename}`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        responseType: 'arraybuffer',
        timeout: 30000
      }
    );
    
    if (response.status === 200 && response.data) {
      const buffer = Buffer.from(response.data);
      console.log('✅ PDF 미리보기 엔드포인트 정상 작동');
      console.log(`   Content-Type: ${response.headers['content-type']}`);
      console.log(`   파일 크기: ${(buffer.length / 1024).toFixed(2)} KB`);
      
      const disposition = response.headers['content-disposition'] || '';
      if (disposition.includes('inline')) {
        console.log('   ✅ Content-Disposition: inline (브라우저 미리보기 가능)');
      } else {
        console.log(`   ⚠️ Content-Disposition: ${disposition}`);
      }
      
      return true;
    } else {
      console.error('❌ PDF 미리보기 실패: 응답이 올바르지 않습니다');
      return false;
    }
  } catch (error) {
    console.error('❌ PDF 미리보기 실패:', error.response?.status || error.message);
    if (error.response) {
      console.error('   상태 코드:', error.response.status);
    }
    return false;
  }
}

// PDF 다운로드 테스트
async function downloadPDF(filename) {
  console.log(`\n📥 PDF 다운로드 엔드포인트 테스트 중...`);
  try {
    const response = await axios.get(
      `${config.backendUrl}/api/reports/download/${filename}`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        responseType: 'arraybuffer',
        timeout: 30000
      }
    );
    
    if (response.status === 200 && response.data) {
      const buffer = Buffer.from(response.data);
      console.log('✅ PDF 다운로드 엔드포인트 정상 작동');
      console.log(`   Content-Type: ${response.headers['content-type']}`);
      console.log(`   파일 크기: ${(buffer.length / 1024).toFixed(2)} KB`);
      
      const disposition = response.headers['content-disposition'] || '';
      if (disposition.includes('attachment')) {
        console.log('   ✅ Content-Disposition: attachment (다운로드 가능)');
      } else {
        console.log(`   ⚠️ Content-Disposition: ${disposition}`);
      }
      
      return true;
    } else {
      console.error('❌ PDF 다운로드 실패: 응답이 올바르지 않습니다');
      return false;
    }
  } catch (error) {
    console.error('❌ PDF 다운로드 실패:', error.response?.status || error.message);
    if (error.response) {
      console.error('   상태 코드:', error.response.status);
    }
    return false;
  }
}

// 전체 테스트 실행
async function runTests() {
  console.log('🧪 보고서 관련 API 기능 테스트 시작');
  console.log('==================================\n');
  console.log(`백엔드 URL: ${config.backendUrl}\n`);
  
  // 1. 로그인
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.error('\n❌ 테스트 중단: 로그인 실패');
    process.exit(1);
  }
  
  // 2. 케이스 목록 조회
  const cases = await getCases();
  if (!cases || cases.length === 0) {
    console.log('\n⚠️ 케이스가 없어서 테스트를 진행할 수 없습니다');
    console.log('💡 먼저 케이스를 생성하고 하자를 등록한 후 다시 테스트하세요.');
    return;
  }
  
  // 3. 보고서 미리보기 데이터 조회
  const previewData = await getReportPreview();
  if (!previewData) {
    console.log('\n⚠️ 미리보기 데이터 조회 실패');
  }
  
  // 4. PDF 생성
  const pdfResult = await generatePDF();
  if (!pdfResult) {
    console.log('\n❌ PDF 생성 실패로 테스트를 중단합니다');
    process.exit(1);
  }
  
  // 5. PDF 미리보기 테스트
  const previewSuccess = await previewPDF(pdfResult.filename);
  
  // 6. PDF 다운로드 테스트
  const downloadSuccess = await downloadPDF(pdfResult.filename);
  
  // 테스트 결과 요약
  console.log('\n==================================');
  console.log('📊 테스트 결과 요약');
  console.log('==================================');
  console.log('✅ 로그인: 성공');
  console.log(`✅ 케이스 조회: ${cases.length}개`);
  console.log(`${previewData ? '✅' : '❌'} 미리보기 데이터: ${previewData ? '성공' : '실패'}`);
  console.log(`${pdfResult ? '✅' : '❌'} PDF 생성: ${pdfResult ? '성공' : '실패'}`);
  console.log(`${previewSuccess ? '✅' : '❌'} PDF 미리보기: ${previewSuccess ? '성공' : '실패'}`);
  console.log(`${downloadSuccess ? '✅' : '❌'} PDF 다운로드: ${downloadSuccess ? '성공' : '실패'}`);
  console.log('==================================');
  
  if (pdfResult && previewSuccess && downloadSuccess) {
    console.log('\n✅ 모든 테스트 완료!');
  } else {
    console.log('\n⚠️ 일부 테스트 실패');
  }
}

// 스크립트 실행
if (require.main === module) {
  runTests().catch(error => {
    console.error('\n❌ 테스트 실행 중 오류 발생:', error);
    process.exit(1);
  });
}

module.exports = {
  login,
  getCases,
  getReportPreview,
  generatePDF,
  previewPDF,
  downloadPDF
};
