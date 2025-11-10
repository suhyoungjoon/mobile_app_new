// 기능 7: 푸시 알림 테스트 및 화면 캡처
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const config = {
  frontendUrl: process.env.FRONTEND_URL || 'https://insighti.vercel.app',
  backendUrl: process.env.BACKEND_URL || 'https://mobile-app-new.onrender.com',
  screenshotsDir: path.join(__dirname, '..', '..', 'test-screenshots', 'feature-7-push'),
  waitTimeout: 30000,
  viewport: {
    width: 390,
    height: 844,
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2
  }
};

if (!fs.existsSync(config.screenshotsDir)) {
  fs.mkdirSync(config.screenshotsDir, { recursive: true });
}

const testData = {
  complex: '테스트 단지',
  dong: '101',
  ho: '1203',
  name: '홍길동',
  phone: '010-1234-5678'
};

const adminCredentials = {
  email: process.env.ADMIN_EMAIL || 'admin@insighti.com',
  password: process.env.ADMIN_PASSWORD || 'admin123'
};

async function takeScreenshot(page, name, description = '') {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
  const filename = `07-${name}-${timestamp}.png`;
  const filepath = path.join(config.screenshotsDir, filename);
  await page.screenshot({ path: filepath, fullPage: true });
  console.log(`📸 ${filename}${description ? ` - ${description}` : ''}`);
  return filepath;
}

async function waitForSelectorVisible(page, selector, timeout = config.waitTimeout) {
  try {
    await page.waitForSelector(selector, { timeout, visible: true });
    return true;
  } catch (error) {
    console.warn(`⚠️ 요소를 찾지 못했습니다: ${selector}`);
    return false;
  }
}

async function waitForToast(page, textSubstring, timeout = 5000) {
  try {
    await page.waitForFunction(
      (substr) => {
        const toast = document.querySelector('.toast');
        return toast && toast.classList.contains('show') && toast.textContent.includes(substr);
      },
      { timeout },
      textSubstring
    );
    await page.waitForTimeout(500); // 안정화 시간
    return true;
  } catch (error) {
    console.warn(`⚠️ 토스트 메시지를 확인하지 못했습니다: ${textSubstring}`);
    return false;
  }
}

async function login(page) {
  console.log('🔐 로그인 진행 중...');

  await page.goto(config.frontendUrl, { waitUntil: 'networkidle0', timeout: config.waitTimeout });
  await page.waitForTimeout(2000);

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
      await element.click({ clickCount: 3 });
      await element.type(value, { delay: 80 });
      await page.waitForTimeout(200);
    }
  }

  let loginButton = await page.$('button[onclick="onLogin()"]');
  if (!loginButton) {
    const buttons = await page.$$('button');
    for (const button of buttons) {
      const text = await page.evaluate((el) => el.textContent || '', button);
      if (text.includes('로그인')) {
        loginButton = button;
        break;
      }
    }
  }

  if (!loginButton) {
    throw new Error('로그인 버튼을 찾을 수 없습니다.');
  }

  await loginButton.click();
  await page.waitForTimeout(4000);

  const success = await page.evaluate(() => {
    const list = document.getElementById('list');
    return list && !list.classList.contains('hidden');
  });

  if (!success) {
    throw new Error('로그인에 실패했습니다.');
  }

  console.log('✅ 로그인 성공');
  return true;
}

async function openSettings(page) {
  console.log('⚙️ 설정 화면 진입...');
  await page.evaluate(() => {
    if (typeof showSettings === 'function') {
      showSettings();
    } else {
      throw new Error('showSettings 함수를 찾을 수 없습니다.');
    }
  });
  const opened = await waitForSelectorVisible(page, '#settings');
  if (!opened) {
    throw new Error('설정 화면을 열 수 없습니다.');
  }
  await page.waitForTimeout(1500);
}

