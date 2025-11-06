// 기능 6: 관리자 기능 테스트 및 화면 캡처
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// 설정
const config = {
  frontendUrl: process.env.FRONTEND_URL || 'https://insighti.vercel.app',
  adminUrl: process.env.ADMIN_URL || 'https://insighti.vercel.app/admin.html',
  backendUrl: process.env.BACKEND_URL || 'https://mobile-app-new.onrender.com',
  screenshotsDir: path.join(__dirname, '..', '..', 'test-screenshots', 'feature-6-admin'),
  waitTimeout: 30000,
  viewport: {
    width: 1280,
    height: 720,
    isMobile: false,
    deviceScaleFactor: 1
  }
};

// 스크린샷 디렉토리 생성
if (!fs.existsSync(config.screenshotsDir)) {
  fs.mkdirSync(config.screenshotsDir, { recursive: true });
}

// 테스트 데이터
const testData = {
  admin: {
    email: process.env.ADMIN_EMAIL || 'admin@insighti.com',
    password: process.env.ADMIN_PASSWORD || 'admin123'
  }
};

// 유틸리티 함수
async function takeScreenshot(page, name, description = '') {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
  const filename = `06-${name}-${timestamp}.png`;
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

// 관리자 로그인
async function adminLogin(page) {
  console.log('🔐 관리자 로그인 진행 중...');
  
  await page.goto(config.adminUrl, { 
    waitUntil: 'networkidle0', 
    timeout: 60000,
    cache: false // 캐시 무시
  });
  await page.waitForTimeout(3000);
  
  // API_BASE를 올바른 백엔드 URL로 설정 (apiCall 함수 오버라이드)
  await page.evaluate((backendUrl) => {
    // apiCall 함수를 오버라이드하여 올바른 백엔드 URL 사용
    if (typeof apiCall === 'function') {
      const originalApiCall = window.apiCall;
      window.apiCall = async function(endpoint, options = {}) {
        const headers = {
          'Content-Type': 'application/json',
          ...options.headers
        };
        
        if (window.AdminState && window.AdminState.token) {
          headers['Authorization'] = `Bearer ${window.AdminState.token}`;
        }
        
        const response = await fetch(`${backendUrl}${endpoint}`, {
          ...options,
          headers
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'API 요청 실패');
        }
        
        return response.json();
      };
    }
    
    // API_BASE도 재설정
    if (typeof API_BASE !== 'undefined') {
      window.API_BASE = backendUrl;
    }
    window.API_BASE = backendUrl;
  }, config.backendUrl);
  
  await page.waitForTimeout(2000);
  
  // 로그인 화면 확인
  const loginScreen = await page.$('#login-screen');
  if (!loginScreen) {
    // 이미 로그인되어 있는지 확인
    const dashboard = await page.$('#admin-dashboard');
    if (dashboard) {
      const isVisible = await page.evaluate(el => !el.classList.contains('hidden'), dashboard);
      if (isVisible) {
        console.log('✅ 이미 로그인되어 있습니다\n');
        return true;
      }
    }
  }
  
  // 이메일 입력
  const emailField = await page.$('#admin-email');
  if (emailField) {
    await emailField.click({ clickCount: 3 });
    await emailField.type(testData.admin.email, { delay: 100 });
    await page.waitForTimeout(500);
  }
  
  // 비밀번호 입력
  const passwordField = await page.$('#admin-password');
  if (passwordField) {
    await passwordField.click({ clickCount: 3 });
    await passwordField.type(testData.admin.password, { delay: 100 });
    await page.waitForTimeout(500);
  }
  
  await takeScreenshot(page, 'admin-login-filled', '관리자 로그인 정보 입력 완료');
  
  // 로그인 버튼 클릭
  const loginButton = await page.$('button[onclick="adminLogin()"]');
  if (loginButton) {
    await loginButton.click();
    await page.waitForTimeout(8000); // 로그인 처리 시간 증가
    
    // 로그인 성공 확인
    const dashboard = await page.$('#admin-dashboard');
    let dashboardVisible = dashboard ? await page.evaluate(el => {
      return !el.classList.contains('hidden');
    }, dashboard) : false;
    
    // 추가 대기 후 재확인
    if (!dashboardVisible) {
      await page.waitForTimeout(3000);
      const dashboard2 = await page.$('#admin-dashboard');
      dashboardVisible = dashboard2 ? await page.evaluate(el => {
        return !el.classList.contains('hidden');
      }, dashboard2) : false;
    }
    
    if (dashboardVisible) {
      await page.waitForTimeout(2000);
      await takeScreenshot(page, 'admin-dashboard', '관리자 대시보드');
      console.log('✅ 관리자 로그인 성공\n');
      return true;
    } else {
      // 에러 메시지 확인
      const errorSelectors = ['.toast.error', '.error-message', '.toast.show'];
      let errorText = '';
      
      for (const selector of errorSelectors) {
        const errorElement = await page.$(selector);
        if (errorElement) {
          errorText = await page.evaluate(el => el.textContent || el.innerText, errorElement);
          if (errorText && errorText.trim().length > 0) {
            break;
          }
        }
      }
      
      // 콘솔 에러 확인
      const consoleErrors = await page.evaluate(() => {
        return window.consoleErrors || [];
      });
      
      if (errorText) {
        console.error(`❌ 로그인 실패: ${errorText}`);
      } else if (consoleErrors.length > 0) {
        console.error(`❌ 콘솔 에러: ${consoleErrors.join(', ')}`);
      } else {
        console.error('❌ 로그인 실패: 원인 불명 (대시보드가 표시되지 않음)');
      }
      
      await takeScreenshot(page, 'admin-login-failed', '관리자 로그인 실패');
      return false;
    }
  }
  
  console.error('❌ 로그인 버튼을 찾을 수 없습니다');
  return false;
}

// 관리자 화면 전환
async function switchAdminScreen(page, screenName) {
  console.log(`📋 ${screenName} 화면으로 전환 중...`);
  
  await page.evaluate((name) => {
    if (typeof showScreen === 'function') {
      showScreen(name);
    } else if (window.showScreen) {
      window.showScreen(name);
    }
  }, screenName);
  
  await page.waitForTimeout(2000);
  
  // 화면 확인
  const screenElement = await page.$(`#screen-${screenName}`);
  if (screenElement) {
    const isVisible = await page.evaluate(el => !el.classList.contains('hidden'), screenElement);
    if (isVisible) {
      await takeScreenshot(page, `admin-${screenName}`, `${screenName} 화면`);
      console.log(`✅ ${screenName} 화면 확인\n`);
      return true;
    }
  }
  
  return false;
}

// 관리자 계정 확인 및 생성
async function ensureAdminAccount() {
  console.log('🔍 관리자 계정 확인 중...');
  
  try {
    const response = await fetch(`${config.backendUrl}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testData.admin.email,
        password: testData.admin.password
      })
    });
    
    if (response.status === 200) {
      const data = await response.json();
      console.log('✅ 관리자 계정 확인됨');
      console.log(`   이름: ${data.admin.name}`);
      console.log(`   역할: ${data.admin.role}\n`);
      return true;
    } else {
      const error = await response.json();
      console.log('⚠️  관리자 계정이 없거나 비밀번호가 틀립니다');
      console.log(`   오류: ${error.error || 'Unknown error'}\n`);
      console.log('💡 관리자 계정 생성 방법:');
      console.log(`   DATABASE_URL="..." node backend/scripts/create-admin.js\n`);
      return false;
    }
  } catch (error) {
    console.log('⚠️  관리자 계정 확인 실패:', error.message);
    console.log('   관리자 계정이 없을 수 있습니다\n');
    return false;
  }
}

// 기능 6: 관리자 기능 테스트
async function testAdminFeatures() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 기능 6: 관리자 기능 테스트');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`관리자 URL: ${config.adminUrl}`);
  console.log(`백엔드: ${config.backendUrl}`);
  console.log(`스크린샷: ${config.screenshotsDir}\n`);
  
  // 관리자 계정 확인
  const adminExists = await ensureAdminAccount();
  if (!adminExists) {
    console.log('⚠️  관리자 계정이 없습니다. 테스트를 계속 진행하지만 로그인은 실패할 수 있습니다.\n');
  }
  
  let browser;
  let page;
  const results = [];
  
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
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
    
    // 콘솔 에러 수집
    page.on('console', msg => {
      if (msg.type() === 'error') {
        page.evaluate((error) => {
          if (!window.consoleErrors) window.consoleErrors = [];
          window.consoleErrors.push(error);
        }, msg.text());
      }
    });
    
    // 페이지 에러 수집
    page.on('pageerror', error => {
      page.evaluate((err) => {
        if (!window.consoleErrors) window.consoleErrors = [];
        window.consoleErrors.push(err.toString());
      }, error);
    });
    
    console.log('✅ 브라우저 실행 완료\n');
    
    // 1. 관리자 로그인
    const loginSuccess = await adminLogin(page);
    
    if (!loginSuccess) {
      // 로그인 실패 시에도 관리자 화면 구조 확인
      console.log('⚠️ 관리자 로그인 실패했지만 화면 구조 확인 진행\n');
      
      // 로그인 화면 캡처
      await takeScreenshot(page, 'admin-login-screen', '관리자 로그인 화면');
      
      // 관리자 대시보드가 숨겨져 있는지 확인
      const dashboard = await page.$('#admin-dashboard');
      if (dashboard) {
        const dashboardHTML = await page.evaluate(el => el.innerHTML, dashboard);
        console.log('📋 관리자 대시보드 HTML 구조 확인됨');
        await takeScreenshot(page, 'admin-dashboard-hidden', '관리자 대시보드 (숨김 상태)');
      }
      
      results.push({ feature: '관리자 로그인', success: false, note: 'CORS 오류 또는 관리자 계정 없음' });
      results.push({ feature: '대시보드', success: false, note: '로그인 필요' });
      results.push({ feature: '사용자 관리', success: false, note: '로그인 필요' });
      results.push({ feature: '점검원 관리', success: false, note: '로그인 필요' });
      results.push({ feature: '하자 관리', success: false, note: '로그인 필요' });
      
      return {
        success: false,
        error: '관리자 로그인 실패 (CORS 오류 또는 관리자 계정 없음)',
        results
      };
    }
    
    // 2. 대시보드 확인
    console.log('1️⃣ 대시보드 확인 중...');
    const dashboardSuccess = await switchAdminScreen(page, 'dashboard');
    results.push({ feature: '대시보드', success: dashboardSuccess });
    
    // 3. 사용자 관리 화면
    console.log('2️⃣ 사용자 관리 화면 확인 중...');
    const usersSuccess = await switchAdminScreen(page, 'users');
    results.push({ feature: '사용자 관리', success: usersSuccess });
    
    // 4. 점검원 관리 화면
    console.log('3️⃣ 점검원 관리 화면 확인 중...');
    const inspectorsSuccess = await switchAdminScreen(page, 'inspectors');
    results.push({ feature: '점검원 관리', success: inspectorsSuccess });
    
    // 5. 하자 관리 화면
    console.log('4️⃣ 하자 관리 화면 확인 중...');
    const defectsSuccess = await switchAdminScreen(page, 'defects');
    results.push({ feature: '하자 관리', success: defectsSuccess });
    
    // 6. 최종 화면 캡처
    await takeScreenshot(page, 'admin-final', '관리자 최종 화면');
    
    return {
      success: results.every(r => r.success),
      results
    };
    
  } catch (error) {
    console.error('❌ 테스트 오류:', error.message);
    if (page) {
      await takeScreenshot(page, 'error', `오류: ${error.message}`);
    }
    return {
      success: false,
      error: error.message,
      results
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
  testAdminFeatures()
    .then(result => {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📊 테스트 결과');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`전체 결과: ${result.success ? '✅ 성공' : '❌ 실패'}`);
      console.log('\n상세 결과:');
      result.results.forEach(r => {
        console.log(`  ${r.success ? '✅' : '❌'} ${r.feature}: ${r.success ? '성공' : '실패'}`);
      });
      if (result.error) {
        console.log(`\n오류: ${result.error}`);
      }
      console.log(`\n스크린샷 위치: ${config.screenshotsDir}\n`);
      
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ 테스트 실행 실패:', error);
      process.exit(1);
    });
}

module.exports = { testAdminFeatures, config };

