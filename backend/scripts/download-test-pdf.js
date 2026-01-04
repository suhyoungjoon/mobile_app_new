/**
 * 테스트 중 생성된 PDF 파일 다운로드 스크립트
 * 배포된 서버에서 생성된 PDF를 로컬로 다운로드
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const config = {
  backendUrl: process.env.BACKEND_URL || 'https://mobile-app-new.onrender.com',
  testUser: {
    complex: '테스트 단지',
    dong: '101',
    ho: '1203',
    name: '홍길동',
    phone: '010-1234-5678'
  },
  outputDir: path.join(__dirname, '..', 'reports')
};

// 출력 디렉토리 생성
if (!fs.existsSync(config.outputDir)) {
  fs.mkdirSync(config.outputDir, { recursive: true });
}

let authToken = null;

// 세션 생성
async function createSession() {
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
      return true;
    }
    return false;
  } catch (error) {
    console.error('❌ 세션 생성 실패:', error.message);
    return false;
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
      const filepath = path.join(config.outputDir, filename);
      fs.writeFileSync(filepath, Buffer.from(response.data));
      
      const stats = fs.statSync(filepath);
      console.log(`✅ PDF 다운로드 완료`);
      console.log(`   저장 위치: ${filepath}`);
      console.log(`   파일 크기: ${(stats.size / 1024).toFixed(2)} KB`);
      
      return filepath;
    }
    return null;
  } catch (error) {
    console.error('❌ PDF 다운로드 실패:', error.message);
    return null;
  }
}

// 메인 실행
async function main() {
  const filename = process.argv[2];
  
  if (!filename) {
    console.log('사용법: node download-test-pdf.js <filename>');
    console.log('\n예시:');
    console.log('  node download-test-pdf.js report-CASE-26111042-1767528515442.pdf');
    process.exit(1);
  }
  
  console.log('🚀 PDF 다운로드 시작\n');
  
  // 세션 생성
  const sessionSuccess = await createSession();
  if (!sessionSuccess) {
    console.error('\n❌ 세션 생성 실패');
    process.exit(1);
  }
  
  // PDF 다운로드
  const filepath = await downloadPDF(filename);
  
  if (filepath) {
    console.log('\n🎉 완료!');
    console.log(`PDF 파일이 다음 위치에 저장되었습니다:`);
    console.log(`  ${filepath}`);
  } else {
    console.log('\n❌ 다운로드 실패');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('\n💥 오류 발생:', error);
  process.exit(1);
});

