/**
 * 최종보고서 / 최종보고서(수치중심) / 수기보고서 생성 테스트
 * 점검 테스트와 동일한 세대(household) 사용: 점검원 로그인 → 세대 조회 → 3종 보고서 생성
 * 사용: BACKEND_URL=https://mobile-app-new.onrender.com node scripts/test-report-three-types.js
 */
const BASE = process.env.BACKEND_URL || 'http://localhost:3000';

function log(step, msg, extra = '') {
  console.log(`[${step}] ${msg}${extra ? ' ' + extra : ''}`);
}

async function request(method, path, body = null, token = null) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (token) opts.headers['Authorization'] = `Bearer ${token}`;
  if (body && method !== 'GET') opts.body = JSON.stringify(body);
  const url = path.startsWith('http') ? path : `${BASE}${path}`;
  const res = await fetch(url, opts);
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
    return {};
  }
  if (!res.ok) throw new Error(json.message || json.error || json.error_message || `HTTP ${res.status}`);
  return json;
}

async function run() {
  console.log('=== 최종보고서 / 최종보고서(수치중심) / 수기보고서 생성 테스트 ===\n');
  console.log(`서버: ${BASE}\n`);

  let inspectorToken;
  let householdId;

  log('1', '점검원 로그인...');
  const loginRes = await request('POST', '/api/auth/session', {
    complex: 'admin',
    dong: '000',
    ho: '000',
    name: '점검원',
    phone: '010-0000-0000'
  });
  inspectorToken = loginRes.token;
  if (!inspectorToken) throw new Error('점검원 로그인 실패');
  log('1', 'OK');

  log('2', '하자 등록 세대 목록 조회 (보고서 대상 세대)...');
  const usersRes = await request('GET', '/api/defects/users', null, inspectorToken);
  const list = usersRes.users || usersRes || [];
  const users = Array.isArray(list) ? list : [];
  if (users.length === 0) throw new Error('하자 등록 세대가 없습니다. 점검결과 등록 테스트를 먼저 실행하세요.');
  householdId = users[0].household_id ?? users[0].id;
  log('2', `OK householdId=${householdId}`);

  const reportTests = [
    { template: 'final-report', name: '최종보고서' },
    { template: 'final-report-values', name: '최종보고서(수치중심)' },
    { template: 'summary-report', name: '수기보고서' }
  ];

  for (let i = 0; i < reportTests.length; i++) {
    const { template, name } = reportTests[i];
    const step = String(3 + i);
    log(step, `${name} 생성 (template=${template})...`);
    const res = await request('POST', '/api/reports/generate', {
      household_id: householdId,
      template
    }, inspectorToken);
    if (!res.success || !res.filename) throw new Error(`${name} 생성 실패: ${res.message || res.error || 'filename 없음'}`);
    log(step, `OK filename=${res.filename} size=${res.size ?? '-'}`);
  }

  console.log('\n=== 보고서 생성 테스트 요약 ===');
  console.log('  최종보고서: 생성 성공');
  console.log('  최종보고서(수치중심): 생성 성공');
  console.log('  수기보고서: 생성 성공');
  console.log('\n=== 전체 통과 ===');
}

run().catch((err) => {
  console.error('\n❌ 실패:', err.message);
  process.exit(1);
});
