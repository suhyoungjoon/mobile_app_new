// 기능 3: 장비점검 테스트 및 화면 캡처
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// 설정
const config = {
  frontendUrl: process.env.FRONTEND_URL || 'https://insighti.vercel.app',
  backendUrl: process.env.BACKEND_URL || 'https://insighti-backend-v2.onrender.com',
  screenshotsDir: path.join(__dirname, '..', '..', 'test-screenshots', 'feature-3-equipment'),
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
  equipment: {
    thermal: {
      location: '거실',
      trade: '바닥재',
      note: '열화상 테스트 메모'
    },
    air: {
      location: '침실',
      trade: '마감',
      tvoc: '0.5',
      hcho: '0.1',
      note: '공기질 테스트 메모'
    },
    radon: {
      location: '거실',
      trade: '바닥재',
      value: '150',
      unit: 'Bq/m³',
      note: '라돈 테스트 메모'
    },
    level: {
      location: '주방',
      trade: '바닥',
      left: '2.5',
      right: '2.3',
      note: '레벨기 테스트 메모'
    }
  }
};

// 유틸리티 함수
async function takeScreenshot(page, name, description = '') {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
  const filename = `03-${name}-${timestamp}.png`;
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
    } else {
      console.warn(`⚠️ 입력 필드를 찾을 수 없음: ${selector}`);
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
    await page.waitForTimeout(8000); // 로그인 처리 시간 증가
    
    // 로그인 성공 확인 (여러 방법 시도)
    const listScreen = await page.$('#list');
    const listScreenVisible = listScreen ? await page.evaluate(el => {
      return !el.classList.contains('hidden');
    }, listScreen) : false;
    
    // 에러 메시지 확인
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
      // 추가 대기 후 재확인
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
  
  console.error('❌ 로그인 실패: 로그인 버튼을 찾을 수 없거나 로그인 처리 실패');
  return false;
}

// 장비점검 탭 전환
async function switchEquipmentTab(page, tabType) {
  try {
    // 탭 버튼 찾기
    const tabButton = await page.$(`button.equipment-tab[onclick="showEquipmentTab('${tabType}')"]`);
    if (tabButton) {
      // 요소가 보이는지 확인
      const isVisible = await page.evaluate(el => {
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && style.visibility !== 'hidden';
      }, tabButton);
      
      if (isVisible) {
        // 스크롤하여 요소가 보이도록
        await tabButton.scrollIntoViewIfNeeded();
        await page.waitForTimeout(500);
        
        // 클릭 시도
        await tabButton.click({ delay: 100 });
        await page.waitForTimeout(1500);
        
        // 탭이 활성화되었는지 확인
        const isActive = await page.evaluate((type) => {
          const tab = document.querySelector(`button.equipment-tab[onclick="showEquipmentTab('${type}')"]`);
          return tab && tab.classList.contains('active');
        }, tabType);
        
        return isActive;
      }
    }
    
    // 대안: JavaScript로 직접 탭 전환
    await page.evaluate((type) => {
      if (typeof showEquipmentTab === 'function') {
        showEquipmentTab(type);
      } else if (window.showEquipmentTab) {
        window.showEquipmentTab(type);
      }
    }, tabType);
    await page.waitForTimeout(1500);
    
    return true;
  } catch (error) {
    console.error(`탭 전환 오류 (${tabType}):`, error.message);
    return false;
  }
}

