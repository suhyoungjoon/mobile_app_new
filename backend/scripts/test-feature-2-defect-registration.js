// 기능 2: 하자 등록 테스트 및 화면 캡처
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// 기능 1 테스트 결과를 활용하기 위해 로그인 함수 가져오기
const { testLogin: loginTest } = require('./test-feature-1-login');

// 설정
const config = {
  frontendUrl: process.env.FRONTEND_URL || 'https://insighti.vercel.app',
  backendUrl: process.env.BACKEND_URL || 'https://insighti-backend-v2.onrender.com',
  screenshotsDir: path.join(__dirname, '..', '..', 'test-screenshots', 'feature-2-defect'),
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
    memo: '자동 테스트로 등록된 하자입니다'
  }
};

// 유틸리티 함수
async function takeScreenshot(page, name, description = '') {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
  const filename = `02-${name}-${timestamp}.png`;
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

// 로그인 헬퍼 함수
async function login(page) {
  console.log('🔐 로그인 진행 중...');
  
  // 로그인 화면으로 이동
  await page.goto(config.frontendUrl, { waitUntil: 'networkidle0' });
  await page.waitForTimeout(2000);
  
  // 로그인 정보 입력
  const fields = {
    '#login-complex': testData.login.complex,
    '#login-dong': testData.login.dong,
    '#login-ho': testData.login.ho,
    '#login-name': testData.login.name,
    '#login-phone': testData.login.phone
  };
  
  for (const [selector, value] of Object.entries(fields)) {
    const element = await page.$(selector);
    if (element) {
      await element.click({ clickCount: 3 });
      await element.type(value, { delay: 100 });
      await page.waitForTimeout(300);
    }
  }
  
  // 로그인 버튼 클릭
  let loginButton = await page.$('button[onclick="onLogin()"]');
  if (!loginButton) {
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
    await page.waitForTimeout(5000);
    
    // 로그인 성공 확인
    const listScreen = await page.$('#list');
    const listScreenVisible = listScreen ? await page.evaluate(el => {
      return !el.classList.contains('hidden');
    }, listScreen) : false;
    
    if (listScreenVisible) {
      console.log('✅ 로그인 성공\n');
      return true;
    }
  }
  
  return false;
}

// 기능 2: 하자 등록 테스트
async function testDefectRegistration() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 기능 2: 하자 등록 테스트');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`프론트엔드: ${config.frontendUrl}`);
  console.log(`백엔드: ${config.backendUrl}`);
  console.log(`스크린샷: ${config.screenshotsDir}\n`);
  
  let browser;
  let page;
  
  try {
    // 브라우저 실행
    console.log('🌐 브라우저 실행 중...');
    
    const chromePaths = [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Chromium.app/Contents/MacOS/Chromium'
    ];
    
    let executablePath = null;
    for (const path of chromePaths) {
      if (fs.existsSync(path)) {
        executablePath = path;
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
        '--disable-gpu'
      ]
    };
    
    if (executablePath) {
      launchOptions.executablePath = executablePath;
    }
    
    browser = await puppeteer.launch(launchOptions);
    page = await browser.newPage();
    await page.setViewport(config.viewport);
    await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15');
    
    console.log('✅ 브라우저 실행 완료\n');
    
    // 1. 로그인
    const loginSuccess = await login(page);
    if (!loginSuccess) {
      throw new Error('로그인 실패');
    }
    
    await takeScreenshot(page, 'after-login', '로그인 후 하자 목록 화면');
    
    // 2. 하자 등록 화면으로 이동
    console.log('1️⃣ 하자 등록 화면 이동 중...');
    
    // 하자 등록 버튼 찾기 (탭바 또는 버튼)
    const defectButtons = await page.$$('button, .tab-item, [onclick*="defect"], [onclick*="하자"]');
    let defectButton = null;
    
    for (const btn of defectButtons) {
      const text = await page.evaluate(el => el.textContent || el.innerText, btn);
      if (text && (text.includes('하자') || text.includes('등록'))) {
        defectButton = btn;
        console.log(`✅ 하자 등록 버튼 발견: ${text}`);
        break;
      }
    }
    
    if (defectButton) {
      await defectButton.click();
      await page.waitForTimeout(2000);
    } else {
      // 직접 화면으로 이동 시도
      await page.evaluate(() => {
        if (window.route) {
          window.route('defect');
        }
      });
      await page.waitForTimeout(2000);
    }
    
    // 하자 등록 화면 확인
    const defectScreen = await page.$('#defect');
    if (defectScreen) {
      const isVisible = await page.evaluate(el => !el.classList.contains('hidden'), defectScreen);
      if (isVisible) {
        await takeScreenshot(page, 'defect-form-screen', '하자 등록 화면');
        console.log('✅ 하자 등록 화면 확인\n');
      }
    }
    
    // 3. 하자 정보 입력
    console.log('2️⃣ 하자 정보 입력 중...');
    
    // 위치 입력
    const locationField = await page.$('#def-location');
    if (locationField) {
      await locationField.click({ clickCount: 3 });
      await locationField.type(testData.defect.location, { delay: 100 });
      await page.waitForTimeout(500);
    }
    
    // 세부공정 입력
    const tradeField = await page.$('#def-trade');
    if (tradeField) {
      await tradeField.click({ clickCount: 3 });
      await tradeField.type(testData.defect.trade, { delay: 100 });
      await page.waitForTimeout(500);
    }
    
    // 하자 내용 입력
    const contentField = await page.$('#def-content');
    if (contentField) {
      await contentField.click({ clickCount: 3 });
      await contentField.type(testData.defect.content, { delay: 100 });
      await page.waitForTimeout(500);
    }
    
    // 메모 입력
    const memoField = await page.$('#def-memo');
    if (memoField) {
      await memoField.click({ clickCount: 3 });
      await memoField.type(testData.defect.memo, { delay: 100 });
      await page.waitForTimeout(500);
    }
    
    await takeScreenshot(page, 'defect-form-filled', '하자 정보 입력 완료');
    console.log('✅ 하자 정보 입력 완료\n');
    
    // 4. 하자 등록 버튼 클릭
    console.log('3️⃣ 하자 등록 버튼 클릭 중...');
    
    const saveButtons = await page.$$('button');
    let saveButton = null;
    
    for (const btn of saveButtons) {
      const text = await page.evaluate(el => el.textContent || el.innerText, btn);
      const onclick = await page.evaluate(el => el.getAttribute('onclick'), btn);
      
      if ((text && (text.includes('저장') || text.includes('등록') || text.includes('제출'))) ||
          (onclick && onclick.includes('SaveDefect') || onclick.includes('onSaveDefect'))) {
        saveButton = btn;
        console.log(`✅ 저장 버튼 발견: ${text || onclick}`);
        break;
      }
    }
    
    if (saveButton) {
      await saveButton.click();
      console.log('✅ 하자 등록 버튼 클릭 완료\n');
      
      // 등록 처리 대기
      console.log('⏳ 하자 등록 처리 대기 중...');
      await page.waitForTimeout(5000);
      
      // 5. 등록 결과 확인
      console.log('4️⃣ 하자 등록 결과 확인 중...');
      
      // 성공 메시지 확인
      const successSelectors = ['.toast.success', '.success-message', '.toast[style*="success"]'];
      let hasSuccess = false;
      let successText = '';
      
      for (const selector of successSelectors) {
        const successElement = await page.$(selector);
        if (successElement) {
          successText = await page.evaluate(el => el.textContent || el.innerText, successElement);
          hasSuccess = true;
          break;
        }
      }
      
      // 에러 메시지 확인
      const errorSelectors = ['.toast.error', '.error-message'];
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
      
      if (hasSuccess) {
        await takeScreenshot(page, 'defect-registered-success', `하자 등록 성공: ${successText}`);
        console.log(`✅ 하자 등록 성공: ${successText}\n`);
        
        // 하자 목록에 추가되었는지 확인
        await page.waitForTimeout(2000);
        await takeScreenshot(page, 'defect-list-updated', '하자 목록 업데이트 확인');
        
        return {
          success: true,
          message: successText,
          screenshots: [
            path.join(config.screenshotsDir, '02-*-defect-form-screen-*.png'),
            path.join(config.screenshotsDir, '02-*-defect-form-filled-*.png'),
            path.join(config.screenshotsDir, '02-*-defect-registered-success-*.png'),
            path.join(config.screenshotsDir, '02-*-defect-list-updated-*.png')
          ]
        };
      } else if (hasError) {
        await takeScreenshot(page, 'defect-registered-failed', `하자 등록 실패: ${errorText}`);
        console.log(`❌ 하자 등록 실패: ${errorText}\n`);
        return {
          success: false,
          error: errorText,
          screenshots: []
        };
      } else {
        await takeScreenshot(page, 'defect-registered-unknown', '하자 등록 상태 불명확');
        console.log('⚠️ 하자 등록 상태를 확인할 수 없습니다\n');
        return {
          success: false,
          error: '등록 상태를 확인할 수 없습니다',
          screenshots: []
        };
      }
    } else {
      await takeScreenshot(page, 'save-button-not-found', '저장 버튼을 찾을 수 없음');
      throw new Error('저장 버튼을 찾을 수 없습니다');
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
  testDefectRegistration()
    .then(result => {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📊 테스트 결과');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`결과: ${result.success ? '✅ 성공' : '❌ 실패'}`);
      if (result.message) {
        console.log(`메시지: ${result.message}`);
      }
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

module.exports = { testDefectRegistration, config };

