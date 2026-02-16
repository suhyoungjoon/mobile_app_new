/**
 * 기존 세대주(admin 제외)에 점검결과를 임의로 넣고, 최종보고서 생성 테스트.
 * 사용: node scripts/seed-inspections-and-final-report.js
 */
require('dotenv').config();
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const MIGRATE_DB_FALLBACK =
  'postgresql://insighti_user:2eq3v151vjtJ2wUz4PUUQ2VHhlTbjWRy@dpg-d3kardu3jp1c73b2dkrg-a.singapore-postgres.render.com/insighti_db_yckk';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || MIGRATE_DB_FALLBACK,
  ssl: (process.env.DATABASE_URL || MIGRATE_DB_FALLBACK).includes('render.com')
    ? { rejectUnauthorized: false }
    : undefined
});

function getResultText(result) {
  const m = { normal: '정상', check: '확인요망', na: '해당없음' };
  return m[result] || result;
}

async function ensureCaseAndDefect(client, householdId) {
  let caseRow = (await client.query(
    'SELECT id FROM case_header WHERE household_id = $1 ORDER BY created_at DESC LIMIT 1',
    [householdId]
  )).rows[0];
  if (!caseRow) {
    const caseId = `CASE-${Date.now()}-${householdId}`;
    await client.query(
      'INSERT INTO case_header (id, household_id, type) VALUES ($1, $2, $3)',
      [caseId, householdId, '종합점검']
    );
    caseRow = { id: caseId };
  }
  const caseId = caseRow.id;
  let defRow = (await client.query(
    'SELECT id FROM defect WHERE case_id = $1 LIMIT 1',
    [caseId]
  )).rows[0];
  if (!defRow) {
    const defectId = `DEF-${uuidv4().slice(0, 8)}`;
    await client.query(
      'INSERT INTO defect (id, case_id, location, trade, content, memo) VALUES ($1, $2, $3, $4, $5, $6)',
      [defectId, caseId, '거실', '도배', '테스트 하자', '시드 데이터']
    );
    defRow = { id: defectId };
  }
  return { caseId, defectId: defRow.id };
}

async function seedHousehold(client, householdId) {
  const { caseId, defectId } = await ensureCaseAndDefect(client, householdId);
  const loc = '거실';
  const trade = '도배';
  const note = '양호';
  const result = 'normal';

  const visualId = uuidv4();
  await client.query(
    `INSERT INTO inspection_item (id, case_id, defect_id, type, location, trade, note, result)
     VALUES ($1, $2, $3, 'visual', $4, $5, $6, $7)`,
    [visualId, caseId, defectId, loc, trade, note, result]
  );

  const thermalId = uuidv4();
  await client.query(
    `INSERT INTO inspection_item (id, case_id, defect_id, type, location, trade, note, result)
     VALUES ($1, $2, $3, 'thermal', $4, $5, $6, $7)`,
    [thermalId, caseId, defectId, loc, trade, note, result]
  );

  const airId = uuidv4();
  await client.query(
    `INSERT INTO inspection_item (id, case_id, defect_id, type, location, trade, note, result)
     VALUES ($1, $2, $3, 'air', $4, $5, $6, $7)`,
    [airId, caseId, defectId, loc, trade, note, result]
  );
  await client.query(
    'INSERT INTO air_measure (item_id, process_type, tvoc, hcho) VALUES ($1, $2, $3, $4)',
    [airId, 'flush_out', 0.45, 0.08]
  );

  const radonId = uuidv4();
  await client.query(
    `INSERT INTO inspection_item (id, case_id, defect_id, type, location, trade, note, result)
     VALUES ($1, $2, $3, 'radon', $4, $5, $6, $7)`,
    [radonId, caseId, defectId, loc, trade, note, result]
  );
  await client.query(
    'INSERT INTO radon_measure (item_id, radon, unit_radon) VALUES ($1, $2, $3)',
    [radonId, 80, 'Bq/m³']
  );

  const levelId = uuidv4();
  await client.query(
    `INSERT INTO inspection_item (id, case_id, defect_id, type, location, trade, note, result)
     VALUES ($1, $2, $3, 'level', $4, $5, $6, $7)`,
    [levelId, caseId, defectId, loc, trade, note, result]
  );
  await client.query(
    `INSERT INTO level_measure (item_id, point1_left_mm, point1_right_mm, point2_left_mm, point2_right_mm, point3_left_mm, point3_right_mm, point4_left_mm, point4_right_mm, reference_mm)
     VALUES ($1, 148, 151, 149, 150, 147, 152, 150, 149, 150)`,
    [levelId]
  );

  return { caseId, defectId };
}

