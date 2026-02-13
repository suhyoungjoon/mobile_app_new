/**
 * 서버가 사용하는 DB에 점검원 세대(admin/000/000)가 없으면 생성.
 * 서버 기동 시 한 번 호출 (어떤 DB를 쓰든 점검원 계정 보장).
 */
const INSPECTOR_COMPLEX = 'admin';
const INSPECTOR_DONG = '000';
const INSPECTOR_HO = '000';
const INSPECTOR_NAME = '점검원';
const INSPECTOR_PHONE = '010-0000-0000';

async function ensureInspectorHousehold(pool) {
  if (!pool) return;
  let client;
  try {
    client = await pool.connect();
    let complexId;
    const complexRows = await client.query(
      "SELECT id FROM complex WHERE LOWER(TRIM(name)) = 'admin' LIMIT 1"
    );
    if (complexRows.rows.length === 0) {
      const ins = await client.query(
        "INSERT INTO complex (name, address) VALUES ($1, $2) RETURNING id",
        [INSPECTOR_COMPLEX, '점검원 전용']
      );
      complexId = ins.rows[0].id;
      console.log('[ensureInspector] complex "admin" 생성, id:', complexId);
    } else {
      complexId = complexRows.rows[0].id;
    }

    const hRows = await client.query(
      'SELECT id, user_type FROM household WHERE complex_id = $1 AND dong = $2 AND ho = $3',
      [complexId, INSPECTOR_DONG, INSPECTOR_HO]
    );
    if (hRows.rows.length === 0) {
      await client.query(
        `INSERT INTO household (complex_id, dong, ho, resident_name, phone, user_type)
         VALUES ($1, $2, $3, $4, $5, 'admin')`,
        [complexId, INSPECTOR_DONG, INSPECTOR_HO, INSPECTOR_NAME, INSPECTOR_PHONE]
      );
      console.log('[ensureInspector] 점검원 세대 생성 완료 (admin/000/000)');
    } else if (hRows.rows[0].user_type !== 'admin') {
      await client.query(
        "UPDATE household SET user_type = 'admin', resident_name = $1, phone = $2 WHERE id = $3",
        [INSPECTOR_NAME, INSPECTOR_PHONE, hRows.rows[0].id]
      );
      console.log('[ensureInspector] 기존 세대 user_type을 admin으로 변경');
    }
  } catch (err) {
    console.warn('[ensureInspector] 점검원 세대 확인/생성 실패 (무시):', err.message);
  } finally {
    if (client) client.release();
  }
}

module.exports = { ensureInspectorHousehold };
