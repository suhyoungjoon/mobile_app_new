/**
 * 배포된 앱(세대주·점검원) 화면을 처리 순서대로 Puppeteer로 캡처합니다.
 *
 * 실행:
 *   cd backend && npm install && node scripts/capture-screenshots.js
 *
 * BASE_URL은 index.html / inspector.html 이 서빙되는 프론트엔드 주소로 설정하세요.
 * (API 서버가 아닌, 실제 웹앱이 열리는 URL입니다. Vercel/Netlify 등 프론트 호스팅 URL.)
 *
 * 환경변수:
 *   BASE_URL  - 웹앱 루트 URL (예: https://your-app.vercel.app)
 *   OUT_DIR   - 캡처 저장 폴더 (기본: ../docs/screens)
 */
const path = require('path');
const fs = require('fs');

const BASE_URL = process.env.BASE_URL || '';
const OUT_DIR = path.resolve(__dirname, process.env.OUT_DIR || '../docs/screens');

async function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function capture(name, page, options = {}) {
  await ensureDir(OUT_DIR);
  const file = path.join(OUT_DIR, `${name}.png`);
  await page.screenshot({ path: file, fullPage: options.fullPage !== false });
  console.log(`  캡처: ${file}`);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function run() {
  let puppeteer;
  try {
    puppeteer = require('puppeteer');
  } catch (e) {
    console.error('Puppeteer가 없습니다. backend에서 npm install 후 실행하세요.');
    process.exit(1);
  }

  if (!BASE_URL) {
    console.error('BASE_URL이 비어 있습니다. 웹앱이 배포된 URL을 지정하세요.');
    console.error('예: BASE_URL=https://your-app.vercel.app node scripts/capture-screenshots.js');
    process.exit(1);
  }
  ensureDir(OUT_DIR);
  console.log('BASE_URL:', BASE_URL);
  console.log('OUT_DIR:', OUT_DIR);
  console.log('');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844 });
  await page.setUserAgent(
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (Kernel like Gecko) Version/16.0 Mobile/15E148 Safari/604.1'
  );

  try {
    // ----- 세대주 플로우 (메인 앱) -----
    console.log('[세대주] 로그인 화면 로드 중...');
    await page.goto(BASE_URL + '/', { waitUntil: 'networkidle0', timeout: 60000 });
    await sleep(2000);
    await capture('01_세대주_로그인', page);

    console.log('[세대주] 로그인 실행 (테스트 계정)...');
    await page.evaluate(() => {
      const c = document.getElementById('login-complex');
      const d = document.getElementById('login-dong');
      const h = document.getElementById('login-ho');
      const n = document.getElementById('login-name');
      const p = document.getElementById('login-phone');
      if (c) c.value = '서울 인싸이트자이';
      if (d) d.value = '101';
      if (h) h.value = '1203';
      if (n) n.value = '홍길동';
      if (p) p.value = '010-1234-5678';
    });
    await page.click('button[onclick="onLogin()"]').catch(() => {});
    await sleep(4000);

    const listVisible = await page.$('#list.screen:not(.hidden)').then((e) => !!e);
    if (listVisible) {
      await capture('02_세대주_목록', page);
    } else {
      await capture('02_세대주_로그인후', page);
    }

    // ----- 점검원 플로우 (inspector.html) -----
    console.log('[점검원] inspector 화면 로드 중...');
    await page.goto(BASE_URL + '/inspector.html', { waitUntil: 'networkidle0', timeout: 60000 });
    await sleep(2000);
    await capture('03_점검원_로그인', page);

    console.log('[점검원] 로그인 (admin)...');
    await page.evaluate(() => {
      const c = document.getElementById('login-complex');
      const d = document.getElementById('login-dong');
      const h = document.getElementById('login-ho');
      const n = document.getElementById('login-name');
      const p = document.getElementById('login-phone');
      if (c) c.value = 'admin';
      if (d) d.value = '000';
      if (h) h.value = '000';
      if (n) n.value = '점검원';
      if (p) p.value = '010-0000-0000';
    });
    await page.click('button[onclick="onLogin()"]').catch(() => {});
    await sleep(4000);

    const userListVisible = await page.$('#user-list.screen:not(.hidden)').then((e) => !!e);
    if (userListVisible) {
      await capture('04_점검원_사용자목록', page);
      const firstUser = await page.$('#user-list-container .card, #user-list-container [onclick*="selectUser"]');
      if (firstUser) {
        await firstUser.click();
        await sleep(3000);
        await capture('05_점검원_하자목록', page);
        const reportBtn = await page.$('button[onclick*="onPreviewReport"], button[onclick*="showReport"]');
        if (reportBtn) {
          await reportBtn.click();
          await sleep(2000);
          const reportScreen = await page.$('#report.screen:not(.hidden)');
          if (reportScreen) await capture('06_점검원_보고서', page);
        }
        const inspectBtn = await page.$('button[onclick*="openDefectSelectModal"], button[onclick*="점검결과"]');
        if (inspectBtn) {
          await inspectBtn.click();
          await sleep(1500);
          const modal = await page.$('.modal, [class*="modal"]');
          if (modal) {
            const firstDefect = await page.$('[data-defect-id], .defect-card, [onclick*="startInspection"]');
            if (firstDefect) await firstDefect.click();
            await sleep(2000);
          }
          const inspectionVisible = await page.$('#defect-inspection.screen:not(.hidden)').then((e) => !!e);
          if (inspectionVisible) await capture('07_점검원_점검결과입력', page);
        }
      }
    } else {
      await capture('04_점검원_로그인후', page);
    }
  } catch (err) {
    console.error('캡처 중 오류:', err.message);
  } finally {
    await browser.close();
  }

  console.log('');
  console.log('캡처 완료. 저장 위치:', OUT_DIR);
}

run();