async function loadHouseholdInspectionsForReport(client, householdId) {
  const query = `
    SELECT ii.id, ii.type, ii.location, ii.trade, ii.note, ii.result, ii.created_at,
      am.process_type, am.tvoc, am.hcho, rm.radon, rm.unit_radon,
      lm.point1_left_mm, lm.point1_right_mm, lm.point2_left_mm, lm.point2_right_mm,
      lm.point3_left_mm, lm.point3_right_mm, lm.point4_left_mm, lm.point4_right_mm, lm.reference_mm
    FROM inspection_item ii
    LEFT JOIN air_measure am ON ii.id = am.item_id
    LEFT JOIN radon_measure rm ON ii.id = rm.item_id
    LEFT JOIN level_measure lm ON ii.id = lm.item_id
    WHERE ii.case_id IN (SELECT id FROM case_header WHERE household_id = $1)
    ORDER BY ii.created_at ASC
  `;
  const result = await client.query(query, [householdId]);
  const visual = [], thermal = [], air = [], radon = [], level = [];
  (result.rows || []).forEach((row) => {
    const base = {
      location: row.location,
      trade: row.trade,
      note: row.note,
      result: row.result,
      result_text: getResultText(row.result),
      created_at: row.created_at
    };
    switch (row.type) {
      case 'visual':
        visual.push({ ...base });
        break;
      case 'thermal':
        thermal.push({ ...base });
        break;
      case 'air':
        air.push({
          ...base,
          process_type: row.process_type,
          process_type_label: row.process_type === 'flush_out' ? 'Flush-out' : row.process_type === 'bake_out' ? 'Bake-out' : '-',
          tvoc: row.tvoc,
          hcho: row.hcho
        });
        break;
      case 'radon':
        radon.push({ ...base, radon: row.radon, unit: row.unit_radon });
        break;
      case 'level': {
        const refMm = row.reference_mm != null ? row.reference_mm : 150;
        const r = row;
        level.push({
          ...base,
          reference_mm: row.reference_mm,
          level_reference_mm: refMm,
          level_summary_text: `1번 좌${r.point1_left_mm ?? '-'}/우${r.point1_right_mm ?? '-'} 2번 좌${r.point2_left_mm ?? '-'}/우${r.point2_right_mm ?? '-'} 3번 좌${r.point3_left_mm ?? '-'}/우${r.point3_right_mm ?? '-'} 4번 좌${r.point4_left_mm ?? '-'}/우${r.point4_right_mm ?? '-'} (기준 ${refMm}mm)`
        });
        break;
      }
      default:
        break;
    }
  });
  return { visual, thermal, air, radon, level };
}

async function run() {
  const client = await pool.connect();
  try {
    const households = (await client.query(
      `SELECT h.id, h.dong, h.ho, c.name as complex_name
       FROM household h
       JOIN complex c ON h.complex_id = c.id
       WHERE LOWER(TRIM(c.name)) <> 'admin'
       ORDER BY h.id`
    )).rows;
    if (households.length === 0) {
      console.log('admin 제외 세대가 없습니다.');
      return;
    }
    console.log('세대 수:', households.length, households.map((h) => `${h.complex_name} ${h.dong}동 ${h.ho}호`).join(', '));

    await client.query('BEGIN');
    for (const h of households) {
      await seedHousehold(client, h.id);
      console.log('  시드 완료:', h.dong, h.ho);
    }
    await client.query('COMMIT');

    const first = households[0];
    const insp = await loadHouseholdInspectionsForReport(client, first.id);
    const reportData = {
      dong: first.dong || '',
      ho: first.ho || '',
      complex: first.complex_name || '',
      visual_inspections: insp.visual,
      thermal_inspections: insp.thermal,
      air_measurements: insp.air,
      radon_measurements: insp.radon,
      level_measurements: insp.level
    };

    const finalReportGenerator = require(path.join(__dirname, '..', 'utils', 'finalReportGenerator'));
    const pdfResult = await finalReportGenerator.generateFinalReport(reportData, {});
    console.log('최종보고서 생성:', pdfResult.filename);
    console.log('경로:', pdfResult.path);
    console.log('크기:', pdfResult.size, 'bytes');
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
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
