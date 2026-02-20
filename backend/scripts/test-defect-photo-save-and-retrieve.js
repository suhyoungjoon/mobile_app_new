/**
 * 세대주 하자 등록 시 사진 저장 → 해당 하자 재조회 시 사진 이미지 정상 조회 테스트
 * 사용: node scripts/test-defect-photo-save-and-retrieve.js
 * 환경변수: BACKEND_URL (기본 http://localhost:3000), 테스트용 이미지 3개는 assets 경로 또는 동일 디렉터리
 */
const path = require('path');
const fs = require('fs');

const BASE = process.env.BACKEND_URL || 'http://localhost:3000';

const FIXTURES_DIR = path.join(__dirname, '..', 'test-fixtures', 'defect-photos');
const ASSETS = [
  path.join(FIXTURES_DIR, 'image0-2-ec4763c5-463d-411b-bacf-78a867a612fa.png'),
  path.join(FIXTURES_DIR, 'image1-2-b28a9406-4a82-4b22-b886-3c7fabec02c7.png'),
  path.join(FIXTURES_DIR, 'image2-1-0d76cef4-86af-4888-86aa-c7cf3a3cea78.png')
];

function log(step, msg, extra = '') {
  console.log(`[${step}] ${msg}${extra ? ' ' + extra : ''}`);
}

async function request(method, urlPath, body = null, token = null) {
  const opts = { method, headers: {} };
  if (body && typeof body === 'object' && !(body instanceof FormData)) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  } else if (body instanceof FormData) {
    opts.body = body;
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

async function uploadPhoto(filePath, token) {
  if (!fs.existsSync(filePath)) throw new Error(`파일 없음: ${filePath}`);
  const buffer = fs.readFileSync(filePath);
  const fileName = path.basename(filePath);
  const formData = new FormData();
  formData.append('photo', new Blob([buffer], { type: 'image/png' }), fileName);

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
    throw new Error(`Upload invalid JSON: ${text.slice(0, 200)}`);
  }
  if (!res.ok) throw new Error(json.error || json.message || String(res.status));
  return json;
}

async function run() {
  console.log('=== 세대주 하자 등록·사진 저장 → 재조회 시 사진 조회 테스트 ===\n');
  console.log(`서버: ${BASE}`);

  const existing = ASSETS.filter((p) => fs.existsSync(p));
  if (existing.length < 2) {
    console.error('테스트용 이미지가 2개 이상 필요합니다. 다음 경로에 파일이 있는지 확인하세요.');
    ASSETS.forEach((p) => console.error('  ', p));
    process.exit(1);
  }
  log('0', `이미지 사용: ${existing.length}개`);

  const ts = Date.now();
  const dong = '9';
  const ho = String(900 + (ts % 50));

  let residentToken, caseId, defectIdWithPhotos;

  // 1. 세대주 로그인
  log('1', '세대주 로그인...');
  const loginRes = await request('POST', '/api/auth/session', {
    complex: '서울 인싸이트자이',
    dong,
    ho,
    name: '사진테스트세대',
    phone: '010-1111-2222'
  });
  residentToken = loginRes.token;
  if (!residentToken) throw new Error('세대주 로그인 실패');
  log('1', 'OK');

  // 2. 사진 업로드 (근접·원거리)
  log('2', '사진 업로드 (near)...');
  const uploadNear = await uploadPhoto(existing[0], residentToken);
  if (!uploadNear.key) throw new Error('near 업로드 key 없음');
  log('2', `OK key=${uploadNear.key}`);

  log('2', '사진 업로드 (far)...');
  const uploadFar = await uploadPhoto(existing[1], residentToken);
  if (!uploadFar.key) throw new Error('far 업로드 key 없음');
  log('2', `OK key=${uploadFar.key}`);

  // 3. 케이스 생성
  log('3', '케이스 생성...');
  const caseRes = await request('POST', '/api/cases', { type: '하자접수' }, residentToken);
  caseId = caseRes.id;
  if (!caseId) throw new Error('케이스 생성 실패');
  log('3', `OK caseId=${caseId}`);

  // 4. 하자 등록 (사진 포함)
  log('4', '하자 등록 (photo_near_key, photo_far_key)...');
  const defectRes = await request('POST', '/api/defects', {
    case_id: caseId,
    location: '거실',
    trade: '마루',
    content: '사진 저장·재조회 테스트 하자',
    memo: '테스트',
    photo_near_key: uploadNear.key,
    photo_far_key: uploadFar.key
  }, residentToken);
  defectIdWithPhotos = defectRes.id;
  if (!defectIdWithPhotos) throw new Error('하자 등록 실패');
  log('4', `OK defectId=${defectIdWithPhotos}`);

  // 5. 해당 하자 재조회 (case_id로 목록)
  log('5', '하자 재조회 GET /api/defects?case_id=...');
  const list = await request('GET', `/api/defects?case_id=${caseId}`, null, residentToken);
  const defects = Array.isArray(list) ? list : (list.defects || []);
  const defectFromList = defects.find((d) => d.id === defectIdWithPhotos);
  if (!defectFromList) throw new Error('재조회 목록에서 해당 하자를 찾을 수 없음');
  if (!defectFromList.photos || defectFromList.photos.length < 2) {
    throw new Error(`재조회 시 사진 개수 이상: 기대 2, 실제 ${(defectFromList.photos || []).length}`);
  }
  log('5', `OK 사진 ${defectFromList.photos.length}건 (목록)`);

  // 6. 하자 단건 조회 GET /api/defects/:id
  log('6', '하자 단건 조회 GET /api/defects/:id');
  const single = await request('GET', `/api/defects/${defectIdWithPhotos}`, null, residentToken);
  if (!single.photos || single.photos.length < 2) {
    throw new Error(`단건 조회 시 사진 개수 이상: 기대 2, 실제 ${(single.photos || []).length}`);
  }
  log('6', `OK 사진 ${single.photos.length}건 (단건)`);

  // 7. 사진 URL로 이미지 실제 조회 가능 여부
  log('7', '사진 URL 접근 확인...');
  for (const photo of single.photos) {
    const url = photo.url && photo.url.startsWith('http') ? photo.url : `${BASE}${photo.url || ''}`;
    if (!url || url === BASE) continue;
    const imgRes = await fetch(url, { method: 'GET' });
    if (!imgRes.ok) {
      throw new Error(`사진 URL 접근 실패: ${url} → ${imgRes.status}`);
    }
    const ct = (imgRes.headers.get('content-type') || '').toLowerCase();
    if (!ct.includes('image')) {
      throw new Error(`사진 URL이 이미지가 아님: ${url} content-type=${ct}`);
    }
    log('7', `  ${photo.kind || 'photo'} ${url} → ${imgRes.status} ${ct}`);
  }
  log('7', 'OK 모든 사진 URL 접근 성공');

  console.log('\n=== 테스트 통과: 세대주 하자 등록 시 사진 저장 및 재조회 시 이미지 정상 조회됨 ===');
}

run().catch((err) => {
  console.error('\n❌ 실패:', err.message);
  process.exit(1);
});
