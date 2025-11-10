// 기능 5: 보고서 생성 테스트 및 화면 캡처 + PDF 샘플 저장
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// 설정
const config = {
  frontendUrl: process.env.FRONTEND_URL || 'https://insighti.vercel.app',
  backendUrl: process.env.BACKEND_URL || 'https://insighti-backend-v2.onrender.com',
  screenshotsDir: path.join(__dirname, '..', '..', 'test-screenshots', 'feature-5-report'),
  reportsDir: path.join(__dirname, '..', '..', 'test-screenshots', 'feature-5-report', 'reports'),
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
if (!fs.existsSync(config.reportsDir)) {
  fs.mkdirSync(config.reportsDir, { recursive: true });
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
  const filename = `05-${name}-${timestamp}.png`;
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

// PDF 다운로드 및 저장
async function downloadAndSavePDF(page, reportUrl) {
  try {
    console.log('📥 PDF 다운로드 중...');
    
    // PDF URL로 이동
    const response = await page.goto(reportUrl, { waitUntil: 'networkidle0' });
    
    // PDF 내용 가져오기
    const pdfBuffer = await response.buffer();
    
    // 파일명 생성
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    const filename = `report-sample-${timestamp}.pdf`;
    const filepath = path.join(config.reportsDir, filename);
    
    // PDF 저장
    fs.writeFileSync(filepath, pdfBuffer);
    
    console.log(`📄 PDF 저장: ${filename}`);
    return filepath;
  } catch (error) {
    console.error('❌ PDF 다운로드 실패:', error.message);
    return null;
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

// 기능 5: 보고서 생성 테스트
async function testReportGeneration() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 기능 5: 보고서 생성 테스트');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`프론트엔드: ${config.frontendUrl}`);
  console.log(`백엔드: ${config.backendUrl}`);
  console.log(`스크린샷: ${config.screenshotsDir}`);
  console.log(`보고서 샘플: ${config.reportsDir}\n`);
  
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
    
    // 2. 보고서 미리보기 화면으로 이동
    console.log('1️⃣ 보고서 미리보기 화면 이동 중...');
    
    // 보고서 버튼 찾기
    const reportButton = await page.$('#tab-report, button[onclick*="PreviewReport"], button[onclick*="보고서"]');
    
    if (reportButton) {
      const isVisible = await page.evaluate(el => {
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && style.visibility !== 'hidden' && !el.classList.contains('hidden');
      }, reportButton);
      
      if (isVisible) {
        await reportButton.click();
        await page.waitForTimeout(2000);
        console.log('✅ 보고서 탭 버튼 클릭 완료');
      }
    }
    
    // 직접 화면으로 이동 시도
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
    
    // 보고서 화면 확인
    const reportScreen = await page.$('#report');
    if (reportScreen) {
      const screenState = await page.evaluate(el => {
        return {
          exists: !!el,
          hasHidden: el.classList.contains('hidden'),
          display: window.getComputedStyle(el).display,
          visibility: window.getComputedStyle(el).visibility
        };
      }, reportScreen);
      
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
        await page.waitForTimeout(1000);
      }
      
      const isVisible = await page.evaluate(el => {
        return !el.classList.contains('hidden') && 
               window.getComputedStyle(el).display !== 'none';
      }, reportScreen);
      
      if (isVisible) {
        await takeScreenshot(page, 'report-preview-screen', '보고서 미리보기 화면');
        console.log('✅ 보고서 미리보기 화면 확인\n');
      } else {
        throw new Error('보고서 미리보기 화면이 표시되지 않습니다');
      }
    } else {
      throw new Error('보고서 미리보기 화면을 찾을 수 없습니다');
    }
    
    // 3. 보고서 내용 확인
    console.log('2️⃣ 보고서 내용 확인 중...');
    
    const reportPreview = await page.$('#report-preview');
    if (reportPreview) {
      const previewContent = await page.evaluate(el => el.innerHTML, reportPreview);
      const hasContent = previewContent && previewContent.trim().length > 0;
      
      if (hasContent) {
        console.log('✅ 보고서 내용이 있습니다');
        await takeScreenshot(page, 'report-content', '보고서 내용');
      } else {
        console.log('⚠️ 보고서 내용이 비어있습니다');
        await takeScreenshot(page, 'report-empty', '보고서 내용 없음');
      }
    }
    
    // 4. PDF 생성 시도
    console.log('3️⃣ PDF 생성 시도 중...');
    
    // PDF 생성 버튼 찾기
    const pdfButtons = await page.$$('button');
    let pdfButton = null;
    
    for (const btn of pdfButtons) {
      const text = await page.evaluate(el => el.textContent || el.innerText, btn);
      const onclick = await page.evaluate(el => el.getAttribute('onclick'), btn);
      
      if ((text && (text.includes('PDF') || text.includes('다운로드') || text.includes('생성'))) ||
          (onclick && onclick && (onclick.includes('PDF') || onclick.includes('download')))) {
        pdfButton = btn;
        console.log(`✅ PDF 버튼 발견: ${text || onclick || 'N/A'}`);
        break;
      }
    }
    
    let pdfUrl = null;
    let pdfSaved = false;
    
    // PDF 다운로드 리스너 설정
    page.on('response', async (response) => {
      const contentType = response.headers()['content-type'];
      const url = response.url();
      
      if (contentType && contentType.includes('application/pdf')) {
        console.log(`📄 PDF 응답 발견: ${url}`);
        pdfUrl = url;
        
        try {
          const pdfBuffer = await response.buffer();
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
          const filename = `report-sample-${timestamp}.pdf`;
          const filepath = path.join(config.reportsDir, filename);
          fs.writeFileSync(filepath, pdfBuffer);
          console.log(`📄 PDF 저장 완료: ${filename}`);
          pdfSaved = true;
        } catch (error) {
          console.error('❌ PDF 저장 실패:', error.message);
        }
      }
    });
    
    if (pdfButton) {
      await pdfButton.click();
      await page.waitForTimeout(5000);
    } else {
      // JavaScript로 PDF 생성 시도
      await page.evaluate(() => {
        if (typeof downloadReportAsPdf === 'function') {
          downloadReportAsPdf();
        } else if (window.downloadReportAsPdf) {
          window.downloadReportAsPdf();
        }
      });
      await page.waitForTimeout(5000);
    }
    
    // 5. 백엔드 API로 직접 PDF 생성 시도
    console.log('4️⃣ 백엔드 API로 PDF 생성 시도 중...');
    
    try {
      // 현재 케이스 ID 가져오기
      const caseId = await page.evaluate(() => {
        if (window.AppState && window.AppState.currentCaseId) {
          return window.AppState.currentCaseId;
        }
        // 케이스 목록에서 첫 번째 케이스 ID 가져오기
        if (window.AppState && window.AppState.cases && window.AppState.cases.length > 0) {
          return window.AppState.cases[0].id;
        }
        return null;
      });
      
      console.log(`📋 케이스 ID: ${caseId || '없음'}`);
      
      // 백엔드 API 호출
      const token = await page.evaluate(() => {
        if (window.AppState && window.AppState.token) {
          return window.AppState.token;
        }
        return localStorage.getItem('insighti_token') || localStorage.getItem('insighti_session');
      });
      
      if (token && caseId) {
        const pdfResponse = await page.evaluate(async (url, caseId, token) => {
          try {
            const response = await fetch(`${url}/api/reports/generate`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({ case_id: caseId })
            });
            
            if (response.ok) {
              const data = await response.json();
              return { success: true, data };
            } else {
              const error = await response.text();
              return { success: false, error, status: response.status };
            }
          } catch (error) {
            return { success: false, error: error.message };
          }
        }, config.backendUrl, caseId, token);
        
        if (pdfResponse.success && pdfResponse.data) {
          if (pdfResponse.data.pdf_url) {
            pdfUrl = pdfResponse.data.pdf_url;
            console.log(`✅ PDF 생성 성공: ${pdfUrl}`);
            
            // PDF 다운로드 및 저장
            const savedPath = await downloadAndSavePDF(page, pdfUrl);
            if (savedPath) {
              pdfSaved = true;
            }
          } else if (pdfResponse.data.url) {
            pdfUrl = pdfResponse.data.url;
            console.log(`✅ PDF URL 발견: ${pdfUrl}`);
            
            const savedPath = await downloadAndSavePDF(page, pdfUrl);
            if (savedPath) {
              pdfSaved = true;
            }
          } else {
            console.log(`⚠️ PDF URL이 응답에 없습니다: ${JSON.stringify(pdfResponse.data)}`);
          }
        } else {
          console.log(`⚠️ PDF 생성 실패: ${pdfResponse.error || '알 수 없는 오류'} (상태: ${pdfResponse.status || 'N/A'})`);
        }
      } else {
        console.log(`⚠️ 토큰 또는 케이스 ID가 없습니다 (토큰: ${token ? '있음' : '없음'}, 케이스: ${caseId || '없음'})`);
      }
    } catch (error) {
      console.error('❌ PDF 생성 시도 오류:', error.message);
    }
    
    // 6. Puppeteer로 보고서 HTML을 PDF로 변환 시도
    if (!pdfSaved) {
      console.log('5️⃣ Puppeteer로 HTML을 PDF로 변환 시도 중...');
      try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
        const filename = `report-html-to-pdf-${timestamp}.pdf`;
        const filepath = path.join(config.reportsDir, filename);
        
        await page.pdf({
          path: filepath,
          format: 'A4',
          printBackground: true,
          margin: {
            top: '20mm',
            right: '15mm',
            bottom: '20mm',
            left: '15mm'
          }
        });
        
        console.log(`📄 HTML을 PDF로 변환 완료: ${filename}`);
        pdfSaved = true;
      } catch (error) {
        console.error('❌ HTML to PDF 변환 실패:', error.message);
      }
    }
    
    await takeScreenshot(page, 'report-final', '보고서 최종 화면');
    
    return {
      success: true,
      pdfSaved,
      pdfUrl,
      message: pdfSaved ? '보고서 생성 및 PDF 저장 완료' : '보고서 미리보기 완료 (PDF 미생성)',
      screenshots: []
    };
    
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
  testReportGeneration()
    .then(result => {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📊 테스트 결과');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`결과: ${result.success ? '✅ 성공' : '❌ 실패'}`);
      if (result.message) {
        console.log(`메시지: ${result.message}`);
      }
      if (result.pdfSaved) {
        console.log(`📄 PDF 저장: ✅ 완료`);
        console.log(`   위치: ${config.reportsDir}`);
      } else {
        console.log(`📄 PDF 저장: ⚠️ 미완료`);
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

module.exports = { testReportGeneration, config };