// 열화상 점검 테스트
async function testThermalInspection(page) {
  console.log('📋 3-1: 열화상 점검 테스트');
  
  try {
    // 열화상 탭으로 전환
    await switchEquipmentTab(page, 'thermal');
    await takeScreenshot(page, 'thermal-tab', '열화상 탭');
    
    // 정보 입력
    const locationField = await page.$('#thermal-location');
    if (locationField) {
      await locationField.click({ clickCount: 3 });
      await locationField.type(testData.equipment.thermal.location);
      await page.waitForTimeout(500);
    }
    
    const tradeField = await page.$('#thermal-trade');
    if (tradeField) {
      await tradeField.click({ clickCount: 3 });
      await tradeField.type(testData.equipment.thermal.trade);
      await page.waitForTimeout(500);
    }
    
    const noteField = await page.$('#thermal-note');
    if (noteField) {
      await noteField.click({ clickCount: 3 });
      await noteField.type(testData.equipment.thermal.note);
      await page.waitForTimeout(500);
    }
    
    await takeScreenshot(page, 'thermal-filled', '열화상 정보 입력 완료');
    
    // 저장 버튼 클릭
    const saveButton = await page.$('button[onclick="saveEquipmentInspection()"]');
    if (saveButton) {
      await saveButton.click();
      await page.waitForTimeout(3000);
      
      // 성공 메시지 확인
      const successElement = await page.$('.toast.success, .success-message');
      if (successElement) {
        await takeScreenshot(page, 'thermal-saved', '열화상 점검 저장 완료');
        return { success: true, message: '열화상 점검 저장 성공' };
      }
    }
    
    return { success: false, error: '저장 실패 또는 확인 불가' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// 공기질 점검 테스트
async function testAirInspection(page) {
  console.log('📋 3-2: 공기질 점검 테스트');
  
  try {
    // 공기질 탭으로 전환
    await switchEquipmentTab(page, 'air');
    await takeScreenshot(page, 'air-tab', '공기질 탭');
    
    // 정보 입력 (요소가 보일 때까지 대기)
    await waitForElement(page, '#air-location', 10000);
    await page.waitForTimeout(1000); // 추가 대기
    
    // JavaScript로 직접 입력 시도
    await page.evaluate((data) => {
      const locationField = document.getElementById('air-location');
      if (locationField) {
        locationField.value = data.location;
        locationField.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }, testData.equipment.air);
    
    const locationField = await page.$('#air-location');
    if (locationField) {
      try {
        await locationField.scrollIntoViewIfNeeded();
        await page.waitForTimeout(500);
        await locationField.click({ clickCount: 3 });
        await locationField.type(testData.equipment.air.location, { delay: 100 });
        await page.waitForTimeout(500);
      } catch (error) {
        // JavaScript로 입력한 값이 이미 있으므로 계속 진행
        console.log('⚠️ 클릭 실패, JavaScript 입력 사용');
      }
    }
    
    // JavaScript로 직접 입력
    await page.evaluate((data) => {
      const tradeField = document.getElementById('air-trade');
      if (tradeField) tradeField.value = data.trade;
      const tvocField = document.getElementById('air-tvoc');
      if (tvocField) tvocField.value = data.tvoc;
      const hchoField = document.getElementById('air-hcho');
      if (hchoField) hchoField.value = data.hcho;
      const noteField = document.getElementById('air-note');
      if (noteField) noteField.value = data.note;
    }, testData.equipment.air);
    await page.waitForTimeout(1000);
    
    await takeScreenshot(page, 'air-filled', '공기질 정보 입력 완료');
    
    // 저장 버튼 클릭 (JavaScript로 직접 호출)
    await page.evaluate(() => {
      if (typeof saveEquipmentInspection === 'function') {
        saveEquipmentInspection();
      } else if (window.saveEquipmentInspection) {
        window.saveEquipmentInspection();
      }
    });
    await page.waitForTimeout(5000);
    
    const successElement = await page.$('.toast.success, .success-message');
    if (successElement) {
      await takeScreenshot(page, 'air-saved', '공기질 점검 저장 완료');
      return { success: true, message: '공기질 점검 저장 성공' };
    }
    
    // 에러 메시지 확인
    const errorElement = await page.$('.toast.error, .error-message');
    if (errorElement) {
      const errorText = await page.evaluate(el => el.textContent || el.innerText, errorElement);
      return { success: false, error: errorText };
    }
    
    return { success: false, error: '저장 실패 또는 확인 불가' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// 라돈 점검 테스트
async function testRadonInspection(page) {
  console.log('📋 3-3: 라돈 점검 테스트');
  
  try {
    // 라돈 탭으로 전환
    await switchEquipmentTab(page, 'radon');
    await takeScreenshot(page, 'radon-tab', '라돈 탭');
    
    // 정보 입력 (요소가 보일 때까지 대기)
    await waitForElement(page, '#radon-location', 10000);
    await page.waitForTimeout(1000);
    
    // JavaScript로 직접 입력
    await page.evaluate((data) => {
      const locationField = document.getElementById('radon-location');
      if (locationField) locationField.value = data.location;
      const tradeField = document.getElementById('radon-trade');
      if (tradeField) tradeField.value = data.trade;
      const valueField = document.getElementById('radon-value');
      if (valueField) valueField.value = data.value;
      const noteField = document.getElementById('radon-note');
      if (noteField) noteField.value = data.note;
    }, testData.equipment.radon);
    await page.waitForTimeout(1000);
    
    await takeScreenshot(page, 'radon-filled', '라돈 정보 입력 완료');
    
    // 저장 버튼 클릭 (JavaScript로 직접 호출)
    await page.evaluate(() => {
      if (typeof saveEquipmentInspection === 'function') {
        saveEquipmentInspection();
      } else if (window.saveEquipmentInspection) {
        window.saveEquipmentInspection();
      }
    });
    await page.waitForTimeout(5000);
    
    const successElement = await page.$('.toast.success, .success-message');
    if (successElement) {
      await takeScreenshot(page, 'radon-saved', '라돈 점검 저장 완료');
      return { success: true, message: '라돈 점검 저장 성공' };
    }
    
    const errorElement = await page.$('.toast.error, .error-message');
    if (errorElement) {
      const errorText = await page.evaluate(el => el.textContent || el.innerText, errorElement);
      return { success: false, error: errorText };
    }
    
    return { success: false, error: '저장 실패 또는 확인 불가' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// 레벨기 점검 테스트
async function testLevelInspection(page) {
  console.log('📋 3-4: 레벨기 점검 테스트');
  
  try {
    // 레벨기 탭으로 전환
    await switchEquipmentTab(page, 'level');
    await takeScreenshot(page, 'level-tab', '레벨기 탭');
    
    // 정보 입력 (요소가 보일 때까지 대기)
    await waitForElement(page, '#level-location', 10000);
    await page.waitForTimeout(1000);
    
    // JavaScript로 직접 입력
    await page.evaluate((data) => {
      const locationField = document.getElementById('level-location');
      if (locationField) locationField.value = data.location;
      const tradeField = document.getElementById('level-trade');
      if (tradeField) tradeField.value = data.trade;
      const leftField = document.getElementById('level-left');
      if (leftField) leftField.value = data.left;
      const rightField = document.getElementById('level-right');
      if (rightField) rightField.value = data.right;
      const noteField = document.getElementById('level-note');
      if (noteField) noteField.value = data.note;
    }, testData.equipment.level);
    await page.waitForTimeout(1000);
    
    await takeScreenshot(page, 'level-filled', '레벨기 정보 입력 완료');
    
    // 저장 버튼 클릭 (JavaScript로 직접 호출)
    await page.evaluate(() => {
      if (typeof saveEquipmentInspection === 'function') {
        saveEquipmentInspection();
      } else if (window.saveEquipmentInspection) {
        window.saveEquipmentInspection();
      }
    });
    await page.waitForTimeout(5000);
    
    const successElement = await page.$('.toast.success, .success-message');
    if (successElement) {
      await takeScreenshot(page, 'level-saved', '레벨기 점검 저장 완료');
      return { success: true, message: '레벨기 점검 저장 성공' };
    }
    
    const errorElement = await page.$('.toast.error, .error-message');
    if (errorElement) {
      const errorText = await page.evaluate(el => el.textContent || el.innerText, errorElement);
      return { success: false, error: errorText };
    }
    
    return { success: false, error: '저장 실패 또는 확인 불가' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// 기능 3: 장비점검 메인 테스트
async function testEquipmentInspection() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 기능 3: 장비점검 테스트');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`프론트엔드: ${config.frontendUrl}`);
  console.log(`백엔드: ${config.backendUrl}`);
  console.log(`스크린샷: ${config.screenshotsDir}\n`);
  
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
    await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15');
    
    console.log('✅ 브라우저 실행 완료\n');
    
    // 1. 로그인
    const loginSuccess = await login(page);
    if (!loginSuccess) {
      throw new Error('로그인 실패');
    }
    
    // 2. 장비점검 화면으로 이동
    console.log('1️⃣ 장비점검 화면 이동 중...');
    
    // 탭바에서 장비점검 버튼 찾기 (여러 방법 시도)
    let tabEquipment = await page.$('#tab-equipment');
    
    if (!tabEquipment) {
      // 모든 버튼에서 텍스트로 찾기
      const buttons = await page.$$('button');
      for (const btn of buttons) {
        const text = await page.evaluate(el => el.textContent || el.innerText, btn);
        const onclick = await page.evaluate(el => el.getAttribute('onclick'), btn);
        if (text && text.includes('장비점검') || onclick && onclick.includes('equipment')) {
          tabEquipment = btn;
          break;
        }
      }
    }
    
    if (tabEquipment) {
      const isVisible = await page.evaluate(el => {
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && style.visibility !== 'hidden' && !el.classList.contains('hidden');
      }, tabEquipment);
      
      if (isVisible) {
        await tabEquipment.click();
        await page.waitForTimeout(2000);
        console.log('✅ 장비점검 탭 버튼 클릭 완료');
      } else {
        console.log('⚠️ 장비점검 탭 버튼이 숨겨져 있습니다');
      }
    }
    
    // 직접 화면으로 이동 시도 (route 함수 사용)
    await page.evaluate(() => {
      if (typeof route === 'function') {
        route('equipment');
      } else if (window.route) {
        window.route('equipment');
      }
    });
    await page.waitForTimeout(3000);
    
    // 장비점검 화면 확인
    const equipmentScreen = await page.$('#equipment');
    if (equipmentScreen) {
      const screenState = await page.evaluate(el => {
        return {
          exists: !!el,
          hasHidden: el.classList.contains('hidden'),
          display: window.getComputedStyle(el).display,
          visibility: window.getComputedStyle(el).visibility
        };
      }, equipmentScreen);
      
      console.log('📋 화면 상태:', screenState);
      
      // hidden 클래스를 제거하고 표시 시도
      if (screenState.hasHidden) {
        await page.evaluate(() => {
          const screen = document.getElementById('equipment');
          if (screen) {
            screen.classList.remove('hidden');
            // 다른 화면들은 숨기기
            document.querySelectorAll('.screen').forEach(s => {
              if (s.id !== 'equipment') {
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
      }, equipmentScreen);
      
      if (isVisible) {
        await takeScreenshot(page, 'equipment-screen', '장비점검 화면');
        console.log('✅ 장비점검 화면 확인\n');
      } else {
        // 사용자 타입 확인
        const userType = await page.evaluate(() => {
          return localStorage.getItem('user_type') || 'unknown';
        });
        console.log(`⚠️ 사용자 타입: ${userType}`);
        console.log('⚠️ 장비점검은 company 타입 사용자만 접근 가능합니다');
        
        // company 타입이 아닌 경우 경고만 표시하고 계속 진행
        await takeScreenshot(page, 'equipment-screen-hidden', '장비점검 화면 (숨김 상태)');
        console.log('⚠️ 장비점검 화면이 숨겨져 있지만 계속 진행합니다\n');
      }
    } else {
      throw new Error('장비점검 화면을 찾을 수 없습니다');
    }
    
    // 3. 각 탭별 테스트 진행
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 장비점검 탭별 테스트 시작');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    // 3-1. 열화상
    const thermalResult = await testThermalInspection(page);
    results.push({ type: '열화상', ...thermalResult });
    console.log(`${thermalResult.success ? '✅' : '❌'} 열화상: ${thermalResult.success ? thermalResult.message : thermalResult.error}\n`);
    
    // 3-2. 공기질
    const airResult = await testAirInspection(page);
    results.push({ type: '공기질', ...airResult });
    console.log(`${airResult.success ? '✅' : '❌'} 공기질: ${airResult.success ? airResult.message : airResult.error}\n`);
    
    // 3-3. 라돈
    const radonResult = await testRadonInspection(page);
    results.push({ type: '라돈', ...radonResult });
    console.log(`${radonResult.success ? '✅' : '❌'} 라돈: ${radonResult.success ? radonResult.message : radonResult.error}\n`);
    
    // 3-4. 레벨기
    const levelResult = await testLevelInspection(page);
    results.push({ type: '레벨기', ...levelResult });
    console.log(`${levelResult.success ? '✅' : '❌'} 레벨기: ${levelResult.success ? levelResult.message : levelResult.error}\n`);
    
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
  testEquipmentInspection()
    .then(result => {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📊 테스트 결과');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`전체 결과: ${result.success ? '✅ 성공' : '❌ 실패'}`);
      console.log('\n상세 결과:');
      result.results.forEach(r => {
        console.log(`  ${r.success ? '✅' : '❌'} ${r.type}: ${r.success ? r.message : r.error}`);
      });
      console.log(`\n스크린샷 위치: ${config.screenshotsDir}\n`);
      
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ 테스트 실행 실패:', error);
      process.exit(1);
    });
}

module.exports = { testEquipmentInspection, config };

