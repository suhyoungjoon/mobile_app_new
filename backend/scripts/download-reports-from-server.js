/**
 * 배포 서버에서 보고서 생성 후 로컬로 다운로드
 * - 점검원 로그인 → 세대 선택 → 최종보고서/수기보고서 생성 → PDF 저장
 */
const BASE = process.env.BACKEND_URL || 'https://mobile-app-new.onrender.com';
const fs = require('fs');
const path = require('path');

const OUT_DIR = path.join(__dirname, '..', 'reports', 'downloaded');

function log(msg, extra = '') {
  console.log(`${msg}${extra ? ' ' + extra : ''}`);
}

async function request(method, path, body = null, token = null) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (token) opts.headers['Authorization'] = `Bearer ${token}`;
  if (body && method !== 'GET') opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 150)}`);
    return {};
  }
  if (!res.ok) throw new Error(json.message || json.error || `HTTP ${res.status}`);
  return json;
}

async function downloadPdf(filename, token) {
  const res = await fetch(`${BASE}/api/reports/download/${encodeURIComponent(filename)}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Download failed ${res.status}: ${t.slice(0, 200)}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

async function run() {
  console.log('=== 배포 서버 보고서 로컬 다운로드 ===\n');
  console.log(`서버: ${BASE}`);
  console.log(`저장 경로: ${OUT_DIR}\n`);

  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
    log('폴더 생성:', OUT_DIR);
  }

  // 로그인
  log('점검원 로그인...');
  const loginRes = await request('POST', '/api/auth/session', {
    complex: 'admin',
    dong: '000',
    ho: '000',
    name: '점검원',
    phone: '010-0000-0000'
  });
  const token = loginRes.token;
  if (!token) throw new Error('로그인 실패');

  // 하자 등록 세대 목록
  const usersRes = await request('GET', '/api/defects/users', null, token);
  const users = usersRes.users || [];
  if (users.length === 0) throw new Error('하자 등록 세대 없음');
  const householdId = users[0].household_id || users[0].id;
  log('대상 세대:', `householdId=${householdId}`);

  const files = [];

  // 최종보고서 생성
  log('최종보고서 생성 중...');
  const finalRes = await request('POST', '/api/reports/generate', {
    household_id: householdId,
    template: 'final-report'
  }, token);
  if (finalRes.filename) {
    log('  생성됨:', finalRes.filename);
    const buf = await downloadPdf(finalRes.filename, token);
    const outPath = path.join(OUT_DIR, finalRes.filename);
    fs.writeFileSync(outPath, buf);
    files.push(outPath);
    log('  저장:', outPath);
  } else {
    log('  최종보고서 생성 실패');
  }

  // 수기보고서 생성
  log('수기보고서 생성 중...');
  const sumRes = await request('POST', '/api/reports/generate', {
    household_id: householdId,
    template: 'summary-report'
  }, token);
  if (sumRes.filename) {
    log('  생성됨:', sumRes.filename);
    const buf = await downloadPdf(sumRes.filename, token);
    const outPath = path.join(OUT_DIR, sumRes.filename);
    fs.writeFileSync(outPath, buf);
    files.push(outPath);
    log('  저장:', outPath);
  } else {
    log('  수기보고서 생성 실패');
  }

  console.log('\n=== 완료 ===');
  console.log('다운로드된 파일:');
  files.forEach((f) => console.log('  ', f));
}

run().catch((err) => {
  console.error('오류:', err.message);
  process.exit(1);
});