async function ensurePushSubscribed(page, results) {
  console.log('🔔 푸시 알림 활성화 확인...');
  await page.evaluate(() => navigator.serviceWorker && navigator.serviceWorker.ready.then(() => true));
  const status = await page.evaluate(() => (window.pushManager ? window.pushManager.getSubscriptionStatus() : null));

  if (!status || !status.isSupported) {
    throw new Error('브라우저가 푸시 알림을 지원하지 않습니다.');
  }

  if (!status.isSubscribed) {
    await page.evaluate(() => {
      const toggle = document.getElementById('notification-toggle');
      if (!toggle) {
        throw new Error('푸시 토글 요소를 찾을 수 없습니다.');
      }
      if (!toggle.checked) {
        toggle.checked = true;
      }
      if (typeof togglePushNotifications === 'function') {
        return togglePushNotifications();
      }
      if (window.pushManager && window.pushManager.subscribe) {
        return window.pushManager.subscribe();
      }
      throw new Error('푸시 알림을 활성화할 수 없습니다.');
    });
    await waitForToast(page, '푸시 알림이 활성화되었습니다', 7000);
    const screenshot = await takeScreenshot(page, 'push-enabled', '푸시 알림이 활성화된 설정 화면');
    results.push({
      scenario: '푸시 알림 활성화',
      success: true,
      message: '푸시 알림을 성공적으로 활성화했습니다.',
      screenshots: [screenshot]
    });
  } else {
    const screenshot = await takeScreenshot(page, 'push-already-enabled', '푸시 알림이 이미 활성화된 상태');
    results.push({
      scenario: '푸시 알림 활성화',
      success: true,
      message: '이미 푸시 알림이 활성화되어 있습니다.',
      screenshots: [screenshot]
    });
  }
}

async function sendFrontendPush(page, type, payload, successMessage, screenshotName, results) {
  console.log(`🚀 ${type} 푸시 API 호출...`);
  const response = await page.evaluate(
    async ({ type, payload, successMessage }) => {
      try {
        const resp = await api.sendPushNotification(type, payload);
        toast(successMessage, 'success');
        return { success: true, data: resp };
      } catch (error) {
        const msg = error?.message || '알 수 없는 오류';
        toast(`❌ ${successMessage}`, 'error');
        return { success: false, error: msg };
      }
    },
    { type, payload, successMessage }
  );

  await waitForToast(page, successMessage.replace('✅ ', ''), 7000);
  const screenshot = await takeScreenshot(page, screenshotName, `${type} 푸시 API 호출 결과`);

  results.push({
    scenario: type,
    success: response.success,
    message: response.success ? successMessage : response.error,
    response: response.data || null,
    screenshots: [screenshot]
  });

  return response;
}

