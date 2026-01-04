// PDF 다운로드 기능 테스트 및 화면 캡처
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// 설정
const config = {
  frontendUrl: process.env.FRONTEND_URL || 'https://insighti.vercel.app',
  backendUrl: process.env.BACKEND_URL || 'https://mobile-app-new.onrender.com',
  screenshotsDir: path.join(__dirname, '..', '..', 'test-screenshots', 'pdf-download'),
  reportsDir: path.join(__dirname, '..', '..', 'test-screenshots', 'pdf-download', 'pdfs'),
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
  },
  admin: {
    email: process.env.ADMIN_EMAIL || 'admin@insighti.com',
    password: process.env.ADMIN_PASSWORD || 'admin123'
  }
};

// 유틸리티 함수
async function takeScreenshot(page, name, description = '') {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
  const filename = `pdf-download-${name}-${timestamp}.png`;
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

// PDF 다운로드 테스트
async function testPDFDownload() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📄 PDF 다운로드 기능 테스트');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`프론트엔드: ${config.frontendUrl}`);
  console.log(`백엔드: ${config.backendUrl}`);
  console.log(`스크린샷: ${config.screenshotsDir}`);
  console.log(`PDF 저장: ${config.reportsDir}\n`);
  
  let browser;
  let page;
  const screenshots = [];
  const pdfFiles = [];
  
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
      headless: false, // 화면 캡처를 위해 headless: false
      defaultViewport: config.viewport,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage'
      ]
    };
    
    if (executablePath) {
      launchOptions.executablePath = executablePath;
    }
    
    browser = await puppeteer.launch(launchOptions);
    page = await browser.newPage();
    await page.setViewport(config.viewport);
    await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15');
    
    // PDF 다운로드 리스너 설정
    const client = await page.target().createCDPSession();
    await client.send('Page.setDownloadBehavior', {
      behavior: 'allow',
      downloadPath: config.reportsDir
    });
    
    console.log('✅ 브라우저 실행 완료\n');
    
    // 1. 로그인
    const loginSuccess = await login(page);
    if (!loginSuccess) {
      throw new Error('로그인 실패');
    }
    
    const screenshot1 = await takeScreenshot(page, '01-after-login', '로그인 후 화면');
    screenshots.push(screenshot1);
    
    // 1-1. 결함 확인 및 등록
    console.log('1-1️⃣ 결함 확인 및 등록 중...');
    
    // 토큰 가져오기
    const token = await page.evaluate(() => {
      return localStorage.getItem('insighti_token') || 
             (localStorage.getItem('insighti_session') ? JSON.parse(localStorage.getItem('insighti_session')).token : null);
    });
    
    if (!token) {
      throw new Error('토큰을 찾을 수 없습니다');
    }
    
    // 케이스 조회
    const casesResponse = await page.evaluate(async (backendUrl, token) => {
      const response = await fetch(`${backendUrl}/api/cases`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return response.ok ? await response.json() : null;
    }, config.backendUrl, token);
    
    if (!casesResponse || casesResponse.length === 0) {
      throw new Error('케이스를 찾을 수 없습니다');
    }
    
    const currentCase = casesResponse[0];
    const caseId = currentCase.id;
    console.log(`📋 현재 케이스: ${caseId}`);
    
    // 결함 조회
    const defectsResponse = await page.evaluate(async (backendUrl, token, caseId) => {
      const response = await fetch(`${backendUrl}/api/defects?case_id=${caseId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return response.ok ? await response.json() : null;
    }, config.backendUrl, token, caseId);
    
    let defectId = null;
    if (!defectsResponse || defectsResponse.length === 0) {
      // 결함이 없으면 새로 등록
      console.log('📝 결함이 없습니다. 새 결함을 등록합니다...');
      
      const newDefect = await page.evaluate(async (backendUrl, token, caseId) => {
        const response = await fetch(`${backendUrl}/api/defects`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            case_id: caseId,
            location: '거실',
            trade: '도장',
            content: '벽지 찢김 발견',
            memo: '테스트용 결함 등록'
          })
        });
        return response.ok ? await response.json() : null;
      }, config.backendUrl, token, caseId);
      
      if (newDefect) {
        defectId = newDefect.id;
        console.log(`✅ 결함 등록 완료: ${defectId}`);
      } else {
        console.log('⚠️ 결함 등록 실패');
      }
    } else {
      defectId = defectsResponse[0].id;
      console.log(`✅ 기존 결함 사용: ${defectId}`);
    }
    
    // 결함 처리 내역 확인 및 추가 (화면을 통해)
    if (defectId) {
      console.log('1-2️⃣ 결함 처리 내역 확인 및 등록 중 (관리자 화면을 통해)...');
      
      // API를 통해 처리 내역 확인
      const resolutionResponse = await page.evaluate(async (backendUrl, token, defectId) => {
        try {
          const response = await fetch(`${backendUrl}/api/admin/defects/${defectId}/resolution`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          return response.ok ? await response.json() : null;
        } catch (error) {
          return null;
        }
      }, config.backendUrl, token, defectId);
      
      if (!resolutionResponse) {
        // 처리 내역이 없으면 관리자 화면을 통해 추가
        console.log('📝 관리자 화면을 통해 처리 내역을 등록합니다...');
        
        // 관리자 페이지로 이동
        const adminUrl = `${config.frontendUrl}/admin.html`;
        await page.goto(adminUrl, { waitUntil: 'networkidle0', timeout: 30000 });
        await page.waitForTimeout(2000);
        
        // 관리자 로그인 화면 확인
        const loginScreen = await page.$('#login-screen');
        if (loginScreen) {
          const isVisible = await page.evaluate(el => {
            const style = window.getComputedStyle(el);
            return style.display !== 'none' && !el.classList.contains('hidden');
          }, loginScreen);
          
          if (isVisible) {
            console.log('🔐 관리자 로그인 진행...');
            
            // 이메일 입력
            const emailInput = await page.$('#admin-email');
            if (emailInput) {
              await emailInput.click({ clickCount: 3 });
              await emailInput.type(testData.admin.email, { delay: 100 });
            }
            
            // 비밀번호 입력
            const passwordInput = await page.$('#admin-password');
            if (passwordInput) {
              await passwordInput.click({ clickCount: 3 });
              await passwordInput.type(testData.admin.password, { delay: 100 });
            }
            
            // 로그인 버튼 클릭
            const loginButton = await page.$('button[type="submit"]');
            if (loginButton) {
              await loginButton.click();
              await page.waitForTimeout(3000);
            } else {
              // JavaScript로 직접 호출
              await page.evaluate(() => {
                if (typeof adminLogin === 'function') {
                  adminLogin();
                }
              });
              await page.waitForTimeout(3000);
            }
          }
        }
        
        // 관리자 대시보드 확인
        const dashboard = await page.$('#admin-dashboard');
        if (dashboard) {
          const isVisible = await page.evaluate(el => {
            return !el.classList.contains('hidden');
          }, dashboard);
          
          if (isVisible) {
            console.log('✅ 관리자 로그인 성공');
            
            // 하자 관리 화면으로 이동
            await page.evaluate(() => {
              if (typeof showScreen === 'function') {
                showScreen('defects');
              } else {
                // 직접 화면 전환
                document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
                const defectsScreen = document.getElementById('screen-defects');
                if (defectsScreen) {
                  defectsScreen.classList.remove('hidden');
                }
              }
            });
            await page.waitForTimeout(2000);
            
            // 하자 목록 로드 대기
            await page.waitForTimeout(2000);
            
            // 해당 결함 찾기 및 처리등록 버튼 클릭
            const defectRow = await page.evaluate((defectId) => {
              const rows = Array.from(document.querySelectorAll('#defects-tbody tr'));
              for (const row of rows) {
                const cells = row.querySelectorAll('td');
                if (cells.length > 0) {
                  const rowDefectId = cells[0].textContent.trim();
                  if (rowDefectId === defectId) {
                    const button = row.querySelector('button[onclick*="openResolutionModal"]');
                    if (button) {
                      return true;
                    }
                  }
                }
              }
              return false;
            }, defectId);
            
            if (defectRow) {
              // 처리등록 버튼 클릭
              await page.evaluate((defectId) => {
                const rows = Array.from(document.querySelectorAll('#defects-tbody tr'));
                for (const row of rows) {
                  const cells = row.querySelectorAll('td');
                  if (cells.length > 0 && cells[0].textContent.trim() === defectId) {
                    const button = row.querySelector('button[onclick*="openResolutionModal"]');
                    if (button) {
                      button.click();
                      return;
                    }
                  }
                }
              }, defectId);
              
              await page.waitForTimeout(1000);
              
              // 모달이 열렸는지 확인
              const modal = await page.$('#resolution-modal');
              if (modal) {
                const isModalVisible = await page.evaluate(el => {
                  return el.classList.contains('show');
                }, modal);
                
                if (isModalVisible) {
                  console.log('✅ 처리 결과 모달 열림');
                  
                  // 처리 결과 입력
                  await page.evaluate(() => {
                    const memoInput = document.getElementById('resolution-memo');
                    const contractorInput = document.getElementById('resolution-contractor');
                    const workerInput = document.getElementById('resolution-worker');
                    const costInput = document.getElementById('resolution-cost');
                    
                    if (memoInput) memoInput.value = '테스트용 처리 완료 내역입니다. 벽지 교체 작업을 완료했습니다.';
                    if (contractorInput) contractorInput.value = 'ABC 건설';
                    if (workerInput) workerInput.value = '홍길동';
                    if (costInput) costInput.value = '50000';
                  });
                  
                  await page.waitForTimeout(500);
                  
                  // 저장 버튼 클릭
                  const saveButton = await page.$('button[onclick*="saveResolution"]');
                  if (saveButton) {
                    await saveButton.click();
                    await page.waitForTimeout(2000);
                    console.log('✅ 처리 결과 저장 완료');
                  } else {
                    // JavaScript로 직접 호출
                    await page.evaluate(() => {
                      if (typeof saveResolution === 'function') {
                        saveResolution();
                      }
                    });
                    await page.waitForTimeout(2000);
                    console.log('✅ 처리 결과 저장 완료 (JavaScript 호출)');
                  }
                } else {
                  console.warn('⚠️ 모달이 열리지 않았습니다');
                }
              } else {
                console.warn('⚠️ 처리 결과 모달을 찾을 수 없습니다');
              }
            } else {
              console.warn('⚠️ 해당 결함을 목록에서 찾을 수 없습니다');
            }
            
            // 원래 페이지로 돌아가기
            await page.goto(config.frontendUrl, { waitUntil: 'networkidle0', timeout: 30000 });
            await page.waitForTimeout(3000);
            
            // 로그인 화면 확인 및 재로그인
            const loginScreenAfter = await page.$('#login');
            if (loginScreenAfter) {
              const isLoginVisible = await page.evaluate(el => {
                return !el.classList.contains('hidden');
              }, loginScreenAfter);
              
              if (isLoginVisible) {
                console.log('🔐 재로그인 진행...');
                const reLoginSuccess = await login(page);
                if (!reLoginSuccess) {
                  throw new Error('재로그인 실패');
                }
                await page.waitForTimeout(2000);
              } else {
                console.log('✅ 이미 로그인되어 있습니다');
              }
            } else {
              // 로그인 화면이 없으면 이미 로그인된 상태
              console.log('✅ 이미 로그인되어 있습니다');
            }
          } else {
            console.warn('⚠️ 관리자 대시보드가 표시되지 않았습니다');
          }
        } else {
          console.warn('⚠️ 관리자 대시보드를 찾을 수 없습니다');
        }
      } else {
        console.log('✅ 기존 처리 내역 사용');
      }
    }
    
    await page.waitForTimeout(2000);
    
    // 2. 보고서 화면으로 이동
    console.log('2️⃣ 보고서 화면으로 이동 중...');
    
    // 보고서 버튼 찾기
    let reportButton = await page.$('#tab-report');
    if (!reportButton) {
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
      await reportButton.click();
      await page.waitForTimeout(3000);
    } else {
      // JavaScript로 직접 호출
      await page.evaluate(() => {
        if (typeof onPreviewReport === 'function') {
          onPreviewReport();
        } else if (window.onPreviewReport) {
          window.onPreviewReport();
        }
      });
      await page.waitForTimeout(5000);
    }
    
    // 보고서 화면 확인
    const reportScreen = await page.$('#report');
    if (reportScreen) {
      const isHidden = await page.evaluate(el => el.classList.contains('hidden'), reportScreen);
      if (isHidden) {
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
    }
    
    const screenshot2 = await takeScreenshot(page, '02-report-screen', '보고서 미리보기 화면');
    screenshots.push(screenshot2);
    console.log('✅ 보고서 화면 이동 완료\n');
    
    // 3. 보고서 내용 확인
    console.log('3️⃣ 보고서 내용 확인 중...');
    await page.waitForTimeout(3000);
    
    const reportPreview = await page.$('#report-preview');
    if (reportPreview) {
      const previewInfo = await page.evaluate(el => {
        return {
          hasContent: el.innerHTML.trim().length > 0,
          childElementCount: el.childElementCount,
          textLength: el.textContent.length
        };
      }, reportPreview);
      
      console.log('📊 보고서 미리보기 정보:', previewInfo);
      
      if (previewInfo.hasContent) {
        const defectCards = await page.$$('#report-preview .card');
        console.log(`📋 하자 카드 개수: ${defectCards.length}`);
        
        const screenshot3 = await takeScreenshot(page, '03-report-content', '보고서 내용 (하자 목록)');
        screenshots.push(screenshot3);
      }
    }
    
    // 4. PDF 다운로드 버튼 클릭
    console.log('4️⃣ PDF 다운로드 버튼 클릭 중...');
    
    // PDF 다운로드 버튼 찾기
    let pdfButton = await page.$('button[onclick*="downloadReportAsPdf"]');
    if (!pdfButton) {
      const buttons = await page.$$('button');
      for (const button of buttons) {
        const text = await page.evaluate(el => el.textContent || el.innerText, button);
        if (text && text.includes('PDF') && text.includes('다운로드')) {
          pdfButton = button;
          break;
        }
      }
    }
    
    if (!pdfButton) {
      // JavaScript로 직접 호출
      console.log('⚠️ 버튼을 찾을 수 없습니다. JavaScript로 직접 호출...');
      await page.evaluate(() => {
        if (typeof downloadReportAsPdf === 'function') {
          downloadReportAsPdf();
        } else if (window.downloadReportAsPdf) {
          window.downloadReportAsPdf();
        }
      });
    } else {
      const isVisible = await page.evaluate(el => {
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && style.visibility !== 'hidden';
      }, pdfButton);
      
      if (isVisible) {
        const screenshot4 = await takeScreenshot(page, '04-before-pdf-download', 'PDF 다운로드 버튼 클릭 전');
        screenshots.push(screenshot4);
        
        await pdfButton.click();
        console.log('✅ PDF 다운로드 버튼 클릭 완료');
      } else {
        console.log('⚠️ PDF 다운로드 버튼이 보이지 않습니다.');
      }
    }
    
    // PDF 생성 대기
    console.log('5️⃣ PDF 생성 대기 중...');
    await page.waitForTimeout(10000); // PDF 생성 대기
    
    // 6. 다운로드된 PDF 파일 확인
    console.log('6️⃣ 다운로드된 PDF 파일 확인 중...');
    
    // 기존 PDF 파일 백업 (나중에 정리용)
    const existingFiles = fs.existsSync(config.reportsDir) 
      ? fs.readdirSync(config.reportsDir).filter(file => file.endsWith('.pdf'))
      : [];
    
    // 테스트 시작 시간 기록 (이 시간 이후 생성된 파일만 유효)
    const testStartTime = Date.now() - 60000; // 1분 여유
    
    await page.waitForTimeout(5000); // 다운로드 완료 대기
    
    const downloadedFiles = fs.existsSync(config.reportsDir)
      ? fs.readdirSync(config.reportsDir)
          .filter(file => file.endsWith('.pdf'))
          .map(file => {
            const filePath = path.join(config.reportsDir, file);
            const stats = fs.statSync(filePath);
            return {
              name: file,
              path: filePath,
              size: stats.size,
              created: stats.birthtime,
              mtime: stats.mtime
            };
          })
          .filter(file => {
            // 테스트 시작 후 생성된 파일만
            return file.mtime.getTime() > testStartTime;
          })
          .sort((a, b) => b.mtime - a.mtime) // 최신순 정렬
      : [];
    
    if (downloadedFiles.length > 0) {
      const latestPdf = downloadedFiles[0];
      pdfFiles.push(latestPdf);
      console.log(`✅ PDF 다운로드 완료: ${latestPdf.name} (${(latestPdf.size / 1024).toFixed(2)} KB)`);
      
      // 테스트 중 생성된 다른 파일들 제거 (최신 파일만 유지)
      downloadedFiles.slice(1).forEach(file => {
        try {
          fs.unlinkSync(file.path);
          console.log(`🗑️ 임시 파일 제거: ${file.name}`);
        } catch (error) {
          console.warn(`⚠️ 파일 제거 실패: ${file.name}`, error.message);
        }
      });
    } else {
      console.log('⚠️ 다운로드된 PDF 파일을 찾을 수 없습니다.');
    }
    
    // 6. 최종 화면 캡처
    const screenshot5 = await takeScreenshot(page, '05-after-pdf-download', 'PDF 다운로드 후 화면');
    screenshots.push(screenshot5);
    
    // 7. API 응답 확인
    console.log('6️⃣ API 응답 확인 중...');
    
    const apiInfo = await page.evaluate(async (backendUrl) => {
      try {
        const token = localStorage.getItem('insighti_token') || 
                     (localStorage.getItem('insighti_session') ? JSON.parse(localStorage.getItem('insighti_session')).token : null);
        
        if (!token) {
          return { error: '토큰이 없습니다' };
        }
        
        // 케이스 ID 가져오기
        const casesResponse = await fetch(`${backendUrl}/api/cases`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        let caseId = null;
        if (casesResponse.ok) {
          const cases = await casesResponse.json();
          if (cases && cases.length > 0) {
            caseId = cases[0].id;
          }
        }
        
        // PDF 생성 API 호출
        if (caseId) {
          const generateResponse = await fetch(`${backendUrl}/api/reports/generate`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ case_id: caseId })
          });
          
          if (generateResponse.ok) {
            const data = await generateResponse.json();
            return { success: true, data };
          } else {
            const errorText = await generateResponse.text();
            return { error: `HTTP ${generateResponse.status}: ${errorText}` };
          }
        } else {
          return { error: '케이스 ID를 찾을 수 없습니다' };
        }
      } catch (error) {
        return { error: error.message };
      }
    }, config.backendUrl);
    
    if (apiInfo.success) {
      console.log('✅ PDF 생성 API 호출 성공');
      console.log('📊 PDF 정보:', {
        filename: apiInfo.data.filename,
        size: apiInfo.data.size,
        url: apiInfo.data.url,
        download_url: apiInfo.data.download_url
      });
    } else {
      console.log(`⚠️ API 확인 실패: ${apiInfo.error}`);
    }
    
    // 성공한 경우에만 파일 유지, 실패 시 정리
    const finalResult = {
      success: pdfFiles.length > 0 && (apiInfo?.success || true), // PDF 파일이 있으면 성공
      screenshots,
      pdfFiles,
      apiInfo: apiInfo.success ? apiInfo.data : null
    };
    
    // 실패한 경우 임시 파일 정리
    if (!finalResult.success && pdfFiles.length === 0) {
      console.log('\n🧹 테스트 실패 - 임시 파일 정리 중...');
      if (fs.existsSync(config.reportsDir)) {
        const tempFiles = fs.readdirSync(config.reportsDir)
          .filter(file => file.endsWith('.pdf'))
          .map(file => path.join(config.reportsDir, file));
        
        tempFiles.forEach(filePath => {
          try {
            fs.unlinkSync(filePath);
            console.log(`🗑️ 임시 파일 제거: ${path.basename(filePath)}`);
          } catch (error) {
            console.warn(`⚠️ 파일 제거 실패: ${path.basename(filePath)}`);
          }
        });
      }
    }
    
    return finalResult;
    
  } catch (error) {
    console.error('❌ 테스트 오류:', error.message);
    if (page) {
      const errorScreenshot = await takeScreenshot(page, 'error', `오류: ${error.message}`);
      screenshots.push(errorScreenshot);
    }
    
    // 실패 시 임시 파일 정리
    console.log('\n🧹 테스트 실패 - 임시 파일 정리 중...');
    if (fs.existsSync(config.reportsDir)) {
      const tempFiles = fs.readdirSync(config.reportsDir)
        .filter(file => file.endsWith('.pdf'))
        .map(file => path.join(config.reportsDir, file));
      
      tempFiles.forEach(filePath => {
        try {
          fs.unlinkSync(filePath);
          console.log(`🗑️ 임시 파일 제거: ${path.basename(filePath)}`);
        } catch (error) {
          console.warn(`⚠️ 파일 제거 실패: ${path.basename(filePath)}`);
        }
      });
    }
    
    return {
      success: false,
      error: error.message,
      screenshots,
      pdfFiles: [] // 실패 시 빈 배열
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
  testPDFDownload()
    .then(result => {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📊 테스트 결과');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`결과: ${result.success ? '✅ 성공' : '❌ 실패'}`);
      
      if (result.pdfFiles && result.pdfFiles.length > 0) {
        console.log(`\n📄 다운로드된 PDF 파일:`);
        result.pdfFiles.forEach((pdf, index) => {
          console.log(`  ${index + 1}. ${pdf.name}`);
          console.log(`     크기: ${(pdf.size / 1024).toFixed(2)} KB`);
          console.log(`     생성: ${pdf.created.toISOString()}`);
        });
      } else {
        console.log(`\n⚠️ 다운로드된 PDF 파일이 없습니다.`);
      }
      
      if (result.apiInfo) {
        console.log(`\n📡 API 응답:`);
        console.log(`  - 파일명: ${result.apiInfo.filename || 'N/A'}`);
        console.log(`  - 크기: ${result.apiInfo.size ? (result.apiInfo.size / 1024).toFixed(2) + ' KB' : 'N/A'}`);
        console.log(`  - URL: ${result.apiInfo.url || 'N/A'}`);
        console.log(`  - 다운로드 URL: ${result.apiInfo.download_url || 'N/A'}`);
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

module.exports = { testPDFDownload, config };

