/**
 * 시나리오 테스트:
 * 1. 새로운 세대주 로그인
 * 2. 하자 2개 등록
 * 3. 점검원이 2개 하자에 대해 육안→열화상→공기질→레벨기 점검 저장
 * 4. 수기보고서 및 점검결과양식 PDF 생성
 */
const BASE = process.env.BACKEND_URL || 'https://mobile-app-new.onrender.com';

function log(step, msg, data = '') {
  console.log(`[${step}] ${msg}`, data ? JSON.stringify(data).slice(0, 200) : '');
}

async function request(method, path, body = null, token = null) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  if (token) opts.headers['Authorization'] = `Bearer ${token}`;
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Invalid JSON: ${text.slice(0, 200)}`);
  }
  if (!res.ok) throw new Error(json.message || json.error || res.status);
  return json;
}

async function run() {
  const ts = Date.now();
  const dong = '2';
  const ho = String(500 + (ts % 100));
  let residentToken, inspectorToken, caseId, defectIds = [], householdId;

  // 1. 새로운 세대주 로그인
  log('1', '새로운 세대주 로그인...');
  const loginRes = await request('POST', '/api/auth/session', {
    complex: '서울 인싸이트자이',
    dong,
    ho,
    name: '테스트세대',
    phone: '010-9999-8888'
  });
  residentToken = loginRes.token;
  householdId = loginRes.user?.householdId;
  if (!residentToken || !householdId) throw new Error('세대주 로그인 실패');
  log('1', `OK householdId=${householdId}`);

  // 2. 케이스 생성 후 하자 2개 등록
  log('2', '케이스 생성...');
  const caseRes = await request('POST', '/api/cases', { type: '하자접수' }, residentToken);
  caseId = caseRes.id;
  if (!caseId) throw new Error('케이스 생성 실패');
  log('2', `OK caseId=${caseId}`);

  log('2', '하자 2개 등록...');
  const d1 = await request('POST', '/api/defects', {
    case_id: caseId,
    location: '거실',
    trade: '마루',
    content: '마루판 들뜸',
    memo: '육안 확인'
  }, residentToken);
  const d2 = await request('POST', '/api/defects', {
    case_id: caseId,
    location: '침실',
    trade: '걸레받이(목재)',
    content: '틈새불량 및 코킹 미시공',
    memo: '특이사항'
  }, residentToken);
  defectIds = [d1.id, d2.id].filter(Boolean);
  if (defectIds.length !== 2) throw new Error('하자 2개 등록 실패');
  log('2', `OK defectIds=${defectIds.join(',')}`);

  // 3. 점검원 로그인 후 육안(사진은 생략) / 열화상 / 공기질 / 레벨기 저장
  log('3', '점검원 로그인...');
  const inspLogin = await request('POST', '/api/auth/session', {
    complex: 'admin',
    dong: '000',
    ho: '000',
    name: '점검원',
    phone: '010-0000-0000'
  });
  inspectorToken = inspLogin.token;
  if (!inspectorToken) throw new Error('점검원 로그인 실패');
  log('3', 'OK');

  for (let i = 0; i < defectIds.length; i++) {
    const did = defectIds[i];
    const loc = i === 0 ? '거실' : '침실';
    const tr = i === 0 ? '마루' : '걸레받이';

    log('3', `하자 ${i + 1} 육안점검 등록...`);
    await request('POST', '/api/inspections/visual', {
      caseId, defectId: did, location: loc, trade: tr, note: '육안 점검 완료. 특이사항 없음.'
    }, inspectorToken);

    log('3', `하자 ${i + 1} 열화상 등록...`);
    await request('POST', '/api/inspections/thermal', {
      caseId, defectId: did, location: loc, trade: tr, note: '열화상 점검 완료', result: 'normal'
    }, inspectorToken);

    log('3', `하자 ${i + 1} 공기질 등록...`);
    await request('POST', '/api/inspections/air', {
      caseId, defectId: did, location: loc, trade: tr,
      process_type: 'flush_out', tvoc: 0.03, hcho: 0.01, co2: 400, note: '공기질 양호', result: 'normal'
    }, inspectorToken);

    log('3', `하자 ${i + 1} 라돈 등록...`);
    await request('POST', '/api/inspections/radon', {
      caseId, defectId: did, location: loc, trade: tr,
      radon: 134, unit_radon: 'Bq/m³', note: '라돈 측정', result: 'normal'
    }, inspectorToken);

    log('3', `하자 ${i + 1} 레벨기 등록...`);
    await request('POST', '/api/inspections/level', {
      caseId, defectId: did, location: loc, trade: tr,
      point1_left_mm: 2, point1_right_mm: -1,
      point2_left_mm: 0, point2_right_mm: 1,
      point3_left_mm: -1, point3_right_mm: 2,
      point4_left_mm: 1, point4_right_mm: 0,
      reference_mm: 150, note: '4 point ±10mm', result: 'normal'
    }, inspectorToken);
  }
  log('3', '점검 데이터 저장 완료');

  // 4. 수기보고서 / 점검결과양식 생성
  log('4', '수기보고서 생성...');
  const sumRes = await request('POST', '/api/reports/generate', {
    household_id: householdId,
    template: 'summary-report'
  }, inspectorToken);
  if (!sumRes.success || !sumRes.filename) throw new Error('수기보고서 생성 실패');
  log('4', `수기보고서 OK filename=${sumRes.filename} size=${sumRes.size}`);

  log('4', '점검결과양식 생성...');
  const formRes = await request('POST', '/api/reports/generate', {
    household_id: householdId,
    template: 'inspection-form'
  }, inspectorToken);
  if (!formRes.success || !formRes.filename) throw new Error('점검결과양식 생성 실패');
  log('4', `점검결과양식 OK filename=${formRes.filename} size=${formRes.size}`);

  log('4', '최종보고서 생성...');
  const finalRes = await request('POST', '/api/reports/generate', {
    household_id: householdId,
    template: 'final-report'
  }, inspectorToken);
  if (!finalRes.success || !finalRes.filename) throw new Error('최종보고서 생성 실패');
  log('4', `최종보고서 OK filename=${finalRes.filename} size=${finalRes.size}`);

  console.log('\n=== 시나리오 테스트 완료 ===');
  console.log('세대:', dong + '동', ho + '호', 'householdId=', householdId);
  console.log('수기보고서:', sumRes.filename);
  console.log('점검결과양식:', formRes.filename);
  console.log('최종보고서:', finalRes.filename);
}

run().catch((err) => {
  console.error('테스트 실패:', err.message);
  process.exit(1);
});
