// 기능 1: 로그인 테스트 및 화면 캡처
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// 설정
const config = {
  frontendUrl: process.env.FRONTEND_URL || 'https://insighti.vercel.app',
  backendUrl: process.env.BACKEND_URL || 'https://insighti-backend-v2.onrender.com',
  screenshotsDir: path.join(__dirname, '..', '..', 'test-screenshots', 'feature-1-login'),
  waitTimeout: 30000,
  viewport: {
    width: 375,
    height: 812,
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2
  }
};

// 스크린샷 디렉토리 생성
if (!fs.existsSync(config.screenshotsDir)) {
  fs.mkdirSync(config.screenshotsDir, { recursive: true });
}

// 테스트 데이터
const testData = {
  complex: '테스트 단지',
  dong: '101',
  ho: '1203',
  name: '홍길동',
  phone: '010-1234-5678'
};

// 유틸리티 함수
async function takeScreenshot(page, name, description = '') {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
  const filename = `01-${name}-${timestamp}.png`;
  const filepath = path.join(config.screenshotsDir, filename);
  
  await page.screenshot({
    path: filepath,
    fullPage: true
  });
  
  console.log(`📸 ${filename} ${description ? `- ${description}` : ''}`);
  return filepath;
}

async function waitForElement(page, selector, timeout = config.waitTimeout) {
  try {
    await page.waitForSelector(selector, { timeout, visible: true });
    return true;
  } catch (error) {
    console.error(`❌ 요소를 찾을 수 없음: ${selector}`);
    return false;
  }
}

