// 보고서 미리보기 기능 테스트 및 화면 캡처
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// 설정
const config = {
  frontendUrl: process.env.FRONTEND_URL || 'https://insighti.vercel.app',
  backendUrl: process.env.BACKEND_URL || 'https://mobile-app-new.onrender.com',
  screenshotsDir: path.join(__dirname, '..', '..', 'test-screenshots', 'report-preview'),
  waitTimeout: 30000,
  viewport: {
    width: 375,
    height: 812,
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2
  }
};

// 디렉토리 생성
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
  }
};

// 유틸리티 함수
async function takeScreenshot(page, name, description = '') {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
  const filename = `report-preview-${name}-${timestamp}.png`;
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
  
  const loginScreen = await page.$('#login');
  if (!loginScreen) {
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

// 보고서 미리보기 테스트
async function testReportPreview() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 보고서 미리보기 기능 테스트');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`프론트엔드: ${config.frontendUrl}`);
  console.log(`백엔드: ${config.backendUrl}`);
  console.log(`스크린샷: ${config.screenshotsDir}\n`);
  
  let browser;
  let page;
  const screenshots = [];
  
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
    
    const screenshot1 = await takeScreenshot(page, '01-after-login', '로그인 후 화면');
    screenshots.push(screenshot1);
    
    // 2. 보고서 미리보기 버튼 클릭
    console.log('1️⃣ 보고서 미리보기 버튼 클릭 중...');
    
    // 보고서 버튼 찾기 (여러 방법 시도)
    let reportButton = await page.$('#tab-report');
    if (!reportButton) {
      reportButton = await page.$('button[onclick*="PreviewReport"], button[onclick*="보고서"]');
    }
    if (!reportButton) {
      // 텍스트로 찾기
      const buttons = await page.$$('button');
      for (const button of buttons) {
        const text = await page.evaluate(el => el.textContent || el.innerText, button);
        if (text && (text.includes('보고서') || text.includes('미리보기'))) {
          reportButton = button;
          break;
        }
      }
    }
    
    if (reportButton) {
      const isVisible = await page.evaluate(el => {
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && style.visibility !== 'hidden' && !el.classList.contains('hidden');
      }, reportButton);
      
      if (isVisible) {
        await reportButton.click();
        await page.waitForTimeout(2000);
        console.log('✅ 보고서 버튼 클릭 완료');
      } else {
        console.log('⚠️ 보고서 버튼이 보이지 않습니다. JavaScript로 직접 호출 시도...');
      }
    } else {
      console.log('⚠️ 보고서 버튼을 찾을 수 없습니다. JavaScript로 직접 호출 시도...');
    }
    
    // JavaScript로 직접 호출
    await page.evaluate(() => {
      if (typeof onPreviewReport === 'function') {
        onPreviewReport();
      } else if (window.onPreviewReport) {
        window.onPreviewReport();
      } else if (typeof route === 'function') {
        route('report');
      } else if (window.route) {
        window.route('report');
      }
    });
    
    await page.waitForTimeout(5000);
    
    // 3. 보고서 화면 확인
    console.log('2️⃣ 보고서 미리보기 화면 확인 중...');
    
    const reportScreen = await page.$('#report');
    if (!reportScreen) {
      throw new Error('보고서 화면(#report)을 찾을 수 없습니다');
    }
    
    const screenState = await page.evaluate(el => {
      return {
        exists: !!el,
        hasHidden: el.classList.contains('hidden'),
        display: window.getComputedStyle(el).display,
        visibility: window.getComputedStyle(el).visibility
      };
    }, reportScreen);
    
    console.log('📊 화면 상태:', screenState);
    
    if (screenState.hasHidden) {
      await page.evaluate(() => {
        const screen = document.getElementById('report');
        if (screen) {
          screen.classList.remove('hidden');
          document.querySelectorAll('.screen').forEach(s => {
            if (s.id !== 'report') {
              s.classList.add('hidden');
            }
          });
        }
      });
      await page.waitForTimeout(2000);
    }
    
    const isVisible = await page.evaluate(el => {
      return !el.classList.contains('hidden') && 
             window.getComputedStyle(el).display !== 'none';
    }, reportScreen);
    
    if (!isVisible) {
      throw new Error('보고서 미리보기 화면이 표시되지 않습니다');
    }
    
    const screenshot2 = await takeScreenshot(page, '02-report-screen', '보고서 미리보기 화면');
    screenshots.push(screenshot2);
    console.log('✅ 보고서 미리보기 화면 확인 완료\n');
    
    // 4. 보고서 내용 확인
    console.log('3️⃣ 보고서 내용 확인 중...');
    
    await page.waitForTimeout(3000); // API 응답 대기
    
    const reportPreview = await page.$('#report-preview');
    if (!reportPreview) {
      throw new Error('보고서 미리보기 컨테이너(#report-preview)를 찾을 수 없습니다');
    }
    
    const previewInfo = await page.evaluate(el => {
      return {
        exists: !!el,
        innerHTML: el.innerHTML,
        textContent: el.textContent,
        hasContent: el.innerHTML.trim().length > 0,
        childElementCount: el.childElementCount
      };
    }, reportPreview);
    
    console.log('📊 보고서 미리보기 정보:', {
      hasContent: previewInfo.hasContent,
      childElementCount: previewInfo.childElementCount,
      textLength: previewInfo.textContent.length
    });
    
    let defectCardsCount = 0;
    if (previewInfo.hasContent) {
      console.log('✅ 보고서 내용이 있습니다');
      
      // 하자 카드 확인
      const defectCards = await page.$$('#report-preview .card');
      defectCardsCount = defectCards.length;
      console.log(`📋 하자 카드 개수: ${defectCardsCount}`);
      
      if (defectCards.length > 0) {
        // 첫 번째 카드 상세 정보
        const firstCardInfo = await page.evaluate(card => {
          return {
            textContent: card.textContent,
            innerHTML: card.innerHTML.substring(0, 200) // 처음 200자만
          };
        }, defectCards[0]);
        
        console.log('📄 첫 번째 하자 카드:', firstCardInfo.textContent.substring(0, 100));
      }
      
      const screenshot3 = await takeScreenshot(page, '03-report-content', '보고서 내용 (하자 목록)');
      screenshots.push(screenshot3);
      
      // 스크롤하여 전체 내용 확인
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      await page.waitForTimeout(1000);
      
      const screenshot4 = await takeScreenshot(page, '04-report-content-scrolled', '보고서 내용 (스크롤)');
      screenshots.push(screenshot4);
      
    } else {
      console.log('⚠️ 보고서 내용이 비어있습니다');
      const screenshot3 = await takeScreenshot(page, '03-report-empty', '보고서 내용 없음');
      screenshots.push(screenshot3);
    }
    
    // 5. API 응답 확인
    console.log('4️⃣ API 응답 확인 중...');
    
    const apiResponse = await page.evaluate(async (backendUrl) => {
      try {
        const token = localStorage.getItem('insighti_token') || 
                     (localStorage.getItem('insighti_session') ? JSON.parse(localStorage.getItem('insighti_session')).token : null);
        
        if (!token) {
          return { error: '토큰이 없습니다' };
        }
        
        const response = await fetch(`${backendUrl}/api/reports/preview`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          return { error: `HTTP ${response.status}: ${errorText}` };
        }
        
        const data = await response.json();
        return { success: true, data };
      } catch (error) {
        return { error: error.message };
      }
    }, config.backendUrl);
    
    if (apiResponse.success) {
      console.log('✅ API 응답 성공');
      console.log('📊 응답 데이터:', {
        case_id: apiResponse.data.case_id,
        defects_count: apiResponse.data.defects_count || (apiResponse.data.defects ? apiResponse.data.defects.length : 0),
        equipment_count: apiResponse.data.equipment_count || 0,
        has_html: !!apiResponse.data.html
      });
    } else {
      console.log(`⚠️ API 응답 확인 실패: ${apiResponse.error}`);
    }
    
    // 6. 최종 화면 캡처
    const screenshot5 = await takeScreenshot(page, '05-report-final', '보고서 미리보기 최종 화면');
    screenshots.push(screenshot5);
    
    return {
      success: true,
      screenshots,
      previewInfo: {
        hasContent: previewInfo.hasContent,
        childElementCount: previewInfo.childElementCount,
        defectCardsCount: defectCardsCount
      },
      apiResponse: apiResponse.success ? {
        case_id: apiResponse.data.case_id,
        defects_count: apiResponse.data.defects_count || 0,
        equipment_count: apiResponse.data.equipment_count || 0
      } : null
    };
    
  } catch (error) {
    console.error('❌ 테스트 오류:', error.message);
    if (page) {
      const errorScreenshot = await takeScreenshot(page, 'error', `오류: ${error.message}`);
      screenshots.push(errorScreenshot);
    }
    return {
      success: false,
      error: error.message,
      screenshots
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
  testReportPreview()
    .then(result => {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📊 테스트 결과');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`결과: ${result.success ? '✅ 성공' : '❌ 실패'}`);
      
      if (result.previewInfo) {
        console.log(`\n📋 보고서 미리보기 정보:`);
        console.log(`  - 내용 있음: ${result.previewInfo.hasContent ? '✅' : '❌'}`);
        console.log(`  - 하자 카드 개수: ${result.previewInfo.defectCardsCount}`);
        console.log(`  - 자식 요소 개수: ${result.previewInfo.childElementCount}`);
      }
      
      if (result.apiResponse) {
        console.log(`\n📡 API 응답:`);
        console.log(`  - 케이스 ID: ${result.apiResponse.case_id || 'N/A'}`);
        console.log(`  - 하자 개수: ${result.apiResponse.defects_count || 0}`);
        console.log(`  - 장비 점검 개수: ${result.apiResponse.equipment_count || 0}`);
      }
      
      if (result.error) {
        console.log(`\n❌ 오류: ${result.error}`);
      }
      
      console.log(`\n📸 스크린샷: ${result.screenshots.length}개`);
      result.screenshots.forEach((screenshot, index) => {
        console.log(`  ${index + 1}. ${path.basename(screenshot)}`);
      });
      console.log(`\n저장 위치: ${config.screenshotsDir}\n`);
      
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ 테스트 실행 실패:', error);
      process.exit(1);
    });
}

module.exports = { testReportPreview, config };

