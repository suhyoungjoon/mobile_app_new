/**
 * 기존 등록된 하자 재조회 시 등록된 내용 그대로 가져와서 화면에 보여줄 수 있는지 검증
 * 1) 하자 등록 → 2) case_id 목록 조회 → 3) defect id 단건 조회 → 필드 일치 검증
 * 사용: node scripts/test-defect-retrieve-display.js
 * 환경변수: BACKEND_URL (기본 http://localhost:3000)
 */
const BASE = process.env.BACKEND_URL || 'http://localhost:3000';

function log(step, msg, extra = '') {
  console.log(`[${step}] ${msg}${extra ? ' ' + extra : ''}`);
}

async function request(method, urlPath, body = null, token = null) {
  const opts = { method, headers: {} };
  if (body && typeof body === 'object' && !(body instanceof FormData)) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  if (token) opts.headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${urlPath}`, opts);
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
    return {};
  }
  if (!res.ok) throw new Error(json.error || json.message || `HTTP ${res.status}`);
  return json;
}

function assertEqual(actual, expected, fieldName) {
  const a = actual == null ? '' : String(actual).trim();
  const e = expected == null ? '' : String(expected).trim();
  if (a !== e) {
    throw new Error(`재조회 필드 불일치 [${fieldName}]: 등록="${e}" vs 조회="${a}"`);
  }
}

async function run() {
  console.log('=== 기존 등록 하자 재조회 시 등록 내용 그대로 반환·표시 검증 ===\n');
  console.log(`서버: ${BASE}`);

  const location = '거실';
  const trade = '도배';
  const content = '재조회검증_하자내용_' + Date.now();
  const memo = '재조회검증_메모';

  let residentToken, caseId, defectId;

  // 1. 세대주 로그인
  log('1', '세대주 로그인...');
  const loginRes = await request('POST', '/api/auth/session', {
    complex: '서울 인싸이트자이',
    dong: '8',
    ho: '801',
    name: '재조회테스트',
    phone: '010-3333-4444'
  });
  residentToken = loginRes.token;
  if (!residentToken) throw new Error('세대주 로그인 실패');
  log('1', 'OK');

  // 2. 케이스 생성 후 하자 등록 (등록 내용 고정)
  log('2', '케이스 생성 및 하자 등록...');
  const caseRes = await request('POST', '/api/cases', { type: '하자접수' }, residentToken);
  caseId = caseRes.id;
  if (!caseId) throw new Error('케이스 생성 실패');

  const defectRes = await request('POST', '/api/defects', {
    case_id: caseId,
    location,
    trade,
    content,
    memo
  }, residentToken);
  defectId = defectRes.id;
  if (!defectId) throw new Error('하자 등록 실패');
  log('2', `OK caseId=${caseId}, defectId=${defectId}`);

  // 3. 재조회(1): GET /api/defects?case_id=xxx — 목록에서 가져오기 (화면: 하자 목록)
  log('3', '재조회(목록) GET /api/defects?case_id=...');
  const list = await request('GET', `/api/defects?case_id=${caseId}`, null, residentToken);
  const defects = Array.isArray(list) ? list : (list.defects || []);
  const fromList = defects.find((d) => d.id === defectId);
  if (!fromList) throw new Error('목록 재조회 시 해당 하자를 찾을 수 없음');

  assertEqual(fromList.location, location, 'location');
  assertEqual(fromList.trade, trade, 'trade');
  assertEqual(fromList.content, content, 'content');
  assertEqual(fromList.memo, memo, 'memo');
  log('3', 'OK 목록 응답에 location/trade/content/memo 동일');

  // 4. 재조회(2): GET /api/defects/:id — 단건 조회 (화면: 하자 수정/상세)
  log('4', '재조회(단건) GET /api/defects/:id');
  const single = await request('GET', `/api/defects/${defectId}`, null, residentToken);
  assertEqual(single.location, location, 'location');
  assertEqual(single.trade, trade, 'trade');
  assertEqual(single.content, content, 'content');
  assertEqual(single.memo, memo, 'memo');
  log('4', 'OK 단건 응답에 location/trade/content/memo 동일');

  // 5. 화면 표시에 필요한 필드 존재 여부 (목록/상세에서 사용하는 키)
  const requiredKeys = ['id', 'case_id', 'location', 'trade', 'content', 'created_at'];
  for (const key of requiredKeys) {
    if (!(key in single)) throw new Error(`단건 응답에 화면 표시 필드 없음: ${key}`);
  }
  log('5', `OK 화면 표시 필드 존재: ${requiredKeys.join(', ')}`);
  if (single.photos && !Array.isArray(single.photos)) {
    throw new Error('단건 응답 photos가 배열이 아님');
  }
  log('5', `OK photos 배열 존재 (${(single.photos || []).length}건)`);

  console.log('\n--- 시나리오 2: 기존에 등록된 하자 재조회 검증 ---');

  // 6. 점검원으로 기존 하자 목록 조회 후, 첫 하자 단건 재조회하여 내용 일치 확인
  log('6', '점검원 로그인...');
  const inspLogin = await request('POST', '/api/auth/session', {
    complex: 'admin',
    dong: '000',
    ho: '000',
    name: '점검원',
    phone: '010-0000-0000'
  });
  const inspectorToken = inspLogin.token;
  if (!inspectorToken) throw new Error('점검원 로그인 실패');

  log('6', '기존 사용자(세대) 하자 목록 조회...');
  const usersRes = await request('GET', '/api/defects/users', null, inspectorToken);
  const users = usersRes.users || [];
  if (users.length === 0) {
    log('6', '건너뜀 (하자 등록 세대 없음)');
  } else {
    const householdId = users[0].household_id ?? users[0].id;
    const byHousehold = await request('GET', `/api/defects/by-household/${householdId}`, null, inspectorToken);
    const existingDefects = byHousehold.defects || [];
    if (existingDefects.length === 0) {
      log('6', '건너뜀 (해당 세대 하자 없음)');
    } else {
      const first = existingDefects[0];
      const ref = { id: first.id, location: first.location, trade: first.trade, content: first.content, memo: first.memo };
      const singleExisting = await request('GET', `/api/defects/${first.id}`, null, inspectorToken);
      assertEqual(singleExisting.location, ref.location, '기존 location');
      assertEqual(singleExisting.trade, ref.trade, '기존 trade');
      assertEqual(singleExisting.content, ref.content, '기존 content');
      assertEqual(singleExisting.memo, ref.memo, '기존 memo');
      log('6', `OK 기존 하자 재조회 일치 (defectId=${first.id})`);
    }
  }

  console.log('\n=== 검증 통과: 등록된 하자 재조회 시 등록 내용 그대로 반환됨 → 화면에 그대로 표시 가능 ===');
}

run().catch((err) => {
  console.error('\n❌ 검증 실패:', err.message);
  process.exit(1);
});