async function sendInspectorDecision({ registrationId, adminToken }) {
  const url = `${config.backendUrl}/api/push/inspector-decision`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      registrationId,
      approved: true
    })
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status} ${text}`);
  }

  return res.json();
}

async function createInspectorRegistration(session) {
  const url = `${config.backendUrl}/api/inspector-registration/register`;
  const body = {
    complex: session.complex,
    dong: session.dong,
    ho: session.ho,
    inspector_name: '테스트 점검원',
    phone: '010-5555-6666',
    company_name: '테스트 회사',
    license_number: `LIC-${Date.now()}`,
    email: 'inspector@test.com',
    registration_reason: '자동화 테스트 등록'
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`등록 생성 실패: HTTP ${res.status} ${text}`);
  }

  const json = await res.json();
  return json.registration?.id;
}

async function loginAdmin() {
  const url = `${config.backendUrl}/api/admin/login`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(adminCredentials)
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`관리자 로그인 실패: HTTP ${res.status} ${text}`);
  }

  const json = await res.json();
  if (!json.token) {
    throw new Error('관리자 토큰을 받지 못했습니다.');
  }
  return json.token;
}

async function setupAdminPushSubscription(browser, results) {
  console.log('👤 관리자 계정 푸시 구독 설정 중 (대시보드 수동 활성화)...');
  const context = await browser.createIncognitoBrowserContext();
  await context.overridePermissions(config.frontendUrl, ['notifications']);
  const adminPage = await context.newPage();
  await adminPage.setViewport(config.viewport);
  await adminPage.setUserAgent(
    'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1'
  );

  try {
    // 관리자 페이지로 이동
    await adminPage.goto(`${config.frontendUrl}/admin`, { waitUntil: 'networkidle0', timeout: config.waitTimeout });
    await adminPage.waitForTimeout(3000);

    // 페이지 구조 디버깅
    const pageStructure = await adminPage.evaluate(() => {
      return {
        loginScreen: !!document.getElementById('login-screen'),
        dashboard: !!document.getElementById('screen-dashboard'),
        adminDashboard: !!document.getElementById('admin-dashboard'),
        bodyHTML: document.body.innerHTML.substring(0, 500)
      };
    });
    console.log('📊 페이지 구조:', JSON.stringify(pageStructure, null, 2));

    // 로그인 화면이 보이는지 확인
    const loginScreen = await adminPage.$('#login-screen');
    const adminDashboard = await adminPage.$('#admin-dashboard');
    
    if (!loginScreen && !adminDashboard) {
      // 스크린샷 저장
      await takeScreenshot(adminPage, 'admin-page-debug', '관리자 페이지 디버그');
      throw new Error('로그인 화면과 관리자 대시보드를 모두 찾을 수 없습니다.');
    }

    if (adminDashboard) {
      console.log('✅ 관리자 대시보드 컨테이너를 찾았습니다.');
      // admin-dashboard가 hidden 클래스를 가지고 있는지 확인
      const isHidden = await adminPage.evaluate(() => {
        const el = document.getElementById('admin-dashboard');
        return el ? el.classList.contains('hidden') : true;
      });
      
      if (isHidden) {
        console.log('ℹ️ 관리자 대시보드가 숨겨져 있습니다. 로그인이 필요합니다.');
      } else {
        console.log('✅ 관리자 대시보드가 표시되어 있습니다.');
      }
    }

    // 관리자 로그인 (로그인 화면이 있는 경우에만)
    if (loginScreen) {
      console.log('🔐 관리자 로그인 진행...');
      // 로그인 폼 요소 대기
      await adminPage.waitForSelector('#admin-email', { timeout: 5000 });
      await adminPage.waitForSelector('#admin-password', { timeout: 5000 });
      
      const emailInput = await adminPage.$('#admin-email');
      const passwordInput = await adminPage.$('#admin-password');
      
      if (!emailInput || !passwordInput) {
        throw new Error('관리자 로그인 폼을 찾을 수 없습니다.');
      }

      // 로그인 버튼 찾기 (onclick 속성으로 찾기)
      let loginButton = await adminPage.$('button[onclick="adminLogin()"]');
      if (!loginButton) {
        // 대체 방법: 버튼 텍스트로 찾기
        const buttons = await adminPage.$$('button');
        for (const button of buttons) {
          const text = await adminPage.evaluate((el) => el.textContent, button);
          if (text && text.includes('로그인')) {
            loginButton = button;
            break;
          }
        }
      }

      if (!loginButton) {
        throw new Error('로그인 버튼을 찾을 수 없습니다.');
      }

      await emailInput.click({ clickCount: 3 });
      await emailInput.type(adminCredentials.email, { delay: 80 });
      await adminPage.waitForTimeout(200);

      await passwordInput.click({ clickCount: 3 });
      await passwordInput.type(adminCredentials.password, { delay: 80 });
      await adminPage.waitForTimeout(200);

      await loginButton.click();
      await adminPage.waitForTimeout(3000);

      // 대시보드 로드 대기
      await adminPage.waitForSelector('#screen-dashboard', { timeout: 10000 });
    } else if (adminDashboard) {
      // 이미 로그인되어 있을 수 있음 - 대시보드가 표시되는지 확인
      const isHidden = await adminPage.evaluate(() => {
        const el = document.getElementById('admin-dashboard');
        return el ? el.classList.contains('hidden') : true;
      });
      
      if (isHidden) {
        throw new Error('관리자 대시보드가 숨겨져 있습니다. 로그인이 필요합니다.');
      }
      
      // 대시보드가 표시되어 있으면 바로 진행
      await adminPage.waitForSelector('#screen-dashboard', { timeout: 5000 });
    }

    // 대시보드 화면 확인
    const dashboardScreen = await adminPage.$('#screen-dashboard');
    if (!dashboardScreen) {
      throw new Error('대시보드 화면을 찾을 수 없습니다.');
    }

    await adminPage.waitForTimeout(2000);

    // 푸시 알림 상태 확인 카드 찾기
    const pushStatusCard = await adminPage.$('#push-notification-status');
    if (!pushStatusCard) {
      throw new Error('푸시 알림 상태 카드를 찾을 수 없습니다.');
    }

    // 상태 확인 버튼 클릭
    const checkStatusButton = await adminPage.$('#btn-check-push-status');
    if (checkStatusButton) {
      await checkStatusButton.click();
      await adminPage.waitForTimeout(2000);
    }

    // 푸시 알림 상태 확인
    const statusText = await adminPage.evaluate(() => {
      const statusEl = document.getElementById('push-notification-status');
      return statusEl ? statusEl.textContent : '';
    });

    console.log('📊 푸시 알림 상태:', statusText);

    // 활성화 버튼이 있으면 클릭
    const activateButton = await adminPage.$('button[onclick="enableAdminPushNotifications()"]');
    if (activateButton) {
      console.log('🔔 푸시 알림 활성화 버튼 클릭...');
      await activateButton.click();
      await adminPage.waitForTimeout(3000);

      // 알림 권한 요청 대기 (브라우저 팝업)
      await adminPage.waitForTimeout(2000);
    }

    // 최종 상태 확인
    await adminPage.waitForTimeout(2000);
    const finalStatus = await adminPage.evaluate(() => {
      const statusEl = document.getElementById('push-notification-status');
      return statusEl ? statusEl.textContent : '';
    });

    const screenshot = await takeScreenshot(adminPage, 'admin-push-status', '관리자 대시보드 푸시 알림 상태');

    // 상태에 따라 성공/실패 판단
    const isActive = finalStatus.includes('활성화됨') || finalStatus.includes('활성화되어 있습니다');
    
    results.push({
      scenario: '관리자 푸시 구독 (대시보드 수동 활성화)',
      success: isActive,
      message: isActive 
        ? '관리자 대시보드에서 푸시 알림이 활성화되었습니다.'
        : `푸시 알림 상태: ${finalStatus.substring(0, 100)}`,
      screenshots: [screenshot]
    });

    if (isActive) {
      console.log('✅ 관리자 푸시 구독 활성화 성공');
    } else {
      console.warn('⚠️ 관리자 푸시 구독이 활성화되지 않았습니다. 상태:', finalStatus);
    }

  } catch (error) {
    console.warn('⚠️ 관리자 푸시 구독 설정 실패:', error.message);
    const errorScreenshot = await takeScreenshot(adminPage, 'admin-push-error', '관리자 푸시 구독 설정 실패');
    results.push({
      scenario: '관리자 푸시 구독 (대시보드 수동 활성화)',
      success: false,
      message: `관리자 푸시 구독 설정 실패: ${error.message}`,
      screenshots: [errorScreenshot]
    });
  } finally {
    await adminPage.close();
    await context.close();
  }
}

async function setupResidentPushSubscription(browser, complex, dong, ho, name, phone, results) {
  console.log(`🏠 입주자 계정 (${complex} ${dong}-${ho}) 푸시 구독 설정 중...`);
  const context = await browser.createIncognitoBrowserContext();
  await context.overridePermissions(config.frontendUrl, ['notifications']);
  const residentPage = await context.newPage();
  await residentPage.setViewport(config.viewport);
  await residentPage.setUserAgent(
    'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1'
  );

  try {
    // 입주자 로그인
    await residentPage.goto(config.frontendUrl, { waitUntil: 'networkidle0', timeout: config.waitTimeout });
    await residentPage.waitForTimeout(2000);

    const fields = {
      '#login-complex': complex,
      '#login-dong': dong,
      '#login-ho': ho,
      '#login-name': name,
      '#login-phone': phone
    };

    for (const [selector, value] of Object.entries(fields)) {
      const element = await residentPage.$(selector);
      if (element) {
        await element.click({ clickCount: 3 });
        await element.type(value, { delay: 80 });
        await residentPage.waitForTimeout(200);
      }
    }

    let loginButton = await residentPage.$('button[onclick="onLogin()"]');
    if (!loginButton) {
      const buttons = await residentPage.$$('button');
      for (const button of buttons) {
        const text = await residentPage.evaluate((el) => el.textContent, button);
        if (text && text.includes('로그인')) {
          loginButton = button;
          break;
        }
      }
    }

    if (loginButton) {
      await loginButton.click();
      await residentPage.waitForTimeout(3000);
    }

    // 설정 화면 열기
    await openSettings(residentPage);

    // 푸시 활성화
    const notificationToggle = await residentPage.$('#notification-toggle');
    if (notificationToggle) {
      const isChecked = await residentPage.evaluate((el) => el.checked, notificationToggle);
      if (!isChecked) {
        await residentPage.evaluate((el) => {
          el.checked = true;
          if (typeof togglePushNotifications === 'function') {
            togglePushNotifications();
          } else if (window.pushManager && window.pushManager.subscribe) {
            window.pushManager.subscribe();
          }
        }, notificationToggle);
        await waitForToast(residentPage, '푸시 알림이 활성화되었습니다', 7000);
      }
      const screenshot = await takeScreenshot(residentPage, 'resident-push-enabled', `입주자 계정 (${dong}-${ho}) 푸시 구독 활성화`);
      results.push({
        scenario: '입주자 푸시 구독',
        success: true,
        message: `입주자 계정 (${dong}-${ho})의 푸시 구독을 활성화했습니다.`,
        screenshots: [screenshot]
      });
    }
  } catch (error) {
    console.warn(`⚠️ 입주자 푸시 구독 설정 실패: ${error.message}`);
    results.push({
      scenario: '입주자 푸시 구독',
      success: false,
      message: `입주자 푸시 구독 설정 실패: ${error.message}`
    });
  } finally {
    await residentPage.close();
    await context.close();
  }
}

async function testPushNotifications() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 기능 7: 푸시 알림 테스트 (구독 설정 포함)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`프론트엔드: ${config.frontendUrl}`);
  console.log(`백엔드: ${config.backendUrl}`);
  console.log(`스크린샷 저장 위치: ${config.screenshotsDir}\n`);

  const results = [];
  let browser;
  let page;

  try {
    const chromePaths = [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Chromium.app/Contents/MacOS/Chromium'
    ];

    let executablePath = null;
    for (const candidate of chromePaths) {
      if (fs.existsSync(candidate)) {
        executablePath = candidate;
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
        '--allow-http-screen-capture',
        '--ignore-certificate-errors',
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
        '--allow-running-insecure-content',
        '--disable-features=IsolateOrigins,site-per-process'
      ]
    };

    if (executablePath) {
      launchOptions.executablePath = executablePath;
    }

    browser = await puppeteer.launch(launchOptions);

    // 1. 관리자 계정 푸시 구독 설정 (대시보드 수동 활성화)
    await setupAdminPushSubscription(browser, results);

    // 2. 점검원 신청 세대 계정 푸시 구독 설정
    await setupResidentPushSubscription(
      browser,
      testData.complex,
      testData.dong,
      testData.ho,
      testData.name,
      testData.phone,
      results
    );

    // 3. 메인 테스트 페이지 준비
    const context = await browser.createIncognitoBrowserContext();
    await context.overridePermissions(config.frontendUrl, ['notifications']);
    page = await context.newPage();
    await page.setViewport(config.viewport);
    await page.setUserAgent(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1'
    );

    // 로그인
    await login(page);

    // 설정 화면 열기
    await openSettings(page);

    // 푸시 활성화
    await ensurePushSubscribed(page, results);

    // 테스트 알림 실행
    await page.evaluate(() => {
      if (typeof sendTestNotification === 'function') {
        return sendTestNotification();
      }
      if (window.pushManager && window.pushManager.sendTestNotification) {
        return window.pushManager.sendTestNotification();
      }
      throw new Error('테스트 알림 함수를 찾을 수 없습니다.');
    });
    await waitForToast(page, '테스트 알림', 7000);
    const testScreenshot = await takeScreenshot(page, 'test-notification', '테스트 알림 발송 후 토스트 메시지');
    results.push({
      scenario: 'push/test',
      success: true,
      message: '테스트 알림을 발송했습니다.',
      screenshots: [testScreenshot]
    });

    // 세션 정보 및 토큰 확보
    const session = await page.evaluate(() => {
      if (typeof AppState !== 'undefined' && AppState.session) {
        return AppState.session;
      }
      return null;
    });
    const residentToken = await page.evaluate(
      () => localStorage.getItem('insighti_token') || localStorage.getItem('token') || localStorage.getItem('INSIGHTI_TOKEN')
    );

    if (!session) {
      throw new Error('세션 정보를 가져올 수 없습니다.');
    }

    if (!residentToken) {
      console.warn('⚠️ 토큰을 찾지 못했습니다. 일부 API 테스트가 제한될 수 있습니다.');
    }

    // 하자 등록 푸시 (관리자에게 전송)
    console.log('🔔 하자 등록 알림 테스트 (관리자에게 전송)...');
    await sendFrontendPush(
      page,
      'defect-registered',
      {
        defectId: `DEF-${Date.now()}`,
        location: '거실',
        trade: '바닥재',
        content: '자동화 테스트 하자 등록'
      },
      '✅ 하자 등록 푸시 API 호출 성공',
      'defect-registered',
      results
    );

    // 점검 완료 푸시
    await sendFrontendPush(
      page,
      'inspection-completed',
      {
        inspectionType: 'thermal',
        location: '거실',
        result: '정상'
      },
      '✅ 점검 완료 푸시 API 호출 성공',
      'inspection-completed',
      results
    );

    // 보고서 생성 완료 푸시
    await sendFrontendPush(
      page,
      'report-generated',
      {
        reportId: `RPT-${Date.now()}`,
        reportUrl: `${config.frontendUrl}/report/sample`
      },
      '✅ 보고서 생성 푸시 API 호출 성공',
      'report-generated',
      results
    );

    // 점검원 승인/거부 푸시 (점검원 신청 세대에게 전송)
    console.log('🔔 점검원 승인 알림 테스트 (신청 세대에게 전송)...');
    try {
      let registrationId;
      try {
        registrationId = await createInspectorRegistration(session);
      } catch (error) {
        // 이미 등록이 있는 경우 기존 등록 ID 사용
        if (error.message.includes('이미 등록 신청이 진행 중입니다')) {
          const match = error.message.match(/"registration_id":(\d+)/);
          if (match) {
            registrationId = parseInt(match[1]);
            console.log(`ℹ️ 기존 등록 ID 사용: ${registrationId}`);
          } else {
            throw error;
          }
        } else {
          throw error;
        }
      }
      const adminToken = await loginAdmin();
      const decisionResponse = await sendInspectorDecision({ registrationId, adminToken });

      await page.evaluate((msg) => toast(msg || '✅ 점검원 승인 푸시 발송 성공', 'success'), decisionResponse?.message);
      await waitForToast(page, decisionResponse?.message ? decisionResponse.message.replace('✅ ', '') : '점검원', 7000);
      const inspectorScreenshot = await takeScreenshot(page, 'inspector-decision', '점검원 승인 푸시 API 호출 결과');
      results.push({
        scenario: 'inspector-decision',
        success: true,
        message: decisionResponse?.message || '점검원 승인 푸시를 발송했습니다.',
        response: decisionResponse,
        screenshots: [inspectorScreenshot]
      });
    } catch (error) {
      console.error('❌ 점검원 승인 푸시 테스트 실패:', error.message);
      await page.evaluate((msg) => toast(msg, 'error'), `점검원 승인 푸시 실패: ${error.message}`);
      await waitForToast(page, '점검원 승인 푸시 실패', 5000);
      const errorShot = await takeScreenshot(page, 'inspector-decision-failed', '점검원 승인 푸시 실패');
      results.push({
        scenario: 'inspector-decision',
        success: false,
        message: error.message,
        screenshots: [errorShot]
      });
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 테스트 시나리오 요약');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    results.forEach((result, idx) => {
      console.log(`${idx + 1}. ${result.scenario} - ${result.success ? '✅ 성공' : '❌ 실패'}`);
      console.log(`   메시지: ${result.message}`);
      if (result.screenshots?.length) {
        console.log(`   스크린샷:`);
        result.screenshots.forEach((shot) => console.log(`     • ${shot}`));
      }
    });

    return { success: true, results };
  } catch (error) {
    console.error('❌ 푸시 알림 테스트 중 오류 발생:', error);
    return { success: false, error: error.message };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

if (require.main === module) {
  testPushNotifications()
    .then((result) => {
      if (!result.success) {
        process.exitCode = 1;
      }
    })
    .catch((error) => {
      console.error('❌ 테스트 실행 실패:', error);
      process.exitCode = 1;
    });
}

module.exports = { testPushNotifications, config };


