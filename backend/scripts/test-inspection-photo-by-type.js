/**
 * 점검별 등록 + 이미지 2장 저장(inspection_photo) + 재조회 + 수정 검증
 * - visual, thermal, air, radon, level 각각: 항목 생성 → 사진 2장 추가 → by-household 재조회(photos 포함) → 수정(PUT) 후 재조회
 * 사용: node scripts/test-inspection-photo-by-type.js
 * 환경변수: BACKEND_URL (기본 http://localhost:3000)
 */
const path = require('path');
const fs = require('fs');

const BASE = process.env.BACKEND_URL || 'http://localhost:3000';
const FIXTURES_DIR = path.join(__dirname, '..', 'test-fixtures', 'defect-photos');
const SAMPLE_IMAGE = path.join(FIXTURES_DIR, 'image0-2-ec4763c5-463d-411b-bacf-78a867a612fa.png');
// 1x1 PNG (이미지 파일 없을 때 사용)
const TINY_PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

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

async function uploadPhotoBuffer(buffer, token, filename = 'test.png') {
  const formData = new FormData();
  formData.append('photo', new Blob([buffer], { type: 'image/png' }), filename);
  const res = await fetch(`${BASE}/api/upload/photo`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: formData
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Upload invalid JSON: ${text.slice(0, 150)}`);
  }
  if (!res.ok) throw new Error(json.error || json.message || String(res.status));
  return json;
}

async function uploadPhoto(filePathOrBuffer, token) {
  const buffer = Buffer.isBuffer(filePathOrBuffer)
    ? filePathOrBuffer
    : fs.existsSync(filePathOrBuffer) ? fs.readFileSync(filePathOrBuffer) : null;
  if (!buffer) throw new Error(`파일/버퍼 없음: ${filePathOrBuffer}`);
  return uploadPhotoBuffer(buffer, token, Buffer.isBuffer(filePathOrBuffer) ? 'test.png' : path.basename(String(filePathOrBuffer)));
}

/** itemId에 사진 2장 추가 (inspection_photo) */
async function addTwoPhotos(itemId, token) {
  const up1 = await uploadPhoto(TINY_PNG, token);
  const up2 = await uploadPhoto(TINY_PNG, token);
  const url1 = up1.url || `/uploads/${up1.key || up1.filename}`;
  const url2 = up2.url || `/uploads/${up2.key || up2.filename}`;
  await request('POST', `/api/inspections/items/${itemId}/photos`, { file_url: url1, caption: '사진 1', sort_order: 0 }, token);
  await request('POST', `/api/inspections/items/${itemId}/photos`, { file_url: url2, caption: '사진 2', sort_order: 1 }, token);
}

function assertEqual(actual, expected, name) {
  const a = actual == null ? '' : String(actual).trim();
  const e = expected == null ? '' : String(expected).trim();
  if (a !== e) throw new Error(`[${name}] 기대 "${e}" 실제 "${a}"`);
}

async function run() {
  console.log('=== 점검별 등록·이미지 2장·재조회·수정 검증 ===\n');
  console.log(`서버: ${BASE}`);

  let residentToken, inspectorToken, caseId, defectId, householdId;

  log('0', '세대주 로그인 및 케이스·하자 생성...');
  const loginRes = await request('POST', '/api/auth/session', {
    complex: '서울 인싸이트자이',
    dong: '7',
    ho: '701',
    name: '점검테스트',
    phone: '010-5555-6666'
  });
  residentToken = loginRes.token;
  householdId = loginRes.user?.householdId;
  if (!residentToken || !householdId) throw new Error('세대주 로그인 실패');

  const caseRes = await request('POST', '/api/cases', { type: '하자접수' }, residentToken);
  caseId = caseRes.id;
  const defectRes = await request('POST', '/api/defects', {
    case_id: caseId,
    location: '거실',
    trade: '마루',
    content: '점검방식별 테스트 하자',
    memo: ''
  }, residentToken);
  defectId = defectRes.id;
  if (!caseId || !defectId) throw new Error('케이스/하자 생성 실패');
  log('0', `OK caseId=${caseId}, defectId=${defectId}, householdId=${householdId}`);

  log('1', '점검원 로그인...');
  const inspRes = await request('POST', '/api/auth/session', {
    complex: 'admin',
    dong: '000',
    ho: '000',
    name: '점검원',
    phone: '010-0000-0000'
  });
  inspectorToken = inspRes.token;
  if (!inspectorToken) throw new Error('점검원 로그인 실패');
  log('1', 'OK');

  const loc = '거실';
  const trade = '마루';
  const note = '점검방식별재조회테스트_' + Date.now();
  const noteUpdated = note + '_수정됨';

  const types = [
    { key: 'visual', name: '육안', create: () => request('POST', '/api/inspections/visual', { caseId, defectId, location: loc, trade, note, result: 'normal' }, inspectorToken) },
    { key: 'thermal', name: '열화상', create: () => request('POST', '/api/inspections/thermal', { caseId, defectId, location: loc, trade, note, result: 'normal' }, inspectorToken) },
    { key: 'air', name: '공기질', create: () => request('POST', '/api/inspections/air', { caseId, defectId, location: loc, trade, process_type: 'flush_out', tvoc: 0.05, hcho: 0.02, co2: 800, note, result: 'normal' }, inspectorToken) },
    { key: 'radon', name: '라돈', create: () => request('POST', '/api/inspections/radon', { caseId, defectId, location: loc, trade, radon: 120, unit_radon: 'Bq/m³', note, result: 'normal' }, inspectorToken) },
    { key: 'level', name: '레벨기', create: () => request('POST', '/api/inspections/level', { caseId, defectId, location: loc, trade, point1_left_mm: 1, point1_right_mm: 2, point2_left_mm: 3, point2_right_mm: 4, point3_left_mm: 2, point3_right_mm: 3, point4_left_mm: 1, point4_right_mm: 2, reference_mm: 150, note, result: 'normal' }, inspectorToken) }
  ];

  const createdIds = {};

  for (const t of types) {
    const step = t.key;
    log(step, `${t.name} 등록...`);
    const res = await t.create();
    const itemId = res.item?.id;
    if (!itemId) throw new Error(`${t.name} 항목 생성 실패`);
    createdIds[t.key] = itemId;
    log(step, `OK itemId=${itemId}`);

    log(step, `${t.name} 사진 2장 추가 (inspection_photo)...`);
    await addTwoPhotos(itemId, inspectorToken);
    log(step, 'OK 사진 2장 연결');

    log(step, `${t.name} 재조회(by-household)...`);
    const byHouse = await request('GET', `/api/inspections/by-household/${householdId}`, null, inspectorToken);
    const list = (byHouse.inspections && byHouse.inspections[t.key]) || [];
    const ref = list.find((i) => i.id === itemId);
    if (!ref) throw new Error(`${t.name} 재조회 시 항목 없음`);
    assertEqual(ref.note, note, `${t.key}.note`);
    if (!ref.photos || !Array.isArray(ref.photos)) throw new Error(`${t.name} 재조회 시 photos 배열 없음`);
    if (ref.photos.length < 2) throw new Error(`${t.name} 재조회 시 photos 2장 아님: ${ref.photos.length}`);
    log(step, `OK ${t.name} 재조회 값·photos ${ref.photos.length}장 일치`);
  }

  // 수정(PUT) 검증: 공기질 항목 note 수정 후 재조회
  const airId = createdIds.air;
  log('7', '공기질 항목 수정(PUT)...');
  await request('PUT', `/api/inspections/${airId}`, { note: noteUpdated }, inspectorToken);
  log('7', 'OK PUT 완료');

  log('7', '수정 후 재조회...');
  const byHouseFinal = await request('GET', `/api/inspections/by-household/${householdId}`, null, inspectorToken);
  const airList = (byHouseFinal.inspections && byHouseFinal.inspections.air) || [];
  const airRef = airList.find((i) => i.id === airId);
  if (!airRef) throw new Error('수정 후 재조회 시 공기질 항목 없음');
  assertEqual(airRef.note, noteUpdated, 'air.note after PUT');
  if (!airRef.photos || airRef.photos.length < 2) throw new Error(`수정 후 공기질 photos 유지 안 됨: ${(airRef.photos || []).length}`);
  log('7', 'OK 수정 반영·사진 유지 확인');

  console.log('\n=== 점검별 검증 요약 ===');
  types.forEach((t) => console.log(`  ${t.name}(${t.key}): 등록 → 이미지 2장 → 재조회 통과`));
  console.log('  공기질(air): 수정(PUT) → 재조회 시 note 반영·photos 유지');
  console.log('\n=== 전체 통과: 등록·이미지·재조회·수정 검증 완료 ===');
}

run().catch((err) => {
  console.error('\n❌ 실패:', err.message);
  process.exit(1);
});
