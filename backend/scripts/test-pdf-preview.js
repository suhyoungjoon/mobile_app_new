/**
 * PDF 미리보기 기능 테스트 스크립트
 * - 하자 유무에 따른 버튼 표시 확인
 * - PDF 미리보기 기능 테스트
 * - PDF 다운로드 기능 테스트
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const config = {
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:8080',
  backendUrl: process.env.BACKEND_URL || 'http://localhost:3000',
  testUser: {
    email: 'test@example.com',
    password: 'test123'
  },
  screenshotDir: path.join(__dirname, '..', '..', 'test-screenshots'),
  reportDir: path.join(__dirname, '..', 'reports')
};

// 스크린샷 디렉토리 생성
if (!fs.existsSync(config.screenshotDir)) {
  fs.mkdirSync(config.screenshotDir, { recursive: true });
}

// 오래된 스크린샷 정리 (최근 5개만 유지)
function cleanupOldScreenshots() {
  try {
    const files = fs.readdirSync(config.screenshotDir)
      .filter(f => f.startsWith('pdf-preview-test-') && f.endsWith('.png'))
      .map(f => ({
        name: f,
        time: fs.statSync(path.join(config.screenshotDir, f)).mtime.getTime()
      }))
      .sort((a, b) => b.time - a.time);
    
    // 최근 5개를 제외하고 삭제
    files.slice(5).forEach(f => {
      fs.unlinkSync(path.join(config.screenshotDir, f.name));
      console.log(`🗑️  오래된 스크린샷 삭제: ${f.name}`);
    });
  } catch (error) {
    console.warn('⚠️  스크린샷 정리 실패:', error.message);
  }
}

// 스크린샷 저장
async function takeScreenshot(page, name) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `pdf-preview-test-${name}-${timestamp}.png`;
  const filepath = path.join(config.screenshotDir, filename);
  await page.screenshot({ path: filepath, fullPage: true });
  console.log(`📸 스크린샷 저장: ${filename}`);
  return filepath;
}

// 로그인
async function login(page) {
  console.log('🔐 로그인 중...');
  await page.goto(config.frontendUrl, { waitUntil: 'networkidle0', timeout: 60000 });
  await page.waitForTimeout(2000);
  
  // 이미 로그인되어 있는지 확인
  const isLoggedIn = await page.evaluate(() => {
    return document.querySelector('#login-screen')?.classList.contains('hidden') || false;
  });
  
  if (isLoggedIn) {
    console.log('✅ 이미 로그인되어 있습니다.');
    return true;
  }
  
  // 로그인 시도
  try {
    await page.type('#email', config.testUser.email, { delay: 100 });
    await page.type('#password', config.testUser.password, { delay: 100 });
    await page.click('button[type="submit"]');
    await page.waitForSelector('#login-screen.hidden', { visible: false, timeout: 10000 });
    console.log('✅ 로그인 성공');
    return true;
  } catch (error) {
    console.error('❌ 로그인 실패:', error.message);
    return false;
  }
}

// 테스트 실행
async function testPDFPreview() {
  console.log('🚀 PDF 미리보기 기능 테스트 시작\n');
  
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
  
  try {
    // 1. 로그인
    const loginSuccess = await login(page);
    if (!loginSuccess) {
      throw new Error('로그인 실패');
    }
    await page.waitForTimeout(2000);
    await takeScreenshot(page, '01-login');
    
    // 2. 보고서 화면으로 이동
    console.log('\n📋 보고서 화면으로 이동 중...');
    await page.click('#tab-report');
    await page.waitForSelector('#report', { visible: true, timeout: 10000 });
    await page.waitForTimeout(2000);
    await takeScreenshot(page, '02-report-screen');
    
    // 3. 하자 유무 확인
    console.log('\n🔍 하자 유무 확인 중...');
    const hasDefects = await page.evaluate(() => {
      const previewDiv = document.querySelector('#report-preview');
      if (!previewDiv) return false;
      
      const noDefectsMessage = previewDiv.textContent.includes('등록된 하자가 없습니다');
      const hasCards = previewDiv.querySelectorAll('.card').length > 0;
      
      return !noDefectsMessage && hasCards;
    });
    
    console.log(`📊 하자 상태: ${hasDefects ? '하자 있음' : '하자 없음'}`);
    
    // 4. PDF 버튼 표시 여부 확인
    console.log('\n🔘 PDF 버튼 표시 여부 확인 중...');
    const buttonVisibility = await page.evaluate(() => {
      const buttonGroup = document.querySelector('#report .button-group');
      if (!buttonGroup) return { visible: false, reason: '버튼 그룹을 찾을 수 없음' };
      
      const style = window.getComputedStyle(buttonGroup);
      const isVisible = style.display !== 'none';
      const previewButton = buttonGroup.querySelector('button[onclick*="previewReportAsPdf"]');
      const downloadButton = buttonGroup.querySelector('button[onclick*="downloadReportAsPdf"]');
      
      return {
        visible: isVisible,
        hasPreviewButton: !!previewButton,
        hasDownloadButton: !!downloadButton,
        display: style.display
      };
    });
    
    console.log('📊 버튼 상태:', buttonVisibility);
    
    // 5. 하자 유무에 따른 버튼 표시 검증
    if (hasDefects) {
      if (!buttonVisibility.visible) {
        throw new Error('❌ 하자가 있는데 PDF 버튼이 표시되지 않습니다!');
      }
      console.log('✅ 하자가 있어서 PDF 버튼이 표시됩니다.');
    } else {
      if (buttonVisibility.visible) {
        throw new Error('❌ 하자가 없는데 PDF 버튼이 표시됩니다!');
      }
      console.log('✅ 하자가 없어서 PDF 버튼이 숨겨집니다.');
    }
    
    await takeScreenshot(page, '03-button-check');
    
    // 6. 하자가 없는 경우 테스트 종료
    if (!hasDefects) {
      console.log('\n⚠️  하자가 없어서 PDF 테스트를 건너뜁니다.');
      console.log('💡 하자를 등록한 후 다시 테스트하세요.');
      return;
    }
    
    // 7. PDF 미리보기 테스트
    console.log('\n👁️  PDF 미리보기 테스트 중...');
    const previewButton = await page.$('#report .button-group button[onclick*="previewReportAsPdf"]');
    if (!previewButton) {
      throw new Error('PDF 미리보기 버튼을 찾을 수 없습니다');
    }
    
    // PDF 생성 및 미리보기 실행
    await previewButton.click();
    await page.waitForTimeout(3000);
    
    // 새 창이 열렸는지 확인
    const pages = await browser.pages();
    const previewPage = pages[pages.length - 1];
    
    if (previewPage.url() !== page.url()) {
      console.log('✅ PDF 미리보기 창이 열렸습니다.');
      await previewPage.waitForTimeout(2000);
      await previewPage.screenshot({ 
        path: path.join(config.screenshotDir, `pdf-preview-test-04-preview-window-${Date.now()}.png`),
        fullPage: true 
      });
      
      // PDF 내용 확인
      const pdfContent = await previewPage.evaluate(() => {
        return document.body.innerText.substring(0, 200);
      });
      console.log('📄 PDF 내용 (처음 200자):', pdfContent.substring(0, 200));
      
      await previewPage.close();
    } else {
      console.log('⚠️  새 창이 열리지 않았습니다. 팝업 차단을 확인하세요.');
    }
    
    await page.waitForTimeout(2000);
    await takeScreenshot(page, '05-after-preview');
    
    // 8. PDF 다운로드 테스트
    console.log('\n📥 PDF 다운로드 테스트 중...');
    const downloadButton = await page.$('#report .button-group button[onclick*="downloadReportAsPdf"]');
    if (!downloadButton) {
      throw new Error('PDF 다운로드 버튼을 찾을 수 없습니다');
    }
    
    // 다운로드 이벤트 리스너 설정
    const downloadPromise = new Promise((resolve) => {
      page._client.on('Page.downloadProgress', (event) => {
        if (event.state === 'completed') {
          resolve(event.guid);
        }
      });
    });
    
    await downloadButton.click();
    await page.waitForTimeout(5000);
    
    // 다운로드된 파일 확인
    const downloadedFiles = fs.readdirSync(config.reportDir)
      .filter(f => f.endsWith('.pdf'))
      .map(f => ({
        name: f,
        time: fs.statSync(path.join(config.reportDir, f)).mtime.getTime()
      }))
      .sort((a, b) => b.time - a.time);
    
    if (downloadedFiles.length > 0) {
      const latestFile = downloadedFiles[0];
      const fileSize = fs.statSync(path.join(config.reportDir, latestFile.name)).size;
      console.log(`✅ PDF 다운로드 완료: ${latestFile.name} (${(fileSize / 1024).toFixed(2)} KB)`);
    } else {
      console.log('⚠️  다운로드된 PDF 파일을 찾을 수 없습니다.');
    }
    
    await takeScreenshot(page, '06-after-download');
    
    // 9. 테스트 완료
    console.log('\n✅ 모든 테스트 완료!');
    
  } catch (error) {
    console.error('\n❌ 테스트 실패:', error.message);
    await takeScreenshot(page, 'error');
    throw error;
  } finally {
    await browser.close();
    cleanupOldScreenshots();
  }
}

// 실행
testPDFPreview()
  .then(() => {
    console.log('\n🎉 테스트 성공적으로 완료되었습니다!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 테스트 실패:', error);
    process.exit(1);
  });

