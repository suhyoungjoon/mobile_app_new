// 자동 기능 테스트 및 화면 캡처 스크립트
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// 설정
const config = {
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:8080',
  backendUrl: process.env.BACKEND_URL || 'http://localhost:3001',
  screenshotsDir: path.join(__dirname, '..', '..', 'test-screenshots'),
  waitTimeout: 30000,
  viewport: {
    width: 375,
    height: 812,
    isMobile: true,
    hasTouch: true
  }
};

// 스크린샷 디렉토리 생성
if (!fs.existsSync(config.screenshotsDir)) {
  fs.mkdirSync(config.screenshotsDir, { recursive: true });
}

// 테스트 데이터
const testData = {
  login: {
    complex: '테스트 단지',
    dong: '101',
    ho: '1203',
    name: '홍길동',
    phone: '010-1234-5678'
  },
  defect: {
    location: '거실',
    trade: '바닥재',
    content: '마루판 들뜸',
    memo: '자동 테스트로 등록된 하자'
  }
};

// 유틸리티 함수
async function takeScreenshot(page, name, description = '') {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${name}-${timestamp}.png`;
  const filepath = path.join(config.screenshotsDir, filename);
  
  await page.screenshot({
    path: filepath,
    fullPage: true
  });
  
  console.log(`📸 스크린샷 저장: ${filename} ${description ? `(${description})` : ''}`);
  return filepath;
}

async function waitForElement(page, selector, timeout = config.waitTimeout) {
  try {
    await page.waitForSelector(selector, { timeout });
    return true;
  } catch (error) {
    console.error(`❌ 요소를 찾을 수 없음: ${selector}`);
    return false;
  }
}

async function waitForNavigation(page) {
  try {
    await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: config.waitTimeout });
  } catch (error) {
    // 네비게이션이 없어도 계속 진행
  }
}

// 테스트 결과 저장
const testResults = {
  passed: [],
  failed: [],
  screenshots: []
};

function logTestResult(testName, passed, error = null) {
  if (passed) {
    testResults.passed.push(testName);
    console.log(`✅ ${testName}: 통과`);
  } else {
    testResults.failed.push({ test: testName, error });
    console.log(`❌ ${testName}: 실패 - ${error?.message || '알 수 없는 오류'}`);
  }
}

// 기능 1: 로그인 테스트
async function testLogin(page) {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 기능 1: 로그인 테스트');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  try {
    // 1. 로그인 화면 이동
    await page.goto(config.frontendUrl, { waitUntil: 'networkidle0' });
    await page.waitForTimeout(1000);
    await takeScreenshot(page, '01-login-screen', '로그인 화면');
    
    // 2. 로그인 정보 입력
    await waitForElement(page, '#login-complex');
    await page.type('#login-complex', testData.login.complex);
    await page.type('#login-dong', testData.login.dong);
    await page.type('#login-ho', testData.login.ho);
    await page.type('#login-name', testData.login.name);
    await page.type('#login-phone', testData.login.phone);
    
    await takeScreenshot(page, '01-login-filled', '로그인 정보 입력 완료');
    
    // 3. 로그인 버튼 클릭
    const loginButton = await page.$('button[onclick="onLogin()"]');
    if (loginButton) {
      await loginButton.click();
      
      // 로그인 처리 대기 (최대 30초)
      await page.waitForTimeout(3000);
      
      // 로그인 성공 확인 (에러 메시지가 없고, 다른 화면으로 이동했는지 확인)
      const errorElement = await page.$('.toast.error, .error-message');
      const listScreen = await page.$('#list');
      
      if (!errorElement && listScreen) {
        await page.waitForTimeout(2000);
        await takeScreenshot(page, '01-login-success', '로그인 성공 - 하자 목록 화면');
        logTestResult('로그인', true);
        return true;
      } else {
        const errorText = errorElement ? await page.evaluate(el => el.textContent, errorElement) : '로그인 실패';
        await takeScreenshot(page, '01-login-failed', `로그인 실패: ${errorText}`);
        logTestResult('로그인', false, new Error(errorText));
        return false;
      }
    } else {
      logTestResult('로그인', false, new Error('로그인 버튼을 찾을 수 없음'));
      return false;
    }
  } catch (error) {
    await takeScreenshot(page, '01-login-error', `오류: ${error.message}`);
    logTestResult('로그인', false, error);
    return false;
  }
}

// 테스트 실행
async function runTests() {
  console.log('🚀 자동 기능 테스트 시작');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log(`프론트엔드 URL: ${config.frontendUrl}`);
  console.log(`백엔드 URL: ${config.backendUrl}`);
  console.log(`스크린샷 저장 위치: ${config.screenshotsDir}\n`);
  
  let browser;
  let page;
  
  try {
    // 브라우저 실행
    browser = await puppeteer.launch({
      headless: 'new', // headless 모드로 실행
      defaultViewport: config.viewport,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu'
      ]
    });
    
    page = await browser.newPage();
    await page.setViewport(config.viewport);
    
    // 기능 1: 로그인 테스트
    const loginSuccess = await testLogin(page);
    
    if (!loginSuccess) {
      console.log('\n⚠️ 로그인 실패로 인해 이후 테스트를 건너뜁니다.');
    } else {
      console.log('\n✅ 로그인 성공! 다음 기능 테스트를 진행할 수 있습니다.');
    }
    
    // 테스트 결과 요약
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 테스트 결과 요약');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ 통과: ${testResults.passed.length}개`);
    console.log(`❌ 실패: ${testResults.failed.length}개`);
    console.log(`📸 스크린샷: ${testResults.screenshots.length}개`);
    console.log(`\n스크린샷 위치: ${config.screenshotsDir}\n`);
    
  } catch (error) {
    console.error('❌ 테스트 실행 오류:', error);
    if (page) {
      await takeScreenshot(page, 'error', `테스트 실행 오류: ${error.message}`);
    }
  } finally {
    if (browser) {
      await browser.close();
    }
  }
  
  return {
    success: testResults.failed.length === 0,
    passed: testResults.passed.length,
    failed: testResults.failed.length,
    screenshots: testResults.screenshots.length
  };
}

// 실행
if (require.main === module) {
  runTests()
    .then(result => {
      console.log('\n✅ 테스트 완료');
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ 테스트 실패:', error);
      process.exit(1);
    });
}

module.exports = { runTests, testLogin, config };

