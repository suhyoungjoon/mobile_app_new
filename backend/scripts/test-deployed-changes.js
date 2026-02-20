/**
 * 배포 서버 기준 어제 이후 변경사항 테스트 (기존 데이터 활용)
 * - 건강 체크
 * - 점검원 로그인
 * - 하자 등록 세대 목록 → 세대 선택
 * - 세대별 점검결과 조회 (by-household)
 * - 보고서 미리보기
 * - 최종보고서 / 수기보고서 생성
 * - 점검 항목 수정 (PUT)
 */
const BASE = process.env.BACKEND_URL || 'https://mobile-app-new.onrender.com';

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
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 150)}`);
    return {};
  }
  if (!res.ok) throw new Error(json.message || json.error || `HTTP ${res.status}`);
  return json;
}

async function run() {
  console.log('=== 배포 서버 변경사항 테스트 (기존 데이터) ===\n');
  console.log(`서버: ${BASE}\n`);

  let inspectorToken = null;
  let householdId = null;
  let caseId = null;
  let firstInspectionItemId = null;
  let firstInspectionType = null;

  // 1. 건강 체크
  log('1', '건강 체크');
  try {
    const health = await request('GET', '/health');
    log('1', 'OK', health.status || 'ok');
  } catch (e) {
    log('1', '건강 체크 실패 (무시 가능)', e.message);
  }

  // 2. 점검원 로그인
  log('2', '점검원 로그인 (admin)');
  try {
    const loginRes = await request('POST', '/api/auth/session', {
      complex: 'admin',
      dong: '000',
      ho: '000',
      name: '점검원',
      phone: '010-0000-0000'
    });
    inspectorToken = loginRes.token;
    if (!inspectorToken) throw new Error('토큰 없음');
    log('2', 'OK');
  } catch (e) {
    console.error('   실패:', e.message);
    throw e;
  }

  // 3. 하자 등록된 세대 목록 (기존 데이터)
  log('3', '하자 등록 세대 목록 조회');
  try {
    const usersRes = await request('GET', '/api/defects/users', null, inspectorToken);
    const list = usersRes.users || usersRes || [];
    const users = Array.isArray(list) ? list : [];
    log('3', `OK 세대 수: ${users.length}`);
    if (users.length === 0) {
      console.log('\n   ⚠ 기존 하자 등록 세대가 없습니다. 하자 등록 후 다시 테스트하세요.');
      process.exit(0);
    }
    householdId = users[0].household_id || users[0].id;
    log('3', `   사용 householdId=${householdId}`);
  } catch (e) {
    console.error('   실패:', e.message);
    throw e;
  }

  // 4. 해당 세대 하자 목록
  log('4', '해당 세대 하자 목록 조회');
  try {
    const defRes = await request('GET', `/api/defects/by-household/${householdId}`, null, inspectorToken);
    const defects = defRes.defects || [];
    log('4', `OK 하자 수: ${defects.length}`);
    if (defects.length > 0) caseId = defects[0].case_id;
  } catch (e) {
    console.error('   실패:', e.message);
  }

  // 5. 세대별 점검결과 조회 (변경: 세대별 점검 구조)
  log('5', '세대별 점검결과 조회 GET /inspections/by-household/:id');
  try {
    const inspRes = await request('GET', `/api/inspections/by-household/${householdId}`, null, inspectorToken);
    const insp = inspRes.inspections || {};
    const total = inspRes.total || 0;
    log('5', `OK 총 점검 항목: ${total}`);
    const types = ['visual', 'air', 'radon', 'level', 'thermal'];
    for (const t of types) {
      const arr = insp[t] || [];
      if (arr.length > 0 && !firstInspectionItemId) {
        firstInspectionItemId = arr[0].id;
        firstInspectionType = t;
      }
      if (arr.length) log('5', `   ${t}: ${arr.length}건`);
    }
  } catch (e) {
    console.error('   실패:', e.message);
  }

  // 6. 보고서 미리보기
  log('6', '보고서 미리보기 GET /reports/preview');
  try {
    const previewRes = await request('GET', `/api/reports/preview?household_id=${householdId}`, null, inspectorToken);
    log('6', 'OK', previewRes.defects_count != null ? `하자 ${previewRes.defects_count}건` : '');
  } catch (e) {
    console.error('   실패:', e.message);
  }

  // 7. 최종보고서 생성 (변경: N개 블록/페이지 제한 해제)
  log('7', '최종보고서 생성 POST /reports/generate template=final-report');
  try {
    const finalRes = await request('POST', '/api/reports/generate', {
      household_id: householdId,
      template: 'final-report'
    }, inspectorToken);
    if (finalRes.filename) log('7', `OK filename=${finalRes.filename} size=${finalRes.size || '-'}`);
    else throw new Error('filename 없음');
  } catch (e) {
    console.error('   실패:', e.message);
  }

  // 8. 수기보고서 생성
  log('8', '수기보고서 생성 POST /reports/generate template=summary-report');
  try {
    const sumRes = await request('POST', '/api/reports/generate', {
      household_id: householdId,
      template: 'summary-report'
    }, inspectorToken);
    if (sumRes.filename) log('8', `OK filename=${sumRes.filename}`);
    else throw new Error('filename 없음');
  } catch (e) {
    console.error('   실패:', e.message);
  }

  // 9. 점검 항목 수정 PUT (신규)
  if (firstInspectionItemId && firstInspectionType) {
    log('9', `점검 항목 수정 PUT /inspections/${firstInspectionItemId}`);
    try {
      const updateBody = {
        type: firstInspectionType,
        location: '테스트수정위치',
        note: '배포 테스트에서 수정함'
      };
      const putRes = await request('PUT', `/api/inspections/${firstInspectionItemId}`, updateBody, inspectorToken);
      log('9', 'OK', putRes.message || '수정됨');
    } catch (e) {
      console.error('   실패:', e.message);
    }
  } else {
    log('9', '건너뜀 (수정할 점검 항목 없음)');
  }

  console.log('\n=== 테스트 완료 ===');
}

run().catch((err) => {
  console.error('\n❌ 테스트 실패:', err.message);
  process.exit(1);
});
