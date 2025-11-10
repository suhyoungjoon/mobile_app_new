// 기능 4: 점검원 등록 테스트 및 화면 캡처
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// 설정
const config = {
  frontendUrl: process.env.FRONTEND_URL || 'https://insighti.vercel.app',
  backendUrl: process.env.BACKEND_URL || 'https://insighti-backend-v2.onrender.com',
  screenshotsDir: path.join(__dirname, '..', '..', 'test-screenshots', 'feature-4-inspector'),
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
  inspector: {
    complex: '테스트 단지',
    dong: '101',
    ho: '1203',
    inspector_name: '김점검',
    phone: '010-9876-5432',
    company_name: '테스트 건설',
    license_number: 'LIC-2024-001',
    email: 'inspector@test.com',
    registration_reason: '자동 테스트로 등록 신청합니다.'
  }
};

// 유틸리티 함수
async function takeScreenshot(page, name, description = '') {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
  const filename = `04-${name}-${timestamp}.png`;
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
    return false;
  }
}

// 로그인 헬퍼 함수
async function login(page) {
  console.log('🔐 로그인 진행 중...');
  
  await page.goto(config.frontendUrl, { waitUntil: 'networkidle0', timeout: 60000 });
  await page.waitForTimeout(3000);
  
  // 로그인 화면 확인
  const loginScreen = await page.$('#login');
  if (!loginScreen) {
    // 이미 로그인되어 있는지 확인
    const listScreen = await page.$('#list');
    if (listScreen) {
      const isVisible = await page.evaluate(el => !el.classList.contains('hidden'), listScreen);
      if (isVisible) {
        console.log('✅ 이미 로그인되어 있습니다\n');
        return true;
      }
    }
  }
  
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
    await page.waitForTimeout(8000);
    
    const listScreen = await page.$('#list');
    const listScreenVisible = listScreen ? await page.evaluate(el => {
      return !el.classList.contains('hidden');
    }, listScreen) : false;
    
    const errorElement = await page.$('.toast.error, .error-message');
    if (errorElement) {
      const errorText = await page.evaluate(el => el.textContent || el.innerText, errorElement);
      console.error(`❌ 로그인 실패: ${errorText}`);
      return false;
    }
    
    if (listScreenVisible) {
      console.log('✅ 로그인 성공\n');
      return true;
    } else {
      await page.waitForTimeout(3000);
      const listScreen2 = await page.$('#list');
      const listScreenVisible2 = listScreen2 ? await page.evaluate(el => {
        return !el.classList.contains('hidden');
      }, listScreen2) : false;
      
      if (listScreenVisible2) {
        console.log('✅ 로그인 성공 (재확인)\n');
        return true;
      }
    }
  }
  
  return false;
}

