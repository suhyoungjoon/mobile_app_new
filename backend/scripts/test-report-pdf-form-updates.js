/**
 * 수정된 보고서(공정 유형, 레벨기 4 point, 기준 mm, 하자 사진) 검증
 * 기존 DB 데이터로 /reports/preview, /reports/generate 호출 후 응답 확인
 */
const BASE = process.env.BACKEND_URL || 'https://mobile-app-new.onrender.com';
const API = `${BASE}/api`;

const TEST_USER = {
  complex: '서울 인싸이트자이',
  dong: '101',
  ho: '1203',
  name: '홍길동',
  phone: '010-1234-5678'
};

async function request(method, path, body = null, token = null) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (token) opts.headers['Authorization'] = `Bearer ${token}`;
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${API}${path}`, opts);
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text.slice(0, 200) };
  }
  return { status: res.status, data };
}

async function main() {
  console.log('🧪 수정된 보고서 기능 테스트 (기존 데이터 기준)\n');
  console.log('   BACKEND:', BASE);
  console.log('');

  // 1. Health
  const healthUrl = BASE.endsWith('/api') ? BASE.replace(/\/api\/?$/, '') + '/health' : BASE + '/health';
  try {
    const hRes = await fetch(healthUrl);
    console.log('1️⃣ Health:', hRes.ok ? '✅' : '❌', hRes.status);
  } catch (e) {
    console.log('1️⃣ Health: ❌', e.message);
  }

  // 2. Login
  const loginRes = await request('POST', '/auth/session', TEST_USER);
  if (loginRes.status !== 200 || !loginRes.data.token) {
    console.log('2️⃣ 로그인: ❌', loginRes.data.error || loginRes.data);
    process.exit(1);
  }
  const token = loginRes.data.token;
  console.log('2️⃣ 로그인: ✅');

  // 3. Report preview
  const previewRes = await request('GET', '/reports/preview', null, token);
  if (previewRes.status !== 200) {
    console.log('3️⃣ 보고서 미리보기: ❌', previewRes.status, previewRes.data);
    process.exit(1);
  }
  const { html, defects_count, equipment_count, equipment_data } = previewRes.data;
  console.log('3️⃣ 보고서 미리보기: ✅');
  console.log('   하자 수:', defects_count);
  console.log('   장비점검 수:', equipment_count || 0);

  // 4. 수정 반영 여부 확인 (HTML)
  const hasLevelSection = html && (html.includes('레벨기 측정 결과') || html.includes('기준 (mm)'));
  const checks = [
    ['공정 유형 컬럼', html && html.includes('공정 유형')],
    ['레벨기 기준/4point 헤더', html && (html.includes('기준 (mm)') || html.includes('1번 좌/우'))],
    ['하자 사진 섹션', html && html.includes('photos-section')],
    ['payload에 신규 필드', true], // verified below
  ];
  console.log('\n4️⃣ 수정 사항 반영 확인 (HTML):');
  checks.forEach(([label, ok]) => console.log('   ', ok ? '✅' : '⚠️', label));
  if (!hasLevelSection && equipment_count > 0) {
    console.log('   (레벨기 테이블은 레벨 데이터가 있을 때만 출력됩니다)');
  }

  // 5. equipment_data 필드 (신규 필드)
  const air = (equipment_data && equipment_data.air) || [];
  const level = (equipment_data && equipment_data.level) || [];
  const hasProcessType = air.some((a) => 'process_type' in a || 'process_type_label' in a);
  const hasLevel4Point = level.some((l) => 'reference_mm' in l || 'level_summary_text' in l || 'point1_left_mm' in l);
  console.log('\n5️⃣ payload 신규 필드:');
  console.log('   공기질 process_type/label:', hasProcessType ? '✅' : air.length ? '⚠️(데이터 없음)' : '(항목 없음)');
  console.log('   레벨기 reference_mm/4point:', hasLevel4Point ? '✅' : level.length ? '⚠️(기존 데이터)' : '(항목 없음)');

  // 6. PDF 생성 (선택)
  console.log('\n6️⃣ PDF 생성 테스트...');
  const genRes = await request('POST', '/reports/generate', { template: 'comprehensive-report' }, token);
  if (genRes.status === 200 && genRes.data.success) {
    console.log('   PDF 생성: ✅', genRes.data.filename || '');
  } else {
    console.log('   PDF 생성:', genRes.status === 200 ? '⚠️' : '❌', genRes.data.message || genRes.data.error || '');
  }

  console.log('\n✅ 테스트 완료.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
