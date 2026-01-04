/**
 * 배포된 서버에서 PDF 기능 테스트
 * - API 엔드포인트 확인
 * - PDF 생성 기능 테스트
 * - 미리보기/다운로드 엔드포인트 확인
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
  console.log(`\n🔍 케이스 ${caseId}의 하자 목록 조회 중...`);
  try {
    const response = await axios.get(`${config.backendUrl}/api/defects?case_id=${caseId}`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    const defects = response.data || [];
    console.log(`✅ 하자 ${defects.length}개 발견`);
    return defects;
  } catch (error) {
    console.error('❌ 하자 조회 실패:', error.response?.data || error.message);
    return [];
  }
}

// 보고서 미리보기 데이터 조회
async function getReportPreview(caseId) {
  console.log(`\n📄 보고서 미리보기 데이터 조회 중...`);
  try {
    const response = await axios.get(`${config.backendUrl}/api/reports/preview?case_id=${caseId}`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    const defects = response.data.defects || [];
    console.log(`✅ 미리보기 데이터 조회 성공 (하자 ${defects.length}개)`);
    return response.data;
  } catch (error) {
    console.error('❌ 미리보기 데이터 조회 실패:', error.response?.data || error.message);
    return null;
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
        timeout: 60000 // 60초 타임아웃
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

// PDF 미리보기 엔드포인트 테스트
async function testPDFPreview(filename) {
  console.log(`\n👁️  PDF 미리보기 엔드포인트 테스트 중...`);
  try {
    const response = await axios.get(
      `${config.backendUrl}/api/reports/preview-pdf/${filename}`,
      {
        headers: { 'Authorization': `Bearer ${authToken}` },
        responseType: 'arraybuffer',
        timeout: 30000
      }
    );
    
    if (response.status === 200 && response.data) {
      const buffer = Buffer.from(response.data);
      console.log('✅ PDF 미리보기 엔드포인트 정상 작동');
      console.log(`   Content-Type: ${response.headers['content-type']}`);
      console.log(`   Content-Disposition: ${response.headers['content-disposition']}`);
      console.log(`   파일 크기: ${(buffer.length / 1024).toFixed(2)} KB`);
      
      // inline인지 확인
      const disposition = response.headers['content-disposition'] || '';
      if (disposition.includes('inline')) {
        console.log('✅ Content-Disposition이 inline으로 설정되어 있습니다 (브라우저 미리보기 가능)');
      } else {
        console.log('⚠️  Content-Disposition이 inline이 아닙니다');
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

// PDF 다운로드 엔드포인트 테스트
async function testPDFDownload(filename) {
  console.log(`\n📥 PDF 다운로드 엔드포인트 테스트 중...`);
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
      const buffer = Buffer.from(response.data);
      console.log('✅ PDF 다운로드 엔드포인트 정상 작동');
      console.log(`   Content-Type: ${response.headers['content-type']}`);
      console.log(`   Content-Disposition: ${response.headers['content-disposition']}`);
      console.log(`   파일 크기: ${(buffer.length / 1024).toFixed(2)} KB`);
      
      // attachment인지 확인
      const disposition = response.headers['content-disposition'] || '';
      if (disposition.includes('attachment')) {
        console.log('✅ Content-Disposition이 attachment로 설정되어 있습니다 (다운로드 가능)');
      } else {
        console.log('⚠️  Content-Disposition이 attachment가 아닙니다');
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

// 메인 테스트 함수
async function runTests() {
  console.log('🚀 배포된 서버 PDF 기능 테스트 시작\n');
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
    console.log('💡 먼저 케이스를 생성하고 하자를 등록한 후 다시 테스트하세요.');
    process.exit(0);
  }
  
  // 하자가 있는 케이스 찾기
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
    console.log('\n⚠️  하자가 있는 케이스가 없어서 PDF 생성 테스트를 건너뜁니다.');
    console.log('💡 하자를 등록한 후 다시 테스트하세요.');
    process.exit(0);
  }
  
  console.log(`\n📌 테스트 케이스: ${caseId}`);
  console.log(`📊 하자 상태: 하자 ${defects.length}개`);
  
  // 4. 보고서 미리보기 데이터 조회
  const previewData = await getReportPreview(caseId);
  if (!previewData) {
    console.log('\n⚠️  미리보기 데이터 조회 실패');
  }
  
  // 5. PDF 생성
  const pdfResult = await testPDFGeneration(caseId);
  if (!pdfResult) {
    console.log('\n❌ PDF 생성 실패로 테스트를 중단합니다.');
    process.exit(1);
  }
  
  // 6. PDF 미리보기 엔드포인트 테스트
  const previewSuccess = await testPDFPreview(pdfResult.filename);
  
  // 7. PDF 다운로드 엔드포인트 테스트
  const downloadSuccess = await testPDFDownload(pdfResult.filename);
  
  // 8. 테스트 결과 요약
  console.log('\n' + '='.repeat(50));
  console.log('📊 테스트 결과 요약');
  console.log('='.repeat(50));
  console.log(`✅ 로그인: 성공`);
  console.log(`✅ 케이스 조회: ${cases.length}개`);
  console.log(`✅ 하자 조회: ${defects.length}개`);
  console.log(`${previewData ? '✅' : '❌'} 미리보기 데이터: ${previewData ? '성공' : '실패'}`);
  console.log(`${pdfResult ? '✅' : '❌'} PDF 생성: ${pdfResult ? '성공' : '실패'}`);
  console.log(`${previewSuccess ? '✅' : '❌'} PDF 미리보기 엔드포인트: ${previewSuccess ? '성공' : '실패'}`);
  console.log(`${downloadSuccess ? '✅' : '❌'} PDF 다운로드 엔드포인트: ${downloadSuccess ? '성공' : '실패'}`);
  console.log('='.repeat(50));
  
  if (pdfResult && previewSuccess && downloadSuccess) {
    console.log('\n🎉 모든 테스트 통과!');
    process.exit(0);
  } else {
    console.log('\n⚠️  일부 테스트 실패');
    process.exit(1);
  }
}

// 실행
runTests().catch(error => {
  console.error('\n💥 테스트 실행 중 오류 발생:', error);
  process.exit(1);
});