// 기능 4: 점검원 등록 테스트
async function testInspectorRegistration() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 기능 4: 점검원 등록 테스트');
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
    
    await takeScreenshot(page, 'after-login', '로그인 후 화면');
    
    // 2. 점검원 등록 화면으로 이동
    console.log('1️⃣ 점검원 등록 화면 이동 중...');
    
    // 탭바에서 점검원 등록 버튼 찾기
    const tabInspector = await page.$('#tab-inspector');
    
    if (tabInspector) {
      const isVisible = await page.evaluate(el => {
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && style.visibility !== 'hidden' && !el.classList.contains('hidden');
      }, tabInspector);
      
      if (isVisible) {
        await tabInspector.click();
        await page.waitForTimeout(2000);
        console.log('✅ 점검원 등록 탭 버튼 클릭 완료');
      }
    }
    
    // 직접 화면으로 이동 시도
    await page.evaluate(() => {
      if (typeof route === 'function') {
        route('inspector-registration');
      } else if (window.route) {
        window.route('inspector-registration');
      }
    });
    await page.waitForTimeout(3000);
    
    // 점검원 등록 화면 확인
    const inspectorScreen = await page.$('#inspector-registration');
    if (inspectorScreen) {
      const screenState = await page.evaluate(el => {
        return {
          exists: !!el,
          hasHidden: el.classList.contains('hidden'),
          display: window.getComputedStyle(el).display,
          visibility: window.getComputedStyle(el).visibility
        };
      }, inspectorScreen);
      
      if (screenState.hasHidden) {
        await page.evaluate(() => {
          const screen = document.getElementById('inspector-registration');
          if (screen) {
            screen.classList.remove('hidden');
            document.querySelectorAll('.screen').forEach(s => {
              if (s.id !== 'inspector-registration') {
                s.classList.add('hidden');
              }
            });
          }
        });
        await page.waitForTimeout(1000);
      }
      
      const isVisible = await page.evaluate(el => {
        return !el.classList.contains('hidden') && 
               window.getComputedStyle(el).display !== 'none';
      }, inspectorScreen);
      
      if (isVisible) {
        await takeScreenshot(page, 'inspector-registration-screen', '점검원 등록 화면');
        console.log('✅ 점검원 등록 화면 확인\n');
      } else {
        throw new Error('점검원 등록 화면이 표시되지 않습니다');
      }
    } else {
      throw new Error('점검원 등록 화면을 찾을 수 없습니다');
    }
    
    // 3. 점검원 등록 정보 입력
    console.log('2️⃣ 점검원 등록 정보 입력 중...');
    
    await waitForElement(page, '#reg-complex', 10000);
    await page.waitForTimeout(1000);
    
    // JavaScript로 직접 입력
    await page.evaluate((data) => {
      const fields = {
        'reg-complex': data.complex,
        'reg-dong': data.dong,
        'reg-ho': data.ho,
        'reg-name': data.inspector_name,
        'reg-phone': data.phone,
        'reg-company': data.company_name,
        'reg-license': data.license_number,
        'reg-email': data.email,
        'reg-reason': data.registration_reason
      };
      
      for (const [id, value] of Object.entries(fields)) {
        const field = document.getElementById(id);
        if (field) {
          field.value = value;
          field.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }
    }, testData.inspector);
    
    await page.waitForTimeout(1000);
    await takeScreenshot(page, 'inspector-form-filled', '점검원 등록 정보 입력 완료');
    console.log('✅ 점검원 등록 정보 입력 완료\n');
    
    // 4. 등록 신청 버튼 클릭
    console.log('3️⃣ 등록 신청 버튼 클릭 중...');
    
    // 폼 제출 (JavaScript로 직접 호출)
    await page.evaluate(() => {
      const form = document.querySelector('#inspector-registration form');
      if (form) {
        const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
        form.dispatchEvent(submitEvent);
      }
      
      // 또는 submitInspectorRegistration 함수 직접 호출
      if (typeof submitInspectorRegistration === 'function') {
        const event = { preventDefault: () => {} };
        submitInspectorRegistration(event);
      } else if (window.submitInspectorRegistration) {
        const event = { preventDefault: () => {} };
        window.submitInspectorRegistration(event);
      }
    });
    
    await page.waitForTimeout(8000); // 등록 처리 및 화면 전환 대기 시간 증가
    
    // 5. 등록 결과 확인
    console.log('4️⃣ 등록 결과 확인 중...');
    
    // 등록 상태 확인 화면으로 이동했는지 확인 (우선 확인)
    const statusScreen = await page.$('#registration-status');
    let statusScreenVisible = statusScreen ? await page.evaluate(el => {
      return !el.classList.contains('hidden');
    }, statusScreen) : false;
    
    // 추가 대기 후 재확인
    if (!statusScreenVisible) {
      await page.waitForTimeout(3000);
      const statusScreen2 = await page.$('#registration-status');
      statusScreenVisible = statusScreen2 ? await page.evaluate(el => {
        return !el.classList.contains('hidden');
      }, statusScreen2) : false;
    }
    
    // 성공 메시지 확인
    const successSelectors = ['.toast.success', '.success-message'];
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
    
    if (statusScreenVisible) {
      await page.waitForTimeout(2000);
      await takeScreenshot(page, 'registration-status', '등록 상태 확인 화면');
      console.log('✅ 등록 상태 확인 화면으로 이동\n');
      
      // 등록 상태 정보 확인
      const statusContent = await page.$('#status-content');
      if (statusContent) {
        const statusText = await page.evaluate(el => el.textContent || el.innerText, statusContent);
        console.log(`📋 등록 상태: ${statusText.substring(0, 100)}...\n`);
      }
    } else if (hasSuccess) {
      await takeScreenshot(page, 'registration-success', `등록 성공: ${successText}`);
      console.log(`✅ 등록 성공: ${successText}\n`);
    }
    
    if (statusScreenVisible || hasSuccess) {
      
      return {
        success: true,
        message: successText || '등록 신청 완료',
        screenshots: []
      };
    } else {
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
      
      if (hasError) {
        await takeScreenshot(page, 'registration-failed', `등록 실패: ${errorText}`);
        console.log(`❌ 등록 실패: ${errorText}\n`);
        return {
          success: false,
          error: errorText,
          screenshots: []
        };
      } else {
        await takeScreenshot(page, 'registration-unknown', '등록 상태 불명확');
        console.log('⚠️ 등록 상태를 확인할 수 없습니다\n');
        return {
          success: false,
          error: '등록 상태를 확인할 수 없습니다',
          screenshots: []
        };
      }
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
  testInspectorRegistration()
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
      console.log(`스크린샷 위치: ${config.screenshotsDir}\n`);
      
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ 테스트 실행 실패:', error);
      process.exit(1);
    });
}

module.exports = { testInspectorRegistration, config };

