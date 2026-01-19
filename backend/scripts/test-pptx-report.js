/**
 * PowerPoint 보고서 생성 API 테스트
 * 실제 데이터로 샘플 보고서 생성
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// 환경 설정
const BASE_URL = process.env.BACKEND_URL || 'https://mobile-app-new.onrender.com';
const API_BASE = `${BASE_URL}/api`;

// 테스트 계정 정보
const TEST_ACCOUNTS = {
  regular: {
    complex: '서울 인싸이트자이',
    dong: '101',
    ho: '1203',
    name: '홍길동',
    phone: '010-1234-5678'
  },
  inspector: {
    complex: 'admin',
    dong: '000',
    ho: '000',
    name: '점검원',
    phone: '010-0000-0000'
  }
};

async function login(account) {
  try {
    console.log(`\n🔐 로그인 시도: ${account.complex} ${account.dong}-${account.ho}`);
    
    const response = await axios.post(`${API_BASE}/auth/session`, {
      complex: account.complex,
      dong: account.dong,
      ho: account.ho,
      name: account.name,
      phone: account.phone
    });

    if (response.data && response.data.token) {
      console.log('✅ 로그인 성공');
      return response.data.token;
    } else {
      throw new Error('로그인 실패: 토큰을 받지 못했습니다.');
    }
  } catch (error) {
    console.error('❌ 로그인 오류:', error.response?.data || error.message);
    throw error;
  }
}

async function getLatestCase(token) {
  try {
    console.log('\n📋 최신 케이스 조회...');
    
    const response = await axios.get(`${API_BASE}/cases`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (response.data && response.data.length > 0) {
      const latestCase = response.data[0];
      console.log(`✅ 케이스 발견: ${latestCase.id}`);
      return latestCase.id;
    } else {
      console.log('⚠️ 케이스가 없습니다. 새 케이스를 생성합니다...');
      return null;
    }
  } catch (error) {
    console.error('❌ 케이스 조회 오류:', error.response?.data || error.message);
    return null;
  }
}

async function createTestCase(token) {
  try {
    console.log('\n📝 테스트 케이스 생성...');
    
    const response = await axios.post(`${API_BASE}/cases`, {
      type: '하자접수'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (response.data && response.data.case_id) {
      console.log(`✅ 케이스 생성 완료: ${response.data.case_id}`);
      return response.data.case_id;
    } else {
      throw new Error('케이스 생성 실패');
    }
  } catch (error) {
    console.error('❌ 케이스 생성 오류:', error.response?.data || error.message);
    throw error;
  }
}

async function generatePPTXReport(token, caseId) {
  try {
    console.log(`\n📊 PowerPoint 보고서 생성 시작...`);
    console.log(`케이스 ID: ${caseId || '최신 케이스'}`);
    
    const requestBody = caseId ? { case_id: caseId } : {};
    
    const response = await axios.post(
      `${API_BASE}/reports/generate-pptx`,
      requestBody,
      {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 60000 // 60초 타임아웃
      }
    );

    if (response.data && response.data.success) {
      console.log('✅ PowerPoint 보고서 생성 성공!');
      console.log(`\n📄 보고서 정보:`);
      console.log(`  - 파일명: ${response.data.filename}`);
      console.log(`  - 크기: ${(response.data.size / 1024 / 1024).toFixed(2)} MB`);
      console.log(`  - URL: ${BASE_URL}${response.data.url}`);
      console.log(`  - 다운로드: ${BASE_URL}${response.data.download_url}`);
      
      return response.data;
    } else {
      throw new Error('보고서 생성 실패: 응답 데이터가 올바르지 않습니다.');
    }
  } catch (error) {
    console.error('❌ PowerPoint 보고서 생성 오류:');
    if (error.response) {
      console.error(`  상태 코드: ${error.response.status}`);
      console.error(`  응답 데이터:`, JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.error('  요청이 전송되었지만 응답을 받지 못했습니다.');
      console.error('  요청 URL:', error.config?.url);
    } else {
      console.error('  오류 메시지:', error.message);
    }
    throw error;
  }
}

async function downloadReport(token, downloadUrl) {
  try {
    console.log(`\n📥 보고서 다운로드 시작...`);
    
    const response = await axios.get(`${BASE_URL}${downloadUrl}`, {
      headers: { Authorization: `Bearer ${token}` },
      responseType: 'arraybuffer',
      timeout: 60000
    });

    if (response.data) {
      const outputDir = path.join(__dirname, '..', '..', 'test-samples');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const filename = `sample-report-${Date.now()}.pptx`;
      const filepath = path.join(outputDir, filename);
      
      fs.writeFileSync(filepath, response.data);
      
      const fileSize = fs.statSync(filepath).size;
      console.log(`✅ 다운로드 완료!`);
      console.log(`  - 파일 경로: ${filepath}`);
      console.log(`  - 파일 크기: ${(fileSize / 1024 / 1024).toFixed(2)} MB`);
      
      return filepath;
    } else {
      throw new Error('다운로드 실패: 파일 데이터가 없습니다.');
    }
  } catch (error) {
    console.error('❌ 다운로드 오류:', error.response?.status || error.message);
    throw error;
  }
}

async function testPPTXReportGeneration() {
  try {
    console.log('='.repeat(60));
    console.log('🧪 PowerPoint 보고서 생성 API 테스트');
    console.log('='.repeat(60));
    console.log(`백엔드 URL: ${BASE_URL}`);

    // 1. 로그인 (일반 사용자 계정)
    const token = await login(TEST_ACCOUNTS.regular);

    // 2. 최신 케이스 조회 또는 생성
    let caseId = await getLatestCase(token);
    
    if (!caseId) {
      caseId = await createTestCase(token);
    }

    // 3. PowerPoint 보고서 생성
    const reportData = await generatePPTXReport(token, caseId);

    // 4. 보고서 다운로드
    if (reportData.download_url) {
      await downloadReport(token, reportData.download_url);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ 테스트 완료!');
    console.log('='.repeat(60));
    console.log('\n📋 생성된 보고서 정보:');
    console.log(`  - 케이스 ID: ${caseId}`);
    console.log(`  - 파일명: ${reportData.filename}`);
    console.log(`  - 다운로드 URL: ${BASE_URL}${reportData.download_url}`);
    console.log('\n💡 참고:');
    console.log('  - 생성된 샘플 파일은 test-samples/ 폴더에 저장되었습니다.');
    console.log('  - PowerPoint로 열어서 내용을 확인할 수 있습니다.');

  } catch (error) {
    console.error('\n' + '='.repeat(60));
    console.error('❌ 테스트 실패');
    console.error('='.repeat(60));
    console.error('오류:', error.message);
    process.exit(1);
  }
}

// 실행
if (require.main === module) {
  testPPTXReportGeneration();
}

module.exports = { testPPTXReportGeneration };
