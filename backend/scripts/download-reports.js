/**
 * 방금 생성된 보고서 3개를 로컬 downloaded-reports/ 로 다운로드
 * 사용: node scripts/download-reports.js [수기보고서파일명] [점검결과양식파일명] [최종보고서파일명]
 * 또는 환경변수: SUMMARY_FILENAME, FORM_FILENAME, FINAL_FILENAME
 */
const fs = require('fs');
const path = require('path');

const BASE = process.env.BACKEND_URL || 'https://mobile-app-new.onrender.com';
const OUT_DIR = path.join(__dirname, '..', '..', 'downloaded-reports');

const filenames = [
  process.env.SUMMARY_FILENAME || process.argv[2] || '수기보고서_2-696_202602120219.pdf',
  process.env.FORM_FILENAME || process.argv[3] || '점검결과양식_2-696_202602120220.pdf',
  process.env.FINAL_FILENAME || process.argv[4] || '보고서_최종_2-696_202602120220.pdf'
];

async function login() {
  const res = await fetch(`${BASE}/api/auth/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      complex: 'admin',
      dong: '000',
      ho: '000',
      name: '점검원',
      phone: '010-0000-0000'
    })
  });
  const data = await res.json();
  if (!data.token) throw new Error('점검원 로그인 실패');
  return data.token;
}

async function download(token, filename) {
  const url = `${BASE}/api/reports/download/${encodeURIComponent(filename)}`;
  const res = await fetch(url, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!res.ok) throw new Error(`${filename}: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function run() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
  console.log('로그인...');
  const token = await login();
  for (const filename of filenames) {
    console.log(`다운로드: ${filename}`);
    const buf = await download(token, filename);
    const outPath = path.join(OUT_DIR, filename);
    fs.writeFileSync(outPath, buf);
    console.log(`  -> ${outPath} (${buf.length} bytes)`);
  }
  console.log('완료.');
}

run().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
