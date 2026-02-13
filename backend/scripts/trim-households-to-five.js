/**
 * 세대주(household)를 5개만 남기고 나머지와 관련 데이터 모두 삭제.
 * 유지: id 기준 ORDER BY id ASC LIMIT 5
 * 사용: DATABASE_URL=... node scripts/trim-households-to-five.js
 */
require('dotenv').config();
const { Pool } = require('pg');

const KEEP_COUNT = 5;
const MIGRATE_DB_FALLBACK =
  'postgresql://insighti_user:2eq3v151vjtJ2wUz4PUUQ2VHhlTbjWRy@dpg-d3kardu3jp1c73b2dkrg-a.singapore-postgres.render.com/insighti_db_yckk';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || MIGRATE_DB_FALLBACK,
  ssl:
    (process.env.DATABASE_URL || MIGRATE_DB_FALLBACK).includes('render.com')
      ? { rejectUnauthorized: false }
      : undefined
});

async function run() {
  const client = await pool.connect();
  try {
    const kept = await client.query(
      'SELECT id FROM household ORDER BY id ASC LIMIT $1',
      [KEEP_COUNT]
    );
    const keepIds = kept.rows.map((r) => r.id);
    if (keepIds.length === 0) {
      console.log('세대주가 없습니다.');
      return;
    }
    console.log(`유지할 세대주 id: ${keepIds.join(', ')}`);

    const toRemove = await client.query(
      'SELECT id FROM household WHERE id != ALL($1::int[])',
      [keepIds]
    );
    const removeIds = toRemove.rows.map((r) => r.id);
    if (removeIds.length === 0) {
      console.log('삭제할 세대주가 없습니다.');
      return;
    }
    console.log(`삭제할 세대주 수: ${removeIds.length}, id: ${removeIds.join(', ')}`);

    const caseIds = await client.query(
      'SELECT id FROM case_header WHERE household_id = ANY($1::int[])',
      [removeIds]
    );
    const cids = caseIds.rows.map((r) => r.id);
    const defectIds =
      cids.length > 0
        ? (await client.query('SELECT id FROM defect WHERE case_id = ANY($1::text[])', [cids])).rows.map(
            (r) => r.id
          )
        : [];
    const itemIds =
      cids.length > 0
        ? (await client.query('SELECT id FROM inspection_item WHERE case_id = ANY($1::text[])', [
            cids
          ])).rows.map((r) => r.id)
        : [];

    await client.query('BEGIN');

    if (itemIds.length > 0) {
      await client.query('DELETE FROM thermal_photo WHERE item_id = ANY($1::text[])', [itemIds]);
      await client.query('DELETE FROM air_measure WHERE item_id = ANY($1::text[])', [itemIds]);
      await client.query('DELETE FROM radon_measure WHERE item_id = ANY($1::text[])', [itemIds]);
      await client.query('DELETE FROM level_measure WHERE item_id = ANY($1::text[])', [itemIds]);
    }
    if (cids.length > 0) {
      await client.query('DELETE FROM inspection_item WHERE case_id = ANY($1::text[])', [cids]);
      if (defectIds.length > 0) {
        await client.query('DELETE FROM defect_resolution WHERE defect_id = ANY($1::text[])', [
          defectIds
        ]);
        await client.query('DELETE FROM photo WHERE defect_id = ANY($1::text[])', [defectIds]);
      }
      await client.query('DELETE FROM defect WHERE case_id = ANY($1::text[])', [cids]);
      await client.query('DELETE FROM case_header WHERE id = ANY($1::text[])', [cids]);
    }
    await client.query('DELETE FROM report WHERE household_id = ANY($1::int[])', [removeIds]);
    await client.query('DELETE FROM access_token WHERE household_id = ANY($1::int[])', [
      removeIds
    ]);
    await client.query('DELETE FROM household WHERE id = ANY($1::int[])', [removeIds]);

    await client.query('COMMIT');
    console.log(`완료: 세대주 ${removeIds.length}명 및 관련 데이터 삭제, ${keepIds.length}명 유지.`);
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