// 기능 1: 로그인 테스트
async function testLogin() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 기능 1: 로그인 테스트');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`프론트엔드: ${config.frontendUrl}`);
  console.log(`백엔드: ${config.backendUrl}`);
  console.log(`스크린샷: ${config.screenshotsDir}\n`);
  
  let browser;
  let page;
  
  try {
    // 브라우저 실행
    console.log('🌐 브라우저 실행 중...');
    
    // Chrome 실행 파일 경로 확인 (macOS)
    const chromePaths = [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Chromium.app/Contents/MacOS/Chromium'
    ];
    
    let executablePath = null;
    for (const path of chromePaths) {
      if (fs.existsSync(path)) {
        executablePath = path;
        console.log(`✅ Chrome 발견: ${path}`);
        break;
      }
    }
    
    const launchOptions = {
      headless: 'new',
      defaultViewport: config.viewport,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process'
      ]
    };
    
    if (executablePath) {
      launchOptions.executablePath = executablePath;
    }
    
    browser = await puppeteer.launch(launchOptions);
    
    page = await browser.newPage();
    await page.setViewport(config.viewport);
    
    // User-Agent 설정 (모바일)
    await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1');
    
    console.log('✅ 브라우저 실행 완료\n');
    
    // 1. 로그인 화면 이동
    console.log('1️⃣ 로그인 화면 로드 중...');
    await page.goto(config.frontendUrl, { 
      waitUntil: 'networkidle0',
      timeout: config.waitTimeout 
    });
    await page.waitForTimeout(2000);
    
    const loginScreenExists = await waitForElement(page, '#login');
    if (loginScreenExists) {
      await takeScreenshot(page, 'login-screen', '로그인 화면');
      console.log('✅ 로그인 화면 확인\n');
    } else {
      throw new Error('로그인 화면을 찾을 수 없습니다');
    }
    
    // 2. 로그인 정보 입력
    console.log('2️⃣ 로그인 정보 입력 중...');
    
    // 입력 필드 확인 및 입력
    const fields = {
      '#login-complex': testData.complex,
      '#login-dong': testData.dong,
      '#login-ho': testData.ho,
      '#login-name': testData.name,
      '#login-phone': testData.phone
    };
    
    for (const [selector, value] of Object.entries(fields)) {
      const element = await page.$(selector);
      if (element) {
        await element.click({ clickCount: 3 }); // 기존 내용 선택
        await element.type(value, { delay: 100 });
        await page.waitForTimeout(300);
      } else {
        console.warn(`⚠️ 입력 필드를 찾을 수 없음: ${selector}`);
      }
    }
    
    await takeScreenshot(page, 'login-filled', '로그인 정보 입력 완료');
    console.log('✅ 로그인 정보 입력 완료\n');
    
    // 3. 로그인 버튼 클릭
    console.log('3️⃣ 로그인 버튼 클릭 중...');
    
    // 로그인 버튼 찾기 (여러 방법 시도)
    let loginButton = await page.$('button[onclick="onLogin()"]');
    
    if (!loginButton) {
      // 텍스트로 찾기
      const buttons = await page.$$('button');
      for (const button of buttons) {
        const text = await page.evaluate(el => el.textContent, button);
        if (text && text.includes('로그인')) {
          loginButton = button;
          break;
        }
      }
    }
    
    if (loginButton) {
      await loginButton.click();
      console.log('✅ 로그인 버튼 클릭 완료\n');
      
      // 로그인 처리 대기
      console.log('⏳ 로그인 처리 대기 중...');
      await page.waitForTimeout(5000); // 로그인 처리 시간
      
      // 4. 로그인 결과 확인
      console.log('4️⃣ 로그인 결과 확인 중...');
      
      // 에러 메시지 확인
      const errorSelectors = ['.toast.error', '.error-message', '.toast[style*="error"]'];
      let hasError = false;
      let errorText = '';
      
      for (const selector of errorSelectors) {
        const errorElement = await page.$(selector);
        if (errorElement) {
          errorText = await page.evaluate(el => el.textContent || el.innerText, errorElement);
          hasError = true;
          break;
        }
      }
      
      // 하자 목록 화면 확인
      const listScreen = await page.$('#list');
      const listScreenVisible = listScreen ? await page.evaluate(el => {
        return !el.classList.contains('hidden');
      }, listScreen) : false;
      
      if (hasError) {
        await takeScreenshot(page, 'login-failed', `로그인 실패: ${errorText}`);
        console.log(`❌ 로그인 실패: ${errorText}\n`);
        return {
          success: false,
          error: errorText,
          screenshots: [
            path.join(config.screenshotsDir, '01-login-screen-*.png'),
            path.join(config.screenshotsDir, '01-login-filled-*.png'),
            path.join(config.screenshotsDir, '01-login-failed-*.png')
          ]
        };
      } else if (listScreenVisible) {
        await page.waitForTimeout(2000);
        await takeScreenshot(page, 'login-success', '로그인 성공 - 하자 목록 화면');
        console.log('✅ 로그인 성공! 하자 목록 화면 확인\n');
        
        // 사용자 정보 확인
        const userBadge = await page.$('#badge-user');
        if (userBadge) {
          const userText = await page.evaluate(el => el.textContent, userBadge);
          console.log(`👤 사용자 정보: ${userText}\n`);
        }
        
        return {
          success: true,
          screenshots: [
            path.join(config.screenshotsDir, '01-login-screen-*.png'),
            path.join(config.screenshotsDir, '01-login-filled-*.png'),
            path.join(config.screenshotsDir, '01-login-success-*.png')
          ]
        };
      } else {
        await takeScreenshot(page, 'login-unknown', '로그인 상태 불명확');
        console.log('⚠️ 로그인 상태를 확인할 수 없습니다\n');
        return {
          success: false,
          error: '로그인 상태를 확인할 수 없습니다',
          screenshots: [
            path.join(config.screenshotsDir, '01-login-screen-*.png'),
            path.join(config.screenshotsDir, '01-login-filled-*.png'),
            path.join(config.screenshotsDir, '01-login-unknown-*.png')
          ]
        };
      }
      
    } else {
      await takeScreenshot(page, 'login-button-not-found', '로그인 버튼을 찾을 수 없음');
      throw new Error('로그인 버튼을 찾을 수 없습니다');
    }
    
  } catch (error) {
    console.error('❌ 테스트 오류:', error.message);
    if (page) {
      await takeScreenshot(page, 'error', `오류: ${error.message}`);
    }
    return {
      success: false,
      error: error.message,
      screenshots: []
    };
  } finally {
    if (browser) {
      await browser.close();
      console.log('🔒 브라우저 종료\n');
    }
  }
}

// 실행
if (require.main === module) {
  testLogin()
    .then(result => {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📊 테스트 결과');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`결과: ${result.success ? '✅ 성공' : '❌ 실패'}`);
      if (result.error) {
        console.log(`오류: ${result.error}`);
      }
      console.log(`스크린샷: ${result.screenshots.length}개`);
      console.log(`위치: ${config.screenshotsDir}\n`);
      
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ 테스트 실행 실패:', error);
      process.exit(1);
    });
}

module.exports = { testLogin, config };

