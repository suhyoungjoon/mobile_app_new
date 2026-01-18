/**
 * PDF 미리보기 및 다운로드 기능 녹화 스크립트
 * Puppeteer를 사용하여 화면을 녹화하고 동영상으로 저장
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const config = {
  frontendUrl: process.env.FRONTEND_URL || 'https://insighti.vercel.app',
  backendUrl: process.env.BACKEND_URL || 'https://mobile-app-new.onrender.com',
  testUser: {
    complex: '테스트 단지',
    dong: '101',
    ho: '1203',
    name: '홍길동',
    phone: '010-1234-5678'
  },
  outputDir: path.join(__dirname, '..', 'recordings'),
  screenshotsDir: path.join(__dirname, '..', 'recordings', 'screenshots')
};

// 디렉토리 생성
function ensureDirectories() {
  if (!fs.existsSync(config.outputDir)) {
    fs.mkdirSync(config.outputDir, { recursive: true });
  }
  if (!fs.existsSync(config.screenshotsDir)) {
    fs.mkdirSync(config.screenshotsDir, { recursive: true });
  }
}

// 대기 함수
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 팝업 제거 헬퍼 함수
async function removePopups(page) {
  try {
    await page.evaluate(() => {
      // 푸시 알림 다이얼로그 제거
      const dialogs = document.querySelectorAll('.notification-permission-dialog, dialog, .modal, .popup, [role="dialog"]');
      dialogs.forEach(dialog => {
        dialog.remove();
        dialog.style.display = 'none';
        dialog.classList.add('hidden');
        dialog.style.visibility = 'hidden';
      });
      
      // showNotificationPermissionDialog 함수 비활성화
      if (window.showNotificationPermissionDialog) {
        window.showNotificationPermissionDialog = function() {};
      }
    });
    
    // ESC 키로 팝업 닫기 시도
    for (let i = 0; i < 2; i++) {
      await page.keyboard.press('Escape');
      await wait(200);
    }
    
    await wait(300);
  } catch (e) {
    // 무시
  }
}

// 스크린샷 저장
async function takeScreenshot(page, name, delay = 500) {
  await wait(delay);
  
  // 스크린샷 전에 팝업 제거
  await removePopups(page);
  
  const screenshotPath = path.join(config.screenshotsDir, `${name}.png`);
  await page.screenshot({ 
    path: screenshotPath, 
    fullPage: true,
    type: 'png'
  });
  console.log(`📸 스크린샷 저장: ${name}`);
  return screenshotPath;
}

// 동영상 생성 (FFmpeg 사용)
function createVideo(screenshots, outputPath, fps = 2) {
  try {
    // FFmpeg가 설치되어 있는지 확인
    execSync('which ffmpeg', { stdio: 'ignore' });
    
    console.log('🎬 동영상 생성 중...');
    
    // 임시 파일 목록 생성
    const fileListPath = path.join(config.screenshotsDir, 'filelist.txt');
    const fileList = screenshots.map((file, index) => 
      `file '${path.basename(file)}'\nduration ${1/fps}`
    ).join('\n') + `\nfile '${path.basename(screenshots[screenshots.length - 1])}'`;
    
    fs.writeFileSync(fileListPath, fileList);
    
    // FFmpeg로 동영상 생성
    const ffmpegCmd = `cd "${config.screenshotsDir}" && ffmpeg -f concat -safe 0 -i filelist.txt -vf "fps=${fps},scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2" -pix_fmt yuv420p "${outputPath}" -y`;
    
    execSync(ffmpegCmd, { stdio: 'inherit' });
    
    // 임시 파일 삭제
    fs.unlinkSync(fileListPath);
    
    console.log(`✅ 동영상 생성 완료: ${outputPath}`);
    return outputPath;
  } catch (error) {
    console.warn('⚠️ FFmpeg가 설치되어 있지 않거나 동영상 생성 실패');
    console.warn('   스크린샷만 저장되었습니다.');
    console.warn('   동영상을 생성하려면 FFmpeg를 설치하세요: brew install ffmpeg');
    return null;
  }
}

// 메인 녹화 함수
async function recordPDFFeature() {
  console.log('🎥 PDF 미리보기 및 다운로드 기능 녹화 시작\n');
  console.log(`프론트엔드 URL: ${config.frontendUrl}`);
  console.log(`백엔드 URL: ${config.backendUrl}\n`);
  
  ensureDirectories();
  
  // Chrome 실행 경로 확인
  const chromePaths = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium'
  ];
  
  let executablePath = null;
  for (const chromePath of chromePaths) {
    if (fs.existsSync(chromePath)) {
      executablePath = chromePath;
      break;
    }
  }
  
  const launchOptions = {
    headless: false,
    defaultViewport: {
      width: 1920,
      height: 1080
    },
    args: [
      '--start-maximized',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-notifications', // 푸시 알림 팝업 비활성화
      '--disable-permissions-api' // 권한 API 비활성화
    ]
  };
  
  if (executablePath) {
    launchOptions.executablePath = executablePath;
  }
  
  const browser = await puppeteer.launch(launchOptions);
  
  const page = await browser.newPage();
  
  // 푸시 알림 권한 거부 설정 (CDP 사용)
  const client = await page.target().createCDPSession();
  try {
    await client.send('Browser.setPermission', {
      origin: config.frontendUrl,
      permission: { name: 'notifications' },
      setting: 'denied'
    });
  } catch (e) {
    // CDP API가 지원되지 않을 수 있음
    console.log('⚠️ CDP 권한 설정 실패, JavaScript로 처리');
  }
  
  // JavaScript로 푸시 알림 팝업 방지
  await page.evaluateOnNewDocument(() => {
    // Notification.requestPermission을 오버라이드하여 항상 'denied' 반환
    if (window.Notification) {
      const originalRequestPermission = Notification.requestPermission.bind(Notification);
      Notification.requestPermission = function() {
        return Promise.resolve('denied');
      };
    }
    
    // showNotificationPermissionDialog 함수 오버라이드
    window.showNotificationPermissionDialog = function() {
      // 팝업을 표시하지 않음
      console.log('푸시 알림 팝업 차단됨 (녹화 모드)');
    };
    
    // DOMContentLoaded 이벤트에서도 팝업 방지
    document.addEventListener('DOMContentLoaded', () => {
      // 5초 후 팝업이 뜨는 것을 방지
      const originalSetTimeout = window.setTimeout;
      window.setTimeout = function(callback, delay) {
        if (typeof callback === 'function' && delay >= 4000 && delay <= 6000) {
          // 5초 후 실행되는 함수가 showNotificationPermissionDialog인지 확인
          const callbackStr = callback.toString();
          if (callbackStr.includes('showNotificationPermissionDialog') || 
              callbackStr.includes('notification') ||
              callbackStr.includes('Notification')) {
            console.log('푸시 알림 팝업 타이머 차단됨');
            return 0; // 실행하지 않음
          }
        }
        return originalSetTimeout.apply(this, arguments);
      };
    }, { once: true });
  });
  
  const screenshots = [];
  
  try {
    // 1. 로그인 화면
    console.log('📱 1단계: 로그인 화면');
    await page.goto(config.frontendUrl, { waitUntil: 'networkidle2' });
    
    // 페이지 로드 후 팝업이 뜰 수 있으므로 대기
    await wait(3000); // 5초 타이머보다 먼저 캡처
    
    // 푸시 알림 팝업 제거
    await removePopups(page);
    
    await takeScreenshot(page, '01-login-screen');
    screenshots.push(path.join(config.screenshotsDir, '01-login-screen.png'));
    
    // 2. 로그인 정보 입력
    console.log('📝 2단계: 로그인 정보 입력');
    await page.type('#login-complex', config.testUser.complex, { delay: 100 });
    await page.type('#login-dong', config.testUser.dong, { delay: 100 });
    await page.type('#login-ho', config.testUser.ho, { delay: 100 });
    await page.type('#login-name', config.testUser.name, { delay: 100 });
    await page.type('#login-phone', config.testUser.phone, { delay: 100 });
    await takeScreenshot(page, '02-login-filled');
    screenshots.push(path.join(config.screenshotsDir, '02-login-filled.png'));
    
    // 3. 로그인 버튼 클릭
    console.log('🔐 3단계: 로그인');
    await page.click('button[onclick="onLogin()"]');
    await wait(2000);
    
    // 로그인 후 푸시 알림 팝업이 뜰 수 있으므로 처리
    await wait(2000);
    try {
      // 푸시 알림 다이얼로그 제거
      await page.evaluate(() => {
        // 푸시 알림 다이얼로그 찾아서 제거
        const dialogs = document.querySelectorAll('.notification-permission-dialog, dialog, .modal, .popup, [role="dialog"]');
        dialogs.forEach(dialog => {
          dialog.remove();
          dialog.style.display = 'none';
          dialog.classList.add('hidden');
        });
        
        // showNotificationPermissionDialog 함수 비활성화
        if (window.showNotificationPermissionDialog) {
          window.showNotificationPermissionDialog = function() {};
        }
      });
      
      // ESC 키로 팝업 닫기 시도
      for (let i = 0; i < 3; i++) {
        await page.keyboard.press('Escape');
        await wait(300);
      }
      
      await wait(500);
    } catch (e) {
      // 팝업 처리 실패는 무시
      console.log('팝업 처리 중 오류 (무시):', e.message);
    }
    
    await takeScreenshot(page, '03-logged-in');
    screenshots.push(path.join(config.screenshotsDir, '03-logged-in.png'));
    
    // 4. 홈 화면 확인
    console.log('🏠 4단계: 홈 화면 확인');
    await page.waitForSelector('#list', { visible: true });
    await wait(1000);
    await takeScreenshot(page, '04-home-screen');
    screenshots.push(path.join(config.screenshotsDir, '04-home-screen.png'));
    
    // 5. 케이스 목록 확인
    console.log('📋 5단계: 케이스 목록 확인');
    await wait(1000);
    await takeScreenshot(page, '05-case-list');
    screenshots.push(path.join(config.screenshotsDir, '05-case-list.png'));
    
    // 6. 보고서 미리보기 버튼 확인
    console.log('📄 6단계: 보고서 미리보기 버튼 확인');
    await wait(2000); // 케이스 목록 로딩 대기
    
    // 보고서 미리보기 버튼 찾기
    const reportButton = await page.evaluateHandle(() => {
      return document.querySelector('button[onclick="onPreviewReport()"]') ||
             Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('보고서 미리보기'));
    });
    
    if (reportButton && (await reportButton.asElement())) {
      await page.evaluate(() => {
        const btn = document.querySelector('button[onclick="onPreviewReport()"]') ||
                   Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('보고서 미리보기'));
        if (btn) btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
      await wait(1000);
      await takeScreenshot(page, '06-report-button');
      screenshots.push(path.join(config.screenshotsDir, '06-report-button.png'));
      
      // 7. 보고서 미리보기 버튼 클릭
      console.log('👁️ 7단계: 보고서 미리보기');
      await page.evaluate(() => {
        const btn = document.querySelector('button[onclick="onPreviewReport()"]') ||
                   Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('보고서 미리보기'));
        if (btn) btn.click();
      });
      await wait(3000); // 모달/화면 전환 대기
      
      // 팝업 제거
      await removePopups(page);
      
      await takeScreenshot(page, '07-report-preview');
      screenshots.push(path.join(config.screenshotsDir, '07-report-preview.png'));
      
      // 8. PDF 버튼 그룹 확인 및 대기
      console.log('🔍 8단계: PDF 버튼 확인');
      
      // PDF 버튼이 나타날 때까지 대기 (최대 10초)
      let buttonGroupFound = false;
      for (let i = 0; i < 20; i++) {
        await wait(500);
        const buttonGroup = await page.evaluate(() => {
          const group = document.querySelector('.button-group');
          if (group) {
            const style = window.getComputedStyle(group);
            const isVisible = style.display !== 'none' && style.visibility !== 'hidden';
            const hasButtons = group.querySelectorAll('button').length > 0;
            return isVisible && hasButtons;
          }
          return false;
        });
        
        if (buttonGroup) {
          buttonGroupFound = true;
          console.log('✅ PDF 버튼 그룹 발견!');
          break;
        }
      }
      
      if (buttonGroupFound) {
        // 버튼 그룹을 화면 중앙으로 스크롤
        await page.evaluate(() => {
          const group = document.querySelector('.button-group');
          if (group) {
            group.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        });
        await wait(1000);
        
        // 팝업 제거
        await removePopups(page);
        
        await takeScreenshot(page, '08-pdf-buttons');
        screenshots.push(path.join(config.screenshotsDir, '08-pdf-buttons.png'));
        
        // 9. PDF 미리보기 버튼 클릭
        console.log('👁️ 9단계: PDF 미리보기 실행');
        
        // PDF 미리보기 버튼 찾기
        const previewButton = await page.evaluate(() => {
          return document.querySelector('button[onclick*="previewReportAsPdf"]') ||
                 Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('PDF 미리보기'));
        });
        
        if (previewButton) {
          console.log('✅ PDF 미리보기 버튼 발견');
          
          // 버튼을 화면에 보이도록 스크롤
          await page.evaluate(() => {
            const btn = document.querySelector('button[onclick*="previewReportAsPdf"]') ||
                       Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('PDF 미리보기'));
            if (btn) {
              btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          });
          await wait(1000);
          
          // 버튼 클릭 전 스크린샷
          await removePopups(page);
          await takeScreenshot(page, '09-before-pdf-preview-click');
          screenshots.push(path.join(config.screenshotsDir, '09-before-pdf-preview-click.png'));
          
          // 새 창이 열릴 것을 대비
          const pages = await browser.pages();
          const initialPageCount = pages.length;
          
          // 버튼 클릭
          await page.evaluate(() => {
            const btn = document.querySelector('button[onclick*="previewReportAsPdf"]') || 
                       Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('PDF 미리보기'));
            if (btn) {
              btn.click();
            }
          });
          
          console.log('⏳ PDF 생성 대기 중...');
          await wait(5000); // PDF 생성 대기
          
          // 새 창 확인
          const newPages = await browser.pages();
          if (newPages.length > initialPageCount) {
            console.log('✅ PDF 미리보기 새 창 열림');
            const pdfPage = newPages[newPages.length - 1];
            await wait(3000); // PDF 로딩 대기
            await takeScreenshot(pdfPage, '09-pdf-preview-window');
            screenshots.push(path.join(config.screenshotsDir, '09-pdf-preview-window.png'));
            await pdfPage.close();
          } else {
            // 같은 창에서 열린 경우
            console.log('ℹ️ 같은 창에서 PDF 미리보기 열림');
            await wait(3000);
            await removePopups(page);
            await takeScreenshot(page, '09-pdf-preview-same-window');
            screenshots.push(path.join(config.screenshotsDir, '09-pdf-preview-same-window.png'));
          }
        } else {
          console.log('⚠️ PDF 미리보기 버튼을 찾을 수 없습니다.');
        }
        
        // 10. 원래 화면으로 돌아가기
        console.log('🔙 10단계: 원래 화면으로 복귀');
        await page.bringToFront();
        await wait(2000);
        
        // PDF 버튼이 여전히 보이는지 확인
        const buttonGroupStillVisible = await page.evaluate(() => {
          const group = document.querySelector('.button-group');
          if (group) {
            const style = window.getComputedStyle(group);
            return style.display !== 'none' && style.visibility !== 'hidden';
          }
          return false;
        });
        
        if (buttonGroupStillVisible) {
          await page.evaluate(() => {
            const group = document.querySelector('.button-group');
            if (group) group.scrollIntoView({ behavior: 'smooth', block: 'center' });
          });
          await wait(1000);
        }
        
        await removePopups(page);
        await takeScreenshot(page, '10-back-to-preview');
        screenshots.push(path.join(config.screenshotsDir, '10-back-to-preview.png'));
        
        // 11. PDF 다운로드 버튼 클릭
        console.log('📥 11단계: PDF 다운로드 실행');
        
        // 다운로드 이벤트 리스너 설정
        const downloadClient = await page.target().createCDPSession();
        await downloadClient.send('Page.setDownloadBehavior', {
          behavior: 'allow',
          downloadPath: config.outputDir
        });
        
        // PDF 다운로드 버튼 찾기
        const downloadButton = await page.evaluate(() => {
          return document.querySelector('button[onclick*="downloadReportAsPdf"]') ||
                 Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('PDF 다운로드'));
        });
        
        if (downloadButton) {
          console.log('✅ PDF 다운로드 버튼 발견');
          
          // 버튼을 화면에 보이도록 스크롤
          await page.evaluate(() => {
            const btn = document.querySelector('button[onclick*="downloadReportAsPdf"]') ||
                       Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('PDF 다운로드'));
            if (btn) {
              btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          });
          await wait(1000);
          
          // 버튼 클릭 전 스크린샷
          await removePopups(page);
          await takeScreenshot(page, '11-before-pdf-download-click');
          screenshots.push(path.join(config.screenshotsDir, '11-before-pdf-download-click.png'));
          
          // 버튼 클릭
          await page.evaluate(() => {
            const btn = document.querySelector('button[onclick*="downloadReportAsPdf"]') || 
                       Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('PDF 다운로드'));
            if (btn) {
              btn.click();
            }
          });
          
          console.log('⏳ PDF 다운로드 대기 중...');
          await wait(5000); // 다운로드 대기
          
          await removePopups(page);
          await takeScreenshot(page, '11-pdf-download');
          screenshots.push(path.join(config.screenshotsDir, '11-pdf-download.png'));
        } else {
          console.log('⚠️ PDF 다운로드 버튼을 찾을 수 없습니다.');
        }
        
        // 12. 다운로드 완료 확인
        console.log('✅ 12단계: 다운로드 완료 확인');
        await wait(2000);
        await takeScreenshot(page, '12-download-complete');
        screenshots.push(path.join(config.screenshotsDir, '12-download-complete.png'));
      } else {
        console.log('⚠️ PDF 버튼 그룹을 찾을 수 없습니다.');
      }
      
    } else {
      console.log('⚠️ 보고서 미리보기 버튼을 찾을 수 없습니다.');
      console.log('   하자가 등록된 케이스가 필요합니다.');
    }
    
    // 최종 화면
    console.log('📸 최종 화면 캡처');
    await wait(1000);
    await takeScreenshot(page, '13-final-screen');
    screenshots.push(path.join(config.screenshotsDir, '13-final-screen.png'));
    
    console.log('\n✅ 녹화 완료!');
    console.log(`📁 스크린샷 저장 위치: ${config.screenshotsDir}`);
    console.log(`📊 총 ${screenshots.length}개의 스크린샷 캡처됨`);
    
    // 동영상 생성 시도
    const videoPath = path.join(config.outputDir, `pdf-feature-${Date.now()}.mp4`);
    const videoCreated = createVideo(screenshots, videoPath);
    
    if (videoCreated) {
      console.log(`🎬 동영상 저장 위치: ${videoPath}`);
    } else {
      console.log('\n💡 동영상 생성 방법:');
      console.log('   1. FFmpeg 설치: brew install ffmpeg');
      console.log('   2. 스크린샷을 수동으로 동영상으로 변환');
      console.log(`   3. 스크린샷 위치: ${config.screenshotsDir}`);
    }
    
  } catch (error) {
    console.error('❌ 녹화 중 오류 발생:', error);
    await takeScreenshot(page, 'error-screen');
  } finally {
    await browser.close();
  }
}

// 실행
recordPDFFeature().catch(error => {
  console.error('💥 스크립트 실행 중 오류:', error);
  process.exit(1);
});

