/**
 * 시나리오 테스트 (사진 포함):
 * 1. 세대주 로그인 → 사진 업로드 → 하자 2개 등록 (첫 하자에 근접/원거리 사진)
 * 2. 점검원 로그인 → 첫 하자에 열화상 점검 + 사진 업로드
 * 3. 수기보고서 / 점검결과양식 / 최종보고서 생성
 *
 * 샘플 사진: 로컬 Downloads/image0-1.png (환경변수 SAMPLE_PHOTO_PATH로 변경 가능)
 */
const fs = require('fs');
const path = require('path');

const BASE = process.env.BACKEND_URL || 'https://mobile-app-new.onrender.com';
const SAMPLE_PHOTO_PATH = process.env.SAMPLE_PHOTO_PATH || path.join(process.env.HOME || '', 'Downloads', 'image0-1.png');

function log(step, msg, data = '') {
  console.log(`[${step}] ${msg}`, data ? String(data).slice(0, 120) : '');
}

async function request(method, endpoint, body = null, token = null) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  if (token) opts.headers['Authorization'] = `Bearer ${token}`;
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${endpoint}`, opts);
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

async function uploadPhoto(filePath, token) {
  if (!fs.existsSync(filePath)) throw new Error(`샘플 사진 없음: ${filePath}`);
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
  if (!res.ok) throw new Error(json.error || json.message || res.status);
  return json;
}

async function run() {
  const ts = Date.now();
  const dong = '2';
  const ho = String(600 + (ts % 100));
  let residentToken, inspectorToken, caseId, defectIds = [], householdId;

  log('0', `샘플 사진: ${SAMPLE_PHOTO_PATH}`);
  if (!fs.existsSync(SAMPLE_PHOTO_PATH)) {
    throw new Error(`샘플 사진이 없습니다. SAMPLE_PHOTO_PATH를 설정하거나 Downloads/image0-1.png 를 준비하세요.`);
  }

  // 1. 세대주 로그인
  log('1', '세대주 로그인...');
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

  // 2. 사진 업로드 (근접/원거리 동일 파일로 2번 업로드)
  log('2', '사진 업로드 (near)...');
  const uploadNear = await uploadPhoto(SAMPLE_PHOTO_PATH, residentToken);
  log('2', `OK key=${uploadNear.key}`);
  log('2', '사진 업로드 (far)...');
  const uploadFar = await uploadPhoto(SAMPLE_PHOTO_PATH, residentToken);
  log('2', `OK key=${uploadFar.key}`);

  // 3. 케이스 생성 후 하자 2개 등록 (첫 하자에만 사진)
  log('3', '케이스 생성...');
  const caseRes = await request('POST', '/api/cases', { type: '하자접수' }, residentToken);
  caseId = caseRes.id;
  if (!caseId) throw new Error('케이스 생성 실패');
  log('3', `OK caseId=${caseId}`);

  log('3', '하자 2개 등록 (1번에 사진)...');
  const d1 = await request('POST', '/api/defects', {
    case_id: caseId,
    location: '거실',
    trade: '마루',
    content: '마루판 들뜸',
    memo: '육안 확인',
    photo_near_key: uploadNear.key,
    photo_far_key: uploadFar.key
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
  log('3', `OK defectIds=${defectIds.join(',')}`);

  // 4. 점검원 로그인
  log('4', '점검원 로그인...');
  const inspLogin = await request('POST', '/api/auth/session', {
    complex: 'admin',
    dong: '000',
    ho: '000',
    name: '점검원',
    phone: '010-0000-0000'
  });
  inspectorToken = inspLogin.token;
  if (!inspectorToken) throw new Error('점검원 로그인 실패');
  log('4', 'OK');

  // 5. 첫 하자에 열화상 등록 후 사진 업로드하여 thermal_photo로 연결
  const did1 = defectIds[0];
  log('5', '하자1 열화상 항목 생성...');
  const thermalRes = await request('POST', '/api/inspections/thermal', {
    caseId,
    defectId: did1,
    location: '거실',
    trade: '마루',
    note: '열화상 점검 완료 (사진 포함)',
    result: 'normal'
  }, inspectorToken);
  const thermalItemId = thermalRes.item?.id;
  if (thermalItemId) {
    log('5', '열화상용 사진 업로드...');
    const thermalUpload = await uploadPhoto(SAMPLE_PHOTO_PATH, inspectorToken);
    const photoUrl = thermalUpload.url || `/uploads/${thermalUpload.key}`;
    await request('POST', `/api/inspections/thermal/${thermalItemId}/photos`, {
      file_url: photoUrl,
      caption: '열화상 측정 사진'
    }, inspectorToken);
    log('5', 'OK thermal photo attached');
  }

  for (let i = 0; i < defectIds.length; i++) {
    const did = defectIds[i];
    const loc = i === 0 ? '거실' : '침실';
    const tr = i === 0 ? '마루' : '걸레받이';

    log('5', `하자 ${i + 1} 육안점검...`);
    await request('POST', '/api/inspections/visual', {
      caseId, defectId: did, location: loc, trade: tr, note: '육안 점검 완료.'
    }, inspectorToken);

    if (i > 0 || !thermalItemId) {
      log('5', `하자 ${i + 1} 열화상...`);
      await request('POST', '/api/inspections/thermal', {
        caseId, defectId: did, location: loc, trade: tr, note: '열화상 점검 완료', result: 'normal'
      }, inspectorToken);
    }

    log('5', `하자 ${i + 1} 공기질/라돈/레벨기...`);
    await request('POST', '/api/inspections/air', {
      caseId, defectId: did, location: loc, trade: tr,
      process_type: 'flush_out', tvoc: 0.03, hcho: 0.01, co2: 400, note: '공기질 양호', result: 'normal'
    }, inspectorToken);
    await request('POST', '/api/inspections/radon', {
      caseId, defectId: did, location: loc, trade: tr,
      radon: 134, unit_radon: 'Bq/m³', note: '라돈 측정', result: 'normal'
    }, inspectorToken);
    await request('POST', '/api/inspections/level', {
      caseId, defectId: did, location: loc, trade: tr,
      point1_left_mm: 2, point1_right_mm: -1,
      point2_left_mm: 0, point2_right_mm: 1,
      point3_left_mm: -1, point3_right_mm: 2,
      point4_left_mm: 1, point4_right_mm: 0,
      reference_mm: 150, note: '4 point ±10mm', result: 'normal'
    }, inspectorToken);
  }
  log('5', '점검 데이터 저장 완료');

  // 6. 보고서 생성 (attachment=1 로 생성과 동시에 PDF 수신 → 로컬 저장)
  const outDir = path.join(__dirname, '..', '..', 'downloaded-reports');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  async function generateAndSave(label, template) {
    const res = await fetch(`${BASE}/api/reports/generate?attachment=1`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${inspectorToken}`
      },
      body: JSON.stringify({ household_id: householdId, template })
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`${label} 생성 실패: ${res.status} ${t.slice(0, 100)}`);
    }
    const buf = Buffer.from(await res.arrayBuffer());
    const contentType = res.headers.get('Content-Type') || '';
    if (contentType.includes('application/pdf') && res.headers.get('X-Report-Filename')) {
      const filename = res.headers.get('X-Report-Filename');
      const outPath = path.join(outDir, filename);
      fs.writeFileSync(outPath, buf);
      log('6', `${label} -> ${outPath} (${buf.length} bytes)`);
      return { filename, size: buf.length };
    }
    // 서버가 attachment=1 미지원 시: JSON 응답 → filename 취한 뒤 다운로드 시도
    const json = JSON.parse(buf.toString());
    if (!json.success || !json.filename) throw new Error(`${label} 생성 실패: ${json.error || 'no filename'}`);
    log('6', `OK ${json.filename} size=${json.size}`);
    const filename = json.filename;
    try {
      const d = await fetch(`${BASE}/api/reports/download/${encodeURIComponent(filename)}`, {
        headers: { 'Authorization': `Bearer ${inspectorToken}` }
      });
      if (d.ok) {
        const bin = Buffer.from(await d.arrayBuffer());
        fs.writeFileSync(path.join(outDir, filename), bin);
        log('7', `  ${label} 다운로드 -> ${path.join(outDir, filename)} (${bin.length} bytes)`);
        return { filename, size: bin.length };
      }
    } catch (e) { /* ignore */ }
    return { filename, size: json.size || 0 };
  }

  log('6', '수기보고서 생성...');
  const sumRes = await generateAndSave('수기보고서', 'summary-report');
  log('6', '점검결과양식 생성...');
  const formRes = await generateAndSave('점검결과양식', 'inspection-form');
  log('6', '최종보고서 생성...');
  const finalRes = await generateAndSave('최종보고서', 'final-report');

  log('7', '로컬 저장 완료:', outDir);

  console.log('\n=== 시나리오 테스트 (사진 포함) 완료 ===');
  console.log('샘플 사진:', SAMPLE_PHOTO_PATH);
  console.log('세대:', dong + '동', ho + '호', 'householdId=', householdId);
  console.log('수기보고서:', sumRes.filename);
  console.log('점검결과양식:', formRes.filename);
  console.log('최종보고서:', finalRes.filename);
  console.log('로컬 저장:', outDir);
}

run().catch((err) => {
  console.error('테스트 실패:', err.message);
  process.exit(1);
});
